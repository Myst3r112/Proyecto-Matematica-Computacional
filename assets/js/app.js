const {
    CANTIDAD_MINIMA_USUARIOS,
    CANTIDAD_MAXIMA_USUARIOS,
    color_nodo_neutro,
    color_arista_neutra,
    crear_matriz_vacia,
    obtener_nombres_red,
    generar_matriz_aleatoria,
    calcular_datos_algoritmo,
    crear_matriz_ciclos_maximos,
    crear_mapa_colores_componentes,
    obtener_color_componente,
} = window.CoonectowskiGraph;

// Estado de navegación, grafos activos y datos reutilizados por la vista previa.
let estado = null;
let configuraciones_grafos = [];
let instancias_grafos = [];
let distribuciones_grafos = [];
let temporizador_avance_automatico = null;
let avance_automatico_activo = false;
const INTERVALO_AVANCE_AUTOMATICO = 900;
const VELOCIDADES_AVANCE_AUTOMATICO = [1, 2, 3, 4];
let indice_velocidad_avance_automatico = 0;
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
const fases_algoritmo = [
    { id: "amistades", nombre: "Amistades" },
    { id: "alcance", nombre: "Alcance" },
    { id: "orden", nombre: "Orden" },
    { id: "grupos", nombre: "Componentes" },
];
const colores_camino = {
    inicio: "#16803c",
    intermedio: "#2563eb",
    destino: "#e45118",
};

// Crea los valores iniciales para todas las pantallas.
function crear_estado_inicial() {
    return {
        pantalla: "config",
        n: 6,
        modo: "aleatorio",
        nombres: [],
        matriz: [],
        nodo_seleccionado_arista: null,
        paso_algoritmo: -1,
        componentes: null,
        pasos: [],
        paso_analisis_original: 0,
    };
}

// Calcula las componentes y los pasos que explican el análisis.
function ejecutar_algoritmo() {
    const { componentes, pasos } = calcular_datos_algoritmo(estado.matriz);
    estado.componentes = componentes;
    estado.pasos = pasos;
}

// Aplica al componente el orden definido para los nodos.
function ordenar_nodos_componente(componente, orden_nodos) {
    const nodos_componente = new Set(componente);
    const nodos_ordenados = orden_nodos.filter((nodo) =>
        nodos_componente.has(nodo),
    );
    const conjunto_ordenados = new Set(nodos_ordenados);
    const nodos_pendientes = componente.filter(
        (nodo) => !conjunto_ordenados.has(nodo),
    );

    return [...nodos_ordenados, ...nodos_pendientes];
}

// Ordena visualmente los nodos siguiendo el ciclo seleccionado.
function ordenar_nodos_segun_ciclo(matriz_ciclo, componente) {
    const inicio = componente.find((nodo) =>
        matriz_ciclo[nodo].some(Boolean),
    );
    if (inicio === undefined) return [...componente];

    const nodos_ciclo = [];
    let actual = inicio;
    while (!nodos_ciclo.includes(actual)) {
        nodos_ciclo.push(actual);
        actual = matriz_ciclo[actual].findIndex(Boolean);
        if (actual === -1) break;
    }

    return [
        ...nodos_ciclo,
        ...componente.filter((nodo) => !nodos_ciclo.includes(nodo)),
    ];
}

// Indica a qué componente pertenece cada nodo.
function crear_mapa_componentes_por_nodo(
    componentes,
    cantidad_nodos,
    limite_componentes = componentes?.length ?? 0,
) {
    const componente_por_nodo = new Array(cantidad_nodos).fill(null);

    componentes?.slice(0, limite_componentes).forEach((componente, indice) => {
        componente.forEach((nodo) => {
            componente_por_nodo[nodo] = indice;
        });
    });

    return componente_por_nodo;
}

// Genera el contenedor y los controles de un grafo.
function renderizar_grafo(opciones) {
    const indice = configuraciones_grafos.push(opciones) - 1;
    return `
        <div class="network-frame ${opciones.previsualizacion ? "preview-frame" : ""}">
            <div class="network-canvas" data-network-index="${indice}" role="img" aria-label="Grafo dirigido con ${opciones.n} nodos"></div>
            <div class="network-controls" aria-label="Controles de la red">
                <button type="button" data-action="zoom-in" aria-label="Acercar">+</button>
                <button type="button" data-action="zoom-out" aria-label="Alejar">−</button>
                <button type="button" data-action="fit-network" aria-label="Ver toda la red">⤢</button>
            </div>
            <div class="network-person" aria-live="polite">Selecciona un punto para ver quién es</div>
        </div>`;
}

// Convierte la matriz de adyacencia en aristas para Cytoscape.
function crear_datos_aristas(matriz, mapa_colores, componentes) {
    const cantidad = matriz.length;
    const componente_por_nodo = crear_mapa_componentes_por_nodo(
        componentes,
        cantidad,
    );

    const aristas = [];
    for (let fila = 0; fila < cantidad; fila++) {
        for (let columna = fila + 1; columna < cantidad; columna++) {
            const ida = Boolean(matriz[fila][columna]);
            const vuelta = Boolean(matriz[columna][fila]);
            if (!ida && !vuelta) continue;

            // Una sola arista visual representa ambos sentidos si existen.
            const origen = ida ? fila : columna;
            const destino = ida ? columna : fila;
            const bidireccional = ida && vuelta;
            const misma_componente =
                !componentes ||
                componente_por_nodo[origen] ===
                    componente_por_nodo[destino];

            aristas.push({
                data: {
                    id: `${origen}-${destino}`,
                    source: String(origen),
                    target: String(destino),
                    color: mapa_colores?.[origen] ?? color_arista_neutra,
                    bidireccional,
                },
                classes: [
                    bidireccional ? "bidirectional" : "",
                    misma_componente ? "" : "component-external",
                ]
                    .filter(Boolean)
                    .join(" "),
            });
        }
    }

    return aristas;
}

// Combina los datos de nodos y aristas para crear un grafo.
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
    const aristas = crear_datos_aristas(
        opciones.matriz,
        opciones.mapa_colores,
        opciones.componentes,
    );
    return [...nodos, ...aristas];
}

// Distribuye los nodos de cada componente en posiciones circulares.
function crear_posiciones_componentes(instancia, componentes) {
    const ancho = instancia.width();
    const alto = instancia.height();
    const proporcion = ancho / Math.max(alto, 1);
    const columnas = Math.min(
        componentes.length,
        Math.ceil(Math.sqrt(componentes.length * proporcion)),
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
        const radio = Math.min(ancho_celda, alto_celda) * 0.34;

        componente.forEach((indice_nodo, posicion) => {
            const angulo =
                -Math.PI / 2 + (2 * Math.PI * posicion) / componente.length;
            posiciones.set(String(indice_nodo), {
                x: centro_x + Math.cos(angulo) * radio,
                y: centro_y + Math.sin(angulo) * radio,
            });
        });
    });

    return posiciones;
}

// Configura el algoritmo de distribución y sus animaciones.
function crear_opciones_distribucion(posiciones, movimiento_reducido) {
    const animar_posiciones = Boolean(posiciones) && !movimiento_reducido;

    return {
        name: posiciones ? "preset" : "cose",
        animate: animar_posiciones,
        animationDuration: animar_posiciones ? 700 : 0,
        animationEasing: "ease-in-out",
        fit: false,
        padding: 30,
        nodeOverlap: posiciones ? 0 : 24,
        nodeRepulsion: () => 1200,
        idealEdgeLength: () => 45,
        edgeElasticity: () => 100,
        nestingFactor: 1.2,
        gravity: 1.3,
        gravityRange: 3.8,
        componentSpacing: 18,
        numIter: 500,
        initialTemp: 180,
        coolingFactor: 0.96,
        minTemp: 1,
        positions: posiciones
            ? (nodo) => posiciones.get(nodo.id())
            : undefined,
    };
}

