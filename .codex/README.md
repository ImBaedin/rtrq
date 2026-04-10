# Codex Local Environment

This directory holds the repo-owned bootstrap and action scripts for Codex local environments.

OpenAI's Codex app stores local-environment configuration inside `.codex` at the project root and lets teams share that configuration through Git. The app-managed config format is generated from the Codex settings UI, so this repository checks in the executable scripts and the intended action mapping here.

Recommended Codex app wiring:

- Setup script: `.codex/scripts/bootstrap.sh`
- Action `Validate`: `.codex/scripts/validate.sh`
- Action `Typecheck`: `.codex/scripts/typecheck.sh`
- Action `Python tests`: `.codex/scripts/python-tests.sh`
- Action `Run server`: `.codex/scripts/run-server.sh`
- Action `Build`: `.codex/scripts/build.sh`

What these scripts guarantee:

- Fail fast if `bun` or `uv` is missing.
- Bootstrap both the Bun and `uv` workspaces for fresh worktrees.
- Keep validation aligned with the repo's canonical package-manager flows.

Relevant Codex docs:

- `AGENTS.md`: https://developers.openai.com/codex/guides/agents-md
- Local environments: https://developers.openai.com/codex/app/local-environments
