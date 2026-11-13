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
