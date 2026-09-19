import type { ReactNode } from "react";
import { Button } from "./Button";

export function ConfirmDialog({ open, title, description, confirmLabel, busy = false, onCancel, onConfirm }: { open: boolean; title: string; description: ReactNode; confirmLabel: string; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] flex items-end bg-land-ink/35 p-4 sm:items-center sm:justify-center" role="presentation">
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-2xl border border-land-border bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,.08),0_1px_4px_rgba(0,0,0,.06)]">
      <h2 id="confirm-title" className="text-xl font-semibold text-land-ink">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-land-body">{description}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button><Button onClick={onConfirm} loading={busy}>{confirmLabel}</Button></div>
    </div>
  </div>;
}