// Ejecuta la distribución y ajusta la vista al terminar.
function ejecutar_distribucion(instancia, lienzo, opciones) {
    const indice = Number(lienzo.dataset.networkIndex);
    // Evita que layouts anteriores sigan animándose sobre el mismo grafo.
    distribuciones_grafos[indice]?.stop();

    const movimiento_reducido = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;
    const posiciones = opciones.organizar_componentes
        ? crear_posiciones_componentes(instancia, opciones.componentes)
        : null;

    const distribucion = instancia.layout(
        crear_opciones_distribucion(posiciones, movimiento_reducido),
    );
    distribuciones_grafos[indice] = distribucion;

    distribucion.one("layoutstop", () => {
        if (
            distribuciones_grafos[indice] !== distribucion ||
            configuraciones_grafos[indice] !== opciones
        ) {
            return;
        }
        if (posiciones) {
            if (movimiento_reducido) {
                instancia.fit(instancia.elements(), 42);
            } else {
                instancia.animate(
                    { fit: { eles: instancia.elements(), padding: 42 } },
                    { duration: 350, easing: "ease-in-out" },
                );
            }
        } else {
            instancia.fit(instancia.elements(), 42);
        }
    });
    distribucion.run();
}

// Destruye los grafos anteriores y crea los visibles en la pantalla.
function posicionar_grafos() {
    distribuciones_grafos.forEach((distribucion) => distribucion?.stop());
    distribuciones_grafos = [];
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

        const tamano_nodo = 29;
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
                        width: 1.5,
                        "line-color": "data(color)",
                        "target-arrow-color": "data(color)",
                        "target-arrow-shape": "triangle",
                        "source-arrow-color": "data(color)",
                        "source-arrow-shape": "none",
                        "arrow-scale": 0.8,
                        opacity: 0.5,
                        "curve-style": "bezier",
                        "overlay-opacity": 0,
                        "transition-property":
                            "line-color, target-arrow-color, source-arrow-color, width, opacity",
                        "transition-duration": 350,
                    },
                },
                {
                    selector: "edge.bidirectional",
                    style: {
                        "source-arrow-shape": "triangle",
                    },
                },
                {
                    selector: "edge.component-external",
                    style: {
                        opacity: 0,
                        events: "no",
                    },
                },
                {
                    selector: "node.analysis-current",
                    style: {
                        "background-color": "#f0a84a",
                        "border-color": "#8f5714",
                        "border-width": 3,
                        "z-index": 20,
                    },
                },
                {
                    selector: "node.analysis-path-node",
                    style: {
                        "background-color": colores_camino.intermedio,
                        "border-color": "#173b83",
                        "border-width": 3.5,
                        color: "#ffffff",
                        width: tamano_nodo + 5,
                        height: tamano_nodo + 5,
                        "font-size": 11,
                        "z-index": 21,
                    },
                },
                {
                    selector: "node.analysis-path-start",
                    style: {
                        "background-color": colores_camino.inicio,
                        "border-color": "#0b4822",
                        "border-width": 4,
                        color: "#ffffff",
                        width: tamano_nodo + 9,
                        height: tamano_nodo + 9,
                        "font-size": 11,
                        "z-index": 23,
                    },
                },
                {
                    selector: "node.analysis-path-end",
                    style: {
                        "background-color": colores_camino.destino,
                        "border-color": "#8b2f0d",
                        "border-width": 4,
                        color: "#ffffff",
                        width: tamano_nodo + 9,
                        height: tamano_nodo + 9,
                        "font-size": 11,
                        "z-index": 24,
                    },
                },
                {
                    selector: "edge.analysis-path-edge",
                    style: {
                        width: 4,
                        "line-color": colores_camino.destino,
                        "target-arrow-color": colores_camino.destino,
                        "source-arrow-color": colores_camino.destino,
                        opacity: 1,
                        "z-index": 20,
                    },
                },
                {
                    selector: "edge.analysis-path-start-edge",
                    style: {
                        "line-color": colores_camino.inicio,
                        "target-arrow-color": colores_camino.inicio,
                        "source-arrow-color": colores_camino.inicio,
                    },
                },
                {
                    selector: "edge.analysis-path-middle-edge",
                    style: {
                        "line-color": colores_camino.intermedio,
                        "target-arrow-color": colores_camino.intermedio,
                        "source-arrow-color": colores_camino.intermedio,
                    },
                },
            ],
            layout: { name: "preset" },
        });
        instancias_grafos.push(instancia);
        ejecutar_distribucion(instancia, lienzo, opciones);

        // Los toques editan la red manual o muestran el nombre del nodo.
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

// Actualiza los datos y la disposición del grafo de vista previa.
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
    lienzo.setAttribute("aria-label", `Grafo dirigido con ${n} nodos`);
    instancia.elements().remove();
    instancia.add(crear_elementos_grafo(opciones));
    ejecutar_distribucion(instancia, lienzo, opciones);
}

// Aplica zoom o encuadra el grafo asociado al control.
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

// Mantiene los grafos ajustados al cambiar el tamaño de la ventana.
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
                42,
            );
        }
    });
});

// Renderiza una celda con sus resaltados, colores y descripción accesible.
function renderizar_celda_matriz(
    valor,
    indice_fila,
    indice_columna,
    etiquetas_filas,
    etiquetas_columnas,
    opciones,
) {
    let clases = valor ? "one" : "";
    if (opciones.fila_orden_actual === indice_fila) {
        clases += " matrix-row-active";
    }
    if (opciones.columna_orden_actual === indice_columna) {
        clases += " matrix-column-active";
    }
    if (
        opciones.diagonal_actual === indice_fila &&
        indice_fila === indice_columna
    ) {
        clases += " diag";
    }

    const rol_tramo_camino = opciones.celdas_camino?.get(
        `${indice_fila}-${indice_columna}`,
    );
    const es_tramo_camino = Boolean(rol_tramo_camino);
    const es_alcance_agregado =
        opciones.celda_actual?.[0] === indice_fila &&
        opciones.celda_actual?.[1] === indice_columna;
    if (es_alcance_agregado) {
        clases += " matrix-path-active";
    }
    if (es_tramo_camino) {
        clases += ` matrix-route-active matrix-route-${rol_tramo_camino}`;
    }

    const descripcion_celda = es_alcance_agregado
        ? `Relación de alcance agregada: ${etiquetas_filas[indice_fila]} a ${etiquetas_columnas[indice_columna]}`
        : es_tramo_camino
          ? `Tramo del camino: ${etiquetas_filas[indice_fila]} a ${etiquetas_columnas[indice_columna]}`
          : "";

    let estilo_celda = "";
    if (opciones.bloque_de_filas && opciones.bloque_de_columnas) {
        const componente_fila = opciones.bloque_de_filas[indice_fila];
        const componente_columna =
            opciones.bloque_de_columnas[indice_columna];

        if (
            componente_fila !== undefined &&
            componente_fila === componente_columna &&
            componente_fila !== null
        ) {
            const color = obtener_color_componente(componente_fila);
            const color_texto = valor ? color : "var(--text-muted)";
            estilo_celda = `style="background:${hexadecimal_a_rgba(color, 0.16)}; color:${color_texto};"`;
        }
    }

    return `<td class="${clases}" ${estilo_celda}${descripcion_celda ? ` aria-label="${valor}. ${descripcion_celda}" title="${descripcion_celda}"` : ""}>${valor}</td>`;
}

