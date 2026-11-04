// Modern CV - Contemporary visual template with header accent and avatar integration
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
#let accent = rgb("#1d4ed8") // Blue 700

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
#set list(spacing: bullet_space, marker: text(fill: accent)[•])

#show heading.where(level: 1): it => block(below: 3pt, width: 100%)[
  #text(size: font_size + 7pt, weight: "bold", fill: rgb("#0f172a"))[#it.body]
]

#show heading.where(level: 2): it => block(above: sec_space, below: 5.0pt, sticky: true, width: 100%)[
  #text(size: font_size + 1.1pt, weight: "bold", fill: accent, tracking: 0.3pt)[#upper(it.body)]
  #v(-5.0pt)
  #line(length: 100%, stroke: 0.75pt + accent.lighten(50%))
]

#let labels = if lang == "en" {
  (
    summary: "Professional Summary",
    experience: "Experience",
    projects: "Projects",
    education: "Education",
    skills: "Skills",
  )
} else {
  (
    summary: "Resumen Profesional",
    experience: "Experiencia Laboral",
    projects: "Proyectos",
    education: "Educación",
    skills: "Habilidades",
  )
}

#let photo_path = data.at("photo_path", default: none)
#let render_avatar(size: 2.2cm) = {
  if photo_path != none and photo_path != "" {
    block(
      width: size,
      height: size,
      radius: 100%,
      clip: true,
      stroke: 1.5pt + accent.lighten(40%),
      image(photo_path, width: 100%, height: 100%, fit: "cover")
    )
  } else {
    let initial = if data.at("full_name", default: "") != "" { data.full_name.slice(0, 1) } else { "U" }
    block(
      width: size,
      height: size,
      radius: 100%,
      fill: accent.lighten(85%),
      stroke: 1pt + accent.lighten(40%),
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

// Header with avatar on the right
#grid(
  columns: (1fr, auto),
  align: (left + horizon, right + horizon),
  gutter: 1cm,
  [
    = #data.at("full_name", default: "")
    #v(1pt)
    #text(size: font_size - 0.5pt, fill: luma(80))[
      #contact_parts.join("  •  ")
    ]
  ],
  render_avatar(size: 2.2cm)
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
            #text(weight: "bold", fill: rgb("#0f172a"))[#entry.at("title", default: "")]
            #if entry.at("company", default: none) != none [
              #text(fill: accent, weight: "medium")[ | #entry.company]
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
            #text(weight: "bold", fill: rgb("#0f172a"))[#entry.at("title", default: "")]
            #if entry.at("technologies", default: none) != none [
              #text(fill: accent, weight: "medium", size: font_size - 0.5pt)[ (#entry.technologies)]
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
            #text(weight: "bold", fill: rgb("#0f172a"))[#entry.at("title", default: "")]
            #if entry.at("institution", default: none) != none [
              #text(fill: accent, weight: "medium")[ | #entry.institution]
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
