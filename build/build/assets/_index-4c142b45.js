import{r as l,j as e,F as n}from"./index-c9433cb4.js";const c=()=>{const s=l.useRef(null),a=r=>{var t;r.key==="Enter"&&(r.preventDefault(),console.log(r.currentTarget.value),(t=s.current)==null||t.submit(),r.currentTarget.value="")};return e.jsxs("div",{className:"rounded-md bg-slate-100 shadow-md h-5/6 flex flex-col",children:[e.jsx("ul",{className:"p-6 flex-1",children:e.jsx("li",{children:"Du hast"})}),e.jsx("div",{className:"h-16",children:e.jsxs(n,{ref:s,action:"/",children:[e.jsx("textarea",{name:"prompt",placeholder:"Enter your question here...",className:"chat-input rounded-md pl-6 pr-6 pt-2 pb-2",onKeyDownCapture:a}),e.jsx("button",{type:"submit",children:"Test"})]})})]})};export{c as default};
