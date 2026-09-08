const N=1,E=2,S=4,W=8;
const DIRS=[
  {bit:N,dr:-1,dc:0,opp:S,name:'oben'},
  {bit:E,dr:0,dc:1,opp:W,name:'rechts'},
  {bit:S,dr:1,dc:0,opp:N,name:'unten'},
  {bit:W,dr:0,dc:-1,opp:E,name:'links'}
];
const ROWS=5,COLS=7,TOTAL_BOTS=4,OPTIMAL=24;
const source={r:2,c:0,mask:E};
const bots=[
  {r:0,c:6,mask:W,name:'oben'},
  {r:2,c:6,mask:W,name:'Mitte'},
  {r:3,c:6,mask:W,name:'unten rechts'},
  {r:4,c:6,mask:W,name:'unten'}
];
const rawTiles=[
  [1,2,W|E|S,1],[2,2,W|E|N,2],[3,2,W|E,1],[4,2,W|E|S,3],[5,2,W|E,3],
  [2,1,N|S,1],[2,0,E|S,1],[3,0,W|E,3],[4,0,W|E,1],[5,0,W|E,3],
  [1,3,N|S,3],[1,4,N|E,2],[2,4,W|E,1],[3,4,W|E,3],[4,4,W|E,1],[5,4,W|E,3],
  [4,3,N|E,3],[5,3,W|E,1]
];
const tiles=rawTiles.map(([c,r,solution,initial])=>({c,r,solution,initial,rot:initial}));
const tileMap=new Map(tiles.map(t=>[`${t.r},${t.c}`,t]));
const botMap=new Map(bots.map((b,i)=>[`${b.r},${b.c}`,{...b,index:i}]));
const state={moves:0,hints:0,complete:false,maxBots:0,history:[],busy:false};

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const speechBubble=$('#speechBubble'),avatarOrbit=$('#avatarOrbit'),aiStatus=$('#aiStatus'),progressBar=$('#progressBar'),scoreLabel=$('#scoreLabel');
const rewardPanel=$('#rewardPanel'),rewardStars=$('#rewardStars'),rewardText=$('#rewardText');
const speakBtn=$('#speakBtn'),autoSpeakToggle=$('#autoSpeakToggle'),voiceSelect=$('#voiceSelect'),voiceControls=$('#voiceControls');
const aiApi=new window.TutorAPI();
const speech=new window.PetriPresentation.SpeechController({autoSpeak:true,onSpeakingChange:s=>{avatarOrbit.classList.toggle('speaking',s);speakBtn.textContent=s?'■ Stopp':'🔊 Vorlesen'}});
speech.init(voiceSelect);if(!speech.supported){voiceControls.hidden=true;autoSpeakToggle.checked=false}
let currentMessage='';

