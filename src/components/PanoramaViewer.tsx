import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export type ProjectionMode = 'curved' | 'sphere';

export interface Hotspot {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  yaw: number;   // in degrees (-180 to 180)
  pitch: number; // in degrees (-90 to 90)
  category: 'sanctum' | 'heritage' | 'nature' | 'architecture';
}

export const COURTYARD_HOTSPOTS: Hotspot[] = [
  {
    id: 'central-vrindavan',
    title: 'Central Tulsi Vrindavan',
    subtitle: 'The Sacred Sanctum Sanctorum',
    description: 'A hand-carved Chaumukha sandstone shrine housing the revered Krishna Tulsi (Ocimum tenuiflorum). At the base, a hand-drawn white rice-flour rangoli is adorned with marigold petals, illuminated by a glowing brass diya.',
    yaw: 0,
    pitch: -4,
    category: 'sanctum'
  },
  {
    id: 'heritage-jhula',
    title: 'Royal Courtyard Jhula',
    subtitle: 'Carved Teakwood Swing',
    description: 'An authentic Rajasthani wooden swing suspended by solid cast-brass chains with sacred bells. Overhung by vibrant pink bougainvillea vines, offering a serene vantage point of the morning sun.',
    yaw: -65,
    pitch: -2,
    category: 'heritage'
  },
  {
    id: 'west-colonnade',
    title: 'Rama Tulsi Plinth',
    subtitle: 'Western Verandah Pedestal',
    description: 'Raised earthen terracotta pot seated upon an octagonal sandstone plinth. Rama Tulsi features lighter green leaves and a gentle, sweet clove-like aroma.',
    yaw: -30,
    pitch: -4,
    category: 'nature'
  },
  {
    id: 'east-colonnade',
    title: 'Shyama Tulsi Plinth',
    subtitle: 'Eastern Verandah Pedestal',
    description: 'Dark purple-hued holy basil known for its potent medicinal properties and antioxidant prana. Backed by intricately perforated Jharokha stone screens.',
    yaw: 30,
    pitch: -4,
    category: 'nature'
  },
  {
    id: 'haveli-gateway',
    title: 'Haveli Inner Portal',
    subtitle: 'Carved Shekhawati Doorway',
    description: 'Solid teak doorway adorned with ornate brass studs and flanked by a warm oil lamp sconce, leading into the inner chambers of the ancestral family home.',
    yaw: 66,
    pitch: 0,
    category: 'architecture'
  }
];

interface PanoramaViewerProps {
  imageSrc: string;
  projectionMode: ProjectionMode;
  onHeadingChange?: (yaw: number, pitch: number, fov: number) => void;
  onLoaded?: () => void;
  onHotspotSelect?: (hotspot: Hotspot | null) => void;
  activeHotspotId?: string | null;
  resetTrigger?: number;
  zoomInTrigger?: number;
  zoomOutTrigger?: number;
  showHotspots?: boolean;
}

