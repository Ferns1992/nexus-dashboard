import { useState } from "react";
import type { FormEvent } from "react";
import { Check, LayoutGrid, Pencil, Trash2, X } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { Category } from "../../types";
import { inputClass, labelClass, secondaryButtonClass } from "../../lib/styles";
import { IconField } from "../IconField";
import { useToast } from "../../context/ToastContext";

interface Props {
  categories: Category[];
  onChanged: () => void;
  onRequestDelete: (category: Category) => void;
}

const emptyDraft = { name: "", color: "#4f46e5", icon: "" };

export function CategoriesPanel({ categories, onChanged, onRequestDelete }: Props) {
  const { notify } = useToast();
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createCategory(draft);
      setDraft(emptyDraft);
      notify("Category created", "success");
      onChanged();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not create category", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (id: number) => {
    if (!editDraft.name.trim()) return;
    setBusy(true);
    try {
      await api.updateCategory(id, editDraft);
      setEditingId(null);
      notify("Category updated", "success");
      onChanged();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not update category", "error");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditDraft({ name: category.name, color: category.color, icon: category.icon });
  };

  return (
    <section>
      <h4 className="text-md font-medium mb-4 flex items-center gap-2">
        <LayoutGrid className="w-4 h-4" /> Categories
      </h4>

      <form onSubmit={handleCreate} className="space-y-3 mb-5">
        <div className="flex gap-2">
          <input
            type="text"
            required
            maxLength={64}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            className={inputClass}
            placeholder="New category name"
          />
          <input
            type="color"
            value={draft.color}
            onChange={(event) => setDraft({ ...draft, color: event.target.value })}
            className="w-11 h-[38px] shrink-0 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer"
            title="Category colour"
          />
        </div>
        <IconField
          label="Category icon"
          value={draft.icon}
          onChange={(icon) => setDraft({ ...draft, icon })}
        />
        <button type="submit" className={secondaryButtonClass} disabled={busy}>
          Add Category
        </button>
      </form>

      <div className="space-y-2">
        {categories.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No categories yet.</p>
        )}

        {categories.map((category) => (
          <div
            key={category.id}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
          >
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {category.icon ? (
                  <img
                    src={category.icon}
                    alt=""
                    className="w-6 h-6 rounded-md object-contain shrink-0"
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                )}
                <span className="truncate">{category.name}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {editingId === category.id ? (
                  <>
                    <button
                      onClick={() => handleSave(category.id)}
                      className="p-1.5 text-emerald-600 hover:text-emerald-500 transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(category)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      title="Edit category"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRequestDelete(category)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingId === category.id && (
              <div className="space-y-3 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    maxLength={64}
                    value={editDraft.name}
                    onChange={(event) =>
                      setEditDraft({ ...editDraft, name: event.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Colour</label>
                  <input
                    type="color"
                    value={editDraft.color}
                    onChange={(event) =>
                      setEditDraft({ ...editDraft, color: event.target.value })
                    }
                    className="w-11 h-[38px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer"
                  />
                </div>
                <IconField
                  label="Icon"
                  value={editDraft.icon}
                  onChange={(icon) => setEditDraft({ ...editDraft, icon })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
