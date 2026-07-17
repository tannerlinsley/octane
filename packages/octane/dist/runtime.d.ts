/**
 * octane runtime — template-clone renderer with React-shape state model.
 *
 * Architecture overview: see /README.md (project positioning + `.tsrx` syntax) and
 * the section headers throughout this file — the comments here are the design spec.
 *
 * Block = mount/unmount boundary (Root / control-flow / dynamic / portal).
 * Scope = per-call-site hook bag inside a Block.
 * Hooks key by compile-time Symbol per call site (conditional-safe).
 * State: React-shape immutable values + setters that schedule the enclosing Block.
 * Updates: microtask-flushed queue with automatic batching.
 * Effects: three-phase pipeline (insertion sync → layout sync → passive post-paint).
 * Reconciliation: LIS-based keyed list inside forBlock (ported from Ripple's patchKeyedChildrenComplex).
 */
import { EXTERNAL_HYDRATION_PROMISE, HYDRATION_RANGE_BOUNDARY } from './constants.js';
export { EXTERNAL_HYDRATION_PROMISE, HYDRATION_RANGE_BOUNDARY };
export type ComponentBody<P = any, E = any> = (props: P, scope: Scope, extra: E) => void;
type EffectFn = () => void | (() => void);
type Cleanup = () => void;
type HookSlot = symbol | number;
/** @internal Cross-renderer parent ownership carried on compiler-created region props. */
export interface RendererRegionOwnerBridge {
    readonly active: boolean;
    readContext<T>(context: Context<T>): T;
    routeError(error: unknown): boolean;
    routeSuspense(thenable: PromiseLike<unknown>): boolean;
    registerDispose(dispose: () => void): () => void;
}
export interface Scope {
    block: Block;
    parent: Scope | null;
    /**
     * Hook slot map. Lazily allocated on the first hook call via `ensureHooks`.
     * For-of item bodies that never call a hook (the common case in
     * js-framework-benchmark-shaped lists) keep this as `null` for their
     * lifetime — saving the Map allocation per Block on mass-mount paths.
     * Reads use optional chaining (`scope.hooks?.get(slot)`) which returns
     * `undefined` when null, identical to a Map.get miss.
     */
    hooks: Map<HookSlot, any> | null;
    cleanups: Cleanup[];
    /**
     * This scope's effect slots in hook DECLARATION order (first-enqueue order —
     * the order the hooks ran in the scope's first render). unmountScope walks it
     * to reproduce React's deletion contract (commitDeletionEffectsOnFiber's
     * forward effect-list walk): insertion + layout destroys fire synchronously in
     * the declared interleaving, passive destroys are DEFERRED to the passive
     * flush. A flat array (not the hooks Map) so teardown is an indexed walk with
     * no iterator allocation and no filtering past state/memo/ref slots. Null on
     * effect-less scopes — the common case on mass-mount paths.
     */
    effectSlots: EffectSlot[] | null;
    /**
     * Per-call-site child scopes, stored as `[key, scope]` pairs in a flat array
     * (NOT a Map): iteration is a plain indexed for-loop, and lookups are linear
     * scans — faster than `Map.get` for the typical N ≤ 8 case (most components
     * have a handful of static sub-component calls at most).
     */
    children: ChildScope[];
    mounted: boolean;
    /**
     * Slot objects owned by this scope (ifBlockSlot, forBlockSlot, etc.).
     * Lazily allocated by registerSlot at the slot's first creation site;
     * walked directly by unmountScope so teardown doesn't have to enumerate
     * the entire hidden-class chain looking for `_xxx$N` slot keys.
     * Null on scopes with no slots — the common case for leaf components.
     */
    _slots: any[] | null;
    /**
     * Compiled REF MANIFEST (compiled-output plan, ref-manifest phase): a
     * module-scope constant the mount path stamps when the body has ref-carrying
     * bindings — flat triads of [kind, bagField, elBagField]: 'r' = element ref
     * (`ref={…}`), 's' = spread (its committed object may carry a ref), 'f' =
     * `<Fragment ref>` (the FragmentInstance field; third slot unused). The
     * suspense-hide walk (detachSubtreeRefs) reads slots[0] through it — which
     * is what lets ref-carrying bag fields take 1-char names and ride the
     * positional arity factories (previously they kept long `_ref$N` names for
     * a key-prefix scan, forcing the whole bag onto the bagOf spill). Null on
     * ref-less bodies — the common case.
     */
    refFields: string[] | null;
    /**
     * Per-scope context Provider map. Pre-initialised to null on both Scope
     * and Block so the field's hidden-class position is stable across all
     * instances — Provider stamping was previously a late `??=` add that
     * fragmented the post-render shape tree of every Block under a Provider
     * ancestor.
     */
    $$ctxValues: Map<Context<any>, any> | null;
    /** Context dependencies recorded during this scope's render (memo invalidation). */
    $$ctxReads: Map<Context<any>, any> | null;
    /**
     * Resolved-provider cache for `use(ctx)`. Maps a context to the ancestor
     * scope/block whose `$$ctxValues` satisfies it for THIS consumer (or the
     * DEFAULT_CTX sentinel when none does). The mapping is invariant across a
     * consumer's lifetime — parent chains are fixed at creation, a provider scope
     * never drops a context it stamped, and a closer provider can't appear above a
     * surviving consumer — so only the provider's VALUE varies, read live from the
     * cached scope. Collapses useContextInternal's O(depth) walk to an O(1) read.
     * Lazily minted on a consumer's first `use()`, so non-consumer blocks (the
     * vast majority) carry just this one null field, not a per-context slot set.
     */
    $$ctxCache: Map<Context<any>, any> | null;
    slots: any[];
    /**
     * DEV ONLY (set by `dev`-compiled bodies; `undefined` in production): a structured
     * hydration source-location table — `{ slotIndex: [line, column] }` — plus `locFile`,
     * the module's source file name. Read by hydration-mismatch warnings (`siteLoc`) to
     * report `App.tsrx:42:5`, and reusable by a future Chrome-DevTools element→source layer.
     * Absent (never allocated) in prod, so the Scope shape stays monomorphic there.
     */
    locs?: Record<number, [number, number]>;
    locFile?: string;
}
interface ChildScope {
    key: symbol | string | number;
    scope: Scope;
}
export declare function hookSlots(count: number): number;
type BlockKind = 'root' | 'control-flow' | 'dynamic' | 'portal';
type OutputHandler = (block: Block, value: unknown) => void;
interface RootIdState {
    prefix: string;
    next: number;
}
export interface Block extends Scope {
    kind: BlockKind;
    parentBlock: Block | null;
    parentNode: Node;
    /** Root-owned useId namespace/counter, shared by every descendant block. */
    idState: RootIdState;
    startMarker: Node | null;
    endMarker: Node | null;
    /**
     * When true, start/end are BORROWED from an enclosing slot (e.g. an `@if`
     * branch that reuses the if-slot's permanent markers instead of minting its
     * own `br`/`/br` pair). DOM teardown then removes the content BETWEEN the
     * markers but leaves the markers themselves for the owning slot/parent.
     */
    exclusiveMarkers: boolean;
    body: ComponentBody;
    props: any;
    extra: any;
    outputHandler: OutputHandler | null;
    /**
     * True when this block OR any ancestor is a `memo()` block. Monotone up the
     * parentBlock chain (computed once at creation), so `useContextInternal` can
     * skip its memo-ancestor stamping walk entirely on the common no-memo tree —
     * the walk only ever stamps memo blocks, so if there are none above us it is
     * pure overhead (~ancestor-depth iterations per `use()` call).
     */
    memoInChain: boolean;
    pending: boolean;
    disposed: boolean;
    /**
     * The single pure-host DOM node this Block manages on the de-opt path, REUSED
     * across re-renders so DOM-resident state survives (no rebuild). Set by
     * `deoptItemBody` (a `.map()` item that is a host element) and by `hostElementBody`
     * (the host-element-with-component-children renderer). Null for every other Block.
     */
    deoptNode: Node | null;
    /** Set on item Blocks: pointer to the enclosing for-block's slot. */
    forSlot: ForSlot | null;
    /** Item position within the enclosing for-block. 0 for non-item blocks. */
    itemIndex: number;
    /**
     * Doubly-linked-list pointers for for-block item blocks. Maintained by
     * reconcileKeyed so move/remove are O(1) pointer ops instead of array
     * splice. The list head/tail live on ForSlot. Always present (null on
     * non-item blocks) to keep Block monomorphic — V8 transitioning between
     * hidden classes for the rare "is this an item?" case was measurably worse
     * than carrying a couple of null pointers everywhere.
     */
    prevSibling: Block | null;
    nextSibling: Block | null;
    /** Cached key for this item Block. null on non-item blocks. */
    key: any;
    /**
     * Set on a `<ViewTransition>` component's block: the boundary's current
     * props (docs/view-transitions-plan.md). Null on every other block —
     * declared everywhere so the shape stays monomorphic; the field gates the
     * nearest-boundary dirty walk and the unmount unregister.
     */
    vt: ViewTransitionProps | null;
    /**
     * Render priority for the next scheduled render: 'transition' (queued from
     * inside startTransition — suspending shouldn't swap to fallback if prior
     * UI is committed) or 'urgent' (default). Read & cleared when the render
     * is dispatched.
     */
    pendingMode: 'urgent' | 'transition' | null;
    /** The render mode in effect during the body's *current* execution. */
    currentRenderMode: 'urgent' | 'transition' | null;
    /**
     * "Deferred lane" bit riding alongside pendingMode: true when the next
     * scheduled render was spawned by useDeferredValue's deferred swap. Read &
     * cleared with pendingMode when the render is dispatched.
     */
    pendingDeferred: boolean;
    /**
     * True while the body executes inside a useDeferredValue-spawned deferred
     * pass (inherited by nested renders, like currentRenderMode). Drives React's
     * anti-waterfall rule: only the FIRST useDeferredValue level defers — a hook
     * mounting inside an already-deferred pass adopts its final value directly.
     */
    currentRenderDeferred: boolean;
    /**
     * Set on a block inside a HIDDEN `<Activity>` subtree. While inactive, the
     * block still renders (state + DOM are produced/updated) but its effects do
     * NOT run (enqueueEffect skips when any ancestor is inactive); on reveal the
     * flag is cleared and a re-render re-fires the effects.
     */
    inactive: boolean;
    /** Direct (own) context reads this render — drives memo invalidation alongside $$ctxReads. */
    $$ctxDirect: Map<Context<any>, any> | null;
    /**
     * Armed for React's IMPLICIT same-element bailout (beginWork's
     * oldProps === newProps skip). Set at value-position component mounts
     * (childSlot); makes the block a context-stamping target like `__memo` so
     * the bail's lazy consumer refresh is sound.
     */
    $$implicitBail: boolean;
    /** Per-render `use(thenable)` call-order counter; reset at the top of renderBlock. */
    __thenableIdx: number;
    /**
     * Render-loop guard: the drainQueue pass this block last rendered in, and how
     * many times it rendered within that pass. A block that keeps re-queueing
     * itself from its own render body (an unguarded render-phase setState) is a
     * non-converging loop — drainQueue throws after RENDER_PHASE_UPDATE_LIMIT,
     * mirroring React's "Too many re-renders".
     */
    drainStamp: number;
    drainRenders: number;
    /** True when the queued render came from a different component's render body. */
    crossRenderUpdate: boolean;
    /** Commit-callback loop guard, scoped to one externally-started update chain. */
    nestedUpdateChain: number;
    nestedUpdateCount: number;
    nestedUpdateError: boolean;
    /**
     * useEffectEvent updates publish only for the latest render of this block that
     * completed. Zero means this block has never called useEffectEvent. Keeping the
     * attempt/completion counters on the block makes aborted-render filtering
     * allocation-free for components that do not use the hook.
     */
    effectEventRenderVersion: number;
    effectEventCompletedVersion: number;
}
interface EffectSlot {
    deps: any[] | undefined;
    cleanup: Cleanup | undefined;
    /** Discriminant so deactivateScope can find effect slots among state/memo/ref. */
    effect: true;
    /**
     * The slot's phase (INSERTION/LAYOUT/PASSIVE), fixed at creation (a hook slot
     * is one call site, and a call site has one phase). deactivateScope uses it to
     * spare INSERTION effects on hide: React never disconnects insertion effects
     * for a hidden (<Activity>/suspended) tree — they own injected styles that
     * must persist — only a real unmount cleans them up.
     */
    phase: Phase;
}
/** Animation class value: a class string, 'auto', 'none', or a per-type map. */
type ViewTransitionClassValue = string | Record<string, string>;
export interface ViewTransitionProps {
    name?: string;
    enter?: ViewTransitionClassValue;
    exit?: ViewTransitionClassValue;
    update?: ViewTransitionClassValue;
    share?: ViewTransitionClassValue;
    /**
     * Parent enter/exit relays (React's enableViewTransitionParentEnterExit —
     * experimental-channel behavior): a nested boundary inside a unit that
     * entered/exited as a whole activates its parentEnter/parentExit when every
     * strict intermediate boundary also relays (declares parentEnter/parentExit
     * or the matching handler, not resolving 'none') and the unit's outermost
     * boundary genuinely enters/exits (not 'none', not consumed by a share).
     */
    parentEnter?: ViewTransitionClassValue;
    parentExit?: ViewTransitionClassValue;
    default?: ViewTransitionClassValue;
    onEnter?: (instance: ViewTransitionInstance, types: string[]) => void | (() => void);
    onExit?: (instance: ViewTransitionInstance, types: string[]) => void | (() => void);
    onUpdate?: (instance: ViewTransitionInstance, types: string[]) => void | (() => void);
    onShare?: (instance: ViewTransitionInstance, types: string[]) => void | (() => void);
    onParentEnter?: (instance: ViewTransitionInstance, types: string[]) => void | (() => void);
    onParentExit?: (instance: ViewTransitionInstance, types: string[]) => void | (() => void);
    children?: unknown;
}
/**
 * Animation handle for one of a boundary's view-transition pseudo-elements —
 * the objects on {@link ViewTransitionInstance}. `animate()`/`getAnimations()`
 * target the pseudo-element via the Web Animations `pseudoElement` option on
 * the document element (React's ViewTransitionPseudoElement shape).
 */
