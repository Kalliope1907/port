const N = 8;
const COLORS = ["red", "green", "blue"];
const COLOR_NAMES = { red: "rot", green: "grün", blue: "blau" };
const COLOR_HEX = { red: "#d85146", green: "#3dae78", blue: "#3284cf" };
const initialColors = ["red", "green", "red", "blue", "red", "green", "red", "red"];
const state = { colors: [...initialColors], selected: null, moves: 0, mistakes: 0, hints: 0, complete: false, history: [] };

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const speechBubble = $("#speechBubble");
const avatarOrbit = $("#avatarOrbit");
const progressBar = $("#progressBar");
const scoreLabel = $("#scoreLabel");
const rewardPanel = $("#rewardPanel");
const rewardStars = $("#rewardStars");
const rewardText = $("#rewardText");
const speakBtn = $("#speakBtn");
const autoSpeakToggle = $("#autoSpeakToggle");
const voiceSelect = $("#voiceSelect");
const voiceControls = $("#voiceControls");
const aiStatus = $("#aiStatus");
const aiApi = new window.TutorAPI();

const speech = new window.PetriPresentation.SpeechController({
  autoSpeak: true,
  onSpeakingChange: speaking => {
    avatarOrbit.classList.toggle("speaking", speaking);
    speakBtn.textContent = speaking ? "■ Stopp" : "🔊 Vorlesen";
  }
});
speech.init(voiceSelect);
if (!speech.supported) { voiceControls.hidden = true; autoSpeakToggle.checked = false; }
let currentMessage = "";

function say(message, mood = "neutral", { auto = true } = {}) {
  message = window.PetriPresentation.personalizeMessage(message, mood);
  currentMessage = message;
  speech.setText(message); speech.stop();
  speechBubble.innerHTML = window.PetriPresentation.formatNotation(message);
  avatarOrbit.dataset.mood = mood;
  avatarOrbit.classList.remove("react"); void avatarOrbit.offsetWidth; avatarOrbit.classList.add("react");
  if (auto) setTimeout(() => speech.speak(message), 170);
}
function blink(){ if(document.hidden)return; avatarOrbit.classList.remove("blink"); void avatarOrbit.offsetWidth; avatarOrbit.classList.add("blink"); setTimeout(()=>avatarOrbit.classList.remove("blink"),360); }
function scheduleBlink(){ setTimeout(()=>{ blink(); if(Math.random()<.18)setTimeout(blink,330); scheduleBlink(); },2500+Math.random()*4200); }
function posOnCircle(cx,cy,r,deg){ const a=(deg-90)*Math.PI/180; return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}; }
function createSVG(tag,attrs={}){ const el=document.createElementNS("http://www.w3.org/2000/svg",tag); Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v))); return el; }
function thirdColor(a,b){ return COLORS.find(c=>c!==a&&c!==b); }
function counts(){ return COLORS.reduce((acc,c)=>(acc[c]=state.colors.filter(x=>x===c).length,acc),{}); }
function maxGroup(){ return Math.max(...Object.values(counts())); }
function winner(){ const c=counts(); return COLORS.find(k=>c[k]===N) || null; }
function starCount(){ if(state.complete && state.moves<=5 && state.hints===0 && state.mistakes<=1)return 3; if(state.complete && state.moves<=7)return 2; return state.complete?1:Math.max(1,3-Math.min(2,state.hints+Math.floor(state.mistakes/2))); }
function updateStars(){ return starCount(); }

