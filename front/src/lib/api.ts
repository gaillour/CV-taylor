"use client";

import {
  API_BASE_URL,
  ensureSupabaseConfigLoaded,
  getValidAccessToken,
  isSupabaseConfigured,
} from "@/lib/supabase";

export { API_BASE_URL };

export async function apiFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_BASE_URL}${pathOrUrl}`;
  const headers = new Headers(init?.headers);

  await ensureSupabaseConfigLoaded();

  if (isSupabaseConfigured()) {
    const token = await getValidAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (
    res.status === 401 &&
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.replace("/login");
  }

  return res;
}
