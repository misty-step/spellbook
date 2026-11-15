import { afterEach, expect, test } from "bun:test";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { lintPlugin, verifyAvailableInstalls, verifyNativeInstall } from "./verify-plugin";

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
	const scratch = process.env.TMPDIR ?? join(homedir(), ".cache/tmp");
	mkdirSync(scratch, { recursive: true });
	const root = mkdtempSync(join(scratch, "plugin-lint-"));
	roots.push(root);
	const put = (path: string, content: string) => {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), content);
	};
	const skill = (name: string, body = "Run the owned check.") => `---\nname: ${name}\ndescription: "When changing the consumer path."\n${name.startsWith("principle-") || name === "recompile" || name === "setup-mistystack" || name === "coordinator" ? "disable-model-invocation: true\n" : ""}metadata:\n  owner: phaedrus\n  prevents: "A recorded consumer failure."\n  source: "owner/repo@0123456789abcdef/source"\n  sunset: "2026-11-27"\n---\n${body}\n`;
	put("skills/misty/SKILL.md", skill("misty"));
	put("rules/core.md", "---\ntrigger: always_on\nalwaysApply: true\n---\n# Core\n\n- Load misty.\n");
	put("assets/logo.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"></svg>\n');
	const json = (path: string, value: unknown) => put(path, `${JSON.stringify(value)}\n`);
	const hooks = (variable: string) => ({ SessionStart: [{ hooks: [{ type: "command", command: `cat "$${variable}/rules/core.md"` }] }] });
	json(".claude-plugin/plugin.json", { name: "mistystack", agents: ["./adapters/claude/agents/fixture.md"], hooks: hooks("CLAUDE_PLUGIN_ROOT") });
	json(".claude-plugin/marketplace.json", { name: "mistystack", owner: { name: "Fixture owner" }, plugins: [{ name: "mistystack", source: "./" }] });
	json(".codex-plugin/plugin.json", { name: "mistystack", version: "1.0.0", skills: "./skills/", hooks: "./adapters/codex/hooks.json" });
	json(".antigravity-plugin/plugin.json", { name: "mistystack", version: "1.0.0", logo: "assets/logo.svg", skills: "skills" });
	json(".agents/skills.json", { entries: [{ path: "skills" }] });
	json(".agents/rules.json", { entries: [{ path: "rules" }] });
	json(".agents/plugins/marketplace.json", {
		name: "mistystack",
		plugins: [{ name: "mistystack", source: { source: "local", path: "./" }, policy: { installation: "AVAILABLE", authentication: "ON_USE" }, category: "Productivity" }],
	});
	json("adapters/codex/hooks.json", { hooks: hooks("PLUGIN_ROOT") });
	json("package.json", { name: "mistystack", version: "1.0.0", keywords: ["pi-package"], pi: { skills: ["./skills"], extensions: ["./adapters/pi/core.ts"] } });
	put("adapters/claude/agents/fixture.md", "---\nname: fixture\ndescription: Fixture worker.\n---\nComplete the assigned task.\n");
	put("adapters/pi/core.ts", 'import { readFileSync } from "node:fs";\nexport default function core(pi) {\nconst core = readFileSync(new URL("../../rules/core.md", import.meta.url), "utf8");\npi.on("before_agent_start", event => ({ systemPrompt: `${event.systemPrompt}\\n${core}` }));\n}\n');
	return { root, put, skill, json };
}

