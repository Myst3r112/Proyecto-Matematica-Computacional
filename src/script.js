/*
======================================================================
    DATOS BASE
====================================================================== 
*/
const NAME_POOL = ["Amir","Beto","Caro","Dani","Eli","Fabio","Gaby","Hugo","Iris","Jose","Kira","Luis"];
const COMPONENT_COLORS = ["#22D3C7","#FF8A5B","#C084FC","#FACC15","#60A5FA","#F472B6","#34D399","#FB7185"];
const NODE_NEUTRAL = "#26314A";
const NODE_BORDER  = "#3E4E70";
const EDGE_NEUTRAL = "#3A4A66";

const STEP_TITLES = [
  "Matriz de adyacencia",
  "Matriz de caminos",
  "Ordenar filas",
  "Reordenar columnas"
];

let state = null;

function freshState(){
    return {
        screen: "config",
        n: 6,
        mode: "aleatorio",
        names: [],
        initials: [],
        matrix: [],
        positions: [],
        selectedNodeForEdge: null,
        algoStep: 0,
        pathInput: null,
        pathMatrix: null,
        rowsSortedOnly: null,
        order: null,
        reordered: null,
        components: null
    };
}

/*
======================================================================
    UTILIDADES DE GRAFOS Y MATRICES
====================================================================== 
*/
function emptyMatrix(n){ return Array.from({length:n}, () => Array(n).fill(0)); }

function computePositions(n){
    const cx = 200, cy = 200, r = n <= 6 ? 128 : (n <= 9 ? 145 : 158);
    const pts = [];
    for(let i=0;i<n;i++) {
        const angle = -Math.PI/2 + i * (2*Math.PI/n);
        pts.push({ x: cx + r*Math.cos(angle), y: cy + r*Math.sin(angle) });
    }
    return pts;
}

function randomizeMatrix(n){
    const m = emptyMatrix(n);
    const p = Math.min(0.55, 1.35/n);
    for(let i=0;i<n;i++){
        for(let j=i+1;j<n;j++){
            if(Math.random() < p){ m[i][j]=1; m[j][i]=1; }
        }
    }
    return m;
}

function countOnes(row) { return row.reduce((a,b)=>a+b,0); }
function firstOneIndex(row) { const idx = row.indexOf(1); return idx === -1 ? Infinity : idx; }

function withDiagonal(matrix, n){
    const m = matrix.map(r => r.slice());
    for(let i=0;i<n;i++) m[i][i] = 1;
    return m;
}

function transitiveClosure(matrix, n){
  const m = matrix.map(r => r.slice());
    for(let k=0;k<n;k++)
        for(let i=0;i<n;i++)
            if(m[i][k])
                for(let j=0;j<n;j++)
                    if(m[k][j]) m[i][j] = 1;
    return m;
}

function computeOrder(pathMatrix, n){
    const idx = [...Array(n).keys()];
    idx.sort((a,b) => {
        const ca = countOnes(pathMatrix[a]), cb = countOnes(pathMatrix[b]);
        if(cb !== ca) return cb - ca;
        return firstOneIndex(pathMatrix[a]) - firstOneIndex(pathMatrix[b]);
    });
    return idx;
}

function reorderMatrix(matrix, order){
  const n = order.length;
  const out = Array.from({length:n}, () => Array(n).fill(0));
  for(let i=0;i<n;i++)
    for(let j=0;j<n;j++)
      out[i][j] = matrix[order[i]][order[j]];
  return out;
}

function reorderRowsOnly(matrix, order){
  return order.map(i => matrix[i].slice());
}

function detectComponents(reordered, order){
  const n = order.length;
  const comps = [];
  let p = 0;
  while(p < n){
    const size = countOnes(reordered[p]);
    comps.push(order.slice(p, p+size));
    p += size;
  }
  return comps;
}

function runAlgorithm(){
  const n = state.n;
  state.pathInput = withDiagonal(state.matrix, n);
  state.pathMatrix = transitiveClosure(state.pathInput, n);
  state.order = computeOrder(state.pathMatrix, n);
  state.rowsSortedOnly = reorderRowsOnly(state.pathMatrix, state.order);
  state.reordered = reorderMatrix(state.pathMatrix, state.order);
  state.components = detectComponents(state.reordered, state.order);
}

