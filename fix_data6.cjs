const fs = require('fs');
const path = './src/data/celestialData.js';
let content = fs.readFileSync(path, 'utf8');

const missingFunc = `
export const generateBackgroundStars = (count = 10000, radius = 5000) => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Generate points on a sphere using spherical coordinates
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    
    // Add some random variation to radius for depth
    const r = radius + (Math.random() - 0.5) * (radius * 0.5);
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
};
`;

fs.writeFileSync(path, content + '\\n' + missingFunc);
