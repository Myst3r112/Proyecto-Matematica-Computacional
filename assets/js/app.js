const {
    CANTIDAD_MAXIMA_USUARIOS,
    color_nodo_neutro,
    color_arista_neutra,
    crear_matriz_vacia,
    obtener_nombres_red,
    generar_matriz_aleatoria,
    calcular_datos_algoritmo,
    crear_mapa_colores_componentes,
    obtener_color_componente,
} = window.CoonectowskiGraph;

const titulos_pasos = [
    "Matriz de adyacencia",
    "Matriz de caminos",
    "Ordenar filas",
    "Reordenar columnas",
];
const nombres_cortos_pasos = ["Amistades", "Alcance", "Orden", "Grupos"];
const ULTIMO_PASO_ALGORITMO = titulos_pasos.length - 1;

let estado = null;
let configuraciones_grafos = [];
let instancias_grafos = [];
let desplazamiento_suave = null;
let distribucion_previsualizacion = null;
const cache_previsualizacion = {
    cantidad: null,
    matriz: null,
    mapa_colores: null,
};
const renderizadores_pantalla = {
    config: renderizar_pantalla_configuracion,
    manualBuild: renderizar_pantalla_construccion,
    algorithm: renderizar_pantalla_algoritmo,
    result: renderizar_pantalla_resultado,
};

function crear_estado_inicial() {
    return {
        pantalla: "config",
        n: 6,
        modo: "aleatorio",
        nombres: [],
        matriz: [],
        nodo_seleccionado_arista: null,
        paso_algoritmo: -1,
        matriz_entrada_caminos: null,
        matriz_caminos: null,
        filas_ordenadas: null,
        orden: null,
        matriz_reordenada: null,
        componentes: null,
    };
}

function ejecutar_algoritmo() {
    Object.assign(estado, calcular_datos_algoritmo(estado.matriz));
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
    const nodos = Array.from({ length: cantidad }, (_, indice) => ({
        data: {
            id: String(indice),
            nombre: opciones.nombres[indice],
            etiqueta: String(indice + 1),
            color: opciones.mapa_colores?.[indice] ?? color_nodo_neutro,
        },
        classes: opciones.seleccionado === indice ? "seleccionado" : "",
    }));
    const aristas = [];
    for (let fila = 0; fila < cantidad; fila++) {
        for (let columna = 0; columna < cantidad; columna++) {
            if (fila === columna || !opciones.matriz[fila][columna]) {
                continue;
            }

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
    return [...nodos, ...aristas];
}

function crear_posiciones_componentes(instancia, componentes) {
    const ancho = instancia.width();
    const alto = instancia.height();
    const proporcion = ancho / Math.max(alto, 1);
    const columnas = Math.ceil(
        Math.sqrt(componentes.length * proporcion),
    );
    const filas = Math.ceil(componentes.length / columnas);
    const ancho_celda = ancho / columnas;
    const alto_celda = alto / filas;
    const posiciones = new Map();

    componentes.forEach((componente, indice_componente) => {
        const columna_componente = indice_componente % columnas;
        const fila_componente = Math.floor(indice_componente / columnas);
        const centro_x = (columna_componente + 0.5) * ancho_celda;
        const centro_y = (fila_componente + 0.5) * alto_celda;
        const columnas_internas = Math.ceil(
            Math.sqrt(componente.length * ancho_celda / alto_celda),
        );
        const filas_internas = Math.ceil(
            componente.length / columnas_internas,
        );
        const separacion_x = ancho_celda / (columnas_internas + 1);
        const separacion_y = alto_celda / (filas_internas + 1);
        const inicio_x =
            centro_x - ((columnas_internas - 1) * separacion_x) / 2;
        const inicio_y =
            centro_y - ((filas_internas - 1) * separacion_y) / 2;

        componente.forEach((indice_nodo, posicion) => {
            const columna = posicion % columnas_internas;
            const fila = Math.floor(posicion / columnas_internas);
            posiciones.set(String(indice_nodo), {
                x: inicio_x + columna * separacion_x,
                y: inicio_y + fila * separacion_y,
            });
        });
    });

    return posiciones;
}

function crear_opciones_distribucion(cantidad, posiciones) {
    return {
        name: posiciones ? "preset" : "random",
        animate: false,
        fit: false,
        padding: cantidad > 12 ? 32 : 42,
        positions: posiciones
            ? (nodo) => posiciones.get(nodo.id())
            : undefined,
    };
}

function ejecutar_distribucion(instancia, lienzo, opciones) {
    const es_previsualizacion = opciones.previsualizacion === true;
    if (es_previsualizacion) {
        distribucion_previsualizacion?.stop();
    }

    const posiciones = opciones.organizar_componentes
        ? crear_posiciones_componentes(instancia, opciones.componentes)
        : null;

    const distribucion = instancia.layout(
        crear_opciones_distribucion(opciones.n, posiciones),
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
                        "border-color": "#1684B2",
                        "z-index": 10,
                    },
                },
                {
                    selector: "edge",
                    style: {
                        width: cantidad > 50 ? 1 : 1.5,
                        "line-color": "data(color)",
                        "target-arrow-color": "data(color)",
                        "target-arrow-shape": "triangle",
                        "arrow-scale": 0.8,
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

            if (opciones.interactivo) {
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

    const opciones = {
        ...crear_opciones_previsualizacion(n),
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
                estado.n > 12 ? 32 : 42,
            );
        }
    });
});

