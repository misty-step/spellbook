import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
	BUDGET_EXCEEDED_EXIT,
	classifyRepoPath,
	inspectReviewBots,
	inspectWorkflowHygiene,
	parseShard,
	resolveChangedSurfaces,
	runDoctorChecks,
	selectShard,
} from "./check-runner";

const repoRoot = resolve(import.meta.dir, "..");
const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
	const scratch = process.env.TMPDIR ?? join(homedir(), ".cache/tmp");
	mkdirSync(scratch, { recursive: true });
	const dir = mkdtempSync(join(scratch, prefix));
	tempDirs.push(dir);
	return dir;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("doctor passes on the current mistystack repository including new runner files", () => {
	const untrackedCheck = runDoctorChecks(repoRoot, {
		paths: [
			"AGENTS.md",
			"SPEC.md",
			"docs/decisions/0029-agentic-verification-and-release-trains.md",
			"scripts/check-runner.ts",
			"scripts/check-runner.test.ts",
			"scripts/verify",
		],
	});
	expect(untrackedCheck).toEqual({ ok: true, errors: [], fileCount: 6 });

	const live = runDoctorChecks(repoRoot);
	expect(live.errors).toEqual([]);
	expect(live.ok).toBe(true);
	expect(live.fileCount).toBeGreaterThan(50);
});

test("doctor rejects unmapped files in the surface closure", () => {
	const result = runDoctorChecks(repoRoot, {
		paths: ["AGENTS.md", "unmapped/orphan.bin"],
	});
	expect(result.ok).toBe(false);
	expect(result.errors).toContain("unmapped tracked file in surface closure: unmapped/orphan.bin");
});

test("doctor rejects workflows triggered on pull_request or pull_request_target", () => {
	const dir = makeTempDir("mistystack-hygiene-");
	mkdirSync(join(dir, ".github/workflows"), { recursive: true });
	writeFileSync(join(dir, ".github/workflows/pr.yml"), "name: PR\non: [push, pull_request]\njobs: {}\n");
	writeFileSync(
		join(dir, ".github/workflows/pr-target.yaml"),
		"name: PRT\non:\n  pull_request_target:\njobs: {}\n",
	);
	const errors = inspectWorkflowHygiene(dir);
	expect(errors).toHaveLength(2);
	expect(errors.some((e) => e.includes('"pull_request"'))).toBe(true);
	expect(errors.some((e) => e.includes('"pull_request_target"'))).toBe(true);

	const clean = makeTempDir("mistystack-hygiene-ok-");
	mkdirSync(join(clean, ".github/workflows"), { recursive: true });
	writeFileSync(join(clean, ".github/workflows/release.yml"), "name: Rel\non:\n  workflow_dispatch:\njobs: {}\n");
	expect(inspectWorkflowHygiene(clean)).toEqual([]);
});

test("doctor rejects active CodeRabbit auto_review and allows disabled auto_review", () => {
	const activeDir = makeTempDir("mistystack-bot-active-");
	writeFileSync(join(activeDir, ".coderabbit.yaml"), "reviews:\n  auto_review:\n    enabled: true\n");
	expect(inspectReviewBots(activeDir)).toHaveLength(1);

	const implicitDir = makeTempDir("mistystack-bot-implicit-");
	writeFileSync(join(implicitDir, ".coderabbit.yml"), "language: en-US\n");
	expect(inspectReviewBots(implicitDir)).toHaveLength(1);

	const disabledDir = makeTempDir("mistystack-bot-disabled-");
	writeFileSync(join(disabledDir, ".coderabbit.yaml"), "reviews:\n  auto_review:\n    enabled: false\n");
	expect(inspectReviewBots(disabledDir)).toEqual([]);
});

test("surface closure classifies non-exec, site, plugin, shared and fail-closed unmapped paths", () => {
	expect(classifyRepoPath("AGENTS.md")).toEqual({ kind: "non-exec" });
	expect(classifyRepoPath("skills/verification/LICENSE")).toEqual({ kind: "non-exec" });
	expect(classifyRepoPath("docs/decisions/0000-template.md")).toEqual({ kind: "non-exec" });

	expect(resolveChangedSurfaces(["AGENTS.md", ".gitignore", ".landmark.yml"])).toEqual({
		nonExecOnly: true,
		unmapped: [],
		surfaces: [],
		nonExec: ["AGENTS.md", ".gitignore", ".landmark.yml"],
	});

	expect(resolveChangedSurfaces(["SPEC.md", "site/src/pages/index.astro"]).surfaces).toEqual(["site"]);
	expect(resolveChangedSurfaces([".claude-plugin/plugin.json", ".agents/skills.json"]).surfaces).toEqual(["plugin"]);
	expect(resolveChangedSurfaces(["skills/misty/SKILL.md"]).surfaces).toEqual(["plugin", "site"]);
	expect(resolveChangedSurfaces(["skills/foundations/scripts/misty-check.mjs"]).surfaces).toEqual(["plugin", "site"]);
	expect(resolveChangedSurfaces(["scripts/check-runner.ts"]).surfaces).toEqual(["plugin", "site"]);

	const failClosed = resolveChangedSurfaces(["AGENTS.md", "unknown-top-level.txt"]);
	expect(failClosed.nonExecOnly).toBe(false);
	expect(failClosed.unmapped).toEqual(["unknown-top-level.txt"]);
	expect(failClosed.surfaces).toEqual(["plugin", "site"]);
});

test("parseShard and selectShard partition cleanly and reject invalid bounds", () => {
	expect(selectShard(["plugin", "site"], parseShard("1/2"))).toEqual(["plugin"]);
	expect(selectShard(["plugin", "site"], parseShard("2/2"))).toEqual(["site"]);
	for (const bad of ["0/2", "3/2", "1/0", "abc", "1"]) {
		expect(() => parseShard(bad)).toThrow();
	}
});

test("./scripts/check doctor passes and budget overflow fails 124 with check_budget_exceeded", () => {
	const doctor = Bun.spawnSync(["./scripts/check", "doctor"], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	expect(doctor.exitCode).toBe(0);
	expect(doctor.stdout.toString()).toContain("PASS doctor:");

	const exceeded = Bun.spawnSync(["./scripts/check", "fast"], {
		cwd: repoRoot,
		env: { ...process.env, CHECK_FAST_BUDGET_SECONDS: "0.01" },
		stdout: "pipe",
		stderr: "pipe",
	});
	expect(exceeded.exitCode).toBe(BUDGET_EXCEEDED_EXIT);
	expect(exceeded.stderr.toString()).toContain("check_budget_exceeded");
});