function colorMapFromComponents(components, n){
  const map = new Array(n).fill(null);
  components.forEach((comp, ci) => {
    const color = COMPONENT_COLORS[ci % COMPONENT_COLORS.length];
    comp.forEach(nodeIdx => { map[nodeIdx] = color; });
  });
  return map;
}

/* ======================================================================
   RENDER: GRAFO SVG
   ====================================================================== */
function renderGraphSVG(opts){
  const { n, matrix, positions, names, initials, colorMap, selected, interactive, size } = opts;
  const dim = size || 400;
  let edges = "";
  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++){
      if(matrix[i][j]){
        const stroke = colorMap ? colorMap[i] : EDGE_NEUTRAL;
        edges += `<line x1="${positions[i].x}" y1="${positions[i].y}" x2="${positions[j].x}" y2="${positions[j].y}" stroke="${stroke}" stroke-width="${colorMap?2.4:1.8}" stroke-linecap="round" opacity="${colorMap?0.9:0.75}"/>`;
      }
    }
  }
  let nodes = "";
  for(let i=0;i<n;i++){
    const p = positions[i];
    const fill = colorMap ? colorMap[i] : NODE_NEUTRAL;
    const isSel = selected === i;
    const stroke = isSel ? "#FFFFFF" : (colorMap ? "#0B1220" : NODE_BORDER);
    const sw = isSel ? 3 : (colorMap ? 2 : 1.5);
    const textFill = colorMap ? "#0B1220" : "var(--text)";
    const actionAttrs = interactive ? `data-action="pick-node" data-idx="${i}" style="cursor:pointer;"` : "";
    nodes += `
      <g ${actionAttrs}>
        <circle cx="${p.x}" cy="${p.y}" r="23" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
        <text x="${p.x}" y="${p.y+5}" text-anchor="middle" class="node-init" fill="${textFill}">${initials[i]}</text>
        <text x="${p.x}" y="${p.y+38}" text-anchor="middle" class="node-label">${names[i]}</text>
      </g>`;
  }
  return `<svg class="graph" viewBox="0 0 ${dim} ${dim}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Grafo de la red social con ${n} usuarios">
    ${edges}${nodes}
  </svg>`;
}

/* ======================================================================
   RENDER: TABLA DE MATRIZ
   ====================================================================== */
function renderMatrixTable(matrix, rowLabels, colLabels, opts){
  opts = opts || {};
  const n = matrix.length;
  let thead = `<thead><tr><th></th>${colLabels.map(l=>`<th>${l}</th>`).join("")}</tr></thead>`;
  let rows = "";
  for(let i=0;i<n;i++){
    let cells = "";
    for(let j=0;j<n;j++){
      const val = matrix[i][j];
      let cls = val ? "one" : "";
      if(opts.diagBg && i===j) cls += " diag";
      let style = "";
      if(opts.blockOf){
        const bi = opts.blockOf[i], bj = opts.blockOf[j];
        if(bi !== undefined && bi === bj && bi !== null){
          const color = COMPONENT_COLORS[bi % COMPONENT_COLORS.length];
          style = `style="background:${hexToRgba(color,0.16)}; color:${val? color : 'var(--text-muted)'};"`;
        }
      }
      cells += `<td class="${cls}" ${style}>${val}</td>`;
    }
    rows += `<tr><th>${rowLabels[i]}</th>${cells}</tr>`;
  }
  return `<div class="matrix-scroll"><table class="matrix">${thead}<tbody>${rows}</tbody></table></div>`;
}

