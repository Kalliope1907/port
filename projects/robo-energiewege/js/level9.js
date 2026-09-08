const $=s=>document.querySelector(s); const Tutor=window.BinaryGame;

const NODES={
  hub:{label:'Robo-Hub',x:75,y:270,icon:'🤖'},
  werk:{label:'Werkstatt',x:225,y:85,icon:'🔧'},
  bridge:{label:'Brücke',x:225,y:270,icon:'🌉'},
  park:{label:'Park',x:225,y:455,icon:'🌳'},
  solar:{label:'Solardach',x:430,y:65,icon:'☀️'},
  relay:{label:'Verteiler',x:430,y:190,icon:'⚙️'},
  tunnel:{label:'Tunnel',x:430,y:350,icon:'🚇'},
  depot:{label:'Depot',x:430,y:475,icon:'📦'},
  antenna:{label:'Antenne',x:650,y:85,icon:'📡'},
  lab:{label:'Energie-Labor',x:650,y:260,icon:'🧪'},
  plaza:{label:'Robo-Platz',x:650,y:435,icon:'🧭'},
  tower:{label:'Ladeturm',x:880,y:260,icon:'🔋'}
};

// Jede Verbindung kommt genau einmal vor. Die Anordnung ist bewusst geschichtet,
// damit sich die Wege möglichst nicht kreuzen und die Kosten lesbar bleiben.
const EDGES=[
  ['hub','werk',4],['hub','bridge',2],['hub','park',3],
  ['werk','bridge',5],['bridge','park',4],
  ['werk','solar',3],['werk','relay',5],
  ['bridge','relay',2],['bridge','tunnel',4],
  ['park','tunnel',2],['park','depot',3],
  ['solar','relay',3],['relay','tunnel',4],['tunnel','depot',2],
  ['solar','antenna',2],['solar','lab',6],
  ['relay','lab',2],
  ['tunnel','lab',3],['tunnel','plaza',2],
  ['depot','plaza',2],
  ['antenna','lab',3],['lab','plaza',2],
  ['antenna','tower',5],['lab','tower',2],['plaza','tower',4]
];

const MISSIONS=[
  {start:'hub',target:'tower',title:'Vom Robo-Hub zum Ladeturm'},
  {start:'park',target:'antenna',title:'Vom Park zur Antenne'},
  {start:'werk',target:'plaza',title:'Von der Werkstatt zum Robo-Platz'}
];

const state={round:0,path:[],cost:0,optimalRounds:0,hints:0,complete:false,history:[],results:[]};
function neighbors(id){return EDGES.flatMap(([a,b,w])=>a===id?[[b,w]]:b===id?[[a,w]]:[])}
function edgeCost(a,b){const e=EDGES.find(([x,y])=>(x===a&&y===b)||(x===b&&y===a));return e?e[2]:null}
function dijkstra(start,target){
  const dist={},prev={},q=new Set(Object.keys(NODES));
  Object.keys(NODES).forEach(n=>dist[n]=Infinity); dist[start]=0;
  while(q.size){
    let u=null; for(const n of q) if(u===null||dist[n]<dist[u]) u=n;
    if(u===null||dist[u]===Infinity) break;
    q.delete(u); if(u===target) break;
    for(const [v,w] of neighbors(u)){
      if(!q.has(v)) continue; const nd=dist[u]+w;
      if(nd<dist[v]){dist[v]=nd;prev[v]=u}
    }
  }
  const path=[]; let cur=target;
  if(dist[target]!==Infinity){while(cur){path.unshift(cur);if(cur===start)break;cur=prev[cur]}}
  return{cost:dist[target],path};
}
const OPT=MISSIONS.map(m=>dijkstra(m.start,m.target));

const tutor=Tutor.setupTutor({
  introKey:'level9',
  introMessage:'So geht das Spiel: Starte am markierten Ort und klicke benachbarte Stationen bis zum Ziel. Addiere dabei die Zahlen der Leitungen. Gesucht ist nicht der optisch kürzeste, sondern der günstigste Weg.',
  learningGoal:'Ein Kind versteht gewichtete Graphen und die Idee eines günstigsten Weges.',
  getFacts:()=>({mission:state.round+1,start:MISSIONS[state.round]?.start,target:MISSIONS[state.round]?.target,path:state.path,cost:state.cost,optimalCost:OPT[state.round]?.cost}),
  history:state.history,
  offlineReply:q=>{
    const l=q.toLowerCase();
    if(l.includes('dijkstra'))return{message:'Dijkstra ist ein Algorithmus, der Schritt für Schritt die bisher günstigsten bekannten Wege vergleicht.',mood:'explaining'};
    if(l.includes('direkt')||l.includes('kurz'))return{message:'Ein Weg kann auf dem Bildschirm kurz aussehen und trotzdem viel Energie kosten. Entscheidend ist die Summe der Zahlen an den Leitungen.',mood:'explaining'};
    return{message:'Schau auf die Kosten der nächsten Verbindungen – und denke dabei schon ein oder zwei Stationen weiter.',mood:'questioning'};
  }
});

