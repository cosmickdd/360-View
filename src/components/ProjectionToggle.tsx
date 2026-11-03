import React from 'react';
import { ProjectionMode } from './PanoramaViewer';
import { Globe } from 'lucide-react';

interface ProjectionToggleProps {
  mode: ProjectionMode;
  onChange: (mode: ProjectionMode) => void;
}

export const ProjectionToggle: React.FC<ProjectionToggleProps> = ({ mode, onChange }) => {
  return (
    <div
      className="projection-toggle-bar"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        borderRadius: 30,
        background: 'rgba(18, 12, 10, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(229, 168, 75, 0.28)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45), inset 0 1px 2px rgba(0, 0, 0, 0.5)',
        userSelect: 'none',
      }}
    >
      {/* Smooth Sliding Pill Indicator */}
      <div
        style={{
          position: 'absolute',
          top: 2,
          bottom: 2,
          left: mode === 'sphere' ? 2 : '50%',
          width: 'calc(50% - 2px)',
          borderRadius: 24,
          background: 'linear-gradient(135deg, #D46129 0%, #A84116 100%)',
          border: '1px solid rgba(255, 230, 200, 0.35)',
          boxShadow: `
            0 2px 8px rgba(0, 0, 0, 0.4),
            0 0 16px rgba(212, 97, 41, 0.45),
            inset 0 1px 1px rgba(255, 255, 255, 0.35)
          `,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Option 1: 360° Sphere */}
      <button
        type="button"
        onClick={() => onChange('sphere')}
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          padding: '6px 12px',
          borderRadius: 24,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          outline: 'none',
          color: mode === 'sphere' ? '#FFFFFF' : 'rgba(238, 219, 204, 0.7)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.74rem',
          fontWeight: mode === 'sphere' ? 700 : 500,
          letterSpacing: '0.02em',
          textShadow: mode === 'sphere' ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none',
          transition: 'color 0.25s ease',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          if (mode !== 'sphere') e.currentTarget.style.color = '#FAF6F0';
        }}
        onMouseLeave={(e) => {
          if (mode !== 'sphere') e.currentTarget.style.color = 'rgba(238, 219, 204, 0.7)';
        }}
      >
        <Globe
          size={13}
          style={{
            opacity: mode === 'sphere' ? 1 : 0.75,
            transition: 'opacity 0.2s ease',
            color: mode === 'sphere' ? '#FFE8D6' : 'currentColor',
            flexShrink: 0
          }}
        />
        <span>360° Sphere</span>
      </button>

      {/* Option 2: Curved Panorama */}
      <button
        type="button"
        onClick={() => onChange('curved')}
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          padding: '6px 12px',
          borderRadius: 24,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          outline: 'none',
          color: mode === 'curved' ? '#FFFFFF' : 'rgba(238, 219, 204, 0.7)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.74rem',
          fontWeight: mode === 'curved' ? 700 : 500,
          letterSpacing: '0.02em',
          textShadow: mode === 'curved' ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none',
          transition: 'color 0.25s ease',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          if (mode !== 'curved') e.currentTarget.style.color = '#FAF6F0';
        }}
        onMouseLeave={(e) => {
          if (mode !== 'curved') e.currentTarget.style.color = 'rgba(238, 219, 204, 0.7)';
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: mode === 'curved' ? 1 : 0.75,
            transition: 'opacity 0.2s ease',
            color: mode === 'curved' ? '#FFE8D6' : 'currentColor',
            flexShrink: 0
          }}
        >
          <path d="M2 7c3.5-1.5 7.5-2 10-2s6.5.5 10 2v10c-3.5-1.5-7.5-2-10-2s-6.5.5-10 2V7z" />
        </svg>
        <span>Curved</span>
      </button>
    </div>
  );
};
