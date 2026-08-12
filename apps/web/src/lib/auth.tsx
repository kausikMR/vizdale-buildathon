import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getStoredUserId, messageFor, setStoredUserId } from "./api";
import type { KnownUser, Role, User } from "./types";

interface AuthValue {
  user: User | null;
  /** Seeded accounts offered as one-tap sign-in. */
  accounts: KnownUser[];
  /** True until we know whether a stored session is still valid. */
  loading: boolean;
  signIn: (input: { name: string; role: Role; password?: string }) => Promise<User>;
  signOut: () => void;
  updateProfile: (patch: { mobile?: string; email?: string }) => Promise<User>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * SIMULATED sign-in (AUTH-01). Name-only: a name matching a seeded user signs in
 * as that user, any other name creates a devotee on the spot. No password.
 *
 * The chosen user's id is kept in localStorage and sent as `x-user-id`. The
 * server still resolves the role itself, so this is convenience — not the
 * security boundary (AUTH-02).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<KnownUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      // The known-user list is public; the session check needs a stored id.
      try {
        const { users } = await api.get<{ users: KnownUser[] }>("/auth/known-users");
        if (!cancelled) setAccounts(users);
      } catch {
        // Sign-in still works by typing a name, so this is not fatal.
      }

      if (getStoredUserId()) {
        try {
          const { user: me } = await api.get<{ user: User }>("/auth/me");
          if (!cancelled) setUser(me);
        } catch {
          // Stale id (most likely an API restart cleared the store) — drop it.
          setStoredUserId(null);
        }
      }

      if (!cancelled) setLoading(false);
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async ({ name, role, password }: { name: string; role: Role; password?: string }) => {
      // Sign-in is the one call made without an identity, so it cannot use the
      // stored header: clear first so a stale id never rides along.
      setStoredUserId(null);
      const { user: signedIn } = await api.post<{ user: User }>("/auth/sign-in", {
        name,
        role,
        password,
      });
      setStoredUserId(signedIn.id);
      setUser(signedIn);
      return signedIn;
    },
    [],
  );

  const signOut = useCallback(() => {
    setStoredUserId(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: { mobile?: string; email?: string }) => {
    const { user: updated } = await api.patch<{ user: User }>("/auth/me", patch);
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      accounts,
      loading,
      signIn,
      signOut,
      updateProfile,
      isAdmin: user?.role === "admin",
    }),
    [user, accounts, loading, signIn, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

export { messageFor };