test.each([
	".claude-plugin/plugin.json", ".claude-plugin/marketplace.json",
	".codex-plugin/plugin.json", ".antigravity-plugin/plugin.json",
	".agents/plugins/marketplace.json", ".agents/skills.json", ".agents/rules.json",
	"package.json",
])("requires a JSON object at native manifest %s", file => {
	const { root, put } = fixture();
	put(file, "{");
	expect(lintPlugin(root).errors.some(error => error.startsWith(`${file}:`))).toBe(true);
	put(file, "[]\n");
	expect(lintPlugin(root).errors).toContain(`${file}: must be a JSON object`);
	rmSync(join(root, file));
	expect(lintPlugin(root).errors).toContain(`${file}: missing manifest`);
});
test.each([
	[".claude-plugin/plugin.json", "name must be non-empty"],
	[".codex-plugin/plugin.json", "version must be non-empty"],
	[".antigravity-plugin/plugin.json", "version must be non-empty"],
	[".claude-plugin/marketplace.json", "owner.name must be non-empty"],
	[".claude-plugin/marketplace.json", "plugins must be a non-empty array"],
	[".agents/plugins/marketplace.json", "plugins must be a non-empty array"],
	[".agents/skills.json", "entries must reference skills/"],
	[".agents/rules.json", "entries must reference rules/"],
	["package.json", "keywords must include pi-package"],
])("checks required native manifest fields in %s", (file, error) => {
	const { root, json } = fixture();
	json(file, {});
	expect(lintPlugin(root).errors).toContain(`${file}: ${error}`);
});

test.each([".claude-plugin/plugin.json", ".codex-plugin/plugin.json", ".antigravity-plugin/plugin.json", "package.json"])(
	"rejects a second skills tree registered by %s",
	file => {
		const { root, put, skill, json } = fixture();
		put("other-skills/misty/SKILL.md", skill("misty"));
		const manifest = JSON.parse(readFileSync(join(root, file), "utf8"));
		if (file === "package.json") manifest.pi.skills = ["./other-skills"];
		else manifest.skills = "./other-skills";
		json(file, manifest);
		expect(lintPlugin(root).errors).toContain(`${file}: skills must reference the shared root skills/`);
	},
);

test.each([
	"adapters/claude/agents/fixture.md",
	"adapters/codex/hooks.json", "adapters/pi/core.ts",
])("rejects a missing declared native component %s", file => {
	const { root } = fixture();
	rmSync(join(root, file));
	expect(lintPlugin(root).errors.some(error => error.includes(`missing file ./${file}`))).toBe(true);
});

