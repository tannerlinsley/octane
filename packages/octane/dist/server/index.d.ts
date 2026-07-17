/**
 * `octane/server` — server-rendering entry.
 *
 * Public API (React `react-dom/server` parity): `renderToString(Component,
 * props?, options?)` (a single sync pass; suspended boundaries render their
 * fallback) and `renderToStaticMarkup` (clean, non-hydratable HTML). Both return
 * `{ html, css }`: hoisted head folds into `html` (plus the suspense seed script
 * when anything resolved synchronously) and the deduped scoped-style tags are in
 * `css`. The await-everything renderer is `prerender` in `octane/static`.
 * `RenderOptions` cover an `AbortSignal`, a CSP `nonce` for the inline tags, and a
 * per-render suspense deadline (`timeoutMs`).
 *
 * `executeServerFunction` is the metaframework's RPC executor for `module
 * server` functions — the vite plugin loads it via
 * `ssrLoadModule('octane/server')` so it runs inside the SSR module graph.
 *
 * Everything below the "compiler-emitted" divider is NOT for hand-written
 * code: the `octane/compiler` in `mode: 'server'` emits component modules that
 * import those string-building helpers from here. Treat them as the compiler's
 * private ABI — present because compiled output needs them, not because apps
 * should call them.
 */
export { executeServerFunction } from './rpc.js';
export { renderToString, renderToStaticMarkup, renderToPipeableStream, renderToReadableStream, type RenderResult, type RenderOptions, type StreamOptions, setSsrSuspenseTimeout, getSsrSuspenseTimeout, EXTERNAL_HYDRATION_PROMISE, HYDRATION_RANGE_BOUNDARY, useState, useReducer, __useStateWithGetter, __useReducerWithGetter, useEffect, useLayoutEffect, useInsertionEffect, useImperativeHandle, useMemo, useCallback, useRef, useId, useEffectEvent, useTransition, useDeferredValue, useSyncExternalStore, useActionState, useFormStatus, useOptimistic, useDebugValue, memo, lazy, hookSlots, withSlot, startTransition, flushSync, isChildrenBlock, isValidElement, cloneElement, Children, createPortal, requestFormReset, preload, preinit, preconnect, prefetchDNS, Suspense, ErrorBoundary, Fragment, Activity, ViewTransition, ViewTransition as unstable_ViewTransition, addTransitionType, addTransitionType as unstable_addTransitionType, createContext, use, useContext, ssrIsSuspense, type Context, type FormStatus, markChildrenBlock, createElement, positionalChildren, escapeHtml, escapeAttr, ssrText, ssrTextPre, ssrChild, ssrChildText, ssrAttr, normalizeClass, ssrStyle, ssrClass, ssrAttrs, ssrSnapshotSpread, ssrSpread, ssrInnerHtml, ssrScriptInnerHtml, ssrChildrenSources, ssrVoidContent, ssrValueAttr, ssrCheckedAttr, ssrInputAttrs, ssrTextareaValue, ssrTextareaValueSources, ssrSelectAttrs, ssrSelectScope, ssrSelectScopeSources, ssrOptionValueSources, ssrOption, ssrElement, ssrComponent, ssrComponentNS, ssrInNamespace, ssrBlock, ssrActivity, ssrForBlock, ssrControl, ssrArm, ssrTry, ssrPortal, injectStyle, ssrHeadEl, namespaceHead, namespaceHeadElement, puMemo, puBatch, warmMemo, warmChild, } from '../runtime.server.js';