/* Construye una tabla para la matriz */
function renderizar_tabla_matriz(
    matriz,
    etiquetas_filas,
    etiquetas_columnas,
    opciones = {},
) {
    const cantidad = matriz.length;
    const tamano =
        cantidad > 50 ? "large" : cantidad > 24 ? "medium" : "small";
    const encabezado_tabla = `<thead><tr><th></th>${etiquetas_columnas
        .map((etiqueta) => `<th scope="col">${etiqueta}</th>`)
        .join("")}</tr></thead>`;
    let filas_html = "";

    for (let indice_fila = 0; indice_fila < cantidad; indice_fila++) {
        let celdas_html = "";

        for (
            let indice_columna = 0;
            indice_columna < cantidad;
            indice_columna++
        ) {
            const valor = matriz[indice_fila][indice_columna];
            let clases = valor ? "one" : "";
            if (
                opciones.fondo_diagonal &&
                indice_fila === indice_columna
            ) {
                clases += " diag";
            }

            let estilo_celda = "";
            if (opciones.bloque_de) {
                const componente_fila = opciones.bloque_de[indice_fila];
                const componente_columna =
                    opciones.bloque_de[indice_columna];

                if (
                    componente_fila !== undefined &&
                    componente_fila === componente_columna &&
                    componente_fila !== null
                ) {
                    const color = obtener_color_componente(componente_fila);
                    const color_texto = valor
                        ? color
                        : "var(--text-muted)";
                    estilo_celda = `style="background:${hexadecimal_a_rgba(color, 0.16)}; color:${color_texto};"`;
                }
            }

            celdas_html += `<td class="${clases}" ${estilo_celda}>${valor}</td>`;
        }

        filas_html += `<tr><th scope="row">${etiquetas_filas[indice_fila]}</th>${celdas_html}</tr>`;
    }

    return `
        <div
            class="matrix-scroll matrix-scroll-${tamano}"
            tabindex="0"
            role="region"
            aria-label="Matriz de ${cantidad} por ${cantidad}; desplázate para recorrer sus datos"
        >
            <table class="matrix matrix-${tamano}">
                ${encabezado_tabla}
                <tbody>${filas_html}</tbody>
            </table>
        </div>`;
}

function hexadecimal_a_rgba(hexadecimal, opacidad) {
    const rojo = parseInt(hexadecimal.slice(1, 3), 16);
    const verde = parseInt(hexadecimal.slice(3, 5), 16);
    const azul = parseInt(hexadecimal.slice(5, 7), 16);

    return `rgba(${rojo},${verde},${azul},${opacidad})`;
}

