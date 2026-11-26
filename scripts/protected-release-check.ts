#!/usr/bin/env bun
// Runs protected publication read-only on the landed release candidate.
// Stale/stranded generated notes stop publication, never an authored PR merge.
// Landmark sees a local GitHub API: reads go to GitHub, writes are refused.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Write = { method: string; path: string; tag?: string };

export type CheckOptions = {
	landmark: string;
	repoRoot: string;
	repository: string;
	upstream: string;
	token?: string;
	// The branch the checked-out commit merges into; defaults to HEAD itself.
	base?: string;
	// How long one proxied GitHub read may take. Landmark's curl gives up at 30s.
	upstreamTimeoutMs?: number;
};

export type Cause = "infrastructure" | "awaiting-publication" | "stale-candidate" | "release-state" | "unrecognized";

export type CheckResult = {
	ok: boolean;
	verdict: string;
	cause?: Cause;
	advice?: string;
	writes: Write[];
	upstreamFailures: string[];
	stdout: string;
	stderr: string;
};

function git(repoRoot: string, ...args: string[]) {
	const result = Bun.spawnSync(["git", ...args], { cwd: repoRoot, stdout: "pipe", stderr: "pipe" });
	if (result.exitCode !== 0) throw new Error(result.stderr.toString());
	return result.stdout.toString().trim();
}

function topVersion(repoRoot: string, rev: string) {
	const changelog = Bun.spawnSync(["git", "show", `${rev}:CHANGELOG.md`], { cwd: repoRoot, stdout: "pipe" });
	return changelog.stdout.toString().match(/^#+ \[([^\]]+)\]/m)?.[1];
}

// Statuses that say GitHub, the network or the token failed, not the changelog.
const infrastructureStatus = (status: number) => status === 401 || status === 403 || status === 429 || status >= 500;

// Landmark's own finding that the entry does not match the commits it releases: the only
// evidence that may send anyone to withdraw an entry.
const mismatch = "protected release changelog differs from classified candidate commits";

const infrastructureAdvice = "GitHub's API, the token or the network failed, so the changelog was not judged. Do not change CHANGELOG.md: re-run this check once GitHub recovers.";

type Run = { exitCode: number; writes: Write[]; upstreamFailures: string[]; stdout: string; stderr: string };

// Runs Landmark's publication against a checkout, through a local API that forwards reads
// to GitHub, refuses writes, and records every way GitHub failed to answer.
async function runLandmark(options: CheckOptions, repoRoot: string): Promise<Run> {
	const writes: Write[] = [];
	const upstreamFailures: string[] = [];
	const scope = `/repos/${options.repository}/`;
	let pending = 0;
	const api = Bun.serve({
		hostname: "127.0.0.1",
		port: 0,
		// Outlast the upstream timeout, so a slow GitHub is recorded here, not dropped.
		idleTimeout: 60,
		async fetch(request) {
			const { pathname, search } = new URL(request.url);
			if (request.method !== "GET" && request.method !== "HEAD") {
				const body = await request.json().catch(() => ({}));
				writes.push({ method: request.method, path: pathname, tag: body?.tag_name });
				return Response.json({ message: "protected-release-check: writes refused" }, { status: 405 });
			}
			if (!pathname.startsWith(scope)) return Response.json({ message: "Not Found" }, { status: 404 });
			const headers: Record<string, string> = {
				Accept: "application/vnd.github+json",
				"User-Agent": "spellbook-protected-release-check",
			};
			if (options.token) headers.Authorization = `Bearer ${options.token}`;
			const read = `${request.method} ${pathname}`;
			pending++;
			try {
				const response = await fetch(`${options.upstream}${pathname}${search}`, {
					method: request.method,
					headers,
					signal: AbortSignal.timeout(options.upstreamTimeoutMs ?? 20_000),
				});
				const body = await response.text();
				if (infrastructureStatus(response.status)) upstreamFailures.push(`${read}: HTTP ${response.status}`);
				else if (response.ok && body !== "") {
					try {
						JSON.parse(body);
					} catch {
						upstreamFailures.push(`${read}: HTTP ${response.status} with a malformed body`);
					}
				}
				return new Response(body, {
					status: response.status,
					headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
				});
			} catch (error) {
				upstreamFailures.push(`${read}: ${error instanceof Error ? error.message : error}`);
				return Response.json({ message: "protected-release-check: GitHub did not answer" }, { status: 502 });
			} finally {
				pending--;
			}
		},
	});
	try {
		const child = Bun.spawn([
			options.landmark, "publish-protected-release",
			"--repo-root", repoRoot,
			"--repository", options.repository,
			"--github-token", "protected-release-check-placeholder",
			"--target-sha", git(repoRoot, "rev-parse", "HEAD"),
			"--api-base-url", `http://127.0.0.1:${api.port}`,
		], { stdout: "pipe", stderr: "pipe", env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/" } });
		const exited = child.exited.then((code) => {
			if (pending > 0) upstreamFailures.push(`Landmark exited while ${pending} GitHub read(s) were still pending`);
			return code;
		});
		const [exitCode, stdout, stderr] = await Promise.all([
			exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
		]);
		return { exitCode, writes, upstreamFailures, stdout, stderr };
	} finally {
		api.stop(true);
	}
}

// Landmark only creates a release after the candidate check passes.
const wouldPublish = (run: Run, repository: string) =>
	run.exitCode !== 0 && run.upstreamFailures.length === 0 && run.writes.length === 1 &&
	`${run.writes[0].method} ${run.writes[0].path}` === `POST /repos/${repository}/releases`;

// Runs the same refused-write publication at the base tip, to learn whether it can publish.
async function runAtBase(options: CheckOptions, baseTip: string): Promise<Run> {
	const scratch = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), "protected-release-base-"));
	const checkout = join(scratch, "base");
	git(options.repoRoot, "worktree", "add", "--quiet", "--detach", checkout, baseTip);
	try {
		return await runLandmark(options, checkout);
	} finally {
		git(options.repoRoot, "worktree", "remove", "--force", checkout);
		rmSync(scratch, { recursive: true, force: true });
	}
}

