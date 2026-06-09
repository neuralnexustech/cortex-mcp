import{c as f,r as u,j as n,d as $}from"./index-0Pv2n7BT.js";import{c as I}from"./index-BYTcAQrc.js";import{P as v}from"./index-BVj_BoJE.js";/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D=f("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=f("Target",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);var d="Progress",c=100,[w]=I(d),[E,R]=w(d),g=u.forwardRef((r,e)=>{const{__scopeProgress:l,value:t=null,max:a,getValueLabel:h=j,...b}=r;(a||a===0)&&!p(a)&&console.error(_(`${a}`,"Progress"));const o=p(a)?a:c;t!==null&&!m(t,o)&&console.error(k(`${t}`,"Progress"));const s=m(t,o)?t:null,L=i(s)?h(s,o):void 0;return n.jsx(E,{scope:l,value:s,max:o,children:n.jsx(v.div,{"aria-valuemax":o,"aria-valuemin":0,"aria-valuenow":i(s)?s:void 0,"aria-valuetext":L,role:"progressbar","data-state":y(s,o),"data-value":s??void 0,"data-max":o,...b,ref:e})})});g.displayName=d;var x="ProgressIndicator",P=u.forwardRef((r,e)=>{const{__scopeProgress:l,...t}=r,a=R(x,l);return n.jsx(v.div,{"data-state":y(a.value,a.max),"data-value":a.value??void 0,"data-max":a.max,...t,ref:e})});P.displayName=x;function j(r,e){return`${Math.round(r/e*100)}%`}function y(r,e){return r==null?"indeterminate":r===e?"complete":"loading"}function i(r){return typeof r=="number"}function p(r){return i(r)&&!isNaN(r)&&r>0}function m(r,e){return i(r)&&!isNaN(r)&&r<=e&&r>=0}function _(r,e){return`Invalid prop \`max\` of value \`${r}\` supplied to \`${e}\`. Only numbers greater than 0 are valid max values. Defaulting to \`${c}\`.`}function k(r,e){return`Invalid prop \`value\` of value \`${r}\` supplied to \`${e}\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${c} if no \`max\` prop is set)
  - \`null\` or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`}var N=g,M=P;const T=u.forwardRef(({className:r,value:e,...l},t)=>n.jsx(N,{ref:t,className:$("relative h-2 w-full overflow-hidden rounded-full bg-gray-100",r),...l,children:n.jsx(M,{className:"h-full w-full flex-1 bg-gradient-to-r from-purple-500 to-purple-600 transition-all rounded-full",style:{transform:`translateX(-${100-(e||0)}%)`}})}));T.displayName=N.displayName;export{D as L,T as P,S as T};
