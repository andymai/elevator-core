(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function n(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(o){if(o.ep)return;o.ep=!0;const i=n(o);fetch(o.href,i)}})();function Be(t){const e=Math.max(0,Math.min(1,(t-320)/580)),n=(s,o)=>s+(o-s)*e;return{padX:n(8,18),padTop:n(20,26),padBottom:n(30,38),sparkH:n(18,22),labelW:n(44,68),upColW:n(20,28),dnColW:n(20,28),gutterGap:4,carW:n(26,40),carH:n(20,30),fontMain:n(10,12),fontSmall:n(9,10),stopDotR:n(2.2,2.6),carDotR:n(1.8,2.3),dirDotR:n(2.2,2.6)}}const ge={idle:"#5d6271",moving:"#06c2b5",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b90a0",unknown:"#5d6271"},Oe="#1f2431",me="#c8ccd6",Z="#7dd3fc",ee="#fbbf24",Me="#f5f6f9",ce="#8b90a0",$e="#2e3445",He="#8b90a0",De="rgba(6, 194, 181, 0.85)",Ne="rgba(6, 194, 181, 0.95)",Xe=260,he=3,Ye=.05,ze=160;function Ue(t,e,n,s,o){const i=(t+n)/2,a=(e+s)/2,r=n-t,c=s-e,d=Math.max(Math.hypot(r,c),1),l=-c/d,g=r/d,m=Math.min(d*.25,22),h=i+l*m,f=a+g*m,p=1-o;return[p*p*t+2*p*o*h+o*o*n,p*p*e+2*p*o*f+o*o*s]}function qe(t){let i=t;for(let r=0;r<3;r++){const c=1-i,d=3*c*c*i*.2+3*c*i*i*.2+i*i*i,l=3*c*c*.2+6*c*i*(.2-.2)+3*i*i*(1-.2);if(l===0)break;i-=(d-t)/l,i=Math.max(0,Math.min(1,i))}const a=1-i;return 3*a*a*i*.6+3*a*i*i*1+i*i*i}class Ge{#e;#t;#n;#i;#s=null;#c=-1;#l=new Map;#p;#a=new Map;#r=new Map;#o=[];#d;constructor(e,n,s="Avg wait (s)"){this.#e=e;const o=e.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#t=o,this.#n=window.devicePixelRatio||1,this.#p=n,this.#d=s,this.#f(),this.#i=()=>this.#f(),window.addEventListener("resize",this.#i)}dispose(){window.removeEventListener("resize",this.#i)}#f(){const{clientWidth:e,clientHeight:n}=this.#e;if(e===0||n===0)return;const s=e*this.#n,o=n*this.#n;(this.#e.width!==s||this.#e.height!==o)&&(this.#e.width=s,this.#e.height=o),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}draw(e,n,s,o){this.#f();const{clientWidth:i,clientHeight:a}=this.#e;if(this.#t.clearRect(0,0,i,a),e.stops.length===0||i===0||a===0)return;i!==this.#c&&(this.#s=Be(i),this.#c=i);const r=this.#s;let c=e.stops[0].y,d=e.stops[0].y;for(let y=1;y<e.stops.length;y++){const v=e.stops[y].y;v<c&&(c=v),v>d&&(d=v)}const l=c-1,g=d+1,m=Math.max(g-l,1e-4),h=a-r.padBottom,f=r.padTop,p=y=>h-(y-l)/m*(h-f),S=this.#l;S.forEach(y=>y.length=0);for(const y of e.cars){const v=S.get(y.line);v?v.push(y):S.set(y.line,[y])}const w=[...S.keys()].sort((y,v)=>y-v),I=r.padX+r.labelW+r.upColW+r.dnColW+r.gutterGap,k=Math.max(0,i-I-r.padX),M=w.reduce((y,v)=>y+(S.get(v)?.length??1),0),u=k/Math.max(M,1),_=Math.min(u,ze),T=_*M,C=Math.max(0,(k-T)/2),x=I+C,F=x+T,O=new Map;let K=0;for(const y of w){const v=S.get(y)??[];for(const z of v)O.set(z.id,x+_*(K+.5)),K++}const N=new Map;e.stops.forEach((y,v)=>N.set(y.entity_id,v)),this.#m(r),this.#h(e,p,r,x,F),this.#S(e,O,p,r,N);for(const[y,v]of O){this.#u(v,f,h,r);const z=e.cars.find(Fe=>Fe.id===y);z&&(this.#w(z,v,p,r),this.#y(z,v,p,r))}this.#b(e,O,p,r,s),this.#k(r),o&&o.size>0&&this.#g(e,O,p,r,o,i),this.#_(n,i,a,r)}#g(e,n,s,o,i,a){const r=this.#t,c=6,d=3,l=5,g=4,m=5,h=`${o.fontSmall}px system-ui, sans-serif`;r.font=h,r.textBaseline="middle";for(const f of e.cars){const p=i.get(f.id);if(!p)continue;const S=n.get(f.id);if(S===void 0)continue;const w=s(f.y),k=r.measureText(p.text).width+c*2,M=o.fontSmall+d*2+2,u=o.carW/2,T=S+u+l+k+2>a-2?"left":"right",C=T==="right"?S+u+l:S-u-l-k,x=w-M/2;r.fillStyle="rgba(18, 22, 31, 0.92)",r.strokeStyle="rgba(125, 211, 252, 0.55)",r.lineWidth=1,je(r,C,x,k,M,m),r.fill(),r.stroke(),r.beginPath(),T==="right"?(r.moveTo(C,w-g/2),r.lineTo(C-l,w),r.lineTo(C,w+g/2)):(r.moveTo(C+k,w-g/2),r.lineTo(C+k+l,w),r.lineTo(C+k,w+g/2)),r.closePath(),r.fill(),r.stroke(),r.fillStyle="#e8ecf5",r.fillText(p.text,C+c,w)}}#m(e){const n=this.#t,s=e.padX+e.labelW+e.upColW/2,o=e.padX+e.labelW+e.upColW+e.dnColW/2,i=e.padTop/2+1;n.font=`${e.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,n.textBaseline="middle",n.textAlign="center",n.fillStyle=Z,n.fillText("▲",s,i),n.fillStyle=ee,n.fillText("▼",o,i)}#h(e,n,s,o,i){const a=this.#t;a.font=`${s.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,a.textBaseline="middle";const r=s.padX,c=s.padX+s.labelW,d=c+s.upColW;for(const l of e.stops){const g=n(l.y);a.strokeStyle=Oe,a.lineWidth=1,a.beginPath(),a.moveTo(o,g),a.lineTo(i,g),a.stroke(),a.fillStyle=me,a.textAlign="left",a.fillText(Ve(a,l.name,s.labelW-2),r,g),l.waiting_up>0&&ue(a,c,g,s.upColW,s.dirDotR,l.waiting_up,Z,s.fontSmall),l.waiting_down>0&&ue(a,d,g,s.dnColW,s.dirDotR,l.waiting_down,ee,s.fontSmall)}}#u(e,n,s,o){const i=this.#t,a=i.createLinearGradient(e,n,e,s);a.addColorStop(0,"rgba(39, 45, 58, 0)"),a.addColorStop(.5,"rgba(39, 45, 58, 0.9)"),a.addColorStop(1,"rgba(39, 45, 58, 0)"),i.strokeStyle=a,i.lineWidth=1,i.beginPath(),i.moveTo(e,n),i.lineTo(e,s),i.stroke()}#S(e,n,s,o,i){const a=this.#t,r=.75+.2*Math.sin(performance.now()*.005),c=o.carDotR*5.2,d=o.carDotR*3.4;for(const l of e.cars){if(l.target==null)continue;const g=i.get(l.target);if(g==null)continue;const m=e.stops[g],h=n.get(l.id);if(h==null)continue;const f=s(m.y);a.strokeStyle=`rgba(6, 194, 181, ${r})`,a.lineWidth=2,a.beginPath(),a.arc(h,f,c,0,Math.PI*2),a.stroke(),a.strokeStyle=De,a.lineWidth=1,a.beginPath(),a.arc(h,f,d,0,Math.PI*2),a.stroke(),a.fillStyle=Ne,a.beginPath(),a.arc(h,f,o.carDotR*1.1,0,Math.PI*2),a.fill()}}#w(e,n,s,o){if(e.phase!=="moving"||Math.abs(e.v)<.1)return;const i=this.#t,a=ge[e.phase],r=o.carW/2,c=o.carH/2;for(let d=1;d<=he;d++){const l=s(e.y-e.v*Ye*d),g=.18*(1-(d-1)/he);i.fillStyle=we(a,g),i.fillRect(n-r,l-c,o.carW,o.carH)}}#y(e,n,s,o){const i=this.#t,a=s(e.y),r=o.carW/2,c=o.carH/2,d=ge[e.phase]??"#5d6271",l=i.createLinearGradient(n,a-c,n,a+c);l.addColorStop(0,Se(d,.14)),l.addColorStop(1,Se(d,-.18)),i.fillStyle=l,i.fillRect(n-r,a-c,o.carW,o.carH),i.strokeStyle="rgba(10, 12, 16, 0.9)",i.lineWidth=1,i.strokeRect(n-r+.5,a-c+.5,o.carW-1,o.carH-1);const g=e.capacity>0?Math.min(e.load/e.capacity,1):0;if(g>0){const m=(o.carH-4)*g;i.fillStyle="rgba(10, 12, 16, 0.35)",i.fillRect(n-r+2,a+c-2-m,o.carW-4,m)}e.riders>0&&Ke(i,n,a,o.carW,o.carH,o.carDotR,e.riders,o.fontSmall)}#b(e,n,s,o,i){const a=performance.now(),r=Math.max(1,i),c=Xe/r,d=30/r,l=o.padX+o.labelW,g=l+o.upColW,m=new Map,h=[];for(const f of e.cars){const p=this.#a.get(f.id),S=f.riders,w=n.get(f.id);let I=null,k=1/0;for(let u=0;u<e.stops.length;u++){const _=Math.abs(e.stops[u].y-f.y);_<k&&(k=_,I=u)}const M=f.phase==="loading"&&k<.5?I:null;if(p&&w!=null&&M!=null){const u=S-p.riders;if(u>0){const _=e.stops[M];m.set(_.entity_id,(m.get(_.entity_id)??0)+u)}if(u!==0){const _=e.stops[M],T=s(_.y),C=s(f.y),x=Math.min(Math.abs(u),6);if(u>0){const F=_.waiting_up>=_.waiting_down,O=F?l+o.upColW/2:g+o.dnColW/2,K=F?Z:ee;for(let N=0;N<x;N++)h.push(()=>this.#o.push({kind:"board",bornAt:a+N*d,duration:c,startX:O,startY:T,endX:w,endY:C,color:K}))}else for(let F=0;F<x;F++)h.push(()=>this.#o.push({kind:"alight",bornAt:a+F*d,duration:c,startX:w,startY:C,endX:w+18,endY:C+10,color:Me}))}}this.#a.set(f.id,{riders:S})}for(const f of e.stops){const p=f.waiting_up+f.waiting_down,S=this.#r.get(f.entity_id);if(S){const w=S.waiting-p,I=m.get(f.entity_id)??0,k=Math.max(0,w-I);if(k>0){const M=s(f.y),u=l+o.upColW/2,_=Math.min(k,4);for(let T=0;T<_;T++)this.#o.push({kind:"abandon",bornAt:a+T*d,duration:c*1.5,startX:u,startY:M,endX:u-26,endY:M-6,color:ce})}}this.#r.set(f.entity_id,{waiting:p})}for(const f of h)f();for(let f=this.#o.length-1;f>=0;f--){const p=this.#o[f];a-p.bornAt>p.duration&&this.#o.splice(f,1)}if(this.#a.size>e.cars.length){const f=new Set(e.cars.map(p=>p.id));for(const p of this.#a.keys())f.has(p)||this.#a.delete(p)}if(this.#r.size>e.stops.length){const f=new Set(e.stops.map(p=>p.entity_id));for(const p of this.#r.keys())f.has(p)||this.#r.delete(p)}}#k(e){const n=performance.now(),s=this.#t;for(const o of this.#o){const i=n-o.bornAt;if(i<0)continue;const a=Math.min(1,Math.max(0,i/o.duration)),r=qe(a),[c,d]=o.kind==="board"?Ue(o.startX,o.startY,o.endX,o.endY,r):[o.startX+(o.endX-o.startX)*r,o.startY+(o.endY-o.startY)*r],l=o.kind==="board"?.9:o.kind==="abandon"?(1-r)**1.5:1-r,g=o.kind==="abandon"?e.carDotR*.85:e.carDotR;s.fillStyle=we(o.color,l),s.beginPath(),s.arc(c,d,g,0,Math.PI*2),s.fill()}}#_(e,n,s,o){const i=this.#t,a=s-o.padBottom+(o.padBottom-o.sparkH)/2,r=a+o.sparkH,c=o.padX,d=n-o.padX,l=Math.max(d-c,1);if(i.font=`${o.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,i.textBaseline="top",i.fillStyle=He,i.textAlign="left",i.fillText(this.#d,c,a-1),e.length===0)return;const g=e[e.length-1];if(i.fillStyle=me,i.textAlign="right",i.fillText(g.toFixed(1),d,a-1),e.length<2)return;const m=Math.max(1,...e),h=l/Math.max(e.length-1,1),f=p=>r-p/m*(r-a);i.strokeStyle=$e,i.lineWidth=1,i.beginPath(),i.moveTo(c,r),i.lineTo(d,r),i.stroke(),i.strokeStyle=this.#p,i.lineWidth=1.4,i.beginPath();for(let p=0;p<e.length;p++){const S=c+p*h,w=f(e[p]);p===0?i.moveTo(S,w):i.lineTo(S,w)}i.stroke()}get canvas(){return this.#e}}function ue(t,e,n,s,o,i,a,r){const c=o*2+1.2,d=Math.max(1,Math.floor((s-10)/c)),l=Math.min(i,d);t.fillStyle=a;for(let g=0;g<l;g++){const m=e+o+g*c;t.beginPath(),t.arc(m,n,o,0,Math.PI*2),t.fill()}i>l&&(t.fillStyle=ce,t.font=`${r.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,t.textAlign="left",t.textBaseline="middle",t.fillText(`+${i-l}`,e+o+l*c,n))}function Ke(t,e,n,s,o,i,a,r){const l=s-6,g=o-6,m=i*2+1.2,h=Math.max(1,Math.floor(l/m)),f=Math.max(1,Math.floor(g/m)),p=h*f,S=Math.min(a,p),w=a-S,I=e-s/2+3+i,k=n-o/2+3+i;t.fillStyle=Me;const M=w>0?S-1:S;for(let u=0;u<M;u++){const _=u%h,T=Math.floor(u/h),C=I+_*m,x=k+T*m;t.beginPath(),t.arc(C,x,i,0,Math.PI*2),t.fill()}if(w>0){t.fillStyle=ce,t.font=`${r.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,t.textAlign="center",t.textBaseline="middle";const u=M,_=u%h,T=Math.floor(u/h),C=I+_*m,x=k+T*m;t.fillText(`+${a-M}`,C,x)}}function Se(t,e){const n=t.match(/^#?([0-9a-f]{6})$/i);if(!n)return t;const s=parseInt(n[1],16),o=s>>16&255,i=s>>8&255,a=s&255,r=c=>e>=0?Math.round(c+(255-c)*e):Math.round(c*(1+e));return`rgb(${r(o)}, ${r(i)}, ${r(a)})`}function we(t,e){const n=t.match(/^#?([0-9a-f]{6})$/i);if(!n)return t;const s=parseInt(n[1],16),o=s>>16&255,i=s>>8&255,a=s&255;return`rgba(${o}, ${i}, ${a}, ${e})`}function Ve(t,e,n){if(t.measureText(e).width<=n)return e;const s="…";let o=0,i=e.length;for(;o<i;){const a=o+i+1>>1;t.measureText(e.slice(0,a)+s).width<=n?o=a:i=a-1}return o===0?s:e.slice(0,o)+s}function je(t,e,n,s,o,i){const a=Math.min(i,s/2,o/2);if(t.beginPath(),typeof t.roundRect=="function"){t.roundRect(e,n,s,o,a);return}t.moveTo(e+a,n),t.lineTo(e+s-a,n),t.quadraticCurveTo(e+s,n,e+s,n+a),t.lineTo(e+s,n+o-a),t.quadraticCurveTo(e+s,n+o,e+s-a,n+o),t.lineTo(e+a,n+o),t.quadraticCurveTo(e,n+o,e,n+o-a),t.lineTo(e,n+a),t.quadraticCurveTo(e,n,e+a,n),t.closePath()}function D(t,e,n){const s=le(t,e),o=n[e];if(o===void 0||!Number.isFinite(o))return s;const i=t.tweakRanges[e];return Pe(o,i.min,i.max)}function le(t,e){const n=t.elevatorDefaults;switch(e){case"cars":return t.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return xe(n.doorOpenTicks,n.doorTransitionTicks)}}function de(t,e,n){const s=le(t,e),o=t.tweakRanges[e].step/2;return Math.abs(n-s)>o}function Te(t,e){const n={};for(const s of q){const o=e[s];o!==void 0&&de(t,s,o)&&(n[s]=o)}return n}const q=["cars","maxSpeed","weightCapacity","doorCycleSec"];function Je(t,e){const{doorOpenTicks:n,doorTransitionTicks:s}=t.elevatorDefaults,o=xe(n,s),i=Pe(n/(o*j),.1,.9),a=Math.max(2,Math.round(e*j)),r=Math.max(1,Math.round(a*i)),c=Math.max(1,Math.round((a-r)/2));return{openTicks:r,transitionTicks:c}}function xe(t,e){return(t+2*e)/j}function Ie(t,e){const n=t.elevatorDefaults,s=D(t,"maxSpeed",e),o=D(t,"weightCapacity",e),i=D(t,"doorCycleSec",e),{openTicks:a,transitionTicks:r}=Je(t,i);return{...n,maxSpeed:s,weightCapacity:o,doorOpenTicks:a,doorTransitionTicks:r}}function Qe(t,e){if(t<1||e<1)return[];const n=[];for(let s=0;s<e;s+=1)n.push(Math.min(t-1,Math.floor(s*t/e)));return n}function Ze(t,e){const n=Math.round(D(t,"cars",e)),s=Ie(t,e),o=Qe(t.stops.length,n),i=t.stops.map((r,c)=>`        StopConfig(id: StopId(${c}), name: ${ie(r.name)}, position: ${L(r.positionM)}),`).join(`
`),a=o.map((r,c)=>tt(c,s,r,et(c,n))).join(`
`);return`SimConfig(
    building: BuildingConfig(
        name: ${ie(t.buildingName)},
        stops: [
${i}
        ],
    ),
    elevators: [
${a}
    ],
    simulation: SimulationParams(ticks_per_second: ${L(j)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${t.passengerMeanIntervalTicks},
        weight_range: (${L(t.passengerWeightRange[0])}, ${L(t.passengerWeightRange[1])}),
    ),
)`}const j=60;function Pe(t,e,n){return Math.min(n,Math.max(e,t))}function et(t,e){return e>=3?`Car ${String.fromCharCode(65+t)}`:`Car ${t+1}`}function tt(t,e,n,s){const o=e.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${L(e.bypassLoadUpPct)}),`:"",i=e.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${L(e.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${t}, name: ${ie(s)},
            max_speed: ${L(e.maxSpeed)}, acceleration: ${L(e.acceleration)}, deceleration: ${L(e.deceleration)},
            weight_capacity: ${L(e.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${e.doorOpenTicks}, door_transition_ticks: ${e.doorTransitionTicks},${o}${i}
        ),`}function ie(t){if(/[\\"\n]/.test(t))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(t)}`);return`"${t}"`}function L(t){return Number.isInteger(t)?`${t}.0`:String(t)}const We={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},H={scenario:"skyscraper-sky-lobby",strategyA:"etd",strategyB:"scan",compare:!0,seed:42,intensity:1,speed:2,overrides:{}},nt=["scan","look","nearest","etd","destination"];function ye(t,e){return t!==null&&nt.includes(t)?t:e}function ot(t){const e=new URLSearchParams;e.set("s",t.scenario),e.set("a",t.strategyA),e.set("b",t.strategyB),t.compare&&e.set("c","1"),e.set("k",String(t.seed)),e.set("i",String(t.intensity)),e.set("x",String(t.speed));for(const n of q){const s=t.overrides[n];s!==void 0&&Number.isFinite(s)&&e.set(We[n],st(s))}return`?${e.toString()}`}function it(t){const e=new URLSearchParams(t),n={};for(const s of q){const o=e.get(We[s]);if(o===null)continue;const i=Number(o);Number.isFinite(i)&&(n[s]=i)}return{scenario:e.get("s")??H.scenario,strategyA:ye(e.get("a")??e.get("d"),H.strategyA),strategyB:ye(e.get("b"),H.strategyB),compare:e.get("c")==="1",seed:te(e.get("k"),H.seed),intensity:te(e.get("i"),H.intensity),speed:te(e.get("x"),H.speed),overrides:n}}function te(t,e){if(t===null)return e;const n=Number(t);return Number.isFinite(n)?n:e}function st(t){return Number.isInteger(t)?String(t):Number(t.toFixed(2)).toString()}const G={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function b(t){return Array.from({length:t},()=>1)}function se(t){return Array.from({length:t},(e,n)=>n===0?1:0)}function Y(t){return Array.from({length:t},(e,n)=>1+n/Math.max(1,t-1)*.5)}const $=6,at=[{name:"Overnight",durationSec:45,ridersPerMin:3,originWeights:b($),destWeights:b($)},{name:"Morning rush",durationSec:60,ridersPerMin:30,originWeights:[8.5,.3,.3,.3,.3,.3],destWeights:Y($).map((t,e)=>e===0?0:t)},{name:"Midday interfloor",durationSec:60,ridersPerMin:16,originWeights:b($),destWeights:b($)},{name:"Lunchtime",durationSec:45,ridersPerMin:36,originWeights:[.3,3,2,2,2,2],destWeights:[.3,3,2,2,2,2]},{name:"Evening exodus",durationSec:60,ridersPerMin:30,originWeights:Y($).map((t,e)=>e===0?0:t),destWeights:se($)}],rt={id:"office-mid-rise",label:"Mid-rise office",description:"Six floors, two 800 kg cars. Walks through morning rush → midday → lunchtime → evening exodus. Group-time ETD damps tail waits under sustained load.",defaultStrategy:"etd",phases:at,seedSpawns:0,abandonAfterSec:90,hook:{kind:"etd_group_time",waitSquaredWeight:.002},featureHint:"Group-time ETD (`wait_squared_weight = 0.002`) — stops hosting older waiters win ties, damping long-wait tail during lunchtime bursts.",buildingName:"Mid-Rise Office",stops:[{name:"Lobby",positionM:0},{name:"Floor 2",positionM:4},{name:"Floor 3",positionM:8},{name:"Floor 4",positionM:12},{name:"Floor 5",positionM:16},{name:"Floor 6",positionM:20}],defaultCars:2,elevatorDefaults:{maxSpeed:2.2,acceleration:1.5,deceleration:2,weightCapacity:800,doorOpenTicks:210,doorTransitionTicks:60},tweakRanges:G,passengerMeanIntervalTicks:90,passengerWeightRange:[50,100],ron:`SimConfig(
    building: BuildingConfig(
        name: "Mid-Rise Office",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
            StopConfig(id: StopId(5), name: "Floor 6", position: 20.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.2, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            // Realistic mid-rise commercial: 3.5 s dwell, 1 s each way.
            // The previous ~1 s total cycle was ~4× faster than any
            // real elevator and read as cartoonish on the canvas —
            // doors barely flickered before cars peeled off again.
            door_open_ticks: 210, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.2, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(3),
            door_open_ticks: 210, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 90,
        weight_range: (50.0, 100.0),
    ),
)`},W=13,ct=[{name:"Overnight",durationSec:45,ridersPerMin:6,originWeights:b(W),destWeights:b(W)},{name:"Morning rush",durationSec:75,ridersPerMin:20,originWeights:[14,...Array.from({length:W-1},()=>.25)],destWeights:[0,...Y(W-1)]},{name:"Midday interfloor",durationSec:60,ridersPerMin:13,originWeights:b(W),destWeights:b(W)},{name:"Lunchtime",durationSec:45,ridersPerMin:17,originWeights:Array.from({length:W},(t,e)=>e===6?3:1),destWeights:Array.from({length:W},(t,e)=>e===6?4:1)},{name:"Evening exodus",durationSec:75,ridersPerMin:18,originWeights:[0,...Y(W-1)],destWeights:[14,...Array.from({length:W-1},()=>.25)]}],lt={id:"skyscraper-sky-lobby",label:"Skyscraper (sky lobby)",description:"Twelve floors, three cars. Morning rush saturates two cars fast — the third's full-load bypass (80 %/50 %) stops it from detouring for upward hall calls it can't serve.",defaultStrategy:"etd",phases:ct,seedSpawns:0,abandonAfterSec:180,hook:{kind:"bypass_narration"},featureHint:"Direction-dependent bypass (80 % up / 50 % down) on all three cars — baked into the RON below. Watch the fullest car skip hall calls.",buildingName:"Skyscraper (Sky Lobby)",stops:[{name:"Lobby",positionM:0},{name:"Floor 2",positionM:4},{name:"Floor 3",positionM:8},{name:"Floor 4",positionM:12},{name:"Floor 5",positionM:16},{name:"Floor 6",positionM:20},{name:"Sky Lobby",positionM:24},{name:"Floor 8",positionM:28},{name:"Floor 9",positionM:32},{name:"Floor 10",positionM:36},{name:"Floor 11",positionM:40},{name:"Floor 12",positionM:44},{name:"Penthouse",positionM:48}],defaultCars:3,elevatorDefaults:{maxSpeed:4,acceleration:2,deceleration:2.5,weightCapacity:1200,doorOpenTicks:300,doorTransitionTicks:72,bypassLoadUpPct:.8,bypassLoadDownPct:.5},tweakRanges:G,passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
    building: BuildingConfig(
        name: "Skyscraper (Sky Lobby)",
        stops: [
            StopConfig(id: StopId(0),  name: "Lobby",      position: 0.0),
            StopConfig(id: StopId(1),  name: "Floor 2",    position: 4.0),
            StopConfig(id: StopId(2),  name: "Floor 3",    position: 8.0),
            StopConfig(id: StopId(3),  name: "Floor 4",    position: 12.0),
            StopConfig(id: StopId(4),  name: "Floor 5",    position: 16.0),
            StopConfig(id: StopId(5),  name: "Floor 6",    position: 20.0),
            StopConfig(id: StopId(6),  name: "Sky Lobby",  position: 24.0),
            StopConfig(id: StopId(7),  name: "Floor 8",    position: 28.0),
            StopConfig(id: StopId(8),  name: "Floor 9",    position: 32.0),
            StopConfig(id: StopId(9),  name: "Floor 10",   position: 36.0),
            StopConfig(id: StopId(10), name: "Floor 11",   position: 40.0),
            StopConfig(id: StopId(11), name: "Floor 12",   position: 44.0),
            StopConfig(id: StopId(12), name: "Penthouse",  position: 48.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(0),
            // High-rise commercial: 5 s dwell (surge loading during
            // rush), 1.2 s each way. The long dwell is what lets the
            // bypass hook matter — a full car's few seconds saved by
            // skipping a hall call is meaningful at this scale.
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(6),
            // High-rise commercial: 5 s dwell (surge loading during
            // rush), 1.2 s each way. The long dwell is what lets the
            // bypass hook matter — a full car's few seconds saved by
            // skipping a hall call is meaningful at this scale.
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(12),
            // High-rise commercial: 5 s dwell (surge loading during
            // rush), 1.2 s each way. The long dwell is what lets the
            // bypass hook matter — a full car's few seconds saved by
            // skipping a hall call is meaningful at this scale.
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (55.0, 100.0),
    ),
)`},A=8,dt=[{name:"Overnight",durationSec:60,ridersPerMin:3,originWeights:b(A),destWeights:b(A)},{name:"Morning exodus",durationSec:75,ridersPerMin:35,originWeights:[0,...Y(A-1)],destWeights:se(A)},{name:"Midday quiet",durationSec:60,ridersPerMin:7,originWeights:b(A),destWeights:b(A)},{name:"Afternoon drift",durationSec:45,ridersPerMin:14,originWeights:Array.from({length:A},(t,e)=>e===0?3:1),destWeights:b(A)},{name:"Evening return",durationSec:60,ridersPerMin:30,originWeights:se(A),destWeights:[0,...Y(A-1)]}],pt={id:"residential-tower",label:"Residential tower",description:"Eight floors, two cars. Asymmetric day: morning exodus, quiet midday, evening return. Predictive parking anticipates the next peak by the arrival-log rate signal.",defaultStrategy:"etd",phases:dt,seedSpawns:0,abandonAfterSec:180,hook:{kind:"predictive_parking",windowTicks:9e3},featureHint:"Predictive parking with a 2.5-min window — during the midday slump, idle cars pre-position toward the floors that spiked most recently.",buildingName:"Residential Tower",stops:[{name:"Lobby",positionM:0},{name:"Floor 2",positionM:3.5},{name:"Floor 3",positionM:7},{name:"Floor 4",positionM:10.5},{name:"Floor 5",positionM:14},{name:"Floor 6",positionM:17.5},{name:"Floor 7",positionM:21},{name:"Penthouse",positionM:24.5}],defaultCars:2,elevatorDefaults:{maxSpeed:2.5,acceleration:1.6,deceleration:2.2,weightCapacity:700,doorOpenTicks:180,doorTransitionTicks:60},tweakRanges:G,passengerMeanIntervalTicks:75,passengerWeightRange:[50,95],ron:`SimConfig(
    building: BuildingConfig(
        name: "Residential Tower",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 3.5),
            StopConfig(id: StopId(2), name: "Floor 3", position: 7.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 10.5),
            StopConfig(id: StopId(4), name: "Floor 5", position: 14.0),
            StopConfig(id: StopId(5), name: "Floor 6", position: 17.5),
            StopConfig(id: StopId(6), name: "Floor 7", position: 21.0),
            StopConfig(id: StopId(7), name: "Penthouse", position: 24.5),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.6, deceleration: 2.2,
            weight_capacity: 700.0,
            starting_stop: StopId(0),
            // Residential: 3 s dwell, 1 s each way. Lighter traffic
            // than commercial; no luggage-loading dwell to pad.
            door_open_ticks: 180, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.6, deceleration: 2.2,
            weight_capacity: 700.0,
            starting_stop: StopId(4),
            // Residential: 3 s dwell, 1 s each way. Lighter traffic
            // than commercial; no luggage-loading dwell to pad.
            door_open_ticks: 180, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 75,
        weight_range: (50.0, 95.0),
    ),
)`},R=10,ft=[{name:"Overnight",durationSec:45,ridersPerMin:3,originWeights:b(R),destWeights:b(R)},{name:"Check-out rush",durationSec:60,ridersPerMin:32,originWeights:[0,.5,...Array.from({length:R-2},()=>1)],destWeights:[5,2,...Array.from({length:R-2},()=>.3)]},{name:"Daytime",durationSec:75,ridersPerMin:15,originWeights:b(R),destWeights:b(R)},{name:"Check-in rush",durationSec:60,ridersPerMin:28,originWeights:[4,1,...Array.from({length:R-2},()=>.3)],destWeights:[0,.5,...Array.from({length:R-2},()=>1)]},{name:"Late night",durationSec:60,ridersPerMin:10,originWeights:[2,2,...Array.from({length:R-2},()=>.5)],destWeights:[.5,.5,...Array.from({length:R-2},()=>1)]}],gt={id:"hotel-24-7",label:"Hotel 24/7",description:"Ten floors, three cars in DCS mode. Low-rate baseline with check-in / check-out bumps; deferred commitment reallocates assignments while cars are still far from the rider's origin.",defaultStrategy:"destination",phases:ft,seedSpawns:0,abandonAfterSec:150,hook:{kind:"deferred_dcs",commitmentWindowTicks:180},featureHint:"Deferred DCS with a 3-s (180-tick) commitment window — sticky assignments keep re-competing until a car is close to the rider, yielding better matches under bursty demand.",buildingName:"Hotel 24/7",stops:[{name:"Lobby",positionM:0},{name:"Restaurant",positionM:3.5},{name:"Floor 3",positionM:7},{name:"Floor 4",positionM:10.5},{name:"Floor 5",positionM:14},{name:"Floor 6",positionM:17.5},{name:"Floor 7",positionM:21},{name:"Floor 8",positionM:24.5},{name:"Floor 9",positionM:28},{name:"Penthouse",positionM:31.5}],defaultCars:3,elevatorDefaults:{maxSpeed:3,acceleration:1.8,deceleration:2.3,weightCapacity:900,doorOpenTicks:240,doorTransitionTicks:60},tweakRanges:G,passengerMeanIntervalTicks:120,passengerWeightRange:[50,95],ron:`SimConfig(
    building: BuildingConfig(
        name: "Hotel 24/7",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",      position: 0.0),
            StopConfig(id: StopId(1), name: "Restaurant", position: 3.5),
            StopConfig(id: StopId(2), name: "Floor 3",    position: 7.0),
            StopConfig(id: StopId(3), name: "Floor 4",    position: 10.5),
            StopConfig(id: StopId(4), name: "Floor 5",    position: 14.0),
            StopConfig(id: StopId(5), name: "Floor 6",    position: 17.5),
            StopConfig(id: StopId(6), name: "Floor 7",    position: 21.0),
            StopConfig(id: StopId(7), name: "Floor 8",    position: 24.5),
            StopConfig(id: StopId(8), name: "Floor 9",    position: 28.0),
            StopConfig(id: StopId(9), name: "Penthouse",  position: 31.5),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 3.0, acceleration: 1.8, deceleration: 2.3,
            weight_capacity: 900.0,
            starting_stop: StopId(0),
            // Hotel: 4 s dwell (luggage carts, guests with bags),
            // 1 s each way. Longer than office, shorter than
            // transit — fits the observed commercial range.
            door_open_ticks: 240, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 3.0, acceleration: 1.8, deceleration: 2.3,
            weight_capacity: 900.0,
            starting_stop: StopId(4),
            // Hotel: 4 s dwell (luggage carts, guests with bags),
            // 1 s each way. Longer than office, shorter than
            // transit — fits the observed commercial range.
            door_open_ticks: 240, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 3.0, acceleration: 1.8, deceleration: 2.3,
            weight_capacity: 900.0,
            starting_stop: StopId(9),
            // Hotel: 4 s dwell (luggage carts, guests with bags),
            // 1 s each way. Longer than office, shorter than
            // transit — fits the observed commercial range.
            door_open_ticks: 240, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 120,
        weight_range: (50.0, 95.0),
    ),
)`},X=5,mt=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:X},(t,e)=>e===X-1?8:1),destWeights:[5,2,1,1,0]},{name:"Tapering",durationSec:90,ridersPerMin:18,originWeights:b(X),destWeights:b(X)},{name:"Between sessions",durationSec:135,ridersPerMin:4,originWeights:b(X),destWeights:b(X)}],ht={id:"convention-burst",label:"Convention burst",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:mt,seedSpawns:120,hook:{kind:"arrival_log"},featureHint:"Arrival-rate signal lights up as the burst hits — `DispatchManifest::arrivals_at` feeds downstream strategies the per-stop intensity for the next 5 minutes.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:2,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...G,cars:{min:1,max:5,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
    building: BuildingConfig(
        name: "Convention Center",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",        position: 0.0),
            StopConfig(id: StopId(1), name: "Exhibit Hall", position: 4.0),
            StopConfig(id: StopId(2), name: "Mezzanine",    position: 8.0),
            StopConfig(id: StopId(3), name: "Ballroom",     position: 12.0),
            StopConfig(id: StopId(4), name: "Keynote Hall", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(0),
            // Convention: 5 s dwell for group boarding. Big crowds
            // after keynote are slow to actually step through the
            // threshold; rushing the doors closed ejects riders
            // mid-walk and re-opens, a realistic failure mode.
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(4),
            // Convention: 5 s dwell for group boarding. Big crowds
            // after keynote are slow to actually step through the
            // threshold; rushing the doors closed ejects riders
            // mid-walk and re-opens, a realistic failure mode.
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (55.0, 100.0),
    ),
)`},ut={id:"space-elevator",label:"Space elevator",description:"Two stops 1,000 km apart. Same engine, different scale — no traffic patterns really apply; it's a showpiece for the trapezoidal-motion primitives.",defaultStrategy:"scan",phases:[{name:"Scheduled climb",durationSec:300,ridersPerMin:4,originWeights:[1,1],destWeights:[1,1]}],seedSpawns:0,hook:{kind:"none"},featureHint:"No controller feature to showcase — this scenario exists to demonstrate that the engine is topology-agnostic.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Orbital Platform",positionM:1e3}],defaultCars:1,elevatorDefaults:{maxSpeed:50,acceleration:10,deceleration:15,weightCapacity:1e4,doorOpenTicks:120,doorTransitionTicks:30},tweakRanges:{cars:{min:1,max:1,step:1},maxSpeed:{min:5,max:100,step:5},weightCapacity:{min:1e3,max:2e4,step:1e3},doorCycleSec:{min:2,max:8,step:.5}},passengerMeanIntervalTicks:900,passengerWeightRange:[60,90],ron:`SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station",   position: 0.0),
            StopConfig(id: StopId(1), name: "Orbital Platform", position: 1000.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Climber Alpha",
            max_speed: 50.0, acceleration: 10.0, deceleration: 15.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(0),
            door_open_ticks: 120, door_transition_ticks: 30,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 900,
        weight_range: (60.0, 90.0),
    ),
)`},ae=[rt,lt,pt,gt,ht,ut];function B(t){return ae.find(e=>e.id===t)??ae[0]}let ne=null;async function St(){if(!ne){const t=new URL("pkg/elevator_wasm.js",document.baseURI).href,e=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;ne=import(t).then(async n=>(await n.default(e),n))}return ne}class pe{#e;#t;constructor(e){this.#e=e,this.#t=e.dt()}static async create(e,n){const s=await St();return new pe(new s.WasmSim(e,n))}step(e){this.#e.stepMany(e)}drainEvents(){return this.#e.drainEvents()??[]}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}setStrategy(e){return this.#e.setStrategy(e)}spawnRider(e,n,s,o){this.#e.spawnRider(e,n,s,o)}setTrafficRate(e){this.#e.setTrafficRate(e)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(e){return this.#e.waitingCountAt(e)}applyPhysicsLive(e){const n=this.#e;if(!n.setMaxSpeedAll||!n.setWeightCapacityAll||!n.setDoorOpenTicksAll||!n.setDoorTransitionTicksAll)return!1;try{return n.setMaxSpeedAll(e.maxSpeed),n.setWeightCapacityAll(e.weightCapacityKg),n.setDoorOpenTicksAll(e.doorOpenTicks),n.setDoorTransitionTicksAll(e.doorTransitionTicks),!0}catch{return!1}}applyHook(e){const n=this.#e;switch(e.kind){case"none":case"arrival_log":case"bypass_narration":return;case"etd_group_time":n.setEtdWithWaitSquaredWeight?.(e.waitSquaredWeight);return;case"deferred_dcs":n.setHallCallModeDestination?.(),n.setDcsWithCommitmentWindow?.(BigInt(e.commitmentWindowTicks));return;case"predictive_parking":n.setRepositionPredictiveParking?.(BigInt(e.windowTicks));return}}dispose(){this.#e.free()}}class Ae{#e;#t=0;#n=[];#i=0;#s=0;#c=1;#l=0;constructor(e){this.#e=wt(BigInt(e>>>0))}setPhases(e){this.#n=e,this.#i=e.reduce((n,s)=>n+s.durationSec,0),this.#s=0,this.#t=0}setIntensity(e){this.#c=Math.max(0,e)}setPatienceTicks(e){this.#l=Math.max(0,Math.floor(e))}drainSpawns(e,n){if(this.#n.length===0)return[];const s=e.stops.filter(r=>r.stop_id!==4294967295);if(s.length<2)return[];const o=Math.min(n,4/60),i=this.#n[this.currentPhaseIndex()];this.#t+=i.ridersPerMin*this.#c/60*o,this.#s=(this.#s+o)%(this.#i||1);const a=[];for(;this.#t>=1;)this.#t-=1,a.push(this.#p(s,i));return a}currentPhaseIndex(){if(this.#n.length===0)return 0;let e=this.#s;for(let n=0;n<this.#n.length;n+=1)if(e-=this.#n[n].durationSec,e<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#i<=0?0:Math.min(1,this.#s/this.#i)}phases(){return this.#n}#p(e,n){const s=this.#a(e.length,n.originWeights);let o=this.#a(e.length,n.destWeights);o===s&&(o=(o+1)%e.length);const i=50+this.#d()*50;return{originStopId:e[s].stop_id,destStopId:e[o].stop_id,weight:i,patienceTicks:this.#l>0?this.#l:void 0}}#a(e,n){if(!n||n.length!==e)return this.#o(e);let s=0;for(let i=0;i<e;i+=1)s+=Math.max(0,n[i]);if(s<=0)return this.#o(e);let o=this.#d()*s;for(let i=0;i<e;i+=1)if(o-=Math.max(0,n[i]),o<0)return i;return e-1}#r(){let e=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return e=(e^e>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,e=(e^e>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,e^e>>31n}#o(e){return Number(this.#r()%BigInt(e))}#d(){return Number(this.#r()>>11n)/2**53}}function wt(t){let e=t+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return e=(e^e>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,e=(e^e>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,e^e>>31n}const yt=["scan","look","nearest","etd","destination","rsr"],U={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},bt=120,kt="#7dd3fc",_t="#fda4af",Re=t=>`${t}×`,Le=t=>`${t.toFixed(1)}×`,vt=1400;async function Ct(){const t=Tt(),e={...H,...it(window.location.search)};Mt(e);const n=B(e.scenario);e.overrides=Te(n,e.overrides),xt(e,t);const s={running:!0,ready:!1,permalink:e,paneA:null,paneB:null,traffic:new Ae(e.seed),lastFrameTime:performance.now(),initToken:0};It(s,t),await P(s,t),s.ready=!0,Pt(s)}function Mt(t){const e=B(t.scenario);t.scenario=e.id}function Tt(){const t=a=>{const r=document.getElementById(a);if(!r)throw new Error(`missing element #${a}`);return r},e=a=>document.getElementById(a)??null,n=(a,r)=>({root:t(`pane-${a}`),canvas:t(`shaft-${a}`),name:t(`name-${a}`),metrics:t(`metrics-${a}`),accent:r}),s=a=>{const r=document.querySelector(`.tweak-row[data-key="${a}"]`);if(!r)throw new Error(`missing tweak row for ${a}`);const c=d=>{const l=r.querySelector(d);if(!l)throw new Error(`missing ${d} in tweak row ${a}`);return l};return{root:r,value:c(".tweak-value"),defaultV:c(".tweak-default-v"),dec:c(".tweak-dec"),inc:c(".tweak-inc"),reset:c(".tweak-reset")}},o={cars:s("cars"),maxSpeed:s("maxSpeed"),weightCapacity:s("weightCapacity"),doorCycleSec:s("doorCycleSec")},i={scenarioSelect:t("scenario"),strategyASelect:t("strategy-a"),strategyBSelect:t("strategy-b"),compareToggle:t("compare"),strategyBWrap:t("strategy-b-wrap"),seedInput:t("seed"),speedInput:t("speed"),speedLabel:t("speed-label"),intensityInput:t("traffic"),intensityLabel:t("traffic-label"),playBtn:t("play"),resetBtn:t("reset"),shareBtn:t("share"),tweakBtn:t("tweak"),tweakPanel:t("tweak-panel"),tweakResetAllBtn:t("tweak-reset-all"),tweakRows:o,layout:t("layout"),loader:t("loader"),toast:t("toast"),phaseLabel:e("phase-label"),featureHint:e("feature-hint"),paneA:n("a",kt),paneB:n("b",_t)};for(const a of ae){const r=document.createElement("option");r.value=a.id,r.textContent=a.label,r.title=a.description,i.scenarioSelect.appendChild(r)}for(const a of yt)for(const r of[i.strategyASelect,i.strategyBSelect]){const c=document.createElement("option");c.value=a,c.textContent=U[a],r.appendChild(c)}return i.intensityInput.min="0.5",i.intensityInput.max="2",i.intensityInput.step="0.1",i}function xt(t,e){e.scenarioSelect.value=t.scenario,e.strategyASelect.value=t.strategyA,e.strategyBSelect.value=t.strategyB,e.compareToggle.checked=t.compare,e.strategyBWrap.classList.toggle("hidden",!t.compare),e.layout.dataset.mode=t.compare?"compare":"single",e.seedInput.value=String(t.seed),e.speedInput.value=String(t.speed),e.speedLabel.textContent=Re(t.speed),e.intensityInput.value=String(t.intensity),e.intensityLabel.textContent=Le(t.intensity);const n=B(t.scenario);e.featureHint&&(e.featureHint.textContent=n.featureHint),Object.keys(t.overrides).length>0&&Ee(e,!0),Q(n,t.overrides,e)}function be(t,e){switch(t){case"cars":return String(Math.round(e));case"weightCapacity":return String(Math.round(e));case"maxSpeed":case"doorCycleSec":return e.toFixed(1)}}function Q(t,e,n){let s=!1;for(const o of q){const i=n.tweakRows[o],a=t.tweakRanges[o],r=D(t,o,e),c=le(t,o),d=de(t,o,r);d&&(s=!0),i.value.textContent=be(o,r),i.defaultV.textContent=be(o,c),i.dec.disabled=r<=a.min+1e-9,i.inc.disabled=r>=a.max-1e-9,i.root.dataset.overridden=String(d),i.reset.hidden=!d}n.tweakResetAllBtn.hidden=!s}function Ee(t,e){t.tweakBtn.setAttribute("aria-expanded",e?"true":"false"),t.tweakPanel.hidden=!e}function J(t,e){t.paneA&&e(t.paneA),t.paneB&&e(t.paneB)}function V(t){t?.sim.dispose(),t?.renderer.dispose()}async function ke(t,e,n,s){const o=Ze(n,s),i=await pe.create(o,e);i.applyHook(n.hook);const a=new Ge(t.canvas,t.accent);return t.name.textContent=U[e],$t(t.metrics),{strategy:e,sim:i,renderer:a,metricsEl:t.metrics,waitHistory:[],latestMetrics:null,bubbles:new Map}}async function P(t,e){const n=++t.initToken;e.loader.classList.add("show");const s=B(t.permalink.scenario);t.traffic=new Ae(t.permalink.seed),t.traffic.setPhases(s.phases),t.traffic.setIntensity(t.permalink.intensity),t.traffic.setPatienceTicks(s.abandonAfterSec?Math.round(s.abandonAfterSec*60):0),V(t.paneA),V(t.paneB),t.paneA=null,t.paneB=null;try{const o=await ke(e.paneA,t.permalink.strategyA,s,t.permalink.overrides);if(n!==t.initToken){V(o);return}if(t.paneA=o,t.permalink.compare){const i=await ke(e.paneB,t.permalink.strategyB,s,t.permalink.overrides);if(n!==t.initToken){V(i);return}t.paneB=i}if(s.seedSpawns>0){const i=t.paneA.sim.snapshot();for(let a=0;a<s.seedSpawns;a+=1){const r=t.traffic.drainSpawns(i,.0033333333333333335);for(const c of r)J(t,d=>d.sim.spawnRider(c.originStopId,c.destStopId,c.weight,c.patienceTicks));if(r.length===0)break}}e.featureHint&&(e.featureHint.textContent=s.featureHint),Lt(t,e),Q(s,t.permalink.overrides,e)}catch(o){throw n===t.initToken&&E(e,`Init failed: ${o.message}`),o}finally{n===t.initToken&&e.loader.classList.remove("show")}}function It(t,e){e.scenarioSelect.addEventListener("change",async()=>{const n=B(e.scenarioSelect.value),s=t.permalink.compare?t.permalink.strategyA:n.defaultStrategy;t.permalink={...t.permalink,scenario:n.id,strategyA:s,overrides:{}},e.strategyASelect.value=s,await P(t,e),Q(n,t.permalink.overrides,e),E(e,`${n.label} · ${U[s]}`)}),e.strategyASelect.addEventListener("change",async()=>{t.permalink={...t.permalink,strategyA:e.strategyASelect.value},await P(t,e),E(e,`A: ${U[t.permalink.strategyA]}`)}),e.strategyBSelect.addEventListener("change",async()=>{t.permalink={...t.permalink,strategyB:e.strategyBSelect.value},t.permalink.compare&&(await P(t,e),E(e,`B: ${U[t.permalink.strategyB]}`))}),e.compareToggle.addEventListener("change",async()=>{t.permalink={...t.permalink,compare:e.compareToggle.checked},e.strategyBWrap.classList.toggle("hidden",!t.permalink.compare),e.layout.dataset.mode=t.permalink.compare?"compare":"single",await P(t,e),E(e,t.permalink.compare?"Compare on":"Compare off")}),e.seedInput.addEventListener("change",async()=>{const n=Number(e.seedInput.value);Number.isFinite(n)&&(t.permalink={...t.permalink,seed:n},await P(t,e))}),e.speedInput.addEventListener("input",()=>{const n=Number(e.speedInput.value);t.permalink.speed=n,e.speedLabel.textContent=Re(n)}),e.intensityInput.addEventListener("input",()=>{const n=Number(e.intensityInput.value);t.permalink.intensity=n,t.traffic.setIntensity(n),e.intensityLabel.textContent=Le(n)}),e.playBtn.addEventListener("click",()=>{t.running=!t.running,e.playBtn.textContent=t.running?"Pause":"Play"}),e.resetBtn.addEventListener("click",()=>{P(t,e),E(e,"Reset")}),e.tweakBtn.addEventListener("click",()=>{const n=e.tweakBtn.getAttribute("aria-expanded")!=="true";Ee(e,n)});for(const n of q){const s=e.tweakRows[n];s.dec.addEventListener("click",()=>Ce(t,e,n,-1)),s.inc.addEventListener("click",()=>Ce(t,e,n,1)),s.reset.addEventListener("click",()=>Ht(t,e,n))}e.tweakResetAllBtn.addEventListener("click",()=>{Dt(t,e)}),e.shareBtn.addEventListener("click",async()=>{const n=ot(t.permalink),s=`${window.location.origin}${window.location.pathname}${n}`;window.history.replaceState(null,"",n),await navigator.clipboard.writeText(s).catch(()=>{}),E(e,"Permalink copied")})}function Pt(t){let e=0;const n=()=>{const s=performance.now(),o=(s-t.lastFrameTime)/1e3;if(t.lastFrameTime=s,t.running&&t.ready&&t.paneA){const i=t.permalink.speed;J(t,l=>{l.sim.step(i);const g=l.sim.drainEvents();Wt(l,g)});const a=t.paneA.sim.snapshot(),r=o*i,c=t.traffic.drainSpawns(a,r);for(const l of c)J(t,g=>g.sim.spawnRider(l.originStopId,l.destStopId,l.weight,l.patienceTicks));const d=t.permalink.speed;_e(t.paneA,t.paneA.sim.snapshot(),d),t.paneB&&_e(t.paneB,t.paneB.sim.snapshot(),d),Ft(t),(e+=1)%4===0&&Et(t)}requestAnimationFrame(n)};requestAnimationFrame(n)}function _e(t,e,n){const s=t.sim.metrics();t.latestMetrics=s,t.waitHistory.push(s.avg_wait_s),t.waitHistory.length>bt&&t.waitHistory.shift();const o=performance.now();for(const[i,a]of t.bubbles)a.expiresAt<=o&&t.bubbles.delete(i);t.renderer.draw(e,t.waitHistory,n,t.bubbles)}function Wt(t,e){if(e.length===0)return;const n=performance.now()+vt,s=t.sim.snapshot(),o=i=>Rt(s,i);for(const i of e){const a=At(i,o);if(a===null)continue;const r=i.elevator;r!==void 0&&t.bubbles.set(r,{text:a,expiresAt:n})}}function At(t,e){switch(t.kind){case"elevator-assigned":return`Heading to ${e(t.stop)}`;case"elevator-departed":return`Leaving ${e(t.stop)}`;case"elevator-arrived":return`Arrived at ${e(t.stop)}`;case"door-opened":return"Doors open";case"door-closed":return"Doors closed";case"rider-boarded":return"Boarding";case"rider-exited":return`Dropping off at ${e(t.stop)}`;default:return null}}function Rt(t,e){return t.stops.find(s=>s.entity_id===e)?.name??`stop #${e}`}function Lt(t,e){if(!e.phaseLabel)return;const n=t.traffic.currentPhaseLabel();e.phaseLabel.textContent=n||"—"}function Et(t){const e=document.getElementById("phase-label");if(!e)return;const n=t.traffic.currentPhaseLabel();e.textContent!==n&&(e.textContent=n||"—")}function Ft(t){const e=t.paneA;if(!e?.latestMetrics)return;const n=t.paneB;if(n?.latestMetrics){const s=Bt(e.latestMetrics,n.latestMetrics);oe(e.metricsEl,e.latestMetrics,s.a),oe(n.metricsEl,n.latestMetrics,s.b)}else oe(e.metricsEl,e.latestMetrics,null)}function Bt(t,e){const n=(h,f,p,S)=>Math.abs(h-f)<p?["tie","tie"]:(S?h>f:h<f)?["win","lose"]:["lose","win"],[s,o]=n(t.avg_wait_s,e.avg_wait_s,.05,!1),[i,a]=n(t.max_wait_s,e.max_wait_s,.05,!1),[r,c]=n(t.delivered,e.delivered,.5,!0),[d,l]=n(t.abandoned,e.abandoned,.5,!1),[g,m]=n(t.utilization,e.utilization,.005,!0);return{a:{avg_wait_s:s,max_wait_s:i,delivered:r,abandoned:d,utilization:g},b:{avg_wait_s:o,max_wait_s:a,delivered:c,abandoned:l,utilization:m}}}const re=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function Ot(t,e){switch(e){case"avg_wait_s":return`${t.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${t.max_wait_s.toFixed(1)} s`;case"delivered":return String(t.delivered);case"abandoned":return String(t.abandoned);case"utilization":return`${(t.utilization*100).toFixed(0)}%`}}function $t(t){const e=document.createDocumentFragment();for(const[n]of re){const s=document.createElement("div");s.className="metric-row";const o=document.createElement("span");o.className="metric-k",o.textContent=n;const i=document.createElement("span");i.className="metric-v",s.append(o,i),e.appendChild(s)}t.replaceChildren(e)}function oe(t,e,n){const s=t.children;for(let o=0;o<re.length;o++){const i=s[o],a=re[o][1],r=n?n[a]:"";i.dataset.verdict!==r&&(i.dataset.verdict=r);const c=i.lastElementChild,d=Ot(e,a);c.textContent!==d&&(c.textContent=d)}}let ve=0;function E(t,e){t.toast.textContent=e,t.toast.classList.add("show"),window.clearTimeout(ve),ve=window.setTimeout(()=>t.toast.classList.remove("show"),1600)}function Ce(t,e,n,s){const o=B(t.permalink.scenario),i=o.tweakRanges[n],a=D(o,n,t.permalink.overrides),r=Xt(a+s*i.step,i.min,i.max),c=Yt(r,i.min,i.step);Nt(t,e,o,n,c)}function Ht(t,e,n){const s=B(t.permalink.scenario),o={...t.permalink.overrides};delete o[n],t.permalink={...t.permalink,overrides:o},n==="cars"?(P(t,e),E(e,"Cars reset")):(fe(t,e,s),E(e,`${zt(n)} reset`))}async function Dt(t,e){const n=B(t.permalink.scenario),s=de(n,"cars",D(n,"cars",t.permalink.overrides));t.permalink={...t.permalink,overrides:{}},s?await P(t,e):fe(t,e,n),E(e,"Parameters reset")}function Nt(t,e,n,s,o){const i={...t.permalink.overrides,[s]:o};t.permalink={...t.permalink,overrides:Te(n,i)},s==="cars"?P(t,e):fe(t,e,n)}function fe(t,e,n){const s=Ie(n,t.permalink.overrides),o={maxSpeed:s.maxSpeed,weightCapacityKg:s.weightCapacity,doorOpenTicks:s.doorOpenTicks,doorTransitionTicks:s.doorTransitionTicks};let i=!0;J(t,a=>{a.sim.applyPhysicsLive(o)||(i=!1)}),Q(n,t.permalink.overrides,e),i||P(t,e)}function Xt(t,e,n){return Math.min(n,Math.max(e,t))}function Yt(t,e,n){const s=Math.round((t-e)/n);return e+s*n}function zt(t){switch(t){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}Ct();