/* Pantalla de configuración */
function renderizar_pantalla_configuracion() {
    const n = estado.n;
    const porcentaje_relleno = calcular_porcentaje_red(n);
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
                                <input aria-label="Cantidad de personas" type="range" min="4" max="${CANTIDAD_MAXIMA_USUARIOS}" value="${n}" step="1" data-action="set-n" style="--fill:${porcentaje_relleno}%">
                                <div class="range-labels"><span>4</span><span>${CANTIDAD_MAXIMA_USUARIOS}</span></div>
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
                                ...crear_opciones_previsualizacion(n),
                                previsualizacion: true,
                            })}
                        </div>
                        <div class="preview-foot"><span class="preview-symbol">↗</span><span>Un grupo aparece cuando todos<br />pueden llegar entre sí.</span></div>
                    </div>
                </div>
            </div>
        </section>`;
}

function obtener_datos_previsualizacion(n) {
    if (
        cache_previsualizacion.matriz &&
        cache_previsualizacion.cantidad === n
    ) {
        return cache_previsualizacion;
    }

    const matriz = generar_matriz_aleatoria(n);
    const { componentes } = calcular_datos_algoritmo(matriz);
    cache_previsualizacion.cantidad = n;
    cache_previsualizacion.matriz = matriz;
    cache_previsualizacion.mapa_colores = crear_mapa_colores_componentes(
        componentes,
        n,
    );
    return cache_previsualizacion;
}

function calcular_porcentaje_red(cantidad) {
    return ((cantidad - 4) / (CANTIDAD_MAXIMA_USUARIOS - 4)) * 100;
}

function crear_opciones_previsualizacion(cantidad) {
    const { matriz, mapa_colores } = obtener_datos_previsualizacion(cantidad);
    const nombres = obtener_nombres_red(cantidad);

    return {
        n: cantidad,
        matriz,
        nombres,
        mapa_colores,
    };
}

/* Pantalla para armar la red */
function renderizar_pantalla_construccion() {
    const n = estado.n;
    const conexiones = obtener_conexiones_manuales();
    const cantidad_conexiones = conexiones.cantidad;

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
                                            mapa_colores: null,
                                            seleccionado:
                                                estado.nodo_seleccionado_arista,
                                            interactivo: true,
                                        })}
                        </div>
                        <div class="stat-line">
                            <span><b>${n}</b> PERSONAS</span><span class="stat-divider"></span><span><b>${cantidad_conexiones}</b> CONEXIONES</span>
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
        for (let columna = 0; columna < estado.n; columna++) {
            if (fila === columna) continue;
            if (estado.matriz[fila][columna]) {
                conexiones.push(
                    `<span class="edge-chip">${estado.nombres[fila]} → ${estado.nombres[columna]} <button data-action="remove-edge" data-i="${fila}" data-j="${columna}" aria-label="Quitar conexión de ${estado.nombres[fila]} hacia ${estado.nombres[columna]}">×</button></span>`,
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
        const indice_grafo = Number(lienzo.dataset.networkIndex);
        const configuracion = configuraciones_grafos[indice_grafo];
        if (configuracion) configuracion.matriz = estado.matriz;
    }

    const conexiones = obtener_conexiones_manuales();
    indicacion.innerHTML = obtener_texto_indicacion_manual();
    resumen.innerHTML = `<span><b>${estado.n}</b> PERSONAS</span><span class="stat-divider"></span><span><b>${conexiones.cantidad}</b> CONEXIONES</span>`;
    panel_conexiones.innerHTML = conexiones.html;
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
        for (let columna = 0; columna < estado.n; columna++) {
            if (fila === columna) continue;
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
        .map((_, indice) => {
            const clase =
                indice === estado.paso_algoritmo
                    ? "step-dot active"
                    : indice < estado.paso_algoritmo
                      ? "step-dot done"
                      : "step-dot";
            const paso_actual = indice === estado.paso_algoritmo;

            return `<div class="${clase}" aria-current="${paso_actual ? "step" : "false"}"><span class="sd-t">${nombres_cortos_pasos[indice]}</span></div>`;
        })
        .join("");
}

function obtener_contenido_paso_algoritmo() {
    const paso_actual = Math.max(estado.paso_algoritmo, 0);
    const etiquetas_originales = Array.from(
        { length: estado.n },
        (_, indice) => String(indice + 1),
    );
    const etiquetas_ordenadas = estado.orden.map(
        (indice) => String(indice + 1),
    );
    let matriz;
    let etiquetas_filas;
    let etiquetas_columnas;
    let opciones_matriz = {};
    let explicacion;
    let mapa_colores = null;

    switch (paso_actual) {
        case 0:
            matriz = estado.matriz_entrada_caminos;
            etiquetas_filas = etiquetas_originales;
            etiquetas_columnas = etiquetas_originales;
            opciones_matriz = { fondo_diagonal: true };
            explicacion =
                "Un <b>1</b> marca una amistad. La diagonal conecta a cada persona consigo misma.";
            break;
        case 1:
            matriz = estado.matriz_caminos;
            etiquetas_filas = etiquetas_originales;
            etiquetas_columnas = etiquetas_originales;
            explicacion =
                "Ahora vemos quién puede llegar a quién, incluso a través de amistades.";
            break;
        case 2:
            matriz = estado.filas_ordenadas;
            etiquetas_filas = etiquetas_ordenadas;
            etiquetas_columnas = etiquetas_originales;
            explicacion = "Ordenamos las personas por el tamaño de su grupo.";
            break;
        case 3: {
            matriz = estado.matriz_reordenada;
            etiquetas_filas = etiquetas_ordenadas;
            etiquetas_columnas = etiquetas_ordenadas;
            const posicion_por_indice = new Map(
                estado.orden.map((indice, posicion) => [indice, posicion]),
            );
            const bloque_de = new Array(estado.n).fill(null);

            estado.componentes.forEach((componente, indice_comunidad) => {
                componente.forEach((indice_persona) => {
                    bloque_de[posicion_por_indice.get(indice_persona)] =
                        indice_comunidad;
                });
            });
            opciones_matriz = { bloque_de };
            mapa_colores = crear_mapa_colores_componentes(
                estado.componentes,
                estado.n,
            );
            explicacion = "Los bloques de color revelan las comunidades.";
            break;
        }
        default:
            throw new Error(`Paso de algoritmo desconocido: ${estado.paso_algoritmo}`);
    }

    return {
        explicacion,
        html_matriz_cuerpo: renderizar_tabla_matriz(
            matriz,
            etiquetas_filas,
            etiquetas_columnas,
            opciones_matriz,
        ),
        mapa_colores,
    };
}

function renderizar_navegacion_algoritmo() {
    const es_presentacion_grafo = estado.paso_algoritmo === -1;
    const texto_anterior =
        estado.paso_algoritmo === 0 ? "← Ver grafo" : "← Atrás";

    return `
        <button class="btn btn-ghost" data-action="algo-prev" ${es_presentacion_grafo ? "hidden" : ""}>${texto_anterior}</button>
        <button class="btn btn-primary" data-action="algo-next">${es_presentacion_grafo ? "Continuar a la matriz" : estado.paso_algoritmo === ULTIMO_PASO_ALGORITMO ? "Ver mis grupos" : "Continuar"} <span class="button-arrow">↗</span></button>`;
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

function actualizar_pantalla_algoritmo(ajustar_grafo = false) {
    const contenido = obtener_contenido_paso_algoritmo();
    const panel = document.querySelector(".algorithm-panel");
    const es_presentacion_grafo = estado.paso_algoritmo === -1;
    const transicionar_a_matriz =
        panel.classList.contains("algorithm-intro") && !es_presentacion_grafo;
    const transicionar_al_grafo =
        !panel.classList.contains("algorithm-intro") && es_presentacion_grafo;

    if (transicionar_a_matriz) {
        panel.classList.add("revealing-matrix");
    } else if (transicionar_al_grafo) {
        panel.classList.add("hiding-matrix");
    }

    panel.classList.toggle("algorithm-intro", es_presentacion_grafo);
    document.querySelector(".algorithm-eyebrow-label").textContent =
        es_presentacion_grafo ? "TU RED" : "ASÍ FUNCIONA";
    document.querySelector(".algorithm-page-title").textContent =
        es_presentacion_grafo ? "Así quedó tu red" : "Sigamos las conexiones";
    document.querySelector(".steps-nav").innerHTML = renderizar_puntos_pasos();
    document.querySelector(".matrix-heading .matrix-explainer").innerHTML =
        contenido.explicacion;
    document.querySelector(".matrix-column .matrix-scroll").outerHTML =
        contenido.html_matriz_cuerpo;
    document.querySelector(".algo-nav").innerHTML =
        renderizar_navegacion_algoritmo();
    actualizar_colores_grafo_algoritmo(contenido.mapa_colores);

    const movimiento_reducido = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;

    if (transicionar_a_matriz) {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                panel.classList.remove("revealing-matrix");
            });
        });
    } else if (transicionar_al_grafo) {
        window.setTimeout(
            () => panel.classList.remove("hiding-matrix"),
            movimiento_reducido ? 0 : 360,
        );
    }

    if (ajustar_grafo) {
        const ajustar_grafo = () =>
            window.requestAnimationFrame(() => {
                const lienzo = document.querySelector(
                    ".algorithm-graph .network-canvas",
                );
                if (!lienzo) return;

                const instancia =
                    instancias_grafos[Number(lienzo.dataset.networkIndex)];
                if (!instancia) return;

                instancia.resize();
                const opciones_ajuste = {
                    eles: instancia.elements(),
                    padding: estado.n > 12 ? 32 : 42,
                };

                if (
                    !movimiento_reducido &&
                    typeof instancia.animate === "function"
                ) {
                    instancia.animate(
                        { fit: opciones_ajuste },
                        { duration: 420, easing: "ease-in-out-cubic" },
                    );
                } else {
                    instancia.fit(
                        opciones_ajuste.eles,
                        opciones_ajuste.padding,
                    );
                }
            });

        ajustar_grafo();
    }
}

function renderizar_pantalla_algoritmo() {
    const n = estado.n;
    const es_presentacion_grafo = estado.paso_algoritmo === -1;
    const { explicacion, html_matriz_cuerpo, mapa_colores } =
        obtener_contenido_paso_algoritmo();

    return `
  <section class="screen">
    <div class="screen-heading">
      <div><span class="eyebrow"><span class="eyebrow-line"></span> <span class="algorithm-eyebrow-label">${es_presentacion_grafo ? "TU RED" : "ASÍ FUNCIONA"}</span></span><h1 class="page-title algorithm-page-title">${es_presentacion_grafo ? "Así quedó tu red" : "Sigamos las conexiones"}</h1></div>
      <button class="icon-button" data-action="restart" aria-label="Volver al inicio">↶</button>
    </div>
    <div class="panel workspace-panel algorithm-panel ${es_presentacion_grafo ? "algorithm-intro" : ""}">
      <div class="steps-nav">${renderizar_puntos_pasos()}</div>

      <div class="algo-grid">
        <div class="algorithm-graph">
          <div class="section-kicker">VISTA DEL GRAFO</div>
          <div class="graph-wrap">
          ${renderizar_grafo({ n, matriz: estado.matriz, nombres: estado.nombres, mapa_colores })}
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
        <span class="big-label">comunidades<br /><b>${n} personas · ${estado.matriz.flat().reduce((total, valor) => total + valor, 0)} conexiones dirigidas</b></span>
      </div>

      <div class="result-grid">
        <div class="graph-wrap">
          ${renderizar_grafo({ n, matriz: estado.matriz, nombres: estado.nombres, mapa_colores, componentes: estado.componentes, organizar_componentes: true })}
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
    const renderizar_pantalla = renderizadores_pantalla[estado.pantalla];
    if (!renderizar_pantalla) {
        throw new Error(`Pantalla desconocida: ${estado.pantalla}`);
    }

    configuraciones_grafos = [];
    app.innerHTML = renderizar_pantalla();

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

