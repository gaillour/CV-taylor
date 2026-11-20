"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  FileText,
  FolderGit2,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { TextMaskReveal } from "@/components/landing/motion/TextMaskReveal";
import { useMainScrollRef } from "@/components/landing/useMainScrollRef";

interface CvEntry {
  role: string;
  period: string;
  bullets: string[];
}

interface SkillLine {
  label: string;
  value: string;
}

interface ProfileBlock {
  id: string;
  editorLabel: string;
  editorCount: string;
  title: string;
  fillPct: number;
  cvHeading: string;
  cvParagraph?: string;
  cvEntries?: CvEntry[];
  cvSkillLines?: SkillLine[];
  flyFrom: { x: number; y: number; rotate: number };
  isOverflow?: boolean;
}

const PROFILE_BLOCKS: ProfileBlock[] = [
  {
    id: "summary",
    editorLabel: "Resumen Profesional",
    editorCount: "3 líneas",
    title: "8+ años en sistemas distribuidos, APIs de alta carga y equipos backend.",
    fillPct: 18,
    cvHeading: "Resumen profesional",
    cvParagraph:
      "Ingeniero de Software con más de 8 años diseñando sistemas distribuidos, pipelines de datos y APIs críticas de baja latencia. Experiencia liderando equipos backend, migraciones cloud y estándares de observabilidad en producción.",
    flyFrom: { x: -200, y: -60, rotate: -7 },
  },
  {
    id: "exp1",
    editorLabel: "Experiencia Laboral",
    editorCount: "2 puestos",
    title: "Tech Lead en Prisma Logistics · Senior Backend en Aura Pay.",
    fillPct: 38,
    cvHeading: "Experiencia profesional",
    cvEntries: [
      {
        role: "Tech Lead — Prisma Logistics",
        period: "2023 — Presente · CABA",
        bullets: [
          "Migración de ingesta en Go reduciendo latencia p99 de 180 ms a 42 ms.",
          "Rediseño de clústeres y colas en AWS con ahorro de USD 24k anuales.",
          "Dirección técnica de 8 desarrolladores con despliegues diarios sin downtime.",
        ],
      },
      {
        role: "Senior Backend Engineer — Aura Pay",
        period: "2021 — 2023 · Remoto",
        bullets: [
          "Arquitectura del procesador de pagos transaccional con 99.98 % de uptime.",
          "Replicación multi-región en PostgreSQL y trazas distribuidas con OpenTelemetry.",
          "Integración de conciliación automática para más de 400k operaciones diarias.",
        ],
      },
    ],
    flyFrom: { x: -230, y: 35, rotate: 6 },
  },
  {
    id: "proj1",
    editorLabel: "Proyectos & Formación",
    editorCount: "2 ítems",
    title: "Motor Typst determinista · Ingeniería Informática (UBA).",
    fillPct: 24,
    cvHeading: "Proyectos & formación",
    cvEntries: [
      {
        role: "CV-Tailor — Motor tipográfico A4",
        period: "2025 — 2026",
        bullets: [
          "Compilación determinista en Typst con control de densidad y hashes SHA-256.",
          "Pipeline de adaptación por oferta sin alucinaciones sobre perfil maestro.",
        ],
      },
      {
        role: "Ingeniería en Informática — Universidad de Buenos Aires",
        period: "2016 — 2021",
        bullets: [
          "Orientación en sistemas distribuidos, bases de datos y compiladores.",
        ],
      },
    ],
    flyFrom: { x: -185, y: 95, rotate: -5 },
  },
  {
    id: "skills",
    editorLabel: "Habilidades Técnicas",
    editorCount: "14 skills",
    title: "Go · Python · TypeScript · PostgreSQL · Docker · Kubernetes · AWS.",
    fillPct: 16,
    cvHeading: "Habilidades técnicas",
    cvSkillLines: [
      {
        label: "Lenguajes & Backend",
        value: "Go, Python, TypeScript, SQL, FastAPI, gRPC, GraphQL",
      },
      {
        label: "Infraestructura & Datos",
        value: "PostgreSQL, Redis, Kafka, Docker, Kubernetes, AWS, Terraform",
      },
      {
        label: "Arquitectura & Calidad",
        value: "Sistemas distribuidos, OpenTelemetry, CI/CD, TDD, Diseño de APIs",
      },
    ],
    flyFrom: { x: -210, y: -20, rotate: 6 },
  },
  {
    id: "extra",
    editorLabel: "Experiencia Adicional",
    editorCount: "2019",
    title: "Analista Jr en Sistemas Legacy · Bloque que desborda 1 página A4.",
    fillPct: 22,
    cvHeading: "Historial adicional",
    cvEntries: [
      {
        role: "Analista Jr — Sistemas Legacy",
        period: "2019 — 2020 · CABA",
        bullets: [
          "Mantenimiento de reportes batch, scripts SQL y soporte operativo nivel 2.",
          "Documentación de procedimientos internos y migración de tablas históricas.",
        ],
      },
    ],
    flyFrom: { x: -240, y: 120, rotate: -9 },
    isOverflow: true,
  },
];