// Genera la tabla y los resaltados de una matriz.
function renderizar_tabla_matriz(
    matriz,
    etiquetas_filas,
    etiquetas_columnas,
    opciones = {},
) {
    const cantidad = matriz.length;
    const encabezado_tabla = `<thead><tr><th></th>${etiquetas_columnas
        .map(
            (etiqueta, indice) => {
                const rol_camino = opciones.roles_camino_columnas?.[indice];
                return `<th class="${[
                    opciones.nodo_actual === indice ? "matrix-focus" : "",
                    opciones.columna_orden_actual === indice
                        ? "matrix-column-active"
                        : "",
                    rol_camino ? `matrix-path-node-${rol_camino}` : "",
                ]
                    .filter(Boolean)
                    .join(" ")}" scope="col">${etiqueta}</th>`;
            },
        )
        .join("")}</tr></thead>`;
    let filas_html = "";

    for (let indice_fila = 0; indice_fila < cantidad; indice_fila++) {
        let celdas_html = "";

        for (
            let indice_columna = 0;
            indice_columna < cantidad;
            indice_columna++
        ) {
            celdas_html += renderizar_celda_matriz(
                matriz[indice_fila][indice_columna],
                indice_fila,
                indice_columna,
                etiquetas_filas,
                etiquetas_columnas,
                opciones,
            );
        }

        const clase_fila = [
            opciones.nodo_actual === indice_fila ? "matrix-focus" : "",
            opciones.fila_orden_actual === indice_fila
                ? "matrix-row-active"
                : "",
            opciones.roles_camino_filas?.[indice_fila]
                ? `matrix-path-node-${opciones.roles_camino_filas[indice_fila]}`
                : "",
        ]
            .filter(Boolean)
            .join(" ");
        filas_html += `<tr><th class="${clase_fila}" scope="row">${etiquetas_filas[indice_fila]}</th>${celdas_html}</tr>`;
    }

    return `
        <div
            class="matrix-scroll matrix-scroll-small"
            tabindex="0"
            role="region"
            aria-label="Matriz de ${cantidad} por ${cantidad}; desplázate para recorrer sus datos"
        >
            <table class="matrix matrix-small">
                ${encabezado_tabla}
                <tbody>${filas_html}</tbody>
            </table>
        </div>`;
}

// Convierte un color hexadecimal para usarlo con transparencia.
function hexadecimal_a_rgba(hexadecimal, opacidad) {
    const rojo = parseInt(hexadecimal.slice(1, 3), 16);
    const verde = parseInt(hexadecimal.slice(3, 5), 16);
    const azul = parseInt(hexadecimal.slice(5, 7), 16);

    return `rgba(${rojo},${verde},${azul},${opacidad})`;
}

// Pantalla inicial, controles de creación y vista previa del grafo.
function renderizar_pantalla_configuracion() {
    const n = estado.n;
    const porcentaje_relleno = calcular_porcentaje_red(n);
    return `
        <section class="screen screen-config">
            <div class="hero-copy">
                <span class="eyebrow"><span class="eyebrow-line"></span> TU RED, EN PERSPECTIVA</span>
                <h1 class="hero-title">Todo está<br /><em>conectado.</em></h1>
                <p class="hero-sub">Crea un grafo dirigido y descubre sus componentes fuertemente conexas.</p>
            </div>

            <div class="panel config-panel">
                <div class="config-grid">
                    <div class="config-controls">
                        <div class="section-kicker">CANTIDAD DE NODOS</div>
                        <div class="count-row">
                            <div class="count-display">${n}</div>
                            <div class="count-slider">
                                <input aria-label="Cantidad de nodos" type="range" min="${CANTIDAD_MINIMA_USUARIOS}" max="${CANTIDAD_MAXIMA_USUARIOS}" value="${n}" step="1" data-action="set-n" style="--fill:${porcentaje_relleno}%">
                                <div class="range-labels"><span>${CANTIDAD_MINIMA_USUARIOS}</span><span>${CANTIDAD_MAXIMA_USUARIOS}</span></div>
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
                    </div>

                    <div class="preview-card">
                        <div class="preview-heading"><span>VISTA PREVIA</span></div>
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

// Conserva el grafo de muestra mientras no cambie su tamaño.
function obtener_datos_previsualizacion(n) {
    if (
        cache_previsualizacion.matriz &&
        cache_previsualizacion.cantidad === n
    ) {
        return cache_previsualizacion;
    }

    const matriz = generar_matriz_aleatoria(n);
    const { componentes } = calcular_datos_algoritmo(matriz, false);
    cache_previsualizacion.cantidad = n;
    cache_previsualizacion.matriz = matriz;
    cache_previsualizacion.mapa_colores = crear_mapa_colores_componentes(
        componentes,
        n,
    );
    return cache_previsualizacion;
}

// Calcula el porcentaje del control de cantidad de nodos.
function calcular_porcentaje_red(cantidad) {
    return (
        ((cantidad - CANTIDAD_MINIMA_USUARIOS) /
            (CANTIDAD_MAXIMA_USUARIOS - CANTIDAD_MINIMA_USUARIOS)) *
        100
    );
}

// Prepara los datos de nodos y aristas para la vista previa.
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

// Renderiza la pantalla para editar conexiones manualmente.
function renderizar_pantalla_construccion() {
    const n = estado.n;
    const conexiones = obtener_conexiones_manuales();
    const cantidad_conexiones = conexiones.cantidad;

    return `
        <section class="screen">
            <div class="screen-heading">
                <div><span class="eyebrow"><span class="eyebrow-line"></span> ARMA TU GRAFO DIRIGIDO</span><h1 class="page-title">¿A quién apunta cada arista?</h1></div>
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
                            <span><b>${n}</b> NODOS</span><span class="stat-divider"></span><span><b>${cantidad_conexiones}</b> ARISTAS DIRIGIDAS</span>
                        </div>
                    </div>
                    <aside class="connections-panel">
                        ${conexiones.html}
                    </aside>
                </div>
                <p class="validation-message" data-cycle-message role="alert" hidden></p>
                <div class="workspace-actions">
                    <button class="btn btn-ghost" data-action="restart">Volver</button>
                    <button class="btn btn-primary" data-action="confirm-manual">Encontrar comunidades <span class="button-arrow">↗</span></button>
                </div>
            </div>
        </section>`;
}

// Construye la lista de conexiones y su resumen.
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
        : `<div class="empty-state"><span class="empty-icon">⌘</span><span>Tu grafo empieza aquí.<br /><b>Elige un origen y un destino</b> para dibujar una flecha.</span></div>`;
    return {
        cantidad: conexiones.length,
        html: `<div class="connections-heading"><div><span class="section-kicker">ARISTAS</span><h2>Conexiones dirigidas</h2></div><span class="connection-count">${conexiones.length}</span></div><div class="edge-chip-row">${lista_conexiones}</div>${conexiones.length ? `<button class="text-button" data-action="clear-edges">Borrar todas <span>×</span></button>` : ""}`,
    };
}

// Indica el origen o destino que debe seleccionarse en el editor.
function obtener_texto_indicacion_manual() {
    return estado.nodo_seleccionado_arista === null
        ? "Toca el origen y luego el destino. Cada grupo conectado debe cerrar un ciclo."
        : `<b>${estado.nombres[estado.nodo_seleccionado_arista]}</b> es el origen · elige el destino`;
}

// Sincroniza los nodos y las aristas con la matriz del editor.
function actualizar_grafo_manual(instancia) {
    if (!instancia) return;

    instancia.nodes().forEach((nodo) => {
        nodo.toggleClass(
            "seleccionado",
            Number(nodo.id()) === estado.nodo_seleccionado_arista,
        );
    });

    const aristas_deseadas = new Map(
        crear_datos_aristas(estado.matriz).map((arista) => [
            arista.data.id,
            arista,
        ]),
    );

    instancia.edges().forEach((arista) => {
        const deseada = aristas_deseadas.get(arista.id());
        if (
            !deseada ||
            arista.source().id() !== deseada.data.source ||
            arista.target().id() !== deseada.data.target
        ) {
            arista.remove();
        } else {
            arista.data("bidireccional", deseada.data.bidireccional);
            arista.toggleClass(
                "bidirectional",
                deseada.data.bidireccional,
            );
            arista.data("color", deseada.data.color);
            aristas_deseadas.delete(arista.id());
        }
    });

    aristas_deseadas.forEach((arista) => instancia.add(arista));
}

// Sincroniza el resumen, validación y grafo del editor manual.
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
    resumen.innerHTML = `<span><b>${estado.n}</b> NODOS</span><span class="stat-divider"></span><span><b>${conexiones.cantidad}</b> ARISTAS DIRIGIDAS</span>`;
    panel_conexiones.innerHTML = conexiones.html;

    const mensaje_ciclo = document.querySelector("[data-cycle-message]");
    if (mensaje_ciclo) mensaje_ciclo.hidden = true;

    actualizar_grafo_manual(instancia);
}

