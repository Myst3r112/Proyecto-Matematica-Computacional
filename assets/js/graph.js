/* Cálculo de componentes fuertemente conexas y colores de la red */
(() => {
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
    const CANTIDAD_MINIMA_USUARIOS = 4;
    const CANTIDAD_MAXIMA_USUARIOS = 12;
    const colores_componentes = Array.from(
        { length: CANTIDAD_MAXIMA_USUARIOS },
        (_, indice) => generar_color_componente(indice),
    );
    const color_nodo_neutro = "#D8F1FA";
    const color_arista_neutra = "#3A4A66";

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

    function crear_matriz_vacia(cantidad) {
        validar_cantidad(cantidad);
        return Array.from({ length: cantidad }, () =>
            Array(cantidad).fill(0),
        );
    }

    function obtener_nombres_red(cantidad) {
        validar_cantidad(cantidad);
        return Array.from({ length: cantidad }, (_, indice) =>
            indice < nombres_disponibles.length
                ? nombres_disponibles[indice]
                : `Persona ${indice + 1}`,
        );
    }

    function generar_matriz_aleatoria(cantidad) {
        validar_cantidad(cantidad);
        const matriz = crear_matriz_vacia(cantidad);
        const probabilidad_arista = 0.12 + Math.random() * 0.28;

        for (let origen = 0; origen < cantidad; origen++) {
            for (let destino = 0; destino < cantidad; destino++) {
                if (
                    origen !== destino &&
                    Math.random() < probabilidad_arista
                ) {
                    matriz[origen][destino] = 1;
                }
            }
        }

        for (let nodo = 0; nodo < cantidad; nodo++) {
            const tiene_arista_entrante = matriz.some(
                (fila) => fila[nodo] === 1,
            );
            const tiene_arista_saliente = matriz[nodo].some(
                (valor) => valor === 1,
            );
            if (tiene_arista_entrante || tiene_arista_saliente) continue;

            const otro_nodo = (nodo + 1) % cantidad;
            if (Math.random() < 0.5) {
                matriz[nodo][otro_nodo] = 1;
            } else {
                matriz[otro_nodo][nodo] = 1;
            }
        }

        return matriz;
    }

    function reordenar_matriz(matriz, orden_filas, orden_columnas) {
        return orden_filas.map((indice_fila) =>
            orden_columnas.map(
                (indice_columna) => matriz[indice_fila][indice_columna],
            ),
        );
    }

    function crear_orden_parcial(orden, cantidad_ordenada) {
        const ordenados = orden.slice(0, cantidad_ordenada);
        const pendientes = Array.from({ length: orden.length }, (_, indice) =>
            indice,
        ).filter((indice) => !ordenados.includes(indice));

        return [...ordenados, ...pendientes];
    }

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

    function detectar_componentes_fuertemente_conexas(matriz_caminos) {
        const pendientes = new Set(
            Array.from({ length: matriz_caminos.length }, (_, indice) => indice),
        );
        const componentes = [];

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

    function calcular_datos_algoritmo(matriz, registrar_pasos = true) {
        validar_matriz(matriz);
        const cantidad = matriz.length;
        const pasos = [];
        const matriz_caminos = matriz.map((fila) => [...fila]);

        function registrar_paso(datos) {
            if (!registrar_pasos) return;

            pasos.push({
                matriz: matriz_caminos.map((fila) => [...fila]),
                ...datos,
            });
        }

        registrar_paso({
            fase: "amistades",
            tipo: "amistades",
            titulo: "Matriz de adyacencia",
        });

        for (let nodo = 0; nodo < cantidad; nodo++) {
            matriz_caminos[nodo][nodo] = 1;
            registrar_paso({
                fase: "alcance",
                tipo: "diagonal",
                nodo_actual: nodo,
                titulo: `Agregar la diagonal del nodo ${nodo + 1}`,
            });
        }

        for (let origen = 0; origen < cantidad; origen++) {
            const visitados = new Set([origen]);
            const pendientes = [origen];
            const predecesores = new Map();

            while (pendientes.length > 0) {
                const actual = pendientes.pop();
                const destinos = matriz[actual]
                    .map((hay_arista, destino) =>
                        hay_arista ? destino : -1,
                    )
                    .filter(
                        (destino) =>
                            destino !== -1 && !visitados.has(destino),
                    )
                    .reverse();

                destinos.forEach((destino) => {
                    visitados.add(destino);
                    predecesores.set(destino, actual);
                    pendientes.push(destino);

                    let cambio_matriz = false;
                    if (matriz_caminos[origen][destino] === 0) {
                        matriz_caminos[origen][destino] = 1;
                        cambio_matriz = true;
                    }

                    if (!cambio_matriz) return;

                    const camino = [destino];
                    let anterior = destino;
                    while (anterior !== origen) {
                        anterior = predecesores.get(anterior);
                        camino.unshift(anterior);
                    }

                    registrar_paso({
                        fase: "alcance",
                        tipo: "camino",
                        nodo_actual: actual,
                        arista_actual: [actual, destino],
                        celda_actual: [origen, destino],
                        titulo: `Agregar camino ${origen + 1} → ${destino + 1}`,
                        camino: camino.map((nodo) => nodo + 1),
                    });
                });
            }
        }

        registrar_paso({
            fase: "alcance",
            tipo: "caminos-completos",
            titulo: "Matriz de caminos completa",
        });

        const componentes = detectar_componentes_fuertemente_conexas(
            matriz_caminos,
        );
        const orden = crear_orden_filas(matriz_caminos);
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

        const matriz_ordenada = reordenar_matriz(
            matriz_caminos,
            orden,
            orden,
        );
        if (registrar_pasos) {
            componentes.forEach((componente, indice_componente) => {
                pasos.push({
                    fase: "grupos",
                    tipo: "componente",
                    matriz: matriz_ordenada.map((fila) => [...fila]),
                    orden_filas: orden,
                    orden_columnas: orden,
                    componentes_mostradas: indice_componente + 1,
                    titulo: `Mostrar componente ${indice_componente + 1}`,
                });
            });
        }

        return {
            componentes,
            matriz_caminos,
            pasos,
        };
    }

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

    function obtener_color_componente(indice) {
        return colores_componentes[indice % colores_componentes.length];
    }

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
        crear_mapa_colores_componentes,
        obtener_color_componente,
    });
})();
