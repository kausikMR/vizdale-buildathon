import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Card, ErrorNote, Loading, TempleArch } from "../components/ui";
import { messageFor, useAuth } from "../lib/auth";
import type { Role } from "../lib/types";

/** Mirrors the server's demo rule: "Temple Admin" → "temple-admin". */
const demoPasswordFor = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

/**
 * AUTH-01, simulated. The devotee picks which door they are coming through.
 *
 * Devotees sign in with a name alone; an unknown name registers them.
 * Temple staff always supply a password too: a name that already exists must
 * give that account's password, and a brand-new staff name registers a new
 * staff account using the password just typed — the same "unknown name signs
 * you up" pattern as the devotee door, just gated behind a password.
 *
 * Choosing "Temple staff" does not grant staff access — the server checks the
 * account's own role and its password (AUTH-02).
 */
export function SignIn() {
  const { user, accounts, loading, signIn } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("devotee");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (loading) return <Loading label="Loading…" />;
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/events"} replace />;

  const isAdmin = role === "admin";

  const switchRole = (next: Role) => {
    setRole(next);
    // Clear only the error and password — keep the typed name so switching
    // doors does not make them start over.
    setError(null);
    setPassword("");
  };

  const submit = async (chosenName: string, chosenPassword: string) => {
    if (pending) return; // duplicate-submit guard
    const trimmedName = chosenName.trim();

    if (!trimmedName) {
      setError("Please enter your name to continue.");
      return;
    }
    if (isAdmin && !chosenPassword.trim()) {
      setError("Please enter your staff password to continue.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const signedIn = await signIn({
        name: trimmedName,
        role,
        ...(isAdmin ? { password: chosenPassword.trim() } : {}),
      });
      navigate(signedIn.role === "admin" ? "/admin" : "/events", { replace: true });
    } catch (err) {
      // Keep everything typed so it can be corrected, not retyped.
      setError(messageFor(err));
    } finally {
      setPending(false);
    }
  };

  const quickPick = accounts.filter((a) => a.role === role);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="temple-pattern pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-md temple-rise-in">
        <div className="mb-6 text-center">
          <TempleArch className="h-14 w-28" />
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">Temple CRM</h1>
          <p className="mt-1 text-sm text-muted-foreground">Darshan booking and management</p>
        </div>

        <Card className="p-6">
          <p className="mb-4 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
            Simulated sign-in — for demonstration only.
          </p>

          {/* Role selector. Radios rather than buttons so it is announced as a
              single choice and works with arrow keys. */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">I am signing in as</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "devotee", label: "Devotee" },
                  { value: "admin", label: "Temple staff" },
                ] as Array<{ value: Role; label: string }>
              ).map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border
                    px-3 text-sm font-semibold transition focus-within:outline-2
                    focus-within:outline-offset-2 focus-within:outline-ring ${
                      role === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => switchRole(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(name, password);
            }}
            className="mt-5 space-y-4"
          >
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                {isAdmin ? "Staff name" : "Your name"}
              </label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby="name-hint"
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <p id="name-hint" className="mt-1.5 text-xs text-muted-foreground">
                {isAdmin
                  ? "An existing staff name needs its password below. A new name registers a new staff account with the password you set."
                  : "A new name is registered as a devotee automatically."}
              </p>
            </div>

            {isAdmin && (
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  Staff password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="password-hint"
                  className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                <p id="password-hint" className="mt-1.5 text-xs text-muted-foreground">
                  New staff name? Any password you type here becomes that
                  account's password. For the seeded demo accounts it's the
                  staff name in lowercase with hyphens
                  {name.trim() ? ` — for example, ${demoPasswordFor(name)}` : ""}.
                </p>
              </div>
            )}

            <ErrorNote message={error} />

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Signing in…" : "Continue"}
            </Button>
          </form>
        </Card>

        {quickPick.length > 0 && (
          <Card className="mt-4 p-6">
            <h2 className="text-sm font-semibold">
              {isAdmin ? "Demo staff accounts" : "Or continue as a demo devotee"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAdmin
                ? "Choosing one fills in the name and its demo password."
                : "One tap signs you straight in."}
            </p>

            <ul className="mt-3 flex flex-wrap gap-2">
              {quickPick.map((account) => (
                <li key={account.id}>
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => {
                      if (isAdmin) {
                        // Staff still go through the password field, so the
                        // gate stays visible rather than being bypassed.
                        setName(account.name);
                        setPassword(demoPasswordFor(account.name));
                        setError(null);
                      } else {
                        setName(account.name);
                        void submit(account.name, "");
                      }
                    }}
                  >
                    {account.name}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
