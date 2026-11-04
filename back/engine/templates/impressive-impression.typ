// Impressive Impression - High-contrast visual template with modern framed avatar and crisp structure
#let data = if "data" in sys.inputs {
  json(bytes(sys.inputs.data))
} else {
  json(sys.inputs.at("data_path", default: "cv.json"))
}

#let lang = data.at("lang", default: "es")
#let d = data.at("design", default: (:))
#let font_size = d.at("font_size_pt", default: 9.7) * 1pt
#let leading_val = d.at("leading_em", default: 0.42) * 1em
#let sec_space = d.at("section_spacing_pt", default: 11.5) * 1pt
#let entry_space = d.at("entry_spacing_pt", default: 6.8) * 1pt
#let bullet_space = d.at("bullet_spacing_pt", default: 5.5) * 1pt
#let margin_x = d.at("margin_x_cm", default: 1.35) * 1cm
#let margin_y = d.at("margin_y_cm", default: 1.30) * 1cm
#let font_family = d.at("font_family", default: "Liberation Sans")
#let accent = rgb("#4338ca") // Indigo 700
#let neutral_dark = rgb("#0f172a")

#set page(
  paper: "a4",
  margin: (x: margin_x, top: margin_y, bottom: margin_y),
)
#set text(
  font: (font_family, "Liberation Sans"),
  size: font_size,
  lang: lang,
)
#set par(justify: true, leading: leading_val)
#set list(spacing: bullet_space, marker: text(fill: accent)[▪])

#show heading.where(level: 1): it => block(below: 2pt, width: 100%)[
  #text(size: font_size + 8pt, weight: "bold", fill: neutral_dark, tracking: 0.2pt)[#it.body]
]

#show heading.where(level: 2): it => block(above: sec_space, below: 4.5pt, sticky: true, width: 100%)[
  #grid(
    columns: (auto, 1fr),
    gutter: 8pt,
    align: horizon,
    [#text(size: font_size + 1.2pt, weight: "bold", fill: accent, tracking: 0.4pt)[#upper(it.body)]],
    [#line(length: 100%, stroke: 0.8pt + accent.lighten(60%))]
  )
]

#let labels = if lang == "en" {
  (
    summary: "Summary",
    experience: "Experience",
    projects: "Featured Projects",
    education: "Education",
    skills: "Core Competencies",
  )
} else {
  (
    summary: "Resumen Ejecutivo",
    experience: "Experiencia Profesional",
    projects: "Proyectos Destacados",
    education: "Formación Académica",
    skills: "Competencias Clave",
  )
}

#let photo_path = data.at("photo_path", default: none)
#let render_avatar(size: 2.3cm) = {
  if photo_path != none and photo_path != "" {
    block(
      width: size,
      height: size,
      radius: 6pt,
      clip: true,
      stroke: 1.5pt + accent,
      image(photo_path, width: 100%, height: 100%, fit: "cover")
    )
  } else {
    let initial = if data.at("full_name", default: "") != "" { data.full_name.slice(0, 1) } else { "U" }
    block(
      width: size,
      height: size,
      radius: 6pt,
      fill: accent.lighten(90%),
      stroke: 1.2pt + accent.lighten(50%),
      place(center + horizon)[#text(size: size * 0.45, fill: accent, weight: "bold")[#initial]]
    )
  }
}

#let c = data.at("contact", default: (:))
#let contact_parts = ()
#if c.at("email", default: none) != none and c.email != "" {
  contact_parts.push(link("mailto:" + c.email)[#c.email])
}
#if c.at("phone", default: none) != none and c.phone != "" {
  contact_parts.push(c.phone)
}
#if c.at("location", default: none) != none and c.location != "" {
  contact_parts.push(c.location)
}
#if c.at("linkedin", default: none) != none and c.linkedin != "" {
  contact_parts.push(link("https://" + c.linkedin)[#c.linkedin])
}
#if c.at("github", default: none) != none and c.github != "" {
  contact_parts.push(link("https://" + c.github)[#c.github])
}
#if c.at("website", default: none) != none and c.website != "" {
  contact_parts.push(link("https://" + c.website)[#c.website])
}

#grid(
  columns: (1fr, auto),
  align: (left + horizon, right + horizon),
  gutter: 1cm,
  [
    = #data.at("full_name", default: "")
    #v(2pt)
    #text(size: font_size - 0.5pt, fill: luma(80))[
      #contact_parts.join("  |  ")
    ]
  ],
  render_avatar(size: 2.3cm)
)

#let render_summary() = {
  if data.at("summary", default: none) != none and data.summary != "" [
    == #labels.summary
    #data.summary
  ]
}

