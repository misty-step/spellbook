#!/usr/bin/env bun
import { YAML } from "bun";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export type Surface = "plugin" | "site";
export type ClosureClass =
	| { kind: "non-exec" }
	| { kind: "shared" }
	| { kind: "surfaces"; surfaces: Surface[] }
	| { kind: "unmapped" };

export const SURFACES: Surface[] = ["plugin", "site"];
export const DEFAULT_FAST_BUDGET_SECONDS = 120;
export const DEFAULT_VERIFY_BUDGET_SECONDS = 300;
export const BUDGET_EXCEEDED_EXIT = 124;

const SHELL_SCRIPTS = [
	"scripts/bootstrap",
	"scripts/check",
	"scripts/verify",
	".githooks/pre-commit",
	".githooks/pre-push",
];

const NON_EXEC_EXACT = new Set([
	".claude/settings.json",
	".coderabbit.yaml",
	".coderabbit.yml",
	".gitattributes",
	".gitignore",
	".landmark.yml",
	".npmignore",
	"AGENTS.md",
	"ARCHITECTURE.md",
	"LICENSE",
	"docs/decisions/0000-template.md",
	"site/.gitignore",
]);

const SHARED_EXACT = new Set([
	".gitleaks.toml",
	".gitleaksignore",
	"bun.lock",
	"bun.lockb",
	"package.json",
]);

const SITE_ROOT_DOCS = new Set([
	"ATTRIBUTION.md",
	"CONTRIBUTING.md",
	"FOUNDATIONS.md",
	"README.md",
	"SPEC.md",
]);

