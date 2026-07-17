/**
 * Build-specialized client profiler for Octane.
 *
 * The compiler emits the two metadata registration helpers below only when its
 * `profile` option is enabled. runtime.ts likewise calls the render/schedule
 * helpers behind `__OCTANE_PROFILE_ENABLED__`, allowing normal production
 * bundles to tree-shake this module and every profiling branch away.
 *
 * Profiling deliberately stores identities and timings, never live props,
 * state, reducer actions, DOM nodes, errors, or promises.
 */
export interface ComponentProfileMetadata {
    id: string;
    name: string;
    file: string;
    line: number;
    column: number;
    kind: string;
}
export interface HookProfileMetadata {
    id: string;
    componentId: string;
    name: string;
    kind: string;
    file: string;
    line: number;
    column: number;
    index: number;
}
export interface ProfileCause {
    type: string;
    hook?: string;
    source?: string;
}
export type ProfileOutcome = 'completed' | 'suspended' | 'errored' | 'bailout';
export interface ProfileEvent {
    type: 'component-render' | 'component-bailout';
    componentId: string;
    component: string;
    file: string;
    line: number;
    column: number;
    instanceId: number;
    attempt: number;
    phase: 'mount' | 'update';
    outcome: ProfileOutcome;
    causes: ProfileCause[];
    startTime: number;
    duration: number;
    selfDuration: number;
    queueDelay: number;
    scheduled: boolean;
}
export interface ProfileSummary {
    componentId: string;
    component: string;
    file: string;
    attempts: number;
    completed: number;
    suspended: number;
    errored: number;
    bails: number;
    totalTime: number;
    totalSelfTime: number;
    averageSelfTime: number;
    maxInclusiveTime: number;
    averageQueueDelay: number;
    dominantCause: string | null;
}
export interface ProfilerStartOptions {
    /** Maximum retained events. Oldest entries are discarded first. */
    bufferSize?: number;
    /** Emit Chrome custom-track timestamps when the browser supports them. */
    timeline?: boolean;
}
export interface ChromeTrace {
    traceEvents: Array<{
        name: string;
        cat: string;
        ph: 'X';
        pid: number;
        tid: number;
        ts: number;
        dur: number;
        args: Record<string, unknown>;
    }>;
    displayTimeUnit: 'ms';
}
interface InstanceProfile {
    id: number;
    attempts: number;
}
export interface ProfileFrame {
    subject: object;
    metadata: ComponentProfileMetadata;
    instance: InstanceProfile;
    startTime: number;
    childDuration: number;
    phase: 'mount' | 'update';
    causes: ProfileCause[];
    queueDelay: number;
    scheduled: boolean;
    parent: ProfileFrame | null;
    generation: number;
}
/** Compiler ABI: attach source metadata without wrapping or replacing the function. */
export declare function __profileComponent<T extends Function>(component: T, metadata: ComponentProfileMetadata): T;
/** Runtime ABI: forward wrapper metadata without adding observable function properties. */
export declare function __profileComponentSource<T extends Function>(wrapper: T, source: Function): T;
/** Compiler ABI: attach hook source metadata while preserving Symbol identity. */
export declare function __profileHook(slot: symbol, metadata: HookProfileMetadata): symbol;
/** Runtime ABI: carry a base hook's metadata onto its custom-hook path symbol. */
export declare function __profileResolveHook(slot: symbol, sourceSlot?: symbol): symbol;
/** Runtime ABI: distinguish compiler-registered components from renderer helpers. */
export declare function __profileHasComponentMetadata(component: Function): boolean;
/** Runtime ABI: associate a component-owned render scope without changing its shape. */
export declare function __profileTrackComponent(subject: object, component: Function | null): void;
/** Runtime ABI: merge a scheduling reason without retaining the updated value. */
export declare function __profileSchedule(subject: object, type: string, slot?: symbol | number): void;
/** Runtime ABI: begin an actual component invocation. */
export declare function __profileBeginRender(subject: object, _component: Function, mounted: boolean): ProfileFrame | null;
/** Runtime ABI: close a frame in `finally`, including throws and suspension. */
export declare function __profileEndRender(frame: ProfileFrame | null, didThrow: boolean, thrown?: unknown): void;
/** Runtime ABI: record a memo/implicit bailout where the body was not invoked. */
export declare function __profileBail(subject: object, component: Function, kind: string): void;
export interface OctaneProfiler {
    start(options?: ProfilerStartOptions): void;
    stop(): void;
    clear(): void;
    getEvents(): ProfileEvent[];
    summary(): ProfileSummary[];
    why(component: string | Function): ProfileEvent[];
    exportTrace(): ChromeTrace;
}
declare global {
    var __OCTANE_PROFILER__: OctaneProfiler | undefined;
}
export declare const profiler: OctaneProfiler;
export {};