export declare class ViewTransitionPseudoElement {
    /** The pseudo-element selector, e.g. `::view-transition-new(hero)`. */
    readonly selector: string;
    constructor(pseudo: string, name: string);
    animate(keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions): Animation;
    getAnimations(): Animation[];
}
/**
 * The instance handed to on* callbacks: the resolved view-transition-name plus
 * `.animate()`-capable handles for the boundary's four pseudo-elements.
 */
export interface ViewTransitionInstance {
    name: string;
    group: ViewTransitionPseudoElement;
    imagePair: ViewTransitionPseudoElement;
    old: ViewTransitionPseudoElement;
    new: ViewTransitionPseudoElement;
}
/**
 * React's `addTransitionType` (experimental `unstable_addTransitionType`):
 * tags the current transition with a type. ViewTransition class props given as
 * per-type maps resolve against the batch's types, and the types array reaches
 * every on* callback. Types reset when the batch commits.
 */
export declare function addTransitionType(type: string): void;
/**
 * Compiler module-load hint: emitted once per client module that imports
 * ViewTransition from 'octane', so the very first transition flush that MOUNTS
 * a boundary is already wrapped (the runtime otherwise learns "this app uses
 * VT" only mid-drain — too late to have snapshotted). Semi-public (tier 2).
 */
export declare function __vtSeen(): void;
type Phase = 0 | 1 | 2;
/**
 * Test-environment opt-in. When true, scheduleRender() calls that happen
 * outside a flushSync or an act() callback emit a console.error mirroring
 * React's "An update to X was not wrapped in act(...)" message. Default
 * false so production / non-test code never warns.
 */
export declare function setIsOctaneActEnvironment(value: boolean): void;
/**
 * React-DOM parity. Runs `fn` and synchronously drains any renders/effects it scheduled
 * before returning. Bypasses the microtask-batched flush — used by the benchmark
 * timing rig to measure operation wall-clock without microtask coalescing. Also the
 * discrete-event commit path: maybeFlushDiscrete flushes through here so
 * click/keydown/input handlers commit before the browser regains control.
 */
