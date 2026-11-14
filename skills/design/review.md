# Real-surface review

Misty Step adaptation of [Impeccable's critique, polish and audit checks](https://github.com/pbakaus/impeccable/tree/5adaee704634e9031ec8943721c4ffa1a3c22221/.agents/skills/impeccable/reference)
and our visual-state-review method. No upstream launcher or
detector is required. [Sources and licenses](sources.md).

## Capture named states

1. **Inventory before capture.** Declare a named-state matrix of affected routes,
   roles and states: loading, empty, error, success, disabled, permission-limited and long-content
   where reachable. Include supported widths, light/dark, relevant scroll positions
   and overlays. Use stable names such as `settings-error-narrow-dark-top` and
   record the URL, revision, viewport, theme, data/role and steps to reach each.
   Cover behavior touched by shared components, not just the edited route.
2. **Drive the product.** Use your harness's browser automation; read its API
   instructions before first use. Open a dedicated tab,
   observe, interact and wait for the expected state, then screenshot it. Test
   through the real login and controls rather than injecting DOM to manufacture
   success. Emulation proves the emulated condition, not a physical-device test.
   For native or non-browser artifacts, use the running target surface and its
   native capture tool; a web approximation is not native proof.
   An unreachable state stays explicitly unverified in the matrix with its reason.
3. **Inspect every capture.** Look at the image, not just its filename or DOM.
   Check clipping, overlays, overflow, contrast, empty regions, wrong state and
   copy. Inspect every capture at full size.
   Exercise keyboard/focus and the changed behavior in addition to taking images.
   For motion, follow [motion.md](motion.md); static endpoints are insufficient.

## Critique, then polish

Judge the user's task and hierarchy before counting small style defects. A clean
automated scan is evidence about its rules, not visual quality. Within scope,
fix blocked tasks and misleading states first, then hierarchy/responsiveness,
then visual inconsistency. Preserve the incumbent identity during polish.

For dense monitoring or status surfaces, give a cold observer the user's real task
without explaining the interface. Test whether they understand what is happening
and can complete the task before polishing.

| Check | Evidence to inspect |
| --- | --- |
| Hierarchy | Primary information/action appears first at each size; secondary detail is disclosed; remove redundant labels before adding explanatory copy. |
| System | Shared spacing, type roles, components and semantic color tokens match adjacent flows in both themes; declared `DESIGN.md` fonts, radii, spacing and semantic tokens match computed styles on the rendered surface, with no orphaned font or token assets. |
| Content | Long/missing/localized text and accessible units remain readable; factual claims stay true; errors explain the cause and recovery; reject leaked internal spec identifiers (e.g., `"Law 7"`), storage column CSV inputs, raw enum slugs and opaque UUIDs in user-facing copy. |
| Keyboard | Logical tab order, visible focus, operable controls, dismissal and focus return; no keyboard trap. |
| Semantics | Correct roles, names and states; heading/landmark structure; form labels and error association; useful image alternatives. |
| Contrast | Measure text and control/focus contrast in both themes and changed states against the applicable WCAG AA criterion; color alone does not carry meaning. |
| Responsive/input | Narrow, intermediate and wide layouts; zoom/reflow; usable touch targets; real drag/scroll and cancellation, not only a mobile-sized screenshot. |
| Feedback | Loading, empty, error, success and permission states connect to the user's next action; reduced motion keeps state changes understandable. |
| Stability | No unexpected layout shift, console errors or visible frame loss on the affected journey; inspect a trace when diagnosing performance. |

## Review result

For each finding: consumer impact, named state, observed evidence, location and
smallest repair. Follow [Misty's reporting rules](../misty/SKILL.md#reporting); separate code-derived concerns
from defects observed on the surface. Keep capture output outside Git. Link the
checked revision and captures/recordings in the repository's existing evidence channel.
Required missing coverage prevents a pass.

Record these outcomes separately, each with its own check and result:

- **UX:** Can the user complete and understand the task more easily, including
  keyboard/accessibility and recovery?
- **DX:** Is the change simpler to implement and maintain through the existing
  components, tokens and documented interfaces?
- **AX:** Can an authorized agent discover, operate and verify the behavior through
  the product's documented scriptable interface, with clear names and errors?

Pass only when UX, DX and AX improve together and existing behavior still works.
Missing access or an unsupported capture path is a precise verification gap,
not evidence of a pass. State what was exercised and what remains unverified.
