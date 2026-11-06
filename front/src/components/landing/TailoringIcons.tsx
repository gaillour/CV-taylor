import React from "react";

export interface TailorIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

/**
 * Tijeras de sastre tradicionales (hojas asimétricas de corte preciso, tornillo central y mangos ergonómicos)
 */
export function TailorScissors({
  size = 64,
  strokeWidth = 1.5,
  className = "",
  ...props
}: TailorIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Mango izquierdo / anillo superior */}
      <path d="M22 75 C14 75, 10 65, 14 56 C18 47, 28 47, 33 54 C38 61, 30 75, 22 75 Z" />
      {/* Mango derecho / anillo alargado inferior para dedos */}
      <path d="M36 84 C27 84, 24 73, 29 65 C34 57, 44 60, 48 70 C51 79, 44 84, 36 84 Z" />
      {/* Vástago hoja superior */}
      <path d="M29 52 L50 48" />
      {/* Vástago hoja inferior */}
      <path d="M43 62 L50 48" />
      {/* Tornillo central / perno pivotante */}
      <circle cx="50" cy="48" r="3" fill="currentColor" fillOpacity="0.2" />
      <circle cx="50" cy="48" r="1" fill="currentColor" />
      {/* Hoja superior puntiaguda */}
      <path d="M50 48 L86 20 C84 26, 75 38, 52 50 Z" fill="currentColor" fillOpacity="0.06" />
      {/* Hoja inferior plana */}
      <path d="M50 48 L88 28 C78 39, 65 47, 50 48 Z" fill="currentColor" fillOpacity="0.04" />
      {/* Filo y reflejo */}
      <line x1="53" y1="46" x2="84" y2="21" strokeOpacity="0.6" strokeWidth={strokeWidth * 0.75} />
    </svg>
  );
}

/**
 * Máquina de coser de hierro fundido clásica (cuerpo curvado vintage, volante, cabezal, aguja y placa)
 */
export function VintageSewingMachine({
  size = 180,
  strokeWidth = 1.25,
  className = "",
  ...props
}: TailorIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 180"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Base de hierro fundido / mesa */}
      <path d="M20 148 L220 148 L216 156 L24 156 Z" fill="currentColor" fillOpacity="0.08" />
      <line x1="16" y1="156" x2="224" y2="156" />
      {/* Pies o esquineros de la base */}
      <path d="M30 156 L26 164 M210 156 L214 164" />

      {/* Columna vertical derecha de la máquina */}
      <path d="M165 148 C165 110, 168 76, 155 60 C146 50, 128 50, 85 50 L60 50 C52 50, 48 56, 48 64 L48 94 C48 98, 52 100, 56 100 L76 100 C82 100, 84 94, 84 88 C84 82, 102 82, 126 86 C144 89, 148 110, 148 148" />

      {/* Detalle ornamental en el arco */}
      <path
        d="M100 66 C115 64, 130 68, 140 76"
        strokeDasharray="2 3"
        strokeOpacity="0.5"
      />

      {/* Volante derecho (Handwheel) */}
      <ellipse cx="186" cy="88" rx="8" ry="32" />
      <ellipse cx="186" cy="88" rx="4" ry="18" strokeDasharray="3 3" />
      <line x1="165" y1="88" x2="186" y2="88" />
      {/* Bobinador en la parte superior derecha */}
      <rect x="156" y="38" width="10" height="12" rx="2" />
      <line x1="161" y1="38" x2="161" y2="30" />
      <circle cx="161" cy="28" r="3" />

      {/* Barra de aguja y prensatelas */}
      <line x1="62" y1="96" x2="62" y2="134" strokeWidth={strokeWidth * 1.2} />
      <line x1="58" y1="96" x2="58" y2="128" />
      {/* Prensatelas (pie) */}
      <path d="M54 134 L66 134 L70 131" />
      {/* Aguja puntiaguda */}
      <line x1="62" y1="134" x2="62" y2="144" strokeWidth={1} />

      {/* Placa de aguja en la mesa */}
      <rect x="50" y="146" width="26" height="3" rx="1" fill="currentColor" fillOpacity="0.2" />

      {/* Regulador de tensión frontal */}
      <circle cx="68" cy="74" r="5" />
      <circle cx="68" cy="74" r="2" fill="currentColor" />

      {/* Filetes dorados / líneas decorativas clásicas de taller de sastrería */}
      <path
        d="M60 58 L142 58"
        strokeOpacity="0.4"
        strokeWidth={strokeWidth * 0.8}
      />
    </svg>
  );
}

/**
 * Carrete de hilo tradicional de madera con hilo devanado y aguja
 */
