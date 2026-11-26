import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";

/** Uses the native <dialog>: focus is trapped inside it and Escape closes it. */
export function ConfirmDialog({ open, title, description, confirmLabel, danger = true, onConfirm, onCancel, children }: {
  open: boolean; title: string; description: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void; children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onCancel(); }}
      className="m-auto w-[min(92vw,460px)] rounded-xl border border-border bg-surface p-0 text-fg shadow-card backdrop:bg-black/50">
      <div className="grid gap-3 p-5">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
        {children}
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
