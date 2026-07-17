/**
 * HTML parser-repair rules used by DEV SSR nesting diagnostics.
 *
 * This is intentionally narrower than the full HTML content model: it only
 * lists placements the browser repairs while parsing serialized HTML, because
 * those repairs can change the DOM before hydration. Adapted from Svelte's
 * html-tree-validation module, which Ripple also uses.
 *
 * Copyright (c) 2016-2025 Svelte Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/** Return a diagnostic when `childTag` causes an ancestor to be repaired. */
export declare function invalidHtmlNestingWithAncestor(childTag: string, ancestors: string[], childLocation?: string, ancestorLocation?: string): string | null;
/** Return a diagnostic when `childTag` causes its direct parent to be repaired. */
export declare function invalidHtmlNestingWithParent(childTag: string, parentTag: string, childLocation?: string, parentLocation?: string): string | null;
