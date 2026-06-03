import {
  Check,
  LogOut,
  Moon,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Sun,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useNavStore } from "@/hooks/useNavStore";
import { useOperatorStore } from "@/hooks/useOperatorStore";
import { useTheme } from "@/hooks/useTheme";
import { signOut } from "@/lib/auth";

const NAME_MAX = 40;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isAdmin = useAdminStore((s) => s.isAdmin);
  const enableAdmin = useAdminStore((s) => s.enable);
  const disableAdmin = useAdminStore((s) => s.disable);
  const operatorName = useOperatorStore((s) => s.name);
  const setOperatorName = useOperatorStore((s) => s.setName);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  function resetPw() {
    setPwOpen(false);
    setPw("");
    setPwError(null);
  }
  function resetName() {
    setNameEditing(false);
    setNameDraft("");
    setNameError(null);
  }
  function startNameEdit() {
    setNameDraft(operatorName ?? "");
    setNameError(null);
    setNameEditing(true);
  }
  function saveName() {
    const next = nameDraft.trim();
    if (!next) {
      setNameError("Name is required");
      return;
    }
    if (next.length > NAME_MAX) {
      setNameError(`Name must be ${NAME_MAX} characters or fewer`);
      return;
    }
    setOperatorName(next);
    resetName();
  }
  function handleOpenChange(next: boolean) {
    if (!next) {
      resetPw();
      resetName();
    }
    onOpenChange(next);
  }
  function submitPw() {
    if (enableAdmin(pw)) {
      resetPw();
    } else {
      setPwError("Wrong password");
    }
  }
  function handleDisable() {
    disableAdmin();
    // Drop back to the user-facing Entry tab — admin tabs are now hidden.
    useNavStore.getState().setTab("entry");
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
      >
        <DialogHeader>
          <DialogTitle className="font-display">Settings</DialogTitle>
          <DialogDescription className="text-[var(--color-text-muted)]">
            Signed in. Manage appearance and access below.
          </DialogDescription>
        </DialogHeader>

        {/* Operator name (device-local) */}
        <div className="flex flex-col gap-2 border-t border-[var(--color-border)] py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow">YOUR NAME</div>
              <div className="text-sm">{operatorName ?? "Not set"}</div>
            </div>
            {!nameEditing && (
              <button
                type="button"
                onClick={startNameEdit}
                className="flex h-10 items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text)] active:bg-[var(--color-surface)]"
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
          </div>
          {nameEditing && (
            <div className="flex flex-col gap-2">
              <Input
                type="text"
                value={nameDraft}
                onChange={(e) => {
                  setNameDraft(e.target.value);
                  setNameError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                }}
                placeholder="Your name"
                className="h-11 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] shadow-none focus-visible:ring-0"
              />
              {nameError && (
                <span className="font-mono text-xs text-[var(--color-destructive)]">
                  {nameError}
                </span>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetName}
                  className="h-10 flex-1 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 text-sm font-semibold text-[var(--color-text)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveName}
                  className="flex h-10 flex-1 items-center justify-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-ink)]"
                >
                  <Check size={14} />
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] py-3">
          <div>
            <div className="eyebrow">THEME</div>
            <div className="text-sm">{theme === "dark" ? "Dark" : "Light"}</div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-10 w-10 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Admin mode */}
        <div className="flex flex-col gap-2 border-t border-b border-[var(--color-border)] py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow">ADMIN MODE</div>
              <div className="text-sm">{isAdmin ? "On" : "Off"}</div>
            </div>
            {isAdmin ? (
              <button
                type="button"
                onClick={handleDisable}
                className="flex h-10 items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text)] active:bg-[var(--color-surface)]"
              >
                <ShieldOff size={14} />
                Disable
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPwOpen((v) => !v);
                  setPw("");
                  setPwError(null);
                }}
                className="flex h-10 items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-accent-ink)] active:opacity-80"
              >
                <ShieldCheck size={14} />
                Enable
              </button>
            )}
          </div>

          {!isAdmin && pwOpen && (
            <div className="flex flex-col gap-2">
              <Input
                type="password"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setPwError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitPw();
                }}
                placeholder="Admin password"
                className="h-11 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] shadow-none focus-visible:ring-0"
              />
              {pwError && (
                <span className="font-mono text-xs text-[var(--color-destructive)]">
                  {pwError}
                </span>
              )}
              <button
                type="button"
                onClick={submitPw}
                className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-ink)]"
              >
                Unlock admin
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 text-sm font-semibold text-[var(--color-text)]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              handleOpenChange(false);
              void signOut();
            }}
            className="flex h-10 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-ink)]"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
