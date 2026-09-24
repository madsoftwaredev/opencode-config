# Skill and Orchestration Benchmarks

These benchmarks are regression tests for skill routing and orchestration cost.

Each benchmark should specify:

- Prompt (what a developer asks)
- Expected skill loads (router + 1-2 leaves)
- Expected output traits (structure + proportionate verification + contracts)

See `skills/skill-authoring/benchmarks.md` for the benchmark format.

`orchestration.md` defines a repeatable suite for comparing worker count, native task reuse, delegation depth, time to first edit, wall time, token use, duplicate reads, and validation work. `review-scope.md` verifies that ordinary review stays tied to existing intent while explicit audits remain read-only and separate from implementation.

`ui-ux.md` and `fixtures/ui-ux-cases.json` exercise task-sensitive design decisions, evidence limits, research exceptions, and concrete creative proposals. Results distinguish offline model checks from rendered inspection and real-user outcomes.

Lint benchmarks:

```bash
python3 scripts/benchmarks_lint.py
```
