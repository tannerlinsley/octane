---
'@octanejs/mcp-server': patch
---

Teach the MCP server the bi-directional React bridge: path triage and validation planning cover `@octanejs/react-compat` and `@octanejs/react-wrapper` with their vitest projects, and the React-API compatibility map describes facade behavior (synchronous `react-dom/server` rendering works through the react-compat facade, streaming entries stay targeted errors pointing at `octane/server`'s own streaming renderers, `Profiler`/`StrictMode` are inert wrappers). The bundled skills present react-compat's out-of-the-box path and the react-wrapper reverse direction.
