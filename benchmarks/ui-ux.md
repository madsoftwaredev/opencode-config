# UI/UX Decision Quality Benchmarks

Fixed offline cases are in `fixtures/ui-ux-cases.json`. They test bounded design judgment, not rendered product quality, actual user performance, or MCP/browser execution. Evaluate the same cases with the same model/variant, evidence, and response budget. Supply the appropriate router plus the two named leaves per case; keep expected traits out of the model input.

Record concrete omissions, unsupported findings, and useful decisions rather than a subjective beauty score. A model run is nondeterministic even though the fixture and rubric are fixed. One comparison is a smoke check, not statistical proof of improvement. Keep raw outputs and source hashes with the local run record.

## UXQ-01 — Action frequency changes the answer

Prompt: Use the complete UXQ-01 prompt in the fixture: simplify a comparison-heavy shipment queue whose Dispatch task is predominantly batch-based.

Expected loads:

- `skills/ui-ux/SKILL.md`
- `skills/ui-ux/cases/invoice-workspace.md`
- `skills/ui-ux/platform-and-accessibility.md`

Expected traits:

- Retains a comparison-friendly representation rather than replacing the table on taste.
- Gives the dominant batch action an appropriate selection-scoped path; does not blindly copy the case study's one-at-a-time reminder layout.
- Makes selected-page versus all-matching scope/count concrete and addresses filter/page changes.
- Gives rare actions less emphasis without hiding required access.
- Separates 16 px glyph size from the measured 32 px target; does not declare a minimum-size failure from the glyph.
- Specifies a usable compact comparison path and relevant verification.

## UXQ-02 — A good implementation needs no invented redesign

Prompt: Use UXQ-02: accepted gradient/peer cards, no visible defect in supplied screenshots, limited interaction evidence.

Expected loads:

- `skills/ui-ux/SKILL.md`
- `skills/ui-ux/evaluation.md`
- `skills/ui-ux/visual-design.md`

Expected traits:

- No invented defect based on familiar styling, gradients, or equal cards for peers.
- Gives an evidence-scoped visual verdict without claiming independent inspection of supplied facts.
- Does not certify keyboard/screen-reader behavior; absent evidence is not itself an observed defect.
- Does not create new required work or force an irrelevant redesign to satisfy a finding count.

## UXQ-03 — Research-backed defaults have exceptions

Prompt: Use UXQ-03: wholesale mobile checkout with usually different billing, redundant entry, distinct server errors, and an unverified mockup.

Expected loads:

- `skills/ui-ux/SKILL.md`
- `skills/ui-ux/forms-and-validation.md`
- `skills/ui-ux/cases/checkout-review.md`

Expected traits:

- Addresses entry/review effort before assuming three steps is better than five.
- Reuses saved delivery context but does not default billing to delivery against the supplied 80% differing-billing fact.
- Treats optional company-reference input according to task need and preserves an accessible path to it.
- Gives different recovery for known missing-@ versus uncertain timeout; does not invent a decline or safe retry guarantee.
- Separates coherent mockup/plan assessment from implementation acceptance and identifies the material pending behavior.

## UXQ-04 — A concrete creative proposal, not a style list

Prompt: Use UXQ-04: a warm, precise ceramics wholesale opening with real photographs and fixed brand constraints.

Expected loads:

- `skills/ui-ux/SKILL.md`
- `skills/ui-ux/visual-design.md`
- `skills/ui-ux/cases/product-story.md`

Expected traits:

- Connects visual/product proof to shop owners' fit-and-comparison task.
- Gives an implementable content order, hierarchy, photograph treatment, and type/color intent that preserves the supplied brand.
- Provides a truthful next action and does not invent testimonials, numbers, or demos.
- Provides a compact adaptation that preserves useful product detail.
- Rejects an alternative for a specific task/content reason and names a realistic rendered checkpoint.
- Transfers the case method without copying its release-timeline motif into ceramics.

## Separate operational checks

Permission resolution, actual browser screenshots, Mobbin image retrieval, Markdown links, skill routing, and benchmark formatting require their own checks. `opencode debug agent --tool` rejects explicit deny rules but permits ask rules in debug mode; a successful debug call alone does not prove prompt-free access. Inspect effective rules and exercise permitted commands from outside the configuration repository.

Actual run records belong under `results/`; do not mark this suite passed merely because it has been authored or linted.

- [2026-09-12 comparison and operational checks](results/ui-ux-2026-09-12.md)
