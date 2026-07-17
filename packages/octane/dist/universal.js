import {
  createContext as createDomContext,
  readContextFromScope,
  useInsertionEffect as useDomInsertionEffect,
  useLayoutEffect as useDomLayoutEffect,
  useRendererThenable as useDomRendererThenable,
  useState as useDomState
} from "./runtime.js";
import {
  __profileBeginRender,
  __profileComponentSource,
  __profileEndRender,
  __profileSchedule,
  __profileTrackComponent
} from "./profiling.js";
const UNIVERSAL_PLAN = /* @__PURE__ */ Symbol.for("octane.universal.plan");
const UNIVERSAL_VALUE = /* @__PURE__ */ Symbol.for("octane.universal.value");
const UNIVERSAL_LIST = /* @__PURE__ */ Symbol.for("octane.universal.list");
const UNIVERSAL_COMPONENT = /* @__PURE__ */ Symbol.for("octane.universal.component");
const UNIVERSAL_BOUNDARY = /* @__PURE__ */ Symbol.for("octane.universal.boundary");
const UNIVERSAL_COMPONENT_VALUE = /* @__PURE__ */ Symbol.for("octane.universal.component-value");
const UNIVERSAL_PROPS = /* @__PURE__ */ Symbol.for("octane.universal.props");
const UNIVERSAL_CHILDREN = /* @__PURE__ */ Symbol.for("octane.universal.children");
const UNIVERSAL_IF = /* @__PURE__ */ Symbol.for("octane.universal.if");
const UNIVERSAL_SWITCH = /* @__PURE__ */ Symbol.for("octane.universal.switch");
const UNIVERSAL_FOR = /* @__PURE__ */ Symbol.for("octane.universal.for");
const UNIVERSAL_TRY = /* @__PURE__ */ Symbol.for("octane.universal.try");
const UNIVERSAL_CONTEXT = /* @__PURE__ */ Symbol.for("octane.universal.context");
const UNIVERSAL_ACTIVITY = /* @__PURE__ */ Symbol.for("octane.universal.activity");
const UNIVERSAL_KEYED = /* @__PURE__ */ Symbol.for("octane.universal.keyed");
const UNIVERSAL_PORTAL = /* @__PURE__ */ Symbol.for("octane.universal.portal");
const UNIVERSAL_RENDERER_REGION = /* @__PURE__ */ Symbol.for("octane.universal.renderer-region");
const RENDERER_REGION_OWNER = /* @__PURE__ */ Symbol.for("octane.renderer-region.owner");
const NO_CHILDREN = /* @__PURE__ */ Symbol("octane.universal.no-children");
const NO_KEY = /* @__PURE__ */ Symbol("octane.universal.no-key");
const NO_PENDING_PASSIVE_ERROR = /* @__PURE__ */ Symbol("octane.universal.no-pending-passive-error");
let CURRENT_ATTEMPT = null;
let CURRENT_OWNER = null;
const SCHEDULED_UNIVERSAL_ROOTS = /* @__PURE__ */ new Set();
const PENDING_UNIVERSAL_PASSIVE_ROOTS = /* @__PURE__ */ new Set();
let UNIVERSAL_SYNC_DEPTH = 0;
let UNIVERSAL_COMMIT_TASK_DEPTH = 0;
const UNIVERSAL_SYNC_DRAIN_LIMIT = 100;
let NEXT_HOOK_SLOT = 0;
let NEXT_OWNER_ID = 1;
let NEXT_UNIVERSAL_ID_ROOT = 1;
let NEXT_EVENT_ROOT = 1;
let NEXT_RESOURCE_ROOT = 1;
let NEXT_PORTAL_ROOT = 1;
const EVENT_DISPATCHERS = /* @__PURE__ */ new Map();
const UNIVERSAL_SLOT_STACK = [];
class UniversalRendererRegionOwnerBridge {
  constructor(owner, ownerRenderer, childRenderer, component) {
    this.owner = owner;
    this.ownerRenderer = ownerRenderer;
    this.childRenderer = childRenderer;
    this.component = component;
  }
  owner;
  ownerRenderer;
  childRenderer;
  component;
  cell = null;
  get active() {
    return this.cell?.active === true;
  }
  compatible(previous) {
    return previous.owner === this.owner && previous.ownerRenderer === this.ownerRenderer && previous.childRenderer === this.childRenderer && previous.component === this.component;
  }
  activate(previous) {
    if (this.cell?.active === true) return this.cell;
    if (previous !== null && this.compatible(previous) && previous.cell?.active === true) {
      this.cell = previous.cell;
      return this.cell;
    }
    this.cell = { active: true, disposing: false, disposers: /* @__PURE__ */ new Set() };
    return this.cell;
  }
  lifecycle() {
    return this.cell;
  }
  readContext(context) {
    if (!this.active) {
      throw new Error("A renderer-region owner bridge cannot be read before its host commit.");
    }
    for (let current = this.owner; current !== null; current = current.parent) {
      if (current.contextValues?.has(context)) return current.contextValues.get(context);
    }
    return this.owner.root.readBridgeContext(context);
  }
  routeError(error) {
    return this.active && routeUniversalOwnerError(this.owner, error);
  }
  routeSuspense(thenable) {
    return this.active && routeUniversalOwnerSuspense(this.owner, thenable);
  }
  registerDispose(dispose) {
    const cell = this.cell;
    if (cell === null || !cell.active || cell.disposing) {
      throw new Error(
        "A renderer-owned child root cannot attach before its universal region commits."
      );
    }
    if (typeof dispose !== "function") {
      throw new TypeError("A renderer-region disposer must be a function.");
    }
    cell.disposers.add(dispose);
    let registered = true;
    return () => {
      if (!registered) return;
      registered = false;
      cell.disposers.delete(dispose);
    };
  }
  deactivate() {
    const cell = this.cell;
    if (cell === null || !cell.active || cell.disposing) return;
    cell.active = false;
    cell.disposing = true;
    const disposers = [...cell.disposers];
    cell.disposers.clear();
    for (const dispose of disposers) {
      try {
        dispose();
      } catch (error) {
        if (!routeUniversalOwnerError(this.owner, error)) console.error(error);
      }
    }
    cell.disposing = false;
  }
}
class UniversalSuspense {
  constructor(thenable) {
    this.thenable = thenable;
  }
  thenable;
}
class UniversalSuspendedAttemptImpl {
  constructor(root, thenable, component, props, replayEntries) {
    this.root = root;
    this.thenable = thenable;
    this.component = component;
    this.props = props;
    this.replayEntries = replayEntries;
    thenable.then(
      () => this.settle(),
      () => this.settle()
    );
  }
  root;
  thenable;
  component;
  props;
  replayEntries;
  state = "suspended";
  get status() {
    return this.state;
  }
  settle() {
    if (this.state !== "suspended") return;
    this.root.finishSuspension(this, true);
  }
  abort() {
    if (this.state !== "suspended") return;
    this.state = "aborted";
    this.root.finishSuspension(this, false);
  }
}
function assertRendererId(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty renderer id.`);
  }
}
function normalizeUniversalKey(value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "symbol" || typeof value === "bigint") {
    return value;
  }
  throw new TypeError(`Universal keys must be strings, numbers, symbols, or bigints.`);
}
function freezePlanNode(node) {
  if (node.kind === "host") {
    if (typeof node.type !== "string" || node.type === "") {
      throw new TypeError("A universal host plan requires a non-empty string type.");
    }
    const props = Object.freeze({ ...node.props ?? {} });
    const bindings = Object.freeze(
      (node.bindings ?? []).map((binding) => Object.freeze([binding[0], binding[1]]))
    );
    const children = Object.freeze((node.children ?? []).map(freezePlanNode));
    return Object.freeze({
      kind: "host",
      type: node.type,
      props,
      bindings,
      ...node.propsSlot === void 0 ? null : { propsSlot: node.propsSlot },
      children
    });
  }
  if (node.kind === "range") {
    return Object.freeze({
      kind: "range",
      children: Object.freeze(node.children.map(freezePlanNode))
    });
  }
  if (node.kind === "slot") {
    return Object.freeze({ kind: "slot", slot: node.slot });
  }
  if (node.kind === "component") {
    return Object.freeze({
      kind: "component",
      renderer: node.renderer,
      ...node.component === void 0 ? null : { component: node.component },
      ...node.componentSlot === void 0 ? null : { componentSlot: node.componentSlot },
      ...node.propsSlot === void 0 ? null : { propsSlot: node.propsSlot },
      ...node.keySlot === void 0 ? null : { keySlot: node.keySlot },
      children: Object.freeze((node.children ?? []).map(freezePlanNode))
    });
  }
  if (node.kind === "if") {
    return Object.freeze({
      kind: "if",
      conditionSlot: node.conditionSlot,
      then: freezePlanNode(node.then),
      ...node.else === void 0 ? null : { else: freezePlanNode(node.else) }
    });
  }
  if (node.kind === "switch") {
    return Object.freeze({
      kind: "switch",
      valueSlot: node.valueSlot,
      cases: Object.freeze(
        node.cases.map(([value, child]) => Object.freeze([value, freezePlanNode(child)]))
      ),
      ...node.default === void 0 ? null : { default: freezePlanNode(node.default) }
    });
  }
  return Object.freeze({
    kind: "text",
    ...node.value === void 0 ? null : { value: node.value },
    ...node.slot === void 0 ? null : { slot: node.slot }
  });
}
function universalPlan(renderer, root) {
  assertRendererId(renderer, "universalPlan renderer");
  return Object.freeze({ $$kind: UNIVERSAL_PLAN, renderer, root: freezePlanNode(root) });
}
function universalValue(plan, values = [], key = null) {
  if (plan?.$$kind !== UNIVERSAL_PLAN)
    throw new TypeError("universalValue expected a universal plan.");
  return { $$kind: UNIVERSAL_VALUE, plan, values, key };
}
function universalKey(key, value) {
  if (value?.$$kind === UNIVERSAL_VALUE) {
    return { ...value, key };
  }
  return { $$kind: UNIVERSAL_KEYED, key, value };
}
function universalList(items, render, empty) {
  const values = [];
  let index = 0;
  const keys = /* @__PURE__ */ new Set();
  for (const item of items) {
    const value = render(item, index++);
    const key = renderableKey(value);
    if (key === null) {
      throw new Error("Universal keyed lists require every item to have an explicit key.");
    }
    if (keys.has(key)) throw new Error(`Duplicate universal list key ${String(key)}.`);
    keys.add(key);
    values.push(value);
  }
  return { $$kind: UNIVERSAL_LIST, values, ...values.length === 0 ? { empty } : null };
}
function renderableKey(value) {
  if (value?.$$kind === UNIVERSAL_VALUE) {
    return value.key;
  }
  if (value?.$$kind === UNIVERSAL_KEYED) {
    return value.key;
  }
  if (value?.$$kind === UNIVERSAL_COMPONENT_VALUE) {
    const component = value;
    return component.hasKey ? component.key : null;
  }
  return null;
}
function universalProps(entries, children = NO_CHILDREN) {
  const props = {};
  for (const entry of entries) {
    if (entry[0] === "set") {
      props[entry[1]] = entry[2];
      continue;
    }
    const spread = entry[1];
    if (spread == null) continue;
    Object.assign(props, Object(spread));
  }
  if (children !== NO_CHILDREN) props.children = children;
  const hasKey = Object.prototype.hasOwnProperty.call(props, "key");
  const key = hasKey ? props.key : null;
  if (hasKey) delete props.key;
  return {
    $$kind: UNIVERSAL_PROPS,
    props: Object.freeze(props),
    key,
    hasKey,
    hasChildren: Object.prototype.hasOwnProperty.call(props, "children")
  };
}
function normalizePropsValue(value) {
  if (value?.$$kind === UNIVERSAL_PROPS) {
    return value;
  }
  return universalProps(value == null ? [] : [["spread", value]]);
}
function universalComponent(renderer, component, props = null, key = NO_KEY) {
  assertRendererId(renderer, "universalComponent renderer");
  const normalized = normalizePropsValue(props);
  return {
    $$kind: UNIVERSAL_COMPONENT_VALUE,
    renderer,
    component,
    props: normalized,
    key: key === NO_KEY ? normalized.key : key,
    hasKey: key !== NO_KEY || normalized.hasKey
  };
}
function universalChildren(renderer, render) {
  assertRendererId(renderer, "universalChildren renderer");
  if (typeof render !== "function") throw new TypeError("universalChildren expected a function.");
  return { $$kind: UNIVERSAL_CHILDREN, renderer, render };
}
function universalIf(condition, then, otherwise = null) {
  return { $$kind: UNIVERSAL_IF, condition: !!condition, then, else: otherwise };
}
function universalSwitch(value, cases, defaultValue = null) {
  return { $$kind: UNIVERSAL_SWITCH, value, cases, default: defaultValue };
}
function universalFor(items, key, render, empty = null) {
  return { $$kind: UNIVERSAL_FOR, items, key, render, empty };
}
function universalTry(body, pending = null, catchBody = null) {
  return { $$kind: UNIVERSAL_TRY, body, pending, catch: catchBody };
}
function universalContext(context, value, children) {
  return { $$kind: UNIVERSAL_CONTEXT, context, value, children };
}
function universalActivity(mode, body) {
  if (mode !== "visible" && mode !== "hidden") {
    throw new TypeError(
      `Universal Activity mode must be "visible" or "hidden", received ${JSON.stringify(mode)}.`
    );
  }
  if (typeof body !== "function")
    throw new TypeError("universalActivity expected a body function.");
  return { $$kind: UNIVERSAL_ACTIVITY, mode, body };
}
function rendererRegion(ownerRenderer, childRenderer, component, props) {
  assertRendererId(ownerRenderer, "rendererRegion owner renderer");
  assertRendererId(childRenderer, "rendererRegion child renderer");
  if (ownerRenderer === childRenderer) {
    throw new Error("rendererRegion requires distinct owner and child renderers.");
  }
  if (typeof component !== "function") {
    throw new TypeError("rendererRegion expected a child component function.");
  }
  let regionProps = props;
  if (CURRENT_OWNER !== null) {
    if (ownerRenderer !== CURRENT_OWNER.record.renderer) {
      throw new Error(
        `rendererRegion owner ${JSON.stringify(ownerRenderer)} does not match the active universal renderer ${JSON.stringify(CURRENT_OWNER.record.renderer)}.`
      );
    }
    if (typeof props !== "object" && typeof props !== "function" || props === null) {
      throw new TypeError(
        "A renderer region created by a universal component requires object props."
      );
    }
    const bridge = new UniversalRendererRegionOwnerBridge(
      CURRENT_OWNER.record,
      ownerRenderer,
      childRenderer,
      component
    );
    const nextProps = { ...props };
    Object.defineProperty(nextProps, RENDERER_REGION_OWNER, {
      value: bridge,
      enumerable: false,
      configurable: false,
      writable: false
    });
    regionProps = Object.freeze(nextProps);
  }
  return Object.freeze({
    $$kind: UNIVERSAL_RENDERER_REGION,
    ownerRenderer,
    childRenderer,
    component,
    props: regionProps
  });
}
function isRendererRegion(value) {
  return value?.$$kind === UNIVERSAL_RENDERER_REGION;
}
function rendererRegionOwnerBridge(value) {
  if (!isRendererRegion(value)) return null;
  const bridge = value.props?.[RENDERER_REGION_OWNER];
  return bridge instanceof UniversalRendererRegionOwnerBridge ? bridge : null;
}
function defineUniversalComponent(renderer, render, metadata) {
  assertRendererId(renderer, "defineUniversalComponent renderer");
  if (typeof render !== "function")
    throw new TypeError("defineUniversalComponent expected a function.");
  Object.defineProperty(render, UNIVERSAL_COMPONENT, {
    configurable: false,
    enumerable: false,
    value: Object.freeze({ id: renderer, module: metadata?.module, target: "universal" })
  });
  return render;
}
const UNIVERSAL_HMR = /* @__PURE__ */ Symbol.for("octane.universal.hmr");
function hmrUniversalComponent(renderer, component) {
  assertRendererId(renderer, "hmrUniversalComponent renderer");
  const metadata = getComponentMetadata(component);
  if (metadata.id !== renderer) {
    throw new Error(
      `Universal HMR renderer mismatch: wrapper ${JSON.stringify(renderer)} cannot own ${JSON.stringify(metadata.id)}.`
    );
  }
  const owners = /* @__PURE__ */ new Set();
  const meta = {
    component,
    owners,
    update(incoming) {
      const incomingMeta = incoming[UNIVERSAL_HMR];
      const next = incomingMeta?.component ?? incoming;
      const nextMetadata = getComponentMetadata(next);
      if (nextMetadata.id !== renderer) {
        throw new Error(
          `Universal HMR renderer mismatch: wrapper ${JSON.stringify(renderer)} cannot accept ${JSON.stringify(nextMetadata.id)}.`
        );
      }
      meta.component = next;
      __profileComponentSource(wrapper, next);
      if (next.__warm === void 0) delete wrapper.__warm;
      else wrapper.__warm = next.__warm;
      for (const owner of owners) {
        if (owner.disposed) {
          owners.delete(owner);
          continue;
        }
        __profileSchedule(owner, "hmr");
        owner.root.schedule();
      }
    }
  };
  const wrapper = defineUniversalComponent(
    renderer,
    (props, context) => {
      if (CURRENT_OWNER !== null) owners.add(CURRENT_OWNER.record);
      return meta.component(props, context);
    },
    { module: metadata.module }
  );
  Object.defineProperty(wrapper, UNIVERSAL_HMR, { value: meta });
  __profileComponentSource(wrapper, component);
  if (component.__warm !== void 0) wrapper.__warm = component.__warm;
  return wrapper;
}
function getComponentMetadata(component) {
  const metadata = component?.[UNIVERSAL_COMPONENT];
  if (metadata === void 0) {
    throw new Error("Universal roots accept only compiler-defined universal components.");
  }
  return metadata;
}
function identityPathEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    if (!Object.is(left[index], right[index])) return false;
  }
  return true;
}
function createOwnerRecord(root, component, parent, identityPath, key) {
  return {
    root,
    renderer: root.renderer,
    component,
    parent,
    identityPath,
    key,
    id: NEXT_OWNER_ID++,
    rangeKey: /* @__PURE__ */ Symbol("octane.universal.owner-range"),
    hooks: /* @__PURE__ */ new Map(),
    effectOrder: [],
    children: [],
    contextValues: null,
    updates: /* @__PURE__ */ new Map(),
    isBoundary: false,
    canHandleSuspense: false,
    boundaryError: void 0,
    hasBoundaryError: false,
    boundaryThenable: null,
    visibility: "visible",
    mounted: false,
    disposed: false
  };
}
function draftOwner(record, parent, replayPath) {
  return {
    record,
    parent,
    replayPath,
    hooks: new Map(record.hooks),
    clonedHooks: /* @__PURE__ */ new Set(),
    seenEffects: [],
    children: [],
    claimedChildren: /* @__PURE__ */ new Set(),
    contextValues: record.contextValues === null ? null : new Map(record.contextValues),
    appliedUpdates: /* @__PURE__ */ new Map(),
    needsRender: false,
    implicitSlot: 0,
    boundaryError: record.boundaryError,
    hasBoundaryError: record.hasBoundaryError,
    boundaryThenable: record.boundaryThenable,
    isBoundary: record.isBoundary,
    canHandleSuspense: record.canHandleSuspense,
    visibility: parent?.visibility ?? "visible"
  };
}
function childReplayPath(parent, component, identityPath, key) {
  let ordinal = 0;
  for (const child of parent.children) {
    const segment = child.replayPath[child.replayPath.length - 1];
    if (segment.component === component && Object.is(segment.key, key) && identityPathEqual(segment.identityPath, identityPath)) {
      ordinal++;
    }
  }
  return [...parent.replayPath, { component, identityPath, key, ordinal }];
}
function claimChildOwner(parent, component, identityPath, key) {
  const attempt = currentAttempt();
  let record;
  for (const candidate of parent.record.children) {
    if (parent.claimedChildren.has(candidate)) continue;
    if (candidate.component === component && Object.is(candidate.key, key) && identityPathEqual(candidate.identityPath, identityPath)) {
      record = candidate;
      break;
    }
  }
  record ??= createOwnerRecord(attempt.root, component, parent.record, identityPath, key);
  parent.claimedChildren.add(record);
  const draft = draftOwner(record, parent, childReplayPath(parent, component, identityPath, key));
  parent.children.push(draft);
  attempt.owners.push(draft);
  return draft;
}
function readOwnerContext(owner, context) {
  for (let current = owner; current !== null; current = current.parent) {
    if (current.contextValues?.has(context)) return current.contextValues.get(context);
  }
  return currentAttempt().root.readBridgeContext(context);
}
function executeOwner(owner, build) {
  const attempt = currentAttempt();
  let output = [];
  for (let renderCount = 0; ; renderCount++) {
    if (renderCount === 25) throw new Error("Too many universal render-phase updates.");
    if (renderCount > 0) resetDraftChildren(owner);
    owner.seenEffects = [];
    owner.children = [];
    owner.claimedChildren = /* @__PURE__ */ new Set();
    owner.needsRender = false;
    owner.implicitSlot = 0;
    const previousOwner = CURRENT_OWNER;
    const previousAttemptOwner = attempt.owner;
    CURRENT_OWNER = owner;
    attempt.owner = owner;
    const component = owner.record.component;
    if (component !== null) __profileTrackComponent(owner.record, component);
    const profileFrame = component === null ? null : __profileBeginRender(owner.record, component, owner.record.mounted);
    let didThrow = false;
    let thrown;
    try {
      output = build();
    } catch (error) {
      didThrow = true;
      thrown = error;
      throw error;
    } finally {
      __profileEndRender(profileFrame, didThrow, thrown);
      CURRENT_OWNER = previousOwner;
      attempt.owner = previousAttemptOwner;
    }
    if (!owner.needsRender) return output;
  }
}
function ownerRange(owner, children) {
  return [{ kind: "range", key: owner.record.rangeKey, children }];
}
function componentContext(renderer) {
  return {
    renderer,
    readContext: (context) => readOwnerContext(CURRENT_OWNER, context),
    insertionEffect: (create, deps) => enqueueUniversalEffect("insertion", create, deps),
    layoutEffect: (create, deps) => enqueueUniversalEffect("layout", create, deps),
    effect: (create, deps) => enqueueUniversalEffect("passive", create, deps)
  };
}
function materializeComponentValue(value, expectedRenderer, path) {
  if (value.renderer !== expectedRenderer) {
    throw new Error(
      `Universal renderer mismatch: owner ${JSON.stringify(expectedRenderer)} cannot materialize component descriptor ${JSON.stringify(value.renderer)}.`
    );
  }
  const metadata = getComponentMetadata(value.component);
  if (metadata.id !== expectedRenderer) {
    throw new Error(
      `Universal renderer mismatch: owner ${JSON.stringify(expectedRenderer)} cannot render nested component ${JSON.stringify(metadata.id)}.`
    );
  }
  const parent = CURRENT_OWNER;
  if (parent === null) throw new Error("A nested universal component requires an owner.");
  const normalized = normalizePropsValue(value.props);
  const owner = claimChildOwner(parent, value.component, path, value.hasKey ? value.key : null);
  const props = { ...normalized.props };
  const nodes = executeOwner(owner, () => {
    const rendered = value.component(props, componentContext(expectedRenderer));
    return materializeValue(rendered, expectedRenderer, null, [...path, "output"]);
  });
  return ownerRange(owner, nodes);
}
function materializeScoped(parent, path, key, build, contextValues = null) {
  const attempt = currentAttempt();
  const universalIdCheckpoint = attempt.nextUniversalId;
  const owner = claimChildOwner(parent, null, path, key);
  owner.contextValues = contextValues;
  try {
    const nodes = executeOwner(
      owner,
      () => materializeValue(build(), parent.record.renderer, null, [...path, "output"])
    );
    return ownerRange(owner, nodes);
  } catch (error) {
    attempt.nextUniversalId = universalIdCheckpoint;
    throw error;
  }
}
function disposeUncommittedDraft(owner) {
  for (const child of owner.children) disposeUncommittedDraft(child);
  if (!owner.record.mounted) {
    owner.record.disposed = true;
    for (const hook of owner.hooks.values()) {
      if (hook.kind === "effect-event") hook.cell.active = false;
    }
  }
}
function resetDraftChildren(owner) {
  for (const child of owner.children) disposeUncommittedDraft(child);
  owner.children = [];
  owner.claimedChildren = /* @__PURE__ */ new Set();
}
function retainCommittedOwnerTree(owner) {
  owner.hooks = new Map(owner.record.hooks);
  owner.seenEffects = [...owner.record.effectOrder];
  owner.contextValues = owner.record.contextValues === null ? null : new Map(owner.record.contextValues);
  owner.children = [];
  owner.claimedChildren = new Set(owner.record.children);
  for (const childRecord of owner.record.children) {
    const child = draftOwner(
      childRecord,
      owner,
      childReplayPath(owner, childRecord.component, childRecord.identityPath, childRecord.key)
    );
    owner.children.push(child);
    currentAttempt().owners.push(child);
    retainCommittedOwnerTree(child);
  }
}
function findLogicalRange(record, key) {
  if (record.kind === "range" && Object.is(record.key, key)) return record;
  for (const child of record.children) {
    const match = findLogicalRange(child, key);
    if (match !== null) return match;
  }
  return null;
}
function blueprintFromLogical(record) {
  if (record.kind === "range") {
    return {
      kind: "range",
      key: record.key,
      children: record.children.map(blueprintFromLogical)
    };
  }
  if (record.kind === "portal") {
    return {
      kind: "portal",
      key: record.key,
      target: null,
      registration: record.portalRegistration,
      children: record.children.map(blueprintFromLogical)
    };
  }
  return {
    kind: "host",
    key: record.key,
    type: record.type,
    props: { ...record.props },
    ref: record.ref,
    owner: record.owner,
    events: new Map(record.events),
    lifecycles: new Map(record.lifecycles),
    localCallbacks: new Map(record.localCallbacks),
    visibility: record.visibility,
    children: record.children.map(blueprintFromLogical)
  };
}
function markDraftOwnerSuspenseHidden(owner) {
  owner.visibility = "suspense-hidden";
  for (const child of owner.children) markDraftOwnerSuspenseHidden(child);
}
function markBlueprintSuspenseHidden(nodes) {
  for (const node of nodes) {
    if (node.kind === "host") node.visibility = "suspense-hidden";
    markBlueprintSuspenseHidden(node.children);
  }
}
function retainCommittedTryArm(owner) {
  if (!owner.record.mounted) return null;
  const childRecord = owner.record.children.find((child2) => Object.is(child2.key, "try"));
  if (childRecord === void 0) return null;
  const range = findLogicalRange(owner.record.root.rootRecordForRetention(), childRecord.rangeKey);
  if (range === null) return null;
  resetDraftChildren(owner);
  const child = draftOwner(
    childRecord,
    owner,
    childReplayPath(owner, childRecord.component, childRecord.identityPath, childRecord.key)
  );
  owner.children.push(child);
  owner.claimedChildren.add(childRecord);
  currentAttempt().owners.push(child);
  retainCommittedOwnerTree(child);
  markDraftOwnerSuspenseHidden(child);
  const nodes = ownerRange(child, range.children.map(blueprintFromLogical));
  markBlueprintSuspenseHidden(nodes);
  return nodes;
}
function materializeValue(value, expectedRenderer, key, path) {
  if (value == null || value === false || value === true) return [];
  if (value?.$$kind === UNIVERSAL_KEYED) {
    const keyed = value;
    const nodes = materializeValue(keyed.value, expectedRenderer, keyed.key, [...path, keyed.key]);
    if (nodes.length === 1) nodes[0].key = keyed.key;
    else return [{ kind: "range", key: keyed.key, children: nodes }];
    return nodes;
  }
  if (value?.$$kind === UNIVERSAL_LIST) {
    const list = value;
    if (list.values.length === 0 && list.empty !== void 0) {
      return materializeValue(list.empty, expectedRenderer, null, [...path, "empty"]);
    }
    const output = [];
    for (let index = 0; index < list.values.length; index++) {
      const item = list.values[index];
      const itemKey = renderableKey(item);
      output.push(
        ...materializeValue(item, expectedRenderer, itemKey, [...path, "item", itemKey ?? index])
      );
    }
    return output;
  }
  if (value?.$$kind === UNIVERSAL_VALUE) {
    const planValue = value;
    const nodes = materializePlanValue(planValue, expectedRenderer, path);
    if (key !== null && nodes.length === 1) nodes[0].key = key;
    return nodes;
  }
  if (value?.$$kind === UNIVERSAL_COMPONENT_VALUE) {
    const nodes = materializeComponentValue(
      value,
      expectedRenderer,
      path
    );
    if (key !== null && nodes.length === 1) nodes[0].key = key;
    return nodes;
  }
  if (value?.$$kind === UNIVERSAL_CHILDREN) {
    const children = value;
    if (children.renderer !== expectedRenderer) {
      throw new Error(
        `Universal renderer mismatch: owner ${JSON.stringify(expectedRenderer)} cannot render children for ${JSON.stringify(children.renderer)}.`
      );
    }
    return materializeValue(children.render(), expectedRenderer, key, [...path, "children"]);
  }
  if (value?.$$kind === UNIVERSAL_PORTAL) {
    const portal = value;
    return [
      {
        kind: "portal",
        key,
        target: portal.target,
        registration: null,
        children: materializeValue(portal.children, expectedRenderer, null, [...path, "portal"])
      }
    ];
  }
  if (value?.$$kind === UNIVERSAL_ACTIVITY) {
    const activity = value;
    if (currentAttempt().root.driverCapabilities().visibility !== true) {
      throw new Error(
        `Universal renderer ${JSON.stringify(expectedRenderer)} does not declare the visibility capability.`
      );
    }
    const parent = CURRENT_OWNER;
    if (parent === null) throw new Error("Universal Activity requires an owning component.");
    const owner = claimChildOwner(parent, null, [...path, "activity"], null);
    owner.visibility = parent.visibility === "suspense-hidden" ? "suspense-hidden" : parent.visibility === "activity-hidden" || activity.mode === "hidden" ? "activity-hidden" : "visible";
    const nodes = executeOwner(
      owner,
      () => materializeValue(activity.body(), expectedRenderer, null, [...path, "activity-output"])
    );
    const range = ownerRange(owner, nodes);
    return key === null ? range : [{ kind: "range", key, children: range }];
  }
  if (value?.$$kind === UNIVERSAL_IF) {
    const branch = value;
    const body = branch.condition ? branch.then : branch.else;
    if (body === null) return [];
    return materializeScoped(CURRENT_OWNER, [...path, "if"], branch.condition ? 1 : 0, body);
  }
  if (value?.$$kind === UNIVERSAL_SWITCH) {
    const branch = value;
    let selected = branch.default;
    let selectedKey = "default";
    for (let index = 0; index < branch.cases.length; index++) {
      if (branch.cases[index][0] === branch.value) {
        selected = branch.cases[index][1];
        selectedKey = index;
        break;
      }
    }
    if (selected === null) return [];
    return materializeScoped(CURRENT_OWNER, [...path, "switch"], selectedKey, selected);
  }
  if (value?.$$kind === UNIVERSAL_FOR) {
    const list = value;
    const output = [];
    const keys = /* @__PURE__ */ new Set();
    let index = 0;
    for (const item of list.items) {
      const itemIndex = index++;
      const itemKey = list.key(item, itemIndex);
      if (keys.has(itemKey)) throw new Error(`Duplicate universal list key ${String(itemKey)}.`);
      keys.add(itemKey);
      output.push(
        ...materializeScoped(
          CURRENT_OWNER,
          [...path, "for"],
          itemKey,
          () => list.render(item, itemIndex)
        )
      );
    }
    if (index === 0 && list.empty !== null) {
      return materializeScoped(CURRENT_OWNER, [...path, "for-empty"], null, list.empty);
    }
    return output;
  }
  if (value?.$$kind === UNIVERSAL_CONTEXT) {
    const provider = value;
    const parent = CURRENT_OWNER;
    const owner = claimChildOwner(parent, null, [...path, "context", provider.context], null);
    owner.contextValues = /* @__PURE__ */ new Map([[provider.context, provider.value]]);
    const nodes = executeOwner(owner, () => {
      const children = provider.children;
      const rendered = typeof children === "function" ? children() : children;
      return materializeValue(rendered, expectedRenderer, null, [...path, "context-output"]);
    });
    return ownerRange(owner, nodes);
  }
  if (value?.$$kind === UNIVERSAL_TRY) {
    const boundary = value;
    const parent = CURRENT_OWNER;
    const owner = claimChildOwner(parent, null, [...path, "try-boundary"], null);
    owner.isBoundary = true;
    owner.canHandleSuspense = boundary.pending !== null;
    let branch = boundary.body;
    let branchKey = "try";
    if (owner.boundaryThenable !== null) {
      if (boundary.pending === null) throw new UniversalSuspense(owner.boundaryThenable);
      const retained = retainCommittedTryArm(owner);
      if (retained !== null) {
        if (currentAttempt().root.driverCapabilities().visibility !== true) {
          throw new Error(
            `Universal renderer ${JSON.stringify(expectedRenderer)} does not declare the visibility capability required by retained Suspense.`
          );
        }
        const pending = materializeScoped(owner, [...path, "try-arm"], "pending", boundary.pending);
        return ownerRange(owner, [...retained, ...pending]);
      }
      branchKey = "pending";
      branch = boundary.pending;
    } else if (owner.hasBoundaryError) {
      if (boundary.catch === null) throw owner.boundaryError;
      const error = owner.boundaryError;
      branchKey = "catch";
      branch = () => boundary.catch(error, () => {
        owner.record.hasBoundaryError = false;
        owner.record.boundaryError = void 0;
        owner.record.root.schedule();
      });
    }
    try {
      const nodes = materializeScoped(owner, [...path, "try-arm"], branchKey, branch);
      return ownerRange(owner, nodes);
    } catch (error) {
      if (error instanceof UniversalSuspense) {
        const retained = retainCommittedTryArm(owner);
        if (retained !== null) {
          if (boundary.pending === null) throw error;
          if (currentAttempt().root.driverCapabilities().visibility !== true) {
            throw new Error(
              `Universal renderer ${JSON.stringify(expectedRenderer)} does not declare the visibility capability required by retained Suspense.`
            );
          }
          currentAttempt().retryThenables.add(error.thenable);
          const pending = materializeScoped(
            owner,
            [...path, "try-arm"],
            "pending",
            boundary.pending
          );
          return ownerRange(owner, [...retained, ...pending]);
        }
        currentAttempt().retryThenables.add(error.thenable);
        resetDraftChildren(owner);
        if (boundary.pending === null) throw error;
        const nodes2 = materializeScoped(owner, [...path, "try-arm"], "pending", boundary.pending);
        return ownerRange(owner, nodes2);
      }
      if (boundary.catch === null || branchKey === "catch") throw error;
      resetDraftChildren(owner);
      owner.hasBoundaryError = true;
      owner.boundaryError = error;
      const nodes = materializeScoped(
        owner,
        [...path, "try-arm"],
        "catch",
        () => boundary.catch(error, () => {
          owner.record.hasBoundaryError = false;
          owner.record.boundaryError = void 0;
          owner.record.root.schedule();
        })
      );
      return ownerRange(owner, nodes);
    }
  }
  if (Array.isArray(value)) {
    const output = [];
    const keys = /* @__PURE__ */ new Set();
    for (let index = 0; index < value.length; index++) {
      const item = value[index];
      const itemKey = renderableKey(item);
      if (itemKey !== null) {
        if (keys.has(itemKey)) throw new Error(`Duplicate universal child key ${String(itemKey)}.`);
        keys.add(itemKey);
      }
      output.push(
        ...materializeValue(item, expectedRenderer, itemKey, [
          ...path,
          itemKey === null ? index : itemKey
        ])
      );
    }
    return output;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    const text = currentAttempt().root.textPolicy();
    if (text === "ignore") return [];
    if (text === "reject") {
      throw new Error(
        `Universal renderer ${JSON.stringify(expectedRenderer)} rejects primitive text children.`
      );
    }
    return [
      {
        kind: "host",
        key,
        type: "#text",
        props: { value: String(value) },
        ref: null,
        owner: CURRENT_OWNER.record,
        events: /* @__PURE__ */ new Map(),
        lifecycles: /* @__PURE__ */ new Map(),
        localCallbacks: /* @__PURE__ */ new Map(),
        visibility: CURRENT_OWNER.visibility,
        children: []
      }
    ];
  }
  throw new TypeError(
    `Unsupported universal dynamic child ${Object.prototype.toString.call(value)}.`
  );
}
function materializeNode(node, values, renderer, path) {
  if (node.kind === "slot")
    return materializeValue(values[node.slot], renderer, null, [...path, "slot", node.slot]);
  if (node.kind === "text") {
    const value = node.slot === void 0 ? node.value ?? "" : values[node.slot];
    return materializeValue(value, renderer, null, [...path, "text"]);
  }
  if (node.kind === "range") {
    const children2 = [];
    for (let index = 0; index < node.children.length; index++) {
      children2.push(
        ...materializeNode(node.children[index], values, renderer, [...path, "range", index])
      );
    }
    return [{ kind: "range", key: null, children: children2 }];
  }
  if (node.kind === "component") {
    const component = node.component ?? values[node.componentSlot];
    let props2 = node.propsSlot === void 0 ? universalProps([]) : normalizePropsValue(values[node.propsSlot]);
    if (node.children !== void 0 && node.children.length > 0) {
      const childPlan = universalPlan(renderer, {
        kind: "range",
        children: node.children
      });
      const children2 = universalChildren(renderer, () => universalValue(childPlan, values));
      props2 = universalProps([["spread", props2.props]], children2);
    }
    return materializeComponentValue(
      universalComponent(
        node.renderer,
        component,
        props2,
        node.keySlot === void 0 ? NO_KEY : values[node.keySlot]
      ),
      renderer,
      [...path, "component"]
    );
  }
  if (node.kind === "if") {
    const selected = values[node.conditionSlot] ? node.then : node.else;
    if (selected === void 0) return [];
    const owner = claimChildOwner(
      CURRENT_OWNER,
      null,
      [...path, "if"],
      values[node.conditionSlot] ? 1 : 0
    );
    return ownerRange(
      owner,
      executeOwner(
        owner,
        () => materializeNode(selected, values, renderer, [...path, "if-output"])
      )
    );
  }
  if (node.kind === "switch") {
    let selected = node.default;
    let selectedKey = "default";
    for (let index = 0; index < node.cases.length; index++) {
      if (node.cases[index][0] === values[node.valueSlot]) {
        selected = node.cases[index][1];
        selectedKey = index;
        break;
      }
    }
    if (selected === void 0) return [];
    const owner = claimChildOwner(CURRENT_OWNER, null, [...path, "switch"], selectedKey);
    return ownerRange(
      owner,
      executeOwner(
        owner,
        () => materializeNode(selected, values, renderer, [...path, "switch-output"])
      )
    );
  }
  if (node.type === "#text") {
    const text = currentAttempt().root.textPolicy();
    if (text === "ignore") return [];
    if (text === "reject") {
      throw new Error(
        `Universal renderer ${JSON.stringify(renderer)} rejects primitive text children.`
      );
    }
  }
  const props = { ...node.props ?? {} };
  for (const [name, slot] of node.bindings ?? []) props[name] = values[slot];
  let propsValue = null;
  if (node.propsSlot !== void 0) {
    propsValue = normalizePropsValue(values[node.propsSlot]);
    Object.assign(props, propsValue.props);
  }
  const hasKey = propsValue?.hasKey || Object.prototype.hasOwnProperty.call(props, "key");
  const hostKey = normalizeUniversalKey(
    propsValue?.hasKey ? propsValue.key : hasKey ? props.key : null
  );
  const ref = Object.prototype.hasOwnProperty.call(props, "ref") ? props.ref : null;
  const dynamicChildren = Object.prototype.hasOwnProperty.call(props, "children") ? props.children : void 0;
  delete props.ref;
  delete props.key;
  delete props.children;
  const events = /* @__PURE__ */ new Map();
  const lifecycles = /* @__PURE__ */ new Map();
  const localCallbacks = /* @__PURE__ */ new Map();
  for (const name of Object.keys(props)) {
    const handler = props[name];
    const lifecycle = currentAttempt().root.classifyLifecycle(name, handler);
    if (lifecycle !== null) {
      delete props[name];
      if (handler == null) continue;
      if (typeof handler !== "function") {
        throw new TypeError(
          `Universal lifecycle prop ${JSON.stringify(name)} for renderer ${JSON.stringify(renderer)} must be a function, null, or undefined.`
        );
      }
      lifecycles.set(lifecycle.type, {
        prop: name,
        type: lifecycle.type,
        handler,
        owner: CURRENT_OWNER.record
      });
      continue;
    }
    const local = currentAttempt().root.classifyLocalCallback(name, handler);
    if (local !== null) {
      delete props[name];
      if (currentAttempt().root.driverCapabilities().localHostCallbacks !== true) {
        throw new Error(
          `Universal renderer ${JSON.stringify(renderer)} does not declare the local-host-callback capability.`
        );
      }
      if (handler == null) continue;
      if (typeof handler !== "function") {
        throw new TypeError(
          `Universal local callback prop ${JSON.stringify(name)} for renderer ${JSON.stringify(renderer)} must be a function, null, or undefined.`
        );
      }
      localCallbacks.set(local.type, {
        prop: name,
        type: local.type,
        handler,
        owner: CURRENT_OWNER.record
      });
      continue;
    }
    const definition = currentAttempt().root.classifyEvent(name);
    if (definition !== null) {
      delete props[name];
      if (handler == null) continue;
      if (typeof handler !== "function") {
        throw new TypeError(
          `Universal event prop ${JSON.stringify(name)} for renderer ${JSON.stringify(renderer)} must be a function, null, or undefined.`
        );
      }
      events.set(definition.type, {
        prop: name,
        type: definition.type,
        priority: definition.priority ?? "default",
        handler,
        owner: CURRENT_OWNER.record
      });
      continue;
    }
    props[name] = currentAttempt().root.encodeHostProp(node.type, name, handler);
  }
  const children = [];
  if ((node.children?.length ?? 0) > 0) {
    for (let index = 0; index < node.children.length; index++) {
      children.push(
        ...materializeNode(node.children[index], values, renderer, [...path, "host", index])
      );
    }
  } else if (dynamicChildren !== void 0) {
    children.push(...materializeValue(dynamicChildren, renderer, null, [...path, "host-children"]));
  }
  return [
    {
      kind: "host",
      key: hostKey,
      type: node.type,
      props,
      ref,
      owner: CURRENT_OWNER.record,
      events,
      lifecycles,
      localCallbacks,
      visibility: CURRENT_OWNER.visibility,
      children
    }
  ];
}
function materializePlanValue(value, expectedRenderer, path = []) {
  if (value.plan.renderer !== expectedRenderer) {
    throw new Error(
      `Universal renderer mismatch: root expects ${JSON.stringify(expectedRenderer)} but the plan targets ${JSON.stringify(value.plan.renderer)}.`
    );
  }
  const nodes = materializeNode(value.plan.root, value.values, expectedRenderer, [...path, "plan"]);
  if (value.key === null) return nodes;
  if (nodes.length === 1) {
    nodes[0].key = value.key;
    return nodes;
  }
  return [{ kind: "range", key: value.key, children: nodes }];
}
function sameRecordShape(record, blueprint) {
  return record.kind === blueprint.kind && Object.is(record.key, blueprint.key) && (record.kind !== "host" || record.type === blueprint.type);
}
function createLogicalRecord(id, blueprint) {
  return {
    id,
    kind: blueprint.kind,
    key: blueprint.key,
    type: blueprint.kind === "host" ? blueprint.type : null,
    props: {},
    ref: null,
    refCleanup: null,
    refAttached: false,
    owner: null,
    events: /* @__PURE__ */ new Map(),
    lifecycles: /* @__PURE__ */ new Map(),
    localCallbacks: /* @__PURE__ */ new Map(),
    visibility: blueprint.kind === "host" ? blueprint.visibility : "visible",
    portalRegistration: null,
    parent: null,
    children: []
  };
}
function shallowPropsEqual(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key) || !Object.is(left[key], right[key])) {
      return false;
    }
  }
  return true;
}
function physicalRecords(records) {
  const output = [];
  for (const record of records) {
    if (record.kind === "host") output.push(record);
    else if (record.kind === "range") output.push(...physicalRecords(record.children));
  }
  return output;
}
function physicalDrafts(records) {
  const output = [];
  for (const record of records) {
    if (record.record.kind === "host") output.push(record);
    else if (record.record.kind === "range") output.push(...physicalDrafts(record.children));
  }
  return output;
}
function walkLogical(record, visit) {
  visit(record);
  for (const child of record.children) walkLogical(child, visit);
}
function walkDraft(record, visit) {
  visit(record);
  for (const child of record.children) walkDraft(child, visit);
}
function walkDraftPostOrder(record, visit) {
  for (const child of record.children) walkDraftPostOrder(child, visit);
  visit(record);
}
function collectRemovedPostOrder(record, output) {
  for (const child of record.children) collectRemovedPostOrder(child, output);
  if (record.kind === "host") output.push(record);
}
function detachRef(record, ref = record.ref, refCleanup = record.refCleanup) {
  if (ref == null || !record.refAttached) return;
  record.refAttached = false;
  if (refCleanup !== null) {
    if (record.refCleanup === refCleanup) record.refCleanup = null;
    refCleanup();
    return;
  }
  const tasks = [];
  const collect = (value) => {
    if (Array.isArray(value)) {
      for (const nested of value) collect(nested);
    } else if (typeof value === "function") {
      tasks.push(() => value(null));
    } else if (value !== null && typeof value === "object") {
      tasks.push(() => {
        value.current = null;
      });
    }
  };
  collect(ref);
  runCommitTasks(tasks);
}
function attachRef(record, value) {
  const ref = record.ref;
  if (ref == null) return;
  record.refAttached = true;
  const cleanupTasks = [];
  const attachTasks = [];
  const collect = (target) => {
    if (Array.isArray(target)) {
      for (const nested of target) collect(nested);
    } else if (typeof target === "function") {
      attachTasks.push(() => {
        const cleanupIndex = cleanupTasks.length;
        cleanupTasks.push(() => target(null));
        const cleanup = target(value);
        if (typeof cleanup === "function") cleanupTasks[cleanupIndex] = cleanup;
      });
    } else if (target !== null && typeof target === "object") {
      attachTasks.push(() => {
        target.current = value;
        cleanupTasks.push(() => {
          target.current = null;
        });
      });
    }
  };
  collect(ref);
  record.refCleanup = () => runCommitTasks(cleanupTasks);
  runCommitTasks(attachTasks);
}
function runCommitTasks(tasks) {
  let hasError = false;
  let firstError;
  UNIVERSAL_COMMIT_TASK_DEPTH++;
  try {
    for (const task of tasks) {
      try {
        task();
      } catch (error) {
        if (!hasError) {
          hasError = true;
          firstError = error;
        }
      }
    }
  } finally {
    UNIVERSAL_COMMIT_TASK_DEPTH--;
  }
  if (hasError) throw firstError;
}
function depsEqual(left, right) {
  if (left === null || right === null || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    if (!Object.is(left[index], right[index])) return false;
  }
  return true;
}
function suspendedOwnerPathEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    const leftSegment = left[index];
    const rightSegment = right[index];
    if (leftSegment.component !== rightSegment.component || !Object.is(leftSegment.key, rightSegment.key) || leftSegment.ordinal !== rightSegment.ordinal || !identityPathEqual(leftSegment.identityPath, rightSegment.identityPath)) {
      return false;
    }
  }
  return true;
}
function isThenable(value) {
  return value !== null && typeof value === "object" && typeof value.then === "function" || typeof value === "function" && typeof value.then === "function";
}
function findSuspendedMemo(owner, slot, deps) {
  if (deps === null) return null;
  for (const entry of currentAttempt().replayEntries) {
    if (Object.is(entry.slot, slot) && depsEqual(entry.deps, deps) && suspendedOwnerPathEqual(entry.ownerPath, owner.replayPath)) {
      return entry;
    }
  }
  return null;
}
function collectSuspendedMemos(attempt) {
  const entries = [];
  for (let ownerIndex = attempt.owners.length - 1; ownerIndex >= 0; ownerIndex--) {
    const owner = attempt.owners[ownerIndex];
    for (const [slot, hook] of owner.hooks) {
      if (hook.kind !== "memo" || hook.deps === null || !isThenable(hook.value) || owner.record.hooks.get(slot) === hook) {
        continue;
      }
      if (entries.some(
        (entry) => Object.is(entry.slot, slot) && suspendedOwnerPathEqual(entry.ownerPath, owner.replayPath)
      )) {
        continue;
      }
      entries.push({
        ownerPath: owner.replayPath,
        slot,
        deps: hook.deps,
        value: hook.value
      });
    }
  }
  return entries;
}
function currentAttempt() {
  if (CURRENT_ATTEMPT === null) {
    throw new Error("Universal hooks may only run while a universal component is rendering.");
  }
  return CURRENT_ATTEMPT;
}
function resolveHookSlot(slot) {
  currentAttempt();
  const owner = CURRENT_OWNER;
  if (owner === null) {
    throw new Error("Universal hooks require an active component owner.");
  }
  const own = slot ?? `implicit:${owner.implicitSlot++}`;
  if (UNIVERSAL_SLOT_STACK.length === 0) return own;
  let key = "@octane:universal-hook:";
  for (const part of [...UNIVERSAL_SLOT_STACK, own]) {
    const value = typeof part === "symbol" ? `s${part.description?.length ?? 0}:${part.description ?? ""}` : `v${String(part).length}:${String(part)}`;
    key += value;
  }
  return Symbol.for(key);
}
function hookSlots(count) {
  const base = NEXT_HOOK_SLOT;
  NEXT_HOOK_SLOT += count;
  return base;
}
function withSlot(slot, fn, ...args) {
  UNIVERSAL_SLOT_STACK.push(slot);
  try {
    return fn(...args);
  } finally {
    UNIVERSAL_SLOT_STACK.pop();
  }
}
function scheduleOwner(owner, slot) {
  if (owner.disposed) return;
  __profileSchedule(
    owner,
    "state",
    typeof slot === "symbol" || typeof slot === "number" ? slot : void 0
  );
  owner.root.schedule();
}
function currentDraftOwner() {
  currentAttempt();
  if (CURRENT_OWNER === null) {
    throw new Error("Universal hooks require an active component owner.");
  }
  return CURRENT_OWNER;
}
function findDraftOwner(record) {
  const attempt = CURRENT_ATTEMPT;
  if (attempt === null) return null;
  for (let index = attempt.owners.length - 1; index >= 0; index--) {
    if (attempt.owners[index].record === record) return attempt.owners[index];
  }
  return null;
}
function applyStateUpdates(value, updates) {
  let next = value;
  for (const update of updates) {
    next = typeof update === "function" ? update(next) : update;
  }
  return next;
}
function cloneStateHook(owner, slot) {
  let hook = owner.hooks.get(slot);
  if (hook?.kind !== "state") return void 0;
  if (!owner.clonedHooks.has(slot)) {
    hook = { ...hook };
    owner.hooks.set(slot, hook);
    owner.clonedHooks.add(slot);
    const updates = owner.record.updates.get(slot);
    if (updates !== void 0 && updates.length > 0) {
      hook.value = applyStateUpdates(hook.value, updates);
      owner.appliedUpdates.set(slot, updates.length);
    }
  }
  return hook;
}
function projectedStateValue(record, slot, fallback) {
  const draft = findDraftOwner(record);
  const draftHook = draft?.hooks.get(slot);
  if (draftHook?.kind === "state") return draftHook.value;
  const hook = record.hooks.get(slot);
  const value = hook?.kind === "state" ? hook.value : fallback;
  return applyStateUpdates(value, record.updates.get(slot) ?? []);
}
function useState(initial, slot) {
  const owner = currentDraftOwner();
  const resolved = resolveHookSlot(slot);
  let hook = cloneStateHook(owner, resolved);
  if (hook?.kind !== "state") {
    const record = owner.record;
    const initialValue = typeof initial === "function" ? initial() : initial;
    hook = {
      kind: "state",
      value: initialValue,
      set(value) {
        if (record.disposed) return;
        const draft = findDraftOwner(record);
        if (draft !== null) {
          const live = cloneStateHook(draft, resolved);
          if (live === void 0) return;
          const next2 = typeof value === "function" ? value(live.value) : value;
          if (Object.is(next2, live.value)) return;
          live.value = next2;
          draft.needsRender = true;
          return;
        }
        const previous = projectedStateValue(record, resolved, initialValue);
        const next = typeof value === "function" ? value(previous) : value;
        if (Object.is(next, previous)) return;
        const updates = record.updates.get(resolved) ?? [];
        updates.push(value);
        record.updates.set(resolved, updates);
        scheduleOwner(record, resolved);
      },
      get() {
        return projectedStateValue(record, resolved, initialValue);
      }
    };
    owner.hooks.set(resolved, hook);
    owner.clonedHooks.add(resolved);
  }
  return [hook.value, hook.set, hook.get];
}
const __useStateWithGetter = useState;
function useReducer(reducer, initialArg, initOrSlot, maybeSlot) {
  const init = typeof initOrSlot === "function" ? initOrSlot : null;
  const slot = maybeSlot ?? (init === null ? initOrSlot : void 0);
  const owner = currentDraftOwner();
  const resolved = resolveHookSlot(slot);
  let hook = owner.hooks.get(resolved);
  if (hook?.kind !== "reducer") {
    const record = owner.record;
    const initialValue = init === null ? initialArg : init(initialArg);
    hook = {
      kind: "reducer",
      value: initialValue,
      reducer,
      dispatch(action) {
        if (record.disposed) return;
        const draft = findDraftOwner(record);
        if (draft !== null) {
          let live = draft.hooks.get(resolved);
          if (live?.kind !== "reducer") return;
          if (!draft.clonedHooks.has(resolved)) {
            live = { ...live };
            draft.hooks.set(resolved, live);
            draft.clonedHooks.add(resolved);
          }
          const next = live.reducer(live.value, action);
          if (Object.is(next, live.value)) return;
          live.value = next;
          draft.needsRender = true;
          return;
        }
        const updates = record.updates.get(resolved) ?? [];
        updates.push(action);
        record.updates.set(resolved, updates);
        scheduleOwner(record, resolved);
      },
      get() {
        const draft = findDraftOwner(record);
        const draftHook = draft?.hooks.get(resolved);
        if (draftHook?.kind === "reducer") return draftHook.value;
        const committed = record.hooks.get(resolved);
        let value = committed?.kind === "reducer" ? committed.value : initialValue;
        for (const update of record.updates.get(resolved) ?? []) {
          value = (committed?.reducer ?? reducer)(value, update);
        }
        return value;
      }
    };
    owner.hooks.set(resolved, hook);
    owner.clonedHooks.add(resolved);
  } else {
    if (!owner.clonedHooks.has(resolved)) {
      hook = { ...hook };
      owner.hooks.set(resolved, hook);
      owner.clonedHooks.add(resolved);
      const updates = owner.record.updates.get(resolved);
      if (updates !== void 0 && updates.length > 0) {
        for (const action of updates) hook.value = reducer(hook.value, action);
        owner.appliedUpdates.set(resolved, updates.length);
      }
    }
    hook.reducer = reducer;
  }
  return [hook.value, hook.dispatch, hook.get];
}
const __useReducerWithGetter = useReducer;
function enqueueUniversalEffect(phase, create, deps, slot) {
  const owner = currentDraftOwner();
  const resolved = resolveHookSlot(slot);
  const previous = owner.record.hooks.get(resolved);
  const hook = {
    kind: "effect",
    owner: owner.record,
    slot: resolved,
    phase,
    create,
    deps: deps === void 0 ? null : deps,
    cleanup: previous?.kind === "effect" ? previous.cleanup : null,
    mounted: previous?.kind === "effect" ? previous.mounted : false,
    previous: previous?.kind === "effect" ? previous : null
  };
  owner.hooks.set(resolved, hook);
  owner.clonedHooks.add(resolved);
  owner.seenEffects.push(hook);
}
function useInsertionEffect(create, deps, slot) {
  enqueueUniversalEffect("insertion", create, deps, slot);
}
function useLayoutEffect(create, deps, slot) {
  enqueueUniversalEffect("layout", create, deps, slot);
}
function useEffect(create, deps, slot) {
  enqueueUniversalEffect("passive", create, deps, slot);
}
function useMemo(compute, deps, slot) {
  const owner = currentDraftOwner();
  const resolved = resolveHookSlot(slot);
  const previous = owner.hooks.get(resolved);
  const normalized = deps === void 0 ? null : deps;
  if (previous?.kind === "memo" && depsEqual(previous.deps, normalized)) return previous.value;
  const replayed = findSuspendedMemo(owner, resolved, normalized);
  if (replayed !== null) {
    const value2 = replayed.value;
    owner.hooks.set(resolved, { kind: "memo", value: value2, deps: normalized });
    owner.clonedHooks.add(resolved);
    return value2;
  }
  const warmed = takeUniversalWarmValue(owner.record.root, resolved, normalized);
  const value = warmed === NO_WARM_VALUE ? compute(...normalized ?? []) : warmed;
  owner.hooks.set(resolved, { kind: "memo", value, deps: normalized });
  owner.clonedHooks.add(resolved);
  return value;
}
function useCallback(callback, deps, slot) {
  return useMemo(() => callback, deps, slot);
}
function useRef(initial, slot) {
  const owner = currentDraftOwner();
  const resolved = resolveHookSlot(slot);
  let hook = owner.hooks.get(resolved);
  if (hook?.kind !== "ref") {
    const record = owner.record;
    const value = {};
    Object.defineProperty(value, "current", {
      enumerable: true,
      get() {
        const draft = findDraftOwner(record);
        const live = draft?.hooks.get(resolved) ?? record.hooks.get(resolved);
        return live?.kind === "ref" ? live.current : initial;
      },
      set(next) {
        const draft = findDraftOwner(record);
        if (draft !== null) {
          let live2 = draft.hooks.get(resolved);
          if (live2?.kind !== "ref") return;
          if (!draft.clonedHooks.has(resolved)) {
            live2 = { ...live2 };
            draft.hooks.set(resolved, live2);
            draft.clonedHooks.add(resolved);
          }
          live2.current = next;
          return;
        }
        const live = record.hooks.get(resolved);
        if (live?.kind === "ref") live.current = next;
      }
    });
    hook = { kind: "ref", current: initial, value };
    owner.hooks.set(resolved, hook);
    owner.clonedHooks.add(resolved);
  }
  return hook.value;
}
function useId(slot) {
  const owner = currentDraftOwner();
  const resolved = resolveHookSlot(slot);
  let hook = owner.hooks.get(resolved);
  if (hook?.kind !== "id") {
    const attempt = currentAttempt();
    hook = {
      kind: "id",
      value: attempt.root.formatUniversalId(attempt.nextUniversalId++)
    };
    owner.hooks.set(resolved, hook);
    owner.clonedHooks.add(resolved);
  }
  return hook.value;
}
function useSyncExternalStore(subscribe, getSnapshot, ...serverSnapshotAndSlot) {
  let slot;
  if (serverSnapshotAndSlot.length === 1) {
    slot = typeof serverSnapshotAndSlot[0] === "function" ? void 0 : serverSnapshotAndSlot[0];
  } else if (serverSnapshotAndSlot.length > 1) {
    slot = serverSnapshotAndSlot[serverSnapshotAndSlot.length - 1];
  }
  const base = resolveHookSlot(slot);
  return withSlot(base, () => {
    const snapshot = getSnapshot();
    const [, invalidate] = useState(0, "state");
    useLayoutEffect(
      () => {
        let current = snapshot;
        const check = () => {
          const next = getSnapshot();
          if (Object.is(current, next)) return;
          current = next;
          invalidate((value) => value + 1);
        };
        const unsubscribe = subscribe(check);
        check();
        return unsubscribe;
      },
      [subscribe, getSnapshot, snapshot],
      "subscribe"
    );
    return snapshot;
  });
}
function useDeferredValue(value, _initialValue, _slot) {
  return value;
}
function useTransition(_slot) {
  return [false, startTransition];
}
function useActionState(action, initialState, _permalinkOrSlot, maybeSlot) {
  const slot = maybeSlot ?? (typeof _permalinkOrSlot === "string" ? void 0 : _permalinkOrSlot);
  const base = resolveHookSlot(slot);
  return withSlot(base, () => {
    const [state, setState, getState] = useState(initialState, "state");
    const [pending, setPending] = useState(false, "pending");
    const dispatch = useCallback(
      (payload) => {
        let result;
        try {
          result = action(getState(), payload);
        } catch (error) {
          queueMicrotask(() => {
            throw error;
          });
          return;
        }
        if (result != null && typeof result.then === "function") {
          setPending(true);
          Promise.resolve(result).then(
            (value) => {
              setState(value);
              setPending(false);
            },
            (error) => {
              setPending(false);
              queueMicrotask(() => {
                throw error;
              });
            }
          );
        } else {
          setState(result);
        }
      },
      [action],
      "dispatch"
    );
    return [state, dispatch, pending];
  });
}
const UNIVERSAL_FORM_STATUS = Object.freeze({
  pending: false,
  data: null,
  method: null,
  action: null
});
function useFormStatus() {
  return UNIVERSAL_FORM_STATUS;
}
function useOptimistic(passthrough, ...reducerAndSlot) {
  const defaultReducer = (_state, action) => action;
  let reducer = defaultReducer;
  let slot;
  if (reducerAndSlot.length === 1) {
    if (typeof reducerAndSlot[0] === "function") {
      reducer = reducerAndSlot[0];
    } else {
      slot = reducerAndSlot[0];
    }
  } else if (reducerAndSlot.length > 1) {
    if (typeof reducerAndSlot[0] === "function") {
      reducer = reducerAndSlot[0];
    }
    slot = reducerAndSlot[reducerAndSlot.length - 1];
  }
  const [optimistic, dispatch] = useReducer(reducer, passthrough, slot);
  return [Object.is(optimistic, passthrough) ? passthrough : optimistic, dispatch];
}
function useContext(context) {
  return readOwnerContext(currentDraftOwner(), context);
}
function trackUniversalThenable(thenable) {
  if (thenable.status === "pending" || thenable.status === "fulfilled" || thenable.status === "rejected")
    return;
  thenable.status = "pending";
  thenable.then(
    (value) => {
      thenable.status = "fulfilled";
      thenable.value = value;
    },
    (error) => {
      thenable.status = "rejected";
      thenable.reason = error;
    }
  );
}
const UNIVERSAL_WARM_CACHES = /* @__PURE__ */ new WeakMap();
let CURRENT_UNIVERSAL_WARM = null;
let UNIVERSAL_WARM_DEPTH = 0;
const UNIVERSAL_WARM_DEPTH_CAP = 64;
const NO_WARM_VALUE = /* @__PURE__ */ Symbol("octane.universal.no-warm-value");
function takeUniversalWarmValue(root, slot, deps) {
  if (deps === null) return NO_WARM_VALUE;
  const cache = UNIVERSAL_WARM_CACHES.get(root);
  const entries = cache?.get(slot);
  if (entries === void 0) return NO_WARM_VALUE;
  for (let index = 0; index < entries.length; index++) {
    if (!depsEqual(entries[index].deps, deps)) continue;
    const [entry] = entries.splice(index, 1);
    if (entries.length === 0) cache.delete(slot);
    return entry.value;
  }
  return NO_WARM_VALUE;
}
function useBatch(items, warm) {
  let pending = null;
  for (const item of items) {
    if (item == null || typeof item.then !== "function") continue;
    const thenable = item;
    trackUniversalThenable(thenable);
    if (thenable.status === "rejected") break;
    if (thenable.status === "pending") (pending ??= []).push(thenable);
  }
  if (pending === null) return;
  if (warm !== void 0) {
    const root = currentAttempt().root;
    let cache = UNIVERSAL_WARM_CACHES.get(root);
    if (cache === void 0) {
      cache = /* @__PURE__ */ new Map();
      UNIVERSAL_WARM_CACHES.set(root, cache);
    }
    const previous = CURRENT_UNIVERSAL_WARM;
    CURRENT_UNIVERSAL_WARM = cache;
    try {
      warm();
    } catch {
    } finally {
      CURRENT_UNIVERSAL_WARM = previous;
    }
  }
  if (pending.length === 1) throw new UniversalSuspense(pending[0]);
  let remaining = pending.length;
  const combined = new Promise((resolve, reject) => {
    for (const thenable of pending) {
      thenable.then(() => {
        if (--remaining === 0) resolve();
      }, reject);
    }
  });
  throw new UniversalSuspense(combined);
}
function warmMemo(compute, deps, slot) {
  const cache = CURRENT_UNIVERSAL_WARM;
  if (cache === null) return;
  let entries = cache.get(slot);
  if (entries?.some((entry) => depsEqual(entry.deps, deps))) return;
  let value;
  try {
    value = compute();
  } catch {
    return;
  }
  if (value != null && typeof value.then === "function") {
    trackUniversalThenable(value);
  }
  if (entries === void 0) {
    entries = [];
    cache.set(slot, entries);
  }
  entries.push({ deps: [...deps], value });
  if (entries.length > 64) entries.shift();
}
function warmChild(component, props) {
  if (CURRENT_UNIVERSAL_WARM === null || component == null) return;
  const plan = component.__warm;
  if (typeof plan !== "function" || UNIVERSAL_WARM_DEPTH >= UNIVERSAL_WARM_DEPTH_CAP) return;
  UNIVERSAL_WARM_DEPTH++;
  try {
    plan(props);
  } catch {
  } finally {
    UNIVERSAL_WARM_DEPTH--;
  }
}
function use(usable) {
  if (usable?.$$kind === /* @__PURE__ */ Symbol.for("octane.context")) {
    return useContext(usable);
  }
  const thenable = usable;
  if (thenable.status === "fulfilled") return thenable.value;
  if (thenable.status === "rejected") throw thenable.reason;
  trackUniversalThenable(thenable);
  throw new UniversalSuspense(thenable);
}
function useImperativeHandle(ref, create, deps, slot) {
  useLayoutEffect(
    () => {
      const value = create();
      if (typeof ref === "function") ref(value);
      else if (ref !== null) ref.current = value;
      return () => {
        if (typeof ref === "function") ref(null);
        else if (ref !== null) ref.current = null;
      };
    },
    deps,
    slot
  );
}
function useEffectEvent(fn, slot) {
  const owner = currentDraftOwner();
  const resolved = resolveHookSlot(slot);
  let hook = owner.hooks.get(resolved);
  if (hook?.kind !== "effect-event") {
    const cell = { impl: fn, active: false };
    const value = ((...args) => {
      if (!cell.active) throw new Error("A universal Effect Event cannot run before commit.");
      return cell.impl(...args);
    });
    hook = { kind: "effect-event", cell, next: fn, value };
  } else {
    hook = { ...hook, next: fn };
  }
  owner.hooks.set(resolved, hook);
  owner.clonedHooks.add(resolved);
  return hook.value;
}
function useDebugValue() {
}
function startTransition(fn) {
  void fn();
}
function requestFormReset() {
}
function memo(component, _compare) {
  return component;
}
function createPortal(children, target) {
  return Object.freeze({ $$kind: UNIVERSAL_PORTAL, children, target });
}
const Activity = /* @__PURE__ */ Symbol.for("octane.Activity");
function runEffectCreate(hook) {
  const cleanup = hook.create(
    ...hook.deps ?? []
  );
  hook.cleanup = typeof cleanup === "function" ? cleanup : null;
  hook.mounted = true;
}
function runEffectCleanup(hook) {
  const cleanup = hook.cleanup;
  hook.cleanup = null;
  hook.mounted = false;
  cleanup?.();
}
function routeUniversalOwnerError(owner, error) {
  for (let current = owner.parent; current !== null; current = current.parent) {
    if (!current.isBoundary || current.disposed) continue;
    current.boundaryThenable = null;
    current.boundaryError = error;
    current.hasBoundaryError = true;
    current.root.schedule();
    return true;
  }
  return false;
}
function routeUniversalOwnerSuspense(owner, thenable) {
  for (let current = owner.parent; current !== null; current = current.parent) {
    if (!current.isBoundary || !current.canHandleSuspense || current.disposed) continue;
    current.boundaryThenable = thenable;
    current.boundaryError = void 0;
    current.hasBoundaryError = false;
    const settle = () => {
      if (current.disposed || current.boundaryThenable !== thenable) return;
      current.boundaryThenable = null;
      current.root.schedule();
    };
    thenable.then(settle, settle);
    current.root.schedule();
    return true;
  }
  return false;
}
function runOwnedEffectCreate(hook) {
  try {
    runEffectCreate(hook);
  } catch (error) {
    if (!routeUniversalOwnerError(hook.owner, error)) throw error;
  }
}
function runOwnedEffectCleanup(hook) {
  try {
    runEffectCleanup(hook);
  } catch (error) {
    if (!routeUniversalOwnerError(hook.owner, error)) throw error;
  }
}
function runOwnedCommit(owner, work) {
  try {
    work();
  } catch (error) {
    if (owner === null || !routeUniversalOwnerError(owner, error)) throw error;
  }
}
function cloneSerializableValue(value, seen = /* @__PURE__ */ new WeakSet()) {
  if (value === null || value === void 0 || typeof value === "string" || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError(`Unsupported serializable host value ${String(value)}.`);
  }
  if (value.$$kind === "octane.universal.resource") {
    throw new TypeError("A resource handle must use the resource encoding branch.");
  }
  if (seen.has(value)) throw new TypeError("Serializable host values cannot contain cycles.");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return Object.freeze(value.map((entry) => cloneSerializableValue(entry, seen)));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(
        `Serializable host values require plain objects, received ${Object.prototype.toString.call(value)}.`
      );
    }
    const output = {};
    for (const [name, entry] of Object.entries(value)) {
      Object.defineProperty(output, name, {
        configurable: true,
        enumerable: true,
        value: cloneSerializableValue(entry, seen),
        writable: true
      });
    }
    return Object.freeze(output);
  } finally {
    seen.delete(value);
  }
}
function freezeUniversalHostBatch(renderer, version, commands) {
  const frozenCommands = commands.map((command) => {
    if ((command.op === "event" || command.op === "lifecycle" || command.op === "local-callback") && command.listener !== null) {
      Object.freeze(command.listener);
    }
    return Object.freeze(command);
  });
  return Object.freeze({
    renderer,
    version,
    commands: Object.freeze(frozenCommands)
  });
}
function collectEffectEventCells(owners) {
  const cells = [];
  for (const owner of owners) {
    for (const hook of owner.hooks.values()) {
      if (hook.kind === "effect-event") cells.push(hook.cell);
    }
  }
  return cells;
}
function deactivateEffectEventCells(cells) {
  for (const cell of cells) cell.active = false;
}
class UniversalRootImpl {
  constructor(container, driver, transport) {
    this.container = container;
    this.driver = driver;
    this.transport = transport;
    assertRendererId(driver.id, "Universal driver id");
    this.renderer = driver.id;
    this.rootRecord = {
      id: 0,
      kind: "range",
      key: null,
      type: null,
      props: {},
      ref: null,
      refCleanup: null,
      refAttached: false,
      owner: null,
      events: /* @__PURE__ */ new Map(),
      lifecycles: /* @__PURE__ */ new Map(),
      localCallbacks: /* @__PURE__ */ new Map(),
      visibility: "visible",
      portalRegistration: null,
      parent: null,
      children: []
    };
  }
  container;
  driver;
  transport;
  renderer;
  rootRecord;
  universalIdRoot = NEXT_UNIVERSAL_ID_ROOT++;
  resourceRoot = NEXT_RESOURCE_ROOT++;
  portalRoot = NEXT_PORTAL_ROOT++;
  portalHandles = /* @__PURE__ */ new Map();
  owner = null;
  bridge = null;
  unmounted = false;
  nextId = 1;
  nextUniversalId = 1;
  nextListener = NEXT_EVENT_ROOT++ * 1e6;
  nextBatchVersion = 1;
  handlers = /* @__PURE__ */ new Map();
  localCallbacks = /* @__PURE__ */ new Map();
  publishedListeners = /* @__PURE__ */ new Set();
  pending = null;
  suspended = null;
  awaitingReplay = null;
  queuedReplay = null;
  rootRetryAttempt = null;
  lastComponent = null;
  lastProps;
  scheduled = false;
  eventScopeDepth = 0;
  eventScopePriority = null;
  eventScopeHandlers = null;
  passiveScheduled = false;
  passiveTasks = [];
  setBridge(bridge) {
    if (this.bridge !== null && this.bridge !== bridge) {
      throw new Error("A universal root cannot be owned by more than one host boundary.");
    }
    this.bridge = bridge;
  }
  clearBridge(bridge) {
    if (this.bridge === bridge) this.bridge = null;
  }
  readBridgeContext(context) {
    if (this.bridge === null) return context.defaultValue;
    return this.bridge.readContext(context);
  }
  rootRecordForRetention() {
    return this.rootRecord;
  }
  formatUniversalId(index) {
    const sum = this.universalIdRoot + index;
    const paired = sum * (sum + 1) / 2 + index;
    return `:octane-u${paired.toString(36)}:`;
  }
  classifyEvent(name) {
    return this.driver.events?.classify(name) ?? null;
  }
  classifyLifecycle(name, value) {
    return this.driver.lifecycles?.classify(name, value) ?? null;
  }
  classifyLocalCallback(name, value) {
    return this.driver.localCallbacks?.classify(name, value) ?? null;
  }
  textPolicy() {
    return this.driver.capabilities?.text ?? "reject";
  }
  driverCapabilities() {
    return this.driver.capabilities ?? {};
  }
  createPortalTargetHandle(id) {
    if (typeof id !== "string" && typeof id !== "number" || String(id).length === 0) {
      throw new TypeError(
        "A universal portal target handle ID must be a non-empty string or number."
      );
    }
    const previous = this.portalHandles.get(id);
    if (previous !== void 0) return previous;
    const handle = Object.freeze({
      $$kind: "octane.universal.portal-target",
      renderer: this.renderer,
      root: this.portalRoot,
      id
    });
    this.portalHandles.set(id, handle);
    return handle;
  }
  preparePortalTarget(target) {
    const capability = this.driver.portals;
    if (capability === void 0) {
      throw new Error(
        `Universal renderer ${JSON.stringify(this.renderer)} does not declare the portal capability.`
      );
    }
    const registration = capability.prepareTarget({
      container: this.container,
      renderer: this.renderer,
      target,
      transported: this.transport !== null,
      createPortalTargetHandle: (id) => this.createPortalTargetHandle(id)
    });
    const release = registration !== null && typeof registration === "object" && typeof registration.release === "function" ? registration.release.bind(registration) : null;
    try {
      if (registration === null || typeof registration !== "object" || release === null) {
        throw new TypeError(
          "A universal portal capability must return a valid target registration."
        );
      }
      const handle = registration.handle;
      if (handle?.$$kind !== "octane.universal.portal-target" || handle.renderer !== this.renderer || handle.root !== this.portalRoot || typeof handle.id !== "string" && typeof handle.id !== "number" || this.portalHandles.get(handle.id) !== handle) {
        throw new Error(
          `Universal portal target handle does not belong to renderer ${JSON.stringify(this.renderer)} and this root.`
        );
      }
      let released = false;
      return Object.freeze({
        handle,
        release() {
          if (released) return;
          released = true;
          release();
        }
      });
    } catch (error) {
      try {
        release?.();
      } catch {
      }
      throw error;
    }
  }
  encodeHostProp(hostType, name, value) {
    const codec = this.driver.props;
    if (codec === void 0) return value;
    const result = codec.encode({
      container: this.container,
      renderer: this.renderer,
      hostType,
      name,
      value,
      createResourceHandle: (id) => {
        if (typeof id !== "string" && typeof id !== "number" || String(id).length === 0) {
          throw new TypeError(
            "A universal resource handle ID must be a non-empty string or number."
          );
        }
        return Object.freeze({
          $$kind: "octane.universal.resource",
          renderer: this.renderer,
          root: this.resourceRoot,
          id
        });
      }
    });
    if (result === null || typeof result !== "object") {
      throw new TypeError(
        `Universal prop codec for ${JSON.stringify(name)} returned an invalid result.`
      );
    }
    if (result.kind === "unsupported") {
      throw new TypeError(
        result.reason ?? `Universal renderer ${JSON.stringify(this.renderer)} does not support host prop ${JSON.stringify(name)}.`
      );
    }
    if (result.kind === "value") return cloneSerializableValue(result.value);
    if (result.kind !== "resource") {
      throw new TypeError(
        `Universal prop codec for ${JSON.stringify(name)} returned unknown encoding ${JSON.stringify(result.kind)}.`
      );
    }
    const handle = result.handle;
    if (handle?.$$kind !== "octane.universal.resource" || handle.renderer !== this.renderer || handle.root !== this.resourceRoot || typeof handle.id !== "string" && typeof handle.id !== "number") {
      throw new Error(
        `Universal resource handle for ${JSON.stringify(name)} does not belong to renderer ${JSON.stringify(this.renderer)} and this root.`
      );
    }
    return handle;
  }
  eventScope(priority, run) {
    if (priority !== "discrete" && priority !== "continuous" && priority !== "default") {
      throw new TypeError(`Unknown universal event priority ${JSON.stringify(priority)}.`);
    }
    if (this.eventScopeDepth > 0) {
      if (this.eventScopePriority !== priority) {
        throw new Error(
          `Nested universal event scopes must retain priority ${JSON.stringify(this.eventScopePriority)}.`
        );
      }
      this.eventScopeDepth++;
      try {
        return run();
      } finally {
        this.eventScopeDepth--;
      }
    }
    this.eventScopeDepth = 1;
    this.eventScopePriority = priority;
    this.eventScopeHandlers = this.handlers;
    try {
      return run();
    } finally {
      this.eventScopeDepth = 0;
      this.eventScopePriority = null;
      this.eventScopeHandlers = null;
      if (this.scheduled) {
        if (priority === "discrete") this.flushScheduledWork();
        else this.queueScheduledWork();
      }
    }
  }
  dispatchEvent(listener, payload) {
    if (this.eventScopeDepth === 0) {
      const event2 = this.handlers.get(listener);
      if (event2 === void 0 || event2.owner.disposed) {
        throw new Error(`Unknown or inactive universal event listener ${listener}.`);
      }
      return this.eventScope(event2.priority, () => this.dispatchEvent(listener, payload));
    }
    const event = this.eventScopeHandlers.get(listener);
    if (event === void 0) {
      throw new Error(`Unknown or inactive universal event listener ${listener}.`);
    }
    let result;
    try {
      result = event.handler(payload);
    } catch (error) {
      if (!routeUniversalOwnerError(event.owner, error)) throw error;
    }
    return result;
  }
  invokeLocalCallback(listener, args) {
    const callback = this.localCallbacks.get(listener);
    if (callback === void 0 || callback.owner.disposed) {
      throw new Error(`Unknown or inactive universal local callback ${listener}.`);
    }
    let result;
    runOwnedCommit(callback.owner, () => {
      result = callback.handler(...args);
    });
    if (typeof result !== "function") return result;
    const cleanup = result;
    return () => runOwnedCommit(callback.owner, cleanup);
  }
  flushScheduledWork() {
    if (!this.scheduled) return;
    this.scheduled = false;
    SCHEDULED_UNIVERSAL_ROOTS.delete(this);
    if (this.unmounted || this.owner?.disposed || this.lastComponent === null) return;
    if (this.bridge !== null) this.bridge.invalidate();
    else this.render(this.lastComponent, this.lastProps);
  }
  queueScheduledWork() {
    if (!this.scheduled) return;
    if (UNIVERSAL_SYNC_DEPTH > 0) return;
    if (this.bridge !== null) {
      this.scheduled = false;
      SCHEDULED_UNIVERSAL_ROOTS.delete(this);
      this.bridge.invalidate();
      return;
    }
    queueMicrotask(() => this.flushScheduledWork());
  }
  schedule() {
    if (this.unmounted || this.owner?.disposed || this.lastComponent === null || this.scheduled)
      return;
    this.scheduled = true;
    SCHEDULED_UNIVERSAL_ROOTS.add(this);
    if (this.eventScopeDepth === 0 && UNIVERSAL_SYNC_DEPTH === 0) this.queueScheduledWork();
  }
  cancelSuspendedReplays() {
    if (this.awaitingReplay !== null) this.awaitingReplay.active = false;
    if (this.queuedReplay !== null) this.queuedReplay.active = false;
    this.awaitingReplay = null;
    this.queuedReplay = null;
    this.rootRetryAttempt = null;
  }
  runReplay(replay) {
    if (!replay.active || this.queuedReplay !== replay || this.unmounted) return;
    this.queuedReplay = null;
    replay.active = false;
    this.rootRetryAttempt = null;
    const attempt = this.prepareWithReplay(replay.component, replay.props, replay.entries);
    if (attempt.status === "prepared") attempt.commit();
  }
  queueReplay(replay) {
    if (!replay.active || this.unmounted) return;
    if (this.awaitingReplay === replay) this.awaitingReplay = null;
    if (this.queuedReplay === replay) return;
    if (this.queuedReplay !== null) this.queuedReplay.active = false;
    this.queuedReplay = replay;
    if (this.bridge !== null) {
      this.bridge.invalidate();
      return;
    }
    queueMicrotask(() => this.runReplay(replay));
  }
  publishLocalReplay(thenables, entries, component, props) {
    if (this.awaitingReplay !== null) this.awaitingReplay.active = false;
    const replay = { entries, component, props, active: true };
    this.awaitingReplay = replay;
    for (const thenable of thenables) {
      thenable.then(
        () => this.queueReplay(replay),
        () => this.queueReplay(replay)
      );
    }
  }
  suspend(thenable, component, props, replayEntries) {
    const attempt = new UniversalSuspendedAttemptImpl(
      this,
      thenable,
      component,
      props,
      replayEntries
    );
    this.suspended = attempt;
    return attempt;
  }
  finishSuspension(attempt, schedule) {
    if (this.suspended === attempt) this.suspended = null;
    else if (this.rootRetryAttempt !== attempt) return;
    if (!schedule || this.unmounted) {
      if (this.rootRetryAttempt === attempt) {
        this.rootRetryAttempt = null;
        if (this.queuedReplay !== null) this.queuedReplay.active = false;
        this.queuedReplay = null;
      }
      return;
    }
    this.rootRetryAttempt = attempt;
    this.queueReplay({
      entries: attempt.replayEntries,
      component: attempt.component,
      props: attempt.props,
      active: true
    });
  }
  flushPassiveTasks() {
    PENDING_UNIVERSAL_PASSIVE_ROOTS.delete(this);
    this.passiveScheduled = false;
    if (this.passiveTasks.length === 0) return;
    const tasks = this.passiveTasks.splice(0);
    runCommitTasks(tasks);
  }
  enqueuePassive(task) {
    this.passiveTasks.push(task);
    PENDING_UNIVERSAL_PASSIVE_ROOTS.add(this);
    if (this.passiveScheduled) return;
    this.passiveScheduled = true;
    queueMicrotask(() => {
      this.flushPassiveTasks();
    });
  }
  flushPassivesBeforeRender() {
    this.flushPassiveTasks();
  }
  discardDraftOwners(owners) {
    const committed = /* @__PURE__ */ new Set();
    const collect = (owner) => {
      if (owner === null || committed.has(owner)) return;
      committed.add(owner);
      for (const child of owner.children) collect(child);
    };
    collect(this.owner);
    for (const draft of owners) {
      if (committed.has(draft.record)) continue;
      draft.record.disposed = true;
      for (const hook of draft.hooks.values()) {
        if (hook.kind === "effect-event") hook.cell.active = false;
      }
    }
  }
  prepare(component, props) {
    const bridgeReplay = this.bridge === null ? null : this.queuedReplay;
    if (bridgeReplay !== null && bridgeReplay.component === component && bridgeReplay.active) {
      this.queuedReplay = null;
      bridgeReplay.active = false;
      this.rootRetryAttempt = null;
      return this.prepareWithReplay(component, props, bridgeReplay.entries);
    }
    this.suspended?.abort();
    this.cancelSuspendedReplays();
    return this.prepareWithReplay(component, props, []);
  }
  prepareWithReplay(component, props, replayEntries) {
    if (this.unmounted) throw new Error("Cannot render an unmounted universal root.");
    this.flushPassivesBeforeRender();
    const metadata = getComponentMetadata(component);
    if (metadata.id !== this.renderer) {
      throw new Error(
        `Universal renderer mismatch: root ${JSON.stringify(this.renderer)} cannot render component ${JSON.stringify(metadata.id)}.`
      );
    }
    this.pending?.abort();
    this.suspended?.abort();
    const ownerRecord = this.owner?.component === component ? this.owner : createOwnerRecord(this, component, null, ["root"], null);
    const rootPath = [
      { component, identityPath: ownerRecord.identityPath, key: ownerRecord.key, ordinal: 0 }
    ];
    const owner = draftOwner(ownerRecord, null, rootPath);
    const previousAttempt = CURRENT_ATTEMPT;
    const previousOwner = CURRENT_OWNER;
    const attempt = {
      root: this,
      owner,
      owners: [owner],
      replayEntries,
      retryThenables: /* @__PURE__ */ new Set(),
      nextUniversalId: this.nextUniversalId,
      implicitSlot: 0
    };
    CURRENT_ATTEMPT = attempt;
    CURRENT_OWNER = owner;
    let nodes;
    try {
      nodes = executeOwner(owner, () => {
        const value = component(props, componentContext(this.renderer));
        return materializeValue(value, this.renderer, null, ["root-output"]);
      });
    } catch (error) {
      const suspendedMemos = collectSuspendedMemos(attempt);
      this.discardDraftOwners(attempt.owners);
      if (error instanceof UniversalSuspense) {
        return this.suspend(error.thenable, component, props, suspendedMemos);
      }
      throw error;
    } finally {
      CURRENT_ATTEMPT = previousAttempt;
      CURRENT_OWNER = previousOwner;
    }
    try {
      const rootBlueprint = { kind: "range", key: null, children: nodes };
      const transaction = this.createTransaction(rootBlueprint, attempt, component, props);
      this.pending = transaction;
      return transaction;
    } catch (error) {
      this.discardDraftOwners(attempt.owners);
      throw error;
    }
  }
  render(component, props) {
    const attempt = this.prepare(component, props);
    if (attempt.status === "prepared") attempt.commit();
    return attempt;
  }
  createTransaction(blueprint, attempt, component, props) {
    const stagedPortalRegistrations = /* @__PURE__ */ new Set();
    const preparePortals = (node) => {
      if (node.kind === "portal" && node.registration === null) {
        node.registration = this.preparePortalTarget(node.target);
        stagedPortalRegistrations.add(node.registration);
      }
      for (const child of node.children) preparePortals(child);
    };
    try {
      preparePortals(blueprint);
      return this.createPreparedTransaction(
        blueprint,
        attempt,
        component,
        props,
        stagedPortalRegistrations
      );
    } catch (error) {
      for (const registration of stagedPortalRegistrations) {
        try {
          registration.release();
        } catch {
        }
      }
      throw error;
    }
  }
  createPreparedTransaction(blueprint, attempt, component, props, stagedPortalRegistrations) {
    let nextId = this.nextId;
    const used = /* @__PURE__ */ new Set([this.rootRecord]);
    const reconcileChildren = (oldChildren, blueprints) => {
      const keyed = /* @__PURE__ */ new Map();
      for (const old of oldChildren) if (old.key !== null) keyed.set(old.key, old);
      const claimed = /* @__PURE__ */ new Set();
      const nextKeys = /* @__PURE__ */ new Set();
      const output = [];
      for (let childIndex = 0; childIndex < blueprints.length; childIndex++) {
        const child = blueprints[childIndex];
        let record;
        if (child.key !== null) {
          if (nextKeys.has(child.key)) {
            throw new Error(`Duplicate universal child key ${String(child.key)}.`);
          }
          nextKeys.add(child.key);
          const candidate = keyed.get(child.key);
          if (candidate !== void 0 && !claimed.has(candidate) && sameRecordShape(candidate, child)) {
            record = candidate;
          }
        } else {
          const candidate = oldChildren[childIndex];
          if (candidate !== void 0 && candidate.key === null && !claimed.has(candidate) && sameRecordShape(candidate, child)) {
            record = candidate;
          }
        }
        if (record?.kind === "portal" && child.kind === "portal") {
          const previousRegistration = record.portalRegistration;
          const nextRegistration = child.registration;
          if (previousRegistration !== null && nextRegistration !== null && previousRegistration !== nextRegistration && Object.is(previousRegistration.handle, nextRegistration.handle)) {
            stagedPortalRegistrations.delete(nextRegistration);
            nextRegistration.release();
            child.registration = previousRegistration;
          }
        }
        const isNew = record === void 0;
        record ??= createLogicalRecord(nextId++, child);
        claimed.add(record);
        used.add(record);
        output.push({
          record,
          blueprint: child,
          children: reconcileChildren(record.children, child.children),
          isNew,
          hostUpdate: null
        });
      }
      return output;
    };
    const draftRoot = {
      record: this.rootRecord,
      blueprint,
      children: reconcileChildren(this.rootRecord.children, blueprint.children),
      isNew: false,
      hostUpdate: null
    };
    const removedRoots = [];
    const findRemoved = (parent) => {
      for (const child of parent.children) {
        if (!used.has(child)) removedRoots.push(child);
        else findRemoved(child);
      }
    };
    findRemoved(this.rootRecord);
    const previousPortalRegistrations = /* @__PURE__ */ new Set();
    for (const child of this.rootRecord.children) {
      walkLogical(child, (record) => {
        if (record.kind === "portal" && record.portalRegistration !== null) {
          previousPortalRegistrations.add(record.portalRegistration);
        }
      });
    }
    const nextPortalRegistrations = /* @__PURE__ */ new Set();
    walkDraft(draftRoot, (draft) => {
      if (draft.blueprint.kind !== "portal") return;
      const registration = draft.blueprint.registration;
      if (registration === null) {
        throw new Error("A universal portal target was not prepared before reconciliation.");
      }
      nextPortalRegistrations.add(registration);
    });
    const previousRegionBridges = /* @__PURE__ */ new Set();
    for (const child of this.rootRecord.children) {
      walkLogical(child, (record) => {
        if (record.kind !== "host") return;
        for (const value of Object.values(record.props)) {
          const bridge = rendererRegionOwnerBridge(value);
          if (bridge !== null) previousRegionBridges.add(bridge);
        }
      });
    }
    const attemptedOwnerRecords = new Set(attempt.owners.map((owner) => owner.record));
    const stagedRegionBridges = [];
    const nextRegionBridges = /* @__PURE__ */ new Set();
    walkDraft(draftRoot, (draft) => {
      if (draft.record.kind !== "host") return;
      const props2 = draft.blueprint.props;
      for (const name of Object.keys(props2)) {
        const value = props2[name];
        if (!isRendererRegion(value)) continue;
        if (value.ownerRenderer !== this.renderer) {
          throw new Error(
            `Universal renderer region owner mismatch: region owner ${JSON.stringify(value.ownerRenderer)} cannot be committed by root ${JSON.stringify(this.renderer)}.`
          );
        }
        const next = rendererRegionOwnerBridge(value);
        if (next === null) {
          throw new Error(
            "A universal renderer region must be created while its owning component renders."
          );
        }
        if (!attemptedOwnerRecords.has(next.owner)) {
          throw new Error(
            "A renderer region cannot escape the universal owner attempt that created it."
          );
        }
        if (nextRegionBridges.has(next)) {
          throw new Error("One renderer-region descriptor cannot own more than one host region.");
        }
        nextRegionBridges.add(next);
        const previous = rendererRegionOwnerBridge(draft.record.props[name]);
        stagedRegionBridges.push({ next, previous });
      }
    });
    const creates = [];
    const updates = [];
    const recreated = /* @__PURE__ */ new Set();
    walkDraft(draftRoot, (draft) => {
      if (draft.record.kind !== "host") return;
      const blueprintHost = draft.blueprint;
      const props2 = Object.freeze({ ...blueprintHost.props });
      if (draft.isNew) {
        creates.push({
          op: "create",
          id: draft.record.id,
          type: blueprintHost.type,
          props: props2
        });
      } else if (!shallowPropsEqual(draft.record.props, blueprintHost.props)) {
        const kind = this.driver.updates?.classify(
          blueprintHost.type,
          draft.record.props,
          blueprintHost.props
        ) ?? "update";
        if (kind !== "update" && kind !== "recreate") {
          throw new TypeError(
            `Universal update classifier returned invalid kind ${JSON.stringify(kind)}.`
          );
        }
        draft.hostUpdate = kind;
        if (kind === "recreate") {
          recreated.add(draft.record);
          updates.push({
            op: "recreate",
            id: draft.record.id,
            type: blueprintHost.type,
            props: props2
          });
        } else {
          updates.push({ op: "update", id: draft.record.id, props: props2 });
        }
      }
    });
    const removes = [];
    const placements = [];
    const planPlacements = (parentId, oldRecords, newDrafts, sourceParentId = parentId, forceMove = false) => {
      const oldPhysical = physicalRecords(oldRecords);
      const newPhysical = physicalDrafts(newDrafts);
      const desiredIds = new Set(newPhysical.map((entry) => entry.record.id));
      for (const old of oldPhysical) {
        if (!desiredIds.has(old.id)) {
          removes.push({ op: "remove", parent: sourceParentId, id: old.id });
        }
      }
      const previousIds = new Set(oldPhysical.map((entry) => entry.id));
      const current = forceMove ? [] : oldPhysical.filter((entry) => desiredIds.has(entry.id)).map((entry) => entry.id);
      for (let index = 0; index < newPhysical.length; index++) {
        const draft = newPhysical[index];
        const id = draft.record.id;
        if (current[index] === id) continue;
        const currentIndex = current.indexOf(id);
        const before = current[index] ?? null;
        if (currentIndex === -1) {
          placements.push({
            op: forceMove && previousIds.has(id) ? "move" : "insert",
            parent: parentId,
            id,
            before
          });
        } else {
          current.splice(currentIndex, 1);
          placements.push({ op: "move", parent: parentId, id, before });
        }
        current.splice(index, 0, id);
      }
    };
    walkDraftPostOrder(draftRoot, (draft) => {
      if (draft.record === this.rootRecord) {
        planPlacements(null, this.rootRecord.children, draft.children);
      } else if (draft.record.kind === "host") {
        planPlacements(draft.record.id, draft.record.children, draft.children);
      } else if (draft.record.kind === "portal") {
        const nextRegistration = draft.blueprint.registration;
        const previousRegistration = draft.record.portalRegistration;
        const retainedTarget = previousRegistration !== null && Object.is(previousRegistration.handle, nextRegistration.handle);
        planPlacements(
          nextRegistration.handle,
          draft.record.children,
          draft.children,
          previousRegistration?.handle ?? nextRegistration.handle,
          previousRegistration !== null && !retainedTarget
        );
      }
    });
    for (const removed of removedRoots) {
      walkLogical(removed, (record) => {
        if (record.kind !== "portal" || record.portalRegistration === null) return;
        for (const child of physicalRecords(record.children)) {
          removes.push({
            op: "remove",
            parent: record.portalRegistration.handle,
            id: child.id
          });
        }
      });
    }
    const hiddenVisibilityCommands = [];
    const visibleVisibilityCommands = [];
    const stageHiddenVisibility = (draft) => {
      if (draft.record.kind !== "host") return;
      const nextHidden = draft.blueprint.visibility !== "visible";
      const previousHidden = draft.record.visibility !== "visible";
      if (nextHidden && (draft.isNew || recreated.has(draft.record) || !previousHidden)) {
        hiddenVisibilityCommands.push({
          op: "visibility",
          id: draft.record.id,
          state: "hidden"
        });
      }
    };
    const stageVisibleVisibility = (draft) => {
      if (draft.record.kind !== "host") return;
      const nextHidden = draft.blueprint.visibility !== "visible";
      const previousHidden = draft.record.visibility !== "visible";
      if (!nextHidden && !draft.isNew && previousHidden) {
        visibleVisibilityCommands.push({
          op: "visibility",
          id: draft.record.id,
          state: "visible"
        });
      }
    };
    walkDraftPostOrder(draftRoot, stageHiddenVisibility);
    walkDraft(draftRoot, stageVisibleVisibility);
    const visibilityCommands = [...hiddenVisibilityCommands, ...visibleVisibilityCommands];
    const removedHosts = [];
    for (const removed of removedRoots) collectRemovedPostOrder(removed, removedHosts);
    let nextListener = this.nextListener;
    const eventCommands = [];
    const stagedEvents = /* @__PURE__ */ new Map();
    const stagedVisibleEventRecords = /* @__PURE__ */ new Set();
    walkDraft(draftRoot, (draft) => {
      if (draft.record.kind !== "host") return;
      const blueprintHost = draft.blueprint;
      const blueprintEvents = blueprintHost.events;
      const wasVisible = draft.record.visibility === "visible";
      const isVisible = blueprintHost.visibility === "visible";
      if (isVisible) stagedVisibleEventRecords.add(draft.record);
      const nextEvents = /* @__PURE__ */ new Map();
      for (const [type, event] of blueprintEvents) {
        const previous = draft.record.events.get(type);
        const listener = previous?.listener ?? nextListener++;
        const committed = { ...event, listener };
        nextEvents.set(type, committed);
        const changed = previous === void 0 || previous.handler !== event.handler || previous.priority !== event.priority || previous.owner !== event.owner;
        if (isVisible && (!wasVisible || changed)) {
          eventCommands.push({
            op: "event",
            id: draft.record.id,
            type,
            listener: { id: listener, priority: event.priority }
          });
        }
      }
      for (const [type] of draft.record.events) {
        if (wasVisible && (!isVisible || !nextEvents.has(type))) {
          eventCommands.push({ op: "event", id: draft.record.id, type, listener: null });
        }
      }
      stagedEvents.set(draft.record, nextEvents);
    });
    for (const record of removedHosts) {
      if (record.visibility !== "visible") continue;
      for (const [type] of record.events) {
        eventCommands.push({ op: "event", id: record.id, type, listener: null });
      }
    }
    const stageHostCallbacks = (op, readBlueprint, readCommitted) => {
      const commands2 = [];
      const staged = /* @__PURE__ */ new Map();
      walkDraft(draftRoot, (draft) => {
        if (draft.record.kind !== "host") return;
        const blueprintCallbacks = readBlueprint(draft.blueprint);
        const previousCallbacks = readCommitted(draft.record);
        const nextCallbacks = /* @__PURE__ */ new Map();
        for (const [type, callback] of blueprintCallbacks) {
          const previous = previousCallbacks.get(type);
          const listener = previous?.listener ?? nextListener++;
          nextCallbacks.set(type, { ...callback, listener });
          if (previous === void 0 || previous.handler !== callback.handler || previous.owner !== callback.owner) {
            commands2.push({ op, id: draft.record.id, type, listener: { id: listener } });
          }
        }
        for (const [type] of previousCallbacks) {
          if (!nextCallbacks.has(type)) {
            commands2.push({ op, id: draft.record.id, type, listener: null });
          }
        }
        staged.set(draft.record, nextCallbacks);
      });
      for (const record of removedHosts) {
        for (const [type] of readCommitted(record)) {
          commands2.push({ op, id: record.id, type, listener: null });
        }
      }
      return { commands: commands2, staged };
    };
    const lifecycleStage = stageHostCallbacks(
      "lifecycle",
      (host) => host.lifecycles,
      (record) => record.lifecycles
    );
    const localCallbackStage = stageHostCallbacks(
      "local-callback",
      (host) => host.localCallbacks,
      (record) => record.localCallbacks
    );
    const destroys = removedHosts.map((record) => ({
      op: "destroy",
      id: record.id
    }));
    const commands = [
      ...creates,
      ...updates,
      ...eventCommands,
      ...lifecycleStage.commands,
      ...localCallbackStage.commands,
      ...removes,
      ...placements,
      ...visibilityCommands,
      ...destroys
    ];
    const batch = freezeUniversalHostBatch(this.renderer, this.nextBatchVersion++, commands);
    const retryThenables = [...attempt.retryThenables];
    const retryMemos = retryThenables.length === 0 ? [] : collectSuspendedMemos(attempt);
    const refDetaches = [];
    const refAttaches = [];
    const hostDraftsById = /* @__PURE__ */ new Map();
    const lifecycleDrafts = /* @__PURE__ */ new Set();
    walkDraft(draftRoot, (draft) => {
      if (draft.record.kind !== "host") return;
      hostDraftsById.set(draft.record.id, draft);
      if (draft.isNew || draft.hostUpdate !== null) lifecycleDrafts.add(draft);
    });
    for (const placement of placements) {
      if (placement.op !== "move") continue;
      const draft = hostDraftsById.get(placement.id);
      if (draft !== void 0) lifecycleDrafts.add(draft);
    }
    for (const removed of removedRoots) {
      walkLogical(removed, (record) => {
        if (record.kind === "host" && record.refAttached) {
          refDetaches.push({ record, ref: record.ref, cleanup: record.refCleanup });
        }
      });
    }
    walkDraftPostOrder(draftRoot, (draft) => {
      if (draft.record.kind !== "host") return;
      const blueprintHost = draft.blueprint;
      const nextRef = blueprintHost.ref;
      const suspenseHide = draft.record.visibility !== "suspense-hidden" && blueprintHost.visibility === "suspense-hidden";
      const suspenseReveal = draft.record.visibility === "suspense-hidden" && blueprintHost.visibility !== "suspense-hidden";
      if (!draft.isNew && draft.record.refAttached && (recreated.has(draft.record) || suspenseHide || !Object.is(draft.record.ref, nextRef))) {
        refDetaches.push({
          record: draft.record,
          ref: draft.record.ref,
          cleanup: draft.record.refCleanup
        });
      }
      if (nextRef != null && blueprintHost.visibility !== "suspense-hidden" && (draft.isNew || recreated.has(draft.record) || suspenseReveal || !draft.record.refAttached || !Object.is(draft.record.ref, nextRef))) {
        refAttaches.push(draft);
      }
    });
    const draftOwnersParentFirst = [];
    const draftOwnersPostOrder = [];
    const walkDraftOwners = (owner) => {
      draftOwnersParentFirst.push(owner);
      for (const child of owner.children) walkDraftOwners(child);
      draftOwnersPostOrder.push(owner);
    };
    walkDraftOwners(attempt.owner);
    const changedContexts = /* @__PURE__ */ new Set();
    for (const draft of draftOwnersParentFirst) {
      const previous = draft.record.contextValues;
      if (previous === null || draft.contextValues === null) continue;
      for (const [context, value] of draft.contextValues) {
        if (previous.has(context) && !Object.is(previous.get(context), value)) {
          changedContexts.add(context);
        }
      }
    }
    const draftedRecords = new Set(draftOwnersParentFirst.map((owner) => owner.record));
    const committedOwnersParentFirst = [];
    const walkCommittedOwners = (owner) => {
      if (owner === null) return;
      committedOwnersParentFirst.push(owner);
      for (const child of owner.children) walkCommittedOwners(child);
    };
    walkCommittedOwners(this.owner);
    const removedOwners = committedOwnersParentFirst.filter((owner) => !draftedRecords.has(owner));
    const removedEffectEventCells = collectEffectEventCells(removedOwners);
    const orderedEffectCleanups = [];
    for (const owner of removedOwners) {
      for (const hook of owner.effectOrder) {
        if (hook.mounted) orderedEffectCleanups.push({ phase: hook.phase, hook });
      }
    }
    const effectChanges = [];
    const disconnectedPreviousEffects = /* @__PURE__ */ new Set();
    for (const owner of draftOwnersParentFirst) {
      if (owner.record.visibility !== "visible" || owner.visibility === "visible" || !owner.record.mounted) {
        continue;
      }
      const nextBySlot = new Map(owner.seenEffects.map((effect) => [effect.slot, effect]));
      for (const previous of owner.record.effectOrder) {
        if (previous.phase === "insertion" || !previous.mounted) continue;
        const next = nextBySlot.get(previous.slot);
        orderedEffectCleanups.push({
          phase: previous.phase,
          hook: next?.phase === previous.phase ? next : previous
        });
        disconnectedPreviousEffects.add(previous);
      }
    }
    for (const owner of draftOwnersPostOrder) {
      const seenSlots = new Set(owner.seenEffects.map((effect) => effect.slot));
      const nextByPrevious = /* @__PURE__ */ new Map();
      for (const next of owner.seenEffects) {
        const visibilityChanged = next.phase !== "insertion" && owner.record.visibility === "visible" !== (owner.visibility === "visible");
        const changed = visibilityChanged || owner.record.hooks.get(next.slot) !== next && (next.previous === null || next.previous.phase !== next.phase || !depsEqual(next.previous.deps, next.deps) || !next.previous.mounted);
        effectChanges.push({ owner, next, changed });
        if (changed && next.previous !== null && next.previous.mounted && !disconnectedPreviousEffects.has(next.previous)) {
          nextByPrevious.set(next.previous, next);
        }
      }
      for (const previous of owner.record.effectOrder) {
        if (!seenSlots.has(previous.slot)) {
          owner.hooks.delete(previous.slot);
          if (previous.mounted && !disconnectedPreviousEffects.has(previous)) {
            orderedEffectCleanups.push({ phase: previous.phase, hook: previous });
          }
          continue;
        }
        const replacement = nextByPrevious.get(previous);
        if (replacement !== void 0) {
          orderedEffectCleanups.push({ phase: previous.phase, hook: replacement });
        }
      }
    }
    let portalReleaseError = NO_PENDING_PASSIVE_ERROR;
    const applyLogicalTopology = () => {
      const apply = (draft, parent) => {
        const record = draft.record;
        record.parent = parent;
        record.key = draft.blueprint.key;
        if (record.kind === "host") {
          const host = draft.blueprint;
          record.type = host.type;
          record.props = host.props;
          record.ref = host.ref;
          record.owner = host.owner;
          record.events = stagedEvents.get(record) ?? /* @__PURE__ */ new Map();
          record.lifecycles = lifecycleStage.staged.get(record) ?? /* @__PURE__ */ new Map();
          record.localCallbacks = localCallbackStage.staged.get(record) ?? /* @__PURE__ */ new Map();
          record.visibility = host.visibility;
        } else if (record.kind === "portal") {
          record.portalRegistration = draft.blueprint.registration;
        }
        record.children = draft.children.map((child) => child.record);
        for (const child of draft.children) apply(child, record);
      };
      apply(draftRoot, null);
      stagedPortalRegistrations.clear();
      for (const registration of previousPortalRegistrations) {
        if (nextPortalRegistrations.has(registration)) continue;
        try {
          registration.release();
        } catch (error) {
          if (portalReleaseError === NO_PENDING_PASSIVE_ERROR) portalReleaseError = error;
        }
      }
    };
    const lifecycleOrder = [];
    walkDraftPostOrder(draftRoot, (draft) => {
      if (lifecycleDrafts.has(draft)) lifecycleOrder.push(draft);
    });
    const prepareHost = (value) => this.driver.prepareBatch(this.container, value, {
      invokeLocalCallback: (listener, args) => this.invokeLocalCallback(listener, args)
    });
    const preparedHost = this.transport === null ? prepareHost(batch) : this.transport.prepareBatch(this.container, batch, prepareHost);
    if (preparedHost === null || typeof preparedHost !== "object" || typeof preparedHost.apply !== "function" || typeof preparedHost.abort !== "function" || preparedHost.afterAccept !== void 0 && typeof preparedHost.afterAccept !== "function") {
      throw new TypeError("A universal host driver must return a valid prepared batch token.");
    }
    const transaction = new UniversalTransactionImpl(
      this,
      batch,
      () => preparedHost.apply(),
      () => {
        applyLogicalTopology();
        for (const listener of this.publishedListeners) EVENT_DISPATCHERS.delete(listener);
        this.publishedListeners.clear();
        const handlers = /* @__PURE__ */ new Map();
        for (const [record, events] of stagedEvents) {
          if (!stagedVisibleEventRecords.has(record)) continue;
          for (const event of events.values()) {
            handlers.set(event.listener, event);
            this.publishedListeners.add(event.listener);
            EVENT_DISPATCHERS.set(
              event.listener,
              (payload) => this.dispatchEvent(event.listener, payload)
            );
          }
        }
        this.handlers = handlers;
        const localCallbacks = /* @__PURE__ */ new Map();
        for (const callbacks of localCallbackStage.staged.values()) {
          for (const callback of callbacks.values()) {
            localCallbacks.set(callback.listener, callback);
          }
        }
        this.localCallbacks = localCallbacks;
        for (const owner of removedOwners) {
          owner.disposed = true;
          owner.mounted = false;
        }
        for (const draft of draftOwnersParentFirst) {
          const record = draft.record;
          record.parent = draft.parent?.record ?? null;
          record.hooks = draft.hooks;
          record.effectOrder = [...draft.seenEffects];
          record.children = draft.children.map((child) => child.record);
          record.contextValues = draft.contextValues;
          record.isBoundary = draft.isBoundary;
          record.canHandleSuspense = draft.canHandleSuspense;
          record.boundaryError = draft.boundaryError;
          record.hasBoundaryError = draft.hasBoundaryError;
          record.boundaryThenable = draft.boundaryThenable;
          record.visibility = draft.visibility;
          record.mounted = true;
          record.disposed = false;
          for (const [slot, count] of draft.appliedUpdates) {
            const updates2 = record.updates.get(slot);
            if (updates2 === void 0) continue;
            updates2.splice(0, count);
            if (updates2.length === 0) record.updates.delete(slot);
          }
          for (const hook of record.hooks.values()) {
            if (hook.kind === "effect-event") {
              hook.cell.impl = hook.next;
              hook.cell.active = true;
            }
          }
        }
        this.owner = attempt.owner.record;
        this.lastComponent = component;
        this.lastProps = props;
        if (retryThenables.length > 0) {
          this.publishLocalReplay(retryThenables, retryMemos, component, props);
        }
        this.nextId = nextId;
        this.nextUniversalId = attempt.nextUniversalId;
        this.nextListener = nextListener;
        for (const context of changedContexts) context.$$version++;
        const retainedRegionCells = /* @__PURE__ */ new Set();
        for (const { next, previous } of stagedRegionBridges) {
          retainedRegionCells.add(next.activate(previous));
        }
        const deactivatedRegionCells = /* @__PURE__ */ new Set();
        for (const previous of previousRegionBridges) {
          const cell = previous.lifecycle();
          if (cell === null || retainedRegionCells.has(cell) || deactivatedRegionCells.has(cell)) {
            continue;
          }
          deactivatedRegionCells.add(cell);
          previous.deactivate();
        }
        if (portalReleaseError !== NO_PENDING_PASSIVE_ERROR) throw portalReleaseError;
      },
      () => preparedHost.afterAccept?.(),
      () => {
        const tasks = [];
        for (const cleanup of orderedEffectCleanups) {
          if (cleanup.phase === "insertion") {
            tasks.push(() => runOwnedEffectCleanup(cleanup.hook));
          }
        }
        for (const { next, changed } of effectChanges) {
          if (changed && next.phase === "insertion") tasks.push(() => runOwnedEffectCreate(next));
        }
        for (const cleanup of orderedEffectCleanups) {
          if (cleanup.phase === "layout") {
            tasks.push(() => runOwnedEffectCleanup(cleanup.hook));
          }
        }
        for (const { record, ref, cleanup } of refDetaches) {
          tasks.push(() => runOwnedCommit(record.owner, () => detachRef(record, ref, cleanup)));
        }
        runCommitTasks(tasks);
      },
      () => {
        const tasks = [];
        for (const draft of lifecycleOrder) {
          const record = draft.record;
          for (const callback of record.lifecycles.values()) {
            tasks.push(
              () => runOwnedCommit(
                callback.owner,
                () => callback.handler(this.driver.getPublicInstance(this.container, record.id))
              )
            );
          }
        }
        runCommitTasks(tasks);
      },
      () => {
        const tasks = [];
        for (const draft of refAttaches) {
          const record = draft.record;
          tasks.push(
            () => runOwnedCommit(
              record.owner,
              () => attachRef(record, this.driver.getPublicInstance(this.container, record.id))
            )
          );
        }
        for (const { owner, next, changed } of effectChanges) {
          if (changed && next.phase === "layout" && owner.visibility === "visible") {
            tasks.push(() => runOwnedEffectCreate(next));
          }
        }
        runCommitTasks(tasks);
      },
      () => {
        const tasks = [];
        try {
          for (const cleanup of orderedEffectCleanups) {
            if (cleanup.phase === "passive") {
              tasks.push(() => runOwnedEffectCleanup(cleanup.hook));
            }
          }
          if (this.unmounted || this.owner === null || this.owner.disposed) {
            runCommitTasks(tasks);
            return;
          }
          for (const { owner, next, changed } of effectChanges) {
            if (!changed || next.phase !== "passive") continue;
            if (owner.record.hooks.get(next.slot) !== next || owner.record.disposed || owner.record.visibility !== "visible") {
              continue;
            }
            tasks.push(() => runOwnedEffectCreate(next));
          }
          runCommitTasks(tasks);
        } finally {
          deactivateEffectEventCells(removedEffectEventCells);
        }
      },
      () => preparedHost.abort(),
      () => {
        const tasks = [...stagedPortalRegistrations].map(
          (registration) => () => registration.release()
        );
        stagedPortalRegistrations.clear();
        tasks.push(() => this.discardDraftOwners(draftOwnersParentFirst));
        runCommitTasks(tasks);
      }
    );
    return transaction;
  }
  finish(transaction) {
    if (this.pending === transaction) this.pending = null;
  }
  unmount() {
    if (this.unmounted) return;
    this.scheduled = false;
    SCHEDULED_UNIVERSAL_ROOTS.delete(this);
    let pendingAbortError = NO_PENDING_PASSIVE_ERROR;
    try {
      this.pending?.abort();
    } catch (error) {
      pendingAbortError = error;
    }
    this.suspended?.abort();
    this.cancelSuspendedReplays();
    const owners = [];
    const collectOwners = (owner) => {
      if (owner === null) return;
      owners.push(owner);
      for (const child of owner.children) collectOwners(child);
    };
    collectOwners(this.owner);
    const effectEventCells = collectEffectEventCells(owners);
    const effects = owners.flatMap((owner) => owner.effectOrder);
    const children = [...this.rootRecord.children];
    const regionBridges = /* @__PURE__ */ new Set();
    for (const child of children) {
      walkLogical(child, (record) => {
        if (record.kind !== "host") return;
        for (const value of Object.values(record.props)) {
          const bridge = rendererRegionOwnerBridge(value);
          if (bridge !== null) regionBridges.add(bridge);
        }
      });
    }
    const physical = physicalRecords(this.rootRecord.children);
    const portalRegistrations = /* @__PURE__ */ new Set();
    const portalRemoves = [];
    for (const child of this.rootRecord.children) {
      walkLogical(child, (record) => {
        if (record.kind !== "portal" || record.portalRegistration === null) return;
        portalRegistrations.add(record.portalRegistration);
        for (const physicalChild of physicalRecords(record.children)) {
          portalRemoves.push({
            op: "remove",
            parent: record.portalRegistration.handle,
            id: physicalChild.id
          });
        }
      });
    }
    const removedHosts = [];
    for (const child of this.rootRecord.children) collectRemovedPostOrder(child, removedHosts);
    let acceptedHostError = NO_PENDING_PASSIVE_ERROR;
    if (removedHosts.length > 0) {
      const batch = freezeUniversalHostBatch(this.renderer, this.nextBatchVersion++, [
        ...removedHosts.flatMap(
          (record) => [...record.events.keys()].map(
            (type) => ({
              op: "event",
              id: record.id,
              type,
              listener: null
            })
          )
        ),
        ...removedHosts.flatMap(
          (record) => [...record.lifecycles.keys()].map(
            (type) => ({
              op: "lifecycle",
              id: record.id,
              type,
              listener: null
            })
          )
        ),
        ...removedHosts.flatMap(
          (record) => [...record.localCallbacks.keys()].map(
            (type) => ({
              op: "local-callback",
              id: record.id,
              type,
              listener: null
            })
          )
        ),
        ...physical.map((record) => ({ op: "remove", parent: null, id: record.id })),
        ...portalRemoves,
        ...removedHosts.map((record) => ({ op: "destroy", id: record.id }))
      ]);
      const prepare = (value) => this.driver.prepareBatch(this.container, value, {
        invokeLocalCallback: (listener, args) => this.invokeLocalCallback(listener, args)
      });
      const prepared = this.transport === null ? prepare(batch) : this.transport.prepareBatch(this.container, batch, prepare);
      try {
        runCommitTasks([() => prepared.apply(), () => prepared.afterAccept?.()]);
      } catch (error) {
        acceptedHostError = error;
      }
    }
    this.rootRecord.children = [];
    let portalReleaseError = NO_PENDING_PASSIVE_ERROR;
    for (const registration of portalRegistrations) {
      try {
        registration.release();
      } catch (error) {
        if (portalReleaseError === NO_PENDING_PASSIVE_ERROR) portalReleaseError = error;
      }
    }
    for (const listener of this.publishedListeners) EVENT_DISPATCHERS.delete(listener);
    this.publishedListeners.clear();
    this.handlers = /* @__PURE__ */ new Map();
    this.localCallbacks = /* @__PURE__ */ new Map();
    for (const owner of owners) {
      owner.disposed = true;
      owner.mounted = false;
    }
    const deactivatedRegionCells = /* @__PURE__ */ new Set();
    for (const bridge of regionBridges) {
      const cell = bridge.lifecycle();
      if (cell === null || deactivatedRegionCells.has(cell)) continue;
      deactivatedRegionCells.add(cell);
      bridge.deactivate();
    }
    this.owner = null;
    this.unmounted = true;
    this.lastComponent = null;
    let pendingPassiveError = NO_PENDING_PASSIVE_ERROR;
    try {
      this.flushPassiveTasks();
    } catch (error) {
      pendingPassiveError = error;
    }
    const insertionTasks = [];
    const layoutTasks = [];
    const refTasks = [];
    const passiveTasks = [];
    for (const hook of effects) {
      if (!hook.mounted) continue;
      if (hook.phase === "passive") passiveTasks.push(() => runOwnedEffectCleanup(hook));
      else if (hook.phase === "insertion") {
        insertionTasks.push(() => runOwnedEffectCleanup(hook));
      } else {
        layoutTasks.push(() => runOwnedEffectCleanup(hook));
      }
    }
    for (const child of children) {
      walkLogical(child, (record) => {
        if (record.refAttached) {
          refTasks.push(() => runOwnedCommit(record.owner, () => detachRef(record)));
        }
      });
    }
    const syncTasks = [...insertionTasks, ...layoutTasks, ...refTasks];
    if (acceptedHostError !== NO_PENDING_PASSIVE_ERROR) {
      syncTasks.unshift(() => {
        throw acceptedHostError;
      });
    }
    if (portalReleaseError !== NO_PENDING_PASSIVE_ERROR) {
      syncTasks.unshift(() => {
        throw portalReleaseError;
      });
    }
    if (pendingPassiveError !== NO_PENDING_PASSIVE_ERROR) {
      syncTasks.unshift(() => {
        throw pendingPassiveError;
      });
    }
    if (pendingAbortError !== NO_PENDING_PASSIVE_ERROR) {
      syncTasks.unshift(() => {
        throw pendingAbortError;
      });
    }
    if (passiveTasks.length > 0) {
      this.enqueuePassive(() => {
        try {
          runCommitTasks(passiveTasks);
        } finally {
          deactivateEffectEventCells(effectEventCells);
        }
      });
      runCommitTasks(syncTasks);
    } else {
      try {
        runCommitTasks(syncTasks);
      } finally {
        deactivateEffectEventCells(effectEventCells);
      }
    }
  }
}
class UniversalTransactionImpl {
  constructor(root, batch, applyHost, publishHost, afterHostAccept, afterMutation, lifecycle, layout, passive, abortHost, onAbort) {
    this.root = root;
    this.batch = batch;
    this.applyHost = applyHost;
    this.publishHost = publishHost;
    this.afterHostAccept = afterHostAccept;
    this.afterMutation = afterMutation;
    this.lifecycle = lifecycle;
    this.layout = layout;
    this.passive = passive;
    this.abortHost = abortHost;
    this.onAbort = onAbort;
  }
  root;
  batch;
  applyHost;
  publishHost;
  afterHostAccept;
  afterMutation;
  lifecycle;
  layout;
  passive;
  abortHost;
  onAbort;
  state = "prepared";
  hostAccepted = false;
  passiveScheduled = false;
  passiveRan = false;
  get status() {
    return this.state;
  }
  commitMutation() {
    if (this.state !== "prepared" || this.hostAccepted) return;
    this.hostAccepted = true;
    runCommitTasks([
      this.applyHost,
      this.publishHost,
      this.afterHostAccept,
      this.afterMutation,
      this.lifecycle
    ]);
  }
  commitLayout() {
    if (this.state !== "prepared") return;
    if (!this.hostAccepted) this.commitMutation();
    if (this.state !== "prepared") return;
    try {
      this.layout();
    } finally {
      this.state = "committed";
      this.root.finish(this);
      this.schedulePassive();
    }
  }
  commitPassive() {
    if (this.state !== "committed") return;
    this.schedulePassive();
    this.root.flushPassivesBeforeRender();
  }
  commit() {
    if (this.state !== "prepared") return;
    let hasError = false;
    let firstError;
    try {
      this.commitMutation();
    } catch (error) {
      hasError = true;
      firstError = error;
    }
    if (this.hostAccepted) {
      try {
        this.commitLayout();
      } catch (error) {
        if (!hasError) {
          hasError = true;
          firstError = error;
        }
      }
    }
    if (hasError) throw firstError;
  }
  schedulePassive() {
    if (this.passiveScheduled) return;
    this.passiveScheduled = true;
    this.root.enqueuePassive(() => {
      if (this.passiveRan) return;
      this.passiveRan = true;
      this.passive();
    });
  }
  abort() {
    if (this.state !== "prepared") return;
    if (this.hostAccepted) {
      throw new Error("A universal transaction cannot be aborted after its host batch committed.");
    }
    this.state = "aborted";
    try {
      runCommitTasks([this.abortHost, this.onAbort]);
    } finally {
      this.root.finish(this);
    }
  }
}
function queuePendingUniversalWork() {
  for (const root of [...SCHEDULED_UNIVERSAL_ROOTS]) root.queueScheduledWork();
}
function flushScheduledUniversalWave() {
  for (const root of [...SCHEDULED_UNIVERSAL_ROOTS]) root.flushScheduledWork();
}
function flushUniversalPassiveWave() {
  for (const root of [...PENDING_UNIVERSAL_PASSIVE_ROOTS]) root.flushPassiveTasks();
}
const INLINE_UNIVERSAL_FLUSHER = (run) => run();
function runUniversalSyncBoundary(run, flushOwner, includePassives, label) {
  const canDrain = UNIVERSAL_SYNC_DEPTH === 0 && CURRENT_ATTEMPT === null && UNIVERSAL_COMMIT_TASK_DEPTH === 0;
  UNIVERSAL_SYNC_DEPTH++;
  if (!canDrain) {
    try {
      return run();
    } finally {
      UNIVERSAL_SYNC_DEPTH--;
      if (UNIVERSAL_SYNC_DEPTH === 0) queuePendingUniversalWork();
    }
  }
  let completed = false;
  let invoked = false;
  let result;
  try {
    for (let pass = 0; pass < UNIVERSAL_SYNC_DRAIN_LIMIT; pass++) {
      flushOwner(() => {
        if (!invoked) {
          invoked = true;
          result = run();
        }
        flushScheduledUniversalWave();
        if (includePassives) flushUniversalPassiveWave();
      });
      if (SCHEDULED_UNIVERSAL_ROOTS.size === 0 && (!includePassives || PENDING_UNIVERSAL_PASSIVE_ROOTS.size === 0)) {
        completed = true;
        return result;
      }
    }
    throw new Error(
      `${label}(): scheduler did not stabilize after ${UNIVERSAL_SYNC_DRAIN_LIMIT} iterations \u2014 likely an infinite render loop`
    );
  } finally {
    UNIVERSAL_SYNC_DEPTH--;
    if (UNIVERSAL_SYNC_DEPTH === 0 && !completed) queuePendingUniversalWork();
  }
}
function flushUniversalSync(run, flushOwner = INLINE_UNIVERSAL_FLUSHER) {
  return runUniversalSyncBoundary(run, flushOwner, false, "flushUniversalSync");
}
function flushUniversalAct(run, flushOwner = INLINE_UNIVERSAL_FLUSHER) {
  return runUniversalSyncBoundary(run, flushOwner, true, "flushUniversalAct");
}
function createUniversalRoot(container, driver, options = {}) {
  return new UniversalRootImpl(container, driver, options.transport ?? null);
}
const boundaryStates = /* @__PURE__ */ new WeakMap();
const BOUNDARY_INVALIDATE_SLOT = /* @__PURE__ */ Symbol("octane.universal.boundary.invalidate");
const BOUNDARY_COMMIT_SLOT = /* @__PURE__ */ Symbol("octane.universal.boundary.commit");
const BOUNDARY_LIFETIME_SLOT = /* @__PURE__ */ Symbol("octane.universal.boundary.lifetime");
function createUniversalHostBoundary(renderer) {
  assertRendererId(renderer, "Host boundary renderer");
  const boundary = ((props, scope) => {
    if (props.root.renderer !== renderer) {
      throw new Error(
        `Universal boundary ${JSON.stringify(renderer)} received root ${JSON.stringify(props.root.renderer)}.`
      );
    }
    let component = props.component;
    let componentProps = props.props;
    if (props.children !== void 0) {
      const region = props.children;
      if (!isRendererRegion(region)) {
        throw new TypeError(
          `Universal boundary ${JSON.stringify(renderer)} expected compiler-owned renderer-region children.`
        );
      }
      if (region.ownerRenderer !== "dom" || region.childRenderer !== renderer) {
        throw new Error(
          `Universal boundary ${JSON.stringify(renderer)} cannot mount region ${JSON.stringify(region.ownerRenderer)} -> ${JSON.stringify(region.childRenderer)}.`
        );
      }
      if (component !== void 0) {
        throw new Error(
          "A universal boundary cannot receive both component and renderer-region children."
        );
      }
      component = region.component;
      componentProps = region.props;
    }
    if (component === void 0) {
      throw new Error(
        `Universal boundary ${JSON.stringify(renderer)} requires a component or renderer-owned children.`
      );
    }
    let state = boundaryStates.get(scope);
    const [, invalidate] = useDomState(0, BOUNDARY_INVALIDATE_SLOT);
    if (state === void 0) {
      const owner = {
        readContext: (context) => readContextFromScope(scope, context),
        invalidate: () => invalidate((value) => value + 1)
      };
      state = {
        root: props.root,
        owner,
        ownerCommitted: false,
        lifetimeCommitted: false,
        pending: null
      };
      boundaryStates.set(scope, state);
      state.root.setBridge(owner);
    } else if (state.root !== props.root) {
      throw new Error("Changing the root owned by a mounted universal boundary is not supported.");
    }
    let attempt;
    try {
      attempt = state.root.prepare(component, componentProps);
    } catch (error) {
      if (!state.ownerCommitted) {
        boundaryStates.delete(scope);
        state.root.clearBridge(state.owner);
      }
      throw error;
    }
    state.pending = attempt;
    useDomLayoutEffect(
      () => {
        if (state.pending !== attempt) return;
        try {
          if (attempt.status === "prepared") attempt.commit();
          state.ownerCommitted = true;
          state.pending = null;
        } catch (error) {
          boundaryStates.delete(scope);
          state.pending = null;
          try {
            state.root.unmount();
          } finally {
            state.root.clearBridge(state.owner);
          }
          throw error;
        }
      },
      [attempt],
      BOUNDARY_COMMIT_SLOT
    );
    useDomInsertionEffect(
      () => {
        if (attempt.status === "prepared") state.lifetimeCommitted = true;
        return () => {
          const ownedState = boundaryStates.get(scope) ?? state;
          boundaryStates.delete(scope);
          ownedState.lifetimeCommitted = false;
          const pending = ownedState.pending;
          ownedState.pending = null;
          runCommitTasks([
            () => pending?.abort(),
            () => ownedState.root.unmount(),
            () => ownedState.root.clearBridge(ownedState.owner)
          ]);
        };
      },
      [],
      BOUNDARY_LIFETIME_SLOT
    );
    queueMicrotask(() => {
      if (state.pending !== attempt) return;
      state.pending = null;
      runCommitTasks([
        () => attempt.abort(),
        () => {
          if (!state.ownerCommitted && !state.lifetimeCommitted) {
            if (boundaryStates.get(scope) === state) boundaryStates.delete(scope);
            state.root.clearBridge(state.owner);
          }
        }
      ]);
    });
    if (attempt.status === "suspended") useDomRendererThenable(attempt.thenable);
  });
  Object.defineProperty(boundary, UNIVERSAL_BOUNDARY, {
    value: Object.freeze({
      id: `dom->${renderer}`,
      ownerRenderer: "dom",
      childRenderer: renderer,
      childrenProp: "children"
    })
  });
  return boundary;
}
const OBJECT_DRIVER_STATE = /* @__PURE__ */ Symbol("octane.object-driver.state");
function createObjectContainer(renderer = "object") {
  assertRendererId(renderer, "Object container renderer");
  const state = {
    instances: /* @__PURE__ */ new Map(),
    events: /* @__PURE__ */ new Map(),
    lifecycles: /* @__PURE__ */ new Map(),
    localCallbacks: /* @__PURE__ */ new Map(),
    localCleanups: /* @__PURE__ */ new Map()
  };
  return {
    renderer,
    children: [],
    commits: [],
    get instanceCount() {
      return state.instances.size;
    },
    dispatchEvent(instance, type, payload) {
      const id = typeof instance === "number" ? instance : instance.id;
      const current = state.instances.get(id);
      if (current === void 0) throw new Error(`Object driver: unknown event target ${id}.`);
      if (typeof instance !== "number" && current !== instance) {
        throw new Error(`Object driver: stale event target ${id}.`);
      }
      const listener = state.events.get(id)?.get(type.toLowerCase());
      if (listener === void 0) {
        throw new Error(`Object driver: target ${id} has no ${JSON.stringify(type)} listener.`);
      }
      const dispatch = EVENT_DISPATCHERS.get(listener.id);
      if (dispatch === void 0) {
        throw new Error(`Object driver: inactive listener ${listener.id}.`);
      }
      return dispatch(payload);
    },
    [OBJECT_DRIVER_STATE]: state
  };
}
function objectChildren(container, parent, instances) {
  if (parent === null) return container.children;
  const instance = instances.get(parent);
  if (instance === void 0) throw new Error(`Object driver: unknown parent ${parent}.`);
  return instance.children;
}
function createObjectDriver(renderer = "object") {
  assertRendererId(renderer, "Object driver renderer");
  return {
    id: renderer,
    capabilities: { text: "host", localHostCallbacks: true, visibility: true },
    events: {
      classify(name) {
        if (!/^on[A-Z]/.test(name)) return null;
        return { type: name.slice(2).toLowerCase(), priority: "discrete" };
      }
    },
    lifecycles: {
      classify(name) {
        return name === "onUpdate" ? { type: "update" } : null;
      }
    },
    localCallbacks: {
      classify(name, value) {
        return name === "attach" && (value == null || typeof value === "function") ? { type: "attach" } : null;
      }
    },
    prepareBatch(container, batch, context) {
      if (container.renderer !== renderer || batch.renderer !== renderer) {
        throw new Error(
          `Object driver renderer mismatch: driver ${JSON.stringify(renderer)}, container ${JSON.stringify(container.renderer)}, batch ${JSON.stringify(batch.renderer)}.`
        );
      }
      const state = container[OBJECT_DRIVER_STATE];
      const simulated = /* @__PURE__ */ new Map();
      for (const [id, instance] of state.instances) {
        simulated.set(id, {
          type: instance.type,
          props: instance.props,
          visible: instance.visible,
          children: instance.children.map((child) => child.id),
          events: new Map(state.events.get(id)),
          lifecycles: new Map(state.lifecycles.get(id)),
          localCallbacks: new Map(state.localCallbacks.get(id))
        });
      }
      const stagedInstances = /* @__PURE__ */ new Map();
      const cleanupKeys = /* @__PURE__ */ new Set();
      const invokeKeys = /* @__PURE__ */ new Set();
      const keyFor = (id, type) => `${id}:${type}`;
      const parseKey = (key) => {
        const separator = key.indexOf(":");
        return [Number(key.slice(0, separator)), key.slice(separator + 1)];
      };
      const rootChildren = container.children.map((child) => child.id);
      const simulatedChildren = (parent) => {
        if (parent === null) return rootChildren;
        const value = simulated.get(parent);
        if (value === void 0) throw new Error(`Object driver: unknown parent ${parent}.`);
        return value.children;
      };
      for (const command of batch.commands) {
        if (command.op === "create") {
          if (simulated.has(command.id))
            throw new Error(`Object driver: duplicate id ${command.id}.`);
          simulated.set(command.id, {
            type: command.type,
            props: command.props,
            visible: true,
            children: [],
            events: /* @__PURE__ */ new Map(),
            lifecycles: /* @__PURE__ */ new Map(),
            localCallbacks: /* @__PURE__ */ new Map()
          });
          stagedInstances.set(command.id, {
            id: command.id,
            type: command.type,
            props: command.props,
            visible: true,
            children: []
          });
        } else if (command.op === "update") {
          const value = simulated.get(command.id);
          if (value === void 0) throw new Error(`Object driver: unknown update ${command.id}.`);
          value.props = command.props;
        } else if (command.op === "recreate") {
          const value = simulated.get(command.id);
          const current = state.instances.get(command.id);
          if (value === void 0 || current === void 0) {
            throw new Error(`Object driver: unknown recreate ${command.id}.`);
          }
          if (value.type !== command.type) {
            throw new Error(`Object driver: recreate type mismatch for ${command.id}.`);
          }
          value.props = command.props;
          stagedInstances.set(command.id, {
            id: command.id,
            type: command.type,
            props: command.props,
            visible: true,
            children: [...current.children]
          });
          for (const type of value.localCallbacks.keys()) {
            cleanupKeys.add(keyFor(command.id, type));
            invokeKeys.add(keyFor(command.id, type));
          }
        } else if (command.op === "visibility") {
          const value = simulated.get(command.id);
          if (value === void 0) {
            throw new Error(`Object driver: unknown visibility target ${command.id}.`);
          }
          value.visible = command.state === "visible";
        } else if (command.op === "event") {
          const value = simulated.get(command.id);
          if (value === void 0)
            throw new Error(`Object driver: unknown event target ${command.id}.`);
          if (command.listener === null) value.events.delete(command.type);
          else value.events.set(command.type, command.listener);
        } else if (command.op === "lifecycle") {
          const value = simulated.get(command.id);
          if (value === void 0)
            throw new Error(`Object driver: unknown lifecycle target ${command.id}.`);
          if (command.listener === null) value.lifecycles.delete(command.type);
          else value.lifecycles.set(command.type, command.listener);
        } else if (command.op === "local-callback") {
          const value = simulated.get(command.id);
          if (value === void 0)
            throw new Error(`Object driver: unknown local callback target ${command.id}.`);
          const key = keyFor(command.id, command.type);
          cleanupKeys.add(key);
          if (command.listener === null) value.localCallbacks.delete(command.type);
          else {
            value.localCallbacks.set(command.type, command.listener);
            invokeKeys.add(key);
          }
        } else if (command.op === "insert" || command.op === "move") {
          if (command.parent !== null && typeof command.parent !== "number") {
            throw new Error("Object driver does not support portal target parents.");
          }
          if (!simulated.has(command.id))
            throw new Error(`Object driver: unknown child ${command.id}.`);
          for (const value of [
            rootChildren,
            ...[...simulated.values()].map((entry) => entry.children)
          ]) {
            const old = value.indexOf(command.id);
            if (old !== -1) value.splice(old, 1);
          }
          const children = simulatedChildren(command.parent);
          const before = command.before === null ? children.length : children.indexOf(command.before);
          if (before === -1) throw new Error(`Object driver: unknown before id ${command.before}.`);
          children.splice(before, 0, command.id);
          if (command.op === "move") {
            for (const type of simulated.get(command.id).localCallbacks.keys()) {
              const key = keyFor(command.id, type);
              cleanupKeys.add(key);
              invokeKeys.add(key);
            }
          }
        } else if (command.op === "remove") {
          if (command.parent !== null && typeof command.parent !== "number") {
            throw new Error("Object driver does not support portal target parents.");
          }
          const children = simulatedChildren(command.parent);
          const index = children.indexOf(command.id);
          if (index === -1) throw new Error(`Object driver: child ${command.id} is not attached.`);
          children.splice(index, 1);
          for (const type of simulated.get(command.id).localCallbacks.keys()) {
            cleanupKeys.add(keyFor(command.id, type));
          }
        } else if (command.op === "destroy") {
          const instance = simulated.get(command.id);
          if (instance === void 0)
            throw new Error(`Object driver: unknown destroy ${command.id}.`);
          for (const value of [
            rootChildren,
            ...[...simulated.values()].map((entry) => entry.children)
          ]) {
            const attached = value.indexOf(command.id);
            if (attached !== -1) value.splice(attached, 1);
          }
          instance.children.length = 0;
          simulated.delete(command.id);
        }
      }
      for (const [id, instance] of stagedInstances) {
        const staged = simulated.get(id);
        if (staged === void 0) continue;
        instance.visible = staged.visible;
        instance.children.splice(
          0,
          instance.children.length,
          ...staged.children.map(
            (child) => stagedInstances.get(child) ?? state.instances.get(child)
          )
        );
      }
      let status = "prepared";
      let acceptedCallbacksRan = false;
      return {
        apply() {
          if (status !== "prepared") return;
          status = "applied";
          const tasks = [];
          for (const key of cleanupKeys) {
            const [id, type] = parseKey(key);
            const cleanups = state.localCleanups.get(id);
            const cleanup = cleanups?.get(type);
            if (cleanup === void 0) continue;
            cleanups.delete(type);
            tasks.push(cleanup);
          }
          tasks.push(() => {
            for (const command of batch.commands) {
              if (command.op === "create") {
                state.instances.set(command.id, stagedInstances.get(command.id));
                state.events.set(command.id, /* @__PURE__ */ new Map());
                state.lifecycles.set(command.id, /* @__PURE__ */ new Map());
                state.localCallbacks.set(command.id, /* @__PURE__ */ new Map());
                state.localCleanups.set(command.id, /* @__PURE__ */ new Map());
              } else if (command.op === "update") {
                state.instances.get(command.id).props = command.props;
              } else if (command.op === "recreate") {
                const previous = state.instances.get(command.id);
                const replacement = stagedInstances.get(command.id);
                for (const parent of [
                  container.children,
                  ...[...state.instances.values()].map((entry) => entry.children)
                ]) {
                  const index = parent.indexOf(previous);
                  if (index !== -1) parent[index] = replacement;
                }
                previous.children.length = 0;
                state.instances.set(command.id, replacement);
              } else if (command.op === "visibility") {
                state.instances.get(command.id).visible = command.state === "visible";
              } else if (command.op === "event") {
                const events = state.events.get(command.id);
                if (command.listener === null) events.delete(command.type);
                else events.set(command.type, command.listener);
              } else if (command.op === "lifecycle") {
                const lifecycles = state.lifecycles.get(command.id);
                if (command.listener === null) lifecycles.delete(command.type);
                else lifecycles.set(command.type, command.listener);
              } else if (command.op === "local-callback") {
                const callbacks = state.localCallbacks.get(command.id);
                if (command.listener === null) callbacks.delete(command.type);
                else callbacks.set(command.type, command.listener);
              } else if (command.op === "insert" || command.op === "move") {
                if (command.parent !== null && typeof command.parent !== "number") {
                  throw new Error("Object driver does not support portal target parents.");
                }
                const instance = state.instances.get(command.id);
                for (const parent of [
                  container.children,
                  ...[...state.instances.values()].map((entry) => entry.children)
                ]) {
                  const old = parent.indexOf(instance);
                  if (old !== -1) parent.splice(old, 1);
                }
                const children = objectChildren(container, command.parent, state.instances);
                const before = command.before === null ? children.length : children.indexOf(state.instances.get(command.before));
                children.splice(before, 0, instance);
              } else if (command.op === "remove") {
                if (command.parent !== null && typeof command.parent !== "number") {
                  throw new Error("Object driver does not support portal target parents.");
                }
                const children = objectChildren(container, command.parent, state.instances);
                children.splice(children.indexOf(state.instances.get(command.id)), 1);
              } else if (command.op === "destroy") {
                const instance = state.instances.get(command.id);
                for (const parent of [
                  container.children,
                  ...[...state.instances.values()].map((entry) => entry.children)
                ]) {
                  const attached = parent.indexOf(instance);
                  if (attached !== -1) parent.splice(attached, 1);
                }
                instance.children.length = 0;
                state.instances.delete(command.id);
                state.events.delete(command.id);
                state.lifecycles.delete(command.id);
                state.localCallbacks.delete(command.id);
                state.localCleanups.delete(command.id);
              }
            }
            container.commits.push(batch);
          });
          runCommitTasks(tasks);
        },
        afterAccept() {
          if (status !== "applied" || acceptedCallbacksRan) return;
          acceptedCallbacksRan = true;
          const tasks = [];
          for (const key of invokeKeys) {
            const [id, type] = parseKey(key);
            const instance = state.instances.get(id);
            const listener = state.localCallbacks.get(id)?.get(type);
            if (instance === void 0 || listener === void 0) continue;
            tasks.push(() => {
              let parent = null;
              for (const candidate of state.instances.values()) {
                if (candidate.children.includes(instance)) {
                  parent = candidate;
                  break;
                }
              }
              const cleanup = context.invokeLocalCallback(listener.id, [parent, instance]);
              if (cleanup == null) return;
              if (typeof cleanup !== "function") {
                throw new TypeError(
                  "A universal local host callback must return a cleanup or nothing."
                );
              }
              state.localCleanups.get(id).set(type, cleanup);
            });
          }
          runCommitTasks(tasks);
        },
        abort() {
          if (status !== "prepared") return;
          status = "aborted";
          for (const instance of stagedInstances.values()) instance.children.length = 0;
          stagedInstances.clear();
        }
      };
    },
    getPublicInstance(container, id) {
      return container[OBJECT_DRIVER_STATE].instances.get(id) ?? null;
    }
  };
}
const createContext = createDomContext;
export {
  Activity,
  UNIVERSAL_HMR,
  __useReducerWithGetter,
  __useStateWithGetter,
  createContext,
  createObjectContainer,
  createObjectDriver,
  createPortal,
  createUniversalHostBoundary,
  createUniversalRoot,
  defineUniversalComponent,
  flushUniversalAct,
  flushUniversalSync,
  hmrUniversalComponent,
  hookSlots,
  isRendererRegion,
  memo,
  rendererRegion,
  requestFormReset,
  startTransition,
  universalActivity,
  universalChildren,
  universalComponent,
  universalContext,
  universalFor,
  universalIf,
  universalKey,
  universalList,
  universalPlan,
  universalProps,
  universalSwitch,
  universalTry,
  universalValue,
  use,
  useActionState,
  useBatch,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useFormStatus,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  warmChild,
  warmMemo,
  withSlot
};
