import { describe, expect, it } from 'vitest';
import { octaneLoaderPath, withOctane } from '../src/index.js';

function webpackConfigFor(config: Record<string, any>, context: Record<string, any>) {
	return config.webpack({ module: { rules: [] }, resolve: {} }, context);
}

function octaneRuleOf(webpackConfig: any) {
	const rules = webpackConfig.module.rules.filter((rule: any) =>
		rule?.test instanceof RegExp ? rule.test.test('/app/src/Counter.tsrx') : false,
	);
	expect(rules).toHaveLength(1);
	return rules[0];
}

describe('withOctane', () => {
	it('adds the TypeScript-source packages to transpilePackages', () => {
		const config = withOctane({ transpilePackages: ['my-lib'] });
		expect(config.transpilePackages).toEqual(
			expect.arrayContaining(['my-lib', 'octane', '@octanejs/react-wrapper']),
		);
	});

	it('wires the .tsrx webpack rule with the bundle environment', () => {
		const config = withOctane();
		const client = octaneRuleOf(webpackConfigFor(config, { isServer: false, dev: true }));
		expect(client.enforce).toBe('pre');
		expect(client.use[0].loader).toBe(octaneLoaderPath);
		expect(client.use[0].options.environment).toBe('client');
		expect(client.use[0].options.dev).toBe(true);

		const server = octaneRuleOf(webpackConfigFor(config, { isServer: true, dev: false }));
		expect(server.use[0].options.environment).toBe('server');
		expect(server.use[0].options.dev).toBe(false);
	});

	it('keeps explicit octane options authoritative over the Next context', () => {
		const config = withOctane({}, { environment: 'client', dev: false });
		const rule = octaneRuleOf(webpackConfigFor(config, { isServer: true, dev: true }));
		expect(rule.use[0].options.environment).toBe('client');
		expect(rule.use[0].options.dev).toBe(false);
	});

	it('adds .tsrx to resolve extensions and chains the user webpack function', () => {
		let sawContext: Record<string, any> | undefined;
		const config = withOctane({
			webpack(webpackConfig: any, context: Record<string, any>) {
				sawContext = context;
				webpackConfig.custom = true;
				return webpackConfig;
			},
		});
		const result = webpackConfigFor(config, { isServer: false, dev: false });
		expect(result.resolve.extensions).toContain('.tsrx');
		expect(result.resolve.extensionAlias['.js']).toEqual(
			expect.arrayContaining(['.js', '.ts', '.tsx']),
		);
		expect(result.custom).toBe(true);
		expect(sawContext).toEqual({ isServer: false, dev: false });
	});

	it('registers the Turbopack rule with the same loader', () => {
		const config = withOctane({ turbopack: { rules: { '*.svg': { loaders: ['x'] } } } });
		expect(config.turbopack.rules['*.svg']).toEqual({ loaders: ['x'] });
		const rule = config.turbopack.rules['*.tsrx'];
		expect(rule.as).toBe('*.js');
		expect(rule.loaders[0].loader).toBe(octaneLoaderPath);
	});

	it('rejects unknown octane options at config time', () => {
		expect(() => withOctane({}, { tsx: false } as Record<string, unknown>)).toThrow(
			/unknown option `tsx`/,
		);
	});
});

describe('octaneLoaderPath', () => {
	it('compiles real .tsrx source through the shared webpack-API loader', async () => {
		const { default: loader } = await import(octaneLoaderPath);
		const source = `export function App(props) @{\n\t<button onClick={() => props.onGo()}>{'go'}</button>\n}`;
		const result = await new Promise<{ error: Error | null; code?: string }>((resolve) => {
			const context = {
				rootContext: process.cwd(),
				resource: `${process.cwd()}/src/App.tsrx`,
				resourcePath: `${process.cwd()}/src/App.tsrx`,
				target: 'web',
				hot: false,
				mode: 'production',
				sourceMap: false,
				_module: { buildInfo: {} },
				cacheable() {},
				getOptions: () => ({}),
				addDependency() {},
				addMissingDependency() {},
				callback(error: Error | null, code?: string) {
					resolve({ error, code });
				},
			};
			loader.call(context, source, undefined);
		});
		expect(result.error).toBeNull();
		expect(result.code).toContain("from 'octane'");
		expect(result.code).not.toContain('@{');
	});
});
