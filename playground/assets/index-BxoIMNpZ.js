const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-BRCOjplT.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const s of r.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&o(s)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function ie(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let un=0;function H(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(un),un=window.setTimeout(()=>{e.classList.remove("show")},1600)}function fn(e,t){let i=0,r=0;const s=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",a=>{e.disabled||(a.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){s();return}t()},70)},380))}),e.addEventListener("pointerup",s),e.addEventListener("pointerleave",s),e.addEventListener("pointercancel",s),e.addEventListener("blur",s),e.addEventListener("click",a=>{a.pointerType||t()})}function pi(){document.getElementById("seo-fallback")?.remove()}function ui(e){document.title!==e.title&&(document.title=e.title),_e('meta[name="description"]',"content",e.description),_e('meta[property="og:title"]',"content",e.title),_e('meta[property="og:description"]',"content",e.description),_e('meta[name="twitter:title"]',"content",e.title),_e('meta[name="twitter:description"]',"content",e.description)}function _e(e,t,n){const o=document.querySelector(e);o&&o.getAttribute(t)!==n&&o.setAttribute(t,n)}function re(e,t,n){const o=Zt(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return mo(i,r.min,r.max)}function Zt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return ho(n.doorOpenTicks,n.doorTransitionTicks)}}function en(e,t,n){const o=Zt(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function go(e,t){const n={};for(const o of Se){const i=t[o];i!==void 0&&en(e,o,i)&&(n[o]=i)}return n}const Se=["cars","maxSpeed","weightCapacity","doorCycleSec"];function fi(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=ho(n,o),r=mo(n/(i*tt),.1,.9),s=Math.max(2,Math.round(t*tt)),a=Math.max(1,Math.round(s*r)),l=Math.max(1,Math.round((s-a)/2));return{openTicks:a,transitionTicks:l}}function ho(e,t){return(e+2*t)/tt}function tn(e,t){const n=e.elevatorDefaults,o=re(e,"maxSpeed",t),i=re(e,"weightCapacity",t),r=re(e,"doorCycleSec",t),{openTicks:s,transitionTicks:a}=fi(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:s,doorTransitionTicks:a}}function gi(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function hi(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(re(e,"cars",t)),i=tn(e,t),r=gi(e.stops.length,o),s=e.stops.map((l,c)=>`        StopConfig(id: StopId(${c}), name: ${Gt(l.name)}, position: ${j(l.positionM)}),`).join(`
`),a=r.map((l,c)=>bi(c,i,l,mi(c,o))).join(`
`);return`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: ${Gt(e.buildingName)},
        stops: [
${s}
        ],
    ),
    elevators: [
${a}
    ],
    simulation: SimulationParams(ticks_per_second: ${j(tt)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${j(e.passengerWeightRange[0])}, ${j(e.passengerWeightRange[1])}),
    ),
)`}const tt=60;function mo(e,t,n){return Math.min(n,Math.max(t,e))}function mi(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function bi(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${j(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${j(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${Gt(o)},
            max_speed: ${j(t.maxSpeed)}, acceleration: ${j(t.acceleration)}, deceleration: ${j(t.deceleration)},
            weight_capacity: ${j(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function Gt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function j(e){return Number.isInteger(e)?`${e}.0`:String(e)}const bo=[{name:"Main Terminal",positionM:0},{name:"Concourse B",positionM:600},{name:"Concourse C",positionM:1200},{name:"Concourse D",positionM:1800}];function X(e){return Array.from({length:bo.length},(t,n)=>e(n))}const yi=[{name:"Steady operations",durationSec:90,ridersPerMin:16,originWeights:X(e=>e===0?2:1),destWeights:X(e=>e===0?1.6:1)},{name:"Arrival at Concourse B",durationSec:60,ridersPerMin:38,originWeights:X(e=>e===1?8:1),destWeights:X(e=>e===0?6:e===1?0:1)},{name:"Quiet between flights",durationSec:60,ridersPerMin:10,originWeights:X(()=>1),destWeights:X(()=>1)},{name:"Arrival at Concourse C",durationSec:60,ridersPerMin:36,originWeights:X(e=>e===2?8:1),destWeights:X(e=>e===0?5:e===2?0:1.5)},{name:"Arrival at Concourse D",durationSec:60,ridersPerMin:34,originWeights:X(e=>e===3?8:1),destWeights:X(e=>e===0?6:e===3?0:1.2)}],Si={id:"airport-pedway",label:"Airport pedway",description:"Two parallel people-mover tracks linking the main terminal to three concourses 600 m apart. Three trains per track run on roughly equal headway and stop at every station — the dispatch story is keeping the trains evenly spaced as flight arrivals dump passengers onto specific platforms.",defaultStrategy:"scan",defaultReposition:"spread",disableCompare:!0,phases:yi,seedSpawns:0,abandonAfterSec:600,featureHint:"Two parallel tracks, three trains each, every train stops at every station. Watch how the headway evolves when a flight dumps riders onto one platform at once.",buildingName:"Airport Concourse",stops:bo.map(e=>({name:e.name,positionM:e.positionM})),defaultCars:6,elevatorDefaults:{maxSpeed:15,acceleration:1.5,deceleration:1.5,weightCapacity:2400,doorOpenTicks:600,doorTransitionTicks:60},tweakRanges:{cars:{min:6,max:6,step:1},maxSpeed:{min:8,max:25,step:1},weightCapacity:{min:1500,max:3500,step:100},doorCycleSec:{min:8,max:18,step:1}},passengerMeanIntervalTicks:90,passengerWeightRange:[55,95],ron:`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Airport Concourse",
        stops: [
            StopConfig(id: StopId(0), name: "Main Terminal", position: 0.0),
            StopConfig(id: StopId(1), name: "Concourse B",   position: 600.0),
            StopConfig(id: StopId(2), name: "Concourse C",   position: 1200.0),
            StopConfig(id: StopId(3), name: "Concourse D",   position: 1800.0),
        ],
        lines: Some([
            LineConfig(
                id: 0, name: "Outbound",
                serves: [StopId(0), StopId(1), StopId(2), StopId(3)],
                orientation: Horizontal,
                elevators: [
                    ElevatorConfig(
                        id: 0, name: "PT-A1",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(0),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                    ElevatorConfig(
                        id: 1, name: "PT-A2",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(1),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                    ElevatorConfig(
                        id: 2, name: "PT-A3",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(2),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                ],
            ),
            LineConfig(
                id: 1, name: "Inbound",
                serves: [StopId(3), StopId(2), StopId(1), StopId(0)],
                orientation: Horizontal,
                elevators: [
                    ElevatorConfig(
                        id: 3, name: "PT-B1",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(3),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                    ElevatorConfig(
                        id: 4, name: "PT-B2",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(2),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                    ElevatorConfig(
                        id: 5, name: "PT-B3",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(1),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                ],
            ),
        ]),
        groups: Some([
            GroupConfig(id: 0, name: "Outbound", lines: [0], dispatch: Scan, reposition: Some(SpreadEvenly)),
            GroupConfig(id: 1, name: "Inbound",  lines: [1], dispatch: Scan, reposition: Some(SpreadEvenly)),
        ]),
    ),
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 90,
        weight_range: (55.0, 95.0),
    ),
)`},yo={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function Ue(e){return Array.from({length:e},()=>1)}const fe=5,vi=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:fe},(e,t)=>t===fe-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:Ue(fe),destWeights:Ue(fe)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:Ue(fe),destWeights:Ue(fe)}],wi={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:vi,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...yo,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},nt=19,Ut=16,xe=4,So=(1+nt)*xe,Ie=1,Ee=41,Ae=42,ki=43;function z(e){return Array.from({length:ki},(t,n)=>e(n))}const ge=e=>e===Ie||e===Ee||e===Ae,_i=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:z(e=>e===0?20:e===Ie?2:e===Ee?1.2:e===Ae?.2:.1),destWeights:z(e=>e===0?0:e===Ie?.3:e===Ee?.4:e===Ae?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:z(e=>ge(e)?.5:1),destWeights:z(e=>ge(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:z(e=>e===21?4:ge(e)?.25:1),destWeights:z(e=>e===21?5:ge(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:z(e=>e===0||e===Ie||e===21?.3:e===Ee?.4:e===Ae?1.2:1),destWeights:z(e=>e===0?20:e===Ie?1:e===Ee?.6:e===Ae?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:z(e=>ge(e)?1.5:.2),destWeights:z(e=>ge(e)?1.5:.2)}];function Ci(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let a=1;a<=nt;a++){const l=1+a,c=a*xe;e.push(`        StopConfig(id: StopId(${l.toString().padStart(2," ")}), name: "Floor ${a}",    position: ${c.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${So.toFixed(1)}),`);for(let a=21;a<=20+Ut;a++){const l=1+a,c=a*xe;e.push(`        StopConfig(id: StopId(${l}), name: "Floor ${a}",   position: ${c.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:nt},(a,l)=>2+l),21],n=[21,...Array.from({length:Ut},(a,l)=>22+l)],o=[1,21,38,39,40],i=[1,0,41,42],r=a=>a.map(l=>`StopId(${l})`).join(", "),s=(a,l,c,f)=>`                ElevatorConfig(
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
)`}const Ti=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:nt},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*xe})),{name:"Sky Lobby",positionM:So},...Array.from({length:Ut},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*xe})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],Ri={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:_i,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:Ti,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...yo,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:Ci()},gn=1e5,hn=4e5,mn=35786e3,Ii=1e8,Ei=4;function Xe(e){return Array.from({length:Ei},(t,n)=>e(n))}const Ai={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:Xe(e=>e===0?6:1),destWeights:Xe(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:Xe(e=>e===0?0:e===1?1:e===2?3:5),destWeights:Xe(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:gn},{name:"LEO Transfer",positionM:hn},{name:"GEO Platform",positionM:mn}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:Ii,showDayNight:!1},ron:`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${gn.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${hn.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${mn.toFixed(1)}),
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
)`},Fe=[Ri,Ai,Si,wi];function N(e){const t=Fe.find(o=>o.id===e);if(t)return t;const n=Fe[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}function vo(e){return e.compare&&N(e.scenario).disableCompare!==!0}const wo={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},$={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},Mi=["scan","look","nearest","etd","destination","rsr"],Pi=["adaptive","predictive","lobby","spread","none"];function bn(e,t){return e!==null&&Mi.includes(e)?e:t}function yn(e,t){return e!==null&&Pi.includes(e)?e:t}const Xt=new Set;function Li(e){return Xt.add(e),()=>Xt.delete(e)}function q(e){const t=ko(e);if(window.location.search!==t){window.history.replaceState(null,"",t);for(const n of Xt)n(e)}}function Bi(e,t){return e==="compare"||e==="quest"?e:t}function ko(e){const t=new URLSearchParams;e.mode!==$.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==$.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=N(e.scenario).defaultReposition,o=n??$.repositionA,i=n??$.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of Se){const s=e.overrides[r];s!==void 0&&Number.isFinite(s)&&t.set(wo[r],Fi(s))}return`?${t.toString()}`}function xi(e){const t=new URLSearchParams(e),n={};for(const o of Se){const i=t.get(wo[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:Bi(t.get("m"),$.mode),questStage:(t.get("qs")??"").trim()||$.questStage,scenario:t.get("s")??$.scenario,strategyA:bn(t.get("a")??t.get("d"),$.strategyA),strategyB:bn(t.get("b"),$.strategyB),repositionA:yn(t.get("pa"),$.repositionA),repositionB:yn(t.get("pb"),$.repositionB),compare:t.has("c")?t.get("c")==="1":$.compare,seed:(t.get("k")??"").trim()||$.seed,intensity:Sn(t.get("i"),$.intensity),speed:Sn(t.get("x"),$.speed),overrides:n}}function Sn(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function Fi(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function _o(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const $i=["scan","look","nearest","etd","destination","rsr"],ye={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},Co={scan:"Sweep end-to-end, reverse at each end.",look:"Sweep until last call, then reverse.",nearest:"Assign each call to the closest car.",etd:"Assign by estimated time-to-destination.",destination:"Riders enter destination at the lobby; the group optimises.",rsr:"ETD penalised by queue length."},Di=["adaptive","predictive","lobby","spread","none"],$e={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},To={adaptive:"Switch by traffic mode; the default.",predictive:"Park near the most-active floor.",lobby:"Return idle cars to the lobby.",spread:"Fan idle cars across the shaft.",none:"Idle cars stay where they finished."},Oi="scenario-card inline-flex items-center gap-1.5 px-2 py-1 border-b-2 border-b-transparent text-content-tertiary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:text-content aria-pressed:text-content aria-pressed:border-b-accent max-md:flex-none max-md:snap-start",Wi="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function Ni(e){const t=document.createDocumentFragment();Fe.forEach((n,o)=>{const i=ie("button",Oi);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(ie("span","",n.label),ie("span",Wi,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function Ro(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}function Io(e,t,n,o,i,r,s,a,l){const c=document.createDocumentFragment();for(const f of t){const p=document.createElement("button");p.type="button",p.className="strategy-option",p.setAttribute("role","menuitemradio"),p.setAttribute("aria-checked",f===r?"true":"false"),p.dataset[i]=f;const d=document.createElement("span");d.className="strategy-option-name";const u=document.createElement("span");if(u.className="strategy-option-label",u.textContent=n[f],d.appendChild(u),s&&f===s){const h=document.createElement("span");h.className="strategy-option-sibling",h.textContent=`also in ${a}`,d.appendChild(h)}const g=document.createElement("span");g.className="strategy-option-desc",g.textContent=o[f],p.append(d,g),p.addEventListener("click",()=>{l(f)}),c.appendChild(p)}e.replaceChildren(c)}function ae(e,t){const n=$e[t],o=To[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function vn(e,t,n,o,i){Io(e.repoPopover,Di,$e,To,"reposition",t,n,o,i)}function Pe(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;vn(t.paneA,o,r?i:null,"B",s=>void kn(e,t,"a",s,n)),vn(t.paneB,i,r?o:null,"A",s=>void kn(e,t,"b",s,n))}function zt(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function Eo(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function jt(e){zt(e.paneA,!1),zt(e.paneB,!1)}function ct(e){Yt(e),jt(e)}function wn(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;ct(t),r&&(Pe(e,t,o),zt(n,!0))})}async function kn(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){jt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},ae(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},ae(t.paneB,o)),q(e.permalink),Pe(e,t,i),jt(t),await i(),H(t.toast,`${n==="a"?"A":"B"} park: ${$e[o]}`)}function Hi(e){document.addEventListener("click",t=>{if(!Ao(e)&&!Eo(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;ct(e)}})}function se(e,t){const n=ye[t],o=Co[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function _n(e,t,n,o,i){Io(e.popover,$i,ye,Co,"strategy",t,n,o,i)}function Le(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;_n(t.paneA,o,r?i:null,"B",s=>void Tn(e,t,"a",s,n)),_n(t.paneB,i,r?o:null,"A",s=>void Tn(e,t,"b",s,n))}function Vt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function Ao(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function Yt(e){Vt(e.paneA,!1),Vt(e.paneB,!1)}function Cn(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;ct(t),r&&(Le(e,t,o),Vt(n,!0))})}async function Tn(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){Yt(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},se(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},se(t.paneB,o)),q(e.permalink),Le(e,t,i),Yt(t),await i(),H(t.toast,`${n==="a"?"A":"B"}: ${ye[o]}`)}function Rn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function qi(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function dt(e,t,n){let o=!1;for(const i of Se){const r=n.tweakRows[i],s=e.tweakRanges[i],a=re(e,i,t),l=Zt(e,i),c=en(e,i,a);c&&(o=!0),r.value.textContent=Rn(i,a),r.defaultV.textContent=Rn(i,l),r.dec.disabled=a<=s.min+1e-9,r.inc.disabled=a>=s.max-1e-9,r.root.dataset.overridden=String(c),r.reset.hidden=!c;const f=Math.max(s.max-s.min,1e-9),p=Math.max(0,Math.min(1,(a-s.min)/f)),d=Math.max(0,Math.min(1,(l-s.min)/f));r.trackFill&&(r.trackFill.style.width=`${(p*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(p*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function Mo(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function nn(e,t,n,o){const i=tn(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},s=[e.paneA,e.paneB].filter(l=>l!==null),a=s.every(l=>l.sim.applyPhysicsLive(r));if(a)for(const l of s)l.renderer?.setTetherPhysics(i.maxSpeed,i.acceleration,i.deceleration);dt(n,e.permalink.overrides,t),a||o()}function Gi(e,t,n){return Math.min(n,Math.max(t,e))}function Ui(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function ze(e,t,n,o,i){const r=N(e.permalink.scenario),s=r.tweakRanges[n],a=re(r,n,e.permalink.overrides),l=Gi(a+o*s.step,s.min,s.max),c=Ui(l,s.min,s.step);ji(e,t,n,c,i)}function Xi(e,t,n,o){const i=N(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},q(e.permalink),n==="cars"?(o(),H(t.toast,"Cars reset")):(nn(e,t,i,o),H(t.toast,`${qi(n)} reset`))}async function zi(e,t,n){const o=N(e.permalink.scenario),i=en(o,"cars",re(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},q(e.permalink),i?await n():nn(e,t,o,n),H(t.toast,"Parameters reset")}function ji(e,t,n,o,i){const r=N(e.permalink.scenario),s={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:go(r,s)},q(e.permalink),n==="cars"?i():nn(e,t,r,i)}function Vi(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Yi(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var je={exports:{}},Ki=je.exports,In;function Qi(){return In||(In=1,(function(e){(function(t,n,o){function i(l){var c=this,f=a();c.next=function(){var p=2091639*c.s0+c.c*23283064365386963e-26;return c.s0=c.s1,c.s1=c.s2,c.s2=p-(c.c=p|0)},c.c=1,c.s0=f(" "),c.s1=f(" "),c.s2=f(" "),c.s0-=f(l),c.s0<0&&(c.s0+=1),c.s1-=f(l),c.s1<0&&(c.s1+=1),c.s2-=f(l),c.s2<0&&(c.s2+=1),f=null}function r(l,c){return c.c=l.c,c.s0=l.s0,c.s1=l.s1,c.s2=l.s2,c}function s(l,c){var f=new i(l),p=c&&c.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,p&&(typeof p=="object"&&r(p,f),d.state=function(){return r(f,{})}),d}function a(){var l=4022871197,c=function(f){f=String(f);for(var p=0;p<f.length;p++){l+=f.charCodeAt(p);var d=.02519603282416938*l;l=d>>>0,d-=l,d*=l,l=d>>>0,d-=l,l+=d*4294967296}return(l>>>0)*23283064365386963e-26};return c}n&&n.exports?n.exports=s:this.alea=s})(Ki,e)})(je)),je.exports}var Ve={exports:{}},Ji=Ve.exports,En;function Zi(){return En||(En=1,(function(e){(function(t,n,o){function i(a){var l=this,c="";l.x=0,l.y=0,l.z=0,l.w=0,l.next=function(){var p=l.x^l.x<<11;return l.x=l.y,l.y=l.z,l.z=l.w,l.w^=l.w>>>19^p^p>>>8},a===(a|0)?l.x=a:c+=a;for(var f=0;f<c.length+64;f++)l.x^=c.charCodeAt(f)|0,l.next()}function r(a,l){return l.x=a.x,l.y=a.y,l.z=a.z,l.w=a.w,l}function s(a,l){var c=new i(a),f=l&&l.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,g=(d+u)/(1<<21);while(g===0);return g},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=s:this.xor128=s})(Ji,e)})(Ve)),Ve.exports}var Ye={exports:{}},er=Ye.exports,An;function tr(){return An||(An=1,(function(e){(function(t,n,o){function i(a){var l=this,c="";l.next=function(){var p=l.x^l.x>>>2;return l.x=l.y,l.y=l.z,l.z=l.w,l.w=l.v,(l.d=l.d+362437|0)+(l.v=l.v^l.v<<4^(p^p<<1))|0},l.x=0,l.y=0,l.z=0,l.w=0,l.v=0,a===(a|0)?l.x=a:c+=a;for(var f=0;f<c.length+64;f++)l.x^=c.charCodeAt(f)|0,f==c.length&&(l.d=l.x<<10^l.x>>>4),l.next()}function r(a,l){return l.x=a.x,l.y=a.y,l.z=a.z,l.w=a.w,l.v=a.v,l.d=a.d,l}function s(a,l){var c=new i(a),f=l&&l.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,g=(d+u)/(1<<21);while(g===0);return g},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=s:this.xorwow=s})(er,e)})(Ye)),Ye.exports}var Ke={exports:{}},nr=Ke.exports,Mn;function or(){return Mn||(Mn=1,(function(e){(function(t,n,o){function i(a){var l=this;l.next=function(){var f=l.x,p=l.i,d,u;return d=f[p],d^=d>>>7,u=d^d<<24,d=f[p+1&7],u^=d^d>>>10,d=f[p+3&7],u^=d^d>>>3,d=f[p+4&7],u^=d^d<<7,d=f[p+7&7],d=d^d<<13,u^=d^d<<9,f[p]=u,l.i=p+1&7,u};function c(f,p){var d,u=[];if(p===(p|0))u[0]=p;else for(p=""+p,d=0;d<p.length;++d)u[d&7]=u[d&7]<<15^p.charCodeAt(d)+u[d+1&7]<<13;for(;u.length<8;)u.push(0);for(d=0;d<8&&u[d]===0;++d);for(d==8?u[7]=-1:u[d],f.x=u,f.i=0,d=256;d>0;--d)f.next()}c(l,a)}function r(a,l){return l.x=a.x.slice(),l.i=a.i,l}function s(a,l){a==null&&(a=+new Date);var c=new i(a),f=l&&l.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,g=(d+u)/(1<<21);while(g===0);return g},p.int32=c.next,p.quick=p,f&&(f.x&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=s:this.xorshift7=s})(nr,e)})(Ke)),Ke.exports}var Qe={exports:{}},ir=Qe.exports,Pn;function rr(){return Pn||(Pn=1,(function(e){(function(t,n,o){function i(a){var l=this;l.next=function(){var f=l.w,p=l.X,d=l.i,u,g;return l.w=f=f+1640531527|0,g=p[d+34&127],u=p[d=d+1&127],g^=g<<13,u^=u<<17,g^=g>>>15,u^=u>>>12,g=p[d]=g^u,l.i=d,g+(f^f>>>16)|0};function c(f,p){var d,u,g,h,m,w=[],_=128;for(p===(p|0)?(u=p,p=null):(p=p+"\0",u=0,_=Math.max(_,p.length)),g=0,h=-32;h<_;++h)p&&(u^=p.charCodeAt((h+32)%p.length)),h===0&&(m=u),u^=u<<10,u^=u>>>15,u^=u<<4,u^=u>>>13,h>=0&&(m=m+1640531527|0,d=w[h&127]^=u+m,g=d==0?g+1:0);for(g>=128&&(w[(p&&p.length||0)&127]=-1),g=127,h=512;h>0;--h)u=w[g+34&127],d=w[g=g+1&127],u^=u<<13,d^=d<<17,u^=u>>>15,d^=d>>>12,w[g]=u^d;f.w=m,f.X=w,f.i=g}c(l,a)}function r(a,l){return l.i=a.i,l.w=a.w,l.X=a.X.slice(),l}function s(a,l){a==null&&(a=+new Date);var c=new i(a),f=l&&l.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,g=(d+u)/(1<<21);while(g===0);return g},p.int32=c.next,p.quick=p,f&&(f.X&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=s:this.xor4096=s})(ir,e)})(Qe)),Qe.exports}var Je={exports:{}},ar=Je.exports,Ln;function sr(){return Ln||(Ln=1,(function(e){(function(t,n,o){function i(a){var l=this,c="";l.next=function(){var p=l.b,d=l.c,u=l.d,g=l.a;return p=p<<25^p>>>7^d,d=d-u|0,u=u<<24^u>>>8^g,g=g-p|0,l.b=p=p<<20^p>>>12^d,l.c=d=d-u|0,l.d=u<<16^d>>>16^g,l.a=g-p|0},l.a=0,l.b=0,l.c=-1640531527,l.d=1367130551,a===Math.floor(a)?(l.a=a/4294967296|0,l.b=a|0):c+=a;for(var f=0;f<c.length+20;f++)l.b^=c.charCodeAt(f)|0,l.next()}function r(a,l){return l.a=a.a,l.b=a.b,l.c=a.c,l.d=a.d,l}function s(a,l){var c=new i(a),f=l&&l.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=c.next()>>>11,u=(c.next()>>>0)/4294967296,g=(d+u)/(1<<21);while(g===0);return g},p.int32=c.next,p.quick=p,f&&(typeof f=="object"&&r(f,c),p.state=function(){return r(c,{})}),p}n&&n.exports?n.exports=s:this.tychei=s})(ar,e)})(Je)),Je.exports}var Ze={exports:{}};const lr={},cr=Object.freeze(Object.defineProperty({__proto__:null,default:lr},Symbol.toStringTag,{value:"Module"})),dr=Yi(cr);var pr=Ze.exports,Bn;function ur(){return Bn||(Bn=1,(function(e){(function(t,n,o){var i=256,r=6,s=52,a="random",l=o.pow(i,r),c=o.pow(2,s),f=c*2,p=i-1,d;function u(y,S,C){var b=[];S=S==!0?{entropy:!0}:S||{};var T=w(m(S.entropy?[y,I(n)]:y??_(),3),b),E=new g(b),v=function(){for(var R=E.g(r),A=l,M=0;R<c;)R=(R+M)*i,A*=i,M=E.g(1);for(;R>=f;)R/=2,A/=2,M>>>=1;return(R+M)/A};return v.int32=function(){return E.g(4)|0},v.quick=function(){return E.g(4)/4294967296},v.double=v,w(I(E.S),n),(S.pass||C||function(R,A,M,D){return D&&(D.S&&h(D,E),R.state=function(){return h(E,{})}),M?(o[a]=R,A):R})(v,T,"global"in S?S.global:this==o,S.state)}function g(y){var S,C=y.length,b=this,T=0,E=b.i=b.j=0,v=b.S=[];for(C||(y=[C++]);T<i;)v[T]=T++;for(T=0;T<i;T++)v[T]=v[E=p&E+y[T%C]+(S=v[T])],v[E]=S;(b.g=function(R){for(var A,M=0,D=b.i,F=b.j,O=b.S;R--;)A=O[D=p&D+1],M=M*i+O[p&(O[D]=O[F=p&F+A])+(O[F]=A)];return b.i=D,b.j=F,M})(i)}function h(y,S){return S.i=y.i,S.j=y.j,S.S=y.S.slice(),S}function m(y,S){var C=[],b=typeof y,T;if(S&&b=="object")for(T in y)try{C.push(m(y[T],S-1))}catch{}return C.length?C:b=="string"?y:y+"\0"}function w(y,S){for(var C=y+"",b,T=0;T<C.length;)S[p&T]=p&(b^=S[p&T]*19)+C.charCodeAt(T++);return I(S)}function _(){try{var y;return d&&(y=d.randomBytes)?y=y(i):(y=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(y)),I(y)}catch{var S=t.navigator,C=S&&S.plugins;return[+new Date,t,C,t.screen,I(n)]}}function I(y){return String.fromCharCode.apply(0,y)}if(w(o.random(),n),e.exports){e.exports=u;try{d=dr}catch{}}else o["seed"+a]=u})(typeof self<"u"?self:pr,[],Math)})(Ze)),Ze.exports}var Ct,xn;function fr(){if(xn)return Ct;xn=1;var e=Qi(),t=Zi(),n=tr(),o=or(),i=rr(),r=sr(),s=ur();return s.alea=e,s.xor128=t,s.xorwow=n,s.xorshift7=o,s.xor4096=i,s.tychei=r,Ct=s,Ct}var gr=fr();const hr=Vi(gr),ot=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],Tt=ot.reduce((e,t)=>t.length<e.length?t:e).length,Rt=ot.reduce((e,t)=>t.length>e.length?t:e).length;function mr(e){const t=e?.seed?new hr(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let u=typeof n!="number"?Tt:a(n);const g=typeof o!="number"?Rt:a(o);u>g&&(u=g);let h=!1,m;for(;!h;)m=s(),h=m.length<=g&&m.length>=u;return m}function s(){return ot[l(ot.length)]}function a(u){return u<Tt&&(u=Tt),u>Rt&&(u=Rt),u}function l(u){const g=t?t():Math.random();return Math.floor(g*u)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=u=>u),typeof e.separator!="string"&&(e.separator=" ");const c=e.min+l(e.max+1-e.min);let f=[],p="",d=0;for(let u=0;u<c*e.wordsPerString;u++)d===e.wordsPerString-1?p+=e.formatter(r(),d):p+=e.formatter(r(),d)+e.separator,d++,(u+1)%e.wordsPerString===0&&(f.push(p),p="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const Po=e=>`${e}×`,Lo=e=>`${e.toFixed(1)}×`;function Bo(e,t,n){const o=t?!1:n;e.compareToggle.checked=o,e.compareToggle.disabled=t,e.compareToggle.title=t?"Compare is unavailable for this scenario":"",e.layout.dataset.mode=o?"compare":"single"}function xo(){const e=mr({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function br(e,t){const n=N(e.scenario);Bo(t,n.disableCompare===!0,e.compare),t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=Po(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=Lo(e.intensity),se(t.paneA,e.strategyA),se(t.paneB,e.strategyB),ae(t.paneA,e.repositionA),ae(t.paneB,e.repositionB),Ro(t,e.scenario),Object.keys(e.overrides).length>0&&Mo(t,!0),dt(n,e.overrides,t)}async function Fo(e,t,n,o,i){const r=N(n),s=r.disableCompare===!0,a=e.permalink.compare&&!s;Bo(t,s,e.permalink.compare);const l=a?e.permalink.strategyA:r.defaultStrategy,c=r.defaultReposition!==void 0&&!a?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:l,repositionA:c,overrides:{}},q(e.permalink),i.renderPaneStrategyInfo(t.paneA,l),i.renderPaneRepositionInfo(t.paneA,c),i.refreshStrategyPopovers(),Ro(t,r.id),await o(),i.renderTweakPanel(),H(t.toast,`${r.label} · ${ye[l]}`)}function yr(e){const t=N(e.scenario);e.scenario=t.id}const Sr=["layout","scenario-picker","controls-bar","cabin-legend"],vr=["quest-pane"];function wr(e){const t=e==="quest";for(const n of Sr){const o=document.getElementById(n);o&&o.classList.toggle("hidden",t)}for(const n of vr){const o=document.getElementById(n);o&&(o.classList.toggle("hidden",!t),o.classList.toggle("flex",t))}}function kr(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const o of n){const i=o.dataset.mode===e;o.dataset.active=String(i),o.setAttribute("aria-pressed",String(i))}t.addEventListener("click",o=>{const i=o.target;if(!(i instanceof HTMLElement))return;const r=i.closest("button[data-mode]");if(!r)return;const s=r.dataset.mode;if(s!=="compare"&&s!=="quest"||s===e)return;const a=new URL(window.location.href);s==="compare"?(a.searchParams.delete("m"),a.searchParams.delete("qs")):a.searchParams.set("m",s),window.location.assign(a.toString())})}const _r="modulepreload",Cr=function(e,t){return new URL(e,t).href},Fn={},it=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let s=function(f){return Promise.all(f.map(p=>Promise.resolve(p).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const a=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),c=l?.nonce||l?.getAttribute("nonce");i=s(n.map(f=>{if(f=Cr(f,o),f in Fn)return;Fn[f]=!0;const p=f.endsWith(".css"),d=p?'[rel="stylesheet"]':"";if(!!o)for(let h=a.length-1;h>=0;h--){const m=a[h];if(m.href===f&&(!p||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const g=document.createElement("link");if(g.rel=p?"stylesheet":_r,p||(g.as="script"),g.crossOrigin="",g.href=f,c&&g.setAttribute("nonce",c),document.head.appendChild(g),p)return new Promise((h,m)=>{g.addEventListener("load",h),g.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(s){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=s,window.dispatchEvent(a),!a.defaultPrevented)throw s}return i.then(s=>{for(const a of s||[])a.status==="rejected"&&r(a.reason);return t().catch(r)})};class $o extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function Tr(e){const t=(await it(async()=>{const{default:i}=await import("./worker-DE_xV-Fq.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new Rr(n);return await o.init(e),o}class Rr{#e;#t=new Map;#n=1;#i=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#l),this.#e.addEventListener("error",this.#o),this.#e.addEventListener("messageerror",this.#o)}async init(t){await this.#s({kind:"init",id:this.#a(),payload:this.#d(t)})}async tick(t,n){const o=n?.wantVisuals??!1;return this.#s({kind:"tick",id:this.#a(),ticks:t,...o?{wantVisuals:!0}:{}})}async spawnRider(t,n,o,i){return this.#s({kind:"spawn-rider",id:this.#a(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#s({kind:"set-strategy",id:this.#a(),strategy:t})}async loadController(t,n){const o=n?.unlockedApi??null,i=n?.timeoutMs,r=this.#s({kind:"load-controller",id:this.#a(),source:t,unlockedApi:o});if(i===void 0){await r;return}r.catch(()=>{});let s;const a=new Promise((l,c)=>{s=setTimeout(()=>{c(new Error(`controller did not return within ${i}ms`))},i)});try{await Promise.race([r,a])}finally{s!==void 0&&clearTimeout(s)}}async reset(t){await this.#s({kind:"reset",id:this.#a(),payload:this.#d(t)})}dispose(){this.#i||(this.#i=!0,this.#e.removeEventListener("message",this.#l),this.#e.removeEventListener("error",this.#o),this.#e.removeEventListener("messageerror",this.#o),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#a(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#s(t){if(this.#i)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#t.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#o=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#i=!0,this.#e.terminate(),this.#r(new Error(o))};#l=t=>{const n=t.data,o=this.#t.get(n.id);if(o)switch(this.#t.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":{const i=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;o.reject(i!==null?new $o(n.message,i):new Error(n.message));return}default:{const i=n.kind;o.reject(new Error(`WorkerSim: unknown reply kind "${String(i)}"`));return}}}}const Ir=`// Quest curriculum — sim global declaration.
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
`,$n="quest-runtime";let It=null,he=null;async function Er(){return It||he||(he=(async()=>{await Ar();const e=await it(()=>import("./editor.main-BRCOjplT.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return It=e,e})(),he.catch(()=>{he=null}),he)}async function Ar(){const[{default:e},{default:t}]=await Promise.all([it(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),it(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}function Mr(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(Ir,"ts:filename/quest-sim-globals.d.ts"))}function Pr(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function Lr(e){const t=await Er();Mr(t),Pr(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o()});return{dispose:()=>{i.dispose()}}},insertAtCursor(o){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:o,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(o){const i=n.getModel();if(!i)return;const r=o.message.split(`
`)[0]??o.message;t.editor.setModelMarkers(i,$n,[{severity:8,message:r,startLineNumber:o.line,startColumn:o.column,endLineNumber:o.line,endColumn:o.column+1}]),n.revealLineInCenterIfOutsideViewport(o.line)},clearRuntimeMarker(){const o=n.getModel();o&&t.editor.setModelMarkers(o,$n,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const Br=`SimConfig(
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
)`,xr={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:Br,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},Fr=`SimConfig(
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
)`,$r={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:Fr,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},Dr=`SimConfig(
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
)`,Or={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:Dr,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},Wr=`SimConfig(
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
)`,Nr={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:Wr,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function x(e,t){const n=t.startTick??0,o=t.intervalTicks??30,i=t.destinations;if(i.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,s)=>{const a=i[s%i.length];return{origin:t.origin,destination:a,atTick:n+s*o,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const Hr=`SimConfig(
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
)`,qr={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:Hr,unlockedApi:["setStrategy"],seedRiders:[...x(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},Gr=`SimConfig(
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
)`,Ur=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,Xr={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:Gr,unlockedApi:["setStrategyJs"],seedRiders:[...x(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...x(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:Ur,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},zr=`SimConfig(
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
)`,jr={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:zr,unlockedApi:["setStrategyJs"],seedRiders:[...x(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...x(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},Vr=`SimConfig(
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
)`,Yr=`// Stage 8 — Event-Driven
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
`,Kr={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:Vr,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...x(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...x(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:Yr,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},Qr=`SimConfig(
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
)`,Jr=`// Stage 9 — Take the Wheel
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
`,Zr={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:Qr,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...x(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:Jr,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},ea=`SimConfig(
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
)`,ta=`// Stage 10 — Patient Boarding
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
`,na={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:ea,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...x(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:ta,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},oa=`SimConfig(
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
)`,ia=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,ra={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:oa,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...x(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...x(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:ia,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},aa=`SimConfig(
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
)`,sa=`// Stage 12 — Routes
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
`,la={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:aa,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...x(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...x(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:sa,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},ca=`SimConfig(
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
)`,da=`// Stage 13 — Transfer Points
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
`,pa={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:ca,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...x(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...x(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...x(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:da,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},ua=`SimConfig(
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
)`,fa=`// Stage 14 — Build a Floor
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
`,ga={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:ua,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...x(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:fa,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},ha=`SimConfig(
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
)`,ma=`// Stage 15 — Sky Lobby
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
`,ba={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:ha,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...x(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...x(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:ma,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},le=[xr,$r,Or,Nr,qr,Xr,jr,Kr,Zr,na,ra,la,pa,ga,ba];function ya(e){return le.find(t=>t.id===e)}function Sa(e){const t=le.findIndex(n=>n.id===e);if(!(t<0))return le[t+1]}function L(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function pt(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const rt="quest:code:v1:",Do="quest:bestStars:v1:",Oo=5e4;function De(){try{return globalThis.localStorage??null}catch{return null}}function Dn(e){const t=De();if(!t)return null;try{const n=t.getItem(rt+e);if(n===null)return null;if(n.length>Oo){try{t.removeItem(rt+e)}catch{}return null}return n}catch{return null}}function On(e,t){if(t.length>Oo)return;const n=De();if(n)try{n.setItem(rt+e,t)}catch{}}function va(e){const t=De();if(t)try{t.removeItem(rt+e)}catch{}}function Oe(e){const t=De();if(!t)return 0;let n;try{n=t.getItem(Do+e)}catch{return 0}if(n===null)return 0;const o=Number.parseInt(n,10);return!Number.isInteger(o)||o<0||o>3?0:o}function wa(e,t){const n=Oe(e);if(t<=n)return;const o=De();if(o)try{o.setItem(Do+e,String(t))}catch{}}const ka={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},_a=["basics","strategies","events-manual","topology"],Wo=3;function Ca(){return{root:L("quest-grid","quest-grid"),progress:L("quest-grid-progress","quest-grid"),sections:L("quest-grid-sections","quest-grid")}}function Et(e,t){pt(e.sections);let n=0;const o=le.length*Wo;for(const i of _a){const r=le.filter(c=>c.section===i);if(r.length===0)continue;const s=document.createElement("section");s.dataset.section=i;const a=document.createElement("h2");a.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",a.textContent=ka[i],s.appendChild(a);const l=document.createElement("div");l.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const c of r){const f=Oe(c.id);n+=f,l.appendChild(Ta(c,f,t))}s.appendChild(l),e.sections.appendChild(s)}e.progress.textContent=`${n} / ${o}`}function Ta(e,t,n){const o=le.findIndex(p=>p.id===e.id),i=String(o+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const s=document.createElement("div");s.className="flex items-baseline justify-between gap-2";const a=document.createElement("span");a.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",a.textContent=i,s.appendChild(a);const l=document.createElement("span");l.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",l.classList.add(t>0?"text-accent":"text-content-disabled"),l.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),l.textContent="★".repeat(t)+"☆".repeat(Wo-t),s.appendChild(l),r.appendChild(s);const c=document.createElement("div");c.className="text-content text-[13px] font-semibold tracking-[-0.01em]",c.textContent=e.title,r.appendChild(c);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const Ra=75;async function Wn(e,t,n,o){let i=n;for(;i<t.length;){const r=t[i];if(r===void 0||(r.atTick??0)>o)break;await e.spawnRider(r.origin,r.destination,r.weight??Ra,r.patienceTicks),i+=1}return i}async function Ia(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await Tr({configRon:e.configRon,strategy:"scan"});try{const s=[...e.seedRiders].sort((d,u)=>(d.atTick??0)-(u.atTick??0));let a=await Wn(r,s,0,0);const l={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(l.timeoutMs=n.timeoutMs),await r.loadController(t,l);let c=null,f=0;const p=n.onSnapshot!==void 0;for(;f<o;){const d=o-f,u=Math.min(i,d),g=await r.tick(u,p?{wantVisuals:!0}:void 0);c=g.metrics,f=g.tick,a=await Wn(r,s,a,f);const h=Nn(c,f);if(n.onProgress)try{n.onProgress(h)}catch{}if(n.onSnapshot&&g.snapshot)try{n.onSnapshot(g.snapshot)}catch{}if(e.passFn(h))return Hn(e,h,!0)}if(c===null)throw new Error("runStage: maxTicks must be positive");return Hn(e,Nn(c,f),!1)}finally{r.dispose()}}function Nn(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function Hn(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}function Ea(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const o=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(o)&&o>0&&n.push(`${o.toFixed(1)}s avg wait`),n.join(" · ")}const No=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(No.map(e=>[e.name,e]));function Ho(e){const t=new Set(e);return No.filter(n=>t.has(n.name))}function Aa(){return{root:L("quest-api-panel","api-panel")}}function qn(e,t){pt(e.root);const n=Ho(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const o=document.createElement("p");o.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",o.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(o);const i=document.createElement("ul");i.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const s=document.createElement("li");s.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const a=document.createElement("code");a.className="block font-mono text-[12px] text-content",a.textContent=r.signature,s.appendChild(a);const l=document.createElement("p");l.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",l.textContent=r.description,s.appendChild(l),i.appendChild(s)}e.root.appendChild(i)}function Ma(){return{root:L("quest-hints","hints-drawer"),count:L("quest-hints-count","hints-drawer"),list:L("quest-hints-list","hints-drawer")}}const Gn="quest-hints-more";function Un(e,t){pt(e.list);for(const o of e.root.querySelectorAll(`.${Gn}`))o.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((o,i)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=o,i>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const o=document.createElement("button");o.type="button",o.className=`${Gn} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,o.textContent=`Show ${n-1} more`,o.addEventListener("click",()=>{for(const i of e.list.querySelectorAll("li[hidden]"))i.hidden=!1;o.remove()}),e.root.appendChild(o)}e.root.removeAttribute("open")}function Pa(e,t){return{activeStage:e,currentView:t,runLoop:{active:!1}}}function La(e,t){e.activeStage=t}function At(e,t){e.currentView=t}function Xn(e){e.runLoop.active=!1}function Ce(e,t){return e.currentView==="stage"&&e.activeStage.id===t.id}function Ba(){return{root:L("quest-reference","reference-panel"),status:L("quest-reference-status","reference-panel"),code:L("quest-reference-code","reference-panel")}}function Mt(e,t,n={}){const o=t.referenceSolution,i=Oe(t.id);if(!o||i===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=i===3?"(mastered)":"(unlocked)",e.code.textContent=o,n.collapse!==!1&&e.root.removeAttribute("open")}function xa(){const e="results-modal";return{root:L("quest-results-modal",e),title:L("quest-results-title",e),stars:L("quest-results-stars",e),detail:L("quest-results-detail",e),close:L("quest-results-close",e),retry:L("quest-results-retry",e),next:L("quest-results-next",e)}}function Fa(e,t,n,o,i){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=$a(t.grade,t.passed,o),e.retry.onclick=()=>{Pt(e),n()},e.close.onclick=()=>{Pt(e)};const r=i;r?(e.next.hidden=!1,e.next.onclick=()=>{Pt(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function Pt(e){e.root.classList.remove("show")}function $a(e,t,n){const o=`tick ${e.endTick}`,i=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${i} · finished by ${o}.`;if(n)try{const r=n(e);if(r)return`${i}. ${r}`}catch{}return`${i}. The pass condition wasn't met within the run budget.`}const Da={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function zn(e){return Da[e]??`sim.${e}();`}function Oa(){return{root:L("quest-snippets","snippet-picker")}}function jn(e,t,n){pt(e.root);const o=Ho(t.unlockedApi);if(o.length!==0)for(const i of o){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=i.name,r.title=`Insert: ${zn(i.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(zn(i.name))}),e.root.appendChild(r)}}const ut={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},Wa="#2a2a35",on="#a1a1aa",V='"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',Na=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],Ha=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],qa="rgba(8, 10, 14, 0.55)",Ga="#3a3a45",Ua=[1,1,.5,.42],Xa=["LOW","HIGH","VIP","SERVICE"],za="#e6c56b",ja="#9bd4c4",Va=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],Ya="#a1a1aa",Ka="#4a4a55",Qa="#f59e0b",at="#7dd3fc",qo="#fda4af",et="#fafafa",Go="#8b8c92",Uo="rgba(250, 250, 250, 0.95)",Ja=700,Kt=3,Za=.05,Vn=["standard","briefcase","bag","short","tall"];function Q(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,Vn[n%Vn.length]??"standard"}function es(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function rn(e,t,n,o,i,r="standard"){const s=es(r,o),l=n-.5,c=l-s.bodyH,f=c-s.neckGap-s.headR,p=s.bodyH*.08,d=l-s.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-s.shoulderW/2,c+p),e.lineTo(t-s.shoulderW/2+p,c),e.lineTo(t+s.shoulderW/2-p,c),e.lineTo(t+s.shoulderW/2,c+p),e.lineTo(t+s.waistW/2,d),e.lineTo(t+s.footW/2,l),e.lineTo(t-s.footW/2,l),e.lineTo(t-s.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,s.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const u=Math.max(1.6,s.headR*.9),g=t+s.waistW/2+u*.1,h=l-u-.5;e.fillRect(g,h,u,u);const m=u*.55;e.fillRect(g+(u-m)/2,h-1,m,1)}else if(r==="bag"){const u=Math.max(1.3,s.headR*.9),g=t-s.shoulderW/2-u*.35,h=c+s.bodyH*.35;e.beginPath(),e.arc(g,h,u,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(g+u*.2,h-u*.8),e.lineTo(t+s.shoulderW/2-p,c+.5),e.stroke()}else if(r==="tall"){const u=s.headR*2.1,g=Math.max(1,s.headR*.45);e.fillRect(t-u/2,f-s.headR-g+.4,u,g)}}function ts(e,t,n,o,i,r,s,a,l){const f=Math.max(1,Math.floor((i-14)/a.figureStride)),p=Math.min(r,f),d=-2;for(let u=0;u<p;u++){const g=t+d+o*u*a.figureStride,h=u+0,m=Q(l,h);rn(e,g,n,a.figureHeadR,s,m)}if(r>p){e.fillStyle=Go,e.font=`${a.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const u=t+d+o*p*a.figureStride;e.fillText(`+${r-p}`,u,n-1)}}function ee(e,t,n,o,i,r){const s=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,s);return}e.moveTo(t+s,n),e.lineTo(t+o-s,n),e.quadraticCurveTo(t+o,n,t+o,n+s),e.lineTo(t+o,n+i-s),e.quadraticCurveTo(t+o,n+i,t+o-s,n+i),e.lineTo(t+s,n+i),e.quadraticCurveTo(t,n+i,t,n+i-s),e.lineTo(t,n+s),e.quadraticCurveTo(t,n,t+s,n),e.closePath()}function ns(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const s=i+r+1>>1;e.measureText(t.slice(0,s)+o).width<=n?i=s:r=s-1}return i===0?o:t.slice(0,i)+o}function os(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function is(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px ${V}`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,s=Math.max(n.fontSmall+.5,i);for(const a of t){const l=a.top-3,c=l>i&&l-n.fontSmall<r;e.fillStyle=a.color,e.fillText(a.text,a.cx,c?s:l)}}function rs(e,t,n,o,i,r,s,a,l){e.font=`500 ${o.fontMain.toFixed(0)}px ${V}`,e.textBaseline="middle";const c=o.padX,f=o.padX+o.labelW,p=r-o.padX,d=o.shaftInnerW/2,u=Math.min(o.shaftInnerW*1.8,(p-f)/2);for(let g=0;g<t.length;g++){const h=t[g];if(h===void 0)continue;const m=n(h.y),w=t[g+1],_=w!==void 0?n(w.y):a;if(e.strokeStyle=Wa,e.lineWidth=l?2:1,e.beginPath(),l)for(const y of i)e.moveTo(y-u,m+.5),e.lineTo(y+u,m+.5);else{let y=f;for(const S of i){const C=S-d,b=S+d;C>y&&(e.moveTo(y,m+.5),e.lineTo(C,m+.5)),y=b}y<p&&(e.moveTo(y,m+.5),e.lineTo(p,m+.5))}e.stroke();for(let y=0;y<i.length;y++){const S=i[y];if(S===void 0)continue;const C=s.has(y,h.entity_id);e.strokeStyle=C?Qa:Ka,e.lineWidth=C?1.4:1,e.beginPath(),e.moveTo(S-d-2,m+.5),e.lineTo(S-d,m+.5),e.moveTo(S+d,m+.5),e.lineTo(S+d+2,m+.5),e.stroke()}const I=l?m:(m+_)/2;e.fillStyle=on,e.textAlign="right",e.fillText(ns(e,h.name,o.labelW-4),c+o.labelW-4,I)}}function as(e,t,n,o,i,r){for(const s of t.stops){if(s.waiting_by_line.length===0)continue;const a=r.get(s.entity_id);if(a===void 0||a.size===0)continue;const l=n(s.y),c=s.waiting_up>=s.waiting_down?at:qo;for(const f of s.waiting_by_line){if(f.count===0)continue;const p=a.get(f.line);if(p===void 0)continue;const d=i.get(p);if(d===void 0)continue;const u=d.end-d.start;u<=o.figureStride||ts(e,d.end-2,l,-1,u,f.count,c,o,s.entity_id)}}}const Lt=new Map;function an(e){const t=Lt.get(e);if(t!==void 0)return t;const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return Lt.set(e,null),null;const o=parseInt(n[1],16),i=[o>>16&255,o>>8&255,o&255];return Lt.set(e,i),i}function Qt(e,t){const n=an(e);if(n===null)return e;const[o,i,r]=n,s=a=>t>=0?Math.round(a+(255-a)*t):Math.round(a*(1+t));return`rgb(${s(o)}, ${s(i)}, ${s(r)})`}function Xo(e,t){const n=an(e);if(n===null)return e;const[o,i,r]=n;return`rgba(${o}, ${i}, ${r}, ${t})`}function Y(e,t){if(an(e)!==null&&e.startsWith("#")){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Xo(e,t)}function zo(e){let r=e;for(let a=0;a<3;a++){const l=1-r,c=3*l*l*r*.2+3*l*r*r*.2+r*r*r,f=3*l*l*.2+6*l*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(c-e)/f,r=Math.max(0,Math.min(1,r))}const s=1-r;return 3*s*s*r*.6+3*s*r*r*1+r*r*r}function ss(e,t,n,o,i,r,s,a,l,c=!1){const f=o*.22,p=(i-4)/10.5,d=Math.max(1.2,Math.min(a.figureHeadR,f,p)),u=a.figureStride*(d/a.figureHeadR),g=3,h=2,m=o-g*2,_=Math.max(1,Math.floor((m-16)/u)),I=Math.min(r,_),y=I*u,S=t-y/2+u/2,C=n-h;for(let b=0;b<I;b++){const T=l?.[b]??Q(0,b);rn(e,S+b*u,C,d,s,T)}if(r>I){const b=`+${r-I}`,T=Math.max(8,a.fontSmall-1);e.font=`700 ${T.toFixed(1)}px ${V}`,e.textAlign="right",e.textBaseline="middle";const E=e.measureText(b).width,v=3,R=1.5,A=Math.ceil(E+v*2),M=Math.ceil(T+R*2),D=t+o/2-2,F=n-i+2,O=D-A;e.fillStyle="rgba(15, 15, 18, 0.85)",ee(e,O,F,A,M,2),e.fill(),e.fillStyle="#fafafa",e.fillText(b,D-v,F+M/2)}if(c){const b=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${b.toFixed(0)}px ${V}`,e.textAlign="center",e.textBaseline="middle";const T=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,T+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,T)}}const ls=Array.from({length:Kt},(e,t)=>Xo(ut.moving,.18*(1-t/Kt))),Yn=Object.fromEntries(Object.entries(ut).map(([e,t])=>[e,Qt(t,.18)]));function cs(e,t,n,o,i,r,s){const a=Math.max(2,r.figureHeadR*.9);for(const l of t.cars){if(l.target===void 0)continue;const c=s.get(l.target);if(c===void 0)continue;const f=t.stops[c];if(f===void 0)continue;const p=n.get(l.id);if(p===void 0)continue;const d=i(f.y)-r.carH/2,u=i(l.y)-r.carH/2;Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(p,u),e.lineTo(p,d),e.stroke(),e.fillStyle=Uo,e.beginPath(),e.arc(p,d,a,0,Math.PI*2),e.fill())}}function ds(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const s=o/2;for(let a=1;a<=Kt;a++){const l=r(t.y-t.v*Za*a);e.fillStyle=ls[a-1]??"rgba(107, 107, 117, 0.06)",e.fillRect(n-s,l-i,o,i)}}function ps(e,t,n,o,i,r,s,a,l){const c=s(t.y),f=c-i,p=o/2,d=ut[t.phase]??"#6b6b75";e.fillStyle=d,e.fillRect(n-p,f,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-p+.5,f+.5,o-1,i-1),e.strokeStyle=Yn[t.phase]??Yn.unknown,e.beginPath(),e.moveTo(n-p+1,f+1.5),e.lineTo(n+p-1,f+1.5),e.stroke();const u=t.capacity>0&&t.load>=t.capacity*.95;if((t.riders>0||u)&&ss(e,n,c,o,i,t.riders,r,a,l,u),t.phase==="door-opening"||t.phase==="loading"||t.phase==="door-closing"){const g=Math.max(o*.2,Math.min(o*.4,8));e.strokeStyle="rgba(250, 250, 250, 0.85)",e.lineWidth=1.5,e.beginPath(),e.moveTo(n-g/2,c-.5),e.lineTo(n+g/2,c-.5),e.stroke()}}const Kn=6,us=3,Bt=4,be=3,me=2.5,Z=2,fs=12,gs="rgba(37, 37, 48, 0.80)",hs="#ECECEE",Qn=3,Jn=.3,ms=140,Zn=.85;function bs(e,t,n,o,i,r,s,a){const l=s.fontSmall+.5;e.font=`500 ${l}px ${V}`,e.textBaseline="middle",eo(e,"-0.1px");const c=performance.now(),f=Y(t,.45),p=Y(t,.5),d=Y(t,.75),u=[];for(const[h,m]of o){const w=n.get(h);if(w===void 0)continue;const _=i.get(h);if(_===void 0)continue;const I=r(w.y),y=I-s.carH,S=Math.max(1,m.expiresAt-m.bornAt),C=m.expiresAt-c,b=C>S*Jn?1:Math.max(0,C/(S*Jn)),T=Math.max(0,c-m.bornAt),E=Math.min(1,T/ms),v=b*E;if(v<=0)continue;const R=e.measureText(m.glyph).width,A=R+Qn+e.measureText(m.text).width+Kn*2,M=l+us*2+2,D=y-Z-me-M,F=I+Z+me+M>a,O=D<2&&!F?"below":"above",te=O==="above"?y-Z-me-M:I+Z+me;let G=_-A/2;const ve=2,we=a-A-2;G<ve&&(G=ve),G>we&&(G=we),u.push({bubble:m,glyphW:R,alpha:v,cx:_,carTop:y,carBottom:I,bubbleW:A,bubbleH:M,side:O,bx:G,by:te,entrance:E})}const g=(h,m)=>!(h.bx+h.bubbleW<=m.bx||m.bx+m.bubbleW<=h.bx||h.by+h.bubbleH<=m.by||m.by+m.bubbleH<=h.by);for(let h=1;h<u.length;h++){const m=u[h];if(m===void 0)continue;let w=!1;for(let C=0;C<h;C++){const b=u[C];if(b!==void 0&&g(m,b)){w=!0;break}}if(!w)continue;const _=m.side==="above"?"below":"above",I=_==="above"?m.carTop-Z-me-m.bubbleH:m.carBottom+Z+me,y={...m,side:_,by:I};let S=!0;for(let C=0;C<h;C++){const b=u[C];if(b!==void 0&&g(y,b)){S=!1;break}}S&&(u[h]=y)}for(const h of u){const{bubble:m,glyphW:w,alpha:_,cx:I,carTop:y,carBottom:S,bubbleW:C,bubbleH:b,side:T,bx:E,by:v,entrance:R}=h,A=T==="above"?y-Z:S+Z,M=Math.min(Math.max(I,E+Bt+be/2),E+C-Bt-be/2),D=zo(R),F=Zn+(1-Zn)*D;e.save(),e.globalAlpha=_,e.translate(M,A),e.scale(F,F),e.translate(-M,-A),ys(e,E,v,C,b,Bt,T,M,A),e.shadowColor=p,e.shadowBlur=fs,e.fillStyle=gs,e.fill(),e.shadowBlur=0,e.shadowColor="transparent",e.strokeStyle=f,e.lineWidth=1,e.stroke();const O=v+b/2,te=E+Kn;e.textAlign="left",e.fillStyle=d,e.fillText(m.glyph,te,O),e.fillStyle=hs,e.fillText(m.text,te+w+Qn,O),e.restore()}eo(e,"0px")}function ys(e,t,n,o,i,r,s,a,l){const c=Math.min(r,o/2,i/2);e.beginPath(),e.moveTo(t+c,n),s==="below"&&(e.lineTo(a-be/2,n),e.lineTo(a,l),e.lineTo(a+be/2,n)),e.lineTo(t+o-c,n),e.arcTo(t+o,n,t+o,n+c,c),e.lineTo(t+o,n+i-c),e.arcTo(t+o,n+i,t+o-c,n+i,c),s==="above"&&(e.lineTo(a+be/2,n+i),e.lineTo(a,l),e.lineTo(a-be/2,n+i)),e.lineTo(t+c,n+i),e.arcTo(t,n+i,t,n+i-c,c),e.lineTo(t,n+c),e.arcTo(t,n,t+c,n,c),e.closePath()}function eo(e,t){e.letterSpacing=t}const Me=18,st=22,xt=14,jo=6,Ft=8,to=[.55,.25];function Ss(e,t,n,o,i){const r=e.createLinearGradient(0,0,0,Me);r.addColorStop(0,"rgba(245, 158, 11, 0.06)"),r.addColorStop(1,"rgba(245, 158, 11, 0)"),e.fillStyle=r,e.fillRect(0,0,t,Me),e.strokeStyle=Y("#f59e0b",.18),e.lineWidth=1,e.beginPath(),e.moveTo(0,Me+.5),e.lineTo(t,Me+.5),e.stroke();const s=n-st;e.fillStyle="rgba(20, 20, 26, 0.8)",e.fillRect(0,s,t,st),e.strokeStyle="rgba(255, 255, 255, 0.04)",e.lineWidth=1;const a=Math.max(24,Math.min(48,(i-o)/18));e.beginPath();for(let l=o;l<=i;l+=a)e.moveTo(l,s+4),e.lineTo(l,n-4);e.stroke(),e.strokeStyle="rgba(255, 255, 255, 0.06)",e.beginPath(),e.moveTo(0,s+.5),e.lineTo(t,s+.5),e.stroke()}function vs(e,t,n,o){const r=n.length,s=t-e,a=(s-xt*(r-1))/r,l=Math.min(64,a),c=l*r+xt*(r-1),f=e+Math.max(0,(s-c)/2),p=[];for(let d=0;d<r;d++){const u=n[d];if(u===void 0)continue;const g=f+d*(l+xt),h=g+l;p.push({lineId:u,name:o(u),cy:(g+h)/2,top:g,bottom:h,dir:d%2===0?1:-1})}return p}function ws(e,t,n,o){e.fillStyle="rgba(10, 12, 16, 0.55)",e.fillRect(n,t.top,o-n,t.bottom-t.top),e.strokeStyle="rgba(58, 58, 69, 0.7)",e.lineWidth=1,e.strokeRect(n+.5,t.top+.5,o-n-1,t.bottom-t.top-1),e.strokeStyle="rgba(255, 255, 255, 0.06)",e.setLineDash([6,8]),e.beginPath(),e.moveTo(n+4,t.cy),e.lineTo(o-4,t.cy),e.stroke(),e.setLineDash([]);const i=t.dir===1?n+6:o-6,r=Ft/2;for(let s=0;s<to.length;s++){const a=i-t.dir*s*(Ft+2);e.fillStyle=Y("#f59e0b",to[s]??0),e.beginPath(),e.moveTo(a,t.cy-r),e.lineTo(a+t.dir*Ft,t.cy),e.lineTo(a,t.cy+r),e.closePath(),e.fill()}}function ks(e,t,n,o,i,r,s,a){e.font=`500 ${a.fontMain}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textBaseline="top";for(const l of t){const c=n(l.y);e.fillStyle="rgba(245, 158, 11, 0.12)",e.fillRect(c-3,o-4,6,i-o+8),e.strokeStyle=Y("#f59e0b",.4),e.lineWidth=1,e.beginPath(),e.moveTo(c-3,o-4),e.lineTo(c-3,i+4),e.moveTo(c+3,o-4),e.lineTo(c+3,i+4),e.stroke(),e.fillStyle=on;const f=e.measureText(l.name).width;let p=c,d="center";c-f/2<4?(d="left",p=4):c+f/2>s-4&&(d="right",p=s-4),e.textAlign=d,e.fillText(l.name,p,r+jo)}}function _s(e,t,n,o,i){if(t<=0)return;e.font=`600 ${i.fontSmall}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textAlign="center",e.textBaseline="middle";const r=t>99?"99+":String(t),a=e.measureText(r).width+4*2,l=i.fontSmall+4;ee(e,n-a/2,o-l/2,a,l,l/2),e.fillStyle="rgba(8, 10, 14, 0.72)",e.fill(),e.strokeStyle=Y(at,.45),e.lineWidth=1,e.stroke(),e.fillStyle=Y(at,.95),e.fillText(r,n,o+.5)}const Cs={loading:"rgba(28, 50, 70, 0.95)","door-opening":"rgba(60, 42, 12, 0.95)","door-closing":"rgba(60, 42, 12, 0.95)",moving:"rgba(50, 38, 12, 0.95)"},Ts="rgba(35, 40, 50, 0.95)";function Rs(e,t,n,o,i,r,s){const a=t-o/2,l=n-i/2,c=Math.min(4,i/2),f=i*.4;e.save(),r===-1&&(e.translate(2*t,0),e.scale(-1,1)),e.fillStyle=Cs[s.phase]??Ts,e.beginPath(),e.moveTo(a+c,l),e.lineTo(a+o-f,l),e.lineTo(a+o,n),e.lineTo(a+o-f,l+i),e.lineTo(a+c,l+i),e.arcTo(a,l+i,a,l+i-c,c),e.lineTo(a,l+c),e.arcTo(a,l,a+c,l,c),e.closePath(),e.fill(),e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.stroke(),e.restore();const p=i*.45,d=l+i*.32,u=i*.36,g=a+p,h=a+o-p;if(h>g){e.fillStyle="rgba(170, 220, 255, 0.18)",e.fillRect(g,d,h-g,u),e.strokeStyle="rgba(8, 10, 14, 0.6)",e.lineWidth=1,e.beginPath();const m=10;for(let w=g+m;w<h;w+=m)e.moveTo(w,d),e.lineTo(w,d+u);e.stroke()}if(s.riders>0&&h-g>6){const m=Math.min(1.6,u/4),w=5,_=Math.floor((h-g-6)/w),I=Math.min(s.riders,Math.max(1,_));e.fillStyle=Y(et,.85);for(let y=0;y<I;y++){const S=g+4+y*w;e.beginPath(),e.arc(S,d+u/2,m,0,Math.PI*2),e.fill()}}}function Is(e,t){const n=e.map(i=>t(i.y)).sort((i,r)=>i-r);let o=1/0;for(let i=1;i<n.length;i++){const r=n[i],s=n[i-1];if(r===void 0||s===void 0)continue;const a=r-s;a>0&&a<o&&(o=a)}return Number.isFinite(o)?o:100}function Es(e,t,n,o,i){const r=[];for(const v of t.lines)v.orientation==="horizontal"&&r.push(v.id);if(r.length===0||t.stops.length<2)return;r.sort((v,R)=>v-R);let s=t.stops[0]?.y??0,a=s;for(const v of t.stops)v.y<s&&(s=v.y),v.y>a&&(a=v.y);const l=Math.max(1e-6,a-s),c=Math.max(48,i.padX+30),f=c,p=n-c,d=v=>f+(v-s)/l*(p-f),u=14,g=i.fontMain+jo+4,h=Me+u,m=o-st-g,_=vs(h,m,r,v=>t.lines.find(R=>R.id===v)?.name??`Line ${v}`);Ss(e,n,o,f,p);for(const v of _)ws(e,v,f,p);e.font=`500 ${i.fontSmall}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textBaseline="bottom",e.fillStyle=on;for(const v of _)v.dir===1?(e.textAlign="left",e.fillText(`${v.name} →`,f+18,v.top-2)):(e.textAlign="right",e.fillText(`← ${v.name}`,p-18,v.top-2));const I=_[0]?.top??h,y=_[_.length-1]?.bottom??m;ks(e,t.stops,d,I,y,o-st,n,i);const S=Math.max(36,Math.min(110,Is(t.stops,d)*.55)),C=_[0]?_[0].bottom-_[0].top:24,b=Math.max(14,Math.min(28,C*.7)),T=new Map;for(const v of _)T.set(v.lineId,v);for(const v of t.cars){const R=T.get(v.line);R!==void 0&&Rs(e,d(v.y),R.cy,S,b,R.dir,v)}const E=8;for(const v of t.stops){if(v.waiting===0)continue;const R=d(v.y);for(let A=0;A<_.length;A++){const M=_[A];if(M===void 0)continue;const F=v.waiting_by_line.find(te=>te.line===M.lineId)?.count??0;if(F===0)continue;const O=A===0?M.top-E:M.bottom+E;_s(e,F,R,O,i)}}}function no(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function As(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:ft(o)})}return t}function ft(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function Vo(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function oo(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function Ms(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function Ps(e,t,n,o,i,r){const s=Math.abs(t-e);if(s<.001)return 0;const a=Math.abs(n);if(a*a/(2*r)>=s)return a>0?a/r:0;const c=Math.max(0,(o-a)/i),f=a*c+.5*i*c*c,p=o/r,d=o*o/(2*r);if(f+d>=s){const g=(2*i*r*s+r*a*a)/(i+r),h=Math.sqrt(Math.max(g,a*a));return(h-a)/i+h/r}const u=s-f-d;return c+u/Math.max(o,.001)+p}const Yo={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},lt={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function Ls(e,t,n,o,i,r){const s=i/2,a=o-r/2,l=ut[t.phase]??"#6b6b75",c=e.createLinearGradient(n,a,n,a+r);c.addColorStop(0,Qt(l,.14)),c.addColorStop(1,Qt(l,-.18)),e.fillStyle=c,ee(e,n-s,a,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-s+2,a+r*.36,i-4,Math.max(1.5,r*.1))}function Bs(e,t,n,o,i){if(t.length===0)return;const r=7,s=4,a=i.fontSmall+2,l=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px ${V}`;const c=(d,u)=>{const g=[d.carName,ft(d.altitudeM),Vo(d.velocity),`${Yo[d.phase]} · ${d.layer}`];let h=0;for(const y of g)h=Math.max(h,e.measureText(y).width);const m=h+r*2,w=g.length*a+s*2;let _=u==="right"?d.cx+l:d.cx-l-m;_=Math.max(2,Math.min(o-m-2,_));const I=d.cy-w/2;return{hud:d,lines:g,bx:_,by:I,bubbleW:m,bubbleH:w,side:u}},f=(d,u)=>!(d.bx+d.bubbleW<=u.bx||u.bx+u.bubbleW<=d.bx||d.by+d.bubbleH<=u.by||u.by+u.bubbleH<=d.by),p=[];t.forEach((d,u)=>{let g=c(d,u%2===0?"right":"left");if(p.some(h=>f(g,h))){const h=c(d,g.side==="right"?"left":"right");if(p.every(m=>!f(h,m)))g=h;else{const m=Math.max(...p.map(w=>w.by+w.bubbleH));g={...g,by:m+4}}}p.push(g)});for(const d of p){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",ee(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=lt[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,ee(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let u=0;u<d.lines.length;u++){const g=d.by+s+a*u+a/2,h=d.lines[u]??"";e.fillStyle=u===0||u===3?lt[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(h,d.bx+r,g)}e.restore()}}function xs(e,t,n,o,i,r){if(t.length===0)return;const s=18,a=10,l=6,c=5,f=r.fontSmall+2.5,d=l*2+5*f,u=s+l+(d+c)*t.length;e.save();const g=e.createLinearGradient(n,i,n,i+u);g.addColorStop(0,"#252530"),g.addColorStop(1,"#1a1a1f"),e.fillStyle=g,ee(e,n,i,o,u,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,ee(e,n,i,o,u,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px ${V}`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+a,i+s/2+2);let h=i+s+l;for(const m of t){e.fillStyle="rgba(15, 15, 18, 0.55)",ee(e,n+6,h,o-12,d,5),e.fill(),e.fillStyle=lt[m.phase],e.fillRect(n+6,h,2,d);const w=n+a+4,_=n+o-a;let I=h+l+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px ${V}`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(m.carName,w,I),e.textAlign="right",e.fillStyle=lt[m.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px ${V}`,e.fillText(Yo[m.phase].toUpperCase(),_,I);const y=m.etaSeconds!==void 0&&Number.isFinite(m.etaSeconds)?Ms(m.etaSeconds):"—",S=[["Altitude",ft(m.altitudeM)],["Velocity",Vo(m.velocity)],["Dest",m.destinationName??"—"],["ETA",y]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px ${V}`;for(const[C,b]of S)I+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(C,w,I),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(b,_,I);h+=d+c}e.restore()}function Fs(e,t,n,o,i,r,s,a,l,c,f){c.length=e.cars.length;for(let p=0;p<e.cars.length;p++){const d=e.cars[p];d!==void 0&&(c[p]=d.id)}c.sort((p,d)=>p-d),f.clear();for(let p=0;p<c.length;p++){const d=c[p];d!==void 0&&f.set(d,p)}l.length=e.cars.length;for(let p=0;p<e.cars.length;p++){const d=e.cars[p];if(d===void 0)continue;const u=d.y,g=d.target!==void 0?a.get(d.target):void 0,h=g!==void 0?e.stops[g]:void 0,m=h?Ps(u,h.y,d.v,i,r,s):void 0,w=f.get(d.id)??0,_=l[p];_===void 0?l[p]={cx:n,cy:t.toScreenAlt(u),altitudeM:u,velocity:d.v,phase:oo(d.v,o.get(d.id)??0,i),layer:no(u),carName:`Climber ${String.fromCharCode(65+w)}`,destinationName:h?.name,etaSeconds:m}:(_.cx=n,_.cy=t.toScreenAlt(u),_.altitudeM=u,_.velocity=d.v,_.phase=oo(d.v,o.get(d.id)??0,i),_.layer=no(u),_.carName=`Climber ${String.fromCharCode(65+w)}`,_.destinationName=h?.name,_.etaSeconds=m)}return l}const Te=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function $t(e,t,n){return e+(t-e)*n}function Dt(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round($t(o>>16&255,i>>16&255,n)),s=Math.round($t(o>>8&255,i>>8&255,n)),a=Math.round($t(o&255,i&255,n));return`#${(r<<16|s<<8|a).toString(16).padStart(6,"0")}`}function $s(e,t){let n=0;for(;n<Te.length-1;n++){const c=Te[n+1];if(c===void 0||e<=c[0])break}const o=Te[n],i=Te[Math.min(n+1,Te.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],s=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),a=Dt(o[1],i[1],s),l=Dt(o[2],i[2],s);return Dt(a,l,t)}const Ds=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function Os(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),s=Math.log10(1+t.axisMaxM/1e3),a=[0,.05,.15,.35,.6,1];for(const c of a){const f=1e3*(10**(c*s)-1);r.addColorStop(c,$s(f,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const c of Ds){const f=t.axisMaxM*c.altFrac;if(f<8e4)continue;const p=t.toScreenAlt(f),d=n+c.xFrac*(o-n),u=c.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${u.toFixed(3)})`,e.beginPath(),e.arc(d,p,c.size,0,Math.PI*2),e.fill()}e.restore();const l=As(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const c of l){const f=t.toScreenAlt(c.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(o,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(c.label,n+4,f-6))}}function Ws(e,t,n,o){const r=o-28,s=e.createLinearGradient(0,r,0,o);s.addColorStop(0,"rgba(0,0,0,0)"),s.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),s.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=s,e.fillRect(t,r,n-t,28),e.strokeStyle=Y("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function Ns(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function Hs(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const s=-Math.PI/2+r*Math.PI/3,a=t+Math.cos(s)*i,l=n+Math.sin(s)*i;r===0?e.moveTo(a,l):e.lineTo(a,l)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function qs(e,t,n,o,i,r,s){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const a of t.stops){const l=n.toScreenAlt(a.y);if(l<n.shaftTop||l>n.shaftBottom)continue;const c=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-c/2,l),e.lineTo(o-5,l),e.moveTo(o+5,l),e.lineTo(o+c/2,l),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-c/2,l),e.lineTo(o-5,l-5),e.moveTo(o+c/2,l),e.lineTo(o+5,l-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(a.name,r+s-4,l-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(ft(a.y),r+s-4,l+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function Gs(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const s=Math.log10(1+Math.max(0,r)/1e3),a=i<=0?0:Math.max(0,Math.min(1,s/i));return t-a*(t-e)}}}function Us(e,t,n,o,i,r,s){const a=Math.max(2,s.figureHeadR*.9);for(const l of t.cars){if(l.target===void 0)continue;const c=r.get(l.target);if(c===void 0)continue;const f=t.stops[c];if(f===void 0)continue;const p=i.get(l.id);if(p===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,p),e.lineTo(o,d),e.stroke(),e.fillStyle=Uo,e.beginPath(),e.arc(o,d,a,0,Math.PI*2),e.fill())}}function Xs(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function zs(e,t,n,o,i,r,s){s.firstDrawAt===0&&(s.firstDrawAt=performance.now());const a=(performance.now()-s.firstDrawAt)/1e3,l=r.showDayNight?Xs(a):.5,c=n>=520&&o>=360,f=Math.min(120,Math.max(72,n*.16)),p=c?Math.min(220,Math.max(160,n*.24)):0,d=c?14:0,u=i.padX,g=u+f+4,h=n-i.padX-p-d,m=(g+h)/2,w=12,_=i.padTop+24,I=o-i.padBottom-18,y=Gs(_,I,r);Os(e,y,g+w,h-w,l),Ws(e,g+w,h-w,I),Ns(e,m,y),Hs(e,m,y.shaftTop,i),qs(e,t,y,m,i,u,f);const S=Math.max(20,Math.min(34,h-g-8)),C=Math.max(16,Math.min(26,S*.72));i.carH=C,i.carW=S;const b=s.carCenters,T=s.stopIdxById;b.clear(),T.clear();for(let v=0;v<t.stops.length;v++){const R=t.stops[v];R!==void 0&&T.set(R.entity_id,v)}for(const v of t.cars)b.set(v.id,y.toScreenAlt(v.y));Us(e,t,y,m,b,T,i);for(const v of t.cars){const R=b.get(v.id);R!==void 0&&Ls(e,v,m,R,S,C)}const E=Fs(t,y,m,s.prevVelocity,s.maxSpeed,s.acceleration,s.deceleration,T,s.hudBuf,s.idSortBuf,s.idRankBuf);E.sort((v,R)=>R.altitudeM-v.altitudeM),Bs(e,E,S,n-p-d,i),c&&xs(e,E,n-i.padX-p,p,_,i);for(const v of t.cars)s.prevVelocity.set(v.id,v.v);if(s.prevVelocity.size>t.cars.length)for(const v of s.prevVelocity.keys())b.has(v)||s.prevVelocity.delete(v)}const js=1e6;function Ko(e,t){return e*js+t}function Vs(e){return{has:(t,n)=>e.has(Ko(t,n))}}function Ys(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function io(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}const Ks=.8,Qs=2;function Js(e,t,n){const o=performance.now();for(const i of t){const r=o-i.bornAt;if(r<0)continue;const s=Math.min(1,Math.max(0,r/i.duration)),a=zo(s),l=i.startX+(i.endX-i.startX)*a,c=Math.sin(a*Math.PI*Qs*2)*Ks,f=i.floorY+c,p=Zs(i.kind,s,a);if(p<=0)continue;const d=e.globalAlpha;e.globalAlpha=p,rn(e,l,f,n.figureHeadR,i.color,i.variant),e.globalAlpha=d}}function Zs(e,t,n){return e==="board"?t<.75?1:Math.max(0,1-(t-.75)/.25):e==="alight"?t<.2?t/.2:t>.6?Math.max(0,1-(t-.6)/.4):1:.7*(1-n)**1.2}function el(e,t){const{count:n,enablePairs:o,halfPairW:i,now:r,stagger:s,duration:a,originX:l,endX:c,floorY:f,color:p}=t;let d=0,u=0;for(;d<n;){const g=o&&d+1<n?2:1;for(let h=0;h<g;h++){const m=g===2?h===0?-i:i:0;e.push({kind:"board",bornAt:r+u*s,duration:a,startX:l+m,endX:c+m,floorY:f,color:p,variant:Q(t.stopId,d+h+t.dirOffset)})}d+=g,u++}}function tl(e,t){const{count:n,now:o,stagger:i,duration:r,startX:s,endX:a,floorY:l,color:c,stopId:f}=t;for(let p=0;p<n;p++)e.push({kind:"abandon",bornAt:o+p*i,duration:r,startX:s,endX:a,floorY:l,color:c,variant:Q(f,2e4+p)})}function nl(e,t){const{count:n,enablePairs:o,halfPairW:i,now:r,stagger:s,duration:a,startX:l,endX:c,floorY:f,color:p}=t;let d=0,u=0;for(;d<n;){const g=o&&d+1<n?2:1;for(let h=0;h<g;h++){const m=d+h,w=g===2?h===0?-i:i:0;e.push({kind:"alight",bornAt:r+u*s,duration:a,startX:l+w,endX:c+w,floorY:f,color:p,variant:t.variants[t.variants.length-1-m]??Q(t.carId,m)})}d+=g,u++}}class Qo{#e;#t;#n=window.devicePixelRatio||1;#i;#r=null;#a=-1;#d=new Map;#s;#o=new Map;#l=new Map;#c=[];#p=null;#m=new Map;#R=new Map;#I=new Map;#E=[];#A=[];#M=new Map;#b=1;#y=1;#S=1;#f=0;#u=new Map;#v=new Map;#P=new Map;#g=new Map;#w=[];#k=new Map;#_=new Set;#L=Vs(this.#_);#B=[];#x=[];#F=[];#$=new Map;#C=new Map;#D=new Map;#T=new Map;#O=[];#W=[];#N=[];#H=new Map;constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#t=o,this.#s=n,this.#h(),this.#i=()=>{this.#h()},window.addEventListener("resize",this.#i)}dispose(){window.removeEventListener("resize",this.#i)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#m.clear(),this.#f=0,this.#u.clear()}setTetherPhysics(t,n,o){Number.isFinite(t)&&t>0&&(this.#b=t),Number.isFinite(n)&&n>0&&(this.#y=n),Number.isFinite(o)&&o>0&&(this.#S=o)}pushAssignment(t,n,o){let i=this.#u.get(t);i===void 0&&(i=new Map,this.#u.set(t,i)),i.set(o,n)}#h(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#n,i=n*this.#n;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}#q(t,n){const o=this.#w.pop();return o!==void 0?(o.start=t,o.end=n,o):{start:t,end:n}}#G(){for(const t of this.#g.values())this.#w.push(t);this.#g.clear()}draw(t,n,o){this.#h();const{clientWidth:i,clientHeight:r}=this.#e,s=this.#t;if(s.clearRect(0,0,i,r),t.stops.length===0||i===0||r===0)return;i!==this.#a&&(this.#r=Ys(i),this.#a=i);const a=this.#r;if(a===null)return;if(this.#p!==null){this.#U(t,i,r,a,n,o,this.#p);return}if(t.lines.some(k=>k.orientation==="horizontal")){Es(s,t,i,r,a);return}const l=t.stops.length===2,c=this.#v;c.clear();for(const k of t.cars)c.set(k.id,k);const f=this.#N;f.length=t.stops.length;for(let k=0;k<t.stops.length;k++)f[k]=t.stops[k];f.sort((k,P)=>k.y-P.y);const p=this.#O;p.length=f.length;for(let k=0;k<f.length;k++){const P=f[k];p[k]=P===void 0?0:P.y}const d=t.stops[0];if(d===void 0)return;let u=d.y,g=d.y;for(let k=1;k<t.stops.length;k++){const P=t.stops[k];if(P===void 0)continue;const B=P.y;B<u&&(u=B),B>g&&(g=B)}const h=p.length>=3?(p.at(-1)??0)-(p.at(-2)??0):1,w=u-1,_=g+h,I=Math.max(_-w,1e-4),y=l?18:0;let S,C;if(l)S=a.padTop+y,C=r-a.padBottom-y;else{let k=1/0;for(let ne=1;ne<p.length;ne++){const Ne=p[ne],He=p[ne-1];if(Ne===void 0||He===void 0)continue;const ke=Ne-He;ke>0&&ke<k&&(k=ke)}Number.isFinite(k)||(k=1);const B=48/k,U=Math.max(0,r-a.padTop-a.padBottom)/I,K=Math.min(U,B),pe=I*K;C=r-a.padBottom,S=C-pe}const b=k=>C-(k-w)/I*(C-S),T=this.#d;T.forEach(k=>k.length=0);for(const k of t.cars){const P=T.get(k.line);P?P.push(k):T.set(k.line,[k])}const E=this.#W;E.length=0;for(const k of T.keys())E.push(k);E.sort((k,P)=>k-P);let v=0;for(const k of E)v+=T.get(k)?.length??0;const R=Math.max(0,i-2*a.padX-a.labelW),A=a.figureStride*2,M=a.shaftSpacing*Math.max(v-1,0),F=(R-M)/Math.max(v,1),O=l?34:a.maxShaftInnerW,G=Math.max(a.minShaftInnerW,Math.min(O,F*.55)),ve=Math.max(0,Math.min(F-G,A+a.figureStride*4)),we=Math.max(14,G-6);let ce=1/0;if(t.stops.length>=2)for(let k=1;k<p.length;k++){const P=p[k-1],B=p[k];if(P===void 0||B===void 0)continue;const W=b(P)-b(B);W>0&&W<ce&&(ce=W)}const ii=b(g)-2,ri=Number.isFinite(ce)?ce:a.carH,ai=l?a.carH:ri,si=Math.max(14,Math.min(ai,ii));if(!l&&Number.isFinite(ce)){const k=Math.max(1.5,Math.min(ce*.067,4)),P=a.figureStride*(k/a.figureHeadR);a.figureHeadR=k,a.figureStride=P}a.shaftInnerW=G,a.carW=we,a.carH=si;const li=a.padX+a.labelW,ci=G+ve,We=this.#B;We.length=0;const de=this.#P;de.clear(),this.#G();const gt=this.#g;let ln=0;for(const k of E){const P=T.get(k)??[];for(const B of P){const W=li+ln*(ci+a.shaftSpacing),U=W,K=W+ve,pe=K+G/2;We.push(pe),de.set(B.id,pe),gt.set(B.id,this.#q(U,K)),ln++}}const ht=this.#k;ht.clear();for(let k=0;k<t.stops.length;k++){const P=t.stops[k];P!==void 0&&ht.set(P.entity_id,k)}const cn=this.#_;cn.clear();{let k=0;for(const P of E){const B=T.get(P)??[];for(const W of B){if(W.phase==="loading"||W.phase==="door-opening"||W.phase==="door-closing"){const U=io(t.stops,W.y);U!==void 0&&U.dist<.5&&cn.add(Ko(k,U.stop.entity_id))}k++}}}const mt=this.#$,bt=this.#C,yt=this.#D,St=this.#T;mt.clear(),bt.clear(),yt.clear(),St.clear();const vt=this.#x;vt.length=0;const wt=this.#F;wt.length=0;let dn=0;for(let k=0;k<E.length;k++){const P=E[k];if(P===void 0)continue;const B=T.get(P)??[],W=Na[k]??qa,U=Ha[k]??Ga,K=Ua[k]??1,pe=Va[k]??Ya,ne=Math.max(14,G*K),Ne=Math.max(10,we*K),He=Math.max(10,a.carH),ke=k===2?za:k===3?ja:et;let qe=1/0,kt=-1/0,Ge=1/0;for(const J of B){mt.set(J.id,ne),bt.set(J.id,Ne),yt.set(J.id,He),St.set(J.id,ke);const ue=We[dn];if(ue===void 0)continue;const pn=Number.isFinite(J.min_served_y)&&Number.isFinite(J.max_served_y),_t=pn?Math.max(S,b(J.max_served_y)-a.carH-2):S,di=pn?Math.min(C,b(J.min_served_y)+2):C;vt.push({cx:ue,top:_t,bottom:di,fill:W,frame:U,width:ne}),ue<qe&&(qe=ue),ue>kt&&(kt=ue),_t<Ge&&(Ge=_t),dn++}E.length>1&&Number.isFinite(qe)&&Number.isFinite(Ge)&&wt.push({cx:(qe+kt)/2,top:Ge,text:Xa[k]??`Line ${k+1}`,color:pe})}os(s,vt),is(s,wt,a),rs(s,f,b,a,We,i,this.#L,S,l),as(s,t,b,a,gt,this.#u),cs(s,t,de,mt,b,a,ht);for(const k of t.cars){const P=de.get(k.id);if(P===void 0)continue;const B=bt.get(k.id)??a.carW,W=yt.get(k.id)??a.carH,U=St.get(k.id)??et,K=this.#o.get(k.id);ds(s,k,P,B,W,b),ps(s,k,P,B,W,U,b,a,K?.roster)}this.#X(t,de,gt,b,a,n),Js(s,this.#c,a),o&&o.size>0&&bs(s,this.#s,c,o,de,b,a,i)}#U(t,n,o,i,r,s,a){const l={prevVelocity:this.#m,maxSpeed:this.#b,acceleration:this.#y,deceleration:this.#S,firstDrawAt:this.#f,carCenters:this.#R,stopIdxById:this.#I,hudBuf:this.#E,idSortBuf:this.#A,idRankBuf:this.#M};zs(this.#t,t,n,o,i,a,l),this.#f=l.firstDrawAt}#X(t,n,o,i,r,s){const a=performance.now(),l=Math.max(1,s),c=Ja/l,f=80/l,p=Math.max(1.5,Math.min(2.5,r.figureStride*.45)),d=this.#H;d.clear();for(const u of t.cars){const g=this.#o.get(u.id),h=n.get(u.id),m=io(t.stops,u.y),w=u.phase==="loading"&&m!==void 0&&m.dist<.5?m.stop:void 0,_=w!==void 0&&w.waiting_up>=w.waiting_down,I=_?0:1e4;if(g&&h!==void 0&&w!==void 0){const S=u.riders-g.riders;if(S>0&&d.set(w.entity_id,(d.get(w.entity_id)??0)+S),S!==0){const C=i(w.y),b=this.#C.get(u.id)??r.carW,T=b>=r.figureStride*3,E=Math.min(Math.abs(S),6);if(S>0){const v=o.get(u.id),R=v!==void 0?v.end-2:h-20,A=_?at:qo,M=this.#u.get(w.entity_id);M!==void 0&&(M.delete(u.line),M.size===0&&this.#u.delete(w.entity_id)),el(this.#c,{count:E,enablePairs:T,halfPairW:p,now:a,stagger:f,duration:c,originX:R,endX:h,floorY:C,color:A,stopId:w.entity_id,dirOffset:I})}else{const v=this.#T.get(u.id)??et,R=h+b/2+14,A=g.roster.slice(Math.max(0,g.roster.length-E));nl(this.#c,{count:E,enablePairs:T,halfPairW:p,now:a,stagger:f,duration:c,startX:h,endX:R,floorY:C,color:v,variants:A,carId:u.id})}}}let y;if(g){const S=u.riders-g.riders;if(S===0)y=g.roster;else if(y=g.roster.slice(),S>0&&w!==void 0)for(let C=0;C<S;C++)y.push(Q(w.entity_id,C+I));else if(S>0)for(let C=0;C<S;C++)y.push(Q(u.id,y.length+C));else y.splice(y.length+S,-S)}else{y=[];for(let S=0;S<u.riders;S++)y.push(Q(u.id,S))}for(;y.length>u.riders;)y.pop();for(;y.length<u.riders;)y.push(Q(u.id,y.length));this.#o.set(u.id,{riders:u.riders,roster:y})}for(const u of t.stops){const g=u.waiting_up+u.waiting_down,h=this.#l.get(u.entity_id);if(h){const m=h.waiting-g,w=d.get(u.entity_id)??0,_=Math.max(0,m-w);_>0&&tl(this.#c,{count:Math.min(_,4),now:a,stagger:f,duration:c*2.2,startX:r.padX+r.labelW+20,endX:r.padX+r.labelW-16,floorY:i(u.y),color:Go,stopId:u.entity_id})}this.#l.set(u.entity_id,{waiting:g})}{let u=0;for(let g=0;g<this.#c.length;g++){const h=this.#c[g];h!==void 0&&a-h.bornAt<=h.duration&&(this.#c[u++]=h)}this.#c.length=u}if(this.#o.size>t.cars.length)for(const u of this.#o.keys())this.#v.has(u)||this.#o.delete(u);if(this.#l.size>t.stops.length)for(const u of this.#l.keys())this.#k.has(u)||this.#l.delete(u)}}const ol="#f59e0b",il=3;function rl(){const e="quest-pane";return{root:L("quest-pane",e),gridView:L("quest-grid",e),stageView:L("quest-stage-view",e),backBtn:L("quest-back-to-grid",e),title:L("quest-stage-title",e),brief:L("quest-stage-brief",e),stageStars:L("quest-stage-stars",e),editorHost:L("quest-editor",e),runBtn:L("quest-run",e),resetBtn:L("quest-reset",e),result:L("quest-result",e),progress:L("quest-progress",e),shaft:L("quest-shaft",e),shaftIdle:L("quest-shaft-idle",e)}}function Ot(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=Oe(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(il-n)}function Wt(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function al(e){const t=rl(),n=b=>{const T=ya(b);if(T)return T;const E=le[0];if(!E)throw new Error("quest-pane: stage registry is empty");return E},o=Pa(n(e.initialStageId),"grid");Ot(t,o.activeStage);const i=Aa();qn(i,o.activeStage);const r=Ma();Un(r,o.activeStage);const s=Ba();Mt(s,o.activeStage);const a=Ca(),l=new Qo(t.shaft,ol);t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const c=await Lr({container:t.editorHost,initialValue:Dn(o.activeStage.id)??o.activeStage.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const f=xa(),p=300;let d=null,u=!1;const g=()=>{u||(d!==null&&clearTimeout(d),d=setTimeout(()=>{On(o.activeStage.id,c.getValue()),d=null},p))},h=()=>{d!==null&&(clearTimeout(d),d=null,On(o.activeStage.id,c.getValue()))},m=b=>{u=!0;try{c.setValue(b)}finally{u=!1}};c.onDidChange(()=>{g()});const w=Oa();jn(w,o.activeStage,c);const _=()=>{Xn(o),t.shaftIdle.hidden=!1;const b=t.shaft.getContext("2d");b&&b.clearRect(0,0,t.shaft.width,t.shaft.height)},I=(b,{fromGrid:T})=>{h(),La(o,b),Ot(t,b),qn(i,b),Un(r,b),Mt(s,b),jn(w,b,c),m(Dn(b.id)??b.starterCode),c.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",_(),Wt(t,"stage"),At(o,"stage"),e.onStageChange?.(b.id)},y=()=>{h(),_(),t.result.textContent="",t.progress.textContent="",Wt(t,"grid"),At(o,"grid"),Et(a,b=>{I(n(b),{fromGrid:!0})}),e.onBackToGrid?.()};Et(a,b=>{I(n(b),{fromGrid:!0})});const S=e.landOn??"grid";Wt(t,S),At(o,S);const C=async()=>{const b=o.activeStage;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",c.clearRuntimeMarker();let T=null,E=0;o.runLoop.active=!0;const v=()=>{o.runLoop.active&&(T!==null&&l.draw(T,1),requestAnimationFrame(v))};t.shaftIdle.hidden=!0,requestAnimationFrame(v);try{const R=await Ia(b,c.getValue(),{timeoutMs:1e3,onProgress:A=>{Ce(o,b)&&(t.progress.textContent=Ea(A))},onSnapshot:A=>{T=A,E+=1}});if(R.passed){const A=Oe(b.id);R.stars>A&&(wa(b.id,R.stars),Et(a,M=>{I(n(M),{fromGrid:!0})}),Ce(o,b)&&Ot(t,o.activeStage)),Ce(o,b)&&Mt(s,o.activeStage,{collapse:!1})}if(Ce(o,b)){t.result.textContent="",t.progress.textContent="";const A=R.passed?Sa(b.id):void 0,M=A?()=>{I(A,{fromGrid:!1})}:void 0;Fa(f,R,()=>void C(),b.failHint,M)}}catch(R){if(Ce(o,b)){const A=R instanceof Error?R.message:String(R);t.result.textContent=`Error: ${A}`,t.progress.textContent="",R instanceof $o&&R.location!==null&&c.setRuntimeMarker({line:R.location.line,column:R.location.column,message:A})}}finally{if(t.runBtn.disabled=!1,Xn(o),E===0){const R=t.shaft.getContext("2d");R&&R.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{C()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${o.activeStage.title} to its starter code?`)&&(va(o.activeStage.id),m(o.activeStage.starterCode),c.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{y()}),{handles:t,editor:c}}let Nt=null;async function Jo(){if(!Nt){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;Nt=import(e).then(async n=>(await n.default(t),n))}return Nt}class sn{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,o){const i=await Jo();return new sn(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class Zo{#e;#t=0;#n=[];#i=0;#r=0;#a=1;#d=0;constructor(t){this.#e=sl(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#i=t.reduce((n,o)=>n+o.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#a=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const o=t.stops.filter(a=>a.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#a/60*i,this.#r=(this.#r+i)%(this.#i||1);const s=[];for(;this.#t>=1;)this.#t-=1,s.push(this.#s(o,r));return s}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,o]of this.#n.entries())if(t-=o.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#i<=0?0:Math.min(1,this.#r/this.#i)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#n}#s(t,n){const o=this.#o(t.length,n.originWeights);let i=this.#o(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],s=t[i];if(!r||!s)throw new Error("stop index out of bounds");const a=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:s.stop_id,weight:a,...this.#d>0?{patienceTicks:this.#d}:{}}}#o(t,n){if(!n||n.length!==t)return this.#c(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#c(t);let i=this.#p()*o;for(const[r,s]of n.entries())if(i-=Math.max(0,s),i<0)return r;return t-1}#l(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#c(t){return Number(this.#l()%BigInt(t))}#p(){return Number(this.#l()>>11n)/2**53}}function sl(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const ll="#7dd3fc",cl="#fda4af";async function ro(e,t,n,o,i){const r=hi(o,i),s=await sn.create(r,t,n),a=new Qo(e.canvas,e.accent);if(a.setTetherConfig(o.tether??null),o.tether){const c=tn(o,i);a.setTetherPhysics(c.maxSpeed,c.acceleration,c.deceleration)}const l=e.canvas.parentElement;if(l){const c=o.stops.length,p=o.tether?640:Math.max(200,c*16);l.style.setProperty("--shaft-min-h",`${p}px`)}return{strategy:t,sim:s,renderer:a,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function Re(e){e?.sim.dispose(),e?.renderer.dispose()}function ei(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const dl=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],pl=120;function ao(e,t,n){const o=e.sim.metrics();e.latestMetrics=o;for(const r of dl){const s=e.metricHistory[r];s.push(o[r]),s.length>pl&&s.shift()}const i=performance.now();for(const[r,s]of e.bubbles)s.expiresAt<=i&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const ul={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},fl=1e3;function gl(e,t,n){const o=performance.now(),i=new Map;for(const s of n.stops)i.set(s.entity_id,s.name);const r=s=>i.get(s)??`stop #${s}`;for(const s of t){const a=hl(s,r);if(a===null)continue;const l=s.elevator;if(l===void 0)continue;const c=ul[s.kind]??fl;e.bubbles.set(l,{glyph:a.glyph,text:a.text,bornAt:o,expiresAt:o+c})}}function hl(e,t){switch(e.kind){case"elevator-assigned":return{glyph:"›",text:`To ${t(e.stop)}`};case"elevator-repositioning":return{glyph:"↻",text:`Reposition to ${t(e.stop)}`};case"elevator-arrived":return{glyph:"●",text:`At ${t(e.stop)}`};case"door-opened":return{glyph:"◌",text:"Doors open"};case"rider-boarded":return{glyph:"+",text:"Boarding"};case"rider-exited":return{glyph:"↓",text:`Off at ${t(e.stop)}`};default:return null}}const ml={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function so(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=ml[t],e.modeEl.title=t)}function bl(){const e=a=>{const l=document.getElementById(a);if(!l)throw new Error(`missing element #${a}`);return l},t=a=>document.getElementById(a),n=(a,l)=>({root:e(`pane-${a}`),canvas:e(`shaft-${a}`),name:e(`name-${a}`),mode:e(`mode-${a}`),desc:e(`desc-${a}`),metrics:e(`metrics-${a}`),trigger:e(`strategy-trigger-${a}`),popover:e(`strategy-popover-${a}`),repoTrigger:e(`repo-trigger-${a}`),repoName:e(`repo-name-${a}`),repoPopover:e(`repo-popover-${a}`),accent:l,which:a}),o=a=>{const l=document.querySelector(`.tweak-row[data-key="${a}"]`);if(!l)throw new Error(`missing tweak row for ${a}`);const c=p=>{const d=l.querySelector(p);if(!d)throw new Error(`missing ${p} in tweak row ${a}`);return d},f=p=>l.querySelector(p);return{root:l,value:c(".tweak-value"),defaultV:c(".tweak-default-v"),dec:c(".tweak-dec"),inc:c(".tweak-inc"),reset:c(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},i={};for(const a of Se)i[a]=o(a);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",ll),paneB:n("b",cl)};Ni(r);const s=document.getElementById("controls-bar");return s&&new ResizeObserver(([l])=>{if(!l)return;const c=Math.ceil(l.borderBoxSize[0]?.blockSize??l.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${c}px`)}).observe(s),r}function Be(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function ti(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function ni(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function yl(e){if(e.length<2)return{d:"M 0 13 L 100 13",lastX:100,lastY:13};let t=e[0]??0,n=e[0]??0;for(let l=1;l<e.length;l++){const c=e[l];c!==void 0&&(c<t&&(t=c),c>n&&(n=c))}const o=n-t,i=e.length;let r="",s=0,a=7;for(let l=0;l<i;l++){const c=l/(i-1)*100,f=o>0?13-((e[l]??0)-t)/o*12:7;r+=`${l===0?"M":"L"} ${c.toFixed(2)} ${f.toFixed(2)} `,s=c,a=f}return{d:r.trim(),lastX:s,lastY:a}}const Ht="http://www.w3.org/2000/svg",Jt=[["wait avg","avg_wait_s"],["wait max","max_wait_s"],["delivered","delivered"],["abandoned","abandoned"],["util","utilization"]];function Sl(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function vl(e,t,n){const o=lo(e,n),i=lo(t,n),r=o-i,s=r>0?"▴":"▾",a=r>0?"+":r<0?"−":"",l=Math.abs(r);switch(n){case"avg_wait_s":case"max_wait_s":return`${s} ${a}${l.toFixed(1)} s`;case"delivered":case"abandoned":return`${s} ${a}${l.toFixed(0)}`;case"utilization":return`${s} ${a}${(l*100).toFixed(0)}%`}}function lo(e,t){switch(t){case"avg_wait_s":return e.avg_wait_s;case"max_wait_s":return e.max_wait_s;case"delivered":return e.delivered;case"abandoned":return e.abandoned;case"utilization":return e.utilization}}function wl(e,t){const n=(u,g,h,m)=>Math.abs(u-g)<h?["tie","tie"]:(m?u>g:u<g)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,s]=n(e.max_wait_s,t.max_wait_s,.05,!1),[a,l]=n(e.delivered,t.delivered,.5,!0),[c,f]=n(e.abandoned,t.abandoned,.5,!1),[p,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:a,abandoned:c,utilization:p},b:{avg_wait_s:i,max_wait_s:s,delivered:l,abandoned:f,utilization:d}}}function co(e){const t=document.createDocumentFragment();for(const[n]of Jt){const o=ie("div","metric-row"),i=document.createElementNS(Ht,"svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS(Ht,"path"));const r=document.createElementNS(Ht,"circle");r.classList.add("metric-spark-dot"),r.setAttribute("r","1.4"),i.appendChild(r),o.append(ie("span","metric-k",n),ie("span","metric-v"),ie("span","metric-d"),i),t.appendChild(o)}e.replaceChildren(t)}function qt(e,t,n,o,i){const r=e.children;for(let s=0;s<Jt.length;s++){const a=r[s];if(!a)continue;const l=Jt[s];if(!l)continue;const c=l[1],f=n?n[c]:"";a.dataset.verdict!==f&&(a.dataset.verdict=f);const p=a.children[1],d=Sl(t,c);p.textContent!==d&&(p.textContent=d);const u=a.children[2],h=i!==null&&f!=="tie"&&f!==""?vl(t,i,c):"";u.textContent!==h&&(u.textContent=h);const m=a.children[3],w=m.firstElementChild,_=m.children[1],I=yl(o[c]);w.getAttribute("d")!==I.d&&w.setAttribute("d",I.d);const y=I.lastX.toFixed(2),S=I.lastY.toFixed(2);_.getAttribute("cx")!==y&&_.setAttribute("cx",y),_.getAttribute("cy")!==S&&_.setAttribute("cy",S)}}const kl=200;function oi(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function oe(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=N(e.permalink.scenario);e.traffic=new Zo(_o(e.permalink.seed)),oi(e,o),Re(e.paneA),Re(e.paneB),e.paneA=null,e.paneB=null;try{const i=await ro(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);se(t.paneA,e.permalink.strategyA),ae(t.paneA,e.permalink.repositionA),co(t.paneA.metrics);let r=null;if(vo(e.permalink))try{r=await ro(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),se(t.paneB,e.permalink.strategyB),ae(t.paneB,e.permalink.repositionB),co(t.paneB.metrics)}catch(s){throw Re(i),s}if(n!==e.initToken){Re(i),Re(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,ti(e,t),ni(e,t),dt(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&H(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function _l(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<kl&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if(ei(e,s=>{const a=s.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);a.kind==="err"&&console.warn(`spawnRider failed (seed): ${a.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(oi(e,N(e.permalink.scenario)),e.seeding=null)}function Cl(e,t){const n=()=>oe(e,t),o={renderPaneStrategyInfo:se,renderPaneRepositionInfo:ae,refreshStrategyPopovers:()=>{Le(e,t,n),Pe(e,t,n)},renderTweakPanel:()=>{const r=N(e.permalink.scenario);dt(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const s=r.target;if(!(s instanceof HTMLElement))return;const a=s.closest(".scenario-card");if(!a)return;const l=a.dataset.scenarioId;!l||l===e.permalink.scenario||Fo(e,t,l,n,o)}),Cn(e,t,t.paneA,n),Cn(e,t,t.paneB,n),wn(e,t,t.paneA,n),wn(e,t,t.paneB,n),Le(e,t,n),Pe(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},q(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",Le(e,t,n),Pe(e,t,n),oe(e,t).then(()=>{H(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||$.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},q(e.permalink),oe(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=xo();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},q(e.permalink),oe(e,t).then(()=>{H(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=Po(r)}),t.speedInput.addEventListener("change",()=>{q(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=Lo(r)}),t.intensityInput.addEventListener("change",()=>{q(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{oe(e,t),H(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";Mo(t,r)});for(const r of Se){const s=t.tweakRows[r];fn(s.dec,()=>{ze(e,t,r,-1,n)}),fn(s.inc,()=>{ze(e,t,r,1,n)}),s.reset.addEventListener("click",()=>{Xi(e,t,r,n)}),s.root.addEventListener("keydown",a=>{a.key==="ArrowUp"||a.key==="ArrowRight"?(a.preventDefault(),ze(e,t,r,1,n)):(a.key==="ArrowDown"||a.key==="ArrowLeft")&&(a.preventDefault(),ze(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{zi(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=ko(e.permalink),s=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(s).then(()=>{H(t.toast,"Permalink copied")},()=>{H(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{Be(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{Be(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&Be(t,!1)}),Tl(e,t,o),Hi(t)}function Tl(e,t,n){window.addEventListener("keydown",o=>{if(e.permalink.mode==="quest")return;if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable||o.target.closest(".monaco-editor"))return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.disabled?H(t.toast,"Compare is unavailable for this scenario"):t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),Be(t,t.shortcutSheet.hidden);return}case"Escape":{if(Ao(t)||Eo(t)){o.preventDefault(),ct(t);return}t.shortcutSheet.hidden||(o.preventDefault(),Be(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=Fe.length){const r=Fe[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),Fo(e,t,r.id,()=>oe(e,t),n))}})}const Rl="elevator-core playground",po="In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";function uo(e){ui(Il(e))}function Il(e){if(e.mode==="quest")return{title:`Quest curriculum — ${Rl}`,description:"Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time."};const n=N(e.scenario).label,o=ye[e.strategyA],i=ye[e.strategyB],r=$e[e.repositionA],s=$e[e.repositionB];if(e.compare){const c=`${n}: ${o} vs ${i} — Elevator dispatch playground`,f=`Compare ${o} (parking: ${r}) against ${i} (parking: ${s}) dispatch on the ${n.toLowerCase()} scenario. ${po}`;return{title:c,description:f}}const a=`${n}: ${o} dispatch — Elevator dispatch playground`,l=`Watch ${o} dispatch (parking: ${r}) handle live rider traffic on the ${n.toLowerCase()} scenario. ${po}`;return{title:a,description:l}}function fo(e,t){e.sim.step(t);const n=e.sim.drainEvents();if(n.length===0)return null;const o=e.sim.snapshot();gl(e,n,o);const i=new Map;for(const r of o.cars)i.set(r.id,r.line);for(const r of n)if(r.kind==="elevator-assigned"){const s=i.get(r.elevator);s!==void 0&&e.renderer.pushAssignment(r.stop,r.elevator,s)}return o}function El(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=wl(t.latestMetrics,n.latestMetrics);qt(t.metricsEl,t.latestMetrics,o.a,t.metricHistory,n.latestMetrics),qt(n.metricsEl,n.latestMetrics,o.b,n.metricHistory,t.latestMetrics)}else qt(t.metricsEl,t.latestMetrics,null,t.metricHistory,null);so(t),n&&so(n)}function Al(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const s=e.paneA,a=e.paneB,l=vo(e.permalink),c=s!==null&&(!l||a!==null);if(e.running&&e.ready&&c){const f=e.permalink.speed;let p=fo(s,f);a&&fo(a,f),e.seeding&&(_l(e),p=null);const u=Math.min(r,4/60)*f;let g=[];if(!e.seeding){const w=p??s.sim.snapshot();g=e.traffic.drainSpawns(w,u),p=w}for(const w of g)ei(e,_=>{const I=_.sim.spawnRider(w.originStopId,w.destStopId,w.weight,w.patienceTicks);I.kind==="err"&&console.warn(`spawnRider failed: ${I.error}`)});const h=e.permalink.speed,m=g.length>0||p===null?s.sim.snapshot():p;ao(s,m,h),a&&ao(a,a.sim.snapshot(),h),El(e),(n+=1)%4===0&&(ti(e,t),ni(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function Ml(){Jo().catch(()=>{});const t=bl(),n=new URLSearchParams(window.location.search).has("k"),o={...$,...xi(window.location.search)};if(!n){o.seed=xo();const a=new URL(window.location.href);a.searchParams.set("k",o.seed),window.history.replaceState(null,"",a.toString())}yr(o);const i=N(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=go(i,o.overrides),wr(o.mode),kr(o.mode),br(o,t);const s={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new Zo(_o(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(Cl(s,t),Li(uo),uo(o),pi(),await oe(s,t),s.ready=!0,Al(s,t),s.permalink.mode==="quest"){const a=new URLSearchParams(window.location.search).has("qs");await al({initialStageId:s.permalink.questStage,landOn:a?"stage":"grid",onStageChange:l=>{s.permalink.questStage=l,q(s.permalink)},onBackToGrid:()=>{s.permalink.questStage=$.questStage,q(s.permalink)}})}}Ml();export{it as _};
