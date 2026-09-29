import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { Category, Link } from "../types";
import { inputClass, labelClass, primaryButtonClass } from "../lib/styles";
import { Modal } from "./ui/Modal";
import { IconField } from "./IconField";
import { useToast } from "../context/ToastContext";

interface Props {
  link: Link | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  title: string;
  url: string;
  icon: string;
  category_id: string;
}

const emptyForm: FormState = { title: "", url: "", icon: "", category_id: "" };

export function LinkFormModal({ link, categories, onClose, onSaved }: Props) {
  const { notify } = useToast();
  const editing = Boolean(link);

  const [form, setForm] = useState<FormState>(() =>
    link
      ? {
          title: link.title,
          url: link.url,
          icon: link.icon,
          category_id: link.category_id ? String(link.category_id) : "",
        }
      : emptyForm
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    const payload = {
      title: form.title,
      url: form.url,
      icon: form.icon,
      category_id: form.category_id ? parseInt(form.category_id, 10) : null,
    };

    try {
      if (link) {
        await api.updateLink(link.id, payload);
        notify("Link updated", "success");
      } else {
        await api.createLink(payload);
        notify("Link added", "success");
      }
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not save the link. Try again.";
      setError(message);
      notify(message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? "Edit Link" : "Add New Link"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <div className="p-3 text-sm rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Title</label>
          <input
            type="text"
            required
            maxLength={120}
            value={form.title}
            onChange={(event) => update({ title: event.target.value })}
            className={inputClass}
            placeholder="e.g. Plex"
          />
        </div>

        <div>
          <label className={labelClass}>URL</label>
          <input
            type="url"
            required
            value={form.url}
            onChange={(event) => update({ url: event.target.value })}
            className={inputClass}
            placeholder="https://..."
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">
            Must start with http:// or https://
          </p>
        </div>

        <IconField value={form.icon} onChange={(icon) => update({ icon })} />

        <div>
          <label className={labelClass}>Category</label>
          <select
            value={form.category_id}
            onChange={(event) => update({ category_id: event.target.value })}
            className={inputClass}
          >
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2">
          <button type="submit" className={primaryButtonClass} disabled={busy}>
            {busy ? "Saving..." : editing ? "Save Changes" : "Save Link"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
