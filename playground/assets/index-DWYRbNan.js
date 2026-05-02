const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-2D1z9-N4.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const l of r.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&o(l)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function ce(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let Wt=0;function N(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(Wt),Wt=window.setTimeout(()=>{e.classList.remove("show")},1600)}function Nt(e,t){let i=0,r=0;const l=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",s=>{e.disabled||(s.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){l();return}t()},70)},380))}),e.addEventListener("pointerup",l),e.addEventListener("pointerleave",l),e.addEventListener("pointercancel",l),e.addEventListener("blur",l),e.addEventListener("click",s=>{s.pointerType||t()})}function Z(e,t,n){const o=bt(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return xn(i,r.min,r.max)}function bt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return An(n.doorOpenTicks,n.doorTransitionTicks)}}function St(e,t,n){const o=bt(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function Rn(e,t){const n={};for(const o of de){const i=t[o];i!==void 0&&St(e,o,i)&&(n[o]=i)}return n}const de=["cars","maxSpeed","weightCapacity","doorCycleSec"];function mo(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=An(n,o),r=xn(n/(i*We),.1,.9),l=Math.max(2,Math.round(t*We)),s=Math.max(1,Math.round(l*r)),a=Math.max(1,Math.round((l-s)/2));return{openTicks:s,transitionTicks:a}}function An(e,t){return(e+2*t)/We}function wt(e,t){const n=e.elevatorDefaults,o=Z(e,"maxSpeed",t),i=Z(e,"weightCapacity",t),r=Z(e,"doorCycleSec",t),{openTicks:l,transitionTicks:s}=mo(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:l,doorTransitionTicks:s}}function yo(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function bo(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(Z(e,"cars",t)),i=wt(e,t),r=yo(e.stops.length,o),l=e.stops.map((a,c)=>`        StopConfig(id: StopId(${c}), name: ${dt(a.name)}, position: ${z(a.positionM)}),`).join(`
`),s=r.map((a,c)=>wo(c,i,a,So(c,o))).join(`
`);return`SimConfig(
    building: BuildingConfig(
        name: ${dt(e.buildingName)},
        stops: [
${l}
        ],
    ),
    elevators: [
${s}
    ],
    simulation: SimulationParams(ticks_per_second: ${z(We)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${z(e.passengerWeightRange[0])}, ${z(e.passengerWeightRange[1])}),
    ),
)`}const We=60;function xn(e,t,n){return Math.min(n,Math.max(t,e))}function So(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function wo(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${z(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${z(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${dt(o)},
            max_speed: ${z(t.maxSpeed)}, acceleration: ${z(t.acceleration)}, deceleration: ${z(t.deceleration)},
            weight_capacity: ${z(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function dt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function z(e){return Number.isInteger(e)?`${e}.0`:String(e)}const Mn={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function Ae(e){return Array.from({length:e},()=>1)}const re=5,vo=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:re},(e,t)=>t===re-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:Ae(re),destWeights:Ae(re)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:Ae(re),destWeights:Ae(re)}],ko={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:vo,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...Mn,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
    // Convention door timing: 5 s dwell for group boarding. Big crowds
    // after keynote are slow to actually step through the threshold;
    // rushing the doors closed ejects riders mid-walk and re-opens, a
    // realistic failure mode. Four cars pre-positioned at Lobby,
    // Mezzanine, Ballroom, and Keynote Hall so dispatch has both
    // nearby and far cars available when the pile-up hits.
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(0),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(2),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(3),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 3, name: "Car D",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(4),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (55.0, 100.0),
    ),
)`},Ne=19,pt=16,we=4,Pn=(1+Ne)*we,he=1,ge=41,me=42,_o=43;function U(e){return Array.from({length:_o},(t,n)=>e(n))}const se=e=>e===he||e===ge||e===me,Co=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:U(e=>e===0?20:e===he?2:e===ge?1.2:e===me?.2:.1),destWeights:U(e=>e===0?0:e===he?.3:e===ge?.4:e===me?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:U(e=>se(e)?.5:1),destWeights:U(e=>se(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:U(e=>e===21?4:se(e)?.25:1),destWeights:U(e=>e===21?5:se(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:U(e=>e===0||e===he||e===21?.3:e===ge?.4:e===me?1.2:1),destWeights:U(e=>e===0?20:e===he?1:e===ge?.6:e===me?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:U(e=>se(e)?1.5:.2),destWeights:U(e=>se(e)?1.5:.2)}];function To(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let s=1;s<=Ne;s++){const a=1+s,c=s*we;e.push(`        StopConfig(id: StopId(${a.toString().padStart(2," ")}), name: "Floor ${s}",    position: ${c.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${Pn.toFixed(1)}),`);for(let s=21;s<=20+pt;s++){const a=1+s,c=s*we;e.push(`        StopConfig(id: StopId(${a}), name: "Floor ${s}",   position: ${c.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:Ne},(s,a)=>2+a),21],n=[21,...Array.from({length:pt},(s,a)=>22+a)],o=[1,21,38,39,40],i=[1,0,41,42],r=s=>s.map(a=>`StopId(${a})`).join(", "),l=(s,a,c,f)=>`                ElevatorConfig(
                    id: ${s}, name: "${a}",
                    max_speed: 4.5, acceleration: 2.0, deceleration: 2.5,
                    weight_capacity: ${f.toFixed(1)},
                    starting_stop: StopId(${c}),
                    door_open_ticks: 240, door_transition_ticks: 60,
                    bypass_load_up_pct: Some(0.85), bypass_load_down_pct: Some(0.55),
                ),`;return`SimConfig(
    building: BuildingConfig(
        name: "Skyscraper",
        stops: [
${e.join(`
`)}
        ],
        lines: Some([
            LineConfig(
                id: 0, name: "Low bank",
                serves: [${r(t)}],
                elevators: [
${l(0,"Low 1",1,1800)}
${l(1,"Low 2",21,1800)}
                ],
            ),
            LineConfig(
                id: 1, name: "High bank",
                serves: [${r(n)}],
                elevators: [
${l(2,"High 1",21,1800)}
${l(5,"High 2",37,1800)}
                ],
            ),
            LineConfig(
                id: 2, name: "Executive",
                serves: [${r(o)}],
                elevators: [
${l(3,"VIP",1,350)}
                ],
            ),
            LineConfig(
                id: 3, name: "Service",
                serves: [${r(i)}],
                elevators: [
${l(4,"Service",1,350)}
                ],
            ),
        ]),
        groups: Some([
            GroupConfig(id: 0, name: "Low", lines: [0], dispatch: Scan),
            GroupConfig(id: 1, name: "High", lines: [1], dispatch: Scan),
            GroupConfig(id: 2, name: "Executive", lines: [2], dispatch: Scan),
            // Service parks on NearestIdle so the car stays where it
            // last finished a trip instead of cycling between B1 and
            // the Lobby via AdaptiveParking's ReturnToLobby branch.
            // Service traffic is sparse; there's no benefit to pre-
            // positioning and the oscillation is visually distracting.
            GroupConfig(id: 3, name: "Service", lines: [3], dispatch: Scan, reposition: Some(NearestIdle)),
        ]),
    ),
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 20,
        weight_range: (55.0, 100.0),
    ),
)`}const Eo=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:Ne},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*we})),{name:"Sky Lobby",positionM:Pn},...Array.from({length:pt},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*we})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],Io={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:Co,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:Eo,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...Mn,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:To()},qt=1e5,Ht=4e5,Gt=35786e3,Ro=1e8,Ao=4;function xe(e){return Array.from({length:Ao},(t,n)=>e(n))}const xo={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:xe(e=>e===0?6:1),destWeights:xe(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:xe(e=>e===0?0:e===1?1:e===2?3:5),destWeights:xe(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:qt},{name:"LEO Transfer",positionM:Ht},{name:"GEO Platform",positionM:Gt}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:Ro,showDayNight:!1},ron:`SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${qt.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${Ht.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${Gt.toFixed(1)}),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Climber A",
            max_speed: 1000.0, acceleration: 10.0, deceleration: 10.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(0),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Climber B",
            max_speed: 1000.0, acceleration: 10.0, deceleration: 10.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(1),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 2, name: "Climber C",
            max_speed: 1000.0, acceleration: 10.0, deceleration: 10.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(2),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 1200,
        weight_range: (60.0, 90.0),
    ),
)`},ve=[Io,xo,ko];function q(e){const t=ve.find(o=>o.id===e);if(t)return t;const n=ve[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const Ln={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},O={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},Mo=["scan","look","nearest","etd","destination","rsr"],Po=["adaptive","predictive","lobby","spread","none"];function Ut(e,t){return e!==null&&Mo.includes(e)?e:t}function zt(e,t){return e!==null&&Po.includes(e)?e:t}function G(e){const t=Fn(e);window.location.search!==t&&window.history.replaceState(null,"",t)}function Lo(e,t){return e==="compare"||e==="quest"?e:t}function Fn(e){const t=new URLSearchParams;e.mode!==O.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==O.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=q(e.scenario).defaultReposition,o=n??O.repositionA,i=n??O.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of de){const l=e.overrides[r];l!==void 0&&Number.isFinite(l)&&t.set(Ln[r],Bo(l))}return`?${t.toString()}`}function Fo(e){const t=new URLSearchParams(e),n={};for(const o of de){const i=t.get(Ln[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:Lo(t.get("m"),O.mode),questStage:(t.get("qs")??"").trim()||O.questStage,scenario:t.get("s")??O.scenario,strategyA:Ut(t.get("a")??t.get("d"),O.strategyA),strategyB:Ut(t.get("b"),O.strategyB),repositionA:zt(t.get("pa"),O.repositionA),repositionB:zt(t.get("pb"),O.repositionB),compare:t.has("c")?t.get("c")==="1":O.compare,seed:(t.get("k")??"").trim()||O.seed,intensity:jt(t.get("i"),O.intensity),speed:jt(t.get("x"),O.speed),overrides:n}}function jt(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function Bo(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function Bn(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const $o=["scan","look","nearest","etd","destination","rsr"],je={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},$n={scan:"Sweeps end-to-end like a disk head — simple, predictable, ignores who's waiting longest.",look:"Like SCAN but reverses early when nothing's queued further — a practical baseline.",nearest:"Grabs whichever call is closest right now. Fast under light load, thrashes under rush.",etd:"Estimated time of dispatch — assigns calls to whichever car can finish fastest.",destination:"Destination-control: riders pick their floor at the lobby; the group optimises assignments.",rsr:"Relative System Response — a wait-aware variant of ETD that penalises long queues."},Oo=["adaptive","predictive","lobby","spread","none"],vt={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},On={adaptive:"Switches based on traffic — returns to lobby during up-peak, predicts hot floors otherwise. The default.",predictive:"Always parks idle cars near whichever floor has seen the most recent arrivals.",lobby:"Sends every idle car back to the ground floor to prime the morning-rush pickup.",spread:"Keeps idle cars fanned out across the shaft so any floor has a nearby option.",none:"Leaves idle cars wherever they finished their last delivery."},Do="scenario-card inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated border border-stroke-subtle rounded-md text-content-secondary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:bg-surface-hover hover:border-stroke aria-pressed:bg-accent-muted aria-pressed:text-content aria-pressed:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] max-md:flex-none max-md:snap-start",Wo="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function No(e){const t=document.createDocumentFragment();ve.forEach((n,o)=>{const i=ce("button",Do);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(ce("span","",n.label),ce("span",Wo,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function Dn(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}async function Wn(e,t,n,o,i){const r=q(n),l=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,s=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:l,repositionA:s,overrides:{}},G(e.permalink),i.renderPaneStrategyInfo(t.paneA,l),i.renderPaneRepositionInfo(t.paneA,s),i.refreshStrategyPopovers(),Dn(t,r.id),await o(),i.renderTweakPanel(),N(t.toast,`${r.label} · ${je[l]}`)}function qo(e){const t=q(e.scenario);e.scenario=t.id}const Ho="modulepreload",Go=function(e,t){return new URL(e,t).href},Xt={},qe=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let l=function(f){return Promise.all(f.map(p=>Promise.resolve(p).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const s=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),c=a?.nonce||a?.getAttribute("nonce");i=l(n.map(f=>{if(f=Go(f,o),f in Xt)return;Xt[f]=!0;const p=f.endsWith(".css"),d=p?'[rel="stylesheet"]':"";if(!!o)for(let g=s.length-1;g>=0;g--){const b=s[g];if(b.href===f&&(!p||b.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=p?"stylesheet":Ho,p||(h.as="script"),h.crossOrigin="",h.href=f,c&&h.setAttribute("nonce",c),document.head.appendChild(h),p)return new Promise((g,b)=>{h.addEventListener("load",g),h.addEventListener("error",()=>b(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(l){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=l,window.dispatchEvent(s),!s.defaultPrevented)throw l}return i.then(l=>{for(const s of l||[])s.status==="rejected"&&r(s.reason);return t().catch(r)})};async function Uo(e){const t=(await qe(async()=>{const{default:i}=await import("./worker-Dn-5eX5R.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new zo(n);return await o.init(e),o}class zo{#e;#t=new Map;#n=1;#i=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#l),this.#e.addEventListener("error",this.#o),this.#e.addEventListener("messageerror",this.#o)}async init(t){await this.#a({kind:"init",id:this.#s(),payload:this.#d(t)})}async tick(t){return this.#a({kind:"tick",id:this.#s(),ticks:t})}async spawnRider(t,n,o,i){return this.#a({kind:"spawn-rider",id:this.#s(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#a({kind:"set-strategy",id:this.#s(),strategy:t})}async loadController(t,n){const o=n?.unlockedApi??null,i=n?.timeoutMs,r=this.#a({kind:"load-controller",id:this.#s(),source:t,unlockedApi:o});if(i===void 0){await r;return}r.catch(()=>{});let l;const s=new Promise((a,c)=>{l=setTimeout(()=>{c(new Error(`controller did not return within ${i}ms`))},i)});try{await Promise.race([r,s])}finally{l!==void 0&&clearTimeout(l)}}async reset(t){await this.#a({kind:"reset",id:this.#s(),payload:this.#d(t)})}dispose(){this.#i||(this.#i=!0,this.#e.removeEventListener("message",this.#l),this.#e.removeEventListener("error",this.#o),this.#e.removeEventListener("messageerror",this.#o),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#s(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#a(t){if(this.#i)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#t.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#o=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#i=!0,this.#e.terminate(),this.#r(new Error(o))};#l=t=>{const n=t.data,o=this.#t.get(n.id);if(o)switch(this.#t.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":o.reject(new Error(n.message));return;default:{const i=n.kind;o.reject(new Error(`WorkerSim: unknown reply kind "${String(i)}"`));return}}}}let tt=null,ae=null;async function jo(){return tt||ae||(ae=(async()=>{await Xo();const e=await qe(()=>import("./editor.main-2D1z9-N4.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return tt=e,e})(),ae.catch(()=>{ae=null}),ae)}async function Xo(){const[{default:e},{default:t}]=await Promise.all([qe(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),qe(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}async function Vo(e){const n=(await jo()).editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"vs-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o(n.getValue())});return{dispose:()=>{i.dispose()}}},insertAtCursor(o){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:o,forceMoveMarkers:!0}]),n.focus()},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const Yo=`SimConfig(
    building: BuildingConfig(
        name: "Quest 1",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.2, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 90,
        weight_range: (50.0, 100.0),
    ),
)`,Ko={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",configRon:Yo,unlockedApi:["pushDestination"],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
//
// Five riders at the lobby want to go up to Floor 2 or Floor 3.
// Use \`sim.pushDestination(carId, stopId)\` to send the car after them.
//
// Stop ids: 0 (Lobby), 1 (Floor 2), 2 (Floor 3).

// Send the car to Floor 3 first:
sim.pushDestination(0n, 2n);
`,hints:["`sim.pushDestination(carId, stopId)` queues a destination. Both ids are bigints — pass them with the `n` suffix.","There's only one car (id 0n). Queue it to visit each floor riders are waiting for.","Pass: deliver all five riders. 3★: do it before tick 400 — back-to-back destinations beat one-at-a-time."]},Qo=`SimConfig(
    building: BuildingConfig(
        name: "Quest 2",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 60,
        weight_range: (50.0, 100.0),
    ),
)`,Jo={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",configRon:Qo,unlockedApi:["pushDestination","hallCalls","drainEvents"],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
//
// New tools:
//   sim.hallCalls() returns an array of pending hall calls.
//   sim.drainEvents() returns recently-fired events.
//
// The car is idle by default. Read sim.hallCalls() and use
// sim.pushDestination(carId, stopId) to send the car to floors
// where riders are waiting.

const calls = sim.hallCalls();
for (const call of calls) {
  sim.pushDestination(0n, BigInt(call.stop));
}
`,hints:["`sim.hallCalls()` returns objects with at least `{ stop, direction }`. Iterate them and dispatch the car.","Calls accumulate over time. Riders keep arriving at the configured Poisson rate, so polling `sim.hallCalls()` once per evaluation is enough; you don't need to react instantly.","3★ requires beating the nearest-car baseline. Try queuing destinations in directional order so the car doesn't bounce."]},Zo=`SimConfig(
    building: BuildingConfig(
        name: "Quest 3",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 45,
        weight_range: (50.0, 100.0),
    ),
)`,ei={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",configRon:Zo,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
//
// Riders board and press floors inside the car. \`sim.carCalls(carId)\`
// returns the pressed buttons for that car so you can queue
// destinations in response.
//
// Hall calls + car calls together — the car needs to pick up new
// riders and drop them off as it sweeps.

const calls = sim.hallCalls();
for (const call of calls) {
  sim.pushDestination(0n, BigInt(call.stop));
}

const inside = sim.carCalls(0n);
for (const stop of inside) {
  sim.pushDestination(0n, BigInt(stop));
}
`,hints:["`sim.carCalls(carId)` returns an array of stop ids the riders inside that car have pressed.","Combine hall calls (riders waiting outside) and car calls (riders inside) into a single dispatch sweep — bouncing back and forth burns time.","3★ requires sub-30s max wait. Look at events with `sim.drainEvents()` to react the moment a call lands instead of polling stale state."]},ti=`SimConfig(
    building: BuildingConfig(
        name: "Quest 4",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
            StopConfig(id: StopId(6), name: "F7", position: 24.0),
            StopConfig(id: StopId(7), name: "F8", position: 28.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (50.0, 100.0),
    ),
)`,ni={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",configRon:ti,unlockedApi:["setStrategy"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
//
// elevator-core ships built-in dispatch strategies: scan, look,
// nearest, etd, destination, rsr. Try them out:
//
//   sim.setStrategy("look");
//
// returns true on success, false if the name isn't a built-in.
// The default for this stage is SCAN — see if you can beat it.

sim.setStrategy("look");
`,hints:["`scan` sweeps end-to-end; `look` stops at the last request and reverses; `nearest` picks the closest idle car; `etd` minimises estimated time-to-destination.","Look at `metrics.avg_wait_s` to judge: lower is better. Try each strategy in turn — the deltas are small but visible.","3★ requires sub-18s average wait. ETD typically wins on heavy traffic; LOOK is competitive at lower spawn rates."]},oi=`SimConfig(
    building: BuildingConfig(
        name: "Quest 5",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
            StopConfig(id: StopId(6), name: "F7", position: 24.0),
            StopConfig(id: StopId(7), name: "F8", position: 28.0),
            StopConfig(id: StopId(8), name: "F9", position: 32.0),
            StopConfig(id: StopId(9), name: "F10", position: 36.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 25,
        weight_range: (50.0, 100.0),
    ),
)`,ii={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",configRon:oi,unlockedApi:["setStrategy"],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."]},ri=`SimConfig(
    building: BuildingConfig(
        name: "Quest 6",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 40,
        weight_range: (50.0, 100.0),
    ),
)`,si=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,ai={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",configRon:ri,unlockedApi:["setStrategyJs"],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:si,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."]},li=`SimConfig(
    building: BuildingConfig(
        name: "Quest 7",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
            StopConfig(id: StopId(6), name: "F7", position: 24.0),
            StopConfig(id: StopId(7), name: "F8", position: 28.0),
            StopConfig(id: StopId(8), name: "F9", position: 32.0),
            StopConfig(id: StopId(9), name: "F10", position: 36.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 2, name: "Car 3",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 20,
        weight_range: (50.0, 100.0),
    ),
)`,ci={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",configRon:li,unlockedApi:["setStrategyJs"],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
//
// ETD minimises estimated time-to-destination. To match or beat
// it, your rank() needs to factor in:
//   - distance between car and stop (Stage 6)
//   - car direction (penalise reversals)
//   - car load (avoid sending a full car to a hall call)
//
// Start with distance, layer the rest in.

sim.setStrategyJs("rival-etd", (ctx) => {
  const dist = Math.abs(ctx.carPosition - ctx.stopPosition);
  return dist;
});
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."]},di=`SimConfig(
    building: BuildingConfig(
        name: "Quest 8",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
            StopConfig(id: StopId(6), name: "F7", position: 24.0),
            StopConfig(id: StopId(7), name: "F8", position: 28.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 50,
        weight_range: (50.0, 100.0),
    ),
)`,pi=`// Stage 8 — Event-Driven
//
// sim.drainEvents() returns events that fired since the last drain.
// Useful for reacting to specific moments:
//   - rider-spawned (a new wait begins)
//   - hall-button-pressed (a call lands)
//   - elevator-arrived (a stop completes)
//
// Build a rank() that incorporates pending hall-call ages.

let pendingSince = new Map();

sim.setStrategyJs("event-aware", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,ui={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",configRon:di,unlockedApi:["setStrategyJs","drainEvents"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:pi,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."]},fi=`SimConfig(
    building: BuildingConfig(
        name: "Quest 9",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 70,
        weight_range: (50.0, 100.0),
    ),
)`,hi=`// Stage 9 — Take the Wheel
//
// Manual mode hands the car over to your code. After you switch:
//   sim.setServiceMode(carRef, "manual");
//   sim.setTargetVelocity(carRef, +2.5);  // m/s, +up -down
//
// You're responsible for slowing down, stopping at stops, and
// opening doors via the existing primitives. This stage gives you
// the simplest setup: one car, one direction at a time.
//
// TIP: Manual mode is strictly more powerful than dispatch — but
// also strictly more error-prone. Use it where dispatch can't do
// what you need.

// Just queue destinations for now — the manual primitives are
// available, but most controllers won't need them. The starter
// here passes the stage; star tiers reward using manual mode.
sim.setStrategy("etd");
`,gi={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",configRon:fi,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:hi,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.']},mi=`SimConfig(
    building: BuildingConfig(
        name: "Quest 10",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 30, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 80,
        weight_range: (50.0, 100.0),
    ),
)`,yi=`// Stage 10 — Patient Boarding
//
// holdDoor(carRef, ticks) keeps the doors open for that many extra
// ticks. cancelDoorHold(carRef) releases the hold early so doors
// close on the next loading-complete tick. The door cycle in this stage is
// deliberately tight (30 ticks instead of 55) — without holdDoor,
// passengers can't always board in time.
//
// React to the rider-boarded event by holding briefly, then cancel
// once boarding completes.

sim.setStrategy("nearest");

// (To use holdDoor in production, you'd watch sim.drainEvents() for
// 'rider-boarding' and hold once boarding starts. The starter here
// just falls back to nearest dispatch — pass on its own, but no
// stars without active door management.)
`,bi={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",configRon:mi,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:yi,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."]},Si=`SimConfig(
    building: BuildingConfig(
        name: "Quest 11",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 50,
        weight_range: (50.0, 100.0),
    ),
)`,wi=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,vi={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",configRon:Si,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:wi,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."]},ki=`SimConfig(
    building: BuildingConfig(
        name: "Quest 12",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
            StopConfig(id: StopId(6), name: "F7", position: 24.0),
            StopConfig(id: StopId(7), name: "F8", position: 28.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 35,
        weight_range: (50.0, 100.0),
    ),
)`,_i=`// Stage 12 — Routes
//
// Riders have explicit routes between origin and destination. The
// controller can inspect them with shortestRoute(originStop,
// destinationStop) and send a rider to a new destination with
// reroute(riderRef, newDestStop).
//
// Most stages don't need this directly — riders are auto-routed at
// spawn. But understanding routes is the foundation for the
// multi-line topology stages later.

sim.setStrategy("etd");
`,Ci={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",configRon:ki,unlockedApi:["setStrategy","shortestRoute","reroute"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:_i,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."]},Ti=`SimConfig(
    building: BuildingConfig(
        name: "Quest 13",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "L2", position: 4.0),
            StopConfig(id: StopId(2), name: "L3", position: 8.0),
            StopConfig(id: StopId(3), name: "Transfer", position: 12.0),
            StopConfig(id: StopId(4), name: "H1", position: 16.0),
            StopConfig(id: StopId(5), name: "H2", position: 20.0),
            StopConfig(id: StopId(6), name: "H3", position: 24.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Low",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "High",
            max_speed: 3.0, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(3),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 50,
        weight_range: (50.0, 100.0),
    ),
)`,Ei=`// Stage 13 — Transfer Points
//
// Two cars on two lines that meet at the Transfer floor. Riders
// going lobby->H2 ride the Low car to Transfer, change to the
// High car, then ride to H2. The engine handles the change
// automatically when riders carry routes — your job here is just
// to keep dispatch healthy on both lines.
//
// transferPoints() and reachableStopsFrom(stop) tell you the
// topology, but you don't need them for the pass condition.

sim.setStrategy("etd");
`,Ii={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",configRon:Ti,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:Ei,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."]},Ri=`SimConfig(
    building: BuildingConfig(
        name: "Quest 14",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 80,
        weight_range: (50.0, 100.0),
    ),
)`,Ai=`// Stage 14 — Build a Floor
//
// The building starts five stops tall. Construction "finishes" a
// few minutes in and the player adds the sixth floor:
//
//   const lineRef = /* the line you want to add the stop to */;
//   const newStop = sim.addStop(lineRef, "F6", 20.0);
//   sim.addStopToLine(lineRef, newStop);
//
// Standard dispatch otherwise.

sim.setStrategy("etd");
`,xi={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",configRon:Ri,unlockedApi:["setStrategy","addStop","addStopToLine"],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:Ai,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(lineRef, stopRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."]},Mi=`SimConfig(
    building: BuildingConfig(
        name: "Quest 15",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "L2", position: 4.0),
            StopConfig(id: StopId(2), name: "L3", position: 8.0),
            StopConfig(id: StopId(3), name: "L4", position: 12.0),
            StopConfig(id: StopId(4), name: "Sky", position: 16.0),
            StopConfig(id: StopId(5), name: "H1", position: 20.0),
            StopConfig(id: StopId(6), name: "H2", position: 24.0),
            StopConfig(id: StopId(7), name: "H3", position: 28.0),
            StopConfig(id: StopId(8), name: "H4", position: 32.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Low",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "High",
            max_speed: 3.0, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(4),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 2, name: "Floater",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (50.0, 100.0),
    ),
)`,Pi=`// Stage 15 — Sky Lobby
//
// Three cars over nine stops. The Sky stop bridges the low and
// high halves of the building. A natural split: Low car serves
// the bottom half, High car serves the top half, Floater fills in.
//
// assignLineToGroup(lineRef, groupId) puts a line under a group's
// dispatcher (groupId is a plain number, not a bigint ref);
// reassignElevatorToLine(carRef, lineRef) moves a car.
//
// The default config has everything on one group. ETD does fine.
// Beating 22s average wait needs an explicit group split.

sim.setStrategy("etd");
`,Li={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",configRon:Mi,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:Pi,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."]},kt=[Ko,Jo,ei,ni,ii,ai,ci,ui,gi,bi,vi,Ci,Ii,xi,Li];function Fi(e){return kt.find(t=>t.id===e)}async function Bi(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await Uo({configRon:e.configRon,strategy:"scan"});try{const l={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(l.timeoutMs=n.timeoutMs),await r.loadController(t,l);let s=null,a=0;for(;a<o;){const c=o-a,f=Math.min(i,c),p=await r.tick(f);s=p.metrics,a=p.tick;const d=Vt(s,a);if(e.passFn(d))return Yt(e,d)}if(s===null)throw new Error("runStage: maxTicks must be positive");return Yt(e,Vt(s,a))}finally{r.dispose()}}function Vt(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function Yt(e,t){if(!e.passFn(t))return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}const Nn=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(lineRef, stopRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(Nn.map(e=>[e.name,e]));function qn(e){const t=new Set(e);return Nn.filter(n=>t.has(n.name))}function B(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function Xe(e){for(;e.firstChild;)e.removeChild(e.firstChild)}function $i(){return{root:B("quest-api-panel","api-panel")}}function Kt(e,t){Xe(e.root);const n=qn(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const o=document.createElement("p");o.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",o.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(o);const i=document.createElement("ul");i.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const l=document.createElement("li");l.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const s=document.createElement("code");s.className="block font-mono text-[12px] text-content",s.textContent=r.signature,l.appendChild(s);const a=document.createElement("p");a.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",a.textContent=r.description,l.appendChild(a),i.appendChild(l)}e.root.appendChild(i)}function Oi(){return{root:B("quest-hints","hints-drawer"),count:B("quest-hints-count","hints-drawer"),list:B("quest-hints-list","hints-drawer")}}function Qt(e,t){Xe(e.list);const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}e.count.textContent=`(${n})`;for(const o of t.hints){const i=document.createElement("li");i.className="text-content-secondary leading-snug marker:text-content-tertiary",i.textContent=o,e.list.appendChild(i)}e.root.removeAttribute("open")}function Di(){const e="results-modal";return{root:B("quest-results-modal",e),title:B("quest-results-title",e),stars:B("quest-results-stars",e),detail:B("quest-results-detail",e),close:B("quest-results-close",e),retry:B("quest-results-retry",e)}}function Wi(e,t,n){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=Ni(t.grade,t.passed),e.retry.onclick=()=>{Jt(e),n()},e.close.onclick=()=>{Jt(e)},e.root.classList.add("show"),e.close.focus()}function Jt(e){e.root.classList.remove("show")}function Ni(e,t){const n=`tick ${e.endTick}`,o=`${e.delivered} delivered, ${e.abandoned} abandoned`;return t?`${o} · finished by ${n}.`:`${o}. The pass condition wasn't met within the run budget.`}const qi={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* lineRef */, /* stopRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function Zt(e){return qi[e]??`sim.${e}();`}function Hi(){return{root:B("quest-snippets","snippet-picker")}}function en(e,t,n){Xe(e.root);const o=qn(t.unlockedApi);if(o.length!==0)for(const i of o){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=i.name,r.title=`Insert: ${Zt(i.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(Zt(i.name))}),e.root.appendChild(r)}}const He="quest:code:v1:",Hn="quest:bestStars:v1:",Gn=5e4;function ke(){try{return globalThis.localStorage??null}catch{return null}}function tn(e){const t=ke();if(!t)return null;try{const n=t.getItem(He+e);if(n===null)return null;if(n.length>Gn){try{t.removeItem(He+e)}catch{}return null}return n}catch{return null}}function nn(e,t){if(t.length>Gn)return;const n=ke();if(n)try{n.setItem(He+e,t)}catch{}}function Gi(e){const t=ke();if(t)try{t.removeItem(He+e)}catch{}}function _t(e){const t=ke();if(!t)return 0;let n;try{n=t.getItem(Hn+e)}catch{return 0}if(n===null)return 0;const o=Number.parseInt(n,10);return!Number.isInteger(o)||o<0||o>3?0:o}function Ui(e,t){const n=_t(e);if(t<=n)return;const o=ke();if(o)try{o.setItem(Hn+e,String(t))}catch{}}function zi(){const e="quest-pane";return{root:B("quest-pane",e),title:B("quest-stage-title",e),brief:B("quest-stage-brief",e),select:B("quest-stage-select",e),editorHost:B("quest-editor",e),runBtn:B("quest-run",e),resetBtn:B("quest-reset",e),result:B("quest-result",e)}}function on(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief,e.select.value!==t.id&&(e.select.value=t.id)}function rn(e){Xe(e.select),kt.forEach((t,n)=>{const o=document.createElement("option");o.value=t.id,o.textContent=ji(t,n,_t(t.id)),e.select.appendChild(o)})}function ji(e,t,n){const i=`${String(t+1).padStart(2,"0")} · ${e.title}`;return n===0?i:`${i} ${"★".repeat(n)}`}function Xi(e){const t=document.getElementById("layout");t&&t.classList.add("hidden"),e.root.classList.remove("hidden"),e.root.classList.add("flex")}function Vi(e,t,n,o,i){const r=()=>{Yi(e,t,n,o(),r,i)};e.runBtn.addEventListener("click",r)}async function Yi(e,t,n,o,i,r){e.runBtn.disabled=!0,e.result.textContent="Running…";try{const l=await Bi(o,n.getValue(),{timeoutMs:1e3});r(o,l),e.select.value===o.id&&(e.result.textContent="",Wi(t,l,i))}catch(l){if(e.select.value===o.id){const s=l instanceof Error?l.message:String(l);e.result.textContent=`Error: ${s}`}}finally{e.runBtn.disabled=!1}}async function Ki(e){const t=zi();rn(t);const n=g=>{const b=Fi(g);if(b)return b;const w=kt[0];if(!w)throw new Error("quest-pane: stage registry is empty");return w};let o=n(e.initialStageId);on(t,o),Xi(t);const i=$i();Kt(i,o);const r=Oi();Qt(r,o),t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const l=await Vo({container:t.editorHost,initialValue:tn(o.id)??o.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const s=Di();Vi(t,s,l,()=>o,(g,b)=>{if(b.passed){const w=_t(g.id);b.stars>w&&(Ui(g.id,b.stars),rn(t),t.select.value=o.id)}});const a=300;let c=null,f=!1;const p=()=>{f||(c!==null&&clearTimeout(c),c=setTimeout(()=>{nn(o.id,l.getValue()),c=null},a))},d=()=>{c!==null&&(clearTimeout(c),c=null,nn(o.id,l.getValue()))},u=g=>{f=!0;try{l.setValue(g)}finally{f=!1}};l.onDidChange(()=>{p()});const h=Hi();return en(h,o,l),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${o.title} to its starter code?`)&&(Gi(o.id),u(o.starterCode),t.result.textContent="")}),t.select.addEventListener("change",()=>{d();const g=n(t.select.value);o=g,on(t,g),Kt(i,g),Qt(r,g),en(h,g,l),u(tn(g.id)??g.starterCode),t.result.textContent="",e.onStageChange?.(g.id)}),{handles:t,editor:l}}let nt=null;async function Un(){if(!nt){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;nt=import(e).then(async n=>(await n.default(t),n))}return nt}class Ct{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,o){const i=await Un();return new Ct(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class zn{#e;#t=0;#n=[];#i=0;#r=0;#s=1;#d=0;constructor(t){this.#e=Qi(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#i=t.reduce((n,o)=>n+o.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#s=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const o=t.stops.filter(s=>s.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#s/60*i,this.#r=(this.#r+i)%(this.#i||1);const l=[];for(;this.#t>=1;)this.#t-=1,l.push(this.#a(o,r));return l}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,o]of this.#n.entries())if(t-=o.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#i<=0?0:Math.min(1,this.#r/this.#i)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#n}#a(t,n){const o=this.#o(t.length,n.originWeights);let i=this.#o(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],l=t[i];if(!r||!l)throw new Error("stop index out of bounds");const s=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:l.stop_id,weight:s,...this.#d>0?{patienceTicks:this.#d}:{}}}#o(t,n){if(!n||n.length!==t)return this.#c(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#c(t);let i=this.#p()*o;for(const[r,l]of n.entries())if(i-=Math.max(0,l),i<0)return r;return t-1}#l(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#c(t){return Number(this.#l()%BigInt(t))}#p(){return Number(this.#l()>>11n)/2**53}}function Qi(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}function Ge(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,l=o&255,s=a=>t>=0?Math.round(a+(255-a)*t):Math.round(a*(1+t));return`rgb(${s(i)}, ${s(r)}, ${s(l)})`}function Tt(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,l=o&255;return`rgba(${i}, ${r}, ${l}, ${t})`}function jn(e,t){if(/^#[0-9a-f]{6}$/i.test(e)){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Tt(e,t)}function Ji(e,t,n,o,i){const r=(e+n)/2,l=(t+o)/2,s=n-e,a=o-t,c=Math.max(Math.hypot(s,a),1),f=-a/c,p=s/c,d=Math.min(c*.25,22),u=r+f*d,h=l+p*d,g=1-i;return[g*g*e+2*g*i*u+i*i*n,g*g*t+2*g*i*h+i*i*o]}function Zi(e){let r=e;for(let s=0;s<3;s++){const a=1-r,c=3*a*a*r*.2+3*a*r*r*.2+r*r*r,f=3*a*a*.2+6*a*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(c-e)/f,r=Math.max(0,Math.min(1,r))}const l=1-r;return 3*l*l*r*.6+3*l*r*r*1+r*r*r}const Et={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},er="#2a2a35",tr="#a1a1aa",nr=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],or=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],ir="rgba(8, 10, 14, 0.55)",rr="#3a3a45",sr=[1,1,.5,.42],ar=["LOW","HIGH","VIP","SERVICE"],lr="#e6c56b",cr="#9bd4c4",dr=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],pr="#a1a1aa",ur="#4a4a55",fr="#f59e0b",Xn="#7dd3fc",Vn="#fda4af",ot="#fafafa",Yn="#8b8c92",Kn="rgba(250, 250, 250, 0.95)",hr=260,sn=3,gr=.05,an=["standard","briefcase","bag","short","tall"];function le(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,an[n%an.length]??"standard"}function mr(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function Qn(e,t,n,o,i,r="standard"){const l=mr(r,o),a=n-.5,c=a-l.bodyH,f=c-l.neckGap-l.headR,p=l.bodyH*.08,d=a-l.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-l.shoulderW/2,c+p),e.lineTo(t-l.shoulderW/2+p,c),e.lineTo(t+l.shoulderW/2-p,c),e.lineTo(t+l.shoulderW/2,c+p),e.lineTo(t+l.waistW/2,d),e.lineTo(t+l.footW/2,a),e.lineTo(t-l.footW/2,a),e.lineTo(t-l.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,l.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const u=Math.max(1.6,l.headR*.9),h=t+l.waistW/2+u*.1,g=a-u-.5;e.fillRect(h,g,u,u);const b=u*.55;e.fillRect(h+(u-b)/2,g-1,b,1)}else if(r==="bag"){const u=Math.max(1.3,l.headR*.9),h=t-l.shoulderW/2-u*.35,g=c+l.bodyH*.35;e.beginPath(),e.arc(h,g,u,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(h+u*.2,g-u*.8),e.lineTo(t+l.shoulderW/2-p,c+.5),e.stroke()}else if(r==="tall"){const u=l.headR*2.1,h=Math.max(1,l.headR*.45);e.fillRect(t-u/2,f-l.headR-h+.4,u,h)}}function yr(e,t,n,o,i,r,l,s,a){const f=Math.max(1,Math.floor((i-14)/s.figureStride)),p=Math.min(r,f),d=-2;for(let u=0;u<p;u++){const h=t+d+o*u*s.figureStride,g=u+0,b=le(a,g);Qn(e,h,n,s.figureHeadR,l,b)}if(r>p){e.fillStyle=Yn,e.font=`${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const u=t+d+o*p*s.figureStride;e.fillText(`+${r-p}`,u,n-1)}}function V(e,t,n,o,i,r){const l=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,l);return}e.moveTo(t+l,n),e.lineTo(t+o-l,n),e.quadraticCurveTo(t+o,n,t+o,n+l),e.lineTo(t+o,n+i-l),e.quadraticCurveTo(t+o,n+i,t+o-l,n+i),e.lineTo(t+l,n+i),e.quadraticCurveTo(t,n+i,t,n+i-l),e.lineTo(t,n+l),e.quadraticCurveTo(t,n,t+l,n),e.closePath()}function br(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const l=i+r+1>>1;e.measureText(t.slice(0,l)+o).width<=n?i=l:r=l-1}return i===0?o:t.slice(0,i)+o}function Sr(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function wr(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,l=Math.max(n.fontSmall+.5,i);for(const s of t){const a=s.top-3,c=a>i&&a-n.fontSmall<r;e.fillStyle=s.color,e.fillText(s.text,s.cx,c?l:a)}}function vr(e,t,n,o,i,r,l,s,a){e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";const c=o.padX,f=o.padX+o.labelW,p=r-o.padX,d=o.shaftInnerW/2,u=Math.min(o.shaftInnerW*1.8,(p-f)/2),h=[...t.stops].sort((g,b)=>g.y-b.y);for(let g=0;g<h.length;g++){const b=h[g];if(b===void 0)continue;const w=n(b.y),_=h[g+1],E=_!==void 0?n(_.y):s;if(e.strokeStyle=er,e.lineWidth=a?2:1,e.beginPath(),a)for(const m of i)e.moveTo(m-u,w+.5),e.lineTo(m+u,w+.5);else{let m=f;for(const v of i){const S=v-d,C=v+d;S>m&&(e.moveTo(m,w+.5),e.lineTo(S,w+.5)),m=C}m<p&&(e.moveTo(m,w+.5),e.lineTo(p,w+.5))}e.stroke();for(let m=0;m<i.length;m++){const v=i[m];if(v===void 0)continue;const S=l.has(`${m}:${b.entity_id}`);e.strokeStyle=S?fr:ur,e.lineWidth=S?1.4:1,e.beginPath(),e.moveTo(v-d-2,w+.5),e.lineTo(v-d,w+.5),e.moveTo(v+d,w+.5),e.lineTo(v+d+2,w+.5),e.stroke()}const y=a?w:(w+E)/2;e.fillStyle=tr,e.textAlign="right",e.fillText(br(e,b.name,o.labelW-4),c+o.labelW-4,y)}}function kr(e,t,n,o,i,r){for(const l of t.stops){if(l.waiting_by_line.length===0)continue;const s=r.get(l.entity_id);if(s===void 0||s.size===0)continue;const a=n(l.y),c=l.waiting_up>=l.waiting_down?Xn:Vn;for(const f of l.waiting_by_line){if(f.count===0)continue;const p=s.get(f.line);if(p===void 0)continue;const d=i.get(p);if(d===void 0)continue;const u=d.end-d.start;u<=o.figureStride||yr(e,d.end-2,a,-1,u,f.count,c,o,l.entity_id)}}}function _r(e,t,n,o,i,r,l,s,a,c=!1){const f=o*.22,p=(i-4)/10.5,d=Math.max(1.2,Math.min(s.figureHeadR,f,p)),u=s.figureStride*(d/s.figureHeadR),h=3,g=2,b=o-h*2,_=Math.max(1,Math.floor((b-16)/u)),E=Math.min(r,_),y=E*u,m=t-y/2+u/2,v=n-g;for(let S=0;S<E;S++){const C=a?.[S]??le(0,S);Qn(e,m+S*u,v,d,l,C)}if(r>E){const S=`+${r-E}`,C=Math.max(8,s.fontSmall-1);e.font=`700 ${C.toFixed(1)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="middle";const A=e.measureText(S).width,R=3,T=1.5,I=Math.ceil(A+R*2),x=Math.ceil(C+T*2),M=t+o/2-2,D=n-i+2,L=M-I;e.fillStyle="rgba(15, 15, 18, 0.85)",V(e,L,D,I,x,2),e.fill(),e.fillStyle="#fafafa",e.fillText(S,M-R,D+x/2)}if(c){const S=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${S.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="center",e.textBaseline="middle";const C=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,C+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,C)}}function Cr(e,t,n,o,i,r,l){const s=Math.max(2,r.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const c=l.get(a.target);if(c===void 0)continue;const f=t.stops[c];if(f===void 0)continue;const p=n.get(a.id);if(p===void 0)continue;const d=i(f.y)-r.carH/2,u=i(a.y)-r.carH/2;Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(p,u),e.lineTo(p,d),e.stroke(),e.fillStyle=Kn,e.beginPath(),e.arc(p,d,s,0,Math.PI*2),e.fill())}}function Tr(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const l=Et[t.phase]??"#6b6b75",s=o/2;for(let a=1;a<=sn;a++){const c=r(t.y-t.v*gr*a),f=.18*(1-(a-1)/sn);e.fillStyle=Tt(l,f),e.fillRect(n-s,c-i,o,i)}}function Er(e,t,n,o,i,r,l,s,a){const c=l(t.y),f=c-i,p=o/2,d=Et[t.phase]??"#6b6b75",u=e.createLinearGradient(n,f,n,c);u.addColorStop(0,Ge(d,.14)),u.addColorStop(1,Ge(d,-.18)),e.fillStyle=u,e.fillRect(n-p,f,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-p+.5,f+.5,o-1,i-1);const h=t.capacity>0&&t.load>=t.capacity*.95;(t.riders>0||h)&&_r(e,n,c,o,i,t.riders,r,s,a,h)}function Ir(e,t,n,o,i,r,l,s){const h=`600 ${r.fontSmall+.5}px system-ui, -apple-system, "Segoe UI", sans-serif`;e.font=h,e.textBaseline="middle";const g=.3,b=performance.now(),w=t,_=[];for(const y of n.cars){const m=l.get(y.id);if(!m)continue;const v=o.get(y.id);if(v===void 0)continue;const S=i(y.y),C=S-r.carH,A=Math.max(1,m.expiresAt-m.bornAt),R=m.expiresAt-b,T=R>A*g?1:Math.max(0,R/(A*g));if(T<=0)continue;const x=e.measureText(m.text).width+14,M=r.fontSmall+8+2,D=C-2-4-M,L=S+2+4+M>s,j=D<2&&!L?"below":"above",_e=j==="above"?C-2-4-M:S+2+4;let W=v-x/2;const Ce=2,Te=s-x-2;W<Ce&&(W=Ce),W>Te&&(W=Te),_.push({bubble:m,alpha:T,cx:v,carTop:C,carBottom:S,bubbleW:x,bubbleH:M,side:j,bx:W,by:_e})}const E=(y,m)=>!(y.bx+y.bubbleW<=m.bx||m.bx+m.bubbleW<=y.bx||y.by+y.bubbleH<=m.by||m.by+m.bubbleH<=y.by);for(let y=1;y<_.length;y++){const m=_[y];if(m===void 0)continue;let v=!1;for(let T=0;T<y;T++){const I=_[T];if(I!==void 0&&E(m,I)){v=!0;break}}if(!v)continue;const S=m.side==="above"?"below":"above",C=S==="above"?m.carTop-2-4-m.bubbleH:m.carBottom+2+4,A={...m,side:S,by:C};let R=!0;for(let T=0;T<y;T++){const I=_[T];if(I!==void 0&&E(A,I)){R=!1;break}}R&&(_[y]=A)}for(const y of _){const{bubble:m,alpha:v,cx:S,carTop:C,carBottom:A,bubbleW:R,bubbleH:T,side:I,bx:x,by:M}=y,D=I==="above"?C-2:A+2,L=I==="above"?M+T:M,j=Math.min(Math.max(S,x+6+5/2),x+R-6-5/2);e.save(),e.globalAlpha=v,e.shadowColor=w,e.shadowBlur=8,e.fillStyle="rgba(16, 19, 26, 0.94)",V(e,x,M,R,T,6),e.fill(),e.shadowBlur=0,e.strokeStyle=jn(w,.65),e.lineWidth=1,V(e,x,M,R,T,6),e.stroke(),e.beginPath(),e.moveTo(j-5/2,L),e.lineTo(j+5/2,L),e.lineTo(j,D),e.closePath(),e.fillStyle="rgba(16, 19, 26, 0.94)",e.fill(),e.stroke(),e.fillStyle="#f0f3fb",e.textAlign="center",e.fillText(m.text,x+R/2,M+T/2),e.restore()}}function Rr(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function Ar(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:Ve(o)})}return t}function Ve(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function Jn(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function xr(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function Mr(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function Pr(e,t,n,o,i,r){const l=Math.abs(t-e);if(l<.001)return 0;const s=Math.abs(n);if(s*s/(2*r)>=l)return s>0?s/r:0;const c=Math.max(0,(o-s)/i),f=s*c+.5*i*c*c,p=o/r,d=o*o/(2*r);if(f+d>=l){const h=(2*i*r*l+r*s*s)/(i+r),g=Math.sqrt(Math.max(h,s*s));return(g-s)/i+g/r}const u=l-f-d;return c+u/Math.max(o,.001)+p}const Zn={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},Ue={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function Lr(e,t,n,o,i,r){const l=i/2,s=o-r/2,a=Et[t.phase]??"#6b6b75",c=e.createLinearGradient(n,s,n,s+r);c.addColorStop(0,Ge(a,.14)),c.addColorStop(1,Ge(a,-.18)),e.fillStyle=c,V(e,n-l,s,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-l+2,s+r*.36,i-4,Math.max(1.5,r*.1))}function Fr(e,t,n,o,i){if(t.length===0)return;const r=7,l=4,s=i.fontSmall+2,a=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;const c=(d,u)=>{const h=[d.carName,Ve(d.altitudeM),Jn(d.velocity),`${Zn[d.phase]} · ${d.layer}`];let g=0;for(const y of h)g=Math.max(g,e.measureText(y).width);const b=g+r*2,w=h.length*s+l*2;let _=u==="right"?d.cx+a:d.cx-a-b;_=Math.max(2,Math.min(o-b-2,_));const E=d.cy-w/2;return{hud:d,lines:h,bx:_,by:E,bubbleW:b,bubbleH:w,side:u}},f=(d,u)=>!(d.bx+d.bubbleW<=u.bx||u.bx+u.bubbleW<=d.bx||d.by+d.bubbleH<=u.by||u.by+u.bubbleH<=d.by),p=[];t.forEach((d,u)=>{let h=c(d,u%2===0?"right":"left");if(p.some(g=>f(h,g))){const g=c(d,h.side==="right"?"left":"right");if(p.every(b=>!f(g,b)))h=g;else{const b=Math.max(...p.map(w=>w.by+w.bubbleH));h={...h,by:b+4}}}p.push(h)});for(const d of p){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",V(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=Ue[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,V(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let u=0;u<d.lines.length;u++){const h=d.by+l+s*u+s/2,g=d.lines[u]??"";e.fillStyle=u===0||u===3?Ue[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(g,d.bx+r,h)}e.restore()}}function Br(e,t,n,o,i,r){if(t.length===0)return;const l=18,s=10,a=6,c=5,f=r.fontSmall+2.5,d=a*2+5*f,u=l+a+(d+c)*t.length;e.save();const h=e.createLinearGradient(n,i,n,i+u);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,V(e,n,i,o,u,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,V(e,n,i,o,u,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+s,i+l/2+2);let g=i+l+a;for(const b of t){e.fillStyle="rgba(15, 15, 18, 0.55)",V(e,n+6,g,o-12,d,5),e.fill(),e.fillStyle=Ue[b.phase],e.fillRect(n+6,g,2,d);const w=n+s+4,_=n+o-s;let E=g+a+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(b.carName,w,E),e.textAlign="right",e.fillStyle=Ue[b.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(Zn[b.phase].toUpperCase(),_,E);const y=b.etaSeconds!==void 0&&Number.isFinite(b.etaSeconds)?Mr(b.etaSeconds):"—",m=[["Altitude",Ve(b.altitudeM)],["Velocity",Jn(b.velocity)],["Dest",b.destinationName??"—"],["ETA",y]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;for(const[v,S]of m)E+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(v,w,E),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(S,_,E);g+=d+c}e.restore()}function $r(e,t,n,o,i,r,l){return[...e.cars].sort((a,c)=>a.id-c.id).map((a,c)=>{const f=a.y,p=a.target!==void 0?e.stops.find(u=>u.entity_id===a.target):void 0,d=p?Pr(f,p.y,a.v,i,r,l):void 0;return{cx:n,cy:t.toScreenAlt(f),altitudeM:f,velocity:a.v,phase:xr(a.v,o.get(a.id)??0,i),layer:Rr(f),carName:`Climber ${String.fromCharCode(65+c)}`,destinationName:p?.name,etaSeconds:d}})}const ue=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function it(e,t,n){return e+(t-e)*n}function rt(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round(it(o>>16&255,i>>16&255,n)),l=Math.round(it(o>>8&255,i>>8&255,n)),s=Math.round(it(o&255,i&255,n));return`#${(r<<16|l<<8|s).toString(16).padStart(6,"0")}`}function Or(e,t){let n=0;for(;n<ue.length-1;n++){const c=ue[n+1];if(c===void 0||e<=c[0])break}const o=ue[n],i=ue[Math.min(n+1,ue.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],l=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),s=rt(o[1],i[1],l),a=rt(o[2],i[2],l);return rt(s,a,t)}const Dr=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function Wr(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),l=Math.log10(1+t.axisMaxM/1e3),s=[0,.05,.15,.35,.6,1];for(const c of s){const f=1e3*(10**(c*l)-1);r.addColorStop(c,Or(f,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const c of Dr){const f=t.axisMaxM*c.altFrac;if(f<8e4)continue;const p=t.toScreenAlt(f),d=n+c.xFrac*(o-n),u=c.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${u.toFixed(3)})`,e.beginPath(),e.arc(d,p,c.size,0,Math.PI*2),e.fill()}e.restore();const a=Ar(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const c of a){const f=t.toScreenAlt(c.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(o,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(c.label,n+4,f-6))}}function Nr(e,t,n,o){const r=o-28,l=e.createLinearGradient(0,r,0,o);l.addColorStop(0,"rgba(0,0,0,0)"),l.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),l.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=l,e.fillRect(t,r,n-t,28),e.strokeStyle=jn("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function qr(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function Hr(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const l=-Math.PI/2+r*Math.PI/3,s=t+Math.cos(l)*i,a=n+Math.sin(l)*i;r===0?e.moveTo(s,a):e.lineTo(s,a)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function Gr(e,t,n,o,i,r,l){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const s of t.stops){const a=n.toScreenAlt(s.y);if(a<n.shaftTop||a>n.shaftBottom)continue;const c=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-c/2,a),e.lineTo(o-5,a),e.moveTo(o+5,a),e.lineTo(o+c/2,a),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-c/2,a),e.lineTo(o-5,a-5),e.moveTo(o+c/2,a),e.lineTo(o+5,a-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(s.name,r+l-4,a-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(Ve(s.y),r+l-4,a+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function Ur(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const l=Math.log10(1+Math.max(0,r)/1e3),s=i<=0?0:Math.max(0,Math.min(1,l/i));return t-s*(t-e)}}}function zr(e,t,n,o,i,r,l){const s=Math.max(2,l.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const c=r.get(a.target);if(c===void 0)continue;const f=t.stops[c];if(f===void 0)continue;const p=i.get(a.id);if(p===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,p),e.lineTo(o,d),e.stroke(),e.fillStyle=Kn,e.beginPath(),e.arc(o,d,s,0,Math.PI*2),e.fill())}}function jr(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function Xr(e,t,n,o,i,r,l){l.firstDrawAt===0&&(l.firstDrawAt=performance.now());const s=(performance.now()-l.firstDrawAt)/1e3,a=r.showDayNight?jr(s):.5,c=n>=520&&o>=360,f=Math.min(120,Math.max(72,n*.16)),p=c?Math.min(220,Math.max(160,n*.24)):0,d=c?14:0,u=i.padX,h=u+f+4,g=n-i.padX-p-d,b=(h+g)/2,w=12,_=i.padTop+24,E=o-i.padBottom-18,y=Ur(_,E,r);Wr(e,y,h+w,g-w,a),Nr(e,h+w,g-w,E),qr(e,b,y),Hr(e,b,y.shaftTop,i),Gr(e,t,y,b,i,u,f);const m=Math.max(20,Math.min(34,g-h-8)),v=Math.max(16,Math.min(26,m*.72));i.carH=v,i.carW=m;const S=new Map,C=new Map;t.stops.forEach((T,I)=>C.set(T.entity_id,I));for(const T of t.cars)S.set(T.id,y.toScreenAlt(T.y));zr(e,t,y,b,S,C,i);for(const T of t.cars){const I=S.get(T.id);I!==void 0&&Lr(e,T,b,I,m,v)}const R=[...$r(t,y,b,l.prevVelocity,l.maxSpeed,l.acceleration,l.deceleration)].sort((T,I)=>I.altitudeM-T.altitudeM);Fr(e,R,m,n-p-d,i),c&&Br(e,R,n-i.padX-p,p,_,i);for(const T of t.cars)l.prevVelocity.set(T.id,T.v);if(l.prevVelocity.size>t.cars.length){const T=new Set(t.cars.map(I=>I.id));for(const I of l.prevVelocity.keys())T.has(I)||l.prevVelocity.delete(I)}}function Vr(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function ln(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}class Yr{#e;#t;#n=window.devicePixelRatio||1;#i;#r=null;#s=-1;#d=new Map;#a;#o=new Map;#l=new Map;#c=[];#p=null;#g=new Map;#m=1;#y=1;#b=1;#f=0;#u=new Map;constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#t=o,this.#a=n,this.#h(),this.#i=()=>{this.#h()},window.addEventListener("resize",this.#i)}dispose(){window.removeEventListener("resize",this.#i)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#g.clear(),this.#f=0,this.#u.clear()}setTetherPhysics(t,n,o){Number.isFinite(t)&&t>0&&(this.#m=t),Number.isFinite(n)&&n>0&&(this.#y=n),Number.isFinite(o)&&o>0&&(this.#b=o)}pushAssignment(t,n,o){let i=this.#u.get(t);i===void 0&&(i=new Map,this.#u.set(t,i)),i.set(o,n)}#h(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#n,i=n*this.#n;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}draw(t,n,o){this.#h();const{clientWidth:i,clientHeight:r}=this.#e,l=this.#t;if(l.clearRect(0,0,i,r),t.stops.length===0||i===0||r===0)return;i!==this.#s&&(this.#r=Vr(i),this.#s=i);const s=this.#r;if(s===null)return;if(this.#p!==null){this.#S(t,i,r,s,n,o,this.#p);return}const a=t.stops.length===2,c=t.stops[0];if(c===void 0)return;let f=c.y,p=c.y;for(let k=1;k<t.stops.length;k++){const P=t.stops[k];if(P===void 0)continue;const F=P.y;F<f&&(f=F),F>p&&(p=F)}const d=t.stops.map(k=>k.y).sort((k,P)=>k-P),u=d.length>=3?(d.at(-1)??0)-(d.at(-2)??0):1,g=f-1,b=p+u,w=Math.max(b-g,1e-4),_=a?18:0;let E,y;if(a)E=s.padTop+_,y=r-s.padBottom-_;else{const k=[];for(let oe=1;oe<d.length;oe++){const Ee=d[oe],Ie=d[oe-1];if(Ee===void 0||Ie===void 0)continue;const Q=Ee-Ie;Q>0&&k.push(Q)}const $=48/(k.length>0?Math.min(...k):1),X=Math.max(0,r-s.padTop-s.padBottom)/w,Y=Math.min(X,$),ne=w*Y;y=r-s.padBottom,E=y-ne}const m=k=>y-(k-g)/w*(y-E),v=this.#d;v.forEach(k=>k.length=0);for(const k of t.cars){const P=v.get(k.line);P?P.push(k):v.set(k.line,[k])}const S=[...v.keys()].sort((k,P)=>k-P),C=S.reduce((k,P)=>k+(v.get(P)?.length??0),0),A=Math.max(0,i-2*s.padX-s.labelW),R=s.figureStride*2,T=s.shaftSpacing*Math.max(C-1,0),x=(A-T)/Math.max(C,1),M=a?34:s.maxShaftInnerW,L=Math.max(s.minShaftInnerW,Math.min(M,x*.55)),j=Math.max(0,Math.min(x-L,R+s.figureStride*4)),_e=Math.max(14,L-6);let W=1/0;if(t.stops.length>=2)for(let k=1;k<d.length;k++){const P=d[k-1],F=d[k];if(P===void 0||F===void 0)continue;const $=m(P)-m(F);$>0&&$<W&&(W=$)}const Ce=m(p)-2,Te=Number.isFinite(W)?W:s.carH,po=a?s.carH:Te,uo=Math.max(14,Math.min(po,Ce));if(!a&&Number.isFinite(W)){const k=Math.max(1.5,Math.min(W*.067,4)),P=s.figureStride*(k/s.figureHeadR);s.figureHeadR=k,s.figureStride=P}s.shaftInnerW=L,s.carW=_e,s.carH=uo;const fo=s.padX+s.labelW,ho=L+j,Qe=[],pe=new Map,Je=new Map;let Rt=0;for(const k of S){const P=v.get(k)??[];for(const F of P){const $=fo+Rt*(ho+s.shaftSpacing),H=$,X=$+j,Y=X+L/2;Qe.push(Y),pe.set(F.id,Y),Je.set(F.id,{start:H,end:X}),Rt++}}const At=new Map;t.stops.forEach((k,P)=>At.set(k.entity_id,P));const xt=new Set;{let k=0;for(const P of S){const F=v.get(P)??[];for(const $ of F){if($.phase==="loading"||$.phase==="door-opening"||$.phase==="door-closing"){const H=ln(t.stops,$.y);H!==void 0&&H.dist<.5&&xt.add(`${k}:${H.stop.entity_id}`)}k++}}}const Mt=new Map,Pt=new Map,Lt=new Map,Ft=new Map,Bt=[],$t=[];let Ot=0;for(let k=0;k<S.length;k++){const P=S[k];if(P===void 0)continue;const F=v.get(P)??[],$=nr[k]??ir,H=or[k]??rr,X=sr[k]??1,Y=dr[k]??pr,ne=Math.max(14,L*X),oe=Math.max(10,_e*X),Ee=Math.max(10,s.carH),Ie=k===2?lr:k===3?cr:ot;let Q=1/0,Ze=-1/0,Re=1/0;for(const K of F){Mt.set(K.id,ne),Pt.set(K.id,oe),Lt.set(K.id,Ee),Ft.set(K.id,Ie);const ie=Qe[Ot];if(ie===void 0)continue;const Dt=Number.isFinite(K.min_served_y)&&Number.isFinite(K.max_served_y),et=Dt?Math.max(E,m(K.max_served_y)-s.carH-2):E,go=Dt?Math.min(y,m(K.min_served_y)+2):y;Bt.push({cx:ie,top:et,bottom:go,fill:$,frame:H,width:ne}),ie<Q&&(Q=ie),ie>Ze&&(Ze=ie),et<Re&&(Re=et),Ot++}S.length>1&&Number.isFinite(Q)&&Number.isFinite(Re)&&$t.push({cx:(Q+Ze)/2,top:Re,text:ar[k]??`Line ${k+1}`,color:Y})}Sr(l,Bt),wr(l,$t,s),vr(l,t,m,s,Qe,i,xt,E,a),kr(l,t,m,s,Je,this.#u),Cr(l,t,pe,Mt,m,s,At);for(const[k,P]of pe){const F=t.cars.find(ne=>ne.id===k);if(!F)continue;const $=Pt.get(k)??s.carW,H=Lt.get(k)??s.carH,X=Ft.get(k)??ot,Y=this.#o.get(k);Tr(l,F,P,$,H,m),Er(l,F,P,$,H,X,m,s,Y?.roster)}this.#w(t,pe,Je,m,s,n),this.#v(s),o&&o.size>0&&Ir(l,this.#a,t,pe,m,s,o,i)}#S(t,n,o,i,r,l,s){const a={prevVelocity:this.#g,maxSpeed:this.#m,acceleration:this.#y,deceleration:this.#b,firstDrawAt:this.#f};Xr(this.#t,t,n,o,i,s,a),this.#f=a.firstDrawAt}#w(t,n,o,i,r,l){const s=performance.now(),a=Math.max(1,l),c=hr/a,f=30/a,p=new Map,d=[];for(const u of t.cars){const h=this.#o.get(u.id),g=u.riders,b=n.get(u.id),w=ln(t.stops,u.y),_=u.phase==="loading"&&w!==void 0&&w.dist<.5?w.stop:void 0;if(h&&b!==void 0&&_!==void 0){const m=g-h.riders;if(m>0&&p.set(_.entity_id,(p.get(_.entity_id)??0)+m),m!==0){const v=i(_.y),S=i(u.y)-r.carH/2,C=Math.min(Math.abs(m),6);if(m>0){const A=_.waiting_up>=_.waiting_down,R=o.get(u.id);let T=b-20;if(R!==void 0){const M=R.start,D=R.end;T=(M+D)/2}const I=A?Xn:Vn,x=this.#u.get(_.entity_id);x!==void 0&&(x.delete(u.line),x.size===0&&this.#u.delete(_.entity_id));for(let M=0;M<C;M++)d.push(()=>this.#c.push({kind:"board",bornAt:s+M*f,duration:c,startX:T,startY:v,endX:b,endY:S,color:I}))}else for(let A=0;A<C;A++)d.push(()=>this.#c.push({kind:"alight",bornAt:s+A*f,duration:c,startX:b,startY:S,endX:b+18,endY:S+10,color:ot}))}}const E=h?.roster??[];let y;if(h){const m=g-h.riders;if(y=E.slice(),m>0&&_!==void 0){const S=_.waiting_up>=_.waiting_down?0:1e4;for(let C=0;C<m;C++)y.push(le(_.entity_id,C+S))}else if(m>0)for(let v=0;v<m;v++)y.push(le(u.id,y.length+v));else m<0&&y.splice(y.length+m,-m)}else{y=[];for(let m=0;m<g;m++)y.push(le(u.id,m))}for(;y.length>g;)y.pop();for(;y.length<g;)y.push(le(u.id,y.length));this.#o.set(u.id,{riders:g,roster:y})}for(const u of t.stops){const h=u.waiting_up+u.waiting_down,g=this.#l.get(u.entity_id);if(g){const b=g.waiting-h,w=p.get(u.entity_id)??0,_=Math.max(0,b-w);if(_>0){const E=i(u.y),y=r.padX+r.labelW+20,m=Math.min(_,4);for(let v=0;v<m;v++)this.#c.push({kind:"abandon",bornAt:s+v*f,duration:c*1.5,startX:y,startY:E,endX:y-26,endY:E-6,color:Yn})}}this.#l.set(u.entity_id,{waiting:h})}for(const u of d)u();for(let u=this.#c.length-1;u>=0;u--){const h=this.#c[u];h!==void 0&&s-h.bornAt>h.duration&&this.#c.splice(u,1)}if(this.#o.size>t.cars.length){const u=new Set(t.cars.map(h=>h.id));for(const h of this.#o.keys())u.has(h)||this.#o.delete(h)}if(this.#l.size>t.stops.length){const u=new Set(t.stops.map(h=>h.entity_id));for(const h of this.#l.keys())u.has(h)||this.#l.delete(h)}}#v(t){const n=performance.now(),o=this.#t;for(const i of this.#c){const r=n-i.bornAt;if(r<0)continue;const l=Math.min(1,Math.max(0,r/i.duration)),s=Zi(l),[a,c]=i.kind==="board"?Ji(i.startX,i.startY,i.endX,i.endY,s):[i.startX+(i.endX-i.startX)*s,i.startY+(i.endY-i.startY)*s],f=i.kind==="board"?.9:i.kind==="abandon"?(1-s)**1.5:1-s,p=i.kind==="abandon"?t.carDotR*.85:t.carDotR;o.fillStyle=Tt(i.color,f),o.beginPath(),o.arc(a,c,p,0,Math.PI*2),o.fill()}}}const Kr="#7dd3fc",Qr="#fda4af";async function cn(e,t,n,o,i){const r=bo(o,i),l=await Ct.create(r,t,n),s=new Yr(e.canvas,e.accent);if(s.setTetherConfig(o.tether??null),o.tether){const c=wt(o,i);s.setTetherPhysics(c.maxSpeed,c.acceleration,c.deceleration)}const a=e.canvas.parentElement;if(a){const c=o.stops.length,p=o.tether?640:Math.max(200,c*16);a.style.setProperty("--shaft-min-h",`${p}px`)}return{strategy:t,sim:l,renderer:s,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function fe(e){e?.sim.dispose(),e?.renderer.dispose()}function ut(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const Jr=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],Zr=120;function dn(e,t,n){const o=e.sim.metrics();e.latestMetrics=o;for(const r of Jr){const l=e.metricHistory[r];l.push(o[r]),l.length>Zr&&l.shift()}const i=performance.now();for(const[r,l]of e.bubbles)l.expiresAt<=i&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const es={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},ts=1e3;function ns(e,t,n){const o=performance.now(),i=r=>is(n,r);for(const r of t){const l=os(r,i);if(l===null)continue;const s=r.elevator;if(s===void 0)continue;const a=es[r.kind]??ts;e.bubbles.set(s,{text:l,bornAt:o,expiresAt:o+a})}}function os(e,t){switch(e.kind){case"elevator-assigned":return`› To ${t(e.stop)}`;case"elevator-repositioning":return`↻ Reposition to ${t(e.stop)}`;case"elevator-arrived":return`● At ${t(e.stop)}`;case"door-opened":return"◌ Doors open";case"rider-boarded":return"+ Boarding";case"rider-exited":return`↓ Off at ${t(e.stop)}`;default:return null}}function is(e,t){return e.stops.find(o=>o.entity_id===t)?.name??`stop #${t}`}const rs={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function pn(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=rs[t],e.modeEl.title=t)}function ss(){const e=s=>{const a=document.getElementById(s);if(!a)throw new Error(`missing element #${s}`);return a},t=s=>document.getElementById(s),n=(s,a)=>({root:e(`pane-${s}`),canvas:e(`shaft-${s}`),name:e(`name-${s}`),mode:e(`mode-${s}`),desc:e(`desc-${s}`),metrics:e(`metrics-${s}`),trigger:e(`strategy-trigger-${s}`),popover:e(`strategy-popover-${s}`),repoTrigger:e(`repo-trigger-${s}`),repoName:e(`repo-name-${s}`),repoPopover:e(`repo-popover-${s}`),accent:a,which:s}),o=s=>{const a=document.querySelector(`.tweak-row[data-key="${s}"]`);if(!a)throw new Error(`missing tweak row for ${s}`);const c=p=>{const d=a.querySelector(p);if(!d)throw new Error(`missing ${p} in tweak row ${s}`);return d},f=p=>a.querySelector(p);return{root:a,value:c(".tweak-value"),defaultV:c(".tweak-default-v"),dec:c(".tweak-dec"),inc:c(".tweak-inc"),reset:c(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},i={};for(const s of de)i[s]=o(s);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",Kr),paneB:n("b",Qr)};No(r);const l=document.getElementById("controls-bar");return l&&new ResizeObserver(([a])=>{if(!a)return;const c=Math.ceil(a.borderBoxSize[0]?.blockSize??a.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${c}px`)}).observe(l),r}function eo(e,t,n,o,i,r,l,s,a){const c=document.createDocumentFragment();for(const f of t){const p=document.createElement("button");p.type="button",p.className="strategy-option",p.setAttribute("role","menuitemradio"),p.setAttribute("aria-checked",f===r?"true":"false"),p.dataset[i]=f;const d=document.createElement("span");d.className="strategy-option-name";const u=document.createElement("span");if(u.className="strategy-option-label",u.textContent=n[f],d.appendChild(u),l&&f===l){const g=document.createElement("span");g.className="strategy-option-sibling",g.textContent=`also in ${s}`,d.appendChild(g)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=o[f],p.append(d,h),p.addEventListener("click",()=>{a(f)}),c.appendChild(p)}e.replaceChildren(c)}function ee(e,t){const n=vt[t],o=On[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function un(e,t,n,o,i){eo(e.repoPopover,Oo,vt,On,"reposition",t,n,o,i)}function ye(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;un(t.paneA,o,r?i:null,"B",l=>void hn(e,t,"a",l,n)),un(t.paneB,i,r?o:null,"A",l=>void hn(e,t,"b",l,n))}function ft(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function to(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function ht(e){ft(e.paneA,!1),ft(e.paneB,!1)}function Ye(e){mt(e),ht(e)}function fn(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;Ye(t),r&&(ye(e,t,o),ft(n,!0))})}async function hn(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){ht(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},ee(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},ee(t.paneB,o)),G(e.permalink),ye(e,t,i),ht(t),await i(),N(t.toast,`${n==="a"?"A":"B"} park: ${vt[o]}`)}function as(e){document.addEventListener("click",t=>{if(!no(e)&&!to(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;Ye(e)}})}function te(e,t){const n=je[t],o=$n[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function gn(e,t,n,o,i){eo(e.popover,$o,je,$n,"strategy",t,n,o,i)}function be(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;gn(t.paneA,o,r?i:null,"B",l=>void yn(e,t,"a",l,n)),gn(t.paneB,i,r?o:null,"A",l=>void yn(e,t,"b",l,n))}function gt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function no(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function mt(e){gt(e.paneA,!1),gt(e.paneB,!1)}function mn(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;Ye(t),r&&(be(e,t,o),gt(n,!0))})}async function yn(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){mt(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},te(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},te(t.paneB,o)),G(e.permalink),be(e,t,i),mt(t),await i(),N(t.toast,`${n==="a"?"A":"B"}: ${je[o]}`)}function bn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function ls(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function Ke(e,t,n){let o=!1;for(const i of de){const r=n.tweakRows[i],l=e.tweakRanges[i],s=Z(e,i,t),a=bt(e,i),c=St(e,i,s);c&&(o=!0),r.value.textContent=bn(i,s),r.defaultV.textContent=bn(i,a),r.dec.disabled=s<=l.min+1e-9,r.inc.disabled=s>=l.max-1e-9,r.root.dataset.overridden=String(c),r.reset.hidden=!c;const f=Math.max(l.max-l.min,1e-9),p=Math.max(0,Math.min(1,(s-l.min)/f)),d=Math.max(0,Math.min(1,(a-l.min)/f));r.trackFill&&(r.trackFill.style.width=`${(p*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(p*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function oo(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function It(e,t,n,o){const i=wt(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},l=[e.paneA,e.paneB].filter(a=>a!==null),s=l.every(a=>a.sim.applyPhysicsLive(r));if(s)for(const a of l)a.renderer?.setTetherPhysics(i.maxSpeed,i.acceleration,i.deceleration);Ke(n,e.permalink.overrides,t),s||o()}function cs(e,t,n){return Math.min(n,Math.max(t,e))}function ds(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function Me(e,t,n,o,i){const r=q(e.permalink.scenario),l=r.tweakRanges[n],s=Z(r,n,e.permalink.overrides),a=cs(s+o*l.step,l.min,l.max),c=ds(a,l.min,l.step);fs(e,t,n,c,i)}function ps(e,t,n,o){const i=q(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},G(e.permalink),n==="cars"?(o(),N(t.toast,"Cars reset")):(It(e,t,i,o),N(t.toast,`${ls(n)} reset`))}async function us(e,t,n){const o=q(e.permalink.scenario),i=St(o,"cars",Z(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},G(e.permalink),i?await n():It(e,t,o,n),N(t.toast,"Parameters reset")}function fs(e,t,n,o,i){const r=q(e.permalink.scenario),l={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:Rn(r,l)},G(e.permalink),n==="cars"?i():It(e,t,r,i)}function hs(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function gs(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var Pe={exports:{}},ms=Pe.exports,Sn;function ys(){return Sn||(Sn=1,(function(e){(function(t,n,o){function i(a){var c=this,f=s();c.next=function(){var p=2091639*c.s0+c.c*23283064365386963e-26;return c.s0=c.s1,c.s1=c.s2,c.s2=p-(c.c=p|0)},c.c=1,c.s0=f(" "),c.s1=f(" "),c.s2=f(" "),c.s0-=f(a),c.s0<0&&(c.s0+=1),c.s1-=f(a),c.s1<0&&(c.s1+=1),c.s2-=f(a),c.s2<0&&(c.s2+=1),f=null}function r(a,c){return c.c=a.c,c.s0=a.s0,c.s1=a.s1,c.s2=a.s2,c}function l(a,c){var f=new i(a),p=c&&c.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,p&&(typeof p=="object"&&r(p,f),d.state=function(){return r(f,{})}),d}function s(){var a=4022871197,c=function(f){f=String(f);for(var p=0;p<f.length;p++){a+=f.charCodeAt(p);var d=.02519603282416938*a;a=d>>>0,d-=a,d*=a,a=d>>>0,d-=a,a+=d*4294967296}return(a>>>0)*23283064365386963e-26};return c}n&&n.exports?n.exports=l:this.alea=l})(ms,e)})(Pe)),Pe.exports}var Le={exports:{}},bs=Le.exports,wn;function Ss(){return wn||(wn=1,(function(e){(function(t,n,o){function i(s){var a=this,c="";a.x=0,a.y=0,a.z=0,a.w=0,a.next=function(){var p=a.x^a.x<<11;return a.x=a.y,a.y=a.z,a.z=a.w,a.w^=a.w>>>19^p^p>>>8},s===(s|0)?a.x=s:c+=s;for(var f=0;f<c.length+64;f++)a.x^=c.charCodeAt(f)|0,a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a}function l(s,a){var c=new i(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xor128=l})(bs,e)})(Le)),Le.exports}var Fe={exports:{}},ws=Fe.exports,vn;function vs(){return vn||(vn=1,(function(e){(function(t,n,o){function i(s){var a=this,c="";a.next=function(){var p=a.x^a.x>>>2;return a.x=a.y,a.y=a.z,a.z=a.w,a.w=a.v,(a.d=a.d+362437|0)+(a.v=a.v^a.v<<4^(p^p<<1))|0},a.x=0,a.y=0,a.z=0,a.w=0,a.v=0,s===(s|0)?a.x=s:c+=s;for(var f=0;f<c.length+64;f++)a.x^=c.charCodeAt(f)|0,f==c.length&&(a.d=a.x<<10^a.x>>>4),a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a.v=s.v,a.d=s.d,a}function l(s,a){var c=new i(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xorwow=l})(ws,e)})(Fe)),Fe.exports}var Be={exports:{}},ks=Be.exports,kn;function _s(){return kn||(kn=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var f=a.x,p=a.i,d,u;return d=f[p],d^=d>>>7,u=d^d<<24,d=f[p+1&7],u^=d^d>>>10,d=f[p+3&7],u^=d^d>>>3,d=f[p+4&7],u^=d^d<<7,d=f[p+7&7],d=d^d<<13,u^=d^d<<9,f[p]=u,a.i=p+1&7,u};function c(f,p){var d,u=[];if(p===(p|0))u[0]=p;else for(p=""+p,d=0;d<p.length;++d)u[d&7]=u[d&7]<<15^p.charCodeAt(d)+u[d+1&7]<<13;for(;u.length<8;)u.push(0);for(d=0;d<8&&u[d]===0;++d);for(d==8?u[7]=-1:u[d],f.x=u,f.i=0,d=256;d>0;--d)f.next()}c(a,s)}function r(s,a){return a.x=s.x.slice(),a.i=s.i,a}function l(s,a){s==null&&(s=+new Date);var c=new i(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(f.x&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xorshift7=l})(ks,e)})(Be)),Be.exports}var $e={exports:{}},Cs=$e.exports,_n;function Ts(){return _n||(_n=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var f=a.w,p=a.X,d=a.i,u,h;return a.w=f=f+1640531527|0,h=p[d+34&127],u=p[d=d+1&127],h^=h<<13,u^=u<<17,h^=h>>>15,u^=u>>>12,h=p[d]=h^u,a.i=d,h+(f^f>>>16)|0};function c(f,p){var d,u,h,g,b,w=[],_=128;for(p===(p|0)?(u=p,p=null):(p=p+"\0",u=0,_=Math.max(_,p.length)),h=0,g=-32;g<_;++g)p&&(u^=p.charCodeAt((g+32)%p.length)),g===0&&(b=u),u^=u<<10,u^=u>>>15,u^=u<<4,u^=u>>>13,g>=0&&(b=b+1640531527|0,d=w[g&127]^=u+b,h=d==0?h+1:0);for(h>=128&&(w[(p&&p.length||0)&127]=-1),h=127,g=512;g>0;--g)u=w[h+34&127],d=w[h=h+1&127],u^=u<<13,d^=d<<17,u^=u>>>15,d^=d>>>12,w[h]=u^d;f.w=b,f.X=w,f.i=h}c(a,s)}function r(s,a){return a.i=s.i,a.w=s.w,a.X=s.X.slice(),a}function l(s,a){s==null&&(s=+new Date);var c=new i(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(f.X&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xor4096=l})(Cs,e)})($e)),$e.exports}var Oe={exports:{}},Es=Oe.exports,Cn;function Is(){return Cn||(Cn=1,(function(e){(function(t,n,o){function i(s){var a=this,c="";a.next=function(){var p=a.b,d=a.c,u=a.d,h=a.a;return p=p<<25^p>>>7^d,d=d-u|0,u=u<<24^u>>>8^h,h=h-p|0,a.b=p=p<<20^p>>>12^d,a.c=d=d-u|0,a.d=u<<16^d>>>16^h,a.a=h-p|0},a.a=0,a.b=0,a.c=-1640531527,a.d=1367130551,s===Math.floor(s)?(a.a=s/4294967296|0,a.b=s|0):c+=s;for(var f=0;f<c.length+20;f++)a.b^=c.charCodeAt(f)|0,a.next()}function r(s,a){return a.a=s.a,a.b=s.b,a.c=s.c,a.d=s.d,a}function l(s,a){var c=new i(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.tychei=l})(Es,e)})(Oe)),Oe.exports}var De={exports:{}};const Rs={},As=Object.freeze(Object.defineProperty({__proto__:null,default:Rs},Symbol.toStringTag,{value:"Module"})),xs=gs(As);var Ms=De.exports,Tn;function Ps(){return Tn||(Tn=1,(function(e){(function(t,n,o){var i=256,r=6,l=52,s="random",a=o.pow(i,r),c=o.pow(2,l),f=c*2,p=i-1,d;function u(y,m,v){var S=[];m=m==!0?{entropy:!0}:m||{};var C=w(b(m.entropy?[y,E(n)]:y??_(),3),S),A=new h(S),R=function(){for(var T=A.g(r),I=a,x=0;T<c;)T=(T+x)*i,I*=i,x=A.g(1);for(;T>=f;)T/=2,I/=2,x>>>=1;return(T+x)/I};return R.int32=function(){return A.g(4)|0},R.quick=function(){return A.g(4)/4294967296},R.double=R,w(E(A.S),n),(m.pass||v||function(T,I,x,M){return M&&(M.S&&g(M,A),T.state=function(){return g(A,{})}),x?(o[s]=T,I):T})(R,C,"global"in m?m.global:this==o,m.state)}function h(y){var m,v=y.length,S=this,C=0,A=S.i=S.j=0,R=S.S=[];for(v||(y=[v++]);C<i;)R[C]=C++;for(C=0;C<i;C++)R[C]=R[A=p&A+y[C%v]+(m=R[C])],R[A]=m;(S.g=function(T){for(var I,x=0,M=S.i,D=S.j,L=S.S;T--;)I=L[M=p&M+1],x=x*i+L[p&(L[M]=L[D=p&D+I])+(L[D]=I)];return S.i=M,S.j=D,x})(i)}function g(y,m){return m.i=y.i,m.j=y.j,m.S=y.S.slice(),m}function b(y,m){var v=[],S=typeof y,C;if(m&&S=="object")for(C in y)try{v.push(b(y[C],m-1))}catch{}return v.length?v:S=="string"?y:y+"\0"}function w(y,m){for(var v=y+"",S,C=0;C<v.length;)m[p&C]=p&(S^=m[p&C]*19)+v.charCodeAt(C++);return E(m)}function _(){try{var y;return d&&(y=d.randomBytes)?y=y(i):(y=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(y)),E(y)}catch{var m=t.navigator,v=m&&m.plugins;return[+new Date,t,v,t.screen,E(n)]}}function E(y){return String.fromCharCode.apply(0,y)}if(w(o.random(),n),e.exports){e.exports=u;try{d=xs}catch{}}else o["seed"+s]=u})(typeof self<"u"?self:Ms,[],Math)})(De)),De.exports}var st,En;function Ls(){if(En)return st;En=1;var e=ys(),t=Ss(),n=vs(),o=_s(),i=Ts(),r=Is(),l=Ps();return l.alea=e,l.xor128=t,l.xorwow=n,l.xorshift7=o,l.xor4096=i,l.tychei=r,st=l,st}var Fs=Ls();const Bs=hs(Fs),ze=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],at=ze.reduce((e,t)=>t.length<e.length?t:e).length,lt=ze.reduce((e,t)=>t.length>e.length?t:e).length;function $s(e){const t=e?.seed?new Bs(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let u=typeof n!="number"?at:s(n);const h=typeof o!="number"?lt:s(o);u>h&&(u=h);let g=!1,b;for(;!g;)b=l(),g=b.length<=h&&b.length>=u;return b}function l(){return ze[a(ze.length)]}function s(u){return u<at&&(u=at),u>lt&&(u=lt),u}function a(u){const h=t?t():Math.random();return Math.floor(h*u)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=u=>u),typeof e.separator!="string"&&(e.separator=" ");const c=e.min+a(e.max+1-e.min);let f=[],p="",d=0;for(let u=0;u<c*e.wordsPerString;u++)d===e.wordsPerString-1?p+=e.formatter(r(),d):p+=e.formatter(r(),d)+e.separator,d++,(u+1)%e.wordsPerString===0&&(f.push(p),p="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const io=e=>`${e}×`,ro=e=>`${e.toFixed(1)}×`;function so(){const e=$s({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function Os(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=io(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=ro(e.intensity),te(t.paneA,e.strategyA),te(t.paneB,e.strategyB),ee(t.paneA,e.repositionA),ee(t.paneB,e.repositionB),Dn(t,e.scenario);const n=q(e.scenario);Object.keys(e.overrides).length>0&&oo(t,!0),Ke(n,e.overrides,t)}function Se(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function ao(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function lo(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function Ds(e){if(e.length<2)return"M 0 13 L 100 13";let t=e[0]??0,n=e[0]??0;for(let l=1;l<e.length;l++){const s=e[l];s!==void 0&&(s<t&&(t=s),s>n&&(n=s))}const o=n-t,i=e.length;let r="";for(let l=0;l<i;l++){const s=l/(i-1)*100,a=o>0?13-((e[l]??0)-t)/o*12:7;r+=`${l===0?"M":"L"} ${s.toFixed(2)} ${a.toFixed(2)} `}return r.trim()}const yt=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function Ws(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Ns(e,t){const n=(u,h,g,b)=>Math.abs(u-h)<g?["tie","tie"]:(b?u>h:u<h)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,l]=n(e.max_wait_s,t.max_wait_s,.05,!1),[s,a]=n(e.delivered,t.delivered,.5,!0),[c,f]=n(e.abandoned,t.abandoned,.5,!1),[p,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:s,abandoned:c,utilization:p},b:{avg_wait_s:i,max_wait_s:l,delivered:a,abandoned:f,utilization:d}}}function In(e){const t=document.createDocumentFragment();for(const[n]of yt){const o=ce("div","metric-row flex flex-col gap-[3px] px-2.5 py-[7px] bg-surface-elevated border border-stroke-subtle rounded-md transition-colors duration-normal"),i=document.createElementNS("http://www.w3.org/2000/svg","svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS("http://www.w3.org/2000/svg","path")),o.append(ce("span","text-[9.5px] uppercase tracking-[0.08em] text-content-disabled font-medium",n),ce("span","metric-v text-[15px] text-content font-medium [font-feature-settings:'tnum'_1]"),i),t.appendChild(o)}e.replaceChildren(t)}function ct(e,t,n,o){const i=e.children;for(let r=0;r<yt.length;r++){const l=i[r];if(!l)continue;const s=yt[r];if(!s)continue;const a=s[1],c=n?n[a]:"";l.dataset.verdict!==c&&(l.dataset.verdict=c);const f=l.children[1],p=Ws(t,a);f.textContent!==p&&(f.textContent=p);const u=l.children[2].firstElementChild,h=Ds(o[a]);u.getAttribute("d")!==h&&u.setAttribute("d",h)}}const qs=200;function co(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function J(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=q(e.permalink.scenario);e.traffic=new zn(Bn(e.permalink.seed)),co(e,o),fe(e.paneA),fe(e.paneB),e.paneA=null,e.paneB=null;try{const i=await cn(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);te(t.paneA,e.permalink.strategyA),ee(t.paneA,e.permalink.repositionA),In(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await cn(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),te(t.paneB,e.permalink.strategyB),ee(t.paneB,e.permalink.repositionB),In(t.paneB.metrics)}catch(l){throw fe(i),l}if(n!==e.initToken){fe(i),fe(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,ao(e,t),lo(e,t),Ke(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&N(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function Hs(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<qs&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if(ut(e,l=>{const s=l.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);s.kind==="err"&&console.warn(`spawnRider failed (seed): ${s.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(co(e,q(e.permalink.scenario)),e.seeding=null)}function Gs(e,t){const n=()=>J(e,t),o={renderPaneStrategyInfo:te,renderPaneRepositionInfo:ee,refreshStrategyPopovers:()=>{be(e,t,n),ye(e,t,n)},renderTweakPanel:()=>{const r=q(e.permalink.scenario);Ke(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const l=r.target;if(!(l instanceof HTMLElement))return;const s=l.closest(".scenario-card");if(!s)return;const a=s.dataset.scenarioId;!a||a===e.permalink.scenario||Wn(e,t,a,n,o)}),mn(e,t,t.paneA,n),mn(e,t,t.paneB,n),fn(e,t,t.paneA,n),fn(e,t,t.paneB,n),be(e,t,n),ye(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},G(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",be(e,t,n),ye(e,t,n),J(e,t).then(()=>{N(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||O.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},G(e.permalink),J(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=so();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},G(e.permalink),J(e,t).then(()=>{N(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=io(r)}),t.speedInput.addEventListener("change",()=>{G(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=ro(r)}),t.intensityInput.addEventListener("change",()=>{G(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{J(e,t),N(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";oo(t,r)});for(const r of de){const l=t.tweakRows[r];Nt(l.dec,()=>{Me(e,t,r,-1,n)}),Nt(l.inc,()=>{Me(e,t,r,1,n)}),l.reset.addEventListener("click",()=>{ps(e,t,r,n)}),l.root.addEventListener("keydown",s=>{s.key==="ArrowUp"||s.key==="ArrowRight"?(s.preventDefault(),Me(e,t,r,1,n)):(s.key==="ArrowDown"||s.key==="ArrowLeft")&&(s.preventDefault(),Me(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{us(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=Fn(e.permalink),l=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(l).then(()=>{N(t.toast,"Permalink copied")},()=>{N(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{Se(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{Se(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&Se(t,!1)}),Us(e,t,o),as(t)}function Us(e,t,n){window.addEventListener("keydown",o=>{if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable)return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),Se(t,t.shortcutSheet.hidden);return}case"Escape":{if(no(t)||to(t)){o.preventDefault(),Ye(t);return}t.shortcutSheet.hidden||(o.preventDefault(),Se(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=ve.length){const r=ve[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),Wn(e,t,r.id,()=>J(e,t),n))}})}function zs(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=Ns(t.latestMetrics,n.latestMetrics);ct(t.metricsEl,t.latestMetrics,o.a,t.metricHistory),ct(n.metricsEl,n.latestMetrics,o.b,n.metricHistory)}else ct(t.metricsEl,t.latestMetrics,null,t.metricHistory);pn(t),n&&pn(n)}function js(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const l=e.paneA,s=e.paneB,a=l!==null&&(!e.permalink.compare||s!==null);if(e.running&&e.ready&&a){const c=e.permalink.speed;ut(e,g=>{g.sim.step(c);const b=g.sim.drainEvents();if(b.length>0){const w=g.sim.snapshot();ns(g,b,w);const _=new Map;for(const E of w.cars)_.set(E.id,E.line);for(const E of b)if(E.kind==="elevator-assigned"){const y=_.get(E.elevator);y!==void 0&&g.renderer.pushAssignment(E.stop,E.elevator,y)}}}),e.seeding&&Hs(e);const f=l.sim.snapshot(),d=Math.min(r,4/60)*c,u=e.seeding?[]:e.traffic.drainSpawns(f,d);for(const g of u)ut(e,b=>{const w=b.sim.spawnRider(g.originStopId,g.destStopId,g.weight,g.patienceTicks);w.kind==="err"&&console.warn(`spawnRider failed: ${w.error}`)});const h=e.permalink.speed;dn(l,l.sim.snapshot(),h),s&&dn(s,s.sim.snapshot(),h),zs(e),(n+=1)%4===0&&(ao(e,t),lo(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function Xs(){Un().catch(()=>{});const t=ss(),n=new URLSearchParams(window.location.search).has("k"),o={...O,...Fo(window.location.search)};if(!n){o.seed=so();const s=new URL(window.location.href);s.searchParams.set("k",o.seed),window.history.replaceState(null,"",s.toString())}qo(o);const i=q(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=Rn(i,o.overrides),Os(o,t);const l={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new zn(Bn(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};Gs(l,t),await J(l,t),l.ready=!0,js(l,t),l.permalink.mode==="quest"&&await Ki({initialStageId:l.permalink.questStage,onStageChange:s=>{l.permalink.questStage=s;const a=new URL(window.location.href);s===O.questStage?a.searchParams.delete("qs"):a.searchParams.set("qs",s),window.history.replaceState(null,"",a.toString())}})}Xs();export{qe as _};
