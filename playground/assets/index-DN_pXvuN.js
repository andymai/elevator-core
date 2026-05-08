const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-Bv-GgKZl.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function n(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(o){if(o.ep)return;o.ep=!0;const r=n(o);fetch(o.href,r)}})();function Z(e,t,n){const i=document.createElement(e);return i.className=t,n!==void 0&&(i.textContent=n),i}let rn=0;function G(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(rn),rn=window.setTimeout(()=>{e.classList.remove("show")},1600)}function sn(e,t){let o=0,r=0;const a=()=>{o&&window.clearTimeout(o),r&&window.clearInterval(r),o=0,r=0};e.addEventListener("pointerdown",s=>{e.disabled||(s.preventDefault(),t(),o=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){a();return}t()},70)},380))}),e.addEventListener("pointerup",a),e.addEventListener("pointerleave",a),e.addEventListener("pointercancel",a),e.addEventListener("blur",a),e.addEventListener("click",s=>{s.pointerType||t()})}function Zi(){document.getElementById("seo-fallback")?.remove()}function eo(e){document.title!==e.title&&(document.title=e.title),we('meta[name="description"]',"content",e.description),we('meta[property="og:title"]',"content",e.title),we('meta[property="og:description"]',"content",e.description),we('meta[name="twitter:title"]',"content",e.title),we('meta[name="twitter:description"]',"content",e.description)}function we(e,t,n){const i=document.querySelector(e);i&&i.getAttribute(t)!==n&&i.setAttribute(t,n)}function ee(e,t,n){const i=Vt(e,t),o=n[t];if(o===void 0||!Number.isFinite(o))return i;const r=e.tweakRanges[t];return ai(o,r.min,r.max)}function Vt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return si(n.doorOpenTicks,n.doorTransitionTicks)}}function Xt(e,t,n){const i=Vt(e,t),o=e.tweakRanges[t].step/2;return Math.abs(n-i)>o}function ri(e,t){const n={};for(const i of me){const o=t[i];o!==void 0&&Xt(e,i,o)&&(n[i]=o)}return n}const me=["cars","maxSpeed","weightCapacity","doorCycleSec"];function to(e,t){const{doorOpenTicks:n,doorTransitionTicks:i}=e.elevatorDefaults,o=si(n,i),r=ai(n/(o*Je),.1,.9),a=Math.max(2,Math.round(t*Je)),s=Math.max(1,Math.round(a*r)),c=Math.max(1,Math.round((a-s)/2));return{openTicks:s,transitionTicks:c}}function si(e,t){return(e+2*t)/Je}function Yt(e,t){const n=e.elevatorDefaults,i=ee(e,"maxSpeed",t),o=ee(e,"weightCapacity",t),r=ee(e,"doorCycleSec",t),{openTicks:a,transitionTicks:s}=to(e,r);return{...n,maxSpeed:i,weightCapacity:o,doorOpenTicks:a,doorTransitionTicks:s}}function no(e,t){if(e<1||t<1)return[];const n=[];for(let i=0;i<t;i+=1)n.push(Math.min(e-1,Math.floor(i*e/t)));return n}function io(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const i=Math.round(ee(e,"cars",t)),o=Yt(e,t),r=no(e.stops.length,i),a=e.stops.map((c,l)=>`        StopConfig(id: StopId(${l}), name: ${Dt(c.name)}, position: ${z(c.positionM)}),`).join(`
`),s=r.map((c,l)=>ro(l,o,c,oo(l,i))).join(`
`);return`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: ${Dt(e.buildingName)},
        stops: [
${a}
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
)`}const Je=60;function ai(e,t,n){return Math.min(n,Math.max(t,e))}function oo(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function ro(e,t,n,i){const o=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${z(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${z(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${Dt(i)},
            max_speed: ${z(t.maxSpeed)}, acceleration: ${z(t.acceleration)}, deceleration: ${z(t.deceleration)},
            weight_capacity: ${z(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${o}${r}
        ),`}function Dt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function z(e){return Number.isInteger(e)?`${e}.0`:String(e)}const ci={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function We(e){return Array.from({length:e},()=>1)}const le=5,so=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:le},(e,t)=>t===le-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:We(le),destWeights:We(le)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:We(le),destWeights:We(le)}],ao={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:so,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...ci,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},Ze=19,Ot=16,Me=4,li=(1+Ze)*Me,Te=1,Re=41,Ee=42,co=43;function j(e){return Array.from({length:co},(t,n)=>e(n))}const de=e=>e===Te||e===Re||e===Ee,lo=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:j(e=>e===0?20:e===Te?2:e===Re?1.2:e===Ee?.2:.1),destWeights:j(e=>e===0?0:e===Te?.3:e===Re?.4:e===Ee?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:j(e=>de(e)?.5:1),destWeights:j(e=>de(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:j(e=>e===21?4:de(e)?.25:1),destWeights:j(e=>e===21?5:de(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:j(e=>e===0||e===Te||e===21?.3:e===Re?.4:e===Ee?1.2:1),destWeights:j(e=>e===0?20:e===Te?1:e===Re?.6:e===Ee?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:j(e=>de(e)?1.5:.2),destWeights:j(e=>de(e)?1.5:.2)}];function po(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let s=1;s<=Ze;s++){const c=1+s,l=s*Me;e.push(`        StopConfig(id: StopId(${c.toString().padStart(2," ")}), name: "Floor ${s}",    position: ${l.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${li.toFixed(1)}),`);for(let s=21;s<=20+Ot;s++){const c=1+s,l=s*Me;e.push(`        StopConfig(id: StopId(${c}), name: "Floor ${s}",   position: ${l.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:Ze},(s,c)=>2+c),21],n=[21,...Array.from({length:Ot},(s,c)=>22+c)],i=[1,21,38,39,40],o=[1,0,41,42],r=s=>s.map(c=>`StopId(${c})`).join(", "),a=(s,c,l,f)=>`                ElevatorConfig(
                    id: ${s}, name: "${c}",
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
${a(0,"Low 1",1,1800)}
${a(1,"Low 2",21,1800)}
                ],
            ),
            LineConfig(
                id: 1, name: "High bank",
                serves: [${r(n)}],
                elevators: [
${a(2,"High 1",21,1800)}
${a(5,"High 2",37,1800)}
                ],
            ),
            LineConfig(
                id: 2, name: "Executive",
                serves: [${r(i)}],
                elevators: [
${a(3,"VIP",1,350)}
                ],
            ),
            LineConfig(
                id: 3, name: "Service",
                serves: [${r(o)}],
                elevators: [
${a(4,"Service",1,350)}
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
)`}const uo=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:Ze},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*Me})),{name:"Sky Lobby",positionM:li},...Array.from({length:Ot},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*Me})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],fo={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:lo,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:uo,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...ci,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:po()},an=1e5,cn=4e5,ln=35786e3,ho=1e8,go=4;function He(e){return Array.from({length:go},(t,n)=>e(n))}const mo={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:He(e=>e===0?6:1),destWeights:He(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:He(e=>e===0?0:e===1?1:e===2?3:5),destWeights:He(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:an},{name:"LEO Transfer",positionM:cn},{name:"GEO Platform",positionM:ln}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:ho,showDayNight:!1},ron:`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${an.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${cn.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${ln.toFixed(1)}),
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
)`},Pe=[fo,mo,ao];function W(e){const t=Pe.find(i=>i.id===e);if(t)return t;const n=Pe[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const di={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},$={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},bo=["scan","look","nearest","etd","destination","rsr"],yo=["adaptive","predictive","lobby","spread","none"];function dn(e,t){return e!==null&&bo.includes(e)?e:t}function pn(e,t){return e!==null&&yo.includes(e)?e:t}const qt=new Set;function So(e){return qt.add(e),()=>qt.delete(e)}function N(e){const t=pi(e);if(window.location.search!==t){window.history.replaceState(null,"",t);for(const n of qt)n(e)}}function vo(e,t){return e==="compare"||e==="quest"?e:t}function pi(e){const t=new URLSearchParams;e.mode!==$.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==$.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=W(e.scenario).defaultReposition,i=n??$.repositionA,o=n??$.repositionB;e.repositionA!==i&&t.set("pa",e.repositionA),e.repositionB!==o&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of me){const a=e.overrides[r];a!==void 0&&Number.isFinite(a)&&t.set(di[r],ko(a))}return`?${t.toString()}`}function wo(e){const t=new URLSearchParams(e),n={};for(const i of me){const o=t.get(di[i]);if(o===null)continue;const r=Number(o);Number.isFinite(r)&&(n[i]=r)}return{mode:vo(t.get("m"),$.mode),questStage:(t.get("qs")??"").trim()||$.questStage,scenario:t.get("s")??$.scenario,strategyA:dn(t.get("a")??t.get("d"),$.strategyA),strategyB:dn(t.get("b"),$.strategyB),repositionA:pn(t.get("pa"),$.repositionA),repositionB:pn(t.get("pb"),$.repositionB),compare:t.has("c")?t.get("c")==="1":$.compare,seed:(t.get("k")??"").trim()||$.seed,intensity:un(t.get("i"),$.intensity),speed:un(t.get("x"),$.speed),overrides:n}}function un(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function ko(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function ui(e){let t=2166136261;const n=e.trim();for(let i=0;i<n.length;i++)t^=n.charCodeAt(i),t=Math.imul(t,16777619);return t>>>0}const _o=["scan","look","nearest","etd","destination","rsr"],ge={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},fi={scan:"Sweep end-to-end, reverse at each end.",look:"Sweep until last call, then reverse.",nearest:"Assign each call to the closest car.",etd:"Assign by estimated time-to-destination.",destination:"Riders enter destination at the lobby; the group optimises.",rsr:"ETD penalised by queue length."},Co=["adaptive","predictive","lobby","spread","none"],Le={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},hi={adaptive:"Switch by traffic mode; the default.",predictive:"Park near the most-active floor.",lobby:"Return idle cars to the lobby.",spread:"Fan idle cars across the shaft.",none:"Idle cars stay where they finished."},To="scenario-card inline-flex items-center gap-1.5 px-2 py-1 border-b-2 border-b-transparent text-content-tertiary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:text-content aria-pressed:text-content aria-pressed:border-b-accent max-md:flex-none max-md:snap-start",Ro="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function Eo(e){const t=document.createDocumentFragment();Pe.forEach((n,i)=>{const o=Z("button",To);o.type="button",o.dataset.scenarioId=n.id,o.setAttribute("aria-pressed","false"),o.title=n.description,o.append(Z("span","",n.label),Z("span",Ro,String(i+1))),t.appendChild(o)}),e.scenarioCards.replaceChildren(t)}function gi(e,t){for(const n of e.scenarioCards.children){const i=n;i.setAttribute("aria-pressed",i.dataset.scenarioId===t?"true":"false")}}async function mi(e,t,n,i,o){const r=W(n),a=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,s=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:a,repositionA:s,overrides:{}},N(e.permalink),o.renderPaneStrategyInfo(t.paneA,a),o.renderPaneRepositionInfo(t.paneA,s),o.refreshStrategyPopovers(),gi(t,r.id),await i(),o.renderTweakPanel(),G(t.toast,`${r.label} · ${ge[a]}`)}function Io(e){const t=W(e.scenario);e.scenario=t.id}const Ao=["layout","scenario-picker","controls-bar","cabin-legend"],xo=["quest-pane"];function Mo(e){const t=e==="quest";for(const n of Ao){const i=document.getElementById(n);i&&i.classList.toggle("hidden",t)}for(const n of xo){const i=document.getElementById(n);i&&(i.classList.toggle("hidden",!t),i.classList.toggle("flex",t))}}function Po(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const i of n){const o=i.dataset.mode===e;i.dataset.active=String(o),i.setAttribute("aria-pressed",String(o))}t.addEventListener("click",i=>{const o=i.target;if(!(o instanceof HTMLElement))return;const r=o.closest("button[data-mode]");if(!r)return;const a=r.dataset.mode;if(a!=="compare"&&a!=="quest"||a===e)return;const s=new URL(window.location.href);a==="compare"?(s.searchParams.delete("m"),s.searchParams.delete("qs")):s.searchParams.set("m",a),window.location.assign(s.toString())})}const Lo="modulepreload",Bo=function(e,t){return new URL(e,t).href},fn={},et=function(t,n,i){let o=Promise.resolve();if(n&&n.length>0){let a=function(f){return Promise.all(f.map(p=>Promise.resolve(p).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const s=document.getElementsByTagName("link"),c=document.querySelector("meta[property=csp-nonce]"),l=c?.nonce||c?.getAttribute("nonce");o=a(n.map(f=>{if(f=Bo(f,i),f in fn)return;fn[f]=!0;const p=f.endsWith(".css"),d=p?'[rel="stylesheet"]':"";if(!!i)for(let g=s.length-1;g>=0;g--){const m=s[g];if(m.href===f&&(!p||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=p?"stylesheet":Lo,p||(h.as="script"),h.crossOrigin="",h.href=f,l&&h.setAttribute("nonce",l),document.head.appendChild(h),p)return new Promise((g,m)=>{h.addEventListener("load",g),h.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(a){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=a,window.dispatchEvent(s),!s.defaultPrevented)throw a}return o.then(a=>{for(const s of a||[])s.status==="rejected"&&r(s.reason);return t().catch(r)})};class bi extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function Fo(e){const t=(await et(async()=>{const{default:o}=await import("./worker-DE_xV-Fq.js");return{default:o}},[],import.meta.url)).default,n=new t,i=new $o(n);return await i.init(e),i}class $o{#e;#t=new Map;#n=1;#o=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#c),this.#e.addEventListener("error",this.#i),this.#e.addEventListener("messageerror",this.#i)}async init(t){await this.#a({kind:"init",id:this.#s(),payload:this.#d(t)})}async tick(t,n){const i=n?.wantVisuals??!1;return this.#a({kind:"tick",id:this.#s(),ticks:t,...i?{wantVisuals:!0}:{}})}async spawnRider(t,n,i,o){return this.#a({kind:"spawn-rider",id:this.#s(),origin:t,destination:n,weight:i,...o!==void 0?{patienceTicks:o}:{}})}async setStrategy(t){await this.#a({kind:"set-strategy",id:this.#s(),strategy:t})}async loadController(t,n){const i=n?.unlockedApi??null,o=n?.timeoutMs,r=this.#a({kind:"load-controller",id:this.#s(),source:t,unlockedApi:i});if(o===void 0){await r;return}r.catch(()=>{});let a;const s=new Promise((c,l)=>{a=setTimeout(()=>{l(new Error(`controller did not return within ${o}ms`))},o)});try{await Promise.race([r,s])}finally{a!==void 0&&clearTimeout(a)}}async reset(t){await this.#a({kind:"reset",id:this.#s(),payload:this.#d(t)})}dispose(){this.#o||(this.#o=!0,this.#e.removeEventListener("message",this.#c),this.#e.removeEventListener("error",this.#i),this.#e.removeEventListener("messageerror",this.#i),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#s(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,i=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:i,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#a(t){if(this.#o)throw new Error("WorkerSim disposed");return new Promise((n,i)=>{this.#t.set(t.id,{resolve:n,reject:i}),this.#e.postMessage(t)})}#i=t=>{const n=t.message,i=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#o=!0,this.#e.terminate(),this.#r(new Error(i))};#c=t=>{const n=t.data,i=this.#t.get(n.id);if(i)switch(this.#t.delete(n.id),n.kind){case"ok":i.resolve(void 0);return;case"tick-result":i.resolve(n.result);return;case"spawn-result":n.error!==null?i.reject(new Error(n.error)):i.resolve(n.riderId);return;case"error":{const o=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;i.reject(o!==null?new bi(n.message,o):new Error(n.message));return}default:{const o=n.kind;i.reject(new Error(`WorkerSim: unknown reply kind "${String(o)}"`));return}}}}const Do=`// Quest curriculum — sim global declaration.
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
`,hn="quest-runtime";let St=null,pe=null;async function Oo(){return St||pe||(pe=(async()=>{await qo();const e=await et(()=>import("./editor.main-Bv-GgKZl.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return St=e,e})(),pe.catch(()=>{pe=null}),pe)}async function qo(){const[{default:e},{default:t}]=await Promise.all([et(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),et(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,i){return i==="typescript"||i==="javascript"?new e:new t}}}function No(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(Do,"ts:filename/quest-sim-globals.d.ts"))}function Wo(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function Ho(e){const t=await Oo();No(t),Wo(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:i=>{n.setValue(i)},onDidChange(i){const o=n.onDidChangeModelContent(()=>{i()});return{dispose:()=>{o.dispose()}}},insertAtCursor(i){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:i,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(i){const o=n.getModel();if(!o)return;const r=i.message.split(`
`)[0]??i.message;t.editor.setModelMarkers(o,hn,[{severity:8,message:r,startLineNumber:i.line,startColumn:i.column,endLineNumber:i.line,endColumn:i.column+1}]),n.revealLineInCenterIfOutsideViewport(i.line)},clearRuntimeMarker(){const i=n.getModel();i&&t.editor.setModelMarkers(i,hn,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const Go=`SimConfig(
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
)`,Uo={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:Go,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},jo=`SimConfig(
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
)`,zo={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:jo,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},Vo=`SimConfig(
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
)`,Xo={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:Vo,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},Yo=`SimConfig(
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
)`,Ko={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:Yo,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function F(e,t){const n=t.startTick??0,i=t.intervalTicks??30,o=t.destinations;if(o.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,a)=>{const s=o[a%o.length];return{origin:t.origin,destination:s,atTick:n+a*i,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const Qo=`SimConfig(
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
)`,Jo={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:Qo,unlockedApi:["setStrategy"],seedRiders:[...F(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},Zo=`SimConfig(
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
`,tr={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:Zo,unlockedApi:["setStrategyJs"],seedRiders:[...F(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...F(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:er,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},nr=`SimConfig(
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
)`,ir={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:nr,unlockedApi:["setStrategyJs"],seedRiders:[...F(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...F(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},or=`SimConfig(
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
`,sr={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:or,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...F(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...F(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:rr,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},ar=`SimConfig(
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
)`,cr=`// Stage 9 — Take the Wheel
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
`,lr={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:ar,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...F(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:cr,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},dr=`SimConfig(
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
`,ur={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:dr,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...F(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:pr,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},fr=`SimConfig(
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
`,gr={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:fr,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...F(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...F(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:hr,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},mr=`SimConfig(
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
`,yr={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:mr,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...F(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...F(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:br,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},Sr=`SimConfig(
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
`,wr={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:Sr,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...F(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...F(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...F(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:vr,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},kr=`SimConfig(
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
`,Cr={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:kr,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...F(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:_r,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},Tr=`SimConfig(
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
`,Er={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:Tr,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...F(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...F(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:Rr,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},ne=[Uo,zo,Xo,Ko,Jo,tr,ir,sr,lr,ur,gr,yr,wr,Cr,Er];function Ir(e){return ne.find(t=>t.id===e)}function Ar(e){const t=ne.findIndex(n=>n.id===e);if(!(t<0))return ne[t+1]}function P(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function ot(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const tt="quest:code:v1:",yi="quest:bestStars:v1:",Si=5e4;function Be(){try{return globalThis.localStorage??null}catch{return null}}function gn(e){const t=Be();if(!t)return null;try{const n=t.getItem(tt+e);if(n===null)return null;if(n.length>Si){try{t.removeItem(tt+e)}catch{}return null}return n}catch{return null}}function mn(e,t){if(t.length>Si)return;const n=Be();if(n)try{n.setItem(tt+e,t)}catch{}}function xr(e){const t=Be();if(t)try{t.removeItem(tt+e)}catch{}}function Fe(e){const t=Be();if(!t)return 0;let n;try{n=t.getItem(yi+e)}catch{return 0}if(n===null)return 0;const i=Number.parseInt(n,10);return!Number.isInteger(i)||i<0||i>3?0:i}function Mr(e,t){const n=Fe(e);if(t<=n)return;const i=Be();if(i)try{i.setItem(yi+e,String(t))}catch{}}const Pr={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},Lr=["basics","strategies","events-manual","topology"],vi=3;function Br(){return{root:P("quest-grid","quest-grid"),progress:P("quest-grid-progress","quest-grid"),sections:P("quest-grid-sections","quest-grid")}}function vt(e,t){ot(e.sections);let n=0;const i=ne.length*vi;for(const o of Lr){const r=ne.filter(l=>l.section===o);if(r.length===0)continue;const a=document.createElement("section");a.dataset.section=o;const s=document.createElement("h2");s.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",s.textContent=Pr[o],a.appendChild(s);const c=document.createElement("div");c.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const l of r){const f=Fe(l.id);n+=f,c.appendChild(Fr(l,f,t))}a.appendChild(c),e.sections.appendChild(a)}e.progress.textContent=`${n} / ${i}`}function Fr(e,t,n){const i=ne.findIndex(p=>p.id===e.id),o=String(i+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const a=document.createElement("div");a.className="flex items-baseline justify-between gap-2";const s=document.createElement("span");s.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",s.textContent=o,a.appendChild(s);const c=document.createElement("span");c.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",c.classList.add(t>0?"text-accent":"text-content-disabled"),c.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),c.textContent="★".repeat(t)+"☆".repeat(vi-t),a.appendChild(c),r.appendChild(a);const l=document.createElement("div");l.className="text-content text-[13px] font-semibold tracking-[-0.01em]",l.textContent=e.title,r.appendChild(l);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const $r=75;async function bn(e,t,n,i){let o=n;for(;o<t.length;){const r=t[o];if(r===void 0||(r.atTick??0)>i)break;await e.spawnRider(r.origin,r.destination,r.weight??$r,r.patienceTicks),o+=1}return o}async function Dr(e,t,n={}){const i=n.maxTicks??1500,o=n.batchTicks??60,r=await Fo({configRon:e.configRon,strategy:"scan"});try{const a=[...e.seedRiders].sort((d,u)=>(d.atTick??0)-(u.atTick??0));let s=await bn(r,a,0,0);const c={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(c.timeoutMs=n.timeoutMs),await r.loadController(t,c);let l=null,f=0;const p=n.onSnapshot!==void 0;for(;f<i;){const d=i-f,u=Math.min(o,d),h=await r.tick(u,p?{wantVisuals:!0}:void 0);l=h.metrics,f=h.tick,s=await bn(r,a,s,f);const g=yn(l,f);if(n.onProgress)try{n.onProgress(g)}catch{}if(n.onSnapshot&&h.snapshot)try{n.onSnapshot(h.snapshot)}catch{}if(e.passFn(g))return Sn(e,g,!0)}if(l===null)throw new Error("runStage: maxTicks must be positive");return Sn(e,yn(l,f),!1)}finally{r.dispose()}}function yn(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function Sn(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let i=1;return e.starFns[0]?.(t)&&(i=2,e.starFns[1]?.(t)&&(i=3)),{passed:!0,stars:i,grade:t}}function Or(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const i=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(i)&&i>0&&n.push(`${i.toFixed(1)}s avg wait`),n.join(" · ")}const wi=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(wi.map(e=>[e.name,e]));function ki(e){const t=new Set(e);return wi.filter(n=>t.has(n.name))}function qr(){return{root:P("quest-api-panel","api-panel")}}function vn(e,t){ot(e.root);const n=ki(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const i=document.createElement("p");i.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",i.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(i);const o=document.createElement("ul");o.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const a=document.createElement("li");a.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const s=document.createElement("code");s.className="block font-mono text-[12px] text-content",s.textContent=r.signature,a.appendChild(s);const c=document.createElement("p");c.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",c.textContent=r.description,a.appendChild(c),o.appendChild(a)}e.root.appendChild(o)}function Nr(){return{root:P("quest-hints","hints-drawer"),count:P("quest-hints-count","hints-drawer"),list:P("quest-hints-list","hints-drawer")}}const wn="quest-hints-more";function kn(e,t){ot(e.list);for(const i of e.root.querySelectorAll(`.${wn}`))i.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((i,o)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=i,o>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const i=document.createElement("button");i.type="button",i.className=`${wn} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,i.textContent=`Show ${n-1} more`,i.addEventListener("click",()=>{for(const o of e.list.querySelectorAll("li[hidden]"))o.hidden=!1;i.remove()}),e.root.appendChild(i)}e.root.removeAttribute("open")}function Wr(e,t){return{activeStage:e,currentView:t,runLoop:{active:!1}}}function Hr(e,t){e.activeStage=t}function wt(e,t){e.currentView=t}function _n(e){e.runLoop.active=!1}function ke(e,t){return e.currentView==="stage"&&e.activeStage.id===t.id}function Gr(){return{root:P("quest-reference","reference-panel"),status:P("quest-reference-status","reference-panel"),code:P("quest-reference-code","reference-panel")}}function kt(e,t,n={}){const i=t.referenceSolution,o=Fe(t.id);if(!i||o===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=o===3?"(mastered)":"(unlocked)",e.code.textContent=i,n.collapse!==!1&&e.root.removeAttribute("open")}function Ur(){const e="results-modal";return{root:P("quest-results-modal",e),title:P("quest-results-title",e),stars:P("quest-results-stars",e),detail:P("quest-results-detail",e),close:P("quest-results-close",e),retry:P("quest-results-retry",e),next:P("quest-results-next",e)}}function jr(e,t,n,i,o){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=zr(t.grade,t.passed,i),e.retry.onclick=()=>{_t(e),n()},e.close.onclick=()=>{_t(e)};const r=o;r?(e.next.hidden=!1,e.next.onclick=()=>{_t(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function _t(e){e.root.classList.remove("show")}function zr(e,t,n){const i=`tick ${e.endTick}`,o=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${o} · finished by ${i}.`;if(n)try{const r=n(e);if(r)return`${o}. ${r}`}catch{}return`${o}. The pass condition wasn't met within the run budget.`}const Vr={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function Cn(e){return Vr[e]??`sim.${e}();`}function Xr(){return{root:P("quest-snippets","snippet-picker")}}function Tn(e,t,n){ot(e.root);const i=ki(t.unlockedApi);if(i.length!==0)for(const o of i){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=o.name,r.title=`Insert: ${Cn(o.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(Cn(o.name))}),e.root.appendChild(r)}}const rt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},Yr="#2a2a35",Kr="#a1a1aa",V='"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',Qr=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],Jr=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],Zr="rgba(8, 10, 14, 0.55)",es="#3a3a45",ts=[1,1,.5,.42],ns=["LOW","HIGH","VIP","SERVICE"],is="#e6c56b",os="#9bd4c4",rs=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],ss="#a1a1aa",as="#4a4a55",cs="#f59e0b",_i="#7dd3fc",Ci="#fda4af",Ct="#fafafa",Ti="#8b8c92",Ri="rgba(250, 250, 250, 0.95)",ls=260,Nt=3,ds=.05,Rn=["standard","briefcase","bag","short","tall"];function fe(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,Rn[n%Rn.length]??"standard"}function ps(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function Ei(e,t,n,i,o,r="standard"){const a=ps(r,i),c=n-.5,l=c-a.bodyH,f=l-a.neckGap-a.headR,p=a.bodyH*.08,d=c-a.headR*.8;if(e.fillStyle=o,e.beginPath(),e.moveTo(t-a.shoulderW/2,l+p),e.lineTo(t-a.shoulderW/2+p,l),e.lineTo(t+a.shoulderW/2-p,l),e.lineTo(t+a.shoulderW/2,l+p),e.lineTo(t+a.waistW/2,d),e.lineTo(t+a.footW/2,c),e.lineTo(t-a.footW/2,c),e.lineTo(t-a.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,a.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const u=Math.max(1.6,a.headR*.9),h=t+a.waistW/2+u*.1,g=c-u-.5;e.fillRect(h,g,u,u);const m=u*.55;e.fillRect(h+(u-m)/2,g-1,m,1)}else if(r==="bag"){const u=Math.max(1.3,a.headR*.9),h=t-a.shoulderW/2-u*.35,g=l+a.bodyH*.35;e.beginPath(),e.arc(h,g,u,0,Math.PI*2),e.fill(),e.strokeStyle=o,e.lineWidth=.8,e.beginPath(),e.moveTo(h+u*.2,g-u*.8),e.lineTo(t+a.shoulderW/2-p,l+.5),e.stroke()}else if(r==="tall"){const u=a.headR*2.1,h=Math.max(1,a.headR*.45);e.fillRect(t-u/2,f-a.headR-h+.4,u,h)}}function us(e,t,n,i,o,r,a,s,c){const f=Math.max(1,Math.floor((o-14)/s.figureStride)),p=Math.min(r,f),d=-2;for(let u=0;u<p;u++){const h=t+d+i*u*s.figureStride,g=u+0,m=fe(c,g);Ei(e,h,n,s.figureHeadR,a,m)}if(r>p){e.fillStyle=Ti,e.font=`${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const u=t+d+i*p*s.figureStride;e.fillText(`+${r-p}`,u,n-1)}}function te(e,t,n,i,o,r){const a=Math.min(r,i/2,o/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,i,o,a);return}e.moveTo(t+a,n),e.lineTo(t+i-a,n),e.quadraticCurveTo(t+i,n,t+i,n+a),e.lineTo(t+i,n+o-a),e.quadraticCurveTo(t+i,n+o,t+i-a,n+o),e.lineTo(t+a,n+o),e.quadraticCurveTo(t,n+o,t,n+o-a),e.lineTo(t,n+a),e.quadraticCurveTo(t,n,t+a,n),e.closePath()}function fs(e,t,n){if(e.measureText(t).width<=n)return t;const i="…";let o=0,r=t.length;for(;o<r;){const a=o+r+1>>1;e.measureText(t.slice(0,a)+i).width<=n?o=a:r=a-1}return o===0?i:t.slice(0,o)+i}function hs(e,t){for(const n of t){const i=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-i,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const i=n.width/2;e.strokeStyle=n.frame;const o=n.cx-i+.5,r=n.cx+i-.5;e.beginPath(),e.moveTo(o,n.top),e.lineTo(o,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function gs(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px ${V}`,e.textBaseline="alphabetic",e.textAlign="center";const i=n.padTop-n.fontSmall*.5-2,o=i-n.fontSmall*.5-1,r=i+n.fontSmall*.5+1,a=Math.max(n.fontSmall+.5,o);for(const s of t){const c=s.top-3,l=c>o&&c-n.fontSmall<r;e.fillStyle=s.color,e.fillText(s.text,s.cx,l?a:c)}}function ms(e,t,n,i,o,r,a,s,c){e.font=`500 ${i.fontMain.toFixed(0)}px ${V}`,e.textBaseline="middle";const l=i.padX,f=i.padX+i.labelW,p=r-i.padX,d=i.shaftInnerW/2,u=Math.min(i.shaftInnerW*1.8,(p-f)/2);for(let h=0;h<t.length;h++){const g=t[h];if(g===void 0)continue;const m=n(g.y),C=t[h+1],w=C!==void 0?n(C.y):s;if(e.strokeStyle=Yr,e.lineWidth=c?2:1,e.beginPath(),c)for(const y of o)e.moveTo(y-u,m+.5),e.lineTo(y+u,m+.5);else{let y=f;for(const S of o){const k=S-d,b=S+d;k>y&&(e.moveTo(y,m+.5),e.lineTo(k,m+.5)),y=b}y<p&&(e.moveTo(y,m+.5),e.lineTo(p,m+.5))}e.stroke();for(let y=0;y<o.length;y++){const S=o[y];if(S===void 0)continue;const k=a.has(y,g.entity_id);e.strokeStyle=k?cs:as,e.lineWidth=k?1.4:1,e.beginPath(),e.moveTo(S-d-2,m+.5),e.lineTo(S-d,m+.5),e.moveTo(S+d,m+.5),e.lineTo(S+d+2,m+.5),e.stroke()}const T=c?m:(m+w)/2;e.fillStyle=Kr,e.textAlign="right",e.fillText(fs(e,g.name,i.labelW-4),l+i.labelW-4,T)}}function bs(e,t,n,i,o,r){for(const a of t.stops){if(a.waiting_by_line.length===0)continue;const s=r.get(a.entity_id);if(s===void 0||s.size===0)continue;const c=n(a.y),l=a.waiting_up>=a.waiting_down?_i:Ci;for(const f of a.waiting_by_line){if(f.count===0)continue;const p=s.get(f.line);if(p===void 0)continue;const d=o.get(p);if(d===void 0)continue;const u=d.end-d.start;u<=i.figureStride||us(e,d.end-2,c,-1,u,f.count,l,i,a.entity_id)}}}const Tt=new Map;function Kt(e){const t=Tt.get(e);if(t!==void 0)return t;const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return Tt.set(e,null),null;const i=parseInt(n[1],16),o=[i>>16&255,i>>8&255,i&255];return Tt.set(e,o),o}function Wt(e,t){const n=Kt(e);if(n===null)return e;const[i,o,r]=n,a=s=>t>=0?Math.round(s+(255-s)*t):Math.round(s*(1+t));return`rgb(${a(i)}, ${a(o)}, ${a(r)})`}function Qt(e,t){const n=Kt(e);if(n===null)return e;const[i,o,r]=n;return`rgba(${i}, ${o}, ${r}, ${t})`}function Ue(e,t){if(Kt(e)!==null&&e.startsWith("#")){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Qt(e,t)}function ys(e,t,n,i,o){const r=(e+n)/2,a=(t+i)/2,s=n-e,c=i-t,l=Math.max(Math.hypot(s,c),1),f=-c/l,p=s/l,d=Math.min(l*.25,22),u=r+f*d,h=a+p*d,g=1-o;return[g*g*e+2*g*o*u+o*o*n,g*g*t+2*g*o*h+o*o*i]}function Ii(e){let r=e;for(let s=0;s<3;s++){const c=1-r,l=3*c*c*r*.2+3*c*r*r*.2+r*r*r,f=3*c*c*.2+6*c*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(l-e)/f,r=Math.max(0,Math.min(1,r))}const a=1-r;return 3*a*a*r*.6+3*a*r*r*1+r*r*r}function Ss(e,t,n,i,o,r,a,s,c,l=!1){const f=i*.22,p=(o-4)/10.5,d=Math.max(1.2,Math.min(s.figureHeadR,f,p)),u=s.figureStride*(d/s.figureHeadR),h=3,g=2,m=i-h*2,w=Math.max(1,Math.floor((m-16)/u)),T=Math.min(r,w),y=T*u,S=t-y/2+u/2,k=n-g;for(let b=0;b<T;b++){const _=c?.[b]??fe(0,b);Ei(e,S+b*u,k,d,a,_)}if(r>T){const b=`+${r-T}`,_=Math.max(8,s.fontSmall-1);e.font=`700 ${_.toFixed(1)}px ${V}`,e.textAlign="right",e.textBaseline="middle";const I=e.measureText(b).width,R=3,E=1.5,A=Math.ceil(I+R*2),x=Math.ceil(_+E*2),L=t+i/2-2,D=n-o+2,q=L-A;e.fillStyle="rgba(15, 15, 18, 0.85)",te(e,q,D,A,x,2),e.fill(),e.fillStyle="#fafafa",e.fillText(b,L-R,D+x/2)}if(l){const b=Math.max(10,Math.min(o*.7,i*.55));e.font=`800 ${b.toFixed(0)}px ${V}`,e.textAlign="center",e.textBaseline="middle";const _=n-o/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,_+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,_)}}const vs=Array.from({length:Nt},(e,t)=>Qt(rt.moving,.18*(1-t/Nt))),En=Object.fromEntries(Object.entries(rt).map(([e,t])=>[e,Wt(t,.18)]));function ws(e,t,n,i,o,r,a){const s=Math.max(2,r.figureHeadR*.9);for(const c of t.cars){if(c.target===void 0)continue;const l=a.get(c.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const p=n.get(c.id);if(p===void 0)continue;const d=o(f.y)-r.carH/2,u=o(c.y)-r.carH/2;Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(p,u),e.lineTo(p,d),e.stroke(),e.fillStyle=Ri,e.beginPath(),e.arc(p,d,s,0,Math.PI*2),e.fill())}}function ks(e,t,n,i,o,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const a=i/2;for(let s=1;s<=Nt;s++){const c=r(t.y-t.v*ds*s);e.fillStyle=vs[s-1]??"rgba(107, 107, 117, 0.06)",e.fillRect(n-a,c-o,i,o)}}function _s(e,t,n,i,o,r,a,s,c){const l=a(t.y),f=l-o,p=i/2,d=rt[t.phase]??"#6b6b75";e.fillStyle=d,e.fillRect(n-p,f,i,o),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-p+.5,f+.5,i-1,o-1),e.strokeStyle=En[t.phase]??En.unknown,e.beginPath(),e.moveTo(n-p+1,f+1.5),e.lineTo(n+p-1,f+1.5),e.stroke();const u=t.capacity>0&&t.load>=t.capacity*.95;(t.riders>0||u)&&Ss(e,n,l,i,o,t.riders,r,s,c,u)}const In=6,Cs=3,Rt=4,he=3,ue=2.5,K=2,Ts=12,Rs="rgba(37, 37, 48, 0.80)",Es="#ECECEE",An=3,xn=.3,Is=140,Mn=.85;function As(e,t,n,i,o,r,a,s){const c=a.fontSmall+.5;e.font=`500 ${c}px ${V}`,e.textBaseline="middle",Pn(e,"-0.1px");const l=performance.now(),f=Ue(t,.45),p=Ue(t,.5),d=Ue(t,.75),u=[];for(const[g,m]of i){const C=n.get(g);if(C===void 0)continue;const w=o.get(g);if(w===void 0)continue;const T=r(C.y),y=T-a.carH,S=Math.max(1,m.expiresAt-m.bornAt),k=m.expiresAt-l,b=k>S*xn?1:Math.max(0,k/(S*xn)),_=Math.max(0,l-m.bornAt),I=Math.min(1,_/Is),R=b*I;if(R<=0)continue;const E=e.measureText(m.glyph).width,A=E+An+e.measureText(m.text).width+In*2,x=c+Cs*2+2,L=y-K-ue-x,D=T+K+ue+x>s,q=L<2&&!D?"below":"above",be=q==="above"?y-K-ue-x:T+K+ue;let H=w-A/2;const ye=2,Se=s-A-2;H<ye&&(H=ye),H>Se&&(H=Se),u.push({bubble:m,glyphW:E,alpha:R,cx:w,carTop:y,carBottom:T,bubbleW:A,bubbleH:x,side:q,bx:H,by:be,entrance:I})}const h=(g,m)=>!(g.bx+g.bubbleW<=m.bx||m.bx+m.bubbleW<=g.bx||g.by+g.bubbleH<=m.by||m.by+m.bubbleH<=g.by);for(let g=1;g<u.length;g++){const m=u[g];if(m===void 0)continue;let C=!1;for(let k=0;k<g;k++){const b=u[k];if(b!==void 0&&h(m,b)){C=!0;break}}if(!C)continue;const w=m.side==="above"?"below":"above",T=w==="above"?m.carTop-K-ue-m.bubbleH:m.carBottom+K+ue,y={...m,side:w,by:T};let S=!0;for(let k=0;k<g;k++){const b=u[k];if(b!==void 0&&h(y,b)){S=!1;break}}S&&(u[g]=y)}for(const g of u){const{bubble:m,glyphW:C,alpha:w,cx:T,carTop:y,carBottom:S,bubbleW:k,bubbleH:b,side:_,bx:I,by:R,entrance:E}=g,A=_==="above"?y-K:S+K,x=Math.min(Math.max(T,I+Rt+he/2),I+k-Rt-he/2),L=Ii(E),D=Mn+(1-Mn)*L;e.save(),e.globalAlpha=w,e.translate(x,A),e.scale(D,D),e.translate(-x,-A),xs(e,I,R,k,b,Rt,_,x,A),e.shadowColor=p,e.shadowBlur=Ts,e.fillStyle=Rs,e.fill(),e.shadowBlur=0,e.shadowColor="transparent",e.strokeStyle=f,e.lineWidth=1,e.stroke();const q=R+b/2,be=I+In;e.textAlign="left",e.fillStyle=d,e.fillText(m.glyph,be,q),e.fillStyle=Es,e.fillText(m.text,be+C+An,q),e.restore()}Pn(e,"0px")}function xs(e,t,n,i,o,r,a,s,c){const l=Math.min(r,i/2,o/2);e.beginPath(),e.moveTo(t+l,n),a==="below"&&(e.lineTo(s-he/2,n),e.lineTo(s,c),e.lineTo(s+he/2,n)),e.lineTo(t+i-l,n),e.arcTo(t+i,n,t+i,n+l,l),e.lineTo(t+i,n+o-l),e.arcTo(t+i,n+o,t+i-l,n+o,l),a==="above"&&(e.lineTo(s+he/2,n+o),e.lineTo(s,c),e.lineTo(s-he/2,n+o)),e.lineTo(t+l,n+o),e.arcTo(t,n+o,t,n+o-l,l),e.lineTo(t,n+l),e.arcTo(t,n,t+l,n,l),e.closePath()}function Pn(e,t){e.letterSpacing=t}function Ln(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function Ms(e){const t=[];for(let n=3;n<=8;n++){const i=10**n;if(i>e)break;t.push({altitudeM:i,label:st(i)})}return t}function st(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function Ai(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function Bn(e,t,n){const i=Math.abs(e);if(i<.5)return"idle";const o=i-Math.abs(t);return i>=n*.95&&Math.abs(o)<n*.005?"cruise":o>0?"accel":o<0?"decel":"cruise"}function Ps(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const i=Math.floor(e/60),o=Math.round(e%60);return o===0?`${i}m`:`${i}m ${o}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function Ls(e,t,n,i,o,r){const a=Math.abs(t-e);if(a<.001)return 0;const s=Math.abs(n);if(s*s/(2*r)>=a)return s>0?s/r:0;const l=Math.max(0,(i-s)/o),f=s*l+.5*o*l*l,p=i/r,d=i*i/(2*r);if(f+d>=a){const h=(2*o*r*a+r*s*s)/(o+r),g=Math.sqrt(Math.max(h,s*s));return(g-s)/o+g/r}const u=a-f-d;return l+u/Math.max(i,.001)+p}const xi={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},nt={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function Bs(e,t,n,i,o,r){const a=o/2,s=i-r/2,c=rt[t.phase]??"#6b6b75",l=e.createLinearGradient(n,s,n,s+r);l.addColorStop(0,Wt(c,.14)),l.addColorStop(1,Wt(c,-.18)),e.fillStyle=l,te(e,n-a,s,o,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-a+2,s+r*.36,o-4,Math.max(1.5,r*.1))}function Fs(e,t,n,i,o){if(t.length===0)return;const r=7,a=4,s=o.fontSmall+2,c=n/2+8;e.font=`600 ${(o.fontSmall+.5).toFixed(1)}px ${V}`;const l=(d,u)=>{const h=[d.carName,st(d.altitudeM),Ai(d.velocity),`${xi[d.phase]} · ${d.layer}`];let g=0;for(const y of h)g=Math.max(g,e.measureText(y).width);const m=g+r*2,C=h.length*s+a*2;let w=u==="right"?d.cx+c:d.cx-c-m;w=Math.max(2,Math.min(i-m-2,w));const T=d.cy-C/2;return{hud:d,lines:h,bx:w,by:T,bubbleW:m,bubbleH:C,side:u}},f=(d,u)=>!(d.bx+d.bubbleW<=u.bx||u.bx+u.bubbleW<=d.bx||d.by+d.bubbleH<=u.by||u.by+u.bubbleH<=d.by),p=[];t.forEach((d,u)=>{let h=l(d,u%2===0?"right":"left");if(p.some(g=>f(h,g))){const g=l(d,h.side==="right"?"left":"right");if(p.every(m=>!f(g,m)))h=g;else{const m=Math.max(...p.map(C=>C.by+C.bubbleH));h={...h,by:m+4}}}p.push(h)});for(const d of p){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",te(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=nt[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,te(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let u=0;u<d.lines.length;u++){const h=d.by+a+s*u+s/2,g=d.lines[u]??"";e.fillStyle=u===0||u===3?nt[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(g,d.bx+r,h)}e.restore()}}function $s(e,t,n,i,o,r){if(t.length===0)return;const a=18,s=10,c=6,l=5,f=r.fontSmall+2.5,d=c*2+5*f,u=a+c+(d+l)*t.length;e.save();const h=e.createLinearGradient(n,o,n,o+u);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,te(e,n,o,i,u,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,te(e,n,o,i,u,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,o+1),e.lineTo(n+i-8,o+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px ${V}`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+s,o+a/2+2);let g=o+a+c;for(const m of t){e.fillStyle="rgba(15, 15, 18, 0.55)",te(e,n+6,g,i-12,d,5),e.fill(),e.fillStyle=nt[m.phase],e.fillRect(n+6,g,2,d);const C=n+s+4,w=n+i-s;let T=g+c+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px ${V}`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(m.carName,C,T),e.textAlign="right",e.fillStyle=nt[m.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px ${V}`,e.fillText(xi[m.phase].toUpperCase(),w,T);const y=m.etaSeconds!==void 0&&Number.isFinite(m.etaSeconds)?Ps(m.etaSeconds):"—",S=[["Altitude",st(m.altitudeM)],["Velocity",Ai(m.velocity)],["Dest",m.destinationName??"—"],["ETA",y]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px ${V}`;for(const[k,b]of S)T+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(k,C,T),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(b,w,T);g+=d+l}e.restore()}function Ds(e,t,n,i,o,r,a,s,c,l,f){l.length=e.cars.length;for(let p=0;p<e.cars.length;p++){const d=e.cars[p];d!==void 0&&(l[p]=d.id)}l.sort((p,d)=>p-d),f.clear();for(let p=0;p<l.length;p++){const d=l[p];d!==void 0&&f.set(d,p)}c.length=e.cars.length;for(let p=0;p<e.cars.length;p++){const d=e.cars[p];if(d===void 0)continue;const u=d.y,h=d.target!==void 0?s.get(d.target):void 0,g=h!==void 0?e.stops[h]:void 0,m=g?Ls(u,g.y,d.v,o,r,a):void 0,C=f.get(d.id)??0,w=c[p];w===void 0?c[p]={cx:n,cy:t.toScreenAlt(u),altitudeM:u,velocity:d.v,phase:Bn(d.v,i.get(d.id)??0,o),layer:Ln(u),carName:`Climber ${String.fromCharCode(65+C)}`,destinationName:g?.name,etaSeconds:m}:(w.cx=n,w.cy=t.toScreenAlt(u),w.altitudeM=u,w.velocity=d.v,w.phase=Bn(d.v,i.get(d.id)??0,o),w.layer=Ln(u),w.carName=`Climber ${String.fromCharCode(65+C)}`,w.destinationName=g?.name,w.etaSeconds=m)}return c}const _e=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function Et(e,t,n){return e+(t-e)*n}function It(e,t,n){const i=parseInt(e.slice(1),16),o=parseInt(t.slice(1),16),r=Math.round(Et(i>>16&255,o>>16&255,n)),a=Math.round(Et(i>>8&255,o>>8&255,n)),s=Math.round(Et(i&255,o&255,n));return`#${(r<<16|a<<8|s).toString(16).padStart(6,"0")}`}function Os(e,t){let n=0;for(;n<_e.length-1;n++){const l=_e[n+1];if(l===void 0||e<=l[0])break}const i=_e[n],o=_e[Math.min(n+1,_e.length-1)];if(i===void 0||o===void 0)return"#050810";const r=o[0]-i[0],a=r<=0?0:Math.max(0,Math.min(1,(e-i[0])/r)),s=It(i[1],o[1],a),c=It(i[2],o[2],a);return It(s,c,t)}const qs=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let i=0;i<60;i++){const o=.45+Math.pow(n(),.7)*.55;e.push({altFrac:o,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function Ns(e,t,n,i,o){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),a=Math.log10(1+t.axisMaxM/1e3),s=[0,.05,.15,.35,.6,1];for(const l of s){const f=1e3*(10**(l*a)-1);r.addColorStop(l,Os(f,o))}e.fillStyle=r,e.fillRect(n,t.shaftTop,i-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,i-n,t.shaftBottom-t.shaftTop),e.clip();for(const l of qs){const f=t.axisMaxM*l.altFrac;if(f<8e4)continue;const p=t.toScreenAlt(f),d=n+l.xFrac*(i-n),u=l.alpha*(.7+.3*o);e.fillStyle=`rgba(232, 232, 240, ${u.toFixed(3)})`,e.beginPath(),e.arc(d,p,l.size,0,Math.PI*2),e.fill()}e.restore();const c=Ms(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const l of c){const f=t.toScreenAlt(l.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(i,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(l.label,n+4,f-6))}}function Ws(e,t,n,i){const r=i-28,a=e.createLinearGradient(0,r,0,i);a.addColorStop(0,"rgba(0,0,0,0)"),a.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),a.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=a,e.fillRect(t,r,n-t,28),e.strokeStyle=Ue("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,i+.5),e.lineTo(n,i+.5),e.stroke()}function Hs(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function Gs(e,t,n,i){const o=Math.max(5,i.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-o),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const a=-Math.PI/2+r*Math.PI/3,s=t+Math.cos(a)*o,c=n+Math.sin(a)*o;r===0?e.moveTo(s,c):e.lineTo(s,c)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(i.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+o+6,n),e.restore()}function Us(e,t,n,i,o,r,a){e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const s of t.stops){const c=n.toScreenAlt(s.y);if(c<n.shaftTop||c>n.shaftBottom)continue;const l=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(i-l/2,c),e.lineTo(i-5,c),e.moveTo(i+5,c),e.lineTo(i+l/2,c),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(i-l/2,c),e.lineTo(i-5,c-5),e.moveTo(i+l/2,c),e.lineTo(i+5,c-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(s.name,r+a-4,c-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(o.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(st(s.y),r+a-4,c+10),e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function js(e,t,n){const i=Math.max(n.counterweightAltitudeM,1),o=Math.log10(1+i/1e3);return{axisMaxM:i,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const a=Math.log10(1+Math.max(0,r)/1e3),s=o<=0?0:Math.max(0,Math.min(1,a/o));return t-s*(t-e)}}}function zs(e,t,n,i,o,r,a){const s=Math.max(2,a.figureHeadR*.9);for(const c of t.cars){if(c.target===void 0)continue;const l=r.get(c.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const p=o.get(c.id);if(p===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(i,p),e.lineTo(i,d),e.stroke(),e.fillStyle=Ri,e.beginPath(),e.arc(i,d,s,0,Math.PI*2),e.fill())}}function Vs(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function Xs(e,t,n,i,o,r,a){a.firstDrawAt===0&&(a.firstDrawAt=performance.now());const s=(performance.now()-a.firstDrawAt)/1e3,c=r.showDayNight?Vs(s):.5,l=n>=520&&i>=360,f=Math.min(120,Math.max(72,n*.16)),p=l?Math.min(220,Math.max(160,n*.24)):0,d=l?14:0,u=o.padX,h=u+f+4,g=n-o.padX-p-d,m=(h+g)/2,C=12,w=o.padTop+24,T=i-o.padBottom-18,y=js(w,T,r);Ns(e,y,h+C,g-C,c),Ws(e,h+C,g-C,T),Hs(e,m,y),Gs(e,m,y.shaftTop,o),Us(e,t,y,m,o,u,f);const S=Math.max(20,Math.min(34,g-h-8)),k=Math.max(16,Math.min(26,S*.72));o.carH=k,o.carW=S;const b=a.carCenters,_=a.stopIdxById;b.clear(),_.clear();for(let R=0;R<t.stops.length;R++){const E=t.stops[R];E!==void 0&&_.set(E.entity_id,R)}for(const R of t.cars)b.set(R.id,y.toScreenAlt(R.y));zs(e,t,y,m,b,_,o);for(const R of t.cars){const E=b.get(R.id);E!==void 0&&Bs(e,R,m,E,S,k)}const I=Ds(t,y,m,a.prevVelocity,a.maxSpeed,a.acceleration,a.deceleration,_,a.hudBuf,a.idSortBuf,a.idRankBuf);I.sort((R,E)=>E.altitudeM-R.altitudeM),Fs(e,I,S,n-p-d,o),l&&$s(e,I,n-o.padX-p,p,w,o);for(const R of t.cars)a.prevVelocity.set(R.id,R.v);if(a.prevVelocity.size>t.cars.length)for(const R of a.prevVelocity.keys())b.has(R)||a.prevVelocity.delete(R)}const Ys=1e6;function Mi(e,t){return e*Ys+t}function Ks(e){return{has:(t,n)=>e.has(Mi(t,n))}}function Qs(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(i,o)=>i+(o-i)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function Fn(e,t){let n,i=1/0;for(const o of e){const r=Math.abs(o.y-t);r<i&&(i=r,n=o)}return n!==void 0?{stop:n,dist:i}:void 0}function Js(e,t,n){const i=performance.now();for(const o of t){const r=i-o.bornAt;if(r<0)continue;const a=Math.min(1,Math.max(0,r/o.duration)),s=Ii(a),[c,l]=o.kind==="board"?ys(o.startX,o.startY,o.endX,o.endY,s):[o.startX+(o.endX-o.startX)*s,o.startY+(o.endY-o.startY)*s],f=o.kind==="board"?.9:o.kind==="abandon"?(1-s)**1.5:1-s,p=o.kind==="abandon"?n.carDotR*.85:n.carDotR;e.fillStyle=Qt(o.color,f),e.beginPath(),e.arc(c,l,p,0,Math.PI*2),e.fill()}}class Pi{#e;#t;#n=window.devicePixelRatio||1;#o;#r=null;#s=-1;#d=new Map;#a;#i=new Map;#c=new Map;#l=[];#p=null;#m=new Map;#C=new Map;#T=new Map;#R=[];#E=[];#I=new Map;#b=1;#y=1;#S=1;#f=0;#u=new Map;#v=new Map;#A=new Map;#h=new Map;#w=[];#k=new Map;#_=new Set;#x=Ks(this.#_);#M=[];#P=[];#L=[];#B=new Map;#F=new Map;#$=new Map;#D=new Map;#O=[];#q=[];#N=[];constructor(t,n){this.#e=t;const i=t.getContext("2d");if(!i)throw new Error("2D context unavailable");this.#t=i,this.#a=n,this.#g(),this.#o=()=>{this.#g()},window.addEventListener("resize",this.#o)}dispose(){window.removeEventListener("resize",this.#o)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#m.clear(),this.#f=0,this.#u.clear()}setTetherPhysics(t,n,i){Number.isFinite(t)&&t>0&&(this.#b=t),Number.isFinite(n)&&n>0&&(this.#y=n),Number.isFinite(i)&&i>0&&(this.#S=i)}pushAssignment(t,n,i){let o=this.#u.get(t);o===void 0&&(o=new Map,this.#u.set(t,o)),o.set(i,n)}#g(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const i=t*this.#n,o=n*this.#n;(this.#e.width!==i||this.#e.height!==o)&&(this.#e.width=i,this.#e.height=o),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}#W(t,n){const i=this.#w.pop();return i!==void 0?(i.start=t,i.end=n,i):{start:t,end:n}}#H(){for(const t of this.#h.values())this.#w.push(t);this.#h.clear()}draw(t,n,i){this.#g();const{clientWidth:o,clientHeight:r}=this.#e,a=this.#t;if(a.clearRect(0,0,o,r),t.stops.length===0||o===0||r===0)return;o!==this.#s&&(this.#r=Qs(o),this.#s=o);const s=this.#r;if(s===null)return;if(this.#p!==null){this.#G(t,o,r,s,n,i,this.#p);return}const c=t.stops.length===2,l=this.#v;l.clear();for(const v of t.cars)l.set(v.id,v);const f=this.#N;f.length=t.stops.length;for(let v=0;v<t.stops.length;v++)f[v]=t.stops[v];f.sort((v,M)=>v.y-M.y);const p=this.#O;p.length=f.length;for(let v=0;v<f.length;v++){const M=f[v];p[v]=M===void 0?0:M.y}const d=t.stops[0];if(d===void 0)return;let u=d.y,h=d.y;for(let v=1;v<t.stops.length;v++){const M=t.stops[v];if(M===void 0)continue;const B=M.y;B<u&&(u=B),B>h&&(h=B)}const g=p.length>=3?(p.at(-1)??0)-(p.at(-2)??0):1,C=u-1,w=h+g,T=Math.max(w-C,1e-4),y=c?18:0;let S,k;if(c)S=s.padTop+y,k=r-s.padBottom-y;else{let v=1/0;for(let Q=1;Q<p.length;Q++){const De=p[Q],Oe=p[Q-1];if(De===void 0||Oe===void 0)continue;const ve=De-Oe;ve>0&&ve<v&&(v=ve)}Number.isFinite(v)||(v=1);const B=48/v,U=Math.max(0,r-s.padTop-s.padBottom)/T,X=Math.min(U,B),ae=T*X;k=r-s.padBottom,S=k-ae}const b=v=>k-(v-C)/T*(k-S),_=this.#d;_.forEach(v=>v.length=0);for(const v of t.cars){const M=_.get(v.line);M?M.push(v):_.set(v.line,[v])}const I=this.#q;I.length=0;for(const v of _.keys())I.push(v);I.sort((v,M)=>v-M);let R=0;for(const v of I)R+=_.get(v)?.length??0;const E=Math.max(0,o-2*s.padX-s.labelW),A=s.figureStride*2,x=s.shaftSpacing*Math.max(R-1,0),D=(E-x)/Math.max(R,1),q=c?34:s.maxShaftInnerW,H=Math.max(s.minShaftInnerW,Math.min(q,D*.55)),ye=Math.max(0,Math.min(D-H,A+s.figureStride*4)),Se=Math.max(14,H-6);let re=1/0;if(t.stops.length>=2)for(let v=1;v<p.length;v++){const M=p[v-1],B=p[v];if(M===void 0||B===void 0)continue;const O=b(M)-b(B);O>0&&O<re&&(re=O)}const zi=b(h)-2,Vi=Number.isFinite(re)?re:s.carH,Xi=c?s.carH:Vi,Yi=Math.max(14,Math.min(Xi,zi));if(!c&&Number.isFinite(re)){const v=Math.max(1.5,Math.min(re*.067,4)),M=s.figureStride*(v/s.figureHeadR);s.figureHeadR=v,s.figureStride=M}s.shaftInnerW=H,s.carW=Se,s.carH=Yi;const Ki=s.padX+s.labelW,Qi=H+ye,$e=this.#M;$e.length=0;const se=this.#A;se.clear(),this.#H();const lt=this.#h;let en=0;for(const v of I){const M=_.get(v)??[];for(const B of M){const O=Ki+en*(Qi+s.shaftSpacing),U=O,X=O+ye,ae=X+H/2;$e.push(ae),se.set(B.id,ae),lt.set(B.id,this.#W(U,X)),en++}}const dt=this.#k;dt.clear();for(let v=0;v<t.stops.length;v++){const M=t.stops[v];M!==void 0&&dt.set(M.entity_id,v)}const tn=this.#_;tn.clear();{let v=0;for(const M of I){const B=_.get(M)??[];for(const O of B){if(O.phase==="loading"||O.phase==="door-opening"||O.phase==="door-closing"){const U=Fn(t.stops,O.y);U!==void 0&&U.dist<.5&&tn.add(Mi(v,U.stop.entity_id))}v++}}}const pt=this.#B,ut=this.#F,ft=this.#$,ht=this.#D;pt.clear(),ut.clear(),ft.clear(),ht.clear();const gt=this.#P;gt.length=0;const mt=this.#L;mt.length=0;let nn=0;for(let v=0;v<I.length;v++){const M=I[v];if(M===void 0)continue;const B=_.get(M)??[],O=Qr[v]??Zr,U=Jr[v]??es,X=ts[v]??1,ae=rs[v]??ss,Q=Math.max(14,H*X),De=Math.max(10,Se*X),Oe=Math.max(10,s.carH),ve=v===2?is:v===3?os:Ct;let qe=1/0,bt=-1/0,Ne=1/0;for(const Y of B){pt.set(Y.id,Q),ut.set(Y.id,De),ft.set(Y.id,Oe),ht.set(Y.id,ve);const ce=$e[nn];if(ce===void 0)continue;const on=Number.isFinite(Y.min_served_y)&&Number.isFinite(Y.max_served_y),yt=on?Math.max(S,b(Y.max_served_y)-s.carH-2):S,Ji=on?Math.min(k,b(Y.min_served_y)+2):k;gt.push({cx:ce,top:yt,bottom:Ji,fill:O,frame:U,width:Q}),ce<qe&&(qe=ce),ce>bt&&(bt=ce),yt<Ne&&(Ne=yt),nn++}I.length>1&&Number.isFinite(qe)&&Number.isFinite(Ne)&&mt.push({cx:(qe+bt)/2,top:Ne,text:ns[v]??`Line ${v+1}`,color:ae})}hs(a,gt),gs(a,mt,s),ms(a,f,b,s,$e,o,this.#x,S,c),bs(a,t,b,s,lt,this.#u),ws(a,t,se,pt,b,s,dt);for(const v of t.cars){const M=se.get(v.id);if(M===void 0)continue;const B=ut.get(v.id)??s.carW,O=ft.get(v.id)??s.carH,U=ht.get(v.id)??Ct,X=this.#i.get(v.id);ks(a,v,M,B,O,b),_s(a,v,M,B,O,U,b,s,X?.roster)}this.#U(t,se,lt,b,s,n),Js(a,this.#l,s),i&&i.size>0&&As(a,this.#a,l,i,se,b,s,o)}#G(t,n,i,o,r,a,s){const c={prevVelocity:this.#m,maxSpeed:this.#b,acceleration:this.#y,deceleration:this.#S,firstDrawAt:this.#f,carCenters:this.#C,stopIdxById:this.#T,hudBuf:this.#R,idSortBuf:this.#E,idRankBuf:this.#I};Xs(this.#t,t,n,i,o,s,c),this.#f=c.firstDrawAt}#U(t,n,i,o,r,a){const s=performance.now(),c=Math.max(1,a),l=ls/c,f=30/c,p=new Map,d=[];for(const u of t.cars){const h=this.#i.get(u.id),g=u.riders,m=n.get(u.id),C=Fn(t.stops,u.y),w=u.phase==="loading"&&C!==void 0&&C.dist<.5?C.stop:void 0;if(h&&m!==void 0&&w!==void 0){const S=g-h.riders;if(S>0&&p.set(w.entity_id,(p.get(w.entity_id)??0)+S),S!==0){const k=o(w.y),b=o(u.y)-r.carH/2,_=Math.min(Math.abs(S),6);if(S>0){const I=w.waiting_up>=w.waiting_down,R=i.get(u.id);let E=m-20;if(R!==void 0){const L=R.start,D=R.end;E=(L+D)/2}const A=I?_i:Ci,x=this.#u.get(w.entity_id);x!==void 0&&(x.delete(u.line),x.size===0&&this.#u.delete(w.entity_id));for(let L=0;L<_;L++)d.push(()=>this.#l.push({kind:"board",bornAt:s+L*f,duration:l,startX:E,startY:k,endX:m,endY:b,color:A}))}else for(let I=0;I<_;I++)d.push(()=>this.#l.push({kind:"alight",bornAt:s+I*f,duration:l,startX:m,startY:b,endX:m+18,endY:b+10,color:Ct}))}}const T=h?.roster??[];let y;if(h){const S=g-h.riders;if(y=T.slice(),S>0&&w!==void 0){const b=w.waiting_up>=w.waiting_down?0:1e4;for(let _=0;_<S;_++)y.push(fe(w.entity_id,_+b))}else if(S>0)for(let k=0;k<S;k++)y.push(fe(u.id,y.length+k));else S<0&&y.splice(y.length+S,-S)}else{y=[];for(let S=0;S<g;S++)y.push(fe(u.id,S))}for(;y.length>g;)y.pop();for(;y.length<g;)y.push(fe(u.id,y.length));this.#i.set(u.id,{riders:g,roster:y})}for(const u of t.stops){const h=u.waiting_up+u.waiting_down,g=this.#c.get(u.entity_id);if(g){const m=g.waiting-h,C=p.get(u.entity_id)??0,w=Math.max(0,m-C);if(w>0){const T=o(u.y),y=r.padX+r.labelW+20,S=Math.min(w,4);for(let k=0;k<S;k++)this.#l.push({kind:"abandon",bornAt:s+k*f,duration:l*1.5,startX:y,startY:T,endX:y-26,endY:T-6,color:Ti})}}this.#c.set(u.entity_id,{waiting:h})}for(const u of d)u();for(let u=this.#l.length-1;u>=0;u--){const h=this.#l[u];h!==void 0&&s-h.bornAt>h.duration&&this.#l.splice(u,1)}if(this.#i.size>t.cars.length)for(const u of this.#i.keys())this.#v.has(u)||this.#i.delete(u);if(this.#c.size>t.stops.length)for(const u of this.#c.keys())this.#k.has(u)||this.#c.delete(u)}}const Zs="#f59e0b",ea=3;function ta(){const e="quest-pane";return{root:P("quest-pane",e),gridView:P("quest-grid",e),stageView:P("quest-stage-view",e),backBtn:P("quest-back-to-grid",e),title:P("quest-stage-title",e),brief:P("quest-stage-brief",e),stageStars:P("quest-stage-stars",e),editorHost:P("quest-editor",e),runBtn:P("quest-run",e),resetBtn:P("quest-reset",e),result:P("quest-result",e),progress:P("quest-progress",e),shaft:P("quest-shaft",e),shaftIdle:P("quest-shaft-idle",e)}}function At(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=Fe(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(ea-n)}function xt(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function na(e){const t=ta(),n=b=>{const _=Ir(b);if(_)return _;const I=ne[0];if(!I)throw new Error("quest-pane: stage registry is empty");return I},i=Wr(n(e.initialStageId),"grid");At(t,i.activeStage);const o=qr();vn(o,i.activeStage);const r=Nr();kn(r,i.activeStage);const a=Gr();kt(a,i.activeStage);const s=Br(),c=new Pi(t.shaft,Zs);t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const l=await Ho({container:t.editorHost,initialValue:gn(i.activeStage.id)??i.activeStage.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const f=Ur(),p=300;let d=null,u=!1;const h=()=>{u||(d!==null&&clearTimeout(d),d=setTimeout(()=>{mn(i.activeStage.id,l.getValue()),d=null},p))},g=()=>{d!==null&&(clearTimeout(d),d=null,mn(i.activeStage.id,l.getValue()))},m=b=>{u=!0;try{l.setValue(b)}finally{u=!1}};l.onDidChange(()=>{h()});const C=Xr();Tn(C,i.activeStage,l);const w=()=>{_n(i),t.shaftIdle.hidden=!1;const b=t.shaft.getContext("2d");b&&b.clearRect(0,0,t.shaft.width,t.shaft.height)},T=(b,{fromGrid:_})=>{g(),Hr(i,b),At(t,b),vn(o,b),kn(r,b),kt(a,b),Tn(C,b,l),m(gn(b.id)??b.starterCode),l.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",w(),xt(t,"stage"),wt(i,"stage"),e.onStageChange?.(b.id)},y=()=>{g(),w(),t.result.textContent="",t.progress.textContent="",xt(t,"grid"),wt(i,"grid"),vt(s,b=>{T(n(b),{fromGrid:!0})}),e.onBackToGrid?.()};vt(s,b=>{T(n(b),{fromGrid:!0})});const S=e.landOn??"grid";xt(t,S),wt(i,S);const k=async()=>{const b=i.activeStage;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",l.clearRuntimeMarker();let _=null,I=0;i.runLoop.active=!0;const R=()=>{i.runLoop.active&&(_!==null&&c.draw(_,1),requestAnimationFrame(R))};t.shaftIdle.hidden=!0,requestAnimationFrame(R);try{const E=await Dr(b,l.getValue(),{timeoutMs:1e3,onProgress:A=>{ke(i,b)&&(t.progress.textContent=Or(A))},onSnapshot:A=>{_=A,I+=1}});if(E.passed){const A=Fe(b.id);E.stars>A&&(Mr(b.id,E.stars),vt(s,x=>{T(n(x),{fromGrid:!0})}),ke(i,b)&&At(t,i.activeStage)),ke(i,b)&&kt(a,i.activeStage,{collapse:!1})}if(ke(i,b)){t.result.textContent="",t.progress.textContent="";const A=E.passed?Ar(b.id):void 0,x=A?()=>{T(A,{fromGrid:!1})}:void 0;jr(f,E,()=>void k(),b.failHint,x)}}catch(E){if(ke(i,b)){const A=E instanceof Error?E.message:String(E);t.result.textContent=`Error: ${A}`,t.progress.textContent="",E instanceof bi&&E.location!==null&&l.setRuntimeMarker({line:E.location.line,column:E.location.column,message:A})}}finally{if(t.runBtn.disabled=!1,_n(i),I===0){const E=t.shaft.getContext("2d");E&&E.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{k()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${i.activeStage.title} to its starter code?`)&&(xr(i.activeStage.id),m(i.activeStage.starterCode),l.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{y()}),{handles:t,editor:l}}let Mt=null;async function Li(){if(!Mt){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;Mt=import(e).then(async n=>(await n.default(t),n))}return Mt}class Jt{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,i){const o=await Li();return new Jt(new o.WasmSim(t,n,i))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,i,o){return this.#e.spawnRider(t,n,i,o)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class Bi{#e;#t=0;#n=[];#o=0;#r=0;#s=1;#d=0;constructor(t){this.#e=ia(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#o=t.reduce((n,i)=>n+i.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#s=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const i=t.stops.filter(s=>s.stop_id!==4294967295);if(i.length<2)return[];const o=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#s/60*o,this.#r=(this.#r+o)%(this.#o||1);const a=[];for(;this.#t>=1;)this.#t-=1,a.push(this.#a(i,r));return a}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,i]of this.#n.entries())if(t-=i.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#o<=0?0:Math.min(1,this.#r/this.#o)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const i=n.durationSec;if(t<i)return i>0?Math.min(1,t/i):0;t-=i}return 1}phases(){return this.#n}#a(t,n){const i=this.#i(t.length,n.originWeights);let o=this.#i(t.length,n.destWeights);o===i&&(o=(o+1)%t.length);const r=t[i],a=t[o];if(!r||!a)throw new Error("stop index out of bounds");const s=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:a.stop_id,weight:s,...this.#d>0?{patienceTicks:this.#d}:{}}}#i(t,n){if(!n||n.length!==t)return this.#l(t);let i=0;for(const r of n)i+=Math.max(0,r);if(i<=0)return this.#l(t);let o=this.#p()*i;for(const[r,a]of n.entries())if(o-=Math.max(0,a),o<0)return r;return t-1}#c(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#l(t){return Number(this.#c()%BigInt(t))}#p(){return Number(this.#c()>>11n)/2**53}}function ia(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const oa="#7dd3fc",ra="#fda4af";async function $n(e,t,n,i,o){const r=io(i,o),a=await Jt.create(r,t,n),s=new Pi(e.canvas,e.accent);if(s.setTetherConfig(i.tether??null),i.tether){const l=Yt(i,o);s.setTetherPhysics(l.maxSpeed,l.acceleration,l.deceleration)}const c=e.canvas.parentElement;if(c){const l=i.stops.length,p=i.tether?640:Math.max(200,l*16);c.style.setProperty("--shaft-min-h",`${p}px`)}return{strategy:t,sim:a,renderer:s,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function Ce(e){e?.sim.dispose(),e?.renderer.dispose()}function Fi(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const sa=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],aa=120;function Dn(e,t,n){const i=e.sim.metrics();e.latestMetrics=i;for(const r of sa){const a=e.metricHistory[r];a.push(i[r]),a.length>aa&&a.shift()}const o=performance.now();for(const[r,a]of e.bubbles)a.expiresAt<=o&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const ca={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},la=1e3;function da(e,t,n){const i=performance.now(),o=new Map;for(const a of n.stops)o.set(a.entity_id,a.name);const r=a=>o.get(a)??`stop #${a}`;for(const a of t){const s=pa(a,r);if(s===null)continue;const c=a.elevator;if(c===void 0)continue;const l=ca[a.kind]??la;e.bubbles.set(c,{glyph:s.glyph,text:s.text,bornAt:i,expiresAt:i+l})}}function pa(e,t){switch(e.kind){case"elevator-assigned":return{glyph:"›",text:`To ${t(e.stop)}`};case"elevator-repositioning":return{glyph:"↻",text:`Reposition to ${t(e.stop)}`};case"elevator-arrived":return{glyph:"●",text:`At ${t(e.stop)}`};case"door-opened":return{glyph:"◌",text:"Doors open"};case"rider-boarded":return{glyph:"+",text:"Boarding"};case"rider-exited":return{glyph:"↓",text:`Off at ${t(e.stop)}`};default:return null}}const ua={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function On(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=ua[t],e.modeEl.title=t)}function fa(){const e=s=>{const c=document.getElementById(s);if(!c)throw new Error(`missing element #${s}`);return c},t=s=>document.getElementById(s),n=(s,c)=>({root:e(`pane-${s}`),canvas:e(`shaft-${s}`),name:e(`name-${s}`),mode:e(`mode-${s}`),desc:e(`desc-${s}`),metrics:e(`metrics-${s}`),trigger:e(`strategy-trigger-${s}`),popover:e(`strategy-popover-${s}`),repoTrigger:e(`repo-trigger-${s}`),repoName:e(`repo-name-${s}`),repoPopover:e(`repo-popover-${s}`),accent:c,which:s}),i=s=>{const c=document.querySelector(`.tweak-row[data-key="${s}"]`);if(!c)throw new Error(`missing tweak row for ${s}`);const l=p=>{const d=c.querySelector(p);if(!d)throw new Error(`missing ${p} in tweak row ${s}`);return d},f=p=>c.querySelector(p);return{root:c,value:l(".tweak-value"),defaultV:l(".tweak-default-v"),dec:l(".tweak-dec"),inc:l(".tweak-inc"),reset:l(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},o={};for(const s of me)o[s]=i(s);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:o,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",oa),paneB:n("b",ra)};Eo(r);const a=document.getElementById("controls-bar");return a&&new ResizeObserver(([c])=>{if(!c)return;const l=Math.ceil(c.borderBoxSize[0]?.blockSize??c.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${l}px`)}).observe(a),r}function $i(e,t,n,i,o,r,a,s,c){const l=document.createDocumentFragment();for(const f of t){const p=document.createElement("button");p.type="button",p.className="strategy-option",p.setAttribute("role","menuitemradio"),p.setAttribute("aria-checked",f===r?"true":"false"),p.dataset[o]=f;const d=document.createElement("span");d.className="strategy-option-name";const u=document.createElement("span");if(u.className="strategy-option-label",u.textContent=n[f],d.appendChild(u),a&&f===a){const g=document.createElement("span");g.className="strategy-option-sibling",g.textContent=`also in ${s}`,d.appendChild(g)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=i[f],p.append(d,h),p.addEventListener("click",()=>{c(f)}),l.appendChild(p)}e.replaceChildren(l)}function ie(e,t){const n=Le[t],i=hi[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=i}function qn(e,t,n,i,o){$i(e.repoPopover,Co,Le,hi,"reposition",t,n,i,o)}function Ie(e,t,n){const{repositionA:i,repositionB:o,compare:r}=e.permalink;qn(t.paneA,i,r?o:null,"B",a=>void Wn(e,t,"a",a,n)),qn(t.paneB,o,r?i:null,"A",a=>void Wn(e,t,"b",a,n))}function Ht(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function Di(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function Gt(e){Ht(e.paneA,!1),Ht(e.paneB,!1)}function at(e){jt(e),Gt(e)}function Nn(e,t,n,i){n.repoTrigger.addEventListener("click",o=>{o.stopPropagation();const r=n.repoPopover.hidden;at(t),r&&(Ie(e,t,i),Ht(n,!0))})}async function Wn(e,t,n,i,o){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===i){Gt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:i},ie(t.paneA,i)):(e.permalink={...e.permalink,repositionB:i},ie(t.paneB,i)),N(e.permalink),Ie(e,t,o),Gt(t),await o(),G(t.toast,`${n==="a"?"A":"B"} park: ${Le[i]}`)}function ha(e){document.addEventListener("click",t=>{if(!Oi(e)&&!Di(e))return;const n=t.target;if(n instanceof Node){for(const i of[e.paneA,e.paneB])if(i.popover.contains(n)||i.trigger.contains(n)||i.repoPopover.contains(n)||i.repoTrigger.contains(n))return;at(e)}})}function oe(e,t){const n=ge[t],i=fi[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==i&&(e.desc.textContent=i),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=i}function Hn(e,t,n,i,o){$i(e.popover,_o,ge,fi,"strategy",t,n,i,o)}function Ae(e,t,n){const{strategyA:i,strategyB:o,compare:r}=e.permalink;Hn(t.paneA,i,r?o:null,"B",a=>void Un(e,t,"a",a,n)),Hn(t.paneB,o,r?i:null,"A",a=>void Un(e,t,"b",a,n))}function Ut(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function Oi(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function jt(e){Ut(e.paneA,!1),Ut(e.paneB,!1)}function Gn(e,t,n,i){n.trigger.addEventListener("click",o=>{o.stopPropagation();const r=n.popover.hidden;at(t),r&&(Ae(e,t,i),Ut(n,!0))})}async function Un(e,t,n,i,o){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===i){jt(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:i},oe(t.paneA,i)):(e.permalink={...e.permalink,strategyB:i},oe(t.paneB,i)),N(e.permalink),Ae(e,t,o),jt(t),await o(),G(t.toast,`${n==="a"?"A":"B"}: ${ge[i]}`)}function jn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function ga(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function ct(e,t,n){let i=!1;for(const o of me){const r=n.tweakRows[o],a=e.tweakRanges[o],s=ee(e,o,t),c=Vt(e,o),l=Xt(e,o,s);l&&(i=!0),r.value.textContent=jn(o,s),r.defaultV.textContent=jn(o,c),r.dec.disabled=s<=a.min+1e-9,r.inc.disabled=s>=a.max-1e-9,r.root.dataset.overridden=String(l),r.reset.hidden=!l;const f=Math.max(a.max-a.min,1e-9),p=Math.max(0,Math.min(1,(s-a.min)/f)),d=Math.max(0,Math.min(1,(c-a.min)/f));r.trackFill&&(r.trackFill.style.width=`${(p*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(p*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!i}function qi(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function Zt(e,t,n,i){const o=Yt(n,e.permalink.overrides),r={maxSpeed:o.maxSpeed,weightCapacityKg:o.weightCapacity,doorOpenTicks:o.doorOpenTicks,doorTransitionTicks:o.doorTransitionTicks},a=[e.paneA,e.paneB].filter(c=>c!==null),s=a.every(c=>c.sim.applyPhysicsLive(r));if(s)for(const c of a)c.renderer?.setTetherPhysics(o.maxSpeed,o.acceleration,o.deceleration);ct(n,e.permalink.overrides,t),s||i()}function ma(e,t,n){return Math.min(n,Math.max(t,e))}function ba(e,t,n){const i=Math.round((e-t)/n);return t+i*n}function Ge(e,t,n,i,o){const r=W(e.permalink.scenario),a=r.tweakRanges[n],s=ee(r,n,e.permalink.overrides),c=ma(s+i*a.step,a.min,a.max),l=ba(c,a.min,a.step);va(e,t,n,l,o)}function ya(e,t,n,i){const o=W(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},N(e.permalink),n==="cars"?(i(),G(t.toast,"Cars reset")):(Zt(e,t,o,i),G(t.toast,`${ga(n)} reset`))}async function Sa(e,t,n){const i=W(e.permalink.scenario),o=Xt(i,"cars",ee(i,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},N(e.permalink),o?await n():Zt(e,t,i,n),G(t.toast,"Parameters reset")}function va(e,t,n,i,o){const r=W(e.permalink.scenario),a={...e.permalink.overrides,[n]:i};e.permalink={...e.permalink,overrides:ri(r,a)},N(e.permalink),n==="cars"?o():Zt(e,t,r,o)}function wa(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function ka(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function i(){return this instanceof i?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(i){var o=Object.getOwnPropertyDescriptor(e,i);Object.defineProperty(n,i,o.get?o:{enumerable:!0,get:function(){return e[i]}})}),n}var je={exports:{}},_a=je.exports,zn;function Ca(){return zn||(zn=1,(function(e){(function(t,n,i){function o(c){var l=this,f=s();l.next=function(){var p=2091639*l.s0+l.c*23283064365386963e-26;return l.s0=l.s1,l.s1=l.s2,l.s2=p-(l.c=p|0)},l.c=1,l.s0=f(" "),l.s1=f(" "),l.s2=f(" "),l.s0-=f(c),l.s0<0&&(l.s0+=1),l.s1-=f(c),l.s1<0&&(l.s1+=1),l.s2-=f(c),l.s2<0&&(l.s2+=1),f=null}function r(c,l){return l.c=c.c,l.s0=c.s0,l.s1=c.s1,l.s2=c.s2,l}function a(c,l){var f=new o(c),p=l&&l.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,p&&(typeof p=="object"&&r(p,f),d.state=function(){return r(f,{})}),d}function s(){var c=4022871197,l=function(f){f=String(f);for(var p=0;p<f.length;p++){c+=f.charCodeAt(p);var d=.02519603282416938*c;c=d>>>0,d-=c,d*=c,c=d>>>0,d-=c,c+=d*4294967296}return(c>>>0)*23283064365386963e-26};return l}n&&n.exports?n.exports=a:this.alea=a})(_a,e)})(je)),je.exports}var ze={exports:{}},Ta=ze.exports,Vn;function Ra(){return Vn||(Vn=1,(function(e){(function(t,n,i){function o(s){var c=this,l="";c.x=0,c.y=0,c.z=0,c.w=0,c.next=function(){var p=c.x^c.x<<11;return c.x=c.y,c.y=c.z,c.z=c.w,c.w^=c.w>>>19^p^p>>>8},s===(s|0)?c.x=s:l+=s;for(var f=0;f<l.length+64;f++)c.x^=l.charCodeAt(f)|0,c.next()}function r(s,c){return c.x=s.x,c.y=s.y,c.z=s.z,c.w=s.w,c}function a(s,c){var l=new o(s),f=c&&c.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(typeof f=="object"&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=a:this.xor128=a})(Ta,e)})(ze)),ze.exports}var Ve={exports:{}},Ea=Ve.exports,Xn;function Ia(){return Xn||(Xn=1,(function(e){(function(t,n,i){function o(s){var c=this,l="";c.next=function(){var p=c.x^c.x>>>2;return c.x=c.y,c.y=c.z,c.z=c.w,c.w=c.v,(c.d=c.d+362437|0)+(c.v=c.v^c.v<<4^(p^p<<1))|0},c.x=0,c.y=0,c.z=0,c.w=0,c.v=0,s===(s|0)?c.x=s:l+=s;for(var f=0;f<l.length+64;f++)c.x^=l.charCodeAt(f)|0,f==l.length&&(c.d=c.x<<10^c.x>>>4),c.next()}function r(s,c){return c.x=s.x,c.y=s.y,c.z=s.z,c.w=s.w,c.v=s.v,c.d=s.d,c}function a(s,c){var l=new o(s),f=c&&c.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(typeof f=="object"&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=a:this.xorwow=a})(Ea,e)})(Ve)),Ve.exports}var Xe={exports:{}},Aa=Xe.exports,Yn;function xa(){return Yn||(Yn=1,(function(e){(function(t,n,i){function o(s){var c=this;c.next=function(){var f=c.x,p=c.i,d,u;return d=f[p],d^=d>>>7,u=d^d<<24,d=f[p+1&7],u^=d^d>>>10,d=f[p+3&7],u^=d^d>>>3,d=f[p+4&7],u^=d^d<<7,d=f[p+7&7],d=d^d<<13,u^=d^d<<9,f[p]=u,c.i=p+1&7,u};function l(f,p){var d,u=[];if(p===(p|0))u[0]=p;else for(p=""+p,d=0;d<p.length;++d)u[d&7]=u[d&7]<<15^p.charCodeAt(d)+u[d+1&7]<<13;for(;u.length<8;)u.push(0);for(d=0;d<8&&u[d]===0;++d);for(d==8?u[7]=-1:u[d],f.x=u,f.i=0,d=256;d>0;--d)f.next()}l(c,s)}function r(s,c){return c.x=s.x.slice(),c.i=s.i,c}function a(s,c){s==null&&(s=+new Date);var l=new o(s),f=c&&c.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(f.x&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=a:this.xorshift7=a})(Aa,e)})(Xe)),Xe.exports}var Ye={exports:{}},Ma=Ye.exports,Kn;function Pa(){return Kn||(Kn=1,(function(e){(function(t,n,i){function o(s){var c=this;c.next=function(){var f=c.w,p=c.X,d=c.i,u,h;return c.w=f=f+1640531527|0,h=p[d+34&127],u=p[d=d+1&127],h^=h<<13,u^=u<<17,h^=h>>>15,u^=u>>>12,h=p[d]=h^u,c.i=d,h+(f^f>>>16)|0};function l(f,p){var d,u,h,g,m,C=[],w=128;for(p===(p|0)?(u=p,p=null):(p=p+"\0",u=0,w=Math.max(w,p.length)),h=0,g=-32;g<w;++g)p&&(u^=p.charCodeAt((g+32)%p.length)),g===0&&(m=u),u^=u<<10,u^=u>>>15,u^=u<<4,u^=u>>>13,g>=0&&(m=m+1640531527|0,d=C[g&127]^=u+m,h=d==0?h+1:0);for(h>=128&&(C[(p&&p.length||0)&127]=-1),h=127,g=512;g>0;--g)u=C[h+34&127],d=C[h=h+1&127],u^=u<<13,d^=d<<17,u^=u>>>15,d^=d>>>12,C[h]=u^d;f.w=m,f.X=C,f.i=h}l(c,s)}function r(s,c){return c.i=s.i,c.w=s.w,c.X=s.X.slice(),c}function a(s,c){s==null&&(s=+new Date);var l=new o(s),f=c&&c.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(f.X&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=a:this.xor4096=a})(Ma,e)})(Ye)),Ye.exports}var Ke={exports:{}},La=Ke.exports,Qn;function Ba(){return Qn||(Qn=1,(function(e){(function(t,n,i){function o(s){var c=this,l="";c.next=function(){var p=c.b,d=c.c,u=c.d,h=c.a;return p=p<<25^p>>>7^d,d=d-u|0,u=u<<24^u>>>8^h,h=h-p|0,c.b=p=p<<20^p>>>12^d,c.c=d=d-u|0,c.d=u<<16^d>>>16^h,c.a=h-p|0},c.a=0,c.b=0,c.c=-1640531527,c.d=1367130551,s===Math.floor(s)?(c.a=s/4294967296|0,c.b=s|0):l+=s;for(var f=0;f<l.length+20;f++)c.b^=l.charCodeAt(f)|0,c.next()}function r(s,c){return c.a=s.a,c.b=s.b,c.c=s.c,c.d=s.d,c}function a(s,c){var l=new o(s),f=c&&c.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(typeof f=="object"&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=a:this.tychei=a})(La,e)})(Ke)),Ke.exports}var Qe={exports:{}};const Fa={},$a=Object.freeze(Object.defineProperty({__proto__:null,default:Fa},Symbol.toStringTag,{value:"Module"})),Da=ka($a);var Oa=Qe.exports,Jn;function qa(){return Jn||(Jn=1,(function(e){(function(t,n,i){var o=256,r=6,a=52,s="random",c=i.pow(o,r),l=i.pow(2,a),f=l*2,p=o-1,d;function u(y,S,k){var b=[];S=S==!0?{entropy:!0}:S||{};var _=C(m(S.entropy?[y,T(n)]:y??w(),3),b),I=new h(b),R=function(){for(var E=I.g(r),A=c,x=0;E<l;)E=(E+x)*o,A*=o,x=I.g(1);for(;E>=f;)E/=2,A/=2,x>>>=1;return(E+x)/A};return R.int32=function(){return I.g(4)|0},R.quick=function(){return I.g(4)/4294967296},R.double=R,C(T(I.S),n),(S.pass||k||function(E,A,x,L){return L&&(L.S&&g(L,I),E.state=function(){return g(I,{})}),x?(i[s]=E,A):E})(R,_,"global"in S?S.global:this==i,S.state)}function h(y){var S,k=y.length,b=this,_=0,I=b.i=b.j=0,R=b.S=[];for(k||(y=[k++]);_<o;)R[_]=_++;for(_=0;_<o;_++)R[_]=R[I=p&I+y[_%k]+(S=R[_])],R[I]=S;(b.g=function(E){for(var A,x=0,L=b.i,D=b.j,q=b.S;E--;)A=q[L=p&L+1],x=x*o+q[p&(q[L]=q[D=p&D+A])+(q[D]=A)];return b.i=L,b.j=D,x})(o)}function g(y,S){return S.i=y.i,S.j=y.j,S.S=y.S.slice(),S}function m(y,S){var k=[],b=typeof y,_;if(S&&b=="object")for(_ in y)try{k.push(m(y[_],S-1))}catch{}return k.length?k:b=="string"?y:y+"\0"}function C(y,S){for(var k=y+"",b,_=0;_<k.length;)S[p&_]=p&(b^=S[p&_]*19)+k.charCodeAt(_++);return T(S)}function w(){try{var y;return d&&(y=d.randomBytes)?y=y(o):(y=new Uint8Array(o),(t.crypto||t.msCrypto).getRandomValues(y)),T(y)}catch{var S=t.navigator,k=S&&S.plugins;return[+new Date,t,k,t.screen,T(n)]}}function T(y){return String.fromCharCode.apply(0,y)}if(C(i.random(),n),e.exports){e.exports=u;try{d=Da}catch{}}else i["seed"+s]=u})(typeof self<"u"?self:Oa,[],Math)})(Qe)),Qe.exports}var Pt,Zn;function Na(){if(Zn)return Pt;Zn=1;var e=Ca(),t=Ra(),n=Ia(),i=xa(),o=Pa(),r=Ba(),a=qa();return a.alea=e,a.xor128=t,a.xorwow=n,a.xorshift7=i,a.xor4096=o,a.tychei=r,Pt=a,Pt}var Wa=Na();const Ha=wa(Wa),it=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],Lt=it.reduce((e,t)=>t.length<e.length?t:e).length,Bt=it.reduce((e,t)=>t.length>e.length?t:e).length;function Ga(e){const t=e?.seed?new Ha(e.seed):null,{minLength:n,maxLength:i,...o}=e||{};function r(){let u=typeof n!="number"?Lt:s(n);const h=typeof i!="number"?Bt:s(i);u>h&&(u=h);let g=!1,m;for(;!g;)m=a(),g=m.length<=h&&m.length>=u;return m}function a(){return it[c(it.length)]}function s(u){return u<Lt&&(u=Lt),u>Bt&&(u=Bt),u}function c(u){const h=t?t():Math.random();return Math.floor(h*u)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(o).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=u=>u),typeof e.separator!="string"&&(e.separator=" ");const l=e.min+c(e.max+1-e.min);let f=[],p="",d=0;for(let u=0;u<l*e.wordsPerString;u++)d===e.wordsPerString-1?p+=e.formatter(r(),d):p+=e.formatter(r(),d)+e.separator,d++,(u+1)%e.wordsPerString===0&&(f.push(p),p="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const Ni=e=>`${e}×`,Wi=e=>`${e.toFixed(1)}×`;function Hi(){const e=Ga({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function Ua(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=Ni(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=Wi(e.intensity),oe(t.paneA,e.strategyA),oe(t.paneB,e.strategyB),ie(t.paneA,e.repositionA),ie(t.paneB,e.repositionB),gi(t,e.scenario);const n=W(e.scenario);Object.keys(e.overrides).length>0&&qi(t,!0),ct(n,e.overrides,t)}function xe(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function Gi(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const i=t.phaseLabel;if(!i)return;const o=n&&e.traffic.currentPhaseLabel()||"—";i.textContent!==o&&(i.textContent=o)}function Ui(e,t){if(!t.phaseProgress)return;const i=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==i&&(t.phaseProgress.style.width=i)}function ja(e){if(e.length<2)return{d:"M 0 13 L 100 13",lastX:100,lastY:13};let t=e[0]??0,n=e[0]??0;for(let c=1;c<e.length;c++){const l=e[c];l!==void 0&&(l<t&&(t=l),l>n&&(n=l))}const i=n-t,o=e.length;let r="",a=0,s=7;for(let c=0;c<o;c++){const l=c/(o-1)*100,f=i>0?13-((e[c]??0)-t)/i*12:7;r+=`${c===0?"M":"L"} ${l.toFixed(2)} ${f.toFixed(2)} `,a=l,s=f}return{d:r.trim(),lastX:a,lastY:s}}const Ft="http://www.w3.org/2000/svg",zt=[["wait avg","avg_wait_s"],["wait max","max_wait_s"],["delivered","delivered"],["abandoned","abandoned"],["util","utilization"]];function za(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Va(e,t,n){const i=ei(e,n),o=ei(t,n),r=i-o,a=r>0?"▴":"▾",s=r>0?"+":r<0?"−":"",c=Math.abs(r);switch(n){case"avg_wait_s":case"max_wait_s":return`${a} ${s}${c.toFixed(1)} s`;case"delivered":case"abandoned":return`${a} ${s}${c.toFixed(0)}`;case"utilization":return`${a} ${s}${(c*100).toFixed(0)}%`}}function ei(e,t){switch(t){case"avg_wait_s":return e.avg_wait_s;case"max_wait_s":return e.max_wait_s;case"delivered":return e.delivered;case"abandoned":return e.abandoned;case"utilization":return e.utilization}}function Xa(e,t){const n=(u,h,g,m)=>Math.abs(u-h)<g?["tie","tie"]:(m?u>h:u<h)?["win","lose"]:["lose","win"],[i,o]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,a]=n(e.max_wait_s,t.max_wait_s,.05,!1),[s,c]=n(e.delivered,t.delivered,.5,!0),[l,f]=n(e.abandoned,t.abandoned,.5,!1),[p,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:i,max_wait_s:r,delivered:s,abandoned:l,utilization:p},b:{avg_wait_s:o,max_wait_s:a,delivered:c,abandoned:f,utilization:d}}}function ti(e){const t=document.createDocumentFragment();for(const[n]of zt){const i=Z("div","metric-row"),o=document.createElementNS(Ft,"svg");o.classList.add("metric-spark"),o.setAttribute("viewBox","0 0 100 14"),o.setAttribute("preserveAspectRatio","none"),o.appendChild(document.createElementNS(Ft,"path"));const r=document.createElementNS(Ft,"circle");r.classList.add("metric-spark-dot"),r.setAttribute("r","1.4"),o.appendChild(r),i.append(Z("span","metric-k",n),Z("span","metric-v"),Z("span","metric-d"),o),t.appendChild(i)}e.replaceChildren(t)}function $t(e,t,n,i,o){const r=e.children;for(let a=0;a<zt.length;a++){const s=r[a];if(!s)continue;const c=zt[a];if(!c)continue;const l=c[1],f=n?n[l]:"";s.dataset.verdict!==f&&(s.dataset.verdict=f);const p=s.children[1],d=za(t,l);p.textContent!==d&&(p.textContent=d);const u=s.children[2],g=o!==null&&f!=="tie"&&f!==""?Va(t,o,l):"";u.textContent!==g&&(u.textContent=g);const m=s.children[3],C=m.firstElementChild,w=m.children[1],T=ja(i[l]);C.getAttribute("d")!==T.d&&C.setAttribute("d",T.d);const y=T.lastX.toFixed(2),S=T.lastY.toFixed(2);w.getAttribute("cx")!==y&&w.setAttribute("cx",y),w.getAttribute("cy")!==S&&w.setAttribute("cy",S)}}const Ya=200;function ji(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function J(e,t){const n=++e.initToken;t.loader.classList.add("show");const i=W(e.permalink.scenario);e.traffic=new Bi(ui(e.permalink.seed)),ji(e,i),Ce(e.paneA),Ce(e.paneB),e.paneA=null,e.paneB=null;try{const o=await $n(t.paneA,e.permalink.strategyA,e.permalink.repositionA,i,e.permalink.overrides);oe(t.paneA,e.permalink.strategyA),ie(t.paneA,e.permalink.repositionA),ti(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await $n(t.paneB,e.permalink.strategyB,e.permalink.repositionB,i,e.permalink.overrides),oe(t.paneB,e.permalink.strategyB),ie(t.paneB,e.permalink.repositionB),ti(t.paneB.metrics)}catch(a){throw Ce(o),a}if(n!==e.initToken){Ce(o),Ce(r);return}e.paneA=o,e.paneB=r,e.seeding=i.seedSpawns>0?{remaining:i.seedSpawns}:null,Gi(e,t),Ui(e,t),ct(i,e.permalink.overrides,t)}catch(o){throw n===e.initToken&&G(t.toast,`Init failed: ${o.message}`),o}finally{n===e.initToken&&t.loader.classList.remove("show")}}function Ka(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let i=0;i<Ya&&e.seeding.remaining>0;i++){const o=e.traffic.drainSpawns(t,n);for(const r of o)if(Fi(e,a=>{const s=a.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);s.kind==="err"&&console.warn(`spawnRider failed (seed): ${s.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(ji(e,W(e.permalink.scenario)),e.seeding=null)}function Qa(e,t){const n=()=>J(e,t),i={renderPaneStrategyInfo:oe,renderPaneRepositionInfo:ie,refreshStrategyPopovers:()=>{Ae(e,t,n),Ie(e,t,n)},renderTweakPanel:()=>{const r=W(e.permalink.scenario);ct(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const a=r.target;if(!(a instanceof HTMLElement))return;const s=a.closest(".scenario-card");if(!s)return;const c=s.dataset.scenarioId;!c||c===e.permalink.scenario||mi(e,t,c,n,i)}),Gn(e,t,t.paneA,n),Gn(e,t,t.paneB,n),Nn(e,t,t.paneA,n),Nn(e,t,t.paneB,n),Ae(e,t,n),Ie(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},N(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",Ae(e,t,n),Ie(e,t,n),J(e,t).then(()=>{G(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||$.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},N(e.permalink),J(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=Hi();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},N(e.permalink),J(e,t).then(()=>{G(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=Ni(r)}),t.speedInput.addEventListener("change",()=>{N(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=Wi(r)}),t.intensityInput.addEventListener("change",()=>{N(e.permalink)});const o=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};o(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,o()}),t.resetBtn.addEventListener("click",()=>{J(e,t),G(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";qi(t,r)});for(const r of me){const a=t.tweakRows[r];sn(a.dec,()=>{Ge(e,t,r,-1,n)}),sn(a.inc,()=>{Ge(e,t,r,1,n)}),a.reset.addEventListener("click",()=>{ya(e,t,r,n)}),a.root.addEventListener("keydown",s=>{s.key==="ArrowUp"||s.key==="ArrowRight"?(s.preventDefault(),Ge(e,t,r,1,n)):(s.key==="ArrowDown"||s.key==="ArrowLeft")&&(s.preventDefault(),Ge(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{Sa(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=pi(e.permalink),a=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(a).then(()=>{G(t.toast,"Permalink copied")},()=>{G(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{xe(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{xe(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&xe(t,!1)}),Ja(e,t,i),ha(t)}function Ja(e,t,n){window.addEventListener("keydown",i=>{if(e.permalink.mode==="quest")return;if(i.target instanceof HTMLElement){const r=i.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||i.target.isContentEditable||i.target.closest(".monaco-editor"))return}if(i.metaKey||i.ctrlKey||i.altKey)return;switch(i.key){case" ":{i.preventDefault(),t.playBtn.click();return}case"r":case"R":{i.preventDefault(),t.resetBtn.click();return}case"c":case"C":{i.preventDefault(),t.compareToggle.click();return}case"s":case"S":{i.preventDefault(),t.shareBtn.click();return}case"t":case"T":{i.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{i.preventDefault(),xe(t,t.shortcutSheet.hidden);return}case"Escape":{if(Oi(t)||Di(t)){i.preventDefault(),at(t);return}t.shortcutSheet.hidden||(i.preventDefault(),xe(t,!1));return}}const o=Number(i.key);if(Number.isInteger(o)&&o>=1&&o<=Pe.length){const r=Pe[o-1];if(!r)return;r.id!==e.permalink.scenario&&(i.preventDefault(),mi(e,t,r.id,()=>J(e,t),n))}})}const Za="elevator-core playground",ni="In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";function ii(e){eo(ec(e))}function ec(e){if(e.mode==="quest")return{title:`Quest curriculum — ${Za}`,description:"Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time."};const n=W(e.scenario).label,i=ge[e.strategyA],o=ge[e.strategyB],r=Le[e.repositionA],a=Le[e.repositionB];if(e.compare){const l=`${n}: ${i} vs ${o} — Elevator dispatch playground`,f=`Compare ${i} (parking: ${r}) against ${o} (parking: ${a}) dispatch on the ${n.toLowerCase()} scenario. ${ni}`;return{title:l,description:f}}const s=`${n}: ${i} dispatch — Elevator dispatch playground`,c=`Watch ${i} dispatch (parking: ${r}) handle live rider traffic on the ${n.toLowerCase()} scenario. ${ni}`;return{title:s,description:c}}function oi(e,t){e.sim.step(t);const n=e.sim.drainEvents();if(n.length===0)return null;const i=e.sim.snapshot();da(e,n,i);const o=new Map;for(const r of i.cars)o.set(r.id,r.line);for(const r of n)if(r.kind==="elevator-assigned"){const a=o.get(r.elevator);a!==void 0&&e.renderer.pushAssignment(r.stop,r.elevator,a)}return i}function tc(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const i=Xa(t.latestMetrics,n.latestMetrics);$t(t.metricsEl,t.latestMetrics,i.a,t.metricHistory,n.latestMetrics),$t(n.metricsEl,n.latestMetrics,i.b,n.metricHistory,t.latestMetrics)}else $t(t.metricsEl,t.latestMetrics,null,t.metricHistory,null);On(t),n&&On(n)}function nc(e,t){let n=0;const i=()=>{const o=performance.now(),r=(o-e.lastFrameTime)/1e3;e.lastFrameTime=o;const a=e.paneA,s=e.paneB,c=a!==null&&(!e.permalink.compare||s!==null);if(e.running&&e.ready&&c){const l=e.permalink.speed;let f=oi(a,l);s&&oi(s,l),e.seeding&&(Ka(e),f=null);const d=Math.min(r,4/60)*l;let u=[];if(!e.seeding){const m=f??a.sim.snapshot();u=e.traffic.drainSpawns(m,d),f=m}for(const m of u)Fi(e,C=>{const w=C.sim.spawnRider(m.originStopId,m.destStopId,m.weight,m.patienceTicks);w.kind==="err"&&console.warn(`spawnRider failed: ${w.error}`)});const h=e.permalink.speed,g=u.length>0||f===null?a.sim.snapshot():f;Dn(a,g,h),s&&Dn(s,s.sim.snapshot(),h),tc(e),(n+=1)%4===0&&(Gi(e,t),Ui(e,t))}requestAnimationFrame(i)};requestAnimationFrame(i)}async function ic(){Li().catch(()=>{});const t=fa(),n=new URLSearchParams(window.location.search).has("k"),i={...$,...wo(window.location.search)};if(!n){i.seed=Hi();const s=new URL(window.location.href);s.searchParams.set("k",i.seed),window.history.replaceState(null,"",s.toString())}Io(i);const o=W(i.scenario),r=new URLSearchParams(window.location.search);o.defaultReposition!==void 0&&(r.has("pa")||(i.repositionA=o.defaultReposition),r.has("pb")||(i.repositionB=o.defaultReposition)),i.overrides=ri(o,i.overrides),Mo(i.mode),Po(i.mode),Ua(i,t);const a={running:!0,ready:!1,permalink:i,paneA:null,paneB:null,traffic:new Bi(ui(i.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(Qa(a,t),So(ii),ii(i),Zi(),await J(a,t),a.ready=!0,nc(a,t),a.permalink.mode==="quest"){const s=new URLSearchParams(window.location.search).has("qs");await na({initialStageId:a.permalink.questStage,landOn:s?"stage":"grid",onStageChange:c=>{a.permalink.questStage=c,N(a.permalink)},onBackToGrid:()=>{a.permalink.questStage=$.questStage,N(a.permalink)}})}}ic();export{et as _};
