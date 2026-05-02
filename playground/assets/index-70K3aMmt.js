const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-BEDrLazD.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const l of r.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&o(l)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function le(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let Ft=0;function W(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(Ft),Ft=window.setTimeout(()=>{e.classList.remove("show")},1600)}function Bt(e,t){let i=0,r=0;const l=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",s=>{e.disabled||(s.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){l();return}t()},70)},380))}),e.addEventListener("pointerup",l),e.addEventListener("pointerleave",l),e.addEventListener("pointercancel",l),e.addEventListener("blur",l),e.addEventListener("click",s=>{s.pointerType||t()})}function J(e,t,n){const o=ht(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return kn(i,r.min,r.max)}function ht(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return vn(n.doorOpenTicks,n.doorTransitionTicks)}}function gt(e,t,n){const o=ht(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function wn(e,t){const n={};for(const o of ce){const i=t[o];i!==void 0&&gt(e,o,i)&&(n[o]=i)}return n}const ce=["cars","maxSpeed","weightCapacity","doorCycleSec"];function ro(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=vn(n,o),r=kn(n/(i*Oe),.1,.9),l=Math.max(2,Math.round(t*Oe)),s=Math.max(1,Math.round(l*r)),a=Math.max(1,Math.round((l-s)/2));return{openTicks:s,transitionTicks:a}}function vn(e,t){return(e+2*t)/Oe}function mt(e,t){const n=e.elevatorDefaults,o=J(e,"maxSpeed",t),i=J(e,"weightCapacity",t),r=J(e,"doorCycleSec",t),{openTicks:l,transitionTicks:s}=ro(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:l,doorTransitionTicks:s}}function so(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function ao(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(J(e,"cars",t)),i=mt(e,t),r=so(e.stops.length,o),l=e.stops.map((a,c)=>`        StopConfig(id: StopId(${c}), name: ${st(a.name)}, position: ${U(a.positionM)}),`).join(`
`),s=r.map((a,c)=>co(c,i,a,lo(c,o))).join(`
`);return`SimConfig(
    building: BuildingConfig(
        name: ${st(e.buildingName)},
        stops: [
${l}
        ],
    ),
    elevators: [
${s}
    ],
    simulation: SimulationParams(ticks_per_second: ${U(Oe)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${U(e.passengerWeightRange[0])}, ${U(e.passengerWeightRange[1])}),
    ),
)`}const Oe=60;function kn(e,t,n){return Math.min(n,Math.max(t,e))}function lo(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function co(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${U(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${U(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${st(o)},
            max_speed: ${U(t.maxSpeed)}, acceleration: ${U(t.acceleration)}, deceleration: ${U(t.deceleration)},
            weight_capacity: ${U(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function st(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function U(e){return Number.isInteger(e)?`${e}.0`:String(e)}const _n={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function Ie(e){return Array.from({length:e},()=>1)}const ie=5,po=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:ie},(e,t)=>t===ie-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:Ie(ie),destWeights:Ie(ie)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:Ie(ie),destWeights:Ie(ie)}],fo={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:po,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{..._n,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},De=19,at=16,Se=4,Cn=(1+De)*Se,ue=1,he=41,ge=42,uo=43;function G(e){return Array.from({length:uo},(t,n)=>e(n))}const re=e=>e===ue||e===he||e===ge,ho=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:G(e=>e===0?20:e===ue?2:e===he?1.2:e===ge?.2:.1),destWeights:G(e=>e===0?0:e===ue?.3:e===he?.4:e===ge?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:G(e=>re(e)?.5:1),destWeights:G(e=>re(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:G(e=>e===21?4:re(e)?.25:1),destWeights:G(e=>e===21?5:re(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:G(e=>e===0||e===ue||e===21?.3:e===he?.4:e===ge?1.2:1),destWeights:G(e=>e===0?20:e===ue?1:e===he?.6:e===ge?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:G(e=>re(e)?1.5:.2),destWeights:G(e=>re(e)?1.5:.2)}];function go(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let s=1;s<=De;s++){const a=1+s,c=s*Se;e.push(`        StopConfig(id: StopId(${a.toString().padStart(2," ")}), name: "Floor ${s}",    position: ${c.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${Cn.toFixed(1)}),`);for(let s=21;s<=20+at;s++){const a=1+s,c=s*Se;e.push(`        StopConfig(id: StopId(${a}), name: "Floor ${s}",   position: ${c.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:De},(s,a)=>2+a),21],n=[21,...Array.from({length:at},(s,a)=>22+a)],o=[1,21,38,39,40],i=[1,0,41,42],r=s=>s.map(a=>`StopId(${a})`).join(", "),l=(s,a,c,u)=>`                ElevatorConfig(
                    id: ${s}, name: "${a}",
                    max_speed: 4.5, acceleration: 2.0, deceleration: 2.5,
                    weight_capacity: ${u.toFixed(1)},
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
)`}const mo=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:De},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*Se})),{name:"Sky Lobby",positionM:Cn},...Array.from({length:at},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*Se})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],yo={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:ho,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:mo,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{..._n,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:go()},$t=1e5,Ot=4e5,Dt=35786e3,bo=1e8,So=4;function Re(e){return Array.from({length:So},(t,n)=>e(n))}const wo={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:Re(e=>e===0?6:1),destWeights:Re(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:Re(e=>e===0?0:e===1?1:e===2?3:5),destWeights:Re(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:$t},{name:"LEO Transfer",positionM:Ot},{name:"GEO Platform",positionM:Dt}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:bo,showDayNight:!1},ron:`SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${$t.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${Ot.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${Dt.toFixed(1)}),
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
)`},we=[yo,wo,fo];function q(e){const t=we.find(o=>o.id===e);if(t)return t;const n=we[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const Tn={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},$={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},vo=["scan","look","nearest","etd","destination","rsr"],ko=["adaptive","predictive","lobby","spread","none"];function Wt(e,t){return e!==null&&vo.includes(e)?e:t}function qt(e,t){return e!==null&&ko.includes(e)?e:t}function H(e){const t=En(e);window.location.search!==t&&window.history.replaceState(null,"",t)}function _o(e,t){return e==="compare"||e==="quest"?e:t}function En(e){const t=new URLSearchParams;e.mode!==$.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==$.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=q(e.scenario).defaultReposition,o=n??$.repositionA,i=n??$.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of ce){const l=e.overrides[r];l!==void 0&&Number.isFinite(l)&&t.set(Tn[r],To(l))}return`?${t.toString()}`}function Co(e){const t=new URLSearchParams(e),n={};for(const o of ce){const i=t.get(Tn[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:_o(t.get("m"),$.mode),questStage:(t.get("qs")??"").trim()||$.questStage,scenario:t.get("s")??$.scenario,strategyA:Wt(t.get("a")??t.get("d"),$.strategyA),strategyB:Wt(t.get("b"),$.strategyB),repositionA:qt(t.get("pa"),$.repositionA),repositionB:qt(t.get("pb"),$.repositionB),compare:t.has("c")?t.get("c")==="1":$.compare,seed:(t.get("k")??"").trim()||$.seed,intensity:Nt(t.get("i"),$.intensity),speed:Nt(t.get("x"),$.speed),overrides:n}}function Nt(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function To(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function In(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const Eo=["scan","look","nearest","etd","destination","rsr"],Ge={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},Rn={scan:"Sweeps end-to-end like a disk head — simple, predictable, ignores who's waiting longest.",look:"Like SCAN but reverses early when nothing's queued further — a practical baseline.",nearest:"Grabs whichever call is closest right now. Fast under light load, thrashes under rush.",etd:"Estimated time of dispatch — assigns calls to whichever car can finish fastest.",destination:"Destination-control: riders pick their floor at the lobby; the group optimises assignments.",rsr:"Relative System Response — a wait-aware variant of ETD that penalises long queues."},Io=["adaptive","predictive","lobby","spread","none"],yt={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},An={adaptive:"Switches based on traffic — returns to lobby during up-peak, predicts hot floors otherwise. The default.",predictive:"Always parks idle cars near whichever floor has seen the most recent arrivals.",lobby:"Sends every idle car back to the ground floor to prime the morning-rush pickup.",spread:"Keeps idle cars fanned out across the shaft so any floor has a nearby option.",none:"Leaves idle cars wherever they finished their last delivery."},Ro="scenario-card inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated border border-stroke-subtle rounded-md text-content-secondary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:bg-surface-hover hover:border-stroke aria-pressed:bg-accent-muted aria-pressed:text-content aria-pressed:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] max-md:flex-none max-md:snap-start",Ao="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function xo(e){const t=document.createDocumentFragment();we.forEach((n,o)=>{const i=le("button",Ro);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(le("span","",n.label),le("span",Ao,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function xn(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}async function Mn(e,t,n,o,i){const r=q(n),l=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,s=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:l,repositionA:s,overrides:{}},H(e.permalink),i.renderPaneStrategyInfo(t.paneA,l),i.renderPaneRepositionInfo(t.paneA,s),i.refreshStrategyPopovers(),xn(t,r.id),await o(),i.renderTweakPanel(),W(t.toast,`${r.label} · ${Ge[l]}`)}function Mo(e){const t=q(e.scenario);e.scenario=t.id}const Po="modulepreload",Lo=function(e,t){return new URL(e,t).href},Ht={},We=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let l=function(u){return Promise.all(u.map(p=>Promise.resolve(p).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const s=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),c=a?.nonce||a?.getAttribute("nonce");i=l(n.map(u=>{if(u=Lo(u,o),u in Ht)return;Ht[u]=!0;const p=u.endsWith(".css"),d=p?'[rel="stylesheet"]':"";if(!!o)for(let m=s.length-1;m>=0;m--){const b=s[m];if(b.href===u&&(!p||b.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${d}`))return;const h=document.createElement("link");if(h.rel=p?"stylesheet":Po,p||(h.as="script"),h.crossOrigin="",h.href=u,c&&h.setAttribute("nonce",c),document.head.appendChild(h),p)return new Promise((m,b)=>{h.addEventListener("load",m),h.addEventListener("error",()=>b(new Error(`Unable to preload CSS for ${u}`)))})}))}function r(l){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=l,window.dispatchEvent(s),!s.defaultPrevented)throw l}return i.then(l=>{for(const s of l||[])s.status==="rejected"&&r(s.reason);return t().catch(r)})};async function Fo(e){const t=(await We(async()=>{const{default:i}=await import("./worker-ZyMnluNZ.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new Bo(n);return await o.init(e),o}class Bo{#e;#t=new Map;#n=1;#i=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#l),this.#e.addEventListener("error",this.#o),this.#e.addEventListener("messageerror",this.#o)}async init(t){await this.#a({kind:"init",id:this.#s(),payload:this.#d(t)})}async tick(t){return this.#a({kind:"tick",id:this.#s(),ticks:t})}async spawnRider(t,n,o,i){return this.#a({kind:"spawn-rider",id:this.#s(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#a({kind:"set-strategy",id:this.#s(),strategy:t})}async loadController(t,n){const o=n?.unlockedApi??null,i=n?.timeoutMs,r=this.#a({kind:"load-controller",id:this.#s(),source:t,unlockedApi:o});if(i===void 0){await r;return}r.catch(()=>{});let l;const s=new Promise((a,c)=>{l=setTimeout(()=>{c(new Error(`controller did not return within ${i}ms`))},i)});try{await Promise.race([r,s])}finally{l!==void 0&&clearTimeout(l)}}async reset(t){await this.#a({kind:"reset",id:this.#s(),payload:this.#d(t)})}dispose(){this.#i||(this.#i=!0,this.#e.removeEventListener("message",this.#l),this.#e.removeEventListener("error",this.#o),this.#e.removeEventListener("messageerror",this.#o),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#s(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#a(t){if(this.#i)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#t.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#o=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#i=!0,this.#e.terminate(),this.#r(new Error(o))};#l=t=>{const n=t.data,o=this.#t.get(n.id);if(o)switch(this.#t.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":o.reject(new Error(n.message));return}}}let Qe=null,se=null;async function $o(){return Qe||se||(se=(async()=>{await Oo();const e=await We(()=>import("./editor.main-BEDrLazD.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return Qe=e,e})(),se.catch(()=>{se=null}),se)}async function Oo(){const[{default:e},{default:t}]=await Promise.all([We(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),We(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}async function Do(e){const n=(await $o()).editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"vs-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o(n.getValue())});return{dispose:()=>{i.dispose()}}},insertAtCursor(o){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:o,forceMoveMarkers:!0}]),n.focus()},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const Wo=`SimConfig(
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
)`,qo={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",configRon:Wo,unlockedApi:["pushDestination"],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
//
// Five riders at the lobby want to go up to Floor 2 or Floor 3.
// Use \`sim.pushDestination(carId, stopId)\` to send the car after them.
//
// Stop ids: 0 (Lobby), 1 (Floor 2), 2 (Floor 3).

// Send the car to Floor 3 first:
sim.pushDestination(0n, 2n);
`,hints:["`sim.pushDestination(carId, stopId)` queues a destination. Both ids are bigints — pass them with the `n` suffix.","There's only one car (id 0n). Queue it to visit each floor riders are waiting for.","Pass: deliver all five riders. 3★: do it before tick 400 — back-to-back destinations beat one-at-a-time."]},No=`SimConfig(
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
)`,Ho={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",configRon:No,unlockedApi:["pushDestination","hallCalls","drainEvents"],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`,hints:["`sim.hallCalls()` returns objects with at least `{ stop, direction }`. Iterate them and dispatch the car.","Calls accumulate over time. Riders keep arriving at the configured Poisson rate, so polling `sim.hallCalls()` once per evaluation is enough; you don't need to react instantly.","3★ requires beating the nearest-car baseline. Try queuing destinations in directional order so the car doesn't bounce."]},Go=`SimConfig(
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
)`,Uo={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",configRon:Go,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`,hints:["`sim.carCalls(carId)` returns an array of stop ids the riders inside that car have pressed.","Combine hall calls (riders waiting outside) and car calls (riders inside) into a single dispatch sweep — bouncing back and forth burns time.","3★ requires sub-30s max wait. Look at events with `sim.drainEvents()` to react the moment a call lands instead of polling stale state."]},zo=`SimConfig(
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
)`,jo={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",configRon:zo,unlockedApi:["setStrategy"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
//
// elevator-core ships built-in dispatch strategies: scan, look,
// nearest, etd, destination, rsr. Try them out:
//
//   sim.setStrategy("look");
//
// returns true on success, false if the name isn't a built-in.
// The default for this stage is SCAN — see if you can beat it.

sim.setStrategy("look");
`,hints:["`scan` sweeps end-to-end; `look` stops at the last request and reverses; `nearest` picks the closest idle car; `etd` minimises estimated time-to-destination.","Look at `metrics.avg_wait_s` to judge: lower is better. Try each strategy in turn — the deltas are small but visible.","3★ requires sub-18s average wait. ETD typically wins on heavy traffic; LOOK is competitive at lower spawn rates."]},Xo=`SimConfig(
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
)`,Yo={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",configRon:Xo,unlockedApi:["setStrategy"],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."]},Vo=`SimConfig(
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
)`,Ko=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,Qo={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",configRon:Vo,unlockedApi:["setStrategyJs"],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:Ko,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."]},Jo=`SimConfig(
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
)`,Zo={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",configRon:Jo,unlockedApi:["setStrategyJs"],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."]},ei=`SimConfig(
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
)`,ti=`// Stage 8 — Event-Driven
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
`,ni={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",configRon:ei,unlockedApi:["setStrategyJs","drainEvents"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:ti,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."]},oi=`SimConfig(
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
)`,ii=`// Stage 9 — Take the Wheel
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
`,ri={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",configRon:oi,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:ii,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.']},si=`SimConfig(
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
)`,ai=`// Stage 10 — Patient Boarding
//
// holdDoor(carRef) keeps the doors open past the configured cycle.
// cancelDoorHold(carRef) releases the hold so doors close on the
// next loading-complete tick. The door cycle in this stage is
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
`,li={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",configRon:si,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:ai,hints:["`holdDoor(carRef)` keeps doors open indefinitely until you call `cancelDoorHold(carRef)`. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."]},ci=`SimConfig(
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
)`,di=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,pi={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",configRon:ci,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:di,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."]},fi=`SimConfig(
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
)`,ui=`// Stage 12 — Routes
//
// Riders have explicit routes between origin and destination. The
// controller can inspect them with shortestRoute(originStop,
// destinationStop) and reroute(rider, newRoute) when needed.
//
// Most stages don't need this directly — riders are auto-routed at
// spawn. But understanding routes is the foundation for the
// multi-line topology stages later.

sim.setStrategy("etd");
`,hi={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",configRon:fi,unlockedApi:["setStrategy","shortestRoute","reroute"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:ui,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newRoute)` replaces a rider's route — useful when a stop on their route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."]},gi=`SimConfig(
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
)`,mi=`// Stage 13 — Transfer Points
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
`,yi={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",configRon:gi,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:mi,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."]},bi=`SimConfig(
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
)`,Si=`// Stage 14 — Build a Floor
//
// The building starts five stops tall. Construction "finishes" a
// few minutes in and the player adds the sixth floor:
//
//   const newStop = sim.addStop("F6", 20.0);
//   sim.addStopToLine(line, newStop);
//
// Standard dispatch otherwise.

sim.setStrategy("etd");
`,wi={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",configRon:bi,unlockedApi:["setStrategy","addStop","addStopToLine"],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:Si,hints:["`sim.addStop(name, position)` returns the new stop's ref. The stop is created but not yet part of any line — riders won't go there until you add it to a line.","`sim.addStopToLine(lineRef, stopRef)` registers the new stop on the line so dispatch can route to it. Call it once construction is done.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."]},vi=`SimConfig(
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
)`,ki=`// Stage 15 — Sky Lobby
//
// Three cars over nine stops. The Sky stop bridges the low and
// high halves of the building. A natural split: Low car serves
// the bottom half, High car serves the top half, Floater fills in.
//
// assignLineToGroup(lineRef, groupRef) puts a line under a group's
// dispatcher; reassignElevatorToLine(carRef, lineRef) moves a car.
//
// The default config has everything on one group. ETD does fine.
// Beating 22s average wait needs an explicit group split.

sim.setStrategy("etd");
`,_i={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",configRon:vi,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:ki,hints:["`sim.assignLineToGroup(lineRef, groupRef)` puts a line under a group's dispatcher. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."]},bt=[qo,Ho,Uo,jo,Yo,Qo,Zo,ni,ri,li,pi,hi,yi,wi,_i];function Ci(e){return bt.find(t=>t.id===e)}async function Ti(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await Fo({configRon:e.configRon,strategy:"scan"});try{const l={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(l.timeoutMs=n.timeoutMs),await r.loadController(t,l);let s=null,a=0;for(;a<o;){const c=o-a,u=Math.min(i,c),p=await r.tick(u);s=p.metrics,a=p.tick;const d=Gt(s,a);if(e.passFn(d))return Ut(e,d)}if(s===null)throw new Error("runStage: maxTicks must be positive");return Ut(e,Gt(s,a))}finally{r.dispose()}}function Gt(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function Ut(e,t){if(!e.passFn(t))return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}const Pn=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef): void",description:"Keep the car's doors open past the configured cycle until cancelDoorHold."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, route): boolean",description:"Replace a rider's route. Useful when a stop on their route was removed."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(name, position): bigint",description:"Create a new stop. Returns the new stop's ref. Add to a line before dispatch will use it."},{name:"addStopToLine",signature:"addStopToLine(lineRef, stopRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupRef): void",description:"Put a line under a group's dispatcher. Two groups means two independent dispatch passes."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(Pn.map(e=>[e.name,e]));function Ln(e){const t=new Set(e);return Pn.filter(n=>t.has(n.name))}function Ei(){const e=document.getElementById("quest-api-panel");if(!e)throw new Error("api-panel: missing #quest-api-panel");return{root:e}}function zt(e,t){for(;e.root.firstChild;)e.root.removeChild(e.root.firstChild);const n=Ln(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const o=document.createElement("p");o.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",o.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(o);const i=document.createElement("ul");i.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const l=document.createElement("li");l.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const s=document.createElement("code");s.className="block font-mono text-[12px] text-content",s.textContent=r.signature,l.appendChild(s);const a=document.createElement("p");a.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",a.textContent=r.description,l.appendChild(a),i.appendChild(l)}e.root.appendChild(i)}function Ii(){const e=document.getElementById("quest-hints"),t=document.getElementById("quest-hints-count"),n=document.getElementById("quest-hints-list");if(!e||!t||!n)throw new Error("hints-drawer: missing DOM anchors");return{root:e,count:t,list:n}}function jt(e,t){for(;e.list.firstChild;)e.list.removeChild(e.list.firstChild);const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}e.count.textContent=`(${n})`;for(const o of t.hints){const i=document.createElement("li");i.className="text-content-secondary leading-snug marker:text-content-tertiary",i.textContent=o,e.list.appendChild(i)}e.root.removeAttribute("open")}function Ri(){const e=document.getElementById("quest-results-modal"),t=document.getElementById("quest-results-title"),n=document.getElementById("quest-results-stars"),o=document.getElementById("quest-results-detail"),i=document.getElementById("quest-results-close"),r=document.getElementById("quest-results-retry");if(!e||!t||!n||!o||!i||!r)throw new Error("results-modal: missing DOM anchors");return{root:e,title:t,stars:n,detail:o,close:i,retry:r}}function Ai(e,t,n){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=xi(t.grade,t.passed),e.retry.onclick=()=>{Xt(e),n()},e.close.onclick=()=>{Xt(e)},e.root.classList.add("show"),e.close.focus()}function Xt(e){e.root.classList.remove("show")}function xi(e,t){const n=`tick ${e.endTick}`,o=`${e.delivered} delivered, ${e.abandoned} abandoned`;return t?`${o} · finished by ${n}.`:`${o}. The pass condition wasn't met within the run budget.`}const Mi={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, [0n, 4n]);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop("F6", 20.0);',addStopToLine:"sim.addStopToLine(/* lineRef */, /* stopRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupRef */);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function Yt(e){return Mi[e]??`sim.${e}();`}function Pi(){const e=document.getElementById("quest-snippets");if(!e)throw new Error("snippet-picker: missing #quest-snippets");return{root:e}}function Vt(e,t,n){for(;e.root.firstChild;)e.root.removeChild(e.root.firstChild);const o=Ln(t.unlockedApi);if(o.length!==0)for(const i of o){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=i.name,r.title=`Insert: ${Yt(i.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(Yt(i.name))}),e.root.appendChild(r)}}function Li(){const e=document.getElementById("quest-pane");if(!e)throw new Error("quest-pane: missing #quest-pane");const t=document.getElementById("quest-stage-title"),n=document.getElementById("quest-stage-brief"),o=document.getElementById("quest-stage-select"),i=document.getElementById("quest-editor"),r=document.getElementById("quest-run"),l=document.getElementById("quest-result");if(!t||!n||!o||!i||!r||!l)throw new Error("quest-pane: missing stage banner elements");return{root:e,title:t,brief:n,select:o,editorHost:i,runBtn:r,result:l}}function Kt(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief,e.select.value!==t.id&&(e.select.value=t.id)}function Fi(e){for(;e.select.firstChild;)e.select.removeChild(e.select.firstChild);bt.forEach((t,n)=>{const o=document.createElement("option");o.value=t.id,o.textContent=`${String(n+1).padStart(2,"0")} · ${t.title}`,e.select.appendChild(o)})}function Bi(e){const t=document.getElementById("layout");t&&t.classList.add("hidden"),e.root.classList.remove("hidden"),e.root.classList.add("flex")}function $i(e,t,n,o){const i=()=>{Oi(e,t,n,o(),i)};e.runBtn.addEventListener("click",i)}async function Oi(e,t,n,o,i){e.runBtn.disabled=!0,e.result.textContent="Running…";try{const r=await Ti(o,n.getValue(),{timeoutMs:1e3});e.result.textContent="",Ai(t,r,i)}catch(r){const l=r instanceof Error?r.message:String(r);e.result.textContent=`Error: ${l}`}finally{e.runBtn.disabled=!1}}async function Di(e){const t=Li();Fi(t);const n=c=>{const u=Ci(c);if(u)return u;const p=bt[0];if(!p)throw new Error("quest-pane: stage registry is empty");return p};let o=n(e.initialStageId);Kt(t,o),Bi(t);const i=Ei();zt(i,o);const r=Ii();jt(r,o),t.runBtn.disabled=!0,t.result.textContent="Loading editor…";const l=await Do({container:t.editorHost,initialValue:o.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.result.textContent="";const s=Ri();$i(t,s,l,()=>o);const a=Pi();return Vt(a,o,l),t.select.addEventListener("change",()=>{const c=n(t.select.value);o=c,Kt(t,c),zt(i,c),jt(r,c),Vt(a,c,l),l.setValue(c.starterCode),t.result.textContent="",e.onStageChange?.(c.id)}),{handles:t,editor:l}}let Je=null;async function Fn(){if(!Je){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;Je=import(e).then(async n=>(await n.default(t),n))}return Je}class St{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,o){const i=await Fn();return new St(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class Bn{#e;#t=0;#n=[];#i=0;#r=0;#s=1;#d=0;constructor(t){this.#e=Wi(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#i=t.reduce((n,o)=>n+o.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#s=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const o=t.stops.filter(s=>s.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#s/60*i,this.#r=(this.#r+i)%(this.#i||1);const l=[];for(;this.#t>=1;)this.#t-=1,l.push(this.#a(o,r));return l}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,o]of this.#n.entries())if(t-=o.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#i<=0?0:Math.min(1,this.#r/this.#i)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#n}#a(t,n){const o=this.#o(t.length,n.originWeights);let i=this.#o(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],l=t[i];if(!r||!l)throw new Error("stop index out of bounds");const s=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:l.stop_id,weight:s,...this.#d>0?{patienceTicks:this.#d}:{}}}#o(t,n){if(!n||n.length!==t)return this.#c(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#c(t);let i=this.#p()*o;for(const[r,l]of n.entries())if(i-=Math.max(0,l),i<0)return r;return t-1}#l(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#c(t){return Number(this.#l()%BigInt(t))}#p(){return Number(this.#l()>>11n)/2**53}}function Wi(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}function qe(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,l=o&255,s=a=>t>=0?Math.round(a+(255-a)*t):Math.round(a*(1+t));return`rgb(${s(i)}, ${s(r)}, ${s(l)})`}function wt(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,l=o&255;return`rgba(${i}, ${r}, ${l}, ${t})`}function $n(e,t){if(/^#[0-9a-f]{6}$/i.test(e)){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return wt(e,t)}function qi(e,t,n,o,i){const r=(e+n)/2,l=(t+o)/2,s=n-e,a=o-t,c=Math.max(Math.hypot(s,a),1),u=-a/c,p=s/c,d=Math.min(c*.25,22),f=r+u*d,h=l+p*d,m=1-i;return[m*m*e+2*m*i*f+i*i*n,m*m*t+2*m*i*h+i*i*o]}function Ni(e){let r=e;for(let s=0;s<3;s++){const a=1-r,c=3*a*a*r*.2+3*a*r*r*.2+r*r*r,u=3*a*a*.2+6*a*r*(.2-.2)+3*r*r*(1-.2);if(u===0)break;r-=(c-e)/u,r=Math.max(0,Math.min(1,r))}const l=1-r;return 3*l*l*r*.6+3*l*r*r*1+r*r*r}const vt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},Hi="#2a2a35",Gi="#a1a1aa",Ui=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],zi=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],ji="rgba(8, 10, 14, 0.55)",Xi="#3a3a45",Yi=[1,1,.5,.42],Vi=["LOW","HIGH","VIP","SERVICE"],Ki="#e6c56b",Qi="#9bd4c4",Ji=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],Zi="#a1a1aa",er="#4a4a55",tr="#f59e0b",On="#7dd3fc",Dn="#fda4af",Ze="#fafafa",Wn="#8b8c92",qn="rgba(250, 250, 250, 0.95)",nr=260,Qt=3,or=.05,Jt=["standard","briefcase","bag","short","tall"];function ae(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,Jt[n%Jt.length]??"standard"}function ir(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function Nn(e,t,n,o,i,r="standard"){const l=ir(r,o),a=n-.5,c=a-l.bodyH,u=c-l.neckGap-l.headR,p=l.bodyH*.08,d=a-l.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-l.shoulderW/2,c+p),e.lineTo(t-l.shoulderW/2+p,c),e.lineTo(t+l.shoulderW/2-p,c),e.lineTo(t+l.shoulderW/2,c+p),e.lineTo(t+l.waistW/2,d),e.lineTo(t+l.footW/2,a),e.lineTo(t-l.footW/2,a),e.lineTo(t-l.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,u,l.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const f=Math.max(1.6,l.headR*.9),h=t+l.waistW/2+f*.1,m=a-f-.5;e.fillRect(h,m,f,f);const b=f*.55;e.fillRect(h+(f-b)/2,m-1,b,1)}else if(r==="bag"){const f=Math.max(1.3,l.headR*.9),h=t-l.shoulderW/2-f*.35,m=c+l.bodyH*.35;e.beginPath(),e.arc(h,m,f,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(h+f*.2,m-f*.8),e.lineTo(t+l.shoulderW/2-p,c+.5),e.stroke()}else if(r==="tall"){const f=l.headR*2.1,h=Math.max(1,l.headR*.45);e.fillRect(t-f/2,u-l.headR-h+.4,f,h)}}function rr(e,t,n,o,i,r,l,s,a){const u=Math.max(1,Math.floor((i-14)/s.figureStride)),p=Math.min(r,u),d=-2;for(let f=0;f<p;f++){const h=t+d+o*f*s.figureStride,m=f+0,b=ae(a,m);Nn(e,h,n,s.figureHeadR,l,b)}if(r>p){e.fillStyle=Wn,e.font=`${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const f=t+d+o*p*s.figureStride;e.fillText(`+${r-p}`,f,n-1)}}function X(e,t,n,o,i,r){const l=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,l);return}e.moveTo(t+l,n),e.lineTo(t+o-l,n),e.quadraticCurveTo(t+o,n,t+o,n+l),e.lineTo(t+o,n+i-l),e.quadraticCurveTo(t+o,n+i,t+o-l,n+i),e.lineTo(t+l,n+i),e.quadraticCurveTo(t,n+i,t,n+i-l),e.lineTo(t,n+l),e.quadraticCurveTo(t,n,t+l,n),e.closePath()}function sr(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const l=i+r+1>>1;e.measureText(t.slice(0,l)+o).width<=n?i=l:r=l-1}return i===0?o:t.slice(0,i)+o}function ar(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function lr(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,l=Math.max(n.fontSmall+.5,i);for(const s of t){const a=s.top-3,c=a>i&&a-n.fontSmall<r;e.fillStyle=s.color,e.fillText(s.text,s.cx,c?l:a)}}function cr(e,t,n,o,i,r,l,s,a){e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";const c=o.padX,u=o.padX+o.labelW,p=r-o.padX,d=o.shaftInnerW/2,f=Math.min(o.shaftInnerW*1.8,(p-u)/2),h=[...t.stops].sort((m,b)=>m.y-b.y);for(let m=0;m<h.length;m++){const b=h[m];if(b===void 0)continue;const v=n(b.y),_=h[m+1],E=_!==void 0?n(_.y):s;if(e.strokeStyle=Hi,e.lineWidth=a?2:1,e.beginPath(),a)for(const g of i)e.moveTo(g-f,v+.5),e.lineTo(g+f,v+.5);else{let g=u;for(const w of i){const S=w-d,C=w+d;S>g&&(e.moveTo(g,v+.5),e.lineTo(S,v+.5)),g=C}g<p&&(e.moveTo(g,v+.5),e.lineTo(p,v+.5))}e.stroke();for(let g=0;g<i.length;g++){const w=i[g];if(w===void 0)continue;const S=l.has(`${g}:${b.entity_id}`);e.strokeStyle=S?tr:er,e.lineWidth=S?1.4:1,e.beginPath(),e.moveTo(w-d-2,v+.5),e.lineTo(w-d,v+.5),e.moveTo(w+d,v+.5),e.lineTo(w+d+2,v+.5),e.stroke()}const y=a?v:(v+E)/2;e.fillStyle=Gi,e.textAlign="right",e.fillText(sr(e,b.name,o.labelW-4),c+o.labelW-4,y)}}function dr(e,t,n,o,i,r){for(const l of t.stops){if(l.waiting_by_line.length===0)continue;const s=r.get(l.entity_id);if(s===void 0||s.size===0)continue;const a=n(l.y),c=l.waiting_up>=l.waiting_down?On:Dn;for(const u of l.waiting_by_line){if(u.count===0)continue;const p=s.get(u.line);if(p===void 0)continue;const d=i.get(p);if(d===void 0)continue;const f=d.end-d.start;f<=o.figureStride||rr(e,d.end-2,a,-1,f,u.count,c,o,l.entity_id)}}}function pr(e,t,n,o,i,r,l,s,a,c=!1){const u=o*.22,p=(i-4)/10.5,d=Math.max(1.2,Math.min(s.figureHeadR,u,p)),f=s.figureStride*(d/s.figureHeadR),h=3,m=2,b=o-h*2,_=Math.max(1,Math.floor((b-16)/f)),E=Math.min(r,_),y=E*f,g=t-y/2+f/2,w=n-m;for(let S=0;S<E;S++){const C=a?.[S]??ae(0,S);Nn(e,g+S*f,w,d,l,C)}if(r>E){const S=`+${r-E}`,C=Math.max(8,s.fontSmall-1);e.font=`700 ${C.toFixed(1)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="middle";const A=e.measureText(S).width,R=3,T=1.5,I=Math.ceil(A+R*2),x=Math.ceil(C+T*2),M=t+o/2-2,O=n-i+2,L=M-I;e.fillStyle="rgba(15, 15, 18, 0.85)",X(e,L,O,I,x,2),e.fill(),e.fillStyle="#fafafa",e.fillText(S,M-R,O+x/2)}if(c){const S=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${S.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="center",e.textBaseline="middle";const C=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,C+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,C)}}function fr(e,t,n,o,i,r,l){const s=Math.max(2,r.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const c=l.get(a.target);if(c===void 0)continue;const u=t.stops[c];if(u===void 0)continue;const p=n.get(a.id);if(p===void 0)continue;const d=i(u.y)-r.carH/2,f=i(a.y)-r.carH/2;Math.abs(f-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(p,f),e.lineTo(p,d),e.stroke(),e.fillStyle=qn,e.beginPath(),e.arc(p,d,s,0,Math.PI*2),e.fill())}}function ur(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const l=vt[t.phase]??"#6b6b75",s=o/2;for(let a=1;a<=Qt;a++){const c=r(t.y-t.v*or*a),u=.18*(1-(a-1)/Qt);e.fillStyle=wt(l,u),e.fillRect(n-s,c-i,o,i)}}function hr(e,t,n,o,i,r,l,s,a){const c=l(t.y),u=c-i,p=o/2,d=vt[t.phase]??"#6b6b75",f=e.createLinearGradient(n,u,n,c);f.addColorStop(0,qe(d,.14)),f.addColorStop(1,qe(d,-.18)),e.fillStyle=f,e.fillRect(n-p,u,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-p+.5,u+.5,o-1,i-1);const h=t.capacity>0&&t.load>=t.capacity*.95;(t.riders>0||h)&&pr(e,n,c,o,i,t.riders,r,s,a,h)}function gr(e,t,n,o,i,r,l,s){const h=`600 ${r.fontSmall+.5}px system-ui, -apple-system, "Segoe UI", sans-serif`;e.font=h,e.textBaseline="middle";const m=.3,b=performance.now(),v=t,_=[];for(const y of n.cars){const g=l.get(y.id);if(!g)continue;const w=o.get(y.id);if(w===void 0)continue;const S=i(y.y),C=S-r.carH,A=Math.max(1,g.expiresAt-g.bornAt),R=g.expiresAt-b,T=R>A*m?1:Math.max(0,R/(A*m));if(T<=0)continue;const x=e.measureText(g.text).width+14,M=r.fontSmall+8+2,O=C-2-4-M,L=S+2+4+M>s,z=O<2&&!L?"below":"above",ve=z==="above"?C-2-4-M:S+2+4;let D=w-x/2;const ke=2,_e=s-x-2;D<ke&&(D=ke),D>_e&&(D=_e),_.push({bubble:g,alpha:T,cx:w,carTop:C,carBottom:S,bubbleW:x,bubbleH:M,side:z,bx:D,by:ve})}const E=(y,g)=>!(y.bx+y.bubbleW<=g.bx||g.bx+g.bubbleW<=y.bx||y.by+y.bubbleH<=g.by||g.by+g.bubbleH<=y.by);for(let y=1;y<_.length;y++){const g=_[y];if(g===void 0)continue;let w=!1;for(let T=0;T<y;T++){const I=_[T];if(I!==void 0&&E(g,I)){w=!0;break}}if(!w)continue;const S=g.side==="above"?"below":"above",C=S==="above"?g.carTop-2-4-g.bubbleH:g.carBottom+2+4,A={...g,side:S,by:C};let R=!0;for(let T=0;T<y;T++){const I=_[T];if(I!==void 0&&E(A,I)){R=!1;break}}R&&(_[y]=A)}for(const y of _){const{bubble:g,alpha:w,cx:S,carTop:C,carBottom:A,bubbleW:R,bubbleH:T,side:I,bx:x,by:M}=y,O=I==="above"?C-2:A+2,L=I==="above"?M+T:M,z=Math.min(Math.max(S,x+6+5/2),x+R-6-5/2);e.save(),e.globalAlpha=w,e.shadowColor=v,e.shadowBlur=8,e.fillStyle="rgba(16, 19, 26, 0.94)",X(e,x,M,R,T,6),e.fill(),e.shadowBlur=0,e.strokeStyle=$n(v,.65),e.lineWidth=1,X(e,x,M,R,T,6),e.stroke(),e.beginPath(),e.moveTo(z-5/2,L),e.lineTo(z+5/2,L),e.lineTo(z,O),e.closePath(),e.fillStyle="rgba(16, 19, 26, 0.94)",e.fill(),e.stroke(),e.fillStyle="#f0f3fb",e.textAlign="center",e.fillText(g.text,x+R/2,M+T/2),e.restore()}}function mr(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function yr(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:Ue(o)})}return t}function Ue(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function Hn(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function br(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function Sr(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function wr(e,t,n,o,i,r){const l=Math.abs(t-e);if(l<.001)return 0;const s=Math.abs(n);if(s*s/(2*r)>=l)return s>0?s/r:0;const c=Math.max(0,(o-s)/i),u=s*c+.5*i*c*c,p=o/r,d=o*o/(2*r);if(u+d>=l){const h=(2*i*r*l+r*s*s)/(i+r),m=Math.sqrt(Math.max(h,s*s));return(m-s)/i+m/r}const f=l-u-d;return c+f/Math.max(o,.001)+p}const Gn={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},Ne={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function vr(e,t,n,o,i,r){const l=i/2,s=o-r/2,a=vt[t.phase]??"#6b6b75",c=e.createLinearGradient(n,s,n,s+r);c.addColorStop(0,qe(a,.14)),c.addColorStop(1,qe(a,-.18)),e.fillStyle=c,X(e,n-l,s,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-l+2,s+r*.36,i-4,Math.max(1.5,r*.1))}function kr(e,t,n,o,i){if(t.length===0)return;const r=7,l=4,s=i.fontSmall+2,a=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;const c=(d,f)=>{const h=[d.carName,Ue(d.altitudeM),Hn(d.velocity),`${Gn[d.phase]} · ${d.layer}`];let m=0;for(const y of h)m=Math.max(m,e.measureText(y).width);const b=m+r*2,v=h.length*s+l*2;let _=f==="right"?d.cx+a:d.cx-a-b;_=Math.max(2,Math.min(o-b-2,_));const E=d.cy-v/2;return{hud:d,lines:h,bx:_,by:E,bubbleW:b,bubbleH:v,side:f}},u=(d,f)=>!(d.bx+d.bubbleW<=f.bx||f.bx+f.bubbleW<=d.bx||d.by+d.bubbleH<=f.by||f.by+f.bubbleH<=d.by),p=[];t.forEach((d,f)=>{let h=c(d,f%2===0?"right":"left");if(p.some(m=>u(h,m))){const m=c(d,h.side==="right"?"left":"right");if(p.every(b=>!u(m,b)))h=m;else{const b=Math.max(...p.map(v=>v.by+v.bubbleH));h={...h,by:b+4}}}p.push(h)});for(const d of p){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",X(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=Ne[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,X(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let f=0;f<d.lines.length;f++){const h=d.by+l+s*f+s/2,m=d.lines[f]??"";e.fillStyle=f===0||f===3?Ne[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(m,d.bx+r,h)}e.restore()}}function _r(e,t,n,o,i,r){if(t.length===0)return;const l=18,s=10,a=6,c=5,u=r.fontSmall+2.5,d=a*2+5*u,f=l+a+(d+c)*t.length;e.save();const h=e.createLinearGradient(n,i,n,i+f);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,X(e,n,i,o,f,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,X(e,n,i,o,f,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+s,i+l/2+2);let m=i+l+a;for(const b of t){e.fillStyle="rgba(15, 15, 18, 0.55)",X(e,n+6,m,o-12,d,5),e.fill(),e.fillStyle=Ne[b.phase],e.fillRect(n+6,m,2,d);const v=n+s+4,_=n+o-s;let E=m+a+u/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(b.carName,v,E),e.textAlign="right",e.fillStyle=Ne[b.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(Gn[b.phase].toUpperCase(),_,E);const y=b.etaSeconds!==void 0&&Number.isFinite(b.etaSeconds)?Sr(b.etaSeconds):"—",g=[["Altitude",Ue(b.altitudeM)],["Velocity",Hn(b.velocity)],["Dest",b.destinationName??"—"],["ETA",y]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;for(const[w,S]of g)E+=u,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(w,v,E),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(S,_,E);m+=d+c}e.restore()}function Cr(e,t,n,o,i,r,l){return[...e.cars].sort((a,c)=>a.id-c.id).map((a,c)=>{const u=a.y,p=a.target!==void 0?e.stops.find(f=>f.entity_id===a.target):void 0,d=p?wr(u,p.y,a.v,i,r,l):void 0;return{cx:n,cy:t.toScreenAlt(u),altitudeM:u,velocity:a.v,phase:br(a.v,o.get(a.id)??0,i),layer:mr(u),carName:`Climber ${String.fromCharCode(65+c)}`,destinationName:p?.name,etaSeconds:d}})}const pe=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function et(e,t,n){return e+(t-e)*n}function tt(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round(et(o>>16&255,i>>16&255,n)),l=Math.round(et(o>>8&255,i>>8&255,n)),s=Math.round(et(o&255,i&255,n));return`#${(r<<16|l<<8|s).toString(16).padStart(6,"0")}`}function Tr(e,t){let n=0;for(;n<pe.length-1;n++){const c=pe[n+1];if(c===void 0||e<=c[0])break}const o=pe[n],i=pe[Math.min(n+1,pe.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],l=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),s=tt(o[1],i[1],l),a=tt(o[2],i[2],l);return tt(s,a,t)}const Er=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function Ir(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),l=Math.log10(1+t.axisMaxM/1e3),s=[0,.05,.15,.35,.6,1];for(const c of s){const u=1e3*(10**(c*l)-1);r.addColorStop(c,Tr(u,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const c of Er){const u=t.axisMaxM*c.altFrac;if(u<8e4)continue;const p=t.toScreenAlt(u),d=n+c.xFrac*(o-n),f=c.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${f.toFixed(3)})`,e.beginPath(),e.arc(d,p,c.size,0,Math.PI*2),e.fill()}e.restore();const a=yr(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const c of a){const u=t.toScreenAlt(c.altitudeM);u<t.shaftTop||u>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,u),e.lineTo(o,u),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(c.label,n+4,u-6))}}function Rr(e,t,n,o){const r=o-28,l=e.createLinearGradient(0,r,0,o);l.addColorStop(0,"rgba(0,0,0,0)"),l.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),l.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=l,e.fillRect(t,r,n-t,28),e.strokeStyle=$n("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function Ar(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function xr(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const l=-Math.PI/2+r*Math.PI/3,s=t+Math.cos(l)*i,a=n+Math.sin(l)*i;r===0?e.moveTo(s,a):e.lineTo(s,a)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function Mr(e,t,n,o,i,r,l){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const s of t.stops){const a=n.toScreenAlt(s.y);if(a<n.shaftTop||a>n.shaftBottom)continue;const c=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-c/2,a),e.lineTo(o-5,a),e.moveTo(o+5,a),e.lineTo(o+c/2,a),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-c/2,a),e.lineTo(o-5,a-5),e.moveTo(o+c/2,a),e.lineTo(o+5,a-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(s.name,r+l-4,a-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(Ue(s.y),r+l-4,a+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function Pr(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const l=Math.log10(1+Math.max(0,r)/1e3),s=i<=0?0:Math.max(0,Math.min(1,l/i));return t-s*(t-e)}}}function Lr(e,t,n,o,i,r,l){const s=Math.max(2,l.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const c=r.get(a.target);if(c===void 0)continue;const u=t.stops[c];if(u===void 0)continue;const p=i.get(a.id);if(p===void 0)continue;const d=n.toScreenAlt(u.y);Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,p),e.lineTo(o,d),e.stroke(),e.fillStyle=qn,e.beginPath(),e.arc(o,d,s,0,Math.PI*2),e.fill())}}function Fr(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function Br(e,t,n,o,i,r,l){l.firstDrawAt===0&&(l.firstDrawAt=performance.now());const s=(performance.now()-l.firstDrawAt)/1e3,a=r.showDayNight?Fr(s):.5,c=n>=520&&o>=360,u=Math.min(120,Math.max(72,n*.16)),p=c?Math.min(220,Math.max(160,n*.24)):0,d=c?14:0,f=i.padX,h=f+u+4,m=n-i.padX-p-d,b=(h+m)/2,v=12,_=i.padTop+24,E=o-i.padBottom-18,y=Pr(_,E,r);Ir(e,y,h+v,m-v,a),Rr(e,h+v,m-v,E),Ar(e,b,y),xr(e,b,y.shaftTop,i),Mr(e,t,y,b,i,f,u);const g=Math.max(20,Math.min(34,m-h-8)),w=Math.max(16,Math.min(26,g*.72));i.carH=w,i.carW=g;const S=new Map,C=new Map;t.stops.forEach((T,I)=>C.set(T.entity_id,I));for(const T of t.cars)S.set(T.id,y.toScreenAlt(T.y));Lr(e,t,y,b,S,C,i);for(const T of t.cars){const I=S.get(T.id);I!==void 0&&vr(e,T,b,I,g,w)}const R=[...Cr(t,y,b,l.prevVelocity,l.maxSpeed,l.acceleration,l.deceleration)].sort((T,I)=>I.altitudeM-T.altitudeM);kr(e,R,g,n-p-d,i),c&&_r(e,R,n-i.padX-p,p,_,i);for(const T of t.cars)l.prevVelocity.set(T.id,T.v);if(l.prevVelocity.size>t.cars.length){const T=new Set(t.cars.map(I=>I.id));for(const I of l.prevVelocity.keys())T.has(I)||l.prevVelocity.delete(I)}}function $r(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function Zt(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}class Or{#e;#t;#n=window.devicePixelRatio||1;#i;#r=null;#s=-1;#d=new Map;#a;#o=new Map;#l=new Map;#c=[];#p=null;#g=new Map;#m=1;#y=1;#b=1;#u=0;#f=new Map;constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#t=o,this.#a=n,this.#h(),this.#i=()=>{this.#h()},window.addEventListener("resize",this.#i)}dispose(){window.removeEventListener("resize",this.#i)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#g.clear(),this.#u=0,this.#f.clear()}setTetherPhysics(t,n,o){Number.isFinite(t)&&t>0&&(this.#m=t),Number.isFinite(n)&&n>0&&(this.#y=n),Number.isFinite(o)&&o>0&&(this.#b=o)}pushAssignment(t,n,o){let i=this.#f.get(t);i===void 0&&(i=new Map,this.#f.set(t,i)),i.set(o,n)}#h(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#n,i=n*this.#n;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}draw(t,n,o){this.#h();const{clientWidth:i,clientHeight:r}=this.#e,l=this.#t;if(l.clearRect(0,0,i,r),t.stops.length===0||i===0||r===0)return;i!==this.#s&&(this.#r=$r(i),this.#s=i);const s=this.#r;if(s===null)return;if(this.#p!==null){this.#S(t,i,r,s,n,o,this.#p);return}const a=t.stops.length===2,c=t.stops[0];if(c===void 0)return;let u=c.y,p=c.y;for(let k=1;k<t.stops.length;k++){const P=t.stops[k];if(P===void 0)continue;const F=P.y;F<u&&(u=F),F>p&&(p=F)}const d=t.stops.map(k=>k.y).sort((k,P)=>k-P),f=d.length>=3?(d.at(-1)??0)-(d.at(-2)??0):1,m=u-1,b=p+f,v=Math.max(b-m,1e-4),_=a?18:0;let E,y;if(a)E=s.padTop+_,y=r-s.padBottom-_;else{const k=[];for(let ne=1;ne<d.length;ne++){const Ce=d[ne],Te=d[ne-1];if(Ce===void 0||Te===void 0)continue;const K=Ce-Te;K>0&&k.push(K)}const B=48/(k.length>0?Math.min(...k):1),j=Math.max(0,r-s.padTop-s.padBottom)/v,Y=Math.min(j,B),te=v*Y;y=r-s.padBottom,E=y-te}const g=k=>y-(k-m)/v*(y-E),w=this.#d;w.forEach(k=>k.length=0);for(const k of t.cars){const P=w.get(k.line);P?P.push(k):w.set(k.line,[k])}const S=[...w.keys()].sort((k,P)=>k-P),C=S.reduce((k,P)=>k+(w.get(P)?.length??0),0),A=Math.max(0,i-2*s.padX-s.labelW),R=s.figureStride*2,T=s.shaftSpacing*Math.max(C-1,0),x=(A-T)/Math.max(C,1),M=a?34:s.maxShaftInnerW,L=Math.max(s.minShaftInnerW,Math.min(M,x*.55)),z=Math.max(0,Math.min(x-L,R+s.figureStride*4)),ve=Math.max(14,L-6);let D=1/0;if(t.stops.length>=2)for(let k=1;k<d.length;k++){const P=d[k-1],F=d[k];if(P===void 0||F===void 0)continue;const B=g(P)-g(F);B>0&&B<D&&(D=B)}const ke=g(p)-2,_e=Number.isFinite(D)?D:s.carH,eo=a?s.carH:_e,to=Math.max(14,Math.min(eo,ke));if(!a&&Number.isFinite(D)){const k=Math.max(1.5,Math.min(D*.067,4)),P=s.figureStride*(k/s.figureHeadR);s.figureHeadR=k,s.figureStride=P}s.shaftInnerW=L,s.carW=ve,s.carH=to;const no=s.padX+s.labelW,oo=L+z,Xe=[],de=new Map,Ye=new Map;let _t=0;for(const k of S){const P=w.get(k)??[];for(const F of P){const B=no+_t*(oo+s.shaftSpacing),N=B,j=B+z,Y=j+L/2;Xe.push(Y),de.set(F.id,Y),Ye.set(F.id,{start:N,end:j}),_t++}}const Ct=new Map;t.stops.forEach((k,P)=>Ct.set(k.entity_id,P));const Tt=new Set;{let k=0;for(const P of S){const F=w.get(P)??[];for(const B of F){if(B.phase==="loading"||B.phase==="door-opening"||B.phase==="door-closing"){const N=Zt(t.stops,B.y);N!==void 0&&N.dist<.5&&Tt.add(`${k}:${N.stop.entity_id}`)}k++}}}const Et=new Map,It=new Map,Rt=new Map,At=new Map,xt=[],Mt=[];let Pt=0;for(let k=0;k<S.length;k++){const P=S[k];if(P===void 0)continue;const F=w.get(P)??[],B=Ui[k]??ji,N=zi[k]??Xi,j=Yi[k]??1,Y=Ji[k]??Zi,te=Math.max(14,L*j),ne=Math.max(10,ve*j),Ce=Math.max(10,s.carH),Te=k===2?Ki:k===3?Qi:Ze;let K=1/0,Ve=-1/0,Ee=1/0;for(const V of F){Et.set(V.id,te),It.set(V.id,ne),Rt.set(V.id,Ce),At.set(V.id,Te);const oe=Xe[Pt];if(oe===void 0)continue;const Lt=Number.isFinite(V.min_served_y)&&Number.isFinite(V.max_served_y),Ke=Lt?Math.max(E,g(V.max_served_y)-s.carH-2):E,io=Lt?Math.min(y,g(V.min_served_y)+2):y;xt.push({cx:oe,top:Ke,bottom:io,fill:B,frame:N,width:te}),oe<K&&(K=oe),oe>Ve&&(Ve=oe),Ke<Ee&&(Ee=Ke),Pt++}S.length>1&&Number.isFinite(K)&&Number.isFinite(Ee)&&Mt.push({cx:(K+Ve)/2,top:Ee,text:Vi[k]??`Line ${k+1}`,color:Y})}ar(l,xt),lr(l,Mt,s),cr(l,t,g,s,Xe,i,Tt,E,a),dr(l,t,g,s,Ye,this.#f),fr(l,t,de,Et,g,s,Ct);for(const[k,P]of de){const F=t.cars.find(te=>te.id===k);if(!F)continue;const B=It.get(k)??s.carW,N=Rt.get(k)??s.carH,j=At.get(k)??Ze,Y=this.#o.get(k);ur(l,F,P,B,N,g),hr(l,F,P,B,N,j,g,s,Y?.roster)}this.#w(t,de,Ye,g,s,n),this.#v(s),o&&o.size>0&&gr(l,this.#a,t,de,g,s,o,i)}#S(t,n,o,i,r,l,s){const a={prevVelocity:this.#g,maxSpeed:this.#m,acceleration:this.#y,deceleration:this.#b,firstDrawAt:this.#u};Br(this.#t,t,n,o,i,s,a),this.#u=a.firstDrawAt}#w(t,n,o,i,r,l){const s=performance.now(),a=Math.max(1,l),c=nr/a,u=30/a,p=new Map,d=[];for(const f of t.cars){const h=this.#o.get(f.id),m=f.riders,b=n.get(f.id),v=Zt(t.stops,f.y),_=f.phase==="loading"&&v!==void 0&&v.dist<.5?v.stop:void 0;if(h&&b!==void 0&&_!==void 0){const g=m-h.riders;if(g>0&&p.set(_.entity_id,(p.get(_.entity_id)??0)+g),g!==0){const w=i(_.y),S=i(f.y)-r.carH/2,C=Math.min(Math.abs(g),6);if(g>0){const A=_.waiting_up>=_.waiting_down,R=o.get(f.id);let T=b-20;if(R!==void 0){const M=R.start,O=R.end;T=(M+O)/2}const I=A?On:Dn,x=this.#f.get(_.entity_id);x!==void 0&&(x.delete(f.line),x.size===0&&this.#f.delete(_.entity_id));for(let M=0;M<C;M++)d.push(()=>this.#c.push({kind:"board",bornAt:s+M*u,duration:c,startX:T,startY:w,endX:b,endY:S,color:I}))}else for(let A=0;A<C;A++)d.push(()=>this.#c.push({kind:"alight",bornAt:s+A*u,duration:c,startX:b,startY:S,endX:b+18,endY:S+10,color:Ze}))}}const E=h?.roster??[];let y;if(h){const g=m-h.riders;if(y=E.slice(),g>0&&_!==void 0){const S=_.waiting_up>=_.waiting_down?0:1e4;for(let C=0;C<g;C++)y.push(ae(_.entity_id,C+S))}else if(g>0)for(let w=0;w<g;w++)y.push(ae(f.id,y.length+w));else g<0&&y.splice(y.length+g,-g)}else{y=[];for(let g=0;g<m;g++)y.push(ae(f.id,g))}for(;y.length>m;)y.pop();for(;y.length<m;)y.push(ae(f.id,y.length));this.#o.set(f.id,{riders:m,roster:y})}for(const f of t.stops){const h=f.waiting_up+f.waiting_down,m=this.#l.get(f.entity_id);if(m){const b=m.waiting-h,v=p.get(f.entity_id)??0,_=Math.max(0,b-v);if(_>0){const E=i(f.y),y=r.padX+r.labelW+20,g=Math.min(_,4);for(let w=0;w<g;w++)this.#c.push({kind:"abandon",bornAt:s+w*u,duration:c*1.5,startX:y,startY:E,endX:y-26,endY:E-6,color:Wn})}}this.#l.set(f.entity_id,{waiting:h})}for(const f of d)f();for(let f=this.#c.length-1;f>=0;f--){const h=this.#c[f];h!==void 0&&s-h.bornAt>h.duration&&this.#c.splice(f,1)}if(this.#o.size>t.cars.length){const f=new Set(t.cars.map(h=>h.id));for(const h of this.#o.keys())f.has(h)||this.#o.delete(h)}if(this.#l.size>t.stops.length){const f=new Set(t.stops.map(h=>h.entity_id));for(const h of this.#l.keys())f.has(h)||this.#l.delete(h)}}#v(t){const n=performance.now(),o=this.#t;for(const i of this.#c){const r=n-i.bornAt;if(r<0)continue;const l=Math.min(1,Math.max(0,r/i.duration)),s=Ni(l),[a,c]=i.kind==="board"?qi(i.startX,i.startY,i.endX,i.endY,s):[i.startX+(i.endX-i.startX)*s,i.startY+(i.endY-i.startY)*s],u=i.kind==="board"?.9:i.kind==="abandon"?(1-s)**1.5:1-s,p=i.kind==="abandon"?t.carDotR*.85:t.carDotR;o.fillStyle=wt(i.color,u),o.beginPath(),o.arc(a,c,p,0,Math.PI*2),o.fill()}}}const Dr="#7dd3fc",Wr="#fda4af";async function en(e,t,n,o,i){const r=ao(o,i),l=await St.create(r,t,n),s=new Or(e.canvas,e.accent);if(s.setTetherConfig(o.tether??null),o.tether){const c=mt(o,i);s.setTetherPhysics(c.maxSpeed,c.acceleration,c.deceleration)}const a=e.canvas.parentElement;if(a){const c=o.stops.length,p=o.tether?640:Math.max(200,c*16);a.style.setProperty("--shaft-min-h",`${p}px`)}return{strategy:t,sim:l,renderer:s,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function fe(e){e?.sim.dispose(),e?.renderer.dispose()}function lt(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const qr=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],Nr=120;function tn(e,t,n){const o=e.sim.metrics();e.latestMetrics=o;for(const r of qr){const l=e.metricHistory[r];l.push(o[r]),l.length>Nr&&l.shift()}const i=performance.now();for(const[r,l]of e.bubbles)l.expiresAt<=i&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const Hr={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},Gr=1e3;function Ur(e,t,n){const o=performance.now(),i=r=>jr(n,r);for(const r of t){const l=zr(r,i);if(l===null)continue;const s=r.elevator;if(s===void 0)continue;const a=Hr[r.kind]??Gr;e.bubbles.set(s,{text:l,bornAt:o,expiresAt:o+a})}}function zr(e,t){switch(e.kind){case"elevator-assigned":return`› To ${t(e.stop)}`;case"elevator-repositioning":return`↻ Reposition to ${t(e.stop)}`;case"elevator-arrived":return`● At ${t(e.stop)}`;case"door-opened":return"◌ Doors open";case"rider-boarded":return"+ Boarding";case"rider-exited":return`↓ Off at ${t(e.stop)}`;default:return null}}function jr(e,t){return e.stops.find(o=>o.entity_id===t)?.name??`stop #${t}`}const Xr={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function nn(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=Xr[t],e.modeEl.title=t)}function Yr(){const e=s=>{const a=document.getElementById(s);if(!a)throw new Error(`missing element #${s}`);return a},t=s=>document.getElementById(s),n=(s,a)=>({root:e(`pane-${s}`),canvas:e(`shaft-${s}`),name:e(`name-${s}`),mode:e(`mode-${s}`),desc:e(`desc-${s}`),metrics:e(`metrics-${s}`),trigger:e(`strategy-trigger-${s}`),popover:e(`strategy-popover-${s}`),repoTrigger:e(`repo-trigger-${s}`),repoName:e(`repo-name-${s}`),repoPopover:e(`repo-popover-${s}`),accent:a,which:s}),o=s=>{const a=document.querySelector(`.tweak-row[data-key="${s}"]`);if(!a)throw new Error(`missing tweak row for ${s}`);const c=p=>{const d=a.querySelector(p);if(!d)throw new Error(`missing ${p} in tweak row ${s}`);return d},u=p=>a.querySelector(p);return{root:a,value:c(".tweak-value"),defaultV:c(".tweak-default-v"),dec:c(".tweak-dec"),inc:c(".tweak-inc"),reset:c(".tweak-reset"),trackFill:u(".tweak-track-fill"),trackDefault:u(".tweak-track-default"),trackThumb:u(".tweak-track-thumb")}},i={};for(const s of ce)i[s]=o(s);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",Dr),paneB:n("b",Wr)};xo(r);const l=document.getElementById("controls-bar");return l&&new ResizeObserver(([a])=>{if(!a)return;const c=Math.ceil(a.borderBoxSize[0]?.blockSize??a.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${c}px`)}).observe(l),r}function Un(e,t,n,o,i,r,l,s,a){const c=document.createDocumentFragment();for(const u of t){const p=document.createElement("button");p.type="button",p.className="strategy-option",p.setAttribute("role","menuitemradio"),p.setAttribute("aria-checked",u===r?"true":"false"),p.dataset[i]=u;const d=document.createElement("span");d.className="strategy-option-name";const f=document.createElement("span");if(f.className="strategy-option-label",f.textContent=n[u],d.appendChild(f),l&&u===l){const m=document.createElement("span");m.className="strategy-option-sibling",m.textContent=`also in ${s}`,d.appendChild(m)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=o[u],p.append(d,h),p.addEventListener("click",()=>{a(u)}),c.appendChild(p)}e.replaceChildren(c)}function Z(e,t){const n=yt[t],o=An[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function on(e,t,n,o,i){Un(e.repoPopover,Io,yt,An,"reposition",t,n,o,i)}function me(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;on(t.paneA,o,r?i:null,"B",l=>void sn(e,t,"a",l,n)),on(t.paneB,i,r?o:null,"A",l=>void sn(e,t,"b",l,n))}function ct(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function zn(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function dt(e){ct(e.paneA,!1),ct(e.paneB,!1)}function ze(e){ft(e),dt(e)}function rn(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;ze(t),r&&(me(e,t,o),ct(n,!0))})}async function sn(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){dt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},Z(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},Z(t.paneB,o)),H(e.permalink),me(e,t,i),dt(t),await i(),W(t.toast,`${n==="a"?"A":"B"} park: ${yt[o]}`)}function Vr(e){document.addEventListener("click",t=>{if(!jn(e)&&!zn(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;ze(e)}})}function ee(e,t){const n=Ge[t],o=Rn[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function an(e,t,n,o,i){Un(e.popover,Eo,Ge,Rn,"strategy",t,n,o,i)}function ye(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;an(t.paneA,o,r?i:null,"B",l=>void cn(e,t,"a",l,n)),an(t.paneB,i,r?o:null,"A",l=>void cn(e,t,"b",l,n))}function pt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function jn(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function ft(e){pt(e.paneA,!1),pt(e.paneB,!1)}function ln(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;ze(t),r&&(ye(e,t,o),pt(n,!0))})}async function cn(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){ft(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},ee(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},ee(t.paneB,o)),H(e.permalink),ye(e,t,i),ft(t),await i(),W(t.toast,`${n==="a"?"A":"B"}: ${Ge[o]}`)}function dn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function Kr(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function je(e,t,n){let o=!1;for(const i of ce){const r=n.tweakRows[i],l=e.tweakRanges[i],s=J(e,i,t),a=ht(e,i),c=gt(e,i,s);c&&(o=!0),r.value.textContent=dn(i,s),r.defaultV.textContent=dn(i,a),r.dec.disabled=s<=l.min+1e-9,r.inc.disabled=s>=l.max-1e-9,r.root.dataset.overridden=String(c),r.reset.hidden=!c;const u=Math.max(l.max-l.min,1e-9),p=Math.max(0,Math.min(1,(s-l.min)/u)),d=Math.max(0,Math.min(1,(a-l.min)/u));r.trackFill&&(r.trackFill.style.width=`${(p*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(p*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function Xn(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function kt(e,t,n,o){const i=mt(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},l=[e.paneA,e.paneB].filter(a=>a!==null),s=l.every(a=>a.sim.applyPhysicsLive(r));if(s)for(const a of l)a.renderer?.setTetherPhysics(i.maxSpeed,i.acceleration,i.deceleration);je(n,e.permalink.overrides,t),s||o()}function Qr(e,t,n){return Math.min(n,Math.max(t,e))}function Jr(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function Ae(e,t,n,o,i){const r=q(e.permalink.scenario),l=r.tweakRanges[n],s=J(r,n,e.permalink.overrides),a=Qr(s+o*l.step,l.min,l.max),c=Jr(a,l.min,l.step);ts(e,t,n,c,i)}function Zr(e,t,n,o){const i=q(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},H(e.permalink),n==="cars"?(o(),W(t.toast,"Cars reset")):(kt(e,t,i,o),W(t.toast,`${Kr(n)} reset`))}async function es(e,t,n){const o=q(e.permalink.scenario),i=gt(o,"cars",J(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},H(e.permalink),i?await n():kt(e,t,o,n),W(t.toast,"Parameters reset")}function ts(e,t,n,o,i){const r=q(e.permalink.scenario),l={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:wn(r,l)},H(e.permalink),n==="cars"?i():kt(e,t,r,i)}function ns(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function os(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var xe={exports:{}},is=xe.exports,pn;function rs(){return pn||(pn=1,(function(e){(function(t,n,o){function i(a){var c=this,u=s();c.next=function(){var p=2091639*c.s0+c.c*23283064365386963e-26;return c.s0=c.s1,c.s1=c.s2,c.s2=p-(c.c=p|0)},c.c=1,c.s0=u(" "),c.s1=u(" "),c.s2=u(" "),c.s0-=u(a),c.s0<0&&(c.s0+=1),c.s1-=u(a),c.s1<0&&(c.s1+=1),c.s2-=u(a),c.s2<0&&(c.s2+=1),u=null}function r(a,c){return c.c=a.c,c.s0=a.s0,c.s1=a.s1,c.s2=a.s2,c}function l(a,c){var u=new i(a),p=c&&c.state,d=u.next;return d.int32=function(){return u.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,p&&(typeof p=="object"&&r(p,u),d.state=function(){return r(u,{})}),d}function s(){var a=4022871197,c=function(u){u=String(u);for(var p=0;p<u.length;p++){a+=u.charCodeAt(p);var d=.02519603282416938*a;a=d>>>0,d-=a,d*=a,a=d>>>0,d-=a,a+=d*4294967296}return(a>>>0)*23283064365386963e-26};return c}n&&n.exports?n.exports=l:this.alea=l})(is,e)})(xe)),xe.exports}var Me={exports:{}},ss=Me.exports,fn;function as(){return fn||(fn=1,(function(e){(function(t,n,o){function i(s){var a=this,c="";a.x=0,a.y=0,a.z=0,a.w=0,a.next=function(){var p=a.x^a.x<<11;return a.x=a.y,a.y=a.z,a.z=a.w,a.w^=a.w>>>19^p^p>>>8},s===(s|0)?a.x=s:c+=s;for(var u=0;u<c.length+64;u++)a.x^=c.charCodeAt(u)|0,a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a}function l(s,a){var c=new i(s),u=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,f=(c.next()>>>0)/4294967296,h=(d+f)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,u&&(typeof u=="object"&&r(u,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xor128=l})(ss,e)})(Me)),Me.exports}var Pe={exports:{}},ls=Pe.exports,un;function cs(){return un||(un=1,(function(e){(function(t,n,o){function i(s){var a=this,c="";a.next=function(){var p=a.x^a.x>>>2;return a.x=a.y,a.y=a.z,a.z=a.w,a.w=a.v,(a.d=a.d+362437|0)+(a.v=a.v^a.v<<4^(p^p<<1))|0},a.x=0,a.y=0,a.z=0,a.w=0,a.v=0,s===(s|0)?a.x=s:c+=s;for(var u=0;u<c.length+64;u++)a.x^=c.charCodeAt(u)|0,u==c.length&&(a.d=a.x<<10^a.x>>>4),a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a.v=s.v,a.d=s.d,a}function l(s,a){var c=new i(s),u=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,f=(c.next()>>>0)/4294967296,h=(d+f)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,u&&(typeof u=="object"&&r(u,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xorwow=l})(ls,e)})(Pe)),Pe.exports}var Le={exports:{}},ds=Le.exports,hn;function ps(){return hn||(hn=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var u=a.x,p=a.i,d,f;return d=u[p],d^=d>>>7,f=d^d<<24,d=u[p+1&7],f^=d^d>>>10,d=u[p+3&7],f^=d^d>>>3,d=u[p+4&7],f^=d^d<<7,d=u[p+7&7],d=d^d<<13,f^=d^d<<9,u[p]=f,a.i=p+1&7,f};function c(u,p){var d,f=[];if(p===(p|0))f[0]=p;else for(p=""+p,d=0;d<p.length;++d)f[d&7]=f[d&7]<<15^p.charCodeAt(d)+f[d+1&7]<<13;for(;f.length<8;)f.push(0);for(d=0;d<8&&f[d]===0;++d);for(d==8?f[7]=-1:f[d],u.x=f,u.i=0,d=256;d>0;--d)u.next()}c(a,s)}function r(s,a){return a.x=s.x.slice(),a.i=s.i,a}function l(s,a){s==null&&(s=+new Date);var c=new i(s),u=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,f=(c.next()>>>0)/4294967296,h=(d+f)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,u&&(u.x&&r(u,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xorshift7=l})(ds,e)})(Le)),Le.exports}var Fe={exports:{}},fs=Fe.exports,gn;function us(){return gn||(gn=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var u=a.w,p=a.X,d=a.i,f,h;return a.w=u=u+1640531527|0,h=p[d+34&127],f=p[d=d+1&127],h^=h<<13,f^=f<<17,h^=h>>>15,f^=f>>>12,h=p[d]=h^f,a.i=d,h+(u^u>>>16)|0};function c(u,p){var d,f,h,m,b,v=[],_=128;for(p===(p|0)?(f=p,p=null):(p=p+"\0",f=0,_=Math.max(_,p.length)),h=0,m=-32;m<_;++m)p&&(f^=p.charCodeAt((m+32)%p.length)),m===0&&(b=f),f^=f<<10,f^=f>>>15,f^=f<<4,f^=f>>>13,m>=0&&(b=b+1640531527|0,d=v[m&127]^=f+b,h=d==0?h+1:0);for(h>=128&&(v[(p&&p.length||0)&127]=-1),h=127,m=512;m>0;--m)f=v[h+34&127],d=v[h=h+1&127],f^=f<<13,d^=d<<17,f^=f>>>15,d^=d>>>12,v[h]=f^d;u.w=b,u.X=v,u.i=h}c(a,s)}function r(s,a){return a.i=s.i,a.w=s.w,a.X=s.X.slice(),a}function l(s,a){s==null&&(s=+new Date);var c=new i(s),u=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,f=(c.next()>>>0)/4294967296,h=(d+f)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,u&&(u.X&&r(u,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xor4096=l})(fs,e)})(Fe)),Fe.exports}var Be={exports:{}},hs=Be.exports,mn;function gs(){return mn||(mn=1,(function(e){(function(t,n,o){function i(s){var a=this,c="";a.next=function(){var p=a.b,d=a.c,f=a.d,h=a.a;return p=p<<25^p>>>7^d,d=d-f|0,f=f<<24^f>>>8^h,h=h-p|0,a.b=p=p<<20^p>>>12^d,a.c=d=d-f|0,a.d=f<<16^d>>>16^h,a.a=h-p|0},a.a=0,a.b=0,a.c=-1640531527,a.d=1367130551,s===Math.floor(s)?(a.a=s/4294967296|0,a.b=s|0):c+=s;for(var u=0;u<c.length+20;u++)a.b^=c.charCodeAt(u)|0,a.next()}function r(s,a){return a.a=s.a,a.b=s.b,a.c=s.c,a.d=s.d,a}function l(s,a){var c=new i(s),u=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,f=(c.next()>>>0)/4294967296,h=(d+f)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,u&&(typeof u=="object"&&r(u,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.tychei=l})(hs,e)})(Be)),Be.exports}var $e={exports:{}};const ms={},ys=Object.freeze(Object.defineProperty({__proto__:null,default:ms},Symbol.toStringTag,{value:"Module"})),bs=os(ys);var Ss=$e.exports,yn;function ws(){return yn||(yn=1,(function(e){(function(t,n,o){var i=256,r=6,l=52,s="random",a=o.pow(i,r),c=o.pow(2,l),u=c*2,p=i-1,d;function f(y,g,w){var S=[];g=g==!0?{entropy:!0}:g||{};var C=v(b(g.entropy?[y,E(n)]:y??_(),3),S),A=new h(S),R=function(){for(var T=A.g(r),I=a,x=0;T<c;)T=(T+x)*i,I*=i,x=A.g(1);for(;T>=u;)T/=2,I/=2,x>>>=1;return(T+x)/I};return R.int32=function(){return A.g(4)|0},R.quick=function(){return A.g(4)/4294967296},R.double=R,v(E(A.S),n),(g.pass||w||function(T,I,x,M){return M&&(M.S&&m(M,A),T.state=function(){return m(A,{})}),x?(o[s]=T,I):T})(R,C,"global"in g?g.global:this==o,g.state)}function h(y){var g,w=y.length,S=this,C=0,A=S.i=S.j=0,R=S.S=[];for(w||(y=[w++]);C<i;)R[C]=C++;for(C=0;C<i;C++)R[C]=R[A=p&A+y[C%w]+(g=R[C])],R[A]=g;(S.g=function(T){for(var I,x=0,M=S.i,O=S.j,L=S.S;T--;)I=L[M=p&M+1],x=x*i+L[p&(L[M]=L[O=p&O+I])+(L[O]=I)];return S.i=M,S.j=O,x})(i)}function m(y,g){return g.i=y.i,g.j=y.j,g.S=y.S.slice(),g}function b(y,g){var w=[],S=typeof y,C;if(g&&S=="object")for(C in y)try{w.push(b(y[C],g-1))}catch{}return w.length?w:S=="string"?y:y+"\0"}function v(y,g){for(var w=y+"",S,C=0;C<w.length;)g[p&C]=p&(S^=g[p&C]*19)+w.charCodeAt(C++);return E(g)}function _(){try{var y;return d&&(y=d.randomBytes)?y=y(i):(y=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(y)),E(y)}catch{var g=t.navigator,w=g&&g.plugins;return[+new Date,t,w,t.screen,E(n)]}}function E(y){return String.fromCharCode.apply(0,y)}if(v(o.random(),n),e.exports){e.exports=f;try{d=bs}catch{}}else o["seed"+s]=f})(typeof self<"u"?self:Ss,[],Math)})($e)),$e.exports}var nt,bn;function vs(){if(bn)return nt;bn=1;var e=rs(),t=as(),n=cs(),o=ps(),i=us(),r=gs(),l=ws();return l.alea=e,l.xor128=t,l.xorwow=n,l.xorshift7=o,l.xor4096=i,l.tychei=r,nt=l,nt}var ks=vs();const _s=ns(ks),He=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],ot=He.reduce((e,t)=>t.length<e.length?t:e).length,it=He.reduce((e,t)=>t.length>e.length?t:e).length;function Cs(e){const t=e?.seed?new _s(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let f=typeof n!="number"?ot:s(n);const h=typeof o!="number"?it:s(o);f>h&&(f=h);let m=!1,b;for(;!m;)b=l(),m=b.length<=h&&b.length>=f;return b}function l(){return He[a(He.length)]}function s(f){return f<ot&&(f=ot),f>it&&(f=it),f}function a(f){const h=t?t():Math.random();return Math.floor(h*f)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=f=>f),typeof e.separator!="string"&&(e.separator=" ");const c=e.min+a(e.max+1-e.min);let u=[],p="",d=0;for(let f=0;f<c*e.wordsPerString;f++)d===e.wordsPerString-1?p+=e.formatter(r(),d):p+=e.formatter(r(),d)+e.separator,d++,(f+1)%e.wordsPerString===0&&(u.push(p),p="",d=0);return typeof e.join=="string"&&(u=u.join(e.join)),u}const Yn=e=>`${e}×`,Vn=e=>`${e.toFixed(1)}×`;function Kn(){const e=Cs({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function Ts(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=Yn(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=Vn(e.intensity),ee(t.paneA,e.strategyA),ee(t.paneB,e.strategyB),Z(t.paneA,e.repositionA),Z(t.paneB,e.repositionB),xn(t,e.scenario);const n=q(e.scenario);Object.keys(e.overrides).length>0&&Xn(t,!0),je(n,e.overrides,t)}function be(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function Qn(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function Jn(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function Es(e){if(e.length<2)return"M 0 13 L 100 13";let t=e[0]??0,n=e[0]??0;for(let l=1;l<e.length;l++){const s=e[l];s!==void 0&&(s<t&&(t=s),s>n&&(n=s))}const o=n-t,i=e.length;let r="";for(let l=0;l<i;l++){const s=l/(i-1)*100,a=o>0?13-((e[l]??0)-t)/o*12:7;r+=`${l===0?"M":"L"} ${s.toFixed(2)} ${a.toFixed(2)} `}return r.trim()}const ut=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function Is(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Rs(e,t){const n=(f,h,m,b)=>Math.abs(f-h)<m?["tie","tie"]:(b?f>h:f<h)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,l]=n(e.max_wait_s,t.max_wait_s,.05,!1),[s,a]=n(e.delivered,t.delivered,.5,!0),[c,u]=n(e.abandoned,t.abandoned,.5,!1),[p,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:s,abandoned:c,utilization:p},b:{avg_wait_s:i,max_wait_s:l,delivered:a,abandoned:u,utilization:d}}}function Sn(e){const t=document.createDocumentFragment();for(const[n]of ut){const o=le("div","metric-row flex flex-col gap-[3px] px-2.5 py-[7px] bg-surface-elevated border border-stroke-subtle rounded-md transition-colors duration-normal"),i=document.createElementNS("http://www.w3.org/2000/svg","svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS("http://www.w3.org/2000/svg","path")),o.append(le("span","text-[9.5px] uppercase tracking-[0.08em] text-content-disabled font-medium",n),le("span","metric-v text-[15px] text-content font-medium [font-feature-settings:'tnum'_1]"),i),t.appendChild(o)}e.replaceChildren(t)}function rt(e,t,n,o){const i=e.children;for(let r=0;r<ut.length;r++){const l=i[r];if(!l)continue;const s=ut[r];if(!s)continue;const a=s[1],c=n?n[a]:"";l.dataset.verdict!==c&&(l.dataset.verdict=c);const u=l.children[1],p=Is(t,a);u.textContent!==p&&(u.textContent=p);const f=l.children[2].firstElementChild,h=Es(o[a]);f.getAttribute("d")!==h&&f.setAttribute("d",h)}}const As=200;function Zn(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function Q(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=q(e.permalink.scenario);e.traffic=new Bn(In(e.permalink.seed)),Zn(e,o),fe(e.paneA),fe(e.paneB),e.paneA=null,e.paneB=null;try{const i=await en(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);ee(t.paneA,e.permalink.strategyA),Z(t.paneA,e.permalink.repositionA),Sn(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await en(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),ee(t.paneB,e.permalink.strategyB),Z(t.paneB,e.permalink.repositionB),Sn(t.paneB.metrics)}catch(l){throw fe(i),l}if(n!==e.initToken){fe(i),fe(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,Qn(e,t),Jn(e,t),je(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&W(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function xs(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<As&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if(lt(e,l=>{const s=l.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);s.kind==="err"&&console.warn(`spawnRider failed (seed): ${s.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(Zn(e,q(e.permalink.scenario)),e.seeding=null)}function Ms(e,t){const n=()=>Q(e,t),o={renderPaneStrategyInfo:ee,renderPaneRepositionInfo:Z,refreshStrategyPopovers:()=>{ye(e,t,n),me(e,t,n)},renderTweakPanel:()=>{const r=q(e.permalink.scenario);je(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const l=r.target;if(!(l instanceof HTMLElement))return;const s=l.closest(".scenario-card");if(!s)return;const a=s.dataset.scenarioId;!a||a===e.permalink.scenario||Mn(e,t,a,n,o)}),ln(e,t,t.paneA,n),ln(e,t,t.paneB,n),rn(e,t,t.paneA,n),rn(e,t,t.paneB,n),ye(e,t,n),me(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},H(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",ye(e,t,n),me(e,t,n),Q(e,t).then(()=>{W(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||$.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},H(e.permalink),Q(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=Kn();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},H(e.permalink),Q(e,t).then(()=>{W(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=Yn(r)}),t.speedInput.addEventListener("change",()=>{H(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=Vn(r)}),t.intensityInput.addEventListener("change",()=>{H(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{Q(e,t),W(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";Xn(t,r)});for(const r of ce){const l=t.tweakRows[r];Bt(l.dec,()=>{Ae(e,t,r,-1,n)}),Bt(l.inc,()=>{Ae(e,t,r,1,n)}),l.reset.addEventListener("click",()=>{Zr(e,t,r,n)}),l.root.addEventListener("keydown",s=>{s.key==="ArrowUp"||s.key==="ArrowRight"?(s.preventDefault(),Ae(e,t,r,1,n)):(s.key==="ArrowDown"||s.key==="ArrowLeft")&&(s.preventDefault(),Ae(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{es(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=En(e.permalink),l=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(l).then(()=>{W(t.toast,"Permalink copied")},()=>{W(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{be(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{be(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&be(t,!1)}),Ps(e,t,o),Vr(t)}function Ps(e,t,n){window.addEventListener("keydown",o=>{if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable)return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),be(t,t.shortcutSheet.hidden);return}case"Escape":{if(jn(t)||zn(t)){o.preventDefault(),ze(t);return}t.shortcutSheet.hidden||(o.preventDefault(),be(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=we.length){const r=we[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),Mn(e,t,r.id,()=>Q(e,t),n))}})}function Ls(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=Rs(t.latestMetrics,n.latestMetrics);rt(t.metricsEl,t.latestMetrics,o.a,t.metricHistory),rt(n.metricsEl,n.latestMetrics,o.b,n.metricHistory)}else rt(t.metricsEl,t.latestMetrics,null,t.metricHistory);nn(t),n&&nn(n)}function Fs(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const l=e.paneA,s=e.paneB,a=l!==null&&(!e.permalink.compare||s!==null);if(e.running&&e.ready&&a){const c=e.permalink.speed;lt(e,m=>{m.sim.step(c);const b=m.sim.drainEvents();if(b.length>0){const v=m.sim.snapshot();Ur(m,b,v);const _=new Map;for(const E of v.cars)_.set(E.id,E.line);for(const E of b)if(E.kind==="elevator-assigned"){const y=_.get(E.elevator);y!==void 0&&m.renderer.pushAssignment(E.stop,E.elevator,y)}}}),e.seeding&&xs(e);const u=l.sim.snapshot(),d=Math.min(r,4/60)*c,f=e.seeding?[]:e.traffic.drainSpawns(u,d);for(const m of f)lt(e,b=>{const v=b.sim.spawnRider(m.originStopId,m.destStopId,m.weight,m.patienceTicks);v.kind==="err"&&console.warn(`spawnRider failed: ${v.error}`)});const h=e.permalink.speed;tn(l,l.sim.snapshot(),h),s&&tn(s,s.sim.snapshot(),h),Ls(e),(n+=1)%4===0&&(Qn(e,t),Jn(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function Bs(){Fn().catch(()=>{});const t=Yr(),n=new URLSearchParams(window.location.search).has("k"),o={...$,...Co(window.location.search)};if(!n){o.seed=Kn();const s=new URL(window.location.href);s.searchParams.set("k",o.seed),window.history.replaceState(null,"",s.toString())}Mo(o);const i=q(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=wn(i,o.overrides),Ts(o,t);const l={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new Bn(In(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};Ms(l,t),await Q(l,t),l.ready=!0,Fs(l,t),l.permalink.mode==="quest"&&await Di({initialStageId:l.permalink.questStage,onStageChange:s=>{l.permalink.questStage=s;const a=new URL(window.location.href);s===$.questStage?a.searchParams.delete("qs"):a.searchParams.set("qs",s),window.history.replaceState(null,"",a.toString())}})}Bs();export{We as _};
