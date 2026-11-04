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
  ArrowUp,
  ArrowDown,
  Sliders,
} from "lucide-react";
import { DEFAULT_SECTION_ORDER, SectionKey } from "@/types/cv";

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

  const headerSection = {
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
  };

  const currentOrder: SectionKey[] = renderModel.section_order?.length
    ? renderModel.section_order
    : DEFAULT_SECTION_ORDER;

  const isSummaryIncluded = currentOrder.includes("summary");

  const handleToggleSummary = (included: boolean) => {
    let nextOrder: SectionKey[];
    if (included) {
      if (!currentOrder.includes("summary")) {
        nextOrder = ["summary", ...currentOrder];
      } else {
        nextOrder = [...currentOrder];
      }
    } else {
      nextOrder = currentOrder.filter((k) => k !== "summary");
    }
    updateModel((prev) => ({ ...prev, section_order: nextOrder }), 0);
  };

  // Si summary está fuera de section_order, lo mostramos al inicio para permitir editarlo y reactivarlo
  const displayOrder: SectionKey[] = currentOrder.includes("summary")
    ? currentOrder
    : ["summary", ...currentOrder];

  const sectionMap: Record<
    SectionKey,
    {
      key: SectionKey;
      title: string;
      icon: React.ReactNode;
      badge: string;
      component: React.ReactNode;
    }
  > = {
    experience: {
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
    projects: {
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
    skills: {
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
    summary: {
      key: "summary",
      title: "Resumen Profesional",
      icon: <FileText className="w-4 h-4 text-purple-400" />,
      badge: !isSummaryIncluded
        ? "Excluido"
        : renderModel.summary
        ? "Activo"
        : "Vacío",
      component: (
        <SummarySection
          summary={renderModel.summary || ""}
          isIncluded={isSummaryIncluded}
          onToggleIncluded={(included) => handleToggleSummary(included)}
          onChange={(summary, debounceMs) =>
            updateModel((prev) => ({ ...prev, summary }), debounceMs)
          }
        />
      ),
    },
    education: {
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
  };

  const moveSection = (key: SectionKey, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const orderList = [...currentOrder];
    const index = orderList.indexOf(key);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderList.length) return;

    const temp = orderList[index];
    orderList[index] = orderList[targetIndex];
    orderList[targetIndex] = temp;

    updateModel((prev) => ({ ...prev, section_order: orderList }), 0);
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Header Fijo de Contacto */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 overflow-hidden transition">
        <button
          type="button"
          onClick={() => toggleSection(headerSection.key)}
          className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/50 transition select-none text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {headerSection.icon}
            <span className="text-xs font-semibold text-zinc-200">{headerSection.title}</span>
            {headerSection.badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                {headerSection.badge}
              </span>
            )}
          </div>
          <div className="text-zinc-500">
            {openSections[headerSection.key] ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {openSections[headerSection.key] && (
          <div className="p-3.5 pt-3 border-t border-zinc-800/40">
            {headerSection.component}
          </div>
        )}
      </div>

      {/* Secciones Reordenables del Cuerpo */}
      {displayOrder.map((key, idx) => {
        const sec = sectionMap[key];
        if (!sec) return null;
        const isOpen = openSections[key];
        const isSectionExcluded = key === "summary" && !isSummaryIncluded;
        const isFirst = idx === 0;
        const isLast = idx === displayOrder.length - 1;

        return (
          <div
            key={key}
            className={`rounded-xl border transition overflow-hidden ${
              isSectionExcluded
                ? "border-dashed border-zinc-800 bg-zinc-950/40 opacity-80"
                : "border-zinc-800/80 bg-zinc-950/60"
            }`}
          >
            <div
              onClick={() => toggleSection(key)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/50 transition select-none cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {sec.icon}
                <span className="text-xs font-semibold text-zinc-200">{sec.title}</span>
                {sec.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      isSectionExcluded
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    {sec.badge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    title={isSectionExcluded ? "Sección excluida del orden del CV" : "Subir sección en el CV"}
                    disabled={isSectionExcluded || isFirst}
                    onClick={(e) => moveSection(key, "up", e)}
                    className="p-1 rounded hover:bg-zinc-800 disabled:opacity-20 text-zinc-400 hover:text-zinc-200 transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title={isSectionExcluded ? "Sección excluida del orden del CV" : "Bajar sección en el CV"}
                    disabled={isSectionExcluded || isLast}
                    onClick={(e) => moveSection(key, "down", e)}
                    className="p-1 rounded hover:bg-zinc-800 disabled:opacity-20 text-zinc-400 hover:text-zinc-200 transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-zinc-500 pl-1 border-l border-zinc-800/60">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {isOpen && (
              <div className="p-3.5 pt-3 border-t border-zinc-800/40">
                {sec.component}
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