// Presenta el progreso y la explicación del paso actual.
function renderizar_puntos_pasos() {
    const indice_paso = Math.max(estado.paso_algoritmo, 0);
    const paso = estado.pasos[indice_paso];
    if (!paso) return "";

    const indice_fase = fases_algoritmo.findIndex(
        (fase) => fase.id === paso.fase,
    );
    const pasos_fase = estado.pasos.filter(
        (paso_actual) => paso_actual.fase === paso.fase,
    );
    const indice_paso_fase = pasos_fase.indexOf(paso) + 1;
    const progreso_fase = (indice_paso_fase / pasos_fase.length) * 100;
    const nombre_fase = fases_algoritmo[indice_fase]?.nombre;
    const explicacion_camino =
        paso.tipo === "camino"
            ? `<div class="algorithm-path-explanation" aria-label="Conexión agregada de ${paso.camino[0]} a ${paso.camino[paso.camino.length - 1]} mediante el camino ${paso.camino.join(" a ")}">
                   <div class="algorithm-path-summary">
                       <span>CONEXIÓN AGREGADA</span>
                       <strong>${paso.camino[0]} → ${paso.camino[paso.camino.length - 1]}</strong>
                   </div>
                   <div class="algorithm-path-route">
                       <span>Camino recorrido</span>
                       <div class="algorithm-path-sequence">
                           ${paso.camino
                               .map(
                                   (nodo, indice) =>
                                       `${indice ? '<span class="algorithm-path-arrow" aria-hidden="true">→</span>' : ""}<span class="algorithm-path-node-chip ${indice === 0 ? "path-start" : indice === paso.camino.length - 1 ? "path-end" : "path-middle"}">${nodo}</span>`,
                               )
                               .join("")}
                       </div>
                   </div>
               </div>`
            : "";
    const indicador_fases = fases_algoritmo
        .map((fase, indice) => {
            const estado_fase =
                indice === indice_fase
                    ? "active"
                    : indice < indice_fase
                      ? "completed"
                      : "";
            return `<span class="phase-indicator ${estado_fase}" ${indice === indice_fase ? 'aria-current="step"' : ""}>${fase.nombre}</span>`;
        })
        .join("");

    return `
        <div
            class="algorithm-progress"
            role="status"
            aria-label="Fase ${indice_fase + 1} de ${fases_algoritmo.length}, ${nombre_fase}. Paso ${indice_paso_fase} de ${pasos_fase.length}: ${paso.titulo}"
        >
            <div class="algorithm-phases" aria-label="Fases del análisis">
                ${indicador_fases}
            </div>
            <div class="algorithm-progress-heading">
                <span>FASE ${indice_fase + 1} DE ${fases_algoritmo.length} · ${nombre_fase.toUpperCase()} · PASO ${indice_paso_fase} DE ${pasos_fase.length}</span>
                <strong>${paso.titulo}</strong>
            </div>
            <div
                class="algorithm-progress-track"
                role="progressbar"
                aria-valuemin="1"
                aria-valuemax="${pasos_fase.length}"
                aria-valuenow="${indice_paso_fase}"
                aria-label="Progreso de la fase ${nombre_fase}"
            >
                <span style="width: ${progreso_fase}%"></span>
            </div>
            ${explicacion_camino}
        </div>`;
}

// Prepara la matriz, los colores y las leyendas del paso actual.
function obtener_contenido_paso_algoritmo() {
    const paso = estado.pasos[Math.max(estado.paso_algoritmo, 0)];
    const etiquetas = Array.from(
        { length: estado.n },
        (_, indice) => String(indice + 1),
    );
    if (!paso) {
        throw new Error("No hay datos para mostrar en este paso del algoritmo.");
    }

    const orden_filas =
        paso.orden_filas ??
        Array.from({ length: estado.n }, (_, indice) => indice);
    const orden_columnas =
        paso.orden_columnas ??
        Array.from({ length: estado.n }, (_, indice) => indice);
    const celdas_camino = new Map();
    const roles_camino_filas = Array(estado.n).fill(null);
    const roles_camino_columnas = Array(estado.n).fill(null);
    (paso.aristas_camino ?? []).forEach(([origen, destino], indice) => {
        const indice_fila = orden_filas.indexOf(origen);
        const indice_columna = orden_columnas.indexOf(destino);
        roles_camino_filas[indice_fila] = indice === 0 ? "start" : "middle";
        roles_camino_columnas[indice_columna] =
            indice === paso.aristas_camino.length - 1 ? "end" : "middle";
        celdas_camino.set(
            `${indice_fila}-${indice_columna}`,
            indice === 0 ? "start" : "middle",
        );
    });
    const componente_por_nodo =
        paso.tipo === "componente"
            ? crear_mapa_componentes_por_nodo(
                  estado.componentes,
                  estado.n,
                  paso.componentes_mostradas,
              )
            : null;

    return {
        paso,
        fase: paso.fase,
        fase_titulo:
            fases_algoritmo.find((fase) => fase.id === paso.fase)?.nombre ??
            "",
        html_matriz_cuerpo: renderizar_tabla_matriz(
            paso.matriz,
            orden_filas.map((indice) => etiquetas[indice]),
            orden_columnas.map((indice) => etiquetas[indice]),
            {
                diagonal_actual:
                    paso.tipo === "diagonal" ? paso.nodo_actual : null,
                fila_orden_actual:
                    paso.tipo === "orden-fila"
                        ? paso.cantidad_ordenada - 1
                        : null,
                columna_orden_actual:
                    paso.tipo === "orden-columna"
                        ? paso.cantidad_ordenada - 1
                        : null,
                celda_actual: paso.celda_actual,
                celdas_camino,
                roles_camino_filas,
                roles_camino_columnas,
                ...(paso.tipo === "componente"
                    ? {
                          bloque_de_filas: orden_filas.map(
                              (nodo) => componente_por_nodo[nodo],
                          ),
                          bloque_de_columnas: orden_columnas.map(
                              (nodo) => componente_por_nodo[nodo],
                          ),
                      }
                    : {}),
            },
        ),
        html_leyenda_camino:
            paso.tipo === "camino"
                ? `<div class="matrix-path-legend" aria-label="Colores compartidos entre el grafo y la matriz">
                       <span class="matrix-path-legend-item"><span class="matrix-path-swatch matrix-start-swatch"></span>Inicio y primer tramo</span>
                       <span class="matrix-path-legend-item"><span class="matrix-path-swatch matrix-middle-swatch"></span>Nodo intermedio y su tramo</span>
                       <span class="matrix-path-legend-item"><span class="matrix-path-swatch matrix-end-swatch"></span>Destino y relación agregada</span>
                   </div>`
                : "",
        mapa_colores:
            paso.tipo === "componente"
                ? crear_mapa_colores_componentes(
                      estado.componentes.slice(
                          0,
                          paso.componentes_mostradas,
                      ),
                      estado.n,
                  )
                : null,
    };
}

// Genera los controles para avanzar o retroceder en el análisis.
function renderizar_navegacion_algoritmo() {
    const es_presentacion_grafo = estado.paso_algoritmo === -1;
    const texto_anterior =
        estado.paso_algoritmo === 0 ? "← Ver grafo" : "← Paso anterior";
    const es_ultimo_paso =
        estado.paso_algoritmo === estado.pasos.length - 1;
    const siguiente_paso = estado.pasos[estado.paso_algoritmo + 1];
    const siguiente_fase = fases_algoritmo.find(
        (fase) => fase.id === siguiente_paso?.fase,
    );
    const cambia_fase =
        siguiente_paso &&
        estado.pasos[estado.paso_algoritmo]?.fase !== siguiente_paso.fase;
    const texto_siguiente = es_presentacion_grafo
        ? "Iniciar análisis"
        : es_ultimo_paso
          ? "Ver resultados"
          : cambia_fase
            ? `Continuar a ${siguiente_fase.nombre}`
            : "Siguiente paso";

    return `
        <button class="btn btn-ghost" data-action="algo-prev" ${es_presentacion_grafo ? "hidden" : ""}>${texto_anterior}</button>
        <div class="auto-advance-controls" ${es_ultimo_paso ? "hidden" : ""}>
            <button class="btn btn-ghost" data-action="toggle-auto-advance" aria-pressed="${avance_automatico_activo}">${avance_automatico_activo ? "Pausar avance" : "Avance automático"}</button>
            <div class="auto-speed-control" aria-label="Velocidad del avance automático">
                <button class="btn btn-ghost auto-speed-button" data-action="change-auto-speed" data-direction="-1" aria-label="Reducir velocidad" ${indice_velocidad_avance_automatico === 0 ? "disabled" : ""}>−</button>
                <span class="auto-speed-value" aria-live="polite">${VELOCIDADES_AVANCE_AUTOMATICO[indice_velocidad_avance_automatico]}×</span>
                <button class="btn btn-ghost auto-speed-button" data-action="change-auto-speed" data-direction="1" aria-label="Aumentar velocidad" ${indice_velocidad_avance_automatico === VELOCIDADES_AVANCE_AUTOMATICO.length - 1 ? "disabled" : ""}>+</button>
            </div>
        </div>
        <button class="btn btn-primary" data-action="algo-next">${texto_siguiente} <span class="button-arrow">↗</span></button>`;
}

