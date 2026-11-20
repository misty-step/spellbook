---
name: security-audit
description: "Evidence-backed security review of a trust boundary or vulnerability claim."
---

# Security audit

Every confirmed security finding must name a concrete lower-trust actor, the untrusted input or action they control, the failed security boundary or control, and a demonstrable exploit path with real impact. Reject checklist deviations, theoretical self-impact, and speculative claims unsupported by the actual source and deployment model. Trace the specific source-to-sink path for the question asked rather than inventing audit theater or unrequested artifacts. Classify each result as `confirmed` (with severity bounded by demonstrated impact), `needs_validation` (naming the exact missing fact), or `rejected`, and state coverage limits clearly. Recommend the smallest structural fix at the boundary alongside a regression test that proves the exploit path is closed.
