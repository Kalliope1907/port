const $=s=>document.querySelector(s); const Tutor=window.BinaryGame;
const FAULTS=[6,2,7];
const state={round:0,low:1,high:8,tests:0,totalTests:0,mistakes:0,hints:0,solved:0,complete:false,probes:new Map(),history:[]};

const tutor=Tutor.setupTutor({
  introKey:'level2',
  introMessage:'So geht das Spiel: Zwischen acht Kabelstücken liegen Prüfpunkte. Miss möglichst in der Mitte. Grün schickt dich nach rechts, Rot nach links. Wenn nur ein Kabel gelb bleibt, reparierst du es.',
  learningGoal:'Ein Kind grenzt eine einzelne Fehlerstelle durch halbierende Messungen systematisch ein und versteht die Idee der binären Suche.',
  getFacts:()=>({round:state.round+1,candidateFrom:state.low,candidateTo:state.high,tests:state.tests,totalTests:state.totalTests,fault:FAULTS[state.round],solved:state.solved}),
  history:state.history,
  offlineReply:q=>{
    const s=q.toLowerCase();
    if(s.includes('mitte')||s.includes('halb'))return{message:'Eine Messung in der Mitte teilt alle möglichen Kabel ungefähr in zwei gleich große Gruppen. So schließt du besonders viele auf einmal aus.',mood:'explaining'};
    if(s.includes('grün')||s.includes('rot'))return{message:'Grün bedeutet: Bis zu diesem Prüfpunkt fließt Energie. Rot bedeutet: Die Unterbrechung liegt in einem Kabel davor oder direkt links vom Prüfpunkt.',mood:'explaining'};
    return{message:'Betrachte nur noch den gelb markierten Bereich und setze die nächste Messung möglichst in seine Mitte.',mood:'questioning'};
  }
});