// Actualiza los colores y resaltados del grafo del análisis.
function actualizar_colores_grafo_algoritmo(mapa_colores, paso) {
    const lienzo = document.querySelector(".algorithm-graph .network-canvas");
    if (!lienzo) return;

    const instancia = instancias_grafos[Number(lienzo.dataset.networkIndex)];
    if (!instancia) return;

    instancia.nodes().forEach((nodo) => {
        const indice = Number(nodo.id());
        const indice_camino = paso.camino?.indexOf(indice + 1) ?? -1;
        nodo.data("color", mapa_colores?.[indice] ?? color_nodo_neutro);
        nodo.toggleClass(
            "analysis-current",
            indice === paso.nodo_actual && paso.tipo !== "camino",
        );
        nodo.toggleClass("analysis-path-node", indice_camino !== -1);
        nodo.toggleClass(
            "analysis-path-start",
            paso.tipo === "camino" && indice_camino === 0,
        );
        nodo.toggleClass(
            "analysis-path-end",
            paso.tipo === "camino" &&
                indice_camino === paso.camino.length - 1,
        );
    });
    const componente_por_nodo = crear_mapa_componentes_por_nodo(
        estado.componentes,
        estado.n,
    );
    instancia.edges().forEach((arista) => {
        const origen = Number(arista.source().id());
        const destino = Number(arista.target().id());
        arista.data(
            "color",
            mapa_colores?.[origen] ?? color_arista_neutra,
        );
        arista.toggleClass(
            "component-external",
            paso.tipo === "componente" &&
                componente_por_nodo[origen] !==
                    componente_por_nodo[destino],
        );
        const aristas_camino = paso.aristas_camino ?? [];
        const indice_tramo_camino = aristas_camino.findIndex(
            ([origen_camino, destino_camino]) =>
                (origen === origen_camino && destino === destino_camino) ||
                (arista.data("bidireccional") &&
                    origen === destino_camino &&
                    destino === origen_camino),
        );
        const es_tramo_inicio = indice_tramo_camino === 0;
        const es_tramo_intermedio =
            indice_tramo_camino > 0;
        arista.toggleClass(
            "analysis-path-edge",
            paso.tipo === "camino" && indice_tramo_camino !== -1,
        );
        arista.toggleClass(
            "analysis-path-start-edge",
            paso.tipo === "camino" && es_tramo_inicio,
        );
        arista.toggleClass(
            "analysis-path-middle-edge",
            paso.tipo === "camino" && es_tramo_intermedio,
        );
    });
}

// Actualiza la pantalla del análisis y coordina sus transiciones.
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
        es_presentacion_grafo
            ? "TU RED"
            : `FASE ${fases_algoritmo.findIndex((fase) => fase.id === contenido.fase) + 1} DE ${fases_algoritmo.length} · ${contenido.fase_titulo.toUpperCase()}`;
    document.querySelector(".algorithm-page-title").textContent =
        es_presentacion_grafo
            ? "Así quedó tu red"
            : `Fase: ${contenido.fase_titulo}`;
    document.querySelector(".steps-nav").innerHTML = renderizar_puntos_pasos();
    document.querySelector(".matrix-column .matrix-scroll").outerHTML =
        contenido.html_matriz_cuerpo;
    document.querySelector(".matrix-path-legend-slot").innerHTML =
        contenido.html_leyenda_camino;
    document.querySelector(".algo-nav").innerHTML =
        renderizar_navegacion_algoritmo();
    actualizar_colores_grafo_algoritmo(
        contenido.mapa_colores,
        contenido.paso,
    );

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
        const lienzo = document.querySelector(
            ".algorithm-graph .network-canvas",
        );
        const instancia = lienzo
            ? instancias_grafos[Number(lienzo.dataset.networkIndex)]
            : null;
        if (!instancia) return;

        const encuadrar_grafo = () => {
            instancia.resize();
            instancia.fit(instancia.elements(), 42);
        };

        const hay_transicion_grafo =
            transicionar_a_matriz || transicionar_al_grafo;
        if (hay_transicion_grafo && !movimiento_reducido) {
            const duracion_ajuste = 480;
            const inicio_ajuste = window.performance.now();
            const actualizar_encuadre_durante_transicion = (ahora) => {
                encuadrar_grafo();
                if (ahora - inicio_ajuste < duracion_ajuste) {
                    window.requestAnimationFrame(
                        actualizar_encuadre_durante_transicion,
                    );
                }
            };

            window.requestAnimationFrame(
                actualizar_encuadre_durante_transicion,
            );
        } else {
            window.requestAnimationFrame(encuadrar_grafo);
        }
    }
}

// Renderiza el grafo y la matriz del paso actual del algoritmo.
function renderizar_pantalla_algoritmo() {
    const n = estado.n;
    const es_presentacion_grafo = estado.paso_algoritmo === -1;
    const contenido = obtener_contenido_paso_algoritmo();
    const {
        html_matriz_cuerpo,
        html_leyenda_camino,
        mapa_colores,
        fase,
        fase_titulo,
    } = contenido;
    const etiqueta_fase = es_presentacion_grafo
        ? "TU RED"
        : `FASE ${fases_algoritmo.findIndex((etapa) => etapa.id === fase) + 1} DE ${fases_algoritmo.length} · ${fase_titulo.toUpperCase()}`;
    const titulo_pantalla = es_presentacion_grafo
        ? "Así quedó tu red"
        : `Fase: ${fase_titulo}`;
    return `
  <section class="screen">
    <div class="screen-heading">
      <div><span class="eyebrow"><span class="eyebrow-line"></span> <span class="algorithm-eyebrow-label">${etiqueta_fase}</span></span><h1 class="page-title algorithm-page-title">${titulo_pantalla}</h1></div>
      <button class="icon-button" data-action="restart" aria-label="Volver al inicio">↶</button>
    </div>
    <div class="panel workspace-panel algorithm-panel ${es_presentacion_grafo ? "algorithm-intro" : ""}">
      <div class="steps-nav">${renderizar_puntos_pasos()}</div>

      <div class="algo-grid">
        <div class="algorithm-graph">
          <div class="section-kicker">GRAFO DIRIGIDO</div>
          <div class="graph-wrap">
          ${renderizar_grafo({ n, matriz: estado.matriz, nombres: estado.nombres, mapa_colores, componentes: contenido.paso.tipo === "componente" ? estado.componentes : null })}
          </div>
        </div>
        <div class="matrix-column">
          <div class="matrix-meta"><span>${n} × ${n}</span><span>Fila: origen · columna: destino</span></div>
          ${html_matriz_cuerpo}
          <div class="matrix-path-legend-slot">${html_leyenda_camino}</div>
        </div>
      </div>

      <div class="algo-nav">
        ${renderizar_navegacion_algoritmo()}
      </div>
    </div>
  </section>`;
}

// Renderiza las tarjetas con los nodos de cada componente.
function renderizar_tarjetas_componentes(componentes = estado.componentes) {
    return componentes
        .map((componente, indice_componente) => {
            const color = obtener_color_componente(indice_componente);
            const nodos_componente = componente
                .map((indice_nodo) => indice_nodo + 1)
                .join(", ");
            const integrantes = componente
                .map(
                    (indice_nodo) =>
                        `<span class="member-chip">${estado.nombres[indice_nodo]}</span>`,
                )
                .join("");
            const etiqueta_nodos =
                componente.length === 1 ? "nodo" : "nodos";

            return `
                <article class="community-card" style="border-left-color: ${color}">
                    <h3>
                        <span class="swatch" style="background: ${color}"></span>
                        Componente ${indice_componente + 1}
                    </h3>
                    <p class="component-set"><i>V</i><sub>${indice_componente + 1}</sub> = {${nodos_componente}}</p>
                    <p>${componente.length} ${etiqueta_nodos}</p>
                    <div class="member-chips">${integrantes}</div>
                </article>`;
        })
        .join("");
}

