<div align="center">
  <h1>🌌 Estelar 3D</h1>
  <p><strong>Un simulador interactivo del universo en el navegador web</strong></p>
  
  [![React](https://img.shields.io/badge/React-19.2.8-blue?logo=react&logoColor=white)](https://reactjs.org/)
  [![Three.js](https://img.shields.io/badge/Three.js-0.186.0-black?logo=three.js&logoColor=white)](https://threejs.org/)
  [![React Three Fiber](https://img.shields.io/badge/R3F-9.7.0-indigo)](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
  [![Vite](https://img.shields.io/badge/Vite-8.3.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  
  <p>Explora el sistema solar con texturas 4K reales, admira sistemas estelares binarios, visita planetas de ciencia ficción renderizados con GLSL y contempla la deformación de la luz en el horizonte de sucesos de un agujero negro supermasivo.</p>
</div>

---

## 🚀 Características Principales

*   🌍 **Planetas Fotorrealistas:** Texturas de la NASA en alta resolución mapeadas esféricamente para nuestro Sistema Solar (Tierra, Marte, Júpiter, etc.).
*   ✨ **Sistemas Estelares Dinámicos:** Estrellas de secuencia principal, enanas rojas y supergigantes (como Próxima Centauri o Betelgeuse) con efectos volumétricos de plasma y lente (Bloom pass HDR).
*   🕳️ **Agujeros Negros (Gargantúa):** Implementación compleja en GLSL para simular la dilatación gravitacional (*Gravitational Lensing*) y un disco de acreción dinámico alrededor de una singularidad.
*   🪐 **Planetas de Ciencia Ficción:** Cuerpos celestes renderizados enteramente mediante matemáticas y shaders procedurales:
    *   **Planeta de Miller:** Océanos infinitos y olas monstruosas.
    *   **Púlsares:** Estrellas de neutrones de rotación ultra-rápida.
*   🛰️ **Mecánicas Orbitales & Profundidad Logarítmica:** Escala universal. Permite alejar la cámara a distancias interestelares sin artefactos de renderizado (Z-fighting) gracias a un `logarithmicDepthBuffer` inyectado manualmente en todos los shaders.
*   💨 **Warp Effect:** Efectos visuales de salto hiperespacial impulsados por la GPU para viajar fluidamente entre sistemas solares.

---

## 🛠️ Tecnologías Utilizadas

*   **[React 19](https://react.dev/)**: Arquitectura de la interfaz de usuario.
*   **[Three.js](https://threejs.org/)**: Motor 3D subyacente y manejo matemático.
*   **[React Three Fiber (@react-three/fiber)](https://docs.pmnd.rs/react-three-fiber/)**: Reconciliador de React para Three.js, permitiendo usar componentes declarativos.
*   **[Drei (@react-three/drei)](https://github.com/pmndrs/drei)**: Abstracciones útiles (OrbitControls, Texturas, Modelos).
*   **[GLSL (Shaders)](https://thebookofshaders.com/)**: Programación directa a la tarjeta gráfica para nubes, agua de Miller, y agujeros negros.
*   **[Vite](https://vitejs.dev/)**: Empaquetador extremadamente rápido.
*   **[TailwindCSS v4](https://tailwindcss.com/)**: Estilos modernos para la interfaz overlay.

---

## ⚙️ Instalación y Uso Local

Sigue estos pasos para correr el simulador en tu máquina local:

1.  **Clona este repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/estelar.git
    cd estelar
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Inicia el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

4.  **Abre en tu navegador:**
    Navega a `http://localhost:5173` (o la ruta que indique Vite en la consola).

---

## 📸 Screenshots & Galería

*(💡 Reemplaza estos links con imágenes de tu carpeta `/public/` o de Imgur)*

*   **Tierra Fotorealista:** `![Earth](link-a-tu-imagen)`
*   **Estrella Binaria (Próxima Centauri):** `![Binary Star](link-a-tu-imagen)`
*   **Agujero Negro:** `![Black Hole](link-a-tu-imagen)`

---

## 🧠 Desafíos Técnicos Superados

### Logarithmic Depth Buffer en Custom Shaders
Al construir simulaciones a escala espacial, la distancia entre objetos puede ir desde $10^{-1}$ hasta $10^9$ unidades. Esto causa el conocido "Z-fighting" (parpadeo de texturas superpuestas). La solución nativa es activar `logarithmicDepthBuffer: true` en Three.js. Sin embargo, al incorporar `ShaderMaterial`s personalizados para el agujero negro o las anomalías, estos no sabían procesar esta información, lo cual causaba la invisibilidad de objetos. Este repositorio inyecta manualmente los recortes matemáticos `<logdepthbuf_pars_vertex>` y `<logdepthbuf_fragment>` directamente en el pipeline de renderizado personalizado (GLSL) resolviendo el problema.

### Bloom HDR Selectivo
El Post-Processing (efecto Bloom) quemaba ciertos colores (como las enanas rojas), convirtiéndolos en blanco puro. Se recalculó la emisividad dentro de los `FragmentShaders` evaluando el canal de color máximo (`maxColor = max(r, max(g, b))`) en lugar de la luminancia base, manteniendo intacto el tinte natural de los cuerpos térmicos mientras se permite el efecto de resplandor.

---

## 🤝 Contribuir

¡Las contribuciones, los *issues* y los *feature requests* son súper bienvenidos! 
1. Haz un Fork del proyecto
2. Crea tu Feature Branch (`git checkout -b feature/NuevoPlaneta`)
3. Haz Commit de tus cambios (`git commit -m 'Añadir nuevo shader atmosférico'`)
4. Haz Push al Branch (`git push origin feature/NuevoPlaneta`)
5. Abre un Pull Request

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información.

<div align="center">
  <p>🌌 <i>"Mira ese punto. Eso es aquí. Eso es nuestro hogar. Eso somos nosotros."</i> - Carl Sagan 🌌</p>
</div>