test("Claude defaults to root skills only when the skills field is omitted", () => {
	const { root, json } = fixture();
	expect(lintPlugin(root).errors).toEqual([]);
	const manifest = JSON.parse(readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8"));
	manifest.skills = null;
	json(".claude-plugin/plugin.json", manifest);
	expect(lintPlugin(root).errors).toContain(".claude-plugin/plugin.json: skills must reference the shared root skills/");
});

test.each(["claude", "codex"])("requires the %s SessionStart core registration", harness => {
	const { root, json } = fixture();
	const file = `.${harness}-plugin/plugin.json`;
	if (harness === "claude") {
		const manifest = JSON.parse(readFileSync(join(root, file), "utf8"));
		manifest.hooks = {};
		json(file, manifest);
	} else json("adapters/codex/hooks.json", { hooks: {} });
	expect(lintPlugin(root).errors.some(error => error.startsWith(`${file}: SessionStart must register`))).toBe(true);
});

test("requires the core extension, not just any existing pi extension", () => {
	const { root, put, json } = fixture();
	put("adapters/pi/unrelated.ts", "export const unrelated = true;\n");
	const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
	manifest.pi.extensions = ["./adapters/pi/unrelated.ts"];
	json("package.json", manifest);
	expect(lintPlugin(root).errors).toContain("package.json: pi.extensions must register adapters/pi/core.ts");
});

test("rejects native paths escaping the plugin, including symlinks", () => {
	const { root, json } = fixture();
	const foreign = fixture().root;
	const file = ".claude-plugin/plugin.json";
	const manifest = JSON.parse(readFileSync(join(root, file), "utf8"));
	manifest.agents = ["../outside.md"];
	json(file, manifest);
	expect(lintPlugin(root).errors).toContain(`${file}: agents: path must stay inside the plugin: ../outside.md`);
	symlinkSync(join(foreign, "skills/misty/SKILL.md"), join(root, "adapters/claude/agents/escape.md"));
	manifest.agents = ["./adapters/claude/agents/escape.md"];
	json(file, manifest);
	expect(lintPlugin(root).errors).toContain(`${file}: agents: path must stay inside the plugin: ./adapters/claude/agents/escape.md`);
});

test("Codex marketplace policy and local source are required, not just its plugin name", () => {
	const { root, json } = fixture();
	json(".agents/plugins/marketplace.json", { name: "mistystack", plugins: [{ name: "mistystack", source: "./" }] });
	const errors = lintPlugin(root).errors;
	expect(errors).toContain(".agents/plugins/marketplace.json: plugin source must be local");
	expect(errors).toContain(".agents/plugins/marketplace.json: plugin policy must use installation AVAILABLE and authentication ON_USE");
});

test.each([
	{ source: "github", repo: "owner/skills", sha: "a".repeat(40) },
	{ source: "git-subdir", url: "https://github.com/owner/skills.git", path: "plugins/design", sha: "b".repeat(40) },
])("accepts a pinned companion catalog source without requiring local files", source => {
	const { root, json } = fixture();
	json(".claude-plugin/marketplace.json", { name: "mistystack", owner: { name: "Fixture owner" }, plugins: [{ name: "mistystack", source: "./" }, { name: "catalog-skill", source }] });
	expect(lintPlugin(root).errors).toEqual([]);
});

test.each([
	{ source: "github", repo: "owner/skills", ref: "main" },
	{ source: "github", repo: "owner/skills", sha: "abc123" },
	{ source: "github", repo: "owner/skills", sha: "z".repeat(40) },
])("rejects branch-only and incomplete companion catalog pins", source => {
	const { root, json } = fixture();
	json(".claude-plugin/marketplace.json", { name: "mistystack", owner: { name: "Fixture owner" }, plugins: [{ name: "mistystack", source: "./" }, { name: "catalog-skill", source }] });
	expect(lintPlugin(root).errors).toContain(".claude-plugin/marketplace.json: catalog-skill: catalog source requires a full 40-hex sha");
});

test.each([
	[{ source: "github", repo: "not-a-repository", sha: "a".repeat(40) }, "github source requires owner/repo"],
	[{ source: "git-subdir", url: "file:///outside", path: "plugin", sha: "a".repeat(40) }, "git-subdir source requires an HTTPS repository URL"],
	[{ source: "git-subdir", url: "https://github.com/owner/skills.git", path: "../outside", sha: "a".repeat(40) }, "git-subdir source requires an in-repository path"],
	[{ source: "npm", package: "uninstalled", sha: "a".repeat(40) }, "catalog source must use github or git-subdir"],
])("rejects malformed companion catalog sources", (source, message) => {
	const { root, json } = fixture();
	json(".claude-plugin/marketplace.json", { name: "mistystack", owner: { name: "Fixture owner" }, plugins: [{ name: "mistystack", source: "./" }, { name: "catalog-skill", source }] });
	expect(lintPlugin(root).errors).toContain(`.claude-plugin/marketplace.json: catalog-skill: ${message}`);
});

function expectStrictWarnings(root: string, warnings: string[]) {
	const report = lintPlugin(root);
	expect(report.errors).toEqual([]);
	expect(report.warnings).toEqual(warnings.toSorted((a, b) => a.localeCompare(b)));
	expect(lintPlugin(root, true)).toEqual({ skillCount: report.skillCount, errors: report.warnings, warnings: [] });
}

function runPlugin(root: string, args: string[], path = "") {
	mkdirSync(join(root, "scripts"), { recursive: true });
	copyFileSync(join(import.meta.dir, "verify-plugin.ts"), join(root, "scripts/verify-plugin.ts"));
	copyFileSync(join(import.meta.dir, "skill-locks.mjs"), join(root, "scripts/skill-locks.mjs"));
	const result = Bun.spawnSync([process.execPath, join(root, "scripts/verify-plugin.ts"), ...args], {
		cwd: root,
		env: { ...process.env, HOME: root, PATH: path },
		stdout: "pipe",
		stderr: "pipe",
	});
	return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() };
}

