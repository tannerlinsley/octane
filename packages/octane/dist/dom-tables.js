const VOID_ELEMENTS = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
const BOOLEAN_ATTR_PROPS = /* @__PURE__ */ new Set([
  "allowfullscreen",
  "async",
  "autoplay",
  "controls",
  "credentialless",
  "default",
  "defer",
  "disabled",
  "disablepictureinpicture",
  "disableremoteplayback",
  "formnovalidate",
  "hidden",
  "inert",
  "itemscope",
  "loop",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "scoped",
  "seamless"
]);
const MUST_USE_PROPERTY_PROPS = /* @__PURE__ */ new Set(["muted", "multiple", "selected"]);
const POSITIVE_NUMERIC_ATTR_PROPS = /* @__PURE__ */ new Set(["size", "cols", "rows", "span"]);
const SVG_ONLY_TAGS = /* @__PURE__ */ new Set([
  "altGlyph",
  "altGlyphDef",
  "altGlyphItem",
  "animate",
  "animateColor",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "font-face",
  "font-face-format",
  "font-face-name",
  "font-face-src",
  "font-face-uri",
  "foreignObject",
  "g",
  "glyph",
  "glyphRef",
  "hkern",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "missing-glyph",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "set",
  "stop",
  "switch",
  "symbol",
  "text",
  "textPath",
  "tref",
  "tspan",
  "use",
  "view",
  "vkern"
]);
const ATTRIBUTE_ALIASES = /* @__PURE__ */ new Map([
  ["acceptCharset", "accept-charset"],
  ["htmlFor", "for"],
  ["httpEquiv", "http-equiv"],
  ["crossOrigin", "crossorigin"],
  ["accentHeight", "accent-height"],
  ["alignmentBaseline", "alignment-baseline"],
  ["arabicForm", "arabic-form"],
  ["baselineShift", "baseline-shift"],
  ["capHeight", "cap-height"],
  ["clipPath", "clip-path"],
  ["clipRule", "clip-rule"],
  ["colorInterpolation", "color-interpolation"],
  ["colorInterpolationFilters", "color-interpolation-filters"],
  ["colorProfile", "color-profile"],
  ["colorRendering", "color-rendering"],
  ["dominantBaseline", "dominant-baseline"],
  ["enableBackground", "enable-background"],
  ["fillOpacity", "fill-opacity"],
  ["fillRule", "fill-rule"],
  ["floodColor", "flood-color"],
  ["floodOpacity", "flood-opacity"],
  ["fontFamily", "font-family"],
  ["fontSize", "font-size"],
  ["fontSizeAdjust", "font-size-adjust"],
  ["fontStretch", "font-stretch"],
  ["fontStyle", "font-style"],
  ["fontVariant", "font-variant"],
  ["fontWeight", "font-weight"],
  ["glyphName", "glyph-name"],
  ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
  ["glyphOrientationVertical", "glyph-orientation-vertical"],
  ["horizAdvX", "horiz-adv-x"],
  ["horizOriginX", "horiz-origin-x"],
  ["imageRendering", "image-rendering"],
  ["letterSpacing", "letter-spacing"],
  ["lightingColor", "lighting-color"],
  ["markerEnd", "marker-end"],
  ["markerMid", "marker-mid"],
  ["markerStart", "marker-start"],
  ["overlinePosition", "overline-position"],
  ["overlineThickness", "overline-thickness"],
  ["paintOrder", "paint-order"],
  ["panose-1", "panose-1"],
  ["pointerEvents", "pointer-events"],
  ["renderingIntent", "rendering-intent"],
  ["shapeRendering", "shape-rendering"],
  ["stopColor", "stop-color"],
  ["stopOpacity", "stop-opacity"],
  ["strikethroughPosition", "strikethrough-position"],
  ["strikethroughThickness", "strikethrough-thickness"],
  ["strokeDasharray", "stroke-dasharray"],
  ["strokeDashoffset", "stroke-dashoffset"],
  ["strokeLinecap", "stroke-linecap"],
  ["strokeLinejoin", "stroke-linejoin"],
  ["strokeMiterlimit", "stroke-miterlimit"],
  ["strokeOpacity", "stroke-opacity"],
  ["strokeWidth", "stroke-width"],
  ["textAnchor", "text-anchor"],
  ["textDecoration", "text-decoration"],
  ["textRendering", "text-rendering"],
  ["transformOrigin", "transform-origin"],
  ["underlinePosition", "underline-position"],
  ["underlineThickness", "underline-thickness"],
  ["unicodeBidi", "unicode-bidi"],
  ["unicodeRange", "unicode-range"],
  ["unitsPerEm", "units-per-em"],
  ["vAlphabetic", "v-alphabetic"],
  ["vHanging", "v-hanging"],
  ["vIdeographic", "v-ideographic"],
  ["vMathematical", "v-mathematical"],
  ["vectorEffect", "vector-effect"],
  ["vertAdvY", "vert-adv-y"],
  ["vertOriginX", "vert-origin-x"],
  ["vertOriginY", "vert-origin-y"],
  ["wordSpacing", "word-spacing"],
  ["writingMode", "writing-mode"],
  ["xmlnsXlink", "xmlns:xlink"],
  ["xHeight", "x-height"],
  ["xlinkActuate", "xlink:actuate"],
  ["xlinkArcrole", "xlink:arcrole"],
  ["xlinkHref", "xlink:href"],
  ["xlinkRole", "xlink:role"],
  ["xlinkShow", "xlink:show"],
  ["xlinkTitle", "xlink:title"],
  ["xlinkType", "xlink:type"],
  ["xmlBase", "xml:base"],
  ["xmlLang", "xml:lang"],
  ["xmlSpace", "xml:space"],
  // React writes this via a setProp switch case rather than its aliases map;
  // same observable output. Matters on SVG hosts (setAttribute preserves case,
  // and `tabIndex` verbatim is not focusable).
  ["tabIndex", "tabindex"]
]);
function isEnumeratedBooleanAttr(name) {
  switch (name.length) {
    case 10:
      return name.toLowerCase() === "spellcheck";
    case 9:
      return name.toLowerCase() === "draggable";
    case 15:
      return name.toLowerCase() === "contenteditable";
  }
  return false;
}
const UNITLESS_STYLE_PROPS = /* @__PURE__ */ new Set();
for (const base of [
  "animationIterationCount",
  "aspectRatio",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "boxFlex",
  "boxFlexGroup",
  "boxOrdinalGroup",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexPositive",
  "flexShrink",
  "flexNegative",
  "flexOrder",
  "gridArea",
  "gridRow",
  "gridRowEnd",
  "gridRowSpan",
  "gridRowStart",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnSpan",
  "gridColumnStart",
  "fontWeight",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
  "fillOpacity",
  "floodOpacity",
  "stopOpacity",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth"
]) {
  const c = base.toLowerCase();
  UNITLESS_STYLE_PROPS.add(c);
  UNITLESS_STYLE_PROPS.add("webkit" + c);
  UNITLESS_STYLE_PROPS.add("ms" + c);
  UNITLESS_STYLE_PROPS.add("moz" + c);
  UNITLESS_STYLE_PROPS.add("o" + c);
}
function isUnitlessStyleProp(name) {
  return UNITLESS_STYLE_PROPS.has(name.replaceAll("-", "").toLowerCase());
}
function cssStyleValue(name, value) {
  if (typeof value === "number" && value !== 0 && name.charCodeAt(0) !== 45 && !isUnitlessStyleProp(name)) {
    return value + "px";
  }
  return typeof value === "string" ? value.trim() : "" + value;
}
function hyphenateStyleName(name) {
  if (name.charCodeAt(0) === 45) return name;
  let hasUpper = false;
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if (c >= 65 && c <= 90) {
      hasUpper = true;
      break;
    }
  }
  if (!hasUpper) return name;
  let out = "";
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if (c >= 65 && c <= 90) out += "-" + String.fromCharCode(c + 32);
    else out += name[i];
  }
  if (out.charCodeAt(0) === 109 && out.charCodeAt(1) === 115 && out.charCodeAt(2) === 45) {
    out = "-" + out;
  }
  return out;
}
export {
  ATTRIBUTE_ALIASES,
  BOOLEAN_ATTR_PROPS,
  MUST_USE_PROPERTY_PROPS,
  POSITIVE_NUMERIC_ATTR_PROPS,
  SVG_ONLY_TAGS,
  VOID_ELEMENTS,
  cssStyleValue,
  hyphenateStyleName,
  isEnumeratedBooleanAttr,
  isUnitlessStyleProp
};