function currentMission(){return MISSIONS[state.round]}
function edgeKey(a,b){return [a,b].sort().join('|')}
function edgeGeometry(A,B){
  const x1=A.x,y1=A.y,x2=B.x,y2=B.y;
  const mx=(x1+x2)/2,my=(y1+y2)/2;
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;
  // Labels leicht seitlich versetzen, damit sie nicht mitten auf Knoten oder Nachbarlabels sitzen.
  const nx=-dy/len,ny=dx/len;
  const shift=Math.abs(dx)<40?22:14;
  return {d:`M ${x1} ${y1} L ${x2} ${y2}`,lx:mx+nx*shift,ly:my+ny*shift};
}

function renderMap(){
  const m=currentMission(); if(!m)return;
  const current=state.path.at(-1); const available=new Set(neighbors(current).map(([n])=>n));
  const walkedEdges=new Set();
  for(let i=1;i<state.path.length;i++) walkedEdges.add(edgeKey(state.path[i-1],state.path[i]));
  const svg=['<svg viewBox="0 0 960 540" role="img" aria-label="Stadtplan mit gewichteten Wegen">',
    '<defs><filter id="routeGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'];

  // Gegangene Verbindungen werden direkt im stabilen Grundnetz markiert.
  // So bleiben alle Segmente auch nach dem vollständigen Neuzeichnen des SVG erhalten.
  for(const [a,b,w] of EDGES){
    const A=NODES[a],B=NODES[b],key=edgeKey(a,b),g=edgeGeometry(A,B);
    svg.push(`<g class="city-edge ${walkedEdges.has(key)?'walked':''}" data-edge="${key}"><path d="${g.d}" vector-effect="non-scaling-stroke"/></g>`);
  }
  // Kostenlabels liegen immer über dem Grundnetz.
  for(const [a,b,w] of EDGES){
    const A=NODES[a],B=NODES[b],g=edgeGeometry(A,B);
    svg.push(`<g class="edge-cost"><rect x="${g.lx-17}" y="${g.ly-13}" rx="11" width="34" height="26"/><text x="${g.lx}" y="${g.ly+5}">${w}</text></g>`);
  }
  // Knoten liegen ganz oben.
  for(const [id,n] of Object.entries(NODES)){
    const start=id===m.start,target=id===m.target,used=state.path.includes(id),here=id===current,can=available.has(id);
    svg.push(`<g class="city-node ${start?'start':''} ${target?'target':''} ${used?'used':''} ${here?'here':''} ${can?'available':''}" data-node="${id}" tabindex="0" role="button" aria-label="${n.label}">
      <circle class="city-node-ring" cx="${n.x}" cy="${n.y}" r="38"/>
      <circle class="city-node-core" cx="${n.x}" cy="${n.y}" r="30"/>
      <text class="city-node-icon" x="${n.x}" y="${n.y+7}">${n.icon}</text>
      <text class="city-node-label" x="${n.x}" y="${n.y+54}">${n.label}</text>
      ${start?`<text class="city-node-tag" x="${n.x}" y="${n.y-47}">START</text>`:''}
      ${target?`<text class="city-node-tag" x="${n.x}" y="${n.y-47}">ZIEL</text>`:''}
    </g>`);
  }
  svg.push('</svg>'); $('#routeMap').innerHTML=svg.join('');
  document.querySelectorAll('.city-node').forEach(el=>{
    const go=()=>choose(el.dataset.node);
    el.addEventListener('click',go);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
  });
}

