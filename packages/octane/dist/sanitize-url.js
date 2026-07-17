const IS_JAVASCRIPT_PROTOCOL = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*\:/i;
const BLOCKED_JAVASCRIPT_URL = "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')";
const RESERVED_HYPHENATED_NATIVE_TAGS = /* @__PURE__ */ new Set([
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph"
]);
function sanitizeURL(url) {
  return IS_JAVASCRIPT_PROTOCOL.test(url) ? BLOCKED_JAVASCRIPT_URL : url;
}
function shouldSanitizeURLAttribute(tag, name) {
  tag = tag === void 0 ? void 0 : tag.toLowerCase();
  if (tag !== void 0 && tag.includes("-") && !RESERVED_HYPHENATED_NATIVE_TAGS.has(tag)) {
    return false;
  }
  name = name.toLowerCase();
  return name === "src" || name === "href" || name === "action" || name === "formaction" || name === "xlink:href" || name === "xlinkhref" || name === "data" && tag === "object";
}
function sanitizeURLAttribute(tag, name, value) {
  return shouldSanitizeURLAttribute(tag, name) ? sanitizeURL(value) : value;
}
export {
  BLOCKED_JAVASCRIPT_URL,
  sanitizeURL,
  sanitizeURLAttribute,
  shouldSanitizeURLAttribute
};
