// @ts-check
/**
 * @octanejs/next-plugin — run compiled Octane `.tsrx` components inside a
 * Next.js app as client islands (via `@octanejs/react-wrapper`).
 *
 * Usage (next.config.mjs):
 *
 *   import { withOctane } from '@octanejs/next-plugin';
 *   export default withOctane({ reactStrictMode: true });
 *
 * `withOctane(nextConfig, octaneOptions)` wires three things:
 *
 * 1. A webpack rule compiling `.tsrx` through the Octane compiler (the shared
 *    webpack-API loader from `@octanejs/rspack-plugin/loader` — it has no
 *    Rspack dependency). Server bundles compile in `environment: 'server'`,
 *    client bundles in `'client'`, matching Next's `isServer` context.
 * 2. The equivalent `turbopack.rules` entry so `next dev --turbopack` also
 *    compiles `.tsrx` (experimental — Turbopack implements a subset of the
 *    webpack loader API).
 * 3. `transpilePackages` for `octane` and `@octanejs/react-wrapper`, which
 *    ship TypeScript sources.
 *
 * The supported Tier-A pattern is CLIENT islands: mount `.tsrx` components
 * with `wrapOctane()` inside a module loaded via `next/dynamic` with
 * `ssr: false`. Compiled Octane client output hoists DOM template parsing to
 * module scope, so island modules must not be imported into the Node SSR
 * pass. Server-rendered islands are the react-hosted compat plan
 * (docs/react-hosted-octane-compat-plan.md), not this plugin.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const loaderPath = require.resolve('@octanejs/rspack-plugin/loader');

/** Workspace packages that ship TypeScript sources Next must transpile. */
const TRANSPILE_PACKAGES = Object.freeze(['octane', '@octanejs/react-wrapper']);

const OPTION_KEYS = new Set([
	'root',
	'environment',
	'hmr',
	'dev',
	'profile',
	'parallelUse',
	'exclude',
	'renderers',
]);

function normalizeOptions(value) {
	const options = value ?? {};
	if (typeof options !== 'object' || Array.isArray(options)) {
		throw new TypeError('@octanejs/next-plugin: octane options must be an object.');
	}
	for (const key of Object.keys(options)) {
		if (!OPTION_KEYS.has(key)) {
			throw new TypeError(`@octanejs/next-plugin: unknown option \`${key}\`.`);
		}
	}
	// Value validation happens in the shared loader (normalizeLoaderOptions);
	// only the key surface is asserted here so mistakes fail at config time.
	return { ...options };
}

function mergeTranspilePackages(existing) {
	const packages = new Set(existing ?? []);
	for (const name of TRANSPILE_PACKAGES) packages.add(name);
	return [...packages];
}

/**
 * Wrap a Next.js config with Octane `.tsrx` compilation.
 *
 * @param {Record<string, any>} [nextConfig]
 * @param {Record<string, any>} [octaneOptions] Loader options forwarded to the
 *   Octane compiler (`root`, `hmr`, `dev`, `profile`, `parallelUse`,
 *   `exclude`, `renderers`, `environment` override).
 * @returns {Record<string, any>}
 */
export function withOctane(nextConfig = {}, octaneOptions = {}) {
	const options = normalizeOptions(octaneOptions);

	return {
		...nextConfig,
		transpilePackages: mergeTranspilePackages(nextConfig.transpilePackages),
		turbopack: {
			...nextConfig.turbopack,
			rules: {
				...nextConfig.turbopack?.rules,
				'*.tsrx': {
					loaders: [{ loader: loaderPath, options: { ...options } }],
					as: '*.js',
				},
			},
		},
		/**
		 * @param {any} config webpack config
		 * @param {any} context Next's webpack context ({ isServer, dev, ... })
		 */
		webpack(config, context) {
			config.module ??= {};
			config.module.rules ??= [];
			config.module.rules.push({
				test: /\.tsrx$/,
				type: 'javascript/auto',
				enforce: 'pre',
				use: [
					{
						loader: loaderPath,
						options: {
							...options,
							environment: options.environment ?? (context.isServer ? 'server' : 'client'),
							...(options.dev === undefined && context.dev !== undefined
								? { dev: context.dev }
								: null),
						},
					},
				],
			});
			config.resolve ??= {};
			if (!(config.resolve.extensions ?? []).includes('.tsrx')) {
				config.resolve.extensions = [...(config.resolve.extensions ?? []), '.tsrx'];
			}
			// The Octane workspace packages use TS-ESM `.js` specifiers for `.ts`
			// sources (octane, @octanejs/react-wrapper ship TypeScript); webpack
			// needs the extension alias Vite applies natively.
			const jsAlias = config.resolve.extensionAlias?.['.js'];
			const existing = Array.isArray(jsAlias) ? jsAlias : jsAlias ? [jsAlias] : ['.js'];
			config.resolve.extensionAlias = {
				...config.resolve.extensionAlias,
				'.js': [...new Set([...existing, '.ts', '.tsx'])],
			};
			return typeof nextConfig.webpack === 'function'
				? nextConfig.webpack(config, context)
				: config;
		},
	};
}

/** Absolute path of the shared `.tsrx` webpack loader, for manual wiring. */
export const octaneLoaderPath = loaderPath;
