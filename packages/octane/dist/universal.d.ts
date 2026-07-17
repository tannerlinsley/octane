/**
 * Experimental host-neutral renderer core.
 *
 * This module deliberately does not generalise the DOM runtime. Compiled
 * universal components produce immutable host plans plus dynamic values. A
 * root materialises those plans into core-owned logical records, stages one
 * ordered host batch, and publishes topology/refs/effects only after the
 * driver accepts that batch.
 *
 * @experimental This subpath is an internal-first renderer proving surface and
 * may change in patch releases until real Three and transported renderers
 * validate the protocol.
 */
import { type Context, type Scope, createContext as createDomContext } from './runtime.js';
declare const UNIVERSAL_PLAN: unique symbol;
declare const UNIVERSAL_VALUE: unique symbol;
declare const UNIVERSAL_LIST: unique symbol;
declare const UNIVERSAL_COMPONENT: unique symbol;
declare const UNIVERSAL_BOUNDARY: unique symbol;
declare const UNIVERSAL_COMPONENT_VALUE: unique symbol;
declare const UNIVERSAL_PROPS: unique symbol;
declare const UNIVERSAL_CHILDREN: unique symbol;
declare const UNIVERSAL_IF: unique symbol;
declare const UNIVERSAL_SWITCH: unique symbol;
declare const UNIVERSAL_FOR: unique symbol;
declare const UNIVERSAL_TRY: unique symbol;
declare const UNIVERSAL_CONTEXT: unique symbol;
declare const UNIVERSAL_ACTIVITY: unique symbol;
declare const UNIVERSAL_KEYED: unique symbol;
declare const UNIVERSAL_PORTAL: unique symbol;
declare const UNIVERSAL_RENDERER_REGION: unique symbol;
export type UniversalKey = string | number | symbol | bigint;
export interface UniversalRendererMetadata {
    readonly id: string;
    readonly module?: string;
    readonly target: 'universal';
}
export interface UniversalBoundaryMetadata {
    readonly id: string;
    readonly ownerRenderer: string;
    readonly childRenderer: string;
    readonly childrenProp: string;
}
export interface UniversalHostPlan {
    readonly kind: 'host';
    readonly type: string;
    readonly props?: Readonly<Record<string, unknown>>;
    readonly bindings?: readonly (readonly [name: string, slot: number])[];
    /** Ordered host/component prop program produced by `universalProps`. */
    readonly propsSlot?: number;
    readonly children?: readonly UniversalPlanNode[];
}
export interface UniversalTextPlan {
    readonly kind: 'text';
    readonly value?: string;
    readonly slot?: number;
}
export interface UniversalSlotPlan {
    readonly kind: 'slot';
    readonly slot: number;
}
export interface UniversalRangePlan {
    readonly kind: 'range';
    readonly children: readonly UniversalPlanNode[];
}
/** A component node is optional compiler sugar; dynamic component descriptors are equivalent. */
export interface UniversalComponentPlan {
    readonly kind: 'component';
    readonly renderer: string;
    readonly component?: UniversalComponent<any>;
    readonly componentSlot?: number;
    readonly propsSlot?: number;
    readonly keySlot?: number;
    readonly children?: readonly UniversalPlanNode[];
}
export interface UniversalIfPlan {
    readonly kind: 'if';
    readonly conditionSlot: number;
    readonly then: UniversalPlanNode;
    readonly else?: UniversalPlanNode;
}
export interface UniversalSwitchPlan {
    readonly kind: 'switch';
    readonly valueSlot: number;
    readonly cases: readonly (readonly [unknown, UniversalPlanNode])[];
    readonly default?: UniversalPlanNode;
}
export type UniversalPlanNode = UniversalHostPlan | UniversalTextPlan | UniversalSlotPlan | UniversalRangePlan | UniversalComponentPlan | UniversalIfPlan | UniversalSwitchPlan;
export interface UniversalPlan {
    readonly $$kind: typeof UNIVERSAL_PLAN;
    readonly renderer: string;
    readonly root: UniversalPlanNode;
}
export interface UniversalPlanValue {
    readonly $$kind: typeof UNIVERSAL_VALUE;
    readonly plan: UniversalPlan;
    readonly values: readonly unknown[];
    readonly key: UniversalKey | null;
}
export interface UniversalListValue {
    readonly $$kind: typeof UNIVERSAL_LIST;
    readonly values: readonly UniversalRenderable[];
    readonly empty?: UniversalRenderable;
}
export interface UniversalPortalValue {
    readonly $$kind: typeof UNIVERSAL_PORTAL;
    readonly children: UniversalRenderable;
    readonly target: unknown;
}
export type UniversalRenderable = UniversalPlanValue | UniversalListValue | UniversalPortalValue | UniversalComponentValue | UniversalChildrenValue | UniversalIfValue | UniversalSwitchValue | UniversalForValue | UniversalTryValue | UniversalContextValue | UniversalActivityValue | UniversalKeyedValue | readonly UniversalRenderable[] | string | number | bigint | boolean | null | undefined;
export type UniversalComponent<P = any> = ((props: P, context: UniversalRenderContext) => UniversalRenderable) & {
    readonly [UNIVERSAL_COMPONENT]: UniversalRendererMetadata;
};
export type UniversalPropEntry = readonly ['set', name: string, value: unknown] | readonly ['spread', value: unknown];
export interface UniversalPropsValue {
    readonly $$kind: typeof UNIVERSAL_PROPS;
    readonly props: Readonly<Record<string, unknown>>;
    readonly key: unknown;
    readonly hasKey: boolean;
    readonly hasChildren: boolean;
}
export interface UniversalComponentValue {
    readonly $$kind: typeof UNIVERSAL_COMPONENT_VALUE;
    readonly renderer: string;
    readonly component: UniversalComponent<any>;
    readonly props: UniversalPropsValue | Readonly<Record<string, unknown>> | null;
    readonly key: unknown;
    readonly hasKey: boolean;
}
export interface UniversalChildrenValue {
    readonly $$kind: typeof UNIVERSAL_CHILDREN;
    readonly renderer: string;
    readonly render: () => UniversalRenderable;
}
export interface UniversalIfValue {
    readonly $$kind: typeof UNIVERSAL_IF;
    readonly condition: boolean;
    readonly then: () => UniversalRenderable;
    readonly else: (() => UniversalRenderable) | null;
}
export interface UniversalSwitchValue {
    readonly $$kind: typeof UNIVERSAL_SWITCH;
    readonly value: unknown;
    readonly cases: readonly (readonly [unknown, () => UniversalRenderable])[];
    readonly default: (() => UniversalRenderable) | null;
}
export interface UniversalForValue {
    readonly $$kind: typeof UNIVERSAL_FOR;
    readonly items: Iterable<unknown>;
    readonly key: (item: any, index: number) => UniversalKey;
    readonly render: (item: any, index: number) => UniversalRenderable;
    readonly empty: (() => UniversalRenderable) | null;
}
export interface UniversalTryValue {
    readonly $$kind: typeof UNIVERSAL_TRY;
    readonly body: () => UniversalRenderable;
    readonly pending: (() => UniversalRenderable) | null;
    readonly catch: ((error: unknown, reset: () => void) => UniversalRenderable) | null;
}
export interface UniversalContextValue {
    readonly $$kind: typeof UNIVERSAL_CONTEXT;
    readonly context: Context<any>;
    readonly value: unknown;
    readonly children: UniversalRenderable | (() => UniversalRenderable);
}
export interface UniversalActivityValue {
    readonly $$kind: typeof UNIVERSAL_ACTIVITY;
    readonly mode: 'visible' | 'hidden';
    readonly body: () => UniversalRenderable;
}
export interface UniversalKeyedValue {
    readonly $$kind: typeof UNIVERSAL_KEYED;
    readonly key: UniversalKey;
    readonly value: UniversalRenderable;
}
/**
 * Opaque payload handed through a component prop whose contents are owned by
 * another renderer. The compiler keeps `component` stable and places
 * render-time captures in `props`, so crossing a renderer boundary does not
 * reset the child root on every owner render.
 */
