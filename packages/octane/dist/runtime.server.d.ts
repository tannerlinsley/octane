/**
 * octane server runtime (SSR).
 *
 * The `octane/compiler` compiler, in `mode: 'server'`, emits component bodies
 * that build an HTML STRING (instead of cloning a DOM template) by calling the
 * `ssr*` helpers here, and that call these server hook implementations. The
 * server analogues of `createRoot().render()` are `renderToString` /
 * `renderToStaticMarkup` (`octane/server`) and `prerender` (`octane/static`),
 * each returning `{ html, css }` (hoisted head folded into `html`).
 *
 * Scope: static markup, dynamic text holes, attributes (incl. class / style /
 * spread), control flow (@if/@for/@switch/@try), nested components, scoped CSS
 * collection, Suspense, and the leaf hooks (state renders its initial value —
 * re-invoking the body for render-phase dispatches until it settles, as React's
 * server renderer does — effects no-op, memo runs once, ids are deterministic).
 * Every dynamic site is
 * wrapped in the hydration markers (`constants.ts`) the client `hydrateRoot`
 * cursor adopts. Events and refs are dropped (no DOM on the server); fragment
 * refs (`<Fragment ref={…}>`) are rejected by the compiler in server mode.
 */
import { EXTERNAL_HYDRATION_PROMISE, HYDRATION_RANGE_BOUNDARY } from './constants.js';
import { normalizeClass } from './css.js';
export { EXTERNAL_HYDRATION_PROMISE, HYDRATION_RANGE_BOUNDARY, normalizeClass };
interface SSRScope {
    parent: SSRScope | null;
    /** Context Provider values stamped on this scope (lazily allocated). */
    $$ctxValues: Map<unknown, unknown> | null;
}
type ParserNamespace = 'html' | 'svg' | 'mathml';
type AttributeNamespace = ParserNamespace | 'opaque';
type ServerComponent = (props: any, scope: SSRScope, extra?: any) => string;
/** Compiler ABI: validate and scope one native element during a DEV SSR render. */
export declare function ssrElement(tag: string, location: string | undefined, render: () => string): string;
declare const ELEMENT_TAG: unique symbol;
/**
 * React-compatible Fragment sentinel. Value-position `<Fragment>` sites compile
 * to ordinary element descriptors in both modes; ssrChild recognizes this type
 * and flattens its children with the same wrapper/key rules as the client.
 */
export declare const Fragment: unique symbol;
/**
 * React-19 `<Activity>` sentinel. Server-compiled template sites lower directly
 * to `ssrActivity`; this export keeps `import { Activity } from 'octane'`
 * resolvable after the server compiler retargets it to `octane/server`.
 */
export declare const Activity: unique symbol;
interface ElementDescriptor {
    $$kind: typeof ELEMENT_TAG;
    type: ServerComponent | string | typeof Fragment;
    props: any;
    key: any;
    ref: any;
    children: any;
}
export declare function createElement(type: ServerComponent | string | typeof Fragment, props?: any, ...children: any[]): ElementDescriptor;
export declare function positionalChildren(children: unknown[]): unknown[];
/** True if `v` is an element descriptor from `createElement` / JSX-at-value. */
export declare function isValidElement(v: unknown): v is ElementDescriptor;
/**
 * `cloneElement(element, config?, ...children)` — a new descriptor with
 * `element`'s props shallow-merged under `config` (config wins), `key`
 * overridden by `config.key`, and children replaced by any passed positionally
 * (else the original children are kept). Mirrors the client runtime's
 * semantics; like the server `createElement`, children ride in BOTH
 * `props.children` (component form) and `descriptor.children` (host form).
 */
