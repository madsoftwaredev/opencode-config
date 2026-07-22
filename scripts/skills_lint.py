#!/usr/bin/env python3

"""Lint OpenCode skills for retrieval-friendly consistency.

This is intentionally dependency-free (stdlib only) so it can run anywhere.

Default behavior:
- Lint skills under ~/.config/opencode/skills (based on this script location).

Exit codes:
- 0: no issues
- 1: issues found
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

SKILL_NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MD_CODE_SPAN_RE = re.compile(r"`([^`\n]+?\.md)`")


V2_SKILLS = {
    "api",
    "auth",
    "capacitor",
    "database",
    "devops",
    "dart",
    "flutter",
    "expo",
    "git",
    "incident-response",
    "ionic",
    "nextjs",
    "observability",
    "performance",
    "python",
    "rails",
    "react-native",
    "refactoring",
    "ruby",
    "skill-authoring",
    "testing",
    "security",
}


V2_REQUIRED_HEADINGS = [
    "## When to load",
    "## When NOT to load",
    "## Core rules",
    "## Minimal examples",
    "## Anti-patterns",
    "## Checklist",
]


@dataclass(frozen=True)
class Issue:
    path: Path
    message: str


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _parse_frontmatter(text: str) -> dict[str, str] | None:
    """Parse simple YAML frontmatter.

    This intentionally supports only the subset we use:
    - first line '---'
    - key: value lines until closing '---'
    """

    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None

    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break

    if end is None:
        return None

    out: dict[str, str] = {}
    for raw in lines[1:end]:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        out[key] = value

    return out


def _extract_md_code_spans(text: str) -> set[str]:
    """Extract backticked `.md` file references from markdown text.

    This is a lightweight consistency check used to catch broken router links in
    `SKILL.md`. It intentionally ignores non-backticked links and does not try
    to fully parse markdown.
    """

    out: set[str] = set()
    for m in MD_CODE_SPAN_RE.finditer(text):
        ref = m.group(1).strip()
        if (
            not ref
            or "://" in ref
            or "<" in ref
            or ">" in ref
            or ref.startswith("~")
            or ref.startswith(".opencode/")
        ):
            continue
        out.add(ref)
    return out


def lint_skill_dir(skill_dir: Path) -> list[Issue]:
    issues: list[Issue] = []

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        issues.append(Issue(skill_dir, "missing SKILL.md"))
        return issues

    text = _read_text(skill_md)
    fm = _parse_frontmatter(text)
    if fm is None:
        issues.append(Issue(skill_md, "SKILL.md missing or invalid YAML frontmatter"))
        return issues

    name = fm.get("name")
    desc = fm.get("description")
    if not name:
        issues.append(Issue(skill_md, "frontmatter missing required field: name"))
    if not desc:
        issues.append(
            Issue(skill_md, "frontmatter missing required field: description")
        )

    if name and name != skill_dir.name:
        issues.append(
            Issue(
                skill_md,
                f"frontmatter name '{name}' does not match directory '{skill_dir.name}'",
            )
        )

    if name and not SKILL_NAME_RE.fullmatch(name):
        issues.append(
            Issue(
                skill_md,
                f"invalid skill name '{name}' (must match {SKILL_NAME_RE.pattern})",
            )
        )

    refs = _extract_md_code_spans(text)
    refs_by_basename = {Path(r).name for r in refs}

    # Router link validation: keep SKILL.md references from silently breaking.
    for ref in sorted(refs):
        if ref.startswith("skills/"):
            target = ROOT / ref
        else:
            target = skill_dir / ref

        if not target.exists():
            issues.append(Issue(skill_md, f"references missing file: {ref}"))

    # V2 router hygiene: ensure routers actually route to their leaf docs.
    if skill_dir.name in V2_SKILLS:
        leaves = [p for p in sorted(skill_dir.glob("*.md")) if p.name != "SKILL.md"]

        required_refs = min(3, len(leaves))
        leaf_refs = {
            name
            for name in refs_by_basename
            if name != "SKILL.md" and (skill_dir / name).exists()
        }
        if len(leaf_refs) < required_refs:
            issues.append(
                Issue(
                    skill_md,
                    f"expected at least {required_refs} leaf .md reference(s) in SKILL.md (found {len(leaf_refs)})",
                )
            )

        for leaf in leaves:
            if leaf.name not in refs_by_basename:
                issues.append(
                    Issue(skill_md, f"SKILL.md does not reference leaf: {leaf.name}")
                )

    # V2 schema enforcement for migrated skills.
    if skill_dir.name in V2_SKILLS:
        for leaf in sorted(skill_dir.glob("*.md")):
            if leaf.name == "SKILL.md":
                continue

            leaf_text = _read_text(leaf)
            for heading in V2_REQUIRED_HEADINGS:
                if heading not in leaf_text:
                    issues.append(Issue(leaf, f"missing required heading: {heading}"))
                    break

    return issues


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Lint OpenCode skills")
    parser.add_argument(
        "--skills-dir",
        type=str,
        default=None,
        help="Path to skills directory to lint (defaults to ~/.config/opencode/skills based on script location)",
    )
    args = parser.parse_args(argv)

    skills_dir = (
        Path(args.skills_dir).expanduser() if args.skills_dir else (ROOT / "skills")
    )

    if not skills_dir.exists():
        print(f"skills dir not found: {skills_dir}", file=sys.stderr)
        return 1

    issues: list[Issue] = []

    for child in sorted(skills_dir.iterdir()):
        if not child.is_dir():
            continue

        if child.name.startswith("."):
            continue

        issues.extend(lint_skill_dir(child))

    if not issues:
        print("skills_lint: OK")
        return 0

    print(f"skills_lint: {len(issues)} issue(s)")
    for issue in issues:
        rel = issue.path
        try:
            rel = issue.path.relative_to(ROOT)
        except ValueError:
            pass
        print(f"- {rel}: {issue.message}")

    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
