# @octanejs/next-plugin

Run compiled Octane `.tsrx` components inside a Next.js app as **client
islands**, mounted through
[`@octanejs/react-wrapper`](../react-wrapper/README.md).

```js
// next.config.mjs
import { withOctane } from '@octanejs/next-plugin';

export default withOctane({ reactStrictMode: true });
```

`withOctane(nextConfig, octaneOptions?)` wires:

- a webpack rule compiling `.tsrx` through the Octane compiler — the shared
  webpack-API loader from `@octanejs/rspack-plugin/loader` (it has no Rspack
  dependency). Server bundles compile with `environment: 'server'`, client
  bundles with `'client'`;
- the equivalent `turbopack.rules` entry for `next dev --turbopack`
  (experimental — Turbopack implements a subset of the webpack loader API, and
  today it cannot resolve the workspace packages' TS-ESM `.js` specifiers the
  way webpack's `extensionAlias` does, so inside this monorepo use the default
  webpack dev server);
- `transpilePackages` for `octane` and `@octanejs/react-wrapper`, which ship
  TypeScript sources.

## The island pattern

Keep everything Octane behind one `next/dynamic` boundary with `ssr: false`
(compiled Octane client output parses DOM templates at module scope, so island
modules must not load during the Node SSR pass):

```tsx
// app/islands.tsx
'use client';
import dynamic from 'next/dynamic';

export const OctaneIslands = dynamic(() => import('./octane-islands'), {
	ssr: false,
});
```

```tsx
// app/octane-islands.tsx
'use client';
import { wrapOctane } from '@octanejs/react-wrapper';
import { Counter } from '../src/octane/Counter.tsrx';

const ReactCounter = wrapOctane(Counter);
export default function OctaneIslands() {
	return <ReactCounter label="Clicks" step={2} />;
}
```

React props flow into the island on every React commit; Octane state, effects,
and DOM survive re-renders. React children passed to a wrapped component render
inside the Octane `children` hole.

## Boundaries

- Islands are client-rendered: under SSR the wrapper renders an empty container
  and Octane mounts after hydration. Server-rendered islands are the
  react-hosted compat plan (`docs/react-hosted-octane-compat-plan.md`), not
  this plugin.
- A `.tsrx` module type declaration is needed once per app (see
  `playground/octane-in-next/src/tsrx.d.ts`).

See `playground/octane-in-next` for a complete App Router example.