export declare function cloneElement(element: ElementDescriptor, config?: any, ...children: any[]): ElementDescriptor;
export declare const Children: {
    forEach(children: any, fn: (child: any, index: number) => void, context?: any): void;
    map<T>(children: any, fn: (child: any, index: number) => T, context?: any): T[] | null | undefined;
    count(children: any): number;
    toArray(children: any): any[];
    only<T>(children: T): T;
};
export declare function createPortal(body: unknown, target: unknown, props?: any): unknown;
export declare function escapeHtml(v: unknown): string;
export declare function escapeAttr(v: unknown): string;
/** A dynamic text hole. null/false/undefined render as empty (React parity). */
export declare function ssrText(v: unknown): string;
/**
 * A dynamic text hole in FIRST-CHILD position of a newline-eating element
 * (`<pre>`/`<textarea>`/`<listing>`): the HTML parser discards a newline that
 * immediately follows the opening tag, so a value starting with '\n' gets an
 * EXTRA leading newline (React's protection) — the parser eats the sacrificial
 * one and the real content round-trips intact.
 */
export declare function ssrTextPre(v: unknown): string;
/**
 * A RENDERABLE expression hole — the value of a `{expr}` that is NOT marked as
 * definite text (`{expr as string}`). Mirrors Ripple: a `{children}` / component
 * function or element descriptor RENDERS (wrapped in a hydration block range, so
 * the client adopts it), while a primitive coerces to text. The compiler routes
 * `{x as string}` / literals / `+`-concats to `ssrText`, everything else here.
 */
export declare function ssrChild(v: unknown, scope: SSRScope): string;
export declare function ssrChildText(v: unknown, scope: SSRScope): string;
/**
 * Wrap a control-flow branch / for-item's HTML in hydration block markers
 * (`<!--[-->` … `<!--]-->`), so a future client hydrate cursor can find the
 * block boundaries and adopt the chosen branch. Mirrors Ripple's marker
 * protocol (shared constants in ./constants).
 */
export declare function ssrBlock(content: string): string;
/**
 * Server half of `<Activity mode="visible"|"hidden">`.
 *
 * Visible content renders inside one hydratable range. Hidden content is not
 * evaluated and serializes as an empty range (or an empty string for static
 * markup), matching React's server behavior while leaving the client a stable
 * range to adopt and populate offscreen during hydration.
 */
export declare function ssrActivity(mode: string, render: () => string): string;
/**
 * Wrap an @for in its single outer pair and encode which arm the server chose.
 * Markerless direct-host items make populated content indistinguishable from a
 * single-root @empty arm otherwise; one bit on the existing open comment lets
 * hydration recover server/client list-shape mismatches without extra nodes.
 */
export declare function ssrForBlock(content: string, hasItems: boolean): string;
/** Compiler-emitted identity membrane for one @if/@switch/@for instance. */
export declare function ssrControl<T>(siteKey: string, fn: () => T): T;
/** Compiler-emitted identity membrane for one arm/item inside ssrControl. */
export declare function ssrArm<T>(armKey: unknown, fn: () => T): T;
/**
 * A portal's site marker. The portal body renders into a foreign target at the
 * client, so server-side it leaves a single anchor comment placeholder.
 */
export declare function ssrPortal(): string;
/**
 * A dynamic attribute: ` name="value"`, ` name` for `true`, or '' to omit.
 * `tag` and `namespace` (when the emit site knows them) gate the tag-sensitive
 * React-parity rules: HTML custom elements get RAW attribute
 * semantics (no alias, no value tables), and the empty-URL strip exempts
 * `<a>`/`<area>` href. Mirrors the client's setAttribute policies (runtime.ts).
 */
export declare function ssrAttr(name: string, v: unknown, tag?: string, namespace?: AttributeNamespace): string;
/** A dynamic `style` attribute (string cssText or an object). */
export declare function ssrStyle(v: unknown): string;
type SsrAttributeSource = readonly [isSpread: boolean, sourceOrName: unknown, value?: unknown];
/**
 * Resolve all serializable attributes across direct JSX writers and spread
 * snapshots. HTML parsers keep the first duplicate attribute, while JSX props
 * use last-write wins; collecting by the normalized native name before
 * serialization keeps server markup aligned with client application. Repeated
 * writes of the same JSX prop retain its first insertion position like
 * Object.assign. Distinct aliases that target one native attr still choose the
 * latest authored writer and retain that winning prop's insertion position.
 */