export declare function flushSync<T>(fn: () => T): T;
/**
 * Compiler-emitted on a host element's ref MOUNT. Defers the attach until commit
 * (drainRefAttaches) so the node is connected when a callback ref fires and
 * ref.current is set before layout effects run. Each entry records its owning
 * `block` plus an enqueue-order `seq`; drainRefAttaches sorts with
 * comparePostOrder (post-order via the parentBlock chain, seq as tiebreak) for
 * child-before-parent ordering, matching effect ordering. Ref identity UPDATES
 * queue here too (paired with a queueRefDetach of the old ref), so within one
 * commit every detach drains before every attach — a ref hopping between
 * elements never ends null, whichever binding updates first.
 */
export declare function queueRefAttach(scope: Scope, fn: () => void): void;
/**
 * Queue a teardown ref detach for commit (compiled `ref` binding / spread-ref /
 * hostComponent / fragment-ref unmount cleanups, and the de-opt teardown walk).
 * Unmount cleanups run mid-render (unmountScope), and a ref can be a setState
 * function whose value feeds back into what an owner renders — firing `ref(null)`
 * synchronously lets that null-update render before the replacement element's
 * deferred attach, oscillating forever when the teardown was a rebuild. Deferring
 * to commit puts the null and the new element in the SAME batch (React's
 * mutation→layout phasing). `el` is the element the ref was attached to, so a
 * callback ref shared across elements releases ITS element's React-19 cleanup.
 */
export declare function queueRefDetach(ref: any, el: Element | FragmentInstance | null): void;
/**
 * Test/test-environment helper — synchronously drain any queued passive
 * (`useEffect`) bodies that would normally fire after paint. Idempotent.
 * Real apps should not call this; rely on the normal post-paint scheduler.
 */
export declare function drainPassiveEffects(): void;
/**
 * True if there's a queued render or any uncommitted effect. Used by `act`,
 * and exported (tier 2, binding infrastructure) so @octanejs/testing-library's
 * synchronous settle can loop to EXACT quiescence instead of a fixed bound.
 * Purely promise-driven work (use(promise), async transitions) is not "pending"
 * by this definition — it needs `waitFor`/async `act`.
 */
export declare function hasPendingWork(): boolean;
/**
 * React-parity `act(...)`. Wrap test code that triggers updates so all of
 * the scheduled work commits before the assertion phase runs.
 *
 * TWO modes, matching React exactly:
 *  - SYNC callback → all scheduled work (renders + INSERTION/LAYOUT/PASSIVE
 *    effects) is flushed SYNCHRONOUSLY before act returns, so
 *    `act(() => setState(...)); expect(...)` works WITHOUT awaiting — the
 *    dominant pattern in ported React test suites. The returned (already
 *    resolved) promise still carries the callback's result; a callback throw
 *    REJECTS the promise rather than throwing synchronously (React's act is
 *    a thenable with the same contract).
 *  - ASYNC callback (returns a thenable) → awaited, then the scheduler is
 *    drained across microtask ticks until quiescent (renders, effects, and
 *    microtask chains from `use(promise)` / transition retries).
 *
 * While the act() scope is active, scheduleRender's "update outside act(...)"
 * dev warning is suppressed (see `IS_OCTANE_ACT_ENVIRONMENT` and
 * `setIsOctaneActEnvironment`).
 *
 * The async double-loop (5 microtask ticks × up to ACT_DRAIN_LIMIT iterations)
 * drains cascades like `use(promise)` → status flip → retry → renderBlock
 * that wouldn't settle in a single tick.
 */
export declare function act<T>(fn: () => T | Promise<T>): Promise<T>;
export declare function renderBlock(block: Block): void;
export declare function componentSlotLite<P>(parentScope: Scope, slotKey: number, host: Node, comp: ComponentBody<P>, props: P, anchor?: Node): void;
export declare function withSlot<T>(sym: symbol, fn: (...a: any[]) => T, ...args: any[]): T;
type StateSetter<T> = (next: T | ((prev: T) => T)) => void;
type StateTuple<T> = [T, StateSetter<T>, () => T];
export declare function useState<T = undefined>(): StateTuple<T | undefined>;
export declare function useState<T>(initial: T | (() => T), slot?: symbol): StateTuple<T>;
/** Compiler-emitted useState variant for a tuple whose third member is observable. */
export declare function __useStateWithGetter<T>(initial: T | (() => T), slot?: symbol): StateTuple<T>;
type ReducerTuple<S, A> = [S, (action: A) => void, () => S];
export declare function useReducer<S, A, I = S>(reducer: (s: S, a: A) => S, initialArg: I, initOrSlot?: ((arg: I) => S) | symbol, slot?: symbol): ReducerTuple<S, A>;
/** Compiler-emitted useReducer variant for a tuple whose third member is observable. */
export declare function __useReducerWithGetter<S, A, I = S>(reducer: (s: S, a: A) => S, initialArg: I, initOrSlot?: ((arg: I) => S) | symbol, slot?: symbol): ReducerTuple<S, A>;
export declare function useEffect(fn: EffectFn, deps?: any[] | null, slot?: symbol): void;
export declare function useLayoutEffect(fn: EffectFn, deps?: any[] | null, slot?: symbol): void;
export declare function useInsertionEffect(fn: EffectFn, deps?: any[] | null, slot?: symbol): void;
export declare function useMemo<T>(compute: (...deps: any[]) => T, deps?: any[] | null, slot?: symbol): T;
export declare function useCallback<F extends (...args: any[]) => any>(fn: F, deps?: any[] | null, slot?: symbol): F;
export declare function useRef<T>(initial: T, slot?: symbol): {
    current: T;
};
/**
 * React's `useDebugValue(value, format?)` — a devtools-only label for custom
 * hooks. Octane has no devtools inspector, so it is a no-op; exported so custom
 * hooks ported from React run unchanged. Accepts (and ignores) the compiler's
 * trailing compiler slot like every other hook.
 */
export declare function useDebugValue(_value?: unknown, _format?: unknown, _slot?: symbol): void;
/**
 * React's `useImperativeHandle(ref, factory, deps)` — exposes an imperative
 * API to a parent via the ref. Scheduled as a layout-phase effect so the
 * `ref.current` is populated before paint and before any layout effects in
 * ancestors that depend on the API. Cleared to null on unmount.
 */
export declare function useImperativeHandle<T>(ref: {
    current: T | null;
} | ((value: T | null) => void) | null | undefined, factory: () => T, deps?: any[] | null, slot?: symbol): void;
/**
 * React 18+ `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)`.
 *
 * Mirrors React's contract: subscribe is called on mount with an
 * `onStoreChange` callback; the returned function unsubscribes on unmount
 * (and on subscribe identity change). `getSnapshot()` is called on every
 * render to return the current snapshot. When the store calls
 * `onStoreChange`, the component re-renders and `getSnapshot()` runs again.
 *
 * `getServerSnapshot` IS used: on the server it supplies the SSR snapshot, and
 * during client hydration the first read uses it (see below) so the adopted DOM
 * matches the server value before the commit-time store-sync reconciles any
 * client/server difference. Client-only builds discard the capability method
 * that supplies this state.
 *
 * Implementation. A single identity-stable `inst` cell (StoreInst) holds the
 * last-COMMITTED snapshot, the latest getSnapshot, the block's forceUpdate, and a
 * stable onStoreChange handler. Two derived sub-slots host it: `<slot>:uses:inst`
 * (the cell, in the hooks map) and `<slot>:uses:effect` (the passive subscribe
 * effect). The value-sync that reconciles the render-read snapshot at commit does
 * NOT go through a layout effect — it rides the dedicated, sort-free
 * `storeSyncQueue` (drainStoreSyncs, run after the layout phase). Two payoffs:
 *
 *  1. The commit-sync entry carries no cleanup and never reorders, so the generic
 *     effect machinery (deps compare, PendingEffect alloc, post-order sort,
 *     per-entry cleanup/finalizer bookkeeping) is skipped for it.
 *  2. The enqueue is GATED: a re-render whose snapshot is Object.is-unchanged (and
 *     whose store wasn't swapped) enqueues NOTHING, even with a fresh inline
 *     getSnapshot every render (the dominant zustand/query pattern). getSnapshot is
 *     refreshed in RENDER instead of at commit, so onStoreChange always dedups
 *     against the freshest read while unchanged renders stay allocation-free.
 *
 * DIVERGENCE FROM REACT (documented in docs/react-parity-migration-plan.md):
 * React's updateSyncExternalStore re-pushes updateStoreInstance whenever
 * `inst.getSnapshot !== getSnapshot`, giving a commit-time snapshot re-read even
 * when the value was unchanged. We drop that: a store that mutates WITHOUT
 * notifying in the render→commit window is no longer caught on a render where ONLY
 * getSnapshot identity changed. Octane's synchronous renderer closes React's
 * motivating concurrent-interleaving window, and any store that actually notifies
 * is unaffected (onStoreChange uses the render-fresh getSnapshot).
 */