function render(){
  const m=currentMission();if(!m)return;
  $('#routeMission').textContent=`${state.round+1} von ${MISSIONS.length}`;
  $('#sideRound').textContent=`${state.round+1} von ${MISSIONS.length}`;
  $('#routeStartLabel').textContent=NODES[m.start].label;
  $('#routeTargetLabel').textContent=NODES[m.target].label;
  $('#routeCost').textContent=state.cost; $('#sideCost').textContent=`${state.cost} ⚡`;
  $('#optimalRounds').textContent=`${state.optimalRounds} / ${MISSIONS.length}`;
  $('#progressBar').style.width=`${Math.round(state.round/MISSIONS.length*100)}%`;
  $('#routePathLabel').textContent=state.path.map(x=>NODES[x].label).join(' → ');
  renderMap();
}
function initRound(){const m=currentMission();state.path=[m.start];state.cost=0;render()}
function choose(id){
  if(state.complete)return; const m=currentMission(),cur=state.path.at(-1); if(id===cur)return;
  const w=edgeCost(cur,id);
  if(w==null){window.RoboSound?.error();tutor.say(`Von ${NODES[cur].label} führt keine direkte Leitung nach ${NODES[id].label}. Die türkis markierten Stationen sind deine nächsten Möglichkeiten.`,'questioning');return}
  if(state.path.includes(id))tutor.say('Du gehst zu einer Station zurück, die schon auf deiner Route liegt. Das ist erlaubt, kostet aber zusätzliche Energie.','thinking');
  state.path.push(id); state.cost+=w; state.history.push({type:'route-step',from:cur,to:id,cost:w,total:state.cost}); render();
  if(id===m.target){setTimeout(finishRound,260)}
  else{const best=dijkstra(id,m.target);if(state.cost+best.cost>OPT[state.round].cost+5)tutor.say(`Du bist bei ${state.cost} Energie. Das Ziel ist noch erreichbar – aber es gibt vermutlich einen günstigeren Weg.`,'thinking')}
}
function undo(){if(state.path.length<=1)return;const b=state.path.pop(),a=state.path.at(-1);state.cost-=edgeCost(a,b);render()}
function finishRound(){
  const opt=OPT[state.round].cost,isOpt=state.cost===opt; state.results.push({cost:state.cost,opt});
  if(isOpt){state.optimalRounds++;window.RoboSound?.success();tutor.say(`Perfekt! ${state.cost} Energie – günstiger geht diese Route nicht.`,'success')}
  else tutor.say(`Ziel erreicht mit ${state.cost} Energie. Der günstigste Weg braucht ${opt}.`,'explaining');
  state.round++;
  if(state.round>=MISSIONS.length)setTimeout(finish,600);
  else setTimeout(()=>{initRound();tutor.say(`Neue Mission: ${MISSIONS[state.round].title}.`,'greeting')},760);
}
function finish(){
  state.complete=true; $('#progressBar').style.width='100%';
  const stars=state.optimalRounds===3&&state.hints===0?3:state.optimalRounds>=2?2:1;
  $('#rewardStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
  $('#rewardText').textContent=state.optimalRounds===3?'Du hast alle drei Routen mit minimalem Energieverbrauch gefunden.':'Du hast alle Ziele erreicht. Für „Optimal“ müssen alle drei Routen den kleinsten möglichen Energieverbrauch haben.';
  $('#rewardPanel').hidden=false;
  window.RoboProgress?.mark('level9',{completed:true,perfect:stars===3,bestStars:stars,bestMoves:state.results.reduce((s,r)=>s+r.cost,0)});
  tutor.say('Geschafft! Du hast Wege nicht nach ihrer Form, sondern nach ihren Kosten verglichen. Genau darum geht es bei gewichteten Graphen.','success');
}
function reset(){
  state.round=0;state.path=[];state.cost=0;state.optimalRounds=0;state.hints=0;state.complete=false;state.history.length=0;state.results.length=0;
  $('#rewardPanel').hidden=true;initRound();
  tutor.say('Die türkis markierten Stationen kannst du als Nächstes erreichen. Addiere die Zahlen an den Leitungen und suche den günstigsten Weg.','greeting',{auto:false});
}
$('#undoRouteBtn').onclick=undo;$('#resetBtn').onclick=reset;$('#replayBtn').onclick=reset;
$('#hintBtn').onclick=()=>{state.hints++;const m=currentMission(),cur=state.path.at(-1),best=dijkstra(cur,m.target);if(best.path.length>1)tutor.say(`Von hier aus ist ${NODES[best.path[1]].label} ein guter nächster Schritt.`,'questioning')};
$('#explainBtn').onclick=()=>{state.hints++;tutor.say('Jede Leitung hat Energiekosten. Addiere die Kosten deines gesamten Weges. Der beste Weg ist der mit der kleinsten Summe – nicht unbedingt der, der am kürzesten aussieht.','explaining')};
reset();
