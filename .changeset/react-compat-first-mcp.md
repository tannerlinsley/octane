---
'@octanejs/mcp-server': patch
---

The React-package compatibility report is now compat-first: verdicts describe
what happens under `@octanejs/react-compat` at runtime
(`works-out-of-the-box` / `works-with-caveats` / `has-unsupported-apis`), the
scan flags legacy pre-render class lifecycles, and the plan leads with the
one-line `octane({ compat: [react()] })` setup — Octane-native bindings become
the optional performance path. The `bridge-react-package` skill and tool
descriptions are rewritten around the same story, including the reverse
direction (`@octanejs/react-wrapper`).
