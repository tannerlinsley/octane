import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// React package → maintained @octanejs binding. bridge.test.js derives the
// expected value set from the workspace manifests, so publishing a new binding
// without registering it here fails the mcp-server tests.
export const KNOWN_BINDINGS = {
	zustand: '@octanejs/zustand',
	jotai: '@octanejs/jotai',
	'@apollo/client': '@octanejs/apollo-client',
	'@tanstack/ai-react': '@octanejs/tanstack-ai',
	'@tanstack/react-form': '@octanejs/tanstack-form',
	'@tanstack/react-query': '@octanejs/tanstack-query',
	'@tanstack/react-router': '@octanejs/tanstack-router',
	'@tanstack/react-store': '@octanejs/tanstack-store',
	'@tanstack/react-table': '@octanejs/tanstack-table',
	'@tanstack/react-virtual': '@octanejs/tanstack-virtual',
	'framer-motion': '@octanejs/motion',
	motion: '@octanejs/motion',
	'@stylexjs/stylex': '@octanejs/stylex',
	'react-router': '@octanejs/remix-router',
	'react-router-dom': '@octanejs/remix-router',
	'@lexical/react': '@octanejs/lexical',
	'lucide-react': '@octanejs/lucide',
	'@floating-ui/react': '@octanejs/floating-ui',
	'radix-ui': '@octanejs/radix',
	'react-hook-form': '@octanejs/hook-form',
	'@base-ui-components/react': '@octanejs/base-ui',
	'@dnd-kit/react': '@octanejs/dnd-kit',
	sonner: '@octanejs/sonner',
	recharts: '@octanejs/recharts',
	'@react-three/fiber': '@octanejs/three',
	'@visx/visx': '@octanejs/visx',
	'@visx/a11y': '@octanejs/visx',
	'@visx/a11y/react': '@octanejs/visx',
	'@visx/a11y/server': '@octanejs/visx',
	'@visx/annotation': '@octanejs/visx',
	'@visx/axis': '@octanejs/visx',
	'@visx/axis/react': '@octanejs/visx',
	'@visx/bounds': '@octanejs/visx',
	'@visx/brush': '@octanejs/visx',
	'@visx/chart': '@octanejs/visx',
	'@visx/chord': '@octanejs/visx',
	'@visx/clip-path': '@octanejs/visx',
	'@visx/curve': '@octanejs/visx',
	'@visx/delaunay': '@octanejs/visx',
	'@visx/drag': '@octanejs/visx',
	'@visx/event': '@octanejs/visx',
	'@visx/geo': '@octanejs/visx',
	'@visx/glyph': '@octanejs/visx',
	'@visx/gradient': '@octanejs/visx',
	'@visx/grid': '@octanejs/visx',
	'@visx/group': '@octanejs/visx',
	'@visx/heatmap': '@octanejs/visx',
	'@visx/hierarchy': '@octanejs/visx',
	'@visx/kernel': '@octanejs/visx',
	'@visx/legend': '@octanejs/visx',
	'@visx/marker': '@octanejs/visx',
	'@visx/mock-data': '@octanejs/visx',
	'@visx/network': '@octanejs/visx',
	'@visx/pattern': '@octanejs/visx',
	'@visx/point': '@octanejs/visx',
	'@visx/react-spring': '@octanejs/visx',
	'@visx/responsive': '@octanejs/visx',
	'@visx/sankey': '@octanejs/visx',
	'@visx/scale': '@octanejs/visx',
	'@visx/scale/react': '@octanejs/visx',
	'@visx/shape': '@octanejs/visx',
	'@visx/shape/react': '@octanejs/visx',
	'@visx/stats': '@octanejs/visx',
	'@visx/text': '@octanejs/visx',
	'@visx/theme': '@octanejs/visx',
	'@visx/theme/react': '@octanejs/visx',
	'@visx/threshold': '@octanejs/visx',
	'@visx/tooltip': '@octanejs/visx',
	'@visx/tooltip/floating': '@octanejs/visx',
	'@visx/voronoi': '@octanejs/visx',
	'@visx/voronoi/react': '@octanejs/visx',
	'@visx/wordcloud': '@octanejs/visx',
	'@visx/xychart': '@octanejs/visx',
	'@visx/zoom': '@octanejs/visx',
	'react-redux': '@octanejs/redux',
	'@reduxjs/toolkit': '@octanejs/redux-toolkit',
	'@testing-library/react': '@octanejs/testing-library',
	'react-i18next': '@octanejs/i18next',
	'@mdx-js/react': '@octanejs/mdx',
	'dexie-react-hooks': '@octanejs/dexie',
};