// Obtiene las matrices presentadas en el análisis final.
function obtener_etapas_analisis_original() {
    const indices = Array.from({ length: estado.n }, (_, indice) => indice);
    const paso_caminos = estado.pasos.find(
        (paso) => paso.tipo === "caminos-completos",
    );
    let paso_ordenado = null;
    let paso_componentes = null;

    estado.pasos.forEach((paso) => {
        if (paso.tipo === "orden-columna") paso_ordenado = paso;
        if (paso.tipo === "componente") paso_componentes = paso;
    });

    if (!paso_caminos || !paso_ordenado || !paso_componentes) {
        throw new Error(
            "No se encontraron todos los pasos necesarios para mostrar el análisis del grafo.",
        );
    }

    return [
        {
            titulo: "Matriz de adyacencia",
            descripcion:
                "Representa las aristas originales: fila es el origen y columna el destino.",
            matriz: estado.matriz,
            orden_filas: indices,
            orden_columnas: indices,
        },
        {
            titulo: "Matriz de caminos",
            descripcion:
                "Muestra qué nodos son alcanzables desde cada origen, incluyendo la diagonal.",
            matriz: paso_caminos.matriz,
            orden_filas: indices,
            orden_columnas: indices,
        },
        {
            titulo: "Filas y columnas ordenadas",
            descripcion:
                "Las filas se ordenan por cantidad de unos y las columnas siguen ese mismo orden.",
            matriz: paso_ordenado.matriz,
            orden_filas: paso_ordenado.orden_filas,
            orden_columnas: paso_ordenado.orden_columnas,
        },
        {
            titulo: "Componentes fuertemente conexas",
            descripcion:
                "Los bloques identifican los grupos cuyos nodos se alcanzan mutuamente. El grafo muestra el ciclo dirigido más largo posible de cada grupo.",
            matriz: paso_componentes.matriz,
            orden_filas: paso_componentes.orden_filas,
            orden_columnas: paso_componentes.orden_columnas,
            componentes: estado.componentes,
        },
    ];
}

// Genera las pestañas para elegir una etapa del análisis final.
function renderizar_pestanas_analisis_original(indice_activo, etapas) {
    return etapas
        .map(
            (etapa, indice) => `
                <button
                    class="original-analysis-tab ${indice === indice_activo ? "active" : ""}"
                    id="original-analysis-tab-${indice}"
                    type="button"
                    role="tab"
                    aria-selected="${indice === indice_activo}"
                    tabindex="${indice === indice_activo ? "0" : "-1"}"
                    aria-controls="original-analysis-stage"
                    data-action="select-original-step"
                    data-step="${indice}"
                >
                    <span>${indice + 1}</span>
                    ${etapa.titulo}
                </button>`,
        )
        .join("");
}

// Renderiza la descripción y matriz de una etapa seleccionada.
function renderizar_etapa_analisis_original(indice, etapas) {
    const etapa = etapas[indice];
    if (!etapa) {
        throw new RangeError("La etapa del análisis seleccionado no existe.");
    }

    const etiquetas = Array.from(
        { length: estado.n },
        (_, indice_nodo) => String(indice_nodo + 1),
    );
    const componente_por_nodo = crear_mapa_componentes_por_nodo(
        etapa.componentes,
        estado.n,
    );

    const etiquetas_filas = etapa.orden_filas.map(
        (nodo) => etiquetas[nodo],
    );
    const etiquetas_columnas = etapa.orden_columnas.map(
        (nodo) => etiquetas[nodo],
    );
    const opciones_matriz = etapa.componentes
        ? {
              bloque_de_filas: etapa.orden_filas.map(
                  (nodo) => componente_por_nodo[nodo],
              ),
              bloque_de_columnas: etapa.orden_columnas.map(
                  (nodo) => componente_por_nodo[nodo],
              ),
          }
        : {};
    return `
        <div
            class="original-analysis-stage-content"
            role="tabpanel"
            id="original-analysis-stage"
            aria-labelledby="original-analysis-tab-${indice}"
        >
            <div class="original-analysis-copy">
                <span>ETAPA ${indice + 1} DE ${etapas.length}</span>
                <h3>${etapa.titulo}</h3>
                <p>${etapa.descripcion}</p>
            </div>
            <div class="original-analysis-matrix">
                <div class="matrix-meta">
                    <span>${estado.n} × ${estado.n}</span>
                    <span>Fila: origen · columna: destino</span>
                </div>
                ${renderizar_tabla_matriz(
                    etapa.matriz,
                    etiquetas_filas,
                    etiquetas_columnas,
                    opciones_matriz,
                )}
            </div>
        </div>`;
}

// Actualiza el grafo original según la etapa seleccionada.
function actualizar_grafo_original_por_etapa(indice, etapas) {
    const lienzo = document.querySelector(
        ".result-original-layout .network-canvas",
    );
    if (!lienzo) return;

    const indice_grafo = Number(lienzo.dataset.networkIndex);
    const instancia = instancias_grafos[indice_grafo];
    if (!instancia) return;

    const etapa = etapas[indice];
    const componentes = etapa.componentes;
    const componentes_ordenados = componentes
        ? componentes.map((componente) =>
              ordenar_nodos_componente(componente, etapa.orden_filas),
          )
        : null;
    const matriz_ciclos = componentes
        ? crear_matriz_ciclos_maximos(estado.matriz, componentes_ordenados)
        : estado.matriz;
    const componentes_ciclo = componentes_ordenados?.map((componente) =>
        ordenar_nodos_segun_ciclo(matriz_ciclos, componente),
    );
    const mapa_colores = componentes
        ? crear_mapa_colores_componentes(componentes_ordenados, estado.n)
        : null;
    const opciones = {
        ...configuraciones_grafos[indice_grafo],
        matriz: matriz_ciclos,
        mapa_colores,
        componentes: componentes_ciclo ?? null,
        organizar_componentes: Boolean(componentes),
    };
    configuraciones_grafos[indice_grafo] = opciones;

    instancia.stop();
    instancia.edges().remove();
    instancia.add(
        crear_datos_aristas(
            opciones.matriz,
            opciones.mapa_colores,
            opciones.componentes,
        ),
    );
    instancia.nodes().forEach((nodo) => {
        const indice_nodo = Number(nodo.id());
        nodo.data(
            "color",
            mapa_colores?.[indice_nodo] ?? color_nodo_neutro,
        );
    });

    const encabezado_grafo = document.querySelector(
        ".result-original-heading h2",
    );
    if (encabezado_grafo) {
        encabezado_grafo.textContent = componentes
            ? "Componentes fuertemente conexas"
            : "Grafo original";
    }

    const caja_grafo = document.getElementById("original-graph-box");
    if (caja_grafo) {
        caja_grafo.setAttribute(
            "aria-label",
            componentes
                ? "Componentes fuertemente conexas representadas por grupo"
                : "Grafo original completo",
        );
    }

    lienzo.setAttribute(
        "aria-label",
        componentes
            ? `Componentes fuertemente conexas: ciclo dirigido máximo en cada uno de los ${componentes.length} grupos`
            : `Grafo dirigido con ${estado.n} nodos`,
    );
    ejecutar_distribucion(instancia, lienzo, opciones);
}

// Cambia la etapa visible y sincroniza los controles relacionados.
function actualizar_etapa_analisis_original(indice) {
    const etapas = obtener_etapas_analisis_original();
    if (!Number.isInteger(indice) || indice < 0 || indice >= etapas.length) {
        throw new RangeError("La etapa del análisis seleccionado no existe.");
    }

    const indice_anterior = estado.paso_analisis_original;
    estado.paso_analisis_original = indice;
    document.querySelectorAll(".original-analysis-tab").forEach((pestana) => {
        const esta_activa = Number(pestana.dataset.step) === indice;
        pestana.classList.toggle("active", esta_activa);
        pestana.setAttribute("aria-selected", String(esta_activa));
        pestana.tabIndex = esta_activa ? 0 : -1;
    });

    const contenido = document.querySelector(".original-analysis-content");
    const contador = document.querySelector(
        "[data-original-step-counter]",
    );
    const boton_anterior = document.querySelector(
        '[data-action="move-original-step"][data-direction="-1"]',
    );
    const boton_siguiente = document.querySelector(
        '[data-action="move-original-step"][data-direction="1"]',
    );
    if (!contenido || !boton_anterior || !boton_siguiente) return;

    contenido.innerHTML = renderizar_etapa_analisis_original(indice, etapas);
    // Al entrar o salir de la etapa 4 cambia entre el grafo y sus ciclos.
    const indice_etapa_componentes = etapas.length - 1;
    if (
        indice_anterior === indice_etapa_componentes ||
        indice === indice_etapa_componentes
    ) {
        actualizar_grafo_original_por_etapa(indice, etapas);
    }
    if (contador) contador.textContent = `${indice + 1} / ${etapas.length}`;
    boton_anterior.disabled = indice === 0;
    boton_siguiente.disabled = indice === etapas.length - 1;
}

