---
name: bakeoff
description: "When exploring a design or implementation with no settled answer, to send one brief to several frontier models on their native harnesses and have the owner judge the outputs blind."
metadata:
  owner: phaedrus
  prevents: "One provider's defaults and habits standing in for the best answer; MIS-1283 (2026-11-18): the owner's 5 favorite evidence pages out of 15 came from two of three models, and no single seat had been chosen with evidence."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-18"
---

# Bake-off

Use a bake-off for exploration: a design first, and an implementation when the shape is still open. Several models get the same brief, each runs on its own vendor's harness, and the owner picks without knowing who made what. This breaks the habits of any one provider. Each result becomes evidence for the [routing reference](../misty/routing.md). Don't use one for a slice with a clear brief; that goes to one seat from the routing table.

1. **Brief.** Write one outcome brief: what to make, who reads it, the real source material, hard requirements, and how the model knows it is done. Ask for range. Each model should give two to five distinct options, so you are judging ideas and not one draft per vendor. Then rewrite the brief in each lab's prompting style while keeping the outcome identical. Done when every lane's prompt asks for the same deliverables, checked side by side.

2. **Lanes.** By default use every Frontier model in the [routing reference](../misty/routing.md#model-tiers), each in its own harness: Claude in Claude Code, OpenAI in Codex, Gemini in Antigravity. Give each lane its own fresh worker under [boat-workers](../boat-workers/SKILL.md). Probe each lane with one tiny call before the real run. If `boat prompt` doesn't list a model, run the vendor CLI directly on the worker. Record which harness, model and effort actually ran. Never switch seats mid-run; a stalled lane is missing evidence, not a loss (see [stalls](../misty/routing.md#stalls-and-handoffs)). Done when every lane has finished or its gap is recorded.

3. **Blind gallery.** Shuffle all the outputs and number them from 1 to N. Show each output's number large on the output itself. Give it a metadata block that doesn't identify the model: the item, the brief version and the run date. Outputs must not name their model, harness or vendor. Keep the key (number, model, harness, effort, item) outside the gallery and outside every repository the reviewer opens. Publish one index that links every output, with both themes and phone widths checked. Done when every output opens from the index and a probe finds no identifying names.

4. **Pick.** The owner marks likes and dislikes by number, with a sentence on why if they have one. Only after the pick, join the picks to the key. Then republish with each output's model, harness and effort added to its metadata block, so the reveal sits on the output itself. Done when every number has a verdict (like, dislike or no opinion) and the reveal is published.

5. **Record.** Append the result to the owner's durable taste record in Supercortex, at `taste/bakeoffs.md`. Include the date, the brief, the lanes as they ran, each number's verdict and model, and the owner's own words. Then add one dated **observed** line to [routing.md](../misty/routing.md#bake-off-results) under Bake-off results, with the counts and a link to the record. A single bake-off is one data point: say so, and don't change a seat on one result unless the owner asks. Done when both entries are pushed and link to each other.

Build the winner from the liked outputs. Carry the owner's reasons into the build brief. Also carry anything the disliked outputs taught you.
