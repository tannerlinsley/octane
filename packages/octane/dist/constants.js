const HYDRATION_START = "[";
const HYDRATION_END = "]";
const HYDRATION_FOR_EMPTY = "[f0";
const HYDRATION_FOR_ITEMS = "[f1";
const BLOCK_OPEN = `<!--${HYDRATION_START}-->`;
const BLOCK_CLOSE = `<!--${HYDRATION_END}-->`;
const FOR_BLOCK_OPEN_EMPTY = `<!--${HYDRATION_FOR_EMPTY}-->`;
const FOR_BLOCK_OPEN_ITEMS = `<!--${HYDRATION_FOR_ITEMS}-->`;
const EMPTY_COMMENT = "<!---->";
const HYDRATION_TEXT_SEP = " ";
const SUSPENSE_SCRIPT_ATTR = "data-octane-suspense";
const UNDEFINED_SENTINEL_KEY = "__octane_new_undefined__";
const SUSPENSE_SEED_WIRE_PREFIX = "\0octane:ssr-seed:";
const REJECTION_SENTINEL_KEY = "__octane_new_rejection__";
const EXTERNAL_HYDRATION_PROMISE = /* @__PURE__ */ Symbol.for(
  "octane.external-hydration-promise"
);
const HYDRATION_RANGE_BOUNDARY = /* @__PURE__ */ Symbol.for(
  "octane.hydration-range-boundary"
);
const STREAM_BOUNDARY_ATTR = "data-oct-b";
const STREAM_SEGMENT_ATTR = "data-oct-s";
const STREAM_SEED_ATTR = "data-oct-seed";
const STREAM_SCRIPT_ATTR = "data-octane-stream";
const STREAM_SEED_COMMENT = "oct-seed:";
import {
  VOID_ELEMENTS as _VOID_ELEMENTS,
  BOOLEAN_ATTR_PROPS as _BOOLEAN_ATTR_PROPS,
  MUST_USE_PROPERTY_PROPS as _MUST_USE_PROPERTY_PROPS,
  POSITIVE_NUMERIC_ATTR_PROPS as _POSITIVE_NUMERIC_ATTR_PROPS,
  SVG_ONLY_TAGS as _SVG_ONLY_TAGS,
  ATTRIBUTE_ALIASES as _ATTRIBUTE_ALIASES,
  isEnumeratedBooleanAttr as _isEnumeratedBooleanAttr,
  isUnitlessStyleProp as _isUnitlessStyleProp,
  cssStyleValue as _cssStyleValue
} from "./dom-tables.js";
const VOID_ELEMENTS = _VOID_ELEMENTS;
const BOOLEAN_ATTR_PROPS = _BOOLEAN_ATTR_PROPS;
const MUST_USE_PROPERTY_PROPS = _MUST_USE_PROPERTY_PROPS;
const POSITIVE_NUMERIC_ATTR_PROPS = _POSITIVE_NUMERIC_ATTR_PROPS;
const VALID_ATTR_NAME = /^[^\s"'>\/=\u0000-\u001F]+$/;
const SVG_ONLY_TAGS = _SVG_ONLY_TAGS;
const ATTRIBUTE_ALIASES = _ATTRIBUTE_ALIASES;
const isEnumeratedBooleanAttr = _isEnumeratedBooleanAttr;
const isUnitlessStyleProp = _isUnitlessStyleProp;
const cssStyleValue = _cssStyleValue;
export {
  ATTRIBUTE_ALIASES,
  BLOCK_CLOSE,
  BLOCK_OPEN,
  BOOLEAN_ATTR_PROPS,
  EMPTY_COMMENT,
  EXTERNAL_HYDRATION_PROMISE,
  FOR_BLOCK_OPEN_EMPTY,
  FOR_BLOCK_OPEN_ITEMS,
  HYDRATION_END,
  HYDRATION_FOR_EMPTY,
  HYDRATION_FOR_ITEMS,
  HYDRATION_RANGE_BOUNDARY,
  HYDRATION_START,
  HYDRATION_TEXT_SEP,
  MUST_USE_PROPERTY_PROPS,
  POSITIVE_NUMERIC_ATTR_PROPS,
  REJECTION_SENTINEL_KEY,
  STREAM_BOUNDARY_ATTR,
  STREAM_SCRIPT_ATTR,
  STREAM_SEED_ATTR,
  STREAM_SEED_COMMENT,
  STREAM_SEGMENT_ATTR,
  SUSPENSE_SCRIPT_ATTR,
  SUSPENSE_SEED_WIRE_PREFIX,
  SVG_ONLY_TAGS,
  UNDEFINED_SENTINEL_KEY,
  VALID_ATTR_NAME,
  VOID_ELEMENTS,
  cssStyleValue,
  isEnumeratedBooleanAttr,
  isUnitlessStyleProp
};