// Renderiza el resultado y el análisis detallado de la red.
function renderizar_pantalla_resultado() {
    const n = estado.n;
    const etapas_analisis = obtener_etapas_analisis_original();
    const paso_componentes = estado.pasos.find(
        (paso) => paso.tipo === "componente",
    );
    const orden_nodos =
        paso_componentes?.orden_filas ??
        Array.from({ length: n }, (_, indice) => indice);
    const componentes_ordenados = estado.componentes.map((componente) =>
        ordenar_nodos_componente(componente, orden_nodos),
    );
    const matriz_ciclos = crear_matriz_ciclos_maximos(
        estado.matriz,
        componentes_ordenados,
    );
    const componentes_ciclo = componentes_ordenados.map((componente) =>
        ordenar_nodos_segun_ciclo(matriz_ciclos, componente),
    );
    const mapa_colores = crear_mapa_colores_componentes(
        estado.componentes,
        n,
    );
    const tarjetas_componentes =
        renderizar_tarjetas_componentes(estado.componentes);
    const etiqueta_componentes =
        estado.componentes.length === 1
            ? "componente fuertemente conexa"
            : "componentes fuertemente conexas";

    return `
  <section class="screen">
    <div class="screen-heading result-heading">
      <div><span class="eyebrow"><span class="eyebrow-line"></span> RESULTADO DEL ANÁLISIS</span><h1 class="page-title">Se encontraron <em>${estado.componentes.length}</em> ${etiqueta_componentes}.</h1></div>
      <button class="icon-button" data-action="restart" aria-label="Volver al inicio">↶</button>
    </div>
    <div class="panel workspace-panel">
      <div class="result-summary">
        <span class="big-n">${estado.componentes.length}</span>
        <span class="big-label">${etiqueta_componentes}</span>
      </div>
      <p class="scc-definition">Cada componente es un conjunto maximal de nodos cuyos integrantes pueden alcanzarse entre sí siguiendo la dirección de las aristas.</p>

      <div class="result-view-actions">
        <button class="btn btn-ghost" data-action="toggle-result-graph" aria-expanded="false" aria-controls="original-graph-box">
          Ver grafo original
        </button>
      </div>
      <div class="result-grid">
        <div class="graph-wrap">
          ${renderizar_grafo({
              n,
              matriz: matriz_ciclos,
              nombres: estado.nombres,
              mapa_colores,
              componentes: componentes_ciclo,
              organizar_componentes: true,
          })}
          <p class="component-cycle-caption">Cada nodo del ciclo tiene una entrada y una salida, ambas presentes en la matriz original. Los nodos fuera del ciclo siguen en su componente, sin aristas en esta vista.</p>
        </div>
        <div>${tarjetas_componentes}</div>
      </div>

      <section
        class="result-original-box"
        id="original-graph-box"
        aria-label="Grafo original completo"
        aria-hidden="true"
        inert
      >
        <div class="result-original-heading">
          <div>
            <span class="section-kicker">RED COMPLETA</span>
            <h2>Grafo original</h2>
          </div>
          <span>Explora la red y sigue cómo se obtiene el resultado</span>
        </div>
        <div class="result-original-layout">
          <div class="graph-wrap">
            ${renderizar_grafo({
                n,
                matriz: estado.matriz,
                nombres: estado.nombres,
            })}
          </div>
          <section class="original-analysis" aria-label="Proceso de análisis">
            <div class="original-analysis-heading">
              <span class="section-kicker">PROCESO DE ANÁLISIS</span>
              <div class="original-analysis-tabs" role="tablist" aria-label="Etapas del análisis">
                ${renderizar_pestanas_analisis_original(
                    estado.paso_analisis_original,
                    etapas_analisis,
                )}
              </div>
            </div>
            <div class="original-analysis-content" aria-live="polite">
              ${renderizar_etapa_analisis_original(
                  estado.paso_analisis_original,
                  etapas_analisis,
              )}
            </div>
            <div class="original-analysis-navigation">
              <button
                class="btn btn-ghost"
                type="button"
                data-action="move-original-step"
                data-direction="-1"
                ${estado.paso_analisis_original === 0 ? "disabled" : ""}
              >
                ← Anterior
              </button>
              <span data-original-step-counter>${estado.paso_analisis_original + 1} / 4</span>
              <button
                class="btn btn-ghost"
                type="button"
                data-action="move-original-step"
                data-direction="1"
                ${estado.paso_analisis_original === 3 ? "disabled" : ""}
              >
                Siguiente →
              </button>
            </div>
          </section>
        </div>
      </section>

      <div class="btn-row">
        <button class="btn btn-primary" data-action="restart">Crear otra red <span class="button-arrow">↗</span></button>
      </div>
    </div>
  </section>`;
}

// Monta la pantalla activa y vuelve a inicializar sus grafos.
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

// Inicia la creación manual o aleatoria elegida por el usuario.
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

// Reinicia la exploración conservando el tamaño y modo elegidos.
function reiniciar_exploracion() {
    detener_avance_automatico();
    const { n, modo } = estado;
    estado = crear_estado_inicial();
    estado.n = n;
    estado.modo = modo;
    renderizar();
}

// Actualiza la opción activa de creación de la red.
function cambiar_modo(boton) {
    estado.modo = boton.dataset.value;
    document.querySelectorAll('[data-action="set-mode"]').forEach((opcion) => {
        const esta_seleccionada = opcion.dataset.value === estado.modo;
        opcion.classList.toggle("active", esta_seleccionada);
        opcion.setAttribute("aria-pressed", String(esta_seleccionada));
    });
}

// Elimina una arista válida del grafo manual.
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

// Inicia el análisis si cada componente no aislada admite un ciclo completo.
function confirmar_red_manual() {
    const { componentes } = calcular_datos_algoritmo(estado.matriz, false);
    const matriz_ciclos = crear_matriz_ciclos_maximos(
        estado.matriz,
        componentes,
    );
    const componentes_sin_ciclo = componentes.filter(
        (componente) =>
            componente.length > 1 &&
            componente.filter((nodo) =>
                matriz_ciclos[nodo].some(Boolean),
            ).length !== componente.length,
    );

    if (componentes_sin_ciclo.length > 0) {
        const grupos = componentes_sin_ciclo
            .map(
                (componente) =>
                    `{${componente
                        .map((nodo) => nodo + 1)
                        .sort((nodo_a, nodo_b) => nodo_a - nodo_b)
                        .join(", ")}}`,
            )
            .join("; ");
        const mensaje = document.querySelector("[data-cycle-message]");
        if (mensaje) {
            mensaje.textContent = `Las componentes ${grupos} son fuertemente conexas, pero la matriz original no contiene un único ciclo que pase por todos sus nodos. Ajusta las aristas para continuar sin inventar conexiones.`;
            mensaje.hidden = false;
        }
        return;
    }

    ejecutar_algoritmo();
    estado.paso_algoritmo = -1;
    estado.pantalla = "algorithm";
    renderizar();
}

// Avanza un paso o abre el resultado al llegar al final.
function avanzar_paso_algoritmo() {
    if (estado.paso_algoritmo === -1) {
        estado.paso_algoritmo = 0;
        actualizar_pantalla_algoritmo(true);
        return;
    }

    if (estado.paso_algoritmo < estado.pasos.length - 1) {
        estado.paso_algoritmo++;
        actualizar_pantalla_algoritmo();
        return;
    }

    estado.pantalla = "result";
    renderizar();
}

// Cancela el temporizador y deja inactivo el avance automático.
function detener_avance_automatico() {
    if (temporizador_avance_automatico !== null) {
        window.clearTimeout(temporizador_avance_automatico);
        temporizador_avance_automatico = null;
    }
    avance_automatico_activo = false;

    const boton = document.querySelector(
        '[data-action="toggle-auto-advance"]',
    );
    if (boton) {
        boton.textContent = "Avance automático";
        boton.setAttribute("aria-pressed", "false");
    }
}

