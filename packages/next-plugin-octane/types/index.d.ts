/** Loader options forwarded to the Octane compiler. */
export interface OctaneNextOptions {
	/** Project root the compiler resolves canonical module ids against. */
	root?: string;
	/** Force the compile environment instead of deriving it from the bundle. */
	environment?: 'client' | 'server';
	/** Disable the dev-server HMR wrapper (default: on for dev client builds). */
	hmr?: boolean;
	/** Force dev-mode compilation metadata. */
	dev?: boolean;
	/** Enable the profiling build. */
	profile?: boolean;
	/** Opt out of the parallel `use()` pipeline. */
	parallelUse?: boolean;
	/** Source paths the compiler must leave untouched. */
	exclude?: string[];
	/** Custom renderer registry (see octane/compiler/renderers). */
	renderers?: unknown;
}

/**
 * Wrap a Next.js config with Octane `.tsrx` compilation: a webpack rule and a
 * `turbopack.rules` entry running the shared Octane loader, plus
 * `transpilePackages` entries for the TypeScript-source Octane packages.
 */
export function withOctane<T extends Record<string, unknown>>(
	nextConfig?: T,
	octaneOptions?: OctaneNextOptions,
): T & Record<string, unknown>;

/** Absolute path of the shared `.tsrx` webpack loader, for manual wiring. */
export const octaneLoaderPath: string;
