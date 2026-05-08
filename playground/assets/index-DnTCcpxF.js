const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-FGdkgqcy.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function Z(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let tn=0;function G(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(tn),tn=window.setTimeout(()=>{e.classList.remove("show")},1600)}function nn(e,t){let i=0,r=0;const c=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",s=>{e.disabled||(s.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){c();return}t()},70)},380))}),e.addEventListener("pointerup",c),e.addEventListener("pointerleave",c),e.addEventListener("pointercancel",c),e.addEventListener("blur",c),e.addEventListener("click",s=>{s.pointerType||t()})}function Yo(){document.getElementById("seo-fallback")?.remove()}function Ko(e){document.title!==e.title&&(document.title=e.title),we('meta[name="description"]',"content",e.description),we('meta[property="og:title"]',"content",e.title),we('meta[property="og:description"]',"content",e.description),we('meta[name="twitter:title"]',"content",e.title),we('meta[name="twitter:description"]',"content",e.description)}function we(e,t,n){const o=document.querySelector(e);o&&o.getAttribute(t)!==n&&o.setAttribute(t,n)}function ee(e,t,n){const o=Ut(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return no(i,r.min,r.max)}function Ut(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return to(n.doorOpenTicks,n.doorTransitionTicks)}}function jt(e,t,n){const o=Ut(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function eo(e,t){const n={};for(const o of me){const i=t[o];i!==void 0&&jt(e,o,i)&&(n[o]=i)}return n}const me=["cars","maxSpeed","weightCapacity","doorCycleSec"];function Qo(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=to(n,o),r=no(n/(i*Je),.1,.9),c=Math.max(2,Math.round(t*Je)),s=Math.max(1,Math.round(c*r)),a=Math.max(1,Math.round((c-s)/2));return{openTicks:s,transitionTicks:a}}function to(e,t){return(e+2*t)/Je}function zt(e,t){const n=e.elevatorDefaults,o=ee(e,"maxSpeed",t),i=ee(e,"weightCapacity",t),r=ee(e,"doorCycleSec",t),{openTicks:c,transitionTicks:s}=Qo(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:c,doorTransitionTicks:s}}function Jo(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function Zo(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(ee(e,"cars",t)),i=zt(e,t),r=Jo(e.stops.length,o),c=e.stops.map((a,l)=>`        StopConfig(id: StopId(${l}), name: ${Ft(a.name)}, position: ${z(a.positionM)}),`).join(`
`),s=r.map((a,l)=>ti(l,i,a,ei(l,o))).join(`
`);return`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: ${Ft(e.buildingName)},
        stops: [
${c}
        ],
    ),
    elevators: [
${s}
    ],
    simulation: SimulationParams(ticks_per_second: ${z(Je)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${z(e.passengerWeightRange[0])}, ${z(e.passengerWeightRange[1])}),
    ),
)`}const Je=60;function no(e,t,n){return Math.min(n,Math.max(t,e))}function ei(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function ti(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${z(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${z(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${Ft(o)},
            max_speed: ${z(t.maxSpeed)}, acceleration: ${z(t.acceleration)}, deceleration: ${z(t.deceleration)},
            weight_capacity: ${z(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function Ft(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function z(e){return Number.isInteger(e)?`${e}.0`:String(e)}const oo={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function We(e){return Array.from({length:e},()=>1)}const le=5,ni=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:le},(e,t)=>t===le-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:We(le),destWeights:We(le)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:We(le),destWeights:We(le)}],oi={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:ni,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...oo,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},Ze=19,$t=16,Me=4,io=(1+Ze)*Me,Te=1,Re=41,Ee=42,ii=43;function j(e){return Array.from({length:ii},(t,n)=>e(n))}const de=e=>e===Te||e===Re||e===Ee,ri=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:j(e=>e===0?20:e===Te?2:e===Re?1.2:e===Ee?.2:.1),destWeights:j(e=>e===0?0:e===Te?.3:e===Re?.4:e===Ee?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:j(e=>de(e)?.5:1),destWeights:j(e=>de(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:j(e=>e===21?4:de(e)?.25:1),destWeights:j(e=>e===21?5:de(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:j(e=>e===0||e===Te||e===21?.3:e===Re?.4:e===Ee?1.2:1),destWeights:j(e=>e===0?20:e===Te?1:e===Re?.6:e===Ee?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:j(e=>de(e)?1.5:.2),destWeights:j(e=>de(e)?1.5:.2)}];function si(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let s=1;s<=Ze;s++){const a=1+s,l=s*Me;e.push(`        StopConfig(id: StopId(${a.toString().padStart(2," ")}), name: "Floor ${s}",    position: ${l.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${io.toFixed(1)}),`);for(let s=21;s<=20+$t;s++){const a=1+s,l=s*Me;e.push(`        StopConfig(id: StopId(${a}), name: "Floor ${s}",   position: ${l.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:Ze},(s,a)=>2+a),21],n=[21,...Array.from({length:$t},(s,a)=>22+a)],o=[1,21,38,39,40],i=[1,0,41,42],r=s=>s.map(a=>`StopId(${a})`).join(", "),c=(s,a,l,f)=>`                ElevatorConfig(
                    id: ${s}, name: "${a}",
                    max_speed: 4.5, acceleration: 2.0, deceleration: 2.5,
                    weight_capacity: ${f.toFixed(1)},
                    starting_stop: StopId(${l}),
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
${c(0,"Low 1",1,1800)}
${c(1,"Low 2",21,1800)}
                ],
            ),
            LineConfig(
                id: 1, name: "High bank",
                serves: [${r(n)}],
                elevators: [
${c(2,"High 1",21,1800)}
${c(5,"High 2",37,1800)}
                ],
            ),
            LineConfig(
                id: 2, name: "Executive",
                serves: [${r(o)}],
                elevators: [
${c(3,"VIP",1,350)}
                ],
            ),
            LineConfig(
                id: 3, name: "Service",
                serves: [${r(i)}],
                elevators: [
${c(4,"Service",1,350)}
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
)`}const ai=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:Ze},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*Me})),{name:"Sky Lobby",positionM:io},...Array.from({length:$t},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*Me})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],ci={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:ri,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:ai,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...oo,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:si()},on=1e5,rn=4e5,sn=35786e3,li=1e8,di=4;function He(e){return Array.from({length:di},(t,n)=>e(n))}const pi={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:He(e=>e===0?6:1),destWeights:He(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:He(e=>e===0?0:e===1?1:e===2?3:5),destWeights:He(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:on},{name:"LEO Transfer",positionM:rn},{name:"GEO Platform",positionM:sn}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:li,showDayNight:!1},ron:`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${on.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${rn.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${sn.toFixed(1)}),
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
)`},Pe=[ci,pi,oi];function W(e){const t=Pe.find(o=>o.id===e);if(t)return t;const n=Pe[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const ro={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},$={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},ui=["scan","look","nearest","etd","destination","rsr"],fi=["adaptive","predictive","lobby","spread","none"];function an(e,t){return e!==null&&ui.includes(e)?e:t}function cn(e,t){return e!==null&&fi.includes(e)?e:t}const Dt=new Set;function hi(e){return Dt.add(e),()=>Dt.delete(e)}function N(e){const t=so(e);if(window.location.search!==t){window.history.replaceState(null,"",t);for(const n of Dt)n(e)}}function gi(e,t){return e==="compare"||e==="quest"?e:t}function so(e){const t=new URLSearchParams;e.mode!==$.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==$.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=W(e.scenario).defaultReposition,o=n??$.repositionA,i=n??$.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of me){const c=e.overrides[r];c!==void 0&&Number.isFinite(c)&&t.set(ro[r],bi(c))}return`?${t.toString()}`}function mi(e){const t=new URLSearchParams(e),n={};for(const o of me){const i=t.get(ro[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:gi(t.get("m"),$.mode),questStage:(t.get("qs")??"").trim()||$.questStage,scenario:t.get("s")??$.scenario,strategyA:an(t.get("a")??t.get("d"),$.strategyA),strategyB:an(t.get("b"),$.strategyB),repositionA:cn(t.get("pa"),$.repositionA),repositionB:cn(t.get("pb"),$.repositionB),compare:t.has("c")?t.get("c")==="1":$.compare,seed:(t.get("k")??"").trim()||$.seed,intensity:ln(t.get("i"),$.intensity),speed:ln(t.get("x"),$.speed),overrides:n}}function ln(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function bi(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function ao(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const yi=["scan","look","nearest","etd","destination","rsr"],ge={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},co={scan:"Sweep end-to-end, reverse at each end.",look:"Sweep until last call, then reverse.",nearest:"Assign each call to the closest car.",etd:"Assign by estimated time-to-destination.",destination:"Riders enter destination at the lobby; the group optimises.",rsr:"ETD penalised by queue length."},Si=["adaptive","predictive","lobby","spread","none"],Le={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},lo={adaptive:"Switch by traffic mode; the default.",predictive:"Park near the most-active floor.",lobby:"Return idle cars to the lobby.",spread:"Fan idle cars across the shaft.",none:"Idle cars stay where they finished."},vi="scenario-card inline-flex items-center gap-1.5 px-2 py-1 border-b-2 border-b-transparent text-content-tertiary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:text-content aria-pressed:text-content aria-pressed:border-b-accent max-md:flex-none max-md:snap-start",wi="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function ki(e){const t=document.createDocumentFragment();Pe.forEach((n,o)=>{const i=Z("button",vi);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(Z("span","",n.label),Z("span",wi,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function po(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}async function uo(e,t,n,o,i){const r=W(n),c=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,s=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:c,repositionA:s,overrides:{}},N(e.permalink),i.renderPaneStrategyInfo(t.paneA,c),i.renderPaneRepositionInfo(t.paneA,s),i.refreshStrategyPopovers(),po(t,r.id),await o(),i.renderTweakPanel(),G(t.toast,`${r.label} · ${ge[c]}`)}function _i(e){const t=W(e.scenario);e.scenario=t.id}const Ci=["layout","scenario-picker","controls-bar","cabin-legend"],Ti=["quest-pane"];function Ri(e){const t=e==="quest";for(const n of Ci){const o=document.getElementById(n);o&&o.classList.toggle("hidden",t)}for(const n of Ti){const o=document.getElementById(n);o&&(o.classList.toggle("hidden",!t),o.classList.toggle("flex",t))}}function Ei(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const o of n){const i=o.dataset.mode===e;o.dataset.active=String(i),o.setAttribute("aria-pressed",String(i))}t.addEventListener("click",o=>{const i=o.target;if(!(i instanceof HTMLElement))return;const r=i.closest("button[data-mode]");if(!r)return;const c=r.dataset.mode;if(c!=="compare"&&c!=="quest"||c===e)return;const s=new URL(window.location.href);c==="compare"?(s.searchParams.delete("m"),s.searchParams.delete("qs")):s.searchParams.set("m",c),window.location.assign(s.toString())})}const Ii="modulepreload",Ai=function(e,t){return new URL(e,t).href},dn={},et=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let c=function(f){return Promise.all(f.map(u=>Promise.resolve(u).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const s=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),l=a?.nonce||a?.getAttribute("nonce");i=c(n.map(f=>{if(f=Ai(f,o),f in dn)return;dn[f]=!0;const u=f.endsWith(".css"),d=u?'[rel="stylesheet"]':"";if(!!o)for(let g=s.length-1;g>=0;g--){const m=s[g];if(m.href===f&&(!u||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=u?"stylesheet":Ii,u||(h.as="script"),h.crossOrigin="",h.href=f,l&&h.setAttribute("nonce",l),document.head.appendChild(h),u)return new Promise((g,m)=>{h.addEventListener("load",g),h.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(c){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=c,window.dispatchEvent(s),!s.defaultPrevented)throw c}return i.then(c=>{for(const s of c||[])s.status==="rejected"&&r(s.reason);return t().catch(r)})};class fo extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function xi(e){const t=(await et(async()=>{const{default:i}=await import("./worker-DE_xV-Fq.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new Mi(n);return await o.init(e),o}class Mi{#e;#t=new Map;#n=1;#i=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#c),this.#e.addEventListener("error",this.#o),this.#e.addEventListener("messageerror",this.#o)}async init(t){await this.#a({kind:"init",id:this.#s(),payload:this.#d(t)})}async tick(t,n){const o=n?.wantVisuals??!1;return this.#a({kind:"tick",id:this.#s(),ticks:t,...o?{wantVisuals:!0}:{}})}async spawnRider(t,n,o,i){return this.#a({kind:"spawn-rider",id:this.#s(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#a({kind:"set-strategy",id:this.#s(),strategy:t})}async loadController(t,n){const o=n?.unlockedApi??null,i=n?.timeoutMs,r=this.#a({kind:"load-controller",id:this.#s(),source:t,unlockedApi:o});if(i===void 0){await r;return}r.catch(()=>{});let c;const s=new Promise((a,l)=>{c=setTimeout(()=>{l(new Error(`controller did not return within ${i}ms`))},i)});try{await Promise.race([r,s])}finally{c!==void 0&&clearTimeout(c)}}async reset(t){await this.#a({kind:"reset",id:this.#s(),payload:this.#d(t)})}dispose(){this.#i||(this.#i=!0,this.#e.removeEventListener("message",this.#c),this.#e.removeEventListener("error",this.#o),this.#e.removeEventListener("messageerror",this.#o),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#s(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#a(t){if(this.#i)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#t.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#o=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#i=!0,this.#e.terminate(),this.#r(new Error(o))};#c=t=>{const n=t.data,o=this.#t.get(n.id);if(o)switch(this.#t.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":{const i=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;o.reject(i!==null?new fo(n.message,i):new Error(n.message));return}default:{const i=n.kind;o.reject(new Error(`WorkerSim: unknown reply kind "${String(i)}"`));return}}}}const Pi=`// Quest curriculum — sim global declaration.
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
`,pn="quest-runtime";let yt=null,pe=null;async function Li(){return yt||pe||(pe=(async()=>{await Bi();const e=await et(()=>import("./editor.main-FGdkgqcy.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return yt=e,e})(),pe.catch(()=>{pe=null}),pe)}async function Bi(){const[{default:e},{default:t}]=await Promise.all([et(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),et(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}function Fi(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(Pi,"ts:filename/quest-sim-globals.d.ts"))}function $i(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function Di(e){const t=await Li();Fi(t),$i(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o()});return{dispose:()=>{i.dispose()}}},insertAtCursor(o){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:o,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(o){const i=n.getModel();if(!i)return;const r=o.message.split(`
`)[0]??o.message;t.editor.setModelMarkers(i,pn,[{severity:8,message:r,startLineNumber:o.line,startColumn:o.column,endLineNumber:o.line,endColumn:o.column+1}]),n.revealLineInCenterIfOutsideViewport(o.line)},clearRuntimeMarker(){const o=n.getModel();o&&t.editor.setModelMarkers(o,pn,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const Oi=`SimConfig(
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
)`,qi={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:Oi,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},Ni=`SimConfig(
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
)`,Wi={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:Ni,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},Hi=`SimConfig(
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
)`,Gi={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:Hi,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},Ui=`SimConfig(
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
)`,ji={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:Ui,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function F(e,t){const n=t.startTick??0,o=t.intervalTicks??30,i=t.destinations;if(i.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,c)=>{const s=i[c%i.length];return{origin:t.origin,destination:s,atTick:n+c*o,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const zi=`SimConfig(
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
)`,Vi={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:zi,unlockedApi:["setStrategy"],seedRiders:[...F(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},Xi=`SimConfig(
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
)`,Yi=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,Ki={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:Xi,unlockedApi:["setStrategyJs"],seedRiders:[...F(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...F(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:Yi,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},Qi=`SimConfig(
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
)`,Ji={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:Qi,unlockedApi:["setStrategyJs"],seedRiders:[...F(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...F(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},Zi=`SimConfig(
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
)`,er=`// Stage 8 — Event-Driven
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
`,tr={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:Zi,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...F(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...F(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:er,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},nr=`SimConfig(
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
)`,or=`// Stage 9 — Take the Wheel
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
`,ir={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:nr,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...F(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:or,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},rr=`SimConfig(
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
)`,sr=`// Stage 10 — Patient Boarding
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
`,ar={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:rr,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...F(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:sr,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},cr=`SimConfig(
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
)`,lr=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,dr={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:cr,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...F(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...F(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:lr,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},pr=`SimConfig(
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
)`,ur=`// Stage 12 — Routes
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
`,fr={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:pr,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...F(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...F(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:ur,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},hr=`SimConfig(
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
)`,gr=`// Stage 13 — Transfer Points
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
`,mr={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:hr,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...F(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...F(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...F(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:gr,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},br=`SimConfig(
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
)`,yr=`// Stage 14 — Build a Floor
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
`,Sr={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:br,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...F(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:yr,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},vr=`SimConfig(
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
)`,wr=`// Stage 15 — Sky Lobby
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
`,kr={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:vr,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...F(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...F(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:wr,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},ne=[qi,Wi,Gi,ji,Vi,Ki,Ji,tr,ir,ar,dr,fr,mr,Sr,kr];function _r(e){return ne.find(t=>t.id===e)}function Cr(e){const t=ne.findIndex(n=>n.id===e);if(!(t<0))return ne[t+1]}function P(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function it(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const tt="quest:code:v1:",ho="quest:bestStars:v1:",go=5e4;function Be(){try{return globalThis.localStorage??null}catch{return null}}function un(e){const t=Be();if(!t)return null;try{const n=t.getItem(tt+e);if(n===null)return null;if(n.length>go){try{t.removeItem(tt+e)}catch{}return null}return n}catch{return null}}function fn(e,t){if(t.length>go)return;const n=Be();if(n)try{n.setItem(tt+e,t)}catch{}}function Tr(e){const t=Be();if(t)try{t.removeItem(tt+e)}catch{}}function Fe(e){const t=Be();if(!t)return 0;let n;try{n=t.getItem(ho+e)}catch{return 0}if(n===null)return 0;const o=Number.parseInt(n,10);return!Number.isInteger(o)||o<0||o>3?0:o}function Rr(e,t){const n=Fe(e);if(t<=n)return;const o=Be();if(o)try{o.setItem(ho+e,String(t))}catch{}}const Er={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},Ir=["basics","strategies","events-manual","topology"],mo=3;function Ar(){return{root:P("quest-grid","quest-grid"),progress:P("quest-grid-progress","quest-grid"),sections:P("quest-grid-sections","quest-grid")}}function St(e,t){it(e.sections);let n=0;const o=ne.length*mo;for(const i of Ir){const r=ne.filter(l=>l.section===i);if(r.length===0)continue;const c=document.createElement("section");c.dataset.section=i;const s=document.createElement("h2");s.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",s.textContent=Er[i],c.appendChild(s);const a=document.createElement("div");a.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const l of r){const f=Fe(l.id);n+=f,a.appendChild(xr(l,f,t))}c.appendChild(a),e.sections.appendChild(c)}e.progress.textContent=`${n} / ${o}`}function xr(e,t,n){const o=ne.findIndex(u=>u.id===e.id),i=String(o+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const c=document.createElement("div");c.className="flex items-baseline justify-between gap-2";const s=document.createElement("span");s.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",s.textContent=i,c.appendChild(s);const a=document.createElement("span");a.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",a.classList.add(t>0?"text-accent":"text-content-disabled"),a.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),a.textContent="★".repeat(t)+"☆".repeat(mo-t),c.appendChild(a),r.appendChild(c);const l=document.createElement("div");l.className="text-content text-[13px] font-semibold tracking-[-0.01em]",l.textContent=e.title,r.appendChild(l);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const Mr=75;async function hn(e,t,n,o){let i=n;for(;i<t.length;){const r=t[i];if(r===void 0||(r.atTick??0)>o)break;await e.spawnRider(r.origin,r.destination,r.weight??Mr,r.patienceTicks),i+=1}return i}async function Pr(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await xi({configRon:e.configRon,strategy:"scan"});try{const c=[...e.seedRiders].sort((d,p)=>(d.atTick??0)-(p.atTick??0));let s=await hn(r,c,0,0);const a={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(a.timeoutMs=n.timeoutMs),await r.loadController(t,a);let l=null,f=0;const u=n.onSnapshot!==void 0;for(;f<o;){const d=o-f,p=Math.min(i,d),h=await r.tick(p,u?{wantVisuals:!0}:void 0);l=h.metrics,f=h.tick,s=await hn(r,c,s,f);const g=gn(l,f);if(n.onProgress)try{n.onProgress(g)}catch{}if(n.onSnapshot&&h.snapshot)try{n.onSnapshot(h.snapshot)}catch{}if(e.passFn(g))return mn(e,g,!0)}if(l===null)throw new Error("runStage: maxTicks must be positive");return mn(e,gn(l,f),!1)}finally{r.dispose()}}function gn(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function mn(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}function Lr(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const o=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(o)&&o>0&&n.push(`${o.toFixed(1)}s avg wait`),n.join(" · ")}const bo=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(bo.map(e=>[e.name,e]));function yo(e){const t=new Set(e);return bo.filter(n=>t.has(n.name))}function Br(){return{root:P("quest-api-panel","api-panel")}}function bn(e,t){it(e.root);const n=yo(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const o=document.createElement("p");o.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",o.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(o);const i=document.createElement("ul");i.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const c=document.createElement("li");c.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const s=document.createElement("code");s.className="block font-mono text-[12px] text-content",s.textContent=r.signature,c.appendChild(s);const a=document.createElement("p");a.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",a.textContent=r.description,c.appendChild(a),i.appendChild(c)}e.root.appendChild(i)}function Fr(){return{root:P("quest-hints","hints-drawer"),count:P("quest-hints-count","hints-drawer"),list:P("quest-hints-list","hints-drawer")}}const yn="quest-hints-more";function Sn(e,t){it(e.list);for(const o of e.root.querySelectorAll(`.${yn}`))o.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((o,i)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=o,i>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const o=document.createElement("button");o.type="button",o.className=`${yn} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,o.textContent=`Show ${n-1} more`,o.addEventListener("click",()=>{for(const i of e.list.querySelectorAll("li[hidden]"))i.hidden=!1;o.remove()}),e.root.appendChild(o)}e.root.removeAttribute("open")}function $r(e,t){return{activeStage:e,currentView:t,runLoop:{active:!1}}}function Dr(e,t){e.activeStage=t}function vt(e,t){e.currentView=t}function vn(e){e.runLoop.active=!1}function ke(e,t){return e.currentView==="stage"&&e.activeStage.id===t.id}function Or(){return{root:P("quest-reference","reference-panel"),status:P("quest-reference-status","reference-panel"),code:P("quest-reference-code","reference-panel")}}function wt(e,t,n={}){const o=t.referenceSolution,i=Fe(t.id);if(!o||i===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=i===3?"(mastered)":"(unlocked)",e.code.textContent=o,n.collapse!==!1&&e.root.removeAttribute("open")}function qr(){const e="results-modal";return{root:P("quest-results-modal",e),title:P("quest-results-title",e),stars:P("quest-results-stars",e),detail:P("quest-results-detail",e),close:P("quest-results-close",e),retry:P("quest-results-retry",e),next:P("quest-results-next",e)}}function Nr(e,t,n,o,i){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=Wr(t.grade,t.passed,o),e.retry.onclick=()=>{kt(e),n()},e.close.onclick=()=>{kt(e)};const r=i;r?(e.next.hidden=!1,e.next.onclick=()=>{kt(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function kt(e){e.root.classList.remove("show")}function Wr(e,t,n){const o=`tick ${e.endTick}`,i=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${i} · finished by ${o}.`;if(n)try{const r=n(e);if(r)return`${i}. ${r}`}catch{}return`${i}. The pass condition wasn't met within the run budget.`}const Hr={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function wn(e){return Hr[e]??`sim.${e}();`}function Gr(){return{root:P("quest-snippets","snippet-picker")}}function kn(e,t,n){it(e.root);const o=yo(t.unlockedApi);if(o.length!==0)for(const i of o){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=i.name,r.title=`Insert: ${wn(i.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(wn(i.name))}),e.root.appendChild(r)}}const Vt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},Ur="#2a2a35",jr="#a1a1aa",V='"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',zr=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],Vr=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],Xr="rgba(8, 10, 14, 0.55)",Yr="#3a3a45",Kr=[1,1,.5,.42],Qr=["LOW","HIGH","VIP","SERVICE"],Jr="#e6c56b",Zr="#9bd4c4",es=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],ts="#a1a1aa",ns="#4a4a55",os="#f59e0b",So="#7dd3fc",vo="#fda4af",_t="#fafafa",wo="#8b8c92",ko="rgba(250, 250, 250, 0.95)",is=260,_n=3,rs=.05,Cn=["standard","briefcase","bag","short","tall"];function fe(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,Cn[n%Cn.length]??"standard"}function ss(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function _o(e,t,n,o,i,r="standard"){const c=ss(r,o),a=n-.5,l=a-c.bodyH,f=l-c.neckGap-c.headR,u=c.bodyH*.08,d=a-c.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-c.shoulderW/2,l+u),e.lineTo(t-c.shoulderW/2+u,l),e.lineTo(t+c.shoulderW/2-u,l),e.lineTo(t+c.shoulderW/2,l+u),e.lineTo(t+c.waistW/2,d),e.lineTo(t+c.footW/2,a),e.lineTo(t-c.footW/2,a),e.lineTo(t-c.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,c.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const p=Math.max(1.6,c.headR*.9),h=t+c.waistW/2+p*.1,g=a-p-.5;e.fillRect(h,g,p,p);const m=p*.55;e.fillRect(h+(p-m)/2,g-1,m,1)}else if(r==="bag"){const p=Math.max(1.3,c.headR*.9),h=t-c.shoulderW/2-p*.35,g=l+c.bodyH*.35;e.beginPath(),e.arc(h,g,p,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(h+p*.2,g-p*.8),e.lineTo(t+c.shoulderW/2-u,l+.5),e.stroke()}else if(r==="tall"){const p=c.headR*2.1,h=Math.max(1,c.headR*.45);e.fillRect(t-p/2,f-c.headR-h+.4,p,h)}}function as(e,t,n,o,i,r,c,s,a){const f=Math.max(1,Math.floor((i-14)/s.figureStride)),u=Math.min(r,f),d=-2;for(let p=0;p<u;p++){const h=t+d+o*p*s.figureStride,g=p+0,m=fe(a,g);_o(e,h,n,s.figureHeadR,c,m)}if(r>u){e.fillStyle=wo,e.font=`${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const p=t+d+o*u*s.figureStride;e.fillText(`+${r-u}`,p,n-1)}}function te(e,t,n,o,i,r){const c=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,c);return}e.moveTo(t+c,n),e.lineTo(t+o-c,n),e.quadraticCurveTo(t+o,n,t+o,n+c),e.lineTo(t+o,n+i-c),e.quadraticCurveTo(t+o,n+i,t+o-c,n+i),e.lineTo(t+c,n+i),e.quadraticCurveTo(t,n+i,t,n+i-c),e.lineTo(t,n+c),e.quadraticCurveTo(t,n,t+c,n),e.closePath()}function cs(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const c=i+r+1>>1;e.measureText(t.slice(0,c)+o).width<=n?i=c:r=c-1}return i===0?o:t.slice(0,i)+o}function ls(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function ds(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px ${V}`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,c=Math.max(n.fontSmall+.5,i);for(const s of t){const a=s.top-3,l=a>i&&a-n.fontSmall<r;e.fillStyle=s.color,e.fillText(s.text,s.cx,l?c:a)}}function ps(e,t,n,o,i,r,c,s,a){e.font=`500 ${o.fontMain.toFixed(0)}px ${V}`,e.textBaseline="middle";const l=o.padX,f=o.padX+o.labelW,u=r-o.padX,d=o.shaftInnerW/2,p=Math.min(o.shaftInnerW*1.8,(u-f)/2);for(let h=0;h<t.length;h++){const g=t[h];if(g===void 0)continue;const m=n(g.y),T=t[h+1],_=T!==void 0?n(T.y):s;if(e.strokeStyle=Ur,e.lineWidth=a?2:1,e.beginPath(),a)for(const y of i)e.moveTo(y-p,m+.5),e.lineTo(y+p,m+.5);else{let y=f;for(const S of i){const w=S-d,b=S+d;w>y&&(e.moveTo(y,m+.5),e.lineTo(w,m+.5)),y=b}y<u&&(e.moveTo(y,m+.5),e.lineTo(u,m+.5))}e.stroke();for(let y=0;y<i.length;y++){const S=i[y];if(S===void 0)continue;const w=c.has(y,g.entity_id);e.strokeStyle=w?os:ns,e.lineWidth=w?1.4:1,e.beginPath(),e.moveTo(S-d-2,m+.5),e.lineTo(S-d,m+.5),e.moveTo(S+d,m+.5),e.lineTo(S+d+2,m+.5),e.stroke()}const R=a?m:(m+_)/2;e.fillStyle=jr,e.textAlign="right",e.fillText(cs(e,g.name,o.labelW-4),l+o.labelW-4,R)}}function us(e,t,n,o,i,r){for(const c of t.stops){if(c.waiting_by_line.length===0)continue;const s=r.get(c.entity_id);if(s===void 0||s.size===0)continue;const a=n(c.y),l=c.waiting_up>=c.waiting_down?So:vo;for(const f of c.waiting_by_line){if(f.count===0)continue;const u=s.get(f.line);if(u===void 0)continue;const d=i.get(u);if(d===void 0)continue;const p=d.end-d.start;p<=o.figureStride||as(e,d.end-2,a,-1,p,f.count,l,o,c.entity_id)}}}function Ot(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,c=o&255,s=a=>t>=0?Math.round(a+(255-a)*t):Math.round(a*(1+t));return`rgb(${s(i)}, ${s(r)}, ${s(c)})`}function Xt(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,c=o&255;return`rgba(${i}, ${r}, ${c}, ${t})`}function Ue(e,t){if(/^#[0-9a-f]{6}$/i.test(e)){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Xt(e,t)}function fs(e,t,n,o,i){const r=(e+n)/2,c=(t+o)/2,s=n-e,a=o-t,l=Math.max(Math.hypot(s,a),1),f=-a/l,u=s/l,d=Math.min(l*.25,22),p=r+f*d,h=c+u*d,g=1-i;return[g*g*e+2*g*i*p+i*i*n,g*g*t+2*g*i*h+i*i*o]}function Co(e){let r=e;for(let s=0;s<3;s++){const a=1-r,l=3*a*a*r*.2+3*a*r*r*.2+r*r*r,f=3*a*a*.2+6*a*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(l-e)/f,r=Math.max(0,Math.min(1,r))}const c=1-r;return 3*c*c*r*.6+3*c*r*r*1+r*r*r}function hs(e,t,n,o,i,r,c,s,a,l=!1){const f=o*.22,u=(i-4)/10.5,d=Math.max(1.2,Math.min(s.figureHeadR,f,u)),p=s.figureStride*(d/s.figureHeadR),h=3,g=2,m=o-h*2,_=Math.max(1,Math.floor((m-16)/p)),R=Math.min(r,_),y=R*p,S=t-y/2+p/2,w=n-g;for(let b=0;b<R;b++){const k=a?.[b]??fe(0,b);_o(e,S+b*p,w,d,c,k)}if(r>R){const b=`+${r-R}`,k=Math.max(8,s.fontSmall-1);e.font=`700 ${k.toFixed(1)}px ${V}`,e.textAlign="right",e.textBaseline="middle";const I=e.measureText(b).width,A=3,C=1.5,E=Math.ceil(I+A*2),x=Math.ceil(k+C*2),L=t+o/2-2,D=n-i+2,q=L-E;e.fillStyle="rgba(15, 15, 18, 0.85)",te(e,q,D,E,x,2),e.fill(),e.fillStyle="#fafafa",e.fillText(b,L-A,D+x/2)}if(l){const b=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${b.toFixed(0)}px ${V}`,e.textAlign="center",e.textBaseline="middle";const k=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,k+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,k)}}function gs(e,t,n,o,i,r,c){const s=Math.max(2,r.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const l=c.get(a.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const u=n.get(a.id);if(u===void 0)continue;const d=i(f.y)-r.carH/2,p=i(a.y)-r.carH/2;Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(u,p),e.lineTo(u,d),e.stroke(),e.fillStyle=ko,e.beginPath(),e.arc(u,d,s,0,Math.PI*2),e.fill())}}function ms(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const c=Vt[t.phase]??"#6b6b75",s=o/2;for(let a=1;a<=_n;a++){const l=r(t.y-t.v*rs*a),f=.18*(1-(a-1)/_n);e.fillStyle=Xt(c,f),e.fillRect(n-s,l-i,o,i)}}function bs(e,t,n,o,i,r,c,s,a){const l=c(t.y),f=l-i,u=o/2,d=Vt[t.phase]??"#6b6b75";e.fillStyle=d,e.fillRect(n-u,f,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-u+.5,f+.5,o-1,i-1),e.strokeStyle=Ot(d,.18),e.beginPath(),e.moveTo(n-u+1,f+1.5),e.lineTo(n+u-1,f+1.5),e.stroke();const p=t.capacity>0&&t.load>=t.capacity*.95;(t.riders>0||p)&&hs(e,n,l,o,i,t.riders,r,s,a,p)}const Tn=6,ys=3,Ct=4,he=3,ue=2.5,K=2,Ss=12,vs="rgba(37, 37, 48, 0.80)",ws="#ECECEE",Rn=3,En=.3,ks=140,In=.85;function _s(e,t,n,o,i,r,c,s){const a=c.fontSmall+.5;e.font=`500 ${a}px ${V}`,e.textBaseline="middle",An(e,"-0.1px");const l=performance.now(),f=Ue(t,.45),u=Ue(t,.5),d=Ue(t,.75),p=[];for(const[g,m]of o){const T=n.get(g);if(T===void 0)continue;const _=i.get(g);if(_===void 0)continue;const R=r(T.y),y=R-c.carH,S=Math.max(1,m.expiresAt-m.bornAt),w=m.expiresAt-l,b=w>S*En?1:Math.max(0,w/(S*En)),k=Math.max(0,l-m.bornAt),I=Math.min(1,k/ks),A=b*I;if(A<=0)continue;const C=e.measureText(m.glyph).width,E=C+Rn+e.measureText(m.text).width+Tn*2,x=a+ys*2+2,L=y-K-ue-x,D=R+K+ue+x>s,q=L<2&&!D?"below":"above",be=q==="above"?y-K-ue-x:R+K+ue;let H=_-E/2;const ye=2,Se=s-E-2;H<ye&&(H=ye),H>Se&&(H=Se),p.push({bubble:m,glyphW:C,alpha:A,cx:_,carTop:y,carBottom:R,bubbleW:E,bubbleH:x,side:q,bx:H,by:be,entrance:I})}const h=(g,m)=>!(g.bx+g.bubbleW<=m.bx||m.bx+m.bubbleW<=g.bx||g.by+g.bubbleH<=m.by||m.by+m.bubbleH<=g.by);for(let g=1;g<p.length;g++){const m=p[g];if(m===void 0)continue;let T=!1;for(let w=0;w<g;w++){const b=p[w];if(b!==void 0&&h(m,b)){T=!0;break}}if(!T)continue;const _=m.side==="above"?"below":"above",R=_==="above"?m.carTop-K-ue-m.bubbleH:m.carBottom+K+ue,y={...m,side:_,by:R};let S=!0;for(let w=0;w<g;w++){const b=p[w];if(b!==void 0&&h(y,b)){S=!1;break}}S&&(p[g]=y)}for(const g of p){const{bubble:m,glyphW:T,alpha:_,cx:R,carTop:y,carBottom:S,bubbleW:w,bubbleH:b,side:k,bx:I,by:A,entrance:C}=g,E=k==="above"?y-K:S+K,x=Math.min(Math.max(R,I+Ct+he/2),I+w-Ct-he/2),L=Co(C),D=In+(1-In)*L;e.save(),e.globalAlpha=_,e.translate(x,E),e.scale(D,D),e.translate(-x,-E),Cs(e,I,A,w,b,Ct,k,x,E),e.shadowColor=u,e.shadowBlur=Ss,e.fillStyle=vs,e.fill(),e.shadowBlur=0,e.shadowColor="transparent",e.strokeStyle=f,e.lineWidth=1,e.stroke();const q=A+b/2,be=I+Tn;e.textAlign="left",e.fillStyle=d,e.fillText(m.glyph,be,q),e.fillStyle=ws,e.fillText(m.text,be+T+Rn,q),e.restore()}An(e,"0px")}function Cs(e,t,n,o,i,r,c,s,a){const l=Math.min(r,o/2,i/2);e.beginPath(),e.moveTo(t+l,n),c==="below"&&(e.lineTo(s-he/2,n),e.lineTo(s,a),e.lineTo(s+he/2,n)),e.lineTo(t+o-l,n),e.arcTo(t+o,n,t+o,n+l,l),e.lineTo(t+o,n+i-l),e.arcTo(t+o,n+i,t+o-l,n+i,l),c==="above"&&(e.lineTo(s+he/2,n+i),e.lineTo(s,a),e.lineTo(s-he/2,n+i)),e.lineTo(t+l,n+i),e.arcTo(t,n+i,t,n+i-l,l),e.lineTo(t,n+l),e.arcTo(t,n,t+l,n,l),e.closePath()}function An(e,t){e.letterSpacing=t}function Ts(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function Rs(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:rt(o)})}return t}function rt(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function To(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function Es(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function Is(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function As(e,t,n,o,i,r){const c=Math.abs(t-e);if(c<.001)return 0;const s=Math.abs(n);if(s*s/(2*r)>=c)return s>0?s/r:0;const l=Math.max(0,(o-s)/i),f=s*l+.5*i*l*l,u=o/r,d=o*o/(2*r);if(f+d>=c){const h=(2*i*r*c+r*s*s)/(i+r),g=Math.sqrt(Math.max(h,s*s));return(g-s)/i+g/r}const p=c-f-d;return l+p/Math.max(o,.001)+u}const Ro={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},nt={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function xs(e,t,n,o,i,r){const c=i/2,s=o-r/2,a=Vt[t.phase]??"#6b6b75",l=e.createLinearGradient(n,s,n,s+r);l.addColorStop(0,Ot(a,.14)),l.addColorStop(1,Ot(a,-.18)),e.fillStyle=l,te(e,n-c,s,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-c+2,s+r*.36,i-4,Math.max(1.5,r*.1))}function Ms(e,t,n,o,i){if(t.length===0)return;const r=7,c=4,s=i.fontSmall+2,a=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px ${V}`;const l=(d,p)=>{const h=[d.carName,rt(d.altitudeM),To(d.velocity),`${Ro[d.phase]} · ${d.layer}`];let g=0;for(const y of h)g=Math.max(g,e.measureText(y).width);const m=g+r*2,T=h.length*s+c*2;let _=p==="right"?d.cx+a:d.cx-a-m;_=Math.max(2,Math.min(o-m-2,_));const R=d.cy-T/2;return{hud:d,lines:h,bx:_,by:R,bubbleW:m,bubbleH:T,side:p}},f=(d,p)=>!(d.bx+d.bubbleW<=p.bx||p.bx+p.bubbleW<=d.bx||d.by+d.bubbleH<=p.by||p.by+p.bubbleH<=d.by),u=[];t.forEach((d,p)=>{let h=l(d,p%2===0?"right":"left");if(u.some(g=>f(h,g))){const g=l(d,h.side==="right"?"left":"right");if(u.every(m=>!f(g,m)))h=g;else{const m=Math.max(...u.map(T=>T.by+T.bubbleH));h={...h,by:m+4}}}u.push(h)});for(const d of u){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",te(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=nt[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,te(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let p=0;p<d.lines.length;p++){const h=d.by+c+s*p+s/2,g=d.lines[p]??"";e.fillStyle=p===0||p===3?nt[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(g,d.bx+r,h)}e.restore()}}function Ps(e,t,n,o,i,r){if(t.length===0)return;const c=18,s=10,a=6,l=5,f=r.fontSmall+2.5,d=a*2+5*f,p=c+a+(d+l)*t.length;e.save();const h=e.createLinearGradient(n,i,n,i+p);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,te(e,n,i,o,p,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,te(e,n,i,o,p,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px ${V}`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+s,i+c/2+2);let g=i+c+a;for(const m of t){e.fillStyle="rgba(15, 15, 18, 0.55)",te(e,n+6,g,o-12,d,5),e.fill(),e.fillStyle=nt[m.phase],e.fillRect(n+6,g,2,d);const T=n+s+4,_=n+o-s;let R=g+a+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px ${V}`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(m.carName,T,R),e.textAlign="right",e.fillStyle=nt[m.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px ${V}`,e.fillText(Ro[m.phase].toUpperCase(),_,R);const y=m.etaSeconds!==void 0&&Number.isFinite(m.etaSeconds)?Is(m.etaSeconds):"—",S=[["Altitude",rt(m.altitudeM)],["Velocity",To(m.velocity)],["Dest",m.destinationName??"—"],["ETA",y]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px ${V}`;for(const[w,b]of S)R+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(w,T,R),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(b,_,R);g+=d+l}e.restore()}function Ls(e,t,n,o,i,r,c){return[...e.cars].sort((a,l)=>a.id-l.id).map((a,l)=>{const f=a.y,u=a.target!==void 0?e.stops.find(p=>p.entity_id===a.target):void 0,d=u?As(f,u.y,a.v,i,r,c):void 0;return{cx:n,cy:t.toScreenAlt(f),altitudeM:f,velocity:a.v,phase:Es(a.v,o.get(a.id)??0,i),layer:Ts(f),carName:`Climber ${String.fromCharCode(65+l)}`,destinationName:u?.name,etaSeconds:d}})}const _e=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function Tt(e,t,n){return e+(t-e)*n}function Rt(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round(Tt(o>>16&255,i>>16&255,n)),c=Math.round(Tt(o>>8&255,i>>8&255,n)),s=Math.round(Tt(o&255,i&255,n));return`#${(r<<16|c<<8|s).toString(16).padStart(6,"0")}`}function Bs(e,t){let n=0;for(;n<_e.length-1;n++){const l=_e[n+1];if(l===void 0||e<=l[0])break}const o=_e[n],i=_e[Math.min(n+1,_e.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],c=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),s=Rt(o[1],i[1],c),a=Rt(o[2],i[2],c);return Rt(s,a,t)}const Fs=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function $s(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),c=Math.log10(1+t.axisMaxM/1e3),s=[0,.05,.15,.35,.6,1];for(const l of s){const f=1e3*(10**(l*c)-1);r.addColorStop(l,Bs(f,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const l of Fs){const f=t.axisMaxM*l.altFrac;if(f<8e4)continue;const u=t.toScreenAlt(f),d=n+l.xFrac*(o-n),p=l.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${p.toFixed(3)})`,e.beginPath(),e.arc(d,u,l.size,0,Math.PI*2),e.fill()}e.restore();const a=Rs(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const l of a){const f=t.toScreenAlt(l.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(o,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(l.label,n+4,f-6))}}function Ds(e,t,n,o){const r=o-28,c=e.createLinearGradient(0,r,0,o);c.addColorStop(0,"rgba(0,0,0,0)"),c.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),c.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=c,e.fillRect(t,r,n-t,28),e.strokeStyle=Ue("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function Os(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function qs(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const c=-Math.PI/2+r*Math.PI/3,s=t+Math.cos(c)*i,a=n+Math.sin(c)*i;r===0?e.moveTo(s,a):e.lineTo(s,a)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function Ns(e,t,n,o,i,r,c){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const s of t.stops){const a=n.toScreenAlt(s.y);if(a<n.shaftTop||a>n.shaftBottom)continue;const l=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-l/2,a),e.lineTo(o-5,a),e.moveTo(o+5,a),e.lineTo(o+l/2,a),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-l/2,a),e.lineTo(o-5,a-5),e.moveTo(o+l/2,a),e.lineTo(o+5,a-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(s.name,r+c-4,a-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(rt(s.y),r+c-4,a+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function Ws(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const c=Math.log10(1+Math.max(0,r)/1e3),s=i<=0?0:Math.max(0,Math.min(1,c/i));return t-s*(t-e)}}}function Hs(e,t,n,o,i,r,c){const s=Math.max(2,c.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const l=r.get(a.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const u=i.get(a.id);if(u===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,u),e.lineTo(o,d),e.stroke(),e.fillStyle=ko,e.beginPath(),e.arc(o,d,s,0,Math.PI*2),e.fill())}}function Gs(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function Us(e,t,n,o,i,r,c){c.firstDrawAt===0&&(c.firstDrawAt=performance.now());const s=(performance.now()-c.firstDrawAt)/1e3,a=r.showDayNight?Gs(s):.5,l=n>=520&&o>=360,f=Math.min(120,Math.max(72,n*.16)),u=l?Math.min(220,Math.max(160,n*.24)):0,d=l?14:0,p=i.padX,h=p+f+4,g=n-i.padX-u-d,m=(h+g)/2,T=12,_=i.padTop+24,R=o-i.padBottom-18,y=Ws(_,R,r);$s(e,y,h+T,g-T,a),Ds(e,h+T,g-T,R),Os(e,m,y),qs(e,m,y.shaftTop,i),Ns(e,t,y,m,i,p,f);const S=Math.max(20,Math.min(34,g-h-8)),w=Math.max(16,Math.min(26,S*.72));i.carH=w,i.carW=S;const b=new Map,k=new Map;t.stops.forEach((C,E)=>k.set(C.entity_id,E));for(const C of t.cars)b.set(C.id,y.toScreenAlt(C.y));Hs(e,t,y,m,b,k,i);for(const C of t.cars){const E=b.get(C.id);E!==void 0&&xs(e,C,m,E,S,w)}const A=[...Ls(t,y,m,c.prevVelocity,c.maxSpeed,c.acceleration,c.deceleration)].sort((C,E)=>E.altitudeM-C.altitudeM);Ms(e,A,S,n-u-d,i),l&&Ps(e,A,n-i.padX-u,u,_,i);for(const C of t.cars)c.prevVelocity.set(C.id,C.v);if(c.prevVelocity.size>t.cars.length){const C=new Set(t.cars.map(E=>E.id));for(const E of c.prevVelocity.keys())C.has(E)||c.prevVelocity.delete(E)}}const js=1e6;function Eo(e,t){return e*js+t}function zs(e){return{has:(t,n)=>e.has(Eo(t,n))}}function Vs(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function xn(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}function Xs(e,t,n){const o=performance.now();for(const i of t){const r=o-i.bornAt;if(r<0)continue;const c=Math.min(1,Math.max(0,r/i.duration)),s=Co(c),[a,l]=i.kind==="board"?fs(i.startX,i.startY,i.endX,i.endY,s):[i.startX+(i.endX-i.startX)*s,i.startY+(i.endY-i.startY)*s],f=i.kind==="board"?.9:i.kind==="abandon"?(1-s)**1.5:1-s,u=i.kind==="abandon"?n.carDotR*.85:n.carDotR;e.fillStyle=Xt(i.color,f),e.beginPath(),e.arc(a,l,u,0,Math.PI*2),e.fill()}}class Io{#e;#t;#n=window.devicePixelRatio||1;#i;#r=null;#s=-1;#d=new Map;#a;#o=new Map;#c=new Map;#l=[];#p=null;#m=new Map;#b=1;#y=1;#S=1;#f=0;#u=new Map;#v=new Map;#C=new Map;#h=new Map;#w=[];#k=new Map;#_=new Set;#T=zs(this.#_);#R=[];#E=[];#I=[];#A=new Map;#x=new Map;#M=new Map;#P=new Map;#L=[];#B=[];#F=[];constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#t=o,this.#a=n,this.#g(),this.#i=()=>{this.#g()},window.addEventListener("resize",this.#i)}dispose(){window.removeEventListener("resize",this.#i)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#m.clear(),this.#f=0,this.#u.clear()}setTetherPhysics(t,n,o){Number.isFinite(t)&&t>0&&(this.#b=t),Number.isFinite(n)&&n>0&&(this.#y=n),Number.isFinite(o)&&o>0&&(this.#S=o)}pushAssignment(t,n,o){let i=this.#u.get(t);i===void 0&&(i=new Map,this.#u.set(t,i)),i.set(o,n)}#g(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#n,i=n*this.#n;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}#$(t,n){const o=this.#w.pop();return o!==void 0?(o.start=t,o.end=n,o):{start:t,end:n}}#D(){for(const t of this.#h.values())this.#w.push(t);this.#h.clear()}draw(t,n,o){this.#g();const{clientWidth:i,clientHeight:r}=this.#e,c=this.#t;if(c.clearRect(0,0,i,r),t.stops.length===0||i===0||r===0)return;i!==this.#s&&(this.#r=Vs(i),this.#s=i);const s=this.#r;if(s===null)return;if(this.#p!==null){this.#O(t,i,r,s,n,o,this.#p);return}const a=t.stops.length===2,l=this.#v;l.clear();for(const v of t.cars)l.set(v.id,v);const f=this.#F;f.length=t.stops.length;for(let v=0;v<t.stops.length;v++)f[v]=t.stops[v];f.sort((v,M)=>v.y-M.y);const u=this.#L;u.length=f.length;for(let v=0;v<f.length;v++){const M=f[v];u[v]=M===void 0?0:M.y}const d=t.stops[0];if(d===void 0)return;let p=d.y,h=d.y;for(let v=1;v<t.stops.length;v++){const M=t.stops[v];if(M===void 0)continue;const B=M.y;B<p&&(p=B),B>h&&(h=B)}const g=u.length>=3?(u.at(-1)??0)-(u.at(-2)??0):1,T=p-1,_=h+g,R=Math.max(_-T,1e-4),y=a?18:0;let S,w;if(a)S=s.padTop+y,w=r-s.padBottom-y;else{let v=1/0;for(let Q=1;Q<u.length;Q++){const De=u[Q],Oe=u[Q-1];if(De===void 0||Oe===void 0)continue;const ve=De-Oe;ve>0&&ve<v&&(v=ve)}Number.isFinite(v)||(v=1);const B=48/v,U=Math.max(0,r-s.padTop-s.padBottom)/R,X=Math.min(U,B),ae=R*X;w=r-s.padBottom,S=w-ae}const b=v=>w-(v-T)/R*(w-S),k=this.#d;k.forEach(v=>v.length=0);for(const v of t.cars){const M=k.get(v.line);M?M.push(v):k.set(v.line,[v])}const I=this.#B;I.length=0;for(const v of k.keys())I.push(v);I.sort((v,M)=>v-M);let A=0;for(const v of I)A+=k.get(v)?.length??0;const C=Math.max(0,i-2*s.padX-s.labelW),E=s.figureStride*2,x=s.shaftSpacing*Math.max(A-1,0),D=(C-x)/Math.max(A,1),q=a?34:s.maxShaftInnerW,H=Math.max(s.minShaftInnerW,Math.min(q,D*.55)),ye=Math.max(0,Math.min(D-H,E+s.figureStride*4)),Se=Math.max(14,H-6);let re=1/0;if(t.stops.length>=2)for(let v=1;v<u.length;v++){const M=u[v-1],B=u[v];if(M===void 0||B===void 0)continue;const O=b(M)-b(B);O>0&&O<re&&(re=O)}const Ho=b(h)-2,Go=Number.isFinite(re)?re:s.carH,Uo=a?s.carH:Go,jo=Math.max(14,Math.min(Uo,Ho));if(!a&&Number.isFinite(re)){const v=Math.max(1.5,Math.min(re*.067,4)),M=s.figureStride*(v/s.figureHeadR);s.figureHeadR=v,s.figureStride=M}s.shaftInnerW=H,s.carW=Se,s.carH=jo;const zo=s.padX+s.labelW,Vo=H+ye,$e=this.#R;$e.length=0;const se=this.#C;se.clear(),this.#D();const ct=this.#h;let Qt=0;for(const v of I){const M=k.get(v)??[];for(const B of M){const O=zo+Qt*(Vo+s.shaftSpacing),U=O,X=O+ye,ae=X+H/2;$e.push(ae),se.set(B.id,ae),ct.set(B.id,this.#$(U,X)),Qt++}}const lt=this.#k;lt.clear();for(let v=0;v<t.stops.length;v++){const M=t.stops[v];M!==void 0&&lt.set(M.entity_id,v)}const Jt=this.#_;Jt.clear();{let v=0;for(const M of I){const B=k.get(M)??[];for(const O of B){if(O.phase==="loading"||O.phase==="door-opening"||O.phase==="door-closing"){const U=xn(t.stops,O.y);U!==void 0&&U.dist<.5&&Jt.add(Eo(v,U.stop.entity_id))}v++}}}const dt=this.#A,pt=this.#x,ut=this.#M,ft=this.#P;dt.clear(),pt.clear(),ut.clear(),ft.clear();const ht=this.#E;ht.length=0;const gt=this.#I;gt.length=0;let Zt=0;for(let v=0;v<I.length;v++){const M=I[v];if(M===void 0)continue;const B=k.get(M)??[],O=zr[v]??Xr,U=Vr[v]??Yr,X=Kr[v]??1,ae=es[v]??ts,Q=Math.max(14,H*X),De=Math.max(10,Se*X),Oe=Math.max(10,s.carH),ve=v===2?Jr:v===3?Zr:_t;let qe=1/0,mt=-1/0,Ne=1/0;for(const Y of B){dt.set(Y.id,Q),pt.set(Y.id,De),ut.set(Y.id,Oe),ft.set(Y.id,ve);const ce=$e[Zt];if(ce===void 0)continue;const en=Number.isFinite(Y.min_served_y)&&Number.isFinite(Y.max_served_y),bt=en?Math.max(S,b(Y.max_served_y)-s.carH-2):S,Xo=en?Math.min(w,b(Y.min_served_y)+2):w;ht.push({cx:ce,top:bt,bottom:Xo,fill:O,frame:U,width:Q}),ce<qe&&(qe=ce),ce>mt&&(mt=ce),bt<Ne&&(Ne=bt),Zt++}I.length>1&&Number.isFinite(qe)&&Number.isFinite(Ne)&&gt.push({cx:(qe+mt)/2,top:Ne,text:Qr[v]??`Line ${v+1}`,color:ae})}ls(c,ht),ds(c,gt,s),ps(c,f,b,s,$e,i,this.#T,S,a),us(c,t,b,s,ct,this.#u),gs(c,t,se,dt,b,s,lt);for(const v of t.cars){const M=se.get(v.id);if(M===void 0)continue;const B=pt.get(v.id)??s.carW,O=ut.get(v.id)??s.carH,U=ft.get(v.id)??_t,X=this.#o.get(v.id);ms(c,v,M,B,O,b),bs(c,v,M,B,O,U,b,s,X?.roster)}this.#q(t,se,ct,b,s,n),Xs(c,this.#l,s),o&&o.size>0&&_s(c,this.#a,l,o,se,b,s,i)}#O(t,n,o,i,r,c,s){const a={prevVelocity:this.#m,maxSpeed:this.#b,acceleration:this.#y,deceleration:this.#S,firstDrawAt:this.#f};Us(this.#t,t,n,o,i,s,a),this.#f=a.firstDrawAt}#q(t,n,o,i,r,c){const s=performance.now(),a=Math.max(1,c),l=is/a,f=30/a,u=new Map,d=[];for(const p of t.cars){const h=this.#o.get(p.id),g=p.riders,m=n.get(p.id),T=xn(t.stops,p.y),_=p.phase==="loading"&&T!==void 0&&T.dist<.5?T.stop:void 0;if(h&&m!==void 0&&_!==void 0){const S=g-h.riders;if(S>0&&u.set(_.entity_id,(u.get(_.entity_id)??0)+S),S!==0){const w=i(_.y),b=i(p.y)-r.carH/2,k=Math.min(Math.abs(S),6);if(S>0){const I=_.waiting_up>=_.waiting_down,A=o.get(p.id);let C=m-20;if(A!==void 0){const L=A.start,D=A.end;C=(L+D)/2}const E=I?So:vo,x=this.#u.get(_.entity_id);x!==void 0&&(x.delete(p.line),x.size===0&&this.#u.delete(_.entity_id));for(let L=0;L<k;L++)d.push(()=>this.#l.push({kind:"board",bornAt:s+L*f,duration:l,startX:C,startY:w,endX:m,endY:b,color:E}))}else for(let I=0;I<k;I++)d.push(()=>this.#l.push({kind:"alight",bornAt:s+I*f,duration:l,startX:m,startY:b,endX:m+18,endY:b+10,color:_t}))}}const R=h?.roster??[];let y;if(h){const S=g-h.riders;if(y=R.slice(),S>0&&_!==void 0){const b=_.waiting_up>=_.waiting_down?0:1e4;for(let k=0;k<S;k++)y.push(fe(_.entity_id,k+b))}else if(S>0)for(let w=0;w<S;w++)y.push(fe(p.id,y.length+w));else S<0&&y.splice(y.length+S,-S)}else{y=[];for(let S=0;S<g;S++)y.push(fe(p.id,S))}for(;y.length>g;)y.pop();for(;y.length<g;)y.push(fe(p.id,y.length));this.#o.set(p.id,{riders:g,roster:y})}for(const p of t.stops){const h=p.waiting_up+p.waiting_down,g=this.#c.get(p.entity_id);if(g){const m=g.waiting-h,T=u.get(p.entity_id)??0,_=Math.max(0,m-T);if(_>0){const R=i(p.y),y=r.padX+r.labelW+20,S=Math.min(_,4);for(let w=0;w<S;w++)this.#l.push({kind:"abandon",bornAt:s+w*f,duration:l*1.5,startX:y,startY:R,endX:y-26,endY:R-6,color:wo})}}this.#c.set(p.entity_id,{waiting:h})}for(const p of d)p();for(let p=this.#l.length-1;p>=0;p--){const h=this.#l[p];h!==void 0&&s-h.bornAt>h.duration&&this.#l.splice(p,1)}if(this.#o.size>t.cars.length)for(const p of this.#o.keys())this.#v.has(p)||this.#o.delete(p);if(this.#c.size>t.stops.length)for(const p of this.#c.keys())this.#k.has(p)||this.#c.delete(p)}}const Ys="#f59e0b",Ks=3;function Qs(){const e="quest-pane";return{root:P("quest-pane",e),gridView:P("quest-grid",e),stageView:P("quest-stage-view",e),backBtn:P("quest-back-to-grid",e),title:P("quest-stage-title",e),brief:P("quest-stage-brief",e),stageStars:P("quest-stage-stars",e),editorHost:P("quest-editor",e),runBtn:P("quest-run",e),resetBtn:P("quest-reset",e),result:P("quest-result",e),progress:P("quest-progress",e),shaft:P("quest-shaft",e),shaftIdle:P("quest-shaft-idle",e)}}function Et(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=Fe(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(Ks-n)}function It(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function Js(e){const t=Qs(),n=b=>{const k=_r(b);if(k)return k;const I=ne[0];if(!I)throw new Error("quest-pane: stage registry is empty");return I},o=$r(n(e.initialStageId),"grid");Et(t,o.activeStage);const i=Br();bn(i,o.activeStage);const r=Fr();Sn(r,o.activeStage);const c=Or();wt(c,o.activeStage);const s=Ar(),a=new Io(t.shaft,Ys);t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const l=await Di({container:t.editorHost,initialValue:un(o.activeStage.id)??o.activeStage.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const f=qr(),u=300;let d=null,p=!1;const h=()=>{p||(d!==null&&clearTimeout(d),d=setTimeout(()=>{fn(o.activeStage.id,l.getValue()),d=null},u))},g=()=>{d!==null&&(clearTimeout(d),d=null,fn(o.activeStage.id,l.getValue()))},m=b=>{p=!0;try{l.setValue(b)}finally{p=!1}};l.onDidChange(()=>{h()});const T=Gr();kn(T,o.activeStage,l);const _=()=>{vn(o),t.shaftIdle.hidden=!1;const b=t.shaft.getContext("2d");b&&b.clearRect(0,0,t.shaft.width,t.shaft.height)},R=(b,{fromGrid:k})=>{g(),Dr(o,b),Et(t,b),bn(i,b),Sn(r,b),wt(c,b),kn(T,b,l),m(un(b.id)??b.starterCode),l.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",_(),It(t,"stage"),vt(o,"stage"),e.onStageChange?.(b.id)},y=()=>{g(),_(),t.result.textContent="",t.progress.textContent="",It(t,"grid"),vt(o,"grid"),St(s,b=>{R(n(b),{fromGrid:!0})}),e.onBackToGrid?.()};St(s,b=>{R(n(b),{fromGrid:!0})});const S=e.landOn??"grid";It(t,S),vt(o,S);const w=async()=>{const b=o.activeStage;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",l.clearRuntimeMarker();let k=null,I=0;o.runLoop.active=!0;const A=()=>{o.runLoop.active&&(k!==null&&a.draw(k,1),requestAnimationFrame(A))};t.shaftIdle.hidden=!0,requestAnimationFrame(A);try{const C=await Pr(b,l.getValue(),{timeoutMs:1e3,onProgress:E=>{ke(o,b)&&(t.progress.textContent=Lr(E))},onSnapshot:E=>{k=E,I+=1}});if(C.passed){const E=Fe(b.id);C.stars>E&&(Rr(b.id,C.stars),St(s,x=>{R(n(x),{fromGrid:!0})}),ke(o,b)&&Et(t,o.activeStage)),ke(o,b)&&wt(c,o.activeStage,{collapse:!1})}if(ke(o,b)){t.result.textContent="",t.progress.textContent="";const E=C.passed?Cr(b.id):void 0,x=E?()=>{R(E,{fromGrid:!1})}:void 0;Nr(f,C,()=>void w(),b.failHint,x)}}catch(C){if(ke(o,b)){const E=C instanceof Error?C.message:String(C);t.result.textContent=`Error: ${E}`,t.progress.textContent="",C instanceof fo&&C.location!==null&&l.setRuntimeMarker({line:C.location.line,column:C.location.column,message:E})}}finally{if(t.runBtn.disabled=!1,vn(o),I===0){const C=t.shaft.getContext("2d");C&&C.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{w()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${o.activeStage.title} to its starter code?`)&&(Tr(o.activeStage.id),m(o.activeStage.starterCode),l.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{y()}),{handles:t,editor:l}}let At=null;async function Ao(){if(!At){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;At=import(e).then(async n=>(await n.default(t),n))}return At}class Yt{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,o){const i=await Ao();return new Yt(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class xo{#e;#t=0;#n=[];#i=0;#r=0;#s=1;#d=0;constructor(t){this.#e=Zs(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#i=t.reduce((n,o)=>n+o.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#s=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const o=t.stops.filter(s=>s.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#s/60*i,this.#r=(this.#r+i)%(this.#i||1);const c=[];for(;this.#t>=1;)this.#t-=1,c.push(this.#a(o,r));return c}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,o]of this.#n.entries())if(t-=o.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#i<=0?0:Math.min(1,this.#r/this.#i)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#n}#a(t,n){const o=this.#o(t.length,n.originWeights);let i=this.#o(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],c=t[i];if(!r||!c)throw new Error("stop index out of bounds");const s=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:c.stop_id,weight:s,...this.#d>0?{patienceTicks:this.#d}:{}}}#o(t,n){if(!n||n.length!==t)return this.#l(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#l(t);let i=this.#p()*o;for(const[r,c]of n.entries())if(i-=Math.max(0,c),i<0)return r;return t-1}#c(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#l(t){return Number(this.#c()%BigInt(t))}#p(){return Number(this.#c()>>11n)/2**53}}function Zs(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const ea="#7dd3fc",ta="#fda4af";async function Mn(e,t,n,o,i){const r=Zo(o,i),c=await Yt.create(r,t,n),s=new Io(e.canvas,e.accent);if(s.setTetherConfig(o.tether??null),o.tether){const l=zt(o,i);s.setTetherPhysics(l.maxSpeed,l.acceleration,l.deceleration)}const a=e.canvas.parentElement;if(a){const l=o.stops.length,u=o.tether?640:Math.max(200,l*16);a.style.setProperty("--shaft-min-h",`${u}px`)}return{strategy:t,sim:c,renderer:s,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function Ce(e){e?.sim.dispose(),e?.renderer.dispose()}function Mo(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const na=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],oa=120;function Pn(e,t,n){const o=e.sim.metrics();e.latestMetrics=o;for(const r of na){const c=e.metricHistory[r];c.push(o[r]),c.length>oa&&c.shift()}const i=performance.now();for(const[r,c]of e.bubbles)c.expiresAt<=i&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const ia={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},ra=1e3;function sa(e,t,n){const o=performance.now(),i=r=>ca(n,r);for(const r of t){const c=aa(r,i);if(c===null)continue;const s=r.elevator;if(s===void 0)continue;const a=ia[r.kind]??ra;e.bubbles.set(s,{glyph:c.glyph,text:c.text,bornAt:o,expiresAt:o+a})}}function aa(e,t){switch(e.kind){case"elevator-assigned":return{glyph:"›",text:`To ${t(e.stop)}`};case"elevator-repositioning":return{glyph:"↻",text:`Reposition to ${t(e.stop)}`};case"elevator-arrived":return{glyph:"●",text:`At ${t(e.stop)}`};case"door-opened":return{glyph:"◌",text:"Doors open"};case"rider-boarded":return{glyph:"+",text:"Boarding"};case"rider-exited":return{glyph:"↓",text:`Off at ${t(e.stop)}`};default:return null}}function ca(e,t){return e.stops.find(o=>o.entity_id===t)?.name??`stop #${t}`}const la={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function Ln(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=la[t],e.modeEl.title=t)}function da(){const e=s=>{const a=document.getElementById(s);if(!a)throw new Error(`missing element #${s}`);return a},t=s=>document.getElementById(s),n=(s,a)=>({root:e(`pane-${s}`),canvas:e(`shaft-${s}`),name:e(`name-${s}`),mode:e(`mode-${s}`),desc:e(`desc-${s}`),metrics:e(`metrics-${s}`),trigger:e(`strategy-trigger-${s}`),popover:e(`strategy-popover-${s}`),repoTrigger:e(`repo-trigger-${s}`),repoName:e(`repo-name-${s}`),repoPopover:e(`repo-popover-${s}`),accent:a,which:s}),o=s=>{const a=document.querySelector(`.tweak-row[data-key="${s}"]`);if(!a)throw new Error(`missing tweak row for ${s}`);const l=u=>{const d=a.querySelector(u);if(!d)throw new Error(`missing ${u} in tweak row ${s}`);return d},f=u=>a.querySelector(u);return{root:a,value:l(".tweak-value"),defaultV:l(".tweak-default-v"),dec:l(".tweak-dec"),inc:l(".tweak-inc"),reset:l(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},i={};for(const s of me)i[s]=o(s);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",ea),paneB:n("b",ta)};ki(r);const c=document.getElementById("controls-bar");return c&&new ResizeObserver(([a])=>{if(!a)return;const l=Math.ceil(a.borderBoxSize[0]?.blockSize??a.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${l}px`)}).observe(c),r}function Po(e,t,n,o,i,r,c,s,a){const l=document.createDocumentFragment();for(const f of t){const u=document.createElement("button");u.type="button",u.className="strategy-option",u.setAttribute("role","menuitemradio"),u.setAttribute("aria-checked",f===r?"true":"false"),u.dataset[i]=f;const d=document.createElement("span");d.className="strategy-option-name";const p=document.createElement("span");if(p.className="strategy-option-label",p.textContent=n[f],d.appendChild(p),c&&f===c){const g=document.createElement("span");g.className="strategy-option-sibling",g.textContent=`also in ${s}`,d.appendChild(g)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=o[f],u.append(d,h),u.addEventListener("click",()=>{a(f)}),l.appendChild(u)}e.replaceChildren(l)}function oe(e,t){const n=Le[t],o=lo[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function Bn(e,t,n,o,i){Po(e.repoPopover,Si,Le,lo,"reposition",t,n,o,i)}function Ie(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;Bn(t.paneA,o,r?i:null,"B",c=>void $n(e,t,"a",c,n)),Bn(t.paneB,i,r?o:null,"A",c=>void $n(e,t,"b",c,n))}function qt(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function Lo(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function Nt(e){qt(e.paneA,!1),qt(e.paneB,!1)}function st(e){Ht(e),Nt(e)}function Fn(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;st(t),r&&(Ie(e,t,o),qt(n,!0))})}async function $n(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){Nt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},oe(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},oe(t.paneB,o)),N(e.permalink),Ie(e,t,i),Nt(t),await i(),G(t.toast,`${n==="a"?"A":"B"} park: ${Le[o]}`)}function pa(e){document.addEventListener("click",t=>{if(!Bo(e)&&!Lo(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;st(e)}})}function ie(e,t){const n=ge[t],o=co[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function Dn(e,t,n,o,i){Po(e.popover,yi,ge,co,"strategy",t,n,o,i)}function Ae(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;Dn(t.paneA,o,r?i:null,"B",c=>void qn(e,t,"a",c,n)),Dn(t.paneB,i,r?o:null,"A",c=>void qn(e,t,"b",c,n))}function Wt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function Bo(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function Ht(e){Wt(e.paneA,!1),Wt(e.paneB,!1)}function On(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;st(t),r&&(Ae(e,t,o),Wt(n,!0))})}async function qn(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){Ht(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},ie(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},ie(t.paneB,o)),N(e.permalink),Ae(e,t,i),Ht(t),await i(),G(t.toast,`${n==="a"?"A":"B"}: ${ge[o]}`)}function Nn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function ua(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function at(e,t,n){let o=!1;for(const i of me){const r=n.tweakRows[i],c=e.tweakRanges[i],s=ee(e,i,t),a=Ut(e,i),l=jt(e,i,s);l&&(o=!0),r.value.textContent=Nn(i,s),r.defaultV.textContent=Nn(i,a),r.dec.disabled=s<=c.min+1e-9,r.inc.disabled=s>=c.max-1e-9,r.root.dataset.overridden=String(l),r.reset.hidden=!l;const f=Math.max(c.max-c.min,1e-9),u=Math.max(0,Math.min(1,(s-c.min)/f)),d=Math.max(0,Math.min(1,(a-c.min)/f));r.trackFill&&(r.trackFill.style.width=`${(u*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(u*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function Fo(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function Kt(e,t,n,o){const i=zt(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},c=[e.paneA,e.paneB].filter(a=>a!==null),s=c.every(a=>a.sim.applyPhysicsLive(r));if(s)for(const a of c)a.renderer?.setTetherPhysics(i.maxSpeed,i.acceleration,i.deceleration);at(n,e.permalink.overrides,t),s||o()}function fa(e,t,n){return Math.min(n,Math.max(t,e))}function ha(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function Ge(e,t,n,o,i){const r=W(e.permalink.scenario),c=r.tweakRanges[n],s=ee(r,n,e.permalink.overrides),a=fa(s+o*c.step,c.min,c.max),l=ha(a,c.min,c.step);ba(e,t,n,l,i)}function ga(e,t,n,o){const i=W(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},N(e.permalink),n==="cars"?(o(),G(t.toast,"Cars reset")):(Kt(e,t,i,o),G(t.toast,`${ua(n)} reset`))}async function ma(e,t,n){const o=W(e.permalink.scenario),i=jt(o,"cars",ee(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},N(e.permalink),i?await n():Kt(e,t,o,n),G(t.toast,"Parameters reset")}function ba(e,t,n,o,i){const r=W(e.permalink.scenario),c={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:eo(r,c)},N(e.permalink),n==="cars"?i():Kt(e,t,r,i)}function ya(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Sa(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var je={exports:{}},va=je.exports,Wn;function wa(){return Wn||(Wn=1,(function(e){(function(t,n,o){function i(a){var l=this,f=s();l.next=function(){var u=2091639*l.s0+l.c*23283064365386963e-26;return l.s0=l.s1,l.s1=l.s2,l.s2=u-(l.c=u|0)},l.c=1,l.s0=f(" "),l.s1=f(" "),l.s2=f(" "),l.s0-=f(a),l.s0<0&&(l.s0+=1),l.s1-=f(a),l.s1<0&&(l.s1+=1),l.s2-=f(a),l.s2<0&&(l.s2+=1),f=null}function r(a,l){return l.c=a.c,l.s0=a.s0,l.s1=a.s1,l.s2=a.s2,l}function c(a,l){var f=new i(a),u=l&&l.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,u&&(typeof u=="object"&&r(u,f),d.state=function(){return r(f,{})}),d}function s(){var a=4022871197,l=function(f){f=String(f);for(var u=0;u<f.length;u++){a+=f.charCodeAt(u);var d=.02519603282416938*a;a=d>>>0,d-=a,d*=a,a=d>>>0,d-=a,a+=d*4294967296}return(a>>>0)*23283064365386963e-26};return l}n&&n.exports?n.exports=c:this.alea=c})(va,e)})(je)),je.exports}var ze={exports:{}},ka=ze.exports,Hn;function _a(){return Hn||(Hn=1,(function(e){(function(t,n,o){function i(s){var a=this,l="";a.x=0,a.y=0,a.z=0,a.w=0,a.next=function(){var u=a.x^a.x<<11;return a.x=a.y,a.y=a.z,a.z=a.w,a.w^=a.w>>>19^u^u>>>8},s===(s|0)?a.x=s:l+=s;for(var f=0;f<l.length+64;f++)a.x^=l.charCodeAt(f)|0,a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a}function c(s,a){var l=new i(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xor128=c})(ka,e)})(ze)),ze.exports}var Ve={exports:{}},Ca=Ve.exports,Gn;function Ta(){return Gn||(Gn=1,(function(e){(function(t,n,o){function i(s){var a=this,l="";a.next=function(){var u=a.x^a.x>>>2;return a.x=a.y,a.y=a.z,a.z=a.w,a.w=a.v,(a.d=a.d+362437|0)+(a.v=a.v^a.v<<4^(u^u<<1))|0},a.x=0,a.y=0,a.z=0,a.w=0,a.v=0,s===(s|0)?a.x=s:l+=s;for(var f=0;f<l.length+64;f++)a.x^=l.charCodeAt(f)|0,f==l.length&&(a.d=a.x<<10^a.x>>>4),a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a.v=s.v,a.d=s.d,a}function c(s,a){var l=new i(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xorwow=c})(Ca,e)})(Ve)),Ve.exports}var Xe={exports:{}},Ra=Xe.exports,Un;function Ea(){return Un||(Un=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var f=a.x,u=a.i,d,p;return d=f[u],d^=d>>>7,p=d^d<<24,d=f[u+1&7],p^=d^d>>>10,d=f[u+3&7],p^=d^d>>>3,d=f[u+4&7],p^=d^d<<7,d=f[u+7&7],d=d^d<<13,p^=d^d<<9,f[u]=p,a.i=u+1&7,p};function l(f,u){var d,p=[];if(u===(u|0))p[0]=u;else for(u=""+u,d=0;d<u.length;++d)p[d&7]=p[d&7]<<15^u.charCodeAt(d)+p[d+1&7]<<13;for(;p.length<8;)p.push(0);for(d=0;d<8&&p[d]===0;++d);for(d==8?p[7]=-1:p[d],f.x=p,f.i=0,d=256;d>0;--d)f.next()}l(a,s)}function r(s,a){return a.x=s.x.slice(),a.i=s.i,a}function c(s,a){s==null&&(s=+new Date);var l=new i(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(f.x&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xorshift7=c})(Ra,e)})(Xe)),Xe.exports}var Ye={exports:{}},Ia=Ye.exports,jn;function Aa(){return jn||(jn=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var f=a.w,u=a.X,d=a.i,p,h;return a.w=f=f+1640531527|0,h=u[d+34&127],p=u[d=d+1&127],h^=h<<13,p^=p<<17,h^=h>>>15,p^=p>>>12,h=u[d]=h^p,a.i=d,h+(f^f>>>16)|0};function l(f,u){var d,p,h,g,m,T=[],_=128;for(u===(u|0)?(p=u,u=null):(u=u+"\0",p=0,_=Math.max(_,u.length)),h=0,g=-32;g<_;++g)u&&(p^=u.charCodeAt((g+32)%u.length)),g===0&&(m=p),p^=p<<10,p^=p>>>15,p^=p<<4,p^=p>>>13,g>=0&&(m=m+1640531527|0,d=T[g&127]^=p+m,h=d==0?h+1:0);for(h>=128&&(T[(u&&u.length||0)&127]=-1),h=127,g=512;g>0;--g)p=T[h+34&127],d=T[h=h+1&127],p^=p<<13,d^=d<<17,p^=p>>>15,d^=d>>>12,T[h]=p^d;f.w=m,f.X=T,f.i=h}l(a,s)}function r(s,a){return a.i=s.i,a.w=s.w,a.X=s.X.slice(),a}function c(s,a){s==null&&(s=+new Date);var l=new i(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(f.X&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xor4096=c})(Ia,e)})(Ye)),Ye.exports}var Ke={exports:{}},xa=Ke.exports,zn;function Ma(){return zn||(zn=1,(function(e){(function(t,n,o){function i(s){var a=this,l="";a.next=function(){var u=a.b,d=a.c,p=a.d,h=a.a;return u=u<<25^u>>>7^d,d=d-p|0,p=p<<24^p>>>8^h,h=h-u|0,a.b=u=u<<20^u>>>12^d,a.c=d=d-p|0,a.d=p<<16^d>>>16^h,a.a=h-u|0},a.a=0,a.b=0,a.c=-1640531527,a.d=1367130551,s===Math.floor(s)?(a.a=s/4294967296|0,a.b=s|0):l+=s;for(var f=0;f<l.length+20;f++)a.b^=l.charCodeAt(f)|0,a.next()}function r(s,a){return a.a=s.a,a.b=s.b,a.c=s.c,a.d=s.d,a}function c(s,a){var l=new i(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.tychei=c})(xa,e)})(Ke)),Ke.exports}var Qe={exports:{}};const Pa={},La=Object.freeze(Object.defineProperty({__proto__:null,default:Pa},Symbol.toStringTag,{value:"Module"})),Ba=Sa(La);var Fa=Qe.exports,Vn;function $a(){return Vn||(Vn=1,(function(e){(function(t,n,o){var i=256,r=6,c=52,s="random",a=o.pow(i,r),l=o.pow(2,c),f=l*2,u=i-1,d;function p(y,S,w){var b=[];S=S==!0?{entropy:!0}:S||{};var k=T(m(S.entropy?[y,R(n)]:y??_(),3),b),I=new h(b),A=function(){for(var C=I.g(r),E=a,x=0;C<l;)C=(C+x)*i,E*=i,x=I.g(1);for(;C>=f;)C/=2,E/=2,x>>>=1;return(C+x)/E};return A.int32=function(){return I.g(4)|0},A.quick=function(){return I.g(4)/4294967296},A.double=A,T(R(I.S),n),(S.pass||w||function(C,E,x,L){return L&&(L.S&&g(L,I),C.state=function(){return g(I,{})}),x?(o[s]=C,E):C})(A,k,"global"in S?S.global:this==o,S.state)}function h(y){var S,w=y.length,b=this,k=0,I=b.i=b.j=0,A=b.S=[];for(w||(y=[w++]);k<i;)A[k]=k++;for(k=0;k<i;k++)A[k]=A[I=u&I+y[k%w]+(S=A[k])],A[I]=S;(b.g=function(C){for(var E,x=0,L=b.i,D=b.j,q=b.S;C--;)E=q[L=u&L+1],x=x*i+q[u&(q[L]=q[D=u&D+E])+(q[D]=E)];return b.i=L,b.j=D,x})(i)}function g(y,S){return S.i=y.i,S.j=y.j,S.S=y.S.slice(),S}function m(y,S){var w=[],b=typeof y,k;if(S&&b=="object")for(k in y)try{w.push(m(y[k],S-1))}catch{}return w.length?w:b=="string"?y:y+"\0"}function T(y,S){for(var w=y+"",b,k=0;k<w.length;)S[u&k]=u&(b^=S[u&k]*19)+w.charCodeAt(k++);return R(S)}function _(){try{var y;return d&&(y=d.randomBytes)?y=y(i):(y=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(y)),R(y)}catch{var S=t.navigator,w=S&&S.plugins;return[+new Date,t,w,t.screen,R(n)]}}function R(y){return String.fromCharCode.apply(0,y)}if(T(o.random(),n),e.exports){e.exports=p;try{d=Ba}catch{}}else o["seed"+s]=p})(typeof self<"u"?self:Fa,[],Math)})(Qe)),Qe.exports}var xt,Xn;function Da(){if(Xn)return xt;Xn=1;var e=wa(),t=_a(),n=Ta(),o=Ea(),i=Aa(),r=Ma(),c=$a();return c.alea=e,c.xor128=t,c.xorwow=n,c.xorshift7=o,c.xor4096=i,c.tychei=r,xt=c,xt}var Oa=Da();const qa=ya(Oa),ot=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],Mt=ot.reduce((e,t)=>t.length<e.length?t:e).length,Pt=ot.reduce((e,t)=>t.length>e.length?t:e).length;function Na(e){const t=e?.seed?new qa(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let p=typeof n!="number"?Mt:s(n);const h=typeof o!="number"?Pt:s(o);p>h&&(p=h);let g=!1,m;for(;!g;)m=c(),g=m.length<=h&&m.length>=p;return m}function c(){return ot[a(ot.length)]}function s(p){return p<Mt&&(p=Mt),p>Pt&&(p=Pt),p}function a(p){const h=t?t():Math.random();return Math.floor(h*p)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=p=>p),typeof e.separator!="string"&&(e.separator=" ");const l=e.min+a(e.max+1-e.min);let f=[],u="",d=0;for(let p=0;p<l*e.wordsPerString;p++)d===e.wordsPerString-1?u+=e.formatter(r(),d):u+=e.formatter(r(),d)+e.separator,d++,(p+1)%e.wordsPerString===0&&(f.push(u),u="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const $o=e=>`${e}×`,Do=e=>`${e.toFixed(1)}×`;function Oo(){const e=Na({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function Wa(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=$o(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=Do(e.intensity),ie(t.paneA,e.strategyA),ie(t.paneB,e.strategyB),oe(t.paneA,e.repositionA),oe(t.paneB,e.repositionB),po(t,e.scenario);const n=W(e.scenario);Object.keys(e.overrides).length>0&&Fo(t,!0),at(n,e.overrides,t)}function xe(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function qo(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function No(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function Ha(e){if(e.length<2)return{d:"M 0 13 L 100 13",lastX:100,lastY:13};let t=e[0]??0,n=e[0]??0;for(let a=1;a<e.length;a++){const l=e[a];l!==void 0&&(l<t&&(t=l),l>n&&(n=l))}const o=n-t,i=e.length;let r="",c=0,s=7;for(let a=0;a<i;a++){const l=a/(i-1)*100,f=o>0?13-((e[a]??0)-t)/o*12:7;r+=`${a===0?"M":"L"} ${l.toFixed(2)} ${f.toFixed(2)} `,c=l,s=f}return{d:r.trim(),lastX:c,lastY:s}}const Lt="http://www.w3.org/2000/svg",Gt=[["wait avg","avg_wait_s"],["wait max","max_wait_s"],["delivered","delivered"],["abandoned","abandoned"],["util","utilization"]];function Ga(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Ua(e,t,n){const o=Yn(e,n),i=Yn(t,n),r=o-i,c=r>0?"▴":"▾",s=r>0?"+":r<0?"−":"",a=Math.abs(r);switch(n){case"avg_wait_s":case"max_wait_s":return`${c} ${s}${a.toFixed(1)} s`;case"delivered":case"abandoned":return`${c} ${s}${a.toFixed(0)}`;case"utilization":return`${c} ${s}${(a*100).toFixed(0)}%`}}function Yn(e,t){switch(t){case"avg_wait_s":return e.avg_wait_s;case"max_wait_s":return e.max_wait_s;case"delivered":return e.delivered;case"abandoned":return e.abandoned;case"utilization":return e.utilization}}function ja(e,t){const n=(p,h,g,m)=>Math.abs(p-h)<g?["tie","tie"]:(m?p>h:p<h)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,c]=n(e.max_wait_s,t.max_wait_s,.05,!1),[s,a]=n(e.delivered,t.delivered,.5,!0),[l,f]=n(e.abandoned,t.abandoned,.5,!1),[u,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:s,abandoned:l,utilization:u},b:{avg_wait_s:i,max_wait_s:c,delivered:a,abandoned:f,utilization:d}}}function Kn(e){const t=document.createDocumentFragment();for(const[n]of Gt){const o=Z("div","metric-row"),i=document.createElementNS(Lt,"svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS(Lt,"path"));const r=document.createElementNS(Lt,"circle");r.classList.add("metric-spark-dot"),r.setAttribute("r","1.4"),i.appendChild(r),o.append(Z("span","metric-k",n),Z("span","metric-v"),Z("span","metric-d"),i),t.appendChild(o)}e.replaceChildren(t)}function Bt(e,t,n,o,i){const r=e.children;for(let c=0;c<Gt.length;c++){const s=r[c];if(!s)continue;const a=Gt[c];if(!a)continue;const l=a[1],f=n?n[l]:"";s.dataset.verdict!==f&&(s.dataset.verdict=f);const u=s.children[1],d=Ga(t,l);u.textContent!==d&&(u.textContent=d);const p=s.children[2],g=i!==null&&f!=="tie"&&f!==""?Ua(t,i,l):"";p.textContent!==g&&(p.textContent=g);const m=s.children[3],T=m.firstElementChild,_=m.children[1],R=Ha(o[l]);T.getAttribute("d")!==R.d&&T.setAttribute("d",R.d);const y=R.lastX.toFixed(2),S=R.lastY.toFixed(2);_.getAttribute("cx")!==y&&_.setAttribute("cx",y),_.getAttribute("cy")!==S&&_.setAttribute("cy",S)}}const za=200;function Wo(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function J(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=W(e.permalink.scenario);e.traffic=new xo(ao(e.permalink.seed)),Wo(e,o),Ce(e.paneA),Ce(e.paneB),e.paneA=null,e.paneB=null;try{const i=await Mn(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);ie(t.paneA,e.permalink.strategyA),oe(t.paneA,e.permalink.repositionA),Kn(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await Mn(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),ie(t.paneB,e.permalink.strategyB),oe(t.paneB,e.permalink.repositionB),Kn(t.paneB.metrics)}catch(c){throw Ce(i),c}if(n!==e.initToken){Ce(i),Ce(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,qo(e,t),No(e,t),at(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&G(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function Va(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<za&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if(Mo(e,c=>{const s=c.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);s.kind==="err"&&console.warn(`spawnRider failed (seed): ${s.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(Wo(e,W(e.permalink.scenario)),e.seeding=null)}function Xa(e,t){const n=()=>J(e,t),o={renderPaneStrategyInfo:ie,renderPaneRepositionInfo:oe,refreshStrategyPopovers:()=>{Ae(e,t,n),Ie(e,t,n)},renderTweakPanel:()=>{const r=W(e.permalink.scenario);at(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const c=r.target;if(!(c instanceof HTMLElement))return;const s=c.closest(".scenario-card");if(!s)return;const a=s.dataset.scenarioId;!a||a===e.permalink.scenario||uo(e,t,a,n,o)}),On(e,t,t.paneA,n),On(e,t,t.paneB,n),Fn(e,t,t.paneA,n),Fn(e,t,t.paneB,n),Ae(e,t,n),Ie(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},N(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",Ae(e,t,n),Ie(e,t,n),J(e,t).then(()=>{G(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||$.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},N(e.permalink),J(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=Oo();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},N(e.permalink),J(e,t).then(()=>{G(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=$o(r)}),t.speedInput.addEventListener("change",()=>{N(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=Do(r)}),t.intensityInput.addEventListener("change",()=>{N(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{J(e,t),G(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";Fo(t,r)});for(const r of me){const c=t.tweakRows[r];nn(c.dec,()=>{Ge(e,t,r,-1,n)}),nn(c.inc,()=>{Ge(e,t,r,1,n)}),c.reset.addEventListener("click",()=>{ga(e,t,r,n)}),c.root.addEventListener("keydown",s=>{s.key==="ArrowUp"||s.key==="ArrowRight"?(s.preventDefault(),Ge(e,t,r,1,n)):(s.key==="ArrowDown"||s.key==="ArrowLeft")&&(s.preventDefault(),Ge(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{ma(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=so(e.permalink),c=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(c).then(()=>{G(t.toast,"Permalink copied")},()=>{G(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{xe(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{xe(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&xe(t,!1)}),Ya(e,t,o),pa(t)}function Ya(e,t,n){window.addEventListener("keydown",o=>{if(e.permalink.mode==="quest")return;if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable||o.target.closest(".monaco-editor"))return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),xe(t,t.shortcutSheet.hidden);return}case"Escape":{if(Bo(t)||Lo(t)){o.preventDefault(),st(t);return}t.shortcutSheet.hidden||(o.preventDefault(),xe(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=Pe.length){const r=Pe[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),uo(e,t,r.id,()=>J(e,t),n))}})}const Ka="elevator-core playground",Qn="In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";function Jn(e){Ko(Qa(e))}function Qa(e){if(e.mode==="quest")return{title:`Quest curriculum — ${Ka}`,description:"Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time."};const n=W(e.scenario).label,o=ge[e.strategyA],i=ge[e.strategyB],r=Le[e.repositionA],c=Le[e.repositionB];if(e.compare){const l=`${n}: ${o} vs ${i} — Elevator dispatch playground`,f=`Compare ${o} (parking: ${r}) against ${i} (parking: ${c}) dispatch on the ${n.toLowerCase()} scenario. ${Qn}`;return{title:l,description:f}}const s=`${n}: ${o} dispatch — Elevator dispatch playground`,a=`Watch ${o} dispatch (parking: ${r}) handle live rider traffic on the ${n.toLowerCase()} scenario. ${Qn}`;return{title:s,description:a}}function Zn(e,t){e.sim.step(t);const n=e.sim.drainEvents();if(n.length===0)return null;const o=e.sim.snapshot();sa(e,n,o);const i=new Map;for(const r of o.cars)i.set(r.id,r.line);for(const r of n)if(r.kind==="elevator-assigned"){const c=i.get(r.elevator);c!==void 0&&e.renderer.pushAssignment(r.stop,r.elevator,c)}return o}function Ja(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=ja(t.latestMetrics,n.latestMetrics);Bt(t.metricsEl,t.latestMetrics,o.a,t.metricHistory,n.latestMetrics),Bt(n.metricsEl,n.latestMetrics,o.b,n.metricHistory,t.latestMetrics)}else Bt(t.metricsEl,t.latestMetrics,null,t.metricHistory,null);Ln(t),n&&Ln(n)}function Za(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const c=e.paneA,s=e.paneB,a=c!==null&&(!e.permalink.compare||s!==null);if(e.running&&e.ready&&a){const l=e.permalink.speed;let f=Zn(c,l);s&&Zn(s,l),e.seeding&&(Va(e),f=null);const d=Math.min(r,4/60)*l;let p=[];if(!e.seeding){const m=f??c.sim.snapshot();p=e.traffic.drainSpawns(m,d),f=m}for(const m of p)Mo(e,T=>{const _=T.sim.spawnRider(m.originStopId,m.destStopId,m.weight,m.patienceTicks);_.kind==="err"&&console.warn(`spawnRider failed: ${_.error}`)});const h=e.permalink.speed,g=p.length>0||f===null?c.sim.snapshot():f;Pn(c,g,h),s&&Pn(s,s.sim.snapshot(),h),Ja(e),(n+=1)%4===0&&(qo(e,t),No(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function ec(){Ao().catch(()=>{});const t=da(),n=new URLSearchParams(window.location.search).has("k"),o={...$,...mi(window.location.search)};if(!n){o.seed=Oo();const s=new URL(window.location.href);s.searchParams.set("k",o.seed),window.history.replaceState(null,"",s.toString())}_i(o);const i=W(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=eo(i,o.overrides),Ri(o.mode),Ei(o.mode),Wa(o,t);const c={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new xo(ao(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(Xa(c,t),hi(Jn),Jn(o),Yo(),await J(c,t),c.ready=!0,Za(c,t),c.permalink.mode==="quest"){const s=new URLSearchParams(window.location.search).has("qs");await Js({initialStageId:c.permalink.questStage,landOn:s?"stage":"grid",onStageChange:a=>{c.permalink.questStage=a,N(c.permalink)},onBackToGrid:()=>{c.permalink.questStage=$.questStage,N(c.permalink)}})}}ec();export{et as _};
