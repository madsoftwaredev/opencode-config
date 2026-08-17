# Repo-Specific Routing (Template)

Use this leaf doc to encode the rules that make your repo consistent.

## When to load

- You are working in this repo and need its conventions.

## When NOT to load

- You are working in a different repo.

## Core rules

- Put the repo's real rules here (folder structure, naming, error contracts, testing commands).
- Keep rules concrete and decision-oriented.

## Minimal examples

```text
Example: "For Rails projects, application services are reserved for demonstrated
multi-record/transaction/external workflows; when used they return the repository's
Data Success(value, meta)/Failure(code, errors, error_details, meta) contract with
errors as field/base arrays. List endpoints use the project's Pundit -> strict
Ransack allowlists per model -> stable sort -> Kaminari -> Data page -> API
responder path."
```

## Anti-patterns

- Generic best-practice prose with no repo-specific decisions.
- Duplicating global skills without changes.

## Checklist

- Rules reflect the repo's actual conventions.
- Examples are copy-pastable.
- Leaf stays focused (split if it grows).
