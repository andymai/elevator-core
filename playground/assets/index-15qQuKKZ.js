const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-Cs6FAX8R.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const l of r.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&o(l)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function le(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let Bt=0;function D(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(Bt),Bt=window.setTimeout(()=>{e.classList.remove("show")},1600)}function Lt(e,t){let i=0,r=0;const l=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",a=>{e.disabled||(a.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){l();return}t()},70)},380))}),e.addEventListener("pointerup",l),e.addEventListener("pointerleave",l),e.addEventListener("pointercancel",l),e.addEventListener("blur",l),e.addEventListener("click",a=>{a.pointerType||t()})}function J(e,t,n){const o=ht(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return yn(i,r.min,r.max)}function ht(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return mn(n.doorOpenTicks,n.doorTransitionTicks)}}function gt(e,t,n){const o=ht(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function gn(e,t){const n={};for(const o of ce){const i=t[o];i!==void 0&&gt(e,o,i)&&(n[o]=i)}return n}const ce=["cars","maxSpeed","weightCapacity","doorCycleSec"];function Jn(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=mn(n,o),r=yn(n/(i*Oe),.1,.9),l=Math.max(2,Math.round(t*Oe)),a=Math.max(1,Math.round(l*r)),s=Math.max(1,Math.round((l-a)/2));return{openTicks:a,transitionTicks:s}}function mn(e,t){return(e+2*t)/Oe}function mt(e,t){const n=e.elevatorDefaults,o=J(e,"maxSpeed",t),i=J(e,"weightCapacity",t),r=J(e,"doorCycleSec",t),{openTicks:l,transitionTicks:a}=Jn(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:l,doorTransitionTicks:a}}function Zn(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function eo(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(J(e,"cars",t)),i=mt(e,t),r=Zn(e.stops.length,o),l=e.stops.map((s,c)=>`        StopConfig(id: StopId(${c}), name: ${at(s.name)}, position: ${z(s.positionM)}),`).join(`
`),a=r.map((s,c)=>no(c,i,s,to(c,o))).join(`
`);return`SimConfig(
    building: BuildingConfig(
        name: ${at(e.buildingName)},
        stops: [
${l}
        ],
    ),
    elevators: [
${a}
    ],
    simulation: SimulationParams(ticks_per_second: ${z(Oe)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${z(e.passengerWeightRange[0])}, ${z(e.passengerWeightRange[1])}),
    ),
)`}const Oe=60;function yn(e,t,n){return Math.min(n,Math.max(t,e))}function to(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function no(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${z(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${z(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${at(o)},
            max_speed: ${z(t.maxSpeed)}, acceleration: ${z(t.acceleration)}, deceleration: ${z(t.deceleration)},
            weight_capacity: ${z(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function at(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function z(e){return Number.isInteger(e)?`${e}.0`:String(e)}const bn={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function Ee(e){return Array.from({length:e},()=>1)}const ie=5,oo=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:ie},(e,t)=>t===ie-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:Ee(ie),destWeights:Ee(ie)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:Ee(ie),destWeights:Ee(ie)}],io={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:oo,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...bn,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},We=19,st=16,we=4,wn=(1+We)*we,ue=1,he=41,ge=42,ro=43;function G(e){return Array.from({length:ro},(t,n)=>e(n))}const re=e=>e===ue||e===he||e===ge,ao=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:G(e=>e===0?20:e===ue?2:e===he?1.2:e===ge?.2:.1),destWeights:G(e=>e===0?0:e===ue?.3:e===he?.4:e===ge?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:G(e=>re(e)?.5:1),destWeights:G(e=>re(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:G(e=>e===21?4:re(e)?.25:1),destWeights:G(e=>e===21?5:re(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:G(e=>e===0||e===ue||e===21?.3:e===he?.4:e===ge?1.2:1),destWeights:G(e=>e===0?20:e===ue?1:e===he?.6:e===ge?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:G(e=>re(e)?1.5:.2),destWeights:G(e=>re(e)?1.5:.2)}];function so(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let a=1;a<=We;a++){const s=1+a,c=a*we;e.push(`        StopConfig(id: StopId(${s.toString().padStart(2," ")}), name: "Floor ${a}",    position: ${c.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${wn.toFixed(1)}),`);for(let a=21;a<=20+st;a++){const s=1+a,c=a*we;e.push(`        StopConfig(id: StopId(${s}), name: "Floor ${a}",   position: ${c.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:We},(a,s)=>2+s),21],n=[21,...Array.from({length:st},(a,s)=>22+s)],o=[1,21,38,39,40],i=[1,0,41,42],r=a=>a.map(s=>`StopId(${s})`).join(", "),l=(a,s,c,u)=>`                ElevatorConfig(
                    id: ${a}, name: "${s}",
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
)`}const lo=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:We},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*we})),{name:"Sky Lobby",positionM:wn},...Array.from({length:st},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*we})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],co={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:ao,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:lo,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...bn,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:so()},$t=1e5,Ot=4e5,Wt=35786e3,po=1e8,fo=4;function Me(e){return Array.from({length:fo},(t,n)=>e(n))}const uo={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:Me(e=>e===0?6:1),destWeights:Me(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:Me(e=>e===0?0:e===1?1:e===2?3:5),destWeights:Me(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:$t},{name:"LEO Transfer",positionM:Ot},{name:"GEO Platform",positionM:Wt}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:po,showDayNight:!1},ron:`SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${$t.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${Ot.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${Wt.toFixed(1)}),
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
)`},Se=[co,uo,io];function N(e){const t=Se.find(o=>o.id===e);if(t)return t;const n=Se[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const Sn={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},$={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},ho=["scan","look","nearest","etd","destination","rsr"],go=["adaptive","predictive","lobby","spread","none"];function Dt(e,t){return e!==null&&ho.includes(e)?e:t}function Nt(e,t){return e!==null&&go.includes(e)?e:t}function H(e){const t=vn(e);window.location.search!==t&&window.history.replaceState(null,"",t)}function mo(e,t){return e==="compare"||e==="quest"?e:t}function vn(e){const t=new URLSearchParams;e.mode!==$.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==$.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=N(e.scenario).defaultReposition,o=n??$.repositionA,i=n??$.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of ce){const l=e.overrides[r];l!==void 0&&Number.isFinite(l)&&t.set(Sn[r],bo(l))}return`?${t.toString()}`}function yo(e){const t=new URLSearchParams(e),n={};for(const o of ce){const i=t.get(Sn[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:mo(t.get("m"),$.mode),questStage:(t.get("qs")??"").trim()||$.questStage,scenario:t.get("s")??$.scenario,strategyA:Dt(t.get("a")??t.get("d"),$.strategyA),strategyB:Dt(t.get("b"),$.strategyB),repositionA:Nt(t.get("pa"),$.repositionA),repositionB:Nt(t.get("pb"),$.repositionB),compare:t.has("c")?t.get("c")==="1":$.compare,seed:(t.get("k")??"").trim()||$.seed,intensity:qt(t.get("i"),$.intensity),speed:qt(t.get("x"),$.speed),overrides:n}}function qt(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function bo(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function kn(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const wo=["scan","look","nearest","etd","destination","rsr"],Ge={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},_n={scan:"Sweeps end-to-end like a disk head — simple, predictable, ignores who's waiting longest.",look:"Like SCAN but reverses early when nothing's queued further — a practical baseline.",nearest:"Grabs whichever call is closest right now. Fast under light load, thrashes under rush.",etd:"Estimated time of dispatch — assigns calls to whichever car can finish fastest.",destination:"Destination-control: riders pick their floor at the lobby; the group optimises assignments.",rsr:"Relative System Response — a wait-aware variant of ETD that penalises long queues."},So=["adaptive","predictive","lobby","spread","none"],yt={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},Cn={adaptive:"Switches based on traffic — returns to lobby during up-peak, predicts hot floors otherwise. The default.",predictive:"Always parks idle cars near whichever floor has seen the most recent arrivals.",lobby:"Sends every idle car back to the ground floor to prime the morning-rush pickup.",spread:"Keeps idle cars fanned out across the shaft so any floor has a nearby option.",none:"Leaves idle cars wherever they finished their last delivery."},vo="scenario-card inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated border border-stroke-subtle rounded-md text-content-secondary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:bg-surface-hover hover:border-stroke aria-pressed:bg-accent-muted aria-pressed:text-content aria-pressed:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] max-md:flex-none max-md:snap-start",ko="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function _o(e){const t=document.createDocumentFragment();Se.forEach((n,o)=>{const i=le("button",vo);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(le("span","",n.label),le("span",ko,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function Tn(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}async function In(e,t,n,o,i){const r=N(n),l=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,a=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:l,repositionA:a,overrides:{}},H(e.permalink),i.renderPaneStrategyInfo(t.paneA,l),i.renderPaneRepositionInfo(t.paneA,a),i.refreshStrategyPopovers(),Tn(t,r.id),await o(),i.renderTweakPanel(),D(t.toast,`${r.label} · ${Ge[l]}`)}function Co(e){const t=N(e.scenario);e.scenario=t.id}const To="modulepreload",Io=function(e,t){return new URL(e,t).href},Ht={},De=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let l=function(u){return Promise.all(u.map(p=>Promise.resolve(p).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const a=document.getElementsByTagName("link"),s=document.querySelector("meta[property=csp-nonce]"),c=s?.nonce||s?.getAttribute("nonce");i=l(n.map(u=>{if(u=Io(u,o),u in Ht)return;Ht[u]=!0;const p=u.endsWith(".css"),d=p?'[rel="stylesheet"]':"";if(!!o)for(let m=a.length-1;m>=0;m--){const b=a[m];if(b.href===u&&(!p||b.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${d}`))return;const h=document.createElement("link");if(h.rel=p?"stylesheet":To,p||(h.as="script"),h.crossOrigin="",h.href=u,c&&h.setAttribute("nonce",c),document.head.appendChild(h),p)return new Promise((m,b)=>{h.addEventListener("load",m),h.addEventListener("error",()=>b(new Error(`Unable to preload CSS for ${u}`)))})}))}function r(l){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=l,window.dispatchEvent(a),!a.defaultPrevented)throw l}return i.then(l=>{for(const a of l||[])a.status==="rejected"&&r(a.reason);return t().catch(r)})};async function Eo(e){const t=(await De(async()=>{const{default:i}=await import("./worker-DJDBInJ4.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new Mo(n);return await o.init(e),o}class Mo{#e;#t=new Map;#n=1;#i=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#l),this.#e.addEventListener("error",this.#o),this.#e.addEventListener("messageerror",this.#o)}async init(t){await this.#s({kind:"init",id:this.#a(),payload:this.#d(t)})}async tick(t){return this.#s({kind:"tick",id:this.#a(),ticks:t})}async spawnRider(t,n,o,i){return this.#s({kind:"spawn-rider",id:this.#a(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#s({kind:"set-strategy",id:this.#a(),strategy:t})}async loadController(t,n){const o=this.#s({kind:"load-controller",id:this.#a(),source:t});if(n===void 0){await o;return}o.catch(()=>{});let i;const r=new Promise((l,a)=>{i=setTimeout(()=>{a(new Error(`controller did not return within ${n}ms`))},n)});try{await Promise.race([o,r])}finally{i!==void 0&&clearTimeout(i)}}async reset(t){await this.#s({kind:"reset",id:this.#a(),payload:this.#d(t)})}dispose(){this.#i||(this.#i=!0,this.#e.removeEventListener("message",this.#l),this.#e.removeEventListener("error",this.#o),this.#e.removeEventListener("messageerror",this.#o),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#a(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#s(t){if(this.#i)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#t.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#o=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#i=!0,this.#e.terminate(),this.#r(new Error(o))};#l=t=>{const n=t.data,o=this.#t.get(n.id);if(o)switch(this.#t.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":o.reject(new Error(n.message));return}}}let Qe=null,ae=null;async function Ao(){return Qe||ae||(ae=(async()=>{await Ro();const e=await De(()=>import("./editor.main-Cs6FAX8R.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return Qe=e,e})(),ae.catch(()=>{ae=null}),ae)}async function Ro(){const[{default:e},{default:t}]=await Promise.all([De(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),De(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}async function xo(e){const n=(await Ao()).editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"vs-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o(n.getValue())});return{dispose:()=>{i.dispose()}}},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const Po=`SimConfig(
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
)`,Fo={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",configRon:Po,unlockedApi:["pushDestination"],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
//
// Five riders at the lobby want to go up to Floor 2 or Floor 3.
// Use \`sim.pushDestination(carId, stopId)\` to send the car after them.
//
// Stop ids: 0 (Lobby), 1 (Floor 2), 2 (Floor 3).

// Send the car to Floor 3 first:
sim.pushDestination(0n, 2n);
`,hints:["`sim.pushDestination(carId, stopId)` queues a destination. Both ids are bigints — pass them with the `n` suffix.","There's only one car (id 0n). Queue it to visit each floor riders are waiting for.","Pass: deliver all five riders. 3★: do it before tick 400 — back-to-back destinations beat one-at-a-time."]},Bo=`SimConfig(
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
)`,Lo={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",configRon:Bo,unlockedApi:["pushDestination","hallCalls","drainEvents"],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`,hints:["`sim.hallCalls()` returns objects with at least `{ stop, direction }`. Iterate them and dispatch the car.","Calls accumulate over time. Riders keep arriving at the configured Poisson rate, so polling `sim.hallCalls()` once per evaluation is enough; you don't need to react instantly.","3★ requires beating the nearest-car baseline. Try queuing destinations in directional order so the car doesn't bounce."]},$o=`SimConfig(
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
)`,Oo={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",configRon:$o,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`,hints:["`sim.carCalls(carId)` returns an array of stop ids the riders inside that car have pressed.","Combine hall calls (riders waiting outside) and car calls (riders inside) into a single dispatch sweep — bouncing back and forth burns time.","3★ requires sub-30s max wait. Look at events with `sim.drainEvents()` to react the moment a call lands instead of polling stale state."]},Wo=`SimConfig(
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
)`,Do={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",configRon:Wo,unlockedApi:["setStrategy"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
//
// elevator-core ships built-in dispatch strategies: scan, look,
// nearest, etd, destination, rsr. Try them out:
//
//   sim.setStrategy("look");
//
// returns true on success, false if the name isn't a built-in.
// The default for this stage is SCAN — see if you can beat it.

sim.setStrategy("look");
`,hints:["`scan` sweeps end-to-end; `look` stops at the last request and reverses; `nearest` picks the closest idle car; `etd` minimises estimated time-to-destination.","Look at `metrics.avg_wait_s` to judge: lower is better. Try each strategy in turn — the deltas are small but visible.","3★ requires sub-18s average wait. ETD typically wins on heavy traffic; LOOK is competitive at lower spawn rates."]},No=`SimConfig(
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
)`,qo={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",configRon:No,unlockedApi:["setStrategy"],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."]},Ho=`SimConfig(
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
)`,Go=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,zo={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",configRon:Ho,unlockedApi:["setStrategyJs"],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:Go,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."]},Uo=`SimConfig(
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
)`,jo={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",configRon:Uo,unlockedApi:["setStrategyJs"],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."]},Xo=`SimConfig(
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
)`,Yo=`// Stage 8 — Event-Driven
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
`,Vo={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",configRon:Xo,unlockedApi:["setStrategyJs","drainEvents"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:Yo,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."]},Ko=`SimConfig(
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
)`,Qo=`// Stage 9 — Take the Wheel
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
`,Jo={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",configRon:Ko,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:Qo,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.']},Zo=`SimConfig(
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
)`,ei=`// Stage 10 — Patient Boarding
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
`,ti={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",configRon:Zo,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:ei,hints:["`holdDoor(carRef)` keeps doors open indefinitely until you call `cancelDoorHold(carRef)`. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."]},ni=`SimConfig(
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
)`,oi=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,ii={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",configRon:ni,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:oi,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."]},ri=`SimConfig(
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
)`,ai=`// Stage 12 — Routes
//
// Riders have explicit routes between origin and destination. The
// controller can inspect them with shortestRoute(originStop,
// destinationStop) and reroute(rider, newRoute) when needed.
//
// Most stages don't need this directly — riders are auto-routed at
// spawn. But understanding routes is the foundation for the
// multi-line topology stages later.

sim.setStrategy("etd");
`,si={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",configRon:ri,unlockedApi:["setStrategy","shortestRoute","reroute"],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:ai,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newRoute)` replaces a rider's route — useful when a stop on their route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."]},bt=[Fo,Lo,Oo,Do,qo,zo,jo,Vo,Jo,ti,ii,si];function li(e){return bt.find(t=>t.id===e)}async function ci(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await Eo({configRon:e.configRon,strategy:"scan"});try{n.timeoutMs!==void 0?await r.loadController(t,n.timeoutMs):await r.loadController(t);let l=null,a=0;for(;a<o;){const s=o-a,c=Math.min(i,s),u=await r.tick(c);l=u.metrics,a=u.tick;const p=Gt(l,a);if(e.passFn(p))return zt(e,p)}if(l===null)throw new Error("runStage: maxTicks must be positive");return zt(e,Gt(l,a))}finally{r.dispose()}}function Gt(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function zt(e,t){if(!e.passFn(t))return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}function di(){const e=document.getElementById("quest-pane");if(!e)throw new Error("quest-pane: missing #quest-pane");const t=document.getElementById("quest-stage-title"),n=document.getElementById("quest-stage-brief"),o=document.getElementById("quest-stage-select"),i=document.getElementById("quest-editor"),r=document.getElementById("quest-run"),l=document.getElementById("quest-result");if(!t||!n||!o||!i||!r||!l)throw new Error("quest-pane: missing stage banner elements");return{root:e,title:t,brief:n,select:o,editorHost:i,runBtn:r,result:l}}function Ut(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief,e.select.value!==t.id&&(e.select.value=t.id)}function pi(e){for(;e.select.firstChild;)e.select.removeChild(e.select.firstChild);bt.forEach((t,n)=>{const o=document.createElement("option");o.value=t.id,o.textContent=`${String(n+1).padStart(2,"0")} · ${t.title}`,e.select.appendChild(o)})}function fi(e){const t=document.getElementById("layout");t&&t.classList.add("hidden"),e.root.classList.remove("hidden"),e.root.classList.add("flex")}function ui(e,t,n){e.runBtn.addEventListener("click",()=>{hi(e,t,n())})}async function hi(e,t,n){e.runBtn.disabled=!0,e.result.textContent="Running…";try{const o=await ci(n,t.getValue(),{timeoutMs:1e3});if(o.passed){const i="★".repeat(o.stars)+"☆".repeat(3-o.stars);e.result.textContent=`Passed — ${i} (${o.grade.delivered} delivered, tick ${o.grade.endTick})`}else e.result.textContent=`Did not pass — ${o.grade.delivered} delivered, ${o.grade.abandoned} abandoned`}catch(o){const i=o instanceof Error?o.message:String(o);e.result.textContent=`Error: ${i}`}finally{e.runBtn.disabled=!1}}async function gi(e){const t=di();pi(t);const n=r=>{const l=li(r);if(l)return l;const a=bt[0];if(!a)throw new Error("quest-pane: stage registry is empty");return a};let o=n(e.initialStageId);Ut(t,o),fi(t),t.runBtn.disabled=!0,t.result.textContent="Loading editor…";const i=await xo({container:t.editorHost,initialValue:o.starterCode,language:"typescript"});return t.runBtn.disabled=!1,t.result.textContent="",ui(t,i,()=>o),t.select.addEventListener("change",()=>{const r=n(t.select.value);o=r,Ut(t,r),i.setValue(r.starterCode),t.result.textContent="",e.onStageChange?.(r.id)}),{handles:t,editor:i}}let Je=null;async function En(){if(!Je){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;Je=import(e).then(async n=>(await n.default(t),n))}return Je}class wt{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,o){const i=await En();return new wt(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class Mn{#e;#t=0;#n=[];#i=0;#r=0;#a=1;#d=0;constructor(t){this.#e=mi(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#i=t.reduce((n,o)=>n+o.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#a=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const o=t.stops.filter(a=>a.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#a/60*i,this.#r=(this.#r+i)%(this.#i||1);const l=[];for(;this.#t>=1;)this.#t-=1,l.push(this.#s(o,r));return l}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,o]of this.#n.entries())if(t-=o.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#i<=0?0:Math.min(1,this.#r/this.#i)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#n}#s(t,n){const o=this.#o(t.length,n.originWeights);let i=this.#o(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],l=t[i];if(!r||!l)throw new Error("stop index out of bounds");const a=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:l.stop_id,weight:a,...this.#d>0?{patienceTicks:this.#d}:{}}}#o(t,n){if(!n||n.length!==t)return this.#c(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#c(t);let i=this.#p()*o;for(const[r,l]of n.entries())if(i-=Math.max(0,l),i<0)return r;return t-1}#l(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#c(t){return Number(this.#l()%BigInt(t))}#p(){return Number(this.#l()>>11n)/2**53}}function mi(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}function Ne(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,l=o&255,a=s=>t>=0?Math.round(s+(255-s)*t):Math.round(s*(1+t));return`rgb(${a(i)}, ${a(r)}, ${a(l)})`}function St(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,l=o&255;return`rgba(${i}, ${r}, ${l}, ${t})`}function An(e,t){if(/^#[0-9a-f]{6}$/i.test(e)){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return St(e,t)}function yi(e,t,n,o,i){const r=(e+n)/2,l=(t+o)/2,a=n-e,s=o-t,c=Math.max(Math.hypot(a,s),1),u=-s/c,p=a/c,d=Math.min(c*.25,22),f=r+u*d,h=l+p*d,m=1-i;return[m*m*e+2*m*i*f+i*i*n,m*m*t+2*m*i*h+i*i*o]}function bi(e){let r=e;for(let a=0;a<3;a++){const s=1-r,c=3*s*s*r*.2+3*s*r*r*.2+r*r*r,u=3*s*s*.2+6*s*r*(.2-.2)+3*r*r*(1-.2);if(u===0)break;r-=(c-e)/u,r=Math.max(0,Math.min(1,r))}const l=1-r;return 3*l*l*r*.6+3*l*r*r*1+r*r*r}const vt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},wi="#2a2a35",Si="#a1a1aa",vi=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],ki=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],_i="rgba(8, 10, 14, 0.55)",Ci="#3a3a45",Ti=[1,1,.5,.42],Ii=["LOW","HIGH","VIP","SERVICE"],Ei="#e6c56b",Mi="#9bd4c4",Ai=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],Ri="#a1a1aa",xi="#4a4a55",Pi="#f59e0b",Rn="#7dd3fc",xn="#fda4af",Ze="#fafafa",Pn="#8b8c92",Fn="rgba(250, 250, 250, 0.95)",Fi=260,jt=3,Bi=.05,Xt=["standard","briefcase","bag","short","tall"];function se(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,Xt[n%Xt.length]??"standard"}function Li(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function Bn(e,t,n,o,i,r="standard"){const l=Li(r,o),s=n-.5,c=s-l.bodyH,u=c-l.neckGap-l.headR,p=l.bodyH*.08,d=s-l.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-l.shoulderW/2,c+p),e.lineTo(t-l.shoulderW/2+p,c),e.lineTo(t+l.shoulderW/2-p,c),e.lineTo(t+l.shoulderW/2,c+p),e.lineTo(t+l.waistW/2,d),e.lineTo(t+l.footW/2,s),e.lineTo(t-l.footW/2,s),e.lineTo(t-l.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,u,l.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const f=Math.max(1.6,l.headR*.9),h=t+l.waistW/2+f*.1,m=s-f-.5;e.fillRect(h,m,f,f);const b=f*.55;e.fillRect(h+(f-b)/2,m-1,b,1)}else if(r==="bag"){const f=Math.max(1.3,l.headR*.9),h=t-l.shoulderW/2-f*.35,m=c+l.bodyH*.35;e.beginPath(),e.arc(h,m,f,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(h+f*.2,m-f*.8),e.lineTo(t+l.shoulderW/2-p,c+.5),e.stroke()}else if(r==="tall"){const f=l.headR*2.1,h=Math.max(1,l.headR*.45);e.fillRect(t-f/2,u-l.headR-h+.4,f,h)}}function $i(e,t,n,o,i,r,l,a,s){const u=Math.max(1,Math.floor((i-14)/a.figureStride)),p=Math.min(r,u),d=-2;for(let f=0;f<p;f++){const h=t+d+o*f*a.figureStride,m=f+0,b=se(s,m);Bn(e,h,n,a.figureHeadR,l,b)}if(r>p){e.fillStyle=Pn,e.font=`${a.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const f=t+d+o*p*a.figureStride;e.fillText(`+${r-p}`,f,n-1)}}function X(e,t,n,o,i,r){const l=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,l);return}e.moveTo(t+l,n),e.lineTo(t+o-l,n),e.quadraticCurveTo(t+o,n,t+o,n+l),e.lineTo(t+o,n+i-l),e.quadraticCurveTo(t+o,n+i,t+o-l,n+i),e.lineTo(t+l,n+i),e.quadraticCurveTo(t,n+i,t,n+i-l),e.lineTo(t,n+l),e.quadraticCurveTo(t,n,t+l,n),e.closePath()}function Oi(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const l=i+r+1>>1;e.measureText(t.slice(0,l)+o).width<=n?i=l:r=l-1}return i===0?o:t.slice(0,i)+o}function Wi(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function Di(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,l=Math.max(n.fontSmall+.5,i);for(const a of t){const s=a.top-3,c=s>i&&s-n.fontSmall<r;e.fillStyle=a.color,e.fillText(a.text,a.cx,c?l:s)}}function Ni(e,t,n,o,i,r,l,a,s){e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";const c=o.padX,u=o.padX+o.labelW,p=r-o.padX,d=o.shaftInnerW/2,f=Math.min(o.shaftInnerW*1.8,(p-u)/2),h=[...t.stops].sort((m,b)=>m.y-b.y);for(let m=0;m<h.length;m++){const b=h[m];if(b===void 0)continue;const v=n(b.y),_=h[m+1],I=_!==void 0?n(_.y):a;if(e.strokeStyle=wi,e.lineWidth=s?2:1,e.beginPath(),s)for(const g of i)e.moveTo(g-f,v+.5),e.lineTo(g+f,v+.5);else{let g=u;for(const S of i){const w=S-d,C=S+d;w>g&&(e.moveTo(g,v+.5),e.lineTo(w,v+.5)),g=C}g<p&&(e.moveTo(g,v+.5),e.lineTo(p,v+.5))}e.stroke();for(let g=0;g<i.length;g++){const S=i[g];if(S===void 0)continue;const w=l.has(`${g}:${b.entity_id}`);e.strokeStyle=w?Pi:xi,e.lineWidth=w?1.4:1,e.beginPath(),e.moveTo(S-d-2,v+.5),e.lineTo(S-d,v+.5),e.moveTo(S+d,v+.5),e.lineTo(S+d+2,v+.5),e.stroke()}const y=s?v:(v+I)/2;e.fillStyle=Si,e.textAlign="right",e.fillText(Oi(e,b.name,o.labelW-4),c+o.labelW-4,y)}}function qi(e,t,n,o,i,r){for(const l of t.stops){if(l.waiting_by_line.length===0)continue;const a=r.get(l.entity_id);if(a===void 0||a.size===0)continue;const s=n(l.y),c=l.waiting_up>=l.waiting_down?Rn:xn;for(const u of l.waiting_by_line){if(u.count===0)continue;const p=a.get(u.line);if(p===void 0)continue;const d=i.get(p);if(d===void 0)continue;const f=d.end-d.start;f<=o.figureStride||$i(e,d.end-2,s,-1,f,u.count,c,o,l.entity_id)}}}function Hi(e,t,n,o,i,r,l,a,s,c=!1){const u=o*.22,p=(i-4)/10.5,d=Math.max(1.2,Math.min(a.figureHeadR,u,p)),f=a.figureStride*(d/a.figureHeadR),h=3,m=2,b=o-h*2,_=Math.max(1,Math.floor((b-16)/f)),I=Math.min(r,_),y=I*f,g=t-y/2+f/2,S=n-m;for(let w=0;w<I;w++){const C=s?.[w]??se(0,w);Bn(e,g+w*f,S,d,l,C)}if(r>I){const w=`+${r-I}`,C=Math.max(8,a.fontSmall-1);e.font=`700 ${C.toFixed(1)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="middle";const A=e.measureText(w).width,M=3,T=1.5,E=Math.ceil(A+M*2),R=Math.ceil(C+T*2),x=t+o/2-2,O=n-i+2,F=x-E;e.fillStyle="rgba(15, 15, 18, 0.85)",X(e,F,O,E,R,2),e.fill(),e.fillStyle="#fafafa",e.fillText(w,x-M,O+R/2)}if(c){const w=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${w.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="center",e.textBaseline="middle";const C=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,C+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,C)}}function Gi(e,t,n,o,i,r,l){const a=Math.max(2,r.figureHeadR*.9);for(const s of t.cars){if(s.target===void 0)continue;const c=l.get(s.target);if(c===void 0)continue;const u=t.stops[c];if(u===void 0)continue;const p=n.get(s.id);if(p===void 0)continue;const d=i(u.y)-r.carH/2,f=i(s.y)-r.carH/2;Math.abs(f-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(p,f),e.lineTo(p,d),e.stroke(),e.fillStyle=Fn,e.beginPath(),e.arc(p,d,a,0,Math.PI*2),e.fill())}}function zi(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const l=vt[t.phase]??"#6b6b75",a=o/2;for(let s=1;s<=jt;s++){const c=r(t.y-t.v*Bi*s),u=.18*(1-(s-1)/jt);e.fillStyle=St(l,u),e.fillRect(n-a,c-i,o,i)}}function Ui(e,t,n,o,i,r,l,a,s){const c=l(t.y),u=c-i,p=o/2,d=vt[t.phase]??"#6b6b75",f=e.createLinearGradient(n,u,n,c);f.addColorStop(0,Ne(d,.14)),f.addColorStop(1,Ne(d,-.18)),e.fillStyle=f,e.fillRect(n-p,u,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-p+.5,u+.5,o-1,i-1);const h=t.capacity>0&&t.load>=t.capacity*.95;(t.riders>0||h)&&Hi(e,n,c,o,i,t.riders,r,a,s,h)}function ji(e,t,n,o,i,r,l,a){const h=`600 ${r.fontSmall+.5}px system-ui, -apple-system, "Segoe UI", sans-serif`;e.font=h,e.textBaseline="middle";const m=.3,b=performance.now(),v=t,_=[];for(const y of n.cars){const g=l.get(y.id);if(!g)continue;const S=o.get(y.id);if(S===void 0)continue;const w=i(y.y),C=w-r.carH,A=Math.max(1,g.expiresAt-g.bornAt),M=g.expiresAt-b,T=M>A*m?1:Math.max(0,M/(A*m));if(T<=0)continue;const R=e.measureText(g.text).width+14,x=r.fontSmall+8+2,O=C-2-4-x,F=w+2+4+x>a,U=O<2&&!F?"below":"above",ve=U==="above"?C-2-4-x:w+2+4;let W=S-R/2;const ke=2,_e=a-R-2;W<ke&&(W=ke),W>_e&&(W=_e),_.push({bubble:g,alpha:T,cx:S,carTop:C,carBottom:w,bubbleW:R,bubbleH:x,side:U,bx:W,by:ve})}const I=(y,g)=>!(y.bx+y.bubbleW<=g.bx||g.bx+g.bubbleW<=y.bx||y.by+y.bubbleH<=g.by||g.by+g.bubbleH<=y.by);for(let y=1;y<_.length;y++){const g=_[y];if(g===void 0)continue;let S=!1;for(let T=0;T<y;T++){const E=_[T];if(E!==void 0&&I(g,E)){S=!0;break}}if(!S)continue;const w=g.side==="above"?"below":"above",C=w==="above"?g.carTop-2-4-g.bubbleH:g.carBottom+2+4,A={...g,side:w,by:C};let M=!0;for(let T=0;T<y;T++){const E=_[T];if(E!==void 0&&I(A,E)){M=!1;break}}M&&(_[y]=A)}for(const y of _){const{bubble:g,alpha:S,cx:w,carTop:C,carBottom:A,bubbleW:M,bubbleH:T,side:E,bx:R,by:x}=y,O=E==="above"?C-2:A+2,F=E==="above"?x+T:x,U=Math.min(Math.max(w,R+6+5/2),R+M-6-5/2);e.save(),e.globalAlpha=S,e.shadowColor=v,e.shadowBlur=8,e.fillStyle="rgba(16, 19, 26, 0.94)",X(e,R,x,M,T,6),e.fill(),e.shadowBlur=0,e.strokeStyle=An(v,.65),e.lineWidth=1,X(e,R,x,M,T,6),e.stroke(),e.beginPath(),e.moveTo(U-5/2,F),e.lineTo(U+5/2,F),e.lineTo(U,O),e.closePath(),e.fillStyle="rgba(16, 19, 26, 0.94)",e.fill(),e.stroke(),e.fillStyle="#f0f3fb",e.textAlign="center",e.fillText(g.text,R+M/2,x+T/2),e.restore()}}function Xi(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function Yi(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:ze(o)})}return t}function ze(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function Ln(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function Vi(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function Ki(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function Qi(e,t,n,o,i,r){const l=Math.abs(t-e);if(l<.001)return 0;const a=Math.abs(n);if(a*a/(2*r)>=l)return a>0?a/r:0;const c=Math.max(0,(o-a)/i),u=a*c+.5*i*c*c,p=o/r,d=o*o/(2*r);if(u+d>=l){const h=(2*i*r*l+r*a*a)/(i+r),m=Math.sqrt(Math.max(h,a*a));return(m-a)/i+m/r}const f=l-u-d;return c+f/Math.max(o,.001)+p}const $n={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},qe={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function Ji(e,t,n,o,i,r){const l=i/2,a=o-r/2,s=vt[t.phase]??"#6b6b75",c=e.createLinearGradient(n,a,n,a+r);c.addColorStop(0,Ne(s,.14)),c.addColorStop(1,Ne(s,-.18)),e.fillStyle=c,X(e,n-l,a,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-l+2,a+r*.36,i-4,Math.max(1.5,r*.1))}function Zi(e,t,n,o,i){if(t.length===0)return;const r=7,l=4,a=i.fontSmall+2,s=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;const c=(d,f)=>{const h=[d.carName,ze(d.altitudeM),Ln(d.velocity),`${$n[d.phase]} · ${d.layer}`];let m=0;for(const y of h)m=Math.max(m,e.measureText(y).width);const b=m+r*2,v=h.length*a+l*2;let _=f==="right"?d.cx+s:d.cx-s-b;_=Math.max(2,Math.min(o-b-2,_));const I=d.cy-v/2;return{hud:d,lines:h,bx:_,by:I,bubbleW:b,bubbleH:v,side:f}},u=(d,f)=>!(d.bx+d.bubbleW<=f.bx||f.bx+f.bubbleW<=d.bx||d.by+d.bubbleH<=f.by||f.by+f.bubbleH<=d.by),p=[];t.forEach((d,f)=>{let h=c(d,f%2===0?"right":"left");if(p.some(m=>u(h,m))){const m=c(d,h.side==="right"?"left":"right");if(p.every(b=>!u(m,b)))h=m;else{const b=Math.max(...p.map(v=>v.by+v.bubbleH));h={...h,by:b+4}}}p.push(h)});for(const d of p){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",X(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=qe[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,X(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let f=0;f<d.lines.length;f++){const h=d.by+l+a*f+a/2,m=d.lines[f]??"";e.fillStyle=f===0||f===3?qe[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(m,d.bx+r,h)}e.restore()}}function er(e,t,n,o,i,r){if(t.length===0)return;const l=18,a=10,s=6,c=5,u=r.fontSmall+2.5,d=s*2+5*u,f=l+s+(d+c)*t.length;e.save();const h=e.createLinearGradient(n,i,n,i+f);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,X(e,n,i,o,f,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,X(e,n,i,o,f,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+a,i+l/2+2);let m=i+l+s;for(const b of t){e.fillStyle="rgba(15, 15, 18, 0.55)",X(e,n+6,m,o-12,d,5),e.fill(),e.fillStyle=qe[b.phase],e.fillRect(n+6,m,2,d);const v=n+a+4,_=n+o-a;let I=m+s+u/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(b.carName,v,I),e.textAlign="right",e.fillStyle=qe[b.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText($n[b.phase].toUpperCase(),_,I);const y=b.etaSeconds!==void 0&&Number.isFinite(b.etaSeconds)?Ki(b.etaSeconds):"—",g=[["Altitude",ze(b.altitudeM)],["Velocity",Ln(b.velocity)],["Dest",b.destinationName??"—"],["ETA",y]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;for(const[S,w]of g)I+=u,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(S,v,I),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(w,_,I);m+=d+c}e.restore()}function tr(e,t,n,o,i,r,l){return[...e.cars].sort((s,c)=>s.id-c.id).map((s,c)=>{const u=s.y,p=s.target!==void 0?e.stops.find(f=>f.entity_id===s.target):void 0,d=p?Qi(u,p.y,s.v,i,r,l):void 0;return{cx:n,cy:t.toScreenAlt(u),altitudeM:u,velocity:s.v,phase:Vi(s.v,o.get(s.id)??0,i),layer:Xi(u),carName:`Climber ${String.fromCharCode(65+c)}`,destinationName:p?.name,etaSeconds:d}})}const pe=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function et(e,t,n){return e+(t-e)*n}function tt(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round(et(o>>16&255,i>>16&255,n)),l=Math.round(et(o>>8&255,i>>8&255,n)),a=Math.round(et(o&255,i&255,n));return`#${(r<<16|l<<8|a).toString(16).padStart(6,"0")}`}function nr(e,t){let n=0;for(;n<pe.length-1;n++){const c=pe[n+1];if(c===void 0||e<=c[0])break}const o=pe[n],i=pe[Math.min(n+1,pe.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],l=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),a=tt(o[1],i[1],l),s=tt(o[2],i[2],l);return tt(a,s,t)}const or=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function ir(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),l=Math.log10(1+t.axisMaxM/1e3),a=[0,.05,.15,.35,.6,1];for(const c of a){const u=1e3*(10**(c*l)-1);r.addColorStop(c,nr(u,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const c of or){const u=t.axisMaxM*c.altFrac;if(u<8e4)continue;const p=t.toScreenAlt(u),d=n+c.xFrac*(o-n),f=c.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${f.toFixed(3)})`,e.beginPath(),e.arc(d,p,c.size,0,Math.PI*2),e.fill()}e.restore();const s=Yi(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const c of s){const u=t.toScreenAlt(c.altitudeM);u<t.shaftTop||u>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,u),e.lineTo(o,u),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(c.label,n+4,u-6))}}function rr(e,t,n,o){const r=o-28,l=e.createLinearGradient(0,r,0,o);l.addColorStop(0,"rgba(0,0,0,0)"),l.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),l.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=l,e.fillRect(t,r,n-t,28),e.strokeStyle=An("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function ar(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function sr(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const l=-Math.PI/2+r*Math.PI/3,a=t+Math.cos(l)*i,s=n+Math.sin(l)*i;r===0?e.moveTo(a,s):e.lineTo(a,s)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function lr(e,t,n,o,i,r,l){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const a of t.stops){const s=n.toScreenAlt(a.y);if(s<n.shaftTop||s>n.shaftBottom)continue;const c=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-c/2,s),e.lineTo(o-5,s),e.moveTo(o+5,s),e.lineTo(o+c/2,s),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-c/2,s),e.lineTo(o-5,s-5),e.moveTo(o+c/2,s),e.lineTo(o+5,s-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(a.name,r+l-4,s-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(ze(a.y),r+l-4,s+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function cr(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const l=Math.log10(1+Math.max(0,r)/1e3),a=i<=0?0:Math.max(0,Math.min(1,l/i));return t-a*(t-e)}}}function dr(e,t,n,o,i,r,l){const a=Math.max(2,l.figureHeadR*.9);for(const s of t.cars){if(s.target===void 0)continue;const c=r.get(s.target);if(c===void 0)continue;const u=t.stops[c];if(u===void 0)continue;const p=i.get(s.id);if(p===void 0)continue;const d=n.toScreenAlt(u.y);Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,p),e.lineTo(o,d),e.stroke(),e.fillStyle=Fn,e.beginPath(),e.arc(o,d,a,0,Math.PI*2),e.fill())}}function pr(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function fr(e,t,n,o,i,r,l){l.firstDrawAt===0&&(l.firstDrawAt=performance.now());const a=(performance.now()-l.firstDrawAt)/1e3,s=r.showDayNight?pr(a):.5,c=n>=520&&o>=360,u=Math.min(120,Math.max(72,n*.16)),p=c?Math.min(220,Math.max(160,n*.24)):0,d=c?14:0,f=i.padX,h=f+u+4,m=n-i.padX-p-d,b=(h+m)/2,v=12,_=i.padTop+24,I=o-i.padBottom-18,y=cr(_,I,r);ir(e,y,h+v,m-v,s),rr(e,h+v,m-v,I),ar(e,b,y),sr(e,b,y.shaftTop,i),lr(e,t,y,b,i,f,u);const g=Math.max(20,Math.min(34,m-h-8)),S=Math.max(16,Math.min(26,g*.72));i.carH=S,i.carW=g;const w=new Map,C=new Map;t.stops.forEach((T,E)=>C.set(T.entity_id,E));for(const T of t.cars)w.set(T.id,y.toScreenAlt(T.y));dr(e,t,y,b,w,C,i);for(const T of t.cars){const E=w.get(T.id);E!==void 0&&Ji(e,T,b,E,g,S)}const M=[...tr(t,y,b,l.prevVelocity,l.maxSpeed,l.acceleration,l.deceleration)].sort((T,E)=>E.altitudeM-T.altitudeM);Zi(e,M,g,n-p-d,i),c&&er(e,M,n-i.padX-p,p,_,i);for(const T of t.cars)l.prevVelocity.set(T.id,T.v);if(l.prevVelocity.size>t.cars.length){const T=new Set(t.cars.map(E=>E.id));for(const E of l.prevVelocity.keys())T.has(E)||l.prevVelocity.delete(E)}}function ur(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function Yt(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}class hr{#e;#t;#n=window.devicePixelRatio||1;#i;#r=null;#a=-1;#d=new Map;#s;#o=new Map;#l=new Map;#c=[];#p=null;#g=new Map;#m=1;#y=1;#b=1;#u=0;#f=new Map;constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#t=o,this.#s=n,this.#h(),this.#i=()=>{this.#h()},window.addEventListener("resize",this.#i)}dispose(){window.removeEventListener("resize",this.#i)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#g.clear(),this.#u=0,this.#f.clear()}setTetherPhysics(t,n,o){Number.isFinite(t)&&t>0&&(this.#m=t),Number.isFinite(n)&&n>0&&(this.#y=n),Number.isFinite(o)&&o>0&&(this.#b=o)}pushAssignment(t,n,o){let i=this.#f.get(t);i===void 0&&(i=new Map,this.#f.set(t,i)),i.set(o,n)}#h(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#n,i=n*this.#n;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}draw(t,n,o){this.#h();const{clientWidth:i,clientHeight:r}=this.#e,l=this.#t;if(l.clearRect(0,0,i,r),t.stops.length===0||i===0||r===0)return;i!==this.#a&&(this.#r=ur(i),this.#a=i);const a=this.#r;if(a===null)return;if(this.#p!==null){this.#w(t,i,r,a,n,o,this.#p);return}const s=t.stops.length===2,c=t.stops[0];if(c===void 0)return;let u=c.y,p=c.y;for(let k=1;k<t.stops.length;k++){const P=t.stops[k];if(P===void 0)continue;const B=P.y;B<u&&(u=B),B>p&&(p=B)}const d=t.stops.map(k=>k.y).sort((k,P)=>k-P),f=d.length>=3?(d.at(-1)??0)-(d.at(-2)??0):1,m=u-1,b=p+f,v=Math.max(b-m,1e-4),_=s?18:0;let I,y;if(s)I=a.padTop+_,y=r-a.padBottom-_;else{const k=[];for(let ne=1;ne<d.length;ne++){const Ce=d[ne],Te=d[ne-1];if(Ce===void 0||Te===void 0)continue;const K=Ce-Te;K>0&&k.push(K)}const L=48/(k.length>0?Math.min(...k):1),j=Math.max(0,r-a.padTop-a.padBottom)/v,Y=Math.min(j,L),te=v*Y;y=r-a.padBottom,I=y-te}const g=k=>y-(k-m)/v*(y-I),S=this.#d;S.forEach(k=>k.length=0);for(const k of t.cars){const P=S.get(k.line);P?P.push(k):S.set(k.line,[k])}const w=[...S.keys()].sort((k,P)=>k-P),C=w.reduce((k,P)=>k+(S.get(P)?.length??0),0),A=Math.max(0,i-2*a.padX-a.labelW),M=a.figureStride*2,T=a.shaftSpacing*Math.max(C-1,0),R=(A-T)/Math.max(C,1),x=s?34:a.maxShaftInnerW,F=Math.max(a.minShaftInnerW,Math.min(x,R*.55)),U=Math.max(0,Math.min(R-F,M+a.figureStride*4)),ve=Math.max(14,F-6);let W=1/0;if(t.stops.length>=2)for(let k=1;k<d.length;k++){const P=d[k-1],B=d[k];if(P===void 0||B===void 0)continue;const L=g(P)-g(B);L>0&&L<W&&(W=L)}const ke=g(p)-2,_e=Number.isFinite(W)?W:a.carH,Xn=s?a.carH:_e,Yn=Math.max(14,Math.min(Xn,ke));if(!s&&Number.isFinite(W)){const k=Math.max(1.5,Math.min(W*.067,4)),P=a.figureStride*(k/a.figureHeadR);a.figureHeadR=k,a.figureStride=P}a.shaftInnerW=F,a.carW=ve,a.carH=Yn;const Vn=a.padX+a.labelW,Kn=F+U,Xe=[],de=new Map,Ye=new Map;let _t=0;for(const k of w){const P=S.get(k)??[];for(const B of P){const L=Vn+_t*(Kn+a.shaftSpacing),q=L,j=L+U,Y=j+F/2;Xe.push(Y),de.set(B.id,Y),Ye.set(B.id,{start:q,end:j}),_t++}}const Ct=new Map;t.stops.forEach((k,P)=>Ct.set(k.entity_id,P));const Tt=new Set;{let k=0;for(const P of w){const B=S.get(P)??[];for(const L of B){if(L.phase==="loading"||L.phase==="door-opening"||L.phase==="door-closing"){const q=Yt(t.stops,L.y);q!==void 0&&q.dist<.5&&Tt.add(`${k}:${q.stop.entity_id}`)}k++}}}const It=new Map,Et=new Map,Mt=new Map,At=new Map,Rt=[],xt=[];let Pt=0;for(let k=0;k<w.length;k++){const P=w[k];if(P===void 0)continue;const B=S.get(P)??[],L=vi[k]??_i,q=ki[k]??Ci,j=Ti[k]??1,Y=Ai[k]??Ri,te=Math.max(14,F*j),ne=Math.max(10,ve*j),Ce=Math.max(10,a.carH),Te=k===2?Ei:k===3?Mi:Ze;let K=1/0,Ve=-1/0,Ie=1/0;for(const V of B){It.set(V.id,te),Et.set(V.id,ne),Mt.set(V.id,Ce),At.set(V.id,Te);const oe=Xe[Pt];if(oe===void 0)continue;const Ft=Number.isFinite(V.min_served_y)&&Number.isFinite(V.max_served_y),Ke=Ft?Math.max(I,g(V.max_served_y)-a.carH-2):I,Qn=Ft?Math.min(y,g(V.min_served_y)+2):y;Rt.push({cx:oe,top:Ke,bottom:Qn,fill:L,frame:q,width:te}),oe<K&&(K=oe),oe>Ve&&(Ve=oe),Ke<Ie&&(Ie=Ke),Pt++}w.length>1&&Number.isFinite(K)&&Number.isFinite(Ie)&&xt.push({cx:(K+Ve)/2,top:Ie,text:Ii[k]??`Line ${k+1}`,color:Y})}Wi(l,Rt),Di(l,xt,a),Ni(l,t,g,a,Xe,i,Tt,I,s),qi(l,t,g,a,Ye,this.#f),Gi(l,t,de,It,g,a,Ct);for(const[k,P]of de){const B=t.cars.find(te=>te.id===k);if(!B)continue;const L=Et.get(k)??a.carW,q=Mt.get(k)??a.carH,j=At.get(k)??Ze,Y=this.#o.get(k);zi(l,B,P,L,q,g),Ui(l,B,P,L,q,j,g,a,Y?.roster)}this.#S(t,de,Ye,g,a,n),this.#v(a),o&&o.size>0&&ji(l,this.#s,t,de,g,a,o,i)}#w(t,n,o,i,r,l,a){const s={prevVelocity:this.#g,maxSpeed:this.#m,acceleration:this.#y,deceleration:this.#b,firstDrawAt:this.#u};fr(this.#t,t,n,o,i,a,s),this.#u=s.firstDrawAt}#S(t,n,o,i,r,l){const a=performance.now(),s=Math.max(1,l),c=Fi/s,u=30/s,p=new Map,d=[];for(const f of t.cars){const h=this.#o.get(f.id),m=f.riders,b=n.get(f.id),v=Yt(t.stops,f.y),_=f.phase==="loading"&&v!==void 0&&v.dist<.5?v.stop:void 0;if(h&&b!==void 0&&_!==void 0){const g=m-h.riders;if(g>0&&p.set(_.entity_id,(p.get(_.entity_id)??0)+g),g!==0){const S=i(_.y),w=i(f.y)-r.carH/2,C=Math.min(Math.abs(g),6);if(g>0){const A=_.waiting_up>=_.waiting_down,M=o.get(f.id);let T=b-20;if(M!==void 0){const x=M.start,O=M.end;T=(x+O)/2}const E=A?Rn:xn,R=this.#f.get(_.entity_id);R!==void 0&&(R.delete(f.line),R.size===0&&this.#f.delete(_.entity_id));for(let x=0;x<C;x++)d.push(()=>this.#c.push({kind:"board",bornAt:a+x*u,duration:c,startX:T,startY:S,endX:b,endY:w,color:E}))}else for(let A=0;A<C;A++)d.push(()=>this.#c.push({kind:"alight",bornAt:a+A*u,duration:c,startX:b,startY:w,endX:b+18,endY:w+10,color:Ze}))}}const I=h?.roster??[];let y;if(h){const g=m-h.riders;if(y=I.slice(),g>0&&_!==void 0){const w=_.waiting_up>=_.waiting_down?0:1e4;for(let C=0;C<g;C++)y.push(se(_.entity_id,C+w))}else if(g>0)for(let S=0;S<g;S++)y.push(se(f.id,y.length+S));else g<0&&y.splice(y.length+g,-g)}else{y=[];for(let g=0;g<m;g++)y.push(se(f.id,g))}for(;y.length>m;)y.pop();for(;y.length<m;)y.push(se(f.id,y.length));this.#o.set(f.id,{riders:m,roster:y})}for(const f of t.stops){const h=f.waiting_up+f.waiting_down,m=this.#l.get(f.entity_id);if(m){const b=m.waiting-h,v=p.get(f.entity_id)??0,_=Math.max(0,b-v);if(_>0){const I=i(f.y),y=r.padX+r.labelW+20,g=Math.min(_,4);for(let S=0;S<g;S++)this.#c.push({kind:"abandon",bornAt:a+S*u,duration:c*1.5,startX:y,startY:I,endX:y-26,endY:I-6,color:Pn})}}this.#l.set(f.entity_id,{waiting:h})}for(const f of d)f();for(let f=this.#c.length-1;f>=0;f--){const h=this.#c[f];h!==void 0&&a-h.bornAt>h.duration&&this.#c.splice(f,1)}if(this.#o.size>t.cars.length){const f=new Set(t.cars.map(h=>h.id));for(const h of this.#o.keys())f.has(h)||this.#o.delete(h)}if(this.#l.size>t.stops.length){const f=new Set(t.stops.map(h=>h.entity_id));for(const h of this.#l.keys())f.has(h)||this.#l.delete(h)}}#v(t){const n=performance.now(),o=this.#t;for(const i of this.#c){const r=n-i.bornAt;if(r<0)continue;const l=Math.min(1,Math.max(0,r/i.duration)),a=bi(l),[s,c]=i.kind==="board"?yi(i.startX,i.startY,i.endX,i.endY,a):[i.startX+(i.endX-i.startX)*a,i.startY+(i.endY-i.startY)*a],u=i.kind==="board"?.9:i.kind==="abandon"?(1-a)**1.5:1-a,p=i.kind==="abandon"?t.carDotR*.85:t.carDotR;o.fillStyle=St(i.color,u),o.beginPath(),o.arc(s,c,p,0,Math.PI*2),o.fill()}}}const gr="#7dd3fc",mr="#fda4af";async function Vt(e,t,n,o,i){const r=eo(o,i),l=await wt.create(r,t,n),a=new hr(e.canvas,e.accent);if(a.setTetherConfig(o.tether??null),o.tether){const c=mt(o,i);a.setTetherPhysics(c.maxSpeed,c.acceleration,c.deceleration)}const s=e.canvas.parentElement;if(s){const c=o.stops.length,p=o.tether?640:Math.max(200,c*16);s.style.setProperty("--shaft-min-h",`${p}px`)}return{strategy:t,sim:l,renderer:a,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function fe(e){e?.sim.dispose(),e?.renderer.dispose()}function lt(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const yr=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],br=120;function Kt(e,t,n){const o=e.sim.metrics();e.latestMetrics=o;for(const r of yr){const l=e.metricHistory[r];l.push(o[r]),l.length>br&&l.shift()}const i=performance.now();for(const[r,l]of e.bubbles)l.expiresAt<=i&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const wr={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},Sr=1e3;function vr(e,t,n){const o=performance.now(),i=r=>_r(n,r);for(const r of t){const l=kr(r,i);if(l===null)continue;const a=r.elevator;if(a===void 0)continue;const s=wr[r.kind]??Sr;e.bubbles.set(a,{text:l,bornAt:o,expiresAt:o+s})}}function kr(e,t){switch(e.kind){case"elevator-assigned":return`› To ${t(e.stop)}`;case"elevator-repositioning":return`↻ Reposition to ${t(e.stop)}`;case"elevator-arrived":return`● At ${t(e.stop)}`;case"door-opened":return"◌ Doors open";case"rider-boarded":return"+ Boarding";case"rider-exited":return`↓ Off at ${t(e.stop)}`;default:return null}}function _r(e,t){return e.stops.find(o=>o.entity_id===t)?.name??`stop #${t}`}const Cr={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function Qt(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=Cr[t],e.modeEl.title=t)}function Tr(){const e=a=>{const s=document.getElementById(a);if(!s)throw new Error(`missing element #${a}`);return s},t=a=>document.getElementById(a),n=(a,s)=>({root:e(`pane-${a}`),canvas:e(`shaft-${a}`),name:e(`name-${a}`),mode:e(`mode-${a}`),desc:e(`desc-${a}`),metrics:e(`metrics-${a}`),trigger:e(`strategy-trigger-${a}`),popover:e(`strategy-popover-${a}`),repoTrigger:e(`repo-trigger-${a}`),repoName:e(`repo-name-${a}`),repoPopover:e(`repo-popover-${a}`),accent:s,which:a}),o=a=>{const s=document.querySelector(`.tweak-row[data-key="${a}"]`);if(!s)throw new Error(`missing tweak row for ${a}`);const c=p=>{const d=s.querySelector(p);if(!d)throw new Error(`missing ${p} in tweak row ${a}`);return d},u=p=>s.querySelector(p);return{root:s,value:c(".tweak-value"),defaultV:c(".tweak-default-v"),dec:c(".tweak-dec"),inc:c(".tweak-inc"),reset:c(".tweak-reset"),trackFill:u(".tweak-track-fill"),trackDefault:u(".tweak-track-default"),trackThumb:u(".tweak-track-thumb")}},i={};for(const a of ce)i[a]=o(a);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",gr),paneB:n("b",mr)};_o(r);const l=document.getElementById("controls-bar");return l&&new ResizeObserver(([s])=>{if(!s)return;const c=Math.ceil(s.borderBoxSize[0]?.blockSize??s.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${c}px`)}).observe(l),r}function On(e,t,n,o,i,r,l,a,s){const c=document.createDocumentFragment();for(const u of t){const p=document.createElement("button");p.type="button",p.className="strategy-option",p.setAttribute("role","menuitemradio"),p.setAttribute("aria-checked",u===r?"true":"false"),p.dataset[i]=u;const d=document.createElement("span");d.className="strategy-option-name";const f=document.createElement("span");if(f.className="strategy-option-label",f.textContent=n[u],d.appendChild(f),l&&u===l){const m=document.createElement("span");m.className="strategy-option-sibling",m.textContent=`also in ${a}`,d.appendChild(m)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=o[u],p.append(d,h),p.addEventListener("click",()=>{s(u)}),c.appendChild(p)}e.replaceChildren(c)}function Z(e,t){const n=yt[t],o=Cn[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function Jt(e,t,n,o,i){On(e.repoPopover,So,yt,Cn,"reposition",t,n,o,i)}function me(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;Jt(t.paneA,o,r?i:null,"B",l=>void en(e,t,"a",l,n)),Jt(t.paneB,i,r?o:null,"A",l=>void en(e,t,"b",l,n))}function ct(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function Wn(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function dt(e){ct(e.paneA,!1),ct(e.paneB,!1)}function Ue(e){ft(e),dt(e)}function Zt(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;Ue(t),r&&(me(e,t,o),ct(n,!0))})}async function en(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){dt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},Z(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},Z(t.paneB,o)),H(e.permalink),me(e,t,i),dt(t),await i(),D(t.toast,`${n==="a"?"A":"B"} park: ${yt[o]}`)}function Ir(e){document.addEventListener("click",t=>{if(!Dn(e)&&!Wn(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;Ue(e)}})}function ee(e,t){const n=Ge[t],o=_n[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function tn(e,t,n,o,i){On(e.popover,wo,Ge,_n,"strategy",t,n,o,i)}function ye(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;tn(t.paneA,o,r?i:null,"B",l=>void on(e,t,"a",l,n)),tn(t.paneB,i,r?o:null,"A",l=>void on(e,t,"b",l,n))}function pt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function Dn(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function ft(e){pt(e.paneA,!1),pt(e.paneB,!1)}function nn(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;Ue(t),r&&(ye(e,t,o),pt(n,!0))})}async function on(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){ft(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},ee(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},ee(t.paneB,o)),H(e.permalink),ye(e,t,i),ft(t),await i(),D(t.toast,`${n==="a"?"A":"B"}: ${Ge[o]}`)}function rn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function Er(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function je(e,t,n){let o=!1;for(const i of ce){const r=n.tweakRows[i],l=e.tweakRanges[i],a=J(e,i,t),s=ht(e,i),c=gt(e,i,a);c&&(o=!0),r.value.textContent=rn(i,a),r.defaultV.textContent=rn(i,s),r.dec.disabled=a<=l.min+1e-9,r.inc.disabled=a>=l.max-1e-9,r.root.dataset.overridden=String(c),r.reset.hidden=!c;const u=Math.max(l.max-l.min,1e-9),p=Math.max(0,Math.min(1,(a-l.min)/u)),d=Math.max(0,Math.min(1,(s-l.min)/u));r.trackFill&&(r.trackFill.style.width=`${(p*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(p*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function Nn(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function kt(e,t,n,o){const i=mt(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},l=[e.paneA,e.paneB].filter(s=>s!==null),a=l.every(s=>s.sim.applyPhysicsLive(r));if(a)for(const s of l)s.renderer?.setTetherPhysics(i.maxSpeed,i.acceleration,i.deceleration);je(n,e.permalink.overrides,t),a||o()}function Mr(e,t,n){return Math.min(n,Math.max(t,e))}function Ar(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function Ae(e,t,n,o,i){const r=N(e.permalink.scenario),l=r.tweakRanges[n],a=J(r,n,e.permalink.overrides),s=Mr(a+o*l.step,l.min,l.max),c=Ar(s,l.min,l.step);Pr(e,t,n,c,i)}function Rr(e,t,n,o){const i=N(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},H(e.permalink),n==="cars"?(o(),D(t.toast,"Cars reset")):(kt(e,t,i,o),D(t.toast,`${Er(n)} reset`))}async function xr(e,t,n){const o=N(e.permalink.scenario),i=gt(o,"cars",J(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},H(e.permalink),i?await n():kt(e,t,o,n),D(t.toast,"Parameters reset")}function Pr(e,t,n,o,i){const r=N(e.permalink.scenario),l={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:gn(r,l)},H(e.permalink),n==="cars"?i():kt(e,t,r,i)}function Fr(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Br(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var Re={exports:{}},Lr=Re.exports,an;function $r(){return an||(an=1,(function(e){(function(t,n,o){function i(s){var c=this,u=a();c.next=function(){var p=2091639*c.s0+c.c*23283064365386963e-26;return c.s0=c.s1,c.s1=c.s2,c.s2=p-(c.c=p|0)},c.c=1,c.s0=u(" "),c.s1=u(" "),c.s2=u(" "),c.s0-=u(s),c.s0<0&&(c.s0+=1),c.s1-=u(s),c.s1<0&&(c.s1+=1),c.s2-=u(s),c.s2<0&&(c.s2+=1),u=null}function r(s,c){return c.c=s.c,c.s0=s.s0,c.s1=s.s1,c.s2=s.s2,c}function l(s,c){var u=new i(s),p=c&&c.state,d=u.next;return d.int32=function(){return u.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,p&&(typeof p=="object"&&r(p,u),d.state=function(){return r(u,{})}),d}function a(){var s=4022871197,c=function(u){u=String(u);for(var p=0;p<u.length;p++){s+=u.charCodeAt(p);var d=.02519603282416938*s;s=d>>>0,d-=s,d*=s,s=d>>>0,d-=s,s+=d*4294967296}return(s>>>0)*23283064365386963e-26};return c}n&&n.exports?n.exports=l:this.alea=l})(Lr,e)})(Re)),Re.exports}var xe={exports:{}},Or=xe.exports,sn;function Wr(){return sn||(sn=1,(function(e){(function(t,n,o){function i(a){var s=this,c="";s.x=0,s.y=0,s.z=0,s.w=0,s.next=function(){var p=s.x^s.x<<11;return s.x=s.y,s.y=s.z,s.z=s.w,s.w^=s.w>>>19^p^p>>>8},a===(a|0)?s.x=a:c+=a;for(var u=0;u<c.length+64;u++)s.x^=c.charCodeAt(u)|0,s.next()}function r(a,s){return s.x=a.x,s.y=a.y,s.z=a.z,s.w=a.w,s}function l(a,s){var c=new i(a),u=s&&s.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,f=(c.next()>>>0)/4294967296,h=(d+f)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,u&&(typeof u=="object"&&r(u,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xor128=l})(Or,e)})(xe)),xe.exports}var Pe={exports:{}},Dr=Pe.exports,ln;function Nr(){return ln||(ln=1,(function(e){(function(t,n,o){function i(a){var s=this,c="";s.next=function(){var p=s.x^s.x>>>2;return s.x=s.y,s.y=s.z,s.z=s.w,s.w=s.v,(s.d=s.d+362437|0)+(s.v=s.v^s.v<<4^(p^p<<1))|0},s.x=0,s.y=0,s.z=0,s.w=0,s.v=0,a===(a|0)?s.x=a:c+=a;for(var u=0;u<c.length+64;u++)s.x^=c.charCodeAt(u)|0,u==c.length&&(s.d=s.x<<10^s.x>>>4),s.next()}function r(a,s){return s.x=a.x,s.y=a.y,s.z=a.z,s.w=a.w,s.v=a.v,s.d=a.d,s}function l(a,s){var c=new i(a),u=s&&s.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,f=(c.next()>>>0)/4294967296,h=(d+f)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,u&&(typeof u=="object"&&r(u,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xorwow=l})(Dr,e)})(Pe)),Pe.exports}var Fe={exports:{}},qr=Fe.exports,cn;function Hr(){return cn||(cn=1,(function(e){(function(t,n,o){function i(a){var s=this;s.next=function(){var u=s.x,p=s.i,d,f;return d=u[p],d^=d>>>7,f=d^d<<24,d=u[p+1&7],f^=d^d>>>10,d=u[p+3&7],f^=d^d>>>3,d=u[p+4&7],f^=d^d<<7,d=u[p+7&7],d=d^d<<13,f^=d^d<<9,u[p]=f,s.i=p+1&7,f};function c(u,p){var d,f=[];if(p===(p|0))f[0]=p;else for(p=""+p,d=0;d<p.length;++d)f[d&7]=f[d&7]<<15^p.charCodeAt(d)+f[d+1&7]<<13;for(;f.length<8;)f.push(0);for(d=0;d<8&&f[d]===0;++d);for(d==8?f[7]=-1:f[d],u.x=f,u.i=0,d=256;d>0;--d)u.next()}c(s,a)}function r(a,s){return s.x=a.x.slice(),s.i=a.i,s}function l(a,s){a==null&&(a=+new Date);var c=new i(a),u=s&&s.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,f=(c.next()>>>0)/4294967296,h=(d+f)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,u&&(u.x&&r(u,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xorshift7=l})(qr,e)})(Fe)),Fe.exports}var Be={exports:{}},Gr=Be.exports,dn;function zr(){return dn||(dn=1,(function(e){(function(t,n,o){function i(a){var s=this;s.next=function(){var u=s.w,p=s.X,d=s.i,f,h;return s.w=u=u+1640531527|0,h=p[d+34&127],f=p[d=d+1&127],h^=h<<13,f^=f<<17,h^=h>>>15,f^=f>>>12,h=p[d]=h^f,s.i=d,h+(u^u>>>16)|0};function c(u,p){var d,f,h,m,b,v=[],_=128;for(p===(p|0)?(f=p,p=null):(p=p+"\0",f=0,_=Math.max(_,p.length)),h=0,m=-32;m<_;++m)p&&(f^=p.charCodeAt((m+32)%p.length)),m===0&&(b=f),f^=f<<10,f^=f>>>15,f^=f<<4,f^=f>>>13,m>=0&&(b=b+1640531527|0,d=v[m&127]^=f+b,h=d==0?h+1:0);for(h>=128&&(v[(p&&p.length||0)&127]=-1),h=127,m=512;m>0;--m)f=v[h+34&127],d=v[h=h+1&127],f^=f<<13,d^=d<<17,f^=f>>>15,d^=d>>>12,v[h]=f^d;u.w=b,u.X=v,u.i=h}c(s,a)}function r(a,s){return s.i=a.i,s.w=a.w,s.X=a.X.slice(),s}function l(a,s){a==null&&(a=+new Date);var c=new i(a),u=s&&s.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,f=(c.next()>>>0)/4294967296,h=(d+f)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,u&&(u.X&&r(u,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.xor4096=l})(Gr,e)})(Be)),Be.exports}var Le={exports:{}},Ur=Le.exports,pn;function jr(){return pn||(pn=1,(function(e){(function(t,n,o){function i(a){var s=this,c="";s.next=function(){var p=s.b,d=s.c,f=s.d,h=s.a;return p=p<<25^p>>>7^d,d=d-f|0,f=f<<24^f>>>8^h,h=h-p|0,s.b=p=p<<20^p>>>12^d,s.c=d=d-f|0,s.d=f<<16^d>>>16^h,s.a=h-p|0},s.a=0,s.b=0,s.c=-1640531527,s.d=1367130551,a===Math.floor(a)?(s.a=a/4294967296|0,s.b=a|0):c+=a;for(var u=0;u<c.length+20;u++)s.b^=c.charCodeAt(u)|0,s.next()}function r(a,s){return s.a=a.a,s.b=a.b,s.c=a.c,s.d=a.d,s}function l(a,s){var c=new i(a),u=s&&s.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,f=(c.next()>>>0)/4294967296,h=(d+f)/(1<<21);while(h===0);return h},p.int32=c.next,p.quick=p,u&&(typeof u=="object"&&r(u,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=l:this.tychei=l})(Ur,e)})(Le)),Le.exports}var $e={exports:{}};const Xr={},Yr=Object.freeze(Object.defineProperty({__proto__:null,default:Xr},Symbol.toStringTag,{value:"Module"})),Vr=Br(Yr);var Kr=$e.exports,fn;function Qr(){return fn||(fn=1,(function(e){(function(t,n,o){var i=256,r=6,l=52,a="random",s=o.pow(i,r),c=o.pow(2,l),u=c*2,p=i-1,d;function f(y,g,S){var w=[];g=g==!0?{entropy:!0}:g||{};var C=v(b(g.entropy?[y,I(n)]:y??_(),3),w),A=new h(w),M=function(){for(var T=A.g(r),E=s,R=0;T<c;)T=(T+R)*i,E*=i,R=A.g(1);for(;T>=u;)T/=2,E/=2,R>>>=1;return(T+R)/E};return M.int32=function(){return A.g(4)|0},M.quick=function(){return A.g(4)/4294967296},M.double=M,v(I(A.S),n),(g.pass||S||function(T,E,R,x){return x&&(x.S&&m(x,A),T.state=function(){return m(A,{})}),R?(o[a]=T,E):T})(M,C,"global"in g?g.global:this==o,g.state)}function h(y){var g,S=y.length,w=this,C=0,A=w.i=w.j=0,M=w.S=[];for(S||(y=[S++]);C<i;)M[C]=C++;for(C=0;C<i;C++)M[C]=M[A=p&A+y[C%S]+(g=M[C])],M[A]=g;(w.g=function(T){for(var E,R=0,x=w.i,O=w.j,F=w.S;T--;)E=F[x=p&x+1],R=R*i+F[p&(F[x]=F[O=p&O+E])+(F[O]=E)];return w.i=x,w.j=O,R})(i)}function m(y,g){return g.i=y.i,g.j=y.j,g.S=y.S.slice(),g}function b(y,g){var S=[],w=typeof y,C;if(g&&w=="object")for(C in y)try{S.push(b(y[C],g-1))}catch{}return S.length?S:w=="string"?y:y+"\0"}function v(y,g){for(var S=y+"",w,C=0;C<S.length;)g[p&C]=p&(w^=g[p&C]*19)+S.charCodeAt(C++);return I(g)}function _(){try{var y;return d&&(y=d.randomBytes)?y=y(i):(y=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(y)),I(y)}catch{var g=t.navigator,S=g&&g.plugins;return[+new Date,t,S,t.screen,I(n)]}}function I(y){return String.fromCharCode.apply(0,y)}if(v(o.random(),n),e.exports){e.exports=f;try{d=Vr}catch{}}else o["seed"+a]=f})(typeof self<"u"?self:Kr,[],Math)})($e)),$e.exports}var nt,un;function Jr(){if(un)return nt;un=1;var e=$r(),t=Wr(),n=Nr(),o=Hr(),i=zr(),r=jr(),l=Qr();return l.alea=e,l.xor128=t,l.xorwow=n,l.xorshift7=o,l.xor4096=i,l.tychei=r,nt=l,nt}var Zr=Jr();const ea=Fr(Zr),He=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],ot=He.reduce((e,t)=>t.length<e.length?t:e).length,it=He.reduce((e,t)=>t.length>e.length?t:e).length;function ta(e){const t=e?.seed?new ea(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let f=typeof n!="number"?ot:a(n);const h=typeof o!="number"?it:a(o);f>h&&(f=h);let m=!1,b;for(;!m;)b=l(),m=b.length<=h&&b.length>=f;return b}function l(){return He[s(He.length)]}function a(f){return f<ot&&(f=ot),f>it&&(f=it),f}function s(f){const h=t?t():Math.random();return Math.floor(h*f)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=f=>f),typeof e.separator!="string"&&(e.separator=" ");const c=e.min+s(e.max+1-e.min);let u=[],p="",d=0;for(let f=0;f<c*e.wordsPerString;f++)d===e.wordsPerString-1?p+=e.formatter(r(),d):p+=e.formatter(r(),d)+e.separator,d++,(f+1)%e.wordsPerString===0&&(u.push(p),p="",d=0);return typeof e.join=="string"&&(u=u.join(e.join)),u}const qn=e=>`${e}×`,Hn=e=>`${e.toFixed(1)}×`;function Gn(){const e=ta({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function na(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=qn(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=Hn(e.intensity),ee(t.paneA,e.strategyA),ee(t.paneB,e.strategyB),Z(t.paneA,e.repositionA),Z(t.paneB,e.repositionB),Tn(t,e.scenario);const n=N(e.scenario);Object.keys(e.overrides).length>0&&Nn(t,!0),je(n,e.overrides,t)}function be(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function zn(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function Un(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function oa(e){if(e.length<2)return"M 0 13 L 100 13";let t=e[0]??0,n=e[0]??0;for(let l=1;l<e.length;l++){const a=e[l];a!==void 0&&(a<t&&(t=a),a>n&&(n=a))}const o=n-t,i=e.length;let r="";for(let l=0;l<i;l++){const a=l/(i-1)*100,s=o>0?13-((e[l]??0)-t)/o*12:7;r+=`${l===0?"M":"L"} ${a.toFixed(2)} ${s.toFixed(2)} `}return r.trim()}const ut=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function ia(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function ra(e,t){const n=(f,h,m,b)=>Math.abs(f-h)<m?["tie","tie"]:(b?f>h:f<h)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,l]=n(e.max_wait_s,t.max_wait_s,.05,!1),[a,s]=n(e.delivered,t.delivered,.5,!0),[c,u]=n(e.abandoned,t.abandoned,.5,!1),[p,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:a,abandoned:c,utilization:p},b:{avg_wait_s:i,max_wait_s:l,delivered:s,abandoned:u,utilization:d}}}function hn(e){const t=document.createDocumentFragment();for(const[n]of ut){const o=le("div","metric-row flex flex-col gap-[3px] px-2.5 py-[7px] bg-surface-elevated border border-stroke-subtle rounded-md transition-colors duration-normal"),i=document.createElementNS("http://www.w3.org/2000/svg","svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS("http://www.w3.org/2000/svg","path")),o.append(le("span","text-[9.5px] uppercase tracking-[0.08em] text-content-disabled font-medium",n),le("span","metric-v text-[15px] text-content font-medium [font-feature-settings:'tnum'_1]"),i),t.appendChild(o)}e.replaceChildren(t)}function rt(e,t,n,o){const i=e.children;for(let r=0;r<ut.length;r++){const l=i[r];if(!l)continue;const a=ut[r];if(!a)continue;const s=a[1],c=n?n[s]:"";l.dataset.verdict!==c&&(l.dataset.verdict=c);const u=l.children[1],p=ia(t,s);u.textContent!==p&&(u.textContent=p);const f=l.children[2].firstElementChild,h=oa(o[s]);f.getAttribute("d")!==h&&f.setAttribute("d",h)}}const aa=200;function jn(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function Q(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=N(e.permalink.scenario);e.traffic=new Mn(kn(e.permalink.seed)),jn(e,o),fe(e.paneA),fe(e.paneB),e.paneA=null,e.paneB=null;try{const i=await Vt(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);ee(t.paneA,e.permalink.strategyA),Z(t.paneA,e.permalink.repositionA),hn(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await Vt(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),ee(t.paneB,e.permalink.strategyB),Z(t.paneB,e.permalink.repositionB),hn(t.paneB.metrics)}catch(l){throw fe(i),l}if(n!==e.initToken){fe(i),fe(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,zn(e,t),Un(e,t),je(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&D(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function sa(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<aa&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if(lt(e,l=>{const a=l.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);a.kind==="err"&&console.warn(`spawnRider failed (seed): ${a.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(jn(e,N(e.permalink.scenario)),e.seeding=null)}function la(e,t){const n=()=>Q(e,t),o={renderPaneStrategyInfo:ee,renderPaneRepositionInfo:Z,refreshStrategyPopovers:()=>{ye(e,t,n),me(e,t,n)},renderTweakPanel:()=>{const r=N(e.permalink.scenario);je(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const l=r.target;if(!(l instanceof HTMLElement))return;const a=l.closest(".scenario-card");if(!a)return;const s=a.dataset.scenarioId;!s||s===e.permalink.scenario||In(e,t,s,n,o)}),nn(e,t,t.paneA,n),nn(e,t,t.paneB,n),Zt(e,t,t.paneA,n),Zt(e,t,t.paneB,n),ye(e,t,n),me(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},H(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",ye(e,t,n),me(e,t,n),Q(e,t).then(()=>{D(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||$.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},H(e.permalink),Q(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=Gn();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},H(e.permalink),Q(e,t).then(()=>{D(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=qn(r)}),t.speedInput.addEventListener("change",()=>{H(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=Hn(r)}),t.intensityInput.addEventListener("change",()=>{H(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{Q(e,t),D(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";Nn(t,r)});for(const r of ce){const l=t.tweakRows[r];Lt(l.dec,()=>{Ae(e,t,r,-1,n)}),Lt(l.inc,()=>{Ae(e,t,r,1,n)}),l.reset.addEventListener("click",()=>{Rr(e,t,r,n)}),l.root.addEventListener("keydown",a=>{a.key==="ArrowUp"||a.key==="ArrowRight"?(a.preventDefault(),Ae(e,t,r,1,n)):(a.key==="ArrowDown"||a.key==="ArrowLeft")&&(a.preventDefault(),Ae(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{xr(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=vn(e.permalink),l=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(l).then(()=>{D(t.toast,"Permalink copied")},()=>{D(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{be(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{be(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&be(t,!1)}),ca(e,t,o),Ir(t)}function ca(e,t,n){window.addEventListener("keydown",o=>{if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable)return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),be(t,t.shortcutSheet.hidden);return}case"Escape":{if(Dn(t)||Wn(t)){o.preventDefault(),Ue(t);return}t.shortcutSheet.hidden||(o.preventDefault(),be(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=Se.length){const r=Se[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),In(e,t,r.id,()=>Q(e,t),n))}})}function da(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=ra(t.latestMetrics,n.latestMetrics);rt(t.metricsEl,t.latestMetrics,o.a,t.metricHistory),rt(n.metricsEl,n.latestMetrics,o.b,n.metricHistory)}else rt(t.metricsEl,t.latestMetrics,null,t.metricHistory);Qt(t),n&&Qt(n)}function pa(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const l=e.paneA,a=e.paneB,s=l!==null&&(!e.permalink.compare||a!==null);if(e.running&&e.ready&&s){const c=e.permalink.speed;lt(e,m=>{m.sim.step(c);const b=m.sim.drainEvents();if(b.length>0){const v=m.sim.snapshot();vr(m,b,v);const _=new Map;for(const I of v.cars)_.set(I.id,I.line);for(const I of b)if(I.kind==="elevator-assigned"){const y=_.get(I.elevator);y!==void 0&&m.renderer.pushAssignment(I.stop,I.elevator,y)}}}),e.seeding&&sa(e);const u=l.sim.snapshot(),d=Math.min(r,4/60)*c,f=e.seeding?[]:e.traffic.drainSpawns(u,d);for(const m of f)lt(e,b=>{const v=b.sim.spawnRider(m.originStopId,m.destStopId,m.weight,m.patienceTicks);v.kind==="err"&&console.warn(`spawnRider failed: ${v.error}`)});const h=e.permalink.speed;Kt(l,l.sim.snapshot(),h),a&&Kt(a,a.sim.snapshot(),h),da(e),(n+=1)%4===0&&(zn(e,t),Un(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function fa(){En().catch(()=>{});const t=Tr(),n=new URLSearchParams(window.location.search).has("k"),o={...$,...yo(window.location.search)};if(!n){o.seed=Gn();const a=new URL(window.location.href);a.searchParams.set("k",o.seed),window.history.replaceState(null,"",a.toString())}Co(o);const i=N(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=gn(i,o.overrides),na(o,t);const l={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new Mn(kn(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};la(l,t),await Q(l,t),l.ready=!0,pa(l,t),l.permalink.mode==="quest"&&await gi({initialStageId:l.permalink.questStage,onStageChange:a=>{l.permalink.questStage=a;const s=new URL(window.location.href);a===$.questStage?s.searchParams.delete("qs"):s.searchParams.set("qs",a),window.history.replaceState(null,"",s.toString())}})}fa();export{De as _};
