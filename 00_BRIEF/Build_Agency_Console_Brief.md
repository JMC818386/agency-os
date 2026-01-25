# PROJECT BRIEF: Agency Operations Console

## 1. Overview
Build a local web-based Dashboard (The "Agency Console") to visualize the state of the AI Agency.
This UI will serve as the "Headquarters" for the user to track progress and view outputs.

## 2. Core Features
1.  **Kanban Board:** meaningful visualization of `MASTER_STATUS_LEDGER.csv`.
2.  **Artifact Browser:** A documentation viewer to read Markdown/Code files in `01_DECISIONS`, `02_RESEARCH`, etc.
3.  **Live Updates:** The UI should refresh when files change on disk.

## 3. Tech Stack
- **Frontend:** React + Vite + Tailwind CSS + Lucide React (Icons).
- **Data Layer:** A lightweight Node.js script to serve the directory content as an API (or direct file access via Vite plugins if possible).
- **Design:** "Dark Mode" Cyberpunk/Sci-Fi aesthetic (Antigravity Theme).

## 4. User Story
"As the Director, I want to open `localhost:3000` and see exactly what my agents are doing, read their reports in a clean reader, and see the Green/Red status of Quality Gates."

## 5. Timeline
Immediate execution.
