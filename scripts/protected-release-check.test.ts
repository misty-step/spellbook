import { afterEach, expect, test } from "bun:test";
import { YAML } from "bun";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Socket } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import { checkProtectedRelease } from "./protected-release-check";

const roots: string[] = [];
const servers: { stop(force?: boolean): void }[] = [];
const sockets: Socket[] = [];
const landmark = process.env.LANDMARK_BIN;

afterEach(() => {
	for (const socket of sockets.splice(0)) socket.destroy();
	for (const server of servers.splice(0)) server.stop(true);
	for (const path of roots.splice(0)) rmSync(path, { recursive: true, force: true });
});

function fixture() {
	const scratch = process.env.TMPDIR ?? join(homedir(), ".cache/tmp");
	mkdirSync(scratch, { recursive: true });
	const repo = mkdtempSync(join(scratch, "protected-release-check-"));
	roots.push(repo);
	const git = (...args: string[]) => {
		const result = Bun.spawnSync(["git", ...args], { cwd: repo, stdout: "pipe", stderr: "pipe" });
		if (result.exitCode !== 0) throw new Error(result.stderr.toString());
		return result.stdout.toString().trim();
	};
	const commit = (message: string) => {
		git("add", ".");
		git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "--allow-empty", "-m", message);
		return git("rev-parse", "HEAD");
	};
	const prepare = () => {
		const result = Bun.spawnSync([
			landmark!, "prepare-protected-release", "--repo-root", repo, "--repository", "owner/repo",
		], { stdout: "pipe", stderr: "pipe" });
		if (result.exitCode !== 0) throw new Error(result.stderr.toString());
	};
	git("init", "--quiet", "-b", "master");
	writeFileSync(join(repo, "CHANGELOG.md"), "# [0.1.0](https://github.com/owner/repo/releases/tag/v0.1.0) (2026-09-25)\n");
	const baseline = commit("chore: baseline");
	git("tag", "v0.1.0");
	commit("fix: repair an observable defect");
	return { repo, git, commit, prepare, baseline };
}

// A read-only GitHub that knows which tags have published releases, or that is down.
function github(published: Record<string, string>, outage?: number) {
	const reads: string[] = [];
	const server = Bun.serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch(request) {
			const path = new URL(request.url).pathname;
			reads.push(path);
			if (outage) return Response.json({ message: "unavailable" }, { status: outage });
			const ref = path.match(/^\/repos\/owner\/repo\/git\/ref\/tags\/(.+)$/);
			if (ref && published[ref[1]]) return Response.json({ object: { sha: published[ref[1]], type: "commit" } });
			const release = path.match(/^\/repos\/owner\/repo\/releases\/tags\/(.+)$/);
			if (release && published[release[1]]) {
				return Response.json({ id: 1, draft: false, target_commitish: "master", html_url: "https://example.invalid" });
			}
			return Response.json({ message: "Not Found" }, { status: 404 });
		},
	});
	servers.push(server);
	return { upstream: `http://127.0.0.1:${server.port}`, reads };
}

