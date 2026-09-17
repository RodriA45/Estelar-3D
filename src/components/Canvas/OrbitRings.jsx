import { Line } from '@react-three/drei';
import * as THREE from 'three';

export default function OrbitRings({ celestialBodies }) {
  // Filter only solar system planets (those with "Planeta" or "Gigante" in their type and very close distance)
  const planets = celestialBodies.filter(body => 
    (body.type.includes('Planeta') || body.type.includes('Gigante')) && 
    body.position[0] <= 100 // Include all solar system planets
  );

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {planets.map((planet) => {
        // Calculate distance from origin (Sun)
        const radius = Math.sqrt(
          planet.position[0]**2 + 
          planet.position[1]**2 + 
          planet.position[2]**2
        );

        if (radius === 0) return null;

        // Generate points for the circle
        const points = [];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
        }

        return (
          <Line
            key={`orbit-${planet.id}`}
            points={points}
            color="#ffffff"
            lineWidth={0.5}
            transparent
            opacity={0.15}
          />
        );
      })}
    </group>
  );
}
