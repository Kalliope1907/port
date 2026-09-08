const N = 5;
const positionNames = ["oben", "rechts oben", "rechts unten", "links unten", "links oben"];
const state = {
  active: Array(N).fill(false),
  served: Array(N).fill(false),
  moves: 0,
  mistakes: 0,
  hints: 0,
  complete: false,
  history: []
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const speechBubble = $("#speechBubble");
const avatarOrbit = $("#avatarOrbit");
const aiStatus = $("#aiStatus");
const progressBar = $("#progressBar");
const scoreLabel = $("#scoreLabel");
const rewardPanel = $("#rewardPanel");
const rewardStars = $("#rewardStars");
const rewardText = $("#rewardText");
const speakBtn = $("#speakBtn");
const autoSpeakToggle = $("#autoSpeakToggle");
const voiceSelect = $("#voiceSelect");
const voiceControls = $("#voiceControls");
const aiApi = new window.TutorAPI();

const speech = new window.PetriPresentation.SpeechController({
  autoSpeak: true,
  onSpeakingChange: speaking => {
    avatarOrbit.classList.toggle("speaking", speaking);
    speakBtn.textContent = speaking ? "■ Stopp" : "🔊 Vorlesen";
  }
});
speech.init(voiceSelect);
if (!speech.supported) {
  voiceControls.hidden = true;
  autoSpeakToggle.checked = false;
}

let currentMessage = "";

function posOnCircle(cx, cy, r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function neighbors(i) {
  return [(i - 1 + N) % N, (i + 1) % N];
}

function adjacentCells(i) {
  return [(i - 1 + N) % N, i];
}

function cellOwner(cell) {
  for (let i = 0; i < N; i++) {
    if (!state.active[i]) continue;
    if (adjacentCells(i).includes(cell)) return i;
  }
  return null;
}

function canStart(i) {
  if (state.active[i]) return false;
  const [left, right] = neighbors(i);
  return !state.active[left] && !state.active[right];
}

function servedCount() {
  return state.served.filter(Boolean).length;
}

function activeCount() {
  return state.active.filter(Boolean).length;
}

function starCount() {
  if (state.complete && state.moves <= 8 && state.hints === 0 && state.mistakes <= 1) return 3;
  if (state.complete && state.moves <= 11) return 2;
  return state.complete ? 1 : Math.max(1, 3 - Math.min(2, state.hints + Math.floor(state.mistakes / 2)));
}

function updateStars() {
  return starCount();
}

function say(message, mood = "neutral", { auto = true } = {}) {
  message = window.PetriPresentation.personalizeMessage(message, mood);
  currentMessage = message;
  speech.setText(message);
  speech.stop();
  speechBubble.innerHTML = window.PetriPresentation.formatNotation(message);
  avatarOrbit.dataset.mood = mood;
  avatarOrbit.classList.remove("react");
  void avatarOrbit.offsetWidth;
  avatarOrbit.classList.add("react");
  if (auto) setTimeout(() => speech.speak(message), 170);
}

function blink() {
  if (document.hidden) return;
  avatarOrbit.classList.remove("blink");
  void avatarOrbit.offsetWidth;
  avatarOrbit.classList.add("blink");
  setTimeout(() => avatarOrbit.classList.remove("blink"), 360);
}

function scheduleBlink() {
  const delay = 2400 + Math.random() * 4100;
  setTimeout(() => {
    blink();
    if (Math.random() < .2) setTimeout(blink, 330);
    scheduleBlink();
  }, delay);
}

function createSVG(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
}

function buildBoard() {
  const wireLayer = $("#wireLayer");
  const cellLayer = $("#cellLayer");
  const robotLayer = $("#robotLayer");
  wireLayer.innerHTML = "";
  cellLayer.innerHTML = "";
  robotLayer.innerHTML = "";

  const robots = Array.from({ length: N }, (_, i) => posOnCircle(450, 325, 188, i * 72));
  const cells = Array.from({ length: N }, (_, i) => posOnCircle(450, 325, 285, i * 72 + 36));

  for (let c = 0; c < N; c++) {
    const targets = [c, (c + 1) % N];
    for (const robot of targets) {
      const p1 = cells[c], p2 = robots[robot];
      const group = createSVG("g", { class: "ring-wire", "data-cell": c, "data-robot": robot });
      const d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${((p1.x + p2.x) / 2).toFixed(1)} ${((p1.y + p2.y) / 2).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      group.append(createSVG("path", { class: "ring-wire-base", d }));
      group.append(createSVG("path", { class: "ring-wire-flow", d }));
      wireLayer.append(group);
    }
  }

  cells.forEach((p, i) => {
    const g = createSVG("g", { class: "power-cell", "data-cell": i, transform: `translate(${p.x} ${p.y})` });
    g.innerHTML = `
      <circle class="cell-halo" r="30"></circle>
      <rect class="cell-shell" x="-22" y="-27" width="44" height="54" rx="13"></rect>
      <rect class="cell-cap" x="-8" y="-35" width="16" height="10" rx="4"></rect>
      <circle class="cell-core" r="12"></circle>
      <path class="cell-bolt" d="M-4 -8 L3 -8 L-1 0 L6 0 L-6 12 L-2 3 L-8 3 Z"></path>`;
    cellLayer.append(g);
  });

  robots.forEach((p, i) => {
    const g = createSVG("g", {
      class: "ring-robot",
      "data-robot": i,
      transform: `translate(${p.x} ${p.y})`,
      tabindex: 0,
      role: "button",
      "aria-label": `Roboter ${positionNames[i]} auswählen`
    });
    g.innerHTML = `
      <circle class="robot-hit" r="72"></circle>
      <g class="robot-figure">
        <circle class="robot-aura" r="64"></circle>
        <line class="bot-antenna" x1="0" y1="-52" x2="0" y2="-69"></line>
        <circle class="bot-antenna-tip" cx="0" cy="-73" r="7"></circle>
        <rect class="bot-head" x="-43" y="-48" width="86" height="64" rx="13"></rect>
        <circle class="bot-ear bot-ear-l" cx="-47" cy="-15" r="10"></circle>
        <circle class="bot-ear bot-ear-r" cx="47" cy="-15" r="10"></circle>
        <circle class="bot-eye" cx="-18" cy="-18" r="9"></circle>
        <circle class="bot-eye" cx="18" cy="-18" r="9"></circle>
        <circle class="bot-eye-dot" cx="-15" cy="-21" r="2.7"></circle>
        <circle class="bot-eye-dot" cx="21" cy="-21" r="2.7"></circle>
        <path class="bot-mouth" d="M-12 1 Q0 10 12 1"></path>
        <rect class="bot-body" x="-35" y="20" width="70" height="62" rx="14"></rect>
        <circle class="bot-core" cx="0" cy="49" r="13"></circle>
        <line class="bot-arm" x1="-35" y1="35" x2="-55" y2="61"></line>
        <line class="bot-arm" x1="35" y1="35" x2="55" y2="61"></line>
        <circle class="served-badge" cx="41" cy="-48" r="16"></circle>
        <path class="served-check" d="M33 -48 L39 -42 L50 -55"></path>
        <circle class="busy-ring" r="57"></circle>
      </g>`;
    g.addEventListener("click", () => toggleRobot(i));
    g.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleRobot(i);
      }
    });
    robotLayer.append(g);
  });

  const mini = $("#miniProgress");
  mini.innerHTML = "";
  for (let i = 0; i < N; i++) {
    mini.append(createSVG("circle", { class: "mini-dot", "data-mini": i, cx: i * 25, cy: 0, r: 7 }));
  }
}

