(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const s of i.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&a(s)}).observe(document,{childList:!0,subtree:!0});function o(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(n){if(n.ep)return;n.ep=!0;const i=o(n);fetch(n.href,i)}})();function ft(e){const t=Math.max(0,Math.min(1,(e-320)/580)),o=(a,n)=>a+(n-a)*t;return{padX:o(8,18),padTop:o(20,26),padBottom:o(30,38),sparkH:o(18,22),labelW:o(44,68),upColW:o(20,28),dnColW:o(20,28),gutterGap:4,carW:o(26,40),carH:o(20,30),fontMain:o(10,12),fontSmall:o(9,10),stopDotR:o(2.2,2.6),carDotR:o(1.8,2.3),dirDotR:o(2.2,2.6)}}const G={idle:"#5d6271",moving:"#06c2b5",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b90a0",unknown:"#5d6271"},dt="#1f2431",q="#c8ccd6",O="#7dd3fc",$="#fbbf24",nt="#f5f6f9",ot="#8b90a0",pt="#2e3445",mt="#8b90a0",gt="rgba(6, 194, 181, 0.85)",ht="rgba(6, 194, 181, 0.95)",ut=260,K=3,St=.05,wt=160;function yt(e,t,o,a,n){const i=(e+o)/2,s=(t+a)/2,c=o-e,r=a-t,l=Math.max(Math.hypot(c,r),1),f=-r/l,m=c/l,d=Math.min(l*.25,22),p=i+f*d,h=s+m*d,g=1-n;return[g*g*e+2*g*n*p+n*n*o,g*g*t+2*g*n*h+n*n*a]}function bt(e){let i=e;for(let c=0;c<3;c++){const r=1-i,l=3*r*r*i*.2+3*r*i*i*.2+i*i*i,f=3*r*r*.2+6*r*i*(.2-.2)+3*i*i*(1-.2);if(f===0)break;i-=(l-e)/f,i=Math.max(0,Math.min(1,i))}const s=1-i;return 3*s*s*i*.6+3*s*i*i*1+i*i*i}class _t{#t;#e;#n;#o;#a=null;#r=-1;#d=new Map;#l;#s=new Map;#i=[];#f;constructor(t,o,a="Avg wait (s)"){this.#t=t;const n=t.getContext("2d");if(!n)throw new Error("2D context unavailable");this.#e=n,this.#n=window.devicePixelRatio||1,this.#l=o,this.#f=a,this.#c(),this.#o=()=>this.#c(),window.addEventListener("resize",this.#o)}dispose(){window.removeEventListener("resize",this.#o)}#c(){const{clientWidth:t,clientHeight:o}=this.#t;if(t===0||o===0)return;const a=t*this.#n,n=o*this.#n;(this.#t.width!==a||this.#t.height!==n)&&(this.#t.width=a,this.#t.height=n),this.#e.setTransform(this.#n,0,0,this.#n,0,0)}draw(t,o,a){this.#c();const{clientWidth:n,clientHeight:i}=this.#t;if(this.#e.clearRect(0,0,n,i),t.stops.length===0||n===0||i===0)return;n!==this.#r&&(this.#a=ft(n),this.#r=n);const s=this.#a;let c=t.stops[0].y,r=t.stops[0].y;for(let u=1;u<t.stops.length;u++){const S=t.stops[u].y;S<c&&(c=S),S>r&&(r=S)}const l=c-1,f=r+1,m=Math.max(f-l,1e-4),d=i-s.padBottom,p=s.padTop,h=u=>d-(u-l)/m*(d-p),g=this.#d;g.forEach(u=>u.length=0);for(const u of t.cars){const S=g.get(u.line);S?S.push(u):g.set(u.line,[u])}const y=[...g.keys()].sort((u,S)=>u-S),_=s.padX+s.labelW+s.upColW+s.dnColW+s.gutterGap,v=Math.max(0,n-_-s.padX),I=y.reduce((u,S)=>u+(g.get(S)?.length??1),0),b=v/Math.max(I,1),w=Math.min(b,wt),T=w*I,C=Math.max(0,(v-T)/2),x=_+C,k=x+T,L=new Map;let W=0;for(const u of y){const S=g.get(u)??[];for(const B of S)L.set(B.id,x+w*(W+.5)),W++}const E=new Map;t.stops.forEach((u,S)=>E.set(u.entity_id,S)),this.#p(s),this.#m(t,h,s,x,k),this.#h(t,L,h,s,E);for(const[u,S]of L){this.#g(S,p,d,s);const B=t.cars.find(lt=>lt.id===u);B&&(this.#u(B,S,h,s),this.#S(B,S,h,s))}this.#w(t,L,h,s,a),this.#y(s),this.#b(o,n,i,s)}#p(t){const o=this.#e,a=t.padX+t.labelW+t.upColW/2,n=t.padX+t.labelW+t.upColW+t.dnColW/2,i=t.padTop/2+1;o.font=`${t.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,o.textBaseline="middle",o.textAlign="center",o.fillStyle=O,o.fillText("▲",a,i),o.fillStyle=$,o.fillText("▼",n,i)}#m(t,o,a,n,i){const s=this.#e;s.font=`${a.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,s.textBaseline="middle";const c=a.padX,r=a.padX+a.labelW,l=r+a.upColW;for(const f of t.stops){const m=o(f.y);s.strokeStyle=dt,s.lineWidth=1,s.beginPath(),s.moveTo(n,m),s.lineTo(i,m),s.stroke(),s.fillStyle=q,s.textAlign="left",s.fillText(xt(s,f.name,a.labelW-2),c,m),f.waiting_up>0&&V(s,r,m,a.upColW,a.dirDotR,f.waiting_up,O,a.fontSmall),f.waiting_down>0&&V(s,l,m,a.dnColW,a.dirDotR,f.waiting_down,$,a.fontSmall)}}#g(t,o,a,n){const i=this.#e,s=i.createLinearGradient(t,o,t,a);s.addColorStop(0,"rgba(39, 45, 58, 0)"),s.addColorStop(.5,"rgba(39, 45, 58, 0.9)"),s.addColorStop(1,"rgba(39, 45, 58, 0)"),i.strokeStyle=s,i.lineWidth=1,i.beginPath(),i.moveTo(t,o),i.lineTo(t,a),i.stroke()}#h(t,o,a,n,i){const s=this.#e,c=.75+.2*Math.sin(performance.now()*.005),r=n.carDotR*5.2,l=n.carDotR*3.4;for(const f of t.cars){if(f.target==null)continue;const m=i.get(f.target);if(m==null)continue;const d=t.stops[m],p=o.get(f.id);if(p==null)continue;const h=a(d.y);s.strokeStyle=`rgba(6, 194, 181, ${c})`,s.lineWidth=2,s.beginPath(),s.arc(p,h,r,0,Math.PI*2),s.stroke(),s.strokeStyle=gt,s.lineWidth=1,s.beginPath(),s.arc(p,h,l,0,Math.PI*2),s.stroke(),s.fillStyle=ht,s.beginPath(),s.arc(p,h,n.carDotR*1.1,0,Math.PI*2),s.fill()}}#u(t,o,a,n){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const i=this.#e,s=G[t.phase],c=n.carW/2,r=n.carH/2;for(let l=1;l<=K;l++){const f=a(t.y-t.v*St*l),m=.18*(1-(l-1)/K);i.fillStyle=J(s,m),i.fillRect(o-c,f-r,n.carW,n.carH)}}#S(t,o,a,n){const i=this.#e,s=a(t.y),c=n.carW/2,r=n.carH/2,l=G[t.phase]??"#5d6271",f=i.createLinearGradient(o,s-r,o,s+r);f.addColorStop(0,j(l,.14)),f.addColorStop(1,j(l,-.18)),i.fillStyle=f,i.fillRect(o-c,s-r,n.carW,n.carH),i.strokeStyle="rgba(10, 12, 16, 0.9)",i.lineWidth=1,i.strokeRect(o-c+.5,s-r+.5,n.carW-1,n.carH-1);const m=t.capacity>0?Math.min(t.load/t.capacity,1):0;if(m>0){const d=(n.carH-4)*m;i.fillStyle="rgba(10, 12, 16, 0.35)",i.fillRect(o-c+2,s+r-2-d,n.carW-4,d)}t.riders>0&&kt(i,o,s,n.carW,n.carH,n.carDotR,t.riders,n.fontSmall)}#w(t,o,a,n,i){const s=performance.now(),c=Math.max(1,i),r=ut/c,l=30/c,f=n.padX+n.labelW,m=f+n.upColW;for(const d of t.cars){const p=this.#s.get(d.id),h=d.riders,g=d.phase,y=o.get(d.id);let _=null,v=1/0;for(let b=0;b<t.stops.length;b++){const w=Math.abs(t.stops[b].y-d.y);w<v&&(v=w,_=b)}const I=g==="loading"&&v<.5?_:null;if(p&&y!=null){const b=h-p.riders;if(I!=null&&b!==0){const w=t.stops[I],T=a(w.y),C=a(d.y),x=Math.min(Math.abs(b),6);if(b>0){const k=w.waiting_up>=w.waiting_down,L=k?f+n.upColW/2:m+n.dnColW/2,W=k?O:$;for(let E=0;E<x;E++)this.#i.push({kind:"board",bornAt:s+E*l,duration:r,startX:L,startY:T,endX:y,endY:C,color:W})}else for(let k=0;k<x;k++)this.#i.push({kind:"alight",bornAt:s+k*l,duration:r,startX:y,startY:C,endX:y+18,endY:C+10,color:nt})}}this.#s.set(d.id,{riders:h})}for(let d=this.#i.length-1;d>=0;d--){const p=this.#i[d];s-p.bornAt>p.duration&&this.#i.splice(d,1)}if(this.#s.size>t.cars.length){const d=new Set(t.cars.map(p=>p.id));for(const p of this.#s.keys())d.has(p)||this.#s.delete(p)}}#y(t){const o=performance.now(),a=this.#e;for(const n of this.#i){const i=o-n.bornAt;if(i<0)continue;const s=Math.min(1,Math.max(0,i/n.duration)),c=bt(s),[r,l]=n.kind==="board"?yt(n.startX,n.startY,n.endX,n.endY,c):[n.startX+(n.endX-n.startX)*c,n.startY+(n.endY-n.startY)*c],f=n.kind==="alight"?1-c:.9;a.fillStyle=J(n.color,f),a.beginPath(),a.arc(r,l,t.carDotR,0,Math.PI*2),a.fill()}}#b(t,o,a,n){const i=this.#e,s=a-n.padBottom+(n.padBottom-n.sparkH)/2,c=s+n.sparkH,r=n.padX,l=o-n.padX,f=Math.max(l-r,1);if(i.font=`${n.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,i.textBaseline="top",i.fillStyle=mt,i.textAlign="left",i.fillText(this.#f,r,s-1),t.length===0)return;const m=t[t.length-1];if(i.fillStyle=q,i.textAlign="right",i.fillText(m.toFixed(1),l,s-1),t.length<2)return;const d=Math.max(1,...t),p=f/Math.max(t.length-1,1),h=g=>c-g/d*(c-s);i.strokeStyle=pt,i.lineWidth=1,i.beginPath(),i.moveTo(r,c),i.lineTo(l,c),i.stroke(),i.strokeStyle=this.#l,i.lineWidth=1.4,i.beginPath();for(let g=0;g<t.length;g++){const y=r+g*p,_=h(t[g]);g===0?i.moveTo(y,_):i.lineTo(y,_)}i.stroke()}get canvas(){return this.#t}}function V(e,t,o,a,n,i,s,c){const r=n*2+1.2,l=Math.max(1,Math.floor((a-10)/r)),f=Math.min(i,l);e.fillStyle=s;for(let m=0;m<f;m++){const d=t+n+m*r;e.beginPath(),e.arc(d,o,n,0,Math.PI*2),e.fill()}i>f&&(e.fillStyle=ot,e.font=`${c.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="left",e.textBaseline="middle",e.fillText(`+${i-f}`,t+n+f*r,o))}function kt(e,t,o,a,n,i,s,c){const f=a-6,m=n-6,d=i*2+1.2,p=Math.max(1,Math.floor(f/d)),h=Math.max(1,Math.floor(m/d)),g=p*h,y=Math.min(s,g),_=s-y,v=t-a/2+3+i,I=o-n/2+3+i;e.fillStyle=nt;const b=_>0?y-1:y;for(let w=0;w<b;w++){const T=w%p,C=Math.floor(w/p),x=v+T*d,k=I+C*d;e.beginPath(),e.arc(x,k,i,0,Math.PI*2),e.fill()}if(_>0){e.fillStyle=ot,e.font=`${c.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="center",e.textBaseline="middle";const w=b,T=w%p,C=Math.floor(w/p),x=v+T*d,k=I+C*d;e.fillText(`+${s-b}`,x,k)}}function j(e,t){const o=e.match(/^#?([0-9a-f]{6})$/i);if(!o)return e;const a=parseInt(o[1],16),n=a>>16&255,i=a>>8&255,s=a&255,c=r=>t>=0?Math.round(r+(255-r)*t):Math.round(r*(1+t));return`rgb(${c(n)}, ${c(i)}, ${c(s)})`}function J(e,t){const o=e.match(/^#?([0-9a-f]{6})$/i);if(!o)return e;const a=parseInt(o[1],16),n=a>>16&255,i=a>>8&255,s=a&255;return`rgba(${n}, ${i}, ${s}, ${t})`}function xt(e,t,o){if(e.measureText(t).width<=o)return t;const a="…";let n=0,i=t.length;for(;n<i;){const s=n+i+1>>1;e.measureText(t.slice(0,s)+a).width<=o?n=s:i=s-1}return n===0?a:t.slice(0,n)+a}const R={scenario:"office-5",strategyA:"look",strategyB:"etd",compare:!1,seed:42,trafficRate:40,speed:1},vt=["scan","look","nearest","etd"];function Q(e,t){return e!==null&&vt.includes(e)?e:t}function Ct(e){const t=new URLSearchParams;return t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB),e.compare&&t.set("c","1"),t.set("k",String(e.seed)),t.set("t",String(e.trafficRate)),t.set("x",String(e.speed)),`?${t.toString()}`}function It(e){const t=new URLSearchParams(e);return{scenario:t.get("s")??R.scenario,strategyA:Q(t.get("a")??t.get("d"),R.strategyA),strategyB:Q(t.get("b"),R.strategyB),compare:t.get("c")==="1",seed:N(t.get("k"),R.seed),trafficRate:N(t.get("t"),R.trafficRate),speed:N(t.get("x"),R.speed)}}function N(e,t){if(e===null)return t;const o=Number(e);return Number.isFinite(o)?o:t}const it={id:"office-5",label:"5-floor office",description:"Five stops, one car. Heavy enough traffic to see queues form.",suggestedTrafficRate:40,ron:`SimConfig(
    building: BuildingConfig(
        name: "5-Floor Office",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.0, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 60, door_transition_ticks: 15,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 180,
        weight_range: (50.0, 100.0),
    ),
)`},Tt={id:"skyscraper-12",label:"12-floor skyscraper",description:"Twelve stops, three cars on one shaft bank. Stress-tests dispatch.",suggestedTrafficRate:120,ron:`SimConfig(
    building: BuildingConfig(
        name: "12-Floor Skyscraper",
        stops: [
            StopConfig(id: StopId(0),  name: "Lobby",    position: 0.0),
            StopConfig(id: StopId(1),  name: "Floor 2",  position: 4.0),
            StopConfig(id: StopId(2),  name: "Floor 3",  position: 8.0),
            StopConfig(id: StopId(3),  name: "Floor 4",  position: 12.0),
            StopConfig(id: StopId(4),  name: "Floor 5",  position: 16.0),
            StopConfig(id: StopId(5),  name: "Floor 6",  position: 20.0),
            StopConfig(id: StopId(6),  name: "Floor 7",  position: 24.0),
            StopConfig(id: StopId(7),  name: "Floor 8",  position: 28.0),
            StopConfig(id: StopId(8),  name: "Floor 9",  position: 32.0),
            StopConfig(id: StopId(9),  name: "Floor 10", position: 36.0),
            StopConfig(id: StopId(10), name: "Floor 11", position: 40.0),
            StopConfig(id: StopId(11), name: "Floor 12", position: 44.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(0),
            door_open_ticks: 60, door_transition_ticks: 18,
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(4),
            door_open_ticks: 60, door_transition_ticks: 18,
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(8),
            door_open_ticks: 60, door_transition_ticks: 18,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 60,
        weight_range: (50.0, 100.0),
    ),
)`},Rt={id:"rush-hour",label:"Rush-hour office",description:"5-floor office with 2 cars and very high arrival rate.",suggestedTrafficRate:180,ron:`SimConfig(
    building: BuildingConfig(
        name: "Rush-Hour Office",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.8, deceleration: 2.2,
            weight_capacity: 900.0,
            starting_stop: StopId(0),
            door_open_ticks: 45, door_transition_ticks: 12,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.8, deceleration: 2.2,
            weight_capacity: 900.0,
            starting_stop: StopId(4),
            door_open_ticks: 45, door_transition_ticks: 12,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (50.0, 100.0),
    ),
)`},At={id:"space-elevator",label:"Space elevator",description:"Two stops 1,000 km apart. Same engine, different scale.",suggestedTrafficRate:8,ron:`SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station",     position: 0.0),
            StopConfig(id: StopId(1), name: "Orbital Platform",  position: 1000.0),
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
        mean_interval_ticks: 600,
        weight_range: (60.0, 90.0),
    ),
)`},at=[it,Tt,Rt,At];function st(e){return at.find(t=>t.id===e)??it}let H=null;async function Mt(){if(!H){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;H=import(e).then(async o=>(await o.default(t),o))}return H}class z{#t;#e;constructor(t){this.#t=t,this.#e=t.dt()}static async create(t,o){const a=await Mt();return new z(new a.WasmSim(t,o))}step(t){this.#t.stepMany(t),this.#t.drainEvents()}get dt(){return this.#e}tick(){return Number(this.#t.currentTick())}strategyName(){return this.#t.strategyName()}setStrategy(t){return this.#t.setStrategy(t)}spawnRider(t,o,a){this.#t.spawnRider(t,o,a)}setTrafficRate(t){this.#t.setTrafficRate(t)}trafficRate(){return this.#t.trafficRate()}snapshot(){return this.#t.snapshot()}metrics(){return this.#t.metrics()}waitingCountAt(t){return this.#t.waitingCountAt(t)}dispose(){this.#t.free()}}class rt{#t;#e=0;constructor(t){this.#t=Lt(BigInt(t>>>0))}drainSpawns(t,o,a){if(o<=0||t.stops.length<2)return[];const n=Math.min(a,4/60);this.#e+=o/60*n;const i=[];for(;this.#e>=1;)this.#e-=1,i.push(this.#n(t));return i}#n(t){const o=t.stops,a=this.#a(o.length);let n=this.#a(o.length);n===a&&(n=(n+1)%o.length);const i=50+this.#r()*50;return{originStopId:o[a].stop_id,destStopId:o[n].stop_id,weight:i}}#o(){let t=this.#t=this.#t+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#a(t){return Number(this.#o()%BigInt(t))}#r(){return Number(this.#o()>>11n)/2**53}}function Lt(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const Et=["scan","look","nearest","etd"],F={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD"},Bt=120,Wt="#7dd3fc",Pt="#fda4af",ct=e=>`${e}×`,D=e=>`${e} / min`;async function Ft(){const e=Ot(),t={...R,...It(window.location.search)};$t(t,e);const o={running:!0,ready:!1,permalink:t,paneA:null,paneB:null,traffic:new rt(t.seed),lastFrameTime:performance.now(),initToken:0};Nt(o,e),await A(o,e),o.ready=!0,Ht(o)}function Ot(){const e=a=>{const n=document.getElementById(a);if(!n)throw new Error(`missing element #${a}`);return n},t=(a,n)=>({root:e(`pane-${a}`),canvas:e(`shaft-${a}`),name:e(`name-${a}`),metrics:e(`metrics-${a}`),accent:n}),o={scenarioSelect:e("scenario"),strategyASelect:e("strategy-a"),strategyBSelect:e("strategy-b"),compareToggle:e("compare"),strategyBWrap:e("strategy-b-wrap"),seedInput:e("seed"),speedInput:e("speed"),speedLabel:e("speed-label"),trafficInput:e("traffic"),trafficLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),layout:e("layout"),loader:e("loader"),toast:e("toast"),paneA:t("a",Wt),paneB:t("b",Pt)};for(const a of at){const n=document.createElement("option");n.value=a.id,n.textContent=a.label,n.title=a.description,o.scenarioSelect.appendChild(n)}for(const a of Et)for(const n of[o.strategyASelect,o.strategyBSelect]){const i=document.createElement("option");i.value=a,i.textContent=F[a],n.appendChild(i)}return o}function $t(e,t){t.scenarioSelect.value=e.scenario,t.strategyASelect.value=e.strategyA,t.strategyBSelect.value=e.strategyB,t.compareToggle.checked=e.compare,t.strategyBWrap.classList.toggle("hidden",!e.compare),t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=String(e.seed),t.speedInput.value=String(e.speed),t.speedLabel.textContent=ct(e.speed),t.trafficInput.value=String(e.trafficRate),t.trafficLabel.textContent=D(e.trafficRate)}function Y(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}function P(e){e?.sim.dispose(),e?.renderer.dispose()}async function Z(e,t,o){const a=st(o.permalink.scenario),n=await z.create(a.ron,t);n.setTrafficRate(o.permalink.trafficRate);const i=new _t(e.canvas,e.accent);return e.name.textContent=F[t],Ut(e.metrics),{strategy:t,sim:n,renderer:i,metricsEl:e.metrics,waitHistory:[],latestMetrics:null}}async function A(e,t){const o=++e.initToken;t.loader.classList.add("show"),e.traffic=new rt(e.permalink.seed),P(e.paneA),P(e.paneB),e.paneA=null,e.paneB=null;try{const a=await Z(t.paneA,e.permalink.strategyA,e);if(o!==e.initToken){P(a);return}if(e.paneA=a,e.permalink.compare){const n=await Z(t.paneB,e.permalink.strategyB,e);if(o!==e.initToken){P(n);return}e.paneB=n}}catch(a){throw o===e.initToken&&M(t,`Init failed: ${a.message}`),a}finally{o===e.initToken&&t.loader.classList.remove("show")}}function Nt(e,t){t.scenarioSelect.addEventListener("change",async()=>{const o=st(t.scenarioSelect.value);e.permalink={...e.permalink,scenario:o.id,trafficRate:o.suggestedTrafficRate},t.trafficInput.value=String(e.permalink.trafficRate),t.trafficLabel.textContent=D(e.permalink.trafficRate),t.trafficInput.max=String(Math.max(Number(t.trafficInput.max),e.permalink.trafficRate+20)),await A(e,t),M(t,`${o.label}`)}),t.strategyASelect.addEventListener("change",async()=>{e.permalink={...e.permalink,strategyA:t.strategyASelect.value},await A(e,t),M(t,`A: ${F[e.permalink.strategyA]}`)}),t.strategyBSelect.addEventListener("change",async()=>{e.permalink={...e.permalink,strategyB:t.strategyBSelect.value},e.permalink.compare&&(await A(e,t),M(t,`B: ${F[e.permalink.strategyB]}`))}),t.compareToggle.addEventListener("change",async()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},t.strategyBWrap.classList.toggle("hidden",!e.permalink.compare),t.layout.dataset.mode=e.permalink.compare?"compare":"single",await A(e,t),M(t,e.permalink.compare?"Compare on":"Compare off")}),t.seedInput.addEventListener("change",async()=>{const o=Number(t.seedInput.value);Number.isFinite(o)&&(e.permalink={...e.permalink,seed:o},await A(e,t))}),t.speedInput.addEventListener("input",()=>{const o=Number(t.speedInput.value);e.permalink.speed=o,t.speedLabel.textContent=ct(o)}),t.trafficInput.addEventListener("input",()=>{const o=Number(t.trafficInput.value);e.permalink.trafficRate=o,Y(e,a=>a.sim.setTrafficRate(o)),t.trafficLabel.textContent=D(o)}),t.playBtn.addEventListener("click",()=>{e.running=!e.running,t.playBtn.textContent=e.running?"Pause":"Play"}),t.resetBtn.addEventListener("click",()=>{A(e,t),M(t,"Reset")}),t.shareBtn.addEventListener("click",async()=>{const o=Ct(e.permalink),a=`${window.location.origin}${window.location.pathname}${o}`;window.history.replaceState(null,"",o),await navigator.clipboard.writeText(a).catch(()=>{}),M(t,"Permalink copied")})}function Ht(e){const t=()=>{const o=performance.now(),a=(o-e.lastFrameTime)/1e3;if(e.lastFrameTime=o,e.running&&e.ready&&e.paneA){const n=e.permalink.speed;Y(e,r=>r.sim.step(n));const i=e.paneA.sim.snapshot(),s=e.traffic.drainSpawns(i,e.permalink.trafficRate,a);for(const r of s)Y(e,l=>l.sim.spawnRider(r.originStopId,r.destStopId,r.weight));const c=e.permalink.speed;tt(e.paneA,e.paneA.sim.snapshot(),c),e.paneB&&tt(e.paneB,e.paneB.sim.snapshot(),c),Xt(e)}requestAnimationFrame(t)};requestAnimationFrame(t)}function tt(e,t,o){const a=e.sim.metrics();e.latestMetrics=a,e.waitHistory.push(a.avg_wait_s),e.waitHistory.length>Bt&&e.waitHistory.shift(),e.renderer.draw(t,e.waitHistory,o)}function Xt(e){const t=e.paneA;if(!t?.latestMetrics)return;const o=e.paneB;if(o?.latestMetrics){const a=Dt(t.latestMetrics,o.latestMetrics);X(t.metricsEl,t.latestMetrics,a.a),X(o.metricsEl,o.latestMetrics,a.b)}else X(t.metricsEl,t.latestMetrics,null)}function Dt(e,t){const o=(p,h,g,y)=>Math.abs(p-h)<g?["tie","tie"]:(y?p>h:p<h)?["win","lose"]:["lose","win"],[a,n]=o(e.avg_wait_s,t.avg_wait_s,.05,!1),[i,s]=o(e.max_wait_s,t.max_wait_s,.05,!1),[c,r]=o(e.delivered,t.delivered,.5,!0),[l,f]=o(e.abandoned,t.abandoned,.5,!1),[m,d]=o(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:a,max_wait_s:i,delivered:c,abandoned:l,utilization:m},b:{avg_wait_s:n,max_wait_s:s,delivered:r,abandoned:f,utilization:d}}}const U=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function Yt(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Ut(e){const t=document.createDocumentFragment();for(const[o]of U){const a=document.createElement("div");a.className="metric-row";const n=document.createElement("span");n.className="metric-k",n.textContent=o;const i=document.createElement("span");i.className="metric-v",a.append(n,i),t.appendChild(a)}e.replaceChildren(t)}function X(e,t,o){const a=e.children;for(let n=0;n<U.length;n++){const i=a[n],s=U[n][1],c=o?o[s]:"";i.dataset.verdict!==c&&(i.dataset.verdict=c);const r=i.lastElementChild,l=Yt(t,s);r.textContent!==l&&(r.textContent=l)}}let et=0;function M(e,t){e.toast.textContent=t,e.toast.classList.add("show"),window.clearTimeout(et),et=window.setTimeout(()=>e.toast.classList.remove("show"),1600)}Ft();