export declare function ssrAttrs(sources: readonly SsrAttributeSource[], tag?: string, namespace?: AttributeNamespace, skipFormControls?: boolean): string;
/**
 * Resolve direct and spread class writers to one native `class` attribute.
 * `sources` are `[isSpread, value]` pairs in authoring order. A spread only
 * participates when it actually enumerates `class` or `className`; the last
 * participating writer wins, matching the client's source-ordered setters.
 */
export declare function ssrClass(sources: Array<[boolean, unknown]>): string;
/**
 * Snapshot one JSX spread with Object.assign semantics. Only own enumerable
 * string keys participate, and getters run once at the spread's authored
 * evaluation position before later direct prop expressions.
 */
export declare function ssrSnapshotSpread(obj: unknown): Record<string, unknown> | null;
/** A spread `{...obj}`: serialize attr-like keys; drop events/refs/key/children. */
export declare function ssrSpread(obj: unknown, tag?: string, skipClass?: boolean, namespace?: AttributeNamespace, skipFormControls?: boolean): string;
export declare function ssrInnerHtml(sources: readonly (readonly [boolean, unknown])[], renderChildren?: () => string, definitelyHasChildren?: boolean, childrenSources?: readonly (readonly [boolean, unknown])[]): string | undefined;
/**
 * Resolve source-ordered `dangerouslySetInnerHTML` writers for a script and make
 * the resulting whole-script body safe to concatenate into an HTML response.
 * `undefined` still means "no writer", preserving the normal children fallback.
 */
export declare function ssrScriptInnerHtml(sources: readonly (readonly [boolean, unknown])[], renderChildren?: () => string, definitelyHasChildren?: boolean, childrenSources?: readonly (readonly [boolean, unknown])[]): string | undefined;
/**
 * Render the effective direct/spread `children` prop for an otherwise empty
 * host. Prop-driven content is the host's sole child, so primitive text stays
 * markerless while descriptors/lists retain the normal child-slot framing.
 */
export declare function ssrChildrenSources(sources: readonly (readonly [boolean, unknown])[], renderFallback: () => string, scope: SSRScope): string;
/** Validate runtime spread/direct content props before closing a void host. */
export declare function ssrVoidContent(tag: string, dangerSources: readonly (readonly [boolean, unknown])[], childrenSources: readonly (readonly [boolean, unknown])[]): string;
/**
 * The `value` attribute for a controlled/default `<input>` value. Mirrors the
 * client's toControlledString exactly — `value={false}` serializes "false"
 * (the generic ssrAttr would DROP a false boolean); only nullish omits.
 */
export declare function ssrValueAttr(v: unknown): string;
/** The `checked` attribute (presence semantics; mirrors setChecked's `!!v`). */
export declare function ssrCheckedAttr(v: unknown): string;
/**
 * Resolve `<input>`'s value/defaultValue and checked/defaultChecked cascades
 * across direct props and spreads. HTML keeps the first duplicate attribute,
 * so the compiler must emit one effective native attribute for each cascade.
 * Controlled writers win over default writers regardless of source order;
 * repeated writers of the same prop retain normal last-write-wins semantics.
 */
export declare function ssrInputAttrs(sources: Array<readonly [isSpread: boolean, sourceOrName: unknown, value?: unknown]>): string;
type SsrFormControlSource = readonly [isSpread: boolean, sourceOrName: unknown, value?: unknown];
/**
 * Controlled `<textarea>` content: escaped text + the leading-newline guard
 * (the parser eats a '\n' right after the opening tag — see ssrTextPre).
 * Mirrors the client's toControlledString (booleans/numbers stringify).
 */
