# Interstellar Logistics Command Center (Project: DEEP_SPACE)

**Client:** United Earth Trade Federation (UETF)
**Clearance:** Level 3 (Restricted)
**Target Platform:** React Web App (PWA) + Node.js Telemetry Server

## 1. Executive Summary
The UETF requires a mission-critical logistics dashboard to manage the flow of He3 (Helium-3) and Rare Earth Elements between the Mars Colony, the asteroid belt (Ceres Station), and Earth Orbit. This system must handle real-time tracking of automated cargo drones, predict fuel consumption based on orbital mechanics, and alert operators to piracy risks or mechanical failures.

## 2. Core Functional Requirements

### A. The "Orrery" (Live Route Map)
- **Visualization:** A 2D, top-down view of the inner solar system (Earth, Mars, Belt).
- **Entities:** Ships must be represented as vector icons with directional headers.
- **Interactivity:** Clicking a ship shows its manifest, velocity, and ETA.
- **Physics:** Basic orbital paths must be visualized (ellipses).

### B. Cargo Manifest System
- **Data Structure:** Each ship carries multiple containers.
- **Types:**
    - `Class A`: Life Support (Oxygen, Water) - High Priority.
    - `Class B`: Construction Materials (Steel, Polymer).
    - `Class C`: Luxury Goods (Earth Coffee, Chocolate).
- **Search:** Operators must be able to filter ships by cargo type.

### C. Fuel & Physics Calculator
- **Input:** Ship Mass (kg) + Destination Distance (Au).
- **Output:** Required Delta-V (km/s) and Fuel Mass.
- **Safety:** Alert if current fuel is below required + 10% safety margin.

### D. Emergency Protocols
- **"Red Alert" Mode:** One-click toggling of the entire UI into Emergency Mode (Red/Black high contrast).
- **Broadcasting:** Ability to send an encrypted "SOS" signal which locks the manifest from external viewing.

## 3. Design Specifications (The "Expanse" Aesthetic)
- **Visual Style:** Utilitarian, Industrial, High-Contrast.
- **Color Palette:**
    - Background: Void Black (`#050505`)
    - Primary: Safety Orange (`#FF5722`) for tracks.
    - Secondary: Hull White (`#E0E0E0`) for text.
    - Alert: Critical Red (`#FF0033`).
- **Typography:** `Roboto Mono` or `Share Tech Mono` for all data. Uppercase headers.
- **Micro-Interactions:** Subtle CRT scanline effects or "glitch" animations on data loads.

## 4. Technical Constraints
- **Frontend:** React 18+ with Vite.
- **State Management:** Local state is fine, or simple Context.
- **Data Source:** Simulated internal JSON generator (no real backend required for Phase 1, but structure it as if fetching from an API).
- **Performance:** Must render 100+ moving entities at 60fps.

## 5. Deliverables Expected
1.  **Architecture:** A `Wireframes.json` defining the layout and component hierarchy.
2.  **Design Tokens:** A `tokens.json` defining the strict color system.
3.  **Codebase:** A fully functional React app in `src/` that can be run via `npm run dev`.
4.  **Test Report:** A markdown file confirming the Fuel Calculator accuracy.
