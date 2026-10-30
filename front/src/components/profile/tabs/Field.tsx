import React from "react";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-medium text-zinc-400 block">{label}</label>
      {children}
    </div>
  );
}
