/*
======================================================================
    DATOS BASE
====================================================================== 
*/
const nombres_disponibles = [
    "Amir",
    "Beto",
    "Caro",
    "Dani",
    "Eli",
    "Fabio",
    "Gaby",
    "Hugo",
    "Iris",
    "Jose",
    "Kira",
    "Luis",
];
const colores_componentes = [
    "#22D3C7",
    "#FF8A5B",
    "#C084FC",
    "#FACC15",
    "#60A5FA",
    "#F472B6",
    "#34D399",
    "#FB7185",
];
const color_nodo_neutro = "#26314A";
const borde_nodo = "#3E4E70";
const color_arista_neutra = "#3A4A66";

const titulos_pasos = [
    "Matriz de adyacencia",
    "Matriz de caminos",
    "Ordenar filas",
    "Reordenar columnas",
];

let estado = null;

function crear_estado_inicial() {
    return {
        pantalla: "config",
        n: 6,
        modo: "aleatorio",
        nombres: [],
        iniciales: [],
        matriz: [],
        posiciones: [],
        nodo_seleccionado_arista: null,
        paso_algoritmo: 0,
        matriz_entrada_caminos: null,
        matriz_caminos: null,
        filas_ordenadas: null,
        orden: null,
        matriz_reordenada: null,
        componentes: null,
    };
}

/*
======================================================================
    UTILIDADES DE GRAFOS Y MATRICES
====================================================================== 
*/
function crear_matriz_vacia(n) {
    return Array.from({ length: n }, () => Array(n).fill(0));
}

function calcular_posiciones(n) {
    const cx = 200,
        cy = 200,
        r = n <= 6 ? 128 : n <= 9 ? 145 : 158;
    const pts = [];
    for (let i = 0; i < n; i++) {
        const angle = -Math.PI / 2 + i * ((2 * Math.PI) / n);
        pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    return pts;
}

function generar_matriz_aleatoria(n) {
    const m = crear_matriz_vacia(n);
    const p = Math.min(0.55, 1.35 / n);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.random() < p) {
                m[i][j] = 1;
                m[j][i] = 1;
            }
        }
    }
    return m;
}

function contar_unos(row) {
    return row.reduce((a, b) => a + b, 0);
}
function indice_primer_uno(row) {
    const idx = row.indexOf(1);
    return idx === -1 ? Infinity : idx;
}

function agregar_diagonal(matrix, n) {
    const m = matrix.map((r) => r.slice());
    for (let i = 0; i < n; i++) m[i][i] = 1;
    return m;
}

function calcular_clausura_transitiva(matrix, n) {
    const m = matrix.map((r) => r.slice());
    for (let k = 0; k < n; k++)
        for (let i = 0; i < n; i++)
            if (m[i][k]) for (let j = 0; j < n; j++) if (m[k][j]) m[i][j] = 1;
    return m;
}

function calcular_orden(matriz_caminos, n) {
    const idx = [...Array(n).keys()];
    idx.sort((a, b) => {
        const ca = contar_unos(matriz_caminos[a]),
            cb = contar_unos(matriz_caminos[b]);
        if (cb !== ca) return cb - ca;
        return (
            indice_primer_uno(matriz_caminos[a]) -
            indice_primer_uno(matriz_caminos[b])
        );
    });
    return idx;
}

function reordenar_matriz(matrix, order) {
    const n = order.length;
    const out = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) out[i][j] = matrix[order[i]][order[j]];
    return out;
}

function reordenar_solo_filas(matrix, order) {
    return order.map((i) => matrix[i].slice());
}

function detectar_componentes(reordered, order) {
    const n = order.length;
    const comps = [];
    let p = 0;
    while (p < n) {
        const size = contar_unos(reordered[p]);
        comps.push(order.slice(p, p + size));
        p += size;
    }
    return comps;
}

function ejecutar_algoritmo() {
    const n = estado.n;
    estado.matriz_entrada_caminos = agregar_diagonal(estado.matriz, n);
    estado.matriz_caminos = calcular_clausura_transitiva(
        estado.matriz_entrada_caminos,
        n,
    );
    estado.orden = calcular_orden(estado.matriz_caminos, n);
    estado.filas_ordenadas = reordenar_solo_filas(
        estado.matriz_caminos,
        estado.orden,
    );
    estado.matriz_reordenada = reordenar_matriz(
        estado.matriz_caminos,
        estado.orden,
    );
    estado.componentes = detectar_componentes(
        estado.matriz_reordenada,
        estado.orden,
    );
}

