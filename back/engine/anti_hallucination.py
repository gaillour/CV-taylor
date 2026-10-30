"""Anti-hallucination validation: numerical provenance, skill whitelist, fact citations."""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .models import Fact, LangCode, Profile, RenderBullet, RenderEntry, RenderModel

# Common tech tokens to detect additions not in profile
TECH_REGEX = re.compile(
    r"\b(python|fastapi|django|flask|postgresql|postgres|mysql|sqlite|redis|kafka|rabbitmq|docker|"
    r"kubernetes|k8s|aws|gcp|azure|typescript|javascript|react|next\.?js|node\.?js|vue|angular|"
    r"c\+\+|c#|\.net|java|spring|spring\s*boot|rust|golang|go|graphql|rest|mongodb|supabase|"
    r"tailwind|typst|arch\s*linux|neovim|linux)\b",
    re.IGNORECASE,
)

NUMERICAL_TOKEN_REGEX = re.compile(r"(?<!\w)(?:\d+(?:[.,]\d+)?%?|\d+[kKmMxX])(?!\w)")


class Violation(BaseModel):
    """Details of a single anti-hallucination rule violation."""

    model_config = ConfigDict(extra="forbid")

    section: str = ""
    kind: str  # "uncited_fact", "invented_metric", "unauthorized_skill", "unapproved_title"
    bullet_text: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    safe_alternatives: list[str] = Field(default_factory=list)


class ValidationReport(BaseModel):
    """Summary report from the anti-hallucination validator."""

    model_config = ConfigDict(extra="forbid")

    is_valid: bool
    violations: list[Violation] = Field(default_factory=list)
    checked_bullets: int = 0
    checked_entries: int = 0