function render() {
  const served = servedCount();
  $("#centerCount").textContent = `${served} / 5`;
  $("#servedLabel").textContent = `${served} von 5`;
  $("#activeLabel").textContent = String(activeCount());
  $("#moveCount").textContent = String(state.moves);
  progressBar.style.width = `${Math.max(14, served / N * 100)}%`;

  $$(".ring-robot").forEach(node => {
    const i = Number(node.dataset.robot);
    node.classList.toggle("charging", state.active[i]);
    node.classList.toggle("served", state.served[i]);
    node.classList.toggle("available", !state.active[i] && canStart(i));
    node.classList.toggle("blocked", !state.active[i] && !canStart(i));
  });

  $$(".power-cell").forEach(node => {
    const c = Number(node.dataset.cell);
    const owner = cellOwner(c);
    node.classList.toggle("used", owner !== null);
    node.dataset.owner = owner === null ? "" : String(owner);
  });

  $$(".ring-wire").forEach(node => {
    const c = Number(node.dataset.cell);
    const r = Number(node.dataset.robot);
    const owner = cellOwner(c);
    node.classList.toggle("powering", owner === r);
    node.classList.toggle("dimmed", owner !== null && owner !== r);
  });

  $$(".mini-dot").forEach(dot => {
    const i = Number(dot.dataset.mini);
    dot.classList.toggle("done", state.served[i]);
  });

  updateStars();
}

