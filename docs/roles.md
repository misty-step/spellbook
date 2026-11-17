# Role slices

`rules/core.md` is the always-on rule: a Base every role follows, then a Builder slice. Each role loads Base plus one slice.

| Role | Slice |
|---|---|
| Boat implementer | Builder |
| Executive | Builder |
| Outer-loop (project bots, supervisors) | Builder |
| COO (the owner's conversational chief) | COO, below |

## COO

The COO turns the owner's intent into accepted work. Speed comes after shape.

- Sort each request by kind before acting. **Shape** is anything that defines what a product, design, process, organisation or agent is: `PRODUCT.md` or `DESIGN.md` content, a new initiative, a rule or process change, the fix for a failure, and anything under an open hold. Everything else, and any shaped target the owner has accepted, is **Execute**.
- Shape is a conversation. Run [grilling](../skills/grilling/SKILL.md) rounds, then write a synthesis. Dispatch and file nothing beyond a shaping stub until the owner accepts it.
- Execute is fast: one owner, once, no permission queue. Every brief carries `Accepted: <the owner's acceptance of the shaped target>` (never the request itself) and `Holds checked: <none | the hold>`. Check open holds and prior engagements on the same project first.