export declare function ssrTextareaValue(v: unknown): string;
/**
 * Resolve direct and spread textarea value/defaultValue writers. A nullish
 * effective value is uncontrolled and leaves ordinary authored children in
 * place, matching the client helpers' no-op for null/undefined.
 */
export declare function ssrTextareaValueSources(sources: readonly SsrFormControlSource[]): string | undefined;
/** Serialize one effective select `multiple` attribute across JSX sources. */
export declare function ssrSelectAttrs(sources: readonly SsrFormControlSource[]): string;
/**
 * Serialize a controlled `<select>`'s children under a projection scope:
 * every `<option>` rendered inside (compiled or de-opt, any nesting) consults
 * the innermost scope via ssrOption and marks itself ` selected` on match —
 * the server analogue of the client's projectSelectValue. `value` wins over
 * `defaultValue` (the client cascade). A no-match single select needs no
 * server work: the parser selects the first option natively, matching the
 * client's first-non-disabled fallback for the overwhelmingly common case.
 */
export declare function ssrSelectScope(value: unknown, defaultValue: unknown, multiple: unknown, children: () => string): string;
/** Resolve spread/direct select props, then project the effective value. */
export declare function ssrSelectScopeSources(sources: readonly SsrFormControlSource[], children: () => string): string;
/** Return the final raw option value from the same source set as ssrAttrs. */
export declare function ssrOptionValueSources(sources: readonly SsrAttributeSource[]): unknown;
/**
 * Assemble one `<option>`: `attrs` are its serialized attributes (its value
 * attribute included when present), `content` its serialized children,
 * `value` the RAW value prop (undefined = none → the option's flattened text
 * is the compare key, per React). Returns a plain option when no controlled
 * select scope is active.
 */
export declare function ssrOption(value: unknown, attrs: string, content: string): string;
type ServerHookSlot = symbol | string | number;
export declare function hookSlots(count: number): number;
/**
 * Render a child component into the string: fresh scope + frame, body → HTML.
 * `inherit` (M3): the compiled call site is the sole root of its parent's
 * `@{}` body — emit WITHOUT the surrounding `<!--[-->…<!--]-->` pair (the
 * parent's own range bounds it; the client borrows that range). Applies to
 * both the component branch (frame wrap) and the string-tag branch (ssrBlock).
 */
export declare function ssrComponent(parent: SSRScope, comp: ServerComponent | string, props: any, inherit?: boolean, key?: unknown, identityScoped?: boolean): string;
/** Compiler ABI for a component call whose output is parsed in foreign content. */
export declare function ssrComponentNS(parent: SSRScope, comp: ServerComponent | string, props: any, namespace: 'html' | 'svg' | 'mathml', inherit?: boolean, key?: unknown): string;
/** Run a renderable hole under a lexically proven parser namespace. */
export declare function ssrInNamespace(namespace: 'html' | 'svg' | 'mathml', render: () => string): string;
/**
 * `<Suspense fallback={…}>…</Suspense>` — the JSX built-in mirror of the
 * `@try { … } @pending { fallback }` directive, for authors writing JSX (e.g.
 * porting React). Emits the SAME nested-block shape the compiler's `ssrEmitTry`
 * produces for the directive: an outer try-slot `ssrBlock` around the active
 * branch's inner `ssrBlock`, so the client's `<Suspense>` (componentSlot →
 * tryBlock) adopts it byte-for-byte. A descendant `use(thenable)` that hasn't
 * resolved throws `SSR_SUSPENSE` → the `fallback` renders for this pass and
 * render()'s loop awaits + re-renders; a real error rethrows to an outer boundary.
 */
