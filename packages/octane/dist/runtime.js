import {
  SUSPENSE_SCRIPT_ATTR,
  STREAM_BOUNDARY_ATTR,
  STREAM_SCRIPT_ATTR,
  STREAM_SEED_COMMENT,
  HYDRATION_START,
  HYDRATION_END,
  HYDRATION_FOR_EMPTY,
  HYDRATION_FOR_ITEMS,
  HYDRATION_TEXT_SEP,
  POSITIVE_NUMERIC_ATTR_PROPS,
  BOOLEAN_ATTR_PROPS,
  VALID_ATTR_NAME,
  isEnumeratedBooleanAttr,
  SUSPENSE_SEED_WIRE_PREFIX,
  REJECTION_SENTINEL_KEY,
  EXTERNAL_HYDRATION_PROMISE,
  HYDRATION_RANGE_BOUNDARY,
  cssStyleValue,
  ATTRIBUTE_ALIASES,
  SVG_ONLY_TAGS,
  VOID_ELEMENTS
} from "./constants.js";
import {
  __profileBail,
  __profileBeginRender,
  __profileComponentSource,
  __profileEndRender,
  __profileHasComponentMetadata,
  __profileResolveHook,
  __profileSchedule,
  __profileTrackComponent
} from "./profiling.js";
import { sanitizeURL, sanitizeURLAttribute } from "./sanitize-url.js";
let PROFILE_COMPONENT_OVERRIDE = null;
function withProfileComponentOverride(target, component, run) {
  const previous = PROFILE_COMPONENT_OVERRIDE;
  PROFILE_COMPONENT_OVERRIDE = { target, component };
  try {
    return run();
  } finally {
    PROFILE_COMPONENT_OVERRIDE = previous;
  }
}
function profileTrackComponent(subject, fallback) {
  const override = PROFILE_COMPONENT_OVERRIDE;
  __profileTrackComponent(
    subject,
    override !== null && override.target === fallback ? override.component : fallback
  );
}
function profilePortalComponent(rawBody) {
  if (typeof rawBody === "function" && __profileHasComponentMetadata(rawBody)) return rawBody;
  const descriptor = rawBody;
  return descriptor != null && descriptor.$$kind === ELEMENT_TAG && typeof descriptor.type === "function" ? descriptor.type : null;
}
function ensureHooks(scope) {
  return scope.hooks ?? (scope.hooks = /* @__PURE__ */ new Map());
}
let nextHookSlot = 0;
function hookSlots(count) {
  const base = nextHookSlot;
  nextHookSlot += count;
  return base;
}
function siteLoc(scope, slotKey) {
  const locs = scope.locs;
  if (locs === void 0) return "";
  const lc = locs[slotKey];
  if (lc === void 0) return "";
  return `${scope.locFile ?? "<unknown>"}:${lc[0]}:${lc[1]}`;
}
function componentSourceLoc(body) {
  if (typeof body !== "function") return void 0;
  try {
    const stamped = body.__oct_loc;
    if (typeof stamped === "string") return stamped;
  } catch {
  }
  try {
    const source = Function.prototype.toString.call(body);
    const match = /["']__octane_loc:([^"'\\\s]+)["']/.exec(source);
    if (match !== null) return decodeURIComponent(match[1]);
  } catch {
  }
  return void 0;
}
function isHydrationSuppressed(el) {
  return el !== null && el.__oct_suppress === true;
}
function hydrationMismatchMode(el) {
  if (isHydrationSuppressed(el)) return 1;
  return el.__oct_loc !== void 0 ? 2 : 0;
}
function warnHydrationValueMismatch(loc, what, serverVal, clientVal) {
  if (process.env.NODE_ENV === "production") return;
  if (!loc) return;
  console.error(
    `Octane hydration mismatch at ${loc}: server rendered ${what} ${JSON.stringify(serverVal)} but the client rendered ${JSON.stringify(clientVal)}. The client value was used. If this difference is intentional (e.g. a timestamp or random id), add suppressHydrationWarning to the element.`
  );
}
function warnHydrationKeptServerValue(loc, what, serverVal, clientVal) {
  if (process.env.NODE_ENV === "production" || !loc) return;
  console.error(
    `Octane hydration mismatch at ${loc}: server rendered ${what} ${JSON.stringify(serverVal)} but the client rendered ${JSON.stringify(clientVal)}. The server value was kept. If this difference is intentional, add suppressHydrationWarning to the element.`
  );
}
function describeHydrationNode(node) {
  if (node === null) return "nothing";
  if (node.nodeType === 1) return `<${node.localName}>`;
  if (node.nodeType === 3) return `text ${JSON.stringify(node.nodeValue)}`;
  if (node.nodeType === 8) {
    if (isBlockOpen(node)) return "a control-flow block";
    if (isBlockClose(node)) return "the end of the parent block (fewer nodes than expected)";
    return "a comment";
  }
  return "a node";
}
function warnHydrationStructuralMismatch(loc, expected, actual) {
  if (process.env.NODE_ENV === "production") return;
  if (!loc) return;
  console.error(
    `Octane hydration mismatch at ${loc}: the client expected ${expected} but the server rendered ${actual}. The mismatched subtree was rebuilt on the client.`
  );
}
function hydrationNodeMatches(server, template2) {
  if (server.nodeType !== template2.nodeType) return false;
  if (server.nodeType !== 1) return true;
  const s = server;
  const t = template2;
  if (s.localName !== t.localName) return false;
  const tAttrs = t.attributes;
  for (let i = 0; i < tAttrs.length; i++) {
    const a = tAttrs[i];
    if (s.getAttribute(a.name) !== a.value) return false;
  }
  let sc = s.firstChild;
  let tc = t.firstChild;
  while (sc !== null && tc !== null) {
    if (sc.nodeType === 8 || tc.nodeType === 8) return true;
    if (sc.nodeType !== tc.nodeType) return true;
    if (tc.nodeType === 1 && !hydrationNodeMatches(sc, tc)) return false;
    sc = sc.nextSibling;
    tc = tc.nextSibling;
  }
  return true;
}
function removeHydrationRange(start, end) {
  let n = start;
  while (n !== null) {
    const next = n === end ? null : n.nextSibling;
    n.remove();
    n = next;
  }
}
let nextClientRootId = 0;
let CURRENT_SCOPE = null;
let CURRENT_BLOCK = null;
const RENDERER_REGION_OWNER = /* @__PURE__ */ Symbol.for("octane.renderer-region.owner");
const RENDERER_REGION_DOM_OWNERS = /* @__PURE__ */ new WeakMap();
const RENDERER_REGION_DOM_BINDINGS = /* @__PURE__ */ new WeakMap();
const DOM_ROOT_DISPOSERS = /* @__PURE__ */ new WeakMap();
let EFFECT_BODY_DEPTH = 0;
let REF_CALLBACK_DEPTH = 0;
let STORE_SYNC_DEPTH = 0;
let EFFECT_EVENT_LIFECYCLE_DEPTH = 0;
function runEffectLifecycleCallback(callback) {
  EFFECT_EVENT_LIFECYCLE_DEPTH++;
  try {
    callback();
  } finally {
    EFFECT_EVENT_LIFECYCLE_DEPTH--;
  }
}
function runEffectCleanupCallback(callback) {
  EFFECT_BODY_DEPTH++;
  try {
    runEffectLifecycleCallback(callback);
  } finally {
    EFFECT_BODY_DEPTH--;
  }
}
const QUEUE = [];
let scheduled = false;
let syncFlush = false;
let inFlush = false;
let TRANSITION_DEPTH = 0;
let ASYNC_TRANSITION_COUNT = 0;
let ACTIVE_TRANSITION_ACTION_BATCH = null;
let IN_FLIGHT_TRANSITION_ACTION_BATCH = null;
let ACTIVE_DISCRETE_EVENT_DEPTH = 0;
function createTransitionActionBatch() {
  return { updates: /* @__PURE__ */ new Map(), pendingActions: 0, closed: false, flushed: false };
}
function transitionActionBatchForUpdate() {
  if (ACTIVE_TRANSITION_ACTION_BATCH !== null) return ACTIVE_TRANSITION_ACTION_BATCH;
  if (syncFlush || ACTIVE_DISCRETE_EVENT_DEPTH > 0) return null;
  return IN_FLIGHT_TRANSITION_ACTION_BATCH;
}
function rebaseTransitionActionUpdate(update) {
  if (Object.is(update.baseValue, update.slot.value)) return update.value;
  let value = update.slot.value;
  for (const operation of update.operations) value = operation(value);
  update.baseValue = update.slot.value;
  update.value = value;
  if (update.slot.pendingActionBatch !== void 0) update.slot.pendingActionValue = value;
  return value;
}
function stagedTransitionValue(slot) {
  const batch = transitionActionBatchForUpdate();
  if (batch === null) return slot.value;
  const update = batch.updates.get(slot);
  return update === void 0 ? slot.value : rebaseTransitionActionUpdate(update);
}
function stageTransitionValue(slot, block, operation, value, forceRender = false) {
  const batch = transitionActionBatchForUpdate();
  if (batch === null) return false;
  const current = batch.updates.get(slot);
  if (current === void 0) {
    batch.updates.set(slot, {
      slot,
      block,
      operations: [operation],
      baseValue: slot.value,
      value,
      forceRender
    });
  } else {
    current.operations.push(operation);
    current.value = value;
    current.forceRender ||= forceRender;
  }
  slot.pendingActionBatch = batch;
  slot.pendingActionValue = value;
  return true;
}
function flushTransitionActionBatch(batch) {
  if (batch.flushed) return;
  batch.flushed = true;
  for (const update of batch.updates.values()) {
    const { slot, block, forceRender } = update;
    const value = rebaseTransitionActionUpdate(update);
    if (slot.pendingActionBatch === batch) {
      slot.pendingActionBatch = void 0;
      slot.pendingActionValue = void 0;
    }
    if (block.disposed) continue;
    const changed = !Object.is(slot.value, value);
    if (!changed && !forceRender) continue;
    if (changed) slot.value = value;
    if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
      __profileSchedule(
        block,
        update.profileType ?? (forceRender ? "reducer" : "state"),
        update.profileSlot
      );
    scheduleRender(block);
  }
  batch.updates.clear();
  if (IN_FLIGHT_TRANSITION_ACTION_BATCH === batch) {
    IN_FLIGHT_TRANSITION_ACTION_BATCH = null;
  }
}
function flushTransitionActionBatchIfReady(batch) {
  if (batch.closed && batch.pendingActions === 0) flushTransitionActionBatch(batch);
}
let DEFERRED_SPAWN = false;
let TRANSITION_PENDING_COUNT = 0;
const TRANSITION_LISTENERS = /* @__PURE__ */ new Set();
let TRANSITION_LISTENER_PUBLISH_DEPTH = 0;
const HELD_TRANSITIONS = /* @__PURE__ */ new Set();
const STAGED_REVEALS = /* @__PURE__ */ new Set();
let flushingStagedReveals = false;
let deferringStagedRevealEffects = false;
class ViewTransitionPseudoElement {
  /** The pseudo-element selector, e.g. `::view-transition-new(hero)`. */
  selector;
  constructor(pseudo, name) {
    this.selector = "::view-transition-" + pseudo + "(" + name + ")";
  }
  animate(keyframes, options) {
    const opts = typeof options === "number" ? { duration: options } : { ...options ?? {} };
    opts.pseudoElement = this.selector;
    return document.documentElement.animate(keyframes, opts);
  }
  getAnimations() {
    const all = document.documentElement.getAnimations?.() ?? [];
    const out = [];
    for (const a of all) {
      const effect = a.effect;
      if (effect !== null && effect.pseudoElement === this.selector) out.push(a);
    }
    return out;
  }
}
let VT_SEEN = false;
const VT_REGISTRY = /* @__PURE__ */ new Set();
let VT_ENTERED = [];
const VT_DIRTY = /* @__PURE__ */ new Set();
let VT_DRAIN = false;
const VT_IDLE = 0, VT_PENDING_UPDATE = 1, VT_ANIMATING = 2;
let VT_STATE = VT_IDLE;
let VT_HANDLE = null;
let VT_NAME_SEQ = 0;
let VT_PASSIVES_HELD = false;
const VT_CLEANUPS = /* @__PURE__ */ new WeakMap();
let VT_PENDING_TYPES = [];
function addTransitionType(type) {
  VT_SEEN = true;
  if (VT_PENDING_TYPES.indexOf(type) === -1) VT_PENDING_TYPES.push(type);
}
function __vtSeen() {
  VT_SEEN = true;
}
function vtMarkDirtyFromCurrentBlock() {
  for (let b = CURRENT_BLOCK; b !== null; b = b.parentBlock) {
    if (b.vt !== null) {
      if (!b.disposed) VT_DIRTY.add(b);
      return;
    }
  }
}
function vtRangeElements(block) {
  const els = [];
  if (block.startMarker !== null && block.endMarker !== null) {
    for (let n = block.startMarker.nextSibling; n !== null && n !== block.endMarker; ) {
      if (n.nodeType === 1) els.push(n);
      n = n.nextSibling;
    }
  } else {
    const kids = block.parentNode.children;
    for (let i = 0; i < kids.length; i++) els.push(kids[i]);
  }
  return els;
}
function vtResolveClass(props, kind, types) {
  if (props === null) return "auto";
  let v = kind === "enter" ? props.enter : kind === "exit" ? props.exit : kind === "update" ? props.update : kind === "share" ? props.share : kind === "parent-enter" ? props.parentEnter : props.parentExit;
  if (v == null) v = props.default;
  if (v == null) return "auto";
  if (typeof v === "string") return v;
  for (const t of types) {
    const hit = v[t];
    if (hit != null) return hit;
  }
  return v.default != null ? v.default : "auto";
}
function vtPreClass(props, types) {
  if (props === null) return "auto";
  if (props.share != null && typeof props.name === "string")
    return vtResolveClass(props, "share", types);
  if (props.exit != null) return vtResolveClass(props, "exit", types);
  if (props.parentExit != null) return vtResolveClass(props, "parent-exit", types);
  if (props.update != null) return vtResolveClass(props, "update", types);
  return vtResolveClass(props, "update", types);
}
function vtAllNone(props, types) {
  return vtResolveClass(props, "exit", types) === "none" && vtResolveClass(props, "update", types) === "none" && vtResolveClass(props, "share", types) === "none" && (!vtRelayParticipates(props, "parent-exit") || vtResolveClass(props, "parent-exit", types) === "none");
}
function vtRelayParticipates(props, kind) {
  if (props === null) return false;
  return kind === "parent-exit" ? props.parentExit != null || typeof props.onParentExit === "function" : props.parentEnter != null || typeof props.onParentEnter === "function";
}
function vtRelayOutermost(b, kind, inUnit, types) {
  let outer = vtNearestBoundaryAncestor(b);
  if (outer === null || !inUnit(outer)) return null;
  while (true) {
    const up = vtNearestBoundaryAncestor(outer);
    if (up === null || !inUnit(up)) return outer;
    if (!vtRelayParticipates(outer.vt, kind) || vtResolveClass(outer.vt, kind, types) === "none") {
      return null;
    }
    outer = up;
  }
}
function vtApplyStyles(rec, cls) {
  const props = rec.block.vt;
  if (rec.name === "") {
    rec.name = props !== null && typeof props.name === "string" ? props.name : "\u2039vt" + ++VT_NAME_SEQ + "\u203A";
  }
  rec.cls = cls === "auto" || cls === "none" ? "" : cls;
  for (let i = 0; i < rec.els.length; i++) {
    const n = i === 0 ? rec.name : rec.name + "-" + i;
    const style = rec.els[i].style;
    if (style === void 0) continue;
    style.setProperty("view-transition-name", n);
    if (rec.cls !== "") style.setProperty("view-transition-class", rec.cls);
  }
}
function vtRevertNames(recs) {
  for (const rec of recs) {
    for (const el of rec.els) {
      const style = el.style;
      if (style === void 0) continue;
      style.removeProperty("view-transition-name");
      if (rec.cls !== "") style.removeProperty("view-transition-class");
    }
  }
}
function vtInViewport(rect) {
  if (typeof window === "undefined") return true;
  const iw = window.innerWidth, ih = window.innerHeight;
  return rect.x < iw && rect.y < ih && rect.x + rect.width > 0 && rect.y + rect.height > 0;
}
function vtNearestBoundaryAncestor(b) {
  for (let p = b.parentBlock; p !== null; p = p.parentBlock) {
    if (p.vt !== null) return p;
  }
  return null;
}
function vtElsChanged(before, after) {
  if (before.length !== after.length) return true;
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== after[i]) return true;
  }
  return false;
}
function vtRectChanged(rec) {
  if (rec.rect === null || rec.els.length === 0) return false;
  const el = rec.els[0];
  if (typeof el.getBoundingClientRect !== "function") return false;
  const r = el.getBoundingClientRect();
  return r.x !== rec.rect.x || r.y !== rec.rect.y || r.width !== rec.rect.width || r.height !== rec.rect.height;
}
function vtFireCallback(kind, rec, types) {
  const props = rec.block.vt;
  if (props === null) return;
  const cb = kind === "enter" ? props.onEnter : kind === "exit" ? props.onExit : kind === "update" ? props.onUpdate : kind === "share" ? props.onShare : kind === "parent-enter" ? props.onParentEnter : props.onParentExit;
  if (typeof cb !== "function") return;
  const prevCleanup = VT_CLEANUPS.get(rec.block);
  if (prevCleanup !== void 0) {
    VT_CLEANUPS.delete(rec.block);
    try {
      prevCleanup();
    } catch (err) {
      console.error(err);
    }
  }
  const instance = {
    name: rec.name,
    group: new ViewTransitionPseudoElement("group", rec.name),
    imagePair: new ViewTransitionPseudoElement("image-pair", rec.name),
    old: new ViewTransitionPseudoElement("old", rec.name),
    new: new ViewTransitionPseudoElement("new", rec.name)
  };
  try {
    const cleanup = cb(instance, types);
    if (typeof cleanup === "function") VT_CLEANUPS.set(rec.block, cleanup);
  } catch (err) {
    console.error(err);
  }
}
function queueAllTransition() {
  if (QUEUE.length === 0) return false;
  for (let i = 0; i < QUEUE.length; i++) {
    if (QUEUE[i].pendingMode !== "transition") return false;
  }
  return true;
}
function vtWouldWrap() {
  return VT_SEEN && VT_STATE === VT_IDLE && activeHydration() === null && queueAllTransition() && typeof document !== "undefined" && document.startViewTransition !== void 0;
}
function vtWouldWrapResume() {
  return VT_SEEN && VT_STATE === VT_IDLE && activeHydration() === null && !inFlush && !VT_DRAIN && typeof document !== "undefined" && document.startViewTransition !== void 0;
}
function tickTransitionCount(delta) {
  TRANSITION_PENDING_COUNT += delta;
  if (TRANSITION_PENDING_COUNT < 0) TRANSITION_PENDING_COUNT = 0;
  TRANSITION_LISTENER_PUBLISH_DEPTH++;
  try {
    for (const fn of TRANSITION_LISTENERS) {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    }
  } finally {
    TRANSITION_LISTENER_PUBLISH_DEPTH--;
  }
}
const INSERTION = 0, LAYOUT = 1, PASSIVE = 2;
const effectQueues = [[], [], []];
const effectEventQueue = [];
const effectEventCommitActions = [];
let passiveScheduled = false;
let commitSeq = 0;
const storeSyncQueue = [];
const refAttachQueue = [];
let WIP_CAPTURE = null;
function createOffscreenCapture() {
  return {
    effects: [[], [], []],
    events: [],
    eventActions: [],
    refs: [],
    stores: []
  };
}
let EFFECT_EVENT_RENDER_TARGET = effectEventQueue;
let EFFECT_EVENT_ACTION_TARGET = effectEventCommitActions;
const activeFragments = /* @__PURE__ */ new Set();
function reapplyFragmentBindings() {
  if (activeFragments.size === 0) return;
  for (const fi of activeFragments) fi._reapply();
}
let IS_OCTANE_ACT_ENVIRONMENT = false;
let actScopeDepth = 0;
function setIsOctaneActEnvironment(value) {
  IS_OCTANE_ACT_ENVIRONMENT = value;
}
const NESTED_UPDATE_LIMIT = 50;
const ACT_DRAIN_LIMIT = NESTED_UPDATE_LIMIT + 50;
let UPDATE_CHAIN_ID = 0;
function inNestedUpdateCallback() {
  return EFFECT_BODY_DEPTH > 0 || REF_CALLBACK_DEPTH > 0 || STORE_SYNC_DEPTH > 0;
}
class MaximumUpdateDepthError extends Error {
}
function maximumUpdateDepthError() {
  return new MaximumUpdateDepthError(
    "Maximum update depth exceeded. Octane limits the number of nested updates to prevent infinite loops."
  );
}
let CROSS_RENDER_WARNINGS = null;
function componentName(block) {
  let body = block.body;
  if (body.displayName) return body.displayName;
  const hmr2 = body[HMR];
  if (hmr2 !== void 0) body = hmr2.fn;
  return body.displayName || body.name || "Unknown";
}
function warnCrossComponentRenderUpdate(target, source) {
  if (process.env.NODE_ENV === "production") return;
  const warnings = CROSS_RENDER_WARNINGS ??= /* @__PURE__ */ new WeakMap();
  let sources = warnings.get(target.body);
  if (sources === void 0) warnings.set(target.body, sources = /* @__PURE__ */ new WeakSet());
  if (sources.has(source.body)) return;
  sources.add(source.body);
  console.error(
    `Cannot update a component (\`${componentName(target)}\`) while rendering a different component (\`${componentName(source)}\`). Move the update out of the rendering component body.`
  );
}
function scheduleRender(block) {
  if (block.disposed) return;
  if (process.env.NODE_ENV !== "production" && IS_OCTANE_ACT_ENVIRONMENT && actScopeDepth === 0 && !syncFlush) {
    console.error(
      "An update to a component was not wrapped in act(...).\n\nWhen testing, code that causes state updates should be wrapped into act(...):\n\n  act(() => {\n    /* fire events that update state */\n  });\n  /* assert on the output */\n\nThis ensures you're testing the behavior the user would see in the browser."
    );
  }
  const renderPhaseSelf = CURRENT_BLOCK === block;
  const renderPhaseOther = CURRENT_BLOCK !== null && !renderPhaseSelf && TRANSITION_LISTENER_PUBLISH_DEPTH === 0;
  if (renderPhaseOther) {
    block.crossRenderUpdate = true;
    warnCrossComponentRenderUpdate(block, CURRENT_BLOCK);
  }
  const mode = TRANSITION_DEPTH > 0 || renderPhaseSelf && block.currentRenderMode === "transition" || !syncFlush && ACTIVE_DISCRETE_EVENT_DEPTH === 0 && ASYNC_TRANSITION_COUNT > 0 ? "transition" : "urgent";
  const deferred = DEFERRED_SPAWN || renderPhaseSelf && block.currentRenderDeferred;
  if (block.pending) {
    if (mode === "urgent") {
      block.pendingMode = "urgent";
      block.pendingDeferred = false;
    }
    return;
  }
  if (inNestedUpdateCallback()) {
    if (block.nestedUpdateChain !== UPDATE_CHAIN_ID) {
      block.nestedUpdateChain = UPDATE_CHAIN_ID;
      block.nestedUpdateCount = 0;
    }
    if (++block.nestedUpdateCount > NESTED_UPDATE_LIMIT) block.nestedUpdateError = true;
  } else if (CURRENT_BLOCK === null) {
    UPDATE_CHAIN_ID++;
    block.nestedUpdateChain = UPDATE_CHAIN_ID;
    block.nestedUpdateCount = 0;
    block.nestedUpdateError = false;
  }
  block.pending = true;
  block.pendingMode = mode;
  block.pendingDeferred = deferred;
  QUEUE.push(block);
  if (syncFlush) return;
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(flush);
  }
}
let DRAIN_ID = 0;
const RENDER_PHASE_UPDATE_LIMIT = 25;
function blockDepth(b) {
  let d = 0;
  for (let p = b.parentBlock; p !== null; p = p.parentBlock) d++;
  return d;
}
function belongsToBlockTree(block, root) {
  for (let current = block; current !== null; current = current.parentBlock) {
    if (current === root) return true;
  }
  return false;
}
function drainHydrationRenderPhaseUpdates(root) {
  let renders = null;
  for (; ; ) {
    let index = -1;
    for (let i = 0; i < QUEUE.length; i++) {
      if (belongsToBlockTree(QUEUE[i], root)) {
        index = i;
        break;
      }
    }
    if (index === -1) return;
    const block = QUEUE.splice(index, 1)[0];
    if (!block.pending || block.disposed) continue;
    const seen = (renders ??= /* @__PURE__ */ new Map()).get(block) ?? 0;
    if (seen >= RENDER_PHASE_UPDATE_LIMIT) {
      throw new Error(
        "Too many re-renders. Octane limits the number of renders to prevent an infinite loop."
      );
    }
    renders.set(block, seen + 1);
    block.crossRenderUpdate = false;
    try {
      renderBlock(block);
    } catch (error) {
      handleRenderError(block, error);
    }
  }
}
function sortWaveByDepth(wave) {
  const depth = /* @__PURE__ */ new Map();
  for (let i = 0; i < wave.length; i++) depth.set(wave[i], blockDepth(wave[i]));
  wave.sort((a, b) => depth.get(a) - depth.get(b));
  return wave;
}
function drainQueue() {
  let pendingError = null;
  const drainId = ++DRAIN_ID;
  if (QUEUE.length > 1) sortWaveByDepth(QUEUE);
  for (let i = 0; i < QUEUE.length; i++) {
    const block = QUEUE[i];
    if (!block.pending && !block.nestedUpdateError) continue;
    block.pending = false;
    if (block.disposed) {
      block.nestedUpdateError = false;
      continue;
    }
    const crossRenderUpdate = block.crossRenderUpdate;
    block.crossRenderUpdate = false;
    try {
      if (block.nestedUpdateError) {
        block.nestedUpdateError = false;
        throw maximumUpdateDepthError();
      }
      const hiddenTry = findSuspenseHiddenTry(block);
      if (hiddenTry !== null) {
        attemptHiddenReveal(hiddenTry, block.pendingMode ?? "urgent");
        continue;
      }
      if (block.drainStamp === drainId) {
        if (++block.drainRenders > RENDER_PHASE_UPDATE_LIMIT) {
          throw crossRenderUpdate ? maximumUpdateDepthError() : new Error(
            "Too many re-renders. Octane limits the number of renders to prevent an infinite loop."
          );
        }
      } else {
        block.drainStamp = drainId;
        block.drainRenders = 1;
      }
      renderBlock(block);
    } catch (err) {
      try {
        handleRenderError(block, err);
      } catch (unhandled) {
        if (pendingError === null) pendingError = { err: unhandled, all: [unhandled] };
        else {
          pendingError.all.push(unhandled);
          pendingError.err = typeof AggregateError === "function" ? new AggregateError(
            pendingError.all,
            "Multiple errors were thrown during the render flush."
          ) : pendingError.all[0];
        }
        let root = block;
        while (root.parentBlock !== null) root = root.parentBlock;
        if (root.kind === "root" && !root.disposed) unmountBlock(root);
      }
    }
  }
  QUEUE.length = 0;
  return pendingError;
}
function flush() {
  scheduled = false;
  if (inFlush) {
    if (QUEUE.length > 0 && !scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
    return;
  }
  if (VT_SEEN) {
    if (VT_STATE !== VT_IDLE) {
      if (queueAllTransition()) return;
      if (QUEUE.length > 0 && VT_HANDLE !== null) VT_HANDLE.skipTransition();
    } else if (vtWouldWrap()) {
      vtFlush();
      return;
    }
  }
  flushWork();
}
function flushWork() {
  inFlush = true;
  let clearTypes = false;
  if (VT_PENDING_TYPES.length !== 0) {
    for (let i = 0; i < QUEUE.length; i++) {
      if (QUEUE[i].pendingMode === "transition") {
        clearTypes = true;
        break;
      }
    }
  }
  try {
    if (QUEUE.length > 0) drainPassivesBeforeRender();
    const pendingError = drainQueue();
    commitEffects();
    if (pendingError !== null) throw pendingError.err;
  } finally {
    inFlush = false;
    if (clearTypes) VT_PENDING_TYPES = [];
  }
}
function vtFlush(work = flushWork) {
  const types = VT_PENDING_TYPES;
  VT_PENDING_TYPES = [];
  const recs = [];
  for (const b of VT_REGISTRY) {
    if (b.disposed) {
      VT_REGISTRY.delete(b);
      continue;
    }
    if (vtAllNone(b.vt, types)) continue;
    const els = vtRangeElements(b);
    const rec = { block: b, els, rect: null, name: "", cls: "" };
    if (els.length > 0 && typeof els[0].getBoundingClientRect === "function") {
      const r = els[0].getBoundingClientRect();
      rec.rect = { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    vtApplyStyles(rec, vtPreClass(b.vt, types));
    recs.push(rec);
  }
  VT_ENTERED = [];
  VT_DIRTY.clear();
  VT_STATE = VT_PENDING_UPDATE;
  VT_HANDLE = null;
  let acts = [];
  let skipRequested = false;
  const update = () => {
    VT_DRAIN = true;
    let pendingError = null;
    try {
      work();
    } catch (err) {
      pendingError = { err };
    } finally {
      VT_DRAIN = false;
    }
    const exits = [];
    for (const rec of recs) {
      if (rec.block.disposed) {
        exits.push(rec);
      } else {
        const before = rec.els;
        rec.els = vtRangeElements(rec.block);
        const changed = VT_DIRTY.has(rec.block) || vtRectChanged(rec);
        vtApplyStyles(rec, rec.cls === "" ? "auto" : rec.cls);
        if ((changed || vtElsChanged(before, rec.els)) && vtResolveClass(rec.block.vt, "update", types) !== "none") {
          acts.push({ kind: "update", rec });
        }
      }
    }
    const enteredSet = new Set(VT_ENTERED);
    const enters = [];
    const nestedEntered = [];
    for (const b of VT_ENTERED) {
      if (b.disposed) continue;
      const anc = vtNearestBoundaryAncestor(b);
      if (anc !== null && enteredSet.has(anc)) {
        nestedEntered.push(b);
        continue;
      }
      const rec = { block: b, els: vtRangeElements(b), rect: null, name: "", cls: "" };
      const cls = vtResolveClass(b.vt, "enter", types);
      if (cls !== "none" || typeof b.vt?.name === "string") vtApplyStyles(rec, cls);
      recs.push(rec);
      enters.push(rec);
      if (cls !== "none") acts.push({ kind: "enter", rec });
    }
    const sharedBlocks = /* @__PURE__ */ new Set();
    for (const exitRec of exits) {
      const nm = exitRec.block.vt !== null ? exitRec.block.vt.name : void 0;
      let paired = null;
      if (typeof nm === "string") {
        for (const enterRec of enters) {
          if (enterRec.block.vt !== null && enterRec.block.vt.name === nm) {
            paired = enterRec;
            break;
          }
        }
      }
      if (paired !== null) {
        const exitVisible = exitRec.rect === null || vtInViewport(exitRec.rect);
        let enterVisible = true;
        if (paired.els.length > 0 && typeof paired.els[0].getBoundingClientRect === "function") {
          const r = paired.els[0].getBoundingClientRect();
          enterVisible = vtInViewport({ x: r.x, y: r.y, width: r.width, height: r.height });
        }
        if (exitVisible && enterVisible) {
          sharedBlocks.add(exitRec.block);
          sharedBlocks.add(paired.block);
          if (vtResolveClass(exitRec.block.vt, "share", types) !== "none") {
            acts.push({ kind: "share", rec: exitRec });
          }
          for (let i = 0; i < acts.length; i++) {
            if (acts[i].rec === paired && acts[i].kind === "enter") {
              acts.splice(i, 1);
              break;
            }
          }
          continue;
        }
      }
      const anc = vtNearestBoundaryAncestor(exitRec.block);
      if (anc !== null && anc.disposed) continue;
      if (vtResolveClass(exitRec.block.vt, "exit", types) !== "none") {
        acts.push({ kind: "exit", rec: exitRec });
      }
    }
    for (const rec of exits) {
      const vt2 = rec.block.vt;
      if (!vtRelayParticipates(vt2, "parent-exit")) continue;
      if (sharedBlocks.has(rec.block)) continue;
      const outer = vtRelayOutermost(rec.block, "parent-exit", (x) => x.disposed, types);
      if (outer === null || sharedBlocks.has(outer)) continue;
      if (vtResolveClass(outer.vt, "exit", types) === "none") continue;
      const cls = vtResolveClass(vt2, "parent-exit", types);
      if (cls === "none") continue;
      acts.push({ kind: "parent-exit", rec });
    }
    for (const b of nestedEntered) {
      if (!vtRelayParticipates(b.vt, "parent-enter")) continue;
      const outer = vtRelayOutermost(b, "parent-enter", (x) => enteredSet.has(x), types);
      if (outer === null || sharedBlocks.has(outer)) continue;
      if (vtResolveClass(outer.vt, "enter", types) === "none") continue;
      const cls = vtResolveClass(b.vt, "parent-enter", types);
      if (cls === "none") continue;
      const rec = { block: b, els: vtRangeElements(b), rect: null, name: "", cls: "" };
      vtApplyStyles(rec, cls);
      recs.push(rec);
      acts.push({ kind: "parent-enter", rec });
    }
    VT_STATE = VT_ANIMATING;
    if (acts.length === 0) {
      skipRequested = true;
      if (VT_HANDLE !== null) VT_HANDLE.skipTransition();
    }
    if (pendingError !== null) throw pendingError.err;
  };
  let vt;
  try {
    vt = document.startViewTransition(update);
  } catch (err) {
    VT_STATE = VT_IDLE;
    vtRevertNames(recs);
    if (QUEUE.length > 0 && !scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
    throw err;
  }
  VT_HANDLE = vt;
  if (skipRequested) vt.skipTransition();
  vt.ready.then(
    () => {
      vtRevertNames(recs);
      for (const a of acts) vtFireCallback(a.kind, a.rec, types);
    },
    () => {
      vtRevertNames(recs);
    }
  );
  const settle = () => {
    VT_STATE = VT_IDLE;
    VT_HANDLE = null;
    if (VT_PASSIVES_HELD) {
      VT_PASSIVES_HELD = false;
      if (!passiveScheduled) schedulePassiveFlush();
    }
    if (QUEUE.length > 0 && !scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
  };
  vt.finished.then(settle, (err) => {
    settle();
    queueMicrotask(() => {
      throw err;
    });
  });
}
function drainPassivesBeforeRender() {
  if (effectQueues[PASSIVE].length > 0 || pendingPassiveUnmounts.length > 0) drainPassiveEffects();
}
function flushSync(fn) {
  if (inFlush) return fn();
  if (VT_SEEN && VT_STATE !== VT_IDLE && VT_HANDLE !== null) VT_HANDLE.skipTransition();
  const prevSync = syncFlush;
  syncFlush = true;
  try {
    const result = fn();
    inFlush = true;
    let pendingError = null;
    try {
      if (QUEUE.length > 0) drainPassivesBeforeRender();
      pendingError = drainQueue();
      commitEffects();
      if (QUEUE.length > 0) {
        const seen = new Set(QUEUE);
        let defer = false;
        for (let guard = 0; QUEUE.length > 0 && !defer && guard < LAYOUT_CASCADE_LIMIT; guard++) {
          drainPassivesBeforeRender();
          const err = drainQueue();
          if (err !== null && pendingError === null) pendingError = err;
          commitEffects();
          for (let i = 0; i < QUEUE.length; i++) {
            const b = QUEUE[i];
            if (seen.has(b)) {
              defer = true;
              break;
            }
            seen.add(b);
          }
        }
      }
    } finally {
      inFlush = false;
    }
    if (QUEUE.length > 0 && !scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
    if (pendingError !== null) throw pendingError.err;
    return result;
  } finally {
    syncFlush = prevSync;
  }
}
const LAYOUT_CASCADE_LIMIT = 50;
function queueRefAttach(scope, fn) {
  (WIP_CAPTURE !== null ? WIP_CAPTURE.refs : refAttachQueue).push({
    fn,
    seq: commitSeq++,
    block: scope.block
  });
}
const refDetachQueue = [];
function queueRefDetach(ref, el) {
  if (ref == null || SUPPRESS_UNCOMMITTED_REF_DETACH) return;
  refDetachQueue.push(ref, el, TEARDOWN_HANDLER);
}
let SUPPRESS_UNCOMMITTED_REF_DETACH = false;
function drainRefDetaches() {
  if (refDetachQueue.length === 0) return;
  const q = refDetachQueue.splice(0);
  for (let i = 0; i < q.length; i += 3) {
    try {
      REF_CALLBACK_DEPTH++;
      try {
        attachRef(q[i], null, q[i + 1]);
      } finally {
        REF_CALLBACK_DEPTH--;
      }
    } catch (err) {
      if (err instanceof MaximumUpdateDepthError) throw err;
      const handler = q[i + 2];
      if (handler !== null) handler(err);
      else console.error(err);
    }
  }
}
function drainRefAttaches() {
  if (refAttachQueue.length === 0) return;
  const q = refAttachQueue.splice(0);
  q.sort((a, b) => comparePostOrder(a.block, a.seq, b.block, b.seq));
  for (const r of q) {
    if (blockSubtreeDisposed(r.block)) continue;
    try {
      REF_CALLBACK_DEPTH++;
      try {
        r.fn();
      } finally {
        REF_CALLBACK_DEPTH--;
      }
    } catch (err) {
      if (err instanceof MaximumUpdateDepthError) throw err;
      const handler = findTryHandler(r.block);
      if (handler) handler(err);
      else console.error(err);
    }
  }
}
function blockSubtreeDisposed(block) {
  let b = block;
  while (b !== null) {
    if (b.disposed) return true;
    b = b.parentBlock;
  }
  return false;
}
function commitEffects() {
  drainEffectEventUpdates();
  drainEffectEventCommitActions();
  drainControlledSyncs();
  const mutationBatch = drainMutationEffects();
  drainRefDetaches();
  drainRefAttaches();
  reapplyFragmentBindings();
  if (mutationBatch !== null) runLayoutEffects(mutationBatch);
  drainStoreSyncs();
  if ((effectQueues[PASSIVE].length > 0 || pendingPassiveUnmounts.length > 0) && !passiveScheduled) {
    schedulePassiveFlush();
  }
}
function schedulePassiveFlush() {
  passiveScheduled = true;
  schedulePostPaint(() => {
    if (VT_STATE === VT_ANIMATING) {
      passiveScheduled = false;
      VT_PASSIVES_HELD = true;
      return;
    }
    passiveScheduled = false;
    drainPassivePhase();
  });
}
function drainPassiveEffects() {
  passiveScheduled = false;
  drainPassivePhase();
}
function hasPendingWork() {
  return QUEUE.length > 0 || effectEventQueue.length > 0 || effectEventCommitActions.length > 0 || effectQueues[INSERTION].length > 0 || effectQueues[LAYOUT].length > 0 || effectQueues[PASSIVE].length > 0 || pendingPassiveUnmounts.length > 0 || storeSyncQueue.length > 0 || hasControlledSyncs();
}
function drainEffectEventUpdates() {
  if (effectEventQueue.length === 0) return;
  const q = effectEventQueue.splice(0);
  for (let i = 0; i < q.length; i++) {
    const entry = q[i];
    const block = entry.block;
    if (!entry.cell.active || blockSubtreeDisposed(block) || // Independently scheduled siblings may complete before another child
    // suspends their shared boundary. That boundary soft-detaches the try
    // subtree, so its completed payload is still uncommitted. Do not use the
    // broader inactive check: hidden Activity renders intentionally publish
    // fresh Effect Event bodies while their DOM/effects stay preserved.
    findSuspenseHiddenTry(block) !== null || block.effectEventRenderVersion !== entry.renderVersion || block.effectEventCompletedVersion !== entry.renderVersion) {
      continue;
    }
    entry.cell.impl = entry.nextImpl;
  }
}
function act(fn) {
  actScopeDepth++;
  let result;
  try {
    result = fn();
  } catch (err) {
    actScopeDepth--;
    return Promise.reject(err);
  }
  if (result !== null && typeof result === "object" && typeof result.then === "function") {
    return (async () => {
      try {
        const value = await result;
        for (let i = 0; i < ACT_DRAIN_LIMIT; i++) {
          for (let j = 0; j < 5; j++) await Promise.resolve();
          drainPassiveEffects();
          if (!hasPendingWork()) return value;
        }
        throw new Error(
          `act(): scheduler did not stabilize after ${ACT_DRAIN_LIMIT} iterations \u2014 likely an infinite render loop`
        );
      } finally {
        actScopeDepth--;
      }
    })();
  }
  try {
    for (let i = 0; i < ACT_DRAIN_LIMIT; i++) {
      if (vtWouldWrap()) flush();
      else flushSync(() => {
      });
      drainPassiveEffects();
      if (!hasPendingWork()) break;
      if (i === ACT_DRAIN_LIMIT - 1) {
        throw new Error(
          `act(): scheduler did not stabilize after ${ACT_DRAIN_LIMIT} iterations \u2014 likely an infinite render loop`
        );
      }
    }
  } catch (err) {
    actScopeDepth--;
    return Promise.reject(err);
  }
  return (async () => {
    try {
      for (let i = 0; i < ACT_DRAIN_LIMIT; i++) {
        for (let j = 0; j < 5; j++) await Promise.resolve();
        drainPassiveEffects();
        if (!hasPendingWork()) return result;
      }
      throw new Error(
        `act(): scheduler did not stabilize after ${ACT_DRAIN_LIMIT} iterations \u2014 likely an infinite render loop`
      );
    } finally {
      actScopeDepth--;
    }
  })();
}
function blockIsAncestorOf(anc, node) {
  for (let b = node.parentBlock; b !== null; b = b.parentBlock) {
    if (b === anc) return true;
  }
  return false;
}
function comparePostOrder(aBlock, aSeq, bBlock, bSeq) {
  if (aBlock !== bBlock && aBlock !== null && bBlock !== null) {
    if (blockIsAncestorOf(aBlock, bBlock)) return 1;
    if (blockIsAncestorOf(bBlock, aBlock)) return -1;
  }
  return aSeq - bSeq;
}
function compareEffectPostOrder(a, b) {
  return comparePostOrder(a.scope.block, a.seq, b.scope.block, b.seq);
}
function fireEffectCleanup(e) {
  const slot = e.scope.hooks?.get(e.slot);
  if (slot && slot.cleanup) {
    const cleanup = slot.cleanup;
    slot.cleanup = void 0;
    try {
      runEffectCleanupCallback(cleanup);
    } catch (err) {
      if (err instanceof MaximumUpdateDepthError) throw err;
      const handler = findTryHandler(e.scope.block);
      if (handler) handler(err);
      else console.error(err);
    }
  }
}
function runEffectBody(e) {
  let cleanup;
  try {
    EFFECT_BODY_DEPTH++;
    try {
      cleanup = e.fn.apply(null, e.args ?? []);
    } finally {
      EFFECT_BODY_DEPTH--;
    }
  } catch (err) {
    if (err instanceof MaximumUpdateDepthError) throw err;
    const handler = findTryHandler(e.scope.block);
    if (handler) handler(err);
    else console.error(err);
    return;
  }
  if (typeof cleanup === "function") {
    const slot = e.scope.hooks?.get(e.slot);
    if (slot) slot.cleanup = cleanup;
  }
}
function drainMutationEffects() {
  const ins = effectQueues[INSERTION];
  const lay = effectQueues[LAYOUT];
  if (ins.length === 0 && lay.length === 0) return null;
  const q = ins.length === 0 ? lay.splice(0) : lay.length === 0 ? ins.splice(0) : ins.splice(0).concat(lay.splice(0));
  q.sort(compareEffectPostOrder);
  const n = q.length;
  let i = 0;
  while (i < n) {
    const scope = q[i].scope;
    let end = i + 1;
    while (end < n && q[end].scope === scope) end++;
    for (let k = i; k < end; k++) {
      const e = q[k];
      if (e.phase === INSERTION && !e.scope.block.disposed) fireEffectCleanup(e);
    }
    for (let k = i; k < end; k++) {
      const e = q[k];
      if (e.phase === INSERTION && !e.scope.block.disposed) runEffectBody(e);
    }
    for (let k = i; k < end; k++) {
      const e = q[k];
      if (e.phase === LAYOUT && !e.scope.block.disposed && !inInactiveSubtree(e.scope.block))
        fireEffectCleanup(e);
    }
    i = end;
  }
  return q;
}
function runLayoutEffects(q) {
  for (let i = 0; i < q.length; i++) {
    const e = q[i];
    if (e.phase !== LAYOUT) continue;
    if (e.scope.block.disposed || inInactiveSubtree(e.scope.block)) continue;
    runEffectBody(e);
  }
}
function drainPassivePhase() {
  drainDeferredPassiveUnmounts();
  const pending = effectQueues[PASSIVE];
  if (pending.length === 0) return;
  const q = pending.splice(0);
  q.sort(compareEffectPostOrder);
  for (let i = 0; i < q.length; i++) {
    const e = q[i];
    if (e.scope.block.disposed || inInactiveSubtree(e.scope.block)) continue;
    fireEffectCleanup(e);
  }
  for (let i = 0; i < q.length; i++) {
    const e = q[i];
    if (e.scope.block.disposed || inInactiveSubtree(e.scope.block)) continue;
    runEffectBody(e);
  }
}
function drainEffectEventCommitActions() {
  if (effectEventCommitActions.length === 0) return;
  const q = effectEventCommitActions.splice(0);
  for (let i = 0; i < q.length; i++) {
    try {
      q[i]();
    } catch (err) {
      console.error(err);
    }
  }
}
const pendingPassiveUnmounts = [];
function drainDeferredPassiveUnmounts() {
  if (pendingPassiveUnmounts.length === 0) return;
  const q = pendingPassiveUnmounts.splice(0);
  for (let i = 0; i < q.length; i += 2) {
    try {
      runEffectCleanupCallback(q[i]);
    } catch (err) {
      if (err instanceof MaximumUpdateDepthError) throw err;
      const handler = q[i + 1];
      if (handler !== null) handler(err);
      else console.error(err);
    }
  }
}
function checkStoreChanged(inst) {
  try {
    return !Object.is(inst.value, inst.getSnapshot());
  } catch {
    return true;
  }
}
function drainStoreSyncs() {
  if (storeSyncQueue.length === 0) return;
  const q = storeSyncQueue.splice(0);
  STORE_SYNC_DEPTH++;
  try {
    for (let i = 0; i < q.length; i++) {
      const inst = q[i];
      inst.queued = false;
      if (inst.block.disposed || inInactiveSubtree(inst.block)) continue;
      inst.value = inst.pending;
      if (checkStoreChanged(inst)) inst.forceUpdate();
    }
  } finally {
    STORE_SYNC_DEPTH--;
  }
}
let _postPaintCbs = [];
function drainPostPaint() {
  const cbs = _postPaintCbs;
  _postPaintCbs = [];
  for (let i = 0; i < cbs.length; i++) cbs[i]();
}
let _channel = null;
if (typeof MessageChannel !== "undefined") {
  _channel = new MessageChannel();
  _channel.port1.onmessage = drainPostPaint;
}
function schedulePostPaint(cb) {
  _postPaintCbs.push(cb);
  if (_channel) {
    requestAnimationFrame(() => _channel.port2.postMessage(0));
  } else {
    requestAnimationFrame(() => setTimeout(drainPostPaint, 0));
  }
}
class BlockImpl {
  // Hot fields first (touched by every renderBlock / reconcile iteration).
  body;
  props;
  extra;
  outputHandler;
  memoInChain;
  parentNode;
  parentBlock;
  idState;
  startMarker;
  endMarker;
  exclusiveMarkers;
  itemIndex;
  // Scheduler / lifecycle.
  pending;
  disposed;
  mounted;
  pendingMode;
  currentRenderMode;
  pendingDeferred;
  currentRenderDeferred;
  inactive;
  // Hooks + cleanups (per-block state).
  hooks;
  cleanups;
  effectSlots;
  children;
  _slots;
  refFields;
  $$ctxValues;
  // Contexts whose value this block's subtree consumes — stamped on this block
  // AND its memo ancestors by useContextInternal. The TRANSITIVE signal: a
  // changed version here means "a consumer somewhere at/below me needs the new
  // value", so the memo bailout descends rather than skipping.
  $$ctxReads;
  // Contexts this block's OWN render directly read (its own body, or an inline
  // lite descendant that shares this block). The DIRECT signal: a changed
  // version here means THIS block must re-run; if only $$ctxReads changed, the
  // block can bail its body and refresh just its consuming child blocks.
  $$ctxDirect;
  // Resolved-provider cache for `use(ctx)` — see Scope.$$ctxCache.
  $$ctxCache;
  // Armed for React's IMPLICIT same-element bailout (beginWork's
  // oldProps === newProps skip). Set at value-position component mounts
  // (childSlot) — the only sites that can receive a cached descriptor back.
  // Arming makes the block a stamping target (like __memo) so the bail's lazy
  // consumer refresh has the context deps it needs.
  $$implicitBail;
  // __thenableIdx is reset every renderBlock so pre-init costs nothing.
  __thenableIdx;
  // Render-loop guard bookkeeping (see the Block interface).
  drainStamp;
  drainRenders;
  crossRenderUpdate;
  nestedUpdateChain;
  nestedUpdateCount;
  nestedUpdateError;
  effectEventRenderVersion;
  effectEventCompletedVersion;
  // De-opt host node managed by this Block (deoptItemBody / hostElementBody), reused
  // across renders. Null for all other blocks; declared so the shape stays monomorphic.
  deoptNode;
  // Per-scope dense slot array (binding bag + control-flow/component/child slots),
  // indexed by compile-time slot index. Keeps the scope shape monomorphic.
  slots;
  // For-block item bookkeeping.
  forSlot;
  prevSibling;
  nextSibling;
  key;
  // ViewTransition boundary props (null on every other block — see Block).
  vt;
  // Scope contract: a Block is its own scope.
  parent;
  block;
  // Metadata.
  kind;
  constructor(kind, parentBlock, parentNode, startMarker, endMarker, body, props, extra, outputHandler) {
    this.body = body;
    this.props = props;
    this.extra = extra;
    this.outputHandler = outputHandler;
    this.memoInChain = body?.__memo === true || parentBlock !== null && parentBlock.memoInChain === true;
    this.parentNode = parentNode;
    this.parentBlock = parentBlock;
    this.idState = parentBlock?.idState ?? { prefix: "", next: 0 };
    this.startMarker = startMarker;
    this.endMarker = endMarker;
    this.exclusiveMarkers = false;
    this.itemIndex = 0;
    this.pending = false;
    this.disposed = false;
    this.mounted = false;
    this.pendingMode = null;
    this.currentRenderMode = null;
    this.pendingDeferred = false;
    this.currentRenderDeferred = false;
    this.inactive = false;
    this.hooks = null;
    this.cleanups = [];
    this.effectSlots = null;
    this.children = [];
    this._slots = null;
    this.refFields = null;
    this.$$ctxValues = null;
    this.$$ctxReads = null;
    this.$$ctxDirect = null;
    this.$$ctxCache = null;
    this.$$implicitBail = false;
    this.__thenableIdx = 0;
    this.drainStamp = 0;
    this.drainRenders = 0;
    this.crossRenderUpdate = false;
    this.nestedUpdateChain = -1;
    this.nestedUpdateCount = 0;
    this.nestedUpdateError = false;
    this.effectEventRenderVersion = 0;
    this.effectEventCompletedVersion = 0;
    this.deoptNode = null;
    this.slots = [];
    this.forSlot = null;
    this.prevSibling = null;
    this.nextSibling = null;
    this.key = null;
    this.vt = null;
    this.parent = null;
    this.block = this;
    this.kind = kind;
  }
}
class ScopeImpl {
  block;
  parent;
  hooks;
  cleanups;
  effectSlots;
  children;
  _slots;
  refFields;
  $$ctxValues;
  $$ctxReads;
  $$ctxCache;
  mounted;
  // Per-scope dense slot array (binding bag + control-flow/component/child slots),
  // indexed by compile-time slot index. Keeps the scope shape monomorphic.
  slots;
  constructor(parent, block) {
    this.block = block;
    this.parent = parent;
    this.hooks = null;
    this.cleanups = [];
    this.effectSlots = null;
    this.children = [];
    this._slots = null;
    this.refFields = null;
    this.slots = [];
    this.$$ctxValues = null;
    this.$$ctxReads = null;
    this.$$ctxCache = null;
    this.mounted = false;
  }
}
function createBlock(kind, parentBlock, parentNode, startMarker, endMarker, body, props, extra, outputHandler = null) {
  return new BlockImpl(
    kind,
    parentBlock,
    parentNode,
    startMarker,
    endMarker,
    body,
    props,
    extra,
    outputHandler
  );
}
function renderBlock(block) {
  const hydration = activeHydration();
  if (hydration !== null && !hydration.owns(block)) {
    hydration.suspend(() => renderBlockInner(block));
    return;
  }
  renderBlockInner(block);
}
function enqueueEffectEventUpdate(entry) {
  EFFECT_EVENT_RENDER_TARGET.push(entry);
}
function enqueueEffectEventCommitAction(action) {
  EFFECT_EVENT_ACTION_TARGET.push(action);
}
function renderBlockInner(block) {
  const prevScope = CURRENT_SCOPE;
  const prevBlock = CURRENT_BLOCK;
  const prevEffectEventTarget = EFFECT_EVENT_RENDER_TARGET;
  const prevEffectEventActionTarget = EFFECT_EVENT_ACTION_TARGET;
  const effectEventTarget = WIP_CAPTURE?.events ?? prevEffectEventTarget;
  const effectEventActionTarget = WIP_CAPTURE?.eventActions ?? prevEffectEventActionTarget;
  const effectEventCheckpoint = effectEventTarget.length;
  const effectEventActionCheckpoint = effectEventActionTarget.length;
  CURRENT_SCOPE = block;
  CURRENT_BLOCK = block;
  EFFECT_EVENT_RENDER_TARGET = effectEventTarget;
  EFFECT_EVENT_ACTION_TARGET = effectEventActionTarget;
  if (block.effectEventRenderVersion !== 0) block.effectEventRenderVersion++;
  block.pending = false;
  block.__thenableIdx = 0;
  {
    const tState = block.__thenables;
    if (tState !== void 0 && tState.length !== 0 && (!RESUME_REPLAY || block.__thenableDone === true)) {
      tState.length = 0;
    }
    block.__thenableDone = false;
  }
  if (block.$$ctxReads !== null) block.$$ctxReads.clear();
  if (block.$$ctxDirect !== null) block.$$ctxDirect.clear();
  block.currentRenderMode = block.pendingMode ?? prevBlock?.currentRenderMode ?? "urgent";
  block.currentRenderDeferred = block.pendingMode !== null ? block.pendingDeferred : prevBlock?.currentRenderDeferred ?? false;
  block.pendingMode = null;
  block.pendingDeferred = false;
  const profileFrame = typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ && (block.kind === "root" || block.kind === "dynamic" || block.kind === "portal") ? __profileBeginRender(block, block.body, block.mounted) : null;
  let profileDidThrow = false;
  let profileThrown;
  let renderCompleted = false;
  try {
    const out = block.body(
      block.props,
      block,
      block.extra
    );
    if (out !== void 0 && block.outputHandler !== null) block.outputHandler(block, out);
    if (!block.mounted) block.mounted = true;
    if (block.effectEventRenderVersion !== 0) {
      block.effectEventCompletedVersion = block.effectEventRenderVersion;
    }
    renderCompleted = true;
    block.__thenableDone = true;
  } catch (error) {
    profileDidThrow = true;
    profileThrown = error;
    throw error;
  } finally {
    if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ && profileFrame !== null)
      __profileEndRender(profileFrame, profileDidThrow, profileThrown);
    if (!renderCompleted) {
      effectEventTarget.length = effectEventCheckpoint;
      effectEventActionTarget.length = effectEventActionCheckpoint;
    }
    EFFECT_EVENT_RENDER_TARGET = prevEffectEventTarget;
    EFFECT_EVENT_ACTION_TARGET = prevEffectEventActionTarget;
    CURRENT_SCOPE = prevScope;
    CURRENT_BLOCK = prevBlock;
  }
}
function renderReturnedValue(block, out) {
  const isComponentDescriptor = out !== null && out.$$kind === ELEMENT_TAG && out.key == null && typeof out.type === "function";
  const useSingleRoot = isComponentDescriptor && (out.type.$$singleRoot === true || activeHydration()?.passthroughRanges === true);
  const existingRet = block.slots[0];
  if (existingRet !== void 0 && existingRet.__kind !== (useSingleRoot ? "componentSlotSlot" : "childSlot")) {
    disposeReturnSlot(block, existingRet);
  }
  if (useSingleRoot) {
    const d = out;
    if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ && !__profileHasComponentMetadata(d.type)) {
      withProfileComponentOverride(
        d.type,
        null,
        () => componentSlot(
          block,
          0,
          block.parentNode,
          d.type,
          d.props,
          block.endMarker,
          d.key ?? void 0,
          true,
          void 0,
          activeHydration() !== null && KEYED_ELEMENT_DESCRIPTORS.has(d)
        )
      );
    } else {
      componentSlot(
        block,
        0,
        block.parentNode,
        d.type,
        d.props,
        block.endMarker,
        d.key ?? void 0,
        true,
        void 0,
        activeHydration() !== null && KEYED_ELEMENT_DESCRIPTORS.has(d)
      );
    }
  } else {
    const returnHydration = activeHydration();
    if (returnHydration !== null && block.slots[0] === void 0 && block.startMarker !== null && block.endMarker !== null && block.startMarker !== block.endMarker && block.startMarker.nodeType === 8 && block.endMarker.nodeType === 8 && (block.startMarker.nextSibling === block.endMarker || returnHydration.isUnframedRootRange(block.startMarker, block.endMarker))) {
      const borrowed = {
        __kind: "childSlot",
        start: block.startMarker,
        end: block.endMarker,
        ownerHost: null,
        borrowed: true,
        compactable: false,
        block: null,
        text: null,
        currentComp: null,
        currentIsBodyFn: false,
        forSlot: null,
        hostNode: null,
        portal: null
      };
      block.slots[0] = borrowed;
      registerSlot(block, borrowed);
    }
    childSlot(block, 0, block.parentNode, out, block.endMarker);
  }
}
function disposeReturnSlot(block, state) {
  if (state.__kind === "childSlot") {
    if (state.portal) {
      teardownPortalState(state.portal);
      state.portal = null;
    }
    if (state.forSlot) {
      for (let b = state.forSlot.head; b !== null; b = b.nextSibling)
        unmountBlock(b, true);
      if (state.forSlot.emptyBlock) unmountBlock(state.forSlot.emptyBlock, true);
      state.forSlot = null;
    }
    clearChildContent(state);
    if (!state.borrowed) {
      state.start?.remove();
      state.end?.remove();
    }
  } else {
    if (state.block) unmountBlock(state.block, true);
    if (!state.inherited) {
      state.start?.remove?.();
      state.end?.remove?.();
    }
  }
  const reg = block._slots;
  if (reg !== null) {
    const i = reg.indexOf(state);
    if (i !== -1) reg.splice(i, 1);
  }
  block.slots[0] = void 0;
}
class LiteBlockImpl {
  parentNode;
  endMarker;
  parentBlock;
  $$ctxValues;
  constructor(parentNode, endMarker, parentBlock) {
    this.parentNode = parentNode;
    this.endMarker = endMarker;
    this.parentBlock = parentBlock;
    this.$$ctxValues = null;
  }
}
function componentSlotLite(parentScope, slotKey, host, comp, props, anchor) {
  const hydration = activeHydration();
  let scope = parentScope.slots[slotKey];
  let adoptedOpen = null;
  let adoptedClose = null;
  if (scope === void 0) {
    scope = new ScopeImpl(parentScope, parentScope.block);
    let endMarker = anchor ?? null;
    if (hydration !== null && hydration.isOpen(anchor ?? null)) {
      adoptedOpen = anchor;
      endMarker = hydration.close(anchor);
      adoptedClose = endMarker;
      hydration.node = anchor.nextSibling;
    } else if (hydration !== null && !hydration.isOpen(anchor ?? null)) {
      let open = hydration.node;
      if (open === null || open.parentNode !== host) open = host.firstChild;
      if (open !== null && hydration.isOpen(open)) {
        adoptedOpen = open;
        endMarker = hydration.close(open);
        adoptedClose = endMarker;
        hydration.node = open.nextSibling;
      }
    }
    scope.block = new LiteBlockImpl(host, endMarker, parentScope.block);
    if (adoptedOpen !== null && adoptedClose !== null) {
      hydration.liteRanges.set(scope, {
        start: adoptedOpen,
        end: adoptedClose
      });
    }
    parentScope.slots[slotKey] = scope;
    parentScope.children.push({ key: slotKey, scope });
  } else {
  }
  const prevScope = CURRENT_SCOPE;
  CURRENT_SCOPE = scope;
  if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
    __profileTrackComponent(scope, comp);
  const profileFrame = typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ ? __profileBeginRender(scope, comp, scope.mounted) : null;
  let profileDidThrow = false;
  let profileThrown;
  try {
    comp(props, scope, void 0);
    if (!scope.mounted) scope.mounted = true;
  } catch (error) {
    profileDidThrow = true;
    profileThrown = error;
    throw error;
  } finally {
    if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
      __profileEndRender(profileFrame, profileDidThrow, profileThrown);
    CURRENT_SCOPE = prevScope;
  }
  if (hydration !== null && adoptedClose !== null) hydration.node = adoptedClose.nextSibling;
}
let TEARDOWN_DEPTH = 0;
let TEARDOWN_HANDLER = null;
let TEARDOWN_ERRORS = null;
function reportTeardownError(err) {
  if (TEARDOWN_HANDLER !== null) (TEARDOWN_ERRORS ??= []).push(err);
  else console.error(err);
}
function dispatchTeardownErrors() {
  const errs = TEARDOWN_ERRORS;
  const h = TEARDOWN_HANDLER;
  TEARDOWN_ERRORS = null;
  TEARDOWN_HANDLER = null;
  if (errs !== null && h !== null) {
    for (let i = 0; i < errs.length; i++) h(errs[i]);
  }
}
function unmountBlock(block, detachDom = true) {
  if (block.disposed) return;
  if (TEARDOWN_DEPTH === 0) {
    TEARDOWN_HANDLER = findTryHandler(block.parentBlock) ?? rendererRegionTryHandler(block);
  }
  TEARDOWN_DEPTH++;
  try {
    unmountBlockInner(block, detachDom);
  } finally {
    if (--TEARDOWN_DEPTH === 0) dispatchTeardownErrors();
  }
}
function unmountBlockInner(block, detachDom) {
  block.disposed = true;
  if (block.vt !== null) VT_REGISTRY.delete(block);
  if (block.deoptNode !== null) detachDeoptTreeRefs(block.deoptNode, null);
  unmountScope(block, detachDom);
  if (!detachDom) return;
  if (block.startMarker && block.endMarker) {
    const parent = block.startMarker.parentNode;
    if (parent) {
      const excl = block.exclusiveMarkers;
      let n = excl ? block.startMarker.nextSibling : block.startMarker;
      const stop = excl ? block.endMarker : block.endMarker.nextSibling;
      while (n && n !== stop) {
        const next = n.nextSibling;
        parent.removeChild(n);
        n = next;
      }
    }
  } else if (block.kind === "root") {
    while (block.parentNode.firstChild) {
      block.parentNode.removeChild(block.parentNode.firstChild);
    }
  }
}
function registerSlot(scope, slot) {
  const slots = scope._slots;
  if (slots === null) scope._slots = [slot];
  else slots.push(slot);
}
function unmountScope(scope, detachDom = true) {
  const effects = scope.effectSlots;
  if (effects !== null) {
    for (let i = 0; i < effects.length; i++) {
      const slot = effects[i];
      const cleanup = slot.cleanup;
      if (cleanup === void 0) continue;
      slot.cleanup = void 0;
      if (slot.phase === PASSIVE) {
        pendingPassiveUnmounts.push(cleanup, TEARDOWN_HANDLER);
        if (!passiveScheduled) schedulePassiveFlush();
      } else {
        try {
          runEffectCleanupCallback(cleanup);
        } catch (err) {
          reportTeardownError(err);
        }
      }
    }
  }
  const c = scope.cleanups;
  const prevSuppress = SUPPRESS_UNCOMMITTED_REF_DETACH;
  SUPPRESS_UNCOMMITTED_REF_DETACH = scope.mounted !== true;
  for (let i = c.length - 1; i >= 0; i--) {
    try {
      runEffectLifecycleCallback(c[i]);
    } catch (err) {
      reportTeardownError(err);
    }
  }
  SUPPRESS_UNCOMMITTED_REF_DETACH = prevSuppress;
  const children = scope.children;
  for (let i = 0, n = children.length; i < n; i++) unmountScope(children[i].scope, detachDom);
  const slots = scope._slots;
  if (slots !== null) {
    for (let i = 0, n = slots.length; i < n; i++) {
      const val = slots[i];
      const k = val.__kind;
      if (k === "ifBlockSlot" || k === "switchBlockSlot" || k === "activityBlockSlot") {
        if (val.block) unmountBlock(val.block, detachDom);
      } else if (k === "forBlockSlot") {
        for (let b = val.head; b !== null; b = b.nextSibling)
          unmountBlock(b, detachDom);
        if (val.emptyBlock) unmountBlock(val.emptyBlock, detachDom);
      } else if (k === "childSlot") {
        if (val.block) unmountBlock(val.block, detachDom);
        if (val.forSlot) {
          for (let b = val.forSlot.head; b !== null; b = b.nextSibling)
            unmountBlock(b, detachDom);
          if (val.forSlot.emptyBlock) unmountBlock(val.forSlot.emptyBlock, detachDom);
        }
        if (val.portal) teardownPortalState(val.portal);
        if (val.hostNode != null) detachDeoptTreeRefs(val.hostNode, null);
      } else {
        const childDetach = k === "portalSlotSlot" ? true : detachDom;
        if (val.block) unmountBlock(val.block, childDetach);
        if (k === "trySlotSlot") {
          discardOffscreenCapture(val.stagedCapture);
          val.stagedCapture = null;
          val.stagedEffectDeps = null;
          val.detachedRefs = null;
          if (val.tryBlock && val.tryBlock !== val.block) {
            val.tryBlock.disposed = true;
            val.pendingThenable = null;
          }
          abandonHeldTransition(val);
          if (val.transitionTimeoutId !== null) {
            clearTimeout(val.transitionTimeoutId);
            val.transitionTimeoutId = null;
          }
        } else if (k === "portalSlotSlot" && val.target) {
          unregisterDelegationTarget(val.target);
        }
      }
    }
  }
}
function missingSlot(name) {
  throw new Error(
    `${name} was called without a hook slot. The octane compiler injects per-call-site keys; ensure your project loads this runtime through the Vite plugin (octane/compiler/vite). To call hooks by hand, pass a stable symbol, e.g. useState(0, Symbol.for('my-stable-id')).`
  );
}
const slotStack = [];
function withSlot(sym, fn, ...args) {
  slotStack.push(sym);
  try {
    return fn(...args);
  } finally {
    slotStack.pop();
  }
}
function appendSlotKey(key, slot) {
  const value = typeof slot === "number" ? String(slot) : slot.description ?? "";
  return key + (typeof slot === "number" ? "n" : "s") + value.length + ":" + value;
}
function resolveSlot(slot) {
  const n = slotStack.length;
  if (n === 0) return slot;
  if (slot === void 0 && n === 1) return slotStack[0];
  let key = "@octane:hook:";
  for (let i = 0; i < n; i++) key = appendSlotKey(key, slotStack[i]);
  if (slot !== void 0) key = appendSlotKey(key, slot);
  const resolved = Symbol.for(key);
  return typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ ? __profileResolveHook(resolved, typeof slot === "symbol" ? slot : void 0) : resolved;
}
function useState(initial, slot) {
  if (slot === void 0 && typeof initial === "symbol") {
    slot = initial;
    initial = void 0;
  }
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useState");
  const scope = CURRENT_SCOPE;
  const block = CURRENT_BLOCK;
  let s = scope.hooks?.get(slot);
  if (s === void 0) {
    const initVal = typeof initial === "function" ? initial() : initial;
    s = {
      value: initVal,
      setter: (next) => {
        const previous = stagedTransitionValue(s);
        const operation = typeof next === "function" ? next : () => next;
        const computed = operation(previous);
        if (Object.is(computed, previous)) return;
        if (stageTransitionValue(s, block, operation, computed)) {
          if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__) {
            const update = s.pendingActionBatch?.updates.get(s);
            if (update !== void 0) {
              update.profileType = "state";
              update.profileSlot = slot;
            }
          }
          return;
        }
        s.value = computed;
        if (!block.disposed && typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
          __profileSchedule(block, "state", slot);
        scheduleRender(block);
      }
    };
    ensureHooks(scope).set(slot, s);
  }
  return [s.value, s.setter];
}
function __useStateWithGetter(initial, slot) {
  if (slot === void 0 && typeof initial === "symbol") {
    slot = initial;
    initial = void 0;
  }
  const pair = useState(initial, slot);
  const resolved = resolveSlot(slot);
  if (resolved === void 0) missingSlot("useState");
  const s = CURRENT_SCOPE.hooks.get(resolved);
  const getter = s.getter ?? (s.getter = () => {
    const batch = s.pendingActionBatch;
    if (batch === void 0) return s.value;
    const update = batch.updates.get(s);
    return update === void 0 ? s.value : rebaseTransitionActionUpdate(update);
  });
  return [pair[0], pair[1], getter];
}
function useReducer(reducer, initialArg, initOrSlot, slot) {
  let init;
  if (typeof initOrSlot === "symbol") {
    slot = initOrSlot;
  } else {
    init = initOrSlot;
  }
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useReducer");
  const scope = CURRENT_SCOPE;
  const block = CURRENT_BLOCK;
  let s = scope.hooks?.get(slot);
  if (s === void 0) {
    const initVal = init !== void 0 ? init(initialArg) : initialArg;
    s = {
      value: initVal,
      reducer,
      // React parity: unlike useState's setter, dispatch does NOT eagerly bail
      // when the reducer returns the same state — a no-op action still renders
      // the component once (children then bail as usual). Per
      // ReactHooksWithNoopRenderer-test.js:3889.
      dispatch: (action) => {
        if (CURRENT_BLOCK === block) {
          const actions = s.renderPhaseActions ??= [];
          const previous2 = actions.length === 0 ? s.value : s.renderPhaseValue;
          actions.push(action);
          if (s.getter !== void 0) {
            s.renderPhaseValue = s.reducer(previous2, action);
          }
          scheduleRender(block);
          return;
        }
        const previous = stagedTransitionValue(s);
        const operation = (value) => s.reducer(value, action);
        const computed = operation(previous);
        if (stageTransitionValue(s, block, operation, computed, true)) {
          if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__) {
            const update = s.pendingActionBatch?.updates.get(s);
            if (update !== void 0) {
              update.profileType = "reducer";
              update.profileSlot = slot;
            }
          }
          return;
        }
        s.value = computed;
        if (!block.disposed && typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
          __profileSchedule(block, "reducer", slot);
        scheduleRender(block);
      }
    };
    ensureHooks(scope).set(slot, s);
  } else {
    s.reducer = reducer;
    const actions = s.renderPhaseActions;
    if (actions !== void 0) {
      let value = s.value;
      for (let i = 0; i < actions.length; i++) value = reducer(value, actions[i]);
      s.value = value;
      s.renderPhaseActions = void 0;
      s.renderPhaseValue = void 0;
    }
  }
  return [s.value, s.dispatch];
}
function __useReducerWithGetter(reducer, initialArg, initOrSlot, slot) {
  const resolvedInput = typeof initOrSlot === "symbol" ? initOrSlot : slot;
  const pair = useReducer(reducer, initialArg, initOrSlot, slot);
  const resolved = resolveSlot(resolvedInput);
  if (resolved === void 0) missingSlot("useReducer");
  const s = CURRENT_SCOPE.hooks.get(resolved);
  const getter = s.getter ?? (s.getter = () => {
    if (s.renderPhaseActions !== void 0) return s.renderPhaseValue;
    const batch = s.pendingActionBatch;
    if (batch === void 0) return s.value;
    const update = batch.updates.get(s);
    return update === void 0 ? s.value : rebaseTransitionActionUpdate(update);
  });
  return [pair[0], pair[1], getter];
}
function depsChanged(prev, next) {
  if (prev === void 0 || next === void 0) return true;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    if (!Object.is(prev[i], next[i])) return true;
  }
  return false;
}
function inInactiveSubtree(block) {
  for (let a = block; a !== null; a = a.parentBlock) {
    if (a.inactive) return true;
  }
  return false;
}
function enqueueEffect(slot, fn, deps, phase) {
  const scope = CURRENT_SCOPE;
  if (phase !== INSERTION && inInactiveSubtree(scope.block)) return;
  const prev = scope.hooks?.get(slot);
  if (prev && !depsChanged(prev.deps, deps)) return;
  if (!prev) {
    const slotObj = { deps, cleanup: void 0, effect: true, phase };
    ensureHooks(scope).set(slot, slotObj);
    if (scope.effectSlots === null) scope.effectSlots = [slotObj];
    else scope.effectSlots.push(slotObj);
  } else {
    prev.deps = deps;
  }
  const entry = { scope, slot, fn, args: deps, phase, seq: commitSeq++ };
  (WIP_CAPTURE !== null ? WIP_CAPTURE.effects[phase] : effectQueues[phase]).push(entry);
}
function resolveHookArgs(name, deps, slot) {
  if (slot === void 0 && typeof deps === "symbol") {
    slot = deps;
    deps = void 0;
  }
  if (deps === null) deps = void 0;
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot(name);
  return [deps, slot];
}
function useEffect(fn, deps, slot) {
  const [d, s] = resolveHookArgs("useEffect", deps, slot);
  enqueueEffect(s, fn, d, PASSIVE);
}
function useLayoutEffect(fn, deps, slot) {
  const [d, s] = resolveHookArgs("useLayoutEffect", deps, slot);
  enqueueEffect(s, fn, d, LAYOUT);
}
function useInsertionEffect(fn, deps, slot) {
  const [d, s] = resolveHookArgs("useInsertionEffect", deps, slot);
  enqueueEffect(s, fn, d, INSERTION);
}
function useMemo(compute, deps, slot) {
  const [d, s] = resolveHookArgs("useMemo", deps, slot);
  const scope = CURRENT_SCOPE;
  const prev = scope.hooks?.get(s);
  if (prev && d !== void 0 && !depsChanged(prev.deps, d)) return prev.value;
  if (WARM_EVER && d !== void 0) {
    const adopted = adoptWarmValue(s, d);
    if (adopted !== WARM_MISS) {
      ensureHooks(scope).set(s, { deps: d, value: adopted });
      return adopted;
    }
  }
  const value = compute.apply(null, d ?? []);
  ensureHooks(scope).set(s, { deps: d, value });
  return value;
}
function useCallback(fn, deps, slot) {
  if (slot === void 0 && typeof deps === "symbol") {
    slot = deps;
    deps = void 0;
  }
  if (resolveSlot(slot) === void 0) missingSlot("useCallback");
  return useMemo(() => fn, deps, slot);
}
function useRef(initial, slot) {
  if (slot === void 0 && typeof initial === "symbol") {
    slot = initial;
    initial = void 0;
  }
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useRef");
  const scope = CURRENT_SCOPE;
  let s = scope.hooks?.get(slot);
  if (s === void 0) {
    s = { current: initial };
    ensureHooks(scope).set(slot, s);
  }
  return s;
}
function useDebugValue(_value, _format, _slot) {
}
function useImperativeHandle(ref, factory, deps, slot) {
  const [resolvedDeps, resolvedSlot] = resolveHookArgs("useImperativeHandle", deps, slot);
  deps = resolvedDeps;
  slot = resolvedSlot;
  const effectDeps = deps === void 0 ? void 0 : [...deps, ref];
  enqueueEffect(
    slot,
    () => {
      let cleanup;
      if (typeof ref === "function") cleanup = ref(factory());
      else if (ref != null) ref.current = factory();
      return () => {
        if (typeof cleanup === "function") {
          cleanup();
          return;
        }
        if (typeof ref === "function") ref(null);
        else if (ref != null) ref.current = null;
      };
    },
    effectDeps,
    LAYOUT
  );
}
const USES_SUBSLOTS = /* @__PURE__ */ new Map();
function usesSubslots(slot) {
  let s = USES_SUBSLOTS.get(slot);
  if (s === void 0) {
    const desc = appendSlotKey("@octane:uses:", slot);
    s = { inst: /* @__PURE__ */ Symbol.for(desc + ":uses:inst"), effect: /* @__PURE__ */ Symbol.for(desc + ":uses:effect") };
    USES_SUBSLOTS.set(slot, s);
  }
  return s;
}
function enqueueStoreSync(inst, value, subscribe) {
  inst.pending = value;
  inst.subscribe = subscribe;
  if (inst.queued) return;
  inst.queued = true;
  (WIP_CAPTURE !== null ? WIP_CAPTURE.stores : storeSyncQueue).push(inst);
}
function subscribeToStore(inst, subscribe) {
  if (checkStoreChanged(inst)) inst.forceUpdate();
  return subscribe(inst.onStoreChange);
}
function useSyncExternalStore(subscribe, getSnapshot, ...rest) {
  let slot = rest[rest.length - 1];
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useSyncExternalStore");
  const getServerSnapshot = rest.length >= 2 ? rest[0] : void 0;
  const subs = usesSubslots(slot);
  const value = activeHydration() !== null && getServerSnapshot !== void 0 ? getServerSnapshot() : getSnapshot();
  const scope = CURRENT_SCOPE;
  let inst = scope.hooks?.get(subs.inst);
  if (inst === void 0) {
    const block = CURRENT_BLOCK;
    const created = {
      value,
      getSnapshot,
      pending: value,
      subscribe,
      forceUpdate: typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ ? () => {
        if (!block.disposed) __profileSchedule(block, "external-store", slot);
        scheduleRender(block);
      } : () => scheduleRender(block),
      onStoreChange: () => {
        if (checkStoreChanged(created)) created.forceUpdate();
      },
      block,
      queued: false
    };
    inst = created;
    ensureHooks(scope).set(subs.inst, inst);
    enqueueStoreSync(inst, value, subscribe);
  } else {
    inst.getSnapshot = getSnapshot;
    if (!Object.is(value, inst.value) || subscribe !== inst.subscribe) {
      enqueueStoreSync(inst, value, subscribe);
    }
  }
  useEffect(subscribeToStore, [inst, subscribe], subs.effect);
  return value;
}
function useEffectEvent(fn, slot) {
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useEffectEvent");
  const scope = CURRENT_SCOPE;
  const block = scope.block;
  if (block.effectEventRenderVersion === 0) block.effectEventRenderVersion = 1;
  let s = scope.hooks?.get(slot);
  if (s === void 0) {
    s = { impl: fn, active: true };
    ensureHooks(scope).set(slot, s);
    const cell2 = s;
    scope.cleanups.push(() => {
      cell2.active = false;
    });
  } else {
    enqueueEffectEventUpdate({
      cell: s,
      nextImpl: fn,
      block,
      renderVersion: block.effectEventRenderVersion
    });
  }
  const cell = s;
  return ((...args) => {
    if (CURRENT_SCOPE !== null && EFFECT_EVENT_LIFECYCLE_DEPTH === 0) {
      throw new Error("A function wrapped in useEffectEvent can't be called during rendering.");
    }
    return cell.impl.apply(void 0, args);
  });
}
const CONTEXT_TAG = /* @__PURE__ */ Symbol.for("octane.context");
let COMPILER_CACHE_CONTEXT_EPOCH = 0;
function createContext(defaultValue) {
  const ctx = function ProviderBody(props, scope) {
    if (scope.$$ctxValues === null) scope.$$ctxValues = /* @__PURE__ */ new Map();
    if (scope.$$ctxValues.has(ctx) && !Object.is(scope.$$ctxValues.get(ctx), props.value)) {
      ctx.$$version++;
      COMPILER_CACHE_CONTEXT_EPOCH++;
    }
    scope.$$ctxValues.set(ctx, props.value);
    if (props.children != null) {
      childrenAsBody(props.children)(void 0, scope, void 0);
    }
  };
  ctx.$$kind = CONTEXT_TAG;
  ctx.defaultValue = defaultValue;
  ctx.$$version = 0;
  ctx.Provider = ctx;
  return ctx;
}
function provideContext(scope, context, value) {
  if (scope.$$ctxValues === null) scope.$$ctxValues = /* @__PURE__ */ new Map();
  if (scope.$$ctxValues.has(context) && !Object.is(scope.$$ctxValues.get(context), value)) {
    context.$$version++;
    COMPILER_CACHE_CONTEXT_EPOCH++;
  }
  scope.$$ctxValues.set(context, value);
}
const CHILDREN_BLOCK = /* @__PURE__ */ Symbol.for("octane.childrenBlock");
function markChildrenBlock(fn) {
  if (typeof fn === "function") {
    fn[CHILDREN_BLOCK] = true;
  }
  return fn;
}
function isChildrenBlock(value) {
  return typeof value === "function" && value[CHILDREN_BLOCK] === true;
}
function childrenAsBody(children) {
  if (typeof children === "function") return children;
  return (_p, s) => {
    childSlot(s, 0, s.block.parentNode, children, s.block.endMarker);
  };
}
const Suspense = (props, scope) => {
  const block = scope.block;
  const pendingBody = (_p, s) => {
    childSlot(s, 1, s.block.parentNode, props.fallback, s.block.endMarker);
  };
  tryBlock(
    scope,
    0,
    block.parentNode,
    childrenAsBody(props.children),
    null,
    pendingBody,
    block.endMarker
  );
};
const ViewTransition = (props, scope) => {
  VT_SEEN = true;
  const block = scope.block;
  if (block.vt === null) {
    block.vt = props;
    VT_REGISTRY.add(block);
    if (VT_DRAIN) VT_ENTERED.push(block);
  } else {
    block.vt = props;
  }
  childSlot(scope, 0, block.parentNode, props.children, block.endMarker);
};
const ErrorBoundary = (props, scope) => {
  const block = scope.block;
  const catchBody = (catchProps, s) => {
    const fb = typeof props.fallback === "function" ? props.fallback(
      catchProps.err,
      catchProps.reset
    ) : props.fallback;
    childSlot(s, 1, s.block.parentNode, fb, s.block.endMarker);
  };
  tryBlock(
    scope,
    0,
    block.parentNode,
    childrenAsBody(props.children),
    catchBody,
    null,
    block.endMarker,
    void 0,
    true
  );
};
function use(usable) {
  if (usable && usable.$$kind === CONTEXT_TAG) {
    return useContextInternal(usable);
  }
  if (usable == null || typeof usable.then !== "function") {
    throw new Error("use(): argument is not a Context nor a thenable");
  }
  return useThenable(usable);
}
function useRendererThenable(thenable) {
  return useThenable(thenable, true);
}
function useContext(context) {
  return useContextInternal(context);
}
const DEFAULT_CTX = /* @__PURE__ */ Symbol("octane.ctx.default");
function rendererRegionOwnerForBlock(block) {
  let current = block;
  while (current !== null) {
    const bridge = RENDERER_REGION_DOM_OWNERS.get(current);
    if (bridge !== void 0 && bridge.active) return bridge;
    current = current.parentBlock;
  }
  return null;
}
function rendererRegionTryHandler(block) {
  const bridge = rendererRegionOwnerForBlock(block);
  if (bridge === null) return null;
  return (error) => {
    if (!bridge.routeError(error)) throw error;
  };
}
function rendererRegionSuspenseHandler(block) {
  const bridge = rendererRegionOwnerForBlock(block);
  if (bridge === null) return null;
  return (thenable) => {
    if (!bridge.routeSuspense(thenable)) throw new SuspenseException(thenable);
  };
}
function bindRendererRegionOwner(props) {
  const bridge = props?.[RENDERER_REGION_OWNER];
  if (bridge === void 0) {
    throw new Error("A renderer-owned DOM region is missing its universal owner bridge.");
  }
  if (CURRENT_BLOCK === null || CURRENT_SCOPE === null) {
    throw new Error("bindRendererRegionOwner() must run while a DOM component is rendering.");
  }
  if (CURRENT_BLOCK.kind !== "root" || CURRENT_BLOCK.parentBlock !== null || CURRENT_SCOPE !== CURRENT_BLOCK) {
    throw new Error(
      "bindRendererRegionOwner() must be the first call in a renderer-owned DOM root component."
    );
  }
  const root = CURRENT_BLOCK;
  const disposeRoot = DOM_ROOT_DISPOSERS.get(root);
  if (disposeRoot === void 0) {
    throw new Error("A renderer-owned DOM region requires a live DOM root.");
  }
  const previous = RENDERER_REGION_DOM_BINDINGS.get(root);
  if (previous?.bridge === bridge) return;
  const dispose = () => disposeRoot();
  const release = bridge.registerDispose(dispose);
  previous?.release();
  const binding = { bridge, release };
  RENDERER_REGION_DOM_BINDINGS.set(root, binding);
  RENDERER_REGION_DOM_OWNERS.set(root, bridge);
  root.$$ctxCache?.clear();
  if (previous === void 0) {
    root.cleanups.push(() => {
      const current = RENDERER_REGION_DOM_BINDINGS.get(root);
      if (current === void 0) return;
      current.release();
      RENDERER_REGION_DOM_BINDINGS.delete(root);
      RENDERER_REGION_DOM_OWNERS.delete(root);
    });
  }
}
function recordContextDependency(block, context) {
  if (block === null || !block.memoInChain) return;
  (block.$$ctxDirect ??= /* @__PURE__ */ new Map()).set(context, context.$$version);
  for (let current = block; current !== null; current = current.parentBlock) {
    if (current.body?.__memo === true || current.$$implicitBail === true) {
      (current.$$ctxReads ??= /* @__PURE__ */ new Map()).set(context, context.$$version);
    }
  }
}
function readContextFrom(reader, block, context) {
  if (reader !== null && reader.$$ctxCache !== null) {
    const hit = reader.$$ctxCache.get(context);
    if (hit !== void 0) {
      if (hit === DEFAULT_CTX) {
        const bridge2 = rendererRegionOwnerForBlock(block);
        return bridge2 === null ? context.defaultValue : bridge2.readContext(context);
      }
      return hit.$$ctxValues.get(context);
    }
  }
  let scope = reader;
  while (scope !== null) {
    const values = scope.$$ctxValues;
    if (values !== null && values.has(context)) {
      if (reader !== null) (reader.$$ctxCache ??= /* @__PURE__ */ new Map()).set(context, scope);
      return values.get(context);
    }
    scope = scope.parent;
  }
  let current = block?.parentBlock ?? null;
  while (current !== null) {
    const values = current.$$ctxValues;
    if (values !== null && values.has(context)) {
      if (reader !== null) (reader.$$ctxCache ??= /* @__PURE__ */ new Map()).set(context, current);
      return values.get(context);
    }
    current = current.parentBlock;
  }
  const bridge = rendererRegionOwnerForBlock(block);
  if (bridge !== null) return bridge.readContext(context);
  if (reader !== null) (reader.$$ctxCache ??= /* @__PURE__ */ new Map()).set(context, DEFAULT_CTX);
  return context.defaultValue;
}
function readContextFromScope(scope, context) {
  recordContextDependency(scope.block, context);
  return readContextFrom(scope, scope.block, context);
}
function useContextInternal(context) {
  recordContextDependency(CURRENT_BLOCK, context);
  return readContextFrom(CURRENT_SCOPE, CURRENT_BLOCK, context);
}
class SuspenseException {
  constructor(thenable) {
    this.thenable = thenable;
  }
  thenable;
  __isSuspense = true;
}
function isSuspenseException(x) {
  return x !== null && typeof x === "object" && x.__isSuspense === true;
}
const HYDRATION_REJECTION_SEED = /* @__PURE__ */ Symbol("octane.hydration.rejection-seed");
const HYDRATION_REJECTION_EXCEPTION = /* @__PURE__ */ Symbol("octane.hydration.rejection-exception");
class HydrationRejectionException {
  constructor(reason) {
    this.reason = reason;
  }
  reason;
  [HYDRATION_REJECTION_EXCEPTION] = true;
}
function decodeHydrationRejectionPayload(payload) {
  if (payload === null || typeof payload !== "object") {
    return new Error("Server-rendered use() rejected");
  }
  switch (payload.kind) {
    case "value":
      return payload.value;
    case "number":
      switch (payload.value) {
        case "NaN":
          return NaN;
        case "Infinity":
          return Infinity;
        case "-Infinity":
          return -Infinity;
        case "-0":
          return -0;
        default:
          return new Error("Server-rendered use() rejected");
      }
    case "bigint":
      try {
        return BigInt(payload.value);
      } catch {
        return String(payload.value);
      }
    case "symbol":
      return Symbol(typeof payload.value === "string" ? payload.value : "");
    case "error": {
      const error = new Error(
        typeof payload.message === "string" ? payload.message : "Server-rendered use() rejected"
      );
      if (typeof payload.name === "string") error.name = payload.name;
      const fields = payload.fields;
      if (fields !== null && typeof fields === "object") {
        for (const key of Object.keys(fields)) {
          Object.defineProperty(error, key, {
            value: fields[key],
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return error;
    }
    case "fallback":
      return typeof payload.message === "string" ? payload.message : "Server-rendered use() rejected";
    default:
      return new Error("Server-rendered use() rejected");
  }
}
function hydrationRejectionFromSeed(seed) {
  if (seed === null || typeof seed !== "object" || !Object.prototype.hasOwnProperty.call(seed, HYDRATION_REJECTION_SEED))
    return null;
  return new HydrationRejectionException(
    seed[HYDRATION_REJECTION_SEED]
  );
}
function isHydrationRejection(error) {
  return error !== null && typeof error === "object" && error[HYDRATION_REJECTION_EXCEPTION] === true;
}
function observeHydrationSeedThenable(thenable) {
  thenable.then(
    () => void 0,
    () => void 0
  );
}
function hasExternalHydrationOwner(thenable) {
  try {
    return thenable[EXTERNAL_HYDRATION_PROMISE] === true;
  } catch {
    return false;
  }
}
function useThenable(thenable, replaceOnResume = false) {
  const block = CURRENT_BLOCK;
  const state = block.__thenables ??= [];
  const idx = block.__thenableIdx;
  block.__thenableIdx = idx + 1;
  const hydration = activeHydration();
  if (!hasExternalHydrationOwner(thenable) && hydration !== null && hydration.seeds !== null && hydration.seedCursor < hydration.seeds.length) {
    const seed = hydration.seeds[hydration.seedCursor++];
    observeHydrationSeedThenable(thenable);
    const rejection = hydration.rejectionFromSeed(seed);
    if (rejection !== null) {
      thenable.status = "rejected";
      thenable.reason = rejection.reason;
      state[idx] = thenable;
      throw rejection;
    }
    const value = seed;
    thenable.status = "fulfilled";
    thenable.value = value;
    state[idx] = thenable;
    return value;
  }
  const stored = state[idx];
  if (stored === thenable) {
    if (thenable.status === "fulfilled") return thenable.value;
    if (thenable.status === "rejected") throw thenable.reason;
    throw new SuspenseException(thenable);
  }
  if (stored !== void 0 && RESUME_REPLAY && !replaceOnResume) {
    if (process.env.NODE_ENV !== "production") warnUncachedUsePromise(block);
    if (stored.status === "fulfilled") return stored.value;
    if (stored.status === "rejected") throw stored.reason;
    throw new SuspenseException(stored);
  }
  state[idx] = thenable;
  trackThenable(thenable);
  if (thenable.status === "fulfilled") return thenable.value;
  if (thenable.status === "rejected") throw thenable.reason;
  if (process.env.NODE_ENV !== "production" && RESUME_REPLAY && idx > 0 && state[idx - 1] !== void 0)
    warnUseWaterfall(block, idx);
  throw new SuspenseException(thenable);
}
function trackThenable(thenable) {
  if (thenable.status !== void 0) return;
  thenable.status = "pending";
  thenable.then(
    (v) => {
      thenable.status = "fulfilled";
      thenable.value = v;
    },
    (e) => {
      thenable.status = "rejected";
      thenable.reason = e;
    }
  );
}
let RESUME_REPLAY = false;
function devHintsEnabled() {
  const s = CURRENT_SCOPE;
  return s != null && (s.locs !== void 0 || s.locFile !== void 0);
}
const warnedUncached = /* @__PURE__ */ new WeakSet();
function warnUncachedUsePromise(block) {
  if (process.env.NODE_ENV === "production") return;
  if (!devHintsEnabled() || warnedUncached.has(block)) return;
  warnedUncached.add(block);
  console.error(
    "A component was suspended by an uncached promise: a replay created a fresh promise for a use() slot that already had one, so the stored promise was reused and the fresh request was wasted. Create the promise outside the component or cache it. The compiler automatically memoizes analyzable component-local use() arguments per call site."
  );
}
const warnedWaterfall = /* @__PURE__ */ new WeakSet();
function warnUseWaterfall(block, idx) {
  if (process.env.NODE_ENV === "production") return;
  if (!devHintsEnabled() || warnedWaterfall.has(block)) return;
  warnedWaterfall.add(block);
  console.error(
    `use() waterfall: a replay discovered a new pending promise at call index ${idx} that only starts after the earlier use() resolved. If it does not depend on the earlier value, restructure so both promises are created before the first use(). The compiler does this automatically for analyzable independent component-local arguments.`
  );
}
function useBatch(items, warm) {
  const hydration = activeHydration();
  if (hydration !== null && hydration.seeds !== null) return;
  let pending = null;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it == null || typeof it.then !== "function") continue;
    trackThenable(it);
    if (it.status === "rejected") break;
    if (it.status === "pending") (pending ??= []).push(it);
  }
  if (pending === null) return;
  if (warm !== void 0) runWarm(warm);
  if (pending.length === 1) throw new SuspenseException(pending[0]);
  const members = pending;
  let remaining = members.length;
  const combined = new Promise((resolve, reject) => {
    for (let i = 0; i < members.length; i++) {
      members[i].then(() => {
        if (--remaining === 0) resolve();
      }, reject);
    }
  });
  throw new SuspenseException(combined);
}
let CURRENT_WARM = null;
let WARM_EVER = false;
let WARM_DEPTH = 0;
const WARM_DEPTH_CAP = 64;
const WARM_SLOT_CAP = 64;
const WARM_MISS = /* @__PURE__ */ Symbol("octane.warm.miss");
function runWarm(fn) {
  let cache;
  for (let b = CURRENT_BLOCK; b !== null; b = b.parentBlock) {
    cache = b.__warmCache;
    if (cache !== void 0) break;
  }
  if (cache === void 0) {
    cache = /* @__PURE__ */ new Map();
    CURRENT_BLOCK.__warmCache = cache;
  }
  WARM_EVER = true;
  const prev = CURRENT_WARM;
  CURRENT_WARM = cache;
  try {
    fn();
  } catch {
  } finally {
    CURRENT_WARM = prev;
  }
}
function warmMemo(compute, deps, slot) {
  const cache = CURRENT_WARM;
  if (cache === null) return;
  let list = cache.get(slot);
  if (list !== void 0) {
    for (let i = 0; i < list.length; i++) {
      if (!depsChanged(list[i].deps, deps)) return;
    }
  }
  let value;
  try {
    value = compute();
  } catch {
    return;
  }
  if (value != null && typeof value.then === "function") trackThenable(value);
  if (list === void 0) {
    list = [];
    cache.set(slot, list);
  }
  list.push({ deps, value });
  if (list.length > WARM_SLOT_CAP) list.shift();
}
function warmChild(comp, props) {
  if (CURRENT_WARM === null || comp == null) return;
  const plan = comp.__warm;
  if (typeof plan !== "function") return;
  if (WARM_DEPTH >= WARM_DEPTH_CAP) {
    if (process.env.NODE_ENV !== "production" && devHintsEnabled()) {
      console.error(
        `warmChild: fetch-tree warm walk exceeded ${WARM_DEPTH_CAP} levels \u2014 stopping speculative prefetch here (rendering is unaffected). Is a recursive component missing its termination guard?`
      );
    }
    return;
  }
  WARM_DEPTH++;
  try {
    plan(props);
  } catch {
  } finally {
    WARM_DEPTH--;
  }
}
function adoptWarmValue(slot, deps) {
  let b = CURRENT_BLOCK;
  while (b !== null) {
    const cache = b.__warmCache;
    if (cache !== void 0) {
      const list = cache.get(slot);
      if (list !== void 0) {
        for (let i = 0; i < list.length; i++) {
          if (!depsChanged(list[i].deps, deps)) {
            const value = list[i].value;
            list.splice(i, 1);
            return value;
          }
        }
      }
    }
    b = b.parentBlock;
  }
  return WARM_MISS;
}
const LAZY_COMPONENT = /* @__PURE__ */ Symbol.for("octane.lazy");
function lazyResolvedProps(comp, props) {
  const defaults = comp.defaultProps;
  if (defaults == null || typeof defaults !== "object") return props;
  let resolved = props;
  for (const key of Object.keys(defaults)) {
    if (props == null || props[key] === void 0) {
      if (resolved === props) resolved = props == null ? {} : { ...props };
      resolved[key] = defaults[key];
    }
  }
  return resolved;
}
function resolveLazyModule(mod) {
  let comp = mod;
  if (mod != null) {
    const defaultExport = mod.default;
    if (defaultExport !== void 0) comp = defaultExport;
  }
  if (typeof comp !== "function" || comp[LAZY_COMPONENT] === true) {
    throw new Error(
      "lazy: expected the load() promise to resolve to a component function or a module with a component as its default export, got '" + (comp?.[LAZY_COMPONENT] === true ? "lazy component" : typeof comp) + "'"
    );
  }
  return comp;
}
function lazy(load) {
  let status = "uninitialized";
  let result = null;
  let thenable = null;
  let profiledComponent = null;
  let memoMetadataInstalled = false;
  let lazyWrapper;
  const callResolvedComponent = (props, scope, extra) => {
    const comp = resolveLazyModule(result);
    if (comp.__memo === true) {
      if (!memoMetadataInstalled) {
        lazyWrapper.__memo = true;
        lazyWrapper.__compare = (prev, next) => {
          const current = resolveLazyModule(result);
          const compare = current.__compare;
          const previous = lazyResolvedProps(current, prev);
          const incoming = lazyResolvedProps(current, next);
          return compare ? compare(previous, incoming) : shallowEqualProps(previous, incoming);
        };
        memoMetadataInstalled = true;
      }
      scope.block.memoInChain = true;
    }
    if (profiledComponent !== comp && typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__) {
      __profileComponentSource(lazyWrapper, comp);
      profiledComponent = comp;
    }
    return comp(lazyResolvedProps(comp, props), scope, extra);
  };
  lazyWrapper = (props, scope, extra) => {
    if (status === "fulfilled") {
      return callResolvedComponent(props, scope, extra);
    }
    if (status === "rejected") throw result;
    if (status === "uninitialized") {
      try {
        const p = load();
        thenable = p;
        p.then(
          (mod) => {
            if (status === "uninitialized" || status === "pending") {
              result = mod;
              status = "fulfilled";
            }
          },
          (err) => {
            if (status === "uninitialized" || status === "pending") {
              result = err;
              status = "rejected";
            }
          }
        );
      } catch (error) {
        if (status === "uninitialized") thenable = null;
        throw error;
      }
      if (status === "uninitialized") status = "pending";
      const settledStatus = status;
      if (settledStatus === "fulfilled") {
        return callResolvedComponent(props, scope, extra);
      }
      if (settledStatus === "rejected") throw result;
    }
    throw new SuspenseException(thenable);
  };
  Object.defineProperty(lazyWrapper, LAZY_COMPONENT, { value: true });
  return lazyWrapper;
}
function useId(slot) {
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useId");
  const scope = CURRENT_SCOPE;
  let s = scope.hooks?.get(slot);
  if (s === void 0) {
    const ids = scope.block.idState;
    s = { id: ":" + ids.prefix + "in-" + (ids.next++).toString(36) + ":" };
    ensureHooks(scope).set(slot, s);
  }
  return s.id;
}
const OPAQUE_TEMPLATE = /* @__PURE__ */ Symbol("octane.opaque-template");
function parseTemplate(html, ns, frag) {
  const t = document.createElement("template");
  if (ns === 0) {
    t.innerHTML = frag ? `<octane-frag>${html}</octane-frag>` : html;
    const root = t.content.firstChild;
    if (root.nodeType === 1 && root.localName === "octane-frag") {
      root.__oct_frag = true;
    }
    return root;
  }
  const wrap = ns === 1 ? "svg" : "math";
  t.innerHTML = `<${wrap}>${html}</${wrap}>`;
  const wrapEl = t.content.firstChild;
  if (frag) {
    wrapEl.__oct_frag = true;
    return wrapEl;
  }
  return wrapEl.firstChild;
}
function template(html, ns = 0, frag = 0) {
  if (ns === 3) {
    return {
      [OPAQUE_TEMPLATE]: { html, frag, parsed: [] }
    };
  }
  return parseTemplate(html, ns === 1 ? 1 : ns === 2 ? 2 : 0, frag);
}
let currentHydration = null;
function activeHydration() {
  const hydration = currentHydration;
  return hydration !== null && hydration.isActive() ? hydration : null;
}
function isRendererHydrationStyle(node) {
  return node.nodeType === 1 && node.localName === "style" && node.hasAttribute("data-octane");
}
class HydrationCapability {
  constructor(rootBlock, node, seeds) {
    this.rootBlock = rootBlock;
    this.node = node;
    this.seeds = seeds;
  }
  rootBlock;
  node;
  seeds;
  depth = 0;
  seedCursor = 0;
  hasAdjacentRangePair = false;
  abandoned = false;
  freshNodes = /* @__PURE__ */ new WeakSet();
  unframedRootRanges = /* @__PURE__ */ new WeakMap();
  /** First unclaimed root sibling after a compiled root clone; undefined until known. */
  rootRemainder;
  rootCleanupBoundary = null;
  deferredActivities = [];
  liteRanges = /* @__PURE__ */ new WeakMap();
  classWrites = /* @__PURE__ */ new Map();
  textWarnings = /* @__PURE__ */ new Map();
  /** Skip component-frame adoption until the declared container owner. */
  passthroughRanges = false;
  isActive() {
    return this.depth === 0 && !this.abandoned;
  }
  owns(block) {
    let root = block;
    while (root.parentBlock !== null) root = root.parentBlock;
    return root === this.rootBlock;
  }
  suspend(fn) {
    this.depth++;
    try {
      return fn();
    } finally {
      this.depth--;
    }
  }
  isOpen(node) {
    return isBlockOpen(node);
  }
  isClose(node) {
    return isBlockClose(node);
  }
  close(open) {
    const found = findMatchingClose(open);
    if (!this.hasAdjacentRangePair && isBlockOpen(open.previousSibling) && isBlockClose(found.nextSibling)) {
      this.hasAdjacentRangePair = true;
    }
    return found;
  }
  resolveOpen(anchor, domParent) {
    if (isBlockOpen(anchor ?? null)) return anchor;
    let cursor = this.node;
    if (cursor === null || cursor.parentNode !== domParent) cursor = domParent.firstChild;
    return cursor !== null && isBlockOpen(cursor) ? cursor : null;
  }
  markerState(node) {
    return ssrForMarkerState(node);
  }
  describe(node) {
    return describeHydrationNode(node);
  }
  warnStructural(loc, expected, actual) {
    warnHydrationStructuralMismatch(loc, expected, actual);
  }
  recordTextMismatch(node, loc, server) {
    if (!this.textWarnings.has(node)) this.textWarnings.set(node, { loc, server });
  }
  flushTextWarnings() {
    for (const [node, pending] of this.textWarnings) {
      if (!this.rootBlock.parentNode.contains(node)) continue;
      const client = node.nodeValue;
      if (pending.server !== client) {
        warnHydrationValueMismatch(pending.loc, "text", pending.server, client);
      }
    }
    this.textWarnings.clear();
  }
  removeRange(start, end) {
    removeHydrationRange(start, end);
  }
  parseSeeds(raw) {
    return parseSeedJson(raw);
  }
  isRejection(error) {
    return isHydrationRejection(error);
  }
  rejectionFromSeed(seed) {
    return hydrationRejectionFromSeed(seed);
  }
  /** Mark a client-built hydration replacement (and its descendants) as fresh DOM. */
  markFresh(node) {
    this.freshNodes.add(node);
    let child2 = node.firstChild;
    while (child2 !== null) {
      this.markFresh(child2);
      child2 = child2.nextSibling;
    }
  }
  isFresh(node) {
    return this.freshNodes.has(node);
  }
  /** Keep a client-owned root anchor alive while stale server siblings are swept. */
  protectRootAnchor(node) {
    this.rootCleanupBoundary = node;
  }
  /** Bound an unframed third-party component root so its returned host can adopt it. */
  wrapUnframedRoot(cursor) {
    const parent = cursor.parentNode;
    const remainder = cursor.nextSibling;
    const start = document.createComment("");
    const end = document.createComment("");
    parent.insertBefore(start, cursor);
    parent.insertBefore(end, remainder);
    this.unframedRootRanges.set(start, end);
    this.protectRootAnchor(end);
    this.claimRootRemainder(remainder);
    return [start, end];
  }
  isUnframedRootRange(start, end) {
    return this.unframedRootRanges.get(start) === end;
  }
  /** Record the first node outside a root-owned range exactly once. */
  claimRootRemainder(node) {
    if (this.rootRemainder === void 0) this.rootRemainder = node;
  }
  freshClone(template2) {
    const cloned = template2.cloneNode(true);
    this.markFresh(cloned);
    return cloned;
  }
  fragmentRemainder(template2, cursor) {
    let expected = template2.firstChild;
    let actual = cursor;
    while (expected !== null) {
      if (actual === null) return void 0;
      if (expected.nodeType !== 8 && !hydrationNodeMatches(actual, expected)) return void 0;
      actual = this.sibling(actual, 1);
      expected = expected.nextSibling;
    }
    return actual;
  }
  /**
   * If a top-level cursor sits inside a server marker frame, return the first
   * sibling after that OUTERMOST frame. A clone can execute in a lite/provider
   * descendant while its DOM is still a direct child of the root container;
   * `cursor.nextSibling` would then be only the descendant's close marker.
   */
  framedRootRemainder(cursor) {
    const rootParent = this.rootBlock.parentNode;
    let outerOpen = null;
    let depth = 0;
    for (let node = rootParent.firstChild; node !== null && node !== cursor; node = node.nextSibling) {
      if (this.isOpen(node)) {
        if (depth === 0) outerOpen = node;
        depth++;
      } else if (this.isClose(node) && depth > 0) {
        depth--;
        if (depth === 0) outerOpen = null;
      }
    }
    return outerOpen === null ? void 0 : this.close(outerOpen).nextSibling;
  }
  /** Give up root adoption after an unframed return/fragment mismatch. */
  abandonRoot(expected, actual, loc) {
    if (loc) warnHydrationStructuralMismatch(loc, expected, actual);
    let node = this.node;
    while (node !== null) {
      const next = node.nextSibling;
      if (!isRendererHydrationStyle(node)) node.remove();
      node = next;
    }
    this.node = null;
    this.abandoned = true;
  }
  clone(template2, loc) {
    const cursor = this.node;
    const isFragment = template2.__oct_frag === true;
    const claimsRoot = this.rootRemainder === void 0 && (cursor !== null ? cursor.parentNode === this.rootBlock.parentNode : CURRENT_BLOCK === this.rootBlock);
    const framedRemainder = claimsRoot && cursor !== null ? this.framedRootRemainder(cursor) : void 0;
    const unframedRemainder = claimsRoot && cursor !== null ? cursor.nextSibling : void 0;
    if (isFragment && claimsRoot) {
      const remainder = this.fragmentRemainder(template2, cursor);
      if (remainder === void 0) {
        this.abandonRoot(
          `a fragment starting with ${describeHydrationNode(template2.firstChild)}`,
          describeHydrationNode(cursor),
          componentSourceLoc(this.rootBlock.body)
        );
        return this.freshClone(template2);
      }
      this.claimRootRemainder(framedRemainder === void 0 ? remainder : framedRemainder);
    }
    if (cursor === null) {
      if (claimsRoot) this.claimRootRemainder(null);
      return this.freshClone(template2);
    }
    if (!isFragment && !hydrationNodeMatches(cursor, template2)) {
      if (process.env.NODE_ENV !== "production" && loc)
        warnHydrationStructuralMismatch(
          loc,
          describeHydrationNode(template2),
          describeHydrationNode(cursor)
        );
      if (isBlockClose(cursor)) return this.freshClone(template2);
      if (isBlockOpen(cursor)) {
        const close = this.close(cursor);
        this.node = close.nextSibling;
        removeHydrationRange(cursor, close);
      } else {
        this.node = cursor.nextSibling;
        cursor.remove();
      }
      if (claimsRoot)
        this.claimRootRemainder(
          framedRemainder === void 0 ? unframedRemainder ?? null : framedRemainder
        );
      return this.freshClone(template2);
    }
    if (isFragment) {
      return { __oct_vfrag: true, firstChild: cursor };
    }
    if (claimsRoot)
      this.claimRootRemainder(
        framedRemainder === void 0 ? unframedRemainder ?? null : framedRemainder
      );
    return cursor;
  }
  /** Remove server siblings left after the root's complete client shape was adopted. */
  finishRoot() {
    if (this.abandoned) return;
    let remainder = this.rootRemainder === void 0 ? this.node : this.rootRemainder;
    while (remainder !== null && (remainder === this.rootCleanupBoundary || this.freshNodes.has(remainder) || isRendererHydrationStyle(remainder)))
      remainder = remainder.nextSibling;
    if (remainder === null) return;
    warnHydrationStructuralMismatch(
      componentSourceLoc(this.rootBlock.body),
      "the end of the root",
      describeHydrationNode(remainder)
    );
    while (remainder !== null && remainder !== this.rootCleanupBoundary) {
      const next = remainder.nextSibling;
      if (!this.freshNodes.has(remainder) && !isRendererHydrationStyle(remainder))
        remainder.remove();
      remainder = next;
    }
    this.node = null;
    this.rootRemainder = null;
  }
  htext(el, text, loc) {
    const first = el.firstChild;
    if (first !== null && first.nodeType === 3) {
      const server = first.nodeValue;
      if (server !== text && !isTextParserNormalizedMatch(server, text) && !isHydrationSuppressed(el)) {
        if (process.env.NODE_ENV !== "production")
          this.recordTextMismatch(first, loc || el.__oct_loc, server);
        first.nodeValue = text;
      }
      return first;
    }
    const created = document.createTextNode(text);
    el.appendChild(created);
    return created;
  }
  htextSwap(posNode, text) {
    if (posNode !== null && posNode.nodeType === 3) {
      const server = posNode.nodeValue;
      if (server !== text && !isTextParserNormalizedMatch(server, text)) {
        const host2 = posNode.parentNode;
        if (!isHydrationSuppressed(host2)) {
          if (process.env.NODE_ENV !== "production")
            this.recordTextMismatch(posNode, host2 && host2.__oct_loc, server);
          posNode.nodeValue = text;
        }
      }
      return posNode;
    }
    const host = posNode?.parentNode ?? null;
    const suppressed = isHydrationSuppressed(host);
    if (text !== "" && !suppressed && process.env.NODE_ENV !== "production") {
      warnHydrationStructuralMismatch(
        host && host.__oct_loc,
        `text ${JSON.stringify(text)}`,
        describeHydrationNode(posNode)
      );
    }
    const created = document.createTextNode(suppressed ? "" : text);
    if (posNode !== null && posNode.parentNode !== null) {
      posNode.parentNode.insertBefore(created, posNode);
    }
    return created;
  }
  sibling(node, count) {
    let cursor = node;
    for (let i = 0; i < count; i++) {
      if (cursor === null) return null;
      if (isBlockOpen(cursor)) cursor = this.close(cursor);
      if (isTextSeparator(cursor)) {
        cursor = cursor.nextSibling;
        continue;
      }
      cursor = cursor.nextSibling;
      if (isTextSeparator(cursor)) {
        const after = cursor.nextSibling;
        if (after !== null && (after.nodeType === 3 || isTextSeparator(after))) cursor = after;
      }
    }
    return cursor;
  }
  allowAttribute(el, name, next) {
    const mode = hydrationMismatchMode(el);
    const ns = attrNamespace(name);
    const server = ns ? el.getAttributeNS(ns, name.indexOf(":") >= 0 ? name.slice(name.indexOf(":") + 1) : name) : el.getAttribute(name);
    if (server === next) return true;
    if (next !== null && isAttributeParserNormalizedMatch(server, next)) return false;
    if (mode === 0) return true;
    if (mode === 1) return false;
    if (process.env.NODE_ENV !== "production")
      warnHydrationValueMismatch(el.__oct_loc, `attribute \`${name}\``, server, next);
    return true;
  }
  allowClass(el, next, absentIsEmpty = false) {
    const mode = hydrationMismatchMode(el);
    if (mode === 0) return true;
    const rawServer = el.getAttribute("class");
    const server = absentIsEmpty && rawServer === null ? "" : rawServer;
    if (server === next) return true;
    if (mode === 1) return false;
    if (process.env.NODE_ENV !== "production")
      warnHydrationValueMismatch(el.__oct_loc, "attribute `class`", server, next);
    return true;
  }
  queueClass(el, next, absentIsEmpty, useAttribute, remove) {
    this.classWrites.set(el, { next, absentIsEmpty, useAttribute, remove });
  }
  flushClassWrites() {
    try {
      for (const [el, write] of this.classWrites) {
        const rawTarget = write.remove ? null : write.next;
        if (el.getAttribute("class") === rawTarget) continue;
        if (!this.allowClass(el, write.next, write.absentIsEmpty)) continue;
        if (write.remove) el.removeAttribute("class");
        else if (write.useAttribute) el.setAttribute("class", write.next);
        else el.className = write.next;
      }
    } finally {
      this.classWrites.clear();
    }
  }
  applyStyle(el, value, _prev) {
    const mode = hydrationMismatchMode(el);
    if (mode === 1) return true;
    const style = el.style;
    const hadStyleAttribute = el.hasAttribute("style");
    const before = style.cssText;
    const expectedStyle = document.createElement("div").style;
    applyStyleValue(expectedStyle, value, void 0);
    const expected = expectedStyle.cssText;
    const expectsStyleAttribute = expected !== "";
    if (before === expected && hadStyleAttribute === expectsStyleAttribute) return true;
    if (expectsStyleAttribute) style.cssText = expected;
    else el.removeAttribute("style");
    if (mode === 2 && process.env.NODE_ENV !== "production") {
      warnHydrationValueMismatch(el.__oct_loc, "style", before, expected);
    }
    return true;
  }
  coalesce() {
    coalesceHydratedRanges(this.rootBlock, this.liteRanges);
  }
}
function decodeSeedWire(value) {
  const undefinedWire = SUSPENSE_SEED_WIRE_PREFIX + "u";
  const escapedStringWire = SUSPENSE_SEED_WIRE_PREFIX + "s";
  if (typeof value === "string") {
    if (value === undefinedWire) return void 0;
    if (value.startsWith(escapedStringWire)) return value.slice(escapedStringWire.length);
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = decodeSeedWire(value[i]);
    return value;
  }
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      value[key] = decodeSeedWire(
        value[key]
      );
    }
  }
  return value;
}
function parseSeedJson(raw) {
  try {
    const parsed = decodeSeedWire(JSON.parse(raw));
    if (Array.isArray(parsed)) return parsed;
    if (parsed === null || typeof parsed !== "object") return null;
    const envelope = parsed[REJECTION_SENTINEL_KEY];
    if (envelope === null || typeof envelope !== "object" || envelope.version !== 1 || !Array.isArray(envelope.values) || !Array.isArray(envelope.rejections))
      return null;
    const values = envelope.values.slice();
    const seen = /* @__PURE__ */ new Set();
    for (const entry of envelope.rejections) {
      if (!Array.isArray(entry) || entry.length !== 2 || !Number.isInteger(entry[0]) || entry[0] < 0 || entry[0] >= values.length || seen.has(entry[0]) || entry[1] === null || typeof entry[1] !== "object")
        return null;
      seen.add(entry[0]);
      values[entry[0]] = {
        [HYDRATION_REJECTION_SEED]: decodeHydrationRejectionPayload(entry[1])
      };
    }
    return values;
  } catch {
    return null;
  }
}
function clone(node, loc) {
  const opaque = node.nodeType === void 0 ? node[OPAQUE_TEMPLATE] : void 0;
  if (opaque !== void 0) {
    const inherited = CURRENT_SCOPE === null ? void 0 : deoptChildNamespace(CURRENT_SCOPE.block.parentNode);
    const ns = inherited === SVG_NS ? 1 : inherited === MATHML_NS ? 2 : 0;
    let parsed = opaque.parsed[ns];
    if (parsed === void 0) {
      parsed = parseTemplate(opaque.html, ns, opaque.frag);
      opaque.parsed[ns] = parsed;
    }
    const hydration2 = activeHydration();
    return hydration2 === null ? parsed.cloneNode(true) : hydration2.clone(parsed, loc);
  }
  const hydration = activeHydration();
  return hydration === null ? node.cloneNode(true) : hydration.clone(node, loc);
}
function drainFrag(root, parent, anchor) {
  if (activeHydration() !== null && root.__oct_vfrag === true) return;
  while (root.firstChild) parent.insertBefore(root.firstChild, anchor);
}
function commitBag(scope, root, bag) {
  if (root !== null) {
    const block = scope.block;
    const hydration = activeHydration();
    if (hydration === null || hydration.isFresh(root) || root.parentNode !== block.parentNode) {
      block.parentNode.insertBefore(root, block.endMarker);
    }
  }
  scope.slots[0] = bag;
  return bag;
}
function bag0(s, r) {
  return commitBag(s, r, {});
}
function bag1(s, r, a) {
  return commitBag(s, r, { a });
}
function bag2(s, r, a, b) {
  return commitBag(s, r, { a, b });
}
function bag3(s, r, a, b, c) {
  return commitBag(s, r, { a, b, c });
}
function bag4(s, r, a, b, c, d) {
  return commitBag(s, r, { a, b, c, d });
}
function bag5(s, r, a, b, c, d, e) {
  return commitBag(s, r, { a, b, c, d, e });
}
function bag6(s, r, a, b, c, d, e, f) {
  return commitBag(s, r, { a, b, c, d, e, f });
}
function bag7(s, r, a, b, c, d, e, f, g) {
  return commitBag(s, r, { a, b, c, d, e, f, g });
}
function bag8(s, r, a, b, c, d, e, f, g, h) {
  return commitBag(s, r, { a, b, c, d, e, f, g, h });
}
function bag9(s, r, a, b, c, d, e, f, g, h, i) {
  return commitBag(s, r, { a, b, c, d, e, f, g, h, i });
}
function bag10(s, r, a, b, c, d, e, f, g, h, i, j) {
  return commitBag(s, r, { a, b, c, d, e, f, g, h, i, j });
}
function bag11(s, r, a, b, c, d, e, f, g, h, i, j, k) {
  return commitBag(s, r, { a, b, c, d, e, f, g, h, i, j, k });
}
function bag12(s, r, a, b, c, d, e, f, g, h, i, j, k, l) {
  return commitBag(s, r, { a, b, c, d, e, f, g, h, i, j, k, l });
}
function bag13(s, r, a, b, c, d, e, f, g, h, i, j, k, l, m) {
  return commitBag(s, r, { a, b, c, d, e, f, g, h, i, j, k, l, m });
}
function bag14(s, r, a, b, c, d, e, f, g, h, i, j, k, l, m, n) {
  return commitBag(s, r, { a, b, c, d, e, f, g, h, i, j, k, l, m, n });
}
function bag15(s, r, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o) {
  return commitBag(s, r, { a, b, c, d, e, f, g, h, i, j, k, l, m, n, o });
}
function bag16(s, r, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p) {
  return commitBag(s, r, { a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p });
}
function bagOf(s, r, bag) {
  return commitBag(s, r, bag);
}
function coerceText(value) {
  return value == null || value === false ? "" : typeof value === "string" ? value : String(value);
}
function normalizeParserText(value) {
  return value.replace(/\r\n?/g, "\n").replace(/[\u0000\uFFFD]/g, "");
}
function isTextParserNormalizedMatch(server, client) {
  return server !== null && normalizeParserText(server) === normalizeParserText(client);
}
function isAttributeParserNormalizedMatch(server, client) {
  return server !== null && normalizeParserText(server) === normalizeParserText(client);
}
function htext(el, value) {
  const text = coerceText(value);
  const hydration = activeHydration();
  if (hydration !== null) return hydration.htext(el, text);
  const t = document.createTextNode(text);
  el.appendChild(t);
  return t;
}
function htextSwap(posNode, value) {
  const text = coerceText(value);
  const hydration = activeHydration();
  if (hydration !== null) return hydration.htextSwap(posNode, text);
  const t = document.createTextNode(text);
  const parent = posNode.parentNode;
  parent.insertBefore(t, posNode);
  parent.removeChild(posNode);
  return t;
}
function hydrationMarkerMultiplicity(data, open) {
  const marker = open ? HYDRATION_START : HYDRATION_END;
  if (data === marker) return 1;
  if (open && (data === HYDRATION_FOR_EMPTY || data === HYDRATION_FOR_ITEMS)) return 1;
  if (data.length < 2 || data.charCodeAt(0) !== marker.charCodeAt(0)) return 0;
  const first = data.charCodeAt(1);
  if (first < 49 || first > 57) return 0;
  let value = first - 48;
  for (let i = 2; i < data.length; i++) {
    const digit = data.charCodeAt(i) - 48;
    if (digit < 0 || digit > 9) return 0;
    value = value * 10 + digit;
    if (!Number.isSafeInteger(value)) return 0;
  }
  return value >= 2 ? value : 0;
}
function isBlockOpen(node) {
  if (node === null || node.nodeType !== 8) return false;
  const data = node.data;
  return hydrationMarkerMultiplicity(data, true) > 0;
}
function isBlockClose(node) {
  if (node === null || node.nodeType !== 8) return false;
  const data = node.data;
  return data === HYDRATION_END || hydrationMarkerMultiplicity(data, false) > 1;
}
function isTextSeparator(node) {
  return node !== null && node.nodeType === 8 && node.data === HYDRATION_TEXT_SEP;
}
function findMatchingClose(open) {
  let depth = 0;
  let node = open.nextSibling;
  for (; ; ) {
    if (node.nodeType === 8) {
      const data = node.data;
      let close = data === HYDRATION_END;
      let nestedOpen = data === HYDRATION_START;
      if (!close && !nestedOpen && data.length > 1) {
        const first = data.charCodeAt(0);
        if (first === HYDRATION_END.charCodeAt(0)) {
          close = hydrationMarkerMultiplicity(data, false) > 0;
        } else if (first === HYDRATION_START.charCodeAt(0)) {
          nestedOpen = hydrationMarkerMultiplicity(data, true) > 0;
        }
      }
      if (close) {
        if (depth === 0) {
          return node;
        }
        depth -= 1;
      } else if (nestedOpen) {
        depth += 1;
      }
    }
    node = node.nextSibling;
  }
}
function ssrForMarkerState(node) {
  if (node.nodeType !== 8) return -1;
  const data = node.data;
  return data === HYDRATION_FOR_EMPTY ? 0 : data === HYDRATION_FOR_ITEMS ? 1 : -1;
}
function child(node) {
  return node.firstChild;
}
function sibling(node, n = 1) {
  const hydration = activeHydration();
  if (hydration !== null) return hydration.sibling(node, n);
  let c = node;
  for (let i = 0; i < n; i++) {
    if (c === null) return null;
    c = c.nextSibling;
  }
  return c;
}
function setText(node, value) {
  if (VT_DRAIN) vtMarkDirtyFromCurrentBlock();
  node.nodeValue = coerceText(value);
}
function setScriptText(el, value) {
  el.textContent = value == null ? "" : String(value);
}
function normalizeHTMLForHydration(parent, html) {
  const doc = parent.ownerDocument;
  const ns = parent.namespaceURI;
  const testElement = ns === "http://www.w3.org/2000/svg" || ns === "http://www.w3.org/1998/Math/MathML" ? doc.createElementNS(ns, parent.tagName) : doc.createElement(parent.tagName);
  testElement.innerHTML = html;
  return testElement.innerHTML;
}
function setHTML(el, value) {
  const next = value == null ? "" : String(value);
  const hydration = activeHydration();
  if (hydration !== null && !hydration.isFresh(el)) {
    const server = el.localName === "script" ? el.textContent ?? "" : el.innerHTML;
    const expected = el.localName === "script" ? next : normalizeHTMLForHydration(el, next);
    if (server === expected || isHydrationSuppressed(el)) return;
    warnHydrationKeptServerValue(
      el.__oct_loc,
      "`dangerouslySetInnerHTML` content",
      server,
      expected
    );
    return;
  }
  if (el.localName === "script") setScriptText(el, next);
  else el.innerHTML = next;
}
const DANGER_HTML_ACTIVE = "__oct_dangerHTML";
const DANGER_HTML_STATIC_CHILD = "__oct_dangerChild";
const DANGER_HTML_SPREAD_CHILD = "__oct_dangerSpreadChild";
const DANGER_HTML_RESOLVED_VALUE = "__oct_dangerResolved";
const DANGER_HTML_RESOLVED_CHILD = "__oct_dangerResolvedChild";
function dangerHtmlChildrenError() {
  return new Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
}
function validateDangerouslySetInnerHTMLValue(value) {
  if (value != null && (typeof value !== "object" || !("__html" in value))) {
    throw new Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`");
  }
}
function setDangerouslySetInnerHTML(el, value) {
  validateDangerouslySetInnerHTMLValue(value);
  const wasActive = el[DANGER_HTML_ACTIVE] === true;
  if (value == null) {
    el[DANGER_HTML_ACTIVE] = false;
    if (wasActive) setHTML(el, null);
    return;
  }
  if (value != null && VOID_ELEMENTS.has(el.localName)) {
    throw new Error(
      `\`${el.localName}\` is a void element tag and must neither have \`children\` nor use \`dangerouslySetInnerHTML\`.`
    );
  }
  if (value != null && (el[DANGER_HTML_STATIC_CHILD] === true || el[DANGER_HTML_SPREAD_CHILD] != null)) {
    throw dangerHtmlChildrenError();
  }
  el[DANGER_HTML_ACTIVE] = true;
  setHTML(el, value.__html);
}
function setDangerouslySetInnerHTMLSources(el, sources, ignoreSourceChildren = false) {
  let foundDanger = false;
  let danger = null;
  let foundChild = false;
  let child2 = null;
  for (const source of sources) {
    const [isSpread, sourceOrName] = source;
    if (!isSpread) {
      if (source.length === 2) {
        foundDanger = true;
        danger = sourceOrName;
      } else if (sourceOrName === "dangerouslySetInnerHTML") {
        foundDanger = true;
        danger = source[2];
      } else if (!ignoreSourceChildren && sourceOrName === "children") {
        foundChild = true;
        child2 = source[2];
      }
      continue;
    }
    if (sourceOrName == null || typeof sourceOrName !== "object" && typeof sourceOrName !== "function")
      continue;
    for (const key of Object.keys(Object(sourceOrName))) {
      if (key === "dangerouslySetInnerHTML") {
        foundDanger = true;
        danger = sourceOrName[key];
      } else if (!ignoreSourceChildren && key === "children") {
        foundChild = true;
        child2 = sourceOrName[key];
      }
    }
  }
  const resolved = foundDanger && danger != null ? danger : null;
  const resolvedChild = foundChild ? child2 : null;
  if (VOID_ELEMENTS.has(el.localName) && (resolved !== null || resolvedChild != null)) {
    throw new Error(
      `\`<${el.localName}>\` is a void element tag and must neither have children nor use \`dangerouslySetInnerHTML\`.`
    );
  }
  if (resolved !== null && resolvedChild != null) throw dangerHtmlChildrenError();
  validateDangerouslySetInnerHTMLValue(resolved);
  if (Object.prototype.hasOwnProperty.call(el, DANGER_HTML_RESOLVED_VALUE) && Object.is(el[DANGER_HTML_RESOLVED_VALUE], resolved) && Object.is(el[DANGER_HTML_RESOLVED_CHILD], resolvedChild)) {
    return;
  }
  el[DANGER_HTML_SPREAD_CHILD] = resolvedChild;
  setDangerouslySetInnerHTML(el, resolved);
  el[DANGER_HTML_RESOLVED_VALUE] = resolved;
  el[DANGER_HTML_RESOLVED_CHILD] = resolvedChild;
}
function markDangerouslySetInnerHTMLChildren(el) {
  el[DANGER_HTML_STATIC_CHILD] = true;
  if (el[DANGER_HTML_ACTIVE] === true) throw dangerHtmlChildrenError();
}
function dangerouslySetInnerHTMLOwnsChild(parent, value) {
  if (parent.nodeType !== 1 || parent[DANGER_HTML_ACTIVE] !== true) return false;
  if (value !== null && value !== void 0) throw dangerHtmlChildrenError();
  return true;
}
const refCleanups = /* @__PURE__ */ new WeakMap();
const refLastCleanupTarget = /* @__PURE__ */ new WeakMap();
function attachRef(ref, el, prevTarget) {
  if (ref == null) return;
  if (typeof ref === "function") {
    if (el === null) {
      const perTarget = refCleanups.get(ref);
      const target = prevTarget ?? refLastCleanupTarget.get(ref);
      const cleanup = perTarget !== void 0 && target != null ? perTarget.get(target) : void 0;
      if (cleanup !== void 0) {
        perTarget.delete(target);
        if (refLastCleanupTarget.get(ref) === target) refLastCleanupTarget.delete(ref);
        cleanup();
      } else {
        ref(null);
      }
    } else {
      const cleanup = ref(el);
      if (typeof cleanup === "function") {
        let perTarget = refCleanups.get(ref);
        if (perTarget === void 0) refCleanups.set(ref, perTarget = /* @__PURE__ */ new WeakMap());
        perTarget.set(el, cleanup);
        refLastCleanupTarget.set(ref, el);
      }
    }
    return;
  }
  if (Array.isArray(ref)) {
    for (let i = 0; i < ref.length; i++) attachRef(ref[i], el, prevTarget);
    return;
  }
  ref.current = el;
}
const Fragment = /* @__PURE__ */ Symbol.for("octane.Fragment");
const Activity = /* @__PURE__ */ Symbol.for("octane.Activity");
class FragmentInstance {
  /**
   * Sentinel that React's test suite asserts is truthy as a sanity-check
   * that the FragmentInstance is bound to its owning Block. Named
   * `_ownerBlock` (not React's `_fragmentFiber`) because octane uses
   * Blocks, not fibers — same role.
   */
  _ownerBlock;
  _startMarker;
  _endMarker;
  _destroyed;
  /**
   * Registry of listeners added via addEventListener, deduped by
   * (type, listener, capture). `null` until the first addEventListener — zero
   * per-instance cost for fragments that never use the listener API. Stored
   * (not snapshotted onto specific elements) so they can be RE-APPLIED to
   * children that mount later: `_reapply` (run after every commit) attaches
   * each stored listener to the current children, matching React's
   * future-children contract.
   */
  _listeners;
  /**
   * Observers registered via observeUsing, re-applied to future children the
   * same way as `_listeners`. `null` until the first observeUsing.
   */
  _observers;
  /**
   * The ref currently pointed at this instance. Held here (not captured in the
   * mount closure) so the unmount cleanup detaches whatever ref is current AND
   * the compiler's update path can re-point a changed `<Fragment ref={…}>`.
   */
  _currentRef;
  constructor(ownerBlock, startMarker, endMarker) {
    this._ownerBlock = ownerBlock;
    this._startMarker = startMarker;
    this._endMarker = endMarker;
    this._destroyed = false;
    this._listeners = null;
    this._observers = null;
    this._currentRef = null;
  }
  _destroy() {
    this._destroyed = true;
    activeFragments.delete(this);
    if (this._listeners) {
      for (const el of fragmentDirectChildren(this)) {
        for (const e of this._listeners) {
          el.removeEventListener(e.type, e.listener, e.options);
        }
      }
      this._listeners = null;
    }
    this._observers = null;
  }
  /** Deregister from the commit re-apply set once no bindings remain. */
  _maybeDeactivate() {
    if ((this._listeners === null || this._listeners.length === 0) && (this._observers === null || this._observers.size === 0)) {
      activeFragments.delete(this);
    }
  }
  /**
   * Re-apply every stored listener + observer to the CURRENT direct children.
   * Run after each commit (reapplyFragmentBindings) so children that mounted
   * since the last pass pick up the fragment's bindings. addEventListener and
   * observer.observe are idempotent for an already-wired (element, binding)
   * pair, so re-applying is safe.
   */
  _reapply() {
    if (this._destroyed) return;
    for (const el of fragmentDirectChildren(this)) {
      if (this._listeners) {
        for (const e of this._listeners) el.addEventListener(e.type, e.listener, e.options);
      }
      if (this._observers) {
        for (const ob of this._observers) ob.observe(el);
      }
    }
  }
  // ─── focus / focusLast / blur (Stage 2) ─────────────────────────────
  /**
   * Focus the first focusable element inside the fragment, in tree order.
   * Mirrors React FragmentInstance.focus: matches `<input>`, `<button>`,
   * `<select>`, `<textarea>`, `<a href>`, `[contenteditable="true"]`, and
   * anything with an explicit tabIndex >= 0. Skips disabled/hidden and
   * tabIndex=-1 elements. No-op if the fragment has no focusable descendants.
   */
  focus(options) {
    if (this._destroyed) return;
    for (const el of fragmentDescendants(this)) {
      if (isFocusable(el)) {
        el.focus(options);
        return;
      }
    }
  }
  /**
   * Focus the LAST focusable element inside the fragment, in tree order.
   * Same focusability rules as `focus()`.
   */
  focusLast(options) {
    if (this._destroyed) return;
    let last = null;
    for (const el of fragmentDescendants(this)) {
      if (isFocusable(el)) last = el;
    }
    if (last) last.focus(options);
  }
  /**
   * Blur the currently-focused element if it's inside the fragment range.
   * No-op if focus is outside the fragment (matches React's "owned" scope —
   * we don't blur arbitrary other elements just because they happen to be
   * active when blur() is called).
   */
  blur() {
    if (this._destroyed) return;
    const doc = this._startMarker.ownerDocument || document;
    const active = doc.activeElement;
    if (!active || active === doc.body) return;
    if (isInsideFragment(this, active)) {
      active.blur();
    }
  }
  // ─── addEventListener / removeEventListener (Stage 3) ───────────────
  /**
   * Attaches a listener to every DIRECT (host-Element) child of the fragment.
   * The (type, listener, capture) tuple is stored and RE-APPLIED after each
   * commit, so children inserted into the fragment LATER also get the listener
   * — React's future-children contract. Deduped by (type, listener, capture)
   * like the DOM, so repeat calls are no-ops.
   */
  addEventListener(type, listener, options) {
    if (this._destroyed) return;
    const capture = listenerCapturePhase(options);
    if (!this._listeners) this._listeners = [];
    for (const e of this._listeners) {
      if (e.type === type && e.listener === listener && listenerCapturePhase(e.options) === capture) {
        return;
      }
    }
    this._listeners.push({ type, listener, options });
    for (const el of fragmentDirectChildren(this)) {
      el.addEventListener(type, listener, options);
    }
    activeFragments.add(this);
  }
  /**
   * Removes a listener previously added via this FragmentInstance. The
   * (type, listener, options.capture) tuple must match the add call — the same
   * identity rule EventTarget.removeEventListener uses. Detaches from the
   * current children and stops re-applying it to future ones. Unmatched calls
   * are a silent no-op (DOM parity).
   */
  removeEventListener(type, listener, options) {
    if (this._destroyed || !this._listeners) return;
    const wantCapture = listenerCapturePhase(options);
    for (let i = this._listeners.length - 1; i >= 0; i--) {
      const entry = this._listeners[i];
      if (entry.type !== type) continue;
      if (entry.listener !== listener) continue;
      if (listenerCapturePhase(entry.options) !== wantCapture) continue;
      for (const el of fragmentDirectChildren(this)) {
        el.removeEventListener(type, listener, entry.options);
      }
      this._listeners.splice(i, 1);
      this._maybeDeactivate();
      return;
    }
  }
  // ─── observeUsing / unobserveUsing / getClientRects / getRootNode (Stage 4) ─
  /**
   * Forwards .observe() on the supplied observer (IntersectionObserver,
   * ResizeObserver, MutationObserver, or any other with an `observe(target)`
   * signature) to every direct fragment child. Lets a single fragment ref
   * stand in for "watch this list of siblings" — react-aria's Virtualizer
   * and dnd-kit's drop-zone primitives are the canonical clients.
   */
  observeUsing(observer) {
    if (this._destroyed) return;
    if (!this._observers) this._observers = /* @__PURE__ */ new Set();
    this._observers.add(observer);
    for (const el of fragmentDirectChildren(this)) observer.observe(el);
    activeFragments.add(this);
  }
  /**
   * Stops observing with the given observer: unobserves the current children
   * and stops re-applying it to future ones. (The walk runs even without a
   * preceding observeUsing, matching the DOM's tolerant unobserve.)
   */
  unobserveUsing(observer) {
    if (this._destroyed) return;
    if (this._observers) this._observers.delete(observer);
    for (const el of fragmentDirectChildren(this)) observer.unobserve(el);
    this._maybeDeactivate();
  }
  /**
   * Concatenates the client rects of every direct fragment child. The
   * returned array is a flat list of DOMRects in tree order — useful for
   * tooltip positioning that needs to span multiple sibling elements.
   * After unmount returns [].
   */
  getClientRects() {
    const out = [];
    if (this._destroyed) return out;
    let node = this._startMarker.nextSibling;
    while (node && node !== this._endMarker) {
      if (node.nodeType === 1) {
        const rects = node.getClientRects();
        for (let i = 0; i < rects.length; i++) out.push(rects[i]);
      }
      node = node.nextSibling;
    }
    return out;
  }
  /**
   * Returns the rootNode of the fragment (its document or shadow root).
   * Falls back to the start-marker's owner document if the fragment has
   * no direct children yet — keeps the contract "always returns a Node"
   * so callers don't need null-checks.
   */
  getRootNode() {
    if (this._destroyed) return this._startMarker.getRootNode();
    let node = this._startMarker.nextSibling;
    while (node && node !== this._endMarker) {
      if (node.nodeType === 1) return node.getRootNode();
      node = node.nextSibling;
    }
    return this._startMarker.getRootNode();
  }
  // ─── compareDocumentPosition / dispatchEvent (Stage 5) ──────────────
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
  compareDocumentPosition(other) {
    if (this._destroyed) return Node.DOCUMENT_POSITION_DISCONNECTED;
    const startRel = this._startMarker.compareDocumentPosition(other);
    if (startRel & Node.DOCUMENT_POSITION_DISCONNECTED) return startRel;
    const endRel = this._endMarker.compareDocumentPosition(other);
    const followsStart = (startRel & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    const precedesEnd = (endRel & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
    if (followsStart && precedesEnd) {
      return Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING;
    }
    if (startRel & Node.DOCUMENT_POSITION_PRECEDING) {
      return Node.DOCUMENT_POSITION_PRECEDING;
    }
    return Node.DOCUMENT_POSITION_FOLLOWING;
  }
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
  dispatchEvent(event) {
    if (this._destroyed) return true;
    const parent = this._startMarker.parentNode;
    if (!parent) return true;
    return parent.dispatchEvent(event);
  }
  // ─── scrollIntoView (Stage 6) ───────────────────────────────────────
  /**
   * Scrolls the fragment into view. Picks the first focusable descendant
   * if one exists (matches what tab-focus would land on), falling back to
   * the first element child otherwise. Mirrors React's FragmentInstance
   * choice — for tooltip / anchor-scroll use cases the "natural target"
   * is usually a focusable element, not an arbitrary wrapper div.
   */
  scrollIntoView(arg) {
    if (this._destroyed) return;
    let firstFocusable = null;
    let firstAny = null;
    for (const el of fragmentDescendants(this)) {
      if (!firstAny) firstAny = el;
      if (isFocusable(el)) {
        firstFocusable = el;
        break;
      }
    }
    const target = firstFocusable || firstAny;
    if (target) target.scrollIntoView(arg);
  }
}
function listenerCapturePhase(o) {
  if (o == null) return false;
  if (typeof o === "boolean") return o;
  return !!o.capture;
}
function* fragmentDescendants(fi) {
  let node = fi._startMarker.nextSibling;
  while (node && node !== fi._endMarker) {
    const next = node.nextSibling;
    if (node.nodeType === 1) {
      const top = node;
      yield top;
      const walker = (top.ownerDocument || document).createTreeWalker(top, 1);
      let descendant = walker.nextNode();
      while (descendant) {
        yield descendant;
        descendant = walker.nextNode();
      }
    }
    node = next;
  }
}
function* fragmentDirectChildren(fi) {
  let node = fi._startMarker.nextSibling;
  while (node && node !== fi._endMarker) {
    const next = node.nextSibling;
    if (node.nodeType === 1) yield node;
    node = next;
  }
}
function isInsideFragment(fi, node) {
  const startRel = fi._startMarker.compareDocumentPosition(node);
  const endRel = fi._endMarker.compareDocumentPosition(node);
  const followsStart = (startRel & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  const precedesEnd = (endRel & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
  return followsStart && precedesEnd;
}
function isFocusable(el) {
  if (el.hidden === true) return false;
  const tabAttr = el.getAttribute("tabindex");
  const explicitTab = tabAttr === null ? null : parseInt(tabAttr, 10);
  if (explicitTab !== null && explicitTab < 0) return false;
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
    return !el.disabled;
  }
  if (tag === "A" && el.hasAttribute("href")) return true;
  if (explicitTab !== null && explicitTab >= 0) return true;
  if (el.getAttribute("contenteditable") === "true") return true;
  return false;
}
function mountFragmentRef(scope, startMarker, endMarker, ref) {
  const fi = new FragmentInstance(scope.block, startMarker, endMarker);
  fi._currentRef = ref;
  queueRefAttach(scope, () => attachRef(fi._currentRef, fi));
  scope.cleanups.push(() => {
    queueRefDetach(fi._currentRef, fi);
    fi._destroy();
  });
  return fi;
}
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";
const SVG_NS = "http://www.w3.org/2000/svg";
const MATHML_NS = "http://www.w3.org/1998/Math/MathML";
const HTML_NS = "http://www.w3.org/1999/xhtml";
function isHtmlCustomElement(el) {
  return el.namespaceURI === HTML_NS && el.localName.indexOf("-") !== -1;
}
function inferTagNs(tag, inherited) {
  if (tag === "svg") return SVG_NS;
  if (tag === "math") return MATHML_NS;
  if (inherited === void 0 && SVG_ONLY_TAGS.has(tag)) return SVG_NS;
  return inherited;
}
function deoptChildNamespace(parent) {
  if (parent.nodeType !== 1) return void 0;
  const el = parent;
  if (el.namespaceURI === SVG_NS) return el.localName === "foreignObject" ? void 0 : SVG_NS;
  if (el.namespaceURI === MATHML_NS) return MATHML_NS;
  return void 0;
}
function attrNamespace(name) {
  if (name === "xmlns") return XMLNS_NS;
  const colon = name.indexOf(":");
  if (colon <= 0) return null;
  const prefix = name.slice(0, colon);
  if (prefix === "xlink") return XLINK_NS;
  if (prefix === "xml") return XML_NS;
  if (prefix === "xmlns") return XMLNS_NS;
  return null;
}
function setAttribute(el, name, value) {
  if (name === "dangerouslySetInnerHTML") {
    setDangerouslySetInnerHTML(el, value);
    return;
  }
  if (name === "suppressContentEditableWarning") return;
  switch (name.length) {
    case 5:
      if (name === "value") {
        const t = el.localName;
        if (t === "input" || t === "textarea") return setValue(el, value);
        if (t === "select") return setSelectValue(el, value);
      } else if (name === "muted" && !isHtmlCustomElement(el)) {
        el.muted = value && typeof value !== "function" && typeof value !== "symbol";
        return;
      }
      break;
    case 7:
      if (name === "checked" && el.localName === "input") return setChecked(el, value);
      break;
    case 8:
      if ((name === "multiple" || name === "selected") && !isHtmlCustomElement(el)) {
        el[name] = value && typeof value !== "function" && typeof value !== "symbol";
        return;
      }
      break;
    case 9:
      if (name === "autoFocus" && !isHtmlCustomElement(el)) {
        return setAutoFocus(el, value);
      }
      if (process.env.NODE_ENV !== "production" && name === "autofocus" && el.__oct_loc !== void 0) {
        console.error("Invalid DOM property `autofocus`. Did you mean `autoFocus`?");
      }
      break;
    case 12:
      if (name === "defaultValue") {
        const t = el.localName;
        if (t === "input" || t === "textarea" || t === "select") {
          return setDefaultValue(el, value);
        }
      } else if (process.env.NODE_ENV !== "production" && name === "defaultvalue" && el.__oct_loc !== void 0) {
        console.error("Invalid DOM property `defaultvalue`. Did you mean `defaultValue`?");
      }
      break;
    case 14:
      if (name === "defaultChecked" && el.localName === "input") {
        return setDefaultChecked(el, value);
      }
      if (process.env.NODE_ENV !== "production" && name === "defaultchecked" && el.__oct_loc !== void 0) {
        console.error("Invalid DOM property `defaultchecked`. Did you mean `defaultChecked`?");
      }
      break;
  }
  if (name.length > 2 && name.charCodeAt(0) === 111 && name.charCodeAt(1) === 110 && isHtmlCustomElement(el) && (typeof value === "function" || el.$$ceListeners?.[name] !== void 0)) {
    const type = name.slice(2);
    const map = el.$$ceListeners ??= {};
    const prev = map[name];
    if (prev !== void 0 && prev !== value) el.removeEventListener(type, prev);
    if (typeof value === "function") {
      if (prev !== value) el.addEventListener(type, value);
      map[name] = value;
      el.removeAttribute(name);
      return;
    }
    delete map[name];
  }
  if (!isHtmlCustomElement(el)) {
    const alias = ATTRIBUTE_ALIASES.get(name);
    if (alias !== void 0) name = alias;
  }
  let next = coerceAttrValue(el, name, value);
  if (next !== null) next = sanitizeURLAttribute(el.localName, name, next);
  const hydration = activeHydration();
  if (hydration !== null && !hydration.allowAttribute(el, name, next)) return;
  const ns = attrNamespace(name);
  if (next === null) {
    if (ns) {
      const colon = name.indexOf(":");
      el.removeAttributeNS(ns, colon >= 0 ? name.slice(colon + 1) : name);
    } else {
      el.removeAttribute(name);
    }
    return;
  }
  if (!VALID_ATTR_NAME.test(name)) {
    if (process.env.NODE_ENV !== "production" && el.__oct_loc !== void 0) {
      console.error(`Invalid attribute name: \`${name}\` (skipped).`);
    }
    return;
  }
  if (ns) el.setAttributeNS(ns, name, next);
  else el.setAttribute(name, next);
}
function setStringData(el, name, value) {
  const t = typeof value;
  let next;
  if (value == null || t === "function" || t === "symbol") {
    next = null;
  } else {
    if (process.env.NODE_ENV !== "production" && t === "object" && el.__oct_loc !== void 0 && value.toString === Object.prototype.toString) {
      console.error(
        `The provided \`${name}\` attribute is an object; it will stringify to "[object Object]". Pass a string (or a value with a meaningful toString) instead.`
      );
    }
    next = typeof value === "string" ? value : String(value);
  }
  const hydration = activeHydration();
  if (hydration !== null && !hydration.allowAttribute(el, name, next)) return;
  if (next === null) el.removeAttribute(name);
  else el.setAttribute(name, next);
}
function coerceAttrValue(el, name, value) {
  if (name.charCodeAt(0) === 97 && name.startsWith("aria-")) {
    return value == null ? null : String(value);
  }
  const t = typeof value;
  if (t === "boolean" && isEnumeratedBooleanAttr(name)) return value ? "true" : "false";
  if (t === "boolean" && name.startsWith("data-")) return value ? "true" : "false";
  if (t === "function" || t === "symbol") return null;
  if (!isHtmlCustomElement(el)) {
    const lower = name.toLowerCase();
    if (BOOLEAN_ATTR_PROPS.has(lower)) {
      return value ? "" : null;
    }
    if (t === "boolean" && (lower === "download" || lower === "capture")) {
      return value ? "" : null;
    }
    if (t === "boolean") {
      if (process.env.NODE_ENV !== "production" && el.__oct_loc !== void 0) {
        console.error(
          `Received \`${value}\` for a non-boolean attribute \`${name}\`. ` + (value === true ? `If you want to write it to the DOM, pass a string instead: ${name}="true" or ${name}={value.toString()}.` : `If you used to conditionally omit it with ${name}={condition && value}, pass ${name}={condition ? value : undefined} instead.`)
        );
      }
      return null;
    }
    if (POSITIVE_NUMERIC_ATTR_PROPS.has(lower) && !(Number(value) >= 1)) {
      return null;
    }
    if (name.length > 2 && name.charCodeAt(0) === 111 && name.charCodeAt(1) === 110) {
      if (process.env.NODE_ENV !== "production" && el.__oct_loc !== void 0 && typeof value === "function") {
        console.error(
          `Unknown event handler property \`${name}\` was dropped \u2014 did you mean \`on${name.charAt(2).toUpperCase()}${name.slice(3)}\`? (lowercase on* attributes never write; octane delegates camelCase handlers natively)`
        );
      }
      return null;
    }
  }
  if (value == null || value === false) return null;
  if (process.env.NODE_ENV !== "production" && t === "object" && el.__oct_loc !== void 0 && value.toString === Object.prototype.toString) {
    console.error(
      `The provided \`${name}\` attribute is an object; it will stringify to "[object Object]". Pass a string (or a value with a meaningful toString) instead.`
    );
  }
  const v = value === true ? "" : String(value);
  if (v === "" && (name === "src" || name === "href" && el.nodeName !== "A" && el.nodeName !== "AREA" || name === "data" && el.nodeName === "OBJECT")) {
    return null;
  }
  return v;
}
import { normalizeClass, styleName } from "./css.js";
function setClassName(el, value) {
  const cls = normalizeClass(value);
  const hydration = activeHydration();
  if (hydration !== null) {
    hydration.queueClass(el, cls, true, false, value == null || value === false);
    return;
  }
  if (value == null || value === false) el.removeAttribute("class");
  else el.className = cls;
}
function setClassAttr(el, value) {
  const cls = value == null || value === false ? null : normalizeClass(value);
  const hydration = activeHydration();
  if (hydration !== null) {
    hydration.queueClass(el, cls, false, true, cls === null);
    return;
  }
  if (cls === null) el.removeAttribute("class");
  else el.setAttribute("class", cls);
}
function setDeoptClass(el, value) {
  if (el.namespaceURI === SVG_NS) {
    setClassAttr(el, value);
  } else {
    setClassName(el, value);
  }
}
const IMPORTANT_SUFFIX = "!important";
function setStyle(el, value, prev) {
  const style = el.style;
  const hydration = activeHydration();
  if (hydration !== null && hydration.applyStyle(el, value, prev)) return;
  applyStyleValue(style, value, prev);
}
function applyStyleValue(style, value, prev) {
  if (value == null || value === false || value === "") {
    if (prev != null && prev !== false && prev !== "") style.cssText = "";
    return;
  }
  if (typeof value === "string") {
    if (prev !== value) style.cssText = value;
    return;
  }
  if (prev && typeof prev === "object") {
    for (const k in prev) {
      if (!(k in value)) style.removeProperty(styleName(k));
    }
    for (const k in value) {
      const v = value[k];
      if (v === prev[k]) continue;
      if (v == null || typeof v === "boolean") style.removeProperty(styleName(k));
      else applyStyleProperty(style, k, v);
    }
  } else {
    if (typeof prev === "string") style.cssText = "";
    for (const k in value) {
      const v = value[k];
      if (v != null && typeof v !== "boolean") applyStyleProperty(style, k, v);
    }
  }
}
function applyStyleProperty(style, name, value) {
  const prop = styleName(name);
  const s = cssStyleValue(name, value);
  const tail = s.trimEnd();
  if (tail.endsWith(IMPORTANT_SUFFIX)) {
    style.setProperty(
      prop,
      tail.slice(0, tail.length - IMPORTANT_SUFFIX.length).trimEnd(),
      "important"
    );
  } else {
    style.setProperty(prop, s);
  }
}
function isEventKey(k) {
  const c = k.charCodeAt(2);
  return k.length > 2 && k.charCodeAt(0) === 111 && k.charCodeAt(1) === 110 && c >= 65 && c <= 90;
}
const CAPTURE_PREFIX = "$$capture:";
function jsxEventName(rest) {
  if (rest === "DoubleClick") return "dblclick";
  return rest.toLowerCase();
}
function eventSlot(name) {
  if (!isEventKey(name)) return null;
  let rest = name.slice(2);
  let capture = false;
  if (rest.length > 7 && rest.endsWith("Capture") && name !== "onGotPointerCapture" && name !== "onLostPointerCapture") {
    capture = true;
    rest = rest.slice(0, rest.length - 7);
  }
  const type = jsxEventName(rest);
  return { type, key: capture ? CAPTURE_PREFIX + type : "$$" + type, capture };
}
function removeHostProp(el, name, prevValue) {
  if (name === "class" || name === "className") {
    el.removeAttribute("class");
  } else if (name === "style") {
    setStyle(el, null, prevValue);
  } else if (name === "dangerouslySetInnerHTML") {
    setDangerouslySetInnerHTML(el, null);
  } else if (name === "suppressHydrationWarning") {
    el.__oct_suppress = false;
  } else {
    const actionName = formActionAttributeName(el, name);
    if (actionName !== null) {
      setFormAction(
        el,
        actionName,
        null,
        prevValue
      );
      return;
    }
    const ev = eventSlot(name);
    if (ev) el[ev.key] = null;
    else setAttribute(el, name, null);
  }
}
function snapshotSpread(value) {
  if (value == null) return null;
  const source = Object(value);
  const snapshot = /* @__PURE__ */ Object.create(null);
  for (const key of Reflect.ownKeys(source)) {
    if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
    const next = source[key];
    if (typeof key === "string") snapshot[key] = next;
  }
  return snapshot;
}
function formActionAttributeName(el, name) {
  if (el.localName === "form" && name === "action") return "action";
  if ((el.localName === "button" || el.localName === "input") && (name === "formAction" || name === "formaction"))
    return "formaction";
  return null;
}
function isHostPropIdentityKey(name) {
  if (name === "ref" || name === "children" || name === "dangerouslySetInnerHTML" || name === "suppressHydrationWarning" || name === "suppressContentEditableWarning" || name === "autoFocus" || name === "value" || name === "defaultValue" || name === "checked" || name === "defaultChecked" || name === "multiple")
    return true;
  return isEventKey(name);
}
function normalizedHostProp(el, rawName) {
  if (rawName === "class" || rawName === "className") return ["class", "class"];
  const actionName = formActionAttributeName(el, rawName);
  if (actionName !== null) return [actionName, actionName];
  if (isHostPropIdentityKey(rawName)) return [rawName, rawName];
  let name = rawName;
  if (!isHtmlCustomElement(el)) name = ATTRIBUTE_ALIASES.get(name) ?? name;
  const identity = el.namespaceURI === "http://www.w3.org/1999/xhtml" ? name.toLowerCase() : name;
  return [identity, name];
}
function setHostPropSources(el, sources, prev, scope, hasNestedChildren = false) {
  const props = /* @__PURE__ */ new Map();
  let sourceOrder = 0;
  const record = (rawName, value) => {
    if (typeof rawName !== "string") return;
    const order = sourceOrder++;
    const previous = props.get(rawName);
    props.set(rawName, {
      rawName,
      value,
      firstOrder: previous?.firstOrder ?? order,
      lastOrder: order
    });
  };
  for (const source of sources) {
    if (!source[0]) {
      record(source[1], source[2]);
      continue;
    }
    const spread = source[1];
    if (spread == null || typeof spread !== "object" && typeof spread !== "function") continue;
    for (const name of Object.keys(Object(spread))) {
      record(name, spread[name]);
    }
  }
  const values = /* @__PURE__ */ new Map();
  for (const writer of props.values()) {
    if (writer.rawName === "key") continue;
    const [identity, name] = normalizedHostProp(el, writer.rawName);
    const previous = values.get(identity);
    if (previous === void 0 || previous[3] < writer.lastOrder) {
      values.set(identity, [name, writer.value, writer.firstOrder, writer.lastOrder]);
    }
  }
  const resolved = /* @__PURE__ */ Object.create(null);
  const ordered = [...values.values()].sort((a, b) => a[2] - b[2]);
  for (const [name, value] of ordered) resolved[name] = value;
  const formHost = el.localName === "input" || el.localName === "textarea" || el.localName === "select";
  setSpread(el, resolved, prev, scope, true, formHost);
  setDangerouslySetInnerHTMLSources(el, sources, hasNestedChildren);
  if (formHost) setFormControlSources(el, sources);
  return resolved;
}
function isAggregatedFormControlProp(el, name) {
  switch (el.localName) {
    case "input":
      return name === "value" || name === "defaultValue" || name === "checked" || name === "defaultChecked";
    case "textarea":
      return name === "value" || name === "defaultValue";
    case "select":
      return name === "value" || name === "defaultValue" || name === "multiple";
  }
  return false;
}
function setSpread(el, value, prev, mountScope, skipDangerouslySetInnerHTML = false, skipFormControls = false) {
  if (value != null && Object.prototype.propertyIsEnumerable.call(Object(value), "suppressHydrationWarning")) {
    el.__oct_suppress = value.suppressHydrationWarning !== false;
  }
  if (!skipDangerouslySetInnerHTML) {
    if (value != null && Object.prototype.propertyIsEnumerable.call(Object(value), "children")) {
      el[DANGER_HTML_SPREAD_CHILD] = value.children;
      if (value.children != null && el[DANGER_HTML_ACTIVE] === true) {
        throw dangerHtmlChildrenError();
      }
    } else if (prev != null && Object.prototype.propertyIsEnumerable.call(Object(prev), "children")) {
      el[DANGER_HTML_SPREAD_CHILD] = void 0;
    }
  }
  if (prev) {
    for (const k of Object.keys(Object(prev))) {
      if (k === "key" || k === "children") continue;
      if (skipDangerouslySetInnerHTML && k === "dangerouslySetInnerHTML") continue;
      if (skipFormControls && isAggregatedFormControlProp(el, k)) continue;
      if (k === "ref") {
        const nextRef = value ? value.ref : void 0;
        if (prev.ref != null && prev.ref !== nextRef) queueRefDetach(prev.ref, el);
        continue;
      }
      if (value != null && Object.prototype.propertyIsEnumerable.call(Object(value), k)) continue;
      removeHostProp(el, k, prev[k]);
    }
  }
  if (value == null) return;
  for (const k of Object.keys(Object(value))) {
    if (k === "key" || k === "children") continue;
    if (skipDangerouslySetInnerHTML && k === "dangerouslySetInnerHTML") continue;
    if (skipFormControls && isAggregatedFormControlProp(el, k)) continue;
    const v = value[k];
    const pv = prev ? prev[k] : void 0;
    if (k === "ref") {
      if (v === pv) continue;
      if (mountScope) queueRefAttach(mountScope, () => attachRef(v, el));
      else attachRef(v, el);
      continue;
    }
    if (k === "suppressHydrationWarning") continue;
    if (k === "class" || k === "className") {
      if (v === pv) continue;
      setClassAttr(el, v);
      continue;
    }
    if (k === "style") {
      setStyle(el, v, pv);
      continue;
    }
    if (k === "dangerouslySetInnerHTML") {
      setDangerouslySetInnerHTML(el, v);
      continue;
    }
    const actionName = formActionAttributeName(el, k);
    if (actionName !== null) {
      if (v === pv) continue;
      setFormAction(
        el,
        actionName,
        v,
        pv
      );
      continue;
    }
    const ev = eventSlot(k);
    if (ev) {
      if (v === pv) continue;
      if (ev.capture) {
        if (!_delegatedCapture.has(ev.type)) delegateCaptureEvents([ev.type]);
      } else if (!_delegated.has(ev.type)) {
        delegateEvents([ev.type]);
      }
      el[ev.key] = v;
      continue;
    }
    if (v === pv && !isControlledHostProp(el, k)) continue;
    setAttribute(el, k, v);
  }
}
const _injectedStyles = /* @__PURE__ */ new Set();
function adoptServerHeadEl(key) {
  for (let n = document.head.firstChild; n !== null; n = n.nextSibling) {
    if (n.nodeType === 8 && n.data === key) {
      let el = n.nextSibling;
      while (el !== null && el.nodeType === 3 && /^\s*$/.test(el.data)) {
        el = el.nextSibling;
      }
      n.remove();
      return el !== null && el.nodeType === 1 ? el : null;
    }
  }
  return null;
}
function headBlock(scope, slot, key, tag, attrs, text) {
  if (typeof document === "undefined") return;
  let state = scope.slots[slot];
  if (state === void 0) {
    let el2 = adoptServerHeadEl(key);
    if (el2 === null) {
      el2 = document.createElement(tag);
      document.head.appendChild(el2);
    }
    state = { el: el2 };
    scope.slots[slot] = state;
    scope.cleanups.push(() => {
      state.el.remove();
      scope.slots[slot] = void 0;
    });
  }
  const el = state.el;
  if (attrs !== null) {
    for (const k in attrs) {
      const ev = k.length > 2 && k[0] === "o" && k[1] === "n" ? eventSlot(k) : null;
      if (ev !== null) {
        const v = attrs[k];
        const hs = state.handlers ??= /* @__PURE__ */ new Map();
        const prevH = hs.get(ev.type);
        if (prevH) el.removeEventListener(ev.type, prevH, ev.capture);
        if (typeof v === "function") {
          el.addEventListener(ev.type, v, ev.capture);
          hs.set(ev.type, v);
        } else {
          hs.delete(ev.type);
        }
        continue;
      }
      setAttribute(el, k, attrs[k]);
    }
  }
  if (text != null) {
    const t = String(text);
    if (el.textContent !== t) el.textContent = t;
  }
}
function namespaceHead(props, scope) {
  const slot = 1;
  const inherited = deoptChildNamespace(scope.block.parentNode);
  if (inherited !== void 0) {
    const state = scope.slots[slot];
    if (state !== void 0) {
      state.el.remove();
      scope.slots[slot] = void 0;
    }
    return createElement(props.tag, props.attrs ?? void 0, props.text);
  }
  let headAttrs = null;
  if (props.attrs !== null) {
    headAttrs = {};
    for (const key in props.attrs) {
      if (key === "key" || key === "ref" || key === "class" || key === "className") continue;
      headAttrs[key] = props.attrs[key];
    }
  }
  headBlock(scope, slot, props.headKey, props.tag, headAttrs, props.text);
  return null;
}
function namespaceHeadElement(headKey, tag, attrs, text, authoredKey) {
  const key = authoredKey !== void 0 ? authoredKey : attrs?.key;
  const config = { headKey, tag, attrs, text };
  if (key !== void 0) config.key = key;
  return createElement(namespaceHead, config);
}
function injectStyle(id, css) {
  if (_injectedStyles.has(id)) return;
  if (typeof document !== "undefined" && document.querySelector(`style[data-octane="${id}"]`)) {
    _injectedStyles.add(id);
    return;
  }
  _injectedStyles.add(id);
  const el = document.createElement("style");
  el.setAttribute("data-octane", id);
  el.textContent = css;
  document.head.appendChild(el);
}
const EMPTY_ARGS = [];
function evt0(el, key, fn) {
  const d = { fn, args: EMPTY_ARGS };
  el[key] = d;
  return d;
}
function evt0u(d, fn) {
  d.fn = fn;
}
function evt1(el, key, fn, a0) {
  const d = { fn, args: [a0] };
  el[key] = d;
  return d;
}
function evt1u(d, fn, a0) {
  d.fn = fn;
  d.args[0] = a0;
}
function evt2(el, key, fn, a0, a1) {
  const d = { fn, args: [a0, a1] };
  el[key] = d;
  return d;
}
function evt2u(d, fn, a0, a1) {
  d.fn = fn;
  const a = d.args;
  a[0] = a0;
  a[1] = a1;
}
function evtN(el, key, fn, args) {
  const d = { fn, args };
  el[key] = d;
  return d;
}
function evtNu(d, fn, args) {
  d.fn = fn;
  d.args = args;
}
const _delegated = /* @__PURE__ */ new Set();
const _delegationTargets = /* @__PURE__ */ new Map();
const _delegatedCapture = /* @__PURE__ */ new Set();
const EMULATED_BUBBLING_EVENTS = [
  "abort",
  "beforetoggle",
  "cancel",
  "canplay",
  "canplaythrough",
  "close",
  "durationchange",
  "emptied",
  "encrypted",
  "ended",
  "error",
  "load",
  "loadeddata",
  "loadedmetadata",
  "loadstart",
  "pause",
  "play",
  "playing",
  "progress",
  "ratechange",
  "resize",
  "seeked",
  "seeking",
  "stalled",
  "suspend",
  "timeupdate",
  "toggle",
  "volumechange",
  "waiting"
];
const CAPTURE_DELEGATED = /* @__PURE__ */ new Set([
  "focus",
  "blur",
  // `invalid` doesn't bubble either, but React's onInvalid propagates (a form's
  // onInvalid observes its controls' invalid events) — so it gets the focus/blur
  // walking treatment, NOT the enter/leave target-only one.
  "invalid",
  "pointerenter",
  "pointerleave",
  "mouseenter",
  "mouseleave",
  // Element `scroll`/`scrollend` don't bubble either. React 17+ made onScroll
  // NON-bubbling (it fires only on the scrolled element), so they get the
  // enter/leave target-only treatment below.
  "scroll",
  "scrollend",
  ...EMULATED_BUBBLING_EVENTS
]);
const delegatedCapture = (name) => CAPTURE_DELEGATED.has(name);
const TARGET_ONLY_DELEGATED = /* @__PURE__ */ new Set([
  "pointerenter",
  "pointerleave",
  "mouseenter",
  "mouseleave",
  // React 17+ parity: onScroll fires on the scrolled element only (no synthetic
  // bubbling), and ancestors receive their own scroll events natively.
  "scroll",
  "scrollend"
]);
function delegateEvents(eventNames) {
  for (let i = 0; i < eventNames.length; i++) {
    const name = eventNames[i];
    if (_delegated.has(name)) continue;
    _delegated.add(name);
    for (const target of _delegationTargets.keys()) {
      target.addEventListener(name, dispatchDelegated, delegatedCapture(name));
    }
  }
}
function delegateCaptureEvents(eventNames) {
  for (let i = 0; i < eventNames.length; i++) {
    const name = eventNames[i];
    if (_delegatedCapture.has(name)) continue;
    _delegatedCapture.add(name);
    for (const target of _delegationTargets.keys()) {
      target.addEventListener(name, dispatchDelegatedCapture, true);
    }
  }
}
function registerDelegationTarget(target) {
  const prev = _delegationTargets.get(target) || 0;
  _delegationTargets.set(target, prev + 1);
  if (prev === 0) {
    if (target.onclick == null && target.nodeType === 1) {
      target.onclick = noop;
    }
    for (const name of _delegated) {
      target.addEventListener(name, dispatchDelegated, delegatedCapture(name));
    }
    for (const name of _delegatedCapture) {
      target.addEventListener(name, dispatchDelegatedCapture, true);
    }
  }
}
function unregisterDelegationTarget(target) {
  const prev = _delegationTargets.get(target);
  if (!prev) return;
  if (prev === 1) {
    _delegationTargets.delete(target);
    for (const name of _delegated) {
      target.removeEventListener(name, dispatchDelegated, delegatedCapture(name));
    }
    for (const name of _delegatedCapture) {
      target.removeEventListener(name, dispatchDelegatedCapture, true);
    }
  } else {
    _delegationTargets.set(target, prev - 1);
  }
}
const DISCRETE_EVENTS = /* @__PURE__ */ new Set([
  "auxclick",
  "beforeblur",
  "beforeinput",
  "blur",
  "cancel",
  "change",
  "click",
  "close",
  "compositionend",
  "compositionstart",
  "compositionupdate",
  "contextmenu",
  "copy",
  "cut",
  "dblclick",
  "dragend",
  "dragstart",
  "drop",
  "focus",
  "focusin",
  "focusout",
  "fullscreenchange",
  "gotpointercapture",
  "hashchange",
  "input",
  "invalid",
  "keydown",
  "keypress",
  "keyup",
  "lostpointercapture",
  "mousedown",
  "mouseup",
  "paste",
  "pause",
  "play",
  "pointercancel",
  "pointerdown",
  "pointerup",
  "popstate",
  "ratechange",
  "reset",
  "resize",
  "seeked",
  "select",
  "selectionchange",
  "selectstart",
  "submit",
  "textInput",
  "touchcancel",
  "touchend",
  "touchstart",
  "volumechange"
]);
let _dispatchDepth = 0;
let _captureFlushFallbackScheduled = false;
const DELEGATED_DISPATCHED = /* @__PURE__ */ Symbol("octane.dispatched");
const CAPTURE_DISPATCHED = /* @__PURE__ */ Symbol("octane.dispatched.capture");
function fireEventSlot(slot, event) {
  try {
    if (typeof slot === "function") {
      slot(event);
      return;
    }
    const fn = slot.fn;
    if (typeof fn !== "function") {
      if (process.env.NODE_ENV !== "production")
        console.error(
          "Expected an event listener to be a function, instead got a value of type " + typeof (fn ?? slot)
        );
      return;
    }
    const a = slot.args;
    switch (a.length) {
      case 0:
        slot.fn(event);
        break;
      case 1:
        slot.fn(a[0], event);
        break;
      case 2:
        slot.fn(a[0], a[1], event);
        break;
      default:
        slot.fn.apply(null, a.concat(event));
    }
  } catch (err) {
    reportListenerError(err);
  }
}
function reportListenerError(err) {
  if (typeof reportError === "function") {
    reportError(err);
    return;
  }
  if (typeof window !== "undefined" && typeof ErrorEvent === "function") {
    const ev = new ErrorEvent("error", {
      error: err,
      message: String(err?.message ?? err),
      cancelable: true
    });
    window.dispatchEvent(ev);
    if (!ev.defaultPrevented) console.error(err);
    return;
  }
  console.error(err);
}
function maybeFlushDiscrete(type) {
  if (_dispatchDepth !== 0 || !DISCRETE_EVENTS.has(type)) return;
  if (hasPendingWork()) {
    if (VT_SEEN && queueAllTransition()) flush();
    else flushSync(noop);
  }
  if (pendingRestores.length > 0) restoreControlledStates();
}
function finishCaptureDispatch(event) {
  const type = event.type;
  if (!event.bubbles || event.cancelBubble || !_delegated.has(type)) {
    maybeFlushDiscrete(type);
    return;
  }
  if (!DISCRETE_EVENTS.has(type) || _captureFlushFallbackScheduled) return;
  _captureFlushFallbackScheduled = true;
  queueMicrotask(() => {
    _captureFlushFallbackScheduled = false;
    maybeFlushDiscrete(type);
  });
}
function dispatchDelegated(event) {
  if (event[DELEGATED_DISPATCHED] === true) return;
  event[DELEGATED_DISPATCHED] = true;
  maybeEnqueueRestore(event);
  const key = "$$" + event.type;
  const targetOnly = TARGET_ONLY_DELEGATED.has(event.type);
  _dispatchDepth++;
  let node = event.target;
  const prevSubmitRec = ACTIVE_SUBMIT_DISPATCH;
  const submitRec = event.type === "submit" && node != null && node.nodeName === "FORM" ? {
    form: node,
    event,
    transitions: 0,
    published: false,
    intercepted: false
  } : null;
  if (submitRec !== null) ACTIVE_SUBMIT_DISPATCH = submitRec;
  const discrete = DISCRETE_EVENTS.has(event.type);
  if (discrete) ACTIVE_DISCRETE_EVENT_DEPTH++;
  try {
    if (delegatedCapture(event.type) && event[CAPTURE_DISPATCHED] !== true && _delegatedCapture.has(event.type)) {
      dispatchDelegatedCapture(event);
      if (event.cancelBubble) return;
    }
    while (node !== null && node !== void 0) {
      const slot = node[key];
      if (slot) {
        setCurrentTarget(event, node);
        fireEventSlot(slot, event);
        if (event.cancelBubble) return;
      }
      if (targetOnly) return;
      if (node.$$portalParent) {
        node = node.$$portalParent;
      } else {
        node = node.parentNode;
      }
    }
  } finally {
    if (submitRec !== null) {
      ACTIVE_SUBMIT_DISPATCH = prevSubmitRec;
      publishManualFormPending(submitRec);
    }
    clearCurrentTarget(event);
    if (discrete) ACTIVE_DISCRETE_EVENT_DEPTH--;
    _dispatchDepth--;
    maybeFlushDiscrete(event.type);
  }
}
function dispatchDelegatedCapture(event) {
  if (event[CAPTURE_DISPATCHED] === true) return;
  event[CAPTURE_DISPATCHED] = true;
  maybeEnqueueRestore(event);
  const key = CAPTURE_PREFIX + event.type;
  const path = [];
  for (let node = event.target; node !== null && node !== void 0; ) {
    path.push(node);
    node = node.$$portalParent ? node.$$portalParent : node.parentNode;
  }
  _dispatchDepth++;
  const discrete = DISCRETE_EVENTS.has(event.type);
  if (discrete) ACTIVE_DISCRETE_EVENT_DEPTH++;
  try {
    for (let i = path.length - 1; i >= 0; i--) {
      const slot = path[i][key];
      if (slot) {
        setCurrentTarget(event, path[i]);
        fireEventSlot(slot, event);
        if (event.cancelBubble) return;
      }
    }
  } finally {
    clearCurrentTarget(event);
    if (discrete) ACTIVE_DISCRETE_EVENT_DEPTH--;
    _dispatchDepth--;
    finishCaptureDispatch(event);
  }
}
function noop() {
}
function setCurrentTarget(event, node) {
  Object.defineProperty(event, "currentTarget", {
    configurable: true,
    get: () => node
  });
}
function clearCurrentTarget(event) {
  delete event.currentTarget;
}
const IDLE_FORM_STATUS = { pending: false, data: null, method: "get", action: null };
const FORM_STATUS = /* @__PURE__ */ new WeakMap();
const FORM_STATUS_LISTENERS = /* @__PURE__ */ new WeakMap();
function setFormStatus(form, status) {
  FORM_STATUS.set(form, status);
  const ls = FORM_STATUS_LISTENERS.get(form);
  if (ls) for (const l of ls) l();
}
let ACTIVE_SUBMIT_DISPATCH = null;
function publishManualFormPending(rec) {
  if (rec.intercepted || rec.transitions === 0 || !rec.event.defaultPrevented) return;
  const form = rec.form;
  let data = null;
  try {
    data = new FormData(form);
    const submitter = rec.event.submitter;
    if (submitter && submitter.name) data.append(submitter.name, submitter.value ?? "");
  } catch {
  }
  const fa = form;
  fa.$$pendingSubmits = (fa.$$pendingSubmits || 0) + 1;
  rec.published = true;
  setFormStatus(form, {
    pending: true,
    data,
    method: form.method || "get",
    // React reports the form's action PROP here; octane's equivalents are the
    // intercept function ($$formAction) or the plain attribute.
    action: fa.$$formAction ?? form.getAttribute("action")
  });
}
function settleSubmitTransition(rec) {
  rec.transitions--;
  if (rec.transitions !== 0 || !rec.published) return;
  const fa = rec.form;
  fa.$$pendingSubmits = Math.max(0, (fa.$$pendingSubmits || 1) - 1);
  if (fa.$$pendingSubmits === 0) setFormStatus(rec.form, IDLE_FORM_STATUS);
}
let PENDING_FORM_RESETS = null;
function resetFormNow(form) {
  try {
    form.reset();
    reassertControlledIn(form);
  } catch {
  }
}
function requestFormReset(form) {
  if (TRANSITION_DEPTH > 0 || ASYNC_TRANSITION_COUNT > 0) {
    (PENDING_FORM_RESETS ??= /* @__PURE__ */ new Set()).add(form);
    return;
  }
  if (process.env.NODE_ENV !== "production")
    console.error(
      "requestFormReset was called outside a transition or action. To fix, move to an action, or wrap with startTransition."
    );
  resetFormNow(form);
}
function flushFormResets() {
  if (PENDING_FORM_RESETS === null) return;
  if (TRANSITION_DEPTH > 0 || ASYNC_TRANSITION_COUNT > 0) return;
  const forms = PENDING_FORM_RESETS;
  PENDING_FORM_RESETS = null;
  for (const f of forms) resetFormNow(f);
}
function setFormAction(el, name, value, prev) {
  if (typeof value === "function") {
    el.$$formAction = value;
    if (el.nodeName === "FORM") {
      if (!el.$$formSubmitWired) {
        el.$$formSubmitWired = true;
        el.$$submit = (event) => handleFormSubmit(el, event);
        delegateEvents(["submit"]);
      }
    }
    el.removeAttribute(name);
    return;
  }
  el.$$formAction = void 0;
  if (typeof prev === "function" && el.nodeName === "FORM") {
    el.$$submit = void 0;
    el.$$formSubmitWired = false;
  }
  setAttribute(el, name, value);
}
function handleFormSubmit(form, event) {
  const submitter = event.submitter;
  const action = submitter && submitter.$$formAction || form.$$formAction;
  if (typeof action !== "function") return;
  event.preventDefault();
  if (ACTIVE_SUBMIT_DISPATCH !== null && ACTIVE_SUBMIT_DISPATCH.form === form)
    ACTIVE_SUBMIT_DISPATCH.intercepted = true;
  const data = new FormData(form);
  if (submitter && submitter.name) {
    data.append(submitter.name, submitter.value ?? "");
  }
  const fn = action;
  const fa = form;
  fa.$$pendingSubmits = (fa.$$pendingSubmits || 0) + 1;
  setFormStatus(form, { pending: true, data, method: "post", action: fn });
  const isDispatcher = fn.$$isActionDispatcher === true;
  const settle = (ok) => {
    fa.$$pendingSubmits = Math.max(0, (fa.$$pendingSubmits || 1) - 1);
    if (fa.$$pendingSubmits === 0) setFormStatus(form, IDLE_FORM_STATUS);
    if (ok && !isDispatcher) {
      try {
        form.reset();
        reassertControlledIn(form);
      } catch {
      }
    }
  };
  let result;
  try {
    if (isDispatcher) {
      result = fn(data);
    } else {
      startTransition(() => {
        result = fn(data);
        return result;
      });
    }
  } catch (err) {
    settle(false);
    console.error(err);
    return;
  }
  Promise.resolve(result).then(
    () => settle(true),
    () => settle(false)
  );
}
const UNCONTROLLED = /* @__PURE__ */ Symbol("octane.uncontrolled");
const RESTORE_EVENT_LIST = ["input", "change", "click"];
const RESTORE_EVENTS = /* @__PURE__ */ new Set(RESTORE_EVENT_LIST);
let pendingRestores = [];
let restoreMicrotaskScheduled = false;
let pendingSelectInputRestores = [];
let selectInputRestoreScheduled = false;
let SELECT_SYNCS = [];
let SELECT_DEFAULT_SYNCS = [];
let DEV_CTRL_CHECKS = [];
let AUTOFOCUS_QUEUE = [];
function hasControlledSyncs() {
  return SELECT_SYNCS.length > 0 || SELECT_DEFAULT_SYNCS.length > 0 || DEV_CTRL_CHECKS.length > 0 || AUTOFOCUS_QUEUE.length > 0;
}
function setAutoFocus(el, value) {
  if (el.$$afSeen !== void 0) return;
  el.$$afSeen = true;
  if (value) AUTOFOCUS_QUEUE.push(el);
}
function isTextEntry(el) {
  if (el.localName === "textarea") return true;
  if (el.localName !== "input") return false;
  switch (el.type) {
    case "text":
    case "search":
    case "url":
    case "tel":
    case "password":
    case "email":
    case "number":
      return true;
  }
  return false;
}
function onCtrlCompositionStart(e) {
  const ctrl = e.currentTarget.$$ctrl;
  if (ctrl !== void 0) ctrl.composing = true;
}
function onCtrlCompositionEnd(e) {
  const el = e.currentTarget;
  const ctrl = el.$$ctrl;
  if (ctrl === void 0) return;
  ctrl.composing = false;
  if (pendingRestores.indexOf(el) === -1) pendingRestores.push(el);
  if (!restoreMicrotaskScheduled) {
    restoreMicrotaskScheduled = true;
    queueMicrotask(() => {
      restoreMicrotaskScheduled = false;
      if (pendingRestores.length > 0) restoreControlledStates();
    });
  }
}
function armControlledBase(el) {
  let ctrl = el.$$ctrl;
  if (ctrl === void 0) {
    ctrl = {
      v: UNCONTROLLED,
      c: -1,
      sv: null,
      sawV: false,
      sawC: false,
      dvv: UNCONTROLLED,
      composing: false,
      queued: false,
      devChecked: false,
      formSeen: false,
      formDefaultValue: UNCONTROLLED,
      formDefaultChecked: UNCONTROLLED,
      formMultiple: false
    };
    el.$$ctrl = ctrl;
    delegateEvents(RESTORE_EVENT_LIST);
  }
  return ctrl;
}
function armControlled(el) {
  const existing = el.$$ctrl;
  if (existing !== void 0) return existing;
  const ctrl = armControlledBase(el);
  if (isTextEntry(el)) {
    el.addEventListener("compositionstart", onCtrlCompositionStart);
    el.addEventListener("compositionend", onCtrlCompositionEnd);
  }
  return ctrl;
}
function toControlledString(v) {
  return typeof v === "string" ? v : String(v);
}
function valueNeedsWrite(el, raw) {
  if (el.type === "number") {
    return raw === 0 && el.value === "" || el.value != raw;
  }
  return el.value !== toControlledString(raw);
}
function devWarnControlledFlip(el, toControlled) {
  if (process.env.NODE_ENV === "production") return;
  if (el.__oct_loc === void 0) return;
  console.error(
    `A component is changing ${toControlled ? "an uncontrolled" : "a controlled"} ${el.localName} to be ${toControlled ? "controlled" : "uncontrolled"}. This is likely caused by the value changing from ${toControlled ? "undefined to a defined value" : "a defined value to undefined"}, which should not happen. Decide between using a controlled or uncontrolled ${el.localName} for the lifetime of the component (controlled: \`value\`/\`checked\`; uncontrolled: \`defaultValue\`/\`defaultChecked\`).`
  );
}
function queueDevControlledCheck(el, ctrl) {
  if (process.env.NODE_ENV === "production") return;
  if (ctrl.devChecked || el.__oct_loc === void 0) return;
  DEV_CTRL_CHECKS.push(el);
}
function setValue(el, value) {
  const input = el;
  const ctrl = armControlled(el);
  const first = !ctrl.sawV;
  ctrl.sawV = true;
  if (value == null) {
    if (process.env.NODE_ENV !== "production" && !first && ctrl.v !== UNCONTROLLED)
      devWarnControlledFlip(el, false);
    ctrl.v = UNCONTROLLED;
    return;
  }
  const s = toControlledString(value);
  if (first) {
    ctrl.v = value;
    if (process.env.NODE_ENV !== "production") queueDevControlledCheck(el, ctrl);
    const hydration = activeHydration();
    if (hydration !== null && !hydration.isFresh(el)) return;
    if (input.value !== s) input.value = s;
    input.defaultValue = s;
    return;
  }
  if (process.env.NODE_ENV !== "production" && ctrl.v === UNCONTROLLED)
    devWarnControlledFlip(el, true);
  const prev = ctrl.v;
  ctrl.v = value;
  if (input.defaultValue !== s) input.defaultValue = s;
  if (ctrl.composing && Object.is(prev, value)) return;
  if (valueNeedsWrite(input, value)) input.value = s;
}
function setCheckedState(input, value, ctrl) {
  const first = !ctrl.sawC;
  ctrl.sawC = true;
  if (value == null) {
    if (process.env.NODE_ENV !== "production" && !first && ctrl.c !== -1)
      devWarnControlledFlip(input, false);
    ctrl.c = -1;
    return;
  }
  const b = !!value;
  if (first) {
    ctrl.c = b;
    if (process.env.NODE_ENV !== "production") queueDevControlledCheck(input, ctrl);
    const hydration = activeHydration();
    if (hydration !== null && !hydration.isFresh(input)) return;
    if (input.checked !== b) input.checked = b;
    input.defaultChecked = b;
    return;
  }
  if (process.env.NODE_ENV !== "production" && ctrl.c === -1) devWarnControlledFlip(input, true);
  ctrl.c = b;
  if (input.checked !== b) input.checked = b;
}
function setChecked(el, value) {
  setCheckedState(el, value, armControlled(el));
}
function setCheckedCheckable(el, value) {
  setCheckedState(el, value, armControlledBase(el));
}
function setSelectValue(el, value) {
  const sel = el;
  const ctrl = armControlled(el);
  const first = !ctrl.sawV;
  ctrl.sawV = true;
  if (value == null) {
    if (process.env.NODE_ENV !== "production" && !first && ctrl.sv !== null)
      devWarnControlledFlip(el, false);
    ctrl.sv = null;
    return;
  }
  if (process.env.NODE_ENV !== "production" && !first && ctrl.sv === null)
    devWarnControlledFlip(el, true);
  if (first && process.env.NODE_ENV !== "production") queueDevControlledCheck(el, ctrl);
  if (sel.multiple) {
    if (!Array.isArray(value)) {
      if (process.env.NODE_ENV !== "production" && el.__oct_loc !== void 0) {
        console.error(
          "The `value` prop supplied to <select> must be an array if `multiple` is true."
        );
      }
      return;
    }
    const set = /* @__PURE__ */ new Set();
    for (let i = 0; i < value.length; i++) set.add(toControlledString(value[i]));
    ctrl.sv = set;
  } else {
    if (Array.isArray(value)) {
      if (process.env.NODE_ENV !== "production" && el.__oct_loc !== void 0) {
        console.error(
          "The `value` prop supplied to <select> must be a scalar value if `multiple` is false."
        );
      }
      return;
    }
    ctrl.sv = toControlledString(value);
  }
  const hydration = activeHydration();
  if (hydration !== null && !hydration.isFresh(el)) return;
  projectSelectValue(sel, ctrl.sv, false);
  if (!ctrl.queued) {
    ctrl.queued = true;
    SELECT_SYNCS.push(sel);
  }
}
function projectSelectValue(sel, sv, setDefaultSelected) {
  const options = sel.options;
  if (typeof sv !== "string") {
    for (let i = 0; i < options.length; i++) {
      const selected = sv.has(options[i].value);
      if (options[i].selected !== selected) options[i].selected = selected;
      if (setDefaultSelected) options[i].defaultSelected = selected;
    }
    return;
  }
  let defaultOption = null;
  for (let i = 0; i < options.length; i++) {
    if (options[i].value === sv) {
      options[i].selected = true;
      if (setDefaultSelected) options[i].defaultSelected = true;
      return;
    }
    if (defaultOption === null && !options[i].disabled) defaultOption = options[i];
  }
  if (defaultOption !== null) defaultOption.selected = true;
}
function setDefaultValue(el, value) {
  const ctrl = armControlled(el);
  const hydration = activeHydration();
  if (hydration !== null && !hydration.isFresh(el) || value == null) return;
  if (el.localName === "select") {
    if (!Object.is(ctrl.dvv, value)) {
      ctrl.dvv = value;
      SELECT_DEFAULT_SYNCS.push({ el, value });
    }
    return;
  }
  if (ctrl.v !== UNCONTROLLED) return;
  const input = el;
  const s = toControlledString(value);
  if (input.defaultValue !== s) input.defaultValue = s;
}
function setDefaultValueUncontrolled(el, value) {
  const hydration = activeHydration();
  if (hydration !== null && !hydration.isFresh(el) || value == null) return;
  const input = el;
  const s = toControlledString(value);
  if (input.defaultValue !== s) input.defaultValue = s;
}
function setDefaultChecked(el, value) {
  const ctrl = armControlled(el);
  const hydration = activeHydration();
  if (hydration !== null && !hydration.isFresh(el) || value == null) return;
  if (ctrl.c !== -1) return;
  const input = el;
  const b = !!value;
  if (input.defaultChecked !== b) input.defaultChecked = b;
}
function setFormControlSources(el, sources) {
  let value;
  let defaultValue;
  let checked;
  let defaultChecked;
  let multiple;
  const tag = el.localName;
  const assign = (name, next) => {
    switch (name) {
      case "value":
        value = next;
        break;
      case "defaultValue":
        defaultValue = next;
        break;
      case "checked":
        if (tag === "input") checked = next;
        break;
      case "defaultChecked":
        if (tag === "input") defaultChecked = next;
        break;
      case "multiple":
        if (tag === "select") multiple = next;
        break;
    }
  };
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    if (!source[0]) {
      assign(source[1], source[2]);
      continue;
    }
    const spread = source[1];
    if (spread == null || typeof spread !== "object" && typeof spread !== "function") continue;
    const object = Object(spread);
    if (Object.prototype.propertyIsEnumerable.call(object, "value")) assign("value", object.value);
    if (Object.prototype.propertyIsEnumerable.call(object, "defaultValue"))
      assign("defaultValue", object.defaultValue);
    if (tag === "input") {
      if (Object.prototype.propertyIsEnumerable.call(object, "checked"))
        assign("checked", object.checked);
      if (Object.prototype.propertyIsEnumerable.call(object, "defaultChecked"))
        assign("defaultChecked", object.defaultChecked);
    } else if (tag === "select" && Object.prototype.propertyIsEnumerable.call(object, "multiple")) {
      assign("multiple", object.multiple);
    }
  }
  const ctrl = armControlled(el);
  const first = !ctrl.formSeen;
  const previousDefaultValue = ctrl.formDefaultValue;
  const previousDefaultChecked = ctrl.formDefaultChecked;
  const previousMultiple = ctrl.formMultiple;
  ctrl.formSeen = true;
  ctrl.formDefaultValue = defaultValue;
  ctrl.formDefaultChecked = defaultChecked;
  if (tag === "input") {
    const input = el;
    const defaultString = defaultValue == null ? null : toControlledString(defaultValue);
    setValue(input, value);
    if (value == null) {
      if (defaultString !== null) setDefaultValue(input, defaultString);
      else if (!first && previousDefaultValue !== UNCONTROLLED && previousDefaultValue != null)
        input.removeAttribute("value");
    }
    setChecked(input, checked);
    if (checked == null && defaultChecked != null) setDefaultChecked(input, defaultChecked);
    if (!first && defaultChecked == null && previousDefaultChecked !== UNCONTROLLED && previousDefaultChecked != null) {
      input.defaultChecked = false;
    }
    return;
  }
  if (tag === "textarea") {
    const textarea = el;
    setValue(textarea, value);
    if (value == null) {
      if (defaultValue != null) setDefaultValue(textarea, defaultValue);
      else if (!first && textarea.defaultValue !== "") textarea.defaultValue = "";
    }
    return;
  }
  const select = el;
  const multipleType = typeof multiple;
  const nextMultiple = !!multiple && multipleType !== "function" && multipleType !== "symbol";
  ctrl.formMultiple = nextMultiple;
  if (select.multiple !== nextMultiple) select.multiple = nextMultiple;
  if (!first && previousMultiple !== nextMultiple && value == null) {
    if (defaultValue != null) ctrl.dvv = UNCONTROLLED;
    else projectSelectValue(select, nextMultiple ? /* @__PURE__ */ new Set() : "", false);
  }
  setSelectValue(select, value);
  if (defaultValue != null) setDefaultValue(select, defaultValue);
  else ctrl.dvv = UNCONTROLLED;
}
function drainControlledSyncs() {
  if (AUTOFOCUS_QUEUE.length > 0) {
    const q = AUTOFOCUS_QUEUE;
    AUTOFOCUS_QUEUE = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i].isConnected) q[i].focus();
    }
  }
  if (SELECT_DEFAULT_SYNCS.length > 0) {
    const q = SELECT_DEFAULT_SYNCS;
    SELECT_DEFAULT_SYNCS = [];
    for (let i = 0; i < q.length; i++) {
      const sel = q[i].el;
      const ctrl = sel.$$ctrl;
      if (ctrl !== void 0 && ctrl.sv !== null) continue;
      const v = q[i].value;
      const sv = sel.multiple ? Array.isArray(v) ? new Set(v.map(toControlledString)) : null : toControlledString(v);
      if (sv !== null) projectSelectValue(sel, sv, true);
    }
  }
  if (SELECT_SYNCS.length > 0) {
    const q = SELECT_SYNCS;
    SELECT_SYNCS = [];
    for (let i = 0; i < q.length; i++) {
      const ctrl = q[i].$$ctrl;
      if (ctrl === void 0) continue;
      ctrl.queued = false;
      if (ctrl.sv !== null) projectSelectValue(q[i], ctrl.sv, false);
    }
  }
  if (process.env.NODE_ENV !== "production" && DEV_CTRL_CHECKS.length > 0) {
    const q = DEV_CTRL_CHECKS;
    DEV_CTRL_CHECKS = [];
    for (let i = 0; i < q.length; i++) {
      const el = q[i];
      const ctrl = el.$$ctrl;
      if (ctrl === void 0 || ctrl.devChecked) continue;
      ctrl.devChecked = true;
      if (el.readOnly === true || el.disabled === true || el.hasAttribute("readonly") || el.hasAttribute("disabled"))
        continue;
      const hasInput = el.$$input !== void 0 || el["$$capture:input"] !== void 0;
      const hasChange = el.$$change !== void 0 || el["$$capture:change"] !== void 0;
      if (isTextEntry(el)) {
        if (ctrl.v === UNCONTROLLED || hasInput) continue;
        console.error(
          hasChange ? "You provided a `value` prop to a form field with an `onChange` handler but no `onInput`. octane events are NATIVE: `change` fires on blur/commit, not per keystroke, so typing will appear to do nothing (each keystroke reverts to the rendered value). Use `onInput` for per-keystroke updates, or `defaultValue` for an uncontrolled field." : "You provided a `value` prop to a form field without an `onInput` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set either `onInput` or `readOnly`."
        );
        continue;
      }
      if (el.localName === "select") {
        if (ctrl.sv === null || hasInput || hasChange) continue;
        console.error(
          "You provided a `value` prop to a select without an `onInput` or `onChange` handler. This will render a read-only field. Set a usable native handler, `readOnly`, or use `defaultValue` for an uncontrolled field."
        );
        continue;
      }
      const input = el;
      const checkable = input.localName === "input" && (input.type === "checkbox" || input.type === "radio");
      if (!checkable || ctrl.c === -1) continue;
      const hasClick = el.$$click !== void 0 || el["$$capture:click"] !== void 0;
      if (hasClick || hasInput || hasChange) continue;
      console.error(
        "You provided a `checked` prop to a checkbox or radio without an `onClick`, `onInput`, or `onChange` handler. This will render a read-only field. Set a usable native handler, `readOnly`, or use `defaultChecked` for an uncontrolled field."
      );
    }
  }
}
function restoreControlledElement(el) {
  const ctrl = el.$$ctrl;
  if (ctrl === void 0 || ctrl.composing || !el.isConnected) return;
  if (el.localName === "select") {
    if (ctrl.sv !== null) projectSelectValue(el, ctrl.sv, false);
    return;
  }
  if (ctrl.c !== -1) {
    const input = el;
    if (input.checked !== ctrl.c) input.checked = ctrl.c;
    if (input.type === "radio" && input.name !== "") restoreRadioCousins(input);
  }
  if (ctrl.v !== UNCONTROLLED && valueNeedsWrite(el, ctrl.v)) {
    el.value = toControlledString(ctrl.v);
  }
}
function restoreRadioCousins(input) {
  const name = input.name;
  const group = input.form !== null ? input.form.elements : typeof document !== "undefined" ? document.getElementsByName(name) : [];
  for (let i = 0; i < group.length; i++) {
    const other = group[i];
    if (other === input || other.localName !== "input" || other.type !== "radio" || other.name !== name) {
      continue;
    }
    const octrl = other.$$ctrl;
    if (octrl !== void 0 && octrl.c !== -1 && other.checked !== octrl.c) {
      other.checked = octrl.c;
    }
  }
}
function restoreControlledStates() {
  const list = pendingRestores;
  pendingRestores = [];
  for (let i = 0; i < list.length; i++) restoreControlledElement(list[i]);
}
function isControlledHostProp(el, name) {
  switch (name.length) {
    case 5:
      if (name !== "value") return false;
      break;
    case 7:
      if (name !== "checked") return false;
      break;
    default:
      return false;
  }
  const t = el.localName;
  return t === "input" || t === "textarea" || t === "select";
}
function maybeEnqueueRestore(event) {
  const t = event.target;
  if (t === null || t.$$ctrl === void 0 || !RESTORE_EVENTS.has(event.type)) return;
  if (event.type === "click") return;
  if (event.type === "input" && t.localName === "select") {
    if (pendingSelectInputRestores.indexOf(t) === -1) pendingSelectInputRestores.push(t);
    if (!selectInputRestoreScheduled) {
      selectInputRestoreScheduled = true;
      queueMicrotask(() => {
        selectInputRestoreScheduled = false;
        const list = pendingSelectInputRestores;
        pendingSelectInputRestores = [];
        for (let i = 0; i < list.length; i++) restoreControlledElement(list[i]);
      });
    }
    return;
  }
  if (pendingRestores.indexOf(t) === -1) pendingRestores.push(t);
}
function reassertControlledIn(form) {
  const els = form.elements;
  for (let i = 0; i < els.length; i++) {
    if (els[i].$$ctrl !== void 0) {
      restoreControlledElement(els[i]);
    }
  }
}
function portal(parentScope, slotKey, target, body, props, host, env) {
  const prev = parentScope.slots[slotKey];
  const state = renderPortalState(
    prev ?? null,
    parentScope.block,
    target,
    body,
    props,
    // `host` (passed by the compiler) is the JSX element that contains the
    // createPortal call — the natural "logical parent" for event bubbling. When
    // the portal is at top level the compiler passes the block's parentNode.
    host || parentScope.block.parentNode,
    env
  );
  if (prev !== state) {
    parentScope.slots[slotKey] = state;
    registerSlot(parentScope, state);
  }
}
function renderPortalState(prev, parentBlock, target, rawBody, rawProps, host, env) {
  const hydration = activeHydration();
  if (hydration !== null) {
    return hydration.suspend(
      () => renderPortalState(prev, parentBlock, target, rawBody, rawProps, host, env)
    );
  }
  const norm = normalizePortalBody(rawBody, rawProps);
  let state = prev;
  if (state === null || state.target !== target) {
    if (state !== null) teardownPortalState(state);
    const start = document.createComment("portal");
    const end = document.createComment("/portal");
    start.$$portalEnd = end;
    target.appendChild(start);
    target.appendChild(end);
    const block = createBlock(
      "portal",
      parentBlock,
      target,
      start,
      end,
      norm.body,
      norm.props,
      env,
      renderReturnedValue
    );
    if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__) {
      __profileTrackComponent(block, profilePortalComponent(rawBody));
    }
    state = { __kind: "portalSlotSlot", block, target, start, end };
    registerDelegationTarget(target);
    renderBlock(block);
  } else {
    state.block.body = norm.body;
    state.block.props = norm.props;
    state.block.extra = env;
    if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__) {
      __profileTrackComponent(state.block, profilePortalComponent(rawBody));
    }
    renderBlock(state.block);
  }
  let n = state.start.nextSibling;
  while (n !== null && n !== state.end) {
    n.$$portalParent = host;
    n = n.nextSibling;
  }
  return state;
}
function teardownPortalState(state) {
  if (state.block) {
    unmountBlock(state.block, true);
    state.block = null;
  }
  if (state.target) {
    unregisterDelegationTarget(state.target);
    state.target = null;
  }
}
function normalizePortalBody(rawBody, rawProps) {
  if (typeof rawBody === "function") {
    return { body: rawBody, props: rawProps };
  }
  if (rawBody != null && rawBody.$$kind === ELEMENT_TAG && typeof rawBody.type === "function") {
    return {
      body: rawBody.type,
      props: rawBody.props
    };
  }
  return {
    body: genericPortalBody,
    props: rawBody
  };
}
function genericPortalBody(value, scope) {
  childSlot(scope, 0, scope.parentNode, value, scope.endMarker);
}
const PORTAL_TAG = /* @__PURE__ */ Symbol.for("octane.portal");
function createPortal(body, target, props = void 0) {
  return { $$kind: PORTAL_TAG, body, target, props };
}
const ELEMENT_TAG = /* @__PURE__ */ Symbol.for("octane.element");
const KEYED_ELEMENT_DESCRIPTORS = /* @__PURE__ */ new WeakSet();
const ELEMENTS_MISSING_LIST_KEY = /* @__PURE__ */ new WeakSet();
function hasElementConfigKey(config) {
  if (config == null || typeof config !== "object" && typeof config !== "function") return false;
  const own = Object.getOwnPropertyDescriptor(config, "key");
  if (own?.get != null && own.get.isReactWarning) return false;
  return config.key !== void 0;
}
function copyElementConfig(config) {
  const props = {};
  if (config == null) return props;
  for (const name in config) {
    if (name !== "key" && hasOwnProp.call(config, name)) props[name] = config[name];
  }
  return props;
}
function applyElementDefaultProps(type, props) {
  const defaults = type?.defaultProps;
  if (defaults == null) return;
  for (const name in defaults) {
    if (props[name] === void 0) props[name] = defaults[name];
  }
}
function finalizeElementDescriptor(descriptor) {
  if (process.env.NODE_ENV !== "production") {
    Object.freeze(descriptor.props);
    Object.freeze(descriptor);
  }
  return descriptor;
}
function createElement(type, props, ...children) {
  const src = props ?? null;
  const hasKey = hasElementConfigKey(src);
  const key = hasKey ? "" + src.key : null;
  const hasPositional = children.length > 0;
  let kids = hasPositional ? children.length === 1 ? children[0] : children : src?.children;
  if (children.length > 1) {
    POSITIONAL_CHILDREN.add(children);
    if (process.env.NODE_ENV !== "production") Object.freeze(children);
  }
  const keyWasProvided = src != null && (typeof src === "object" || typeof src === "function") && "key" in src;
  const p = copyElementConfig(src);
  if (hasPositional) p.children = kids;
  applyElementDefaultProps(type, p);
  kids = p.children;
  const descriptor = {
    $$kind: ELEMENT_TAG,
    type,
    props: p,
    key,
    ref: p.ref !== void 0 ? p.ref : null,
    children: kids ?? null
  };
  if (keyWasProvided) KEYED_ELEMENT_DESCRIPTORS.add(descriptor);
  return finalizeElementDescriptor(descriptor);
}
function isElementDescriptor(v) {
  return v != null && v.$$kind === ELEMENT_TAG;
}
function isHostDescriptor(v) {
  return v != null && v.$$kind === ELEMENT_TAG && typeof v.type === "string";
}
function isValidElement(v) {
  return isElementDescriptor(v);
}
function cloneElement(element, config, ...children) {
  if (!isElementDescriptor(element)) {
    throw new Error(
      "cloneElement: the first argument must be an element (from createElement / JSX)."
    );
  }
  const props = copyElementConfig(element.props);
  let key = element.key;
  let hasKeyOverride = false;
  if (config != null) {
    hasKeyOverride = hasElementConfigKey(config);
    if (hasKeyOverride) key = "" + config.key;
    for (const name in config) {
      if (name === "key") continue;
      if (name === "ref" && config.ref === void 0) continue;
      if (hasOwnProp.call(config, name)) props[name] = config[name];
    }
  }
  const n = children.length;
  let kids;
  if (n === 1) {
    kids = children[0];
  } else if (n > 1) {
    POSITIONAL_CHILDREN.add(children);
    kids = children;
  } else {
    kids = "children" in props ? props.children : element.children;
  }
  if (n > 0) props.children = kids;
  const descriptor = {
    $$kind: ELEMENT_TAG,
    type: element.type,
    props,
    key,
    ref: props.ref !== void 0 ? props.ref : null,
    children: kids ?? null
  };
  if (KEYED_ELEMENT_DESCRIPTORS.has(element) || config != null && Object.prototype.hasOwnProperty.call(config, "key")) {
    KEYED_ELEMENT_DESCRIPTORS.add(descriptor);
  }
  if (ELEMENTS_MISSING_LIST_KEY.has(element) && !hasKeyOverride) {
    ELEMENTS_MISSING_LIST_KEY.add(descriptor);
  }
  return finalizeElementDescriptor(descriptor);
}
function cloneAndReplaceElementKey(element, key) {
  const descriptor = {
    $$kind: ELEMENT_TAG,
    type: element.type,
    props: element.props,
    key,
    ref: element.ref,
    children: element.children
  };
  KEYED_ELEMENT_DESCRIPTORS.add(descriptor);
  if (ELEMENTS_MISSING_LIST_KEY.has(element)) ELEMENTS_MISSING_LIST_KEY.add(descriptor);
  return finalizeElementDescriptor(descriptor);
}
function escapeElementKey(key) {
  return "$" + key.replace(/[=:]/g, (match) => match === "=" ? "=0" : "=2");
}
function escapeMappedElementKey(key) {
  return key.replace(/\/+/g, "$&/");
}
function childElementKey(child2, index) {
  return child2 != null && typeof child2 === "object" && child2.key != null ? escapeElementKey("" + child2.key) : index.toString(36);
}
function childrenIterator(children) {
  if (children == null || typeof children !== "object") return null;
  const iterator = typeof Symbol === "function" && children[Symbol.iterator] || children["@@iterator"];
  return typeof iterator === "function" ? iterator : null;
}
function resolveChildrenThenable(thenable) {
  if (CURRENT_BLOCK !== null) return useThenable(thenable);
  trackThenable(thenable);
  if (thenable.status === "fulfilled") return thenable.value;
  if (thenable.status === "rejected") throw thenable.reason;
  throw thenable;
}
function describeObjectForError(value) {
  let rendered;
  try {
    rendered = String(value);
  } catch {
    return "object with keys {" + Object.keys(value).join(", ") + "}";
  }
  return rendered === "[object Object]" ? "object with keys {" + Object.keys(value).join(", ") + "}" : rendered;
}
function invalidChildError(child2) {
  const found = describeObjectForError(child2);
  return new Error(
    "Objects are not valid as an Octane child (found: " + found + "). If you meant to render a collection of children, use an array instead."
  );
}
function invalidElementTypeError(type) {
  const found = type === null ? "null" : type === void 0 ? "undefined" : typeof type === "object" ? describeObjectForError(type) : JSON.stringify(type);
  return new Error(
    `Element type is invalid: expected a string (for a built-in element) or a function (for a component), but got: ${found}.`
  );
}
function mapIntoChildren(children, out, escapedPrefix, nameSoFar, callback, validateKey = false) {
  let type = typeof children;
  if (type === "undefined" || type === "boolean") {
    children = null;
    type = "object";
  }
  const isLeaf = children === null || type === "string" || type === "number" || type === "bigint" || isElementDescriptor(children) || children != null && children.$$kind === PORTAL_TAG;
  if (isLeaf) {
    const child2 = children;
    let mapped = callback(child2);
    const childKey = nameSoFar === "" ? "." + childElementKey(child2, 0) : nameSoFar;
    if (Array.isArray(mapped)) {
      mapIntoChildren(mapped, out, escapeMappedElementKey(childKey) + "/", "", (value) => value);
    } else if (mapped != null) {
      if (isElementDescriptor(mapped)) {
        const mappedKey = mapped.key;
        mapped = cloneAndReplaceElementKey(
          mapped,
          escapedPrefix + (mappedKey != null && (!child2 || child2.key !== mappedKey) ? escapeMappedElementKey("" + mappedKey) + "/" : "") + childKey
        );
        if (validateKey && isElementDescriptor(child2) && child2.key == null) {
          ELEMENTS_MISSING_LIST_KEY.add(mapped);
        }
      }
      out.push(mapped);
    }
    return 1;
  }
  let count = 0;
  const nextPrefix = nameSoFar === "" ? "." : nameSoFar + ":";
  if (Array.isArray(children)) {
    const validateItems = validateKey || !POSITIONAL_CHILDREN.has(children);
    for (let i = 0; i < children.length; i++) {
      const child2 = children[i];
      count += mapIntoChildren(
        child2,
        out,
        escapedPrefix,
        nextPrefix + childElementKey(child2, i),
        callback,
        validateItems
      );
    }
    return count;
  }
  const iterator = childrenIterator(children);
  if (iterator !== null) {
    const cursor = iterator.call(children);
    let step;
    let i = 0;
    while (!(step = cursor.next()).done) {
      const child2 = step.value;
      count += mapIntoChildren(
        child2,
        out,
        escapedPrefix,
        nextPrefix + childElementKey(child2, i++),
        callback,
        true
      );
    }
    return count;
  }
  if (type === "object") {
    if (typeof children.then === "function") {
      return mapIntoChildren(
        resolveChildrenThenable(children),
        out,
        escapedPrefix,
        nameSoFar,
        callback,
        validateKey
      );
    }
    throw invalidChildError(children);
  }
  return 0;
}
const Children = {
  /** Iterate children, flattening collections; empties are visited as `null`. */
  forEach(children, fn, context) {
    if (children == null) return;
    let index = 0;
    mapIntoChildren(children, [], "", "", (child2) => {
      fn.call(context, child2, index++);
      return null;
    });
  },
  /** Map children to a flat, React-keyed array; empty results are dropped. */
  map(children, fn, context) {
    if (children == null) return children;
    const out = [];
    let index = 0;
    mapIntoChildren(children, out, "", "", (child2) => fn.call(context, child2, index++));
    return out;
  },
  /** Number of children `map`/`forEach` would visit (empties included, like React). */
  count(children) {
    if (children == null) return 0;
    return mapIntoChildren(children, [], "", "", () => null);
  },
  /** Flatten children into a React-keyed array, dropping empty entries. */
  toArray(children) {
    const out = [];
    if (children != null) mapIntoChildren(children, out, "", "", (child2) => child2);
    return out;
  },
  /** Assert `children` is a single element and return it (`React.Children.only`). */
  only(children) {
    if (!isElementDescriptor(children)) {
      throw new Error("Children.only expected to receive a single element child.");
    }
    return children;
  }
};
const NO_KEY = /* @__PURE__ */ Symbol("NO_KEY");
function componentSlot(parentScope, slotKey, domParent, comp, props, anchor, key, singleRoot, inherit, hasKey) {
  componentSlotImpl(
    renderReturnedValue,
    parentScope,
    slotKey,
    domParent,
    comp,
    props,
    anchor,
    key,
    singleRoot,
    inherit,
    hasKey
  );
}
function componentSlotVoid(parentScope, slotKey, domParent, comp, props, anchor, key, singleRoot, inherit, hasKey) {
  componentSlotImpl(
    null,
    parentScope,
    slotKey,
    domParent,
    comp,
    props,
    anchor,
    key,
    singleRoot,
    inherit,
    hasKey
  );
}
function componentSlotImpl(outputHandler, parentScope, slotKey, domParent, comp, props, anchor, key, singleRoot, inherit, hasKey) {
  if (typeof comp !== "function" && typeof comp !== "string") {
    throw invalidElementTypeError(comp);
  }
  const parentBlock = parentScope.block;
  const hydration = activeHydration();
  if (hydration !== null && (anchor != null && hydration.isFresh(anchor) || hydration.isFresh(domParent))) {
    hydration.suspend(
      () => componentSlotImpl(
        outputHandler,
        parentScope,
        slotKey,
        domParent,
        comp,
        props,
        anchor,
        key,
        singleRoot,
        inherit,
        hasKey
      )
    );
    return;
  }
  let body = comp;
  let renderProps = props;
  if (typeof comp === "string") {
    body = hostStringTagBody;
    renderProps = {
      $$kind: ELEMENT_TAG,
      type: comp,
      props,
      key: null,
      ref: props != null && props.ref !== void 0 ? props.ref : null,
      children: props != null ? props.children : null
    };
  }
  let state = parentScope.slots[slotKey];
  if (state === void 0) {
    let start = null;
    let end = null;
    let inherited = false;
    const rangeBoundary = hydration !== null ? comp[HYDRATION_RANGE_BOUNDARY] : void 0;
    const hydrationPassthrough = hydration?.passthroughRanges === true;
    const hydrationTransparent = hydrationPassthrough && rangeBoundary !== "owner";
    if (hydrationPassthrough && rangeBoundary === "owner") {
      hydration.passthroughRanges = false;
    }
    if (!hydrationTransparent && inherit === true && (comp === Suspense || comp === ErrorBoundary || comp === ViewTransition))
      inherit = false;
    if (hydrationTransparent) {
      inherited = true;
    } else if (inherit === true && parentBlock !== null) {
      const ps = parentBlock.startMarker;
      const pe = parentBlock.endMarker;
      if (ps != null && pe != null && ps !== pe && ps.nodeType === 8 && pe.nodeType === 8) {
        start = ps;
        end = pe;
        inherited = true;
      } else if (ps === null && pe === null) {
        inherited = true;
      }
    }
    let open = null;
    let hydrationCursor = null;
    if (!inherited && hydration !== null && hydration.isOpen(anchor ?? null)) {
      open = anchor;
      hydrationCursor = open;
    } else if (!inherited && hydration !== null && !hydration.isOpen(anchor ?? null)) {
      let c = hydration.node;
      if (c === null || c.parentNode !== domParent) c = domParent.firstChild;
      hydrationCursor = c;
      if (c !== null && hydration.isOpen(c)) open = c;
    }
    if (inherited) {
    } else if (open !== null) {
      start = open;
      end = hydration.close(open);
      if (parentBlock === hydration.rootBlock) hydration.claimRootRemainder(end.nextSibling);
      hydration.node = start.nextSibling;
    } else if (singleRoot === true || singleRoot === 2 && comp.$$singleRoot === true) {
      start = null;
      end = null;
    } else {
      if (hydration !== null) {
        const stale = hydrationCursor;
        const loc = siteLoc(parentScope, slotKey);
        if (process.env.NODE_ENV !== "production" && loc) {
          warnHydrationStructuralMismatch(loc, "a component range", describeHydrationNode(stale));
        }
        let node = stale;
        while (node !== null && node !== anchor && !isBlockClose(node)) {
          const next = node.nextSibling;
          node.remove();
          node = next;
        }
      }
      start = document.createComment("comp");
      end = document.createComment("/comp");
      domParent.insertBefore(start, anchor ?? null);
      domParent.insertBefore(end, anchor ?? null);
      if (hydration !== null) {
        hydration.markFresh(start);
        hydration.markFresh(end);
        hydration.node = end;
      }
    }
    state = {
      __kind: "componentSlotSlot",
      start,
      end,
      anchor: anchor ?? null,
      singleRoot: start === null && !inherited,
      inherited,
      block: null,
      currentComp: null,
      prevKey: NO_KEY,
      keyed: hasKey === true || key !== void 0
    };
    parentScope.slots[slotKey] = state;
    registerSlot(parentScope, state);
  }
  if (hasKey === true || key !== void 0) state.keyed = true;
  if (key !== void 0 && state.prevKey !== NO_KEY && !Object.is(key, state.prevKey)) {
    state.currentComp = null;
  }
  state.prevKey = key === void 0 ? NO_KEY : key;
  if (comp !== state.currentComp) {
    if (state.block !== null && hydration === null && parentBlock.currentRenderMode === "transition") {
      if (!state.singleRoot && !state.inherited && state.end !== null) {
        const r = renderOffscreen(
          parentBlock,
          domParent,
          state.end,
          body,
          renderProps,
          outputHandler
        );
        if (r.suspended || r.error) {
          disposeWip(r.wip);
          if (r.error) throw r.error;
          throw new SuspenseException(r.suspended);
        }
        r.wip.start.data = "comp";
        r.wip.end.data = "/comp";
        unmountBlock(state.block);
        state.start = r.wip.start;
        state.end = r.wip.end;
        state.block = r.wip.block;
        state.currentComp = comp;
        spliceWipCapture(r.wip);
        return;
      }
      const probeAfter = state.end ?? state.anchor;
      if (probeAfter !== null) {
        const r = renderOffscreen(
          parentBlock,
          domParent,
          probeAfter,
          body,
          renderProps,
          outputHandler
        );
        disposeWip(r.wip);
        if (r.error) throw r.error;
        if (r.suspended) throw new SuspenseException(r.suspended);
      }
    }
    if (state.block) {
      if (state.inherited) {
        unmountBlock(state.block);
        if (state.start === null) {
          while (domParent.firstChild) domParent.removeChild(domParent.firstChild);
        }
      } else if (state.singleRoot) {
        unmountBlock(state.block);
      } else {
        const after = state.end.nextSibling;
        unmountBlock(state.block);
        const newStart = document.createComment("comp");
        const newEnd = document.createComment("/comp");
        domParent.insertBefore(newStart, after);
        domParent.insertBefore(newEnd, after);
        state.start = newStart;
        state.end = newEnd;
      }
    }
    state.currentComp = comp;
    if (state.singleRoot) {
      const before = state.anchor ? state.anchor.previousSibling : domParent.lastChild;
      const b = createBlock(
        "dynamic",
        parentBlock,
        domParent,
        null,
        state.anchor,
        body,
        renderProps,
        void 0,
        outputHandler
      );
      if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ && typeof comp === "function")
        profileTrackComponent(b, comp);
      state.block = b;
      try {
        renderBlock(b);
      } finally {
        const last = state.anchor ? state.anchor.previousSibling : domParent.lastChild;
        if (last !== null && last !== before) {
          b.startMarker = last;
          b.endMarker = last;
        }
      }
    } else {
      const b = createBlock(
        "dynamic",
        parentBlock,
        domParent,
        state.start,
        state.end,
        body,
        renderProps,
        void 0,
        outputHandler
      );
      if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ && typeof comp === "function")
        profileTrackComponent(b, comp);
      if (state.inherited) b.exclusiveMarkers = true;
      state.block = b;
      renderBlock(b);
    }
  } else if (state.block) {
    if (tryMemoBail(state.block, comp, props)) return;
    state.block.props = renderProps;
    renderBlock(state.block);
  }
  if (hydration !== null && !state.inherited && state.end !== null)
    hydration.node = state.end.nextSibling;
}
function coerceChildText(v) {
  return v == null || v === false || v === true ? "" : String(v);
}
function renderOffscreen(parentBlock, domParent, afterNode, body, props, outputHandler, kind = "dynamic", env) {
  const start = document.createComment("wip");
  const end = document.createComment("/wip");
  const ref = afterNode.nextSibling;
  domParent.insertBefore(start, ref);
  domParent.insertBefore(end, ref);
  const capture = createOffscreenCapture();
  const prev = WIP_CAPTURE;
  WIP_CAPTURE = capture;
  const block = createBlock(
    kind,
    parentBlock,
    domParent,
    start,
    end,
    body,
    props,
    env,
    outputHandler
  );
  if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ && kind === "dynamic" && body !== hostStringTagBody && body !== hostElementBody)
    profileTrackComponent(block, body);
  let suspended = null;
  let error = null;
  try {
    renderBlock(block);
  } catch (err) {
    if (isSuspenseException(err)) suspended = err.thenable;
    else error = err;
  } finally {
    WIP_CAPTURE = prev;
  }
  return { wip: { block, start, end, capture, domParent }, suspended, error };
}
function spliceOffscreenCapture(capture) {
  for (let p = 0; p < 3; p++) {
    const src = capture.effects[p];
    const target = WIP_CAPTURE !== null ? WIP_CAPTURE.effects[p] : effectQueues[p];
    for (let i = 0; i < src.length; i++) target.push(src[i]);
  }
  const eventTarget = WIP_CAPTURE !== null ? WIP_CAPTURE.events : effectEventQueue;
  for (let i = 0; i < capture.events.length; i++) {
    eventTarget.push(capture.events[i]);
  }
  const eventActionTarget = WIP_CAPTURE !== null ? WIP_CAPTURE.eventActions : effectEventCommitActions;
  for (let i = 0; i < capture.eventActions.length; i++) {
    eventActionTarget.push(capture.eventActions[i]);
  }
  const refTarget = WIP_CAPTURE !== null ? WIP_CAPTURE.refs : refAttachQueue;
  for (let i = 0; i < capture.refs.length; i++) refTarget.push(capture.refs[i]);
  const storeTarget = WIP_CAPTURE !== null ? WIP_CAPTURE.stores : storeSyncQueue;
  for (let i = 0; i < capture.stores.length; i++) storeTarget.push(capture.stores[i]);
}
function spliceWipCapture(wip) {
  spliceOffscreenCapture(wip.capture);
}
function discardOffscreenCapture(capture) {
  if (capture === null) return;
  for (let i = 0; i < capture.stores.length; i++) capture.stores[i].queued = false;
}
function commitOffscreen(wip, beforeNode) {
  const parent = wip.domParent;
  let n = wip.start;
  while (n !== null) {
    const next = n.nextSibling;
    parent.insertBefore(n, beforeNode);
    if (n === wip.end) break;
    n = next;
  }
  spliceWipCapture(wip);
}
function disposeWip(wip) {
  unmountBlock(wip.block, true);
}
function clearChildContent(state) {
  const hadBlock = state.block !== null;
  if (state.block !== null) {
    unmountBlock(state.block, false);
    state.block = null;
  }
  if (state.ownerHost !== null) {
    const host = state.ownerHost;
    let n = host.firstChild;
    while (n !== null) {
      const next = n.nextSibling;
      if (!hadBlock) detachDeoptTreeRefs(n, null);
      host.removeChild(n);
      n = next;
    }
  } else if (state.start !== null) {
    const parent = state.start.parentNode;
    if (parent !== null) {
      let n = state.start.nextSibling;
      while (n !== null && n !== state.end) {
        const next = n.nextSibling;
        if (!hadBlock) detachDeoptTreeRefs(n, null);
        parent.removeChild(n);
        n = next;
      }
    }
  } else if (state.text !== null) {
    state.text.remove();
  } else if (state.hostNode !== null && state.hostNode.parentNode !== null) {
    detachDeoptTreeRefs(state.hostNode, null);
    state.hostNode.parentNode.removeChild(state.hostNode);
  }
  state.text = null;
  state.currentComp = null;
  state.hostNode = null;
}
const DEOPT_KEY_WARNED_BLOCKS = /* @__PURE__ */ new WeakSet();
let DEOPT_KEY_WARNED_WITHOUT_BLOCK = false;
function deoptKey(item, index) {
  const element = item != null && item.$$kind === ELEMENT_TAG;
  if (element && item.key != null && !ELEMENTS_MISSING_LIST_KEY.has(item)) return item.key;
  if (element && process.env.NODE_ENV !== "production" && activeHydration() === null) {
    const owner = CURRENT_BLOCK;
    const warned = owner === null ? DEOPT_KEY_WARNED_WITHOUT_BLOCK : DEOPT_KEY_WARNED_BLOCKS.has(owner);
    if (!warned) {
      if (owner === null) DEOPT_KEY_WARNED_WITHOUT_BLOCK = true;
      else DEOPT_KEY_WARNED_BLOCKS.add(owner);
      console.warn(
        'Octane: each element in an array child should have a unique "key" prop (e.g. `items.map((x) => <li key={x.id}>\u2026</li>)`). Missing keys can reconcile incorrectly on reorder \u2014 for keyed lists prefer `@for (...; key ...)`.'
      );
    }
  }
  return element && item.key != null ? item.key : index;
}
const POSITIONAL_CHILDREN = /* @__PURE__ */ new WeakSet();
function deoptKeyPositional(item, index) {
  return item != null && item.$$kind === ELEMENT_TAG && item.key != null ? item.key : index;
}
function positionalChildren(children) {
  POSITIONAL_CHILDREN.add(children);
  return children;
}
function applyDeoptProp(el, name, v, ownerBlock) {
  if (name === "ref") {
    if (v != null) queueRefAttach(ownerBlock, () => attachRef(v, el));
  } else if (name === "className" || name === "class") {
    setDeoptClass(el, v);
  } else if (name === "style") {
    setStyle(el, v, void 0);
  } else {
    const ev = eventSlot(name);
    if (ev !== null) {
      el[ev.key] = v;
      if (ev.capture) delegateCaptureEvents([ev.type]);
      else delegateEvents([ev.type]);
    } else {
      setAttribute(el, name, v);
    }
  }
}
function hasDangerHTML(props) {
  if (props == null || props.dangerouslySetInnerHTML == null) return false;
  validateDangerouslySetInnerHTMLValue(props.dangerouslySetInnerHTML);
  if (props.children != null) {
    throw dangerHtmlChildrenError();
  }
  return true;
}
function applyDeoptProps(el, props, ownerBlock) {
  if (props == null) return;
  for (const name in props) {
    if (name === "key" || name === "children") continue;
    if (name === "suppressHydrationWarning") {
      el.__oct_suppress = props[name] !== false;
      continue;
    }
    applyDeoptProp(el, name, props[name], ownerBlock);
  }
}
function patchDeoptProps(el, prevProps, nextProps, ownerBlock) {
  const prevRef = prevProps != null ? prevProps.ref : void 0;
  const nextRef = nextProps != null ? nextProps.ref : void 0;
  if (prevRef != null && prevRef !== nextRef) queueRefDetach(prevRef, el);
  if (prevProps != null) {
    for (const name in prevProps) {
      if (name === "key" || name === "children" || name === "ref") continue;
      if (nextProps == null || !(name in nextProps)) removeHostProp(el, name, prevProps[name]);
    }
  }
  if (nextProps != null) {
    for (const name in nextProps) {
      if (name === "key" || name === "children") continue;
      if (name === "suppressHydrationWarning") {
        el.__oct_suppress = nextProps[name] !== false;
        continue;
      }
      const nv = nextProps[name];
      if (prevProps == null || prevProps[name] !== nv || isControlledHostProp(el, name)) {
        if (name === "style") {
          setStyle(el, nv, prevProps != null ? prevProps.style : void 0);
        } else {
          applyDeoptProp(el, name, nv, ownerBlock);
        }
      }
    }
  }
}
function hostComponent(scope, slot, tag, props, childrenBody, anchor) {
  const block = scope.block;
  let state = scope.slots[slot];
  if (state === void 0) {
    const el2 = document.createElement(tag);
    state = { el: el2, anchor: null, ref: void 0 };
    scope.slots[slot] = state;
    const childScope = new ScopeImpl(scope, block);
    state.childScope = childScope;
    scope.children.push({ key: slot, scope: childScope });
    block.parentNode.insertBefore(el2, anchor ?? block.endMarker);
    scope.cleanups.push(() => queueRefDetach(state.ref, state.el));
  }
  const el = state.el;
  applyHostProps(el, props, scope, state);
  if (childrenBody != null) {
    state.latest = childrenBody;
    if (state.body === void 0) {
      state.body = ((...args) => state.latest(...args));
    }
    childSlot(state.childScope, 0, el, state.body, null, false, el);
  }
  return el;
}
function applyHostProps(el, props, scope, state) {
  const prev = state.props;
  if (prev != null) {
    for (const k in prev) {
      if (k === "key" || k === "children") continue;
      if (props != null && k in props) continue;
      if (k === "ref") {
        if (prev.ref != null) {
          queueRefDetach(prev.ref, el);
          if (state.ref === prev.ref) state.ref = void 0;
        }
        continue;
      }
      removeHostProp(el, k, prev[k]);
    }
  }
  state.props = props;
  if (props == null) return;
  for (const name in props) {
    if (name === "key" || name === "children") continue;
    const v = props[name];
    if (name === "suppressHydrationWarning") {
      el.__oct_suppress = v !== false;
      continue;
    }
    if (name === "ref") {
      if (v !== state.ref) {
        if (state.ref != null) queueRefDetach(state.ref, el);
        if (v != null) queueRefAttach(scope, () => attachRef(v, el));
        state.ref = v;
      }
    } else if (name === "className" || name === "class") {
      setDeoptClass(el, v);
    } else if (name === "style") {
      setStyle(el, v, prev != null ? prev.style : void 0);
    } else {
      const ev = eventSlot(name);
      if (ev) {
        if (ev.capture) {
          if (!_delegatedCapture.has(ev.type)) delegateCaptureEvents([ev.type]);
        } else if (!_delegated.has(ev.type)) {
          delegateEvents([ev.type]);
        }
        el[ev.key] = v;
      } else {
        setAttribute(el, name, v);
      }
    }
  }
}
const DEOPT_DESC = /* @__PURE__ */ Symbol("octane.deoptDesc");
function getDeoptDesc(n) {
  return n[DEOPT_DESC];
}
function setDeoptDesc(el, d) {
  el[DEOPT_DESC] = d;
}
function isFragmentDescriptor(value) {
  return isElementDescriptor(value) && value.type === Fragment;
}
function fragmentDescriptorChildren(value) {
  const children = value.children;
  if (children == null) return [];
  return Array.isArray(children) ? children : [children];
}
function deoptWrapperKind(value) {
  return POSITIONAL_CHILDREN.has(value) ? "fragment" : "array";
}
function scopedDeoptKey(path, item, index, key) {
  const explicit = isElementDescriptor(item) && item.key != null;
  return JSON.stringify([path, explicit ? "key" : "index", explicit ? String(key) : index]);
}
function flattenReactChildContainer(outItems, outKeys, children, kind, path) {
  const keyFn = kind === "fragment" ? deoptKeyPositional : deoptKey;
  const count = children.length;
  for (let i = 0; i < count; i++) {
    const item = children[i];
    if (isFragmentDescriptor(item)) {
      const nested = fragmentDescriptorChildren(item);
      if (item.key != null) {
        flattenReactChildContainer(outItems, outKeys, nested, "fragment", [
          ...path,
          "keyed-fragment",
          item.key
        ]);
      } else {
        const nestedPath = kind === "fragment" ? [...path, "wrapper", count === 1 ? 0 : i] : count === 1 ? path : [...path, "position", i, "fragment"];
        flattenReactChildContainer(outItems, outKeys, nested, "fragment", nestedPath);
      }
      continue;
    }
    if (Array.isArray(item)) {
      const nestedKind = deoptWrapperKind(item);
      const nestedPath = nestedKind === kind ? [...path, "wrapper", count === 1 ? 0 : i] : count === 1 ? path : [...path, "position", i, nestedKind];
      flattenReactChildContainer(outItems, outKeys, item, nestedKind, nestedPath);
      continue;
    }
    outItems.push(item);
    outKeys.push(scopedDeoptKey(path, item, i, keyFn(item, i)));
  }
}
function prepareDeoptList(value, forceSingle = false, includeKeyedSingle = true) {
  const items = [];
  const keys = [];
  if (isFragmentDescriptor(value)) {
    const path = value.key == null ? [] : ["keyed-fragment", value.key];
    flattenReactChildContainer(items, keys, fragmentDescriptorChildren(value), "fragment", path);
    return { items, keys };
  }
  if (Array.isArray(value)) {
    flattenReactChildContainer(items, keys, value, deoptWrapperKind(value), []);
    return { items, keys };
  }
  if (includeKeyedSingle && isElementDescriptor(value) && value.key != null) {
    items.push(value);
    keys.push(scopedDeoptKey([], value, 0, value.key));
    return { items, keys };
  }
  if (forceSingle) {
    items.push(value);
    keys.push(scopedDeoptKey([], value, 0, deoptKeyPositional(value, 0)));
    return { items, keys };
  }
  return null;
}
function iterableChildArray(value) {
  if (value == null || typeof value === "string" || Array.isArray(value) || isElementDescriptor(value))
    return null;
  const iterator = childrenIterator(value);
  if (iterator === null) return null;
  const out = [];
  const cursor = iterator.call(value);
  let step;
  while (!(step = cursor.next()).done) out.push(step.value);
  return out;
}
function flattenDeoptChildren(out, v) {
  if (v == null || v === false || v === true || v === "") return;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) flattenDeoptChildren(out, v[i]);
    return;
  }
  out.push(v);
}
function flattenDeoptChildrenKeyed(outVals, outKeys, v, prefix) {
  if (v == null || v === false || v === true || v === "") return;
  if (Array.isArray(v)) {
    const keyForItem = POSITIONAL_CHILDREN.has(v) ? deoptKeyPositional : deoptKey;
    for (let i = 0; i < v.length; i++) {
      const item = v[i];
      if (Array.isArray(item)) {
        flattenDeoptChildrenKeyed(outVals, outKeys, item, prefix + i + ":");
      } else if (item == null || item === false || item === true || item === "") {
      } else {
        outVals.push(item);
        const k = keyForItem(item, i);
        outKeys.push(prefix === "" ? k : prefix + String(k));
      }
    }
    return;
  }
  outVals.push(v);
  outKeys.push(
    prefix === "" ? v?.$$kind === ELEMENT_TAG && v.key != null ? v.key : 0 : prefix + "0"
  );
}
function reconcileDeoptNode(prev, value, ownerBlock, ns) {
  if (value == null || value === false || value === true || value === "") return null;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "bigint") {
    const s = String(value);
    if (prev !== null && prev.nodeType === 3) {
      if (prev.nodeValue !== s) prev.nodeValue = s;
      return prev;
    }
    return document.createTextNode(s);
  }
  if (isHostDescriptor(value)) {
    const elNs = inferTagNs(value.type, ns);
    let el;
    if (prev !== null && prev.nodeType === 1 && prev.localName === value.type && prev.namespaceURI === (elNs ?? HTML_NS)) {
      el = prev;
      patchDeoptProps(el, getDeoptDesc(el)?.props ?? null, value.props, ownerBlock);
    } else {
      el = elNs !== void 0 ? document.createElementNS(elNs, value.type) : document.createElement(value.type);
      activeHydration()?.markFresh(el);
      applyDeoptProps(el, value.props, ownerBlock);
    }
    setDeoptDesc(el, value);
    if (!hasDangerHTML(value.props)) {
      reconcileDeoptChildren(el, value.children, ownerBlock);
    }
    return el;
  }
  if (isElementDescriptor(value)) {
    throw new Error(
      "Octane: internal \u2014 a component descriptor reached the de-opt host reconciler (should have been routed through a Block via hostElementBody/componentSlot)."
    );
  }
  if (t === "object") throw invalidChildError(value);
  return null;
}
function reconcileDeoptChildren(el, children, ownerBlock) {
  const childNs = deoptChildNamespace(el);
  const next = [];
  const nextKeys = [];
  flattenDeoptChildrenKeyed(next, nextKeys, children, "");
  const existing = el.childNodes;
  if (existing.length === 0) {
    for (let i = 0; i < next.length; i++) {
      const node = reconcileDeoptNode(null, next[i], ownerBlock, childNs);
      if (node !== null) {
        node.$$deoptKey = nextKeys[i];
        el.appendChild(node);
      }
    }
    return;
  }
  const owned = [];
  let hasForeign = false;
  let scan = el.firstChild;
  while (scan !== null) {
    const rangeEnd = scan.$$portalEnd;
    if (rangeEnd != null) {
      hasForeign = true;
      scan = nodeAfterPortalRange(scan, rangeEnd);
      continue;
    }
    owned.push(scan);
    scan = scan.nextSibling;
  }
  let byKey = null;
  const unstamped = [];
  for (let i = 0; i < owned.length; i++) {
    const n = owned[i];
    const k = n.$$deoptKey ?? getDeoptDesc(n)?.key;
    if (k != null) {
      if (byKey === null) byKey = /* @__PURE__ */ new Map();
      if (!byKey.has(k)) {
        byKey.set(k, n);
        continue;
      }
    }
    unstamped.push(n);
  }
  let up = 0;
  const result = [];
  for (let i = 0; i < next.length; i++) {
    const child2 = next[i];
    const key = nextKeys[i];
    let prev = null;
    if (byKey !== null) {
      prev = byKey.get(key) ?? null;
      if (prev !== null) byKey.delete(key);
    }
    if (prev === null && up < unstamped.length) prev = unstamped[up++];
    const node = reconcileDeoptNode(prev, child2, ownerBlock, childNs);
    if (node !== null) {
      node.$$deoptKey = key;
      result.push(node);
    }
  }
  const keep = result.length > 0 ? new Set(result) : null;
  for (let i = owned.length - 1; i >= 0; i--) {
    const n = owned[i];
    if (keep === null || !keep.has(n)) {
      detachDeoptTreeRefs(n, null);
      el.removeChild(n);
    }
  }
  for (let i = 0; i < result.length; i++) {
    const want = result[i];
    const at = hasForeign ? liveOwnedChildAt(el, i) : existing[i] ?? null;
    if (at !== want) el.insertBefore(want, at);
  }
}
function nodeAfterPortalRange(start, end) {
  let m = start;
  while (m !== null && m !== end) m = m.nextSibling;
  return (m ?? start).nextSibling;
}
function liveOwnedChildAt(el, index) {
  let i = 0;
  let scan = el.firstChild;
  while (scan !== null) {
    const rangeEnd = scan.$$portalEnd;
    if (rangeEnd != null) {
      scan = nodeAfterPortalRange(scan, rangeEnd);
      continue;
    }
    if (i === index) return scan;
    i++;
    scan = scan.nextSibling;
  }
  return null;
}
function deoptItemBody(item, scope) {
  const block = scope.block;
  const hydration = activeHydration();
  const needsBlocks = descNeedsBlocks(item);
  const sm = block.startMarker;
  if (sm !== null && sm === block.endMarker && sm.nodeType !== 8 && sm.parentNode !== null && (needsBlocks || !isHostDescriptor(item))) {
    const p = sm.parentNode;
    const s = document.createComment("it");
    const e = document.createComment("/it");
    p.insertBefore(s, sm);
    p.insertBefore(e, sm.nextSibling);
    block.startMarker = s;
    block.endMarker = e;
  }
  if (needsBlocks) {
    const stale = block.deoptNode;
    let transfer = null;
    if (stale != null) {
      if (scope.slots[0] === void 0 && stale.nodeType === 1 && isHostDescriptor(item) && stale.localName === item.type && stale.parentNode === block.parentNode) {
        transfer = stale;
      } else if (stale.parentNode === block.parentNode) {
        detachDeoptTreeRefs(stale, null);
        block.parentNode.removeChild(stale);
      }
      block.deoptNode = null;
    }
    if (hydration !== null && scope.slots[0] === void 0 && hydration.isOpen(block.startMarker)) {
      const seeded = {
        __kind: "childSlot",
        start: block.startMarker,
        end: block.endMarker,
        ownerHost: null,
        borrowed: true,
        compactable: false,
        block: null,
        text: null,
        currentComp: null,
        currentIsBodyFn: false,
        forSlot: null,
        hostNode: null,
        portal: null
      };
      scope.slots[0] = seeded;
      registerSlot(scope, seeded);
    }
    if (hydration === null && scope.slots[0] === void 0 && block.startMarker !== null && block.endMarker !== null && block.startMarker !== block.endMarker && block.startMarker.nodeType === 8 && block.endMarker.nodeType === 8) {
      const borrowed = {
        __kind: "childSlot",
        start: block.startMarker,
        end: block.endMarker,
        ownerHost: null,
        borrowed: true,
        compactable: false,
        block: null,
        text: null,
        currentComp: null,
        currentIsBodyFn: false,
        forSlot: null,
        // Pure → Blocks transfer: the raw element becomes the slot's reuse
        // candidate — childSlot's upgrade branch adopts it in place.
        hostNode: transfer,
        portal: null
      };
      scope.slots[0] = borrowed;
      registerSlot(scope, borrowed);
    } else if (transfer !== null && transfer.parentNode !== null) {
      detachDeoptTreeRefs(transfer, null);
      transfer.parentNode.removeChild(transfer);
    }
    childSlot(
      scope,
      0,
      block.parentNode,
      item,
      block.endMarker,
      void 0,
      void 0,
      void 0,
      false
    );
    return;
  }
  if (scope.slots[0] !== void 0 && scope.slots[0] !== null) {
    childSlot(scope, 0, block.parentNode, null, block.endMarker);
  }
  const endM = block.endMarker;
  let prev = block.deoptNode;
  if (prev === null && hydration !== null) {
    const startM = block.startMarker;
    prev = startM != null ? startM.nextSibling : null;
    if (prev === endM) prev = null;
  }
  const node = reconcileDeoptNode(prev, item, block, deoptChildNamespace(block.parentNode));
  if (node !== prev) {
    if (prev != null && prev !== node && prev.parentNode === block.parentNode) {
      if (node !== null) block.parentNode.insertBefore(node, prev);
      detachDeoptTreeRefs(prev, null);
      block.parentNode.removeChild(prev);
    } else if (node !== null) {
      block.parentNode.insertBefore(node, endM);
    }
    if (prev !== null && block.startMarker === prev) {
      block.startMarker = node;
      block.endMarker = node;
    }
  }
  block.deoptNode = node;
}
function descNeedsBlocks(value) {
  if (typeof value === "function") return true;
  if (value == null || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (descNeedsBlocks(value[i])) return true;
    }
    return false;
  }
  if (!isElementDescriptor(value) && childrenIterator(value) !== null) return true;
  if (value.$$kind === ELEMENT_TAG) {
    if (value.type === Fragment) return true;
    return typeof value.type === "function" || descNeedsBlocks(value.children);
  }
  if (value.$$kind === PORTAL_TAG) return true;
  return false;
}
function hostElementBody(d, block) {
  let el = block.deoptNode;
  const hydration = activeHydration();
  const elNs = inferTagNs(d.type, deoptChildNamespace(block.parentNode));
  if (el === null && hydration !== null && hydration.node !== null && hydration.node.nodeType === 1 && hydration.node.localName === d.type && (elNs === void 0 || hydration.node.namespaceURI === elNs)) {
    el = hydration.node;
    block.deoptNode = el;
    applyDeoptProps(el, d.props, block);
    setDeoptDesc(el, d);
    const savedCursor = hydration.node.nextSibling;
    if (!hasDangerHTML(d.props)) {
      hydration.node = el.firstChild;
      childSlot(block, 0, el, d.children, null, false, el);
    }
    hydration.node = savedCursor;
    return;
  }
  if (el === null && hydration !== null && hydration.node !== null) {
    if (process.env.NODE_ENV !== "production") {
      const mmLoc = hydration.node.parentNode?.__oct_loc;
      if (mmLoc)
        hydration.warnStructural(mmLoc, `<${String(d.type)}>`, hydration.describe(hydration.node));
    }
    const stale = hydration.node;
    if (hydration.isOpen(stale)) {
      const close = hydration.close(stale);
      hydration.node = close.nextSibling;
      hydration.removeRange(stale, close);
    } else {
      hydration.node = stale.nextSibling;
      stale.remove();
    }
    el = elNs !== void 0 ? document.createElementNS(elNs, d.type) : document.createElement(d.type);
    hydration.markFresh(el);
    block.deoptNode = el;
    block.parentNode.insertBefore(el, block.endMarker);
    applyDeoptProps(el, d.props, block);
    setDeoptDesc(el, d);
    if (!hasDangerHTML(d.props)) {
      hydration.suspend(() => childSlot(block, 0, el, d.children, null, false, el));
    }
    return;
  }
  if (el === null || el.localName !== d.type || elNs !== void 0 && el.namespaceURI !== elNs) {
    if (el !== null) el.remove();
    el = elNs !== void 0 ? document.createElementNS(elNs, d.type) : document.createElement(d.type);
    if (hydration !== null) hydration.markFresh(el);
    block.deoptNode = el;
    block.parentNode.insertBefore(el, block.endMarker);
    applyDeoptProps(el, d.props, block);
  } else {
    patchDeoptProps(el, getDeoptDesc(el)?.props ?? null, d.props, block);
  }
  setDeoptDesc(el, d);
  if (!hasDangerHTML(d.props)) childSlot(block, 0, el, d.children, null, false, el);
}
function hostStringTagBody(d, block) {
  const tag = d.type;
  let el = block.deoptNode;
  const hydration = activeHydration();
  const elNs = inferTagNs(tag, deoptChildNamespace(block.parentNode));
  if (el === null) {
    if (hydration !== null && hydration.node !== null && hydration.node.nodeType === 1 && hydration.node.localName === tag && (elNs === void 0 || hydration.node.namespaceURI === elNs)) {
      el = hydration.node;
      block.deoptNode = el;
      applyDeoptProps(el, d.props, block);
      setDeoptDesc(el, d);
      const savedCursor = hydration.node.nextSibling;
      if (!hasDangerHTML(d.props)) {
        hydration.node = el.firstChild;
        renderHostTagChildren(d, block, el);
      }
      hydration.node = savedCursor;
      return;
    }
    if (hydration !== null && hydration.node !== null) {
      if (process.env.NODE_ENV !== "production") {
        const mmLoc = hydration.node.parentNode?.__oct_loc;
        if (mmLoc) hydration.warnStructural(mmLoc, `<${tag}>`, hydration.describe(hydration.node));
      }
      const stale = hydration.node;
      if (hydration.isOpen(stale)) {
        const close = hydration.close(stale);
        hydration.node = close.nextSibling;
        hydration.removeRange(stale, close);
      } else {
        hydration.node = stale.nextSibling;
        stale.remove();
      }
      el = elNs !== void 0 ? document.createElementNS(elNs, tag) : document.createElement(tag);
      hydration.markFresh(el);
      block.deoptNode = el;
      block.parentNode.insertBefore(el, block.endMarker);
      applyDeoptProps(el, d.props, block);
      setDeoptDesc(el, d);
      if (!hasDangerHTML(d.props)) {
        hydration.suspend(() => renderHostTagChildren(d, block, el));
      }
      return;
    }
    el = elNs !== void 0 ? document.createElementNS(elNs, tag) : document.createElement(tag);
    if (hydration !== null) hydration.markFresh(el);
    block.deoptNode = el;
    block.parentNode.insertBefore(el, block.endMarker);
    applyDeoptProps(el, d.props, block);
  } else {
    patchDeoptProps(el, getDeoptDesc(el)?.props ?? null, d.props, block);
  }
  setDeoptDesc(el, d);
  if (!hasDangerHTML(d.props)) renderHostTagChildren(d, block, el);
}
function renderHostTagChildren(d, block, el) {
  const kids = d.children;
  if (kids == null) return;
  if (typeof kids === "function") {
    let state = block.slots[0];
    if (state === void 0) {
      const child2 = createBlock(
        "dynamic",
        block,
        el,
        null,
        null,
        kids,
        {},
        void 0,
        renderReturnedValue
      );
      state = { __kind: "hostTagChildrenSlot", block: child2 };
      block.slots[0] = state;
      registerSlot(block, state);
    } else {
      state.block.body = kids;
    }
    renderBlock(state.block);
    return;
  }
  childSlot(block, 1, el, kids, null, false, el);
}
function teardownChildForSlot(state) {
  const fs = state.forSlot;
  batchClearItems(fs, fs.items);
  fs.head = null;
  fs.tail = null;
  fs.size = 0;
  state.forSlot = null;
}
let DEOPT_UPGRADE = null;
function buildDeoptAdoptQueue(oldChildren, start, end) {
  const prepared = prepareDeoptList(oldChildren, true);
  const { items, keys } = prepared;
  const queue = [];
  let cursor = start.nextSibling;
  for (let i = 0; i < items.length; i++) {
    const v = items[i];
    if (v == null || v === false || v === true || v === "") continue;
    if (cursor === null || cursor === end) break;
    const t = typeof v;
    const isText = t === "string" || t === "number" || t === "bigint";
    const compatible = isText ? cursor.nodeType === 3 : isHostDescriptor(v) ? cursor.nodeType === 1 && cursor.localName === v.type : false;
    if (!compatible) break;
    queue.push({ key: keys[i], node: cursor });
    cursor = cursor.nextSibling;
  }
  return queue;
}
function isPortalTarget(block, domParent) {
  for (let current = block; current !== null; current = current.parentBlock) {
    if (current.kind === "portal" && current.parentNode === domParent) return true;
  }
  return false;
}
function childSlot(parentScope, slotKey, domParent, value, anchor, ownEnd, ownsHost, compactable, includeKeyedSingle = true) {
  if (domParent.nodeType === 1 && VOID_ELEMENTS.has(domParent.localName) && !isPortalTarget(parentScope.block, domParent) && value != null) {
    throw new Error(
      `\`<${domParent.localName}>\` is a void element tag and must neither have \`children\` nor use \`dangerouslySetInnerHTML\`.`
    );
  }
  if (dangerouslySetInnerHTMLOwnsChild(domParent, value)) return;
  const parentBlock = parentScope.block;
  const hydration = activeHydration();
  if (hydration !== null && (anchor != null && hydration.isFresh(anchor) || hydration.isFresh(domParent))) {
    hydration.suspend(
      () => childSlot(
        parentScope,
        slotKey,
        domParent,
        value,
        anchor,
        ownEnd,
        ownsHost,
        compactable,
        includeKeyedSingle
      )
    );
    return;
  }
  while (value !== null && (typeof value === "object" || typeof value === "function")) {
    if (value.$$kind === CONTEXT_TAG) {
      value = useContextInternal(value);
      continue;
    }
    if (typeof value.then === "function") {
      value = useThenable(value);
      continue;
    }
    break;
  }
  const valueComponent = typeof value === "function" ? value : isElementDescriptor(value) && typeof value.type === "function" ? value.type : null;
  const hydrationTransparent = hydration?.passthroughRanges === true && valueComponent?.[HYDRATION_RANGE_BOUNDARY] !== "owner";
  const iterable = iterableChildArray(value);
  if (iterable !== null) value = iterable;
  const preparedList = prepareDeoptList(value, false, includeKeyedSingle);
  const pureHost = preparedList === null && isHostDescriptor(value) && !descNeedsBlocks(value);
  let state = parentScope.slots[slotKey];
  const unframedComponentRoot = state === void 0 && hydration !== null && parentBlock === hydration.rootBlock && hydration.node !== null && hydration.node.parentNode === domParent && preparedList === null && isElementDescriptor(value) && typeof value.type === "function" && !hydration.isOpen(anchor ?? null) && !hydration.isOpen(hydration.node);
  if (state === void 0 && hydration !== null && !hydrationTransparent && parentBlock === hydration.rootBlock && !hydration.isOpen(anchor ?? null) && !hydration.isOpen(hydration.node)) {
    const cursor = hydration.node;
    const unframedMatch = value === null || value === "" ? cursor === null : typeof value === "string" && cursor?.nodeType === 3 || unframedComponentRoot;
    if (!unframedMatch) {
      hydration.abandonRoot(
        preparedList === null ? "a renderable root" : "a renderable list range",
        hydration.describe(cursor),
        componentSourceLoc(parentBlock.body)
      );
      childSlot(
        parentScope,
        slotKey,
        domParent,
        value,
        anchor,
        ownEnd,
        ownsHost,
        compactable,
        includeKeyedSingle
      );
      return;
    }
  }
  if (state === void 0) {
    let start;
    let end;
    if (hydrationTransparent) {
      start = null;
      end = null;
    } else if (unframedComponentRoot) {
      [start, end] = hydration.wrapUnframedRoot(hydration.node);
    } else if (hydration !== null && hydration.isOpen(anchor ?? null)) {
      start = anchor;
      end = hydration.close(anchor);
      if (parentBlock === hydration.rootBlock) hydration.claimRootRemainder(end.nextSibling);
      hydration.node = start.nextSibling;
    } else if (hydration !== null && hydration.isOpen(hydration.node)) {
      start = hydration.node;
      end = hydration.close(hydration.node);
      if (parentBlock === hydration.rootBlock) {
        hydration.protectRootAnchor(end);
        hydration.claimRootRemainder(end.nextSibling);
      }
      hydration.node = start.nextSibling;
    } else if (ownEnd && anchor != null) {
      start = null;
      end = anchor;
    } else if (hydration === null && ownsHost !== void 0) {
      start = null;
      end = null;
    } else if (hydration === null && pureHost) {
      start = null;
      end = null;
    } else {
      start = null;
      end = document.createComment("");
      domParent.insertBefore(end, anchor ?? null);
      if (hydration !== null && parentBlock === hydration.rootBlock)
        hydration.protectRootAnchor(end);
    }
    state = {
      __kind: "childSlot",
      start,
      end,
      ownerHost: hydration === null ? ownsHost ?? null : null,
      borrowed: hydrationTransparent,
      compactable: compactable === true,
      block: null,
      text: null,
      currentComp: null,
      currentIsBodyFn: false,
      forSlot: null,
      hostNode: null,
      portal: null
    };
    parentScope.slots[slotKey] = state;
    registerSlot(parentScope, state);
  }
  if (compactable === true) state.compactable = true;
  let upgradeChildren = void 0;
  let upgradeArmed = false;
  if (DEOPT_UPGRADE !== null && DEOPT_UPGRADE.block === parentScope.block && ownsHost !== void 0) {
    upgradeChildren = DEOPT_UPGRADE.children;
    upgradeArmed = true;
    DEOPT_UPGRADE = null;
  }
  if (state.end === null && !pureHost && state.ownerHost === null && !state.borrowed) {
    const start = document.createComment("");
    const end = document.createComment("");
    const host = state.hostNode;
    if (host !== null && host.parentNode !== null) {
      const p = host.parentNode;
      p.insertBefore(start, host);
      p.insertBefore(end, host.nextSibling);
    } else {
      domParent.insertBefore(start, anchor ?? null);
      domParent.insertBefore(end, anchor ?? null);
    }
    state.start = start;
    state.end = end;
  }
  const portalDesc = value != null && value.$$kind === PORTAL_TAG ? value : null;
  if (portalDesc === null && state.portal != null) {
    teardownPortalState(state.portal);
    state.portal = null;
  }
  if (portalDesc !== null) {
    if (state.forSlot !== null) teardownChildForSlot(state);
    if (state.block !== null || state.text !== null || state.hostNode !== null) {
      clearChildContent(state);
    }
    state.portal = renderPortalState(
      state.portal,
      parentBlock,
      portalDesc.target,
      portalDesc.body,
      portalDesc.props,
      // The DOM element containing this hole is the portal's logical parent.
      domParent
    );
    return;
  }
  if (preparedList !== null) {
    if (state.forSlot === null) {
      if (hydration === null && !upgradeArmed) clearChildContent(state);
      if (state.end === null) {
        state.end = document.createComment("");
        domParent.insertBefore(state.end, null);
      }
      if (state.start === null) {
        state.start = document.createComment("");
        domParent.insertBefore(state.start, upgradeArmed ? domParent.firstChild : state.end);
      }
      state.forSlot = {
        __kind: "forBlockSlot",
        start: state.start,
        // Non-null: an anchorless slot was promoted to markers above.
        end: state.end,
        items: /* @__PURE__ */ new Map(),
        head: null,
        tail: null,
        size: 0,
        cachedDeps: null,
        emptyBlock: null,
        env: void 0,
        adopt: null
      };
      if (upgradeArmed) {
        state.forSlot.adopt = buildDeoptAdoptQueue(upgradeChildren, state.start, state.end);
      }
    }
    const { items, keys } = preparedList;
    const getKey = (_item, i) => keys[i];
    reconcileKeyed(parentBlock, state.forSlot, items, getKey, deoptItemBody, false, 2);
    if (state.forSlot.adopt !== null) {
      const leftovers = state.forSlot.adopt;
      for (let i = 0; i < leftovers.length; i++) {
        const n = leftovers[i].node;
        if (n.parentNode !== null) {
          detachDeoptTreeRefs(n, null);
          n.parentNode.removeChild(n);
        }
      }
      state.forSlot.adopt = null;
    }
    return;
  }
  if (state.forSlot !== null) teardownChildForSlot(state);
  if (upgradeArmed && state.hostNode === null && state.block === null) {
    const first = domParent.firstChild;
    if (first !== null && first.nextSibling === null && (first.nodeType === 1 || first.nodeType === 3)) {
      state.hostNode = first;
    } else {
      let n = domParent.firstChild;
      while (n !== null) {
        const next = n.nextSibling;
        detachDeoptTreeRefs(n, null);
        domParent.removeChild(n);
        n = next;
      }
    }
  }
  let comp = null;
  let props = {};
  let isBodyFn = false;
  if (isHostDescriptor(value)) {
    if (pureHost) {
      if (state.block !== null || state.text !== null) clearChildContent(state);
      if (state.end === null) {
        const prev2 = state.hostNode;
        const node2 = reconcileDeoptNode(prev2, value, parentBlock, deoptChildNamespace(domParent));
        if (node2 !== prev2) {
          if (prev2 !== null && prev2.parentNode !== null) {
            if (node2 !== null) prev2.parentNode.insertBefore(node2, prev2);
            detachDeoptTreeRefs(prev2, null);
            prev2.parentNode.removeChild(prev2);
          } else if (node2 !== null) {
            domParent.insertBefore(node2, anchor ?? null);
          }
        }
        state.hostNode = node2;
        return;
      }
      if (state.start === null) {
        state.start = document.createComment("");
        domParent.insertBefore(state.start, state.end);
      }
      let prev = state.hostNode;
      if (prev === null && hydration !== null) {
        prev = state.start.nextSibling;
        if (prev === state.end) prev = null;
      }
      const node = reconcileDeoptNode(prev, value, parentBlock, deoptChildNamespace(domParent));
      if (node !== prev) {
        if (prev != null && prev !== node && prev.parentNode !== null) {
          detachDeoptTreeRefs(prev, null);
          prev.parentNode.removeChild(prev);
        }
        if (node !== null) state.start.parentNode.insertBefore(node, state.end);
      }
      state.hostNode = node;
      return;
    }
    comp = hostElementBody;
    props = value;
  } else if (typeof value === "function") {
    comp = value;
    isBodyFn = true;
  } else if (isElementDescriptor(value)) {
    if (typeof value.type !== "function" && typeof value.type !== "string") {
      throw invalidElementTypeError(value.type);
    }
    comp = value.type;
    props = value.props;
  }
  if (comp !== null) {
    if (isBodyFn && state.block !== null && state.currentIsBodyFn) {
      const taggedChildren = isChildrenBlock(comp);
      const wasImplicitlyArmed = state.block.$$implicitBail;
      if (taggedChildren && !wasImplicitlyArmed) {
        state.block.$$implicitBail = true;
        state.block.memoInChain = true;
      }
      if (wasImplicitlyArmed && taggedChildren && comp === state.currentComp && tryImplicitBail(state.block))
        return;
      state.block.body = comp;
      renderBlock(state.block);
      state.currentComp = comp;
      return;
    }
    if (state.block !== null && comp === state.currentComp) {
      if (tryMemoBail(state.block, comp, props)) return;
      if (props === state.block.props && tryImplicitBail(state.block)) return;
      state.block.props = props;
      renderBlock(state.block);
      return;
    }
    if (state.block !== null && state.end !== null && hydration === null && parentBlock.currentRenderMode === "transition") {
      const r = typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ && isBodyFn && !__profileHasComponentMetadata(comp) ? withProfileComponentOverride(
        comp,
        null,
        () => renderOffscreen(parentBlock, domParent, state.end, comp, props, renderReturnedValue)
      ) : renderOffscreen(parentBlock, domParent, state.end, comp, props, renderReturnedValue);
      if (r.suspended || r.error) {
        disposeWip(r.wip);
        if (r.error) throw r.error;
        throw new SuspenseException(r.suspended);
      }
      if (state.borrowed) {
        disposeWip(r.wip);
      } else {
        clearChildContent(state);
        commitOffscreen(r.wip, state.end);
        state.block = r.wip.block;
        state.currentComp = comp;
        state.currentIsBodyFn = isBodyFn;
        return;
      }
    }
    if (hydration === null && comp === hostElementBody && state.block === null && state.hostNode !== null && state.hostNode.nodeType === 1 && state.hostNode.localName === props.type && state.hostNode.namespaceURI === (inferTagNs(props.type, deoptChildNamespace(domParent)) ?? HTML_NS) && !hasDangerHTML(props.props) && !hasDangerHTML(getDeoptDesc(state.hostNode)?.props ?? null)) {
      const el = state.hostNode;
      state.hostNode = null;
      state.currentComp = comp;
      state.currentIsBodyFn = false;
      const b2 = createBlock(
        "dynamic",
        parentBlock,
        domParent,
        state.start,
        state.end,
        comp,
        props,
        void 0,
        renderReturnedValue
      );
      if (state.borrowed) b2.exclusiveMarkers = true;
      b2.$$implicitBail = true;
      b2.memoInChain = true;
      b2.deoptNode = el;
      state.block = b2;
      DEOPT_UPGRADE = { block: b2, children: getDeoptDesc(el)?.children };
      try {
        renderBlock(b2);
      } finally {
        DEOPT_UPGRADE = null;
      }
      return;
    }
    if (hydration === null) clearChildContent(state);
    state.currentComp = comp;
    state.currentIsBodyFn = isBodyFn;
    if (state.start === null && state.ownerHost === null && !state.borrowed) {
      state.start = document.createComment("");
      domParent.insertBefore(state.start, state.end);
    }
    const b = createBlock(
      "dynamic",
      parentBlock,
      domParent,
      state.start,
      state.end,
      comp,
      props,
      void 0,
      renderReturnedValue
    );
    if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ && comp !== hostElementBody)
      __profileTrackComponent(b, !isBodyFn || __profileHasComponentMetadata(comp) ? comp : null);
    if (state.borrowed) b.exclusiveMarkers = true;
    if (!isBodyFn || isChildrenBlock(comp)) {
      b.$$implicitBail = true;
      b.memoInChain = true;
    }
    state.block = b;
    renderBlock(b);
    if (hydration !== null && !state.borrowed && state.end !== null) {
      hydration.node = state.end.nextSibling;
    }
    return;
  }
  if (value !== null && typeof value === "object") throw invalidChildError(value);
  if (state.block !== null || state.hostNode !== null) clearChildContent(state);
  const str = coerceChildText(value);
  if (str === "") {
    if (state.text !== null) {
      state.text.remove();
      state.text = null;
    }
    return;
  }
  if (state.text !== null) {
    if (state.text.nodeValue !== str) state.text.nodeValue = str;
    return;
  }
  if (hydration !== null) {
    const n = hydration.node;
    if (n !== null && n !== state.end && n.nodeType === 3) {
      state.text = n;
      hydration.node = n.nextSibling;
      if (n.nodeValue !== str) n.nodeValue = str;
      return;
    }
  }
  const tn = document.createTextNode(str);
  domParent.insertBefore(tn, state.end);
  state.text = tn;
}
function textSlot(parentScope, slotKey, domParent, value, anchor, ownEnd, compactable) {
  if (dangerouslySetInnerHTMLOwnsChild(domParent, value)) return;
  const vt = typeof value;
  if (vt === "object" || vt === "function") {
    childSlot(parentScope, slotKey, domParent, value, anchor, ownEnd, void 0, compactable);
    return;
  }
  const state = parentScope.slots[slotKey];
  if (state === void 0 || state.block !== null || state.forSlot !== null || state.hostNode !== null || state.portal !== null) {
    childSlot(parentScope, slotKey, domParent, value, anchor, ownEnd, void 0, compactable);
    return;
  }
  const str = vt === "string" ? value : vt === "boolean" || value == null ? "" : String(value);
  if (state.text !== null) {
    if (state.text.nodeValue !== str) state.text.nodeValue = str;
    return;
  }
  if (str === "") return;
  const tn = document.createTextNode(str);
  domParent.insertBefore(tn, state.end);
  state.text = tn;
}
function textHole(parentScope, slotKey, domParent, value, anchor, ownEnd, compactable) {
  childSlot(parentScope, slotKey, domParent, value, anchor, ownEnd, void 0, compactable);
  const state = parentScope.slots[slotKey];
  return state.block === null && state.forSlot === null && state.hostNode === null ? state.text : null;
}
function childTextHole(parentScope, slotKey, domParent, value, cachedNode) {
  if (domParent.nodeType === 1 && VOID_ELEMENTS.has(domParent.localName) && !isPortalTarget(parentScope.block, domParent) && value != null) {
    throw new Error(
      `\`<${domParent.localName}>\` is a void element tag and must neither have \`children\` nor use \`dangerouslySetInnerHTML\`.`
    );
  }
  if (dangerouslySetInnerHTMLOwnsChild(domParent, value)) return null;
  const vt = typeof value;
  const state = parentScope.slots[slotKey];
  if (state === void 0 && vt !== "object" && vt !== "function") {
    const str = value == null || value === false || value === true ? "" : vt === "string" ? value : String(value);
    if (str === "") {
      if (cachedNode !== null) cachedNode.remove();
      return null;
    }
    if (cachedNode !== null) {
      if (cachedNode.nodeValue !== str) cachedNode.nodeValue = str;
      return cachedNode;
    }
    const hydration2 = activeHydration();
    if (hydration2 !== null) return hydration2.htext(domParent, str, siteLoc(parentScope, slotKey));
    const tn = document.createTextNode(str);
    domParent.appendChild(tn);
    return tn;
  }
  if (state === void 0 && cachedNode !== null) cachedNode.remove();
  const hydration = activeHydration();
  if (hydration !== null && state === void 0) hydration.node = domParent.firstChild;
  childSlot(parentScope, slotKey, domParent, value, null, false, domParent);
  const s = parentScope.slots[slotKey];
  return s.block === null && s.forSlot === null && s.hostNode === null ? s.text : null;
}
function ctxDepsChanged(block) {
  const reads = block.$$ctxReads;
  if (reads === null) return false;
  for (const [ctx, version] of reads) {
    if (ctx.$$version !== version) return true;
  }
  return false;
}
function ctxDirectChanged(block) {
  const direct = block.$$ctxDirect;
  if (direct === null) return false;
  for (const [ctx, version] of direct) {
    if (ctx.$$version !== version) return true;
  }
  return false;
}
function refreshContextConsumers(block) {
  const slots = block._slots;
  if (slots !== null) {
    for (let i = 0, n = slots.length; i < n; i++) {
      const s = slots[i];
      const k = s.__kind;
      if (k === "forBlockSlot") {
        const items = s.items;
        for (const item of items.values()) refreshBlockForContext(item);
        if (s.emptyBlock) refreshBlockForContext(s.emptyBlock);
      } else if (s.block) {
        refreshBlockForContext(s.block);
      } else if (s.__kind === "childSlot" && s.forSlot) {
        const items = s.forSlot.items;
        for (const item of items.values()) refreshBlockForContext(item);
      } else if (s.__kind === "childSlot" && s.portal !== null && s.portal.block !== null) {
        refreshBlockForContext(s.portal.block);
      }
    }
  }
}
function tryMemoBail(block, comp, props) {
  if (comp.__memo !== true) return false;
  if (!block.mounted) return false;
  const compare = comp.__compare;
  const equal = compare ? compare(block.props, props) : shallowEqualProps(block.props, props);
  if (!equal) return false;
  if (ctxDirectChanged(block)) return false;
  if (ctxDepsChanged(block)) refreshContextConsumers(block);
  restampCtxDeps(block);
  if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
    __profileBail(block, comp, "memo-bailout");
  return true;
}
function tryImplicitBail(block) {
  if (block.$$implicitBail !== true) return false;
  if (!block.mounted) return false;
  if (ctxDirectChanged(block)) return false;
  if (ctxDepsChanged(block)) refreshContextConsumers(block);
  restampCtxDeps(block);
  if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
    __profileBail(block, block.body, "implicit-bailout");
  return true;
}
function restampCtxDeps(block) {
  const reads = block.$$ctxReads;
  const direct = block.$$ctxDirect;
  const hasReads = reads !== null && reads.size > 0;
  const hasDirect = direct !== null && direct.size > 0;
  if (!hasReads && !hasDirect) return;
  for (let b = block.parentBlock; b !== null; b = b.parentBlock) {
    if (b.body?.__memo !== true && b.$$implicitBail !== true) continue;
    const m = b.$$ctxReads ??= /* @__PURE__ */ new Map();
    if (hasReads) {
      for (const [ctx, v] of reads) {
        const cur = m.get(ctx);
        if (cur === void 0 || cur === ctx.$$version) m.set(ctx, v);
      }
    }
    if (hasDirect) {
      for (const [ctx, v] of direct) {
        const cur = m.get(ctx);
        if (cur === void 0 || cur === ctx.$$version) m.set(ctx, v);
      }
    }
  }
}
function refreshBlockForContext(block) {
  if (ctxDirectChanged(block)) {
    if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
      __profileSchedule(block, "context");
    renderBlock(block);
  } else if (block.body?.__memo === true || block.$$implicitBail === true) {
    if (ctxDepsChanged(block)) refreshContextConsumers(block);
  } else {
    refreshContextConsumers(block);
  }
}
function compilerCacheContext(scope, slotKey, previous) {
  const current = COMPILER_CACHE_CONTEXT_EPOCH;
  if (previous === void 0 || previous === current) return current;
  const slot = scope.slots[slotKey];
  if (slot === void 0 || slot === null) return current;
  if (slot.__kind === "forBlockSlot") {
    for (const item of slot.items.values()) refreshBlockForContext(item);
    if (slot.emptyBlock) refreshBlockForContext(slot.emptyBlock);
  } else if (slot.block) {
    refreshBlockForContext(slot.block);
  } else if (slot.__kind === "childSlot" && slot.forSlot) {
    for (const item of slot.forSlot.items.values()) refreshBlockForContext(item);
  } else if (slot.__kind === "childSlot" && slot.portal?.block) {
    refreshBlockForContext(slot.portal.block);
  }
  return current;
}
const hasOwnProp = Object.prototype.hasOwnProperty;
const OBJ_PROTO = Object.prototype;
function shallowEqualProps(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  const pa = Object.getPrototypeOf(a);
  const pb = Object.getPrototypeOf(b);
  if (pa !== OBJ_PROTO && pa !== null || pb !== OBJ_PROTO && pb !== null) {
    return shallowEqualPropsExact(a, b);
  }
  let count = 0;
  for (const k in a) {
    const v = a[k];
    if (!Object.is(v, b[k]) || v === void 0 && !hasOwnProp.call(b, k)) return false;
    count++;
  }
  for (const _k in b) count--;
  return count === 0;
}
function shallowEqualPropsExact(a, b) {
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) {
    const k = ka[i];
    if (!hasOwnProp.call(b, k) || !Object.is(a[k], b[k])) return false;
  }
  return true;
}
function memo(component, arePropsEqual) {
  function memoWrapper(props, scope, extra) {
    return component(props, scope, extra);
  }
  memoWrapper.__memo = true;
  Object.defineProperty(memoWrapper, "defaultProps", {
    configurable: true,
    get: () => component.defaultProps,
    set: (value) => {
      component.defaultProps = value;
    }
  });
  if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
    __profileComponentSource(memoWrapper, component);
  if (arePropsEqual) memoWrapper.__compare = arePropsEqual;
  return memoWrapper;
}
const HMR = /* @__PURE__ */ Symbol.for("octane.hmr");
function hmr(fn) {
  const meta = {
    fn,
    liveBlocks: /* @__PURE__ */ new Set(),
    update(incoming) {
      if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
        __profileComponentSource(wrapper, incoming);
      const incomingMeta = incoming[HMR];
      meta.fn = incomingMeta ? incomingMeta.fn : incoming;
      if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
        __profileComponentSource(wrapper, meta.fn);
      wrapper.__warm = meta.fn.__warm;
      const it = meta.liveBlocks.values();
      for (let r = it.next(); !r.done; r = it.next()) {
        const b = r.value;
        if (b.disposed) {
          meta.liveBlocks.delete(b);
          continue;
        }
        b.body = wrapper;
        if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
          __profileSchedule(b, "hmr");
        scheduleRender(b);
      }
    }
  };
  function wrapper(props, scope, extra) {
    const block = scope.block;
    meta.liveBlocks.add(block);
    return meta.fn(props, scope, extra);
  }
  wrapper[HMR] = meta;
  if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
    __profileComponentSource(wrapper, fn);
  if (fn.__warm !== void 0) wrapper.__warm = fn.__warm;
  return wrapper;
}
let TRANSITION_FALLBACK_TIMEOUT_MS = 5e3;
function setTransitionFallbackTimeout(ms) {
  TRANSITION_FALLBACK_TIMEOUT_MS = ms;
}
function getTransitionFallbackTimeout() {
  return TRANSITION_FALLBACK_TIMEOUT_MS;
}
function clearPassthroughTry(state) {
  const visible = state.block;
  const persistent = state.tryBlock;
  if (visible !== null) unmountBlock(visible);
  if (persistent !== null && persistent !== visible) unmountBlock(persistent);
  state.block = null;
  state.tryBlock = null;
}
function mountPassthroughCatch(state, error) {
  clearPassthroughTry(state);
  state.pendingThenable = null;
  state.branch = 0;
  state.err = error;
  if (state.catchBody === null) throw error;
  const block = createBlock(
    "control-flow",
    state.parentBlock,
    state.domParent,
    null,
    null,
    state.catchBody,
    { err: error, reset: () => requestReset(state) },
    state.env
  );
  state.block = block;
  renderBlock(block);
}
function mountPassthroughPending(state, thenable) {
  clearPassthroughTry(state);
  state.branch = 2;
  state.pendingThenable = thenable;
  if (state.pendingBody !== null) {
    const block = createBlock(
      "control-flow",
      state.parentBlock,
      state.domParent,
      null,
      null,
      state.pendingBody,
      void 0,
      state.env
    );
    state.block = block;
    renderBlock(block);
  }
  const retry = () => {
    if (state.pendingThenable !== thenable || state.parentBlock.disposed) return;
    state.pendingThenable = null;
    state.branch = -1;
    scheduleRender(state.parentBlock);
  };
  thenable.then(retry, retry);
}
function renderPassthroughTry(state) {
  if (state.branch === 0 && state.block !== null) {
    state.block.body = state.catchBody;
    state.block.props = { err: state.err, reset: () => requestReset(state) };
    state.block.extra = state.env;
    renderBlock(state.block);
    return;
  }
  if (state.branch === 2) {
    if (state.block !== null && state.pendingBody !== null) {
      state.block.body = state.pendingBody;
      state.block.extra = state.env;
      renderBlock(state.block);
    }
    return;
  }
  let block = state.tryBlock;
  if (block === null || block.disposed) {
    if (state.block !== null) unmountBlock(state.block);
    block = createBlock(
      "control-flow",
      state.parentBlock,
      state.domParent,
      null,
      null,
      state.tryBody,
      void 0,
      state.env
    );
    state.tryBlock = block;
    state.block = block;
    state.branch = 1;
    block.$$tryHandler = (error) => {
      try {
        mountPassthroughCatch(state, error);
      } catch (propagated) {
        const parent = findTryHandler(state.parentBlock);
        if (parent !== null) parent(propagated);
        else console.error(propagated);
      }
    };
    if (!state.propagateSuspense) {
      block.__suspenseHandler = (thenable) => {
        mountPassthroughPending(state, thenable);
      };
    }
  } else {
    block.body = state.tryBody;
    block.extra = state.env;
  }
  try {
    renderBlock(block);
    state.hasResolved = true;
  } catch (error) {
    if (isSuspenseException(error)) {
      if (state.propagateSuspense) throw error;
      mountPassthroughPending(state, error.thenable);
    } else {
      mountPassthroughCatch(state, error);
    }
  }
}
function tryBlock(parentScope, slotKey, domParent, tryBody, catchBody, pendingBody, anchor, env, propagateSuspense = false) {
  const parentBlock = parentScope.block;
  const hydration = activeHydration();
  let state = parentScope.slots[slotKey];
  if (state === void 0) {
    let start;
    let end;
    const passthrough = hydration?.passthroughRanges === true;
    const open = passthrough ? null : hydration?.resolveOpen(anchor ?? null, domParent) ?? null;
    if (passthrough) {
      start = document.createComment("passthrough-try");
      end = document.createComment("/passthrough-try");
    } else if (open !== null) {
      start = open;
      end = hydration.close(open);
    } else {
      start = document.createComment("try");
      end = document.createComment("/try");
      domParent.insertBefore(start, anchor ?? null);
      domParent.insertBefore(end, anchor ?? null);
    }
    const newState = {
      __kind: "trySlotSlot",
      start,
      end,
      branch: -1,
      block: null,
      tryBlock: null,
      savedDom: null,
      tryBody,
      catchBody,
      pendingBody,
      propagateSuspense,
      env,
      hasResolved: false,
      err: null,
      pendingThenable: null,
      stagedCapture: null,
      stagedEffectDeps: null,
      transitionHeld: false,
      transitionTimeoutId: null,
      detachedRefs: null,
      domParent,
      parentBlock,
      idState: parentBlock.idState,
      passthrough
    };
    parentScope.slots[slotKey] = newState;
    registerSlot(parentScope, newState);
    state = newState;
  } else {
    state.tryBody = tryBody;
    state.catchBody = catchBody;
    state.pendingBody = pendingBody;
    state.propagateSuspense = propagateSuspense;
    state.env = env;
  }
  const s = state;
  if (s.passthrough) {
    renderPassthroughTry(s);
    return;
  }
  if (s.branch === 0) {
    s.block.body = s.catchBody;
    s.block.props = { err: s.err, reset: () => requestReset(s) };
    s.block.extra = s.env;
    renderBlock(s.block);
  } else if (s.branch === 2 && s.tryBlock && !s.tryBlock.disposed && s.savedDom) {
    attemptHiddenReveal(s);
    if (s.branch === 2) refreshPendingBody(s);
  } else if (s.branch === 2) {
    mountTry(s);
  } else if (s.branch === 1 && s.tryBlock) {
    s.tryBlock.body = s.tryBody;
    s.tryBlock.extra = s.env;
    try {
      renderBlock(s.tryBlock);
      releaseHeldTransition(s);
      s.pendingThenable = null;
    } catch (err) {
      if (isSuspenseException(err)) {
        if (s.propagateSuspense) throw err;
        handleSuspense(s, err.thenable, s.tryBlock);
      } else switchToCatch(s, err);
    }
  } else {
    mountTry(s);
  }
}
function mountTry(state) {
  const hydration = activeHydration();
  discardOffscreenCapture(state.stagedCapture);
  state.stagedCapture = null;
  state.stagedEffectDeps = null;
  state.detachedRefs = null;
  const oldTry = state.tryBlock;
  if (oldTry) {
    unmountBlock(oldTry);
    state.tryBlock = null;
  }
  if (state.block && state.block !== oldTry) {
    unmountBlock(state.block);
  }
  state.block = null;
  state.savedDom = null;
  state.hasResolved = false;
  state.branch = 1;
  let bStart;
  let bEnd;
  let scopedSeeds = null;
  let hasScopedBoundary = false;
  let adoptCursor = state.start.nextSibling;
  let streamedBoundaryId = null;
  if (hydration !== null && adoptCursor !== null && adoptCursor.nodeType === 8 && adoptCursor.data.startsWith(STREAM_SEED_COMMENT)) {
    hasScopedBoundary = true;
    streamedBoundaryId = adoptCursor.data.slice(STREAM_SEED_COMMENT.length);
    const stash = typeof window !== "undefined" ? window.$OCTS : void 0;
    const raw = stash !== void 0 ? stash[streamedBoundaryId] : void 0;
    if (typeof raw === "string") scopedSeeds = hydration.parseSeeds(raw);
    adoptCursor = adoptCursor.nextSibling;
  } else if (
    // A shell hydrated before its streamed segment swaps still has the
    // template sentinel instead of the seed comment. Its opaque id owns the
    // same boundary namespace even though there are no scoped seeds yet. Octane
    // cannot selectively hydrate that server fallback, so claim the boundary for
    // the client: remove the sentinel and its server-rendered fallback arm before
    // mounting a fresh try/pending block. Leaving either behind would duplicate
    // the fallback and allow a later stream swap to overwrite client-owned DOM.
    hydration !== null && adoptCursor !== null && adoptCursor.nodeType === 1 && adoptCursor.localName === "template" && adoptCursor.hasAttribute(STREAM_BOUNDARY_ATTR)
  ) {
    hasScopedBoundary = true;
    streamedBoundaryId = adoptCursor.getAttribute(STREAM_BOUNDARY_ATTR);
    let stale = adoptCursor;
    while (stale !== null && stale !== state.end) {
      const next = stale.nextSibling;
      stale.remove();
      stale = next;
    }
    adoptCursor = state.end;
    hydration.node = state.end;
  }
  if (streamedBoundaryId !== null) {
    state.idState = {
      prefix: state.parentBlock.idState.prefix + "b" + streamedBoundaryId + "-",
      next: 0
    };
  }
  if (hydration !== null && hydration.isOpen(adoptCursor)) {
    bStart = adoptCursor;
    bEnd = hydration.close(bStart);
    hydration.node = bStart.nextSibling;
  } else {
    scopedSeeds = null;
    bStart = document.createComment("try-b");
    bEnd = document.createComment("/try-b");
    state.domParent.insertBefore(bStart, state.end);
    state.domParent.insertBefore(bEnd, state.end);
  }
  const b = createBlock(
    "control-flow",
    state.parentBlock,
    state.domParent,
    bStart,
    bEnd,
    state.tryBody,
    void 0,
    state.env
  );
  b.idState = state.idState;
  b.__trySlot = state;
  b.$$tryHandler = (err) => switchToCatch(state, err);
  if (!state.propagateSuspense) {
    b.__suspenseHandler = (thenable, sourceBlock) => {
      handleSuspense(state, thenable, sourceBlock);
    };
  }
  state.tryBlock = b;
  state.block = b;
  const prevSeeds = hydration?.seeds ?? null;
  const prevSeedCursor = hydration?.seedCursor ?? 0;
  if (hasScopedBoundary) {
    hydration.seeds = scopedSeeds;
    hydration.seedCursor = 0;
  }
  try {
    renderBlock(b);
    state.hasResolved = true;
  } catch (err) {
    if (isSuspenseException(err)) {
      if (state.propagateSuspense) throw err;
      handleSuspense(state, err.thenable, b);
    } else {
      const adoptServerCatch = hydration?.isRejection(err) === true;
      if (state.tryBlock) {
        unmountBlock(state.tryBlock, !adoptServerCatch);
        state.tryBlock = null;
        state.block = null;
      }
      switchToCatch(
        state,
        err,
        adoptServerCatch ? bStart : void 0,
        adoptServerCatch ? bEnd : void 0
      );
    }
  } finally {
    if (hasScopedBoundary) {
      hydration.seeds = prevSeeds;
      hydration.seedCursor = prevSeedCursor;
    }
  }
}
function softDetachTryBlock(state) {
  if (!state.tryBlock || state.savedDom) return;
  const saved = [];
  const start = state.tryBlock.startMarker;
  const end = state.tryBlock.endMarker;
  const parent = start.parentNode;
  let n = start;
  while (n) {
    const next = n.nextSibling;
    saved.push(n);
    parent.removeChild(n);
    if (n === end) break;
    n = next;
  }
  state.savedDom = saved;
}
function reattachTryBlock(state) {
  if (!state.savedDom) return;
  for (const n of state.savedDom) state.domParent.insertBefore(n, state.end);
  state.savedDom = null;
}
function releaseHeldTransition(state) {
  if (state.transitionHeld) {
    state.transitionHeld = false;
    tickTransitionCount(-1);
  }
  abandonHeldTransition(state);
  if (state.transitionTimeoutId !== null) {
    clearTimeout(state.transitionTimeoutId);
    state.transitionTimeoutId = null;
  }
}
function handleSuspense(state, thenable, sourceBlock) {
  const isTransition = sourceBlock.currentRenderMode === "transition";
  if ((isTransition || state.transitionHeld) && state.hasResolved && state.branch === 1 && state.savedDom === null) {
    if (!state.transitionHeld) {
      state.transitionHeld = true;
      tickTransitionCount(1);
    }
    enterHeldTransition(state);
    if (state.pendingBody !== null && TRANSITION_FALLBACK_TIMEOUT_MS !== Infinity && TRANSITION_FALLBACK_TIMEOUT_MS >= 0 && (state.transitionTimeoutId === null || state.pendingThenable !== thenable)) {
      if (state.transitionTimeoutId !== null) {
        clearTimeout(state.transitionTimeoutId);
        state.transitionTimeoutId = null;
      }
      state.transitionTimeoutId = setTimeout(() => {
        state.transitionTimeoutId = null;
        if (state.pendingThenable === thenable && state.transitionHeld && state.branch === 1) {
          swapToPendingFallback(state);
        }
      }, TRANSITION_FALLBACK_TIMEOUT_MS);
    }
    attachResume(state, thenable);
    return;
  }
  if (!hideTryContentAndMountPending(state)) return;
  attachResume(state, thenable);
}
function hideTryContentAndMountPending(state) {
  const hydration = activeHydration();
  if (hydration !== null && !state.hasResolved && state.tryBlock !== null) {
    const abandonedTry = state.tryBlock;
    unmountBlock(abandonedTry);
    state.tryBlock = null;
    if (state.block === abandonedTry) state.block = null;
    hydration.node = state.end;
  } else {
    softDetachTryBlock(state);
  }
  if (state.tryBlock) {
    deactivateScope(state.tryBlock);
    if (state.detachedRefs === null) {
      state.detachedRefs = [];
      detachSubtreeRefs(state.tryBlock, state.detachedRefs);
    }
    state.tryBlock.inactive = true;
  }
  if (state.block && state.block !== state.tryBlock) {
    unmountBlock(state.block);
  }
  state.block = null;
  state.branch = 2;
  return mountPendingBody(state);
}
function mountPendingBody(state) {
  if (state.pendingBody) {
    const bStart = document.createComment("pend-b");
    const bEnd = document.createComment("/pend-b");
    state.domParent.insertBefore(bStart, state.end);
    state.domParent.insertBefore(bEnd, state.end);
    const b = createBlock(
      "control-flow",
      state.parentBlock,
      state.domParent,
      bStart,
      bEnd,
      state.pendingBody,
      void 0,
      state.env
    );
    b.idState = state.idState;
    b.__trySlot = state;
    state.block = b;
    try {
      renderBlock(b);
    } catch (err) {
      if (state.block) {
        unmountBlock(state.block);
        state.block = null;
      }
      switchToCatch(state, err);
      return false;
    }
  }
  return true;
}
function refreshPendingBody(state) {
  if (state.branch !== 2) return;
  const pendingBlock = state.block !== state.tryBlock ? state.block : null;
  if (state.pendingBody === null) {
    if (pendingBlock) unmountBlock(pendingBlock);
    state.block = null;
    return;
  }
  if (pendingBlock === null) {
    mountPendingBody(state);
    return;
  }
  pendingBlock.body = state.pendingBody;
  pendingBlock.extra = state.env;
  try {
    renderBlock(pendingBlock);
  } catch (err) {
    unmountBlock(pendingBlock);
    state.block = null;
    switchToCatch(state, err);
  }
}
function swapToPendingFallback(state) {
  if (!state.pendingBody || state.branch !== 1 || !state.tryBlock) return;
  hideTryContentAndMountPending(state);
}
function commitResume(state) {
  if (!flushingStagedReveals && vtWouldWrapResume()) {
    vtFlush(() => commitResumeInner(state));
    return;
  }
  commitResumeInner(state);
}
function commitResumeInner(state) {
  const wasHeld = state.transitionHeld;
  if (wasHeld) state.transitionHeld = false;
  HELD_TRANSITIONS.delete(state);
  STAGED_REVEALS.delete(state);
  try {
    if (state.tryBlock && !state.tryBlock.disposed) {
      const stagedCapture = state.stagedCapture;
      state.stagedCapture = null;
      state.stagedEffectDeps = null;
      if (state.savedDom) {
        if (state.block && state.block !== state.tryBlock) {
          unmountBlock(state.block);
          state.block = null;
        }
        reattachTryBlock(state);
      }
      state.block = state.tryBlock;
      state.branch = 1;
      state.tryBlock.body = state.tryBody;
      if (wasHeld) state.tryBlock.pendingMode = "transition";
      state.tryBlock.inactive = false;
      if (stagedCapture !== null) {
        state.tryBlock.pendingMode = null;
        state.tryBlock.pendingDeferred = false;
        if (state.detachedRefs !== null) stagedCapture.refs.length = 0;
        spliceOffscreenCapture(stagedCapture);
        state.hasResolved = true;
      } else {
        const resumeCapture = createOffscreenCapture();
        const effectDeps = snapshotSubtreeEffectDeps(state.tryBlock);
        const previousCapture = WIP_CAPTURE;
        const refDetachCheckpoint = refDetachQueue.length;
        const prevReplay = RESUME_REPLAY;
        RESUME_REPLAY = true;
        WIP_CAPTURE = resumeCapture;
        let didThrow = false;
        let renderError = null;
        try {
          renderBlock(state.tryBlock);
        } catch (err) {
          didThrow = true;
          renderError = err;
        } finally {
          WIP_CAPTURE = previousCapture;
          RESUME_REPLAY = prevReplay;
        }
        if (!didThrow) {
          if (state.detachedRefs !== null) {
            refDetachQueue.splice(refDetachCheckpoint);
            resumeCapture.refs.length = 0;
          }
          spliceOffscreenCapture(resumeCapture);
          state.hasResolved = true;
        } else {
          refDetachQueue.splice(refDetachCheckpoint);
          restoreSubtreeEffectDeps(state.tryBlock, effectDeps);
          discardOffscreenCapture(resumeCapture);
          if (isSuspenseException(renderError)) {
            handleSuspense(state, renderError.thenable, state.tryBlock);
          } else {
            switchToCatch(state, renderError);
          }
        }
      }
      if (state.branch === 1) {
        queueCurrentHiddenRefs(state);
      }
    } else {
      mountTry(state);
    }
    if (!deferringStagedRevealEffects) commitEffects();
  } finally {
    if (wasHeld) tickTransitionCount(-1);
  }
}
function findSuspenseHiddenTry(block) {
  for (let p = block; p !== null; p = p.parentBlock) {
    const slot = p.__trySlot;
    if (slot !== void 0 && slot.tryBlock === p && slot.savedDom !== null) return slot;
  }
  return null;
}
function snapshotSubtreeEffectDeps(scope) {
  const snapshot = /* @__PURE__ */ new Map();
  const visit = (current) => {
    const hooks = current.hooks;
    if (hooks !== null) {
      for (const slot of hooks.values()) {
        const effect = slot;
        if (effect?.effect === true) {
          snapshot.set(effect, effect.deps);
        }
      }
    }
    forEachSubtreeChild(current, visit);
  };
  visit(scope);
  return snapshot;
}
function restoreSubtreeEffectDeps(scope, snapshot) {
  const visit = (current) => {
    const hooks = current.hooks;
    if (hooks !== null) {
      for (const slot of hooks.values()) {
        const effect = slot;
        if (effect?.effect !== true) continue;
        effect.deps = snapshot.has(effect) ? snapshot.get(effect) : void 0;
      }
    }
    forEachSubtreeChild(current, visit);
  };
  visit(scope);
}
function queueCurrentHiddenRefs(state) {
  if (state.detachedRefs === null || state.tryBlock === null) return;
  state.detachedRefs = null;
  const refs = [];
  collectVisibleSubtreeRefs(state.tryBlock, refs);
  for (let i = 0; i < refs.length; i++) {
    const entry = refs[i];
    queueRefAttach(entry.scope, () => attachRef(entry.ref, entry.el));
  }
}
function attemptHiddenReveal(state, scheduledMode) {
  const tryBlock2 = state.tryBlock;
  if (tryBlock2 === null || tryBlock2.disposed || state.savedDom === null) return;
  STAGED_REVEALS.delete(state);
  if (state.stagedCapture !== null) {
    const supersededCapture = state.stagedCapture;
    const supersededEffectDeps = state.stagedEffectDeps;
    state.stagedCapture = null;
    state.stagedEffectDeps = null;
    if (supersededEffectDeps !== null) {
      restoreSubtreeEffectDeps(tryBlock2, supersededEffectDeps);
    }
    discardOffscreenCapture(supersededCapture);
    deactivateScope(tryBlock2);
  }
  reattachTryBlock(state);
  tryBlock2.body = state.tryBody;
  tryBlock2.extra = state.env;
  tryBlock2.inactive = false;
  const retryMode = scheduledMode ?? tryBlock2.pendingMode ?? CURRENT_BLOCK?.currentRenderMode ?? "urgent";
  const stagesHeldTransition = retryMode === "transition" && HELD_TRANSITIONS.has(state);
  const hiddenCapture = createOffscreenCapture();
  const effectDeps = snapshotSubtreeEffectDeps(tryBlock2);
  const previousCapture = WIP_CAPTURE;
  const refDetachCheckpoint = refDetachQueue.length;
  WIP_CAPTURE = hiddenCapture;
  let didThrow = false;
  let thrown = null;
  try {
    renderBlock(tryBlock2);
  } catch (err) {
    didThrow = true;
    thrown = err;
  } finally {
    WIP_CAPTURE = previousCapture;
  }
  refDetachQueue.splice(refDetachCheckpoint);
  hiddenCapture.refs.length = 0;
  if (didThrow) {
    restoreSubtreeEffectDeps(tryBlock2, effectDeps);
    discardOffscreenCapture(hiddenCapture);
    if (isSuspenseException(thrown)) {
      deactivateScope(tryBlock2);
      softDetachTryBlock(state);
      tryBlock2.inactive = true;
      attachResume(state, thrown.thenable);
    } else {
      switchToCatch(state, thrown);
      if (!inFlush && CURRENT_BLOCK === null) commitEffects();
    }
    return;
  }
  if (stagesHeldTransition) {
    state.pendingThenable = null;
    state.stagedCapture = hiddenCapture;
    state.stagedEffectDeps = effectDeps;
    softDetachTryBlock(state);
    tryBlock2.inactive = true;
    STAGED_REVEALS.add(state);
    queueMicrotask(flushStagedRevealsIfReady);
    return;
  }
  try {
    if (state.block !== null && state.block !== tryBlock2) {
      unmountBlock(state.block);
    }
    state.block = tryBlock2;
    state.branch = 1;
    state.hasResolved = true;
    state.pendingThenable = null;
    spliceOffscreenCapture(hiddenCapture);
    queueCurrentHiddenRefs(state);
    if (state.transitionTimeoutId !== null) {
      clearTimeout(state.transitionTimeoutId);
      state.transitionTimeoutId = null;
    }
    if (state.transitionHeld) {
      state.transitionHeld = false;
      tickTransitionCount(-1);
    }
    if (HELD_TRANSITIONS.has(state)) {
      HELD_TRANSITIONS.delete(state);
      STAGED_REVEALS.delete(state);
      queueMicrotask(flushStagedRevealsIfReady);
    }
  } catch (err) {
    switchToCatch(state, err);
  }
}
function enterHeldTransition(state) {
  HELD_TRANSITIONS.add(state);
  STAGED_REVEALS.delete(state);
}
function abandonHeldTransition(state) {
  if (!HELD_TRANSITIONS.has(state)) return;
  HELD_TRANSITIONS.delete(state);
  STAGED_REVEALS.delete(state);
  flushStagedRevealsIfReady();
}
function flushStagedRevealsIfReady() {
  for (const state of STAGED_REVEALS) {
    if (!HELD_TRANSITIONS.has(state)) STAGED_REVEALS.delete(state);
  }
  if (STAGED_REVEALS.size === 0 || STAGED_REVEALS.size !== HELD_TRANSITIONS.size) return;
  for (const state of HELD_TRANSITIONS) {
    if (!STAGED_REVEALS.has(state)) return;
  }
  flushStagedReveals();
}
function compareStagedRevealDomOrder(a, b) {
  if (a === b) return 0;
  const position = a.start.compareDocumentPosition(b.start);
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}
function rebaseOffscreenCaptureSeq(capture) {
  const effects = capture.effects[INSERTION].concat(
    capture.effects[LAYOUT],
    capture.effects[PASSIVE]
  ).sort((a, b) => a.seq - b.seq);
  for (let i = 0; i < effects.length; i++) effects[i].seq = commitSeq++;
  const refs = capture.refs.slice().sort((a, b) => a.seq - b.seq);
  for (let i = 0; i < refs.length; i++) refs[i].seq = commitSeq++;
}
function flushStagedReveals() {
  if (flushingStagedReveals) return;
  flushingStagedReveals = true;
  try {
    const run = () => {
      const batch = [...STAGED_REVEALS];
      STAGED_REVEALS.clear();
      const deferEffects = batch.every((state) => state.stagedCapture !== null);
      if (deferEffects) {
        batch.sort(compareStagedRevealDomOrder);
        for (const state of batch) rebaseOffscreenCaptureSeq(state.stagedCapture);
      }
      const previousDeferral = deferringStagedRevealEffects;
      deferringStagedRevealEffects = deferEffects;
      try {
        for (const s of batch) {
          if (s.tryBlock !== null && s.tryBlock.disposed) continue;
          commitResume(s);
        }
      } finally {
        deferringStagedRevealEffects = previousDeferral;
        if (deferEffects) {
          commitEffects();
        }
      }
    };
    if (vtWouldWrapResume()) vtFlush(run);
    else run();
  } finally {
    flushingStagedReveals = false;
  }
}
function attachResume(state, thenable) {
  if (state.pendingThenable === thenable) return;
  state.pendingThenable = thenable;
  const retry = () => {
    if (state.pendingThenable !== thenable) return;
    state.pendingThenable = null;
    if (state.transitionTimeoutId !== null) {
      clearTimeout(state.transitionTimeoutId);
      state.transitionTimeoutId = null;
    }
    if (HELD_TRANSITIONS.has(state)) {
      if (state.savedDom !== null) {
        attemptHiddenReveal(state, "transition");
        return;
      }
      STAGED_REVEALS.add(state);
      if (STAGED_REVEALS.size < HELD_TRANSITIONS.size) return;
      flushStagedReveals();
      return;
    }
    commitResume(state);
  };
  thenable.then(retry, retry);
}
function startTransition(fn) {
  TRANSITION_DEPTH++;
  const parentActionBatch = ACTIVE_TRANSITION_ACTION_BATCH;
  const pendingActionBatch = IN_FLIGHT_TRANSITION_ACTION_BATCH;
  const actionBatch = parentActionBatch ?? pendingActionBatch ?? createTransitionActionBatch();
  const ownsActionBatch = parentActionBatch === null && pendingActionBatch === null;
  ACTIVE_TRANSITION_ACTION_BATCH = actionBatch;
  const submitRec = ACTIVE_SUBMIT_DISPATCH;
  if (submitRec !== null) submitRec.transitions++;
  let result;
  try {
    tickTransitionCount(1);
    try {
      result = fn();
      if (result != null && typeof result.then === "function") {
        actionBatch.pendingActions++;
        IN_FLIGHT_TRANSITION_ACTION_BATCH = actionBatch;
      }
      if (ownsActionBatch) {
        actionBatch.closed = true;
        flushTransitionActionBatchIfReady(actionBatch);
      }
    } catch (error) {
      if (ownsActionBatch) {
        actionBatch.closed = true;
        flushTransitionActionBatchIfReady(actionBatch);
      }
      throw error;
    } finally {
      ACTIVE_TRANSITION_ACTION_BATCH = parentActionBatch;
      TRANSITION_DEPTH--;
    }
  } catch (err) {
    tickTransitionCount(-1);
    if (submitRec !== null) settleSubmitTransition(submitRec);
    flushFormResets();
    throw err;
  }
  if (result != null && typeof result.then === "function") {
    ASYNC_TRANSITION_COUNT++;
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      actionBatch.pendingActions--;
      flushTransitionActionBatchIfReady(actionBatch);
      tickTransitionCount(-1);
      ASYNC_TRANSITION_COUNT--;
      if (submitRec !== null) settleSubmitTransition(submitRec);
      flushFormResets();
    };
    result.then(settle, settle);
  } else {
    queueMicrotask(() => {
      tickTransitionCount(-1);
      if (submitRec !== null) settleSubmitTransition(submitRec);
      flushFormResets();
    });
  }
}
function useTransition(slot) {
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useTransition");
  const scope = CURRENT_SCOPE;
  const block = CURRENT_BLOCK;
  let s = scope.hooks?.get(slot);
  if (s === void 0) {
    const slotRef = { isPending: false, start: startTransition };
    s = slotRef;
    ensureHooks(scope).set(slot, slotRef);
    const listener = () => {
      const next = TRANSITION_PENDING_COUNT > 0;
      if (slotRef.isPending !== next) {
        slotRef.isPending = next;
        if (!block.disposed) {
          if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
            __profileSchedule(block, "transition-pending", slot);
          scheduleRender(block);
        }
      }
    };
    TRANSITION_LISTENERS.add(listener);
    scope.cleanups.push(() => TRANSITION_LISTENERS.delete(listener));
  }
  return [s.isPending, s.start];
}
function useActionState(action, initialState, permalinkOrSlot, slot) {
  if (typeof permalinkOrSlot === "symbol") slot = permalinkOrSlot;
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useActionState");
  const scope = CURRENT_SCOPE;
  const block = CURRENT_BLOCK;
  let s = scope.hooks?.get(slot);
  if (s === void 0) {
    const slotRef = {
      state: initialState,
      isPending: false,
      pendingCount: 0,
      chain: Promise.resolve(initialState),
      action,
      dispatch: void 0
    };
    const setPending = (next) => {
      if (slotRef.isPending !== next) {
        slotRef.isPending = next;
        if (!block.disposed) {
          if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
            __profileSchedule(block, "action-state-pending", slot);
          scheduleRender(block);
        }
      }
    };
    const dispatch = ((payload) => {
      slotRef.pendingCount++;
      setPending(true);
      slotRef.chain = slotRef.chain.then(
        (prevState) => new Promise((resolveResult) => {
          const finish = () => {
            slotRef.pendingCount--;
            if (slotRef.pendingCount === 0) setPending(false);
          };
          startTransition(() => {
            let p;
            try {
              p = Promise.resolve(slotRef.action(prevState, payload));
            } catch (err) {
              finish();
              const handler = findTryHandler(block);
              if (handler) handler(err);
              else console.error(err);
              resolveResult(prevState);
              return;
            }
            p.then(
              (result) => {
                slotRef.state = result;
                finish();
                if (!block.disposed) {
                  if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
                    __profileSchedule(block, "action-state", slot);
                  scheduleRender(block);
                }
                resolveResult(result);
              },
              (err) => {
                finish();
                const handler = findTryHandler(block);
                if (handler) handler(err);
                else console.error(err);
                resolveResult(prevState);
              }
            );
            return p;
          });
        })
      );
      return slotRef.chain;
    });
    dispatch.$$isActionDispatcher = true;
    slotRef.dispatch = dispatch;
    s = slotRef;
    ensureHooks(scope).set(slot, slotRef);
  }
  s.action = action;
  return [s.state, s.dispatch, s.isPending];
}
function findAncestorForm(block) {
  let n = block.startMarker ?? block.parentNode ?? null;
  while (n) {
    if (n.nodeName === "FORM") return n;
    n = n.parentNode;
  }
  return null;
}
function useFormStatus(slot) {
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useFormStatus");
  const scope = CURRENT_SCOPE;
  const block = CURRENT_BLOCK;
  let s = scope.hooks?.get(slot);
  if (s === void 0) {
    s = { form: null, listener: null };
    const slotRef = s;
    ensureHooks(scope).set(slot, slotRef);
    scope.cleanups.push(() => {
      if (slotRef.form && slotRef.listener)
        FORM_STATUS_LISTENERS.get(slotRef.form)?.delete(slotRef.listener);
    });
  }
  const form = findAncestorForm(block);
  if (form !== s.form) {
    if (s.form && s.listener) FORM_STATUS_LISTENERS.get(s.form)?.delete(s.listener);
    s.form = form;
    if (form) {
      const listener = () => {
        if (!block.disposed) {
          if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
            __profileSchedule(block, "form-status", slot);
          scheduleRender(block);
        }
      };
      s.listener = listener;
      let set = FORM_STATUS_LISTENERS.get(form);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        FORM_STATUS_LISTENERS.set(form, set);
      }
      set.add(listener);
    } else {
      s.listener = null;
    }
  }
  return s.form ? FORM_STATUS.get(s.form) ?? IDLE_FORM_STATUS : IDLE_FORM_STATUS;
}
function useOptimistic(passthrough, updateFnOrSlot, slot) {
  let updateFn;
  if (typeof updateFnOrSlot === "symbol") slot = updateFnOrSlot;
  else updateFn = updateFnOrSlot;
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useOptimistic");
  const scope = CURRENT_SCOPE;
  const block = CURRENT_BLOCK;
  let s = scope.hooks?.get(slot);
  if (s === void 0) {
    const clear = () => {
      slotRef.armed = false;
      if (slotRef.queue.length > 0) {
        slotRef.queue.length = 0;
        if (!block.disposed) {
          if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
            __profileSchedule(block, "optimistic-revert", slot);
          scheduleRender(block);
        }
      }
    };
    const slotRef = {
      queue: [],
      updateFn,
      armed: false,
      add: (value) => {
        slotRef.queue.push(value);
        if (TRANSITION_PENDING_COUNT > 0) {
          slotRef.armed = true;
        } else {
          queueMicrotask(clear);
        }
        if (!block.disposed) {
          if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
            __profileSchedule(block, "optimistic", slot);
          scheduleRender(block);
        }
      }
    };
    s = slotRef;
    ensureHooks(scope).set(slot, slotRef);
    const listener = () => {
      if (TRANSITION_PENDING_COUNT === 0 && slotRef.armed) clear();
    };
    TRANSITION_LISTENERS.add(listener);
    scope.cleanups.push(() => TRANSITION_LISTENERS.delete(listener));
  }
  s.updateFn = updateFn;
  let optimistic = passthrough;
  for (let i = 0; i < s.queue.length; i++) {
    optimistic = s.updateFn ? s.updateFn(optimistic, s.queue[i]) : s.queue[i];
  }
  return [optimistic, s.add];
}
function spawnDeferredSwap(s) {
  s.scheduled = true;
  queueMicrotask(() => {
    if (!s.scheduled || s.block.disposed) return;
    s.scheduled = false;
    if (Object.is(s.current, s.next)) return;
    s.current = s.next;
    startTransition(() => {
      DEFERRED_SPAWN = true;
      try {
        if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__) {
          __profileSchedule(s.block, "deferred-value", s.profileSlot);
          scheduleRender(s.block);
        } else scheduleRender(s.block);
      } finally {
        DEFERRED_SPAWN = false;
      }
    });
  });
}
function useDeferredValue(value, ...rest) {
  let slot = rest[rest.length - 1];
  slot = resolveSlot(slot);
  if (slot === void 0) missingSlot("useDeferredValue");
  const initialValue = rest.length >= 2 ? rest[0] : void 0;
  const hasInitial = rest.length >= 2;
  const scope = CURRENT_SCOPE;
  const block = CURRENT_BLOCK;
  const hidden = inInactiveSubtree(block);
  let s = scope.hooks?.get(slot);
  if (s === void 0) {
    if (hasInitial && !block.currentRenderDeferred) {
      s = {
        current: initialValue,
        next: value,
        scheduled: false,
        block,
        wasHidden: hidden
      };
      if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
        s.profileSlot = slot;
      ensureHooks(scope).set(slot, s);
      if (!Object.is(initialValue, value)) spawnDeferredSwap(s);
      return initialValue;
    }
    s = { current: value, next: value, scheduled: false, block, wasHidden: hidden };
    if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
      s.profileSlot = slot;
    ensureHooks(scope).set(slot, s);
    return value;
  }
  s.next = value;
  const wasHidden = s.wasHidden;
  s.wasHidden = hidden;
  if (Object.is(s.current, value)) return s.current;
  if (hidden || wasHidden) {
    if (hasInitial && !block.currentRenderDeferred && !Object.is(initialValue, value)) {
      s.current = initialValue;
      if (!s.scheduled) spawnDeferredSwap(s);
      return initialValue;
    }
    s.current = value;
    return value;
  }
  if (block.currentRenderMode === "transition") {
    s.current = value;
    return value;
  }
  if (!s.scheduled) spawnDeferredSwap(s);
  return s.current;
}
function requestReset(state) {
  state.branch = -1;
  state.err = null;
  state.hasResolved = false;
  state.detachedRefs = null;
  if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__ && !state.parentBlock.disposed)
    __profileSchedule(state.parentBlock, "error-boundary-reset");
  scheduleRender(state.parentBlock);
}
function switchToCatch(state, err, adoptedStart, adoptedEnd) {
  const hydration = activeHydration();
  discardOffscreenCapture(state.stagedCapture);
  state.stagedCapture = null;
  state.stagedEffectDeps = null;
  state.detachedRefs = null;
  if (state.transitionTimeoutId !== null) {
    clearTimeout(state.transitionTimeoutId);
    state.transitionTimeoutId = null;
  }
  const oldTry = state.tryBlock;
  if (oldTry) {
    unmountBlock(oldTry);
    state.tryBlock = null;
  }
  if (state.savedDom) {
    state.savedDom = null;
  }
  if (state.block && state.block !== oldTry) {
    unmountBlock(state.block);
  }
  state.block = null;
  state.hasResolved = false;
  state.pendingThenable = null;
  if (state.transitionHeld) {
    state.transitionHeld = false;
    tickTransitionCount(-1);
  }
  abandonHeldTransition(state);
  if (state.catchBody === null) {
    if (CURRENT_BLOCK !== null) {
      throw err;
    }
    const parent = findTryHandler(state.parentBlock);
    if (parent) parent(err);
    else console.error("tryBlock with no catch arm received error:", err);
    return;
  }
  const hydrationRejection = hydration?.isRejection(err) === true;
  const caughtError = hydrationRejection ? err.reason : err;
  state.branch = 0;
  state.err = caughtError;
  const adopting = adoptedStart !== void 0 && adoptedEnd !== void 0;
  const bStart = adoptedStart ?? document.createComment("catch-b");
  const bEnd = adoptedEnd ?? document.createComment("/catch-b");
  if (!adopting) {
    if (hydration !== null) {
      if (hydration.isClose(state.end)) {
        removeRange(state.start.nextSibling, state.end);
        hydration.node = state.end;
      }
      hydration.markFresh(bStart);
      hydration.markFresh(bEnd);
    }
    state.domParent.insertBefore(bStart, state.end);
    state.domParent.insertBefore(bEnd, state.end);
  } else if (hydration !== null) {
    hydration.node = bStart.nextSibling;
  }
  const reset = () => requestReset(state);
  const b = createBlock(
    "control-flow",
    state.parentBlock,
    state.domParent,
    bStart,
    bEnd,
    state.catchBody,
    { err: caughtError, reset },
    state.env
  );
  b.idState = state.idState;
  state.block = b;
  try {
    if (!adopting && hydration !== null) hydration.suspend(() => renderBlock(b));
    else renderBlock(b);
  } catch (e2) {
    const rethrowsHydrationReason = hydrationRejection && Object.is(e2, caughtError);
    const preserveAdoptedRange = adopting && rethrowsHydrationReason;
    if (state.block) {
      unmountBlock(state.block, !preserveAdoptedRange);
      state.block = null;
    }
    const propagated = rethrowsHydrationReason ? err : e2;
    if (CURRENT_BLOCK !== null && (rethrowsHydrationReason || findTryHandler(state.parentBlock) !== null))
      throw propagated;
    const parent = findTryHandler(state.parentBlock);
    if (parent) parent(propagated);
    else console.error("catch body threw, no outer tryBlock:", e2);
  }
}
function findTryHandler(block) {
  const origin = block;
  let b = block;
  while (b) {
    const h = b.$$tryHandler;
    if (h) return h;
    b = b.parentBlock;
  }
  return rendererRegionTryHandler(origin);
}
function handleRenderError(block, err) {
  if (isSuspenseException(err)) {
    let b = block;
    while (b) {
      const h2 = b.__suspenseHandler;
      if (h2) {
        h2(err.thenable, block);
        return;
      }
      b = b.parentBlock;
    }
    const external = rendererRegionSuspenseHandler(block);
    if (external !== null) {
      external(err.thenable);
      return;
    }
    throw err;
  }
  const h = findTryHandler(block);
  if (h) h(err);
  else throw err;
}
function replaceSharedBlockBoundary(parent, oldStart, oldEnd, newStart, newEnd) {
  if (oldStart === null || oldEnd === null) return;
  let block = parent;
  while (block !== null && block.startMarker === oldStart && block.endMarker === oldEnd) {
    block.startMarker = newStart;
    block.endMarker = newEnd;
    block = block.parentBlock;
  }
}
function sharesBlockBoundary(parent, start, end) {
  return parent !== null && start !== null && end !== null && parent.startMarker === start && parent.endMarker === end;
}
function renderBranchSlot(parentScope, slotKey, state, domParent, next, body, marker, env) {
  const parentBlock = parentScope.block;
  const hydration = activeHydration();
  if (next !== state.branch) {
    const liveEnd = state.start === null && state.block !== null && state.block.endMarker !== null ? state.block.endMarker : state.end;
    if (state.block !== null && body !== null && hydration === null && parentBlock.currentRenderMode === "transition") {
      if (liveEnd !== null) {
        const oldBlock2 = state.block;
        const oldBlockStart2 = oldBlock2.startMarker;
        const oldBlockEnd2 = oldBlock2.endMarker;
        const r = renderOffscreen(
          parentBlock,
          domParent,
          liveEnd,
          body,
          void 0,
          null,
          "control-flow",
          env
        );
        if (r.suspended || r.error) {
          disposeWip(r.wip);
          if (r.error) throw r.error;
          throw new SuspenseException(r.suspended);
        }
        if (state.borrowed) {
          disposeWip(r.wip);
        } else {
          r.wip.start.data = marker;
          r.wip.end.data = "/" + marker;
          const oldStart = state.start;
          const oldEnd = state.end;
          unmountBlock(state.block);
          if (oldStart !== null) {
            oldStart.remove();
            oldEnd?.remove();
          }
          state.start = r.wip.start;
          state.end = r.wip.end;
          state.block = r.wip.block;
          state.branch = next;
          replaceSharedBlockBoundary(
            parentBlock,
            oldBlockStart2,
            oldBlockEnd2,
            r.wip.start,
            r.wip.end
          );
          r.wip.block.exclusiveMarkers = true;
          spliceWipCapture(r.wip);
          return;
        }
      }
    }
    const after = liveEnd !== null ? liveEnd.nextSibling : state.anchor;
    const oldBlock = state.block;
    const oldBlockStart = oldBlock?.startMarker ?? null;
    const oldBlockEnd = oldBlock?.endMarker ?? null;
    const oldBoundaryShared = sharesBlockBoundary(parentBlock, oldBlockStart, oldBlockEnd);
    if (state.block) {
      unmountBlock(state.block);
      state.block = null;
    }
    state.branch = next;
    if (state.start !== null) {
      if (body) {
        let bStart;
        let bEnd;
        let borrowed = false;
        if (hydration !== null && hydration.isOpen(state.start.nextSibling)) {
          bStart = state.start.nextSibling;
          bEnd = hydration.close(bStart);
          hydration.node = bStart.nextSibling;
        } else {
          bStart = state.start;
          bEnd = state.end;
          borrowed = true;
          if (hydration !== null) hydration.node = state.start.nextSibling;
        }
        const b = createBlock(
          "control-flow",
          parentBlock,
          domParent,
          bStart,
          bEnd,
          body,
          void 0,
          env
        );
        if (borrowed) b.exclusiveMarkers = true;
        state.block = b;
        renderBlock(b);
      } else if (hydration !== null && state.start.nextSibling !== state.end) {
        if (process.env.NODE_ENV !== "production") {
          const mmLoc = siteLoc(parentScope, slotKey);
          if (mmLoc)
            hydration.warnStructural(
              mmLoc,
              "an empty branch",
              hydration.describe(state.start.nextSibling)
            );
        }
        removeRange(state.start.nextSibling, state.end);
      }
    } else if (body) {
      const before = after ? after.previousSibling : domParent.lastChild;
      const b = createBlock(
        "control-flow",
        parentBlock,
        domParent,
        null,
        after,
        body,
        void 0,
        env
      );
      state.block = b;
      renderBlock(b);
      if (state.borrowed && state.start === null) {
        return;
      }
      const first = before ? before.nextSibling : domParent.firstChild;
      const last = after ? after.previousSibling : domParent.lastChild;
      if (last !== null && first === last && first.nodeType === 1) {
        b.startMarker = first;
        b.endMarker = first;
        state.end = first;
        replaceSharedBlockBoundary(parentBlock, oldBlockStart, oldBlockEnd, first, first);
      } else {
        const s = document.createComment(marker);
        const e = document.createComment("/" + marker);
        domParent.insertBefore(s, first ?? after);
        domParent.insertBefore(e, after);
        b.startMarker = s;
        b.endMarker = e;
        b.exclusiveMarkers = true;
        state.start = s;
        state.end = e;
        replaceSharedBlockBoundary(parentBlock, oldBlockStart, oldBlockEnd, s, e);
      }
    } else if (!oldBoundaryShared) {
      state.anchor = after;
      state.end = null;
    } else {
      const s = document.createComment(marker);
      const e = document.createComment("/" + marker);
      domParent.insertBefore(s, after);
      domParent.insertBefore(e, after);
      state.start = s;
      state.end = e;
      replaceSharedBlockBoundary(parentBlock, oldBlockStart, oldBlockEnd, s, e);
    }
  } else if (state.block) {
    state.block.body = body;
    state.block.extra = env;
    renderBlock(state.block);
  }
}
function ifBlock(parentScope, slotKey, domParent, cond, thenBody, elseBody, anchor, env) {
  const hydration = activeHydration();
  let state = parentScope.slots[slotKey];
  if (state === void 0) {
    let start = null;
    let end = null;
    const passthrough = hydration?.passthroughRanges === true;
    const open = passthrough ? null : hydration?.resolveOpen(anchor ?? null, domParent) ?? null;
    if (open !== null) {
      start = open;
      end = hydration.close(open);
    }
    state = {
      __kind: "ifBlockSlot",
      anchor: anchor ?? null,
      start,
      end,
      borrowed: passthrough,
      branch: -1,
      block: null
    };
    parentScope.slots[slotKey] = state;
    registerSlot(parentScope, state);
  }
  const next = cond ? 1 : 0;
  renderBranchSlot(
    parentScope,
    slotKey,
    state,
    domParent,
    next,
    next ? thenBody : elseBody,
    "if",
    env
  );
}
function hideActivityRange(state) {
  const b = state.block;
  if (!b) return;
  let node = b.startMarker.nextSibling;
  while (node && node !== b.endMarker) {
    if (node.nodeType === 1) {
      const el = node;
      if (!state.savedDisplay.has(el)) state.savedDisplay.set(el, el.style.display);
      el.style.display = "none";
    } else if (node.nodeType === 3) {
      const t = node;
      if (!state.savedText.has(t)) state.savedText.set(t, t.nodeValue ?? "");
      if (t.nodeValue !== "") t.nodeValue = "";
    }
    node = node.nextSibling;
  }
}
function showActivityRange(state) {
  for (const [el, display] of state.savedDisplay) el.style.display = display;
  state.savedDisplay.clear();
  for (const [t, data] of state.savedText) t.nodeValue = data;
  state.savedText.clear();
}
function queueActivityDeactivation(state, block, commitVersion) {
  enqueueEffectEventCommitAction(() => {
    if (state.block !== block || blockSubtreeDisposed(block) || state.commitVersion !== commitVersion || !state.hidden || !state.deactivationPending || // An independently scheduled sibling may have suspended the shared
    // boundary after this Activity completed. Its outer Suspense
    // deactivation already tore the effects down using the old committed
    // Event body; retain the pending bit for the eventual Activity replay.
    findSuspenseHiddenTry(block) !== null) {
      return;
    }
    deactivateScope(block);
    hideActivityRange(state);
    state.deactivationPending = false;
  });
}
function activityBlock(parentScope, slotKey, domParent, mode, body, anchor, env) {
  const parentBlock = parentScope.block;
  const hydration = activeHydration();
  const wantHidden = mode === "hidden";
  let state = parentScope.slots[slotKey];
  if (state === void 0) {
    let bStart;
    let bEnd;
    const open = hydration?.resolveOpen(anchor ?? null, domParent) ?? null;
    if (open !== null) {
      bStart = open;
      bEnd = hydration.close(open);
    } else {
      bStart = document.createComment("activity");
      bEnd = document.createComment("/activity");
      domParent.insertBefore(bStart, anchor ?? null);
      domParent.insertBefore(bEnd, anchor ?? null);
    }
    const b2 = createBlock(
      "control-flow",
      parentBlock,
      domParent,
      bStart,
      bEnd,
      body,
      void 0,
      env
    );
    state = {
      __kind: "activityBlockSlot",
      block: b2,
      hidden: false,
      commitVersion: 0,
      deactivationPending: false,
      savedDisplay: /* @__PURE__ */ new Map(),
      savedText: /* @__PURE__ */ new Map()
    };
    parentScope.slots[slotKey] = state;
    registerSlot(parentScope, state);
    const adopted = open !== null;
    const serverRangeEmpty = adopted && bStart.nextSibling === bEnd;
    if (adopted && !serverRangeEmpty) hydration.node = bStart.nextSibling;
    if (serverRangeEmpty && hydration !== null) {
      b2.inactive = wantHidden;
      state.hidden = wantHidden;
      hydration.deferredActivities.push(() => {
        if (b2.disposed) return;
        hydration.suspend(() => renderBlock(b2));
        if (state.hidden) hideActivityRange(state);
      });
      hydration.node = bEnd.nextSibling;
      return;
    }
    if (wantHidden) {
      b2.inactive = true;
      renderBlock(b2);
      hideActivityRange(state);
      state.hidden = true;
    } else {
      renderBlock(b2);
    }
    if (adopted && hydration !== null) hydration.node = bEnd.nextSibling;
    return;
  }
  const b = state.block;
  b.body = body;
  b.extra = env;
  const commitVersion = ++state.commitVersion;
  if (wantHidden) {
    if (!state.hidden) {
      b.inactive = true;
      state.hidden = true;
      state.deactivationPending = true;
      queueActivityDeactivation(state, b, commitVersion);
      renderBlock(b);
    } else {
      if (state.deactivationPending) {
        queueActivityDeactivation(state, b, commitVersion);
      }
      renderBlock(b);
      if (!state.deactivationPending) hideActivityRange(state);
    }
  } else {
    if (state.hidden) {
      showActivityRange(state);
      b.inactive = false;
      state.hidden = false;
      state.deactivationPending = false;
      renderBlock(b);
    } else {
      renderBlock(b);
    }
  }
}
function forEachSubtreeChild(scope, visit, includeHiddenTry = true) {
  const children = scope.children;
  for (let i = 0, n = children.length; i < n; i++) visit(children[i].scope);
  const slots = scope._slots;
  if (slots !== null) {
    for (let i = 0, n = slots.length; i < n; i++) {
      const val = slots[i];
      if (val.__kind === "forBlockSlot") {
        for (let b = val.head; b !== null; b = b.nextSibling) visit(b);
        if (val.emptyBlock) visit(val.emptyBlock);
      } else if (val.block) {
        visit(val.block);
        if (includeHiddenTry && val.__kind === "trySlotSlot" && val.tryBlock && val.tryBlock !== val.block) {
          visit(val.tryBlock);
        }
      }
    }
  }
}
function detachSubtreeRefs(scope, out, shouldDetach = true, includeHiddenTry = true) {
  const deoptRoot = scope.deoptNode;
  if (deoptRoot != null) detachDeoptTreeRefs(deoptRoot, out, shouldDetach, scope);
  const rm = scope.refFields;
  if (rm !== null) {
    const bag = scope.slots[0];
    if (bag != null) {
      for (let j = 0, n = rm.length; j < n; j += 3) {
        const kind = rm[j];
        if (kind === "r") {
          const ref = bag[rm[j + 1]];
          if (ref == null) continue;
          const el = bag[rm[j + 2]];
          out.push({ ref, el, scope });
          if (shouldDetach) attachRef(ref, null, el);
        } else if (kind === "s") {
          const ref = bag[rm[j + 1]]?.ref;
          if (ref == null) continue;
          const el = bag[rm[j + 2]];
          if (el == null) continue;
          out.push({ ref, el, scope });
          if (shouldDetach) attachRef(ref, null, el);
        } else {
          const fi = bag[rm[j + 1]];
          if (fi == null || fi._currentRef == null) continue;
          out.push({ ref: fi._currentRef, el: fi, scope });
          if (shouldDetach) attachRef(fi._currentRef, null, fi);
        }
      }
    }
  }
  const slots = scope.slots;
  for (let i = 0, n = slots.length; i < n; i++) {
    const s = slots[i];
    if (s === null || typeof s !== "object") continue;
    if (s.ref != null && s.anchor !== void 0 && s.el instanceof Element) {
      out.push({ ref: s.ref, el: s.el, scope });
      if (shouldDetach) attachRef(s.ref, null, s.el);
    }
    if (s.__kind === "childSlot" && s.hostNode != null) {
      detachDeoptTreeRefs(s.hostNode, out, shouldDetach, scope);
    }
  }
  forEachSubtreeChild(
    scope,
    (child2) => detachSubtreeRefs(child2, out, shouldDetach, includeHiddenTry),
    includeHiddenTry
  );
}
function collectVisibleSubtreeRefs(scope, out) {
  detachSubtreeRefs(scope, out, false, false);
}
function detachDeoptTreeRefs(node, out, shouldDetach = true, ownerScope) {
  const ref = getDeoptDesc(node)?.props?.ref;
  if (ref != null) {
    if (out !== null) {
      out.push({ ref, el: node, scope: ownerScope });
      if (shouldDetach) attachRef(ref, null, node);
    } else {
      queueRefDetach(ref, node);
    }
  }
  let c = node.firstChild;
  while (c !== null) {
    const rangeEnd = c.$$portalEnd;
    if (rangeEnd != null) {
      c = nodeAfterPortalRange(c, rangeEnd);
      continue;
    }
    detachDeoptTreeRefs(c, out, shouldDetach, ownerScope);
    c = c.nextSibling;
  }
}
function deactivateScope(scope) {
  const hooks = scope.hooks;
  if (hooks) {
    for (const slot of hooks.values()) {
      if (slot && slot.effect === true) {
        const e = slot;
        if (e.phase === INSERTION) continue;
        if (typeof e.cleanup === "function") {
          const cleanup = e.cleanup;
          e.cleanup = void 0;
          try {
            runEffectCleanupCallback(cleanup);
          } catch (err) {
            if (err instanceof MaximumUpdateDepthError) throw err;
            const handler = findTryHandler(scope.block);
            if (handler !== null) handler(err);
            else console.error(err);
          }
        }
        e.deps = void 0;
      }
    }
  }
  forEachSubtreeChild(scope, deactivateScope);
}
function switchBlock(parentScope, slotKey, domParent, discriminant, cases, defaultBody, anchor, env) {
  const hydration = activeHydration();
  let state = parentScope.slots[slotKey];
  if (state === void 0) {
    let start = null;
    let end = null;
    if (hydration !== null && hydration.isOpen(anchor ?? null)) {
      start = anchor;
      end = hydration.close(anchor);
    }
    state = {
      __kind: "switchBlockSlot",
      anchor: anchor ?? null,
      start,
      end,
      borrowed: false,
      branch: -1,
      block: null
    };
    parentScope.slots[slotKey] = state;
    registerSlot(parentScope, state);
  }
  let nextIdx = -2;
  let body = defaultBody;
  for (let i = 0; i < cases.length; i++) {
    if (cases[i][0] === discriminant) {
      nextIdx = i;
      body = cases[i][1];
      break;
    }
  }
  renderBranchSlot(parentScope, slotKey, state, domParent, nextIdx, body, "switch", env);
}
function forBlock(parentScope, slotKey, domParent, items, getKey, itemBody, flags, deps, emptyBody, anchor, ownEnd) {
  const parentBlock = parentScope.block;
  const hydration = activeHydration();
  let state = parentScope.slots[slotKey];
  if (state === void 0) {
    let start;
    let end;
    if (hydration !== null && hydration.isOpen(anchor ?? null)) {
      start = anchor;
      end = hydration.close(anchor);
      hydration.node = start.nextSibling;
    } else if (hydration !== null && hydration.isOpen(hydration.node)) {
      start = hydration.node;
      end = hydration.close(hydration.node);
      hydration.node = start.nextSibling;
    } else {
      start = document.createComment("for");
      if (ownEnd === true && anchor?.nodeType === 8) {
        end = anchor;
        end.data = "/for";
        domParent.insertBefore(start, end);
      } else {
        end = document.createComment("/for");
        domParent.insertBefore(start, anchor ?? null);
        domParent.insertBefore(end, anchor ?? null);
      }
    }
    state = {
      __kind: "forBlockSlot",
      start,
      end,
      items: /* @__PURE__ */ new Map(),
      head: null,
      tail: null,
      size: 0,
      cachedDeps: null,
      emptyBlock: null,
      env: void 0,
      adopt: null
    };
    parentScope.slots[slotKey] = state;
    registerSlot(parentScope, state);
  }
  const serverMarkerState = hydration?.markerState(state.start) ?? -1;
  state.env = deps;
  const isEmpty = items.length === 0;
  if (isEmpty && emptyBody) {
    if (state.size > 0) {
      reconcileKeyed(parentBlock, state, items, getKey, itemBody, false, false);
    }
    if (state.emptyBlock) {
      state.emptyBlock.body = emptyBody;
      state.emptyBlock.extra = state.env;
      renderBlock(state.emptyBlock);
    } else {
      let suspendForEmpty = false;
      if (hydration !== null && (serverMarkerState === 1 || serverMarkerState === -1 && hydration.isOpen(state.start.nextSibling))) {
        if (process.env.NODE_ENV !== "production") {
          const mmLoc = siteLoc(parentScope, slotKey) || domParent.__oct_loc;
          if (mmLoc) hydration.warnStructural(mmLoc, "an empty list (@empty)", "a populated list");
        }
        removeRange(state.start.nextSibling, state.end);
        suspendForEmpty = true;
      } else if (hydration !== null) {
        hydration.node = state.start.nextSibling;
      }
      const b = createBlock(
        "control-flow",
        parentBlock,
        domParent,
        state.start,
        state.end,
        emptyBody,
        void 0,
        state.env
      );
      b.exclusiveMarkers = true;
      state.emptyBlock = b;
      if (suspendForEmpty) hydration.suspend(() => renderBlock(b));
      else renderBlock(b);
    }
    if (hydration !== null) hydration.node = state.end.nextSibling;
    return;
  }
  if (state.emptyBlock) {
    unmountBlock(state.emptyBlock);
    state.emptyBlock = null;
  }
  if (!isEmpty && hydration !== null && (serverMarkerState === 0 || serverMarkerState === -1 && ((flags || 0) & 16) === 0 && state.start.nextSibling !== null && state.start.nextSibling !== state.end && !hydration.isOpen(state.start.nextSibling))) {
    if (process.env.NODE_ENV !== "production") {
      const mmLoc = siteLoc(parentScope, slotKey) || domParent.__oct_loc;
      if (mmLoc) hydration.warnStructural(mmLoc, "a populated list", "an empty list (@empty)");
    }
    removeRange(state.start.nextSibling, state.end);
    hydration.node = state.end;
  }
  const f = flags || 0;
  let pure = (f & 1) !== 0;
  let lite = false;
  if ((f & 4) !== 0 && deps !== void 0) {
    if (state.cachedDeps !== null && depsEqual(state.cachedDeps, deps)) {
      pure = true;
    } else {
      lite = true;
    }
    state.cachedDeps = deps;
  }
  reconcileKeyed(
    parentBlock,
    state,
    items,
    getKey,
    itemBody,
    pure,
    (f & 2) !== 0,
    lite,
    (f & 8) !== 0,
    (f & 16) !== 0
  );
  if (hydration !== null) {
    discardLeftoverHydrationItems(state.end, hydration);
    hydration.node = state.end.nextSibling;
  }
}
function discardLeftoverHydrationItems(end, hydration) {
  const n = hydration.node;
  if (n === null || n === end || n.parentNode !== end.parentNode) return;
  removeRange(n, end);
}
function removeRange(from, end) {
  let n = from;
  while (n !== null && n !== end) {
    const next = n.nextSibling;
    n.remove();
    n = next;
  }
}
function depsEqual(a, b) {
  const n = a.length;
  if (n !== b.length) return false;
  for (let i = 0; i < n; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}
const K_DISP = 4;
const _disp = new Int32Array(K_DISP);
function updateSurvivor(block, newItem, newIdx, itemBody, pure, lite, indexIndependent, env) {
  if (pure && block.props === newItem && (indexIndependent || block.itemIndex === newIdx)) {
    block.itemIndex = newIdx;
    block.body = itemBody;
  } else {
    block.props = newItem;
    block.body = itemBody;
    block.itemIndex = newIdx;
    block.extra = env;
    if (lite) {
      itemBody(newItem, block, env);
    } else {
      renderBlock(block);
    }
  }
}
function reconcileKeyed(parentBlock, state, items, getKey, itemBody, pure, singleRoot, lite = false, indexIndependent = false, ssrMarkerless = false) {
  const oldItems = state.items;
  const oldSize = state.size;
  const newLen = items.length;
  const parentNode = state.end.parentNode;
  if (oldSize === 0) {
    if (newLen === 0) return;
    const adopt = state.adopt;
    let prev = null;
    const mounted = [];
    try {
      for (let i = 0; i < newLen; i++) {
        const item = items[i];
        const key = getKey(item, i);
        let adoptNode = null;
        let anchor = state.end;
        if (adopt !== null && adopt.length !== 0) {
          if (adopt[0].key === key) adoptNode = adopt.shift().node;
          else anchor = adopt[0].node;
        }
        const block = mountItem(
          parentBlock,
          parentNode,
          anchor,
          item,
          i,
          itemBody,
          state,
          singleRoot,
          ssrMarkerless,
          adoptNode
        );
        mounted.push(block);
        oldItems.set(key, block);
        block.key = key;
        block.prevSibling = prev;
        block.nextSibling = null;
        if (prev) prev.nextSibling = block;
        else state.head = block;
        prev = block;
      }
      state.tail = prev;
      state.size = newLen;
    } catch (error) {
      for (let i = mounted.length - 1; i >= 0; i--) {
        const block = mounted[i];
        oldItems.delete(block.key);
        unmountBlock(block, true);
      }
      state.head = null;
      state.tail = null;
      state.size = 0;
      throw error;
    }
    return;
  }
  if (newLen === 0) {
    batchClearItems(state, oldItems);
    state.head = null;
    state.tail = null;
    state.size = 0;
    return;
  }
  let oldFirst = state.head;
  let prefixLen = 0;
  while (oldFirst !== null && prefixLen < newLen) {
    const newKey = getKey(items[prefixLen], prefixLen);
    if (oldFirst.key !== newKey) break;
    const block = oldFirst;
    updateSurvivor(
      block,
      items[prefixLen],
      prefixLen,
      itemBody,
      pure,
      lite,
      indexIndependent,
      state.env
    );
    oldFirst = block.nextSibling;
    prefixLen++;
  }
  if (prefixLen === newLen && oldFirst === null) return;
  let oldLast = state.tail;
  let newEnd = newLen - 1;
  let oldRemain = oldSize - prefixLen;
  while (oldLast !== null && oldRemain > 0 && newEnd >= prefixLen) {
    const newKey = getKey(items[newEnd], newEnd);
    if (oldLast.key !== newKey) break;
    const block = oldLast;
    updateSurvivor(block, items[newEnd], newEnd, itemBody, pure, lite, indexIndependent, state.env);
    oldLast = block.prevSibling;
    newEnd--;
    oldRemain--;
  }
  let beforeMiddle;
  let afterMiddle;
  if (oldRemain === 0) {
    afterMiddle = oldFirst;
    beforeMiddle = afterMiddle ? afterMiddle.prevSibling : state.tail;
  } else {
    beforeMiddle = oldFirst.prevSibling;
    afterMiddle = oldLast.nextSibling;
  }
  if (oldRemain === 0) {
    const anchor = afterMiddle ? afterMiddle.startMarker : state.end;
    let prev = beforeMiddle;
    for (let i = prefixLen; i <= newEnd; i++) {
      const item = items[i];
      const key = getKey(item, i);
      const block = mountItem(
        parentBlock,
        parentNode,
        anchor,
        item,
        i,
        itemBody,
        state,
        singleRoot,
        ssrMarkerless
      );
      oldItems.set(key, block);
      block.key = key;
      block.prevSibling = prev;
      block.nextSibling = afterMiddle;
      if (prev) prev.nextSibling = block;
      else state.head = block;
      prev = block;
    }
    if (afterMiddle) afterMiddle.prevSibling = prev;
    else state.tail = prev;
    state.size += newEnd - prefixLen + 1;
    return;
  }
  if (prefixLen > newEnd) {
    let cur2 = oldFirst;
    let removed = 0;
    while (cur2 !== afterMiddle) {
      const next = cur2.nextSibling;
      unmountBlock(cur2);
      oldItems.delete(cur2.key);
      cur2 = next;
      removed++;
    }
    if (beforeMiddle) beforeMiddle.nextSibling = afterMiddle;
    else state.head = afterMiddle;
    if (afterMiddle) afterMiddle.prevSibling = beforeMiddle;
    else state.tail = beforeMiddle;
    state.size -= removed;
    return;
  }
  const newMidLen = newEnd - prefixLen + 1;
  const newKeys = new Array(newMidLen);
  const newKeysToIdx = /* @__PURE__ */ new Map();
  for (let i = 0; i < newMidLen; i++) {
    const key = getKey(items[prefixLen + i], prefixLen + i);
    newKeys[i] = key;
    newKeysToIdx.set(key, i);
  }
  if (beforeMiddle === null && afterMiddle === null && !newKeysToIdx.has(oldFirst.key)) {
    let anySurvivors = false;
    let cur2 = oldFirst.nextSibling;
    while (cur2 !== null) {
      if (newKeysToIdx.has(cur2.key)) {
        anySurvivors = true;
        break;
      }
      cur2 = cur2.nextSibling;
    }
    if (!anySurvivors) {
      batchClearItems(state, oldItems);
      state.head = null;
      state.tail = null;
      state.size = 0;
      let prev = null;
      for (let i = 0; i < newLen; i++) {
        const item = items[i];
        const key = newKeys[i];
        const block = mountItem(
          parentBlock,
          parentNode,
          state.end,
          item,
          i,
          itemBody,
          state,
          singleRoot,
          ssrMarkerless
        );
        oldItems.set(key, block);
        block.key = key;
        block.prevSibling = prev;
        block.nextSibling = null;
        if (prev) prev.nextSibling = block;
        else state.head = block;
        prev = block;
      }
      state.tail = prev;
      state.size = newLen;
      return;
    }
  }
  const sources = new Int32Array(newMidLen);
  for (let i = 0; i < newMidLen; i++) sources[i] = -1;
  let moved = false;
  let lastIdx = 0;
  let patched = 0;
  let cur = oldFirst;
  let oldIdx = 0;
  while (cur !== afterMiddle) {
    const next = cur.nextSibling;
    const newRelIdx = newKeysToIdx.get(cur.key);
    if (newRelIdx === void 0) {
      unmountBlock(cur);
      oldItems.delete(cur.key);
      state.size--;
    } else {
      sources[newRelIdx] = oldIdx;
      if (newRelIdx < lastIdx) moved = true;
      else lastIdx = newRelIdx;
      patched++;
      const newIdx = prefixLen + newRelIdx;
      updateSurvivor(
        cur,
        items[newIdx],
        newIdx,
        itemBody,
        pure,
        lite,
        indexIndependent,
        state.env
      );
    }
    cur = next;
    oldIdx++;
  }
  if (!moved && patched === newMidLen) {
    if (oldRemain !== patched) {
      let prev = beforeMiddle;
      for (let i = 0; i < newMidLen; i++) {
        const block = oldItems.get(newKeys[i]);
        block.prevSibling = prev;
        if (prev) prev.nextSibling = block;
        else state.head = block;
        prev = block;
      }
      prev.nextSibling = afterMiddle;
      if (afterMiddle) afterMiddle.prevSibling = prev;
      else state.tail = prev;
    }
    return;
  }
  if (moved && patched === newMidLen) {
    let dCount = 0;
    for (let i = 0; i < newMidLen; i++) {
      if (sources[i] !== i) {
        if (dCount === K_DISP) {
          dCount = K_DISP + 1;
          break;
        }
        _disp[dCount++] = i;
      }
    }
    if (dCount <= K_DISP) {
      const endAnchor = afterMiddle ? afterMiddle.startMarker : state.end;
      for (let j = dCount - 1; j >= 0; j--) {
        const i = _disp[j];
        const block = oldItems.get(newKeys[i]);
        const anchor = i + 1 < newMidLen ? oldItems.get(newKeys[i + 1]).startMarker : endAnchor;
        moveBlockBefore(block, anchor);
      }
      for (let j = 0; j < dCount; j++) {
        const i = _disp[j];
        const block = oldItems.get(newKeys[i]);
        const prev = i > 0 ? oldItems.get(newKeys[i - 1]) : beforeMiddle;
        const next = i + 1 < newMidLen ? oldItems.get(newKeys[i + 1]) : afterMiddle;
        block.prevSibling = prev;
        block.nextSibling = next;
        if (prev) prev.nextSibling = block;
        else state.head = block;
        if (next) next.prevSibling = block;
        else state.tail = block;
      }
      const newMidFirst = oldItems.get(newKeys[0]);
      const newMidLast = oldItems.get(newKeys[newMidLen - 1]);
      newMidFirst.prevSibling = beforeMiddle;
      newMidLast.nextSibling = afterMiddle;
      if (beforeMiddle) beforeMiddle.nextSibling = newMidFirst;
      else state.head = newMidFirst;
      if (afterMiddle) afterMiddle.prevSibling = newMidLast;
      else state.tail = newMidLast;
      return;
    }
  }
  const middleEndAnchor = afterMiddle ? afterMiddle.startMarker : state.end;
  let nextBlock = afterMiddle;
  let lastPlaced = null;
  if (moved) {
    const seq = lis(sources);
    let seqIdx = seq.length - 1;
    for (let i = newMidLen - 1; i >= 0; i--) {
      const targetIdx = i + prefixLen;
      const key = newKeys[i];
      const anchor = nextBlock ? nextBlock.startMarker : middleEndAnchor;
      let block;
      if (sources[i] === -1) {
        const item = items[targetIdx];
        block = mountItem(
          parentBlock,
          parentNode,
          anchor,
          item,
          targetIdx,
          itemBody,
          state,
          singleRoot,
          ssrMarkerless
        );
        oldItems.set(key, block);
        block.key = key;
        state.size++;
      } else if (seqIdx < 0 || i !== seq[seqIdx]) {
        block = oldItems.get(key);
        moveBlockBefore(block, anchor);
      } else {
        block = oldItems.get(key);
        seqIdx--;
      }
      block.nextSibling = nextBlock;
      if (nextBlock) nextBlock.prevSibling = block;
      if (lastPlaced === null) lastPlaced = block;
      nextBlock = block;
    }
  } else {
    for (let i = newMidLen - 1; i >= 0; i--) {
      const targetIdx = i + prefixLen;
      const key = newKeys[i];
      const anchor = nextBlock ? nextBlock.startMarker : middleEndAnchor;
      let block;
      if (sources[i] === -1) {
        const item = items[targetIdx];
        block = mountItem(
          parentBlock,
          parentNode,
          anchor,
          item,
          targetIdx,
          itemBody,
          state,
          singleRoot,
          ssrMarkerless
        );
        oldItems.set(key, block);
        block.key = key;
        state.size++;
      } else {
        block = oldItems.get(key);
      }
      block.nextSibling = nextBlock;
      if (nextBlock) nextBlock.prevSibling = block;
      if (lastPlaced === null) lastPlaced = block;
      nextBlock = block;
    }
  }
  const newMiddleHead = nextBlock;
  const newMiddleTail = lastPlaced;
  newMiddleHead.prevSibling = beforeMiddle;
  if (beforeMiddle) beforeMiddle.nextSibling = newMiddleHead;
  else state.head = newMiddleHead;
  if (!afterMiddle) state.tail = newMiddleTail;
}
function batchClearItems(state, oldItems) {
  const p = state.start.parentNode;
  if (state.start.previousSibling === null && state.end.nextSibling === null) {
    p.textContent = "";
    p.appendChild(state.start);
    p.appendChild(state.end);
  } else {
    const range = document.createRange();
    range.setStartAfter(state.start);
    range.setEndBefore(state.end);
    range.deleteContents();
  }
  for (let b = state.head; b !== null; b = b.nextSibling) {
    if (b.cleanups.length > 0 || b.children.length > 0 || b._slots !== null) {
      unmountBlock(b, false);
    } else {
      if (b.deoptNode !== null) detachDeoptTreeRefs(b.deoptNode, null);
      b.disposed = true;
    }
  }
  oldItems.clear();
}
function mountItem(parentBlock, parentNode, anchor, item, index, body, forSlot, singleRoot, ssrMarkerless, adoptNode = null) {
  const hydration = activeHydration();
  if (hydration !== null) {
    if (ssrMarkerless && !hydration.isOpen(hydration.node)) {
      if (hydration.node !== null && hydration.node !== forSlot.end) {
        const root = hydration.node;
        const block3 = createBlock(
          "control-flow",
          parentBlock,
          parentNode,
          root,
          root,
          body,
          item,
          forSlot.env
        );
        block3.forSlot = forSlot;
        block3.itemIndex = index;
        renderBlock(block3);
        hydration.node = block3.endMarker?.nextSibling ?? root.nextSibling;
        return block3;
      }
      if (process.env.NODE_ENV !== "production") {
        const mmLoc = parentNode.__oct_loc;
        if (mmLoc)
          hydration.warnStructural(mmLoc, "another list item", hydration.describe(hydration.node));
      }
      return hydration.suspend(
        () => mountItem(
          parentBlock,
          parentNode,
          anchor,
          item,
          index,
          body,
          forSlot,
          singleRoot,
          ssrMarkerless
        )
      );
    }
    if (!hydration.isOpen(hydration.node)) {
      if (process.env.NODE_ENV !== "production") {
        const mmLoc = parentNode.__oct_loc;
        if (mmLoc)
          hydration.warnStructural(mmLoc, "another list item", hydration.describe(hydration.node));
      }
      return hydration.suspend(
        () => mountItem(
          parentBlock,
          parentNode,
          anchor,
          item,
          index,
          body,
          forSlot,
          singleRoot,
          ssrMarkerless
        )
      );
    }
    const itemStart = hydration.node;
    const itemEnd = hydration.close(itemStart);
    hydration.node = itemStart.nextSibling;
    const block2 = createBlock(
      "control-flow",
      parentBlock,
      parentNode,
      itemStart,
      itemEnd,
      body,
      item,
      forSlot.env
    );
    block2.forSlot = forSlot;
    block2.itemIndex = index;
    renderBlock(block2);
    hydration.node = itemEnd.nextSibling;
    return block2;
  }
  if (singleRoot === true || singleRoot === 2 && isHostDescriptor(item) && !descNeedsBlocks(item)) {
    if (adoptNode !== null) {
      const block3 = createBlock(
        "control-flow",
        parentBlock,
        parentNode,
        adoptNode,
        adoptNode,
        body,
        item,
        forSlot.env
      );
      block3.forSlot = forSlot;
      block3.itemIndex = index;
      block3.deoptNode = adoptNode;
      renderBlock(block3);
      return block3;
    }
    const block2 = createBlock(
      "control-flow",
      parentBlock,
      parentNode,
      null,
      anchor,
      body,
      item,
      forSlot.env
    );
    block2.forSlot = forSlot;
    block2.itemIndex = index;
    renderBlock(block2);
    const root = anchor.previousSibling;
    block2.startMarker = root;
    block2.endMarker = root;
    return block2;
  }
  const start = document.createComment("it");
  const end = document.createComment("/it");
  if (adoptNode !== null) {
    parentNode.insertBefore(start, adoptNode);
    parentNode.insertBefore(end, adoptNode.nextSibling);
  } else {
    parentNode.insertBefore(start, anchor);
    parentNode.insertBefore(end, anchor);
  }
  const block = createBlock(
    "control-flow",
    parentBlock,
    parentNode,
    start,
    end,
    body,
    item,
    forSlot.env
  );
  block.forSlot = forSlot;
  block.itemIndex = index;
  if (adoptNode !== null) block.deoptNode = adoptNode;
  try {
    renderBlock(block);
  } catch (error) {
    unmountBlock(block, true);
    throw error;
  }
  return block;
}
function moveBlockBefore(block, anchor) {
  const parent = block.startMarker.parentNode;
  const end = block.endMarker;
  let n = block.startMarker;
  while (n) {
    const isEnd = n === end;
    const next = n.nextSibling;
    parent.insertBefore(n, anchor);
    if (isEnd) break;
    n = next;
  }
}
function lis(arr) {
  const n = arr.length;
  const p = new Int32Array(n);
  const result = [];
  for (let i = 0; i < n; i++) {
    const v2 = arr[i];
    if (v2 === -1) continue;
    if (result.length === 0 || arr[result[result.length - 1]] < v2) {
      p[i] = result.length === 0 ? -1 : result[result.length - 1];
      result.push(i);
      continue;
    }
    let lo = 0, hi = result.length - 1;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (arr[result[mid]] < v2) lo = mid + 1;
      else hi = mid;
    }
    if (v2 < arr[result[lo]]) {
      p[i] = lo > 0 ? result[lo - 1] : -1;
      result[lo] = i;
    }
  }
  let u = result.length;
  let v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
function scopeHasFragmentRef(scope) {
  const fields = scope.refFields;
  if (fields === null) return false;
  for (let i = 0; i < fields.length; i += 3) {
    if (fields[i] === "f") return true;
  }
  return false;
}
function coalesceHydratedRanges(rootBlock, liteRanges) {
  const blockGroups = /* @__PURE__ */ new WeakMap();
  const scopeGroups = /* @__PURE__ */ new WeakMap();
  const ownerGroups = /* @__PURE__ */ new WeakMap();
  const seenBlocks = /* @__PURE__ */ new WeakSet();
  const seenScopes = /* @__PURE__ */ new WeakSet();
  function makeGroup(startNode, endNode, block, liteScope, owner) {
    if (!isBlockOpen(startNode) || !isBlockClose(endNode) || startNode === endNode) return null;
    if (startNode.parentNode === null || startNode.parentNode !== endNode.parentNode) return null;
    const openDepth = hydrationMarkerMultiplicity(startNode.data, true);
    const closeDepth = hydrationMarkerMultiplicity(endNode.data, false);
    if (openDepth === 0 || openDepth !== closeDepth) return null;
    const group = {
      start: startNode,
      end: endNode,
      depth: openDepth,
      blocks: block === void 0 ? [] : [block],
      liteScopes: liteScope === void 0 ? [] : [liteScope],
      owners: owner === void 0 ? [] : [owner]
    };
    if (block !== void 0) blockGroups.set(block, group);
    if (liteScope !== void 0) scopeGroups.set(liteScope, group);
    if (owner !== void 0) ownerGroups.set(owner, group);
    return group;
  }
  function appendUnique(target, source) {
    for (let i = 0; i < source.length; i++) {
      if (target.indexOf(source[i]) === -1) target.push(source[i]);
    }
  }
  function remapGroup(from, to) {
    for (let i = 0; i < from.blocks.length; i++) blockGroups.set(from.blocks[i], to);
    for (let i = 0; i < from.liteScopes.length; i++) scopeGroups.set(from.liteScopes[i], to);
    for (let i = 0; i < from.owners.length; i++) ownerGroups.set(from.owners[i], to);
  }
  function writeMultiplicity(group) {
    group.start.data = group.depth === 1 ? HYDRATION_START : HYDRATION_START + String(group.depth);
    group.end.data = group.depth === 1 ? HYDRATION_END : HYDRATION_END + String(group.depth);
  }
  function unifySharedPair(outer, inner) {
    if (outer === inner) return outer;
    outer.depth = Math.max(outer.depth, inner.depth);
    appendUnique(outer.blocks, inner.blocks);
    appendUnique(outer.liteScopes, inner.liteScopes);
    appendUnique(outer.owners, inner.owners);
    remapGroup(inner, outer);
    writeMultiplicity(outer);
    return outer;
  }
  function rangesAreExactlyNested(outer, inner) {
    return outer.start.parentNode !== null && outer.start.parentNode === inner.start.parentNode && outer.end.parentNode === outer.start.parentNode && inner.end.parentNode === outer.start.parentNode && outer.start.nextSibling === inner.start && inner.end.nextSibling === outer.end;
  }
  function borrowInnerRange(outer, inner) {
    for (let i = 0; i < inner.blocks.length; i++) {
      const block = inner.blocks[i];
      block.startMarker = outer.start;
      block.endMarker = outer.end;
      block.exclusiveMarkers = true;
    }
    for (let i = 0; i < inner.liteScopes.length; i++) {
      inner.liteScopes[i].block.endMarker = outer.end;
    }
    for (let i = 0; i < inner.owners.length; i++) {
      const owner = inner.owners[i];
      owner.start = outer.start;
      owner.end = outer.end;
      if (owner.__kind === "componentSlotSlot") {
        owner.inherited = true;
      } else if (owner.__kind === "childSlot") {
        owner.borrowed = true;
        if (owner.forSlot !== null) {
          owner.forSlot.start = outer.start;
          owner.forSlot.end = outer.end;
        }
      } else {
        owner.borrowed = true;
      }
    }
  }
  function mergeExactRanges(outer, inner) {
    if (outer === inner) return outer;
    if (outer.start === inner.start && outer.end === inner.end) {
      return unifySharedPair(outer, inner);
    }
    if (!rangesAreExactlyNested(outer, inner)) return outer;
    const mergedDepth = outer.depth + inner.depth;
    if (!Number.isSafeInteger(mergedDepth)) return outer;
    borrowInnerRange(outer, inner);
    inner.start.remove();
    inner.end.remove();
    outer.depth = mergedDepth;
    appendUnique(outer.blocks, inner.blocks);
    appendUnique(outer.liteScopes, inner.liteScopes);
    appendUnique(outer.owners, inner.owners);
    remapGroup(inner, outer);
    writeMultiplicity(outer);
    return outer;
  }
  function attachOwner(group, owner) {
    if (group === null) return;
    if (group.owners.indexOf(owner) === -1) group.owners.push(owner);
    ownerGroups.set(owner, group);
  }
  function isBoundaryComponent(owner) {
    return owner.currentComp === Suspense || owner.currentComp === ErrorBoundary || owner.currentComp === ViewTransition;
  }
  function mayBorrowCandidate(value) {
    if (value === null || typeof value !== "object") return false;
    const kind = value.__kind;
    if (kind === "componentSlotSlot") {
      const owner = value;
      return owner.block !== null && !owner.keyed && !isBoundaryComponent(owner) && !scopeHasFragmentRef(owner.block);
    }
    if (kind === "childSlot") {
      const owner = value;
      return owner.block !== null && owner.forSlot === null && owner.portal === null && owner.currentComp !== Suspense && owner.currentComp !== ErrorBoundary && owner.currentComp !== ViewTransition && !scopeHasFragmentRef(owner.block);
    }
    if (kind === "ifBlockSlot" || kind === "switchBlockSlot") {
      const owner = value;
      return owner.block === null || !scopeHasFragmentRef(owner.block);
    }
    return liteRanges.has(value) && !scopeHasFragmentRef(value);
  }
  function mappedGroup(value) {
    if (value === null || typeof value !== "object") return void 0;
    return ownerGroups.get(value) ?? scopeGroups.get(value);
  }
  function soleRangeCandidate(scope) {
    let only = void 0;
    let count = 0;
    const slots = scope.slots;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === void 0) continue;
      only = slots[i];
      count++;
      if (count > 1) break;
    }
    if (count === 1 && mayBorrowCandidate(only)) {
      const group = mappedGroup(only);
      if (group !== void 0) return group;
    }
    const registered = scope._slots;
    if (registered !== null && registered.length === 1 && scope.children.length === 0 && registered[0].__kind === "childSlot" && registered[0].compactable && mayBorrowCandidate(registered[0])) {
      return ownerGroups.get(registered[0]) ?? null;
    }
    return null;
  }
  function compactScopeRange(scope, own) {
    visitScopeContents(scope);
    if (own === null || scopeHasFragmentRef(scope)) return;
    const candidate = soleRangeCandidate(scope);
    if (candidate !== null) mergeExactRanges(own, candidate);
  }
  function visitBlock(block, owner) {
    if (seenBlocks.has(block)) {
      const existing = blockGroups.get(block) ?? null;
      if (owner !== void 0) attachOwner(existing, owner);
      return existing;
    }
    seenBlocks.add(block);
    const own = makeGroup(block.startMarker, block.endMarker, block, void 0, owner);
    compactScopeRange(block, own);
    return blockGroups.get(block) ?? own;
  }
  function visitNestedScope(scope) {
    if (seenScopes.has(scope)) return scopeGroups.get(scope) ?? null;
    seenScopes.add(scope);
    const range = liteRanges.get(scope);
    const own = range === void 0 ? null : makeGroup(range.start, range.end, void 0, scope, void 0);
    compactScopeRange(scope, own);
    return scopeGroups.get(scope) ?? own;
  }
  function visitForSlot(state) {
    for (let block = state.head; block !== null; block = block.nextSibling) visitBlock(block);
    if (state.emptyBlock !== null) visitBlock(state.emptyBlock);
  }
  function visitBranchSlot(state) {
    const inner = state.block === null ? null : visitBlock(state.block);
    const outer = makeGroup(state.start, state.end, void 0, void 0, state);
    if (outer !== null && inner !== null && !scopeHasFragmentRef(state.block)) {
      mergeExactRanges(outer, inner);
    }
  }
  function visitSlot(state) {
    const kind = state.__kind;
    if (kind === "componentSlotSlot") {
      if (state.block !== null) visitBlock(state.block, state);
      return;
    }
    if (kind === "childSlot") {
      const child2 = state;
      if (child2.block !== null) visitBlock(child2.block, child2);
      if (child2.forSlot !== null) visitForSlot(child2.forSlot);
      if (child2.portal?.block != null) visitBlock(child2.portal.block);
      return;
    }
    if (kind === "ifBlockSlot" || kind === "switchBlockSlot") {
      visitBranchSlot(state);
      return;
    }
    if (kind === "forBlockSlot") {
      visitForSlot(state);
      return;
    }
    if (kind === "trySlotSlot") {
      const visible = state.block;
      const persistent = state.tryBlock;
      if (visible !== null) visitBlock(visible);
      if (persistent !== null && persistent !== visible) visitBlock(persistent);
      return;
    }
    if (kind === "activityBlockSlot" || kind === "portalSlotSlot") {
      if (state.block !== null) visitBlock(state.block);
      return;
    }
    if (state.block != null) visitBlock(state.block);
  }
  function visitScopeContents(scope) {
    const children = scope.children;
    for (let i = 0; i < children.length; i++) visitNestedScope(children[i].scope);
    const registered = scope._slots;
    if (registered === null) return;
    for (let i = 0; i < registered.length; i++) visitSlot(registered[i]);
  }
  visitBlock(rootBlock);
}
let ROOT_CONTAINER_OWNERS = null;
const ROOT_RENDERABLE_BODY = ((value) => value === void 0 ? null : value);
const EMPTY_ROOT_BODY = (() => void 0);
function assertValidRootContainer(container) {
  if (container === null || typeof container !== "object" || container.nodeType !== 1) {
    throw new Error("Target container is not a DOM element.");
  }
}
function claimRootContainer(container) {
  if (process.env.NODE_ENV === "production") return null;
  const owners = ROOT_CONTAINER_OWNERS ??= /* @__PURE__ */ new WeakMap();
  if (owners.has(container)) {
    console.error(
      "You are calling createRoot() on a container that has already been passed to createRoot() before. Instead, call root.render() on the existing root instead if you want to update it."
    );
  }
  const token = {};
  owners.set(container, token);
  return token;
}
function releaseRootContainer(container, token) {
  if (token !== null && ROOT_CONTAINER_OWNERS?.get(container) === token) {
    ROOT_CONTAINER_OWNERS.delete(container);
  }
}
function warnCreateRootElementOption(options) {
  if (isElementDescriptor(options)) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "You passed a JSX element to createRoot. You probably meant to call root.render instead. Example usage:\n\n  let root = createRoot(domContainer);\n  root.render(<App />);"
      );
    }
    return void 0;
  }
  return options;
}
function warnRootRenderSecondArgument(second, container) {
  if (process.env.NODE_ENV === "production") return;
  if (typeof second === "function") {
    console.error(
      "does not support the second callback argument. To execute a side effect after rendering, declare it in a component body with useEffect()."
    );
  } else if (second === container) {
    console.error(
      "You passed a container to the second argument of root.render(...). You don't need to pass it again since you already passed it to create the root."
    );
  } else {
    console.error(
      "You passed a second argument to root.render(...) but it only accepts one argument."
    );
  }
}
function warnRootUnmountArgument() {
  if (process.env.NODE_ENV !== "production") {
    console.error(
      "does not support a callback argument. To execute a side effect after rendering, declare it in a component body with useEffect()."
    );
  }
}
function warnRootLifecycleUnmount() {
  if (process.env.NODE_ENV !== "production") {
    console.error(
      "Attempted to synchronously unmount a root while Octane was already rendering. Octane cannot finish unmounting the root until the current render has completed, which may lead to a race condition."
    );
  }
}
function makeRoot(container, rootBlock, currentBody, currentKey, idState, outputHandler, ownerToken) {
  let root;
  let unmounted = false;
  let nestedRootRenderChain = -1;
  let nestedRootRenderCount = 0;
  const registerRootDisposer = (block) => {
    let disposing = false;
    DOM_ROOT_DISPOSERS.set(block, () => {
      if (disposing || rootBlock !== block) return;
      disposing = true;
      try {
        root.unmount();
      } finally {
        disposing = false;
      }
    });
  };
  root = {
    render(bodyOrElement, props) {
      if (unmounted) throw new Error("Cannot update an unmounted root.");
      if (inNestedUpdateCallback() || CURRENT_BLOCK !== null) {
        if (nestedRootRenderChain !== UPDATE_CHAIN_ID) {
          nestedRootRenderChain = UPDATE_CHAIN_ID;
          nestedRootRenderCount = 0;
        }
        if (++nestedRootRenderCount > NESTED_UPDATE_LIMIT) {
          if (rootBlock !== null && !rootBlock.disposed) {
            rootBlock.nestedUpdateError = true;
            scheduleRender(rootBlock);
          }
          return;
        }
      } else {
        UPDATE_CHAIN_ID++;
        nestedRootRenderChain = UPDATE_CHAIN_ID;
        nestedRootRenderCount = 0;
      }
      let body;
      let nextKey = null;
      if (isElementDescriptor(bodyOrElement)) {
        if (arguments.length > 1) warnRootRenderSecondArgument(props, container);
        nextKey = bodyOrElement.key ?? null;
        if (typeof bodyOrElement.type === "function") {
          body = bodyOrElement.type;
          props = bodyOrElement.props;
        } else {
          body = ROOT_RENDERABLE_BODY;
          props = bodyOrElement;
        }
      } else if (typeof bodyOrElement === "function") {
        body = bodyOrElement;
      } else {
        body = ROOT_RENDERABLE_BODY;
        if (typeof bodyOrElement === "symbol") {
          if (process.env.NODE_ENV !== "production") {
            console.error(
              `Symbols are not valid as an Octane child.
  root.render(${String(bodyOrElement)})`
            );
          }
          props = null;
        } else {
          props = bodyOrElement;
        }
      }
      if (rootBlock && !rootBlock.disposed && currentBody === body && Object.is(currentKey, nextKey)) {
        rootBlock.props = props;
        if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
          __profileSchedule(rootBlock, "root-render");
        scheduleRender(rootBlock);
        return;
      }
      if (rootBlock) {
        DOM_ROOT_DISPOSERS.delete(rootBlock);
        unmountBlock(rootBlock);
        rootBlock = null;
        currentBody = null;
        currentKey = null;
      }
      while (container.firstChild) container.removeChild(container.firstChild);
      rootBlock = createBlock(
        "root",
        null,
        container,
        null,
        null,
        body,
        props,
        void 0,
        outputHandler
      );
      if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
        __profileTrackComponent(rootBlock, body);
      rootBlock.idState = idState;
      registerRootDisposer(rootBlock);
      currentBody = body;
      currentKey = nextKey;
      if (TRANSITION_DEPTH > 0 || ASYNC_TRANSITION_COUNT > 0) {
        rootBlock.pending = true;
        rootBlock.pendingMode = "transition";
        QUEUE.push(rootBlock);
        if (!syncFlush && !scheduled) {
          scheduled = true;
          queueMicrotask(flush);
        }
        return;
      }
      const mountedRoot = rootBlock;
      try {
        renderBlock(mountedRoot);
      } catch (error) {
        handleRenderError(mountedRoot, error);
        root.unmount();
        return;
      }
      if (!syncFlush && !scheduled) {
        scheduled = true;
        queueMicrotask(flush);
      }
    },
    unmount() {
      if (arguments.length > 0) warnRootUnmountArgument();
      if (unmounted) return;
      if (!inFlush && CURRENT_BLOCK === null && !inNestedUpdateCallback() && EFFECT_EVENT_LIFECYCLE_DEPTH === 0) {
        UPDATE_CHAIN_ID++;
      }
      if (process.env.NODE_ENV !== "production" && (inFlush || CURRENT_BLOCK !== null || EFFECT_BODY_DEPTH > 0 || EFFECT_EVENT_LIFECYCLE_DEPTH > 0)) {
        warnRootLifecycleUnmount();
      }
      unmounted = true;
      try {
        if (rootBlock) {
          DOM_ROOT_DISPOSERS.delete(rootBlock);
          unmountBlock(
            rootBlock,
            /*detachDom*/
            false
          );
          drainRefDetaches();
          container.textContent = "";
          rootBlock = null;
          currentBody = null;
          currentKey = null;
        }
      } finally {
        unregisterDelegationTarget(container);
        releaseRootContainer(container, ownerToken);
      }
    }
  };
  if (rootBlock !== null) registerRootDisposer(rootBlock);
  return root;
}
function createRootWithOutputHandler(container, options, outputHandler) {
  assertValidRootContainer(container);
  options = warnCreateRootElementOption(options);
  const ownerToken = claimRootContainer(container);
  registerDelegationTarget(container);
  return makeRoot(
    container,
    null,
    null,
    null,
    {
      prefix: (options?.identifierPrefix ?? "") + "r" + (nextClientRootId++).toString(36) + "-",
      next: 0
    },
    outputHandler,
    ownerToken
  );
}
function createRoot(container, options) {
  return createRootWithOutputHandler(container, options, renderReturnedValue);
}
function __createVoidRoot(container, options) {
  return createRootWithOutputHandler(container, options, null);
}
function hydrateRoot(container, bodyOrElement, propsOrOptions, rootOptions) {
  assertValidRootContainer(container);
  let body;
  let props;
  let rootKey = null;
  if (isElementDescriptor(bodyOrElement)) {
    rootKey = bodyOrElement.key ?? null;
    if (typeof bodyOrElement.type === "function") {
      body = bodyOrElement.type;
      props = bodyOrElement.props;
    } else {
      body = ROOT_RENDERABLE_BODY;
      props = bodyOrElement;
    }
    rootOptions = propsOrOptions;
  } else if (bodyOrElement === void 0) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "Must provide initial children as second argument to hydrateRoot. Example usage: hydrateRoot(domContainer, <App />)"
      );
    }
    body = EMPTY_ROOT_BODY;
    props = void 0;
  } else if (typeof bodyOrElement === "function") {
    body = bodyOrElement;
    props = propsOrOptions;
  } else {
    body = ROOT_RENDERABLE_BODY;
    props = bodyOrElement;
  }
  const ownerToken = claimRootContainer(container);
  registerDelegationTarget(container);
  const rootBlock = createBlock(
    "root",
    null,
    container,
    null,
    null,
    body,
    props,
    void 0,
    renderReturnedValue
  );
  if (typeof __OCTANE_PROFILE_ENABLED__ !== "undefined" && __OCTANE_PROFILE_ENABLED__)
    __profileTrackComponent(rootBlock, body);
  const idState = {
    prefix: rootOptions?.identifierPrefix ?? "",
    next: 0
  };
  rootBlock.idState = idState;
  let hydrationCompleted = false;
  let seeds = null;
  const seedScript = container.querySelector("script[" + SUSPENSE_SCRIPT_ATTR + "]");
  if (seedScript !== null) {
    seeds = parseSeedJson(seedScript.textContent || "[]");
    seedScript.remove();
  }
  for (let child2 = container.firstElementChild; child2 !== null; ) {
    const next = child2.nextElementSibling;
    if (child2.localName === "script" && child2.hasAttribute(STREAM_SCRIPT_ATTR)) child2.remove();
    child2 = next;
  }
  let firstNode = container.firstChild;
  while (firstNode !== null && isRendererHydrationStyle(firstNode)) {
    firstNode = firstNode.nextSibling;
  }
  const hydration = new HydrationCapability(rootBlock, firstNode, seeds);
  hydration.passthroughRanges = body[HYDRATION_RANGE_BOUNDARY] === "passthrough";
  const previousHydration = currentHydration;
  currentHydration = hydration;
  try {
    renderBlock(rootBlock);
    drainHydrationRenderPhaseUpdates(rootBlock);
    if (hydration.deferredActivities.length !== 0) {
      hydration.suspend(() => {
        for (let i = 0; i < hydration.deferredActivities.length; i++)
          hydration.deferredActivities[i]();
      });
    }
    hydration.flushClassWrites();
    hydration.flushTextWarnings();
    hydration.finishRoot();
    hydrationCompleted = true;
  } finally {
    currentHydration = previousHydration;
  }
  if (hydrationCompleted && hydration.hasAdjacentRangePair) hydration.coalesce();
  if (!syncFlush && !scheduled) {
    scheduled = true;
    queueMicrotask(flush);
  }
  return makeRoot(container, rootBlock, body, rootKey, idState, renderReturnedValue, ownerToken);
}
const _resourceHints = /* @__PURE__ */ new Set();
function insertHeadHint(key, build) {
  if (typeof document === "undefined" || _resourceHints.has(key)) return;
  const existing = document.head.querySelectorAll("[data-oct-hint]");
  for (let i = 0; i < existing.length; i++) {
    if (existing[i].getAttribute("data-oct-hint") === key) {
      _resourceHints.add(key);
      return;
    }
  }
  const el = build();
  el.setAttribute("data-oct-hint", key);
  document.head.appendChild(el);
  _resourceHints.add(key);
}
function applyHintAttrs(el, opts) {
  if (opts == null) return;
  for (const k in opts) {
    const v = opts[k];
    if (v == null || v === false) continue;
    const name = k === "crossOrigin" ? "crossorigin" : k.toLowerCase();
    const value = v === true ? "" : String(v);
    el.setAttribute(name, sanitizeURLAttribute(el.localName, name, value));
  }
}
function preload(href, options) {
  if (!href || !options?.as) return;
  const rawHref = typeof href === "string" ? href : String(href);
  const safeHref = sanitizeURL(rawHref);
  insertHeadHint("preload:" + options.as + ":" + rawHref, () => {
    const l = document.createElement("link");
    l.rel = "preload";
    l.href = safeHref;
    applyHintAttrs(l, options);
    return l;
  });
}
function preinit(href, options) {
  if (!href || !options?.as) return;
  const as = options.as;
  const rawHref = typeof href === "string" ? href : String(href);
  const safeHref = sanitizeURL(rawHref);
  insertHeadHint("preinit:" + as + ":" + rawHref, () => {
    if (as === "style") {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = safeHref;
      applyHintAttrs(l, { ...options, as: void 0 });
      return l;
    }
    const s = document.createElement("script");
    s.src = safeHref;
    s.async = true;
    applyHintAttrs(s, { ...options, as: void 0 });
    return s;
  });
}
function preconnect(href, options) {
  if (!href) return;
  const rawHref = typeof href === "string" ? href : String(href);
  const safeHref = sanitizeURL(rawHref);
  insertHeadHint("preconnect:" + rawHref, () => {
    const l = document.createElement("link");
    l.rel = "preconnect";
    l.href = safeHref;
    applyHintAttrs(l, options);
    return l;
  });
}
function prefetchDNS(href) {
  if (!href) return;
  const rawHref = typeof href === "string" ? href : String(href);
  const safeHref = sanitizeURL(rawHref);
  insertHeadHint("dns-prefetch:" + rawHref, () => {
    const l = document.createElement("link");
    l.rel = "dns-prefetch";
    l.href = safeHref;
    return l;
  });
}
export {
  Activity,
  Children,
  EXTERNAL_HYDRATION_PROMISE,
  ErrorBoundary,
  Fragment,
  FragmentInstance,
  HMR,
  HYDRATION_RANGE_BOUNDARY,
  Suspense,
  ViewTransition,
  ViewTransitionPseudoElement,
  __createVoidRoot,
  __useReducerWithGetter,
  __useStateWithGetter,
  __vtSeen,
  act,
  activityBlock,
  addTransitionType,
  attachRef,
  bag0,
  bag1,
  bag10,
  bag11,
  bag12,
  bag13,
  bag14,
  bag15,
  bag16,
  bag2,
  bag3,
  bag4,
  bag5,
  bag6,
  bag7,
  bag8,
  bag9,
  bagOf,
  bindRendererRegionOwner,
  child,
  childSlot,
  childTextHole,
  clone,
  cloneElement,
  compilerCacheContext,
  componentSlot,
  componentSlotLite,
  componentSlotVoid,
  createContext,
  createElement,
  createPortal,
  createRoot,
  delegateCaptureEvents,
  delegateEvents,
  drainFrag,
  drainPassiveEffects,
  evt0,
  evt0u,
  evt1,
  evt1u,
  evt2,
  evt2u,
  evtN,
  evtNu,
  flushSync,
  forBlock,
  getTransitionFallbackTimeout,
  hasPendingWork,
  headBlock,
  hmr,
  hookSlots,
  hostComponent,
  htext,
  htextSwap,
  hydrateRoot,
  ifBlock,
  injectStyle,
  isChildrenBlock,
  isValidElement,
  lazy,
  markChildrenBlock,
  markDangerouslySetInnerHTMLChildren,
  memo,
  mountFragmentRef,
  namespaceHead,
  namespaceHeadElement,
  normalizeClass,
  portal,
  positionalChildren,
  preconnect,
  prefetchDNS,
  preinit,
  preload,
  provideContext,
  queueRefAttach,
  queueRefDetach,
  readContextFromScope,
  renderBlock,
  requestFormReset,
  setAttribute,
  setAutoFocus,
  setChecked,
  setCheckedCheckable,
  setClassAttr,
  setClassName,
  setDangerouslySetInnerHTML,
  setDangerouslySetInnerHTMLSources,
  setDefaultChecked,
  setDefaultValue,
  setDefaultValueUncontrolled,
  setFormAction,
  setFormControlSources,
  setHTML,
  setHostPropSources,
  setIsOctaneActEnvironment,
  setScriptText,
  setSelectValue,
  setSpread,
  setStringData,
  setStyle,
  setText,
  setTransitionFallbackTimeout,
  setValue,
  sibling,
  snapshotSpread,
  startTransition,
  switchBlock,
  template,
  textHole,
  textSlot,
  tryBlock,
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
  useRendererThenable,
  useState,
  useSyncExternalStore,
  useTransition,
  warmChild,
  warmMemo,
  withSlot
};
