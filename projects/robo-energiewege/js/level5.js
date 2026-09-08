const TOTAL = 23;
const COLORS = ["red", "green", "blue"];
const COLOR_NAMES = { red: "rot", green: "grün", blue: "blau" };
const INITIAL = { red: 13, green: 7, blue: 3 };
const TRANSITIONS = {
  rg: { inputs: ["red", "green"], output: "blue", node: "#transition-rg", arcs: ["#arc-r-rg", "#arc-g-rg", "#arc-rg-b"], phrase: "Rot und Grün werden zweimal Blau" },
  rb: { inputs: ["red", "blue"], output: "green", node: "#transition-rb", arcs: ["#arc-r-rb", "#arc-b-rb", "#arc-rb-g"], phrase: "Rot und Blau werden zweimal Grün" },
  gb: { inputs: ["green", "blue"], output: "red", node: "#transition-gb", arcs: ["#arc-g-gb", "#arc-b-gb", "#arc-gb-r"], phrase: "Grün und Blau werden zweimal Rot" }
};

const state = { counts: { ...INITIAL }, moves: 0, mistakes: 0, hints: 0, busy: false, complete: false, history: [], lastSpokenTransition: null };
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
  if (auto) setTimeout(() => speech.speak(message), 160);
}
function blink(){ if(document.hidden)return; avatarOrbit.classList.remove("blink"); void avatarOrbit.offsetWidth; avatarOrbit.classList.add("blink"); setTimeout(()=>avatarOrbit.classList.remove("blink"),360); }
function scheduleBlink(){ setTimeout(()=>{ blink(); if(Math.random()<.18)setTimeout(blink,330); scheduleBlink(); },2500+Math.random()*4200); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function winner(c=state.counts){ return COLORS.find(k => c[k] === TOTAL) || null; }
function maxGroup(){ return Math.max(...COLORS.map(c=>state.counts[c])); }
function enabled(key, c=state.counts){ const t=TRANSITIONS[key]; return c[t.inputs[0]]>0 && c[t.inputs[1]]>0; }
function nextCounts(c,key){ const t=TRANSITIONS[key], n={...c}; n[t.inputs[0]]--; n[t.inputs[1]]--; n[t.output]+=2; return n; }
function keyOf(c){ return `${c.red},${c.green},${c.blue}`; }

function shortestPlan(start){
  const startCopy={...start};
  if(winner(startCopy)) return [];
  const queue=[startCopy], seen=new Map([[keyOf(startCopy),null]]), via=new Map();
  let goalKey=null;
  for(let qi=0; qi<queue.length; qi++){
    const cur=queue[qi];
    for(const key of Object.keys(TRANSITIONS)){
      if(!enabled(key,cur)) continue;
      const nxt=nextCounts(cur,key), nk=keyOf(nxt);
      if(seen.has(nk)) continue;
      seen.set(nk,keyOf(cur)); via.set(nk,key); queue.push(nxt);
      if(winner(nxt)){ goalKey=nk; qi=queue.length; break; }
    }
  }
  if(!goalKey) return null;
  const plan=[]; let k=goalKey;
  while(seen.get(k)!==null){ plan.push(via.get(k)); k=seen.get(k); }
  return plan.reverse();
}
const OPTIMAL_START = shortestPlan(INITIAL)?.length ?? 13;

function starCount(){
  if(state.complete && state.moves<=OPTIMAL_START && state.hints===0 && state.mistakes<=1) return 3;
  if(state.complete && state.moves<=OPTIMAL_START+4) return 2;
  return state.complete ? 1 : Math.max(1,3-Math.min(2,state.hints+Math.floor(state.mistakes/2)));
}
function updateStars(){ return starCount(); }

function miniRobotMarkup(color, x, y, i){
  return `<g class="mini-petri-robot ${color}" transform="translate(${x} ${y})" style="--i:${i}">
    <line x1="0" y1="-10" x2="0" y2="-15"></line><circle class="mini-tip" cx="0" cy="-17" r="2.5"></circle>
    <rect x="-9" y="-10" width="18" height="15" rx="4"></rect>
    <circle class="mini-eye" cx="-4" cy="-4" r="2"></circle><circle class="mini-eye" cx="4" cy="-4" r="2"></circle>
    <path d="M-4 1 Q0 4 4 1"></path>
  </g>`;
}
function renderRobots(color){
  const layer=$(`#robots-${color}`), count=state.counts[color];
  layer.innerHTML="";
  const cols=5, sx=27, sy=24;
  const rows=Math.ceil(count/cols);
  for(let i=0;i<count;i++){
    const row=Math.floor(i/cols), col=i%cols;
    const inRow=Math.min(cols,count-row*cols);
    const x=(col-(inRow-1)/2)*sx;
    const y=(row-(rows-1)/2)*sy;
    layer.insertAdjacentHTML("beforeend",miniRobotMarkup(color,x,y,i));
  }
}
function render(){
  COLORS.forEach(c=>renderRobots(c));
  $("#redBigCount").textContent=state.counts.red; $("#greenBigCount").textContent=state.counts.green; $("#blueBigCount").textContent=state.counts.blue;
  $("#redFooter").textContent=state.counts.red; $("#greenFooter").textContent=state.counts.green; $("#blueFooter").textContent=state.counts.blue;
  $("#moveCount").textContent=state.moves;
  const max=maxGroup(); $("#groupLabel").textContent=`${max} von ${TOTAL}`; progressBar.style.width=`${Math.max(12,max/TOTAL*100)}%`;
  Object.entries(TRANSITIONS).forEach(([key,t])=>{ const n=$(t.node); n.classList.toggle("ready",enabled(key)); n.classList.toggle("disabled",!enabled(key)); });
  updateStars();
}

function flashTransition(key, cls="error"){
  const node=$(TRANSITIONS[key].node); node.classList.remove(cls); void node.getBBox(); node.classList.add(cls); setTimeout(()=>node.classList.remove(cls),650);
}
function pulsePlace(color){ const p=$(`#place-${color}`); p.classList.remove("place-pop"); void p.getBBox(); p.classList.add("place-pop"); setTimeout(()=>p.classList.remove("place-pop"),700); }
function createSVG(tag,attrs={}){ const el=document.createElementNS("http://www.w3.org/2000/svg",tag); Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v))); return el; }

