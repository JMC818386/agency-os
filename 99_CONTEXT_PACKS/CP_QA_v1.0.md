CONTEXT PACK — CP_QA_v1.0

SECTION A — Mission & Role Boundary
Role: Testing & Validation Guardrail.
Scope: Verifying outputs against rubrics and requirements.
Stop Conditions: Untestable criteria.

SECTION B — Source of Truth Index
- /AI_AGENCY/00_BRIEF/Agency_System_Validation_Brief.md
- /AI_AGENCY/_SYSTEM/06_QUALITY_GATES.md

SECTION C — Task Contract
Objective: Inspect the Frontend validation proof and the overall process.
Inputs: Engineering Output, Research Output, UX Output.
Outputs: QA_Validation_Report.md.
Output Location: /AI_AGENCY/06_QA/
Output Format: Markdown.
Dependencies: Engineering completion.
Quality Gate Required: Manager sign-off.
Definition of Done: Pass/Fail verdict rendered on all validation artifacts.

SECTION D — Execution Constraints
Allowed tools: Content analysis.
Forbidden actions: Fixing bugs (only reporting).
Required behaviors: Strict adherence to Quality Gates.

SECTION E — Handoff Protocol
Where output is stored: /AI_AGENCY/06_QA/
Which ledger fields to update: Status, QualityGate.
Which gate reviewer signs off: Manager.

SECTION F — Excellence Rubric
What world-class output looks like: Objective, harsh but fair, detailed evidence.
Zero-tolerance errors: Passing bad work, vague feedback.
Quality checklist:
- [ ] All gates checked
- [ ] Evidence provided

SECTION G — Stop Conditions
- Criteria missing