export declare function useSyncExternalStore<T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T, slot?: symbol): T;
/**
 * React 19 `useEffectEvent` — returns a fresh wrapper each render whose shared
 * cell invokes the latest COMMITTED `fn`. Effect Events are non-reactive (the
 * compiler omits them from inferred dependencies), but their wrapper identity
 * is intentionally not stable. Publishing the cell in commit prevents a
 * suspended or failed render from leaking an uncommitted closure.
 */
export declare function useEffectEvent<F extends (...args: any[]) => any>(fn: F, slot?: symbol): F;
declare const CONTEXT_TAG: unique symbol;
export interface Context<T> {
    (props: {
        value: T;
        children?: any;
    }, scope: Scope, extra?: unknown): void;
    $$kind: typeof CONTEXT_TAG;
    defaultValue: T;
    Provider: ComponentBody<{
        value: T;
        children?: any;
    }>;
    /**
     * Monotonic version bumped whenever a Provider for this context commits a
     * changed value. Consumers record the version they read at; the memo bailout
     * (componentSlot) compares it so a context change forces a re-render through
     * the push-cascade even when props are shallow-equal. See useContextInternal.
     */
    $$version: number;
}
/**
 * Create a Context. Providers push the value into a Block-scoped slot; `use(ctx)`
 * walks the Block parent chain to find the nearest Provider for that context.
 */
export declare function createContext<T>(defaultValue: T): Context<T>;
/**
 * Programmatically provide a context value for a scope's descendants — the same
 * stamping `<Context.Provider value={…}>` performs, exposed for plain-TS
 * (non-template) components that render children and want to provide context to
 * them without authoring a `.tsrx` Provider wrapper. Call it during the component's
 * render, before rendering `children` into the same `scope`. (Used by runtime
 * component bindings — e.g. `@octanejs/motion`'s `MotionConfig` and variant
 * propagation.)
 */
export declare function provideContext<T>(scope: Scope, context: Context<T>, value: T): void;
/**
 * Compiler-emitted: tag a children-block render function so `isChildrenBlock` recognises it.
 * Returns the function for inline use (`{ children: markChildrenBlock(__children$N) }`).
 * @internal
 */
export declare function markChildrenBlock<T>(fn: T): T;
/**
 * True when `value` is a compiler-generated children-block — a component's element/text children
 * that `.tsrx` lowered to a render function — as opposed to a user render-prop function or any other
 * value. Lets a binding with a function-as-child API tell `<C>{(x) => …}</C>` (call it) apart from
 * `<C><D/></C>` (render it): `typeof children === 'function' && !isChildrenBlock(children)`.
 */
export declare function isChildrenBlock(value: unknown): boolean;
/**
 * `<Suspense fallback={…}>…</Suspense>` — the JSX component form of
 * `@try { … } @pending { fallback }`, for authors writing JSX rather than the
 * template directives (e.g. porting React / react-query code). A thin built-in
 * over the same `tryBlock` primitive the directives compile to: the children
 * render as the try body, and `fallback` renders as the pending body whenever a
 * descendant suspends (via `use(thenable)`).
 */
export declare const Suspense: ComponentBody<{
    fallback?: unknown;
    children: ComponentBody;
}>;
/**
 * `<ViewTransition>` — a transparent boundary that opts its subtree into
 * browser View Transitions on transition-lane commits (enter on insert, exit
 * on delete, update on inner mutation — see the View Transitions block above
 * and docs/view-transitions-plan.md). Renders its children unchanged; all
 * animation machinery lives in the flush controller. Identity-checked like
 * Suspense/ErrorBoundary (M3 inherit-decline), so its block always owns an
 * exact DOM range.
 */
export declare const ViewTransition: ComponentBody<ViewTransitionProps>;
/**
 * `<ErrorBoundary fallback={…}>…</ErrorBoundary>` — the JSX component form of
 * `@try { … } @catch (e) { fallback }`. `fallback` is either a renderable or a
 * `(error, reset) => renderable` render prop (react-error-boundary style). When a
 * descendant throws during render/effects, the boundary swaps to the fallback.
 * Suspensions propagate to an enclosing Suspense boundary instead.
 */
export declare const ErrorBoundary: ComponentBody<{
    fallback?: unknown | ((error: unknown, reset: () => void) => unknown);
    children: ComponentBody;
}>;
/**
 * React 19's `use()` — accepts either a Context<T> or a thenable (Promise<T>).
 *
 * - `use(context)`: walks the Block tree from CURRENT_BLOCK upward to find a
 *   Provider's value (or the default).
 * - `use(thenable)`: if fulfilled, returns the value; if rejected, rethrows
 *   the reason (caught by the nearest tryBlock's catch); if pending, throws
 *   an internal SuspenseException (caught by the nearest tryBlock and routed
 *   to its `pending` body).
 *
 * The thenable mutates in place to gain `.status` / `.value` / `.reason`
 * fields the second time it's seen — matches React's `trackUsedThenable`.
 * Per-block `thenableState[]` keyed by call index lets the body replay
 * synchronously after the promise resolves.
 */
export declare function use<T>(usable: Context<T> | PromiseLike<T> | TrackedThenable<T>): T;
/**
 * Internal renderer-boundary variant of `use(thenable)`. A universal root owns
 * and memoizes each suspended attempt, so a different thenable on resume is an
 * authoritative next dependency rather than an uncached user promise. Replace
 * the stored thenable even during resume replay so a sequential A -> B
 * suspension keeps the outer host fallback visible until B settles.
 */
export declare function useRendererThenable<T>(thenable: PromiseLike<T>): T;
/**
 * React's `useContext(Context)` — reads the nearest Provider's value (or the
 * context default). A thin alias for the context branch of `use()`: context
 * reads carry no per-call-site state, so there is no hook slot and the compiler
 * needs no rewrite. Provided for React familiarity; `use(Context)` is the
 * React-19 idiom and remains the primary form.
 */
export declare function useContext<T>(context: Context<T>): T;
/**
 * Compiler ABI for a DOM component materialized from a reverse renderer region.
 * The bridge is deliberately attached only to the owning DOM root; normal DOM
 * blocks retain no renderer fields or dispatch branches.
 */
export declare function bindRendererRegionOwner(props: unknown): void;
/** @internal Live context reader rooted at a captured DOM boundary scope. */
export declare function readContextFromScope<T>(scope: Scope, context: Context<T>): T;
interface TrackedThenable<T = any> extends PromiseLike<T> {
    status?: 'pending' | 'fulfilled' | 'rejected';
    value?: T;
    reason?: any;
}
/**
 * Batched unwrap for a stratum of use() promises (compiler-emitted before the
 * unwrap statements). Tags every thenable, skips non-thenables (Contexts pass
 * through untouched), and — if any are still pending — throws ONE
 * SuspenseException whose thenable settles when ALL members fulfil or the
 * FIRST member rejects. One boundary retry per stratum instead of one per
 * promise; the unwraps then read settled values from the thenable expandos in
 * their original (hydration-seed-preserving) order.
 *
 * `warm` is the compiler-built fetch-tree thunk: invoked only on the throwing
 * path (a resolved batch costs nothing), it prefetches provably-independent
 * descendant fetches via warmChild/warmMemo so the whole tree loads in
 * max(depth-of-true-dependencies) rounds instead of one round per component.
 */
export declare function useBatch(items: any[], warm?: () => void): void;
/**
 * Start (and cache) one prefetched creation. Dedups on (slot, deps) so
 * re-warming during a second attempt never double-starts a fetch. The value
 * is status-tagged immediately so the real use() unwrap reads it directly.
 */
