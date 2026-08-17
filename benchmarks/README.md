# Skill Benchmarks

These benchmarks are regression tests for the skills system.

Each benchmark should specify:

- Prompt (what a developer asks)
- Expected skill loads (router + 1-2 leaves)
- Expected output traits (structure + proportionate verification + contracts)

See `skills/skill-authoring/benchmarks.md` for the benchmark format.

Lint benchmarks:

```bash
python3 scripts/benchmarks_lint.py
```