function robotMarkup(){ return `
  <circle class="mix-hit" r="66"></circle>
  <g class="mix-figure">
    <circle class="mix-aura" r="58"></circle>
    <line class="mix-antenna" x1="0" y1="-49" x2="0" y2="-64"></line><circle class="mix-antenna-tip" cx="0" cy="-69" r="7"></circle>
    <rect class="mix-head" x="-40" y="-45" width="80" height="59" rx="13"></rect>
    <circle class="mix-ear" cx="-44" cy="-15" r="9"></circle><circle class="mix-ear" cx="44" cy="-15" r="9"></circle>
    <circle class="mix-eye" cx="-17" cy="-18" r="8"></circle><circle class="mix-eye" cx="17" cy="-18" r="8"></circle>
    <circle class="mix-eye-dot" cx="-14" cy="-21" r="2.5"></circle><circle class="mix-eye-dot" cx="20" cy="-21" r="2.5"></circle>
    <path class="mix-mouth" d="M-11 0 Q0 9 11 0"></path>
    <rect class="mix-body" x="-32" y="18" width="64" height="57" rx="14"></rect><circle class="mix-core" cx="0" cy="45" r="14"></circle>
    <line class="mix-arm" x1="-32" y1="34" x2="-49" y2="57"></line><line class="mix-arm" x1="32" y1="34" x2="49" y2="57"></line>
  </g>`; }

function buildBoard(){
  const layer=$("#mixRobotLayer"), transfer=$("#transferLayer"); layer.innerHTML=""; transfer.innerHTML="";
  const positions=Array.from({length:N},(_,i)=>posOnCircle(450,322,245,i*360/N));
  positions.forEach((p,i)=>{
    const g=createSVG("g",{class:"mix-robot","data-robot":i,"data-energy":state.colors[i],transform:`translate(${p.x} ${p.y})`,tabindex:0,role:"button","aria-label":`Roboter ${i+1}, Energie ${COLOR_NAMES[state.colors[i]]}`});
    g.innerHTML=robotMarkup();
    g.addEventListener("click",()=>chooseRobot(i));
    g.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();chooseRobot(i);} });
    layer.append(g);
  });
  window.mixPositions=positions;
}

function render(){
  const c=counts(), max=maxGroup();
  $("#redCount").textContent=c.red; $("#greenCount").textContent=c.green; $("#blueCount").textContent=c.blue;
  $("#bestGroup").textContent=`größte Gruppe: ${max} / ${N}`; $("#groupLabel").textContent=`${max} von ${N}`; $("#moveCount").textContent=state.moves;
  progressBar.style.width=`${Math.max(18,max/N*100)}%`;
  $$(".mix-robot").forEach(node=>{ const i=Number(node.dataset.robot); node.dataset.energy=state.colors[i]; node.classList.toggle("selected",state.selected===i); node.setAttribute("aria-label",`Roboter ${i+1}, Energie ${COLOR_NAMES[state.colors[i]]}`); });
  updateStars();
}