// Workspace directory names for the maintained bindings. Keep this derived
// from KNOWN_BINDINGS so repository path routing cannot drift from the public
// binding list (aliases such as `motion` intentionally collapse to one dir).
export const KNOWN_BINDING_PACKAGE_DIRS = new Set(
	Object.values(KNOWN_BINDINGS).map((name) => name.slice('@octanejs/'.length)),
);

export const KNOWN_VANILLA_CORES = {
	'@apollo/client': '@apollo/client',
	'@tanstack/react-query': '@tanstack/query-core',
	'@tanstack/react-table': '@tanstack/table-core',
	'@tanstack/react-virtual': '@tanstack/virtual-core',
	'@tanstack/react-form': '@tanstack/form-core',
	'@floating-ui/react': '@floating-ui/dom',
	'@dnd-kit/react': '@dnd-kit/dom',
	'@xstate/react': 'xstate',
	'react-redux': 'redux',
	'@reduxjs/toolkit': 'redux',
	'react-i18next': 'i18next',
	'react-hook-form': null,
	zustand: 'zustand/vanilla',
	valtio: 'valtio/vanilla',
	jotai: 'jotai/vanilla',
	'@lexical/react': 'lexical',
};

export const REACT_API_MAP = {
	useState: {
		status: 'same',
		note: 'Same lazy initializer and functional-update semantics; Octane additionally exposes a stable current-state getter at tuple index 2.',
	},
	useReducer: {
		status: 'same',
		note: 'Same reducer and lazy-init semantics; Octane additionally exposes a stable current-state getter at tuple index 2.',
	},
	useEffect: { status: 'same', note: 'Identical deps/cleanup semantics.' },
	useLayoutEffect: { status: 'same', note: 'Identical: synchronous after DOM mutation.' },
	useInsertionEffect: { status: 'same', note: 'Supported.' },
	useMemo: { status: 'same', note: 'Identical.' },
	useCallback: { status: 'same', note: 'Identical.' },
	useRef: { status: 'same', note: 'Identical.' },
	useContext: { status: 'same', note: 'Identical.' },
	useId: { status: 'same', note: 'Identical, hydration-stable.' },
	useImperativeHandle: {
		status: 'same',
		note: 'Supported; combine with refs-as-props instead of forwardRef.',
	},
	useSyncExternalStore: {
		status: 'same',
		note: 'Full React 19 shape including getServerSnapshot; tearing-tested.',
	},
	useDeferredValue: { status: 'same', note: 'Supported.' },
	useTransition: { status: 'same', note: 'Supported.' },
	useActionState: { status: 'same', note: 'Supported.' },
	useOptimistic: { status: 'same', note: 'Supported.' },
	useFormStatus: { status: 'same', note: 'Supported (import from octane, not react-dom).' },
	useEffectEvent: { status: 'same', note: 'Supported.' },
	use: { status: 'same', note: 'Supported for promises and context.' },
	startTransition: { status: 'same', note: 'Supported.' },
	memo: { status: 'same', note: 'Supported.' },
	createContext: { status: 'same', note: 'Supported.' },
	createPortal: { status: 'same', note: 'Supported (import from octane, not react-dom).' },
	flushSync: { status: 'same', note: 'Supported (import from octane, not react-dom).' },
	createElement: {
		status: 'partial',
		note: 'Returns a flat descriptor consumed by compiled templates; not a VDOM tree. react-compat supports nested classic-runtime trees from React packages; Octane-native code authors component trees in .tsrx.',
	},
	cloneElement: { status: 'partial', note: 'Works on Octane element descriptors only.' },
	isValidElement: { status: 'same', note: 'Supported for Octane descriptors.' },
	Children: {
		status: 'partial',
		note: 'Supported for Octane descriptors; React.Children traversal idioms over arbitrary VDOM do not apply.',
	},
	Fragment: { status: 'same', note: 'Supported.' },
	Suspense: {
		status: 'same',
		note: 'Supported (also available as the @try/@pending directive in .tsrx).',
	},
	createRoot: { status: 'same', note: 'Supported (import from octane, not react-dom/client).' },
	hydrateRoot: { status: 'same', note: 'Supported (import from octane, not react-dom/client).' },
	forwardRef: {
		status: 'rewrite',
		note: 'No forwardRef. Rewrite to React 19 refs-as-props: accept ref as a normal prop.',
	},
	useDebugValue: {
		status: 'same',
		note: 'Supported as an accepted no-op (devtools-only label; there is no DevTools integration).',
	},
	lazy: {
		status: 'same',
		note: "Supported. Accepts React's { default } module shape and additionally a bare component from the loader; wrapping Suspense or ViewTransition in lazy() is valid (nested lazy wrappers are not).",
	},
	Component: {
		status: 'partial',
		note: 'react-compat supports class state, commit lifecycles, contextType, class defaultProps, refs and class Error Boundaries; Octane-native code rewrites classes as function components.',
	},
	PureComponent: {
		status: 'partial',
		note: 'Loads through the react-compat class adapter, but PureComponent/shouldComponentUpdate bailout timing is not emulated; Octane-native code uses memo.',
	},
	StrictMode: {
		status: 'rewrite',
		note: 'Inert wrapper under react-compat — development double-invoke is not emulated. Octane-native code drops the wrapper.',
	},
	Profiler: {
		status: 'partial',
		note: 'Inert pass-through wrapper under react-compat: children render, onRender timings never fire. Not present for Octane-native code.',
	},
	SuspenseList: { status: 'unsupported', note: 'Not present.' },
	findDOMNode: { status: 'unsupported', note: 'Removed in React 19 too. Use refs.' },
	renderToString: {
		status: 'same',
		note: "Works through react-compat's react-dom/server facade (hydratable markup). Octane-native servers use renderToString from octane/server, which returns { html, css }; prerender from octane/static awaits Suspense data.",
	},
	renderToStaticMarkup: {
		status: 'same',
		note: "Works through react-compat's react-dom/server facade (clean, non-hydratable HTML). Octane-native servers use renderToStaticMarkup from octane/server.",
	},
	renderToPipeableStream: {
		status: 'unsupported',
		note: "react-compat's react-dom/server facade keeps streaming entries as targeted errors (React's stream contract is not mapped). Octane itself ships renderToPipeableStream under octane/server — stream at the application boundary instead.",
	},
	renderToReadableStream: {
		status: 'unsupported',
		note: "react-compat's react-dom/server facade keeps streaming entries as targeted errors (React's stream contract is not mapped). Octane itself ships renderToReadableStream under octane/server — stream at the application boundary instead.",
	},
	onChange: {
		status: 'rewrite',
		note: 'Events are native and delegated; there is no synthetic onChange firing per keystroke. Use onInput for text inputs.',
	},
	defaultProps: {
		status: 'rewrite',
		note: 'Use default parameter values / destructuring defaults.',
	},
};

