// Vercanard - Elegant 2-column sidebar template with photo and structured metadata
#let data = if "data" in sys.inputs {
  json(bytes(sys.inputs.data))
} else {
  json(sys.inputs.at("data_path", default: "cv.json"))
}

#let lang = data.at("lang", default: "es")
#let d = data.at("design", default: (:))
#let font_size = d.at("font_size_pt", default: 9.5) * 1pt
#let leading_val = d.at("leading_em", default: 0.40) * 1em
#let sec_space = d.at("section_spacing_pt", default: 11.0) * 1pt
#let entry_space = d.at("entry_spacing_pt", default: 6.5) * 1pt
#let bullet_space = d.at("bullet_spacing_pt", default: 5.0) * 1pt
#let margin_x = d.at("margin_x_cm", default: 1.25) * 1cm
#let margin_y = d.at("margin_y_cm", default: 1.20) * 1cm
#let font_family = d.at("font_family", default: "Liberation Sans")
#let accent = rgb("#0d5c75") // Teal / Deep Cyan

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

#show heading.where(level: 2): it => block(above: sec_space, below: 4.5pt, sticky: true, width: 100%)[
  #text(size: font_size + 1.0pt, weight: "bold", fill: accent, tracking: 0.4pt)[#upper(it.body)]
  #v(-5.0pt)
  #line(length: 100%, stroke: 0.7pt + accent.lighten(40%))
]

#let labels = if lang == "en" {
  (
    contact: "Contact",
    summary: "Summary",
    experience: "Experience",
    projects: "Projects",
    education: "Education",
    skills: "Skills",
  )
} else {
  (
    contact: "Contacto",
    summary: "Resumen",
    experience: "Experiencia",
    projects: "Proyectos",
    education: "Educación",
    skills: "Habilidades",
  )
}

#let photo_path = data.at("photo_path", default: none)
#let render_avatar(size: 2.8cm) = {
  if photo_path != none and photo_path != "" {
    block(
      width: size,
      height: size,
      radius: 100%,
      clip: true,
      stroke: 2pt + accent.lighten(30%),
      image(photo_path, width: 100%, height: 100%, fit: "cover")
    )
  } else {
    let initial = if data.at("full_name", default: "") != "" { data.full_name.slice(0, 1) } else { "U" }
    block(
      width: size,
      height: size,
      radius: 100%,
      fill: accent.lighten(85%),
      stroke: 1.5pt + accent.lighten(40%),
      place(center + horizon)[#text(size: size * 0.45, fill: accent, weight: "bold")[#initial]]
    )
  }
}

#let c = data.at("contact", default: (:))

#let sidebar = [
  #align(center)[
    #render_avatar(size: 2.8cm)
    #v(6pt)
    #text(size: font_size + 4.5pt, weight: "bold", fill: rgb("#0f172a"))[#data.at("full_name", default: "")]
  ]
  #v(sec_space * 0.8)

  #text(size: font_size - 0.2pt, weight: "bold", fill: accent, tracking: 0.5pt)[#upper(labels.contact)]
  #v(-5.0pt)
  #line(length: 100%, stroke: 0.6pt + accent.lighten(40%))
  #v(2pt)

  #set text(size: font_size - 0.8pt)
  #if c.at("email", default: none) != none and c.email != "" [
    #block(below: 4pt)[#link("mailto:" + c.email)[#c.email]]
  ]
  #if c.at("phone", default: none) != none and c.phone != "" [
    #block(below: 4pt)[#c.phone]
  ]
  #if c.at("location", default: none) != none and c.location != "" [
    #block(below: 4pt)[#c.location]
  ]
  #if c.at("linkedin", default: none) != none and c.linkedin != "" [
    #block(below: 4pt)[#link("https://" + c.linkedin)[#c.linkedin]]
  ]
  #if c.at("github", default: none) != none and c.github != "" [
    #block(below: 4pt)[#link("https://" + c.github)[#c.github]]
  ]
  #if c.at("website", default: none) != none and c.website != "" [
    #block(below: 4pt)[#link("https://" + c.website)[#c.website]]
  ]

  #if data.at("skills", default: ()).len() > 0 [
    #v(sec_space * 0.8)
    #text(size: font_size - 0.2pt, weight: "bold", fill: accent, tracking: 0.5pt)[#upper(labels.skills)]
    #v(-5.0pt)
    #line(length: 100%, stroke: 0.6pt + accent.lighten(40%))
    #v(3pt)

    #for hab in data.skills [
      #block(below: 5pt)[
        #text(weight: "bold", fill: rgb("#0f172a"))[#hab.category] \
        #text(fill: luma(70), size: font_size - 1.0pt)[#hab.items]
      ]
    ]
  ]
]

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
          ],
          [
            #text(size: font_size - 0.8pt, fill: luma(90))[
              #entry.at("date_range", default: "")
            ]
          ],
        )
      ]
      #if entry.at("bullets", default: ()).len() > 0 [
        #v(bullet_space * 0.3)
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
              #text(fill: accent, size: font_size - 0.7pt)[ (#entry.technologies)]
            ]
          ],
          [
            #text(size: font_size - 0.8pt, fill: luma(90))[
              #entry.at("date_range", default: "")
            ]
          ],
        )
      ]
      #if entry.at("bullets", default: ()).len() > 0 [
        #v(bullet_space * 0.3)
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
              #text(fill: accent)[ | #entry.institution]
            ]
          ],
          [
            #text(size: font_size - 0.8pt, fill: luma(90))[
              #entry.at("date_range", default: "")
            ]
          ],
        )
      ]
      #if entry.at("bullets", default: ()).len() > 0 [
        #v(bullet_space * 0.3)
        #for b in entry.bullets [
          - #b.at("text", default: "")
        ]
      ]
      #v(entry_space)
    ]
  ]
}

#let main_content = [
  #let section_map = (
    summary: render_summary,
    experience: render_experience,
    projects: render_projects,
    education: render_education,
  )
  #let default_order = ("summary", "experience", "projects", "education")
  #let order = data.at("section_order", default: default_order)
  #for sec in order {
    if sec in section_map {
      (section_map.at(sec))()
    }
  }
]

#grid(
  columns: (31%, 69%),
  column-gutter: 0.9cm,
  sidebar,
  main_content,
)#v(0pt, weak: true)#context [#metadata(counter(page).final().first()) <pages>#metadata(here().position()) <end>]
