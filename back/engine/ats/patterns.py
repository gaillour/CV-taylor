import re

# Email, teléfono y URLs
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_PATTERN = re.compile(r"(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}")
LINKEDIN_PATTERN = re.compile(r"linkedin\.com/in/([A-Za-z0-9_.-]+)")
GITHUB_PATTERN = re.compile(r"github\.com/([A-Za-z0-9_.-]+)")

# Patrones de encabezados canónicos ATS (Lever / Workday compliant ES/EN)
CANONICAL_SECTIONS = {
    "summary": [
        "resumen profesional",
        "resumen",
        "professional summary",
        "summary",
        "profile",
        "perfil",
    ],
    "experience": [
        "experiencia laboral",
        "experiencia profesional",
        "experiencia",
        "work experience",
        "professional experience",
        "experience",
    ],
    "education": ["educación", "educacion", "education", "formación", "formacion"],
    "projects": ["proyectos", "projects", "proyectos destacados", "selected projects"],
    "skills": [
        "habilidades",
        "habilidades técnicas",
        "habilidades tecnicas",
        "skills",
        "technical skills",
    ],
}

# Títulos compuestos penalizados en ATS (ej. "Educación y Formación", "Perfil & Resumen")
PENALIZED_COMPOUND_SECTIONS = [
    re.compile(r"(?i)^educaci[oó]n\s+y\s+formaci[oó]n$"),
    re.compile(r"(?i)^experiencia\s+y\s+proyectos$"),
    re.compile(r"(?i)^habilidades\s+y\s+herramientas$"),
]

# Rango de fechas ATS (MM/YYYY - MM/YYYY, Mon YYYY - Mon YYYY | Presente | Present)
_MONTHS = (
    r"(?:\d{1,2}|"
    r"jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|"
    r"ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|set(?:iembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)"
)
_DATE_POINT = rf"(?:{_MONTHS}[\s/]+)?\d{{4}}"
DATE_RANGE_PATTERN = re.compile(
    rf"({_DATE_POINT})\s*[-–—]\s*({_DATE_POINT}|presente|present|actual|actualidad)",
    re.IGNORECASE,
)

# Verbos de acción fuertes para inicio de viñeta (ES / EN)
ACTION_VERBS = {
    "diseñé",
    "diseñe",
    "desarrollé",
    "desarrolle",
    "implementé",
    "implemente",
    "construí",
    "construi",
    "administré",
    "administre",
    "automaticé",
    "automatice",
    "supervisé",
    "supervise",
    "gestioné",
    "gestione",
    "ejecuté",
    "ejecute",
    "optimicé",
    "optimice",
    "lideré",
    "lidere",
    "integré",
    "integre",
    "diseño",
    "desarrollo",
    "implementación",
    "implementacion",
    "construcción",
    "construccion",
    "designed",
    "developed",
    "implemented",
    "built",
    "managed",
    "automated",
    "supervised",
    "executed",
    "optimized",
    "led",
    "integrated",
}
