#!/usr/bin/env bun
// Usage: bun scripts/stamp-version.ts [--check]
// Writes the newest CHANGELOG.md release into every native manifest, so harnesses that
// detect upgrades by manifest version see each release. The release workflow runs it.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const MANIFESTS = ["package.json"];
const VERSION = /^(\s*"version":\s*")([^"]*)(")/m;

export function releaseVersion(root: string) {
	const version = /^# \[(\d+\.\d+\.\d+)\]/m.exec(readFileSync(join(root, "CHANGELOG.md"), "utf8"))?.[1];
	if (!version) throw new Error("CHANGELOG.md names no release");
	return version;
}

export function stampVersion(root: string, check = false) {
	const version = releaseVersion(root);
	const stale: string[] = [];
	for (const file of MANIFESTS) {
		const text = readFileSync(join(root, file), "utf8");
		const current = VERSION.exec(text)?.[2];
		if (current === undefined) throw new Error(`${file}: no version field`);
		if (current === version) continue;
		stale.push(`${file}: version ${current} is not release ${version}`);
		if (!check) writeFileSync(join(root, file), text.replace(VERSION, `$1${version}$3`));
	}
	return { version, stale };
}

if (import.meta.main) {
	try {
		const check = process.argv.includes("--check");
		const { version, stale } = stampVersion(resolve(import.meta.dir, ".."), check);
		for (const line of stale) console.log(check ? `ERROR: ${line}; run bun scripts/stamp-version.ts` : `Stamped ${line.split(":")[0]}`);
		if (check && stale.length > 0) process.exit(1);
		console.log(`Manifest versions: ${version}`);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