test("accepts relative inline and reference links, supporting files and named skills", () => {
	const { root, put, skill } = fixture();
	put("skills/misty/SKILL.md", skill("misty", [
		"Read [research](../research/SKILL.md#start) and apply the `principle-proof` skill.",
		"Read the `research` skill and [fix](playbooks/fix.md?raw=1#repair).",
		"Keep the [notice][license], [settings][] and [notes].",
		"Open [angle](<playbooks/fix complete.md>) and [encoded](playbooks/fix%20complete.md?raw=1#done).",
		"Open [parentheses](playbooks/fix(complete).md) and [root notice](../../LICENSE).",
		"",
		'[license]: ../research/LICENSE "MIT notice"',
		"[settings]: ../research/settings.json",
		"[notes]: playbooks/fix.md",
	].join("\n")));
	put("skills/research/SKILL.md", skill("research"));
	put("skills/principle-proof/SKILL.md", skill("principle-proof"));
	put("skills/research/LICENSE", "MIT notice.\n");
	put("skills/research/settings.json", "{}\n");
	put("skills/misty/playbooks/fix.md", "Read [research](../../research/SKILL.md).\n");
	put("skills/misty/playbooks/fix complete.md", "Completed fix.\n");
	put("skills/misty/playbooks/fix(complete).md", "Completed fix.\n");
	put("LICENSE", "Repository notice.\n");
	put("rules/core.md", "---\ntrigger: always_on\nalwaysApply: true\n---\nRead [router](../skills/misty/SKILL.md#misty).\n");
	expect(lintPlugin(root, true)).toEqual({ skillCount: 3, errors: [], warnings: [] });
});

test("relative directory links stay reachable and missing targets still fail", () => {
	const { root, put, skill } = fixture();
	const examples = "skills/misty/references/examples";
	put("skills/misty/SKILL.md", skill("misty", "[Examples](references/examples/) and [same directory](references/examples)."));
	put(`${examples}/README.md`, "# Examples\n");
	expect(lintPlugin(root, true).errors).toEqual([]);
	rmSync(join(root, examples), { recursive: true });
	expect(lintPlugin(root, true).errors).toEqual([`skills/misty/SKILL.md: missing reference ${examples}`]);
	put(`${examples}/fixture.json`, "{}\n");
	expect(lintPlugin(root, true).errors).toEqual([]);
	put("skills/misty/SKILL.md", skill("misty", "[Missing file](references/examples/missing.md)."));
	expect(lintPlugin(root, true).errors).toEqual([`skills/misty/SKILL.md: missing reference ${examples}/missing.md`]);
});

test("does not treat illustrative Markdown, external links or same-file anchors as missing files", () => {
	const { root, put, skill } = fixture();
	put("skills/misty/SKILL.md", skill("misty", [
		"[web](https://example.com/missing.md), [mail](mailto:agent@example.com), [host](//example.com/missing.md).",
		"[absolute](/missing.md), [anchor](#missing), [query](?raw=1#missing) and [empty]().",
		"Inline examples: `[missing](missing-inline.md)` and ``the `misty` skill``.",
		"Escaped example: \\[missing](missing-escaped.md).",
		"",
		"~~~markdown",
		"[missing](missing-fenced.md)",
		"[guide][reference]",
		"[reference]: missing-reference.md",
		"Use the `misty` skill.",
		"~~~",
		"",
		"    [missing](missing-indented.md)",
		"",
		"> ```markdown",
		"> [missing](missing-quoted.md)",
		"> ```",
	].join("\n")));
	expect(lintPlugin(root, true)).toEqual({ skillCount: 1, errors: [], warnings: [] });
});

test("reports every missing metadata field and a mismatched directory name", () => {
	const { root, put } = fixture();
	put("skills/misty/SKILL.md", "---\nname: other\ndescription: ''\nmetadata: {}\n---\nBody.\n");
	expect(lintPlugin(root).errors).toEqual([
		"skills/misty/SKILL.md: name must equal directory misty",
		"skills/misty/SKILL.md: description must be non-empty",
		"skills/misty/SKILL.md: metadata.owner must be non-empty",
		"skills/misty/SKILL.md: metadata.prevents must be non-empty",
		"skills/misty/SKILL.md: metadata.source must be non-empty",
		"skills/misty/SKILL.md: metadata.sunset must be a non-empty string",
	]);
});