const CORE_IDS = ["summary", "exp1", "proj1", "skills"];

function TypewriterText({ text, speedMs = 8 }: { text: string; speedMs?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= text.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 2;
      });
    }, speedMs);
    return () => clearInterval(interval);
  }, [text, speedMs]);

  const done = count >= text.length;

  return (
    <span>
      {text.slice(0, count)}
      {!done ? (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1em] w-[1.5px] translate-y-[1px] bg-zinc-900"
        />
      ) : null}
    </span>
  );
}

function getSectionIcon(id: string) {
  switch (id) {
    case "summary":
      return FileText;
    case "exp1":
    case "extra":
      return Briefcase;
    case "proj1":
      return FolderGit2;
    default:
      return Wrench;
  }
}

export function ProfileFlyDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollRef = useMainScrollRef();
  const isInView = useInView(sectionRef, { once: false, amount: 0.55, root: scrollRef });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ghostCursor, setGhostCursor] = useState<{
    targetId: string;
    x: number;
    y: number;
    clicking: boolean;
  } | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const scheduleStep = useCallback((fn: () => void, delayMs: number) => {
    const timer = setTimeout(fn, delayMs);
    timersRef.current.push(timer);
  }, []);

  const moveCursorTo = useCallback((id: string, clicking: boolean) => {
    const listEl = listRef.current;
    const btnEl = buttonRefs.current[id];
    if (!listEl || !btnEl) return;

    const x = Math.max(24, btnEl.offsetLeft + btnEl.offsetWidth - 44);
    const y = btnEl.offsetTop + btnEl.offsetHeight * 0.52;
    setGhostCursor({ targetId: id, x, y, clicking });
  }, []);

  const moveCursorToGutter = useCallback(() => {
    const listEl = listRef.current;
    const sheetEl = sheetRef.current;
    const extraBtn = buttonRefs.current.extra;
    if (!listEl || !sheetEl || !extraBtn) return;

    const listRect = listEl.getBoundingClientRect();
    const sheetRect = sheetEl.getBoundingClientRect();
    const gap = Math.max(36, sheetRect.left - listRect.right);
    const x = listRect.width + Math.min(gap * 0.42, gap - 22);
    const y = extraBtn.offsetTop + extraBtn.offsetHeight * 0.42;
    setGhostCursor({ targetId: "gutter-think", x, y, clicking: false });
  }, []);

  const runChoreography = useCallback(
    (initialDelayMs = 200) => {
      clearAllTimers();
      scheduleStep(() => {
        setSelectedIds([]);
        setGhostCursor(null);
      }, 0);

      let t = initialDelayMs;

      CORE_IDS.forEach((id) => {
        const hoverAt = t;
        const clickAt = hoverAt + 240;
        const releaseAt = clickAt + 130;

        scheduleStep(() => moveCursorTo(id, false), hoverAt);
        scheduleStep(() => {
          moveCursorTo(id, true);
          setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        }, clickAt);
        scheduleStep(() => moveCursorTo(id, false), releaseAt);

        t = releaseAt + 250;
      });

      // Agrega el bloque excedente, se corre al espacio entre tarjetas y hoja para "pensar" y vuelve a quitarlo
      const extraHoverAt = t + 280;
      const extraClickAt = extraHoverAt + 260;
      const extraReleaseAt = extraClickAt + 130;
      const thinkAt = extraReleaseAt + 220;
      const returnHoverAt = thinkAt + 820;
      const removeClickAt = returnHoverAt + 280;
      const removeReleaseAt = removeClickAt + 140;
      const exitAt = removeReleaseAt + 340;

      scheduleStep(() => moveCursorTo("extra", false), extraHoverAt);
      scheduleStep(() => {
        moveCursorTo("extra", true);
        setSelectedIds((prev) => (prev.includes("extra") ? prev : [...prev, "extra"]));
      }, extraClickAt);
      scheduleStep(() => moveCursorTo("extra", false), extraReleaseAt);

      scheduleStep(() => moveCursorToGutter(), thinkAt);

      scheduleStep(() => moveCursorTo("extra", false), returnHoverAt);
      scheduleStep(() => {
        moveCursorTo("extra", true);
        setSelectedIds((prev) => prev.filter((id) => id !== "extra"));
      }, removeClickAt);
      scheduleStep(() => moveCursorTo("extra", false), removeReleaseAt);
      scheduleStep(() => setGhostCursor(null), exitAt);
    },
    [clearAllTimers, moveCursorTo, moveCursorToGutter, scheduleStep]
  );

  useEffect(() => {
    if (isInView) {
      runChoreography(600);
    } else {
      clearAllTimers();
      const tClear = setTimeout(() => {
        setSelectedIds([]);
        setGhostCursor(null);
      }, 0);
      timersRef.current.push(tClear);
    }
    return () => clearAllTimers();
  }, [isInView, runChoreography, clearAllTimers]);

  const toggleBlock = (id: string) => {
    clearAllTimers();
    setGhostCursor(null);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const placedBlocks = PROFILE_BLOCKS.filter((b) => selectedIds.includes(b.id));
  const fillPercent = placedBlocks.reduce((acc, b) => acc + b.fillPct, 0);
  const isOverflow = fillPercent > 100;
  const isComplete = !isOverflow && placedBlocks.length === CORE_IDS.length;

  return (
    <section
      ref={sectionRef}
      id="composicion"
      aria-labelledby="profile-fly-title"
      className={`relative overflow-hidden border-b bg-[var(--bg-surface)] px-4 py-24 transition-colors duration-300 sm:px-6 sm:py-32 lg:px-8 ${
        isOverflow ? "border-[var(--danger-border)]" : "border-[var(--border-hairline)]"
      }`}
    >
      <div className="relative z-10 mx-auto max-w-6xl">
        <div
          className={`mb-12 flex flex-col gap-6 border-b pb-8 transition-colors duration-300 sm:mb-14 sm:flex-row sm:items-end sm:justify-between ${
            isOverflow ? "border-[var(--danger-border)]" : "border-[var(--border-hairline)]"
          }`}
        >
          <div>
            <p
              className={`font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-300 ${
                isOverflow ? "text-[var(--danger)]" : "text-[var(--accent)]"
              }`}
            >
              04 / Del perfil al CV
            </p>
            <h2
              id="profile-fly-title"
              className="mt-2 font-display text-3xl font-medium tracking-[-0.04em] text-[var(--text-ivory)] sm:text-5xl lg:text-6xl"
            >
              <TextMaskReveal>Cargás una vez.</TextMaskReveal>{" "}
              <span className="italic text-[var(--text-secondary)]">
                <TextMaskReveal delay={0.08}>Se arma solo.</TextMaskReveal>
              </span>
            </h2>
            <p className="mt-2 max-w-lg text-sm text-[var(--text-secondary)]">
              Si un bloque excede la página A4, el editor lo detecta y recorta al instante.
            </p>
          </div>

          <button
            type="button"
            onClick={() => runChoreography(200)}
            className={`inline-flex items-center gap-2 self-start border-b border-transparent pb-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto ${
              isOverflow
                ? "text-[var(--danger)] hover:border-[var(--danger)]"
                : "text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-ivory)]"
            }`}
          >
            <RotateCcw className="size-3.5" strokeWidth={1.5} />
            Reiniciar armado
          </button>
        </div>

        <div className="relative grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Izquierda: Tarjetas de bloques del perfil */}
          <div ref={listRef} className="relative space-y-3 lg:col-span-5">
            <div className="mb-3 flex items-center justify-between font-mono text-[11px] tabular-nums">
              <span className={isOverflow ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}>
                {isOverflow ? "Sobrecarga detectada" : "Secciones del perfil"}
              </span>
              <span className={isOverflow ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}>
                {placedBlocks.length} / 4 máx
              </span>
            </div>

            {PROFILE_BLOCKS.map((block) => {
              const isPlaced = selectedIds.includes(block.id);
              const isOverflowCause = isOverflow && Boolean(block.isOverflow) && isPlaced;
              const isGhostClicking =
                ghostCursor?.targetId === block.id && ghostCursor.clicking;
              const Icon = getSectionIcon(block.id);

              return (
                <motion.button
                  key={block.id}
                  ref={(el) => {
                    buttonRefs.current[block.id] = el;
                  }}
                  type="button"
                  onClick={() => toggleBlock(block.id)}
                  aria-pressed={isPlaced}
                  animate={
                    isOverflowCause
                      ? { x: [0, -4, 4, -2, 0], scale: 1 }
                      : isGhostClicking
                        ? { x: 0, scale: 0.985 }
                        : { x: 0, scale: 1 }
                  }
                  transition={{ duration: isGhostClicking ? 0.12 : 0.24 }}
                  className={`group relative w-full rounded-[6px] border p-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    isOverflowCause
                      ? "border-[var(--danger)] bg-[var(--danger-subtle)]"
                      : isOverflow
                        ? "border-[var(--danger-border)]/70 bg-[var(--bg-canvas)] opacity-75"
                        : isPlaced
                          ? "border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]"
                          : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-subtle)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        aria-hidden="true"
                        className={`size-4 shrink-0 transition-colors ${
                          isOverflowCause
                            ? "text-[var(--danger)]"
                            : isOverflow
                              ? "text-[var(--text-muted)]"
                              : isPlaced
                                ? "text-[var(--accent)]"
                                : "text-[var(--text-muted)]"
                        }`}
                        strokeWidth={1.5}
                      />
                      <span className="truncate text-sm font-medium text-[var(--text-ivory)]">
                        {block.editorLabel}
                      </span>
                      <span
                        className={`shrink-0 font-mono text-[11px] ${
                          isOverflowCause
                            ? "text-[var(--danger)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        ({block.editorCount})
                      </span>
                    </div>

                    <span
                      className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] ${
                        isOverflowCause
                          ? "font-medium text-[var(--danger)]"
                          : isOverflow
                            ? "text-[var(--text-muted)]"
                            : isPlaced
                              ? "text-[var(--accent)]"
                              : "text-[var(--text-muted)]"
                      }`}
                    >
                      {isOverflowCause ? "Excede A4" : isPlaced ? "En hoja" : "+ Sumar"}
                    </span>
                  </div>

                  <p className="mt-1.5 pl-6.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {block.title}
                  </p>
                </motion.button>
              );
            })}

            {/* Cursor fantasma minimalista (solo desktop, durante la demo automática) */}
            <AnimatePresence>
              {ghostCursor ? (
                <motion.div
                  aria-hidden="true"
                  initial={{
                    opacity: 0,
                    x: ghostCursor.x,
                    y: ghostCursor.y + 12,
                    scale: 0.9,
                  }}
                  animate={{
                    opacity: 1,
                    x: ghostCursor.x,
                    y: ghostCursor.y,
                    scale: ghostCursor.clicking ? 0.84 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{
                    x: { type: "spring", stiffness: 230, damping: 26 },
                    y: { type: "spring", stiffness: 230, damping: 26 },
                    scale: { duration: 0.1 },
                    opacity: { duration: 0.18 },
                  }}
                  className="pointer-events-none absolute left-0 top-0 z-40 hidden lg:block"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="drop-shadow-[0_3px_8px_rgba(0,0,0,0.65)]"
                  >
                    <path
                      d="M3.5 2.5L16 10.2L10.3 11.4L7.7 16.8L3.5 2.5Z"
                      fill="#F5F2EB"
                      stroke="#12100E"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Derecha: Hoja A4 blanca real con llenado completo y desborde visible */}
          <div className="flex justify-center lg:col-span-7">
            <div className="relative w-full max-w-[460px]">
              {/* Barra de estado sobre la hoja */}
              <div className="mb-2.5 flex items-center justify-between font-mono text-[11px] tabular-nums">
                {isOverflow ? (
                  <span className="inline-flex items-center gap-1.5 text-[var(--danger)]">
                    <AlertTriangle className="size-3.5" strokeWidth={1.5} />
                    Excede 1 página A4 — recortando bloque
                  </span>
                ) : (
                  <span className={isComplete ? "text-[var(--green-text)]" : "text-[var(--text-muted)]"}>
                    {isComplete
                      ? "1 página A4 · Densidad óptima"
                      : fillPercent === 0
                        ? "Hoja A4 lista"
                        : "Componiendo documento…"}
                  </span>
                )}
                <span className={isOverflow ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}>
                  {isOverflow ? `${fillPercent}% · 1.2 / 1 pág` : `${fillPercent}%`}
                </span>
              </div>

              {/* Marco exterior que reacciona en rojo sin teñir la hoja blanca */}
              <div
                className={`rounded-[4px] p-1.5 transition-all duration-300 ${
                  isOverflow
                    ? "bg-[var(--danger-subtle)] ring-1 ring-[var(--danger)] shadow-[0_0_40px_-10px_rgba(181,82,92,0.55)]"
                    : "bg-transparent ring-1 ring-transparent"
                }`}
              >
                <div
                  ref={sheetRef}
                  className="ats-sheet-canvas relative flex aspect-[210/297] w-full flex-col justify-between overflow-hidden rounded-[2px] border border-zinc-200 bg-white px-6 py-5 text-zinc-900 shadow-[0_22px_55px_-20px_rgba(0,0,0,0.8)]"
                >
                  <div className="min-h-0 flex-1">
                    {/* Cabecera idéntica al editor real */}
                    <header className="mb-3 border-b border-zinc-300 pb-2 text-center">
                      <h3 className="font-display text-[17px] font-semibold tracking-tight text-zinc-950 leading-none">
                        Juan Carlos Pérez
                      </h3>
                      <p className="mt-1 font-mono text-[8px] text-zinc-600">
                        juan.perez@dev.io · Buenos Aires, AR · github.com/jperez
                      </p>
                    </header>

                    {/* Secciones volando y tipeándose en vivo */}
                    <div className="space-y-3.5">
                      <AnimatePresence mode="popLayout">
                        {placedBlocks.map((block) => (
                          <motion.article
                            key={block.id}
                            layout="position"
                            initial={{
                              opacity: 0,
                              x: block.flyFrom.x,
                              y: block.flyFrom.y,
                              rotate: block.flyFrom.rotate,
                              scale: 0.82,
                            }}
                            animate={{
                              opacity: 1,
                              x: 0,
                              y: 0,
                              rotate: 0,
                              scale: 1,
                            }}
                            exit={{
                              opacity: 0,
                              x: 140,
                              y: -24,
                              rotate: 8,
                              scale: 0.86,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 230,
                              damping: 20,
                              mass: 0.85,
                            }}
                            className={`text-left ${
                              block.isOverflow
                                ? "rounded-[2px] border-l-2 border-[#b5525c] bg-[#b5525c]/[0.08] py-1 pl-2 pr-1"
                                : ""
                            }`}
                          >
                            <h4
                              className={`mb-1 border-b pb-0.5 text-[9.5px] font-bold uppercase tracking-[0.05em] ${
                                block.isOverflow
                                  ? "border-[#b5525c] text-[#9e3c46]"
                                  : "border-zinc-900 text-zinc-950"
                              }`}
                            >
                              <TypewriterText text={block.cvHeading} speedMs={12} />
                            </h4>

                            {block.cvParagraph ? (
                              <p className="text-[9.5px] leading-[1.45] text-zinc-800">
                                <TypewriterText text={block.cvParagraph} speedMs={6} />
                              </p>
                            ) : null}

                            {block.cvEntries ? (
                              <div className="space-y-2.5">
                                {block.cvEntries.map((entry) => (
                                  <div key={entry.role}>
                                    <div className="flex items-baseline justify-between gap-2 text-[9.5px]">
                                      <span className="font-semibold text-zinc-900">
                                        <TypewriterText text={entry.role} speedMs={9} />
                                      </span>
                                      <span className="shrink-0 font-mono text-[8px] text-zinc-500">
                                        {entry.period}
                                      </span>
                                    </div>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-3.5 text-[9px] leading-[1.38] text-zinc-700">
                                      {entry.bullets.map((bullet) => (
                                        <li key={bullet}>
                                          <TypewriterText text={bullet} speedMs={7} />
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {block.cvSkillLines ? (
                              <div className="space-y-1 text-[9px] leading-[1.42] text-zinc-800">
                                {block.cvSkillLines.map((line) => (
                                  <p key={line.label}>
                                    <strong className="font-semibold text-zinc-950">
                                      {line.label}:
                                    </strong>{" "}
                                    <TypewriterText text={line.value} speedMs={8} />
                                  </p>
                                ))}
                              </div>
                            ) : null}
                          </motion.article>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Línea de corte roja cuando el 5to bloque desborda la página A4 */}
                  {isOverflow ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-7 z-20 flex items-center"
                    >
                      <div className="h-px flex-1 border-t border-dashed border-[#b5525c]" />
                      <span className="bg-[#b5525c] px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-white">
                        Límite 1 pág A4
                      </span>
                      <div className="h-px flex-1 border-t border-dashed border-[#b5525c]" />
                    </div>
                  ) : null}

                  <footer className="relative z-10 mt-2 flex shrink-0 items-center justify-between border-t border-zinc-200 bg-white pt-1.5 font-mono text-[7.5px] text-zinc-400">
                    <span>Typst · A4</span>
                    <span
                      className={
                        isOverflow
                          ? "font-semibold text-[#b5525c]"
                          : isComplete
                            ? "font-medium text-emerald-800"
                            : ""
                      }
                    >
                      {isOverflow
                        ? "Desborde de página"
                        : isComplete
                          ? "PDF listo"
                          : "Esperando secciones"}
                    </span>
                  </footer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
