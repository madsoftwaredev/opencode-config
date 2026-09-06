---
description: Security audit for vulnerabilities and unsafe patterns
agent: code-auditor
---

Perform a security audit on:

$ARGUMENTS

Treat this as an explicit read-only `code-audit` request in the security domain. Require a concrete repository scope, ask one focused question if it is missing, and do not implement findings.

Check for:

- Input validation issues
- Authentication/authorization flaws
- Data exposure risks
- Dependency vulnerabilities
- Configuration security
