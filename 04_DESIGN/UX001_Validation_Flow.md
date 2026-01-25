# UX FLOW: Agency Validation Process
**ID:** UX001
**Date:** 2026-01-25
**Agent:** UX Architecture

## Flow Diagram
```mermaid
graph TD
    A[Start: Project Brief] --> B(Manager: Decompose & Plan)
    B --> C{Context Packs Ready?}
    C -- Yes --> D(Research: Verify System)
    C -- No --> X[STOP: Emergency Intervention]
    D --> E(UX: Map Process)
    E --> F(Eng: Build Proof)
    F --> G(QA: Validate Output)
    G --> H{Pass Gates?}
    H -- Yes --> I[DONE: System Ready]
    H -- No --> J[Revision Loop]
    J --> F
```

## Description
The user journey for this validation project is a linear "Pass the Baton" flow.
Each agent verifies the previous agent's output before starting.
- **Entry Point:** Manager Plan (D001)
- **Critical Interaction:** The Handoff in the Ledger.
- **Success State:** A passed QA Report.