function hexToRgba(hex, a){
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/* 
======================================================================
   PANTALLA: CONFIGURACIÓN
====================================================================== 
*/
function renderConfigScreen(){
  const n = state.n;
  const fillPct = ((n-4)/(12-4))*100;
  return `
  <section class="screen">
    <h1 class="hero-title">Descubre las comunidades escondidas en tu red social</h1>
    <p class="hero-sub">Crea una pequeña red de usuarios, conéctalos como amigos y observa —paso a paso— cómo el algoritmo de componentes conexas separa la red en comunidades.</p>

    <div class="panel">
      <div class="config-grid">
        <div>
          <h2 class="section-title">1. ¿Cuántos usuarios tendrá tu red?</h2>
          <p class="section-sub">Elige entre 4 y 12 usuarios.</p>
          <div class="count-row">
            <div class="count-display">${n}</div>
            <div class="count-slider">
              <input type="range" min="4" max="12" value="${n}" step="1" data-action="set-n" style="--fill:${fillPct}%">
            </div>
          </div>
          <div class="count-caption">usuarios en la red</div>

          <h2 class="section-title">2. ¿Cómo se conectan?</h2>
          <p class="section-sub">Puedes armar tú mismo las amistades o dejar que la red se genere sola.</p>
          <div class="pill-group">
            <div class="pill ${state.mode==='manual'?'active':''}" data-action="set-mode" data-value="manual">
              <div class="pill-title">🖊️ Manual</div>
              <div class="pill-desc">Tú decides quién es amigo de quién.</div>
            </div>
            <div class="pill ${state.mode==='aleatorio'?'active':''}" data-action="set-mode" data-value="aleatorio">
              <div class="pill-title">🎲 Aleatoria</div>
              <div class="pill-desc">El sistema genera las amistades por ti.</div>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" data-action="start">Crear red →</button>
          </div>

          <div class="mini-legend">
            <b>¿Qué va a pasar?</b> Vas a ver la matriz de adyacencia de tu red, cómo se calcula la matriz de caminos, y cómo —ordenando filas y columnas— aparecen bloques que revelan las comunidades.
          </div>
        </div>

        <div class="preview-box">
          ${renderGraphSVG({
            n: Math.min(n,8),
            matrix: previewMatrix(Math.min(n,8)),
            positions: computePositions(Math.min(n,8)),
            names: NAME_POOL.slice(0,Math.min(n,8)),
            initials: NAME_POOL.slice(0,Math.min(n,8)).map(s=>s[0]),
            colorMap: previewColors(Math.min(n,8))
          })}
        </div>
      </div>
    </div>
  </section>`;
}

let _previewMatrixCache = null, _previewMatrixN = null;
function previewMatrix(n){
  if(_previewMatrixCache && _previewMatrixN === n) return _previewMatrixCache;
  _previewMatrixN = n;
  _previewMatrixCache = randomizeMatrix(n);
  return _previewMatrixCache;
}
function previewColors(n){
  const wd = withDiagonal(previewMatrix(n), n);
  const pm = transitiveClosure(wd, n);
  const order = computeOrder(pm, n);
  const ro = reorderMatrix(pm, order);
  const comps = detectComponents(ro, order);
  return colorMapFromComponents(comps, n);
}

/* ======================================================================
   PANTALLA: CONSTRUCCIÓN MANUAL
   ====================================================================== */
function renderManualBuildScreen(){
  const n = state.n;
  let edgeChips = "";
  let count = 0;
  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++){
      if(state.matrix[i][j]){
        count++;
        edgeChips += `<span class="edge-chip">${state.names[i]} ↔ ${state.names[j]} <button data-action="remove-edge" data-i="${i}" data-j="${j}" aria-label="Quitar conexión">×</button></span>`;
      }
    }
  }
  if(!edgeChips) edgeChips = `<span class="empty-note">Aún no hay conexiones. Toca dos usuarios en el grafo para unirlos.</span>`;

  return `
  <section class="screen">
    <div class="panel">
      <h2 class="section-title">Construye las amistades de tu red</h2>
      <p class="section-sub">Toca un usuario y luego otro para crear (o quitar) una conexión entre ellos.</p>

      <div class="build-grid">
        <div>
          <div class="hint-box">
            💡 ${state.selectedNodeForEdge===null
                ? "Toca el primer usuario para empezar a conectar."
                : `<b>${state.names[state.selectedNodeForEdge]}</b> seleccionado — toca a otro usuario para conectarlo (o tócalo de nuevo para cancelar).`}
          </div>
          <div class="graph-wrap">
            ${renderGraphSVG({
              n, matrix: state.matrix, positions: state.positions,
              names: state.names, initials: state.initials,
              colorMap: null, selected: state.selectedNodeForEdge, interactive: true
            })}
          </div>
          <div class="stat-line">
            <span>Usuarios: <b>${n}</b></span>
            <span>Conexiones: <b>${count}</b></span>
          </div>
        </div>
        <div>
          <h2 class="section-title" style="font-size:15px;">Conexiones actuales</h2>
          <div class="edge-chip-row">${edgeChips}</div>
          ${count>0 ? `<div class="btn-row"><button class="btn btn-ghost btn-sm" data-action="clear-edges">Limpiar todas</button></div>` : ""}
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-ghost" data-action="restart">← Empezar de nuevo</button>
        <button class="btn btn-primary" data-action="confirm-manual">Analizar esta red →</button>
      </div>
    </div>
  </section>`;
}