export interface RendererRegion<P = any> {
    readonly $$kind: typeof UNIVERSAL_RENDERER_REGION;
    readonly ownerRenderer: string;
    readonly childRenderer: string;
    readonly component: unknown;
    readonly props: P;
}
export interface UniversalRenderContext {
    readonly renderer: string;
    readContext<T>(context: Context<T>): T;
    insertionEffect(create: () => void | (() => void), deps?: readonly unknown[]): void;
    layoutEffect(create: () => void | (() => void), deps?: readonly unknown[]): void;
    effect(create: () => void | (() => void), deps?: readonly unknown[]): void;
}
export type UniversalTextPolicy = 'reject' | 'ignore' | 'host';
export interface UniversalHostCapabilities {
    /** How primitive text children are represented. Absence defaults to `reject`. */
    readonly text?: UniversalTextPolicy;
    /** Allows renderer-local callbacks whose function values never enter a host batch. */
    readonly localHostCallbacks?: boolean;
    /** Allows core-owned retained trees to change physical host visibility. */
    readonly visibility?: boolean;
}
export interface UniversalResourceHandle {
    readonly $$kind: 'octane.universal.resource';
    readonly renderer: string;
    readonly root: number;
    readonly id: string | number;
}
/** Opaque, root-scoped placement parent for a renderer-owned portal target. */
export interface UniversalPortalTargetHandle {
    readonly $$kind: 'octane.universal.portal-target';
    readonly renderer: string;
    readonly root: number;
    readonly id: string | number;
}
export interface UniversalPortalTargetRegistration {
    readonly handle: UniversalPortalTargetHandle;
    release(): void;
}
export interface UniversalPortalTargetContext<Container = unknown> {
    readonly container: Container;
    readonly renderer: string;
    readonly target: unknown;
    readonly transported: boolean;
    createPortalTargetHandle(id: string | number): UniversalPortalTargetHandle;
}
export interface UniversalPortalCapability<Container = unknown> {
    prepareTarget(context: UniversalPortalTargetContext<Container>): UniversalPortalTargetRegistration;
}
export type UniversalHostParent = number | null | UniversalPortalTargetHandle;
export type UniversalSerializableValue = null | undefined | string | number | bigint | boolean | readonly UniversalSerializableValue[] | Readonly<{
    [name: string]: UniversalSerializableValue;
}>;
export type UniversalHostPropEncoding = {
    readonly kind: 'value';
    readonly value: UniversalSerializableValue;
} | {
    readonly kind: 'resource';
    readonly handle: UniversalResourceHandle;
} | {
    readonly kind: 'unsupported';
    readonly reason?: string;
};
export interface UniversalHostPropCodecContext<Container = unknown> {
    readonly container: Container;
    readonly renderer: string;
    readonly hostType: string;
    readonly name: string;
    readonly value: unknown;
    createResourceHandle(id: string | number): UniversalResourceHandle;
}
export interface UniversalHostPropCodec<Container = unknown> {
    encode(context: UniversalHostPropCodecContext<Container>): UniversalHostPropEncoding;
}
export interface UniversalHostCallbackDefinition {
    readonly type: string;
}
export interface UniversalHostCallbackCapability {
    classify(name: string, value: unknown): UniversalHostCallbackDefinition | null;
}
export type UniversalHostUpdateKind = 'update' | 'recreate';
export interface UniversalHostUpdateCapability {
    classify(type: string, previous: Readonly<Record<string, unknown>>, next: Readonly<Record<string, unknown>>): UniversalHostUpdateKind;
}
export type UniversalHostCommand = {
    readonly op: 'create';
    readonly id: number;
    readonly type: string;
    readonly props: Readonly<Record<string, unknown>>;
} | {
    readonly op: 'update';
    readonly id: number;
    readonly props: Readonly<Record<string, unknown>>;
} | {
    readonly op: 'recreate';
    readonly id: number;
    readonly type: string;
    readonly props: Readonly<Record<string, unknown>>;
} | {
    readonly op: 'insert' | 'move';
    readonly parent: UniversalHostParent;
    readonly id: number;
    readonly before: number | null;
} | {
    readonly op: 'event';
    readonly id: number;
    readonly type: string;
    readonly listener: UniversalEventListenerDescriptor | null;
} | {
    readonly op: 'lifecycle' | 'local-callback';
    readonly id: number;
    readonly type: string;
    readonly listener: UniversalListenerDescriptor | null;
} | {
    readonly op: 'visibility';
    readonly id: number;
    readonly state: 'hidden' | 'visible';
} | {
    readonly op: 'remove';
    readonly parent: UniversalHostParent;
    readonly id: number;
} | {
    readonly op: 'destroy';
    readonly id: number;
};
export type UniversalEventPriority = 'discrete' | 'continuous' | 'default';
export interface UniversalListenerDescriptor {
    readonly id: number;
}
/** Serializable listener identity carried by a host batch. */
export interface UniversalEventListenerDescriptor extends UniversalListenerDescriptor {
    readonly priority: UniversalEventPriority;
}
export interface UniversalEventDefinition {
    readonly type: string;
    readonly priority?: UniversalEventPriority;
}
export interface UniversalEventCapability {
    /** Return null for ordinary callback/property names owned by the renderer. */
    classify(name: string): UniversalEventDefinition | null;
}
export interface UniversalHostBatch {
    readonly renderer: string;
    readonly version: number;
    readonly commands: readonly UniversalHostCommand[];
}
export interface UniversalHostCommitContext {
    /** Invoke a renderer-local callback after its owner table has been accepted. */
    invokeLocalCallback(listener: number, args: readonly unknown[]): unknown;
}
export interface UniversalPreparedHostBatch {
    /** Apply the already-validated physical host mutation. This marks the batch accepted. */
    apply(): void;
    /** Run renderer-local callbacks after logical owner/listener publication. */
    afterAccept?(): void;
    /** Release every unpublished resource staged by preparation exactly once. */
    abort(): void;
}
export interface UniversalHostDriver<Container = unknown, PublicInstance = unknown> {
    readonly id: string;
    readonly capabilities?: UniversalHostCapabilities;
    readonly events?: UniversalEventCapability;
    readonly lifecycles?: UniversalHostCallbackCapability;
    readonly localCallbacks?: UniversalHostCallbackCapability;
    readonly props?: UniversalHostPropCodec<Container>;
    readonly updates?: UniversalHostUpdateCapability;
    readonly portals?: UniversalPortalCapability<Container>;
    /** Validate and stage a batch without mutating the public host. */
    prepareBatch(container: Container, batch: UniversalHostBatch, context: UniversalHostCommitContext): UniversalPreparedHostBatch;
    getPublicInstance(container: Container, id: number): PublicInstance | null;
}
export interface UniversalCommitTransport<Container = unknown> {
    prepareBatch(container: Container, batch: UniversalHostBatch, prepare: (batch: UniversalHostBatch) => UniversalPreparedHostBatch): UniversalPreparedHostBatch;
}
export interface UniversalRootOptions<Container> {
    transport?: UniversalCommitTransport<Container>;
}
export interface UniversalTransaction {
    readonly status: 'prepared' | 'committed' | 'aborted';
    readonly batch: UniversalHostBatch;
    commit(): void;
    abort(): void;
}
export interface UniversalSuspendedAttempt {
    readonly status: 'suspended' | 'aborted';
    readonly thenable: PromiseLike<unknown>;
    abort(): void;
}
export type UniversalPreparedAttempt = UniversalTransaction | UniversalSuspendedAttempt;
export interface UniversalRoot<P = any> {
    readonly renderer: string;
    prepare(component: UniversalComponent<P>, props: P): UniversalPreparedAttempt;
    render(component: UniversalComponent<P>, props: P): UniversalPreparedAttempt;
    eventScope<T>(priority: UniversalEventPriority, run: () => T): T;
    dispatchEvent(listener: number, payload: unknown): unknown;
    unmount(): void;
}
export declare function universalPlan(renderer: string, root: UniversalPlanNode): UniversalPlan;
export declare function universalValue(plan: UniversalPlan, values?: readonly unknown[], key?: UniversalKey | null): UniversalPlanValue;
export declare function universalKey(key: UniversalKey, value: UniversalRenderable): UniversalRenderable;
export declare function universalList<T>(items: Iterable<T>, render: (item: T, index: number) => UniversalRenderable, empty?: UniversalRenderable): UniversalListValue;
export declare function universalProps(entries: readonly UniversalPropEntry[], children?: unknown): UniversalPropsValue;
export declare function universalComponent(renderer: string, component: UniversalComponent<any>, props?: UniversalPropsValue | Readonly<Record<string, unknown>> | null, key?: unknown): UniversalComponentValue;
export declare function universalChildren(renderer: string, render: () => UniversalRenderable): UniversalChildrenValue;
export declare function universalIf(condition: unknown, then: () => UniversalRenderable, otherwise?: (() => UniversalRenderable) | null): UniversalIfValue;
export declare function universalSwitch(value: unknown, cases: readonly (readonly [unknown, () => UniversalRenderable])[], defaultValue?: (() => UniversalRenderable) | null): UniversalSwitchValue;
export declare function universalFor<T>(items: Iterable<T>, key: (item: T, index: number) => UniversalKey, render: (item: T, index: number) => UniversalRenderable, empty?: (() => UniversalRenderable) | null): UniversalForValue;
export declare function universalTry(body: () => UniversalRenderable, pending?: (() => UniversalRenderable) | null, catchBody?: ((error: unknown, reset: () => void) => UniversalRenderable) | null): UniversalTryValue;
export declare function universalContext<T>(context: Context<T>, value: T, children: UniversalRenderable | (() => UniversalRenderable)): UniversalContextValue;
export declare function universalActivity(mode: 'visible' | 'hidden' | string, body: () => UniversalRenderable): UniversalActivityValue;
/** Compiler/runtime ABI for an explicitly renderer-owned component prop. */
export declare function rendererRegion<P>(ownerRenderer: string, childRenderer: string, component: unknown, props: P): RendererRegion<P>;
export declare function isRendererRegion(value: unknown): value is RendererRegion;
export declare function defineUniversalComponent<P>(renderer: string, render: (props: P, context: UniversalRenderContext) => UniversalRenderable, metadata?: {
    module?: string;
}): UniversalComponent<P>;
export declare const UNIVERSAL_HMR: unique symbol;
export declare function hmrUniversalComponent<P>(renderer: string, component: UniversalComponent<P>): UniversalComponent<P>;
export declare function hookSlots(count: number): number;
export declare function withSlot<T>(slot: unknown, fn: (...args: any[]) => T, ...args: any[]): T;
export declare function useState<T>(initial: T | (() => T), slot?: unknown): [T, (value: T | ((previous: T) => T)) => void, () => T];
export declare const __useStateWithGetter: typeof useState;
export declare function useReducer<S, A, I = S>(reducer: (state: S, action: A) => S, initialArg: I, initOrSlot?: ((value: I) => S) | unknown, maybeSlot?: unknown): [S, (action: A) => void, () => S];
export declare const __useReducerWithGetter: typeof useReducer;
export declare function useInsertionEffect(create: () => void | (() => void), deps?: readonly unknown[] | null, slot?: unknown): void;
export declare function useLayoutEffect(create: () => void | (() => void), deps?: readonly unknown[] | null, slot?: unknown): void;
export declare function useEffect(create: () => void | (() => void), deps?: readonly unknown[] | null, slot?: unknown): void;
export declare function useMemo<T>(compute: () => T, deps?: readonly unknown[] | null, slot?: unknown): T;
export declare function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: readonly unknown[] | null, slot?: unknown): T;
export declare function useRef<T>(initial: T, slot?: unknown): {
    current: T;
};
export declare function useId(slot?: unknown): string;
export declare function useSyncExternalStore<T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T): T;
export declare function useSyncExternalStore<T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T, getServerSnapshot: () => T): T;
export declare function useSyncExternalStore<T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T, getServerSnapshot: (() => T) | undefined, slot: unknown): T;
export declare function useDeferredValue<T>(value: T, _initialValue?: T, _slot?: unknown): T;
export declare function useTransition(_slot?: unknown): [boolean, typeof startTransition];
export declare function useActionState<State, Payload>(action: (previousState: State, payload: Payload) => State | Promise<State>, initialState: State, _permalinkOrSlot?: string | unknown, maybeSlot?: unknown): [State, (payload: Payload) => void, boolean];
export interface FormStatus {
    pending: boolean;
    data: FormData | null;
    method: string | null;
    action: string | ((formData: FormData) => void | Promise<void>) | null;
}
export declare function useFormStatus(): FormStatus;
export declare function useOptimistic<State>(passthrough: State): [State, (action: State) => void];
export declare function useOptimistic<State, Action = State>(passthrough: State, reducer: (state: State, action: Action) => State): [State, (action: Action) => void];
export declare function useOptimistic<State, Action = State>(passthrough: State, reducer: ((state: State, action: Action) => State) | undefined, slot: unknown): [State, (action: Action) => void];
export declare function useContext<T>(context: Context<T>): T;
/** Compiler ABI: suspend once for all pending promises in one independent stratum. */
export declare function useBatch(items: any[], warm?: () => void): void;
/** Compiler ABI: cache one speculative promise/value creation by hook slot and deps. */
export declare function warmMemo(compute: () => any, deps: readonly any[], slot: unknown): void;
/** Compiler ABI: recurse into a compiled child's statically attached warm plan. */
export declare function warmChild(component: any, props: any): void;
export declare function use<T>(usable: Context<T> | PromiseLike<T>): T;
export declare function useImperativeHandle<T>(ref: {
    current: T | null;
} | ((value: T | null) => void) | null, create: () => T, deps?: readonly unknown[] | null, slot?: unknown): void;
export declare function useEffectEvent<T extends (...args: any[]) => any>(fn: T, slot?: unknown): T;
export declare function useDebugValue(): void;
export declare function startTransition(fn: () => void | Promise<unknown>): void;
export declare function requestFormReset(): void;
export declare function memo<P>(component: UniversalComponent<P>, _compare?: (previous: Readonly<P>, next: Readonly<P>) => boolean): UniversalComponent<P>;
export declare function createPortal(children: UniversalRenderable, target: unknown): UniversalPortalValue;
/** Compiler sentinel for the supported universal Activity descriptor. */
export declare const Activity: unique symbol;
export type UniversalSyncFlusher = <T>(run: () => T) => T;
/**
 * Renderer-infrastructure companion to a host runtime's `flushSync`.
 *
 * Universal roots normally batch hook and HMR updates in a microtask. A host
 * package supplies its owner flusher so direct and bridged roots alternate to
 * quiescence before the public scheduler boundary returns.
 */