test.each([
	["pocock", "mattpocock/skills", "skills/productivity/grilling"],
	["warp", "warpdotdev/common-skills", ".agents/skills/grilling"],
])("%s-locked skills keep upstream metadata only while bytes and file set match", (pack, repo, upstream) => {
	const { root, put, json } = fixture();
	const file = "skills/grilling/SKILL.md";
	const source = "---\nname: grilling\ndescription: Grill the user about a plan.\n---\nAsk the frontier.\n";
	const lock = `vendor/${pack}.lock.json`;
	put(file, source);
	json(lock, { repo, commit: "a".repeat(40), skills: { "skills/grilling": upstream }, files: { [file]: new Bun.CryptoHasher("sha256").update(source).digest("hex") } });
	expect(lintPlugin(root, true).errors).toEqual([]);
	put(file, source.replace("Ask the frontier.", "Ask one question."));
	expect(lintPlugin(root, true).errors).toEqual([`${file}: differs from ${repo}@${"a".repeat(40)}; vendored bytes are not hand-edited`]);
	put(file, source);
	put("skills/grilling/notes.md", "# Local addition\n");
	expect(lintPlugin(root, true).errors).toEqual([`skills/grilling/notes.md: not recorded in ${lock}; run bun scripts/sync-skills.ts ${lock} <checkout>`]);
	rmSync(join(root, lock));
	rmSync(join(root, "skills/grilling/notes.md"));
	expect(lintPlugin(root).errors).toContain(`${file}: metadata.owner must be non-empty`);
});

test("the method gate leaves upstream and isolated site suites to their own toolchains", () => {
	const { root, put, json } = fixture();
	const file = "skills/upstream/SKILL.md";
	const suite = "skills/upstream/bundle.test.ts";
	const sha = (text: string) => new Bun.CryptoHasher("sha256").update(text).digest("hex");
	const entry = "---\nname: upstream\ndescription: Upstream entry.\n---\n# Upstream\n";
	const upstreamSuite = 'throw new Error("Upstream suite must run through its own toolchain");\n';
	put(file, entry);
	put(suite, upstreamSuite);
	put("site/scripts/isolated.test.mjs", 'throw new Error("Site suite must run through its own toolchain");\n');
	put("consumer.test.ts", 'import { test, expect } from "bun:test"; test("maintained consumer", () => expect(true).toBe(true));\n');
	json("vendor/pocock.lock.json", { repo: "mattpocock/skills", commit: "a".repeat(40), skills: { "skills/upstream": "skills/engineering/upstream" }, files: { [file]: sha(entry), [suite]: sha(upstreamSuite) } });
	const result = runPlugin(root, ["--strict", "--lint-only"]);
	expect(result.code).toBe(0);
	expect(result.err).toContain("maintained consumer");
	expect(result.err).not.toContain("Upstream suite must run");
	expect(result.err).not.toContain("Site suite must run");
});

test.each(["2026-11-27", "2026-11-27 # YAML 1.1 timestamp", "2026-11-27T00:00:00Z", "!!timestamp 2026-11-27"])(
	"rejects a plain YAML date that YAML 1.1 readers cannot serialize (%s)",
	value => {
		const { root, put, skill } = fixture();
		put("skills/misty/SKILL.md", skill("misty").replace('sunset: "2026-11-27"', `sunset: ${value}`));
		expect(lintPlugin(root).errors).toEqual([
			"skills/misty/SKILL.md: quote YAML date values for JSON-compatible metadata",
		]);
	},
);

test.each(["42", "[2026, 11, 27]", "{year: 2026}", "false", "null"])(
	"requires metadata.sunset to parse as a non-empty string (%s)",
	value => {
		const { root, put, skill } = fixture();
		put("skills/misty/SKILL.md", skill("misty").replace('sunset: "2026-11-27"', `sunset: ${value}`));
		expect(lintPlugin(root).errors).toEqual([
			"skills/misty/SKILL.md: metadata.sunset must be a non-empty string",
		]);
	},
);

