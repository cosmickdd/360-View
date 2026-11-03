import React from 'react';
import { X, Sparkles, Sprout, Landmark, Bell } from 'lucide-react';
import { Hotspot } from './PanoramaViewer';

interface HotspotCardProps {
  hotspot: Hotspot | null;
  onClose: () => void;
}

export const HotspotCard: React.FC<HotspotCardProps> = ({ hotspot, onClose }) => {
  if (!hotspot) return null;

  const getCategoryIcon = (category: Hotspot['category']) => {
    switch (category) {
      case 'sanctum':
        return <Sparkles size={18} style={{ color: '#E5A84B' }} />;
      case 'nature':
        return <Sprout size={18} style={{ color: '#81C784' }} />;
      case 'heritage':
        return <Bell size={18} style={{ color: '#FFB74D' }} />;
      case 'architecture':
        return <Landmark size={18} style={{ color: '#DDB892' }} />;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 84,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '92%',
        maxWidth: 440,
        zIndex: 50,
        animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        className="glass-panel"
        style={{
          borderRadius: 16,
          padding: '18px 20px',
          border: '1px solid rgba(229, 168, 75, 0.35)',
          color: 'var(--color-ivory)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(238, 219, 204, 0.1)',
            border: 'none',
            color: 'var(--color-ivory)',
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={15} />
        </button>

        {/* Header with Icon and Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(229, 168, 75, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {getCategoryIcon(hotspot.category)}
          </div>
          <div>
            <h4
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.05rem',
                color: '#FAF6F0',
                letterSpacing: '0.03em',
                lineHeight: 1.2
              }}
            >
              {hotspot.title}
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#E5A84B', opacity: 0.9 }}>
              {hotspot.subtitle}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: '0.82rem',
            lineHeight: 1.5,
            color: 'var(--color-sandstone)',
            opacity: 0.92,
            marginTop: 8
          }}
        >
          {hotspot.description}
        </p>

        {/* Subtle decorative bottom border */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 8,
            borderTop: '1px solid rgba(238, 219, 204, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.7rem',
            color: 'rgba(250, 246, 240, 0.6)'
          }}
        >
          <span>Bearing: {hotspot.yaw}°</span>
          <span style={{ color: 'var(--color-warm-beige)' }}>Traditional Haveli Architecture</span>
        </div>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
};

