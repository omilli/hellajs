import { readdirSync, readFileSync } from "node:fs";
import type { Rule, UserConfig } from "@commitlint/types";

/** Published workspace directory names (scope targets for release-bumping types). */
const publishedWorkspaces = ["packages", "plugins"]
	.flatMap((dir) =>
		readdirSync(dir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => `${dir}/${entry.name}`),
	)
	.filter((path) => !JSON.parse(readFileSync(`${path}/package.json`, "utf8")).private)
	.map((path) => path.split("/")[1]!);

/**
 * `feat`/`fix` bump a release, so their scope must name the published workspace
 * whose API changed — never a repo area (`feat(docs)` is invalid; use `feat(dom)`).
 * Non-bumping types keep free scopes (`chore(agents)`, `docs:`, `test(core)`).
 */
const scopeMatchesReleaseType: Rule = (parsed) => {
	if (parsed.type !== "feat" && parsed.type !== "fix") return [true, ""];
	const scope = parsed.scope ?? "";
	return [
		publishedWorkspaces.includes(scope),
		`feat/fix must scope to a published workspace (${publishedWorkspaces.join(", ")}) — got "${scope || "no scope"}"`,
	];
};

const config: UserConfig = {
	extends: ["@commitlint/config-conventional"],
	plugins: [{ rules: { "scope-matches-release-type": scopeMatchesReleaseType } }],
	rules: { "scope-matches-release-type": [2, "always"] },
};

export default config;