function rotateMask(mask,turns){
  let out=mask;
  for(let i=0;i<(turns%4+4)%4;i++) out=((out<<1)&15)|((out&8)>>3);
  return out;
}
function key(r,c){return `${r},${c}`}
function cellAt(r,c){
  if(r===source.r&&c===source.c)return{type:'source',mask:source.mask,r,c};
  const bot=botMap.get(key(r,c));if(bot)return{type:'bot',mask:bot.mask,r,c,index:bot.index,name:bot.name};
  const t=tileMap.get(key(r,c));if(t)return{type:'tile',mask:rotateMask(t.solution,t.rot),r,c,tile:t};
  return null;
}
function maskAt(r,c){return cellAt(r,c)?.mask||0}
function connectedComponent(){
  const seen=new Set([key(source.r,source.c)]),queue=[[source.r,source.c]];
  while(queue.length){
    const [r,c]=queue.shift(),mask=maskAt(r,c);
    for(const d of DIRS){
      if(!(mask&d.bit))continue;
      const nr=r+d.dr,nc=c+d.dc;if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;
      const nmask=maskAt(nr,nc);if(!(nmask&d.opp))continue;
      const k=key(nr,nc);if(!seen.has(k)){seen.add(k);queue.push([nr,nc]);}
    }
  }
  return seen;
}
function poweredBots(seen){return bots.filter(b=>seen.has(key(b.r,b.c))).length}
function solvedRotation(t){
  const m=rotateMask(t.solution,t.rot);
  if(t.solution===(N|S)||t.solution===(E|W))return m===t.solution||m===rotateMask(t.solution,2);
  return m===t.solution;
}
function unsolvedTiles(){return tiles.filter(t=>!solvedRotation(t))}
function starCount(){if(!state.complete)return 3;if(state.moves===OPTIMAL&&state.hints===0)return 3;if(state.moves<=32)return 2;return 1}
function say(message,mood='neutral',{auto=true}={}){
  message=window.PetriPresentation.personalizeMessage(message,mood);
  currentMessage=message;speech.setText(message);speech.stop();speechBubble.innerHTML=window.PetriPresentation.formatNotation(message);avatarOrbit.dataset.mood=mood;
  avatarOrbit.classList.remove('react');void avatarOrbit.offsetWidth;avatarOrbit.classList.add('react');if(auto)setTimeout(()=>speech.speak(message),150);
}
function blink(){if(document.hidden)return;avatarOrbit.classList.remove('blink');void avatarOrbit.offsetWidth;avatarOrbit.classList.add('blink');setTimeout(()=>avatarOrbit.classList.remove('blink'),360)}
function scheduleBlink(){setTimeout(()=>{blink();if(Math.random()<.2)setTimeout(blink,330);scheduleBlink()},2400+Math.random()*4100)}
function svgLines(mask,cls){
  const parts=[];
  if(mask&N)parts.push(`<line class="${cls}" x1="50" y1="50" x2="50" y2="-2"/>`);
  if(mask&E)parts.push(`<line class="${cls}" x1="50" y1="50" x2="102" y2="50"/>`);
  if(mask&S)parts.push(`<line class="${cls}" x1="50" y1="50" x2="50" y2="102"/>`);
  if(mask&W)parts.push(`<line class="${cls}" x1="50" y1="50" x2="-2" y2="50"/>`);
  return parts.join('');
}
function miniRobotMarkup(index){return `<div class="mini-robot-face"><span class="mini-eye e1"></span><span class="mini-eye e2"></span><span class="mini-mouth"></span><span class="mini-antenna"></span><span class="mini-antenna-dot"></span></div><div class="charge-light"></div><span class="target-number">${index+1}</span>`}
function buildBoard(){
  const grid=$('#powerGrid');grid.innerHTML='';
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const cell=document.createElement('div');cell.className='power-cell-slot';cell.style.gridRow=String(r+1);cell.style.gridColumn=String(c+1);
    if(r===source.r&&c===source.c){
      cell.classList.add('source-module');cell.dataset.cell=key(r,c);cell.innerHTML='<div class="source-badge">⚡</div><span>ENERGIE</span><div class="fixed-wire east"></div>';
    }else if(botMap.has(key(r,c))){
      const b=botMap.get(key(r,c));cell.classList.add('robot-module');cell.dataset.bot=String(b.index);cell.dataset.cell=key(r,c);cell.innerHTML=`<div class="fixed-wire west"></div>${miniRobotMarkup(b.index)}`;
    }else if(tileMap.has(key(r,c))){
      const t=tileMap.get(key(r,c));
      const btn=document.createElement('button');btn.type='button';btn.className='wire-tile';btn.dataset.r=String(r);btn.dataset.c=String(c);btn.setAttribute('aria-label',`Strombaustein in Zeile ${r+1}, Spalte ${c+1} drehen`);
      btn.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true"><g class="wire-rotator">${svgLines(t.solution,'wire-base-segment')}${svgLines(t.solution,'wire-flow-segment')}<circle class="wire-junction" cx="50" cy="50" r="10"/></g></svg><span class="rotate-hint">↻</span>`;
      btn.addEventListener('click',()=>rotateTile(t,btn));cell.append(btn);
    }else{
      cell.classList.add('empty-module');cell.innerHTML='<i></i><i></i><i></i><i></i>';
    }
    grid.append(cell);
  }
}
function render(){
  const seen=connectedComponent(),botsOn=poweredBots(seen);
  $$('.wire-tile').forEach(btn=>{
    const t=tileMap.get(key(+btn.dataset.r,+btn.dataset.c));
    btn.querySelector('.wire-rotator').style.transform=`rotate(${t.rot*90}deg)`;
    btn.classList.toggle('powered',seen.has(key(t.r,t.c)));
    btn.classList.toggle('solved',solvedRotation(t));
  });
  $$('.robot-module').forEach(el=>{const b=bots[+el.dataset.bot];el.classList.toggle('powered',seen.has(key(b.r,b.c)));});
  $('#robotLabel').textContent=`${botsOn} von ${TOTAL_BOTS} versorgt`;$('#servedLabel').textContent=`${botsOn} / ${TOTAL_BOTS}`;$('#poweredBotsLabel').textContent=String(botsOn);
  $('#moveCount').textContent=String(state.moves);$('#movesLabel').textContent=String(state.moves);$('#poweredTilesLabel').textContent=String([...seen].filter(k=>tileMap.has(k)||k===key(source.r,source.c)).length);
  progressBar.style.width=`${Math.max(8,botsOn/TOTAL_BOTS*100)}%`;
  return {seen,botsOn};
}
function flashTile(t){const btn=$(`.wire-tile[data-r='${t.r}'][data-c='${t.c}']`);if(!btn)return;btn.classList.remove('hinted');void btn.offsetWidth;btn.classList.add('hinted');setTimeout(()=>btn.classList.remove('hinted'),1800)}
function rotateTile(t,btn){
  if(state.complete||state.busy)return;
  state.moves++;t.rot=(t.rot+1)%4;state.history.push({type:'rotate',r:t.r,c:t.c,rotation:t.rot});
  btn.classList.add('turning');setTimeout(()=>btn.classList.remove('turning'),180);
  const before=state.maxBots,{botsOn}=render();
  if(botsOn>state.maxBots){state.maxBots=botsOn;say(botsOn===1?'Der erste Roboter hat Strom! Jetzt such den nächsten Weg.':botsOn===TOTAL_BOTS?'Alle vier leuchten!':'Sehr gut – jetzt sind schon '+botsOn+' Roboter versorgt.','success');}
  else if(before>0&&botsOn===0&&!state.history.some(h=>h.type==='allDark')){state.history.push({type:'allDark'});say('Jetzt ist der Strom ganz am Anfang unterbrochen. Schau zuerst in der Nähe der Energiequelle.','thinking');}
  if(botsOn===TOTAL_BOTS)finish();
}
function finish(){
  state.complete=true;const stars=starCount();render();rewardStars.textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
  const perfect=state.moves===OPTIMAL;rewardText.textContent=perfect?`Perfekt: genau ${OPTIMAL} Drehungen. Kürzer geht dieses Netz nicht.`:`Geschafft in ${state.moves} Drehungen. Optimal sind ${OPTIMAL}.`;
  rewardPanel.hidden=false;window.RoboProgress?.mark('level1',{completed:true,perfect,bestStars:stars,bestMoves:state.moves});
  say(perfect?'Perfekt! Alle vier Roboter haben Strom – und du hast den kürzesten Drehweg gefunden.':'Geschafft! Alle vier Roboter haben gleichzeitig Strom.','success');
}
function resetGame({auto=false}={}){
  speech.stop();tiles.forEach(t=>t.rot=t.initial);Object.assign(state,{moves:0,hints:0,complete:false,maxBots:0,history:[],busy:false});rewardPanel.hidden=true;render();say('Vier Roboter warten auf Strom. Dreh die Bausteine – ich melde mich, wenn etwas Interessantes passiert.','greeting',{auto});
}
function bestHintTile(){
  // Von links nach rechts und entlang bereits erreichbarer Bereiche helfen, ohne die ganze Lösung zu verraten.
  const seen=connectedComponent();
  const candidates=unsolvedTiles().sort((a,b)=>a.c-b.c||Math.abs(a.r-2)-Math.abs(b.r-2));
  const near=candidates.find(t=>DIRS.some(d=>seen.has(key(t.r+d.dr,t.c+d.dc))));
  return near||candidates[0]||null;
}
function offlineReply(q){
  const s=q.toLowerCase();const {botsOn}=render();
  if(/(ziel|aufgabe|was soll|gewinnen)/.test(s))return{message:'Dreh die Strombausteine so, dass alle vier Roboter gleichzeitig Strom bekommen.',mood:'explaining'};
  if(/(warum.*dunkel|kein strom|leuchtet.*nicht)/.test(s))return{message:`Gerade bekommen ${botsOn} von vier Robotern Strom. Eine Leitung funktioniert nur, wenn zwei Anschlüsse direkt zueinander zeigen.`,mood:'thinking'};
  if(/(wie.*dreh|funktion|leitung|strom.*fließ)/.test(s))return{message:'Jeder Klick dreht einen Baustein um 90 Grad. Treffen zwei Kabelenden genau aufeinander, kann der Strom zum nächsten Baustein weiterfließen.',mood:'explaining'};
  if(/(optimal|kürz|perfekt|24)/.test(s))return{message:`Die Startstellung lässt sich optimal in ${OPTIMAL} Drehungen lösen. Fürs erste Durchspielen reicht aber: alle vier Roboter zum Leuchten bringen.`,mood:'explaining'};
  if(/(wie viele|stand|fortschritt)/.test(s))return{message:`Gerade leuchten ${botsOn} von vier Robotern. Du hast ${state.moves} Drehungen gemacht.`,mood:'explaining'};
  return null;
}