// Legacy pre-render class lifecycles: react-compat rejects these with a
// targeted error instead of silently approximating React, so they are the one
// class-component pattern that genuinely blocks the out-of-the-box path.
// (`\b`-anchored scanning means the UNSAFE_ aliases need their own entries.)
for (const name of [
	'getSnapshotBeforeUpdate',
	'componentWillMount',
	'componentWillReceiveProps',
	'componentWillUpdate',
	'UNSAFE_componentWillMount',
	'UNSAFE_componentWillReceiveProps',
	'UNSAFE_componentWillUpdate',
]) {
	REACT_API_MAP[name] = {
		status: 'unsupported',
		note: 'Legacy pre-render class lifecycle: react-compat throws a targeted error. Port the component to hooks or an Octane-native entry.',
	};
}

const IMPORT_SOURCES = [
	'react',
	'react-dom',
	'react-dom/client',
	'react-dom/server',
	'react/jsx-runtime',
	'react/jsx-dev-runtime',
];

const SCANNABLE = /\.(js|mjs|cjs|jsx|ts|tsx|mts|cts)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', '__tests__', '__mocks__', 'test', 'tests']);
const MAX_FILES = 400;

export async function collectSourceFiles(root, out = [], depth = 0) {
	if (depth > 6 || out.length >= MAX_FILES) return out;
	let entries;
	try {
		entries = await readdir(root, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		if (out.length >= MAX_FILES) break;
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
				await collectSourceFiles(join(root, entry.name), out, depth + 1);
			}
		} else if (SCANNABLE.test(entry.name) && !entry.name.endsWith('.d.ts')) {
			out.push(join(root, entry.name));
		}
	}
	return out;
}

