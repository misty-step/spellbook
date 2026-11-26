#!/usr/bin/env bun
import { YAML } from "bun";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

// Spellbook was published as `mistystack`. Claude Code keys installs by plugin@marketplace,
// so renaming either orphans every existing `mistystack@mistystack` install ("Plugin
// mistystack not found"). The machine identifier stays until a deliberate migration.
export const CLAUDE_PLUGIN_ID = "mistystack";

// Portable voice: mirrors site/src/lib/portable-voice.mjs (credit lives in ATTRIBUTION.md).
export const PERSONAL_NAMES =
	/\b(?:phaedrus|parnas|ousterhout|lauren tan|kent c\.? dodds|zach lloyd|torvalds|carmack|berkopec|richard sutton|rieseberg|joseph suarez|pocock)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function inside(root: string, target: string) {
	const rel = relative(resolve(root), resolve(target));
	return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

function document(path: string) {
	const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
	const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
	if (!match) throw new Error("missing YAML frontmatter");
	const frontmatter: unknown = YAML.parse(match[1]);
	if (!isRecord(frontmatter)) throw new Error("frontmatter must be a mapping");
	return { frontmatter, body: text.slice(match[0].length).trim(), raw: text };
}

function markdownLinks(text: string) {
	const links = new Set<string>();
	Bun.markdown.render(text, {
		link: (children, { href }) => {
			links.add(href);
			return children;
		},
		image: (_children, { src }) => {
			links.add(src);
			return "";
		},
	});
	return links;
}

function jsonObject(path: string): Record<string, unknown> {
	const value: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (!isRecord(value)) throw new Error("must be a JSON object");
	return value;
}

function lintManifests(root: string, errors: string[]) {
	const load = (file: string) => {
		try {
			return jsonObject(join(root, file));
		} catch (error) {
			errors.push(
				`${file}: ${existsSync(join(root, file)) ? (error instanceof Error ? error.message : String(error)) : "missing manifest"}`,
			);
			return undefined;
		}
	};

	const checkPath = (file: string, value: unknown, kind: "file" | "directory") => {
		if (!nonempty(value)) {
			errors.push(`${file}: referenced ${kind} path must be non-empty`);
			return undefined;
		}
		const target = resolve(root, value);
		if (isAbsolute(value) || !inside(root, target)) {
			errors.push(`${file}: path must stay inside the plugin: ${value}`);
			return undefined;
		}
		if (!existsSync(target) || (kind === "file" ? !statSync(target).isFile() : !statSync(target).isDirectory())) {
			errors.push(`${file}: missing ${kind} ${value}`);
			return undefined;
		}
		if (!inside(realpathSync(root), realpathSync(target))) {
			errors.push(`${file}: path must stay inside the plugin: ${value}`);
			return undefined;
		}
		return target;
	};

	// .claude-plugin/plugin.json
	const claudePlugin = load(".claude-plugin/plugin.json");
	if (claudePlugin) {
		if (claudePlugin.name !== CLAUDE_PLUGIN_ID) errors.push(`.claude-plugin/plugin.json: name must stay ${CLAUDE_PLUGIN_ID} (stable install identifier)`);
		const skillsVal = claudePlugin.skills === undefined ? "./skills" : claudePlugin.skills;
		if (checkPath(".claude-plugin/plugin.json: skills", skillsVal, "directory") !== resolve(root, "skills")) {
			errors.push(".claude-plugin/plugin.json: skills must reference ./skills");
		}
		const hooks = isRecord(claudePlugin.hooks) ? claudePlugin.hooks : {};
		const starts = Array.isArray(hooks.SessionStart) ? hooks.SessionStart : [];
		const coreRef = /\$(?:\{CLAUDE_PLUGIN_ROOT\}|CLAUDE_PLUGIN_ROOT)\/rules\/core\.md(?=["'\s]|$)/;
		const hasCore = starts.some(
			(group) =>
				isRecord(group) &&
				Array.isArray(group.hooks) &&
				group.hooks.some(
					(hook) => isRecord(hook) && hook.type === "command" && nonempty(hook.command) && coreRef.test(hook.command),
				),
		);
		if (!hasCore) {
			errors.push(".claude-plugin/plugin.json: SessionStart must register $CLAUDE_PLUGIN_ROOT/rules/core.md");
		}
	}

	// .claude-plugin/marketplace.json (lean: only the local plugin, zero auto-mounted companion packs)
	const marketplace = load(".claude-plugin/marketplace.json");
	if (marketplace) {
		if (marketplace.name !== CLAUDE_PLUGIN_ID) {
			errors.push(`.claude-plugin/marketplace.json: name must stay ${CLAUDE_PLUGIN_ID} (stable install identifier)`);
		}
		if (!isRecord(marketplace.owner) || !nonempty(marketplace.owner.name)) {
			errors.push(".claude-plugin/marketplace.json: owner.name must be non-empty");
		}
		const plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
		if (plugins.length !== 1 || !isRecord(plugins[0]) || plugins[0].name !== CLAUDE_PLUGIN_ID || plugins[0].source !== "./") {
			errors.push(`.claude-plugin/marketplace.json: must list only the local ${CLAUDE_PLUGIN_ID} plugin (source: "./")`);
		}
	}

	// .agents/skills.json & .agents/rules.json
	for (const [file, dir] of [
		[".agents/skills.json", "skills"],
		[".agents/rules.json", "rules"],
	] as const) {
		const manifest = load(file);
		if (!manifest) continue;
		const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
		if (
			entries.length !== 1 ||
			!isRecord(entries[0]) ||
			checkPath(`${file}: entries[0].path`, entries[0].path, "directory") !== resolve(root, dir)
		) {
			errors.push(`${file}: entries must reference ${dir}/`);
		}
	}

	// package.json
	const pkg = load("package.json");
	if (pkg) {
		if (!nonempty(pkg.name) || !nonempty(pkg.version)) errors.push("package.json: name and version must be non-empty");
		const pi = isRecord(pkg.pi) ? pkg.pi : {};
		if (!Array.isArray(pi.skills) || pi.skills.length !== 1 || checkPath("package.json: pi.skills", pi.skills[0], "directory") !== resolve(root, "skills")) {
			errors.push("package.json: pi.skills must reference ./skills");
		}
		if ("extensions" in pi) {
			errors.push("package.json: pi.extensions should not reference removed adapters");
		}
	}
}

export function lintPlugin(root: string, strict = false) {
	const errors: string[] = [];
	const warnings: string[] = [];
	const skills = [...new Bun.Glob("skills/*/SKILL.md").scanSync({ cwd: root })].sort();
	if (skills.length === 0) errors.push("skills/: no SKILL.md files found");

	for (const file of skills) {
		try {
			const { frontmatter, body } = document(join(root, file));
			const name = basename(dirname(file));
			if (frontmatter.name !== name) errors.push(`${file}: name must equal directory ${name}`);
			if (!nonempty(frontmatter.description)) errors.push(`${file}: description must be non-empty`);
			if (!body) errors.push(`${file}: body must be non-empty`);
		} catch (error) {
			errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	try {
		const { frontmatter, body } = document(join(root, "rules/core.md"));
		if (frontmatter.trigger !== "always_on") errors.push("rules/core.md: trigger must be always_on");
		if (frontmatter.alwaysApply !== true) errors.push("rules/core.md: alwaysApply must be true");
		const lines = body.split("\n").length;
		if (lines > 20) errors.push(`rules/core.md: ${lines} body lines exceeds 20`);
	} catch (error) {
		errors.push(`rules/core.md: ${error instanceof Error ? error.message : String(error)}`);
	}

	if (!existsSync(join(root, "skills/misty/SKILL.md"))) errors.push("skills/misty/SKILL.md: missing core skill");

	const names = new Set(skills.map((file) => basename(dirname(file))));
	const references = new Set<string>();
	for (const file of [...new Bun.Glob("{skills,rules}/**/*").scanSync({ cwd: root, dot: true })].sort()) {
		const bytes = readFileSync(join(root, file));
		if (bytes.includes(0)) continue;
		const text = bytes.toString("utf8");
		if (PERSONAL_NAMES.test(text)) {
			errors.push(`${file}: portable skills and rules must not contain personal names`);
		}
		const links = /\.md$/i.test(file) ? markdownLinks(text) : [];
		for (const destination of links) {
			const destPath = destination.split(/[?#]/, 1)[0];
			if (!destPath || /^(?:[a-z][a-z\d+.-]*:|[/\\])/i.test(destPath)) continue;
			let decoded: string;
			try {
				decoded = decodeURIComponent(destPath);
			} catch {
				references.add(`${file}: invalid relative link ${destination}`);
				continue;
			}
			if (/^[/\\]/.test(decoded)) continue;
			const target = resolve(dirname(join(root, file)), decoded);
			const targetStat = existsSync(target) ? statSync(target) : undefined;
			if (!targetStat?.isFile() && !targetStat?.isDirectory()) {
				references.add(`${file}: missing reference ${relative(root, target)}`);
			}
		}
		for (const [, name] of text.matchAll(/\bthe\s+`([a-z0-9-]+)`\s+skill\b/gi)) {
			if (!names.has(name)) {
				references.add(`${file}: unknown skill ${name} (missing skills/${name}/SKILL.md)`);
			}
		}
	}
	(strict ? errors : warnings).push(...[...references].sort((a, b) => a.localeCompare(b)));
	lintManifests(root, errors);
	return { skillCount: skills.length, errors, warnings };
}

function checked(command: string[], cwd: string, env: NodeJS.ProcessEnv) {
	const result = Bun.spawnSync(command, {
		cwd,
		env,
		stdout: "pipe",
		stderr: "pipe",
		timeout: 120_000,
		maxBuffer: 16 * 1024 * 1024,
	});
	if (!result.success) {
		throw new Error(`${command.join(" ")} failed (${result.exitCode ?? result.signalCode})\n${result.stdout.toString()}${result.stderr.toString()}`);
	}
	return result.stdout.toString();
}

export async function verifyClaudeInstall(root: string, executable: string) {
	const scratchRoot = process.env.TMPDIR ?? join(homedir(), ".cache/tmp");
	mkdirSync(scratchRoot, { recursive: true });
	const scratch = realpathSync(mkdtempSync(join(scratchRoot, "spellbook-claude-")));
	try {
		const home = join(scratch, "home");
		const project = join(home, "project");
		const env: NodeJS.ProcessEnv = {
			...process.env,
			HOME: home,
			CLAUDE_CONFIG_DIR: join(home, ".claude"),
			CLAUDE_CODE_PLUGIN_CACHE_DIR: join(home, ".claude/plugins"),
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
			DISABLE_AUTOUPDATER: "1",
			TMPDIR: join(scratch, "tmp"),
			NO_COLOR: "1",
			FORCE_COLOR: "0",
		};
		delete env.CLAUDE_CODE_PLUGIN_DIRS;
		for (const dir of [home, project, env.CLAUDE_CONFIG_DIR!, env.CLAUDE_CODE_PLUGIN_CACHE_DIR!, env.TMPDIR!]) {
			mkdirSync(dir, { recursive: true });
		}
		const id = `${CLAUDE_PLUGIN_ID}@${CLAUDE_PLUGIN_ID}`;
		checked([executable, "plugin", "marketplace", "add", root, "--scope", "user"], project, env);
		checked([executable, "plugin", "install", id, "--scope", "user"], project, env);
		const details = checked([executable, "plugin", "details", id], project, env);
		const count = [...new Bun.Glob("skills/*/SKILL.md").scanSync({ cwd: root })].length;
		const match = /Skills\s*\((\d+)\)/i.exec(details);
		if (!match || Number(match[1]) !== count || !/SessionStart/.test(details)) {
			throw new Error(`claude plugin details did not register ${count} skills and SessionStart hook\n${details}`);
		}
		console.log(`PASS claude: ${count} installed skills; SessionStart core hook registered`);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}

if (import.meta.main) {
	try {
		const flags = process.argv.slice(2);
		const usage = "Usage: scripts/verify plugin [--strict] [--lint-only]";
		let strict = false;
		let lintOnly = false;
		for (const flag of flags) {
			switch (flag) {
				case "--strict":
					strict = true;
					break;
				case "--lint-only":
					lintOnly = true;
					break;
				case "--help":
				case "-h":
					console.log(usage);
					process.exit(0);
				default:
					throw new Error(usage);
			}
		}
		const root = resolve(import.meta.dir, "..");
		const report = lintPlugin(root, strict);
		for (const warning of report.warnings) console.warn(`WARNING: ${warning}`);
		for (const error of report.errors) console.error(`ERROR: ${error}`);
		console.log(`Plugin structure: ${report.skillCount} skills, ${report.errors.length} errors, ${report.warnings.length} warnings`);
		if (report.errors.length > 0) process.exit(1);

		const bunTests = [...new Bun.Glob("scripts/*.test.ts").scanSync({ cwd: root })].sort();
		if (bunTests.length > 0) {
			const tests = Bun.spawnSync([process.execPath, "test", "--max-concurrency=1", ...bunTests.map((f) => `./${f}`)], {
				cwd: root,
				stdout: "inherit",
				stderr: "inherit",
			});
			if (!tests.success) process.exit(tests.exitCode || 1);
		}

		const nodeTests = Bun.spawnSync(["node", "--test", "skills/foundations/scripts/misty-check.test.mjs"], {
			cwd: root,
			stdout: "inherit",
			stderr: "inherit",
		});
		if (!nodeTests.success) process.exit(nodeTests.exitCode || 1);

		if (lintOnly) {
			console.log("SKIP claude: --lint-only; isolated install not exercised");
		} else {
			const claude = Bun.which("claude");
			if (!claude) {
				console.log("SKIP claude: CLI not found on PATH; isolated install not exercised");
			} else {
				await verifyClaudeInstall(root, claude);
			}
		}
		console.log("Verification complete: plugin");
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
