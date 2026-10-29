"use client";

let runtimeUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
let runtimeAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
let configFetchPromise: Promise<boolean> | null = null;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const SESSION_STORAGE_KEY = "cv_tailor_supabase_session";

export interface SupabaseUser {
  id: string;
  email?: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: SupabaseUser;
}

type AuthListener = (session: SupabaseSession | null) => void;
const listeners = new Set<AuthListener>();

export function isSupabaseConfigured(): boolean {
  return Boolean(runtimeUrl && runtimeAnonKey);
}

export async function ensureSupabaseConfigLoaded(): Promise<boolean> {
  if (runtimeUrl && runtimeAnonKey) return true;
  if (typeof window === "undefined") return false;
  if (configFetchPromise) return configFetchPromise;

  configFetchPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/config`);
      if (!res.ok) return false;
      const data = await res.json();
      if (data.enabled && data.supabase_url && data.supabase_anon_key) {
        runtimeUrl = String(data.supabase_url).replace(/\/+$/, "");
        runtimeAnonKey = String(data.supabase_anon_key).trim();
        notifyListeners(getStoredSession());
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      configFetchPromise = null;
    }
  })();

  return configFetchPromise;
}

function notifyListeners(session: SupabaseSession | null) {
  for (const listener of listeners) {
    listener(session);
  }
}

export function onAuthStateChange(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let cachedRawSession: string | null = null;
let cachedSessionObj: SupabaseSession | null = null;

export function getStoredSession(): SupabaseSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      cachedRawSession = null;
      cachedSessionObj = null;
      return null;
    }
    if (raw === cachedRawSession && cachedSessionObj) {
      return cachedSessionObj;
    }
    cachedRawSession = raw;
    cachedSessionObj = JSON.parse(raw) as SupabaseSession;
    return cachedSessionObj;
  } catch {
    return null;
  }
}

function saveSession(session: SupabaseSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    cachedRawSession = null;
    cachedSessionObj = null;
  } else {
    const raw = JSON.stringify(session);
    localStorage.setItem(SESSION_STORAGE_KEY, raw);
    cachedRawSession = raw;
    cachedSessionObj = session;
  }
  notifyListeners(session);
}

export async function consumeOAuthHashIfPresent(): Promise<SupabaseSession | null> {
  if (typeof window === "undefined") return null;
  await ensureSupabaseConfigLoaded();
  if (!isSupabaseConfigured()) return null;

  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token=")) return null;

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token") || "";
  const expiresIn = Number(params.get("expires_in") || "3600");

  if (!accessToken) return null;

  const res = await fetch(`${runtimeUrl}/auth/v1/user`, {
    headers: {
      apikey: runtimeAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) return null;
  const user = (await res.json()) as SupabaseUser;
  const session: SupabaseSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: { id: user.id, email: user.email },
  };
  saveSession(session);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return session;
}

async function refreshSession(refreshToken: string): Promise<SupabaseSession | null> {
  if (!refreshToken || !isSupabaseConfigured()) return null;
  try {
    const res = await fetch(`${runtimeUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: runtimeAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      saveSession(null);
      return null;
    }
    const data = await res.json();
    const session: SupabaseSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_at:
        data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
      user: {
        id: data.user?.id || "",
        email: data.user?.email,
      },
    };
    saveSession(session);
    return session;
  } catch {
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  await ensureSupabaseConfigLoaded();
  if (!isSupabaseConfigured()) return null;

  const fromHash = await consumeOAuthHashIfPresent();
  if (fromHash) return fromHash.access_token;

  const current = getStoredSession();
  if (!current) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (current.expires_at && current.expires_at - nowSec < 60 && current.refresh_token) {
    const refreshed = await refreshSession(current.refresh_token);
    return refreshed?.access_token ?? null;
  }

  return current.access_token;
}

function extractAuthError(data: Record<string, unknown>, status: number): string {
  if (typeof data.msg === "string" && data.msg) return data.msg;
  if (typeof data.error_description === "string" && data.error_description) {
    return data.error_description;
  }
  if (typeof data.message === "string" && data.message) return data.message;
  return `Error de autenticación (${status})`;
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<SupabaseSession> {
  await ensureSupabaseConfigLoaded();
  const res = await fetch(`${runtimeUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: runtimeAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractAuthError(data, res.status));
  }

  const session: SupabaseSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || "",
    expires_at:
      data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
    user: {
      id: data.user?.id || "",
      email: data.user?.email || email,
    },
  };
  saveSession(session);
  return session;
}

export async function signUpWithPassword(
  email: string,
  password: string
): Promise<{
  session: SupabaseSession | null;
  user: SupabaseUser | null;
  confirmationRequired: boolean;
}> {
  await ensureSupabaseConfigLoaded();
  const res = await fetch(`${runtimeUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: runtimeAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractAuthError(data, res.status));
  }

  if (data.access_token) {
    const session: SupabaseSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || "",
      expires_at:
        data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
      user: {
        id: data.user?.id || "",
        email: data.user?.email || email,
      },
    };
    saveSession(session);
    return { session, user: session.user, confirmationRequired: false };
  }

  const user: SupabaseUser | null = data.id
    ? { id: String(data.id), email: String(data.email || email) }
    : data.user?.id
      ? { id: String(data.user.id), email: String(data.user.email || email) }
      : null;

  return { session: null, user, confirmationRequired: true };
}

export async function signInWithOAuth(provider: "github" | "google"): Promise<void> {
  if (typeof window === "undefined") return;
  await ensureSupabaseConfigLoaded();
  if (!isSupabaseConfigured()) return;
  const redirectTo = `${window.location.origin}/login`;
  const url = `${runtimeUrl}/auth/v1/authorize?provider=${encodeURIComponent(
    provider
  )}&redirect_to=${encodeURIComponent(redirectTo)}`;
  window.location.replace(url);
}

export async function signOut(): Promise<void> {
  const current = getStoredSession();
  saveSession(null);
  if (current?.access_token && isSupabaseConfigured()) {
    try {
      await fetch(`${runtimeUrl}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: runtimeAnonKey,
          Authorization: `Bearer ${current.access_token}`,
        },
      });
    } catch {
      // Ignore network errors on logout
    }
  }
}
