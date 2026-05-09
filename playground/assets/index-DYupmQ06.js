const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-BtXdKdgG.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const s of r.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&o(s)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function ee(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let rn=0;function G(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(rn),rn=window.setTimeout(()=>{e.classList.remove("show")},1600)}function an(e,t){let i=0,r=0;const s=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",a=>{e.disabled||(a.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){s();return}t()},70)},380))}),e.addEventListener("pointerup",s),e.addEventListener("pointerleave",s),e.addEventListener("pointercancel",s),e.addEventListener("blur",s),e.addEventListener("click",a=>{a.pointerType||t()})}function ei(){document.getElementById("seo-fallback")?.remove()}function ti(e){document.title!==e.title&&(document.title=e.title),we('meta[name="description"]',"content",e.description),we('meta[property="og:title"]',"content",e.title),we('meta[property="og:description"]',"content",e.description),we('meta[name="twitter:title"]',"content",e.title),we('meta[name="twitter:description"]',"content",e.description)}function we(e,t,n){const o=document.querySelector(e);o&&o.getAttribute(t)!==n&&o.setAttribute(t,n)}function te(e,t,n){const o=zt(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return so(i,r.min,r.max)}function zt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return ao(n.doorOpenTicks,n.doorTransitionTicks)}}function Vt(e,t,n){const o=zt(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function ro(e,t){const n={};for(const o of me){const i=t[o];i!==void 0&&Vt(e,o,i)&&(n[o]=i)}return n}const me=["cars","maxSpeed","weightCapacity","doorCycleSec"];function ni(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=ao(n,o),r=so(n/(i*Je),.1,.9),s=Math.max(2,Math.round(t*Je)),a=Math.max(1,Math.round(s*r)),l=Math.max(1,Math.round((s-a)/2));return{openTicks:a,transitionTicks:l}}function ao(e,t){return(e+2*t)/Je}function Yt(e,t){const n=e.elevatorDefaults,o=te(e,"maxSpeed",t),i=te(e,"weightCapacity",t),r=te(e,"doorCycleSec",t),{openTicks:s,transitionTicks:a}=ni(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:s,doorTransitionTicks:a}}function oi(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function ii(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(te(e,"cars",t)),i=Yt(e,t),r=oi(e.stops.length,o),s=e.stops.map((l,c)=>`        StopConfig(id: StopId(${c}), name: ${Dt(l.name)}, position: ${X(l.positionM)}),`).join(`
`),a=r.map((l,c)=>ai(c,i,l,ri(c,o))).join(`
`);return`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: ${Dt(e.buildingName)},
        stops: [
${s}
        ],
    ),
    elevators: [
${a}
    ],
    simulation: SimulationParams(ticks_per_second: ${X(Je)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${X(e.passengerWeightRange[0])}, ${X(e.passengerWeightRange[1])}),
    ),
)`}const Je=60;function so(e,t,n){return Math.min(n,Math.max(t,e))}function ri(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function ai(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${X(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${X(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${Dt(o)},
            max_speed: ${X(t.maxSpeed)}, acceleration: ${X(t.acceleration)}, deceleration: ${X(t.deceleration)},
            weight_capacity: ${X(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function Dt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function X(e){return Number.isInteger(e)?`${e}.0`:String(e)}const lo={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function qe(e){return Array.from({length:e},()=>1)}const de=5,si=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:de},(e,t)=>t===de-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:qe(de),destWeights:qe(de)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:qe(de),destWeights:qe(de)}],li={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:si,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...lo,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
    schema_version: 1,
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
)`},Ze=19,Ot=16,xe=4,co=(1+Ze)*xe,Te=1,Re=41,Ee=42,ci=43;function j(e){return Array.from({length:ci},(t,n)=>e(n))}const pe=e=>e===Te||e===Re||e===Ee,di=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:j(e=>e===0?20:e===Te?2:e===Re?1.2:e===Ee?.2:.1),destWeights:j(e=>e===0?0:e===Te?.3:e===Re?.4:e===Ee?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:j(e=>pe(e)?.5:1),destWeights:j(e=>pe(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:j(e=>e===21?4:pe(e)?.25:1),destWeights:j(e=>e===21?5:pe(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:j(e=>e===0||e===Te||e===21?.3:e===Re?.4:e===Ee?1.2:1),destWeights:j(e=>e===0?20:e===Te?1:e===Re?.6:e===Ee?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:j(e=>pe(e)?1.5:.2),destWeights:j(e=>pe(e)?1.5:.2)}];function pi(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let a=1;a<=Ze;a++){const l=1+a,c=a*xe;e.push(`        StopConfig(id: StopId(${l.toString().padStart(2," ")}), name: "Floor ${a}",    position: ${c.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${co.toFixed(1)}),`);for(let a=21;a<=20+Ot;a++){const l=1+a,c=a*xe;e.push(`        StopConfig(id: StopId(${l}), name: "Floor ${a}",   position: ${c.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:Ze},(a,l)=>2+l),21],n=[21,...Array.from({length:Ot},(a,l)=>22+l)],o=[1,21,38,39,40],i=[1,0,41,42],r=a=>a.map(l=>`StopId(${l})`).join(", "),s=(a,l,c,f)=>`                ElevatorConfig(
                    id: ${a}, name: "${l}",
                    max_speed: 4.5, acceleration: 2.0, deceleration: 2.5,
                    weight_capacity: ${f.toFixed(1)},
                    starting_stop: StopId(${c}),
                    door_open_ticks: 240, door_transition_ticks: 60,
                    bypass_load_up_pct: Some(0.85), bypass_load_down_pct: Some(0.55),
                ),`;return`SimConfig(
    schema_version: 1,
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
${s(0,"Low 1",1,1800)}
${s(1,"Low 2",21,1800)}
                ],
            ),
            LineConfig(
                id: 1, name: "High bank",
                serves: [${r(n)}],
                elevators: [
${s(2,"High 1",21,1800)}
${s(5,"High 2",37,1800)}
                ],
            ),
            LineConfig(
                id: 2, name: "Executive",
                serves: [${r(o)}],
                elevators: [
${s(3,"VIP",1,350)}
                ],
            ),
            LineConfig(
                id: 3, name: "Service",
                serves: [${r(i)}],
                elevators: [
${s(4,"Service",1,350)}
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
)`}const ui=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:Ze},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*xe})),{name:"Sky Lobby",positionM:co},...Array.from({length:Ot},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*xe})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],fi={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:di,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:ui,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...lo,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:pi()},sn=1e5,ln=4e5,cn=35786e3,hi=1e8,gi=4;function He(e){return Array.from({length:gi},(t,n)=>e(n))}const mi={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:He(e=>e===0?6:1),destWeights:He(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:He(e=>e===0?0:e===1?1:e===2?3:5),destWeights:He(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:sn},{name:"LEO Transfer",positionM:ln},{name:"GEO Platform",positionM:cn}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:hi,showDayNight:!1},ron:`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${sn.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${ln.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${cn.toFixed(1)}),
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
)`},Pe=[fi,mi,li];function q(e){const t=Pe.find(o=>o.id===e);if(t)return t;const n=Pe[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const po={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},F={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},bi=["scan","look","nearest","etd","destination","rsr"],yi=["adaptive","predictive","lobby","spread","none"];function dn(e,t){return e!==null&&bi.includes(e)?e:t}function pn(e,t){return e!==null&&yi.includes(e)?e:t}const Wt=new Set;function Si(e){return Wt.add(e),()=>Wt.delete(e)}function N(e){const t=uo(e);if(window.location.search!==t){window.history.replaceState(null,"",t);for(const n of Wt)n(e)}}function vi(e,t){return e==="compare"||e==="quest"?e:t}function uo(e){const t=new URLSearchParams;e.mode!==F.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==F.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=q(e.scenario).defaultReposition,o=n??F.repositionA,i=n??F.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of me){const s=e.overrides[r];s!==void 0&&Number.isFinite(s)&&t.set(po[r],ki(s))}return`?${t.toString()}`}function wi(e){const t=new URLSearchParams(e),n={};for(const o of me){const i=t.get(po[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:vi(t.get("m"),F.mode),questStage:(t.get("qs")??"").trim()||F.questStage,scenario:t.get("s")??F.scenario,strategyA:dn(t.get("a")??t.get("d"),F.strategyA),strategyB:dn(t.get("b"),F.strategyB),repositionA:pn(t.get("pa"),F.repositionA),repositionB:pn(t.get("pb"),F.repositionB),compare:t.has("c")?t.get("c")==="1":F.compare,seed:(t.get("k")??"").trim()||F.seed,intensity:un(t.get("i"),F.intensity),speed:un(t.get("x"),F.speed),overrides:n}}function un(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function ki(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function fo(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const _i=["scan","look","nearest","etd","destination","rsr"],ge={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},ho={scan:"Sweep end-to-end, reverse at each end.",look:"Sweep until last call, then reverse.",nearest:"Assign each call to the closest car.",etd:"Assign by estimated time-to-destination.",destination:"Riders enter destination at the lobby; the group optimises.",rsr:"ETD penalised by queue length."},Ci=["adaptive","predictive","lobby","spread","none"],Le={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},go={adaptive:"Switch by traffic mode; the default.",predictive:"Park near the most-active floor.",lobby:"Return idle cars to the lobby.",spread:"Fan idle cars across the shaft.",none:"Idle cars stay where they finished."},Ti="scenario-card inline-flex items-center gap-1.5 px-2 py-1 border-b-2 border-b-transparent text-content-tertiary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:text-content aria-pressed:text-content aria-pressed:border-b-accent max-md:flex-none max-md:snap-start",Ri="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function Ei(e){const t=document.createDocumentFragment();Pe.forEach((n,o)=>{const i=ee("button",Ti);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(ee("span","",n.label),ee("span",Ri,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function mo(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}async function bo(e,t,n,o,i){const r=q(n),s=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,a=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:s,repositionA:a,overrides:{}},N(e.permalink),i.renderPaneStrategyInfo(t.paneA,s),i.renderPaneRepositionInfo(t.paneA,a),i.refreshStrategyPopovers(),mo(t,r.id),await o(),i.renderTweakPanel(),G(t.toast,`${r.label} · ${ge[s]}`)}function Ii(e){const t=q(e.scenario);e.scenario=t.id}const Ai=["layout","scenario-picker","controls-bar","cabin-legend"],Mi=["quest-pane"];function xi(e){const t=e==="quest";for(const n of Ai){const o=document.getElementById(n);o&&o.classList.toggle("hidden",t)}for(const n of Mi){const o=document.getElementById(n);o&&(o.classList.toggle("hidden",!t),o.classList.toggle("flex",t))}}function Pi(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const o of n){const i=o.dataset.mode===e;o.dataset.active=String(i),o.setAttribute("aria-pressed",String(i))}t.addEventListener("click",o=>{const i=o.target;if(!(i instanceof HTMLElement))return;const r=i.closest("button[data-mode]");if(!r)return;const s=r.dataset.mode;if(s!=="compare"&&s!=="quest"||s===e)return;const a=new URL(window.location.href);s==="compare"?(a.searchParams.delete("m"),a.searchParams.delete("qs")):a.searchParams.set("m",s),window.location.assign(a.toString())})}const Li="modulepreload",Bi=function(e,t){return new URL(e,t).href},fn={},et=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let s=function(f){return Promise.all(f.map(p=>Promise.resolve(p).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const a=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),c=l?.nonce||l?.getAttribute("nonce");i=s(n.map(f=>{if(f=Bi(f,o),f in fn)return;fn[f]=!0;const p=f.endsWith(".css"),d=p?'[rel="stylesheet"]':"";if(!!o)for(let g=a.length-1;g>=0;g--){const m=a[g];if(m.href===f&&(!p||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=p?"stylesheet":Li,p||(h.as="script"),h.crossOrigin="",h.href=f,c&&h.setAttribute("nonce",c),document.head.appendChild(h),p)return new Promise((g,m)=>{h.addEventListener("load",g),h.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(s){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=s,window.dispatchEvent(a),!a.defaultPrevented)throw s}return i.then(s=>{for(const a of s||[])a.status==="rejected"&&r(a.reason);return t().catch(r)})};class yo extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function Fi(e){const t=(await et(async()=>{const{default:i}=await import("./worker-DE_xV-Fq.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new $i(n);return await o.init(e),o}class $i{#e;#t=new Map;#n=1;#i=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#l),this.#e.addEventListener("error",this.#o),this.#e.addEventListener("messageerror",this.#o)}async init(t){await this.#s({kind:"init",id:this.#a(),payload:this.#d(t)})}async tick(t,n){const o=n?.wantVisuals??!1;return this.#s({kind:"tick",id:this.#a(),ticks:t,...o?{wantVisuals:!0}:{}})}async spawnRider(t,n,o,i){return this.#s({kind:"spawn-rider",id:this.#a(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#s({kind:"set-strategy",id:this.#a(),strategy:t})}async loadController(t,n){const o=n?.unlockedApi??null,i=n?.timeoutMs,r=this.#s({kind:"load-controller",id:this.#a(),source:t,unlockedApi:o});if(i===void 0){await r;return}r.catch(()=>{});let s;const a=new Promise((l,c)=>{s=setTimeout(()=>{c(new Error(`controller did not return within ${i}ms`))},i)});try{await Promise.race([r,a])}finally{s!==void 0&&clearTimeout(s)}}async reset(t){await this.#s({kind:"reset",id:this.#a(),payload:this.#d(t)})}dispose(){this.#i||(this.#i=!0,this.#e.removeEventListener("message",this.#l),this.#e.removeEventListener("error",this.#o),this.#e.removeEventListener("messageerror",this.#o),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#a(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#s(t){if(this.#i)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#t.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#o=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#i=!0,this.#e.terminate(),this.#r(new Error(o))};#l=t=>{const n=t.data,o=this.#t.get(n.id);if(o)switch(this.#t.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":{const i=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;o.reject(i!==null?new yo(n.message,i):new Error(n.message));return}default:{const i=n.kind;o.reject(new Error(`WorkerSim: unknown reply kind "${String(i)}"`));return}}}}const Di=`// Quest curriculum — sim global declaration.
// Loaded into Monaco's TypeScript service so the editor knows about
// the methods the player can call on the elevator-core wasm sim.

declare type Ref = bigint;

declare type StrategyName = "scan" | "look" | "nearest" | "etd" | "rsr";
declare type ServiceMode = "normal" | "manual" | "out-of-service";
declare type Direction = "up" | "down";

/** Pending hall call at a floor. */
declare interface HallCall {
  readonly stop: number;
  readonly direction: Direction;
}

/**
 * Per-(car, stop) context the rank function receives.
 *
 * \`carDirection\` is the car's signed sweep direction:
 * \`+1\` heading up, \`-1\` heading down, \`0\` idle. It's an
 * integer rather than the \`HallCall\` "up" / "down" string union
 * because the rank function typically multiplies it (e.g. against
 * \`stopPosition - carPosition\`) for direction-aware costs.
 */
declare interface RankCtx {
  readonly car: Ref;
  readonly carPosition: number;
  readonly carDirection: -1 | 0 | 1;
  readonly stop: Ref;
  readonly stopPosition: number;
}

/** Lower returned cost wins; \`null\` excludes the pair from assignment. */
declare type RankFn = (ctx: RankCtx) => number | null;

/** Loose typing for the event union — players narrow by \`type\`. */
declare interface SimEvent {
  readonly type: string;
  readonly [key: string]: unknown;
}

declare const sim: {
  /** Append a stop to the back of the car's destination queue. */
  pushDestination(carRef: Ref, stopRef: Ref): void;
  /** Pending hall calls — riders waiting at floors. */
  hallCalls(): readonly HallCall[];
  /** Stop ids the riders inside the car have pressed. */
  carCalls(carRef: Ref): readonly number[];
  /** Take the events fired since the last drain. */
  drainEvents(): readonly SimEvent[];
  /** Swap to a built-in dispatch strategy. */
  setStrategy(name: StrategyName): boolean;
  /** Register a JS rank function as the dispatcher. */
  setStrategyJs(name: string, rank: RankFn): boolean;
  /** Switch a car between normal / manual / out-of-service. */
  setServiceMode(carRef: Ref, mode: ServiceMode): void;
  /** Drive a manual-mode car directly. Positive is up, negative is down. */
  setTargetVelocity(carRef: Ref, vMps: number): void;
  /** Hold the car's doors open for extra ticks. */
  holdDoor(carRef: Ref, ticks: number): void;
  /** Release a holdDoor; doors close on the next loading-complete tick. */
  cancelDoorHold(carRef: Ref): void;
  /** Halt a car immediately — no door cycle, no queue drain. */
  emergencyStop(carRef: Ref): void;
  /** Canonical route between two stops. First entry is origin, last is destination. */
  shortestRoute(originStop: Ref, destStop: Ref): readonly number[];
  /** Send a rider to a new destination from wherever they currently are. */
  reroute(riderRef: Ref, newDestStop: Ref): void;
  /** Stops that bridge two lines. */
  transferPoints(): readonly number[];
  /** Every stop reachable without changing lines. */
  reachableStopsFrom(stop: Ref): readonly number[];
  /** Create a new stop on a line. Returns the new stop's ref. */
  addStop(lineRef: Ref, name: string, position: number): Ref;
  /** Register a stop on a line so dispatch routes to it. */
  addStopToLine(stopRef: Ref, lineRef: Ref): void;
  /** Put a line under a group's dispatcher. Returns the new dispatcher's id. */
  assignLineToGroup(lineRef: Ref, groupId: number): number;
  /** Move a car to a different line. */
  reassignElevatorToLine(carRef: Ref, lineRef: Ref): void;
};
`,hn="quest-runtime";let St=null,ue=null;async function Oi(){return St||ue||(ue=(async()=>{await Wi();const e=await et(()=>import("./editor.main-BtXdKdgG.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return St=e,e})(),ue.catch(()=>{ue=null}),ue)}async function Wi(){const[{default:e},{default:t}]=await Promise.all([et(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),et(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}function Ni(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(Di,"ts:filename/quest-sim-globals.d.ts"))}function qi(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function Hi(e){const t=await Oi();Ni(t),qi(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o()});return{dispose:()=>{i.dispose()}}},insertAtCursor(o){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:o,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(o){const i=n.getModel();if(!i)return;const r=o.message.split(`
`)[0]??o.message;t.editor.setModelMarkers(i,hn,[{severity:8,message:r,startLineNumber:o.line,startColumn:o.column,endLineNumber:o.line,endColumn:o.column+1}]),n.revealLineInCenterIfOutsideViewport(o.line)},clearRuntimeMarker(){const o=n.getModel();o&&t.editor.setModelMarkers(o,hn,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const Gi=`SimConfig(
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
)`,Ui={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:Gi,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},ji=`SimConfig(
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
)`,Xi={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:ji,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},zi=`SimConfig(
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
)`,Vi={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:zi,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},Yi=`SimConfig(
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
)`,Ki={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:Yi,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function B(e,t){const n=t.startTick??0,o=t.intervalTicks??30,i=t.destinations;if(i.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,s)=>{const a=i[s%i.length];return{origin:t.origin,destination:a,atTick:n+s*o,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const Qi=`SimConfig(
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
)`,Ji={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:Qi,unlockedApi:["setStrategy"],seedRiders:[...B(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},Zi=`SimConfig(
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
)`,er=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,tr={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:Zi,unlockedApi:["setStrategyJs"],seedRiders:[...B(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...B(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:er,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},nr=`SimConfig(
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
)`,or={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:nr,unlockedApi:["setStrategyJs"],seedRiders:[...B(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...B(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},ir=`SimConfig(
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
)`,rr=`// Stage 8 — Event-Driven
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
`,ar={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:ir,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...B(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...B(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:rr,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},sr=`SimConfig(
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
)`,lr=`// Stage 9 — Take the Wheel
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
`,cr={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:sr,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...B(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:lr,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},dr=`SimConfig(
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
)`,pr=`// Stage 10 — Patient Boarding
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
`,ur={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:dr,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...B(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:pr,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},fr=`SimConfig(
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
)`,hr=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,gr={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:fr,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...B(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...B(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:hr,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},mr=`SimConfig(
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
)`,br=`// Stage 12 — Routes
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
`,yr={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:mr,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...B(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...B(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:br,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},Sr=`SimConfig(
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
)`,vr=`// Stage 13 — Transfer Points
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
`,wr={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:Sr,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...B(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...B(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...B(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:vr,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},kr=`SimConfig(
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
)`,_r=`// Stage 14 — Build a Floor
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
`,Cr={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:kr,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...B(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:_r,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},Tr=`SimConfig(
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
)`,Rr=`// Stage 15 — Sky Lobby
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
`,Er={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:Tr,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...B(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...B(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:Rr,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},oe=[Ui,Xi,Vi,Ki,Ji,tr,or,ar,cr,ur,gr,yr,wr,Cr,Er];function Ir(e){return oe.find(t=>t.id===e)}function Ar(e){const t=oe.findIndex(n=>n.id===e);if(!(t<0))return oe[t+1]}function P(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function it(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const tt="quest:code:v1:",So="quest:bestStars:v1:",vo=5e4;function Be(){try{return globalThis.localStorage??null}catch{return null}}function gn(e){const t=Be();if(!t)return null;try{const n=t.getItem(tt+e);if(n===null)return null;if(n.length>vo){try{t.removeItem(tt+e)}catch{}return null}return n}catch{return null}}function mn(e,t){if(t.length>vo)return;const n=Be();if(n)try{n.setItem(tt+e,t)}catch{}}function Mr(e){const t=Be();if(t)try{t.removeItem(tt+e)}catch{}}function Fe(e){const t=Be();if(!t)return 0;let n;try{n=t.getItem(So+e)}catch{return 0}if(n===null)return 0;const o=Number.parseInt(n,10);return!Number.isInteger(o)||o<0||o>3?0:o}function xr(e,t){const n=Fe(e);if(t<=n)return;const o=Be();if(o)try{o.setItem(So+e,String(t))}catch{}}const Pr={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},Lr=["basics","strategies","events-manual","topology"],wo=3;function Br(){return{root:P("quest-grid","quest-grid"),progress:P("quest-grid-progress","quest-grid"),sections:P("quest-grid-sections","quest-grid")}}function vt(e,t){it(e.sections);let n=0;const o=oe.length*wo;for(const i of Lr){const r=oe.filter(c=>c.section===i);if(r.length===0)continue;const s=document.createElement("section");s.dataset.section=i;const a=document.createElement("h2");a.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",a.textContent=Pr[i],s.appendChild(a);const l=document.createElement("div");l.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const c of r){const f=Fe(c.id);n+=f,l.appendChild(Fr(c,f,t))}s.appendChild(l),e.sections.appendChild(s)}e.progress.textContent=`${n} / ${o}`}function Fr(e,t,n){const o=oe.findIndex(p=>p.id===e.id),i=String(o+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const s=document.createElement("div");s.className="flex items-baseline justify-between gap-2";const a=document.createElement("span");a.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",a.textContent=i,s.appendChild(a);const l=document.createElement("span");l.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",l.classList.add(t>0?"text-accent":"text-content-disabled"),l.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),l.textContent="★".repeat(t)+"☆".repeat(wo-t),s.appendChild(l),r.appendChild(s);const c=document.createElement("div");c.className="text-content text-[13px] font-semibold tracking-[-0.01em]",c.textContent=e.title,r.appendChild(c);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const $r=75;async function bn(e,t,n,o){let i=n;for(;i<t.length;){const r=t[i];if(r===void 0||(r.atTick??0)>o)break;await e.spawnRider(r.origin,r.destination,r.weight??$r,r.patienceTicks),i+=1}return i}async function Dr(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await Fi({configRon:e.configRon,strategy:"scan"});try{const s=[...e.seedRiders].sort((d,u)=>(d.atTick??0)-(u.atTick??0));let a=await bn(r,s,0,0);const l={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(l.timeoutMs=n.timeoutMs),await r.loadController(t,l);let c=null,f=0;const p=n.onSnapshot!==void 0;for(;f<o;){const d=o-f,u=Math.min(i,d),h=await r.tick(u,p?{wantVisuals:!0}:void 0);c=h.metrics,f=h.tick,a=await bn(r,s,a,f);const g=yn(c,f);if(n.onProgress)try{n.onProgress(g)}catch{}if(n.onSnapshot&&h.snapshot)try{n.onSnapshot(h.snapshot)}catch{}if(e.passFn(g))return Sn(e,g,!0)}if(c===null)throw new Error("runStage: maxTicks must be positive");return Sn(e,yn(c,f),!1)}finally{r.dispose()}}function yn(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function Sn(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}function Or(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const o=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(o)&&o>0&&n.push(`${o.toFixed(1)}s avg wait`),n.join(" · ")}const ko=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(ko.map(e=>[e.name,e]));function _o(e){const t=new Set(e);return ko.filter(n=>t.has(n.name))}function Wr(){return{root:P("quest-api-panel","api-panel")}}function vn(e,t){it(e.root);const n=_o(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const o=document.createElement("p");o.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",o.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(o);const i=document.createElement("ul");i.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const s=document.createElement("li");s.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const a=document.createElement("code");a.className="block font-mono text-[12px] text-content",a.textContent=r.signature,s.appendChild(a);const l=document.createElement("p");l.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",l.textContent=r.description,s.appendChild(l),i.appendChild(s)}e.root.appendChild(i)}function Nr(){return{root:P("quest-hints","hints-drawer"),count:P("quest-hints-count","hints-drawer"),list:P("quest-hints-list","hints-drawer")}}const wn="quest-hints-more";function kn(e,t){it(e.list);for(const o of e.root.querySelectorAll(`.${wn}`))o.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((o,i)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=o,i>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const o=document.createElement("button");o.type="button",o.className=`${wn} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,o.textContent=`Show ${n-1} more`,o.addEventListener("click",()=>{for(const i of e.list.querySelectorAll("li[hidden]"))i.hidden=!1;o.remove()}),e.root.appendChild(o)}e.root.removeAttribute("open")}function qr(e,t){return{activeStage:e,currentView:t,runLoop:{active:!1}}}function Hr(e,t){e.activeStage=t}function wt(e,t){e.currentView=t}function _n(e){e.runLoop.active=!1}function ke(e,t){return e.currentView==="stage"&&e.activeStage.id===t.id}function Gr(){return{root:P("quest-reference","reference-panel"),status:P("quest-reference-status","reference-panel"),code:P("quest-reference-code","reference-panel")}}function kt(e,t,n={}){const o=t.referenceSolution,i=Fe(t.id);if(!o||i===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=i===3?"(mastered)":"(unlocked)",e.code.textContent=o,n.collapse!==!1&&e.root.removeAttribute("open")}function Ur(){const e="results-modal";return{root:P("quest-results-modal",e),title:P("quest-results-title",e),stars:P("quest-results-stars",e),detail:P("quest-results-detail",e),close:P("quest-results-close",e),retry:P("quest-results-retry",e),next:P("quest-results-next",e)}}function jr(e,t,n,o,i){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=Xr(t.grade,t.passed,o),e.retry.onclick=()=>{_t(e),n()},e.close.onclick=()=>{_t(e)};const r=i;r?(e.next.hidden=!1,e.next.onclick=()=>{_t(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function _t(e){e.root.classList.remove("show")}function Xr(e,t,n){const o=`tick ${e.endTick}`,i=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${i} · finished by ${o}.`;if(n)try{const r=n(e);if(r)return`${i}. ${r}`}catch{}return`${i}. The pass condition wasn't met within the run budget.`}const zr={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function Cn(e){return zr[e]??`sim.${e}();`}function Vr(){return{root:P("quest-snippets","snippet-picker")}}function Tn(e,t,n){it(e.root);const o=_o(t.unlockedApi);if(o.length!==0)for(const i of o){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=i.name,r.title=`Insert: ${Cn(i.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(Cn(i.name))}),e.root.appendChild(r)}}const rt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},Yr="#2a2a35",Kr="#a1a1aa",z='"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',Qr=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],Jr=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],Zr="rgba(8, 10, 14, 0.55)",ea="#3a3a45",ta=[1,1,.5,.42],na=["LOW","HIGH","VIP","SERVICE"],oa="#e6c56b",ia="#9bd4c4",ra=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],aa="#a1a1aa",sa="#4a4a55",la="#f59e0b",Co="#7dd3fc",To="#fda4af",Ct="#fafafa",Ro="#8b8c92",Eo="rgba(250, 250, 250, 0.95)",ca=700,Nt=3,da=.05,Rn=["standard","briefcase","bag","short","tall"];function Y(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,Rn[n%Rn.length]??"standard"}function pa(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function Kt(e,t,n,o,i,r="standard"){const s=pa(r,o),l=n-.5,c=l-s.bodyH,f=c-s.neckGap-s.headR,p=s.bodyH*.08,d=l-s.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-s.shoulderW/2,c+p),e.lineTo(t-s.shoulderW/2+p,c),e.lineTo(t+s.shoulderW/2-p,c),e.lineTo(t+s.shoulderW/2,c+p),e.lineTo(t+s.waistW/2,d),e.lineTo(t+s.footW/2,l),e.lineTo(t-s.footW/2,l),e.lineTo(t-s.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,s.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const u=Math.max(1.6,s.headR*.9),h=t+s.waistW/2+u*.1,g=l-u-.5;e.fillRect(h,g,u,u);const m=u*.55;e.fillRect(h+(u-m)/2,g-1,m,1)}else if(r==="bag"){const u=Math.max(1.3,s.headR*.9),h=t-s.shoulderW/2-u*.35,g=c+s.bodyH*.35;e.beginPath(),e.arc(h,g,u,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(h+u*.2,g-u*.8),e.lineTo(t+s.shoulderW/2-p,c+.5),e.stroke()}else if(r==="tall"){const u=s.headR*2.1,h=Math.max(1,s.headR*.45);e.fillRect(t-u/2,f-s.headR-h+.4,u,h)}}function ua(e,t,n,o,i,r,s,a,l){const f=Math.max(1,Math.floor((i-14)/a.figureStride)),p=Math.min(r,f),d=-2;for(let u=0;u<p;u++){const h=t+d+o*u*a.figureStride,g=u+0,m=Y(l,g);Kt(e,h,n,a.figureHeadR,s,m)}if(r>p){e.fillStyle=Ro,e.font=`${a.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const u=t+d+o*p*a.figureStride;e.fillText(`+${r-p}`,u,n-1)}}function ne(e,t,n,o,i,r){const s=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,s);return}e.moveTo(t+s,n),e.lineTo(t+o-s,n),e.quadraticCurveTo(t+o,n,t+o,n+s),e.lineTo(t+o,n+i-s),e.quadraticCurveTo(t+o,n+i,t+o-s,n+i),e.lineTo(t+s,n+i),e.quadraticCurveTo(t,n+i,t,n+i-s),e.lineTo(t,n+s),e.quadraticCurveTo(t,n,t+s,n),e.closePath()}function fa(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const s=i+r+1>>1;e.measureText(t.slice(0,s)+o).width<=n?i=s:r=s-1}return i===0?o:t.slice(0,i)+o}function ha(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function ga(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px ${z}`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,s=Math.max(n.fontSmall+.5,i);for(const a of t){const l=a.top-3,c=l>i&&l-n.fontSmall<r;e.fillStyle=a.color,e.fillText(a.text,a.cx,c?s:l)}}function ma(e,t,n,o,i,r,s,a,l){e.font=`500 ${o.fontMain.toFixed(0)}px ${z}`,e.textBaseline="middle";const c=o.padX,f=o.padX+o.labelW,p=r-o.padX,d=o.shaftInnerW/2,u=Math.min(o.shaftInnerW*1.8,(p-f)/2);for(let h=0;h<t.length;h++){const g=t[h];if(g===void 0)continue;const m=n(g.y),w=t[h+1],_=w!==void 0?n(w.y):a;if(e.strokeStyle=Yr,e.lineWidth=l?2:1,e.beginPath(),l)for(const y of i)e.moveTo(y-u,m+.5),e.lineTo(y+u,m+.5);else{let y=f;for(const S of i){const k=S-d,b=S+d;k>y&&(e.moveTo(y,m+.5),e.lineTo(k,m+.5)),y=b}y<p&&(e.moveTo(y,m+.5),e.lineTo(p,m+.5))}e.stroke();for(let y=0;y<i.length;y++){const S=i[y];if(S===void 0)continue;const k=s.has(y,g.entity_id);e.strokeStyle=k?la:sa,e.lineWidth=k?1.4:1,e.beginPath(),e.moveTo(S-d-2,m+.5),e.lineTo(S-d,m+.5),e.moveTo(S+d,m+.5),e.lineTo(S+d+2,m+.5),e.stroke()}const E=l?m:(m+_)/2;e.fillStyle=Kr,e.textAlign="right",e.fillText(fa(e,g.name,o.labelW-4),c+o.labelW-4,E)}}function ba(e,t,n,o,i,r){for(const s of t.stops){if(s.waiting_by_line.length===0)continue;const a=r.get(s.entity_id);if(a===void 0||a.size===0)continue;const l=n(s.y),c=s.waiting_up>=s.waiting_down?Co:To;for(const f of s.waiting_by_line){if(f.count===0)continue;const p=a.get(f.line);if(p===void 0)continue;const d=i.get(p);if(d===void 0)continue;const u=d.end-d.start;u<=o.figureStride||ua(e,d.end-2,l,-1,u,f.count,c,o,s.entity_id)}}}const Tt=new Map;function Qt(e){const t=Tt.get(e);if(t!==void 0)return t;const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return Tt.set(e,null),null;const o=parseInt(n[1],16),i=[o>>16&255,o>>8&255,o&255];return Tt.set(e,i),i}function qt(e,t){const n=Qt(e);if(n===null)return e;const[o,i,r]=n,s=a=>t>=0?Math.round(a+(255-a)*t):Math.round(a*(1+t));return`rgb(${s(o)}, ${s(i)}, ${s(r)})`}function Io(e,t){const n=Qt(e);if(n===null)return e;const[o,i,r]=n;return`rgba(${o}, ${i}, ${r}, ${t})`}function Ue(e,t){if(Qt(e)!==null&&e.startsWith("#")){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Io(e,t)}function Ao(e){let r=e;for(let a=0;a<3;a++){const l=1-r,c=3*l*l*r*.2+3*l*r*r*.2+r*r*r,f=3*l*l*.2+6*l*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(c-e)/f,r=Math.max(0,Math.min(1,r))}const s=1-r;return 3*s*s*r*.6+3*s*r*r*1+r*r*r}function ya(e,t,n,o,i,r,s,a,l,c=!1){const f=o*.22,p=(i-4)/10.5,d=Math.max(1.2,Math.min(a.figureHeadR,f,p)),u=a.figureStride*(d/a.figureHeadR),h=3,g=2,m=o-h*2,_=Math.max(1,Math.floor((m-16)/u)),E=Math.min(r,_),y=E*u,S=t-y/2+u/2,k=n-g;for(let b=0;b<E;b++){const C=l?.[b]??Y(0,b);Kt(e,S+b*u,k,d,s,C)}if(r>E){const b=`+${r-E}`,C=Math.max(8,a.fontSmall-1);e.font=`700 ${C.toFixed(1)}px ${z}`,e.textAlign="right",e.textBaseline="middle";const I=e.measureText(b).width,T=3,R=1.5,A=Math.ceil(I+T*2),M=Math.ceil(C+R*2),D=t+o/2-2,O=n-i+2,W=D-A;e.fillStyle="rgba(15, 15, 18, 0.85)",ne(e,W,O,A,M,2),e.fill(),e.fillStyle="#fafafa",e.fillText(b,D-T,O+M/2)}if(c){const b=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${b.toFixed(0)}px ${z}`,e.textAlign="center",e.textBaseline="middle";const C=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,C+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,C)}}const Sa=Array.from({length:Nt},(e,t)=>Io(rt.moving,.18*(1-t/Nt))),En=Object.fromEntries(Object.entries(rt).map(([e,t])=>[e,qt(t,.18)]));function va(e,t,n,o,i,r,s){const a=Math.max(2,r.figureHeadR*.9);for(const l of t.cars){if(l.target===void 0)continue;const c=s.get(l.target);if(c===void 0)continue;const f=t.stops[c];if(f===void 0)continue;const p=n.get(l.id);if(p===void 0)continue;const d=i(f.y)-r.carH/2,u=i(l.y)-r.carH/2;Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(p,u),e.lineTo(p,d),e.stroke(),e.fillStyle=Eo,e.beginPath(),e.arc(p,d,a,0,Math.PI*2),e.fill())}}function wa(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const s=o/2;for(let a=1;a<=Nt;a++){const l=r(t.y-t.v*da*a);e.fillStyle=Sa[a-1]??"rgba(107, 107, 117, 0.06)",e.fillRect(n-s,l-i,o,i)}}function ka(e,t,n,o,i,r,s,a,l){const c=s(t.y),f=c-i,p=o/2,d=rt[t.phase]??"#6b6b75";e.fillStyle=d,e.fillRect(n-p,f,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-p+.5,f+.5,o-1,i-1),e.strokeStyle=En[t.phase]??En.unknown,e.beginPath(),e.moveTo(n-p+1,f+1.5),e.lineTo(n+p-1,f+1.5),e.stroke();const u=t.capacity>0&&t.load>=t.capacity*.95;if((t.riders>0||u)&&ya(e,n,c,o,i,t.riders,r,a,l,u),t.phase==="door-opening"||t.phase==="loading"||t.phase==="door-closing"){const h=Math.max(o*.2,Math.min(o*.4,8));e.strokeStyle="rgba(250, 250, 250, 0.85)",e.lineWidth=1.5,e.beginPath(),e.moveTo(n-h/2,c-.5),e.lineTo(n+h/2,c-.5),e.stroke()}}const In=6,_a=3,Rt=4,he=3,fe=2.5,Q=2,Ca=12,Ta="rgba(37, 37, 48, 0.80)",Ra="#ECECEE",An=3,Mn=.3,Ea=140,xn=.85;function Ia(e,t,n,o,i,r,s,a){const l=s.fontSmall+.5;e.font=`500 ${l}px ${z}`,e.textBaseline="middle",Pn(e,"-0.1px");const c=performance.now(),f=Ue(t,.45),p=Ue(t,.5),d=Ue(t,.75),u=[];for(const[g,m]of o){const w=n.get(g);if(w===void 0)continue;const _=i.get(g);if(_===void 0)continue;const E=r(w.y),y=E-s.carH,S=Math.max(1,m.expiresAt-m.bornAt),k=m.expiresAt-c,b=k>S*Mn?1:Math.max(0,k/(S*Mn)),C=Math.max(0,c-m.bornAt),I=Math.min(1,C/Ea),T=b*I;if(T<=0)continue;const R=e.measureText(m.glyph).width,A=R+An+e.measureText(m.text).width+In*2,M=l+_a*2+2,D=y-Q-fe-M,O=E+Q+fe+M>a,W=D<2&&!O?"below":"above",be=W==="above"?y-Q-fe-M:E+Q+fe;let H=_-A/2;const ye=2,Se=a-A-2;H<ye&&(H=ye),H>Se&&(H=Se),u.push({bubble:m,glyphW:R,alpha:T,cx:_,carTop:y,carBottom:E,bubbleW:A,bubbleH:M,side:W,bx:H,by:be,entrance:I})}const h=(g,m)=>!(g.bx+g.bubbleW<=m.bx||m.bx+m.bubbleW<=g.bx||g.by+g.bubbleH<=m.by||m.by+m.bubbleH<=g.by);for(let g=1;g<u.length;g++){const m=u[g];if(m===void 0)continue;let w=!1;for(let k=0;k<g;k++){const b=u[k];if(b!==void 0&&h(m,b)){w=!0;break}}if(!w)continue;const _=m.side==="above"?"below":"above",E=_==="above"?m.carTop-Q-fe-m.bubbleH:m.carBottom+Q+fe,y={...m,side:_,by:E};let S=!0;for(let k=0;k<g;k++){const b=u[k];if(b!==void 0&&h(y,b)){S=!1;break}}S&&(u[g]=y)}for(const g of u){const{bubble:m,glyphW:w,alpha:_,cx:E,carTop:y,carBottom:S,bubbleW:k,bubbleH:b,side:C,bx:I,by:T,entrance:R}=g,A=C==="above"?y-Q:S+Q,M=Math.min(Math.max(E,I+Rt+he/2),I+k-Rt-he/2),D=Ao(R),O=xn+(1-xn)*D;e.save(),e.globalAlpha=_,e.translate(M,A),e.scale(O,O),e.translate(-M,-A),Aa(e,I,T,k,b,Rt,C,M,A),e.shadowColor=p,e.shadowBlur=Ca,e.fillStyle=Ta,e.fill(),e.shadowBlur=0,e.shadowColor="transparent",e.strokeStyle=f,e.lineWidth=1,e.stroke();const W=T+b/2,be=I+In;e.textAlign="left",e.fillStyle=d,e.fillText(m.glyph,be,W),e.fillStyle=Ra,e.fillText(m.text,be+w+An,W),e.restore()}Pn(e,"0px")}function Aa(e,t,n,o,i,r,s,a,l){const c=Math.min(r,o/2,i/2);e.beginPath(),e.moveTo(t+c,n),s==="below"&&(e.lineTo(a-he/2,n),e.lineTo(a,l),e.lineTo(a+he/2,n)),e.lineTo(t+o-c,n),e.arcTo(t+o,n,t+o,n+c,c),e.lineTo(t+o,n+i-c),e.arcTo(t+o,n+i,t+o-c,n+i,c),s==="above"&&(e.lineTo(a+he/2,n+i),e.lineTo(a,l),e.lineTo(a-he/2,n+i)),e.lineTo(t+c,n+i),e.arcTo(t,n+i,t,n+i-c,c),e.lineTo(t,n+c),e.arcTo(t,n,t+c,n,c),e.closePath()}function Pn(e,t){e.letterSpacing=t}function Ln(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function Ma(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:at(o)})}return t}function at(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function Mo(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function Bn(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function xa(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function Pa(e,t,n,o,i,r){const s=Math.abs(t-e);if(s<.001)return 0;const a=Math.abs(n);if(a*a/(2*r)>=s)return a>0?a/r:0;const c=Math.max(0,(o-a)/i),f=a*c+.5*i*c*c,p=o/r,d=o*o/(2*r);if(f+d>=s){const h=(2*i*r*s+r*a*a)/(i+r),g=Math.sqrt(Math.max(h,a*a));return(g-a)/i+g/r}const u=s-f-d;return c+u/Math.max(o,.001)+p}const xo={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},nt={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function La(e,t,n,o,i,r){const s=i/2,a=o-r/2,l=rt[t.phase]??"#6b6b75",c=e.createLinearGradient(n,a,n,a+r);c.addColorStop(0,qt(l,.14)),c.addColorStop(1,qt(l,-.18)),e.fillStyle=c,ne(e,n-s,a,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-s+2,a+r*.36,i-4,Math.max(1.5,r*.1))}function Ba(e,t,n,o,i){if(t.length===0)return;const r=7,s=4,a=i.fontSmall+2,l=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px ${z}`;const c=(d,u)=>{const h=[d.carName,at(d.altitudeM),Mo(d.velocity),`${xo[d.phase]} · ${d.layer}`];let g=0;for(const y of h)g=Math.max(g,e.measureText(y).width);const m=g+r*2,w=h.length*a+s*2;let _=u==="right"?d.cx+l:d.cx-l-m;_=Math.max(2,Math.min(o-m-2,_));const E=d.cy-w/2;return{hud:d,lines:h,bx:_,by:E,bubbleW:m,bubbleH:w,side:u}},f=(d,u)=>!(d.bx+d.bubbleW<=u.bx||u.bx+u.bubbleW<=d.bx||d.by+d.bubbleH<=u.by||u.by+u.bubbleH<=d.by),p=[];t.forEach((d,u)=>{let h=c(d,u%2===0?"right":"left");if(p.some(g=>f(h,g))){const g=c(d,h.side==="right"?"left":"right");if(p.every(m=>!f(g,m)))h=g;else{const m=Math.max(...p.map(w=>w.by+w.bubbleH));h={...h,by:m+4}}}p.push(h)});for(const d of p){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",ne(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=nt[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,ne(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let u=0;u<d.lines.length;u++){const h=d.by+s+a*u+a/2,g=d.lines[u]??"";e.fillStyle=u===0||u===3?nt[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(g,d.bx+r,h)}e.restore()}}function Fa(e,t,n,o,i,r){if(t.length===0)return;const s=18,a=10,l=6,c=5,f=r.fontSmall+2.5,d=l*2+5*f,u=s+l+(d+c)*t.length;e.save();const h=e.createLinearGradient(n,i,n,i+u);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,ne(e,n,i,o,u,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,ne(e,n,i,o,u,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px ${z}`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+a,i+s/2+2);let g=i+s+l;for(const m of t){e.fillStyle="rgba(15, 15, 18, 0.55)",ne(e,n+6,g,o-12,d,5),e.fill(),e.fillStyle=nt[m.phase],e.fillRect(n+6,g,2,d);const w=n+a+4,_=n+o-a;let E=g+l+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px ${z}`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(m.carName,w,E),e.textAlign="right",e.fillStyle=nt[m.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px ${z}`,e.fillText(xo[m.phase].toUpperCase(),_,E);const y=m.etaSeconds!==void 0&&Number.isFinite(m.etaSeconds)?xa(m.etaSeconds):"—",S=[["Altitude",at(m.altitudeM)],["Velocity",Mo(m.velocity)],["Dest",m.destinationName??"—"],["ETA",y]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px ${z}`;for(const[k,b]of S)E+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(k,w,E),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(b,_,E);g+=d+c}e.restore()}function $a(e,t,n,o,i,r,s,a,l,c,f){c.length=e.cars.length;for(let p=0;p<e.cars.length;p++){const d=e.cars[p];d!==void 0&&(c[p]=d.id)}c.sort((p,d)=>p-d),f.clear();for(let p=0;p<c.length;p++){const d=c[p];d!==void 0&&f.set(d,p)}l.length=e.cars.length;for(let p=0;p<e.cars.length;p++){const d=e.cars[p];if(d===void 0)continue;const u=d.y,h=d.target!==void 0?a.get(d.target):void 0,g=h!==void 0?e.stops[h]:void 0,m=g?Pa(u,g.y,d.v,i,r,s):void 0,w=f.get(d.id)??0,_=l[p];_===void 0?l[p]={cx:n,cy:t.toScreenAlt(u),altitudeM:u,velocity:d.v,phase:Bn(d.v,o.get(d.id)??0,i),layer:Ln(u),carName:`Climber ${String.fromCharCode(65+w)}`,destinationName:g?.name,etaSeconds:m}:(_.cx=n,_.cy=t.toScreenAlt(u),_.altitudeM=u,_.velocity=d.v,_.phase=Bn(d.v,o.get(d.id)??0,i),_.layer=Ln(u),_.carName=`Climber ${String.fromCharCode(65+w)}`,_.destinationName=g?.name,_.etaSeconds=m)}return l}const _e=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function Et(e,t,n){return e+(t-e)*n}function It(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round(Et(o>>16&255,i>>16&255,n)),s=Math.round(Et(o>>8&255,i>>8&255,n)),a=Math.round(Et(o&255,i&255,n));return`#${(r<<16|s<<8|a).toString(16).padStart(6,"0")}`}function Da(e,t){let n=0;for(;n<_e.length-1;n++){const c=_e[n+1];if(c===void 0||e<=c[0])break}const o=_e[n],i=_e[Math.min(n+1,_e.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],s=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),a=It(o[1],i[1],s),l=It(o[2],i[2],s);return It(a,l,t)}const Oa=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function Wa(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),s=Math.log10(1+t.axisMaxM/1e3),a=[0,.05,.15,.35,.6,1];for(const c of a){const f=1e3*(10**(c*s)-1);r.addColorStop(c,Da(f,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const c of Oa){const f=t.axisMaxM*c.altFrac;if(f<8e4)continue;const p=t.toScreenAlt(f),d=n+c.xFrac*(o-n),u=c.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${u.toFixed(3)})`,e.beginPath(),e.arc(d,p,c.size,0,Math.PI*2),e.fill()}e.restore();const l=Ma(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const c of l){const f=t.toScreenAlt(c.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(o,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(c.label,n+4,f-6))}}function Na(e,t,n,o){const r=o-28,s=e.createLinearGradient(0,r,0,o);s.addColorStop(0,"rgba(0,0,0,0)"),s.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),s.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=s,e.fillRect(t,r,n-t,28),e.strokeStyle=Ue("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function qa(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function Ha(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const s=-Math.PI/2+r*Math.PI/3,a=t+Math.cos(s)*i,l=n+Math.sin(s)*i;r===0?e.moveTo(a,l):e.lineTo(a,l)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function Ga(e,t,n,o,i,r,s){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const a of t.stops){const l=n.toScreenAlt(a.y);if(l<n.shaftTop||l>n.shaftBottom)continue;const c=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-c/2,l),e.lineTo(o-5,l),e.moveTo(o+5,l),e.lineTo(o+c/2,l),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-c/2,l),e.lineTo(o-5,l-5),e.moveTo(o+c/2,l),e.lineTo(o+5,l-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(a.name,r+s-4,l-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(at(a.y),r+s-4,l+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function Ua(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const s=Math.log10(1+Math.max(0,r)/1e3),a=i<=0?0:Math.max(0,Math.min(1,s/i));return t-a*(t-e)}}}function ja(e,t,n,o,i,r,s){const a=Math.max(2,s.figureHeadR*.9);for(const l of t.cars){if(l.target===void 0)continue;const c=r.get(l.target);if(c===void 0)continue;const f=t.stops[c];if(f===void 0)continue;const p=i.get(l.id);if(p===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,p),e.lineTo(o,d),e.stroke(),e.fillStyle=Eo,e.beginPath(),e.arc(o,d,a,0,Math.PI*2),e.fill())}}function Xa(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function za(e,t,n,o,i,r,s){s.firstDrawAt===0&&(s.firstDrawAt=performance.now());const a=(performance.now()-s.firstDrawAt)/1e3,l=r.showDayNight?Xa(a):.5,c=n>=520&&o>=360,f=Math.min(120,Math.max(72,n*.16)),p=c?Math.min(220,Math.max(160,n*.24)):0,d=c?14:0,u=i.padX,h=u+f+4,g=n-i.padX-p-d,m=(h+g)/2,w=12,_=i.padTop+24,E=o-i.padBottom-18,y=Ua(_,E,r);Wa(e,y,h+w,g-w,l),Na(e,h+w,g-w,E),qa(e,m,y),Ha(e,m,y.shaftTop,i),Ga(e,t,y,m,i,u,f);const S=Math.max(20,Math.min(34,g-h-8)),k=Math.max(16,Math.min(26,S*.72));i.carH=k,i.carW=S;const b=s.carCenters,C=s.stopIdxById;b.clear(),C.clear();for(let T=0;T<t.stops.length;T++){const R=t.stops[T];R!==void 0&&C.set(R.entity_id,T)}for(const T of t.cars)b.set(T.id,y.toScreenAlt(T.y));ja(e,t,y,m,b,C,i);for(const T of t.cars){const R=b.get(T.id);R!==void 0&&La(e,T,m,R,S,k)}const I=$a(t,y,m,s.prevVelocity,s.maxSpeed,s.acceleration,s.deceleration,C,s.hudBuf,s.idSortBuf,s.idRankBuf);I.sort((T,R)=>R.altitudeM-T.altitudeM),Ba(e,I,S,n-p-d,i),c&&Fa(e,I,n-i.padX-p,p,_,i);for(const T of t.cars)s.prevVelocity.set(T.id,T.v);if(s.prevVelocity.size>t.cars.length)for(const T of s.prevVelocity.keys())b.has(T)||s.prevVelocity.delete(T)}const Va=1e6;function Po(e,t){return e*Va+t}function Ya(e){return{has:(t,n)=>e.has(Po(t,n))}}function Ka(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function Fn(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}const Qa=.8,Ja=2;function Za(e,t,n){const o=performance.now();for(const i of t){const r=o-i.bornAt;if(r<0)continue;const s=Math.min(1,Math.max(0,r/i.duration)),a=Ao(s),l=i.startX+(i.endX-i.startX)*a,c=Math.sin(a*Math.PI*Ja*2)*Qa,f=i.floorY+c,p=es(i.kind,s,a);if(p<=0)continue;const d=e.globalAlpha;e.globalAlpha=p,Kt(e,l,f,n.figureHeadR,i.color,i.variant),e.globalAlpha=d}}function es(e,t,n){return e==="board"?t<.75?1:Math.max(0,1-(t-.75)/.25):e==="alight"?t<.2?t/.2:t>.6?Math.max(0,1-(t-.6)/.4):1:.7*(1-n)**1.2}function ts(e,t){const{count:n,enablePairs:o,halfPairW:i,now:r,stagger:s,duration:a,originX:l,endX:c,floorY:f,color:p}=t;let d=0,u=0;for(;d<n;){const h=o&&d+1<n?2:1;for(let g=0;g<h;g++){const m=h===2?g===0?-i:i:0;e.push({kind:"board",bornAt:r+u*s,duration:a,startX:l+m,endX:c+m,floorY:f,color:p,variant:Y(t.stopId,d+g+t.dirOffset)})}d+=h,u++}}function ns(e,t){const{count:n,now:o,stagger:i,duration:r,startX:s,endX:a,floorY:l,color:c,stopId:f}=t;for(let p=0;p<n;p++)e.push({kind:"abandon",bornAt:o+p*i,duration:r,startX:s,endX:a,floorY:l,color:c,variant:Y(f,2e4+p)})}function os(e,t){const{count:n,enablePairs:o,halfPairW:i,now:r,stagger:s,duration:a,startX:l,endX:c,floorY:f,color:p}=t;let d=0,u=0;for(;d<n;){const h=o&&d+1<n?2:1;for(let g=0;g<h;g++){const m=d+g,w=h===2?g===0?-i:i:0;e.push({kind:"alight",bornAt:r+u*s,duration:a,startX:l+w,endX:c+w,floorY:f,color:p,variant:t.variants[t.variants.length-1-m]??Y(t.carId,m)})}d+=h,u++}}class Lo{#e;#t;#n=window.devicePixelRatio||1;#i;#r=null;#a=-1;#d=new Map;#s;#o=new Map;#l=new Map;#c=[];#p=null;#m=new Map;#R=new Map;#E=new Map;#I=[];#A=[];#M=new Map;#b=1;#y=1;#S=1;#f=0;#u=new Map;#v=new Map;#x=new Map;#h=new Map;#w=[];#k=new Map;#_=new Set;#P=Ya(this.#_);#L=[];#B=[];#F=[];#$=new Map;#C=new Map;#D=new Map;#T=new Map;#O=[];#W=[];#N=[];#q=new Map;constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#t=o,this.#s=n,this.#g(),this.#i=()=>{this.#g()},window.addEventListener("resize",this.#i)}dispose(){window.removeEventListener("resize",this.#i)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#m.clear(),this.#f=0,this.#u.clear()}setTetherPhysics(t,n,o){Number.isFinite(t)&&t>0&&(this.#b=t),Number.isFinite(n)&&n>0&&(this.#y=n),Number.isFinite(o)&&o>0&&(this.#S=o)}pushAssignment(t,n,o){let i=this.#u.get(t);i===void 0&&(i=new Map,this.#u.set(t,i)),i.set(o,n)}#g(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#n,i=n*this.#n;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}#H(t,n){const o=this.#w.pop();return o!==void 0?(o.start=t,o.end=n,o):{start:t,end:n}}#G(){for(const t of this.#h.values())this.#w.push(t);this.#h.clear()}draw(t,n,o){this.#g();const{clientWidth:i,clientHeight:r}=this.#e,s=this.#t;if(s.clearRect(0,0,i,r),t.stops.length===0||i===0||r===0)return;i!==this.#a&&(this.#r=Ka(i),this.#a=i);const a=this.#r;if(a===null)return;if(this.#p!==null){this.#U(t,i,r,a,n,o,this.#p);return}const l=t.stops.length===2,c=this.#v;c.clear();for(const v of t.cars)c.set(v.id,v);const f=this.#N;f.length=t.stops.length;for(let v=0;v<t.stops.length;v++)f[v]=t.stops[v];f.sort((v,x)=>v.y-x.y);const p=this.#O;p.length=f.length;for(let v=0;v<f.length;v++){const x=f[v];p[v]=x===void 0?0:x.y}const d=t.stops[0];if(d===void 0)return;let u=d.y,h=d.y;for(let v=1;v<t.stops.length;v++){const x=t.stops[v];if(x===void 0)continue;const L=x.y;L<u&&(u=L),L>h&&(h=L)}const g=p.length>=3?(p.at(-1)??0)-(p.at(-2)??0):1,w=u-1,_=h+g,E=Math.max(_-w,1e-4),y=l?18:0;let S,k;if(l)S=a.padTop+y,k=r-a.padBottom-y;else{let v=1/0;for(let J=1;J<p.length;J++){const De=p[J],Oe=p[J-1];if(De===void 0||Oe===void 0)continue;const ve=De-Oe;ve>0&&ve<v&&(v=ve)}Number.isFinite(v)||(v=1);const L=48/v,U=Math.max(0,r-a.padTop-a.padBottom)/E,V=Math.min(U,L),le=E*V;k=r-a.padBottom,S=k-le}const b=v=>k-(v-w)/E*(k-S),C=this.#d;C.forEach(v=>v.length=0);for(const v of t.cars){const x=C.get(v.line);x?x.push(v):C.set(v.line,[v])}const I=this.#W;I.length=0;for(const v of C.keys())I.push(v);I.sort((v,x)=>v-x);let T=0;for(const v of I)T+=C.get(v)?.length??0;const R=Math.max(0,i-2*a.padX-a.labelW),A=a.figureStride*2,M=a.shaftSpacing*Math.max(T-1,0),O=(R-M)/Math.max(T,1),W=l?34:a.maxShaftInnerW,H=Math.max(a.minShaftInnerW,Math.min(W,O*.55)),ye=Math.max(0,Math.min(O-H,A+a.figureStride*4)),Se=Math.max(14,H-6);let ae=1/0;if(t.stops.length>=2)for(let v=1;v<p.length;v++){const x=p[v-1],L=p[v];if(x===void 0||L===void 0)continue;const $=b(x)-b(L);$>0&&$<ae&&(ae=$)}const zo=b(h)-2,Vo=Number.isFinite(ae)?ae:a.carH,Yo=l?a.carH:Vo,Ko=Math.max(14,Math.min(Yo,zo));if(!l&&Number.isFinite(ae)){const v=Math.max(1.5,Math.min(ae*.067,4)),x=a.figureStride*(v/a.figureHeadR);a.figureHeadR=v,a.figureStride=x}a.shaftInnerW=H,a.carW=Se,a.carH=Ko;const Qo=a.padX+a.labelW,Jo=H+ye,$e=this.#L;$e.length=0;const se=this.#x;se.clear(),this.#G();const ct=this.#h;let en=0;for(const v of I){const x=C.get(v)??[];for(const L of x){const $=Qo+en*(Jo+a.shaftSpacing),U=$,V=$+ye,le=V+H/2;$e.push(le),se.set(L.id,le),ct.set(L.id,this.#H(U,V)),en++}}const dt=this.#k;dt.clear();for(let v=0;v<t.stops.length;v++){const x=t.stops[v];x!==void 0&&dt.set(x.entity_id,v)}const tn=this.#_;tn.clear();{let v=0;for(const x of I){const L=C.get(x)??[];for(const $ of L){if($.phase==="loading"||$.phase==="door-opening"||$.phase==="door-closing"){const U=Fn(t.stops,$.y);U!==void 0&&U.dist<.5&&tn.add(Po(v,U.stop.entity_id))}v++}}}const pt=this.#$,ut=this.#C,ft=this.#D,ht=this.#T;pt.clear(),ut.clear(),ft.clear(),ht.clear();const gt=this.#B;gt.length=0;const mt=this.#F;mt.length=0;let nn=0;for(let v=0;v<I.length;v++){const x=I[v];if(x===void 0)continue;const L=C.get(x)??[],$=Qr[v]??Zr,U=Jr[v]??ea,V=ta[v]??1,le=ra[v]??aa,J=Math.max(14,H*V),De=Math.max(10,Se*V),Oe=Math.max(10,a.carH),ve=v===2?oa:v===3?ia:Ct;let We=1/0,bt=-1/0,Ne=1/0;for(const K of L){pt.set(K.id,J),ut.set(K.id,De),ft.set(K.id,Oe),ht.set(K.id,ve);const ce=$e[nn];if(ce===void 0)continue;const on=Number.isFinite(K.min_served_y)&&Number.isFinite(K.max_served_y),yt=on?Math.max(S,b(K.max_served_y)-a.carH-2):S,Zo=on?Math.min(k,b(K.min_served_y)+2):k;gt.push({cx:ce,top:yt,bottom:Zo,fill:$,frame:U,width:J}),ce<We&&(We=ce),ce>bt&&(bt=ce),yt<Ne&&(Ne=yt),nn++}I.length>1&&Number.isFinite(We)&&Number.isFinite(Ne)&&mt.push({cx:(We+bt)/2,top:Ne,text:na[v]??`Line ${v+1}`,color:le})}ha(s,gt),ga(s,mt,a),ma(s,f,b,a,$e,i,this.#P,S,l),ba(s,t,b,a,ct,this.#u),va(s,t,se,pt,b,a,dt);for(const v of t.cars){const x=se.get(v.id);if(x===void 0)continue;const L=ut.get(v.id)??a.carW,$=ft.get(v.id)??a.carH,U=ht.get(v.id)??Ct,V=this.#o.get(v.id);wa(s,v,x,L,$,b),ka(s,v,x,L,$,U,b,a,V?.roster)}this.#j(t,se,ct,b,a,n),Za(s,this.#c,a),o&&o.size>0&&Ia(s,this.#s,c,o,se,b,a,i)}#U(t,n,o,i,r,s,a){const l={prevVelocity:this.#m,maxSpeed:this.#b,acceleration:this.#y,deceleration:this.#S,firstDrawAt:this.#f,carCenters:this.#R,stopIdxById:this.#E,hudBuf:this.#I,idSortBuf:this.#A,idRankBuf:this.#M};za(this.#t,t,n,o,i,a,l),this.#f=l.firstDrawAt}#j(t,n,o,i,r,s){const a=performance.now(),l=Math.max(1,s),c=ca/l,f=80/l,p=Math.max(1.5,Math.min(2.5,r.figureStride*.45)),d=this.#q;d.clear();for(const u of t.cars){const h=this.#o.get(u.id),g=n.get(u.id),m=Fn(t.stops,u.y),w=u.phase==="loading"&&m!==void 0&&m.dist<.5?m.stop:void 0,_=w!==void 0&&w.waiting_up>=w.waiting_down,E=_?0:1e4;if(h&&g!==void 0&&w!==void 0){const S=u.riders-h.riders;if(S>0&&d.set(w.entity_id,(d.get(w.entity_id)??0)+S),S!==0){const k=i(w.y),b=this.#C.get(u.id)??r.carW,C=b>=r.figureStride*3,I=Math.min(Math.abs(S),6);if(S>0){const T=o.get(u.id),R=T!==void 0?T.end-2:g-20,A=_?Co:To,M=this.#u.get(w.entity_id);M!==void 0&&(M.delete(u.line),M.size===0&&this.#u.delete(w.entity_id)),ts(this.#c,{count:I,enablePairs:C,halfPairW:p,now:a,stagger:f,duration:c,originX:R,endX:g,floorY:k,color:A,stopId:w.entity_id,dirOffset:E})}else{const T=this.#T.get(u.id)??Ct,R=g+b/2+14,A=h.roster.slice(Math.max(0,h.roster.length-I));os(this.#c,{count:I,enablePairs:C,halfPairW:p,now:a,stagger:f,duration:c,startX:g,endX:R,floorY:k,color:T,variants:A,carId:u.id})}}}let y;if(h){const S=u.riders-h.riders;if(S===0)y=h.roster;else if(y=h.roster.slice(),S>0&&w!==void 0)for(let k=0;k<S;k++)y.push(Y(w.entity_id,k+E));else if(S>0)for(let k=0;k<S;k++)y.push(Y(u.id,y.length+k));else y.splice(y.length+S,-S)}else{y=[];for(let S=0;S<u.riders;S++)y.push(Y(u.id,S))}for(;y.length>u.riders;)y.pop();for(;y.length<u.riders;)y.push(Y(u.id,y.length));this.#o.set(u.id,{riders:u.riders,roster:y})}for(const u of t.stops){const h=u.waiting_up+u.waiting_down,g=this.#l.get(u.entity_id);if(g){const m=g.waiting-h,w=d.get(u.entity_id)??0,_=Math.max(0,m-w);_>0&&ns(this.#c,{count:Math.min(_,4),now:a,stagger:f,duration:c*2.2,startX:r.padX+r.labelW+20,endX:r.padX+r.labelW-16,floorY:i(u.y),color:Ro,stopId:u.entity_id})}this.#l.set(u.entity_id,{waiting:h})}{let u=0;for(let h=0;h<this.#c.length;h++){const g=this.#c[h];g!==void 0&&a-g.bornAt<=g.duration&&(this.#c[u++]=g)}this.#c.length=u}if(this.#o.size>t.cars.length)for(const u of this.#o.keys())this.#v.has(u)||this.#o.delete(u);if(this.#l.size>t.stops.length)for(const u of this.#l.keys())this.#k.has(u)||this.#l.delete(u)}}const is="#f59e0b",rs=3;function as(){const e="quest-pane";return{root:P("quest-pane",e),gridView:P("quest-grid",e),stageView:P("quest-stage-view",e),backBtn:P("quest-back-to-grid",e),title:P("quest-stage-title",e),brief:P("quest-stage-brief",e),stageStars:P("quest-stage-stars",e),editorHost:P("quest-editor",e),runBtn:P("quest-run",e),resetBtn:P("quest-reset",e),result:P("quest-result",e),progress:P("quest-progress",e),shaft:P("quest-shaft",e),shaftIdle:P("quest-shaft-idle",e)}}function At(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=Fe(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(rs-n)}function Mt(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function ss(e){const t=as(),n=b=>{const C=Ir(b);if(C)return C;const I=oe[0];if(!I)throw new Error("quest-pane: stage registry is empty");return I},o=qr(n(e.initialStageId),"grid");At(t,o.activeStage);const i=Wr();vn(i,o.activeStage);const r=Nr();kn(r,o.activeStage);const s=Gr();kt(s,o.activeStage);const a=Br(),l=new Lo(t.shaft,is);t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const c=await Hi({container:t.editorHost,initialValue:gn(o.activeStage.id)??o.activeStage.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const f=Ur(),p=300;let d=null,u=!1;const h=()=>{u||(d!==null&&clearTimeout(d),d=setTimeout(()=>{mn(o.activeStage.id,c.getValue()),d=null},p))},g=()=>{d!==null&&(clearTimeout(d),d=null,mn(o.activeStage.id,c.getValue()))},m=b=>{u=!0;try{c.setValue(b)}finally{u=!1}};c.onDidChange(()=>{h()});const w=Vr();Tn(w,o.activeStage,c);const _=()=>{_n(o),t.shaftIdle.hidden=!1;const b=t.shaft.getContext("2d");b&&b.clearRect(0,0,t.shaft.width,t.shaft.height)},E=(b,{fromGrid:C})=>{g(),Hr(o,b),At(t,b),vn(i,b),kn(r,b),kt(s,b),Tn(w,b,c),m(gn(b.id)??b.starterCode),c.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",_(),Mt(t,"stage"),wt(o,"stage"),e.onStageChange?.(b.id)},y=()=>{g(),_(),t.result.textContent="",t.progress.textContent="",Mt(t,"grid"),wt(o,"grid"),vt(a,b=>{E(n(b),{fromGrid:!0})}),e.onBackToGrid?.()};vt(a,b=>{E(n(b),{fromGrid:!0})});const S=e.landOn??"grid";Mt(t,S),wt(o,S);const k=async()=>{const b=o.activeStage;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",c.clearRuntimeMarker();let C=null,I=0;o.runLoop.active=!0;const T=()=>{o.runLoop.active&&(C!==null&&l.draw(C,1),requestAnimationFrame(T))};t.shaftIdle.hidden=!0,requestAnimationFrame(T);try{const R=await Dr(b,c.getValue(),{timeoutMs:1e3,onProgress:A=>{ke(o,b)&&(t.progress.textContent=Or(A))},onSnapshot:A=>{C=A,I+=1}});if(R.passed){const A=Fe(b.id);R.stars>A&&(xr(b.id,R.stars),vt(a,M=>{E(n(M),{fromGrid:!0})}),ke(o,b)&&At(t,o.activeStage)),ke(o,b)&&kt(s,o.activeStage,{collapse:!1})}if(ke(o,b)){t.result.textContent="",t.progress.textContent="";const A=R.passed?Ar(b.id):void 0,M=A?()=>{E(A,{fromGrid:!1})}:void 0;jr(f,R,()=>void k(),b.failHint,M)}}catch(R){if(ke(o,b)){const A=R instanceof Error?R.message:String(R);t.result.textContent=`Error: ${A}`,t.progress.textContent="",R instanceof yo&&R.location!==null&&c.setRuntimeMarker({line:R.location.line,column:R.location.column,message:A})}}finally{if(t.runBtn.disabled=!1,_n(o),I===0){const R=t.shaft.getContext("2d");R&&R.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{k()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${o.activeStage.title} to its starter code?`)&&(Mr(o.activeStage.id),m(o.activeStage.starterCode),c.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{y()}),{handles:t,editor:c}}let xt=null;async function Bo(){if(!xt){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;xt=import(e).then(async n=>(await n.default(t),n))}return xt}class Jt{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,o){const i=await Bo();return new Jt(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class Fo{#e;#t=0;#n=[];#i=0;#r=0;#a=1;#d=0;constructor(t){this.#e=ls(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#i=t.reduce((n,o)=>n+o.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#a=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const o=t.stops.filter(a=>a.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#a/60*i,this.#r=(this.#r+i)%(this.#i||1);const s=[];for(;this.#t>=1;)this.#t-=1,s.push(this.#s(o,r));return s}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,o]of this.#n.entries())if(t-=o.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#i<=0?0:Math.min(1,this.#r/this.#i)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#n}#s(t,n){const o=this.#o(t.length,n.originWeights);let i=this.#o(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],s=t[i];if(!r||!s)throw new Error("stop index out of bounds");const a=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:s.stop_id,weight:a,...this.#d>0?{patienceTicks:this.#d}:{}}}#o(t,n){if(!n||n.length!==t)return this.#c(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#c(t);let i=this.#p()*o;for(const[r,s]of n.entries())if(i-=Math.max(0,s),i<0)return r;return t-1}#l(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#c(t){return Number(this.#l()%BigInt(t))}#p(){return Number(this.#l()>>11n)/2**53}}function ls(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const cs="#7dd3fc",ds="#fda4af";async function $n(e,t,n,o,i){const r=ii(o,i),s=await Jt.create(r,t,n),a=new Lo(e.canvas,e.accent);if(a.setTetherConfig(o.tether??null),o.tether){const c=Yt(o,i);a.setTetherPhysics(c.maxSpeed,c.acceleration,c.deceleration)}const l=e.canvas.parentElement;if(l){const c=o.stops.length,p=o.tether?640:Math.max(200,c*16);l.style.setProperty("--shaft-min-h",`${p}px`)}return{strategy:t,sim:s,renderer:a,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function Ce(e){e?.sim.dispose(),e?.renderer.dispose()}function $o(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const ps=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],us=120;function Dn(e,t,n){const o=e.sim.metrics();e.latestMetrics=o;for(const r of ps){const s=e.metricHistory[r];s.push(o[r]),s.length>us&&s.shift()}const i=performance.now();for(const[r,s]of e.bubbles)s.expiresAt<=i&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const fs={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},hs=1e3;function gs(e,t,n){const o=performance.now(),i=new Map;for(const s of n.stops)i.set(s.entity_id,s.name);const r=s=>i.get(s)??`stop #${s}`;for(const s of t){const a=ms(s,r);if(a===null)continue;const l=s.elevator;if(l===void 0)continue;const c=fs[s.kind]??hs;e.bubbles.set(l,{glyph:a.glyph,text:a.text,bornAt:o,expiresAt:o+c})}}function ms(e,t){switch(e.kind){case"elevator-assigned":return{glyph:"›",text:`To ${t(e.stop)}`};case"elevator-repositioning":return{glyph:"↻",text:`Reposition to ${t(e.stop)}`};case"elevator-arrived":return{glyph:"●",text:`At ${t(e.stop)}`};case"door-opened":return{glyph:"◌",text:"Doors open"};case"rider-boarded":return{glyph:"+",text:"Boarding"};case"rider-exited":return{glyph:"↓",text:`Off at ${t(e.stop)}`};default:return null}}const bs={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function On(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=bs[t],e.modeEl.title=t)}function ys(){const e=a=>{const l=document.getElementById(a);if(!l)throw new Error(`missing element #${a}`);return l},t=a=>document.getElementById(a),n=(a,l)=>({root:e(`pane-${a}`),canvas:e(`shaft-${a}`),name:e(`name-${a}`),mode:e(`mode-${a}`),desc:e(`desc-${a}`),metrics:e(`metrics-${a}`),trigger:e(`strategy-trigger-${a}`),popover:e(`strategy-popover-${a}`),repoTrigger:e(`repo-trigger-${a}`),repoName:e(`repo-name-${a}`),repoPopover:e(`repo-popover-${a}`),accent:l,which:a}),o=a=>{const l=document.querySelector(`.tweak-row[data-key="${a}"]`);if(!l)throw new Error(`missing tweak row for ${a}`);const c=p=>{const d=l.querySelector(p);if(!d)throw new Error(`missing ${p} in tweak row ${a}`);return d},f=p=>l.querySelector(p);return{root:l,value:c(".tweak-value"),defaultV:c(".tweak-default-v"),dec:c(".tweak-dec"),inc:c(".tweak-inc"),reset:c(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},i={};for(const a of me)i[a]=o(a);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",cs),paneB:n("b",ds)};Ei(r);const s=document.getElementById("controls-bar");return s&&new ResizeObserver(([l])=>{if(!l)return;const c=Math.ceil(l.borderBoxSize[0]?.blockSize??l.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${c}px`)}).observe(s),r}function Do(e,t,n,o,i,r,s,a,l){const c=document.createDocumentFragment();for(const f of t){const p=document.createElement("button");p.type="button",p.className="strategy-option",p.setAttribute("role","menuitemradio"),p.setAttribute("aria-checked",f===r?"true":"false"),p.dataset[i]=f;const d=document.createElement("span");d.className="strategy-option-name";const u=document.createElement("span");if(u.className="strategy-option-label",u.textContent=n[f],d.appendChild(u),s&&f===s){const g=document.createElement("span");g.className="strategy-option-sibling",g.textContent=`also in ${a}`,d.appendChild(g)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=o[f],p.append(d,h),p.addEventListener("click",()=>{l(f)}),c.appendChild(p)}e.replaceChildren(c)}function ie(e,t){const n=Le[t],o=go[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function Wn(e,t,n,o,i){Do(e.repoPopover,Ci,Le,go,"reposition",t,n,o,i)}function Ie(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;Wn(t.paneA,o,r?i:null,"B",s=>void qn(e,t,"a",s,n)),Wn(t.paneB,i,r?o:null,"A",s=>void qn(e,t,"b",s,n))}function Ht(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function Oo(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function Gt(e){Ht(e.paneA,!1),Ht(e.paneB,!1)}function st(e){jt(e),Gt(e)}function Nn(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;st(t),r&&(Ie(e,t,o),Ht(n,!0))})}async function qn(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){Gt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},ie(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},ie(t.paneB,o)),N(e.permalink),Ie(e,t,i),Gt(t),await i(),G(t.toast,`${n==="a"?"A":"B"} park: ${Le[o]}`)}function Ss(e){document.addEventListener("click",t=>{if(!Wo(e)&&!Oo(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;st(e)}})}function re(e,t){const n=ge[t],o=ho[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function Hn(e,t,n,o,i){Do(e.popover,_i,ge,ho,"strategy",t,n,o,i)}function Ae(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;Hn(t.paneA,o,r?i:null,"B",s=>void Un(e,t,"a",s,n)),Hn(t.paneB,i,r?o:null,"A",s=>void Un(e,t,"b",s,n))}function Ut(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function Wo(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function jt(e){Ut(e.paneA,!1),Ut(e.paneB,!1)}function Gn(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;st(t),r&&(Ae(e,t,o),Ut(n,!0))})}async function Un(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){jt(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},re(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},re(t.paneB,o)),N(e.permalink),Ae(e,t,i),jt(t),await i(),G(t.toast,`${n==="a"?"A":"B"}: ${ge[o]}`)}function jn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function vs(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function lt(e,t,n){let o=!1;for(const i of me){const r=n.tweakRows[i],s=e.tweakRanges[i],a=te(e,i,t),l=zt(e,i),c=Vt(e,i,a);c&&(o=!0),r.value.textContent=jn(i,a),r.defaultV.textContent=jn(i,l),r.dec.disabled=a<=s.min+1e-9,r.inc.disabled=a>=s.max-1e-9,r.root.dataset.overridden=String(c),r.reset.hidden=!c;const f=Math.max(s.max-s.min,1e-9),p=Math.max(0,Math.min(1,(a-s.min)/f)),d=Math.max(0,Math.min(1,(l-s.min)/f));r.trackFill&&(r.trackFill.style.width=`${(p*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(p*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function No(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function Zt(e,t,n,o){const i=Yt(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},s=[e.paneA,e.paneB].filter(l=>l!==null),a=s.every(l=>l.sim.applyPhysicsLive(r));if(a)for(const l of s)l.renderer?.setTetherPhysics(i.maxSpeed,i.acceleration,i.deceleration);lt(n,e.permalink.overrides,t),a||o()}function ws(e,t,n){return Math.min(n,Math.max(t,e))}function ks(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function Ge(e,t,n,o,i){const r=q(e.permalink.scenario),s=r.tweakRanges[n],a=te(r,n,e.permalink.overrides),l=ws(a+o*s.step,s.min,s.max),c=ks(l,s.min,s.step);Ts(e,t,n,c,i)}function _s(e,t,n,o){const i=q(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},N(e.permalink),n==="cars"?(o(),G(t.toast,"Cars reset")):(Zt(e,t,i,o),G(t.toast,`${vs(n)} reset`))}async function Cs(e,t,n){const o=q(e.permalink.scenario),i=Vt(o,"cars",te(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},N(e.permalink),i?await n():Zt(e,t,o,n),G(t.toast,"Parameters reset")}function Ts(e,t,n,o,i){const r=q(e.permalink.scenario),s={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:ro(r,s)},N(e.permalink),n==="cars"?i():Zt(e,t,r,i)}function Rs(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Es(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var je={exports:{}},Is=je.exports,Xn;function As(){return Xn||(Xn=1,(function(e){(function(t,n,o){function i(l){var c=this,f=a();c.next=function(){var p=2091639*c.s0+c.c*23283064365386963e-26;return c.s0=c.s1,c.s1=c.s2,c.s2=p-(c.c=p|0)},c.c=1,c.s0=f(" "),c.s1=f(" "),c.s2=f(" "),c.s0-=f(l),c.s0<0&&(c.s0+=1),c.s1-=f(l),c.s1<0&&(c.s1+=1),c.s2-=f(l),c.s2<0&&(c.s2+=1),f=null}function r(l,c){return c.c=l.c,c.s0=l.s0,c.s1=l.s1,c.s2=l.s2,c}function s(l,c){var f=new i(l),p=c&&c.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,p&&(typeof p=="object"&&r(p,f),d.state=function(){return r(f,{})}),d}function a(){var l=4022871197,c=function(f){f=String(f);for(var p=0;p<f.length;p++){l+=f.charCodeAt(p);var d=.02519603282416938*l;l=d>>>0,d-=l,d*=l,l=d>>>0,d-=l,l+=d*4294967296}return(l>>>0)*23283064365386963e-26};return c}n&&n.exports?n.exports=s:this.alea=s})(Is,e)})(je)),je.exports}var Xe={exports:{}},Ms=Xe.exports,zn;function xs(){return zn||(zn=1,(function(e){(function(t,n,o){function i(a){var l=this,c="";l.x=0,l.y=0,l.z=0,l.w=0,l.next=function(){var p=l.x^l.x<<11;return l.x=l.y,l.y=l.z,l.z=l.w,l.w^=l.w>>>19^p^p>>>8},a===(a|0)?l.x=a:c+=a;for(var f=0;f<c.length+64;f++)l.x^=c.charCodeAt(f)|0,l.next()}function r(a,l){return l.x=a.x,l.y=a.y,l.z=a.z,l.w=a.w,l}function s(a,l){var c=new i(a),f=l&&l.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=s:this.xor128=s})(Ms,e)})(Xe)),Xe.exports}var ze={exports:{}},Ps=ze.exports,Vn;function Ls(){return Vn||(Vn=1,(function(e){(function(t,n,o){function i(a){var l=this,c="";l.next=function(){var p=l.x^l.x>>>2;return l.x=l.y,l.y=l.z,l.z=l.w,l.w=l.v,(l.d=l.d+362437|0)+(l.v=l.v^l.v<<4^(p^p<<1))|0},l.x=0,l.y=0,l.z=0,l.w=0,l.v=0,a===(a|0)?l.x=a:c+=a;for(var f=0;f<c.length+64;f++)l.x^=c.charCodeAt(f)|0,f==c.length&&(l.d=l.x<<10^l.x>>>4),l.next()}function r(a,l){return l.x=a.x,l.y=a.y,l.z=a.z,l.w=a.w,l.v=a.v,l.d=a.d,l}function s(a,l){var c=new i(a),f=l&&l.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=s:this.xorwow=s})(Ps,e)})(ze)),ze.exports}var Ve={exports:{}},Bs=Ve.exports,Yn;function Fs(){return Yn||(Yn=1,(function(e){(function(t,n,o){function i(a){var l=this;l.next=function(){var f=l.x,p=l.i,d,u;return d=f[p],d^=d>>>7,u=d^d<<24,d=f[p+1&7],u^=d^d>>>10,d=f[p+3&7],u^=d^d>>>3,d=f[p+4&7],u^=d^d<<7,d=f[p+7&7],d=d^d<<13,u^=d^d<<9,f[p]=u,l.i=p+1&7,u};function c(f,p){var d,u=[];if(p===(p|0))u[0]=p;else for(p=""+p,d=0;d<p.length;++d)u[d&7]=u[d&7]<<15^p.charCodeAt(d)+u[d+1&7]<<13;for(;u.length<8;)u.push(0);for(d=0;d<8&&u[d]===0;++d);for(d==8?u[7]=-1:u[d],f.x=u,f.i=0,d=256;d>0;--d)f.next()}c(l,a)}function r(a,l){return l.x=a.x.slice(),l.i=a.i,l}function s(a,l){a==null&&(a=+new Date);var c=new i(a),f=l&&l.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(f.x&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=s:this.xorshift7=s})(Bs,e)})(Ve)),Ve.exports}var Ye={exports:{}},$s=Ye.exports,Kn;function Ds(){return Kn||(Kn=1,(function(e){(function(t,n,o){function i(a){var l=this;l.next=function(){var f=l.w,p=l.X,d=l.i,u,h;return l.w=f=f+1640531527|0,h=p[d+34&127],u=p[d=d+1&127],h^=h<<13,u^=u<<17,h^=h>>>15,u^=u>>>12,h=p[d]=h^u,l.i=d,h+(f^f>>>16)|0};function c(f,p){var d,u,h,g,m,w=[],_=128;for(p===(p|0)?(u=p,p=null):(p=p+"\0",u=0,_=Math.max(_,p.length)),h=0,g=-32;g<_;++g)p&&(u^=p.charCodeAt((g+32)%p.length)),g===0&&(m=u),u^=u<<10,u^=u>>>15,u^=u<<4,u^=u>>>13,g>=0&&(m=m+1640531527|0,d=w[g&127]^=u+m,h=d==0?h+1:0);for(h>=128&&(w[(p&&p.length||0)&127]=-1),h=127,g=512;g>0;--g)u=w[h+34&127],d=w[h=h+1&127],u^=u<<13,d^=d<<17,u^=u>>>15,d^=d>>>12,w[h]=u^d;f.w=m,f.X=w,f.i=h}c(l,a)}function r(a,l){return l.i=a.i,l.w=a.w,l.X=a.X.slice(),l}function s(a,l){a==null&&(a=+new Date);var c=new i(a),f=l&&l.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(f.X&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=s:this.xor4096=s})($s,e)})(Ye)),Ye.exports}var Ke={exports:{}},Os=Ke.exports,Qn;function Ws(){return Qn||(Qn=1,(function(e){(function(t,n,o){function i(a){var l=this,c="";l.next=function(){var p=l.b,d=l.c,u=l.d,h=l.a;return p=p<<25^p>>>7^d,d=d-u|0,u=u<<24^u>>>8^h,h=h-p|0,l.b=p=p<<20^p>>>12^d,l.c=d=d-u|0,l.d=u<<16^d>>>16^h,l.a=h-p|0},l.a=0,l.b=0,l.c=-1640531527,l.d=1367130551,a===Math.floor(a)?(l.a=a/4294967296|0,l.b=a|0):c+=a;for(var f=0;f<c.length+20;f++)l.b^=c.charCodeAt(f)|0,l.next()}function r(a,l){return l.a=a.a,l.b=a.b,l.c=a.c,l.d=a.d,l}function s(a,l){var c=new i(a),f=l&&l.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=s:this.tychei=s})(Os,e)})(Ke)),Ke.exports}var Qe={exports:{}};const Ns={},qs=Object.freeze(Object.defineProperty({__proto__:null,default:Ns},Symbol.toStringTag,{value:"Module"})),Hs=Es(qs);var Gs=Qe.exports,Jn;function Us(){return Jn||(Jn=1,(function(e){(function(t,n,o){var i=256,r=6,s=52,a="random",l=o.pow(i,r),c=o.pow(2,s),f=c*2,p=i-1,d;function u(y,S,k){var b=[];S=S==!0?{entropy:!0}:S||{};var C=w(m(S.entropy?[y,E(n)]:y??_(),3),b),I=new h(b),T=function(){for(var R=I.g(r),A=l,M=0;R<c;)R=(R+M)*i,A*=i,M=I.g(1);for(;R>=f;)R/=2,A/=2,M>>>=1;return(R+M)/A};return T.int32=function(){return I.g(4)|0},T.quick=function(){return I.g(4)/4294967296},T.double=T,w(E(I.S),n),(S.pass||k||function(R,A,M,D){return D&&(D.S&&g(D,I),R.state=function(){return g(I,{})}),M?(o[a]=R,A):R})(T,C,"global"in S?S.global:this==o,S.state)}function h(y){var S,k=y.length,b=this,C=0,I=b.i=b.j=0,T=b.S=[];for(k||(y=[k++]);C<i;)T[C]=C++;for(C=0;C<i;C++)T[C]=T[I=p&I+y[C%k]+(S=T[C])],T[I]=S;(b.g=function(R){for(var A,M=0,D=b.i,O=b.j,W=b.S;R--;)A=W[D=p&D+1],M=M*i+W[p&(W[D]=W[O=p&O+A])+(W[O]=A)];return b.i=D,b.j=O,M})(i)}function g(y,S){return S.i=y.i,S.j=y.j,S.S=y.S.slice(),S}function m(y,S){var k=[],b=typeof y,C;if(S&&b=="object")for(C in y)try{k.push(m(y[C],S-1))}catch{}return k.length?k:b=="string"?y:y+"\0"}function w(y,S){for(var k=y+"",b,C=0;C<k.length;)S[p&C]=p&(b^=S[p&C]*19)+k.charCodeAt(C++);return E(S)}function _(){try{var y;return d&&(y=d.randomBytes)?y=y(i):(y=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(y)),E(y)}catch{var S=t.navigator,k=S&&S.plugins;return[+new Date,t,k,t.screen,E(n)]}}function E(y){return String.fromCharCode.apply(0,y)}if(w(o.random(),n),e.exports){e.exports=u;try{d=Hs}catch{}}else o["seed"+a]=u})(typeof self<"u"?self:Gs,[],Math)})(Qe)),Qe.exports}var Pt,Zn;function js(){if(Zn)return Pt;Zn=1;var e=As(),t=xs(),n=Ls(),o=Fs(),i=Ds(),r=Ws(),s=Us();return s.alea=e,s.xor128=t,s.xorwow=n,s.xorshift7=o,s.xor4096=i,s.tychei=r,Pt=s,Pt}var Xs=js();const zs=Rs(Xs),ot=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],Lt=ot.reduce((e,t)=>t.length<e.length?t:e).length,Bt=ot.reduce((e,t)=>t.length>e.length?t:e).length;function Vs(e){const t=e?.seed?new zs(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let u=typeof n!="number"?Lt:a(n);const h=typeof o!="number"?Bt:a(o);u>h&&(u=h);let g=!1,m;for(;!g;)m=s(),g=m.length<=h&&m.length>=u;return m}function s(){return ot[l(ot.length)]}function a(u){return u<Lt&&(u=Lt),u>Bt&&(u=Bt),u}function l(u){const h=t?t():Math.random();return Math.floor(h*u)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=u=>u),typeof e.separator!="string"&&(e.separator=" ");const c=e.min+l(e.max+1-e.min);let f=[],p="",d=0;for(let u=0;u<c*e.wordsPerString;u++)d===e.wordsPerString-1?p+=e.formatter(r(),d):p+=e.formatter(r(),d)+e.separator,d++,(u+1)%e.wordsPerString===0&&(f.push(p),p="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const qo=e=>`${e}×`,Ho=e=>`${e.toFixed(1)}×`;function Go(){const e=Vs({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function Ys(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=qo(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=Ho(e.intensity),re(t.paneA,e.strategyA),re(t.paneB,e.strategyB),ie(t.paneA,e.repositionA),ie(t.paneB,e.repositionB),mo(t,e.scenario);const n=q(e.scenario);Object.keys(e.overrides).length>0&&No(t,!0),lt(n,e.overrides,t)}function Me(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function Uo(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function jo(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function Ks(e){if(e.length<2)return{d:"M 0 13 L 100 13",lastX:100,lastY:13};let t=e[0]??0,n=e[0]??0;for(let l=1;l<e.length;l++){const c=e[l];c!==void 0&&(c<t&&(t=c),c>n&&(n=c))}const o=n-t,i=e.length;let r="",s=0,a=7;for(let l=0;l<i;l++){const c=l/(i-1)*100,f=o>0?13-((e[l]??0)-t)/o*12:7;r+=`${l===0?"M":"L"} ${c.toFixed(2)} ${f.toFixed(2)} `,s=c,a=f}return{d:r.trim(),lastX:s,lastY:a}}const Ft="http://www.w3.org/2000/svg",Xt=[["wait avg","avg_wait_s"],["wait max","max_wait_s"],["delivered","delivered"],["abandoned","abandoned"],["util","utilization"]];function Qs(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Js(e,t,n){const o=eo(e,n),i=eo(t,n),r=o-i,s=r>0?"▴":"▾",a=r>0?"+":r<0?"−":"",l=Math.abs(r);switch(n){case"avg_wait_s":case"max_wait_s":return`${s} ${a}${l.toFixed(1)} s`;case"delivered":case"abandoned":return`${s} ${a}${l.toFixed(0)}`;case"utilization":return`${s} ${a}${(l*100).toFixed(0)}%`}}function eo(e,t){switch(t){case"avg_wait_s":return e.avg_wait_s;case"max_wait_s":return e.max_wait_s;case"delivered":return e.delivered;case"abandoned":return e.abandoned;case"utilization":return e.utilization}}function Zs(e,t){const n=(u,h,g,m)=>Math.abs(u-h)<g?["tie","tie"]:(m?u>h:u<h)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,s]=n(e.max_wait_s,t.max_wait_s,.05,!1),[a,l]=n(e.delivered,t.delivered,.5,!0),[c,f]=n(e.abandoned,t.abandoned,.5,!1),[p,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:a,abandoned:c,utilization:p},b:{avg_wait_s:i,max_wait_s:s,delivered:l,abandoned:f,utilization:d}}}function to(e){const t=document.createDocumentFragment();for(const[n]of Xt){const o=ee("div","metric-row"),i=document.createElementNS(Ft,"svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS(Ft,"path"));const r=document.createElementNS(Ft,"circle");r.classList.add("metric-spark-dot"),r.setAttribute("r","1.4"),i.appendChild(r),o.append(ee("span","metric-k",n),ee("span","metric-v"),ee("span","metric-d"),i),t.appendChild(o)}e.replaceChildren(t)}function $t(e,t,n,o,i){const r=e.children;for(let s=0;s<Xt.length;s++){const a=r[s];if(!a)continue;const l=Xt[s];if(!l)continue;const c=l[1],f=n?n[c]:"";a.dataset.verdict!==f&&(a.dataset.verdict=f);const p=a.children[1],d=Qs(t,c);p.textContent!==d&&(p.textContent=d);const u=a.children[2],g=i!==null&&f!=="tie"&&f!==""?Js(t,i,c):"";u.textContent!==g&&(u.textContent=g);const m=a.children[3],w=m.firstElementChild,_=m.children[1],E=Ks(o[c]);w.getAttribute("d")!==E.d&&w.setAttribute("d",E.d);const y=E.lastX.toFixed(2),S=E.lastY.toFixed(2);_.getAttribute("cx")!==y&&_.setAttribute("cx",y),_.getAttribute("cy")!==S&&_.setAttribute("cy",S)}}const el=200;function Xo(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function Z(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=q(e.permalink.scenario);e.traffic=new Fo(fo(e.permalink.seed)),Xo(e,o),Ce(e.paneA),Ce(e.paneB),e.paneA=null,e.paneB=null;try{const i=await $n(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);re(t.paneA,e.permalink.strategyA),ie(t.paneA,e.permalink.repositionA),to(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await $n(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),re(t.paneB,e.permalink.strategyB),ie(t.paneB,e.permalink.repositionB),to(t.paneB.metrics)}catch(s){throw Ce(i),s}if(n!==e.initToken){Ce(i),Ce(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,Uo(e,t),jo(e,t),lt(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&G(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function tl(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<el&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if($o(e,s=>{const a=s.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);a.kind==="err"&&console.warn(`spawnRider failed (seed): ${a.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(Xo(e,q(e.permalink.scenario)),e.seeding=null)}function nl(e,t){const n=()=>Z(e,t),o={renderPaneStrategyInfo:re,renderPaneRepositionInfo:ie,refreshStrategyPopovers:()=>{Ae(e,t,n),Ie(e,t,n)},renderTweakPanel:()=>{const r=q(e.permalink.scenario);lt(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const s=r.target;if(!(s instanceof HTMLElement))return;const a=s.closest(".scenario-card");if(!a)return;const l=a.dataset.scenarioId;!l||l===e.permalink.scenario||bo(e,t,l,n,o)}),Gn(e,t,t.paneA,n),Gn(e,t,t.paneB,n),Nn(e,t,t.paneA,n),Nn(e,t,t.paneB,n),Ae(e,t,n),Ie(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},N(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",Ae(e,t,n),Ie(e,t,n),Z(e,t).then(()=>{G(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||F.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},N(e.permalink),Z(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=Go();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},N(e.permalink),Z(e,t).then(()=>{G(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=qo(r)}),t.speedInput.addEventListener("change",()=>{N(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=Ho(r)}),t.intensityInput.addEventListener("change",()=>{N(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{Z(e,t),G(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";No(t,r)});for(const r of me){const s=t.tweakRows[r];an(s.dec,()=>{Ge(e,t,r,-1,n)}),an(s.inc,()=>{Ge(e,t,r,1,n)}),s.reset.addEventListener("click",()=>{_s(e,t,r,n)}),s.root.addEventListener("keydown",a=>{a.key==="ArrowUp"||a.key==="ArrowRight"?(a.preventDefault(),Ge(e,t,r,1,n)):(a.key==="ArrowDown"||a.key==="ArrowLeft")&&(a.preventDefault(),Ge(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{Cs(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=uo(e.permalink),s=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(s).then(()=>{G(t.toast,"Permalink copied")},()=>{G(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{Me(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{Me(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&Me(t,!1)}),ol(e,t,o),Ss(t)}function ol(e,t,n){window.addEventListener("keydown",o=>{if(e.permalink.mode==="quest")return;if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable||o.target.closest(".monaco-editor"))return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),Me(t,t.shortcutSheet.hidden);return}case"Escape":{if(Wo(t)||Oo(t)){o.preventDefault(),st(t);return}t.shortcutSheet.hidden||(o.preventDefault(),Me(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=Pe.length){const r=Pe[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),bo(e,t,r.id,()=>Z(e,t),n))}})}const il="elevator-core playground",no="In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";function oo(e){ti(rl(e))}function rl(e){if(e.mode==="quest")return{title:`Quest curriculum — ${il}`,description:"Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time."};const n=q(e.scenario).label,o=ge[e.strategyA],i=ge[e.strategyB],r=Le[e.repositionA],s=Le[e.repositionB];if(e.compare){const c=`${n}: ${o} vs ${i} — Elevator dispatch playground`,f=`Compare ${o} (parking: ${r}) against ${i} (parking: ${s}) dispatch on the ${n.toLowerCase()} scenario. ${no}`;return{title:c,description:f}}const a=`${n}: ${o} dispatch — Elevator dispatch playground`,l=`Watch ${o} dispatch (parking: ${r}) handle live rider traffic on the ${n.toLowerCase()} scenario. ${no}`;return{title:a,description:l}}function io(e,t){e.sim.step(t);const n=e.sim.drainEvents();if(n.length===0)return null;const o=e.sim.snapshot();gs(e,n,o);const i=new Map;for(const r of o.cars)i.set(r.id,r.line);for(const r of n)if(r.kind==="elevator-assigned"){const s=i.get(r.elevator);s!==void 0&&e.renderer.pushAssignment(r.stop,r.elevator,s)}return o}function al(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=Zs(t.latestMetrics,n.latestMetrics);$t(t.metricsEl,t.latestMetrics,o.a,t.metricHistory,n.latestMetrics),$t(n.metricsEl,n.latestMetrics,o.b,n.metricHistory,t.latestMetrics)}else $t(t.metricsEl,t.latestMetrics,null,t.metricHistory,null);On(t),n&&On(n)}function sl(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const s=e.paneA,a=e.paneB,l=s!==null&&(!e.permalink.compare||a!==null);if(e.running&&e.ready&&l){const c=e.permalink.speed;let f=io(s,c);a&&io(a,c),e.seeding&&(tl(e),f=null);const d=Math.min(r,4/60)*c;let u=[];if(!e.seeding){const m=f??s.sim.snapshot();u=e.traffic.drainSpawns(m,d),f=m}for(const m of u)$o(e,w=>{const _=w.sim.spawnRider(m.originStopId,m.destStopId,m.weight,m.patienceTicks);_.kind==="err"&&console.warn(`spawnRider failed: ${_.error}`)});const h=e.permalink.speed,g=u.length>0||f===null?s.sim.snapshot():f;Dn(s,g,h),a&&Dn(a,a.sim.snapshot(),h),al(e),(n+=1)%4===0&&(Uo(e,t),jo(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function ll(){Bo().catch(()=>{});const t=ys(),n=new URLSearchParams(window.location.search).has("k"),o={...F,...wi(window.location.search)};if(!n){o.seed=Go();const a=new URL(window.location.href);a.searchParams.set("k",o.seed),window.history.replaceState(null,"",a.toString())}Ii(o);const i=q(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=ro(i,o.overrides),xi(o.mode),Pi(o.mode),Ys(o,t);const s={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new Fo(fo(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(nl(s,t),Si(oo),oo(o),ei(),await Z(s,t),s.ready=!0,sl(s,t),s.permalink.mode==="quest"){const a=new URLSearchParams(window.location.search).has("qs");await ss({initialStageId:s.permalink.questStage,landOn:a?"stage":"grid",onStageChange:l=>{s.permalink.questStage=l,N(s.permalink)},onBackToGrid:()=>{s.permalink.questStage=F.questStage,N(s.permalink)}})}}ll();export{et as _};
