import shutil
import subprocess
from pathlib import Path

from .models import (
    ParsedContact,
    ParsedEducation,
    ParsedExperience,
    ParsedProject,
    ParsedResume,
    ParsedSkillCategory,
)
from .patterns import (
    CANONICAL_SECTIONS,
    DATE_RANGE_PATTERN,
    EMAIL_PATTERN,
    GITHUB_PATTERN,
    LINKEDIN_PATTERN,
    PENALIZED_COMPOUND_SECTIONS,
    PHONE_PATTERN,
)


class LeverResumeParser:
    """
    Parser determinista de CVs compatible con especificaciones Lever / Workday ATS.
    Extrae texto crudo y segmenta entidades, evaluando el éxito estructural de lectura.
    """

    def extract_text_from_pdf(self, pdf_path: Path | str) -> str:
        pdf_file = Path(pdf_path)
        if not pdf_file.exists():
            raise FileNotFoundError(f"PDF no encontrado: {pdf_file}")

        if shutil.which("pdftotext"):
            res = subprocess.run(
                ["pdftotext", str(pdf_file), "-"],
                capture_output=True,
                text=True,
                check=True,
            )
            return res.stdout
        else:
            raise RuntimeError("Herramienta pdftotext no disponible en el sistema.")

    def parse(self, text_or_path: Path | str) -> ParsedResume:
        p = (
            Path(text_or_path)
            if isinstance(text_or_path, (str, Path)) and "\n" not in str(text_or_path)
            else None
        )
        if p is not None and p.exists() and p.is_file():
            if p.suffix.lower() == ".pdf":
                raw_text = self.extract_text_from_pdf(p)
            else:
                raw_text = p.read_text(encoding="utf-8")
        else:
            raw_text = str(text_or_path)

        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        resume = ParsedResume(raw_text=raw_text)

        # 1. Contacto
        resume.contact = self._extract_contact(raw_text, lines[:10])

        # 2. Segmentación de secciones
        section_indices, detected, non_canonical = self._find_sections(lines)
        resume.detected_sections = detected
        resume.non_canonical_sections = non_canonical

        # 3. Parsear contenido por sección
        for sec_name, (start_idx, end_idx) in section_indices.items():
            sec_lines = lines[start_idx:end_idx]
            if sec_name == "summary":
                resume.summary = " ".join(sec_lines)
            elif sec_name == "experience":
                resume.experience = self._parse_experience(sec_lines)
            elif sec_name == "education":
                resume.education = self._parse_education(sec_lines)
            elif sec_name == "projects":
                resume.projects = self._parse_projects(sec_lines)
            elif sec_name == "skills":
                resume.skills = self._parse_skills(sec_lines)

        return resume

    def _extract_contact(self, text: str, header_lines: list[str]) -> ParsedContact:
        contact = ParsedContact()
        if header_lines:
            contact.name = header_lines[0]

        email_match = EMAIL_PATTERN.search(text)
        if email_match:
            contact.email = email_match.group(0)

        phone_match = PHONE_PATTERN.search(text)
        if phone_match:
            contact.phone = phone_match.group(0).strip()

        linkedin_match = LINKEDIN_PATTERN.search(text)
        if linkedin_match:
            contact.linkedin = linkedin_match.group(0)

        github_match = GITHUB_PATTERN.search(text)
        if github_match:
            contact.github = github_match.group(0)

        return contact

    def _find_sections(
        self, lines: list[str]
    ) -> tuple[dict[str, tuple[int, int]], list[str], list[str]]:
        matches = []
        non_canonical = []

        for idx, line in enumerate(lines):
            clean = line.strip().lower()
            # Chequear títulos penalizados compuestos
            for comp_pat in PENALIZED_COMPOUND_SECTIONS:
                if comp_pat.match(clean):
                    non_canonical.append(line)

            for sec_key, aliases in CANONICAL_SECTIONS.items():
                if clean in aliases:
                    matches.append((sec_key, idx))
                    break

        section_indices = {}
        detected = [m[0] for m in matches]

        for i, (sec_key, start_line) in enumerate(matches):
            next_start = matches[i + 1][1] if i + 1 < len(matches) else len(lines)
            section_indices[sec_key] = (start_line + 1, next_start)

        return section_indices, detected, non_canonical

    def _parse_experience(self, lines: list[str]) -> list[ParsedExperience]:
        experiences = []
        current_exp: ParsedExperience | None = None

        for line in lines:
            date_match = DATE_RANGE_PATTERN.search(line)
            is_bullet = line.startswith(("•", "-", "*"))
            is_entry_header = date_match or (
                not is_bullet and any(sep in line for sep in [" — ", " - ", " | "])
            )
            if is_entry_header:
                if current_exp:
                    experiences.append(current_exp)
                current_exp = ParsedExperience()
                if date_match:
                    current_exp.date_label = date_match.group(0)
                    current_exp.has_valid_date_range = True

                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 2:
                    current_exp.title = parts[0]
                    current_exp.location = parts[-1]
                else:
                    current_exp.title = line
            elif line.startswith(("•", "-", "*")):
                bullet_text = line.lstrip("•-* ").strip()
                if current_exp:
                    current_exp.bullets.append(bullet_text)
                else:
                    current_exp = ParsedExperience(bullets=[bullet_text])
            elif current_exp and current_exp.bullets:
                current_exp.bullets[-1] += " " + line

        if current_exp:
            experiences.append(current_exp)

        return experiences

    def _parse_education(self, lines: list[str]) -> list[ParsedEducation]:
        edu_list = []
        current_edu: ParsedEducation | None = None

        for line in lines:
            if line.startswith(("•", "-", "*")):
                bullet = line.lstrip("•-* ").strip()
                if current_edu:
                    current_edu.bullets.append(bullet)
            else:
                if current_edu is None:
                    current_edu = ParsedEducation(institution=line)
                elif not current_edu.degree:
                    current_edu.degree = line
                date_match = DATE_RANGE_PATTERN.search(line)
                if date_match and current_edu:
                    current_edu.date_label = date_match.group(0)

        if current_edu:
            edu_list.append(current_edu)
        return edu_list

    def _parse_projects(self, lines: list[str]) -> list[ParsedProject]:
        projects = []
        current_proj: ParsedProject | None = None

        for line in lines:
            if line.startswith(("•", "-", "*")):
                bullet = line.lstrip("•-* ").strip()
                if current_proj:
                    current_proj.bullets.append(bullet)
            else:
                if current_proj and current_proj.bullets:
                    projects.append(current_proj)
                    current_proj = None
                if current_proj is None:
                    current_proj = ParsedProject(name=line)

        if current_proj:
            projects.append(current_proj)
        return projects

    def _parse_skills(self, lines: list[str]) -> list[ParsedSkillCategory]:
        categories = []
        for line in lines:
            clean = line.lstrip("•-* ").strip()
            if ":" in clean:
                cat_name, items_str = clean.split(":", 1)
                items = [it.strip() for it in items_str.split(",") if it.strip()]
                categories.append(ParsedSkillCategory(category=cat_name.strip(), items=items))
        return categories
