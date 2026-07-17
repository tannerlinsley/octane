/**
 * Hydration marker protocol — the single source of truth shared by the server
 * emit (the `octane/compiler` compiler's server mode) and the client `hydrate`
 * runtime. The server writes these comment markers into the HTML it produces and
 * the client hydration cursor scans for them to align with the server output, so
 * BOTH sides must use byte-identical strings or hydration fails.
 *
 * Values follow the Svelte/Ripple convention (`[` open, `]` close) so the
 * protocol is familiar and the marker comments are compact.
 *
 * The server emit (runtime.server `ssrBlock` and friends) writes these markers
 * around every dynamic site, and the client `hydrateRoot` cursor scans for them
 * to align with the server output. This module is the shared home both import.
 */
/** Single-character payload of a block-open comment. */
export declare const HYDRATION_START = "[";
/** Single-character payload of a block-close comment. */
export declare const HYDRATION_END = "]";
/** @for outer-open payload: the server rendered its @empty arm. */
export declare const HYDRATION_FOR_EMPTY = "[f0";
/** @for outer-open payload: the server rendered one or more direct-host items. */
export declare const HYDRATION_FOR_ITEMS = "[f1";
/** Opens a hydratable block (component output / control-flow branch). */
export declare const BLOCK_OPEN = "<!--[-->";
/** Closes a hydratable block. */
export declare const BLOCK_CLOSE = "<!--]-->";
/** Opens an @for range whose server render selected @empty. */
export declare const FOR_BLOCK_OPEN_EMPTY = "<!--[f0-->";
/** Opens an @for range whose server render contains items. */
export declare const FOR_BLOCK_OPEN_ITEMS = "<!--[f1-->";
/** A bare anchor comment used where the client would otherwise clone a `<!>`. */
export declare const EMPTY_COMMENT = "<!---->";
/**
 * Payload of the text-hole separator comment `<!-- -->` the server emits
 * between two adjacent text nodes when at least one side is a DYNAMIC text
 * hole (React's convention). Without it the browser's HTML parser would merge
 * the two texts into ONE node and the client's hydration walk would come up a
 * node short (losing the second hole's content). The compiler's server emit
 * (`ssrEmitNodes` in `octane/compiler`) writes it; the client's hole-aware
 * `sibling()` walk (runtime.ts) treats it as a protocol node — stepping across
 * it between two text holes, or adopting it as the insert-before stand-in
 * position when a hole's server text was empty.
 */
export declare const HYDRATION_TEXT_SEP = " ";
/**
 * Marker attribute on the inline `<script type="application/json">` that the
 * server emits to carry the JSON-serialized `use(thenable)` values it resolved
 * during render (SSR Suspense). The client `hydrateRoot()` finds this
 * script by attribute, parses it, and seeds the values back into `use()` (in
 * render order) so a hydrating boundary returns synchronously instead of
 * re-suspending. Shared so server emit and client read stay byte-identical.
 */
export declare const SUSPENSE_SCRIPT_ATTR = "data-octane-suspense";
/**
 * Legacy undefined-sentinel key retained for consumers of `octane/constants`.
 * New seed payloads use the collision-free escaped-string protocol below.
 */
export declare const UNDEFINED_SENTINEL_KEY = "__octane_new_undefined__";
/**
 * Prefix for collision-free scalar escapes inside SSR Suspense seed JSON.
 * `undefined` is encoded as `${prefix}u`; user strings beginning with the
 * prefix are encoded as `${prefix}s${value}` before JSON serialization.
 */
export declare const SUSPENSE_SEED_WIRE_PREFIX = "\0octane:ssr-seed:";
/**
 * Top-level envelope key used only when a server hydration-seed stream contains
 * rejected `use(thenable)` entries. Keeping rejection metadata outside the
 * fulfilled value array prevents user data from colliding with the protocol.
 */