export declare function flushUniversalSync<T>(run: () => T, flushOwner?: UniversalSyncFlusher): T;
/** Universal renderer companion used by host packages to implement sync `act`. */
export declare function flushUniversalAct<T>(run: () => T, flushOwner?: UniversalSyncFlusher): T;
export declare function createUniversalRoot<Container, PublicInstance>(container: Container, driver: UniversalHostDriver<Container, PublicInstance>, options?: UniversalRootOptions<Container>): UniversalRoot;
interface HostBoundaryProps {
    root: UniversalRoot;
    component?: UniversalComponent<any>;
    props?: any;
    /** Compiler-owned `children` form used by statically declared boundaries. */
    children?: RendererRegion;
}
export declare function createUniversalHostBoundary(renderer: string): ((props: HostBoundaryProps, scope: Scope) => void) & {
    readonly [UNIVERSAL_BOUNDARY]: UniversalBoundaryMetadata;
};
declare const OBJECT_DRIVER_STATE: unique symbol;
export interface ObjectHostInstance {
    readonly id: number;
    readonly type: string;
    props: Readonly<Record<string, unknown>>;
    visible: boolean;
    readonly children: ObjectHostInstance[];
}
interface ObjectDriverState {
    instances: Map<number, ObjectHostInstance>;
    events: Map<number, Map<string, UniversalEventListenerDescriptor>>;
    lifecycles: Map<number, Map<string, UniversalListenerDescriptor>>;
    localCallbacks: Map<number, Map<string, UniversalListenerDescriptor>>;
    localCleanups: Map<number, Map<string, () => void>>;
}
export interface ObjectHostContainer {
    readonly renderer: string;
    readonly children: ObjectHostInstance[];
    readonly commits: UniversalHostBatch[];
    /** Number of driver instances currently allocated, including detached ones. */
    readonly instanceCount: number;
    dispatchEvent(instance: ObjectHostInstance | number, type: string, payload: unknown): unknown;
    readonly [OBJECT_DRIVER_STATE]: ObjectDriverState;
}
export declare function createObjectContainer(renderer?: string): ObjectHostContainer;
export declare function createObjectDriver(renderer?: string): UniversalHostDriver<ObjectHostContainer, ObjectHostInstance>;
export declare const createContext: typeof createDomContext;
export {};
