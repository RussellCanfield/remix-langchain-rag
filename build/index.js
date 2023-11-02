import { jsx, jsxs } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable, json } from "@remix-run/node";
import { createElement, useRef } from "react";
import isbot from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, Form } from "@remix-run/react";
const LiveReload = process.env.NODE_ENV !== "development" ? () => null : () => createElement("script", {
  type: "module",
  suppressHydrationWarning: true,
  dangerouslySetInnerHTML: { __html: `
   import RefreshRuntime from "/@id/__x00__virtual:hmr-runtime"
   RefreshRuntime.injectIntoGlobalHook(window)
   window.$RefreshReg$ = () => {}
   window.$RefreshSig$ = () => (type) => type
   window.__vite_plugin_react_preamble_installed__ = true
 ` }
});
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  return isbot(request.headers.get("user-agent")) ? handleBotRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  ) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const tailwind = "";
function App() {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [
      /* @__PURE__ */ jsxs("head", {
        children: [
          /* @__PURE__ */ jsx("title", { children: "Micro Frontend RAG Chatbot" }),
          /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
          /* @__PURE__ */ jsx(
            "meta",
            {
              name: "viewport",
              content: "width=device-width, initial-scale=1"
            }
          ),
          /* @__PURE__ */ jsx(Meta, {}),
          /* @__PURE__ */ jsx(Links, {})
        ]
      }),
      /* @__PURE__ */ jsxs("body", {
        children: [
          /* @__PURE__ */ jsxs("div", {
            className: "flex flex-col h-full",
            children: [
              /* @__PURE__ */ jsx("div", { className: "h-32 bg-slate-900 flex justify-center content-center flex-wrap", children: /* @__PURE__ */ jsx("p", { className: "text-slate-100 relative text-xl", children: "Micro Frontend RAG Chatbot" }) }),
              /* @__PURE__ */ jsx("div", { className: "flex-1 bg-slate-800 pt-12 main-background", children: /* @__PURE__ */ jsx("div", { className: "container h-full mx-auto", children: /* @__PURE__ */ jsx(Outlet, {}) }) })
            ]
          }),
          /* @__PURE__ */ jsx(ScrollRestoration, {}),
          /* @__PURE__ */ jsx(LiveReload, {}),
          /* @__PURE__ */ jsx(Scripts, {}),
          /* @__PURE__ */ jsx(LiveReload, {})
        ]
      })
    ]
  });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App
}, Symbol.toStringTag, { value: "Module" }));
async function action({ request }) {
  const formData = await request.formData();
  console.log(formData);
  return json({});
}
const Home = () => {
  const formRef = useRef(null);
  const handleChatMessage = (e) => {
    var _a;
    if (e.key === "Enter") {
      e.preventDefault();
      console.log(e.currentTarget.value);
      (_a = formRef.current) == null ? void 0 : _a.submit();
      e.currentTarget.value = "";
    }
  };
  return /* @__PURE__ */ jsxs("div", {
    className: "rounded-md bg-slate-100 shadow-md h-5/6 flex flex-col",
    children: [
      /* @__PURE__ */ jsx("ul", { className: "p-6 flex-1", children: /* @__PURE__ */ jsx("li", { children: "Du hast" }) }),
      /* @__PURE__ */ jsx("div", { className: "h-16", children: /* @__PURE__ */ jsxs(Form, {
        ref: formRef,
        action: "/",
        children: [
          /* @__PURE__ */ jsx(
            "textarea",
            {
              name: "prompt",
              placeholder: "Enter your question here...",
              className: "chat-input rounded-md pl-6 pr-6 pt-2 pb-2",
              onKeyDownCapture: handleChatMessage
            }
          ),
          /* @__PURE__ */ jsx("button", { type: "submit", children: "Test" })
        ]
      }) })
    ]
  });
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: Home
}, Symbol.toStringTag, { value: "Module" }));
const _virtual_serverManifest = { "entry": { "module": "/build/assets/entry.client-4615d832.js", "imports": ["/build/assets/index-c9433cb4.js", "/build/assets/components-3455e808.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasErrorBoundary": false, "module": "/build/assets/root-1ec566de.js", "imports": ["/build/assets/index-c9433cb4.js", "/build/assets/components-3455e808.js"], "css": ["/build/assets/root-e4680eae.css"] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasErrorBoundary": false, "module": "/build/assets/_index-4c142b45.js", "imports": ["/build/assets/index-c9433cb4.js"], "css": [] } }, "url": "/build/manifest-1c8d6ac8.js", "version": "1c8d6ac8" };
const assetsBuildDirectory = "public/build";
const future = { "v3_fetcherPersist": false };
const publicPath = "/build/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route1
  }
};
export {
  _virtual_serverManifest as assets,
  assetsBuildDirectory,
  entry,
  future,
  publicPath,
  routes
};