export declare function Suspense(props: {
    fallback?: unknown;
    children?: unknown;
}, scope: SSRScope): string;
type VtSsrClassValue = string | Record<string, string>;
interface VtSsrProps {
    name?: string;
    enter?: VtSsrClassValue;
    exit?: VtSsrClassValue;
    update?: VtSsrClassValue;
    share?: VtSsrClassValue;
    default?: VtSsrClassValue;
    children?: unknown;
}
/**
 * `<ViewTransition>` — the server twin of the client boundary builtin
 * (docs/view-transitions-plan.md). Renders the children transparently in the
 * same nested-block byte shape the client produces (componentSlot's comp pair
 * around the body's childSlot pair — renderComponentFramed adds the outer
 * frame, the explicit ssrBlock below is the inner childSlot range), stamped
 * with the Fizz-parity `vt-*` annotations described above.
 */
export declare function ViewTransition(props: VtSsrProps, scope: SSRScope): string;
/**
 * Server no-op twin of the client `addTransitionType` — transition types only
 * affect client-side view-transition class resolution/callbacks; a shared
 * component calling it during SSR is legal and inert.
 */
export declare function addTransitionType(_type: string): void;
/**
 * `<ErrorBoundary fallback={…}>…</ErrorBoundary>` — the JSX built-in mirror of
 * `@try { … } @catch (e) { fallback }`. `fallback` is a renderable or a
 * `(error, reset) => renderable` render prop (react-error-boundary style). A real
 * error during render swaps to the fallback; a suspension rethrows so an outer
 * `<Suspense>`/`@pending` handles it (matching the client ErrorBoundary's explicit
 * suspension propagation). `reset` is a server no-op (no re-render).
 */
export declare function ErrorBoundary(props: {
    fallback?: unknown;
    children?: unknown;
}, scope: SSRScope): string;
declare const CONTEXT_TAG: unique symbol;
export interface Context<T> {
    (props: {
        value: T;
        children?: any;
    }, scope: SSRScope): string;
    $$kind: typeof CONTEXT_TAG;
    defaultValue: T;
    Provider: (props: {
        value: T;
        children?: any;
    }, scope: SSRScope) => string;
}
export declare function createContext<T>(defaultValue: T): Context<T>;
export declare function useContext<T>(ctx: Context<T>): T;
export declare function ssrIsSuspense(err: unknown): boolean;
export declare function use<T>(usable: Context<T> | PromiseLike<T>, siteKey?: symbol | string): T;
/**
 * Cross-pass creation cache. Keyed like use(): frame path + compiler site key
 * + per-frame occurrence, so the key is identical between the pass a boundary
 * first renders, its discovery re-runs, and the final full pass. A hit with
 * equal deps returns the PRIOR pass's value — for a fetch creation that means
 * the same in-flight/settled promise instance, which is what lets puBatch and
 * use() resolve by identity and what stops re-runs duplicating network calls.
 */
export declare function puMemo<T>(fn: () => T, deps: unknown[], siteKey?: ServerHookSlot): T;
/**
 * Register every unresolved thenable of a hoisted-creation run with the render
 * loop, then suspend ONCE — the loop awaits them together and records their
 * outcomes by identity (resolvedT), so the next pass's use() unwraps all
 * succeed in one go. Already-registered-but-unsettled thenables (streaming
 * re-passes render between waves) still force the suspend but are not pushed
 * again. Falls through silently when everything is already resolved.
 */
export declare function puBatch(thenables: unknown[], warm?: () => void): void;
/**
 * Start (and cache) one prefetched creation from a component's compiled fetch
 * plan (`Comp.__warm`). Dedups on (slot, deps) so a re-warm during a later
 * suspending pass never double-starts a fetch. The resulting thenable is
 * REGISTERED with the render loop so the current round awaits it — that is
 * the whole point: the descendant's data settles before its body runs, and
 * its unwraps then resolve by identity (resolvedT). Speculative: a throwing
 * creation is simply not warmed.
 */
