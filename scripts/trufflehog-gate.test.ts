import { afterEach, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const gate = resolve(import.meta.dir, "../.githooks/trufflehog-gate.py");
const roots: string[] = [];
const sha = "789ae58ddd" + "0aecad3406" + "3f53304665" + "f215a9418a";
const raw = sha.slice(0, 20);
const commitLink = `https://github.com/misty-step/harness/commit/${sha}`;
const sentryDigest = "2d4f83048eac1df5" + "30b399e2aed75dd7" + "c9c18577b7665420" + "aaeb96d0ceb0b702";
const cloudflareCommit = "c1c8a8c147" + "1069fb0e18" + "8eeaff69b8" + "e8db6564a8";
const openclawCommit = "80930af448" + "ebabc84174" + "146b56bc10" + "6d37fab3b4";

function finding(changes: Record<string, unknown> = {}) {
	return {
		DetectorName: "GitHubOauth2",
		Verified: false,
		Raw: raw,
		SourceMetadata: { Data: { Filesystem: { file: "CHANGELOG.md", line: 1 } } },
		...changes,
	};
}

function run(
	rows: unknown[],
	exit = rows.length ? 183 : 0,
	changelog = `* release (${commitLink})\n`,
	scanError = false,
	extraFiles: Record<string, string> = {},
) {
	const root = mkdtempSync(join(tmpdir(), "spellbook-trufflehog-gate-"));
	roots.push(root);
	const bin = join(root, "bin");
	mkdirSync(bin);
	writeFileSync(join(root, "CHANGELOG.md"), changelog);
	for (const [rel, content] of Object.entries(extraFiles)) {
		const dest = join(root, rel);
		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, content);
	}
	const reports = join(root, "reports.jsonl");
	writeFileSync(reports, rows.map(row => typeof row === "string" ? row : JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));
	const scanner = join(bin, "trufflehog");
	writeFileSync(scanner, `#!/bin/sh
if [ "$TRUFFLEHOG_SCAN_ERROR" = "1" ]; then
  case " $* " in
    *" --fail-on-scan-errors "*) exit 1 ;;
    *) exit 0 ;;
  esac
fi
cat "$TRUFFLEHOG_FIXTURE"
exit "$TRUFFLEHOG_EXIT"
`);
	chmodSync(scanner, 0o700);
	const result = Bun.spawnSync(["python3", gate], {
		cwd: root,
		env: {
			...process.env,
			PATH: `${bin}:${process.env.PATH}`,
			TRUFFLEHOG_FIXTURE: reports,
			TRUFFLEHOG_EXIT: String(exit),
			TRUFFLEHOG_SCAN_ERROR: scanError ? "1" : "0",
		},
		stdout: "pipe", stderr: "pipe",
	});
	return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() };
}

afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

test("the pinned public commit SHA false positive does not block the scan", () => {
	const result = run([finding(), finding()]);
	expect(result.code).toBe(0);
	expect(result.out).toBe("");
	expect(result.err).toContain("ignored 2 unverified public commit-SHA finding(s)");
	expect(result.err).not.toContain(raw);
});

test("other findings still block, even beside an allowed public SHA", () => {
	for (const [name, other] of [
		["other detector", finding({ DetectorName: "Generic" })],
		["verified result", finding({ Verified: true })],
		["other file", finding({ SourceMetadata: { Data: { Filesystem: { file: "source.ts", line: 1 } } } })],
		["other value", finding({ Raw: "f".repeat(20) })],
		["wrong line", finding({ SourceMetadata: { Data: { Filesystem: { file: "CHANGELOG.md", line: 2 } } } })],
	]) {
		const result = run([finding(), other], 183, `* release (${commitLink})\nUnrelated text\n`);
		expect(result.code, name).toBe(1);
		expect(result.err, name).toContain("finding outside public commit links");
		expect(result.err, name).not.toContain(raw);
	}
});

test("a different public commit link is not an exception", () => {
	const otherSha = "abcdef0123".repeat(4);
	const result = run([finding({ Raw: otherSha.slice(0, 20) })], 183,
		`* release (https://github.com/misty-step/harness/commit/${otherSha})\n`);
	expect(result.code).toBe(1);
	expect(result.err).toContain("finding outside public commit links");
});

