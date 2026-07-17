import {
  BLOCK_OPEN,
  BLOCK_CLOSE,
  FOR_BLOCK_OPEN_EMPTY,
  FOR_BLOCK_OPEN_ITEMS,
  EMPTY_COMMENT,
  SUSPENSE_SCRIPT_ATTR,
  SUSPENSE_SEED_WIRE_PREFIX,
  REJECTION_SENTINEL_KEY,
  EXTERNAL_HYDRATION_PROMISE,
  HYDRATION_RANGE_BOUNDARY,
  STREAM_BOUNDARY_ATTR,
  STREAM_SEGMENT_ATTR,
  STREAM_SEED_ATTR,
  STREAM_SCRIPT_ATTR,
  STREAM_SEED_COMMENT,
  POSITIVE_NUMERIC_ATTR_PROPS,
  BOOLEAN_ATTR_PROPS,
  MUST_USE_PROPERTY_PROPS,
  VALID_ATTR_NAME,
  isEnumeratedBooleanAttr,
  cssStyleValue,
  ATTRIBUTE_ALIASES,
  SVG_ONLY_TAGS,
  VOID_ELEMENTS
} from "./constants.js";
import { normalizeClass, styleName } from "./css.js";
import {
  invalidHtmlNestingWithAncestor,
  invalidHtmlNestingWithParent
} from "./html-tree-validation.js";
import { sanitizeURL, sanitizeURLAttribute } from "./sanitize-url.js";
const SVG_ONLY_LOWERCASE_TAGS = new Set(Array.from(SVG_ONLY_TAGS, (tag) => tag.toLowerCase()));
let CURRENT_SCOPE = null;
let ID_COUNTER = 0;
let ID_PREFIX = "";
let CSS = null;
let MARKERS = true;
let HEAD = null;
let SUSPENDED = null;
let RESOLVED = null;
let SERIAL = null;
let FRAME = null;
let DEFERRED = null;
let CURRENT_COMP = null;
let CURRENT_PROPS = null;
let CURRENT_PARENT_SCOPE = null;
let ASYNC_SCOPE = "";
let CURRENT_SSR_ELEMENT = null;
let SSR_NESTING_WARNINGS = null;
function framePath(f) {
  if (f.path !== null) return f.path;
  const p = f.parent === null ? "" : framePath(f.parent) + "/" + f.seg;
  f.path = p;
  return p;
}
function asyncFramePath(frame) {
  return (frame === null ? "" : framePath(frame)) + ASYNC_SCOPE;
}
function nextFrameOccurrence(frame, base) {
  if (frame.occ === null) frame.occ = /* @__PURE__ */ new Map();
  const scopedBase = ASYNC_SCOPE === frame.asyncScope ? base : ASYNC_SCOPE + "\0" + base;
  const next = frame.occ.get(scopedBase) ?? 0;
  frame.occ.set(scopedBase, next + 1);
  return next;
}
function nextChildSegment(frame) {
  if (ASYNC_SCOPE === frame.asyncScope) return frame.nextChild++;
  if (frame.scopedChildren === null) frame.scopedChildren = /* @__PURE__ */ new Map();
  const next = frame.scopedChildren.get(ASYNC_SCOPE) ?? 0;
  frame.scopedChildren.set(ASYNC_SCOPE, next + 1);
  return next;
}
function ssrScope(parent) {
  return { parent, $$ctxValues: null };
}
function parserNamespacesForTag(tag, inherited) {
  const semanticTag = tag.toLowerCase();
  const namespace = semanticTag === "svg" ? "svg" : semanticTag === "math" ? "mathml" : inherited === "html" && SVG_ONLY_LOWERCASE_TAGS.has(semanticTag) ? "svg" : inherited;
  const childrenNamespace = semanticTag === "foreignobject" ? "html" : semanticTag === "svg" ? "svg" : semanticTag === "math" ? "mathml" : inherited === "html" && SVG_ONLY_LOWERCASE_TAGS.has(semanticTag) ? "svg" : inherited;
  return { namespace, childrenNamespace };
}
function ssrElementNamespaces(tag, parent) {
  return parserNamespacesForTag(tag, parent?.childrenNamespace ?? FRAME?.namespace ?? "html");
}
function reportInvalidHtmlNesting(message) {
  const warning = "Octane SSR invalid HTML nesting: " + message + "\n\nThe browser will repair this HTML before hydration. This can shift content and cause a hydration mismatch.";
  let seen = SSR_NESTING_WARNINGS;
  if (seen === null) return;
  if (seen === void 0) {
    seen = /* @__PURE__ */ new Set();
    SSR_NESTING_WARNINGS = seen;
    if (RESOLVED !== null) RESOLVED.nestingWarnings = seen;
  }
  if (seen.has(warning)) return;
  seen.add(warning);
  console.error(warning);
}
function ssrElement(tag, location, render) {
  if (process.env.NODE_ENV === "production" || SSR_NESTING_WARNINGS === null) return render();
  const parent = CURRENT_SSR_ELEMENT;
  const { namespace, childrenNamespace } = ssrElementNamespaces(tag, parent);
  const semanticTag = tag.toLowerCase();
  const element = {
    tag: semanticTag,
    parent,
    namespace,
    childrenNamespace,
    location
  };
  if (namespace === "html" && parent?.namespace === "html") {
    const parentMessage = invalidHtmlNestingWithParent(
      semanticTag,
      parent.tag,
      location,
      parent.location
    );
    if (parentMessage !== null) reportInvalidHtmlNesting(parentMessage);
    let ancestor = parent.parent;
    const ancestors = [parent.tag];
    while (ancestor !== null && ancestor.namespace === "html") {
      ancestors.push(ancestor.tag);
      const ancestorMessage = invalidHtmlNestingWithAncestor(
        semanticTag,
        ancestors,
        location,
        ancestor.location
      );
      if (ancestorMessage !== null) reportInvalidHtmlNesting(ancestorMessage);
      ancestor = ancestor.parent;
    }
  }
  CURRENT_SSR_ELEMENT = element;
  try {
    return render();
  } finally {
    CURRENT_SSR_ELEMENT = parent;
  }
}
const NOOP = () => {
};
const ELEMENT_TAG = /* @__PURE__ */ Symbol.for("octane.element");
const PORTAL_TAG = /* @__PURE__ */ Symbol.for("octane.portal");
const Fragment = /* @__PURE__ */ Symbol.for("octane.Fragment");
const Activity = /* @__PURE__ */ Symbol.for("octane.Activity");
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
    if (name !== "key" && Object.prototype.hasOwnProperty.call(config, name)) {
      props[name] = config[name];
    }
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
  const key = hasElementConfigKey(src) ? "" + src.key : null;
  let kids = children.length > 0 ? children.length === 1 ? children[0] : children : src?.children;
  if (children.length > 1) POSITIONAL_CHILDREN.add(children);
  if (children.length > 1 && process.env.NODE_ENV !== "production") Object.freeze(children);
  const p = copyElementConfig(src);
  if (children.length > 0) p.children = kids;
  applyElementDefaultProps(type, p);
  kids = p.children;
  return finalizeElementDescriptor({
    $$kind: ELEMENT_TAG,
    type,
    props: p,
    key,
    ref: p.ref !== void 0 ? p.ref : null,
    children: kids ?? null
  });
}
const POSITIONAL_CHILDREN = /* @__PURE__ */ new WeakSet();
function positionalChildren(children) {
  POSITIONAL_CHILDREN.add(children);
  return children;
}
function isElementDescriptor(v) {
  return v != null && v.$$kind === ELEMENT_TAG;
}
function isFragmentDescriptor(value) {
  return isElementDescriptor(value) && value.type === Fragment;
}
function fragmentDescriptorChildren(value) {
  const children = value.children;
  if (children == null) return [];
  return Array.isArray(children) ? children : [children];
}
function ssrDeoptWrapperKind(value) {
  return POSITIONAL_CHILDREN.has(value) ? "fragment" : "array";
}
function ssrDeoptKey(item, index) {
  return isElementDescriptor(item) && item.key != null ? item.key : index;
}
function scopedSsrDeoptKey(path, item, index, key) {
  const explicit = isElementDescriptor(item) && item.key != null;
  return JSON.stringify([path, explicit ? "key" : "index", explicit ? String(key) : index]);
}
function flattenSsrChildContainer(outItems, outKeys, children, kind, path) {
  const count = children.length;
  for (let i = 0; i < count; i++) {
    const item = children[i];
    if (isFragmentDescriptor(item)) {
      const nested = fragmentDescriptorChildren(item);
      if (item.key != null) {
        flattenSsrChildContainer(outItems, outKeys, nested, "fragment", [
          ...path,
          "keyed-fragment",
          item.key
        ]);
      } else {
        const nestedPath = kind === "fragment" ? [...path, "wrapper", count === 1 ? 0 : i] : count === 1 ? path : [...path, "position", i, "fragment"];
        flattenSsrChildContainer(outItems, outKeys, nested, "fragment", nestedPath);
      }
      continue;
    }
    if (Array.isArray(item)) {
      const nestedKind = ssrDeoptWrapperKind(item);
      const nestedPath = nestedKind === kind ? [...path, "wrapper", count === 1 ? 0 : i] : count === 1 ? path : [...path, "position", i, nestedKind];
      flattenSsrChildContainer(outItems, outKeys, item, nestedKind, nestedPath);
      continue;
    }
    outItems.push(item);
    outKeys.push(scopedSsrDeoptKey(path, item, i, ssrDeoptKey(item, i)));
  }
}
function prepareSsrDeoptList(value, includeKeyedSingle) {
  const items = [];
  const keys = [];
  if (isFragmentDescriptor(value)) {
    const path = value.key == null ? [] : ["keyed-fragment", value.key];
    flattenSsrChildContainer(items, keys, fragmentDescriptorChildren(value), "fragment", path);
    return { items, keys };
  }
  if (Array.isArray(value)) {
    flattenSsrChildContainer(items, keys, value, ssrDeoptWrapperKind(value), []);
    return { items, keys };
  }
  if (includeKeyedSingle && isElementDescriptor(value) && value.key != null) {
    items.push(value);
    keys.push(scopedSsrDeoptKey([], value, 0, value.key));
    return { items, keys };
  }
  return null;
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
  if (config != null) {
    if (hasElementConfigKey(config)) key = "" + config.key;
    for (const name in config) {
      if (name === "key") continue;
      if (name === "ref" && config.ref === void 0) continue;
      if (Object.prototype.hasOwnProperty.call(config, name)) props[name] = config[name];
    }
  }
  const n = children.length;
  let kids;
  if (n === 1) {
    kids = children[0];
  } else if (n > 1) {
    kids = children;
  } else {
    kids = "children" in props ? props.children : element.children;
  }
  if (n > 0) props.children = kids;
  return finalizeElementDescriptor({
    $$kind: ELEMENT_TAG,
    type: element.type,
    props,
    key,
    ref: props.ref !== void 0 ? props.ref : null,
    children: kids ?? null
  });
}
function cloneAndReplaceElementKey(element, key) {
  return finalizeElementDescriptor({
    $$kind: ELEMENT_TAG,
    type: element.type,
    props: element.props,
    key,
    ref: element.ref,
    children: element.children
  });
}
function escapeElementKey(key) {
  return "$" + key.replace(/[=:]/g, (match) => match === "=" ? "=0" : "=2");
}
function escapeMappedElementKey(key) {
  return key.replace(/\/+/g, "$&/");
}
function childElementKey(child, index) {
  return child != null && typeof child === "object" && child.key != null ? escapeElementKey("" + child.key) : index.toString(36);
}
function childrenIterator(children) {
  if (children == null || typeof children !== "object") return null;
  const iterator = typeof Symbol === "function" && children[Symbol.iterator] || children["@@iterator"];
  return typeof iterator === "function" ? iterator : null;
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
function resolveChildrenThenable(thenable) {
  if (FRAME !== null) return use(thenable);
  if (thenable.status === void 0) {
    thenable.status = "pending";
    thenable.then(
      (value) => {
        if (thenable.status === "pending") {
          thenable.status = "fulfilled";
          thenable.value = value;
        }
      },
      (reason) => {
        if (thenable.status === "pending") {
          thenable.status = "rejected";
          thenable.reason = reason;
        }
      }
    );
  }
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
function invalidChildError(child) {
  const found = describeObjectForError(child);
  return new Error(
    "Objects are not valid as an Octane child (found: " + found + "). If you meant to render a collection of children, use an array instead."
  );
}
function mapIntoChildren(children, out, escapedPrefix, nameSoFar, callback) {
  let type = typeof children;
  if (type === "undefined" || type === "boolean") {
    children = null;
    type = "object";
  }
  const isLeaf = children === null || type === "string" || type === "number" || type === "bigint" || isElementDescriptor(children) || children != null && children.$$kind === PORTAL_TAG;
  if (isLeaf) {
    const child = children;
    let mapped = callback(child);
    const childKey = nameSoFar === "" ? "." + childElementKey(child, 0) : nameSoFar;
    if (Array.isArray(mapped)) {
      mapIntoChildren(mapped, out, escapeMappedElementKey(childKey) + "/", "", (value) => value);
    } else if (mapped != null) {
      if (isElementDescriptor(mapped)) {
        const mappedKey = mapped.key;
        mapped = cloneAndReplaceElementKey(
          mapped,
          escapedPrefix + (mappedKey != null && (!child || child.key !== mappedKey) ? escapeMappedElementKey("" + mappedKey) + "/" : "") + childKey
        );
      }
      out.push(mapped);
    }
    return 1;
  }
  let count = 0;
  const nextPrefix = nameSoFar === "" ? "." : nameSoFar + ":";
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      count += mapIntoChildren(
        child,
        out,
        escapedPrefix,
        nextPrefix + childElementKey(child, i),
        callback
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
      const child = step.value;
      count += mapIntoChildren(
        child,
        out,
        escapedPrefix,
        nextPrefix + childElementKey(child, i++),
        callback
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
        callback
      );
    }
    throw invalidChildError(children);
  }
  return 0;
}
const Children = {
  forEach(children, fn, context) {
    if (children == null) return;
    let index = 0;
    mapIntoChildren(children, [], "", "", (child) => {
      fn.call(context, child, index++);
      return null;
    });
  },
  map(children, fn, context) {
    if (children == null) return children;
    const out = [];
    let index = 0;
    mapIntoChildren(children, out, "", "", (child) => fn.call(context, child, index++));
    return out;
  },
  count(children) {
    if (children == null) return 0;
    return mapIntoChildren(children, [], "", "", () => null);
  },
  toArray(children) {
    const out = [];
    if (children != null) mapIntoChildren(children, out, "", "", (child) => child);
    return out;
  },
  only(children) {
    if (!isElementDescriptor(children)) {
      throw new Error("Children.only expected to receive a single element child.");
    }
    return children;
  }
};
function createPortal(body, target, props = void 0) {
  return { $$kind: PORTAL_TAG, body, target, props };
}
const HTML_ESCAPE_RE = /[&<>]/g;
function escapeHtml(v) {
  const s = typeof v === "string" ? v : String(v);
  HTML_ESCAPE_RE.lastIndex = 0;
  if (!HTML_ESCAPE_RE.test(s)) return s;
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const ATTR_ESCAPE_RE = /[&"]/g;
function escapeAttr(v) {
  const s = typeof v === "string" ? v : String(v);
  ATTR_ESCAPE_RE.lastIndex = 0;
  if (!ATTR_ESCAPE_RE.test(s)) return s;
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
let DANGER_HTML_CHILD_PROBE = 0;
function probingDangerHtmlChild(value) {
  if (DANGER_HTML_CHILD_PROBE === 0) return false;
  if (value !== null && value !== void 0) {
    throw new Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
  }
  return true;
}
function ssrText(v) {
  if (probingDangerHtmlChild(v)) return "";
  if (v == null || v === false) return "";
  return escapeHtml(v);
}
function ssrTextPre(v) {
  const s = ssrText(v);
  return s.charCodeAt(0) === 10 ? "\n" + s : s;
}
function ssrComponentDescriptor(d, scope) {
  return ssrComponent(scope, d.type, {
    ...d.props,
    children: d.children ?? d.props?.children
  });
}
function ssrChild(v, scope) {
  if (probingDangerHtmlChild(v)) return "";
  return ssrChildValue(v, scope, true);
}
function ssrChildValue(v, scope, includeKeyedSingle) {
  if (v == null || v === false || v === true) return ssrBlock("");
  if ((typeof v === "object" || typeof v === "function") && (v.$$kind === CONTEXT_TAG || typeof v.then === "function")) {
    return ssrChildValue(
      use(v),
      scope,
      includeKeyedSingle
    );
  }
  const iterable = iterableChildArray(v);
  if (iterable !== null) v = iterable;
  const preparedList = prepareSsrDeoptList(v, includeKeyedSingle);
  if (preparedList !== null) {
    return withAsyncListScope("child", () => {
      let out = "";
      for (let i = 0; i < preparedList.items.length; i++) {
        const item = preparedList.items[i];
        const key = preparedList.keys[i];
        out += withAsyncIdentity("item", key, () => ssrChildValue(item, scope, false));
      }
      return ssrBlock(out);
    });
  }
  if (typeof v === "function")
    return ssrComponent(scope, v, {}, void 0, void 0, true);
  if (typeof v === "object") {
    if (v.$$kind === ELEMENT_TAG) {
      const d = v;
      const render = () => {
        if (typeof d.type === "string")
          return ssrBlock(ssrHostElement(d.type, d.props, d.children, scope));
        return ssrComponentDescriptor(d, scope);
      };
      const renderType = () => withAsyncIdentity("child-type", d.type, render);
      return d.key != null ? withAsyncIdentity("child-key", d.key, renderType, true) : renderType();
    }
    if (v.$$kind === PORTAL_TAG) return ssrBlock(ssrPortal());
    throw invalidChildError(v);
  }
  return ssrBlock(escapeHtml(v));
}
function ssrChildText(v, scope) {
  if (probingDangerHtmlChild(v)) return "";
  if (v == null || v === false || v === true) return "";
  if (typeof v === "object" || typeof v === "function") return ssrChild(v, scope);
  return escapeHtml(v);
}
function ssrHostElement(tag, props, children, scope, rawInner) {
  if (!VALID_TAG_NAME.test(tag)) {
    throw new Error("Invalid tag: " + tag);
  }
  const semanticTag = tag.toLowerCase();
  const parentElement = CURRENT_SSR_ELEMENT;
  const { namespace, childrenNamespace } = ssrElementNamespaces(semanticTag, parentElement);
  CURRENT_SSR_ELEMENT = {
    tag: semanticTag,
    parent: parentElement,
    namespace,
    childrenNamespace,
    location: void 0
  };
  try {
    const iterable = iterableChildArray(children);
    const iterableChildren = iterable !== null;
    if (iterable !== null) children = iterable;
    let attrs = "";
    let innerHTMLValue = void 0;
    let hasInnerHTMLProp = false;
    const isCtlTag = semanticTag === "input" || semanticTag === "textarea" || semanticTag === "select";
    if (props != null) {
      for (const k in props) {
        const val = props[k];
        if (k === "dangerouslySetInnerHTML") {
          hasInnerHTMLProp = true;
          innerHTMLValue = val;
          continue;
        }
        if (isCtlTag && (k === "value" || k === "defaultValue" || semanticTag === "input" && (k === "checked" || k === "defaultChecked"))) {
          continue;
        }
        attrs += ssrAttrEntry(k, val, semanticTag, namespace);
      }
      if (semanticTag === "input") {
        attrs += ssrValueAttr(props.value != null ? props.value : props.defaultValue);
        attrs += ssrCheckedAttr(props.checked != null ? props.checked : props.defaultChecked);
      }
    }
    const hasChildren = rawInner !== void 0 ? rawInner !== "" : children != null && children !== false && children !== true && children !== "";
    if (hasInnerHTMLProp && innerHTMLValue != null && (typeof innerHTMLValue !== "object" || !("__html" in innerHTMLValue))) {
      throw new Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`");
    }
    const hasDangerHTML = hasInnerHTMLProp && innerHTMLValue != null;
    if (hasDangerHTML && (children != null || rawInner !== void 0 && rawInner !== "")) {
      throw new Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
    }
    if (semanticTag === "textarea" && props != null && (props.value != null || props.defaultValue != null)) {
      if (hasChildren && props.value == null) {
        throw new Error("If you supply `defaultValue` on a <textarea>, do not pass children.");
      }
      const inner2 = ssrTextareaValue(props.value != null ? props.value : props.defaultValue);
      return "<" + tag + attrs + ">" + inner2 + "</" + tag + ">";
    }
    if (VOID_ELEMENTS.has(semanticTag) && hasDangerHTML) {
      throw new Error(
        `\`${semanticTag}\` is a void element tag and must neither have \`children\` nor use \`dangerouslySetInnerHTML\`.`
      );
    }
    if (VOID_ELEMENTS.has(semanticTag) && !hasChildren) {
      return "<" + tag + attrs + "/>";
    }
    let inner = "";
    if (hasDangerHTML) {
      const html = innerHTMLValue.__html;
      const raw = html == null ? "" : String(html);
      inner = semanticTag === "script" ? escapeEntireInlineScriptContent(raw) : semanticTag === "style" ? escapeEntireInlineStyleContent(raw) : raw;
    } else if (rawInner !== void 0) {
      inner = rawInner;
    } else if (hasChildren) {
      const build = () => ssrInNamespace(
        childrenNamespace,
        () => iterableChildren || serverDescNeedsBlocks(children) ? ssrDeoptBlockChildren(children, scope) : ssrDescriptorContent(children, scope)
      );
      inner = semanticTag === "select" && props != null && (props.value != null || props.defaultValue != null) ? ssrSelectScope(props.value, props.defaultValue, !!props.multiple, build) : build();
    }
    if (semanticTag === "option") {
      return ssrOption(
        props != null && props.value != null ? props.value : void 0,
        attrs,
        inner
      );
    }
    return "<" + tag + attrs + ">" + inner + "</" + tag + ">";
  } finally {
    CURRENT_SSR_ELEMENT = parentElement;
  }
}
function ssrDeoptBlockChildren(children, scope) {
  const iterable = iterableChildArray(children);
  if (iterable !== null) children = iterable;
  const preparedList = prepareSsrDeoptList(children, true);
  if (preparedList !== null) {
    return withAsyncListScope("host-child", () => {
      let out = "";
      for (let i = 0; i < preparedList.items.length; i++) {
        const item = preparedList.items[i];
        const key = preparedList.keys[i];
        out += withAsyncIdentity("item", key, () => {
          return serverDescNeedsBlocks(item) ? ssrChildValue(item, scope, false) : ssrBlock(ssrDescriptorContent(item, scope));
        });
      }
      return ssrBlock(out);
    });
  }
  return ssrChild(children, scope);
}
function serverDescNeedsBlocks(v) {
  if (v == null || typeof v !== "object") return false;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) if (serverDescNeedsBlocks(v[i])) return true;
    return false;
  }
  if (!isElementDescriptor(v) && childrenIterator(v) !== null) return true;
  const d = v;
  if (d.$$kind === ELEMENT_TAG) {
    if (d.type === Fragment) return true;
    return typeof d.type === "function" || serverDescNeedsBlocks(d.children);
  }
  return false;
}
function ssrDescriptorContent(v, scope) {
  if (v == null || v === false || v === true || v === "") return "";
  if (Array.isArray(v)) {
    let out = "";
    for (let i = 0; i < v.length; i++) out += ssrDescriptorContent(v[i], scope);
    return out;
  }
  if (typeof v === "object" && v.$$kind === ELEMENT_TAG) {
    const d = v;
    if (typeof d.type === "string") return ssrHostElement(d.type, d.props, d.children, scope);
    return ssrComponentDescriptor(d, scope);
  }
  if (typeof v === "function") {
    return ssrComponent(scope, v, {}, void 0, void 0, isChildrenBlock(v));
  }
  if (typeof v === "object") throw invalidChildError(v);
  return escapeHtml(v);
}
function ssrBlock(content) {
  return MARKERS ? BLOCK_OPEN + content + BLOCK_CLOSE : content;
}
function ssrActivity(mode, render) {
  return ssrBlock(mode === "hidden" ? "" : render());
}
function ssrForBlock(content, hasItems) {
  return MARKERS ? (hasItems ? FOR_BLOCK_OPEN_ITEMS : FOR_BLOCK_OPEN_EMPTY) + content + BLOCK_CLOSE : content;
}
function encodeAsyncIdentityString(value) {
  let encoded = "";
  for (let i = 0; i < value.length; i++) {
    encoded += value.charCodeAt(i).toString(16).padStart(4, "0");
  }
  return encoded;
}
function asyncIdentityKey(value, objectIs, positionFallback) {
  switch (typeof value) {
    case "string":
      return "s" + encodeAsyncIdentityString(value);
    case "number":
      return "n" + (objectIs && Object.is(value, -0) ? "-0" : String(value));
    case "bigint":
      return "i" + String(value);
    case "boolean":
      return value ? "b1" : "b0";
    case "undefined":
      return "u";
    case "symbol":
    case "function":
    case "object": {
      if (value === null) return "l";
      const ids = RESOLVED?.asyncIdentities;
      if (ids === void 0) return "o" + encodeAsyncIdentityString(String(value));
      let id = ids.get(value);
      if (id === void 0) {
        id = positionFallback === void 0 ? void 0 : RESOLVED.asyncPositionIdentities.get(positionFallback);
        if (id === void 0) id = RESOLVED.nextAsyncIdentity++;
        ids.set(value, id);
      }
      if (positionFallback !== void 0)
        RESOLVED.asyncPositionIdentities.set(positionFallback, id);
      return "o" + id.toString(36);
    }
  }
}
function withAsyncIdentity(siteKey, identity, fn, objectIs = false, positionFallback) {
  const prev = ASYNC_SCOPE;
  const position = prev + "|@" + siteKey;
  ASYNC_SCOPE = position + ":" + asyncIdentityKey(identity, objectIs, positionFallback);
  try {
    return fn();
  } finally {
    ASYNC_SCOPE = prev;
  }
}
function withAsyncListScope(kind, fn) {
  const frame = FRAME;
  const occurrence = frame === null ? 0 : nextFrameOccurrence(frame, "@list:" + kind);
  return withAsyncIdentity("list:" + kind, occurrence, fn);
}
function ssrControl(siteKey, fn) {
  const frame = FRAME;
  const occurrence = frame === null ? 0 : nextFrameOccurrence(frame, "@control:" + siteKey);
  return withAsyncIdentity("control:" + siteKey, occurrence, fn);
}
function ssrArm(armKey, fn) {
  const frame = FRAME;
  const occurrence = frame === null ? 0 : nextFrameOccurrence(frame, "@arm-position:" + ASYNC_SCOPE);
  const fallbackPosition = ASYNC_SCOPE + "|@arm-position:" + occurrence;
  return withAsyncIdentity("arm", armKey, fn, false, fallbackPosition);
}
function ssrPortal() {
  return EMPTY_COMMENT;
}
function resolveAttributeNamespace(namespace) {
  return namespace === "opaque" ? FRAME?.namespace ?? "html" : namespace;
}
function ssrAttr(name, v, tag, namespace = "html") {
  namespace = resolveAttributeNamespace(namespace);
  const isCustomTag = namespace === "html" && tag !== void 0 && tag.indexOf("-") !== -1;
  if (!isCustomTag) {
    const alias = ATTRIBUTE_ALIASES.get(name);
    if (alias !== void 0) name = alias;
  }
  if (name === "class") {
    if (v == null || v === false) return "";
    return ' class="' + escapeAttr(normalizeClass(v)) + '"';
  }
  if (name.charCodeAt(0) === 97 && name.startsWith("aria-")) {
    if (v == null) return "";
    return " " + name + '="' + escapeAttr(String(v)) + '"';
  }
  if (name === "suppressContentEditableWarning" || name === "suppressHydrationWarning") return "";
  const t = typeof v;
  if (t === "boolean" && isEnumeratedBooleanAttr(name)) {
    return " " + name + '="' + v + '"';
  }
  if (t === "boolean" && name.startsWith("data-")) {
    return " " + name + '="' + v + '"';
  }
  if (t === "function" || t === "symbol") return "";
  if (!isCustomTag) {
    if (name.length > 2 && name.charCodeAt(0) === 111 && name.charCodeAt(1) === 110) {
      return "";
    }
    const lower = name.toLowerCase();
    if (BOOLEAN_ATTR_PROPS.has(lower)) {
      return v ? " " + lower + '=""' : "";
    }
    if (t === "boolean" && (lower === "download" || lower === "capture")) {
      return v ? " " + lower + '=""' : "";
    }
    if (MUST_USE_PROPERTY_PROPS.has(lower)) {
      return v ? " " + lower + '=""' : "";
    }
    if (t === "boolean") return "";
    if (POSITIVE_NUMERIC_ATTR_PROPS.has(lower) && !(Number(v) >= 1)) return "";
  }
  if (v == null || v === false) return "";
  const s = v === true ? "" : String(v);
  if (s === "" && (name === "src" || name === "href" && tag !== void 0 && tag !== "a" && tag !== "area" || name === "data" && tag === "object")) {
    return "";
  }
  if (v === true) return " " + name;
  return " " + name + '="' + escapeAttr(sanitizeURLAttribute(tag, name, s)) + '"';
}
function styleObjectToCss(obj) {
  let out = "";
  for (const k in obj) {
    const val = obj[k];
    if (val == null || typeof val === "boolean") continue;
    out += styleName(k) + ":" + cssStyleValue(k, val) + ";";
  }
  return out;
}
function ssrStyle(v) {
  if (v == null || v === false || v === "") return "";
  const css = typeof v === "string" ? v : styleObjectToCss(v);
  if (!css) return "";
  return ' style="' + escapeAttr(css) + '"';
}
const VALID_TAG_NAME = /^[a-zA-Z][a-zA-Z0-9:._-]*$/;
function ssrAttrEntry(k, v, tag, namespace = "html") {
  namespace = resolveAttributeNamespace(namespace);
  if (k === "key" || k === "ref" || k === "children") return "";
  if (k === "suppressHydrationWarning" || k === "suppressContentEditableWarning") return "";
  if (k.length > 2 && k[0] === "o" && k[1] === "n" && k[2] >= "A" && k[2] <= "Z") return "";
  if (k === "autoFocus" && (namespace !== "html" || tag === void 0 || tag.indexOf("-") === -1))
    return "";
  if (typeof v === "function" || typeof v === "symbol") return "";
  if (k === "style") return ssrStyle(v);
  if (k === "className" || k === "class") return ssrAttr("class", v, tag, namespace);
  if (VALID_ATTR_NAME.test(k)) return ssrAttr(k, v, tag, namespace);
  return "";
}
function normalizeSsrAttributeName(name, tag, namespace) {
  namespace = resolveAttributeNamespace(namespace);
  if (name === "className") return "class";
  const isCustom = namespace === "html" && tag !== void 0 && tag.indexOf("-") !== -1;
  if (!isCustom) return ATTRIBUTE_ALIASES.get(name) ?? name;
  return name;
}
function isAggregatedFormAttribute(tag, name) {
  if (name === "value" || name === "defaultValue") {
    return tag === "input" || tag === "textarea" || tag === "select";
  }
  if (tag === "input" && (name === "checked" || name === "defaultChecked")) return true;
  return tag === "select" && name === "multiple";
}
function ssrAttrs(sources, tag, namespace = "html", skipFormControls = false) {
  namespace = resolveAttributeNamespace(namespace);
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
  for (const [isSpread, sourceOrName, directValue] of sources) {
    if (!isSpread) {
      record(sourceOrName, directValue);
      continue;
    }
    const source = sourceOrName;
    if (source == null || typeof source !== "object" && typeof source !== "function") {
      continue;
    }
    for (const name of Object.keys(Object(source))) {
      record(name, source[name]);
    }
  }
  const resolved = /* @__PURE__ */ new Map();
  for (const writer of props.values()) {
    const { rawName, value, firstOrder, lastOrder } = writer;
    if (rawName === "key" || rawName === "ref" || rawName === "children" || rawName === "dangerouslySetInnerHTML" || rawName === "suppressHydrationWarning" || rawName === "suppressContentEditableWarning")
      continue;
    if (skipFormControls && isAggregatedFormAttribute(tag, rawName)) continue;
    if (rawName.length > 2 && rawName[0] === "o" && rawName[1] === "n") {
      const c = rawName.charCodeAt(2);
      if (c >= 65 && c <= 90) continue;
    }
    if (rawName === "autoFocus" && (namespace !== "html" || tag === void 0 || tag.indexOf("-") === -1))
      continue;
    const name = normalizeSsrAttributeName(rawName, tag, namespace);
    if (!VALID_ATTR_NAME.test(name)) continue;
    const identity = namespace === "html" ? name.toLowerCase() : name;
    const previous = resolved.get(identity);
    if (previous === void 0 || previous[3] < lastOrder) {
      resolved.set(identity, [name, value, firstOrder, lastOrder]);
    }
  }
  let out = "";
  const ordered = [...resolved.values()].sort((a, b) => a[2] - b[2]);
  for (const [name, value] of ordered) {
    out += ssrAttrEntry(name, value, tag, namespace);
  }
  return out;
}
function ssrClass(sources) {
  let found = false;
  let value;
  for (const [isSpread, source] of sources) {
    if (!isSpread) {
      found = true;
      value = source;
      continue;
    }
    if (source == null || typeof source !== "object" && typeof source !== "function") continue;
    for (const key of Object.keys(Object(source))) {
      if (key === "class" || key === "className") {
        found = true;
        value = source[key];
      }
    }
  }
  return found ? ssrAttr("class", value) : "";
}
function ssrSnapshotSpread(obj) {
  if (obj == null) return null;
  const source = Object(obj);
  const snapshot = /* @__PURE__ */ Object.create(null);
  for (const key of Reflect.ownKeys(source)) {
    if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
    const value = source[key];
    if (typeof key === "string") snapshot[key] = value;
  }
  return snapshot;
}
function ssrSpread(obj, tag, skipClass = false, namespace = "html", skipFormControls = false) {
  namespace = resolveAttributeNamespace(namespace);
  if (obj == null) return "";
  let out = "";
  for (const k of Object.keys(Object(obj))) {
    if (skipClass && (k === "class" || k === "className")) continue;
    if (skipFormControls && (k === "value" || k === "defaultValue") && (tag === "input" || tag === "textarea" || tag === "select"))
      continue;
    if (skipFormControls && tag === "input" && (k === "checked" || k === "defaultChecked"))
      continue;
    if (skipFormControls && tag === "select" && k === "multiple") continue;
    if (k === "dangerouslySetInnerHTML") continue;
    out += ssrAttrEntry(k, obj[k], tag, namespace);
  }
  return out;
}
function ssrInnerHtml(sources, renderChildren, definitelyHasChildren = false, childrenSources = []) {
  for (let i = sources.length - 1; i >= 0; i--) {
    const [present, value] = sources[i];
    if (!present) continue;
    if (value == null) return void 0;
    if (typeof value !== "object" || !("__html" in value)) {
      throw new Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`");
    }
    let childValue;
    let hasChildSource = false;
    for (let childI = childrenSources.length - 1; childI >= 0; childI--) {
      if (!childrenSources[childI][0]) continue;
      hasChildSource = true;
      childValue = childrenSources[childI][1];
      break;
    }
    if (definitelyHasChildren || hasChildSource && childValue != null) {
      throw new Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
    }
    if (renderChildren !== void 0) {
      DANGER_HTML_CHILD_PROBE++;
      try {
        renderChildren();
      } finally {
        DANGER_HTML_CHILD_PROBE--;
      }
    }
    const html = value.__html;
    return html == null ? "" : String(html);
  }
  return void 0;
}
const INLINE_STYLE_TOKEN = /(<\/|<)(s)(tyle)/gi;
function escapeEntireInlineStyleContent(value) {
  return value.replace(
    INLINE_STYLE_TOKEN,
    (_match, prefix, s, suffix) => `${prefix}${s === "s" ? "\\73 " : "\\53 "}${suffix}`
  );
}
const INLINE_SCRIPT_TOKEN = /(<\/|<)(s)(cript)/gi;
function escapeEntireInlineScriptContent(value) {
  return value.replace(
    INLINE_SCRIPT_TOKEN,
    (_match, prefix, s, suffix) => `${prefix}${s === "s" ? "\\u0073" : "\\u0053"}${suffix}`
  );
}
function ssrScriptInnerHtml(sources, renderChildren, definitelyHasChildren = false, childrenSources = []) {
  const html = ssrInnerHtml(sources, renderChildren, definitelyHasChildren, childrenSources);
  return html === void 0 ? void 0 : escapeEntireInlineScriptContent(html);
}
function finalPresentSource(sources) {
  for (let i = sources.length - 1; i >= 0; i--) {
    if (sources[i][0]) return [true, sources[i][1]];
  }
  return [false, void 0];
}
function ssrChildrenSources(sources, renderFallback, scope) {
  const child = finalPresentSource(sources);
  return child[0] ? ssrChildText(child[1], scope) : renderFallback();
}
function ssrVoidContent(tag, dangerSources, childrenSources) {
  const danger = finalPresentSource(dangerSources);
  const children = finalPresentSource(childrenSources);
  if (danger[0] && danger[1] != null || children[0] && children[1] != null) {
    throw new Error(
      `\`<${tag}>\` is a void element tag and must neither have children nor use \`dangerouslySetInnerHTML\`.`
    );
  }
  return "";
}
function ssrValueAttr(v) {
  if (v == null) return "";
  return ' value="' + escapeAttr(typeof v === "string" ? v : String(v)) + '"';
}
function ssrCheckedAttr(v) {
  return v == null || !v ? "" : " checked";
}
function ssrInputAttrs(sources) {
  const props = resolveFormControlSources(sources);
  return ssrValueAttr(props.value ?? props.defaultValue) + ssrCheckedAttr(props.checked ?? props.defaultChecked);
}
function resolveFormControlSources(sources) {
  const resolved = {
    value: void 0,
    defaultValue: void 0,
    checked: void 0,
    defaultChecked: void 0,
    multiple: void 0,
    hasValue: false,
    hasDefaultValue: false,
    hasMultiple: false
  };
  for (const [isSpread, sourceOrName, directValue] of sources) {
    if (isSpread) {
      const source = sourceOrName;
      if (source == null || typeof source !== "object" && typeof source !== "function") {
        continue;
      }
      for (const name of Object.keys(Object(source))) {
        const next = source[name];
        if (name === "value") {
          resolved.hasValue = true;
          resolved.value = next;
        } else if (name === "defaultValue") {
          resolved.hasDefaultValue = true;
          resolved.defaultValue = next;
        } else if (name === "checked") resolved.checked = next;
        else if (name === "defaultChecked") resolved.defaultChecked = next;
        else if (name === "multiple") {
          resolved.hasMultiple = true;
          resolved.multiple = next;
        }
      }
      continue;
    }
    if (sourceOrName === "value") {
      resolved.hasValue = true;
      resolved.value = directValue;
    } else if (sourceOrName === "defaultValue") {
      resolved.hasDefaultValue = true;
      resolved.defaultValue = directValue;
    } else if (sourceOrName === "checked") resolved.checked = directValue;
    else if (sourceOrName === "defaultChecked") resolved.defaultChecked = directValue;
    else if (sourceOrName === "multiple") {
      resolved.hasMultiple = true;
      resolved.multiple = directValue;
    }
  }
  return resolved;
}
function ssrTextareaValue(v) {
  if (v == null) return "";
  const s = escapeHtml(typeof v === "string" ? v : String(v));
  return s.charCodeAt(0) === 10 ? "\n" + s : s;
}
function ssrTextareaValueSources(sources) {
  const props = resolveFormControlSources(sources);
  const value = props.value ?? props.defaultValue;
  return value == null ? void 0 : ssrTextareaValue(value);
}
function ssrSelectAttrs(sources) {
  const props = resolveFormControlSources(sources);
  return props.hasMultiple ? ssrAttr("multiple", props.multiple, "select") : "";
}
const SELECT_STACK = [];
function ssrSelectScope(value, defaultValue, multiple, children) {
  const v = value != null ? value : defaultValue;
  let frame;
  if (v == null) {
    frame = { single: null, multi: null };
  } else if (multiple) {
    frame = Array.isArray(v) ? { single: null, multi: new Set(v.map((x) => String(x))) } : { single: null, multi: null };
  } else {
    frame = Array.isArray(v) ? { single: null, multi: null } : { single: String(v), multi: null };
  }
  SELECT_STACK.push(frame);
  try {
    return children();
  } finally {
    SELECT_STACK.pop();
  }
}
function ssrSelectScopeSources(sources, children) {
  const props = resolveFormControlSources(sources);
  return ssrSelectScope(props.value, props.defaultValue, props.multiple, children);
}
function unescapeOptionText(s) {
  if (s.indexOf("&") === -1) return s;
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
function ssrOptionValueSources(sources) {
  let value;
  for (const [isSpread, sourceOrName, directValue] of sources) {
    if (!isSpread) {
      if (sourceOrName === "value") value = directValue;
      continue;
    }
    const source = sourceOrName;
    if (source == null || typeof source !== "object" && typeof source !== "function") {
      continue;
    }
    if (Object.prototype.propertyIsEnumerable.call(Object(source), "value")) {
      value = source.value;
    }
  }
  return value;
}
function ssrOption(value, attrs, content) {
  return "<option" + attrs + ssrOptionSelected(value, content) + ">" + content + "</option>";
}
function ssrOptionSelected(value, content) {
  if (SELECT_STACK.length === 0) return "";
  const scope = SELECT_STACK[SELECT_STACK.length - 1];
  if (scope.single === null && scope.multi === null) return "";
  let key;
  if (value != null) {
    key = String(value);
  } else {
    if (content.indexOf("<") !== -1) return "";
    key = unescapeOptionText(content);
  }
  if (scope.multi !== null) return scope.multi.has(key) ? " selected" : "";
  return scope.single === key ? " selected" : "";
}
let nextHookSlot = 0;
function hookSlots(count) {
  const base = nextHookSlot;
  nextHookSlot += count;
  return base;
}
let HOOK_PASS = null;
const HOOK_SLOT_PATH = [];
const NO_SLOT = "@state";
function appendHookSlotPath(key, slot) {
  let type;
  let value;
  if (typeof slot === "number") {
    type = "n";
    value = String(slot);
  } else if (typeof slot === "symbol") {
    type = "s";
    value = slot.description ?? "";
  } else {
    type = "t";
    value = slot;
  }
  return key + type + value.length + ":" + value;
}
function resolveHookSlot(slot) {
  const own = typeof slot === "symbol" || typeof slot === "string" || typeof slot === "number" ? slot : void 0;
  const depth = HOOK_SLOT_PATH.length;
  if (depth === 0) return own ?? NO_SLOT;
  if (own === void 0 && depth === 1) return HOOK_SLOT_PATH[0];
  let key = "@octane:hook:";
  for (let i = 0; i < depth; i++) key = appendHookSlotPath(key, HOOK_SLOT_PATH[i]);
  if (own !== void 0) key = appendHookSlotPath(key, own);
  return Symbol.for(key);
}
const MAX_RENDER_PHASE_PASSES = 25;
function basicStateReducer(s, a) {
  return typeof a === "function" ? a(s) : a;
}
function hookPosition(slot) {
  const hp = HOOK_PASS;
  if (hp === null) return null;
  const key = resolveHookSlot(slot);
  const index = hp.occ.get(key) ?? 0;
  hp.occ.set(key, index + 1);
  let list = hp.hooks.get(key);
  if (list === void 0) hp.hooks.set(key, list = []);
  return { hp, list, index };
}
function stateHook(reducer, create, slot, withGetter = false) {
  const hp = HOOK_PASS;
  if (hp === null) {
    const value = create();
    return withGetter ? [value, NOOP, () => value] : [value, NOOP];
  }
  const position = hookPosition(slot);
  const { list, index: n } = position;
  let rec = list[n];
  if (rec === void 0) {
    const value = create();
    if (withGetter) {
      const r = {
        value,
        pendingValue: value,
        queue: [],
        reducer,
        dispatch: (action) => {
          if (hp !== HOOK_PASS) return;
          r.queue.push(action);
          r.pendingValue = r.reducer(r.pendingValue, action);
          hp.update = true;
        }
      };
      list[n] = rec = r;
    } else {
      const r = {
        value,
        queue: [],
        dispatch: (action) => {
          if (hp !== HOOK_PASS) return;
          r.queue.push(action);
          hp.update = true;
        }
      };
      list[n] = rec = r;
    }
  } else if (rec.queue.length > 0) {
    if (withGetter) {
      const getterRec2 = rec;
      if (getterRec2.reducer === reducer) {
        rec.value = getterRec2.pendingValue;
      } else {
        let value = rec.value;
        const queue = rec.queue;
        for (let i = 0; i < queue.length; i++) value = reducer(value, queue[i]);
        rec.value = value;
        getterRec2.pendingValue = value;
      }
      rec.queue = [];
    } else {
      let value = rec.value;
      const queue = rec.queue;
      for (let i = 0; i < queue.length; i++) value = reducer(value, queue[i]);
      rec.queue = [];
      rec.value = value;
    }
  }
  if (!withGetter) return [rec.value, rec.dispatch];
  const getterRec = rec;
  getterRec.reducer = reducer;
  const getter = getterRec.getter ??= () => getterRec.pendingValue;
  return [rec.value, rec.dispatch, getter];
}
function captureComponentReplayState(scope, frame) {
  const css = CSS;
  const head = HEAD;
  const serial = SERIAL;
  const susp = SUSPENDED;
  const jobs = DEFERRED;
  const stream = STREAM;
  return {
    id: ID_COUNTER,
    css,
    cssEntries: css === null ? null : new Map(css),
    head,
    headLength: head !== null ? head.html.length : 0,
    headHints: head === null ? null : new Set(head.hints),
    serial,
    serialLength: serial !== null ? serial.length : 0,
    susp,
    suspLength: susp !== null ? susp.length : 0,
    jobs,
    jobsLength: jobs !== null ? jobs.length : 0,
    context: scope.$$ctxValues,
    vtTrySeq: VT_SSR_TRY_SEQ,
    vtHasCandidates: VT_SSR_HAS_CANDIDATES,
    vtStack: VT_SSR_STACK.map((candidate) => ({
      candidate,
      consumed: candidate.consumed
    })),
    stream,
    streamNextId: stream?.nextId ?? 0,
    streamActiveTryKeys: stream?.activeTryKeys.slice() ?? [],
    streamActiveOwnerKeys: stream?.activeOwnerKeys.slice() ?? [],
    streamPassBoundaryKeys: stream?.activePassBoundaryKeys === null || stream?.activePassBoundaryKeys === void 0 ? null : new Set(stream.activePassBoundaryKeys),
    asyncScope: ASYNC_SCOPE,
    streamBoundaries: stream === null ? null : Array.from(stream.boundaries, ([key, entry]) => ({
      key,
      entry,
      id: entry.id,
      order: entry.order,
      state: entry.state,
      html: entry.html,
      seeds: entry.seeds.slice(),
      pendingIdOffset: entry.pendingIdOffset,
      ancestors: entry.ancestors.slice(),
      owners: entry.owners.slice(),
      namespace: entry.namespace
    })),
    frameDeferred: frame?.deferred ?? false,
    frameNextChild: frame?.nextChild ?? 0,
    frameScopedChildren: frame?.scopedChildren === null || frame?.scopedChildren === void 0 ? null : new Map(frame.scopedChildren),
    frameOccurrences: frame?.occ === null || frame?.occ === void 0 ? null : new Map(frame.occ)
  };
}
function rewindComponentReplayState(snapshot, scope, frame) {
  ID_COUNTER = snapshot.id;
  ASYNC_SCOPE = snapshot.asyncScope;
  if (snapshot.css !== null && snapshot.cssEntries !== null) {
    snapshot.css.clear();
    for (const [hash, sheet] of snapshot.cssEntries) snapshot.css.set(hash, sheet);
  }
  if (snapshot.head !== null && snapshot.headHints !== null) {
    snapshot.head.html = snapshot.head.html.slice(0, snapshot.headLength);
    snapshot.head.hints.clear();
    for (const key of snapshot.headHints) snapshot.head.hints.add(key);
  }
  if (snapshot.serial !== null) snapshot.serial.length = snapshot.serialLength;
  if (snapshot.susp !== null) snapshot.susp.length = snapshot.suspLength;
  if (snapshot.jobs !== null) snapshot.jobs.length = snapshot.jobsLength;
  VT_SSR_TRY_SEQ = snapshot.vtTrySeq;
  VT_SSR_HAS_CANDIDATES = snapshot.vtHasCandidates;
  VT_SSR_STACK.length = 0;
  for (const entry of snapshot.vtStack) {
    entry.candidate.consumed = entry.consumed;
    VT_SSR_STACK.push(entry.candidate);
  }
  const stream = snapshot.stream;
  if (stream !== null && snapshot.streamBoundaries !== null) {
    stream.nextId = snapshot.streamNextId;
    if (stream.activePassBoundaryKeys !== null && snapshot.streamPassBoundaryKeys !== null) {
      stream.activePassBoundaryKeys.clear();
      for (const key of snapshot.streamPassBoundaryKeys) stream.activePassBoundaryKeys.add(key);
    }
    stream.activeTryKeys.length = 0;
    stream.activeTryKeys.push(...snapshot.streamActiveTryKeys);
    stream.activeOwnerKeys.length = 0;
    stream.activeOwnerKeys.push(...snapshot.streamActiveOwnerKeys);
    stream.boundaries.clear();
    for (const saved of snapshot.streamBoundaries) {
      const entry = saved.entry;
      entry.id = saved.id;
      entry.order = saved.order;
      entry.state = saved.state;
      entry.html = saved.html;
      entry.seeds = saved.seeds.slice();
      entry.pendingIdOffset = saved.pendingIdOffset;
      entry.ancestors = saved.ancestors.slice();
      entry.owners = saved.owners.slice();
      entry.namespace = saved.namespace;
      stream.boundaries.set(saved.key, entry);
    }
  }
  scope.$$ctxValues = snapshot.context;
  if (frame !== null) {
    frame.deferred = snapshot.frameDeferred;
    frame.nextChild = snapshot.frameNextChild;
    frame.scopedChildren = snapshot.frameScopedChildren === null ? null : new Map(snapshot.frameScopedChildren);
    frame.occ = snapshot.frameOccurrences === null ? null : new Map(snapshot.frameOccurrences);
  }
}
function invokeComponentBody(comp, props, scope, frame) {
  const prevHP = HOOK_PASS;
  const hp = { hooks: /* @__PURE__ */ new Map(), occ: /* @__PURE__ */ new Map(), update: false };
  const snapshot = captureComponentReplayState(scope, frame);
  HOOK_PASS = hp;
  try {
    let out = comp(props ?? {}, scope, void 0);
    let passes = 1;
    while (hp.update) {
      if (++passes > MAX_RENDER_PHASE_PASSES) {
        throw new Error(
          "Too many re-renders. Octane limits the number of renders to prevent an infinite loop."
        );
      }
      hp.update = false;
      hp.occ = /* @__PURE__ */ new Map();
      rewindComponentReplayState(snapshot, scope, frame);
      out = comp(props ?? {}, scope, void 0);
    }
    return out;
  } finally {
    HOOK_PASS = prevHP;
  }
}
function renderComponentFramed(comp, props, parent, frame, inherit) {
  const prevScope = CURRENT_SCOPE;
  const prevFrame = FRAME;
  const prevComp = CURRENT_COMP;
  const prevProps = CURRENT_PROPS;
  const prevParent = CURRENT_PARENT_SCOPE;
  const prevAsyncScope = ASYNC_SCOPE;
  const parentScope = parent ?? prevScope;
  const scope = ssrScope(parentScope);
  CURRENT_SCOPE = scope;
  FRAME = frame;
  CURRENT_COMP = comp;
  CURRENT_PROPS = props;
  CURRENT_PARENT_SCOPE = parentScope;
  ASYNC_SCOPE = frame.asyncScope;
  try {
    const out = invokeComponentBody(comp, props, scope, frame);
    const inner = typeof out === "string" ? out : out == null ? "" : ssrChild(out, scope);
    return MARKERS && !inherit ? BLOCK_OPEN + inner + BLOCK_CLOSE : inner;
  } finally {
    CURRENT_SCOPE = prevScope;
    FRAME = prevFrame;
    CURRENT_COMP = prevComp;
    CURRENT_PROPS = prevProps;
    CURRENT_PARENT_SCOPE = prevParent;
    ASYNC_SCOPE = prevAsyncScope;
  }
}
function ssrComponent(parent, comp, props, inherit, key, identityScoped) {
  const previousIdentityScope = ASYNC_SCOPE;
  if (identityScoped !== true) {
    ASYNC_SCOPE = previousIdentityScope + "|@component-type:" + asyncIdentityKey(comp, false);
    if (key != null) ASYNC_SCOPE += "|@component-key:" + asyncIdentityKey(key, true);
  }
  try {
    const explicitNamespace = NEXT_COMPONENT_NAMESPACE;
    NEXT_COMPONENT_NAMESPACE = null;
    if (inherit === true && (comp === Suspense || comp === ErrorBoundary || comp === ViewTransition))
      inherit = false;
    if (typeof comp === "string") {
      const inheritedNamespace = explicitNamespace ?? FRAME?.namespace ?? "html";
      const childNamespace = parserNamespacesForTag(
        comp.toLowerCase(),
        inheritedNamespace
      ).childrenNamespace;
      return ssrInNamespace(childNamespace, () => {
        const kids = props?.children;
        if (typeof kids === "function") {
          const out = kids(void 0, parent);
          const inner = typeof out === "string" ? out : out == null ? "" : ssrChild(out, parent);
          const html2 = ssrHostElement(comp, props, null, parent, inner);
          return inherit ? html2 : ssrBlock(html2);
        }
        const html = ssrHostElement(comp, props, kids, parent);
        return inherit ? html : ssrBlock(html);
      });
    }
    const pf = FRAME;
    const frame = pf === null ? {
      parent: null,
      seg: 0,
      nextChild: 0,
      scopedChildren: null,
      occ: null,
      path: null,
      deferred: false,
      asyncScope: ASYNC_SCOPE
    } : {
      parent: pf,
      seg: nextChildSegment(pf),
      nextChild: 0,
      scopedChildren: null,
      occ: null,
      path: null,
      deferred: false,
      asyncScope: ASYNC_SCOPE
    };
    frame.namespace = explicitNamespace ?? pf?.namespace;
    return renderComponentFramed(comp, props, parent, frame, inherit);
  } finally {
    if (identityScoped !== true) ASYNC_SCOPE = previousIdentityScope;
  }
}
let NEXT_COMPONENT_NAMESPACE = null;
function ssrComponentNS(parent, comp, props, namespace, inherit, key) {
  const previous = NEXT_COMPONENT_NAMESPACE;
  NEXT_COMPONENT_NAMESPACE = namespace;
  try {
    return ssrComponent(parent, comp, props, inherit, key);
  } finally {
    NEXT_COMPONENT_NAMESPACE = previous;
  }
}
function ssrInNamespace(namespace, render) {
  const frame = FRAME;
  if (frame === null) return render();
  const previous = frame.namespace;
  frame.namespace = namespace;
  try {
    return render();
  } finally {
    frame.namespace = previous;
  }
}
function ssrChildrenHtml(children, scope) {
  if (typeof children === "function") return children(void 0, scope) ?? "";
  return ssrChild(children, scope);
}
function Suspense(props, scope) {
  return ssrTry(
    scope,
    "jsx-suspense",
    (_arg, s) => ssrChildrenHtml(props.children, s),
    (_arg, s) => ssrChild(props.fallback, s),
    null,
    FRAME?.namespace ?? "html"
  );
}
let VT_SSR_TRY_SEQ = 0;
let VT_SSR_HAS_CANDIDATES = false;
const VT_SSR_STACK = [];
function vtSsrResolve(props, kind) {
  let v = props[kind];
  if (v == null) v = props.default;
  if (v == null) return "auto";
  if (typeof v === "string") return v;
  return v.default != null ? v.default : "auto";
}
function vtSsrAnnotate(html, attrs) {
  const n = html.length;
  let i = 0;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt === -1) return html;
    if (html.startsWith("<!--", lt)) {
      const close = html.indexOf("-->", lt + 4);
      if (close === -1) return html;
      i = close + 3;
      continue;
    }
    const c = html.charCodeAt(lt + 1);
    if (!(c >= 65 && c <= 90 || c >= 97 && c <= 122)) {
      i = lt + 1;
      continue;
    }
    let e = lt + 1;
    while (e < n && /[a-zA-Z0-9-]/.test(html[e])) e++;
    const tag = html.slice(lt + 1, e).toLowerCase();
    let j = e;
    let q = "";
    while (j < n) {
      const ch = html[j];
      if (q !== "") {
        if (ch === q) q = "";
      } else if (ch === '"' || ch === "'") q = ch;
      else if (ch === ">") break;
      j++;
    }
    if (j >= n) return html;
    if (tag === "template") {
      const close = html.indexOf("</template>", j);
      i = close === -1 ? j + 1 : close + 11;
      continue;
    }
    const open = html.slice(lt, j);
    let inject = "";
    for (let k = 0; k < attrs.length; k++) {
      if (open.indexOf(attrs[k][0] + '="') === -1) {
        inject += " " + attrs[k][0] + '="' + escapeAttr(attrs[k][1]) + '"';
      }
    }
    if (inject === "") return html;
    const at = html[j - 1] === "/" ? j - 1 : j;
    return html.slice(0, at) + inject + html.slice(at);
  }
  return html;
}
function vtSsrClaimArm(html, kind) {
  const n = html.length;
  let i = 0;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt === -1) return html;
    if (html.startsWith("<!--", lt)) {
      const close = html.indexOf("-->", lt + 4);
      if (close === -1) return html;
      i = close + 3;
      continue;
    }
    const c = html.charCodeAt(lt + 1);
    if (!(c >= 65 && c <= 90 || c >= 97 && c <= 122)) {
      i = lt + 1;
      continue;
    }
    let e = lt + 1;
    while (e < n && /[a-zA-Z0-9-]/.test(html[e])) e++;
    const tag = html.slice(lt + 1, e).toLowerCase();
    let j = e;
    let q = "";
    while (j < n) {
      const ch = html[j];
      if (q !== "") {
        if (ch === q) q = "";
      } else if (ch === '"' || ch === "'") q = ch;
      else if (ch === ">") break;
      j++;
    }
    if (j >= n) return html;
    if (tag === "template") {
      const close = html.indexOf("</template>", j);
      i = close === -1 ? j + 1 : close + 11;
      continue;
    }
    const marker = " vt-" + kind + '-x="';
    const at = html.slice(lt, j).indexOf(marker);
    if (at === -1) return html;
    return html.slice(0, lt + at) + " vt-" + kind + '="' + html.slice(lt + at + marker.length);
  }
  return html;
}
function vtSsrStrip(html) {
  if (html.indexOf(" vt-e") === -1) return html;
  return html.replace(/ vt-(?:enter|exit)-x="[^"]*"/g, "");
}
function ViewTransition(props, scope) {
  VT_SSR_HAS_CANDIDATES = true;
  const explicit = typeof props.name === "string";
  const frame = FRAME;
  const cand = {
    name: explicit ? props.name : "_O" + (frame !== null ? framePath(frame).replace(/\//g, "-") : "") + "_",
    share: vtSsrResolve(props, "share"),
    update: vtSsrResolve(props, "update"),
    consumed: false
  };
  VT_SSR_STACK.push(cand);
  const seqBefore = VT_SSR_TRY_SEQ;
  let inner;
  try {
    inner = ssrChildrenHtml(props.children, scope);
  } finally {
    VT_SSR_STACK.pop();
  }
  const named = explicit || VT_SSR_TRY_SEQ !== seqBefore;
  const attrs = [];
  if (named) attrs.push(["vt-name", cand.name]);
  attrs.push(["vt-update", cand.update]);
  attrs.push(["vt-enter-x", vtSsrResolve(props, "enter")]);
  attrs.push(["vt-exit-x", vtSsrResolve(props, "exit")]);
  if (named) attrs.push(["vt-share", cand.share]);
  return ssrBlock(vtSsrAnnotate(inner, attrs));
}
function addTransitionType(_type) {
}
function ErrorBoundary(props, scope) {
  return ssrBlock(
    (() => {
      try {
        return withAsyncIdentity(
          "error-boundary",
          "content",
          () => ssrBlock(ssrChildrenHtml(props.children, scope))
        );
      } catch (e) {
        if (ssrIsSuspense(e)) throw e;
        const fb = typeof props.fallback === "function" ? props.fallback(e, NOOP) : props.fallback;
        return withAsyncIdentity("error-boundary", "catch", () => ssrBlock(ssrChild(fb, scope)));
      }
    })()
  );
}
const CONTEXT_TAG = /* @__PURE__ */ Symbol.for("octane.context");
function createContext(defaultValue) {
  const ctx = function ProviderBody(props, scope) {
    if (scope.$$ctxValues === null) scope.$$ctxValues = /* @__PURE__ */ new Map();
    scope.$$ctxValues.set(ctx, props.value);
    const children = props.children;
    if (children == null) return "";
    return typeof children === "function" ? children(void 0, scope) ?? "" : ssrChild(children, scope);
  };
  ctx.$$kind = CONTEXT_TAG;
  ctx.defaultValue = defaultValue;
  ctx.Provider = ctx;
  return ctx;
}
function readContext(ctx) {
  for (let s = CURRENT_SCOPE; s !== null; s = s.parent) {
    if (s.$$ctxValues !== null && s.$$ctxValues.has(ctx)) return s.$$ctxValues.get(ctx);
  }
  return ctx.defaultValue;
}
function useContext(ctx) {
  return readContext(ctx);
}
const SSR_SUSPENSE = /* @__PURE__ */ Symbol("octane.ssr.suspense");
function ssrIsSuspense(err) {
  return err === SSR_SUSPENSE;
}
const HYDRATION_REJECTION_SEED = /* @__PURE__ */ Symbol("octane.ssr.hydration-rejection-seed");
function reasonSnapshot(value, state = { active: /* @__PURE__ */ new WeakSet(), nodes: 0 }, depth = 0) {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "undefined")
    return value;
  if (typeof value === "number") {
    return Number.isFinite(value) && !Object.is(value, -0) ? value : String(value);
  }
  if (typeof value === "bigint") return String(value);
  if (typeof value === "symbol") return "[symbol]";
  if (typeof value === "function") return "[function]";
  if (depth >= 20 || state.nodes++ >= 512) return "[truncated]";
  if (state.active.has(value)) return "[Circular]";
  state.active.add(value);
  try {
    let isArray;
    try {
      isArray = Array.isArray(value);
    } catch {
      return "[unavailable]";
    }
    if (isArray) {
      const arrayValue = value;
      let length2 = 0;
      try {
        length2 = Math.min(arrayValue.length, 512);
      } catch {
        return "[unavailable]";
      }
      const out2 = new Array(length2);
      for (let i = 0; i < length2; i++) {
        try {
          if (Object.prototype.hasOwnProperty.call(arrayValue, i)) {
            out2[i] = reasonSnapshot(arrayValue[i], state, depth + 1);
          }
        } catch {
          out2[i] = "[unavailable]";
        }
      }
      return out2;
    }
    const out = /* @__PURE__ */ Object.create(null);
    let keys;
    try {
      keys = Object.keys(value);
    } catch {
      return "[unavailable]";
    }
    const length = Math.min(keys.length, 512);
    for (let i = 0; i < length; i++) {
      const key = keys[i];
      try {
        out[key] = reasonSnapshot(value[key], state, depth + 1);
      } catch {
        out[key] = "[unavailable]";
      }
    }
    if (keys.length > length) out.__octane_truncated__ = true;
    return out;
  } finally {
    state.active.delete(value);
  }
}
function isErrorReason(reason) {
  try {
    if (reason instanceof Error) return true;
    if (reason === null || typeof reason !== "object") return false;
    const tag = Object.prototype.toString.call(reason);
    return tag === "[object Error]" || tag === "[object DOMException]";
  } catch {
    return false;
  }
}
function hydrationRejectionPayload(reason) {
  try {
    return hydrationRejectionPayloadUnsafe(reason);
  } catch {
    return { kind: "fallback", message: "Server-rendered use() rejected" };
  }
}
function hydrationRejectionPayloadUnsafe(reason) {
  if (typeof reason === "number" && (!Number.isFinite(reason) || Object.is(reason, -0))) {
    return {
      kind: "number",
      value: Number.isNaN(reason) ? "NaN" : Object.is(reason, -0) ? "-0" : reason === Infinity ? "Infinity" : "-Infinity"
    };
  }
  if (typeof reason === "bigint") return { kind: "bigint", value: String(reason) };
  if (typeof reason === "symbol") return { kind: "symbol", value: reason.description ?? "" };
  if (isErrorReason(reason)) {
    let name = "Error";
    let message = "Server-rendered use() rejected";
    try {
      const candidate = reason.name;
      if (typeof candidate === "string") name = candidate;
    } catch {
    }
    try {
      const candidate = reason.message;
      if (typeof candidate === "string") message = candidate;
    } catch {
    }
    const fields = /* @__PURE__ */ Object.create(null);
    let keys = [];
    try {
      keys = Object.keys(reason);
    } catch {
    }
    const length = Math.min(keys.length, 512);
    const snapshotState = { active: /* @__PURE__ */ new WeakSet(), nodes: 0 };
    snapshotState.active.add(reason);
    for (let i = 0; i < length; i++) {
      const key = keys[i];
      if (key === "name" || key === "message" || key === "stack") continue;
      try {
        fields[key] = reasonSnapshot(reason[key], snapshotState);
      } catch {
        fields[key] = "[unavailable]";
      }
    }
    if (keys.length > length) fields.__octane_truncated__ = true;
    return { kind: "error", name, message, fields };
  }
  if (typeof reason === "function") {
    return { kind: "fallback", message: "Server-rendered use() rejected (function)" };
  }
  return { kind: "value", value: reasonSnapshot(reason) };
}
function hydrationRejectionSeed(reason) {
  return { [HYDRATION_REJECTION_SEED]: hydrationRejectionPayload(reason) };
}
function isHydrationRejectionSeed(value) {
  return value !== null && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, HYDRATION_REJECTION_SEED);
}
function recordHydrationRejection(serial, reason) {
  if (serial !== null) serial.push(hydrationRejectionSeed(reason));
}
function hasExternalHydrationOwner(thenable) {
  try {
    return thenable[EXTERNAL_HYDRATION_PROMISE] === true;
  } catch {
    return false;
  }
}
function use(usable, siteKey) {
  if (usable && usable.$$kind === CONTEXT_TAG) return readContext(usable);
  const serial = hasExternalHydrationOwner(usable) ? null : SERIAL;
  const base = siteKey === void 0 ? "@" : typeof siteKey === "symbol" ? siteKey.toString() : String(siteKey);
  const frame = FRAME;
  let n = 0;
  let prefix = ASYNC_SCOPE;
  if (frame !== null) {
    n = nextFrameOccurrence(frame, base);
    prefix = asyncFramePath(frame);
  }
  const key = prefix + "|" + base + "#" + n;
  if (RESOLVED !== null) {
    const entryT = RESOLVED.pu.resolvedT.get(usable);
    if (entryT !== void 0) {
      if ("reason" in entryT) {
        recordHydrationRejection(serial, entryT.reason);
        throw entryT.reason;
      }
      if (serial !== null) serial.push(entryT.value);
      return entryT.value;
    }
  }
  const resolved = RESOLVED;
  if (resolved !== null && resolved.has(key)) {
    const entry = resolved.get(key);
    if ("reason" in entry) {
      recordHydrationRejection(serial, entry.reason);
      throw entry.reason;
    }
    if (serial !== null) serial.push(entry.value);
    return entry.value;
  }
  const instrumented = usable;
  let status = instrumented.status;
  const wasUninstrumented = status === void 0;
  if (status === "fulfilled") {
    if (serial !== null) serial.push(instrumented.value);
    return instrumented.value;
  }
  if (status === "rejected") {
    recordHydrationRejection(serial, instrumented.reason);
    throw instrumented.reason;
  }
  if (wasUninstrumented) {
    instrumented.status = "pending";
    instrumented.then(
      (value) => {
        if (instrumented.status === "pending") {
          instrumented.status = "fulfilled";
          instrumented.value = value;
        }
      },
      (reason) => {
        if (instrumented.status === "pending") {
          instrumented.status = "rejected";
          instrumented.reason = reason;
        }
      }
    );
    status = instrumented.status;
    if (status === "fulfilled") {
      if (serial !== null) serial.push(instrumented.value);
      return instrumented.value;
    }
    if (status === "rejected") {
      recordHydrationRejection(serial, instrumented.reason);
      throw instrumented.reason;
    }
  }
  if (!wasUninstrumented && typeof status === "string") {
    instrumented.then(NOOP, NOOP);
    status = instrumented.status;
    if (status === "fulfilled") {
      if (serial !== null) serial.push(instrumented.value);
      return instrumented.value;
    }
    if (status === "rejected") {
      recordHydrationRejection(serial, instrumented.reason);
      throw instrumented.reason;
    }
  }
  if (SUSPENDED !== null) SUSPENDED.push({ promise: usable, key });
  if (DEFERRED !== null && CURRENT_COMP !== null && frame !== null && !frame.deferred) {
    frame.deferred = true;
    DEFERRED.push({
      comp: CURRENT_COMP,
      props: CURRENT_PROPS,
      parentScope: CURRENT_PARENT_SCOPE,
      frame
    });
  }
  throw SSR_SUSPENSE;
}
function puDepsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}
let PU_ID = 0;
function puMemo(fn, deps, siteKey) {
  const res = RESOLVED;
  if (res === null) return fn();
  const base = siteKey === void 0 ? "@pu" : typeof siteKey === "symbol" ? siteKey.toString() : String(siteKey);
  const frame = FRAME;
  let n = 0;
  let prefix = ASYNC_SCOPE;
  if (frame !== null) {
    n = nextFrameOccurrence(frame, base);
    prefix = asyncFramePath(frame);
  }
  const key = prefix + "|" + base + "#" + n;
  const hit = res.pu.created.get(key);
  if (hit !== void 0 && puDepsEqual(hit.deps, deps)) return hit.value;
  if (siteKey !== void 0) {
    const wlist = res.pu.warm.get(siteKey);
    if (wlist !== void 0) {
      for (let i = 0; i < wlist.length; i++) {
        if (puDepsEqual(wlist[i].deps, deps)) {
          const value2 = wlist[i].value;
          wlist.splice(i, 1);
          res.pu.created.set(key, { deps, value: value2 });
          return value2;
        }
      }
    }
  }
  const value = fn();
  res.pu.created.set(key, { deps, value });
  return value;
}
function puBatch(thenables, warm) {
  const res = RESOLVED;
  const pu = res !== null ? res.pu : null;
  let pending = false;
  for (let i = 0; i < thenables.length; i++) {
    const t = thenables[i];
    if (t == null || typeof t.then !== "function") continue;
    if (pu !== null && pu.resolvedT.has(t)) continue;
    const instrumented = t;
    let status = instrumented.status;
    const wasUninstrumented = status === void 0;
    if (wasUninstrumented) {
      instrumented.status = "pending";
      instrumented.then(
        (value) => {
          if (instrumented.status === "pending") {
            instrumented.status = "fulfilled";
            instrumented.value = value;
          }
        },
        (reason) => {
          if (instrumented.status === "pending") {
            instrumented.status = "rejected";
            instrumented.reason = reason;
          }
        }
      );
      status = instrumented.status;
    }
    if (!wasUninstrumented && typeof status === "string" && status !== "fulfilled" && status !== "rejected") {
      instrumented.then(NOOP, NOOP);
      status = instrumented.status;
    }
    if (status === "fulfilled") {
      pu?.resolvedT.set(t, { value: instrumented.value });
      continue;
    }
    if (status === "rejected") {
      pu?.resolvedT.set(t, { reason: instrumented.reason });
      continue;
    }
    pending = true;
    if (SUSPENDED !== null) SUSPENDED.push({ promise: t, key: "|pu#" + PU_ID++ });
  }
  if (!pending) return;
  if (warm !== void 0) {
    try {
      warm();
    } catch {
    }
  }
  const frame = FRAME;
  if (DEFERRED !== null && CURRENT_COMP !== null && frame !== null && !frame.deferred) {
    frame.deferred = true;
    DEFERRED.push({
      comp: CURRENT_COMP,
      props: CURRENT_PROPS,
      parentScope: CURRENT_PARENT_SCOPE,
      frame
    });
  }
  throw SSR_SUSPENSE;
}
let WARM_DEPTH = 0;
const WARM_DEPTH_CAP = 64;
const WARM_SLOT_CAP = 64;
function warmMemo(compute, deps, slot) {
  const res = RESOLVED;
  if (res === null) return;
  const warm = res.pu.warm;
  let list = warm.get(slot);
  if (list !== void 0) {
    for (let i = 0; i < list.length; i++) {
      if (puDepsEqual(list[i].deps, deps)) return;
    }
  }
  let value;
  try {
    value = compute();
  } catch {
    return;
  }
  if (list === void 0) {
    list = [];
    warm.set(slot, list);
  }
  list.push({ deps, value });
  if (list.length > WARM_SLOT_CAP) list.shift();
  if (value != null && typeof value.then === "function" && !res.pu.resolvedT.has(value)) {
    if (SUSPENDED !== null)
      SUSPENDED.push({ promise: value, key: "|pu#" + PU_ID++ });
  }
}
function warmChild(comp, props) {
  if (comp == null) return;
  const plan = comp.__warm;
  if (typeof plan !== "function") return;
  if (WARM_DEPTH >= WARM_DEPTH_CAP) return;
  WARM_DEPTH++;
  try {
    plan(props);
  } catch {
  } finally {
    WARM_DEPTH--;
  }
}
let LAZY_ID = 0;
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
function callLazyComponent(mod, props, scope, extra) {
  const comp = resolveLazyModule(mod);
  return comp(lazyResolvedProps(comp, props), scope, extra);
}
function lazy(load) {
  let status = "uninitialized";
  let result = null;
  let promise = null;
  const key = "|lazy#" + LAZY_ID++;
  const lazyWrapper = (props, scope, extra) => {
    if (status === "fulfilled") {
      return callLazyComponent(result, props, scope, extra);
    }
    if (status === "rejected") throw result;
    if (status === "uninitialized") {
      try {
        const loaded = load();
        promise = loaded;
        loaded.then(
          (mod) => {
            if (status === "uninitialized" || status === "pending") {
              status = "fulfilled";
              result = mod;
            }
          },
          (err) => {
            if (status === "uninitialized" || status === "pending") {
              status = "rejected";
              result = err;
            }
          }
        );
      } catch (error) {
        if (status === "uninitialized") promise = null;
        throw error;
      }
      if (status === "uninitialized") status = "pending";
      const settledStatus = status;
      if (settledStatus === "fulfilled") {
        return callLazyComponent(result, props, scope, extra);
      }
      if (settledStatus === "rejected") throw result;
    }
    if (SUSPENDED !== null) SUSPENDED.push({ promise, key });
    const frame = FRAME;
    if (DEFERRED !== null && CURRENT_COMP !== null && frame !== null && !frame.deferred) {
      frame.deferred = true;
      DEFERRED.push({
        comp: CURRENT_COMP,
        props: CURRENT_PROPS,
        parentScope: CURRENT_PARENT_SCOPE,
        frame
      });
    }
    throw SSR_SUSPENSE;
  };
  Object.defineProperty(lazyWrapper, LAZY_COMPONENT, { value: true });
  return lazyWrapper;
}
function useState(initial, slot) {
  if (slot === void 0 && typeof initial === "symbol") {
    slot = initial;
    initial = void 0;
  }
  return stateHook(
    basicStateReducer,
    () => typeof initial === "function" ? initial() : initial,
    slot
  );
}
function __useStateWithGetter(initial, slot) {
  if (slot === void 0 && typeof initial === "symbol") {
    slot = initial;
    initial = void 0;
  }
  return stateHook(
    basicStateReducer,
    () => typeof initial === "function" ? initial() : initial,
    slot,
    true
  );
}
function useReducer(reducer, initialArg, initOrSlot, maybeSlot) {
  const init = typeof initOrSlot === "function" ? initOrSlot : void 0;
  const slot = maybeSlot !== void 0 ? maybeSlot : initOrSlot;
  return stateHook(
    reducer,
    () => init ? init(initialArg) : initialArg,
    slot
  );
}
function __useReducerWithGetter(reducer, initialArg, initOrSlot, maybeSlot) {
  const init = typeof initOrSlot === "function" ? initOrSlot : void 0;
  const slot = maybeSlot !== void 0 ? maybeSlot : initOrSlot;
  return stateHook(
    reducer,
    () => init ? init(initialArg) : initialArg,
    slot,
    true
  );
}
function useEffect() {
}
const useLayoutEffect = useEffect;
const useInsertionEffect = useEffect;
function useImperativeHandle() {
}
function serverHookDepsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}
function useMemo(compute, depsOrSlot, maybeSlot) {
  const deps = Array.isArray(depsOrSlot) ? depsOrSlot : null;
  const slot = maybeSlot ?? (Array.isArray(depsOrSlot) || depsOrSlot === null ? void 0 : depsOrSlot);
  if (deps === null) return compute();
  const position = hookPosition(slot);
  if (position === null) return compute();
  let rec = position.list[position.index];
  if (rec === void 0) {
    rec = { value: compute(), deps: deps.slice() };
    position.list[position.index] = rec;
  } else if (!serverHookDepsEqual(rec.deps, deps)) {
    rec.value = compute();
    rec.deps = deps.slice();
  }
  return rec.value;
}
function useCallback(fn, depsOrSlot, maybeSlot) {
  return useMemo(() => fn, depsOrSlot, maybeSlot);
}
function useRef(initial, slot) {
  if (slot === void 0 && typeof initial === "symbol") {
    slot = initial;
    initial = void 0;
  }
  const position = hookPosition(slot);
  if (position === null) return { current: initial };
  let rec = position.list[position.index];
  if (rec === void 0) {
    rec = { ref: { current: initial } };
    position.list[position.index] = rec;
  }
  return rec.ref;
}
function useDebugValue(_value, _format) {
}
function requestFormReset(_form) {
}
function useId() {
  return ":" + ID_PREFIX + "in-" + (ID_COUNTER++).toString(36) + ":";
}
function throwOnServerEffectEventCall() {
  throw new Error("A function wrapped in useEffectEvent can't be called during rendering.");
}
function useEffectEvent(_fn) {
  return throwOnServerEffectEventCall;
}
function useTransition() {
  return [false, NOOP];
}
function useDeferredValue(value, ...rest) {
  return rest.length >= 2 ? rest[0] : value;
}
function useSyncExternalStore(_subscribe, getSnapshot, ...rest) {
  const getServerSnapshot = rest.length >= 2 ? rest[0] : void 0;
  return getServerSnapshot ? getServerSnapshot() : getSnapshot();
}
function useActionState(_action, initialState) {
  return [initialState, NOOP, false];
}
function useFormStatus() {
  return { pending: false, data: null, method: "get", action: null };
}
function useOptimistic(state) {
  return [state, NOOP];
}
function memo(component) {
  return component;
}
function withSlot(sym, fn, ...args) {
  HOOK_SLOT_PATH.push(sym);
  try {
    return fn(...args);
  } finally {
    HOOK_SLOT_PATH.pop();
  }
}
function startTransition(fn) {
  fn();
}
function flushSync(fn) {
  return fn();
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
function injectStyle(id, css) {
  if (CSS !== null) CSS.set(id, css);
}
const HEAD_VOID_ELEMENTS = /* @__PURE__ */ new Set(["meta", "link", "base"]);
function ssrHeadEl(key, tag, attrs, text) {
  if (HEAD === null) return;
  let s = (MARKERS ? "<!--" + key + "-->" : "") + "<" + tag;
  if (attrs !== null) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (typeof v === "function" || k.length > 2 && k[0] === "o" && k[1] === "n") continue;
      if (v === "" && (k === "src" || k === "href")) continue;
      if (v === true) {
        s += " " + k;
      } else {
        const value = typeof v === "string" ? v : String(v);
        s += " " + k + '="' + escapeAttr(sanitizeURLAttribute(tag, k, value)) + '"';
      }
    }
  }
  if (HEAD_VOID_ELEMENTS.has(tag)) {
    s += ">";
  } else {
    s += ">" + (text == null ? "" : escapeHtml(text)) + "</" + tag + ">";
  }
  HEAD.html += s;
}
function namespaceHead(props) {
  if ((FRAME?.namespace ?? "html") !== "html") {
    return createElement(props.tag, props.attrs, props.text);
  }
  let headAttrs = null;
  if (props.attrs !== null) {
    headAttrs = {};
    for (const key in props.attrs) {
      if (key === "key" || key === "ref" || key === "class" || key === "className") continue;
      headAttrs[key] = props.attrs[key];
    }
  }
  ssrHeadEl(props.headKey, props.tag, headAttrs, props.text);
  return null;
}
function namespaceHeadElement(headKey, tag, attrs, text, authoredKey) {
  const key = authoredKey !== void 0 ? authoredKey : attrs?.key;
  const config = { headKey, tag, attrs, text };
  if (key !== void 0) config.key = key;
  return createElement(namespaceHead, config);
}
function spliceHead(body, head) {
  if (head === "") return body;
  const headClose = body.indexOf("</head>");
  if (headClose !== -1) return body.slice(0, headClose) + head + body.slice(headClose);
  return head + body;
}
const MAX_SUSPENSE_PASSES = 50;
let SUSPENSE_TIMEOUT_MS = 1e4;
function setSsrSuspenseTimeout(ms) {
  SUSPENSE_TIMEOUT_MS = ms;
}
function getSsrSuspenseTimeout() {
  return SUSPENSE_TIMEOUT_MS;
}
function serializeSuspenseSeedJson(values) {
  let wireValues = null;
  let rejections = null;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!isHydrationRejectionSeed(value)) continue;
    wireValues ??= values.slice();
    rejections ??= [];
    wireValues[i] = null;
    rejections.push([i, value[HYDRATION_REJECTION_SEED]]);
  }
  const payload = rejections === null ? values : {
    [REJECTION_SENTINEL_KEY]: {
      version: 1,
      values: wireValues,
      rejections
    }
  };
  const undefinedWire = SUSPENSE_SEED_WIRE_PREFIX + "u";
  const escapedStringWire = SUSPENSE_SEED_WIRE_PREFIX + "s";
  return JSON.stringify(payload, (_key, value) => {
    if (value === void 0) return undefinedWire;
    if (typeof value === "string" && value.startsWith(SUSPENSE_SEED_WIRE_PREFIX)) {
      return escapedStringWire + value;
    }
    return value;
  }).replace(/</g, "\\u003c");
}
function serializeSuspenseSeeds(values, nonceAttr) {
  const json = serializeSuspenseSeedJson(values);
  return '<script type="application/json" ' + SUSPENSE_SCRIPT_ATTR + nonceAttr + ">" + json + "</script>";
}
function newResolvedMap() {
  const m = /* @__PURE__ */ new Map();
  m.asyncIdentities = /* @__PURE__ */ new Map();
  m.asyncPositionIdentities = /* @__PURE__ */ new Map();
  m.nextAsyncIdentity = 0;
  m.pu = { created: /* @__PURE__ */ new Map(), resolvedT: /* @__PURE__ */ new Map(), warm: /* @__PURE__ */ new Map() };
  return m;
}
function saveAmbient() {
  return {
    scope: CURRENT_SCOPE,
    id: ID_COUNTER,
    idPrefix: ID_PREFIX,
    css: CSS,
    markers: MARKERS,
    head: HEAD,
    susp: SUSPENDED,
    res: RESOLVED,
    serial: SERIAL,
    frame: FRAME,
    deferred: DEFERRED,
    comp: CURRENT_COMP,
    props: CURRENT_PROPS,
    parentScope: CURRENT_PARENT_SCOPE,
    asyncScope: ASYNC_SCOPE,
    ssrElement: CURRENT_SSR_ELEMENT,
    nestingWarnings: SSR_NESTING_WARNINGS,
    vtTrySeq: VT_SSR_TRY_SEQ,
    vtHasCandidates: VT_SSR_HAS_CANDIDATES,
    vtStack: VT_SSR_STACK.map((candidate) => ({ candidate, consumed: candidate.consumed }))
  };
}
function restoreAmbient(a) {
  CURRENT_SCOPE = a.scope;
  ID_COUNTER = a.id;
  ID_PREFIX = a.idPrefix;
  CSS = a.css;
  MARKERS = a.markers;
  HEAD = a.head;
  SUSPENDED = a.susp;
  RESOLVED = a.res;
  SERIAL = a.serial;
  FRAME = a.frame;
  DEFERRED = a.deferred;
  CURRENT_COMP = a.comp;
  CURRENT_PROPS = a.props;
  CURRENT_PARENT_SCOPE = a.parentScope;
  ASYNC_SCOPE = a.asyncScope;
  CURRENT_SSR_ELEMENT = a.ssrElement;
  SSR_NESTING_WARNINGS = a.nestingWarnings;
  VT_SSR_TRY_SEQ = a.vtTrySeq;
  VT_SSR_HAS_CANDIDATES = a.vtHasCandidates;
  VT_SSR_STACK.length = 0;
  for (const snapshot of a.vtStack) {
    snapshot.candidate.consumed = snapshot.consumed;
    VT_SSR_STACK.push(snapshot.candidate);
  }
}
function nonceAttrOf(options) {
  return options?.nonce ? ' nonce="' + escapeAttr(options.nonce) + '"' : "";
}
function runFullFramedPass(component, props, resolved, nonceAttr = "", identifierPrefix = "", markers = true) {
  const saved = saveAmbient();
  ID_COUNTER = 0;
  ID_PREFIX = identifierPrefix;
  ASYNC_SCOPE = "";
  MARKERS = markers;
  VT_SSR_TRY_SEQ = 0;
  VT_SSR_HAS_CANDIDATES = false;
  VT_SSR_STACK.length = 0;
  const cssMap = CSS = /* @__PURE__ */ new Map();
  const headBuf = HEAD = { html: "", hints: /* @__PURE__ */ new Set() };
  const suspended = SUSPENDED = [];
  const serial = SERIAL = [];
  const deferred = DEFERRED = [];
  RESOLVED = resolved;
  CURRENT_SSR_ELEMENT = null;
  SSR_NESTING_WARNINGS = resolved.nestingWarnings;
  const root = ssrScope(null);
  CURRENT_SCOPE = root;
  FRAME = {
    parent: null,
    seg: 0,
    nextChild: 0,
    scopedChildren: null,
    occ: null,
    path: "",
    deferred: false,
    asyncScope: ""
  };
  CURRENT_COMP = component;
  CURRENT_PROPS = props;
  CURRENT_PARENT_SCOPE = null;
  let body = "";
  let vtCandidates = false;
  let rootSuspended = false;
  try {
    const out = invokeComponentBody(component, props, root, FRAME);
    body = typeof out === "string" ? out : out == null ? "" : ssrChild(out, root);
  } catch (err) {
    if (!ssrIsSuspense(err)) throw err;
    rootSuspended = true;
  } finally {
    vtCandidates = VT_SSR_HAS_CANDIDATES;
    restoreAmbient(saved);
  }
  let css = "";
  for (const [hash, sheet] of cssMap) {
    css += '<style data-octane="' + hash + '"' + nonceAttr + ">" + escapeEntireInlineStyleContent(sheet) + "</style>";
  }
  return {
    body,
    head: headBuf.html,
    css,
    serial,
    suspended,
    deferred,
    rootSuspended,
    vtCandidates,
    cssEntries: cssMap
  };
}
function runDiscoveryRound(jobs, resolved, identifierPrefix) {
  const saved = saveAmbient();
  ID_COUNTER = 0;
  ID_PREFIX = identifierPrefix;
  ASYNC_SCOPE = "";
  MARKERS = true;
  VT_SSR_TRY_SEQ = 0;
  VT_SSR_HAS_CANDIDATES = false;
  VT_SSR_STACK.length = 0;
  CSS = /* @__PURE__ */ new Map();
  HEAD = { html: "", hints: /* @__PURE__ */ new Set() };
  const suspended = SUSPENDED = [];
  SERIAL = [];
  const deferred = DEFERRED = [];
  RESOLVED = resolved;
  CURRENT_SSR_ELEMENT = null;
  SSR_NESTING_WARNINGS = null;
  FRAME = null;
  CURRENT_COMP = null;
  CURRENT_PROPS = null;
  CURRENT_PARENT_SCOPE = null;
  try {
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const frame = {
        parent: job.frame.parent,
        seg: job.frame.seg,
        nextChild: 0,
        scopedChildren: null,
        occ: null,
        path: null,
        deferred: false,
        asyncScope: job.frame.asyncScope
      };
      try {
        renderComponentFramed(job.comp, job.props, job.parentScope, frame);
      } catch (err) {
        if (!ssrIsSuspense(err)) continue;
      }
    }
  } finally {
    restoreAmbient(saved);
  }
  return { suspended, deferred };
}
async function raceSettleGuards(work, timeoutMs, signal) {
  const racers = [work];
  let timer;
  let removeAbort;
  if (timeoutMs > 0) {
    racers.push(
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(
            new Error("octane SSR: a use(thenable) did not settle within " + timeoutMs + "ms.")
          ),
          timeoutMs
        );
        timer?.unref?.();
      })
    );
  }
  if (signal) {
    racers.push(
      new Promise((_, reject) => {
        const onAbort = () => reject(signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
        removeAbort = () => signal.removeEventListener("abort", onAbort);
      })
    );
  }
  try {
    await (racers.length === 1 ? work : Promise.race(racers));
  } finally {
    clearTimeout(timer);
    removeAbort?.();
  }
}
async function settleSuspended(suspended, resolved, timeoutMs, signal) {
  const pu = resolved.pu;
  const settleAll = Promise.all(
    suspended.map(async ({ promise, key }) => {
      if (resolved.has(key)) return;
      const isPu = key.charCodeAt(0) === 124 && key.startsWith("|pu#");
      try {
        const outcome = { value: await promise };
        resolved.set(key, outcome);
        if (isPu) pu.resolvedT.set(promise, outcome);
      } catch (reason) {
        const outcome = { reason };
        resolved.set(key, outcome);
        if (isPu) pu.resolvedT.set(promise, outcome);
      }
    })
  );
  await raceSettleGuards(settleAll, timeoutMs, signal);
}
const yieldMacrotask = typeof setImmediate === "function" ? () => new Promise((resolve) => setImmediate(resolve)) : () => new Promise((resolve) => setTimeout(resolve, 0));
async function settleFirstOfWave(suspended, resolved, timeoutMs, signal) {
  const pu = resolved.pu;
  const recorders = [];
  for (const { promise, key } of suspended) {
    if (resolved.has(key)) continue;
    const isPu = key.startsWith("|pu#");
    recorders.push(
      (async () => {
        try {
          const value = await promise;
          if (!resolved.has(key)) resolved.set(key, { value });
          if (isPu && !pu.resolvedT.has(promise)) pu.resolvedT.set(promise, { value });
        } catch (reason) {
          if (!resolved.has(key)) resolved.set(key, { reason });
          if (isPu && !pu.resolvedT.has(promise)) pu.resolvedT.set(promise, { reason });
        }
      })()
    );
  }
  if (recorders.length === 0) return;
  await raceSettleGuards(Promise.race(recorders), timeoutMs, signal);
  await yieldMacrotask();
  let size = resolved.size;
  for (; ; ) {
    await Promise.resolve();
    await Promise.resolve();
    if (resolved.size === size) break;
    size = resolved.size;
  }
  signal?.throwIfAborted();
}
async function runBuffered(component, props, options, nonceAttr) {
  const timeoutMs = options?.timeoutMs ?? SUSPENSE_TIMEOUT_MS;
  const signal = options?.signal;
  const identifierPrefix = options?.identifierPrefix ?? "";
  const resolved = newResolvedMap();
  let attempt = 0;
  for (; ; ) {
    signal?.throwIfAborted();
    let pass;
    try {
      pass = withStream(
        null,
        () => runFullFramedPass(component, props, resolved, nonceAttr, identifierPrefix)
      );
    } catch (err) {
      options?.onError?.(err);
      throw err;
    }
    if (pass.suspended.length === 0) return pass;
    let jobs = pass.deferred;
    let pending = pass.suspended;
    for (; ; ) {
      if (++attempt > MAX_SUSPENSE_PASSES) {
        const err = new Error(
          "octane SSR: exceeded " + MAX_SUSPENSE_PASSES + " suspense passes \u2014 a use(thenable) never resolved."
        );
        options?.onError?.(err);
        throw err;
      }
      await settleSuspended(pending, resolved, timeoutMs, signal);
      if (jobs.length === 0 || !jobs.every((j) => j.frame.parent !== null)) break;
      const round = withStream(null, () => runDiscoveryRound(jobs, resolved, identifierPrefix));
      if (round.suspended.length === 0) break;
      pending = round.suspended;
      jobs = round.deferred;
    }
  }
}
function passToResult(pass, nonceAttr) {
  let body = pass.body;
  if (pass.serial.length > 0) body += serializeSuspenseSeeds(pass.serial, nonceAttr);
  const html = spliceHead(body, pass.head);
  return { html: pass.vtCandidates ? vtSsrStrip(html) : html, css: pass.css };
}
async function prerender(component, props, options) {
  const nonceAttr = nonceAttrOf(options);
  return passToResult(await runBuffered(component, props, options, nonceAttr), nonceAttr);
}
function renderToString(component, props, options) {
  options?.signal?.throwIfAborted();
  const nonceAttr = nonceAttrOf(options);
  const resolved = newResolvedMap();
  let pass;
  try {
    pass = withStream(
      null,
      () => runFullFramedPass(component, props, resolved, nonceAttr, options?.identifierPrefix ?? "")
    );
  } catch (err) {
    options?.onError?.(err);
    throw err;
  }
  return passToResult(pass, nonceAttr);
}
function renderToStaticMarkup(component, props, options) {
  options?.signal?.throwIfAborted();
  const nonceAttr = nonceAttrOf(options);
  const resolved = newResolvedMap();
  let pass;
  try {
    pass = withStream(
      null,
      () => runFullFramedPass(
        component,
        props,
        resolved,
        nonceAttr,
        options?.identifierPrefix ?? "",
        false
      )
    );
  } catch (err) {
    options?.onError?.(err);
    throw err;
  }
  const html = spliceHead(pass.body, pass.head);
  return { html: pass.vtCandidates ? vtSsrStrip(html) : html, css: pass.css };
}
const STREAM_REALM_SALT = (() => {
  const crypto = globalThis.crypto;
  const entropy = crypto?.randomUUID?.().replace(/-/g, "") ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
  return entropy.replace(/[^a-zA-Z0-9_-]/g, "");
})();
let NEXT_STREAM_TOKEN = 0;
function createStreamToken() {
  return "os" + STREAM_REALM_SALT + "-" + (NEXT_STREAM_TOKEN++).toString(36);
}
let STREAM = null;
function pruneUnrepresentedStreamDescendants(stream, ownerKey, ownerHtml) {
  let removed = true;
  while (removed) {
    removed = false;
    for (const [childKey, child] of stream.boundaries) {
      if (childKey === ownerKey) continue;
      let nearestOwner = null;
      for (let i = child.owners.length - 1; i >= 0; i--) {
        const candidate = child.owners[i];
        if (candidate === ownerKey || stream.boundaries.has(candidate)) {
          nearestOwner = candidate;
          break;
        }
      }
      if (nearestOwner !== ownerKey) continue;
      if (ownerHtml.includes(STREAM_BOUNDARY_ATTR + '="' + child.id + '"')) continue;
      stream.boundaries.delete(childKey);
      removed = true;
    }
  }
}
function pruneStreamBoundariesAbsentFromShell(stream, shellBoundaryKeys) {
  for (const key of stream.boundaries.keys()) {
    if (!shellBoundaryKeys.has(key)) stream.boundaries.delete(key);
  }
}
function ssrTry(scope, siteKey, tryFn, pendFn, catchFn, namespace = FRAME?.namespace ?? "html") {
  VT_SSR_TRY_SEQ++;
  let vtOuter = null;
  if (VT_SSR_STACK.length > 0) {
    const top = VT_SSR_STACK[VT_SSR_STACK.length - 1];
    if (!top.consumed) {
      top.consumed = true;
      vtOuter = top;
    }
  }
  const stream = STREAM;
  const frame = FRAME;
  const base = "@try:" + siteKey;
  let occurrence = 0;
  if (frame !== null) {
    occurrence = nextFrameOccurrence(frame, base);
  }
  const key = asyncFramePath(frame) + "|" + base + "#" + occurrence;
  const outerAsyncScope = ASYNC_SCOPE;
  const armScope = outerAsyncScope + "|@arm:" + siteKey + "#" + occurrence.toString(36) + ":";
  let entry;
  let serialStart = 0;
  let ancestorKeys = [];
  let ownerKeys = [];
  if (stream !== null) {
    stream.activePassBoundaryKeys?.add(key);
    ancestorKeys = stream.activeTryKeys.slice();
    ownerKeys = stream.activeOwnerKeys.slice();
    entry = stream.boundaries.get(key);
    if (entry !== void 0) entry.namespace = namespace;
    if (entry !== void 0 && entry.state === "pending") {
      entry.ancestors = ancestorKeys;
      entry.owners = ownerKeys;
    }
    serialStart = SERIAL !== null ? SERIAL.length : 0;
  }
  const withArmScope = (arm, fn) => {
    const prev = ASYNC_SCOPE;
    ASYNC_SCOPE = armScope + arm;
    try {
      return fn();
    } finally {
      ASYNC_SCOPE = prev;
    }
  };
  const withContentArm = (fn) => withArmScope("content", () => {
    if (stream === null) return fn();
    stream.activeTryKeys.push(key);
    stream.activeOwnerKeys.push(key);
    try {
      return fn();
    } finally {
      stream.activeOwnerKeys.pop();
      stream.activeTryKeys.pop();
    }
  });
  const withPendingArm = (fn) => {
    return withArmScope("pending", () => {
      if (stream === null) return fn();
      stream.activeOwnerKeys.push(key);
      try {
        return fn();
      } finally {
        stream.activeOwnerKeys.pop();
      }
    });
  };
  const withCatchArm = (fn) => withArmScope("catch", () => {
    if (stream === null) return fn();
    stream.activeTryKeys.push(key);
    stream.activeOwnerKeys.push(key);
    try {
      return fn();
    } finally {
      stream.activeOwnerKeys.pop();
      stream.activeTryKeys.pop();
    }
  });
  const outerIdPrefix = ID_PREFIX;
  const outerIdCounter = ID_COUNTER;
  let boundaryIds = false;
  const enterBoundaryIds = (next) => {
    if (entry === void 0) return;
    ID_PREFIX = outerIdPrefix + "b" + entry.id + "-";
    ID_COUNTER = next;
    boundaryIds = true;
  };
  const restoreOuterIds = () => {
    ID_PREFIX = outerIdPrefix;
    ID_COUNTER = outerIdCounter;
    boundaryIds = false;
  };
  if (entry !== void 0) enterBoundaryIds(0);
  const pendingForm = () => {
    const renderFallback = () => withPendingArm(
      () => pendFn !== null ? vtSsrClaimArm(ssrBlock(pendFn(void 0, scope)), "exit") : ""
    );
    let fallback;
    if (entry !== void 0 && entry.state === "done") {
      const suspendedStart = SUSPENDED?.length ?? 0;
      const deferredStart = DEFERRED?.length ?? 0;
      const serialStart2 = SERIAL?.length ?? 0;
      const css = CSS;
      const cssSnapshot = css === null ? null : new Map(css);
      const head = HEAD;
      const headHtml = head?.html;
      const headHints = head === null ? null : new Set(head.hints);
      const vtTrySeq = VT_SSR_TRY_SEQ;
      const vtHasCandidates = VT_SSR_HAS_CANDIDATES;
      const vtStack = VT_SSR_STACK.map((candidate) => ({
        candidate,
        consumed: candidate.consumed
      }));
      try {
        fallback = withStream(null, renderFallback);
      } catch (error) {
        if (!ssrIsSuspense(error)) throw error;
        fallback = "";
      } finally {
        if (SUSPENDED !== null) SUSPENDED.length = suspendedStart;
        if (DEFERRED !== null) DEFERRED.length = deferredStart;
        if (SERIAL !== null) SERIAL.length = serialStart2;
        if (css !== null && cssSnapshot !== null) {
          css.clear();
          for (const [hash, sheet] of cssSnapshot) css.set(hash, sheet);
        }
        if (head !== null && headHints !== null) {
          head.html = headHtml;
          head.hints.clear();
          for (const hint of headHints) head.hints.add(hint);
        }
        VT_SSR_TRY_SEQ = vtTrySeq;
        VT_SSR_HAS_CANDIDATES = vtHasCandidates;
        VT_SSR_STACK.length = 0;
        for (const snapshot of vtStack) {
          snapshot.candidate.consumed = snapshot.consumed;
          VT_SSR_STACK.push(snapshot.candidate);
        }
      }
    } else {
      fallback = renderFallback();
    }
    if (entry !== void 0) {
      return ssrBlock(
        "<template " + STREAM_BOUNDARY_ATTR + '="' + entry.id + '"></template>' + fallback
      );
    }
    return ssrBlock(pendFn !== null ? fallback : "");
  };
  try {
    try {
      const inner = vtSsrClaimArm(ssrBlock(withContentArm(() => tryFn(void 0, scope))), "enter");
      if (entry !== void 0) {
        if (entry.state === "pending") {
          entry.state = "done";
          entry.html = vtOuter !== null ? vtSsrAnnotate(inner, [
            ["vt-name", vtOuter.name],
            ["vt-update", vtOuter.update],
            ["vt-share", vtOuter.share]
          ]) : inner;
          if (SERIAL !== null) {
            entry.seeds = SERIAL.slice(serialStart);
            SERIAL.length = serialStart;
          }
          pruneUnrepresentedStreamDescendants(stream, key, entry.html);
        } else if (SERIAL !== null) {
          SERIAL.length = serialStart;
        }
        ID_COUNTER = entry.pendingIdOffset;
        return pendingForm();
      }
      return ssrBlock(inner);
    } catch (e) {
      if (ssrIsSuspense(e)) {
        if (stream !== null) {
          if (SERIAL !== null) SERIAL.length = serialStart;
          if (entry === void 0) {
            const pendingIdOffset = Math.max(0, ID_COUNTER - outerIdCounter);
            restoreOuterIds();
            const order = stream.nextId++;
            entry = {
              id: stream.token + "-" + order.toString(36),
              order,
              state: "pending",
              html: "",
              seeds: [],
              pendingIdOffset,
              namespace,
              ancestors: ancestorKeys,
              owners: ownerKeys
            };
            stream.boundaries.set(key, entry);
            enterBoundaryIds(pendingIdOffset);
          } else {
            ID_COUNTER = entry.pendingIdOffset;
          }
        }
        return pendingForm();
      }
      if (catchFn !== null) {
        const caughtSeeds = entry !== void 0 && SERIAL !== null ? SERIAL.slice(serialStart) : [];
        if (entry !== void 0 && SERIAL !== null) SERIAL.length = serialStart;
        const inner = ssrBlock(withCatchArm(() => catchFn(e, scope, NOOP)));
        if (entry !== void 0) {
          if (entry.state !== "done") {
            if (SERIAL !== null) {
              caughtSeeds.push(...SERIAL.slice(serialStart));
              SERIAL.length = serialStart;
            }
            entry.state = "done";
            entry.html = inner;
            entry.seeds = caughtSeeds;
            pruneUnrepresentedStreamDescendants(stream, key, entry.html);
          } else if (SERIAL !== null) {
            SERIAL.length = serialStart;
          }
          ID_COUNTER = entry.pendingIdOffset;
          return pendingForm();
        }
        return ssrBlock(inner);
      }
      if (stream !== null) {
        if (SERIAL !== null) SERIAL.length = serialStart;
        if (entry === void 0) {
          const pendingIdOffset = Math.max(0, ID_COUNTER - outerIdCounter);
          restoreOuterIds();
          const order = stream.nextId++;
          entry = {
            id: stream.token + "-" + order.toString(36),
            order,
            state: "errored",
            error: e,
            html: "",
            seeds: [],
            pendingIdOffset,
            namespace,
            ancestors: ancestorKeys,
            owners: ownerKeys
          };
          stream.boundaries.set(key, entry);
          enterBoundaryIds(pendingIdOffset);
        } else if (entry.state === "pending") {
          entry.state = "errored";
          entry.error = e;
          ID_COUNTER = entry.pendingIdOffset;
        } else if (entry.state === "errored") {
          ID_COUNTER = entry.pendingIdOffset;
        } else {
          throw e;
        }
        const fallback = pendingForm();
        pruneUnrepresentedStreamDescendants(stream, key, fallback);
        return fallback;
      }
      throw e;
    }
  } finally {
    ASYNC_SCOPE = outerAsyncScope;
    if (boundaryIds) restoreOuterIds();
  }
}
const STREAM_RUNTIME_JS = "(function(){var d=document;var S=window.$OCTS=window.$OCTS||{};var M=function(v,c){if(v===c)return 1;if(!v||v.charAt(0)!==c)return 0;var s=v.slice(1),n=+s;return n>=2&&Number.isSafeInteger(n)&&String(n)===s;};window.$OCTRC=function(id,nc){var t=d.querySelector('template[" + STREAM_BOUNDARY_ATTR + `="'+id+'"]');var s=d.querySelector('[` + STREAM_SEGMENT_ATTR + `="'+id+'"]');if(!s)return;if(!t){s.remove();return;}var q=s.firstElementChild,z=d.createElement("template"),c=s;if(q&&q.localName==="script"){try{z.innerHTML=JSON.parse(q.textContent);c=z.content;}catch(e){return;}}var sd=c.querySelector("script[` + STREAM_SEED_ATTR + ']");if(sd){S[id]=sd.textContent;sd.parentNode.removeChild(sd);}if(nc)c=c.firstElementChild;var n=t.nextSibling,depth=1;while(n){var x=n.nextSibling,v=n.nodeType===8?n.data:null;if(M(v,"["))depth++;else if(M(v,"]")){depth--;if(depth===0)break;}n.parentNode.removeChild(n);n=x;}var p=t.parentNode;while(c.firstChild)p.insertBefore(c.firstChild,n);p.replaceChild(d.createComment("' + STREAM_SEED_COMMENT + `"+id),t);s.parentNode.removeChild(s);};window.$OCTRX=function(id){var t=d.querySelector('template[` + STREAM_BOUNDARY_ATTR + `="'+id+'"]');if(t)t.setAttribute("data-oct-err","");};})();`;
function withStream(stream, fn) {
  const prev = STREAM;
  STREAM = stream;
  try {
    return fn();
  } finally {
    STREAM = prev;
  }
}
function segmentChunk(b, nonceAttr) {
  let seedScript = "";
  if (b.seeds.length > 0) {
    const json = serializeSuspenseSeedJson(b.seeds);
    seedScript = '<script type="application/json" ' + STREAM_SEED_ATTR + nonceAttr + ">" + json + "</script>";
  }
  const html = vtSsrStrip(b.html);
  const content = b.namespace === "svg" ? seedScript + "<svg>" + html + "</svg>" : b.namespace === "mathml" ? seedScript + "<math>" + html + "</math>" : seedScript + html;
  const hasNamespaceCarrier = b.namespace === "html" ? "" : ",1";
  const payload = JSON.stringify(content).replace(/</g, "\\u003c");
  return "<div hidden " + STREAM_SEGMENT_ATTR + '="' + escapeAttr(b.id) + '"><script type="application/json" ' + STREAM_SCRIPT_ATTR + nonceAttr + ">" + payload + "</script></div><script " + STREAM_SCRIPT_ATTR + nonceAttr + ">$OCTRC(" + JSON.stringify(b.id).replace(/</g, "\\u003c") + hasNamespaceCarrier + ")</script>";
}
function boundaryErrorChunk(b, nonceAttr) {
  return "<script " + STREAM_SCRIPT_ATTR + nonceAttr + ">$OCTRX(" + JSON.stringify(b.id).replace(/</g, "\\u003c") + ")</script>";
}
async function runStream(component, props, options, sink) {
  const timeoutMs = options?.timeoutMs ?? SUSPENSE_TIMEOUT_MS;
  const signal = options?.signal;
  const nonceAttr = nonceAttrOf(options);
  const identifierPrefix = options?.identifierPrefix ?? "";
  const resolved = newResolvedMap();
  const stream = {
    boundaries: /* @__PURE__ */ new Map(),
    nextId: 0,
    token: createStreamToken(),
    activePassBoundaryKeys: null,
    activeTryKeys: [],
    activeOwnerKeys: []
  };
  const renderFullPass = () => {
    const boundaryKeys = /* @__PURE__ */ new Set();
    const previousBoundaryKeys = stream.activePassBoundaryKeys;
    stream.activePassBoundaryKeys = boundaryKeys;
    try {
      return {
        pass: withStream(
          stream,
          () => runFullFramedPass(component, props, resolved, nonceAttr, identifierPrefix)
        ),
        boundaryKeys
      };
    } finally {
      stream.activePassBoundaryKeys = previousBoundaryKeys;
    }
  };
  const emittedCss = /* @__PURE__ */ new Set();
  const flushedSegments = /* @__PURE__ */ new Set();
  const observedDone = /* @__PURE__ */ new Set();
  const reachableDoneSegments = () => {
    const done = [];
    const reachable = new Set(flushedSegments);
    for (; ; ) {
      const next = [...stream.boundaries.values()].filter((boundary) => {
        if (boundary.state !== "done" || reachable.has(boundary.id)) return false;
        for (let i = boundary.ancestors.length - 1; i >= 0; i--) {
          const ancestor = stream.boundaries.get(boundary.ancestors[i]);
          if (ancestor !== void 0) return reachable.has(ancestor.id);
        }
        return true;
      }).sort((a, b) => a.order - b.order);
      if (next.length === 0) return done;
      for (const boundary of next) {
        done.push(boundary);
        reachable.add(boundary.id);
      }
    }
  };
  const reportRecoverableBoundaryErrors = () => {
    for (const boundary of stream.boundaries.values()) {
      if (boundary.state !== "errored" || boundary.errorReported) continue;
      boundary.errorReported = true;
      options?.onError?.(boundary.error);
    }
  };
  const reachableErroredBoundaries = () => [...stream.boundaries.values()].filter((boundary) => {
    if (boundary.state !== "errored" || boundary.errorFlushed) return false;
    for (let i = boundary.ancestors.length - 1; i >= 0; i--) {
      const ancestor = stream.boundaries.get(boundary.ancestors[i]);
      if (ancestor !== void 0) return flushedSegments.has(ancestor.id);
    }
    return true;
  }).sort((a, b) => a.order - b.order);
  const flushRecoverableBoundaryErrors = () => {
    const errors = reachableErroredBoundaries();
    if (errors.length === 0) return;
    let chunk = "";
    for (const boundary of errors) chunk += boundaryErrorChunk(boundary, nonceAttr);
    const write = sink.write(chunk);
    const markFlushed = () => {
      for (const boundary of errors) boundary.errorFlushed = true;
    };
    if (write === void 0) {
      markFlushed();
      return;
    }
    return write.then(markFlushed);
  };
  let pass;
  let shellBoundaryKeys;
  let preShellSuspended = [];
  try {
    signal?.throwIfAborted();
    ({ pass, boundaryKeys: shellBoundaryKeys } = renderFullPass());
    preShellSuspended = pass.suspended;
    signal?.throwIfAborted();
    let rootAttempts = 0;
    while (pass.rootSuspended) {
      if (pass.suspended.length === 0) {
        throw new Error("octane SSR: a root suspension no longer has resumable work.");
      }
      if (++rootAttempts > MAX_SUSPENSE_PASSES) {
        throw new Error(
          "octane SSR: " + MAX_SUSPENSE_PASSES + " root streaming passes completed without producing a shell."
        );
      }
      await settleFirstOfWave(pass.suspended, resolved, timeoutMs, signal);
      ({ pass, boundaryKeys: shellBoundaryKeys } = renderFullPass());
      preShellSuspended = pass.suspended;
      signal?.throwIfAborted();
    }
    pruneStreamBoundariesAbsentFromShell(stream, shellBoundaryKeys);
  } catch (err) {
    const reports = signal?.aborted ? Math.max(1, preShellSuspended.length) : 1;
    for (let i = 0; i < reports; i++) options?.onError?.(err);
    sink.shellError(err);
    return;
  }
  reportRecoverableBoundaryErrors();
  let shell = "";
  for (const [hash, sheet] of pass.cssEntries) {
    emittedCss.add(hash);
    shell += '<style data-octane="' + hash + '"' + nonceAttr + ">" + escapeEntireInlineStyleContent(sheet) + "</style>";
  }
  shell += pass.head + pass.body;
  if (pass.serial.length > 0) shell += serializeSuspenseSeeds(pass.serial, nonceAttr);
  const anyPending = stream.boundaries.size > 0;
  if (anyPending)
    shell += "<script " + STREAM_SCRIPT_ATTR + nonceAttr + ">" + STREAM_RUNTIME_JS + "</script>";
  try {
    const shellWrite = sink.write(pass.vtCandidates ? vtSsrStrip(shell) : shell);
    if (shellWrite !== void 0) await shellWrite;
  } catch (err) {
    options?.onError?.(err);
    sink.shellError(err);
    return;
  }
  sink.shellReady();
  let suspended = pass.suspended;
  let attempt = 0;
  try {
    const initiallyDone = reachableDoneSegments();
    if (initiallyDone.length > 0) {
      let chunk = "";
      for (const boundary of initiallyDone) chunk += segmentChunk(boundary, nonceAttr);
      const segmentWrite = sink.write(pass.vtCandidates ? vtSsrStrip(chunk) : chunk);
      if (segmentWrite !== void 0) await segmentWrite;
      for (const boundary of initiallyDone) {
        flushedSegments.add(boundary.id);
        observedDone.add(boundary.id);
      }
    }
    const initialErrorWrite = flushRecoverableBoundaryErrors();
    if (initialErrorWrite !== void 0) await initialErrorWrite;
    while ([...stream.boundaries.values()].some((b) => b.state === "pending")) {
      signal?.throwIfAborted();
      if (suspended.length === 0) {
        throw new Error(
          "octane SSR: a pending streamed boundary no longer has resumable work; its error escaped to an ancestor that was already flushed."
        );
      }
      if (++attempt > MAX_SUSPENSE_PASSES) {
        throw new Error(
          "octane SSR: " + MAX_SUSPENSE_PASSES + " consecutive streaming passes completed no boundary \u2014 a use(thenable) never resolved."
        );
      }
      await settleFirstOfWave(suspended, resolved, timeoutMs, signal);
      pass = renderFullPass().pass;
      suspended = pass.suspended;
      reportRecoverableBoundaryErrors();
      let chunk = "";
      for (const [hash, sheet] of pass.cssEntries) {
        if (emittedCss.has(hash)) continue;
        emittedCss.add(hash);
        chunk += '<style data-octane="' + hash + '"' + nonceAttr + ">" + escapeEntireInlineStyleContent(sheet) + "</style>";
      }
      let madeProgress = false;
      for (const boundary of stream.boundaries.values()) {
        if (boundary.state === "done" && !observedDone.has(boundary.id)) {
          observedDone.add(boundary.id);
          madeProgress = true;
        }
      }
      if (madeProgress) attempt = 0;
      const done = reachableDoneSegments();
      for (const b of done) chunk += segmentChunk(b, nonceAttr);
      if (chunk !== "") {
        const segmentWrite = sink.write(pass.vtCandidates ? vtSsrStrip(chunk) : chunk);
        if (segmentWrite !== void 0) await segmentWrite;
        for (const b of done) flushedSegments.add(b.id);
      }
      const errorWrite = flushRecoverableBoundaryErrors();
      if (errorWrite !== void 0) await errorWrite;
    }
  } catch (err) {
    const pendingBoundaryCount = [...stream.boundaries.values()].filter(
      (boundary) => boundary.state === "pending" && !flushedSegments.has(boundary.id)
    ).length;
    const reports = signal?.aborted ? Math.max(1, pendingBoundaryCount) : 1;
    for (let i = 0; i < reports; i++) options?.onError?.(err);
    let tail = "";
    for (const b of stream.boundaries.values()) {
      if (!flushedSegments.has(b.id) && !b.errorFlushed) tail += boundaryErrorChunk(b, nonceAttr);
    }
    if (tail !== "") {
      try {
        const terminalWrite = sink.write(tail, true);
        if (terminalWrite !== void 0) await terminalWrite;
      } catch {
      }
    }
    sink.fatal(err);
    return;
  }
  sink.allReady();
}
function renderToPipeableStream(component, props, options) {
  const controller = new AbortController();
  let removeOuterAbort;
  if (options?.signal) {
    const outer = options.signal;
    if (outer.aborted) controller.abort(outer.reason);
    else {
      const onAbort = () => controller.abort(outer.reason);
      outer.addEventListener("abort", onAbort, { once: true });
      removeOuterAbort = () => outer.removeEventListener("abort", onAbort);
    }
  }
  let destination = null;
  const buffered = [];
  let ended = false;
  let closed = false;
  let endCalled = false;
  let pipeCalled = false;
  let writeGate = null;
  const destinationFailure = (reason) => {
    if (closed) return;
    closed = true;
    const error = reason ?? new Error("The stream destination closed.");
    if (ended) options?.onError?.(error);
    if (!controller.signal.aborted) {
      controller.abort(error);
    }
  };
  const finishEnd = () => {
    if (!ended || destination === null || writeGate !== null || endCalled || closed) return;
    endCalled = true;
    try {
      destination.end();
    } catch (err) {
      destinationFailure(err);
    }
  };
  const waitForDrain = (dest) => {
    if (dest.once === void 0) {
      return Promise.reject(
        new TypeError(
          "octane SSR: destination.write() returned false but the destination cannot emit drain."
        )
      );
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const remove = (event, listener) => {
        if (dest.off !== void 0) dest.off(event, listener);
        else dest.removeListener?.(event, listener);
      };
      const cleanup = () => {
        remove("drain", onDrain);
        remove("error", onError);
        remove("close", onClose);
        controller.signal.removeEventListener("abort", onAbort);
      };
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn();
      };
      const onDrain = () => finish(resolve);
      const onError = (err) => finish(() => {
        destinationFailure(err);
        reject(err);
      });
      const onClose = () => finish(() => {
        const err = new Error("The stream destination closed.");
        if (!endCalled) destinationFailure(err);
        reject(err);
      });
      const onAbort = () => finish(() => reject(controller.signal.reason));
      dest.once("drain", onDrain);
      dest.once("error", onError);
      dest.once("close", onClose);
      if (controller.signal.aborted) onAbort();
      else controller.signal.addEventListener("abort", onAbort, { once: true });
    });
  };
  const writeNow = (chunk, terminal) => {
    const dest = destination;
    if (closed) return Promise.reject(new Error("The stream destination is closed."));
    if (!terminal && controller.signal.aborted) {
      return Promise.reject(controller.signal.reason);
    }
    let accepted;
    try {
      accepted = dest.write(chunk);
    } catch (err) {
      destinationFailure(err);
      return Promise.reject(err);
    }
    return accepted === false && !terminal ? waitForDrain(dest) : void 0;
  };
  const trackWrite = (operation) => {
    const gate = operation.then(
      () => {
      },
      () => {
      }
    );
    writeGate = gate;
    gate.then(() => {
      if (writeGate === gate) {
        writeGate = null;
        finishEnd();
      }
    });
    operation.catch((err) => {
      if (!controller.signal.aborted) destinationFailure(err);
    });
    return operation;
  };
  const queueWrite = (chunk, terminal = false) => {
    if (destination === null) {
      buffered.push({ chunk, terminal });
      return;
    }
    if (writeGate !== null) {
      const operation2 = writeGate.then(() => writeNow(chunk, terminal));
      return trackWrite(operation2);
    }
    const operation = writeNow(chunk, terminal);
    return operation === void 0 ? void 0 : trackWrite(operation);
  };
  const flushEnd = () => {
    if (ended) return;
    ended = true;
    removeOuterAbort?.();
    finishEnd();
  };
  let started = false;
  const startRender = () => {
    if (started) return;
    started = true;
    void runStream(
      component,
      props,
      { ...options, signal: controller.signal },
      {
        write(chunk, terminal) {
          return queueWrite(chunk, terminal);
        },
        shellReady() {
          options?.onShellReady?.();
        },
        shellError(err) {
          options?.onShellError?.(err);
          flushEnd();
        },
        allReady() {
          options?.onAllReady?.();
          flushEnd();
        },
        fatal() {
          options?.onAllReady?.();
          flushEnd();
        }
      }
    ).catch((err) => {
      options?.onError?.(err);
      flushEnd();
    });
  };
  queueMicrotask(startRender);
  return {
    pipe(dest) {
      if (pipeCalled) throw new Error("octane SSR: pipe() may only be called once.");
      pipeCalled = true;
      startRender();
      const nodeDest = dest;
      destination = nodeDest;
      if (nodeDest.once !== void 0) {
        nodeDest.once("error", (err) => destinationFailure(err));
        nodeDest.once("close", () => {
          if (!endCalled) destinationFailure(new Error("The stream destination closed."));
        });
      }
      for (const item of buffered) {
        queueWrite(item.chunk, item.terminal || controller.signal.aborted);
      }
      buffered.length = 0;
      finishEnd();
      return dest;
    },
    abort(reason) {
      if (!ended) controller.abort(reason ?? new Error("The render was aborted."));
    }
  };
}
function renderToReadableStream(component, props, options) {
  return new Promise((resolveShell, rejectShell) => {
    const encoder = new TextEncoder();
    const renderController = new AbortController();
    let removeOuterAbort;
    if (options?.signal) {
      const outer = options.signal;
      if (outer.aborted) renderController.abort(outer.reason);
      else {
        const onAbort = () => renderController.abort(outer.reason);
        outer.addEventListener("abort", onAbort, { once: true });
        removeOuterAbort = () => outer.removeEventListener("abort", onAbort);
      }
    }
    let readableController;
    let wakeDemand = null;
    let consumerCancelled = false;
    let cancelReason;
    let closed = false;
    let allReadyResolve;
    let allReadyReject;
    const allReady = new Promise((res, rej) => {
      allReadyResolve = res;
      allReadyReject = rej;
    });
    allReady.catch(() => {
    });
    const wakeWriter = () => {
      const wake = wakeDemand;
      wakeDemand = null;
      wake?.();
    };
    const stream = new ReadableStream({
      start(c) {
        readableController = c;
      },
      pull() {
        wakeWriter();
      },
      cancel(reason) {
        if (closed) return;
        consumerCancelled = true;
        cancelReason = reason ?? new Error("The stream consumer cancelled.");
        removeOuterAbort?.();
        renderController.abort(cancelReason);
        wakeWriter();
      }
    });
    stream.allReady = allReady;
    let shellDone = false;
    const waitForDemand = () => new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        renderController.signal.removeEventListener("abort", onAbort);
      };
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (wakeDemand === onDemand) wakeDemand = null;
        fn();
      };
      const onDemand = () => finish(resolve);
      const onAbort = () => finish(() => reject(renderController.signal.reason));
      wakeDemand = onDemand;
      if (renderController.signal.aborted) onAbort();
      else renderController.signal.addEventListener("abort", onAbort, { once: true });
    });
    const writeReadable = (chunk, terminal = false) => {
      if (closed || consumerCancelled) {
        return Promise.reject(cancelReason ?? new Error("The readable stream is closed."));
      }
      if (!terminal && renderController.signal.aborted) {
        return Promise.reject(renderController.signal.reason);
      }
      const bytes = encoder.encode(chunk);
      if (terminal) {
        readableController.enqueue(bytes);
        return;
      }
      if ((readableController.desiredSize ?? 0) > 0) {
        readableController.enqueue(bytes);
        return;
      }
      return (async () => {
        while ((readableController.desiredSize ?? 0) <= 0) {
          await waitForDemand();
          if (closed || consumerCancelled) {
            throw cancelReason ?? new Error("The readable stream is closed.");
          }
        }
        readableController.enqueue(bytes);
      })();
    };
    const closeReadable = () => {
      if (closed || consumerCancelled) return;
      closed = true;
      removeOuterAbort?.();
      wakeWriter();
      try {
        readableController.close();
      } catch {
      }
    };
    runStream(
      component,
      props,
      { ...options, signal: renderController.signal },
      {
        write(chunk, terminal) {
          return writeReadable(chunk, terminal);
        },
        shellReady() {
          shellDone = true;
          options?.onShellReady?.();
          resolveShell(stream);
        },
        shellError(err) {
          options?.onShellError?.(err);
          if (!shellDone) rejectShell(err);
          allReadyReject(err);
          closeReadable();
        },
        allReady() {
          options?.onAllReady?.();
          allReadyResolve();
          closeReadable();
        },
        fatal(err) {
          allReadyReject(err);
          closeReadable();
        }
      }
    ).catch((err) => {
      options?.onError?.(err);
      if (!shellDone) rejectShell(err);
      allReadyReject(err);
      closeReadable();
    });
  });
}
function emitHeadHint(key, html) {
  if (HEAD === null) return;
  if (HEAD.hints.has(key)) return;
  HEAD.hints.add(key);
  HEAD.html += html;
}
function hintAttrs(opts, skipAs, tag) {
  let out = "";
  if (opts == null) return out;
  for (const k in opts) {
    if (skipAs && k === "as") continue;
    const v = opts[k];
    if (v == null || v === false) continue;
    const name = k === "crossOrigin" ? "crossorigin" : k.toLowerCase();
    if (v === true) {
      out += " " + name;
    } else {
      const value = typeof v === "string" ? v : String(v);
      out += " " + name + '="' + escapeAttr(sanitizeURLAttribute(tag, name, value)) + '"';
    }
  }
  return out;
}
function coerceHintHref(href) {
  if (!href) return null;
  const value = typeof href === "string" ? href : String(href);
  return value === "" ? null : value;
}
function preload(href, options) {
  const value = coerceHintHref(href);
  if (value === null || !options?.as) return;
  const key = "preload:" + options.as + ":" + value;
  const safeHref = sanitizeURL(value);
  emitHeadHint(
    key,
    '<link rel="preload" href="' + escapeAttr(safeHref) + '"' + hintAttrs(options, false, "link") + ' data-oct-hint="' + escapeAttr(key) + '">'
  );
}
function preinit(href, options) {
  const value = coerceHintHref(href);
  if (value === null || !options?.as) return;
  const key = "preinit:" + options.as + ":" + value;
  const safeHref = sanitizeURL(value);
  const hint = ' data-oct-hint="' + escapeAttr(key) + '"';
  emitHeadHint(
    key,
    options.as === "style" ? '<link rel="stylesheet" href="' + escapeAttr(safeHref) + '"' + hintAttrs(options, true, "link") + hint + ">" : '<script src="' + escapeAttr(safeHref) + '" async' + hintAttrs(options, true, "script") + hint + "></script>"
  );
}
function preconnect(href, options) {
  const value = coerceHintHref(href);
  if (value === null) return;
  const key = "preconnect:" + value;
  const safeHref = sanitizeURL(value);
  emitHeadHint(
    key,
    '<link rel="preconnect" href="' + escapeAttr(safeHref) + '"' + hintAttrs(options, false, "link") + ' data-oct-hint="' + escapeAttr(key) + '">'
  );
}
function prefetchDNS(href) {
  const value = coerceHintHref(href);
  if (value === null) return;
  const key = "dns-prefetch:" + value;
  const safeHref = sanitizeURL(value);
  emitHeadHint(
    key,
    '<link rel="dns-prefetch" href="' + escapeAttr(safeHref) + '" data-oct-hint="' + escapeAttr(key) + '">'
  );
}
export {
  Activity,
  Children,
  EXTERNAL_HYDRATION_PROMISE,
  ErrorBoundary,
  Fragment,
  HYDRATION_RANGE_BOUNDARY,
  Suspense,
  ViewTransition,
  __useReducerWithGetter,
  __useStateWithGetter,
  addTransitionType,
  cloneElement,
  createContext,
  createElement,
  createPortal,
  escapeAttr,
  escapeHtml,
  flushSync,
  getSsrSuspenseTimeout,
  hookSlots,
  injectStyle,
  isChildrenBlock,
  isValidElement,
  lazy,
  markChildrenBlock,
  memo,
  namespaceHead,
  namespaceHeadElement,
  normalizeClass,
  positionalChildren,
  preconnect,
  prefetchDNS,
  preinit,
  preload,
  prerender,
  puBatch,
  puMemo,
  renderToPipeableStream,
  renderToReadableStream,
  renderToStaticMarkup,
  renderToString,
  requestFormReset,
  setSsrSuspenseTimeout,
  ssrActivity,
  ssrArm,
  ssrAttr,
  ssrAttrs,
  ssrBlock,
  ssrCheckedAttr,
  ssrChild,
  ssrChildText,
  ssrChildrenSources,
  ssrClass,
  ssrComponent,
  ssrComponentNS,
  ssrControl,
  ssrElement,
  ssrForBlock,
  ssrHeadEl,
  ssrInNamespace,
  ssrInnerHtml,
  ssrInputAttrs,
  ssrIsSuspense,
  ssrOption,
  ssrOptionValueSources,
  ssrPortal,
  ssrScriptInnerHtml,
  ssrSelectAttrs,
  ssrSelectScope,
  ssrSelectScopeSources,
  ssrSnapshotSpread,
  ssrSpread,
  ssrStyle,
  ssrText,
  ssrTextPre,
  ssrTextareaValue,
  ssrTextareaValueSources,
  ssrTry,
  ssrValueAttr,
  ssrVoidContent,
  startTransition,
  use,
  useActionState,
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
