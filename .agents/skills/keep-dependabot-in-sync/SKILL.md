---
name: keep-dependabot-in-sync
description: >-
  Keeps .github/dependabot.yml group patterns aligned with npm workspace
  dependencies. Use when adding, removing, renaming, or moving dependencies in
  any package.json; when editing package-lock.json intentionally; when reviewing
  or merging Dependabot PRs; or when the user mentions Dependabot, dependency
  groups, vitest/vite updates, or npm workspaces dependency maintenance.
---

# Keep Dependabot in sync

Whenever dependencies change in this npm workspaces monorepo, update
`.github/dependabot.yml` in the **same change** (or immediately after).

## When this applies

Trigger on any of:

- Add / remove / rename a dependency in `package.json`, `frontend/package.json`,
  `backend/package.json`, or `shared/package.json`
- Split or merge peer-locked packages (e.g. `vitest` + `@vitest/*`)
- Reviewing a Dependabot PR that looks incomplete across workspaces

## Hard rules for this repo

1. **One npm ecosystem entry** with `directory: "/"`. Never add separate
   Dependabot directories for `backend` / `frontend` / `shared` — there is a
   single root `package-lock.json`.
2. **Peer-locked packages share one group**, listed so they cannot fall into
   different PRs. Known case: `vitest` and `@vitest/*` (exact peer versions).
3. **Avoid accidental pattern overlap.** Broad globs like `vite*` also match
   `vitest`. Prefer tight patterns (`vite`, `vite-*`, `@vitejs/*`) and put
   conflicting families in their own earlier group, plus `exclude-patterns`
   when needed.
4. **First matching group wins.** Order groups so specific families
   (vitest, koa, database) come before catch-alls.
5. **`everything-else` with `patterns: ["*"]` stays last.** New deps that do
   not fit an existing family either get a dedicated pattern in the right
   group, or intentionally remain in `everything-else`.

## Checklist (do this every time)

Copy and complete:

```
Dependabot sync:
- [ ] Listed new/changed dependency names from all workspace package.json files
- [ ] Each name matches exactly one intended group (or intentionally everything-else)
- [ ] No broad glob pulls a package into the wrong group (check vite/vitest, node/*, etc.)
- [ ] Peer-locked sets updated together in one group
- [ ] .github/dependabot.yml edited if patterns are missing/wrong
- [ ] Avoided adding per-workspace Dependabot directories
```

## How to update patterns

1. Read `.github/dependabot.yml` and the touched `package.json` files.
2. For each added dependency, decide the group:
   - Vue / Vite toolchain → `vue-and-vite-deps` (not vitest)
   - Vitest stack → `vitest`
   - ESLint / Prettier / TypeScript / `@types/*` → `coding-and-language`
   - Koa stack → `koa`
   - DB → `database`
   - App utilities (pdf, dates, mail, ldap, …) → `tools`
   - Otherwise → leave for `everything-else`, or add a clear pattern if it
     should always ship with a family
3. For removed dependencies, drop obsolete patterns only when nothing else
   needs them.
4. Prefer explicit names over `*foo*` unless a real family exists.
5. After editing, briefly confirm: “would Dependabot open one PR for this
   family, including peer companions?”

## Known failure mode (do not repeat)

`vite*` matched `vitest` but not `@vitest/coverage-v8`, so Dependabot bumped
`vitest` in `vue-and-vite-deps` while coverage stayed in `everything-else`.
That left nested mismatched vitest versions in the lockfile and broke `npm ci`.

## Out of scope

- Do not auto-bump dependency versions as part of this skill.
- Do not rewrite unrelated Dependabot schedule / PR-limit settings unless asked.