test("rejects invalid frontmatter rather than recovering a malformed skill", () => {
	const { root, put } = fixture();
	put("skills/misty/SKILL.md", "name: misty\n");
	expect(lintPlugin(root).errors).toEqual(["skills/misty/SKILL.md: missing YAML frontmatter"]);
});

test("requires an always_on boolean alwaysApply core and at most twenty body lines", () => {
	const { root, put } = fixture();
	put("rules/core.md", `---\nalwaysApply: 'true'\n---\n${Array.from({ length: 21 }, (_, i) => `- Rule ${i}`).join("\n")}\n`);
	expect(lintPlugin(root).errors).toEqual([
		"rules/core.md: trigger must be always_on",
		"rules/core.md: alwaysApply must be true",
		"rules/core.md: 21 body lines exceeds 20",
	]);
});

test.each([
	"skills/misty/SKILL.md",
	"skills/misty/playbooks/feature.md",
	"skills/principle-proof/SKILL.md",
	"rules/review.md",
])("warns on missing relative targets in %s and rejects them in strict mode", file => {
	const { root, put, skill } = fixture();
	const body = "Read [missing](missing.json?raw=1#proof).";
	put(file, file.endsWith("/SKILL.md") ? skill(file.split("/")[1], body) : body);
	expectStrictWarnings(root, [`${file}: missing reference ${join(dirname(file), "missing.json")}`]);
});


test.each([
	["full", "Read [details][guide].\n\n[guide]: missing.md"],
	["collapsed", 'Read [guide][].\n\n[guide]: <missing.md> "Guide"'],
	["shortcut", "Read [guide].\n\n[guide]: missing.md"],
])("validates dangling %s reference-style Markdown links", (_style, body) => {
	const { root, put, skill } = fixture();
	put("skills/misty/SKILL.md", skill("misty", body));
	expectStrictWarnings(root, ["skills/misty/SKILL.md: missing reference skills/misty/missing.md"]);
});

test("reports malformed encoded reference destinations without crashing", () => {
	const { root, put, skill } = fixture();
	put("skills/misty/SKILL.md", skill("misty", "Read [details][guide].\n\n[guide]: notes%ZZ.md"));
	expectStrictWarnings(root, ["skills/misty/SKILL.md: invalid relative link notes%ZZ.md (malformed percent encoding)"]);
});

test.each([
	"skills/misty/SKILL.md",
	"skills/misty/playbooks/feature.md",
	"skills/principle-proof/SKILL.md",
	"rules/review.md",
])("validates named-skill phrases in %s with strict warning promotion", file => {
	const { root, put, skill } = fixture();
	const body = "Use the `missing` skill.";
	put(file, file.endsWith("/SKILL.md") ? skill(file.split("/")[1], body) : body);
	expectStrictWarnings(root, [`${file}: unknown skill missing (missing skills/missing/SKILL.md)`]);
});

test.each([
	"``Use the `missing` skill.``",
	"```text\nUse the `missing` skill.\n```",
])("validates named skills even inside quoted instructions (%s)", body => {
	const { root, put, skill } = fixture();
	put("skills/misty/SKILL.md", skill("misty", body));
	expectStrictWarnings(root, ["skills/misty/SKILL.md: unknown skill missing (missing skills/missing/SKILL.md)"]);
});

test("validates skill names in generated brief source outside Markdown", () => {
	const { root, put } = fixture();
	put("skills/misty/brief.ts", 'export const brief = "Read the `missing` skill.";\n');
	expectStrictWarnings(root, ["skills/misty/brief.ts: unknown skill missing (missing skills/missing/SKILL.md)"]);
});

test("a named skill needs SKILL.md, not just a directory with supporting files", () => {
	const { root, put, skill } = fixture();
	put("skills/misty/SKILL.md", skill("misty", "Use the `empty` skill."));
	put("skills/empty/notes.md", "Not a skill entrypoint.\n");
	expectStrictWarnings(root, ["skills/misty/SKILL.md: unknown skill empty (missing skills/empty/SKILL.md)"]);
});