export declare const REJECTION_SENTINEL_KEY = "__octane_new_rejection__";
/**
 * Marks a thenable whose hydration state is owned by an external serializer.
 * Octane still tracks, suspends on, and unwraps the thenable normally, but it
 * neither writes an SSR JSON seed for it nor consumes one during hydration.
 *
 * The global registry keeps the contract stable across duplicate Octane module
 * instances. Prefer marking a mutable wrapper instead of a user-owned promise,
 * which may be frozen or shared with code that does not opt into this contract.
 */
export declare const EXTERNAL_HYDRATION_PROMISE: unique symbol;
/**
 * Defines a client hydration root whose component ranges start inside an SSR
 * ancestor, such as a document shell that places its live application inside
 * `<body>`. Mark the root body `passthrough` and the first component that owns
 * nodes in the hydration container `owner`. Octane keeps the intervening
 * component lifecycles but does not claim server ranges that live outside the
 * selected container.
 */
export declare const HYDRATION_RANGE_BOUNDARY: unique symbol;
/** Sentinel <template> attribute marking a pending streamed boundary. */
export declare const STREAM_BOUNDARY_ATTR = "data-oct-b";
/** Hidden segment container attribute carrying a completed boundary's content. */
export declare const STREAM_SEGMENT_ATTR = "data-oct-s";
/** Per-boundary seed-JSON script attribute (inside the segment). */
export declare const STREAM_SEED_ATTR = "data-oct-seed";
/** Renderer-owned executable/data scripts emitted by the streaming protocol. */
export declare const STREAM_SCRIPT_ATTR = "data-octane-stream";
/** Comment-data prefix left in a swapped boundary for hydration seed scoping. */
export declare const STREAM_SEED_COMMENT = "oct-seed:";
/** HTML void elements (no content model). See dom-tables.js. */
export declare const VOID_ELEMENTS: Set<string>;
/** React's BOOLEAN attribute props — truthy renders `attr=""`, falsy drops. See dom-tables.js. */
export declare const BOOLEAN_ATTR_PROPS: Set<string>;
/** React's mustUseProperty set minus value/checked. See dom-tables.js. */
export declare const MUST_USE_PROPERTY_PROPS: Set<string>;
/**
 * React's POSITIVE-numeric props: values below 1 (incl. 0 and non-numeric)
 * drop — `size="0"` is invalid per the HTML spec (size must be > 0).
 */
export declare const POSITIVE_NUMERIC_ATTR_PROPS: Set<string>;
/**
 * Legal HTML attribute name: non-empty, no ASCII whitespace, `"`, `'`, `>`,
 * `/`, `=`, or control chars. Rejects spread keys that would inject markup
 * (e.g. 'x onload=alert(1)'). Shared by the SSR serializer (ssrAttrEntry) and
 * the client's setAttribute (proactive skip — mirrors React's validity gate;
 * the platform would throw InvalidCharacterError).
 */
export declare const VALID_ATTR_NAME: RegExp;
/**
 * Tags that exist ONLY in the SVG namespace — implies SVG in a
 * namespace-ambiguous position. See dom-tables.js.
 */
export declare const SVG_ONLY_TAGS: Set<string>;
/**
 * React 19's attribute-alias table — camelCase JSX prop → the attribute the
 * browser actually understands (an ALLOWLIST, not mechanical hyphenation).
 * See dom-tables.js.
 */
export declare const ATTRIBUTE_ALIASES: Map<string, string>;
/**
 * The three global ENUMERATED attributes whose boolean prop forms must
 * stringify (`spellcheck`/`draggable`/`contenteditable`). See dom-tables.js.
 */
export declare const isEnumeratedBooleanAttr: (name: string) => boolean;
/** True if `name` (camelCase, kebab, or vendor-prefixed) is a unitless CSS property. */
export declare const isUnitlessStyleProp: (name: string) => boolean;
/**
 * Coerce a style-object value to its CSS string, React-style: a bare number gets
 * `px` appended — except `0`, custom properties (`--x`), and unitless properties.
 * See dom-tables.js.
 */
export declare const cssStyleValue: (name: string, value: unknown) => string;
