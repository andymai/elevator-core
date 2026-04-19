(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function n(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(i){if(i.ep)return;i.ep=!0;const o=n(i);fetch(i.href,o)}})();function St(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(s,i)=>s+(i-s)*t;return{padX:n(8,18),padTop:n(20,26),padBottom:n(30,38),sparkH:n(18,22),labelW:n(44,68),upColW:n(20,28),dnColW:n(20,28),gutterGap:4,carW:n(26,40),carH:n(20,30),fontMain:n(10,12),fontSmall:n(9,10),stopDotR:n(2.2,2.6),carDotR:n(1.8,2.3),dirDotR:n(2.2,2.6)}}const nt={idle:"#5d6271",moving:"#06c2b5",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b90a0",unknown:"#5d6271"},yt="#1f2431",it="#c8ccd6",U="#7dd3fc",q="#fbbf24",ft="#f5f6f9",tt="#8b90a0",wt="#2e3445",_t="#8b90a0",bt="rgba(6, 194, 181, 0.85)",kt="rgba(6, 194, 181, 0.95)",Ct=260,ot=3,vt=.05,xt=160;function It(e,t,n,s,i){const o=(e+n)/2,a=(t+s)/2,c=n-e,r=s-t,f=Math.max(Math.hypot(c,r),1),l=-r/f,h=c/f,g=Math.min(f*.25,22),u=o+l*g,d=a+h*g,p=1-i;return[p*p*e+2*p*i*u+i*i*n,p*p*t+2*p*i*d+i*i*s]}function Wt(e){let o=e;for(let c=0;c<3;c++){const r=1-o,f=3*r*r*o*.2+3*r*o*o*.2+o*o*o,l=3*r*r*.2+6*r*o*(.2-.2)+3*o*o*(1-.2);if(l===0)break;o-=(f-e)/l,o=Math.max(0,Math.min(1,o))}const a=1-o;return 3*a*a*o*.6+3*a*o*o*1+o*o*o}class Mt{#t;#e;#n;#o;#s=null;#c=-1;#l=new Map;#p;#a=new Map;#r=new Map;#i=[];#d;constructor(t,n,s="Avg wait (s)"){this.#t=t;const i=t.getContext("2d");if(!i)throw new Error("2D context unavailable");this.#e=i,this.#n=window.devicePixelRatio||1,this.#p=n,this.#d=s,this.#f(),this.#o=()=>this.#f(),window.addEventListener("resize",this.#o)}dispose(){window.removeEventListener("resize",this.#o)}#f(){const{clientWidth:t,clientHeight:n}=this.#t;if(t===0||n===0)return;const s=t*this.#n,i=n*this.#n;(this.#t.width!==s||this.#t.height!==i)&&(this.#t.width=s,this.#t.height=i),this.#e.setTransform(this.#n,0,0,this.#n,0,0)}draw(t,n,s){this.#f();const{clientWidth:i,clientHeight:o}=this.#t;if(this.#e.clearRect(0,0,i,o),t.stops.length===0||i===0||o===0)return;i!==this.#c&&(this.#s=St(i),this.#c=i);const a=this.#s;let c=t.stops[0].y,r=t.stops[0].y;for(let m=1;m<t.stops.length;m++){const w=t.stops[m].y;w<c&&(c=w),w>r&&(r=w)}const f=c-1,l=r+1,h=Math.max(l-f,1e-4),g=o-a.padBottom,u=a.padTop,d=m=>g-(m-f)/h*(g-u),p=this.#l;p.forEach(m=>m.length=0);for(const m of t.cars){const w=p.get(m.line);w?w.push(m):p.set(m.line,[m])}const b=[...p.keys()].sort((m,w)=>m-w),k=a.padX+a.labelW+a.upColW+a.dnColW+a.gutterGap,M=Math.max(0,i-k-a.padX),C=b.reduce((m,w)=>m+(p.get(w)?.length??1),0),v=M/Math.max(C,1),S=Math.min(v,xt),_=S*C,x=Math.max(0,(M-_)/2),I=k+x,L=I+_,W=new Map;let N=0;for(const m of b){const w=p.get(m)??[];for(const D of w)W.set(D.id,I+S*(N+.5)),N++}const X=new Map;t.stops.forEach((m,w)=>X.set(m.entity_id,w)),this.#h(a),this.#g(t,d,a,I,L),this.#u(t,W,d,a,X);for(const[m,w]of W){this.#m(w,u,g,a);const D=t.cars.find(ut=>ut.id===m);D&&(this.#S(D,w,d,a),this.#y(D,w,d,a))}this.#w(t,W,d,a,s),this.#_(a),this.#b(n,i,o,a)}#h(t){const n=this.#e,s=t.padX+t.labelW+t.upColW/2,i=t.padX+t.labelW+t.upColW+t.dnColW/2,o=t.padTop/2+1;n.font=`${t.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,n.textBaseline="middle",n.textAlign="center",n.fillStyle=U,n.fillText("▲",s,o),n.fillStyle=q,n.fillText("▼",i,o)}#g(t,n,s,i,o){const a=this.#e;a.font=`${s.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,a.textBaseline="middle";const c=s.padX,r=s.padX+s.labelW,f=r+s.upColW;for(const l of t.stops){const h=n(l.y);a.strokeStyle=yt,a.lineWidth=1,a.beginPath(),a.moveTo(i,h),a.lineTo(o,h),a.stroke(),a.fillStyle=it,a.textAlign="left",a.fillText(At(a,l.name,s.labelW-2),c,h),l.waiting_up>0&&st(a,r,h,s.upColW,s.dirDotR,l.waiting_up,U,s.fontSmall),l.waiting_down>0&&st(a,f,h,s.dnColW,s.dirDotR,l.waiting_down,q,s.fontSmall)}}#m(t,n,s,i){const o=this.#e,a=o.createLinearGradient(t,n,t,s);a.addColorStop(0,"rgba(39, 45, 58, 0)"),a.addColorStop(.5,"rgba(39, 45, 58, 0.9)"),a.addColorStop(1,"rgba(39, 45, 58, 0)"),o.strokeStyle=a,o.lineWidth=1,o.beginPath(),o.moveTo(t,n),o.lineTo(t,s),o.stroke()}#u(t,n,s,i,o){const a=this.#e,c=.75+.2*Math.sin(performance.now()*.005),r=i.carDotR*5.2,f=i.carDotR*3.4;for(const l of t.cars){if(l.target==null)continue;const h=o.get(l.target);if(h==null)continue;const g=t.stops[h],u=n.get(l.id);if(u==null)continue;const d=s(g.y);a.strokeStyle=`rgba(6, 194, 181, ${c})`,a.lineWidth=2,a.beginPath(),a.arc(u,d,r,0,Math.PI*2),a.stroke(),a.strokeStyle=bt,a.lineWidth=1,a.beginPath(),a.arc(u,d,f,0,Math.PI*2),a.stroke(),a.fillStyle=kt,a.beginPath(),a.arc(u,d,i.carDotR*1.1,0,Math.PI*2),a.fill()}}#S(t,n,s,i){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const o=this.#e,a=nt[t.phase],c=i.carW/2,r=i.carH/2;for(let f=1;f<=ot;f++){const l=s(t.y-t.v*vt*f),h=.18*(1-(f-1)/ot);o.fillStyle=rt(a,h),o.fillRect(n-c,l-r,i.carW,i.carH)}}#y(t,n,s,i){const o=this.#e,a=s(t.y),c=i.carW/2,r=i.carH/2,f=nt[t.phase]??"#5d6271",l=o.createLinearGradient(n,a-r,n,a+r);l.addColorStop(0,at(f,.14)),l.addColorStop(1,at(f,-.18)),o.fillStyle=l,o.fillRect(n-c,a-r,i.carW,i.carH),o.strokeStyle="rgba(10, 12, 16, 0.9)",o.lineWidth=1,o.strokeRect(n-c+.5,a-r+.5,i.carW-1,i.carH-1);const h=t.capacity>0?Math.min(t.load/t.capacity,1):0;if(h>0){const g=(i.carH-4)*h;o.fillStyle="rgba(10, 12, 16, 0.35)",o.fillRect(n-c+2,a+r-2-g,i.carW-4,g)}t.riders>0&&Pt(o,n,a,i.carW,i.carH,i.carDotR,t.riders,i.fontSmall)}#w(t,n,s,i,o){const a=performance.now(),c=Math.max(1,o),r=Ct/c,f=30/c,l=i.padX+i.labelW,h=l+i.upColW,g=new Map,u=[];for(const d of t.cars){const p=this.#a.get(d.id),b=d.riders,k=n.get(d.id);let M=null,C=1/0;for(let S=0;S<t.stops.length;S++){const _=Math.abs(t.stops[S].y-d.y);_<C&&(C=_,M=S)}const v=d.phase==="loading"&&C<.5?M:null;if(p&&k!=null&&v!=null){const S=b-p.riders;if(S>0){const _=t.stops[v];g.set(_.entity_id,(g.get(_.entity_id)??0)+S)}if(S!==0){const _=t.stops[v],x=s(_.y),I=s(d.y),L=Math.min(Math.abs(S),6);if(S>0){const W=_.waiting_up>=_.waiting_down,N=W?l+i.upColW/2:h+i.dnColW/2,X=W?U:q;for(let m=0;m<L;m++)u.push(()=>this.#i.push({kind:"board",bornAt:a+m*f,duration:r,startX:N,startY:x,endX:k,endY:I,color:X}))}else for(let W=0;W<L;W++)u.push(()=>this.#i.push({kind:"alight",bornAt:a+W*f,duration:r,startX:k,startY:I,endX:k+18,endY:I+10,color:ft}))}}this.#a.set(d.id,{riders:b})}for(const d of t.stops){const p=d.waiting_up+d.waiting_down,b=this.#r.get(d.entity_id);if(b){const k=b.waiting-p,M=g.get(d.entity_id)??0,C=Math.max(0,k-M);if(C>0){const v=s(d.y),S=l+i.upColW/2,_=Math.min(C,4);for(let x=0;x<_;x++)this.#i.push({kind:"abandon",bornAt:a+x*f,duration:r*1.5,startX:S,startY:v,endX:S-26,endY:v-6,color:tt})}}this.#r.set(d.entity_id,{waiting:p})}for(const d of u)d();for(let d=this.#i.length-1;d>=0;d--){const p=this.#i[d];a-p.bornAt>p.duration&&this.#i.splice(d,1)}if(this.#a.size>t.cars.length){const d=new Set(t.cars.map(p=>p.id));for(const p of this.#a.keys())d.has(p)||this.#a.delete(p)}if(this.#r.size>t.stops.length){const d=new Set(t.stops.map(p=>p.entity_id));for(const p of this.#r.keys())d.has(p)||this.#r.delete(p)}}#_(t){const n=performance.now(),s=this.#e;for(const i of this.#i){const o=n-i.bornAt;if(o<0)continue;const a=Math.min(1,Math.max(0,o/i.duration)),c=Wt(a),[r,f]=i.kind==="board"?It(i.startX,i.startY,i.endX,i.endY,c):[i.startX+(i.endX-i.startX)*c,i.startY+(i.endY-i.startY)*c],l=i.kind==="board"?.9:i.kind==="abandon"?(1-c)**1.5:1-c,h=i.kind==="abandon"?t.carDotR*.85:t.carDotR;s.fillStyle=rt(i.color,l),s.beginPath(),s.arc(r,f,h,0,Math.PI*2),s.fill()}}#b(t,n,s,i){const o=this.#e,a=s-i.padBottom+(i.padBottom-i.sparkH)/2,c=a+i.sparkH,r=i.padX,f=n-i.padX,l=Math.max(f-r,1);if(o.font=`${i.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,o.textBaseline="top",o.fillStyle=_t,o.textAlign="left",o.fillText(this.#d,r,a-1),t.length===0)return;const h=t[t.length-1];if(o.fillStyle=it,o.textAlign="right",o.fillText(h.toFixed(1),f,a-1),t.length<2)return;const g=Math.max(1,...t),u=l/Math.max(t.length-1,1),d=p=>c-p/g*(c-a);o.strokeStyle=wt,o.lineWidth=1,o.beginPath(),o.moveTo(r,c),o.lineTo(f,c),o.stroke(),o.strokeStyle=this.#p,o.lineWidth=1.4,o.beginPath();for(let p=0;p<t.length;p++){const b=r+p*u,k=d(t[p]);p===0?o.moveTo(b,k):o.lineTo(b,k)}o.stroke()}get canvas(){return this.#t}}function st(e,t,n,s,i,o,a,c){const r=i*2+1.2,f=Math.max(1,Math.floor((s-10)/r)),l=Math.min(o,f);e.fillStyle=a;for(let h=0;h<l;h++){const g=t+i+h*r;e.beginPath(),e.arc(g,n,i,0,Math.PI*2),e.fill()}o>l&&(e.fillStyle=tt,e.font=`${c.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="left",e.textBaseline="middle",e.fillText(`+${o-l}`,t+i+l*r,n))}function Pt(e,t,n,s,i,o,a,c){const l=s-6,h=i-6,g=o*2+1.2,u=Math.max(1,Math.floor(l/g)),d=Math.max(1,Math.floor(h/g)),p=u*d,b=Math.min(a,p),k=a-b,M=t-s/2+3+o,C=n-i/2+3+o;e.fillStyle=ft;const v=k>0?b-1:b;for(let S=0;S<v;S++){const _=S%u,x=Math.floor(S/u),I=M+_*g,L=C+x*g;e.beginPath(),e.arc(I,L,o,0,Math.PI*2),e.fill()}if(k>0){e.fillStyle=tt,e.font=`${c.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="center",e.textBaseline="middle";const S=v,_=S%u,x=Math.floor(S/u),I=M+_*g,L=C+x*g;e.fillText(`+${a-v}`,I,L)}}function at(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n)return e;const s=parseInt(n[1],16),i=s>>16&255,o=s>>8&255,a=s&255,c=r=>t>=0?Math.round(r+(255-r)*t):Math.round(r*(1+t));return`rgb(${c(i)}, ${c(o)}, ${c(a)})`}function rt(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n)return e;const s=parseInt(n[1],16),i=s>>16&255,o=s>>8&255,a=s&255;return`rgba(${i}, ${o}, ${a}, ${t})`}function At(e,t,n){if(e.measureText(t).width<=n)return t;const s="…";let i=0,o=t.length;for(;i<o;){const a=i+o+1>>1;e.measureText(t.slice(0,a)+s).width<=n?i=a:o=a-1}return i===0?s:t.slice(0,i)+s}const R={scenario:"skyscraper-sky-lobby",strategyA:"etd",strategyB:"scan",compare:!0,seed:42,intensity:1,speed:2},Tt=["scan","look","nearest","etd","destination"];function ct(e,t){return e!==null&&Tt.includes(e)?e:t}function Lt(e){const t=new URLSearchParams;return t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB),e.compare&&t.set("c","1"),t.set("k",String(e.seed)),t.set("i",String(e.intensity)),t.set("x",String(e.speed)),`?${t.toString()}`}function Et(e){const t=new URLSearchParams(e);return{scenario:t.get("s")??R.scenario,strategyA:ct(t.get("a")??t.get("d"),R.strategyA),strategyB:ct(t.get("b"),R.strategyB),compare:t.get("c")==="1",seed:G(t.get("k"),R.seed),intensity:G(t.get("i"),R.intensity),speed:G(t.get("x"),R.speed)}}function G(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function y(e){return Array.from({length:e},()=>1)}function V(e){return Array.from({length:e},(t,n)=>n===0?1:0)}function O(e){return Array.from({length:e},(t,n)=>1+n/Math.max(1,e-1)*.5)}const E=6,Rt=[{name:"Overnight",durationSec:45,ridersPerMin:3,originWeights:y(E),destWeights:y(E)},{name:"Morning rush",durationSec:60,ridersPerMin:30,originWeights:[8.5,.3,.3,.3,.3,.3],destWeights:O(E).map((e,t)=>t===0?0:e)},{name:"Midday interfloor",durationSec:60,ridersPerMin:16,originWeights:y(E),destWeights:y(E)},{name:"Lunchtime",durationSec:45,ridersPerMin:36,originWeights:[.3,3,2,2,2,2],destWeights:[.3,3,2,2,2,2]},{name:"Evening exodus",durationSec:60,ridersPerMin:30,originWeights:O(E).map((e,t)=>t===0?0:e),destWeights:V(E)}],Bt={id:"office-mid-rise",label:"Mid-rise office",description:"Six floors, two 800 kg cars. Walks through morning rush → midday → lunchtime → evening exodus. Group-time ETD damps tail waits under sustained load.",defaultStrategy:"etd",phases:Rt,seedSpawns:0,abandonAfterSec:90,hook:{kind:"etd_group_time",waitSquaredWeight:.002},featureHint:"Group-time ETD (`wait_squared_weight = 0.002`) — stops hosting older waiters win ties, damping long-wait tail during lunchtime bursts.",ron:`SimConfig(
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
)`},P=13,Ft=[{name:"Overnight",durationSec:45,ridersPerMin:6,originWeights:y(P),destWeights:y(P)},{name:"Morning rush",durationSec:75,ridersPerMin:20,originWeights:[14,...Array.from({length:P-1},()=>.25)],destWeights:[0,...O(P-1)]},{name:"Midday interfloor",durationSec:60,ridersPerMin:13,originWeights:y(P),destWeights:y(P)},{name:"Lunchtime",durationSec:45,ridersPerMin:17,originWeights:Array.from({length:P},(e,t)=>t===6?3:1),destWeights:Array.from({length:P},(e,t)=>t===6?4:1)},{name:"Evening exodus",durationSec:75,ridersPerMin:18,originWeights:[0,...O(P-1)],destWeights:[14,...Array.from({length:P-1},()=>.25)]}],Ht={id:"skyscraper-sky-lobby",label:"Skyscraper (sky lobby)",description:"Twelve floors, three cars. Morning rush saturates two cars fast — the third's full-load bypass (80 %/50 %) stops it from detouring for upward hall calls it can't serve.",defaultStrategy:"etd",phases:Ft,seedSpawns:0,abandonAfterSec:180,hook:{kind:"bypass_narration"},featureHint:"Direction-dependent bypass (80 % up / 50 % down) on all three cars — baked into the RON below. Watch the fullest car skip hall calls.",ron:`SimConfig(
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
)`},A=8,Ot=[{name:"Overnight",durationSec:60,ridersPerMin:3,originWeights:y(A),destWeights:y(A)},{name:"Morning exodus",durationSec:75,ridersPerMin:35,originWeights:[0,...O(A-1)],destWeights:V(A)},{name:"Midday quiet",durationSec:60,ridersPerMin:7,originWeights:y(A),destWeights:y(A)},{name:"Afternoon drift",durationSec:45,ridersPerMin:14,originWeights:Array.from({length:A},(e,t)=>t===0?3:1),destWeights:y(A)},{name:"Evening return",durationSec:60,ridersPerMin:30,originWeights:V(A),destWeights:[0,...O(A-1)]}],Dt={id:"residential-tower",label:"Residential tower",description:"Eight floors, two cars. Asymmetric day: morning exodus, quiet midday, evening return. Predictive parking anticipates the next peak by the arrival-log rate signal.",defaultStrategy:"etd",phases:Ot,seedSpawns:0,abandonAfterSec:180,hook:{kind:"predictive_parking",windowTicks:9e3},featureHint:"Predictive parking with a 2.5-min window — during the midday slump, idle cars pre-position toward the floors that spiked most recently.",ron:`SimConfig(
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
)`},T=10,$t=[{name:"Overnight",durationSec:45,ridersPerMin:3,originWeights:y(T),destWeights:y(T)},{name:"Check-out rush",durationSec:60,ridersPerMin:32,originWeights:[0,.5,...Array.from({length:T-2},()=>1)],destWeights:[5,2,...Array.from({length:T-2},()=>.3)]},{name:"Daytime",durationSec:75,ridersPerMin:15,originWeights:y(T),destWeights:y(T)},{name:"Check-in rush",durationSec:60,ridersPerMin:28,originWeights:[4,1,...Array.from({length:T-2},()=>.3)],destWeights:[0,.5,...Array.from({length:T-2},()=>1)]},{name:"Late night",durationSec:60,ridersPerMin:10,originWeights:[2,2,...Array.from({length:T-2},()=>.5)],destWeights:[.5,.5,...Array.from({length:T-2},()=>1)]}],Nt={id:"hotel-24-7",label:"Hotel 24/7",description:"Ten floors, three cars in DCS mode. Low-rate baseline with check-in / check-out bumps; deferred commitment reallocates assignments while cars are still far from the rider's origin.",defaultStrategy:"destination",phases:$t,seedSpawns:0,abandonAfterSec:150,hook:{kind:"deferred_dcs",commitmentWindowTicks:180},featureHint:"Deferred DCS with a 3-s (180-tick) commitment window — sticky assignments keep re-competing until a car is close to the rider, yielding better matches under bursty demand.",ron:`SimConfig(
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
)`},H=5,Xt=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:H},(e,t)=>t===H-1?8:1),destWeights:[5,2,1,1,0]},{name:"Tapering",durationSec:90,ridersPerMin:18,originWeights:y(H),destWeights:y(H)},{name:"Between sessions",durationSec:135,ridersPerMin:4,originWeights:y(H),destWeights:y(H)}],Yt={id:"convention-burst",label:"Convention burst",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:Xt,seedSpawns:120,hook:{kind:"arrival_log"},featureHint:"Arrival-rate signal lights up as the burst hits — `DispatchManifest::arrivals_at` feeds downstream strategies the per-stop intensity for the next 5 minutes.",ron:`SimConfig(
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
)`},zt={id:"space-elevator",label:"Space elevator",description:"Two stops 1,000 km apart. Same engine, different scale — no traffic patterns really apply; it's a showpiece for the trapezoidal-motion primitives.",defaultStrategy:"scan",phases:[{name:"Scheduled climb",durationSec:300,ridersPerMin:4,originWeights:[1,1],destWeights:[1,1]}],seedSpawns:0,hook:{kind:"none"},featureHint:"No controller feature to showcase — this scenario exists to demonstrate that the engine is topology-agnostic.",ron:`SimConfig(
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
)`},J=[Bt,Ht,Dt,Nt,Yt,zt];function z(e){return J.find(t=>t.id===e)??J[0]}let K=null;async function Ut(){if(!K){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;K=import(e).then(async n=>(await n.default(t),n))}return K}class et{#t;#e;constructor(t){this.#t=t,this.#e=t.dt()}static async create(t,n){const s=await Ut();return new et(new s.WasmSim(t,n))}step(t){this.#t.stepMany(t),this.#t.drainEvents()}get dt(){return this.#e}tick(){return Number(this.#t.currentTick())}strategyName(){return this.#t.strategyName()}setStrategy(t){return this.#t.setStrategy(t)}spawnRider(t,n,s,i){this.#t.spawnRider(t,n,s,i)}setTrafficRate(t){this.#t.setTrafficRate(t)}trafficRate(){return this.#t.trafficRate()}snapshot(){return this.#t.snapshot()}metrics(){return this.#t.metrics()}waitingCountAt(t){return this.#t.waitingCountAt(t)}applyHook(t){const n=this.#t;switch(t.kind){case"none":case"arrival_log":case"bypass_narration":return;case"etd_group_time":n.setEtdWithWaitSquaredWeight?.(t.waitSquaredWeight);return;case"deferred_dcs":n.setHallCallModeDestination?.(),n.setDcsWithCommitmentWindow?.(BigInt(t.commitmentWindowTicks));return;case"predictive_parking":n.setRepositionPredictiveParking?.(BigInt(t.windowTicks));return}}dispose(){this.#t.free()}}class ht{#t;#e=0;#n=[];#o=0;#s=0;#c=1;#l=0;constructor(t){this.#t=qt(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#o=t.reduce((n,s)=>n+s.durationSec,0),this.#s=0,this.#e=0}setIntensity(t){this.#c=Math.max(0,t)}setPatienceTicks(t){this.#l=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(t.stops.length<2||this.#n.length===0)return[];const s=Math.min(n,4/60),i=this.#n[this.currentPhaseIndex()];this.#e+=i.ridersPerMin*this.#c/60*s,this.#s=(this.#s+s)%(this.#o||1);const o=[];for(;this.#e>=1;)this.#e-=1,o.push(this.#p(t,i));return o}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#s;for(let n=0;n<this.#n.length;n+=1)if(t-=this.#n[n].durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#o<=0?0:Math.min(1,this.#s/this.#o)}phases(){return this.#n}#p(t,n){const s=t.stops,i=this.#a(s.length,n.originWeights);let o=this.#a(s.length,n.destWeights);o===i&&(o=(o+1)%s.length);const a=50+this.#d()*50;return{originStopId:s[i].stop_id,destStopId:s[o].stop_id,weight:a,patienceTicks:this.#l>0?this.#l:void 0}}#a(t,n){if(!n||n.length!==t)return this.#i(t);let s=0;for(let o=0;o<t;o+=1)s+=Math.max(0,n[o]);if(s<=0)return this.#i(t);let i=this.#d()*s;for(let o=0;o<t;o+=1)if(i-=Math.max(0,n[o]),i<0)return o;return t-1}#r(){let t=this.#t=this.#t+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#i(t){return Number(this.#r()%BigInt(t))}#d(){return Number(this.#r()>>11n)/2**53}}function qt(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const Gt=["scan","look","nearest","etd","destination"],$={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS"},Kt=120,jt="#7dd3fc",Vt="#fda4af",gt=e=>`${e}×`,mt=e=>`${e.toFixed(1)}×`;async function Jt(){const e=Zt(),t={...R,...Et(window.location.search)};Qt(t),te(t,e);const n={running:!0,ready:!1,permalink:t,paneA:null,paneB:null,traffic:new ht(t.seed),lastFrameTime:performance.now(),initToken:0};ee(n,e),await B(n,e),n.ready=!0,ne(n)}function Qt(e){const t=z(e.scenario);e.scenario=t.id}function Zt(){const e=i=>{const o=document.getElementById(i);if(!o)throw new Error(`missing element #${i}`);return o},t=i=>document.getElementById(i)??null,n=(i,o)=>({root:e(`pane-${i}`),canvas:e(`shaft-${i}`),name:e(`name-${i}`),metrics:e(`metrics-${i}`),accent:o}),s={scenarioSelect:e("scenario"),strategyASelect:e("strategy-a"),strategyBSelect:e("strategy-b"),compareToggle:e("compare"),strategyBWrap:e("strategy-b-wrap"),seedInput:e("seed"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseLabel:t("phase-label"),featureHint:t("feature-hint"),paneA:n("a",jt),paneB:n("b",Vt)};for(const i of J){const o=document.createElement("option");o.value=i.id,o.textContent=i.label,o.title=i.description,s.scenarioSelect.appendChild(o)}for(const i of Gt)for(const o of[s.strategyASelect,s.strategyBSelect]){const a=document.createElement("option");a.value=i,a.textContent=$[i],o.appendChild(a)}return s.intensityInput.min="0.5",s.intensityInput.max="2",s.intensityInput.step="0.1",s}function te(e,t){t.scenarioSelect.value=e.scenario,t.strategyASelect.value=e.strategyA,t.strategyBSelect.value=e.strategyB,t.compareToggle.checked=e.compare,t.strategyBWrap.classList.toggle("hidden",!e.compare),t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=String(e.seed),t.speedInput.value=String(e.speed),t.speedLabel.textContent=gt(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=mt(e.intensity);const n=z(e.scenario);t.featureHint&&(t.featureHint.textContent=n.featureHint)}function Q(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}function Y(e){e?.sim.dispose(),e?.renderer.dispose()}async function lt(e,t,n){const s=await et.create(n.ron,t);s.applyHook(n.hook);const i=new Mt(e.canvas,e.accent);return e.name.textContent=$[t],ce(e.metrics),{strategy:t,sim:s,renderer:i,metricsEl:e.metrics,waitHistory:[],latestMetrics:null}}async function B(e,t){const n=++e.initToken;t.loader.classList.add("show");const s=z(e.permalink.scenario);e.traffic=new ht(e.permalink.seed),e.traffic.setPhases(s.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(s.abandonAfterSec?Math.round(s.abandonAfterSec*60):0),Y(e.paneA),Y(e.paneB),e.paneA=null,e.paneB=null;try{const i=await lt(t.paneA,e.permalink.strategyA,s);if(n!==e.initToken){Y(i);return}if(e.paneA=i,e.permalink.compare){const o=await lt(t.paneB,e.permalink.strategyB,s);if(n!==e.initToken){Y(o);return}e.paneB=o}if(s.seedSpawns>0){const o=e.paneA.sim.snapshot();for(let a=0;a<s.seedSpawns;a+=1){const c=e.traffic.drainSpawns(o,.0033333333333333335);for(const r of c)Q(e,f=>f.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks));if(c.length===0)break}}t.featureHint&&(t.featureHint.textContent=s.featureHint),ie(e,t)}catch(i){throw n===e.initToken&&F(t,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function ee(e,t){t.scenarioSelect.addEventListener("change",async()=>{const n=z(t.scenarioSelect.value),s=e.permalink.compare?e.permalink.strategyA:n.defaultStrategy;e.permalink={...e.permalink,scenario:n.id,strategyA:s},t.strategyASelect.value=s,await B(e,t),F(t,`${n.label} · ${$[s]}`)}),t.strategyASelect.addEventListener("change",async()=>{e.permalink={...e.permalink,strategyA:t.strategyASelect.value},await B(e,t),F(t,`A: ${$[e.permalink.strategyA]}`)}),t.strategyBSelect.addEventListener("change",async()=>{e.permalink={...e.permalink,strategyB:t.strategyBSelect.value},e.permalink.compare&&(await B(e,t),F(t,`B: ${$[e.permalink.strategyB]}`))}),t.compareToggle.addEventListener("change",async()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},t.strategyBWrap.classList.toggle("hidden",!e.permalink.compare),t.layout.dataset.mode=e.permalink.compare?"compare":"single",await B(e,t),F(t,e.permalink.compare?"Compare on":"Compare off")}),t.seedInput.addEventListener("change",async()=>{const n=Number(t.seedInput.value);Number.isFinite(n)&&(e.permalink={...e.permalink,seed:n},await B(e,t))}),t.speedInput.addEventListener("input",()=>{const n=Number(t.speedInput.value);e.permalink.speed=n,t.speedLabel.textContent=gt(n)}),t.intensityInput.addEventListener("input",()=>{const n=Number(t.intensityInput.value);e.permalink.intensity=n,e.traffic.setIntensity(n),t.intensityLabel.textContent=mt(n)}),t.playBtn.addEventListener("click",()=>{e.running=!e.running,t.playBtn.textContent=e.running?"Pause":"Play"}),t.resetBtn.addEventListener("click",()=>{B(e,t),F(t,"Reset")}),t.shareBtn.addEventListener("click",async()=>{const n=Lt(e.permalink),s=`${window.location.origin}${window.location.pathname}${n}`;window.history.replaceState(null,"",n),await navigator.clipboard.writeText(s).catch(()=>{}),F(t,"Permalink copied")})}function ne(e){let t=0;const n=()=>{const s=performance.now(),i=(s-e.lastFrameTime)/1e3;if(e.lastFrameTime=s,e.running&&e.ready&&e.paneA){const o=e.permalink.speed;Q(e,l=>l.sim.step(o));const a=e.paneA.sim.snapshot(),c=i*o,r=e.traffic.drainSpawns(a,c);for(const l of r)Q(e,h=>h.sim.spawnRider(l.originStopId,l.destStopId,l.weight,l.patienceTicks));const f=e.permalink.speed;dt(e.paneA,e.paneA.sim.snapshot(),f),e.paneB&&dt(e.paneB,e.paneB.sim.snapshot(),f),se(e),(t+=1)%4===0&&oe(e)}requestAnimationFrame(n)};requestAnimationFrame(n)}function dt(e,t,n){const s=e.sim.metrics();e.latestMetrics=s,e.waitHistory.push(s.avg_wait_s),e.waitHistory.length>Kt&&e.waitHistory.shift(),e.renderer.draw(t,e.waitHistory,n)}function ie(e,t){if(!t.phaseLabel)return;const n=e.traffic.currentPhaseLabel();t.phaseLabel.textContent=n||"—"}function oe(e){const t=document.getElementById("phase-label");if(!t)return;const n=e.traffic.currentPhaseLabel();t.textContent!==n&&(t.textContent=n||"—")}function se(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const s=ae(t.latestMetrics,n.latestMetrics);j(t.metricsEl,t.latestMetrics,s.a),j(n.metricsEl,n.latestMetrics,s.b)}else j(t.metricsEl,t.latestMetrics,null)}function ae(e,t){const n=(u,d,p,b)=>Math.abs(u-d)<p?["tie","tie"]:(b?u>d:u<d)?["win","lose"]:["lose","win"],[s,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[o,a]=n(e.max_wait_s,t.max_wait_s,.05,!1),[c,r]=n(e.delivered,t.delivered,.5,!0),[f,l]=n(e.abandoned,t.abandoned,.5,!1),[h,g]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:s,max_wait_s:o,delivered:c,abandoned:f,utilization:h},b:{avg_wait_s:i,max_wait_s:a,delivered:r,abandoned:l,utilization:g}}}const Z=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function re(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function ce(e){const t=document.createDocumentFragment();for(const[n]of Z){const s=document.createElement("div");s.className="metric-row";const i=document.createElement("span");i.className="metric-k",i.textContent=n;const o=document.createElement("span");o.className="metric-v",s.append(i,o),t.appendChild(s)}e.replaceChildren(t)}function j(e,t,n){const s=e.children;for(let i=0;i<Z.length;i++){const o=s[i],a=Z[i][1],c=n?n[a]:"";o.dataset.verdict!==c&&(o.dataset.verdict=c);const r=o.lastElementChild,f=re(t,a);r.textContent!==f&&(r.textContent=f)}}let pt=0;function F(e,t){e.toast.textContent=t,e.toast.classList.add("show"),window.clearTimeout(pt),pt=window.setTimeout(()=>e.toast.classList.remove("show"),1600)}Jt();
