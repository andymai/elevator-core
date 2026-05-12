const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-Bl5prG3a.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function ne(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let hn=0;function U(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(hn),hn=window.setTimeout(()=>{e.classList.remove("show")},1600)}function gn(e,t){let i=0,r=0;const c=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",s=>{e.disabled||(s.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){c();return}t()},70)},380))}),e.addEventListener("pointerup",c),e.addEventListener("pointerleave",c),e.addEventListener("pointercancel",c),e.addEventListener("blur",c),e.addEventListener("click",s=>{s.pointerType||t()})}function bi(){document.getElementById("seo-fallback")?.remove()}function yi(e){document.title!==e.title&&(document.title=e.title),ke('meta[name="description"]',"content",e.description),ke('meta[property="og:title"]',"content",e.title),ke('meta[property="og:description"]',"content",e.description),ke('meta[name="twitter:title"]',"content",e.title),ke('meta[name="twitter:description"]',"content",e.description)}function ke(e,t,n){const o=document.querySelector(e);o&&o.getAttribute(t)!==n&&o.setAttribute(t,n)}function ie(e,t,n){const o=Jt(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return ko(i,r.min,r.max)}function Jt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return vo(n.doorOpenTicks,n.doorTransitionTicks)}}function Zt(e,t,n){const o=Jt(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function wo(e,t){const n={};for(const o of Se){const i=t[o];i!==void 0&&Zt(e,o,i)&&(n[o]=i)}return n}const Se=["cars","maxSpeed","weightCapacity","doorCycleSec"];function Si(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=vo(n,o),r=ko(n/(i*tt),.1,.9),c=Math.max(2,Math.round(t*tt)),s=Math.max(1,Math.round(c*r)),a=Math.max(1,Math.round((c-s)/2));return{openTicks:s,transitionTicks:a}}function vo(e,t){return(e+2*t)/tt}function en(e,t){const n=e.elevatorDefaults,o=ie(e,"maxSpeed",t),i=ie(e,"weightCapacity",t),r=ie(e,"doorCycleSec",t),{openTicks:c,transitionTicks:s}=Si(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:c,doorTransitionTicks:s}}function wi(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function vi(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(ie(e,"cars",t)),i=en(e,t),r=wi(e.stops.length,o),c=e.stops.map((a,l)=>`        StopConfig(id: StopId(${l}), name: ${Ht(a.name)}, position: ${V(a.positionM)}),`).join(`
`),s=r.map((a,l)=>_i(l,i,a,ki(l,o))).join(`
`);return`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: ${Ht(e.buildingName)},
        stops: [
${c}
        ],
    ),
    elevators: [
${s}
    ],
    simulation: SimulationParams(ticks_per_second: ${V(tt)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${V(e.passengerWeightRange[0])}, ${V(e.passengerWeightRange[1])}),
    ),
)`}const tt=60;function ko(e,t,n){return Math.min(n,Math.max(t,e))}function ki(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function _i(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${V(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${V(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${Ht(o)},
            max_speed: ${V(t.maxSpeed)}, acceleration: ${V(t.acceleration)}, deceleration: ${V(t.deceleration)},
            weight_capacity: ${V(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function Ht(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function V(e){return Number.isInteger(e)?`${e}.0`:String(e)}const _o={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function Ge(e){return Array.from({length:e},()=>1)}const fe=5,Ci=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:fe},(e,t)=>t===fe-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:Ge(fe),destWeights:Ge(fe)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:Ge(fe),destWeights:Ge(fe)}],Ti={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:Ci,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{..._o,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},nt=19,qt=16,Le=4,Co=(1+nt)*Le,Re=1,Ie=41,Me=42,Ri=43;function z(e){return Array.from({length:Ri},(t,n)=>e(n))}const he=e=>e===Re||e===Ie||e===Me,Ii=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:z(e=>e===0?20:e===Re?2:e===Ie?1.2:e===Me?.2:.1),destWeights:z(e=>e===0?0:e===Re?.3:e===Ie?.4:e===Me?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:z(e=>he(e)?.5:1),destWeights:z(e=>he(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:z(e=>e===21?4:he(e)?.25:1),destWeights:z(e=>e===21?5:he(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:z(e=>e===0||e===Re||e===21?.3:e===Ie?.4:e===Me?1.2:1),destWeights:z(e=>e===0?20:e===Re?1:e===Ie?.6:e===Me?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:z(e=>he(e)?1.5:.2),destWeights:z(e=>he(e)?1.5:.2)}];function Mi(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let s=1;s<=nt;s++){const a=1+s,l=s*Le;e.push(`        StopConfig(id: StopId(${a.toString().padStart(2," ")}), name: "Floor ${s}",    position: ${l.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${Co.toFixed(1)}),`);for(let s=21;s<=20+qt;s++){const a=1+s,l=s*Le;e.push(`        StopConfig(id: StopId(${a}), name: "Floor ${s}",   position: ${l.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:nt},(s,a)=>2+a),21],n=[21,...Array.from({length:qt},(s,a)=>22+a)],o=[1,21,38,39,40],i=[1,0,41,42],r=s=>s.map(a=>`StopId(${a})`).join(", "),c=(s,a,l,f)=>`                ElevatorConfig(
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
)`}const Ei=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:nt},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*Le})),{name:"Sky Lobby",positionM:Co},...Array.from({length:qt},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*Le})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],Ai={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:Ii,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:Ei,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{..._o,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:Mi()},mn=1e5,bn=4e5,yn=35786e3,xi=1e8,Pi=4;function Ue(e){return Array.from({length:Pi},(t,n)=>e(n))}const Li={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:Ue(e=>e===0?6:1),destWeights:Ue(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:Ue(e=>e===0?0:e===1?1:e===2?3:5),destWeights:Ue(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:mn},{name:"LEO Transfer",positionM:bn},{name:"GEO Platform",positionM:yn}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:xi,showDayNight:!1},ron:`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${mn.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${bn.toFixed(1)}),
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
)`},Bi=[{name:"Terminal",positionM:0},{name:"Concourse A",positionM:300},{name:"Concourse B",positionM:500},{name:"Concourse C",positionM:700},{name:"Concourse D",positionM:900},{name:"Concourse E",positionM:1100},{name:"Concourse F",positionM:1300},{name:"Terminal",positionM:0},{name:"Concourse F",positionM:200},{name:"Concourse E",positionM:400},{name:"Concourse D",positionM:600},{name:"Concourse C",positionM:800},{name:"Concourse B",positionM:1e3},{name:"Concourse A",positionM:1200}],Fi=7,$i=1500,Di=[{name:"Morning departure rush",durationSec:90,ridersPerMin:30,originWeights:[8,1,1,1,1,1,1,8,1,1,1,1,1,1],destWeights:[0,1,1,1,1,1,1,0,1,1,1,1,1,1]},{name:"Midday operations",durationSec:75,ridersPerMin:14,originWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1],destWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1]},{name:"Evening arrival surge",durationSec:90,ridersPerMin:30,originWeights:[1,3,3,3,3,3,3,1,3,3,3,3,3,3],destWeights:[10,0,0,0,0,0,0,10,0,0,0,0,0,0]},{name:"Late night",durationSec:45,ridersPerMin:4,originWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1],destWeights:[1,1,1,1,1,1,1,1,1,1,1,1,1,1]}],Oi={id:"airport-apm",label:"Airport people mover",description:"Two counter-rotating loops connect the terminal to six concourses. Fixed-headway dispatch keeps trains on a predictable cadence; rider demand shifts from outbound (morning) to inbound (evening).",defaultStrategy:"scan",phases:Di,seedSpawns:0,abandonAfterSec:240,featureHint:"Watch the fixed-headway schedule keep both loops in lockstep, even as demand shifts from outbound (morning) to inbound (evening). Trains can't overtake — that's the loop_lines no-overtake guarantee.",buildingName:"Airport People Mover",stops:Bi,defaultCars:4,elevatorDefaults:{maxSpeed:14,acceleration:1,deceleration:1,weightCapacity:9e3,doorOpenTicks:1500,doorTransitionTicks:180},tweakRanges:{cars:{min:4,max:4,step:1},maxSpeed:{min:8,max:20,step:1},weightCapacity:{min:4e3,max:2e4,step:1e3},doorCycleSec:{min:15,max:40,step:1}},passengerMeanIntervalTicks:60,passengerWeightRange:[55,100],airport:{outerStopCount:Fi,circumferenceM:$i},ron:`SimConfig(
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
)`},Be=[Ai,Li,Oi,Ti];function G(e){const t=Be.find(o=>o.id===e);if(t)return t;const n=Be[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const To={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},O={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},Wi=["scan","look","nearest","etd","destination","rsr"],Ni=["adaptive","predictive","lobby","spread","none"];function Sn(e,t){return e!==null&&Wi.includes(e)?e:t}function wn(e,t){return e!==null&&Ni.includes(e)?e:t}const Gt=new Set;function Hi(e){return Gt.add(e),()=>Gt.delete(e)}function q(e){const t=Ro(e);if(window.location.search!==t){window.history.replaceState(null,"",t);for(const n of Gt)n(e)}}function qi(e,t){return e==="compare"||e==="quest"?e:t}function Ro(e){const t=new URLSearchParams;e.mode!==O.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==O.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=G(e.scenario).defaultReposition,o=n??O.repositionA,i=n??O.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of Se){const c=e.overrides[r];c!==void 0&&Number.isFinite(c)&&t.set(To[r],Ui(c))}return`?${t.toString()}`}function Gi(e){const t=new URLSearchParams(e),n={};for(const o of Se){const i=t.get(To[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:qi(t.get("m"),O.mode),questStage:(t.get("qs")??"").trim()||O.questStage,scenario:t.get("s")??O.scenario,strategyA:Sn(t.get("a")??t.get("d"),O.strategyA),strategyB:Sn(t.get("b"),O.strategyB),repositionA:wn(t.get("pa"),O.repositionA),repositionB:wn(t.get("pb"),O.repositionB),compare:t.has("c")?t.get("c")==="1":O.compare,seed:(t.get("k")??"").trim()||O.seed,intensity:vn(t.get("i"),O.intensity),speed:vn(t.get("x"),O.speed),overrides:n}}function vn(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function Ui(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function Io(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const Xi=["scan","look","nearest","etd","destination","rsr"],ye={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},Mo={scan:"Sweep end-to-end, reverse at each end.",look:"Sweep until last call, then reverse.",nearest:"Assign each call to the closest car.",etd:"Assign by estimated time-to-destination.",destination:"Riders enter destination at the lobby; the group optimises.",rsr:"ETD penalised by queue length."},ji=["adaptive","predictive","lobby","spread","none"],Fe={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},Eo={adaptive:"Switch by traffic mode; the default.",predictive:"Park near the most-active floor.",lobby:"Return idle cars to the lobby.",spread:"Fan idle cars across the shaft.",none:"Idle cars stay where they finished."},zi="scenario-card inline-flex items-center gap-1.5 px-2 py-1 border-b-2 border-b-transparent text-content-tertiary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:text-content aria-pressed:text-content aria-pressed:border-b-accent max-md:flex-none max-md:snap-start",Vi="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function Yi(e){const t=document.createDocumentFragment();Be.forEach((n,o)=>{const i=ne("button",zi);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(ne("span","",n.label),ne("span",Vi,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function Ao(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}async function xo(e,t,n,o,i){const r=G(n);r.airport!==void 0&&(e.permalink={...e.permalink,compare:!1});const s=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,a=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:s,repositionA:a,overrides:{}},q(e.permalink),i.renderPaneStrategyInfo(t.paneA,s),i.renderPaneRepositionInfo(t.paneA,a),i.refreshStrategyPopovers(),Ao(t,r.id),await o(),i.renderTweakPanel(),i.applyGating(r),U(t.toast,`${r.label} · ${ye[s]}`)}function Ki(e){const t=G(e.scenario);e.scenario=t.id}const Qi=["layout","scenario-picker","controls-bar","cabin-legend"],Ji=["quest-pane"];function Zi(e){const t=e==="quest";for(const n of Qi){const o=document.getElementById(n);o&&o.classList.toggle("hidden",t)}for(const n of Ji){const o=document.getElementById(n);o&&(o.classList.toggle("hidden",!t),o.classList.toggle("flex",t))}}function er(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const o of n){const i=o.dataset.mode===e;o.dataset.active=String(i),o.setAttribute("aria-pressed",String(i))}t.addEventListener("click",o=>{const i=o.target;if(!(i instanceof HTMLElement))return;const r=i.closest("button[data-mode]");if(!r)return;const c=r.dataset.mode;if(c!=="compare"&&c!=="quest"||c===e)return;const s=new URL(window.location.href);c==="compare"?(s.searchParams.delete("m"),s.searchParams.delete("qs")):s.searchParams.set("m",c),window.location.assign(s.toString())})}const tr="modulepreload",nr=function(e,t){return new URL(e,t).href},kn={},ot=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let c=function(f){return Promise.all(f.map(u=>Promise.resolve(u).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const s=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),l=a?.nonce||a?.getAttribute("nonce");i=c(n.map(f=>{if(f=nr(f,o),f in kn)return;kn[f]=!0;const u=f.endsWith(".css"),d=u?'[rel="stylesheet"]':"";if(!!o)for(let m=s.length-1;m>=0;m--){const g=s[m];if(g.href===f&&(!u||g.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=u?"stylesheet":tr,u||(h.as="script"),h.crossOrigin="",h.href=f,l&&h.setAttribute("nonce",l),document.head.appendChild(h),u)return new Promise((m,g)=>{h.addEventListener("load",m),h.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(c){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=c,window.dispatchEvent(s),!s.defaultPrevented)throw c}return i.then(c=>{for(const s of c||[])s.status==="rejected"&&r(s.reason);return t().catch(r)})};class Po extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function or(e){const t=(await ot(async()=>{const{default:i}=await import("./worker-DE_xV-Fq.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new ir(n);return await o.init(e),o}class ir{#e;#n=new Map;#t=1;#r=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#s),this.#e.addEventListener("error",this.#a),this.#e.addEventListener("messageerror",this.#a)}async init(t){await this.#i({kind:"init",id:this.#o(),payload:this.#d(t)})}async tick(t,n){const o=n?.wantVisuals??!1;return this.#i({kind:"tick",id:this.#o(),ticks:t,...o?{wantVisuals:!0}:{}})}async spawnRider(t,n,o,i){return this.#i({kind:"spawn-rider",id:this.#o(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#i({kind:"set-strategy",id:this.#o(),strategy:t})}async loadController(t,n){const o=n?.unlockedApi??null,i=n?.timeoutMs,r=this.#i({kind:"load-controller",id:this.#o(),source:t,unlockedApi:o});if(i===void 0){await r;return}r.catch(()=>{});let c;const s=new Promise((a,l)=>{c=setTimeout(()=>{l(new Error(`controller did not return within ${i}ms`))},i)});try{await Promise.race([r,s])}finally{c!==void 0&&clearTimeout(c)}}async reset(t){await this.#i({kind:"reset",id:this.#o(),payload:this.#d(t)})}dispose(){this.#r||(this.#r=!0,this.#e.removeEventListener("message",this.#s),this.#e.removeEventListener("error",this.#a),this.#e.removeEventListener("messageerror",this.#a),this.#e.terminate(),this.#l(new Error("WorkerSim disposed")))}#l(t){for(const n of this.#n.values())n.reject(t);this.#n.clear()}#o(){return this.#t++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#i(t){if(this.#r)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#n.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#a=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#r=!0,this.#e.terminate(),this.#l(new Error(o))};#s=t=>{const n=t.data,o=this.#n.get(n.id);if(o)switch(this.#n.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":{const i=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;o.reject(i!==null?new Po(n.message,i):new Error(n.message));return}default:{const i=n.kind;o.reject(new Error(`WorkerSim: unknown reply kind "${String(i)}"`));return}}}}const rr=`// Quest curriculum — sim global declaration.
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
`,_n="quest-runtime";let _t=null,ge=null;async function ar(){return _t||ge||(ge=(async()=>{await sr();const e=await ot(()=>import("./editor.main-Bl5prG3a.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return _t=e,e})(),ge.catch(()=>{ge=null}),ge)}async function sr(){const[{default:e},{default:t}]=await Promise.all([ot(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),ot(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}function cr(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(rr,"ts:filename/quest-sim-globals.d.ts"))}function lr(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function dr(e){const t=await ar();cr(t),lr(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o()});return{dispose:()=>{i.dispose()}}},insertAtCursor(o){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:o,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(o){const i=n.getModel();if(!i)return;const r=o.message.split(`
`)[0]??o.message;t.editor.setModelMarkers(i,_n,[{severity:8,message:r,startLineNumber:o.line,startColumn:o.column,endLineNumber:o.line,endColumn:o.column+1}]),n.revealLineInCenterIfOutsideViewport(o.line)},clearRuntimeMarker(){const o=n.getModel();o&&t.editor.setModelMarkers(o,_n,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const pr=`SimConfig(
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
)`,ur={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:pr,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},fr=`SimConfig(
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
)`,hr={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:fr,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},gr=`SimConfig(
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
)`,mr={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:gr,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},br=`SimConfig(
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
)`,yr={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:br,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function $(e,t){const n=t.startTick??0,o=t.intervalTicks??30,i=t.destinations;if(i.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,c)=>{const s=i[c%i.length];return{origin:t.origin,destination:s,atTick:n+c*o,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const Sr=`SimConfig(
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
)`,wr={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:Sr,unlockedApi:["setStrategy"],seedRiders:[...$(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},vr=`SimConfig(
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
)`,kr=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,_r={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:vr,unlockedApi:["setStrategyJs"],seedRiders:[...$(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...$(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:kr,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},Cr=`SimConfig(
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
)`,Tr={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:Cr,unlockedApi:["setStrategyJs"],seedRiders:[...$(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...$(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},Rr=`SimConfig(
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
)`,Ir=`// Stage 8 — Event-Driven
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
`,Mr={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:Rr,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...$(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...$(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:Ir,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},Er=`SimConfig(
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
)`,Ar=`// Stage 9 — Take the Wheel
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
`,xr={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:Er,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...$(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:Ar,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},Pr=`SimConfig(
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
)`,Lr=`// Stage 10 — Patient Boarding
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
`,Br={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:Pr,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...$(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:Lr,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},Fr=`SimConfig(
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
)`,$r=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,Dr={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:Fr,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...$(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...$(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:$r,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},Or=`SimConfig(
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
)`,Wr=`// Stage 12 — Routes
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
`,Nr={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:Or,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...$(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...$(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:Wr,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},Hr=`SimConfig(
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
)`,qr=`// Stage 13 — Transfer Points
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
`,Gr={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:Hr,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...$(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...$(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...$(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:qr,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},Ur=`SimConfig(
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
)`,Xr=`// Stage 14 — Build a Floor
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
`,jr={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:Ur,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...$(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:Xr,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},zr=`SimConfig(
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
)`,Vr=`// Stage 15 — Sky Lobby
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
`,Yr={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:zr,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...$(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...$(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:Vr,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},ae=[ur,hr,mr,yr,wr,_r,Tr,Mr,xr,Br,Dr,Nr,Gr,jr,Yr];function Kr(e){return ae.find(t=>t.id===e)}function Qr(e){const t=ae.findIndex(n=>n.id===e);if(!(t<0))return ae[t+1]}function P(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function ct(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const it="quest:code:v1:",Lo="quest:bestStars:v1:",Bo=5e4;function $e(){try{return globalThis.localStorage??null}catch{return null}}function Cn(e){const t=$e();if(!t)return null;try{const n=t.getItem(it+e);if(n===null)return null;if(n.length>Bo){try{t.removeItem(it+e)}catch{}return null}return n}catch{return null}}function Tn(e,t){if(t.length>Bo)return;const n=$e();if(n)try{n.setItem(it+e,t)}catch{}}function Jr(e){const t=$e();if(t)try{t.removeItem(it+e)}catch{}}function De(e){const t=$e();if(!t)return 0;let n;try{n=t.getItem(Lo+e)}catch{return 0}if(n===null)return 0;const o=Number.parseInt(n,10);return!Number.isInteger(o)||o<0||o>3?0:o}function Zr(e,t){const n=De(e);if(t<=n)return;const o=$e();if(o)try{o.setItem(Lo+e,String(t))}catch{}}const ea={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},ta=["basics","strategies","events-manual","topology"],Fo=3;function na(){return{root:P("quest-grid","quest-grid"),progress:P("quest-grid-progress","quest-grid"),sections:P("quest-grid-sections","quest-grid")}}function Ct(e,t){ct(e.sections);let n=0;const o=ae.length*Fo;for(const i of ta){const r=ae.filter(l=>l.section===i);if(r.length===0)continue;const c=document.createElement("section");c.dataset.section=i;const s=document.createElement("h2");s.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",s.textContent=ea[i],c.appendChild(s);const a=document.createElement("div");a.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const l of r){const f=De(l.id);n+=f,a.appendChild(oa(l,f,t))}c.appendChild(a),e.sections.appendChild(c)}e.progress.textContent=`${n} / ${o}`}function oa(e,t,n){const o=ae.findIndex(u=>u.id===e.id),i=String(o+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const c=document.createElement("div");c.className="flex items-baseline justify-between gap-2";const s=document.createElement("span");s.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",s.textContent=i,c.appendChild(s);const a=document.createElement("span");a.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",a.classList.add(t>0?"text-accent":"text-content-disabled"),a.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),a.textContent="★".repeat(t)+"☆".repeat(Fo-t),c.appendChild(a),r.appendChild(c);const l=document.createElement("div");l.className="text-content text-[13px] font-semibold tracking-[-0.01em]",l.textContent=e.title,r.appendChild(l);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const ia=75;async function Rn(e,t,n,o){let i=n;for(;i<t.length;){const r=t[i];if(r===void 0||(r.atTick??0)>o)break;await e.spawnRider(r.origin,r.destination,r.weight??ia,r.patienceTicks),i+=1}return i}async function ra(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await or({configRon:e.configRon,strategy:"scan"});try{const c=[...e.seedRiders].sort((d,p)=>(d.atTick??0)-(p.atTick??0));let s=await Rn(r,c,0,0);const a={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(a.timeoutMs=n.timeoutMs),await r.loadController(t,a);let l=null,f=0;const u=n.onSnapshot!==void 0;for(;f<o;){const d=o-f,p=Math.min(i,d),h=await r.tick(p,u?{wantVisuals:!0}:void 0);l=h.metrics,f=h.tick,s=await Rn(r,c,s,f);const m=In(l,f);if(n.onProgress)try{n.onProgress(m)}catch{}if(n.onSnapshot&&h.snapshot)try{n.onSnapshot(h.snapshot)}catch{}if(e.passFn(m))return Mn(e,m,!0)}if(l===null)throw new Error("runStage: maxTicks must be positive");return Mn(e,In(l,f),!1)}finally{r.dispose()}}function In(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function Mn(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}function aa(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const o=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(o)&&o>0&&n.push(`${o.toFixed(1)}s avg wait`),n.join(" · ")}const $o=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map($o.map(e=>[e.name,e]));function Do(e){const t=new Set(e);return $o.filter(n=>t.has(n.name))}function sa(){return{root:P("quest-api-panel","api-panel")}}function En(e,t){ct(e.root);const n=Do(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const o=document.createElement("p");o.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",o.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(o);const i=document.createElement("ul");i.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const c=document.createElement("li");c.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const s=document.createElement("code");s.className="block font-mono text-[12px] text-content",s.textContent=r.signature,c.appendChild(s);const a=document.createElement("p");a.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",a.textContent=r.description,c.appendChild(a),i.appendChild(c)}e.root.appendChild(i)}function ca(){return{root:P("quest-hints","hints-drawer"),count:P("quest-hints-count","hints-drawer"),list:P("quest-hints-list","hints-drawer")}}const An="quest-hints-more";function xn(e,t){ct(e.list);for(const o of e.root.querySelectorAll(`.${An}`))o.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((o,i)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=o,i>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const o=document.createElement("button");o.type="button",o.className=`${An} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,o.textContent=`Show ${n-1} more`,o.addEventListener("click",()=>{for(const i of e.list.querySelectorAll("li[hidden]"))i.hidden=!1;o.remove()}),e.root.appendChild(o)}e.root.removeAttribute("open")}function la(e,t){return{activeStage:e,currentView:t,runLoop:{active:!1}}}function da(e,t){e.activeStage=t}function Tt(e,t){e.currentView=t}function Pn(e){e.runLoop.active=!1}function _e(e,t){return e.currentView==="stage"&&e.activeStage.id===t.id}function pa(){return{root:P("quest-reference","reference-panel"),status:P("quest-reference-status","reference-panel"),code:P("quest-reference-code","reference-panel")}}function Rt(e,t,n={}){const o=t.referenceSolution,i=De(t.id);if(!o||i===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=i===3?"(mastered)":"(unlocked)",e.code.textContent=o,n.collapse!==!1&&e.root.removeAttribute("open")}function ua(){const e="results-modal";return{root:P("quest-results-modal",e),title:P("quest-results-title",e),stars:P("quest-results-stars",e),detail:P("quest-results-detail",e),close:P("quest-results-close",e),retry:P("quest-results-retry",e),next:P("quest-results-next",e)}}function fa(e,t,n,o,i){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=ha(t.grade,t.passed,o),e.retry.onclick=()=>{It(e),n()},e.close.onclick=()=>{It(e)};const r=i;r?(e.next.hidden=!1,e.next.onclick=()=>{It(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function It(e){e.root.classList.remove("show")}function ha(e,t,n){const o=`tick ${e.endTick}`,i=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${i} · finished by ${o}.`;if(n)try{const r=n(e);if(r)return`${i}. ${r}`}catch{}return`${i}. The pass condition wasn't met within the run budget.`}const ga={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function Ln(e){return ga[e]??`sim.${e}();`}function ma(){return{root:P("quest-snippets","snippet-picker")}}function Bn(e,t,n){ct(e.root);const o=Do(t.unlockedApi);if(o.length!==0)for(const i of o){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=i.name,r.title=`Insert: ${Ln(i.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(Ln(i.name))}),e.root.appendChild(r)}}function tn(e){return{nx:Math.sin(e.tangent),ny:-Math.cos(e.tangent)}}function rt(e,t){const{cx:n,cy:o,w:i,h:r,r:c}=t,s=n-i/2,a=o-r/2,l=n+i/2,f=o+r/2;e.beginPath(),e.moveTo(s+c,a),e.lineTo(l-c,a),e.arcTo(l,a,l,a+c,c),e.lineTo(l,f-c),e.arcTo(l,f,l-c,f,c),e.lineTo(s+c,f),e.arcTo(s,f,s,f-c,c),e.lineTo(s,a+c),e.arcTo(s,a,s+c,a,c),e.closePath()}function Oo(e,t,n,o,i,r,c,s){return!(e+n<=i||i+c<=e||t+o<=r||r+s<=t)}const lt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},ba="#2a2a35",ya="#a1a1aa",N='"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',Sa=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],wa=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],va="rgba(8, 10, 14, 0.55)",ka="#3a3a45",_a=[1,1,.5,.42],Ca=["LOW","HIGH","VIP","SERVICE"],Ta="#e6c56b",Ra="#9bd4c4",Ia=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],Ma="#a1a1aa",Ea="#4a4a55",Aa="#f59e0b",Wo="#7dd3fc",No="#fda4af",Mt="#fafafa",Ho="#8b8c92",qo="rgba(250, 250, 250, 0.95)",xa=700,Ut=3,Pa=.05;function Fn(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function La(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:dt(o)})}return t}function dt(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function Go(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function $n(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function Uo(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function Xo(e,t,n,o,i,r){const c=Math.abs(t-e);if(c<.001)return 0;const s=Math.abs(n);if(s*s/(2*r)>=c)return s>0?s/r:0;const l=Math.max(0,(o-s)/i),f=s*l+.5*i*l*l,u=o/r,d=o*o/(2*r);if(f+d>=c){const h=(2*i*r*c+r*s*s)/(i+r),m=Math.sqrt(Math.max(h,s*s));return(m-s)/i+m/r}const p=c-f-d;return l+p/Math.max(o,.001)+u}const Ba="#252530",Fa="#2a2a35",$a="#8b8c92",Da="#fafafa",Oa="#a1a1aa",Wa=75,Na=new Set(["loading","door-opening","door-closing"]);function Ha(e){return Na.has(e.phase)}function Dn(e,t,n){for(let o=0;o<t.length;o++){if(o===n)continue;const i=t[o];if(i&&Oo(e.bx,e.by,e.bubbleW,e.bubbleH,i.bx,i.by,i.bubbleW,i.bubbleH))return!0}return!1}function On(e,t){for(const n of t)if(Oo(e.bx,e.by,e.bubbleW,e.bubbleH,n.x,n.y,n.w,n.h))return!0;return!1}function qa(e,t,n){const o=e.car.riders,i=t>0?`${o} / ${t}`:`${o}`,r=e.nextStop?.name??"—",s=`${Ha(e.car)?"@":"→"} ${r}`;let a="ETA —";if(e.nextStop&&Number.isFinite(e.remainingM)){const l=Xo(0,e.remainingM,Math.abs(e.car.v),n.maxSpeed,n.acceleration,n.deceleration);a=`ETA ${Uo(l)}`}return[`Train ${e.letter}`,s,i,a]}function Ga(e,t,n,o,i,r,c,s,a){if(t.length===0||Math.min(n,o)<340)return;const l=c?11:10,f=Math.round(l-2),u=8,d=5,p=l+2,h=f+4,m=r.weightCapacity>0?Math.max(1,Math.floor(r.weightCapacity/Wa)):0,g=[];e.font=`600 ${l}px ${N}`;for(const y of t){const v=qa(y,m,r);let _=0;e.font=`700 ${f}px ${N}`;const S=(v[0]??"").toUpperCase();_=Math.max(_,e.measureText(S).width),e.font=`600 ${l}px ${N}`;for(let B=1;B<v.length;B++)_=Math.max(_,e.measureText(v[B]??"").width);const w=_+u*2,k=h+p*(v.length-1)+d*2,{nx:b,ny:C}=tn(y.anchor),M=y.isInner?-1:1,R=s+18,I=y.anchor.x+b*M*R,E=y.anchor.y+C*M*R;let A=I-w/2,L=E-k/2;A=Math.max(4,Math.min(n-w-4,A)),L=Math.max(4,Math.min(o-k-4,L)),g.push({placement:y,lines:v,bx:A,by:L,bubbleW:w,bubbleH:k})}for(let y=0;y<g.length;y++){const v=g[y];if(!v)continue;const _=v.placement.anchor.tangent,S=Math.cos(_),w=Math.sin(_);let k=0;for(;k<12&&(Dn(v,g,y)||On(v,a));){const b=k%2===0?1:-1,C=Math.floor(k/2)+1,M=b*(v.bubbleH*.5+8)*C;v.bx=Math.max(4,Math.min(n-v.bubbleW-4,v.bx+S*M)),v.by=Math.max(4,Math.min(o-v.bubbleH-4,v.by+w*M)),k++}if((Dn(v,g,y)||On(v,a))&&i.w>v.bubbleW+8&&i.h>v.bubbleH+8){const b=g.slice(0,y).filter(I=>I.bx>=i.x&&I.bx+I.bubbleW<=i.x+i.w&&I.by>=i.y&&I.by+I.bubbleH<=i.y+i.h),C=v.bubbleH+4,M=Math.max(1,Math.floor((i.h-v.bubbleH)/C)+1),R=Math.min(b.length,M-1);v.bx=i.x+(i.w-v.bubbleW)/2,v.by=i.y+R*C}}for(const y of g){e.save();const v={cx:y.bx+y.bubbleW/2,cy:y.by+y.bubbleH/2,w:y.bubbleW,h:y.bubbleH,r:4};e.fillStyle=Ba,rt(e,v),e.fill(),e.strokeStyle=Fa,e.lineWidth=1,rt(e,v),e.stroke(),e.textBaseline="middle",e.textAlign="left";let _=y.by+d+h/2;e.font=`700 ${f}px ${N}`,e.fillStyle=$a;const S=(y.lines[0]??"").toUpperCase();e.fillText(S,y.bx+u,_),_+=h/2+p/2,e.font=`600 ${l}px ${N}`;for(let w=1;w<y.lines.length;w++){const k=y.lines[w]??"";e.fillStyle=w===y.lines.length-1?Oa:Da,e.fillText(k,y.bx+u,_),_+=p}e.restore()}}const Ua="rgba(125, 211, 252, 0.45)",Xa="rgba(253, 164, 175, 0.4)",ja="#7dd3fc",za="#fda4af",Va="rgba(125, 211, 252, 0.9)",Ya="rgba(253, 164, 175, 0.9)",Ka="#3a3a45",Qa="#0b0d12",Ja="#a1a1aa",Za=480,oe=4,Xe=4,Xt=4;function es(e,t,n,o,i,r,c,s){e.save();const a=Math.min(n,o),l=a>=Za,f=n*.88,u=Math.min(o*.6,n*.42),d=Math.min(f,u)*.32,p=Math.max(28,a*.06),h=Math.max(1.5,a*.005),m={cx:n/2,cy:o/2,w:f,h:u,r:d,color:Ua,thickness:h},g={cx:n/2,cy:o/2,w:f-p*2,h:u-p*2,r:Math.max(0,d-p),color:Xa,thickness:h},y={cx:n/2,cy:o/2,w:(m.w+g.w)/2,h:(m.h+g.h)/2,r:(m.r+g.r)/2};Wn(e,m),Wn(e,g);const v=t.stops.slice(0,i.outerStopCount),_=t.stops.slice(i.outerStopCount),S=[...new Set(t.cars.map(H=>H.line))].sort((H,X)=>H-X),w=S[0],k=S[1],b=[],C=[];for(const H of t.cars)H.line===w?b.push(H):H.line===k&&C.push(H);const M=ts(e,v,_,y,m,g,i,l),R=os(m),I=R/oe*.7,E=R/oe,A=Math.max(9,h*2.8),L=rs([...b,...C]),B=Hn(e,b,v,m,i,I,A,E,!1,L,ja),D=Hn(e,C,_,g,i,I,A,E,!0,L,za),Q={x:g.cx-g.w/2+g.r+6,y:g.cy-g.h/2+g.r+6,w:Math.max(0,g.w-2*(g.r+6)),h:Math.max(0,g.h-2*(g.r+6))};Ga(e,[...B,...D],n,o,Q,s,l,A,M),e.restore()}function nn(e){return 2*Math.max(0,e.w-2*e.r)+2*Math.max(0,e.h-2*e.r)+2*Math.PI*e.r}function Ee(e,t){const n=(t%1+1)%1,o=nn(e);let i=n*o;const r=e.w,c=e.h,s=e.r,a=Math.max(0,r-2*s),l=Math.max(0,c-2*s),f=Math.PI*s/2,u=e.cx-r/2,d=e.cx+r/2,p=e.cy-c/2,h=e.cy+c/2;if(i<a)return{x:u+s+i,y:p,tangent:0};if(i-=a,i<f){const g=-Math.PI/2+i/f*(Math.PI/2);return{x:d-s+Math.cos(g)*s,y:p+s+Math.sin(g)*s,tangent:g+Math.PI/2}}if(i-=f,i<l)return{x:d,y:p+s+i,tangent:Math.PI/2};if(i-=l,i<f){const g=0+i/f*(Math.PI/2);return{x:d-s+Math.cos(g)*s,y:h-s+Math.sin(g)*s,tangent:g+Math.PI/2}}if(i-=f,i<a)return{x:d-s-i,y:h,tangent:Math.PI};if(i-=a,i<f){const g=Math.PI/2+i/f*(Math.PI/2);return{x:u+s+Math.cos(g)*s,y:h-s+Math.sin(g)*s,tangent:g+Math.PI/2}}if(i-=f,i<l)return{x:u,y:h-s-i,tangent:-Math.PI/2};if(i-=l,f<=0)return{x:u+s,y:p,tangent:0};const m=Math.PI+i/f*(Math.PI/2);return{x:u+s+Math.cos(m)*s,y:p+s+Math.sin(m)*s,tangent:m+Math.PI/2}}function Wn(e,t){rt(e,t),e.strokeStyle=t.color,e.lineWidth=t.thickness,e.lineCap="butt",e.lineJoin="round",e.stroke()}function ts(e,t,n,o,i,r,c,s){const a=Math.max(5,o.h*.022),l=Math.max(1.5,a*.32),f=11,u=[],d=Math.min(t.length,n.length);for(let p=0;p<d;p++){const h=t[p],m=n[p];if(!h||!m)continue;const g=h.y/c.circumferenceM,y=Ee(o,g),v=Ee(i,g),_=Ee(r,g);e.beginPath(),e.arc(y.x,y.y,a,0,Math.PI*2),e.fillStyle=Qa,e.fill(),e.strokeStyle=Ka,e.lineWidth=l,e.stroke();const S=Math.max(1.8,a*.22),w=S*2.4,k=a+S*1.6+w*(Xt-1)+S,{nx:b,ny:C}=tn(v),M=k+f*.8+4,R=v.x+b*M,I=v.y+C*M;e.font=`500 ${f}px ${N}`,e.fillStyle=Ja,e.textAlign="center",e.textBaseline="middle";const E=s?h.name:ns(h.name),A=e.measureText(E).width;e.fillText(E,R,I);const L=3;u.push({x:R-A/2-L,y:I-f/2-L,w:A+L*2,h:f+L*2}),Nn(e,v,h.waiting,"outward",Va,a),Nn(e,_,m.waiting,"inward",Ya,a)}return u}function ns(e){return e==="Plane Train"?"P":e==="Terminal"?"T":e.startsWith("Concourse ")?e.slice(10,11).toUpperCase():e.slice(0,1).toUpperCase()}function Nn(e,t,n,o,i,r){if(n<=0)return;const{nx:c,ny:s}=tn(t),a=o==="outward"?1:-1,l=c*a,f=s*a,u=Math.cos(t.tangent),d=Math.sin(t.tangent),p=Math.max(1.8,r*.22),h=p*2.4,m=r+p*1.6,g=Xe*Xt,y=Math.max(0,n-g),v=Math.min(n,g);e.fillStyle=i;for(let _=0;_<v;_++){const S=Math.floor(_/Xe),k=_%Xe-(Xe-1)/2,b=m+h*S,C=t.x+l*b+u*(k*h),M=t.y+f*b+d*(k*h);e.beginPath(),e.arc(C,M,p,0,Math.PI*2),e.fill()}if(y>0){const _=m+h*(Xt-1),S=t.x+l*(_+h*1.4),w=t.y+f*(_+h*1.4);e.font=`600 ${Math.round(p*4)}px sans-serif`,e.textAlign="center",e.textBaseline="middle",e.fillText(`+${y}`,S,w)}}function os(e){const t=nn(e);return Math.min(110,t*.075)}function is(e){const t=new Array(oe).fill(0),n=Math.floor(e/oe),o=e-n*oe;for(let i=0;i<oe;i++)t[i]=n+(i<o?1:0);return t}function rs(e){const t=[...e].sort((o,i)=>o.id-i.id),n=new Map;for(let o=0;o<t.length;o++){const i=t[o];i&&n.set(i.id,String.fromCharCode(65+o))}return n}function Hn(e,t,n,o,i,r,c,s,a,l,f){if(t.length===0)return[];const u=nn(o),d=[];for(const p of t){const h=p.y/i.circumferenceM,m=a?1-h:h,g=is(p.riders);for(let b=0;b<oe;b++){const M=-(a?-1:1)*(b*s+s/2),R=((m+M/u)%1+1)%1,I=Ee(o,R),E=g[b]??0;ss(e,I,r,c,f,E,b===0)}const v=((m+-(a?-1:1)*s/2/u)%1+1)%1,_=Ee(o,v),S=l.get(p.id)??"?",w=as(p,n,i.circumferenceM),k=w?(w.y-p.y+i.circumferenceM)%i.circumferenceM:1/0;d.push({car:p,anchor:_,letter:S,nextStop:w,remainingM:k,lineColor:f,isInner:a})}return d}function as(e,t,n){let o,i=1/0;for(const r of t){const c=(r.y-e.y+n)%n;c<=.001||c<i&&(i=c,o=r)}return o}function ss(e,t,n,o,i,r,c){e.save(),e.translate(t.x,t.y),e.rotate(t.tangent);const s=n/2,a=o/2,l=Math.min(s,a)*.5;rt(e,{cx:0,cy:0,w:n,h:o,r:l}),e.fillStyle=i,e.fill(),c&&(e.fillStyle="rgba(255, 255, 255, 0.35)",e.beginPath(),e.arc(s-l*1.1,0,a*.32,0,Math.PI*2),e.fill()),r>0&&cs(e,n,o,r),e.restore()}function cs(e,t,n,o){const i=Math.max(1.5,t*.1),r=Math.max(1,n*.18),c=Math.max(1,t-i*2),s=Math.max(1,n-r*2),a=o>8?3:2,l=Math.max(1,Math.ceil(o/a)),f=c/l,u=s/a,d=Math.max(.7,Math.min(f,u)*.36);e.fillStyle="rgba(20, 22, 30, 0.85)";let p=0;for(let h=0;h<a&&p<o;h++)for(let m=0;m<l&&p<o;m++){const g=-t/2+i+f*(m+.5),y=-n/2+r+u*(h+.5);e.beginPath(),e.arc(g,y,d,0,Math.PI*2),e.fill(),p++}}const qn=["standard","briefcase","bag","short","tall"];function K(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,qn[n%qn.length]??"standard"}function ls(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function on(e,t,n,o,i,r="standard"){const c=ls(r,o),a=n-.5,l=a-c.bodyH,f=l-c.neckGap-c.headR,u=c.bodyH*.08,d=a-c.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-c.shoulderW/2,l+u),e.lineTo(t-c.shoulderW/2+u,l),e.lineTo(t+c.shoulderW/2-u,l),e.lineTo(t+c.shoulderW/2,l+u),e.lineTo(t+c.waistW/2,d),e.lineTo(t+c.footW/2,a),e.lineTo(t-c.footW/2,a),e.lineTo(t-c.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,c.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const p=Math.max(1.6,c.headR*.9),h=t+c.waistW/2+p*.1,m=a-p-.5;e.fillRect(h,m,p,p);const g=p*.55;e.fillRect(h+(p-g)/2,m-1,g,1)}else if(r==="bag"){const p=Math.max(1.3,c.headR*.9),h=t-c.shoulderW/2-p*.35,m=l+c.bodyH*.35;e.beginPath(),e.arc(h,m,p,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(h+p*.2,m-p*.8),e.lineTo(t+c.shoulderW/2-u,l+.5),e.stroke()}else if(r==="tall"){const p=c.headR*2.1,h=Math.max(1,c.headR*.45);e.fillRect(t-p/2,f-c.headR-h+.4,p,h)}}function ds(e,t,n,o,i,r,c,s,a){const f=Math.max(1,Math.floor((i-14)/s.figureStride)),u=Math.min(r,f),d=-2;for(let p=0;p<u;p++){const h=t+d+o*p*s.figureStride,m=p+0,g=K(a,m);on(e,h,n,s.figureHeadR,c,g)}if(r>u){e.fillStyle=Ho,e.font=`${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const p=t+d+o*u*s.figureStride;e.fillText(`+${r-u}`,p,n-1)}}function re(e,t,n,o,i,r){const c=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,c);return}e.moveTo(t+c,n),e.lineTo(t+o-c,n),e.quadraticCurveTo(t+o,n,t+o,n+c),e.lineTo(t+o,n+i-c),e.quadraticCurveTo(t+o,n+i,t+o-c,n+i),e.lineTo(t+c,n+i),e.quadraticCurveTo(t,n+i,t,n+i-c),e.lineTo(t,n+c),e.quadraticCurveTo(t,n,t+c,n),e.closePath()}function ps(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const c=i+r+1>>1;e.measureText(t.slice(0,c)+o).width<=n?i=c:r=c-1}return i===0?o:t.slice(0,i)+o}function us(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function fs(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px ${N}`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,c=Math.max(n.fontSmall+.5,i);for(const s of t){const a=s.top-3,l=a>i&&a-n.fontSmall<r;e.fillStyle=s.color,e.fillText(s.text,s.cx,l?c:a)}}function hs(e,t,n,o,i,r,c,s,a){e.font=`500 ${o.fontMain.toFixed(0)}px ${N}`,e.textBaseline="middle";const l=o.padX,f=o.padX+o.labelW,u=r-o.padX,d=o.shaftInnerW/2,p=Math.min(o.shaftInnerW*1.8,(u-f)/2);for(let h=0;h<t.length;h++){const m=t[h];if(m===void 0)continue;const g=n(m.y),y=t[h+1],v=y!==void 0?n(y.y):s;if(e.strokeStyle=ba,e.lineWidth=a?2:1,e.beginPath(),a)for(const S of i)e.moveTo(S-p,g+.5),e.lineTo(S+p,g+.5);else{let S=f;for(const w of i){const k=w-d,b=w+d;k>S&&(e.moveTo(S,g+.5),e.lineTo(k,g+.5)),S=b}S<u&&(e.moveTo(S,g+.5),e.lineTo(u,g+.5))}e.stroke();for(let S=0;S<i.length;S++){const w=i[S];if(w===void 0)continue;const k=c.has(S,m.entity_id);e.strokeStyle=k?Aa:Ea,e.lineWidth=k?1.4:1,e.beginPath(),e.moveTo(w-d-2,g+.5),e.lineTo(w-d,g+.5),e.moveTo(w+d,g+.5),e.lineTo(w+d+2,g+.5),e.stroke()}const _=a?g:(g+v)/2;e.fillStyle=ya,e.textAlign="right",e.fillText(ps(e,m.name,o.labelW-4),l+o.labelW-4,_)}}function gs(e,t,n,o,i,r){for(const c of t.stops){if(c.waiting_by_line.length===0)continue;const s=r.get(c.entity_id);if(s===void 0||s.size===0)continue;const a=n(c.y),l=c.waiting_up>=c.waiting_down?Wo:No;for(const f of c.waiting_by_line){if(f.count===0)continue;const u=s.get(f.line);if(u===void 0)continue;const d=i.get(u);if(d===void 0)continue;const p=d.end-d.start;p<=o.figureStride||ds(e,d.end-2,a,-1,p,f.count,l,o,c.entity_id)}}}const Et=new Map;function rn(e){const t=Et.get(e);if(t!==void 0)return t;const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return Et.set(e,null),null;const o=parseInt(n[1],16),i=[o>>16&255,o>>8&255,o&255];return Et.set(e,i),i}function jt(e,t){const n=rn(e);if(n===null)return e;const[o,i,r]=n,c=s=>t>=0?Math.round(s+(255-s)*t):Math.round(s*(1+t));return`rgb(${c(o)}, ${c(i)}, ${c(r)})`}function jo(e,t){const n=rn(e);if(n===null)return e;const[o,i,r]=n;return`rgba(${o}, ${i}, ${r}, ${t})`}function ze(e,t){if(rn(e)!==null&&e.startsWith("#")){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return jo(e,t)}function zo(e){let r=e;for(let s=0;s<3;s++){const a=1-r,l=3*a*a*r*.2+3*a*r*r*.2+r*r*r,f=3*a*a*.2+6*a*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(l-e)/f,r=Math.max(0,Math.min(1,r))}const c=1-r;return 3*c*c*r*.6+3*c*r*r*1+r*r*r}function ms(e,t,n,o,i,r,c,s,a,l=!1){const f=o*.22,u=(i-4)/10.5,d=Math.max(1.2,Math.min(s.figureHeadR,f,u)),p=s.figureStride*(d/s.figureHeadR),h=3,m=2,g=o-h*2,v=Math.max(1,Math.floor((g-16)/p)),_=Math.min(r,v),S=_*p,w=t-S/2+p/2,k=n-m;for(let b=0;b<_;b++){const C=a?.[b]??K(0,b);on(e,w+b*p,k,d,c,C)}if(r>_){const b=`+${r-_}`,C=Math.max(8,s.fontSmall-1);e.font=`700 ${C.toFixed(1)}px ${N}`,e.textAlign="right",e.textBaseline="middle";const M=e.measureText(b).width,R=3,I=1.5,E=Math.ceil(M+R*2),A=Math.ceil(C+I*2),L=t+o/2-2,B=n-i+2,D=L-E;e.fillStyle="rgba(15, 15, 18, 0.85)",re(e,D,B,E,A,2),e.fill(),e.fillStyle="#fafafa",e.fillText(b,L-R,B+A/2)}if(l){const b=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${b.toFixed(0)}px ${N}`,e.textAlign="center",e.textBaseline="middle";const C=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,C+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,C)}}const bs=Array.from({length:Ut},(e,t)=>jo(lt.moving,.18*(1-t/Ut))),Gn=Object.fromEntries(Object.entries(lt).map(([e,t])=>[e,jt(t,.18)]));function ys(e,t,n,o,i,r,c){const s=Math.max(2,r.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const l=c.get(a.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const u=n.get(a.id);if(u===void 0)continue;const d=i(f.y)-r.carH/2,p=i(a.y)-r.carH/2;Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(u,p),e.lineTo(u,d),e.stroke(),e.fillStyle=qo,e.beginPath(),e.arc(u,d,s,0,Math.PI*2),e.fill())}}function Ss(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const c=o/2;for(let s=1;s<=Ut;s++){const a=r(t.y-t.v*Pa*s);e.fillStyle=bs[s-1]??"rgba(107, 107, 117, 0.06)",e.fillRect(n-c,a-i,o,i)}}function ws(e,t,n,o,i,r,c,s,a){const l=c(t.y),f=l-i,u=o/2,d=lt[t.phase]??"#6b6b75";e.fillStyle=d,e.fillRect(n-u,f,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-u+.5,f+.5,o-1,i-1),e.strokeStyle=Gn[t.phase]??Gn.unknown,e.beginPath(),e.moveTo(n-u+1,f+1.5),e.lineTo(n+u-1,f+1.5),e.stroke();const p=t.capacity>0&&t.load>=t.capacity*.95;if((t.riders>0||p)&&ms(e,n,l,o,i,t.riders,r,s,a,p),t.phase==="door-opening"||t.phase==="loading"||t.phase==="door-closing"){const h=Math.max(o*.2,Math.min(o*.4,8));e.strokeStyle="rgba(250, 250, 250, 0.85)",e.lineWidth=1.5,e.beginPath(),e.moveTo(n-h/2,l-.5),e.lineTo(n+h/2,l-.5),e.stroke()}}const Un=6,vs=3,At=4,be=3,me=2.5,Z=2,ks=12,_s="rgba(37, 37, 48, 0.80)",Cs="#ECECEE",Xn=3,jn=.3,Ts=140,zn=.85;function Rs(e,t,n,o,i,r,c,s){const a=c.fontSmall+.5;e.font=`500 ${a}px ${N}`,e.textBaseline="middle",Vn(e,"-0.1px");const l=performance.now(),f=ze(t,.45),u=ze(t,.5),d=ze(t,.75),p=[];for(const[m,g]of o){const y=n.get(m);if(y===void 0)continue;const v=i.get(m);if(v===void 0)continue;const _=r(y.y),S=_-c.carH,w=Math.max(1,g.expiresAt-g.bornAt),k=g.expiresAt-l,b=k>w*jn?1:Math.max(0,k/(w*jn)),C=Math.max(0,l-g.bornAt),M=Math.min(1,C/Ts),R=b*M;if(R<=0)continue;const I=e.measureText(g.glyph).width,E=I+Xn+e.measureText(g.text).width+Un*2,A=a+vs*2+2,L=S-Z-me-A,B=_+Z+me+A>s,D=L<2&&!B?"below":"above",Q=D==="above"?S-Z-me-A:_+Z+me;let H=v-E/2;const X=2,we=s-E-2;H<X&&(H=X),H>we&&(H=we),p.push({bubble:g,glyphW:I,alpha:R,cx:v,carTop:S,carBottom:_,bubbleW:E,bubbleH:A,side:D,bx:H,by:Q,entrance:M})}const h=(m,g)=>!(m.bx+m.bubbleW<=g.bx||g.bx+g.bubbleW<=m.bx||m.by+m.bubbleH<=g.by||g.by+g.bubbleH<=m.by);for(let m=1;m<p.length;m++){const g=p[m];if(g===void 0)continue;let y=!1;for(let k=0;k<m;k++){const b=p[k];if(b!==void 0&&h(g,b)){y=!0;break}}if(!y)continue;const v=g.side==="above"?"below":"above",_=v==="above"?g.carTop-Z-me-g.bubbleH:g.carBottom+Z+me,S={...g,side:v,by:_};let w=!0;for(let k=0;k<m;k++){const b=p[k];if(b!==void 0&&h(S,b)){w=!1;break}}w&&(p[m]=S)}for(const m of p){const{bubble:g,glyphW:y,alpha:v,cx:_,carTop:S,carBottom:w,bubbleW:k,bubbleH:b,side:C,bx:M,by:R,entrance:I}=m,E=C==="above"?S-Z:w+Z,A=Math.min(Math.max(_,M+At+be/2),M+k-At-be/2),L=zo(I),B=zn+(1-zn)*L;e.save(),e.globalAlpha=v,e.translate(A,E),e.scale(B,B),e.translate(-A,-E),Is(e,M,R,k,b,At,C,A,E),e.shadowColor=u,e.shadowBlur=ks,e.fillStyle=_s,e.fill(),e.shadowBlur=0,e.shadowColor="transparent",e.strokeStyle=f,e.lineWidth=1,e.stroke();const D=R+b/2,Q=M+Un;e.textAlign="left",e.fillStyle=d,e.fillText(g.glyph,Q,D),e.fillStyle=Cs,e.fillText(g.text,Q+y+Xn,D),e.restore()}Vn(e,"0px")}function Is(e,t,n,o,i,r,c,s,a){const l=Math.min(r,o/2,i/2);e.beginPath(),e.moveTo(t+l,n),c==="below"&&(e.lineTo(s-be/2,n),e.lineTo(s,a),e.lineTo(s+be/2,n)),e.lineTo(t+o-l,n),e.arcTo(t+o,n,t+o,n+l,l),e.lineTo(t+o,n+i-l),e.arcTo(t+o,n+i,t+o-l,n+i,l),c==="above"&&(e.lineTo(s+be/2,n+i),e.lineTo(s,a),e.lineTo(s-be/2,n+i)),e.lineTo(t+l,n+i),e.arcTo(t,n+i,t,n+i-l,l),e.lineTo(t,n+l),e.arcTo(t,n,t+l,n,l),e.closePath()}function Vn(e,t){e.letterSpacing=t}const Vo={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},at={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function Ms(e,t,n,o,i,r){const c=i/2,s=o-r/2,a=lt[t.phase]??"#6b6b75",l=e.createLinearGradient(n,s,n,s+r);l.addColorStop(0,jt(a,.14)),l.addColorStop(1,jt(a,-.18)),e.fillStyle=l,re(e,n-c,s,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-c+2,s+r*.36,i-4,Math.max(1.5,r*.1))}function Es(e,t,n,o,i){if(t.length===0)return;const r=7,c=4,s=i.fontSmall+2,a=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px ${N}`;const l=(d,p)=>{const h=[d.carName,dt(d.altitudeM),Go(d.velocity),`${Vo[d.phase]} · ${d.layer}`];let m=0;for(const S of h)m=Math.max(m,e.measureText(S).width);const g=m+r*2,y=h.length*s+c*2;let v=p==="right"?d.cx+a:d.cx-a-g;v=Math.max(2,Math.min(o-g-2,v));const _=d.cy-y/2;return{hud:d,lines:h,bx:v,by:_,bubbleW:g,bubbleH:y,side:p}},f=(d,p)=>!(d.bx+d.bubbleW<=p.bx||p.bx+p.bubbleW<=d.bx||d.by+d.bubbleH<=p.by||p.by+p.bubbleH<=d.by),u=[];t.forEach((d,p)=>{let h=l(d,p%2===0?"right":"left");if(u.some(m=>f(h,m))){const m=l(d,h.side==="right"?"left":"right");if(u.every(g=>!f(m,g)))h=m;else{const g=Math.max(...u.map(y=>y.by+y.bubbleH));h={...h,by:g+4}}}u.push(h)});for(const d of u){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",re(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=at[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,re(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let p=0;p<d.lines.length;p++){const h=d.by+c+s*p+s/2,m=d.lines[p]??"";e.fillStyle=p===0||p===3?at[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(m,d.bx+r,h)}e.restore()}}function As(e,t,n,o,i,r){if(t.length===0)return;const c=18,s=10,a=6,l=5,f=r.fontSmall+2.5,d=a*2+5*f,p=c+a+(d+l)*t.length;e.save();const h=e.createLinearGradient(n,i,n,i+p);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,re(e,n,i,o,p,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,re(e,n,i,o,p,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px ${N}`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+s,i+c/2+2);let m=i+c+a;for(const g of t){e.fillStyle="rgba(15, 15, 18, 0.55)",re(e,n+6,m,o-12,d,5),e.fill(),e.fillStyle=at[g.phase],e.fillRect(n+6,m,2,d);const y=n+s+4,v=n+o-s;let _=m+a+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px ${N}`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(g.carName,y,_),e.textAlign="right",e.fillStyle=at[g.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px ${N}`,e.fillText(Vo[g.phase].toUpperCase(),v,_);const S=g.etaSeconds!==void 0&&Number.isFinite(g.etaSeconds)?Uo(g.etaSeconds):"—",w=[["Altitude",dt(g.altitudeM)],["Velocity",Go(g.velocity)],["Dest",g.destinationName??"—"],["ETA",S]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px ${N}`;for(const[k,b]of w)_+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(k,y,_),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(b,v,_);m+=d+l}e.restore()}function xs(e,t,n,o,i,r,c,s,a,l,f){l.length=e.cars.length;for(let u=0;u<e.cars.length;u++){const d=e.cars[u];d!==void 0&&(l[u]=d.id)}l.sort((u,d)=>u-d),f.clear();for(let u=0;u<l.length;u++){const d=l[u];d!==void 0&&f.set(d,u)}a.length=e.cars.length;for(let u=0;u<e.cars.length;u++){const d=e.cars[u];if(d===void 0)continue;const p=d.y,h=d.target!==void 0?s.get(d.target):void 0,m=h!==void 0?e.stops[h]:void 0,g=m?Xo(p,m.y,d.v,i,r,c):void 0,y=f.get(d.id)??0,v=a[u];v===void 0?a[u]={cx:n,cy:t.toScreenAlt(p),altitudeM:p,velocity:d.v,phase:$n(d.v,o.get(d.id)??0,i),layer:Fn(p),carName:`Climber ${String.fromCharCode(65+y)}`,destinationName:m?.name,etaSeconds:g}:(v.cx=n,v.cy=t.toScreenAlt(p),v.altitudeM=p,v.velocity=d.v,v.phase=$n(d.v,o.get(d.id)??0,i),v.layer=Fn(p),v.carName=`Climber ${String.fromCharCode(65+y)}`,v.destinationName=m?.name,v.etaSeconds=g)}return a}const Ce=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function xt(e,t,n){return e+(t-e)*n}function Pt(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round(xt(o>>16&255,i>>16&255,n)),c=Math.round(xt(o>>8&255,i>>8&255,n)),s=Math.round(xt(o&255,i&255,n));return`#${(r<<16|c<<8|s).toString(16).padStart(6,"0")}`}function Ps(e,t){let n=0;for(;n<Ce.length-1;n++){const l=Ce[n+1];if(l===void 0||e<=l[0])break}const o=Ce[n],i=Ce[Math.min(n+1,Ce.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],c=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),s=Pt(o[1],i[1],c),a=Pt(o[2],i[2],c);return Pt(s,a,t)}const Ls=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function Bs(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),c=Math.log10(1+t.axisMaxM/1e3),s=[0,.05,.15,.35,.6,1];for(const l of s){const f=1e3*(10**(l*c)-1);r.addColorStop(l,Ps(f,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const l of Ls){const f=t.axisMaxM*l.altFrac;if(f<8e4)continue;const u=t.toScreenAlt(f),d=n+l.xFrac*(o-n),p=l.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${p.toFixed(3)})`,e.beginPath(),e.arc(d,u,l.size,0,Math.PI*2),e.fill()}e.restore();const a=La(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const l of a){const f=t.toScreenAlt(l.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(o,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(l.label,n+4,f-6))}}function Fs(e,t,n,o){const r=o-28,c=e.createLinearGradient(0,r,0,o);c.addColorStop(0,"rgba(0,0,0,0)"),c.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),c.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=c,e.fillRect(t,r,n-t,28),e.strokeStyle=ze("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function $s(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function Ds(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const c=-Math.PI/2+r*Math.PI/3,s=t+Math.cos(c)*i,a=n+Math.sin(c)*i;r===0?e.moveTo(s,a):e.lineTo(s,a)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function Os(e,t,n,o,i,r,c){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const s of t.stops){const a=n.toScreenAlt(s.y);if(a<n.shaftTop||a>n.shaftBottom)continue;const l=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-l/2,a),e.lineTo(o-5,a),e.moveTo(o+5,a),e.lineTo(o+l/2,a),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-l/2,a),e.lineTo(o-5,a-5),e.moveTo(o+l/2,a),e.lineTo(o+5,a-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(s.name,r+c-4,a-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(dt(s.y),r+c-4,a+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function Ws(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const c=Math.log10(1+Math.max(0,r)/1e3),s=i<=0?0:Math.max(0,Math.min(1,c/i));return t-s*(t-e)}}}function Ns(e,t,n,o,i,r,c){const s=Math.max(2,c.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const l=r.get(a.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const u=i.get(a.id);if(u===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,u),e.lineTo(o,d),e.stroke(),e.fillStyle=qo,e.beginPath(),e.arc(o,d,s,0,Math.PI*2),e.fill())}}function Hs(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function qs(e,t,n,o,i,r,c){c.firstDrawAt===0&&(c.firstDrawAt=performance.now());const s=(performance.now()-c.firstDrawAt)/1e3,a=r.showDayNight?Hs(s):.5,l=n>=520&&o>=360,f=Math.min(120,Math.max(72,n*.16)),u=l?Math.min(220,Math.max(160,n*.24)):0,d=l?14:0,p=i.padX,h=p+f+4,m=n-i.padX-u-d,g=(h+m)/2,y=12,v=i.padTop+24,_=o-i.padBottom-18,S=Ws(v,_,r);Bs(e,S,h+y,m-y,a),Fs(e,h+y,m-y,_),$s(e,g,S),Ds(e,g,S.shaftTop,i),Os(e,t,S,g,i,p,f);const w=Math.max(20,Math.min(34,m-h-8)),k=Math.max(16,Math.min(26,w*.72));i.carH=k,i.carW=w;const b=c.carCenters,C=c.stopIdxById;b.clear(),C.clear();for(let R=0;R<t.stops.length;R++){const I=t.stops[R];I!==void 0&&C.set(I.entity_id,R)}for(const R of t.cars)b.set(R.id,S.toScreenAlt(R.y));Ns(e,t,S,g,b,C,i);for(const R of t.cars){const I=b.get(R.id);I!==void 0&&Ms(e,R,g,I,w,k)}const M=xs(t,S,g,c.prevVelocity,c.maxSpeed,c.acceleration,c.deceleration,C,c.hudBuf,c.idSortBuf,c.idRankBuf);M.sort((R,I)=>I.altitudeM-R.altitudeM),Es(e,M,w,n-u-d,i),l&&As(e,M,n-i.padX-u,u,v,i);for(const R of t.cars)c.prevVelocity.set(R.id,R.v);if(c.prevVelocity.size>t.cars.length)for(const R of c.prevVelocity.keys())b.has(R)||c.prevVelocity.delete(R)}const Gs=1e6;function Yo(e,t){return e*Gs+t}function Us(e){return{has:(t,n)=>e.has(Yo(t,n))}}function Xs(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function Yn(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}const js=.8,zs=2;function Vs(e,t,n){const o=performance.now();for(const i of t){const r=o-i.bornAt;if(r<0)continue;const c=Math.min(1,Math.max(0,r/i.duration)),s=zo(c),a=i.startX+(i.endX-i.startX)*s,l=Math.sin(s*Math.PI*zs*2)*js,f=i.floorY+l,u=Ys(i.kind,c,s);if(u<=0)continue;const d=e.globalAlpha;e.globalAlpha=u,on(e,a,f,n.figureHeadR,i.color,i.variant),e.globalAlpha=d}}function Ys(e,t,n){return e==="board"?t<.75?1:Math.max(0,1-(t-.75)/.25):e==="alight"?t<.2?t/.2:t>.6?Math.max(0,1-(t-.6)/.4):1:.7*(1-n)**1.2}function Ks(e,t){const{count:n,enablePairs:o,halfPairW:i,now:r,stagger:c,duration:s,originX:a,endX:l,floorY:f,color:u}=t;let d=0,p=0;for(;d<n;){const h=o&&d+1<n?2:1;for(let m=0;m<h;m++){const g=h===2?m===0?-i:i:0;e.push({kind:"board",bornAt:r+p*c,duration:s,startX:a+g,endX:l+g,floorY:f,color:u,variant:K(t.stopId,d+m+t.dirOffset)})}d+=h,p++}}function Qs(e,t){const{count:n,now:o,stagger:i,duration:r,startX:c,endX:s,floorY:a,color:l,stopId:f}=t;for(let u=0;u<n;u++)e.push({kind:"abandon",bornAt:o+u*i,duration:r,startX:c,endX:s,floorY:a,color:l,variant:K(f,2e4+u)})}function Js(e,t){const{count:n,enablePairs:o,halfPairW:i,now:r,stagger:c,duration:s,startX:a,endX:l,floorY:f,color:u}=t;let d=0,p=0;for(;d<n;){const h=o&&d+1<n?2:1;for(let m=0;m<h;m++){const g=d+m,y=h===2?m===0?-i:i:0;e.push({kind:"alight",bornAt:r+p*c,duration:s,startX:a+y,endX:l+y,floorY:f,color:u,variant:t.variants[t.variants.length-1-g]??K(t.carId,g)})}d+=h,p++}}class Ko{#e;#n;#t=window.devicePixelRatio||1;#r;#l=null;#o=-1;#d=new Map;#i;#a=new Map;#s=new Map;#c=[];#p=null;#u=null;#w=new Map;#E=new Map;#A=new Map;#x=[];#P=[];#L=new Map;#h=1;#g=1;#m=1;#v=0;#b=0;#f=new Map;#k=new Map;#B=new Map;#y=new Map;#_=[];#C=new Map;#T=new Set;#F=Us(this.#T);#$=[];#D=[];#O=[];#W=new Map;#R=new Map;#N=new Map;#I=new Map;#H=[];#q=[];#G=[];#U=new Map;constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#n=o,this.#i=n,this.#S(),this.#r=()=>{this.#S()},window.addEventListener("resize",this.#r)}dispose(){window.removeEventListener("resize",this.#r)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#M()}setAirportConfig(t){this.#u=t,this.#M()}#M(){this.#w.clear(),this.#b=0,this.#f.clear()}setPhysics(t,n,o,i){Number.isFinite(t)&&t>0&&(this.#h=t),Number.isFinite(n)&&n>0&&(this.#g=n),Number.isFinite(o)&&o>0&&(this.#m=o),Number.isFinite(i)&&i>0&&(this.#v=i)}pushAssignment(t,n,o){let i=this.#f.get(t);i===void 0&&(i=new Map,this.#f.set(t,i)),i.set(o,n)}#S(){this.#t=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#t,i=n*this.#t;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#n.setTransform(this.#t,0,0,this.#t,0,0)}#X(t,n){const o=this.#_.pop();return o!==void 0?(o.start=t,o.end=n,o):{start:t,end:n}}#j(){for(const t of this.#y.values())this.#_.push(t);this.#y.clear()}draw(t,n,o,i=0){this.#S();const{clientWidth:r,clientHeight:c}=this.#e,s=this.#n;if(s.clearRect(0,0,r,c),t.stops.length===0||r===0||c===0)return;r!==this.#o&&(this.#l=Xs(r),this.#o=r);const a=this.#l;if(a===null)return;if(this.#u!==null){es(s,t,r,c,this.#u,i,this.#i,{maxSpeed:this.#h,acceleration:this.#g,deceleration:this.#m,weightCapacity:this.#v});return}if(this.#p!==null){this.#z(t,r,c,a,n,o,this.#p);return}const l=t.stops.length===2,f=this.#k;f.clear();for(const T of t.cars)f.set(T.id,T);const u=this.#G;u.length=t.stops.length;for(let T=0;T<t.stops.length;T++)u[T]=t.stops[T];u.sort((T,x)=>T.y-x.y);const d=this.#H;d.length=u.length;for(let T=0;T<u.length;T++){const x=u[T];d[T]=x===void 0?0:x.y}const p=t.stops[0];if(p===void 0)return;let h=p.y,m=p.y;for(let T=1;T<t.stops.length;T++){const x=t.stops[T];if(x===void 0)continue;const F=x.y;F<h&&(h=F),F>m&&(m=F)}const g=d.length>=3?(d.at(-1)??0)-(d.at(-2)??0):1,v=h-1,_=m+g,S=Math.max(_-v,1e-4),w=l?18:0;let k,b;if(l)k=a.padTop+w,b=c-a.padBottom-w;else{let T=1/0;for(let ee=1;ee<d.length;ee++){const We=d[ee],Ne=d[ee-1];if(We===void 0||Ne===void 0)continue;const ve=We-Ne;ve>0&&ve<T&&(T=ve)}Number.isFinite(T)||(T=1);const F=48/T,j=Math.max(0,c-a.padTop-a.padBottom)/S,Y=Math.min(j,F),pe=S*Y;b=c-a.padBottom,k=b-pe}const C=T=>b-(T-v)/S*(b-k),M=this.#d;M.forEach(T=>T.length=0);for(const T of t.cars){const x=M.get(T.line);x?x.push(T):M.set(T.line,[T])}const R=this.#q;R.length=0;for(const T of M.keys())R.push(T);R.sort((T,x)=>T-x);let I=0;for(const T of R)I+=M.get(T)?.length??0;const E=Math.max(0,r-2*a.padX-a.labelW),A=a.figureStride*2,L=a.shaftSpacing*Math.max(I-1,0),D=(E-L)/Math.max(I,1),Q=l?34:a.maxShaftInnerW,X=Math.max(a.minShaftInnerW,Math.min(Q,D*.55)),we=Math.max(0,Math.min(D-X,A+a.figureStride*4)),ln=Math.max(14,X-6);let le=1/0;if(t.stops.length>=2)for(let T=1;T<d.length;T++){const x=d[T-1],F=d[T];if(x===void 0||F===void 0)continue;const W=C(x)-C(F);W>0&&W<le&&(le=W)}const di=C(m)-2,pi=Number.isFinite(le)?le:a.carH,ui=l?a.carH:pi,fi=Math.max(14,Math.min(ui,di));if(!l&&Number.isFinite(le)){const T=Math.max(1.5,Math.min(le*.067,4)),x=a.figureStride*(T/a.figureHeadR);a.figureHeadR=T,a.figureStride=x}a.shaftInnerW=X,a.carW=ln,a.carH=fi;const hi=a.padX+a.labelW,gi=X+we,Oe=this.#$;Oe.length=0;const de=this.#B;de.clear(),this.#j();const ft=this.#y;let dn=0;for(const T of R){const x=M.get(T)??[];for(const F of x){const W=hi+dn*(gi+a.shaftSpacing),j=W,Y=W+we,pe=Y+X/2;Oe.push(pe),de.set(F.id,pe),ft.set(F.id,this.#X(j,Y)),dn++}}const ht=this.#C;ht.clear();for(let T=0;T<t.stops.length;T++){const x=t.stops[T];x!==void 0&&ht.set(x.entity_id,T)}const pn=this.#T;pn.clear();{let T=0;for(const x of R){const F=M.get(x)??[];for(const W of F){if(W.phase==="loading"||W.phase==="door-opening"||W.phase==="door-closing"){const j=Yn(t.stops,W.y);j!==void 0&&j.dist<.5&&pn.add(Yo(T,j.stop.entity_id))}T++}}}const gt=this.#W,mt=this.#R,bt=this.#N,yt=this.#I;gt.clear(),mt.clear(),bt.clear(),yt.clear();const St=this.#D;St.length=0;const wt=this.#O;wt.length=0;let un=0;for(let T=0;T<R.length;T++){const x=R[T];if(x===void 0)continue;const F=M.get(x)??[],W=Sa[T]??va,j=wa[T]??ka,Y=_a[T]??1,pe=Ia[T]??Ma,ee=Math.max(14,X*Y),We=Math.max(10,ln*Y),Ne=Math.max(10,a.carH),ve=T===2?Ta:T===3?Ra:Mt;let He=1/0,vt=-1/0,qe=1/0;for(const J of F){gt.set(J.id,ee),mt.set(J.id,We),bt.set(J.id,Ne),yt.set(J.id,ve);const ue=Oe[un];if(ue===void 0)continue;const fn=Number.isFinite(J.min_served_y)&&Number.isFinite(J.max_served_y),kt=fn?Math.max(k,C(J.max_served_y)-a.carH-2):k,mi=fn?Math.min(b,C(J.min_served_y)+2):b;St.push({cx:ue,top:kt,bottom:mi,fill:W,frame:j,width:ee}),ue<He&&(He=ue),ue>vt&&(vt=ue),kt<qe&&(qe=kt),un++}R.length>1&&Number.isFinite(He)&&Number.isFinite(qe)&&wt.push({cx:(He+vt)/2,top:qe,text:Ca[T]??`Line ${T+1}`,color:pe})}us(s,St),fs(s,wt,a),hs(s,u,C,a,Oe,r,this.#F,k,l),gs(s,t,C,a,ft,this.#f),ys(s,t,de,gt,C,a,ht);for(const T of t.cars){const x=de.get(T.id);if(x===void 0)continue;const F=mt.get(T.id)??a.carW,W=bt.get(T.id)??a.carH,j=yt.get(T.id)??Mt,Y=this.#a.get(T.id);Ss(s,T,x,F,W,C),ws(s,T,x,F,W,j,C,a,Y?.roster)}this.#V(t,de,ft,C,a,n),Vs(s,this.#c,a),o&&o.size>0&&Rs(s,this.#i,f,o,de,C,a,r)}#z(t,n,o,i,r,c,s){const a={prevVelocity:this.#w,maxSpeed:this.#h,acceleration:this.#g,deceleration:this.#m,firstDrawAt:this.#b,carCenters:this.#E,stopIdxById:this.#A,hudBuf:this.#x,idSortBuf:this.#P,idRankBuf:this.#L};qs(this.#n,t,n,o,i,s,a),this.#b=a.firstDrawAt}#V(t,n,o,i,r,c){const s=performance.now(),a=Math.max(1,c),l=xa/a,f=80/a,u=Math.max(1.5,Math.min(2.5,r.figureStride*.45)),d=this.#U;d.clear();for(const p of t.cars){const h=this.#a.get(p.id),m=n.get(p.id),g=Yn(t.stops,p.y),y=p.phase==="loading"&&g!==void 0&&g.dist<.5?g.stop:void 0,v=y!==void 0&&y.waiting_up>=y.waiting_down,_=v?0:1e4;if(h&&m!==void 0&&y!==void 0){const w=p.riders-h.riders;if(w>0&&d.set(y.entity_id,(d.get(y.entity_id)??0)+w),w!==0){const k=i(y.y),b=this.#R.get(p.id)??r.carW,C=b>=r.figureStride*3,M=Math.min(Math.abs(w),6);if(w>0){const R=o.get(p.id),I=R!==void 0?R.end-2:m-20,E=v?Wo:No,A=this.#f.get(y.entity_id);A!==void 0&&(A.delete(p.line),A.size===0&&this.#f.delete(y.entity_id)),Ks(this.#c,{count:M,enablePairs:C,halfPairW:u,now:s,stagger:f,duration:l,originX:I,endX:m,floorY:k,color:E,stopId:y.entity_id,dirOffset:_})}else{const R=this.#I.get(p.id)??Mt,I=m+b/2+14,E=h.roster.slice(Math.max(0,h.roster.length-M));Js(this.#c,{count:M,enablePairs:C,halfPairW:u,now:s,stagger:f,duration:l,startX:m,endX:I,floorY:k,color:R,variants:E,carId:p.id})}}}let S;if(h){const w=p.riders-h.riders;if(w===0)S=h.roster;else if(S=h.roster.slice(),w>0&&y!==void 0)for(let k=0;k<w;k++)S.push(K(y.entity_id,k+_));else if(w>0)for(let k=0;k<w;k++)S.push(K(p.id,S.length+k));else S.splice(S.length+w,-w)}else{S=[];for(let w=0;w<p.riders;w++)S.push(K(p.id,w))}for(;S.length>p.riders;)S.pop();for(;S.length<p.riders;)S.push(K(p.id,S.length));this.#a.set(p.id,{riders:p.riders,roster:S})}for(const p of t.stops){const h=p.waiting_up+p.waiting_down,m=this.#s.get(p.entity_id);if(m){const g=m.waiting-h,y=d.get(p.entity_id)??0,v=Math.max(0,g-y);v>0&&Qs(this.#c,{count:Math.min(v,4),now:s,stagger:f,duration:l*2.2,startX:r.padX+r.labelW+20,endX:r.padX+r.labelW-16,floorY:i(p.y),color:Ho,stopId:p.entity_id})}this.#s.set(p.entity_id,{waiting:h})}{let p=0;for(let h=0;h<this.#c.length;h++){const m=this.#c[h];m!==void 0&&s-m.bornAt<=m.duration&&(this.#c[p++]=m)}this.#c.length=p}if(this.#a.size>t.cars.length)for(const p of this.#a.keys())this.#k.has(p)||this.#a.delete(p);if(this.#s.size>t.stops.length)for(const p of this.#s.keys())this.#C.has(p)||this.#s.delete(p)}}const Zs="#f59e0b",ec=3;function tc(){const e="quest-pane";return{root:P("quest-pane",e),gridView:P("quest-grid",e),stageView:P("quest-stage-view",e),backBtn:P("quest-back-to-grid",e),title:P("quest-stage-title",e),brief:P("quest-stage-brief",e),stageStars:P("quest-stage-stars",e),editorHost:P("quest-editor",e),runBtn:P("quest-run",e),resetBtn:P("quest-reset",e),result:P("quest-result",e),progress:P("quest-progress",e),shaft:P("quest-shaft",e),shaftIdle:P("quest-shaft-idle",e)}}function Lt(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=De(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(ec-n)}function Bt(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function nc(e){const t=tc(),n=b=>{const C=Kr(b);if(C)return C;const M=ae[0];if(!M)throw new Error("quest-pane: stage registry is empty");return M},o=la(n(e.initialStageId),"grid");Lt(t,o.activeStage);const i=sa();En(i,o.activeStage);const r=ca();xn(r,o.activeStage);const c=pa();Rt(c,o.activeStage);const s=na(),a=new Ko(t.shaft,Zs);t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const l=await dr({container:t.editorHost,initialValue:Cn(o.activeStage.id)??o.activeStage.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const f=ua(),u=300;let d=null,p=!1;const h=()=>{p||(d!==null&&clearTimeout(d),d=setTimeout(()=>{Tn(o.activeStage.id,l.getValue()),d=null},u))},m=()=>{d!==null&&(clearTimeout(d),d=null,Tn(o.activeStage.id,l.getValue()))},g=b=>{p=!0;try{l.setValue(b)}finally{p=!1}};l.onDidChange(()=>{h()});const y=ma();Bn(y,o.activeStage,l);const v=()=>{Pn(o),t.shaftIdle.hidden=!1;const b=t.shaft.getContext("2d");b&&b.clearRect(0,0,t.shaft.width,t.shaft.height)},_=(b,{fromGrid:C})=>{m(),da(o,b),Lt(t,b),En(i,b),xn(r,b),Rt(c,b),Bn(y,b,l),g(Cn(b.id)??b.starterCode),l.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",v(),Bt(t,"stage"),Tt(o,"stage"),e.onStageChange?.(b.id)},S=()=>{m(),v(),t.result.textContent="",t.progress.textContent="",Bt(t,"grid"),Tt(o,"grid"),Ct(s,b=>{_(n(b),{fromGrid:!0})}),e.onBackToGrid?.()};Ct(s,b=>{_(n(b),{fromGrid:!0})});const w=e.landOn??"grid";Bt(t,w),Tt(o,w);const k=async()=>{const b=o.activeStage;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",l.clearRuntimeMarker();let C=null,M=0;o.runLoop.active=!0;const R=()=>{o.runLoop.active&&(C!==null&&a.draw(C,1),requestAnimationFrame(R))};t.shaftIdle.hidden=!0,requestAnimationFrame(R);try{const I=await ra(b,l.getValue(),{timeoutMs:1e3,onProgress:E=>{_e(o,b)&&(t.progress.textContent=aa(E))},onSnapshot:E=>{C=E,M+=1}});if(I.passed){const E=De(b.id);I.stars>E&&(Zr(b.id,I.stars),Ct(s,A=>{_(n(A),{fromGrid:!0})}),_e(o,b)&&Lt(t,o.activeStage)),_e(o,b)&&Rt(c,o.activeStage,{collapse:!1})}if(_e(o,b)){t.result.textContent="",t.progress.textContent="";const E=I.passed?Qr(b.id):void 0,A=E?()=>{_(E,{fromGrid:!1})}:void 0;fa(f,I,()=>void k(),b.failHint,A)}}catch(I){if(_e(o,b)){const E=I instanceof Error?I.message:String(I);t.result.textContent=`Error: ${E}`,t.progress.textContent="",I instanceof Po&&I.location!==null&&l.setRuntimeMarker({line:I.location.line,column:I.location.column,message:E})}}finally{if(t.runBtn.disabled=!1,Pn(o),M===0){const I=t.shaft.getContext("2d");I&&I.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{k()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${o.activeStage.title} to its starter code?`)&&(Jr(o.activeStage.id),g(o.activeStage.starterCode),l.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{S()}),{handles:t,editor:l}}let Ft=null;async function Qo(){if(!Ft){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;Ft=import(e).then(async n=>(await n.default(t),n))}return Ft}class an{#e;#n;constructor(t){this.#e=t,this.#n=t.dt()}static async create(t,n,o){const i=await Qo();return new an(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#n}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class Jo{#e;#n=0;#t=[];#r=0;#l=0;#o=0;#d=1;#i=0;constructor(t){this.#e=oc(BigInt(t>>>0))}setPhases(t){this.#t=t,this.#r=t.reduce((o,i)=>o+i.durationSec,0);let n=0;for(const o of t)o.ridersPerMin>n&&(n=o.ridersPerMin);this.#l=n,this.#o=0,this.#n=0}setIntensity(t){this.#d=Math.max(0,t)}setPatienceTicks(t){this.#i=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#t.length===0)return[];const o=t.stops.filter(s=>s.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#t[this.currentPhaseIndex()];if(!r)return[];this.#n+=r.ridersPerMin*this.#d/60*i,this.#o=(this.#o+i)%(this.#r||1);const c=[];for(;this.#n>=1;)this.#n-=1,c.push(this.#a(o,r));return c}currentPhaseIndex(){if(this.#t.length===0)return 0;let t=this.#o;for(const[n,o]of this.#t.entries())if(t-=o.durationSec,t<0)return n;return this.#t.length-1}currentPhaseLabel(){return this.#t[this.currentPhaseIndex()]?.name??""}currentPhaseRatio(){if(this.#t.length===0)return 0;const t=this.#t[this.currentPhaseIndex()];return t&&this.#l>0?t.ridersPerMin/this.#l:0}phaseProgress(){return this.#r<=0?0:Math.min(1,this.#o/this.#r)}progressInPhase(){if(this.#t.length===0)return 0;let t=this.#o;for(const n of this.#t){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#t}#a(t,n){const o=this.#s(t.length,n.originWeights);let i=this.#s(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],c=t[i];if(!r||!c)throw new Error("stop index out of bounds");const s=50+this.#u()*50;return{originStopId:r.stop_id,destStopId:c.stop_id,weight:s,...this.#i>0?{patienceTicks:this.#i}:{}}}#s(t,n){if(!n||n.length!==t)return this.#p(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#p(t);let i=this.#u()*o;for(const[r,c]of n.entries())if(i-=Math.max(0,c),i<0)return r;return t-1}#c(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#p(t){return Number(this.#c()%BigInt(t))}#u(){return Number(this.#c()>>11n)/2**53}}function oc(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const ic="#7dd3fc",rc="#fda4af";async function Kn(e,t,n,o,i){const r=vi(o,i),c=await an.create(r,t,n),s=new Ko(e.canvas,e.accent);if(s.setTetherConfig(o.tether??null),s.setAirportConfig(o.airport??null),o.tether||o.airport){const l=en(o,i);s.setPhysics(l.maxSpeed,l.acceleration,l.deceleration,l.weightCapacity)}const a=e.canvas.parentElement;if(a){const l=o.stops.length,u=o.tether?640:o.airport!==void 0?Math.max(180,Math.min(380,window.innerWidth*.3)):Math.max(200,l*16);a.style.setProperty("--shaft-min-h",`${u}px`)}return{strategy:t,sim:c,renderer:s,scenario:o,accent:e.accent,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function Te(e){e?.sim.dispose(),e?.renderer.dispose()}function Zo(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const ac=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],sc=120;function Qn(e,t,n,o){const i=e.sim.metrics();e.latestMetrics=i;for(const c of ac){const s=e.metricHistory[c];s.push(i[c]),s.length>sc&&s.shift()}const r=performance.now();for(const[c,s]of e.bubbles)s.expiresAt<=r&&e.bubbles.delete(c);e.renderer.draw(t,n,e.bubbles,o)}const cc={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},lc=1e3;function dc(e,t,n){const o=performance.now(),i=new Map;for(const c of n.stops)i.set(c.entity_id,c.name);const r=c=>i.get(c)??`stop #${c}`;for(const c of t){const s=pc(c,r);if(s===null)continue;const a=c.elevator;if(a===void 0)continue;const l=cc[c.kind]??lc;e.bubbles.set(a,{glyph:s.glyph,text:s.text,bornAt:o,expiresAt:o+l})}}function pc(e,t){switch(e.kind){case"elevator-assigned":return{glyph:"›",text:`To ${t(e.stop)}`};case"elevator-repositioning":return{glyph:"↻",text:`Reposition to ${t(e.stop)}`};case"elevator-arrived":return{glyph:"●",text:`At ${t(e.stop)}`};case"door-opened":return{glyph:"◌",text:"Doors open"};case"rider-boarded":return{glyph:"+",text:"Boarding"};case"rider-exited":return{glyph:"↓",text:`Off at ${t(e.stop)}`};default:return null}}const uc={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function Jn(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=uc[t],e.modeEl.title=t)}function fc(){const e=s=>{const a=document.getElementById(s);if(!a)throw new Error(`missing element #${s}`);return a},t=s=>document.getElementById(s),n=(s,a)=>({root:e(`pane-${s}`),canvas:e(`shaft-${s}`),name:e(`name-${s}`),mode:e(`mode-${s}`),desc:e(`desc-${s}`),metrics:e(`metrics-${s}`),trigger:e(`strategy-trigger-${s}`),popover:e(`strategy-popover-${s}`),repoTrigger:e(`repo-trigger-${s}`),repoName:e(`repo-name-${s}`),repoPopover:e(`repo-popover-${s}`),accent:a,which:s}),o=s=>{const a=document.querySelector(`.tweak-row[data-key="${s}"]`);if(!a)throw new Error(`missing tweak row for ${s}`);const l=u=>{const d=a.querySelector(u);if(!d)throw new Error(`missing ${u} in tweak row ${s}`);return d},f=u=>a.querySelector(u);return{root:a,value:l(".tweak-value"),defaultV:l(".tweak-default-v"),dec:l(".tweak-dec"),inc:l(".tweak-inc"),reset:l(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},i={};for(const s of Se)i[s]=o(s);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",ic),paneB:n("b",rc)};Yi(r);const c=document.getElementById("controls-bar");return c&&new ResizeObserver(([a])=>{if(!a)return;const l=Math.ceil(a.borderBoxSize[0]?.blockSize??a.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${l}px`)}).observe(c),r}function ei(e,t,n,o,i,r,c,s,a){const l=document.createDocumentFragment();for(const f of t){const u=document.createElement("button");u.type="button",u.className="strategy-option",u.setAttribute("role","menuitemradio"),u.setAttribute("aria-checked",f===r?"true":"false"),u.dataset[i]=f;const d=document.createElement("span");d.className="strategy-option-name";const p=document.createElement("span");if(p.className="strategy-option-label",p.textContent=n[f],d.appendChild(p),c&&f===c){const m=document.createElement("span");m.className="strategy-option-sibling",m.textContent=`also in ${s}`,d.appendChild(m)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=o[f],u.append(d,h),u.addEventListener("click",()=>{a(f)}),l.appendChild(u)}e.replaceChildren(l)}function se(e,t){const n=Fe[t],o=Eo[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function Zn(e,t,n,o,i){ei(e.repoPopover,ji,Fe,Eo,"reposition",t,n,o,i)}function Ae(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;Zn(t.paneA,o,r?i:null,"B",c=>void to(e,t,"a",c,n)),Zn(t.paneB,i,r?o:null,"A",c=>void to(e,t,"b",c,n))}function zt(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function ti(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function Vt(e){zt(e.paneA,!1),zt(e.paneB,!1)}function pt(e){Kt(e),Vt(e)}function eo(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;pt(t),r&&(Ae(e,t,o),zt(n,!0))})}async function to(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){Vt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},se(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},se(t.paneB,o)),q(e.permalink),Ae(e,t,i),Vt(t),await i(),U(t.toast,`${n==="a"?"A":"B"} park: ${Fe[o]}`)}function hc(e){document.addEventListener("click",t=>{if(!ni(e)&&!ti(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;pt(e)}})}function ce(e,t){const n=ye[t],o=Mo[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function no(e,t,n,o,i){ei(e.popover,Xi,ye,Mo,"strategy",t,n,o,i)}function xe(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;no(t.paneA,o,r?i:null,"B",c=>void io(e,t,"a",c,n)),no(t.paneB,i,r?o:null,"A",c=>void io(e,t,"b",c,n))}function Yt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function ni(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function Kt(e){Yt(e.paneA,!1),Yt(e.paneB,!1)}function oo(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;pt(t),r&&(xe(e,t,o),Yt(n,!0))})}async function io(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){Kt(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},ce(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},ce(t.paneB,o)),q(e.permalink),xe(e,t,i),Kt(t),await i(),U(t.toast,`${n==="a"?"A":"B"}: ${ye[o]}`)}function ro(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function gc(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function ut(e,t,n){let o=!1;for(const i of Se){const r=n.tweakRows[i],c=e.tweakRanges[i],s=ie(e,i,t),a=Jt(e,i),l=Zt(e,i,s);l&&(o=!0),r.value.textContent=ro(i,s),r.defaultV.textContent=ro(i,a),r.dec.disabled=s<=c.min+1e-9,r.inc.disabled=s>=c.max-1e-9,r.root.dataset.overridden=String(l),r.reset.hidden=!l;const f=Math.max(c.max-c.min,1e-9),u=Math.max(0,Math.min(1,(s-c.min)/f)),d=Math.max(0,Math.min(1,(a-c.min)/f));r.trackFill&&(r.trackFill.style.width=`${(u*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(u*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function oi(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function sn(e,t,n,o){const i=en(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},c=[e.paneA,e.paneB].filter(a=>a!==null),s=c.every(a=>a.sim.applyPhysicsLive(r));if(s)for(const a of c)a.renderer?.setPhysics(i.maxSpeed,i.acceleration,i.deceleration,i.weightCapacity);ut(n,e.permalink.overrides,t),s||o()}function mc(e,t,n){return Math.min(n,Math.max(t,e))}function bc(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function je(e,t,n,o,i){const r=G(e.permalink.scenario),c=r.tweakRanges[n],s=ie(r,n,e.permalink.overrides),a=mc(s+o*c.step,c.min,c.max),l=bc(a,c.min,c.step);wc(e,t,n,l,i)}function yc(e,t,n,o){const i=G(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},q(e.permalink),n==="cars"?(o(),U(t.toast,"Cars reset")):(sn(e,t,i,o),U(t.toast,`${gc(n)} reset`))}async function Sc(e,t,n){const o=G(e.permalink.scenario),i=Zt(o,"cars",ie(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},q(e.permalink),i?await n():sn(e,t,o,n),U(t.toast,"Parameters reset")}function wc(e,t,n,o,i){const r=G(e.permalink.scenario),c={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:wo(r,c)},q(e.permalink),n==="cars"?i():sn(e,t,r,i)}function vc(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function kc(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var Ve={exports:{}},_c=Ve.exports,ao;function Cc(){return ao||(ao=1,(function(e){(function(t,n,o){function i(a){var l=this,f=s();l.next=function(){var u=2091639*l.s0+l.c*23283064365386963e-26;return l.s0=l.s1,l.s1=l.s2,l.s2=u-(l.c=u|0)},l.c=1,l.s0=f(" "),l.s1=f(" "),l.s2=f(" "),l.s0-=f(a),l.s0<0&&(l.s0+=1),l.s1-=f(a),l.s1<0&&(l.s1+=1),l.s2-=f(a),l.s2<0&&(l.s2+=1),f=null}function r(a,l){return l.c=a.c,l.s0=a.s0,l.s1=a.s1,l.s2=a.s2,l}function c(a,l){var f=new i(a),u=l&&l.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,u&&(typeof u=="object"&&r(u,f),d.state=function(){return r(f,{})}),d}function s(){var a=4022871197,l=function(f){f=String(f);for(var u=0;u<f.length;u++){a+=f.charCodeAt(u);var d=.02519603282416938*a;a=d>>>0,d-=a,d*=a,a=d>>>0,d-=a,a+=d*4294967296}return(a>>>0)*23283064365386963e-26};return l}n&&n.exports?n.exports=c:this.alea=c})(_c,e)})(Ve)),Ve.exports}var Ye={exports:{}},Tc=Ye.exports,so;function Rc(){return so||(so=1,(function(e){(function(t,n,o){function i(s){var a=this,l="";a.x=0,a.y=0,a.z=0,a.w=0,a.next=function(){var u=a.x^a.x<<11;return a.x=a.y,a.y=a.z,a.z=a.w,a.w^=a.w>>>19^u^u>>>8},s===(s|0)?a.x=s:l+=s;for(var f=0;f<l.length+64;f++)a.x^=l.charCodeAt(f)|0,a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a}function c(s,a){var l=new i(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xor128=c})(Tc,e)})(Ye)),Ye.exports}var Ke={exports:{}},Ic=Ke.exports,co;function Mc(){return co||(co=1,(function(e){(function(t,n,o){function i(s){var a=this,l="";a.next=function(){var u=a.x^a.x>>>2;return a.x=a.y,a.y=a.z,a.z=a.w,a.w=a.v,(a.d=a.d+362437|0)+(a.v=a.v^a.v<<4^(u^u<<1))|0},a.x=0,a.y=0,a.z=0,a.w=0,a.v=0,s===(s|0)?a.x=s:l+=s;for(var f=0;f<l.length+64;f++)a.x^=l.charCodeAt(f)|0,f==l.length&&(a.d=a.x<<10^a.x>>>4),a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a.v=s.v,a.d=s.d,a}function c(s,a){var l=new i(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xorwow=c})(Ic,e)})(Ke)),Ke.exports}var Qe={exports:{}},Ec=Qe.exports,lo;function Ac(){return lo||(lo=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var f=a.x,u=a.i,d,p;return d=f[u],d^=d>>>7,p=d^d<<24,d=f[u+1&7],p^=d^d>>>10,d=f[u+3&7],p^=d^d>>>3,d=f[u+4&7],p^=d^d<<7,d=f[u+7&7],d=d^d<<13,p^=d^d<<9,f[u]=p,a.i=u+1&7,p};function l(f,u){var d,p=[];if(u===(u|0))p[0]=u;else for(u=""+u,d=0;d<u.length;++d)p[d&7]=p[d&7]<<15^u.charCodeAt(d)+p[d+1&7]<<13;for(;p.length<8;)p.push(0);for(d=0;d<8&&p[d]===0;++d);for(d==8?p[7]=-1:p[d],f.x=p,f.i=0,d=256;d>0;--d)f.next()}l(a,s)}function r(s,a){return a.x=s.x.slice(),a.i=s.i,a}function c(s,a){s==null&&(s=+new Date);var l=new i(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(f.x&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xorshift7=c})(Ec,e)})(Qe)),Qe.exports}var Je={exports:{}},xc=Je.exports,po;function Pc(){return po||(po=1,(function(e){(function(t,n,o){function i(s){var a=this;a.next=function(){var f=a.w,u=a.X,d=a.i,p,h;return a.w=f=f+1640531527|0,h=u[d+34&127],p=u[d=d+1&127],h^=h<<13,p^=p<<17,h^=h>>>15,p^=p>>>12,h=u[d]=h^p,a.i=d,h+(f^f>>>16)|0};function l(f,u){var d,p,h,m,g,y=[],v=128;for(u===(u|0)?(p=u,u=null):(u=u+"\0",p=0,v=Math.max(v,u.length)),h=0,m=-32;m<v;++m)u&&(p^=u.charCodeAt((m+32)%u.length)),m===0&&(g=p),p^=p<<10,p^=p>>>15,p^=p<<4,p^=p>>>13,m>=0&&(g=g+1640531527|0,d=y[m&127]^=p+g,h=d==0?h+1:0);for(h>=128&&(y[(u&&u.length||0)&127]=-1),h=127,m=512;m>0;--m)p=y[h+34&127],d=y[h=h+1&127],p^=p<<13,d^=d<<17,p^=p>>>15,d^=d>>>12,y[h]=p^d;f.w=g,f.X=y,f.i=h}l(a,s)}function r(s,a){return a.i=s.i,a.w=s.w,a.X=s.X.slice(),a}function c(s,a){s==null&&(s=+new Date);var l=new i(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(f.X&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xor4096=c})(xc,e)})(Je)),Je.exports}var Ze={exports:{}},Lc=Ze.exports,uo;function Bc(){return uo||(uo=1,(function(e){(function(t,n,o){function i(s){var a=this,l="";a.next=function(){var u=a.b,d=a.c,p=a.d,h=a.a;return u=u<<25^u>>>7^d,d=d-p|0,p=p<<24^p>>>8^h,h=h-u|0,a.b=u=u<<20^u>>>12^d,a.c=d=d-p|0,a.d=p<<16^d>>>16^h,a.a=h-u|0},a.a=0,a.b=0,a.c=-1640531527,a.d=1367130551,s===Math.floor(s)?(a.a=s/4294967296|0,a.b=s|0):l+=s;for(var f=0;f<l.length+20;f++)a.b^=l.charCodeAt(f)|0,a.next()}function r(s,a){return a.a=s.a,a.b=s.b,a.c=s.c,a.d=s.d,a}function c(s,a){var l=new i(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.tychei=c})(Lc,e)})(Ze)),Ze.exports}var et={exports:{}};const Fc={},$c=Object.freeze(Object.defineProperty({__proto__:null,default:Fc},Symbol.toStringTag,{value:"Module"})),Dc=kc($c);var Oc=et.exports,fo;function Wc(){return fo||(fo=1,(function(e){(function(t,n,o){var i=256,r=6,c=52,s="random",a=o.pow(i,r),l=o.pow(2,c),f=l*2,u=i-1,d;function p(S,w,k){var b=[];w=w==!0?{entropy:!0}:w||{};var C=y(g(w.entropy?[S,_(n)]:S??v(),3),b),M=new h(b),R=function(){for(var I=M.g(r),E=a,A=0;I<l;)I=(I+A)*i,E*=i,A=M.g(1);for(;I>=f;)I/=2,E/=2,A>>>=1;return(I+A)/E};return R.int32=function(){return M.g(4)|0},R.quick=function(){return M.g(4)/4294967296},R.double=R,y(_(M.S),n),(w.pass||k||function(I,E,A,L){return L&&(L.S&&m(L,M),I.state=function(){return m(M,{})}),A?(o[s]=I,E):I})(R,C,"global"in w?w.global:this==o,w.state)}function h(S){var w,k=S.length,b=this,C=0,M=b.i=b.j=0,R=b.S=[];for(k||(S=[k++]);C<i;)R[C]=C++;for(C=0;C<i;C++)R[C]=R[M=u&M+S[C%k]+(w=R[C])],R[M]=w;(b.g=function(I){for(var E,A=0,L=b.i,B=b.j,D=b.S;I--;)E=D[L=u&L+1],A=A*i+D[u&(D[L]=D[B=u&B+E])+(D[B]=E)];return b.i=L,b.j=B,A})(i)}function m(S,w){return w.i=S.i,w.j=S.j,w.S=S.S.slice(),w}function g(S,w){var k=[],b=typeof S,C;if(w&&b=="object")for(C in S)try{k.push(g(S[C],w-1))}catch{}return k.length?k:b=="string"?S:S+"\0"}function y(S,w){for(var k=S+"",b,C=0;C<k.length;)w[u&C]=u&(b^=w[u&C]*19)+k.charCodeAt(C++);return _(w)}function v(){try{var S;return d&&(S=d.randomBytes)?S=S(i):(S=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(S)),_(S)}catch{var w=t.navigator,k=w&&w.plugins;return[+new Date,t,k,t.screen,_(n)]}}function _(S){return String.fromCharCode.apply(0,S)}if(y(o.random(),n),e.exports){e.exports=p;try{d=Dc}catch{}}else o["seed"+s]=p})(typeof self<"u"?self:Oc,[],Math)})(et)),et.exports}var $t,ho;function Nc(){if(ho)return $t;ho=1;var e=Cc(),t=Rc(),n=Mc(),o=Ac(),i=Pc(),r=Bc(),c=Wc();return c.alea=e,c.xor128=t,c.xorwow=n,c.xorshift7=o,c.xor4096=i,c.tychei=r,$t=c,$t}var Hc=Nc();const qc=vc(Hc),st=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],Dt=st.reduce((e,t)=>t.length<e.length?t:e).length,Ot=st.reduce((e,t)=>t.length>e.length?t:e).length;function Gc(e){const t=e?.seed?new qc(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let p=typeof n!="number"?Dt:s(n);const h=typeof o!="number"?Ot:s(o);p>h&&(p=h);let m=!1,g;for(;!m;)g=c(),m=g.length<=h&&g.length>=p;return g}function c(){return st[a(st.length)]}function s(p){return p<Dt&&(p=Dt),p>Ot&&(p=Ot),p}function a(p){const h=t?t():Math.random();return Math.floor(h*p)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=p=>p),typeof e.separator!="string"&&(e.separator=" ");const l=e.min+a(e.max+1-e.min);let f=[],u="",d=0;for(let p=0;p<l*e.wordsPerString;p++)d===e.wordsPerString-1?u+=e.formatter(r(),d):u+=e.formatter(r(),d)+e.separator,d++,(p+1)%e.wordsPerString===0&&(f.push(u),u="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const ii=e=>`${e}×`,ri=e=>`${e.toFixed(1)}×`;function ai(){const e=Gc({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}const Uc="LoopSchedule",Xc="Fixed-headway timetable on a one-way loop.",jc="—";function cn(e,t){const n=t.airport!==void 0;if(e.compareToggle.disabled=n,e.paneA.trigger.disabled=n,e.paneB.trigger.disabled=n,e.paneA.repoTrigger.disabled=n,e.paneB.repoTrigger.disabled=n,n){e.compareToggle.checked=!1,e.layout.dataset.mode="single";for(const o of[e.paneA,e.paneB])o.name.textContent=Uc,o.desc.textContent=Xc,o.repoName.textContent=jc}return n}function zc(e,t){const n=G(e.scenario);t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=ii(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=ri(e.intensity),ce(t.paneA,e.strategyA),ce(t.paneB,e.strategyB),se(t.paneA,e.repositionA),se(t.paneB,e.repositionB),Ao(t,e.scenario),cn(t,n)?e.compare=!1:(t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single"),Object.keys(e.overrides).length>0&&oi(t,!0),ut(n,e.overrides,t)}function Pe(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function si(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function ci(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function Vc(e){if(e.length<2)return{d:"M 0 13 L 100 13",lastX:100,lastY:13};let t=e[0]??0,n=e[0]??0;for(let a=1;a<e.length;a++){const l=e[a];l!==void 0&&(l<t&&(t=l),l>n&&(n=l))}const o=n-t,i=e.length;let r="",c=0,s=7;for(let a=0;a<i;a++){const l=a/(i-1)*100,f=o>0?13-((e[a]??0)-t)/o*12:7;r+=`${a===0?"M":"L"} ${l.toFixed(2)} ${f.toFixed(2)} `,c=l,s=f}return{d:r.trim(),lastX:c,lastY:s}}const Wt="http://www.w3.org/2000/svg",Qt=[["wait avg","avg_wait_s"],["wait max","max_wait_s"],["delivered","delivered"],["abandoned","abandoned"],["util","utilization"]];function Yc(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Kc(e,t,n){const o=go(e,n),i=go(t,n),r=o-i,c=r>0?"▴":"▾",s=r>0?"+":r<0?"−":"",a=Math.abs(r);switch(n){case"avg_wait_s":case"max_wait_s":return`${c} ${s}${a.toFixed(1)} s`;case"delivered":case"abandoned":return`${c} ${s}${a.toFixed(0)}`;case"utilization":return`${c} ${s}${(a*100).toFixed(0)}%`}}function go(e,t){switch(t){case"avg_wait_s":return e.avg_wait_s;case"max_wait_s":return e.max_wait_s;case"delivered":return e.delivered;case"abandoned":return e.abandoned;case"utilization":return e.utilization}}function Qc(e,t){const n=(p,h,m,g)=>Math.abs(p-h)<m?["tie","tie"]:(g?p>h:p<h)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,c]=n(e.max_wait_s,t.max_wait_s,.05,!1),[s,a]=n(e.delivered,t.delivered,.5,!0),[l,f]=n(e.abandoned,t.abandoned,.5,!1),[u,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:s,abandoned:l,utilization:u},b:{avg_wait_s:i,max_wait_s:c,delivered:a,abandoned:f,utilization:d}}}function mo(e){const t=document.createDocumentFragment();for(const[n]of Qt){const o=ne("div","metric-row"),i=document.createElementNS(Wt,"svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS(Wt,"path"));const r=document.createElementNS(Wt,"circle");r.classList.add("metric-spark-dot"),r.setAttribute("r","1.4"),i.appendChild(r),o.append(ne("span","metric-k",n),ne("span","metric-v"),ne("span","metric-d"),i),t.appendChild(o)}e.replaceChildren(t)}function Nt(e,t,n,o,i){const r=e.children;for(let c=0;c<Qt.length;c++){const s=r[c];if(!s)continue;const a=Qt[c];if(!a)continue;const l=a[1],f=n?n[l]:"";s.dataset.verdict!==f&&(s.dataset.verdict=f);const u=s.children[1],d=Yc(t,l);u.textContent!==d&&(u.textContent=d);const p=s.children[2],m=i!==null&&f!=="tie"&&f!==""?Kc(t,i,l):"";p.textContent!==m&&(p.textContent=m);const g=s.children[3],y=g.firstElementChild,v=g.children[1],_=Vc(o[l]);y.getAttribute("d")!==_.d&&y.setAttribute("d",_.d);const S=_.lastX.toFixed(2),w=_.lastY.toFixed(2);v.getAttribute("cx")!==S&&v.setAttribute("cx",S),v.getAttribute("cy")!==w&&v.setAttribute("cy",w)}}const Jc=200;function li(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function te(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=G(e.permalink.scenario);e.traffic=new Jo(Io(e.permalink.seed)),li(e,o),Te(e.paneA),Te(e.paneB),e.paneA=null,e.paneB=null;try{const i=await Kn(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);ce(t.paneA,e.permalink.strategyA),se(t.paneA,e.permalink.repositionA),mo(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await Kn(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),ce(t.paneB,e.permalink.strategyB),se(t.paneB,e.permalink.repositionB),mo(t.paneB.metrics)}catch(c){throw Te(i),c}if(n!==e.initToken){Te(i),Te(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,si(e,t),ci(e,t),ut(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&U(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function Zc(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<Jc&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if(Zo(e,c=>{const s=c.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);s.kind==="err"&&console.warn(`spawnRider failed (seed): ${s.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(li(e,G(e.permalink.scenario)),e.seeding=null)}function el(e,t){const n=()=>te(e,t),o={renderPaneStrategyInfo:ce,renderPaneRepositionInfo:se,refreshStrategyPopovers:()=>{xe(e,t,n),Ae(e,t,n)},renderTweakPanel:()=>{const r=G(e.permalink.scenario);ut(r,e.permalink.overrides,t)},applyGating:r=>cn(t,r)};t.scenarioCards.addEventListener("click",r=>{const c=r.target;if(!(c instanceof HTMLElement))return;const s=c.closest(".scenario-card");if(!s)return;const a=s.dataset.scenarioId;!a||a===e.permalink.scenario||xo(e,t,a,n,o)}),oo(e,t,t.paneA,n),oo(e,t,t.paneB,n),eo(e,t,t.paneA,n),eo(e,t,t.paneB,n),xe(e,t,n),Ae(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},q(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",xe(e,t,n),Ae(e,t,n),te(e,t).then(()=>{U(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||O.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},q(e.permalink),te(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=ai();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},q(e.permalink),te(e,t).then(()=>{U(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=ii(r)}),t.speedInput.addEventListener("change",()=>{q(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=ri(r)}),t.intensityInput.addEventListener("change",()=>{q(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{te(e,t),U(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";oi(t,r)});for(const r of Se){const c=t.tweakRows[r];gn(c.dec,()=>{je(e,t,r,-1,n)}),gn(c.inc,()=>{je(e,t,r,1,n)}),c.reset.addEventListener("click",()=>{yc(e,t,r,n)}),c.root.addEventListener("keydown",s=>{s.key==="ArrowUp"||s.key==="ArrowRight"?(s.preventDefault(),je(e,t,r,1,n)):(s.key==="ArrowDown"||s.key==="ArrowLeft")&&(s.preventDefault(),je(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{Sc(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=Ro(e.permalink),c=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(c).then(()=>{U(t.toast,"Permalink copied")},()=>{U(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{Pe(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{Pe(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&Pe(t,!1)}),tl(e,t,o),hc(t)}function tl(e,t,n){window.addEventListener("keydown",o=>{if(e.permalink.mode==="quest")return;if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable||o.target.closest(".monaco-editor"))return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),Pe(t,t.shortcutSheet.hidden);return}case"Escape":{if(ni(t)||ti(t)){o.preventDefault(),pt(t);return}t.shortcutSheet.hidden||(o.preventDefault(),Pe(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=Be.length){const r=Be[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),xo(e,t,r.id,()=>te(e,t),n))}})}const nl="elevator-core playground",bo="In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";function yo(e){yi(ol(e))}function ol(e){if(e.mode==="quest")return{title:`Quest curriculum — ${nl}`,description:"Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time."};const n=G(e.scenario).label,o=ye[e.strategyA],i=ye[e.strategyB],r=Fe[e.repositionA],c=Fe[e.repositionB];if(e.compare){const l=`${n}: ${o} vs ${i} — Elevator dispatch playground`,f=`Compare ${o} (parking: ${r}) against ${i} (parking: ${c}) dispatch on the ${n.toLowerCase()} scenario. ${bo}`;return{title:l,description:f}}const s=`${n}: ${o} dispatch — Elevator dispatch playground`,a=`Watch ${o} dispatch (parking: ${r}) handle live rider traffic on the ${n.toLowerCase()} scenario. ${bo}`;return{title:s,description:a}}function So(e,t){e.sim.step(t);const n=e.sim.drainEvents();if(n.length===0)return null;const o=e.sim.snapshot();dc(e,n,o);const i=new Map;for(const r of o.cars)i.set(r.id,r.line);for(const r of n)if(r.kind==="elevator-assigned"){const c=i.get(r.elevator);c!==void 0&&e.renderer.pushAssignment(r.stop,r.elevator,c)}return o}function il(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=Qc(t.latestMetrics,n.latestMetrics);Nt(t.metricsEl,t.latestMetrics,o.a,t.metricHistory,n.latestMetrics),Nt(n.metricsEl,n.latestMetrics,o.b,n.metricHistory,t.latestMetrics)}else Nt(t.metricsEl,t.latestMetrics,null,t.metricHistory,null);Jn(t),n&&Jn(n)}function rl(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const c=e.paneA,s=e.paneB,a=c!==null&&(!e.permalink.compare||s!==null);if(e.running&&e.ready&&a){const l=e.permalink.speed;let f=So(c,l);s&&So(s,l),e.seeding&&(Zc(e),f=null);const d=Math.min(r,4/60)*l;let p=[];if(!e.seeding){const y=f??c.sim.snapshot();p=e.traffic.drainSpawns(y,d),f=y}for(const y of p)Zo(e,v=>{const _=v.sim.spawnRider(y.originStopId,y.destStopId,y.weight,y.patienceTicks);_.kind==="err"&&console.warn(`spawnRider failed: ${_.error}`)});const h=e.permalink.speed,m=e.traffic.currentPhaseRatio(),g=p.length>0||f===null?c.sim.snapshot():f;Qn(c,g,h,m),s&&Qn(s,s.sim.snapshot(),h,m),il(e),(n+=1)%4===0&&(si(e,t),ci(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function al(){Qo().catch(()=>{});const t=fc(),n=new URLSearchParams(window.location.search).has("k"),o={...O,...Gi(window.location.search)};if(!n){o.seed=ai();const s=new URL(window.location.href);s.searchParams.set("k",o.seed),window.history.replaceState(null,"",s.toString())}Ki(o);const i=G(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=wo(i,o.overrides),Zi(o.mode),er(o.mode),zc(o,t);const c={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new Jo(Io(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(el(c,t),Hi(yo),yo(o),bi(),await te(c,t),cn(t,i),c.ready=!0,rl(c,t),c.permalink.mode==="quest"){const s=new URLSearchParams(window.location.search).has("qs");await nc({initialStageId:c.permalink.questStage,landOn:s?"stage":"grid",onStageChange:a=>{c.permalink.questStage=a,q(c.permalink)},onBackToGrid:()=>{c.permalink.questStage=O.questStage,q(c.permalink)}})}}al();export{ot as _};
