const fs = require('fs');
const path = './src/data/celestialData.js';
let content = fs.readFileSync(path, 'utf8');

const facts = {
  'sun': '\"El Sol concentra el 99.86% de toda la masa del sistema solar.\"',
  'earth': '\"Mira ese punto. Eso es aquí. Eso es nuestro hogar. Eso somos nosotros.\" - Carl Sagan',
  'jupiter': '\"Su Gran Mancha Roja es una tormenta que lleva activa cientos de años y es más grande que toda la Tierra.\"',
  'gargantua': '\"El amor es la única cosa que podemos percibir que trasciende las dimensiones del tiempo y el espacio.\" - Interstellar',
  'mars': '\"Marte es el único planeta que conocemos habitado enteramente por robots.\"',
  'moon': '\"Las huellas dejadas por los astronautas del Apolo permanecerán allí durante millones de años.\"',
  'saturn': '\"Sus anillos están hechos de trozos de hielo y roca; algunos del tamaño de un grano de arena, otros como montañas.\"',
  'venus': '\"Su atmósfera es tan densa que aplastaría un submarino, y llueve ácido sulfúrico.\"',
  'wormhole': '\"Un atajo a través del espacio-tiempo, curvando el tejido del universo como un papel.\"',
  'pluto': '\"Tarda 248 años en dar una vuelta al Sol; desde su descubrimiento hasta su reclasificación, no completó ni una órbita.\"'
};

for (const [id, fact] of Object.entries(facts)) {
  const regex = new RegExp('(\"id\": \"' + id + '\"[\\s\\S]*?\"description\": \"[^\"]+\",)');
  content = content.replace(regex, '$1\n    \"funFact\": ' + fact + ',');
}

fs.writeFileSync(path, content);
console.log("Facts injected!");
