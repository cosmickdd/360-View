# Tulsi Courtyard — Immersive 360° Interactive Experience

An independent, standalone, high-performance WebGL / Three.js 360° Indian courtyard experience designed to immerse the user inside an authentic sandstone haveli sanctum with a sacred Tulsi garden.

Built with **React**, **Vite**, **TypeScript**, and **Three.js**.

---

## 🏛️ Project Architecture & Overview

### 1. The Reference Environment
- **Source Asset**: `public/tulsi-courtyard-360.png` (Dimensions: `1774 × 887`, Aspect Ratio: `2:1`).
- **Sanctum Features**:
  - Central **Chaumukha Tulsi Vrindavan** shrine with a glowing brass ghee diya and hand-drawn rice-flour marigold rangoli.
  - Handcrafted **teakwood courtyard jhula (swing)** with cast-brass bells under vibrant bougainvillea vines.
  - Carved sandstone pillars, octagonal Tulsi pedestals, and Jali lattice stonework.
  - Shekhawati arched inner gateway with warm oil lamp illumination.

---

## 📐 Projection Geometry & Equirectangular Validation

A `2:1` aspect ratio is standard for equirectangular panoramas, but **does not automatically guarantee that an image is a true 360° spherical projection**. We performed rigorous geometric and photographic validation:

| Dimension / Metric | Measured Value | Analysis & Finding |
|---|---|---|
| **Aspect Ratio** | `1774 × 887` (2.0:1) | Matches standard 2:1 panoramic format. |
| **Zenith / Canopy** | Planar framing | Lacks polar singular convergence (zenith pinch). |
| **Nadir / Floor Tiles** | Rectilinear flagstones | Ground plane maintains horizontal grid rather than converging to a single nadir pole. |
| **Left-Right Seam** | Discontinuous (avg diff ~41.5 RGB) | Left boundary features a suspended swing; right boundary features an interior doorway. |
| **Effective Arc** | ~200° horizontal FOV | Represents an expansive rectilinear panoramic courtyard arc rather than a full 360° spherical capture. |

### Dual Surface Solution:
To honour the instruction (*"Never stretch the image onto a sphere incorrectly. Build a curved panoramic viewing surface... Keep the rendering architecture replaceable with a proper equirectangular image later"*), the viewer implements two swappable projection surfaces:

1. **Curved Cylindrical Panorama (`curved`) — Recommended**:
   - Maps the texture onto the interior of an inverted cylindrical arc matching the exact 2:1 aspect ratio and ~200° courtyard span.
   - Preserves vertical architectural lines of pillars and stone arches with zero polar distortion.
   - Bounded horizontal yaw (±94°) with smooth damping and edge resistance.
2. **Inward 360° Spherical Projection (`sphere`)**:
   - Maps the texture onto an inverted Three.js sphere (`scale(-1, 1, 1)`).
   - Allows continuous 360° circular yaw rotation.
   - Ready for instant drop-in replacement when a full 360° equirectangular HDRI is provided.

---

## 🎮 Camera Controls & Interaction

- **Horizontal Drag / Swipe**: Smooth yaw rotation with natural velocity tracking and momentum inertia.
- **Vertical Drag / Swipe**: Natural pitch looking up and down with clamped bounds (preventing upside-down camera flipping).
- **Pinch-to-Zoom (Touch)**: Intuitive two-finger distance gesture scaling FOV between `42°` (close-up detail) and `82°` (expansive courtyard view).
- **Mouse Wheel (Desktop)**: Smooth zoom scaling.
- **Reset View**: Smooth animated return to the central Tulsi Vrindavan sanctum (`yaw: 0°, pitch: 0°, fov: 65°`).
- **Inertia & Damping**: Exponential lerp damping (`lerpFactor = 1 - Math.exp(-12 * delta)`) with friction decay on release.
- **Interactive 3D Heritage Hotspots**: Screen-projected beacons for key sanctum landmarks (Central Vrindavan, Royal Jhula, Rama Tulsi, Shyama Tulsi, Shekhawati Gateway) with rich contextual lore cards.
- **Courtyard Compass**: Live heading indicator showing the courtyard sector you are facing.
- **Fullscreen Mode**: One-tap toggle for immersive full-screen display.

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Development
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit `http://localhost:3000` (or the port Vite outputs) in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## 🎨 Color Palette & Aesthetic

- **Warm Ivory / Cream**: `#FAF6F0`, `#F5EFEB`
- **Terracotta & Sandstone**: `#C85A2A`, `#DDB892`, `#A2421B`
- **Sacred Flame Gold**: `#E5A84B`
- **Deep Charcoal / Shadow**: `#1F1714`, `#0E0907`
- **Typography**: *Cinzel* (classical serif for heritage branding) & *Plus Jakarta Sans* (clean readable UI).

