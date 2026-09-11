"use client";

/**
 * StudentProfileContext
 *
 * Provides site-wide access to the current student's preferences AND their
 * user session, eliminating duplicate /api/me calls across the app.
 *
 * Key behaviours:
 *  - Fetches /api/backend/me ONCE on app mount.
 *  - Exposes refreshProfile() so any component (e.g. the profile save form)
 *    can re-fetch and update the context immediately — without a full page
 *    refresh or F5.
 *  - Gracefully handles: unauthenticated, skipped profile, network errors.
 *  - profile = null  →  guest user OR student who skipped profile setup.
 *  - user   = null  →  unauthenticated.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { StudentProfile } from "@/types/student";
import type { AuthUser } from "@/lib/api/auth";

// ── Context State Shape ───────────────────────────────────────────────────────

interface StudentProfileState {
  /** The student's saved preferences. Null for guests / skipped profile. */
  profile: StudentProfile | null;
  /**
   * The authenticated user (id, name, role, etc.).
   * Null when not logged in. Same data as getCurrentUser() — free, same call.
   */
  user: AuthUser | null;
  /** True while the initial (or refreshed) fetch is in-flight. */
  loading: boolean;
  /**
   * Re-fetches /api/backend/me and updates both `user` and `profile`.
   * Call this immediately after saving/updating a student profile so the
   * personalization across the site reflects the new data without a page refresh.
   */
  refreshProfile: () => Promise<void>;
}

// ── Default Context Value (before provider mounts) ────────────────────────────

const noop = async () => {};

const StudentProfileContext = createContext<StudentProfileState>({
  profile: null,
  user: null,
  loading: true,
  refreshProfile: noop,
});

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current student's profile, authenticated user, loading state,
 * and a refreshProfile() function — all from one shared context.
 *
 * @example
 * const { profile, user, loading, refreshProfile } = useStudentProfile();
 * if (!profile) return null; // guest or no preferences
 */
export function useStudentProfile(): StudentProfileState {
  return useContext(StudentProfileContext);
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function StudentProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Core fetch function — wrapped in useCallback so it has a stable reference.
   * This means it can safely be used in useEffect deps and passed as a prop
   * without causing infinite re-render loops.
   */
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backend/me", {
        method: "GET",
        headers: { accept: "application/json" },
        credentials: "same-origin",
      });

      // 401 / 403 = unauthenticated — perfectly normal, clear both states
      if (!res.ok) {
        setProfile(null);
        setUser(null);
        return;
      }

      const data = (await res.json()) as {
        success: boolean;
        user?: AuthUser | null;
        studentProfile?: StudentProfile | null;
      };

      if (data?.success) {
        // Always store user if present (used by Dashboard, Header, etc.)
        setUser(data.user ?? null);
        // Profile is null if: not a student, or student skipped profile setup
        setProfile(data.studentProfile ?? null);
      } else {
        setProfile(null);
        setUser(null);
      }
    } catch {
      // Network error — fail gracefully, website continues working normally
      setProfile(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []); // stable — no external deps, safe to keep empty

  // Fetch once on app mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <StudentProfileContext.Provider
      value={{
        profile,
        user,
        loading,
        refreshProfile: fetchProfile, // exposed so profile/page.tsx can call it after save
      }}
    >
      {children}
    </StudentProfileContext.Provider>
  );
}