function iniciar_exploracion() {
    estado.nombres = obtener_nombres_red(estado.n);

    if (estado.modo === "manual") {
        estado.matriz = crear_matriz_vacia(estado.n);
        estado.nodo_seleccionado_arista = null;
        estado.pantalla = "manualBuild";
    } else {
        estado.matriz = generar_matriz_aleatoria(estado.n);
        ejecutar_algoritmo();
        estado.pantalla = "algorithm";
    }

    estado.paso_algoritmo = -1;
    renderizar();
}

function reiniciar_exploracion() {
    const { n, modo } = estado;
    estado = crear_estado_inicial();
    estado.n = n;
    estado.modo = modo;
    renderizar();
}

function cambiar_modo(boton) {
    estado.modo = boton.dataset.value;
    document.querySelectorAll('[data-action="set-mode"]').forEach((opcion) => {
        const esta_seleccionada = opcion.dataset.value === estado.modo;
        opcion.classList.toggle("active", esta_seleccionada);
        opcion.setAttribute("aria-pressed", String(esta_seleccionada));
    });
}

function quitar_conexion(boton) {
    const origen = Number(boton.dataset.i);
    const destino = Number(boton.dataset.j);
    if (
        !Number.isInteger(origen) ||
        !Number.isInteger(destino) ||
        !estado.matriz[origen] ||
        !estado.matriz[destino]
    ) {
        return;
    }

    estado.matriz[origen][destino] = 0;
    estado.nodo_seleccionado_arista = null;
    actualizar_interfaz_construccion(obtener_instancia_grafo_manual());
}

