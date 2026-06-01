---
name: fix-npm-audit-minimal
description: Fix high-severity npm/yarn audit advisories in a JS/TS project using the **minimal-touch / lightweight** approach. This is the LIGHTWEIGHT variant — it tries the cheapest possible fix first (yarn.lock manipulation, no package.json changes) and only escalates to package.json bumps or `resolutions`/`overrides` when strictly necessary. Use this when the user wants to clean up audit advisories with the smallest diff possible. Do NOT use when the user explicitly wants an aggressive update (e.g. "bump everything to latest") — for that, plain `yarn up '*' --latest` or full `resolutions` blocks are more direct. Trigger when the user shares `yarn npm audit` / `npm audit` output, asks to fix CVEs in dependencies, or asks to clear security findings while keeping changes minimal.
---

# Fix npm/yarn audit vulnerabilities — minimal-touch approach

The goal: clear audit findings with the **smallest possible diff**, preserving as much of the existing dependency tree as possible. Apply tiers in order. Each tier is more invasive than the last — stop as soon as audit is clean for your target severity.

Why this matters: the "heavy" alternatives (bump every dep to latest; dump everything into `resolutions`) work but create large PRs that are hard to review, hard to bisect, and pull in unnecessary breaking changes. This skill keeps things tight.

## Tier 0: Establish baseline

```bash
yarn npm audit --recursive 2>&1 | grep "Severity:" | awk -F: '{print $2}' | sort | uniq -c | sort -rn
```

Filter to **high + critical** by default unless the user explicitly asks for moderate/low. Moderate/low are often DoS-class issues in dev-tooling and rarely worth churn for this skill's "minimal diff" promise.

For each advisory, note:
- Vulnerable package + current version in tree
- Fixed version range (e.g. `>=1.15.2`)
- Consumer chain — run `yarn why <pkg>` to see every path leading to the vulnerable version

## Tier 1: Lock-delete + reinstall (preferred — no package.json changes)

`yarn.lock` pins a specific version once chosen. If the parent declares a wide range like `^1.7.2` but the lock has an older version, deleting the lock entry lets yarn re-resolve to the latest version in that range — often already patched.

```bash
# Find entries for vulnerable packages
grep -n '^"<pkg>@' yarn.lock

# Delete entries safely with a Node script (regex-aware)
node -e "
const fs = require('fs');
let content = fs.readFileSync('yarn.lock', 'utf8');
const patterns = [
  /^\"axios@/m,
  /^\"flatted@/m,
  // ... one per vulnerable package
];
const blocks = content.split(/(?=^\")/m);
const result = [blocks[0]];
for (const b of blocks.slice(1)) {
  if (!patterns.some(p => p.test(b))) result.push(b);
}
fs.writeFileSync('yarn.lock', result.join(''));
"

yarn install
yarn npm audit --recursive | grep "Severity:" | awk -F: '{print \$2}' | sort | uniq -c
```

**Works when**: parent's declared range is wide enough to include a patched version (`^X.Y.Z` style usually).

**Doesn't work when**: range is exact (`"12.0.2"`), tilde (`~0.1.12`) with no in-range patch, or `^X.Y.Z` where no patch exists within the range. Move to Tier 2.

`yarn dedupe --strategy highest` is NOT a substitute — it only deduplicates within the existing lockfile and won't fetch newer versions from the registry.

## Tier 2: Walk up the chain

If a transitive can't escape its parent's range, look at the parent itself.

```bash
yarn why <vulnerable-pkg>                              # see every path
yarn npm info <parent>@<latest-version> dependencies   # see what newer parent declares
```

For each parent:
- Does a newer parent version declare a fixed range for the vulnerable child?
- Did a newer parent drop the vulnerable dep entirely (e.g. inlined the code)?

If yes:
- **Parent is also transitive with a wide range from its own parent** → delete the parent from yarn.lock (Tier 1 logic, one level up).
- **Parent is a direct dep with exact pin in package.json** → escalate to Tier 3.

**Real example**:
- `serialize-javascript@6.0.2` (high CVE) was pulled by `terser-webpack-plugin@5.3.16`, which is itself pulled by `webpack` with declared range `^5.3.16`.
- `terser-webpack-plugin@5.6.0` removed `serialize-javascript` from its dependencies entirely (inlined the source).
- Deleted `terser-webpack-plugin` lock entry → yarn re-resolved to `5.6.0` → this CVE path disappeared with **zero package.json changes**.

## Tier 3: Bump direct dep in package.json

Only when Tier 1+2 can't reach the fix. Always prefer the smallest bump that works.

1. **Patch bump first** (e.g. `7.29.0 → 7.29.5`) — almost always safe.
2. **Minor bump** if patch is insufficient — usually safe.
3. **Major bump** last resort. Before doing it:
   - Read the package's CHANGELOG for breaking changes.
   - Grep the codebase for how the package is used — does any changed API affect us?
   - **Check `engines.node` of the new version against CI's Node version** (see callout below). Major versions often raise the minimum Node requirement.
   - Verify both dev compile and production build after.

