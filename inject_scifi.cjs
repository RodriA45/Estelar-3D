const fs = require('fs');
const path = './src/data/celestialData.js';
let content = fs.readFileSync(path, 'utf8');

const newBodies = `
  {
    "id": "pulsar",
    "name": "Púlsar PSR B1919+21",
    "type": "Estrella de Neutrones",
    "distance": "2283 Años Luz",
    "mass": "1.4 M☉",
    "description": "El remanente increíblemente denso de una estrella masiva colapsada. Gira a velocidades extremas emitiendo haces de radiación por sus polos magnéticos.",
    "funFact": "\\"Su densidad es tal que una cucharadita de su materia pesaría tanto como el monte Everest.\\"",
    "color": "#ffffff",
    "size": 1.5,
    "position": [450000, 200000, -850000],
    "emissiveIntensity": 10.0,
    "isFictional": true,
    "hasAtmosphere": false
  },
  {
    "id": "binary-a",
    "name": "Tatoo I",
    "type": "Sistema Binario (Enana Amarilla)",
    "distance": "Borde Exterior",
    "mass": "1.0 M☉",
    "description": "La estrella primaria del sistema binario de Tatooine.",
    "funFact": "\\"Junto con Tatoo II, iluminan los interminables mares de dunas del planeta desértico.\\"",
    "color": "#ffd866",
    "size": 100,
    "position": [-950000, 45000, 320000],
    "emissiveIntensity": 1.8,
    "isFictional": true
  },
  {
    "id": "binary-b",
    "name": "Tatoo II",
    "type": "Sistema Binario (Enana Naranja)",
    "distance": "Borde Exterior",
    "mass": "0.7 M☉",
    "description": "La compañera más pequeña y rojiza del sistema de Tatooine.",
    "color": "#ff7744",
    "size": 70,
    "position": [-950300, 45050, 320000],
    "emissiveIntensity": 1.5,
    "isFictional": true,
    "parent": "binary-a"
  },
  {
    "id": "tatooine",
    "name": "Tatooine",
    "type": "Planeta Desértico",
    "distance": "Borde Exterior",
    "mass": "1.0 M⊕",
    "description": "Un mundo árido y desolado iluminado por dos soles. Famoso por sus granjas de humedad y por ser el hogar de legendarios caballeros Jedi.",
    "funFact": "\\"Si hay un centro brillante en el universo, estás en el planeta que está más lejos de él.\\" - Luke Skywalker",
    "color": "#e0b080",
    "size": 3,
    "position": [-949000, 45000, 320000],
    "isFictional": true,
    "hasAtmosphere": true,
    "parent": "binary-a"
  },
  {
    "id": "miller",
    "name": "Planeta de Miller",
    "type": "Planeta Oceánico",
    "distance": "Otra Galaxia",
    "mass": "1.3 M⊕",
    "description": "Un mundo completamente cubierto por un océano infinito de poca profundidad. Debido a la inmensa gravedad de Gargantúa, se forman olas del tamaño de montañas.",
    "funFact": "\\"Una hora aquí son siete años en la Tierra.\\"",
    "color": "#225577",
    "size": 4,
    "position": [0, -300, -1005000], 
    "isFictional": true,
    "hasAtmosphere": true,
    "parent": "gargantua"
  },
  {
    "id": "arrakis",
    "name": "Arrakis",
    "type": "Planeta Desértico (Duna)",
    "distance": "Canopus (Sistema)",
    "mass": "1.2 M⊕",
    "description": "Un mundo implacable de arena, rocas y gusanos gigantes. Es la única fuente conocida de la especia Melange, la sustancia más valiosa del universo.",
    "funFact": "\\"Quien controla la especia, controla el universo.\\"",
    "color": "#c26d36",
    "size": 3.8,
    "position": [250000, -80000, 750000],
    "isFictional": true,
    "hasAtmosphere": true
  },
  {
    "id": "dyson-sphere",
    "name": "Esfera de Dyson (Alpha)",
    "type": "Megaestructura Estelar",
    "distance": "12,000 Años Luz",
    "mass": "Desconocida (Artificial)",
    "description": "Una colosal megaestructura alienígena construida alrededor de una estrella para capturar el 100% de su energía. Su enjambre de paneles solares oscurece la estrella central.",
    "funFact": "\\"Teóricamente, una civilización Tipo II en la Escala de Kardashev sería capaz de construir esto.\\"",
    "color": "#334455",
    "size": 300,
    "position": [550000, -300000, -250000],
    "isFictional": true,
    "hasAtmosphere": false
  },
  {
    "id": "ringworld",
    "name": "Instalación 04 (Halo)",
    "type": "Megaestructura de Anillo",
    "distance": "Brazo de Orión",
    "mass": "Artificial",
    "description": "Un ecosistema artificial gigante en forma de anillo habitable en su cara interna, rotando para simular gravedad.",
    "funFact": "\\"Su diámetro es de 10,000 kilómetros. Posee atmósfera, océanos y una biósfera completa en su interior.\\"",
    "color": "#667766",
    "size": 150,
    "position": [-550000, 300000, 250000],
    "isFictional": true,
    "hasAtmosphere": false
  },`;

const insertionIndex = content.lastIndexOf('];');
content = content.substring(0, insertionIndex) + newBodies + '\\n' + content.substring(insertionIndex);

fs.writeFileSync(path, content);
console.log("New bodies injected!");
