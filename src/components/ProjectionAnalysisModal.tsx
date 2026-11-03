import React from 'react';
import { X, CheckCircle, AlertTriangle, Layers, Info } from 'lucide-react';
import { ProjectionMode } from './PanoramaViewer';

interface ProjectionAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: ProjectionMode;
  onSelectMode: (mode: ProjectionMode) => void;
}

export const ProjectionAnalysisModal: React.FC<ProjectionAnalysisModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 6, 5, 0.8)',
        backdropFilter: 'blur(8px)',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          borderRadius: 16,
          overflowY: 'auto',
          padding: 24,
          position: 'relative',
          color: 'var(--color-ivory)',
          border: '1px solid rgba(229, 168, 75, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            background: 'rgba(238, 219, 204, 0.1)',
            border: 'none',
            color: 'var(--color-ivory)',
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(200, 90, 42, 0.25)',
              border: '1px solid rgba(229, 168, 75, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E5A84B'
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.25rem',
                color: '#FAF6F0',
                letterSpacing: '0.04em'
              }}
            >
              Panoramic Projection Analysis
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-sandstone)', opacity: 0.85 }}>
              Reference Asset: public/tulsi-courtyard-360.png (1774 × 887)
            </p>
          </div>
        </div>

        {/* Technical Validation Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 20
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(238, 219, 204, 0.12)'
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--color-warm-beige)', opacity: 0.75 }}>
              Aspect Ratio
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FAF6F0', marginTop: 2 }}>
              2.00 : 1.00
            </div>
            <div style={{ fontSize: '0.7rem', color: '#81C784', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <CheckCircle size={12} /> Standard 2:1 Width
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(238, 219, 204, 0.12)'
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--color-warm-beige)', opacity: 0.75 }}>
              Left-Right Seam
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FAF6F0', marginTop: 2 }}>
              Discontinuous
            </div>
            <div style={{ fontSize: '0.7rem', color: '#FFB74D', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <AlertTriangle size={12} /> Swing (L) vs Doorway (R)
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(238, 219, 204, 0.12)'
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--color-warm-beige)', opacity: 0.75 }}>
              Poles (Zenith/Nadir)
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FAF6F0', marginTop: 2 }}>
              Planar Framing
            </div>
            <div style={{ fontSize: '0.7rem', color: '#FFB74D', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <AlertTriangle size={12} /> Rectilinear, no pinch
            </div>
          </div>
        </div>

        {/* In-depth Findings */}
        <div
          style={{
            padding: 14,
            borderRadius: 10,
            background: 'rgba(200, 90, 42, 0.1)',
            border: '1px solid rgba(200, 90, 42, 0.3)',
            marginBottom: 20,
            fontSize: '0.85rem',
            lineHeight: 1.5,
            color: 'var(--color-ivory)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#E5A84B', marginBottom: 6 }}>
            <Info size={16} /> Engineering Assessment:
          </div>
          <p style={{ opacity: 0.9 }}>
            While this asset matches the 2:1 aspect ratio of traditional equirectangular images, the courtyard
            architecture represents a <strong>wide rectilinear panoramic arc (~200° horizontal field of view)</strong>.
            The nadir floor and zenith canopy do not converge to polar mathematical points, and the left edge
            features a hanging swing while the right edge depicts an interior doorway.
          </p>
        </div>

        {/* Projection Mode Switcher */}
        <h3
          style={{
            fontSize: '0.95rem',
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.05em',
            color: '#FAF6F0',
            marginBottom: 10
          }}
        >
          Select Active Projection Surface:
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Mode 1: Inward 360° Sphere (Primary / Default) */}
          <div
            onClick={() => onSelectMode('sphere')}
            style={{
              padding: 14,
              borderRadius: 12,
              border: `2px solid ${currentMode === 'sphere' ? '#E5A84B' : 'rgba(238, 219, 204, 0.15)'}`,
              background: currentMode === 'sphere' ? 'rgba(229, 168, 75, 0.15)' : 'rgba(0,0,0,0.25)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              transition: 'all 0.2s ease'
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: `2px solid ${currentMode === 'sphere' ? '#E5A84B' : 'rgba(238, 219, 204, 0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2
              }}
            >
              {currentMode === 'sphere' && (
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E5A84B' }} />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FAF6F0' }}>
                  Inward 360° Spherical Projection
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: 'rgba(212, 97, 41, 0.3)',
                    border: '1px solid rgba(229, 168, 75, 0.4)',
                    color: '#E5A84B',
                    fontWeight: 700,
                    letterSpacing: '0.04em'
                  }}
                >
                  360° IMMERSIVE
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-sandstone)', marginTop: 4, lineHeight: 1.45 }}>
                Wraps the courtyard inside a continuous Three.js sphere with inverted normals for seamless 360° exploration in all directions.
              </p>
            </div>
          </div>

          {/* Mode 2: Curved Cylinder */}
          <div
            onClick={() => onSelectMode('curved')}
            style={{
              padding: 14,
              borderRadius: 12,
              border: `2px solid ${currentMode === 'curved' ? '#E5A84B' : 'rgba(238, 219, 204, 0.15)'}`,
              background: currentMode === 'curved' ? 'rgba(229, 168, 75, 0.15)' : 'rgba(0,0,0,0.25)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              transition: 'all 0.2s ease'
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: `2px solid ${currentMode === 'curved' ? '#E5A84B' : 'rgba(238, 219, 204, 0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2
              }}
            >
              {currentMode === 'curved' && (
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E5A84B' }} />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FAF6F0' }}>
                  Curved Cylindrical Panorama
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-sandstone)', marginTop: 4, lineHeight: 1.45 }}>
                Preserves original architectural proportions on an expansive 260° cylindrical viewing surface with smooth bounded horizontal exploration.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #C85A2A, #A2421B)',
              border: '1px solid rgba(229, 168, 75, 0.4)',
              color: '#FAF6F0',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Apply & Return to Courtyard
          </button>
        </div>
      </div>
    </div>
  );
};
