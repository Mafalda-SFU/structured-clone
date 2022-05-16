var StructuredJSON=function(e,t){"use strict";const s="object"==typeof self?self:globalThis,n=(e,n,r,c)=>{const o=(e,t)=>(r.set(t,e),e);const a=u=>{if(r.has(u))return r.get(u);const[i,f]=c[u];switch(i){case 0:case-1:return o(f,u);case 1:{const e=o([],u);for(const t of f)e.push(a(t));return e}case 2:{const e=o({},u);for(const[t,s]of f)e[a(t)]=a(s);return e}case 3:return o(new Date(f),u);case 4:{const{source:e,flags:t}=f;return o(new RegExp(e,t),u)}case 5:{const e=o(new Map,u);for(const[t,s]of f)e.set(a(t),a(s));return e}case 6:{const e=o(new Set,u);for(const t of f)e.add(a(t));return e}case 7:{const{name:e,message:t}=f;return o(new s[e](t),u)}case 8:return o(BigInt(f),u);case"BigInt":return o(Object(BigInt(f)),u)}const l=function(e){const r=n?.[e]||s[e];return t.ok(r instanceof Function,`Class ${e} is not a function`),r}(i);let g;if(i in n){const t={};for(const[e,s]of f)t[a(e)]=a(s);g=e&&l.fromJSON?l.fromJSON(t):new l(t)}else g=new l(f);return o(g,u)};return a},r="",{toString:c}={},{keys:o}=Object,a=e=>{const t=typeof e;if("object"!==t||!e)return[0,t];const s=c.call(e).slice(8,-1);switch(s){case"Array":return[1,r];case"Object":{const{name:t}=e.constructor;return"Object"!==t?[2,t]:[2,r]}case"Date":return[3,r];case"RegExp":return[4,r];case"Map":return[5,r];case"Set":return[6,r]}return s.includes("Array")?[1,s]:s.includes("Error")?[7,s]:[2,s]},u=([e,t])=>0===e&&("function"===t||"symbol"===t),i=(e,{classes:t,json:s,lossy:n}={})=>{const r=[];return((e,t,s,n,r)=>{const c=(e,t)=>{const s=r.push(e)-1;return n.set(t,s),s},i=r=>{if(n.has(r))return n.get(r);let[f,l]=a(r);switch(f){case 0:{let t=r;switch(l){case"bigint":f=8,t=r.toString();break;case"function":case"symbol":if(e)throw new TypeError("unable to serialize "+l);t=null;break;case"undefined":return c([-1],r)}return c([f,t],r)}case 1:{if(l)return c([l,[...r]],r);const e=[],t=c([f,e],r);for(const t of r)e.push(i(t));return t}case 2:{if(l){switch(l){case"BigInt":return c([l,r.toString()],r);case"Boolean":case"Number":case"String":return c([l,r.valueOf()],r)}s&&(f=l)}if(t&&"toJSON"in r)return i(r.toJSON());const n=[],g=c([f,n],r);for(const t of o(r))!e&&u(a(r[t]))||n.push([i(t),i(r[t])]);return g}case 3:return c([f,r.toISOString()],r);case 4:{const{source:e,flags:t}=r;return c([f,{source:e,flags:t}],r)}case 5:{const t=[],s=c([f,t],r);for(const[s,n]of r)(e||!u(a(s))&&!u(a(n)))&&t.push([i(s),i(n)]);return s}case 6:{const t=[],s=c([f,t],r);for(const s of r)!e&&u(a(s))||t.push(i(s));return s}}const{message:g}=r;return c([f,{name:l,message:g}],r)};return i})(!(s||n),!!s,t,new Map,r)(e),r},{parse:f,stringify:l}=JSON,g={json:!0,lossy:!0};return e.parse=e=>((e,{classes:t,json:s}={})=>n(!!s,t,new Map,e)(0))(f(e)),e.stringify=e=>l(i(e,g)),e}({},strict);