// Only Landmark's mismatch for an unpublished candidate may advise withdrawal. An entry
// the base can still publish is waiting for its tag; anything else is not the changelog's.
async function diagnose(options: CheckOptions, run: Run): Promise<{ cause: Cause; advice: string }> {
	const { repoRoot } = options;
	const base = options.base ?? "HEAD";
	const version = topVersion(repoRoot, "HEAD");
	const tagged = version && git(repoRoot, "tag", "--list", `v${version}`) !== "";
	if (!version) {
		return { cause: "release-state", advice: "CHANGELOG.md names no release. Repair the state Landmark names above." };
	}
	if (tagged) {
		return {
			cause: "release-state",
			advice: `v${version} is already tagged, so its entry is not a candidate. If this change edited that entry, restore it from v${version}; otherwise repair the tag or GitHub Release Landmark names above. Do not withdraw the entry.`,
		};
	}
	const unrecognized = {
		cause: "unrecognized" as const,
		advice: "Landmark failed in a way this check does not recognize, so the changelog was not judged. Do not change CHANGELOG.md: read Landmark's error above, then re-run this check.",
	};
	if (!run.stderr.includes(mismatch)) return unrecognized;
	const baseTip = git(repoRoot, "rev-parse", base);
	if (topVersion(repoRoot, baseTip) === version) {
		const landed = git(repoRoot, "log", "-1", "--format=%H", baseTip, "--", "CHANGELOG.md");
		const atBase = baseTip === git(repoRoot, "rev-parse", "HEAD") ? run : await runAtBase(options, baseTip);
		if (wouldPublish(atBase, options.repository)) {
			return {
				cause: "awaiting-publication",
				advice: `${base} just landed v${version} and has not tagged it yet. Do not change CHANGELOG.md: re-run this check after ${base}'s Verify and Release publishes v${version}, re-running that workflow first if it failed.`,
			};
		}
		if (atBase.upstreamFailures.length > 0) return { cause: "infrastructure", advice: infrastructureAdvice };
		if (!atBase.stderr.includes(mismatch)) return unrecognized;
		return {
			cause: "stale-candidate",
			advice: `v${version} landed on ${base} at ${landed.slice(0, 12)} but was never published, and ${base}'s commits no longer match it. Withdraw that unpublished CHANGELOG.md entry on ${base} and let the release owner regenerate it.`,
		};
	}
	return {
		cause: "stale-candidate",
		advice: `This change carries an unpublished v${version} entry that no longer matches its commits. Withdraw it and let the release owner regenerate it.`,
	};
}

export async function checkProtectedRelease(options: CheckOptions): Promise<CheckResult> {
	const run = await runLandmark(options, options.repoRoot);
	const { writes, upstreamFailures, stdout, stderr } = run;
	if (run.exitCode === 0 && writes.length === 0) {
		return { ok: true, verdict: "nothing to publish; changelog agrees with tags and releases", writes, upstreamFailures, stdout, stderr };
	}
	if (wouldPublish(run, options.repository)) {
		return { ok: true, verdict: `candidate is fresh; master would publish ${writes[0].tag}`, writes, upstreamFailures, stdout, stderr };
	}
	const verdict = `publication check failed (exit ${run.exitCode})`;
	if (upstreamFailures.length > 0) {
		return { ok: false, verdict, cause: "infrastructure", advice: infrastructureAdvice, writes, upstreamFailures, stdout, stderr };
	}
	return { ok: false, verdict, ...(await diagnose(options, run)), writes, upstreamFailures, stdout, stderr };
}

if (import.meta.main) {
	const landmark = process.env.LANDMARK_BIN;
	if (!landmark) {
		console.error("LANDMARK_BIN must name the pinned Landmark binary");
		process.exit(2);
	}
	const repoRoot = git(process.cwd(), "rev-parse", "--show-toplevel");
	const result = await checkProtectedRelease({
		landmark,
		repoRoot,
		repository: process.env.GITHUB_REPOSITORY ?? "misty-step/spellbook",
		upstream: process.env.GITHUB_API_URL ?? "https://api.github.com",
		token: process.env.GITHUB_TOKEN || undefined,
		base: process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : undefined,
	});
	console.log(`Protected release check at ${git(repoRoot, "rev-parse", "HEAD")}: ${result.verdict}`);
	for (const write of result.writes) console.log(`Refused ${write.method} ${write.path}`);
	for (const failure of result.upstreamFailures) console.log(`Upstream failure: ${failure}`);
	if (!result.ok) {
		process.stderr.write(result.stderr);
		console.error(`Cause: ${result.cause}. ${result.advice}`);
		process.exit(1);
	}
}
