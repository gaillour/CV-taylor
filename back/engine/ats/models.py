from dataclasses import dataclass, field


@dataclass
class ParsedContact:
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None
    github: str | None = None
    website: str | None = None


@dataclass
class ParsedExperience:
    title: str | None = None
    company: str | None = None
    date_label: str | None = None
    location: str | None = None
    bullets: list[str] = field(default_factory=list)
    has_valid_date_range: bool = False


@dataclass
class ParsedEducation:
    degree: str | None = None
    institution: str | None = None
    date_label: str | None = None
    location: str | None = None
    bullets: list[str] = field(default_factory=list)


@dataclass
class ParsedProject:
    name: str | None = None
    role: str | None = None
    date_label: str | None = None
    url: str | None = None
    bullets: list[str] = field(default_factory=list)


@dataclass
class ParsedSkillCategory:
    category: str
    items: list[str] = field(default_factory=list)


@dataclass
class ParsedResume:
    contact: ParsedContact = field(default_factory=ParsedContact)
    summary: str | None = None
    experience: list[ParsedExperience] = field(default_factory=list)
    education: list[ParsedEducation] = field(default_factory=list)
    projects: list[ParsedProject] = field(default_factory=list)
    skills: list[ParsedSkillCategory] = field(default_factory=list)
    raw_text: str = ""
    detected_sections: list[str] = field(default_factory=list)
    non_canonical_sections: list[str] = field(default_factory=list)


@dataclass
class ATSReport:
    total_score: int
    structure_score: int
    experience_score: int
    education_score: int
    skills_score: int
    passed: bool
    issues: list[str] = field(default_factory=list)
    keyword_matches: list[str] = field(default_factory=list)
    keyword_gaps: list[str] = field(default_factory=list)
    parsed_resume: ParsedResume | None = None
