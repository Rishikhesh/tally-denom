import { UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useOperatorStore } from "@/hooks/useOperatorStore";

const NAME_MAX = 40;

export default function NameGateScreen() {
  const setName = useOperatorStore((s) => s.setName);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const name = draft.trim();
    if (!name) {
      setError("Name is required");
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    if (name.length > NAME_MAX) {
      setError(`Name must be ${NAME_MAX} characters or fewer`);
      return;
    }
    setName(name);
  }

  return (
    <div className="flex h-full flex-col justify-center px-6">
      <div className="flex flex-col gap-1">
        <span className="flex h-12 w-12 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]">
          <UserRound size={22} />
        </span>
        <h1 className="mt-4 font-display text-2xl">Who's on this device?</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          This name tags everything you create so others can see who entered it.
          Stored on this device only — set your own here.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <span className="eyebrow">YOUR NAME</span>
        <Input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="e.g. Thiru"
          className="h-12 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] shadow-none focus-visible:ring-0"
        />
        {error && (
          <span className="font-mono text-xs text-[var(--color-destructive)]">
            {error}
          </span>
        )}
        <button
          type="button"
          onClick={submit}
          className="mt-2 h-12 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent-ink)] active:opacity-80"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
