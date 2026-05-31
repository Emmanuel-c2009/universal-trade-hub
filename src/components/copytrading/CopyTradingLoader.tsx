import { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Text3D, Center } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

function FloatingCoin({ position, color, delay }: { position: [number, number, number]; color: string; delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += 0.02;
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + delay) * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
    </Float>
  );
}

function ChartBar({ position, height, delay }: { position: [number, number, number]; height: number; delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const scale = 0.5 + Math.abs(Math.sin(state.clock.elapsedTime * 2 + delay)) * 0.5;
    meshRef.current.scale.y = scale * height;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.3, 1, 0.3]} />
      <meshStandardMaterial 
        color="#00a8ff" 
        emissive="#0066cc" 
        emissiveIntensity={0.5}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function Globe() {
  const meshRef = useRef<THREE.Mesh>(null);
  const linesRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
    if (linesRef.current) {
      linesRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group>
      {/* Globe sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial 
          color="#0f1a3c" 
          wireframe 
          transparent 
          opacity={0.3}
        />
      </mesh>
      
      {/* Glowing outer sphere */}
      <mesh>
        <sphereGeometry args={[2.1, 32, 32]} />
        <meshStandardMaterial 
          color="#00a8ff" 
          transparent 
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Data streams */}
      <group ref={linesRef}>
        {[...Array(12)].map((_, i) => (
          <mesh 
            key={i} 
            position={[
              Math.cos((i / 12) * Math.PI * 2) * 2.3,
              (Math.random() - 0.5) * 2,
              Math.sin((i / 12) * Math.PI * 2) * 2.3,
            ]}
          >
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial 
              color="#ffd700" 
              emissive="#ffa500" 
              emissiveIntensity={1}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00a8ff" />
      <pointLight position={[10, -10, 5]} intensity={0.5} color="#ffd700" />
      
      <Globe />
      
      {/* Floating coins */}
      <FloatingCoin position={[-3, 1.5, 0]} color="#ffd700" delay={0} />
      <FloatingCoin position={[3, 0.5, -1]} color="#ffd700" delay={1} />
      <FloatingCoin position={[-2.5, -1, 1]} color="#ffd700" delay={2} />
      <FloatingCoin position={[2.5, 1, 1]} color="#c0c0c0" delay={1.5} />
      
      {/* Chart bars */}
      <group position={[0, -2.5, 2]}>
        <ChartBar position={[-1.2, 0, 0]} height={1.5} delay={0} />
        <ChartBar position={[-0.6, 0, 0]} height={2} delay={0.5} />
        <ChartBar position={[0, 0, 0]} height={1.2} delay={1} />
        <ChartBar position={[0.6, 0, 0]} height={2.5} delay={1.5} />
        <ChartBar position={[1.2, 0, 0]} height={1.8} delay={2} />
      </group>
    </>
  );
}

export const CopyTradingLoader = () => {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center">
      {/* 3D Scene */}
      <div className="w-full h-[60vh] max-w-3xl">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
          <Scene />
        </Canvas>
      </div>

      {/* Loading Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Copy Trading Platform
        </h2>
        <p className="text-muted-foreground mb-4">
          Loading expert traders...
        </p>
        
        {/* Loading bar */}
        <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-secondary to-accent"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-secondary/50 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: window.innerHeight + 20,
            }}
            animate={{
              y: -20,
              x: Math.random() * window.innerWidth,
            }}
            transition={{
              duration: 3 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear",
            }}
          />
        ))}
      </div>
    </div>
  );
};