function flash(i){ const n=$(`.mix-robot[data-robot='${i}']`); n.classList.remove("error"); void n.getBBox(); n.classList.add("error"); setTimeout(()=>n.classList.remove("error"),500); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function animateExchange(a,b,newColor){
  const layer=$("#transferLayer"), p1=window.mixPositions[a], p2=window.mixPositions[b];
  const midx=(p1.x+p2.x)/2, midy=(p1.y+p2.y)/2-45;
  const d=`M ${p1.x} ${p1.y} Q ${midx} ${midy} ${p2.x} ${p2.y}`;
  const path=createSVG("path",{class:"mix-link active",d,stroke:COLOR_HEX[newColor]});
  const spark=createSVG("circle",{class:"mix-spark active",cx:midx,cy:midy,r:7,fill:COLOR_HEX[newColor]});
  layer.append(path,spark);
  await sleep(520);
  const na=$(`.mix-robot[data-robot='${a}']`), nb=$(`.mix-robot[data-robot='${b}']`);
  na.classList.add("changed"); nb.classList.add("changed");
  await sleep(180); path.remove(); spark.remove();
  setTimeout(()=>{na.classList.remove("changed");nb.classList.remove("changed");},600);
}

async function chooseRobot(i){
  if(state.complete){ say("Alle acht haben schon dieselbe Energie-Farbe. Du kannst die Mission neu starten und versuchen, es in fünf Austauschen zu schaffen.","success"); return; }
  if(state.selected===null){ state.selected=i; render(); say(`Roboter ${i+1} hat ${COLOR_NAMES[state.colors[i]]}e Energie. Wähle jetzt einen Roboter mit einer anderen Farbe.`,"questioning"); return; }
  if(state.selected===i){ state.selected=null; render(); say("Auswahl aufgehoben. Such dir zwei verschieden geladene Roboter.","neutral"); return; }
  const a=state.selected, b=i, ca=state.colors[a], cb=state.colors[b]; state.selected=null;
  if(ca===cb){ state.mistakes++; flash(a); flash(b); render(); say(`Beide haben schon ${COLOR_NAMES[ca]}e Energie. Für einen Austausch brauchst du zwei verschiedene Farben.`,"thinking"); return; }
  const next=thirdColor(ca,cb); state.moves++; state.history.push({type:"exchange",robots:[a,b],before:[ca,cb],after:next});
  await animateExchange(a,b,next); state.colors[a]=next; state.colors[b]=next; render();
  const win=winner();
  if(win){
    state.complete=true; render(); const stars=starCount(); rewardStars.textContent="★".repeat(stars)+"☆".repeat(3-stars);
    rewardText.textContent=stars===3?`Perfekt: alle acht nach nur ${state.moves} Austauschen.`:`Alle acht sind ${COLOR_NAMES[win]}. Du hast ${state.moves} Austausche gebraucht.`; rewardPanel.hidden=false;
    window.RoboProgress?.mark("level4", {completed:true, perfect:state.moves===5, bestStars:stars, bestMoves:state.moves});
    say(stars===3?`Geschafft! Alle acht haben ${COLOR_NAMES[win]}e Energie – und fünf Austausche sind optimal!`:`Geschafft! Jetzt haben alle acht ${COLOR_NAMES[win]}e Energie. Versuchst du es noch einmal in nur fünf Austauschen?`,"success"); return;
  }
  const c=counts(); say(`${COLOR_NAMES[ca][0].toUpperCase()+COLOR_NAMES[ca].slice(1)} und ${COLOR_NAMES[cb]} werden gemeinsam ${COLOR_NAMES[next]}. Jetzt sind ${c.red} rot, ${c.green} grün und ${c.blue} blau.`,"explaining");
}

function resetGame({speak=true}={}){ speech.stop(); state.colors=[...initialColors]; state.selected=null; state.moves=0; state.mistakes=0; state.hints=0; state.complete=false; state.history=[]; rewardPanel.hidden=true; buildBoard(); render(); say("Acht Roboter, drei Energie-Farben. Wähle immer zwei verschiedene Farben – beide werden dann zur dritten. Bringst du alle zusammen?","greeting",{auto:speak}); }

function offlineGameReply(q){
  const s=q.toLowerCase();
  if(/(ziel|was soll|aufgabe|gewinnen)/.test(s))return{message:"Dein Ziel ist, dass am Ende alle acht Roboter dieselbe Energie-Farbe haben.",mood:"explaining"};
  if(/(regel|wie funktioniert|was passiert|austausch)/.test(s))return{message:"Wählst du zwei verschiedene Farben, werden beide zur dritten: Rot und Grün werden Blau, Rot und Blau werden Grün, Grün und Blau werden Rot.",mood:"explaining"};
  if(/(warum.*zwei|warum.*dritte|warum werden)/.test(s))return{message:"Das ist die feste Mischregel dieser Energiewelt. Im Petri-Netz werden dabei je ein Zustand aus zwei Farben verbraucht und zwei Zustände der dritten Farbe erzeugt.",mood:"explaining"};
  if(/(welche.*wählen|was.*jetzt|nächste|naechste|tipp)/.test(s))return{message:"Schau nicht nur auf die größte Gruppe. Manchmal musst du eine Farbe erst vermehren, bevor du sie später wieder in deine Zielfarbe umwandeln kannst.",mood:"thinking"};
  if(/(wie viele|anzahl|verteilung)/.test(s)){const c=counts();return{message:`Gerade sind ${c.red} rot, ${c.green} grün und ${c.blue} blau.`,mood:"explaining"};}
  return null;
}

$("#resetBtn").addEventListener("click",()=>resetGame()); $("#replayBtn").addEventListener("click",()=>resetGame());
$("#hintBtn").addEventListener("click",()=>{ state.hints++; updateStars(); const c=counts(); if(state.hints===1)say("Tipp: Wenn eine Farbe fast verschwunden ist, muss das nicht schlecht sein. Überlege, welche Mischung sie später wieder erzeugen kann.","thinking"); else if(state.hints===2)say(`Aktuell: ${c.red} rot, ${c.green} grün, ${c.blue} blau. Versuch, nicht einfach immer die seltenste Farbe wegzumischen – plane zwei Schritte voraus.`,"questioning"); else say("Eine optimale Lösung braucht fünf Austausche. Du musst dabei nicht von Anfang an wissen, welche Zielfarbe am Ende gewinnt.","explaining"); });
$("#explainBtn").addEventListener("click",()=>{state.hints++;updateStars();say("Zwei Roboter mit unterschiedlichen Energie-Farben koppeln sich. Danach tragen beide die dritte Farbe. Die Anzahl der Roboter bleibt immer acht – nur ihre Energie-Verteilung verändert sich.","explaining");});
$("#profiBtn").addEventListener("click",()=>{const box=$("#profiBox"),btn=$("#profiBtn");box.hidden=!box.hidden;btn.setAttribute("aria-expanded",String(!box.hidden));});
speakBtn.addEventListener("click",()=>{if(avatarOrbit.classList.contains("speaking"))speech.stop();else{speech.hasUserGesture=true;speech.speak(currentMessage,{force:true});}}); autoSpeakToggle.addEventListener("change",()=>speech.setAuto(autoSpeakToggle.checked));
voiceSelect.addEventListener("change",()=>{if(avatarOrbit.classList.contains("speaking")){speech.stop();speech.speak(currentMessage,{force:true});}});
$("#questionForm").addEventListener("submit",async e=>{ e.preventDefault(); const input=$("#questionInput"), q=input.value.trim(); if(!q)return; input.value="";
  const small=window.PetriPresentation.smallTalkReply(q); if(small){say(small.message,small.mood);return;} const local=offlineGameReply(q); if(local){say(local.message,local.mood);return;}
  if(aiApi.available){ say("Ich denke kurz nach …","thinking",{auto:false}); try{ const c=counts(); const reply=await aiApi.intervene({learningGoal:"Kind versteht ein Petri-Netz als Energie-Mischpuzzle: Acht Roboter haben drei Energie-Farben. Zwei unterschiedliche Farben werden bei einer Interaktion beide zur dritten Farbe. Ziel: alle acht gleiche Farbe, optimale Lösung 5 Austausche.",verifiedFacts:{colors:state.colors,counts:c,moves:state.moves,selected:state.selected,goalReached:state.complete,optimalMoves:5},learnerAction:{type:"question"},learnerMessage:q,interactionHistory:state.history.slice(-10)}); say(reply.message,reply.robotState||"explaining"); return;}catch(err){console.warn(err);} }
  say("Das kann ich offline noch nicht gut beantworten. Frag mich nach der Regel, dem Ziel oder der aktuellen Verteilung – oder starte die kostenlose Cloud-KI.","thinking");
});

(async()=>{ buildBoard(); render(); scheduleBlink(); say("Acht Roboter, drei Energie-Farben. Wähle immer zwei verschiedene Farben – beide werden dann zur dritten. Bringst du alle zusammen?","greeting",{auto:false}); window.PetriPresentation.firstVisitIntro('level4',()=>say('So geht das Spiel: Wähle zwei Roboter mit unterschiedlichen Energie-Farben. Beide wechseln dann zur dritten Farbe. Plane deine Paare so, dass am Ende alle acht dieselbe Farbe haben.','explaining')); const status=await aiApi.checkStatus(); aiStatus.textContent=status.available?`KI-Tutor aktiv · ${status.model||"Cloud-Modell"}`:"Offline-Robo kennt Spielregeln und Smalltalk."; })();
