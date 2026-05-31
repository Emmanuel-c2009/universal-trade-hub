import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Text } from '@react-three/drei';
import * as THREE from 'three';

const FloatingCurrency = ({ position, symbol, color }: { position: [number, number, number]; symbol: string; color: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.3;
      groupRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Text
        fontSize={0.5}
        color={color}
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter.woff"
      >
        {symbol}
      </Text>
    </group>
  );
};

const DataStream = ({ startPos, endPos }: { startPos: [number, number, number]; endPos: [number, number, number] }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 20;
  
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount;
    positions[i * 3] = startPos[0] + (endPos[0] - startPos[0]) * t;
    positions[i * 3 + 1] = startPos[1] + (endPos[1] - startPos[1]) * t;
    positions[i * 3 + 2] = startPos[2] + (endPos[2] - startPos[2]) * t;
  }

  useFrame((state) => {
    if (particlesRef.current) {
      const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const offset = (state.clock.elapsedTime * 2 + i * 0.1) % 1;
        posArray[i * 3] = startPos[0] + (endPos[0] - startPos[0]) * offset;
        posArray[i * 3 + 1] = startPos[1] + (endPos[1] - startPos[1]) * offset + Math.sin(offset * Math.PI) * 0.2;
        posArray[i * 3 + 2] = startPos[2] + (endPos[2] - startPos[2]) * offset;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#FFD700" size={0.05} transparent opacity={0.8} />
    </points>
  );
};

const Globe = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += 0.005;
      wireframeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[1.5, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#0F1A3C" transparent opacity={0.3} />
      </Sphere>
      <Sphere ref={wireframeRef} args={[1.52, 32, 32]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#00A8FF" wireframe transparent opacity={0.5} />
      </Sphere>
    </group>
  );
};

const ChartBars = () => {
  const groupRef = useRef<THREE.Group>(null);
  const bars = [0.5, 0.8, 0.6, 1.2, 0.9, 1.4, 1.1, 0.7];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        mesh.scale.y = bars[i] * (0.8 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.2);
      });
    }
  });

  return (
    <group ref={groupRef} position={[2.5, -0.5, 0]}>
      {bars.map((height, i) => (
        <Box
          key={i}
          args={[0.15, height, 0.15]}
          position={[i * 0.25 - 1, height / 2, 0]}
        >
          <meshStandardMaterial color={i % 2 === 0 ? "#10B981" : "#FFD700"} />
        </Box>
      ))}
    </group>
  );
};

const AIBotLoader = () => {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      <div className="w-full h-[60vh] max-w-4xl">
        <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} color="#FFD700" intensity={0.5} />
          
          <Globe />
          <ChartBars />
          
          {/* Data streams */}
          <DataStream startPos={[-3, 2, 0]} endPos={[0, 0, 0]} />
          <DataStream startPos={[3, 2, 0]} endPos={[0, 0, 0]} />
          <DataStream startPos={[0, -2, 2]} endPos={[0, 0, 0]} />
          
          {/* Floating currency symbols */}
          <FloatingCurrency position={[-2.5, 1.5, 1]} symbol="€" color="#FFD700" />
          <FloatingCurrency position={[2.5, 1, 1]} symbol="$" color="#10B981" />
          <FloatingCurrency position={[-1.5, -1.5, 1.5]} symbol="₿" color="#F7931A" />
          <FloatingCurrency position={[1.5, 2, 0.5]} symbol="Ł" color="#345D9D" />
          
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
        </Canvas>
      </div>
      
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">AI Bot Trading</h2>
        <p className="text-muted-foreground mb-4">Initializing trading systems...</p>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default AIBotLoader;
