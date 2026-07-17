const componentMetadata = /* @__PURE__ */ new WeakMap();
const componentSources = /* @__PURE__ */ new WeakMap();
const hookMetadata = /* @__PURE__ */ new Map();
const fallbackMetadata = /* @__PURE__ */ new WeakMap();
const trackedComponents = /* @__PURE__ */ new WeakMap();
let instances = /* @__PURE__ */ new WeakMap();
let pending = /* @__PURE__ */ new WeakMap();
let nextInstanceId = 1;
let nextFallbackId = 1;
let currentFrame = null;
let active = true;
let recordingGeneration = 0;
let timeline = true;
let bufferSize = 1e4;
let eventBuffer = [];
let eventHead = 0;
let eventCount = 0;
let pendingTimelineEvents = [];
const MAX_CAUSES = 8;
function now() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}
function source(file, line, column) {
  return line > 0 ? `${file}:${line}:${column}` : file;
}
function causeKey(cause) {
  return `${cause.type}\0${cause.hook ?? ""}\0${cause.source ?? ""}`;
}
function addCause(target, cause) {
  const key = causeKey(cause);
  if (target.has(key) || target.size >= MAX_CAUSES) return;
  target.set(key, cause);
}
function installGlobal() {
  const target = globalThis;
  try {
    if (target.__OCTANE_PROFILER__ !== profiler) target.__OCTANE_PROFILER__ = profiler;
  } catch {
  }
}
function registeredMetadataFor(component) {
  let current = component;
  for (let depth = 0; depth < 32; depth++) {
    const registered = componentMetadata.get(current);
    if (registered !== void 0) return registered;
    const next = componentSources.get(current);
    if (next === void 0 || next === current) return void 0;
    current = next;
  }
  return void 0;
}
function metadataFor(component) {
  const registered = registeredMetadataFor(component);
  if (registered !== void 0) return registered;
  let fallback = fallbackMetadata.get(component);
  if (fallback === void 0) {
    const name = component.name || "<anonymous>";
    fallback = {
      id: `runtime#${name}:${nextFallbackId++}`,
      name,
      file: "<runtime>",
      line: 0,
      column: 0,
      kind: "component"
    };
    fallbackMetadata.set(component, fallback);
  }
  return fallback;
}
function instanceFor(subject) {
  let instance = instances.get(subject);
  if (instance === void 0) {
    instance = { id: nextInstanceId++, attempts: 0 };
    instances.set(subject, instance);
  }
  return instance;
}
function consumePending(subject) {
  const entry = pending.get(subject);
  if (entry === void 0) return { causes: [], queueDelay: 0, scheduled: false };
  pending.delete(subject);
  return {
    causes: Array.from(entry.causes.values()),
    queueDelay: Math.max(0, now() - entry.scheduledAt),
    scheduled: true
  };
}
function orderedEvents() {
  const ordered = new Array(eventCount);
  for (let index = 0; index < eventCount; index++) {
    ordered[index] = eventBuffer[(eventHead + index) % bufferSize];
  }
  return ordered;
}
function resizeEventBuffer(nextSize) {
  const retained = orderedEvents().slice(-nextSize);
  bufferSize = nextSize;
  eventBuffer = retained;
  eventHead = 0;
  eventCount = retained.length;
}
function pushEvent(event) {
  if (eventCount < bufferSize) {
    eventBuffer[(eventHead + eventCount) % bufferSize] = event;
    eventCount++;
  } else {
    eventBuffer[eventHead] = event;
    eventHead = (eventHead + 1) % bufferSize;
  }
  if (!timeline) return;
  pendingTimelineEvents.push(event);
  if (currentFrame !== null) return;
  const completed = pendingTimelineEvents;
  pendingTimelineEvents = [];
  let consoleTarget;
  let stamp;
  try {
    consoleTarget = globalThis.console;
    stamp = consoleTarget?.timeStamp;
  } catch {
    return;
  }
  if (typeof stamp !== "function") return;
  for (const completedEvent of completed) {
    try {
      stamp.call(
        consoleTarget,
        `${completedEvent.component} (${completedEvent.phase})`,
        completedEvent.startTime,
        completedEvent.startTime + completedEvent.duration,
        "Components",
        "Octane",
        completedEvent.outcome === "errored" ? "error" : completedEvent.outcome === "suspended" ? "tertiary-light" : "primary-light"
      );
    } catch {
    }
  }
}
function isSuspension(value) {
  return typeof value === "object" && value !== null && value.__isSuspense === true;
}
function __profileComponent(component, metadata) {
  if (component.name === "" && metadata.name !== "") {
    try {
      Object.defineProperty(component, "name", {
        value: metadata.name,
        writable: false,
        enumerable: false,
        configurable: true
      });
    } catch {
    }
  }
  componentMetadata.set(component, Object.freeze({ ...metadata }));
  installGlobal();
  return component;
}
function __profileComponentSource(wrapper, source2) {
  componentSources.set(wrapper, source2);
  const metadata = componentMetadata.get(source2);
  if (metadata !== void 0) componentMetadata.set(wrapper, metadata);
  return wrapper;
}
function __profileHook(slot, metadata) {
  hookMetadata.set(slot, Object.freeze({ ...metadata }));
  installGlobal();
  return slot;
}
function __profileResolveHook(slot, sourceSlot) {
  const metadata = sourceSlot === void 0 ? void 0 : hookMetadata.get(sourceSlot);
  if (metadata !== void 0) hookMetadata.set(slot, metadata);
  return slot;
}
function __profileHasComponentMetadata(component) {
  return registeredMetadataFor(component) !== void 0;
}
function __profileTrackComponent(subject, component) {
  if (component === null) trackedComponents.delete(subject);
  else trackedComponents.set(subject, component);
}
function __profileSchedule(subject, type, slot) {
  if (!active) return;
  let entry = pending.get(subject);
  if (entry === void 0) {
    entry = { causes: /* @__PURE__ */ new Map(), scheduledAt: now() };
    pending.set(subject, entry);
  }
  const hook = typeof slot === "symbol" ? hookMetadata.get(slot) : void 0;
  addCause(entry.causes, {
    type,
    ...hook === void 0 ? null : { hook: hook.name, source: source(hook.file, hook.line, hook.column) }
  });
}
function __profileBeginRender(subject, _component, mounted) {
  if (!active) return null;
  const component = trackedComponents.get(subject);
  if (component === void 0) return null;
  installGlobal();
  const consumed = consumePending(subject);
  const phase = mounted ? "update" : "mount";
  const deduped = /* @__PURE__ */ new Map();
  if (phase === "mount") addCause(deduped, { type: "mount" });
  else if (currentFrame !== null && currentFrame.subject !== subject)
    addCause(deduped, { type: "parent" });
  for (const cause of consumed.causes) addCause(deduped, cause);
  if (deduped.size === 0) addCause(deduped, { type: "unknown" });
  const instance = instanceFor(subject);
  instance.attempts++;
  const frame = {
    subject,
    metadata: metadataFor(component),
    instance,
    startTime: now(),
    childDuration: 0,
    phase,
    causes: Array.from(deduped.values()),
    queueDelay: consumed.queueDelay,
    scheduled: consumed.scheduled,
    parent: currentFrame,
    generation: recordingGeneration
  };
  currentFrame = frame;
  return frame;
}
function __profileEndRender(frame, didThrow, thrown) {
  if (frame === null) return;
  const shouldRecord = active && frame.generation === recordingGeneration;
  currentFrame = shouldRecord ? frame.parent : null;
  if (!shouldRecord) return;
  const endTime = now();
  const duration = Math.max(0, endTime - frame.startTime);
  const outcome = !didThrow ? "completed" : isSuspension(thrown) ? "suspended" : "errored";
  const event = {
    type: "component-render",
    componentId: frame.metadata.id,
    component: frame.metadata.name,
    file: frame.metadata.file,
    line: frame.metadata.line,
    column: frame.metadata.column,
    instanceId: frame.instance.id,
    attempt: frame.instance.attempts,
    phase: frame.phase,
    outcome,
    causes: frame.causes,
    startTime: frame.startTime,
    duration,
    selfDuration: Math.max(0, duration - frame.childDuration),
    queueDelay: frame.queueDelay,
    scheduled: frame.scheduled
  };
  if (frame.parent !== null) frame.parent.childDuration += duration;
  pushEvent(event);
}
function __profileBail(subject, component, kind) {
  if (!active) return;
  const tracked = trackedComponents.get(subject);
  if (tracked === void 0) return;
  component = tracked;
  installGlobal();
  const metadata = metadataFor(component);
  const instance = instanceFor(subject);
  const deduped = /* @__PURE__ */ new Map();
  addCause(deduped, { type: kind });
  if (currentFrame !== null && currentFrame.subject !== subject)
    addCause(deduped, { type: "parent" });
  const startTime = now();
  pushEvent({
    type: "component-bailout",
    componentId: metadata.id,
    component: metadata.name,
    file: metadata.file,
    line: metadata.line,
    column: metadata.column,
    instanceId: instance.id,
    attempt: instance.attempts,
    phase: "update",
    outcome: "bailout",
    causes: Array.from(deduped.values()),
    startTime,
    duration: 0,
    selfDuration: 0,
    queueDelay: 0,
    scheduled: false
  });
}
function eventMatches(event, target) {
  if (typeof target === "function") return event.componentId === metadataFor(target).id;
  return event.component === target || event.componentId === target;
}
const profiler = {
  start(options) {
    if (options?.bufferSize !== void 0) {
      if (!Number.isSafeInteger(options.bufferSize) || options.bufferSize < 1)
        throw new RangeError("Octane profiler bufferSize must be a positive finite integer.");
      resizeEventBuffer(options.bufferSize);
    }
    if (options?.timeline !== void 0) {
      timeline = options.timeline;
      if (!timeline) pendingTimelineEvents = [];
    }
    active = true;
    installGlobal();
  },
  stop() {
    active = false;
    recordingGeneration++;
    currentFrame = null;
    pending = /* @__PURE__ */ new WeakMap();
    pendingTimelineEvents = [];
  },
  clear() {
    eventBuffer = [];
    eventHead = 0;
    eventCount = 0;
    pendingTimelineEvents = [];
    pending = /* @__PURE__ */ new WeakMap();
    instances = /* @__PURE__ */ new WeakMap();
    nextInstanceId = 1;
    recordingGeneration++;
    currentFrame = null;
  },
  getEvents() {
    return orderedEvents().map((event) => ({
      ...event,
      causes: event.causes.map((cause) => ({ ...cause }))
    }));
  },
  summary() {
    const summaries = /* @__PURE__ */ new Map();
    for (const event of orderedEvents()) {
      let summary = summaries.get(event.componentId);
      if (summary === void 0) {
        summary = {
          componentId: event.componentId,
          component: event.component,
          file: event.file,
          attempts: 0,
          completed: 0,
          suspended: 0,
          errored: 0,
          bails: 0,
          totalTime: 0,
          totalSelfTime: 0,
          averageSelfTime: 0,
          maxInclusiveTime: 0,
          averageQueueDelay: 0,
          dominantCause: null,
          queueDelayTotal: 0,
          queueDelayCount: 0,
          causes: /* @__PURE__ */ new Map()
        };
        summaries.set(event.componentId, summary);
      }
      if (event.type === "component-bailout") summary.bails++;
      else {
        summary.attempts++;
        summary[event.outcome]++;
        summary.totalTime += event.duration;
        summary.totalSelfTime += event.selfDuration;
        summary.maxInclusiveTime = Math.max(summary.maxInclusiveTime, event.duration);
      }
      if (event.scheduled) {
        summary.queueDelayTotal += event.queueDelay;
        summary.queueDelayCount++;
      }
      for (const cause of event.causes)
        summary.causes.set(cause.type, (summary.causes.get(cause.type) ?? 0) + 1);
    }
    return Array.from(summaries.values()).map((summary) => {
      let dominantCause = null;
      let dominantCount = 0;
      for (const [cause, count] of summary.causes) {
        if (count > dominantCount) {
          dominantCause = cause;
          dominantCount = count;
        }
      }
      const { queueDelayTotal, queueDelayCount, causes: _causes, ...publicSummary } = summary;
      return {
        ...publicSummary,
        averageSelfTime: summary.attempts === 0 ? 0 : summary.totalSelfTime / summary.attempts,
        averageQueueDelay: queueDelayCount === 0 ? 0 : queueDelayTotal / queueDelayCount,
        dominantCause
      };
    }).sort((a, b) => b.totalSelfTime - a.totalSelfTime);
  },
  why(component) {
    return orderedEvents().filter((event) => eventMatches(event, component)).map((event) => ({ ...event, causes: event.causes.map((cause) => ({ ...cause })) }));
  },
  exportTrace() {
    return {
      displayTimeUnit: "ms",
      traceEvents: orderedEvents().map((event) => ({
        name: `${event.component} (${event.phase})`,
        cat: "octane.component",
        ph: "X",
        pid: 1,
        tid: 1,
        ts: event.startTime * 1e3,
        dur: event.duration * 1e3,
        args: {
          componentId: event.componentId,
          instanceId: event.instanceId,
          attempt: event.attempt,
          outcome: event.outcome,
          causes: event.causes.map((cause) => ({ ...cause })),
          source: source(event.file, event.line, event.column),
          selfDuration: event.selfDuration,
          queueDelay: event.queueDelay,
          scheduled: event.scheduled
        }
      }))
    };
  }
};
export {
  __profileBail,
  __profileBeginRender,
  __profileComponent,
  __profileComponentSource,
  __profileEndRender,
  __profileHasComponentMetadata,
  __profileHook,
  __profileResolveHook,
  __profileSchedule,
  __profileTrackComponent,
  profiler
};
