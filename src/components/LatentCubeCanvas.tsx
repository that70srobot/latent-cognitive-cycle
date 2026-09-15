import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CognitiveState } from '../types/cognitive';

interface LatentCubeCanvasProps {
  state: CognitiveState;
  energyLevel: number; // 0 (idle) to 1 (full excitation)
  feedbackPulse: number; // 0 to 1 trigger pulse
  onSelectNode1?: () => void;
}

export const LatentCubeCanvas: React.FC<LatentCubeCanvasProps> = ({
  state,
  energyLevel,
  feedbackPulse,
  onSelectNode1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cubeBoxRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    // SCENE
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // CAMERA - Closer camera distance to make the cube significantly bigger
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2.5, 1.3, 3.8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x818cf8, 2, 20);
    pointLight.position.set(2, 4, 3);
    scene.add(pointLight);

    const coreLight = new THREE.PointLight(0x00f2fe, 1.5, 10);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // CUBE CHASSIS
    const cubeGroup = new THREE.Group();
    cubeBoxRef.current = cubeGroup;
    scene.add(cubeGroup);

    // Outer wireframe box
    const boxSize = 2.8;
    const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const boxEdges = new THREE.EdgesGeometry(boxGeometry);
    const boxLineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      linewidth: 2,
    });
    const boxWireframe = new THREE.LineSegments(boxEdges, boxLineMaterial);
    cubeGroup.add(boxWireframe);

    // Dark semi-translucent glass cube faces
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x050b1e,
      metalness: 0.8,
      roughness: 0.1,
      transmission: 0.8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glassCube = new THREE.Mesh(boxGeometry, glassMaterial);
    cubeGroup.add(glassCube);

    // Glowing front emission aperture (right face towards stream)
    const portGeo = new THREE.RingGeometry(0.2, 0.35, 32);
    const portMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const emissionPort = new THREE.Mesh(portGeo, portMat);
    emissionPort.position.set(boxSize / 2 + 0.01, 0, 0);
    emissionPort.rotation.y = Math.PI / 2;
    cubeGroup.add(emissionPort);

    // Absorption port (bottom face from feedback loop)
    const intakePortMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const intakePort = new THREE.Mesh(portGeo, intakePortMat);
    intakePort.position.set(0, -boxSize / 2 - 0.01, 0);
    intakePort.rotation.x = Math.PI / 2;
    cubeGroup.add(intakePort);

    // NODES CONSTELLATION (LATENT SPACE GRAPH)
    const nodesGroup = new THREE.Group();
    cubeGroup.add(nodesGroup);

    const nodeCount = 95;
    const nodePositions: THREE.Vector3[] = [];
    const nodeVelocities: THREE.Vector3[] = [];
    const range = boxSize * 0.4;

    for (let i = 0; i < nodeCount; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 2 * range,
        (Math.random() - 0.5) * 2 * range,
        (Math.random() - 0.5) * 2 * range
      );
      nodePositions.push(pos);
      nodeVelocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.003
        )
      );
    }

    // Points Geometry
    const pointsGeometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(nodeCount * 3);
    const colorArray = new Float32Array(nodeCount * 3);

    for (let i = 0; i < nodeCount; i++) {
      posArray[i * 3] = nodePositions[i].x;
      posArray[i * 3 + 1] = nodePositions[i].y;
      posArray[i * 3 + 2] = nodePositions[i].z;

      // Cyan to Indigo palette
      const isCore = Math.random() > 0.6;
      colorArray[i * 3] = isCore ? 0.0 : 0.4;
      colorArray[i * 3 + 1] = isCore ? 0.95 : 0.5;
      colorArray[i * 3 + 2] = 1.0;
    }

    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    // Custom circle texture for soft glow nodes
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.9)');
      grad.addColorStop(0.8, 'rgba(168, 85, 247, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);

    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.18,
      map: texture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
    nodesGroup.add(pointsMesh);

    // Dynamic Connections (Lines)
    const maxLineConnections = 240;
    const lineIndices: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodePositions[i].distanceTo(nodePositions[j]);
        if (dist < 0.85 && lineIndices.length < maxLineConnections * 2) {
          lineIndices.push(i, j);
        }
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    lineGeometry.setIndex(lineIndices);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    nodesGroup.add(lineMesh);

    // Dedicated Node 1 Genesis Core Mesh
    const node1Geo = new THREE.SphereGeometry(0.11, 24, 24);
    const node1Mat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });
    const node1Mesh = new THREE.Mesh(node1Geo, node1Mat);
    node1Mesh.position.set(0, 0.1, 0.2);
    nodesGroup.add(node1Mesh);

    // Pulsing outer aura ring for Node 1
    const node1RingGeo = new THREE.RingGeometry(0.16, 0.26, 32);
    const node1RingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const node1Ring = new THREE.Mesh(node1RingGeo, node1RingMat);
    node1Mesh.add(node1Ring);

    // MOUSE DRAG TO ROTATE CUBE
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !cubeBoxRef.current) return;
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      cubeBoxRef.current.rotation.y += deltaX * 0.008;
      cubeBoxRef.current.rotation.x += deltaY * 0.008;

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!cameraRef.current) return;
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.002;
      const dist = cameraRef.current.position.length();
      if ((zoomFactor > 0 && dist < 7.5) || (zoomFactor < 0 && dist > 1.8)) {
        cameraRef.current.position.multiplyScalar(1 + zoomFactor);
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    dom.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // RESIZE HANDLER
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ANIMATION LOOP
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle resting float / rotation
      if (!isDraggingRef.current && cubeBoxRef.current) {
        cubeBoxRef.current.rotation.y += 0.003 * (1 + energyLevel * 2);
        cubeBoxRef.current.rotation.x = Math.sin(elapsed * 0.5) * 0.08;
      }

      // Animate Nodes inside
      const posAttr = pointsGeometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < nodeCount; i++) {
        // Base movement
        nodePositions[i].add(nodeVelocities[i]);

        // Feedback shockwave perturbation
        if (feedbackPulse > 0.05) {
          const impulse = (Math.random() - 0.5) * 0.03 * feedbackPulse;
          nodePositions[i].y += impulse;
        }

        // Keep inside bounds
        const b = range * 1.1;
        if (Math.abs(nodePositions[i].x) > b) nodeVelocities[i].x *= -1;
        if (Math.abs(nodePositions[i].y) > b) nodeVelocities[i].y *= -1;
        if (Math.abs(nodePositions[i].z) > b) nodeVelocities[i].z *= -1;

        arr[i * 3] = nodePositions[i].x;
        arr[i * 3 + 1] = nodePositions[i].y;
        arr[i * 3 + 2] = nodePositions[i].z;
      }
      posAttr.needsUpdate = true;

      // Adjust glow / opacity based on state
      if (lineMaterial) {
        lineMaterial.opacity = 0.2 + energyLevel * 0.6;
        lineMaterial.color.setHex(energyLevel > 0.5 ? 0x67e8f9 : 0x38bdf8);
      }
      if (pointsMaterial) {
        pointsMaterial.size = 0.16 + energyLevel * 0.12 + Math.sin(elapsed * 4) * 0.03 * energyLevel;
      }

      // Pulse emission port
      emissionPort.scale.setScalar(1 + energyLevel * 0.3 + Math.sin(elapsed * 8) * 0.1 * energyLevel);
      intakePort.scale.setScalar(1 + feedbackPulse * 0.4 + Math.sin(elapsed * 6) * 0.1 * feedbackPulse);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        title="Click and drag to rotate the latent cube"
      />

      {/* Latent Space Top Label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 text-xs font-mono text-cyan-300 backdrop-blur-md shadow-lg shadow-cyan-500/10 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        latent space
      </div>

      {/* Node 1 Genesis Seed Badge (Planted) */}
      <button
        onClick={onSelectNode1}
        className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/60 hover:border-amber-300 hover:scale-105 active:scale-95 transition-all text-[11px] font-mono text-amber-200 backdrop-blur-md shadow-lg shadow-amber-500/20 cursor-pointer pointer-events-auto"
        title="Node 1 Planted: Click to inspect Genesis Blueprint"
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>Node 1: Genesis Seed</span>
      </button>

      {/* Latent Potential Side Label */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 origin-left text-[11px] font-mono tracking-widest text-slate-400/80 uppercase pointer-events-none flex items-center gap-1">
        <span>latent potential</span>
        {energyLevel > 0.4 && (
          <span className="text-cyan-400 font-bold animate-ping text-[9px]">●</span>
        )}
      </div>

      {/* Resting Indicator: nothing moves until prompted */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md transition-all duration-500 pointer-events-none ${
          state === 'IDLE'
            ? 'bg-slate-900/90 border border-slate-700/80 text-slate-300 shadow-md'
            : 'opacity-40 scale-95 text-slate-500 bg-slate-950/40 border border-slate-800'
        }`}
      >
        <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-[9px] font-bold text-slate-400">
          Ⅱ
        </div>
        <span className="text-xs font-mono tracking-wide">
          {state === 'IDLE' ? 'nothing moves until prompted' : 'latent space excited'}
        </span>
      </div>
    </div>
  );
};
