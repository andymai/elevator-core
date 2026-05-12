const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-BsuAd2cJ.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function ie(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let mn=0;function N(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(mn),mn=window.setTimeout(()=>{e.classList.remove("show")},1600)}function bn(e,t){let i=0,r=0;const c=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",a=>{e.disabled||(a.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){c();return}t()},70)},380))}),e.addEventListener("pointerup",c),e.addEventListener("pointerleave",c),e.addEventListener("pointercancel",c),e.addEventListener("blur",c),e.addEventListener("click",a=>{a.pointerType||t()})}function _i(){document.getElementById("seo-fallback")?.remove()}function Ci(e){document.title!==e.title&&(document.title=e.title),ke('meta[name="description"]',"content",e.description),ke('meta[property="og:title"]',"content",e.title),ke('meta[property="og:description"]',"content",e.description),ke('meta[name="twitter:title"]',"content",e.title),ke('meta[name="twitter:description"]',"content",e.description)}function ke(e,t,n){const o=document.querySelector(e);o&&o.getAttribute(t)!==n&&o.setAttribute(t,n)}function re(e,t,n){const o=tn(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return To(i,r.min,r.max)}function tn(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return Co(n.doorOpenTicks,n.doorTransitionTicks)}}function nn(e,t,n){const o=tn(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function _o(e,t){const n={};for(const o of ve){const i=t[o];i!==void 0&&nn(e,o,i)&&(n[o]=i)}return n}const ve=["cars","maxSpeed","weightCapacity","doorCycleSec"];function Ti(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=Co(n,o),r=To(n/(i*nt),.1,.9),c=Math.max(2,Math.round(t*nt)),a=Math.max(1,Math.round(c*r)),s=Math.max(1,Math.round((c-a)/2));return{openTicks:a,transitionTicks:s}}function Co(e,t){return(e+2*t)/nt}function on(e,t){const n=e.elevatorDefaults,o=re(e,"maxSpeed",t),i=re(e,"weightCapacity",t),r=re(e,"doorCycleSec",t),{openTicks:c,transitionTicks:a}=Ti(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:c,doorTransitionTicks:a}}function Ri(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function Ii(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(re(e,"cars",t)),i=on(e,t),r=Ri(e.stops.length,o),c=e.stops.map((s,l)=>`        StopConfig(id: StopId(${l}), name: ${Gt(s.name)}, position: ${j(s.positionM)}),`).join(`
`),a=r.map((s,l)=>Ei(l,i,s,Mi(l,o))).join(`
`);return`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: ${Gt(e.buildingName)},
        stops: [
${c}
        ],
    ),
    elevators: [
${a}
    ],
    simulation: SimulationParams(ticks_per_second: ${j(nt)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${j(e.passengerWeightRange[0])}, ${j(e.passengerWeightRange[1])}),
    ),
)`}const nt=60;function To(e,t,n){return Math.min(n,Math.max(t,e))}function Mi(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function Ei(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${j(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${j(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${Gt(o)},
            max_speed: ${j(t.maxSpeed)}, acceleration: ${j(t.acceleration)}, deceleration: ${j(t.deceleration)},
            weight_capacity: ${j(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function Gt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function j(e){return Number.isInteger(e)?`${e}.0`:String(e)}const Ro={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function Ge(e){return Array.from({length:e},()=>1)}const he=5,xi=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:he},(e,t)=>t===he-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:Ge(he),destWeights:Ge(he)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:Ge(he),destWeights:Ge(he)}],Ai={id:"convention-burst",label:"Convention center",configFilename:"convention_burst.ron",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:xi,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...Ro,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`// Convention center: keynote ends, 200+ riders flood the lobby at once.
