// =====================
// 1) DATOS
// =====================

const canciones = [
  "Billie Jean",
  "Sweet Child O' Mine",
  "Take On Me",
  "Like a Prayer",
  "Livin' on a Prayer",
  "Every Breath You Take",
  "Girls Just Want to Have Fun",
  "Eye of the Tiger",
  "With or Without You",
  "Don't Stop Believin'"
];

const segmentos = {
  "POP": "Fan del Pop",
  "ROCK": "Fan del Rock",
  "FIESTA": "Modo Fiesta",
  "NOST": "Nostálgico 80’s",
  "GENZ": "Nueva Generación"
};

const contextos = {
  "ICON": "¿Cuál es más ICÓNICA?",
  "BAIL": "¿Cuál es más BAILABLE?",
  "HIST": "¿Cuál marcó más la HISTORIA?",
  "PLAY": "¿Cuál pondrías primero en una playlist?"
};

const RATING_INICIAL = 1000;
const K = 32;
const STORAGE_KEY = "songmash_state_v1";

// =====================
// 2) ESTADO
// =====================

function defaultState(){
  const buckets = {};
  for (const seg of Object.keys(segmentos)){
    for (const ctx of Object.keys(contextos)){
      const key = `${seg}__${ctx}`;
      buckets[key] = {};
      canciones.forEach(c => buckets[key][c] = RATING_INICIAL);
    }
  }
  return { buckets, votes: [] };
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try { return JSON.parse(raw); }
  catch { return defaultState(); }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// =====================
// 3) ELO
// =====================

function expectedScore(ra, rb){
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateElo(bucket, a, b, winner){
  const ra = bucket[a], rb = bucket[b];
  const ea = expectedScore(ra, rb);
  const sa = (winner === "A") ? 1 : 0;
  const sb = (winner === "B") ? 1 : 0;

  bucket[a] = ra + K * (sa - ea);
  bucket[b] = rb + K * (sb - (1 - ea));
}

function randomPair(){
  const a = canciones[Math.floor(Math.random() * canciones.length)];
  let b = a;
  while (b === a){
    b = canciones[Math.floor(Math.random() * canciones.length)];
  }
  return [a, b];
}

function bucketKey(seg, ctx){ return `${seg}__${ctx}`; }

function topN(bucket, n=10){
  const arr = Object.entries(bucket).map(([item, rating]) => ({item, rating}));
  arr.sort((x,y) => y.rating - x.rating);
  return arr.slice(0, n);
}

// =====================
// 4) UI
// =====================

const segmentSelect = document.getElementById("segmentSelect");
const contextSelect = document.getElementById("contextSelect");
const questionEl = document.getElementById("question");
const labelA = document.getElementById("labelA");
const labelB = document.getElementById("labelB");
const btnA = document.getElementById("btnA");
const btnB = document.getElementById("btnB");
const btnNewPair = document.getElementById("btnNewPair");
const btnShowTop = document.getElementById("btnShowTop");
const topBox = document.getElementById("topBox");
const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");

let currentA = null;
let currentB = null;

function fillSelect(selectEl, obj){
  selectEl.innerHTML = "";
  for (const [k, v] of Object.entries(obj)){
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = v;
    selectEl.appendChild(opt);
  }
}

fillSelect(segmentSelect, segmentos);
fillSelect(contextSelect, contextos);

function refreshQuestion(){
  questionEl.textContent = contextos[contextSelect.value];
}

function newDuel(){
  [currentA, currentB] = randomPair();
  labelA.textContent = currentA;
  labelB.textContent = currentB;
  refreshQuestion();
}

function renderTop(){
  const key = bucketKey(segmentSelect.value, contextSelect.value);
  const bucket = state.buckets[key];
  const rows = topN(bucket);

  topBox.innerHTML = rows.map((r, idx) => `
    <div class="toprow">
      <div><b>${idx+1}.</b> ${r.item}</div>
      <div>${r.rating.toFixed(1)}</div>
    </div>
  `).join("");
}

function vote(winner){
  const key = bucketKey(segmentSelect.value, contextSelect.value);
  const bucket = state.buckets[key];

  updateElo(bucket, currentA, currentB, winner);

  state.votes.push({
    ts: new Date().toISOString(),
    segmento: segmentSelect.value,
    contexto: contextSelect.value,
    A: currentA,
    B: currentB,
    ganador: winner === "A" ? currentA : currentB
  });

  saveState();
  renderTop();
  newDuel();
}

btnA.addEventListener("click", () => vote("A"));
btnB.addEventListener("click", () => vote("B"));
btnNewPair.addEventListener("click", newDuel);
btnShowTop.addEventListener("click", renderTop);

btnReset.addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres reiniciar?")) return;
  state = defaultState();
  saveState();
  renderTop();
  newDuel();
});

btnExport.addEventListener("click", () => {
  if (!state.votes.length) return alert("No hay votos aún.");
  const headers = Object.keys(state.votes[0]);
  const csv = [
    headers.join(","),
    ...state.votes.map(v => headers.map(h => `"${v[h]}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], {type: "text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "80s_songmash_votos.csv";
  a.click();
});

newDuel();
renderTop();
refreshQuestion();
