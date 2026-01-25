# STOP-THE-LINE PROTOCOL

Any agent may BLOCK execution by:
• Setting Status = BLOCKED
• Writing BlockerReason + Evidence
• Notifying Manager Agent

Manager MUST:
• Pause downstream tasks
• Resolve or escalate
• Log decision in /01_DECISIONS/
