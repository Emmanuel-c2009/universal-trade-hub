import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Torus, Box } from "@react-three/drei";
import * as THREE from "three";

// Floating Gold Coin Component
function FloatingCoin({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const speed = useMemo(() => 0.5 + Math.random() * 0.5, []);
  const rotationSpeed = useMemo(() => 0.5 + Math.random() * 1, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.5;
      // Spin faster when hovered
      meshRef.current.rotation.y += (hovered ? 0.05 : 0.01) * rotationSpeed;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    
    // Smooth glow transition
    if (materialRef.current) {
      const targetIntensity = hovered ? 0.8 : 0.2;
      materialRef.current.emissiveIntensity += (targetIntensity - materialRef.current.emissiveIntensity) * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh 
        ref={meshRef} 
        castShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#FFD700"
          metalness={0.9}
          roughness={0.1}
          emissive="#FFD700"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Coin details */}
      <mesh position={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.4, 0.4, 0.01, 32]} />
        <meshStandardMaterial
          color="#FFA500"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

// Animated Candlestick Component
function Candlestick({ position, height, color }: { position: [number, number, number]; height: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetHeight = useMemo(() => height, [height]);
  const currentHeight = useRef(0.1);

  useFrame(() => {
    if (meshRef.current) {
      currentHeight.current += (targetHeight - currentHeight.current) * 0.05;
      meshRef.current.scale.y = currentHeight.current;
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={[0.3, 1, 0.3]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        metalness={0.5}
        roughness={0.3}
      />
    </mesh>
  );
}

// Animated Line Chart Component
function LineChart({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 20; i++) {
      pts.push(
        new THREE.Vector3(
          (i - 10) * 0.2,
          Math.sin(i * 0.5) * 0.5 + Math.random() * 0.3,
          0
        )
      );
    }
    return pts;
  }, []);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <tubeGeometry args={[curve, 64, 0.02, 8, false]} />
        <meshStandardMaterial
          color="#00BFFF"
          emissive="#00BFFF"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

// Rotating Market Cube Component
function MarketCube({ position, label }: { position: [number, number, number]; label: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotate faster when hovered
      meshRef.current.rotation.x += hovered ? 0.02 : 0.005;
      meshRef.current.rotation.y += hovered ? 0.04 : 0.01;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.3;
    }
    
    // Smooth glow transition
    if (materialRef.current) {
      const targetIntensity = hovered ? 0.6 : 0.2;
      materialRef.current.emissiveIntensity += (targetIntensity - materialRef.current.emissiveIntensity) * 0.1;
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      position={position} 
      castShadow
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#1E40AF"
        metalness={0.7}
        roughness={0.3}
        emissive="#1E40AF"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// Crypto Coin Component
function CryptoCoin({ position, type }: { position: [number, number, number]; type: "BTC" | "ETH" }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const color = type === "BTC" ? "#F7931A" : "#627EEA";

  useFrame((state) => {
    if (meshRef.current) {
      // Spin faster when hovered
      meshRef.current.rotation.y += hovered ? 0.08 : 0.02;
      meshRef.current.position.y = position[1] + Math.cos(state.clock.elapsedTime * 0.7) * 0.4;
    }
    
    // Smooth glow transition
    if (materialRef.current) {
      const targetIntensity = hovered ? 0.9 : 0.3;
      materialRef.current.emissiveIntensity += (targetIntensity - materialRef.current.emissiveIntensity) * 0.1;
    }
  });

  return (
    <group position={position}>
      <Torus 
        ref={meshRef} 
        args={[0.4, 0.1, 16, 32]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          metalness={0.9}
          roughness={0.1}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </Torus>
    </group>
  );
}

// Glowing Particle System
function ParticleField() {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#FFD700"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Mouse Parallax Camera Controller
function MouseParallax({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const { camera } = useThree();
  
  useFrame(() => {
    // Smooth camera movement based on mouse position
    const targetX = mouseX * 2;
    const targetY = mouseY * 2;
    
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}

// Main 3D Scene Component
function Scene({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      // Subtle rotation based on mouse position
      groupRef.current.rotation.y = mouseX * 0.3;
      groupRef.current.rotation.x = -mouseY * 0.2;
    }
  });
  
  return (
    <>
      <MouseParallax mouseX={mouseX} mouseY={mouseY} />
      
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00BFFF" />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#FFD700" />

      <group ref={groupRef}>
        {/* Floating Gold Coins */}
        <FloatingCoin position={[-4, 2, -3]} />
        <FloatingCoin position={[4, -1, -4]} />
        <FloatingCoin position={[-2, -2, -2]} />
        <FloatingCoin position={[3, 3, -5]} />
        <FloatingCoin position={[0, 1, -3]} />

        {/* Crypto Coins */}
        <CryptoCoin position={[-5, 0, -4]} type="BTC" />
        <CryptoCoin position={[5, 1, -3]} type="ETH" />

        {/* Animated Candlesticks */}
        <Candlestick position={[-3, -1, -2]} height={1.5} color="#10B981" />
        <Candlestick position={[-2, -1, -2]} height={2} color="#EF4444" />
        <Candlestick position={[-1, -1, -2]} height={1.2} color="#10B981" />
        <Candlestick position={[0, -1, -2]} height={1.8} color="#10B981" />
        <Candlestick position={[1, -1, -2]} height={1} color="#EF4444" />
        <Candlestick position={[2, -1, -2]} height={2.2} color="#10B981" />

        {/* Line Chart */}
        <LineChart position={[0, 2, -5]} />

        {/* Market Cubes */}
        <MarketCube position={[-6, 0, -6]} label="Forex" />
        <MarketCube position={[6, -1, -6]} label="Stocks" />
        <MarketCube position={[-4, 3, -7]} label="Crypto" />
        <MarketCube position={[4, -3, -5]} label="Commodities" />

        {/* Particle Field */}
        <ParticleField />
      </group>
    </>
  );
}

export const Hero3DScene = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Normalize mouse position to -1 to 1 range
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      setMousePosition({ x, y });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <Scene mouseX={mousePosition.x} mouseY={mousePosition.y} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};
