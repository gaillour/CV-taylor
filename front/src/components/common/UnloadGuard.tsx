"use client";

import { useEffect } from "react";
import { useCvStore } from "@/store/useCvStore";
import { useProfileStore } from "@/store/useProfileStore";

export function UnloadGuard() {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isCvDirty = Boolean(useCvStore.getState().dirty);
      const isProfileDirty = Boolean(useProfileStore.getState().dirty);

      if (isCvDirty || isProfileDirty) {
        if (isCvDirty) {
          sessionStorage.setItem("cv_discard_pending", "true");
        }
        // Estándar W3C y compatibilidad completa con Chromium / WebKit / Gecko
        e.preventDefault();
        const msg = "Tenés cambios sin guardar. ¿Seguro que querés salir?";
        e.returnValue = msg;
        return msg;
      }
    };

    const handleWindowFocus = () => {
      sessionStorage.removeItem("cv_discard_pending");
    };

    window.addEventListener("beforeunload", handleBeforeUnload, { capture: true });
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload, { capture: true });
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  return null;
}