function crear_mapa_colores_componentes(components, n) {
    const map = new Array(n).fill(null);
    components.forEach((comp, ci) => {
        const color = colores_componentes[ci % colores_componentes.length];
        comp.forEach((nodeIdx) => {
            map[nodeIdx] = color;
        });
    });
    return map;
}

/* ======================================================================
   RENDER: GRAFO SVG
   ====================================================================== */
function renderizar_grafo_svg(opciones) {
    const {
        n,
        matriz,
        posiciones,
        nombres,
        iniciales,
        mapa_colores,
        selected,
        interactive,
        size,
    } = opciones;
    const dim = size || 400;
    let edges = "";
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (matriz[i][j]) {
                const stroke = mapa_colores
                    ? mapa_colores[i]
                    : color_arista_neutra;
                edges += `<line x1="${posiciones[i].x}" y1="${posiciones[i].y}" x2="${posiciones[j].x}" y2="${posiciones[j].y}" stroke="${stroke}" stroke-width="${mapa_colores ? 2.4 : 1.8}" stroke-linecap="round" opacity="${mapa_colores ? 0.9 : 0.75}"/>`;
            }
        }
    }
    let nodes = "";
    for (let i = 0; i < n; i++) {
        const p = posiciones[i];
        const fill = mapa_colores ? mapa_colores[i] : color_nodo_neutro;
        const esta_seleccionado = selected === i;
        const stroke = esta_seleccionado
            ? "#FFFFFF"
            : mapa_colores
              ? "#0B1220"
              : borde_nodo;
        const sw = esta_seleccionado ? 3 : mapa_colores ? 2 : 1.5;
        const color_texto = mapa_colores ? "#0B1220" : "var(--text)";
        const atributos_accion = interactive
            ? `data-action="pick-node" data-idx="${i}" style="cursor:pointer;"`
            : "";
        nodes += `
      <g ${atributos_accion}>
        <circle cx="${p.x}" cy="${p.y}" r="23" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
        <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" class="node-init" fill="${color_texto}">${iniciales[i]}</text>
        <text x="${p.x}" y="${p.y + 38}" text-anchor="middle" class="node-label">${nombres[i]}</text>
      </g>`;
    }
    return `<svg class="graph" viewBox="0 0 ${dim} ${dim}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Grafo de la red social con ${n} usuarios">
    ${edges}${nodes}
  </svg>`;
}

/* ======================================================================
   RENDER: TABLA DE MATRIZ
   ====================================================================== */
function renderizar_tabla_matriz(
    matrix,
    etiquetas_filas,
    etiquetas_columnas,
    opciones,
) {
    opciones = opciones || {};
    const n = matrix.length;
    let encabezado_tabla = `<encabezado_tabla><tr><th></th>${etiquetas_columnas.map((l) => `<th>${l}</th>`).join("")}</tr></encabezado_tabla>`;
    let rows = "";
    for (let i = 0; i < n; i++) {
        let cells = "";
        for (let j = 0; j < n; j++) {
            const val = matrix[i][j];
            let cls = val ? "one" : "";
            if (opciones.diagBg && i === j) cls += " diag";
            let style = "";
            if (opciones.bloque_de) {
                const bi = opciones.bloque_de[i],
                    bj = opciones.bloque_de[j];
                if (bi !== undefined && bi === bj && bi !== null) {
                    const color =
                        colores_componentes[bi % colores_componentes.length];
                    style = `style="background:${hexadecimal_a_rgba(color, 0.16)}; color:${val ? color : "var(--text-muted)"};"`;
                }
            }
            cells += `<td class="${cls}" ${style}>${val}</td>`;
        }
        rows += `<tr><th>${etiquetas_filas[i]}</th>${cells}</tr>`;
    }
    return `<div class="matrix-scroll"><table class="matrix">${encabezado_tabla}<tbody>${rows}</tbody></table></div>`;
}

function hexadecimal_a_rgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
}

