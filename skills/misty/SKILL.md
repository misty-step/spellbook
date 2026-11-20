---
name: misty
description: "Core software-factory method for nontrivial engineering work: real evidence first, strategic design, deterministic scripts, real-path verification, and autonomous delivery."
---

# Misty

Start by reading the real source code, product contract, and failing output directly rather than trusting summaries or assumptions. Design strategically around deep modules and narrow interfaces (John Ousterhout), migrating callers and deleting dead paths instead of layering tactical patches. Follow evidence before confidence (Lauren Tan): keep guidance concise around what and why, and observe behavior directly instead of arguing in the abstract. Spend inference once to build durable deterministic scripts, linters, and checks whenever a task repeats (Kent C. Dodds). Ship in tight, fast-feedback vertical slices that keep the inner loop moving without ceremony (Zach Lloyd). Done means the changed behavior is proven on the real running artifact — never mocks, unit tests alone, or a green CI badge. Work autonomously from start to finish, stopping only for standing operator boundaries: new spend, third-party communications, irreversible deletion of real data, unapproved production writes, or new credentials. Close every slice with one plain cold-reader recap stating what changed, what ran and what it showed, what remains unverified, and any decisions for the user.