export class BudgetExceededError extends Error {
	constructor(
		public readonly label: string,
		public readonly budgetSeconds: number,
		public readonly elapsedSeconds: number,
	) {
		super(
			`check_budget_exceeded: ${label} exceeded budget of ${budgetSeconds}s (elapsed ${elapsedSeconds.toFixed(2)}s)`,
		);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Map a repo-relative path to its execution surface closure, or unmapped to fail closed. */
export function classifyRepoPath(repoPath: string): ClosureClass {
	const p = repoPath.replace(/\\/g, "/").replace(/^\.\//, "");
	if (NON_EXEC_EXACT.has(p) || /^skills\/[^/]+\/LICENSE$/.test(p)) {
		return { kind: "non-exec" };
	}
	if (
		SHARED_EXACT.has(p) ||
		p.startsWith("scripts/") ||
		p.startsWith(".github/") ||
		p.startsWith(".githooks/")
	) {
		return { kind: "shared" };
	}
	if (
		p === "CHANGELOG.md" ||
		p === "rules/core.md" ||
		p.startsWith("vendor/") ||
		(p.startsWith("skills/") && p.endsWith(".md"))
	) {
		return { kind: "surfaces", surfaces: ["plugin", "site"] };
	}
	if (
		p.startsWith("skills/") ||
		p.startsWith("adapters/") ||
		p.startsWith(".claude-plugin/") ||
		p.startsWith(".codex-plugin/") ||
		p.startsWith(".antigravity-plugin/") ||
		p.startsWith(".agents/") ||
		p.startsWith("assets/")
	) {
		return { kind: "surfaces", surfaces: ["plugin"] };
	}
	if (SITE_ROOT_DOCS.has(p) || p.startsWith("site/") || p.startsWith("docs/")) {
		return { kind: "surfaces", surfaces: ["site"] };
	}
	return { kind: "unmapped" };
}

/** Resolve affected surfaces across changed files; any unmapped path fails closed to all surfaces. */
export function resolveChangedSurfaces(paths: string[]) {
	const surfaceSet = new Set<Surface>();
	const nonExec: string[] = [];
	const unmapped: string[] = [];
	for (const repoPath of paths) {
		const normalized = repoPath.trim();
		if (!normalized) continue;
		const cls = classifyRepoPath(normalized);
		switch (cls.kind) {
			case "non-exec":
				nonExec.push(normalized);
				break;
			case "shared":
				for (const s of SURFACES) surfaceSet.add(s);
				break;
			case "surfaces":
				for (const s of cls.surfaces) surfaceSet.add(s);
				break;
			case "unmapped":
				unmapped.push(normalized);
				for (const s of SURFACES) surfaceSet.add(s);
				break;
		}
	}
	const surfaces = SURFACES.filter((s) => surfaceSet.has(s));
	return {
		nonExecOnly: paths.length > 0 && unmapped.length === 0 && surfaces.length === 0,
		unmapped,
		surfaces,
		nonExec,
	};
}

/** Parse `--shard <i>/<n>` into 1-based index and total shard count. */
export function parseShard(spec: string): { index: number; total: number } {
	const match = /^(\d+)\/(\d+)$/.exec(spec.trim());
	if (!match) {
		throw new Error(`Invalid --shard value "${spec}": expected <i>/<n> (e.g. 1/2)`);
	}
	const index = Number(match[1]);
	const total = Number(match[2]);
	if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || index < 1 || index > total) {
		throw new Error(`Invalid --shard bounds "${spec}": require 1 <= i <= n and n >= 1`);
	}
	return { index, total };
}

/** Select the deterministic slice of items assigned to 1-based shard `i/n`. */
export function selectShard<T>(items: T[], shard: { index: number; total: number }): T[] {
	return items.filter((_, idx) => (idx % shard.total) + 1 === shard.index);
}

function collectWorkflowTriggerNames(onValue: unknown): string[] {
	if (typeof onValue === "string") return [onValue];
	if (Array.isArray(onValue)) return onValue.filter((v): v is string => typeof v === "string");
	if (isRecord(onValue)) return Object.keys(onValue);
	return [];
}

/** Reject heavy `pull_request` or `pull_request_target` workflows (ADR 0023 / 0029). */
export function inspectWorkflowHygiene(root: string): string[] {
	const dir = join(root, ".github/workflows");
	if (!existsSync(dir)) return [];
	const errors: string[] = [];
	const entries = readdirSync(dir)
		.filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
		.sort();
	for (const entry of entries) {
		const full = join(dir, entry);
		const rel = relative(root, full).replace(/\\/g, "/");
		let parsed: unknown;
		try {
			parsed = YAML.parse(readFileSync(full, "utf8"));
		} catch (error) {
			errors.push(`${rel}: invalid YAML (${error instanceof Error ? error.message : String(error)})`);
			continue;
		}
		if (!isRecord(parsed)) {
			errors.push(`${rel}: workflow must be a YAML mapping`);
			continue;
		}
		const onField = parsed.on ?? parsed.true;
		const triggers = collectWorkflowTriggerNames(onField);
		for (const forbidden of ["pull_request", "pull_request_target"]) {
			if (triggers.includes(forbidden)) {
				errors.push(`${rel}: forbidden workflow trigger "${forbidden}" (ADR 0023 / 0029)`);
			}
		}
	}
	return errors;
}

/** Reject active PR review bot configs unless auto-review is explicitly disabled. */
export function inspectReviewBots(root: string): string[] {
	const errors: string[] = [];
	for (const candidate of [".coderabbit.yaml", ".coderabbit.yml"]) {
		const full = join(root, candidate);
		if (!existsSync(full)) continue;
		let parsed: unknown;
		try {
			parsed = YAML.parse(readFileSync(full, "utf8"));
		} catch (error) {
			errors.push(`${candidate}: invalid YAML (${error instanceof Error ? error.message : String(error)})`);
			continue;
		}
		const reviews = isRecord(parsed) && isRecord(parsed.reviews) ? parsed.reviews : undefined;
		const autoReview = reviews && isRecord(reviews.auto_review) ? reviews.auto_review : undefined;
		if (!autoReview || autoReview.enabled !== false) {
			errors.push(`${candidate}: active PR review bot configuration (requires reviews.auto_review.enabled: false)`);
		}
	}
	return errors;
}

function listTrackedFiles(root: string): string[] {
	const res = Bun.spawnSync(["git", "ls-files", "-z"], {
		cwd: root,
		stdout: "pipe",
		stderr: "pipe",
	});
	if (res.exitCode !== 0) {
		throw new Error(`git ls-files failed: ${res.stderr.toString().trim()}`);
	}
	return res.stdout
		.toString()
		.split("\0")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

/** Verify prerequisites, complete tracked-file closure coverage, and workflow/bot hygiene. */
export function runDoctorChecks(
	root: string,
	options: { paths?: string[]; tools?: string[] } = {},
): { ok: boolean; errors: string[]; fileCount: number } {
	const errors: string[] = [];
	const requiredTools = options.tools ?? ["sh", "git", "bun", "python3"];
	for (const tool of requiredTools) {
		if (!Bun.which(tool)) {
			errors.push(`missing required tool on PATH: ${tool}`);
		}
	}
	const paths = options.paths ?? listTrackedFiles(root);
	const unmapped = paths.filter((p) => classifyRepoPath(p).kind === "unmapped");
	for (const p of unmapped) {
		errors.push(`unmapped tracked file in surface closure: ${p}`);
	}
	errors.push(...inspectWorkflowHygiene(root));
	errors.push(...inspectReviewBots(root));
	return { ok: errors.length === 0, errors, fileCount: paths.length };
}

export function resolveBudgetSeconds(envVar: string, fallback: number): number {
	const raw = process.env[envVar];
	if (raw === undefined || raw.trim() === "") return fallback;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`${envVar} must be a positive number, got "${raw}"`);
	}
	return parsed;
}

/** Run a command inside an aggregate wall-clock deadline; kill and fail 124 on breach. */
export async function runWithBudget(
	cmd: string[],
	cwd: string,
	budgetSeconds: number,
	label: string,
	overallStartMs = Date.now(),
	env?: Record<string, string | undefined>,
): Promise<{ exitCode: number; elapsedSeconds: number }> {
	const elapsedBeforeMs = Date.now() - overallStartMs;
	const remainingMs = budgetSeconds * 1000 - elapsedBeforeMs;
	if (remainingMs <= 0) {
		throw new BudgetExceededError(label, budgetSeconds, elapsedBeforeMs / 1000);
	}
	const proc = Bun.spawn(cmd, {
		cwd,
		env: env ?? process.env,
		stdout: "inherit",
		stderr: "inherit",
	});
	let timedOut = false;
	let killTimer: ReturnType<typeof setTimeout> | undefined;
	const timeoutTimer = setTimeout(() => {
		timedOut = true;
		try {
			proc.kill("SIGTERM");
		} catch {
			// Process already exited.
		}
		killTimer = setTimeout(() => {
			try {
				proc.kill("SIGKILL");
			} catch {
				// Process already exited.
			}
		}, 500);
	}, Math.max(1, Math.ceil(remainingMs)));

	const exitCode = await proc.exited;
	clearTimeout(timeoutTimer);
	if (killTimer) clearTimeout(killTimer);

	const totalElapsedSeconds = (Date.now() - overallStartMs) / 1000;
	if (timedOut || totalElapsedSeconds > budgetSeconds) {
		throw new BudgetExceededError(label, budgetSeconds, totalElapsedSeconds);
	}
	return { exitCode, elapsedSeconds: totalElapsedSeconds };
}

function gitLines(root: string, args: string[]): string[] {
	const res = Bun.spawnSync(["git", ...args], {
		cwd: root,
		stdout: "pipe",
		stderr: "pipe",
	});
	if (res.exitCode !== 0) {
		throw new Error(`git ${args.join(" ")} failed: ${res.stderr.toString().trim()}`);
	}
	return res.stdout
		.toString()
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function gitRefExists(root: string, ref: string): boolean {
	const res = Bun.spawnSync(["git", "rev-parse", "--verify", "--quiet", ref], {
		cwd: root,
		stdout: "ignore",
		stderr: "ignore",
	});
	return res.exitCode === 0;
}

function getChangedFiles(root: string, base?: string): string[] {
	if (base) {
		if (base.includes("..")) {
			return [...new Set(gitLines(root, ["diff", "--name-only", base]))].sort();
		}
		const diff = gitLines(root, ["diff", "--name-only", base]);
		const untracked = gitLines(root, ["ls-files", "--others", "--exclude-standard"]);
		return [...new Set([...diff, ...untracked])].sort();
	}
	const dirty = gitLines(root, ["diff", "--name-only", "HEAD"]);
	const untracked = gitLines(root, ["ls-files", "--others", "--exclude-standard"]);
	const workingTree = [...new Set([...dirty, ...untracked])].sort();
	if (workingTree.length > 0) return workingTree;

	for (const candidate of ["origin/verified..HEAD", "verified..HEAD", "HEAD~1..HEAD"]) {
		const baseRef = candidate.split("..")[0];
		if (gitRefExists(root, baseRef)) {
			return [...new Set(gitLines(root, ["diff", "--name-only", candidate]))].sort();
		}
	}
	return [];
}

async function runFast(root: string, args: string[]): Promise<number> {
	if (args.length > 0) {
		throw new Error(`Usage: scripts/check fast (unexpected argument: ${args[0]})`);
	}
	const startMs = Date.now();
	const budgetSeconds = resolveBudgetSeconds("CHECK_FAST_BUDGET_SECONDS", DEFAULT_FAST_BUDGET_SECONDS);
	const steps = [
		...SHELL_SCRIPTS.map((script) => ["sh", "-n", script]),
		[process.execPath, "scripts/stamp-version.ts", "--check"],
		[process.execPath, "scripts/verify-plugin.ts", "--strict", "--lint-only"],
	];
	for (const cmd of steps) {
		const res = await runWithBudget(cmd, root, budgetSeconds, "fast", startMs);
		if (res.exitCode !== 0) return res.exitCode;
	}
	const elapsed = (Date.now() - startMs) / 1000;
	console.log(`PASS fast (${elapsed.toFixed(2)}s <= ${budgetSeconds}s)`);
	return 0;
}

async function runSurface(root: string, surface: Surface, budgetSeconds: number): Promise<void> {
	if (surface === "plugin") {
		const startMs = Date.now();
		const res = await runWithBudget(
			[process.execPath, "scripts/verify-plugin.ts", "--strict"],
			root,
			budgetSeconds,
			"verify:plugin",
			startMs,
		);
		if (res.exitCode !== 0) {
			process.exit(res.exitCode);
		}
		console.log(`PASS verify surface=plugin (${res.elapsedSeconds.toFixed(2)}s <= ${budgetSeconds}s)`);
		return;
	}

	if (!Bun.which("node") || !Bun.which("npm")) {
		throw new Error("verify --surface site requires node and npm on PATH");
	}
	const siteModules = join(root, "site/node_modules");
	if (!existsSync(siteModules) || !statSync(siteModules).isDirectory()) {
		throw new Error("verify --surface site requires site/node_modules (run: npm --prefix site ci)");
	}
	const startMs = Date.now();
	const build = await runWithBudget(
		["npm", "--prefix", "site", "run", "build"],
		root,
		budgetSeconds,
		"verify:site",
		startMs,
	);
	if (build.exitCode !== 0) process.exit(build.exitCode);
	const check = await runWithBudget(
		["npm", "--prefix", "site", "run", "check"],
		root,
		budgetSeconds,
		"verify:site",
		startMs,
	);
	if (check.exitCode !== 0) process.exit(check.exitCode);
	console.log(`PASS verify surface=site (${check.elapsedSeconds.toFixed(2)}s <= ${budgetSeconds}s)`);
}

function parseVerifyArgs(args: string[]) {
	let changed = false;
	let changedBase: string | undefined;
	const surfaces: Surface[] = [];
	let shardSpec: string | undefined;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--changed") {
			changed = true;
			const next = args[i + 1];
			if (next && !next.startsWith("-")) {
				changedBase = next;
				i++;
			}
		} else if (arg === "--surface") {
			const next = args[++i];
			if (next !== "plugin" && next !== "site") {
				throw new Error(`Invalid --surface "${next ?? ""}": expected plugin or site`);
			}
			if (!surfaces.includes(next)) surfaces.push(next);
		} else if (arg === "--shard") {
			const next = args[++i];
			if (!next) throw new Error("Missing value after --shard (expected <i>/<n>)");
			shardSpec = next;
		} else {
			throw new Error(`Usage: scripts/check verify [--changed [base]] [--surface <plugin|site>] [--shard <i>/<n>] (unexpected: ${arg})`);
		}
	}

