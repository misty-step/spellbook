import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { lintPlugin } from "./verify-plugin";

const repoRoot = resolve(import.meta.dir, "..");
const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture() {
	const scratch = process.env.TMPDIR ?? join(homedir(), ".cache/tmp");
	mkdirSync(scratch, { recursive: true });
	const root = mkdtempSync(join(scratch, "mistystack-plugin-test-"));
	tempDirs.push(root);
	const put = (rel: string, content: string) => {
		const dest = join(root, rel);
		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, content);
	};
	put("rules/core.md", "---\ntrigger: always_on\nalwaysApply: true\n---\n# Core\n\n- Keep it lean.\n");
	put("skills/misty/SKILL.md", "---\nname: misty\ndescription: \"Core loop.\"\n---\n# Misty\n\nVerify on the real artifact.\n");
	put(
		".claude-plugin/plugin.json",
		JSON.stringify({
			name: "mistystack",
			skills: "./skills",
			hooks: { SessionStart: [{ hooks: [{ type: "command", command: 'cat "${CLAUDE_PLUGIN_ROOT}/rules/core.md"' }] }] },
		}),
	);
	put(
		".claude-plugin/marketplace.json",
		JSON.stringify({
			name: "mistystack",
			owner: { name: "Misty Step" },
			plugins: [{ name: "mistystack", source: "./" }],
		}),
	);
	put(".agents/skills.json", JSON.stringify({ entries: [{ path: "skills" }] }));
	put(".agents/rules.json", JSON.stringify({ entries: [{ path: "rules" }] }));
	put("package.json", JSON.stringify({ name: "mistystack", version: "0.5.7", pi: { skills: ["./skills"] } }));
	return { root, put };
}

test("current lean repository passes strict plugin lint with 7 skills", () => {
	const report = lintPlugin(repoRoot, true);
	expect(report.errors).toEqual([]);
	expect(report.warnings).toEqual([]);
	expect(report.skillCount).toBe(7);
});

test("rejects personal names, external companion packs, oversized core, and broken links", () => {
	const { root, put } = makeFixture();
	put("skills/misty/SKILL.md", "---\nname: misty\ndescription: \"Core.\"\n---\nAsk Phaedrus and read [missing](nope.md).\n");
	put(
		".claude-plugin/marketplace.json",
		JSON.stringify({
			name: "mistystack",
			owner: { name: "Misty Step" },
			plugins: [
				{ name: "mistystack", source: "./" },
				{ name: "pstack", source: { source: "github", repo: "cursor/plugins", sha: "a".repeat(40) } },
			],
		}),
	);
	const report = lintPlugin(root, true);
	expect(report.errors.some((e) => e.includes("personal names"))).toBe(true);
	expect(report.errors.some((e) => e.includes("missing reference"))).toBe(true);
	expect(report.errors.some((e) => e.includes("only the local mistystack plugin"))).toBe(true);
});