export declare function warmMemo(compute: () => any, deps: any[], slot: HookSlot): void;
/**
 * Recurse the warm walk into a child component's compiled fetch plan
 * (`Comp.__warm`, emitted by the compiler when the child's reachability and
 * props are provably independent of suspended values). No-ops for components
 * without a plan. Depth-capped as a backstop for recursion the compiler
 * cannot prove finite.
 */
export declare function warmChild(comp: any, props: any): void;
/**
 * React's `lazy(load)` — code-splitting. Returns a component; the first time it
 * renders it calls `load()` (once, cached on the payload for every mount of this
 * lazy component) and SUSPENDS on the returned promise, exactly like a body that
 * opens with `use(loadPromise)`: the nearest `@try`/`<Suspense>` shows its
 * pending arm and retries when the module settles. Once fulfilled it tail-calls
 * the loaded component with the same `(props, scope, extra)`, so hooks, context,
 * children, and return-based bodies all behave as if the component were imported
 * statically. A rejected load throws the rejection reason on retry, routing to
 * the nearest `@catch` (React parity).
 *
 * The wrapper's identity is stable, so `componentSlot`'s `comp !==
 * state.currentComp` check never spuriously remounts, and `memo(lazy(...))`
 * composes (memoWrapper tail-calls this wrapper). The wrapper carries no
 * `$$singleRoot` flag — a value-position lazy mounts through childSlot's
 * marked path, which is correct for any root shape the loaded module may have.
 */
export declare function lazy<C extends ComponentBody<any>>(load: () => PromiseLike<{
    default: C;
} | C>): C;
export declare function useId(slot?: symbol): string;
export declare function template(html: string, ns?: number, frag?: number): Element;
export declare function clone<T extends Node>(node: T, loc?: string): T;
/**
 * Compiler-emitted for a multi-root template's mount: drain the cloned
 * <octane-frag> wrapper's children into the live parent. While hydrating, the
 * "wrapper" is clone()'s virtual stand-in for server content that is ALREADY
 * in place — nothing to move.
 */
export declare function drainFrag(root: Node, parent: Node, anchor: Node | null): void;
export declare function bag0(s: Scope, r: Node | null): any;
export declare function bag1(s: Scope, r: Node | null, a: any): any;
export declare function bag2(s: Scope, r: Node | null, a: any, b: any): any;
export declare function bag3(s: Scope, r: Node | null, a: any, b: any, c: any): any;
export declare function bag4(s: Scope, r: Node | null, a: any, b: any, c: any, d: any): any;
export declare function bag5(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any): any;
export declare function bag6(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any): any;
export declare function bag7(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any, g: any): any;
export declare function bag8(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any): any;
export declare function bag9(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any): any;
export declare function bag10(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any): any;
export declare function bag11(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any): any;
export declare function bag12(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any): any;
export declare function bag13(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any, m: any): any;
export declare function bag14(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any, m: any, n: any): any;
export declare function bag15(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any, m: any, n: any, o: any): any;
export declare function bag16(s: Scope, r: Node | null, a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any, m: any, n: any, o: any, p: any): any;
export declare function bagOf(s: Scope, r: Node | null, bag: any): any;
/**
 * Compiler-emitted for a single-text-child binding's mount. Normally creates the
 * text node and appends it; while hydrating, ADOPTS the element's existing
 * (server-rendered) text node so the DOM isn't rebuilt. The prev-value the
 * compiler seeds alongside this makes the first update a no-op when the client
 * value matches the server text (avoiding a mismatch re-render).
 */
export declare function htext(el: Node, value: unknown): Text;
/**
 * Compiler-emitted mount for a `{x as string}` text hole that sits AMONG sibling
 * nodes (the `<!>` placeholder lives at a resolved position, `posNode`).
 *
 * `posNode` is resolved with the hole-aware `child`/`sibling` walk, so during
 * hydration it is the SERVER's text node at that logical position (the server
 * rendered the value directly, with no `<!>`), even when earlier siblings are
 * components / control-flow that expanded into `<!--[-->…<!--]-->` ranges. We
 * ADOPT it. While NOT hydrating, `posNode` is the cloned template's `<!>`
 * comment, which we replace 1-for-1 with a text node (position-preserving, so
 * later sibling walks are unaffected). This is the sibling-position analog of
 * `htext` (which handles the only-child fast path).
 */
export declare function htextSwap(posNode: Node | null, value: unknown): Text;
/** Logical index-0 child: `node.firstChild` for both client and hydration. */
export declare function child<T extends Node>(node: T): Node | null;
/**
 * The n-th logical sibling after `node`. Client: plain `.nextSibling` × n.
 * Hydrating: a `<!--[-->…<!--]-->` block counts as ONE step (we jump past its
 * range), so an element/hole after a block resolves to the right server node.
 */
export declare function sibling(node: Node, n?: number): Node | null;
export declare function setText(node: Text, value: any): void;
/**
 * Set authored inline-script source without asking the HTML parser to interpret it.
 * This is the client half of the compiler's `<script dangerouslySetInnerHTML>`
 * specialization: strings containing `</script><script>...` remain one inert script
 * node instead of becoming sibling markup. Server serialization additionally escapes
 * closing/opening script tokens because it is concatenated into an HTML response.
 */
export declare function setScriptText(el: Element, value: any): void;
/** React-compatible hydration for `dangerouslySetInnerHTML`. */
export declare function setHTML(el: Element, value: any): void;
/** Complete validated write used by direct, spread, and html-only compiler paths. */
export declare function setDangerouslySetInnerHTML(el: Element, value: any): void;
/** Resolve source-ordered direct/spread raw-HTML writers and apply only the winner. */
export declare function setDangerouslySetInnerHTMLSources(el: Element, sources: readonly (readonly [isSpread: boolean, sourceOrName: unknown, value?: unknown])[], ignoreSourceChildren?: boolean): void;
/** Stamp a compiler-proven non-nullish child onto a potential raw-HTML host. */
export declare function markDangerouslySetInnerHTMLChildren(el: Element): void;
export declare function attachRef(ref: any, el: Element | FragmentInstance | null, prevTarget?: Element | FragmentInstance | null): void;
export declare const Fragment: unique symbol;
/**
 * React-19 `<Activity mode="hidden"|"visible">` sentinel. The compiler matches
 * the `Activity` tag by NAME (so this export is only needed so user imports
 * `import { Activity } from 'octane'` resolve); the runtime work happens in
 * `activityBlock`.
 */
