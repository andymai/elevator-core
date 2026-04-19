(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&a(s)}).observe(document,{childList:!0,subtree:!0});function n(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(i){if(i.ep)return;i.ep=!0;const o=n(i);fetch(i.href,o)}})();function Fe(t){const e=Math.max(0,Math.min(1,(t-320)/580)),n=(a,i)=>a+(i-a)*e;return{padX:n(8,18),padTop:n(20,26),padBottom:n(30,38),sparkH:n(18,22),labelW:n(44,68),upColW:n(20,28),dnColW:n(20,28),gutterGap:4,carW:n(26,40),carH:n(20,30),fontMain:n(10,12),fontSmall:n(9,10),stopDotR:n(2.2,2.6),carDotR:n(1.8,2.3),dirDotR:n(2.2,2.6)}}const fe={idle:"#5d6271",moving:"#06c2b5",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b90a0",unknown:"#5d6271"},Be="#1f2431",ge="#c8ccd6",Q="#7dd3fc",Z="#fbbf24",ve="#f5f6f9",re="#8b90a0",Oe="#2e3445",$e="#8b90a0",He="rgba(6, 194, 181, 0.85)",De="rgba(6, 194, 181, 0.95)",Ne=260,he=3,Xe=.05,Ye=160;function ze(t,e,n,a,i){const o=(t+n)/2,s=(e+a)/2,r=n-t,c=a-e,l=Math.max(Math.hypot(r,c),1),d=-c/l,g=r/l,h=Math.min(l*.25,22),u=o+d*h,p=s+g*h,f=1-i;return[f*f*t+2*f*i*u+i*i*n,f*f*e+2*f*i*p+i*i*a]}function Ue(t){let o=t;for(let r=0;r<3;r++){const c=1-o,l=3*c*c*o*.2+3*c*o*o*.2+o*o*o,d=3*c*c*.2+6*c*o*(.2-.2)+3*o*o*(1-.2);if(d===0)break;o-=(l-t)/d,o=Math.max(0,Math.min(1,o))}const s=1-o;return 3*s*s*o*.6+3*s*o*o*1+o*o*o}class qe{#e;#t;#n;#o;#a=null;#c=-1;#l=new Map;#p;#s=new Map;#r=new Map;#i=[];#d;constructor(e,n,a="Avg wait (s)"){this.#e=e;const i=e.getContext("2d");if(!i)throw new Error("2D context unavailable");this.#t=i,this.#n=window.devicePixelRatio||1,this.#p=n,this.#d=a,this.#f(),this.#o=()=>this.#f(),window.addEventListener("resize",this.#o)}dispose(){window.removeEventListener("resize",this.#o)}#f(){const{clientWidth:e,clientHeight:n}=this.#e;if(e===0||n===0)return;const a=e*this.#n,i=n*this.#n;(this.#e.width!==a||this.#e.height!==i)&&(this.#e.width=a,this.#e.height=i),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}draw(e,n,a){this.#f();const{clientWidth:i,clientHeight:o}=this.#e;if(this.#t.clearRect(0,0,i,o),e.stops.length===0||i===0||o===0)return;i!==this.#c&&(this.#a=Fe(i),this.#c=i);const s=this.#a;let r=e.stops[0].y,c=e.stops[0].y;for(let m=1;m<e.stops.length;m++){const y=e.stops[m].y;y<r&&(r=y),y>c&&(c=y)}const l=r-1,d=c+1,g=Math.max(d-l,1e-4),h=o-s.padBottom,u=s.padTop,p=m=>h-(m-l)/g*(h-u),f=this.#l;f.forEach(m=>m.length=0);for(const m of e.cars){const y=f.get(m.line);y?y.push(m):f.set(m.line,[m])}const b=[...f.keys()].sort((m,y)=>m-y),_=s.padX+s.labelW+s.upColW+s.dnColW+s.gutterGap,P=Math.max(0,i-_-s.padX),C=b.reduce((m,y)=>m+(f.get(y)?.length??1),0),v=P/Math.max(C,1),S=Math.min(v,Ye),k=S*C,M=Math.max(0,(P-k)/2),x=_+M,F=x+k,T=new Map;let q=0;for(const m of b){const y=f.get(m)??[];for(const X of y)T.set(X.id,x+S*(q+.5)),q++}const G=new Map;e.stops.forEach((m,y)=>G.set(m.entity_id,y)),this.#g(s),this.#h(e,p,s,x,F),this.#u(e,T,p,s,G);for(const[m,y]of T){this.#m(y,u,h,s);const X=e.cars.find(Ee=>Ee.id===m);X&&(this.#S(X,y,p,s),this.#w(X,y,p,s))}this.#y(e,T,p,s,a),this.#k(s),this.#b(n,i,o,s)}#g(e){const n=this.#t,a=e.padX+e.labelW+e.upColW/2,i=e.padX+e.labelW+e.upColW+e.dnColW/2,o=e.padTop/2+1;n.font=`${e.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,n.textBaseline="middle",n.textAlign="center",n.fillStyle=Q,n.fillText("▲",a,o),n.fillStyle=Z,n.fillText("▼",i,o)}#h(e,n,a,i,o){const s=this.#t;s.font=`${a.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,s.textBaseline="middle";const r=a.padX,c=a.padX+a.labelW,l=c+a.upColW;for(const d of e.stops){const g=n(d.y);s.strokeStyle=Be,s.lineWidth=1,s.beginPath(),s.moveTo(i,g),s.lineTo(o,g),s.stroke(),s.fillStyle=ge,s.textAlign="left",s.fillText(Ke(s,d.name,a.labelW-2),r,g),d.waiting_up>0&&me(s,c,g,a.upColW,a.dirDotR,d.waiting_up,Q,a.fontSmall),d.waiting_down>0&&me(s,l,g,a.dnColW,a.dirDotR,d.waiting_down,Z,a.fontSmall)}}#m(e,n,a,i){const o=this.#t,s=o.createLinearGradient(e,n,e,a);s.addColorStop(0,"rgba(39, 45, 58, 0)"),s.addColorStop(.5,"rgba(39, 45, 58, 0.9)"),s.addColorStop(1,"rgba(39, 45, 58, 0)"),o.strokeStyle=s,o.lineWidth=1,o.beginPath(),o.moveTo(e,n),o.lineTo(e,a),o.stroke()}#u(e,n,a,i,o){const s=this.#t,r=.75+.2*Math.sin(performance.now()*.005),c=i.carDotR*5.2,l=i.carDotR*3.4;for(const d of e.cars){if(d.target==null)continue;const g=o.get(d.target);if(g==null)continue;const h=e.stops[g],u=n.get(d.id);if(u==null)continue;const p=a(h.y);s.strokeStyle=`rgba(6, 194, 181, ${r})`,s.lineWidth=2,s.beginPath(),s.arc(u,p,c,0,Math.PI*2),s.stroke(),s.strokeStyle=He,s.lineWidth=1,s.beginPath(),s.arc(u,p,l,0,Math.PI*2),s.stroke(),s.fillStyle=De,s.beginPath(),s.arc(u,p,i.carDotR*1.1,0,Math.PI*2),s.fill()}}#S(e,n,a,i){if(e.phase!=="moving"||Math.abs(e.v)<.1)return;const o=this.#t,s=fe[e.phase],r=i.carW/2,c=i.carH/2;for(let l=1;l<=he;l++){const d=a(e.y-e.v*Xe*l),g=.18*(1-(l-1)/he);o.fillStyle=Se(s,g),o.fillRect(n-r,d-c,i.carW,i.carH)}}#w(e,n,a,i){const o=this.#t,s=a(e.y),r=i.carW/2,c=i.carH/2,l=fe[e.phase]??"#5d6271",d=o.createLinearGradient(n,s-c,n,s+c);d.addColorStop(0,ue(l,.14)),d.addColorStop(1,ue(l,-.18)),o.fillStyle=d,o.fillRect(n-r,s-c,i.carW,i.carH),o.strokeStyle="rgba(10, 12, 16, 0.9)",o.lineWidth=1,o.strokeRect(n-r+.5,s-c+.5,i.carW-1,i.carH-1);const g=e.capacity>0?Math.min(e.load/e.capacity,1):0;if(g>0){const h=(i.carH-4)*g;o.fillStyle="rgba(10, 12, 16, 0.35)",o.fillRect(n-r+2,s+c-2-h,i.carW-4,h)}e.riders>0&&Ge(o,n,s,i.carW,i.carH,i.carDotR,e.riders,i.fontSmall)}#y(e,n,a,i,o){const s=performance.now(),r=Math.max(1,o),c=Ne/r,l=30/r,d=i.padX+i.labelW,g=d+i.upColW,h=new Map,u=[];for(const p of e.cars){const f=this.#s.get(p.id),b=p.riders,_=n.get(p.id);let P=null,C=1/0;for(let S=0;S<e.stops.length;S++){const k=Math.abs(e.stops[S].y-p.y);k<C&&(C=k,P=S)}const v=p.phase==="loading"&&C<.5?P:null;if(f&&_!=null&&v!=null){const S=b-f.riders;if(S>0){const k=e.stops[v];h.set(k.entity_id,(h.get(k.entity_id)??0)+S)}if(S!==0){const k=e.stops[v],M=a(k.y),x=a(p.y),F=Math.min(Math.abs(S),6);if(S>0){const T=k.waiting_up>=k.waiting_down,q=T?d+i.upColW/2:g+i.dnColW/2,G=T?Q:Z;for(let m=0;m<F;m++)u.push(()=>this.#i.push({kind:"board",bornAt:s+m*l,duration:c,startX:q,startY:M,endX:_,endY:x,color:G}))}else for(let T=0;T<F;T++)u.push(()=>this.#i.push({kind:"alight",bornAt:s+T*l,duration:c,startX:_,startY:x,endX:_+18,endY:x+10,color:ve}))}}this.#s.set(p.id,{riders:b})}for(const p of e.stops){const f=p.waiting_up+p.waiting_down,b=this.#r.get(p.entity_id);if(b){const _=b.waiting-f,P=h.get(p.entity_id)??0,C=Math.max(0,_-P);if(C>0){const v=a(p.y),S=d+i.upColW/2,k=Math.min(C,4);for(let M=0;M<k;M++)this.#i.push({kind:"abandon",bornAt:s+M*l,duration:c*1.5,startX:S,startY:v,endX:S-26,endY:v-6,color:re})}}this.#r.set(p.entity_id,{waiting:f})}for(const p of u)p();for(let p=this.#i.length-1;p>=0;p--){const f=this.#i[p];s-f.bornAt>f.duration&&this.#i.splice(p,1)}if(this.#s.size>e.cars.length){const p=new Set(e.cars.map(f=>f.id));for(const f of this.#s.keys())p.has(f)||this.#s.delete(f)}if(this.#r.size>e.stops.length){const p=new Set(e.stops.map(f=>f.entity_id));for(const f of this.#r.keys())p.has(f)||this.#r.delete(f)}}#k(e){const n=performance.now(),a=this.#t;for(const i of this.#i){const o=n-i.bornAt;if(o<0)continue;const s=Math.min(1,Math.max(0,o/i.duration)),r=Ue(s),[c,l]=i.kind==="board"?ze(i.startX,i.startY,i.endX,i.endY,r):[i.startX+(i.endX-i.startX)*r,i.startY+(i.endY-i.startY)*r],d=i.kind==="board"?.9:i.kind==="abandon"?(1-r)**1.5:1-r,g=i.kind==="abandon"?e.carDotR*.85:e.carDotR;a.fillStyle=Se(i.color,d),a.beginPath(),a.arc(c,l,g,0,Math.PI*2),a.fill()}}#b(e,n,a,i){const o=this.#t,s=a-i.padBottom+(i.padBottom-i.sparkH)/2,r=s+i.sparkH,c=i.padX,l=n-i.padX,d=Math.max(l-c,1);if(o.font=`${i.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,o.textBaseline="top",o.fillStyle=$e,o.textAlign="left",o.fillText(this.#d,c,s-1),e.length===0)return;const g=e[e.length-1];if(o.fillStyle=ge,o.textAlign="right",o.fillText(g.toFixed(1),l,s-1),e.length<2)return;const h=Math.max(1,...e),u=d/Math.max(e.length-1,1),p=f=>r-f/h*(r-s);o.strokeStyle=Oe,o.lineWidth=1,o.beginPath(),o.moveTo(c,r),o.lineTo(l,r),o.stroke(),o.strokeStyle=this.#p,o.lineWidth=1.4,o.beginPath();for(let f=0;f<e.length;f++){const b=c+f*u,_=p(e[f]);f===0?o.moveTo(b,_):o.lineTo(b,_)}o.stroke()}get canvas(){return this.#e}}function me(t,e,n,a,i,o,s,r){const c=i*2+1.2,l=Math.max(1,Math.floor((a-10)/c)),d=Math.min(o,l);t.fillStyle=s;for(let g=0;g<d;g++){const h=e+i+g*c;t.beginPath(),t.arc(h,n,i,0,Math.PI*2),t.fill()}o>d&&(t.fillStyle=re,t.font=`${r.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,t.textAlign="left",t.textBaseline="middle",t.fillText(`+${o-d}`,e+i+d*c,n))}function Ge(t,e,n,a,i,o,s,r){const d=a-6,g=i-6,h=o*2+1.2,u=Math.max(1,Math.floor(d/h)),p=Math.max(1,Math.floor(g/h)),f=u*p,b=Math.min(s,f),_=s-b,P=e-a/2+3+o,C=n-i/2+3+o;t.fillStyle=ve;const v=_>0?b-1:b;for(let S=0;S<v;S++){const k=S%u,M=Math.floor(S/u),x=P+k*h,F=C+M*h;t.beginPath(),t.arc(x,F,o,0,Math.PI*2),t.fill()}if(_>0){t.fillStyle=re,t.font=`${r.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,t.textAlign="center",t.textBaseline="middle";const S=v,k=S%u,M=Math.floor(S/u),x=P+k*h,F=C+M*h;t.fillText(`+${s-v}`,x,F)}}function ue(t,e){const n=t.match(/^#?([0-9a-f]{6})$/i);if(!n)return t;const a=parseInt(n[1],16),i=a>>16&255,o=a>>8&255,s=a&255,r=c=>e>=0?Math.round(c+(255-c)*e):Math.round(c*(1+e));return`rgb(${r(i)}, ${r(o)}, ${r(s)})`}function Se(t,e){const n=t.match(/^#?([0-9a-f]{6})$/i);if(!n)return t;const a=parseInt(n[1],16),i=a>>16&255,o=a>>8&255,s=a&255;return`rgba(${i}, ${o}, ${s}, ${e})`}function Ke(t,e,n){if(t.measureText(e).width<=n)return e;const a="…";let i=0,o=e.length;for(;i<o;){const s=i+o+1>>1;t.measureText(e.slice(0,s)+a).width<=n?i=s:o=s-1}return i===0?a:e.slice(0,i)+a}function H(t,e,n){const a=ce(t,e),i=n[e];if(i===void 0||!Number.isFinite(i))return a;const o=t.tweakRanges[e];return Ie(i,o.min,o.max)}function ce(t,e){const n=t.elevatorDefaults;switch(e){case"cars":return t.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return xe(n.doorOpenTicks,n.doorTransitionTicks)}}function le(t,e,n){const a=ce(t,e),i=t.tweakRanges[e].step/2;return Math.abs(n-a)>i}function Me(t,e){const n={};for(const a of z){const i=e[a];i!==void 0&&le(t,a,i)&&(n[a]=i)}return n}const z=["cars","maxSpeed","weightCapacity","doorCycleSec"];function Ve(t,e){const{doorOpenTicks:n,doorTransitionTicks:a}=t.elevatorDefaults,i=xe(n,a),o=Ie(n/(i*V),.1,.9),s=Math.max(2,Math.round(e*V)),r=Math.max(1,Math.round(s*o)),c=Math.max(1,Math.round((s-r)/2));return{openTicks:r,transitionTicks:c}}function xe(t,e){return(t+2*e)/V}function Te(t,e){const n=t.elevatorDefaults,a=H(t,"maxSpeed",e),i=H(t,"weightCapacity",e),o=H(t,"doorCycleSec",e),{openTicks:s,transitionTicks:r}=Ve(t,o);return{...n,maxSpeed:a,weightCapacity:i,doorOpenTicks:s,doorTransitionTicks:r}}function je(t,e){if(t<1||e<1)return[];const n=[];for(let a=0;a<e;a+=1)n.push(Math.min(t-1,Math.floor(a*t/e)));return n}function Je(t,e){const n=Math.round(H(t,"cars",e)),a=Te(t,e),i=je(t.stops.length,n),o=t.stops.map((r,c)=>`        StopConfig(id: StopId(${c}), name: ${ie(r.name)}, position: ${L(r.positionM)}),`).join(`
`),s=i.map((r,c)=>Ze(c,a,r,Qe(c,n))).join(`
`);return`SimConfig(
    building: BuildingConfig(
        name: ${ie(t.buildingName)},
        stops: [
${o}
        ],
    ),
    elevators: [
${s}
    ],
    simulation: SimulationParams(ticks_per_second: ${L(V)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${t.passengerMeanIntervalTicks},
        weight_range: (${L(t.passengerWeightRange[0])}, ${L(t.passengerWeightRange[1])}),
    ),
)`}const V=60;function Ie(t,e,n){return Math.min(n,Math.max(e,t))}function Qe(t,e){return e>=3?`Car ${String.fromCharCode(65+t)}`:`Car ${t+1}`}function Ze(t,e,n,a){const i=e.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${L(e.bypassLoadUpPct)}),`:"",o=e.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${L(e.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${t}, name: ${ie(a)},
            max_speed: ${L(e.maxSpeed)}, acceleration: ${L(e.acceleration)}, deceleration: ${L(e.deceleration)},
            weight_capacity: ${L(e.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${e.doorOpenTicks}, door_transition_ticks: ${e.doorTransitionTicks},${i}${o}
        ),`}function ie(t){if(/[\\"\n]/.test(t))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(t)}`);return`"${t}"`}function L(t){return Number.isInteger(t)?`${t}.0`:String(t)}const Pe={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},$={scenario:"skyscraper-sky-lobby",strategyA:"etd",strategyB:"scan",compare:!0,seed:42,intensity:1,speed:2,overrides:{}},et=["scan","look","nearest","etd","destination"];function we(t,e){return t!==null&&et.includes(t)?t:e}function tt(t){const e=new URLSearchParams;e.set("s",t.scenario),e.set("a",t.strategyA),e.set("b",t.strategyB),t.compare&&e.set("c","1"),e.set("k",String(t.seed)),e.set("i",String(t.intensity)),e.set("x",String(t.speed));for(const n of z){const a=t.overrides[n];a!==void 0&&Number.isFinite(a)&&e.set(Pe[n],it(a))}return`?${e.toString()}`}function nt(t){const e=new URLSearchParams(t),n={};for(const a of z){const i=e.get(Pe[a]);if(i===null)continue;const o=Number(i);Number.isFinite(o)&&(n[a]=o)}return{scenario:e.get("s")??$.scenario,strategyA:we(e.get("a")??e.get("d"),$.strategyA),strategyB:we(e.get("b"),$.strategyB),compare:e.get("c")==="1",seed:ee(e.get("k"),$.seed),intensity:ee(e.get("i"),$.intensity),speed:ee(e.get("x"),$.speed),overrides:n}}function ee(t,e){if(t===null)return e;const n=Number(t);return Number.isFinite(n)?n:e}function it(t){return Number.isInteger(t)?String(t):Number(t.toFixed(2)).toString()}const U={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function w(t){return Array.from({length:t},()=>1)}function oe(t){return Array.from({length:t},(e,n)=>n===0?1:0)}function N(t){return Array.from({length:t},(e,n)=>1+n/Math.max(1,t-1)*.5)}const O=6,ot=[{name:"Overnight",durationSec:45,ridersPerMin:3,originWeights:w(O),destWeights:w(O)},{name:"Morning rush",durationSec:60,ridersPerMin:30,originWeights:[8.5,.3,.3,.3,.3,.3],destWeights:N(O).map((t,e)=>e===0?0:t)},{name:"Midday interfloor",durationSec:60,ridersPerMin:16,originWeights:w(O),destWeights:w(O)},{name:"Lunchtime",durationSec:45,ridersPerMin:36,originWeights:[.3,3,2,2,2,2],destWeights:[.3,3,2,2,2,2]},{name:"Evening exodus",durationSec:60,ridersPerMin:30,originWeights:N(O).map((t,e)=>e===0?0:t),destWeights:oe(O)}],at={id:"office-mid-rise",label:"Mid-rise office",description:"Six floors, two 800 kg cars. Walks through morning rush → midday → lunchtime → evening exodus. Group-time ETD damps tail waits under sustained load.",defaultStrategy:"etd",phases:ot,seedSpawns:0,abandonAfterSec:90,hook:{kind:"etd_group_time",waitSquaredWeight:.002},featureHint:"Group-time ETD (`wait_squared_weight = 0.002`) — stops hosting older waiters win ties, damping long-wait tail during lunchtime bursts.",buildingName:"Mid-Rise Office",stops:[{name:"Lobby",positionM:0},{name:"Floor 2",positionM:4},{name:"Floor 3",positionM:8},{name:"Floor 4",positionM:12},{name:"Floor 5",positionM:16},{name:"Floor 6",positionM:20}],defaultCars:2,elevatorDefaults:{maxSpeed:2.2,acceleration:1.5,deceleration:2,weightCapacity:800,doorOpenTicks:210,doorTransitionTicks:60},tweakRanges:U,passengerMeanIntervalTicks:90,passengerWeightRange:[50,100],ron:`SimConfig(
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
)`},W=13,st=[{name:"Overnight",durationSec:45,ridersPerMin:6,originWeights:w(W),destWeights:w(W)},{name:"Morning rush",durationSec:75,ridersPerMin:20,originWeights:[14,...Array.from({length:W-1},()=>.25)],destWeights:[0,...N(W-1)]},{name:"Midday interfloor",durationSec:60,ridersPerMin:13,originWeights:w(W),destWeights:w(W)},{name:"Lunchtime",durationSec:45,ridersPerMin:17,originWeights:Array.from({length:W},(t,e)=>e===6?3:1),destWeights:Array.from({length:W},(t,e)=>e===6?4:1)},{name:"Evening exodus",durationSec:75,ridersPerMin:18,originWeights:[0,...N(W-1)],destWeights:[14,...Array.from({length:W-1},()=>.25)]}],rt={id:"skyscraper-sky-lobby",label:"Skyscraper (sky lobby)",description:"Twelve floors, three cars. Morning rush saturates two cars fast — the third's full-load bypass (80 %/50 %) stops it from detouring for upward hall calls it can't serve.",defaultStrategy:"etd",phases:st,seedSpawns:0,abandonAfterSec:180,hook:{kind:"bypass_narration"},featureHint:"Direction-dependent bypass (80 % up / 50 % down) on all three cars — baked into the RON below. Watch the fullest car skip hall calls.",buildingName:"Skyscraper (Sky Lobby)",stops:[{name:"Lobby",positionM:0},{name:"Floor 2",positionM:4},{name:"Floor 3",positionM:8},{name:"Floor 4",positionM:12},{name:"Floor 5",positionM:16},{name:"Floor 6",positionM:20},{name:"Sky Lobby",positionM:24},{name:"Floor 8",positionM:28},{name:"Floor 9",positionM:32},{name:"Floor 10",positionM:36},{name:"Floor 11",positionM:40},{name:"Floor 12",positionM:44},{name:"Penthouse",positionM:48}],defaultCars:3,elevatorDefaults:{maxSpeed:4,acceleration:2,deceleration:2.5,weightCapacity:1200,doorOpenTicks:300,doorTransitionTicks:72,bypassLoadUpPct:.8,bypassLoadDownPct:.5},tweakRanges:U,passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},A=8,ct=[{name:"Overnight",durationSec:60,ridersPerMin:3,originWeights:w(A),destWeights:w(A)},{name:"Morning exodus",durationSec:75,ridersPerMin:35,originWeights:[0,...N(A-1)],destWeights:oe(A)},{name:"Midday quiet",durationSec:60,ridersPerMin:7,originWeights:w(A),destWeights:w(A)},{name:"Afternoon drift",durationSec:45,ridersPerMin:14,originWeights:Array.from({length:A},(t,e)=>e===0?3:1),destWeights:w(A)},{name:"Evening return",durationSec:60,ridersPerMin:30,originWeights:oe(A),destWeights:[0,...N(A-1)]}],lt={id:"residential-tower",label:"Residential tower",description:"Eight floors, two cars. Asymmetric day: morning exodus, quiet midday, evening return. Predictive parking anticipates the next peak by the arrival-log rate signal.",defaultStrategy:"etd",phases:ct,seedSpawns:0,abandonAfterSec:180,hook:{kind:"predictive_parking",windowTicks:9e3},featureHint:"Predictive parking with a 2.5-min window — during the midday slump, idle cars pre-position toward the floors that spiked most recently.",buildingName:"Residential Tower",stops:[{name:"Lobby",positionM:0},{name:"Floor 2",positionM:3.5},{name:"Floor 3",positionM:7},{name:"Floor 4",positionM:10.5},{name:"Floor 5",positionM:14},{name:"Floor 6",positionM:17.5},{name:"Floor 7",positionM:21},{name:"Penthouse",positionM:24.5}],defaultCars:2,elevatorDefaults:{maxSpeed:2.5,acceleration:1.6,deceleration:2.2,weightCapacity:700,doorOpenTicks:180,doorTransitionTicks:60},tweakRanges:U,passengerMeanIntervalTicks:75,passengerWeightRange:[50,95],ron:`SimConfig(
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
)`},R=10,dt=[{name:"Overnight",durationSec:45,ridersPerMin:3,originWeights:w(R),destWeights:w(R)},{name:"Check-out rush",durationSec:60,ridersPerMin:32,originWeights:[0,.5,...Array.from({length:R-2},()=>1)],destWeights:[5,2,...Array.from({length:R-2},()=>.3)]},{name:"Daytime",durationSec:75,ridersPerMin:15,originWeights:w(R),destWeights:w(R)},{name:"Check-in rush",durationSec:60,ridersPerMin:28,originWeights:[4,1,...Array.from({length:R-2},()=>.3)],destWeights:[0,.5,...Array.from({length:R-2},()=>1)]},{name:"Late night",durationSec:60,ridersPerMin:10,originWeights:[2,2,...Array.from({length:R-2},()=>.5)],destWeights:[.5,.5,...Array.from({length:R-2},()=>1)]}],pt={id:"hotel-24-7",label:"Hotel 24/7",description:"Ten floors, three cars in DCS mode. Low-rate baseline with check-in / check-out bumps; deferred commitment reallocates assignments while cars are still far from the rider's origin.",defaultStrategy:"destination",phases:dt,seedSpawns:0,abandonAfterSec:150,hook:{kind:"deferred_dcs",commitmentWindowTicks:180},featureHint:"Deferred DCS with a 3-s (180-tick) commitment window — sticky assignments keep re-competing until a car is close to the rider, yielding better matches under bursty demand.",buildingName:"Hotel 24/7",stops:[{name:"Lobby",positionM:0},{name:"Restaurant",positionM:3.5},{name:"Floor 3",positionM:7},{name:"Floor 4",positionM:10.5},{name:"Floor 5",positionM:14},{name:"Floor 6",positionM:17.5},{name:"Floor 7",positionM:21},{name:"Floor 8",positionM:24.5},{name:"Floor 9",positionM:28},{name:"Penthouse",positionM:31.5}],defaultCars:3,elevatorDefaults:{maxSpeed:3,acceleration:1.8,deceleration:2.3,weightCapacity:900,doorOpenTicks:240,doorTransitionTicks:60},tweakRanges:U,passengerMeanIntervalTicks:120,passengerWeightRange:[50,95],ron:`SimConfig(
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
)`},D=5,ft=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:D},(t,e)=>e===D-1?8:1),destWeights:[5,2,1,1,0]},{name:"Tapering",durationSec:90,ridersPerMin:18,originWeights:w(D),destWeights:w(D)},{name:"Between sessions",durationSec:135,ridersPerMin:4,originWeights:w(D),destWeights:w(D)}],gt={id:"convention-burst",label:"Convention burst",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:ft,seedSpawns:120,hook:{kind:"arrival_log"},featureHint:"Arrival-rate signal lights up as the burst hits — `DispatchManifest::arrivals_at` feeds downstream strategies the per-stop intensity for the next 5 minutes.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:2,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...U,cars:{min:1,max:5,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},ht={id:"space-elevator",label:"Space elevator",description:"Two stops 1,000 km apart. Same engine, different scale — no traffic patterns really apply; it's a showpiece for the trapezoidal-motion primitives.",defaultStrategy:"scan",phases:[{name:"Scheduled climb",durationSec:300,ridersPerMin:4,originWeights:[1,1],destWeights:[1,1]}],seedSpawns:0,hook:{kind:"none"},featureHint:"No controller feature to showcase — this scenario exists to demonstrate that the engine is topology-agnostic.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Orbital Platform",positionM:1e3}],defaultCars:1,elevatorDefaults:{maxSpeed:50,acceleration:10,deceleration:15,weightCapacity:1e4,doorOpenTicks:120,doorTransitionTicks:30},tweakRanges:{cars:{min:1,max:1,step:1},maxSpeed:{min:5,max:100,step:5},weightCapacity:{min:1e3,max:2e4,step:1e3},doorCycleSec:{min:2,max:8,step:.5}},passengerMeanIntervalTicks:900,passengerWeightRange:[60,90],ron:`SimConfig(
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
)`},ae=[at,rt,lt,pt,gt,ht];function B(t){return ae.find(e=>e.id===t)??ae[0]}let te=null;async function mt(){if(!te){const t=new URL("pkg/elevator_wasm.js",document.baseURI).href,e=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;te=import(t).then(async n=>(await n.default(e),n))}return te}class de{#e;#t;constructor(e){this.#e=e,this.#t=e.dt()}static async create(e,n){const a=await mt();return new de(new a.WasmSim(e,n))}step(e){this.#e.stepMany(e),this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}setStrategy(e){return this.#e.setStrategy(e)}spawnRider(e,n,a,i){this.#e.spawnRider(e,n,a,i)}setTrafficRate(e){this.#e.setTrafficRate(e)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(e){return this.#e.waitingCountAt(e)}applyPhysicsLive(e){const n=this.#e;if(!n.setMaxSpeedAll||!n.setWeightCapacityAll||!n.setDoorOpenTicksAll||!n.setDoorTransitionTicksAll)return!1;try{return n.setMaxSpeedAll(e.maxSpeed),n.setWeightCapacityAll(e.weightCapacityKg),n.setDoorOpenTicksAll(e.doorOpenTicks),n.setDoorTransitionTicksAll(e.doorTransitionTicks),!0}catch{return!1}}applyHook(e){const n=this.#e;switch(e.kind){case"none":case"arrival_log":case"bypass_narration":return;case"etd_group_time":n.setEtdWithWaitSquaredWeight?.(e.waitSquaredWeight);return;case"deferred_dcs":n.setHallCallModeDestination?.(),n.setDcsWithCommitmentWindow?.(BigInt(e.commitmentWindowTicks));return;case"predictive_parking":n.setRepositionPredictiveParking?.(BigInt(e.windowTicks));return}}dispose(){this.#e.free()}}class We{#e;#t=0;#n=[];#o=0;#a=0;#c=1;#l=0;constructor(e){this.#e=ut(BigInt(e>>>0))}setPhases(e){this.#n=e,this.#o=e.reduce((n,a)=>n+a.durationSec,0),this.#a=0,this.#t=0}setIntensity(e){this.#c=Math.max(0,e)}setPatienceTicks(e){this.#l=Math.max(0,Math.floor(e))}drainSpawns(e,n){if(e.stops.length<2||this.#n.length===0)return[];const a=Math.min(n,4/60),i=this.#n[this.currentPhaseIndex()];this.#t+=i.ridersPerMin*this.#c/60*a,this.#a=(this.#a+a)%(this.#o||1);const o=[];for(;this.#t>=1;)this.#t-=1,o.push(this.#p(e,i));return o}currentPhaseIndex(){if(this.#n.length===0)return 0;let e=this.#a;for(let n=0;n<this.#n.length;n+=1)if(e-=this.#n[n].durationSec,e<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#o<=0?0:Math.min(1,this.#a/this.#o)}phases(){return this.#n}#p(e,n){const a=e.stops,i=this.#s(a.length,n.originWeights);let o=this.#s(a.length,n.destWeights);o===i&&(o=(o+1)%a.length);const s=50+this.#d()*50;return{originStopId:a[i].stop_id,destStopId:a[o].stop_id,weight:s,patienceTicks:this.#l>0?this.#l:void 0}}#s(e,n){if(!n||n.length!==e)return this.#i(e);let a=0;for(let o=0;o<e;o+=1)a+=Math.max(0,n[o]);if(a<=0)return this.#i(e);let i=this.#d()*a;for(let o=0;o<e;o+=1)if(i-=Math.max(0,n[o]),i<0)return o;return e-1}#r(){let e=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return e=(e^e>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,e=(e^e>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,e^e>>31n}#i(e){return Number(this.#r()%BigInt(e))}#d(){return Number(this.#r()>>11n)/2**53}}function ut(t){let e=t+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return e=(e^e>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,e=(e^e>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,e^e>>31n}const St=["scan","look","nearest","etd","destination"],Y={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS"},wt=120,yt="#7dd3fc",kt="#fda4af",Ae=t=>`${t}×`,Re=t=>`${t.toFixed(1)}×`;async function bt(){const t=Ct(),e={...$,...nt(window.location.search)};_t(e);const n=B(e.scenario);e.overrides=Me(n,e.overrides),vt(e,t);const a={running:!0,ready:!1,permalink:e,paneA:null,paneB:null,traffic:new We(e.seed),lastFrameTime:performance.now(),initToken:0};Mt(a,t),await I(a,t),a.ready=!0,xt(a)}function _t(t){const e=B(t.scenario);t.scenario=e.id}function Ct(){const t=s=>{const r=document.getElementById(s);if(!r)throw new Error(`missing element #${s}`);return r},e=s=>document.getElementById(s)??null,n=(s,r)=>({root:t(`pane-${s}`),canvas:t(`shaft-${s}`),name:t(`name-${s}`),metrics:t(`metrics-${s}`),accent:r}),a=s=>{const r=document.querySelector(`.tweak-row[data-key="${s}"]`);if(!r)throw new Error(`missing tweak row for ${s}`);const c=l=>{const d=r.querySelector(l);if(!d)throw new Error(`missing ${l} in tweak row ${s}`);return d};return{root:r,value:c(".tweak-value"),defaultV:c(".tweak-default-v"),dec:c(".tweak-dec"),inc:c(".tweak-inc"),reset:c(".tweak-reset")}},i={cars:a("cars"),maxSpeed:a("maxSpeed"),weightCapacity:a("weightCapacity"),doorCycleSec:a("doorCycleSec")},o={scenarioSelect:t("scenario"),strategyASelect:t("strategy-a"),strategyBSelect:t("strategy-b"),compareToggle:t("compare"),strategyBWrap:t("strategy-b-wrap"),seedInput:t("seed"),speedInput:t("speed"),speedLabel:t("speed-label"),intensityInput:t("traffic"),intensityLabel:t("traffic-label"),playBtn:t("play"),resetBtn:t("reset"),shareBtn:t("share"),tweakBtn:t("tweak"),tweakPanel:t("tweak-panel"),tweakResetAllBtn:t("tweak-reset-all"),tweakRows:i,layout:t("layout"),loader:t("loader"),toast:t("toast"),phaseLabel:e("phase-label"),featureHint:e("feature-hint"),paneA:n("a",yt),paneB:n("b",kt)};for(const s of ae){const r=document.createElement("option");r.value=s.id,r.textContent=s.label,r.title=s.description,o.scenarioSelect.appendChild(r)}for(const s of St)for(const r of[o.strategyASelect,o.strategyBSelect]){const c=document.createElement("option");c.value=s,c.textContent=Y[s],r.appendChild(c)}return o.intensityInput.min="0.5",o.intensityInput.max="2",o.intensityInput.step="0.1",o}function vt(t,e){e.scenarioSelect.value=t.scenario,e.strategyASelect.value=t.strategyA,e.strategyBSelect.value=t.strategyB,e.compareToggle.checked=t.compare,e.strategyBWrap.classList.toggle("hidden",!t.compare),e.layout.dataset.mode=t.compare?"compare":"single",e.seedInput.value=String(t.seed),e.speedInput.value=String(t.speed),e.speedLabel.textContent=Ae(t.speed),e.intensityInput.value=String(t.intensity),e.intensityLabel.textContent=Re(t.intensity);const n=B(t.scenario);e.featureHint&&(e.featureHint.textContent=n.featureHint),Object.keys(t.overrides).length>0&&Le(e,!0),J(n,t.overrides,e)}function ye(t,e){switch(t){case"cars":return String(Math.round(e));case"weightCapacity":return String(Math.round(e));case"maxSpeed":case"doorCycleSec":return e.toFixed(1)}}function J(t,e,n){let a=!1;for(const i of z){const o=n.tweakRows[i],s=t.tweakRanges[i],r=H(t,i,e),c=ce(t,i),l=le(t,i,r);l&&(a=!0),o.value.textContent=ye(i,r),o.defaultV.textContent=ye(i,c),o.dec.disabled=r<=s.min+1e-9,o.inc.disabled=r>=s.max-1e-9,o.root.dataset.overridden=String(l),o.reset.hidden=!l}n.tweakResetAllBtn.hidden=!a}function Le(t,e){t.tweakBtn.setAttribute("aria-expanded",e?"true":"false"),t.tweakPanel.hidden=!e}function j(t,e){t.paneA&&e(t.paneA),t.paneB&&e(t.paneB)}function K(t){t?.sim.dispose(),t?.renderer.dispose()}async function ke(t,e,n,a){const i=Je(n,a),o=await de.create(i,e);o.applyHook(n.hook);const s=new qe(t.canvas,t.accent);return t.name.textContent=Y[e],Rt(t.metrics),{strategy:e,sim:o,renderer:s,metricsEl:t.metrics,waitHistory:[],latestMetrics:null}}async function I(t,e){const n=++t.initToken;e.loader.classList.add("show");const a=B(t.permalink.scenario);t.traffic=new We(t.permalink.seed),t.traffic.setPhases(a.phases),t.traffic.setIntensity(t.permalink.intensity),t.traffic.setPatienceTicks(a.abandonAfterSec?Math.round(a.abandonAfterSec*60):0),K(t.paneA),K(t.paneB),t.paneA=null,t.paneB=null;try{const i=await ke(e.paneA,t.permalink.strategyA,a,t.permalink.overrides);if(n!==t.initToken){K(i);return}if(t.paneA=i,t.permalink.compare){const o=await ke(e.paneB,t.permalink.strategyB,a,t.permalink.overrides);if(n!==t.initToken){K(o);return}t.paneB=o}if(a.seedSpawns>0){const o=t.paneA.sim.snapshot();for(let s=0;s<a.seedSpawns;s+=1){const r=t.traffic.drainSpawns(o,.0033333333333333335);for(const c of r)j(t,l=>l.sim.spawnRider(c.originStopId,c.destStopId,c.weight,c.patienceTicks));if(r.length===0)break}}e.featureHint&&(e.featureHint.textContent=a.featureHint),Tt(t,e),J(a,t.permalink.overrides,e)}catch(i){throw n===t.initToken&&E(e,`Init failed: ${i.message}`),i}finally{n===t.initToken&&e.loader.classList.remove("show")}}function Mt(t,e){e.scenarioSelect.addEventListener("change",async()=>{const n=B(e.scenarioSelect.value),a=t.permalink.compare?t.permalink.strategyA:n.defaultStrategy;t.permalink={...t.permalink,scenario:n.id,strategyA:a,overrides:{}},e.strategyASelect.value=a,await I(t,e),J(n,t.permalink.overrides,e),E(e,`${n.label} · ${Y[a]}`)}),e.strategyASelect.addEventListener("change",async()=>{t.permalink={...t.permalink,strategyA:e.strategyASelect.value},await I(t,e),E(e,`A: ${Y[t.permalink.strategyA]}`)}),e.strategyBSelect.addEventListener("change",async()=>{t.permalink={...t.permalink,strategyB:e.strategyBSelect.value},t.permalink.compare&&(await I(t,e),E(e,`B: ${Y[t.permalink.strategyB]}`))}),e.compareToggle.addEventListener("change",async()=>{t.permalink={...t.permalink,compare:e.compareToggle.checked},e.strategyBWrap.classList.toggle("hidden",!t.permalink.compare),e.layout.dataset.mode=t.permalink.compare?"compare":"single",await I(t,e),E(e,t.permalink.compare?"Compare on":"Compare off")}),e.seedInput.addEventListener("change",async()=>{const n=Number(e.seedInput.value);Number.isFinite(n)&&(t.permalink={...t.permalink,seed:n},await I(t,e))}),e.speedInput.addEventListener("input",()=>{const n=Number(e.speedInput.value);t.permalink.speed=n,e.speedLabel.textContent=Ae(n)}),e.intensityInput.addEventListener("input",()=>{const n=Number(e.intensityInput.value);t.permalink.intensity=n,t.traffic.setIntensity(n),e.intensityLabel.textContent=Re(n)}),e.playBtn.addEventListener("click",()=>{t.running=!t.running,e.playBtn.textContent=t.running?"Pause":"Play"}),e.resetBtn.addEventListener("click",()=>{I(t,e),E(e,"Reset")}),e.tweakBtn.addEventListener("click",()=>{const n=e.tweakBtn.getAttribute("aria-expanded")!=="true";Le(e,n)});for(const n of z){const a=e.tweakRows[n];a.dec.addEventListener("click",()=>Ce(t,e,n,-1)),a.inc.addEventListener("click",()=>Ce(t,e,n,1)),a.reset.addEventListener("click",()=>Lt(t,e,n))}e.tweakResetAllBtn.addEventListener("click",()=>{Et(t,e)}),e.shareBtn.addEventListener("click",async()=>{const n=tt(t.permalink),a=`${window.location.origin}${window.location.pathname}${n}`;window.history.replaceState(null,"",n),await navigator.clipboard.writeText(a).catch(()=>{}),E(e,"Permalink copied")})}function xt(t){let e=0;const n=()=>{const a=performance.now(),i=(a-t.lastFrameTime)/1e3;if(t.lastFrameTime=a,t.running&&t.ready&&t.paneA){const o=t.permalink.speed;j(t,d=>d.sim.step(o));const s=t.paneA.sim.snapshot(),r=i*o,c=t.traffic.drainSpawns(s,r);for(const d of c)j(t,g=>g.sim.spawnRider(d.originStopId,d.destStopId,d.weight,d.patienceTicks));const l=t.permalink.speed;be(t.paneA,t.paneA.sim.snapshot(),l),t.paneB&&be(t.paneB,t.paneB.sim.snapshot(),l),Pt(t),(e+=1)%4===0&&It(t)}requestAnimationFrame(n)};requestAnimationFrame(n)}function be(t,e,n){const a=t.sim.metrics();t.latestMetrics=a,t.waitHistory.push(a.avg_wait_s),t.waitHistory.length>wt&&t.waitHistory.shift(),t.renderer.draw(e,t.waitHistory,n)}function Tt(t,e){if(!e.phaseLabel)return;const n=t.traffic.currentPhaseLabel();e.phaseLabel.textContent=n||"—"}function It(t){const e=document.getElementById("phase-label");if(!e)return;const n=t.traffic.currentPhaseLabel();e.textContent!==n&&(e.textContent=n||"—")}function Pt(t){const e=t.paneA;if(!e?.latestMetrics)return;const n=t.paneB;if(n?.latestMetrics){const a=Wt(e.latestMetrics,n.latestMetrics);ne(e.metricsEl,e.latestMetrics,a.a),ne(n.metricsEl,n.latestMetrics,a.b)}else ne(e.metricsEl,e.latestMetrics,null)}function Wt(t,e){const n=(u,p,f,b)=>Math.abs(u-p)<f?["tie","tie"]:(b?u>p:u<p)?["win","lose"]:["lose","win"],[a,i]=n(t.avg_wait_s,e.avg_wait_s,.05,!1),[o,s]=n(t.max_wait_s,e.max_wait_s,.05,!1),[r,c]=n(t.delivered,e.delivered,.5,!0),[l,d]=n(t.abandoned,e.abandoned,.5,!1),[g,h]=n(t.utilization,e.utilization,.005,!0);return{a:{avg_wait_s:a,max_wait_s:o,delivered:r,abandoned:l,utilization:g},b:{avg_wait_s:i,max_wait_s:s,delivered:c,abandoned:d,utilization:h}}}const se=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function At(t,e){switch(e){case"avg_wait_s":return`${t.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${t.max_wait_s.toFixed(1)} s`;case"delivered":return String(t.delivered);case"abandoned":return String(t.abandoned);case"utilization":return`${(t.utilization*100).toFixed(0)}%`}}function Rt(t){const e=document.createDocumentFragment();for(const[n]of se){const a=document.createElement("div");a.className="metric-row";const i=document.createElement("span");i.className="metric-k",i.textContent=n;const o=document.createElement("span");o.className="metric-v",a.append(i,o),e.appendChild(a)}t.replaceChildren(e)}function ne(t,e,n){const a=t.children;for(let i=0;i<se.length;i++){const o=a[i],s=se[i][1],r=n?n[s]:"";o.dataset.verdict!==r&&(o.dataset.verdict=r);const c=o.lastElementChild,l=At(e,s);c.textContent!==l&&(c.textContent=l)}}let _e=0;function E(t,e){t.toast.textContent=e,t.toast.classList.add("show"),window.clearTimeout(_e),_e=window.setTimeout(()=>t.toast.classList.remove("show"),1600)}function Ce(t,e,n,a){const i=B(t.permalink.scenario),o=i.tweakRanges[n],s=H(i,n,t.permalink.overrides),r=Bt(s+a*o.step,o.min,o.max),c=Ot(r,o.min,o.step);Ft(t,e,i,n,c)}function Lt(t,e,n){const a=B(t.permalink.scenario),i={...t.permalink.overrides};delete i[n],t.permalink={...t.permalink,overrides:i},n==="cars"?(I(t,e),E(e,"Cars reset")):(pe(t,e,a),E(e,`${$t(n)} reset`))}async function Et(t,e){const n=B(t.permalink.scenario),a=le(n,"cars",H(n,"cars",t.permalink.overrides));t.permalink={...t.permalink,overrides:{}},a?await I(t,e):pe(t,e,n),E(e,"Parameters reset")}function Ft(t,e,n,a,i){const o={...t.permalink.overrides,[a]:i};t.permalink={...t.permalink,overrides:Me(n,o)},a==="cars"?I(t,e):pe(t,e,n)}function pe(t,e,n){const a=Te(n,t.permalink.overrides),i={maxSpeed:a.maxSpeed,weightCapacityKg:a.weightCapacity,doorOpenTicks:a.doorOpenTicks,doorTransitionTicks:a.doorTransitionTicks};let o=!0;j(t,s=>{s.sim.applyPhysicsLive(i)||(o=!1)}),J(n,t.permalink.overrides,e),o||I(t,e)}function Bt(t,e,n){return Math.min(n,Math.max(e,t))}function Ot(t,e,n){const a=Math.round((t-e)/n);return e+a*n}function $t(t){switch(t){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}bt();