$('#resetBtn').addEventListener('click',()=>resetGame({auto:true}));$('#replayBtn').addEventListener('click',()=>resetGame({auto:true}));
$('#hintBtn').addEventListener('click',()=>{state.hints++;const t=bestHintTile();if(!t){say('Du hast schon alles richtig verbunden.','success');return}flashTile(t);if(state.hints===1)say('Arbeite dich von der Energiequelle aus vor. Ein Baustein direkt am leuchtenden Netz ist ein guter Anfang.','thinking');else if(state.hints===2)say('Ich lasse einen Baustein kurz leuchten, der den Strom im Moment weiterbringen kann. Dreh ihn so, dass die Kabelenden zusammenpassen.','questioning');else say(`Schau auf den blinkenden Baustein. Seine Anschlüsse müssen zum bereits leuchtenden Kabel und zum nächsten Baustein zeigen.`,'explaining');});
$('#explainBtn').addEventListener('click',()=>say('Die grauen Kabel bleiben immer sichtbar. Gelb leuchtet nur der Teil des Netzes, der wirklich mit der Energiequelle verbunden ist. Wenn ein Kabelende ins Leere zeigt, stoppt der Strom dort.','explaining'));
$("#profiBtn").addEventListener("click",()=>{const box=$("#profiBox"),btn=$("#profiBtn");box.hidden=!box.hidden;btn.setAttribute("aria-expanded",String(!box.hidden));});
speakBtn.addEventListener('click',()=>{if(avatarOrbit.classList.contains('speaking'))speech.stop();else{speech.hasUserGesture=true;speech.speak(currentMessage,{force:true})}});autoSpeakToggle.addEventListener('change',()=>speech.setAuto(autoSpeakToggle.checked));voiceSelect.addEventListener('change',()=>{if(avatarOrbit.classList.contains('speaking')){speech.stop();speech.speak(currentMessage,{force:true})}});
$('#questionForm').addEventListener('submit',async e=>{e.preventDefault();const input=$('#questionInput'),q=input.value.trim();if(!q)return;input.value='';const small=window.PetriPresentation.smallTalkReply(q);if(small){say(small.message,small.mood);return}const local=offlineReply(q);if(local){say(local.message,local.mood);return}
  if(aiApi.available){say('Ich denke kurz nach …','thinking',{auto:false});try{const seen=connectedComponent(),botsOn=poweredBots(seen);const reply=await aiApi.intervene({learningGoal:'Ein Kind löst ein Stromleitungs-Puzzle: drehbare Kabelbausteine müssen so ausgerichtet werden, dass vier Roboter gleichzeitig mit der Energiequelle verbunden sind. Erkläre kindgerecht und verrate die komplette Lösung nicht sofort.',verifiedFacts:{robotsPowered:botsOn,totalRobots:TOTAL_BOTS,moves:state.moves,optimalMoves:OPTIMAL,unsolvedTiles:unsolvedTiles().length,goalReached:state.complete},learnerAction:{type:'question'},learnerMessage:q,interactionHistory:state.history.slice(-10)});say(reply.message,reply.robotState||'explaining');return}catch(err){console.warn(err)}}
  say('Das weiß ich offline noch nicht genau. Frag mich zum Beispiel nach dem Ziel, den Kabeln, dem Stromfluss oder nach einem Hinweis.','thinking');
});

(async()=>{buildBoard();render();scheduleBlink();say('Vier Roboter warten auf Strom. Dreh die Bausteine – ich melde mich, wenn etwas Interessantes passiert.','greeting',{auto:false});window.PetriPresentation.firstVisitIntro('level1',()=>say('So geht das Spiel: Klick auf Kabelbausteine, um sie zu drehen. Graue Leitungen zeigen mögliche Wege, gelb leuchtet nur der verbundene Strom. Verbinde die Quelle mit allen vier Robotern.','explaining'));const status=await aiApi.checkStatus();aiStatus.textContent=status.available?`KI-Tutor aktiv · ${status.model||'Cloud-Modell'}`:'Offline-Robo kennt Spielregeln und Smalltalk.';})();
