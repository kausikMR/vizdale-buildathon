import { useState } from "react";
import { Button, Card, ErrorNote, PageHeader } from "../components/ui";
import { messageFor, useAuth } from "../lib/auth";

export function Profile() {
  const { user, updateProfile } = useAuth();

  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  if (!user) return null;

  const save = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ mobile: mobile.trim(), email: email.trim() });
      setSaved(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageHeader title="Profile" subtitle="Your contact details for temple communications." />

      <Card className="max-w-xl p-6">
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium">Name:</dt>
            <dd className="text-muted-foreground">{user.name}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium">Role:</dt>
            <dd className="capitalize text-muted-foreground">
              {user.role === "admin" ? "Temple staff" : "Devotee"}
            </dd>
          </div>
        </dl>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div>
            <label htmlFor="mobile" className="mb-1.5 block text-sm font-medium">
              Mobile number
            </label>
            <input
              id="mobile"
              type="tel"
              autoComplete="tel"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setSaved(false);
              }}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSaved(false);
              }}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>

          <ErrorNote message={error} />

          {saved && (
            <p role="status" className="text-sm font-medium text-primary">
              Your details were saved.
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save details"}
          </Button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground">
          Demo build — details are stored for this session only, and no identity
          documents are collected.
        </p>
      </Card>
    </>
  );
}