	if (changed && surfaces.length > 0) {
		throw new Error("Cannot combine --changed with explicit --surface");
	}
	return { changed, changedBase, surfaces, shardSpec };
}

async function runVerify(root: string, args: string[]): Promise<number> {
	const { changed, changedBase, surfaces: explicitSurfaces, shardSpec } = parseVerifyArgs(args);
	const budgetSeconds = resolveBudgetSeconds("CHECK_VERIFY_BUDGET_SECONDS", DEFAULT_VERIFY_BUDGET_SECONDS);
	const shard = shardSpec ? parseShard(shardSpec) : undefined;

	let selectedSurfaces: Surface[];
	if (changed) {
		const startedAt = Date.now();
		const changedFiles = getChangedFiles(root, changedBase);
		if (changedFiles.length === 0) {
			const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
			console.log(`PASS verify --changed: no changed files; 0 surfaces run (${elapsed}s)`);
			return 0;
		}
		const plan = resolveChangedSurfaces(changedFiles);
		if (plan.unmapped.length > 0) {
			console.warn(`WARN unmapped changed path(s) fail closed to all surfaces: ${plan.unmapped.join(", ")}`);
		} else if (plan.nonExecOnly) {
			const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
			console.log(`PASS verify --changed: non-exec (${plan.nonExec.length} file(s)) in ${elapsed}s`);
			return 0;
		}
		selectedSurfaces = plan.surfaces;
	} else if (explicitSurfaces.length > 0) {
		selectedSurfaces = explicitSurfaces;
	} else {
		selectedSurfaces = [...SURFACES];
	}

	if (shard) {
		selectedSurfaces = selectShard(selectedSurfaces, shard);
		if (selectedSurfaces.length === 0) {
			console.log(`PASS verify --shard ${shard.index}/${shard.total}: 0 assigned surfaces`);
			return 0;
		}
	}

	for (const surface of selectedSurfaces) {
		await runSurface(root, surface, budgetSeconds);
	}
	return 0;
}

if (import.meta.main) {
	const root = resolve(import.meta.dir, "..");
	const [subcommand, ...rest] = process.argv.slice(2);
	try {
		if (subcommand === "doctor") {
			if (rest.length > 0) throw new Error(`Usage: scripts/check doctor (unexpected: ${rest[0]})`);
			const report = runDoctorChecks(root);
			for (const err of report.errors) console.error(`ERROR: ${err}`);
			if (!report.ok) process.exit(1);
			console.log(`PASS doctor: ${report.fileCount} tracked files mapped; prerequisites and workflow hygiene clean`);
			process.exit(0);
		} else if (subcommand === "fast") {
			process.exit(await runFast(root, rest));
		} else if (subcommand === "verify") {
			process.exit(await runVerify(root, rest));
		} else {
			throw new Error("Usage: scripts/check <doctor|fast|verify>");
		}
	} catch (error) {
		if (error instanceof BudgetExceededError) {
			console.error(error.message);
			process.exit(BUDGET_EXCEEDED_EXIT);
		}
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
