/* Cálculos del grafo y colores compartidos con la interfaz. */
(() => {
    // Valores permitidos y paleta usados en todas las redes.
    const nombres_disponibles = [
        "Amir",
        "Wilber",
        "Samy",
        "Genesis",
        "Addeler",
        "Labio",
        "Erika",
        "Hugo",
        "Iris",
        "José",
        "Kira",
        "Luis",
    ];
    const CANTIDAD_MINIMA_USUARIOS = 4;
    const CANTIDAD_MAXIMA_USUARIOS = 12;
    const colores_componentes = Array.from(
        { length: CANTIDAD_MAXIMA_USUARIOS },
        (_, indice) => generar_color_componente(indice),
    );
    const color_nodo_neutro = "#D8F1FA";
    const color_arista_neutra = "#3A4A66";

    // Verifica que la cantidad de nodos esté dentro del rango admitido.
    function validar_cantidad(cantidad) {
        if (
            !Number.isInteger(cantidad) ||
            cantidad < CANTIDAD_MINIMA_USUARIOS ||
            cantidad > CANTIDAD_MAXIMA_USUARIOS
        ) {
            throw new RangeError(
                `La cantidad de nodos debe estar entre ${CANTIDAD_MINIMA_USUARIOS} y ${CANTIDAD_MAXIMA_USUARIOS}.`,
            );
        }
    }

    // Crea una matriz cuadrada inicializada sin aristas.
    function crear_matriz_vacia(cantidad) {
        validar_cantidad(cantidad);
        return Array.from({ length: cantidad }, () =>
            Array(cantidad).fill(0),
        );
    }

    // Devuelve los nombres disponibles para la cantidad solicitada.
    function obtener_nombres_red(cantidad) {
        validar_cantidad(cantidad);
        return nombres_disponibles.slice(0, cantidad);
    }

    // Genera componentes cíclicas y conexiones dirigidas entre ellas.
    function generar_matriz_aleatoria(cantidad) {
        validar_cantidad(cantidad);
        const matriz = crear_matriz_vacia(cantidad);
        const orden_nodos = Array.from({ length: cantidad }, (_, indice) => indice);

        // Fisher–Yates mezcla los nodos antes de distribuirlos en grupos.
        for (let indice = orden_nodos.length - 1; indice > 0; indice--) {
            const aleatorio = Math.floor(Math.random() * (indice + 1));
            [orden_nodos[indice], orden_nodos[aleatorio]] = [
                orden_nodos[aleatorio],
                orden_nodos[indice],
            ];
        }

        const componentes = [];
        let posicion = 0;

        // Se forman grupos de varios nodos para garantizar ciclos no triviales.
        while (posicion < cantidad) {
            const restantes = cantidad - posicion;
            let tamano =
                restantes === 3
                    ? 3
                    : Math.min(2 + Math.floor(Math.random() * 3), restantes);
            if (restantes - tamano === 1) tamano--;
            componentes.push(orden_nodos.slice(posicion, posicion + tamano));
            posicion += tamano;
        }

        // Cada grupo recibe un ciclo que conecta a todos sus integrantes.
        componentes.forEach((componente) => {
            componente.forEach((origen, indice) => {
                const destino = componente[(indice + 1) % componente.length];
                matriz[origen][destino] = 1;
            });
        });

        // Las aristas entre grupos avanzan en un sentido y no los fusionan.
        for (let indice_origen = 0; indice_origen < componentes.length; indice_origen++) {
            for (
                let indice_destino = indice_origen + 1;
                indice_destino < componentes.length;
                indice_destino++
            ) {
                componentes[indice_origen].forEach((origen) => {
                    componentes[indice_destino].forEach((destino) => {
                        if (Math.random() < 0.2) matriz[origen][destino] = 1;
                    });
                });
            }
        }

        return matriz;
    }

    // Reordena una matriz según los índices de filas y columnas.
    function reordenar_matriz(matriz, orden_filas, orden_columnas) {
        return orden_filas.map((indice_fila) =>
            orden_columnas.map(
                (indice_columna) => matriz[indice_fila][indice_columna],
            ),
        );
    }

    // Completa un orden parcial con los índices que faltan.
    function crear_orden_parcial(orden, cantidad_ordenada) {
        const ordenados = orden.slice(0, cantidad_ordenada);
        const indices_ordenados = new Set(ordenados);
        const pendientes = Array.from({ length: orden.length }, (_, indice) =>
            indice,
        ).filter((indice) => !indices_ordenados.has(indice));

        return [...ordenados, ...pendientes];
    }

    // Ordena las filas por cantidad y patrón de valores alcanzables.
    function crear_orden_filas(matriz_caminos) {
        return matriz_caminos
            .map((fila, indice) => ({
                indice,
                cantidad_unos: fila.reduce(
                    (total, valor) => total + valor,
                    0,
                ),
                primer_uno: fila.indexOf(1),
                fila,
            }))
            .sort((fila_a, fila_b) => {
                const orden_por_cantidad =
                    fila_b.cantidad_unos - fila_a.cantidad_unos;
                if (orden_por_cantidad !== 0) return orden_por_cantidad;

                const orden_por_primer_uno =
                    fila_a.primer_uno - fila_b.primer_uno;
                if (orden_por_primer_uno !== 0) {
                    return orden_por_primer_uno;
                }

                for (
                    let columna = 0;
                    columna < fila_a.fila.length;
                    columna++
                ) {
                    const orden_por_patron =
                        fila_b.fila[columna] - fila_a.fila[columna];
                    if (orden_por_patron !== 0) return orden_por_patron;
                }

                return fila_a.indice - fila_b.indice;
            })
            .map((fila) => fila.indice);
    }

    // Agrupa los nodos que se alcanzan mutuamente.
    function detectar_componentes_fuertemente_conexas(matriz_caminos) {
        const pendientes = new Set(
            Array.from({ length: matriz_caminos.length }, (_, indice) => indice),
        );
        const componentes = [];

        // La alcanzabilidad mutua con un representante identifica cada grupo.
        while (pendientes.size > 0) {
            const origen = pendientes.values().next().value;
            const componente = [...pendientes].filter(
                (destino) =>
                    matriz_caminos[origen][destino] &&
                    matriz_caminos[destino][origen],
            );

            componente.forEach((nodo) => pendientes.delete(nodo));
            componentes.push(componente);
        }

        return componentes.sort(
            (componente_a, componente_b) =>
                componente_b.length - componente_a.length ||
                componente_a[0] - componente_b[0],
        );
    }

    // Conserva en cada componente el ciclo simple dirigido más largo.
    function crear_matriz_ciclos_maximos(matriz, componentes) {
        validar_matriz(matriz);
        if (!Array.isArray(componentes)) {
            throw new TypeError("Las componentes deben estar en una lista.");
        }

        const nodos_incluidos = new Set();
        componentes.forEach((componente) => {
            const nodos_componente = new Set();
            if (!Array.isArray(componente) || componente.length === 0) {
                throw new TypeError(
                    "Las componentes deben particionar los nodos de la matriz.",
                );
            }
            componente.forEach((nodo) => {
                if (
                    !Number.isInteger(nodo) ||
                    nodo < 0 ||
                    nodo >= matriz.length ||
                    nodos_incluidos.has(nodo) ||
                    nodos_componente.has(nodo)
                ) {
                    throw new TypeError(
                        "Las componentes deben particionar los nodos de la matriz.",
                    );
                }
                nodos_componente.add(nodo);
                nodos_incluidos.add(nodo);
            });
        });
        if (nodos_incluidos.size !== matriz.length) {
            throw new TypeError(
                "Las componentes deben incluir todos los nodos de la matriz.",
            );
        }

        const matriz_ciclos = Array.from({ length: matriz.length }, () =>
            Array(matriz.length).fill(0),
        );

        componentes.forEach((componente) => {
            const ciclo = encontrar_ciclo_simple_mas_largo(matriz, componente);
            ciclo.forEach((origen, indice) => {
                const destino = ciclo[(indice + 1) % ciclo.length];
                matriz_ciclos[origen][destino] = 1;
            });
        });

        return matriz_ciclos;
    }

    // Busca el ciclo simple más largo con programación dinámica por subconjuntos.
    function encontrar_ciclo_simple_mas_largo(matriz, componente) {
        if (!Array.isArray(componente)) {
            throw new TypeError("Cada componente debe ser una lista de nodos.");
        }

        const cantidad = componente.length;
        if (cantidad < 2) return [];

        let mejor_ciclo = [];
        let mejor_secuencia = [];
        const cantidad_mascaras = 1 << cantidad;

        // Compara rutas equivalentes para obtener un resultado determinista.
        const comparar_secuencias = (secuencia_a, secuencia_b) => {
            for (let indice = 0; indice < secuencia_a.length; indice++) {
                if (secuencia_a[indice] !== secuencia_b[indice]) {
                    return secuencia_a[indice] - secuencia_b[indice];
                }
            }
            return 0;
        };

        // Fijar el inicio evita evaluar varias rotaciones del mismo ciclo.
        for (let inicio = 0; inicio < cantidad; inicio++) {
            const estados = Array.from(
                { length: cantidad_mascaras },
                () => new Map(),
            );
            const mascara_inicial = 1 << inicio;
            estados[mascara_inicial].set(inicio, [inicio]);

            // Cada estado extiende una ruta simple y comprueba si cierra ciclo.
            for (
                let mascara = mascara_inicial;
                mascara < cantidad_mascaras;
                mascara++
            ) {
                estados[mascara].forEach((camino, ultimo) => {
                    if (
                        camino.length > 1 &&
                        matriz[componente[ultimo]][componente[inicio]]
                    ) {
                        const ciclo = camino.map(
                            (indice) => componente[indice],
                        );
                        if (
                            ciclo.length > mejor_ciclo.length ||
                            (ciclo.length === mejor_ciclo.length &&
                                comparar_secuencias(
                                    camino,
                                    mejor_secuencia,
                                ) < 0)
                        ) {
                            mejor_ciclo = ciclo;
                            mejor_secuencia = camino;
                        }
                    }

                    for (
                        let siguiente = inicio + 1;
                        siguiente < cantidad;
                        siguiente++
                    ) {
                        const siguiente_bit = 1 << siguiente;
                        if (mascara & siguiente_bit) continue;
                        if (
                            !matriz[componente[ultimo]][componente[siguiente]]
                        ) {
                            continue;
                        }

                        const nueva_mascara = mascara | siguiente_bit;
                        const nuevo_camino = [...camino, siguiente];
                        const camino_existente =
                            estados[nueva_mascara].get(siguiente);
                        if (
                            !camino_existente ||
                            comparar_secuencias(nuevo_camino, camino_existente) <
                                0
                        ) {
                            estados[nueva_mascara].set(
                                siguiente,
                                nuevo_camino,
                            );
                        }
                    }
                });
            }
        }

        return mejor_ciclo;
    }

    // Registra los pasos con una copia de la matriz en el estado actual.
    function crear_registrador_pasos(pasos, matriz_caminos, habilitado) {
        return (datos) => {
            if (!habilitado) return;

            pasos.push({
                ...datos,
                matriz:
                    datos.matriz ??
                    matriz_caminos.map((fila) => [...fila]),
            });
        };
    }

    // Reconstruye un camino usando el mapa de predecesores del recorrido.
    function reconstruir_camino(destino, origen, predecesores) {
        const camino = [destino];
        let anterior = destino;

        while (anterior !== origen) {
            anterior = predecesores.get(anterior);
            camino.unshift(anterior);
        }

        return camino;
    }

    // Calcula y registra los caminos alcanzables desde un nodo de origen.
    function registrar_caminos_desde_origen(
        matriz,
        matriz_caminos,
        origen,
        registrar_paso,
    ) {
        // Un DFS desde cada origen completa la matriz de alcanzabilidad.
        const visitados = new Set([origen]);
        const pendientes = [origen];
        const predecesores = new Map();

        // La pila ejecuta DFS y los predecesores permiten reconstruir rutas.
        while (pendientes.length > 0) {
            const actual = pendientes.pop();
            const destinos = matriz[actual]
                .map((hay_arista, destino) => (hay_arista ? destino : -1))
                .filter(
                    (destino) =>
                        destino !== -1 && !visitados.has(destino),
                )
                .reverse();

            destinos.forEach((destino) => {
                visitados.add(destino);
                predecesores.set(destino, actual);
                pendientes.push(destino);

                if (matriz_caminos[origen][destino] !== 0) return;

                matriz_caminos[origen][destino] = 1;
                const camino = reconstruir_camino(
                    destino,
                    origen,
                    predecesores,
                );

                registrar_paso({
                    fase: "alcance",
                    tipo: "camino",
                    nodo_actual: actual,
                    celda_actual: [origen, destino],
                    titulo: `Agregar camino ${origen + 1} → ${destino + 1}`,
                    camino: camino.map((nodo) => nodo + 1),
                    aristas_camino: camino.slice(1).map((nodo, indice) => [
                        camino[indice],
                        nodo,
                    ]),
                });
            });
        }
    }

    // Registra los cambios graduales al ordenar filas y columnas.
    function registrar_pasos_ordenamiento(
        matriz_caminos,
        orden,
        cantidad,
        registrar_paso,
    ) {
        const orden_original = Array.from(
            { length: cantidad },
            (_, indice) => indice,
        );

        for (
            let cantidad_ordenada = 1;
            cantidad_ordenada <= cantidad;
            cantidad_ordenada++
        ) {
            const orden_filas = crear_orden_parcial(
                orden,
                cantidad_ordenada,
            );

            registrar_paso({
                fase: "orden",
                tipo: "orden-fila",
                cantidad_ordenada,
                orden_filas,
                orden_columnas: orden_original,
                matriz: reordenar_matriz(
                    matriz_caminos,
                    orden_filas,
                    orden_original,
                ),
                titulo: `Ordenar fila ${cantidad_ordenada} de ${cantidad}`,
            });
        }

        for (
            let cantidad_ordenada = 1;
            cantidad_ordenada <= cantidad;
            cantidad_ordenada++
        ) {
            const orden_columnas = crear_orden_parcial(
                orden,
                cantidad_ordenada,
            );

            registrar_paso({
                fase: "orden",
                tipo: "orden-columna",
                cantidad_ordenada,
                orden_filas: orden,
                orden_columnas,
                matriz: reordenar_matriz(
                    matriz_caminos,
                    orden,
                    orden_columnas,
                ),
                titulo: `Colocar columna ${orden[cantidad_ordenada - 1] + 1} según el orden de las filas`,
            });
        }
    }

    // Registra cada componente a medida que se revela en la matriz.
    function registrar_pasos_componentes(
        matriz_caminos,
        orden,
        componentes,
        registrar_paso,
    ) {
        const matriz_ordenada = reordenar_matriz(
            matriz_caminos,
            orden,
            orden,
        );

        componentes.forEach((componente, indice_componente) => {
            registrar_paso({
                fase: "grupos",
                tipo: "componente",
                matriz: matriz_ordenada,
                orden_filas: orden,
                orden_columnas: orden,
                componentes_mostradas: indice_componente + 1,
                titulo: `Mostrar componente ${indice_componente + 1}`,
            });
        });
    }

    // Ordena los componentes según su posición en las filas reordenadas.
    function ordenar_componentes_por_filas(componentes, orden) {
        const posicion_nodo = new Map(
            orden.map((nodo, indice) => [nodo, indice]),
        );

        componentes.sort(
            (componente_a, componente_b) =>
                Math.min(
                    ...componente_a.map((nodo) => posicion_nodo.get(nodo)),
                ) -
                Math.min(
                    ...componente_b.map((nodo) => posicion_nodo.get(nodo)),
                ),
        );
    }

    // Calcula las componentes y prepara los pasos de la visualización.
    function calcular_datos_algoritmo(matriz, registrar_pasos = true) {
        validar_matriz(matriz);

        const cantidad = matriz.length;
        const pasos = [];
        const matriz_caminos = matriz.map((fila) => [...fila]);
        const registrar_paso = crear_registrador_pasos(
            pasos,
            matriz_caminos,
            registrar_pasos,
        );

        // Registra la matriz inicial antes de añadir la alcanzabilidad propia.
        registrar_paso({
            fase: "amistades",
            tipo: "amistades",
            titulo: "Matriz de adyacencia",
        });

        // La diagonal representa que cada nodo se alcanza a sí mismo.
        for (let nodo = 0; nodo < cantidad; nodo++) {
            matriz_caminos[nodo][nodo] = 1;
            registrar_paso({
                fase: "alcance",
                tipo: "diagonal",
                nodo_actual: nodo,
                titulo: `Agregar la diagonal del nodo ${nodo + 1}`,
            });
        }

        // Recorre el grafo desde cada origen para completar los caminos.
        for (let origen = 0; origen < cantidad; origen++) {
            registrar_caminos_desde_origen(
                matriz,
                matriz_caminos,
                origen,
                registrar_paso,
            );
        }

        registrar_paso({
            fase: "alcance",
            tipo: "caminos-completos",
            titulo: "Matriz de caminos completa",
        });

        // Agrupa por alcanzabilidad mutua y calcula el orden de presentación.
        const componentes = detectar_componentes_fuertemente_conexas(
            matriz_caminos,
        );
        const orden = crear_orden_filas(matriz_caminos);
        ordenar_componentes_por_filas(componentes, orden);

        // Estos pasos explican el orden y las SCC ya calculadas.
        if (registrar_pasos) {
            registrar_pasos_ordenamiento(
                matriz_caminos,
                orden,
                cantidad,
                registrar_paso,
            );
            registrar_pasos_componentes(
                matriz_caminos,
                orden,
                componentes,
                registrar_paso,
            );
        }

        return { componentes, pasos };
    }

    // Valida dimensiones, valores y ausencia de lazos en la matriz.
    function validar_matriz(matriz) {
        validar_cantidad(Array.isArray(matriz) ? matriz.length : NaN);
        const cantidad = matriz.length;

        matriz.forEach((fila, indice_fila) => {
            if (
                !Array.isArray(fila) ||
                fila.length !== cantidad ||
                fila.some((valor) => valor !== 0 && valor !== 1) ||
                fila[indice_fila] !== 0
            ) {
                throw new TypeError(
                    "La matriz debe ser cuadrada, contener solo 0 y 1, y no incluir lazos.",
                );
            }
        });
    }

    // Asigna el color de su componente a cada nodo.
    function crear_mapa_colores_componentes(componentes, cantidad_nodos) {
        const mapa_colores = new Array(cantidad_nodos).fill(null);
        componentes.forEach((componente, indice_comunidad) => {
            const color = obtener_color_componente(indice_comunidad);
            componente.forEach((indice_nodo) => {
                mapa_colores[indice_nodo] = color;
            });
        });
        return mapa_colores;
    }

    // Obtiene el color estable correspondiente al índice de componente.
    function obtener_color_componente(indice) {
        return colores_componentes[indice % colores_componentes.length];
    }

    // Convierte el matiz de una componente en un color hexadecimal.
    function generar_color_componente(indice) {
        const matiz = (indice * 137.508) % 360;
        const saturacion = 0.66 + (indice % 3) * 0.06;
        const luminosidad = 0.46 + (Math.floor(indice / 3) % 3) * 0.045;
        const croma = (1 - Math.abs(2 * luminosidad - 1)) * saturacion;
        const secundario = croma * (1 - Math.abs(((matiz / 60) % 2) - 1));
        const ajuste = luminosidad - croma / 2;
        const [rojo, verde, azul] =
            matiz < 60
                ? [croma, secundario, 0]
                : matiz < 120
                  ? [secundario, croma, 0]
                  : matiz < 180
                    ? [0, croma, secundario]
                    : matiz < 240
                      ? [0, secundario, croma]
                      : matiz < 300
                        ? [secundario, 0, croma]
                        : [croma, 0, secundario];
        return `#${[rojo, verde, azul]
            .map((valor) =>
                Math.round((valor + ajuste) * 255)
                    .toString(16)
                    .padStart(2, "0"),
            )
            .join("")}`;
    }

    window.CoonectowskiGraph = Object.freeze({
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
    });
})();