export const PanoramaViewer: React.FC<PanoramaViewerProps> = ({
  imageSrc,
  projectionMode,
  onHeadingChange,
  onLoaded,
  onHotspotSelect,
  activeHotspotId,
  resetTrigger = 0,
  zoomInTrigger = 0,
  zoomOutTrigger = 0,
  showHotspots = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Loading & Error States
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 2D screen coordinates for rendered hotspots
  const [screenHotspots, setScreenHotspots] = useState<
    Array<{ hotspot: Hotspot; x: number; y: number; visible: boolean }>
  >([]);

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Geometry configuration constants
  const RADIUS = 500;
  const CURVED_ARC_DEG = 260; // 260° horizontal coverage
  const CURVED_ARC_RAD = (CURVED_ARC_DEG * Math.PI) / 180;
  const CYLINDER_HEIGHT = Math.max((RADIUS * CURVED_ARC_RAD) / 2.0, 1350);

  // Camera State with target values for smooth damping
  const stateRef = useRef({
    yaw: 0,           // in degrees: 0 = looking at Central Vrindavan, <0 = left, >0 = right
    pitch: 0,         // in degrees: 0 = horizon, >0 = looking up, <0 = looking down
    fov: 60,          // field of view (default 60°)
    targetYaw: 0,
    targetPitch: 0,
    targetFov: 60,
    isInteracting: false,
    hasInteracted: false,
    lastPointerX: 0,
    lastPointerY: 0,
    velocityX: 0,
    velocityY: 0,
    pinchDistance: 0,
    isPinching: false
  });

  // Dynamically calculate camera limits to guarantee ZERO black borders
  const getLimits = useCallback(() => {
    const fov = stateRef.current.targetFov;
    const aspect = cameraRef.current ? cameraRef.current.aspect : 16 / 9;

    if (projectionMode === 'sphere') {
      return {
        minYaw: -Infinity,
        maxYaw: Infinity,
        minPitch: -38,
        maxPitch: 38,
        minFov: 42,
        maxFov: 80,
      };
    } else {
      // Curved mode: compute horizontal FOV
      const fovVRad = THREE.MathUtils.degToRad(fov);
      const fovHRad = 2 * Math.atan(Math.tan(fovVRad / 2) * aspect);
      const fovHDeg = THREE.MathUtils.radToDeg(fovHRad);

      // Max yaw so the camera frustum stays inside the 260° arc
      const maxYaw = Math.max(15, (CURVED_ARC_DEG - fovHDeg) / 2 - 2);

      // Max pitch so the camera never looks past the top/bottom cylinder edge
      const cylinderHalfAngleDeg = THREE.MathUtils.radToDeg(Math.atan((CYLINDER_HEIGHT / 2) / RADIUS));
      const maxPitch = Math.max(12, cylinderHalfAngleDeg - fov / 2 - 3);

      return {
        minYaw: -maxYaw,
        maxYaw: maxYaw,
        minPitch: -maxPitch,
        maxPitch: maxPitch,
        minFov: 42,
        maxFov: 80,
      };
    }
  }, [projectionMode, CYLINDER_HEIGHT]);

  // Handle Full-Bleed Resizing
  const handleResize = useCallback(() => {
    if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;
    if (width === 0 || height === 0) return;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();

    // Use false to prevent Three.js from setting conflicting inline CSS dimensions
    rendererRef.current.setSize(width, height, false);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Clamp yaw and pitch to new limits if needed
    const limits = getLimits();
    stateRef.current.targetYaw = THREE.MathUtils.clamp(
      stateRef.current.targetYaw,
      limits.minYaw,
      limits.maxYaw
    );
    stateRef.current.targetPitch = THREE.MathUtils.clamp(
      stateRef.current.targetPitch,
      limits.minPitch,
      limits.maxPitch
    );
  }, [getLimits]);

  // Update Hotspot Screen Positions
  const updateHotspotPositions = useCallback(() => {
    if (!cameraRef.current || !containerRef.current) return;
    const camera = cameraRef.current;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Ensure camera world matrix is fresh
    camera.updateMatrixWorld();

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    const screenCoords = COURTYARD_HOTSPOTS.map((hotspot) => {
      // Same coordinate formula as camera lookAt
      const yawRad = THREE.MathUtils.degToRad(hotspot.yaw);
      const pitchRad = THREE.MathUtils.degToRad(hotspot.pitch);

      const pos = new THREE.Vector3(
        RADIUS * Math.sin(yawRad) * Math.cos(pitchRad),
        RADIUS * Math.sin(pitchRad),
        -RADIUS * Math.cos(yawRad) * Math.cos(pitchRad)
      );

      // In curved mode, hide points that fall outside horizontal geometry arc
      if (projectionMode === 'curved' && Math.abs(hotspot.yaw) > CURVED_ARC_DEG / 2) {
        return { hotspot, x: 0, y: 0, visible: false };
      }

      // Check if point is in front of camera
      const toPos = pos.clone().normalize();
      const dot = camDir.dot(toPos);

      if (dot <= 0.2) {
        return { hotspot, x: 0, y: 0, visible: false };
      }

      // Project into normalized device coordinates (-1 to +1)
      const projected = pos.clone().project(camera);
      const x = ((projected.x + 1) / 2) * width;
      const y = ((-projected.y + 1) / 2) * height;

      const isInside = x >= 24 && x <= width - 24 && y >= 24 && y <= height - 24;

      return {
        hotspot,
        x,
        y,
        visible: isInside
      };
    });

    setScreenHotspots(screenCoords);
  }, [projectionMode, CURVED_ARC_DEG]);

  // Setup Geometry based on Projection Mode
  const updateGeometry = useCallback((scene: THREE.Scene, texture: THREE.Texture) => {
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (Array.isArray(meshRef.current.material)) {
        meshRef.current.material.forEach((m) => m.dispose());
      } else {
        meshRef.current.material.dispose();
      }
      meshRef.current = null;
    }

    if (projectionMode === 'sphere') {
      // Sphere mode: Inverted sphere for full continuous 360° wrapping
      const geometry = new THREE.SphereGeometry(RADIUS, 64, 40);
      // Invert geometry so inside is visible
      geometry.scale(-1, 1, 1);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.FrontSide,
      });

      const sphereMesh = new THREE.Mesh(geometry, material);
      // Align u = 0.50 (Central Vrindavan) directly at (0, 0, -RADIUS)
      sphereMesh.rotation.y = -Math.PI / 2;
      scene.add(sphereMesh);
      meshRef.current = sphereMesh;
    } else {
      // Curved mode: Cylindrical curved viewing shell
      // Math.PI - CURVED_ARC_RAD / 2 centers the arc so that u = 0.5 is at angle Pi (z = -RADIUS)
      const geometry = new THREE.CylinderGeometry(
        RADIUS,
        RADIUS,
        CYLINDER_HEIGHT,
        64,
        32,
        true, // open ended
        Math.PI - CURVED_ARC_RAD / 2,
        CURVED_ARC_RAD
      );

      // Invert cylinder normals to view from the inside
      geometry.scale(-1, 1, 1);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.FrontSide,
      });

      const cylinderMesh = new THREE.Mesh(geometry, material);
      // No extra rotation needed: scale(-1, 1, 1) and Math.PI - arc/2
      // perfectly aligns u = 0.50 at (0, 0, -RADIUS) right in front of the camera!
      scene.add(cylinderMesh);
      meshRef.current = cylinderMesh;
    }
  }, [projectionMode, CYLINDER_HEIGHT, CURVED_ARC_RAD]);

  // Initialize Three.js
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera at (0, 0, 0)
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // Texture Loader with Progress
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      imageSrc,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        textureRef.current = texture;

        updateGeometry(scene, texture);

        setIsLoaded(true);
        setLoadingProgress(100);
        if (onLoaded) onLoaded();
      },
      (xhr) => {
        if (xhr.lengthComputable && xhr.total > 0) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadingProgress(percent);
        } else {
          setLoadingProgress(60);
        }
      },
      (err) => {
        console.error('Texture load error:', err);
        setErrorMsg('Failed to load the panoramic courtyard image.');
      }
    );

    // Main Animation Loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const state = stateRef.current;
      const limits = getLimits();

      // Apply Inertia & Momentum when user is not actively dragging
      if (!state.isInteracting) {
        state.targetYaw += state.velocityX;
        state.targetPitch += state.velocityY;

        // Friction damping
        state.velocityX *= 0.90;
        state.velocityY *= 0.90;

        if (Math.abs(state.velocityX) < 0.001) state.velocityX = 0;
        if (Math.abs(state.velocityY) < 0.001) state.velocityY = 0;
      }

      // Clamp target values within safe bounds
      if (projectionMode === 'curved') {
        state.targetYaw = THREE.MathUtils.clamp(state.targetYaw, limits.minYaw, limits.maxYaw);
      }
      state.targetPitch = THREE.MathUtils.clamp(state.targetPitch, limits.minPitch, limits.maxPitch);
      state.targetFov = THREE.MathUtils.clamp(state.targetFov, limits.minFov, limits.maxFov);

      // Smooth Lerp Damping
      const lerpFactor = 1 - Math.exp(-12 * delta);
      state.yaw += (state.targetYaw - state.yaw) * lerpFactor;
      state.pitch += (state.targetPitch - state.pitch) * lerpFactor;
      state.fov += (state.targetFov - state.fov) * lerpFactor;

      // Update Camera FOV
      if (Math.abs(camera.fov - state.fov) > 0.01) {
        camera.fov = state.fov;
        camera.updateProjectionMatrix();
      }

      // Mathematically unified Camera LookAt
      // yaw = 0 points at (0, 0, -1) straight at Central Vrindavan
      // yaw > 0 turns right towards East Colonnade & Gateway (+X)
      // yaw < 0 turns left towards West Colonnade & Jhula (-X)
      // pitch > 0 looks up (+Y), pitch < 0 looks down (-Y)
      const yawRad = THREE.MathUtils.degToRad(state.yaw);
      const pitchRad = THREE.MathUtils.degToRad(state.pitch);

      const targetX = Math.sin(yawRad) * Math.cos(pitchRad);
      const targetY = Math.sin(pitchRad);
      const targetZ = -Math.cos(yawRad) * Math.cos(pitchRad);

      camera.lookAt(targetX, targetY, targetZ);

      // Render the scene
      renderer.render(scene, camera);

      // Notify parent of heading
      if (onHeadingChange) {
        onHeadingChange(state.yaw, state.pitch, state.fov);
      }

      // Update Hotspot Screen Positions
      updateHotspotPositions();
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // Resize Observer for robust viewport responsiveness
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('fullscreenchange', handleResize);

    // Cleanup on unmount
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('fullscreenchange', handleResize);

      if (meshRef.current) {
        scene.remove(meshRef.current);
        meshRef.current.geometry.dispose();
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach((m) => m.dispose());
        } else {
          meshRef.current.material.dispose();
        }
      }

      if (textureRef.current) {
        textureRef.current.dispose();
      }

      renderer.dispose();
    };
  }, [imageSrc, getLimits, handleResize, updateHotspotPositions, updateGeometry, onHeadingChange, onLoaded]);

  // Rebuild geometry when projectionMode changes
  useEffect(() => {
    if (sceneRef.current && textureRef.current) {
      updateGeometry(sceneRef.current, textureRef.current);
      // Immediately clamp yaw and pitch to new limits
      const limits = getLimits();
      stateRef.current.targetYaw = THREE.MathUtils.clamp(
        stateRef.current.targetYaw,
        limits.minYaw,
        limits.maxYaw
      );
      stateRef.current.targetPitch = THREE.MathUtils.clamp(
        stateRef.current.targetPitch,
        limits.minPitch,
        limits.maxPitch
      );
    }
  }, [projectionMode, updateGeometry, getLimits]);

  // Handle External Reset View Trigger
  useEffect(() => {
    if (resetTrigger > 0) {
      const state = stateRef.current;
      state.targetYaw = 0;
      state.targetPitch = 0;
      state.targetFov = 60;
      state.velocityX = 0;
      state.velocityY = 0;
    }
  }, [resetTrigger]);

  // Handle External Zoom In Trigger
  useEffect(() => {
    if (zoomInTrigger > 0) {
      const state = stateRef.current;
      const limits = getLimits();
      state.targetFov = Math.max(limits.minFov, state.targetFov - 8);
    }
  }, [zoomInTrigger, getLimits]);

  // Handle External Zoom Out Trigger
  useEffect(() => {
    if (zoomOutTrigger > 0) {
      const state = stateRef.current;
      const limits = getLimits();
      state.targetFov = Math.min(limits.maxFov, state.targetFov + 8);
    }
  }, [zoomOutTrigger, getLimits]);

  // Pointer & Gesture Handlers
  const pointerMap = useRef(new Map<number, { x: number; y: number }>());

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerMap.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const state = stateRef.current;
    state.isInteracting = true;
    state.hasInteracted = true;
    state.velocityX = 0;
    state.velocityY = 0;

    if (pointerMap.current.size === 1) {
      state.lastPointerX = e.clientX;
      state.lastPointerY = e.clientY;
      state.isPinching = false;
    } else if (pointerMap.current.size === 2) {
      const points = Array.from(pointerMap.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      state.pinchDistance = dist;
      state.isPinching = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerMap.current.has(e.pointerId)) return;
    pointerMap.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const state = stateRef.current;

    if (pointerMap.current.size === 2 && state.isPinching) {
      // Pinch to Zoom
      const points = Array.from(pointerMap.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const deltaDist = dist - state.pinchDistance;
      state.pinchDistance = dist;

      const zoomSpeed = 0.12;
      const limits = getLimits();
      state.targetFov = THREE.MathUtils.clamp(
        state.targetFov - deltaDist * zoomSpeed,
        limits.minFov,
        limits.maxFov
      );
      return;
    }

    if (pointerMap.current.size === 1 && !state.isPinching) {
      // Single Pointer Drag (Mouse or Touch)
      const deltaX = e.clientX - state.lastPointerX;
      const deltaY = e.clientY - state.lastPointerY;
      state.lastPointerX = e.clientX;
      state.lastPointerY = e.clientY;

      // Sensitivity adjusted by current FOV
      const fovFactor = state.fov / 60;
      const sensitivity = 0.15 * fovFactor;

      // Dragging left (deltaX < 0) rotates view right (+yaw)
      // Dragging right (deltaX > 0) rotates view left (-yaw)
      const yawChange = -deltaX * sensitivity;
      const pitchChange = deltaY * sensitivity;

      state.targetYaw += yawChange;
      state.targetPitch += pitchChange;

      // Instantaneous velocity for inertia release
      state.velocityX = yawChange * 0.40;
      state.velocityY = pitchChange * 0.40;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    pointerMap.current.delete(e.pointerId);

    const state = stateRef.current;
    if (pointerMap.current.size === 0) {
      state.isInteracting = false;
      state.isPinching = false;
    } else if (pointerMap.current.size === 1) {
      const remaining = Array.from(pointerMap.current.values())[0];
      state.lastPointerX = remaining.x;
      state.lastPointerY = remaining.y;
      state.isPinching = false;
    }
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const state = stateRef.current;
    const limits = getLimits();
    const zoomAmount = e.deltaY * 0.04;
    state.targetFov = THREE.MathUtils.clamp(
      state.targetFov + zoomAmount,
      limits.minFov,
      limits.maxFov
    );
  };

  return (
    <div
      ref={containerRef}
      className="viewer-container"
      style={{
        cursor: stateRef.current.isInteracting ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
      />

      {/* Loading Overlay */}
      {!isLoaded && !errorMsg && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #261A14 0%, #120B08 100%)',
            zIndex: 30,
            padding: 24,
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: '2px solid rgba(229, 168, 75, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 0 25px rgba(229, 168, 75, 0.25)',
              animation: 'spinSlow 12s linear infinite'
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                border: '2px solid #E5A84B',
                transform: 'rotate(45deg)',
                background: 'rgba(200, 90, 42, 0.2)'
              }}
            />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.4rem',
              letterSpacing: '0.15em',
              color: '#FAF6F0',
              textTransform: 'uppercase',
              marginBottom: 8
            }}
          >
            Entering Tulsi Courtyard
          </h2>
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--color-warm-beige)',
              opacity: 0.75,
              maxWidth: 340,
              marginBottom: 24
            }}
          >
            Configuring full-bleed WebGL environment & sanctum geometry...
          </p>

          <div
            style={{
              width: 200,
              height: 3,
              background: 'rgba(238, 219, 204, 0.15)',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${loadingProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #C85A2A, #E5A84B)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <span
            style={{
              marginTop: 10,
              fontSize: '0.75rem',
              color: 'rgba(250, 246, 240, 0.6)',
              fontFamily: 'monospace'
            }}
          >
            {loadingProgress}%
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {errorMsg && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1F1714',
            color: '#FAF6F0',
            zIndex: 40,
            padding: 24
          }}
        >
          <p style={{ color: '#E57373', marginBottom: 12 }}>{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              background: 'var(--color-terracotta)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Reload Courtyard
          </button>
        </div>
      )}

      {/* Interactive 3D Heritage Hotspots */}
      {isLoaded && showHotspots && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {screenHotspots.map(({ hotspot, x, y, visible }) => {
            if (!visible) return null;
            const isActive = activeHotspotId === hotspot.id;

            return (
              <div
                key={hotspot.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onHotspotSelect) {
                    onHotspotSelect(isActive ? null : hotspot);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  zIndex: isActive ? 20 : 15,
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* Glowing Outer Beacon */}
                <div
                  style={{
                    position: 'relative',
                    width: isActive ? 38 : 30,
                    height: isActive ? 38 : 30,
                    borderRadius: '50%',
                    background: isActive
                      ? 'linear-gradient(135deg, #E5A84B, #C85A2A)'
                      : 'rgba(31, 23, 20, 0.85)',
                    border: `2px solid ${isActive ? '#FAF6F0' : '#E5A84B'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isActive
                      ? '0 0 20px rgba(229, 168, 75, 0.8), 0 4px 12px rgba(0,0,0,0.5)'
                      : '0 0 12px rgba(229, 168, 75, 0.4), 0 2px 8px rgba(0,0,0,0.5)',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div
                    style={{
                      width: isActive ? 12 : 8,
                      height: isActive ? 12 : 8,
                      borderRadius: '50%',
                      background: isActive ? '#FFFFFF' : '#E5A84B'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: -6,
                      borderRadius: '50%',
                      border: '1px solid rgba(229, 168, 75, 0.45)',
                      animation: 'pulseBeacon 2.4s infinite ease-out'
                    }}
                  />
                </div>

                {/* Hotspot Title Pill */}
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: 6,
                    whiteSpace: 'nowrap',
                    padding: '3px 10px',
                    borderRadius: 12,
                    background: 'rgba(20, 14, 11, 0.88)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(238, 219, 204, 0.25)',
                    color: '#FAF6F0',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    pointerEvents: 'none'
                  }}
                >
                  {hotspot.title}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulseBeacon {
          0% {
            transform: scale(0.9);
            opacity: 0.8;
          }
          70% {
            transform: scale(1.6);
            opacity: 0;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
