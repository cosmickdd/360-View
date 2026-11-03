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

// Reusable 3D Math Vectors & Quaternions
const _zee = new THREE.Vector3(0, 0, 1);
const _euler = new THREE.Euler();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X axis
const _worldY = new THREE.Vector3(0, 1, 0);

// Convert W3C Device Orientation (alpha, beta, gamma, screenOrientation) to Three.js Quaternion
function computeDeviceQuaternion(
  alpha: number,
  beta: number,
  gamma: number,
  orientDeg: number,
  out: THREE.Quaternion
) {
  const alphaRad = THREE.MathUtils.degToRad(alpha);
  const betaRad = THREE.MathUtils.degToRad(beta);
  const gammaRad = THREE.MathUtils.degToRad(-gamma);
  const orientRad = THREE.MathUtils.degToRad(orientDeg);

  _euler.set(betaRad, alphaRad, gammaRad, 'YXZ');
  out.setFromEuler(_euler);
  out.multiply(_q1); // Camera looks out the back of the phone
  out.multiply(_q0.setFromAxisAngle(_zee, -orientRad)); // Screen orientation compensation
}

// Get Screen Orientation angle in degrees
function getScreenOrientationAngle(): number {
  if (typeof window !== 'undefined' && window.screen && window.screen.orientation && window.screen.orientation.angle !== undefined) {
    return window.screen.orientation.angle;
  }
  if (typeof window !== 'undefined' && typeof window.orientation !== 'undefined') {
    return Number(window.orientation) || 0;
  }
  return 0;
}

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
  isGyroActive?: boolean;
  onGyroSensorDetected?: (detected: boolean) => void;
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
  isGyroActive = false,
  onGyroSensorDetected
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

  // Touch & Manual Orientation State
  const touchStateRef = useRef({
    yaw: 0,           // in degrees (0 = Central Vrindavan)
    pitch: 0,         // in degrees
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

  // Device Gyroscope tracking ref with Quaternion baseline calibration
  const gyroRef = useRef({
    alpha: 0,
    beta: 0,
    gamma: 0,
    hasData: false,
    hasCalibrated: false,
    baseYawOffset: 0, // horizontal yaw offset in radians to align phone with Central Vrindavan
    detected: false
  });

  // Quaternions allocated once to prevent GC stutters
  const quatTarget = useRef(new THREE.Quaternion());
  const quatDevice = useRef(new THREE.Quaternion());
  const quatYawOffset = useRef(new THREE.Quaternion());

  // Dynamically calculate camera limits
  const getLimits = useCallback(() => {
    const fov = touchStateRef.current.targetFov;
    const aspect = cameraRef.current ? cameraRef.current.aspect : 16 / 9;

    if (projectionMode === 'sphere') {
      return {
        minYaw: -Infinity,
        maxYaw: Infinity,
        minPitch: -85, // Full vertical freedom to look down at rangoli
        maxPitch: 85,  // Full vertical freedom to look up at tree canopy
        minFov: 38,
        maxFov: 80,
      };
    } else {
      // Curved mode: compute horizontal FOV
      const fovVRad = THREE.MathUtils.degToRad(fov);
      const fovHRad = 2 * Math.atan(Math.tan(fovVRad / 2) * aspect);
      const fovHDeg = THREE.MathUtils.radToDeg(fovHRad);

      // Max yaw so the camera frustum stays inside the 260° arc
      const maxYaw = Math.max(15, (CURVED_ARC_DEG - fovHDeg) / 2 - 2);

      // Max pitch so the camera never looks past the cylinder top/bottom edge
      const cylinderHalfAngleDeg = THREE.MathUtils.radToDeg(Math.atan((CYLINDER_HEIGHT / 2) / RADIUS));
      const maxPitch = Math.max(12, cylinderHalfAngleDeg - fov / 2 - 3);

      return {
        minYaw: -maxYaw,
        maxYaw: maxYaw,
        minPitch: -maxPitch,
        maxPitch: maxPitch,
        minFov: 38,
        maxFov: 80,
      };
    }
  }, [projectionMode, CYLINDER_HEIGHT]);

  // Calibrate Gyro Boresight: Aligns current phone heading to Central Vrindavan (0, 0, -1)
  const calibrateGyroBoresight = useCallback((deviceQuat: THREE.Quaternion) => {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(deviceQuat);
    const currentAzimuth = Math.atan2(fwd.x, fwd.z);
    // Align forward vector to -Z (atan2(0, -1) = Math.PI)
    gyroRef.current.baseYawOffset = Math.PI - currentAzimuth;
    touchStateRef.current.targetYaw = 0;
    touchStateRef.current.yaw = 0;
    touchStateRef.current.targetPitch = 0;
    touchStateRef.current.pitch = 0;
    gyroRef.current.hasCalibrated = true;
  }, []);

  // Handle Full-Bleed Resizing
  const handleResize = useCallback(() => {
    if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;
    if (width === 0 || height === 0) return;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();

    rendererRef.current.setSize(width, height, false);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const limits = getLimits();
    touchStateRef.current.targetYaw = THREE.MathUtils.clamp(
      touchStateRef.current.targetYaw,
      limits.minYaw,
      limits.maxYaw
    );
    touchStateRef.current.targetPitch = THREE.MathUtils.clamp(
      touchStateRef.current.targetPitch,
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

    camera.updateMatrixWorld();

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    const screenCoords = COURTYARD_HOTSPOTS.map((hotspot) => {
      const yawRad = THREE.MathUtils.degToRad(hotspot.yaw);
      const pitchRad = THREE.MathUtils.degToRad(hotspot.pitch);

      const pos = new THREE.Vector3(
        RADIUS * Math.sin(yawRad) * Math.cos(pitchRad),
        RADIUS * Math.sin(pitchRad),
        -RADIUS * Math.cos(yawRad) * Math.cos(pitchRad)
      );

      if (projectionMode === 'curved' && Math.abs(hotspot.yaw) > CURVED_ARC_DEG / 2) {
        return { hotspot, x: 0, y: 0, visible: false };
      }

      const toPos = pos.clone().normalize();
      const dot = camDir.dot(toPos);

      if (dot <= 0.2) {
        return { hotspot, x: 0, y: 0, visible: false };
      }

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
      const geometry = new THREE.SphereGeometry(RADIUS, 64, 40);
      geometry.scale(-1, 1, 1);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.FrontSide,
      });

      const sphereMesh = new THREE.Mesh(geometry, material);
      sphereMesh.rotation.y = -Math.PI / 2;
      scene.add(sphereMesh);
      meshRef.current = sphereMesh;
    } else {
      const geometry = new THREE.CylinderGeometry(
        RADIUS,
        RADIUS,
        CYLINDER_HEIGHT,
        64,
        32,
        true,
        Math.PI - CURVED_ARC_RAD / 2,
        CURVED_ARC_RAD
      );

      geometry.scale(-1, 1, 1);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.FrontSide,
      });

      const cylinderMesh = new THREE.Mesh(geometry, material);
      scene.add(cylinderMesh);
      meshRef.current = cylinderMesh;
    }
  }, [projectionMode, CYLINDER_HEIGHT, CURVED_ARC_RAD]);

  // Device Orientation Listener (Gyroscope)
  useEffect(() => {
    if (!isGyroActive) {
      gyroRef.current.hasCalibrated = false;
      gyroRef.current.hasData = false;
      return;
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null) return;

      if (!gyroRef.current.hasData) {
        gyroRef.current.hasData = true;
        gyroRef.current.detected = true;
        if (onGyroSensorDetected) onGyroSensorDetected(true);
      }

      gyroRef.current.alpha = e.alpha ?? 0;
      gyroRef.current.beta = e.beta ?? 0;
      gyroRef.current.gamma = e.gamma ?? 0;
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    };
  }, [isGyroActive, onGyroSensorDetected]);

  // Initialize Three.js Engine
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

    // Main 60FPS / 120FPS Animation Loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const touch = touchStateRef.current;
      const limits = getLimits();
      const gyro = gyroRef.current;

      // Handle Gyroscope vs Touch Quaternion Computation
      if (isGyroActive && gyro.hasData) {
        const screenAngle = getScreenOrientationAngle();
        computeDeviceQuaternion(gyro.alpha, gyro.beta, gyro.gamma, screenAngle, quatDevice.current);

        // Auto-calibrate on first valid device frame
        if (!gyro.hasCalibrated) {
          calibrateGyroBoresight(quatDevice.current);
        }

        // Apply touch offset around the true world vertical axis (0, 1, 0)
        const totalYawRad = gyro.baseYawOffset + THREE.MathUtils.degToRad(touch.targetYaw);
        quatYawOffset.current.setFromAxisAngle(_worldY, totalYawRad);

        // Target orientation combines world horizontal rotation with device motion
        quatTarget.current.copy(quatYawOffset.current).multiply(quatDevice.current);

        // If in curved mode, constrain view to cylinder boundaries
        if (projectionMode === 'curved') {
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(quatTarget.current);
          let currentYaw = THREE.MathUtils.radToDeg(Math.atan2(fwd.x, -fwd.z));
          let currentPitch = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1)));

          const clampedYaw = THREE.MathUtils.clamp(currentYaw, limits.minYaw, limits.maxYaw);
          const clampedPitch = THREE.MathUtils.clamp(currentPitch, limits.minPitch, limits.maxPitch);

          if (clampedYaw !== currentYaw || clampedPitch !== currentPitch) {
            _euler.set(THREE.MathUtils.degToRad(clampedPitch), THREE.MathUtils.degToRad(clampedYaw), 0, 'YXZ');
            quatTarget.current.setFromEuler(_euler);
          }
        }
      } else {
        // Gyro is off: apply inertia & damping to touch drag
        if (!touch.isInteracting) {
          touch.targetYaw += touch.velocityX;
          touch.targetPitch += touch.velocityY;

          touch.velocityX *= 0.90;
          touch.velocityY *= 0.90;

          if (Math.abs(touch.velocityX) < 0.001) touch.velocityX = 0;
          if (Math.abs(touch.velocityY) < 0.001) touch.velocityY = 0;
        }

        // Clamp target values within projection limits
        if (projectionMode === 'curved') {
          touch.targetYaw = THREE.MathUtils.clamp(touch.targetYaw, limits.minYaw, limits.maxYaw);
        }
        touch.targetPitch = THREE.MathUtils.clamp(touch.targetPitch, limits.minPitch, limits.maxPitch);

        // Smooth Lerp Damping
        const lerpFactor = 1 - Math.exp(-14 * delta);
        touch.yaw += (touch.targetYaw - touch.yaw) * lerpFactor;
        touch.pitch += (touch.targetPitch - touch.pitch) * lerpFactor;

        // Construct target quaternion directly from Euler angles
        _euler.set(
          THREE.MathUtils.degToRad(touch.pitch),
          THREE.MathUtils.degToRad(touch.yaw),
          0,
          'YXZ'
        );
        quatTarget.current.setFromEuler(_euler);
      }

      // Smooth FOV interpolation
      touch.targetFov = THREE.MathUtils.clamp(touch.targetFov, limits.minFov, limits.maxFov);
      touch.fov += (touch.targetFov - touch.fov) * (1 - Math.exp(-12 * delta));

      if (Math.abs(camera.fov - touch.fov) > 0.01) {
        camera.fov = touch.fov;
        camera.updateProjectionMatrix();
      }

      // Smooth Slerp: Traverses the shortest spherical geodesic on S^3
      // Guaranteed ZERO gimbal lock, ZERO NaN matrices, and ZERO angle-wrapping jumps!
      const slerpFactor = isGyroActive ? Math.min(1, 24 * delta) : Math.min(1, 14 * delta);
      camera.quaternion.slerp(quatTarget.current, slerpFactor);

      // Render Scene
      renderer.render(scene, camera);

      // Extract Current Camera Direction for UI & Compass
      const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const currentYawDeg = THREE.MathUtils.radToDeg(Math.atan2(camFwd.x, -camFwd.z));
      const currentPitchDeg = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(camFwd.y, -1, 1)));

      if (onHeadingChange) {
        onHeadingChange(currentYawDeg, currentPitchDeg, camera.fov);
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
  }, [imageSrc, getLimits, handleResize, updateHotspotPositions, updateGeometry, onHeadingChange, onLoaded, isGyroActive, calibrateGyroBoresight, projectionMode]);

  // Rebuild geometry when projectionMode changes
  useEffect(() => {
    if (sceneRef.current && textureRef.current) {
      updateGeometry(sceneRef.current, textureRef.current);
      const limits = getLimits();
      touchStateRef.current.targetYaw = THREE.MathUtils.clamp(
        touchStateRef.current.targetYaw,
        limits.minYaw,
        limits.maxYaw
      );
      touchStateRef.current.targetPitch = THREE.MathUtils.clamp(
        touchStateRef.current.targetPitch,
        limits.minPitch,
        limits.maxPitch
      );
    }
  }, [projectionMode, updateGeometry, getLimits]);

  // Handle External Reset View Trigger
  useEffect(() => {
    if (resetTrigger > 0) {
      const touch = touchStateRef.current;
      touch.targetYaw = 0;
      touch.yaw = 0;
      touch.targetPitch = 0;
      touch.pitch = 0;
      touch.targetFov = 60;
      touch.velocityX = 0;
      touch.velocityY = 0;

      // Re-zero gyro baseline so phone's current direction faces Central Vrindavan
      if (gyroRef.current.hasData) {
        gyroRef.current.hasCalibrated = false;
      }
    }
  }, [resetTrigger]);

  // Handle External Zoom In Trigger
  useEffect(() => {
    if (zoomInTrigger > 0) {
      const touch = touchStateRef.current;
      const limits = getLimits();
      touch.targetFov = Math.max(limits.minFov, touch.targetFov - 8);
    }
  }, [zoomInTrigger, getLimits]);

  // Handle External Zoom Out Trigger
  useEffect(() => {
    if (zoomOutTrigger > 0) {
      const touch = touchStateRef.current;
      const limits = getLimits();
      touch.targetFov = Math.min(limits.maxFov, touch.targetFov + 8);
    }
  }, [zoomOutTrigger, getLimits]);

  // Pointer & Gesture Handlers
  const pointerMap = useRef(new Map<number, { x: number; y: number }>());

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerMap.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const touch = touchStateRef.current;
    touch.isInteracting = true;
    touch.hasInteracted = true;
    touch.velocityX = 0;
    touch.velocityY = 0;

    if (pointerMap.current.size === 1) {
      touch.lastPointerX = e.clientX;
      touch.lastPointerY = e.clientY;
      touch.isPinching = false;
    } else if (pointerMap.current.size === 2) {
      const points = Array.from(pointerMap.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      touch.pinchDistance = dist;
      touch.isPinching = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerMap.current.has(e.pointerId)) return;
    pointerMap.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const touch = touchStateRef.current;

    if (pointerMap.current.size === 2 && touch.isPinching) {
      const points = Array.from(pointerMap.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const deltaDist = dist - touch.pinchDistance;
      touch.pinchDistance = dist;

      const zoomSpeed = 0.12;
      const limits = getLimits();
      touch.targetFov = THREE.MathUtils.clamp(
        touch.targetFov - deltaDist * zoomSpeed,
        limits.minFov,
        limits.maxFov
      );
      return;
    }

    if (pointerMap.current.size === 1 && !touch.isPinching) {
      const deltaX = e.clientX - touch.lastPointerX;
      const deltaY = e.clientY - touch.lastPointerY;
      touch.lastPointerX = e.clientX;
      touch.lastPointerY = e.clientY;

      const fovFactor = touch.fov / 60;
      const sensitivity = 0.15 * fovFactor;

      const yawChange = -deltaX * sensitivity;
      const pitchChange = deltaY * sensitivity;

      touch.targetYaw += yawChange;

      // Vertical drag adjusts pitch only when gyro is off (in gyro, phone pitch tracks naturally)
      if (!isGyroActive) {
        touch.targetPitch += pitchChange;
      }

      touch.velocityX = yawChange * 0.40;
      touch.velocityY = pitchChange * 0.40;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    pointerMap.current.delete(e.pointerId);

    const touch = touchStateRef.current;
    if (pointerMap.current.size === 0) {
      touch.isInteracting = false;
      touch.isPinching = false;
    } else if (pointerMap.current.size === 1) {
      const remaining = Array.from(pointerMap.current.values())[0];
      touch.lastPointerX = remaining.x;
      touch.lastPointerY = remaining.y;
      touch.isPinching = false;
    }
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const touch = touchStateRef.current;
    const limits = getLimits();
    const zoomAmount = e.deltaY * 0.04;
    touch.targetFov = THREE.MathUtils.clamp(
      touch.targetFov + zoomAmount,
      limits.minFov,
      limits.maxFov
    );
  };

  return (
    <div
      ref={containerRef}
      className="viewer-container"
      style={{
        cursor: touchStateRef.current.isInteracting ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} />

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