export function scanSource(source) {
	const apis = new Map();
	for (const name of Object.keys(REACT_API_MAP)) {
		const matches = source.match(new RegExp(`\\b${name}\\b`, 'g'));
		if (matches) apis.set(name, matches.length);
	}
	const imports = new Set();
	for (const spec of IMPORT_SOURCES) {
		if (
			source.includes(`'${spec}'`) ||
			source.includes(`"${spec}"`) ||
			source.includes(`require('${spec}')`) ||
			source.includes(`require("${spec}")`)
		) {
			imports.add(spec);
		}
	}
	const classComponent = /\bextends\s+(React\.)?(Pure)?Component\b/.test(source);
	return { apis, imports, classComponent };
}

export async function scanPath(root) {
	const files = await collectSourceFiles(resolve(root));
	const totals = new Map();
	const imports = new Set();
	let classComponents = false;
	for (const file of files) {
		let source;
		try {
			source = await readFile(file, 'utf8');
		} catch {
			continue;
		}
		const result = scanSource(source);
		for (const [name, count] of result.apis) {
			totals.set(name, (totals.get(name) ?? 0) + count);
		}
		for (const spec of result.imports) imports.add(spec);
		classComponents ||= result.classComponent;
	}
	return { filesScanned: files.length, totals, imports, classComponents };
}

function apiRows(totals) {
	return [...totals.entries()]
		.map(([name, count]) => ({ name, count, ...REACT_API_MAP[name] }))
		.sort((a, b) => b.count - a.count);
}

// The verdict describes what happens under `@octanejs/react-compat` at
// runtime — NOT how hard a hand-port would be (react-compat absorbs the
// 'rewrite'-status APIs automatically; they only matter for a native entry):
//  - works-out-of-the-box: nothing in the scan needs attention.
//  - works-with-caveats: partial contracts (class bailout timing, Children
//    traversal idioms) or class components — supported subsets, verify behavior.
//  - has-unsupported-apis: the scan found APIs react-compat refuses (legacy
//    lifecycles, streaming SSR, findDOMNode, …). These throw targeted errors,
//    so the package still works when the code path is never exercised.
function verdictFor(rows, classComponents) {
	if (rows.some((row) => row.status === 'unsupported')) return 'has-unsupported-apis';
	if (classComponents || rows.some((row) => row.status === 'partial')) {
		return 'works-with-caveats';
	}
	return 'works-out-of-the-box';
}

export async function readPackageJson(dir) {
	try {
		return JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
	} catch {
		return null;
	}
}

