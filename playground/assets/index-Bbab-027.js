const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-QzC6AjnC.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const l of r.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function n(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(o){if(o.ep)return;o.ep=!0;const r=n(o);fetch(o.href,r)}})();function pe(e,t,n){const i=document.createElement(e);return i.className=t,n!==void 0&&(i.textContent=n),i}let jt=0;function H(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(jt),jt=window.setTimeout(()=>{e.classList.remove("show")},1600)}function zt(e,t){let o=0,r=0;const l=()=>{o&&window.clearTimeout(o),r&&window.clearInterval(r),o=0,r=0};e.addEventListener("pointerdown",s=>{e.disabled||(s.preventDefault(),t(),o=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){l();return}t()},70)},380))}),e.addEventListener("pointerup",l),e.addEventListener("pointerleave",l),e.addEventListener("pointercancel",l),e.addEventListener("blur",l),e.addEventListener("click",s=>{s.pointerType||t()})}function ee(e,t,n){const i=Rt(e,t),o=n[t];if(o===void 0||!Number.isFinite(o))return i;const r=e.tweakRanges[t];return $n(o,r.min,r.max)}function Rt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return Bn(n.doorOpenTicks,n.doorTransitionTicks)}}function Et(e,t,n){const i=Rt(e,t),o=e.tweakRanges[t].step/2;return Math.abs(n-i)>o}function Fn(e,t){const n={};for(const i of ue){const o=t[i];o!==void 0&&Et(e,i,o)&&(n[i]=o)}return n}const ue=["cars","maxSpeed","weightCapacity","doorCycleSec"];function Ci(e,t){const{doorOpenTicks:n,doorTransitionTicks:i}=e.elevatorDefaults,o=Bn(n,i),r=$n(n/(o*Ne),.1,.9),l=Math.max(2,Math.round(t*Ne)),s=Math.max(1,Math.round(l*r)),a=Math.max(1,Math.round((l-s)/2));return{openTicks:s,transitionTicks:a}}function Bn(e,t){return(e+2*t)/Ne}function xt(e,t){const n=e.elevatorDefaults,i=ee(e,"maxSpeed",t),o=ee(e,"weightCapacity",t),r=ee(e,"doorCycleSec",t),{openTicks:l,transitionTicks:s}=Ci(e,r);return{...n,maxSpeed:i,weightCapacity:o,doorOpenTicks:l,doorTransitionTicks:s}}function Ti(e,t){if(e<1||t<1)return[];const n=[];for(let i=0;i<t;i+=1)n.push(Math.min(e-1,Math.floor(i*e/t)));return n}function Ri(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const i=Math.round(ee(e,"cars",t)),o=xt(e,t),r=Ti(e.stops.length,i),l=e.stops.map((a,c)=>`        StopConfig(id: StopId(${c}), name: ${yt(a.name)}, position: ${z(a.positionM)}),`).join(`
`),s=r.map((a,c)=>xi(c,o,a,Ei(c,i))).join(`
`);return`SimConfig(
    building: BuildingConfig(
        name: ${yt(e.buildingName)},
        stops: [
${l}
        ],
    ),
    elevators: [
${s}
    ],
    simulation: SimulationParams(ticks_per_second: ${z(Ne)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${z(e.passengerWeightRange[0])}, ${z(e.passengerWeightRange[1])}),
    ),
)`}const Ne=60;function $n(e,t,n){return Math.min(n,Math.max(t,e))}function Ei(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function xi(e,t,n,i){const o=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${z(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${z(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${yt(i)},
            max_speed: ${z(t.maxSpeed)}, acceleration: ${z(t.acceleration)}, deceleration: ${z(t.deceleration)},
            weight_capacity: ${z(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${o}${r}
        ),`}function yt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function z(e){return Number.isInteger(e)?`${e}.0`:String(e)}const Dn={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function Pe(e){return Array.from({length:e},()=>1)}const ae=5,Ii=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:ae},(e,t)=>t===ae-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:Pe(ae),destWeights:Pe(ae)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:Pe(ae),destWeights:Pe(ae)}],Ai={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:Ii,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...Dn,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},Ge=19,St=16,ke=4,On=(1+Ge)*ke,me=1,be=41,ye=42,Mi=43;function j(e){return Array.from({length:Mi},(t,n)=>e(n))}const le=e=>e===me||e===be||e===ye,Pi=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:j(e=>e===0?20:e===me?2:e===be?1.2:e===ye?.2:.1),destWeights:j(e=>e===0?0:e===me?.3:e===be?.4:e===ye?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:j(e=>le(e)?.5:1),destWeights:j(e=>le(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:j(e=>e===21?4:le(e)?.25:1),destWeights:j(e=>e===21?5:le(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:j(e=>e===0||e===me||e===21?.3:e===be?.4:e===ye?1.2:1),destWeights:j(e=>e===0?20:e===me?1:e===be?.6:e===ye?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:j(e=>le(e)?1.5:.2),destWeights:j(e=>le(e)?1.5:.2)}];function Li(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let s=1;s<=Ge;s++){const a=1+s,c=s*ke;e.push(`        StopConfig(id: StopId(${a.toString().padStart(2," ")}), name: "Floor ${s}",    position: ${c.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${On.toFixed(1)}),`);for(let s=21;s<=20+St;s++){const a=1+s,c=s*ke;e.push(`        StopConfig(id: StopId(${a}), name: "Floor ${s}",   position: ${c.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:Ge},(s,a)=>2+a),21],n=[21,...Array.from({length:St},(s,a)=>22+a)],i=[1,21,38,39,40],o=[1,0,41,42],r=s=>s.map(a=>`StopId(${a})`).join(", "),l=(s,a,c,f)=>`                ElevatorConfig(
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
                serves: [${r(i)}],
                elevators: [
${l(3,"VIP",1,350)}
                ],
            ),
            LineConfig(
                id: 3, name: "Service",
                serves: [${r(o)}],
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
)`}const Fi=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:Ge},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*ke})),{name:"Sky Lobby",positionM:On},...Array.from({length:St},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*ke})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],Bi={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:Pi,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:Fi,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...Dn,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:Li()},Vt=1e5,Xt=4e5,Yt=35786e3,$i=1e8,Di=4;function Le(e){return Array.from({length:Di},(t,n)=>e(n))}const Oi={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:Le(e=>e===0?6:1),destWeights:Le(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:Le(e=>e===0?0:e===1?1:e===2?3:5),destWeights:Le(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:Vt},{name:"LEO Transfer",positionM:Xt},{name:"GEO Platform",positionM:Yt}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:$i,showDayNight:!1},ron:`SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${Vt.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${Xt.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${Yt.toFixed(1)}),
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
)`},_e=[Bi,Oi,Ai];function N(e){const t=_e.find(i=>i.id===e);if(t)return t;const n=_e[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const qn={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},q={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},qi=["scan","look","nearest","etd","destination","rsr"],Wi=["adaptive","predictive","lobby","spread","none"];function Kt(e,t){return e!==null&&qi.includes(e)?e:t}function Qt(e,t){return e!==null&&Wi.includes(e)?e:t}function U(e){const t=Wn(e);window.location.search!==t&&window.history.replaceState(null,"",t)}function Hi(e,t){return e==="compare"||e==="quest"?e:t}function Wn(e){const t=new URLSearchParams;e.mode!==q.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==q.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=N(e.scenario).defaultReposition,i=n??q.repositionA,o=n??q.repositionB;e.repositionA!==i&&t.set("pa",e.repositionA),e.repositionB!==o&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of ue){const l=e.overrides[r];l!==void 0&&Number.isFinite(l)&&t.set(qn[r],Gi(l))}return`?${t.toString()}`}function Ni(e){const t=new URLSearchParams(e),n={};for(const i of ue){const o=t.get(qn[i]);if(o===null)continue;const r=Number(o);Number.isFinite(r)&&(n[i]=r)}return{mode:Hi(t.get("m"),q.mode),questStage:(t.get("qs")??"").trim()||q.questStage,scenario:t.get("s")??q.scenario,strategyA:Kt(t.get("a")??t.get("d"),q.strategyA),strategyB:Kt(t.get("b"),q.strategyB),repositionA:Qt(t.get("pa"),q.repositionA),repositionB:Qt(t.get("pb"),q.repositionB),compare:t.has("c")?t.get("c")==="1":q.compare,seed:(t.get("k")??"").trim()||q.seed,intensity:Jt(t.get("i"),q.intensity),speed:Jt(t.get("x"),q.speed),overrides:n}}function Jt(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function Gi(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function Hn(e){let t=2166136261;const n=e.trim();for(let i=0;i<n.length;i++)t^=n.charCodeAt(i),t=Math.imul(t,16777619);return t>>>0}const Ui=["scan","look","nearest","etd","destination","rsr"],Ye={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},Nn={scan:"Sweeps end-to-end like a disk head — simple, predictable, ignores who's waiting longest.",look:"Like SCAN but reverses early when nothing's queued further — a practical baseline.",nearest:"Grabs whichever call is closest right now. Fast under light load, thrashes under rush.",etd:"Estimated time of dispatch — assigns calls to whichever car can finish fastest.",destination:"Destination-control: riders pick their floor at the lobby; the group optimises assignments.",rsr:"Relative System Response — a wait-aware variant of ETD that penalises long queues."},ji=["adaptive","predictive","lobby","spread","none"],It={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},Gn={adaptive:"Switches based on traffic — returns to lobby during up-peak, predicts hot floors otherwise. The default.",predictive:"Always parks idle cars near whichever floor has seen the most recent arrivals.",lobby:"Sends every idle car back to the ground floor to prime the morning-rush pickup.",spread:"Keeps idle cars fanned out across the shaft so any floor has a nearby option.",none:"Leaves idle cars wherever they finished their last delivery."},zi="scenario-card inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated border border-stroke-subtle rounded-md text-content-secondary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:bg-surface-hover hover:border-stroke aria-pressed:bg-accent-muted aria-pressed:text-content aria-pressed:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] max-md:flex-none max-md:snap-start",Vi="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function Xi(e){const t=document.createDocumentFragment();_e.forEach((n,i)=>{const o=pe("button",zi);o.type="button",o.dataset.scenarioId=n.id,o.setAttribute("aria-pressed","false"),o.title=n.description,o.append(pe("span","",n.label),pe("span",Vi,String(i+1))),t.appendChild(o)}),e.scenarioCards.replaceChildren(t)}function Un(e,t){for(const n of e.scenarioCards.children){const i=n;i.setAttribute("aria-pressed",i.dataset.scenarioId===t?"true":"false")}}async function jn(e,t,n,i,o){const r=N(n),l=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,s=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:l,repositionA:s,overrides:{}},U(e.permalink),o.renderPaneStrategyInfo(t.paneA,l),o.renderPaneRepositionInfo(t.paneA,s),o.refreshStrategyPopovers(),Un(t,r.id),await i(),o.renderTweakPanel(),H(t.toast,`${r.label} · ${Ye[l]}`)}function Yi(e){const t=N(e.scenario);e.scenario=t.id}const Ki=["layout","scenario-picker","controls-bar","cabin-legend"],Qi=["quest-pane"];function Ji(e){const t=e==="quest";for(const n of Ki){const i=document.getElementById(n);i&&i.classList.toggle("hidden",t)}for(const n of Qi){const i=document.getElementById(n);i&&(i.classList.toggle("hidden",!t),i.classList.toggle("flex",t))}}function Zi(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const i of n){const o=i.dataset.mode===e;i.dataset.active=String(o),i.setAttribute("aria-pressed",String(o))}t.addEventListener("click",i=>{const o=i.target;if(!(o instanceof HTMLElement))return;const r=o.closest("button[data-mode]");if(!r)return;const l=r.dataset.mode;if(l!=="compare"&&l!=="quest"||l===e)return;const s=new URL(window.location.href);l==="compare"?(s.searchParams.delete("m"),s.searchParams.delete("qs")):s.searchParams.set("m",l),window.location.assign(s.toString())})}const eo="modulepreload",to=function(e,t){return new URL(e,t).href},Zt={},Ue=function(t,n,i){let o=Promise.resolve();if(n&&n.length>0){let l=function(f){return Promise.all(f.map(p=>Promise.resolve(p).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const s=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),c=a?.nonce||a?.getAttribute("nonce");o=l(n.map(f=>{if(f=to(f,i),f in Zt)return;Zt[f]=!0;const p=f.endsWith(".css"),d=p?'[rel="stylesheet"]':"";if(!!i)for(let g=s.length-1;g>=0;g--){const y=s[g];if(y.href===f&&(!p||y.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=p?"stylesheet":eo,p||(h.as="script"),h.crossOrigin="",h.href=f,c&&h.setAttribute("nonce",c),document.head.appendChild(h),p)return new Promise((g,y)=>{h.addEventListener("load",g),h.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(l){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=l,window.dispatchEvent(s),!s.defaultPrevented)throw l}return o.then(l=>{for(const s of l||[])s.status==="rejected"&&r(s.reason);return t().catch(r)})};class zn extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function no(e){const t=(await Ue(async()=>{const{default:o}=await import("./worker-DE_xV-Fq.js");return{default:o}},[],import.meta.url)).default,n=new t,i=new io(n);return await i.init(e),i}class io{#e;#t=new Map;#n=1;#o=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#l),this.#e.addEventListener("error",this.#i),this.#e.addEventListener("messageerror",this.#i)}async init(t){await this.#a({kind:"init",id:this.#s(),payload:this.#d(t)})}async tick(t,n){const i=n?.wantVisuals??!1;return this.#a({kind:"tick",id:this.#s(),ticks:t,...i?{wantVisuals:!0}:{}})}async spawnRider(t,n,i,o){return this.#a({kind:"spawn-rider",id:this.#s(),origin:t,destination:n,weight:i,...o!==void 0?{patienceTicks:o}:{}})}async setStrategy(t){await this.#a({kind:"set-strategy",id:this.#s(),strategy:t})}async loadController(t,n){const i=n?.unlockedApi??null,o=n?.timeoutMs,r=this.#a({kind:"load-controller",id:this.#s(),source:t,unlockedApi:i});if(o===void 0){await r;return}r.catch(()=>{});let l;const s=new Promise((a,c)=>{l=setTimeout(()=>{c(new Error(`controller did not return within ${o}ms`))},o)});try{await Promise.race([r,s])}finally{l!==void 0&&clearTimeout(l)}}async reset(t){await this.#a({kind:"reset",id:this.#s(),payload:this.#d(t)})}dispose(){this.#o||(this.#o=!0,this.#e.removeEventListener("message",this.#l),this.#e.removeEventListener("error",this.#i),this.#e.removeEventListener("messageerror",this.#i),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#s(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,i=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:i,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#a(t){if(this.#o)throw new Error("WorkerSim disposed");return new Promise((n,i)=>{this.#t.set(t.id,{resolve:n,reject:i}),this.#e.postMessage(t)})}#i=t=>{const n=t.message,i=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#o=!0,this.#e.terminate(),this.#r(new Error(i))};#l=t=>{const n=t.data,i=this.#t.get(n.id);if(i)switch(this.#t.delete(n.id),n.kind){case"ok":i.resolve(void 0);return;case"tick-result":i.resolve(n.result);return;case"spawn-result":n.error!==null?i.reject(new Error(n.error)):i.resolve(n.riderId);return;case"error":{const o=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;i.reject(o!==null?new zn(n.message,o):new Error(n.message));return}default:{const o=n.kind;i.reject(new Error(`WorkerSim: unknown reply kind "${String(o)}"`));return}}}}const oo=`// Quest curriculum — sim global declaration.
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
`,en="quest-runtime";let ot=null,ce=null;async function ro(){return ot||ce||(ce=(async()=>{await so();const e=await Ue(()=>import("./editor.main-QzC6AjnC.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return ot=e,e})(),ce.catch(()=>{ce=null}),ce)}async function so(){const[{default:e},{default:t}]=await Promise.all([Ue(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),Ue(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,i){return i==="typescript"||i==="javascript"?new e:new t}}}function ao(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(oo,"ts:filename/quest-sim-globals.d.ts"))}function lo(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function co(e){const t=await ro();ao(t),lo(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:i=>{n.setValue(i)},onDidChange(i){const o=n.onDidChangeModelContent(()=>{i()});return{dispose:()=>{o.dispose()}}},insertAtCursor(i){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:i,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(i){const o=n.getModel();if(!o)return;const r=i.message.split(`
`)[0]??i.message;t.editor.setModelMarkers(o,en,[{severity:8,message:r,startLineNumber:i.line,startColumn:i.column,endLineNumber:i.line,endColumn:i.column+1}]),n.revealLineInCenterIfOutsideViewport(i.line)},clearRuntimeMarker(){const i=n.getModel();i&&t.editor.setModelMarkers(i,en,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const po=`SimConfig(
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
)`,uo={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:po,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},fo=`SimConfig(
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
)`,ho={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:fo,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},go=`SimConfig(
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
)`,mo={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:go,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},bo=`SimConfig(
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
)`,yo={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:bo,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function D(e,t){const n=t.startTick??0,i=t.intervalTicks??30,o=t.destinations;if(o.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,l)=>{const s=o[l%o.length];return{origin:t.origin,destination:s,atTick:n+l*i,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const So=`SimConfig(
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
)`,wo={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:So,unlockedApi:["setStrategy"],seedRiders:[...D(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},vo=`SimConfig(
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
)`,ko=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,_o={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:vo,unlockedApi:["setStrategyJs"],seedRiders:[...D(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...D(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:ko,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},Co=`SimConfig(
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
)`,To={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:Co,unlockedApi:["setStrategyJs"],seedRiders:[...D(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...D(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},Ro=`SimConfig(
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
)`,Eo=`// Stage 8 — Event-Driven
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
`,xo={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:Ro,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...D(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...D(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:Eo,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},Io=`SimConfig(
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
)`,Ao=`// Stage 9 — Take the Wheel
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
`,Mo={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:Io,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...D(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:Ao,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},Po=`SimConfig(
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
)`,Lo=`// Stage 10 — Patient Boarding
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
`,Fo={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:Po,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...D(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:Lo,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},Bo=`SimConfig(
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
)`,$o=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,Do={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:Bo,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...D(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...D(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:$o,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},Oo=`SimConfig(
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
)`,qo=`// Stage 12 — Routes
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
`,Wo={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:Oo,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...D(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...D(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:qo,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},Ho=`SimConfig(
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
)`,No=`// Stage 13 — Transfer Points
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
`,Go={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:Ho,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...D(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...D(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...D(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:No,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},Uo=`SimConfig(
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
)`,jo=`// Stage 14 — Build a Floor
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
`,zo={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:Uo,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...D(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:jo,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},Vo=`SimConfig(
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
)`,Xo=`// Stage 15 — Sky Lobby
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
`,Yo={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:Vo,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...D(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...D(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:Xo,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},te=[uo,ho,mo,yo,wo,_o,To,xo,Mo,Fo,Do,Wo,Go,zo,Yo];function Ko(e){return te.find(t=>t.id===e)}function Qo(e){const t=te.findIndex(n=>n.id===e);if(!(t<0))return te[t+1]}function P(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function Ke(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const je="quest:code:v1:",Vn="quest:bestStars:v1:",Xn=5e4;function Ce(){try{return globalThis.localStorage??null}catch{return null}}function tn(e){const t=Ce();if(!t)return null;try{const n=t.getItem(je+e);if(n===null)return null;if(n.length>Xn){try{t.removeItem(je+e)}catch{}return null}return n}catch{return null}}function nn(e,t){if(t.length>Xn)return;const n=Ce();if(n)try{n.setItem(je+e,t)}catch{}}function Jo(e){const t=Ce();if(t)try{t.removeItem(je+e)}catch{}}function Te(e){const t=Ce();if(!t)return 0;let n;try{n=t.getItem(Vn+e)}catch{return 0}if(n===null)return 0;const i=Number.parseInt(n,10);return!Number.isInteger(i)||i<0||i>3?0:i}function Zo(e,t){const n=Te(e);if(t<=n)return;const i=Ce();if(i)try{i.setItem(Vn+e,String(t))}catch{}}const er={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},tr=["basics","strategies","events-manual","topology"],Yn=3;function nr(){return{root:P("quest-grid","quest-grid"),progress:P("quest-grid-progress","quest-grid"),sections:P("quest-grid-sections","quest-grid")}}function rt(e,t){Ke(e.sections);let n=0;const i=te.length*Yn;for(const o of tr){const r=te.filter(c=>c.section===o);if(r.length===0)continue;const l=document.createElement("section");l.dataset.section=o;const s=document.createElement("h2");s.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",s.textContent=er[o],l.appendChild(s);const a=document.createElement("div");a.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const c of r){const f=Te(c.id);n+=f,a.appendChild(ir(c,f,t))}l.appendChild(a),e.sections.appendChild(l)}e.progress.textContent=`${n} / ${i}`}function ir(e,t,n){const i=te.findIndex(p=>p.id===e.id),o=String(i+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const l=document.createElement("div");l.className="flex items-baseline justify-between gap-2";const s=document.createElement("span");s.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",s.textContent=o,l.appendChild(s);const a=document.createElement("span");a.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",a.classList.add(t>0?"text-accent":"text-content-disabled"),a.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),a.textContent="★".repeat(t)+"☆".repeat(Yn-t),l.appendChild(a),r.appendChild(l);const c=document.createElement("div");c.className="text-content text-[13px] font-semibold tracking-[-0.01em]",c.textContent=e.title,r.appendChild(c);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const or=75;async function on(e,t,n,i){let o=n;for(;o<t.length;){const r=t[o];if(r===void 0||(r.atTick??0)>i)break;await e.spawnRider(r.origin,r.destination,r.weight??or,r.patienceTicks),o+=1}return o}async function rr(e,t,n={}){const i=n.maxTicks??1500,o=n.batchTicks??60,r=await no({configRon:e.configRon,strategy:"scan"});try{const l=[...e.seedRiders].sort((d,u)=>(d.atTick??0)-(u.atTick??0));let s=await on(r,l,0,0);const a={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(a.timeoutMs=n.timeoutMs),await r.loadController(t,a);let c=null,f=0;const p=n.onSnapshot!==void 0;for(;f<i;){const d=i-f,u=Math.min(o,d),h=await r.tick(u,p?{wantVisuals:!0}:void 0);c=h.metrics,f=h.tick,s=await on(r,l,s,f);const g=rn(c,f);if(n.onProgress)try{n.onProgress(g)}catch{}if(n.onSnapshot&&h.snapshot)try{n.onSnapshot(h.snapshot)}catch{}if(e.passFn(g))return sn(e,g,!0)}if(c===null)throw new Error("runStage: maxTicks must be positive");return sn(e,rn(c,f),!1)}finally{r.dispose()}}function rn(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function sn(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let i=1;return e.starFns[0]?.(t)&&(i=2,e.starFns[1]?.(t)&&(i=3)),{passed:!0,stars:i,grade:t}}function sr(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const i=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(i)&&i>0&&n.push(`${i.toFixed(1)}s avg wait`),n.join(" · ")}const Kn=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(Kn.map(e=>[e.name,e]));function Qn(e){const t=new Set(e);return Kn.filter(n=>t.has(n.name))}function ar(){return{root:P("quest-api-panel","api-panel")}}function an(e,t){Ke(e.root);const n=Qn(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const i=document.createElement("p");i.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",i.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(i);const o=document.createElement("ul");o.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const l=document.createElement("li");l.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const s=document.createElement("code");s.className="block font-mono text-[12px] text-content",s.textContent=r.signature,l.appendChild(s);const a=document.createElement("p");a.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",a.textContent=r.description,l.appendChild(a),o.appendChild(l)}e.root.appendChild(o)}function lr(){return{root:P("quest-hints","hints-drawer"),count:P("quest-hints-count","hints-drawer"),list:P("quest-hints-list","hints-drawer")}}const ln="quest-hints-more";function cn(e,t){Ke(e.list);for(const i of e.root.querySelectorAll(`.${ln}`))i.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((i,o)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=i,o>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const i=document.createElement("button");i.type="button",i.className=`${ln} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,i.textContent=`Show ${n-1} more`,i.addEventListener("click",()=>{for(const o of e.list.querySelectorAll("li[hidden]"))o.hidden=!1;i.remove()}),e.root.appendChild(i)}e.root.removeAttribute("open")}function cr(){return{root:P("quest-reference","reference-panel"),status:P("quest-reference-status","reference-panel"),code:P("quest-reference-code","reference-panel")}}function st(e,t,n={}){const i=t.referenceSolution,o=Te(t.id);if(!i||o===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=o===3?"(mastered)":"(unlocked)",e.code.textContent=i,n.collapse!==!1&&e.root.removeAttribute("open")}function dr(){const e="results-modal";return{root:P("quest-results-modal",e),title:P("quest-results-title",e),stars:P("quest-results-stars",e),detail:P("quest-results-detail",e),close:P("quest-results-close",e),retry:P("quest-results-retry",e),next:P("quest-results-next",e)}}function pr(e,t,n,i,o){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=ur(t.grade,t.passed,i),e.retry.onclick=()=>{at(e),n()},e.close.onclick=()=>{at(e)};const r=o;r?(e.next.hidden=!1,e.next.onclick=()=>{at(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function at(e){e.root.classList.remove("show")}function ur(e,t,n){const i=`tick ${e.endTick}`,o=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${o} · finished by ${i}.`;if(n)try{const r=n(e);if(r)return`${o}. ${r}`}catch{}return`${o}. The pass condition wasn't met within the run budget.`}const fr={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function dn(e){return fr[e]??`sim.${e}();`}function hr(){return{root:P("quest-snippets","snippet-picker")}}function pn(e,t,n){Ke(e.root);const i=Qn(t.unlockedApi);if(i.length!==0)for(const o of i){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=o.name,r.title=`Insert: ${dn(o.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(dn(o.name))}),e.root.appendChild(r)}}function ze(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const i=parseInt(n[1],16),o=i>>16&255,r=i>>8&255,l=i&255,s=a=>t>=0?Math.round(a+(255-a)*t):Math.round(a*(1+t));return`rgb(${s(o)}, ${s(r)}, ${s(l)})`}function At(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const i=parseInt(n[1],16),o=i>>16&255,r=i>>8&255,l=i&255;return`rgba(${o}, ${r}, ${l}, ${t})`}function Jn(e,t){if(/^#[0-9a-f]{6}$/i.test(e)){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return At(e,t)}function gr(e,t,n,i,o){const r=(e+n)/2,l=(t+i)/2,s=n-e,a=i-t,c=Math.max(Math.hypot(s,a),1),f=-a/c,p=s/c,d=Math.min(c*.25,22),u=r+f*d,h=l+p*d,g=1-o;return[g*g*e+2*g*o*u+o*o*n,g*g*t+2*g*o*h+o*o*i]}function mr(e){let r=e;for(let s=0;s<3;s++){const a=1-r,c=3*a*a*r*.2+3*a*r*r*.2+r*r*r,f=3*a*a*.2+6*a*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(c-e)/f,r=Math.max(0,Math.min(1,r))}const l=1-r;return 3*l*l*r*.6+3*l*r*r*1+r*r*r}const Mt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},br="#2a2a35",yr="#a1a1aa",Sr=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],wr=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],vr="rgba(8, 10, 14, 0.55)",kr="#3a3a45",_r=[1,1,.5,.42],Cr=["LOW","HIGH","VIP","SERVICE"],Tr="#e6c56b",Rr="#9bd4c4",Er=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],xr="#a1a1aa",Ir="#4a4a55",Ar="#f59e0b",Zn="#7dd3fc",ei="#fda4af",lt="#fafafa",ti="#8b8c92",ni="rgba(250, 250, 250, 0.95)",Mr=260,un=3,Pr=.05,fn=["standard","briefcase","bag","short","tall"];function de(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,fn[n%fn.length]??"standard"}function Lr(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function ii(e,t,n,i,o,r="standard"){const l=Lr(r,i),a=n-.5,c=a-l.bodyH,f=c-l.neckGap-l.headR,p=l.bodyH*.08,d=a-l.headR*.8;if(e.fillStyle=o,e.beginPath(),e.moveTo(t-l.shoulderW/2,c+p),e.lineTo(t-l.shoulderW/2+p,c),e.lineTo(t+l.shoulderW/2-p,c),e.lineTo(t+l.shoulderW/2,c+p),e.lineTo(t+l.waistW/2,d),e.lineTo(t+l.footW/2,a),e.lineTo(t-l.footW/2,a),e.lineTo(t-l.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,l.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const u=Math.max(1.6,l.headR*.9),h=t+l.waistW/2+u*.1,g=a-u-.5;e.fillRect(h,g,u,u);const y=u*.55;e.fillRect(h+(u-y)/2,g-1,y,1)}else if(r==="bag"){const u=Math.max(1.3,l.headR*.9),h=t-l.shoulderW/2-u*.35,g=c+l.bodyH*.35;e.beginPath(),e.arc(h,g,u,0,Math.PI*2),e.fill(),e.strokeStyle=o,e.lineWidth=.8,e.beginPath(),e.moveTo(h+u*.2,g-u*.8),e.lineTo(t+l.shoulderW/2-p,c+.5),e.stroke()}else if(r==="tall"){const u=l.headR*2.1,h=Math.max(1,l.headR*.45);e.fillRect(t-u/2,f-l.headR-h+.4,u,h)}}function Fr(e,t,n,i,o,r,l,s,a){const f=Math.max(1,Math.floor((o-14)/s.figureStride)),p=Math.min(r,f),d=-2;for(let u=0;u<p;u++){const h=t+d+i*u*s.figureStride,g=u+0,y=de(a,g);ii(e,h,n,s.figureHeadR,l,y)}if(r>p){e.fillStyle=ti,e.font=`${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const u=t+d+i*p*s.figureStride;e.fillText(`+${r-p}`,u,n-1)}}function Y(e,t,n,i,o,r){const l=Math.min(r,i/2,o/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,i,o,l);return}e.moveTo(t+l,n),e.lineTo(t+i-l,n),e.quadraticCurveTo(t+i,n,t+i,n+l),e.lineTo(t+i,n+o-l),e.quadraticCurveTo(t+i,n+o,t+i-l,n+o),e.lineTo(t+l,n+o),e.quadraticCurveTo(t,n+o,t,n+o-l),e.lineTo(t,n+l),e.quadraticCurveTo(t,n,t+l,n),e.closePath()}function Br(e,t,n){if(e.measureText(t).width<=n)return t;const i="…";let o=0,r=t.length;for(;o<r;){const l=o+r+1>>1;e.measureText(t.slice(0,l)+i).width<=n?o=l:r=l-1}return o===0?i:t.slice(0,o)+i}function $r(e,t){for(const n of t){const i=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-i,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const i=n.width/2;e.strokeStyle=n.frame;const o=n.cx-i+.5,r=n.cx+i-.5;e.beginPath(),e.moveTo(o,n.top),e.lineTo(o,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function Dr(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textBaseline="alphabetic",e.textAlign="center";const i=n.padTop-n.fontSmall*.5-2,o=i-n.fontSmall*.5-1,r=i+n.fontSmall*.5+1,l=Math.max(n.fontSmall+.5,o);for(const s of t){const a=s.top-3,c=a>o&&a-n.fontSmall<r;e.fillStyle=s.color,e.fillText(s.text,s.cx,c?l:a)}}function Or(e,t,n,i,o,r,l,s,a){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";const c=i.padX,f=i.padX+i.labelW,p=r-i.padX,d=i.shaftInnerW/2,u=Math.min(i.shaftInnerW*1.8,(p-f)/2),h=[...t.stops].sort((g,y)=>g.y-y.y);for(let g=0;g<h.length;g++){const y=h[g];if(y===void 0)continue;const w=n(y.y),T=h[g+1],E=T!==void 0?n(T.y):s;if(e.strokeStyle=br,e.lineWidth=a?2:1,e.beginPath(),a)for(const m of o)e.moveTo(m-u,w+.5),e.lineTo(m+u,w+.5);else{let m=f;for(const v of o){const S=v-d,R=v+d;S>m&&(e.moveTo(m,w+.5),e.lineTo(S,w+.5)),m=R}m<p&&(e.moveTo(m,w+.5),e.lineTo(p,w+.5))}e.stroke();for(let m=0;m<o.length;m++){const v=o[m];if(v===void 0)continue;const S=l.has(`${m}:${y.entity_id}`);e.strokeStyle=S?Ar:Ir,e.lineWidth=S?1.4:1,e.beginPath(),e.moveTo(v-d-2,w+.5),e.lineTo(v-d,w+.5),e.moveTo(v+d,w+.5),e.lineTo(v+d+2,w+.5),e.stroke()}const b=a?w:(w+E)/2;e.fillStyle=yr,e.textAlign="right",e.fillText(Br(e,y.name,i.labelW-4),c+i.labelW-4,b)}}function qr(e,t,n,i,o,r){for(const l of t.stops){if(l.waiting_by_line.length===0)continue;const s=r.get(l.entity_id);if(s===void 0||s.size===0)continue;const a=n(l.y),c=l.waiting_up>=l.waiting_down?Zn:ei;for(const f of l.waiting_by_line){if(f.count===0)continue;const p=s.get(f.line);if(p===void 0)continue;const d=o.get(p);if(d===void 0)continue;const u=d.end-d.start;u<=i.figureStride||Fr(e,d.end-2,a,-1,u,f.count,c,i,l.entity_id)}}}function Wr(e,t,n,i,o,r,l,s,a,c=!1){const f=i*.22,p=(o-4)/10.5,d=Math.max(1.2,Math.min(s.figureHeadR,f,p)),u=s.figureStride*(d/s.figureHeadR),h=3,g=2,y=i-h*2,T=Math.max(1,Math.floor((y-16)/u)),E=Math.min(r,T),b=E*u,m=t-b/2+u/2,v=n-g;for(let S=0;S<E;S++){const R=a?.[S]??de(0,S);ii(e,m+S*u,v,d,l,R)}if(r>E){const S=`+${r-E}`,R=Math.max(8,s.fontSmall-1);e.font=`700 ${R.toFixed(1)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="middle";const k=e.measureText(S).width,I=3,C=1.5,A=Math.ceil(k+I*2),x=Math.ceil(R+C*2),M=t+i/2-2,F=n-o+2,B=M-A;e.fillStyle="rgba(15, 15, 18, 0.85)",Y(e,B,F,A,x,2),e.fill(),e.fillStyle="#fafafa",e.fillText(S,M-I,F+x/2)}if(c){const S=Math.max(10,Math.min(o*.7,i*.55));e.font=`800 ${S.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="center",e.textBaseline="middle";const R=n-o/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,R+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,R)}}function Hr(e,t,n,i,o,r,l){const s=Math.max(2,r.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const c=l.get(a.target);if(c===void 0)continue;const f=t.stops[c];if(f===void 0)continue;const p=n.get(a.id);if(p===void 0)continue;const d=o(f.y)-r.carH/2,u=o(a.y)-r.carH/2;Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(p,u),e.lineTo(p,d),e.stroke(),e.fillStyle=ni,e.beginPath(),e.arc(p,d,s,0,Math.PI*2),e.fill())}}function Nr(e,t,n,i,o,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const l=Mt[t.phase]??"#6b6b75",s=i/2;for(let a=1;a<=un;a++){const c=r(t.y-t.v*Pr*a),f=.18*(1-(a-1)/un);e.fillStyle=At(l,f),e.fillRect(n-s,c-o,i,o)}}function Gr(e,t,n,i,o,r,l,s,a){const c=l(t.y),f=c-o,p=i/2,d=Mt[t.phase]??"#6b6b75",u=e.createLinearGradient(n,f,n,c);u.addColorStop(0,ze(d,.14)),u.addColorStop(1,ze(d,-.18)),e.fillStyle=u,e.fillRect(n-p,f,i,o),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-p+.5,f+.5,i-1,o-1);const h=t.capacity>0&&t.load>=t.capacity*.95;(t.riders>0||h)&&Wr(e,n,c,i,o,t.riders,r,s,a,h)}function Ur(e,t,n,i,o,r,l,s){const h=`600 ${r.fontSmall+.5}px system-ui, -apple-system, "Segoe UI", sans-serif`;e.font=h,e.textBaseline="middle";const g=.3,y=performance.now(),w=t,T=[];for(const b of n.cars){const m=l.get(b.id);if(!m)continue;const v=i.get(b.id);if(v===void 0)continue;const S=o(b.y),R=S-r.carH,k=Math.max(1,m.expiresAt-m.bornAt),I=m.expiresAt-y,C=I>k*g?1:Math.max(0,I/(k*g));if(C<=0)continue;const x=e.measureText(m.text).width+14,M=r.fontSmall+8+2,F=R-2-4-M,B=S+2+4+M>s,V=F<2&&!B?"below":"above",Re=V==="above"?R-2-4-M:S+2+4;let W=v-x/2;const Ee=2,xe=s-x-2;W<Ee&&(W=Ee),W>xe&&(W=xe),T.push({bubble:m,alpha:C,cx:v,carTop:R,carBottom:S,bubbleW:x,bubbleH:M,side:V,bx:W,by:Re})}const E=(b,m)=>!(b.bx+b.bubbleW<=m.bx||m.bx+m.bubbleW<=b.bx||b.by+b.bubbleH<=m.by||m.by+m.bubbleH<=b.by);for(let b=1;b<T.length;b++){const m=T[b];if(m===void 0)continue;let v=!1;for(let C=0;C<b;C++){const A=T[C];if(A!==void 0&&E(m,A)){v=!0;break}}if(!v)continue;const S=m.side==="above"?"below":"above",R=S==="above"?m.carTop-2-4-m.bubbleH:m.carBottom+2+4,k={...m,side:S,by:R};let I=!0;for(let C=0;C<b;C++){const A=T[C];if(A!==void 0&&E(k,A)){I=!1;break}}I&&(T[b]=k)}for(const b of T){const{bubble:m,alpha:v,cx:S,carTop:R,carBottom:k,bubbleW:I,bubbleH:C,side:A,bx:x,by:M}=b,F=A==="above"?R-2:k+2,B=A==="above"?M+C:M,V=Math.min(Math.max(S,x+6+5/2),x+I-6-5/2);e.save(),e.globalAlpha=v,e.shadowColor=w,e.shadowBlur=8,e.fillStyle="rgba(16, 19, 26, 0.94)",Y(e,x,M,I,C,6),e.fill(),e.shadowBlur=0,e.strokeStyle=Jn(w,.65),e.lineWidth=1,Y(e,x,M,I,C,6),e.stroke(),e.beginPath(),e.moveTo(V-5/2,B),e.lineTo(V+5/2,B),e.lineTo(V,F),e.closePath(),e.fillStyle="rgba(16, 19, 26, 0.94)",e.fill(),e.stroke(),e.fillStyle="#f0f3fb",e.textAlign="center",e.fillText(m.text,x+I/2,M+C/2),e.restore()}}function jr(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function zr(e){const t=[];for(let n=3;n<=8;n++){const i=10**n;if(i>e)break;t.push({altitudeM:i,label:Qe(i)})}return t}function Qe(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function oi(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function Vr(e,t,n){const i=Math.abs(e);if(i<.5)return"idle";const o=i-Math.abs(t);return i>=n*.95&&Math.abs(o)<n*.005?"cruise":o>0?"accel":o<0?"decel":"cruise"}function Xr(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const i=Math.floor(e/60),o=Math.round(e%60);return o===0?`${i}m`:`${i}m ${o}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function Yr(e,t,n,i,o,r){const l=Math.abs(t-e);if(l<.001)return 0;const s=Math.abs(n);if(s*s/(2*r)>=l)return s>0?s/r:0;const c=Math.max(0,(i-s)/o),f=s*c+.5*o*c*c,p=i/r,d=i*i/(2*r);if(f+d>=l){const h=(2*o*r*l+r*s*s)/(o+r),g=Math.sqrt(Math.max(h,s*s));return(g-s)/o+g/r}const u=l-f-d;return c+u/Math.max(i,.001)+p}const ri={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},Ve={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function Kr(e,t,n,i,o,r){const l=o/2,s=i-r/2,a=Mt[t.phase]??"#6b6b75",c=e.createLinearGradient(n,s,n,s+r);c.addColorStop(0,ze(a,.14)),c.addColorStop(1,ze(a,-.18)),e.fillStyle=c,Y(e,n-l,s,o,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-l+2,s+r*.36,o-4,Math.max(1.5,r*.1))}function Qr(e,t,n,i,o){if(t.length===0)return;const r=7,l=4,s=o.fontSmall+2,a=n/2+8;e.font=`600 ${(o.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;const c=(d,u)=>{const h=[d.carName,Qe(d.altitudeM),oi(d.velocity),`${ri[d.phase]} · ${d.layer}`];let g=0;for(const b of h)g=Math.max(g,e.measureText(b).width);const y=g+r*2,w=h.length*s+l*2;let T=u==="right"?d.cx+a:d.cx-a-y;T=Math.max(2,Math.min(i-y-2,T));const E=d.cy-w/2;return{hud:d,lines:h,bx:T,by:E,bubbleW:y,bubbleH:w,side:u}},f=(d,u)=>!(d.bx+d.bubbleW<=u.bx||u.bx+u.bubbleW<=d.bx||d.by+d.bubbleH<=u.by||u.by+u.bubbleH<=d.by),p=[];t.forEach((d,u)=>{let h=c(d,u%2===0?"right":"left");if(p.some(g=>f(h,g))){const g=c(d,h.side==="right"?"left":"right");if(p.every(y=>!f(g,y)))h=g;else{const y=Math.max(...p.map(w=>w.by+w.bubbleH));h={...h,by:y+4}}}p.push(h)});for(const d of p){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",Y(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=Ve[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,Y(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let u=0;u<d.lines.length;u++){const h=d.by+l+s*u+s/2,g=d.lines[u]??"";e.fillStyle=u===0||u===3?Ve[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(g,d.bx+r,h)}e.restore()}}function Jr(e,t,n,i,o,r){if(t.length===0)return;const l=18,s=10,a=6,c=5,f=r.fontSmall+2.5,d=a*2+5*f,u=l+a+(d+c)*t.length;e.save();const h=e.createLinearGradient(n,o,n,o+u);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,Y(e,n,o,i,u,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,Y(e,n,o,i,u,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,o+1),e.lineTo(n+i-8,o+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+s,o+l/2+2);let g=o+l+a;for(const y of t){e.fillStyle="rgba(15, 15, 18, 0.55)",Y(e,n+6,g,i-12,d,5),e.fill(),e.fillStyle=Ve[y.phase],e.fillRect(n+6,g,2,d);const w=n+s+4,T=n+i-s;let E=g+a+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(y.carName,w,E),e.textAlign="right",e.fillStyle=Ve[y.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(ri[y.phase].toUpperCase(),T,E);const b=y.etaSeconds!==void 0&&Number.isFinite(y.etaSeconds)?Xr(y.etaSeconds):"—",m=[["Altitude",Qe(y.altitudeM)],["Velocity",oi(y.velocity)],["Dest",y.destinationName??"—"],["ETA",b]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;for(const[v,S]of m)E+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(v,w,E),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(S,T,E);g+=d+c}e.restore()}function Zr(e,t,n,i,o,r,l){return[...e.cars].sort((a,c)=>a.id-c.id).map((a,c)=>{const f=a.y,p=a.target!==void 0?e.stops.find(u=>u.entity_id===a.target):void 0,d=p?Yr(f,p.y,a.v,o,r,l):void 0;return{cx:n,cy:t.toScreenAlt(f),altitudeM:f,velocity:a.v,phase:Vr(a.v,i.get(a.id)??0,o),layer:jr(f),carName:`Climber ${String.fromCharCode(65+c)}`,destinationName:p?.name,etaSeconds:d}})}const he=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function ct(e,t,n){return e+(t-e)*n}function dt(e,t,n){const i=parseInt(e.slice(1),16),o=parseInt(t.slice(1),16),r=Math.round(ct(i>>16&255,o>>16&255,n)),l=Math.round(ct(i>>8&255,o>>8&255,n)),s=Math.round(ct(i&255,o&255,n));return`#${(r<<16|l<<8|s).toString(16).padStart(6,"0")}`}function es(e,t){let n=0;for(;n<he.length-1;n++){const c=he[n+1];if(c===void 0||e<=c[0])break}const i=he[n],o=he[Math.min(n+1,he.length-1)];if(i===void 0||o===void 0)return"#050810";const r=o[0]-i[0],l=r<=0?0:Math.max(0,Math.min(1,(e-i[0])/r)),s=dt(i[1],o[1],l),a=dt(i[2],o[2],l);return dt(s,a,t)}const ts=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let i=0;i<60;i++){const o=.45+Math.pow(n(),.7)*.55;e.push({altFrac:o,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function ns(e,t,n,i,o){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),l=Math.log10(1+t.axisMaxM/1e3),s=[0,.05,.15,.35,.6,1];for(const c of s){const f=1e3*(10**(c*l)-1);r.addColorStop(c,es(f,o))}e.fillStyle=r,e.fillRect(n,t.shaftTop,i-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,i-n,t.shaftBottom-t.shaftTop),e.clip();for(const c of ts){const f=t.axisMaxM*c.altFrac;if(f<8e4)continue;const p=t.toScreenAlt(f),d=n+c.xFrac*(i-n),u=c.alpha*(.7+.3*o);e.fillStyle=`rgba(232, 232, 240, ${u.toFixed(3)})`,e.beginPath(),e.arc(d,p,c.size,0,Math.PI*2),e.fill()}e.restore();const a=zr(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const c of a){const f=t.toScreenAlt(c.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(i,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(c.label,n+4,f-6))}}function is(e,t,n,i){const r=i-28,l=e.createLinearGradient(0,r,0,i);l.addColorStop(0,"rgba(0,0,0,0)"),l.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),l.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=l,e.fillRect(t,r,n-t,28),e.strokeStyle=Jn("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,i+.5),e.lineTo(n,i+.5),e.stroke()}function os(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function rs(e,t,n,i){const o=Math.max(5,i.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-o),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const l=-Math.PI/2+r*Math.PI/3,s=t+Math.cos(l)*o,a=n+Math.sin(l)*o;r===0?e.moveTo(s,a):e.lineTo(s,a)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(i.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+o+6,n),e.restore()}function ss(e,t,n,i,o,r,l){e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const s of t.stops){const a=n.toScreenAlt(s.y);if(a<n.shaftTop||a>n.shaftBottom)continue;const c=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(i-c/2,a),e.lineTo(i-5,a),e.moveTo(i+5,a),e.lineTo(i+c/2,a),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(i-c/2,a),e.lineTo(i-5,a-5),e.moveTo(i+c/2,a),e.lineTo(i+5,a-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(s.name,r+l-4,a-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(o.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(Qe(s.y),r+l-4,a+10),e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function as(e,t,n){const i=Math.max(n.counterweightAltitudeM,1),o=Math.log10(1+i/1e3);return{axisMaxM:i,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const l=Math.log10(1+Math.max(0,r)/1e3),s=o<=0?0:Math.max(0,Math.min(1,l/o));return t-s*(t-e)}}}function ls(e,t,n,i,o,r,l){const s=Math.max(2,l.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const c=r.get(a.target);if(c===void 0)continue;const f=t.stops[c];if(f===void 0)continue;const p=o.get(a.id);if(p===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(i,p),e.lineTo(i,d),e.stroke(),e.fillStyle=ni,e.beginPath(),e.arc(i,d,s,0,Math.PI*2),e.fill())}}function cs(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function ds(e,t,n,i,o,r,l){l.firstDrawAt===0&&(l.firstDrawAt=performance.now());const s=(performance.now()-l.firstDrawAt)/1e3,a=r.showDayNight?cs(s):.5,c=n>=520&&i>=360,f=Math.min(120,Math.max(72,n*.16)),p=c?Math.min(220,Math.max(160,n*.24)):0,d=c?14:0,u=o.padX,h=u+f+4,g=n-o.padX-p-d,y=(h+g)/2,w=12,T=o.padTop+24,E=i-o.padBottom-18,b=as(T,E,r);ns(e,b,h+w,g-w,a),is(e,h+w,g-w,E),os(e,y,b),rs(e,y,b.shaftTop,o),ss(e,t,b,y,o,u,f);const m=Math.max(20,Math.min(34,g-h-8)),v=Math.max(16,Math.min(26,m*.72));o.carH=v,o.carW=m;const S=new Map,R=new Map;t.stops.forEach((C,A)=>R.set(C.entity_id,A));for(const C of t.cars)S.set(C.id,b.toScreenAlt(C.y));ls(e,t,b,y,S,R,o);for(const C of t.cars){const A=S.get(C.id);A!==void 0&&Kr(e,C,y,A,m,v)}const I=[...Zr(t,b,y,l.prevVelocity,l.maxSpeed,l.acceleration,l.deceleration)].sort((C,A)=>A.altitudeM-C.altitudeM);Qr(e,I,m,n-p-d,o),c&&Jr(e,I,n-o.padX-p,p,T,o);for(const C of t.cars)l.prevVelocity.set(C.id,C.v);if(l.prevVelocity.size>t.cars.length){const C=new Set(t.cars.map(A=>A.id));for(const A of l.prevVelocity.keys())C.has(A)||l.prevVelocity.delete(A)}}function ps(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(i,o)=>i+(o-i)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function hn(e,t){let n,i=1/0;for(const o of e){const r=Math.abs(o.y-t);r<i&&(i=r,n=o)}return n!==void 0?{stop:n,dist:i}:void 0}class si{#e;#t;#n=window.devicePixelRatio||1;#o;#r=null;#s=-1;#d=new Map;#a;#i=new Map;#l=new Map;#c=[];#p=null;#g=new Map;#m=1;#b=1;#y=1;#f=0;#u=new Map;constructor(t,n){this.#e=t;const i=t.getContext("2d");if(!i)throw new Error("2D context unavailable");this.#t=i,this.#a=n,this.#h(),this.#o=()=>{this.#h()},window.addEventListener("resize",this.#o)}dispose(){window.removeEventListener("resize",this.#o)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#g.clear(),this.#f=0,this.#u.clear()}setTetherPhysics(t,n,i){Number.isFinite(t)&&t>0&&(this.#m=t),Number.isFinite(n)&&n>0&&(this.#b=n),Number.isFinite(i)&&i>0&&(this.#y=i)}pushAssignment(t,n,i){let o=this.#u.get(t);o===void 0&&(o=new Map,this.#u.set(t,o)),o.set(i,n)}#h(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const i=t*this.#n,o=n*this.#n;(this.#e.width!==i||this.#e.height!==o)&&(this.#e.width=i,this.#e.height=o),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}draw(t,n,i){this.#h();const{clientWidth:o,clientHeight:r}=this.#e,l=this.#t;if(l.clearRect(0,0,o,r),t.stops.length===0||o===0||r===0)return;o!==this.#s&&(this.#r=ps(o),this.#s=o);const s=this.#r;if(s===null)return;if(this.#p!==null){this.#S(t,o,r,s,n,i,this.#p);return}const a=t.stops.length===2,c=t.stops[0];if(c===void 0)return;let f=c.y,p=c.y;for(let _=1;_<t.stops.length;_++){const L=t.stops[_];if(L===void 0)continue;const $=L.y;$<f&&(f=$),$>p&&(p=$)}const d=t.stops.map(_=>_.y).sort((_,L)=>_-L),u=d.length>=3?(d.at(-1)??0)-(d.at(-2)??0):1,g=f-1,y=p+u,w=Math.max(y-g,1e-4),T=a?18:0;let E,b;if(a)E=s.padTop+T,b=r-s.padBottom-T;else{const _=[];for(let re=1;re<d.length;re++){const Ie=d[re],Ae=d[re-1];if(Ie===void 0||Ae===void 0)continue;const J=Ie-Ae;J>0&&_.push(J)}const O=48/(_.length>0?Math.min(..._):1),X=Math.max(0,r-s.padTop-s.padBottom)/w,K=Math.min(X,O),oe=w*K;b=r-s.padBottom,E=b-oe}const m=_=>b-(_-g)/w*(b-E),v=this.#d;v.forEach(_=>_.length=0);for(const _ of t.cars){const L=v.get(_.line);L?L.push(_):v.set(_.line,[_])}const S=[...v.keys()].sort((_,L)=>_-L),R=S.reduce((_,L)=>_+(v.get(L)?.length??0),0),k=Math.max(0,o-2*s.padX-s.labelW),I=s.figureStride*2,C=s.shaftSpacing*Math.max(R-1,0),x=(k-C)/Math.max(R,1),M=a?34:s.maxShaftInnerW,B=Math.max(s.minShaftInnerW,Math.min(M,x*.55)),V=Math.max(0,Math.min(x-B,I+s.figureStride*4)),Re=Math.max(14,B-6);let W=1/0;if(t.stops.length>=2)for(let _=1;_<d.length;_++){const L=d[_-1],$=d[_];if(L===void 0||$===void 0)continue;const O=m(L)-m($);O>0&&O<W&&(W=O)}const Ee=m(p)-2,xe=Number.isFinite(W)?W:s.carH,Si=a?s.carH:xe,wi=Math.max(14,Math.min(Si,Ee));if(!a&&Number.isFinite(W)){const _=Math.max(1.5,Math.min(W*.067,4)),L=s.figureStride*(_/s.figureHeadR);s.figureHeadR=_,s.figureStride=L}s.shaftInnerW=B,s.carW=Re,s.carH=wi;const vi=s.padX+s.labelW,ki=B+V,et=[],fe=new Map,tt=new Map;let Ft=0;for(const _ of S){const L=v.get(_)??[];for(const $ of L){const O=vi+Ft*(ki+s.shaftSpacing),G=O,X=O+V,K=X+B/2;et.push(K),fe.set($.id,K),tt.set($.id,{start:G,end:X}),Ft++}}const Bt=new Map;t.stops.forEach((_,L)=>Bt.set(_.entity_id,L));const $t=new Set;{let _=0;for(const L of S){const $=v.get(L)??[];for(const O of $){if(O.phase==="loading"||O.phase==="door-opening"||O.phase==="door-closing"){const G=hn(t.stops,O.y);G!==void 0&&G.dist<.5&&$t.add(`${_}:${G.stop.entity_id}`)}_++}}}const Dt=new Map,Ot=new Map,qt=new Map,Wt=new Map,Ht=[],Nt=[];let Gt=0;for(let _=0;_<S.length;_++){const L=S[_];if(L===void 0)continue;const $=v.get(L)??[],O=Sr[_]??vr,G=wr[_]??kr,X=_r[_]??1,K=Er[_]??xr,oe=Math.max(14,B*X),re=Math.max(10,Re*X),Ie=Math.max(10,s.carH),Ae=_===2?Tr:_===3?Rr:lt;let J=1/0,nt=-1/0,Me=1/0;for(const Q of $){Dt.set(Q.id,oe),Ot.set(Q.id,re),qt.set(Q.id,Ie),Wt.set(Q.id,Ae);const se=et[Gt];if(se===void 0)continue;const Ut=Number.isFinite(Q.min_served_y)&&Number.isFinite(Q.max_served_y),it=Ut?Math.max(E,m(Q.max_served_y)-s.carH-2):E,_i=Ut?Math.min(b,m(Q.min_served_y)+2):b;Ht.push({cx:se,top:it,bottom:_i,fill:O,frame:G,width:oe}),se<J&&(J=se),se>nt&&(nt=se),it<Me&&(Me=it),Gt++}S.length>1&&Number.isFinite(J)&&Number.isFinite(Me)&&Nt.push({cx:(J+nt)/2,top:Me,text:Cr[_]??`Line ${_+1}`,color:K})}$r(l,Ht),Dr(l,Nt,s),Or(l,t,m,s,et,o,$t,E,a),qr(l,t,m,s,tt,this.#u),Hr(l,t,fe,Dt,m,s,Bt);for(const[_,L]of fe){const $=t.cars.find(oe=>oe.id===_);if(!$)continue;const O=Ot.get(_)??s.carW,G=qt.get(_)??s.carH,X=Wt.get(_)??lt,K=this.#i.get(_);Nr(l,$,L,O,G,m),Gr(l,$,L,O,G,X,m,s,K?.roster)}this.#w(t,fe,tt,m,s,n),this.#v(s),i&&i.size>0&&Ur(l,this.#a,t,fe,m,s,i,o)}#S(t,n,i,o,r,l,s){const a={prevVelocity:this.#g,maxSpeed:this.#m,acceleration:this.#b,deceleration:this.#y,firstDrawAt:this.#f};ds(this.#t,t,n,i,o,s,a),this.#f=a.firstDrawAt}#w(t,n,i,o,r,l){const s=performance.now(),a=Math.max(1,l),c=Mr/a,f=30/a,p=new Map,d=[];for(const u of t.cars){const h=this.#i.get(u.id),g=u.riders,y=n.get(u.id),w=hn(t.stops,u.y),T=u.phase==="loading"&&w!==void 0&&w.dist<.5?w.stop:void 0;if(h&&y!==void 0&&T!==void 0){const m=g-h.riders;if(m>0&&p.set(T.entity_id,(p.get(T.entity_id)??0)+m),m!==0){const v=o(T.y),S=o(u.y)-r.carH/2,R=Math.min(Math.abs(m),6);if(m>0){const k=T.waiting_up>=T.waiting_down,I=i.get(u.id);let C=y-20;if(I!==void 0){const M=I.start,F=I.end;C=(M+F)/2}const A=k?Zn:ei,x=this.#u.get(T.entity_id);x!==void 0&&(x.delete(u.line),x.size===0&&this.#u.delete(T.entity_id));for(let M=0;M<R;M++)d.push(()=>this.#c.push({kind:"board",bornAt:s+M*f,duration:c,startX:C,startY:v,endX:y,endY:S,color:A}))}else for(let k=0;k<R;k++)d.push(()=>this.#c.push({kind:"alight",bornAt:s+k*f,duration:c,startX:y,startY:S,endX:y+18,endY:S+10,color:lt}))}}const E=h?.roster??[];let b;if(h){const m=g-h.riders;if(b=E.slice(),m>0&&T!==void 0){const S=T.waiting_up>=T.waiting_down?0:1e4;for(let R=0;R<m;R++)b.push(de(T.entity_id,R+S))}else if(m>0)for(let v=0;v<m;v++)b.push(de(u.id,b.length+v));else m<0&&b.splice(b.length+m,-m)}else{b=[];for(let m=0;m<g;m++)b.push(de(u.id,m))}for(;b.length>g;)b.pop();for(;b.length<g;)b.push(de(u.id,b.length));this.#i.set(u.id,{riders:g,roster:b})}for(const u of t.stops){const h=u.waiting_up+u.waiting_down,g=this.#l.get(u.entity_id);if(g){const y=g.waiting-h,w=p.get(u.entity_id)??0,T=Math.max(0,y-w);if(T>0){const E=o(u.y),b=r.padX+r.labelW+20,m=Math.min(T,4);for(let v=0;v<m;v++)this.#c.push({kind:"abandon",bornAt:s+v*f,duration:c*1.5,startX:b,startY:E,endX:b-26,endY:E-6,color:ti})}}this.#l.set(u.entity_id,{waiting:h})}for(const u of d)u();for(let u=this.#c.length-1;u>=0;u--){const h=this.#c[u];h!==void 0&&s-h.bornAt>h.duration&&this.#c.splice(u,1)}if(this.#i.size>t.cars.length){const u=new Set(t.cars.map(h=>h.id));for(const h of this.#i.keys())u.has(h)||this.#i.delete(h)}if(this.#l.size>t.stops.length){const u=new Set(t.stops.map(h=>h.entity_id));for(const h of this.#l.keys())u.has(h)||this.#l.delete(h)}}#v(t){const n=performance.now(),i=this.#t;for(const o of this.#c){const r=n-o.bornAt;if(r<0)continue;const l=Math.min(1,Math.max(0,r/o.duration)),s=mr(l),[a,c]=o.kind==="board"?gr(o.startX,o.startY,o.endX,o.endY,s):[o.startX+(o.endX-o.startX)*s,o.startY+(o.endY-o.startY)*s],f=o.kind==="board"?.9:o.kind==="abandon"?(1-s)**1.5:1-s,p=o.kind==="abandon"?t.carDotR*.85:t.carDotR;i.fillStyle=At(o.color,f),i.beginPath(),i.arc(a,c,p,0,Math.PI*2),i.fill()}}}const us="#f59e0b",fs=3;function hs(){const e="quest-pane";return{root:P("quest-pane",e),gridView:P("quest-grid",e),stageView:P("quest-stage-view",e),backBtn:P("quest-back-to-grid",e),title:P("quest-stage-title",e),brief:P("quest-stage-brief",e),stageStars:P("quest-stage-stars",e),editorHost:P("quest-editor",e),runBtn:P("quest-run",e),resetBtn:P("quest-reset",e),result:P("quest-result",e),progress:P("quest-progress",e),shaft:P("quest-shaft",e),shaftIdle:P("quest-shaft-idle",e)}}function pt(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=Te(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(fs-n)}function ut(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function gs(e){const t=hs(),n=k=>{const I=Ko(k);if(I)return I;const C=te[0];if(!C)throw new Error("quest-pane: stage registry is empty");return C};let i=n(e.initialStageId),o="grid";pt(t,i);const r=ar();an(r,i);const l=lr();cn(l,i);const s=cr();st(s,i);const a=nr(),c=new si(t.shaft,us),f={active:!1};t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const p=await co({container:t.editorHost,initialValue:tn(i.id)??i.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const d=dr(),u=300;let h=null,g=!1;const y=()=>{g||(h!==null&&clearTimeout(h),h=setTimeout(()=>{nn(i.id,p.getValue()),h=null},u))},w=()=>{h!==null&&(clearTimeout(h),h=null,nn(i.id,p.getValue()))},T=k=>{g=!0;try{p.setValue(k)}finally{g=!1}};p.onDidChange(()=>{y()});const E=hr();pn(E,i,p);const b=()=>{f.active=!1,t.shaftIdle.hidden=!1;const k=t.shaft.getContext("2d");k&&k.clearRect(0,0,t.shaft.width,t.shaft.height)},m=(k,{fromGrid:I})=>{w(),i=k,pt(t,k),an(r,k),cn(l,k),st(s,k),pn(E,k,p),T(tn(k.id)??k.starterCode),p.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",b(),ut(t,"stage"),o="stage",e.onStageChange?.(k.id)},v=()=>{w(),b(),t.result.textContent="",t.progress.textContent="",ut(t,"grid"),o="grid",rt(a,k=>{m(n(k),{fromGrid:!0})}),e.onBackToGrid?.()};rt(a,k=>{m(n(k),{fromGrid:!0})});const S=e.landOn??"grid";ut(t,S),o=S;const R=async()=>{const k=i;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",p.clearRuntimeMarker();let I=null,C=0;f.active=!0;const A=()=>{f.active&&(I!==null&&c.draw(I,1),requestAnimationFrame(A))};t.shaftIdle.hidden=!0,requestAnimationFrame(A);try{const x=()=>o==="stage"&&i.id===k.id,M=await rr(k,p.getValue(),{timeoutMs:1e3,onProgress:F=>{x()&&(t.progress.textContent=sr(F))},onSnapshot:F=>{I=F,C+=1}});if(M.passed){const F=Te(k.id);M.stars>F&&(Zo(k.id,M.stars),rt(a,B=>{m(n(B),{fromGrid:!0})}),x()&&pt(t,i)),x()&&st(s,i,{collapse:!1})}if(x()){t.result.textContent="",t.progress.textContent="";const F=M.passed?Qo(k.id):void 0,B=F?()=>{m(F,{fromGrid:!1})}:void 0;pr(d,M,()=>void R(),k.failHint,B)}}catch(x){if(o==="stage"&&i.id===k.id){const M=x instanceof Error?x.message:String(x);t.result.textContent=`Error: ${M}`,t.progress.textContent="",x instanceof zn&&x.location!==null&&p.setRuntimeMarker({line:x.location.line,column:x.location.column,message:M})}}finally{if(t.runBtn.disabled=!1,f.active=!1,C===0){const x=t.shaft.getContext("2d");x&&x.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{R()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${i.title} to its starter code?`)&&(Jo(i.id),T(i.starterCode),p.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{v()}),{handles:t,editor:p}}let ft=null;async function ai(){if(!ft){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;ft=import(e).then(async n=>(await n.default(t),n))}return ft}class Pt{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,i){const o=await ai();return new Pt(new o.WasmSim(t,n,i))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,i,o){return this.#e.spawnRider(t,n,i,o)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class li{#e;#t=0;#n=[];#o=0;#r=0;#s=1;#d=0;constructor(t){this.#e=ms(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#o=t.reduce((n,i)=>n+i.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#s=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const i=t.stops.filter(s=>s.stop_id!==4294967295);if(i.length<2)return[];const o=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#s/60*o,this.#r=(this.#r+o)%(this.#o||1);const l=[];for(;this.#t>=1;)this.#t-=1,l.push(this.#a(i,r));return l}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,i]of this.#n.entries())if(t-=i.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#o<=0?0:Math.min(1,this.#r/this.#o)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const i=n.durationSec;if(t<i)return i>0?Math.min(1,t/i):0;t-=i}return 1}phases(){return this.#n}#a(t,n){const i=this.#i(t.length,n.originWeights);let o=this.#i(t.length,n.destWeights);o===i&&(o=(o+1)%t.length);const r=t[i],l=t[o];if(!r||!l)throw new Error("stop index out of bounds");const s=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:l.stop_id,weight:s,...this.#d>0?{patienceTicks:this.#d}:{}}}#i(t,n){if(!n||n.length!==t)return this.#c(t);let i=0;for(const r of n)i+=Math.max(0,r);if(i<=0)return this.#c(t);let o=this.#p()*i;for(const[r,l]of n.entries())if(o-=Math.max(0,l),o<0)return r;return t-1}#l(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#c(t){return Number(this.#l()%BigInt(t))}#p(){return Number(this.#l()>>11n)/2**53}}function ms(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const bs="#7dd3fc",ys="#fda4af";async function gn(e,t,n,i,o){const r=Ri(i,o),l=await Pt.create(r,t,n),s=new si(e.canvas,e.accent);if(s.setTetherConfig(i.tether??null),i.tether){const c=xt(i,o);s.setTetherPhysics(c.maxSpeed,c.acceleration,c.deceleration)}const a=e.canvas.parentElement;if(a){const c=i.stops.length,p=i.tether?640:Math.max(200,c*16);a.style.setProperty("--shaft-min-h",`${p}px`)}return{strategy:t,sim:l,renderer:s,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function ge(e){e?.sim.dispose(),e?.renderer.dispose()}function wt(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const Ss=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],ws=120;function mn(e,t,n){const i=e.sim.metrics();e.latestMetrics=i;for(const r of Ss){const l=e.metricHistory[r];l.push(i[r]),l.length>ws&&l.shift()}const o=performance.now();for(const[r,l]of e.bubbles)l.expiresAt<=o&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const vs={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},ks=1e3;function _s(e,t,n){const i=performance.now(),o=r=>Ts(n,r);for(const r of t){const l=Cs(r,o);if(l===null)continue;const s=r.elevator;if(s===void 0)continue;const a=vs[r.kind]??ks;e.bubbles.set(s,{text:l,bornAt:i,expiresAt:i+a})}}function Cs(e,t){switch(e.kind){case"elevator-assigned":return`› To ${t(e.stop)}`;case"elevator-repositioning":return`↻ Reposition to ${t(e.stop)}`;case"elevator-arrived":return`● At ${t(e.stop)}`;case"door-opened":return"◌ Doors open";case"rider-boarded":return"+ Boarding";case"rider-exited":return`↓ Off at ${t(e.stop)}`;default:return null}}function Ts(e,t){return e.stops.find(i=>i.entity_id===t)?.name??`stop #${t}`}const Rs={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function bn(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=Rs[t],e.modeEl.title=t)}function Es(){const e=s=>{const a=document.getElementById(s);if(!a)throw new Error(`missing element #${s}`);return a},t=s=>document.getElementById(s),n=(s,a)=>({root:e(`pane-${s}`),canvas:e(`shaft-${s}`),name:e(`name-${s}`),mode:e(`mode-${s}`),desc:e(`desc-${s}`),metrics:e(`metrics-${s}`),trigger:e(`strategy-trigger-${s}`),popover:e(`strategy-popover-${s}`),repoTrigger:e(`repo-trigger-${s}`),repoName:e(`repo-name-${s}`),repoPopover:e(`repo-popover-${s}`),accent:a,which:s}),i=s=>{const a=document.querySelector(`.tweak-row[data-key="${s}"]`);if(!a)throw new Error(`missing tweak row for ${s}`);const c=p=>{const d=a.querySelector(p);if(!d)throw new Error(`missing ${p} in tweak row ${s}`);return d},f=p=>a.querySelector(p);return{root:a,value:c(".tweak-value"),defaultV:c(".tweak-default-v"),dec:c(".tweak-dec"),inc:c(".tweak-inc"),reset:c(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},o={};for(const s of ue)o[s]=i(s);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:o,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",bs),paneB:n("b",ys)};Xi(r);const l=document.getElementById("controls-bar");return l&&new ResizeObserver(([a])=>{if(!a)return;const c=Math.ceil(a.borderBoxSize[0]?.blockSize??a.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${c}px`)}).observe(l),r}function ci(e,t,n,i,o,r,l,s,a){const c=document.createDocumentFragment();for(const f of t){const p=document.createElement("button");p.type="button",p.className="strategy-option",p.setAttribute("role","menuitemradio"),p.setAttribute("aria-checked",f===r?"true":"false"),p.dataset[o]=f;const d=document.createElement("span");d.className="strategy-option-name";const u=document.createElement("span");if(u.className="strategy-option-label",u.textContent=n[f],d.appendChild(u),l&&f===l){const g=document.createElement("span");g.className="strategy-option-sibling",g.textContent=`also in ${s}`,d.appendChild(g)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=i[f],p.append(d,h),p.addEventListener("click",()=>{a(f)}),c.appendChild(p)}e.replaceChildren(c)}function ne(e,t){const n=It[t],i=Gn[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=i}function yn(e,t,n,i,o){ci(e.repoPopover,ji,It,Gn,"reposition",t,n,i,o)}function Se(e,t,n){const{repositionA:i,repositionB:o,compare:r}=e.permalink;yn(t.paneA,i,r?o:null,"B",l=>void wn(e,t,"a",l,n)),yn(t.paneB,o,r?i:null,"A",l=>void wn(e,t,"b",l,n))}function vt(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function di(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function kt(e){vt(e.paneA,!1),vt(e.paneB,!1)}function Je(e){Ct(e),kt(e)}function Sn(e,t,n,i){n.repoTrigger.addEventListener("click",o=>{o.stopPropagation();const r=n.repoPopover.hidden;Je(t),r&&(Se(e,t,i),vt(n,!0))})}async function wn(e,t,n,i,o){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===i){kt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:i},ne(t.paneA,i)):(e.permalink={...e.permalink,repositionB:i},ne(t.paneB,i)),U(e.permalink),Se(e,t,o),kt(t),await o(),H(t.toast,`${n==="a"?"A":"B"} park: ${It[i]}`)}function xs(e){document.addEventListener("click",t=>{if(!pi(e)&&!di(e))return;const n=t.target;if(n instanceof Node){for(const i of[e.paneA,e.paneB])if(i.popover.contains(n)||i.trigger.contains(n)||i.repoPopover.contains(n)||i.repoTrigger.contains(n))return;Je(e)}})}function ie(e,t){const n=Ye[t],i=Nn[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==i&&(e.desc.textContent=i),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=i}function vn(e,t,n,i,o){ci(e.popover,Ui,Ye,Nn,"strategy",t,n,i,o)}function we(e,t,n){const{strategyA:i,strategyB:o,compare:r}=e.permalink;vn(t.paneA,i,r?o:null,"B",l=>void _n(e,t,"a",l,n)),vn(t.paneB,o,r?i:null,"A",l=>void _n(e,t,"b",l,n))}function _t(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function pi(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function Ct(e){_t(e.paneA,!1),_t(e.paneB,!1)}function kn(e,t,n,i){n.trigger.addEventListener("click",o=>{o.stopPropagation();const r=n.popover.hidden;Je(t),r&&(we(e,t,i),_t(n,!0))})}async function _n(e,t,n,i,o){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===i){Ct(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:i},ie(t.paneA,i)):(e.permalink={...e.permalink,strategyB:i},ie(t.paneB,i)),U(e.permalink),we(e,t,o),Ct(t),await o(),H(t.toast,`${n==="a"?"A":"B"}: ${Ye[i]}`)}function Cn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function Is(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function Ze(e,t,n){let i=!1;for(const o of ue){const r=n.tweakRows[o],l=e.tweakRanges[o],s=ee(e,o,t),a=Rt(e,o),c=Et(e,o,s);c&&(i=!0),r.value.textContent=Cn(o,s),r.defaultV.textContent=Cn(o,a),r.dec.disabled=s<=l.min+1e-9,r.inc.disabled=s>=l.max-1e-9,r.root.dataset.overridden=String(c),r.reset.hidden=!c;const f=Math.max(l.max-l.min,1e-9),p=Math.max(0,Math.min(1,(s-l.min)/f)),d=Math.max(0,Math.min(1,(a-l.min)/f));r.trackFill&&(r.trackFill.style.width=`${(p*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(p*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!i}function ui(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function Lt(e,t,n,i){const o=xt(n,e.permalink.overrides),r={maxSpeed:o.maxSpeed,weightCapacityKg:o.weightCapacity,doorOpenTicks:o.doorOpenTicks,doorTransitionTicks:o.doorTransitionTicks},l=[e.paneA,e.paneB].filter(a=>a!==null),s=l.every(a=>a.sim.applyPhysicsLive(r));if(s)for(const a of l)a.renderer?.setTetherPhysics(o.maxSpeed,o.acceleration,o.deceleration);Ze(n,e.permalink.overrides,t),s||i()}function As(e,t,n){return Math.min(n,Math.max(t,e))}function Ms(e,t,n){const i=Math.round((e-t)/n);return t+i*n}function Fe(e,t,n,i,o){const r=N(e.permalink.scenario),l=r.tweakRanges[n],s=ee(r,n,e.permalink.overrides),a=As(s+i*l.step,l.min,l.max),c=Ms(a,l.min,l.step);Fs(e,t,n,c,o)}function Ps(e,t,n,i){const o=N(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},U(e.permalink),n==="cars"?(i(),H(t.toast,"Cars reset")):(Lt(e,t,o,i),H(t.toast,`${Is(n)} reset`))}async function Ls(e,t,n){const i=N(e.permalink.scenario),o=Et(i,"cars",ee(i,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},U(e.permalink),o?await n():Lt(e,t,i,n),H(t.toast,"Parameters reset")}function Fs(e,t,n,i,o){const r=N(e.permalink.scenario),l={...e.permalink.overrides,[n]:i};e.permalink={...e.permalink,overrides:Fn(r,l)},U(e.permalink),n==="cars"?o():Lt(e,t,r,o)}function Bs(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function $s(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function i(){return this instanceof i?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(i){var o=Object.getOwnPropertyDescriptor(e,i);Object.defineProperty(n,i,o.get?o:{enumerable:!0,get:function(){return e[i]}})}),n}var Be={exports:{}},Ds=Be.exports,Tn;function Os(){return Tn||(Tn=1,(function(e){(function(t,n,i){function o(a){var c=this,f=s();c.next=function(){var p=2091639*c.s0+c.c*23283064365386963e-26;return c.s0=c.s1,c.s1=c.s2,c.s2=p-(c.c=p|0)},c.c=1,c.s0=f(" "),c.s1=f(" "),c.s2=f(" "),c.s0-=f(a),c.s0<0&&(c.s0+=1),c.s1-=f(a),c.s1<0&&(c.s1+=1),c.s2-=f(a),c.s2<0&&(c.s2+=1),f=null}function r(a,c){return c.c=a.c,c.s0=a.s0,c.s1=a.s1,c.s2=a.s2,c}function l(a,c){var f=new o(a),p=c&&c.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,p&&(typeof p=="object"&&r(p,f),d.state=function(){return r(f,{})}),d}function s(){var a=4022871197,c=function(f){f=String(f);for(var p=0;p<f.length;p++){a+=f.charCodeAt(p);var d=.02519603282416938*a;a=d>>>0,d-=a,d*=a,a=d>>>0,d-=a,a+=d*4294967296}return(a>>>0)*23283064365386963e-26};return c}n&&n.exports?n.exports=l:this.alea=l})(Ds,e)})(Be)),Be.exports}var $e={exports:{}},qs=$e.exports,Rn;function Ws(){return Rn||(Rn=1,(function(e){(function(t,n,i){function o(s){var a=this,c="";a.x=0,a.y=0,a.z=0,a.w=0,a.next=function(){var p=a.x^a.x<<11;return a.x=a.y,a.y=a.z,a.z=a.w,a.w^=a.w>>>19^p^p>>>8},s===(s|0)?a.x=s:c+=s;for(var f=0;f<c.length+64;f++)a.x^=c.charCodeAt(f)|0,a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a}function l(s,a){var c=new o(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xor128=l})(qs,e)})($e)),$e.exports}var De={exports:{}},Hs=De.exports,En;function Ns(){return En||(En=1,(function(e){(function(t,n,i){function o(s){var a=this,c="";a.next=function(){var p=a.x^a.x>>>2;return a.x=a.y,a.y=a.z,a.z=a.w,a.w=a.v,(a.d=a.d+362437|0)+(a.v=a.v^a.v<<4^(p^p<<1))|0},a.x=0,a.y=0,a.z=0,a.w=0,a.v=0,s===(s|0)?a.x=s:c+=s;for(var f=0;f<c.length+64;f++)a.x^=c.charCodeAt(f)|0,f==c.length&&(a.d=a.x<<10^a.x>>>4),a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a.v=s.v,a.d=s.d,a}function l(s,a){var c=new o(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xorwow=l})(Hs,e)})(De)),De.exports}var Oe={exports:{}},Gs=Oe.exports,xn;function Us(){return xn||(xn=1,(function(e){(function(t,n,i){function o(s){var a=this;a.next=function(){var f=a.x,p=a.i,d,u;return d=f[p],d^=d>>>7,u=d^d<<24,d=f[p+1&7],u^=d^d>>>10,d=f[p+3&7],u^=d^d>>>3,d=f[p+4&7],u^=d^d<<7,d=f[p+7&7],d=d^d<<13,u^=d^d<<9,f[p]=u,a.i=p+1&7,u};function c(f,p){var d,u=[];if(p===(p|0))u[0]=p;else for(p=""+p,d=0;d<p.length;++d)u[d&7]=u[d&7]<<15^p.charCodeAt(d)+u[d+1&7]<<13;for(;u.length<8;)u.push(0);for(d=0;d<8&&u[d]===0;++d);for(d==8?u[7]=-1:u[d],f.x=u,f.i=0,d=256;d>0;--d)f.next()}c(a,s)}function r(s,a){return a.x=s.x.slice(),a.i=s.i,a}function l(s,a){s==null&&(s=+new Date);var c=new o(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(f.x&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xorshift7=l})(Gs,e)})(Oe)),Oe.exports}var qe={exports:{}},js=qe.exports,In;function zs(){return In||(In=1,(function(e){(function(t,n,i){function o(s){var a=this;a.next=function(){var f=a.w,p=a.X,d=a.i,u,h;return a.w=f=f+1640531527|0,h=p[d+34&127],u=p[d=d+1&127],h^=h<<13,u^=u<<17,h^=h>>>15,u^=u>>>12,h=p[d]=h^u,a.i=d,h+(f^f>>>16)|0};function c(f,p){var d,u,h,g,y,w=[],T=128;for(p===(p|0)?(u=p,p=null):(p=p+"\0",u=0,T=Math.max(T,p.length)),h=0,g=-32;g<T;++g)p&&(u^=p.charCodeAt((g+32)%p.length)),g===0&&(y=u),u^=u<<10,u^=u>>>15,u^=u<<4,u^=u>>>13,g>=0&&(y=y+1640531527|0,d=w[g&127]^=u+y,h=d==0?h+1:0);for(h>=128&&(w[(p&&p.length||0)&127]=-1),h=127,g=512;g>0;--g)u=w[h+34&127],d=w[h=h+1&127],u^=u<<13,d^=d<<17,u^=u>>>15,d^=d>>>12,w[h]=u^d;f.w=y,f.X=w,f.i=h}c(a,s)}function r(s,a){return a.i=s.i,a.w=s.w,a.X=s.X.slice(),a}function l(s,a){s==null&&(s=+new Date);var c=new o(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(f.X&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xor4096=l})(js,e)})(qe)),qe.exports}var We={exports:{}},Vs=We.exports,An;function Xs(){return An||(An=1,(function(e){(function(t,n,i){function o(s){var a=this,c="";a.next=function(){var p=a.b,d=a.c,u=a.d,h=a.a;return p=p<<25^p>>>7^d,d=d-u|0,u=u<<24^u>>>8^h,h=h-p|0,a.b=p=p<<20^p>>>12^d,a.c=d=d-u|0,a.d=u<<16^d>>>16^h,a.a=h-p|0},a.a=0,a.b=0,a.c=-1640531527,a.d=1367130551,s===Math.floor(s)?(a.a=s/4294967296|0,a.b=s|0):c+=s;for(var f=0;f<c.length+20;f++)a.b^=c.charCodeAt(f)|0,a.next()}function r(s,a){return a.a=s.a,a.b=s.b,a.c=s.c,a.d=s.d,a}function l(s,a){var c=new o(s),f=a&&a.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.tychei=l})(Vs,e)})(We)),We.exports}var He={exports:{}};const Ys={},Ks=Object.freeze(Object.defineProperty({__proto__:null,default:Ys},Symbol.toStringTag,{value:"Module"})),Qs=$s(Ks);var Js=He.exports,Mn;function Zs(){return Mn||(Mn=1,(function(e){(function(t,n,i){var o=256,r=6,l=52,s="random",a=i.pow(o,r),c=i.pow(2,l),f=c*2,p=o-1,d;function u(b,m,v){var S=[];m=m==!0?{entropy:!0}:m||{};var R=w(y(m.entropy?[b,E(n)]:b??T(),3),S),k=new h(S),I=function(){for(var C=k.g(r),A=a,x=0;C<c;)C=(C+x)*o,A*=o,x=k.g(1);for(;C>=f;)C/=2,A/=2,x>>>=1;return(C+x)/A};return I.int32=function(){return k.g(4)|0},I.quick=function(){return k.g(4)/4294967296},I.double=I,w(E(k.S),n),(m.pass||v||function(C,A,x,M){return M&&(M.S&&g(M,k),C.state=function(){return g(k,{})}),x?(i[s]=C,A):C})(I,R,"global"in m?m.global:this==i,m.state)}function h(b){var m,v=b.length,S=this,R=0,k=S.i=S.j=0,I=S.S=[];for(v||(b=[v++]);R<o;)I[R]=R++;for(R=0;R<o;R++)I[R]=I[k=p&k+b[R%v]+(m=I[R])],I[k]=m;(S.g=function(C){for(var A,x=0,M=S.i,F=S.j,B=S.S;C--;)A=B[M=p&M+1],x=x*o+B[p&(B[M]=B[F=p&F+A])+(B[F]=A)];return S.i=M,S.j=F,x})(o)}function g(b,m){return m.i=b.i,m.j=b.j,m.S=b.S.slice(),m}function y(b,m){var v=[],S=typeof b,R;if(m&&S=="object")for(R in b)try{v.push(y(b[R],m-1))}catch{}return v.length?v:S=="string"?b:b+"\0"}function w(b,m){for(var v=b+"",S,R=0;R<v.length;)m[p&R]=p&(S^=m[p&R]*19)+v.charCodeAt(R++);return E(m)}function T(){try{var b;return d&&(b=d.randomBytes)?b=b(o):(b=new Uint8Array(o),(t.crypto||t.msCrypto).getRandomValues(b)),E(b)}catch{var m=t.navigator,v=m&&m.plugins;return[+new Date,t,v,t.screen,E(n)]}}function E(b){return String.fromCharCode.apply(0,b)}if(w(i.random(),n),e.exports){e.exports=u;try{d=Qs}catch{}}else i["seed"+s]=u})(typeof self<"u"?self:Js,[],Math)})(He)),He.exports}var ht,Pn;function ea(){if(Pn)return ht;Pn=1;var e=Os(),t=Ws(),n=Ns(),i=Us(),o=zs(),r=Xs(),l=Zs();return l.alea=e,l.xor128=t,l.xorwow=n,l.xorshift7=i,l.xor4096=o,l.tychei=r,ht=l,ht}var ta=ea();const na=Bs(ta),Xe=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],gt=Xe.reduce((e,t)=>t.length<e.length?t:e).length,mt=Xe.reduce((e,t)=>t.length>e.length?t:e).length;function ia(e){const t=e?.seed?new na(e.seed):null,{minLength:n,maxLength:i,...o}=e||{};function r(){let u=typeof n!="number"?gt:s(n);const h=typeof i!="number"?mt:s(i);u>h&&(u=h);let g=!1,y;for(;!g;)y=l(),g=y.length<=h&&y.length>=u;return y}function l(){return Xe[a(Xe.length)]}function s(u){return u<gt&&(u=gt),u>mt&&(u=mt),u}function a(u){const h=t?t():Math.random();return Math.floor(h*u)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(o).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=u=>u),typeof e.separator!="string"&&(e.separator=" ");const c=e.min+a(e.max+1-e.min);let f=[],p="",d=0;for(let u=0;u<c*e.wordsPerString;u++)d===e.wordsPerString-1?p+=e.formatter(r(),d):p+=e.formatter(r(),d)+e.separator,d++,(u+1)%e.wordsPerString===0&&(f.push(p),p="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const fi=e=>`${e}×`,hi=e=>`${e.toFixed(1)}×`;function gi(){const e=ia({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function oa(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=fi(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=hi(e.intensity),ie(t.paneA,e.strategyA),ie(t.paneB,e.strategyB),ne(t.paneA,e.repositionA),ne(t.paneB,e.repositionB),Un(t,e.scenario);const n=N(e.scenario);Object.keys(e.overrides).length>0&&ui(t,!0),Ze(n,e.overrides,t)}function ve(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function mi(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const i=t.phaseLabel;if(!i)return;const o=n&&e.traffic.currentPhaseLabel()||"—";i.textContent!==o&&(i.textContent=o)}function bi(e,t){if(!t.phaseProgress)return;const i=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==i&&(t.phaseProgress.style.width=i)}function ra(e){if(e.length<2)return"M 0 13 L 100 13";let t=e[0]??0,n=e[0]??0;for(let l=1;l<e.length;l++){const s=e[l];s!==void 0&&(s<t&&(t=s),s>n&&(n=s))}const i=n-t,o=e.length;let r="";for(let l=0;l<o;l++){const s=l/(o-1)*100,a=i>0?13-((e[l]??0)-t)/i*12:7;r+=`${l===0?"M":"L"} ${s.toFixed(2)} ${a.toFixed(2)} `}return r.trim()}const Tt=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function sa(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function aa(e,t){const n=(u,h,g,y)=>Math.abs(u-h)<g?["tie","tie"]:(y?u>h:u<h)?["win","lose"]:["lose","win"],[i,o]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,l]=n(e.max_wait_s,t.max_wait_s,.05,!1),[s,a]=n(e.delivered,t.delivered,.5,!0),[c,f]=n(e.abandoned,t.abandoned,.5,!1),[p,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:i,max_wait_s:r,delivered:s,abandoned:c,utilization:p},b:{avg_wait_s:o,max_wait_s:l,delivered:a,abandoned:f,utilization:d}}}function Ln(e){const t=document.createDocumentFragment();for(const[n]of Tt){const i=pe("div","metric-row flex flex-col gap-[3px] px-2.5 py-[7px] bg-surface-elevated border border-stroke-subtle rounded-md transition-colors duration-normal"),o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.classList.add("metric-spark"),o.setAttribute("viewBox","0 0 100 14"),o.setAttribute("preserveAspectRatio","none"),o.appendChild(document.createElementNS("http://www.w3.org/2000/svg","path")),i.append(pe("span","text-[9.5px] uppercase tracking-[0.08em] text-content-disabled font-medium",n),pe("span","metric-v text-[15px] text-content font-medium [font-feature-settings:'tnum'_1]"),o),t.appendChild(i)}e.replaceChildren(t)}function bt(e,t,n,i){const o=e.children;for(let r=0;r<Tt.length;r++){const l=o[r];if(!l)continue;const s=Tt[r];if(!s)continue;const a=s[1],c=n?n[a]:"";l.dataset.verdict!==c&&(l.dataset.verdict=c);const f=l.children[1],p=sa(t,a);f.textContent!==p&&(f.textContent=p);const u=l.children[2].firstElementChild,h=ra(i[a]);u.getAttribute("d")!==h&&u.setAttribute("d",h)}}const la=200;function yi(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function Z(e,t){const n=++e.initToken;t.loader.classList.add("show");const i=N(e.permalink.scenario);e.traffic=new li(Hn(e.permalink.seed)),yi(e,i),ge(e.paneA),ge(e.paneB),e.paneA=null,e.paneB=null;try{const o=await gn(t.paneA,e.permalink.strategyA,e.permalink.repositionA,i,e.permalink.overrides);ie(t.paneA,e.permalink.strategyA),ne(t.paneA,e.permalink.repositionA),Ln(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await gn(t.paneB,e.permalink.strategyB,e.permalink.repositionB,i,e.permalink.overrides),ie(t.paneB,e.permalink.strategyB),ne(t.paneB,e.permalink.repositionB),Ln(t.paneB.metrics)}catch(l){throw ge(o),l}if(n!==e.initToken){ge(o),ge(r);return}e.paneA=o,e.paneB=r,e.seeding=i.seedSpawns>0?{remaining:i.seedSpawns}:null,mi(e,t),bi(e,t),Ze(i,e.permalink.overrides,t)}catch(o){throw n===e.initToken&&H(t.toast,`Init failed: ${o.message}`),o}finally{n===e.initToken&&t.loader.classList.remove("show")}}function ca(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let i=0;i<la&&e.seeding.remaining>0;i++){const o=e.traffic.drainSpawns(t,n);for(const r of o)if(wt(e,l=>{const s=l.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);s.kind==="err"&&console.warn(`spawnRider failed (seed): ${s.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(yi(e,N(e.permalink.scenario)),e.seeding=null)}function da(e,t){const n=()=>Z(e,t),i={renderPaneStrategyInfo:ie,renderPaneRepositionInfo:ne,refreshStrategyPopovers:()=>{we(e,t,n),Se(e,t,n)},renderTweakPanel:()=>{const r=N(e.permalink.scenario);Ze(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const l=r.target;if(!(l instanceof HTMLElement))return;const s=l.closest(".scenario-card");if(!s)return;const a=s.dataset.scenarioId;!a||a===e.permalink.scenario||jn(e,t,a,n,i)}),kn(e,t,t.paneA,n),kn(e,t,t.paneB,n),Sn(e,t,t.paneA,n),Sn(e,t,t.paneB,n),we(e,t,n),Se(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},U(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",we(e,t,n),Se(e,t,n),Z(e,t).then(()=>{H(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||q.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},U(e.permalink),Z(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=gi();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},U(e.permalink),Z(e,t).then(()=>{H(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=fi(r)}),t.speedInput.addEventListener("change",()=>{U(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=hi(r)}),t.intensityInput.addEventListener("change",()=>{U(e.permalink)});const o=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};o(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,o()}),t.resetBtn.addEventListener("click",()=>{Z(e,t),H(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";ui(t,r)});for(const r of ue){const l=t.tweakRows[r];zt(l.dec,()=>{Fe(e,t,r,-1,n)}),zt(l.inc,()=>{Fe(e,t,r,1,n)}),l.reset.addEventListener("click",()=>{Ps(e,t,r,n)}),l.root.addEventListener("keydown",s=>{s.key==="ArrowUp"||s.key==="ArrowRight"?(s.preventDefault(),Fe(e,t,r,1,n)):(s.key==="ArrowDown"||s.key==="ArrowLeft")&&(s.preventDefault(),Fe(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{Ls(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=Wn(e.permalink),l=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(l).then(()=>{H(t.toast,"Permalink copied")},()=>{H(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{ve(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{ve(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&ve(t,!1)}),pa(e,t,i),xs(t)}function pa(e,t,n){window.addEventListener("keydown",i=>{if(e.permalink.mode==="quest")return;if(i.target instanceof HTMLElement){const r=i.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||i.target.isContentEditable||i.target.closest(".monaco-editor"))return}if(i.metaKey||i.ctrlKey||i.altKey)return;switch(i.key){case" ":{i.preventDefault(),t.playBtn.click();return}case"r":case"R":{i.preventDefault(),t.resetBtn.click();return}case"c":case"C":{i.preventDefault(),t.compareToggle.click();return}case"s":case"S":{i.preventDefault(),t.shareBtn.click();return}case"t":case"T":{i.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{i.preventDefault(),ve(t,t.shortcutSheet.hidden);return}case"Escape":{if(pi(t)||di(t)){i.preventDefault(),Je(t);return}t.shortcutSheet.hidden||(i.preventDefault(),ve(t,!1));return}}const o=Number(i.key);if(Number.isInteger(o)&&o>=1&&o<=_e.length){const r=_e[o-1];if(!r)return;r.id!==e.permalink.scenario&&(i.preventDefault(),jn(e,t,r.id,()=>Z(e,t),n))}})}function ua(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const i=aa(t.latestMetrics,n.latestMetrics);bt(t.metricsEl,t.latestMetrics,i.a,t.metricHistory),bt(n.metricsEl,n.latestMetrics,i.b,n.metricHistory)}else bt(t.metricsEl,t.latestMetrics,null,t.metricHistory);bn(t),n&&bn(n)}function fa(e,t){let n=0;const i=()=>{const o=performance.now(),r=(o-e.lastFrameTime)/1e3;e.lastFrameTime=o;const l=e.paneA,s=e.paneB,a=l!==null&&(!e.permalink.compare||s!==null);if(e.running&&e.ready&&a){const c=e.permalink.speed;wt(e,g=>{g.sim.step(c);const y=g.sim.drainEvents();if(y.length>0){const w=g.sim.snapshot();_s(g,y,w);const T=new Map;for(const E of w.cars)T.set(E.id,E.line);for(const E of y)if(E.kind==="elevator-assigned"){const b=T.get(E.elevator);b!==void 0&&g.renderer.pushAssignment(E.stop,E.elevator,b)}}}),e.seeding&&ca(e);const f=l.sim.snapshot(),d=Math.min(r,4/60)*c,u=e.seeding?[]:e.traffic.drainSpawns(f,d);for(const g of u)wt(e,y=>{const w=y.sim.spawnRider(g.originStopId,g.destStopId,g.weight,g.patienceTicks);w.kind==="err"&&console.warn(`spawnRider failed: ${w.error}`)});const h=e.permalink.speed;mn(l,l.sim.snapshot(),h),s&&mn(s,s.sim.snapshot(),h),ua(e),(n+=1)%4===0&&(mi(e,t),bi(e,t))}requestAnimationFrame(i)};requestAnimationFrame(i)}async function ha(){ai().catch(()=>{});const t=Es(),n=new URLSearchParams(window.location.search).has("k"),i={...q,...Ni(window.location.search)};if(!n){i.seed=gi();const s=new URL(window.location.href);s.searchParams.set("k",i.seed),window.history.replaceState(null,"",s.toString())}Yi(i);const o=N(i.scenario),r=new URLSearchParams(window.location.search);o.defaultReposition!==void 0&&(r.has("pa")||(i.repositionA=o.defaultReposition),r.has("pb")||(i.repositionB=o.defaultReposition)),i.overrides=Fn(o,i.overrides),Ji(i.mode),Zi(i.mode),oa(i,t);const l={running:!0,ready:!1,permalink:i,paneA:null,paneB:null,traffic:new li(Hn(i.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(da(l,t),await Z(l,t),l.ready=!0,fa(l,t),l.permalink.mode==="quest"){const s=new URLSearchParams(window.location.search).has("qs");await gs({initialStageId:l.permalink.questStage,landOn:s?"stage":"grid",onStageChange:a=>{l.permalink.questStage=a;const c=new URL(window.location.href);a===q.questStage?c.searchParams.delete("qs"):c.searchParams.set("qs",a),window.history.replaceState(null,"",c.toString())},onBackToGrid:()=>{const a=new URL(window.location.href);a.searchParams.delete("qs"),window.history.replaceState(null,"",a.toString())}})}}ha();export{Ue as _};
