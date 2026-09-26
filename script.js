/* Datos base */
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
    "José",
    "Kira",
    "Luis",
    "Abril",
    "Adrián",
    "Aitana",
    "Alejandro",
    "Alicia",
    "Alonso",
    "Amalia",
    "Andrés",
    "Ángel",
    "Antonio",
    "Ariadna",
    "Arturo",
    "Axel",
    "Bárbara",
    "Beatriz",
    "Benjamín",
    "Bianca",
    "Bruno",
    "Camila",
    "Carlos",
    "Catalina",
    "Cecilia",
    "César",
    "Clara",
    "Damián",
    "Daniela",
    "David",
    "Diego",
    "Elena",
    "Emilia",
    "Emilio",
    "Emma",
    "Enrique",
    "Esteban",
    "Eva",
    "Fabián",
    "Fernanda",
    "Francisco",
    "Gael",
    "Gabriela",
    "Inés",
    "Iván",
    "Javier",
    "Jimena",
    "Joaquín",
    "Jorge",
    "Julia",
    "Julián",
    "Laura",
    "Leo",
    "Leonor",
    "Lucía",
    "Manuel",
    "Marcela",
    "Marco",
    "Mariana",
    "Mateo",
    "Matías",
    "Maya",
    "Miguel",
    "Mía",
    "Nicolás",
    "Noa",
    "Olivia",
    "Óscar",
    "Pablo",
    "Paula",
    "Pedro",
    "Rafael",
    "Renata",
    "Rodrigo",
    "Romina",
    "Samuel",
    "Sara",
    "Sebastián",
    "Sofía",
    "Tomás",
    "Valentina",
    "Valeria",
    "Vicente",
    "Victoria",
    "Xavier",
    "Zoe",
    "Agustín",
    "Alma",
    "Ana",
    "Carolina",
    "Diana",
];
const cantidad_maxima_usuarios = 100;
const cantidad_maxima_iniciales = 12;
const colores_componentes = Array.from(
    { length: cantidad_maxima_usuarios },
    (_, indice) => generar_color_componente(indice),
);
const color_nodo_neutro = "#D9D1FF";
const color_arista_neutra = "#3A4A66";

const titulos_pasos = [
    "Matriz de adyacencia",
    "Matriz de caminos",
    "Ordenar filas",
    "Reordenar columnas",
];

let estado = null;
let configuraciones_grafos = [];
let instancias_grafos = [];
let desplazamiento_suave = null;
let distribucion_previsualizacion = null;

function crear_estado_inicial() {
    return {
        pantalla: "config",
        n: 6,
        modo: "aleatorio",
        nombres: [],
        iniciales: [],
        matriz: [],
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

/* Operaciones con grafos y matrices */
function crear_matriz_vacia(n) {
    return Array.from({ length: n }, () => Array(n).fill(0));
}

function obtener_nombres_red(n) {
    return Array.from({ length: n }, (_, indice) =>
        indice < nombres_disponibles.length
            ? nombres_disponibles[indice]
            : `Persona ${indice + 1}`,
    );
}

function generar_matriz_aleatoria(n) {
    const m = crear_matriz_vacia(n);
    const tamano_grupo_principal = Math.min(
        Math.max(2, n - 2),
        Math.max(2, Math.round(n * (0.6 + Math.random() * 0.16))),
    );
    const probabilidad_conexion_adicional = 0.06 + Math.random() * 0.08;
    const tamanos_grupos = [tamano_grupo_principal];
    let personas_restantes = n - tamano_grupo_principal;

    while (personas_restantes > 0) {
        if (personas_restantes <= 5) {
            if (personas_restantes === 1) {
                tamanos_grupos[tamanos_grupos.length - 1]++;
            } else {
                tamanos_grupos.push(personas_restantes);
            }
            break;
        }

        const tamano_maximo = Math.min(5, personas_restantes - 2);
        const tamano_grupo =
            2 + Math.floor(Math.random() * (tamano_maximo - 1));
        tamanos_grupos.push(tamano_grupo);
        personas_restantes -= tamano_grupo;
    }

    const personas = Array.from({ length: n }, (_, indice) => indice);
    for (let indice = personas.length - 1; indice > 0; indice--) {
        const otro_indice = Math.floor(Math.random() * (indice + 1));
        [personas[indice], personas[otro_indice]] = [
            personas[otro_indice],
            personas[indice],
        ];
    }

    let inicio_grupo = 0;
    tamanos_grupos.forEach((tamano_grupo) => {
        const grupo = personas.slice(inicio_grupo, inicio_grupo + tamano_grupo);
        inicio_grupo += tamano_grupo;

        for (let indice = 1; indice < grupo.length; indice++) {
            const persona = grupo[indice];
            const persona_conocida =
                grupo[Math.floor(Math.random() * indice)];
            m[persona][persona_conocida] = 1;
            m[persona_conocida][persona] = 1;
        }

        for (let fila = 0; fila < grupo.length; fila++) {
            for (let columna = fila + 1; columna < grupo.length; columna++) {
                if (Math.random() < probabilidad_conexion_adicional) {
                    m[grupo[fila]][grupo[columna]] = 1;
                    m[grupo[columna]][grupo[fila]] = 1;
                }
            }
        }
    });

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
        const color = obtener_color_componente(ci);
        comp.forEach((nodeIdx) => {
            map[nodeIdx] = color;
        });
    });
    return map;
}

