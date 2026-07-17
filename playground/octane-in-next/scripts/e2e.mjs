// End-to-end proof for the Next + Octane island setup: boots the production
// server (`next build` must have run), fetches the SSR HTML, then drives the
// hydrated page in headless Chromium. Fails on any page error or console
// error, missing SSR content, or an island that does not behave.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 3411);
const url = `http://localhost:${port}/`;

function fail(message) {
	console.error(`✗ ${message}`);
	process.exitCode = 1;
}

function ok(message) {
	console.log(`✓ ${message}`);
}

async function waitForServer(timeoutMs = 30_000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) return response;
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error(`next start did not answer on ${url} within ${timeoutMs}ms`);
}

const server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(port)], {
	cwd: root,
	stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => process.stdout.write(`[next] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[next] ${chunk}`));

let browser;
try {
	const response = await waitForServer();
	const html = await response.text();

	// 1. The page is genuinely server-rendered.
	if (html.includes('Octane in Next.js') && html.includes('data-ssr-proof')) {
		ok('SSR HTML contains the server-rendered page content');
	} else {
		fail('SSR HTML is missing the server-rendered page content');
	}
	// 2. The island graph stayed out of the SSR pass (ssr: false boundary).
	if (!html.includes('counter-button')) {
		ok('island markup is absent from SSR HTML (client-only boundary holds)');
	} else {
		fail('island markup unexpectedly present in SSR HTML');
	}

	browser = await chromium.launch();
	const page = await browser.newPage();
	const problems = [];
	page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
	page.on('console', (message) => {
		if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
	});

	await page.goto(url, { waitUntil: 'networkidle' });

	// 3. The Octane counter island mounts and responds to events.
	const counter = page.locator('.counter-button');
	await counter.waitFor({ state: 'visible', timeout: 15_000 });
	ok('Octane counter island mounted');
	await counter.click();
	await counter.click();
	const counterText = await counter.textContent();
	if (counterText === 'Count: 2') {
		ok('Octane state updates on native events (Count: 2 after two clicks)');
	} else {
		fail(`counter shows ${JSON.stringify(counterText)} after two clicks, expected "Count: 2"`);
	}

	// 4. React props flow into the island; Octane state survives the commit.
	await page.locator('input[type="range"]').fill('5');
	await counter.click();
	const steppedText = await counter.textContent();
	if (steppedText === 'Count: 7') {
		ok('React-controlled prop flowed in without resetting Octane state (Count: 7)');
	} else {
		fail(`counter shows ${JSON.stringify(steppedText)} after step change, expected "Count: 7"`);
	}

	// 5. React children render (and stay live) inside Octane-rendered DOM.
	await page.locator('.card-body input').fill('Ada');
	const greeting = await page.locator('[data-greeting]').textContent();
	if (greeting?.startsWith('Hello Ada')) {
		ok('React-controlled form inside Octane DOM stays live');
	} else {
		fail(`greeting is ${JSON.stringify(greeting)}, expected it to start with "Hello Ada"`);
	}

	// 6. Unmounting the wrapper runs Octane effect cleanups.
	await page.locator('.clock').waitFor({ state: 'visible' });
	await page.locator('input[type="checkbox"]').uncheck();
	if ((await page.locator('.clock').count()) === 0) {
		ok('unmounting the island removed the Octane clock');
	} else {
		fail('Octane clock still present after unmounting the island');
	}

	if (problems.length > 0) {
		fail(`page reported errors:\n  ${problems.join('\n  ')}`);
	} else {
		ok('no page errors or console errors');
	}
} catch (error) {
	fail(error instanceof Error ? error.message : String(error));
} finally {
	await browser?.close();
	server.kill('SIGTERM');
}
process.exit(process.exitCode ?? 0);
