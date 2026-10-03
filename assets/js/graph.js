/* Lógica pura para matrices, comunidades y colores de la red */
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
    const CANTIDAD_MAXIMA_USUARIOS = 100;
    const colores_componentes = Array.from(
        { length: CANTIDAD_MAXIMA_USUARIOS },
        (_, indice) => generar_color_componente(indice),
    );
    const color_nodo_neutro = "#D8F1FA";
    const color_arista_neutra = "#3A4A66";

    function crear_matriz_vacia(cantidad) {
        return Array.from({ length: cantidad }, () =>
            Array(cantidad).fill(0),
        );
    }

    function obtener_nombres_red(cantidad) {
        return Array.from({ length: cantidad }, (_, indice) =>
            indice < nombres_disponibles.length
                ? nombres_disponibles[indice]
                : `Persona ${indice + 1}`,
        );
    }

    function crear_tamanos_grupos(cantidad) {
        const tamano_maximo = Math.min(30, cantidad);
        const cantidad_minima_grupos = Math.ceil(cantidad / tamano_maximo);
        const cantidad_maxima_grupos = Math.floor(cantidad / 2);
        const cantidad_grupos =
            cantidad_minima_grupos +
            Math.floor(
                Math.random() *
                    (cantidad_maxima_grupos - cantidad_minima_grupos + 1),
            );
        const tamanos = Array(cantidad_grupos).fill(2);
        let personas_restantes = cantidad - cantidad_grupos * 2;

        while (personas_restantes > 0) {
            const grupos_disponibles = tamanos
                .map((tamano, indice) =>
                    tamano < tamano_maximo ? indice : -1,
                )
                .filter((indice) => indice >= 0);
            const indice_grupo =
                grupos_disponibles[
                    Math.floor(Math.random() * grupos_disponibles.length)
                ];
            tamanos[indice_grupo]++;
            personas_restantes--;
        }

        return tamanos;
    }

    function generar_matriz_aleatoria(cantidad) {
        const matriz = crear_matriz_vacia(cantidad);
        const tamanos_grupos = crear_tamanos_grupos(cantidad);
        const personas = Array.from(
            { length: cantidad },
            (_, indice) => indice,
        );
        for (let indice = personas.length - 1; indice > 0; indice--) {
            const otro_indice = Math.floor(Math.random() * (indice + 1));
            [personas[indice], personas[otro_indice]] = [
                personas[otro_indice],
                personas[indice],
            ];
        }

        let inicio_grupo = 0;
        tamanos_grupos.forEach((tamano_grupo) => {
            const grupo = personas.slice(
                inicio_grupo,
                inicio_grupo + tamano_grupo,
            );
            inicio_grupo += tamano_grupo;

            const probabilidad_conexion_adicional =
                0.02 + Math.random() * 0.14;
            const orden_grupo = [...grupo];
            for (
                let indice = orden_grupo.length - 1;
                indice > 0;
                indice--
            ) {
                const otro_indice = Math.floor(
                    Math.random() * (indice + 1),
                );
                [orden_grupo[indice], orden_grupo[otro_indice]] = [
                    orden_grupo[otro_indice],
                    orden_grupo[indice],
                ];
            }

            for (let indice = 0; indice < grupo.length; indice++) {
                const origen = orden_grupo[indice];
                const destino =
                    orden_grupo[(indice + 1) % grupo.length];
                matriz[origen][destino] = 1;
            }

            for (const origen of grupo) {
                for (const destino of grupo) {
                    if (
                        origen === destino ||
                        matriz[origen][destino] ||
                        Math.random() >= probabilidad_conexion_adicional
                    ) {
                        continue;
                    }
                    matriz[origen][destino] = 1;
                }
            }
        });

        return matriz;
    }

    function agregar_diagonal(matriz) {
        return matriz.map((fila, indice) =>
            fila.map((valor, columna) => (indice === columna ? 1 : valor)),
        );
    }

    function calcular_clausura_transitiva(matriz) {
        const matriz_caminos = matriz.map((fila) => [...fila]);
        const cantidad = matriz_caminos.length;

        for (let intermedio = 0; intermedio < cantidad; intermedio++) {
            for (let origen = 0; origen < cantidad; origen++) {
                if (!matriz_caminos[origen][intermedio]) continue;

                for (let destino = 0; destino < cantidad; destino++) {
                    if (matriz_caminos[intermedio][destino]) {
                        matriz_caminos[origen][destino] = 1;
                    }
                }
            }
        }

        return matriz_caminos;
    }

    function reordenar_matriz(matriz, orden) {
        return orden.map((indice_fila) =>
            orden.map((indice_columna) => matriz[indice_fila][indice_columna]),
        );
    }

    function reordenar_solo_filas(matriz, orden) {
        return orden.map((indice) => [...matriz[indice]]);
    }

    function detectar_componentes_fuertemente_conexas(matriz_caminos) {
        const sin_agrupar = new Set(
            Array.from({ length: matriz_caminos.length }, (_, indice) => indice),
        );
        const componentes = [];

        while (sin_agrupar.size > 0) {
            const origen = sin_agrupar.values().next().value;
            const componente = [...sin_agrupar].filter(
                (destino) =>
                    matriz_caminos[origen][destino] &&
                    matriz_caminos[destino][origen],
            );
            componente.forEach((indice) => sin_agrupar.delete(indice));
            componentes.push(componente);
        }

        return componentes.sort(
            (componente_a, componente_b) =>
                componente_b.length - componente_a.length ||
                componente_a[0] - componente_b[0],
        );
    }

    function calcular_datos_algoritmo(matriz) {
        const matriz_entrada_caminos = agregar_diagonal(matriz);
        const matriz_caminos = calcular_clausura_transitiva(
            matriz_entrada_caminos,
        );
        const componentes = detectar_componentes_fuertemente_conexas(
            matriz_caminos,
        );
        const orden = componentes.flat();
        const filas_ordenadas = reordenar_solo_filas(matriz_caminos, orden);
        const matriz_reordenada = reordenar_matriz(matriz_caminos, orden);

        return {
            matriz_entrada_caminos,
            matriz_caminos,
            orden,
            filas_ordenadas,
            matriz_reordenada,
            componentes,
        };
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
