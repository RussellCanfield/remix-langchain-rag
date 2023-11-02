import{b as m,d as j,e as p,r as i,j as e,O as f}from"./index-c9433cb4.js";import{a as y,M as w,L as S,S as g}from"./components-3455e808.js";/**
 * @remix-run/react v2.2.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let a="positions";function v({getKey:r,...c}){let o=m(),d=j();p({getKey:r,storageKey:a});let x=i.useMemo(()=>{if(!r)return null;let t=r(o,d);return t!==o.key?t:null},[]),h=((t,u)=>{if(!window.history.state||!window.history.state.key){let s=Math.random().toString(32).slice(2);window.history.replaceState({key:s},"")}try{let n=JSON.parse(sessionStorage.getItem(t)||"{}")[u||window.history.state.key];typeof n=="number"&&window.scrollTo(0,n)}catch(s){console.error(s),sessionStorage.removeItem(t)}}).toString();return i.createElement("script",y({},c,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${h})(${JSON.stringify(a)}, ${JSON.stringify(x)})`}}))}const l=()=>null;function N(){return e.jsxs("html",{lang:"en",children:[e.jsxs("head",{children:[e.jsx("title",{children:"Micro Frontend RAG Chatbot"}),e.jsx("meta",{charSet:"utf-8"}),e.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),e.jsx(w,{}),e.jsx(S,{})]}),e.jsxs("body",{children:[e.jsxs("div",{className:"flex flex-col h-full",children:[e.jsx("div",{className:"h-32 bg-slate-900 flex justify-center content-center flex-wrap",children:e.jsx("p",{className:"text-slate-100 relative text-xl",children:"Micro Frontend RAG Chatbot"})}),e.jsx("div",{className:"flex-1 bg-slate-800 pt-12 main-background",children:e.jsx("div",{className:"container h-full mx-auto",children:e.jsx(f,{})})})]}),e.jsx(v,{}),e.jsx(l,{}),e.jsx(g,{}),e.jsx(l,{})]})]})}export{N as default};
