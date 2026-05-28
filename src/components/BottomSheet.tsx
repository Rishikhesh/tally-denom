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
        className="absolute inset-0 z-50 border-0 bg-black/55 backdrop-blur-md p-0 animate-fade-up touch-none overscroll-none"
        aria-label="Close"
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
        onTouchStart={(e) => e.stopPropagation()}
        onWheel={(e) => e.preventDefault()}
      />
      <div
        className="absolute inset-x-3 bottom-3 z-[51] flex max-h-[88%] flex-col overflow-hidden overscroll-contain border border-[var(--color-border-strong)] bg-[var(--color-bg)] animate-sheet-up shadow-[0_-28px_72px_rgba(0,0,0,0.45),0_-8px_20px_rgba(0,0,0,0.25)]"
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
