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
el orden de las filas, y los bloques diagonales de unos muestran los grupos.

En las visualizaciones, una pareja de aristas opuestas se dibuja como una
sola conexión con flechas en ambos extremos. Las conexiones entre componentes
se ocultan al presentar los grupos, para que cada componente se aprecie por
separado.

## Estructura

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

`index.html` se mantiene en la raíz para que GitHub Pages pueda servir la
aplicación directamente. Las dependencias visuales se cargan desde CDN.

## Página web

La aplicación está publicada en GitHub Pages y puedes probarla directamente
desde tu navegador. Haz clic en el logo para abrirla:

<p align="center">
  <a href="https://myst3r112.github.io/Proyecto-Matematica-Computacional/" title="Abrir Coonectowski">
    <img src="./assets/img/Logo_web.png" alt="Abrir la aplicación Coonectowski" width="120">
  </a>
</p>