# Vendored skill: impeccable

This directory is a **vendored copy** of the `impeccable` skill from the
[`pbakaus/impeccable`](https://github.com/pbakaus/impeccable) plugin, **v3.5.0**,
licensed under **Apache 2.0** (see `LICENSE`).

## Why it's vendored instead of installed as a plugin

Claude Code on the web has no interactive `/plugin` command and does not reliably
auto-install marketplace plugins in its ephemeral sessions. Skills committed under
`.claude/skills/` *do* load automatically (after the workspace is trusted), so the
skill is copied here directly. This also makes it work identically in terminal,
desktop, and IDE sessions.

Only the runtime skill (`plugin/skills/impeccable/`) and its helper agent
(`plugin/agents/impeccable-manual-edit-applier.md` → `.claude/agents/`) were
copied. The upstream repo's ~290 MB of docs/site and per-tool duplicate copies
were intentionally left out.

## How to invoke

It's `user-invocable`, so in a new session run e.g.:

- `/impeccable polish <target>`
- `/impeccable audit <target>`
- `/impeccable critique <target>`
- `/impeccable init` (sets up `PRODUCT.md` for this project)

Full subcommand list is in the `argument-hint` at the top of `SKILL.md`.

## Updating

To pull a newer version, re-copy `plugin/skills/impeccable/` and
`plugin/agents/impeccable-manual-edit-applier.md` from the upstream repo at the
desired tag, keeping this `VENDORED.md` and `LICENSE`.