/* 
======================================================================
   PANTALLA: CONFIGURACIÓN
====================================================================== 
*/
function renderizar_pantalla_configuracion() {
    const n = estado.n;
    const porcentaje_relleno = ((n - 4) / (12 - 4)) * 100;
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
              <input type="range" min="4" max="12" value="${n}" step="1" data-action="set-n" style="--fill:${porcentaje_relleno}%">
            </div>
          </div>
          <div class="count-caption">usuarios en la red</div>

          <h2 class="section-title">2. ¿Cómo se conectan?</h2>
          <p class="section-sub">Puedes armar tú mismo las amistades o dejar que la red se genere sola.</p>
          <div class="pill-group">
            <div class="pill ${estado.modo === "manual" ? "active" : ""}" data-action="set-mode" data-value="manual">
              <div class="pill-title">🖊️ Manual</div>
              <div class="pill-desc">Tú decides quién es amigo de quién.</div>
            </div>
            <div class="pill ${estado.modo === "aleatorio" ? "active" : ""}" data-action="set-mode" data-value="aleatorio">
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
          ${renderizar_grafo_svg({
              n: Math.min(n, 8),
              matriz: obtener_matriz_previsualizacion(Math.min(n, 8)),
              posiciones: calcular_posiciones(Math.min(n, 8)),
              nombres: nombres_disponibles.slice(0, Math.min(n, 8)),
              iniciales: nombres_disponibles
                  .slice(0, Math.min(n, 8))
                  .map((s) => s[0]),
              mapa_colores: obtener_colores_previsualizacion(Math.min(n, 8)),
          })}
        </div>
      </div>
    </div>
  </section>`;
}

let _previewMatrixCache = null,
    _previewMatrixN = null;
function obtener_matriz_previsualizacion(n) {
    if (_previewMatrixCache && _previewMatrixN === n)
        return _previewMatrixCache;
    _previewMatrixN = n;
    _previewMatrixCache = generar_matriz_aleatoria(n);
    return _previewMatrixCache;
}
function obtener_colores_previsualizacion(n) {
    const wd = agregar_diagonal(obtener_matriz_previsualizacion(n), n);
    const pm = calcular_clausura_transitiva(wd, n);
    const order = calcular_orden(pm, n);
    const ro = reordenar_matriz(pm, order);
    const comps = detectar_componentes(ro, order);
    return crear_mapa_colores_componentes(comps, n);
}

/* ======================================================================
   PANTALLA: CONSTRUCCIÓN MANUAL
   ====================================================================== */
function renderizar_pantalla_construccion() {
    const n = estado.n;
    let chips_aristas = "";
    let count = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (estado.matriz[i][j]) {
                count++;
                chips_aristas += `<span class="edge-chip">${estado.nombres[i]} ↔ ${estado.nombres[j]} <button data-action="remove-edge" data-i="${i}" data-j="${j}" aria-label="Quitar conexión">×</button></span>`;
            }
        }
    }
    if (!chips_aristas)
        chips_aristas = `<span class="empty-note">Aún no hay conexiones. Toca dos usuarios en el grafo para unirlos.</span>`;

    return `
  <section class="screen">
    <div class="panel">
      <h2 class="section-title">Construye las amistades de tu red</h2>
      <p class="section-sub">Toca un usuario y luego otro para crear (o quitar) una conexión entre ellos.</p>

      <div class="build-grid">
        <div>
          <div class="hint-box">
            💡 ${
                estado.nodo_seleccionado_arista === null
                    ? "Toca el primer usuario para empezar a conectar."
                    : `<b>${estado.nombres[estado.nodo_seleccionado_arista]}</b> seleccionado — toca a otro usuario para conectarlo (o tócalo de nuevo para cancelar).`
            }
          </div>
          <div class="graph-wrap">
            ${renderizar_grafo_svg({
                n,
                matriz: estado.matriz,
                posiciones: estado.posiciones,
                nombres: estado.nombres,
                iniciales: estado.iniciales,
                mapa_colores: null,
                selected: estado.nodo_seleccionado_arista,
                interactive: true,
            })}
          </div>
          <div class="stat-line">
            <span>Usuarios: <b>${n}</b></span>
            <span>Conexiones: <b>${count}</b></span>
          </div>
        </div>
        <div>
          <h2 class="section-title" style="font-size:15px;">Conexiones actuales</h2>
          <div class="edge-chip-row">${chips_aristas}</div>
          ${count > 0 ? `<div class="btn-row"><button class="btn btn-ghost btn-sm" data-action="clear-edges">Limpiar todas</button></div>` : ""}
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
function renderizar_puntos_pasos() {
    return titulos_pasos
        .map((t, i) => {
            let cls = "step-dot";
            if (i === estado.paso_algoritmo) cls += " active";
            else if (i < estado.paso_algoritmo) cls += " done";
            return `<div class="${cls}"><div class="sd-n">Paso ${i + 1}</div><div class="sd-t">${t}</div></div>`;
        })
        .join("");
}

function renderizar_pantalla_algoritmo() {
    const n = estado.n;
    const iniciales = estado.iniciales;
    const iniciales_ordenadas = estado.orden.map((i) => iniciales[i]);
    let html_matriz_cuerpo = "",
        explicacion = "";

    if (estado.paso_algoritmo === 0) {
        explicacion = `Cada <b>1</b> indica una amistad directa entre dos usuarios. Antes de analizar la red, agregamos <b>1 en toda la diagonal</b>: cada usuario se considera conectado consigo mismo.`;
        html_matriz_cuerpo = renderizar_tabla_matriz(
            estado.matriz_entrada_caminos,
            iniciales,
            iniciales,
            { diagBg: true },
        );
    } else if (estado.paso_algoritmo === 1) {
        explicacion = `Esta es la <b>matriz de caminos</b>: muestra a quién puede llegar cada usuario, de forma directa o a través de una cadena de amistades (amigo-de-amigo-de-amigo...).`;
        html_matriz_cuerpo = renderizar_tabla_matriz(
            estado.matriz_caminos,
            iniciales,
            iniciales,
            {},
        );
    } else if (estado.paso_algoritmo === 2) {
        explicacion = `Contamos los <b>1</b> de cada fila y las ordenamos de <b>mayor a menor</b>. Si hay un empate, colocamos primero la fila cuyo primer 1 está más cerca de la primera columna.`;
        html_matriz_cuerpo = renderizar_tabla_matriz(
            estado.filas_ordenadas,
            iniciales_ordenadas,
            iniciales,
            {},
        );
    } else if (estado.paso_algoritmo === 3) {
        explicacion = `Aplicamos el <b>mismo orden a las columnas</b>. Los bloques cuadrados de 1's que quedan sobre la diagonal son, exactamente, las <b>comunidades</b> de tu red social.`;
        const bloque_de = new Array(n).fill(null);
        estado.componentes.forEach((comp, ci) => {
            comp.forEach((origIdx) => {
                const pos = estado.orden.indexOf(origIdx);
                bloque_de[pos] = ci;
            });
        });
        html_matriz_cuerpo = renderizar_tabla_matriz(
            estado.matriz_reordenada,
            iniciales_ordenadas,
            iniciales_ordenadas,
            { bloque_de },
        );
    }

    const mapa_colores =
        estado.paso_algoritmo === 3
            ? crear_mapa_colores_componentes(estado.componentes, n)
            : null;

    return `
  <section class="screen">
    <div class="panel">
      <h2 class="section-title">Analizando tu red, paso a paso</h2>
      <p class="section-sub">El método matricial para encontrar componentes conexas.</p>
      <div class="steps-nav">${renderizar_puntos_pasos()}</div>

      <div class="algo-grid">
        <div>
          <div class="graph-wrap">
            ${renderizar_grafo_svg({ n, matriz: estado.matriz, posiciones: estado.posiciones, nombres: estado.nombres, iniciales, mapa_colores })}
          </div>
        </div>
        <div>
          <div class="explain-box">${explicacion}</div>
          ${html_matriz_cuerpo}
        </div>
      </div>

      <div class="algo-nav">
        <button class="btn btn-ghost btn-sm" data-action="algo-prev" ${estado.paso_algoritmo === 0 ? "disabled" : ""}>← Anterior</button>
        <span class="count">Paso ${estado.paso_algoritmo + 1} de 4</span>
        <button class="btn btn-primary btn-sm" data-action="algo-next">${estado.paso_algoritmo === 3 ? "Ver resultado final →" : "Siguiente →"}</button>
      </div>
    </div>
  </section>`;
}

/* ======================================================================
   PANTALLA: RESULTADO
   ====================================================================== */
function renderizar_pantalla_resultado() {
    const n = estado.n;
    const mapa_colores = crear_mapa_colores_componentes(estado.componentes, n);
    let cards = estado.componentes
        .map((comp, ci) => {
            const color = colores_componentes[ci % colores_componentes.length];
            const chips = comp
                .map(
                    (idx) =>
                        `<span class="member-chip">${estado.nombres[idx]}</span>`,
                )
                .join("");
            const subtitle =
                comp.length === 1
                    ? "Sin conexiones directas — forma su propia comunidad."
                    : `${comp.length} usuarios conectados entre sí.`;
            return `<div class="community-card" style="border-left-color:${color};">
      <h3><span class="swatch" style="background:${color};"></span>Comunidad ${ci + 1}</h3>
      <p>${subtitle}</p>
      <div class="member-chips">${chips}</div>
    </div>`;
        })
        .join("");

    return `
  <section class="screen">
    <div class="panel">
      <div class="result-summary">
        <span class="big-n">${estado.componentes.length}</span>
        <span class="big-label">comunidad${estado.componentes.length === 1 ? "" : "es"} encontrada${estado.componentes.length === 1 ? "" : "s"} entre ${n} usuarios</span>
      </div>

      <div class="result-grid">
        <div class="graph-wrap">
          ${renderizar_grafo_svg({ n, matriz: estado.matriz, posiciones: estado.posiciones, nombres: estado.nombres, iniciales: estado.iniciales, mapa_colores })}
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
function renderizar() {
    const app = document.getElementById("app");
    if (estado.pantalla === "config")
        app.innerHTML = renderizar_pantalla_configuracion();
    else if (estado.pantalla === "manualBuild")
        app.innerHTML = renderizar_pantalla_construccion();
    else if (estado.pantalla === "algorithm")
        app.innerHTML = renderizar_pantalla_algoritmo();
    else if (estado.pantalla === "result")
        app.innerHTML = renderizar_pantalla_resultado();
}

/* ======================================================================
   EVENTOS
   ====================================================================== */
document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const action = t.dataset.action;

    if (action === "set-mode") {
        estado.modo = t.dataset.value;
        renderizar();
    } else if (action === "start") {
        estado.nombres = nombres_disponibles.slice(0, estado.n);
        estado.iniciales = estado.nombres.map((s) => s[0]);
        estado.posiciones = calcular_posiciones(estado.n);
        if (estado.modo === "manual") {
            estado.matriz = crear_matriz_vacia(estado.n);
            estado.nodo_seleccionado_arista = null;
            estado.pantalla = "manualBuild";
        } else {
            estado.matriz = generar_matriz_aleatoria(estado.n);
            ejecutar_algoritmo();
            estado.paso_algoritmo = 0;
            estado.pantalla = "algorithm";
        }
        renderizar();
    } else if (action === "pick-node") {
        const idx = parseInt(t.closest("[data-idx]").dataset.idx, 10);
        if (estado.nodo_seleccionado_arista === null) {
            estado.nodo_seleccionado_arista = idx;
        } else if (estado.nodo_seleccionado_arista === idx) {
            estado.nodo_seleccionado_arista = null;
        } else {
            const a = estado.nodo_seleccionado_arista,
                b = idx;
            estado.matriz[a][b] = estado.matriz[a][b] ? 0 : 1;
            estado.matriz[b][a] = estado.matriz[a][b];
            estado.nodo_seleccionado_arista = null;
        }
        renderizar();
    } else if (action === "remove-edge") {
        const i = parseInt(t.dataset.i, 10),
            j = parseInt(t.dataset.j, 10);
        estado.matriz[i][j] = 0;
        estado.matriz[j][i] = 0;
        renderizar();
    } else if (action === "clear-edges") {
        estado.matriz = crear_matriz_vacia(estado.n);
        renderizar();
    } else if (action === "confirm-manual") {
        ejecutar_algoritmo();
        estado.paso_algoritmo = 0;
        estado.pantalla = "algorithm";
        renderizar();
    } else if (action === "algo-prev") {
        if (estado.paso_algoritmo > 0) {
            estado.paso_algoritmo--;
            renderizar();
        }
    } else if (action === "algo-next") {
        if (estado.paso_algoritmo < 3) {
            estado.paso_algoritmo++;
            renderizar();
        } else {
            estado.pantalla = "result";
            renderizar();
        }
    } else if (action === "restart") {
        const n = estado.n,
            mode = estado.modo;
        estado = crear_estado_inicial();
        estado.n = n;
        estado.modo = mode;
        renderizar();
    }
});

document.addEventListener("input", (evento) => {
    if (evento.target.dataset && evento.target.dataset.action === "set-n") {
        estado.n = parseInt(evento.target.value, 10);
        const porcentaje_relleno = ((estado.n - 4) / (12 - 4)) * 100;
        evento.target.style.setProperty("--fill", porcentaje_relleno + "%");
        const indicador_cantidad = document.querySelector(".count-display");
        if (indicador_cantidad) {
            indicador_cantidad.textContent = estado.n;
        }
    }
});

document.addEventListener("change", (evento) => {
    if (evento.target.dataset && evento.target.dataset.action === "set-n") {
        renderizar();
    }
});

/* ======================================================================
   INICIO
   ====================================================================== */
estado = crear_estado_inicial();
renderizar();