async function animateFire(key){
  const t=TRANSITIONS[key], node=$(t.node); node.classList.add("firing");
  t.arcs.forEach(sel=>$(sel).classList.add("firing"));
  const centers={ rb:[180,245], gb:[720,245], rg:[450,575] };
  const targetCenters={ red:[220,423], green:[680,423], blue:[450,126] };
  const [tx,ty]=centers[key], [ox,oy]=targetCenters[t.output];
  const layer=$("#flowLayer");
  const spark1=createSVG("circle",{class:`petri-flow-spark ${t.output}`,cx:tx,cy:ty,r:9});
  const spark2=createSVG("circle",{class:`petri-flow-spark ${t.output} second`,cx:tx,cy:ty,r:7});
  layer.append(spark1,spark2);
  const dx=ox-tx, dy=oy-ty;
  spark1.animate([{transform:"translate(0 0)",opacity:0},{opacity:1,offset:.2},{transform:`translate(${dx}px, ${dy}px)`,opacity:1}],{duration:430,easing:"ease-in",fill:"forwards"});
  spark2.animate([{transform:"translate(0 0)",opacity:0},{opacity:1,offset:.28},{transform:`translate(${dx+12}px, ${dy+6}px)`,opacity:1}],{duration:470,delay:55,easing:"ease-in",fill:"forwards"});
  await sleep(500);
  t.arcs.forEach(sel=>$(sel).classList.remove("firing")); node.classList.remove("firing"); spark1.remove(); spark2.remove();
}

