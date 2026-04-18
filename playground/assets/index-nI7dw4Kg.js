(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function n(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(o){if(o.ep)return;o.ep=!0;const a=n(o);fetch(o.href,a)}})();function K(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(i,o)=>i+(o-i)*t;return{padding:n(10,24),carW:n(22,34),carH:n(18,26),labelW:n(44,70),dotsW:n(26,44),fontMain:n(10,12),fontSmall:n(9,10),stopDotR:n(2.3,2.8),carDotR:n(1.8,2.3)}}const j={idle:"#5d6271",moving:"#06c2b5",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b90a0",unknown:"#5d6271"},J="#1f2431",Q="#c8ccd6",Z="#7dd3fc",tt="#fbbf24",et="#f5f6f9",U="#8b90a0";class nt{#t;#e;#n;#o;#i=null;#a=-1;#s=new Map;constructor(t){this.#t=t;const n=t.getContext("2d");if(!n)throw new Error("2D context unavailable");this.#e=n,this.#n=window.devicePixelRatio||1,this.#r(),this.#o=()=>this.#r(),window.addEventListener("resize",this.#o)}dispose(){window.removeEventListener("resize",this.#o)}#r(){const{clientWidth:t,clientHeight:n}=this.#t;if(t===0||n===0)return;const i=t*this.#n,o=n*this.#n;(this.#t.width!==i||this.#t.height!==o)&&(this.#t.width=i,this.#t.height=o),this.#e.setTransform(this.#n,0,0,this.#n,0,0)}draw(t){this.#r();const{clientWidth:n,clientHeight:i}=this.#t;if(this.#e.clearRect(0,0,n,i),t.stops.length===0||n===0||i===0)return;n!==this.#a&&(this.#i=K(n),this.#a=n);const o=this.#i;let a=t.stops[0].y,r=t.stops[0].y;for(let d=1;d<t.stops.length;d++){const h=t.stops[d].y;h<a&&(a=h),h>r&&(r=h)}const s=a-1,c=r+1,f=Math.max(c-s,1e-4),l=d=>i-o.padding-(d-s)/f*(i-2*o.padding),g=this.#s;g.forEach(d=>d.length=0);for(const d of t.cars){const h=g.get(d.line);h?h.push(d):g.set(d.line,[d])}const p=[...g.keys()].sort((d,h)=>d-h),m=o.padding+o.labelW+o.dotsW+6,u=Math.max(0,n-m-o.padding),w=p.reduce((d,h)=>d+(g.get(h)?.length??1),0),y=u/Math.max(w,1);this.#c(t,l,o,m);let k=0;for(const d of p){const h=g.get(d)??[];for(const C of h){const S=m+y*(k+.5);this.#l(S,i,o),this.#d(C,S,l,o),k++}}}#c(t,n,i,o){const a=this.#e;a.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,a.textBaseline="middle";const r=i.padding,s=i.padding+i.labelW+4,c=this.#t.clientWidth-i.padding;for(const f of t.stops){const l=n(f.y);a.strokeStyle=J,a.lineWidth=1,a.beginPath(),a.moveTo(o,l),a.lineTo(c,l),a.stroke(),a.fillStyle=Q,a.textAlign="left",a.fillText(at(a,f.name,i.labelW-2),r,l),f.waiting>0&&ot(a,s,l,i.dotsW,i.stopDotR,f.waiting,f.waiting>5?tt:Z,i.fontSmall)}}#l(t,n,i){const o=this.#e,a=o.createLinearGradient(t,i.padding,t,n-i.padding);a.addColorStop(0,"rgba(39, 45, 58, 0)"),a.addColorStop(.5,"rgba(39, 45, 58, 0.9)"),a.addColorStop(1,"rgba(39, 45, 58, 0)"),o.strokeStyle=a,o.lineWidth=1,o.beginPath(),o.moveTo(t,i.padding),o.lineTo(t,n-i.padding),o.stroke()}#d(t,n,i,o){const a=this.#e,r=i(t.y),s=o.carW/2,c=o.carH/2,f=j[t.phase]??"#5d6271",l=a.createLinearGradient(n,r-c,n,r+c);l.addColorStop(0,$(f,.14)),l.addColorStop(1,$(f,-.18)),a.fillStyle=l,a.fillRect(n-s,r-c,o.carW,o.carH),a.strokeStyle="rgba(10, 12, 16, 0.9)",a.lineWidth=1,a.strokeRect(n-s+.5,r-c+.5,o.carW-1,o.carH-1);const g=t.capacity>0?Math.min(t.load/t.capacity,1):0;if(g>0){const p=(o.carH-4)*g;a.fillStyle="rgba(10, 12, 16, 0.35)",a.fillRect(n-s+2,r+c-2-p,o.carW-4,p)}t.riders>0&&it(a,n,r,o.carW,o.carH,o.carDotR,t.riders,o.fontSmall)}get canvas(){return this.#t}}function ot(e,t,n,i,o,a,r,s){const c=o*2+1.5,f=Math.max(1,Math.floor((i-10)/c)),l=Math.min(a,f);e.fillStyle=r;for(let g=0;g<l;g++){const p=t+o+g*c;e.beginPath(),e.arc(p,n,o,0,Math.PI*2),e.fill()}a>l&&(e.fillStyle=U,e.font=`${s.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="left",e.textBaseline="middle",e.fillText(`+${a-l}`,t+o+l*c,n))}function it(e,t,n,i,o,a,r,s){const l=i-6,g=o-6,p=a*2+1.2,m=Math.max(1,Math.floor(l/p)),u=Math.max(1,Math.floor(g/p)),w=m*u,y=Math.min(r,w),k=r-y,d=t-i/2+3+a,h=n-o/2+3+a;e.fillStyle=et;const C=k>0?y-1:y;for(let S=0;S<C;S++){const R=S%m,T=Math.floor(S/m),A=d+R*p,E=h+T*p;e.beginPath(),e.arc(A,E,a,0,Math.PI*2),e.fill()}if(k>0){e.fillStyle=U,e.font=`${s.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="center",e.textBaseline="middle";const S=C,R=S%m,T=Math.floor(S/m),A=d+R*p,E=h+T*p;e.fillText(`+${r-C}`,A,E)}}function $(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n)return e;const i=parseInt(n[1],16),o=i>>16&255,a=i>>8&255,r=i&255,s=c=>t>=0?Math.round(c+(255-c)*t):Math.round(c*(1+t));return`rgb(${s(o)}, ${s(a)}, ${s(r)})`}function at(e,t,n){if(e.measureText(t).width<=n)return t;const i="…";let o=0,a=t.length;for(;o<a;){const r=o+a+1>>1;e.measureText(t.slice(0,r)+i).width<=n?o=r:a=r-1}return o===0?i:t.slice(0,o)+i}const rt="#1f2431",st="#8b90a0";function ct(e){const t=e.getContext("2d");if(!t)throw new Error("2D context unavailable");const n=window.devicePixelRatio||1,{clientWidth:i,clientHeight:o}=e;return(e.width!==i*n||e.height!==o*n)&&(e.width=i*n,e.height=o*n),t.setTransform(n,0,0,n,0,0),t}function lt(e,t,n,i="#38bdf8"){const o=ct(e),{clientWidth:a,clientHeight:r}=e;if(o.clearRect(0,0,a,r),o.fillStyle=st,o.font="11px ui-sans-serif, system-ui, sans-serif",o.textBaseline="top",o.fillText(n,4,4),t.length<2)return;const s=0,c=Math.max(1,...t),f=(a-8)/Math.max(t.length-1,1),l=p=>r-4-(p-s)/(c-s)*(r-24);o.strokeStyle=rt,o.beginPath(),o.moveTo(4,l(c)),o.lineTo(a-4,l(c)),o.stroke(),o.strokeStyle=i,o.lineWidth=1.5,o.beginPath(),t.forEach((p,m)=>{const u=4+m*f,w=l(p);m===0?o.moveTo(u,w):o.lineTo(u,w)}),o.stroke();const g=t[t.length-1];o.fillStyle="#f5f6f9",o.textAlign="right",o.textBaseline="top",o.fillText(g.toFixed(1),a-4,4),o.textAlign="left"}const _={scenario:"office-5",strategyA:"look",strategyB:"etd",compare:!1,seed:42,trafficRate:40,speed:1},dt=["scan","look","nearest","etd"];function N(e,t){return e!==null&&dt.includes(e)?e:t}function ft(e){const t=new URLSearchParams;return t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB),e.compare&&t.set("c","1"),t.set("k",String(e.seed)),t.set("t",String(e.trafficRate)),t.set("x",String(e.speed)),`?${t.toString()}`}function pt(e){const t=new URLSearchParams(e);return{scenario:t.get("s")??_.scenario,strategyA:N(t.get("a")??t.get("d"),_.strategyA),strategyB:N(t.get("b"),_.strategyB),compare:t.get("c")==="1",seed:L(t.get("k"),_.seed),trafficRate:L(t.get("t"),_.trafficRate),speed:L(t.get("x"),_.speed)}}function L(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}const Y={id:"office-5",label:"5-floor office",description:"Five stops, one car. Heavy enough traffic to see queues form.",suggestedTrafficRate:40,ron:`SimConfig(
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
)`},gt={id:"skyscraper-12",label:"12-floor skyscraper",description:"Twelve stops, three cars on one shaft bank. Stress-tests dispatch.",suggestedTrafficRate:120,ron:`SimConfig(
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
)`},mt={id:"rush-hour",label:"Rush-hour office",description:"5-floor office with 2 cars and very high arrival rate.",suggestedTrafficRate:180,ron:`SimConfig(
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
)`},ht={id:"space-elevator",label:"Space elevator",description:"Two stops 1,000 km apart. Same engine, different scale.",suggestedTrafficRate:8,ron:`SimConfig(
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
)`},G=[Y,gt,mt,ht];function X(e){return G.find(t=>t.id===e)??Y}let B=null;async function ut(){if(!B){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;B=import(e).then(async n=>(await n.default(t),n))}return B}class O{#t;#e;constructor(t){this.#t=t,this.#e=t.dt()}static async create(t,n){const i=await ut();return new O(new i.WasmSim(t,n))}step(t){this.#t.stepMany(t),this.#t.drainEvents()}get dt(){return this.#e}tick(){return Number(this.#t.currentTick())}strategyName(){return this.#t.strategyName()}setStrategy(t){return this.#t.setStrategy(t)}spawnRider(t,n,i){this.#t.spawnRider(t,n,i)}setTrafficRate(t){this.#t.setTrafficRate(t)}trafficRate(){return this.#t.trafficRate()}snapshot(){return this.#t.snapshot()}metrics(){return this.#t.metrics()}waitingCountAt(t){return this.#t.waitingCountAt(t)}dispose(){this.#t.free()}}class q{#t;#e=0;constructor(t){this.#t=St(BigInt(t>>>0))}drainSpawns(t,n,i){if(n<=0||t.stops.length<2)return[];const o=Math.min(i,4/60);this.#e+=n/60*o;const a=[];for(;this.#e>=1;)this.#e-=1,a.push(this.#n(t));return a}#n(t){const n=t.stops,i=this.#i(n.length);let o=this.#i(n.length);o===i&&(o=(o+1)%n.length);const a=50+this.#a()*50;return{originStopId:n[i].stop_id,destStopId:n[o].stop_id,weight:a}}#o(){let t=this.#t=this.#t+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#i(t){return Number(this.#o()%BigInt(t))}#a(){return Number(this.#o()>>11n)/2**53}}function St(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const wt=["scan","look","nearest","etd"],I={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD"},yt=120,_t="#7dd3fc",bt="#fda4af",V=e=>`${e}×`,F=e=>`${e} / min`;async function vt(){const e=kt(),t={..._,...pt(window.location.search)};Ct(t,e);const n={running:!0,ready:!1,permalink:t,paneA:null,paneB:null,traffic:new q(t.seed),lastFrameTime:performance.now(),initToken:0};xt(n,e),await b(n,e),n.ready=!0,It(n)}function kt(){const e=i=>{const o=document.getElementById(i);if(!o)throw new Error(`missing element #${i}`);return o},t=i=>({root:e(`pane-${i}`),canvas:e(`shaft-${i}`),name:e(`name-${i}`),metrics:e(`metrics-${i}`),chart:e(`wait-chart-${i}`)}),n={scenarioSelect:e("scenario"),strategyASelect:e("strategy-a"),strategyBSelect:e("strategy-b"),compareToggle:e("compare"),strategyBWrap:e("strategy-b-wrap"),seedInput:e("seed"),speedInput:e("speed"),speedLabel:e("speed-label"),trafficInput:e("traffic"),trafficLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),layout:e("layout"),loader:e("loader"),toast:e("toast"),paneA:t("a"),paneB:t("b")};for(const i of G){const o=document.createElement("option");o.value=i.id,o.textContent=i.label,o.title=i.description,n.scenarioSelect.appendChild(o)}for(const i of wt)for(const o of[n.strategyASelect,n.strategyBSelect]){const a=document.createElement("option");a.value=i,a.textContent=I[i],o.appendChild(a)}return n}function Ct(e,t){t.scenarioSelect.value=e.scenario,t.strategyASelect.value=e.strategyA,t.strategyBSelect.value=e.strategyB,t.compareToggle.checked=e.compare,t.strategyBWrap.classList.toggle("hidden",!e.compare),t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=String(e.seed),t.speedInput.value=String(e.speed),t.speedLabel.textContent=V(e.speed),t.trafficInput.value=String(e.trafficRate),t.trafficLabel.textContent=F(e.trafficRate)}function P(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}function x(e){e?.sim.dispose(),e?.renderer.dispose()}async function H(e,t,n){const i=X(n.permalink.scenario),o=await O.create(i.ron,t);o.setTrafficRate(n.permalink.trafficRate);const a=new nt(e.canvas);return e.name.textContent=I[t],Et(e.metrics),{strategy:t,sim:o,renderer:a,metricsEl:e.metrics,waitChart:e.chart,waitHistory:[],latestMetrics:null}}async function b(e,t){const n=++e.initToken;t.loader.classList.add("show"),e.traffic=new q(e.permalink.seed),x(e.paneA),x(e.paneB),e.paneA=null,e.paneB=null;try{const i=await H(t.paneA,e.permalink.strategyA,e);if(n!==e.initToken){x(i);return}if(e.paneA=i,e.permalink.compare){const o=await H(t.paneB,e.permalink.strategyB,e);if(n!==e.initToken){x(o);return}e.paneB=o}}catch(i){throw n===e.initToken&&v(t,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function xt(e,t){t.scenarioSelect.addEventListener("change",async()=>{const n=X(t.scenarioSelect.value);e.permalink={...e.permalink,scenario:n.id,trafficRate:n.suggestedTrafficRate},t.trafficInput.value=String(e.permalink.trafficRate),t.trafficLabel.textContent=F(e.permalink.trafficRate),t.trafficInput.max=String(Math.max(Number(t.trafficInput.max),e.permalink.trafficRate+20)),await b(e,t),v(t,`${n.label}`)}),t.strategyASelect.addEventListener("change",async()=>{e.permalink={...e.permalink,strategyA:t.strategyASelect.value},await b(e,t),v(t,`A: ${I[e.permalink.strategyA]}`)}),t.strategyBSelect.addEventListener("change",async()=>{e.permalink={...e.permalink,strategyB:t.strategyBSelect.value},e.permalink.compare&&(await b(e,t),v(t,`B: ${I[e.permalink.strategyB]}`))}),t.compareToggle.addEventListener("change",async()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},t.strategyBWrap.classList.toggle("hidden",!e.permalink.compare),t.layout.dataset.mode=e.permalink.compare?"compare":"single",await b(e,t),v(t,e.permalink.compare?"Compare on":"Compare off")}),t.seedInput.addEventListener("change",async()=>{const n=Number(t.seedInput.value);Number.isFinite(n)&&(e.permalink={...e.permalink,seed:n},await b(e,t))}),t.speedInput.addEventListener("input",()=>{const n=Number(t.speedInput.value);e.permalink.speed=n,t.speedLabel.textContent=V(n)}),t.trafficInput.addEventListener("input",()=>{const n=Number(t.trafficInput.value);e.permalink.trafficRate=n,P(e,i=>i.sim.setTrafficRate(n)),t.trafficLabel.textContent=F(n)}),t.playBtn.addEventListener("click",()=>{e.running=!e.running,t.playBtn.textContent=e.running?"Pause":"Play"}),t.resetBtn.addEventListener("click",()=>{b(e,t),v(t,"Reset")}),t.shareBtn.addEventListener("click",async()=>{const n=ft(e.permalink),i=`${window.location.origin}${window.location.pathname}${n}`;window.history.replaceState(null,"",n),await navigator.clipboard.writeText(i).catch(()=>{}),v(t,"Permalink copied")})}function It(e){const t=()=>{const n=performance.now(),i=(n-e.lastFrameTime)/1e3;if(e.lastFrameTime=n,e.running&&e.ready&&e.paneA){const o=e.permalink.speed;P(e,s=>s.sim.step(o));const a=e.paneA.sim.snapshot(),r=e.traffic.drainSpawns(a,e.permalink.trafficRate,i);for(const s of r)P(e,c=>c.sim.spawnRider(s.originStopId,s.destStopId,s.weight));D(e.paneA,e.paneA.sim.snapshot(),_t),e.paneB&&D(e.paneB,e.paneB.sim.snapshot(),bt),Rt(e)}requestAnimationFrame(t)};requestAnimationFrame(t)}function D(e,t,n){e.renderer.draw(t);const i=e.sim.metrics();e.latestMetrics=i,e.waitHistory.push(i.avg_wait_s),e.waitHistory.length>yt&&e.waitHistory.shift(),lt(e.waitChart,e.waitHistory,"Avg wait (s)",n)}function Rt(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const i=Tt(t.latestMetrics,n.latestMetrics);M(t.metricsEl,t.latestMetrics,i.a),M(n.metricsEl,n.latestMetrics,i.b)}else M(t.metricsEl,t.latestMetrics,null)}function Tt(e,t){const n=(m,u,w,y)=>Math.abs(m-u)<w?["tie","tie"]:(y?m>u:m<u)?["win","lose"]:["lose","win"],[i,o]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[a,r]=n(e.max_wait_s,t.max_wait_s,.05,!1),[s,c]=n(e.delivered,t.delivered,.5,!0),[f,l]=n(e.abandoned,t.abandoned,.5,!1),[g,p]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:i,max_wait_s:a,delivered:s,abandoned:f,utilization:g},b:{avg_wait_s:o,max_wait_s:r,delivered:c,abandoned:l,utilization:p}}}const W=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function At(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Et(e){const t=document.createDocumentFragment();for(const[n]of W){const i=document.createElement("div");i.className="metric-row";const o=document.createElement("span");o.className="metric-k",o.textContent=n;const a=document.createElement("span");a.className="metric-v",i.append(o,a),t.appendChild(i)}e.replaceChildren(t)}function M(e,t,n){const i=e.children;for(let o=0;o<W.length;o++){const a=i[o],r=W[o][1],s=n?n[r]:"";a.dataset.verdict!==s&&(a.dataset.verdict=s);const c=a.lastElementChild,f=At(t,r);c.textContent!==f&&(c.textContent=f)}}let z=0;function v(e,t){e.toast.textContent=t,e.toast.classList.add("show"),window.clearTimeout(z),z=window.setTimeout(()=>e.toast.classList.remove("show"),1600)}vt();