SimConfig(
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
    // 5s door dwell + cars pre-spread across floors for the rush.
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
)`},ot=19,Ut=16,Pe=4,Io=(1+ot)*Pe,Re=1,Ie=41,Me=42,Pi=43;function z(e){return Array.from({length:Pi},(t,n)=>e(n))}const ge=e=>e===Re||e===Ie||e===Me,Li=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:z(e=>e===0?20:e===Re?2:e===Ie?1.2:e===Me?.2:.1),destWeights:z(e=>e===0?0:e===Re?.3:e===Ie?.4:e===Me?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:z(e=>ge(e)?.5:1),destWeights:z(e=>ge(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:z(e=>e===21?4:ge(e)?.25:1),destWeights:z(e=>e===21?5:ge(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:z(e=>e===0||e===Re||e===21?.3:e===Ie?.4:e===Me?1.2:1),destWeights:z(e=>e===0?20:e===Re?1:e===Ie?.6:e===Me?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:z(e=>ge(e)?1.5:.2),destWeights:z(e=>ge(e)?1.5:.2)}];function Bi(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let a=1;a<=ot;a++){const s=1+a,l=a*Pe;e.push(`        StopConfig(id: StopId(${s.toString().padStart(2," ")}), name: "Floor ${a}",    position: ${l.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${Io.toFixed(1)}),`);for(let a=21;a<=20+Ut;a++){const s=1+a,l=a*Pe;e.push(`        StopConfig(id: StopId(${s}), name: "Floor ${a}",   position: ${l.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:ot},(a,s)=>2+s),21],n=[21,...Array.from({length:Ut},(a,s)=>22+s)],o=[1,21,38,39,40],i=[1,0,41,42],r=a=>a.map(s=>`StopId(${s})`).join(", "),c=(a,s,l,f)=>`                ElevatorConfig(
                    id: ${a}, name: "${s}",
                    max_speed: 4.5, acceleration: 2.0, deceleration: 2.5,
                    weight_capacity: ${f.toFixed(1)},
                    starting_stop: StopId(${l}),
                    door_open_ticks: 240, door_transition_ticks: 60,
                    bypass_load_up_pct: Some(0.85), bypass_load_down_pct: Some(0.55),
                ),`;return`// 40-floor tower: transfer at the Sky Lobby; the Exec car alone reaches the penthouse.
SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Skyscraper",
        stops: [
${e.join(`
`)}
        ],
        // Four banks; topology graph plans transfers at the Sky Lobby.
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
            // Sparse service traffic — park where the trip ends, don't cycle back.
            GroupConfig(id: 3, name: "Service", lines: [3], dispatch: Scan, reposition: Some(NearestIdle)),
        ]),
    ),
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 20,
        weight_range: (55.0, 100.0),
    ),
)`}const Fi=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:ot},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*Pe})),{name:"Sky Lobby",positionM:Io},...Array.from({length:Ut},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*Pe})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],$i={id:"skyscraper-sky-lobby",label:"Skyscraper",configFilename:"skyscraper.ron",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:Li,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:Fi,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...Ro,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:Bi()},yn=1e5,Sn=4e5,vn=35786e3,Di=1e8,Oi=4;function Ue(e){return Array.from({length:Oi},(t,n)=>e(n))}const Wi={id:"space-elevator",label:"Space elevator",configFilename:"space_elevator.ron",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:Ue(e=>e===0?6:1),destWeights:Ue(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:Ue(e=>e===0?0:e===1?1:e===2?3:5),destWeights:Ue(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:yn},{name:"LEO Transfer",positionM:Sn},{name:"GEO Platform",positionM:vn}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:Di,showDayNight:!1},ron:`// Tether to GEO (35,786 km). Three climbers at 1,000 m/s; same engine, scaled up.
SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${yn.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${Sn.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${vn.toFixed(1)}),
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
)`},Hi=[{name:"Terminal",positionM:0},{name:"Concourse A",positionM:300},{name:"Concourse B",positionM:500},{name:"Concourse C",positionM:700},{name:"Concourse D",positionM:900},{name:"Concourse E",positionM:1100},{name:"Concourse F",positionM:1300},{name:"Terminal",positionM:0},{name:"Concourse F",positionM:200},{name:"Concourse E",positionM:400},{name:"Concourse D",positionM:600},{name:"Concourse C",positionM:800},{name:"Concourse B",positionM:1e3},{name:"Concourse A",positionM:1200}],Ni=7,qi=1500,Gi=[{name:"Morning departure rush",durationSec:90,ridersPerMin:30,originWeights:[8,1,1,1,1,1,1,8,1,1,1,1,1,1],destWeights:[0,1,1,1,1,1,1,0,1,1,1,1,1,1]},{name:"Midday operations",durationSec:75,ridersPerMin:14,originWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1],destWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1]},{name:"Evening arrival surge",durationSec:90,ridersPerMin:30,originWeights:[1,3,3,3,3,3,3,1,3,3,3,3,3,3],destWeights:[10,0,0,0,0,0,0,10,0,0,0,0,0,0]},{name:"Late night",durationSec:45,ridersPerMin:4,originWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1],destWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1]}],Ui={id:"airport-apm",label:"Airport loop",configFilename:"airport_loop.ron",description:"Two counter-rotating loops connect the terminal to six concourses. Fixed-headway dispatch keeps trains on a predictable cadence; rider demand shifts from outbound (morning) to inbound (evening).",defaultStrategy:"scan",phases:Gi,seedSpawns:0,abandonAfterSec:240,featureHint:"Watch the fixed-headway schedule keep both loops in lockstep, even as demand shifts from outbound (morning) to inbound (evening). Trains can't overtake — that's the loop_lines no-overtake guarantee.",buildingName:"Airport Loop",stops:Hi,defaultCars:4,elevatorDefaults:{maxSpeed:14,acceleration:1,deceleration:1,weightCapacity:9e3,doorOpenTicks:1500,doorTransitionTicks:180},tweakRanges:{cars:{min:4,max:4,step:1},maxSpeed:{min:8,max:20,step:1},weightCapacity:{min:4e3,max:2e4,step:1e3},doorCycleSec:{min:15,max:40,step:1}},passengerMeanIntervalTicks:60,passengerWeightRange:[55,100],airport:{outerStopCount:Ni,circumferenceM:qi},ron:`// Counter-rotating loops to six concourses. No overtaking; fixed headway sets the cadence.
SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Airport Loop",
        // Each loop has its own Terminal + Concourse stops; inner positions mirror outer.
        stops: [
            StopConfig(id: StopId(0),  name: "Terminal",     position: 0.0),
            StopConfig(id: StopId(1),  name: "Concourse A",  position: 300.0),
            StopConfig(id: StopId(2),  name: "Concourse B",  position: 500.0),
            StopConfig(id: StopId(3),  name: "Concourse C",  position: 700.0),
            StopConfig(id: StopId(4),  name: "Concourse D",  position: 900.0),
            StopConfig(id: StopId(5),  name: "Concourse E",  position: 1100.0),
            StopConfig(id: StopId(6),  name: "Concourse F",  position: 1300.0),
            StopConfig(id: StopId(7),  name: "Terminal",     position: 0.0),
            StopConfig(id: StopId(8),  name: "Concourse F",  position: 200.0),
            StopConfig(id: StopId(9),  name: "Concourse E",  position: 400.0),
            StopConfig(id: StopId(10), name: "Concourse D",  position: 600.0),
            StopConfig(id: StopId(11), name: "Concourse C",  position: 800.0),
            StopConfig(id: StopId(12), name: "Concourse B",  position: 1000.0),
            StopConfig(id: StopId(13), name: "Concourse A",  position: 1200.0),
        ],
        lines: Some([
            // Outer loop: Terminal → A→B→C→D→E→F → Terminal. min_headway stops trains bunching.
            LineConfig(
                id: 1, name: "Outer Loop",
                kind: Some(Loop(circumference: 1500.0, min_headway: 200.0)),
                serves: [StopId(0), StopId(1), StopId(2), StopId(3), StopId(4), StopId(5), StopId(6)],
                position: None, orientation: Horizontal,
                elevators: [
                    ElevatorConfig(
                        id: 1, name: "Outer Train 1",
                        max_speed: 14.0, acceleration: 1.0, deceleration: 1.0,
                        weight_capacity: 9000.0,
                        starting_stop: StopId(0),
                        door_open_ticks: 1500, door_transition_ticks: 180,
                    ),
                    ElevatorConfig(
                        id: 2, name: "Outer Train 2",
                        max_speed: 14.0, acceleration: 1.0, deceleration: 1.0,
                        weight_capacity: 9000.0,
                        starting_stop: StopId(4),
                        door_open_ticks: 1500, door_transition_ticks: 180,
                    ),
                ],
            ),
            // Inner loop runs the same stops reversed so both directions are covered.
            LineConfig(
                id: 2, name: "Inner Loop",
                kind: Some(Loop(circumference: 1500.0, min_headway: 200.0)),
                serves: [StopId(7), StopId(8), StopId(9), StopId(10), StopId(11), StopId(12), StopId(13)],
                position: None, orientation: Horizontal,
                elevators: [
                    ElevatorConfig(
                        id: 3, name: "Inner Train 1",
                        max_speed: 14.0, acceleration: 1.0, deceleration: 1.0,
                        weight_capacity: 9000.0,
                        starting_stop: StopId(7),
                        door_open_ticks: 1500, door_transition_ticks: 180,
                    ),
                    ElevatorConfig(
                        id: 4, name: "Inner Train 2",
                        max_speed: 14.0, acceleration: 1.0, deceleration: 1.0,
                        weight_capacity: 9000.0,
                        starting_stop: StopId(10),
                        door_open_ticks: 1500, door_transition_ticks: 180,
                    ),
                ],
            ),
        ]),
        groups: Some([
            GroupConfig(id: 0, name: "Outer Service", lines: [1], dispatch: LoopSchedule),
            GroupConfig(id: 1, name: "Inner Service", lines: [2], dispatch: LoopSchedule),
        ]),
    ),
    elevators: [],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 60,
        weight_range: (55.0, 100.0),
    ),
)`},Le=[$i,Wi,Ui,Ai];function q(e){const t=Le.find(o=>o.id===e);if(t)return t;const n=Le[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const Mo={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},O={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},Xi=["scan","look","nearest","etd","destination","rsr"],zi=["adaptive","predictive","lobby","spread","none"];function wn(e,t){return e!==null&&Xi.includes(e)?e:t}function kn(e,t){return e!==null&&zi.includes(e)?e:t}const Xt=new Set;function _n(e){return Xt.add(e),()=>Xt.delete(e)}function G(e){const t=Eo(e);if(window.location.search!==t){window.history.replaceState(null,"",t);for(const n of Xt)n(e)}}function ji(e,t){return e==="compare"||e==="quest"?e:t}function Eo(e){const t=new URLSearchParams;e.mode!==O.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==O.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=q(e.scenario).defaultReposition,o=n??O.repositionA,i=n??O.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of ve){const c=e.overrides[r];c!==void 0&&Number.isFinite(c)&&t.set(Mo[r],Yi(c))}return`?${t.toString()}`}function Vi(e){const t=new URLSearchParams(e),n={};for(const o of ve){const i=t.get(Mo[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:ji(t.get("m"),O.mode),questStage:(t.get("qs")??"").trim()||O.questStage,scenario:t.get("s")??O.scenario,strategyA:wn(t.get("a")??t.get("d"),O.strategyA),strategyB:wn(t.get("b"),O.strategyB),repositionA:kn(t.get("pa"),O.repositionA),repositionB:kn(t.get("pb"),O.repositionB),compare:t.has("c")?t.get("c")==="1":O.compare,seed:(t.get("k")??"").trim()||O.seed,intensity:Cn(t.get("i"),O.intensity),speed:Cn(t.get("x"),O.speed),overrides:n}}function Cn(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function Yi(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function xo(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const Ki=["scan","look","nearest","etd","destination","rsr"],Se={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},Ao={scan:"Sweep end-to-end, reverse at each end.",look:"Sweep until last call, then reverse.",nearest:"Assign each call to the closest car.",etd:"Assign by estimated time-to-destination.",destination:"Riders enter destination at the lobby; the group optimises.",rsr:"ETD penalised by queue length."},Qi=["adaptive","predictive","lobby","spread","none"],Be={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},Po={adaptive:"Switch by traffic mode; the default.",predictive:"Park near the most-active floor.",lobby:"Return idle cars to the lobby.",spread:"Fan idle cars across the shaft.",none:"Idle cars stay where they finished."},Ji="scenario-card inline-flex items-center gap-1.5 px-2 py-1 border-b-2 border-b-transparent text-content-tertiary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:text-content aria-pressed:text-content aria-pressed:border-b-accent max-md:flex-none max-md:snap-start",Zi="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function er(e){const t=document.createDocumentFragment();Le.forEach((n,o)=>{const i=ie("button",Ji);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(ie("span","",n.label),ie("span",Zi,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function Lo(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}async function Bo(e,t,n,o,i){const r=q(n);r.airport!==void 0&&(e.permalink={...e.permalink,compare:!1});const a=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,s=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:a,repositionA:s,overrides:{}},G(e.permalink),i.renderPaneStrategyInfo(t.paneA,a),i.renderPaneRepositionInfo(t.paneA,s),i.refreshStrategyPopovers(),Lo(t,r.id),await o(),i.renderTweakPanel(),i.applyGating(r),N(t.toast,`${r.label} · ${Se[a]}`)}function tr(e){const t=q(e.scenario);e.scenario=t.id}const nr=["layout","scenario-picker","scenario-config","controls-bar","cabin-legend"],or=["quest-pane"];function ir(e){const t=e==="quest";for(const n of nr){const o=document.getElementById(n);o&&o.classList.toggle("hidden",t)}for(const n of or){const o=document.getElementById(n);o&&(o.classList.toggle("hidden",!t),o.classList.toggle("flex",t))}}function rr(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const o of n){const i=o.dataset.mode===e;o.dataset.active=String(i),o.setAttribute("aria-pressed",String(i))}t.addEventListener("click",o=>{const i=o.target;if(!(i instanceof HTMLElement))return;const r=i.closest("button[data-mode]");if(!r)return;const c=r.dataset.mode;if(c!=="compare"&&c!=="quest"||c===e)return;const a=new URL(window.location.href);c==="compare"?(a.searchParams.delete("m"),a.searchParams.delete("qs")):a.searchParams.set("m",c),window.location.assign(a.toString())})}const sr="modulepreload",ar=function(e,t){return new URL(e,t).href},Tn={},it=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let c=function(f){return Promise.all(f.map(u=>Promise.resolve(u).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const a=document.getElementsByTagName("link"),s=document.querySelector("meta[property=csp-nonce]"),l=s?.nonce||s?.getAttribute("nonce");i=c(n.map(f=>{if(f=ar(f,o),f in Tn)return;Tn[f]=!0;const u=f.endsWith(".css"),d=u?'[rel="stylesheet"]':"";if(!!o)for(let m=a.length-1;m>=0;m--){const g=a[m];if(g.href===f&&(!u||g.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=u?"stylesheet":sr,u||(h.as="script"),h.crossOrigin="",h.href=f,l&&h.setAttribute("nonce",l),document.head.appendChild(h),u)return new Promise((m,g)=>{h.addEventListener("load",m),h.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(c){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=c,window.dispatchEvent(a),!a.defaultPrevented)throw c}return i.then(c=>{for(const a of c||[])a.status==="rejected"&&r(a.reason);return t().catch(r)})};class Fo extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function cr(e){const t=(await it(async()=>{const{default:i}=await import("./worker-DE_xV-Fq.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new lr(n);return await o.init(e),o}class lr{#e;#n=new Map;#t=1;#r=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#a),this.#e.addEventListener("error",this.#s),this.#e.addEventListener("messageerror",this.#s)}async init(t){await this.#i({kind:"init",id:this.#o(),payload:this.#d(t)})}async tick(t,n){const o=n?.wantVisuals??!1;return this.#i({kind:"tick",id:this.#o(),ticks:t,...o?{wantVisuals:!0}:{}})}async spawnRider(t,n,o,i){return this.#i({kind:"spawn-rider",id:this.#o(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#i({kind:"set-strategy",id:this.#o(),strategy:t})}async loadController(t,n){const o=n?.unlockedApi??null,i=n?.timeoutMs,r=this.#i({kind:"load-controller",id:this.#o(),source:t,unlockedApi:o});if(i===void 0){await r;return}r.catch(()=>{});let c;const a=new Promise((s,l)=>{c=setTimeout(()=>{l(new Error(`controller did not return within ${i}ms`))},i)});try{await Promise.race([r,a])}finally{c!==void 0&&clearTimeout(c)}}async reset(t){await this.#i({kind:"reset",id:this.#o(),payload:this.#d(t)})}dispose(){this.#r||(this.#r=!0,this.#e.removeEventListener("message",this.#a),this.#e.removeEventListener("error",this.#s),this.#e.removeEventListener("messageerror",this.#s),this.#e.terminate(),this.#l(new Error("WorkerSim disposed")))}#l(t){for(const n of this.#n.values())n.reject(t);this.#n.clear()}#o(){return this.#t++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#i(t){if(this.#r)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#n.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#s=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#r=!0,this.#e.terminate(),this.#l(new Error(o))};#a=t=>{const n=t.data,o=this.#n.get(n.id);if(o)switch(this.#n.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":{const i=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;o.reject(i!==null?new Fo(n.message,i):new Error(n.message));return}default:{const i=n.kind;o.reject(new Error(`WorkerSim: unknown reply kind "${String(i)}"`));return}}}}const dr=`// Quest curriculum — sim global declaration.
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
`,Rn="quest-runtime";let Ct=null,me=null;async function pr(){return Ct||me||(me=(async()=>{await ur();const e=await it(()=>import("./editor.main-BsuAd2cJ.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return Ct=e,e})(),me.catch(()=>{me=null}),me)}async function ur(){const[{default:e},{default:t}]=await Promise.all([it(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),it(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}function fr(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(dr,"ts:filename/quest-sim-globals.d.ts"))}function hr(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function gr(e){const t=await pr();fr(t),hr(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o()});return{dispose:()=>{i.dispose()}}},insertAtCursor(o){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:o,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(o){const i=n.getModel();if(!i)return;const r=o.message.split(`
`)[0]??o.message;t.editor.setModelMarkers(i,Rn,[{severity:8,message:r,startLineNumber:o.line,startColumn:o.column,endLineNumber:o.line,endColumn:o.column+1}]),n.revealLineInCenterIfOutsideViewport(o.line)},clearRuntimeMarker(){const o=n.getModel();o&&t.editor.setModelMarkers(o,Rn,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const mr=`SimConfig(
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
)`,br={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:mr,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},yr=`SimConfig(
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
)`,Sr={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:yr,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},vr=`SimConfig(
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
)`,wr={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:vr,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},kr=`SimConfig(
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
)`,_r={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:kr,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function F(e,t){const n=t.startTick??0,o=t.intervalTicks??30,i=t.destinations;if(i.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,c)=>{const a=i[c%i.length];return{origin:t.origin,destination:a,atTick:n+c*o,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const Cr=`SimConfig(
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
)`,Tr={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:Cr,unlockedApi:["setStrategy"],seedRiders:[...F(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},Rr=`SimConfig(
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
)`,Ir=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,Mr={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:Rr,unlockedApi:["setStrategyJs"],seedRiders:[...F(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...F(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:Ir,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},Er=`SimConfig(
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
)`,xr={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:Er,unlockedApi:["setStrategyJs"],seedRiders:[...F(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...F(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},Ar=`SimConfig(
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
)`,Pr=`// Stage 8 — Event-Driven
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
`,Lr={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:Ar,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...F(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...F(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:Pr,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},Br=`SimConfig(
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
)`,Fr=`// Stage 9 — Take the Wheel
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
`,$r={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:Br,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...F(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:Fr,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},Dr=`SimConfig(
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
)`,Or=`// Stage 10 — Patient Boarding
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
`,Wr={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:Dr,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...F(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:Or,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},Hr=`SimConfig(
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
)`,Nr=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,qr={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:Hr,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...F(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...F(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:Nr,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},Gr=`SimConfig(
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
)`,Ur=`// Stage 12 — Routes
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
`,Xr={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:Gr,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...F(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...F(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:Ur,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},zr=`SimConfig(
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
)`,jr=`// Stage 13 — Transfer Points
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
`,Vr={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:zr,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...F(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...F(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...F(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:jr,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},Yr=`SimConfig(
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
)`,Kr=`// Stage 14 — Build a Floor
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
`,Qr={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:Yr,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...F(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:Kr,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},Jr=`SimConfig(
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
)`,Zr=`// Stage 15 — Sky Lobby
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
`,es={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:Jr,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...F(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...F(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:Zr,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},ae=[br,Sr,wr,_r,Tr,Mr,xr,Lr,$r,Wr,qr,Xr,Vr,Qr,es];function ts(e){return ae.find(t=>t.id===e)}function ns(e){const t=ae.findIndex(n=>n.id===e);if(!(t<0))return ae[t+1]}function P(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function ct(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const rt="quest:code:v1:",$o="quest:bestStars:v1:",Do=5e4;function $e(){try{return globalThis.localStorage??null}catch{return null}}function In(e){const t=$e();if(!t)return null;try{const n=t.getItem(rt+e);if(n===null)return null;if(n.length>Do){try{t.removeItem(rt+e)}catch{}return null}return n}catch{return null}}function Mn(e,t){if(t.length>Do)return;const n=$e();if(n)try{n.setItem(rt+e,t)}catch{}}function os(e){const t=$e();if(t)try{t.removeItem(rt+e)}catch{}}function De(e){const t=$e();if(!t)return 0;let n;try{n=t.getItem($o+e)}catch{return 0}if(n===null)return 0;const o=Number.parseInt(n,10);return!Number.isInteger(o)||o<0||o>3?0:o}function is(e,t){const n=De(e);if(t<=n)return;const o=$e();if(o)try{o.setItem($o+e,String(t))}catch{}}const rs={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},ss=["basics","strategies","events-manual","topology"],Oo=3;function as(){return{root:P("quest-grid","quest-grid"),progress:P("quest-grid-progress","quest-grid"),sections:P("quest-grid-sections","quest-grid")}}function Tt(e,t){ct(e.sections);let n=0;const o=ae.length*Oo;for(const i of ss){const r=ae.filter(l=>l.section===i);if(r.length===0)continue;const c=document.createElement("section");c.dataset.section=i;const a=document.createElement("h2");a.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",a.textContent=rs[i],c.appendChild(a);const s=document.createElement("div");s.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const l of r){const f=De(l.id);n+=f,s.appendChild(cs(l,f,t))}c.appendChild(s),e.sections.appendChild(c)}e.progress.textContent=`${n} / ${o}`}function cs(e,t,n){const o=ae.findIndex(u=>u.id===e.id),i=String(o+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const c=document.createElement("div");c.className="flex items-baseline justify-between gap-2";const a=document.createElement("span");a.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",a.textContent=i,c.appendChild(a);const s=document.createElement("span");s.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",s.classList.add(t>0?"text-accent":"text-content-disabled"),s.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),s.textContent="★".repeat(t)+"☆".repeat(Oo-t),c.appendChild(s),r.appendChild(c);const l=document.createElement("div");l.className="text-content text-[13px] font-semibold tracking-[-0.01em]",l.textContent=e.title,r.appendChild(l);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const ls=75;async function En(e,t,n,o){let i=n;for(;i<t.length;){const r=t[i];if(r===void 0||(r.atTick??0)>o)break;await e.spawnRider(r.origin,r.destination,r.weight??ls,r.patienceTicks),i+=1}return i}async function ds(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await cr({configRon:e.configRon,strategy:"scan"});try{const c=[...e.seedRiders].sort((d,p)=>(d.atTick??0)-(p.atTick??0));let a=await En(r,c,0,0);const s={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(s.timeoutMs=n.timeoutMs),await r.loadController(t,s);let l=null,f=0;const u=n.onSnapshot!==void 0;for(;f<o;){const d=o-f,p=Math.min(i,d),h=await r.tick(p,u?{wantVisuals:!0}:void 0);l=h.metrics,f=h.tick,a=await En(r,c,a,f);const m=xn(l,f);if(n.onProgress)try{n.onProgress(m)}catch{}if(n.onSnapshot&&h.snapshot)try{n.onSnapshot(h.snapshot)}catch{}if(e.passFn(m))return An(e,m,!0)}if(l===null)throw new Error("runStage: maxTicks must be positive");return An(e,xn(l,f),!1)}finally{r.dispose()}}function xn(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function An(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}function ps(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const o=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(o)&&o>0&&n.push(`${o.toFixed(1)}s avg wait`),n.join(" · ")}const Wo=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(Wo.map(e=>[e.name,e]));function Ho(e){const t=new Set(e);return Wo.filter(n=>t.has(n.name))}function us(){return{root:P("quest-api-panel","api-panel")}}function Pn(e,t){ct(e.root);const n=Ho(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const o=document.createElement("p");o.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",o.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(o);const i=document.createElement("ul");i.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const c=document.createElement("li");c.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const a=document.createElement("code");a.className="block font-mono text-[12px] text-content",a.textContent=r.signature,c.appendChild(a);const s=document.createElement("p");s.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",s.textContent=r.description,c.appendChild(s),i.appendChild(c)}e.root.appendChild(i)}function fs(){return{root:P("quest-hints","hints-drawer"),count:P("quest-hints-count","hints-drawer"),list:P("quest-hints-list","hints-drawer")}}const Ln="quest-hints-more";function Bn(e,t){ct(e.list);for(const o of e.root.querySelectorAll(`.${Ln}`))o.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((o,i)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=o,i>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const o=document.createElement("button");o.type="button",o.className=`${Ln} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,o.textContent=`Show ${n-1} more`,o.addEventListener("click",()=>{for(const i of e.list.querySelectorAll("li[hidden]"))i.hidden=!1;o.remove()}),e.root.appendChild(o)}e.root.removeAttribute("open")}function hs(e,t){return{activeStage:e,currentView:t,runLoop:{active:!1}}}function gs(e,t){e.activeStage=t}function Rt(e,t){e.currentView=t}function Fn(e){e.runLoop.active=!1}function _e(e,t){return e.currentView==="stage"&&e.activeStage.id===t.id}function ms(){return{root:P("quest-reference","reference-panel"),status:P("quest-reference-status","reference-panel"),code:P("quest-reference-code","reference-panel")}}function It(e,t,n={}){const o=t.referenceSolution,i=De(t.id);if(!o||i===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=i===3?"(mastered)":"(unlocked)",e.code.textContent=o,n.collapse!==!1&&e.root.removeAttribute("open")}function bs(){const e="results-modal";return{root:P("quest-results-modal",e),title:P("quest-results-title",e),stars:P("quest-results-stars",e),detail:P("quest-results-detail",e),close:P("quest-results-close",e),retry:P("quest-results-retry",e),next:P("quest-results-next",e)}}function ys(e,t,n,o,i){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=Ss(t.grade,t.passed,o),e.retry.onclick=()=>{Mt(e),n()},e.close.onclick=()=>{Mt(e)};const r=i;r?(e.next.hidden=!1,e.next.onclick=()=>{Mt(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function Mt(e){e.root.classList.remove("show")}function Ss(e,t,n){const o=`tick ${e.endTick}`,i=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${i} · finished by ${o}.`;if(n)try{const r=n(e);if(r)return`${i}. ${r}`}catch{}return`${i}. The pass condition wasn't met within the run budget.`}const vs={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function $n(e){return vs[e]??`sim.${e}();`}function ws(){return{root:P("quest-snippets","snippet-picker")}}function Dn(e,t,n){ct(e.root);const o=Ho(t.unlockedApi);if(o.length!==0)for(const i of o){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=i.name,r.title=`Insert: ${$n(i.name)}`,r.addEventListener("click",()=>{n.insertAtCursor($n(i.name))}),e.root.appendChild(r)}}function lt(e){return{nx:Math.sin(e.tangent),ny:-Math.cos(e.tangent)}}function No(e,t){const{nx:n,ny:o}=lt(e);return{x:e.x-n*t,y:e.y-o*t,tangent:e.tangent}}function Fe(e,t){const{cx:n,cy:o,w:i,h:r,r:c}=t,a=n-i/2,s=o-r/2,l=n+i/2,f=o+r/2;e.beginPath(),e.moveTo(a+c,s),e.lineTo(l-c,s),e.arcTo(l,s,l,s+c,c),e.lineTo(l,f-c),e.arcTo(l,f,l-c,f,c),e.lineTo(a+c,f),e.arcTo(a,f,a,f-c,c),e.lineTo(a,s+c),e.arcTo(a,s,a+c,s,c),e.closePath()}function qo(e,t,n,o,i,r,c,a){return!(e+n<=i||i+c<=e||t+o<=r||r+a<=t)}const dt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},ks="#2a2a35",_s="#a1a1aa",U='"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',Cs=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],Ts=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],Rs="rgba(8, 10, 14, 0.55)",Is="#3a3a45",Ms=[1,1,.5,.42],Es=["LOW","HIGH","VIP","SERVICE"],xs="#e6c56b",As="#9bd4c4",Ps=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],Ls="#a1a1aa",Bs="#4a4a55",Fs="#f59e0b",Go="#7dd3fc",Uo="#fda4af",Et="#fafafa",Xo="#8b8c92",zo="rgba(250, 250, 250, 0.95)",$s=700,zt=3,Ds=.05;function On(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function Os(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:pt(o)})}return t}function pt(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function jo(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function Wn(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function Vo(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function Yo(e,t,n,o,i,r){const c=Math.abs(t-e);if(c<.001)return 0;const a=Math.abs(n);if(a*a/(2*r)>=c)return a>0?a/r:0;const l=Math.max(0,(o-a)/i),f=a*l+.5*i*l*l,u=o/r,d=o*o/(2*r);if(f+d>=c){const h=(2*i*r*c+r*a*a)/(i+r),m=Math.sqrt(Math.max(h,a*a));return(m-a)/i+m/r}const p=c-f-d;return l+p/Math.max(o,.001)+u}class Ws{hoveredCarId;trainAnchors=new Map;setHovered(t){this.hoveredCarId=t}pick(t,n,o){let i,r=o*o;for(const[c,a]of this.trainAnchors){const s=a.x-t,l=a.y-n,f=s*s+l*l;f<r&&(r=f,i=c)}return i}}const Hs="rgba(20, 22, 30, 0.78)",Ns="rgba(255, 255, 255, 0.08)",qs="#fafafa",Gs="#a1a1aa",Us=new Set(["loading","door-opening","door-closing"]);function Ko(e){return Us.has(e.phase)}function Xs(e){const t=Math.abs(e)*3.6;return t<.5?"0 km/h":`${Math.round(t)} km/h`}function Hn(e,t,n){for(let o=0;o<t.length;o++){if(o===n)continue;const i=t[o];if(i&&qo(e.bx,e.by,e.bubbleW,e.bubbleH,i.bx,i.by,i.bubbleW,i.bubbleH))return!0}return!1}function zs(e,t){for(const n of t)if(qo(e.bx,e.by,e.bubbleW,e.bubbleH,n.x,n.y,n.w,n.h))return!0;return!1}function js(e,t){const n=Ko(e.car)?"@":"→",o=e.nextStop?.name??"—",i=Xs(e.car.v);let r="—";if(e.nextStop&&Number.isFinite(e.remainingM)){const c=Yo(0,e.remainingM,Math.abs(e.car.v),t.maxSpeed,t.acceleration,t.deceleration);r=Vo(c)}return{head:`${n} ${o}`,tail:`${i}  ${r}`}}function Vs(e,t,n,o,i,r,c,a,s,l){l.trainAnchors.clear();for(const g of t)l.trainAnchors.set(g.car.id,{x:g.anchor.x,y:g.anchor.y});if(t.length===0||Math.min(n,o)<340)return;const f=t.filter(g=>Ko(g.car)||g.car.id===l.hoveredCarId);if(f.length===0)return;const u=c?11:10,d=8,p=4,h=[];e.font=`600 ${u}px ${U}`;const m=e.measureText("  ").width;for(const g of f){const{head:b,tail:w}=js(g,r),S=e.measureText(b).width+(w?m+e.measureText(w).width:0)+d*2,v=u+p*2,{nx:C,ny:y}=lt(g.anchor),_=g.isInner?-1:1,M=a+14,k=g.anchor.x+C*_*M,I=g.anchor.y+y*_*M,E=Math.max(4,Math.min(n-S-4,k-S/2)),x=Math.max(4,Math.min(o-v-4,I-v/2));h.push({placement:g,head:b,tail:w,bx:E,by:x,bubbleW:S,bubbleH:v})}for(let g=0;g<h.length;g++){const b=h[g];if(!b)continue;const w=b.placement.anchor.tangent,T=Math.cos(w),S=Math.sin(w);let v=0;for(;v<12&&(Hn(b,h,g)||zs(b,s));){const C=v%2===0?1:-1,y=Math.floor(v/2)+1,_=C*(b.bubbleH*.5+8)*y;b.bx=Math.max(4,Math.min(n-b.bubbleW-4,b.bx+T*_)),b.by=Math.max(4,Math.min(o-b.bubbleH-4,b.by+S*_)),v++}if(Hn(b,h,g)&&i.w>b.bubbleW+8&&i.h>b.bubbleH+8){const C=h.slice(0,g).filter(k=>k.bx>=i.x&&k.bx+k.bubbleW<=i.x+i.w&&k.by>=i.y&&k.by+k.bubbleH<=i.y+i.h),y=b.bubbleH+4,_=Math.max(1,Math.floor((i.h-b.bubbleH)/y)+1),M=Math.min(C.length,_-1);b.bx=i.x+(i.w-b.bubbleW)/2,b.by=i.y+M*y}}e.textBaseline="middle",e.textAlign="left",e.font=`600 ${u}px ${U}`;for(const g of h){const b={cx:g.bx+g.bubbleW/2,cy:g.by+g.bubbleH/2,w:g.bubbleW,h:g.bubbleH,r:4};e.fillStyle=Hs,Fe(e,b),e.fill(),e.strokeStyle=Ns,e.lineWidth=1,Fe(e,b),e.stroke();const w=g.by+g.bubbleH/2;if(e.fillStyle=qs,e.fillText(g.head,g.bx+d,w),g.tail){const T=g.bx+d+e.measureText(g.head).width+m;e.fillStyle=Gs,e.fillText(g.tail,T,w)}}}const Ys="rgba(125, 211, 252, 0.45)",Ks="rgba(253, 164, 175, 0.4)",Qs="#7dd3fc",Js="#fda4af",Zs="rgba(125, 211, 252, 0.9)",ea="rgba(253, 164, 175, 0.9)",ta="#a1a1aa",Nn="rgba(212, 212, 216, 0.55)",na=480,Y=4,Xe=4,jt=4;function oa(e,t,n,o,i,r,c,a,s){e.save();const l=Math.min(n,o),f=l>=na,u=f?95:32,d=44,p=Math.min(n*.92,Math.max(160,n-u*2)),h=Math.min(Math.max(120,o-d*2),n*.5),m=Math.min(p,h)*.32,g=Math.max(14,l*.025),b=Math.max(1.5,l*.005),w={cx:n/2,cy:o/2,w:p,h,r:m,color:Ys,thickness:b},T={cx:n/2,cy:o/2,w:p-g*2,h:h-g*2,r:Math.max(0,m-g),color:Ks,thickness:b};qn(e,w),qn(e,T);const S=t.stops.slice(0,i.outerStopCount),v=t.stops.slice(i.outerStopCount),C=[...new Set(t.cars.map(D=>D.line))].sort((D,te)=>D-te),y=C[0],_=C[1],M=[],k=[];for(const D of t.cars)D.line===y?M.push(D):D.line===_&&k.push(D);const I=ia(e,S,v,w,g,i,f),E=sa(w),x=E/Y*.7,L=E/Y,W=Math.max(9,b*2.8),$=Un(e,M,S,w,0,i,x,W,L,!1,Qs),Q=Un(e,k,v,w,g,i,x,W,L,!0,Js),J={x:T.cx-T.w/2+T.r+6,y:T.cy-T.h/2+T.r+6,w:Math.max(0,T.w-2*(T.r+6)),h:Math.max(0,T.h-2*(T.r+6))};Vs(e,[...$,...Q],n,o,J,a,f,W,I,s),e.restore()}function rn(e){return 2*Math.max(0,e.w-2*e.r)+2*Math.max(0,e.h-2*e.r)+2*Math.PI*e.r}function Qo(e,t){const n=(t%1+1)%1,o=rn(e);let i=n*o;const r=e.w,c=e.h,a=e.r,s=Math.max(0,r-2*a),l=Math.max(0,c-2*a),f=Math.PI*a/2,u=e.cx-r/2,d=e.cx+r/2,p=e.cy-c/2,h=e.cy+c/2;if(i<s)return{x:u+a+i,y:p,tangent:0};if(i-=s,i<f){const g=-Math.PI/2+i/f*(Math.PI/2);return{x:d-a+Math.cos(g)*a,y:p+a+Math.sin(g)*a,tangent:g+Math.PI/2}}if(i-=f,i<l)return{x:d,y:p+a+i,tangent:Math.PI/2};if(i-=l,i<f){const g=0+i/f*(Math.PI/2);return{x:d-a+Math.cos(g)*a,y:h-a+Math.sin(g)*a,tangent:g+Math.PI/2}}if(i-=f,i<s)return{x:d-a-i,y:h,tangent:Math.PI};if(i-=s,i<f){const g=Math.PI/2+i/f*(Math.PI/2);return{x:u+a+Math.cos(g)*a,y:h-a+Math.sin(g)*a,tangent:g+Math.PI/2}}if(i-=f,i<l)return{x:u,y:h-a-i,tangent:-Math.PI/2};if(i-=l,f<=0)return{x:u+a,y:p,tangent:0};const m=Math.PI+i/f*(Math.PI/2);return{x:u+a+Math.cos(m)*a,y:p+a+Math.sin(m)*a,tangent:m+Math.PI/2}}function qn(e,t){Fe(e,t),e.strokeStyle=t.color,e.lineWidth=t.thickness,e.lineCap="butt",e.lineJoin="round",e.stroke()}function ia(e,t,n,o,i,r,c){const a=Math.max(5,i*.12),s=11,l=[];e.strokeStyle=Nn,e.lineWidth=Math.max(1.4,o.thickness*1.1),e.lineCap="round";const f=Math.min(t.length,n.length);for(let u=0;u<f;u++){const d=t[u],p=n[u];if(!d||!p)continue;const h=d.y/r.circumferenceM,m=Qo(o,h),g=No(m,i);e.beginPath(),e.moveTo(m.x,m.y),e.lineTo(g.x,g.y),e.stroke();const b=Math.max(1.8,a*.22),w=b*2.4,T=a+b*1.6+w*(jt-1)+b,{nx:S,ny:v}=lt(m),C=T+s*.8+4,y=m.x+S*C,_=m.y+v*C;e.font=`500 ${s}px ${U}`,e.fillStyle=ta,e.textAlign="center",e.textBaseline="middle";const M=c?d.name:ra(d.name),k=e.measureText(M).width;e.fillText(M,y,_);const I=3;l.push({x:y-k/2-I,y:_-s/2-I,w:k+I*2,h:s+I*2}),Gn(e,m,d.waiting,"outward",Zs,a),Gn(e,g,p.waiting,"inward",ea,a),e.strokeStyle=Nn,e.lineWidth=Math.max(1.4,o.thickness*1.1),e.lineCap="round"}return l}function ra(e){return e==="Plane Train"?"P":e==="Terminal"?"T":e.startsWith("Concourse ")?e.slice(10,11).toUpperCase():e.slice(0,1).toUpperCase()}function Gn(e,t,n,o,i,r){if(n<=0)return;const{nx:c,ny:a}=lt(t),s=o==="outward"?1:-1,l=c*s,f=a*s,u=Math.cos(t.tangent),d=Math.sin(t.tangent),p=Math.max(1.8,r*.22),h=p*2.4,m=r+p*1.6,g=Xe*jt,b=Math.max(0,n-g),w=Math.min(n,g);e.fillStyle=i;for(let T=0;T<w;T++){const S=Math.floor(T/Xe),C=T%Xe-(Xe-1)/2,y=m+h*S,_=t.x+l*y+u*(C*h),M=t.y+f*y+d*(C*h);e.beginPath(),e.arc(_,M,p,0,Math.PI*2),e.fill()}if(b>0){const T=m+h*(jt-1),S=t.x+l*(T+h*1.4),v=t.y+f*(T+h*1.4);e.font=`600 ${Math.round(p*4)}px sans-serif`,e.textAlign="center",e.textBaseline="middle",e.fillText(`+${b}`,S,v)}}function sa(e){const t=rn(e);return Math.min(110,t*.075)}function aa(e){const t=new Array(Y).fill(0),n=Math.floor(e/Y),o=e-n*Y;for(let i=0;i<Y;i++)t[i]=n+(i<o?1:0);return t}function Un(e,t,n,o,i,r,c,a,s,l,f){if(t.length===0)return[];const u=rn(o),d=m=>{const g=Qo(o,m);return i>0?No(g,i):g},p=[],h=Y*s/2;for(const m of t){const g=m.y/r.circumferenceM,b=aa(m.riders),w=l?-1:1,S=(l?1-g:g)+w*h/u,v=[];for(let k=0;k<Y;k++){const I=-w*(k*s+s/2),E=((S+I/u)%1+1)%1;v.push(d(E))}for(let k=0;k<Y;k++){const I=v[k];if(!I)continue;const E=b[k]??0;la(e,I,c,a,f,E,k===0,w)}const C=((S+-w*s/2/u)%1+1)%1,y=d(C),_=ca(m,n,r.circumferenceM),M=_?(_.y-m.y+r.circumferenceM)%r.circumferenceM:1/0;p.push({car:m,anchor:y,nextStop:_,remainingM:M,isInner:l})}return p}function ca(e,t,n){let o,i=1/0;for(const r of t){const c=(r.y-e.y+n)%n;c<=.001||c<i&&(i=c,o=r)}return o}function la(e,t,n,o,i,r,c,a){e.save(),e.translate(t.x,t.y),e.rotate(t.tangent);const s=n/2,l=o/2,f=Math.min(n,o)*.25,u={cx:0,cy:0,w:n,h:o,r:f};if(Fe(e,u),e.fillStyle=i,e.fill(),c){Fe(e,u),e.fillStyle="rgba(255, 255, 255, 0.55)",e.fill();const d=a*(s-f*.4),p=a*(s-f*.4-l*.95);e.strokeStyle="rgba(255, 255, 255, 0.95)",e.lineWidth=Math.max(1.2,l*.32),e.lineCap="round",e.lineJoin="round",e.beginPath(),e.moveTo(p,-l*.55),e.lineTo(d,0),e.lineTo(p,l*.55),e.stroke()}r>0&&da(e,n,o,r),e.restore()}function da(e,t,n,o){const i=Math.max(1.5,t*.1),r=Math.max(1,n*.18),c=Math.max(1,t-i*2),a=Math.max(1,n-r*2),s=o>8?3:2,l=Math.max(1,Math.ceil(o/s)),f=c/l,u=a/s,d=Math.max(.7,Math.min(f,u)*.36);e.fillStyle="rgba(20, 22, 30, 0.85)";let p=0;for(let h=0;h<s&&p<o;h++)for(let m=0;m<l&&p<o;m++){const g=-t/2+i+f*(m+.5),b=-n/2+r+u*(h+.5);e.beginPath(),e.arc(g,b,d,0,Math.PI*2),e.fill(),p++}}const Xn=["standard","briefcase","bag","short","tall"];function K(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,Xn[n%Xn.length]??"standard"}function pa(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function sn(e,t,n,o,i,r="standard"){const c=pa(r,o),s=n-.5,l=s-c.bodyH,f=l-c.neckGap-c.headR,u=c.bodyH*.08,d=s-c.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-c.shoulderW/2,l+u),e.lineTo(t-c.shoulderW/2+u,l),e.lineTo(t+c.shoulderW/2-u,l),e.lineTo(t+c.shoulderW/2,l+u),e.lineTo(t+c.waistW/2,d),e.lineTo(t+c.footW/2,s),e.lineTo(t-c.footW/2,s),e.lineTo(t-c.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,c.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const p=Math.max(1.6,c.headR*.9),h=t+c.waistW/2+p*.1,m=s-p-.5;e.fillRect(h,m,p,p);const g=p*.55;e.fillRect(h+(p-g)/2,m-1,g,1)}else if(r==="bag"){const p=Math.max(1.3,c.headR*.9),h=t-c.shoulderW/2-p*.35,m=l+c.bodyH*.35;e.beginPath(),e.arc(h,m,p,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(h+p*.2,m-p*.8),e.lineTo(t+c.shoulderW/2-u,l+.5),e.stroke()}else if(r==="tall"){const p=c.headR*2.1,h=Math.max(1,c.headR*.45);e.fillRect(t-p/2,f-c.headR-h+.4,p,h)}}function ua(e,t,n,o,i,r,c,a,s){const f=Math.max(1,Math.floor((i-14)/a.figureStride)),u=Math.min(r,f),d=-2;for(let p=0;p<u;p++){const h=t+d+o*p*a.figureStride,m=p+0,g=K(s,m);sn(e,h,n,a.figureHeadR,c,g)}if(r>u){e.fillStyle=Xo,e.font=`${a.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const p=t+d+o*u*a.figureStride;e.fillText(`+${r-u}`,p,n-1)}}function se(e,t,n,o,i,r){const c=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,c);return}e.moveTo(t+c,n),e.lineTo(t+o-c,n),e.quadraticCurveTo(t+o,n,t+o,n+c),e.lineTo(t+o,n+i-c),e.quadraticCurveTo(t+o,n+i,t+o-c,n+i),e.lineTo(t+c,n+i),e.quadraticCurveTo(t,n+i,t,n+i-c),e.lineTo(t,n+c),e.quadraticCurveTo(t,n,t+c,n),e.closePath()}function fa(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const c=i+r+1>>1;e.measureText(t.slice(0,c)+o).width<=n?i=c:r=c-1}return i===0?o:t.slice(0,i)+o}function ha(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function ga(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px ${U}`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,c=Math.max(n.fontSmall+.5,i);for(const a of t){const s=a.top-3,l=s>i&&s-n.fontSmall<r;e.fillStyle=a.color,e.fillText(a.text,a.cx,l?c:s)}}function ma(e,t,n,o,i,r,c,a,s){e.font=`500 ${o.fontMain.toFixed(0)}px ${U}`,e.textBaseline="middle";const l=o.padX,f=o.padX+o.labelW,u=r-o.padX,d=o.shaftInnerW/2,p=Math.min(o.shaftInnerW*1.8,(u-f)/2);for(let h=0;h<t.length;h++){const m=t[h];if(m===void 0)continue;const g=n(m.y),b=t[h+1],w=b!==void 0?n(b.y):a;if(e.strokeStyle=ks,e.lineWidth=s?2:1,e.beginPath(),s)for(const S of i)e.moveTo(S-p,g+.5),e.lineTo(S+p,g+.5);else{let S=f;for(const v of i){const C=v-d,y=v+d;C>S&&(e.moveTo(S,g+.5),e.lineTo(C,g+.5)),S=y}S<u&&(e.moveTo(S,g+.5),e.lineTo(u,g+.5))}e.stroke();for(let S=0;S<i.length;S++){const v=i[S];if(v===void 0)continue;const C=c.has(S,m.entity_id);e.strokeStyle=C?Fs:Bs,e.lineWidth=C?1.4:1,e.beginPath(),e.moveTo(v-d-2,g+.5),e.lineTo(v-d,g+.5),e.moveTo(v+d,g+.5),e.lineTo(v+d+2,g+.5),e.stroke()}const T=s?g:(g+w)/2;e.fillStyle=_s,e.textAlign="right",e.fillText(fa(e,m.name,o.labelW-4),l+o.labelW-4,T)}}function ba(e,t,n,o,i,r){for(const c of t.stops){if(c.waiting_by_line.length===0)continue;const a=r.get(c.entity_id);if(a===void 0||a.size===0)continue;const s=n(c.y),l=c.waiting_up>=c.waiting_down?Go:Uo;for(const f of c.waiting_by_line){if(f.count===0)continue;const u=a.get(f.line);if(u===void 0)continue;const d=i.get(u);if(d===void 0)continue;const p=d.end-d.start;p<=o.figureStride||ua(e,d.end-2,s,-1,p,f.count,l,o,c.entity_id)}}}const xt=new Map;function an(e){const t=xt.get(e);if(t!==void 0)return t;const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return xt.set(e,null),null;const o=parseInt(n[1],16),i=[o>>16&255,o>>8&255,o&255];return xt.set(e,i),i}function Vt(e,t){const n=an(e);if(n===null)return e;const[o,i,r]=n,c=a=>t>=0?Math.round(a+(255-a)*t):Math.round(a*(1+t));return`rgb(${c(o)}, ${c(i)}, ${c(r)})`}function Jo(e,t){const n=an(e);if(n===null)return e;const[o,i,r]=n;return`rgba(${o}, ${i}, ${r}, ${t})`}function Ve(e,t){if(an(e)!==null&&e.startsWith("#")){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Jo(e,t)}function Zo(e){let r=e;for(let a=0;a<3;a++){const s=1-r,l=3*s*s*r*.2+3*s*r*r*.2+r*r*r,f=3*s*s*.2+6*s*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(l-e)/f,r=Math.max(0,Math.min(1,r))}const c=1-r;return 3*c*c*r*.6+3*c*r*r*1+r*r*r}function ya(e,t,n,o,i,r,c,a,s,l=!1){const f=o*.22,u=(i-4)/10.5,d=Math.max(1.2,Math.min(a.figureHeadR,f,u)),p=a.figureStride*(d/a.figureHeadR),h=3,m=2,g=o-h*2,w=Math.max(1,Math.floor((g-16)/p)),T=Math.min(r,w),S=T*p,v=t-S/2+p/2,C=n-m;for(let y=0;y<T;y++){const _=s?.[y]??K(0,y);sn(e,v+y*p,C,d,c,_)}if(r>T){const y=`+${r-T}`,_=Math.max(8,a.fontSmall-1);e.font=`700 ${_.toFixed(1)}px ${U}`,e.textAlign="right",e.textBaseline="middle";const M=e.measureText(y).width,k=3,I=1.5,E=Math.ceil(M+k*2),x=Math.ceil(_+I*2),L=t+o/2-2,W=n-i+2,$=L-E;e.fillStyle="rgba(15, 15, 18, 0.85)",se(e,$,W,E,x,2),e.fill(),e.fillStyle="#fafafa",e.fillText(y,L-k,W+x/2)}if(l){const y=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${y.toFixed(0)}px ${U}`,e.textAlign="center",e.textBaseline="middle";const _=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,_+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,_)}}const Sa=Array.from({length:zt},(e,t)=>Jo(dt.moving,.18*(1-t/zt))),zn=Object.fromEntries(Object.entries(dt).map(([e,t])=>[e,Vt(t,.18)]));function va(e,t,n,o,i,r,c){const a=Math.max(2,r.figureHeadR*.9);for(const s of t.cars){if(s.target===void 0)continue;const l=c.get(s.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const u=n.get(s.id);if(u===void 0)continue;const d=i(f.y)-r.carH/2,p=i(s.y)-r.carH/2;Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(u,p),e.lineTo(u,d),e.stroke(),e.fillStyle=zo,e.beginPath(),e.arc(u,d,a,0,Math.PI*2),e.fill())}}function wa(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const c=o/2;for(let a=1;a<=zt;a++){const s=r(t.y-t.v*Ds*a);e.fillStyle=Sa[a-1]??"rgba(107, 107, 117, 0.06)",e.fillRect(n-c,s-i,o,i)}}function ka(e,t,n,o,i,r,c,a,s){const l=c(t.y),f=l-i,u=o/2,d=dt[t.phase]??"#6b6b75";e.fillStyle=d,e.fillRect(n-u,f,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-u+.5,f+.5,o-1,i-1),e.strokeStyle=zn[t.phase]??zn.unknown,e.beginPath(),e.moveTo(n-u+1,f+1.5),e.lineTo(n+u-1,f+1.5),e.stroke();const p=t.capacity>0&&t.load>=t.capacity*.95;if((t.riders>0||p)&&ya(e,n,l,o,i,t.riders,r,a,s,p),t.phase==="door-opening"||t.phase==="loading"||t.phase==="door-closing"){const h=Math.max(o*.2,Math.min(o*.4,8));e.strokeStyle="rgba(250, 250, 250, 0.85)",e.lineWidth=1.5,e.beginPath(),e.moveTo(n-h/2,l-.5),e.lineTo(n+h/2,l-.5),e.stroke()}}const jn=6,_a=3,At=4,ye=3,be=2.5,ee=2,Ca=12,Ta="rgba(37, 37, 48, 0.80)",Ra="#ECECEE",Vn=3,Yn=.3,Ia=140,Kn=.85;function Ma(e,t,n,o,i,r,c,a){const s=c.fontSmall+.5;e.font=`500 ${s}px ${U}`,e.textBaseline="middle",Qn(e,"-0.1px");const l=performance.now(),f=Ve(t,.45),u=Ve(t,.5),d=Ve(t,.75),p=[];for(const[m,g]of o){const b=n.get(m);if(b===void 0)continue;const w=i.get(m);if(w===void 0)continue;const T=r(b.y),S=T-c.carH,v=Math.max(1,g.expiresAt-g.bornAt),C=g.expiresAt-l,y=C>v*Yn?1:Math.max(0,C/(v*Yn)),_=Math.max(0,l-g.bornAt),M=Math.min(1,_/Ia),k=y*M;if(k<=0)continue;const I=e.measureText(g.glyph).width,E=I+Vn+e.measureText(g.text).width+jn*2,x=s+_a*2+2,L=S-ee-be-x,W=T+ee+be+x>a,$=L<2&&!W?"below":"above",Q=$==="above"?S-ee-be-x:T+ee+be;let J=w-E/2;const D=2,te=a-E-2;J<D&&(J=D),J>te&&(J=te),p.push({bubble:g,glyphW:I,alpha:k,cx:w,carTop:S,carBottom:T,bubbleW:E,bubbleH:x,side:$,bx:J,by:Q,entrance:M})}const h=(m,g)=>!(m.bx+m.bubbleW<=g.bx||g.bx+g.bubbleW<=m.bx||m.by+m.bubbleH<=g.by||g.by+g.bubbleH<=m.by);for(let m=1;m<p.length;m++){const g=p[m];if(g===void 0)continue;let b=!1;for(let C=0;C<m;C++){const y=p[C];if(y!==void 0&&h(g,y)){b=!0;break}}if(!b)continue;const w=g.side==="above"?"below":"above",T=w==="above"?g.carTop-ee-be-g.bubbleH:g.carBottom+ee+be,S={...g,side:w,by:T};let v=!0;for(let C=0;C<m;C++){const y=p[C];if(y!==void 0&&h(S,y)){v=!1;break}}v&&(p[m]=S)}for(const m of p){const{bubble:g,glyphW:b,alpha:w,cx:T,carTop:S,carBottom:v,bubbleW:C,bubbleH:y,side:_,bx:M,by:k,entrance:I}=m,E=_==="above"?S-ee:v+ee,x=Math.min(Math.max(T,M+At+ye/2),M+C-At-ye/2),L=Zo(I),W=Kn+(1-Kn)*L;e.save(),e.globalAlpha=w,e.translate(x,E),e.scale(W,W),e.translate(-x,-E),Ea(e,M,k,C,y,At,_,x,E),e.shadowColor=u,e.shadowBlur=Ca,e.fillStyle=Ta,e.fill(),e.shadowBlur=0,e.shadowColor="transparent",e.strokeStyle=f,e.lineWidth=1,e.stroke();const $=k+y/2,Q=M+jn;e.textAlign="left",e.fillStyle=d,e.fillText(g.glyph,Q,$),e.fillStyle=Ra,e.fillText(g.text,Q+b+Vn,$),e.restore()}Qn(e,"0px")}function Ea(e,t,n,o,i,r,c,a,s){const l=Math.min(r,o/2,i/2);e.beginPath(),e.moveTo(t+l,n),c==="below"&&(e.lineTo(a-ye/2,n),e.lineTo(a,s),e.lineTo(a+ye/2,n)),e.lineTo(t+o-l,n),e.arcTo(t+o,n,t+o,n+l,l),e.lineTo(t+o,n+i-l),e.arcTo(t+o,n+i,t+o-l,n+i,l),c==="above"&&(e.lineTo(a+ye/2,n+i),e.lineTo(a,s),e.lineTo(a-ye/2,n+i)),e.lineTo(t+l,n+i),e.arcTo(t,n+i,t,n+i-l,l),e.lineTo(t,n+l),e.arcTo(t,n,t+l,n,l),e.closePath()}function Qn(e,t){e.letterSpacing=t}const ei={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},st={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function xa(e,t,n,o,i,r){const c=i/2,a=o-r/2,s=dt[t.phase]??"#6b6b75",l=e.createLinearGradient(n,a,n,a+r);l.addColorStop(0,Vt(s,.14)),l.addColorStop(1,Vt(s,-.18)),e.fillStyle=l,se(e,n-c,a,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-c+2,a+r*.36,i-4,Math.max(1.5,r*.1))}function Aa(e,t,n,o,i){if(t.length===0)return;const r=7,c=4,a=i.fontSmall+2,s=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px ${U}`;const l=(d,p)=>{const h=[d.carName,pt(d.altitudeM),jo(d.velocity),`${ei[d.phase]} · ${d.layer}`];let m=0;for(const S of h)m=Math.max(m,e.measureText(S).width);const g=m+r*2,b=h.length*a+c*2;let w=p==="right"?d.cx+s:d.cx-s-g;w=Math.max(2,Math.min(o-g-2,w));const T=d.cy-b/2;return{hud:d,lines:h,bx:w,by:T,bubbleW:g,bubbleH:b,side:p}},f=(d,p)=>!(d.bx+d.bubbleW<=p.bx||p.bx+p.bubbleW<=d.bx||d.by+d.bubbleH<=p.by||p.by+p.bubbleH<=d.by),u=[];t.forEach((d,p)=>{let h=l(d,p%2===0?"right":"left");if(u.some(m=>f(h,m))){const m=l(d,h.side==="right"?"left":"right");if(u.every(g=>!f(m,g)))h=m;else{const g=Math.max(...u.map(b=>b.by+b.bubbleH));h={...h,by:g+4}}}u.push(h)});for(const d of u){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",se(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=st[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,se(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let p=0;p<d.lines.length;p++){const h=d.by+c+a*p+a/2,m=d.lines[p]??"";e.fillStyle=p===0||p===3?st[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(m,d.bx+r,h)}e.restore()}}function Pa(e,t,n,o,i,r){if(t.length===0)return;const c=18,a=10,s=6,l=5,f=r.fontSmall+2.5,d=s*2+5*f,p=c+s+(d+l)*t.length;e.save();const h=e.createLinearGradient(n,i,n,i+p);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,se(e,n,i,o,p,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,se(e,n,i,o,p,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px ${U}`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+a,i+c/2+2);let m=i+c+s;for(const g of t){e.fillStyle="rgba(15, 15, 18, 0.55)",se(e,n+6,m,o-12,d,5),e.fill(),e.fillStyle=st[g.phase],e.fillRect(n+6,m,2,d);const b=n+a+4,w=n+o-a;let T=m+s+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px ${U}`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(g.carName,b,T),e.textAlign="right",e.fillStyle=st[g.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px ${U}`,e.fillText(ei[g.phase].toUpperCase(),w,T);const S=g.etaSeconds!==void 0&&Number.isFinite(g.etaSeconds)?Vo(g.etaSeconds):"—",v=[["Altitude",pt(g.altitudeM)],["Velocity",jo(g.velocity)],["Dest",g.destinationName??"—"],["ETA",S]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px ${U}`;for(const[C,y]of v)T+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(C,b,T),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(y,w,T);m+=d+l}e.restore()}function La(e,t,n,o,i,r,c,a,s,l,f){l.length=e.cars.length;for(let u=0;u<e.cars.length;u++){const d=e.cars[u];d!==void 0&&(l[u]=d.id)}l.sort((u,d)=>u-d),f.clear();for(let u=0;u<l.length;u++){const d=l[u];d!==void 0&&f.set(d,u)}s.length=e.cars.length;for(let u=0;u<e.cars.length;u++){const d=e.cars[u];if(d===void 0)continue;const p=d.y,h=d.target!==void 0?a.get(d.target):void 0,m=h!==void 0?e.stops[h]:void 0,g=m?Yo(p,m.y,d.v,i,r,c):void 0,b=f.get(d.id)??0,w=s[u];w===void 0?s[u]={cx:n,cy:t.toScreenAlt(p),altitudeM:p,velocity:d.v,phase:Wn(d.v,o.get(d.id)??0,i),layer:On(p),carName:`Climber ${String.fromCharCode(65+b)}`,destinationName:m?.name,etaSeconds:g}:(w.cx=n,w.cy=t.toScreenAlt(p),w.altitudeM=p,w.velocity=d.v,w.phase=Wn(d.v,o.get(d.id)??0,i),w.layer=On(p),w.carName=`Climber ${String.fromCharCode(65+b)}`,w.destinationName=m?.name,w.etaSeconds=g)}return s}const Ce=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function Pt(e,t,n){return e+(t-e)*n}function Lt(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round(Pt(o>>16&255,i>>16&255,n)),c=Math.round(Pt(o>>8&255,i>>8&255,n)),a=Math.round(Pt(o&255,i&255,n));return`#${(r<<16|c<<8|a).toString(16).padStart(6,"0")}`}function Ba(e,t){let n=0;for(;n<Ce.length-1;n++){const l=Ce[n+1];if(l===void 0||e<=l[0])break}const o=Ce[n],i=Ce[Math.min(n+1,Ce.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],c=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),a=Lt(o[1],i[1],c),s=Lt(o[2],i[2],c);return Lt(a,s,t)}const Fa=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function $a(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),c=Math.log10(1+t.axisMaxM/1e3),a=[0,.05,.15,.35,.6,1];for(const l of a){const f=1e3*(10**(l*c)-1);r.addColorStop(l,Ba(f,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const l of Fa){const f=t.axisMaxM*l.altFrac;if(f<8e4)continue;const u=t.toScreenAlt(f),d=n+l.xFrac*(o-n),p=l.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${p.toFixed(3)})`,e.beginPath(),e.arc(d,u,l.size,0,Math.PI*2),e.fill()}e.restore();const s=Os(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const l of s){const f=t.toScreenAlt(l.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(o,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(l.label,n+4,f-6))}}function Da(e,t,n,o){const r=o-28,c=e.createLinearGradient(0,r,0,o);c.addColorStop(0,"rgba(0,0,0,0)"),c.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),c.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=c,e.fillRect(t,r,n-t,28),e.strokeStyle=Ve("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function Oa(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function Wa(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const c=-Math.PI/2+r*Math.PI/3,a=t+Math.cos(c)*i,s=n+Math.sin(c)*i;r===0?e.moveTo(a,s):e.lineTo(a,s)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function Ha(e,t,n,o,i,r,c){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const a of t.stops){const s=n.toScreenAlt(a.y);if(s<n.shaftTop||s>n.shaftBottom)continue;const l=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-l/2,s),e.lineTo(o-5,s),e.moveTo(o+5,s),e.lineTo(o+l/2,s),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-l/2,s),e.lineTo(o-5,s-5),e.moveTo(o+l/2,s),e.lineTo(o+5,s-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(a.name,r+c-4,s-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(pt(a.y),r+c-4,s+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function Na(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const c=Math.log10(1+Math.max(0,r)/1e3),a=i<=0?0:Math.max(0,Math.min(1,c/i));return t-a*(t-e)}}}function qa(e,t,n,o,i,r,c){const a=Math.max(2,c.figureHeadR*.9);for(const s of t.cars){if(s.target===void 0)continue;const l=r.get(s.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const u=i.get(s.id);if(u===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,u),e.lineTo(o,d),e.stroke(),e.fillStyle=zo,e.beginPath(),e.arc(o,d,a,0,Math.PI*2),e.fill())}}function Ga(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function Ua(e,t,n,o,i,r,c){c.firstDrawAt===0&&(c.firstDrawAt=performance.now());const a=(performance.now()-c.firstDrawAt)/1e3,s=r.showDayNight?Ga(a):.5,l=n>=520&&o>=360,f=Math.min(120,Math.max(72,n*.16)),u=l?Math.min(220,Math.max(160,n*.24)):0,d=l?14:0,p=i.padX,h=p+f+4,m=n-i.padX-u-d,g=(h+m)/2,b=12,w=i.padTop+24,T=o-i.padBottom-18,S=Na(w,T,r);$a(e,S,h+b,m-b,s),Da(e,h+b,m-b,T),Oa(e,g,S),Wa(e,g,S.shaftTop,i),Ha(e,t,S,g,i,p,f);const v=Math.max(20,Math.min(34,m-h-8)),C=Math.max(16,Math.min(26,v*.72));i.carH=C,i.carW=v;const y=c.carCenters,_=c.stopIdxById;y.clear(),_.clear();for(let k=0;k<t.stops.length;k++){const I=t.stops[k];I!==void 0&&_.set(I.entity_id,k)}for(const k of t.cars)y.set(k.id,S.toScreenAlt(k.y));qa(e,t,S,g,y,_,i);for(const k of t.cars){const I=y.get(k.id);I!==void 0&&xa(e,k,g,I,v,C)}const M=La(t,S,g,c.prevVelocity,c.maxSpeed,c.acceleration,c.deceleration,_,c.hudBuf,c.idSortBuf,c.idRankBuf);M.sort((k,I)=>I.altitudeM-k.altitudeM),Aa(e,M,v,n-u-d,i),l&&Pa(e,M,n-i.padX-u,u,w,i);for(const k of t.cars)c.prevVelocity.set(k.id,k.v);if(c.prevVelocity.size>t.cars.length)for(const k of c.prevVelocity.keys())y.has(k)||c.prevVelocity.delete(k)}const Xa=1e6;function ti(e,t){return e*Xa+t}function za(e){return{has:(t,n)=>e.has(ti(t,n))}}function ja(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function Jn(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}const Va=.8,Ya=2;function Ka(e,t,n){const o=performance.now();for(const i of t){const r=o-i.bornAt;if(r<0)continue;const c=Math.min(1,Math.max(0,r/i.duration)),a=Zo(c),s=i.startX+(i.endX-i.startX)*a,l=Math.sin(a*Math.PI*Ya*2)*Va,f=i.floorY+l,u=Qa(i.kind,c,a);if(u<=0)continue;const d=e.globalAlpha;e.globalAlpha=u,sn(e,s,f,n.figureHeadR,i.color,i.variant),e.globalAlpha=d}}function Qa(e,t,n){return e==="board"?t<.75?1:Math.max(0,1-(t-.75)/.25):e==="alight"?t<.2?t/.2:t>.6?Math.max(0,1-(t-.6)/.4):1:.7*(1-n)**1.2}function Ja(e,t){const{count:n,enablePairs:o,halfPairW:i,now:r,stagger:c,duration:a,originX:s,endX:l,floorY:f,color:u}=t;let d=0,p=0;for(;d<n;){const h=o&&d+1<n?2:1;for(let m=0;m<h;m++){const g=h===2?m===0?-i:i:0;e.push({kind:"board",bornAt:r+p*c,duration:a,startX:s+g,endX:l+g,floorY:f,color:u,variant:K(t.stopId,d+m+t.dirOffset)})}d+=h,p++}}function Za(e,t){const{count:n,now:o,stagger:i,duration:r,startX:c,endX:a,floorY:s,color:l,stopId:f}=t;for(let u=0;u<n;u++)e.push({kind:"abandon",bornAt:o+u*i,duration:r,startX:c,endX:a,floorY:s,color:l,variant:K(f,2e4+u)})}function ec(e,t){const{count:n,enablePairs:o,halfPairW:i,now:r,stagger:c,duration:a,startX:s,endX:l,floorY:f,color:u}=t;let d=0,p=0;for(;d<n;){const h=o&&d+1<n?2:1;for(let m=0;m<h;m++){const g=d+m,b=h===2?m===0?-i:i:0;e.push({kind:"alight",bornAt:r+p*c,duration:a,startX:s+b,endX:l+b,floorY:f,color:u,variant:t.variants[t.variants.length-1-g]??K(t.carId,g)})}d+=h,p++}}class ni{#e;#n;#t=window.devicePixelRatio||1;#r;#l=null;#o=-1;#d=new Map;#i;#s=new Map;#a=new Map;#c=[];#p=null;#u=null;#k=new Map;#P=new Map;#L=new Map;#B=[];#F=[];#$=new Map;#m=1;#b=1;#y=1;#_=0;#S=0;#f=new Map;#C=new Map;#D=new Map;#v=new Map;#T=[];#R=new Map;#I=new Set;#O=za(this.#I);#W=[];#H=[];#N=[];#q=new Map;#M=new Map;#G=new Map;#E=new Map;#U=[];#X=[];#z=[];#j=new Map;constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#n=o,this.#i=n,this.#w(),this.#r=()=>{this.#w()},window.addEventListener("resize",this.#r)}dispose(){window.removeEventListener("resize",this.#r),this.#x()}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#A()}setAirportConfig(t){this.#u=t,this.#A(),t!==null?this.#V():this.#x()}#g=new Ws;#h=null;#V(){if(this.#h!==null)return;const t=o=>{const i=this.#e.getBoundingClientRect(),r=o.clientX-i.left,c=o.clientY-i.top,a=Math.max(40,Math.min(i.width,i.height)*.07);this.#g.setHovered(this.#g.pick(r,c,a))},n=()=>{this.#g.setHovered(void 0)};this.#e.addEventListener("pointermove",t),this.#e.addEventListener("pointerleave",n),this.#h={move:t,leave:n}}#x(){this.#h!==null&&(this.#e.removeEventListener("pointermove",this.#h.move),this.#e.removeEventListener("pointerleave",this.#h.leave),this.#h=null,this.#g.setHovered(void 0))}#A(){this.#k.clear(),this.#S=0,this.#f.clear()}setPhysics(t,n,o,i){Number.isFinite(t)&&t>0&&(this.#m=t),Number.isFinite(n)&&n>0&&(this.#b=n),Number.isFinite(o)&&o>0&&(this.#y=o),Number.isFinite(i)&&i>0&&(this.#_=i)}pushAssignment(t,n,o){let i=this.#f.get(t);i===void 0&&(i=new Map,this.#f.set(t,i)),i.set(o,n)}#w(){this.#t=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#t,i=n*this.#t;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#n.setTransform(this.#t,0,0,this.#t,0,0)}#Y(t,n){const o=this.#T.pop();return o!==void 0?(o.start=t,o.end=n,o):{start:t,end:n}}#K(){for(const t of this.#v.values())this.#T.push(t);this.#v.clear()}draw(t,n,o,i=0){this.#w();const{clientWidth:r,clientHeight:c}=this.#e,a=this.#n;if(a.clearRect(0,0,r,c),t.stops.length===0||r===0||c===0)return;r!==this.#o&&(this.#l=ja(r),this.#o=r);const s=this.#l;if(s===null)return;if(this.#u!==null){oa(a,t,r,c,this.#u,i,this.#i,{maxSpeed:this.#m,acceleration:this.#b,deceleration:this.#y,weightCapacity:this.#_},this.#g);return}if(this.#p!==null){this.#Q(t,r,c,s,n,o,this.#p);return}const l=t.stops.length===2,f=this.#C;f.clear();for(const R of t.cars)f.set(R.id,R);const u=this.#z;u.length=t.stops.length;for(let R=0;R<t.stops.length;R++)u[R]=t.stops[R];u.sort((R,A)=>R.y-A.y);const d=this.#U;d.length=u.length;for(let R=0;R<u.length;R++){const A=u[R];d[R]=A===void 0?0:A.y}const p=t.stops[0];if(p===void 0)return;let h=p.y,m=p.y;for(let R=1;R<t.stops.length;R++){const A=t.stops[R];if(A===void 0)continue;const B=A.y;B<h&&(h=B),B>m&&(m=B)}const g=d.length>=3?(d.at(-1)??0)-(d.at(-2)??0):1,w=h-1,T=m+g,S=Math.max(T-w,1e-4),v=l?18:0;let C,y;if(l)C=s.padTop+v,y=c-s.padBottom-v;else{let R=1/0;for(let ne=1;ne<d.length;ne++){const We=d[ne],He=d[ne-1];if(We===void 0||He===void 0)continue;const we=We-He;we>0&&we<R&&(R=we)}Number.isFinite(R)||(R=1);const B=48/R,X=Math.max(0,c-s.padTop-s.padBottom)/S,V=Math.min(X,B),ue=S*V;y=c-s.padBottom,C=y-ue}const _=R=>y-(R-w)/S*(y-C),M=this.#d;M.forEach(R=>R.length=0);for(const R of t.cars){const A=M.get(R.line);A?A.push(R):M.set(R.line,[R])}const k=this.#X;k.length=0;for(const R of M.keys())k.push(R);k.sort((R,A)=>R-A);let I=0;for(const R of k)I+=M.get(R)?.length??0;const E=Math.max(0,r-2*s.padX-s.labelW),x=s.figureStride*2,L=s.shaftSpacing*Math.max(I-1,0),$=(E-L)/Math.max(I,1),Q=l?34:s.maxShaftInnerW,D=Math.max(s.minShaftInnerW,Math.min(Q,$*.55)),te=Math.max(0,Math.min($-D,x+s.figureStride*4)),pn=Math.max(14,D-6);let de=1/0;if(t.stops.length>=2)for(let R=1;R<d.length;R++){const A=d[R-1],B=d[R];if(A===void 0||B===void 0)continue;const H=_(A)-_(B);H>0&&H<de&&(de=H)}const mi=_(m)-2,bi=Number.isFinite(de)?de:s.carH,yi=l?s.carH:bi,Si=Math.max(14,Math.min(yi,mi));if(!l&&Number.isFinite(de)){const R=Math.max(1.5,Math.min(de*.067,4)),A=s.figureStride*(R/s.figureHeadR);s.figureHeadR=R,s.figureStride=A}s.shaftInnerW=D,s.carW=pn,s.carH=Si;const vi=s.padX+s.labelW,wi=D+te,Oe=this.#W;Oe.length=0;const pe=this.#D;pe.clear(),this.#K();const ht=this.#v;let un=0;for(const R of k){const A=M.get(R)??[];for(const B of A){const H=vi+un*(wi+s.shaftSpacing),X=H,V=H+te,ue=V+D/2;Oe.push(ue),pe.set(B.id,ue),ht.set(B.id,this.#Y(X,V)),un++}}const gt=this.#R;gt.clear();for(let R=0;R<t.stops.length;R++){const A=t.stops[R];A!==void 0&&gt.set(A.entity_id,R)}const fn=this.#I;fn.clear();{let R=0;for(const A of k){const B=M.get(A)??[];for(const H of B){if(H.phase==="loading"||H.phase==="door-opening"||H.phase==="door-closing"){const X=Jn(t.stops,H.y);X!==void 0&&X.dist<.5&&fn.add(ti(R,X.stop.entity_id))}R++}}}const mt=this.#q,bt=this.#M,yt=this.#G,St=this.#E;mt.clear(),bt.clear(),yt.clear(),St.clear();const vt=this.#H;vt.length=0;const wt=this.#N;wt.length=0;let hn=0;for(let R=0;R<k.length;R++){const A=k[R];if(A===void 0)continue;const B=M.get(A)??[],H=Cs[R]??Rs,X=Ts[R]??Is,V=Ms[R]??1,ue=Ps[R]??Ls,ne=Math.max(14,D*V),We=Math.max(10,pn*V),He=Math.max(10,s.carH),we=R===2?xs:R===3?As:Et;let Ne=1/0,kt=-1/0,qe=1/0;for(const Z of B){mt.set(Z.id,ne),bt.set(Z.id,We),yt.set(Z.id,He),St.set(Z.id,we);const fe=Oe[hn];if(fe===void 0)continue;const gn=Number.isFinite(Z.min_served_y)&&Number.isFinite(Z.max_served_y),_t=gn?Math.max(C,_(Z.max_served_y)-s.carH-2):C,ki=gn?Math.min(y,_(Z.min_served_y)+2):y;vt.push({cx:fe,top:_t,bottom:ki,fill:H,frame:X,width:ne}),fe<Ne&&(Ne=fe),fe>kt&&(kt=fe),_t<qe&&(qe=_t),hn++}k.length>1&&Number.isFinite(Ne)&&Number.isFinite(qe)&&wt.push({cx:(Ne+kt)/2,top:qe,text:Es[R]??`Line ${R+1}`,color:ue})}ha(a,vt),ga(a,wt,s),ma(a,u,_,s,Oe,r,this.#O,C,l),ba(a,t,_,s,ht,this.#f),va(a,t,pe,mt,_,s,gt);for(const R of t.cars){const A=pe.get(R.id);if(A===void 0)continue;const B=bt.get(R.id)??s.carW,H=yt.get(R.id)??s.carH,X=St.get(R.id)??Et,V=this.#s.get(R.id);wa(a,R,A,B,H,_),ka(a,R,A,B,H,X,_,s,V?.roster)}this.#J(t,pe,ht,_,s,n),Ka(a,this.#c,s),o&&o.size>0&&Ma(a,this.#i,f,o,pe,_,s,r)}#Q(t,n,o,i,r,c,a){const s={prevVelocity:this.#k,maxSpeed:this.#m,acceleration:this.#b,deceleration:this.#y,firstDrawAt:this.#S,carCenters:this.#P,stopIdxById:this.#L,hudBuf:this.#B,idSortBuf:this.#F,idRankBuf:this.#$};Ua(this.#n,t,n,o,i,a,s),this.#S=s.firstDrawAt}#J(t,n,o,i,r,c){const a=performance.now(),s=Math.max(1,c),l=$s/s,f=80/s,u=Math.max(1.5,Math.min(2.5,r.figureStride*.45)),d=this.#j;d.clear();for(const p of t.cars){const h=this.#s.get(p.id),m=n.get(p.id),g=Jn(t.stops,p.y),b=p.phase==="loading"&&g!==void 0&&g.dist<.5?g.stop:void 0,w=b!==void 0&&b.waiting_up>=b.waiting_down,T=w?0:1e4;if(h&&m!==void 0&&b!==void 0){const v=p.riders-h.riders;if(v>0&&d.set(b.entity_id,(d.get(b.entity_id)??0)+v),v!==0){const C=i(b.y),y=this.#M.get(p.id)??r.carW,_=y>=r.figureStride*3,M=Math.min(Math.abs(v),6);if(v>0){const k=o.get(p.id),I=k!==void 0?k.end-2:m-20,E=w?Go:Uo,x=this.#f.get(b.entity_id);x!==void 0&&(x.delete(p.line),x.size===0&&this.#f.delete(b.entity_id)),Ja(this.#c,{count:M,enablePairs:_,halfPairW:u,now:a,stagger:f,duration:l,originX:I,endX:m,floorY:C,color:E,stopId:b.entity_id,dirOffset:T})}else{const k=this.#E.get(p.id)??Et,I=m+y/2+14,E=h.roster.slice(Math.max(0,h.roster.length-M));ec(this.#c,{count:M,enablePairs:_,halfPairW:u,now:a,stagger:f,duration:l,startX:m,endX:I,floorY:C,color:k,variants:E,carId:p.id})}}}let S;if(h){const v=p.riders-h.riders;if(v===0)S=h.roster;else if(S=h.roster.slice(),v>0&&b!==void 0)for(let C=0;C<v;C++)S.push(K(b.entity_id,C+T));else if(v>0)for(let C=0;C<v;C++)S.push(K(p.id,S.length+C));else S.splice(S.length+v,-v)}else{S=[];for(let v=0;v<p.riders;v++)S.push(K(p.id,v))}for(;S.length>p.riders;)S.pop();for(;S.length<p.riders;)S.push(K(p.id,S.length));this.#s.set(p.id,{riders:p.riders,roster:S})}for(const p of t.stops){const h=p.waiting_up+p.waiting_down,m=this.#a.get(p.entity_id);if(m){const g=m.waiting-h,b=d.get(p.entity_id)??0,w=Math.max(0,g-b);w>0&&Za(this.#c,{count:Math.min(w,4),now:a,stagger:f,duration:l*2.2,startX:r.padX+r.labelW+20,endX:r.padX+r.labelW-16,floorY:i(p.y),color:Xo,stopId:p.entity_id})}this.#a.set(p.entity_id,{waiting:h})}{let p=0;for(let h=0;h<this.#c.length;h++){const m=this.#c[h];m!==void 0&&a-m.bornAt<=m.duration&&(this.#c[p++]=m)}this.#c.length=p}if(this.#s.size>t.cars.length)for(const p of this.#s.keys())this.#C.has(p)||this.#s.delete(p);if(this.#a.size>t.stops.length)for(const p of this.#a.keys())this.#R.has(p)||this.#a.delete(p)}}const tc="#f59e0b",nc=3;function oc(){const e="quest-pane";return{root:P("quest-pane",e),gridView:P("quest-grid",e),stageView:P("quest-stage-view",e),backBtn:P("quest-back-to-grid",e),title:P("quest-stage-title",e),brief:P("quest-stage-brief",e),stageStars:P("quest-stage-stars",e),editorHost:P("quest-editor",e),runBtn:P("quest-run",e),resetBtn:P("quest-reset",e),result:P("quest-result",e),progress:P("quest-progress",e),shaft:P("quest-shaft",e),shaftIdle:P("quest-shaft-idle",e)}}function Bt(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=De(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(nc-n)}function Ft(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function ic(e){const t=oc(),n=y=>{const _=ts(y);if(_)return _;const M=ae[0];if(!M)throw new Error("quest-pane: stage registry is empty");return M},o=hs(n(e.initialStageId),"grid");Bt(t,o.activeStage);const i=us();Pn(i,o.activeStage);const r=fs();Bn(r,o.activeStage);const c=ms();It(c,o.activeStage);const a=as(),s=new ni(t.shaft,tc);t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const l=await gr({container:t.editorHost,initialValue:In(o.activeStage.id)??o.activeStage.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const f=bs(),u=300;let d=null,p=!1;const h=()=>{p||(d!==null&&clearTimeout(d),d=setTimeout(()=>{Mn(o.activeStage.id,l.getValue()),d=null},u))},m=()=>{d!==null&&(clearTimeout(d),d=null,Mn(o.activeStage.id,l.getValue()))},g=y=>{p=!0;try{l.setValue(y)}finally{p=!1}};l.onDidChange(()=>{h()});const b=ws();Dn(b,o.activeStage,l);const w=()=>{Fn(o),t.shaftIdle.hidden=!1;const y=t.shaft.getContext("2d");y&&y.clearRect(0,0,t.shaft.width,t.shaft.height)},T=(y,{fromGrid:_})=>{m(),gs(o,y),Bt(t,y),Pn(i,y),Bn(r,y),It(c,y),Dn(b,y,l),g(In(y.id)??y.starterCode),l.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",w(),Ft(t,"stage"),Rt(o,"stage"),e.onStageChange?.(y.id)},S=()=>{m(),w(),t.result.textContent="",t.progress.textContent="",Ft(t,"grid"),Rt(o,"grid"),Tt(a,y=>{T(n(y),{fromGrid:!0})}),e.onBackToGrid?.()};Tt(a,y=>{T(n(y),{fromGrid:!0})});const v=e.landOn??"grid";Ft(t,v),Rt(o,v);const C=async()=>{const y=o.activeStage;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",l.clearRuntimeMarker();let _=null,M=0;o.runLoop.active=!0;const k=()=>{o.runLoop.active&&(_!==null&&s.draw(_,1),requestAnimationFrame(k))};t.shaftIdle.hidden=!0,requestAnimationFrame(k);try{const I=await ds(y,l.getValue(),{timeoutMs:1e3,onProgress:E=>{_e(o,y)&&(t.progress.textContent=ps(E))},onSnapshot:E=>{_=E,M+=1}});if(I.passed){const E=De(y.id);I.stars>E&&(is(y.id,I.stars),Tt(a,x=>{T(n(x),{fromGrid:!0})}),_e(o,y)&&Bt(t,o.activeStage)),_e(o,y)&&It(c,o.activeStage,{collapse:!1})}if(_e(o,y)){t.result.textContent="",t.progress.textContent="";const E=I.passed?ns(y.id):void 0,x=E?()=>{T(E,{fromGrid:!1})}:void 0;ys(f,I,()=>void C(),y.failHint,x)}}catch(I){if(_e(o,y)){const E=I instanceof Error?I.message:String(I);t.result.textContent=`Error: ${E}`,t.progress.textContent="",I instanceof Fo&&I.location!==null&&l.setRuntimeMarker({line:I.location.line,column:I.location.column,message:E})}}finally{if(t.runBtn.disabled=!1,Fn(o),M===0){const I=t.shaft.getContext("2d");I&&I.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{C()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${o.activeStage.title} to its starter code?`)&&(os(o.activeStage.id),g(o.activeStage.starterCode),l.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{S()}),{handles:t,editor:l}}const Zn=/(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?)|([A-Z][A-Za-z0-9_]*)|([a-z_][A-Za-z0-9_]*)(?=\s*:)|([A-Za-z_][A-Za-z0-9_]*)/g;function rc(e){const t=[];let n=0;Zn.lastIndex=0;let o;for(;(o=Zn.exec(e))!==null;)o.index>n&&t.push({cls:"",text:e.slice(n,o.index)}),o[1]!==void 0?t.push({cls:"ron-c",text:o[1]}):o[2]!==void 0?t.push({cls:"ron-s",text:o[2]}):o[3]!==void 0?t.push({cls:"ron-n",text:o[3]}):o[4]!==void 0?t.push({cls:"ron-t",text:o[4]}):o[5]!==void 0?t.push({cls:"ron-k",text:o[5]}):o[6]!==void 0&&t.push({cls:"",text:o[6]}),n=o.index+o[0].length;return n<e.length&&t.push({cls:"",text:e.slice(n)}),t}function sc(e,t){const n=document.createElement("div");n.className="ron-row";const o=document.createElement("span");o.className="ron-ln",o.textContent=String(t),n.appendChild(o);const i=document.createElement("span");i.className="ron-code";const r=rc(e);if(r.length===0)i.textContent=" ";else for(const c of r)if(c.cls){const a=document.createElement("span");a.className=c.cls,a.textContent=c.text,i.appendChild(a)}else i.appendChild(document.createTextNode(c.text));return n.appendChild(i),n}function ac(e){const t=document.createDocumentFragment(),n=e.split(`
`);for(let o=0;o<n.length;o++)t.appendChild(sc(n[o]??"",o+1));return t}function ze(e){const t=document.getElementById(e);if(!t)throw new Error(`missing element #${e} (scenario-config)`);return t}const cc="(min-width: 768px)";function lc(e){const t=ze("scenario-config-details"),n=ze("scenario-config-filename"),o=ze("scenario-config-code"),i=ze("scenario-config-copy"),r=window.matchMedia(cc),c=()=>{t.open=r.matches};c(),r.addEventListener("change",c);let a="",s="";return i.addEventListener("click",l=>{if(l.preventDefault(),l.stopPropagation(),!s)return;const f=navigator.clipboard;if(!f){N(e,"Copy failed");return}f.writeText(s).then(()=>{N(e,"Config copied")}).catch(()=>{N(e,"Copy failed")})}),l=>{if(l===a)return;const f=q(l);a=l,s=f.ron,n.textContent=f.configFilename,o.replaceChildren(ac(f.ron))}}let $t=null;async function oi(){if(!$t){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;$t=import(e).then(async n=>(await n.default(t),n))}return $t}class cn{#e;#n;constructor(t){this.#e=t,this.#n=t.dt()}static async create(t,n,o){const i=await oi();return new cn(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#n}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class ii{#e;#n=0;#t=[];#r=0;#l=0;#o=0;#d=1;#i=0;constructor(t){this.#e=dc(BigInt(t>>>0))}setPhases(t){this.#t=t,this.#r=t.reduce((o,i)=>o+i.durationSec,0);let n=0;for(const o of t)o.ridersPerMin>n&&(n=o.ridersPerMin);this.#l=n,this.#o=0,this.#n=0}setIntensity(t){this.#d=Math.max(0,t)}setPatienceTicks(t){this.#i=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#t.length===0)return[];const o=t.stops.filter(a=>a.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#t[this.currentPhaseIndex()];if(!r)return[];this.#n+=r.ridersPerMin*this.#d/60*i,this.#o=(this.#o+i)%(this.#r||1);const c=[];for(;this.#n>=1;)this.#n-=1,c.push(this.#s(o,r));return c}currentPhaseIndex(){if(this.#t.length===0)return 0;let t=this.#o;for(const[n,o]of this.#t.entries())if(t-=o.durationSec,t<0)return n;return this.#t.length-1}currentPhaseLabel(){return this.#t[this.currentPhaseIndex()]?.name??""}currentPhaseRatio(){if(this.#t.length===0)return 0;const t=this.#t[this.currentPhaseIndex()];return t&&this.#l>0?t.ridersPerMin/this.#l:0}phaseProgress(){return this.#r<=0?0:Math.min(1,this.#o/this.#r)}progressInPhase(){if(this.#t.length===0)return 0;let t=this.#o;for(const n of this.#t){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#t}#s(t,n){const o=this.#a(t.length,n.originWeights);let i=this.#a(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],c=t[i];if(!r||!c)throw new Error("stop index out of bounds");const a=50+this.#u()*50;return{originStopId:r.stop_id,destStopId:c.stop_id,weight:a,...this.#i>0?{patienceTicks:this.#i}:{}}}#a(t,n){if(!n||n.length!==t)return this.#p(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#p(t);let i=this.#u()*o;for(const[r,c]of n.entries())if(i-=Math.max(0,c),i<0)return r;return t-1}#c(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#p(t){return Number(this.#c()%BigInt(t))}#u(){return Number(this.#c()>>11n)/2**53}}function dc(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const pc="#7dd3fc",uc="#fda4af";async function eo(e,t,n,o,i){const r=Ii(o,i),c=await cn.create(r,t,n),a=new ni(e.canvas,e.accent);if(a.setTetherConfig(o.tether??null),a.setAirportConfig(o.airport??null),o.tether||o.airport){const l=on(o,i);a.setPhysics(l.maxSpeed,l.acceleration,l.deceleration,l.weightCapacity)}const s=e.canvas.parentElement;if(s){const l=o.stops.length,u=o.tether?640:o.airport!==void 0?Math.max(180,Math.min(380,window.innerWidth*.3)):Math.max(200,l*16);s.style.setProperty("--shaft-min-h",`${u}px`)}return{strategy:t,sim:c,renderer:a,scenario:o,accent:e.accent,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function Te(e){e?.sim.dispose(),e?.renderer.dispose()}function ri(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const fc=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],hc=120;function to(e,t,n,o){const i=e.sim.metrics();e.latestMetrics=i;for(const c of fc){const a=e.metricHistory[c];a.push(i[c]),a.length>hc&&a.shift()}const r=performance.now();for(const[c,a]of e.bubbles)a.expiresAt<=r&&e.bubbles.delete(c);e.renderer.draw(t,n,e.bubbles,o)}const gc={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},mc=1e3;function bc(e,t,n){const o=performance.now(),i=new Map;for(const c of n.stops)i.set(c.entity_id,c.name);const r=c=>i.get(c)??`stop #${c}`;for(const c of t){const a=yc(c,r);if(a===null)continue;const s=c.elevator;if(s===void 0)continue;const l=gc[c.kind]??mc;e.bubbles.set(s,{glyph:a.glyph,text:a.text,bornAt:o,expiresAt:o+l})}}function yc(e,t){switch(e.kind){case"elevator-assigned":return{glyph:"›",text:`To ${t(e.stop)}`};case"elevator-repositioning":return{glyph:"↻",text:`Reposition to ${t(e.stop)}`};case"elevator-arrived":return{glyph:"●",text:`At ${t(e.stop)}`};case"door-opened":return{glyph:"◌",text:"Doors open"};case"rider-boarded":return{glyph:"+",text:"Boarding"};case"rider-exited":return{glyph:"↓",text:`Off at ${t(e.stop)}`};default:return null}}const Sc={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function no(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=Sc[t],e.modeEl.title=t)}function vc(){const e=a=>{const s=document.getElementById(a);if(!s)throw new Error(`missing element #${a}`);return s},t=a=>document.getElementById(a),n=(a,s)=>({root:e(`pane-${a}`),canvas:e(`shaft-${a}`),name:e(`name-${a}`),mode:e(`mode-${a}`),desc:e(`desc-${a}`),metrics:e(`metrics-${a}`),trigger:e(`strategy-trigger-${a}`),popover:e(`strategy-popover-${a}`),repoTrigger:e(`repo-trigger-${a}`),repoName:e(`repo-name-${a}`),repoPopover:e(`repo-popover-${a}`),accent:s,which:a}),o=a=>{const s=document.querySelector(`.tweak-row[data-key="${a}"]`);if(!s)throw new Error(`missing tweak row for ${a}`);const l=u=>{const d=s.querySelector(u);if(!d)throw new Error(`missing ${u} in tweak row ${a}`);return d},f=u=>s.querySelector(u);return{root:s,value:l(".tweak-value"),defaultV:l(".tweak-default-v"),dec:l(".tweak-dec"),inc:l(".tweak-inc"),reset:l(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},i={};for(const a of ve)i[a]=o(a);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",pc),paneB:n("b",uc)};er(r);const c=document.getElementById("controls-bar");return c&&new ResizeObserver(([s])=>{if(!s)return;const l=Math.ceil(s.borderBoxSize[0]?.blockSize??s.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${l}px`)}).observe(c),r}function si(e,t,n,o,i,r,c,a,s){const l=document.createDocumentFragment();for(const f of t){const u=document.createElement("button");u.type="button",u.className="strategy-option",u.setAttribute("role","menuitemradio"),u.setAttribute("aria-checked",f===r?"true":"false"),u.dataset[i]=f;const d=document.createElement("span");d.className="strategy-option-name";const p=document.createElement("span");if(p.className="strategy-option-label",p.textContent=n[f],d.appendChild(p),c&&f===c){const m=document.createElement("span");m.className="strategy-option-sibling",m.textContent=`also in ${a}`,d.appendChild(m)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=o[f],u.append(d,h),u.addEventListener("click",()=>{s(f)}),l.appendChild(u)}e.replaceChildren(l)}function ce(e,t){const n=Be[t],o=Po[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function oo(e,t,n,o,i){si(e.repoPopover,Qi,Be,Po,"reposition",t,n,o,i)}function Ee(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;oo(t.paneA,o,r?i:null,"B",c=>void ro(e,t,"a",c,n)),oo(t.paneB,i,r?o:null,"A",c=>void ro(e,t,"b",c,n))}function Yt(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function ai(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function Kt(e){Yt(e.paneA,!1),Yt(e.paneB,!1)}function ut(e){Jt(e),Kt(e)}function io(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;ut(t),r&&(Ee(e,t,o),Yt(n,!0))})}async function ro(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){Kt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},ce(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},ce(t.paneB,o)),G(e.permalink),Ee(e,t,i),Kt(t),await i(),N(t.toast,`${n==="a"?"A":"B"} park: ${Be[o]}`)}function wc(e){document.addEventListener("click",t=>{if(!ci(e)&&!ai(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;ut(e)}})}function le(e,t){const n=Se[t],o=Ao[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function so(e,t,n,o,i){si(e.popover,Ki,Se,Ao,"strategy",t,n,o,i)}function xe(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;so(t.paneA,o,r?i:null,"B",c=>void co(e,t,"a",c,n)),so(t.paneB,i,r?o:null,"A",c=>void co(e,t,"b",c,n))}function Qt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function ci(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function Jt(e){Qt(e.paneA,!1),Qt(e.paneB,!1)}function ao(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;ut(t),r&&(xe(e,t,o),Qt(n,!0))})}async function co(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){Jt(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},le(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},le(t.paneB,o)),G(e.permalink),xe(e,t,i),Jt(t),await i(),N(t.toast,`${n==="a"?"A":"B"}: ${Se[o]}`)}function lo(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function kc(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function ft(e,t,n){let o=!1;for(const i of ve){const r=n.tweakRows[i],c=e.tweakRanges[i],a=re(e,i,t),s=tn(e,i),l=nn(e,i,a);l&&(o=!0),r.value.textContent=lo(i,a),r.defaultV.textContent=lo(i,s),r.dec.disabled=a<=c.min+1e-9,r.inc.disabled=a>=c.max-1e-9,r.root.dataset.overridden=String(l),r.reset.hidden=!l;const f=Math.max(c.max-c.min,1e-9),u=Math.max(0,Math.min(1,(a-c.min)/f)),d=Math.max(0,Math.min(1,(s-c.min)/f));r.trackFill&&(r.trackFill.style.width=`${(u*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(u*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function li(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function ln(e,t,n,o){const i=on(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},c=[e.paneA,e.paneB].filter(s=>s!==null),a=c.every(s=>s.sim.applyPhysicsLive(r));if(a)for(const s of c)s.renderer?.setPhysics(i.maxSpeed,i.acceleration,i.deceleration,i.weightCapacity);ft(n,e.permalink.overrides,t),a||o()}function _c(e,t,n){return Math.min(n,Math.max(t,e))}function Cc(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function je(e,t,n,o,i){const r=q(e.permalink.scenario),c=r.tweakRanges[n],a=re(r,n,e.permalink.overrides),s=_c(a+o*c.step,c.min,c.max),l=Cc(s,c.min,c.step);Ic(e,t,n,l,i)}function Tc(e,t,n,o){const i=q(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},G(e.permalink),n==="cars"?(o(),N(t.toast,"Cars reset")):(ln(e,t,i,o),N(t.toast,`${kc(n)} reset`))}async function Rc(e,t,n){const o=q(e.permalink.scenario),i=nn(o,"cars",re(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},G(e.permalink),i?await n():ln(e,t,o,n),N(t.toast,"Parameters reset")}function Ic(e,t,n,o,i){const r=q(e.permalink.scenario),c={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:_o(r,c)},G(e.permalink),n==="cars"?i():ln(e,t,r,i)}function Mc(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Ec(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var Ye={exports:{}},xc=Ye.exports,po;function Ac(){return po||(po=1,(function(e){(function(t,n,o){function i(s){var l=this,f=a();l.next=function(){var u=2091639*l.s0+l.c*23283064365386963e-26;return l.s0=l.s1,l.s1=l.s2,l.s2=u-(l.c=u|0)},l.c=1,l.s0=f(" "),l.s1=f(" "),l.s2=f(" "),l.s0-=f(s),l.s0<0&&(l.s0+=1),l.s1-=f(s),l.s1<0&&(l.s1+=1),l.s2-=f(s),l.s2<0&&(l.s2+=1),f=null}function r(s,l){return l.c=s.c,l.s0=s.s0,l.s1=s.s1,l.s2=s.s2,l}function c(s,l){var f=new i(s),u=l&&l.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,u&&(typeof u=="object"&&r(u,f),d.state=function(){return r(f,{})}),d}function a(){var s=4022871197,l=function(f){f=String(f);for(var u=0;u<f.length;u++){s+=f.charCodeAt(u);var d=.02519603282416938*s;s=d>>>0,d-=s,d*=s,s=d>>>0,d-=s,s+=d*4294967296}return(s>>>0)*23283064365386963e-26};return l}n&&n.exports?n.exports=c:this.alea=c})(xc,e)})(Ye)),Ye.exports}var Ke={exports:{}},Pc=Ke.exports,uo;function Lc(){return uo||(uo=1,(function(e){(function(t,n,o){function i(a){var s=this,l="";s.x=0,s.y=0,s.z=0,s.w=0,s.next=function(){var u=s.x^s.x<<11;return s.x=s.y,s.y=s.z,s.z=s.w,s.w^=s.w>>>19^u^u>>>8},a===(a|0)?s.x=a:l+=a;for(var f=0;f<l.length+64;f++)s.x^=l.charCodeAt(f)|0,s.next()}function r(a,s){return s.x=a.x,s.y=a.y,s.z=a.z,s.w=a.w,s}function c(a,s){var l=new i(a),f=s&&s.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xor128=c})(Pc,e)})(Ke)),Ke.exports}var Qe={exports:{}},Bc=Qe.exports,fo;function Fc(){return fo||(fo=1,(function(e){(function(t,n,o){function i(a){var s=this,l="";s.next=function(){var u=s.x^s.x>>>2;return s.x=s.y,s.y=s.z,s.z=s.w,s.w=s.v,(s.d=s.d+362437|0)+(s.v=s.v^s.v<<4^(u^u<<1))|0},s.x=0,s.y=0,s.z=0,s.w=0,s.v=0,a===(a|0)?s.x=a:l+=a;for(var f=0;f<l.length+64;f++)s.x^=l.charCodeAt(f)|0,f==l.length&&(s.d=s.x<<10^s.x>>>4),s.next()}function r(a,s){return s.x=a.x,s.y=a.y,s.z=a.z,s.w=a.w,s.v=a.v,s.d=a.d,s}function c(a,s){var l=new i(a),f=s&&s.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xorwow=c})(Bc,e)})(Qe)),Qe.exports}var Je={exports:{}},$c=Je.exports,ho;function Dc(){return ho||(ho=1,(function(e){(function(t,n,o){function i(a){var s=this;s.next=function(){var f=s.x,u=s.i,d,p;return d=f[u],d^=d>>>7,p=d^d<<24,d=f[u+1&7],p^=d^d>>>10,d=f[u+3&7],p^=d^d>>>3,d=f[u+4&7],p^=d^d<<7,d=f[u+7&7],d=d^d<<13,p^=d^d<<9,f[u]=p,s.i=u+1&7,p};function l(f,u){var d,p=[];if(u===(u|0))p[0]=u;else for(u=""+u,d=0;d<u.length;++d)p[d&7]=p[d&7]<<15^u.charCodeAt(d)+p[d+1&7]<<13;for(;p.length<8;)p.push(0);for(d=0;d<8&&p[d]===0;++d);for(d==8?p[7]=-1:p[d],f.x=p,f.i=0,d=256;d>0;--d)f.next()}l(s,a)}function r(a,s){return s.x=a.x.slice(),s.i=a.i,s}function c(a,s){a==null&&(a=+new Date);var l=new i(a),f=s&&s.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(f.x&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xorshift7=c})($c,e)})(Je)),Je.exports}var Ze={exports:{}},Oc=Ze.exports,go;function Wc(){return go||(go=1,(function(e){(function(t,n,o){function i(a){var s=this;s.next=function(){var f=s.w,u=s.X,d=s.i,p,h;return s.w=f=f+1640531527|0,h=u[d+34&127],p=u[d=d+1&127],h^=h<<13,p^=p<<17,h^=h>>>15,p^=p>>>12,h=u[d]=h^p,s.i=d,h+(f^f>>>16)|0};function l(f,u){var d,p,h,m,g,b=[],w=128;for(u===(u|0)?(p=u,u=null):(u=u+"\0",p=0,w=Math.max(w,u.length)),h=0,m=-32;m<w;++m)u&&(p^=u.charCodeAt((m+32)%u.length)),m===0&&(g=p),p^=p<<10,p^=p>>>15,p^=p<<4,p^=p>>>13,m>=0&&(g=g+1640531527|0,d=b[m&127]^=p+g,h=d==0?h+1:0);for(h>=128&&(b[(u&&u.length||0)&127]=-1),h=127,m=512;m>0;--m)p=b[h+34&127],d=b[h=h+1&127],p^=p<<13,d^=d<<17,p^=p>>>15,d^=d>>>12,b[h]=p^d;f.w=g,f.X=b,f.i=h}l(s,a)}function r(a,s){return s.i=a.i,s.w=a.w,s.X=a.X.slice(),s}function c(a,s){a==null&&(a=+new Date);var l=new i(a),f=s&&s.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(f.X&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xor4096=c})(Oc,e)})(Ze)),Ze.exports}var et={exports:{}},Hc=et.exports,mo;function Nc(){return mo||(mo=1,(function(e){(function(t,n,o){function i(a){var s=this,l="";s.next=function(){var u=s.b,d=s.c,p=s.d,h=s.a;return u=u<<25^u>>>7^d,d=d-p|0,p=p<<24^p>>>8^h,h=h-u|0,s.b=u=u<<20^u>>>12^d,s.c=d=d-p|0,s.d=p<<16^d>>>16^h,s.a=h-u|0},s.a=0,s.b=0,s.c=-1640531527,s.d=1367130551,a===Math.floor(a)?(s.a=a/4294967296|0,s.b=a|0):l+=a;for(var f=0;f<l.length+20;f++)s.b^=l.charCodeAt(f)|0,s.next()}function r(a,s){return s.a=a.a,s.b=a.b,s.c=a.c,s.d=a.d,s}function c(a,s){var l=new i(a),f=s&&s.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.tychei=c})(Hc,e)})(et)),et.exports}var tt={exports:{}};const qc={},Gc=Object.freeze(Object.defineProperty({__proto__:null,default:qc},Symbol.toStringTag,{value:"Module"})),Uc=Ec(Gc);var Xc=tt.exports,bo;function zc(){return bo||(bo=1,(function(e){(function(t,n,o){var i=256,r=6,c=52,a="random",s=o.pow(i,r),l=o.pow(2,c),f=l*2,u=i-1,d;function p(S,v,C){var y=[];v=v==!0?{entropy:!0}:v||{};var _=b(g(v.entropy?[S,T(n)]:S??w(),3),y),M=new h(y),k=function(){for(var I=M.g(r),E=s,x=0;I<l;)I=(I+x)*i,E*=i,x=M.g(1);for(;I>=f;)I/=2,E/=2,x>>>=1;return(I+x)/E};return k.int32=function(){return M.g(4)|0},k.quick=function(){return M.g(4)/4294967296},k.double=k,b(T(M.S),n),(v.pass||C||function(I,E,x,L){return L&&(L.S&&m(L,M),I.state=function(){return m(M,{})}),x?(o[a]=I,E):I})(k,_,"global"in v?v.global:this==o,v.state)}function h(S){var v,C=S.length,y=this,_=0,M=y.i=y.j=0,k=y.S=[];for(C||(S=[C++]);_<i;)k[_]=_++;for(_=0;_<i;_++)k[_]=k[M=u&M+S[_%C]+(v=k[_])],k[M]=v;(y.g=function(I){for(var E,x=0,L=y.i,W=y.j,$=y.S;I--;)E=$[L=u&L+1],x=x*i+$[u&($[L]=$[W=u&W+E])+($[W]=E)];return y.i=L,y.j=W,x})(i)}function m(S,v){return v.i=S.i,v.j=S.j,v.S=S.S.slice(),v}function g(S,v){var C=[],y=typeof S,_;if(v&&y=="object")for(_ in S)try{C.push(g(S[_],v-1))}catch{}return C.length?C:y=="string"?S:S+"\0"}function b(S,v){for(var C=S+"",y,_=0;_<C.length;)v[u&_]=u&(y^=v[u&_]*19)+C.charCodeAt(_++);return T(v)}function w(){try{var S;return d&&(S=d.randomBytes)?S=S(i):(S=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(S)),T(S)}catch{var v=t.navigator,C=v&&v.plugins;return[+new Date,t,C,t.screen,T(n)]}}function T(S){return String.fromCharCode.apply(0,S)}if(b(o.random(),n),e.exports){e.exports=p;try{d=Uc}catch{}}else o["seed"+a]=p})(typeof self<"u"?self:Xc,[],Math)})(tt)),tt.exports}var Dt,yo;function jc(){if(yo)return Dt;yo=1;var e=Ac(),t=Lc(),n=Fc(),o=Dc(),i=Wc(),r=Nc(),c=zc();return c.alea=e,c.xor128=t,c.xorwow=n,c.xorshift7=o,c.xor4096=i,c.tychei=r,Dt=c,Dt}var Vc=jc();const Yc=Mc(Vc),at=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],Ot=at.reduce((e,t)=>t.length<e.length?t:e).length,Wt=at.reduce((e,t)=>t.length>e.length?t:e).length;function Kc(e){const t=e?.seed?new Yc(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let p=typeof n!="number"?Ot:a(n);const h=typeof o!="number"?Wt:a(o);p>h&&(p=h);let m=!1,g;for(;!m;)g=c(),m=g.length<=h&&g.length>=p;return g}function c(){return at[s(at.length)]}function a(p){return p<Ot&&(p=Ot),p>Wt&&(p=Wt),p}function s(p){const h=t?t():Math.random();return Math.floor(h*p)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=p=>p),typeof e.separator!="string"&&(e.separator=" ");const l=e.min+s(e.max+1-e.min);let f=[],u="",d=0;for(let p=0;p<l*e.wordsPerString;p++)d===e.wordsPerString-1?u+=e.formatter(r(),d):u+=e.formatter(r(),d)+e.separator,d++,(p+1)%e.wordsPerString===0&&(f.push(u),u="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const Zt="LoopSchedule",Qc="Fixed-headway timetable on a one-way loop.",di=e=>`${e}×`,pi=e=>`${e.toFixed(1)}×`;function ui(){const e=Kc({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function dn(e,t){const n=t.airport!==void 0;e.compareToggle.disabled=n,e.paneA.trigger.disabled=n,e.paneB.trigger.disabled=n,e.paneA.repoTrigger.disabled=n,e.paneB.repoTrigger.disabled=n;for(const o of[e.paneA,e.paneB]){const i=o.repoTrigger.closest(".pane-section");i instanceof HTMLElement&&(i.hidden=n),n&&(o.name.textContent=Zt,o.desc.textContent=Qc)}return n&&(e.compareToggle.checked=!1,e.layout.dataset.mode="single"),n}function Jc(e,t){const n=q(e.scenario);t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=di(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=pi(e.intensity),le(t.paneA,e.strategyA),le(t.paneB,e.strategyB),ce(t.paneA,e.repositionA),ce(t.paneB,e.repositionB),Lo(t,e.scenario),dn(t,n)?e.compare=!1:(t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single"),Object.keys(e.overrides).length>0&&li(t,!0),ft(n,e.overrides,t)}function Ae(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function fi(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function hi(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function Zc(e){if(e.length<2)return{d:"M 0 13 L 100 13",lastX:100,lastY:13};let t=e[0]??0,n=e[0]??0;for(let s=1;s<e.length;s++){const l=e[s];l!==void 0&&(l<t&&(t=l),l>n&&(n=l))}const o=n-t,i=e.length;let r="",c=0,a=7;for(let s=0;s<i;s++){const l=s/(i-1)*100,f=o>0?13-((e[s]??0)-t)/o*12:7;r+=`${s===0?"M":"L"} ${l.toFixed(2)} ${f.toFixed(2)} `,c=l,a=f}return{d:r.trim(),lastX:c,lastY:a}}const Ht="http://www.w3.org/2000/svg",en=[["wait avg","avg_wait_s"],["wait max","max_wait_s"],["delivered","delivered"],["abandoned","abandoned"],["util","utilization"]];function el(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function tl(e,t,n){const o=So(e,n),i=So(t,n),r=o-i,c=r>0?"▴":"▾",a=r>0?"+":r<0?"−":"",s=Math.abs(r);switch(n){case"avg_wait_s":case"max_wait_s":return`${c} ${a}${s.toFixed(1)} s`;case"delivered":case"abandoned":return`${c} ${a}${s.toFixed(0)}`;case"utilization":return`${c} ${a}${(s*100).toFixed(0)}%`}}function So(e,t){switch(t){case"avg_wait_s":return e.avg_wait_s;case"max_wait_s":return e.max_wait_s;case"delivered":return e.delivered;case"abandoned":return e.abandoned;case"utilization":return e.utilization}}function nl(e,t){const n=(p,h,m,g)=>Math.abs(p-h)<m?["tie","tie"]:(g?p>h:p<h)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,c]=n(e.max_wait_s,t.max_wait_s,.05,!1),[a,s]=n(e.delivered,t.delivered,.5,!0),[l,f]=n(e.abandoned,t.abandoned,.5,!1),[u,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:a,abandoned:l,utilization:u},b:{avg_wait_s:i,max_wait_s:c,delivered:s,abandoned:f,utilization:d}}}function vo(e){const t=document.createDocumentFragment();for(const[n]of en){const o=ie("div","metric-row"),i=document.createElementNS(Ht,"svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS(Ht,"path"));const r=document.createElementNS(Ht,"circle");r.classList.add("metric-spark-dot"),r.setAttribute("r","1.4"),i.appendChild(r),o.append(ie("span","metric-k",n),ie("span","metric-v"),ie("span","metric-d"),i),t.appendChild(o)}e.replaceChildren(t)}function Nt(e,t,n,o,i){const r=e.children;for(let c=0;c<en.length;c++){const a=r[c];if(!a)continue;const s=en[c];if(!s)continue;const l=s[1],f=n?n[l]:"";a.dataset.verdict!==f&&(a.dataset.verdict=f);const u=a.children[1],d=el(t,l);u.textContent!==d&&(u.textContent=d);const p=a.children[2],m=i!==null&&f!=="tie"&&f!==""?tl(t,i,l):"";p.textContent!==m&&(p.textContent=m);const g=a.children[3],b=g.firstElementChild,w=g.children[1],T=Zc(o[l]);b.getAttribute("d")!==T.d&&b.setAttribute("d",T.d);const S=T.lastX.toFixed(2),v=T.lastY.toFixed(2);w.getAttribute("cx")!==S&&w.setAttribute("cx",S),w.getAttribute("cy")!==v&&w.setAttribute("cy",v)}}const ol=200;function gi(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function oe(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=q(e.permalink.scenario);e.traffic=new ii(xo(e.permalink.seed)),gi(e,o),Te(e.paneA),Te(e.paneB),e.paneA=null,e.paneB=null;try{const i=await eo(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);le(t.paneA,e.permalink.strategyA),ce(t.paneA,e.permalink.repositionA),vo(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await eo(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),le(t.paneB,e.permalink.strategyB),ce(t.paneB,e.permalink.repositionB),vo(t.paneB.metrics)}catch(c){throw Te(i),c}if(n!==e.initToken){Te(i),Te(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,fi(e,t),hi(e,t),ft(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&N(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function il(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<ol&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if(ri(e,c=>{const a=c.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);a.kind==="err"&&console.warn(`spawnRider failed (seed): ${a.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(gi(e,q(e.permalink.scenario)),e.seeding=null)}function rl(e,t){const n=()=>oe(e,t),o={renderPaneStrategyInfo:le,renderPaneRepositionInfo:ce,refreshStrategyPopovers:()=>{xe(e,t,n),Ee(e,t,n)},renderTweakPanel:()=>{const r=q(e.permalink.scenario);ft(r,e.permalink.overrides,t)},applyGating:r=>dn(t,r)};t.scenarioCards.addEventListener("click",r=>{const c=r.target;if(!(c instanceof HTMLElement))return;const a=c.closest(".scenario-card");if(!a)return;const s=a.dataset.scenarioId;!s||s===e.permalink.scenario||Bo(e,t,s,n,o)}),ao(e,t,t.paneA,n),ao(e,t,t.paneB,n),io(e,t,t.paneA,n),io(e,t,t.paneB,n),xe(e,t,n),Ee(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},G(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",xe(e,t,n),Ee(e,t,n),oe(e,t).then(()=>{N(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||O.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},G(e.permalink),oe(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=ui();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},G(e.permalink),oe(e,t).then(()=>{N(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=di(r)}),t.speedInput.addEventListener("change",()=>{G(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=pi(r)}),t.intensityInput.addEventListener("change",()=>{G(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{oe(e,t),N(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";li(t,r)});for(const r of ve){const c=t.tweakRows[r];bn(c.dec,()=>{je(e,t,r,-1,n)}),bn(c.inc,()=>{je(e,t,r,1,n)}),c.reset.addEventListener("click",()=>{Tc(e,t,r,n)}),c.root.addEventListener("keydown",a=>{a.key==="ArrowUp"||a.key==="ArrowRight"?(a.preventDefault(),je(e,t,r,1,n)):(a.key==="ArrowDown"||a.key==="ArrowLeft")&&(a.preventDefault(),je(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{Rc(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=Eo(e.permalink),c=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(c).then(()=>{N(t.toast,"Permalink copied")},()=>{N(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{Ae(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{Ae(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&Ae(t,!1)}),sl(e,t,o),wc(t)}function sl(e,t,n){window.addEventListener("keydown",o=>{if(e.permalink.mode==="quest")return;if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable||o.target.closest(".monaco-editor"))return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),Ae(t,t.shortcutSheet.hidden);return}case"Escape":{if(ci(t)||ai(t)){o.preventDefault(),ut(t);return}t.shortcutSheet.hidden||(o.preventDefault(),Ae(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=Le.length){const r=Le[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),Bo(e,t,r.id,()=>oe(e,t),n))}})}const al="elevator-core playground",qt="In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";function wo(e){Ci(cl(e))}function cl(e){if(e.mode==="quest")return{title:`Quest curriculum — ${al}`,description:"Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time."};const t=q(e.scenario),n=t.label;if(t.airport!==void 0){const l=`${n}: ${Zt} dispatch — Elevator dispatch playground`,f=`Watch ${Zt} dispatch handle live rider traffic on the ${n.toLowerCase()} scenario. ${qt}`;return{title:l,description:f}}const o=Se[e.strategyA],i=Se[e.strategyB],r=Be[e.repositionA],c=Be[e.repositionB];if(e.compare){const l=`${n}: ${o} vs ${i} — Elevator dispatch playground`,f=`Compare ${o} (parking: ${r}) against ${i} (parking: ${c}) dispatch on the ${n.toLowerCase()} scenario. ${qt}`;return{title:l,description:f}}const a=`${n}: ${o} dispatch — Elevator dispatch playground`,s=`Watch ${o} dispatch (parking: ${r}) handle live rider traffic on the ${n.toLowerCase()} scenario. ${qt}`;return{title:a,description:s}}function ko(e,t){e.sim.step(t);const n=e.sim.drainEvents();if(n.length===0)return null;const o=e.sim.snapshot();bc(e,n,o);const i=new Map;for(const r of o.cars)i.set(r.id,r.line);for(const r of n)if(r.kind==="elevator-assigned"){const c=i.get(r.elevator);c!==void 0&&e.renderer.pushAssignment(r.stop,r.elevator,c)}return o}function ll(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=nl(t.latestMetrics,n.latestMetrics);Nt(t.metricsEl,t.latestMetrics,o.a,t.metricHistory,n.latestMetrics),Nt(n.metricsEl,n.latestMetrics,o.b,n.metricHistory,t.latestMetrics)}else Nt(t.metricsEl,t.latestMetrics,null,t.metricHistory,null);no(t),n&&no(n)}function dl(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const c=e.paneA,a=e.paneB,s=c!==null&&(!e.permalink.compare||a!==null);if(e.running&&e.ready&&s){const l=e.permalink.speed;let f=ko(c,l);a&&ko(a,l),e.seeding&&(il(e),f=null);const d=Math.min(r,4/60)*l;let p=[];if(!e.seeding){const b=f??c.sim.snapshot();p=e.traffic.drainSpawns(b,d),f=b}for(const b of p)ri(e,w=>{const T=w.sim.spawnRider(b.originStopId,b.destStopId,b.weight,b.patienceTicks);T.kind==="err"&&console.warn(`spawnRider failed: ${T.error}`)});const h=e.permalink.speed,m=e.traffic.currentPhaseRatio(),g=p.length>0||f===null?c.sim.snapshot():f;to(c,g,h,m),a&&to(a,a.sim.snapshot(),h,m),ll(e),(n+=1)%4===0&&(fi(e,t),hi(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function pl(){oi().catch(()=>{});const t=vc(),n=new URLSearchParams(window.location.search).has("k"),o={...O,...Vi(window.location.search)};if(!n){o.seed=ui();const s=new URL(window.location.href);s.searchParams.set("k",o.seed),window.history.replaceState(null,"",s.toString())}tr(o);const i=q(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=_o(i,o.overrides),ir(o.mode),rr(o.mode),Jc(o,t);const c=lc(t.toast);c(o.scenario),_n(s=>{c(s.scenario)});const a={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new ii(xo(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(rl(a,t),_n(wo),wo(o),_i(),await oe(a,t),dn(t,i),a.ready=!0,dl(a,t),a.permalink.mode==="quest"){const s=new URLSearchParams(window.location.search).has("qs");await ic({initialStageId:a.permalink.questStage,landOn:s?"stage":"grid",onStageChange:l=>{a.permalink.questStage=l,G(a.permalink)},onBackToGrid:()=>{a.permalink.questStage=O.questStage,G(a.permalink)}})}}pl();export{it as _};
