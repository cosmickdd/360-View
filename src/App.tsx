import { useState, useCallback, useEffect } from 'react';
import {
  PanoramaViewer,
  ProjectionMode,
  Hotspot
} from './components/PanoramaViewer';
import { ProjectionAnalysisModal } from './components/ProjectionAnalysisModal';
import { CourtyardCompass } from './components/CourtyardCompass';
import { HotspotCard } from './components/HotspotCard';
import { ProjectionToggle } from './components/ProjectionToggle';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  HelpCircle,
  Eye,
  EyeOff,
  MoveHorizontal,
  Compass
} from 'lucide-react';

export default function App() {
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('sphere');
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [showHotspots, setShowHotspots] = useState<boolean>(true);

  // Device Gyroscope state
  const [isGyroActive, setIsGyroActive] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Camera orientation state
  const [yaw, setYaw] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [fov, setFov] = useState<number>(60);

  // Interactive triggers
  const [resetCount, setResetCount] = useState<number>(0);
  const [zoomInCount, setZoomInCount] = useState<number>(0);
  const [zoomOutCount, setZoomOutCount] = useState<number>(0);

  // User interaction tracking (to fade out hint)
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Show temporary toast message
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3800);
  };

  // Gyroscope toggle with iOS permission handling
  const toggleGyro = async () => {
    if (!isGyroActive) {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
      ) {
        try {
          const res = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
          if (res === 'granted') {
            setIsGyroActive(true);
            setHasInteracted(true);
            triggerToast('Gyroscope Active • Rotate your device to look around');
          } else {
            triggerToast('Motion sensor permission was denied');
          }
        } catch {
          triggerToast('Device motion permission could not be requested');
        }
      } else {
        setIsGyroActive(true);
        setHasInteracted(true);
        triggerToast('Gyroscope Active • Rotate your device to look around');
      }
    } else {
      setIsGyroActive(false);
      triggerToast('Gyroscope paused • Drag to explore');
    }
  };

  // Heading update callback
  const handleHeadingChange = useCallback((newYaw: number, newPitch: number, newFov: number) => {
    setYaw(newYaw);
    setPitch(newPitch);
    setFov(newFov);
    if (Math.abs(newYaw) > 1 || Math.abs(newPitch) > 1) {
      setHasInteracted(true);
    }
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        background: '#0E0907',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 3D WebGL Canvas Viewport */}
      <PanoramaViewer
        imageSrc="/tulsi-courtyard-360.png"
        projectionMode={projectionMode}
        onHeadingChange={handleHeadingChange}
        onHotspotSelect={setActiveHotspot}
        activeHotspotId={activeHotspot ? activeHotspot.id : null}
        resetTrigger={resetCount}
        zoomInTrigger={zoomInCount}
        zoomOutTrigger={zoomOutCount}
        showHotspots={showHotspots}
        isGyroActive={isGyroActive}
        onGyroSensorDetected={() => {
          // auto confirmed sensor detection
        }}
      />

      {/* TOP BAR OVERLAY */}
      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 40,
          background: 'linear-gradient(to bottom, rgba(14, 9, 7, 0.75) 0%, rgba(14, 9, 7, 0) 100%)'
        }}
      >
        {/* Top-Left Title */}
        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '0.12em',
                color: '#FAF6F0',
                textTransform: 'uppercase',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)'
              }}
            >
              Tulsi Courtyard
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: 12,
                background: 'rgba(200, 90, 42, 0.3)',
                border: '1px solid rgba(229, 168, 75, 0.4)',
                color: '#E5A84B',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}
            >
              360° Experience
            </span>
          </div>
          <span
            style={{
              fontSize: '0.74rem',
              color: 'var(--color-sandstone)',
              opacity: 0.85,
              marginTop: 2,
              letterSpacing: '0.03em'
            }}
          >
            Traditional Haveli Sanctum & Sacred Garden
          </span>
        </div>

        {/* Top-Right Controls */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {/* Projection Mode Switcher Pill */}
          <ProjectionToggle mode={projectionMode} onChange={setProjectionMode} />

          {/* Hotspots Toggle */}
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className="glass-pill"
            title={showHotspots ? 'Hide landmarks' : 'Show landmarks'}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: showHotspots ? '#E5A84B' : 'rgba(250, 246, 240, 0.5)',
              cursor: 'pointer',
              border: '1px solid rgba(238, 219, 204, 0.2)'
            }}
          >
            {showHotspots ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>

          {/* Projection Diagnostic Report Info */}
          <button
            onClick={() => setIsAnalysisModalOpen(true)}
            className="glass-pill"
            title="Inspect Projection & Geometric Validation"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ivory)',
              cursor: 'pointer',
              border: '1px solid rgba(238, 219, 204, 0.2)'
            }}
          >
            <HelpCircle size={17} />
          </button>
        </div>
      </header>

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: 76,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            padding: '8px 18px',
            borderRadius: 24,
            background: 'rgba(20, 14, 11, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(229, 168, 75, 0.4)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            color: '#FAF6F0',
            fontSize: '0.8rem',
            fontWeight: 500,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'fadeInDown 0.3s ease'
          }}
        >
          <Compass size={15} style={{ color: '#E5A84B' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BOTTOM OVERLAY */}
      <footer
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 40,
          background: 'linear-gradient(to top, rgba(14, 9, 7, 0.8) 0%, rgba(14, 9, 7, 0) 100%)'
        }}
      >
        {/* Bottom-Left: "Drag to explore" and Compass */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          {/* Helper hint */}
          <div
            className="glass-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.75rem',
              color: 'var(--color-warm-beige)',
              opacity: hasInteracted ? 0.45 : 0.95,
              transition: 'opacity 0.6s ease',
              width: 'fit-content'
            }}
          >
            <MoveHorizontal size={15} style={{ color: '#E5A84B' }} />
            <span>
              {isGyroActive
                ? 'Device motion active • Move device or drag • Pinch to zoom'
                : 'Drag horizontally or tap Gyro to explore • Pinch to zoom'}
            </span>
          </div>

          {/* Compass / Orientation indicator */}
          <CourtyardCompass
            yaw={yaw}
            pitch={pitch}
            fov={fov}
            onReset={() => setResetCount((c) => c + 1)}
          />
        </div>

        {/* Bottom-Right: Camera controls */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {/* Gyroscope Motion Tracking Button */}
          <button
            onClick={toggleGyro}
            className="glass-pill"
            title={isGyroActive ? 'Disable Device Gyroscope' : 'Follow Device Motion (Gyroscope)'}
            style={{
              padding: '0 14px',
              height: 38,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: isGyroActive ? '#FFFFFF' : 'var(--color-ivory)',
              background: isGyroActive ? 'linear-gradient(135deg, #D46129 0%, #A84116 100%)' : undefined,
              border: isGyroActive ? '1px solid rgba(255, 230, 200, 0.45)' : '1px solid rgba(229, 168, 75, 0.3)',
              boxShadow: isGyroActive
                ? '0 2px 10px rgba(0,0,0,0.4), 0 0 16px rgba(212, 97, 41, 0.5), inset 0 1px 1px rgba(255,255,255,0.3)'
                : undefined,
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              transition: 'all 0.25s ease'
            }}
          >
            <Compass
              size={15}
              style={{
                color: isGyroActive ? '#FFE8D6' : '#E5A84B'
              }}
            />
            <span>{isGyroActive ? 'Gyro Active' : 'Gyro'}</span>
          </button>

          {/* Zoom In */}
          <button
            onClick={() => setZoomInCount((c) => c + 1)}
            className="glass-pill"
            title="Zoom In"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ivory)',
              cursor: 'pointer',
              border: '1px solid rgba(238, 219, 204, 0.2)'
            }}
          >
            <ZoomIn size={17} />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => setZoomOutCount((c) => c + 1)}
            className="glass-pill"
            title="Zoom Out"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ivory)',
              cursor: 'pointer',
              border: '1px solid rgba(238, 219, 204, 0.2)'
            }}
          >
            <ZoomOut size={17} />
          </button>

          {/* Reset Camera to Center */}
          <button
            onClick={() => setResetCount((c) => c + 1)}
            className="glass-pill"
            title="Reset to Central Sanctum"
            style={{
              padding: '0 14px',
              height: 38,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--color-ivory)',
              cursor: 'pointer',
              border: '1px solid rgba(229, 168, 75, 0.3)',
              fontSize: '0.78rem',
              fontWeight: 600
            }}
          >
            <RotateCcw size={15} style={{ color: '#E5A84B' }} />
            <span>Reset</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="glass-pill"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ivory)',
              cursor: 'pointer',
              border: '1px solid rgba(238, 219, 204, 0.2)'
            }}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </footer>

      {/* Selected Hotspot Card */}
      <HotspotCard
        hotspot={activeHotspot}
        onClose={() => setActiveHotspot(null)}
      />

      {/* Projection Technical Report Modal */}
      <ProjectionAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        currentMode={projectionMode}
        onSelectMode={(mode) => {
          setProjectionMode(mode);
          setIsAnalysisModalOpen(false);
        }}
      />
    </div>
  );
}
