# Grading a recompile round

[Recompile](SKILL.md) uses this to judge rebuilds, and live production, against
`SPEC.md` and the running product. Every rebuild in the first Conductor round
passed its own tests while hiding defects that only a separate verify run found.
Different graders gave counts that could not be compared, and production was
never verified on the same terms. Each step below closes one of those gaps.

## 1. Before the builds

- Write the **acceptance list**: one black-box check per observable requirement
  or invariant in `SPEC.md`, each stated as a command or user journey on the real
  consumer surface. Freeze it for the round in the round's record. `SPEC.md`
  carries no requirement numbers.
- Mark the **critical** items: invariants, security, privacy, authorization and
  data survival.
- Give every seat the same `SPEC.md` revision, the same prompt and the same
  [seat inputs](SKILL.md), in a fresh sandbox with no repository history.
- Record each seat's harness, model and effort, its true wall clock, tokens and
  cost.

## 2. Gates

Grade **live production as one more candidate** on exactly the same terms.

1. **Runs.** The candidate builds, starts on the real target runtime through its
   production entry point and completes one critical journey. A candidate that
   fails this cannot cut over, whatever else it scores.
2. **Conforms.** Each acceptance item gets pass, fail, partial or n/a, with the
   command and output as evidence. **One grader set grades every candidate**,
   production included: two graders from different model families, neither
   grading its own build. When they disagree, run the check again and record
   what it shows. Do not average the two verdicts.
3. **No critical failure.** A failed critical item blocks cutover regardless of
   the total.
4. **Blind quality.** At least three reviewers from different families score
   design, readability, spec fidelity and tests from 1 to 5, under random
   letters, never their own build. Report the mean and the spread for each.

Report source lines, test lines, dependencies, wall clock, tokens and cost
beside the scores without scoring them. When conformance is equal, prefer the
smaller system.

## 3. Classify and decide

- **Classify every failure.** A *spec gap* means `SPEC.md` is silent or reads two
  ways; amend `SPEC.md`, and the amendment triggers the next round. A *builder
  defect* stays with that candidate.
- **Infrastructure failures** (usage limit, hang, dropped stream) get one rerun.
  If it fails again, report the result as missing, never as zero.
- **Replace production** only when the candidate runs, has no critical failure,
  scores at or above production on conformance under the same graders, is no
  worse on blind quality, and its cutover passes the dry run, refusal and
  reversal of [recompile step 4](SKILL.md). Otherwise keep production.
- Record the scores, spec gaps, decision and next review date under
  [recompile step 5](SKILL.md).
