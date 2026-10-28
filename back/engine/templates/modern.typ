// Modern single-column ATS-strict template with semantic headings and linear reading order
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
#let accent = rgb("#1e3a5f")

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

#show heading.where(level: 1): it => block(below: 5pt, width: 100%)[
  #text(size: font_size + 6.8pt, weight: "bold", fill: accent)[#it.body]
]

#show heading.where(level: 2): it => block(above: sec_space, below: 5.5pt, sticky: true, width: 100%)[
  #text(size: font_size + 1.0pt, weight: "bold", fill: accent, tracking: 0.3pt)[#upper(it.body)]
  #v(-2.5pt)
  #line(length: 100%, stroke: 0.6pt + accent.lighten(40%))
]

#let labels = if lang == "en" {
  (
    summary: "Professional Summary",
    experience: "Professional Experience",
    projects: "Projects",
    education: "Education",
    skills: "Skills",
  )
} else {
  (
    summary: "Resumen Profesional",
    experience: "Experiencia Profesional",
    projects: "Proyectos",
    education: "Educación",
    skills: "Habilidades",
  )
}

#let contact_parts = ()
#contact_parts.push(link("mailto:" + data.contact.email)[#data.contact.email])
#contact_parts.push(data.contact.phone)
#contact_parts.push(data.contact.location)
#if data.contact.at("linkedin", default: none) != none and data.contact.linkedin != "" {
  contact_parts.push(link("https://" + data.contact.linkedin)[#data.contact.linkedin])
}
#if data.contact.at("github", default: none) != none and data.contact.github != "" {
  contact_parts.push(link("https://" + data.contact.github)[#data.contact.github])
}
#if data.contact.at("website", default: none) != none and data.contact.website != "" {
  contact_parts.push(link("https://" + data.contact.website)[#data.contact.website])
}

= #data.full_name
#block(below: 4.5pt)[
  #text(size: font_size - 0.6pt, fill: luma(65))[#contact_parts.join([ | ])]
]

#if data.at("summary", default: none) != none and data.summary != "" [
  == #labels.summary
  #data.summary
]

#if data.experience.len() > 0 [
  == #labels.experience
  #for exp in data.experience [
    #let exp_meta = if exp.at("location", default: none) != none and exp.location != "" {
      exp.date_label + " | " + exp.location
    } else {
      exp.date_label
    }
    #block(below: 4.5pt, sticky: true)[*#exp.title* — #emph(exp.org) | #text(size: font_size - 0.5pt, fill: luma(75))[#exp_meta]]
    #for b in exp.bullets [
      - #b.text
    ]
    #v(entry_space)
  ]
]

#if data.projects.len() > 0 [
  == #labels.projects
  #for proj in data.projects [
    #block(below: 4.5pt, sticky: true)[*#proj.title*#if proj.at("link", default: none) != none and proj.link != "" [ | #link("https://" + proj.link)[#text(fill: accent)[#proj.link]]] | #text(size: font_size - 0.5pt, fill: luma(75))[#proj.date_label]]
    #for b in proj.bullets [
      - #b.text
    ]
    #v(entry_space)
  ]
]

#if data.education.len() > 0 [
  == #labels.education
  #for edu in data.education [
    #let edu_meta = if edu.at("location", default: none) != none and edu.location != "" {
      edu.date_label + " | " + edu.location
    } else {
      edu.date_label
    }
    #block(below: 4.5pt, sticky: true)[*#edu.title* — #emph(edu.org) | #text(size: font_size - 0.5pt, fill: luma(75))[#edu_meta]]
    #if edu.bullets.len() > 0 [
      #for b in edu.bullets [
        - #b.text
      ]
    ]
    #v(entry_space)
  ]
]

#if data.skills.len() > 0 [
  == #labels.skills
  #for hab in data.skills [
    - *#hab.category:* #hab.items
  ]
]#v(0pt, weak: true)#context [#metadata(counter(page).final().first()) <pages>#metadata(here().position()) <end>]
