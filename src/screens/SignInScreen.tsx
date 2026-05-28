import { useState } from "react";
import { Loader } from "@/components";
import { signInWithGoogle } from "@/lib/auth";

/**
 * Unauthenticated landing screen. Single brutalist sign-in screen rendered
 * inside the phone-canvas while `useAuth().user === null`.
 */
export default function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <span
          aria-hidden
          className="flex h-[72px] w-[72px] items-center justify-center rounded-[16px] border border-[var(--color-border-strong)] bg-[#0a0a0a] font-display text-5xl leading-none text-white"
        >
          =
        </span>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="eyebrow">00 / SIGN IN</div>
          <p className="font-display text-[24px] leading-tight">
            A personal cash ledger.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          aria-busy={busy}
          className="flex w-full items-center justify-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] py-3.5 text-[15px] font-semibold text-[var(--color-accent-ink)] disabled:opacity-70"
        >
          {busy ? (
            <Loader inline delayMs={0} />
          ) : (
            <span>Sign in with Google</span>
          )}
        </button>
        {error && (
          <p
            role="alert"
            className="eyebrow text-center"
            style={{ color: "var(--color-destructive)" }}
          >
            {error}
          </p>
        )}
        <div className="eyebrow mt-2 text-center">
          Tally · v<span className="mono">{__APP_VERSION__}</span>
        </div>
      </div>
    </div>
  );
}
