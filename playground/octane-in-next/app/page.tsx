import { OctaneIslands } from './islands';

// A server component: everything here is server-rendered by Next/React.
// The Octane islands hydrate into it client-side.
export default function Page() {
	return (
		<main>
			<h1>Octane in Next.js</h1>
			<p data-ssr-proof>
				This page is server-rendered by Next.js (App Router). The sections below are compiled Octane{' '}
				<code>.tsrx</code> components mounted as client islands through{' '}
				<code>@octanejs/react-wrapper</code>, wired by <code>@octanejs/next-plugin</code>.
			</p>
			<OctaneIslands />
		</main>
	);
}