// Programa el siguiente paso según la velocidad elegida.
function programar_avance_automatico() {
    const intervalo =
        INTERVALO_AVANCE_AUTOMATICO /
        VELOCIDADES_AVANCE_AUTOMATICO[indice_velocidad_avance_automatico];
    temporizador_avance_automatico = window.setTimeout(() => {
        temporizador_avance_automatico = null;
        if (
            !avance_automatico_activo ||
            estado.pantalla !== "algorithm" ||
            estado.paso_algoritmo >= estado.pasos.length - 1
        ) {
            detener_avance_automatico();
            return;
        }

        avanzar_paso_algoritmo();
        if (estado.paso_algoritmo >= estado.pasos.length - 1) {
            detener_avance_automatico();
            return;
        }

        programar_avance_automatico();
    }, intervalo);
}

// Cambia la velocidad y reinicia el temporizador si está avanzando.
function cambiar_velocidad_avance_automatico(boton) {
    const siguiente_indice =
        indice_velocidad_avance_automatico + Number(boton.dataset.direction);
    if (
        siguiente_indice < 0 ||
        siguiente_indice >= VELOCIDADES_AVANCE_AUTOMATICO.length
    ) {
        return;
    }

    indice_velocidad_avance_automatico = siguiente_indice;
    const valor_velocidad = document.querySelector(".auto-speed-value");
    if (valor_velocidad) {
        valor_velocidad.textContent = `${VELOCIDADES_AVANCE_AUTOMATICO[siguiente_indice]}×`;
    }
    document
        .querySelectorAll('[data-action="change-auto-speed"]')
        .forEach((control) => {
            const direccion = Number(control.dataset.direction);
            control.disabled =
                (direccion < 0 && siguiente_indice === 0) ||
                (direccion > 0 &&
                    siguiente_indice ===
                        VELOCIDADES_AVANCE_AUTOMATICO.length - 1);
        });

    if (avance_automatico_activo) {
        if (temporizador_avance_automatico !== null) {
            window.clearTimeout(temporizador_avance_automatico);
        }
        programar_avance_automatico();
    }
}

// Inicia o pausa el avance automático del análisis.
function alternar_avance_automatico() {
    if (avance_automatico_activo) {
        detener_avance_automatico();
        return;
    }

    if (
        estado.pantalla !== "algorithm" ||
        estado.paso_algoritmo >= estado.pasos.length - 1
    ) {
        return;
    }

    avance_automatico_activo = true;
    const boton = document.querySelector(
        '[data-action="toggle-auto-advance"]',
    );
    if (boton) {
        boton.textContent = "Pausar avance";
        boton.setAttribute("aria-pressed", "true");
    }
    programar_avance_automatico();
}

// Borra todas las aristas y actualiza el editor manual.
function limpiar_conexiones_manuales() {
    estado.matriz = crear_matriz_vacia(estado.n);
    estado.nodo_seleccionado_arista = null;
    actualizar_interfaz_construccion(obtener_instancia_grafo_manual());
}

// Abre o cierra el grafo original y prepara su vista al mostrarlo.
function alternar_grafo_original(boton) {
    const caja = document.getElementById("original-graph-box");
    if (!caja) return;

    const esta_abierta = boton.getAttribute("aria-expanded") === "true";
    boton.setAttribute("aria-expanded", String(!esta_abierta));
    boton.textContent = esta_abierta
        ? "Ver grafo original"
        : "Ocultar grafo original";
    caja.classList.toggle("is-open", !esta_abierta);
    caja.setAttribute("aria-hidden", String(esta_abierta));
    caja.inert = esta_abierta;

    if (esta_abierta) return;

    const movimiento_reducido = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;
    window.setTimeout(
        () => {
            if (!caja.classList.contains("is-open")) return;
            caja.scrollIntoView({
                behavior: movimiento_reducido ? "auto" : "smooth",
                block: "nearest",
            });
            const lienzo = caja.querySelector(".network-canvas");
            if (!lienzo) return;
            const instancia =
                instancias_grafos[Number(lienzo.dataset.networkIndex)];
            if (!instancia) return;
            instancia.resize();
            instancia.fit(instancia.elements(), 42);
        },
        movimiento_reducido ? 0 : 360,
    );
}

// Retrocede un paso y pausa cualquier avance automático activo.
function retroceder_paso_algoritmo() {
    detener_avance_automatico();
    if (estado.paso_algoritmo < 0) return;

    estado.paso_algoritmo =
        estado.paso_algoritmo === 0 ? -1 : estado.paso_algoritmo - 1;
    actualizar_pantalla_algoritmo(estado.paso_algoritmo === -1);
}

// Avanza manualmente y pausa el temporizador automático.
function avanzar_paso_manualmente() {
    detener_avance_automatico();
    avanzar_paso_algoritmo();
}

// Ejecuta la acción indicada por cada control de la interfaz.
const acciones_interfaz = {
    "zoom-in": (boton) => ajustar_vista_grafo("zoom-in", boton),
    "zoom-out": (boton) => ajustar_vista_grafo("zoom-out", boton),
    "fit-network": (boton) => ajustar_vista_grafo("fit-network", boton),
    "set-mode": cambiar_modo,
    start: iniciar_exploracion,
    "remove-edge": quitar_conexion,
    "clear-edges": limpiar_conexiones_manuales,
    "confirm-manual": confirmar_red_manual,
    "toggle-result-graph": alternar_grafo_original,
    "select-original-step": (boton) => {
        actualizar_etapa_analisis_original(Number(boton.dataset.step));
    },
    "move-original-step": (boton) => {
        actualizar_etapa_analisis_original(
            estado.paso_analisis_original + Number(boton.dataset.direction),
        );
    },
    "algo-prev": retroceder_paso_algoritmo,
    "algo-next": avanzar_paso_manualmente,
    "toggle-auto-advance": alternar_avance_automatico,
    "change-auto-speed": cambiar_velocidad_avance_automatico,
    restart: reiniciar_exploracion,
};

// Delegación de clics para mantener un único manejador de acciones.
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

// Permite recorrer las pestañas del resultado con el teclado.
document.addEventListener("keydown", (evento) => {
    if (
        !(evento.target instanceof Element) ||
        !evento.target.matches(".original-analysis-tab")
    ) {
        return;
    }

    const cantidad_etapas = obtener_etapas_analisis_original().length;
    let siguiente_indice = estado.paso_analisis_original;
    if (evento.key === "ArrowRight") {
        siguiente_indice =
            (siguiente_indice + 1) % cantidad_etapas;
    } else if (evento.key === "ArrowLeft") {
        siguiente_indice =
            (siguiente_indice - 1 + cantidad_etapas) % cantidad_etapas;
    } else if (evento.key === "Home") {
        siguiente_indice = 0;
    } else if (evento.key === "End") {
        siguiente_indice = cantidad_etapas - 1;
    } else {
        return;
    }

    evento.preventDefault();
    actualizar_etapa_analisis_original(siguiente_indice);
    document
        .querySelector(
            `[data-action="select-original-step"][data-step="${siguiente_indice}"]`,
        )
        ?.focus();
});

// Obtiene la instancia Cytoscape usada por el editor manual.
function obtener_instancia_grafo_manual() {
    const lienzo = document.querySelector(".graph-column .network-canvas");
    return lienzo
        ? instancias_grafos[Number(lienzo.dataset.networkIndex)]
        : null;
}

// Alterna origen, destino y existencia de una arista en el editor manual.
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

// Actualiza cantidad, relleno del control y grafo de vista previa.
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
        cantidad < CANTIDAD_MINIMA_USUARIOS ||
        cantidad > CANTIDAD_MAXIMA_USUARIOS
    ) {
        return;
    }

    estado.n = cantidad;
    evento.target.style.setProperty("--fill", `${calcular_porcentaje_red(cantidad)}%`);
    document.querySelector(".count-display").textContent = cantidad;
    actualizar_vista_previa(cantidad);
});

// Crea el estado inicial y monta la interfaz.
estado = crear_estado_inicial();
renderizar();

if (
    window.Lenis &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
    new window.Lenis({
        autoRaf: true,
        anchors: true,
        smoothWheel: true,
    });
}