Edit `package.json`, run `yarn install`, re-audit.

### Critical: runtime Node version check (the trap that caught us)

A major bump that compiles fine locally can still fail in CI if the new version requires a newer Node than CI provides. Local dev Node is often much newer than what CI/CD runs.

```bash
# What's CI running? Check the buildspec / workflow file
grep -E "nodejs:|node-version:" buildspec*.yml .github/workflows/*.yml 2>/dev/null

# What does the new package version require?
yarn npm info <package>@<new-version> 2>&1 | grep -A 2 "engines:"
```

If `engines.node` of the new version is higher than CI's Node, you have three choices:
- Bump CI's Node version (infra change, usually out of scope for a security fix).
- Pick a slightly older version of the package that's still patched but compatible with current Node.
- Fall back to **Tier 4** (resolutions/overrides) for the specific transitive instead.

**Real example — the trap that caught us once on this codebase**:
- Bumped `copy-webpack-plugin` 12 → 14 to clear `serialize-javascript@^6` and reach the patched `^7.0.3` range. Local build passed on Node 24.
- CodeBuild deploy failed: `copy-webpack-plugin@14.0.0` uses `Array.prototype.toSorted()`, added in Node 20. CodeBuild's buildspec pins `nodejs: 18`. The new package declared `engines.node: ">= 20.9.0"` — visible in `yarn npm info` if you remember to check.
- Had to revert to `copy-webpack-plugin@12.0.2` (which declares `>= 18.12.0`) and use a Tier-4 resolution for `serialize-javascript` instead.

Moral: when a Tier-3 major bump is the only path, `engines.node` is a must-check. If it's incompatible with CI, you'll end up at Tier 4 anyway — better to know that before committing.

## Tier 4: Resolutions / overrides (last resort)

Only when:
- Direct dep can't be bumped (unmaintained, no newer version, breaking changes too risky)
- AND parent's declared range is too narrow to reach the fix via re-resolution
- AND it's not safe to remove the dep entirely

This skill prefers **avoiding** this tier — that's the whole point of "minimal-touch". Only fall back here if Tiers 1-3 truly cannot close the advisory.

Yarn 4 syntax in `package.json`:

```json
"resolutions": {
  "vulnerable-pkg": "^fixed-version"
}
```

Consumer-scoped resolutions when a global override would break another consumer:

```json
"resolutions": {
  "consumer-a/vulnerable-pkg": "^2.x.x",
  "consumer-b/vulnerable-pkg": "^4.x.x"
}
```

npm equivalent: use `"overrides"` instead of `"resolutions"`.

**Why we treat this as last resort**:
- Forces a version the parent didn't test against — runtime breakage possible.
- Hidden mechanism — readers of `dependencies` / `devDependencies` won't see the change.
- Sticky — accumulates over time, needs periodic cleanup as upstreams catch up.
- Signals "I gave up on the upgrade path" rather than fixing the root cause.

## Verification after every change

Run these after every change that updates dependencies:

1. `yarn install` — must complete without **new** errors. Pre-existing peer-dep warnings are okay.
2. `yarn npm audit --recursive` — confirm advisories actually dropped (and no new ones introduced).
3. If a direct dep was bumped (Tier 3), confirm `engines.node` of every changed package satisfies CI's Node version — see Tier 3 callout. **Local "build passes" is not sufficient evidence the CI build will pass.**
4. `yarn run dev` (or equivalent) — dev server compiles with 0 errors. Free the port before the next step.
5. `yarn run build` (or equivalent prod build) — production build succeeds and produces expected artifacts. Check exit code and `ls dist/`.
6. Where feasible, open the app in a browser and click through the golden path. Tools (lint, build) verify code correctness, not feature correctness.

## Commit strategy

One commit per tier so `git bisect` can isolate breakage. Match the spirit of the "minimal-touch" approach — small, focused commits.

| Commit | Files | Why this tier |
|---|---|---|
| Tier 1: lockfile refresh | `yarn.lock` only | Most advisories clear via re-resolution; smallest possible diff. |
| Tier 2: chain-walk | `yarn.lock` | Parent's range allowed a newer version that removed the vulnerable transitive. |
| Tier 3: direct dep bump | `package.json` + `yarn.lock` | Parent had to be bumped to escape the vulnerable range. |
| Tier 4 (avoid if possible): resolutions | `package.json` + `yarn.lock` | No upgrade path; forced version override. |

Each commit message should name:
- Which advisories closed (advisory IDs from `--json` output)
- The version delta (from → to)
- *Why* this tier was needed (e.g. "package X declares ^6.x but fix is in 7.x, so a major bump of parent Y was required")

## When NOT to use this skill

- User asks for an aggressive sweep ("update everything to latest") — use plain `yarn up '*' --latest` or a full `resolutions` block instead.
- The vulnerability is in the user's own code (e.g. SQL injection in a route handler), not in a dependency.
- The user wants a wholesale major-version refactor of the dependency tree.
- The project doesn't use npm/yarn (e.g. pnpm, bun, Deno). The general tiers still apply but the commands differ.
