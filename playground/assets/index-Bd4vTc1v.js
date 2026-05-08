const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./editor.main-DVSm_VMl.js","./editor-CiRpT3TV.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();function Z(e,t,n){const o=document.createElement(e);return o.className=t,n!==void 0&&(o.textContent=n),o}let en=0;function G(e,t){e.textContent=t,e.classList.add("show"),window.clearTimeout(en),en=window.setTimeout(()=>{e.classList.remove("show")},1600)}function tn(e,t){let i=0,r=0;const c=()=>{i&&window.clearTimeout(i),r&&window.clearInterval(r),i=0,r=0};e.addEventListener("pointerdown",a=>{e.disabled||(a.preventDefault(),t(),i=window.setTimeout(()=>{r=window.setInterval(()=>{if(e.disabled){c();return}t()},70)},380))}),e.addEventListener("pointerup",c),e.addEventListener("pointerleave",c),e.addEventListener("pointercancel",c),e.addEventListener("blur",c),e.addEventListener("click",a=>{a.pointerType||t()})}function Xo(){document.getElementById("seo-fallback")?.remove()}function Yo(e){document.title!==e.title&&(document.title=e.title),we('meta[name="description"]',"content",e.description),we('meta[property="og:title"]',"content",e.title),we('meta[property="og:description"]',"content",e.description),we('meta[name="twitter:title"]',"content",e.title),we('meta[name="twitter:description"]',"content",e.description)}function we(e,t,n){const o=document.querySelector(e);o&&o.getAttribute(t)!==n&&o.setAttribute(t,n)}function ee(e,t,n){const o=Gt(e,t),i=n[t];if(i===void 0||!Number.isFinite(i))return o;const r=e.tweakRanges[t];return to(i,r.min,r.max)}function Gt(e,t){const n=e.elevatorDefaults;switch(t){case"cars":return e.defaultCars;case"maxSpeed":return n.maxSpeed;case"weightCapacity":return n.weightCapacity;case"doorCycleSec":return eo(n.doorOpenTicks,n.doorTransitionTicks)}}function Ut(e,t,n){const o=Gt(e,t),i=e.tweakRanges[t].step/2;return Math.abs(n-o)>i}function Zn(e,t){const n={};for(const o of me){const i=t[o];i!==void 0&&Ut(e,o,i)&&(n[o]=i)}return n}const me=["cars","maxSpeed","weightCapacity","doorCycleSec"];function Ko(e,t){const{doorOpenTicks:n,doorTransitionTicks:o}=e.elevatorDefaults,i=eo(n,o),r=to(n/(i*Je),.1,.9),c=Math.max(2,Math.round(t*Je)),a=Math.max(1,Math.round(c*r)),s=Math.max(1,Math.round((c-a)/2));return{openTicks:a,transitionTicks:s}}function eo(e,t){return(e+2*t)/Je}function jt(e,t){const n=e.elevatorDefaults,o=ee(e,"maxSpeed",t),i=ee(e,"weightCapacity",t),r=ee(e,"doorCycleSec",t),{openTicks:c,transitionTicks:a}=Ko(e,r);return{...n,maxSpeed:o,weightCapacity:i,doorOpenTicks:c,doorTransitionTicks:a}}function Qo(e,t){if(e<1||t<1)return[];const n=[];for(let o=0;o<t;o+=1)n.push(Math.min(e-1,Math.floor(o*e/t)));return n}function Jo(e,t){const n=e.tweakRanges.cars;if(n.min===n.max)return e.ron;const o=Math.round(ee(e,"cars",t)),i=jt(e,t),r=Qo(e.stops.length,o),c=e.stops.map((s,l)=>`        StopConfig(id: StopId(${l}), name: ${Bt(s.name)}, position: ${z(s.positionM)}),`).join(`
`),a=r.map((s,l)=>ei(l,i,s,Zo(l,o))).join(`
`);return`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: ${Bt(e.buildingName)},
        stops: [
${c}
        ],
    ),
    elevators: [
${a}
    ],
    simulation: SimulationParams(ticks_per_second: ${z(Je)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${e.passengerMeanIntervalTicks},
        weight_range: (${z(e.passengerWeightRange[0])}, ${z(e.passengerWeightRange[1])}),
    ),
)`}const Je=60;function to(e,t,n){return Math.min(n,Math.max(t,e))}function Zo(e,t){return t>=3?`Car ${String.fromCharCode(65+e)}`:`Car ${e+1}`}function ei(e,t,n,o){const i=t.bypassLoadUpPct!==void 0?`
            bypass_load_up_pct: Some(${z(t.bypassLoadUpPct)}),`:"",r=t.bypassLoadDownPct!==void 0?`
            bypass_load_down_pct: Some(${z(t.bypassLoadDownPct)}),`:"";return`        ElevatorConfig(
            id: ${e}, name: ${Bt(o)},
            max_speed: ${z(t.maxSpeed)}, acceleration: ${z(t.acceleration)}, deceleration: ${z(t.deceleration)},
            weight_capacity: ${z(t.weightCapacity)},
            starting_stop: StopId(${n}),
            door_open_ticks: ${t.doorOpenTicks}, door_transition_ticks: ${t.doorTransitionTicks},${i}${r}
        ),`}function Bt(e){if(/[\\"\n]/.test(e))throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(e)}`);return`"${e}"`}function z(e){return Number.isInteger(e)?`${e}.0`:String(e)}const no={cars:{min:1,max:6,step:1},maxSpeed:{min:.5,max:12,step:.5},weightCapacity:{min:200,max:2500,step:100},doorCycleSec:{min:2,max:12,step:.5}};function Ne(e){return Array.from({length:e},()=>1)}const le=5,ti=[{name:"Keynote lets out",durationSec:45,ridersPerMin:110,originWeights:Array.from({length:le},(e,t)=>t===le-1?8:1),destWeights:[5,2,1,1,0]},{name:"Crowd thins out",durationSec:90,ridersPerMin:18,originWeights:Ne(le),destWeights:Ne(le)},{name:"Quiet between talks",durationSec:135,ridersPerMin:4,originWeights:Ne(le),destWeights:Ne(le)}],ni={id:"convention-burst",label:"Convention center",description:"Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",defaultStrategy:"etd",phases:ti,seedSpawns:120,featureHint:"A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",buildingName:"Convention Center",stops:[{name:"Lobby",positionM:0},{name:"Exhibit Hall",positionM:4},{name:"Mezzanine",positionM:8},{name:"Ballroom",positionM:12},{name:"Keynote Hall",positionM:16}],defaultCars:4,elevatorDefaults:{maxSpeed:3.5,acceleration:2,deceleration:2.5,weightCapacity:1500,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{...no,cars:{min:1,max:6,step:1}},passengerMeanIntervalTicks:30,passengerWeightRange:[55,100],ron:`SimConfig(
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
)`},Ze=19,Ft=16,Me=4,oo=(1+Ze)*Me,Te=1,Re=41,Ee=42,oi=43;function j(e){return Array.from({length:oi},(t,n)=>e(n))}const de=e=>e===Te||e===Re||e===Ee,ii=[{name:"Morning rush",durationSec:90,ridersPerMin:40,originWeights:j(e=>e===0?20:e===Te?2:e===Re?1.2:e===Ee?.2:.1),destWeights:j(e=>e===0?0:e===Te?.3:e===Re?.4:e===Ee?.7:e===21?2:e>=38&&e<=40?.6:1)},{name:"Midday meetings",durationSec:90,ridersPerMin:18,originWeights:j(e=>de(e)?.5:1),destWeights:j(e=>de(e)?.5:1)},{name:"Lunch crowd",durationSec:75,ridersPerMin:22,originWeights:j(e=>e===21?4:de(e)?.25:1),destWeights:j(e=>e===21?5:de(e)?.25:1)},{name:"Evening commute",durationSec:90,ridersPerMin:36,originWeights:j(e=>e===0||e===Te||e===21?.3:e===Re?.4:e===Ee?1.2:1),destWeights:j(e=>e===0?20:e===Te?1:e===Re?.6:e===Ee?.2:.1)},{name:"Late night",durationSec:60,ridersPerMin:6,originWeights:j(e=>de(e)?1.5:.2),destWeights:j(e=>de(e)?1.5:.2)}];function ri(){const e=[];e.push('        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),'),e.push('        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),');for(let a=1;a<=Ze;a++){const s=1+a,l=a*Me;e.push(`        StopConfig(id: StopId(${s.toString().padStart(2," ")}), name: "Floor ${a}",    position: ${l.toFixed(1)}),`)}e.push(`        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${oo.toFixed(1)}),`);for(let a=21;a<=20+Ft;a++){const s=1+a,l=a*Me;e.push(`        StopConfig(id: StopId(${s}), name: "Floor ${a}",   position: ${l.toFixed(1)}),`)}e.push('        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),'),e.push('        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),'),e.push('        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),'),e.push('        StopConfig(id: StopId(41), name: "B2",         position: -8.0),'),e.push('        StopConfig(id: StopId(42), name: "B3",         position: -12.0),');const t=[1,...Array.from({length:Ze},(a,s)=>2+s),21],n=[21,...Array.from({length:Ft},(a,s)=>22+s)],o=[1,21,38,39,40],i=[1,0,41,42],r=a=>a.map(s=>`StopId(${s})`).join(", "),c=(a,s,l,f)=>`                ElevatorConfig(
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
)`}const ai=[{name:"Lobby",positionM:0},{name:"B1",positionM:-4},...Array.from({length:Ze},(e,t)=>({name:`Floor ${t+1}`,positionM:(t+1)*Me})),{name:"Sky Lobby",positionM:oo},...Array.from({length:Ft},(e,t)=>({name:`Floor ${21+t}`,positionM:(21+t)*Me})),{name:"Floor 37",positionM:148},{name:"Floor 38",positionM:152},{name:"Penthouse",positionM:156},{name:"B2",positionM:-8},{name:"B3",positionM:-12}],si={id:"skyscraper-sky-lobby",label:"Skyscraper",description:"40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the lobby to three basement levels (B1 loading dock, B2 parking, B3 utility plant).",defaultStrategy:"etd",phases:ii,seedSpawns:0,abandonAfterSec:240,featureHint:"Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way down to B1 / B2 / B3.",buildingName:"Skyscraper",stops:ai,defaultCars:6,elevatorDefaults:{maxSpeed:4.5,acceleration:2,deceleration:2.5,weightCapacity:1800,doorOpenTicks:240,doorTransitionTicks:60,bypassLoadUpPct:.85,bypassLoadDownPct:.55},tweakRanges:{...no,cars:{min:6,max:6,step:1}},passengerMeanIntervalTicks:20,passengerWeightRange:[55,100],ron:ri()},nn=1e5,on=4e5,rn=35786e3,ci=1e8,li=4;function He(e){return Array.from({length:li},(t,n)=>e(n))}const di={id:"space-elevator",label:"Space elevator",description:"A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",defaultStrategy:"scan",defaultReposition:"spread",phases:[{name:"Outbound cargo",durationSec:480,ridersPerMin:6,originWeights:He(e=>e===0?6:1),destWeights:He(e=>e===0?0:e===1?2:e===2?3:4)},{name:"Inbound cargo",durationSec:360,ridersPerMin:5,originWeights:He(e=>e===0?0:e===1?1:e===2?3:5),destWeights:He(e=>e===0?6:1)}],seedSpawns:24,abandonAfterSec:1800,featureHint:"Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",buildingName:"Orbital Tether",stops:[{name:"Ground Station",positionM:0},{name:"Karman Line",positionM:nn},{name:"LEO Transfer",positionM:on},{name:"GEO Platform",positionM:rn}],defaultCars:3,elevatorDefaults:{maxSpeed:1e3,acceleration:10,deceleration:10,weightCapacity:1e4,doorOpenTicks:300,doorTransitionTicks:60},tweakRanges:{cars:{min:1,max:3,step:1},maxSpeed:{min:250,max:2e3,step:250},weightCapacity:{min:2e3,max:2e4,step:2e3},doorCycleSec:{min:4,max:12,step:1}},passengerMeanIntervalTicks:1200,passengerWeightRange:[60,90],tether:{counterweightAltitudeM:ci,showDayNight:!1},ron:`SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${nn.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${on.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${rn.toFixed(1)}),
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
)`},Pe=[si,di,ni];function N(e){const t=Pe.find(o=>o.id===e);if(t)return t;const n=Pe[0];if(n)return n;throw new Error(`unknown scenario "${e}" and empty registry`)}const io={cars:"ec",maxSpeed:"ms",weightCapacity:"wc",doorCycleSec:"dc"},$={mode:"compare",questStage:"first-floor",scenario:"skyscraper-sky-lobby",strategyA:"scan",strategyB:"rsr",repositionA:"lobby",repositionB:"adaptive",compare:!0,seed:"otis",intensity:1,speed:2,overrides:{}},pi=["scan","look","nearest","etd","destination","rsr"],ui=["adaptive","predictive","lobby","spread","none"];function an(e,t){return e!==null&&pi.includes(e)?e:t}function sn(e,t){return e!==null&&ui.includes(e)?e:t}const $t=new Set;function fi(e){return $t.add(e),()=>$t.delete(e)}function W(e){const t=ro(e);if(window.location.search!==t){window.history.replaceState(null,"",t);for(const n of $t)n(e)}}function hi(e,t){return e==="compare"||e==="quest"?e:t}function ro(e){const t=new URLSearchParams;e.mode!==$.mode&&t.set("m",e.mode),e.mode==="quest"&&e.questStage!==$.questStage&&t.set("qs",e.questStage),t.set("s",e.scenario),t.set("a",e.strategyA),t.set("b",e.strategyB);const n=N(e.scenario).defaultReposition,o=n??$.repositionA,i=n??$.repositionB;e.repositionA!==o&&t.set("pa",e.repositionA),e.repositionB!==i&&t.set("pb",e.repositionB),t.set("c",e.compare?"1":"0"),t.set("k",e.seed),t.set("i",String(e.intensity)),t.set("x",String(e.speed));for(const r of me){const c=e.overrides[r];c!==void 0&&Number.isFinite(c)&&t.set(io[r],mi(c))}return`?${t.toString()}`}function gi(e){const t=new URLSearchParams(e),n={};for(const o of me){const i=t.get(io[o]);if(i===null)continue;const r=Number(i);Number.isFinite(r)&&(n[o]=r)}return{mode:hi(t.get("m"),$.mode),questStage:(t.get("qs")??"").trim()||$.questStage,scenario:t.get("s")??$.scenario,strategyA:an(t.get("a")??t.get("d"),$.strategyA),strategyB:an(t.get("b"),$.strategyB),repositionA:sn(t.get("pa"),$.repositionA),repositionB:sn(t.get("pb"),$.repositionB),compare:t.has("c")?t.get("c")==="1":$.compare,seed:(t.get("k")??"").trim()||$.seed,intensity:cn(t.get("i"),$.intensity),speed:cn(t.get("x"),$.speed),overrides:n}}function cn(e,t){if(e===null)return t;const n=Number(e);return Number.isFinite(n)?n:t}function mi(e){return Number.isInteger(e)?String(e):Number(e.toFixed(2)).toString()}function ao(e){let t=2166136261;const n=e.trim();for(let o=0;o<n.length;o++)t^=n.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const bi=["scan","look","nearest","etd","destination","rsr"],ge={scan:"SCAN",look:"LOOK",nearest:"NEAREST",etd:"ETD",destination:"DCS",rsr:"RSR"},so={scan:"Sweep end-to-end, reverse at each end.",look:"Sweep until last call, then reverse.",nearest:"Assign each call to the closest car.",etd:"Assign by estimated time-to-destination.",destination:"Riders enter destination at the lobby; the group optimises.",rsr:"ETD penalised by queue length."},yi=["adaptive","predictive","lobby","spread","none"],Le={adaptive:"Adaptive",predictive:"Predictive",lobby:"Lobby",spread:"Spread",none:"Stay"},co={adaptive:"Switch by traffic mode; the default.",predictive:"Park near the most-active floor.",lobby:"Return idle cars to the lobby.",spread:"Fan idle cars across the shaft.",none:"Idle cars stay where they finished."},Si="scenario-card inline-flex items-center gap-1.5 px-2 py-1 border-b-2 border-b-transparent text-content-tertiary text-[12px] font-medium cursor-pointer transition-colors duration-fast select-none whitespace-nowrap hover:text-content aria-pressed:text-content aria-pressed:border-b-accent max-md:flex-none max-md:snap-start",vi="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke rounded-sm tabular-nums";function wi(e){const t=document.createDocumentFragment();Pe.forEach((n,o)=>{const i=Z("button",Si);i.type="button",i.dataset.scenarioId=n.id,i.setAttribute("aria-pressed","false"),i.title=n.description,i.append(Z("span","",n.label),Z("span",vi,String(o+1))),t.appendChild(i)}),e.scenarioCards.replaceChildren(t)}function lo(e,t){for(const n of e.scenarioCards.children){const o=n;o.setAttribute("aria-pressed",o.dataset.scenarioId===t?"true":"false")}}async function po(e,t,n,o,i){const r=N(n),c=e.permalink.compare?e.permalink.strategyA:r.defaultStrategy,a=r.defaultReposition!==void 0&&!e.permalink.compare?r.defaultReposition:e.permalink.repositionA;e.permalink={...e.permalink,scenario:r.id,strategyA:c,repositionA:a,overrides:{}},W(e.permalink),i.renderPaneStrategyInfo(t.paneA,c),i.renderPaneRepositionInfo(t.paneA,a),i.refreshStrategyPopovers(),lo(t,r.id),await o(),i.renderTweakPanel(),G(t.toast,`${r.label} · ${ge[c]}`)}function ki(e){const t=N(e.scenario);e.scenario=t.id}const _i=["layout","scenario-picker","controls-bar","cabin-legend"],Ci=["quest-pane"];function Ti(e){const t=e==="quest";for(const n of _i){const o=document.getElementById(n);o&&o.classList.toggle("hidden",t)}for(const n of Ci){const o=document.getElementById(n);o&&(o.classList.toggle("hidden",!t),o.classList.toggle("flex",t))}}function Ri(e){const t=document.getElementById("mode-toggle");if(!t)return;const n=t.querySelectorAll("button[data-mode]");for(const o of n){const i=o.dataset.mode===e;o.dataset.active=String(i),o.setAttribute("aria-pressed",String(i))}t.addEventListener("click",o=>{const i=o.target;if(!(i instanceof HTMLElement))return;const r=i.closest("button[data-mode]");if(!r)return;const c=r.dataset.mode;if(c!=="compare"&&c!=="quest"||c===e)return;const a=new URL(window.location.href);c==="compare"?(a.searchParams.delete("m"),a.searchParams.delete("qs")):a.searchParams.set("m",c),window.location.assign(a.toString())})}const Ei="modulepreload",Ii=function(e,t){return new URL(e,t).href},ln={},et=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let c=function(f){return Promise.all(f.map(u=>Promise.resolve(u).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const a=document.getElementsByTagName("link"),s=document.querySelector("meta[property=csp-nonce]"),l=s?.nonce||s?.getAttribute("nonce");i=c(n.map(f=>{if(f=Ii(f,o),f in ln)return;ln[f]=!0;const u=f.endsWith(".css"),d=u?'[rel="stylesheet"]':"";if(!!o)for(let g=a.length-1;g>=0;g--){const m=a[g];if(m.href===f&&(!u||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${d}`))return;const h=document.createElement("link");if(h.rel=u?"stylesheet":Ei,u||(h.as="script"),h.crossOrigin="",h.href=f,l&&h.setAttribute("nonce",l),document.head.appendChild(h),u)return new Promise((g,m)=>{h.addEventListener("load",g),h.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${f}`)))})}))}function r(c){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=c,window.dispatchEvent(a),!a.defaultPrevented)throw c}return i.then(c=>{for(const a of c||[])a.status==="rejected"&&r(a.reason);return t().catch(r)})};class uo extends Error{location;constructor(t,n){super(t),this.name="ControllerError",this.location=n}}async function Ai(e){const t=(await et(async()=>{const{default:i}=await import("./worker-DE_xV-Fq.js");return{default:i}},[],import.meta.url)).default,n=new t,o=new xi(n);return await o.init(e),o}class xi{#e;#t=new Map;#n=1;#i=!1;constructor(t){this.#e=t,this.#e.addEventListener("message",this.#c),this.#e.addEventListener("error",this.#o),this.#e.addEventListener("messageerror",this.#o)}async init(t){await this.#s({kind:"init",id:this.#a(),payload:this.#d(t)})}async tick(t,n){const o=n?.wantVisuals??!1;return this.#s({kind:"tick",id:this.#a(),ticks:t,...o?{wantVisuals:!0}:{}})}async spawnRider(t,n,o,i){return this.#s({kind:"spawn-rider",id:this.#a(),origin:t,destination:n,weight:o,...i!==void 0?{patienceTicks:i}:{}})}async setStrategy(t){await this.#s({kind:"set-strategy",id:this.#a(),strategy:t})}async loadController(t,n){const o=n?.unlockedApi??null,i=n?.timeoutMs,r=this.#s({kind:"load-controller",id:this.#a(),source:t,unlockedApi:o});if(i===void 0){await r;return}r.catch(()=>{});let c;const a=new Promise((s,l)=>{c=setTimeout(()=>{l(new Error(`controller did not return within ${i}ms`))},i)});try{await Promise.race([r,a])}finally{c!==void 0&&clearTimeout(c)}}async reset(t){await this.#s({kind:"reset",id:this.#a(),payload:this.#d(t)})}dispose(){this.#i||(this.#i=!0,this.#e.removeEventListener("message",this.#c),this.#e.removeEventListener("error",this.#o),this.#e.removeEventListener("messageerror",this.#o),this.#e.terminate(),this.#r(new Error("WorkerSim disposed")))}#r(t){for(const n of this.#t.values())n.reject(t);this.#t.clear()}#a(){return this.#n++}#d(t){const n=new URL("pkg/elevator_wasm.js",document.baseURI).href,o=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;return{configRon:t.configRon,strategy:t.strategy,wasmJsUrl:n,wasmBgUrl:o,...t.reposition!==void 0?{reposition:t.reposition}:{}}}async#s(t){if(this.#i)throw new Error("WorkerSim disposed");return new Promise((n,o)=>{this.#t.set(t.id,{resolve:n,reject:o}),this.#e.postMessage(t)})}#o=t=>{const n=t.message,o=typeof n=="string"&&n.length>0?n:"worker errored before responding";this.#i=!0,this.#e.terminate(),this.#r(new Error(o))};#c=t=>{const n=t.data,o=this.#t.get(n.id);if(o)switch(this.#t.delete(n.id),n.kind){case"ok":o.resolve(void 0);return;case"tick-result":o.resolve(n.result);return;case"spawn-result":n.error!==null?o.reject(new Error(n.error)):o.resolve(n.riderId);return;case"error":{const i=n.line!==void 0&&n.column!==void 0?{line:n.line,column:n.column}:null;o.reject(i!==null?new uo(n.message,i):new Error(n.message));return}default:{const i=n.kind;o.reject(new Error(`WorkerSim: unknown reply kind "${String(i)}"`));return}}}}const Mi=`// Quest curriculum — sim global declaration.
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
`,dn="quest-runtime";let yt=null,pe=null;async function Pi(){return yt||pe||(pe=(async()=>{await Li();const e=await et(()=>import("./editor.main-DVSm_VMl.js").then(t=>t.b),__vite__mapDeps([0,1]),import.meta.url);return yt=e,e})(),pe.catch(()=>{pe=null}),pe)}async function Li(){const[{default:e},{default:t}]=await Promise.all([et(()=>import("./ts.worker-CiBnZy-4.js"),[],import.meta.url),et(()=>import("./editor.worker-i95mtpAT.js"),[],import.meta.url)]);globalThis.MonacoEnvironment={getWorker(n,o){return o==="typescript"||o==="javascript"?new e:new t}}}function Bi(e){const n=e.languages.typescript?.typescriptDefaults;n&&(n.setCompilerOptions({target:7,module:99,lib:["esnext"],allowJs:!0,checkJs:!1,noImplicitAny:!1,strict:!1,noUnusedLocals:!1,noUnusedParameters:!1,noImplicitReturns:!1,allowNonTsExtensions:!0}),n.addExtraLib(Mi,"ts:filename/quest-sim-globals.d.ts"))}function Fi(e){e.editor.defineTheme("quest-warm-dark",{base:"vs-dark",inherit:!0,rules:[],colors:{"editor.background":"#0f0f12","editor.foreground":"#fafafa","editorLineNumber.foreground":"#6b6b75","editorLineNumber.activeForeground":"#a1a1aa","editor.lineHighlightBackground":"#1a1a1f","editor.lineHighlightBorder":"#1a1a1f00","editor.selectionBackground":"#323240","editor.inactiveSelectionBackground":"#252530","editor.selectionHighlightBackground":"#2a2a35","editorCursor.foreground":"#f59e0b","editorWhitespace.foreground":"#3a3a45","editorIndentGuide.background1":"#2a2a35","editorIndentGuide.activeBackground1":"#3a3a45","editor.findMatchBackground":"#fbbf2440","editor.findMatchHighlightBackground":"#fbbf2420","editorBracketMatch.background":"#3a3a4580","editorBracketMatch.border":"#f59e0b80","editorOverviewRuler.border":"#2a2a35","scrollbar.shadow":"#00000000","scrollbarSlider.background":"#3a3a4540","scrollbarSlider.hoverBackground":"#3a3a4580","scrollbarSlider.activeBackground":"#3a3a45c0","editorWidget.background":"#1a1a1f","editorWidget.border":"#3a3a45","editorSuggestWidget.background":"#1a1a1f","editorSuggestWidget.border":"#3a3a45","editorSuggestWidget.foreground":"#fafafa","editorSuggestWidget.selectedBackground":"#323240","editorSuggestWidget.highlightForeground":"#f59e0b","editorSuggestWidget.focusHighlightForeground":"#fbbf24","editorHoverWidget.background":"#1a1a1f","editorHoverWidget.border":"#3a3a45"}})}async function $i(e){const t=await Pi();Bi(t),Fi(t);const n=t.editor.create(e.container,{value:e.initialValue,language:e.language??"typescript",theme:"quest-warm-dark",readOnly:e.readOnly??!1,automaticLayout:!0,minimap:{enabled:!1},fontSize:13,scrollBeyondLastLine:!1,tabSize:2});return{getValue:()=>n.getValue(),setValue:o=>{n.setValue(o)},onDidChange(o){const i=n.onDidChangeModelContent(()=>{o()});return{dispose:()=>{i.dispose()}}},insertAtCursor(o){const r=n.getSelection()??{startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1};n.executeEdits("quest-snippet",[{range:r,text:o,forceMoveMarkers:!0}]),n.focus()},setRuntimeMarker(o){const i=n.getModel();if(!i)return;const r=o.message.split(`
`)[0]??o.message;t.editor.setModelMarkers(i,dn,[{severity:8,message:r,startLineNumber:o.line,startColumn:o.column,endLineNumber:o.line,endColumn:o.column+1}]),n.revealLineInCenterIfOutsideViewport(o.line)},clearRuntimeMarker(){const o=n.getModel();o&&t.editor.setModelMarkers(o,dn,[])},dispose:()=>{n.getModel()?.dispose(),n.dispose()}}}const Di=`SimConfig(
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
)`,Oi={id:"first-floor",title:"First Floor",brief:"Five riders at the lobby. Pick destinations and dispatch the car.",section:"basics",configRon:Di,unlockedApi:["pushDestination"],seedRiders:[{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:1,weight:75},{origin:0,destination:2,weight:75},{origin:0,destination:2,weight:75}],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=5&&t===0,starFns:[({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<600,({delivered:e,abandoned:t,endTick:n})=>e>=5&&t===0&&n<400],starterCode:`// Stage 1 — First Floor
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
`},qi=`SimConfig(
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
)`,Wi={id:"listen-up",title:"Listen for Calls",brief:"Riders are pressing hall buttons. Read the calls and dispatch the car.",section:"basics",configRon:qi,unlockedApi:["pushDestination","hallCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:4,atTick:0},{origin:1,destination:0,atTick:60},{origin:0,destination:3,atTick:120},{origin:2,destination:0,atTick:180},{origin:0,destination:4,atTick:240},{origin:3,destination:1,atTick:300},{origin:0,destination:2,atTick:360},{origin:4,destination:0,atTick:420},{origin:0,destination:3,atTick:480},{origin:2,destination:4,atTick:540},{origin:0,destination:1,atTick:600}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=10&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<22],starterCode:`// Stage 2 — Listen for Calls
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
`},Ni=`SimConfig(
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
)`,Hi={id:"car-buttons",title:"Car Buttons",brief:"Riders board and press destination floors. Read the buttons and serve them.",section:"basics",configRon:Ni,unlockedApi:["pushDestination","hallCalls","carCalls","drainEvents"],seedRiders:[{origin:0,destination:2,atTick:0},{origin:0,destination:3,atTick:0},{origin:0,destination:4,atTick:30},{origin:0,destination:1,atTick:60},{origin:0,destination:3,atTick:90},{origin:1,destination:4,atTick:120},{origin:0,destination:2,atTick:150},{origin:0,destination:4,atTick:200},{origin:2,destination:0,atTick:250},{origin:0,destination:3,atTick:300},{origin:0,destination:1,atTick:350},{origin:3,destination:0,atTick:400},{origin:0,destination:4,atTick:450},{origin:0,destination:2,atTick:500},{origin:4,destination:1,atTick:550},{origin:0,destination:3,atTick:600},{origin:0,destination:4,atTick:650},{origin:0,destination:2,atTick:700}],baseline:"nearest",passFn:({delivered:e,abandoned:t})=>e>=15&&t===0,starFns:[({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<50,({delivered:e,abandoned:t,metrics:n})=>e>=15&&t===0&&n.max_wait_s<30],starterCode:`// Stage 3 — Car Buttons
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
`},Gi=`SimConfig(
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
)`,Ui={id:"builtin",title:"Stand on Shoulders",brief:"Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",section:"basics",configRon:Gi,unlockedApi:["setStrategy"],seedRiders:[{origin:0,destination:4,atTick:0},{origin:0,destination:5,atTick:0},{origin:0,destination:7,atTick:30},{origin:0,destination:3,atTick:60},{origin:0,destination:6,atTick:90},{origin:0,destination:2,atTick:120},{origin:0,destination:5,atTick:150},{origin:1,destination:4,atTick:180},{origin:0,destination:7,atTick:210},{origin:0,destination:3,atTick:240},{origin:2,destination:6,atTick:270},{origin:0,destination:5,atTick:300},{origin:5,destination:0,atTick:360},{origin:7,destination:0,atTick:390},{origin:4,destination:0,atTick:420},{origin:6,destination:0,atTick:450},{origin:3,destination:0,atTick:480},{origin:5,destination:1,atTick:510},{origin:7,destination:2,atTick:540},{origin:4,destination:0,atTick:570},{origin:6,destination:0,atTick:600},{origin:3,destination:0,atTick:630},{origin:5,destination:0,atTick:660},{origin:0,destination:4,atTick:690},{origin:0,destination:6,atTick:720},{origin:1,destination:7,atTick:750},{origin:2,destination:5,atTick:780},{origin:0,destination:3,atTick:810},{origin:0,destination:7,atTick:840},{origin:0,destination:5,atTick:870}],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<25,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:`// Stage 4 — Stand on Shoulders
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
`};function F(e,t){const n=t.startTick??0,o=t.intervalTicks??30,i=t.destinations;if(i.length===0)throw new Error("arrivals: destinations must be non-empty");return Array.from({length:e},(r,c)=>{const a=i[c%i.length];return{origin:t.origin,destination:a,atTick:n+c*o,...t.weight!==void 0?{weight:t.weight}:{},...t.patienceTicks!==void 0?{patienceTicks:t.patienceTicks}:{}}})}const ji=`SimConfig(
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
)`,zi={id:"choose",title:"Choose Wisely",brief:"Asymmetric morning rush. Pick the strategy that handles up-peak best.",section:"strategies",configRon:ji,unlockedApi:["setStrategy"],seedRiders:[...F(36,{origin:0,destinations:[3,5,7,9,4,6,8,2,5,7,3,9],intervalTicks:20})],baseline:"nearest",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<16],starterCode:`// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,hints:["Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.","RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.","3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here."],failHint:({delivered:e})=>`Delivered ${e} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,referenceSolution:`// Canonical stage-5 solution.
// Up-peak (most riders boarding at the lobby, all heading up) is
// exactly the case ETD was designed for — it minimises estimated
// time-to-destination across the assignment.

sim.setStrategy("etd");
`},Vi=`SimConfig(
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
)`,Xi=`// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`,Yi={id:"rank-first",title:"Your First rank()",brief:"Implement dispatch as a function. Score each (car, stop) pair.",section:"strategies",configRon:Vi,unlockedApi:["setStrategyJs"],seedRiders:[...F(12,{origin:0,destinations:[2,4,5,3],intervalTicks:30}),...F(12,{origin:5,destinations:[0,1,2,3],startTick:240,intervalTicks:35})],baseline:"nearest",passFn:({delivered:e})=>e>=20,starFns:[({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=20&&t.avg_wait_s<22],starterCode:Xi,hints:["The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).","Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.","3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`."],failHint:({delivered:e})=>`Delivered ${e} of 20. Verify your \`rank()\` signature: \`(ctx) => number | null\` — returning \`undefined\` or a string drops the pair from assignment.`},Ki=`SimConfig(
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
)`,Qi={id:"beat-etd",title:"Beat ETD",brief:"Three cars, mixed traffic. The strongest built-in is your baseline.",section:"strategies",configRon:Ki,unlockedApi:["setStrategyJs"],seedRiders:[...F(36,{origin:0,destinations:[4,6,8,2,5,9,3,7,6,8,4,5],intervalTicks:18}),...F(12,{origin:9,destinations:[0,1,2,3],startTick:360,intervalTicks:30})],baseline:"etd",passFn:({delivered:e})=>e>=40,starFns:[({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=40&&t.avg_wait_s<20],starterCode:`// Stage 7 — Beat ETD
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
`,hints:["Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.","Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.","ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it."],failHint:({delivered:e})=>`Delivered ${e} of 40. Heavy traffic over three cars — distance alone isn't enough. Layer in a direction penalty so cars don't reverse mid-sweep.`},Ji=`SimConfig(
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
)`,Zi=`// Stage 8 — Event-Driven
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
`,er={id:"events",title:"Event-Driven",brief:"React to events. Use call age to break ties when distance is equal.",section:"strategies",configRon:Ji,unlockedApi:["setStrategyJs","drainEvents"],seedRiders:[...F(18,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...F(12,{origin:7,destinations:[0,1,2],startTick:360,intervalTicks:35})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<24,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<18],starterCode:Zi,hints:["`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.","The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.","3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer."],failHint:({delivered:e})=>`Delivered ${e} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`},tr=`SimConfig(
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
)`,nr=`// Stage 9 — Take the Wheel
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
`,or={id:"manual",title:"Take the Wheel",brief:"Switch a car to manual control. Drive it yourself.",section:"events-manual",configRon:tr,unlockedApi:["setStrategy","setServiceMode","setTargetVelocity"],seedRiders:[...F(10,{origin:0,destinations:[3,5,2,4],intervalTicks:70})],baseline:"self-autopilot",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=8&&t.avg_wait_s<22],starterCode:nr,hints:["Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.","Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",'3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.'],failHint:({delivered:e})=>`Delivered ${e} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`},ir=`SimConfig(
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
)`,rr=`// Stage 10 — Patient Boarding
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
`,ar={id:"hold-doors",title:"Patient Boarding",brief:"Tight door cycle. Hold the doors so slow riders make it in.",section:"events-manual",configRon:ir,unlockedApi:["setStrategy","drainEvents","holdDoor","cancelDoorHold"],seedRiders:[...F(12,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:60,patienceTicks:1200})],baseline:"none",passFn:({delivered:e,abandoned:t})=>e>=6&&t<=1,starFns:[({delivered:e,abandoned:t})=>e>=8&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=10&&t===0&&n.avg_wait_s<30],starterCode:rr,hints:["`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.","Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.","3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<6&&n.push(`delivered ${e} of 6`),t>1&&n.push(`${t} abandoned (max 1)`),`Run short — ${n.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`}},sr=`SimConfig(
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
)`,cr=`// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`,lr={id:"fire-alarm",title:"Fire Alarm",brief:"Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",section:"events-manual",configRon:sr,unlockedApi:["setStrategy","drainEvents","emergencyStop","setServiceMode"],seedRiders:[...F(12,{origin:0,destinations:[2,3,4,5,1],intervalTicks:40}),...F(10,{origin:0,destinations:[3,5,2,4],startTick:600,intervalTicks:50})],baseline:"scan",passFn:({delivered:e,abandoned:t})=>e>=12&&t<=2,starFns:[({delivered:e,abandoned:t})=>e>=15&&t<=1,({delivered:e,abandoned:t,metrics:n})=>e>=18&&t===0&&n.avg_wait_s<28],starterCode:cr,hints:["`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',"3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears."],failHint:({delivered:e,abandoned:t})=>{const n=[];return e<12&&n.push(`delivered ${e} of 12`),t>2&&n.push(`${t} abandoned (max 2)`),`Run short — ${n.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`}},dr=`SimConfig(
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
)`,pr=`// Stage 12 — Routes
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
`,ur={id:"routes",title:"Routes & Reroutes",brief:"Explicit per-rider routes. Read them; understand them.",section:"topology",configRon:dr,unlockedApi:["setStrategy","shortestRoute","reroute"],seedRiders:[...F(20,{origin:0,destinations:[3,5,7,4,6,2],intervalTicks:25}),...F(10,{origin:7,destinations:[0,1,2,3],startTick:360,intervalTicks:40})],baseline:"scan",passFn:({delivered:e})=>e>=25,starFns:[({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<22,({delivered:e,metrics:t})=>e>=25&&t.avg_wait_s<16],starterCode:pr,hints:["`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.","`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.","3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization."],failHint:({delivered:e})=>`Delivered ${e} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`},fr=`SimConfig(
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
)`,hr=`// Stage 13 — Transfer Points
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
`,gr={id:"transfers",title:"Transfer Points",brief:"Two lines that share a transfer floor. Keep both halves moving.",section:"topology",configRon:fr,unlockedApi:["setStrategy","transferPoints","reachableStopsFrom","shortestRoute"],seedRiders:[...F(8,{origin:0,destinations:[1,2,1,2],intervalTicks:40}),...F(10,{origin:0,destinations:[4,5,6,4,5],startTick:60,intervalTicks:50}),...F(4,{origin:5,destinations:[0,1],startTick:480,intervalTicks:60})],baseline:"scan",passFn:({delivered:e})=>e>=18,starFns:[({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<30,({delivered:e,metrics:t})=>e>=18&&t.avg_wait_s<22],starterCode:hr,hints:["`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.","`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.","3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it."],failHint:({delivered:e})=>`Delivered ${e} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`},mr=`SimConfig(
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
)`,br=`// Stage 14 — Build a Floor
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
`,yr={id:"build-floor",title:"Build a Floor",brief:"Add a stop mid-run. The new floor must join the line dispatch sees.",section:"topology",configRon:mr,unlockedApi:["setStrategy","addStop","addStopToLine"],seedRiders:[...F(14,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:75})],baseline:"none",passFn:({delivered:e})=>e>=8,starFns:[({delivered:e,abandoned:t})=>e>=10&&t===0,({delivered:e,abandoned:t,metrics:n})=>e>=12&&t===0&&n.avg_wait_s<25],starterCode:br,hints:["`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.","`sim.addStopToLine(stopRef, lineRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared. Note the arg order: stop first, then line.","3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out."],failHint:({delivered:e})=>`Delivered ${e} of 8. After construction completes, \`sim.addStop\` returns the new stop's ref — bind it with \`addStopToLine(newStop, lineRef)\` so dispatch starts serving it.`},Sr=`SimConfig(
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
)`,vr=`// Stage 15 — Sky Lobby
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
`,wr={id:"sky-lobby",title:"Sky Lobby",brief:"Three cars, two zones, one sky lobby. Split duty for sub-22s.",section:"topology",configRon:Sr,unlockedApi:["setStrategy","assignLineToGroup","reassignElevatorToLine"],seedRiders:[...F(20,{origin:0,destinations:[2,3,4,1,3,2],intervalTicks:25}),...F(16,{origin:0,destinations:[5,6,7,8,5,7],startTick:120,intervalTicks:35})],baseline:"etd",passFn:({delivered:e})=>e>=30,starFns:[({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<28,({delivered:e,metrics:t})=>e>=30&&t.avg_wait_s<22],starterCode:vr,hints:["`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.","`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.","3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands."],failHint:({delivered:e})=>`Delivered ${e} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`},ne=[Oi,Wi,Hi,Ui,zi,Yi,Qi,er,or,ar,lr,ur,gr,yr,wr];function kr(e){return ne.find(t=>t.id===e)}function _r(e){const t=ne.findIndex(n=>n.id===e);if(!(t<0))return ne[t+1]}function P(e,t){const n=document.getElementById(e);if(!n)throw new Error(`${t}: missing #${e}`);return n}function it(e){for(;e.firstChild;)e.removeChild(e.firstChild)}const tt="quest:code:v1:",fo="quest:bestStars:v1:",ho=5e4;function Be(){try{return globalThis.localStorage??null}catch{return null}}function pn(e){const t=Be();if(!t)return null;try{const n=t.getItem(tt+e);if(n===null)return null;if(n.length>ho){try{t.removeItem(tt+e)}catch{}return null}return n}catch{return null}}function un(e,t){if(t.length>ho)return;const n=Be();if(n)try{n.setItem(tt+e,t)}catch{}}function Cr(e){const t=Be();if(t)try{t.removeItem(tt+e)}catch{}}function Fe(e){const t=Be();if(!t)return 0;let n;try{n=t.getItem(fo+e)}catch{return 0}if(n===null)return 0;const o=Number.parseInt(n,10);return!Number.isInteger(o)||o<0||o>3?0:o}function Tr(e,t){const n=Fe(e);if(t<=n)return;const o=Be();if(o)try{o.setItem(fo+e,String(t))}catch{}}const Rr={basics:"Basics",strategies:"Strategies","events-manual":"Events & Manual Control",topology:"Topology"},Er=["basics","strategies","events-manual","topology"],go=3;function Ir(){return{root:P("quest-grid","quest-grid"),progress:P("quest-grid-progress","quest-grid"),sections:P("quest-grid-sections","quest-grid")}}function St(e,t){it(e.sections);let n=0;const o=ne.length*go;for(const i of Er){const r=ne.filter(l=>l.section===i);if(r.length===0)continue;const c=document.createElement("section");c.dataset.section=i;const a=document.createElement("h2");a.className="text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2",a.textContent=Rr[i],c.appendChild(a);const s=document.createElement("div");s.className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";for(const l of r){const f=Fe(l.id);n+=f,s.appendChild(Ar(l,f,t))}c.appendChild(s),e.sections.appendChild(c)}e.progress.textContent=`${n} / ${o}`}function Ar(e,t,n){const o=ne.findIndex(u=>u.id===e.id),i=String(o+1).padStart(2,"0"),r=document.createElement("button");r.type="button",r.dataset.stageId=e.id,r.className="group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";const c=document.createElement("div");c.className="flex items-baseline justify-between gap-2";const a=document.createElement("span");a.className="text-content-tertiary text-[10.5px] tabular-nums font-medium",a.textContent=i,c.appendChild(a);const s=document.createElement("span");s.className="text-[12px] tracking-[0.18em] tabular-nums leading-none",s.classList.add(t>0?"text-accent":"text-content-disabled"),s.setAttribute("aria-label",t===0?"no stars earned":`${t} of 3 stars earned`),s.textContent="★".repeat(t)+"☆".repeat(go-t),c.appendChild(s),r.appendChild(c);const l=document.createElement("div");l.className="text-content text-[13px] font-semibold tracking-[-0.01em]",l.textContent=e.title,r.appendChild(l);const f=document.createElement("div");return f.className="text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",f.textContent=e.brief,r.appendChild(f),r.addEventListener("click",()=>{n(e.id)}),r}const xr=75;async function fn(e,t,n,o){let i=n;for(;i<t.length;){const r=t[i];if(r===void 0||(r.atTick??0)>o)break;await e.spawnRider(r.origin,r.destination,r.weight??xr,r.patienceTicks),i+=1}return i}async function Mr(e,t,n={}){const o=n.maxTicks??1500,i=n.batchTicks??60,r=await Ai({configRon:e.configRon,strategy:"scan"});try{const c=[...e.seedRiders].sort((d,p)=>(d.atTick??0)-(p.atTick??0));let a=await fn(r,c,0,0);const s={unlockedApi:e.unlockedApi};n.timeoutMs!==void 0&&(s.timeoutMs=n.timeoutMs),await r.loadController(t,s);let l=null,f=0;const u=n.onSnapshot!==void 0;for(;f<o;){const d=o-f,p=Math.min(i,d),h=await r.tick(p,u?{wantVisuals:!0}:void 0);l=h.metrics,f=h.tick,a=await fn(r,c,a,f);const g=hn(l,f);if(n.onProgress)try{n.onProgress(g)}catch{}if(n.onSnapshot&&h.snapshot)try{n.onSnapshot(h.snapshot)}catch{}if(e.passFn(g))return gn(e,g,!0)}if(l===null)throw new Error("runStage: maxTicks must be positive");return gn(e,hn(l,f),!1)}finally{r.dispose()}}function hn(e,t){return{metrics:e,endTick:t,delivered:e.delivered,abandoned:e.abandoned}}function gn(e,t,n){if(!n)return{passed:!1,stars:0,grade:t};let o=1;return e.starFns[0]?.(t)&&(o=2,e.starFns[1]?.(t)&&(o=3)),{passed:!0,stars:o,grade:t}}function Pr(e){const t=`Tick ${e.endTick}`;if(e.delivered===0&&e.abandoned===0)return`${t} · waiting…`;const n=[t,`${e.delivered} delivered`];e.abandoned>0&&n.push(`${e.abandoned} abandoned`);const o=e.metrics.avg_wait_s;return e.delivered>0&&Number.isFinite(o)&&o>0&&n.push(`${o.toFixed(1)}s avg wait`),n.join(" · ")}const mo=[{name:"pushDestination",signature:"pushDestination(carRef, stopRef): void",description:"Append a stop to the back of the car's destination queue."},{name:"hallCalls",signature:"hallCalls(): { stop, direction }[]",description:"Pending hall calls — riders waiting at floors."},{name:"carCalls",signature:"carCalls(carRef): number[]",description:"Stop ids the riders inside the car have pressed."},{name:"drainEvents",signature:"drainEvents(): EventDto[]",description:"Take the events fired since the last drain (rider, elevator, door, …)."},{name:"setStrategy",signature:"setStrategy(name): boolean",description:"Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr)."},{name:"setStrategyJs",signature:"setStrategyJs(name, rank): boolean",description:"Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes."},{name:"setServiceMode",signature:"setServiceMode(carRef, mode): void",description:"Switch a car between normal / manual / out-of-service modes."},{name:"setTargetVelocity",signature:"setTargetVelocity(carRef, vMps): void",description:"Drive a manual-mode car directly. Positive is up, negative is down."},{name:"holdDoor",signature:"holdDoor(carRef, ticks): void",description:"Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it."},{name:"cancelDoorHold",signature:"cancelDoorHold(carRef): void",description:"Release a holdDoor; doors close on the next loading-complete tick."},{name:"emergencyStop",signature:"emergencyStop(carRef): void",description:"Halt a car immediately — no door cycle, no queue drain."},{name:"shortestRoute",signature:"shortestRoute(originStop, destStop): number[]",description:"Canonical route between two stops. First entry is origin, last is destination."},{name:"reroute",signature:"reroute(riderRef, newDestStop): void",description:"Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable."},{name:"transferPoints",signature:"transferPoints(): number[]",description:"Stops that bridge two lines — useful when ranking trips that may need a transfer."},{name:"reachableStopsFrom",signature:"reachableStopsFrom(stop): number[]",description:"Every stop reachable without changing lines."},{name:"addStop",signature:"addStop(lineRef, name, position): bigint",description:"Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick."},{name:"addStopToLine",signature:"addStopToLine(stopRef, lineRef): void",description:"Register a stop on a line so dispatch routes to it."},{name:"assignLineToGroup",signature:"assignLineToGroup(lineRef, groupId): number",description:"Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id."},{name:"reassignElevatorToLine",signature:"reassignElevatorToLine(carRef, lineRef): void",description:"Move a car to a different line. Useful for duty-banding when one zone is busier."}];new Map(mo.map(e=>[e.name,e]));function bo(e){const t=new Set(e);return mo.filter(n=>t.has(n.name))}function Lr(){return{root:P("quest-api-panel","api-panel")}}function mn(e,t){it(e.root);const n=bo(t.unlockedApi);if(n.length===0){const r=document.createElement("p");r.className="text-content-tertiary text-[11px] m-0",r.textContent="No methods unlocked at this stage.",e.root.appendChild(r);return}const o=document.createElement("p");o.className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium",o.textContent=`Unlocked at this stage (${n.length})`,e.root.appendChild(o);const i=document.createElement("ul");i.className="m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";for(const r of n){const c=document.createElement("li");c.className="px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";const a=document.createElement("code");a.className="block font-mono text-[12px] text-content",a.textContent=r.signature,c.appendChild(a);const s=document.createElement("p");s.className="m-0 mt-0.5 text-[11.5px] text-content-secondary",s.textContent=r.description,c.appendChild(s),i.appendChild(c)}e.root.appendChild(i)}function Br(){return{root:P("quest-hints","hints-drawer"),count:P("quest-hints-count","hints-drawer"),list:P("quest-hints-list","hints-drawer")}}const bn="quest-hints-more";function yn(e,t){it(e.list);for(const o of e.root.querySelectorAll(`.${bn}`))o.remove();const n=t.hints.length;if(n===0){e.count.textContent="(none for this stage)",e.root.removeAttribute("open");return}if(e.count.textContent=`(${n})`,t.hints.forEach((o,i)=>{const r=document.createElement("li");r.className="text-content-secondary leading-snug marker:text-content-tertiary",r.textContent=o,i>0&&(r.hidden=!0),e.list.appendChild(r)}),n>1){const o=document.createElement("button");o.type="button",o.className=`${bn} mt-1.5 ml-5 text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`,o.textContent=`Show ${n-1} more`,o.addEventListener("click",()=>{for(const i of e.list.querySelectorAll("li[hidden]"))i.hidden=!1;o.remove()}),e.root.appendChild(o)}e.root.removeAttribute("open")}function Fr(e,t){return{activeStage:e,currentView:t,runLoop:{active:!1}}}function $r(e,t){e.activeStage=t}function vt(e,t){e.currentView=t}function Sn(e){e.runLoop.active=!1}function ke(e,t){return e.currentView==="stage"&&e.activeStage.id===t.id}function Dr(){return{root:P("quest-reference","reference-panel"),status:P("quest-reference-status","reference-panel"),code:P("quest-reference-code","reference-panel")}}function wt(e,t,n={}){const o=t.referenceSolution,i=Fe(t.id);if(!o||i===0){e.root.hidden=!0,e.root.removeAttribute("open");return}e.root.hidden=!1,e.status.textContent=i===3?"(mastered)":"(unlocked)",e.code.textContent=o,n.collapse!==!1&&e.root.removeAttribute("open")}function Or(){const e="results-modal";return{root:P("quest-results-modal",e),title:P("quest-results-title",e),stars:P("quest-results-stars",e),detail:P("quest-results-detail",e),close:P("quest-results-close",e),retry:P("quest-results-retry",e),next:P("quest-results-next",e)}}function qr(e,t,n,o,i){t.passed?(e.title.textContent=t.stars===3?"Mastered!":"Passed",e.stars.textContent="★".repeat(t.stars)+"☆".repeat(3-t.stars)):(e.title.textContent="Did not pass",e.stars.textContent=""),e.detail.textContent=Wr(t.grade,t.passed,o),e.retry.onclick=()=>{kt(e),n()},e.close.onclick=()=>{kt(e)};const r=i;r?(e.next.hidden=!1,e.next.onclick=()=>{kt(e),r()},e.retry.dataset.demoted="true"):(e.next.hidden=!0,e.next.onclick=null,delete e.retry.dataset.demoted),e.root.classList.add("show"),r?e.next.focus():e.close.focus()}function kt(e){e.root.classList.remove("show")}function Wr(e,t,n){const o=`tick ${e.endTick}`,i=`${e.delivered} delivered, ${e.abandoned} abandoned`;if(t)return`${i} · finished by ${o}.`;if(n)try{const r=n(e);if(r)return`${i}. ${r}`}catch{}return`${i}. The pass condition wasn't met within the run budget.`}const Nr={pushDestination:"sim.pushDestination(0n, 2n);",hallCalls:"const calls = sim.hallCalls();",carCalls:"const inside = sim.carCalls(0n);",drainEvents:"const events = sim.drainEvents();",setStrategy:'sim.setStrategy("etd");',setStrategyJs:`sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,setServiceMode:'sim.setServiceMode(0n, "manual");',setTargetVelocity:"sim.setTargetVelocity(0n, 2.0);",holdDoor:"sim.holdDoor(0n, 60);",cancelDoorHold:"sim.cancelDoorHold(0n);",emergencyStop:"sim.emergencyStop(0n);",shortestRoute:"const route = sim.shortestRoute(0n, 4n);",reroute:"sim.reroute(/* riderRef */, /* newDestStop */ 4n);",transferPoints:"const transfers = sim.transferPoints();",reachableStopsFrom:"const reachable = sim.reachableStopsFrom(0n);",addStop:'const newStop = sim.addStop(/* lineRef */, "F6", 20.0);',addStopToLine:"sim.addStopToLine(/* stopRef */, /* lineRef */);",assignLineToGroup:"sim.assignLineToGroup(/* lineRef */, /* groupId */ 1);",reassignElevatorToLine:"sim.reassignElevatorToLine(0n, /* lineRef */);"};function vn(e){return Nr[e]??`sim.${e}();`}function Hr(){return{root:P("quest-snippets","snippet-picker")}}function wn(e,t,n){it(e.root);const o=bo(t.unlockedApi);if(o.length!==0)for(const i of o){const r=document.createElement("button");r.type="button",r.className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke",r.textContent=i.name,r.title=`Insert: ${vn(i.name)}`,r.addEventListener("click",()=>{n.insertAtCursor(vn(i.name))}),e.root.appendChild(r)}}const zt={idle:"#6b6b75",moving:"#f59e0b",repositioning:"#a78bfa","door-opening":"#fbbf24",loading:"#7dd3fc","door-closing":"#fbbf24",stopped:"#8b8c92",unknown:"#6b6b75"},Gr="#2a2a35",Ur="#a1a1aa",V='"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',jr=["rgba(8, 10, 14, 0.55)","rgba(8, 10, 14, 0.55)","rgba(58, 34, 4, 0.55)","rgba(6, 30, 42, 0.55)"],zr=["#3a3a45","#3a3a45","#8a5a1a","#2d5f70"],Vr="rgba(8, 10, 14, 0.55)",Xr="#3a3a45",Yr=[1,1,.5,.42],Kr=["LOW","HIGH","VIP","SERVICE"],Qr="#e6c56b",Jr="#9bd4c4",Zr=["#a1a1aa","#a1a1aa","#d8a24a","#7cbdd8"],ea="#a1a1aa",ta="#4a4a55",na="#f59e0b",yo="#7dd3fc",So="#fda4af",_t="#fafafa",vo="#8b8c92",wo="rgba(250, 250, 250, 0.95)",oa=260,kn=3,ia=.05,_n=["standard","briefcase","bag","short","tall"];function fe(e,t){let n=(e^2654435769)>>>0;return n=Math.imul(n^t,2246822507)>>>0,n=(n^n>>>13)>>>0,n=Math.imul(n,3266489909)>>>0,_n[n%_n.length]??"standard"}function ra(e,t){switch(e){case"short":{const n=t*.82;return{headR:n,shoulderW:n*2.3,waistW:n*1.6,footW:n*1.9,bodyH:n*5.2,neckGap:n*.2}}case"tall":return{headR:t*1.05,shoulderW:t*2.2,waistW:t*1.5,footW:t*1.9,bodyH:t*7.5,neckGap:t*.2};case"standard":case"briefcase":case"bag":default:return{headR:t,shoulderW:t*2.5,waistW:t*1.7,footW:t*2,bodyH:t*6,neckGap:t*.2}}}function ko(e,t,n,o,i,r="standard"){const c=ra(r,o),s=n-.5,l=s-c.bodyH,f=l-c.neckGap-c.headR,u=c.bodyH*.08,d=s-c.headR*.8;if(e.fillStyle=i,e.beginPath(),e.moveTo(t-c.shoulderW/2,l+u),e.lineTo(t-c.shoulderW/2+u,l),e.lineTo(t+c.shoulderW/2-u,l),e.lineTo(t+c.shoulderW/2,l+u),e.lineTo(t+c.waistW/2,d),e.lineTo(t+c.footW/2,s),e.lineTo(t-c.footW/2,s),e.lineTo(t-c.waistW/2,d),e.closePath(),e.fill(),e.beginPath(),e.arc(t,f,c.headR,0,Math.PI*2),e.fill(),r==="briefcase"){const p=Math.max(1.6,c.headR*.9),h=t+c.waistW/2+p*.1,g=s-p-.5;e.fillRect(h,g,p,p);const m=p*.55;e.fillRect(h+(p-m)/2,g-1,m,1)}else if(r==="bag"){const p=Math.max(1.3,c.headR*.9),h=t-c.shoulderW/2-p*.35,g=l+c.bodyH*.35;e.beginPath(),e.arc(h,g,p,0,Math.PI*2),e.fill(),e.strokeStyle=i,e.lineWidth=.8,e.beginPath(),e.moveTo(h+p*.2,g-p*.8),e.lineTo(t+c.shoulderW/2-u,l+.5),e.stroke()}else if(r==="tall"){const p=c.headR*2.1,h=Math.max(1,c.headR*.45);e.fillRect(t-p/2,f-c.headR-h+.4,p,h)}}function aa(e,t,n,o,i,r,c,a,s){const f=Math.max(1,Math.floor((i-14)/a.figureStride)),u=Math.min(r,f),d=-2;for(let p=0;p<u;p++){const h=t+d+o*p*a.figureStride,g=p+0,m=fe(s,g);ko(e,h,n,a.figureHeadR,c,m)}if(r>u){e.fillStyle=vo,e.font=`${a.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textAlign="right",e.textBaseline="alphabetic";const p=t+d+o*u*a.figureStride;e.fillText(`+${r-u}`,p,n-1)}}function te(e,t,n,o,i,r){const c=Math.min(r,o/2,i/2);if(e.beginPath(),typeof e.roundRect=="function"){e.roundRect(t,n,o,i,c);return}e.moveTo(t+c,n),e.lineTo(t+o-c,n),e.quadraticCurveTo(t+o,n,t+o,n+c),e.lineTo(t+o,n+i-c),e.quadraticCurveTo(t+o,n+i,t+o-c,n+i),e.lineTo(t+c,n+i),e.quadraticCurveTo(t,n+i,t,n+i-c),e.lineTo(t,n+c),e.quadraticCurveTo(t,n,t+c,n),e.closePath()}function sa(e,t,n){if(e.measureText(t).width<=n)return t;const o="…";let i=0,r=t.length;for(;i<r;){const c=i+r+1>>1;e.measureText(t.slice(0,c)+o).width<=n?i=c:r=c-1}return i===0?o:t.slice(0,i)+o}function ca(e,t){for(const n of t){const o=n.width/2;e.fillStyle=n.fill,e.fillRect(n.cx-o,n.top,n.width,n.bottom-n.top)}e.lineWidth=1;for(const n of t){const o=n.width/2;e.strokeStyle=n.frame;const i=n.cx-o+.5,r=n.cx+o-.5;e.beginPath(),e.moveTo(i,n.top),e.lineTo(i,n.bottom),e.moveTo(r,n.top),e.lineTo(r,n.bottom),e.stroke()}}function la(e,t,n){if(t.length===0)return;e.font=`600 ${n.fontSmall.toFixed(0)}px ${V}`,e.textBaseline="alphabetic",e.textAlign="center";const o=n.padTop-n.fontSmall*.5-2,i=o-n.fontSmall*.5-1,r=o+n.fontSmall*.5+1,c=Math.max(n.fontSmall+.5,i);for(const a of t){const s=a.top-3,l=s>i&&s-n.fontSmall<r;e.fillStyle=a.color,e.fillText(a.text,a.cx,l?c:s)}}function da(e,t,n,o,i,r,c,a,s){e.font=`500 ${o.fontMain.toFixed(0)}px ${V}`,e.textBaseline="middle";const l=o.padX,f=o.padX+o.labelW,u=r-o.padX,d=o.shaftInnerW/2,p=Math.min(o.shaftInnerW*1.8,(u-f)/2);for(let h=0;h<t.length;h++){const g=t[h];if(g===void 0)continue;const m=n(g.y),T=t[h+1],C=T!==void 0?n(T.y):a;if(e.strokeStyle=Gr,e.lineWidth=s?2:1,e.beginPath(),s)for(const y of i)e.moveTo(y-p,m+.5),e.lineTo(y+p,m+.5);else{let y=f;for(const S of i){const w=S-d,b=S+d;w>y&&(e.moveTo(y,m+.5),e.lineTo(w,m+.5)),y=b}y<u&&(e.moveTo(y,m+.5),e.lineTo(u,m+.5))}e.stroke();for(let y=0;y<i.length;y++){const S=i[y];if(S===void 0)continue;const w=c.has(y,g.entity_id);e.strokeStyle=w?na:ta,e.lineWidth=w?1.4:1,e.beginPath(),e.moveTo(S-d-2,m+.5),e.lineTo(S-d,m+.5),e.moveTo(S+d,m+.5),e.lineTo(S+d+2,m+.5),e.stroke()}const E=s?m:(m+C)/2;e.fillStyle=Ur,e.textAlign="right",e.fillText(sa(e,g.name,o.labelW-4),l+o.labelW-4,E)}}function pa(e,t,n,o,i,r){for(const c of t.stops){if(c.waiting_by_line.length===0)continue;const a=r.get(c.entity_id);if(a===void 0||a.size===0)continue;const s=n(c.y),l=c.waiting_up>=c.waiting_down?yo:So;for(const f of c.waiting_by_line){if(f.count===0)continue;const u=a.get(f.line);if(u===void 0)continue;const d=i.get(u);if(d===void 0)continue;const p=d.end-d.start;p<=o.figureStride||aa(e,d.end-2,s,-1,p,f.count,l,o,c.entity_id)}}}function Dt(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,c=o&255,a=s=>t>=0?Math.round(s+(255-s)*t):Math.round(s*(1+t));return`rgb(${a(i)}, ${a(r)}, ${a(c)})`}function Vt(e,t){const n=e.match(/^#?([0-9a-f]{6})$/i);if(!n||n[1]===void 0)return e;const o=parseInt(n[1],16),i=o>>16&255,r=o>>8&255,c=o&255;return`rgba(${i}, ${r}, ${c}, ${t})`}function Ue(e,t){if(/^#[0-9a-f]{6}$/i.test(e)){const n=Math.round(Math.max(0,Math.min(1,t))*255);return`${e}${n.toString(16).padStart(2,"0")}`}return Vt(e,t)}function ua(e,t,n,o,i){const r=(e+n)/2,c=(t+o)/2,a=n-e,s=o-t,l=Math.max(Math.hypot(a,s),1),f=-s/l,u=a/l,d=Math.min(l*.25,22),p=r+f*d,h=c+u*d,g=1-i;return[g*g*e+2*g*i*p+i*i*n,g*g*t+2*g*i*h+i*i*o]}function _o(e){let r=e;for(let a=0;a<3;a++){const s=1-r,l=3*s*s*r*.2+3*s*r*r*.2+r*r*r,f=3*s*s*.2+6*s*r*(.2-.2)+3*r*r*(1-.2);if(f===0)break;r-=(l-e)/f,r=Math.max(0,Math.min(1,r))}const c=1-r;return 3*c*c*r*.6+3*c*r*r*1+r*r*r}function fa(e,t,n,o,i,r,c,a,s,l=!1){const f=o*.22,u=(i-4)/10.5,d=Math.max(1.2,Math.min(a.figureHeadR,f,u)),p=a.figureStride*(d/a.figureHeadR),h=3,g=2,m=o-h*2,C=Math.max(1,Math.floor((m-16)/p)),E=Math.min(r,C),y=E*p,S=t-y/2+p/2,w=n-g;for(let b=0;b<E;b++){const k=s?.[b]??fe(0,b);ko(e,S+b*p,w,d,c,k)}if(r>E){const b=`+${r-E}`,k=Math.max(8,a.fontSmall-1);e.font=`700 ${k.toFixed(1)}px ${V}`,e.textAlign="right",e.textBaseline="middle";const I=e.measureText(b).width,A=3,_=1.5,R=Math.ceil(I+A*2),x=Math.ceil(k+_*2),L=t+o/2-2,D=n-i+2,q=L-R;e.fillStyle="rgba(15, 15, 18, 0.85)",te(e,q,D,R,x,2),e.fill(),e.fillStyle="#fafafa",e.fillText(b,L-A,D+x/2)}if(l){const b=Math.max(10,Math.min(i*.7,o*.55));e.font=`800 ${b.toFixed(0)}px ${V}`,e.textAlign="center",e.textBaseline="middle";const k=n-i/2;e.fillStyle="rgba(15, 15, 18, 0.6)",e.fillText("F",t,k+1),e.fillStyle="rgba(239, 68, 68, 0.92)",e.fillText("F",t,k)}}function ha(e,t,n,o,i,r,c){const a=Math.max(2,r.figureHeadR*.9);for(const s of t.cars){if(s.target===void 0)continue;const l=c.get(s.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const u=n.get(s.id);if(u===void 0)continue;const d=i(f.y)-r.carH/2,p=i(s.y)-r.carH/2;Math.abs(p-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.5)",e.lineWidth=1,e.beginPath(),e.moveTo(u,p),e.lineTo(u,d),e.stroke(),e.fillStyle=wo,e.beginPath(),e.arc(u,d,a,0,Math.PI*2),e.fill())}}function ga(e,t,n,o,i,r){if(t.phase!=="moving"||Math.abs(t.v)<.1)return;const c=zt[t.phase]??"#6b6b75",a=o/2;for(let s=1;s<=kn;s++){const l=r(t.y-t.v*ia*s),f=.18*(1-(s-1)/kn);e.fillStyle=Vt(c,f),e.fillRect(n-a,l-i,o,i)}}function ma(e,t,n,o,i,r,c,a,s){const l=c(t.y),f=l-i,u=o/2,d=zt[t.phase]??"#6b6b75";e.fillStyle=d,e.fillRect(n-u,f,o,i),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.strokeRect(n-u+.5,f+.5,o-1,i-1),e.strokeStyle=Dt(d,.18),e.beginPath(),e.moveTo(n-u+1,f+1.5),e.lineTo(n+u-1,f+1.5),e.stroke();const p=t.capacity>0&&t.load>=t.capacity*.95;(t.riders>0||p)&&fa(e,n,l,o,i,t.riders,r,a,s,p)}const Cn=6,ba=3,Ct=4,he=3,ue=2.5,K=2,ya=12,Sa="rgba(37, 37, 48, 0.80)",va="#ECECEE",Tn=3,Rn=.3,wa=140,En=.85;function ka(e,t,n,o,i,r,c,a){const s=c.fontSmall+.5;e.font=`500 ${s}px ${V}`,e.textBaseline="middle",In(e,"-0.1px");const l=performance.now(),f=Ue(t,.45),u=Ue(t,.5),d=Ue(t,.75),p=[];for(const[g,m]of o){const T=n.get(g);if(T===void 0)continue;const C=i.get(g);if(C===void 0)continue;const E=r(T.y),y=E-c.carH,S=Math.max(1,m.expiresAt-m.bornAt),w=m.expiresAt-l,b=w>S*Rn?1:Math.max(0,w/(S*Rn)),k=Math.max(0,l-m.bornAt),I=Math.min(1,k/wa),A=b*I;if(A<=0)continue;const _=e.measureText(m.glyph).width,R=_+Tn+e.measureText(m.text).width+Cn*2,x=s+ba*2+2,L=y-K-ue-x,D=E+K+ue+x>a,q=L<2&&!D?"below":"above",be=q==="above"?y-K-ue-x:E+K+ue;let H=C-R/2;const ye=2,Se=a-R-2;H<ye&&(H=ye),H>Se&&(H=Se),p.push({bubble:m,glyphW:_,alpha:A,cx:C,carTop:y,carBottom:E,bubbleW:R,bubbleH:x,side:q,bx:H,by:be,entrance:I})}const h=(g,m)=>!(g.bx+g.bubbleW<=m.bx||m.bx+m.bubbleW<=g.bx||g.by+g.bubbleH<=m.by||m.by+m.bubbleH<=g.by);for(let g=1;g<p.length;g++){const m=p[g];if(m===void 0)continue;let T=!1;for(let w=0;w<g;w++){const b=p[w];if(b!==void 0&&h(m,b)){T=!0;break}}if(!T)continue;const C=m.side==="above"?"below":"above",E=C==="above"?m.carTop-K-ue-m.bubbleH:m.carBottom+K+ue,y={...m,side:C,by:E};let S=!0;for(let w=0;w<g;w++){const b=p[w];if(b!==void 0&&h(y,b)){S=!1;break}}S&&(p[g]=y)}for(const g of p){const{bubble:m,glyphW:T,alpha:C,cx:E,carTop:y,carBottom:S,bubbleW:w,bubbleH:b,side:k,bx:I,by:A,entrance:_}=g,R=k==="above"?y-K:S+K,x=Math.min(Math.max(E,I+Ct+he/2),I+w-Ct-he/2),L=_o(_),D=En+(1-En)*L;e.save(),e.globalAlpha=C,e.translate(x,R),e.scale(D,D),e.translate(-x,-R),_a(e,I,A,w,b,Ct,k,x,R),e.shadowColor=u,e.shadowBlur=ya,e.fillStyle=Sa,e.fill(),e.shadowBlur=0,e.shadowColor="transparent",e.strokeStyle=f,e.lineWidth=1,e.stroke();const q=A+b/2,be=I+Cn;e.textAlign="left",e.fillStyle=d,e.fillText(m.glyph,be,q),e.fillStyle=va,e.fillText(m.text,be+T+Tn,q),e.restore()}In(e,"0px")}function _a(e,t,n,o,i,r,c,a,s){const l=Math.min(r,o/2,i/2);e.beginPath(),e.moveTo(t+l,n),c==="below"&&(e.lineTo(a-he/2,n),e.lineTo(a,s),e.lineTo(a+he/2,n)),e.lineTo(t+o-l,n),e.arcTo(t+o,n,t+o,n+l,l),e.lineTo(t+o,n+i-l),e.arcTo(t+o,n+i,t+o-l,n+i,l),c==="above"&&(e.lineTo(a+he/2,n+i),e.lineTo(a,s),e.lineTo(a-he/2,n+i)),e.lineTo(t+l,n+i),e.arcTo(t,n+i,t,n+i-l,l),e.lineTo(t,n+l),e.arcTo(t,n,t+l,n,l),e.closePath()}function In(e,t){e.letterSpacing=t}function Ca(e){return e<12e3?"troposphere":e<5e4?"stratosphere":e<8e4?"mesosphere":e<7e5?"thermosphere":e>=354e5&&e<=362e5?"geostationary":"exosphere"}function Ta(e){const t=[];for(let n=3;n<=8;n++){const o=10**n;if(o>e)break;t.push({altitudeM:o,label:rt(o)})}return t}function rt(e){if(e<1e3)return`${Math.round(e)} m`;const t=e/1e3;return t<10?`${t.toFixed(1)} km`:t<1e3?`${t.toFixed(0)} km`:`${t.toLocaleString("en-US",{maximumFractionDigits:0})} km`}function Co(e){const t=Math.abs(e);return t<1?`${t.toFixed(2)} m/s`:t<100?`${t.toFixed(0)} m/s`:`${(t*3.6).toFixed(0)} km/h`}function Ra(e,t,n){const o=Math.abs(e);if(o<.5)return"idle";const i=o-Math.abs(t);return o>=n*.95&&Math.abs(i)<n*.005?"cruise":i>0?"accel":i<0?"decel":"cruise"}function Ea(e){if(!Number.isFinite(e)||e<=0)return"—";if(e<60)return`${Math.round(e)} s`;if(e<3600){const o=Math.floor(e/60),i=Math.round(e%60);return i===0?`${o}m`:`${o}m ${i}s`}const t=Math.floor(e/3600),n=Math.round(e%3600/60);return n===0?`${t}h`:`${t}h ${n}m`}function Ia(e,t,n,o,i,r){const c=Math.abs(t-e);if(c<.001)return 0;const a=Math.abs(n);if(a*a/(2*r)>=c)return a>0?a/r:0;const l=Math.max(0,(o-a)/i),f=a*l+.5*i*l*l,u=o/r,d=o*o/(2*r);if(f+d>=c){const h=(2*i*r*c+r*a*a)/(i+r),g=Math.sqrt(Math.max(h,a*a));return(g-a)/i+g/r}const p=c-f-d;return l+p/Math.max(o,.001)+u}const To={accel:"accel",cruise:"cruise",decel:"decel",idle:"idle"},nt={accel:"#7dd3fc",cruise:"#fbbf24",decel:"#fda4af",idle:"#6b6b75"};function Aa(e,t,n,o,i,r){const c=i/2,a=o-r/2,s=zt[t.phase]??"#6b6b75",l=e.createLinearGradient(n,a,n,a+r);l.addColorStop(0,Dt(s,.14)),l.addColorStop(1,Dt(s,-.18)),e.fillStyle=l,te(e,n-c,a,i,r,Math.min(3,r*.16)),e.fill(),e.strokeStyle="rgba(10, 12, 16, 0.9)",e.lineWidth=1,e.stroke(),e.fillStyle="rgba(245, 158, 11, 0.55)",e.fillRect(n-c+2,a+r*.36,i-4,Math.max(1.5,r*.1))}function xa(e,t,n,o,i){if(t.length===0)return;const r=7,c=4,a=i.fontSmall+2,s=n/2+8;e.font=`600 ${(i.fontSmall+.5).toFixed(1)}px ${V}`;const l=(d,p)=>{const h=[d.carName,rt(d.altitudeM),Co(d.velocity),`${To[d.phase]} · ${d.layer}`];let g=0;for(const y of h)g=Math.max(g,e.measureText(y).width);const m=g+r*2,T=h.length*a+c*2;let C=p==="right"?d.cx+s:d.cx-s-m;C=Math.max(2,Math.min(o-m-2,C));const E=d.cy-T/2;return{hud:d,lines:h,bx:C,by:E,bubbleW:m,bubbleH:T,side:p}},f=(d,p)=>!(d.bx+d.bubbleW<=p.bx||p.bx+p.bubbleW<=d.bx||d.by+d.bubbleH<=p.by||p.by+p.bubbleH<=d.by),u=[];t.forEach((d,p)=>{let h=l(d,p%2===0?"right":"left");if(u.some(g=>f(h,g))){const g=l(d,h.side==="right"?"left":"right");if(u.every(m=>!f(g,m)))h=g;else{const m=Math.max(...u.map(T=>T.by+T.bubbleH));h={...h,by:m+4}}}u.push(h)});for(const d of u){e.save(),e.fillStyle="rgba(37, 37, 48, 0.92)",te(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.fill(),e.fillStyle=nt[d.hud.phase],e.fillRect(d.bx,d.by,2,d.bubbleH),e.strokeStyle="#2a2a35",e.lineWidth=1,te(e,d.bx,d.by,d.bubbleW,d.bubbleH,4),e.stroke(),e.textBaseline="middle",e.textAlign="left";for(let p=0;p<d.lines.length;p++){const h=d.by+c+a*p+a/2,g=d.lines[p]??"";e.fillStyle=p===0||p===3?nt[d.hud.phase]:"rgba(240, 244, 252, 0.95)",e.fillText(g,d.bx+r,h)}e.restore()}}function Ma(e,t,n,o,i,r){if(t.length===0)return;const c=18,a=10,s=6,l=5,f=r.fontSmall+2.5,d=s*2+5*f,p=c+s+(d+l)*t.length;e.save();const h=e.createLinearGradient(n,i,n,i+p);h.addColorStop(0,"#252530"),h.addColorStop(1,"#1a1a1f"),e.fillStyle=h,te(e,n,i,o,p,8),e.fill(),e.strokeStyle="#2a2a35",e.lineWidth=1,te(e,n,i,o,p,8),e.stroke(),e.strokeStyle="rgba(255,255,255,0.025)",e.beginPath(),e.moveTo(n+8,i+1),e.lineTo(n+o-8,i+1),e.stroke(),e.fillStyle="#a1a1aa",e.font=`600 ${(r.fontSmall-.5).toFixed(0)}px ${V}`,e.textAlign="left",e.textBaseline="middle",e.fillText("CLIMBERS",n+a,i+c/2+2);let g=i+c+s;for(const m of t){e.fillStyle="rgba(15, 15, 18, 0.55)",te(e,n+6,g,o-12,d,5),e.fill(),e.fillStyle=nt[m.phase],e.fillRect(n+6,g,2,d);const T=n+a+4,C=n+o-a;let E=g+s+f/2;e.font=`600 ${(r.fontSmall+.5).toFixed(1)}px ${V}`,e.fillStyle="#fafafa",e.textAlign="left",e.fillText(m.carName,T,E),e.textAlign="right",e.fillStyle=nt[m.phase],e.font=`600 ${(r.fontSmall-1).toFixed(1)}px ${V}`,e.fillText(To[m.phase].toUpperCase(),C,E);const y=m.etaSeconds!==void 0&&Number.isFinite(m.etaSeconds)?Ea(m.etaSeconds):"—",S=[["Altitude",rt(m.altitudeM)],["Velocity",Co(m.velocity)],["Dest",m.destinationName??"—"],["ETA",y]];e.font=`500 ${(r.fontSmall-.5).toFixed(1)}px ${V}`;for(const[w,b]of S)E+=f,e.textAlign="left",e.fillStyle="#8b8c92",e.fillText(w,T,E),e.textAlign="right",e.fillStyle="#fafafa",e.fillText(b,C,E);g+=d+l}e.restore()}function Pa(e,t,n,o,i,r,c){return[...e.cars].sort((s,l)=>s.id-l.id).map((s,l)=>{const f=s.y,u=s.target!==void 0?e.stops.find(p=>p.entity_id===s.target):void 0,d=u?Ia(f,u.y,s.v,i,r,c):void 0;return{cx:n,cy:t.toScreenAlt(f),altitudeM:f,velocity:s.v,phase:Ra(s.v,o.get(s.id)??0,i),layer:Ca(f),carName:`Climber ${String.fromCharCode(65+l)}`,destinationName:u?.name,etaSeconds:d}})}const _e=[[0,"#1d1a18","#161412"],[12e3,"#161519","#121116"],[5e4,"#0f0f15","#0c0c12"],[8e4,"#0a0a10","#08080d"],[2e5,"#06060a","#040407"]];function Tt(e,t,n){return e+(t-e)*n}function Rt(e,t,n){const o=parseInt(e.slice(1),16),i=parseInt(t.slice(1),16),r=Math.round(Tt(o>>16&255,i>>16&255,n)),c=Math.round(Tt(o>>8&255,i>>8&255,n)),a=Math.round(Tt(o&255,i&255,n));return`#${(r<<16|c<<8|a).toString(16).padStart(6,"0")}`}function La(e,t){let n=0;for(;n<_e.length-1;n++){const l=_e[n+1];if(l===void 0||e<=l[0])break}const o=_e[n],i=_e[Math.min(n+1,_e.length-1)];if(o===void 0||i===void 0)return"#050810";const r=i[0]-o[0],c=r<=0?0:Math.max(0,Math.min(1,(e-o[0])/r)),a=Rt(o[1],i[1],c),s=Rt(o[2],i[2],c);return Rt(a,s,t)}const Ba=(()=>{const e=[];let t=1333541521;const n=()=>(t=t*1103515245+12345&2147483647,t/2147483647);for(let o=0;o<60;o++){const i=.45+Math.pow(n(),.7)*.55;e.push({altFrac:i,xFrac:n(),size:.3+n()*.9,alpha:.18+n()*.32})}return e})();function Fa(e,t,n,o,i){const r=e.createLinearGradient(0,t.shaftBottom,0,t.shaftTop),c=Math.log10(1+t.axisMaxM/1e3),a=[0,.05,.15,.35,.6,1];for(const l of a){const f=1e3*(10**(l*c)-1);r.addColorStop(l,La(f,i))}e.fillStyle=r,e.fillRect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.save(),e.beginPath(),e.rect(n,t.shaftTop,o-n,t.shaftBottom-t.shaftTop),e.clip();for(const l of Ba){const f=t.axisMaxM*l.altFrac;if(f<8e4)continue;const u=t.toScreenAlt(f),d=n+l.xFrac*(o-n),p=l.alpha*(.7+.3*i);e.fillStyle=`rgba(232, 232, 240, ${p.toFixed(3)})`,e.beginPath(),e.arc(d,u,l.size,0,Math.PI*2),e.fill()}e.restore();const s=Ta(t.axisMaxM);e.font='500 10px system-ui, -apple-system, "Segoe UI", sans-serif',e.textBaseline="middle",e.textAlign="left";for(const l of s){const f=t.toScreenAlt(l.altitudeM);f<t.shaftTop||f>t.shaftBottom||(e.strokeStyle="rgba(200, 220, 255, 0.07)",e.lineWidth=1,e.beginPath(),e.moveTo(n,f),e.lineTo(o,f),e.stroke(),e.fillStyle="rgba(190, 210, 240, 0.30)",e.fillText(l.label,n+4,f-6))}}function $a(e,t,n,o){const r=o-28,c=e.createLinearGradient(0,r,0,o);c.addColorStop(0,"rgba(0,0,0,0)"),c.addColorStop(.6,"rgba(245, 158, 11, 0.06)"),c.addColorStop(1,"rgba(245, 158, 11, 0.10)"),e.fillStyle=c,e.fillRect(t,r,n-t,28),e.strokeStyle=Ue("#f59e0b",.2),e.lineWidth=1,e.beginPath(),e.moveTo(t,o+.5),e.lineTo(n,o+.5),e.stroke()}function Da(e,t,n){e.strokeStyle="rgba(160, 165, 180, 0.08)",e.lineWidth=3,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke(),e.strokeStyle="rgba(180, 188, 205, 0.40)",e.lineWidth=1,e.beginPath(),e.moveTo(t,n.shaftTop),e.lineTo(t,n.shaftBottom),e.stroke()}function Oa(e,t,n,o){const i=Math.max(5,o.figureHeadR*2.4);e.save(),e.strokeStyle="rgba(180, 188, 205, 0.18)",e.lineWidth=1,e.setLineDash([2,3]),e.beginPath(),e.moveTo(t,n-18),e.lineTo(t,n-i),e.stroke(),e.setLineDash([]),e.fillStyle="#2a2a35",e.strokeStyle="rgba(180, 188, 205, 0.45)",e.lineWidth=1,e.beginPath();for(let r=0;r<6;r++){const c=-Math.PI/2+r*Math.PI/3,a=t+Math.cos(c)*i,s=n+Math.sin(c)*i;r===0?e.moveTo(a,s):e.lineTo(a,s)}e.closePath(),e.fill(),e.stroke(),e.font=`500 ${(o.fontSmall-1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillStyle="rgba(160, 165, 180, 0.65)",e.textAlign="left",e.textBaseline="middle",e.fillText("Counterweight",t+i+6,n),e.restore()}function qa(e,t,n,o,i,r,c){e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`,e.textBaseline="middle";for(const a of t.stops){const s=n.toScreenAlt(a.y);if(s<n.shaftTop||s>n.shaftBottom)continue;const l=36;e.strokeStyle="rgba(220, 230, 245, 0.8)",e.lineWidth=1.6,e.beginPath(),e.moveTo(o-l/2,s),e.lineTo(o-5,s),e.moveTo(o+5,s),e.lineTo(o+l/2,s),e.stroke(),e.strokeStyle="rgba(160, 180, 210, 0.55)",e.lineWidth=1,e.beginPath(),e.moveTo(o-l/2,s),e.lineTo(o-5,s-5),e.moveTo(o+l/2,s),e.lineTo(o+5,s-5),e.stroke(),e.fillStyle="rgba(220, 230, 245, 0.95)",e.textAlign="right",e.fillText(a.name,r+c-4,s-1),e.fillStyle="rgba(160, 178, 210, 0.7)",e.font=`${(i.fontSmall-.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`,e.fillText(rt(a.y),r+c-4,s+10),e.font=`${i.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`}}function Wa(e,t,n){const o=Math.max(n.counterweightAltitudeM,1),i=Math.log10(1+o/1e3);return{axisMaxM:o,shaftTop:e,shaftBottom:t,toScreenAlt:r=>{const c=Math.log10(1+Math.max(0,r)/1e3),a=i<=0?0:Math.max(0,Math.min(1,c/i));return t-a*(t-e)}}}function Na(e,t,n,o,i,r,c){const a=Math.max(2,c.figureHeadR*.9);for(const s of t.cars){if(s.target===void 0)continue;const l=r.get(s.target);if(l===void 0)continue;const f=t.stops[l];if(f===void 0)continue;const u=i.get(s.id);if(u===void 0)continue;const d=n.toScreenAlt(f.y);Math.abs(u-d)<.5||(e.strokeStyle="rgba(250, 250, 250, 0.45)",e.lineWidth=1,e.beginPath(),e.moveTo(o,u),e.lineTo(o,d),e.stroke(),e.fillStyle=wo,e.beginPath(),e.arc(o,d,a,0,Math.PI*2),e.fill())}}function Ha(e){const n=e%240/240;return(1-Math.cos(n*Math.PI*2))*.5}function Ga(e,t,n,o,i,r,c){c.firstDrawAt===0&&(c.firstDrawAt=performance.now());const a=(performance.now()-c.firstDrawAt)/1e3,s=r.showDayNight?Ha(a):.5,l=n>=520&&o>=360,f=Math.min(120,Math.max(72,n*.16)),u=l?Math.min(220,Math.max(160,n*.24)):0,d=l?14:0,p=i.padX,h=p+f+4,g=n-i.padX-u-d,m=(h+g)/2,T=12,C=i.padTop+24,E=o-i.padBottom-18,y=Wa(C,E,r);Fa(e,y,h+T,g-T,s),$a(e,h+T,g-T,E),Da(e,m,y),Oa(e,m,y.shaftTop,i),qa(e,t,y,m,i,p,f);const S=Math.max(20,Math.min(34,g-h-8)),w=Math.max(16,Math.min(26,S*.72));i.carH=w,i.carW=S;const b=new Map,k=new Map;t.stops.forEach((_,R)=>k.set(_.entity_id,R));for(const _ of t.cars)b.set(_.id,y.toScreenAlt(_.y));Na(e,t,y,m,b,k,i);for(const _ of t.cars){const R=b.get(_.id);R!==void 0&&Aa(e,_,m,R,S,w)}const A=[...Pa(t,y,m,c.prevVelocity,c.maxSpeed,c.acceleration,c.deceleration)].sort((_,R)=>R.altitudeM-_.altitudeM);xa(e,A,S,n-u-d,i),l&&Ma(e,A,n-i.padX-u,u,C,i);for(const _ of t.cars)c.prevVelocity.set(_.id,_.v);if(c.prevVelocity.size>t.cars.length){const _=new Set(t.cars.map(R=>R.id));for(const R of c.prevVelocity.keys())_.has(R)||c.prevVelocity.delete(R)}}const Ua=1e6;function Ro(e,t){return e*Ua+t}function ja(e){return{has:(t,n)=>e.has(Ro(t,n))}}function za(e){const t=Math.max(0,Math.min(1,(e-320)/580)),n=(o,i)=>o+(i-o)*t;return{padX:n(6,14),padTop:n(22,30),padBottom:n(10,14),labelW:n(52,120),figureGutterW:n(40,70),gutterGap:n(3,5),shaftInnerW:n(28,52),minShaftInnerW:n(22,28),maxShaftInnerW:88,shaftSpacing:n(3,6),carW:n(22,44),carH:n(32,56),fontMain:n(10,12),fontSmall:n(9,10),carDotR:n(1.6,2.2),figureHeadR:n(2,2.8),figureStride:n(5.6,8)}}function An(e,t){let n,o=1/0;for(const i of e){const r=Math.abs(i.y-t);r<o&&(o=r,n=i)}return n!==void 0?{stop:n,dist:o}:void 0}function Va(e,t,n){const o=performance.now();for(const i of t){const r=o-i.bornAt;if(r<0)continue;const c=Math.min(1,Math.max(0,r/i.duration)),a=_o(c),[s,l]=i.kind==="board"?ua(i.startX,i.startY,i.endX,i.endY,a):[i.startX+(i.endX-i.startX)*a,i.startY+(i.endY-i.startY)*a],f=i.kind==="board"?.9:i.kind==="abandon"?(1-a)**1.5:1-a,u=i.kind==="abandon"?n.carDotR*.85:n.carDotR;e.fillStyle=Vt(i.color,f),e.beginPath(),e.arc(s,l,u,0,Math.PI*2),e.fill()}}class Eo{#e;#t;#n=window.devicePixelRatio||1;#i;#r=null;#a=-1;#d=new Map;#s;#o=new Map;#c=new Map;#l=[];#p=null;#m=new Map;#b=1;#y=1;#S=1;#f=0;#u=new Map;#v=new Map;#C=new Map;#h=new Map;#w=[];#k=new Map;#_=new Set;#T=ja(this.#_);#R=[];#E=[];#I=[];#A=new Map;#x=new Map;#M=new Map;#P=new Map;#L=[];#B=[];#F=[];constructor(t,n){this.#e=t;const o=t.getContext("2d");if(!o)throw new Error("2D context unavailable");this.#t=o,this.#s=n,this.#g(),this.#i=()=>{this.#g()},window.addEventListener("resize",this.#i)}dispose(){window.removeEventListener("resize",this.#i)}get canvas(){return this.#e}setTetherConfig(t){this.#p=t,this.#m.clear(),this.#f=0,this.#u.clear()}setTetherPhysics(t,n,o){Number.isFinite(t)&&t>0&&(this.#b=t),Number.isFinite(n)&&n>0&&(this.#y=n),Number.isFinite(o)&&o>0&&(this.#S=o)}pushAssignment(t,n,o){let i=this.#u.get(t);i===void 0&&(i=new Map,this.#u.set(t,i)),i.set(o,n)}#g(){this.#n=window.devicePixelRatio||1;const{clientWidth:t,clientHeight:n}=this.#e;if(t===0||n===0)return;const o=t*this.#n,i=n*this.#n;(this.#e.width!==o||this.#e.height!==i)&&(this.#e.width=o,this.#e.height=i),this.#t.setTransform(this.#n,0,0,this.#n,0,0)}#$(t,n){const o=this.#w.pop();return o!==void 0?(o.start=t,o.end=n,o):{start:t,end:n}}#D(){for(const t of this.#h.values())this.#w.push(t);this.#h.clear()}draw(t,n,o){this.#g();const{clientWidth:i,clientHeight:r}=this.#e,c=this.#t;if(c.clearRect(0,0,i,r),t.stops.length===0||i===0||r===0)return;i!==this.#a&&(this.#r=za(i),this.#a=i);const a=this.#r;if(a===null)return;if(this.#p!==null){this.#O(t,i,r,a,n,o,this.#p);return}const s=t.stops.length===2,l=this.#v;l.clear();for(const v of t.cars)l.set(v.id,v);const f=this.#F;f.length=t.stops.length;for(let v=0;v<t.stops.length;v++)f[v]=t.stops[v];f.sort((v,M)=>v.y-M.y);const u=this.#L;u.length=f.length;for(let v=0;v<f.length;v++){const M=f[v];u[v]=M===void 0?0:M.y}const d=t.stops[0];if(d===void 0)return;let p=d.y,h=d.y;for(let v=1;v<t.stops.length;v++){const M=t.stops[v];if(M===void 0)continue;const B=M.y;B<p&&(p=B),B>h&&(h=B)}const g=u.length>=3?(u.at(-1)??0)-(u.at(-2)??0):1,T=p-1,C=h+g,E=Math.max(C-T,1e-4),y=s?18:0;let S,w;if(s)S=a.padTop+y,w=r-a.padBottom-y;else{let v=1/0;for(let Q=1;Q<u.length;Q++){const De=u[Q],Oe=u[Q-1];if(De===void 0||Oe===void 0)continue;const ve=De-Oe;ve>0&&ve<v&&(v=ve)}Number.isFinite(v)||(v=1);const B=48/v,U=Math.max(0,r-a.padTop-a.padBottom)/E,X=Math.min(U,B),se=E*X;w=r-a.padBottom,S=w-se}const b=v=>w-(v-T)/E*(w-S),k=this.#d;k.forEach(v=>v.length=0);for(const v of t.cars){const M=k.get(v.line);M?M.push(v):k.set(v.line,[v])}const I=this.#B;I.length=0;for(const v of k.keys())I.push(v);I.sort((v,M)=>v-M);let A=0;for(const v of I)A+=k.get(v)?.length??0;const _=Math.max(0,i-2*a.padX-a.labelW),R=a.figureStride*2,x=a.shaftSpacing*Math.max(A-1,0),D=(_-x)/Math.max(A,1),q=s?34:a.maxShaftInnerW,H=Math.max(a.minShaftInnerW,Math.min(q,D*.55)),ye=Math.max(0,Math.min(D-H,R+a.figureStride*4)),Se=Math.max(14,H-6);let re=1/0;if(t.stops.length>=2)for(let v=1;v<u.length;v++){const M=u[v-1],B=u[v];if(M===void 0||B===void 0)continue;const O=b(M)-b(B);O>0&&O<re&&(re=O)}const No=b(h)-2,Ho=Number.isFinite(re)?re:a.carH,Go=s?a.carH:Ho,Uo=Math.max(14,Math.min(Go,No));if(!s&&Number.isFinite(re)){const v=Math.max(1.5,Math.min(re*.067,4)),M=a.figureStride*(v/a.figureHeadR);a.figureHeadR=v,a.figureStride=M}a.shaftInnerW=H,a.carW=Se,a.carH=Uo;const jo=a.padX+a.labelW,zo=H+ye,$e=this.#R;$e.length=0;const ae=this.#C;ae.clear(),this.#D();const ct=this.#h;let Kt=0;for(const v of I){const M=k.get(v)??[];for(const B of M){const O=jo+Kt*(zo+a.shaftSpacing),U=O,X=O+ye,se=X+H/2;$e.push(se),ae.set(B.id,se),ct.set(B.id,this.#$(U,X)),Kt++}}const lt=this.#k;lt.clear();for(let v=0;v<t.stops.length;v++){const M=t.stops[v];M!==void 0&&lt.set(M.entity_id,v)}const Qt=this.#_;Qt.clear();{let v=0;for(const M of I){const B=k.get(M)??[];for(const O of B){if(O.phase==="loading"||O.phase==="door-opening"||O.phase==="door-closing"){const U=An(t.stops,O.y);U!==void 0&&U.dist<.5&&Qt.add(Ro(v,U.stop.entity_id))}v++}}}const dt=this.#A,pt=this.#x,ut=this.#M,ft=this.#P;dt.clear(),pt.clear(),ut.clear(),ft.clear();const ht=this.#E;ht.length=0;const gt=this.#I;gt.length=0;let Jt=0;for(let v=0;v<I.length;v++){const M=I[v];if(M===void 0)continue;const B=k.get(M)??[],O=jr[v]??Vr,U=zr[v]??Xr,X=Yr[v]??1,se=Zr[v]??ea,Q=Math.max(14,H*X),De=Math.max(10,Se*X),Oe=Math.max(10,a.carH),ve=v===2?Qr:v===3?Jr:_t;let qe=1/0,mt=-1/0,We=1/0;for(const Y of B){dt.set(Y.id,Q),pt.set(Y.id,De),ut.set(Y.id,Oe),ft.set(Y.id,ve);const ce=$e[Jt];if(ce===void 0)continue;const Zt=Number.isFinite(Y.min_served_y)&&Number.isFinite(Y.max_served_y),bt=Zt?Math.max(S,b(Y.max_served_y)-a.carH-2):S,Vo=Zt?Math.min(w,b(Y.min_served_y)+2):w;ht.push({cx:ce,top:bt,bottom:Vo,fill:O,frame:U,width:Q}),ce<qe&&(qe=ce),ce>mt&&(mt=ce),bt<We&&(We=bt),Jt++}I.length>1&&Number.isFinite(qe)&&Number.isFinite(We)&&gt.push({cx:(qe+mt)/2,top:We,text:Kr[v]??`Line ${v+1}`,color:se})}ca(c,ht),la(c,gt,a),da(c,f,b,a,$e,i,this.#T,S,s),pa(c,t,b,a,ct,this.#u),ha(c,t,ae,dt,b,a,lt);for(const v of t.cars){const M=ae.get(v.id);if(M===void 0)continue;const B=pt.get(v.id)??a.carW,O=ut.get(v.id)??a.carH,U=ft.get(v.id)??_t,X=this.#o.get(v.id);ga(c,v,M,B,O,b),ma(c,v,M,B,O,U,b,a,X?.roster)}this.#q(t,ae,ct,b,a,n),Va(c,this.#l,a),o&&o.size>0&&ka(c,this.#s,l,o,ae,b,a,i)}#O(t,n,o,i,r,c,a){const s={prevVelocity:this.#m,maxSpeed:this.#b,acceleration:this.#y,deceleration:this.#S,firstDrawAt:this.#f};Ga(this.#t,t,n,o,i,a,s),this.#f=s.firstDrawAt}#q(t,n,o,i,r,c){const a=performance.now(),s=Math.max(1,c),l=oa/s,f=30/s,u=new Map,d=[];for(const p of t.cars){const h=this.#o.get(p.id),g=p.riders,m=n.get(p.id),T=An(t.stops,p.y),C=p.phase==="loading"&&T!==void 0&&T.dist<.5?T.stop:void 0;if(h&&m!==void 0&&C!==void 0){const S=g-h.riders;if(S>0&&u.set(C.entity_id,(u.get(C.entity_id)??0)+S),S!==0){const w=i(C.y),b=i(p.y)-r.carH/2,k=Math.min(Math.abs(S),6);if(S>0){const I=C.waiting_up>=C.waiting_down,A=o.get(p.id);let _=m-20;if(A!==void 0){const L=A.start,D=A.end;_=(L+D)/2}const R=I?yo:So,x=this.#u.get(C.entity_id);x!==void 0&&(x.delete(p.line),x.size===0&&this.#u.delete(C.entity_id));for(let L=0;L<k;L++)d.push(()=>this.#l.push({kind:"board",bornAt:a+L*f,duration:l,startX:_,startY:w,endX:m,endY:b,color:R}))}else for(let I=0;I<k;I++)d.push(()=>this.#l.push({kind:"alight",bornAt:a+I*f,duration:l,startX:m,startY:b,endX:m+18,endY:b+10,color:_t}))}}const E=h?.roster??[];let y;if(h){const S=g-h.riders;if(y=E.slice(),S>0&&C!==void 0){const b=C.waiting_up>=C.waiting_down?0:1e4;for(let k=0;k<S;k++)y.push(fe(C.entity_id,k+b))}else if(S>0)for(let w=0;w<S;w++)y.push(fe(p.id,y.length+w));else S<0&&y.splice(y.length+S,-S)}else{y=[];for(let S=0;S<g;S++)y.push(fe(p.id,S))}for(;y.length>g;)y.pop();for(;y.length<g;)y.push(fe(p.id,y.length));this.#o.set(p.id,{riders:g,roster:y})}for(const p of t.stops){const h=p.waiting_up+p.waiting_down,g=this.#c.get(p.entity_id);if(g){const m=g.waiting-h,T=u.get(p.entity_id)??0,C=Math.max(0,m-T);if(C>0){const E=i(p.y),y=r.padX+r.labelW+20,S=Math.min(C,4);for(let w=0;w<S;w++)this.#l.push({kind:"abandon",bornAt:a+w*f,duration:l*1.5,startX:y,startY:E,endX:y-26,endY:E-6,color:vo})}}this.#c.set(p.entity_id,{waiting:h})}for(const p of d)p();for(let p=this.#l.length-1;p>=0;p--){const h=this.#l[p];h!==void 0&&a-h.bornAt>h.duration&&this.#l.splice(p,1)}if(this.#o.size>t.cars.length)for(const p of this.#o.keys())this.#v.has(p)||this.#o.delete(p);if(this.#c.size>t.stops.length)for(const p of this.#c.keys())this.#k.has(p)||this.#c.delete(p)}}const Xa="#f59e0b",Ya=3;function Ka(){const e="quest-pane";return{root:P("quest-pane",e),gridView:P("quest-grid",e),stageView:P("quest-stage-view",e),backBtn:P("quest-back-to-grid",e),title:P("quest-stage-title",e),brief:P("quest-stage-brief",e),stageStars:P("quest-stage-stars",e),editorHost:P("quest-editor",e),runBtn:P("quest-run",e),resetBtn:P("quest-reset",e),result:P("quest-result",e),progress:P("quest-progress",e),shaft:P("quest-shaft",e),shaftIdle:P("quest-shaft-idle",e)}}function Et(e,t){e.title.textContent=t.title,e.brief.textContent=t.brief;const n=Fe(t.id);n===0?e.stageStars.textContent="":e.stageStars.textContent="★".repeat(n)+"☆".repeat(Ya-n)}function It(e,t){e.gridView.classList.toggle("hidden",t!=="grid"),e.gridView.classList.toggle("flex",t==="grid"),e.stageView.classList.toggle("hidden",t!=="stage"),e.stageView.classList.toggle("flex",t==="stage")}async function Qa(e){const t=Ka(),n=b=>{const k=kr(b);if(k)return k;const I=ne[0];if(!I)throw new Error("quest-pane: stage registry is empty");return I},o=Fr(n(e.initialStageId),"grid");Et(t,o.activeStage);const i=Lr();mn(i,o.activeStage);const r=Br();yn(r,o.activeStage);const c=Dr();wt(c,o.activeStage);const a=Ir(),s=new Eo(t.shaft,Xa);t.runBtn.disabled=!0,t.resetBtn.disabled=!0,t.result.textContent="Loading editor…";const l=await $i({container:t.editorHost,initialValue:pn(o.activeStage.id)??o.activeStage.starterCode,language:"typescript"});t.runBtn.disabled=!1,t.resetBtn.disabled=!1,t.result.textContent="";const f=Or(),u=300;let d=null,p=!1;const h=()=>{p||(d!==null&&clearTimeout(d),d=setTimeout(()=>{un(o.activeStage.id,l.getValue()),d=null},u))},g=()=>{d!==null&&(clearTimeout(d),d=null,un(o.activeStage.id,l.getValue()))},m=b=>{p=!0;try{l.setValue(b)}finally{p=!1}};l.onDidChange(()=>{h()});const T=Hr();wn(T,o.activeStage,l);const C=()=>{Sn(o),t.shaftIdle.hidden=!1;const b=t.shaft.getContext("2d");b&&b.clearRect(0,0,t.shaft.width,t.shaft.height)},E=(b,{fromGrid:k})=>{g(),$r(o,b),Et(t,b),mn(i,b),yn(r,b),wt(c,b),wn(T,b,l),m(pn(b.id)??b.starterCode),l.clearRuntimeMarker(),t.result.textContent="",t.progress.textContent="",C(),It(t,"stage"),vt(o,"stage"),e.onStageChange?.(b.id)},y=()=>{g(),C(),t.result.textContent="",t.progress.textContent="",It(t,"grid"),vt(o,"grid"),St(a,b=>{E(n(b),{fromGrid:!0})}),e.onBackToGrid?.()};St(a,b=>{E(n(b),{fromGrid:!0})});const S=e.landOn??"grid";It(t,S),vt(o,S);const w=async()=>{const b=o.activeStage;t.runBtn.disabled=!0,t.result.textContent="Running…",t.progress.textContent="",l.clearRuntimeMarker();let k=null,I=0;o.runLoop.active=!0;const A=()=>{o.runLoop.active&&(k!==null&&s.draw(k,1),requestAnimationFrame(A))};t.shaftIdle.hidden=!0,requestAnimationFrame(A);try{const _=await Mr(b,l.getValue(),{timeoutMs:1e3,onProgress:R=>{ke(o,b)&&(t.progress.textContent=Pr(R))},onSnapshot:R=>{k=R,I+=1}});if(_.passed){const R=Fe(b.id);_.stars>R&&(Tr(b.id,_.stars),St(a,x=>{E(n(x),{fromGrid:!0})}),ke(o,b)&&Et(t,o.activeStage)),ke(o,b)&&wt(c,o.activeStage,{collapse:!1})}if(ke(o,b)){t.result.textContent="",t.progress.textContent="";const R=_.passed?_r(b.id):void 0,x=R?()=>{E(R,{fromGrid:!1})}:void 0;qr(f,_,()=>void w(),b.failHint,x)}}catch(_){if(ke(o,b)){const R=_ instanceof Error?_.message:String(_);t.result.textContent=`Error: ${R}`,t.progress.textContent="",_ instanceof uo&&_.location!==null&&l.setRuntimeMarker({line:_.location.line,column:_.location.column,message:R})}}finally{if(t.runBtn.disabled=!1,Sn(o),I===0){const _=t.shaft.getContext("2d");_&&_.clearRect(0,0,t.shaft.width,t.shaft.height),t.shaftIdle.hidden=!1}}};return t.runBtn.addEventListener("click",()=>{w()}),t.resetBtn.addEventListener("click",()=>{window.confirm(`Reset ${o.activeStage.title} to its starter code?`)&&(Cr(o.activeStage.id),m(o.activeStage.starterCode),l.clearRuntimeMarker(),t.result.textContent="")}),t.backBtn.addEventListener("click",()=>{y()}),{handles:t,editor:l}}let At=null;async function Io(){if(!At){const e=new URL("pkg/elevator_wasm.js",document.baseURI).href,t=new URL("pkg/elevator_wasm_bg.wasm",document.baseURI).href;At=import(e).then(async n=>(await n.default(t),n))}return At}class Xt{#e;#t;constructor(t){this.#e=t,this.#t=t.dt()}static async create(t,n,o){const i=await Io();return new Xt(new i.WasmSim(t,n,o))}step(t){this.#e.stepMany(t)}drainEvents(){return this.#e.drainEvents()}get dt(){return this.#t}tick(){return Number(this.#e.currentTick())}strategyName(){return this.#e.strategyName()}trafficMode(){return this.#e.trafficMode()}setStrategy(t){return this.#e.setStrategy(t)}spawnRider(t,n,o,i){return this.#e.spawnRider(t,n,o,i)}setTrafficRate(t){this.#e.setTrafficRate(t)}trafficRate(){return this.#e.trafficRate()}snapshot(){return this.#e.snapshot()}metrics(){return this.#e.metrics()}waitingCountAt(t){return this.#e.waitingCountAt(t)}applyPhysicsLive(t){try{return this.#e.setMaxSpeedAll(t.maxSpeed),this.#e.setWeightCapacityAll(t.weightCapacityKg),this.#e.setDoorOpenTicksAll(t.doorOpenTicks),this.#e.setDoorTransitionTicksAll(t.doorTransitionTicks),!0}catch{return!1}}dispose(){this.#e.free()}}class Ao{#e;#t=0;#n=[];#i=0;#r=0;#a=1;#d=0;constructor(t){this.#e=Ja(BigInt(t>>>0))}setPhases(t){this.#n=t,this.#i=t.reduce((n,o)=>n+o.durationSec,0),this.#r=0,this.#t=0}setIntensity(t){this.#a=Math.max(0,t)}setPatienceTicks(t){this.#d=Math.max(0,Math.floor(t))}drainSpawns(t,n){if(this.#n.length===0)return[];const o=t.stops.filter(a=>a.stop_id!==4294967295);if(o.length<2)return[];const i=Math.min(Math.max(0,n),1),r=this.#n[this.currentPhaseIndex()];if(!r)return[];this.#t+=r.ridersPerMin*this.#a/60*i,this.#r=(this.#r+i)%(this.#i||1);const c=[];for(;this.#t>=1;)this.#t-=1,c.push(this.#s(o,r));return c}currentPhaseIndex(){if(this.#n.length===0)return 0;let t=this.#r;for(const[n,o]of this.#n.entries())if(t-=o.durationSec,t<0)return n;return this.#n.length-1}currentPhaseLabel(){return this.#n[this.currentPhaseIndex()]?.name??""}phaseProgress(){return this.#i<=0?0:Math.min(1,this.#r/this.#i)}progressInPhase(){if(this.#n.length===0)return 0;let t=this.#r;for(const n of this.#n){const o=n.durationSec;if(t<o)return o>0?Math.min(1,t/o):0;t-=o}return 1}phases(){return this.#n}#s(t,n){const o=this.#o(t.length,n.originWeights);let i=this.#o(t.length,n.destWeights);i===o&&(i=(i+1)%t.length);const r=t[o],c=t[i];if(!r||!c)throw new Error("stop index out of bounds");const a=50+this.#p()*50;return{originStopId:r.stop_id,destStopId:c.stop_id,weight:a,...this.#d>0?{patienceTicks:this.#d}:{}}}#o(t,n){if(!n||n.length!==t)return this.#l(t);let o=0;for(const r of n)o+=Math.max(0,r);if(o<=0)return this.#l(t);let i=this.#p()*o;for(const[r,c]of n.entries())if(i-=Math.max(0,c),i<0)return r;return t-1}#c(){let t=this.#e=this.#e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}#l(t){return Number(this.#c()%BigInt(t))}#p(){return Number(this.#c()>>11n)/2**53}}function Ja(e){let t=e+0x9e3779b97f4a7c15n&0xffffffffffffffffn;return t=(t^t>>30n)*0xbf58476d1ce4e5b9n&0xffffffffffffffffn,t=(t^t>>27n)*0x94d049bb133111ebn&0xffffffffffffffffn,t^t>>31n}const Za="#7dd3fc",es="#fda4af";async function xn(e,t,n,o,i){const r=Jo(o,i),c=await Xt.create(r,t,n),a=new Eo(e.canvas,e.accent);if(a.setTetherConfig(o.tether??null),o.tether){const l=jt(o,i);a.setTetherPhysics(l.maxSpeed,l.acceleration,l.deceleration)}const s=e.canvas.parentElement;if(s){const l=o.stops.length,u=o.tether?640:Math.max(200,l*16);s.style.setProperty("--shaft-min-h",`${u}px`)}return{strategy:t,sim:c,renderer:a,metricsEl:e.metrics,modeEl:e.mode,metricHistory:{avg_wait_s:[],max_wait_s:[],delivered:[],abandoned:[],utilization:[]},latestMetrics:null,bubbles:new Map}}function Ce(e){e?.sim.dispose(),e?.renderer.dispose()}function xo(e,t){e.paneA&&t(e.paneA),e.paneB&&t(e.paneB)}const ts=["avg_wait_s","max_wait_s","delivered","abandoned","utilization"],ns=120;function Mn(e,t,n){const o=e.sim.metrics();e.latestMetrics=o;for(const r of ts){const c=e.metricHistory[r];c.push(o[r]),c.length>ns&&c.shift()}const i=performance.now();for(const[r,c]of e.bubbles)c.expiresAt<=i&&e.bubbles.delete(r);e.renderer.draw(t,n,e.bubbles)}const os={"elevator-assigned":1400,"elevator-arrived":1200,"elevator-repositioning":1600,"door-opened":550,"rider-boarded":850,"rider-exited":1600},is=1e3;function rs(e,t,n){const o=performance.now(),i=r=>ss(n,r);for(const r of t){const c=as(r,i);if(c===null)continue;const a=r.elevator;if(a===void 0)continue;const s=os[r.kind]??is;e.bubbles.set(a,{glyph:c.glyph,text:c.text,bornAt:o,expiresAt:o+s})}}function as(e,t){switch(e.kind){case"elevator-assigned":return{glyph:"›",text:`To ${t(e.stop)}`};case"elevator-repositioning":return{glyph:"↻",text:`Reposition to ${t(e.stop)}`};case"elevator-arrived":return{glyph:"●",text:`At ${t(e.stop)}`};case"door-opened":return{glyph:"◌",text:"Doors open"};case"rider-boarded":return{glyph:"+",text:"Boarding"};case"rider-exited":return{glyph:"↓",text:`Off at ${t(e.stop)}`};default:return null}}function ss(e,t){return e.stops.find(o=>o.entity_id===t)?.name??`stop #${t}`}const cs={Idle:"Quiet",UpPeak:"Morning rush",InterFloor:"Mixed",DownPeak:"Evening rush"};function Pn(e){const t=e.sim.trafficMode();e.modeEl.dataset.mode!==t&&(e.modeEl.dataset.mode=t,e.modeEl.textContent=cs[t],e.modeEl.title=t)}function ls(){const e=a=>{const s=document.getElementById(a);if(!s)throw new Error(`missing element #${a}`);return s},t=a=>document.getElementById(a),n=(a,s)=>({root:e(`pane-${a}`),canvas:e(`shaft-${a}`),name:e(`name-${a}`),mode:e(`mode-${a}`),desc:e(`desc-${a}`),metrics:e(`metrics-${a}`),trigger:e(`strategy-trigger-${a}`),popover:e(`strategy-popover-${a}`),repoTrigger:e(`repo-trigger-${a}`),repoName:e(`repo-name-${a}`),repoPopover:e(`repo-popover-${a}`),accent:s,which:a}),o=a=>{const s=document.querySelector(`.tweak-row[data-key="${a}"]`);if(!s)throw new Error(`missing tweak row for ${a}`);const l=u=>{const d=s.querySelector(u);if(!d)throw new Error(`missing ${u} in tweak row ${a}`);return d},f=u=>s.querySelector(u);return{root:s,value:l(".tweak-value"),defaultV:l(".tweak-default-v"),dec:l(".tweak-dec"),inc:l(".tweak-inc"),reset:l(".tweak-reset"),trackFill:f(".tweak-track-fill"),trackDefault:f(".tweak-track-default"),trackThumb:f(".tweak-track-thumb")}},i={};for(const a of me)i[a]=o(a);const r={scenarioCards:e("scenario-cards"),compareToggle:e("compare"),seedInput:e("seed"),seedShuffleBtn:e("seed-shuffle"),speedInput:e("speed"),speedLabel:e("speed-label"),intensityInput:e("traffic"),intensityLabel:e("traffic-label"),playBtn:e("play"),resetBtn:e("reset"),shareBtn:e("share"),tweakBtn:e("tweak"),tweakPanel:e("tweak-panel"),tweakResetAllBtn:e("tweak-reset-all"),tweakRows:i,layout:e("layout"),loader:e("loader"),toast:e("toast"),phaseStrip:t("phase-strip"),phaseLabel:t("phase-label"),phaseProgress:t("phase-progress-fill"),shortcutsBtn:e("shortcuts"),shortcutSheet:e("shortcut-sheet"),shortcutSheetClose:e("shortcut-sheet-close"),paneA:n("a",Za),paneB:n("b",es)};wi(r);const c=document.getElementById("controls-bar");return c&&new ResizeObserver(([s])=>{if(!s)return;const l=Math.ceil(s.borderBoxSize[0]?.blockSize??s.contentRect.height);document.documentElement.style.setProperty("--controls-bar-h",`${l}px`)}).observe(c),r}function Mo(e,t,n,o,i,r,c,a,s){const l=document.createDocumentFragment();for(const f of t){const u=document.createElement("button");u.type="button",u.className="strategy-option",u.setAttribute("role","menuitemradio"),u.setAttribute("aria-checked",f===r?"true":"false"),u.dataset[i]=f;const d=document.createElement("span");d.className="strategy-option-name";const p=document.createElement("span");if(p.className="strategy-option-label",p.textContent=n[f],d.appendChild(p),c&&f===c){const g=document.createElement("span");g.className="strategy-option-sibling",g.textContent=`also in ${a}`,d.appendChild(g)}const h=document.createElement("span");h.className="strategy-option-desc",h.textContent=o[f],u.append(d,h),u.addEventListener("click",()=>{s(f)}),l.appendChild(u)}e.replaceChildren(l)}function oe(e,t){const n=Le[t],o=co[t];e.repoName.textContent!==n&&(e.repoName.textContent=n),e.repoTrigger.setAttribute("aria-label",`Change idle-parking strategy (currently ${n})`),e.repoTrigger.title=o}function Ln(e,t,n,o,i){Mo(e.repoPopover,yi,Le,co,"reposition",t,n,o,i)}function Ie(e,t,n){const{repositionA:o,repositionB:i,compare:r}=e.permalink;Ln(t.paneA,o,r?i:null,"B",c=>void Fn(e,t,"a",c,n)),Ln(t.paneB,i,r?o:null,"A",c=>void Fn(e,t,"b",c,n))}function Ot(e,t){e.repoPopover.hidden=!t,e.repoTrigger.setAttribute("aria-expanded",String(t))}function Po(e){return!e.paneA.repoPopover.hidden||!e.paneB.repoPopover.hidden}function qt(e){Ot(e.paneA,!1),Ot(e.paneB,!1)}function at(e){Nt(e),qt(e)}function Bn(e,t,n,o){n.repoTrigger.addEventListener("click",i=>{i.stopPropagation();const r=n.repoPopover.hidden;at(t),r&&(Ie(e,t,o),Ot(n,!0))})}async function Fn(e,t,n,o,i){if((n==="a"?e.permalink.repositionA:e.permalink.repositionB)===o){qt(t);return}n==="a"?(e.permalink={...e.permalink,repositionA:o},oe(t.paneA,o)):(e.permalink={...e.permalink,repositionB:o},oe(t.paneB,o)),W(e.permalink),Ie(e,t,i),qt(t),await i(),G(t.toast,`${n==="a"?"A":"B"} park: ${Le[o]}`)}function ds(e){document.addEventListener("click",t=>{if(!Lo(e)&&!Po(e))return;const n=t.target;if(n instanceof Node){for(const o of[e.paneA,e.paneB])if(o.popover.contains(n)||o.trigger.contains(n)||o.repoPopover.contains(n)||o.repoTrigger.contains(n))return;at(e)}})}function ie(e,t){const n=ge[t],o=so[t];e.name.textContent!==n&&(e.name.textContent=n),e.desc.textContent!==o&&(e.desc.textContent=o),e.trigger.setAttribute("aria-label",`Change dispatch strategy (currently ${n})`),e.trigger.title=o}function $n(e,t,n,o,i){Mo(e.popover,bi,ge,so,"strategy",t,n,o,i)}function Ae(e,t,n){const{strategyA:o,strategyB:i,compare:r}=e.permalink;$n(t.paneA,o,r?i:null,"B",c=>void On(e,t,"a",c,n)),$n(t.paneB,i,r?o:null,"A",c=>void On(e,t,"b",c,n))}function Wt(e,t){e.popover.hidden=!t,e.trigger.setAttribute("aria-expanded",String(t))}function Lo(e){return!e.paneA.popover.hidden||!e.paneB.popover.hidden}function Nt(e){Wt(e.paneA,!1),Wt(e.paneB,!1)}function Dn(e,t,n,o){n.trigger.addEventListener("click",i=>{i.stopPropagation();const r=n.popover.hidden;at(t),r&&(Ae(e,t,o),Wt(n,!0))})}async function On(e,t,n,o,i){if((n==="a"?e.permalink.strategyA:e.permalink.strategyB)===o){Nt(t);return}n==="a"?(e.permalink={...e.permalink,strategyA:o},ie(t.paneA,o)):(e.permalink={...e.permalink,strategyB:o},ie(t.paneB,o)),W(e.permalink),Ae(e,t,i),Nt(t),await i(),G(t.toast,`${n==="a"?"A":"B"}: ${ge[o]}`)}function qn(e,t){switch(e){case"cars":case"weightCapacity":return String(Math.round(t));case"maxSpeed":case"doorCycleSec":return t.toFixed(1)}}function ps(e){switch(e){case"cars":return"Cars";case"maxSpeed":return"Max speed";case"weightCapacity":return"Capacity";case"doorCycleSec":return"Door cycle"}}function st(e,t,n){let o=!1;for(const i of me){const r=n.tweakRows[i],c=e.tweakRanges[i],a=ee(e,i,t),s=Gt(e,i),l=Ut(e,i,a);l&&(o=!0),r.value.textContent=qn(i,a),r.defaultV.textContent=qn(i,s),r.dec.disabled=a<=c.min+1e-9,r.inc.disabled=a>=c.max-1e-9,r.root.dataset.overridden=String(l),r.reset.hidden=!l;const f=Math.max(c.max-c.min,1e-9),u=Math.max(0,Math.min(1,(a-c.min)/f)),d=Math.max(0,Math.min(1,(s-c.min)/f));r.trackFill&&(r.trackFill.style.width=`${(u*100).toFixed(1)}%`),r.trackThumb&&(r.trackThumb.style.left=`${(u*100).toFixed(1)}%`),r.trackDefault&&(r.trackDefault.style.left=`${(d*100).toFixed(1)}%`)}n.tweakResetAllBtn.hidden=!o}function Bo(e,t){e.tweakBtn.setAttribute("aria-expanded",t?"true":"false"),e.tweakPanel.hidden=!t}function Yt(e,t,n,o){const i=jt(n,e.permalink.overrides),r={maxSpeed:i.maxSpeed,weightCapacityKg:i.weightCapacity,doorOpenTicks:i.doorOpenTicks,doorTransitionTicks:i.doorTransitionTicks},c=[e.paneA,e.paneB].filter(s=>s!==null),a=c.every(s=>s.sim.applyPhysicsLive(r));if(a)for(const s of c)s.renderer?.setTetherPhysics(i.maxSpeed,i.acceleration,i.deceleration);st(n,e.permalink.overrides,t),a||o()}function us(e,t,n){return Math.min(n,Math.max(t,e))}function fs(e,t,n){const o=Math.round((e-t)/n);return t+o*n}function Ge(e,t,n,o,i){const r=N(e.permalink.scenario),c=r.tweakRanges[n],a=ee(r,n,e.permalink.overrides),s=us(a+o*c.step,c.min,c.max),l=fs(s,c.min,c.step);ms(e,t,n,l,i)}function hs(e,t,n,o){const i=N(e.permalink.scenario),r={...e.permalink.overrides};Reflect.deleteProperty(r,n),e.permalink={...e.permalink,overrides:r},W(e.permalink),n==="cars"?(o(),G(t.toast,"Cars reset")):(Yt(e,t,i,o),G(t.toast,`${ps(n)} reset`))}async function gs(e,t,n){const o=N(e.permalink.scenario),i=Ut(o,"cars",ee(o,"cars",e.permalink.overrides));e.permalink={...e.permalink,overrides:{}},W(e.permalink),i?await n():Yt(e,t,o,n),G(t.toast,"Parameters reset")}function ms(e,t,n,o,i){const r=N(e.permalink.scenario),c={...e.permalink.overrides,[n]:o};e.permalink={...e.permalink,overrides:Zn(r,c)},W(e.permalink),n==="cars"?i():Yt(e,t,r,i)}function bs(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function ys(e){if(Object.prototype.hasOwnProperty.call(e,"__esModule"))return e;var t=e.default;if(typeof t=="function"){var n=function o(){return this instanceof o?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(o){var i=Object.getOwnPropertyDescriptor(e,o);Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:function(){return e[o]}})}),n}var je={exports:{}},Ss=je.exports,Wn;function vs(){return Wn||(Wn=1,(function(e){(function(t,n,o){function i(s){var l=this,f=a();l.next=function(){var u=2091639*l.s0+l.c*23283064365386963e-26;return l.s0=l.s1,l.s1=l.s2,l.s2=u-(l.c=u|0)},l.c=1,l.s0=f(" "),l.s1=f(" "),l.s2=f(" "),l.s0-=f(s),l.s0<0&&(l.s0+=1),l.s1-=f(s),l.s1<0&&(l.s1+=1),l.s2-=f(s),l.s2<0&&(l.s2+=1),f=null}function r(s,l){return l.c=s.c,l.s0=s.s0,l.s1=s.s1,l.s2=s.s2,l}function c(s,l){var f=new i(s),u=l&&l.state,d=f.next;return d.int32=function(){return f.next()*4294967296|0},d.double=function(){return d()+(d()*2097152|0)*11102230246251565e-32},d.quick=d,u&&(typeof u=="object"&&r(u,f),d.state=function(){return r(f,{})}),d}function a(){var s=4022871197,l=function(f){f=String(f);for(var u=0;u<f.length;u++){s+=f.charCodeAt(u);var d=.02519603282416938*s;s=d>>>0,d-=s,d*=s,s=d>>>0,d-=s,s+=d*4294967296}return(s>>>0)*23283064365386963e-26};return l}n&&n.exports?n.exports=c:this.alea=c})(Ss,e)})(je)),je.exports}var ze={exports:{}},ws=ze.exports,Nn;function ks(){return Nn||(Nn=1,(function(e){(function(t,n,o){function i(a){var s=this,l="";s.x=0,s.y=0,s.z=0,s.w=0,s.next=function(){var u=s.x^s.x<<11;return s.x=s.y,s.y=s.z,s.z=s.w,s.w^=s.w>>>19^u^u>>>8},a===(a|0)?s.x=a:l+=a;for(var f=0;f<l.length+64;f++)s.x^=l.charCodeAt(f)|0,s.next()}function r(a,s){return s.x=a.x,s.y=a.y,s.z=a.z,s.w=a.w,s}function c(a,s){var l=new i(a),f=s&&s.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xor128=c})(ws,e)})(ze)),ze.exports}var Ve={exports:{}},_s=Ve.exports,Hn;function Cs(){return Hn||(Hn=1,(function(e){(function(t,n,o){function i(a){var s=this,l="";s.next=function(){var u=s.x^s.x>>>2;return s.x=s.y,s.y=s.z,s.z=s.w,s.w=s.v,(s.d=s.d+362437|0)+(s.v=s.v^s.v<<4^(u^u<<1))|0},s.x=0,s.y=0,s.z=0,s.w=0,s.v=0,a===(a|0)?s.x=a:l+=a;for(var f=0;f<l.length+64;f++)s.x^=l.charCodeAt(f)|0,f==l.length&&(s.d=s.x<<10^s.x>>>4),s.next()}function r(a,s){return s.x=a.x,s.y=a.y,s.z=a.z,s.w=a.w,s.v=a.v,s.d=a.d,s}function c(a,s){var l=new i(a),f=s&&s.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xorwow=c})(_s,e)})(Ve)),Ve.exports}var Xe={exports:{}},Ts=Xe.exports,Gn;function Rs(){return Gn||(Gn=1,(function(e){(function(t,n,o){function i(a){var s=this;s.next=function(){var f=s.x,u=s.i,d,p;return d=f[u],d^=d>>>7,p=d^d<<24,d=f[u+1&7],p^=d^d>>>10,d=f[u+3&7],p^=d^d>>>3,d=f[u+4&7],p^=d^d<<7,d=f[u+7&7],d=d^d<<13,p^=d^d<<9,f[u]=p,s.i=u+1&7,p};function l(f,u){var d,p=[];if(u===(u|0))p[0]=u;else for(u=""+u,d=0;d<u.length;++d)p[d&7]=p[d&7]<<15^u.charCodeAt(d)+p[d+1&7]<<13;for(;p.length<8;)p.push(0);for(d=0;d<8&&p[d]===0;++d);for(d==8?p[7]=-1:p[d],f.x=p,f.i=0,d=256;d>0;--d)f.next()}l(s,a)}function r(a,s){return s.x=a.x.slice(),s.i=a.i,s}function c(a,s){a==null&&(a=+new Date);var l=new i(a),f=s&&s.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(f.x&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xorshift7=c})(Ts,e)})(Xe)),Xe.exports}var Ye={exports:{}},Es=Ye.exports,Un;function Is(){return Un||(Un=1,(function(e){(function(t,n,o){function i(a){var s=this;s.next=function(){var f=s.w,u=s.X,d=s.i,p,h;return s.w=f=f+1640531527|0,h=u[d+34&127],p=u[d=d+1&127],h^=h<<13,p^=p<<17,h^=h>>>15,p^=p>>>12,h=u[d]=h^p,s.i=d,h+(f^f>>>16)|0};function l(f,u){var d,p,h,g,m,T=[],C=128;for(u===(u|0)?(p=u,u=null):(u=u+"\0",p=0,C=Math.max(C,u.length)),h=0,g=-32;g<C;++g)u&&(p^=u.charCodeAt((g+32)%u.length)),g===0&&(m=p),p^=p<<10,p^=p>>>15,p^=p<<4,p^=p>>>13,g>=0&&(m=m+1640531527|0,d=T[g&127]^=p+m,h=d==0?h+1:0);for(h>=128&&(T[(u&&u.length||0)&127]=-1),h=127,g=512;g>0;--g)p=T[h+34&127],d=T[h=h+1&127],p^=p<<13,d^=d<<17,p^=p>>>15,d^=d>>>12,T[h]=p^d;f.w=m,f.X=T,f.i=h}l(s,a)}function r(a,s){return s.i=a.i,s.w=a.w,s.X=a.X.slice(),s}function c(a,s){a==null&&(a=+new Date);var l=new i(a),f=s&&s.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(f.X&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.xor4096=c})(Es,e)})(Ye)),Ye.exports}var Ke={exports:{}},As=Ke.exports,jn;function xs(){return jn||(jn=1,(function(e){(function(t,n,o){function i(a){var s=this,l="";s.next=function(){var u=s.b,d=s.c,p=s.d,h=s.a;return u=u<<25^u>>>7^d,d=d-p|0,p=p<<24^p>>>8^h,h=h-u|0,s.b=u=u<<20^u>>>12^d,s.c=d=d-p|0,s.d=p<<16^d>>>16^h,s.a=h-u|0},s.a=0,s.b=0,s.c=-1640531527,s.d=1367130551,a===Math.floor(a)?(s.a=a/4294967296|0,s.b=a|0):l+=a;for(var f=0;f<l.length+20;f++)s.b^=l.charCodeAt(f)|0,s.next()}function r(a,s){return s.a=a.a,s.b=a.b,s.c=a.c,s.d=a.d,s}function c(a,s){var l=new i(a),f=s&&s.state,u=function(){return(l.next()>>>0)/4294967296};return u.double=function(){do var d=l.next()>>>11,p=(l.next()>>>0)/4294967296,h=(d+p)/(1<<21);while(h===0);return h},u.int32=l.next,u.quick=u,f&&(typeof f=="object"&&r(f,l),u.state=function(){return r(l,{})}),u}n&&n.exports?n.exports=c:this.tychei=c})(As,e)})(Ke)),Ke.exports}var Qe={exports:{}};const Ms={},Ps=Object.freeze(Object.defineProperty({__proto__:null,default:Ms},Symbol.toStringTag,{value:"Module"})),Ls=ys(Ps);var Bs=Qe.exports,zn;function Fs(){return zn||(zn=1,(function(e){(function(t,n,o){var i=256,r=6,c=52,a="random",s=o.pow(i,r),l=o.pow(2,c),f=l*2,u=i-1,d;function p(y,S,w){var b=[];S=S==!0?{entropy:!0}:S||{};var k=T(m(S.entropy?[y,E(n)]:y??C(),3),b),I=new h(b),A=function(){for(var _=I.g(r),R=s,x=0;_<l;)_=(_+x)*i,R*=i,x=I.g(1);for(;_>=f;)_/=2,R/=2,x>>>=1;return(_+x)/R};return A.int32=function(){return I.g(4)|0},A.quick=function(){return I.g(4)/4294967296},A.double=A,T(E(I.S),n),(S.pass||w||function(_,R,x,L){return L&&(L.S&&g(L,I),_.state=function(){return g(I,{})}),x?(o[a]=_,R):_})(A,k,"global"in S?S.global:this==o,S.state)}function h(y){var S,w=y.length,b=this,k=0,I=b.i=b.j=0,A=b.S=[];for(w||(y=[w++]);k<i;)A[k]=k++;for(k=0;k<i;k++)A[k]=A[I=u&I+y[k%w]+(S=A[k])],A[I]=S;(b.g=function(_){for(var R,x=0,L=b.i,D=b.j,q=b.S;_--;)R=q[L=u&L+1],x=x*i+q[u&(q[L]=q[D=u&D+R])+(q[D]=R)];return b.i=L,b.j=D,x})(i)}function g(y,S){return S.i=y.i,S.j=y.j,S.S=y.S.slice(),S}function m(y,S){var w=[],b=typeof y,k;if(S&&b=="object")for(k in y)try{w.push(m(y[k],S-1))}catch{}return w.length?w:b=="string"?y:y+"\0"}function T(y,S){for(var w=y+"",b,k=0;k<w.length;)S[u&k]=u&(b^=S[u&k]*19)+w.charCodeAt(k++);return E(S)}function C(){try{var y;return d&&(y=d.randomBytes)?y=y(i):(y=new Uint8Array(i),(t.crypto||t.msCrypto).getRandomValues(y)),E(y)}catch{var S=t.navigator,w=S&&S.plugins;return[+new Date,t,w,t.screen,E(n)]}}function E(y){return String.fromCharCode.apply(0,y)}if(T(o.random(),n),e.exports){e.exports=p;try{d=Ls}catch{}}else o["seed"+a]=p})(typeof self<"u"?self:Bs,[],Math)})(Qe)),Qe.exports}var xt,Vn;function $s(){if(Vn)return xt;Vn=1;var e=vs(),t=ks(),n=Cs(),o=Rs(),i=Is(),r=xs(),c=Fs();return c.alea=e,c.xor128=t,c.xorwow=n,c.xorshift7=o,c.xor4096=i,c.tychei=r,xt=c,xt}var Ds=$s();const Os=bs(Ds),ot=["ability","able","aboard","about","above","accept","accident","according","account","accurate","acres","across","act","action","active","activity","actual","actually","add","addition","additional","adjective","adult","adventure","advice","affect","afraid","after","afternoon","again","against","age","ago","agree","ahead","aid","air","airplane","alike","alive","all","allow","almost","alone","along","aloud","alphabet","already","also","although","am","among","amount","ancient","angle","angry","animal","announced","another","answer","ants","any","anybody","anyone","anything","anyway","anywhere","apart","apartment","appearance","apple","applied","appropriate","are","area","arm","army","around","arrange","arrangement","arrive","arrow","art","article","as","aside","ask","asleep","at","ate","atmosphere","atom","atomic","attached","attack","attempt","attention","audience","author","automobile","available","average","avoid","aware","away","baby","back","bad","badly","bag","balance","ball","balloon","band","bank","bar","bare","bark","barn","base","baseball","basic","basis","basket","bat","battle","be","bean","bear","beat","beautiful","beauty","became","because","become","becoming","bee","been","before","began","beginning","begun","behavior","behind","being","believed","bell","belong","below","belt","bend","beneath","bent","beside","best","bet","better","between","beyond","bicycle","bigger","biggest","bill","birds","birth","birthday","bit","bite","black","blank","blanket","blew","blind","block","blood","blow","blue","board","boat","body","bone","book","border","born","both","bottle","bottom","bound","bow","bowl","box","boy","brain","branch","brass","brave","bread","break","breakfast","breath","breathe","breathing","breeze","brick","bridge","brief","bright","bring","broad","broke","broken","brother","brought","brown","brush","buffalo","build","building","built","buried","burn","burst","bus","bush","business","busy","but","butter","buy","by","cabin","cage","cake","call","calm","came","camera","camp","can","canal","cannot","cap","capital","captain","captured","car","carbon","card","care","careful","carefully","carried","carry","case","cast","castle","cat","catch","cattle","caught","cause","cave","cell","cent","center","central","century","certain","certainly","chain","chair","chamber","chance","change","changing","chapter","character","characteristic","charge","chart","check","cheese","chemical","chest","chicken","chief","child","children","choice","choose","chose","chosen","church","circle","circus","citizen","city","class","classroom","claws","clay","clean","clear","clearly","climate","climb","clock","close","closely","closer","cloth","clothes","clothing","cloud","club","coach","coal","coast","coat","coffee","cold","collect","college","colony","color","column","combination","combine","come","comfortable","coming","command","common","community","company","compare","compass","complete","completely","complex","composed","composition","compound","concerned","condition","congress","connected","consider","consist","consonant","constantly","construction","contain","continent","continued","contrast","control","conversation","cook","cookies","cool","copper","copy","corn","corner","correct","correctly","cost","cotton","could","count","country","couple","courage","course","court","cover","cow","cowboy","crack","cream","create","creature","crew","crop","cross","crowd","cry","cup","curious","current","curve","customs","cut","cutting","daily","damage","dance","danger","dangerous","dark","darkness","date","daughter","dawn","day","dead","deal","dear","death","decide","declared","deep","deeply","deer","definition","degree","depend","depth","describe","desert","design","desk","detail","determine","develop","development","diagram","diameter","did","die","differ","difference","different","difficult","difficulty","dig","dinner","direct","direction","directly","dirt","dirty","disappear","discover","discovery","discuss","discussion","disease","dish","distance","distant","divide","division","do","doctor","does","dog","doing","doll","dollar","done","donkey","door","dot","double","doubt","down","dozen","draw","drawn","dream","dress","drew","dried","drink","drive","driven","driver","driving","drop","dropped","drove","dry","duck","due","dug","dull","during","dust","duty","each","eager","ear","earlier","early","earn","earth","easier","easily","east","easy","eat","eaten","edge","education","effect","effort","egg","eight","either","electric","electricity","element","elephant","eleven","else","empty","end","enemy","energy","engine","engineer","enjoy","enough","enter","entire","entirely","environment","equal","equally","equator","equipment","escape","especially","essential","establish","even","evening","event","eventually","ever","every","everybody","everyone","everything","everywhere","evidence","exact","exactly","examine","example","excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise","exist","expect","experience","experiment","explain","explanation","explore","express","expression","extra","eye","face","facing","fact","factor","factory","failed","fair","fairly","fall","fallen","familiar","family","famous","far","farm","farmer","farther","fast","fastened","faster","fat","father","favorite","fear","feathers","feature","fed","feed","feel","feet","fell","fellow","felt","fence","few","fewer","field","fierce","fifteen","fifth","fifty","fight","fighting","figure","fill","film","final","finally","find","fine","finest","finger","finish","fire","fireplace","firm","first","fish","five","fix","flag","flame","flat","flew","flies","flight","floating","floor","flow","flower","fly","fog","folks","follow","food","foot","football","for","force","foreign","forest","forget","forgot","forgotten","form","former","fort","forth","forty","forward","fought","found","four","fourth","fox","frame","free","freedom","frequently","fresh","friend","friendly","frighten","frog","from","front","frozen","fruit","fuel","full","fully","fun","function","funny","fur","furniture","further","future","gain","game","garage","garden","gas","gasoline","gate","gather","gave","general","generally","gentle","gently","get","getting","giant","gift","girl","give","given","giving","glad","glass","globe","go","goes","gold","golden","gone","good","goose","got","government","grabbed","grade","gradually","grain","grandfather","grandmother","graph","grass","gravity","gray","great","greater","greatest","greatly","green","grew","ground","group","grow","grown","growth","guard","guess","guide","gulf","gun","habit","had","hair","half","halfway","hall","hand","handle","handsome","hang","happen","happened","happily","happy","harbor","hard","harder","hardly","has","hat","have","having","hay","he","headed","heading","health","heard","hearing","heart","heat","heavy","height","held","hello","help","helpful","her","herd","here","herself","hidden","hide","high","higher","highest","highway","hill","him","himself","his","history","hit","hold","hole","hollow","home","honor","hope","horn","horse","hospital","hot","hour","house","how","however","huge","human","hundred","hung","hungry","hunt","hunter","hurried","hurry","hurt","husband","ice","idea","identity","if","ill","image","imagine","immediately","importance","important","impossible","improve","in","inch","include","including","income","increase","indeed","independent","indicate","individual","industrial","industry","influence","information","inside","instance","instant","instead","instrument","interest","interior","into","introduced","invented","involved","iron","is","island","it","its","itself","jack","jar","jet","job","join","joined","journey","joy","judge","jump","jungle","just","keep","kept","key","kids","kill","kind","kitchen","knew","knife","know","knowledge","known","label","labor","lack","lady","laid","lake","lamp","land","language","large","larger","largest","last","late","later","laugh","law","lay","layers","lead","leader","leaf","learn","least","leather","leave","leaving","led","left","leg","length","lesson","let","letter","level","library","lie","life","lift","light","like","likely","limited","line","lion","lips","liquid","list","listen","little","live","living","load","local","locate","location","log","lonely","long","longer","look","loose","lose","loss","lost","lot","loud","love","lovely","low","lower","luck","lucky","lunch","lungs","lying","machine","machinery","mad","made","magic","magnet","mail","main","mainly","major","make","making","man","managed","manner","manufacturing","many","map","mark","market","married","mass","massage","master","material","mathematics","matter","may","maybe","me","meal","mean","means","meant","measure","meat","medicine","meet","melted","member","memory","men","mental","merely","met","metal","method","mice","middle","might","mighty","mile","military","milk","mill","mind","mine","minerals","minute","mirror","missing","mission","mistake","mix","mixture","model","modern","molecular","moment","money","monkey","month","mood","moon","more","morning","most","mostly","mother","motion","motor","mountain","mouse","mouth","move","movement","movie","moving","mud","muscle","music","musical","must","my","myself","mysterious","nails","name","nation","national","native","natural","naturally","nature","near","nearby","nearer","nearest","nearly","necessary","neck","needed","needle","needs","negative","neighbor","neighborhood","nervous","nest","never","new","news","newspaper","next","nice","night","nine","no","nobody","nodded","noise","none","noon","nor","north","nose","not","note","noted","nothing","notice","noun","now","number","numeral","nuts","object","observe","obtain","occasionally","occur","ocean","of","off","offer","office","officer","official","oil","old","older","oldest","on","once","one","only","onto","open","operation","opinion","opportunity","opposite","or","orange","orbit","order","ordinary","organization","organized","origin","original","other","ought","our","ourselves","out","outer","outline","outside","over","own","owner","oxygen","pack","package","page","paid","pain","paint","pair","palace","pale","pan","paper","paragraph","parallel","parent","park","part","particles","particular","particularly","partly","parts","party","pass","passage","past","path","pattern","pay","peace","pen","pencil","people","per","percent","perfect","perfectly","perhaps","period","person","personal","pet","phrase","physical","piano","pick","picture","pictured","pie","piece","pig","pile","pilot","pine","pink","pipe","pitch","place","plain","plan","plane","planet","planned","planning","plant","plastic","plate","plates","play","pleasant","please","pleasure","plenty","plural","plus","pocket","poem","poet","poetry","point","pole","police","policeman","political","pond","pony","pool","poor","popular","population","porch","port","position","positive","possible","possibly","post","pot","potatoes","pound","pour","powder","power","powerful","practical","practice","prepare","present","president","press","pressure","pretty","prevent","previous","price","pride","primitive","principal","principle","printed","private","prize","probably","problem","process","produce","product","production","program","progress","promised","proper","properly","property","protection","proud","prove","provide","public","pull","pupil","pure","purple","purpose","push","put","putting","quarter","queen","question","quick","quickly","quiet","quietly","quite","rabbit","race","radio","railroad","rain","raise","ran","ranch","range","rapidly","rate","rather","raw","rays","reach","read","reader","ready","real","realize","rear","reason","recall","receive","recent","recently","recognize","record","red","refer","refused","region","regular","related","relationship","religious","remain","remarkable","remember","remove","repeat","replace","replied","report","represent","require","research","respect","rest","result","return","review","rhyme","rhythm","rice","rich","ride","riding","right","ring","rise","rising","river","road","roar","rock","rocket","rocky","rod","roll","roof","room","root","rope","rose","rough","round","route","row","rubbed","rubber","rule","ruler","run","running","rush","sad","saddle","safe","safety","said","sail","sale","salmon","salt","same","sand","sang","sat","satellites","satisfied","save","saved","saw","say","scale","scared","scene","school","science","scientific","scientist","score","screen","sea","search","season","seat","second","secret","section","see","seed","seeing","seems","seen","seldom","select","selection","sell","send","sense","sent","sentence","separate","series","serious","serve","service","sets","setting","settle","settlers","seven","several","shade","shadow","shake","shaking","shall","shallow","shape","share","sharp","she","sheep","sheet","shelf","shells","shelter","shine","shinning","ship","shirt","shoe","shoot","shop","shore","short","shorter","shot","should","shoulder","shout","show","shown","shut","sick","sides","sight","sign","signal","silence","silent","silk","silly","silver","similar","simple","simplest","simply","since","sing","single","sink","sister","sit","sitting","situation","six","size","skill","skin","sky","slabs","slave","sleep","slept","slide","slight","slightly","slip","slipped","slope","slow","slowly","small","smaller","smallest","smell","smile","smoke","smooth","snake","snow","so","soap","social","society","soft","softly","soil","solar","sold","soldier","solid","solution","solve","some","somebody","somehow","someone","something","sometime","somewhere","son","song","soon","sort","sound","source","south","southern","space","speak","special","species","specific","speech","speed","spell","spend","spent","spider","spin","spirit","spite","split","spoken","sport","spread","spring","square","stage","stairs","stand","standard","star","stared","start","state","statement","station","stay","steady","steam","steel","steep","stems","step","stepped","stick","stiff","still","stock","stomach","stone","stood","stop","stopped","store","storm","story","stove","straight","strange","stranger","straw","stream","street","strength","stretch","strike","string","strip","strong","stronger","struck","structure","struggle","stuck","student","studied","studying","subject","substance","success","successful","such","sudden","suddenly","sugar","suggest","suit","sum","summer","sun","sunlight","supper","supply","support","suppose","sure","surface","surprise","surrounded","swam","sweet","swept","swim","swimming","swing","swung","syllable","symbol","system","table","tail","take","taken","tales","talk","tall","tank","tape","task","taste","taught","tax","tea","teach","teacher","team","tears","teeth","telephone","television","tell","temperature","ten","tent","term","terrible","test","than","thank","that","thee","them","themselves","then","theory","there","therefore","these","they","thick","thin","thing","think","third","thirty","this","those","thou","though","thought","thousand","thread","three","threw","throat","through","throughout","throw","thrown","thumb","thus","thy","tide","tie","tight","tightly","till","time","tin","tiny","tip","tired","title","to","tobacco","today","together","told","tomorrow","tone","tongue","tonight","too","took","tool","top","topic","torn","total","touch","toward","tower","town","toy","trace","track","trade","traffic","trail","train","transportation","trap","travel","treated","tree","triangle","tribe","trick","tried","trip","troops","tropical","trouble","truck","trunk","truth","try","tube","tune","turn","twelve","twenty","twice","two","type","typical","uncle","under","underline","understanding","unhappy","union","unit","universe","unknown","unless","until","unusual","up","upon","upper","upward","us","use","useful","using","usual","usually","valley","valuable","value","vapor","variety","various","vast","vegetable","verb","vertical","very","vessels","victory","view","village","visit","visitor","voice","volume","vote","vowel","voyage","wagon","wait","walk","wall","want","war","warm","warn","was","wash","waste","watch","water","wave","way","we","weak","wealth","wear","weather","week","weigh","weight","welcome","well","went","were","west","western","wet","whale","what","whatever","wheat","wheel","when","whenever","where","wherever","whether","which","while","whispered","whistle","white","who","whole","whom","whose","why","wide","widely","wife","wild","will","willing","win","wind","window","wing","winter","wire","wise","wish","with","within","without","wolf","women","won","wonder","wonderful","wood","wooden","wool","word","wore","work","worker","world","worried","worry","worse","worth","would","wrapped","write","writer","writing","written","wrong","wrote","yard","year","yellow","yes","yesterday","yet","you","young","younger","your","yourself","youth","zero","zebra","zipper","zoo","zulu"],Mt=ot.reduce((e,t)=>t.length<e.length?t:e).length,Pt=ot.reduce((e,t)=>t.length>e.length?t:e).length;function qs(e){const t=e?.seed?new Os(e.seed):null,{minLength:n,maxLength:o,...i}=e||{};function r(){let p=typeof n!="number"?Mt:a(n);const h=typeof o!="number"?Pt:a(o);p>h&&(p=h);let g=!1,m;for(;!g;)m=c(),g=m.length<=h&&m.length>=p;return m}function c(){return ot[s(ot.length)]}function a(p){return p<Mt&&(p=Mt),p>Pt&&(p=Pt),p}function s(p){const h=t?t():Math.random();return Math.floor(h*p)}if(e===void 0)return r();if(typeof e=="number")e={exactly:e};else if(Object.keys(i).length===0)return r();e.exactly&&(e.min=e.exactly,e.max=e.exactly),typeof e.wordsPerString!="number"&&(e.wordsPerString=1),typeof e.formatter!="function"&&(e.formatter=p=>p),typeof e.separator!="string"&&(e.separator=" ");const l=e.min+s(e.max+1-e.min);let f=[],u="",d=0;for(let p=0;p<l*e.wordsPerString;p++)d===e.wordsPerString-1?u+=e.formatter(r(),d):u+=e.formatter(r(),d)+e.separator,d++,(p+1)%e.wordsPerString===0&&(f.push(u),u="",d=0);return typeof e.join=="string"&&(f=f.join(e.join)),f}const Fo=e=>`${e}×`,$o=e=>`${e.toFixed(1)}×`;function Do(){const e=qs({exactly:1,minLength:3,maxLength:8});return Array.isArray(e)?e[0]??"seed":e}function Ws(e,t){t.compareToggle.checked=e.compare,t.layout.dataset.mode=e.compare?"compare":"single",t.seedInput.value=e.seed,t.speedInput.value=String(e.speed),t.speedLabel.textContent=Fo(e.speed),t.intensityInput.value=String(e.intensity),t.intensityLabel.textContent=$o(e.intensity),ie(t.paneA,e.strategyA),ie(t.paneB,e.strategyB),oe(t.paneA,e.repositionA),oe(t.paneB,e.repositionB),lo(t,e.scenario);const n=N(e.scenario);Object.keys(e.overrides).length>0&&Bo(t,!0),st(n,e.overrides,t)}function xe(e,t){const n=!e.shortcutSheet.hidden;t!==n&&(e.shortcutSheet.hidden=!t,t?e.shortcutSheetClose.focus():e.shortcutsBtn.focus())}function Oo(e,t){const n=e.traffic.phases().length>0;t.phaseStrip&&(t.phaseStrip.hidden=!n);const o=t.phaseLabel;if(!o)return;const i=n&&e.traffic.currentPhaseLabel()||"—";o.textContent!==i&&(o.textContent=i)}function qo(e,t){if(!t.phaseProgress)return;const o=`${Math.round(e.traffic.progressInPhase()*1e3)/10}%`;t.phaseProgress.style.width!==o&&(t.phaseProgress.style.width=o)}function Ns(e){if(e.length<2)return"M 0 13 L 100 13";let t=e[0]??0,n=e[0]??0;for(let c=1;c<e.length;c++){const a=e[c];a!==void 0&&(a<t&&(t=a),a>n&&(n=a))}const o=n-t,i=e.length;let r="";for(let c=0;c<i;c++){const a=c/(i-1)*100,s=o>0?13-((e[c]??0)-t)/o*12:7;r+=`${c===0?"M":"L"} ${a.toFixed(2)} ${s.toFixed(2)} `}return r.trim()}const Ht=[["wait avg","avg_wait_s"],["wait max","max_wait_s"],["delivered","delivered"],["abandoned","abandoned"],["util","utilization"]];function Hs(e,t){switch(t){case"avg_wait_s":return`${e.avg_wait_s.toFixed(1)} s`;case"max_wait_s":return`${e.max_wait_s.toFixed(1)} s`;case"delivered":return String(e.delivered);case"abandoned":return String(e.abandoned);case"utilization":return`${(e.utilization*100).toFixed(0)}%`}}function Gs(e,t,n){const o=Xn(e,n),i=Xn(t,n),r=o-i,c=r>0?"▲":"▼",a=r>0?"+":r<0?"−":"",s=Math.abs(r);switch(n){case"avg_wait_s":case"max_wait_s":return`${c} ${a}${s.toFixed(1)} s`;case"delivered":case"abandoned":return`${c} ${a}${s.toFixed(0)}`;case"utilization":return`${c} ${a}${(s*100).toFixed(0)}%`}}function Xn(e,t){switch(t){case"avg_wait_s":return e.avg_wait_s;case"max_wait_s":return e.max_wait_s;case"delivered":return e.delivered;case"abandoned":return e.abandoned;case"utilization":return e.utilization}}function Us(e,t){const n=(p,h,g,m)=>Math.abs(p-h)<g?["tie","tie"]:(m?p>h:p<h)?["win","lose"]:["lose","win"],[o,i]=n(e.avg_wait_s,t.avg_wait_s,.05,!1),[r,c]=n(e.max_wait_s,t.max_wait_s,.05,!1),[a,s]=n(e.delivered,t.delivered,.5,!0),[l,f]=n(e.abandoned,t.abandoned,.5,!1),[u,d]=n(e.utilization,t.utilization,.005,!0);return{a:{avg_wait_s:o,max_wait_s:r,delivered:a,abandoned:l,utilization:u},b:{avg_wait_s:i,max_wait_s:c,delivered:s,abandoned:f,utilization:d}}}function Yn(e){const t=document.createDocumentFragment();for(const[n]of Ht){const o=Z("div","metric-row flex flex-col gap-[2px] px-2 py-1 text-right"),i=document.createElementNS("http://www.w3.org/2000/svg","svg");i.classList.add("metric-spark"),i.setAttribute("viewBox","0 0 100 14"),i.setAttribute("preserveAspectRatio","none"),i.appendChild(document.createElementNS("http://www.w3.org/2000/svg","path")),o.append(Z("span","metric-k",n),Z("span","metric-v"),Z("span","metric-d"),i),t.appendChild(o)}e.replaceChildren(t)}function Lt(e,t,n,o,i){const r=e.children;for(let c=0;c<Ht.length;c++){const a=r[c];if(!a)continue;const s=Ht[c];if(!s)continue;const l=s[1],f=n?n[l]:"";a.dataset.verdict!==f&&(a.dataset.verdict=f);const u=a.children[1],d=Hs(t,l);u.textContent!==d&&(u.textContent=d);const p=a.children[2],g=i!==null&&f!=="tie"&&f!==""?Gs(t,i,l):"";p.textContent!==g&&(p.textContent=g);const T=a.children[3].firstElementChild,C=Ns(o[l]);T.getAttribute("d")!==C&&T.setAttribute("d",C)}}const js=200;function Wo(e,t){e.traffic.setPhases(t.phases),e.traffic.setIntensity(e.permalink.intensity),e.traffic.setPatienceTicks(t.abandonAfterSec?Math.round(t.abandonAfterSec*60):0)}async function J(e,t){const n=++e.initToken;t.loader.classList.add("show");const o=N(e.permalink.scenario);e.traffic=new Ao(ao(e.permalink.seed)),Wo(e,o),Ce(e.paneA),Ce(e.paneB),e.paneA=null,e.paneB=null;try{const i=await xn(t.paneA,e.permalink.strategyA,e.permalink.repositionA,o,e.permalink.overrides);ie(t.paneA,e.permalink.strategyA),oe(t.paneA,e.permalink.repositionA),Yn(t.paneA.metrics);let r=null;if(e.permalink.compare)try{r=await xn(t.paneB,e.permalink.strategyB,e.permalink.repositionB,o,e.permalink.overrides),ie(t.paneB,e.permalink.strategyB),oe(t.paneB,e.permalink.repositionB),Yn(t.paneB.metrics)}catch(c){throw Ce(i),c}if(n!==e.initToken){Ce(i),Ce(r);return}e.paneA=i,e.paneB=r,e.seeding=o.seedSpawns>0?{remaining:o.seedSpawns}:null,Oo(e,t),qo(e,t),st(o,e.permalink.overrides,t)}catch(i){throw n===e.initToken&&G(t.toast,`Init failed: ${i.message}`),i}finally{n===e.initToken&&t.loader.classList.remove("show")}}function zs(e){if(!e.seeding||!e.paneA)return;const t=e.paneA.sim.snapshot(),n=4/60;for(let o=0;o<js&&e.seeding.remaining>0;o++){const i=e.traffic.drainSpawns(t,n);for(const r of i)if(xo(e,c=>{const a=c.sim.spawnRider(r.originStopId,r.destStopId,r.weight,r.patienceTicks);a.kind==="err"&&console.warn(`spawnRider failed (seed): ${a.error}`)}),e.seeding.remaining-=1,e.seeding.remaining<=0)break}e.seeding.remaining<=0&&(Wo(e,N(e.permalink.scenario)),e.seeding=null)}function Vs(e,t){const n=()=>J(e,t),o={renderPaneStrategyInfo:ie,renderPaneRepositionInfo:oe,refreshStrategyPopovers:()=>{Ae(e,t,n),Ie(e,t,n)},renderTweakPanel:()=>{const r=N(e.permalink.scenario);st(r,e.permalink.overrides,t)}};t.scenarioCards.addEventListener("click",r=>{const c=r.target;if(!(c instanceof HTMLElement))return;const a=c.closest(".scenario-card");if(!a)return;const s=a.dataset.scenarioId;!s||s===e.permalink.scenario||po(e,t,s,n,o)}),Dn(e,t,t.paneA,n),Dn(e,t,t.paneB,n),Bn(e,t,t.paneA,n),Bn(e,t,t.paneB,n),Ae(e,t,n),Ie(e,t,n),t.compareToggle.addEventListener("change",()=>{e.permalink={...e.permalink,compare:t.compareToggle.checked},W(e.permalink),t.layout.dataset.mode=e.permalink.compare?"compare":"single",Ae(e,t,n),Ie(e,t,n),J(e,t).then(()=>{G(t.toast,e.permalink.compare?"Compare on":"Compare off")})}),t.seedInput.addEventListener("change",()=>{const r=t.seedInput.value.trim()||$.seed;t.seedInput.value=r,r!==e.permalink.seed&&(e.permalink={...e.permalink,seed:r},W(e.permalink),J(e,t))}),t.seedShuffleBtn.addEventListener("click",()=>{const r=Do();t.seedInput.value=r,e.permalink={...e.permalink,seed:r},W(e.permalink),J(e,t).then(()=>{G(t.toast,`Seed: ${r}`)})}),t.speedInput.addEventListener("input",()=>{const r=Number(t.speedInput.value);e.permalink.speed=r,t.speedLabel.textContent=Fo(r)}),t.speedInput.addEventListener("change",()=>{W(e.permalink)}),t.intensityInput.addEventListener("input",()=>{const r=Number(t.intensityInput.value);e.permalink.intensity=r,e.traffic.setIntensity(r),t.intensityLabel.textContent=$o(r)}),t.intensityInput.addEventListener("change",()=>{W(e.permalink)});const i=()=>{const r=e.running?"Pause":"Play";t.playBtn.dataset.state=e.running?"running":"paused",t.playBtn.setAttribute("aria-label",r),t.playBtn.title=r};i(),t.playBtn.addEventListener("click",()=>{e.running=!e.running,i()}),t.resetBtn.addEventListener("click",()=>{J(e,t),G(t.toast,"Reset")}),t.tweakBtn.addEventListener("click",()=>{const r=t.tweakBtn.getAttribute("aria-expanded")!=="true";Bo(t,r)});for(const r of me){const c=t.tweakRows[r];tn(c.dec,()=>{Ge(e,t,r,-1,n)}),tn(c.inc,()=>{Ge(e,t,r,1,n)}),c.reset.addEventListener("click",()=>{hs(e,t,r,n)}),c.root.addEventListener("keydown",a=>{a.key==="ArrowUp"||a.key==="ArrowRight"?(a.preventDefault(),Ge(e,t,r,1,n)):(a.key==="ArrowDown"||a.key==="ArrowLeft")&&(a.preventDefault(),Ge(e,t,r,-1,n))})}t.tweakResetAllBtn.addEventListener("click",()=>{gs(e,t,n)}),t.shareBtn.addEventListener("click",()=>{const r=ro(e.permalink),c=`${window.location.origin}${window.location.pathname}${r}`;window.history.replaceState(null,"",r),navigator.clipboard.writeText(c).then(()=>{G(t.toast,"Permalink copied")},()=>{G(t.toast,"Permalink copied")})}),t.shortcutsBtn.addEventListener("click",()=>{xe(t,t.shortcutSheet.hidden)}),t.shortcutSheetClose.addEventListener("click",()=>{xe(t,!1)}),t.shortcutSheet.addEventListener("click",r=>{r.target===t.shortcutSheet&&xe(t,!1)}),Xs(e,t,o),ds(t)}function Xs(e,t,n){window.addEventListener("keydown",o=>{if(e.permalink.mode==="quest")return;if(o.target instanceof HTMLElement){const r=o.target.tagName;if(r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||o.target.isContentEditable||o.target.closest(".monaco-editor"))return}if(o.metaKey||o.ctrlKey||o.altKey)return;switch(o.key){case" ":{o.preventDefault(),t.playBtn.click();return}case"r":case"R":{o.preventDefault(),t.resetBtn.click();return}case"c":case"C":{o.preventDefault(),t.compareToggle.click();return}case"s":case"S":{o.preventDefault(),t.shareBtn.click();return}case"t":case"T":{o.preventDefault(),t.tweakBtn.click();return}case"?":case"/":{o.preventDefault(),xe(t,t.shortcutSheet.hidden);return}case"Escape":{if(Lo(t)||Po(t)){o.preventDefault(),at(t);return}t.shortcutSheet.hidden||(o.preventDefault(),xe(t,!1));return}}const i=Number(o.key);if(Number.isInteger(i)&&i>=1&&i<=Pe.length){const r=Pe[i-1];if(!r)return;r.id!==e.permalink.scenario&&(o.preventDefault(),po(e,t,r.id,()=>J(e,t),n))}})}const Ys="elevator-core playground",Kn="In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";function Qn(e){Yo(Ks(e))}function Ks(e){if(e.mode==="quest")return{title:`Quest curriculum — ${Ys}`,description:"Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time."};const n=N(e.scenario).label,o=ge[e.strategyA],i=ge[e.strategyB],r=Le[e.repositionA],c=Le[e.repositionB];if(e.compare){const l=`${n}: ${o} vs ${i} — Elevator dispatch playground`,f=`Compare ${o} (parking: ${r}) against ${i} (parking: ${c}) dispatch on the ${n.toLowerCase()} scenario. ${Kn}`;return{title:l,description:f}}const a=`${n}: ${o} dispatch — Elevator dispatch playground`,s=`Watch ${o} dispatch (parking: ${r}) handle live rider traffic on the ${n.toLowerCase()} scenario. ${Kn}`;return{title:a,description:s}}function Jn(e,t){e.sim.step(t);const n=e.sim.drainEvents();if(n.length===0)return null;const o=e.sim.snapshot();rs(e,n,o);const i=new Map;for(const r of o.cars)i.set(r.id,r.line);for(const r of n)if(r.kind==="elevator-assigned"){const c=i.get(r.elevator);c!==void 0&&e.renderer.pushAssignment(r.stop,r.elevator,c)}return o}function Qs(e){const t=e.paneA;if(!t?.latestMetrics)return;const n=e.paneB;if(n?.latestMetrics){const o=Us(t.latestMetrics,n.latestMetrics);Lt(t.metricsEl,t.latestMetrics,o.a,t.metricHistory,n.latestMetrics),Lt(n.metricsEl,n.latestMetrics,o.b,n.metricHistory,t.latestMetrics)}else Lt(t.metricsEl,t.latestMetrics,null,t.metricHistory,null);Pn(t),n&&Pn(n)}function Js(e,t){let n=0;const o=()=>{const i=performance.now(),r=(i-e.lastFrameTime)/1e3;e.lastFrameTime=i;const c=e.paneA,a=e.paneB,s=c!==null&&(!e.permalink.compare||a!==null);if(e.running&&e.ready&&s){const l=e.permalink.speed;let f=Jn(c,l);a&&Jn(a,l),e.seeding&&(zs(e),f=null);const d=Math.min(r,4/60)*l;let p=[];if(!e.seeding){const m=f??c.sim.snapshot();p=e.traffic.drainSpawns(m,d),f=m}for(const m of p)xo(e,T=>{const C=T.sim.spawnRider(m.originStopId,m.destStopId,m.weight,m.patienceTicks);C.kind==="err"&&console.warn(`spawnRider failed: ${C.error}`)});const h=e.permalink.speed,g=p.length>0||f===null?c.sim.snapshot():f;Mn(c,g,h),a&&Mn(a,a.sim.snapshot(),h),Qs(e),(n+=1)%4===0&&(Oo(e,t),qo(e,t))}requestAnimationFrame(o)};requestAnimationFrame(o)}async function Zs(){Io().catch(()=>{});const t=ls(),n=new URLSearchParams(window.location.search).has("k"),o={...$,...gi(window.location.search)};if(!n){o.seed=Do();const a=new URL(window.location.href);a.searchParams.set("k",o.seed),window.history.replaceState(null,"",a.toString())}ki(o);const i=N(o.scenario),r=new URLSearchParams(window.location.search);i.defaultReposition!==void 0&&(r.has("pa")||(o.repositionA=i.defaultReposition),r.has("pb")||(o.repositionB=i.defaultReposition)),o.overrides=Zn(i,o.overrides),Ti(o.mode),Ri(o.mode),Ws(o,t);const c={running:!0,ready:!1,permalink:o,paneA:null,paneB:null,traffic:new Ao(ao(o.seed)),lastFrameTime:performance.now(),initToken:0,seeding:null};if(Vs(c,t),fi(Qn),Qn(o),Xo(),await J(c,t),c.ready=!0,Js(c,t),c.permalink.mode==="quest"){const a=new URLSearchParams(window.location.search).has("qs");await Qa({initialStageId:c.permalink.questStage,landOn:a?"stage":"grid",onStageChange:s=>{c.permalink.questStage=s,W(c.permalink)},onBackToGrid:()=>{c.permalink.questStage=$.questStage,W(c.permalink)}})}}Zs();export{et as _};
