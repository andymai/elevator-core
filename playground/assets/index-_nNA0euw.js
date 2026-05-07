const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-CXiiCSy2.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&i(c)}).observe(document,{childList:!0,subtree:!0});function n(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(o){if(o.ep)return;o.ep=!0;const r=n(o);fetch(o.href,r)}})();function te(e,t,n){const i=document.createElement(e);return i.className=t,n!==void 0&&(i.textContent=n),i}let Yt=0;function N(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(Yt),Yt=window.setTimeout(()=>{e.classList.remove("show")},1600)}function Kt(e,t){let o=0,r=0;const c=()=>{o&&window.clearTimeout(o),r&&window.clearInterval(r),o=0,r=0};e.addEventListener("pointerdown",a=>{e.disabled||(a.preventDefault(),t(),o=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){c();return}t()},70)},380))}),e.addEventListener("pointerup",c),e.addEventListener("pointerleave",c),e.addEventListener("pointercancel",c),e.addEventListener("blur",c),e.addEventListener("click",a=>{a.pointerType||t()})}function Li(){document.getElementById("seo-fallback")?.remove()}function Fi(e){document.title!==e.title&&(document.title=e.title),me('meta[name="description"]',"content",e.description),me('meta[property="og:title"]',"content",e.title),me('meta[property="og:description"]',"content",e.description),me('meta[name="twitter:title"]',"content",e.title),me('meta[name="twitter:description"]',"content",e.description)}function me(e,t,n){const i=document.querySelector(e);i&&i.getAttribute(t)!==n&&i.setAttribute(t,n)}function ne(e,t,n){const i=Mt(e,t),o=n[t];if(o===void 0||!Number.isFinite(o))return i;const r=e.tweakRanges[t];return Un(o,r.min,r.max)}function Mt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return Gn(n.doorOpenTicks,n.doorTransitionTicks)}}function Pt(e,t,n){const i=Mt(e,t),o=e.tweakRanges[t].step/2;return Math.abs(n-i)>o}function Nn(e,t){const n={};for(const i of he){const o=t[i];o!==void 0&&Pt(e,i,o)&&(n[i]=o)}return n}const he=["cars","maxSpeed","weightCapacity","doorCycleSec"];function Bi(e,t){const{doorOpenTicks:n,doorTransitionTicks:i}=e.elevatorDefaults,o=Gn(n,i),r=Un(n/(o*ze),.1,.9),c=Math.max(2,Math.round(t*ze)),a=Math.max(1,Math.round(c*r)),s=Math.max(1,Math.round((c-a)/2));return{openTicks:a,transitionTicks:s}}function Gn(e,t){return(e+2*t)/ze}function Lt(e,t){const n=e.elevatorDefaults,i=ne(e,"maxSpeed",t),o=ne(e,"weightCapacity",t),r=ne(e,"doorCycleSec",t),{openTicks:c,transitionTicks:a}=Bi(e,r);return{...n,maxSpeed:i,weightCapacity:o,doorOpenTicks:c,doorTransitionTicks:a}}function $i(e,t){if(e<1||t<1)return[];const n=[];for(let i=0;i<t;i+=1)n.push(Math.min(e-1,Math.floor(i*e/t)));return n}function Di(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const i=Math.round(ne(e,"cars",t)),o=Lt(e,t),r=$i(e.stops.length,i),c=e.stops.map((s,l)=>`        StopConfig(id: StopId(${l}), name: ${vt(s.name)}, position: ${j(s.positionM)}),`).join(`
`),a=r.map((s,l)=>Wi(l,o,s,Oi(l,i))).join(`
`);return`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: ${vt(e.buildingName)},
        stops: [
${c}
        ],
    ),
    elevators: [
${a}
    ],
    simulation: SimulationParams(ticks_per_second: ${j(ze)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${j(e.passengerWeightRange[0])}, ${j(e.passengerWeightRange[1])}),
    ),
)`}const ze=60;function Un(e,t,n){return Math.min(n,Math.max(t,e))}function Oi(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function Wi(e,t,n,i){const o=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${j(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${j(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${vt(i)},
            max_speed: ${j(t.maxSpeed)}, acceleration: ${j(t.acceleration)}, deceleration: ${j(t.deceleration)},
            weight_capacity: ${j(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${o}${r}
        ),`}function vt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function j(e){return Number.isInteger(e)?`${e}.0`:String(e)}const jn={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function $e(e){return Array.from({length:e},()=>1)}const le=5,qi=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:le},(e,t)=>t===le-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:$e(le),destWeights:$e(le)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:$e(le),destWeights:$e(le)}],Hi={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:qi,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...jn,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},Ve=19,kt=16,Re=4,zn=(1+Ve)*Re,we=1,ve=41,ke=42,Ni=43;function U(e){return Array.from({length:Ni},(t,n)=>e(n))}const de=e=>e===we||e===ve||e===ke,Gi=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:U(e=>e===0?20:e===we?2:e===ve?1.2:e===ke?.2:.1),destWeights:U(e=>e===0?0:e===we?.3:e===ve?.4:e===ke?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:U(e=>de(e)?.5:1),destWeights:U(e=>de(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:U(e=>e===21?4:de(e)?.25:1),destWeights:U(e=>e===21?5:de(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:U(e=>e===0||e===we||e===21?.3:e===ve?.4:e===ke?1.2:1),destWeights:U(e=>e===0?20:e===we?1:e===ve?.6:e===ke?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:U(e=>de(e)?1.5:.2),destWeights:U(e=>de(e)?1.5:.2)}];function Ui(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let a=1;a<=Ve;a++){const s=1+a,l=a*Re;e.push(`        StopConfig(id: StopId(${s.toString().padStart(2," ")}), name: "Floor ${a}",    position: ${l.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${zn.toFixed(1)}),`);for(let a=21;a<=20+kt;a++){const s=1+a,l=a*Re;e.push(`        StopConfig(id: StopId(${s}), name: "Floor ${a}",   position: ${l.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:Ve},(a,s)=>2+s),21],n=[21,...Array.from({length:kt},(a,s)=>22+s)],i=[1,21,38,39,40],o=[1,0,41,42],r=a=>a.map(s=>`StopId(${s})`).join(", "),c=(a,s,l,f)=>`                ElevatorConfig(
                    id: ${a}, name: "${s}",
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
                serves: [${r(i)}],
                elevators: [
${c(3,"VIP",1,350)}
                ],
            ),
            LineConfig(
                id: 3, name: "Service",
                serves: [${r(o)}],
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
)`}const ji=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:Ve},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*Re})),{name:"Sky Lobby",positionM:zn},...Array.from({length:kt},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*Re})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],zi={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:Gi,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:ji,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...jn,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:Ui()},Qt=1e5,Jt=4e5,Zt=35786e3,Vi=1e8,Xi=4;function De(e){return Array.from({length:Xi},(t,n)=>e(n))}const Yi={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:De(e=>e===0?6:1),destWeights:De(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:De(e=>e===0?0:e===1?1:e===2?3:5),destWeights:De(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:Qt},{name:"LEO Transfer",positionM:Jt},{name:"GEO Platform",positionM:Zt}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:Vi,showDayNight:!1},ron:`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${Qt.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${Jt.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${Zt.toFixed(1)}),
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
)`},Ee=[zi,Yi,Hi];function H(e){const t=Ee.find(i=>i.id===e);if(t)return t;const n=Ee[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const Vn={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},O={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},Ki=["scan","look","nearest","etd","destination","rsr"],Qi=["adaptive","predictive","lobby","spread","none"];function en(e,t){return e!==null&&Ki.includes(e)?e:t}function tn(e,t){return e!==null&&Qi.includes(e)?e:t}const _t=new Set;function Ji(e){return _t.add(e),()=>_t.delete(e)}function q(e){const t=Xn(e);if(window.location.search!==t){window.history.replaceState(null,"",t);for(const n of _t)n(e)}}function Zi(e,t){return e==="compare"||e==="quest"?e:t}function Xn(e){const t=new URLSearchParams;e.mode!==O.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==O.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=H(e.scenario).defaultReposition,i=n??O.repositionA,o=n??O.repositionB;e.repositionA!==i&&t.set("pa",e.repositionA),e.repositionB!==o&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of he){const c=e.overrides[r];c!==void 0&&Number.isFinite(c)&&t.set(Vn[r],to(c))}return`?${t.toString()}`}function eo(e){const t=new URLSearchParams(e),n={};for(const i of he){const o=t.get(Vn[i]);if(o===null)continue;const r=Number(o);Number.isFinite(r)&&(n[i]=r)}return{mode:Zi(t.get("m"),O.mode),questStage:(t.get("qs")??"").trim()||O.questStage,scenario:t.get("s")??O.scenario,strategyA:en(t.get("a")??t.get("d"),O.strategyA),strategyB:en(t.get("b"),O.strategyB),repositionA:tn(t.get("pa"),O.repositionA),repositionB:tn(t.get("pb"),O.repositionB),compare:t.has("c")?t.get("c")==="1":O.compare,seed:(t.get("k")??"").trim()||O.seed,intensity:nn(t.get("i"),O.intensity),speed:nn(t.get("x"),O.speed),overrides:n}}function nn(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function to(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function Yn(e){let t=2166136261;const n=e.trim();for(let i=0;i<n.length;i++)t^=n.charCodeAt(i),t=Math.imul(t,16777619);return t>>>0}const no=["scan","look","nearest","etd","destination","rsr"],fe={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},Kn={scan:"Sweep end-to-end, reverse at each end.",look:"Sweep until last call, then reverse.",nearest:"Assign each call to the closest car.",etd:"Assign by estimated time-to-destination.",destination:"Riders enter destination at the lobby; the group optimises.",rsr:"ETD penalised by queue length."},io=["adaptive","predictive","lobby","spread","none"],xe={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},Qn={adaptive:"Switch by traffic mode; the default.",predictive:"Park near the most-active floor.",lobby:"Return idle cars to the lobby.",spread:"Fan idle cars across the shaft.",none:"Idle cars stay where they finished."},oo="scenario-card inline-flex items-center gap-1.5 px-2 py-1 border-b-2 border-b-transparent text-content-tertiary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:text-content aria-pressed:text-content aria-pressed:border-b-accent max-md:flex-none max-md:snap-start",ro="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function ao(e){const t=document.createDocumentFragment();Ee.forEach((n,i)=>{const o=te("button",oo);o.type="button",o.dataset.scenarioId=n.id,o.setAttribute("aria-pressed","false"),o.title=n.description,o.append(te("span","",n.label),te("span",ro,String(i+1))),t.appendChild(o)}),e.scenarioCards.replaceChildren(t)}function Jn(e,t){for(const n of e.scenarioCards.children){const i=n;i.setAttribute("aria-pressed",i.dataset.scenarioId===t?"true":"false")}}async function Zn(e,t,n,i,o){const r=H(n),c=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,a=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:c,repositionA:a,overrides:{}},q(e.permalink),o.renderPaneStrategyInfo(t.paneA,c),o.renderPaneRepositionInfo(t.paneA,a),o.refreshStrategyPopovers(),Jn(t,r.id),await i(),o.renderTweakPanel(),N(t.toast,`${r.label} · ${fe[c]}`)}function so(e){const t=H(e.scenario);e.scenario=t.id}const co=["layout","scenario-picker","controls-bar","cabin-legend"],lo=["quest-pane"];function po(e){const t=e==="quest";for(const n of co){const i=document.getElementById(n);i&&i.classList.toggle("hidden",t)}for(const n of lo){const i=document.getElementById(n);i&&(i.classList.toggle("hidden",!t),i.classList.toggle("flex",t))}}function uo(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const i of n){const o=i.dataset.mode===e;i.dataset.active=String(o),i.setAttribute("aria-pressed",String(o))}t.addEventListener("click",i=>{const o=i.target;if(!(o instanceof HTMLElement))return;const r=o.closest("button[data-mode]");if(!r)return;const c=r.dataset.mode;if(c!=="compare"&&c!=="quest"||c===e)return;const a=new URL(window.location.href);c==="compare"?(a.searchParams.delete("m"),a.searchParams.delete("qs")):a.searchParams.set("m",c),window.location.assign(a.toString())})}const fo="modulepreload",ho=function(e,t){return new URL(e,t).href},on={},Xe=function(t,n,i){let o=Promise.resolve();if(n&&n.length>0){let c=function(f){return Promise.all(f.map(p=>Promise.resolve(p).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const a=document.getElementsByTagName("link"),s=document.querySelector("meta[property=csp-nonce]"),l=s?.nonce||s?.getAttribute("nonce");o=c(n.map(f=>{if(f=ho(f,i),f in on)return;on[f]=!0;const p=f.endsWith(".css"),d=p?'[rel="stylesheet"]':"";if(!!i)for(let g=a.length-1;g>=0;g--){const S=a[g];if(S.href===f&&(!p||S.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=p?"stylesheet":fo,p||(h.as="script"),h.crossOrigin="",h.href=f,l&&h.setAttribute("nonce",l),document.head.appendChild(h),p)return new Promise((g,S)=>{h.addEventListener("load",g),h.addEventListener("error",()=>S(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(c){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=c,window.dispatchEvent(a),!a.defaultPrevented)throw c}return o.then(c=>{for(const a of c||[])a.status==="rejected"&&r(a.reason);return t().catch(r)})};class ei extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function go(e){const t=(await Xe(async()=>{const{default:o}=await import("./worker-DE_xV-Fq.js");return{default:o}},[],import.meta.url)).default,n=new t,i=new mo(n);return await i.init(e),i}class mo{#e;#t=new Map;#n=1;#o=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#c),this.#e.addEventListener("error",this.#i),this.#e.addEventListener("messageerror",this.#i)}async init(t){await this.#s({kind:"init",id:this.#a(),payload:this.#d(t)})}async tick(t,n){const i=n?.wantVisuals??!1;return this.#s({kind:"tick",id:this.#a(),ticks:t,...i?{wantVisuals:!0}:{}})}async spawnRider(t,n,i,o){return this.#s({kind:"spawn-rider",id:this.#a(),origin:t,destination:n,weight:i,...o!==void 0?{patienceTicks:o}:{}})}async setStrategy(t){await this.#s({kind:"set-strategy",id:this.#a(),strategy:t})}async loadController(t,n){const i=n?.unlockedApi??null,o=n?.timeoutMs,r=this.#s({kind:"load-controller",id:this.#a(),source:t,unlockedApi:i});if(o===void 0){await r;return}r.catch(()=>{});let c;const a=new Promise((s,l)=>{c=setTimeout(()=>{l(new Error(`controller did not return within ${o}ms`))},o)});try{await Promise.race([r,a])}finally{c!==void 0&&clearTimeout(c)}}async reset(t){await this.#s({kind:"reset",id:this.#a(),payload:this.#d(t)})}dispose(){this.#o||(this.#o=!0,this.#e.removeEventListener("message",this.#c),this.#e.removeEventListener("error",this.#i),this.#e.removeEventListener("messageerror",this.#i),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#a(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,i=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:i,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#s(t){if(this.#o)throw new Error("WorkerSim disposed");return new Promise((n,i)=>{this.#t.set(t.id,{resolve:n,reject:i}),this.#e.postMessage(t)})}#i=t=>{const n=t.message,i=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#o=!0,this.#e.terminate(),this.#r(new Error(i))};#c=t=>{const n=t.data,i=this.#t.get(n.id);if(i)switch(this.#t.delete(n.id),n.kind){case"ok":i.resolve(void 0);return;case"tick-result":i.resolve(n.result);return;case"spawn-result":n.error!==null?i.reject(new Error(n.error)):i.resolve(n.riderId);return;case"error":{const o=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;i.reject(o!==null?new ei(n.message,o):new Error(n.message));return}default:{const o=n.kind;i.reject(new Error(`WorkerSim: unknown reply kind "${String(o)}"`));return}}}}const bo=`// Quest curriculum — sim global declaration.
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
`,rn="quest-runtime";let at=null,pe=null;async function yo(){return at||pe||(pe=(async()=>{await So();const e=await Xe(()=>import("./editor.main-CXiiCSy2.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return at=e,e})(),pe.catch(()=>{pe=null}),pe)}async function So(){const[{default:e},{default:t}]=await Promise.all([Xe(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),Xe(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,i){return i==="typescript"||i==="javascript"?new e:new t}}}function wo(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(bo,"ts:filename/quest-sim-globals.d.ts"))}function vo(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function ko(e){const t=await yo();wo(t),vo(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:i=>{n.setValue(i)},onDidChange(i){const o=n.onDidChangeModelContent(()=>{i()});return{dispose:()=>{o.dispose()}}},insertAtCursor(i){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:i,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(i){const o=n.getModel();if(!o)return;const r=i.message.split(`
`)[0]??i.message;t.editor.setModelMarkers(o,rn,[{severity:8,message:r,startLineNumber:i.line,startColumn:i.column,endLineNumber:i.line,endColumn:i.column+1}]),n.revealLineInCenterIfOutsideViewport(i.line)},clearRuntimeMarker(){const i=n.getModel();i&&t.editor.setModelMarkers(i,rn,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const _o=`SimConfig(
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
)`,Co={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:_o,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},To=`SimConfig(
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
)`,Ro={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:To,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},Eo=`SimConfig(
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
)`,xo={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:Eo,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},Io=`SimConfig(
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
)`,Ao={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:Io,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function $(e,t){const n=t.startTick??0,i=t.intervalTicks??30,o=t.destinations;if(o.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,c)=>{const a=o[c%o.length];return{origin:t.origin,destination:a,atTick:n+c*i,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const Mo=`SimConfig(
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
)`,Po={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:Mo,unlockedApi:["setStrategy"],seedRiders:[...$(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},Lo=`SimConfig(
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
)`,Fo=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,Bo={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:Lo,unlockedApi:["setStrategyJs"],seedRiders:[...$(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...$(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:Fo,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},$o=`SimConfig(
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
)`,Do={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:$o,unlockedApi:["setStrategyJs"],seedRiders:[...$(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...$(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},Oo=`SimConfig(
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
)`,Wo=`// Stage 8 — Event-Driven
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
`,qo={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:Oo,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...$(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...$(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:Wo,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},Ho=`SimConfig(
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
)`,No=`// Stage 9 — Take the Wheel
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
`,Go={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:Ho,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...$(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:No,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},Uo=`SimConfig(
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
)`,jo=`// Stage 10 — Patient Boarding
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
`,zo={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:Uo,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...$(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:jo,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},Vo=`SimConfig(
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
)`,Xo=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,Yo={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:Vo,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...$(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...$(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:Xo,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},Ko=`SimConfig(
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
)`,Qo=`// Stage 12 — Routes
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
`,Jo={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:Ko,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...$(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...$(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:Qo,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},Zo=`SimConfig(
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
)`,er=`// Stage 13 — Transfer Points
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
`,tr={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:Zo,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...$(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...$(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...$(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:er,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},nr=`SimConfig(
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
)`,ir=`// Stage 14 — Build a Floor
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
`,or={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:nr,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...$(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:ir,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},rr=`SimConfig(
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
)`,ar=`// Stage 15 — Sky Lobby
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
`,sr={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:rr,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...$(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...$(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:ar,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},ie=[Co,Ro,xo,Ao,Po,Bo,Do,qo,Go,zo,Yo,Jo,tr,or,sr];function cr(e){return ie.find(t=>t.id===e)}function lr(e){const t=ie.findIndex(n=>n.id===e);if(!(t<0))return ie[t+1]}function M(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function Je(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const Ye="quest:code:v1:",ti="quest:bestStars:v1:",ni=5e4;function Ie(){try{return globalThis.localStorage??null}catch{return null}}function an(e){const t=Ie();if(!t)return null;try{const n=t.getItem(Ye+e);if(n===null)return null;if(n.length>ni){try{t.removeItem(Ye+e)}catch{}return null}return n}catch{return null}}function sn(e,t){if(t.length>ni)return;const n=Ie();if(n)try{n.setItem(Ye+e,t)}catch{}}function dr(e){const t=Ie();if(t)try{t.removeItem(Ye+e)}catch{}}function Ae(e){const t=Ie();if(!t)return 0;let n;try{n=t.getItem(ti+e)}catch{return 0}if(n===null)return 0;const i=Number.parseInt(n,10);return!Number.isInteger(i)||i<0||i>3?0:i}function pr(e,t){const n=Ae(e);if(t<=n)return;const i=Ie();if(i)try{i.setItem(ti+e,String(t))}catch{}}const ur={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},fr=["basics","strategies","events-manual","topology"],ii=3;function hr(){return{root:M("quest-grid","quest-grid"),progress:M("quest-grid-progress","quest-grid"),sections:M("quest-grid-sections","quest-grid")}}function st(e,t){Je(e.sections);let n=0;const i=ie.length*ii;for(const o of fr){const r=ie.filter(l=>l.section===o);if(r.length===0)continue;const c=document.createElement("section");c.dataset.section=o;const a=document.createElement("h2");a.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",a.textContent=ur[o],c.appendChild(a);const s=document.createElement("div");s.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const l of r){const f=Ae(l.id);n+=f,s.appendChild(gr(l,f,t))}c.appendChild(s),e.sections.appendChild(c)}e.progress.textContent=`${n} / ${i}`}function gr(e,t,n){const i=ie.findIndex(p=>p.id===e.id),o=String(i+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const c=document.createElement("div");c.className="flex items-baseline justify-between gap-2";const a=document.createElement("span");a.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",a.textContent=o,c.appendChild(a);const s=document.createElement("span");s.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",s.classList.add(t>0?"text-accent":"text-content-disabled"),s.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),s.textContent="★".repeat(t)+"☆".repeat(ii-t),c.appendChild(s),r.appendChild(c);const l=document.createElement("div");l.className="text-content text-[13px] font-semibold tracking-[-0.01em]",l.textContent=e.title,r.appendChild(l);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const mr=75;async function cn(e,t,n,i){let o=n;for(;o<t.length;){const r=t[o];if(r===void 0||(r.atTick??0)>i)break;await e.spawnRider(r.origin,r.destination,r.weight??mr,r.patienceTicks),o+=1}return o}async function br(e,t,n={}){const i=n.maxTicks??1500,o=n.batchTicks??60,r=await go({configRon:e.configRon,strategy:"scan"});try{const c=[...e.seedRiders].sort((d,u)=>(d.atTick??0)-(u.atTick??0));let a=await cn(r,c,0,0);const s={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(s.timeoutMs=n.timeoutMs),await r.loadController(t,s);let l=null,f=0;const p=n.onSnapshot!==void 0;for(;f<i;){const d=i-f,u=Math.min(o,d),h=await r.tick(u,p?{wantVisuals:!0}:void 0);l=h.metrics,f=h.tick,a=await cn(r,c,a,f);const g=ln(l,f);if(n.onProgress)try{n.onProgress(g)}catch{}if(n.onSnapshot&&h.snapshot)try{n.onSnapshot(h.snapshot)}catch{}if(e.passFn(g))return dn(e,g,!0)}if(l===null)throw new Error("runStage: maxTicks must be positive");return dn(e,ln(l,f),!1)}finally{r.dispose()}}function ln(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function dn(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let i=1;return e.starFns[0]?.(t)&&(i=2,e.starFns[1]?.(t)&&(i=3)),{passed:!0,stars:i,grade:t}}function yr(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const i=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(i)&&i>0&&n.push(`${i.toFixed(1)}s avg wait`),n.join(" · ")}const oi=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(oi.map(e=>[e.name,e]));function ri(e){const t=new Set(e);return oi.filter(n=>t.has(n.name))}function Sr(){return{root:M("quest-api-panel","api-panel")}}function pn(e,t){Je(e.root);const n=ri(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const i=document.createElement("p");i.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",i.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(i);const o=document.createElement("ul");o.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const c=document.createElement("li");c.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const a=document.createElement("code");a.className="block font-mono text-[12px] text-content",a.textContent=r.signature,c.appendChild(a);const s=document.createElement("p");s.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",s.textContent=r.description,c.appendChild(s),o.appendChild(c)}e.root.appendChild(o)}function wr(){return{root:M("quest-hints","hints-drawer"),count:M("quest-hints-count","hints-drawer"),list:M("quest-hints-list","hints-drawer")}}const un="quest-hints-more";function fn(e,t){Je(e.list);for(const i of e.root.querySelectorAll(`.${un}`))i.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((i,o)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=i,o>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const i=document.createElement("button");i.type="button",i.className=`${un} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,i.textContent=`Show ${n-1} more`,i.addEventListener("click",()=>{for(const o of e.list.querySelectorAll("li[hidden]"))o.hidden=!1;i.remove()}),e.root.appendChild(i)}e.root.removeAttribute("open")}function vr(e,t){return{activeStage:e,currentView:t,runLoop:{active:!1}}}function kr(e,t){e.activeStage=t}function ct(e,t){e.currentView=t}function hn(e){e.runLoop.active=!1}function be(e,t){return e.currentView==="stage"&&e.activeStage.id===t.id}function _r(){return{root:M("quest-reference","reference-panel"),status:M("quest-reference-status","reference-panel"),code:M("quest-reference-code","reference-panel")}}function lt(e,t,n={}){const i=t.referenceSolution,o=Ae(t.id);if(!i||o===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=o===3?"(mastered)":"(unlocked)",e.code.textContent=i,n.collapse!==!1&&e.root.removeAttribute("open")}function Cr(){const e="results-modal";return{root:M("quest-results-modal",e),title:M("quest-results-title",e),stars:M("quest-results-stars",e),detail:M("quest-results-detail",e),close:M("quest-results-close",e),retry:M("quest-results-retry",e),next:M("quest-results-next",e)}}function Tr(e,t,n,i,o){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=Rr(t.grade,t.passed,i),e.retry.onclick=()=>{dt(e),n()},e.close.onclick=()=>{dt(e)};const r=o;r?(e.next.hidden=!1,e.next.onclick=()=>{dt(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function dt(e){e.root.classList.remove("show")}function Rr(e,t,n){const i=`tick ${e.endTick}`,o=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${o} · finished by ${i}.`;if(n)try{const r=n(e);if(r)return`${o}. ${r}`}catch{}return`${o}. The pass condition wasn't met within the run budget.`}const Er={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function gn(e){return Er[e]??`sim.${e}();`}function xr(){return{root:M("quest-snippets","snippet-picker")}}function mn(e,t,n){Je(e.root);const i=ri(t.unlockedApi);if(i.length!==0)for(const o of i){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=o.name,r.title=`Insert: ${gn(o.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(gn(o.name))}),e.root.appendChild(r)}}function Ct(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const i=parseInt(n[1],16),o=i>>16&255,r=i>>8&255,c=i&255,a=s=>t>=0?Math.round(s+(255-s)*t):Math.round(s*(1+t));return`rgb(${a(o)}, ${a(r)}, ${a(c)})`}function Ft(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const i=parseInt(n[1],16),o=i>>16&255,r=i>>8&255,c=i&255;return`rgba(${o}, ${r}, ${c}, ${t})`}function ai(e,t){if(/^#[0-9a-f]{6}$/i.test(e)){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Ft(e,t)}function Ir(e,t,n,i,o){const r=(e+n)/2,c=(t+i)/2,a=n-e,s=i-t,l=Math.max(Math.hypot(a,s),1),f=-s/l,p=a/l,d=Math.min(l*.25,22),u=r+f*d,h=c+p*d,g=1-o;return[g*g*e+2*g*o*u+o*o*n,g*g*t+2*g*o*h+o*o*i]}function Ar(e){let r=e;for(let a=0;a<3;a++){const s=1-r,l=3*s*s*r*.2+3*s*r*r*.2+r*r*r,f=3*s*s*.2+6*s*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(l-e)/f,r=Math.max(0,Math.min(1,r))}const c=1-r;return 3*c*c*r*.6+3*c*r*r*1+r*r*r}const Bt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},Mr="#2a2a35",Pr="#a1a1aa",z='"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',Lr=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],Fr=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],Br="rgba(8, 10, 14, 0.55)",$r="#3a3a45",Dr=[1,1,.5,.42],Or=["LOW","HIGH","VIP","SERVICE"],Wr="#e6c56b",qr="#9bd4c4",Hr=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],Nr="#a1a1aa",Gr="#4a4a55",Ur="#f59e0b",si="#7dd3fc",ci="#fda4af",pt="#fafafa",li="#8b8c92",di="rgba(250, 250, 250, 0.95)",jr=260,bn=3,zr=.05,yn=["standard","briefcase","bag","short","tall"];function ue(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,yn[n%yn.length]??"standard"}function Vr(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function pi(e,t,n,i,o,r="standard"){const c=Vr(r,i),s=n-.5,l=s-c.bodyH,f=l-c.neckGap-c.headR,p=c.bodyH*.08,d=s-c.headR*.8;if(e.fillStyle=o,e.beginPath(),e.moveTo(t-c.shoulderW/2,l+p),e.lineTo(t-c.shoulderW/2+p,l),e.lineTo(t+c.shoulderW/2-p,l),e.lineTo(t+c.shoulderW/2,l+p),e.lineTo(t+c.waistW/2,d),e.lineTo(t+c.footW/2,s),e.lineTo(t-c.footW/2,s),e.lineTo(t-c.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,c.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const u=Math.max(1.6,c.headR*.9),h=t+c.waistW/2+u*.1,g=s-u-.5;e.fillRect(h,g,u,u);const S=u*.55;e.fillRect(h+(u-S)/2,g-1,S,1)}else if(r==="bag"){const u=Math.max(1.3,c.headR*.9),h=t-c.shoulderW/2-u*.35,g=l+c.bodyH*.35;e.beginPath(),e.arc(h,g,u,0,Math.PI*2),e.fill(),e.strokeStyle=o,e.lineWidth=.8,e.beginPath(),e.moveTo(h+u*.2,g-u*.8),e.lineTo(t+c.shoulderW/2-p,l+.5),e.stroke()}else if(r==="tall"){const u=c.headR*2.1,h=Math.max(1,c.headR*.45);e.fillRect(t-u/2,f-c.headR-h+.4,u,h)}}function Xr(e,t,n,i,o,r,c,a,s){const f=Math.max(1,Math.floor((o-14)/a.figureStride)),p=Math.min(r,f),d=-2;for(let u=0;u<p;u++){const h=t+d+i*u*a.figureStride,g=u+0,S=ue(s,g);pi(e,h,n,a.figureHeadR,c,S)}if(r>p){e.fillStyle=li,e.font=`${a.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const u=t+d+i*p*a.figureStride;e.fillText(`+${r-p}`,u,n-1)}}function Y(e,t,n,i,o,r){const c=Math.min(r,i/2,o/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,i,o,c);return}e.moveTo(t+c,n),e.lineTo(t+i-c,n),e.quadraticCurveTo(t+i,n,t+i,n+c),e.lineTo(t+i,n+o-c),e.quadraticCurveTo(t+i,n+o,t+i-c,n+o),e.lineTo(t+c,n+o),e.quadraticCurveTo(t,n+o,t,n+o-c),e.lineTo(t,n+c),e.quadraticCurveTo(t,n,t+c,n),e.closePath()}function Yr(e,t,n){if(e.measureText(t).width<=n)return t;const i="…";let o=0,r=t.length;for(;o<r;){const c=o+r+1>>1;e.measureText(t.slice(0,c)+i).width<=n?o=c:r=c-1}return o===0?i:t.slice(0,o)+i}function Kr(e,t){for(const n of t){const i=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-i,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const i=n.width/2;e.strokeStyle=n.frame;const o=n.cx-i+.5,r=n.cx+i-.5;e.beginPath(),e.moveTo(o,n.top),e.lineTo(o,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function Qr(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px ${z}`,e.textBaseline="alphabetic",e.textAlign="center";const i=n.padTop-n.fontSmall*.5-2,o=i-n.fontSmall*.5-1,r=i+n.fontSmall*.5+1,c=Math.max(n.fontSmall+.5,o);for(const a of t){const s=a.top-3,l=s>o&&s-n.fontSmall<r;e.fillStyle=a.color,e.fillText(a.text,a.cx,l?c:s)}}function Jr(e,t,n,i,o,r,c,a,s){e.font=`500 ${i.fontMain.toFixed(0)}px ${z}`,e.textBaseline="middle";const l=i.padX,f=i.padX+i.labelW,p=r-i.padX,d=i.shaftInnerW/2,u=Math.min(i.shaftInnerW*1.8,(p-f)/2),h=[...t.stops].sort((g,S)=>g.y-S.y);for(let g=0;g<h.length;g++){const S=h[g];if(S===void 0)continue;const w=n(S.y),R=h[g+1],v=R!==void 0?n(R.y):a;if(e.strokeStyle=Mr,e.lineWidth=s?2:1,e.beginPath(),s)for(const y of o)e.moveTo(y-u,w+.5),e.lineTo(y+u,w+.5);else{let y=f;for(const k of o){const b=k-d,C=k+d;b>y&&(e.moveTo(y,w+.5),e.lineTo(b,w+.5)),y=C}y<p&&(e.moveTo(y,w+.5),e.lineTo(p,w+.5))}e.stroke();for(let y=0;y<o.length;y++){const k=o[y];if(k===void 0)continue;const b=c.has(`${y}:${S.entity_id}`);e.strokeStyle=b?Ur:Gr,e.lineWidth=b?1.4:1,e.beginPath(),e.moveTo(k-d-2,w+.5),e.lineTo(k-d,w+.5),e.moveTo(k+d,w+.5),e.lineTo(k+d+2,w+.5),e.stroke()}const m=s?w:(w+v)/2;e.fillStyle=Pr,e.textAlign="right",e.fillText(Yr(e,S.name,i.labelW-4),l+i.labelW-4,m)}}function Zr(e,t,n,i,o,r){for(const c of t.stops){if(c.waiting_by_line.length===0)continue;const a=r.get(c.entity_id);if(a===void 0||a.size===0)continue;const s=n(c.y),l=c.waiting_up>=c.waiting_down?si:ci;for(const f of c.waiting_by_line){if(f.count===0)continue;const p=a.get(f.line);if(p===void 0)continue;const d=o.get(p);if(d===void 0)continue;const u=d.end-d.start;u<=i.figureStride||Xr(e,d.end-2,s,-1,u,f.count,l,i,c.entity_id)}}}function ea(e,t,n,i,o,r,c,a,s,l=!1){const f=i*.22,p=(o-4)/10.5,d=Math.max(1.2,Math.min(a.figureHeadR,f,p)),u=a.figureStride*(d/a.figureHeadR),h=3,g=2,S=i-h*2,R=Math.max(1,Math.floor((S-16)/u)),v=Math.min(r,R),m=v*u,y=t-m/2+u/2,k=n-g;for(let b=0;b<v;b++){const C=s?.[b]??ue(0,b);pi(e,y+b*u,k,d,c,C)}if(r>v){const b=`+${r-v}`,C=Math.max(8,a.fontSmall-1);e.font=`700 ${C.toFixed(1)}px ${z}`,e.textAlign="right",e.textBaseline="middle";const I=e.measureText(b).width,x=3,_=1.5,E=Math.ceil(I+x*2),A=Math.ceil(C+_*2),L=t+i/2-2,W=n-o+2,F=L-E;e.fillStyle="rgba(15, 15, 18, 0.85)",Y(e,F,W,E,A,2),e.fill(),e.fillStyle="#fafafa",e.fillText(b,L-x,W+A/2)}if(l){const b=Math.max(10,Math.min(o*.7,i*.55));e.font=`800 ${b.toFixed(0)}px ${z}`,e.textAlign="center",e.textBaseline="middle";const C=n-o/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,C+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,C)}}function ta(e,t,n,i,o,r,c){const a=Math.max(2,r.figureHeadR*.9);for(const s of t.cars){if(s.target===void 0)continue;const l=c.get(s.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const p=n.get(s.id);if(p===void 0)continue;const d=o(f.y)-r.carH/2,u=o(s.y)-r.carH/2;Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(p,u),e.lineTo(p,d),e.stroke(),e.fillStyle=di,e.beginPath(),e.arc(p,d,a,0,Math.PI*2),e.fill())}}function na(e,t,n,i,o,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const c=Bt[t.phase]??"#6b6b75",a=i/2;for(let s=1;s<=bn;s++){const l=r(t.y-t.v*zr*s),f=.18*(1-(s-1)/bn);e.fillStyle=Ft(c,f),e.fillRect(n-a,l-o,i,o)}}function ia(e,t,n,i,o,r,c,a,s){const l=c(t.y),f=l-o,p=i/2,d=Bt[t.phase]??"#6b6b75";e.fillStyle=d,e.fillRect(n-p,f,i,o),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-p+.5,f+.5,i-1,o-1),e.strokeStyle=Ct(d,.18),e.beginPath(),e.moveTo(n-p+1,f+1.5),e.lineTo(n+p-1,f+1.5),e.stroke();const u=t.capacity>0&&t.load>=t.capacity*.95;(t.riders>0||u)&&ea(e,n,l,i,o,t.riders,r,a,s,u)}function oa(e,t,n,i,o,r,c,a){e.font=`600 ${r.fontSmall+.5}px ${z}`,e.textBaseline="middle";const h=.3,g=performance.now(),S=t,w=[];for(const v of n.cars){const m=c.get(v.id);if(!m)continue;const y=i.get(v.id);if(y===void 0)continue;const k=o(v.y),b=k-r.carH,C=Math.max(1,m.expiresAt-m.bornAt),I=m.expiresAt-g,x=I>C*h?1:Math.max(0,I/(C*h));if(x<=0)continue;const E=e.measureText(m.text).width+14,A=r.fontSmall+8+2,L=b-2-4-A,W=k+2+4+A>a,F=L<2&&!W?"below":"above",Me=F==="above"?b-2-4-A:k+2+4;let K=y-E/2;const V=2,Pe=a-E-2;K<V&&(K=V),K>Pe&&(K=Pe),w.push({bubble:m,alpha:x,cx:y,carTop:b,carBottom:k,bubbleW:E,bubbleH:A,side:F,bx:K,by:Me})}const R=(v,m)=>!(v.bx+v.bubbleW<=m.bx||m.bx+m.bubbleW<=v.bx||v.by+v.bubbleH<=m.by||m.by+m.bubbleH<=v.by);for(let v=1;v<w.length;v++){const m=w[v];if(m===void 0)continue;let y=!1;for(let x=0;x<v;x++){const _=w[x];if(_!==void 0&&R(m,_)){y=!0;break}}if(!y)continue;const k=m.side==="above"?"below":"above",b=k==="above"?m.carTop-2-4-m.bubbleH:m.carBottom+2+4,C={...m,side:k,by:b};let I=!0;for(let x=0;x<v;x++){const _=w[x];if(_!==void 0&&R(C,_)){I=!1;break}}I&&(w[v]=C)}for(const v of w){const{bubble:m,alpha:y,cx:k,carTop:b,carBottom:C,bubbleW:I,bubbleH:x,side:_,bx:E,by:A}=v,L=_==="above"?b-2:C+2,W=_==="above"?A+x:A,F=Math.min(Math.max(k,E+6+5/2),E+I-6-5/2);e.save(),e.globalAlpha=y,e.shadowColor=S,e.shadowBlur=8,e.fillStyle="rgba(16, 19, 26, 0.94)",Y(e,E,A,I,x,6),e.fill(),e.shadowBlur=0,e.strokeStyle=ai(S,.65),e.lineWidth=1,Y(e,E,A,I,x,6),e.stroke(),e.beginPath(),e.moveTo(F-5/2,W),e.lineTo(F+5/2,W),e.lineTo(F,L),e.closePath(),e.fillStyle="rgba(16, 19, 26, 0.94)",e.fill(),e.stroke(),e.fillStyle="#f0f3fb",e.textAlign="center",e.fillText(m.text,E+I/2,A+x/2),e.restore()}}function ra(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function aa(e){const t=[];for(let n=3;n<=8;n++){const i=10**n;if(i>e)break;t.push({altitudeM:i,label:Ze(i)})}return t}function Ze(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function ui(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function sa(e,t,n){const i=Math.abs(e);if(i<.5)return"idle";const o=i-Math.abs(t);return i>=n*.95&&Math.abs(o)<n*.005?"cruise":o>0?"accel":o<0?"decel":"cruise"}function ca(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const i=Math.floor(e/60),o=Math.round(e%60);return o===0?`${i}m`:`${i}m ${o}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function la(e,t,n,i,o,r){const c=Math.abs(t-e);if(c<.001)return 0;const a=Math.abs(n);if(a*a/(2*r)>=c)return a>0?a/r:0;const l=Math.max(0,(i-a)/o),f=a*l+.5*o*l*l,p=i/r,d=i*i/(2*r);if(f+d>=c){const h=(2*o*r*c+r*a*a)/(o+r),g=Math.sqrt(Math.max(h,a*a));return(g-a)/o+g/r}const u=c-f-d;return l+u/Math.max(i,.001)+p}const fi={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},Ke={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function da(e,t,n,i,o,r){const c=o/2,a=i-r/2,s=Bt[t.phase]??"#6b6b75",l=e.createLinearGradient(n,a,n,a+r);l.addColorStop(0,Ct(s,.14)),l.addColorStop(1,Ct(s,-.18)),e.fillStyle=l,Y(e,n-c,a,o,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-c+2,a+r*.36,o-4,Math.max(1.5,r*.1))}function pa(e,t,n,i,o){if(t.length===0)return;const r=7,c=4,a=o.fontSmall+2,s=n/2+8;e.font=`600 ${(o.fontSmall+.5).toFixed(1)}px ${z}`;const l=(d,u)=>{const h=[d.carName,Ze(d.altitudeM),ui(d.velocity),`${fi[d.phase]} · ${d.layer}`];let g=0;for(const m of h)g=Math.max(g,e.measureText(m).width);const S=g+r*2,w=h.length*a+c*2;let R=u==="right"?d.cx+s:d.cx-s-S;R=Math.max(2,Math.min(i-S-2,R));const v=d.cy-w/2;return{hud:d,lines:h,bx:R,by:v,bubbleW:S,bubbleH:w,side:u}},f=(d,u)=>!(d.bx+d.bubbleW<=u.bx||u.bx+u.bubbleW<=d.bx||d.by+d.bubbleH<=u.by||u.by+u.bubbleH<=d.by),p=[];t.forEach((d,u)=>{let h=l(d,u%2===0?"right":"left");if(p.some(g=>f(h,g))){const g=l(d,h.side==="right"?"left":"right");if(p.every(S=>!f(g,S)))h=g;else{const S=Math.max(...p.map(w=>w.by+w.bubbleH));h={...h,by:S+4}}}p.push(h)});for(const d of p){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",Y(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=Ke[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,Y(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let u=0;u<d.lines.length;u++){const h=d.by+c+a*u+a/2,g=d.lines[u]??"";e.fillStyle=u===0||u===3?Ke[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(g,d.bx+r,h)}e.restore()}}function ua(e,t,n,i,o,r){if(t.length===0)return;const c=18,a=10,s=6,l=5,f=r.fontSmall+2.5,d=s*2+5*f,u=c+s+(d+l)*t.length;e.save();const h=e.createLinearGradient(n,o,n,o+u);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,Y(e,n,o,i,u,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,Y(e,n,o,i,u,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,o+1),e.lineTo(n+i-8,o+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px ${z}`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+a,o+c/2+2);let g=o+c+s;for(const S of t){e.fillStyle="rgba(15, 15, 18, 0.55)",Y(e,n+6,g,i-12,d,5),e.fill(),e.fillStyle=Ke[S.phase],e.fillRect(n+6,g,2,d);const w=n+a+4,R=n+i-a;let v=g+s+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px ${z}`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(S.carName,w,v),e.textAlign="right",e.fillStyle=Ke[S.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px ${z}`,e.fillText(fi[S.phase].toUpperCase(),R,v);const m=S.etaSeconds!==void 0&&Number.isFinite(S.etaSeconds)?ca(S.etaSeconds):"—",y=[["Altitude",Ze(S.altitudeM)],["Velocity",ui(S.velocity)],["Dest",S.destinationName??"—"],["ETA",m]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px ${z}`;for(const[k,b]of y)v+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(k,w,v),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(b,R,v);g+=d+l}e.restore()}function fa(e,t,n,i,o,r,c){return[...e.cars].sort((s,l)=>s.id-l.id).map((s,l)=>{const f=s.y,p=s.target!==void 0?e.stops.find(u=>u.entity_id===s.target):void 0,d=p?la(f,p.y,s.v,o,r,c):void 0;return{cx:n,cy:t.toScreenAlt(f),altitudeM:f,velocity:s.v,phase:sa(s.v,i.get(s.id)??0,o),layer:ra(f),carName:`Climber ${String.fromCharCode(65+l)}`,destinationName:p?.name,etaSeconds:d}})}const ye=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function ut(e,t,n){return e+(t-e)*n}function ft(e,t,n){const i=parseInt(e.slice(1),16),o=parseInt(t.slice(1),16),r=Math.round(ut(i>>16&255,o>>16&255,n)),c=Math.round(ut(i>>8&255,o>>8&255,n)),a=Math.round(ut(i&255,o&255,n));return`#${(r<<16|c<<8|a).toString(16).padStart(6,"0")}`}function ha(e,t){let n=0;for(;n<ye.length-1;n++){const l=ye[n+1];if(l===void 0||e<=l[0])break}const i=ye[n],o=ye[Math.min(n+1,ye.length-1)];if(i===void 0||o===void 0)return"#050810";const r=o[0]-i[0],c=r<=0?0:Math.max(0,Math.min(1,(e-i[0])/r)),a=ft(i[1],o[1],c),s=ft(i[2],o[2],c);return ft(a,s,t)}const ga=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let i=0;i<60;i++){const o=.45+Math.pow(n(),.7)*.55;e.push({altFrac:o,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function ma(e,t,n,i,o){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),c=Math.log10(1+t.axisMaxM/1e3),a=[0,.05,.15,.35,.6,1];for(const l of a){const f=1e3*(10**(l*c)-1);r.addColorStop(l,ha(f,o))}e.fillStyle=r,e.fillRect(n,t.shaftTop,i-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,i-n,t.shaftBottom-t.shaftTop),e.clip();for(const l of ga){const f=t.axisMaxM*l.altFrac;if(f<8e4)continue;const p=t.toScreenAlt(f),d=n+l.xFrac*(i-n),u=l.alpha*(.7+.3*o);e.fillStyle=`rgba(232, 232, 240, ${u.toFixed(3)})`,e.beginPath(),e.arc(d,p,l.size,0,Math.PI*2),e.fill()}e.restore();const s=aa(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const l of s){const f=t.toScreenAlt(l.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(i,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(l.label,n+4,f-6))}}function ba(e,t,n,i){const r=i-28,c=e.createLinearGradient(0,r,0,i);c.addColorStop(0,"rgba(0,0,0,0)"),c.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),c.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=c,e.fillRect(t,r,n-t,28),e.strokeStyle=ai("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,i+.5),e.lineTo(n,i+.5),e.stroke()}function ya(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function Sa(e,t,n,i){const o=Math.max(5,i.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-o),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const c=-Math.PI/2+r*Math.PI/3,a=t+Math.cos(c)*o,s=n+Math.sin(c)*o;r===0?e.moveTo(a,s):e.lineTo(a,s)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(i.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+o+6,n),e.restore()}function wa(e,t,n,i,o,r,c){e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const a of t.stops){const s=n.toScreenAlt(a.y);if(s<n.shaftTop||s>n.shaftBottom)continue;const l=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(i-l/2,s),e.lineTo(i-5,s),e.moveTo(i+5,s),e.lineTo(i+l/2,s),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(i-l/2,s),e.lineTo(i-5,s-5),e.moveTo(i+l/2,s),e.lineTo(i+5,s-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(a.name,r+c-4,s-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(o.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(Ze(a.y),r+c-4,s+10),e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function va(e,t,n){const i=Math.max(n.counterweightAltitudeM,1),o=Math.log10(1+i/1e3);return{axisMaxM:i,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const c=Math.log10(1+Math.max(0,r)/1e3),a=o<=0?0:Math.max(0,Math.min(1,c/o));return t-a*(t-e)}}}function ka(e,t,n,i,o,r,c){const a=Math.max(2,c.figureHeadR*.9);for(const s of t.cars){if(s.target===void 0)continue;const l=r.get(s.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const p=o.get(s.id);if(p===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(i,p),e.lineTo(i,d),e.stroke(),e.fillStyle=di,e.beginPath(),e.arc(i,d,a,0,Math.PI*2),e.fill())}}function _a(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function Ca(e,t,n,i,o,r,c){c.firstDrawAt===0&&(c.firstDrawAt=performance.now());const a=(performance.now()-c.firstDrawAt)/1e3,s=r.showDayNight?_a(a):.5,l=n>=520&&i>=360,f=Math.min(120,Math.max(72,n*.16)),p=l?Math.min(220,Math.max(160,n*.24)):0,d=l?14:0,u=o.padX,h=u+f+4,g=n-o.padX-p-d,S=(h+g)/2,w=12,R=o.padTop+24,v=i-o.padBottom-18,m=va(R,v,r);ma(e,m,h+w,g-w,s),ba(e,h+w,g-w,v),ya(e,S,m),Sa(e,S,m.shaftTop,o),wa(e,t,m,S,o,u,f);const y=Math.max(20,Math.min(34,g-h-8)),k=Math.max(16,Math.min(26,y*.72));o.carH=k,o.carW=y;const b=new Map,C=new Map;t.stops.forEach((_,E)=>C.set(_.entity_id,E));for(const _ of t.cars)b.set(_.id,m.toScreenAlt(_.y));ka(e,t,m,S,b,C,o);for(const _ of t.cars){const E=b.get(_.id);E!==void 0&&da(e,_,S,E,y,k)}const x=[...fa(t,m,S,c.prevVelocity,c.maxSpeed,c.acceleration,c.deceleration)].sort((_,E)=>E.altitudeM-_.altitudeM);pa(e,x,y,n-p-d,o),l&&ua(e,x,n-o.padX-p,p,R,o);for(const _ of t.cars)c.prevVelocity.set(_.id,_.v);if(c.prevVelocity.size>t.cars.length){const _=new Set(t.cars.map(E=>E.id));for(const E of c.prevVelocity.keys())_.has(E)||c.prevVelocity.delete(E)}}function Ta(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(i,o)=>i+(o-i)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function Sn(e,t){let n,i=1/0;for(const o of e){const r=Math.abs(o.y-t);r<i&&(i=r,n=o)}return n!==void 0?{stop:n,dist:i}:void 0}class hi{#e;#t;#n=window.devicePixelRatio||1;#o;#r=null;#a=-1;#d=new Map;#s;#i=new Map;#c=new Map;#l=[];#p=null;#g=new Map;#m=1;#b=1;#y=1;#f=0;#u=new Map;constructor(t,n){this.#e=t;const i=t.getContext("2d");if(!i)throw new Error("2D context unavailable");this.#t=i,this.#s=n,this.#h(),this.#o=()=>{this.#h()},window.addEventListener("resize",this.#o)}dispose(){window.removeEventListener("resize",this.#o)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#g.clear(),this.#f=0,this.#u.clear()}setTetherPhysics(t,n,i){Number.isFinite(t)&&t>0&&(this.#m=t),Number.isFinite(n)&&n>0&&(this.#b=n),Number.isFinite(i)&&i>0&&(this.#y=i)}pushAssignment(t,n,i){let o=this.#u.get(t);o===void 0&&(o=new Map,this.#u.set(t,o)),o.set(i,n)}#h(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const i=t*this.#n,o=n*this.#n;(this.#e.width!==i||this.#e.height!==o)&&(this.#e.width=i,this.#e.height=o),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}draw(t,n,i){this.#h();const{clientWidth:o,clientHeight:r}=this.#e,c=this.#t;if(c.clearRect(0,0,o,r),t.stops.length===0||o===0||r===0)return;o!==this.#a&&(this.#r=Ta(o),this.#a=o);const a=this.#r;if(a===null)return;if(this.#p!==null){this.#S(t,o,r,a,n,i,this.#p);return}const s=t.stops.length===2,l=t.stops[0];if(l===void 0)return;let f=l.y,p=l.y;for(let T=1;T<t.stops.length;T++){const P=t.stops[T];if(P===void 0)continue;const B=P.y;B<f&&(f=B),B>p&&(p=B)}const d=t.stops.map(T=>T.y).sort((T,P)=>T-P),u=d.length>=3?(d.at(-1)??0)-(d.at(-2)??0):1,g=f-1,S=p+u,w=Math.max(S-g,1e-4),R=s?18:0;let v,m;if(s)v=a.padTop+R,m=r-a.padBottom-R;else{const T=[];for(let se=1;se<d.length;se++){const Le=d[se],Fe=d[se-1];if(Le===void 0||Fe===void 0)continue;const Z=Le-Fe;Z>0&&T.push(Z)}const D=48/(T.length>0?Math.min(...T):1),X=Math.max(0,r-a.padTop-a.padBottom)/w,Q=Math.min(X,D),ae=w*Q;m=r-a.padBottom,v=m-ae}const y=T=>m-(T-g)/w*(m-v),k=this.#d;k.forEach(T=>T.length=0);for(const T of t.cars){const P=k.get(T.line);P?P.push(T):k.set(T.line,[T])}const b=[...k.keys()].sort((T,P)=>T-P),C=b.reduce((T,P)=>T+(k.get(P)?.length??0),0),I=Math.max(0,o-2*a.padX-a.labelW),x=a.figureStride*2,_=a.shaftSpacing*Math.max(C-1,0),A=(I-_)/Math.max(C,1),L=s?34:a.maxShaftInnerW,F=Math.max(a.minShaftInnerW,Math.min(L,A*.55)),Me=Math.max(0,Math.min(A-F,x+a.figureStride*4)),K=Math.max(14,F-6);let V=1/0;if(t.stops.length>=2)for(let T=1;T<d.length;T++){const P=d[T-1],B=d[T];if(P===void 0||B===void 0)continue;const D=y(P)-y(B);D>0&&D<V&&(V=D)}const Pe=y(p)-2,Ei=Number.isFinite(V)?V:a.carH,xi=s?a.carH:Ei,Ii=Math.max(14,Math.min(xi,Pe));if(!s&&Number.isFinite(V)){const T=Math.max(1.5,Math.min(V*.067,4)),P=a.figureStride*(T/a.figureHeadR);a.figureHeadR=T,a.figureStride=P}a.shaftInnerW=F,a.carW=K,a.carH=Ii;const Ai=a.padX+a.labelW,Mi=F+Me,nt=[],ge=new Map,it=new Map;let Ot=0;for(const T of b){const P=k.get(T)??[];for(const B of P){const D=Ai+Ot*(Mi+a.shaftSpacing),G=D,X=D+Me,Q=X+F/2;nt.push(Q),ge.set(B.id,Q),it.set(B.id,{start:G,end:X}),Ot++}}const Wt=new Map;t.stops.forEach((T,P)=>Wt.set(T.entity_id,P));const qt=new Set;{let T=0;for(const P of b){const B=k.get(P)??[];for(const D of B){if(D.phase==="loading"||D.phase==="door-opening"||D.phase==="door-closing"){const G=Sn(t.stops,D.y);G!==void 0&&G.dist<.5&&qt.add(`${T}:${G.stop.entity_id}`)}T++}}}const Ht=new Map,Nt=new Map,Gt=new Map,Ut=new Map,jt=[],zt=[];let Vt=0;for(let T=0;T<b.length;T++){const P=b[T];if(P===void 0)continue;const B=k.get(P)??[],D=Lr[T]??Br,G=Fr[T]??$r,X=Dr[T]??1,Q=Hr[T]??Nr,ae=Math.max(14,F*X),se=Math.max(10,K*X),Le=Math.max(10,a.carH),Fe=T===2?Wr:T===3?qr:pt;let Z=1/0,ot=-1/0,Be=1/0;for(const J of B){Ht.set(J.id,ae),Nt.set(J.id,se),Gt.set(J.id,Le),Ut.set(J.id,Fe);const ce=nt[Vt];if(ce===void 0)continue;const Xt=Number.isFinite(J.min_served_y)&&Number.isFinite(J.max_served_y),rt=Xt?Math.max(v,y(J.max_served_y)-a.carH-2):v,Pi=Xt?Math.min(m,y(J.min_served_y)+2):m;jt.push({cx:ce,top:rt,bottom:Pi,fill:D,frame:G,width:ae}),ce<Z&&(Z=ce),ce>ot&&(ot=ce),rt<Be&&(Be=rt),Vt++}b.length>1&&Number.isFinite(Z)&&Number.isFinite(Be)&&zt.push({cx:(Z+ot)/2,top:Be,text:Or[T]??`Line ${T+1}`,color:Q})}Kr(c,jt),Qr(c,zt,a),Jr(c,t,y,a,nt,o,qt,v,s),Zr(c,t,y,a,it,this.#u),ta(c,t,ge,Ht,y,a,Wt);for(const[T,P]of ge){const B=t.cars.find(ae=>ae.id===T);if(!B)continue;const D=Nt.get(T)??a.carW,G=Gt.get(T)??a.carH,X=Ut.get(T)??pt,Q=this.#i.get(T);na(c,B,P,D,G,y),ia(c,B,P,D,G,X,y,a,Q?.roster)}this.#w(t,ge,it,y,a,n),this.#v(a),i&&i.size>0&&oa(c,this.#s,t,ge,y,a,i,o)}#S(t,n,i,o,r,c,a){const s={prevVelocity:this.#g,maxSpeed:this.#m,acceleration:this.#b,deceleration:this.#y,firstDrawAt:this.#f};Ca(this.#t,t,n,i,o,a,s),this.#f=s.firstDrawAt}#w(t,n,i,o,r,c){const a=performance.now(),s=Math.max(1,c),l=jr/s,f=30/s,p=new Map,d=[];for(const u of t.cars){const h=this.#i.get(u.id),g=u.riders,S=n.get(u.id),w=Sn(t.stops,u.y),R=u.phase==="loading"&&w!==void 0&&w.dist<.5?w.stop:void 0;if(h&&S!==void 0&&R!==void 0){const y=g-h.riders;if(y>0&&p.set(R.entity_id,(p.get(R.entity_id)??0)+y),y!==0){const k=o(R.y),b=o(u.y)-r.carH/2,C=Math.min(Math.abs(y),6);if(y>0){const I=R.waiting_up>=R.waiting_down,x=i.get(u.id);let _=S-20;if(x!==void 0){const L=x.start,W=x.end;_=(L+W)/2}const E=I?si:ci,A=this.#u.get(R.entity_id);A!==void 0&&(A.delete(u.line),A.size===0&&this.#u.delete(R.entity_id));for(let L=0;L<C;L++)d.push(()=>this.#l.push({kind:"board",bornAt:a+L*f,duration:l,startX:_,startY:k,endX:S,endY:b,color:E}))}else for(let I=0;I<C;I++)d.push(()=>this.#l.push({kind:"alight",bornAt:a+I*f,duration:l,startX:S,startY:b,endX:S+18,endY:b+10,color:pt}))}}const v=h?.roster??[];let m;if(h){const y=g-h.riders;if(m=v.slice(),y>0&&R!==void 0){const b=R.waiting_up>=R.waiting_down?0:1e4;for(let C=0;C<y;C++)m.push(ue(R.entity_id,C+b))}else if(y>0)for(let k=0;k<y;k++)m.push(ue(u.id,m.length+k));else y<0&&m.splice(m.length+y,-y)}else{m=[];for(let y=0;y<g;y++)m.push(ue(u.id,y))}for(;m.length>g;)m.pop();for(;m.length<g;)m.push(ue(u.id,m.length));this.#i.set(u.id,{riders:g,roster:m})}for(const u of t.stops){const h=u.waiting_up+u.waiting_down,g=this.#c.get(u.entity_id);if(g){const S=g.waiting-h,w=p.get(u.entity_id)??0,R=Math.max(0,S-w);if(R>0){const v=o(u.y),m=r.padX+r.labelW+20,y=Math.min(R,4);for(let k=0;k<y;k++)this.#l.push({kind:"abandon",bornAt:a+k*f,duration:l*1.5,startX:m,startY:v,endX:m-26,endY:v-6,color:li})}}this.#c.set(u.entity_id,{waiting:h})}for(const u of d)u();for(let u=this.#l.length-1;u>=0;u--){const h=this.#l[u];h!==void 0&&a-h.bornAt>h.duration&&this.#l.splice(u,1)}if(this.#i.size>t.cars.length){const u=new Set(t.cars.map(h=>h.id));for(const h of this.#i.keys())u.has(h)||this.#i.delete(h)}if(this.#c.size>t.stops.length){const u=new Set(t.stops.map(h=>h.entity_id));for(const h of this.#c.keys())u.has(h)||this.#c.delete(h)}}#v(t){const n=performance.now(),i=this.#t;for(const o of this.#l){const r=n-o.bornAt;if(r<0)continue;const c=Math.min(1,Math.max(0,r/o.duration)),a=Ar(c),[s,l]=o.kind==="board"?Ir(o.startX,o.startY,o.endX,o.endY,a):[o.startX+(o.endX-o.startX)*a,o.startY+(o.endY-o.startY)*a],f=o.kind==="board"?.9:o.kind==="abandon"?(1-a)**1.5:1-a,p=o.kind==="abandon"?t.carDotR*.85:t.carDotR;i.fillStyle=Ft(o.color,f),i.beginPath(),i.arc(s,l,p,0,Math.PI*2),i.fill()}}}const Ra="#f59e0b",Ea=3;function xa(){const e="quest-pane";return{root:M("quest-pane",e),gridView:M("quest-grid",e),stageView:M("quest-stage-view",e),backBtn:M("quest-back-to-grid",e),title:M("quest-stage-title",e),brief:M("quest-stage-brief",e),stageStars:M("quest-stage-stars",e),editorHost:M("quest-editor",e),runBtn:M("quest-run",e),resetBtn:M("quest-reset",e),result:M("quest-result",e),progress:M("quest-progress",e),shaft:M("quest-shaft",e),shaftIdle:M("quest-shaft-idle",e)}}function ht(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=Ae(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(Ea-n)}function gt(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function Ia(e){const t=xa(),n=b=>{const C=cr(b);if(C)return C;const I=ie[0];if(!I)throw new Error("quest-pane: stage registry is empty");return I},i=vr(n(e.initialStageId),"grid");ht(t,i.activeStage);const o=Sr();pn(o,i.activeStage);const r=wr();fn(r,i.activeStage);const c=_r();lt(c,i.activeStage);const a=hr(),s=new hi(t.shaft,Ra);t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const l=await ko({container:t.editorHost,initialValue:an(i.activeStage.id)??i.activeStage.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const f=Cr(),p=300;let d=null,u=!1;const h=()=>{u||(d!==null&&clearTimeout(d),d=setTimeout(()=>{sn(i.activeStage.id,l.getValue()),d=null},p))},g=()=>{d!==null&&(clearTimeout(d),d=null,sn(i.activeStage.id,l.getValue()))},S=b=>{u=!0;try{l.setValue(b)}finally{u=!1}};l.onDidChange(()=>{h()});const w=xr();mn(w,i.activeStage,l);const R=()=>{hn(i),t.shaftIdle.hidden=!1;const b=t.shaft.getContext("2d");b&&b.clearRect(0,0,t.shaft.width,t.shaft.height)},v=(b,{fromGrid:C})=>{g(),kr(i,b),ht(t,b),pn(o,b),fn(r,b),lt(c,b),mn(w,b,l),S(an(b.id)??b.starterCode),l.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",R(),gt(t,"stage"),ct(i,"stage"),e.onStageChange?.(b.id)},m=()=>{g(),R(),t.result.textContent="",t.progress.textContent="",gt(t,"grid"),ct(i,"grid"),st(a,b=>{v(n(b),{fromGrid:!0})}),e.onBackToGrid?.()};st(a,b=>{v(n(b),{fromGrid:!0})});const y=e.landOn??"grid";gt(t,y),ct(i,y);const k=async()=>{const b=i.activeStage;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",l.clearRuntimeMarker();let C=null,I=0;i.runLoop.active=!0;const x=()=>{i.runLoop.active&&(C!==null&&s.draw(C,1),requestAnimationFrame(x))};t.shaftIdle.hidden=!0,requestAnimationFrame(x);try{const _=await br(b,l.getValue(),{timeoutMs:1e3,onProgress:E=>{be(i,b)&&(t.progress.textContent=yr(E))},onSnapshot:E=>{C=E,I+=1}});if(_.passed){const E=Ae(b.id);_.stars>E&&(pr(b.id,_.stars),st(a,A=>{v(n(A),{fromGrid:!0})}),be(i,b)&&ht(t,i.activeStage)),be(i,b)&&lt(c,i.activeStage,{collapse:!1})}if(be(i,b)){t.result.textContent="",t.progress.textContent="";const E=_.passed?lr(b.id):void 0,A=E?()=>{v(E,{fromGrid:!1})}:void 0;Tr(f,_,()=>void k(),b.failHint,A)}}catch(_){if(be(i,b)){const E=_ instanceof Error?_.message:String(_);t.result.textContent=`Error: ${E}`,t.progress.textContent="",_ instanceof ei&&_.location!==null&&l.setRuntimeMarker({line:_.location.line,column:_.location.column,message:E})}}finally{if(t.runBtn.disabled=!1,hn(i),I===0){const _=t.shaft.getContext("2d");_&&_.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{k()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${i.activeStage.title} to its starter code?`)&&(dr(i.activeStage.id),S(i.activeStage.starterCode),l.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{m()}),{handles:t,editor:l}}let mt=null;async function gi(){if(!mt){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;mt=import(e).then(async n=>(await n.default(t),n))}return mt}class $t{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,i){const o=await gi();return new $t(new o.WasmSim(t,n,i))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,i,o){return this.#e.spawnRider(t,n,i,o)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class mi{#e;#t=0;#n=[];#o=0;#r=0;#a=1;#d=0;constructor(t){this.#e=Aa(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#o=t.reduce((n,i)=>n+i.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#a=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const i=t.stops.filter(a=>a.stop_id!==4294967295);if(i.length<2)return[];const o=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#a/60*o,this.#r=(this.#r+o)%(this.#o||1);const c=[];for(;this.#t>=1;)this.#t-=1,c.push(this.#s(i,r));return c}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,i]of this.#n.entries())if(t-=i.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#o<=0?0:Math.min(1,this.#r/this.#o)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const i=n.durationSec;if(t<i)return i>0?Math.min(1,t/i):0;t-=i}return 1}phases(){return this.#n}#s(t,n){const i=this.#i(t.length,n.originWeights);let o=this.#i(t.length,n.destWeights);o===i&&(o=(o+1)%t.length);const r=t[i],c=t[o];if(!r||!c)throw new Error("stop index out of bounds");const a=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:c.stop_id,weight:a,...this.#d>0?{patienceTicks:this.#d}:{}}}#i(t,n){if(!n||n.length!==t)return this.#l(t);let i=0;for(const r of n)i+=Math.max(0,r);if(i<=0)return this.#l(t);let o=this.#p()*i;for(const[r,c]of n.entries())if(o-=Math.max(0,c),o<0)return r;return t-1}#c(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#l(t){return Number(this.#c()%BigInt(t))}#p(){return Number(this.#c()>>11n)/2**53}}function Aa(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const Ma="#7dd3fc",Pa="#fda4af";async function wn(e,t,n,i,o){const r=Di(i,o),c=await $t.create(r,t,n),a=new hi(e.canvas,e.accent);if(a.setTetherConfig(i.tether??null),i.tether){const l=Lt(i,o);a.setTetherPhysics(l.maxSpeed,l.acceleration,l.deceleration)}const s=e.canvas.parentElement;if(s){const l=i.stops.length,p=i.tether?640:Math.max(200,l*16);s.style.setProperty("--shaft-min-h",`${p}px`)}return{strategy:t,sim:c,renderer:a,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function Se(e){e?.sim.dispose(),e?.renderer.dispose()}function Tt(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const La=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],Fa=120;function vn(e,t,n){const i=e.sim.metrics();e.latestMetrics=i;for(const r of La){const c=e.metricHistory[r];c.push(i[r]),c.length>Fa&&c.shift()}const o=performance.now();for(const[r,c]of e.bubbles)c.expiresAt<=o&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const Ba={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},$a=1e3;function Da(e,t,n){const i=performance.now(),o=r=>Wa(n,r);for(const r of t){const c=Oa(r,o);if(c===null)continue;const a=r.elevator;if(a===void 0)continue;const s=Ba[r.kind]??$a;e.bubbles.set(a,{text:c,bornAt:i,expiresAt:i+s})}}function Oa(e,t){switch(e.kind){case"elevator-assigned":return`› To ${t(e.stop)}`;case"elevator-repositioning":return`↻ Reposition to ${t(e.stop)}`;case"elevator-arrived":return`● At ${t(e.stop)}`;case"door-opened":return"◌ Doors open";case"rider-boarded":return"+ Boarding";case"rider-exited":return`↓ Off at ${t(e.stop)}`;default:return null}}function Wa(e,t){return e.stops.find(i=>i.entity_id===t)?.name??`stop #${t}`}const qa={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function kn(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=qa[t],e.modeEl.title=t)}function Ha(){const e=a=>{const s=document.getElementById(a);if(!s)throw new Error(`missing element #${a}`);return s},t=a=>document.getElementById(a),n=(a,s)=>({root:e(`pane-${a}`),canvas:e(`shaft-${a}`),name:e(`name-${a}`),mode:e(`mode-${a}`),desc:e(`desc-${a}`),metrics:e(`metrics-${a}`),trigger:e(`strategy-trigger-${a}`),popover:e(`strategy-popover-${a}`),repoTrigger:e(`repo-trigger-${a}`),repoName:e(`repo-name-${a}`),repoPopover:e(`repo-popover-${a}`),accent:s,which:a}),i=a=>{const s=document.querySelector(`.tweak-row[data-key="${a}"]`);if(!s)throw new Error(`missing tweak row for ${a}`);const l=p=>{const d=s.querySelector(p);if(!d)throw new Error(`missing ${p} in tweak row ${a}`);return d},f=p=>s.querySelector(p);return{root:s,value:l(".tweak-value"),defaultV:l(".tweak-default-v"),dec:l(".tweak-dec"),inc:l(".tweak-inc"),reset:l(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},o={};for(const a of he)o[a]=i(a);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:o,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",Ma),paneB:n("b",Pa)};ao(r);const c=document.getElementById("controls-bar");return c&&new ResizeObserver(([s])=>{if(!s)return;const l=Math.ceil(s.borderBoxSize[0]?.blockSize??s.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${l}px`)}).observe(c),r}function bi(e,t,n,i,o,r,c,a,s){const l=document.createDocumentFragment();for(const f of t){const p=document.createElement("button");p.type="button",p.className="strategy-option",p.setAttribute("role","menuitemradio"),p.setAttribute("aria-checked",f===r?"true":"false"),p.dataset[o]=f;const d=document.createElement("span");d.className="strategy-option-name";const u=document.createElement("span");if(u.className="strategy-option-label",u.textContent=n[f],d.appendChild(u),c&&f===c){const g=document.createElement("span");g.className="strategy-option-sibling",g.textContent=`also in ${a}`,d.appendChild(g)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=i[f],p.append(d,h),p.addEventListener("click",()=>{s(f)}),l.appendChild(p)}e.replaceChildren(l)}function oe(e,t){const n=xe[t],i=Qn[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=i}function _n(e,t,n,i,o){bi(e.repoPopover,io,xe,Qn,"reposition",t,n,i,o)}function _e(e,t,n){const{repositionA:i,repositionB:o,compare:r}=e.permalink;_n(t.paneA,i,r?o:null,"B",c=>void Tn(e,t,"a",c,n)),_n(t.paneB,o,r?i:null,"A",c=>void Tn(e,t,"b",c,n))}function Rt(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function yi(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function Et(e){Rt(e.paneA,!1),Rt(e.paneB,!1)}function et(e){It(e),Et(e)}function Cn(e,t,n,i){n.repoTrigger.addEventListener("click",o=>{o.stopPropagation();const r=n.repoPopover.hidden;et(t),r&&(_e(e,t,i),Rt(n,!0))})}async function Tn(e,t,n,i,o){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===i){Et(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:i},oe(t.paneA,i)):(e.permalink={...e.permalink,repositionB:i},oe(t.paneB,i)),q(e.permalink),_e(e,t,o),Et(t),await o(),N(t.toast,`${n==="a"?"A":"B"} park: ${xe[i]}`)}function Na(e){document.addEventListener("click",t=>{if(!Si(e)&&!yi(e))return;const n=t.target;if(n instanceof Node){for(const i of[e.paneA,e.paneB])if(i.popover.contains(n)||i.trigger.contains(n)||i.repoPopover.contains(n)||i.repoTrigger.contains(n))return;et(e)}})}function re(e,t){const n=fe[t],i=Kn[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==i&&(e.desc.textContent=i),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=i}function Rn(e,t,n,i,o){bi(e.popover,no,fe,Kn,"strategy",t,n,i,o)}function Ce(e,t,n){const{strategyA:i,strategyB:o,compare:r}=e.permalink;Rn(t.paneA,i,r?o:null,"B",c=>void xn(e,t,"a",c,n)),Rn(t.paneB,o,r?i:null,"A",c=>void xn(e,t,"b",c,n))}function xt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function Si(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function It(e){xt(e.paneA,!1),xt(e.paneB,!1)}function En(e,t,n,i){n.trigger.addEventListener("click",o=>{o.stopPropagation();const r=n.popover.hidden;et(t),r&&(Ce(e,t,i),xt(n,!0))})}async function xn(e,t,n,i,o){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===i){It(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:i},re(t.paneA,i)):(e.permalink={...e.permalink,strategyB:i},re(t.paneB,i)),q(e.permalink),Ce(e,t,o),It(t),await o(),N(t.toast,`${n==="a"?"A":"B"}: ${fe[i]}`)}function In(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function Ga(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function tt(e,t,n){let i=!1;for(const o of he){const r=n.tweakRows[o],c=e.tweakRanges[o],a=ne(e,o,t),s=Mt(e,o),l=Pt(e,o,a);l&&(i=!0),r.value.textContent=In(o,a),r.defaultV.textContent=In(o,s),r.dec.disabled=a<=c.min+1e-9,r.inc.disabled=a>=c.max-1e-9,r.root.dataset.overridden=String(l),r.reset.hidden=!l;const f=Math.max(c.max-c.min,1e-9),p=Math.max(0,Math.min(1,(a-c.min)/f)),d=Math.max(0,Math.min(1,(s-c.min)/f));r.trackFill&&(r.trackFill.style.width=`${(p*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(p*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!i}function wi(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function Dt(e,t,n,i){const o=Lt(n,e.permalink.overrides),r={maxSpeed:o.maxSpeed,weightCapacityKg:o.weightCapacity,doorOpenTicks:o.doorOpenTicks,doorTransitionTicks:o.doorTransitionTicks},c=[e.paneA,e.paneB].filter(s=>s!==null),a=c.every(s=>s.sim.applyPhysicsLive(r));if(a)for(const s of c)s.renderer?.setTetherPhysics(o.maxSpeed,o.acceleration,o.deceleration);tt(n,e.permalink.overrides,t),a||i()}function Ua(e,t,n){return Math.min(n,Math.max(t,e))}function ja(e,t,n){const i=Math.round((e-t)/n);return t+i*n}function Oe(e,t,n,i,o){const r=H(e.permalink.scenario),c=r.tweakRanges[n],a=ne(r,n,e.permalink.overrides),s=Ua(a+i*c.step,c.min,c.max),l=ja(s,c.min,c.step);Xa(e,t,n,l,o)}function za(e,t,n,i){const o=H(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},q(e.permalink),n==="cars"?(i(),N(t.toast,"Cars reset")):(Dt(e,t,o,i),N(t.toast,`${Ga(n)} reset`))}async function Va(e,t,n){const i=H(e.permalink.scenario),o=Pt(i,"cars",ne(i,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},q(e.permalink),o?await n():Dt(e,t,i,n),N(t.toast,"Parameters reset")}function Xa(e,t,n,i,o){const r=H(e.permalink.scenario),c={...e.permalink.overrides,[n]:i};e.permalink={...e.permalink,overrides:Nn(r,c)},q(e.permalink),n==="cars"?o():Dt(e,t,r,o)}function Ya(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Ka(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function i(){return this instanceof i?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(i){var o=Object.getOwnPropertyDescriptor(e,i);Object.defineProperty(n,i,o.get?o:{enumerable:!0,get:function(){return e[i]}})}),n}var We={exports:{}},Qa=We.exports,An;function Ja(){return An||(An=1,(function(e){(function(t,n,i){function o(s){var l=this,f=a();l.next=function(){var p=2091639*l.s0+l.c*23283064365386963e-26;return l.s0=l.s1,l.s1=l.s2,l.s2=p-(l.c=p|0)},l.c=1,l.s0=f(" "),l.s1=f(" "),l.s2=f(" "),l.s0-=f(s),l.s0<0&&(l.s0+=1),l.s1-=f(s),l.s1<0&&(l.s1+=1),l.s2-=f(s),l.s2<0&&(l.s2+=1),f=null}function r(s,l){return l.c=s.c,l.s0=s.s0,l.s1=s.s1,l.s2=s.s2,l}function c(s,l){var f=new o(s),p=l&&l.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,p&&(typeof p=="object"&&r(p,f),d.state=function(){return r(f,{})}),d}function a(){var s=4022871197,l=function(f){f=String(f);for(var p=0;p<f.length;p++){s+=f.charCodeAt(p);var d=.02519603282416938*s;s=d>>>0,d-=s,d*=s,s=d>>>0,d-=s,s+=d*4294967296}return(s>>>0)*23283064365386963e-26};return l}n&&n.exports?n.exports=c:this.alea=c})(Qa,e)})(We)),We.exports}var qe={exports:{}},Za=qe.exports,Mn;function es(){return Mn||(Mn=1,(function(e){(function(t,n,i){function o(a){var s=this,l="";s.x=0,s.y=0,s.z=0,s.w=0,s.next=function(){var p=s.x^s.x<<11;return s.x=s.y,s.y=s.z,s.z=s.w,s.w^=s.w>>>19^p^p>>>8},a===(a|0)?s.x=a:l+=a;for(var f=0;f<l.length+64;f++)s.x^=l.charCodeAt(f)|0,s.next()}function r(a,s){return s.x=a.x,s.y=a.y,s.z=a.z,s.w=a.w,s}function c(a,s){var l=new o(a),f=s&&s.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(typeof f=="object"&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=c:this.xor128=c})(Za,e)})(qe)),qe.exports}var He={exports:{}},ts=He.exports,Pn;function ns(){return Pn||(Pn=1,(function(e){(function(t,n,i){function o(a){var s=this,l="";s.next=function(){var p=s.x^s.x>>>2;return s.x=s.y,s.y=s.z,s.z=s.w,s.w=s.v,(s.d=s.d+362437|0)+(s.v=s.v^s.v<<4^(p^p<<1))|0},s.x=0,s.y=0,s.z=0,s.w=0,s.v=0,a===(a|0)?s.x=a:l+=a;for(var f=0;f<l.length+64;f++)s.x^=l.charCodeAt(f)|0,f==l.length&&(s.d=s.x<<10^s.x>>>4),s.next()}function r(a,s){return s.x=a.x,s.y=a.y,s.z=a.z,s.w=a.w,s.v=a.v,s.d=a.d,s}function c(a,s){var l=new o(a),f=s&&s.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(typeof f=="object"&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=c:this.xorwow=c})(ts,e)})(He)),He.exports}var Ne={exports:{}},is=Ne.exports,Ln;function os(){return Ln||(Ln=1,(function(e){(function(t,n,i){function o(a){var s=this;s.next=function(){var f=s.x,p=s.i,d,u;return d=f[p],d^=d>>>7,u=d^d<<24,d=f[p+1&7],u^=d^d>>>10,d=f[p+3&7],u^=d^d>>>3,d=f[p+4&7],u^=d^d<<7,d=f[p+7&7],d=d^d<<13,u^=d^d<<9,f[p]=u,s.i=p+1&7,u};function l(f,p){var d,u=[];if(p===(p|0))u[0]=p;else for(p=""+p,d=0;d<p.length;++d)u[d&7]=u[d&7]<<15^p.charCodeAt(d)+u[d+1&7]<<13;for(;u.length<8;)u.push(0);for(d=0;d<8&&u[d]===0;++d);for(d==8?u[7]=-1:u[d],f.x=u,f.i=0,d=256;d>0;--d)f.next()}l(s,a)}function r(a,s){return s.x=a.x.slice(),s.i=a.i,s}function c(a,s){a==null&&(a=+new Date);var l=new o(a),f=s&&s.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(f.x&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=c:this.xorshift7=c})(is,e)})(Ne)),Ne.exports}var Ge={exports:{}},rs=Ge.exports,Fn;function as(){return Fn||(Fn=1,(function(e){(function(t,n,i){function o(a){var s=this;s.next=function(){var f=s.w,p=s.X,d=s.i,u,h;return s.w=f=f+1640531527|0,h=p[d+34&127],u=p[d=d+1&127],h^=h<<13,u^=u<<17,h^=h>>>15,u^=u>>>12,h=p[d]=h^u,s.i=d,h+(f^f>>>16)|0};function l(f,p){var d,u,h,g,S,w=[],R=128;for(p===(p|0)?(u=p,p=null):(p=p+"\0",u=0,R=Math.max(R,p.length)),h=0,g=-32;g<R;++g)p&&(u^=p.charCodeAt((g+32)%p.length)),g===0&&(S=u),u^=u<<10,u^=u>>>15,u^=u<<4,u^=u>>>13,g>=0&&(S=S+1640531527|0,d=w[g&127]^=u+S,h=d==0?h+1:0);for(h>=128&&(w[(p&&p.length||0)&127]=-1),h=127,g=512;g>0;--g)u=w[h+34&127],d=w[h=h+1&127],u^=u<<13,d^=d<<17,u^=u>>>15,d^=d>>>12,w[h]=u^d;f.w=S,f.X=w,f.i=h}l(s,a)}function r(a,s){return s.i=a.i,s.w=a.w,s.X=a.X.slice(),s}function c(a,s){a==null&&(a=+new Date);var l=new o(a),f=s&&s.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(f.X&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=c:this.xor4096=c})(rs,e)})(Ge)),Ge.exports}var Ue={exports:{}},ss=Ue.exports,Bn;function cs(){return Bn||(Bn=1,(function(e){(function(t,n,i){function o(a){var s=this,l="";s.next=function(){var p=s.b,d=s.c,u=s.d,h=s.a;return p=p<<25^p>>>7^d,d=d-u|0,u=u<<24^u>>>8^h,h=h-p|0,s.b=p=p<<20^p>>>12^d,s.c=d=d-u|0,s.d=u<<16^d>>>16^h,s.a=h-p|0},s.a=0,s.b=0,s.c=-1640531527,s.d=1367130551,a===Math.floor(a)?(s.a=a/4294967296|0,s.b=a|0):l+=a;for(var f=0;f<l.length+20;f++)s.b^=l.charCodeAt(f)|0,s.next()}function r(a,s){return s.a=a.a,s.b=a.b,s.c=a.c,s.d=a.d,s}function c(a,s){var l=new o(a),f=s&&s.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(typeof f=="object"&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=c:this.tychei=c})(ss,e)})(Ue)),Ue.exports}var je={exports:{}};const ls={},ds=Object.freeze(Object.defineProperty({__proto__:null,default:ls},Symbol.toStringTag,{value:"Module"})),ps=Ka(ds);var us=je.exports,$n;function fs(){return $n||($n=1,(function(e){(function(t,n,i){var o=256,r=6,c=52,a="random",s=i.pow(o,r),l=i.pow(2,c),f=l*2,p=o-1,d;function u(m,y,k){var b=[];y=y==!0?{entropy:!0}:y||{};var C=w(S(y.entropy?[m,v(n)]:m??R(),3),b),I=new h(b),x=function(){for(var _=I.g(r),E=s,A=0;_<l;)_=(_+A)*o,E*=o,A=I.g(1);for(;_>=f;)_/=2,E/=2,A>>>=1;return(_+A)/E};return x.int32=function(){return I.g(4)|0},x.quick=function(){return I.g(4)/4294967296},x.double=x,w(v(I.S),n),(y.pass||k||function(_,E,A,L){return L&&(L.S&&g(L,I),_.state=function(){return g(I,{})}),A?(i[a]=_,E):_})(x,C,"global"in y?y.global:this==i,y.state)}function h(m){var y,k=m.length,b=this,C=0,I=b.i=b.j=0,x=b.S=[];for(k||(m=[k++]);C<o;)x[C]=C++;for(C=0;C<o;C++)x[C]=x[I=p&I+m[C%k]+(y=x[C])],x[I]=y;(b.g=function(_){for(var E,A=0,L=b.i,W=b.j,F=b.S;_--;)E=F[L=p&L+1],A=A*o+F[p&(F[L]=F[W=p&W+E])+(F[W]=E)];return b.i=L,b.j=W,A})(o)}function g(m,y){return y.i=m.i,y.j=m.j,y.S=m.S.slice(),y}function S(m,y){var k=[],b=typeof m,C;if(y&&b=="object")for(C in m)try{k.push(S(m[C],y-1))}catch{}return k.length?k:b=="string"?m:m+"\0"}function w(m,y){for(var k=m+"",b,C=0;C<k.length;)y[p&C]=p&(b^=y[p&C]*19)+k.charCodeAt(C++);return v(y)}function R(){try{var m;return d&&(m=d.randomBytes)?m=m(o):(m=new Uint8Array(o),(t.crypto||t.msCrypto).getRandomValues(m)),v(m)}catch{var y=t.navigator,k=y&&y.plugins;return[+new Date,t,k,t.screen,v(n)]}}function v(m){return String.fromCharCode.apply(0,m)}if(w(i.random(),n),e.exports){e.exports=u;try{d=ps}catch{}}else i["seed"+a]=u})(typeof self<"u"?self:us,[],Math)})(je)),je.exports}var bt,Dn;function hs(){if(Dn)return bt;Dn=1;var e=Ja(),t=es(),n=ns(),i=os(),o=as(),r=cs(),c=fs();return c.alea=e,c.xor128=t,c.xorwow=n,c.xorshift7=i,c.xor4096=o,c.tychei=r,bt=c,bt}var gs=hs();const ms=Ya(gs),Qe=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],yt=Qe.reduce((e,t)=>t.length<e.length?t:e).length,St=Qe.reduce((e,t)=>t.length>e.length?t:e).length;function bs(e){const t=e?.seed?new ms(e.seed):null,{minLength:n,maxLength:i,...o}=e||{};function r(){let u=typeof n!="number"?yt:a(n);const h=typeof i!="number"?St:a(i);u>h&&(u=h);let g=!1,S;for(;!g;)S=c(),g=S.length<=h&&S.length>=u;return S}function c(){return Qe[s(Qe.length)]}function a(u){return u<yt&&(u=yt),u>St&&(u=St),u}function s(u){const h=t?t():Math.random();return Math.floor(h*u)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(o).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=u=>u),typeof e.separator!="string"&&(e.separator=" ");const l=e.min+s(e.max+1-e.min);let f=[],p="",d=0;for(let u=0;u<l*e.wordsPerString;u++)d===e.wordsPerString-1?p+=e.formatter(r(),d):p+=e.formatter(r(),d)+e.separator,d++,(u+1)%e.wordsPerString===0&&(f.push(p),p="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const vi=e=>`${e}×`,ki=e=>`${e.toFixed(1)}×`;function _i(){const e=bs({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function ys(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=vi(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=ki(e.intensity),re(t.paneA,e.strategyA),re(t.paneB,e.strategyB),oe(t.paneA,e.repositionA),oe(t.paneB,e.repositionB),Jn(t,e.scenario);const n=H(e.scenario);Object.keys(e.overrides).length>0&&wi(t,!0),tt(n,e.overrides,t)}function Te(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function Ci(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const i=t.phaseLabel;if(!i)return;const o=n&&e.traffic.currentPhaseLabel()||"—";i.textContent!==o&&(i.textContent=o)}function Ti(e,t){if(!t.phaseProgress)return;const i=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==i&&(t.phaseProgress.style.width=i)}function Ss(e){if(e.length<2)return"M 0 13 L 100 13";let t=e[0]??0,n=e[0]??0;for(let c=1;c<e.length;c++){const a=e[c];a!==void 0&&(a<t&&(t=a),a>n&&(n=a))}const i=n-t,o=e.length;let r="";for(let c=0;c<o;c++){const a=c/(o-1)*100,s=i>0?13-((e[c]??0)-t)/i*12:7;r+=`${c===0?"M":"L"} ${a.toFixed(2)} ${s.toFixed(2)} `}return r.trim()}const At=[["wait avg","avg_wait_s"],["wait max","max_wait_s"],["delivered","delivered"],["abandoned","abandoned"],["util","utilization"]];function ws(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function vs(e,t,n){const i=On(e,n),o=On(t,n),r=i-o,c=r>0?"▲":"▼",a=r>0?"+":r<0?"−":"",s=Math.abs(r);switch(n){case"avg_wait_s":case"max_wait_s":return`${c} ${a}${s.toFixed(1)} s`;case"delivered":case"abandoned":return`${c} ${a}${s.toFixed(0)}`;case"utilization":return`${c} ${a}${(s*100).toFixed(0)}%`}}function On(e,t){switch(t){case"avg_wait_s":return e.avg_wait_s;case"max_wait_s":return e.max_wait_s;case"delivered":return e.delivered;case"abandoned":return e.abandoned;case"utilization":return e.utilization}}function ks(e,t){const n=(u,h,g,S)=>Math.abs(u-h)<g?["tie","tie"]:(S?u>h:u<h)?["win","lose"]:["lose","win"],[i,o]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,c]=n(e.max_wait_s,t.max_wait_s,.05,!1),[a,s]=n(e.delivered,t.delivered,.5,!0),[l,f]=n(e.abandoned,t.abandoned,.5,!1),[p,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:i,max_wait_s:r,delivered:a,abandoned:l,utilization:p},b:{avg_wait_s:o,max_wait_s:c,delivered:s,abandoned:f,utilization:d}}}function Wn(e){const t=document.createDocumentFragment();for(const[n]of At){const i=te("div","metric-row flex flex-col gap-[2px] px-2 py-1 text-right"),o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.classList.add("metric-spark"),o.setAttribute("viewBox","0 0 100 14"),o.setAttribute("preserveAspectRatio","none"),o.appendChild(document.createElementNS("http://www.w3.org/2000/svg","path")),i.append(te("span","metric-k",n),te("span","metric-v"),te("span","metric-d"),o),t.appendChild(i)}e.replaceChildren(t)}function wt(e,t,n,i,o){const r=e.children;for(let c=0;c<At.length;c++){const a=r[c];if(!a)continue;const s=At[c];if(!s)continue;const l=s[1],f=n?n[l]:"";a.dataset.verdict!==f&&(a.dataset.verdict=f);const p=a.children[1],d=ws(t,l);p.textContent!==d&&(p.textContent=d);const u=a.children[2],g=o!==null&&f!=="tie"&&f!==""?vs(t,o,l):"";u.textContent!==g&&(u.textContent=g);const w=a.children[3].firstElementChild,R=Ss(i[l]);w.getAttribute("d")!==R&&w.setAttribute("d",R)}}const _s=200;function Ri(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function ee(e,t){const n=++e.initToken;t.loader.classList.add("show");const i=H(e.permalink.scenario);e.traffic=new mi(Yn(e.permalink.seed)),Ri(e,i),Se(e.paneA),Se(e.paneB),e.paneA=null,e.paneB=null;try{const o=await wn(t.paneA,e.permalink.strategyA,e.permalink.repositionA,i,e.permalink.overrides);re(t.paneA,e.permalink.strategyA),oe(t.paneA,e.permalink.repositionA),Wn(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await wn(t.paneB,e.permalink.strategyB,e.permalink.repositionB,i,e.permalink.overrides),re(t.paneB,e.permalink.strategyB),oe(t.paneB,e.permalink.repositionB),Wn(t.paneB.metrics)}catch(c){throw Se(o),c}if(n!==e.initToken){Se(o),Se(r);return}e.paneA=o,e.paneB=r,e.seeding=i.seedSpawns>0?{remaining:i.seedSpawns}:null,Ci(e,t),Ti(e,t),tt(i,e.permalink.overrides,t)}catch(o){throw n===e.initToken&&N(t.toast,`Init failed: ${o.message}`),o}finally{n===e.initToken&&t.loader.classList.remove("show")}}function Cs(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let i=0;i<_s&&e.seeding.remaining>0;i++){const o=e.traffic.drainSpawns(t,n);for(const r of o)if(Tt(e,c=>{const a=c.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);a.kind==="err"&&console.warn(`spawnRider failed (seed): ${a.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(Ri(e,H(e.permalink.scenario)),e.seeding=null)}function Ts(e,t){const n=()=>ee(e,t),i={renderPaneStrategyInfo:re,renderPaneRepositionInfo:oe,refreshStrategyPopovers:()=>{Ce(e,t,n),_e(e,t,n)},renderTweakPanel:()=>{const r=H(e.permalink.scenario);tt(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const c=r.target;if(!(c instanceof HTMLElement))return;const a=c.closest(".scenario-card");if(!a)return;const s=a.dataset.scenarioId;!s||s===e.permalink.scenario||Zn(e,t,s,n,i)}),En(e,t,t.paneA,n),En(e,t,t.paneB,n),Cn(e,t,t.paneA,n),Cn(e,t,t.paneB,n),Ce(e,t,n),_e(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},q(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",Ce(e,t,n),_e(e,t,n),ee(e,t).then(()=>{N(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||O.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},q(e.permalink),ee(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=_i();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},q(e.permalink),ee(e,t).then(()=>{N(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=vi(r)}),t.speedInput.addEventListener("change",()=>{q(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=ki(r)}),t.intensityInput.addEventListener("change",()=>{q(e.permalink)});const o=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};o(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,o()}),t.resetBtn.addEventListener("click",()=>{ee(e,t),N(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";wi(t,r)});for(const r of he){const c=t.tweakRows[r];Kt(c.dec,()=>{Oe(e,t,r,-1,n)}),Kt(c.inc,()=>{Oe(e,t,r,1,n)}),c.reset.addEventListener("click",()=>{za(e,t,r,n)}),c.root.addEventListener("keydown",a=>{a.key==="ArrowUp"||a.key==="ArrowRight"?(a.preventDefault(),Oe(e,t,r,1,n)):(a.key==="ArrowDown"||a.key==="ArrowLeft")&&(a.preventDefault(),Oe(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{Va(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=Xn(e.permalink),c=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(c).then(()=>{N(t.toast,"Permalink copied")},()=>{N(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{Te(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{Te(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&Te(t,!1)}),Rs(e,t,i),Na(t)}function Rs(e,t,n){window.addEventListener("keydown",i=>{if(e.permalink.mode==="quest")return;if(i.target instanceof HTMLElement){const r=i.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||i.target.isContentEditable||i.target.closest(".monaco-editor"))return}if(i.metaKey||i.ctrlKey||i.altKey)return;switch(i.key){case" ":{i.preventDefault(),t.playBtn.click();return}case"r":case"R":{i.preventDefault(),t.resetBtn.click();return}case"c":case"C":{i.preventDefault(),t.compareToggle.click();return}case"s":case"S":{i.preventDefault(),t.shareBtn.click();return}case"t":case"T":{i.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{i.preventDefault(),Te(t,t.shortcutSheet.hidden);return}case"Escape":{if(Si(t)||yi(t)){i.preventDefault(),et(t);return}t.shortcutSheet.hidden||(i.preventDefault(),Te(t,!1));return}}const o=Number(i.key);if(Number.isInteger(o)&&o>=1&&o<=Ee.length){const r=Ee[o-1];if(!r)return;r.id!==e.permalink.scenario&&(i.preventDefault(),Zn(e,t,r.id,()=>ee(e,t),n))}})}const Es="elevator-core playground",qn="In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";function Hn(e){Fi(xs(e))}function xs(e){if(e.mode==="quest")return{title:`Quest curriculum — ${Es}`,description:"Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time."};const n=H(e.scenario).label,i=fe[e.strategyA],o=fe[e.strategyB],r=xe[e.repositionA],c=xe[e.repositionB];if(e.compare){const l=`${n}: ${i} vs ${o} — Elevator dispatch playground`,f=`Compare ${i} (parking: ${r}) against ${o} (parking: ${c}) dispatch on the ${n.toLowerCase()} scenario. ${qn}`;return{title:l,description:f}}const a=`${n}: ${i} dispatch — Elevator dispatch playground`,s=`Watch ${i} dispatch (parking: ${r}) handle live rider traffic on the ${n.toLowerCase()} scenario. ${qn}`;return{title:a,description:s}}function Is(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const i=ks(t.latestMetrics,n.latestMetrics);wt(t.metricsEl,t.latestMetrics,i.a,t.metricHistory,n.latestMetrics),wt(n.metricsEl,n.latestMetrics,i.b,n.metricHistory,t.latestMetrics)}else wt(t.metricsEl,t.latestMetrics,null,t.metricHistory,null);kn(t),n&&kn(n)}function As(e,t){let n=0;const i=()=>{const o=performance.now(),r=(o-e.lastFrameTime)/1e3;e.lastFrameTime=o;const c=e.paneA,a=e.paneB,s=c!==null&&(!e.permalink.compare||a!==null);if(e.running&&e.ready&&s){const l=e.permalink.speed;Tt(e,g=>{g.sim.step(l);const S=g.sim.drainEvents();if(S.length>0){const w=g.sim.snapshot();Da(g,S,w);const R=new Map;for(const v of w.cars)R.set(v.id,v.line);for(const v of S)if(v.kind==="elevator-assigned"){const m=R.get(v.elevator);m!==void 0&&g.renderer.pushAssignment(v.stop,v.elevator,m)}}}),e.seeding&&Cs(e);const f=c.sim.snapshot(),d=Math.min(r,4/60)*l,u=e.seeding?[]:e.traffic.drainSpawns(f,d);for(const g of u)Tt(e,S=>{const w=S.sim.spawnRider(g.originStopId,g.destStopId,g.weight,g.patienceTicks);w.kind==="err"&&console.warn(`spawnRider failed: ${w.error}`)});const h=e.permalink.speed;vn(c,c.sim.snapshot(),h),a&&vn(a,a.sim.snapshot(),h),Is(e),(n+=1)%4===0&&(Ci(e,t),Ti(e,t))}requestAnimationFrame(i)};requestAnimationFrame(i)}async function Ms(){gi().catch(()=>{});const t=Ha(),n=new URLSearchParams(window.location.search).has("k"),i={...O,...eo(window.location.search)};if(!n){i.seed=_i();const a=new URL(window.location.href);a.searchParams.set("k",i.seed),window.history.replaceState(null,"",a.toString())}so(i);const o=H(i.scenario),r=new URLSearchParams(window.location.search);o.defaultReposition!==void 0&&(r.has("pa")||(i.repositionA=o.defaultReposition),r.has("pb")||(i.repositionB=o.defaultReposition)),i.overrides=Nn(o,i.overrides),po(i.mode),uo(i.mode),ys(i,t);const c={running:!0,ready:!1,permalink:i,paneA:null,paneB:null,traffic:new mi(Yn(i.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(Ts(c,t),Ji(Hn),Hn(i),Li(),await ee(c,t),c.ready=!0,As(c,t),c.permalink.mode==="quest"){const a=new URLSearchParams(window.location.search).has("qs");await Ia({initialStageId:c.permalink.questStage,landOn:a?"stage":"grid",onStageChange:s=>{c.permalink.questStage=s,q(c.permalink)},onBackToGrid:()=>{c.permalink.questStage=O.questStage,q(c.permalink)}})}}Ms();export{Xe as _};
