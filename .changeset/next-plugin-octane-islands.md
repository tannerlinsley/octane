---
'@octanejs/next-plugin': patch
'@octanejs/rspack-plugin': patch
'@octanejs/react-wrapper': patch
---

Unlock the Next.js + Octane combination (Tier A: client islands). New `@octanejs/next-plugin` package: `withOctane(nextConfig)` compiles `.tsrx` in Next's webpack pipeline (plus an experimental `turbopack.rules` entry) and adds `transpilePackages` for the TypeScript-source Octane packages; islands mount through `@octanejs/react-wrapper` behind one `next/dynamic` `ssr: false` boundary (see `playground/octane-in-next`). `@octanejs/react-wrapper` gains the `'use client'` directive so wrapped components are valid client boundaries in RSC hosts, and `@octanejs/rspack-plugin` marks `@rspack/core` as an optional peer because its `/loader` subpath is plain webpack-API with no Rspack dependency (the Next plugin reuses it).
