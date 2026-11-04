// Basic single-column ATS-strict template with clean minimalist typography
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
#set list(spacing: bullet_space)

#show heading.where(level: 1): it => block(below: 4pt, width: 100%)[
  #text(size: font_size + 6.0pt, weight: "bold")[#it.body]
]

#show heading.where(level: 2): it => block(above: sec_space, below: 5.0pt, sticky: true, width: 100%)[
  #text(size: font_size + 1.0pt, weight: "bold")[#it.body]
  #v(-2.0pt)
  #line(length: 100%, stroke: 0.5pt + luma(140))
]

#let labels = if lang == "en" {
  (
    summary: "Summary",
    experience: "Experience",
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

= #data.full_name
#block(below: 5pt)[#text(size: font_size - 0.5pt, fill: luma(60))[#contact_parts.join([ • ])]]

#let render_summary() = {
  if data.at("summary", default: none) != none and data.summary != "" [
    == #labels.summary
    #data.summary
  ]
}

#let render_experience() = {
  if data.at("experience", default: ()).len() > 0 [
    == #labels.experience
    #for exp in data.experience [
      #let exp_meta = if exp.at("location", default: none) != none and exp.location != "" {
        exp.date_label + " | " + exp.location
      } else {
        exp.date_label
      }
      #block(below: 4.0pt, sticky: true)[*#exp.title* — #exp.org | #text(size: font_size - 0.5pt, fill: luma(75))[#exp_meta]]
      #for b in exp.bullets [
        #let b_text = if type(b) == dictionary { b.at("text", default: "") } else { b }
        - #b_text
      ]
      #v(entry_space)
    ]
  ]
}

#let render_projects() = {
  if data.at("projects", default: ()).len() > 0 [
    == #labels.projects
    #for proj in data.projects [
      #block(below: 4.0pt, sticky: true)[*#proj.title*#if proj.at("link", default: none) != none and proj.link != "" [ | #link("https://" + proj.link)[#proj.link]] | #text(size: font_size - 0.5pt, fill: luma(75))[#proj.date_label]]
      #for b in proj.bullets [
        #let b_text = if type(b) == dictionary { b.at("text", default: "") } else { b }
        - #b_text
      ]
      #v(entry_space)
    ]
  ]
}

#let render_education() = {
  if data.at("education", default: ()).len() > 0 [
    == #labels.education
    #for edu in data.education [
      #let edu_meta = if edu.at("location", default: none) != none and edu.location != "" {
        edu.date_label + " | " + edu.location
      } else {
        edu.date_label
      }
      #block(below: 4.0pt, sticky: true)[*#edu.title* — #edu.org | #text(size: font_size - 0.5pt, fill: luma(75))[#edu_meta]]
      #if edu.bullets.len() > 0 [
        #for b in edu.bullets [
          #let b_text = if type(b) == dictionary { b.at("text", default: "") } else { b }
          - #b_text
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
      #let cat = hab.at("category", default: hab.at("name", default: ""))
      #let itms = hab.at("items", default: "")
      - *#cat:* #itms
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