export function detectVanillaCore(packageName, packageJson) {
	if (packageName in KNOWN_VANILLA_CORES) {
		return KNOWN_VANILLA_CORES[packageName];
	}
	if (packageJson?.exports && typeof packageJson.exports === 'object') {
		for (const key of Object.keys(packageJson.exports)) {
			if (key.includes('vanilla') || key.includes('core')) return `${packageName}${key.slice(1)}`;
		}
	}
	const deps = Object.keys(packageJson?.dependencies ?? {});
	const core = deps.find((dep) => /(^|\/|-)core$/.test(dep) && !dep.startsWith('@babel'));
	return core ?? null;
}

export async function bridgeReport({ packageName, path, projectRoot }) {
	const report = {
		target: packageName ?? path,
		existingBinding: packageName ? (KNOWN_BINDINGS[packageName] ?? null) : null,
	};

	let scanRoot = path;
	let packageJson = null;
	if (packageName) {
		const base = resolve(projectRoot ?? process.cwd());
		const dir = join(base, 'node_modules', ...packageName.split('/'));
		packageJson = await readPackageJson(dir);
		if (!packageJson) {
			return {
				...report,
				error: `Package '${packageName}' not found under ${join(base, 'node_modules')}. Install it first or pass 'path' pointing at its source.`,
			};
		}
		report.version = packageJson.version ?? null;
		scanRoot = dir;
		report.vanillaCore = detectVanillaCore(packageName, packageJson);
		report.peerDependsOnReact = Boolean(
			packageJson.peerDependencies?.react ?? packageJson.dependencies?.react,
		);
	}

	const scan = await scanPath(scanRoot);
	const rows = apiRows(scan.totals);
	report.filesScanned = scan.filesScanned;
	report.reactImports = [...scan.imports];
	report.classComponents = scan.classComponents;
	report.apis = rows;
	report.verdict = verdictFor(rows, scan.classComponents);
	report.plan = planFor(report);
	return report;
}

function planFor(report) {
	const steps = [];
	if (report.existingBinding) {
		steps.push(
			`An official Octane-native binding exists: ${report.existingBinding}. It is the fastest option; the unmodified React build also runs through @octanejs/react-compat.`,
		);
	}
	steps.push(
		"Default path — run the package unmodified: add the compatibility entry to the Octane Vite plugin (`import { react } from '@octanejs/react-compat/vite'`; `octane({ compat: [react()] })`). No codemod, no transformed copy, no per-library configuration; SSR resolves to the server facade automatically.",
	);
	const unsupported = (report.apis ?? []).filter((row) => row.status === 'unsupported');
	for (const row of unsupported) {
		steps.push(
			`Unsupported under react-compat — ${row.name} (${row.count}x): ${row.note} The error is targeted, so the package still works if this code path is never exercised.`,
		);
	}
	const partial = (report.apis ?? []).filter((row) => row.status === 'partial');
	for (const row of partial) {
		steps.push(`Caveat — ${row.name} (${row.count}x): ${row.note}`);
	}
	if (report.classComponents) {
		steps.push(
			'Class components detected: react-compat supports state, commit lifecycles, contextType, class defaultProps, refs and class Error Boundaries; PureComponent/shouldComponentUpdate bailout timing is not emulated and legacy pre-render lifecycles throw targeted errors.',
		);
	}
	steps.push(
		report.vanillaCore
			? `Performance ceiling (optional): publish an Octane-native entry behind the \`octane\` export condition — reuse the framework-agnostic core '${report.vanillaCore}' unchanged and re-implement the thin React binding with Octane hooks (see the bridge-react-package skill). Consumers without it keep using the React build through react-compat.`
			: 'Performance ceiling (optional): publish an Octane-native entry behind the `octane` export condition using compiled .tsrx and Octane hooks (see the bridge-react-package skill). Consumers without it keep using the React build through react-compat.',
	);
	steps.push(
		'Validate with tests that drive real DOM events against the package running on Octane, and compare behavior with the React original where possible.',
	);
	return steps;
}