/* ======================================================================
   PANTALLA: ALGORITMO PASO A PASO
   ====================================================================== */
function stepDots(){
  return STEP_TITLES.map((t,i) => {
    let cls = "step-dot";
    if(i === state.algoStep) cls += " active";
    else if(i < state.algoStep) cls += " done";
    return `<div class="${cls}"><div class="sd-n">Paso ${i+1}</div><div class="sd-t">${t}</div></div>`;
  }).join("");
}

function renderAlgorithmScreen(){
  const n = state.n;
  const initials = state.initials;
  const orderInitials = state.order.map(i => initials[i]);
  let bodyMatrixHTML = "", explanation = "";

  if(state.algoStep === 0){
    explanation = `Cada <b>1</b> indica una amistad directa entre dos usuarios. Antes de analizar la red, agregamos <b>1 en toda la diagonal</b>: cada usuario se considera conectado consigo mismo.`;
    bodyMatrixHTML = renderMatrixTable(state.pathInput, initials, initials, { diagBg:true });
  } else if(state.algoStep === 1){
    explanation = `Esta es la <b>matriz de caminos</b>: muestra a quién puede llegar cada usuario, de forma directa o a través de una cadena de amistades (amigo-de-amigo-de-amigo...).`;
    bodyMatrixHTML = renderMatrixTable(state.pathMatrix, initials, initials, {});
  } else if(state.algoStep === 2){
    explanation = `Contamos los <b>1</b> de cada fila y las ordenamos de <b>mayor a menor</b>. Si hay un empate, colocamos primero la fila cuyo primer 1 está más cerca de la primera columna.`;
    bodyMatrixHTML = renderMatrixTable(state.rowsSortedOnly, orderInitials, initials, {});
  } else if(state.algoStep === 3){
    explanation = `Aplicamos el <b>mismo orden a las columnas</b>. Los bloques cuadrados de 1's que quedan sobre la diagonal son, exactamente, las <b>comunidades</b> de tu red social.`;
    const blockOf = new Array(n).fill(null);
    state.components.forEach((comp, ci) => {
      comp.forEach(origIdx => {
        const pos = state.order.indexOf(origIdx);
        blockOf[pos] = ci;
      });
    });
    bodyMatrixHTML = renderMatrixTable(state.reordered, orderInitials, orderInitials, { blockOf });
  }

  const colorMap = state.algoStep === 3 ? colorMapFromComponents(state.components, n) : null;

  return `
  <section class="screen">
    <div class="panel">
      <h2 class="section-title">Analizando tu red, paso a paso</h2>
      <p class="section-sub">El método matricial para encontrar componentes conexas.</p>
      <div class="steps-nav">${stepDots()}</div>

      <div class="algo-grid">
        <div>
          <div class="graph-wrap">
            ${renderGraphSVG({ n, matrix: state.matrix, positions: state.positions, names: state.names, initials, colorMap })}
          </div>
        </div>
        <div>
          <div class="explain-box">${explanation}</div>
          ${bodyMatrixHTML}
        </div>
      </div>

      <div class="algo-nav">
        <button class="btn btn-ghost btn-sm" data-action="algo-prev" ${state.algoStep===0?'disabled':''}>← Anterior</button>
        <span class="count">Paso ${state.algoStep+1} de 4</span>
        <button class="btn btn-primary btn-sm" data-action="algo-next">${state.algoStep===3?'Ver resultado final →':'Siguiente →'}</button>
      </div>
    </div>
  </section>`;
}

/* ======================================================================
   PANTALLA: RESULTADO
   ====================================================================== */
