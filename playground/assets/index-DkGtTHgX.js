const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-DXC48tlE.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const l of r.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&o(l)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function de(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let Ut=0;function q(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(Ut),Ut=window.setTimeout(()=>{e.classList.remove("show")},1600)}function jt(e,t){let i=0,r=0;const l=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",s=>{e.disabled||(s.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){l();return}t()},70)},380))}),e.addEventListener("pointerup",l),e.addEventListener("pointerleave",l),e.addEventListener("pointercancel",l),e.addEventListener("blur",l),e.addEventListener("click",s=>{s.pointerType||t()})}function Z(e,t,n){const o=Tt(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return Ln(i,r.min,r.max)}function Tt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return Pn(n.doorOpenTicks,n.doorTransitionTicks)}}function Et(e,t,n){const o=Tt(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function Mn(e,t){const n={};for(const o of pe){const i=t[o];i!==void 0&&Et(e,o,i)&&(n[o]=i)}return n}const pe=["cars","maxSpeed","weightCapacity","doorCycleSec"];function vo(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=Pn(n,o),r=Ln(n/(i*He),.1,.9),l=Math.max(2,Math.round(t*He)),s=Math.max(1,Math.round(l*r)),a=Math.max(1,Math.round((l-s)/2));return{openTicks:s,transitionTicks:a}}function Pn(e,t){return(e+2*t)/He}function xt(e,t){const n=e.elevatorDefaults,o=Z(e,"maxSpeed",t),i=Z(e,"weightCapacity",t),r=Z(e,"doorCycleSec",t),{openTicks:l,transitionTicks:s}=vo(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:l,doorTransitionTicks:s}}function ko(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function _o(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(Z(e,"cars",t)),i=xt(e,t),r=ko(e.stops.length,o),l=e.stops.map((a,c)=>`        StopConfig(id: StopId(${c}), name: ${bt(a.name)}, position: ${j(a.positionM)}),`).join(`
`),s=r.map((a,c)=>To(c,i,a,Co(c,o))).join(`
`);return`SimConfig(
    building: BuildingConfig(
        name: ${bt(e.buildingName)},
        stops: [
${l}
        ],
    ),
    elevators: [
${s}
    ],
    simulation: SimulationParams(ticks_per_second: ${j(He)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${j(e.passengerWeightRange[0])}, ${j(e.passengerWeightRange[1])}),
    ),
)`}const He=60;function Ln(e,t,n){return Math.min(n,Math.max(t,e))}function Co(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function To(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${j(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${j(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${bt(o)},
            max_speed: ${j(t.maxSpeed)}, acceleration: ${j(t.acceleration)}, deceleration: ${j(t.deceleration)},
            weight_capacity: ${j(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function bt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function j(e){return Number.isInteger(e)?`${e}.0`:String(e)}const Fn={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function Me(e){return Array.from({length:e},()=>1)}const se=5,Eo=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:se},(e,t)=>t===se-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:Me(se),destWeights:Me(se)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:Me(se),destWeights:Me(se)}],xo={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:Eo,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...Fn,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},Ne=19,yt=16,ve=4,Bn=(1+Ne)*ve,ge=1,me=41,be=42,Io=43;function U(e){return Array.from({length:Io},(t,n)=>e(n))}const ae=e=>e===ge||e===me||e===be,Ro=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:U(e=>e===0?20:e===ge?2:e===me?1.2:e===be?.2:.1),destWeights:U(e=>e===0?0:e===ge?.3:e===me?.4:e===be?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:U(e=>ae(e)?.5:1),destWeights:U(e=>ae(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:U(e=>e===21?4:ae(e)?.25:1),destWeights:U(e=>e===21?5:ae(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:U(e=>e===0||e===ge||e===21?.3:e===me?.4:e===be?1.2:1),destWeights:U(e=>e===0?20:e===ge?1:e===me?.6:e===be?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:U(e=>ae(e)?1.5:.2),destWeights:U(e=>ae(e)?1.5:.2)}];function Ao(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let s=1;s<=Ne;s++){const a=1+s,c=s*ve;e.push(`        StopConfig(id: StopId(${a.toString().padStart(2," ")}), name: "Floor ${s}",    position: ${c.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${Bn.toFixed(1)}),`);for(let s=21;s<=20+yt;s++){const a=1+s,c=s*ve;e.push(`        StopConfig(id: StopId(${a}), name: "Floor ${s}",   position: ${c.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:Ne},(s,a)=>2+a),21],n=[21,...Array.from({length:yt},(s,a)=>22+a)],o=[1,21,38,39,40],i=[1,0,41,42],r=s=>s.map(a=>`StopId(${a})`).join(", "),l=(s,a,c,f)=>`                ElevatorConfig(
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
)`}const Mo=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:Ne},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*ve})),{name:"Sky Lobby",positionM:Bn},...Array.from({length:yt},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*ve})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],Po={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:Ro,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:Mo,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...Fn,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:Ao()},zt=1e5,Vt=4e5,Xt=35786e3,Lo=1e8,Fo=4;function Pe(e){return Array.from({length:Fo},(t,n)=>e(n))}const Bo={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:Pe(e=>e===0?6:1),destWeights:Pe(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:Pe(e=>e===0?0:e===1?1:e===2?3:5),destWeights:Pe(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:zt},{name:"LEO Transfer",positionM:Vt},{name:"GEO Platform",positionM:Xt}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:Lo,showDayNight:!1},ron:`SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${zt.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${Vt.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${Xt.toFixed(1)}),
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
)`},ke=[Po,Bo,xo];function H(e){const t=ke.find(o=>o.id===e);if(t)return t;const n=ke[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const $n={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},O={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},$o=["scan","look","nearest","etd","destination","rsr"],Do=["adaptive","predictive","lobby","spread","none"];function Yt(e,t){return e!==null&&$o.includes(e)?e:t}function Kt(e,t){return e!==null&&Do.includes(e)?e:t}function G(e){const t=Dn(e);window.location.search!==t&&window.history.replaceState(null,"",t)}function Oo(e,t){return e==="compare"||e==="quest"?e:t}function Dn(e){const t=new URLSearchParams;e.mode!==O.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==O.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=H(e.scenario).defaultReposition,o=n??O.repositionA,i=n??O.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of pe){const l=e.overrides[r];l!==void 0&&Number.isFinite(l)&&t.set($n[r],qo(l))}return`?${t.toString()}`}function Wo(e){const t=new URLSearchParams(e),n={};for(const o of pe){const i=t.get($n[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:Oo(t.get("m"),O.mode),questStage:(t.get("qs")??"").trim()||O.questStage,scenario:t.get("s")??O.scenario,strategyA:Yt(t.get("a")??t.get("d"),O.strategyA),strategyB:Yt(t.get("b"),O.strategyB),repositionA:Kt(t.get("pa"),O.repositionA),repositionB:Kt(t.get("pb"),O.repositionB),compare:t.has("c")?t.get("c")==="1":O.compare,seed:(t.get("k")??"").trim()||O.seed,intensity:Qt(t.get("i"),O.intensity),speed:Qt(t.get("x"),O.speed),overrides:n}}function Qt(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function qo(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function On(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const Ho=["scan","look","nearest","etd","destination","rsr"],Xe={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},Wn={scan:"Sweeps end-to-end like a disk head — simple, predictable, ignores who's waiting longest.",look:"Like SCAN but reverses early when nothing's queued further — a practical baseline.",nearest:"Grabs whichever call is closest right now. Fast under light load, thrashes under rush.",etd:"Estimated time of dispatch — assigns calls to whichever car can finish fastest.",destination:"Destination-control: riders pick their floor at the lobby; the group optimises assignments.",rsr:"Relative System Response — a wait-aware variant of ETD that penalises long queues."},No=["adaptive","predictive","lobby","spread","none"],It={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},qn={adaptive:"Switches based on traffic — returns to lobby during up-peak, predicts hot floors otherwise. The default.",predictive:"Always parks idle cars near whichever floor has seen the most recent arrivals.",lobby:"Sends every idle car back to the ground floor to prime the morning-rush pickup.",spread:"Keeps idle cars fanned out across the shaft so any floor has a nearby option.",none:"Leaves idle cars wherever they finished their last delivery."},Go="scenario-card inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated border border-stroke-subtle rounded-md text-content-secondary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:bg-surface-hover hover:border-stroke aria-pressed:bg-accent-muted aria-pressed:text-content aria-pressed:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] max-md:flex-none max-md:snap-start",Uo="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function jo(e){const t=document.createDocumentFragment();ke.forEach((n,o)=>{const i=de("button",Go);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(de("span","",n.label),de("span",Uo,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function Hn(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}async function Nn(e,t,n,o,i){const r=H(n),l=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,s=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:l,repositionA:s,overrides:{}},G(e.permalink),i.renderPaneStrategyInfo(t.paneA,l),i.renderPaneRepositionInfo(t.paneA,s),i.refreshStrategyPopovers(),Hn(t,r.id),await o(),i.renderTweakPanel(),q(t.toast,`${r.label} · ${Xe[l]}`)}function zo(e){const t=H(e.scenario);e.scenario=t.id}const Vo=["layout","scenario-picker","controls-bar","cabin-legend"],Xo=["quest-pane"];function Yo(e){const t=e==="quest";for(const n of Vo){const o=document.getElementById(n);o&&o.classList.toggle("hidden",t)}for(const n of Xo){const o=document.getElementById(n);o&&(o.classList.toggle("hidden",!t),o.classList.toggle("flex",t))}}function Ko(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const o of n){const i=o.dataset.mode===e;o.dataset.active=String(i),o.setAttribute("aria-pressed",String(i))}t.addEventListener("click",o=>{const i=o.target;if(!(i instanceof HTMLElement))return;const r=i.closest("button[data-mode]");if(!r)return;const l=r.dataset.mode;if(l!=="compare"&&l!=="quest"||l===e)return;const s=new URL(window.location.href);l==="compare"?(s.searchParams.delete("m"),s.searchParams.delete("qs")):s.searchParams.set("m",l),window.location.assign(s.toString())})}const Qo="modulepreload",Jo=function(e,t){return new URL(e,t).href},Jt={},Ge=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let l=function(f){return Promise.all(f.map(p=>Promise.resolve(p).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const s=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),c=a?.nonce||a?.getAttribute("nonce");i=l(n.map(f=>{if(f=Jo(f,o),f in Jt)return;Jt[f]=!0;const p=f.endsWith(".css"),d=p?'[rel="stylesheet"]':"";if(!!o)for(let m=s.length-1;m>=0;m--){const y=s[m];if(y.href===f&&(!p||y.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=p?"stylesheet":Qo,p||(h.as="script"),h.crossOrigin="",h.href=f,c&&h.setAttribute("nonce",c),document.head.appendChild(h),p)return new Promise((m,y)=>{h.addEventListener("load",m),h.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(l){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=l,window.dispatchEvent(s),!s.defaultPrevented)throw l}return i.then(l=>{for(const s of l||[])s.status==="rejected"&&r(s.reason);return t().catch(r)})};async function Zo(e){const t=(await Ge(async()=>{const{default:i}=await import("./worker-BfuR_oMc.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new ei(n);return await o.init(e),o}class ei{#e;#t=new Map;#n=1;#i=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#l),this.#e.addEventListener("error",this.#o),this.#e.addEventListener("messageerror",this.#o)}async init(t){await this.#a({kind:"init",id:this.#s(),payload:this.#d(t)})}async tick(t,n){const o=n?.wantVisuals??!1;return this.#a({kind:"tick",id:this.#s(),ticks:t,...o?{wantVisuals:!0}:{}})}async spawnRider(t,n,o,i){return this.#a({kind:"spawn-rider",id:this.#s(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#a({kind:"set-strategy",id:this.#s(),strategy:t})}async loadController(t,n){const o=n?.unlockedApi??null,i=n?.timeoutMs,r=this.#a({kind:"load-controller",id:this.#s(),source:t,unlockedApi:o});if(i===void 0){await r;return}r.catch(()=>{});let l;const s=new Promise((a,c)=>{l=setTimeout(()=>{c(new Error(`controller did not return within ${i}ms`))},i)});try{await Promise.race([r,s])}finally{l!==void 0&&clearTimeout(l)}}async reset(t){await this.#a({kind:"reset",id:this.#s(),payload:this.#d(t)})}dispose(){this.#i||(this.#i=!0,this.#e.removeEventListener("message",this.#l),this.#e.removeEventListener("error",this.#o),this.#e.removeEventListener("messageerror",this.#o),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#s(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#a(t){if(this.#i)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#t.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#o=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#i=!0,this.#e.terminate(),this.#r(new Error(o))};#l=t=>{const n=t.data,o=this.#t.get(n.id);if(o)switch(this.#t.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":o.reject(new Error(n.message));return;default:{const i=n.kind;o.reject(new Error(`WorkerSim: unknown reply kind "${String(i)}"`));return}}}}let ot=null,le=null;async function ti(){return ot||le||(le=(async()=>{await ni();const e=await Ge(()=>import("./editor.main-DXC48tlE.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return ot=e,e})(),le.catch(()=>{le=null}),le)}async function ni(){const[{default:e},{default:t}]=await Promise.all([Ge(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),Ge(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}function oi(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function ii(e){const t=await ti();oi(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o()});return{dispose:()=>{i.dispose()}}},insertAtCursor(o){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:o,forceMoveMarkers:!0}]),n.focus()},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const ri=`SimConfig(
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
)`,si={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:ri,unlockedApi:["pushDestination"],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
//
// Five riders at the lobby want to go up to Floor 2 or Floor 3.
// Use \`sim.pushDestination(carId, stopId)\` to send the car after them.
//
// Stop ids: 0 (Lobby), 1 (Floor 2), 2 (Floor 3).

// Send the car to Floor 3 first:
sim.pushDestination(0n, 2n);
`,hints:["`sim.pushDestination(carId, stopId)` queues a destination. Both ids are bigints — pass them with the `n` suffix.","There's only one car (id 0n). Queue it to visit each floor riders are waiting for.","Pass: deliver all five riders. 3★: do it before tick 400 — back-to-back destinations beat one-at-a-time."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<5&&n.push(`delivered ${e} of 5`),t>0&&n.push(`${t} abandoned`),`Run short — ${n.join(", ")}. Call \`sim.pushDestination(0n, stopId)\` for each floor riders are heading to so nobody times out.`},referenceSolution:`// Canonical stage-1 solution.
// Five riders at the lobby want F2 or F3 — queue both stops up front
// and let dispatch fan them out.

sim.pushDestination(0n, 1n);
sim.pushDestination(0n, 2n);
`},ai=`SimConfig(
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
)`,li={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:ai,unlockedApi:["pushDestination","hallCalls","drainEvents"],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`,hints:["`sim.hallCalls()` returns objects with at least `{ stop, direction }`. Iterate them and dispatch the car.","Calls accumulate over time. Riders keep arriving at the configured Poisson rate, so polling `sim.hallCalls()` once per evaluation is enough; you don't need to react instantly.","3★ requires beating the nearest-car baseline. Try queuing destinations in directional order so the car doesn't bounce."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<10&&n.push(`delivered ${e} of 10`),t>0&&n.push(`${t} abandoned`),`Run short — ${n.join(", ")}. Iterate \`sim.hallCalls()\` and queue a destination for each pending call.`},referenceSolution:`// Canonical stage-2 solution.
// Read the pending hall calls once and dispatch the car to each
// floor riders are waiting on.

for (const call of sim.hallCalls()) {
  sim.pushDestination(0n, BigInt(call.stop));
}
`},ci=`SimConfig(
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
)`,di={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:ci,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`,hints:["`sim.carCalls(carId)` returns an array of stop ids the riders inside that car have pressed.","Combine hall calls (riders waiting outside) and car calls (riders inside) into a single dispatch sweep — bouncing back and forth burns time.","3★ requires sub-30s max wait. Look at events with `sim.drainEvents()` to react the moment a call lands instead of polling stale state."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<15&&n.push(`delivered ${e} of 15`),t>0&&n.push(`${t} abandoned`),`Run short — ${n.join(", ")}. Combine \`hallCalls()\` and \`carCalls(carId)\` into one sweep so the car serves riders inside the cab too.`},referenceSolution:`// Canonical stage-3 solution.
// Hall calls and car calls together: queue every waiting floor and
// every cabin button into a single sweep.

for (const call of sim.hallCalls()) {
  sim.pushDestination(0n, BigInt(call.stop));
}
for (const stop of sim.carCalls(0n)) {
  sim.pushDestination(0n, BigInt(stop));
}
`},pi=`SimConfig(
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
)`,ui={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:pi,unlockedApi:["setStrategy"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
//
// elevator-core ships built-in dispatch strategies: scan, look,
// nearest, etd, destination, rsr. Try them out:
//
//   sim.setStrategy("look");
//
// returns true on success, false if the name isn't a built-in.
// The default for this stage is SCAN — see if you can beat it.

sim.setStrategy("look");
`,hints:["`scan` sweeps end-to-end; `look` stops at the last request and reverses; `nearest` picks the closest idle car; `etd` minimises estimated time-to-destination.","Look at `metrics.avg_wait_s` to judge: lower is better. Try each strategy in turn — the deltas are small but visible.","3★ requires sub-18s average wait. ETD typically wins on heavy traffic; LOOK is competitive at lower spawn rates."],failHint:({delivered:e})=>`Delivered ${e} of 25. Try a different built-in via \`sim.setStrategy("look" | "nearest" | "etd")\` — heavy traffic favours stronger heuristics.`,referenceSolution:`// Canonical stage-4 solution.
// LOOK sweeps to the last request and reverses — strong on
// steady moderate traffic and competitive with the nearest-car
// pick under this stage's spawn rate.

sim.setStrategy("look");
`},fi=`SimConfig(
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
)`,hi={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:fi,unlockedApi:["setStrategy"],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},gi=`SimConfig(
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
)`,mi=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,bi={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:gi,unlockedApi:["setStrategyJs"],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:mi,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},yi=`SimConfig(
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
)`,Si={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:yi,unlockedApi:["setStrategyJs"],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},wi=`SimConfig(
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
)`,vi=`// Stage 8 — Event-Driven
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
`,ki={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:wi,unlockedApi:["setStrategyJs","drainEvents"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:vi,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},_i=`SimConfig(
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
)`,Ci=`// Stage 9 — Take the Wheel
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
`,Ti={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:_i,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:Ci,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},Ei=`SimConfig(
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
)`,xi=`// Stage 10 — Patient Boarding
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
`,Ii={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:Ei,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:xi,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},Ri=`SimConfig(
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
)`,Ai=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,Mi={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:Ri,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:Ai,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},Pi=`SimConfig(
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
)`,Li=`// Stage 12 — Routes
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
`,Fi={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:Pi,unlockedApi:["setStrategy","shortestRoute","reroute"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:Li,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},Bi=`SimConfig(
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
)`,$i=`// Stage 13 — Transfer Points
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
`,Di={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:Bi,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:$i,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},Oi=`SimConfig(
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
)`,Wi=`// Stage 14 — Build a Floor
//
// The building starts five stops tall. Construction "finishes" a
// few minutes in and the player adds the sixth floor:
//
//   const lineRef = /* the line you want to add the stop to */;
//   const newStop = sim.addStop(lineRef, "F6", 20.0);
//   sim.addStopToLine(newStop, lineRef);  // (stopRef, lineRef)
//
// Standard dispatch otherwise.

sim.setStrategy("etd");
`,qi={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:Oi,unlockedApi:["setStrategy","addStop","addStopToLine"],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:Wi,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},Hi=`SimConfig(
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
)`,Ni=`// Stage 15 — Sky Lobby
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
`,Gi={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:Hi,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:Ni,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},ee=[si,li,di,ui,hi,bi,Si,ki,Ti,Ii,Mi,Fi,Di,qi,Gi];function Ui(e){return ee.find(t=>t.id===e)}function ji(e){const t=ee.findIndex(n=>n.id===e);if(!(t<0))return ee[t+1]}function P(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function Ye(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const Ue="quest:code:v1:",Gn="quest:bestStars:v1:",Un=5e4;function _e(){try{return globalThis.localStorage??null}catch{return null}}function Zt(e){const t=_e();if(!t)return null;try{const n=t.getItem(Ue+e);if(n===null)return null;if(n.length>Un){try{t.removeItem(Ue+e)}catch{}return null}return n}catch{return null}}function en(e,t){if(t.length>Un)return;const n=_e();if(n)try{n.setItem(Ue+e,t)}catch{}}function zi(e){const t=_e();if(t)try{t.removeItem(Ue+e)}catch{}}function Ce(e){const t=_e();if(!t)return 0;let n;try{n=t.getItem(Gn+e)}catch{return 0}if(n===null)return 0;const o=Number.parseInt(n,10);return!Number.isInteger(o)||o<0||o>3?0:o}function Vi(e,t){const n=Ce(e);if(t<=n)return;const o=_e();if(o)try{o.setItem(Gn+e,String(t))}catch{}}const Xi={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},Yi=["basics","strategies","events-manual","topology"],jn=3;function Ki(){return{root:P("quest-grid","quest-grid"),progress:P("quest-grid-progress","quest-grid"),sections:P("quest-grid-sections","quest-grid")}}function it(e,t){Ye(e.sections);let n=0;const o=ee.length*jn;for(const i of Yi){const r=ee.filter(c=>c.section===i);if(r.length===0)continue;const l=document.createElement("section");l.dataset.section=i;const s=document.createElement("h2");s.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",s.textContent=Xi[i],l.appendChild(s);const a=document.createElement("div");a.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const c of r){const f=Ce(c.id);n+=f,a.appendChild(Qi(c,f,t))}l.appendChild(a),e.sections.appendChild(l)}e.progress.textContent=`${n} / ${o}`}function Qi(e,t,n){const o=ee.findIndex(p=>p.id===e.id),i=String(o+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const l=document.createElement("div");l.className="flex items-baseline justify-between gap-2";const s=document.createElement("span");s.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",s.textContent=i,l.appendChild(s);const a=document.createElement("span");a.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",a.classList.add(t>0?"text-accent":"text-content-disabled"),a.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),a.textContent="★".repeat(t)+"☆".repeat(jn-t),l.appendChild(a),r.appendChild(l);const c=document.createElement("div");c.className="text-content text-[13px] font-semibold tracking-[-0.01em]",c.textContent=e.title,r.appendChild(c);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}async function Ji(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await Zo({configRon:e.configRon,strategy:"scan"});try{const l={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(l.timeoutMs=n.timeoutMs),await r.loadController(t,l);let s=null,a=0;const c=n.onSnapshot!==void 0;for(;a<o;){const f=o-a,p=Math.min(i,f),d=await r.tick(p,c?{wantVisuals:!0}:void 0);s=d.metrics,a=d.tick;const u=tn(s,a);if(n.onProgress)try{n.onProgress(u)}catch{}if(n.onSnapshot&&d.snapshot)try{n.onSnapshot(d.snapshot)}catch{}if(e.passFn(u))return nn(e,u,!0)}if(s===null)throw new Error("runStage: maxTicks must be positive");return nn(e,tn(s,a),!1)}finally{r.dispose()}}function tn(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function nn(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}function Zi(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const o=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(o)&&o>0&&n.push(`${o.toFixed(1)}s avg wait`),n.join(" · ")}const zn=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(zn.map(e=>[e.name,e]));function Vn(e){const t=new Set(e);return zn.filter(n=>t.has(n.name))}function er(){return{root:P("quest-api-panel","api-panel")}}function on(e,t){Ye(e.root);const n=Vn(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const o=document.createElement("p");o.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",o.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(o);const i=document.createElement("ul");i.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const l=document.createElement("li");l.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const s=document.createElement("code");s.className="block font-mono text-[12px] text-content",s.textContent=r.signature,l.appendChild(s);const a=document.createElement("p");a.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",a.textContent=r.description,l.appendChild(a),i.appendChild(l)}e.root.appendChild(i)}function tr(){return{root:P("quest-hints","hints-drawer"),count:P("quest-hints-count","hints-drawer"),list:P("quest-hints-list","hints-drawer")}}const rn="quest-hints-more";function sn(e,t){Ye(e.list);for(const o of e.root.querySelectorAll(`.${rn}`))o.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((o,i)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=o,i>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const o=document.createElement("button");o.type="button",o.className=`${rn} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,o.textContent=`Show ${n-1} more`,o.addEventListener("click",()=>{for(const i of e.list.querySelectorAll("li[hidden]"))i.hidden=!1;o.remove()}),e.root.appendChild(o)}e.root.removeAttribute("open")}function nr(){return{root:P("quest-reference","reference-panel"),status:P("quest-reference-status","reference-panel"),code:P("quest-reference-code","reference-panel")}}function rt(e,t,n={}){const o=t.referenceSolution,i=Ce(t.id);if(!o||i===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=i===3?"(mastered)":"(unlocked)",e.code.textContent=o,n.collapse!==!1&&e.root.removeAttribute("open")}function or(){const e="results-modal";return{root:P("quest-results-modal",e),title:P("quest-results-title",e),stars:P("quest-results-stars",e),detail:P("quest-results-detail",e),close:P("quest-results-close",e),retry:P("quest-results-retry",e),next:P("quest-results-next",e)}}function ir(e,t,n,o,i){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=rr(t.grade,t.passed,o),e.retry.onclick=()=>{st(e),n()},e.close.onclick=()=>{st(e)};const r=i;r?(e.next.hidden=!1,e.next.onclick=()=>{st(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function st(e){e.root.classList.remove("show")}function rr(e,t,n){const o=`tick ${e.endTick}`,i=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${i} · finished by ${o}.`;if(n)try{const r=n(e);if(r)return`${i}. ${r}`}catch{}return`${i}. The pass condition wasn't met within the run budget.`}const sr={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function an(e){return sr[e]??`sim.${e}();`}function ar(){return{root:P("quest-snippets","snippet-picker")}}function ln(e,t,n){Ye(e.root);const o=Vn(t.unlockedApi);if(o.length!==0)for(const i of o){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=i.name,r.title=`Insert: ${an(i.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(an(i.name))}),e.root.appendChild(r)}}function je(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,l=o&255,s=a=>t>=0?Math.round(a+(255-a)*t):Math.round(a*(1+t));return`rgb(${s(i)}, ${s(r)}, ${s(l)})`}function Rt(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,l=o&255;return`rgba(${i}, ${r}, ${l}, ${t})`}function Xn(e,t){if(/^#[0-9a-f]{6}$/i.test(e)){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Rt(e,t)}function lr(e,t,n,o,i){const r=(e+n)/2,l=(t+o)/2,s=n-e,a=o-t,c=Math.max(Math.hypot(s,a),1),f=-a/c,p=s/c,d=Math.min(c*.25,22),u=r+f*d,h=l+p*d,m=1-i;return[m*m*e+2*m*i*u+i*i*n,m*m*t+2*m*i*h+i*i*o]}function cr(e){let r=e;for(let s=0;s<3;s++){const a=1-r,c=3*a*a*r*.2+3*a*r*r*.2+r*r*r,f=3*a*a*.2+6*a*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(c-e)/f,r=Math.max(0,Math.min(1,r))}const l=1-r;return 3*l*l*r*.6+3*l*r*r*1+r*r*r}const At={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},dr="#2a2a35",pr="#a1a1aa",ur=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],fr=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],hr="rgba(8, 10, 14, 0.55)",gr="#3a3a45",mr=[1,1,.5,.42],br=["LOW","HIGH","VIP","SERVICE"],yr="#e6c56b",Sr="#9bd4c4",wr=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],vr="#a1a1aa",kr="#4a4a55",_r="#f59e0b",Yn="#7dd3fc",Kn="#fda4af",at="#fafafa",Qn="#8b8c92",Jn="rgba(250, 250, 250, 0.95)",Cr=260,cn=3,Tr=.05,dn=["standard","briefcase","bag","short","tall"];function ce(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,dn[n%dn.length]??"standard"}function Er(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function Zn(e,t,n,o,i,r="standard"){const l=Er(r,o),a=n-.5,c=a-l.bodyH,f=c-l.neckGap-l.headR,p=l.bodyH*.08,d=a-l.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-l.shoulderW/2,c+p),e.lineTo(t-l.shoulderW/2+p,c),e.lineTo(t+l.shoulderW/2-p,c),e.lineTo(t+l.shoulderW/2,c+p),e.lineTo(t+l.waistW/2,d),e.lineTo(t+l.footW/2,a),e.lineTo(t-l.footW/2,a),e.lineTo(t-l.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,l.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const u=Math.max(1.6,l.headR*.9),h=t+l.waistW/2+u*.1,m=a-u-.5;e.fillRect(h,m,u,u);const y=u*.55;e.fillRect(h+(u-y)/2,m-1,y,1)}else if(r==="bag"){const u=Math.max(1.3,l.headR*.9),h=t-l.shoulderW/2-u*.35,m=c+l.bodyH*.35;e.beginPath(),e.arc(h,m,u,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(h+u*.2,m-u*.8),e.lineTo(t+l.shoulderW/2-p,c+.5),e.stroke()}else if(r==="tall"){const u=l.headR*2.1,h=Math.max(1,l.headR*.45);e.fillRect(t-u/2,f-l.headR-h+.4,u,h)}}function xr(e,t,n,o,i,r,l,s,a){const f=Math.max(1,Math.floor((i-14)/s.figureStride)),p=Math.min(r,f),d=-2;for(let u=0;u<p;u++){const h=t+d+o*u*s.figureStride,m=u+0,y=ce(a,m);Zn(e,h,n,s.figureHeadR,l,y)}if(r>p){e.fillStyle=Qn,e.font=`${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const u=t+d+o*p*s.figureStride;e.fillText(`+${r-p}`,u,n-1)}}function X(e,t,n,o,i,r){const l=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,l);return}e.moveTo(t+l,n),e.lineTo(t+o-l,n),e.quadraticCurveTo(t+o,n,t+o,n+l),e.lineTo(t+o,n+i-l),e.quadraticCurveTo(t+o,n+i,t+o-l,n+i),e.lineTo(t+l,n+i),e.quadraticCurveTo(t,n+i,t,n+i-l),e.lineTo(t,n+l),e.quadraticCurveTo(t,n,t+l,n),e.closePath()}function Ir(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const l=i+r+1>>1;e.measureText(t.slice(0,l)+o).width<=n?i=l:r=l-1}return i===0?o:t.slice(0,i)+o}function Rr(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function Ar(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,l=Math.max(n.fontSmall+.5,i);for(const s of t){const a=s.top-3,c=a>i&&a-n.fontSmall<r;e.fillStyle=s.color,e.fillText(s.text,s.cx,c?l:a)}}function Mr(e,t,n,o,i,r,l,s,a){e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";const c=o.padX,f=o.padX+o.labelW,p=r-o.padX,d=o.shaftInnerW/2,u=Math.min(o.shaftInnerW*1.8,(p-f)/2),h=[...t.stops].sort((m,y)=>m.y-y.y);for(let m=0;m<h.length;m++){const y=h[m];if(y===void 0)continue;const w=n(y.y),T=h[m+1],x=T!==void 0?n(T.y):s;if(e.strokeStyle=dr,e.lineWidth=a?2:1,e.beginPath(),a)for(const g of i)e.moveTo(g-u,w+.5),e.lineTo(g+u,w+.5);else{let g=f;for(const v of i){const S=v-d,E=v+d;S>g&&(e.moveTo(g,w+.5),e.lineTo(S,w+.5)),g=E}g<p&&(e.moveTo(g,w+.5),e.lineTo(p,w+.5))}e.stroke();for(let g=0;g<i.length;g++){const v=i[g];if(v===void 0)continue;const S=l.has(`${g}:${y.entity_id}`);e.strokeStyle=S?_r:kr,e.lineWidth=S?1.4:1,e.beginPath(),e.moveTo(v-d-2,w+.5),e.lineTo(v-d,w+.5),e.moveTo(v+d,w+.5),e.lineTo(v+d+2,w+.5),e.stroke()}const b=a?w:(w+x)/2;e.fillStyle=pr,e.textAlign="right",e.fillText(Ir(e,y.name,o.labelW-4),c+o.labelW-4,b)}}function Pr(e,t,n,o,i,r){for(const l of t.stops){if(l.waiting_by_line.length===0)continue;const s=r.get(l.entity_id);if(s===void 0||s.size===0)continue;const a=n(l.y),c=l.waiting_up>=l.waiting_down?Yn:Kn;for(const f of l.waiting_by_line){if(f.count===0)continue;const p=s.get(f.line);if(p===void 0)continue;const d=i.get(p);if(d===void 0)continue;const u=d.end-d.start;u<=o.figureStride||xr(e,d.end-2,a,-1,u,f.count,c,o,l.entity_id)}}}function Lr(e,t,n,o,i,r,l,s,a,c=!1){const f=o*.22,p=(i-4)/10.5,d=Math.max(1.2,Math.min(s.figureHeadR,f,p)),u=s.figureStride*(d/s.figureHeadR),h=3,m=2,y=o-h*2,T=Math.max(1,Math.floor((y-16)/u)),x=Math.min(r,T),b=x*u,g=t-b/2+u/2,v=n-m;for(let S=0;S<x;S++){const E=a?.[S]??ce(0,S);Zn(e,g+S*u,v,d,l,E)}if(r>x){const S=`+${r-x}`,E=Math.max(8,s.fontSmall-1);e.font=`700 ${E.toFixed(1)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="middle";const k=e.measureText(S).width,I=3,C=1.5,A=Math.ceil(k+I*2),R=Math.ceil(E+C*2),M=t+o/2-2,F=n-i+2,B=M-A;e.fillStyle="rgba(15, 15, 18, 0.85)",X(e,B,F,A,R,2),e.fill(),e.fillStyle="#fafafa",e.fillText(S,M-I,F+R/2)}if(c){const S=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${S.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="center",e.textBaseline="middle";const E=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,E+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,E)}}function Fr(e,t,n,o,i,r,l){const s=Math.max(2,r.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const c=l.get(a.target);if(c===void 0)continue;const f=t.stops[c];if(f===void 0)continue;const p=n.get(a.id);if(p===void 0)continue;const d=i(f.y)-r.carH/2,u=i(a.y)-r.carH/2;Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(p,u),e.lineTo(p,d),e.stroke(),e.fillStyle=Jn,e.beginPath(),e.arc(p,d,s,0,Math.PI*2),e.fill())}}function Br(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const l=At[t.phase]??"#6b6b75",s=o/2;for(let a=1;a<=cn;a++){const c=r(t.y-t.v*Tr*a),f=.18*(1-(a-1)/cn);e.fillStyle=Rt(l,f),e.fillRect(n-s,c-i,o,i)}}function $r(e,t,n,o,i,r,l,s,a){const c=l(t.y),f=c-i,p=o/2,d=At[t.phase]??"#6b6b75",u=e.createLinearGradient(n,f,n,c);u.addColorStop(0,je(d,.14)),u.addColorStop(1,je(d,-.18)),e.fillStyle=u,e.fillRect(n-p,f,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-p+.5,f+.5,o-1,i-1);const h=t.capacity>0&&t.load>=t.capacity*.95;(t.riders>0||h)&&Lr(e,n,c,o,i,t.riders,r,s,a,h)}function Dr(e,t,n,o,i,r,l,s){const h=`600 ${r.fontSmall+.5}px system-ui, -apple-system, "Segoe UI", sans-serif`;e.font=h,e.textBaseline="middle";const m=.3,y=performance.now(),w=t,T=[];for(const b of n.cars){const g=l.get(b.id);if(!g)continue;const v=o.get(b.id);if(v===void 0)continue;const S=i(b.y),E=S-r.carH,k=Math.max(1,g.expiresAt-g.bornAt),I=g.expiresAt-y,C=I>k*m?1:Math.max(0,I/(k*m));if(C<=0)continue;const R=e.measureText(g.text).width+14,M=r.fontSmall+8+2,F=E-2-4-M,B=S+2+4+M>s,z=F<2&&!B?"below":"above",Te=z==="above"?E-2-4-M:S+2+4;let W=v-R/2;const Ee=2,xe=s-R-2;W<Ee&&(W=Ee),W>xe&&(W=xe),T.push({bubble:g,alpha:C,cx:v,carTop:E,carBottom:S,bubbleW:R,bubbleH:M,side:z,bx:W,by:Te})}const x=(b,g)=>!(b.bx+b.bubbleW<=g.bx||g.bx+g.bubbleW<=b.bx||b.by+b.bubbleH<=g.by||g.by+g.bubbleH<=b.by);for(let b=1;b<T.length;b++){const g=T[b];if(g===void 0)continue;let v=!1;for(let C=0;C<b;C++){const A=T[C];if(A!==void 0&&x(g,A)){v=!0;break}}if(!v)continue;const S=g.side==="above"?"below":"above",E=S==="above"?g.carTop-2-4-g.bubbleH:g.carBottom+2+4,k={...g,side:S,by:E};let I=!0;for(let C=0;C<b;C++){const A=T[C];if(A!==void 0&&x(k,A)){I=!1;break}}I&&(T[b]=k)}for(const b of T){const{bubble:g,alpha:v,cx:S,carTop:E,carBottom:k,bubbleW:I,bubbleH:C,side:A,bx:R,by:M}=b,F=A==="above"?E-2:k+2,B=A==="above"?M+C:M,z=Math.min(Math.max(S,R+6+5/2),R+I-6-5/2);e.save(),e.globalAlpha=v,e.shadowColor=w,e.shadowBlur=8,e.fillStyle="rgba(16, 19, 26, 0.94)",X(e,R,M,I,C,6),e.fill(),e.shadowBlur=0,e.strokeStyle=Xn(w,.65),e.lineWidth=1,X(e,R,M,I,C,6),e.stroke(),e.beginPath(),e.moveTo(z-5/2,B),e.lineTo(z+5/2,B),e.lineTo(z,F),e.closePath(),e.fillStyle="rgba(16, 19, 26, 0.94)",e.fill(),e.stroke(),e.fillStyle="#f0f3fb",e.textAlign="center",e.fillText(g.text,R+I/2,M+C/2),e.restore()}}function Or(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function Wr(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:Ke(o)})}return t}function Ke(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function eo(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function qr(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function Hr(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function Nr(e,t,n,o,i,r){const l=Math.abs(t-e);if(l<.001)return 0;const s=Math.abs(n);if(s*s/(2*r)>=l)return s>0?s/r:0;const c=Math.max(0,(o-s)/i),f=s*c+.5*i*c*c,p=o/r,d=o*o/(2*r);if(f+d>=l){const h=(2*i*r*l+r*s*s)/(i+r),m=Math.sqrt(Math.max(h,s*s));return(m-s)/i+m/r}const u=l-f-d;return c+u/Math.max(o,.001)+p}const to={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},ze={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function Gr(e,t,n,o,i,r){const l=i/2,s=o-r/2,a=At[t.phase]??"#6b6b75",c=e.createLinearGradient(n,s,n,s+r);c.addColorStop(0,je(a,.14)),c.addColorStop(1,je(a,-.18)),e.fillStyle=c,X(e,n-l,s,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-l+2,s+r*.36,i-4,Math.max(1.5,r*.1))}function Ur(e,t,n,o,i){if(t.length===0)return;const r=7,l=4,s=i.fontSmall+2,a=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;const c=(d,u)=>{const h=[d.carName,Ke(d.altitudeM),eo(d.velocity),`${to[d.phase]} · ${d.layer}`];let m=0;for(const b of h)m=Math.max(m,e.measureText(b).width);const y=m+r*2,w=h.length*s+l*2;let T=u==="right"?d.cx+a:d.cx-a-y;T=Math.max(2,Math.min(o-y-2,T));const x=d.cy-w/2;return{hud:d,lines:h,bx:T,by:x,bubbleW:y,bubbleH:w,side:u}},f=(d,u)=>!(d.bx+d.bubbleW<=u.bx||u.bx+u.bubbleW<=d.bx||d.by+d.bubbleH<=u.by||u.by+u.bubbleH<=d.by),p=[];t.forEach((d,u)=>{let h=c(d,u%2===0?"right":"left");if(p.some(m=>f(h,m))){const m=c(d,h.side==="right"?"left":"right");if(p.every(y=>!f(m,y)))h=m;else{const y=Math.max(...p.map(w=>w.by+w.bubbleH));h={...h,by:y+4}}}p.push(h)});for(const d of p){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",X(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=ze[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,X(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let u=0;u<d.lines.length;u++){const h=d.by+l+s*u+s/2,m=d.lines[u]??"";e.fillStyle=u===0||u===3?ze[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(m,d.bx+r,h)}e.restore()}}function jr(e,t,n,o,i,r){if(t.length===0)return;const l=18,s=10,a=6,c=5,f=r.fontSmall+2.5,d=a*2+5*f,u=l+a+(d+c)*t.length;e.save();const h=e.createLinearGradient(n,i,n,i+u);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,X(e,n,i,o,u,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,X(e,n,i,o,u,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+s,i+l/2+2);let m=i+l+a;for(const y of t){e.fillStyle="rgba(15, 15, 18, 0.55)",X(e,n+6,m,o-12,d,5),e.fill(),e.fillStyle=ze[y.phase],e.fillRect(n+6,m,2,d);const w=n+s+4,T=n+o-s;let x=m+a+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(y.carName,w,x),e.textAlign="right",e.fillStyle=ze[y.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(to[y.phase].toUpperCase(),T,x);const b=y.etaSeconds!==void 0&&Number.isFinite(y.etaSeconds)?Hr(y.etaSeconds):"—",g=[["Altitude",Ke(y.altitudeM)],["Velocity",eo(y.velocity)],["Dest",y.destinationName??"—"],["ETA",b]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;for(const[v,S]of g)x+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(v,w,x),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(S,T,x);m+=d+c}e.restore()}function zr(e,t,n,o,i,r,l){return[...e.cars].sort((a,c)=>a.id-c.id).map((a,c)=>{const f=a.y,p=a.target!==void 0?e.stops.find(u=>u.entity_id===a.target):void 0,d=p?Nr(f,p.y,a.v,i,r,l):void 0;return{cx:n,cy:t.toScreenAlt(f),altitudeM:f,velocity:a.v,phase:qr(a.v,o.get(a.id)??0,i),layer:Or(f),carName:`Climber ${String.fromCharCode(65+c)}`,destinationName:p?.name,etaSeconds:d}})}const fe=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function lt(e,t,n){return e+(t-e)*n}function ct(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round(lt(o>>16&255,i>>16&255,n)),l=Math.round(lt(o>>8&255,i>>8&255,n)),s=Math.round(lt(o&255,i&255,n));return`#${(r<<16|l<<8|s).toString(16).padStart(6,"0")}`}function Vr(e,t){let n=0;for(;n<fe.length-1;n++){const c=fe[n+1];if(c===void 0||e<=c[0])break}const o=fe[n],i=fe[Math.min(n+1,fe.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],l=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),s=ct(o[1],i[1],l),a=ct(o[2],i[2],l);return ct(s,a,t)}const Xr=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function Yr(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),l=Math.log10(1+t.axisMaxM/1e3),s=[0,.05,.15,.35,.6,1];for(const c of s){const f=1e3*(10**(c*l)-1);r.addColorStop(c,Vr(f,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const c of Xr){const f=t.axisMaxM*c.altFrac;if(f<8e4)continue;const p=t.toScreenAlt(f),d=n+c.xFrac*(o-n),u=c.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${u.toFixed(3)})`,e.beginPath(),e.arc(d,p,c.size,0,Math.PI*2),e.fill()}e.restore();const a=Wr(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const c of a){const f=t.toScreenAlt(c.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(o,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(c.label,n+4,f-6))}}function Kr(e,t,n,o){const r=o-28,l=e.createLinearGradient(0,r,0,o);l.addColorStop(0,"rgba(0,0,0,0)"),l.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),l.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=l,e.fillRect(t,r,n-t,28),e.strokeStyle=Xn("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function Qr(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function Jr(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const l=-Math.PI/2+r*Math.PI/3,s=t+Math.cos(l)*i,a=n+Math.sin(l)*i;r===0?e.moveTo(s,a):e.lineTo(s,a)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function Zr(e,t,n,o,i,r,l){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const s of t.stops){const a=n.toScreenAlt(s.y);if(a<n.shaftTop||a>n.shaftBottom)continue;const c=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-c/2,a),e.lineTo(o-5,a),e.moveTo(o+5,a),e.lineTo(o+c/2,a),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-c/2,a),e.lineTo(o-5,a-5),e.moveTo(o+c/2,a),e.lineTo(o+5,a-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(s.name,r+l-4,a-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(Ke(s.y),r+l-4,a+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function es(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const l=Math.log10(1+Math.max(0,r)/1e3),s=i<=0?0:Math.max(0,Math.min(1,l/i));return t-s*(t-e)}}}function ts(e,t,n,o,i,r,l){const s=Math.max(2,l.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const c=r.get(a.target);if(c===void 0)continue;const f=t.stops[c];if(f===void 0)continue;const p=i.get(a.id);if(p===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,p),e.lineTo(o,d),e.stroke(),e.fillStyle=Jn,e.beginPath(),e.arc(o,d,s,0,Math.PI*2),e.fill())}}function ns(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function os(e,t,n,o,i,r,l){l.firstDrawAt===0&&(l.firstDrawAt=performance.now());const s=(performance.now()-l.firstDrawAt)/1e3,a=r.showDayNight?ns(s):.5,c=n>=520&&o>=360,f=Math.min(120,Math.max(72,n*.16)),p=c?Math.min(220,Math.max(160,n*.24)):0,d=c?14:0,u=i.padX,h=u+f+4,m=n-i.padX-p-d,y=(h+m)/2,w=12,T=i.padTop+24,x=o-i.padBottom-18,b=es(T,x,r);Yr(e,b,h+w,m-w,a),Kr(e,h+w,m-w,x),Qr(e,y,b),Jr(e,y,b.shaftTop,i),Zr(e,t,b,y,i,u,f);const g=Math.max(20,Math.min(34,m-h-8)),v=Math.max(16,Math.min(26,g*.72));i.carH=v,i.carW=g;const S=new Map,E=new Map;t.stops.forEach((C,A)=>E.set(C.entity_id,A));for(const C of t.cars)S.set(C.id,b.toScreenAlt(C.y));ts(e,t,b,y,S,E,i);for(const C of t.cars){const A=S.get(C.id);A!==void 0&&Gr(e,C,y,A,g,v)}const I=[...zr(t,b,y,l.prevVelocity,l.maxSpeed,l.acceleration,l.deceleration)].sort((C,A)=>A.altitudeM-C.altitudeM);Ur(e,I,g,n-p-d,i),c&&jr(e,I,n-i.padX-p,p,T,i);for(const C of t.cars)l.prevVelocity.set(C.id,C.v);if(l.prevVelocity.size>t.cars.length){const C=new Set(t.cars.map(A=>A.id));for(const A of l.prevVelocity.keys())C.has(A)||l.prevVelocity.delete(A)}}function is(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function pn(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}class no{#e;#t;#n=window.devicePixelRatio||1;#i;#r=null;#s=-1;#d=new Map;#a;#o=new Map;#l=new Map;#c=[];#p=null;#g=new Map;#m=1;#b=1;#y=1;#f=0;#u=new Map;constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#t=o,this.#a=n,this.#h(),this.#i=()=>{this.#h()},window.addEventListener("resize",this.#i)}dispose(){window.removeEventListener("resize",this.#i)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#g.clear(),this.#f=0,this.#u.clear()}setTetherPhysics(t,n,o){Number.isFinite(t)&&t>0&&(this.#m=t),Number.isFinite(n)&&n>0&&(this.#b=n),Number.isFinite(o)&&o>0&&(this.#y=o)}pushAssignment(t,n,o){let i=this.#u.get(t);i===void 0&&(i=new Map,this.#u.set(t,i)),i.set(o,n)}#h(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#n,i=n*this.#n;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}draw(t,n,o){this.#h();const{clientWidth:i,clientHeight:r}=this.#e,l=this.#t;if(l.clearRect(0,0,i,r),t.stops.length===0||i===0||r===0)return;i!==this.#s&&(this.#r=is(i),this.#s=i);const s=this.#r;if(s===null)return;if(this.#p!==null){this.#S(t,i,r,s,n,o,this.#p);return}const a=t.stops.length===2,c=t.stops[0];if(c===void 0)return;let f=c.y,p=c.y;for(let _=1;_<t.stops.length;_++){const L=t.stops[_];if(L===void 0)continue;const $=L.y;$<f&&(f=$),$>p&&(p=$)}const d=t.stops.map(_=>_.y).sort((_,L)=>_-L),u=d.length>=3?(d.at(-1)??0)-(d.at(-2)??0):1,m=f-1,y=p+u,w=Math.max(y-m,1e-4),T=a?18:0;let x,b;if(a)x=s.padTop+T,b=r-s.padBottom-T;else{const _=[];for(let ie=1;ie<d.length;ie++){const Ie=d[ie],Re=d[ie-1];if(Ie===void 0||Re===void 0)continue;const Q=Ie-Re;Q>0&&_.push(Q)}const D=48/(_.length>0?Math.min(..._):1),V=Math.max(0,r-s.padTop-s.padBottom)/w,Y=Math.min(V,D),oe=w*Y;b=r-s.padBottom,x=b-oe}const g=_=>b-(_-m)/w*(b-x),v=this.#d;v.forEach(_=>_.length=0);for(const _ of t.cars){const L=v.get(_.line);L?L.push(_):v.set(_.line,[_])}const S=[...v.keys()].sort((_,L)=>_-L),E=S.reduce((_,L)=>_+(v.get(L)?.length??0),0),k=Math.max(0,i-2*s.padX-s.labelW),I=s.figureStride*2,C=s.shaftSpacing*Math.max(E-1,0),R=(k-C)/Math.max(E,1),M=a?34:s.maxShaftInnerW,B=Math.max(s.minShaftInnerW,Math.min(M,R*.55)),z=Math.max(0,Math.min(R-B,I+s.figureStride*4)),Te=Math.max(14,B-6);let W=1/0;if(t.stops.length>=2)for(let _=1;_<d.length;_++){const L=d[_-1],$=d[_];if(L===void 0||$===void 0)continue;const D=g(L)-g($);D>0&&D<W&&(W=D)}const Ee=g(p)-2,xe=Number.isFinite(W)?W:s.carH,mo=a?s.carH:xe,bo=Math.max(14,Math.min(mo,Ee));if(!a&&Number.isFinite(W)){const _=Math.max(1.5,Math.min(W*.067,4)),L=s.figureStride*(_/s.figureHeadR);s.figureHeadR=_,s.figureStride=L}s.shaftInnerW=B,s.carW=Te,s.carH=bo;const yo=s.padX+s.labelW,So=B+z,Ze=[],ue=new Map,et=new Map;let Lt=0;for(const _ of S){const L=v.get(_)??[];for(const $ of L){const D=yo+Lt*(So+s.shaftSpacing),N=D,V=D+z,Y=V+B/2;Ze.push(Y),ue.set($.id,Y),et.set($.id,{start:N,end:V}),Lt++}}const Ft=new Map;t.stops.forEach((_,L)=>Ft.set(_.entity_id,L));const Bt=new Set;{let _=0;for(const L of S){const $=v.get(L)??[];for(const D of $){if(D.phase==="loading"||D.phase==="door-opening"||D.phase==="door-closing"){const N=pn(t.stops,D.y);N!==void 0&&N.dist<.5&&Bt.add(`${_}:${N.stop.entity_id}`)}_++}}}const $t=new Map,Dt=new Map,Ot=new Map,Wt=new Map,qt=[],Ht=[];let Nt=0;for(let _=0;_<S.length;_++){const L=S[_];if(L===void 0)continue;const $=v.get(L)??[],D=ur[_]??hr,N=fr[_]??gr,V=mr[_]??1,Y=wr[_]??vr,oe=Math.max(14,B*V),ie=Math.max(10,Te*V),Ie=Math.max(10,s.carH),Re=_===2?yr:_===3?Sr:at;let Q=1/0,tt=-1/0,Ae=1/0;for(const K of $){$t.set(K.id,oe),Dt.set(K.id,ie),Ot.set(K.id,Ie),Wt.set(K.id,Re);const re=Ze[Nt];if(re===void 0)continue;const Gt=Number.isFinite(K.min_served_y)&&Number.isFinite(K.max_served_y),nt=Gt?Math.max(x,g(K.max_served_y)-s.carH-2):x,wo=Gt?Math.min(b,g(K.min_served_y)+2):b;qt.push({cx:re,top:nt,bottom:wo,fill:D,frame:N,width:oe}),re<Q&&(Q=re),re>tt&&(tt=re),nt<Ae&&(Ae=nt),Nt++}S.length>1&&Number.isFinite(Q)&&Number.isFinite(Ae)&&Ht.push({cx:(Q+tt)/2,top:Ae,text:br[_]??`Line ${_+1}`,color:Y})}Rr(l,qt),Ar(l,Ht,s),Mr(l,t,g,s,Ze,i,Bt,x,a),Pr(l,t,g,s,et,this.#u),Fr(l,t,ue,$t,g,s,Ft);for(const[_,L]of ue){const $=t.cars.find(oe=>oe.id===_);if(!$)continue;const D=Dt.get(_)??s.carW,N=Ot.get(_)??s.carH,V=Wt.get(_)??at,Y=this.#o.get(_);Br(l,$,L,D,N,g),$r(l,$,L,D,N,V,g,s,Y?.roster)}this.#w(t,ue,et,g,s,n),this.#v(s),o&&o.size>0&&Dr(l,this.#a,t,ue,g,s,o,i)}#S(t,n,o,i,r,l,s){const a={prevVelocity:this.#g,maxSpeed:this.#m,acceleration:this.#b,deceleration:this.#y,firstDrawAt:this.#f};os(this.#t,t,n,o,i,s,a),this.#f=a.firstDrawAt}#w(t,n,o,i,r,l){const s=performance.now(),a=Math.max(1,l),c=Cr/a,f=30/a,p=new Map,d=[];for(const u of t.cars){const h=this.#o.get(u.id),m=u.riders,y=n.get(u.id),w=pn(t.stops,u.y),T=u.phase==="loading"&&w!==void 0&&w.dist<.5?w.stop:void 0;if(h&&y!==void 0&&T!==void 0){const g=m-h.riders;if(g>0&&p.set(T.entity_id,(p.get(T.entity_id)??0)+g),g!==0){const v=i(T.y),S=i(u.y)-r.carH/2,E=Math.min(Math.abs(g),6);if(g>0){const k=T.waiting_up>=T.waiting_down,I=o.get(u.id);let C=y-20;if(I!==void 0){const M=I.start,F=I.end;C=(M+F)/2}const A=k?Yn:Kn,R=this.#u.get(T.entity_id);R!==void 0&&(R.delete(u.line),R.size===0&&this.#u.delete(T.entity_id));for(let M=0;M<E;M++)d.push(()=>this.#c.push({kind:"board",bornAt:s+M*f,duration:c,startX:C,startY:v,endX:y,endY:S,color:A}))}else for(let k=0;k<E;k++)d.push(()=>this.#c.push({kind:"alight",bornAt:s+k*f,duration:c,startX:y,startY:S,endX:y+18,endY:S+10,color:at}))}}const x=h?.roster??[];let b;if(h){const g=m-h.riders;if(b=x.slice(),g>0&&T!==void 0){const S=T.waiting_up>=T.waiting_down?0:1e4;for(let E=0;E<g;E++)b.push(ce(T.entity_id,E+S))}else if(g>0)for(let v=0;v<g;v++)b.push(ce(u.id,b.length+v));else g<0&&b.splice(b.length+g,-g)}else{b=[];for(let g=0;g<m;g++)b.push(ce(u.id,g))}for(;b.length>m;)b.pop();for(;b.length<m;)b.push(ce(u.id,b.length));this.#o.set(u.id,{riders:m,roster:b})}for(const u of t.stops){const h=u.waiting_up+u.waiting_down,m=this.#l.get(u.entity_id);if(m){const y=m.waiting-h,w=p.get(u.entity_id)??0,T=Math.max(0,y-w);if(T>0){const x=i(u.y),b=r.padX+r.labelW+20,g=Math.min(T,4);for(let v=0;v<g;v++)this.#c.push({kind:"abandon",bornAt:s+v*f,duration:c*1.5,startX:b,startY:x,endX:b-26,endY:x-6,color:Qn})}}this.#l.set(u.entity_id,{waiting:h})}for(const u of d)u();for(let u=this.#c.length-1;u>=0;u--){const h=this.#c[u];h!==void 0&&s-h.bornAt>h.duration&&this.#c.splice(u,1)}if(this.#o.size>t.cars.length){const u=new Set(t.cars.map(h=>h.id));for(const h of this.#o.keys())u.has(h)||this.#o.delete(h)}if(this.#l.size>t.stops.length){const u=new Set(t.stops.map(h=>h.entity_id));for(const h of this.#l.keys())u.has(h)||this.#l.delete(h)}}#v(t){const n=performance.now(),o=this.#t;for(const i of this.#c){const r=n-i.bornAt;if(r<0)continue;const l=Math.min(1,Math.max(0,r/i.duration)),s=cr(l),[a,c]=i.kind==="board"?lr(i.startX,i.startY,i.endX,i.endY,s):[i.startX+(i.endX-i.startX)*s,i.startY+(i.endY-i.startY)*s],f=i.kind==="board"?.9:i.kind==="abandon"?(1-s)**1.5:1-s,p=i.kind==="abandon"?t.carDotR*.85:t.carDotR;o.fillStyle=Rt(i.color,f),o.beginPath(),o.arc(a,c,p,0,Math.PI*2),o.fill()}}}const rs="#f59e0b",ss=3;function as(){const e="quest-pane";return{root:P("quest-pane",e),gridView:P("quest-grid",e),stageView:P("quest-stage-view",e),backBtn:P("quest-back-to-grid",e),title:P("quest-stage-title",e),brief:P("quest-stage-brief",e),stageStars:P("quest-stage-stars",e),editorHost:P("quest-editor",e),runBtn:P("quest-run",e),resetBtn:P("quest-reset",e),result:P("quest-result",e),progress:P("quest-progress",e),shaft:P("quest-shaft",e),shaftIdle:P("quest-shaft-idle",e)}}function dt(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=Ce(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(ss-n)}function pt(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function ls(e){const t=as(),n=k=>{const I=Ui(k);if(I)return I;const C=ee[0];if(!C)throw new Error("quest-pane: stage registry is empty");return C};let o=n(e.initialStageId),i="grid";dt(t,o);const r=er();on(r,o);const l=tr();sn(l,o);const s=nr();rt(s,o);const a=Ki(),c=new no(t.shaft,rs),f={active:!1};t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const p=await ii({container:t.editorHost,initialValue:Zt(o.id)??o.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const d=or(),u=300;let h=null,m=!1;const y=()=>{m||(h!==null&&clearTimeout(h),h=setTimeout(()=>{en(o.id,p.getValue()),h=null},u))},w=()=>{h!==null&&(clearTimeout(h),h=null,en(o.id,p.getValue()))},T=k=>{m=!0;try{p.setValue(k)}finally{m=!1}};p.onDidChange(()=>{y()});const x=ar();ln(x,o,p);const b=()=>{f.active=!1,t.shaftIdle.hidden=!1;const k=t.shaft.getContext("2d");k&&k.clearRect(0,0,t.shaft.width,t.shaft.height)},g=(k,{fromGrid:I})=>{w(),o=k,dt(t,k),on(r,k),sn(l,k),rt(s,k),ln(x,k,p),T(Zt(k.id)??k.starterCode),t.result.textContent="",t.progress.textContent="",b(),pt(t,"stage"),i="stage",e.onStageChange?.(k.id)},v=()=>{w(),b(),t.result.textContent="",t.progress.textContent="",pt(t,"grid"),i="grid",it(a,k=>{g(n(k),{fromGrid:!0})}),e.onBackToGrid?.()};it(a,k=>{g(n(k),{fromGrid:!0})});const S=e.landOn??"grid";pt(t,S),i=S;const E=async()=>{const k=o;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="";let I=null,C=0;f.active=!0;const A=()=>{f.active&&(I!==null&&c.draw(I,1),requestAnimationFrame(A))};t.shaftIdle.hidden=!0,requestAnimationFrame(A);try{const R=()=>i==="stage"&&o.id===k.id,M=await Ji(k,p.getValue(),{timeoutMs:1e3,onProgress:F=>{R()&&(t.progress.textContent=Zi(F))},onSnapshot:F=>{I=F,C+=1}});if(M.passed){const F=Ce(k.id);M.stars>F&&(Vi(k.id,M.stars),it(a,B=>{g(n(B),{fromGrid:!0})}),R()&&dt(t,o)),R()&&rt(s,o,{collapse:!1})}if(R()){t.result.textContent="",t.progress.textContent="";const F=M.passed?ji(k.id):void 0,B=F?()=>{g(F,{fromGrid:!1})}:void 0;ir(d,M,()=>void E(),k.failHint,B)}}catch(R){if(i==="stage"&&o.id===k.id){const M=R instanceof Error?R.message:String(R);t.result.textContent=`Error: ${M}`,t.progress.textContent=""}}finally{if(t.runBtn.disabled=!1,f.active=!1,C===0){const R=t.shaft.getContext("2d");R&&R.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{E()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${o.title} to its starter code?`)&&(zi(o.id),T(o.starterCode),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{v()}),{handles:t,editor:p}}let ut=null;async function oo(){if(!ut){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;ut=import(e).then(async n=>(await n.default(t),n))}return ut}class Mt{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,o){const i=await oo();return new Mt(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class io{#e;#t=0;#n=[];#i=0;#r=0;#s=1;#d=0;constructor(t){this.#e=cs(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#i=t.reduce((n,o)=>n+o.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#s=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const o=t.stops.filter(s=>s.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#s/60*i,this.#r=(this.#r+i)%(this.#i||1);const l=[];for(;this.#t>=1;)this.#t-=1,l.push(this.#a(o,r));return l}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,o]of this.#n.entries())if(t-=o.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#i<=0?0:Math.min(1,this.#r/this.#i)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#n}#a(t,n){const o=this.#o(t.length,n.originWeights);let i=this.#o(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],l=t[i];if(!r||!l)throw new Error("stop index out of bounds");const s=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:l.stop_id,weight:s,...this.#d>0?{patienceTicks:this.#d}:{}}}#o(t,n){if(!n||n.length!==t)return this.#c(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#c(t);let i=this.#p()*o;for(const[r,l]of n.entries())if(i-=Math.max(0,l),i<0)return r;return t-1}#l(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#c(t){return Number(this.#l()%BigInt(t))}#p(){return Number(this.#l()>>11n)/2**53}}function cs(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const ds="#7dd3fc",ps="#fda4af";async function un(e,t,n,o,i){const r=_o(o,i),l=await Mt.create(r,t,n),s=new no(e.canvas,e.accent);if(s.setTetherConfig(o.tether??null),o.tether){const c=xt(o,i);s.setTetherPhysics(c.maxSpeed,c.acceleration,c.deceleration)}const a=e.canvas.parentElement;if(a){const c=o.stops.length,p=o.tether?640:Math.max(200,c*16);a.style.setProperty("--shaft-min-h",`${p}px`)}return{strategy:t,sim:l,renderer:s,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function he(e){e?.sim.dispose(),e?.renderer.dispose()}function St(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const us=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],fs=120;function fn(e,t,n){const o=e.sim.metrics();e.latestMetrics=o;for(const r of us){const l=e.metricHistory[r];l.push(o[r]),l.length>fs&&l.shift()}const i=performance.now();for(const[r,l]of e.bubbles)l.expiresAt<=i&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const hs={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},gs=1e3;function ms(e,t,n){const o=performance.now(),i=r=>ys(n,r);for(const r of t){const l=bs(r,i);if(l===null)continue;const s=r.elevator;if(s===void 0)continue;const a=hs[r.kind]??gs;e.bubbles.set(s,{text:l,bornAt:o,expiresAt:o+a})}}function bs(e,t){switch(e.kind){case"elevator-assigned":return`› To ${t(e.stop)}`;case"elevator-repositioning":return`↻ Reposition to ${t(e.stop)}`;case"elevator-arrived":return`● At ${t(e.stop)}`;case"door-opened":return"◌ Doors open";case"rider-boarded":return"+ Boarding";case"rider-exited":return`↓ Off at ${t(e.stop)}`;default:return null}}function ys(e,t){return e.stops.find(o=>o.entity_id===t)?.name??`stop #${t}`}const Ss={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function hn(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=Ss[t],e.modeEl.title=t)}function ws(){const e=s=>{const a=document.getElementById(s);if(!a)throw new Error(`missing element #${s}`);return a},t=s=>document.getElementById(s),n=(s,a)=>({root:e(`pane-${s}`),canvas:e(`shaft-${s}`),name:e(`name-${s}`),mode:e(`mode-${s}`),desc:e(`desc-${s}`),metrics:e(`metrics-${s}`),trigger:e(`strategy-trigger-${s}`),popover:e(`strategy-popover-${s}`),repoTrigger:e(`repo-trigger-${s}`),repoName:e(`repo-name-${s}`),repoPopover:e(`repo-popover-${s}`),accent:a,which:s}),o=s=>{const a=document.querySelector(`.tweak-row[data-key="${s}"]`);if(!a)throw new Error(`missing tweak row for ${s}`);const c=p=>{const d=a.querySelector(p);if(!d)throw new Error(`missing ${p} in tweak row ${s}`);return d},f=p=>a.querySelector(p);return{root:a,value:c(".tweak-value"),defaultV:c(".tweak-default-v"),dec:c(".tweak-dec"),inc:c(".tweak-inc"),reset:c(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},i={};for(const s of pe)i[s]=o(s);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",ds),paneB:n("b",ps)};jo(r);const l=document.getElementById("controls-bar");return l&&new ResizeObserver(([a])=>{if(!a)return;const c=Math.ceil(a.borderBoxSize[0]?.blockSize??a.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${c}px`)}).observe(l),r}function ro(e,t,n,o,i,r,l,s,a){const c=document.createDocumentFragment();for(const f of t){const p=document.createElement("button");p.type="button",p.className="strategy-option",p.setAttribute("role","menuitemradio"),p.setAttribute("aria-checked",f===r?"true":"false"),p.dataset[i]=f;const d=document.createElement("span");d.className="strategy-option-name";const u=document.createElement("span");if(u.className="strategy-option-label",u.textContent=n[f],d.appendChild(u),l&&f===l){const m=document.createElement("span");m.className="strategy-option-sibling",m.textContent=`also in ${s}`,d.appendChild(m)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=o[f],p.append(d,h),p.addEventListener("click",()=>{a(f)}),c.appendChild(p)}e.replaceChildren(c)}function te(e,t){const n=It[t],o=qn[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function gn(e,t,n,o,i){ro(e.repoPopover,No,It,qn,"reposition",t,n,o,i)}function ye(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;gn(t.paneA,o,r?i:null,"B",l=>void bn(e,t,"a",l,n)),gn(t.paneB,i,r?o:null,"A",l=>void bn(e,t,"b",l,n))}function wt(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function so(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function vt(e){wt(e.paneA,!1),wt(e.paneB,!1)}function Qe(e){_t(e),vt(e)}function mn(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;Qe(t),r&&(ye(e,t,o),wt(n,!0))})}async function bn(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){vt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},te(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},te(t.paneB,o)),G(e.permalink),ye(e,t,i),vt(t),await i(),q(t.toast,`${n==="a"?"A":"B"} park: ${It[o]}`)}function vs(e){document.addEventListener("click",t=>{if(!ao(e)&&!so(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;Qe(e)}})}function ne(e,t){const n=Xe[t],o=Wn[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function yn(e,t,n,o,i){ro(e.popover,Ho,Xe,Wn,"strategy",t,n,o,i)}function Se(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;yn(t.paneA,o,r?i:null,"B",l=>void wn(e,t,"a",l,n)),yn(t.paneB,i,r?o:null,"A",l=>void wn(e,t,"b",l,n))}function kt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function ao(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function _t(e){kt(e.paneA,!1),kt(e.paneB,!1)}function Sn(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;Qe(t),r&&(Se(e,t,o),kt(n,!0))})}async function wn(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){_t(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},ne(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},ne(t.paneB,o)),G(e.permalink),Se(e,t,i),_t(t),await i(),q(t.toast,`${n==="a"?"A":"B"}: ${Xe[o]}`)}function vn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function ks(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function Je(e,t,n){let o=!1;for(const i of pe){const r=n.tweakRows[i],l=e.tweakRanges[i],s=Z(e,i,t),a=Tt(e,i),c=Et(e,i,s);c&&(o=!0),r.value.textContent=vn(i,s),r.defaultV.textContent=vn(i,a),r.dec.disabled=s<=l.min+1e-9,r.inc.disabled=s>=l.max-1e-9,r.root.dataset.overridden=String(c),r.reset.hidden=!c;const f=Math.max(l.max-l.min,1e-9),p=Math.max(0,Math.min(1,(s-l.min)/f)),d=Math.max(0,Math.min(1,(a-l.min)/f));r.trackFill&&(r.trackFill.style.width=`${(p*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(p*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function lo(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function Pt(e,t,n,o){const i=xt(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},l=[e.paneA,e.paneB].filter(a=>a!==null),s=l.every(a=>a.sim.applyPhysicsLive(r));if(s)for(const a of l)a.renderer?.setTetherPhysics(i.maxSpeed,i.acceleration,i.deceleration);Je(n,e.permalink.overrides,t),s||o()}function _s(e,t,n){return Math.min(n,Math.max(t,e))}function Cs(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function Le(e,t,n,o,i){const r=H(e.permalink.scenario),l=r.tweakRanges[n],s=Z(r,n,e.permalink.overrides),a=_s(s+o*l.step,l.min,l.max),c=Cs(a,l.min,l.step);xs(e,t,n,c,i)}function Ts(e,t,n,o){const i=H(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},G(e.permalink),n==="cars"?(o(),q(t.toast,"Cars reset")):(Pt(e,t,i,o),q(t.toast,`${ks(n)} reset`))}async function Es(e,t,n){const o=H(e.permalink.scenario),i=Et(o,"cars",Z(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},G(e.permalink),i?await n():Pt(e,t,o,n),q(t.toast,"Parameters reset")}function xs(e,t,n,o,i){const r=H(e.permalink.scenario),l={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:Mn(r,l)},G(e.permalink),n==="cars"?i():Pt(e,t,r,i)}function Is(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Rs(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var Fe={exports:{}},As=Fe.exports,kn;function Ms(){return kn||(kn=1,(function(e){(function(t,n,o){function i(a){var c=this,f=s();c.next=function(){var p=2091639*c.s0+c.c*23283064365386963e-26;return c.s0=c.s1,c.s1=c.s2,c.s2=p-(c.c=p|0)},c.c=1,c.s0=f(" "),c.s1=f(" "),c.s2=f(" "),c.s0-=f(a),c.s0<0&&(c.s0+=1),c.s1-=f(a),c.s1<0&&(c.s1+=1),c.s2-=f(a),c.s2<0&&(c.s2+=1),f=null}function r(a,c){return c.c=a.c,c.s0=a.s0,c.s1=a.s1,c.s2=a.s2,c}function l(a,c){var f=new i(a),p=c&&c.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,p&&(typeof p=="object"&&r(p,f),d.state=function(){return r(f,{})}),d}function s(){var a=4022871197,c=function(f){f=String(f);for(var p=0;p<f.length;p++){a+=f.charCodeAt(p);var d=.02519603282416938*a;a=d>>>0,d-=a,d*=a,a=d>>>0,d-=a,a+=d*4294967296}return(a>>>0)*23283064365386963e-26};return c}n&&n.exports?n.exports=l:this.alea=l})(As,e)})(Fe)),Fe.exports}var Be={exports:{}},Ps=Be.exports,_n;function Ls(){return _n||(_n=1,(function(e){(function(t,n,o){function i(s){var a=this,c="";a.x=0,a.y=0,a.z=0,a.w=0,a.next=function(){var p=a.x^a.x<<11;return a.x=a.y,a.y=a.z,a.z=a.w,a.w^=a.w>>>19^p^p>>>8},s===(s|0)?a.x=s:c+=s;for(var f=0;f<c.length+64;f++)a.x^=c.charCodeAt(f)|0,a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a}function l(s,a){var c=new i(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xor128=l})(Ps,e)})(Be)),Be.exports}var $e={exports:{}},Fs=$e.exports,Cn;function Bs(){return Cn||(Cn=1,(function(e){(function(t,n,o){function i(s){var a=this,c="";a.next=function(){var p=a.x^a.x>>>2;return a.x=a.y,a.y=a.z,a.z=a.w,a.w=a.v,(a.d=a.d+362437|0)+(a.v=a.v^a.v<<4^(p^p<<1))|0},a.x=0,a.y=0,a.z=0,a.w=0,a.v=0,s===(s|0)?a.x=s:c+=s;for(var f=0;f<c.length+64;f++)a.x^=c.charCodeAt(f)|0,f==c.length&&(a.d=a.x<<10^a.x>>>4),a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a.v=s.v,a.d=s.d,a}function l(s,a){var c=new i(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xorwow=l})(Fs,e)})($e)),$e.exports}var De={exports:{}},$s=De.exports,Tn;function Ds(){return Tn||(Tn=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var f=a.x,p=a.i,d,u;return d=f[p],d^=d>>>7,u=d^d<<24,d=f[p+1&7],u^=d^d>>>10,d=f[p+3&7],u^=d^d>>>3,d=f[p+4&7],u^=d^d<<7,d=f[p+7&7],d=d^d<<13,u^=d^d<<9,f[p]=u,a.i=p+1&7,u};function c(f,p){var d,u=[];if(p===(p|0))u[0]=p;else for(p=""+p,d=0;d<p.length;++d)u[d&7]=u[d&7]<<15^p.charCodeAt(d)+u[d+1&7]<<13;for(;u.length<8;)u.push(0);for(d=0;d<8&&u[d]===0;++d);for(d==8?u[7]=-1:u[d],f.x=u,f.i=0,d=256;d>0;--d)f.next()}c(a,s)}function r(s,a){return a.x=s.x.slice(),a.i=s.i,a}function l(s,a){s==null&&(s=+new Date);var c=new i(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(f.x&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xorshift7=l})($s,e)})(De)),De.exports}var Oe={exports:{}},Os=Oe.exports,En;function Ws(){return En||(En=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var f=a.w,p=a.X,d=a.i,u,h;return a.w=f=f+1640531527|0,h=p[d+34&127],u=p[d=d+1&127],h^=h<<13,u^=u<<17,h^=h>>>15,u^=u>>>12,h=p[d]=h^u,a.i=d,h+(f^f>>>16)|0};function c(f,p){var d,u,h,m,y,w=[],T=128;for(p===(p|0)?(u=p,p=null):(p=p+"\0",u=0,T=Math.max(T,p.length)),h=0,m=-32;m<T;++m)p&&(u^=p.charCodeAt((m+32)%p.length)),m===0&&(y=u),u^=u<<10,u^=u>>>15,u^=u<<4,u^=u>>>13,m>=0&&(y=y+1640531527|0,d=w[m&127]^=u+y,h=d==0?h+1:0);for(h>=128&&(w[(p&&p.length||0)&127]=-1),h=127,m=512;m>0;--m)u=w[h+34&127],d=w[h=h+1&127],u^=u<<13,d^=d<<17,u^=u>>>15,d^=d>>>12,w[h]=u^d;f.w=y,f.X=w,f.i=h}c(a,s)}function r(s,a){return a.i=s.i,a.w=s.w,a.X=s.X.slice(),a}function l(s,a){s==null&&(s=+new Date);var c=new i(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(f.X&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xor4096=l})(Os,e)})(Oe)),Oe.exports}var We={exports:{}},qs=We.exports,xn;function Hs(){return xn||(xn=1,(function(e){(function(t,n,o){function i(s){var a=this,c="";a.next=function(){var p=a.b,d=a.c,u=a.d,h=a.a;return p=p<<25^p>>>7^d,d=d-u|0,u=u<<24^u>>>8^h,h=h-p|0,a.b=p=p<<20^p>>>12^d,a.c=d=d-u|0,a.d=u<<16^d>>>16^h,a.a=h-p|0},a.a=0,a.b=0,a.c=-1640531527,a.d=1367130551,s===Math.floor(s)?(a.a=s/4294967296|0,a.b=s|0):c+=s;for(var f=0;f<c.length+20;f++)a.b^=c.charCodeAt(f)|0,a.next()}function r(s,a){return a.a=s.a,a.b=s.b,a.c=s.c,a.d=s.d,a}function l(s,a){var c=new i(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.tychei=l})(qs,e)})(We)),We.exports}var qe={exports:{}};const Ns={},Gs=Object.freeze(Object.defineProperty({__proto__:null,default:Ns},Symbol.toStringTag,{value:"Module"})),Us=Rs(Gs);var js=qe.exports,In;function zs(){return In||(In=1,(function(e){(function(t,n,o){var i=256,r=6,l=52,s="random",a=o.pow(i,r),c=o.pow(2,l),f=c*2,p=i-1,d;function u(b,g,v){var S=[];g=g==!0?{entropy:!0}:g||{};var E=w(y(g.entropy?[b,x(n)]:b??T(),3),S),k=new h(S),I=function(){for(var C=k.g(r),A=a,R=0;C<c;)C=(C+R)*i,A*=i,R=k.g(1);for(;C>=f;)C/=2,A/=2,R>>>=1;return(C+R)/A};return I.int32=function(){return k.g(4)|0},I.quick=function(){return k.g(4)/4294967296},I.double=I,w(x(k.S),n),(g.pass||v||function(C,A,R,M){return M&&(M.S&&m(M,k),C.state=function(){return m(k,{})}),R?(o[s]=C,A):C})(I,E,"global"in g?g.global:this==o,g.state)}function h(b){var g,v=b.length,S=this,E=0,k=S.i=S.j=0,I=S.S=[];for(v||(b=[v++]);E<i;)I[E]=E++;for(E=0;E<i;E++)I[E]=I[k=p&k+b[E%v]+(g=I[E])],I[k]=g;(S.g=function(C){for(var A,R=0,M=S.i,F=S.j,B=S.S;C--;)A=B[M=p&M+1],R=R*i+B[p&(B[M]=B[F=p&F+A])+(B[F]=A)];return S.i=M,S.j=F,R})(i)}function m(b,g){return g.i=b.i,g.j=b.j,g.S=b.S.slice(),g}function y(b,g){var v=[],S=typeof b,E;if(g&&S=="object")for(E in b)try{v.push(y(b[E],g-1))}catch{}return v.length?v:S=="string"?b:b+"\0"}function w(b,g){for(var v=b+"",S,E=0;E<v.length;)g[p&E]=p&(S^=g[p&E]*19)+v.charCodeAt(E++);return x(g)}function T(){try{var b;return d&&(b=d.randomBytes)?b=b(i):(b=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(b)),x(b)}catch{var g=t.navigator,v=g&&g.plugins;return[+new Date,t,v,t.screen,x(n)]}}function x(b){return String.fromCharCode.apply(0,b)}if(w(o.random(),n),e.exports){e.exports=u;try{d=Us}catch{}}else o["seed"+s]=u})(typeof self<"u"?self:js,[],Math)})(qe)),qe.exports}var ft,Rn;function Vs(){if(Rn)return ft;Rn=1;var e=Ms(),t=Ls(),n=Bs(),o=Ds(),i=Ws(),r=Hs(),l=zs();return l.alea=e,l.xor128=t,l.xorwow=n,l.xorshift7=o,l.xor4096=i,l.tychei=r,ft=l,ft}var Xs=Vs();const Ys=Is(Xs),Ve=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],ht=Ve.reduce((e,t)=>t.length<e.length?t:e).length,gt=Ve.reduce((e,t)=>t.length>e.length?t:e).length;function Ks(e){const t=e?.seed?new Ys(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let u=typeof n!="number"?ht:s(n);const h=typeof o!="number"?gt:s(o);u>h&&(u=h);let m=!1,y;for(;!m;)y=l(),m=y.length<=h&&y.length>=u;return y}function l(){return Ve[a(Ve.length)]}function s(u){return u<ht&&(u=ht),u>gt&&(u=gt),u}function a(u){const h=t?t():Math.random();return Math.floor(h*u)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=u=>u),typeof e.separator!="string"&&(e.separator=" ");const c=e.min+a(e.max+1-e.min);let f=[],p="",d=0;for(let u=0;u<c*e.wordsPerString;u++)d===e.wordsPerString-1?p+=e.formatter(r(),d):p+=e.formatter(r(),d)+e.separator,d++,(u+1)%e.wordsPerString===0&&(f.push(p),p="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const co=e=>`${e}×`,po=e=>`${e.toFixed(1)}×`;function uo(){const e=Ks({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function Qs(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=co(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=po(e.intensity),ne(t.paneA,e.strategyA),ne(t.paneB,e.strategyB),te(t.paneA,e.repositionA),te(t.paneB,e.repositionB),Hn(t,e.scenario);const n=H(e.scenario);Object.keys(e.overrides).length>0&&lo(t,!0),Je(n,e.overrides,t)}function we(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function fo(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function ho(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function Js(e){if(e.length<2)return"M 0 13 L 100 13";let t=e[0]??0,n=e[0]??0;for(let l=1;l<e.length;l++){const s=e[l];s!==void 0&&(s<t&&(t=s),s>n&&(n=s))}const o=n-t,i=e.length;let r="";for(let l=0;l<i;l++){const s=l/(i-1)*100,a=o>0?13-((e[l]??0)-t)/o*12:7;r+=`${l===0?"M":"L"} ${s.toFixed(2)} ${a.toFixed(2)} `}return r.trim()}const Ct=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function Zs(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function ea(e,t){const n=(u,h,m,y)=>Math.abs(u-h)<m?["tie","tie"]:(y?u>h:u<h)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,l]=n(e.max_wait_s,t.max_wait_s,.05,!1),[s,a]=n(e.delivered,t.delivered,.5,!0),[c,f]=n(e.abandoned,t.abandoned,.5,!1),[p,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:s,abandoned:c,utilization:p},b:{avg_wait_s:i,max_wait_s:l,delivered:a,abandoned:f,utilization:d}}}function An(e){const t=document.createDocumentFragment();for(const[n]of Ct){const o=de("div","metric-row flex flex-col gap-[3px] px-2.5 py-[7px] bg-surface-elevated border border-stroke-subtle rounded-md transition-colors duration-normal"),i=document.createElementNS("http://www.w3.org/2000/svg","svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS("http://www.w3.org/2000/svg","path")),o.append(de("span","text-[9.5px] uppercase tracking-[0.08em] text-content-disabled font-medium",n),de("span","metric-v text-[15px] text-content font-medium [font-feature-settings:'tnum'_1]"),i),t.appendChild(o)}e.replaceChildren(t)}function mt(e,t,n,o){const i=e.children;for(let r=0;r<Ct.length;r++){const l=i[r];if(!l)continue;const s=Ct[r];if(!s)continue;const a=s[1],c=n?n[a]:"";l.dataset.verdict!==c&&(l.dataset.verdict=c);const f=l.children[1],p=Zs(t,a);f.textContent!==p&&(f.textContent=p);const u=l.children[2].firstElementChild,h=Js(o[a]);u.getAttribute("d")!==h&&u.setAttribute("d",h)}}const ta=200;function go(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function J(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=H(e.permalink.scenario);e.traffic=new io(On(e.permalink.seed)),go(e,o),he(e.paneA),he(e.paneB),e.paneA=null,e.paneB=null;try{const i=await un(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);ne(t.paneA,e.permalink.strategyA),te(t.paneA,e.permalink.repositionA),An(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await un(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),ne(t.paneB,e.permalink.strategyB),te(t.paneB,e.permalink.repositionB),An(t.paneB.metrics)}catch(l){throw he(i),l}if(n!==e.initToken){he(i),he(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,fo(e,t),ho(e,t),Je(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&q(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function na(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<ta&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if(St(e,l=>{const s=l.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);s.kind==="err"&&console.warn(`spawnRider failed (seed): ${s.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(go(e,H(e.permalink.scenario)),e.seeding=null)}function oa(e,t){const n=()=>J(e,t),o={renderPaneStrategyInfo:ne,renderPaneRepositionInfo:te,refreshStrategyPopovers:()=>{Se(e,t,n),ye(e,t,n)},renderTweakPanel:()=>{const r=H(e.permalink.scenario);Je(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const l=r.target;if(!(l instanceof HTMLElement))return;const s=l.closest(".scenario-card");if(!s)return;const a=s.dataset.scenarioId;!a||a===e.permalink.scenario||Nn(e,t,a,n,o)}),Sn(e,t,t.paneA,n),Sn(e,t,t.paneB,n),mn(e,t,t.paneA,n),mn(e,t,t.paneB,n),Se(e,t,n),ye(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},G(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",Se(e,t,n),ye(e,t,n),J(e,t).then(()=>{q(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||O.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},G(e.permalink),J(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=uo();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},G(e.permalink),J(e,t).then(()=>{q(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=co(r)}),t.speedInput.addEventListener("change",()=>{G(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=po(r)}),t.intensityInput.addEventListener("change",()=>{G(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{J(e,t),q(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";lo(t,r)});for(const r of pe){const l=t.tweakRows[r];jt(l.dec,()=>{Le(e,t,r,-1,n)}),jt(l.inc,()=>{Le(e,t,r,1,n)}),l.reset.addEventListener("click",()=>{Ts(e,t,r,n)}),l.root.addEventListener("keydown",s=>{s.key==="ArrowUp"||s.key==="ArrowRight"?(s.preventDefault(),Le(e,t,r,1,n)):(s.key==="ArrowDown"||s.key==="ArrowLeft")&&(s.preventDefault(),Le(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{Es(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=Dn(e.permalink),l=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(l).then(()=>{q(t.toast,"Permalink copied")},()=>{q(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{we(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{we(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&we(t,!1)}),ia(e,t,o),vs(t)}function ia(e,t,n){window.addEventListener("keydown",o=>{if(e.permalink.mode==="quest")return;if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable||o.target.closest(".monaco-editor"))return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),we(t,t.shortcutSheet.hidden);return}case"Escape":{if(ao(t)||so(t)){o.preventDefault(),Qe(t);return}t.shortcutSheet.hidden||(o.preventDefault(),we(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=ke.length){const r=ke[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),Nn(e,t,r.id,()=>J(e,t),n))}})}function ra(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=ea(t.latestMetrics,n.latestMetrics);mt(t.metricsEl,t.latestMetrics,o.a,t.metricHistory),mt(n.metricsEl,n.latestMetrics,o.b,n.metricHistory)}else mt(t.metricsEl,t.latestMetrics,null,t.metricHistory);hn(t),n&&hn(n)}function sa(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const l=e.paneA,s=e.paneB,a=l!==null&&(!e.permalink.compare||s!==null);if(e.running&&e.ready&&a){const c=e.permalink.speed;St(e,m=>{m.sim.step(c);const y=m.sim.drainEvents();if(y.length>0){const w=m.sim.snapshot();ms(m,y,w);const T=new Map;for(const x of w.cars)T.set(x.id,x.line);for(const x of y)if(x.kind==="elevator-assigned"){const b=T.get(x.elevator);b!==void 0&&m.renderer.pushAssignment(x.stop,x.elevator,b)}}}),e.seeding&&na(e);const f=l.sim.snapshot(),d=Math.min(r,4/60)*c,u=e.seeding?[]:e.traffic.drainSpawns(f,d);for(const m of u)St(e,y=>{const w=y.sim.spawnRider(m.originStopId,m.destStopId,m.weight,m.patienceTicks);w.kind==="err"&&console.warn(`spawnRider failed: ${w.error}`)});const h=e.permalink.speed;fn(l,l.sim.snapshot(),h),s&&fn(s,s.sim.snapshot(),h),ra(e),(n+=1)%4===0&&(fo(e,t),ho(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function aa(){oo().catch(()=>{});const t=ws(),n=new URLSearchParams(window.location.search).has("k"),o={...O,...Wo(window.location.search)};if(!n){o.seed=uo();const s=new URL(window.location.href);s.searchParams.set("k",o.seed),window.history.replaceState(null,"",s.toString())}zo(o);const i=H(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=Mn(i,o.overrides),Yo(o.mode),Ko(o.mode),Qs(o,t);const l={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new io(On(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(oa(l,t),await J(l,t),l.ready=!0,sa(l,t),l.permalink.mode==="quest"){const s=new URLSearchParams(window.location.search).has("qs");await ls({initialStageId:l.permalink.questStage,landOn:s?"stage":"grid",onStageChange:a=>{l.permalink.questStage=a;const c=new URL(window.location.href);a===O.questStage?c.searchParams.delete("qs"):c.searchParams.set("qs",a),window.history.replaceState(null,"",c.toString())},onBackToGrid:()=>{const a=new URL(window.location.href);a.searchParams.delete("qs"),window.history.replaceState(null,"",a.toString())}})}}aa();export{Ge as _};