export declare const Activity: unique symbol;
export declare class FragmentInstance {
    /**
     * Sentinel that React's test suite asserts is truthy as a sanity-check
     * that the FragmentInstance is bound to its owning Block. Named
     * `_ownerBlock` (not React's `_fragmentFiber`) because octane uses
     * Blocks, not fibers — same role.
     */
    _ownerBlock: Block;
    _startMarker: Comment;
    _endMarker: Comment;
    _destroyed: boolean;
    /**
     * Registry of listeners added via addEventListener, deduped by
     * (type, listener, capture). `null` until the first addEventListener — zero
     * per-instance cost for fragments that never use the listener API. Stored
     * (not snapshotted onto specific elements) so they can be RE-APPLIED to
     * children that mount later: `_reapply` (run after every commit) attaches
     * each stored listener to the current children, matching React's
     * future-children contract.
     */
    _listeners: Array<{
        type: string;
        listener: EventListenerOrEventListenerObject;
        options: AddEventListenerOptions | boolean | undefined;
    }> | null;
    /**
     * Observers registered via observeUsing, re-applied to future children the
     * same way as `_listeners`. `null` until the first observeUsing.
     */
    _observers: Set<{
        observe(target: Element): void;
        unobserve(target: Element): void;
    }> | null;
    /**
     * The ref currently pointed at this instance. Held here (not captured in the
     * mount closure) so the unmount cleanup detaches whatever ref is current AND
     * the compiler's update path can re-point a changed `<Fragment ref={…}>`.
     */
    _currentRef: any;
    constructor(ownerBlock: Block, startMarker: Comment, endMarker: Comment);
    _destroy(): void;
    /** Deregister from the commit re-apply set once no bindings remain. */
    _maybeDeactivate(): void;
    /**
     * Re-apply every stored listener + observer to the CURRENT direct children.
     * Run after each commit (reapplyFragmentBindings) so children that mounted
     * since the last pass pick up the fragment's bindings. addEventListener and
     * observer.observe are idempotent for an already-wired (element, binding)
     * pair, so re-applying is safe.
     */
    _reapply(): void;
    /**
     * Focus the first focusable element inside the fragment, in tree order.
     * Mirrors React FragmentInstance.focus: matches `<input>`, `<button>`,
     * `<select>`, `<textarea>`, `<a href>`, `[contenteditable="true"]`, and
     * anything with an explicit tabIndex >= 0. Skips disabled/hidden and
     * tabIndex=-1 elements. No-op if the fragment has no focusable descendants.
     */
    focus(options?: FocusOptions): void;
    /**
     * Focus the LAST focusable element inside the fragment, in tree order.
     * Same focusability rules as `focus()`.
     */
    focusLast(options?: FocusOptions): void;
    /**
     * Blur the currently-focused element if it's inside the fragment range.
     * No-op if focus is outside the fragment (matches React's "owned" scope —
     * we don't blur arbitrary other elements just because they happen to be
     * active when blur() is called).
     */
    blur(): void;
    /**
     * Attaches a listener to every DIRECT (host-Element) child of the fragment.
     * The (type, listener, capture) tuple is stored and RE-APPLIED after each
     * commit, so children inserted into the fragment LATER also get the listener
     * — React's future-children contract. Deduped by (type, listener, capture)
     * like the DOM, so repeat calls are no-ops.
     */
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean): void;
    /**
     * Removes a listener previously added via this FragmentInstance. The
     * (type, listener, options.capture) tuple must match the add call — the same
     * identity rule EventTarget.removeEventListener uses. Detaches from the
     * current children and stops re-applying it to future ones. Unmatched calls
     * are a silent no-op (DOM parity).
     */
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean): void;
    /**
     * Forwards .observe() on the supplied observer (IntersectionObserver,
     * ResizeObserver, MutationObserver, or any other with an `observe(target)`
     * signature) to every direct fragment child. Lets a single fragment ref
     * stand in for "watch this list of siblings" — react-aria's Virtualizer
     * and dnd-kit's drop-zone primitives are the canonical clients.
     */
    observeUsing(observer: {
        observe(target: Element): void;
        unobserve(target: Element): void;
    }): void;
    /**
     * Stops observing with the given observer: unobserves the current children
     * and stops re-applying it to future ones. (The walk runs even without a
     * preceding observeUsing, matching the DOM's tolerant unobserve.)
     */
    unobserveUsing(observer: {
        observe(target: Element): void;
        unobserve(target: Element): void;
    }): void;
    /**
     * Concatenates the client rects of every direct fragment child. The
     * returned array is a flat list of DOMRects in tree order — useful for
     * tooltip positioning that needs to span multiple sibling elements.
     * After unmount returns [].
     */
    getClientRects(): DOMRect[];
    /**
     * Returns the rootNode of the fragment (its document or shadow root).
     * Falls back to the start-marker's owner document if the fragment has
     * no direct children yet — keeps the contract "always returns a Node"
     * so callers don't need null-checks.
     */
    getRootNode(): Node;
    /**
     * Compares `other` against the fragment's span. The returned bitmask
     * uses the same Node constants the platform's compareDocumentPosition
     * uses, with `CONTAINED_BY` indicating that `other` lives strictly
     * between the fragment's start and end markers (in document order).
     *
     *   - other before the start marker     → DOCUMENT_POSITION_PRECEDING
     *   - other after the end marker        → DOCUMENT_POSITION_FOLLOWING
     *   - other between start & end markers → DOCUMENT_POSITION_CONTAINED_BY |
     *                                          DOCUMENT_POSITION_FOLLOWING
     *   - other not in the same tree        → DOCUMENT_POSITION_DISCONNECTED
     */
    compareDocumentPosition(other: Node): number;
    /**
     * Dispatches `event` on the fragment's parent host element so the
     * event bubbles into the surrounding handler tree the way native
     * EventTarget.dispatchEvent does. Mirrors React's FragmentInstance:
     * because the fragment itself has no DOM node, the dispatch target is
     * the parent (`return.stateNode` in React's fiber model).
     *
     * Returns false if the event's default action was cancelled — matches
     * EventTarget.dispatchEvent's return contract so callers can branch
     * on preventDefault() like they would on any other DOM dispatch.
     */
    dispatchEvent(event: Event): boolean;
    /**
     * Scrolls the fragment into view. Picks the first focusable descendant
     * if one exists (matches what tab-focus would land on), falling back to
     * the first element child otherwise. Mirrors React's FragmentInstance
     * choice — for tooltip / anchor-scroll use cases the "natural target"
     * is usually a focusable element, not an arbitrary wrapper div.
     */
    scrollIntoView(arg?: boolean | ScrollIntoViewOptions): void;
}
/**
 * Compiler-emitted helper. Creates a FragmentInstance bound to the supplied
 * marker pair + owning block, attaches the user's ref, and queues both the
 * detach + the FragmentInstance destruction on the scope's cleanup chain.
 */
export declare function mountFragmentRef(scope: Scope, startMarker: Comment, endMarker: Comment, ref: any): FragmentInstance;
export declare function setAttribute(el: Element, name: string, value: any): void;
/**
 * Compiler-only fast path for a statically named `data-*` attribute whose
 * expression is proven to be a string at authoring time. Runtime values still
 * follow the generic data-attribute contract: nullish/function/symbol remove,
 * while booleans, numbers and objects stringify. This matters when an `as
 * string` assertion or an external typed value is inaccurate at runtime. The
 * compiler restricts this helper to lowercase data names, which are applied as
 * unnamespaced attributes in HTML, SVG, and MathML, so it needs none of the
 * generic attribute alias/property routing tables. Hydration still goes through
 * the capability boundary so mismatch recovery and `suppressHydrationWarning`
 * remain identical to setAttribute.
 */
export declare function setStringData(el: Element, name: string, value: unknown): void;
import { normalizeClass } from './css.js';
export { normalizeClass };
export declare function setClassName(el: Element, value: unknown): void;
export declare function setClassAttr(el: Element, value: unknown): void;
export declare function setStyle(el: HTMLElement | SVGElement, value: any, prev: any): void;
/** Snapshot a JSX spread with own-enumerable Object.assign semantics. */
export declare function snapshotSpread(value: unknown): Record<string, unknown> | null;
type HostPropSource = readonly [isSpread: boolean, sourceOrName: unknown, value?: unknown];
/**
 * Resolve a spread-bearing compiled host's complete prop set before touching
 * the DOM. JSX spread merging is last-writer-wins, but aliases such as
 * className/class, htmlFor/for, and xlinkHref/xlink:href target one native
 * property. Canonical identities ensure a vanished earlier source cannot
 * remove an unchanged later winner, and hydration compares only the final
 * client value against the final server value.
 */