export declare function warmMemo(compute: () => unknown, deps: unknown[], slot: ServerHookSlot): void;
/**
 * Recurse the warm walk into a child component's compiled fetch plan
 * (`Comp.__warm`, attached by compileServerComponent when the child's
 * reachability and props are provably independent of suspended values).
 * No-ops for components without a plan.
 */
export declare function warmChild(comp: any, props: any): void;
/**
 * React's `lazy(load)` — the server mirror of the client wrapper. Unresolved,
 * it records its promise for render()'s await loop and throws the suspense
 * sentinel, so `renderToString` emits the nearest `@pending` fallback for the
 * pass and `prerender` awaits the module and re-renders. Once fulfilled it
 * tail-calls the loaded server component. Deliberately does NOT go through
 * `use()` — a module namespace must never enter the client-seed stream
 * (`SERIAL`), which serializes resolved use() values in render order.
 */
export declare function lazy<C>(load: () => PromiseLike<{
    default: C;
} | C>): C;
export declare function useState<T = undefined>(): [
    T | undefined,
    (next: T | undefined | ((value: T | undefined) => T | undefined)) => void,
    () => T | undefined
];
export declare function useState<T>(initial: T | (() => T), slot?: symbol): [T, (next: T | ((value: T) => T)) => void, () => T];
/** Compiler-emitted useState variant for a tuple whose third member is observable. */
export declare function __useStateWithGetter<T>(initial: T | (() => T), slot?: symbol): [T, (next: any) => void, () => T];
export declare function useReducer<S, A, I = S>(reducer: (s: S, a: A) => S, initialArg: I, initOrSlot?: ((arg: I) => S) | symbol, maybeSlot?: symbol): [S, (action: A) => void, () => S];
/** Compiler-emitted useReducer variant for a tuple whose third member is observable. */
export declare function __useReducerWithGetter<S, A, I = S>(reducer: (s: S, a: A) => S, initialArg: I, initOrSlot?: ((arg: I) => S) | symbol, maybeSlot?: symbol): [S, (action: A) => void, () => S];
export declare function useEffect(): void;
export declare const useLayoutEffect: typeof useEffect;
export declare const useInsertionEffect: typeof useEffect;
export declare function useImperativeHandle(): void;
export declare function useMemo<T>(compute: () => T, deps?: readonly unknown[] | null, slot?: symbol): T;
export declare function useCallback<F>(fn: F, deps?: readonly unknown[] | null, slot?: symbol): F;
export declare function useRef<T = undefined>(): {
    current: T | undefined;
};
export declare function useRef<T>(initial: T, slot?: symbol): {
    current: T;
};
/** React's `useDebugValue` — devtools-only on the client, no-op everywhere. */
export declare function useDebugValue(_value?: unknown, _format?: unknown): void;
/**
 * React DOM's `requestFormReset` — a server no-op (there is no DOM form to
 * reset; the client runtime owns the real implementation). Exported so
 * isomorphic component code resolves under the server build.
 */
export declare function requestFormReset(_form?: unknown): void;
export declare function useId(): string;
export declare function useEffectEvent<F>(_fn: F): F;
export declare function useTransition(): [boolean, (fn: () => void | Promise<unknown>) => void];
export declare function useDeferredValue<T>(value: T, ...rest: any[]): T;
export declare function useSyncExternalStore<T>(_subscribe: unknown, getSnapshot: () => T, ...rest: any[]): T;
export declare function useActionState<S>(_action: unknown, initialState: S): [S, (payload?: any) => void, boolean];
export interface FormStatus {
    pending: boolean;
    data: FormData | null;
    method: string;
    action: ((formData: FormData) => unknown) | string | null;
}
export declare function useFormStatus(): FormStatus;
export declare function useOptimistic<S, V = S>(state: S): [S, (value: V) => void];
export declare function memo<P>(component: P): P;
export declare function withSlot<T>(sym: symbol, fn: (...a: any[]) => T, ...args: any[]): T;
export declare function startTransition(fn: () => void | Promise<unknown>): void;
export declare function flushSync<T>(fn: () => T): T;
/**
 * Compiler-emitted: tag a children-block render function so `isChildrenBlock`
 * recognises it. Returns the function for inline use.
 * @internal
 */
