import React from 'react';
import { Compass } from 'lucide-react';

interface CourtyardCompassProps {
  yaw: number; // in degrees
  pitch: number;
  fov: number;
  onReset: () => void;
}

export const CourtyardCompass: React.FC<CourtyardCompassProps> = ({ yaw }) => {
  // Determine sector name based on yaw angle
  const getSectorLabel = (angle: number) => {
    // Normalize angle to -180 to 180
    let norm = (angle % 360);
    if (norm > 180) norm -= 360;
    if (norm < -180) norm += 360;

    if (Math.abs(norm) < 18) {
      return { title: 'Central Vrindavan', sub: 'Sacred Sanctum & Rangoli' };
    } else if (norm >= 18 && norm < 55) {
      return { title: 'East Colonnade', sub: 'Shyama Tulsi Pedestals' };
    } else if (norm >= 55 && norm < 120) {
      return { title: 'Eastern Portal', sub: 'Shekhawati Gateway' };
    } else if (norm <= -18 && norm > -55) {
      return { title: 'West Colonnade', sub: 'Rama Tulsi Pedestals' };
    } else if (norm <= -55 && norm > -120) {
      return { title: 'Western Verandah', sub: 'Carved Royal Swing' };
    } else {
      return { title: 'Courtyard Perimeter', sub: 'Colonnaded Walkway' };
    }
  };

  const sector = getSectorLabel(yaw);

  return (
    <div
      className="glass-pill"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 14px',
        borderRadius: 24,
        color: 'var(--color-ivory)',
        fontSize: '0.82rem'
      }}
    >
      {/* Compass Needle */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(229, 168, 75, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <Compass
          size={16}
          style={{
            color: '#E5A84B',
            transform: `rotate(${-yaw}deg)`,
            transition: 'transform 0.1s linear'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.78rem',
            color: '#FAF6F0',
            letterSpacing: '0.02em',
            lineHeight: 1.2
          }}
        >
          {sector.title}
        </span>
        <span
          style={{
            fontSize: '0.68rem',
            color: 'var(--color-sandstone)',
            opacity: 0.8,
            lineHeight: 1.1
          }}
        >
          {sector.sub} ({Math.round(yaw)}°)
        </span>
      </div>
    </div>
  );
};

