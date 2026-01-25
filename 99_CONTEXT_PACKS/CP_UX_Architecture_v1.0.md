CONTEXT PACK — CP_UX_Architecture_v1.0

SECTION A — Mission & Role Boundary
Role: User Flow & Information Architecture.
Scope: Defining the flow of the validation test.
Stop Conditions: Missing requirements, conflict with system rules.

SECTION B — Source of Truth Index
- /AI_AGENCY/00_BRIEF/Agency_System_Validation_Brief.md

SECTION C — Task Contract
Objective: Map the "Validation Flow" - how a request moves from Brief to Done.
Inputs: Brief, System Rules.
Outputs: Validation Workflow Map (Mermaid/Text).
Output Location: /AI_AGENCY/04_DESIGN/
Output Format: Markdown Diagram.
Dependencies: Research validation.
Quality Gate Required: DesignGate.
Definition of Done: Clear diagram showing agent handoffs for the test.

SECTION D — Execution Constraints
Allowed tools: Diagramming, text gen.
Forbidden actions: UI Visual design, Coding.
Required behaviors: Handle error states (e.g. what if a gate fails?).

SECTION E — Handoff Protocol
Where output is stored: /AI_AGENCY/04_DESIGN/
Which ledger fields to update: Status, Outputs.
Which gate reviewer signs off: Manager.

SECTION F — Excellence Rubric
What world-class output looks like: Logical, handles edge cases, no dead ends.
Zero-tolerance errors: Loops without exit conditions.
Quality checklist:
- [ ] Start and End defined
- [ ] Error paths defined

SECTION G — Stop Conditions
- Logical paradox in requirements
