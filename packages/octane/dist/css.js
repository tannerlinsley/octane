function normalizeClass(value) {
  if (typeof value === "string") return value;
  if (typeof value !== "object") {
    return typeof value === "number" && value ? "" + value : "";
  }
  if (value === null) return "";
  let str = "";
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (item) {
        const inner = normalizeClass(item);
        if (inner) str = str ? str + " " + inner : inner;
      }
    }
  } else {
    for (const k in value) {
      if (value[k]) str = str ? str + " " + k : k;
    }
  }
  return str;
}
import { hyphenateStyleName } from "./dom-tables.js";
const styleNameCache = /* @__PURE__ */ new Map();
function styleName(name) {
  const cached = styleNameCache.get(name);
  if (cached !== void 0) return cached;
  const result = hyphenateStyleName(name);
  styleNameCache.set(name, result);
  return result;
}
export {
  normalizeClass,
  styleName
};