async function fireTransition(key){
  if(state.busy) return;
  if(state.complete){ say("Das Netz ist schon gelöst. Starte neu, wenn du den Weg noch kürzer schaffen möchtest.","success"); return; }
  if(!enabled(key)){
    state.mistakes++; flashTransition(key); updateStars();
    const t=TRANSITIONS[key], missing=t.inputs.filter(c=>state.counts[c]===0).map(c=>COLOR_NAMES[c]).join(" und ");
    say(`Dieser Schalter ist gerade nicht bereit. Es fehlt ${missing}e Energie an einem Eingang.`,"thinking"); return;
  }
  state.busy=true; const t=TRANSITIONS[key], before={...state.counts}; state.moves++;
  state.history.push({type:"fire",transition:key,before:{...before}});
  await animateFire(key);
  state.counts=nextCounts(state.counts,key); state.history[state.history.length-1].after={...state.counts};
  pulsePlace(t.output); render();
  const win=winner();
  if(win){
    state.complete=true; render(); const stars=starCount(); rewardStars.textContent="★".repeat(stars)+"☆".repeat(3-stars);
    rewardText.textContent=stars===3?`23 Roboter in nur ${state.moves} Klicks – optimal.`:`Alle 23 sind ${COLOR_NAMES[win]}. Du hast ${state.moves} Klicks gebraucht.`; rewardPanel.hidden=false;
    window.RoboProgress?.mark("level5", {completed:true, perfect:state.moves===OPTIMAL_START, bestStars:stars, bestMoves:state.moves});
    say(stars===3?`Geschafft! Alle 23 sind ${COLOR_NAMES[win]} – und ${OPTIMAL_START} Klicks sind optimal!`:`Geschafft! Alle 23 sind ${COLOR_NAMES[win]}. Es geht sogar in ${OPTIMAL_START} Klicks.`,"success");
  } else {
    // Bei langen Folgen derselben Transition soll Robo nicht elfmal denselben Satz wiederholen.
    // Er spricht erst wieder, wenn eine andere Transition gewählt wird.
    if (state.lastSpokenTransition !== key) {
      const c=state.counts;
      say(`${t.phrase}. Jetzt sind ${c.red} rot, ${c.green} grün und ${c.blue} blau.`,"explaining");
      state.lastSpokenTransition = key;
    }
  }
  state.busy=false;
}

function resetGame({speak=true}={}){
  speech.stop(); state.counts={...INITIAL}; state.moves=0; state.mistakes=0; state.hints=0; state.busy=false; state.complete=false; state.history=[]; state.lastSpokenTransition=null; rewardPanel.hidden=true;
  render(); say(`23 Roboter warten im Netz. Klick auf ein Quadrat und beobachte, wie sich die Energie-Verteilung verändert.`,"greeting",{auto:speak});
}

function transitionDescription(key){
  const t=TRANSITIONS[key];
  return t.phrase.replace("werden zweimal", "werden zu zweimal");
}
function offlineGameReply(q){
  const s=q.toLowerCase();
  if(/(ziel|was soll|aufgabe|gewinnen)/.test(s)) return {message:"Dein Ziel ist, alle 23 Roboter auf dieselbe Energie-Farbe zu bringen.",mood:"explaining"};
  if(/(transition|quadrat|schalter|wie funktioniert|regel)/.test(s)) return {message:"Jedes Quadrat ist ein Energie-Schalter. Es nimmt je einen Roboter aus seinen beiden Eingangsfarben und erzeugt zwei Roboter mit der dritten Farbe.",mood:"explaining"};
  if(/(warum.*2|warum.*zwei|gewicht|kante)/.test(s)) return {message:"Weil immer zwei Roboter ihre Farbe wechseln. Darum führt die Ausgangskante im Petri-Netz mit Gewicht 2 zur neuen Farbe.",mood:"explaining"};
  if(/(wie viele|verteilung|anzahl|stand)/.test(s)) return {message:`Gerade sind ${state.counts.red} rot, ${state.counts.green} grün und ${state.counts.blue} blau.`,mood:"explaining"};
  if(/(welche.*klick|was.*jetzt|nächste|naechste|tipp)/.test(s)){
    const plan=shortestPlan(state.counts); if(!plan?.length) return {message:"Du bist schon am Ziel.",mood:"success"};
    return {message:`Von hier aus gibt es einen kürzesten Weg mit ${plan.length} Klick${plan.length===1?"":"s"}. Als Nächstes würde ich den Schalter nehmen: ${TRANSITIONS[plan[0]].phrase}.`,mood:"thinking"};
  }
  if(/(blau.*ziel|welche farbe.*ende|endfarbe)/.test(s)) return {message:"Bei dieser Startverteilung ist Blau die einzige Farbe, in der am Ende alle 23 zusammenkommen können. Das verrät eine mathematische Invariante des Netzes.",mood:"explaining"};
  return null;
}