function renderResultScreen(){
  const n = state.n;
  const colorMap = colorMapFromComponents(state.components, n);
  let cards = state.components.map((comp, ci) => {
    const color = COMPONENT_COLORS[ci % COMPONENT_COLORS.length];
    const chips = comp.map(idx => `<span class="member-chip">${state.names[idx]}</span>`).join("");
    const subtitle = comp.length === 1
      ? "Sin conexiones directas — forma su propia comunidad."
      : `${comp.length} usuarios conectados entre sí.`;
    return `<div class="community-card" style="border-left-color:${color};">
      <h3><span class="swatch" style="background:${color};"></span>Comunidad ${ci+1}</h3>
      <p>${subtitle}</p>
      <div class="member-chips">${chips}</div>
    </div>`;
  }).join("");

  return `
  <section class="screen">
    <div class="panel">
      <div class="result-summary">
        <span class="big-n">${state.components.length}</span>
        <span class="big-label">comunidad${state.components.length===1?'':'es'} encontrada${state.components.length===1?'':'s'} entre ${n} usuarios</span>
      </div>

      <div class="result-grid">
        <div class="graph-wrap">
          ${renderGraphSVG({ n, matrix: state.matrix, positions: state.positions, names: state.names, initials: state.initials, colorMap })}
        </div>
        <div>${cards}</div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" data-action="restart">🔁 Probar con otra red</button>
      </div>
    </div>
  </section>`;
}

/* ======================================================================
   RENDER PRINCIPAL
   ====================================================================== */
function render(){
  const app = document.getElementById("app");
  if(state.screen === "config") app.innerHTML = renderConfigScreen();
  else if(state.screen === "manualBuild") app.innerHTML = renderManualBuildScreen();
  else if(state.screen === "algorithm") app.innerHTML = renderAlgorithmScreen();
  else if(state.screen === "result") app.innerHTML = renderResultScreen();
}

/* ======================================================================
   EVENTOS
   ====================================================================== */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-action]");
  if(!t) return;
  const action = t.dataset.action;

  if(action === "set-mode"){
    state.mode = t.dataset.value;
    render();
  }
  else if(action === "start"){
    state.names = NAME_POOL.slice(0, state.n);
    state.initials = state.names.map(s => s[0]);
    state.positions = computePositions(state.n);
    if(state.mode === "manual"){
      state.matrix = emptyMatrix(state.n);
      state.selectedNodeForEdge = null;
      state.screen = "manualBuild";
    } else {
      state.matrix = randomizeMatrix(state.n);
      runAlgorithm();
      state.algoStep = 0;
      state.screen = "algorithm";
    }
    render();
  }
  else if(action === "pick-node"){
    const idx = parseInt(t.closest("[data-idx]").dataset.idx, 10);
    if(state.selectedNodeForEdge === null){
      state.selectedNodeForEdge = idx;
    } else if(state.selectedNodeForEdge === idx){
      state.selectedNodeForEdge = null;
    } else {
      const a = state.selectedNodeForEdge, b = idx;
      state.matrix[a][b] = state.matrix[a][b] ? 0 : 1;
      state.matrix[b][a] = state.matrix[a][b];
      state.selectedNodeForEdge = null;
    }
    render();
  }
  else if(action === "remove-edge"){
    const i = parseInt(t.dataset.i,10), j = parseInt(t.dataset.j,10);
    state.matrix[i][j] = 0; state.matrix[j][i] = 0;
    render();
  }
  else if(action === "clear-edges"){
    state.matrix = emptyMatrix(state.n);
    render();
  }
  else if(action === "confirm-manual"){
    runAlgorithm();
    state.algoStep = 0;
    state.screen = "algorithm";
    render();
  }
  else if(action === "algo-prev"){
    if(state.algoStep > 0){ state.algoStep--; render(); }
  }
  else if(action === "algo-next"){
    if(state.algoStep < 3){ state.algoStep++; render(); }
    else { state.screen = "result"; render(); }
  }
  else if(action === "restart"){
    const n = state.n, mode = state.mode;
    state = freshState();
    state.n = n; state.mode = mode;
    render();
  }
});

document.addEventListener("input", (e) => {
  if(e.target.dataset && e.target.dataset.action === "set-n"){
    state.n = parseInt(e.target.value, 10);
    const fillPct = ((state.n-4)/(12-4))*100;
    e.target.style.setProperty("--fill", fillPct+"%");
    render();
  }
});

/* ======================================================================
   INICIO
   ====================================================================== */
state = freshState();
render();