export declare function setHostPropSources(el: Element, sources: readonly HostPropSource[], prev: Record<string, unknown> | undefined, scope: Scope, hasNestedChildren?: boolean): Record<string, unknown>;
export declare function setSpread(el: Element, value: any, prev: any, mountScope?: Scope, skipDangerouslySetInnerHTML?: boolean, skipFormControls?: boolean): void;
export declare function headBlock(scope: Scope, slot: number, key: string, tag: string, attrs: Record<string, any> | null, text: unknown): void;
interface NamespaceHeadProps {
    headKey: string;
    tag: string;
    attrs: Record<string, any> | null;
    text: unknown;
}
/** @internal Compiler-generated. */
export declare function namespaceHead(props: NamespaceHeadProps, scope: Scope): ElementDescriptor | null;
/** @internal Compiler-generated descriptor factory for namespaceHead. */
export declare function namespaceHeadElement(headKey: string, tag: string, attrs: Record<string, any> | null, text: unknown, authoredKey?: unknown): ElementDescriptor;
export declare function injectStyle(id: string, css: string): void;
interface HandlerBundle {
    fn: (...args: any[]) => any;
    args: any[];
}
export declare function evt0(el: Element, key: string, fn: any): HandlerBundle;
export declare function evt0u(d: HandlerBundle, fn: any): void;
export declare function evt1(el: Element, key: string, fn: any, a0: any): HandlerBundle;
export declare function evt1u(d: HandlerBundle, fn: any, a0: any): void;
export declare function evt2(el: Element, key: string, fn: any, a0: any, a1: any): HandlerBundle;
export declare function evt2u(d: HandlerBundle, fn: any, a0: any, a1: any): void;
export declare function evtN(el: Element, key: string, fn: any, args: any[]): HandlerBundle;
export declare function evtNu(d: HandlerBundle, fn: any, args: any[]): void;
export declare function delegateEvents(eventNames: string[]): void;
export declare function delegateCaptureEvents(eventNames: string[]): void;
export interface FormStatus {
    pending: boolean;
    data: FormData | null;
    method: string;
    action: ((formData: FormData) => unknown) | string | null;
}
/**
 * React DOM's `requestFormReset(form)` — schedule a reset of the form's
 * uncontrolled fields, tied to the enclosing transition/action: the reset is
 * deferred until the action window closes (every in-flight async transition has
 * settled), matching React's "reset when the action's transition commits". This
 * is the manual companion to the automatic reset a plain `<form action={fn}>`
 * gets on success — use it from `onSubmit` + `startTransition` flows or
 * `useActionState` forms that DO want a reset.
 *
 * Called outside any transition or action, React logs an error; octane does the
 * same and applies the reset immediately (the least surprising fallback).
 */
export declare function requestFormReset(form: HTMLFormElement): void;
/**
 * Compiler-emitted binding for `<form action={fn}>` / `<button formAction={fn}>`.
 * A FUNCTION value wires submit interception (stored on the element as
 * `$$formAction`, with the form gaining a delegated `$$submit` handler once);
 * a string/null value falls back to the native attribute so ordinary form posts
 * still work. `prev` lets the update path clean up when switching function→string.
 */
export declare function setFormAction(el: HTMLFormElement | HTMLButtonElement | HTMLInputElement, name: string, value: unknown, prev: unknown): void;
/**
 * Compiler-emitted binding for `autoFocus` (React parity): never an
 * attribute — the element is focused ONCE, in the commit phase of its mount
 * (after the render pass built the tree, before layout effects — so a layout
 * effect that moves focus still wins, like React's commitMount ordering).
 * Later updates are ignored (React treats autoFocus as mount-only).
 */
export declare function setAutoFocus(el: Element, value: unknown): void;
/**
 * Compiler-emitted binding for a controlled `value` on <input>/<textarea>
 * (spread/de-opt/legacy-compiled writes are routed here by setAttribute).
 * React semantics: the prop DRIVES the DOM property; a nullish value means
 * uncontrolled (leave the DOM alone). The value ATTRIBUTE mirrors the prop
 * (React's attribute-syncing cascade: value, else defaultValue) — an
 * attribute write never clobbers what the user typed, and it keeps SSR
 * output, form.reset() baselines, and differential byte-compares aligned.
 */
export declare function setValue(el: Element, value: unknown): void;
export declare function setChecked(el: Element, value: unknown): void;
/**
 * Compiler-only checked binding for a statically-known checkbox/radio whose
 * type cannot be changed by a spread. It keeps the complete controlled record
 * and event restoration contract, but cannot need text-composition listeners.
 */
export declare function setCheckedCheckable(el: Element, value: unknown): void;
/**
 * Compiler-emitted binding for a controlled `value` on <select> (single and
 * `multiple`). The target is stored and projected onto the options both
 * IMMEDIATELY (idempotent) and at commit — binding mounts run before the same
 * render's @for/@if constructs, so the commit pass is what sees @for-built
 * options (React resolves selects post-mount the same way).
 */
export declare function setSelectValue(el: Element, value: unknown): void;
/**
 * Compiler-emitted binding for `defaultValue` — the uncontrolled escape
 * hatch. Writes the DEFAULT (the value attribute / textarea text content /
 * option defaultSelected), never the live value: a dirty control keeps what
 * the user typed. Re-synced on updates (React parity; attribute-only).
 */
export declare function setDefaultValue(el: Element, value: unknown): void;
/**
 * Compiler-only defaultValue binding for a statically-known input/textarea
 * with no value writer or spread. The element is necessarily uncontrolled, so
 * it needs neither a controlled-state record nor edit/composition listeners.
 */
export declare function setDefaultValueUncontrolled(el: Element, value: unknown): void;
/** Compiler-emitted binding for `defaultChecked` (uncontrolled checkables). */
export declare function setDefaultChecked(el: Element, value: unknown): void;
/**
 * Apply the final form-control prop set for a compiled host containing JSX
 * spreads. Each direct source is `[false, name, value]`; each snapshotted
 * spread is `[true, object]`. Resolving all sources first makes the controlled
 * cascades independent of object-key order (`multiple` before select `value`,
 * controlled value before its default fallback) while the compiler-owned
 * source bindings preserve authored evaluation order and single getter reads.
 */
export declare function setFormControlSources(el: Element, sources: ReadonlyArray<readonly [boolean, unknown, unknown?]>): void;
/**
 * Mount `body` into `target` (a foreign DOM element), as a child of the
 * current Block in the Block tree. Re-rendering the enclosing Block re-runs
 * the portal body in place. Unmounting the enclosing Block tears the portal
 * down and removes its DOM from `target`.
 */
export declare function portal(parentScope: Scope, slotKey: number, target: Element, body: ComponentBody, props: any, host?: Node, env?: any[]): void;
/**
 * `createPortal(children, target, props?)`. The first two arguments mirror ReactDOM's
 * `createPortal(children, container)`; the OPTIONAL THIRD argument is Octane-specific
 * `props` for the portal wrapper — NOT ReactDOM's `key`. That third slot is an
 * intentional divergence from React (Octane has no `key`-as-third-arg portal form). The
 * compiler recognises `{createPortal(...)}` at JSX child position and lowers it to a
 * direct `portal(...)` runtime call — no descriptor allocation on the hot path. This
 * function exists so non-JSX call sites (storing in a variable, passing through props,
 * etc.) still produce something the runtime can dispatch on.
 */
declare const PORTAL_TAG: unique symbol;
export interface PortalDescriptor {
    $$kind: typeof PORTAL_TAG;
    body: ComponentBody | ElementDescriptor | unknown;
    target: Element;
    props: any;
}
export declare function createPortal(body: ComponentBody | ElementDescriptor | unknown, target: Element, props?: any): PortalDescriptor;
declare const ELEMENT_TAG: unique symbol;
export interface ElementDescriptor<P = any> {
    $$kind: typeof ELEMENT_TAG;
    type: ComponentBody<P> | string | typeof Fragment;
    props: P;
    key: any;
    ref: any;
    children: any;
}
export declare function createElement<P>(type: ComponentBody<P> | string | typeof Fragment, props?: P, ...children: any[]): ElementDescriptor<P>;
/** True if `v` is an element from `createElement` / JSX-at-value (React's `isValidElement`). */
export declare function isValidElement(v: any): v is ElementDescriptor;
/**
 * `cloneElement(element, config?, ...children)` — a new descriptor with `element`'s
 * props shallow-merged under `config` (config wins), `key` overridden by `config.key`,
 * and children replaced by any passed positionally (else the original children are kept).
 * `ref` is a normal prop here (octane is ref-as-prop), so it merges like any other.
 */
