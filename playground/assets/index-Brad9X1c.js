(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const s of o)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function i(o){const s={};return o.integrity&&(s.integrity=o.integrity),o.referrerPolicy&&(s.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?s.credentials="include":o.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(o){if(o.ep)return;o.ep=!0;const s=i(o);fetch(o.href,s)}})();const u=32,v=28,y=20,N=2,U={idle:"#4b5563",moving:"#10b981",repositioning:"#8b5cf6","door-opening":"#f59e0b",loading:"#3b82f6","door-closing":"#f59e0b",stopped:"#64748b",unknown:"#9ca3af"};class O{#t;#e;#n;#i;constructor(t){this.#t=t;const i=t.getContext("2d");if(!i)throw new Error("2D context unavailable");this.#e=i,this.#n=window.devicePixelRatio||1,this.#o(),this.#i=()=>this.#o(),window.addEventListener("resize",this.#i)}dispose(){window.removeEventListener("resize",this.#i)}#o(){const{clientWidth:t,clientHeight:i}=this.#t;this.#t.width=t*this.#n,this.#t.height=i*this.#n,this.#e.setTransform(this.#n,0,0,this.#n,0,0)}draw(t){const{clientWidth:i,clientHeight:n}=this.#t;if(this.#e.clearRect(0,0,i,n),t.stops.length===0)return;const o=Math.min(...t.stops.map(l=>l.y)),s=Math.max(...t.stops.map(l=>l.y)),r=o-1,a=s+1,f=Math.max(a-r,1e-4),p=l=>n-u-(l-r)/f*(n-2*u),c=Array.from(new Set(t.cars.map(l=>l.line))).sort((l,m)=>l-m),d=Math.max(c.length,1),h=(i-2*u-120)/d;this.#s(t,p);for(let l=0;l<c.length;l++){const m=c[l],g=u+120+h*(l+.5);this.#r(g,n);const w=t.cars.filter(_=>_.line===m);for(const _ of w)this.#a(_,g,p)}}#s(t,i){const n=this.#e;n.font="12px ui-sans-serif, system-ui, sans-serif",n.textBaseline="middle";for(const o of t.stops){const s=i(o.y);if(n.strokeStyle="#1f2937",n.lineWidth=N,n.beginPath(),n.moveTo(u+100,s),n.lineTo(this.#t.clientWidth-u,s),n.stroke(),n.fillStyle="#d1d5db",n.textAlign="left",n.fillText(o.name,u,s),o.waiting>0){const r=u+80;n.fillStyle=o.waiting>5?"#ef4444":"#f59e0b";const a=9;n.beginPath(),n.arc(r,s,a,0,Math.PI*2),n.fill(),n.fillStyle="#0f172a",n.textAlign="center",n.fillText(String(o.waiting),r,s)}}}#r(t,i){const n=this.#e;n.strokeStyle="#111827",n.lineWidth=1,n.beginPath(),n.moveTo(t,u),n.lineTo(t,i-u),n.stroke()}#a(t,i,n){const o=this.#e,s=n(t.y);o.fillStyle=U[t.phase]??"#9ca3af",o.fillRect(i-v/2,s-y/2,v,y),o.strokeStyle="#0b1220",o.lineWidth=1,o.strokeRect(i-v/2,s-y/2,v,y);const r=t.capacity>0?Math.min(t.load/t.capacity,1):0;if(r>0){const a=(y-4)*r;o.fillStyle="rgba(15, 23, 42, 0.45)",o.fillRect(i-v/2+2,s+y/2-2-a,v-4,a)}o.fillStyle="#f9fafb",o.font="10px ui-sans-serif, system-ui, sans-serif",o.textAlign="center",o.textBaseline="middle",o.fillText(String(t.riders),i,s)}get canvas(){return this.#t}}const W="#334155",D="#1e293b",C="#94a3b8";function I(e){const t=e.getContext("2d");if(!t)throw new Error("2D context unavailable");const i=window.devicePixelRatio||1,{clientWidth:n,clientHeight:o}=e;return(e.width!==n*i||e.height!==o*i)&&(e.width=n*i,e.height=o*i),t.setTransform(i,0,0,i,0,0),t}function j(e,t,i){const n=I(e),{clientWidth:o,clientHeight:s}=e;if(n.clearRect(0,0,o,s),n.fillStyle=C,n.font="11px ui-sans-serif, system-ui, sans-serif",n.textBaseline="top",n.fillText(i,4,4),t.length<2)return;const r=0,a=Math.max(1,...t),f=(o-8)/Math.max(t.length-1,1),p=d=>s-4-(d-r)/(a-r)*(s-24);n.strokeStyle=D,n.beginPath(),n.moveTo(4,p(a)),n.lineTo(o-4,p(a)),n.stroke(),n.strokeStyle="#38bdf8",n.lineWidth=1.5,n.beginPath(),t.forEach((d,h)=>{const l=4+h*f,m=p(d);h===0?n.moveTo(l,m):n.lineTo(l,m)}),n.stroke();const c=t[t.length-1];n.fillStyle="#e2e8f0",n.textAlign="right",n.textBaseline="top",n.fillText(c.toFixed(1),o-4,4),n.textAlign="left"}function q(e,t,i){const n=I(e),{clientWidth:o,clientHeight:s}=e;if(n.clearRect(0,0,o,s),n.fillStyle=C,n.font="11px ui-sans-serif, system-ui, sans-serif",n.textBaseline="top",n.fillText(i,4,4),t.length===0)return;const r=Math.max(1,...t),a=(o-8)/t.length;for(let f=0;f<t.length;f++){const c=t[f]/r*(s-24),d=4+f*a,h=s-4-c;n.fillStyle="#22d3ee",n.fillRect(d+.5,h,Math.max(a-1,1),c)}}class z{#t;#e=[];#n=[];#i;constructor(t,i=60){this.#t=t,this.#i=i}record(t){t.stops.length!==this.#e.length&&(this.#e=t.stops.map(()=>[]),this.#n=t.stops.map(i=>i.name)),t.stops.forEach((i,n)=>{const o=this.#e[n];o.push(i.waiting),o.length>this.#i&&o.shift()})}draw(){const t=I(this.#t),{clientWidth:i,clientHeight:n}=this.#t;if(t.clearRect(0,0,i,n),t.fillStyle=C,t.font="11px ui-sans-serif, system-ui, sans-serif",t.textBaseline="top",t.fillText("Queue heatmap",4,4),this.#e.length===0)return;const o=56,s=o,r=20,a=i-s-4,f=n-r-4,p=f/this.#e.length,c=a/this.#i,d=Math.max(1,...this.#e.flatMap(h=>h));t.textBaseline="middle",t.textAlign="right",this.#e.forEach((h,l)=>{const m=r+l*p;t.fillStyle=C,t.fillText(this.#n[l]??`#${l}`,o-4,m+p/2);for(let g=0;g<h.length;g++){const w=h[h.length-1-g],_=Math.min(1,w/d);t.fillStyle=G(_);const H=s+(this.#i-1-g)*c;t.fillRect(H,m+1,Math.max(c-.5,1),Math.max(p-2,1))}}),t.strokeStyle=W,t.strokeRect(s,r,a,f),t.textAlign="left"}reset(){this.#e=[],this.#n=[]}}function G(e){if(e<=0)return"#0b1220";const t=Math.round(255*Math.min(1,e*1.4)),i=Math.round(80+120*e),n=Math.round(120*(1-e));return`rgb(${t}, ${i}, ${n})`}const L=500,Y={"rider-spawned":"spawn","rider-boarded":"board","rider-exited":"exit","rider-abandoned":"abandon","elevator-arrived":"arrive","elevator-departed":"depart","door-opened":"door+","door-closed":"door-","elevator-assigned":"assign",other:"other"};class X{#t;#e=[];#n=!0;constructor(t){this.#t=t,t.addEventListener("scroll",()=>{const i=t.scrollHeight-t.scrollTop-t.clientHeight<24;this.#n=i})}append(t){t.length!==0&&(this.#e.push(...t),this.#e.length>L&&(this.#e=this.#e.slice(this.#e.length-L)),this.#i())}reset(){this.#e=[],this.#n=!0,this.#i()}#i(){const t=document.createDocumentFragment();for(const i of this.#e){const n=document.createElement("li");n.className=`evt evt-${i.kind}`,n.textContent=K(i),t.appendChild(n)}this.#t.replaceChildren(t),this.#n&&(this.#t.scrollTop=this.#t.scrollHeight)}snapshot(){return this.#e.slice()}}function K(e){const t=Y[e.kind],i=[`t=${e.tick}`,t];return e.rider!==void 0&&i.push(`r${e.rider}`),e.elevator!==void 0&&i.push(`e${e.elevator}`),e.stop!==void 0&&i.push(`s${e.stop}`),e.origin!==void 0&&e.destination!==void 0&&i.push(`${e.origin}→${e.destination}`),e.label&&i.push(e.label),i.join("  ")}const Q="modulepreload",V=function(e,t){return new URL(e,t).href},T={},J=function(t,i,n){let o=Promise.resolve();if(i&&i.length>0){let r=function(c){return Promise.all(c.map(d=>Promise.resolve(d).then(h=>({status:"fulfilled",value:h}),h=>({status:"rejected",reason:h}))))};const a=document.getElementsByTagName("link"),f=document.querySelector("meta[property=csp-nonce]"),p=f?.nonce||f?.getAttribute("nonce");o=r(i.map(c=>{if(c=V(c,n),c in T)return;T[c]=!0;const d=c.endsWith(".css"),h=d?'[rel="stylesheet"]':"";if(!!n)for(let g=a.length-1;g>=0;g--){const w=a[g];if(w.href===c&&(!d||w.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${c}"]${h}`))return;const m=document.createElement("link");if(m.rel=d?"stylesheet":Q,d||(m.as="script"),m.crossOrigin="",m.href=c,p&&m.setAttribute("nonce",p),document.head.appendChild(m),d)return new Promise((g,w)=>{m.addEventListener("load",g),m.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${c}`)))})}))}function s(r){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=r,window.dispatchEvent(a),!a.defaultPrevented)throw r}return o.then(r=>{for(const a of r||[])a.status==="rejected"&&s(a.reason);return t().catch(s)})};function Z(e,t){const i="tick,kind,rider,elevator,stop,origin,destination,label",n=e.map(o=>[o.tick,o.kind,o.rider??"",o.elevator??"",o.stop??"",o.origin??"",o.destination??"",tt(o.label??"")].join(","));P(`${i}
${n.join(`
`)}`,t,"text/csv")}function tt(e){return/[",\n\r]/.test(e)?`"${e.replace(/"/g,'""')}"`:e}function et(e,t){const i="tick,delivered,abandoned,spawned,throughput,avg_wait_s,max_wait_s,avg_ride_s,utilization",n=e.map(({tick:o,metrics:s})=>[o,s.delivered,s.abandoned,s.spawned,s.throughput,s.avg_wait_s.toFixed(3),s.max_wait_s.toFixed(3),s.avg_ride_s.toFixed(3),s.utilization.toFixed(4)].join(","));P(`${i}
${n.join(`
`)}`,t,"text/csv")}function P(e,t,i){const n=new Blob([e],{type:i}),o=URL.createObjectURL(n),s=document.createElement("a");s.href=o,s.download=t,document.body.appendChild(s),s.click(),s.remove(),URL.revokeObjectURL(o)}class nt{#t=null;#e;#n=0;#i=66;constructor(t){this.#e=t}get isRecording(){return this.#t!==null}async start(){if(this.#t)return;const t=await J(()=>import("./gif-BO6_DgnQ.js").then(o=>o.g),[],import.meta.url),{width:i,height:n}=this.#e;this.#t=new t.default({workers:2,quality:10,width:i,height:n,transparent:null}),this.#n=performance.now()}captureIfDue(){if(!this.#t)return;const t=performance.now();t-this.#n<this.#i||(this.#t.addFrame(this.#e,{delay:this.#i,copy:!0}),this.#n=t)}async finish(t){if(!this.#t)return;const i=this.#t;this.#t=null,await new Promise(n=>{i.on("finished",o=>{const s=URL.createObjectURL(o),r=document.createElement("a");r.href=s,r.download=t,document.body.appendChild(r),r.click(),r.remove(),URL.revokeObjectURL(s),n()}),i.render()})}abort(){this.#t?.abort(),this.#t=null}}const S={scenario:"office-5",strategy:"look",seed:42,trafficRate:8,speed:4};function it(e){const t=new URLSearchParams;return t.set("s",e.scenario),t.set("d",e.strategy),t.set("k",String(e.seed)),t.set("t",String(e.trafficRate)),t.set("x",String(e.speed)),`?${t.toString()}`}function ot(e){const t=new URLSearchParams(e),i=t.get("d")??S.strategy;return{scenario:t.get("s")??S.scenario,strategy:["scan","look","nearest","etd","destination"].includes(i)?i:S.strategy,seed:k(t.get("k"),S.seed),trafficRate:k(t.get("t"),S.trafficRate),speed:k(t.get("x"),S.speed)}}function k(e,t){if(e===null)return t;const i=Number(e);return Number.isFinite(i)?i:t}const $={id:"office-5",label:"5-floor office",description:"Five stops, one car. Moderate traffic. A good warm-up.",suggestedTrafficRate:8,ron:`SimConfig(
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
)`},st={id:"skyscraper-12",label:"12-floor skyscraper",description:"Twelve stops, three cars. Heavier traffic stresses dispatch.",suggestedTrafficRate:30,ron:`SimConfig(
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
)`},rt={id:"rush-hour",label:"Rush-hour office",description:"5-floor office with 2 cars and very high arrival rate.",suggestedTrafficRate:60,ron:`SimConfig(
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
)`},at={id:"space-elevator",label:"Space elevator",description:"Two stops 1,000 km apart. Same engine, different scale.",suggestedTrafficRate:3,ron:`SimConfig(
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
)`},B=[$,st,rt,at];function M(e){return B.find(t=>t.id===e)??$}let R=null;async function ct(){if(!R){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;R=import(e).then(async i=>(await i.default(t),i))}return R}class E{#t;#e;constructor(t){this.#t=t,this.#e=t.dt()}static async create(t,i){const n=await ct();return new E(new n.WasmSim(t,i))}step(t){this.#t.stepMany(t)}get dt(){return this.#e}tick(){return Number(this.#t.currentTick())}strategyName(){return this.#t.strategyName()}setStrategy(t){return this.#t.setStrategy(t)}spawnRider(t,i,n){this.#t.spawnRider(t,i,n)}setTrafficRate(t){this.#t.setTrafficRate(t)}trafficRate(){return this.#t.trafficRate()}snapshot(){return this.#t.snapshot()}drainEvents(){return this.#t.drainEvents()}metrics(){return this.#t.metrics()}waitingCountAt(t){return this.#t.waitingCountAt(t)}dispose(){this.#t.free()}}class A{#t;#e=0;constructor(t){this.#t=lt(BigInt(t>>>0))}tickSpawns(t,i,n,o){if(n<=0||i.stops.length<2)return;const s=Math.min(o,4/60);for(this.#e+=n/60*s;this.#e>=1;)this.#e-=1,this.#n(t,i)}#n(t,i){const n=i.stops,o=this.#o(n.length);let s=this.#o(n.length);s===o&&(s=(s+1)%n.length);const r=50+this.#s()*50;try{t.spawnRider(n[o].stop_id,n[s].stop_id,r)}catch{}}#i(){let t=this.#t=this.#t+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#o(t){return Number(this.#i()%BigInt(t))}#s(){return Number(this.#i()>>11n)/2**53}}function lt(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const dt=1,ft=120;async function pt(){const e=ht(),t={...S,...ot(window.location.search)},i={running:!0,speed:t.speed,permalink:t,sim:null,traffic:new A(t.seed),metricsHistory:[],metricsSamples:[],lastFrameTime:performance.now(),heatmap:new z(e.heatmapCanvas,90),renderer:new O(e.shaftCanvas),eventLog:new X(e.eventLogList),gifRecorder:new nt(e.shaftCanvas)};await b(i,e),gt(i,e),ut(i,e)}function ht(){const e=i=>{const n=document.getElementById(i);if(!n)throw new Error(`missing element #${i}`);return n},t={scenarioSelect:e("scenario"),strategySelect:e("strategy"),seedInput:e("seed"),speedInput:e("speed"),speedLabel:e("speed-label"),trafficInput:e("traffic"),trafficLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),csvEventsBtn:e("csv-events"),csvMetricsBtn:e("csv-metrics"),gifBtn:e("gif"),shaftCanvas:e("shaft"),waitChart:e("wait-chart"),queueChart:e("queue-chart"),heatmapCanvas:e("heatmap"),eventLogList:e("event-log"),metricsPanel:e("metrics"),toast:e("toast")};for(const i of B){const n=document.createElement("option");n.value=i.id,n.textContent=i.label,n.title=i.description,t.scenarioSelect.appendChild(n)}for(const i of["scan","look","nearest","etd","destination"]){const n=document.createElement("option");n.value=i,n.textContent=i.toUpperCase(),t.strategySelect.appendChild(n)}return t}async function b(e,t){e.sim?.dispose(),e.sim=null,e.metricsHistory=[],e.metricsSamples=[],e.eventLog.reset(),e.heatmap.reset();const i=M(e.permalink.scenario);mt(e.permalink,t);const n=await E.create(i.ron,e.permalink.strategy);n.setTrafficRate(e.permalink.trafficRate),e.sim=n,e.traffic=new A(e.permalink.seed),x(t,`${i.label} · ${e.permalink.strategy.toUpperCase()}`)}function mt(e,t){t.scenarioSelect.value=e.scenario,t.strategySelect.value=e.strategy,t.seedInput.value=String(e.seed),t.speedInput.value=String(e.speed),t.speedLabel.textContent=`${e.speed}×`,t.trafficInput.value=String(e.trafficRate),t.trafficLabel.textContent=`${e.trafficRate} / min`}function gt(e,t){t.scenarioSelect.addEventListener("change",()=>{e.permalink={...e.permalink,scenario:t.scenarioSelect.value};const i=M(e.permalink.scenario);e.permalink.trafficRate=i.suggestedTrafficRate,b(e,t)}),t.strategySelect.addEventListener("change",()=>{e.permalink={...e.permalink,strategy:t.strategySelect.value},e.sim?.setStrategy(e.permalink.strategy),x(t,`strategy → ${e.permalink.strategy.toUpperCase()}`)}),t.seedInput.addEventListener("change",()=>{const i=Number(t.seedInput.value);Number.isFinite(i)&&(e.permalink={...e.permalink,seed:i},b(e,t))}),t.speedInput.addEventListener("input",()=>{const i=Number(t.speedInput.value);e.permalink.speed=i,e.speed=i,t.speedLabel.textContent=`${i}×`}),t.trafficInput.addEventListener("input",()=>{const i=Number(t.trafficInput.value);e.permalink.trafficRate=i,e.sim?.setTrafficRate(i),t.trafficLabel.textContent=`${i} / min`}),t.playBtn.addEventListener("click",()=>{e.running=!e.running,t.playBtn.textContent=e.running?"Pause":"Play"}),t.resetBtn.addEventListener("click",()=>{b(e,t)}),t.shareBtn.addEventListener("click",async()=>{const i=it(e.permalink),n=`${window.location.origin}${window.location.pathname}${i}`;window.history.replaceState(null,"",i),await navigator.clipboard.writeText(n).catch(()=>{}),x(t,"Permalink copied")}),t.csvEventsBtn.addEventListener("click",()=>{Z(e.eventLog.snapshot(),"elevator-events.csv")}),t.csvMetricsBtn.addEventListener("click",()=>{et(e.metricsSamples,"elevator-metrics.csv")}),t.gifBtn.addEventListener("click",async()=>{e.gifRecorder.isRecording?(x(t,"Encoding GIF…"),await e.gifRecorder.finish("elevator-playground.gif"),t.gifBtn.textContent="Record",x(t,"GIF saved")):(await e.gifRecorder.start(),t.gifBtn.textContent="Stop & save",x(t,"Recording GIF"))})}function ut(e,t){const i=()=>{const n=performance.now(),o=(n-e.lastFrameTime)/1e3;if(e.lastFrameTime=n,e.running&&e.sim){const s=dt*e.speed;e.sim.step(s);const r=e.sim.snapshot();e.traffic.tickSpawns(e.sim,r,e.permalink.trafficRate,o),e.renderer.draw(r);const a=e.sim.metrics();e.metricsHistory.push(a),e.metricsHistory.length>ft&&e.metricsHistory.shift(),e.metricsSamples.push({tick:r.tick,metrics:a}),e.metricsSamples.length>1e3&&e.metricsSamples.shift(),e.heatmap.record(r),wt(t.metricsPanel,a,r.tick,r.dt),j(t.waitChart,e.metricsHistory.map(f=>f.avg_wait_s),"Avg wait (s)"),q(t.queueChart,r.stops.map(f=>f.waiting),"Waiting per stop"),e.heatmap.draw(),e.eventLog.append(e.sim.drainEvents()),e.gifRecorder.captureIfDue()}requestAnimationFrame(i)};requestAnimationFrame(i)}function wt(e,t,i,n){const o=i*n,s=[["sim time",St(o)],["delivered",String(t.delivered)],["abandoned",String(t.abandoned)],["throughput (hr)",String(Math.round(t.throughput*(3600/60)))],["avg wait",`${t.avg_wait_s.toFixed(1)} s`],["max wait",`${t.max_wait_s.toFixed(1)} s`],["avg ride",`${t.avg_ride_s.toFixed(1)} s`],["utilization",`${(t.utilization*100).toFixed(0)}%`],["abandonment",`${(t.abandonment_rate*100).toFixed(1)}%`],["distance",`${t.total_distance.toFixed(1)} m`]],r=document.createDocumentFragment();for(const[a,f]of s){const p=document.createElement("div");p.className="row";const c=document.createElement("span");c.className="k",c.textContent=a;const d=document.createElement("span");d.className="v",d.textContent=f,p.append(c,d),r.appendChild(p)}e.replaceChildren(r)}function St(e){if(e<60)return`${e.toFixed(0)} s`;const t=Math.floor(e/60),i=Math.floor(e%60);return`${t}m ${i}s`}let F=0;function x(e,t){e.toast.textContent=t,e.toast.classList.add("show"),window.clearTimeout(F),F=window.setTimeout(()=>e.toast.classList.remove("show"),1800)}pt();
