const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-C5YmnvCP.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&i(c)}).observe(document,{childList:!0,subtree:!0});function n(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(o){if(o.ep)return;o.ep=!0;const r=n(o);fetch(o.href,r)}})();function pe(e,t,n){const i=document.createElement(e);return i.className=t,n!==void 0&&(i.textContent=n),i}let Yt=0;function G(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(Yt),Yt=window.setTimeout(()=>{e.classList.remove("show")},1600)}function Kt(e,t){let o=0,r=0;const c=()=>{o&&window.clearTimeout(o),r&&window.clearInterval(r),o=0,r=0};e.addEventListener("pointerdown",s=>{e.disabled||(s.preventDefault(),t(),o=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){c();return}t()},70)},380))}),e.addEventListener("pointerup",c),e.addEventListener("pointerleave",c),e.addEventListener("pointercancel",c),e.addEventListener("blur",c),e.addEventListener("click",s=>{s.pointerType||t()})}function Mi(){document.getElementById("seo-fallback")?.remove()}function Pi(e){document.title!==e.title&&(document.title=e.title),ge('meta[name="description"]',"content",e.description),ge('meta[property="og:title"]',"content",e.title),ge('meta[property="og:description"]',"content",e.description),ge('meta[name="twitter:title"]',"content",e.title),ge('meta[name="twitter:description"]',"content",e.description)}function ge(e,t,n){const i=document.querySelector(e);i&&i.getAttribute(t)!==n&&i.setAttribute(t,n)}function ee(e,t,n){const i=Mt(e,t),o=n[t];if(o===void 0||!Number.isFinite(o))return i;const r=e.tweakRanges[t];return Gn(o,r.min,r.max)}function Mt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return Nn(n.doorOpenTicks,n.doorTransitionTicks)}}function Pt(e,t,n){const i=Mt(e,t),o=e.tweakRanges[t].step/2;return Math.abs(n-i)>o}function Hn(e,t){const n={};for(const i of fe){const o=t[i];o!==void 0&&Pt(e,i,o)&&(n[i]=o)}return n}const fe=["cars","maxSpeed","weightCapacity","doorCycleSec"];function Li(e,t){const{doorOpenTicks:n,doorTransitionTicks:i}=e.elevatorDefaults,o=Nn(n,i),r=Gn(n/(o*ze),.1,.9),c=Math.max(2,Math.round(t*ze)),s=Math.max(1,Math.round(c*r)),a=Math.max(1,Math.round((c-s)/2));return{openTicks:s,transitionTicks:a}}function Nn(e,t){return(e+2*t)/ze}function Lt(e,t){const n=e.elevatorDefaults,i=ee(e,"maxSpeed",t),o=ee(e,"weightCapacity",t),r=ee(e,"doorCycleSec",t),{openTicks:c,transitionTicks:s}=Li(e,r);return{...n,maxSpeed:i,weightCapacity:o,doorOpenTicks:c,doorTransitionTicks:s}}function Fi(e,t){if(e<1||t<1)return[];const n=[];for(let i=0;i<t;i+=1)n.push(Math.min(e-1,Math.floor(i*e/t)));return n}function Bi(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const i=Math.round(ee(e,"cars",t)),o=Lt(e,t),r=Fi(e.stops.length,i),c=e.stops.map((a,l)=>`        StopConfig(id: StopId(${l}), name: ${kt(a.name)}, position: ${z(a.positionM)}),`).join(`
`),s=r.map((a,l)=>Di(l,o,a,$i(l,i))).join(`
`);return`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: ${kt(e.buildingName)},
        stops: [
${c}
        ],
    ),
    elevators: [
${s}
    ],
    simulation: SimulationParams(ticks_per_second: ${z(ze)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${z(e.passengerWeightRange[0])}, ${z(e.passengerWeightRange[1])}),
    ),
)`}const ze=60;function Gn(e,t,n){return Math.min(n,Math.max(t,e))}function $i(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function Di(e,t,n,i){const o=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${z(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${z(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${kt(i)},
            max_speed: ${z(t.maxSpeed)}, acceleration: ${z(t.acceleration)}, deceleration: ${z(t.deceleration)},
            weight_capacity: ${z(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${o}${r}
        ),`}function kt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function z(e){return Number.isInteger(e)?`${e}.0`:String(e)}const Un={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function $e(e){return Array.from({length:e},()=>1)}const ae=5,Oi=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:ae},(e,t)=>t===ae-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:$e(ae),destWeights:$e(ae)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:$e(ae),destWeights:$e(ae)}],Wi={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:Oi,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...Un,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},Ve=19,_t=16,Te=4,jn=(1+Ve)*Te,Se=1,we=41,ve=42,qi=43;function j(e){return Array.from({length:qi},(t,n)=>e(n))}const ce=e=>e===Se||e===we||e===ve,Hi=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:j(e=>e===0?20:e===Se?2:e===we?1.2:e===ve?.2:.1),destWeights:j(e=>e===0?0:e===Se?.3:e===we?.4:e===ve?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:j(e=>ce(e)?.5:1),destWeights:j(e=>ce(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:j(e=>e===21?4:ce(e)?.25:1),destWeights:j(e=>e===21?5:ce(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:j(e=>e===0||e===Se||e===21?.3:e===we?.4:e===ve?1.2:1),destWeights:j(e=>e===0?20:e===Se?1:e===we?.6:e===ve?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:j(e=>ce(e)?1.5:.2),destWeights:j(e=>ce(e)?1.5:.2)}];function Ni(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let s=1;s<=Ve;s++){const a=1+s,l=s*Te;e.push(`        StopConfig(id: StopId(${a.toString().padStart(2," ")}), name: "Floor ${s}",    position: ${l.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${jn.toFixed(1)}),`);for(let s=21;s<=20+_t;s++){const a=1+s,l=s*Te;e.push(`        StopConfig(id: StopId(${a}), name: "Floor ${s}",   position: ${l.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:Ve},(s,a)=>2+a),21],n=[21,...Array.from({length:_t},(s,a)=>22+a)],i=[1,21,38,39,40],o=[1,0,41,42],r=s=>s.map(a=>`StopId(${a})`).join(", "),c=(s,a,l,f)=>`                ElevatorConfig(
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
)`}const Gi=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:Ve},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*Te})),{name:"Sky Lobby",positionM:jn},...Array.from({length:_t},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*Te})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],Ui={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:Hi,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:Gi,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...Un,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:Ni()},Qt=1e5,Jt=4e5,Zt=35786e3,ji=1e8,zi=4;function De(e){return Array.from({length:zi},(t,n)=>e(n))}const Vi={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:De(e=>e===0?6:1),destWeights:De(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:De(e=>e===0?0:e===1?1:e===2?3:5),destWeights:De(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:Qt},{name:"LEO Transfer",positionM:Jt},{name:"GEO Platform",positionM:Zt}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:ji,showDayNight:!1},ron:`SimConfig(
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
)`},Re=[Ui,Vi,Wi];function H(e){const t=Re.find(i=>i.id===e);if(t)return t;const n=Re[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const zn={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},O={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},Xi=["scan","look","nearest","etd","destination","rsr"],Yi=["adaptive","predictive","lobby","spread","none"];function en(e,t){return e!==null&&Xi.includes(e)?e:t}function tn(e,t){return e!==null&&Yi.includes(e)?e:t}const Ct=new Set;function Ki(e){return Ct.add(e),()=>Ct.delete(e)}function q(e){const t=Vn(e);if(window.location.search!==t){window.history.replaceState(null,"",t);for(const n of Ct)n(e)}}function Qi(e,t){return e==="compare"||e==="quest"?e:t}function Vn(e){const t=new URLSearchParams;e.mode!==O.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==O.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=H(e.scenario).defaultReposition,i=n??O.repositionA,o=n??O.repositionB;e.repositionA!==i&&t.set("pa",e.repositionA),e.repositionB!==o&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of fe){const c=e.overrides[r];c!==void 0&&Number.isFinite(c)&&t.set(zn[r],Zi(c))}return`?${t.toString()}`}function Ji(e){const t=new URLSearchParams(e),n={};for(const i of fe){const o=t.get(zn[i]);if(o===null)continue;const r=Number(o);Number.isFinite(r)&&(n[i]=r)}return{mode:Qi(t.get("m"),O.mode),questStage:(t.get("qs")??"").trim()||O.questStage,scenario:t.get("s")??O.scenario,strategyA:en(t.get("a")??t.get("d"),O.strategyA),strategyB:en(t.get("b"),O.strategyB),repositionA:tn(t.get("pa"),O.repositionA),repositionB:tn(t.get("pb"),O.repositionB),compare:t.has("c")?t.get("c")==="1":O.compare,seed:(t.get("k")??"").trim()||O.seed,intensity:nn(t.get("i"),O.intensity),speed:nn(t.get("x"),O.speed),overrides:n}}function nn(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function Zi(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function Xn(e){let t=2166136261;const n=e.trim();for(let i=0;i<n.length;i++)t^=n.charCodeAt(i),t=Math.imul(t,16777619);return t>>>0}const eo=["scan","look","nearest","etd","destination","rsr"],ue={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},Yn={scan:"Sweeps end-to-end like a disk head — simple, predictable, ignores who's waiting longest.",look:"Like SCAN but reverses early when nothing's queued further — a practical baseline.",nearest:"Grabs whichever call is closest right now. Fast under light load, thrashes under rush.",etd:"Estimated time of dispatch — assigns calls to whichever car can finish fastest.",destination:"Destination-control: riders pick their floor at the lobby; the group optimises assignments.",rsr:"Relative System Response — a wait-aware variant of ETD that penalises long queues."},to=["adaptive","predictive","lobby","spread","none"],Ee={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},Kn={adaptive:"Switches based on traffic — returns to lobby during up-peak, predicts hot floors otherwise. The default.",predictive:"Always parks idle cars near whichever floor has seen the most recent arrivals.",lobby:"Sends every idle car back to the ground floor to prime the morning-rush pickup.",spread:"Keeps idle cars fanned out across the shaft so any floor has a nearby option.",none:"Leaves idle cars wherever they finished their last delivery."},no="scenario-card inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated border border-stroke-subtle rounded-md text-content-secondary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:bg-surface-hover hover:border-stroke aria-pressed:bg-accent-muted aria-pressed:text-content aria-pressed:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] max-md:flex-none max-md:snap-start",io="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function oo(e){const t=document.createDocumentFragment();Re.forEach((n,i)=>{const o=pe("button",no);o.type="button",o.dataset.scenarioId=n.id,o.setAttribute("aria-pressed","false"),o.title=n.description,o.append(pe("span","",n.label),pe("span",io,String(i+1))),t.appendChild(o)}),e.scenarioCards.replaceChildren(t)}function Qn(e,t){for(const n of e.scenarioCards.children){const i=n;i.setAttribute("aria-pressed",i.dataset.scenarioId===t?"true":"false")}}async function Jn(e,t,n,i,o){const r=H(n),c=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,s=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:c,repositionA:s,overrides:{}},q(e.permalink),o.renderPaneStrategyInfo(t.paneA,c),o.renderPaneRepositionInfo(t.paneA,s),o.refreshStrategyPopovers(),Qn(t,r.id),await i(),o.renderTweakPanel(),G(t.toast,`${r.label} · ${ue[c]}`)}function ro(e){const t=H(e.scenario);e.scenario=t.id}const so=["layout","scenario-picker","controls-bar","cabin-legend"],ao=["quest-pane"];function co(e){const t=e==="quest";for(const n of so){const i=document.getElementById(n);i&&i.classList.toggle("hidden",t)}for(const n of ao){const i=document.getElementById(n);i&&(i.classList.toggle("hidden",!t),i.classList.toggle("flex",t))}}function lo(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const i of n){const o=i.dataset.mode===e;i.dataset.active=String(o),i.setAttribute("aria-pressed",String(o))}t.addEventListener("click",i=>{const o=i.target;if(!(o instanceof HTMLElement))return;const r=o.closest("button[data-mode]");if(!r)return;const c=r.dataset.mode;if(c!=="compare"&&c!=="quest"||c===e)return;const s=new URL(window.location.href);c==="compare"?(s.searchParams.delete("m"),s.searchParams.delete("qs")):s.searchParams.set("m",c),window.location.assign(s.toString())})}const po="modulepreload",uo=function(e,t){return new URL(e,t).href},on={},Xe=function(t,n,i){let o=Promise.resolve();if(n&&n.length>0){let c=function(f){return Promise.all(f.map(u=>Promise.resolve(u).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const s=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),l=a?.nonce||a?.getAttribute("nonce");o=c(n.map(f=>{if(f=uo(f,i),f in on)return;on[f]=!0;const u=f.endsWith(".css"),d=u?'[rel="stylesheet"]':"";if(!!i)for(let g=s.length-1;g>=0;g--){const S=s[g];if(S.href===f&&(!u||S.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=u?"stylesheet":po,u||(h.as="script"),h.crossOrigin="",h.href=f,l&&h.setAttribute("nonce",l),document.head.appendChild(h),u)return new Promise((g,S)=>{h.addEventListener("load",g),h.addEventListener("error",()=>S(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(c){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=c,window.dispatchEvent(s),!s.defaultPrevented)throw c}return o.then(c=>{for(const s of c||[])s.status==="rejected"&&r(s.reason);return t().catch(r)})};class Zn extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function fo(e){const t=(await Xe(async()=>{const{default:o}=await import("./worker-DE_xV-Fq.js");return{default:o}},[],import.meta.url)).default,n=new t,i=new ho(n);return await i.init(e),i}class ho{#e;#t=new Map;#n=1;#o=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#c),this.#e.addEventListener("error",this.#i),this.#e.addEventListener("messageerror",this.#i)}async init(t){await this.#a({kind:"init",id:this.#s(),payload:this.#d(t)})}async tick(t,n){const i=n?.wantVisuals??!1;return this.#a({kind:"tick",id:this.#s(),ticks:t,...i?{wantVisuals:!0}:{}})}async spawnRider(t,n,i,o){return this.#a({kind:"spawn-rider",id:this.#s(),origin:t,destination:n,weight:i,...o!==void 0?{patienceTicks:o}:{}})}async setStrategy(t){await this.#a({kind:"set-strategy",id:this.#s(),strategy:t})}async loadController(t,n){const i=n?.unlockedApi??null,o=n?.timeoutMs,r=this.#a({kind:"load-controller",id:this.#s(),source:t,unlockedApi:i});if(o===void 0){await r;return}r.catch(()=>{});let c;const s=new Promise((a,l)=>{c=setTimeout(()=>{l(new Error(`controller did not return within ${o}ms`))},o)});try{await Promise.race([r,s])}finally{c!==void 0&&clearTimeout(c)}}async reset(t){await this.#a({kind:"reset",id:this.#s(),payload:this.#d(t)})}dispose(){this.#o||(this.#o=!0,this.#e.removeEventListener("message",this.#c),this.#e.removeEventListener("error",this.#i),this.#e.removeEventListener("messageerror",this.#i),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#s(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,i=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:i,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#a(t){if(this.#o)throw new Error("WorkerSim disposed");return new Promise((n,i)=>{this.#t.set(t.id,{resolve:n,reject:i}),this.#e.postMessage(t)})}#i=t=>{const n=t.message,i=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#o=!0,this.#e.terminate(),this.#r(new Error(i))};#c=t=>{const n=t.data,i=this.#t.get(n.id);if(i)switch(this.#t.delete(n.id),n.kind){case"ok":i.resolve(void 0);return;case"tick-result":i.resolve(n.result);return;case"spawn-result":n.error!==null?i.reject(new Error(n.error)):i.resolve(n.riderId);return;case"error":{const o=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;i.reject(o!==null?new Zn(n.message,o):new Error(n.message));return}default:{const o=n.kind;i.reject(new Error(`WorkerSim: unknown reply kind "${String(o)}"`));return}}}}const go=`// Quest curriculum — sim global declaration.
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
`,rn="quest-runtime";let at=null,le=null;async function mo(){return at||le||(le=(async()=>{await bo();const e=await Xe(()=>import("./editor.main-C5YmnvCP.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return at=e,e})(),le.catch(()=>{le=null}),le)}async function bo(){const[{default:e},{default:t}]=await Promise.all([Xe(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),Xe(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,i){return i==="typescript"||i==="javascript"?new e:new t}}}function yo(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(go,"ts:filename/quest-sim-globals.d.ts"))}function So(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function wo(e){const t=await mo();yo(t),So(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:i=>{n.setValue(i)},onDidChange(i){const o=n.onDidChangeModelContent(()=>{i()});return{dispose:()=>{o.dispose()}}},insertAtCursor(i){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:i,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(i){const o=n.getModel();if(!o)return;const r=i.message.split(`
`)[0]??i.message;t.editor.setModelMarkers(o,rn,[{severity:8,message:r,startLineNumber:i.line,startColumn:i.column,endLineNumber:i.line,endColumn:i.column+1}]),n.revealLineInCenterIfOutsideViewport(i.line)},clearRuntimeMarker(){const i=n.getModel();i&&t.editor.setModelMarkers(i,rn,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const vo=`SimConfig(
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
)`,ko={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:vo,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},_o=`SimConfig(
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
)`,Co={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:_o,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},To=`SimConfig(
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
)`,Ro={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:To,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},Eo=`SimConfig(
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
)`,Io={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:Eo,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function $(e,t){const n=t.startTick??0,i=t.intervalTicks??30,o=t.destinations;if(o.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,c)=>{const s=o[c%o.length];return{origin:t.origin,destination:s,atTick:n+c*i,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const xo=`SimConfig(
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
)`,Ao={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:xo,unlockedApi:["setStrategy"],seedRiders:[...$(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},Mo=`SimConfig(
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
)`,Po=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,Lo={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:Mo,unlockedApi:["setStrategyJs"],seedRiders:[...$(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...$(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:Po,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},Fo=`SimConfig(
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
)`,Bo={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:Fo,unlockedApi:["setStrategyJs"],seedRiders:[...$(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...$(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},$o=`SimConfig(
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
)`,Do=`// Stage 8 — Event-Driven
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
`,Oo={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:$o,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...$(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...$(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:Do,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},Wo=`SimConfig(
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
)`,qo=`// Stage 9 — Take the Wheel
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
`,Ho={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:Wo,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...$(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:qo,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},No=`SimConfig(
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
)`,Go=`// Stage 10 — Patient Boarding
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
`,Uo={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:No,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...$(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:Go,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},jo=`SimConfig(
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
)`,zo=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,Vo={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:jo,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...$(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...$(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:zo,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},Xo=`SimConfig(
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
)`,Yo=`// Stage 12 — Routes
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
`,Ko={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:Xo,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...$(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...$(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:Yo,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},Qo=`SimConfig(
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
)`,Jo=`// Stage 13 — Transfer Points
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
`,Zo={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:Qo,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...$(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...$(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...$(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:Jo,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},er=`SimConfig(
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
)`,tr=`// Stage 14 — Build a Floor
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
`,nr={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:er,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...$(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:tr,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},ir=`SimConfig(
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
)`,or=`// Stage 15 — Sky Lobby
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
`,rr={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:ir,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...$(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...$(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:or,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},te=[ko,Co,Ro,Io,Ao,Lo,Bo,Oo,Ho,Uo,Vo,Ko,Zo,nr,rr];function sr(e){return te.find(t=>t.id===e)}function ar(e){const t=te.findIndex(n=>n.id===e);if(!(t<0))return te[t+1]}function M(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function Ze(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const Ye="quest:code:v1:",ei="quest:bestStars:v1:",ti=5e4;function Ie(){try{return globalThis.localStorage??null}catch{return null}}function sn(e){const t=Ie();if(!t)return null;try{const n=t.getItem(Ye+e);if(n===null)return null;if(n.length>ti){try{t.removeItem(Ye+e)}catch{}return null}return n}catch{return null}}function an(e,t){if(t.length>ti)return;const n=Ie();if(n)try{n.setItem(Ye+e,t)}catch{}}function cr(e){const t=Ie();if(t)try{t.removeItem(Ye+e)}catch{}}function xe(e){const t=Ie();if(!t)return 0;let n;try{n=t.getItem(ei+e)}catch{return 0}if(n===null)return 0;const i=Number.parseInt(n,10);return!Number.isInteger(i)||i<0||i>3?0:i}function lr(e,t){const n=xe(e);if(t<=n)return;const i=Ie();if(i)try{i.setItem(ei+e,String(t))}catch{}}const dr={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},pr=["basics","strategies","events-manual","topology"],ni=3;function ur(){return{root:M("quest-grid","quest-grid"),progress:M("quest-grid-progress","quest-grid"),sections:M("quest-grid-sections","quest-grid")}}function ct(e,t){Ze(e.sections);let n=0;const i=te.length*ni;for(const o of pr){const r=te.filter(l=>l.section===o);if(r.length===0)continue;const c=document.createElement("section");c.dataset.section=o;const s=document.createElement("h2");s.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",s.textContent=dr[o],c.appendChild(s);const a=document.createElement("div");a.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const l of r){const f=xe(l.id);n+=f,a.appendChild(fr(l,f,t))}c.appendChild(a),e.sections.appendChild(c)}e.progress.textContent=`${n} / ${i}`}function fr(e,t,n){const i=te.findIndex(u=>u.id===e.id),o=String(i+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const c=document.createElement("div");c.className="flex items-baseline justify-between gap-2";const s=document.createElement("span");s.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",s.textContent=o,c.appendChild(s);const a=document.createElement("span");a.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",a.classList.add(t>0?"text-accent":"text-content-disabled"),a.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),a.textContent="★".repeat(t)+"☆".repeat(ni-t),c.appendChild(a),r.appendChild(c);const l=document.createElement("div");l.className="text-content text-[13px] font-semibold tracking-[-0.01em]",l.textContent=e.title,r.appendChild(l);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const hr=75;async function cn(e,t,n,i){let o=n;for(;o<t.length;){const r=t[o];if(r===void 0||(r.atTick??0)>i)break;await e.spawnRider(r.origin,r.destination,r.weight??hr,r.patienceTicks),o+=1}return o}async function gr(e,t,n={}){const i=n.maxTicks??1500,o=n.batchTicks??60,r=await fo({configRon:e.configRon,strategy:"scan"});try{const c=[...e.seedRiders].sort((d,p)=>(d.atTick??0)-(p.atTick??0));let s=await cn(r,c,0,0);const a={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(a.timeoutMs=n.timeoutMs),await r.loadController(t,a);let l=null,f=0;const u=n.onSnapshot!==void 0;for(;f<i;){const d=i-f,p=Math.min(o,d),h=await r.tick(p,u?{wantVisuals:!0}:void 0);l=h.metrics,f=h.tick,s=await cn(r,c,s,f);const g=ln(l,f);if(n.onProgress)try{n.onProgress(g)}catch{}if(n.onSnapshot&&h.snapshot)try{n.onSnapshot(h.snapshot)}catch{}if(e.passFn(g))return dn(e,g,!0)}if(l===null)throw new Error("runStage: maxTicks must be positive");return dn(e,ln(l,f),!1)}finally{r.dispose()}}function ln(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function dn(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let i=1;return e.starFns[0]?.(t)&&(i=2,e.starFns[1]?.(t)&&(i=3)),{passed:!0,stars:i,grade:t}}function mr(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const i=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(i)&&i>0&&n.push(`${i.toFixed(1)}s avg wait`),n.join(" · ")}const ii=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(ii.map(e=>[e.name,e]));function oi(e){const t=new Set(e);return ii.filter(n=>t.has(n.name))}function br(){return{root:M("quest-api-panel","api-panel")}}function pn(e,t){Ze(e.root);const n=oi(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const i=document.createElement("p");i.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",i.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(i);const o=document.createElement("ul");o.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const c=document.createElement("li");c.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const s=document.createElement("code");s.className="block font-mono text-[12px] text-content",s.textContent=r.signature,c.appendChild(s);const a=document.createElement("p");a.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",a.textContent=r.description,c.appendChild(a),o.appendChild(c)}e.root.appendChild(o)}function yr(){return{root:M("quest-hints","hints-drawer"),count:M("quest-hints-count","hints-drawer"),list:M("quest-hints-list","hints-drawer")}}const un="quest-hints-more";function fn(e,t){Ze(e.list);for(const i of e.root.querySelectorAll(`.${un}`))i.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((i,o)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=i,o>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const i=document.createElement("button");i.type="button",i.className=`${un} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,i.textContent=`Show ${n-1} more`,i.addEventListener("click",()=>{for(const o of e.list.querySelectorAll("li[hidden]"))o.hidden=!1;i.remove()}),e.root.appendChild(i)}e.root.removeAttribute("open")}function Sr(e,t){return{activeStage:e,currentView:t,runLoop:{active:!1}}}function wr(e,t){e.activeStage=t}function lt(e,t){e.currentView=t}function hn(e){e.runLoop.active=!1}function me(e,t){return e.currentView==="stage"&&e.activeStage.id===t.id}function vr(){return{root:M("quest-reference","reference-panel"),status:M("quest-reference-status","reference-panel"),code:M("quest-reference-code","reference-panel")}}function dt(e,t,n={}){const i=t.referenceSolution,o=xe(t.id);if(!i||o===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=o===3?"(mastered)":"(unlocked)",e.code.textContent=i,n.collapse!==!1&&e.root.removeAttribute("open")}function kr(){const e="results-modal";return{root:M("quest-results-modal",e),title:M("quest-results-title",e),stars:M("quest-results-stars",e),detail:M("quest-results-detail",e),close:M("quest-results-close",e),retry:M("quest-results-retry",e),next:M("quest-results-next",e)}}function _r(e,t,n,i,o){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=Cr(t.grade,t.passed,i),e.retry.onclick=()=>{pt(e),n()},e.close.onclick=()=>{pt(e)};const r=o;r?(e.next.hidden=!1,e.next.onclick=()=>{pt(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function pt(e){e.root.classList.remove("show")}function Cr(e,t,n){const i=`tick ${e.endTick}`,o=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${o} · finished by ${i}.`;if(n)try{const r=n(e);if(r)return`${o}. ${r}`}catch{}return`${o}. The pass condition wasn't met within the run budget.`}const Tr={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function gn(e){return Tr[e]??`sim.${e}();`}function Rr(){return{root:M("quest-snippets","snippet-picker")}}function mn(e,t,n){Ze(e.root);const i=oi(t.unlockedApi);if(i.length!==0)for(const o of i){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=o.name,r.title=`Insert: ${gn(o.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(gn(o.name))}),e.root.appendChild(r)}}function Ke(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const i=parseInt(n[1],16),o=i>>16&255,r=i>>8&255,c=i&255,s=a=>t>=0?Math.round(a+(255-a)*t):Math.round(a*(1+t));return`rgb(${s(o)}, ${s(r)}, ${s(c)})`}function Ft(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const i=parseInt(n[1],16),o=i>>16&255,r=i>>8&255,c=i&255;return`rgba(${o}, ${r}, ${c}, ${t})`}function ri(e,t){if(/^#[0-9a-f]{6}$/i.test(e)){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Ft(e,t)}function Er(e,t,n,i,o){const r=(e+n)/2,c=(t+i)/2,s=n-e,a=i-t,l=Math.max(Math.hypot(s,a),1),f=-a/l,u=s/l,d=Math.min(l*.25,22),p=r+f*d,h=c+u*d,g=1-o;return[g*g*e+2*g*o*p+o*o*n,g*g*t+2*g*o*h+o*o*i]}function Ir(e){let r=e;for(let s=0;s<3;s++){const a=1-r,l=3*a*a*r*.2+3*a*r*r*.2+r*r*r,f=3*a*a*.2+6*a*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(l-e)/f,r=Math.max(0,Math.min(1,r))}const c=1-r;return 3*c*c*r*.6+3*c*r*r*1+r*r*r}const Bt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},xr="#2a2a35",Ar="#a1a1aa",Mr=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],Pr=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],Lr="rgba(8, 10, 14, 0.55)",Fr="#3a3a45",Br=[1,1,.5,.42],$r=["LOW","HIGH","VIP","SERVICE"],Dr="#e6c56b",Or="#9bd4c4",Wr=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],qr="#a1a1aa",Hr="#4a4a55",Nr="#f59e0b",si="#7dd3fc",ai="#fda4af",ut="#fafafa",ci="#8b8c92",li="rgba(250, 250, 250, 0.95)",Gr=260,bn=3,Ur=.05,yn=["standard","briefcase","bag","short","tall"];function de(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,yn[n%yn.length]??"standard"}function jr(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function di(e,t,n,i,o,r="standard"){const c=jr(r,i),a=n-.5,l=a-c.bodyH,f=l-c.neckGap-c.headR,u=c.bodyH*.08,d=a-c.headR*.8;if(e.fillStyle=o,e.beginPath(),e.moveTo(t-c.shoulderW/2,l+u),e.lineTo(t-c.shoulderW/2+u,l),e.lineTo(t+c.shoulderW/2-u,l),e.lineTo(t+c.shoulderW/2,l+u),e.lineTo(t+c.waistW/2,d),e.lineTo(t+c.footW/2,a),e.lineTo(t-c.footW/2,a),e.lineTo(t-c.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,c.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const p=Math.max(1.6,c.headR*.9),h=t+c.waistW/2+p*.1,g=a-p-.5;e.fillRect(h,g,p,p);const S=p*.55;e.fillRect(h+(p-S)/2,g-1,S,1)}else if(r==="bag"){const p=Math.max(1.3,c.headR*.9),h=t-c.shoulderW/2-p*.35,g=l+c.bodyH*.35;e.beginPath(),e.arc(h,g,p,0,Math.PI*2),e.fill(),e.strokeStyle=o,e.lineWidth=.8,e.beginPath(),e.moveTo(h+p*.2,g-p*.8),e.lineTo(t+c.shoulderW/2-u,l+.5),e.stroke()}else if(r==="tall"){const p=c.headR*2.1,h=Math.max(1,c.headR*.45);e.fillRect(t-p/2,f-c.headR-h+.4,p,h)}}function zr(e,t,n,i,o,r,c,s,a){const f=Math.max(1,Math.floor((o-14)/s.figureStride)),u=Math.min(r,f),d=-2;for(let p=0;p<u;p++){const h=t+d+i*p*s.figureStride,g=p+0,S=de(a,g);di(e,h,n,s.figureHeadR,c,S)}if(r>u){e.fillStyle=ci,e.font=`${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const p=t+d+i*u*s.figureStride;e.fillText(`+${r-u}`,p,n-1)}}function Y(e,t,n,i,o,r){const c=Math.min(r,i/2,o/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,i,o,c);return}e.moveTo(t+c,n),e.lineTo(t+i-c,n),e.quadraticCurveTo(t+i,n,t+i,n+c),e.lineTo(t+i,n+o-c),e.quadraticCurveTo(t+i,n+o,t+i-c,n+o),e.lineTo(t+c,n+o),e.quadraticCurveTo(t,n+o,t,n+o-c),e.lineTo(t,n+c),e.quadraticCurveTo(t,n,t+c,n),e.closePath()}function Vr(e,t,n){if(e.measureText(t).width<=n)return t;const i="…";let o=0,r=t.length;for(;o<r;){const c=o+r+1>>1;e.measureText(t.slice(0,c)+i).width<=n?o=c:r=c-1}return o===0?i:t.slice(0,o)+i}function Xr(e,t){for(const n of t){const i=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-i,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const i=n.width/2;e.strokeStyle=n.frame;const o=n.cx-i+.5,r=n.cx+i-.5;e.beginPath(),e.moveTo(o,n.top),e.lineTo(o,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function Yr(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textBaseline="alphabetic",e.textAlign="center";const i=n.padTop-n.fontSmall*.5-2,o=i-n.fontSmall*.5-1,r=i+n.fontSmall*.5+1,c=Math.max(n.fontSmall+.5,o);for(const s of t){const a=s.top-3,l=a>o&&a-n.fontSmall<r;e.fillStyle=s.color,e.fillText(s.text,s.cx,l?c:a)}}function Kr(e,t,n,i,o,r,c,s,a){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";const l=i.padX,f=i.padX+i.labelW,u=r-i.padX,d=i.shaftInnerW/2,p=Math.min(i.shaftInnerW*1.8,(u-f)/2),h=[...t.stops].sort((g,S)=>g.y-S.y);for(let g=0;g<h.length;g++){const S=h[g];if(S===void 0)continue;const k=n(S.y),T=h[g+1],R=T!==void 0?n(T.y):s;if(e.strokeStyle=xr,e.lineWidth=a?2:1,e.beginPath(),a)for(const m of o)e.moveTo(m-p,k+.5),e.lineTo(m+p,k+.5);else{let m=f;for(const v of o){const b=v-d,_=v+d;b>m&&(e.moveTo(m,k+.5),e.lineTo(b,k+.5)),m=_}m<u&&(e.moveTo(m,k+.5),e.lineTo(u,k+.5))}e.stroke();for(let m=0;m<o.length;m++){const v=o[m];if(v===void 0)continue;const b=c.has(`${m}:${S.entity_id}`);e.strokeStyle=b?Nr:Hr,e.lineWidth=b?1.4:1,e.beginPath(),e.moveTo(v-d-2,k+.5),e.lineTo(v-d,k+.5),e.moveTo(v+d,k+.5),e.lineTo(v+d+2,k+.5),e.stroke()}const y=a?k:(k+R)/2;e.fillStyle=Ar,e.textAlign="right",e.fillText(Vr(e,S.name,i.labelW-4),l+i.labelW-4,y)}}function Qr(e,t,n,i,o,r){for(const c of t.stops){if(c.waiting_by_line.length===0)continue;const s=r.get(c.entity_id);if(s===void 0||s.size===0)continue;const a=n(c.y),l=c.waiting_up>=c.waiting_down?si:ai;for(const f of c.waiting_by_line){if(f.count===0)continue;const u=s.get(f.line);if(u===void 0)continue;const d=o.get(u);if(d===void 0)continue;const p=d.end-d.start;p<=i.figureStride||zr(e,d.end-2,a,-1,p,f.count,l,i,c.entity_id)}}}function Jr(e,t,n,i,o,r,c,s,a,l=!1){const f=i*.22,u=(o-4)/10.5,d=Math.max(1.2,Math.min(s.figureHeadR,f,u)),p=s.figureStride*(d/s.figureHeadR),h=3,g=2,S=i-h*2,T=Math.max(1,Math.floor((S-16)/p)),R=Math.min(r,T),y=R*p,m=t-y/2+p/2,v=n-g;for(let b=0;b<R;b++){const _=a?.[b]??de(0,b);di(e,m+b*p,v,d,c,_)}if(r>R){const b=`+${r-R}`,_=Math.max(8,s.fontSmall-1);e.font=`700 ${_.toFixed(1)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="middle";const I=e.measureText(b).width,x=3,w=1.5,E=Math.ceil(I+x*2),A=Math.ceil(_+w*2),P=t+i/2-2,W=n-o+2,F=P-E;e.fillStyle="rgba(15, 15, 18, 0.85)",Y(e,F,W,E,A,2),e.fill(),e.fillStyle="#fafafa",e.fillText(b,P-x,W+A/2)}if(l){const b=Math.max(10,Math.min(o*.7,i*.55));e.font=`800 ${b.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="center",e.textBaseline="middle";const _=n-o/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,_+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,_)}}function Zr(e,t,n,i,o,r,c){const s=Math.max(2,r.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const l=c.get(a.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const u=n.get(a.id);if(u===void 0)continue;const d=o(f.y)-r.carH/2,p=o(a.y)-r.carH/2;Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(u,p),e.lineTo(u,d),e.stroke(),e.fillStyle=li,e.beginPath(),e.arc(u,d,s,0,Math.PI*2),e.fill())}}function es(e,t,n,i,o,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const c=Bt[t.phase]??"#6b6b75",s=i/2;for(let a=1;a<=bn;a++){const l=r(t.y-t.v*Ur*a),f=.18*(1-(a-1)/bn);e.fillStyle=Ft(c,f),e.fillRect(n-s,l-o,i,o)}}function ts(e,t,n,i,o,r,c,s,a){const l=c(t.y),f=l-o,u=i/2,d=Bt[t.phase]??"#6b6b75",p=e.createLinearGradient(n,f,n,l);p.addColorStop(0,Ke(d,.14)),p.addColorStop(1,Ke(d,-.18)),e.fillStyle=p,e.fillRect(n-u,f,i,o),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-u+.5,f+.5,i-1,o-1);const h=t.capacity>0&&t.load>=t.capacity*.95;(t.riders>0||h)&&Jr(e,n,l,i,o,t.riders,r,s,a,h)}function ns(e,t,n,i,o,r,c,s){const h=`600 ${r.fontSmall+.5}px system-ui, -apple-system, "Segoe UI", sans-serif`;e.font=h,e.textBaseline="middle";const g=.3,S=performance.now(),k=t,T=[];for(const y of n.cars){const m=c.get(y.id);if(!m)continue;const v=i.get(y.id);if(v===void 0)continue;const b=o(y.y),_=b-r.carH,I=Math.max(1,m.expiresAt-m.bornAt),x=m.expiresAt-S,w=x>I*g?1:Math.max(0,x/(I*g));if(w<=0)continue;const A=e.measureText(m.text).width+14,P=r.fontSmall+8+2,W=_-2-4-P,F=b+2+4+P>s,V=W<2&&!F?"below":"above",Ae=V==="above"?_-2-4-P:b+2+4;let N=v-A/2;const Me=2,Pe=s-A-2;N<Me&&(N=Me),N>Pe&&(N=Pe),T.push({bubble:m,alpha:w,cx:v,carTop:_,carBottom:b,bubbleW:A,bubbleH:P,side:V,bx:N,by:Ae})}const R=(y,m)=>!(y.bx+y.bubbleW<=m.bx||m.bx+m.bubbleW<=y.bx||y.by+y.bubbleH<=m.by||m.by+m.bubbleH<=y.by);for(let y=1;y<T.length;y++){const m=T[y];if(m===void 0)continue;let v=!1;for(let w=0;w<y;w++){const E=T[w];if(E!==void 0&&R(m,E)){v=!0;break}}if(!v)continue;const b=m.side==="above"?"below":"above",_=b==="above"?m.carTop-2-4-m.bubbleH:m.carBottom+2+4,I={...m,side:b,by:_};let x=!0;for(let w=0;w<y;w++){const E=T[w];if(E!==void 0&&R(I,E)){x=!1;break}}x&&(T[y]=I)}for(const y of T){const{bubble:m,alpha:v,cx:b,carTop:_,carBottom:I,bubbleW:x,bubbleH:w,side:E,bx:A,by:P}=y,W=E==="above"?_-2:I+2,F=E==="above"?P+w:P,V=Math.min(Math.max(b,A+6+5/2),A+x-6-5/2);e.save(),e.globalAlpha=v,e.shadowColor=k,e.shadowBlur=8,e.fillStyle="rgba(16, 19, 26, 0.94)",Y(e,A,P,x,w,6),e.fill(),e.shadowBlur=0,e.strokeStyle=ri(k,.65),e.lineWidth=1,Y(e,A,P,x,w,6),e.stroke(),e.beginPath(),e.moveTo(V-5/2,F),e.lineTo(V+5/2,F),e.lineTo(V,W),e.closePath(),e.fillStyle="rgba(16, 19, 26, 0.94)",e.fill(),e.stroke(),e.fillStyle="#f0f3fb",e.textAlign="center",e.fillText(m.text,A+x/2,P+w/2),e.restore()}}function is(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function os(e){const t=[];for(let n=3;n<=8;n++){const i=10**n;if(i>e)break;t.push({altitudeM:i,label:et(i)})}return t}function et(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function pi(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function rs(e,t,n){const i=Math.abs(e);if(i<.5)return"idle";const o=i-Math.abs(t);return i>=n*.95&&Math.abs(o)<n*.005?"cruise":o>0?"accel":o<0?"decel":"cruise"}function ss(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const i=Math.floor(e/60),o=Math.round(e%60);return o===0?`${i}m`:`${i}m ${o}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function as(e,t,n,i,o,r){const c=Math.abs(t-e);if(c<.001)return 0;const s=Math.abs(n);if(s*s/(2*r)>=c)return s>0?s/r:0;const l=Math.max(0,(i-s)/o),f=s*l+.5*o*l*l,u=i/r,d=i*i/(2*r);if(f+d>=c){const h=(2*o*r*c+r*s*s)/(o+r),g=Math.sqrt(Math.max(h,s*s));return(g-s)/o+g/r}const p=c-f-d;return l+p/Math.max(i,.001)+u}const ui={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},Qe={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function cs(e,t,n,i,o,r){const c=o/2,s=i-r/2,a=Bt[t.phase]??"#6b6b75",l=e.createLinearGradient(n,s,n,s+r);l.addColorStop(0,Ke(a,.14)),l.addColorStop(1,Ke(a,-.18)),e.fillStyle=l,Y(e,n-c,s,o,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-c+2,s+r*.36,o-4,Math.max(1.5,r*.1))}function ls(e,t,n,i,o){if(t.length===0)return;const r=7,c=4,s=o.fontSmall+2,a=n/2+8;e.font=`600 ${(o.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;const l=(d,p)=>{const h=[d.carName,et(d.altitudeM),pi(d.velocity),`${ui[d.phase]} · ${d.layer}`];let g=0;for(const y of h)g=Math.max(g,e.measureText(y).width);const S=g+r*2,k=h.length*s+c*2;let T=p==="right"?d.cx+a:d.cx-a-S;T=Math.max(2,Math.min(i-S-2,T));const R=d.cy-k/2;return{hud:d,lines:h,bx:T,by:R,bubbleW:S,bubbleH:k,side:p}},f=(d,p)=>!(d.bx+d.bubbleW<=p.bx||p.bx+p.bubbleW<=d.bx||d.by+d.bubbleH<=p.by||p.by+p.bubbleH<=d.by),u=[];t.forEach((d,p)=>{let h=l(d,p%2===0?"right":"left");if(u.some(g=>f(h,g))){const g=l(d,h.side==="right"?"left":"right");if(u.every(S=>!f(g,S)))h=g;else{const S=Math.max(...u.map(k=>k.by+k.bubbleH));h={...h,by:S+4}}}u.push(h)});for(const d of u){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",Y(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=Qe[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,Y(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let p=0;p<d.lines.length;p++){const h=d.by+c+s*p+s/2,g=d.lines[p]??"";e.fillStyle=p===0||p===3?Qe[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(g,d.bx+r,h)}e.restore()}}function ds(e,t,n,i,o,r){if(t.length===0)return;const c=18,s=10,a=6,l=5,f=r.fontSmall+2.5,d=a*2+5*f,p=c+a+(d+l)*t.length;e.save();const h=e.createLinearGradient(n,o,n,o+p);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,Y(e,n,o,i,p,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,Y(e,n,o,i,p,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,o+1),e.lineTo(n+i-8,o+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+s,o+c/2+2);let g=o+c+a;for(const S of t){e.fillStyle="rgba(15, 15, 18, 0.55)",Y(e,n+6,g,i-12,d,5),e.fill(),e.fillStyle=Qe[S.phase],e.fillRect(n+6,g,2,d);const k=n+s+4,T=n+i-s;let R=g+a+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(S.carName,k,R),e.textAlign="right",e.fillStyle=Qe[S.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(ui[S.phase].toUpperCase(),T,R);const y=S.etaSeconds!==void 0&&Number.isFinite(S.etaSeconds)?ss(S.etaSeconds):"—",m=[["Altitude",et(S.altitudeM)],["Velocity",pi(S.velocity)],["Dest",S.destinationName??"—"],["ETA",y]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;for(const[v,b]of m)R+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(v,k,R),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(b,T,R);g+=d+l}e.restore()}function ps(e,t,n,i,o,r,c){return[...e.cars].sort((a,l)=>a.id-l.id).map((a,l)=>{const f=a.y,u=a.target!==void 0?e.stops.find(p=>p.entity_id===a.target):void 0,d=u?as(f,u.y,a.v,o,r,c):void 0;return{cx:n,cy:t.toScreenAlt(f),altitudeM:f,velocity:a.v,phase:rs(a.v,i.get(a.id)??0,o),layer:is(f),carName:`Climber ${String.fromCharCode(65+l)}`,destinationName:u?.name,etaSeconds:d}})}const be=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function ft(e,t,n){return e+(t-e)*n}function ht(e,t,n){const i=parseInt(e.slice(1),16),o=parseInt(t.slice(1),16),r=Math.round(ft(i>>16&255,o>>16&255,n)),c=Math.round(ft(i>>8&255,o>>8&255,n)),s=Math.round(ft(i&255,o&255,n));return`#${(r<<16|c<<8|s).toString(16).padStart(6,"0")}`}function us(e,t){let n=0;for(;n<be.length-1;n++){const l=be[n+1];if(l===void 0||e<=l[0])break}const i=be[n],o=be[Math.min(n+1,be.length-1)];if(i===void 0||o===void 0)return"#050810";const r=o[0]-i[0],c=r<=0?0:Math.max(0,Math.min(1,(e-i[0])/r)),s=ht(i[1],o[1],c),a=ht(i[2],o[2],c);return ht(s,a,t)}const fs=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let i=0;i<60;i++){const o=.45+Math.pow(n(),.7)*.55;e.push({altFrac:o,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function hs(e,t,n,i,o){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),c=Math.log10(1+t.axisMaxM/1e3),s=[0,.05,.15,.35,.6,1];for(const l of s){const f=1e3*(10**(l*c)-1);r.addColorStop(l,us(f,o))}e.fillStyle=r,e.fillRect(n,t.shaftTop,i-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,i-n,t.shaftBottom-t.shaftTop),e.clip();for(const l of fs){const f=t.axisMaxM*l.altFrac;if(f<8e4)continue;const u=t.toScreenAlt(f),d=n+l.xFrac*(i-n),p=l.alpha*(.7+.3*o);e.fillStyle=`rgba(232, 232, 240, ${p.toFixed(3)})`,e.beginPath(),e.arc(d,u,l.size,0,Math.PI*2),e.fill()}e.restore();const a=os(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const l of a){const f=t.toScreenAlt(l.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(i,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(l.label,n+4,f-6))}}function gs(e,t,n,i){const r=i-28,c=e.createLinearGradient(0,r,0,i);c.addColorStop(0,"rgba(0,0,0,0)"),c.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),c.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=c,e.fillRect(t,r,n-t,28),e.strokeStyle=ri("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,i+.5),e.lineTo(n,i+.5),e.stroke()}function ms(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function bs(e,t,n,i){const o=Math.max(5,i.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-o),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const c=-Math.PI/2+r*Math.PI/3,s=t+Math.cos(c)*o,a=n+Math.sin(c)*o;r===0?e.moveTo(s,a):e.lineTo(s,a)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(i.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+o+6,n),e.restore()}function ys(e,t,n,i,o,r,c){e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const s of t.stops){const a=n.toScreenAlt(s.y);if(a<n.shaftTop||a>n.shaftBottom)continue;const l=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(i-l/2,a),e.lineTo(i-5,a),e.moveTo(i+5,a),e.lineTo(i+l/2,a),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(i-l/2,a),e.lineTo(i-5,a-5),e.moveTo(i+l/2,a),e.lineTo(i+5,a-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(s.name,r+c-4,a-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(o.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(et(s.y),r+c-4,a+10),e.font=`${o.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function Ss(e,t,n){const i=Math.max(n.counterweightAltitudeM,1),o=Math.log10(1+i/1e3);return{axisMaxM:i,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const c=Math.log10(1+Math.max(0,r)/1e3),s=o<=0?0:Math.max(0,Math.min(1,c/o));return t-s*(t-e)}}}function ws(e,t,n,i,o,r,c){const s=Math.max(2,c.figureHeadR*.9);for(const a of t.cars){if(a.target===void 0)continue;const l=r.get(a.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const u=o.get(a.id);if(u===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(i,u),e.lineTo(i,d),e.stroke(),e.fillStyle=li,e.beginPath(),e.arc(i,d,s,0,Math.PI*2),e.fill())}}function vs(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function ks(e,t,n,i,o,r,c){c.firstDrawAt===0&&(c.firstDrawAt=performance.now());const s=(performance.now()-c.firstDrawAt)/1e3,a=r.showDayNight?vs(s):.5,l=n>=520&&i>=360,f=Math.min(120,Math.max(72,n*.16)),u=l?Math.min(220,Math.max(160,n*.24)):0,d=l?14:0,p=o.padX,h=p+f+4,g=n-o.padX-u-d,S=(h+g)/2,k=12,T=o.padTop+24,R=i-o.padBottom-18,y=Ss(T,R,r);hs(e,y,h+k,g-k,a),gs(e,h+k,g-k,R),ms(e,S,y),bs(e,S,y.shaftTop,o),ys(e,t,y,S,o,p,f);const m=Math.max(20,Math.min(34,g-h-8)),v=Math.max(16,Math.min(26,m*.72));o.carH=v,o.carW=m;const b=new Map,_=new Map;t.stops.forEach((w,E)=>_.set(w.entity_id,E));for(const w of t.cars)b.set(w.id,y.toScreenAlt(w.y));ws(e,t,y,S,b,_,o);for(const w of t.cars){const E=b.get(w.id);E!==void 0&&cs(e,w,S,E,m,v)}const x=[...ps(t,y,S,c.prevVelocity,c.maxSpeed,c.acceleration,c.deceleration)].sort((w,E)=>E.altitudeM-w.altitudeM);ls(e,x,m,n-u-d,o),l&&ds(e,x,n-o.padX-u,u,T,o);for(const w of t.cars)c.prevVelocity.set(w.id,w.v);if(c.prevVelocity.size>t.cars.length){const w=new Set(t.cars.map(E=>E.id));for(const E of c.prevVelocity.keys())w.has(E)||c.prevVelocity.delete(E)}}function _s(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(i,o)=>i+(o-i)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function Sn(e,t){let n,i=1/0;for(const o of e){const r=Math.abs(o.y-t);r<i&&(i=r,n=o)}return n!==void 0?{stop:n,dist:i}:void 0}class fi{#e;#t;#n=window.devicePixelRatio||1;#o;#r=null;#s=-1;#d=new Map;#a;#i=new Map;#c=new Map;#l=[];#p=null;#g=new Map;#m=1;#b=1;#y=1;#f=0;#u=new Map;constructor(t,n){this.#e=t;const i=t.getContext("2d");if(!i)throw new Error("2D context unavailable");this.#t=i,this.#a=n,this.#h(),this.#o=()=>{this.#h()},window.addEventListener("resize",this.#o)}dispose(){window.removeEventListener("resize",this.#o)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#g.clear(),this.#f=0,this.#u.clear()}setTetherPhysics(t,n,i){Number.isFinite(t)&&t>0&&(this.#m=t),Number.isFinite(n)&&n>0&&(this.#b=n),Number.isFinite(i)&&i>0&&(this.#y=i)}pushAssignment(t,n,i){let o=this.#u.get(t);o===void 0&&(o=new Map,this.#u.set(t,o)),o.set(i,n)}#h(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const i=t*this.#n,o=n*this.#n;(this.#e.width!==i||this.#e.height!==o)&&(this.#e.width=i,this.#e.height=o),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}draw(t,n,i){this.#h();const{clientWidth:o,clientHeight:r}=this.#e,c=this.#t;if(c.clearRect(0,0,o,r),t.stops.length===0||o===0||r===0)return;o!==this.#s&&(this.#r=_s(o),this.#s=o);const s=this.#r;if(s===null)return;if(this.#p!==null){this.#S(t,o,r,s,n,i,this.#p);return}const a=t.stops.length===2,l=t.stops[0];if(l===void 0)return;let f=l.y,u=l.y;for(let C=1;C<t.stops.length;C++){const L=t.stops[C];if(L===void 0)continue;const B=L.y;B<f&&(f=B),B>u&&(u=B)}const d=t.stops.map(C=>C.y).sort((C,L)=>C-L),p=d.length>=3?(d.at(-1)??0)-(d.at(-2)??0):1,g=f-1,S=u+p,k=Math.max(S-g,1e-4),T=a?18:0;let R,y;if(a)R=s.padTop+T,y=r-s.padBottom-T;else{const C=[];for(let re=1;re<d.length;re++){const Le=d[re],Fe=d[re-1];if(Le===void 0||Fe===void 0)continue;const J=Le-Fe;J>0&&C.push(J)}const D=48/(C.length>0?Math.min(...C):1),X=Math.max(0,r-s.padTop-s.padBottom)/k,K=Math.min(X,D),oe=k*K;y=r-s.padBottom,R=y-oe}const m=C=>y-(C-g)/k*(y-R),v=this.#d;v.forEach(C=>C.length=0);for(const C of t.cars){const L=v.get(C.line);L?L.push(C):v.set(C.line,[C])}const b=[...v.keys()].sort((C,L)=>C-L),_=b.reduce((C,L)=>C+(v.get(L)?.length??0),0),I=Math.max(0,o-2*s.padX-s.labelW),x=s.figureStride*2,w=s.shaftSpacing*Math.max(_-1,0),A=(I-w)/Math.max(_,1),P=a?34:s.maxShaftInnerW,F=Math.max(s.minShaftInnerW,Math.min(P,A*.55)),V=Math.max(0,Math.min(A-F,x+s.figureStride*4)),Ae=Math.max(14,F-6);let N=1/0;if(t.stops.length>=2)for(let C=1;C<d.length;C++){const L=d[C-1],B=d[C];if(L===void 0||B===void 0)continue;const D=m(L)-m(B);D>0&&D<N&&(N=D)}const Me=m(u)-2,Pe=Number.isFinite(N)?N:s.carH,Ri=a?s.carH:Pe,Ei=Math.max(14,Math.min(Ri,Me));if(!a&&Number.isFinite(N)){const C=Math.max(1.5,Math.min(N*.067,4)),L=s.figureStride*(C/s.figureHeadR);s.figureHeadR=C,s.figureStride=L}s.shaftInnerW=F,s.carW=Ae,s.carH=Ei;const Ii=s.padX+s.labelW,xi=F+V,it=[],he=new Map,ot=new Map;let Ot=0;for(const C of b){const L=v.get(C)??[];for(const B of L){const D=Ii+Ot*(xi+s.shaftSpacing),U=D,X=D+V,K=X+F/2;it.push(K),he.set(B.id,K),ot.set(B.id,{start:U,end:X}),Ot++}}const Wt=new Map;t.stops.forEach((C,L)=>Wt.set(C.entity_id,L));const qt=new Set;{let C=0;for(const L of b){const B=v.get(L)??[];for(const D of B){if(D.phase==="loading"||D.phase==="door-opening"||D.phase==="door-closing"){const U=Sn(t.stops,D.y);U!==void 0&&U.dist<.5&&qt.add(`${C}:${U.stop.entity_id}`)}C++}}}const Ht=new Map,Nt=new Map,Gt=new Map,Ut=new Map,jt=[],zt=[];let Vt=0;for(let C=0;C<b.length;C++){const L=b[C];if(L===void 0)continue;const B=v.get(L)??[],D=Mr[C]??Lr,U=Pr[C]??Fr,X=Br[C]??1,K=Wr[C]??qr,oe=Math.max(14,F*X),re=Math.max(10,Ae*X),Le=Math.max(10,s.carH),Fe=C===2?Dr:C===3?Or:ut;let J=1/0,rt=-1/0,Be=1/0;for(const Q of B){Ht.set(Q.id,oe),Nt.set(Q.id,re),Gt.set(Q.id,Le),Ut.set(Q.id,Fe);const se=it[Vt];if(se===void 0)continue;const Xt=Number.isFinite(Q.min_served_y)&&Number.isFinite(Q.max_served_y),st=Xt?Math.max(R,m(Q.max_served_y)-s.carH-2):R,Ai=Xt?Math.min(y,m(Q.min_served_y)+2):y;jt.push({cx:se,top:st,bottom:Ai,fill:D,frame:U,width:oe}),se<J&&(J=se),se>rt&&(rt=se),st<Be&&(Be=st),Vt++}b.length>1&&Number.isFinite(J)&&Number.isFinite(Be)&&zt.push({cx:(J+rt)/2,top:Be,text:$r[C]??`Line ${C+1}`,color:K})}Xr(c,jt),Yr(c,zt,s),Kr(c,t,m,s,it,o,qt,R,a),Qr(c,t,m,s,ot,this.#u),Zr(c,t,he,Ht,m,s,Wt);for(const[C,L]of he){const B=t.cars.find(oe=>oe.id===C);if(!B)continue;const D=Nt.get(C)??s.carW,U=Gt.get(C)??s.carH,X=Ut.get(C)??ut,K=this.#i.get(C);es(c,B,L,D,U,m),ts(c,B,L,D,U,X,m,s,K?.roster)}this.#w(t,he,ot,m,s,n),this.#v(s),i&&i.size>0&&ns(c,this.#a,t,he,m,s,i,o)}#S(t,n,i,o,r,c,s){const a={prevVelocity:this.#g,maxSpeed:this.#m,acceleration:this.#b,deceleration:this.#y,firstDrawAt:this.#f};ks(this.#t,t,n,i,o,s,a),this.#f=a.firstDrawAt}#w(t,n,i,o,r,c){const s=performance.now(),a=Math.max(1,c),l=Gr/a,f=30/a,u=new Map,d=[];for(const p of t.cars){const h=this.#i.get(p.id),g=p.riders,S=n.get(p.id),k=Sn(t.stops,p.y),T=p.phase==="loading"&&k!==void 0&&k.dist<.5?k.stop:void 0;if(h&&S!==void 0&&T!==void 0){const m=g-h.riders;if(m>0&&u.set(T.entity_id,(u.get(T.entity_id)??0)+m),m!==0){const v=o(T.y),b=o(p.y)-r.carH/2,_=Math.min(Math.abs(m),6);if(m>0){const I=T.waiting_up>=T.waiting_down,x=i.get(p.id);let w=S-20;if(x!==void 0){const P=x.start,W=x.end;w=(P+W)/2}const E=I?si:ai,A=this.#u.get(T.entity_id);A!==void 0&&(A.delete(p.line),A.size===0&&this.#u.delete(T.entity_id));for(let P=0;P<_;P++)d.push(()=>this.#l.push({kind:"board",bornAt:s+P*f,duration:l,startX:w,startY:v,endX:S,endY:b,color:E}))}else for(let I=0;I<_;I++)d.push(()=>this.#l.push({kind:"alight",bornAt:s+I*f,duration:l,startX:S,startY:b,endX:S+18,endY:b+10,color:ut}))}}const R=h?.roster??[];let y;if(h){const m=g-h.riders;if(y=R.slice(),m>0&&T!==void 0){const b=T.waiting_up>=T.waiting_down?0:1e4;for(let _=0;_<m;_++)y.push(de(T.entity_id,_+b))}else if(m>0)for(let v=0;v<m;v++)y.push(de(p.id,y.length+v));else m<0&&y.splice(y.length+m,-m)}else{y=[];for(let m=0;m<g;m++)y.push(de(p.id,m))}for(;y.length>g;)y.pop();for(;y.length<g;)y.push(de(p.id,y.length));this.#i.set(p.id,{riders:g,roster:y})}for(const p of t.stops){const h=p.waiting_up+p.waiting_down,g=this.#c.get(p.entity_id);if(g){const S=g.waiting-h,k=u.get(p.entity_id)??0,T=Math.max(0,S-k);if(T>0){const R=o(p.y),y=r.padX+r.labelW+20,m=Math.min(T,4);for(let v=0;v<m;v++)this.#l.push({kind:"abandon",bornAt:s+v*f,duration:l*1.5,startX:y,startY:R,endX:y-26,endY:R-6,color:ci})}}this.#c.set(p.entity_id,{waiting:h})}for(const p of d)p();for(let p=this.#l.length-1;p>=0;p--){const h=this.#l[p];h!==void 0&&s-h.bornAt>h.duration&&this.#l.splice(p,1)}if(this.#i.size>t.cars.length){const p=new Set(t.cars.map(h=>h.id));for(const h of this.#i.keys())p.has(h)||this.#i.delete(h)}if(this.#c.size>t.stops.length){const p=new Set(t.stops.map(h=>h.entity_id));for(const h of this.#c.keys())p.has(h)||this.#c.delete(h)}}#v(t){const n=performance.now(),i=this.#t;for(const o of this.#l){const r=n-o.bornAt;if(r<0)continue;const c=Math.min(1,Math.max(0,r/o.duration)),s=Ir(c),[a,l]=o.kind==="board"?Er(o.startX,o.startY,o.endX,o.endY,s):[o.startX+(o.endX-o.startX)*s,o.startY+(o.endY-o.startY)*s],f=o.kind==="board"?.9:o.kind==="abandon"?(1-s)**1.5:1-s,u=o.kind==="abandon"?t.carDotR*.85:t.carDotR;i.fillStyle=Ft(o.color,f),i.beginPath(),i.arc(a,l,u,0,Math.PI*2),i.fill()}}}const Cs="#f59e0b",Ts=3;function Rs(){const e="quest-pane";return{root:M("quest-pane",e),gridView:M("quest-grid",e),stageView:M("quest-stage-view",e),backBtn:M("quest-back-to-grid",e),title:M("quest-stage-title",e),brief:M("quest-stage-brief",e),stageStars:M("quest-stage-stars",e),editorHost:M("quest-editor",e),runBtn:M("quest-run",e),resetBtn:M("quest-reset",e),result:M("quest-result",e),progress:M("quest-progress",e),shaft:M("quest-shaft",e),shaftIdle:M("quest-shaft-idle",e)}}function gt(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=xe(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(Ts-n)}function mt(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function Es(e){const t=Rs(),n=b=>{const _=sr(b);if(_)return _;const I=te[0];if(!I)throw new Error("quest-pane: stage registry is empty");return I},i=Sr(n(e.initialStageId),"grid");gt(t,i.activeStage);const o=br();pn(o,i.activeStage);const r=yr();fn(r,i.activeStage);const c=vr();dt(c,i.activeStage);const s=ur(),a=new fi(t.shaft,Cs);t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const l=await wo({container:t.editorHost,initialValue:sn(i.activeStage.id)??i.activeStage.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const f=kr(),u=300;let d=null,p=!1;const h=()=>{p||(d!==null&&clearTimeout(d),d=setTimeout(()=>{an(i.activeStage.id,l.getValue()),d=null},u))},g=()=>{d!==null&&(clearTimeout(d),d=null,an(i.activeStage.id,l.getValue()))},S=b=>{p=!0;try{l.setValue(b)}finally{p=!1}};l.onDidChange(()=>{h()});const k=Rr();mn(k,i.activeStage,l);const T=()=>{hn(i),t.shaftIdle.hidden=!1;const b=t.shaft.getContext("2d");b&&b.clearRect(0,0,t.shaft.width,t.shaft.height)},R=(b,{fromGrid:_})=>{g(),wr(i,b),gt(t,b),pn(o,b),fn(r,b),dt(c,b),mn(k,b,l),S(sn(b.id)??b.starterCode),l.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",T(),mt(t,"stage"),lt(i,"stage"),e.onStageChange?.(b.id)},y=()=>{g(),T(),t.result.textContent="",t.progress.textContent="",mt(t,"grid"),lt(i,"grid"),ct(s,b=>{R(n(b),{fromGrid:!0})}),e.onBackToGrid?.()};ct(s,b=>{R(n(b),{fromGrid:!0})});const m=e.landOn??"grid";mt(t,m),lt(i,m);const v=async()=>{const b=i.activeStage;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",l.clearRuntimeMarker();let _=null,I=0;i.runLoop.active=!0;const x=()=>{i.runLoop.active&&(_!==null&&a.draw(_,1),requestAnimationFrame(x))};t.shaftIdle.hidden=!0,requestAnimationFrame(x);try{const w=await gr(b,l.getValue(),{timeoutMs:1e3,onProgress:E=>{me(i,b)&&(t.progress.textContent=mr(E))},onSnapshot:E=>{_=E,I+=1}});if(w.passed){const E=xe(b.id);w.stars>E&&(lr(b.id,w.stars),ct(s,A=>{R(n(A),{fromGrid:!0})}),me(i,b)&&gt(t,i.activeStage)),me(i,b)&&dt(c,i.activeStage,{collapse:!1})}if(me(i,b)){t.result.textContent="",t.progress.textContent="";const E=w.passed?ar(b.id):void 0,A=E?()=>{R(E,{fromGrid:!1})}:void 0;_r(f,w,()=>void v(),b.failHint,A)}}catch(w){if(me(i,b)){const E=w instanceof Error?w.message:String(w);t.result.textContent=`Error: ${E}`,t.progress.textContent="",w instanceof Zn&&w.location!==null&&l.setRuntimeMarker({line:w.location.line,column:w.location.column,message:E})}}finally{if(t.runBtn.disabled=!1,hn(i),I===0){const w=t.shaft.getContext("2d");w&&w.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{v()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${i.activeStage.title} to its starter code?`)&&(cr(i.activeStage.id),S(i.activeStage.starterCode),l.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{y()}),{handles:t,editor:l}}let bt=null;async function hi(){if(!bt){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;bt=import(e).then(async n=>(await n.default(t),n))}return bt}class $t{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,i){const o=await hi();return new $t(new o.WasmSim(t,n,i))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,i,o){return this.#e.spawnRider(t,n,i,o)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class gi{#e;#t=0;#n=[];#o=0;#r=0;#s=1;#d=0;constructor(t){this.#e=Is(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#o=t.reduce((n,i)=>n+i.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#s=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const i=t.stops.filter(s=>s.stop_id!==4294967295);if(i.length<2)return[];const o=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#s/60*o,this.#r=(this.#r+o)%(this.#o||1);const c=[];for(;this.#t>=1;)this.#t-=1,c.push(this.#a(i,r));return c}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,i]of this.#n.entries())if(t-=i.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#o<=0?0:Math.min(1,this.#r/this.#o)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const i=n.durationSec;if(t<i)return i>0?Math.min(1,t/i):0;t-=i}return 1}phases(){return this.#n}#a(t,n){const i=this.#i(t.length,n.originWeights);let o=this.#i(t.length,n.destWeights);o===i&&(o=(o+1)%t.length);const r=t[i],c=t[o];if(!r||!c)throw new Error("stop index out of bounds");const s=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:c.stop_id,weight:s,...this.#d>0?{patienceTicks:this.#d}:{}}}#i(t,n){if(!n||n.length!==t)return this.#l(t);let i=0;for(const r of n)i+=Math.max(0,r);if(i<=0)return this.#l(t);let o=this.#p()*i;for(const[r,c]of n.entries())if(o-=Math.max(0,c),o<0)return r;return t-1}#c(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#l(t){return Number(this.#c()%BigInt(t))}#p(){return Number(this.#c()>>11n)/2**53}}function Is(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const xs="#7dd3fc",As="#fda4af";async function wn(e,t,n,i,o){const r=Bi(i,o),c=await $t.create(r,t,n),s=new fi(e.canvas,e.accent);if(s.setTetherConfig(i.tether??null),i.tether){const l=Lt(i,o);s.setTetherPhysics(l.maxSpeed,l.acceleration,l.deceleration)}const a=e.canvas.parentElement;if(a){const l=i.stops.length,u=i.tether?640:Math.max(200,l*16);a.style.setProperty("--shaft-min-h",`${u}px`)}return{strategy:t,sim:c,renderer:s,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function ye(e){e?.sim.dispose(),e?.renderer.dispose()}function Tt(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const Ms=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],Ps=120;function vn(e,t,n){const i=e.sim.metrics();e.latestMetrics=i;for(const r of Ms){const c=e.metricHistory[r];c.push(i[r]),c.length>Ps&&c.shift()}const o=performance.now();for(const[r,c]of e.bubbles)c.expiresAt<=o&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const Ls={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},Fs=1e3;function Bs(e,t,n){const i=performance.now(),o=r=>Ds(n,r);for(const r of t){const c=$s(r,o);if(c===null)continue;const s=r.elevator;if(s===void 0)continue;const a=Ls[r.kind]??Fs;e.bubbles.set(s,{text:c,bornAt:i,expiresAt:i+a})}}function $s(e,t){switch(e.kind){case"elevator-assigned":return`› To ${t(e.stop)}`;case"elevator-repositioning":return`↻ Reposition to ${t(e.stop)}`;case"elevator-arrived":return`● At ${t(e.stop)}`;case"door-opened":return"◌ Doors open";case"rider-boarded":return"+ Boarding";case"rider-exited":return`↓ Off at ${t(e.stop)}`;default:return null}}function Ds(e,t){return e.stops.find(i=>i.entity_id===t)?.name??`stop #${t}`}const Os={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function kn(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=Os[t],e.modeEl.title=t)}function Ws(){const e=s=>{const a=document.getElementById(s);if(!a)throw new Error(`missing element #${s}`);return a},t=s=>document.getElementById(s),n=(s,a)=>({root:e(`pane-${s}`),canvas:e(`shaft-${s}`),name:e(`name-${s}`),mode:e(`mode-${s}`),desc:e(`desc-${s}`),metrics:e(`metrics-${s}`),trigger:e(`strategy-trigger-${s}`),popover:e(`strategy-popover-${s}`),repoTrigger:e(`repo-trigger-${s}`),repoName:e(`repo-name-${s}`),repoPopover:e(`repo-popover-${s}`),accent:a,which:s}),i=s=>{const a=document.querySelector(`.tweak-row[data-key="${s}"]`);if(!a)throw new Error(`missing tweak row for ${s}`);const l=u=>{const d=a.querySelector(u);if(!d)throw new Error(`missing ${u} in tweak row ${s}`);return d},f=u=>a.querySelector(u);return{root:a,value:l(".tweak-value"),defaultV:l(".tweak-default-v"),dec:l(".tweak-dec"),inc:l(".tweak-inc"),reset:l(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},o={};for(const s of fe)o[s]=i(s);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:o,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",xs),paneB:n("b",As)};oo(r);const c=document.getElementById("controls-bar");return c&&new ResizeObserver(([a])=>{if(!a)return;const l=Math.ceil(a.borderBoxSize[0]?.blockSize??a.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${l}px`)}).observe(c),r}function mi(e,t,n,i,o,r,c,s,a){const l=document.createDocumentFragment();for(const f of t){const u=document.createElement("button");u.type="button",u.className="strategy-option",u.setAttribute("role","menuitemradio"),u.setAttribute("aria-checked",f===r?"true":"false"),u.dataset[o]=f;const d=document.createElement("span");d.className="strategy-option-name";const p=document.createElement("span");if(p.className="strategy-option-label",p.textContent=n[f],d.appendChild(p),c&&f===c){const g=document.createElement("span");g.className="strategy-option-sibling",g.textContent=`also in ${s}`,d.appendChild(g)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=i[f],u.append(d,h),u.addEventListener("click",()=>{a(f)}),l.appendChild(u)}e.replaceChildren(l)}function ne(e,t){const n=Ee[t],i=Kn[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=i}function _n(e,t,n,i,o){mi(e.repoPopover,to,Ee,Kn,"reposition",t,n,i,o)}function ke(e,t,n){const{repositionA:i,repositionB:o,compare:r}=e.permalink;_n(t.paneA,i,r?o:null,"B",c=>void Tn(e,t,"a",c,n)),_n(t.paneB,o,r?i:null,"A",c=>void Tn(e,t,"b",c,n))}function Rt(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function bi(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function Et(e){Rt(e.paneA,!1),Rt(e.paneB,!1)}function tt(e){xt(e),Et(e)}function Cn(e,t,n,i){n.repoTrigger.addEventListener("click",o=>{o.stopPropagation();const r=n.repoPopover.hidden;tt(t),r&&(ke(e,t,i),Rt(n,!0))})}async function Tn(e,t,n,i,o){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===i){Et(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:i},ne(t.paneA,i)):(e.permalink={...e.permalink,repositionB:i},ne(t.paneB,i)),q(e.permalink),ke(e,t,o),Et(t),await o(),G(t.toast,`${n==="a"?"A":"B"} park: ${Ee[i]}`)}function qs(e){document.addEventListener("click",t=>{if(!yi(e)&&!bi(e))return;const n=t.target;if(n instanceof Node){for(const i of[e.paneA,e.paneB])if(i.popover.contains(n)||i.trigger.contains(n)||i.repoPopover.contains(n)||i.repoTrigger.contains(n))return;tt(e)}})}function ie(e,t){const n=ue[t],i=Yn[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==i&&(e.desc.textContent=i),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=i}function Rn(e,t,n,i,o){mi(e.popover,eo,ue,Yn,"strategy",t,n,i,o)}function _e(e,t,n){const{strategyA:i,strategyB:o,compare:r}=e.permalink;Rn(t.paneA,i,r?o:null,"B",c=>void In(e,t,"a",c,n)),Rn(t.paneB,o,r?i:null,"A",c=>void In(e,t,"b",c,n))}function It(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function yi(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function xt(e){It(e.paneA,!1),It(e.paneB,!1)}function En(e,t,n,i){n.trigger.addEventListener("click",o=>{o.stopPropagation();const r=n.popover.hidden;tt(t),r&&(_e(e,t,i),It(n,!0))})}async function In(e,t,n,i,o){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===i){xt(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:i},ie(t.paneA,i)):(e.permalink={...e.permalink,strategyB:i},ie(t.paneB,i)),q(e.permalink),_e(e,t,o),xt(t),await o(),G(t.toast,`${n==="a"?"A":"B"}: ${ue[i]}`)}function xn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function Hs(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function nt(e,t,n){let i=!1;for(const o of fe){const r=n.tweakRows[o],c=e.tweakRanges[o],s=ee(e,o,t),a=Mt(e,o),l=Pt(e,o,s);l&&(i=!0),r.value.textContent=xn(o,s),r.defaultV.textContent=xn(o,a),r.dec.disabled=s<=c.min+1e-9,r.inc.disabled=s>=c.max-1e-9,r.root.dataset.overridden=String(l),r.reset.hidden=!l;const f=Math.max(c.max-c.min,1e-9),u=Math.max(0,Math.min(1,(s-c.min)/f)),d=Math.max(0,Math.min(1,(a-c.min)/f));r.trackFill&&(r.trackFill.style.width=`${(u*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(u*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!i}function Si(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function Dt(e,t,n,i){const o=Lt(n,e.permalink.overrides),r={maxSpeed:o.maxSpeed,weightCapacityKg:o.weightCapacity,doorOpenTicks:o.doorOpenTicks,doorTransitionTicks:o.doorTransitionTicks},c=[e.paneA,e.paneB].filter(a=>a!==null),s=c.every(a=>a.sim.applyPhysicsLive(r));if(s)for(const a of c)a.renderer?.setTetherPhysics(o.maxSpeed,o.acceleration,o.deceleration);nt(n,e.permalink.overrides,t),s||i()}function Ns(e,t,n){return Math.min(n,Math.max(t,e))}function Gs(e,t,n){const i=Math.round((e-t)/n);return t+i*n}function Oe(e,t,n,i,o){const r=H(e.permalink.scenario),c=r.tweakRanges[n],s=ee(r,n,e.permalink.overrides),a=Ns(s+i*c.step,c.min,c.max),l=Gs(a,c.min,c.step);zs(e,t,n,l,o)}function Us(e,t,n,i){const o=H(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},q(e.permalink),n==="cars"?(i(),G(t.toast,"Cars reset")):(Dt(e,t,o,i),G(t.toast,`${Hs(n)} reset`))}async function js(e,t,n){const i=H(e.permalink.scenario),o=Pt(i,"cars",ee(i,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},q(e.permalink),o?await n():Dt(e,t,i,n),G(t.toast,"Parameters reset")}function zs(e,t,n,i,o){const r=H(e.permalink.scenario),c={...e.permalink.overrides,[n]:i};e.permalink={...e.permalink,overrides:Hn(r,c)},q(e.permalink),n==="cars"?o():Dt(e,t,r,o)}function Vs(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Xs(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function i(){return this instanceof i?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(i){var o=Object.getOwnPropertyDescriptor(e,i);Object.defineProperty(n,i,o.get?o:{enumerable:!0,get:function(){return e[i]}})}),n}var We={exports:{}},Ys=We.exports,An;function Ks(){return An||(An=1,(function(e){(function(t,n,i){function o(a){var l=this,f=s();l.next=function(){var u=2091639*l.s0+l.c*23283064365386963e-26;return l.s0=l.s1,l.s1=l.s2,l.s2=u-(l.c=u|0)},l.c=1,l.s0=f(" "),l.s1=f(" "),l.s2=f(" "),l.s0-=f(a),l.s0<0&&(l.s0+=1),l.s1-=f(a),l.s1<0&&(l.s1+=1),l.s2-=f(a),l.s2<0&&(l.s2+=1),f=null}function r(a,l){return l.c=a.c,l.s0=a.s0,l.s1=a.s1,l.s2=a.s2,l}function c(a,l){var f=new o(a),u=l&&l.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,u&&(typeof u=="object"&&r(u,f),d.state=function(){return r(f,{})}),d}function s(){var a=4022871197,l=function(f){f=String(f);for(var u=0;u<f.length;u++){a+=f.charCodeAt(u);var d=.02519603282416938*a;a=d>>>0,d-=a,d*=a,a=d>>>0,d-=a,a+=d*4294967296}return(a>>>0)*23283064365386963e-26};return l}n&&n.exports?n.exports=c:this.alea=c})(Ys,e)})(We)),We.exports}var qe={exports:{}},Qs=qe.exports,Mn;function Js(){return Mn||(Mn=1,(function(e){(function(t,n,i){function o(s){var a=this,l="";a.x=0,a.y=0,a.z=0,a.w=0,a.next=function(){var u=a.x^a.x<<11;return a.x=a.y,a.y=a.z,a.z=a.w,a.w^=a.w>>>19^u^u>>>8},s===(s|0)?a.x=s:l+=s;for(var f=0;f<l.length+64;f++)a.x^=l.charCodeAt(f)|0,a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a}function c(s,a){var l=new o(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xor128=c})(Qs,e)})(qe)),qe.exports}var He={exports:{}},Zs=He.exports,Pn;function ea(){return Pn||(Pn=1,(function(e){(function(t,n,i){function o(s){var a=this,l="";a.next=function(){var u=a.x^a.x>>>2;return a.x=a.y,a.y=a.z,a.z=a.w,a.w=a.v,(a.d=a.d+362437|0)+(a.v=a.v^a.v<<4^(u^u<<1))|0},a.x=0,a.y=0,a.z=0,a.w=0,a.v=0,s===(s|0)?a.x=s:l+=s;for(var f=0;f<l.length+64;f++)a.x^=l.charCodeAt(f)|0,f==l.length&&(a.d=a.x<<10^a.x>>>4),a.next()}function r(s,a){return a.x=s.x,a.y=s.y,a.z=s.z,a.w=s.w,a.v=s.v,a.d=s.d,a}function c(s,a){var l=new o(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xorwow=c})(Zs,e)})(He)),He.exports}var Ne={exports:{}},ta=Ne.exports,Ln;function na(){return Ln||(Ln=1,(function(e){(function(t,n,i){function o(s){var a=this;a.next=function(){var f=a.x,u=a.i,d,p;return d=f[u],d^=d>>>7,p=d^d<<24,d=f[u+1&7],p^=d^d>>>10,d=f[u+3&7],p^=d^d>>>3,d=f[u+4&7],p^=d^d<<7,d=f[u+7&7],d=d^d<<13,p^=d^d<<9,f[u]=p,a.i=u+1&7,p};function l(f,u){var d,p=[];if(u===(u|0))p[0]=u;else for(u=""+u,d=0;d<u.length;++d)p[d&7]=p[d&7]<<15^u.charCodeAt(d)+p[d+1&7]<<13;for(;p.length<8;)p.push(0);for(d=0;d<8&&p[d]===0;++d);for(d==8?p[7]=-1:p[d],f.x=p,f.i=0,d=256;d>0;--d)f.next()}l(a,s)}function r(s,a){return a.x=s.x.slice(),a.i=s.i,a}function c(s,a){s==null&&(s=+new Date);var l=new o(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(f.x&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xorshift7=c})(ta,e)})(Ne)),Ne.exports}var Ge={exports:{}},ia=Ge.exports,Fn;function oa(){return Fn||(Fn=1,(function(e){(function(t,n,i){function o(s){var a=this;a.next=function(){var f=a.w,u=a.X,d=a.i,p,h;return a.w=f=f+1640531527|0,h=u[d+34&127],p=u[d=d+1&127],h^=h<<13,p^=p<<17,h^=h>>>15,p^=p>>>12,h=u[d]=h^p,a.i=d,h+(f^f>>>16)|0};function l(f,u){var d,p,h,g,S,k=[],T=128;for(u===(u|0)?(p=u,u=null):(u=u+"\0",p=0,T=Math.max(T,u.length)),h=0,g=-32;g<T;++g)u&&(p^=u.charCodeAt((g+32)%u.length)),g===0&&(S=p),p^=p<<10,p^=p>>>15,p^=p<<4,p^=p>>>13,g>=0&&(S=S+1640531527|0,d=k[g&127]^=p+S,h=d==0?h+1:0);for(h>=128&&(k[(u&&u.length||0)&127]=-1),h=127,g=512;g>0;--g)p=k[h+34&127],d=k[h=h+1&127],p^=p<<13,d^=d<<17,p^=p>>>15,d^=d>>>12,k[h]=p^d;f.w=S,f.X=k,f.i=h}l(a,s)}function r(s,a){return a.i=s.i,a.w=s.w,a.X=s.X.slice(),a}function c(s,a){s==null&&(s=+new Date);var l=new o(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(f.X&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xor4096=c})(ia,e)})(Ge)),Ge.exports}var Ue={exports:{}},ra=Ue.exports,Bn;function sa(){return Bn||(Bn=1,(function(e){(function(t,n,i){function o(s){var a=this,l="";a.next=function(){var u=a.b,d=a.c,p=a.d,h=a.a;return u=u<<25^u>>>7^d,d=d-p|0,p=p<<24^p>>>8^h,h=h-u|0,a.b=u=u<<20^u>>>12^d,a.c=d=d-p|0,a.d=p<<16^d>>>16^h,a.a=h-u|0},a.a=0,a.b=0,a.c=-1640531527,a.d=1367130551,s===Math.floor(s)?(a.a=s/4294967296|0,a.b=s|0):l+=s;for(var f=0;f<l.length+20;f++)a.b^=l.charCodeAt(f)|0,a.next()}function r(s,a){return a.a=s.a,a.b=s.b,a.c=s.c,a.d=s.d,a}function c(s,a){var l=new o(s),f=a&&a.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.tychei=c})(ra,e)})(Ue)),Ue.exports}var je={exports:{}};const aa={},ca=Object.freeze(Object.defineProperty({__proto__:null,default:aa},Symbol.toStringTag,{value:"Module"})),la=Xs(ca);var da=je.exports,$n;function pa(){return $n||($n=1,(function(e){(function(t,n,i){var o=256,r=6,c=52,s="random",a=i.pow(o,r),l=i.pow(2,c),f=l*2,u=o-1,d;function p(y,m,v){var b=[];m=m==!0?{entropy:!0}:m||{};var _=k(S(m.entropy?[y,R(n)]:y??T(),3),b),I=new h(b),x=function(){for(var w=I.g(r),E=a,A=0;w<l;)w=(w+A)*o,E*=o,A=I.g(1);for(;w>=f;)w/=2,E/=2,A>>>=1;return(w+A)/E};return x.int32=function(){return I.g(4)|0},x.quick=function(){return I.g(4)/4294967296},x.double=x,k(R(I.S),n),(m.pass||v||function(w,E,A,P){return P&&(P.S&&g(P,I),w.state=function(){return g(I,{})}),A?(i[s]=w,E):w})(x,_,"global"in m?m.global:this==i,m.state)}function h(y){var m,v=y.length,b=this,_=0,I=b.i=b.j=0,x=b.S=[];for(v||(y=[v++]);_<o;)x[_]=_++;for(_=0;_<o;_++)x[_]=x[I=u&I+y[_%v]+(m=x[_])],x[I]=m;(b.g=function(w){for(var E,A=0,P=b.i,W=b.j,F=b.S;w--;)E=F[P=u&P+1],A=A*o+F[u&(F[P]=F[W=u&W+E])+(F[W]=E)];return b.i=P,b.j=W,A})(o)}function g(y,m){return m.i=y.i,m.j=y.j,m.S=y.S.slice(),m}function S(y,m){var v=[],b=typeof y,_;if(m&&b=="object")for(_ in y)try{v.push(S(y[_],m-1))}catch{}return v.length?v:b=="string"?y:y+"\0"}function k(y,m){for(var v=y+"",b,_=0;_<v.length;)m[u&_]=u&(b^=m[u&_]*19)+v.charCodeAt(_++);return R(m)}function T(){try{var y;return d&&(y=d.randomBytes)?y=y(o):(y=new Uint8Array(o),(t.crypto||t.msCrypto).getRandomValues(y)),R(y)}catch{var m=t.navigator,v=m&&m.plugins;return[+new Date,t,v,t.screen,R(n)]}}function R(y){return String.fromCharCode.apply(0,y)}if(k(i.random(),n),e.exports){e.exports=p;try{d=la}catch{}}else i["seed"+s]=p})(typeof self<"u"?self:da,[],Math)})(je)),je.exports}var yt,Dn;function ua(){if(Dn)return yt;Dn=1;var e=Ks(),t=Js(),n=ea(),i=na(),o=oa(),r=sa(),c=pa();return c.alea=e,c.xor128=t,c.xorwow=n,c.xorshift7=i,c.xor4096=o,c.tychei=r,yt=c,yt}var fa=ua();const ha=Vs(fa),Je=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],St=Je.reduce((e,t)=>t.length<e.length?t:e).length,wt=Je.reduce((e,t)=>t.length>e.length?t:e).length;function ga(e){const t=e?.seed?new ha(e.seed):null,{minLength:n,maxLength:i,...o}=e||{};function r(){let p=typeof n!="number"?St:s(n);const h=typeof i!="number"?wt:s(i);p>h&&(p=h);let g=!1,S;for(;!g;)S=c(),g=S.length<=h&&S.length>=p;return S}function c(){return Je[a(Je.length)]}function s(p){return p<St&&(p=St),p>wt&&(p=wt),p}function a(p){const h=t?t():Math.random();return Math.floor(h*p)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(o).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=p=>p),typeof e.separator!="string"&&(e.separator=" ");const l=e.min+a(e.max+1-e.min);let f=[],u="",d=0;for(let p=0;p<l*e.wordsPerString;p++)d===e.wordsPerString-1?u+=e.formatter(r(),d):u+=e.formatter(r(),d)+e.separator,d++,(p+1)%e.wordsPerString===0&&(f.push(u),u="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const wi=e=>`${e}×`,vi=e=>`${e.toFixed(1)}×`;function ki(){const e=ga({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function ma(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=wi(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=vi(e.intensity),ie(t.paneA,e.strategyA),ie(t.paneB,e.strategyB),ne(t.paneA,e.repositionA),ne(t.paneB,e.repositionB),Qn(t,e.scenario);const n=H(e.scenario);Object.keys(e.overrides).length>0&&Si(t,!0),nt(n,e.overrides,t)}function Ce(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function _i(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const i=t.phaseLabel;if(!i)return;const o=n&&e.traffic.currentPhaseLabel()||"—";i.textContent!==o&&(i.textContent=o)}function Ci(e,t){if(!t.phaseProgress)return;const i=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==i&&(t.phaseProgress.style.width=i)}function ba(e){if(e.length<2)return"M 0 13 L 100 13";let t=e[0]??0,n=e[0]??0;for(let c=1;c<e.length;c++){const s=e[c];s!==void 0&&(s<t&&(t=s),s>n&&(n=s))}const i=n-t,o=e.length;let r="";for(let c=0;c<o;c++){const s=c/(o-1)*100,a=i>0?13-((e[c]??0)-t)/i*12:7;r+=`${c===0?"M":"L"} ${s.toFixed(2)} ${a.toFixed(2)} `}return r.trim()}const At=[["Avg wait","avg_wait_s"],["Max wait","max_wait_s"],["Delivered","delivered"],["Abandoned","abandoned"],["Utilization","utilization"]];function ya(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Sa(e,t){const n=(p,h,g,S)=>Math.abs(p-h)<g?["tie","tie"]:(S?p>h:p<h)?["win","lose"]:["lose","win"],[i,o]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,c]=n(e.max_wait_s,t.max_wait_s,.05,!1),[s,a]=n(e.delivered,t.delivered,.5,!0),[l,f]=n(e.abandoned,t.abandoned,.5,!1),[u,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:i,max_wait_s:r,delivered:s,abandoned:l,utilization:u},b:{avg_wait_s:o,max_wait_s:c,delivered:a,abandoned:f,utilization:d}}}function On(e){const t=document.createDocumentFragment();for(const[n]of At){const i=pe("div","metric-row flex flex-col gap-[3px] px-2.5 py-[7px] bg-surface-elevated border border-stroke-subtle rounded-md transition-colors duration-normal"),o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.classList.add("metric-spark"),o.setAttribute("viewBox","0 0 100 14"),o.setAttribute("preserveAspectRatio","none"),o.appendChild(document.createElementNS("http://www.w3.org/2000/svg","path")),i.append(pe("span","text-[9.5px] uppercase tracking-[0.08em] text-content-disabled font-medium",n),pe("span","metric-v text-[15px] text-content font-medium [font-feature-settings:'tnum'_1]"),o),t.appendChild(i)}e.replaceChildren(t)}function vt(e,t,n,i){const o=e.children;for(let r=0;r<At.length;r++){const c=o[r];if(!c)continue;const s=At[r];if(!s)continue;const a=s[1],l=n?n[a]:"";c.dataset.verdict!==l&&(c.dataset.verdict=l);const f=c.children[1],u=ya(t,a);f.textContent!==u&&(f.textContent=u);const p=c.children[2].firstElementChild,h=ba(i[a]);p.getAttribute("d")!==h&&p.setAttribute("d",h)}}const wa=200;function Ti(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function Z(e,t){const n=++e.initToken;t.loader.classList.add("show");const i=H(e.permalink.scenario);e.traffic=new gi(Xn(e.permalink.seed)),Ti(e,i),ye(e.paneA),ye(e.paneB),e.paneA=null,e.paneB=null;try{const o=await wn(t.paneA,e.permalink.strategyA,e.permalink.repositionA,i,e.permalink.overrides);ie(t.paneA,e.permalink.strategyA),ne(t.paneA,e.permalink.repositionA),On(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await wn(t.paneB,e.permalink.strategyB,e.permalink.repositionB,i,e.permalink.overrides),ie(t.paneB,e.permalink.strategyB),ne(t.paneB,e.permalink.repositionB),On(t.paneB.metrics)}catch(c){throw ye(o),c}if(n!==e.initToken){ye(o),ye(r);return}e.paneA=o,e.paneB=r,e.seeding=i.seedSpawns>0?{remaining:i.seedSpawns}:null,_i(e,t),Ci(e,t),nt(i,e.permalink.overrides,t)}catch(o){throw n===e.initToken&&G(t.toast,`Init failed: ${o.message}`),o}finally{n===e.initToken&&t.loader.classList.remove("show")}}function va(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let i=0;i<wa&&e.seeding.remaining>0;i++){const o=e.traffic.drainSpawns(t,n);for(const r of o)if(Tt(e,c=>{const s=c.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);s.kind==="err"&&console.warn(`spawnRider failed (seed): ${s.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(Ti(e,H(e.permalink.scenario)),e.seeding=null)}function ka(e,t){const n=()=>Z(e,t),i={renderPaneStrategyInfo:ie,renderPaneRepositionInfo:ne,refreshStrategyPopovers:()=>{_e(e,t,n),ke(e,t,n)},renderTweakPanel:()=>{const r=H(e.permalink.scenario);nt(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const c=r.target;if(!(c instanceof HTMLElement))return;const s=c.closest(".scenario-card");if(!s)return;const a=s.dataset.scenarioId;!a||a===e.permalink.scenario||Jn(e,t,a,n,i)}),En(e,t,t.paneA,n),En(e,t,t.paneB,n),Cn(e,t,t.paneA,n),Cn(e,t,t.paneB,n),_e(e,t,n),ke(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},q(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",_e(e,t,n),ke(e,t,n),Z(e,t).then(()=>{G(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||O.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},q(e.permalink),Z(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=ki();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},q(e.permalink),Z(e,t).then(()=>{G(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=wi(r)}),t.speedInput.addEventListener("change",()=>{q(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=vi(r)}),t.intensityInput.addEventListener("change",()=>{q(e.permalink)});const o=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};o(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,o()}),t.resetBtn.addEventListener("click",()=>{Z(e,t),G(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";Si(t,r)});for(const r of fe){const c=t.tweakRows[r];Kt(c.dec,()=>{Oe(e,t,r,-1,n)}),Kt(c.inc,()=>{Oe(e,t,r,1,n)}),c.reset.addEventListener("click",()=>{Us(e,t,r,n)}),c.root.addEventListener("keydown",s=>{s.key==="ArrowUp"||s.key==="ArrowRight"?(s.preventDefault(),Oe(e,t,r,1,n)):(s.key==="ArrowDown"||s.key==="ArrowLeft")&&(s.preventDefault(),Oe(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{js(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=Vn(e.permalink),c=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(c).then(()=>{G(t.toast,"Permalink copied")},()=>{G(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{Ce(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{Ce(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&Ce(t,!1)}),_a(e,t,i),qs(t)}function _a(e,t,n){window.addEventListener("keydown",i=>{if(e.permalink.mode==="quest")return;if(i.target instanceof HTMLElement){const r=i.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||i.target.isContentEditable||i.target.closest(".monaco-editor"))return}if(i.metaKey||i.ctrlKey||i.altKey)return;switch(i.key){case" ":{i.preventDefault(),t.playBtn.click();return}case"r":case"R":{i.preventDefault(),t.resetBtn.click();return}case"c":case"C":{i.preventDefault(),t.compareToggle.click();return}case"s":case"S":{i.preventDefault(),t.shareBtn.click();return}case"t":case"T":{i.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{i.preventDefault(),Ce(t,t.shortcutSheet.hidden);return}case"Escape":{if(yi(t)||bi(t)){i.preventDefault(),tt(t);return}t.shortcutSheet.hidden||(i.preventDefault(),Ce(t,!1));return}}const o=Number(i.key);if(Number.isInteger(o)&&o>=1&&o<=Re.length){const r=Re[o-1];if(!r)return;r.id!==e.permalink.scenario&&(i.preventDefault(),Jn(e,t,r.id,()=>Z(e,t),n))}})}const Ca="elevator-core playground",Wn="In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";function qn(e){Pi(Ta(e))}function Ta(e){if(e.mode==="quest")return{title:`Quest curriculum — ${Ca}`,description:"Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time."};const n=H(e.scenario).label,i=ue[e.strategyA],o=ue[e.strategyB],r=Ee[e.repositionA],c=Ee[e.repositionB];if(e.compare){const l=`${n}: ${i} vs ${o} — Elevator dispatch playground`,f=`Compare ${i} (parking: ${r}) against ${o} (parking: ${c}) dispatch on the ${n.toLowerCase()} scenario. ${Wn}`;return{title:l,description:f}}const s=`${n}: ${i} dispatch — Elevator dispatch playground`,a=`Watch ${i} dispatch (parking: ${r}) handle live rider traffic on the ${n.toLowerCase()} scenario. ${Wn}`;return{title:s,description:a}}function Ra(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const i=Sa(t.latestMetrics,n.latestMetrics);vt(t.metricsEl,t.latestMetrics,i.a,t.metricHistory),vt(n.metricsEl,n.latestMetrics,i.b,n.metricHistory)}else vt(t.metricsEl,t.latestMetrics,null,t.metricHistory);kn(t),n&&kn(n)}function Ea(e,t){let n=0;const i=()=>{const o=performance.now(),r=(o-e.lastFrameTime)/1e3;e.lastFrameTime=o;const c=e.paneA,s=e.paneB,a=c!==null&&(!e.permalink.compare||s!==null);if(e.running&&e.ready&&a){const l=e.permalink.speed;Tt(e,g=>{g.sim.step(l);const S=g.sim.drainEvents();if(S.length>0){const k=g.sim.snapshot();Bs(g,S,k);const T=new Map;for(const R of k.cars)T.set(R.id,R.line);for(const R of S)if(R.kind==="elevator-assigned"){const y=T.get(R.elevator);y!==void 0&&g.renderer.pushAssignment(R.stop,R.elevator,y)}}}),e.seeding&&va(e);const f=c.sim.snapshot(),d=Math.min(r,4/60)*l,p=e.seeding?[]:e.traffic.drainSpawns(f,d);for(const g of p)Tt(e,S=>{const k=S.sim.spawnRider(g.originStopId,g.destStopId,g.weight,g.patienceTicks);k.kind==="err"&&console.warn(`spawnRider failed: ${k.error}`)});const h=e.permalink.speed;vn(c,c.sim.snapshot(),h),s&&vn(s,s.sim.snapshot(),h),Ra(e),(n+=1)%4===0&&(_i(e,t),Ci(e,t))}requestAnimationFrame(i)};requestAnimationFrame(i)}async function Ia(){hi().catch(()=>{});const t=Ws(),n=new URLSearchParams(window.location.search).has("k"),i={...O,...Ji(window.location.search)};if(!n){i.seed=ki();const s=new URL(window.location.href);s.searchParams.set("k",i.seed),window.history.replaceState(null,"",s.toString())}ro(i);const o=H(i.scenario),r=new URLSearchParams(window.location.search);o.defaultReposition!==void 0&&(r.has("pa")||(i.repositionA=o.defaultReposition),r.has("pb")||(i.repositionB=o.defaultReposition)),i.overrides=Hn(o,i.overrides),co(i.mode),lo(i.mode),ma(i,t);const c={running:!0,ready:!1,permalink:i,paneA:null,paneB:null,traffic:new gi(Xn(i.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(ka(c,t),Ki(qn),qn(i),Mi(),await Z(c,t),c.ready=!0,Ea(c,t),c.permalink.mode==="quest"){const s=new URLSearchParams(window.location.search).has("qs");await Es({initialStageId:c.permalink.questStage,landOn:s?"stage":"grid",onStageChange:a=>{c.permalink.questStage=a,q(c.permalink)},onBackToGrid:()=>{c.permalink.questStage=O.questStage,q(c.permalink)}})}}Ia();export{Xe as _};
