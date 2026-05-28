import type { ReactNode } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  onClose: () => void;
  children: ReactNode;
  maxHeight?: string;
  /** Lock the sheet to an exact height so it doesn't resize when content shrinks. */
  fixedHeight?: string;
}

function resolveHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return (
    (document.querySelector(".phone-canvas") as HTMLElement | null) ??
    document.body
  );
}

export function BottomSheet({
  onClose,
  children,
  maxHeight = "88%",
  fixedHeight,
}: Props) {
  const [host] = useState<HTMLElement | null>(() => resolveHost());

  if (!host) return null;

  const content = (
    <>
      <button
        type="button"
        className="absolute inset-0 z-50 border-0 bg-black/40 p-0 animate-fade-up touch-none overscroll-none"
        aria-label="Close"
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
        onTouchStart={(e) => e.stopPropagation()}
        onWheel={(e) => e.preventDefault()}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-[51] flex max-h-[88%] flex-col overflow-hidden overscroll-contain border-t border-[var(--color-border-strong)] bg-[var(--color-bg)] animate-sheet-up"
        style={
          fixedHeight
            ? {
                height: fixedHeight,
                maxHeight: fixedHeight,
              }
            : { maxHeight }
        }
      >
        {children}
      </div>
    </>
  );

  return createPortal(content, host);
}