test("a missing router is an error even when another valid skill exists", () => {
	const { root, put, skill } = fixture();
	rmSync(join(root, "skills/misty/SKILL.md"));
	put("skills/research/SKILL.md", skill("research"));
	expect(lintPlugin(root).errors).toEqual(["skills/misty/SKILL.md: missing router"]);
});

test.each(["recompile", "setup-mistystack", "coordinator"])(
	"requires boolean true to keep %s explicit-only",
	name => {
		const { root, put, skill } = fixture();
		const file = `skills/${name}/SKILL.md`;
		const source = skill(name).replace("disable-model-invocation: true\n", "");
		for (const invocation of ["", "disable-model-invocation: false\n", "disable-model-invocation: 'true'\n"]) {
			put(file, source.replace("metadata:\n", `${invocation}metadata:\n`));
			expect(lintPlugin(root).errors).toEqual([`${file}: disable-model-invocation must be true`]);
		}
		put(file, source.replace("metadata:\n", "disable-model-invocation: true\nmetadata:\n"));
		expect(lintPlugin(root).errors).toEqual([]);
	},
);

test("missing native CLIs are explicit skips, not successful install proofs", async () => {
	const { root } = fixture();
	const results = await verifyAvailableInstalls(root, {});
	expect(results.map(result => result.harness)).toEqual(["claude", "codex", "pi", "agy"]);
	expect(results.every(result => result.status === "SKIP")).toBe(true);
	expect(results.some(result => result.status === "PASS")).toBe(false);
});

test("strict lint failures exit nonzero before tests or installation", () => {
	const { root, put, skill } = fixture();
	put("skills/misty/SKILL.md", skill("misty", "Read [missing](missing.md)."));
	const result = runPlugin(root, ["--strict", "--lint-only"]);
	expect(result.code).toBe(1);
	expect(result.err).toContain("missing reference skills/misty/missing.md");
	expect(result.out).toContain("1 errors");
	expect(result.out).not.toContain("Verification complete");
});

test("plugin help explains strict lint without requiring a harness CLI", () => {
	const { root } = fixture();
	const result = runPlugin(root, ["--help"]);
	expect(result.code).toBe(0);
	expect(result.out).toContain("--strict fails on broken relative Markdown links and unknown skill names");
	expect(result.out).toContain("--lint-only skips installation");
	expect(result.out).toContain("Available Claude, Codex, pi and Antigravity (agy) CLIs use isolated native installs");
});

test.each(["claude", "codex", "pi", "agy"] as const)("refuses leaked %s state before installing and removes its scratch home", async harness => {
	const { root, put } = fixture();
	const trace = join(root, "native-commands");
	const state = join(root, "native-state");
	const executable = join(root, harness);
	const response = harness === "claude" || harness === "agy" ? '[{"id":"foreign","enabled":true}]' : JSON.stringify({ id: 1, result: { codexHome: root } });
	const leak = harness === "pi" ?
		`printf '%s\\n' '{"packages":["foreign-package"]}' > "$PI_CODING_AGENT_DIR/settings.json"\nprintf 'Foreign package\\n'` :
		`${harness === "codex" ? 'IFS= read -r request\n' : ""}printf '%s\\n' ${JSON.stringify(response)}`;
	put(harness, `#!/bin/sh\nprintf '%s\\n' "$*" >> ${JSON.stringify(trace)}\nprintf '%s\\n' "$HOME" "$CLAUDE_CONFIG_DIR" "$CODEX_HOME" "$PI_CODING_AGENT_DIR" > ${JSON.stringify(state)}\n${leak}\n`);
	chmodSync(executable, 0o700);
	await expect(verifyNativeInstall(root, harness, executable)).rejects.toThrow("isolation refused");
	expect(readFileSync(trace, "utf8")).toBe(harness === "pi" ? "list --no-approve\n" : harness === "codex" ? "app-server --listen stdio://\n" : "plugin list --json\n");
	const [home, ...configs] = readFileSync(state, "utf8").trim().split("\n");
	expect(home).not.toBe(process.env.HOME);
	for (const config of configs) expect(config.startsWith(`${home}/`)).toBe(true);
	expect(existsSync(home)).toBe(false);
});

