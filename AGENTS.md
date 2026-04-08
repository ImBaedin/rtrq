## Discoveries

- Python tooling in this repository is standardized on `uv`. Use `uv` workspaces, `uv sync`, `uv run`, and `uv build` instead of introducing standalone `venv`/`pip` flows.
- Prefer test-driven development for new work: add or update tests first when practical, then implement against those tests and finish by rerunning the relevant test scope.
