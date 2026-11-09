# Coonectowski

Aplicación web para crear grafos dirigidos de 4 a 12 nodos y explorar, paso a
paso, sus componentes fuertemente conexas mediante matrices de adyacencia y
caminos.

## Análisis del grafo   

El análisis agrega la diagonal a la matriz de adyacencia y obtiene la matriz de
caminos mediante recorridos en profundidad desde cada nodo. Dos nodos
pertenecen a la misma componente fuertemente conexa cuando existe un camino
dirigido de ida y vuelta entre ellos. Para ordenar la matriz de caminos, las
filas se acomodan por cantidad de unos de mayor a menor; en caso de empate,
se prioriza la fila cuyo primer 1 esté más cerca de la primera columna. Si aún
hay empate, se comparan los patrones de las filas para mantener juntas las
filas iguales de una componente. Después, las columnas se acomodan siguiendo
exactamente el mismo orden de las filas; no se ordenan por su propio conteo de
unos. Los bloques diagonales de unos muestran los grupos.

Durante la fase de alcance, los tramos de la matriz comparten colores con las
aristas del grafo: verde para el inicio, azul para los tramos desde nodos
intermedios y naranja para la nueva relación de alcanzabilidad y su destino.

En las visualizaciones, una pareja de aristas opuestas se dibuja como una
sola conexión con flechas en ambos extremos. Las conexiones entre componentes
se ocultan al presentar los grupos, para que cada componente se aprecie por
separado. En el resumen y en la última etapa se muestra un ciclo simple
dirigido que recorre todos los nodos de cada componente no trivial, usando
únicamente aristas originales. Así, cada nodo del ciclo tiene una entrada y
una salida. Las componentes unitarias aisladas se muestran sin aristas.

Las redes aleatorias se construyen con componentes no triviales que contienen
un ciclo dirigido por todos sus nodos; las conexiones entre componentes solo
avanzan en un sentido para conservar la partición. En el modo manual, cada
nodo debe tener al menos una conexión entrante o saliente. Antes de analizar,
se verifica que cada componente de varios nodos tenga un ciclo que recorra a
todos sus integrantes usando aristas originales; si no existe, se indican los
grupos que deben ajustarse. En los resultados, un panel
desplegable permite consultar el grafo original completo junto a una vista
por etapas: matriz de adyacencia, matriz de caminos, matriz ordenada y
componentes detectadas.

## Estructura del Directorio

```text
.
├── assets/
│   ├── css/styles.css
│   ├── img/                 # Logotipos e icono
│   └── js/
│       ├── app.js           # Interfaz, vistas e interacciones
│       └── graph.js         # Operaciones matemáticas, independiente del DOM
├── docs/Proyectos.pdf
└── index.html
```

## Página web

La aplicación está publicada en GitHub Pages y puedes probarla directamente
desde tu navegador. Haz clic en el logo para abrirla:

<p align="center">
  <a href="https://myst3r112.github.io/Proyecto-Matematica-Computacional/" title="Abrir Coonectowski">
    <img src="./assets/img/Logo_web.png" alt="Abrir la aplicación Coonectowski" width="120">
  </a>
</p>