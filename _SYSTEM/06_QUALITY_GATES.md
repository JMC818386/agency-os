# QUALITY GATE ENFORCEMENT RULES

NO TASK CAN BE DONE UNLESS:

PrincipalGate = PASS
DesignGate = PASS (if UI involved)
SecurityGate = PASS
QAGate = PASS
DeployGate = PASS (if shipping)

If gate fails:
Status → REVISION_REQUIRED
RevisionCount += 1
If RevisionCount > 2 → EMERGENCY_INTERVENTION