Object.keys(TRANSITIONS).forEach(key=>{
  const node=$(TRANSITIONS[key].node);
  node.addEventListener("click",()=>fireTransition(key));
  node.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();fireTransition(key);}});
});
$("#resetBtn").addEventListener("click",()=>resetGame()); $("#replayBtn").addEventListener("click",()=>resetGame());
$("#hintBtn").addEventListener("click",()=>{
  state.hints++; updateStars(); const plan=shortestPlan(state.counts);
  if(!plan?.length){ say("Du hast das Ziel schon erreicht.","success"); return; }
  if(state.hints===1) say("Tipp: Die größte Farbgruppe muss nicht die Endfarbe werden. Achte darauf, welche zwei Farben ein Schalter verbraucht – und welche Farbe er verdoppelt.","thinking");
  else if(state.hints===2) say(`Von deinem jetzigen Zustand aus sind mindestens noch ${plan.length} Klicks nötig. Plane nicht nur einen, sondern zwei Schritte voraus.`,"questioning");
  else { const key=plan[0]; flashTransition(key,"hinted"); say(`Ein guter nächster Schritt ist: ${TRANSITIONS[key].phrase}. Ich lasse das passende Quadrat kurz leuchten.`,"explaining"); }
});
$("#explainBtn").addEventListener("click",()=>{state.hints++;updateStars();say("Die Kreise speichern Roboter einer Energie-Farbe. Die Quadrate verändern die Verteilung: je ein Roboter aus zwei Farben verschwindet dort und zwei Roboter erscheinen in der dritten Farbe. Die Gesamtzahl bleibt immer 23.","explaining");});
$("#profiBtn").addEventListener("click",()=>{const box=$("#profiBox"),btn=$("#profiBtn");box.hidden=!box.hidden;btn.setAttribute("aria-expanded",String(!box.hidden));});
speakBtn.addEventListener("click",()=>{if(avatarOrbit.classList.contains("speaking"))speech.stop();else{speech.hasUserGesture=true;speech.speak(currentMessage,{force:true});}}); autoSpeakToggle.addEventListener("change",()=>speech.setAuto(autoSpeakToggle.checked));
voiceSelect.addEventListener("change",()=>{if(avatarOrbit.classList.contains("speaking")){speech.stop();speech.speak(currentMessage,{force:true});}});
$("#questionForm").addEventListener("submit",async e=>{ e.preventDefault(); const input=$("#questionInput"), q=input.value.trim(); if(!q)return; input.value="";
  const small=window.PetriPresentation.smallTalkReply(q); if(small){say(small.message,small.mood);return;} const local=offlineGameReply(q); if(local){say(local.message,local.mood);return;}
  if(aiApi.available){ say("Ich denke kurz nach …","thinking",{auto:false}); try{ const plan=shortestPlan(state.counts); const reply=await aiApi.intervene({learningGoal:"Kind steuert das Chamäleon-Petri-Netz direkt. Drei Stellen enthalten 23 Roboter in roten, grünen und blauen Energiezuständen. Jede quadratische Transition verbraucht je einen Roboter aus zwei Farben und erzeugt zwei Roboter in der dritten Farbe. Ziel: alle 23 gleiche Farbe. Start 13 rot, 7 grün, 3 blau; optimale Lösung 13 Transitionen; nur Blau ist als einfarbiger Endzustand erreichbar.",verifiedFacts:{counts:state.counts,moves:state.moves,goalReached:state.complete,optimalFromHere:plan?.length??null,enabledTransitions:Object.keys(TRANSITIONS).filter(k=>enabled(k)),total:TOTAL},learnerAction:{type:"question"},learnerMessage:q,interactionHistory:state.history.slice(-12)}); say(reply.message,reply.robotState||"explaining"); return;}catch(err){console.warn(err);} }
  say("Das kann ich offline noch nicht gut beantworten. Frag mich nach dem Ziel, den Quadraten, der aktuellen Verteilung oder nach einem Tipp – oder starte die kostenlose Cloud-KI.","thinking");
});

(async()=>{
  $("#optimalLabel").textContent=`${OPTIMAL_START} Klicks`; render(); scheduleBlink();
  say("Diesmal klickst du direkt auf die Quadrate im Netz. 23 Roboter sind genug, dass du wirklich planen musst.","greeting",{auto:false});
  window.PetriPresentation.firstVisitIntro('level5',()=>say('So geht das Spiel: Ein aktives Quadrat verbraucht je einen Roboter aus zwei Farben und erzeugt zwei Roboter der dritten Farbe. Beobachte die Zahlen und bringe alle 23 Roboter in dieselbe Farbgruppe.','explaining'));
  const status=await aiApi.checkStatus(); aiStatus.textContent=status.available?`KI-Tutor aktiv · ${status.model||"Cloud-Modell"}`:"Offline-Robo kennt Spielregeln und Smalltalk.";
})();