function confirmar_red_manual() {
    ejecutar_algoritmo();
    estado.paso_algoritmo = -1;
    estado.pantalla = "algorithm";
    renderizar();
}

function avanzar_paso_algoritmo() {
    if (estado.paso_algoritmo === -1) {
        estado.paso_algoritmo = 0;
        actualizar_pantalla_algoritmo(true);
        return;
    }

    if (estado.paso_algoritmo < ULTIMO_PASO_ALGORITMO) {
        estado.paso_algoritmo++;
        actualizar_pantalla_algoritmo();
        return;
    }

    estado.pantalla = "result";
    renderizar();
}

const acciones_interfaz = {
    "zoom-in": (boton) => ajustar_vista_grafo("zoom-in", boton),
    "zoom-out": (boton) => ajustar_vista_grafo("zoom-out", boton),
    "fit-network": (boton) => ajustar_vista_grafo("fit-network", boton),
    "set-mode": cambiar_modo,
    start: iniciar_exploracion,
    "remove-edge": quitar_conexion,
    "clear-edges": () => {
        estado.matriz = crear_matriz_vacia(estado.n);
        estado.nodo_seleccionado_arista = null;
        actualizar_interfaz_construccion(obtener_instancia_grafo_manual());
    },
    "confirm-manual": confirmar_red_manual,
    "algo-prev": () => {
        if (estado.paso_algoritmo < 0) return;
        estado.paso_algoritmo =
            estado.paso_algoritmo === 0 ? -1 : estado.paso_algoritmo - 1;
        actualizar_pantalla_algoritmo(estado.paso_algoritmo === -1);
    },
    "algo-next": avanzar_paso_algoritmo,
    restart: reiniciar_exploracion,
};

document.addEventListener("click", (evento) => {
    if (!(evento.target instanceof Element)) return;

    const boton = evento.target.closest("[data-action]");
    if (!boton) return;

    if (
        !Object.prototype.hasOwnProperty.call(
            acciones_interfaz,
            boton.dataset.action,
        )
    ) {
        return;
    }

    acciones_interfaz[boton.dataset.action](boton);
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
        estado.nodo_seleccionado_arista = null;
    }
    actualizar_interfaz_construccion(instancia);
}

document.addEventListener("input", (evento) => {
    if (
        !(evento.target instanceof HTMLInputElement) ||
        evento.target.dataset.action !== "set-n"
    ) {
        return;
    }

    const cantidad = Number(evento.target.value);
    if (
        !Number.isInteger(cantidad) ||
        cantidad < 4 ||
        cantidad > CANTIDAD_MAXIMA_USUARIOS
    ) {
        return;
    }

    estado.n = cantidad;
    evento.target.style.setProperty("--fill", `${calcular_porcentaje_red(cantidad)}%`);
    document.querySelector(".count-display").textContent = cantidad;
    actualizar_vista_previa(cantidad);
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
