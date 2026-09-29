import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ApiError } from "../lib/api";
import { inputClass, labelClass, primaryButtonClass } from "../lib/styles";
import { Modal } from "./ui/Modal";

interface Props {
  onClose: () => void;
}

export function ChangePasswordModal({ onClose }: Props) {
  const { changePassword } = useAuth();
  const { notify } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from the current one");
      return;
    }

    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      notify("Password changed", "success");
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not change the password. Try again.";
      setError(message);
      notify(message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Change Password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <div className="p-3 text-sm rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Current password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>New password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">At least 8 characters.</p>
        </div>

        <div>
          <label className={labelClass}>Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="pt-2">
          <button type="submit" className={primaryButtonClass} disabled={busy}>
            {busy ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