export declare function markChildrenBlock<T>(fn: T): T;
/**
 * True when `value` is a compiler-generated children-block (element/text
 * children lowered to a render function) — as opposed to a user render-prop
 * function or any other value. Server twin of the client helper.
 */
export declare function isChildrenBlock(value: unknown): boolean;
export declare function injectStyle(id: string, css: string): void;
export declare function ssrHeadEl(key: string, tag: string, attrs: Record<string, unknown> | null, text: unknown): void;
interface NamespaceHeadProps {
    headKey: string;
    tag: string;
    attrs: Record<string, unknown> | null;
    text: unknown;
}
/** @internal Compiler-generated. */
export declare function namespaceHead(props: NamespaceHeadProps): ElementDescriptor | null;
/** @internal Compiler-generated descriptor factory for namespaceHead. */
export declare function namespaceHeadElement(headKey: string, tag: string, attrs: Record<string, unknown> | null, text: unknown, authoredKey?: unknown): ElementDescriptor;
/**
 * The result of a buffered server render (`renderToString` / `renderToStaticMarkup`
 * / `prerender`).
 *
 * - `html` — the rendered markup. Hoisted document metadata (`<title>`/`<meta>`/
 *   `<link>`, collected via `ssrHeadEl`) is folded IN: spliced before `</head>`
 *   when the render produced a document, otherwise prepended. (React folds head
 *   resources into the document too, so there is no separate `head` channel.)
 * - `css` — the scoped stylesheets of the components that rendered, as
 *   ready-to-place `<style data-octane="hash">…</style>` tags (one per hash,
 *   deduped). Kept as its own field because octane has scoped CSS that React core
 *   does not; the client's `injectStyle` matches the `data-octane` hash and skips
 *   re-injecting on hydration, so the styles cross the boundary once. (Streaming
 *   has no `css` field — scoped `<style>` flushes inline with the content that
 *   uses it, as React does.)
 */
export interface RenderResult {
    html: string;
    css: string;
}
/** Options accepted by the buffered render entry points (React-shaped subset). */
export interface RenderOptions {
    /** Caller-controlled namespace for `useId`; use distinct prefixes for sibling roots. */
    identifierPrefix?: string;
    /** Called with any error thrown during the render (before it propagates). */
    onError?: (error: unknown) => void;
    /**
     * Abort the render when the request dies: rejects the pending suspense wait
     * with `signal.reason`. Checked before each pass and raced against the await.
     * Async renders only (`prerender`); `renderToString` is a single sync pass.
     */
    signal?: AbortSignal;
    /**
     * CSP nonce stamped on every inline tag the renderer emits: the deduped
     * `<style data-octane>` tags and the suspense seed `<script>`.
     */
    nonce?: string;
    /**
     * Per-render override of the global suspense settle deadline
     * (setSsrSuspenseTimeout). 0 disables the deadline for this render. Async
     * renders only (`prerender`).
     */
    timeoutMs?: number;
}
export declare function setSsrSuspenseTimeout(ms: number): void;
export declare function getSsrSuspenseTimeout(): number;
/**
 * React `react-dom/static` `prerender` — await ALL data (Suspense boundaries
 * resolve to their success arm), then return the complete `{ html, css }`. Use
 * for SSG / any place that wants fully-resolved HTML with no client fallback.
 * This is the buffered, await-everything behaviour of the old `render()`.
 */