test("verifies isolated agy plugin validation and installation and rejects unexpected validate findings", async () => {
	const { root, put } = fixture();
	const executable = join(root, "agy");
	const state = join(root, "agy-installed");
	put("agy", `#!/bin/sh
set -eu
dest="$HOME/.gemini/config/plugins/mistystack"
case "$1 $2 $3" in
  "plugin list --json")
    if [ -d "$dest" ]; then
      printf '[{"name":"mistystack","enabled":true,"version":"1.0.0","path":"%s","skills":["misty"],"rules":["core.md"]}]\\n' "$dest"
    else
      printf '[]\\n'
    fi
    ;;
  "plugin validate --json")
    if [ -f ${JSON.stringify(join(root, "bad-validate"))} ]; then
      printf '{"name":"mistystack","findings":[{"severity":"warning","file":"rules/core.md","message":"bad trigger"}]}\\n'
    else
      printf '{"name":"mistystack","findings":[{"severity":"warning","file":"AGENTS.md","message":"never loaded"}]}\\n'
    fi
    ;;
  "plugin install "*)
    mkdir -p "$dest/skills/misty" "$dest/rules"
    cp "$3/skills/misty/SKILL.md" "$dest/skills/misty/SKILL.md"
    cp "$3/rules/core.md" "$dest/rules/core.md"
    printf 'installed:%s\\n' "$dest" > ${JSON.stringify(state)}
    ;;
  *) exit 1 ;;
esac
`);
	chmodSync(executable, 0o700);
	await verifyNativeInstall(root, "agy", executable);
	expect(readFileSync(state, "utf8")).toContain("/.gemini/config/plugins/mistystack");
	put("bad-validate", "1\n");
	await expect(verifyNativeInstall(root, "agy", executable)).rejects.toThrow("unexpected findings");
});

test("stages only non-ignored git files for agy install so gitignored external symlinks do not fail copy", async () => {
	const { root, put } = fixture();
	const init = Bun.spawnSync(["git", "init", "--quiet"], { cwd: root, stdout: "pipe", stderr: "pipe" });
	expect(init.exitCode).toBe(0);
	put(".gitignore", ".omp/\n");
	mkdirSync(join(root, ".omp"), { recursive: true });
	symlinkSync("/tmp", join(root, ".omp/.mcp.json"));
	const executable = join(root, "agy");
	put("agy", `#!/bin/sh
set -eu
dest="$HOME/.gemini/config/plugins/mistystack"
case "$1 $2 $3" in
  "plugin list --json")
    if [ -d "$dest" ]; then
      printf '[{"name":"mistystack","enabled":true,"version":"1.0.0","path":"%s","skills":["misty"],"rules":["core.md"]}]\\n' "$dest"
    else
      printf '[]\\n'
    fi
    ;;
  "plugin validate --json")
    [ ! -e "$4/.omp" ] || exit 1
    printf '{"name":"mistystack","findings":[]}\\n'
    ;;
  "plugin install "*)
    [ ! -e "$3/.omp" ] || exit 1
    mkdir -p "$dest/skills/misty" "$dest/rules"
    cp "$3/skills/misty/SKILL.md" "$dest/skills/misty/SKILL.md"
    cp "$3/rules/core.md" "$dest/rules/core.md"
    ;;
  *) exit 1 ;;
esac
`);
	chmodSync(executable, 0o700);
	await verifyNativeInstall(root, "agy", executable);
});

test("rejects rules field in .antigravity-plugin/plugin.json", () => {
	const { root, json } = fixture();
	const manifest = JSON.parse(readFileSync(join(root, ".antigravity-plugin/plugin.json"), "utf8"));
	manifest.rules = "rules/";
	json(".antigravity-plugin/plugin.json", manifest);
	expect(lintPlugin(root).errors).toContain(".antigravity-plugin/plugin.json: rules must not be declared; agy loads rules/ directly");
});
