"use client";

import React, { useState } from "react";
import { useCvStore } from "@/store/useCvStore";
import { HeaderSection } from "./HeaderSection";
import { SummarySection } from "./SummarySection";
import { SkillsSection } from "./SkillsSection";
import { ExperienceSection } from "./ExperienceSection";
import { ProjectsSection } from "./ProjectsSection";
import { EducationSection } from "./EducationSection";
import {
  User,
  FileText,
  Wrench,
  Briefcase,
  FolderGit2,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Sliders,
} from "lucide-react";

export function CvEditor() {
  const { renderModel, updateModel } = useCvStore();

  // Accordion open/close state (collapsed by default for clean initial view)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    experience: false,
    projects: false,
    skills: false,
    summary: false,
    header: false,
    education: false,
  });

  if (!renderModel) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-xs">
        Cargando perfil...
      </div>
    );
  }

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    {
      key: "experience",
      title: "Experiencia Laboral",
      icon: <Briefcase className="w-4 h-4 text-emerald-400" />,
      badge: `${renderModel.experience.filter((e) => e.selected !== false).length}/${renderModel.experience.length}`,
      component: (
        <ExperienceSection
          entries={renderModel.experience}
          onChange={(entries, debounceMs) =>
            updateModel((prev) => ({ ...prev, experience: entries }), debounceMs)
          }
        />
      ),
    },
    {
      key: "projects",
      title: "Proyectos Destacados",
      icon: <FolderGit2 className="w-4 h-4 text-blue-400" />,
      badge: `${renderModel.projects.filter((e) => e.selected !== false).length}/${renderModel.projects.length}`,
      component: (
        <ProjectsSection
          entries={renderModel.projects}
          onChange={(entries, debounceMs) =>
            updateModel((prev) => ({ ...prev, projects: entries }), debounceMs)
          }
        />
      ),
    },
    {
      key: "skills",
      title: "Habilidades Técnicas",
      icon: <Wrench className="w-4 h-4 text-amber-400" />,
      badge: `${renderModel.skills.length}`,
      component: (
        <SkillsSection
          skills={renderModel.skills}
          onChange={(skills, debounceMs) =>
            updateModel((prev) => ({ ...prev, skills }), debounceMs)
          }
        />
      ),
    },
    {
      key: "summary",
      title: "Resumen Profesional",
      icon: <FileText className="w-4 h-4 text-purple-400" />,
      badge: renderModel.summary ? "Activo" : "Vacío",
      component: (
        <SummarySection
          summary={renderModel.summary || ""}
          onChange={(summary, debounceMs) =>
            updateModel((prev) => ({ ...prev, summary }), debounceMs)
          }
        />
      ),
    },
    {
      key: "header",
      title: "Datos de Contacto",
      icon: <User className="w-4 h-4 text-cyan-400" />,
      badge: renderModel.full_name,
      component: (
        <HeaderSection
          fullName={renderModel.full_name}
          contact={renderModel.contact}
          onChange={({ fullName, contact }, debounceMs) =>
            updateModel(
              (prev) => ({
                ...prev,
                ...(fullName !== undefined ? { full_name: fullName } : {}),
                ...(contact !== undefined ? { contact } : {}),
              }),
              debounceMs
            )
          }
        />
      ),
    },
    {
      key: "education",
      title: "Educación",
      icon: <GraduationCap className="w-4 h-4 text-indigo-400" />,
      badge: `${renderModel.education.filter((e) => e.selected !== false).length}/${renderModel.education.length}`,
      component: (
        <EducationSection
          entries={renderModel.education}
          onChange={(entries, debounceMs) =>
            updateModel((prev) => ({ ...prev, education: entries }), debounceMs)
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-3 pb-6">
      {/* Dynamic Accordion Sections */}
      {sections.map(({ key, title, icon, badge, component }) => {
        const isOpen = openSections[key];
        return (
          <div
            key={key}
            className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 overflow-hidden transition"
          >
            <button
              type="button"
              onClick={() => toggleSection(key)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/50 transition select-none text-left"
            >
              <div className="flex items-center gap-2.5">
                {icon}
                <span className="text-xs font-semibold text-zinc-200">{title}</span>
                {badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {badge}
                  </span>
                )}
              </div>
              <div className="text-zinc-500">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isOpen && (
              <div className="p-3.5 pt-0 border-t border-zinc-800/40">
                {component}
              </div>
            )}
          </div>
        );
      })}

      {/* Density Control Slider */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            Densidad Tipográfica
          </span>
          <span className="font-mono text-zinc-400">
            d={renderModel.design.density.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0.0"
          max="0.35"
          step="0.05"
          value={renderModel.design.density}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            updateModel(
              (prev) => ({
                ...prev,
                design: {
                  ...prev.design,
                  density: val,
                },
              }),
              80
            );
          }}
          className="w-full accent-emerald-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-zinc-500">
          <span>0.0 (Relajado)</span>
          <span>Tope Confortable (0.35)</span>
        </div>
      </div>
    </div>
  );
}
