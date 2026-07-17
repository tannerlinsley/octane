'use client';

import dynamic from 'next/dynamic';

// The one dynamic boundary that keeps every Octane module out of the Node SSR
// pass: compiled Octane client output parses DOM templates at module scope, so
// the island graph must only load in the browser.
export const OctaneIslands = dynamic(() => import('./octane-islands'), {
	ssr: false,
	loading: () => <p data-island-loading>Loading Octane islands…</p>,
});