test("a URL extending the pinned SHA is not the exact changelog link", () => {
	for (const suffix of ["A", "?x=1", "/next", "#fragment"]) {
		const result = run([finding()], 183, `* release (${commitLink}${suffix})\n`);
		expect(result.code, suffix).toBe(1);
		expect(result.err, suffix).toContain("finding outside public commit links");
	}
});

test("scanner errors and malformed results fail closed", () => {
	for (const [name, rows, code] of [
		["scanner error", [finding()], 1],
		["malformed JSON", ["not JSON"], 183],
		["empty result with finding exit", [], 183],
	] as const) {
		const result = run(rows, code);
		expect(result.code, name).toBe(1);
		expect(result.err, name).not.toContain(raw);
	}
	expect(run([]).code).toBe(0);
});

test("a scanner read error cannot masquerade as a clean scan", () => {
	const result = run([], 0, undefined, true);
	expect(result.code).toBe(1);
	expect(result.err).toContain("scan failed or returned unexpected output");
});

test("admits pinned public lock digests and attribution commits while failing closed on variants", () => {
	const files = {
		".gitleaks.toml": `regexes = ['''^\\s*"skills/why/references/sources/sentry\\.md": "${sentryDigest}",?$''']\n`,
		"ATTRIBUTION.md": [
			`| [cloudflare/security-audit-skill@${cloudflareCommit}](https://github.com/cloudflare/security-audit-skill/tree/${cloudflareCommit}) |`,
			`| [openclaw/openclaw@${openclawCommit}](https://github.com/openclaw/openclaw/tree/${openclawCommit}/.agents/skills/test-audit) |`,
			`| \`security-audit\` | cloudflare/security-audit-skill@${cloudflareCommit}/skills/security-audit/SKILL.md |`,
		].join("\n") + "\n",
		"skills/security-audit/SKILL.md": [
			`[Cloudflare's upstream skill](https://github.com/cloudflare/security-audit-skill/blob/${cloudflareCommit}/skills/security-audit/SKILL.md)`,
			`fetch \`cloudflare/security-audit-skill\` at \`${cloudflareCommit}\` locally.`,
		].join("\n") + "\n",
	};
	const allowed = [
		finding({ DetectorName: "SentryToken", Raw: sentryDigest, SourceMetadata: { Data: { Filesystem: { file: ".gitleaks.toml", line: 1 } } } }),
		finding({ DetectorName: "CloudflareApiToken", Raw: cloudflareCommit, SourceMetadata: { Data: { Filesystem: { file: "ATTRIBUTION.md", line: 1 } } } }),
		finding({ DetectorName: "CloudflareApiToken", Raw: openclawCommit, SourceMetadata: { Data: { Filesystem: { file: "ATTRIBUTION.md", line: 2 } } } }),
		finding({ DetectorName: "CloudflareApiToken", Raw: cloudflareCommit, SourceMetadata: { Data: { Filesystem: { file: "ATTRIBUTION.md", line: 3 } } } }),
		finding({ DetectorName: "CloudflareApiToken", Raw: cloudflareCommit, SourceMetadata: { Data: { Filesystem: { file: "skills/security-audit/SKILL.md", line: 1 } } } }),
		finding({ DetectorName: "CloudflareApiToken", Raw: cloudflareCommit, SourceMetadata: { Data: { Filesystem: { file: "skills/security-audit/SKILL.md", line: 2 } } } }),
	];
	const passing = run(allowed, 183, undefined, false, files);
	expect(passing.code).toBe(0);
	expect(passing.err).toContain("ignored 6 unverified public commit-SHA finding(s)");

	for (const [name, badRow, badFiles] of [
		["verified", { ...allowed[0], Verified: true }, files],
		["wrong line", { ...allowed[1], SourceMetadata: { Data: { Filesystem: { file: "ATTRIBUTION.md", line: 2 } } } }, files],
		["wrong file", { ...allowed[0], SourceMetadata: { Data: { Filesystem: { file: "other.toml", line: 1 } } } }, files],
		["extended digest", allowed[0], { ...files, ".gitleaks.toml": `regexes = ['''"skills/why/references/sources/sentry\\.md": "${sentryDigest}a"''']\n` }],
	] as const) {
		const rejected = run([badRow], 183, undefined, false, badFiles);
		expect(rejected.code, name).toBe(1);
		expect(rejected.err, name).toContain("finding outside public commit links");
	}
});