class AntiHallucinationValidator:
    """Enforces strict truthfulness, numerical traceability, and technology whitelisting."""

    def __init__(self, profile: Profile) -> None:
        self.profile = profile
        self._facts_by_id: dict[str, Fact] = {}
        self._entries_by_fact_id: dict[str, Any] = {}
        for entry in profile.entries:
            for fact in entry.facts:
                self._facts_by_id[fact.id] = fact
                self._entries_by_fact_id[fact.id] = entry

        # Build candidate skill and technology whitelist
        self.whitelist: set[str] = set()
        for sk in profile.skills:
            self.whitelist.add(sk.name.lower())
            for alias in sk.aliases:
                self.whitelist.add(alias.lower())
            for tag in sk.tags:
                self.whitelist.add(tag.lower())

        # Also add tech words present in candidate's original facts
        for fact in self._facts_by_id.values():
            for m in TECH_REGEX.finditer(fact.text):
                self.whitelist.add(m.group(0).lower())

    @staticmethod
    def extract_numbers(text: str) -> set[str]:
        """Extract canonical numerical tokens from text (e.g. '40%', '10k', '3.5')."""
        matches = NUMERICAL_TOKEN_REGEX.findall(text)
        return {m.lower().replace(",", ".") for m in matches}

    def suggest_alternatives(
        self,
        bullet: RenderBullet,
        violations: list[Violation] | None = None,
        lang: LangCode = "es",
    ) -> list[str]:
        """Generate 2-3 safe alternatives strictly grounded in source facts."""
        options: list[str] = []
        cited_facts = [
            self._facts_by_id[fid] for fid in bullet.fact_ids if fid in self._facts_by_id
        ]
        if not cited_facts:
            return options

        primary_fact = cited_facts[0]
        # Option 1: Exact source fact text in requested language
        source_text = primary_fact.text.strip()
        options.append(source_text)

        # Option 2: Cleaned version removing unverified numbers or unauthorized tech
        cleaned = bullet.text
        if violations:
            for v in violations:
                if v.kind == "invented_metric":
                    for num in v.details.get("invented_numbers", []):
                        cleaned = re.sub(rf"\b{re.escape(str(num))}\b%?", "", cleaned)
                elif v.kind == "unauthorized_skill":
                    for sk in v.details.get("unauthorized_skills", []):
                        cleaned = re.sub(
                            rf"\b{re.escape(str(sk))}\b", "", cleaned, flags=re.IGNORECASE
                        )
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            cleaned = re.sub(r"\s+([,.;])", r"\1", cleaned)

        if cleaned and cleaned != source_text and cleaned != bullet.text:
            options.append(cleaned)

        # Option 3: Concise source version or parent entry context
        parent = self._entries_by_fact_id.get(primary_fact.id)
        if parent:
            variant = f"{source_text.rstrip('.')} ({parent.org})."
            if variant not in options:
                options.append(variant)

        while len(options) < 2 and source_text not in options:
            options.append(source_text)

        # De-duplicate preserving order
        deduped: list[str] = []
        for opt in options:
            if opt not in deduped:
                deduped.append(opt)
        return deduped[:3]

    def validate_bullet(self, bullet: RenderBullet) -> list[Violation]:
        """Verify that a bullet cites existing facts, invents no metrics, and uses known skills."""
        violations: list[Violation] = []

        # 1. Fact citation rule
        if not bullet.fact_ids:
            v = Violation(
                kind="uncited_fact",
                bullet_text=bullet.text,
                message="La viñeta no cita ningún fact_id válido del perfil maestro.",
            )
            violations.append(v)
            return violations

        cited_facts: list[Fact] = []
        for fid in bullet.fact_ids:
            if fid not in self._facts_by_id:
                violations.append(
                    Violation(
                        kind="uncited_fact",
                        bullet_text=bullet.text,
                        message=f"El fact_id '{fid}' no existe en el perfil maestro.",
                        details={"fact_id": fid},
                    )
                )
            else:
                cited_facts.append(self._facts_by_id[fid])

        if not cited_facts:
            return violations

        # 2. Strict numerical traceability
        bullet_numbers = self.extract_numbers(bullet.text)
        if bullet_numbers:
            original_numbers: set[str] = set()
            for fact in cited_facts:
                original_numbers.update(self.extract_numbers(fact.text))
                parent_entry = self._entries_by_fact_id.get(fact.id)
                if parent_entry:
                    original_numbers.update(self.extract_numbers(parent_entry.org))
                    original_numbers.update(self.extract_numbers(parent_entry.context))
                    for t in getattr(parent_entry, "titles", []):
                        original_numbers.update(self.extract_numbers(t.title))

            unaccounted_numbers = bullet_numbers - original_numbers
            if unaccounted_numbers:
                violations.append(
                    Violation(
                        kind="invented_metric",
                        bullet_text=bullet.text,
                        message=(
                            f"Métrica o número inventado no presente en los hechos originales: "
                            f"{sorted(unaccounted_numbers)}"
                        ),
                        details={
                            "invented_numbers": list(unaccounted_numbers),
                            "original_numbers": list(original_numbers),
                            "cited_fact_ids": [f.id for f in cited_facts],
                        },
                    )
                )

        # 3. Technology whitelist verification
        bullet_techs = {m.group(0).lower() for m in TECH_REGEX.finditer(bullet.text)}
        normalized_whitelist = {w.replace(".", "").replace(" ", "") for w in self.whitelist}

        unauthorized_techs = {
            t
            for t in bullet_techs
            if t.replace(".", "").replace(" ", "") not in normalized_whitelist
        }

        if unauthorized_techs:
            violations.append(
                Violation(
                    kind="unauthorized_skill",
                    bullet_text=bullet.text,
                    message=(
                        f"Tecnología no declarada en el perfil del usuario: "
                        f"{sorted(unauthorized_techs)}"
                    ),
                    details={"unauthorized_skills": list(unauthorized_techs)},
                )
            )

        if violations:
            safe_opts = self.suggest_alternatives(bullet, violations=violations)
            for v in violations:
                v.safe_alternatives = safe_opts

        return violations

    def validate_render_entry(self, entry: RenderEntry) -> list[Violation]:
        """Validate all bullets in a RenderEntry."""
        violations: list[Violation] = []
        for bullet in entry.bullets:
            violations.extend(self.validate_bullet(bullet))
        return violations

    def validate_summary(self, summary: str) -> list[Violation]:
        """Validate candidate summary against the Master Profile technology whitelist."""
        if not summary or not summary.strip():
            return []

        summary_techs = {m.group(0).lower() for m in TECH_REGEX.finditer(summary)}
        normalized_whitelist = {w.replace(".", "").replace(" ", "") for w in self.whitelist}

        unauthorized_techs = {
            t
            for t in summary_techs
            if t.replace(".", "").replace(" ", "") not in normalized_whitelist
        }

        violations: list[Violation] = []
        if unauthorized_techs:
            violations.append(
                Violation(
                    section="summary",
                    kind="unauthorized_skill",
                    bullet_text=summary,
                    message=(
                        f"Tecnología en el resumen no declarada en el perfil del usuario: "
                        f"{sorted(unauthorized_techs)}"
                    ),
                    details={"unauthorized_skills": list(unauthorized_techs)},
                )
            )
        return violations

    def validate_model(self, model: RenderModel) -> ValidationReport:
        """Validate entire RenderModel against the Master Profile."""
        all_violations: list[Violation] = []
        total_bullets = 0
        total_entries = 0

        if model.summary:
            all_violations.extend(self.validate_summary(model.summary))

        for section_entries in (model.experience, model.projects, model.education):
            for entry in section_entries:
                total_entries += 1
                total_bullets += len(entry.bullets)
                all_violations.extend(self.validate_render_entry(entry))

        return ValidationReport(
            is_valid=len(all_violations) == 0,
            violations=all_violations,
            checked_bullets=total_bullets,
            checked_entries=total_entries,
        )
