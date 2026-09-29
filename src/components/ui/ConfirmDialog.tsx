import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { dangerButtonClass, secondaryButtonClass } from "../../lib/styles";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <div className="p-6">
        <div className="flex gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 pt-1.5">{message}</p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className={secondaryButtonClass} disabled={busy}>
            Cancel
          </button>
          <button onClick={onConfirm} className={dangerButtonClass} disabled={busy}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