function flashRobot(i, cls = "error") {
  const node = $(`.ring-robot[data-robot='${i}']`);
  node.classList.remove(cls);
  void node.getBBox();
  node.classList.add(cls);
  setTimeout(() => node.classList.remove(cls), 500);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function animatePower(i, direction = "in") {
  const cells = adjacentCells(i);
  const wires = cells.map(c => $(`.ring-wire[data-cell='${c}'][data-robot='${i}']`));
  wires.forEach(w => w.classList.add(direction === "in" ? "burst-in" : "burst-out"));
  const robot = $(`.ring-robot[data-robot='${i}']`);
  robot.classList.add("power-pop");
  await sleep(620);
  wires.forEach(w => w.classList.remove("burst-in", "burst-out"));
  robot.classList.remove("power-pop");
}

async function toggleRobot(i) {
  if (state.complete) {
    say(`Du hast die Mission in ${state.moves} Aktionen geschafft. Der optimale Weg braucht genau 8.`, "success");
    return;
  }

  if (state.active[i]) {
    state.moves++;
    state.history.push({ type: "release", robot: i });
    state.active[i] = false;
    render();
    await animatePower(i, "out");
    say(`Der Roboter ${positionNames[i]} gibt seine beiden Energiezellen wieder frei. Jetzt können seine Nachbarn sie benutzen.`, "explaining");
    return;
  }

  if (!canStart(i)) {
    state.mistakes++;
    state.history.push({ type: "blocked", robot: i, neighbors: neighbors(i).filter(n => state.active[n]) });
    flashRobot(i);
    updateStars();
    const blockers = neighbors(i).filter(n => state.active[n]);
    if (blockers.length === 1) {
      say(`Dieser Roboter kann gerade nicht laden. Sein Nachbar ${positionNames[blockers[0]]} benutzt eine gemeinsame Energiezelle.`, "questioning");
    } else {
      say("Der Roboter sitzt zwischen zwei ladenden Nachbarn. Beide gemeinsamen Energiezellen sind gerade belegt.", "thinking");
    }
    return;
  }

  state.moves++;
  state.active[i] = true;
  const firstTime = !state.served[i];
  state.served[i] = true;
  state.history.push({ type: "charge", robot: i, firstTime });
  render();
  await animatePower(i, "in");

  if (servedCount() === N) {
    state.complete = true;
    render();
    const stars = starCount();
    rewardStars.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    rewardText.textContent = stars === 3
      ? `Perfekt geplant: alle fünf in ${state.moves} Aktionen.`
      : `Alle fünf wurden versorgt. Du hast ${state.moves} Aktionen gebraucht.`;
    rewardPanel.hidden = false;
    window.RoboProgress?.mark("level3", {completed:true, perfect:state.moves===8, bestStars:stars, bestMoves:state.moves});
    say(state.moves === 8
      ? `Wow! Alle fünf hatten Energie – und du hast den optimalen Weg mit genau ${state.moves} Aktionen gefunden!`
      : `Geschafft! Jeder Roboter hatte mindestens einmal Energie. Du hast ${state.moves} Aktionen gebraucht. Optimal sind 8.`, "success");
    return;
  }

  const served = servedCount();
  const active = activeCount();
  if (active === 2) {
    say(`Sehr gut! Zwei Roboter laden gleichzeitig, ohne sich eine Energiezelle zu teilen. ${served} von 5 wurden schon versorgt.`, "success");
  } else if (!firstTime) {
    say(`Der Roboter ${positionNames[i]} lädt wieder. Für die Mission brauchen wir aber noch ${N - served} Roboter, die noch nie Energie hatten.`, "thinking");
  } else {
    say(`Energie fließt! ${served} von 5 Robotern hatten jetzt schon Energie.`, "success");
  }
}

function resetGame({ speak = true } = {}) {
  speech.stop();
  state.active.fill(false);
  state.served.fill(false);
  state.moves = 0;
  state.mistakes = 0;
  state.hints = 0;
  state.complete = false;
  state.history = [];
  rewardPanel.hidden = true;
  render();
  say("Diese fünf Roboter teilen sich ihre Energiezellen. Schaffst du es, dass jeder mindestens einmal leuchtet?", "greeting", { auto: speak });
}

$("#resetBtn").addEventListener("click", () => resetGame());
$("#replayBtn").addEventListener("click", () => resetGame());
$("#hintBtn").addEventListener("click", () => {
  state.hints++;
  updateStars();
  if (state.complete) {
    say(`Du hast es in ${state.moves} Aktionen geschafft. Für drei Sterne brauchst du den optimalen Weg mit genau 8 Aktionen.`, "success");
  } else if (state.hints === 1) {
    say("Wenn ein Roboter lädt, blockiert er seine beiden direkten Nachbarn. Zwei Roboter können aber gleichzeitig laden, wenn zwischen ihnen einer frei bleibt.", "thinking");
  } else if (state.hints === 2) {
    say("Versuche zuerst zwei Roboter, die nicht nebeneinander stehen. Gib danach gezielt Energiezellen wieder frei, damit neue Roboter drankommen.", "questioning");
  } else {
    say("Für drei Sterne brauchst du fünfmal Energie nehmen, aber nur dreimal Energie zurückgeben. Am Ende dürfen also zwei Roboter noch laden.", "explaining");
  }
});

$("#explainBtn").addEventListener("click", () => {
  state.hints++;
  updateStars();
  say("Jeder Roboter braucht genau die zwei Energiezellen links und rechts neben sich. Während er lädt, sind diese beiden Zellen für seine Nachbarn gesperrt. Klick ihn noch einmal an, damit er sie zurückgibt.", "explaining");
});

$("#profiBtn").addEventListener("click",()=>{const box=$("#profiBox"),btn=$("#profiBtn");box.hidden=!box.hidden;btn.setAttribute("aria-expanded",String(!box.hidden));});

speakBtn.addEventListener("click", () => {
  if (avatarOrbit.classList.contains("speaking")) speech.stop();
  else {
    speech.hasUserGesture = true;
    speech.speak(currentMessage, { force: true });
  }
});
autoSpeakToggle.addEventListener("change", () => speech.setAuto(autoSpeakToggle.checked));
voiceSelect.addEventListener("change", () => {
  if (avatarOrbit.classList.contains("speaking")) {
    speech.stop();
    speech.speak(currentMessage, { force: true });
  }
});

$("#questionForm").addEventListener("submit", async e => {
  e.preventDefault();
  const input = $("#questionInput");
  const q = input.value.trim();
  if (!q) return;
  input.value = "";
  const lower = q.toLowerCase();
  const smallTalk = window.PetriPresentation.smallTalkReply(q);
  if (smallTalk) {
    say(smallTalk.message, smallTalk.mood);
    return;
  }

  if (aiApi.available) {
    say("Ich denke kurz nach …", "thinking", { auto: false });
    try {
      const reply = await aiApi.intervene({
        learningGoal: "Ein Kind versteht geteilte Ressourcen, Konflikt und Nebenläufigkeit: Jeder von fünf Robotern soll mindestens einmal Energie bekommen; jeder braucht zwei benachbarte Energiezellen, die während des Ladens belegt sind.",
        verifiedFacts: {
          activeRobots: state.active.map((v, i) => v ? i : null).filter(v => v !== null),
          servedRobots: state.served.map((v, i) => v ? i : null).filter(v => v !== null),
          freeCells: Array.from({ length: N }, (_, c) => cellOwner(c) === null ? c : null).filter(v => v !== null),
          startableRobots: Array.from({ length: N }, (_, i) => canStart(i) ? i : null).filter(v => v !== null),
          moves: state.moves,
          goalReached: state.complete
        },
        learnerAction: { type: "question" },
        learnerMessage: q,
        interactionHistory: state.history.slice(-8)
      });
      say(reply.message, reply.robotState || "explaining");
      return;
    } catch (err) {
      console.warn(err);
    }
  }

  if (lower.includes("warum") && (lower.includes("nicht") || lower.includes("geht") || lower.includes("laden"))) {
    say("Wenn ein Roboter nicht laden kann, benutzt mindestens einer seiner direkten Nachbarn gerade eine gemeinsame Energiezelle. Gib diese Energie zuerst wieder frei.", "explaining");
  } else if (lower.includes("acht") || lower.includes("3 stern") || lower.includes("drei stern")) {
    say("Der beste Weg braucht fünf Lade-Aktionen und nur drei Freigaben. Am Ende dürfen zwei nicht benachbarte Roboter noch laden.", "thinking");
  } else if (lower.includes("gleichzeitig") || lower.includes("zwei")) {
    say("Zwei Roboter können gleichzeitig laden, wenn sie nicht direkt nebeneinander stehen. Dann teilen sie keine Energiezelle.", "explaining");
  } else if (lower.includes("petri") || lower.includes("token") || lower.includes("transition")) {
    say("Unter der Spielgrafik steckt ein Petri-Netz: Die Energiezellen und Roboterzustände sind Stellen, das Nehmen und Zurückgeben von Energie sind Transitionen.", "greeting");
  } else {
    say("Probier ruhig aus. Wichtig ist: Jeder Roboter braucht seine beiden Nachbar-Energiezellen – und jeder soll mindestens einmal Energie bekommen.", "questioning");
  }
});

async function initAI() {
  const status = await aiApi.checkStatus();
  aiStatus.textContent = status.available ? `Cloud-Robo bereit · ${status.model}` : "Offline-Robo: Spielwissen + kleiner Smalltalk.";
  aiStatus.title = status.message || "";
}

buildBoard();
render();
scheduleBlink();
say("Diese fünf Roboter teilen sich ihre Energiezellen. Schaffst du es, dass jeder mindestens einmal leuchtet?", "greeting", { auto: false });
window.PetriPresentation.firstVisitIntro('level3',()=>say('So geht das Spiel: Jeder Roboter braucht beide Energiezellen neben sich. Klick einen freien Roboter zum Laden an und später noch einmal zum Freigeben. Am Ende soll jeder mindestens einmal Energie gehabt haben.','explaining'));
void initAI();
