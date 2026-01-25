# AgencyOS: Autonomous Multi-Agent Operating System

![System Status](https://img.shields.io/badge/Status-Operational-success)
![Version](https://img.shields.io/badge/Version-2.1-blue)
![Architecture](https://img.shields.io/badge/Architecture-Agentic-purple)

## 🚀 Overview

**AgencyOS** is a sophisticated, file-system-based operating environment designed to orchestrate a team of autonomous AI agents. Unlike traditional project management tools, AgencyOS acts as a "living filesystem" where agents read briefs, perform work, generate artifacts, and hand off tasks autonomously.

The system is visualized and controlled via the **Agency Console**, a cyberpunk-themed React dashboard that provides real-time visibility into the "mind" of the agency (the Status Ledger) and the output of its hands (the Artifacts).

---

## 🏗 System Architecture

The project is structured around a "Conveyor Belt" workflow, where data flows seamlessly from strategy to execution.

```text
/AI_AGENCY
├── 00_BRIEF/           # 📥 Input: Project Scopes & Client Requests
├── 01_DECISIONS/       # 🧠 Strategy: Manager Agent logs & Approvals
├── 02_RESEARCH/        # 🔎 Recon: Market Analysis & User Personas
├── 03_PRODUCT/         # 📝 Specs: User Stories & Requirements
├── 04_DESIGN/          # 🎨 Creative: UI Concepts, Flow Maps, & Assets
├── 05_ENGINEERING/     # ⚙️ Build: Source Code & Implementation Plans
├── 06_QA/              # 🛡 Verify: Test Plans & Quality Gate Reports
├── 07_DEPLOY/          # 🚀 Ship: Release Notes & Production Builds
├── _SYSTEM/            # ⚙️ Kernel: Agent Personas, System Prompts & Tooling
└── MASTER_STATUS_LEDGER.csv  # 🫀 The Heartbeat: Real-time State Database
```

## 🖥 The Agency Console

The **Agency Console** is the GUI for the operating system. It provides:

*   **Project Hub:** A unified view of active initiatives (e.g., "Neon Roots").
*   **Live Activity Stream:** A chronological narrative of agent actions.
*   **Artifact Gallery:** Instant access to generated deliverables (Markdowns, Images, Code).
*   **Visual Status:** Real-time visibility into Quality Gates and Blockers.

### Tech Stack
*   **Frontend:** React 19, Vite, TailwindCSS (Cyberpunk Theme)
*   **Backend:** Lightweight Node.js File System API (`server.js`)
*   **Data:** CSV-based Ledger (`papaparse`) for portability and speed.

---

## ⚡️ Getting Started

To spin up the operating system and view the console:

### 1. Prerequisites
*   Node.js (v18+)
*   npm or yarn

### 2. Installation
Navigate to the console directory and install dependencies:
```bash
cd _SYSTEM/_CONSOLE
npm install
```

### 3. Ignition
Run the backend file server and the frontend interface concurrently:

**Term 1 (API Server):**
```bash
node server.js
# Running on http://localhost:3000
```

**Term 2 (Dashboard):**
```bash
npm run dev
# Running on http://localhost:5173
```

---

## 🔄 Workflow Lifecycle

1.  **Initiation**: A human (Director) drops a markdown brief into `00_BRIEF/`.
2.  **Orchestration**: The **Manager Agent** detects the file, creates a `Project`, and logs initial tasks in the `Ledger`.
3.  **Execution**: Specialist Agents (Research, Design, Eng) pick up tasks from the `READY` column, perform work, and move them to `DONE`.
4.  **Verification**: The **QA Agent** validates outputs against Quality Gates before critical phase transitions.
5.  **Delivery**: Final artifacts are packaged in the Hub for review.

---

## 🔒 License
Private & Confidential.
Built by **Antigravity** for High-Velocity Agentic Workflows.