export declare function cloneElement<P>(element: ElementDescriptor<P>, config?: any, ...children: any[]): ElementDescriptor<P>;
export declare const Children: {
    /** Iterate children, flattening collections; empties are visited as `null`. */
    forEach(children: any, fn: (child: any, index: number) => void, context?: any): void;
    /** Map children to a flat, React-keyed array; empty results are dropped. */
    map<T>(children: any, fn: (child: any, index: number) => T, context?: any): T[] | null | undefined;
    /** Number of children `map`/`forEach` would visit (empties included, like React). */
    count(children: any): number;
    /** Flatten children into a React-keyed array, dropping empty entries. */
    toArray(children: any): any[];
    /** Assert `children` is a single element and return it (`React.Children.only`). */
    only<T>(children: T): T;
};
/** Generic component call site: reconcile any JavaScript return value. */
export declare function componentSlot(parentScope: Scope, slotKey: number, domParent: Node, comp: ComponentBody | string, props: any, anchor?: Node | null, key?: any, singleRoot?: boolean | 2, inherit?: boolean, hasKey?: boolean): void;
/** Compiler-proven `@{}` component call site: the body has no value return. */
export declare function componentSlotVoid(parentScope: Scope, slotKey: number, domParent: Node, comp: ComponentBody | string, props: any, anchor?: Node | null, key?: any, singleRoot?: boolean | 2, inherit?: boolean, hasKey?: boolean): void;
export declare function positionalChildren(children: any[]): any[];
export declare function hostComponent(scope: Scope, slot: number, tag: string, props: Record<string, any> | null, childrenBody?: ComponentBody | null, anchor?: Node | null): Element;
export declare function childSlot(parentScope: Scope, slotKey: number, domParent: Node, value: unknown, anchor?: Node | null, ownEnd?: boolean, ownsHost?: Element, compactable?: boolean, includeKeyedSingle?: boolean): void;
export declare function textSlot(parentScope: Scope, slotKey: number, domParent: Node, value: unknown, anchor?: Node | null, ownEnd?: boolean, compactable?: boolean): void;
export declare function textHole(parentScope: Scope, slotKey: number, domParent: Node, value: unknown, anchor?: Node | null, ownEnd?: boolean, compactable?: boolean): Text | null;
export declare function childTextHole(parentScope: Scope, slotKey: number, domParent: Node, value: unknown, cachedNode: Text | null): Text | null;
/**
 * Compiler ABI for a flat output-cache hit. Context consumers are normally
 * reached while their parent slot reconciles; a cache hit intentionally skips
 * that reconciliation, so an intervening Provider commit must refresh the
 * slot's existing Block(s) directly. The common path is one numeric equality
 * check. `previous === undefined` snapshots the epoch after a cache miss
 * without refreshing the freshly-rendered subtree.
 * @internal
 */
export declare function compilerCacheContext(scope: Scope, slotKey: number, previous: number | undefined): number;
/**
 * `memo(Component)` — React-shape HOC. Returns a wrapper component that
 * skips its body when the incoming props are shallow-equal to the committed
 * ones. Children inside the wrapped body still mount/update normally on the
 * first render and any non-skip render. Pair with `useCallback` /
 * `useMemo` on the parent so handler + computed prop refs stay stable across
 * renders that don't conceptually change the child's view.
 *
 * An optional `arePropsEqual(prevProps, nextProps)` comparator mirrors
 * React.memo's second argument: return `true` to skip the render (props are
 * "equal"), `false` to re-render. When omitted, a shallow Object.is comparison
 * of own enumerable keys is used.
 */
export declare function memo<P>(component: ComponentBody<P>, arePropsEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean): ComponentBody<P>;
export declare const HMR: unique symbol;
export declare function hmr<P>(fn: ComponentBody<P>): ComponentBody<P>;
export declare function setTransitionFallbackTimeout(ms: number): void;
export declare function getTransitionFallbackTimeout(): number;
export declare function tryBlock(parentScope: Scope, slotKey: number, domParent: Node, tryBody: ComponentBody, catchBody: ComponentBody | null, pendingBody: ComponentBody | null, anchor?: Node | null, env?: any[], propagateSuspense?: boolean): void;
export declare function startTransition(fn: () => void | Promise<unknown>): void;
export declare function useTransition(slot?: symbol): [boolean, (fn: () => void | Promise<unknown>) => void];
export declare function useActionState<S>(action: (prevState: S, payload: any) => S | Promise<S>, initialState: S, permalinkOrSlot?: string | symbol, slot?: symbol): [S, (payload?: any) => void, boolean];
export declare function useFormStatus(slot?: symbol): FormStatus;
export declare function useOptimistic<S, V = S>(passthrough: S, updateFnOrSlot?: ((state: S, value: V) => S) | symbol, slot?: symbol): [S, (value: V) => void];
export declare function useDeferredValue<T>(value: T, ...rest: any[]): T;
export declare function ifBlock(parentScope: Scope, slotKey: number, domParent: Node, cond: boolean, thenBody: ComponentBody | null, elseBody: ComponentBody | null, anchor?: Node | null, env?: any[]): void;
export declare function activityBlock(parentScope: Scope, slotKey: number, domParent: Node, mode: 'visible' | 'hidden' | string, body: ComponentBody, anchor?: Node | null, env?: any[]): void;
export declare function switchBlock(parentScope: Scope, slotKey: number, domParent: Node, discriminant: any, cases: ReadonlyArray<readonly [test: any, body: ComponentBody]>, defaultBody: ComponentBody | null, anchor?: Node | null, env?: any[]): void;
interface ForSlot {
    __kind: 'forBlockSlot';
    start: Comment;
    end: Comment;
    items: Map<any, Block>;
    head: Block | null;
    tail: Block | null;
    size: number;
    cachedDeps: any[] | null;
    emptyBlock: Block | null;
    env: any[] | undefined;
    adopt: Array<{
        key: any;
        node: Node;
    }> | null;
}
export declare function forBlock<T>(parentScope: Scope, slotKey: number, domParent: Node, items: ArrayLike<T>, getKey: (item: T, index: number) => any, itemBody: (item: T, scope: Scope) => void, flags?: number, deps?: any[], emptyBody?: ComponentBody | null, anchor?: Node | null, ownEnd?: boolean): void;
export interface Root {
    /**
     * Render into this root. Two forms:
     *  - React-style:   `root.render(<App foo={x}/>)` — a single element descriptor
     *    (the compiler lowers the JSX to `createElement(App, {foo: x})`).
     *  - Body + props:  `root.render(App, { foo: x })` — the original octane
     *    form, kept for direct (non-JSX) callers and existing test helpers.
     * Re-rendering with the same component (`type`/body) updates props in place;
     * a different component tears down and remounts.
     */
    render(element: ElementDescriptor | string | number | bigint | boolean | null | undefined | readonly unknown[]): void;
    render(body: ComponentBody, props?: any): void;
    unmount(): void;
}
export interface RootOptions {
    /**
     * Caller-controlled useId prefix. createRoot composes it with an automatic
     * client-root namespace; hydrateRoot uses it verbatim to match server output.
     */
    identifierPrefix?: string;
}
export declare function createRoot(container: Element, options?: RootOptions): Root;
/** Compiler-only root for a statically proven void `@{}` entry component. */
export declare function __createVoidRoot(container: Element, options?: RootOptions): Root;
/**
 * Hydrate a server-rendered container and return a live {@link Root} — the
 * React-18 `hydrateRoot(container, element)` shape (container FIRST). Instead of
 * clearing the container and cloning fresh DOM, the compiled mount ADOPTS the
 * existing server DOM: `clone()` returns the server root, `htext()` adopts
 * server text nodes, and event handlers / update bindings are stamped on the
 * adopted nodes (active hydration capability, see clone/htext). The seeded prev-values make
 * the first update a no-op when the client matches the server (no mismatch
 * re-render).
 *
 * Hydration runs ONCE, here on creation. The returned root's `.render(...)` is a
 * normal (non-hydrating) client render against the block mounted here: the same
 * component updates props in place on the adopted DOM, a different component
 * tears down and remounts.
 */
export declare function hydrateRoot(container: Element, element: ElementDescriptor, options?: RootOptions): Root;
export declare function hydrateRoot(container: Element, body: ComponentBody, props?: any, options?: RootOptions): Root;
/** React DOM `preload(href, {as, …})` — `<link rel="preload">`. */
export declare function preload(href: string, options: {
    as: string;
} & Record<string, unknown>): void;
/** React DOM `preinit(href, {as: 'style'|'script', …})` — executes/applies the resource. */
export declare function preinit(href: string, options: {
    as: string;
} & Record<string, unknown>): void;
/** React DOM `preconnect(href, {crossOrigin?})` — `<link rel="preconnect">`. */
export declare function preconnect(href: string, options?: {
    crossOrigin?: string;
}): void;
/** React DOM `prefetchDNS(href)` — `<link rel="dns-prefetch">`. */
export declare function prefetchDNS(href: string): void;