#let render_experience() = {
  if data.at("experience", default: ()).len() > 0 [
    == #labels.experience
    #for entry in data.experience [
      #block(width: 100%, breakable: false)[
        #grid(
          columns: (1fr, auto),
          align: (left, right),
          [
            #text(weight: "bold", fill: neutral_dark)[#entry.at("title", default: "")]
            #if entry.at("company", default: none) != none [
              #text(fill: accent, weight: "semibold")[ · #entry.company]
            ]
            #if entry.at("location", default: none) != none [
              #text(fill: luma(100), size: font_size - 0.6pt)[ (#entry.location)]
            ]
          ],
          [
            #text(size: font_size - 0.6pt, fill: luma(90))[
              #entry.at("date_range", default: "")
            ]
          ],
        )
      ]
      #if entry.at("bullets", default: ()).len() > 0 [
        #v(bullet_space * 0.4)
        #for b in entry.bullets [
          - #b.at("text", default: "")
        ]
      ]
      #v(entry_space)
    ]
  ]
}

#let render_projects() = {
  if data.at("projects", default: ()).len() > 0 [
    == #labels.projects
    #for entry in data.projects [
      #block(width: 100%, breakable: false)[
        #grid(
          columns: (1fr, auto),
          align: (left, right),
          [
            #text(weight: "bold", fill: neutral_dark)[#entry.at("title", default: "")]
            #if entry.at("technologies", default: none) != none [
              #text(fill: accent, size: font_size - 0.6pt)[ [#entry.technologies]]
            ]
          ],
          [
            #text(size: font_size - 0.6pt, fill: luma(90))[
              #entry.at("date_range", default: "")
            ]
          ],
        )
      ]
      #if entry.at("bullets", default: ()).len() > 0 [
        #v(bullet_space * 0.4)
        #for b in entry.bullets [
          - #b.at("text", default: "")
        ]
      ]
      #v(entry_space)
    ]
  ]
}

#let render_education() = {
  if data.at("education", default: ()).len() > 0 [
    == #labels.education
    #for entry in data.education [
      #block(width: 100%, breakable: false)[
        #grid(
          columns: (1fr, auto),
          align: (left, right),
          [
            #text(weight: "bold", fill: neutral_dark)[#entry.at("title", default: "")]
            #if entry.at("institution", default: none) != none [
              #text(fill: accent)[ · #entry.institution]
            ]
          ],
          [
            #text(size: font_size - 0.6pt, fill: luma(90))[
              #entry.at("date_range", default: "")
            ]
          ],
        )
      ]
      #if entry.at("bullets", default: ()).len() > 0 [
        #v(bullet_space * 0.4)
        #for b in entry.bullets [
          - #b.at("text", default: "")
        ]
      ]
      #v(entry_space)
    ]
  ]
}

#let render_skills() = {
  if data.at("skills", default: ()).len() > 0 [
    == #labels.skills
    #for hab in data.skills [
      - *#hab.category:* #hab.items
    ]
  ]
}

#let section_map = (
  summary: render_summary,
  experience: render_experience,
  projects: render_projects,
  education: render_education,
  skills: render_skills,
)

#let default_order = ("summary", "experience", "projects", "education", "skills")
#let order = data.at("section_order", default: default_order)
#for sec in order {
  if sec in section_map {
    (section_map.at(sec))()
  }
}#v(0pt, weak: true)#context [#metadata(counter(page).final().first()) <pages>#metadata(here().position()) <end>]
