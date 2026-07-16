/**
 * `react-dom/server` facade. The synchronous entry points delegate to
 * octane/server's React-parity renderers (fallbacks for suspended boundaries,
 * hydratable markup from `renderToString`, clean markup from
 * `renderToStaticMarkup`). Streaming keeps a targeted error: mapping React's
 * stream/callback options onto octane's streaming SSR is not implemented.
 */
import {
	renderToStaticMarkup as octaneRenderToStaticMarkup,
	renderToString as octaneRenderToString,
} from 'octane/server';

const CompatServerRoot = (props: { node: unknown }): unknown => props.node;

export function renderToString(node: unknown): string {
	return octaneRenderToString(CompatServerRoot as never, { node }).html;
}

export function renderToStaticMarkup(node: unknown): string {
	return octaneRenderToStaticMarkup(CompatServerRoot as never, { node }).html;
}

const unsupported = (name: string): never => {
	throw new Error(
		`[react-compat] ReactDOMServer.${name} is not supported. ` +
			"Use renderToString()/renderToStaticMarkup(), or octane/server's own streaming entry points; " +
			'React dependencies inside those trees are supported.',
	);
};

export function renderToPipeableStream(): never {
	return unsupported('renderToPipeableStream');
}
export function renderToReadableStream(): never {
	return unsupported('renderToReadableStream');
}
export function resume(): never {
	return unsupported('resume');
}
export function resumeToPipeableStream(): never {
	return unsupported('resumeToPipeableStream');
}

export const version = '19.2.0-octane-compat';