function rangeText(){return state.low===state.high?`Kabel ${state.low}`:`Kabel ${state.low}–${state.high}`}
function render(){
  $('#diagRound').textContent=`${state.round+1} von ${FAULTS.length}`; $('#sideDiagRound').textContent=`${state.round+1} von ${FAULTS.length}`;
  $('#testCount').textContent=state.tests; $('#sideTests').textContent=state.totalTests; $('#candidateRange').textContent=rangeText(); $('#solvedCases').textContent=`${state.solved} / ${FAULTS.length}`;
  $('#progressBar').style.width=`${state.solved/FAULTS.length*100}%`;
  const parts=['<div class="power-source" aria-label="Energiequelle"><span>⚡</span><small>START</small></div>'];
  for(let i=1;i<=8;i++){
    const possible=i>=state.low&&i<=state.high,ready=state.low===state.high&&i===state.low;
    parts.push(`<button class="cable-segment ${possible?'possible':'excluded'} ${ready?'repair-ready':''}" data-segment="${i}" type="button" aria-label="Kabel ${i}${ready?', jetzt reparieren':''}"><span class="cable-piece"></span><b>${i}</b></button>`);
    if(i<8){const result=state.probes.get(i);parts.push(`<button class="test-probe ${result===true?'reached':result===false?'blocked':''}" data-probe="${i}" type="button" ${state.probes.has(i)?'disabled':''} aria-label="Prüfpunkt nach Kabel ${i}"><span>${result===true?'✓':result===false?'×':'?'}</span><small>TEST</small></button>`)}
  }
  parts.push('<div class="power-target" aria-label="Lampe"><span>💡</span><small>ZIEL</small></div>');
  $('#cableLine').innerHTML=parts.join('');
  document.querySelectorAll('[data-probe]').forEach(b=>b.addEventListener('click',()=>probe(Number(b.dataset.probe))));
  document.querySelectorAll('[data-segment]').forEach(b=>b.addEventListener('click',()=>repair(Number(b.dataset.segment))));
}
function probe(position){
  if(state.complete||state.probes.has(position))return;
  const reached=FAULTS[state.round]>position; state.probes.set(position,reached); state.tests++;state.totalTests++;
  if(reached)state.low=Math.max(state.low,position+1);else state.high=Math.min(state.high,position);
  state.history.push({type:'probe',position,reached,range:[state.low,state.high]}); window.RoboSound?.toggle();
  $('#diagnosticResult').textContent=reached?`Grün: Bis Prüfpunkt ${position} fließt Energie. Der Fehler liegt weiter rechts.`:`Rot: Prüfpunkt ${position} bekommt keinen Strom. Der Fehler liegt links davon.`;
  render();
  if(state.low===state.high)tutor.say(`Jetzt bleibt nur Kabel ${state.low} übrig. Klick es an, um es zu reparieren.`,'success');
  else tutor.say(reached?'Hier kommt Energie an. Suche jetzt weiter rechts.':'Hier kommt keine Energie an. Suche jetzt weiter links.','thinking');
}
function repair(segment){
  if(state.complete)return;
  if(state.low!==state.high){state.mistakes++;window.RoboSound?.error();tutor.say('Grenze den Fehler erst auf genau ein gelb markiertes Kabel ein. So wird aus Raten echte Fehlersuche.','questioning');return}
  if(segment!==FAULTS[state.round]){state.mistakes++;window.RoboSound?.error();tutor.say(`Kabel ${segment} ist nicht die Unterbrechung. Prüfe den eingegrenzten Bereich noch einmal.`,'questioning');return}
  state.solved++;window.RoboSound?.success();state.history.push({type:'repair',segment,tests:state.tests});render();
  tutor.say(`Richtig! Kabel ${segment} war unterbrochen.`,'success');state.round++;
  if(state.round>=FAULTS.length)setTimeout(finish,650);else setTimeout(startRound,800);
}
function startRound(){state.low=1;state.high=8;state.tests=0;state.probes.clear();$('#diagnosticResult').textContent='Wähle einen Prüfpunkt zwischen zwei Kabelstücken.';render();tutor.say(`Neuer Fall: Wieder ist genau ein Kabelstück unterbrochen. Grenze es mit möglichst wenigen Messungen ein.`,'greeting')}
function stars(){if(state.totalTests<=9&&state.mistakes===0&&state.hints===0)return 3;if(state.totalTests<=12&&state.mistakes<=2)return 2;return 1}
function finish(){state.complete=true;$('#progressBar').style.width='100%';const s=stars();$('#rewardStars').textContent='★'.repeat(s)+'☆'.repeat(3-s);$('#rewardText').textContent=s===3?'Drei Fehler, nur neun Messungen: perfekt halbiert.':`Du hast alle Fehler mit ${state.totalTests} Messungen gefunden.`;$('#rewardPanel').hidden=false;window.RoboProgress?.mark('level2',{completed:true,perfect:s===3,bestStars:s,bestMoves:state.totalTests});tutor.say('Geschafft! Du hast die Fehlersuche immer weiter eingegrenzt – genau so arbeitet binäre Suche.','success')}
function reset(){state.round=0;state.low=1;state.high=8;state.tests=0;state.totalTests=0;state.mistakes=0;state.hints=0;state.solved=0;state.complete=false;state.probes.clear();state.history.length=0;$('#rewardPanel').hidden=true;startRound()}
$('#hintBtn').onclick=()=>{if(state.complete)return;state.hints++;const point=Math.floor((state.low+state.high-1)/2);tutor.say(state.low===state.high?`Du hast den Fehler schon eingegrenzt: Repariere Kabel ${state.low}.`:`Miss als Nächstes am Prüfpunkt nach Kabel ${point}. So teilst du den gelben Bereich fast genau in zwei Hälften.`,'questioning')};
$('#explainBtn').onclick=()=>{state.hints++;tutor.say('Jeder Prüfpunkt zeigt, ob Energie bis dorthin gelangt. Damit weißt du, auf welcher Seite die Unterbrechung liegen muss.','explaining')};
$('#resetBtn').onclick=reset;$('#replayBtn').onclick=reset;reset();