function obtener_color_componente(indice) {
    return colores_componentes[indice % colores_componentes.length];
}

function generar_color_componente(indice) {
    const matiz = (indice * 137.508) % 360;
    const saturacion = 0.66 + (indice % 3) * 0.06;
    const luminosidad = 0.46 + (Math.floor(indice / 3) % 3) * 0.045;
    const c = (1 - Math.abs(2 * luminosidad - 1)) * saturacion;
    const x = c * (1 - Math.abs(((matiz / 60) % 2) - 1));
    const m = luminosidad - c / 2;
    const [rojo, verde, azul] =
        matiz < 60
            ? [c, x, 0]
            : matiz < 120
              ? [x, c, 0]
              : matiz < 180
                ? [0, c, x]
                : matiz < 240
                  ? [0, x, c]
                  : matiz < 300
                    ? [x, 0, c]
                    : [c, 0, x];
    return `#${[rojo, verde, azul]
        .map((valor) =>
            Math.round((valor + m) * 255)
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
}

/* Prepara los datos para mostrar la red interactiva */
function renderizar_grafo(opciones) {
    const indice = configuraciones_grafos.push(opciones) - 1;
    return `
        <div class="network-frame ${opciones.previsualizacion ? "preview-frame" : ""}">
            <div class="network-canvas" data-network-index="${indice}" role="img" aria-label="Red social con ${opciones.n} personas"></div>
            <div class="network-controls" aria-label="Controles de la red">
                <button type="button" data-action="zoom-in" aria-label="Acercar">+</button>
                <button type="button" data-action="zoom-out" aria-label="Alejar">−</button>
                <button type="button" data-action="fit-network" aria-label="Ver toda la red">⤢</button>
            </div>
            <div class="network-person" aria-live="polite">Selecciona un punto para ver quién es</div>
        </div>`;
}

function crear_elementos_grafo(opciones) {
    const cantidad = opciones.n;
    const etiquetas = cantidad > cantidad_maxima_iniciales;
    const orden_colores = new Map();
    const orden_nodos = Array.from(
        { length: cantidad },
        (_, indice) => indice,
    );
    if (opciones.mapa_colores) {
        opciones.mapa_colores.forEach((color) => {
            if (!orden_colores.has(color)) {
                orden_colores.set(color, orden_colores.size);
            }
        });
        orden_nodos.sort((a, b) => {
            const color_a = opciones.mapa_colores[a];
            const color_b = opciones.mapa_colores[b];
            return orden_colores.get(color_a) - orden_colores.get(color_b);
        });
    }

    const nodos = orden_nodos.map((indice) => ({
        data: {
            id: String(indice),
            nombre: opciones.nombres[indice],
            etiqueta: etiquetas
                ? String(indice + 1)
                : opciones.iniciales[indice],
            color: opciones.mapa_colores?.[indice] ?? color_nodo_neutro,
        },
        classes: opciones.selected === indice ? "seleccionado" : "",
    }));
    const aristas = [];
    for (let fila = 0; fila < cantidad; fila++) {
        for (let columna = fila + 1; columna < cantidad; columna++) {
            if (opciones.matriz[fila][columna]) {
                aristas.push({
                    data: {
                        id: `${fila}-${columna}`,
                        source: String(fila),
                        target: String(columna),
                        color:
                            opciones.mapa_colores?.[fila] ??
                            color_arista_neutra,
                    },
                });
            }
        }
    }
    return [...nodos, ...aristas];
}

function crear_opciones_distribucion(cantidad, etiquetas) {
    return {
        name: "cose",
        animate: false,
        fit: false,
        padding: etiquetas ? 32 : 42,
        nodeRepulsion: cantidad > 50 ? 3500 : 8000,
        idealEdgeLength: cantidad > 50 ? 38 : 52,
        gravity: cantidad > 50 ? 0.22 : 0.35,
        numIter: cantidad > 50 ? 180 : 250,
        randomize: true,
    };
}

function ejecutar_distribucion(instancia, lienzo, opciones) {
    const es_previsualizacion = opciones.previsualizacion === true;
    if (es_previsualizacion) {
        distribucion_previsualizacion?.stop();
    }

    const distribucion = instancia.layout(
        crear_opciones_distribucion(
            opciones.n,
            opciones.n > cantidad_maxima_iniciales,
        ),
    );
    if (es_previsualizacion) {
        distribucion_previsualizacion = distribucion;
    }

    distribucion.one("layoutstop", () => {
        const indice = Number(lienzo.dataset.networkIndex);
        if (configuraciones_grafos[indice] !== opciones) return;
        instancia.fit(instancia.elements(), opciones.n > 12 ? 32 : 42);
    });
    distribucion.run();
}

function posicionar_grafos() {
    distribucion_previsualizacion?.stop();
    distribucion_previsualizacion = null;
    instancias_grafos.forEach((instancia) => {
        instancia.stop();
        instancia.destroy();
    });
    instancias_grafos = [];

    if (typeof window.cytoscape !== "function") {
        document.querySelectorAll(".network-canvas").forEach((lienzo) => {
            lienzo.textContent =
                "No se pudo cargar el visor de redes. Revisa tu conexión a internet y vuelve a cargar la página.";
            lienzo.classList.add("network-error");
        });
        return;
    }

    document.querySelectorAll(".network-canvas").forEach((lienzo) => {
        const opciones =
            configuraciones_grafos[Number(lienzo.dataset.networkIndex)];
        const cantidad = opciones.n;
        const etiquetas = cantidad > cantidad_maxima_iniciales;
        const marco = lienzo.closest(".network-frame");
        if (!opciones.previsualizacion) {
            marco.style.setProperty(
                "--network-height",
                `${Math.max(320, Math.min(580, 220 + Math.sqrt(cantidad) * 34))}px`,
            );
        }

        const tamano_nodo = cantidad > 70 ? 22 : cantidad > 40 ? 24 : 29;
        const instancia = window.cytoscape({
            container: lienzo,
            elements: crear_elementos_grafo(opciones),
            minZoom: 0.08,
            maxZoom: 3,
            userZoomingEnabled: true,
            userPanningEnabled: true,
            boxSelectionEnabled: false,
            selectionType: "single",
            style: [
                {
                    selector: "node",
                    style: {
                        label: "data(etiqueta)",
                        width: tamano_nodo,
                        height: tamano_nodo,
                        "background-color": "data(color)",
                        "border-width": 1.5,
                        "border-color": "#ffffff",
                        color: "#25241f",
                        "font-family": "Inter, sans-serif",
                        "font-size": 10,
                        "font-weight": 700,
                        "text-valign": "center",
                        "text-halign": "center",
                        "text-outline-width": 0,
                        "overlay-opacity": 0,
                        "transition-property":
                            "background-color, border-color, width, height",
                        "transition-duration": 180,
                    },
                },
                {
                    selector: "node.seleccionado",
                    style: {
                        width: tamano_nodo + 8,
                        height: tamano_nodo + 8,
                        "border-width": 3,
                        "border-color": "#6244e8",
                        "z-index": 10,
                    },
                },
                {
                    selector: "edge",
                    style: {
                        width: cantidad > 50 ? 1 : 1.5,
                        "line-color": "data(color)",
                        opacity: 0.5,
                        "curve-style": "bezier",
                        "overlay-opacity": 0,
                    },
                },
            ],
            layout: { name: "preset" },
        });
        instancias_grafos.push(instancia);
        ejecutar_distribucion(instancia, lienzo, opciones);

        instancia.on("tap", "node", (evento) => {
            const nodo = evento.target;
            lienzo
                .closest(".network-frame")
                ?.querySelector(".network-person")
                ?.replaceChildren(document.createTextNode(nodo.data("nombre")));

            if (opciones.interactive) {
                seleccionar_nodo_red(Number(nodo.id()), instancia);
            } else {
                instancia.nodes().removeClass("seleccionado");
                nodo.addClass("seleccionado");
            }
        });
    });
}

function actualizar_vista_previa(n) {
    const lienzo = document.querySelector(".preview-frame .network-canvas");
    if (!lienzo) return;

    const indice = Number(lienzo.dataset.networkIndex);
    const instancia = instancias_grafos[indice];
    if (!instancia) return;

    const matriz = obtener_matriz_previsualizacion(n);
    const nombres = obtener_nombres_red(n);
    const opciones = {
        n,
        matriz,
        nombres,
        iniciales: nombres.map((nombre) => nombre[0]),
        mapa_colores: obtener_colores_previsualizacion(n),
        previsualizacion: true,
    };
    configuraciones_grafos[indice] = opciones;
    lienzo.setAttribute("aria-label", `Red social con ${n} personas`);
    distribucion_previsualizacion?.stop();
    instancia.elements().remove();
    instancia.add(crear_elementos_grafo(opciones));
    instancia.nodes().style({
        width: n > 70 ? 22 : n > 40 ? 24 : 29,
        height: n > 70 ? 22 : n > 40 ? 24 : 29,
    });
    instancia.edges().style({ width: n > 50 ? 1 : 1.5 });
    ejecutar_distribucion(instancia, lienzo, opciones);
}

function ajustar_vista_grafo(accion, control) {
    const lienzo = control.closest(".network-frame")?.querySelector(".network-canvas");
    if (!lienzo) return;

    const instancia = instancias_grafos[Number(lienzo.dataset.networkIndex)];
    if (!instancia) return;

    if (accion === "fit-network") {
        instancia.fit(
            instancia.elements(),
            lienzo.closest(".preview-frame") ? 32 : 42,
        );
        return;
    }

    instancia.zoom({
        level: instancia.zoom() * (accion === "zoom-in" ? 1.25 : 0.8),
        renderedPosition: {
            x: instancia.width() / 2,
            y: instancia.height() / 2,
        },
    });
}

window.addEventListener("resize", () => {
    window.requestAnimationFrame(() => {
        instancias_grafos.forEach((instancia) => instancia.resize());
        const lienzo = document.querySelector(".preview-frame .network-canvas");
        if (!lienzo) return;

        const instancia =
            instancias_grafos[Number(lienzo.dataset.networkIndex)];
        if (instancia) {
            instancia.fit(
                instancia.elements(),
                estado.n > cantidad_maxima_iniciales ? 32 : 42,
            );
        }
    });
});

/* Construye una tabla para la matriz */
function renderizar_tabla_matriz(
    matrix,
    etiquetas_filas,
    etiquetas_columnas,
    opciones,
) {
    opciones = opciones || {};
    const n = matrix.length;
    const tamano = n > 50 ? "large" : n > 24 ? "medium" : "small";
    let encabezado_tabla = `<thead><tr><th></th>${etiquetas_columnas.map((l) => `<th scope="col">${l}</th>`).join("")}</tr></thead>`;
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
                    const color = obtener_color_componente(bi);
                    style = `style="background:${hexadecimal_a_rgba(color, 0.16)}; color:${val ? color : "var(--text-muted)"};"`;
                }
            }
            cells += `<td class="${cls}" ${style}>${val}</td>`;
        }
        rows += `<tr><th scope="row">${etiquetas_filas[i]}</th>${cells}</tr>`;
    }
    return `<div class="matrix-scroll matrix-scroll-${tamano}" tabindex="0" role="region" aria-label="Matriz de ${n} por ${n}; desplázate para recorrer sus datos"><table class="matrix matrix-${tamano}">${encabezado_tabla}<tbody>${rows}</tbody></table></div>`;
}

function hexadecimal_a_rgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
}

/* Pantalla de configuración */
function renderizar_pantalla_configuracion() {
    const n = estado.n;
    const porcentaje_relleno = ((n - 4) / (cantidad_maxima_usuarios - 4)) * 100;
    return `
        <section class="screen screen-config">
            <div class="hero-copy">
                <span class="eyebrow"><span class="eyebrow-line"></span> TU RED, EN PERSPECTIVA</span>
                <h1 class="hero-title">Todo está<br /><em>conectado.</em></h1>
                <p class="hero-sub">Descubre los grupos que forman tus conexiones.</p>
            </div>

            <div class="panel config-panel">
                <div class="config-grid">
                    <div class="config-controls">
                        <div class="section-kicker">TAMAÑO DE LA RED</div>
                        <div class="count-row">
                            <div class="count-display">${n}</div>
                            <div class="count-slider">
                                <input aria-label="Cantidad de personas" type="range" min="4" max="${cantidad_maxima_usuarios}" value="${n}" step="1" data-action="set-n" style="--fill:${porcentaje_relleno}%">
                                <div class="range-labels"><span>4</span><span>${cantidad_maxima_usuarios}</span></div>
                            </div>
                        </div>

                        <div class="section-kicker mode-kicker">¿CÓMO EMPEZAMOS?</div>
                        <div class="pill-group">
                            <button type="button" class="pill ${estado.modo === "aleatorio" ? "active" : ""}" data-action="set-mode" data-value="aleatorio" aria-pressed="${estado.modo === "aleatorio"}">
                                <span class="pill-icon">✦</span>
                                <span class="pill-copy"><span class="pill-title">Sorpréndeme</span><span class="pill-desc">Crear al azar</span></span>
                                <span class="pill-check">✓</span>
                            </button>
                            <button type="button" class="pill ${estado.modo === "manual" ? "active" : ""}" data-action="set-mode" data-value="manual" aria-pressed="${estado.modo === "manual"}">
                                <span class="pill-icon">⌘</span>
                                <span class="pill-copy"><span class="pill-title">Yo decido</span><span class="pill-desc">Dibujar mi red</span></span>
                                <span class="pill-check">✓</span>
                            </button>
                        </div>
                        <button class="btn btn-primary start-button" data-action="start">
                            <span>Explorar mi red</span><span class="button-arrow">↗</span>
                        </button>
                        <div class="privacy-note"><span>✳</span> Sin cuentas. Solo curiosidad.</div>
                    </div>

                    <div class="preview-card">
                        <div class="preview-heading"><span>VISTA PREVIA</span><span class="live-indicator">EN VIVO</span></div>
                        <div class="preview-box">
                            ${renderizar_grafo({
                                n,
                                matriz: obtener_matriz_previsualizacion(n),
                                nombres: obtener_nombres_red(n),
                                iniciales: obtener_nombres_red(n).map(
                                    (nombre) => nombre[0],
                                ),
                                mapa_colores:
                                    obtener_colores_previsualizacion(n),
                                previsualizacion: true,
                            })}
                        </div>
                        <div class="preview-foot"><span class="preview-symbol">↗</span><span>Un grupo aparece cuando todos<br />pueden llegar entre sí.</span></div>
                    </div>
                </div>
            </div>
        </section>`;
}

let matriz_previsualizacion_cache = null;
let tamano_matriz_previsualizacion_cache = null;
function obtener_matriz_previsualizacion(n) {
    if (
        matriz_previsualizacion_cache &&
        tamano_matriz_previsualizacion_cache === n
    ) {
        return matriz_previsualizacion_cache;
    }
    tamano_matriz_previsualizacion_cache = n;
    matriz_previsualizacion_cache = generar_matriz_aleatoria(n);
    return matriz_previsualizacion_cache;
}
function obtener_colores_previsualizacion(n) {
    const wd = agregar_diagonal(obtener_matriz_previsualizacion(n), n);
    const pm = calcular_clausura_transitiva(wd, n);
    const order = calcular_orden(pm, n);
    const ro = reordenar_matriz(pm, order);
    const comps = detectar_componentes(ro, order);
    return crear_mapa_colores_componentes(comps, n);
}

/* Pantalla para armar la red */
function renderizar_pantalla_construccion() {
    const n = estado.n;
    const conexiones = obtener_conexiones_manuales();
    const count = conexiones.cantidad;

    return `
        <section class="screen">
            <div class="screen-heading">
                <div><span class="eyebrow"><span class="eyebrow-line"></span> ARMA TU RED</span><h1 class="page-title">¿Quién conoce a quién?</h1></div>
                <button class="icon-button" data-action="restart" aria-label="Volver al inicio">↶</button>
            </div>
            <div class="panel workspace-panel">
                <div class="build-grid">
                    <div class="graph-column">
                        <div class="hint-box">
                            <span class="hint-pulse"></span>
                            <span class="hint-copy">${obtener_texto_indicacion_manual()}</span>
                        </div>
                        <div class="graph-wrap">
                                        ${renderizar_grafo({
                                            n,
                                            matriz: estado.matriz,
                                            nombres: estado.nombres,
                                            iniciales: estado.iniciales,
                                            mapa_colores: null,
                                            selected:
                                                estado.nodo_seleccionado_arista,
                                            interactive: true,
                                        })}
                        </div>
                        <div class="stat-line">
                            <span><b>${n}</b> PERSONAS</span><span class="stat-divider"></span><span><b>${count}</b> CONEXIONES</span>
                        </div>
                    </div>
                    <aside class="connections-panel">
                        ${conexiones.html}
                    </aside>
                </div>
                <div class="workspace-actions">
                    <button class="btn btn-ghost" data-action="restart">Volver</button>
                    <button class="btn btn-primary" data-action="confirm-manual">Encontrar comunidades <span class="button-arrow">↗</span></button>
                </div>
            </div>
        </section>`;
}

function obtener_conexiones_manuales() {
    const conexiones = [];
    for (let fila = 0; fila < estado.n; fila++) {
        for (let columna = fila + 1; columna < estado.n; columna++) {
            if (estado.matriz[fila][columna]) {
                conexiones.push(
                    `<span class="edge-chip">${estado.nombres[fila]} ↔ ${estado.nombres[columna]} <button data-action="remove-edge" data-i="${fila}" data-j="${columna}" aria-label="Quitar conexión">×</button></span>`,
                );
            }
        }
    }

    const lista_conexiones = conexiones.length
        ? conexiones.join("")
        : `<div class="empty-state"><span class="empty-icon">⌘</span><span>Tu red empieza aquí.<br /><b>Elige dos personas</b> para conectar.</span></div>`;
    return {
        cantidad: conexiones.length,
        html: `<div class="connections-heading"><div><span class="section-kicker">TU CÍRCULO</span><h2>Conexiones</h2></div><span class="connection-count">${conexiones.length}</span></div><div class="edge-chip-row">${lista_conexiones}</div>${conexiones.length ? `<button class="text-button" data-action="clear-edges">Borrar todas <span>×</span></button>` : ""}`,
    };
}

function obtener_texto_indicacion_manual() {
    return estado.nodo_seleccionado_arista === null
        ? "Toca dos personas para unirlas"
        : `<b>${estado.nombres[estado.nodo_seleccionado_arista]}</b> elegida · toca a otra`;
}

function actualizar_interfaz_construccion(instancia) {
    const indicacion = document.querySelector(".hint-copy");
    const resumen = document.querySelector(".stat-line");
    const panel_conexiones = document.querySelector(".connections-panel");
    if (!indicacion || !resumen || !panel_conexiones) return;

    const lienzo = document.querySelector(".graph-column .network-canvas");
    if (lienzo) {
        configuraciones_grafos[Number(lienzo.dataset.networkIndex)].matriz =
            estado.matriz;
    }
    indicacion.innerHTML = obtener_texto_indicacion_manual();
    const cantidad_conexiones = obtener_conexiones_manuales().cantidad;
    resumen.innerHTML = `<span><b>${estado.n}</b> PERSONAS</span><span class="stat-divider"></span><span><b>${cantidad_conexiones}</b> CONEXIONES</span>`;
    panel_conexiones.innerHTML = obtener_conexiones_manuales().html;
    if (!instancia) return;

    instancia.nodes().forEach((nodo) => {
        nodo.toggleClass(
            "seleccionado",
            Number(nodo.id()) === estado.nodo_seleccionado_arista,
        );
    });

    const aristas_actuales = new Set(
        instancia.edges().map((arista) => arista.id()),
    );
    const aristas_deseadas = new Set();
    for (let fila = 0; fila < estado.n; fila++) {
        for (let columna = fila + 1; columna < estado.n; columna++) {
            if (!estado.matriz[fila][columna]) continue;

            const id = `${fila}-${columna}`;
            aristas_deseadas.add(id);
            if (!aristas_actuales.has(id)) {
                instancia.add({
                    data: {
                        id,
                        source: String(fila),
                        target: String(columna),
                        color: color_arista_neutra,
                    },
                });
            }
        }
    }
    instancia.edges().forEach((arista) => {
        if (!aristas_deseadas.has(arista.id())) arista.remove();
    });
}

/* Explicación del algoritmo paso a paso */
function renderizar_puntos_pasos() {
    return titulos_pasos
        .map((t, i) => {
            let cls = "step-dot";
            if (i === estado.paso_algoritmo) cls += " active";
            else if (i < estado.paso_algoritmo) cls += " done";
            const nombres_cortos = ["Amistades", "Alcance", "Orden", "Grupos"];
            return `<div class="${cls}" aria-current="${i === estado.paso_algoritmo ? "step" : "false"}"><span class="sd-t">${nombres_cortos[i]}</span></div>`;
        })
        .join("");
}

function obtener_contenido_paso_algoritmo() {
    const n = estado.n;
    const iniciales = estado.iniciales;
    const iniciales_ordenadas = estado.orden.map((i) => iniciales[i]);
    let html_matriz_cuerpo = "",
        explicacion = "";

    if (estado.paso_algoritmo === 0) {
        explicacion = `Un <b>1</b> marca una amistad. La diagonal conecta a cada persona consigo misma.`;
        html_matriz_cuerpo = renderizar_tabla_matriz(
            estado.matriz_entrada_caminos,
            iniciales,
            iniciales,
            { diagBg: true },
        );
    } else if (estado.paso_algoritmo === 1) {
        explicacion = `Ahora vemos quién puede llegar a quién, incluso a través de amistades.`;
        html_matriz_cuerpo = renderizar_tabla_matriz(
            estado.matriz_caminos,
            iniciales,
            iniciales,
            {},
        );
    } else if (estado.paso_algoritmo === 2) {
        explicacion = `Ordenamos las personas por el tamaño de su grupo.`;
        html_matriz_cuerpo = renderizar_tabla_matriz(
            estado.filas_ordenadas,
            iniciales_ordenadas,
            iniciales,
            {},
        );
    } else if (estado.paso_algoritmo === 3) {
        explicacion = `Los bloques de color revelan las comunidades.`;
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

    const mapa_colores = estado.paso_algoritmo === 3
        ? crear_mapa_colores_componentes(estado.componentes, n)
        : null;

    return { explicacion, html_matriz_cuerpo, mapa_colores };
}

function renderizar_navegacion_algoritmo() {
    return `
        <button class="btn btn-ghost" data-action="algo-prev" ${estado.paso_algoritmo === 0 ? "disabled" : ""}>← Atrás</button>
        <button class="btn btn-primary" data-action="algo-next">${estado.paso_algoritmo === 3 ? "Ver mis grupos" : "Continuar"} <span class="button-arrow">↗</span></button>`;
}

function actualizar_colores_grafo_algoritmo(mapa_colores) {
    const lienzo = document.querySelector(".algorithm-graph .network-canvas");
    if (!lienzo) return;

    const instancia = instancias_grafos[Number(lienzo.dataset.networkIndex)];
    if (!instancia) return;

    instancia.nodes().forEach((nodo) => {
        const indice = Number(nodo.id());
        nodo.data("color", mapa_colores?.[indice] ?? color_nodo_neutro);
    });
    instancia.edges().forEach((arista) => {
        const indice = Number(arista.source().id());
        arista.data("color", mapa_colores?.[indice] ?? color_arista_neutra);
    });
}

function actualizar_pantalla_algoritmo() {
    const contenido = obtener_contenido_paso_algoritmo();
    document.querySelector(".steps-nav").innerHTML = renderizar_puntos_pasos();
    document.querySelector(".matrix-heading .matrix-explainer").innerHTML =
        contenido.explicacion;
    document.querySelector(".matrix-column .matrix-scroll").outerHTML =
        contenido.html_matriz_cuerpo;
    document.querySelector(".algo-nav").innerHTML =
        renderizar_navegacion_algoritmo();
    actualizar_colores_grafo_algoritmo(contenido.mapa_colores);
}

function renderizar_pantalla_algoritmo() {
    const n = estado.n;
    const iniciales = estado.iniciales;
    const { explicacion, html_matriz_cuerpo, mapa_colores } =
        obtener_contenido_paso_algoritmo();

    return `
  <section class="screen">
    <div class="screen-heading">
      <div><span class="eyebrow"><span class="eyebrow-line"></span> ASÍ FUNCIONA</span><h1 class="page-title">Sigamos las conexiones</h1></div>
      <button class="icon-button" data-action="restart" aria-label="Volver al inicio">↶</button>
    </div>
    <div class="panel workspace-panel algorithm-panel">
      <div class="steps-nav">${renderizar_puntos_pasos()}</div>

      <div class="algo-grid">
        <div class="algorithm-graph">
          <div class="section-kicker">TU RED</div>
          <div class="graph-wrap">
          ${renderizar_grafo({ n, matriz: estado.matriz, nombres: estado.nombres, iniciales, mapa_colores })}
          </div>
        </div>
        <div class="matrix-column">
          <div class="matrix-heading"><span class="matrix-explainer">${explicacion}</span></div>
          <div class="matrix-meta"><span>${estado.n} × ${estado.n}</span><span>Desliza para explorar la matriz</span></div>
          ${html_matriz_cuerpo}
        </div>
      </div>

      <div class="algo-nav">
        ${renderizar_navegacion_algoritmo()}
      </div>
    </div>
  </section>`;
}

/* Resultado de las comunidades */
function renderizar_pantalla_resultado() {
    const n = estado.n;
    const mapa_colores = crear_mapa_colores_componentes(estado.componentes, n);
    let cards = estado.componentes
        .map((comp, ci) => {
            const color = obtener_color_componente(ci);
            const chips = comp
                .map(
                    (idx) =>
                        `<span class="member-chip">${estado.nombres[idx]}</span>`,
                )
                .join("");
            const subtitle = `${comp.length} ${comp.length === 1 ? "persona" : "personas"}`;
            return `<div class="community-card" style="border-left-color:${color};">
      <h3><span class="swatch" style="background:${color};"></span>Comunidad ${ci + 1}</h3>
      <p>${subtitle}</p>
      <div class="member-chips">${chips}</div>
    </div>`;
        })
        .join("");

    return `
  <section class="screen">
    <div class="screen-heading result-heading">
      <div><span class="eyebrow"><span class="eyebrow-line"></span> LO QUE NOS UNE</span><h1 class="page-title">Tu red tiene <em>${estado.componentes.length} ${estado.componentes.length === 1 ? "grupo" : "grupos"}.</em></h1></div>
      <button class="icon-button" data-action="restart" aria-label="Volver al inicio">↶</button>
    </div>
    <div class="panel workspace-panel">
      <div class="result-summary">
        <span class="big-n">${estado.componentes.length}</span>
        <span class="big-label">comunidades<br /><b>${n} personas · ${estado.matriz.flat().reduce((total, valor) => total + valor, 0) / 2} conexiones</b></span>
      </div>

      <div class="result-grid">
        <div class="graph-wrap">
          ${renderizar_grafo({ n, matriz: estado.matriz, nombres: estado.nombres, iniciales: estado.iniciales, mapa_colores })}
        </div>
        <div>${cards}</div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" data-action="restart">Crear otra red <span class="button-arrow">↗</span></button>
      </div>
    </div>
  </section>`;
}

/* Muestra la pantalla actual */
function renderizar() {
    const app = document.getElementById("app");
    configuraciones_grafos = [];
    if (estado.pantalla === "config")
        app.innerHTML = renderizar_pantalla_configuracion();
    else if (estado.pantalla === "manualBuild")
        app.innerHTML = renderizar_pantalla_construccion();
    else if (estado.pantalla === "algorithm")
        app.innerHTML = renderizar_pantalla_algoritmo();
    else if (estado.pantalla === "result")
        app.innerHTML = renderizar_pantalla_resultado();

    posicionar_grafos();
    if (
        window.gsap &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        window.gsap.fromTo(
            ".screen",
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
        );
    }
}

/* Interacciones de la página */
document.addEventListener("click", (evento) => {
    const t = evento.target.closest("[data-action]");
    if (!t) return;
    const action = t.dataset.action;

    if (["zoom-in", "zoom-out", "fit-network"].includes(action)) {
        ajustar_vista_grafo(action, t);
    } else if (action === "set-mode") {
        estado.modo = t.dataset.value;
        document.querySelectorAll('[data-action="set-mode"]').forEach((boton) => {
            const esta_seleccionado = boton.dataset.value === estado.modo;
            boton.classList.toggle("active", esta_seleccionado);
            boton.setAttribute("aria-pressed", String(esta_seleccionado));
        });
    } else if (action === "start") {
        estado.nombres = obtener_nombres_red(estado.n);
        estado.iniciales = estado.nombres.map((nombre, indice) =>
            indice < nombres_disponibles.length
                ? nombre[0]
                : String(indice + 1),
        );
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
    } else if (action === "remove-edge") {
        const i = parseInt(t.dataset.i, 10),
            j = parseInt(t.dataset.j, 10);
        estado.matriz[i][j] = 0;
        estado.matriz[j][i] = 0;
        estado.nodo_seleccionado_arista = null;
        actualizar_interfaz_construccion(obtener_instancia_grafo_manual());
    } else if (action === "clear-edges") {
        estado.matriz = crear_matriz_vacia(estado.n);
        estado.nodo_seleccionado_arista = null;
        actualizar_interfaz_construccion(obtener_instancia_grafo_manual());
    } else if (action === "confirm-manual") {
        ejecutar_algoritmo();
        estado.paso_algoritmo = 0;
        estado.pantalla = "algorithm";
        renderizar();
    } else if (action === "algo-prev") {
        if (estado.paso_algoritmo > 0) {
            estado.paso_algoritmo--;
            actualizar_pantalla_algoritmo();
        }
    } else if (action === "algo-next") {
        if (estado.paso_algoritmo < 3) {
            estado.paso_algoritmo++;
            actualizar_pantalla_algoritmo();
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

function obtener_instancia_grafo_manual() {
    const lienzo = document.querySelector(".graph-column .network-canvas");
    return lienzo
        ? instancias_grafos[Number(lienzo.dataset.networkIndex)]
        : null;
}

function seleccionar_nodo_red(indice, instancia) {
    if (!instancia) return;

    if (estado.nodo_seleccionado_arista === null) {
        estado.nodo_seleccionado_arista = indice;
    } else if (estado.nodo_seleccionado_arista === indice) {
        estado.nodo_seleccionado_arista = null;
    } else {
        const origen = estado.nodo_seleccionado_arista;
        estado.matriz[origen][indice] = estado.matriz[origen][indice] ? 0 : 1;
        estado.matriz[indice][origen] = estado.matriz[origen][indice];
        estado.nodo_seleccionado_arista = null;
    }
    actualizar_interfaz_construccion(instancia);
}

document.addEventListener("input", (evento) => {
    if (evento.target.dataset && evento.target.dataset.action === "set-n") {
        estado.n = parseInt(evento.target.value, 10);
        const porcentaje_relleno =
            ((estado.n - 4) / (cantidad_maxima_usuarios - 4)) * 100;
        evento.target.style.setProperty("--fill", porcentaje_relleno + "%");
        const indicador_cantidad = document.querySelector(".count-display");
        if (indicador_cantidad) {
            indicador_cantidad.textContent = estado.n;
        }
        actualizar_vista_previa(estado.n);
    }
});

/* Inicia la aplicación */
estado = crear_estado_inicial();
renderizar();

if (
    window.Lenis &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
    desplazamiento_suave = new window.Lenis({
        autoRaf: true,
        anchors: true,
        smoothWheel: true,
    });
}
