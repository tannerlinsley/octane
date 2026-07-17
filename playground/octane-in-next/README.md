# Octane in Next.js

A Next.js (App Router) app mounting compiled Octane `.tsrx` components as
**client islands**:

- `@octanejs/next-plugin` (`withOctane` in `next.config.mjs`) compiles `.tsrx`
  in Next's webpack (and Turbopack) pipeline and transpiles the
  TypeScript-source Octane packages.
- `@octanejs/react-wrapper` mounts the compiled components inside the React
  tree; React props flow in on every commit, Octane state and DOM survive.
- `app/islands.tsx` is the one `next/dynamic` + `ssr: false` boundary keeping
  the Octane module graph out of the Node SSR pass (compiled Octane client
  output parses DOM templates at module scope). The page itself stays fully
  server-rendered; the islands hydrate in the browser.

```bash
pnpm --filter octane-in-next-playground dev     # next dev (webpack)
pnpm --filter octane-in-next-playground build   # next build
pnpm --filter octane-in-next-playground e2e     # next start + headless Chromium assertions
```

`scripts/e2e.mjs` proves the integration end-to-end: SSR HTML contains the
server-rendered page (and no island markup), the counter island mounts and
counts on native events, a React-controlled prop flows in without resetting
Octane state, React children stay live inside Octane-rendered DOM, and
unmounting an island runs Octane effect cleanups.