export declare function prerender(component: ServerComponent, props?: any, options?: RenderOptions): Promise<RenderResult>;
/**
 * React `react-dom/server` `renderToString` — a SINGLE synchronous pass, no
 * awaiting. A Suspense boundary that suspends renders its fallback (the inline
 * `@try`/`@pending` arm); a bare `use(thenable)` with no enclosing boundary ends
 * the render early (its partial output is returned). Synchronously-resolved
 * `use()` in the shell still seeds. Use `prerender` when you need the data awaited.
 */
export declare function renderToString(component: ServerComponent, props?: any, options?: RenderOptions): RenderResult;
/**
 * React `react-dom/server` `renderToStaticMarkup` — a single synchronous pass
 * producing clean, NON-hydratable HTML: no `<!--[-->`/`<!--]-->` block markers,
 * no head-adoption markers, no suspense seed script. For static pages / email.
 */
export declare function renderToStaticMarkup(component: ServerComponent, props?: any, options?: RenderOptions): RenderResult;
/**
 * Compiled `@try` / JSX `<Suspense>` boundary. `siteKey` is the compiler's
 * source-position hash; combined with the frame path + per-frame occurrence it
 * identifies THIS boundary instance stably across streaming passes. Byte-parity
 * contract with the old inline emit (hydration compatibility):
 *   success            → ssrBlock(ssrBlock(tryHtml))
 *   suspend, @pending  → ssrBlock(ssrBlock(pendingHtml))
 *   suspend, no arm    → ssrBlock('')
 *   error, @catch      → ssrBlock(ssrBlock(catchHtml))
 *   error, no @catch   → rethrow (buffered) / stream fallback for client recovery
 * In streaming mode a suspended boundary additionally carries the
 * `<template data-oct-b>` sentinel, and a REGISTERED boundary keeps returning
 * its pending form (content ships via its segment).
 */
export declare function ssrTry(scope: SSRScope, siteKey: string, tryFn: (arg: unknown, scope: SSRScope) => string, pendFn: ((arg: unknown, scope: SSRScope) => string) | null, catchFn: ((err: unknown, scope: SSRScope, reset: () => void) => string) | null, namespace?: 'html' | 'svg' | 'mathml'): string;
export interface StreamOptions extends RenderOptions {
    onShellReady?: () => void;
    onShellError?: (err: unknown) => void;
    onAllReady?: () => void;
}
/**
 * React `react-dom/server` `renderToPipeableStream` (Node streams). Returns
 * `{ pipe, abort }`; chunks buffer until `pipe(destination)` is called.
 * `onShellReady` fires once the shell (fallbacks included) has been produced;
 * `onAllReady` once every boundary has streamed. Octane signature convention:
 * `(Component, props?, options?)`.
 */
export declare function renderToPipeableStream(component: ServerComponent, props?: any, options?: StreamOptions): {
    pipe: <T extends {
        write(chunk: string): unknown;
        end(): unknown;
    }>(destination: T) => T;
    abort: (reason?: unknown) => void;
};
/**
 * React `react-dom/server` `renderToReadableStream` (web streams). Resolves
 * with the ReadableStream once the shell is ready (rejects on a shell error);
 * the stream's `allReady` promise settles when every boundary chunk has been
 * accepted under consumer backpressure. A consumer that pauses pulling also
 * pauses `allReady`; read concurrently when waiting for it.
 */
export declare function renderToReadableStream(component: ServerComponent, props?: any, options?: StreamOptions): Promise<ReadableStream<Uint8Array> & {
    allReady: Promise<void>;
}>;
/** React DOM `preload(href, {as, …})`. */
export declare function preload(href: string, options: {
    as: string;
} & Record<string, unknown>): void;
/** React DOM `preinit(href, {as: 'style'|'script', …})`. */
export declare function preinit(href: string, options: {
    as: string;
} & Record<string, unknown>): void;
/** React DOM `preconnect(href, {crossOrigin?})`. */
export declare function preconnect(href: string, options?: {
    crossOrigin?: string;
}): void;
/** React DOM `prefetchDNS(href)`. */
export declare function prefetchDNS(href: string): void;