export function SpoolWithThread({
  size = 54,
  strokeWidth = 1.5,
  className = "",
  ...props
}: TailorIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Brida superior del carrete */}
      <path d="M22 22 C22 18, 58 18, 58 22 L54 28 L26 28 Z" fill="currentColor" fillOpacity="0.1" />
      <ellipse cx="40" cy="21" rx="18" ry="4" />
      <ellipse cx="40" cy="21" rx="4" ry="1.5" fill="currentColor" fillOpacity="0.3" />

      {/* Cilindro de hilo envuelto */}
      <rect x="25" y="28" width="30" height="26" rx="2" fill="currentColor" fillOpacity="0.08" />
      {/* Vueltas de hilo horizontales */}
      <line x1="25" y1="32" x2="55" y2="32" strokeOpacity="0.6" strokeDasharray="3 1.5" />
      <line x1="25" y1="36" x2="55" y2="36" strokeOpacity="0.75" />
      <line x1="25" y1="40" x2="55" y2="40" strokeOpacity="0.6" strokeDasharray="4 2" />
      <line x1="25" y1="44" x2="55" y2="44" strokeOpacity="0.75" />
      <line x1="25" y1="48" x2="55" y2="48" strokeOpacity="0.6" strokeDasharray="3 1.5" />

      {/* Brida inferior del carrete */}
      <path d="M26 54 L54 54 L58 60 C58 64, 22 64, 22 60 Z" fill="currentColor" fillOpacity="0.1" />
      <ellipse cx="40" cy="60" rx="18" ry="4" />

      {/* Aguja clavada o descansando diagonalmente */}
      <line x1="18" y1="16" x2="62" y2="66" strokeWidth={strokeWidth * 1.1} strokeOpacity="0.8" />
      <circle cx="21" cy="19.5" r="1" fill="currentColor" />

      {/* Hilo suelto ondeando con gracia */}
      <path
        d="M55 48 C66 48, 72 55, 68 64 C64 73, 50 68, 54 75 C57 80, 68 78, 76 72"
        strokeOpacity="0.5"
        strokeWidth={strokeWidth * 0.8}
      />
    </svg>
  );
}

/**
 * Botón clásico de traje de cuatro orificios con puntada cruzada en X
 */
export function TailorButton({
  size = 28,
  strokeWidth = 1.5,
  className = "",
  ...props
}: TailorIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Borde exterior del botón */}
      <circle cx="20" cy="20" r="17" />
      {/* Reborde interior cóncavo */}
      <circle cx="20" cy="20" r="13" strokeOpacity="0.4" strokeDasharray="1.5 2" />

      {/* Cuatro orificios */}
      <circle cx="16" cy="16" r="1.75" fill="currentColor" />
      <circle cx="24" cy="16" r="1.75" fill="currentColor" />
      <circle cx="16" cy="24" r="1.75" fill="currentColor" />
      <circle cx="24" cy="24" r="1.75" fill="currentColor" />

      {/* Costura en X (pespunte de sastre) */}
      <line x1="16" y1="16" x2="24" y2="24" strokeWidth={strokeWidth * 0.9} strokeOpacity="0.8" />
      <line x1="24" y1="16" x2="16" y2="24" strokeWidth={strokeWidth * 0.9} strokeOpacity="0.8" />
    </svg>
  );
}

/**
 * Divisor decorativo de hilván sastre (basting stitch / puntada hilvanada de alta gama)
 */
export function BastingStitchDivider({
  className = "",
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  if (orientation === "vertical") {
    return (
      <div
        className={`w-px h-full flex flex-col justify-between items-center opacity-40 ${className}`}
        aria-hidden="true"
      >
        <div className="w-full h-full border-r border-dashed border-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div
      className={`w-full flex items-center justify-center gap-3 py-2 text-[var(--accent)] opacity-70 select-none ${className}`}
      aria-hidden="true"
    >
      <div className="flex-1 h-px border-b border-dashed border-[var(--accent)]" />
      <span className="font-mono text-[9px] tracking-[0.3em] uppercase">✦ basting ✦</span>
      <div className="flex-1 h-px border-b border-dashed border-[var(--accent)]" />
    </div>
  );
}

/**
 * Cinta métrica de sastre artesanal (graduaciones milimétricas en tono latón/whiskey)
 */
export function TailorTapeMeasure({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center overflow-hidden h-6 border border-[var(--accent-border)] bg-[#161412] text-[var(--accent)] rounded-xs select-none shadow-sm ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-end h-full px-2 gap-2 font-mono text-[7.5px] text-[var(--accent)] font-semibold">
        {[0, 5, 10, 15, 20, 25, 30].map((mark, i) => (
          <div key={i} className="flex items-end gap-1">
            <div className="flex items-end gap-[2px]">
              <span className="w-px h-3.5 bg-[var(--accent)]" />
              <span className="w-px h-1.5 bg-[var(--accent)]/40" />
              <span className="w-px h-2 bg-[var(--accent)]/70" />
              <span className="w-px h-1.5 bg-[var(--accent)]/40" />
            </div>
            <span className="text-[7px] leading-none mb-0.5 opacity-80">{mark}cm</span>
          </div>
        ))}
      </div>
    </div>
  );
}
