const autoclosingChildren = {
  li: { direct: ["li"] },
  dt: { descendant: ["dt", "dd"], resetBy: ["dl"] },
  dd: { descendant: ["dt", "dd"], resetBy: ["dl"] },
  p: {
    descendant: [
      "address",
      "article",
      "aside",
      "blockquote",
      "div",
      "dl",
      "fieldset",
      "footer",
      "form",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "header",
      "hgroup",
      "hr",
      "main",
      "menu",
      "nav",
      "ol",
      "p",
      "pre",
      "section",
      "table",
      "ul"
    ]
  },
  rt: { descendant: ["rt", "rp"] },
  rp: { descendant: ["rt", "rp"] },
  optgroup: { descendant: ["optgroup"] },
  option: { descendant: ["option", "optgroup"] },
  thead: { direct: ["tbody", "tfoot"] },
  tbody: { direct: ["tbody", "tfoot"] },
  tfoot: { direct: ["tbody"] },
  tr: { direct: ["tr", "tbody"] },
  td: { direct: ["td", "th", "tr"] },
  th: { direct: ["td", "th", "tr"] }
};
const disallowedChildren = {
  ...autoclosingChildren,
  form: { descendant: ["form"] },
  a: { descendant: ["a"] },
  button: { descendant: ["button"] },
  h1: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h2: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h3: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h4: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h5: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h6: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  tr: { only: ["th", "td", "style", "script", "template"] },
  tbody: { only: ["tr", "style", "script", "template"] },
  thead: { only: ["tr", "style", "script", "template"] },
  tfoot: { only: ["tr", "style", "script", "template"] },
  colgroup: { only: ["col", "template"] },
  table: {
    only: ["caption", "colgroup", "tbody", "thead", "tfoot", "style", "script", "template"]
  },
  head: {
    only: [
      "base",
      "basefont",
      "bgsound",
      "link",
      "meta",
      "title",
      "noscript",
      "noframes",
      "style",
      "script",
      "template"
    ]
  },
  html: { only: ["head", "body", "frameset"] },
  frameset: { only: ["frame"] },
  "#document": { only: ["html"] }
};
function elementLabel(tag, location) {
  return location ? `\`<${tag}>\` (${location})` : `\`<${tag}>\``;
}
function invalidHtmlNestingWithAncestor(childTag, ancestors, childLocation, ancestorLocation) {
  if (childTag.includes("-")) return null;
  const ancestorTag = ancestors[ancestors.length - 1];
  const disallowed = disallowedChildren[ancestorTag];
  if (!disallowed) return null;
  if ("resetBy" in disallowed && disallowed.resetBy) {
    for (let i = ancestors.length - 2; i >= 0; i--) {
      const ancestor = ancestors[i];
      if (ancestor.includes("-")) return null;
      if (disallowed.resetBy.includes(ancestor)) return null;
    }
  }
  if ("descendant" in disallowed && disallowed.descendant.includes(childTag)) {
    return `${elementLabel(childTag, childLocation)} cannot be a descendant of ${elementLabel(ancestorTag, ancestorLocation)}`;
  }
  return null;
}
function invalidHtmlNestingWithParent(childTag, parentTag, childLocation, parentLocation) {
  if (childTag.includes("-") || parentTag.includes("-")) return null;
  if (parentTag === "template") return null;
  const disallowed = disallowedChildren[parentTag];
  const child = elementLabel(childTag, childLocation);
  const parent = elementLabel(parentTag, parentLocation);
  if (disallowed) {
    if ("direct" in disallowed && disallowed.direct.includes(childTag)) {
      return `${child} cannot be a direct child of ${parent}`;
    }
    if ("descendant" in disallowed && disallowed.descendant.includes(childTag)) {
      return `${child} cannot be a child of ${parent}`;
    }
    if ("only" in disallowed && !disallowed.only.includes(childTag)) {
      const allowed = disallowed.only.map((tag) => `\`<${tag}>\``).join(", ");
      return `${child} cannot be a child of ${parent}. \`<${parentTag}>\` only allows these children: ${allowed}`;
    }
    if ("only" in disallowed) return null;
  }
  switch (childTag) {
    case "body":
    case "caption":
    case "col":
    case "colgroup":
    case "frameset":
    case "frame":
    case "head":
    case "html":
      return `${child} cannot be a child of ${parent}`;
    case "thead":
    case "tbody":
    case "tfoot":
      return `${child} must be the child of a \`<table>\`, not ${parent}`;
    case "td":
    case "th":
      return `${child} must be the child of a \`<tr>\`, not ${parent}`;
    case "tr":
      return `${child} must be the child of a \`<thead>\`, \`<tbody>\`, or \`<tfoot>\`, not ${parent}`;
    default:
      return null;
  }
}
export {
  invalidHtmlNestingWithAncestor,
  invalidHtmlNestingWithParent
};
