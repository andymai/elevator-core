const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-D7jle2IW.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function te(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let fn=0;function U(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(fn),fn=window.setTimeout(()=>{e.classList.remove("show")},1600)}function hn(e,t){let i=0,r=0;const c=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",s=>{e.disabled||(s.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){c();return}t()},70)},380))}),e.addEventListener("pointerup",c),e.addEventListener("pointerleave",c),e.addEventListener("pointercancel",c),e.addEventListener("blur",c),e.addEventListener("click",s=>{s.pointerType||t()})}function Si(){document.getElementById("seo-fallback")?.remove()}function bi(e){document.title!==e.title&&(document.title=e.title),_e('meta[name="description"]',"content",e.description),_e('meta[property="og:title"]',"content",e.title),_e('meta[property="og:description"]',"content",e.description),_e('meta[name="twitter:title"]',"content",e.title),_e('meta[name="twitter:description"]',"content",e.description)}function _e(e,t,n){const o=document.querySelector(e);o&&o.getAttribute(t)!==n&&o.setAttribute(t,n)}function ne(e,t,n){const o=Qt(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return To(i,r.min,r.max)}function Qt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return Co(n.doorOpenTicks,n.doorTransitionTicks)}}function Jt(e,t,n){const o=Qt(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function _o(e,t){const n={};for(const o of we){const i=t[o];i!==void 0&&Jt(e,o,i)&&(n[o]=i)}return n}const we=["cars","maxSpeed","weightCapacity","doorCycleSec"];function wi(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=Co(n,o),r=To(n/(i*tt),.1,.9),c=Math.max(2,Math.round(t*tt)),s=Math.max(1,Math.round(c*r)),a=Math.max(1,Math.round((c-s)/2));return{openTicks:s,transitionTicks:a}}function Co(e,t){return(e+2*t)/tt}function Zt(e,t){const n=e.elevatorDefaults,o=ne(e,"maxSpeed",t),i=ne(e,"weightCapacity",t),r=ne(e,"doorCycleSec",t),{openTicks:c,transitionTicks:s}=wi(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:c,doorTransitionTicks:s}}function vi(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function ki(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(ne(e,"cars",t)),i=Zt(e,t),r=vi(e.stops.length,o),c=e.stops.map((a,l)=>`        StopConfig(id: StopId(${l}), name: ${Wt(a.name)}, position: ${z(a.positionM)}),`).join(`
`),s=r.map((a,l)=>Ci(l,i,a,_i(l,o))).join(`
`);return`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: ${Wt(e.buildingName)},
        stops: [
${c}
        ],
    ),
    elevators: [
${s}
    ],
    simulation: SimulationParams(ticks_per_second: ${z(tt)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${z(e.passengerWeightRange[0])}, ${z(e.passengerWeightRange[1])}),
    ),
)`}const tt=60;function To(e,t,n){return Math.min(n,Math.max(t,e))}function _i(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function Ci(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${z(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${z(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${Wt(o)},
            max_speed: ${z(t.maxSpeed)}, acceleration: ${z(t.acceleration)}, deceleration: ${z(t.deceleration)},
            weight_capacity: ${z(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function Wt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function z(e){return Number.isInteger(e)?`${e}.0`:String(e)}const Ro={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function Ue(e){return Array.from({length:e},()=>1)}const he=5,Ti=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:he},(e,t)=>t===he-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:Ue(he),destWeights:Ue(he)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:Ue(he),destWeights:Ue(he)}],Ri={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:Ti,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...Ro,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},nt=19,Nt=16,Le=4,Io=(1+nt)*Le,Ie=1,Ee=41,Me=42,Ii=43;function j(e){return Array.from({length:Ii},(t,n)=>e(n))}const ge=e=>e===Ie||e===Ee||e===Me,Ei=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:j(e=>e===0?20:e===Ie?2:e===Ee?1.2:e===Me?.2:.1),destWeights:j(e=>e===0?0:e===Ie?.3:e===Ee?.4:e===Me?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:j(e=>ge(e)?.5:1),destWeights:j(e=>ge(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:j(e=>e===21?4:ge(e)?.25:1),destWeights:j(e=>e===21?5:ge(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:j(e=>e===0||e===Ie||e===21?.3:e===Ee?.4:e===Me?1.2:1),destWeights:j(e=>e===0?20:e===Ie?1:e===Ee?.6:e===Me?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:j(e=>ge(e)?1.5:.2),destWeights:j(e=>ge(e)?1.5:.2)}];function Mi(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let s=1;s<=nt;s++){const a=1+s,l=s*Le;e.push(`        StopConfig(id: StopId(${a.toString().padStart(2," ")}), name: "Floor ${s}",    position: ${l.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${Io.toFixed(1)}),`);for(let s=21;s<=20+Nt;s++){const a=1+s,l=s*Le;e.push(`        StopConfig(id: StopId(${a}), name: "Floor ${s}",   position: ${l.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:nt},(s,a)=>2+a),21],n=[21,...Array.from({length:Nt},(s,a)=>22+a)],o=[1,21,38,39,40],i=[1,0,41,42],r=s=>s.map(a=>`StopId(${a})`).join(", "),c=(s,a,l,f)=>`                ElevatorConfig(
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
)`}const Ai=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:nt},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*Le})),{name:"Sky Lobby",positionM:Io},...Array.from({length:Nt},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*Le})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],Pi={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:Ei,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:Ai,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...Ro,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:Mi()},gn=1e5,mn=4e5,yn=35786e3,xi=1e8,Li=4;function Xe(e){return Array.from({length:Li},(t,n)=>e(n))}const Bi={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:Xe(e=>e===0?6:1),destWeights:Xe(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:Xe(e=>e===0?0:e===1?1:e===2?3:5),destWeights:Xe(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:gn},{name:"LEO Transfer",positionM:mn},{name:"GEO Platform",positionM:yn}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:xi,showDayNight:!1},ron:`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${gn.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${mn.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${yn.toFixed(1)}),
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
)`},Fi=[{name:"Terminal",positionM:0},{name:"Concourse A",positionM:300},{name:"Concourse B",positionM:500},{name:"Concourse C",positionM:700},{name:"Concourse D",positionM:900},{name:"Concourse E",positionM:1100},{name:"Concourse F",positionM:1300},{name:"Terminal",positionM:0},{name:"Concourse F",positionM:200},{name:"Concourse E",positionM:400},{name:"Concourse D",positionM:600},{name:"Concourse C",positionM:800},{name:"Concourse B",positionM:1e3},{name:"Concourse A",positionM:1200}],$i=7,Di=1500,Oi=[{name:"Morning departure rush",durationSec:90,ridersPerMin:30,originWeights:[8,1,1,1,1,1,1,8,1,1,1,1,1,1],destWeights:[0,1,1,1,1,1,1,0,1,1,1,1,1,1]},{name:"Midday operations",durationSec:75,ridersPerMin:14,originWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1],destWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1]},{name:"Evening arrival surge",durationSec:90,ridersPerMin:30,originWeights:[1,3,3,3,3,3,3,1,3,3,3,3,3,3],destWeights:[10,0,0,0,0,0,0,10,0,0,0,0,0,0]},{name:"Late night",durationSec:45,ridersPerMin:4,originWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1],destWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1]}],Wi={id:"airport-apm",label:"Airport people mover",description:"Two counter-rotating loops connect the terminal to six concourses. Fixed-headway dispatch keeps trains on a predictable cadence; rider demand shifts from outbound (morning) to inbound (evening).",defaultStrategy:"scan",phases:Oi,seedSpawns:0,abandonAfterSec:240,featureHint:"Watch the fixed-headway schedule keep both loops in lockstep, even as demand shifts from outbound (morning) to inbound (evening). Trains can't overtake — that's the loop_lines no-overtake guarantee.",buildingName:"Airport People Mover",stops:Fi,defaultCars:4,elevatorDefaults:{maxSpeed:14,acceleration:1,deceleration:1,weightCapacity:9e3,doorOpenTicks:1500,doorTransitionTicks:180},tweakRanges:{cars:{min:4,max:4,step:1},maxSpeed:{min:8,max:20,step:1},weightCapacity:{min:4e3,max:2e4,step:1e3},doorCycleSec:{min:15,max:40,step:1}},passengerMeanIntervalTicks:60,passengerWeightRange:[55,100],airport:{outerStopCount:$i,circumferenceM:Di},ron:`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Airport People Mover",
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
)`},Be=[Pi,Bi,Wi,Ri];function G(e){const t=Be.find(o=>o.id===e);if(t)return t;const n=Be[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const Eo={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},O={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},Ni=["scan","look","nearest","etd","destination","rsr"],Hi=["adaptive","predictive","lobby","spread","none"];function Sn(e,t){return e!==null&&Ni.includes(e)?e:t}function bn(e,t){return e!==null&&Hi.includes(e)?e:t}const Ht=new Set;function qi(e){return Ht.add(e),()=>Ht.delete(e)}function H(e){const t=Mo(e);if(window.location.search!==t){window.history.replaceState(null,"",t);for(const n of Ht)n(e)}}function Gi(e,t){return e==="compare"||e==="quest"?e:t}function Mo(e){const t=new URLSearchParams;e.mode!==O.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==O.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=G(e.scenario).defaultReposition,o=n??O.repositionA,i=n??O.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of we){const c=e.overrides[r];c!==void 0&&Number.isFinite(c)&&t.set(Eo[r],Xi(c))}return`?${t.toString()}`}function Ui(e){const t=new URLSearchParams(e),n={};for(const o of we){const i=t.get(Eo[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:Gi(t.get("m"),O.mode),questStage:(t.get("qs")??"").trim()||O.questStage,scenario:t.get("s")??O.scenario,strategyA:Sn(t.get("a")??t.get("d"),O.strategyA),strategyB:Sn(t.get("b"),O.strategyB),repositionA:bn(t.get("pa"),O.repositionA),repositionB:bn(t.get("pb"),O.repositionB),compare:t.has("c")?t.get("c")==="1":O.compare,seed:(t.get("k")??"").trim()||O.seed,intensity:wn(t.get("i"),O.intensity),speed:wn(t.get("x"),O.speed),overrides:n}}function wn(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function Xi(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function Ao(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const ji=["scan","look","nearest","etd","destination","rsr"],be={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},Po={scan:"Sweep end-to-end, reverse at each end.",look:"Sweep until last call, then reverse.",nearest:"Assign each call to the closest car.",etd:"Assign by estimated time-to-destination.",destination:"Riders enter destination at the lobby; the group optimises.",rsr:"ETD penalised by queue length."},zi=["adaptive","predictive","lobby","spread","none"],Fe={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},xo={adaptive:"Switch by traffic mode; the default.",predictive:"Park near the most-active floor.",lobby:"Return idle cars to the lobby.",spread:"Fan idle cars across the shaft.",none:"Idle cars stay where they finished."},Vi="scenario-card inline-flex items-center gap-1.5 px-2 py-1 border-b-2 border-b-transparent text-content-tertiary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:text-content aria-pressed:text-content aria-pressed:border-b-accent max-md:flex-none max-md:snap-start",Yi="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function Ki(e){const t=document.createDocumentFragment();Be.forEach((n,o)=>{const i=te("button",Vi);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(te("span","",n.label),te("span",Yi,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function Lo(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}async function Bo(e,t,n,o,i){const r=G(n);r.airport!==void 0&&(e.permalink={...e.permalink,compare:!1});const s=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,a=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:s,repositionA:a,overrides:{}},H(e.permalink),i.renderPaneStrategyInfo(t.paneA,s),i.renderPaneRepositionInfo(t.paneA,a),i.refreshStrategyPopovers(),Lo(t,r.id),await o(),i.renderTweakPanel(),i.applyGating(r),U(t.toast,`${r.label} · ${be[s]}`)}function Qi(e){const t=G(e.scenario);e.scenario=t.id}const Ji=["layout","scenario-picker","controls-bar","cabin-legend"],Zi=["quest-pane"];function er(e){const t=e==="quest";for(const n of Ji){const o=document.getElementById(n);o&&o.classList.toggle("hidden",t)}for(const n of Zi){const o=document.getElementById(n);o&&(o.classList.toggle("hidden",!t),o.classList.toggle("flex",t))}}function tr(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const o of n){const i=o.dataset.mode===e;o.dataset.active=String(i),o.setAttribute("aria-pressed",String(i))}t.addEventListener("click",o=>{const i=o.target;if(!(i instanceof HTMLElement))return;const r=i.closest("button[data-mode]");if(!r)return;const c=r.dataset.mode;if(c!=="compare"&&c!=="quest"||c===e)return;const s=new URL(window.location.href);c==="compare"?(s.searchParams.delete("m"),s.searchParams.delete("qs")):s.searchParams.set("m",c),window.location.assign(s.toString())})}const nr="modulepreload",or=function(e,t){return new URL(e,t).href},vn={},ot=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let c=function(f){return Promise.all(f.map(p=>Promise.resolve(p).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const s=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),l=a?.nonce||a?.getAttribute("nonce");i=c(n.map(f=>{if(f=or(f,o),f in vn)return;vn[f]=!0;const p=f.endsWith(".css"),d=p?'[rel="stylesheet"]':"";if(!!o)for(let g=s.length-1;g>=0;g--){const m=s[g];if(m.href===f&&(!p||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=p?"stylesheet":nr,p||(h.as="script"),h.crossOrigin="",h.href=f,l&&h.setAttribute("nonce",l),document.head.appendChild(h),p)return new Promise((g,m)=>{h.addEventListener("load",g),h.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(c){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=c,window.dispatchEvent(s),!s.defaultPrevented)throw c}return i.then(c=>{for(const s of c||[])s.status==="rejected"&&r(s.reason);return t().catch(r)})};class Fo extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function ir(e){const t=(await ot(async()=>{const{default:i}=await import("./worker-DE_xV-Fq.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new rr(n);return await o.init(e),o}class rr{#e;#n=new Map;#t=1;#r=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#s),this.#e.addEventListener("error",this.#a),this.#e.addEventListener("messageerror",this.#a)}async init(t){await this.#i({kind:"init",id:this.#o(),payload:this.#d(t)})}async tick(t,n){const o=n?.wantVisuals??!1;return this.#i({kind:"tick",id:this.#o(),ticks:t,...o?{wantVisuals:!0}:{}})}async spawnRider(t,n,o,i){return this.#i({kind:"spawn-rider",id:this.#o(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#i({kind:"set-strategy",id:this.#o(),strategy:t})}async loadController(t,n){const o=n?.unlockedApi??null,i=n?.timeoutMs,r=this.#i({kind:"load-controller",id:this.#o(),source:t,unlockedApi:o});if(i===void 0){await r;return}r.catch(()=>{});let c;const s=new Promise((a,l)=>{c=setTimeout(()=>{l(new Error(`controller did not return within ${i}ms`))},i)});try{await Promise.race([r,s])}finally{c!==void 0&&clearTimeout(c)}}async reset(t){await this.#i({kind:"reset",id:this.#o(),payload:this.#d(t)})}dispose(){this.#r||(this.#r=!0,this.#e.removeEventListener("message",this.#s),this.#e.removeEventListener("error",this.#a),this.#e.removeEventListener("messageerror",this.#a),this.#e.terminate(),this.#l(new Error("WorkerSim disposed")))}#l(t){for(const n of this.#n.values())n.reject(t);this.#n.clear()}#o(){return this.#t++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#i(t){if(this.#r)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#n.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#a=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#r=!0,this.#e.terminate(),this.#l(new Error(o))};#s=t=>{const n=t.data,o=this.#n.get(n.id);if(o)switch(this.#n.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":{const i=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;o.reject(i!==null?new Fo(n.message,i):new Error(n.message));return}default:{const i=n.kind;o.reject(new Error(`WorkerSim: unknown reply kind "${String(i)}"`));return}}}}const ar=`// Quest curriculum — sim global declaration.
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
`,kn="quest-runtime";let kt=null,me=null;async function sr(){return kt||me||(me=(async()=>{await cr();const e=await ot(()=>import("./editor.main-D7jle2IW.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return kt=e,e})(),me.catch(()=>{me=null}),me)}async function cr(){const[{default:e},{default:t}]=await Promise.all([ot(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),ot(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}function lr(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(ar,"ts:filename/quest-sim-globals.d.ts"))}function dr(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function pr(e){const t=await sr();lr(t),dr(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o()});return{dispose:()=>{i.dispose()}}},insertAtCursor(o){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:o,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(o){const i=n.getModel();if(!i)return;const r=o.message.split(`
`)[0]??o.message;t.editor.setModelMarkers(i,kn,[{severity:8,message:r,startLineNumber:o.line,startColumn:o.column,endLineNumber:o.line,endColumn:o.column+1}]),n.revealLineInCenterIfOutsideViewport(o.line)},clearRuntimeMarker(){const o=n.getModel();o&&t.editor.setModelMarkers(o,kn,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const ur=`SimConfig(
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
)`,fr={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:ur,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},hr=`SimConfig(
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
)`,gr={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:hr,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},mr=`SimConfig(
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
)`,yr={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:mr,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},Sr=`SimConfig(
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
)`,br={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:Sr,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function $(e,t){const n=t.startTick??0,o=t.intervalTicks??30,i=t.destinations;if(i.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,c)=>{const s=i[c%i.length];return{origin:t.origin,destination:s,atTick:n+c*o,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const wr=`SimConfig(
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
)`,vr={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:wr,unlockedApi:["setStrategy"],seedRiders:[...$(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},kr=`SimConfig(
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
)`,_r=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,Cr={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:kr,unlockedApi:["setStrategyJs"],seedRiders:[...$(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...$(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:_r,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},Tr=`SimConfig(
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
)`,Rr={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:Tr,unlockedApi:["setStrategyJs"],seedRiders:[...$(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...$(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},Ir=`SimConfig(
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
)`,Er=`// Stage 8 — Event-Driven
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
`,Mr={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:Ir,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...$(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...$(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:Er,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},Ar=`SimConfig(
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
)`,Pr=`// Stage 9 — Take the Wheel
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
`,xr={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:Ar,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...$(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:Pr,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},Lr=`SimConfig(
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
)`,Br=`// Stage 10 — Patient Boarding
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
`,Fr={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:Lr,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...$(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:Br,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},$r=`SimConfig(
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
)`,Dr=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,Or={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:$r,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...$(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...$(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:Dr,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},Wr=`SimConfig(
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
)`,Nr=`// Stage 12 — Routes
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
`,Hr={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:Wr,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...$(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...$(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:Nr,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},qr=`SimConfig(
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
)`,Gr=`// Stage 13 — Transfer Points
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
`,Ur={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:qr,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...$(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...$(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...$(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:Gr,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},Xr=`SimConfig(
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
)`,jr=`// Stage 14 — Build a Floor
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
`,zr={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:Xr,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...$(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:jr,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},Vr=`SimConfig(
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
)`,Yr=`// Stage 15 — Sky Lobby
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
`,Kr={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:Vr,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...$(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...$(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:Yr,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},re=[fr,gr,yr,br,vr,Cr,Rr,Mr,xr,Fr,Or,Hr,Ur,zr,Kr];function Qr(e){return re.find(t=>t.id===e)}function Jr(e){const t=re.findIndex(n=>n.id===e);if(!(t<0))return re[t+1]}function x(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function st(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const it="quest:code:v1:",$o="quest:bestStars:v1:",Do=5e4;function De(){try{return globalThis.localStorage??null}catch{return null}}function _n(e){const t=De();if(!t)return null;try{const n=t.getItem(it+e);if(n===null)return null;if(n.length>Do){try{t.removeItem(it+e)}catch{}return null}return n}catch{return null}}function Cn(e,t){if(t.length>Do)return;const n=De();if(n)try{n.setItem(it+e,t)}catch{}}function Zr(e){const t=De();if(t)try{t.removeItem(it+e)}catch{}}function Oe(e){const t=De();if(!t)return 0;let n;try{n=t.getItem($o+e)}catch{return 0}if(n===null)return 0;const o=Number.parseInt(n,10);return!Number.isInteger(o)||o<0||o>3?0:o}function ea(e,t){const n=Oe(e);if(t<=n)return;const o=De();if(o)try{o.setItem($o+e,String(t))}catch{}}const ta={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},na=["basics","strategies","events-manual","topology"],Oo=3;function oa(){return{root:x("quest-grid","quest-grid"),progress:x("quest-grid-progress","quest-grid"),sections:x("quest-grid-sections","quest-grid")}}function _t(e,t){st(e.sections);let n=0;const o=re.length*Oo;for(const i of na){const r=re.filter(l=>l.section===i);if(r.length===0)continue;const c=document.createElement("section");c.dataset.section=i;const s=document.createElement("h2");s.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",s.textContent=ta[i],c.appendChild(s);const a=document.createElement("div");a.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const l of r){const f=Oe(l.id);n+=f,a.appendChild(ia(l,f,t))}c.appendChild(a),e.sections.appendChild(c)}e.progress.textContent=`${n} / ${o}`}function ia(e,t,n){const o=re.findIndex(p=>p.id===e.id),i=String(o+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const c=document.createElement("div");c.className="flex items-baseline justify-between gap-2";const s=document.createElement("span");s.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",s.textContent=i,c.appendChild(s);const a=document.createElement("span");a.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",a.classList.add(t>0?"text-accent":"text-content-disabled"),a.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),a.textContent="★".repeat(t)+"☆".repeat(Oo-t),c.appendChild(a),r.appendChild(c);const l=document.createElement("div");l.className="text-content text-[13px] font-semibold tracking-[-0.01em]",l.textContent=e.title,r.appendChild(l);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const ra=75;async function Tn(e,t,n,o){let i=n;for(;i<t.length;){const r=t[i];if(r===void 0||(r.atTick??0)>o)break;await e.spawnRider(r.origin,r.destination,r.weight??ra,r.patienceTicks),i+=1}return i}async function aa(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await ir({configRon:e.configRon,strategy:"scan"});try{const c=[...e.seedRiders].sort((d,u)=>(d.atTick??0)-(u.atTick??0));let s=await Tn(r,c,0,0);const a={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(a.timeoutMs=n.timeoutMs),await r.loadController(t,a);let l=null,f=0;const p=n.onSnapshot!==void 0;for(;f<o;){const d=o-f,u=Math.min(i,d),h=await r.tick(u,p?{wantVisuals:!0}:void 0);l=h.metrics,f=h.tick,s=await Tn(r,c,s,f);const g=Rn(l,f);if(n.onProgress)try{n.onProgress(g)}catch{}if(n.onSnapshot&&h.snapshot)try{n.onSnapshot(h.snapshot)}catch{}if(e.passFn(g))return In(e,g,!0)}if(l===null)throw new Error("runStage: maxTicks must be positive");return In(e,Rn(l,f),!1)}finally{r.dispose()}}function Rn(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function In(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}function sa(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const o=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(o)&&o>0&&n.push(`${o.toFixed(1)}s avg wait`),n.join(" · ")}const Wo=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(Wo.map(e=>[e.name,e]));function No(e){const t=new Set(e);return Wo.filter(n=>t.has(n.name))}function ca(){return{root:x("quest-api-panel","api-panel")}}function En(e,t){st(e.root);const n=No(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const o=document.createElement("p");o.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",o.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(o);const i=document.createElement("ul");i.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const c=document.createElement("li");c.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const s=document.createElement("code");s.className="block font-mono text-[12px] text-content",s.textContent=r.signature,c.appendChild(s);const a=document.createElement("p");a.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",a.textContent=r.description,c.appendChild(a),i.appendChild(c)}e.root.appendChild(i)}function la(){return{root:x("quest-hints","hints-drawer"),count:x("quest-hints-count","hints-drawer"),list:x("quest-hints-list","hints-drawer")}}const Mn="quest-hints-more";function An(e,t){st(e.list);for(const o of e.root.querySelectorAll(`.${Mn}`))o.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((o,i)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=o,i>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const o=document.createElement("button");o.type="button",o.className=`${Mn} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,o.textContent=`Show ${n-1} more`,o.addEventListener("click",()=>{for(const i of e.list.querySelectorAll("li[hidden]"))i.hidden=!1;o.remove()}),e.root.appendChild(o)}e.root.removeAttribute("open")}function da(e,t){return{activeStage:e,currentView:t,runLoop:{active:!1}}}function pa(e,t){e.activeStage=t}function Ct(e,t){e.currentView=t}function Pn(e){e.runLoop.active=!1}function Ce(e,t){return e.currentView==="stage"&&e.activeStage.id===t.id}function ua(){return{root:x("quest-reference","reference-panel"),status:x("quest-reference-status","reference-panel"),code:x("quest-reference-code","reference-panel")}}function Tt(e,t,n={}){const o=t.referenceSolution,i=Oe(t.id);if(!o||i===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=i===3?"(mastered)":"(unlocked)",e.code.textContent=o,n.collapse!==!1&&e.root.removeAttribute("open")}function fa(){const e="results-modal";return{root:x("quest-results-modal",e),title:x("quest-results-title",e),stars:x("quest-results-stars",e),detail:x("quest-results-detail",e),close:x("quest-results-close",e),retry:x("quest-results-retry",e),next:x("quest-results-next",e)}}function ha(e,t,n,o,i){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=ga(t.grade,t.passed,o),e.retry.onclick=()=>{Rt(e),n()},e.close.onclick=()=>{Rt(e)};const r=i;r?(e.next.hidden=!1,e.next.onclick=()=>{Rt(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function Rt(e){e.root.classList.remove("show")}function ga(e,t,n){const o=`tick ${e.endTick}`,i=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${i} · finished by ${o}.`;if(n)try{const r=n(e);if(r)return`${i}. ${r}`}catch{}return`${i}. The pass condition wasn't met within the run budget.`}const ma={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function xn(e){return ma[e]??`sim.${e}();`}function ya(){return{root:x("quest-snippets","snippet-picker")}}function Ln(e,t,n){st(e.root);const o=No(t.unlockedApi);if(o.length!==0)for(const i of o){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=i.name,r.title=`Insert: ${xn(i.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(xn(i.name))}),e.root.appendChild(r)}}const It=new Map;function en(e){const t=It.get(e);if(t!==void 0)return t;const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return It.set(e,null),null;const o=parseInt(n[1],16),i=[o>>16&255,o>>8&255,o&255];return It.set(e,i),i}function qt(e,t){const n=en(e);if(n===null)return e;const[o,i,r]=n,c=s=>t>=0?Math.round(s+(255-s)*t):Math.round(s*(1+t));return`rgb(${c(o)}, ${c(i)}, ${c(r)})`}function Ho(e,t){const n=en(e);if(n===null)return e;const[o,i,r]=n;return`rgba(${o}, ${i}, ${r}, ${t})`}function N(e,t){if(en(e)!==null&&e.startsWith("#")){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Ho(e,t)}function qo(e){let r=e;for(let s=0;s<3;s++){const a=1-r,l=3*a*a*r*.2+3*a*r*r*.2+r*r*r,f=3*a*a*.2+6*a*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(l-e)/f,r=Math.max(0,Math.min(1,r))}const c=1-r;return 3*c*c*r*.6+3*c*r*r*1+r*r*r}const ct={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},Sa="#2a2a35",Go="#a1a1aa",q='"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',ba=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],wa=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],va="rgba(8, 10, 14, 0.55)",ka="#3a3a45",_a=[1,1,.5,.42],Ca=["LOW","HIGH","VIP","SERVICE"],Ta="#e6c56b",Ra="#9bd4c4",Ia=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],Ea="#a1a1aa",Ma="#4a4a55",Aa="#f59e0b",Uo="#7dd3fc",Xo="#fda4af",oe="#fafafa",jo="#8b8c92",zo="rgba(250, 250, 250, 0.95)",Pa=700,Gt=3,xa=.05,La=480,Ut=4,je=6,Bn=12,Ba=.15,Fa=140,Fn=.3,$n=6,$a=3,Da=new Set(["loading","door-opening","door-closing"]);function Oa(e,t,n,o,i,r,c,s="#7dd3fc"){e.save();const a=n/2,l=o/2,f=Math.min(n,o),p=f>=La,d=n*.88,u=Math.min(o*.6,n*.42),h=Math.min(d,u)*.32,g=Math.max(28,f*.06),m=Math.max(5,f*.012),w=N(s,.9),_=N(s,.35),C=N(s,.55),S=N(s,.22),b={cx:a,cy:l,w:d,h:u,r:h,color:w,dimColor:_,thickness:m},k={cx:a,cy:l,w:d-g*2,h:u-g*2,r:Math.max(0,h-g),color:C,dimColor:S,thickness:m},y={cx:a,cy:l,w:(b.w+k.w)/2,h:(b.h+k.h)/2,r:(b.r+k.r)/2};Dn(e,b),Dn(e,k),Wn(e,b,!1),Wn(e,k,!0);const T=t.stops.slice(0,i.outerStopCount),E=t.stops.slice(i.outerStopCount),R=[...new Set(t.cars.map(L=>L.line))].sort((L,D)=>L-D),I=R[0],M=R[1],A=[],B=[];for(const L of t.cars)L.line===I?A.push(L):L.line===M&&B.push(L);Wa(e,T,E,y,b,i,r,p,s),Nn(e,A,b,i.circumferenceM,!1),Nn(e,B,k,i.circumferenceM,!0),c&&c.size>0&&(Hn(e,A,b,i.circumferenceM,!1,c,s),Hn(e,B,k,i.circumferenceM,!0,c,s)),e.restore()}function tn(e){return 2*Math.max(0,e.w-2*e.r)+2*Math.max(0,e.h-2*e.r)+2*Math.PI*e.r}function $e(e,t){const n=(t%1+1)%1,o=tn(e);let i=n*o;const r=e.w,c=e.h,s=e.r,a=Math.max(0,r-2*s),l=Math.max(0,c-2*s),f=Math.PI*s/2,p=e.cx-r/2,d=e.cx+r/2,u=e.cy-c/2,h=e.cy+c/2;if(i<a)return{x:p+s+i,y:u,tangent:0};if(i-=a,i<f){const m=-Math.PI/2+i/f*(Math.PI/2);return{x:d-s+Math.cos(m)*s,y:u+s+Math.sin(m)*s,tangent:m+Math.PI/2}}if(i-=f,i<l)return{x:d,y:u+s+i,tangent:Math.PI/2};if(i-=l,i<f){const m=0+i/f*(Math.PI/2);return{x:d-s+Math.cos(m)*s,y:h-s+Math.sin(m)*s,tangent:m+Math.PI/2}}if(i-=f,i<a)return{x:d-s-i,y:h,tangent:Math.PI};if(i-=a,i<f){const m=Math.PI/2+i/f*(Math.PI/2);return{x:p+s+Math.cos(m)*s,y:h-s+Math.sin(m)*s,tangent:m+Math.PI/2}}if(i-=f,i<l)return{x:p,y:h-s-i,tangent:-Math.PI/2};if(i-=l,f<=0)return{x:p+s,y:u,tangent:0};const g=Math.PI+i/f*(Math.PI/2);return{x:p+s+Math.cos(g)*s,y:u+s+Math.sin(g)*s,tangent:g+Math.PI/2}}function nn(e,t){const{cx:n,cy:o,w:i,h:r,r:c}=t,s=n-i/2,a=o-r/2,l=n+i/2,f=o+r/2;e.beginPath(),e.moveTo(s+c,a),e.lineTo(l-c,a),e.arcTo(l,a,l,a+c,c),e.lineTo(l,f-c),e.arcTo(l,f,l-c,f,c),e.lineTo(s+c,f),e.arcTo(s,f,s,f-c,c),e.lineTo(s,a+c),e.arcTo(s,a,s+c,a,c),e.closePath()}function Dn(e,t){nn(e,t),e.strokeStyle=t.dimColor,e.lineWidth=t.thickness,e.lineCap="butt",e.lineJoin="round",e.stroke()}function Wa(e,t,n,o,i,r,c,s,a){const l=Math.max(3,o.h*.018),f=Go,p=N(a,.45+Math.max(0,Math.min(1,c))*.45),d=11;e.font=`500 ${d}px ${q}`,e.textAlign="center",e.textBaseline="middle";const u=Math.min(t.length,n.length);for(let h=0;h<u;h++){const g=t[h],m=n[h];if(!g||!m)continue;const w=g.y/r.circumferenceM,_=$e(o,w),C=$e(i,w);e.beginPath(),e.arc(_.x,_.y,l,0,Math.PI*2),e.fillStyle=p,e.fill();const S=C.x-o.cx,b=C.y-o.cy,k=Math.max(1,Math.hypot(S,b)),y=d*1.5,T=C.x+S/k*y,E=C.y+b/k*y;e.fillStyle=f;const R=s?g.name:Ga(g.name);e.fillText(R,T,E),On(e,_,o,g.waiting,!0,a),On(e,_,o,m.waiting,!1,a)}}function On(e,t,n,o,i,r){if(o<=0)return;const c=t.x-n.cx,s=t.y-n.cy,a=Math.max(1,Math.hypot(c,s)),l=(i?1:-1)*(c/a),f=(i?1:-1)*(s/a),p=Math.max(2.5,n.h*.012),d=p*2.4,u=n.h*.06;e.fillStyle=N(r,i?.85:.6),e.textAlign="center",e.textBaseline="middle";const h=Math.min(o,je);for(let g=0;g<h;g++){const m=g===je-1&&o>je,w=u+d*g,_=t.x+l*w,C=t.y+f*w;m?(e.font=`${Math.round(p*3)}px ${q}`,e.fillText(`+${o-je+1}`,_,C)):(e.beginPath(),e.arc(_,C,p,0,Math.PI*2),e.fill())}}function Wn(e,t,n){const r=performance.now()/1e3*Ba*(n?-1:1)%1,c=Math.max(4,t.thickness*.85);e.save(),e.fillStyle=t.dimColor,e.globalAlpha=.7;for(let s=0;s<Bn;s++){const a=(r+s/Bn+1)%1,l=$e(t,a);Na(e,l,c,n)}e.restore()}function Na(e,t,n,o){e.save(),e.translate(t.x,t.y),e.rotate(t.tangent+(o?Math.PI:0)),e.beginPath(),e.moveTo(-n*.5,-n*.4),e.lineTo(n*.4,0),e.lineTo(-n*.5,n*.4),e.closePath(),e.fill(),e.restore()}function Nn(e,t,n,o,i){if(t.length===0)return;const r=tn(n),s=Math.min(80,r*.06)/Ut,a=n.thickness*1.4,l=s*.18,f=s-l;for(const p of t){const d=p.y/o,u=i?1-d:d,h=Da.has(p.phase);for(let g=0;g<Ut;g++){const w=-(i?-1:1)*(g*s+s/2),_=((u+w/r)%1+1)%1,C=$e(n,_);Ha(e,C,f,a,n.color,g===0,h&&g===0)}}}function Ha(e,t,n,o,i,r,c){e.save(),e.translate(t.x,t.y),e.rotate(t.tangent);const s=n/2,a=o/2,l=Math.min(s,a)*.4;if(c){const f=.55+Math.sin(performance.now()/280)*.15;e.save(),e.shadowColor=oe,e.shadowBlur=a*(2.6+f),e.fillStyle=oe,e.beginPath(),e.arc(s-l,0,a*.5,0,Math.PI*2),e.fill(),e.restore()}nn(e,{cx:0,cy:0,w:n,h:o,r:l}),e.fillStyle=i,e.fill(),r&&(e.beginPath(),e.arc(s-l,0,a*.45,0,Math.PI*2),e.fillStyle=oe,e.fill()),e.restore()}function Hn(e,t,n,o,i,r,c){const s=performance.now(),a=tn(n),f=Math.min(80,a*.06)/Ut;for(const p of t){const d=r.get(p.id);if(!d)continue;const u=Math.max(1,d.expiresAt-d.bornAt),h=d.expiresAt-s;if(h<=0)continue;const g=h>u*Fn?1:Math.max(0,h/(u*Fn)),m=Math.max(0,s-d.bornAt),w=Math.min(1,m/Fa),_=g*w;if(_<=0)continue;const C=p.y/o,b=-(i?-1:1)*(f/2),k=(((i?1-C:C)+b/a)%1+1)%1,y=$e(n,k);qa(e,y,n,d,_,c)}}function qa(e,t,n,o,i,r){e.font=`500 11px ${q}`,e.textBaseline="middle",e.textAlign="left";const s=e.measureText(o.glyph).width,a=e.measureText(o.text).width,l=3,f=s+l+a+$n*2,p=11+$a*2+2,d=-Math.sin(t.tangent),u=Math.cos(t.tangent),h=n.thickness*1.6+p*.55,g=t.x-d*h,m=t.y-u*h;e.save(),e.globalAlpha=i,e.shadowColor=N(r,.5),e.shadowBlur=8,nn(e,{cx:g,cy:m,w:f,h:p,r:p*.4}),e.fillStyle="rgba(8, 10, 14, 0.85)",e.fill(),e.shadowBlur=0,e.strokeStyle=N(r,.45),e.lineWidth=1,e.stroke();const w=g-f/2+$n;e.fillStyle=N(r,.75),e.fillText(o.glyph,w,m),e.fillStyle=oe,e.fillText(o.text,w+s+l,m),e.restore()}function Ga(e){return e==="Terminal"?"T":e.startsWith("Concourse ")?e.slice(10,11).toUpperCase():e.slice(0,1).toUpperCase()}const qn=["standard","briefcase","bag","short","tall"];function K(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,qn[n%qn.length]??"standard"}function Ua(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function on(e,t,n,o,i,r="standard"){const c=Ua(r,o),a=n-.5,l=a-c.bodyH,f=l-c.neckGap-c.headR,p=c.bodyH*.08,d=a-c.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-c.shoulderW/2,l+p),e.lineTo(t-c.shoulderW/2+p,l),e.lineTo(t+c.shoulderW/2-p,l),e.lineTo(t+c.shoulderW/2,l+p),e.lineTo(t+c.waistW/2,d),e.lineTo(t+c.footW/2,a),e.lineTo(t-c.footW/2,a),e.lineTo(t-c.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,c.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const u=Math.max(1.6,c.headR*.9),h=t+c.waistW/2+u*.1,g=a-u-.5;e.fillRect(h,g,u,u);const m=u*.55;e.fillRect(h+(u-m)/2,g-1,m,1)}else if(r==="bag"){const u=Math.max(1.3,c.headR*.9),h=t-c.shoulderW/2-u*.35,g=l+c.bodyH*.35;e.beginPath(),e.arc(h,g,u,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(h+u*.2,g-u*.8),e.lineTo(t+c.shoulderW/2-p,l+.5),e.stroke()}else if(r==="tall"){const u=c.headR*2.1,h=Math.max(1,c.headR*.45);e.fillRect(t-u/2,f-c.headR-h+.4,u,h)}}function Xa(e,t,n,o,i,r,c,s,a){const f=Math.max(1,Math.floor((i-14)/s.figureStride)),p=Math.min(r,f),d=-2;for(let u=0;u<p;u++){const h=t+d+o*u*s.figureStride,g=u+0,m=K(a,g);on(e,h,n,s.figureHeadR,c,m)}if(r>p){e.fillStyle=jo,e.font=`${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const u=t+d+o*p*s.figureStride;e.fillText(`+${r-p}`,u,n-1)}}function ie(e,t,n,o,i,r){const c=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,c);return}e.moveTo(t+c,n),e.lineTo(t+o-c,n),e.quadraticCurveTo(t+o,n,t+o,n+c),e.lineTo(t+o,n+i-c),e.quadraticCurveTo(t+o,n+i,t+o-c,n+i),e.lineTo(t+c,n+i),e.quadraticCurveTo(t,n+i,t,n+i-c),e.lineTo(t,n+c),e.quadraticCurveTo(t,n,t+c,n),e.closePath()}function ja(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const c=i+r+1>>1;e.measureText(t.slice(0,c)+o).width<=n?i=c:r=c-1}return i===0?o:t.slice(0,i)+o}function za(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function Va(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px ${q}`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,c=Math.max(n.fontSmall+.5,i);for(const s of t){const a=s.top-3,l=a>i&&a-n.fontSmall<r;e.fillStyle=s.color,e.fillText(s.text,s.cx,l?c:a)}}function Ya(e,t,n,o,i,r,c,s,a){e.font=`500 ${o.fontMain.toFixed(0)}px ${q}`,e.textBaseline="middle";const l=o.padX,f=o.padX+o.labelW,p=r-o.padX,d=o.shaftInnerW/2,u=Math.min(o.shaftInnerW*1.8,(p-f)/2);for(let h=0;h<t.length;h++){const g=t[h];if(g===void 0)continue;const m=n(g.y),w=t[h+1],_=w!==void 0?n(w.y):s;if(e.strokeStyle=Sa,e.lineWidth=a?2:1,e.beginPath(),a)for(const S of i)e.moveTo(S-u,m+.5),e.lineTo(S+u,m+.5);else{let S=f;for(const b of i){const k=b-d,y=b+d;k>S&&(e.moveTo(S,m+.5),e.lineTo(k,m+.5)),S=y}S<p&&(e.moveTo(S,m+.5),e.lineTo(p,m+.5))}e.stroke();for(let S=0;S<i.length;S++){const b=i[S];if(b===void 0)continue;const k=c.has(S,g.entity_id);e.strokeStyle=k?Aa:Ma,e.lineWidth=k?1.4:1,e.beginPath(),e.moveTo(b-d-2,m+.5),e.lineTo(b-d,m+.5),e.moveTo(b+d,m+.5),e.lineTo(b+d+2,m+.5),e.stroke()}const C=a?m:(m+_)/2;e.fillStyle=Go,e.textAlign="right",e.fillText(ja(e,g.name,o.labelW-4),l+o.labelW-4,C)}}function Ka(e,t,n,o,i,r){for(const c of t.stops){if(c.waiting_by_line.length===0)continue;const s=r.get(c.entity_id);if(s===void 0||s.size===0)continue;const a=n(c.y),l=c.waiting_up>=c.waiting_down?Uo:Xo;for(const f of c.waiting_by_line){if(f.count===0)continue;const p=s.get(f.line);if(p===void 0)continue;const d=i.get(p);if(d===void 0)continue;const u=d.end-d.start;u<=o.figureStride||Xa(e,d.end-2,a,-1,u,f.count,l,o,c.entity_id)}}}function Qa(e,t,n,o,i,r,c,s,a,l=!1){const f=o*.22,p=(i-4)/10.5,d=Math.max(1.2,Math.min(s.figureHeadR,f,p)),u=s.figureStride*(d/s.figureHeadR),h=3,g=2,m=o-h*2,_=Math.max(1,Math.floor((m-16)/u)),C=Math.min(r,_),S=C*u,b=t-S/2+u/2,k=n-g;for(let y=0;y<C;y++){const T=a?.[y]??K(0,y);on(e,b+y*u,k,d,c,T)}if(r>C){const y=`+${r-C}`,T=Math.max(8,s.fontSmall-1);e.font=`700 ${T.toFixed(1)}px ${q}`,e.textAlign="right",e.textBaseline="middle";const E=e.measureText(y).width,R=3,I=1.5,M=Math.ceil(E+R*2),A=Math.ceil(T+I*2),B=t+o/2-2,L=n-i+2,D=B-M;e.fillStyle="rgba(15, 15, 18, 0.85)",ie(e,D,L,M,A,2),e.fill(),e.fillStyle="#fafafa",e.fillText(y,B-R,L+A/2)}if(l){const y=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${y.toFixed(0)}px ${q}`,e.textAlign="center",e.textBaseline="middle";const T=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,T+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,T)}}const Ja=Array.from({length:Gt},(e,t)=>Ho(ct.moving,.18*(1-t/Gt))),Gn=Object.fromEntries(Object.entries(ct).map(([e,t])=>[e,qt(t,.18)]));function Za(e,t,n,o,i,r,c){const s=Math.max(2,r.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const l=c.get(a.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const p=n.get(a.id);if(p===void 0)continue;const d=i(f.y)-r.carH/2,u=i(a.y)-r.carH/2;Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(p,u),e.lineTo(p,d),e.stroke(),e.fillStyle=zo,e.beginPath(),e.arc(p,d,s,0,Math.PI*2),e.fill())}}function es(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const c=o/2;for(let s=1;s<=Gt;s++){const a=r(t.y-t.v*xa*s);e.fillStyle=Ja[s-1]??"rgba(107, 107, 117, 0.06)",e.fillRect(n-c,a-i,o,i)}}function ts(e,t,n,o,i,r,c,s,a){const l=c(t.y),f=l-i,p=o/2,d=ct[t.phase]??"#6b6b75";e.fillStyle=d,e.fillRect(n-p,f,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-p+.5,f+.5,o-1,i-1),e.strokeStyle=Gn[t.phase]??Gn.unknown,e.beginPath(),e.moveTo(n-p+1,f+1.5),e.lineTo(n+p-1,f+1.5),e.stroke();const u=t.capacity>0&&t.load>=t.capacity*.95;if((t.riders>0||u)&&Qa(e,n,l,o,i,t.riders,r,s,a,u),t.phase==="door-opening"||t.phase==="loading"||t.phase==="door-closing"){const h=Math.max(o*.2,Math.min(o*.4,8));e.strokeStyle="rgba(250, 250, 250, 0.85)",e.lineWidth=1.5,e.beginPath(),e.moveTo(n-h/2,l-.5),e.lineTo(n+h/2,l-.5),e.stroke()}}const Un=6,ns=3,Et=4,Se=3,ye=2.5,J=2,os=12,is="rgba(37, 37, 48, 0.80)",rs="#ECECEE",Xn=3,jn=.3,as=140,zn=.85;function ss(e,t,n,o,i,r,c,s){const a=c.fontSmall+.5;e.font=`500 ${a}px ${q}`,e.textBaseline="middle",Vn(e,"-0.1px");const l=performance.now(),f=N(t,.45),p=N(t,.5),d=N(t,.75),u=[];for(const[g,m]of o){const w=n.get(g);if(w===void 0)continue;const _=i.get(g);if(_===void 0)continue;const C=r(w.y),S=C-c.carH,b=Math.max(1,m.expiresAt-m.bornAt),k=m.expiresAt-l,y=k>b*jn?1:Math.max(0,k/(b*jn)),T=Math.max(0,l-m.bornAt),E=Math.min(1,T/as),R=y*E;if(R<=0)continue;const I=e.measureText(m.glyph).width,M=I+Xn+e.measureText(m.text).width+Un*2,A=a+ns*2+2,B=S-J-ye-A,L=C+J+ye+A>s,D=B<2&&!L?"below":"above",ce=D==="above"?S-J-ye-A:C+J+ye;let le=_-M/2;const V=2,ve=s-M-2;le<V&&(le=V),le>ve&&(le=ve),u.push({bubble:m,glyphW:I,alpha:R,cx:_,carTop:S,carBottom:C,bubbleW:M,bubbleH:A,side:D,bx:le,by:ce,entrance:E})}const h=(g,m)=>!(g.bx+g.bubbleW<=m.bx||m.bx+m.bubbleW<=g.bx||g.by+g.bubbleH<=m.by||m.by+m.bubbleH<=g.by);for(let g=1;g<u.length;g++){const m=u[g];if(m===void 0)continue;let w=!1;for(let k=0;k<g;k++){const y=u[k];if(y!==void 0&&h(m,y)){w=!0;break}}if(!w)continue;const _=m.side==="above"?"below":"above",C=_==="above"?m.carTop-J-ye-m.bubbleH:m.carBottom+J+ye,S={...m,side:_,by:C};let b=!0;for(let k=0;k<g;k++){const y=u[k];if(y!==void 0&&h(S,y)){b=!1;break}}b&&(u[g]=S)}for(const g of u){const{bubble:m,glyphW:w,alpha:_,cx:C,carTop:S,carBottom:b,bubbleW:k,bubbleH:y,side:T,bx:E,by:R,entrance:I}=g,M=T==="above"?S-J:b+J,A=Math.min(Math.max(C,E+Et+Se/2),E+k-Et-Se/2),B=qo(I),L=zn+(1-zn)*B;e.save(),e.globalAlpha=_,e.translate(A,M),e.scale(L,L),e.translate(-A,-M),cs(e,E,R,k,y,Et,T,A,M),e.shadowColor=p,e.shadowBlur=os,e.fillStyle=is,e.fill(),e.shadowBlur=0,e.shadowColor="transparent",e.strokeStyle=f,e.lineWidth=1,e.stroke();const D=R+y/2,ce=E+Un;e.textAlign="left",e.fillStyle=d,e.fillText(m.glyph,ce,D),e.fillStyle=rs,e.fillText(m.text,ce+w+Xn,D),e.restore()}Vn(e,"0px")}function cs(e,t,n,o,i,r,c,s,a){const l=Math.min(r,o/2,i/2);e.beginPath(),e.moveTo(t+l,n),c==="below"&&(e.lineTo(s-Se/2,n),e.lineTo(s,a),e.lineTo(s+Se/2,n)),e.lineTo(t+o-l,n),e.arcTo(t+o,n,t+o,n+l,l),e.lineTo(t+o,n+i-l),e.arcTo(t+o,n+i,t+o-l,n+i,l),c==="above"&&(e.lineTo(s+Se/2,n+i),e.lineTo(s,a),e.lineTo(s-Se/2,n+i)),e.lineTo(t+l,n+i),e.arcTo(t,n+i,t,n+i-l,l),e.lineTo(t,n+l),e.arcTo(t,n,t+l,n,l),e.closePath()}function Vn(e,t){e.letterSpacing=t}function Yn(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function ls(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:lt(o)})}return t}function lt(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function Vo(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function Kn(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function ds(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function ps(e,t,n,o,i,r){const c=Math.abs(t-e);if(c<.001)return 0;const s=Math.abs(n);if(s*s/(2*r)>=c)return s>0?s/r:0;const l=Math.max(0,(o-s)/i),f=s*l+.5*i*l*l,p=o/r,d=o*o/(2*r);if(f+d>=c){const h=(2*i*r*c+r*s*s)/(i+r),g=Math.sqrt(Math.max(h,s*s));return(g-s)/i+g/r}const u=c-f-d;return l+u/Math.max(o,.001)+p}const Yo={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},rt={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function us(e,t,n,o,i,r){const c=i/2,s=o-r/2,a=ct[t.phase]??"#6b6b75",l=e.createLinearGradient(n,s,n,s+r);l.addColorStop(0,qt(a,.14)),l.addColorStop(1,qt(a,-.18)),e.fillStyle=l,ie(e,n-c,s,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-c+2,s+r*.36,i-4,Math.max(1.5,r*.1))}function fs(e,t,n,o,i){if(t.length===0)return;const r=7,c=4,s=i.fontSmall+2,a=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px ${q}`;const l=(d,u)=>{const h=[d.carName,lt(d.altitudeM),Vo(d.velocity),`${Yo[d.phase]} · ${d.layer}`];let g=0;for(const S of h)g=Math.max(g,e.measureText(S).width);const m=g+r*2,w=h.length*s+c*2;let _=u==="right"?d.cx+a:d.cx-a-m;_=Math.max(2,Math.min(o-m-2,_));const C=d.cy-w/2;return{hud:d,lines:h,bx:_,by:C,bubbleW:m,bubbleH:w,side:u}},f=(d,u)=>!(d.bx+d.bubbleW<=u.bx||u.bx+u.bubbleW<=d.bx||d.by+d.bubbleH<=u.by||u.by+u.bubbleH<=d.by),p=[];t.forEach((d,u)=>{let h=l(d,u%2===0?"right":"left");if(p.some(g=>f(h,g))){const g=l(d,h.side==="right"?"left":"right");if(p.every(m=>!f(g,m)))h=g;else{const m=Math.max(...p.map(w=>w.by+w.bubbleH));h={...h,by:m+4}}}p.push(h)});for(const d of p){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",ie(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=rt[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,ie(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let u=0;u<d.lines.length;u++){const h=d.by+c+s*u+s/2,g=d.lines[u]??"";e.fillStyle=u===0||u===3?rt[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(g,d.bx+r,h)}e.restore()}}function hs(e,t,n,o,i,r){if(t.length===0)return;const c=18,s=10,a=6,l=5,f=r.fontSmall+2.5,d=a*2+5*f,u=c+a+(d+l)*t.length;e.save();const h=e.createLinearGradient(n,i,n,i+u);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,ie(e,n,i,o,u,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,ie(e,n,i,o,u,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px ${q}`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+s,i+c/2+2);let g=i+c+a;for(const m of t){e.fillStyle="rgba(15, 15, 18, 0.55)",ie(e,n+6,g,o-12,d,5),e.fill(),e.fillStyle=rt[m.phase],e.fillRect(n+6,g,2,d);const w=n+s+4,_=n+o-s;let C=g+a+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px ${q}`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(m.carName,w,C),e.textAlign="right",e.fillStyle=rt[m.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px ${q}`,e.fillText(Yo[m.phase].toUpperCase(),_,C);const S=m.etaSeconds!==void 0&&Number.isFinite(m.etaSeconds)?ds(m.etaSeconds):"—",b=[["Altitude",lt(m.altitudeM)],["Velocity",Vo(m.velocity)],["Dest",m.destinationName??"—"],["ETA",S]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px ${q}`;for(const[k,y]of b)C+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(k,w,C),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(y,_,C);g+=d+l}e.restore()}function gs(e,t,n,o,i,r,c,s,a,l,f){l.length=e.cars.length;for(let p=0;p<e.cars.length;p++){const d=e.cars[p];d!==void 0&&(l[p]=d.id)}l.sort((p,d)=>p-d),f.clear();for(let p=0;p<l.length;p++){const d=l[p];d!==void 0&&f.set(d,p)}a.length=e.cars.length;for(let p=0;p<e.cars.length;p++){const d=e.cars[p];if(d===void 0)continue;const u=d.y,h=d.target!==void 0?s.get(d.target):void 0,g=h!==void 0?e.stops[h]:void 0,m=g?ps(u,g.y,d.v,i,r,c):void 0,w=f.get(d.id)??0,_=a[p];_===void 0?a[p]={cx:n,cy:t.toScreenAlt(u),altitudeM:u,velocity:d.v,phase:Kn(d.v,o.get(d.id)??0,i),layer:Yn(u),carName:`Climber ${String.fromCharCode(65+w)}`,destinationName:g?.name,etaSeconds:m}:(_.cx=n,_.cy=t.toScreenAlt(u),_.altitudeM=u,_.velocity=d.v,_.phase=Kn(d.v,o.get(d.id)??0,i),_.layer=Yn(u),_.carName=`Climber ${String.fromCharCode(65+w)}`,_.destinationName=g?.name,_.etaSeconds=m)}return a}const Te=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function Mt(e,t,n){return e+(t-e)*n}function At(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round(Mt(o>>16&255,i>>16&255,n)),c=Math.round(Mt(o>>8&255,i>>8&255,n)),s=Math.round(Mt(o&255,i&255,n));return`#${(r<<16|c<<8|s).toString(16).padStart(6,"0")}`}function ms(e,t){let n=0;for(;n<Te.length-1;n++){const l=Te[n+1];if(l===void 0||e<=l[0])break}const o=Te[n],i=Te[Math.min(n+1,Te.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],c=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),s=At(o[1],i[1],c),a=At(o[2],i[2],c);return At(s,a,t)}const ys=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function Ss(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),c=Math.log10(1+t.axisMaxM/1e3),s=[0,.05,.15,.35,.6,1];for(const l of s){const f=1e3*(10**(l*c)-1);r.addColorStop(l,ms(f,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const l of ys){const f=t.axisMaxM*l.altFrac;if(f<8e4)continue;const p=t.toScreenAlt(f),d=n+l.xFrac*(o-n),u=l.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${u.toFixed(3)})`,e.beginPath(),e.arc(d,p,l.size,0,Math.PI*2),e.fill()}e.restore();const a=ls(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const l of a){const f=t.toScreenAlt(l.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(o,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(l.label,n+4,f-6))}}function bs(e,t,n,o){const r=o-28,c=e.createLinearGradient(0,r,0,o);c.addColorStop(0,"rgba(0,0,0,0)"),c.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),c.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=c,e.fillRect(t,r,n-t,28),e.strokeStyle=N("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function ws(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function vs(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const c=-Math.PI/2+r*Math.PI/3,s=t+Math.cos(c)*i,a=n+Math.sin(c)*i;r===0?e.moveTo(s,a):e.lineTo(s,a)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function ks(e,t,n,o,i,r,c){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const s of t.stops){const a=n.toScreenAlt(s.y);if(a<n.shaftTop||a>n.shaftBottom)continue;const l=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-l/2,a),e.lineTo(o-5,a),e.moveTo(o+5,a),e.lineTo(o+l/2,a),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-l/2,a),e.lineTo(o-5,a-5),e.moveTo(o+l/2,a),e.lineTo(o+5,a-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(s.name,r+c-4,a-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(lt(s.y),r+c-4,a+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function _s(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const c=Math.log10(1+Math.max(0,r)/1e3),s=i<=0?0:Math.max(0,Math.min(1,c/i));return t-s*(t-e)}}}function Cs(e,t,n,o,i,r,c){const s=Math.max(2,c.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const l=r.get(a.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const p=i.get(a.id);if(p===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,p),e.lineTo(o,d),e.stroke(),e.fillStyle=zo,e.beginPath(),e.arc(o,d,s,0,Math.PI*2),e.fill())}}function Ts(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function Rs(e,t,n,o,i,r,c){c.firstDrawAt===0&&(c.firstDrawAt=performance.now());const s=(performance.now()-c.firstDrawAt)/1e3,a=r.showDayNight?Ts(s):.5,l=n>=520&&o>=360,f=Math.min(120,Math.max(72,n*.16)),p=l?Math.min(220,Math.max(160,n*.24)):0,d=l?14:0,u=i.padX,h=u+f+4,g=n-i.padX-p-d,m=(h+g)/2,w=12,_=i.padTop+24,C=o-i.padBottom-18,S=_s(_,C,r);Ss(e,S,h+w,g-w,a),bs(e,h+w,g-w,C),ws(e,m,S),vs(e,m,S.shaftTop,i),ks(e,t,S,m,i,u,f);const b=Math.max(20,Math.min(34,g-h-8)),k=Math.max(16,Math.min(26,b*.72));i.carH=k,i.carW=b;const y=c.carCenters,T=c.stopIdxById;y.clear(),T.clear();for(let R=0;R<t.stops.length;R++){const I=t.stops[R];I!==void 0&&T.set(I.entity_id,R)}for(const R of t.cars)y.set(R.id,S.toScreenAlt(R.y));Cs(e,t,S,m,y,T,i);for(const R of t.cars){const I=y.get(R.id);I!==void 0&&us(e,R,m,I,b,k)}const E=gs(t,S,m,c.prevVelocity,c.maxSpeed,c.acceleration,c.deceleration,T,c.hudBuf,c.idSortBuf,c.idRankBuf);E.sort((R,I)=>I.altitudeM-R.altitudeM),fs(e,E,b,n-p-d,i),l&&hs(e,E,n-i.padX-p,p,_,i);for(const R of t.cars)c.prevVelocity.set(R.id,R.v);if(c.prevVelocity.size>t.cars.length)for(const R of c.prevVelocity.keys())y.has(R)||c.prevVelocity.delete(R)}const Is=1e6;function Ko(e,t){return e*Is+t}function Es(e){return{has:(t,n)=>e.has(Ko(t,n))}}function Ms(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function Qn(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}const As=.8,Ps=2;function xs(e,t,n){const o=performance.now();for(const i of t){const r=o-i.bornAt;if(r<0)continue;const c=Math.min(1,Math.max(0,r/i.duration)),s=qo(c),a=i.startX+(i.endX-i.startX)*s,l=Math.sin(s*Math.PI*Ps*2)*As,f=i.floorY+l,p=Ls(i.kind,c,s);if(p<=0)continue;const d=e.globalAlpha;e.globalAlpha=p,on(e,a,f,n.figureHeadR,i.color,i.variant),e.globalAlpha=d}}function Ls(e,t,n){return e==="board"?t<.75?1:Math.max(0,1-(t-.75)/.25):e==="alight"?t<.2?t/.2:t>.6?Math.max(0,1-(t-.6)/.4):1:.7*(1-n)**1.2}function Bs(e,t){const{count:n,enablePairs:o,halfPairW:i,now:r,stagger:c,duration:s,originX:a,endX:l,floorY:f,color:p}=t;let d=0,u=0;for(;d<n;){const h=o&&d+1<n?2:1;for(let g=0;g<h;g++){const m=h===2?g===0?-i:i:0;e.push({kind:"board",bornAt:r+u*c,duration:s,startX:a+m,endX:l+m,floorY:f,color:p,variant:K(t.stopId,d+g+t.dirOffset)})}d+=h,u++}}function Fs(e,t){const{count:n,now:o,stagger:i,duration:r,startX:c,endX:s,floorY:a,color:l,stopId:f}=t;for(let p=0;p<n;p++)e.push({kind:"abandon",bornAt:o+p*i,duration:r,startX:c,endX:s,floorY:a,color:l,variant:K(f,2e4+p)})}function $s(e,t){const{count:n,enablePairs:o,halfPairW:i,now:r,stagger:c,duration:s,startX:a,endX:l,floorY:f,color:p}=t;let d=0,u=0;for(;d<n;){const h=o&&d+1<n?2:1;for(let g=0;g<h;g++){const m=d+g,w=h===2?g===0?-i:i:0;e.push({kind:"alight",bornAt:r+u*c,duration:s,startX:a+w,endX:l+w,floorY:f,color:p,variant:t.variants[t.variants.length-1-m]??K(t.carId,m)})}d+=h,u++}}class Qo{#e;#n;#t=window.devicePixelRatio||1;#r;#l=null;#o=-1;#d=new Map;#i;#a=new Map;#s=new Map;#c=[];#p=null;#u=null;#y=new Map;#E=new Map;#M=new Map;#A=[];#P=[];#x=new Map;#S=1;#b=1;#w=1;#h=0;#f=new Map;#v=new Map;#L=new Map;#g=new Map;#k=[];#_=new Map;#C=new Set;#B=Es(this.#C);#F=[];#$=[];#D=[];#O=new Map;#T=new Map;#W=new Map;#R=new Map;#N=[];#H=[];#q=[];#G=new Map;constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#n=o,this.#i=n,this.#m(),this.#r=()=>{this.#m()},window.addEventListener("resize",this.#r)}dispose(){window.removeEventListener("resize",this.#r)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#I()}setAirportConfig(t){this.#u=t,this.#I()}#I(){this.#y.clear(),this.#h=0,this.#f.clear()}setTetherPhysics(t,n,o){Number.isFinite(t)&&t>0&&(this.#S=t),Number.isFinite(n)&&n>0&&(this.#b=n),Number.isFinite(o)&&o>0&&(this.#w=o)}pushAssignment(t,n,o){let i=this.#f.get(t);i===void 0&&(i=new Map,this.#f.set(t,i)),i.set(o,n)}#m(){this.#t=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#t,i=n*this.#t;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#n.setTransform(this.#t,0,0,this.#t,0,0)}#U(t,n){const o=this.#k.pop();return o!==void 0?(o.start=t,o.end=n,o):{start:t,end:n}}#X(){for(const t of this.#g.values())this.#k.push(t);this.#g.clear()}draw(t,n,o,i=0){this.#m();const{clientWidth:r,clientHeight:c}=this.#e,s=this.#n;if(s.clearRect(0,0,r,c),t.stops.length===0||r===0||c===0)return;r!==this.#o&&(this.#l=Ms(r),this.#o=r);const a=this.#l;if(a===null)return;if(this.#u!==null){Oa(s,t,r,c,this.#u,i,o,this.#i);return}if(this.#p!==null){this.#j(t,r,c,a,n,o,this.#p);return}const l=t.stops.length===2,f=this.#v;f.clear();for(const v of t.cars)f.set(v.id,v);const p=this.#q;p.length=t.stops.length;for(let v=0;v<t.stops.length;v++)p[v]=t.stops[v];p.sort((v,P)=>v.y-P.y);const d=this.#N;d.length=p.length;for(let v=0;v<p.length;v++){const P=p[v];d[v]=P===void 0?0:P.y}const u=t.stops[0];if(u===void 0)return;let h=u.y,g=u.y;for(let v=1;v<t.stops.length;v++){const P=t.stops[v];if(P===void 0)continue;const F=P.y;F<h&&(h=F),F>g&&(g=F)}const m=d.length>=3?(d.at(-1)??0)-(d.at(-2)??0):1,_=h-1,C=g+m,S=Math.max(C-_,1e-4),b=l?18:0;let k,y;if(l)k=a.padTop+b,y=c-a.padBottom-b;else{let v=1/0;for(let Z=1;Z<d.length;Z++){const Ne=d[Z],He=d[Z-1];if(Ne===void 0||He===void 0)continue;const ke=Ne-He;ke>0&&ke<v&&(v=ke)}Number.isFinite(v)||(v=1);const F=48/v,X=Math.max(0,c-a.padTop-a.padBottom)/S,Y=Math.min(X,F),ue=S*Y;y=c-a.padBottom,k=y-ue}const T=v=>y-(v-_)/S*(y-k),E=this.#d;E.forEach(v=>v.length=0);for(const v of t.cars){const P=E.get(v.line);P?P.push(v):E.set(v.line,[v])}const R=this.#H;R.length=0;for(const v of E.keys())R.push(v);R.sort((v,P)=>v-P);let I=0;for(const v of R)I+=E.get(v)?.length??0;const M=Math.max(0,r-2*a.padX-a.labelW),A=a.figureStride*2,B=a.shaftSpacing*Math.max(I-1,0),D=(M-B)/Math.max(I,1),ce=l?34:a.maxShaftInnerW,V=Math.max(a.minShaftInnerW,Math.min(ce,D*.55)),ve=Math.max(0,Math.min(D-V,A+a.figureStride*4)),cn=Math.max(14,V-6);let de=1/0;if(t.stops.length>=2)for(let v=1;v<d.length;v++){const P=d[v-1],F=d[v];if(P===void 0||F===void 0)continue;const W=T(P)-T(F);W>0&&W<de&&(de=W)}const pi=T(g)-2,ui=Number.isFinite(de)?de:a.carH,fi=l?a.carH:ui,hi=Math.max(14,Math.min(fi,pi));if(!l&&Number.isFinite(de)){const v=Math.max(1.5,Math.min(de*.067,4)),P=a.figureStride*(v/a.figureHeadR);a.figureHeadR=v,a.figureStride=P}a.shaftInnerW=V,a.carW=cn,a.carH=hi;const gi=a.padX+a.labelW,mi=V+ve,We=this.#F;We.length=0;const pe=this.#L;pe.clear(),this.#X();const ut=this.#g;let ln=0;for(const v of R){const P=E.get(v)??[];for(const F of P){const W=gi+ln*(mi+a.shaftSpacing),X=W,Y=W+ve,ue=Y+V/2;We.push(ue),pe.set(F.id,ue),ut.set(F.id,this.#U(X,Y)),ln++}}const ft=this.#_;ft.clear();for(let v=0;v<t.stops.length;v++){const P=t.stops[v];P!==void 0&&ft.set(P.entity_id,v)}const dn=this.#C;dn.clear();{let v=0;for(const P of R){const F=E.get(P)??[];for(const W of F){if(W.phase==="loading"||W.phase==="door-opening"||W.phase==="door-closing"){const X=Qn(t.stops,W.y);X!==void 0&&X.dist<.5&&dn.add(Ko(v,X.stop.entity_id))}v++}}}const ht=this.#O,gt=this.#T,mt=this.#W,yt=this.#R;ht.clear(),gt.clear(),mt.clear(),yt.clear();const St=this.#$;St.length=0;const bt=this.#D;bt.length=0;let pn=0;for(let v=0;v<R.length;v++){const P=R[v];if(P===void 0)continue;const F=E.get(P)??[],W=ba[v]??va,X=wa[v]??ka,Y=_a[v]??1,ue=Ia[v]??Ea,Z=Math.max(14,V*Y),Ne=Math.max(10,cn*Y),He=Math.max(10,a.carH),ke=v===2?Ta:v===3?Ra:oe;let qe=1/0,wt=-1/0,Ge=1/0;for(const Q of F){ht.set(Q.id,Z),gt.set(Q.id,Ne),mt.set(Q.id,He),yt.set(Q.id,ke);const fe=We[pn];if(fe===void 0)continue;const un=Number.isFinite(Q.min_served_y)&&Number.isFinite(Q.max_served_y),vt=un?Math.max(k,T(Q.max_served_y)-a.carH-2):k,yi=un?Math.min(y,T(Q.min_served_y)+2):y;St.push({cx:fe,top:vt,bottom:yi,fill:W,frame:X,width:Z}),fe<qe&&(qe=fe),fe>wt&&(wt=fe),vt<Ge&&(Ge=vt),pn++}R.length>1&&Number.isFinite(qe)&&Number.isFinite(Ge)&&bt.push({cx:(qe+wt)/2,top:Ge,text:Ca[v]??`Line ${v+1}`,color:ue})}za(s,St),Va(s,bt,a),Ya(s,p,T,a,We,r,this.#B,k,l),Ka(s,t,T,a,ut,this.#f),Za(s,t,pe,ht,T,a,ft);for(const v of t.cars){const P=pe.get(v.id);if(P===void 0)continue;const F=gt.get(v.id)??a.carW,W=mt.get(v.id)??a.carH,X=yt.get(v.id)??oe,Y=this.#a.get(v.id);es(s,v,P,F,W,T),ts(s,v,P,F,W,X,T,a,Y?.roster)}this.#z(t,pe,ut,T,a,n),xs(s,this.#c,a),o&&o.size>0&&ss(s,this.#i,f,o,pe,T,a,r)}#j(t,n,o,i,r,c,s){const a={prevVelocity:this.#y,maxSpeed:this.#S,acceleration:this.#b,deceleration:this.#w,firstDrawAt:this.#h,carCenters:this.#E,stopIdxById:this.#M,hudBuf:this.#A,idSortBuf:this.#P,idRankBuf:this.#x};Rs(this.#n,t,n,o,i,s,a),this.#h=a.firstDrawAt}#z(t,n,o,i,r,c){const s=performance.now(),a=Math.max(1,c),l=Pa/a,f=80/a,p=Math.max(1.5,Math.min(2.5,r.figureStride*.45)),d=this.#G;d.clear();for(const u of t.cars){const h=this.#a.get(u.id),g=n.get(u.id),m=Qn(t.stops,u.y),w=u.phase==="loading"&&m!==void 0&&m.dist<.5?m.stop:void 0,_=w!==void 0&&w.waiting_up>=w.waiting_down,C=_?0:1e4;if(h&&g!==void 0&&w!==void 0){const b=u.riders-h.riders;if(b>0&&d.set(w.entity_id,(d.get(w.entity_id)??0)+b),b!==0){const k=i(w.y),y=this.#T.get(u.id)??r.carW,T=y>=r.figureStride*3,E=Math.min(Math.abs(b),6);if(b>0){const R=o.get(u.id),I=R!==void 0?R.end-2:g-20,M=_?Uo:Xo,A=this.#f.get(w.entity_id);A!==void 0&&(A.delete(u.line),A.size===0&&this.#f.delete(w.entity_id)),Bs(this.#c,{count:E,enablePairs:T,halfPairW:p,now:s,stagger:f,duration:l,originX:I,endX:g,floorY:k,color:M,stopId:w.entity_id,dirOffset:C})}else{const R=this.#R.get(u.id)??oe,I=g+y/2+14,M=h.roster.slice(Math.max(0,h.roster.length-E));$s(this.#c,{count:E,enablePairs:T,halfPairW:p,now:s,stagger:f,duration:l,startX:g,endX:I,floorY:k,color:R,variants:M,carId:u.id})}}}let S;if(h){const b=u.riders-h.riders;if(b===0)S=h.roster;else if(S=h.roster.slice(),b>0&&w!==void 0)for(let k=0;k<b;k++)S.push(K(w.entity_id,k+C));else if(b>0)for(let k=0;k<b;k++)S.push(K(u.id,S.length+k));else S.splice(S.length+b,-b)}else{S=[];for(let b=0;b<u.riders;b++)S.push(K(u.id,b))}for(;S.length>u.riders;)S.pop();for(;S.length<u.riders;)S.push(K(u.id,S.length));this.#a.set(u.id,{riders:u.riders,roster:S})}for(const u of t.stops){const h=u.waiting_up+u.waiting_down,g=this.#s.get(u.entity_id);if(g){const m=g.waiting-h,w=d.get(u.entity_id)??0,_=Math.max(0,m-w);_>0&&Fs(this.#c,{count:Math.min(_,4),now:s,stagger:f,duration:l*2.2,startX:r.padX+r.labelW+20,endX:r.padX+r.labelW-16,floorY:i(u.y),color:jo,stopId:u.entity_id})}this.#s.set(u.entity_id,{waiting:h})}{let u=0;for(let h=0;h<this.#c.length;h++){const g=this.#c[h];g!==void 0&&s-g.bornAt<=g.duration&&(this.#c[u++]=g)}this.#c.length=u}if(this.#a.size>t.cars.length)for(const u of this.#a.keys())this.#v.has(u)||this.#a.delete(u);if(this.#s.size>t.stops.length)for(const u of this.#s.keys())this.#_.has(u)||this.#s.delete(u)}}const Ds="#f59e0b",Os=3;function Ws(){const e="quest-pane";return{root:x("quest-pane",e),gridView:x("quest-grid",e),stageView:x("quest-stage-view",e),backBtn:x("quest-back-to-grid",e),title:x("quest-stage-title",e),brief:x("quest-stage-brief",e),stageStars:x("quest-stage-stars",e),editorHost:x("quest-editor",e),runBtn:x("quest-run",e),resetBtn:x("quest-reset",e),result:x("quest-result",e),progress:x("quest-progress",e),shaft:x("quest-shaft",e),shaftIdle:x("quest-shaft-idle",e)}}function Pt(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=Oe(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(Os-n)}function xt(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function Ns(e){const t=Ws(),n=y=>{const T=Qr(y);if(T)return T;const E=re[0];if(!E)throw new Error("quest-pane: stage registry is empty");return E},o=da(n(e.initialStageId),"grid");Pt(t,o.activeStage);const i=ca();En(i,o.activeStage);const r=la();An(r,o.activeStage);const c=ua();Tt(c,o.activeStage);const s=oa(),a=new Qo(t.shaft,Ds);t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const l=await pr({container:t.editorHost,initialValue:_n(o.activeStage.id)??o.activeStage.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const f=fa(),p=300;let d=null,u=!1;const h=()=>{u||(d!==null&&clearTimeout(d),d=setTimeout(()=>{Cn(o.activeStage.id,l.getValue()),d=null},p))},g=()=>{d!==null&&(clearTimeout(d),d=null,Cn(o.activeStage.id,l.getValue()))},m=y=>{u=!0;try{l.setValue(y)}finally{u=!1}};l.onDidChange(()=>{h()});const w=ya();Ln(w,o.activeStage,l);const _=()=>{Pn(o),t.shaftIdle.hidden=!1;const y=t.shaft.getContext("2d");y&&y.clearRect(0,0,t.shaft.width,t.shaft.height)},C=(y,{fromGrid:T})=>{g(),pa(o,y),Pt(t,y),En(i,y),An(r,y),Tt(c,y),Ln(w,y,l),m(_n(y.id)??y.starterCode),l.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",_(),xt(t,"stage"),Ct(o,"stage"),e.onStageChange?.(y.id)},S=()=>{g(),_(),t.result.textContent="",t.progress.textContent="",xt(t,"grid"),Ct(o,"grid"),_t(s,y=>{C(n(y),{fromGrid:!0})}),e.onBackToGrid?.()};_t(s,y=>{C(n(y),{fromGrid:!0})});const b=e.landOn??"grid";xt(t,b),Ct(o,b);const k=async()=>{const y=o.activeStage;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",l.clearRuntimeMarker();let T=null,E=0;o.runLoop.active=!0;const R=()=>{o.runLoop.active&&(T!==null&&a.draw(T,1),requestAnimationFrame(R))};t.shaftIdle.hidden=!0,requestAnimationFrame(R);try{const I=await aa(y,l.getValue(),{timeoutMs:1e3,onProgress:M=>{Ce(o,y)&&(t.progress.textContent=sa(M))},onSnapshot:M=>{T=M,E+=1}});if(I.passed){const M=Oe(y.id);I.stars>M&&(ea(y.id,I.stars),_t(s,A=>{C(n(A),{fromGrid:!0})}),Ce(o,y)&&Pt(t,o.activeStage)),Ce(o,y)&&Tt(c,o.activeStage,{collapse:!1})}if(Ce(o,y)){t.result.textContent="",t.progress.textContent="";const M=I.passed?Jr(y.id):void 0,A=M?()=>{C(M,{fromGrid:!1})}:void 0;ha(f,I,()=>void k(),y.failHint,A)}}catch(I){if(Ce(o,y)){const M=I instanceof Error?I.message:String(I);t.result.textContent=`Error: ${M}`,t.progress.textContent="",I instanceof Fo&&I.location!==null&&l.setRuntimeMarker({line:I.location.line,column:I.location.column,message:M})}}finally{if(t.runBtn.disabled=!1,Pn(o),E===0){const I=t.shaft.getContext("2d");I&&I.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{k()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${o.activeStage.title} to its starter code?`)&&(Zr(o.activeStage.id),m(o.activeStage.starterCode),l.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{S()}),{handles:t,editor:l}}let Lt=null;async function Jo(){if(!Lt){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;Lt=import(e).then(async n=>(await n.default(t),n))}return Lt}class rn{#e;#n;constructor(t){this.#e=t,this.#n=t.dt()}static async create(t,n,o){const i=await Jo();return new rn(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#n}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class Zo{#e;#n=0;#t=[];#r=0;#l=0;#o=0;#d=1;#i=0;constructor(t){this.#e=Hs(BigInt(t>>>0))}setPhases(t){this.#t=t,this.#r=t.reduce((o,i)=>o+i.durationSec,0);let n=0;for(const o of t)o.ridersPerMin>n&&(n=o.ridersPerMin);this.#l=n,this.#o=0,this.#n=0}setIntensity(t){this.#d=Math.max(0,t)}setPatienceTicks(t){this.#i=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#t.length===0)return[];const o=t.stops.filter(s=>s.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#t[this.currentPhaseIndex()];if(!r)return[];this.#n+=r.ridersPerMin*this.#d/60*i,this.#o=(this.#o+i)%(this.#r||1);const c=[];for(;this.#n>=1;)this.#n-=1,c.push(this.#a(o,r));return c}currentPhaseIndex(){if(this.#t.length===0)return 0;let t=this.#o;for(const[n,o]of this.#t.entries())if(t-=o.durationSec,t<0)return n;return this.#t.length-1}currentPhaseLabel(){return this.#t[this.currentPhaseIndex()]?.name??""}currentPhaseRatio(){if(this.#t.length===0)return 0;const t=this.#t[this.currentPhaseIndex()];return t&&this.#l>0?t.ridersPerMin/this.#l:0}phaseProgress(){return this.#r<=0?0:Math.min(1,this.#o/this.#r)}progressInPhase(){if(this.#t.length===0)return 0;let t=this.#o;for(const n of this.#t){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#t}#a(t,n){const o=this.#s(t.length,n.originWeights);let i=this.#s(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],c=t[i];if(!r||!c)throw new Error("stop index out of bounds");const s=50+this.#u()*50;return{originStopId:r.stop_id,destStopId:c.stop_id,weight:s,...this.#i>0?{patienceTicks:this.#i}:{}}}#s(t,n){if(!n||n.length!==t)return this.#p(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#p(t);let i=this.#u()*o;for(const[r,c]of n.entries())if(i-=Math.max(0,c),i<0)return r;return t-1}#c(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#p(t){return Number(this.#c()%BigInt(t))}#u(){return Number(this.#c()>>11n)/2**53}}function Hs(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const qs="#7dd3fc",Gs="#fda4af";async function Jn(e,t,n,o,i){const r=ki(o,i),c=await rn.create(r,t,n),s=new Qo(e.canvas,e.accent);if(s.setTetherConfig(o.tether??null),s.setAirportConfig(o.airport??null),o.tether){const l=Zt(o,i);s.setTetherPhysics(l.maxSpeed,l.acceleration,l.deceleration)}const a=e.canvas.parentElement;if(a){const l=o.stops.length,p=o.tether?640:o.airport!==void 0?Math.max(180,Math.min(380,window.innerWidth*.3)):Math.max(200,l*16);a.style.setProperty("--shaft-min-h",`${p}px`)}return{strategy:t,sim:c,renderer:s,scenario:o,accent:e.accent,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function Re(e){e?.sim.dispose(),e?.renderer.dispose()}function ei(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const Us=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],Xs=120,Xt=new WeakMap;function js(e,t){const n=e.scenario.airport,o=Xt.get(e.metricsEl);if(!n){o?.root.remove(),Xt.delete(e.metricsEl);return}const i=o??Ys(e.metricsEl);i.outerDot.style.backgroundColor=N(e.accent,.9),i.innerDot.style.backgroundColor=N(e.accent,.55);const{outerTrains:r,outerWaiting:c,innerTrains:s,innerWaiting:a}=zs(t,n.outerStopCount);i.outerTrains.textContent=String(r),i.outerWaiting.textContent=String(c),i.innerTrains.textContent=String(s),i.innerWaiting.textContent=String(a)}function zs(e,t){const n=[...new Set(e.cars.map(l=>l.line))].sort((l,f)=>l-f),o=n[0],i=n[1];let r=0,c=0;for(const l of e.cars)Vs(l)&&(l.line===o?r++:l.line===i&&c++);let s=0,a=0;for(let l=0;l<e.stops.length;l++){const f=e.stops[l];if(!f)continue;l<t?s+=f.waiting:a+=f.waiting}return{outerTrains:r,outerWaiting:s,innerTrains:c,innerWaiting:a}}function Vs(e){return e.phase!=="idle"}function Ys(e){const t=document.createElement("div");t.className="airport-loop-panel flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-[11px] text-content-secondary tabular-nums border-b border-stroke-subtle";const n=Zn("Outer"),o=Zn("Inner");t.append(n.row,o.row),e.insertAdjacentElement("afterend",t);const i={root:t,outerTrains:n.trains,outerWaiting:n.waiting,innerTrains:o.trains,innerWaiting:o.waiting,outerDot:n.dot,innerDot:o.dot};return Xt.set(e,i),i}function Zn(e){const t=document.createElement("div");t.className="flex items-center gap-2";const n=document.createElement("span");n.className="inline-block w-2 h-2 rounded-full shrink-0";const o=document.createElement("span");o.className="uppercase tracking-wider text-content-tertiary",o.textContent=e;const i=document.createElement("span");i.className="font-medium",i.textContent="0";const r=document.createElement("span");r.className="text-content-tertiary",r.textContent="trains";const c=document.createElement("span");c.className="text-content-tertiary",c.textContent="·";const s=document.createElement("span");s.className="font-medium",s.textContent="0";const a=document.createElement("span");return a.className="text-content-tertiary",a.textContent="waiting",t.append(n,o,i,r,c,s,a),{row:t,trains:i,waiting:s,dot:n}}function eo(e,t,n,o){const i=e.sim.metrics();e.latestMetrics=i;for(const c of Us){const s=e.metricHistory[c];s.push(i[c]),s.length>Xs&&s.shift()}const r=performance.now();for(const[c,s]of e.bubbles)s.expiresAt<=r&&e.bubbles.delete(c);e.renderer.draw(t,n,e.bubbles,o),js(e,t)}const Ks={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},Qs=1e3;function Js(e,t,n){const o=performance.now(),i=new Map;for(const c of n.stops)i.set(c.entity_id,c.name);const r=c=>i.get(c)??`stop #${c}`;for(const c of t){const s=Zs(c,r);if(s===null)continue;const a=c.elevator;if(a===void 0)continue;const l=Ks[c.kind]??Qs;e.bubbles.set(a,{glyph:s.glyph,text:s.text,bornAt:o,expiresAt:o+l})}}function Zs(e,t){switch(e.kind){case"elevator-assigned":return{glyph:"›",text:`To ${t(e.stop)}`};case"elevator-repositioning":return{glyph:"↻",text:`Reposition to ${t(e.stop)}`};case"elevator-arrived":return{glyph:"●",text:`At ${t(e.stop)}`};case"door-opened":return{glyph:"◌",text:"Doors open"};case"rider-boarded":return{glyph:"+",text:"Boarding"};case"rider-exited":return{glyph:"↓",text:`Off at ${t(e.stop)}`};default:return null}}const ec={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function to(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=ec[t],e.modeEl.title=t)}function tc(){const e=s=>{const a=document.getElementById(s);if(!a)throw new Error(`missing element #${s}`);return a},t=s=>document.getElementById(s),n=(s,a)=>({root:e(`pane-${s}`),canvas:e(`shaft-${s}`),name:e(`name-${s}`),mode:e(`mode-${s}`),desc:e(`desc-${s}`),metrics:e(`metrics-${s}`),trigger:e(`strategy-trigger-${s}`),popover:e(`strategy-popover-${s}`),repoTrigger:e(`repo-trigger-${s}`),repoName:e(`repo-name-${s}`),repoPopover:e(`repo-popover-${s}`),accent:a,which:s}),o=s=>{const a=document.querySelector(`.tweak-row[data-key="${s}"]`);if(!a)throw new Error(`missing tweak row for ${s}`);const l=p=>{const d=a.querySelector(p);if(!d)throw new Error(`missing ${p} in tweak row ${s}`);return d},f=p=>a.querySelector(p);return{root:a,value:l(".tweak-value"),defaultV:l(".tweak-default-v"),dec:l(".tweak-dec"),inc:l(".tweak-inc"),reset:l(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},i={};for(const s of we)i[s]=o(s);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",qs),paneB:n("b",Gs)};Ki(r);const c=document.getElementById("controls-bar");return c&&new ResizeObserver(([a])=>{if(!a)return;const l=Math.ceil(a.borderBoxSize[0]?.blockSize??a.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${l}px`)}).observe(c),r}function ti(e,t,n,o,i,r,c,s,a){const l=document.createDocumentFragment();for(const f of t){const p=document.createElement("button");p.type="button",p.className="strategy-option",p.setAttribute("role","menuitemradio"),p.setAttribute("aria-checked",f===r?"true":"false"),p.dataset[i]=f;const d=document.createElement("span");d.className="strategy-option-name";const u=document.createElement("span");if(u.className="strategy-option-label",u.textContent=n[f],d.appendChild(u),c&&f===c){const g=document.createElement("span");g.className="strategy-option-sibling",g.textContent=`also in ${s}`,d.appendChild(g)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=o[f],p.append(d,h),p.addEventListener("click",()=>{a(f)}),l.appendChild(p)}e.replaceChildren(l)}function ae(e,t){const n=Fe[t],o=xo[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function no(e,t,n,o,i){ti(e.repoPopover,zi,Fe,xo,"reposition",t,n,o,i)}function Ae(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;no(t.paneA,o,r?i:null,"B",c=>void io(e,t,"a",c,n)),no(t.paneB,i,r?o:null,"A",c=>void io(e,t,"b",c,n))}function jt(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function ni(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function zt(e){jt(e.paneA,!1),jt(e.paneB,!1)}function dt(e){Yt(e),zt(e)}function oo(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;dt(t),r&&(Ae(e,t,o),jt(n,!0))})}async function io(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){zt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},ae(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},ae(t.paneB,o)),H(e.permalink),Ae(e,t,i),zt(t),await i(),U(t.toast,`${n==="a"?"A":"B"} park: ${Fe[o]}`)}function nc(e){document.addEventListener("click",t=>{if(!oi(e)&&!ni(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;dt(e)}})}function se(e,t){const n=be[t],o=Po[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function ro(e,t,n,o,i){ti(e.popover,ji,be,Po,"strategy",t,n,o,i)}function Pe(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;ro(t.paneA,o,r?i:null,"B",c=>void so(e,t,"a",c,n)),ro(t.paneB,i,r?o:null,"A",c=>void so(e,t,"b",c,n))}function Vt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function oi(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function Yt(e){Vt(e.paneA,!1),Vt(e.paneB,!1)}function ao(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;dt(t),r&&(Pe(e,t,o),Vt(n,!0))})}async function so(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){Yt(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},se(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},se(t.paneB,o)),H(e.permalink),Pe(e,t,i),Yt(t),await i(),U(t.toast,`${n==="a"?"A":"B"}: ${be[o]}`)}function co(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function oc(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function pt(e,t,n){let o=!1;for(const i of we){const r=n.tweakRows[i],c=e.tweakRanges[i],s=ne(e,i,t),a=Qt(e,i),l=Jt(e,i,s);l&&(o=!0),r.value.textContent=co(i,s),r.defaultV.textContent=co(i,a),r.dec.disabled=s<=c.min+1e-9,r.inc.disabled=s>=c.max-1e-9,r.root.dataset.overridden=String(l),r.reset.hidden=!l;const f=Math.max(c.max-c.min,1e-9),p=Math.max(0,Math.min(1,(s-c.min)/f)),d=Math.max(0,Math.min(1,(a-c.min)/f));r.trackFill&&(r.trackFill.style.width=`${(p*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(p*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function ii(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function an(e,t,n,o){const i=Zt(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},c=[e.paneA,e.paneB].filter(a=>a!==null),s=c.every(a=>a.sim.applyPhysicsLive(r));if(s)for(const a of c)a.renderer?.setTetherPhysics(i.maxSpeed,i.acceleration,i.deceleration);pt(n,e.permalink.overrides,t),s||o()}function ic(e,t,n){return Math.min(n,Math.max(t,e))}function rc(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function ze(e,t,n,o,i){const r=G(e.permalink.scenario),c=r.tweakRanges[n],s=ne(r,n,e.permalink.overrides),a=ic(s+o*c.step,c.min,c.max),l=rc(a,c.min,c.step);cc(e,t,n,l,i)}function ac(e,t,n,o){const i=G(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},H(e.permalink),n==="cars"?(o(),U(t.toast,"Cars reset")):(an(e,t,i,o),U(t.toast,`${oc(n)} reset`))}async function sc(e,t,n){const o=G(e.permalink.scenario),i=Jt(o,"cars",ne(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},H(e.permalink),i?await n():an(e,t,o,n),U(t.toast,"Parameters reset")}function cc(e,t,n,o,i){const r=G(e.permalink.scenario),c={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:_o(r,c)},H(e.permalink),n==="cars"?i():an(e,t,r,i)}function lc(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function dc(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var Ve={exports:{}},pc=Ve.exports,lo;function uc(){return lo||(lo=1,(function(e){(function(t,n,o){function i(a){var l=this,f=s();l.next=function(){var p=2091639*l.s0+l.c*23283064365386963e-26;return l.s0=l.s1,l.s1=l.s2,l.s2=p-(l.c=p|0)},l.c=1,l.s0=f(" "),l.s1=f(" "),l.s2=f(" "),l.s0-=f(a),l.s0<0&&(l.s0+=1),l.s1-=f(a),l.s1<0&&(l.s1+=1),l.s2-=f(a),l.s2<0&&(l.s2+=1),f=null}function r(a,l){return l.c=a.c,l.s0=a.s0,l.s1=a.s1,l.s2=a.s2,l}function c(a,l){var f=new i(a),p=l&&l.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,p&&(typeof p=="object"&&r(p,f),d.state=function(){return r(f,{})}),d}function s(){var a=4022871197,l=function(f){f=String(f);for(var p=0;p<f.length;p++){a+=f.charCodeAt(p);var d=.02519603282416938*a;a=d>>>0,d-=a,d*=a,a=d>>>0,d-=a,a+=d*4294967296}return(a>>>0)*23283064365386963e-26};return l}n&&n.exports?n.exports=c:this.alea=c})(pc,e)})(Ve)),Ve.exports}var Ye={exports:{}},fc=Ye.exports,po;function hc(){return po||(po=1,(function(e){(function(t,n,o){function i(s){var a=this,l="";a.x=0,a.y=0,a.z=0,a.w=0,a.next=function(){var p=a.x^a.x<<11;return a.x=a.y,a.y=a.z,a.z=a.w,a.w^=a.w>>>19^p^p>>>8},s===(s|0)?a.x=s:l+=s;for(var f=0;f<l.length+64;f++)a.x^=l.charCodeAt(f)|0,a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a}function c(s,a){var l=new i(s),f=a&&a.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(typeof f=="object"&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=c:this.xor128=c})(fc,e)})(Ye)),Ye.exports}var Ke={exports:{}},gc=Ke.exports,uo;function mc(){return uo||(uo=1,(function(e){(function(t,n,o){function i(s){var a=this,l="";a.next=function(){var p=a.x^a.x>>>2;return a.x=a.y,a.y=a.z,a.z=a.w,a.w=a.v,(a.d=a.d+362437|0)+(a.v=a.v^a.v<<4^(p^p<<1))|0},a.x=0,a.y=0,a.z=0,a.w=0,a.v=0,s===(s|0)?a.x=s:l+=s;for(var f=0;f<l.length+64;f++)a.x^=l.charCodeAt(f)|0,f==l.length&&(a.d=a.x<<10^a.x>>>4),a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a.v=s.v,a.d=s.d,a}function c(s,a){var l=new i(s),f=a&&a.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(typeof f=="object"&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=c:this.xorwow=c})(gc,e)})(Ke)),Ke.exports}var Qe={exports:{}},yc=Qe.exports,fo;function Sc(){return fo||(fo=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var f=a.x,p=a.i,d,u;return d=f[p],d^=d>>>7,u=d^d<<24,d=f[p+1&7],u^=d^d>>>10,d=f[p+3&7],u^=d^d>>>3,d=f[p+4&7],u^=d^d<<7,d=f[p+7&7],d=d^d<<13,u^=d^d<<9,f[p]=u,a.i=p+1&7,u};function l(f,p){var d,u=[];if(p===(p|0))u[0]=p;else for(p=""+p,d=0;d<p.length;++d)u[d&7]=u[d&7]<<15^p.charCodeAt(d)+u[d+1&7]<<13;for(;u.length<8;)u.push(0);for(d=0;d<8&&u[d]===0;++d);for(d==8?u[7]=-1:u[d],f.x=u,f.i=0,d=256;d>0;--d)f.next()}l(a,s)}function r(s,a){return a.x=s.x.slice(),a.i=s.i,a}function c(s,a){s==null&&(s=+new Date);var l=new i(s),f=a&&a.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(f.x&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=c:this.xorshift7=c})(yc,e)})(Qe)),Qe.exports}var Je={exports:{}},bc=Je.exports,ho;function wc(){return ho||(ho=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var f=a.w,p=a.X,d=a.i,u,h;return a.w=f=f+1640531527|0,h=p[d+34&127],u=p[d=d+1&127],h^=h<<13,u^=u<<17,h^=h>>>15,u^=u>>>12,h=p[d]=h^u,a.i=d,h+(f^f>>>16)|0};function l(f,p){var d,u,h,g,m,w=[],_=128;for(p===(p|0)?(u=p,p=null):(p=p+"\0",u=0,_=Math.max(_,p.length)),h=0,g=-32;g<_;++g)p&&(u^=p.charCodeAt((g+32)%p.length)),g===0&&(m=u),u^=u<<10,u^=u>>>15,u^=u<<4,u^=u>>>13,g>=0&&(m=m+1640531527|0,d=w[g&127]^=u+m,h=d==0?h+1:0);for(h>=128&&(w[(p&&p.length||0)&127]=-1),h=127,g=512;g>0;--g)u=w[h+34&127],d=w[h=h+1&127],u^=u<<13,d^=d<<17,u^=u>>>15,d^=d>>>12,w[h]=u^d;f.w=m,f.X=w,f.i=h}l(a,s)}function r(s,a){return a.i=s.i,a.w=s.w,a.X=s.X.slice(),a}function c(s,a){s==null&&(s=+new Date);var l=new i(s),f=a&&a.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(f.X&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=c:this.xor4096=c})(bc,e)})(Je)),Je.exports}var Ze={exports:{}},vc=Ze.exports,go;function kc(){return go||(go=1,(function(e){(function(t,n,o){function i(s){var a=this,l="";a.next=function(){var p=a.b,d=a.c,u=a.d,h=a.a;return p=p<<25^p>>>7^d,d=d-u|0,u=u<<24^u>>>8^h,h=h-p|0,a.b=p=p<<20^p>>>12^d,a.c=d=d-u|0,a.d=u<<16^d>>>16^h,a.a=h-p|0},a.a=0,a.b=0,a.c=-1640531527,a.d=1367130551,s===Math.floor(s)?(a.a=s/4294967296|0,a.b=s|0):l+=s;for(var f=0;f<l.length+20;f++)a.b^=l.charCodeAt(f)|0,a.next()}function r(s,a){return a.a=s.a,a.b=s.b,a.c=s.c,a.d=s.d,a}function c(s,a){var l=new i(s),f=a&&a.state,p=function(){return(l.next()>>>0)/4294967296};return p.double=function(){do var d=l.next()>>>11,u=(l.next()>>>0)/4294967296,h=(d+u)/(1<<21);while(h===0);return h},p.int32=l.next,p.quick=p,f&&(typeof f=="object"&&r(f,l),p.state=function(){return r(l,{})}),p}n&&n.exports?n.exports=c:this.tychei=c})(vc,e)})(Ze)),Ze.exports}var et={exports:{}};const _c={},Cc=Object.freeze(Object.defineProperty({__proto__:null,default:_c},Symbol.toStringTag,{value:"Module"})),Tc=dc(Cc);var Rc=et.exports,mo;function Ic(){return mo||(mo=1,(function(e){(function(t,n,o){var i=256,r=6,c=52,s="random",a=o.pow(i,r),l=o.pow(2,c),f=l*2,p=i-1,d;function u(S,b,k){var y=[];b=b==!0?{entropy:!0}:b||{};var T=w(m(b.entropy?[S,C(n)]:S??_(),3),y),E=new h(y),R=function(){for(var I=E.g(r),M=a,A=0;I<l;)I=(I+A)*i,M*=i,A=E.g(1);for(;I>=f;)I/=2,M/=2,A>>>=1;return(I+A)/M};return R.int32=function(){return E.g(4)|0},R.quick=function(){return E.g(4)/4294967296},R.double=R,w(C(E.S),n),(b.pass||k||function(I,M,A,B){return B&&(B.S&&g(B,E),I.state=function(){return g(E,{})}),A?(o[s]=I,M):I})(R,T,"global"in b?b.global:this==o,b.state)}function h(S){var b,k=S.length,y=this,T=0,E=y.i=y.j=0,R=y.S=[];for(k||(S=[k++]);T<i;)R[T]=T++;for(T=0;T<i;T++)R[T]=R[E=p&E+S[T%k]+(b=R[T])],R[E]=b;(y.g=function(I){for(var M,A=0,B=y.i,L=y.j,D=y.S;I--;)M=D[B=p&B+1],A=A*i+D[p&(D[B]=D[L=p&L+M])+(D[L]=M)];return y.i=B,y.j=L,A})(i)}function g(S,b){return b.i=S.i,b.j=S.j,b.S=S.S.slice(),b}function m(S,b){var k=[],y=typeof S,T;if(b&&y=="object")for(T in S)try{k.push(m(S[T],b-1))}catch{}return k.length?k:y=="string"?S:S+"\0"}function w(S,b){for(var k=S+"",y,T=0;T<k.length;)b[p&T]=p&(y^=b[p&T]*19)+k.charCodeAt(T++);return C(b)}function _(){try{var S;return d&&(S=d.randomBytes)?S=S(i):(S=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(S)),C(S)}catch{var b=t.navigator,k=b&&b.plugins;return[+new Date,t,k,t.screen,C(n)]}}function C(S){return String.fromCharCode.apply(0,S)}if(w(o.random(),n),e.exports){e.exports=u;try{d=Tc}catch{}}else o["seed"+s]=u})(typeof self<"u"?self:Rc,[],Math)})(et)),et.exports}var Bt,yo;function Ec(){if(yo)return Bt;yo=1;var e=uc(),t=hc(),n=mc(),o=Sc(),i=wc(),r=kc(),c=Ic();return c.alea=e,c.xor128=t,c.xorwow=n,c.xorshift7=o,c.xor4096=i,c.tychei=r,Bt=c,Bt}var Mc=Ec();const Ac=lc(Mc),at=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],Ft=at.reduce((e,t)=>t.length<e.length?t:e).length,$t=at.reduce((e,t)=>t.length>e.length?t:e).length;function Pc(e){const t=e?.seed?new Ac(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let u=typeof n!="number"?Ft:s(n);const h=typeof o!="number"?$t:s(o);u>h&&(u=h);let g=!1,m;for(;!g;)m=c(),g=m.length<=h&&m.length>=u;return m}function c(){return at[a(at.length)]}function s(u){return u<Ft&&(u=Ft),u>$t&&(u=$t),u}function a(u){const h=t?t():Math.random();return Math.floor(h*u)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=u=>u),typeof e.separator!="string"&&(e.separator=" ");const l=e.min+a(e.max+1-e.min);let f=[],p="",d=0;for(let u=0;u<l*e.wordsPerString;u++)d===e.wordsPerString-1?p+=e.formatter(r(),d):p+=e.formatter(r(),d)+e.separator,d++,(u+1)%e.wordsPerString===0&&(f.push(p),p="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const ri=e=>`${e}×`,ai=e=>`${e.toFixed(1)}×`;function si(){const e=Pc({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}const xc="LoopSchedule",Lc="Fixed-headway timetable on a one-way loop.",Bc="—";function sn(e,t){const n=t.airport!==void 0;if(e.compareToggle.disabled=n,e.paneA.trigger.disabled=n,e.paneB.trigger.disabled=n,e.paneA.repoTrigger.disabled=n,e.paneB.repoTrigger.disabled=n,n){e.compareToggle.checked=!1,e.layout.dataset.mode="single";for(const o of[e.paneA,e.paneB])o.name.textContent=xc,o.desc.textContent=Lc,o.repoName.textContent=Bc}return n}function Fc(e,t){const n=G(e.scenario);t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=ri(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=ai(e.intensity),se(t.paneA,e.strategyA),se(t.paneB,e.strategyB),ae(t.paneA,e.repositionA),ae(t.paneB,e.repositionB),Lo(t,e.scenario),sn(t,n)?e.compare=!1:(t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single"),Object.keys(e.overrides).length>0&&ii(t,!0),pt(n,e.overrides,t)}function xe(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function ci(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function li(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function $c(e){if(e.length<2)return{d:"M 0 13 L 100 13",lastX:100,lastY:13};let t=e[0]??0,n=e[0]??0;for(let a=1;a<e.length;a++){const l=e[a];l!==void 0&&(l<t&&(t=l),l>n&&(n=l))}const o=n-t,i=e.length;let r="",c=0,s=7;for(let a=0;a<i;a++){const l=a/(i-1)*100,f=o>0?13-((e[a]??0)-t)/o*12:7;r+=`${a===0?"M":"L"} ${l.toFixed(2)} ${f.toFixed(2)} `,c=l,s=f}return{d:r.trim(),lastX:c,lastY:s}}const Dt="http://www.w3.org/2000/svg",Kt=[["wait avg","avg_wait_s"],["wait max","max_wait_s"],["delivered","delivered"],["abandoned","abandoned"],["util","utilization"]];function Dc(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Oc(e,t,n){const o=So(e,n),i=So(t,n),r=o-i,c=r>0?"▴":"▾",s=r>0?"+":r<0?"−":"",a=Math.abs(r);switch(n){case"avg_wait_s":case"max_wait_s":return`${c} ${s}${a.toFixed(1)} s`;case"delivered":case"abandoned":return`${c} ${s}${a.toFixed(0)}`;case"utilization":return`${c} ${s}${(a*100).toFixed(0)}%`}}function So(e,t){switch(t){case"avg_wait_s":return e.avg_wait_s;case"max_wait_s":return e.max_wait_s;case"delivered":return e.delivered;case"abandoned":return e.abandoned;case"utilization":return e.utilization}}function Wc(e,t){const n=(u,h,g,m)=>Math.abs(u-h)<g?["tie","tie"]:(m?u>h:u<h)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,c]=n(e.max_wait_s,t.max_wait_s,.05,!1),[s,a]=n(e.delivered,t.delivered,.5,!0),[l,f]=n(e.abandoned,t.abandoned,.5,!1),[p,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:s,abandoned:l,utilization:p},b:{avg_wait_s:i,max_wait_s:c,delivered:a,abandoned:f,utilization:d}}}function bo(e){const t=document.createDocumentFragment();for(const[n]of Kt){const o=te("div","metric-row"),i=document.createElementNS(Dt,"svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS(Dt,"path"));const r=document.createElementNS(Dt,"circle");r.classList.add("metric-spark-dot"),r.setAttribute("r","1.4"),i.appendChild(r),o.append(te("span","metric-k",n),te("span","metric-v"),te("span","metric-d"),i),t.appendChild(o)}e.replaceChildren(t)}function Ot(e,t,n,o,i){const r=e.children;for(let c=0;c<Kt.length;c++){const s=r[c];if(!s)continue;const a=Kt[c];if(!a)continue;const l=a[1],f=n?n[l]:"";s.dataset.verdict!==f&&(s.dataset.verdict=f);const p=s.children[1],d=Dc(t,l);p.textContent!==d&&(p.textContent=d);const u=s.children[2],g=i!==null&&f!=="tie"&&f!==""?Oc(t,i,l):"";u.textContent!==g&&(u.textContent=g);const m=s.children[3],w=m.firstElementChild,_=m.children[1],C=$c(o[l]);w.getAttribute("d")!==C.d&&w.setAttribute("d",C.d);const S=C.lastX.toFixed(2),b=C.lastY.toFixed(2);_.getAttribute("cx")!==S&&_.setAttribute("cx",S),_.getAttribute("cy")!==b&&_.setAttribute("cy",b)}}const Nc=200;function di(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function ee(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=G(e.permalink.scenario);e.traffic=new Zo(Ao(e.permalink.seed)),di(e,o),Re(e.paneA),Re(e.paneB),e.paneA=null,e.paneB=null;try{const i=await Jn(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);se(t.paneA,e.permalink.strategyA),ae(t.paneA,e.permalink.repositionA),bo(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await Jn(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),se(t.paneB,e.permalink.strategyB),ae(t.paneB,e.permalink.repositionB),bo(t.paneB.metrics)}catch(c){throw Re(i),c}if(n!==e.initToken){Re(i),Re(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,ci(e,t),li(e,t),pt(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&U(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function Hc(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<Nc&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if(ei(e,c=>{const s=c.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);s.kind==="err"&&console.warn(`spawnRider failed (seed): ${s.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(di(e,G(e.permalink.scenario)),e.seeding=null)}function qc(e,t){const n=()=>ee(e,t),o={renderPaneStrategyInfo:se,renderPaneRepositionInfo:ae,refreshStrategyPopovers:()=>{Pe(e,t,n),Ae(e,t,n)},renderTweakPanel:()=>{const r=G(e.permalink.scenario);pt(r,e.permalink.overrides,t)},applyGating:r=>sn(t,r)};t.scenarioCards.addEventListener("click",r=>{const c=r.target;if(!(c instanceof HTMLElement))return;const s=c.closest(".scenario-card");if(!s)return;const a=s.dataset.scenarioId;!a||a===e.permalink.scenario||Bo(e,t,a,n,o)}),ao(e,t,t.paneA,n),ao(e,t,t.paneB,n),oo(e,t,t.paneA,n),oo(e,t,t.paneB,n),Pe(e,t,n),Ae(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},H(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",Pe(e,t,n),Ae(e,t,n),ee(e,t).then(()=>{U(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||O.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},H(e.permalink),ee(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=si();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},H(e.permalink),ee(e,t).then(()=>{U(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=ri(r)}),t.speedInput.addEventListener("change",()=>{H(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=ai(r)}),t.intensityInput.addEventListener("change",()=>{H(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{ee(e,t),U(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";ii(t,r)});for(const r of we){const c=t.tweakRows[r];hn(c.dec,()=>{ze(e,t,r,-1,n)}),hn(c.inc,()=>{ze(e,t,r,1,n)}),c.reset.addEventListener("click",()=>{ac(e,t,r,n)}),c.root.addEventListener("keydown",s=>{s.key==="ArrowUp"||s.key==="ArrowRight"?(s.preventDefault(),ze(e,t,r,1,n)):(s.key==="ArrowDown"||s.key==="ArrowLeft")&&(s.preventDefault(),ze(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{sc(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=Mo(e.permalink),c=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(c).then(()=>{U(t.toast,"Permalink copied")},()=>{U(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{xe(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{xe(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&xe(t,!1)}),Gc(e,t,o),nc(t)}function Gc(e,t,n){window.addEventListener("keydown",o=>{if(e.permalink.mode==="quest")return;if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable||o.target.closest(".monaco-editor"))return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),xe(t,t.shortcutSheet.hidden);return}case"Escape":{if(oi(t)||ni(t)){o.preventDefault(),dt(t);return}t.shortcutSheet.hidden||(o.preventDefault(),xe(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=Be.length){const r=Be[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),Bo(e,t,r.id,()=>ee(e,t),n))}})}const Uc="elevator-core playground",wo="In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";function vo(e){bi(Xc(e))}function Xc(e){if(e.mode==="quest")return{title:`Quest curriculum — ${Uc}`,description:"Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time."};const n=G(e.scenario).label,o=be[e.strategyA],i=be[e.strategyB],r=Fe[e.repositionA],c=Fe[e.repositionB];if(e.compare){const l=`${n}: ${o} vs ${i} — Elevator dispatch playground`,f=`Compare ${o} (parking: ${r}) against ${i} (parking: ${c}) dispatch on the ${n.toLowerCase()} scenario. ${wo}`;return{title:l,description:f}}const s=`${n}: ${o} dispatch — Elevator dispatch playground`,a=`Watch ${o} dispatch (parking: ${r}) handle live rider traffic on the ${n.toLowerCase()} scenario. ${wo}`;return{title:s,description:a}}function ko(e,t){e.sim.step(t);const n=e.sim.drainEvents();if(n.length===0)return null;const o=e.sim.snapshot();Js(e,n,o);const i=new Map;for(const r of o.cars)i.set(r.id,r.line);for(const r of n)if(r.kind==="elevator-assigned"){const c=i.get(r.elevator);c!==void 0&&e.renderer.pushAssignment(r.stop,r.elevator,c)}return o}function jc(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=Wc(t.latestMetrics,n.latestMetrics);Ot(t.metricsEl,t.latestMetrics,o.a,t.metricHistory,n.latestMetrics),Ot(n.metricsEl,n.latestMetrics,o.b,n.metricHistory,t.latestMetrics)}else Ot(t.metricsEl,t.latestMetrics,null,t.metricHistory,null);to(t),n&&to(n)}function zc(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const c=e.paneA,s=e.paneB,a=c!==null&&(!e.permalink.compare||s!==null);if(e.running&&e.ready&&a){const l=e.permalink.speed;let f=ko(c,l);s&&ko(s,l),e.seeding&&(Hc(e),f=null);const d=Math.min(r,4/60)*l;let u=[];if(!e.seeding){const w=f??c.sim.snapshot();u=e.traffic.drainSpawns(w,d),f=w}for(const w of u)ei(e,_=>{const C=_.sim.spawnRider(w.originStopId,w.destStopId,w.weight,w.patienceTicks);C.kind==="err"&&console.warn(`spawnRider failed: ${C.error}`)});const h=e.permalink.speed,g=e.traffic.currentPhaseRatio(),m=u.length>0||f===null?c.sim.snapshot():f;eo(c,m,h,g),s&&eo(s,s.sim.snapshot(),h,g),jc(e),(n+=1)%4===0&&(ci(e,t),li(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function Vc(){Jo().catch(()=>{});const t=tc(),n=new URLSearchParams(window.location.search).has("k"),o={...O,...Ui(window.location.search)};if(!n){o.seed=si();const s=new URL(window.location.href);s.searchParams.set("k",o.seed),window.history.replaceState(null,"",s.toString())}Qi(o);const i=G(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=_o(i,o.overrides),er(o.mode),tr(o.mode),Fc(o,t);const c={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new Zo(Ao(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(qc(c,t),qi(vo),vo(o),Si(),await ee(c,t),sn(t,i),c.ready=!0,zc(c,t),c.permalink.mode==="quest"){const s=new URLSearchParams(window.location.search).has("qs");await Ns({initialStageId:c.permalink.questStage,landOn:s?"stage":"grid",onStageChange:a=>{c.permalink.questStage=a,H(c.permalink)},onBackToGrid:()=>{c.permalink.questStage=O.questStage,H(c.permalink)}})}}Vc();export{ot as _};