test("US-015 CI replays the same Landmark that publishes", () => {
	const workflows = join(import.meta.dir, "../.github/workflows");
	const ci = readFileSync(join(workflows, "ci.yml"), "utf8");
	const release = readFileSync(join(workflows, "landmark-release.yml"), "utf8");
	const pinned = [...release.matchAll(/uses: misty-step\/landmark@[0-9a-f]{40} # v(\S+)/g)].map((match) => match[1]);
	expect(pinned.length).toBeGreaterThan(0);
	expect(new Set(pinned)).toEqual(new Set([ci.match(/landmark\/releases\/download\/v([^/]+)\//)?.[1]]));
});

test("US-015 release-only checks precede publication and deploy the same checked artifact", () => {
	const workflows = join(import.meta.dir, "../.github/workflows");
	const ci = YAML.parse(readFileSync(join(workflows, "ci.yml"), "utf8"));
	const release = YAML.parse(readFileSync(join(workflows, "landmark-release.yml"), "utf8"));
	const deploy = YAML.parse(readFileSync(join(workflows, "site-deploy.yml"), "utf8"));
	expect(Object.keys(release.on)).toEqual(["workflow_dispatch"]);
	expect(Object.keys(ci.on)).toEqual(["workflow_call"]);
	expect(Object.keys(deploy.on)).toEqual(["workflow_call"]);
	expect(release.jobs.verify.needs).toBe("prepare");
	expect(release.jobs.verify.uses).toBe("./.github/workflows/ci.yml");
	expect(release.jobs.publish.needs).toEqual(["prepare", "verify"]);
	expect(release.jobs.deploy.needs).toEqual(["prepare", "verify", "publish"]);
	expect(release.on.workflow_dispatch.inputs["critical-review"].required).toBe(true);
	const merge = release.jobs.prepare.steps.find((step: { run?: string }) => step.run?.includes("gh pr merge"));
	expect(merge.run).not.toMatch(/--auto|gh pr checks/);
	const upload = ci.jobs.site.steps.find((step: { uses?: string }) => step.uses?.startsWith("actions/upload-artifact@"));
	const download = deploy.jobs.deploy.steps.find((step: { uses?: string }) => step.uses?.startsWith("actions/download-artifact@"));
	expect(upload.with.name).toBe("spellbook-site-${{ inputs.revision }}");
	expect(download.with.name).toBe(upload.with.name);
	expect(deploy.jobs.deploy.steps.some((step: { run?: string }) => step.run?.includes("npm run build"))).toBe(false);
});

test("US-015 all successful release schedules preserve verification before publication and deployment", () => {
	type Job = { needs?: string | string[] };
	const release = YAML.parse(readFileSync(join(import.meta.dir, "../.github/workflows/landmark-release.yml"), "utf8"));
	const required: Record<string, string[]> = { verify: ["prepare"], publish: ["verify"], deploy: ["verify", "publish"] };
	const counterexample = (jobs: Record<string, Job>): string[] | undefined => {
		const pending: string[][] = [[]];
		const visited = new Set<string>();
		for (const completed of pending) {
			const key = [...completed].sort().join(",");
			if (visited.has(key)) continue;
			visited.add(key);
			for (const [name, job] of Object.entries(jobs)) {
				const dependencies = job.needs === undefined ? [] : typeof job.needs === "string" ? [job.needs] : job.needs;
				if (completed.includes(name) || !dependencies.every(dependency => completed.includes(dependency))) continue;
				const next = [...completed, name];
				if ((required[name] ?? []).some(predecessor => !completed.includes(predecessor))) return next;
				pending.push(next);
			}
		}
		return undefined;
	};
	expect(Object.keys(release.jobs).sort()).toEqual(["deploy", "prepare", "publish", "verify"]);
	expect(counterexample(release.jobs)).toBeUndefined();
	const broken = { ...release.jobs, publish: { ...release.jobs.publish, needs: ["prepare"] } };
	expect(counterexample(broken)).toEqual(["prepare", "publish"]);
});

const check = (repoRoot: string, upstream: string, base?: string, upstreamTimeoutMs?: number, bin = landmark!) =>
	checkProtectedRelease({ landmark: bin, repoRoot, repository: "owner/repo", upstream, base, upstreamTimeoutMs });

// A GitHub that accepts each connection and then misbehaves at the socket.
function brokenGitHub(answer: (socket: Socket) => void) {
	const server = createServer((socket) => {
		sockets.push(socket);
		socket.once("data", () => answer(socket));
	});
	server.listen(0, "127.0.0.1");
	servers.push({ stop: () => server.close() });
	return new Promise<string>((resolve) => server.once("listening", () => {
		resolve(`http://127.0.0.1:${(server.address() as { port: number }).port}`);
	}));
}

// A release PR: landmark/release carries a fresh, untagged candidate on top of a master
// tagged v0.1.0. A healthy GitHub passes it as fresh.
function freshCandidate() {
	const repo = fixture();
	repo.git("switch", "--quiet", "-c", "landmark/release");
	repo.prepare();
	repo.commit("chore(release): 0.1.1");
	return repo;
}

// A stand-in for Landmark, for failures the real one cannot be steered into.
function fakeLandmark(script: string) {
	const scratch = mkdtempSync(join(process.env.TMPDIR ?? join(homedir(), ".cache/tmp"), "fake-landmark-"));
	roots.push(scratch);
	const bin = join(scratch, "landmark");
	writeFileSync(bin, `#!/bin/sh\n${script}\n`);
	chmodSync(bin, 0o755);
	return bin;
}

// A protected release that master published, followed by an ordinary change.
function publishedRelease() {
	const repo = fixture();
	repo.prepare();
	const release = repo.commit("chore(release): 0.1.1");
	repo.git("tag", "v0.1.1");
	repo.commit("fix: the next independently releasable change");
	return { ...repo, release };
}

test.skipIf(!landmark)("US-015 a markerless baseline passes the PR check without any write", async () => {
	const { repo, baseline } = fixture();
	const api = github({ "v0.1.0": baseline });
	const result = await check(repo, api.upstream);
	expect(result.ok).toBe(true);
	expect(result.writes).toEqual([]);
});

test.skipIf(!landmark)("US-015 a published protected release reconciles against GitHub and passes without any write", async () => {
	const { repo, baseline, release } = publishedRelease();
	const api = github({ "v0.1.0": baseline, "v0.1.1": release });
	const result = await check(repo, api.upstream);
	expect(result.ok).toBe(true);
	expect(result.writes).toEqual([]);
	expect(api.reads).toContain("/repos/owner/repo/git/ref/tags/v0.1.1");
	expect(api.reads).toContain("/repos/owner/repo/releases/tags/v0.1.1");
});

for (const [name, upstream] of [
	["an HTTP 503", (published: Record<string, string>) => github(published, 503).upstream],
	["an HTTP 401", (published: Record<string, string>) => github(published, 401).upstream],
	["a refused connection", () => "http://127.0.0.1:9"],
] as const) {
	test.skipIf(!landmark)(`US-015 ${name} from GitHub advises a retry, not a withdrawal`, async () => {
		const { repo, baseline, release } = publishedRelease();
		const result = await check(repo, upstream({ "v0.1.0": baseline, "v0.1.1": release }));
		expect(result.ok).toBe(false);
		expect(result.cause).toBe("infrastructure");
		expect(result.upstreamFailures.length).toBeGreaterThan(0);
		expect(result.advice).toContain("re-run this check once GitHub recovers");
		expect(result.advice).not.toContain("Withdraw");
	});
}

test.skipIf(!landmark)("US-015 the fresh release PR passes against a healthy GitHub", async () => {
	const { repo, baseline } = freshCandidate();
	const result = await check(repo, github({ "v0.1.0": baseline }).upstream, "master");
	expect(result.ok).toBe(true);
	expect(result.verdict).toBe("candidate is fresh; master would publish v0.1.1");
});

for (const [name, upstream, failure] of [
	["a reset mid-body after HTTP 200", () => brokenGitHub((socket) => {
		socket.write("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 4096\r\n\r\n{\"object\":");
		socket.resetAndDestroy();
	}), /GET \/repos\/owner\/repo\/\S+: /],
	["a malformed body with HTTP 200", async () => {
		const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("{1", { headers: { "Content-Type": "application/json" } }) });
		servers.push(server);
		return `http://127.0.0.1:${server.port}`;
	}, /HTTP 200 with a malformed body/],
	["an upstream that accepts and never answers", () => brokenGitHub(() => {}), /timed out/i],
] as const) {
	test.skipIf(!landmark)(`US-015 ${name} on a fresh candidate advises a retry, not a withdrawal`, async () => {
		const { repo } = freshCandidate();
		const result = await check(repo, await upstream(), "master", 1000);
		expect(result.ok).toBe(false);
		expect(result.cause).toBe("infrastructure");
		expect(result.upstreamFailures.join("\n")).toMatch(failure);
		expect(result.advice).toContain("Do not change CHANGELOG.md");
		expect(result.advice).not.toContain("Withdraw");
	}, 30_000);
}

test.skipIf(!landmark)("US-015 Landmark exiting while a GitHub read is pending advises a retry, not a withdrawal", async () => {
	const { repo } = freshCandidate();
	const bin = fakeLandmark(`for arg; do case "$prev" in --api-base-url) api="$arg";; esac; prev="$arg"; done
curl -s --max-time 1 "$api/repos/owner/repo/git/ref/tags/v0.1.0"
echo "curl: (28) Operation timed out after 1000 milliseconds with 0 bytes received" >&2
exit 1`);
	const result = await check(repo, await brokenGitHub(() => {}), "master", 10_000, bin);
	expect(result.ok).toBe(false);
	expect(result.cause).toBe("infrastructure");
	expect(result.upstreamFailures).toEqual(["Landmark exited while 1 GitHub read(s) were still pending"]);
	expect(result.advice).not.toContain("Withdraw");
});

test.skipIf(!landmark)("US-015 an unrecognized Landmark failure on a fresh candidate says not to change CHANGELOG.md", async () => {
	const { repo, baseline } = freshCandidate();
	const bin = fakeLandmark(`echo "unexpected Landmark failure" >&2\nexit 1`);
	const result = await check(repo, github({ "v0.1.0": baseline }).upstream, "master", undefined, bin);
	expect(result.ok).toBe(false);
	expect(result.cause).toBe("unrecognized");
	expect(result.advice).toContain("Do not change CHANGELOG.md");
	expect(result.advice).not.toContain("Withdraw");
});

for (const [name, history] of [
	["a stranded candidate followed by a CHANGELOG-only edit", (repo: ReturnType<typeof fixture>) => {
		repo.prepare();
		repo.commit("chore(release): 0.1.1");
		repo.commit("fix: land after the untagged release");
		writeFileSync(join(repo.repo, "CHANGELOG.md"), `${readFileSync(join(repo.repo, "CHANGELOG.md"), "utf8")}\n<!-- annotated -->\n`);
		repo.commit("docs: annotate the changelog");
	}],
	["a release commit already stale when it landed", (repo: ReturnType<typeof fixture>) => {
		repo.prepare();
		const changelog = readFileSync(join(repo.repo, "CHANGELOG.md"), "utf8");
		repo.git("checkout", "--quiet", "CHANGELOG.md");
		repo.commit("fix: land before the generated release");
		writeFileSync(join(repo.repo, "CHANGELOG.md"), changelog);
		repo.commit("chore(release): 0.1.1");
	}],
] as const) {
	test.skipIf(!landmark)(`US-015 a PR on ${name} on master blames master's candidate, not awaiting publication`, async () => {
		const repo = fixture();
		history(repo);
		repo.git("switch", "--quiet", "-c", "feature");
		repo.commit("fix: a change opened on the stale base");
		const result = await check(repo.repo, github({ "v0.1.0": repo.baseline }).upstream, "master");
		expect(result.ok).toBe(false);
		expect(result.cause).toBe("stale-candidate");
		expect(result.advice).toContain("Withdraw that unpublished CHANGELOG.md entry on master");
		expect(repo.git("worktree", "list")).not.toContain("protected-release-base-");
	});
}

test.skipIf(!landmark)("US-015 a PR based on a just-landed release advises a re-run after master publishes", async () => {
	const { repo, git, commit, prepare, baseline } = fixture();
	prepare();
	commit("chore(release): 0.1.1");
	git("switch", "--quiet", "-c", "feature");
	commit("fix: a change opened before the tag lands");
	const result = await check(repo, github({ "v0.1.0": baseline }).upstream, "master");
	expect(result.ok).toBe(false);
	expect(result.cause).toBe("awaiting-publication");
	expect(result.advice).toContain("re-run this check after master's Verify and Release publishes v0.1.1");
	expect(result.advice).not.toContain("Withdraw");
});

test.skipIf(!landmark)("US-015 a PR carrying its own stale candidate advises withdrawing it", async () => {
	const { repo, git, commit, prepare, baseline } = fixture();
	git("switch", "--quiet", "-c", "feature");
	prepare();
	commit("chore(release): 0.1.1");
	commit("fix: land after the candidate was generated");
	const result = await check(repo, github({ "v0.1.0": baseline }).upstream, "master");
	expect(result.ok).toBe(false);
	expect(result.cause).toBe("stale-candidate");
	expect(result.advice).toContain("This change carries an unpublished v0.1.1 entry");
});

test.skipIf(!landmark)("US-015 a fresh release candidate passes because master would publish it; the write is refused", async () => {
	const { repo, commit, prepare, baseline } = fixture();
	prepare();
	commit("chore(release): 0.1.1");
	const api = github({ "v0.1.0": baseline });
	const result = await check(repo, api.upstream);
	expect(result.ok).toBe(true);
	expect(result.verdict).toContain("v0.1.1");
	expect(result.writes).toEqual([{ method: "POST", path: "/repos/owner/repo/releases", tag: "v0.1.1" }]);
});

test.skipIf(!landmark)("US-015 a landed candidate stranded by a later change turns the PR red", async () => {
	const { repo, commit, prepare, baseline } = fixture();
	prepare();
	commit("chore(release): 0.1.1");
	commit("fix: land after the untagged release");
	const api = github({ "v0.1.0": baseline });
	const result = await check(repo, api.upstream);
	expect(result.ok).toBe(false);
	expect(result.writes).toEqual([]);
	expect(result.stderr).toContain("protected release changelog differs from classified candidate commits");
	expect(result.cause).toBe("stale-candidate");
	expect(result.advice).toContain("Withdraw that unpublished CHANGELOG.md entry");
});

test.skipIf(!landmark)("US-015 a tagged release missing its GitHub Release turns the PR red", async () => {
	const { repo, git, commit, prepare, baseline } = fixture();
	prepare();
	commit("chore(release): 0.1.1");
	git("tag", "v0.1.1");
	commit("fix: the next independently releasable change");
	const api = github({ "v0.1.0": baseline });
	const result = await check(repo, api.upstream);
	expect(result.ok).toBe(false);
	expect(result.writes).toEqual([]);
	expect(api.reads).toContain("/repos/owner/repo/releases/tags/v0.1.1");
	expect(result.stderr).toContain("previous protected release is not published at its tagged commit");
	expect(result.cause).toBe("release-state");
	expect(result.advice).toContain("v0.1.1 is already tagged");
	expect(result.advice).not.toContain("Withdraw");
});
