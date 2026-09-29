import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Pencil, Trash2, User, X } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { ManagedUser, Role } from "../../types";
import { inputClass, labelClass, secondaryButtonClass } from "../../lib/styles";
import { useToast } from "../../context/ToastContext";

interface Props {
  users: ManagedUser[];
  onChanged: () => void;
  onRequestDelete: (user: ManagedUser) => void;
}

const ROLES: Role[] = ["admin", "editor", "viewer"];

export function UsersPanel({ users, onChanged, onRequestDelete }: Props) {
  const { notify } = useToast();
  const [draft, setDraft] = useState({ username: "", password: "", role: "viewer" as Role });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ password: "", role: "viewer" as Role });
  const [busy, setBusy] = useState(false);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createUser(draft.username, draft.password, draft.role);
      setDraft({ username: "", password: "", role: "viewer" });
      notify("User created", "success");
      onChanged();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not create user", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (id: number) => {
    if (!editDraft.password && editDraft.role === "viewer") return;
    setBusy(true);
    try {
      const changes: { password?: string; role?: string } = {};
      if (editDraft.password) changes.password = editDraft.password;
      if (editDraft.role) changes.role = editDraft.role;
      await api.updateUser(id, changes);
      setEditingId(null);
      notify("User updated", "success");
      onChanged();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not update user", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h4 className="text-md font-medium mb-4 flex items-center gap-2">
        <User className="w-4 h-4" /> User Management
      </h4>

      <div className="space-y-2 mb-6">
        {users.map((managedUser) => (
          <div
            key={managedUser.id}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
          >
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-medium shrink-0">
                  {managedUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{managedUser.username}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                    {managedUser.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {editingId === managedUser.id ? (
                  <>
                    <button
                      onClick={() => handleSave(managedUser.id)}
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
                      onClick={() => {
                        setEditingId(managedUser.id);
                        setEditDraft({ password: "", role: managedUser.role });
                      }}
                      className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      title="Edit user"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRequestDelete(managedUser)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      title={
                        users.length <= 1 ? "Cannot delete the last user" : "Delete user"
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingId === managedUser.id && (
              <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <input
                  type="password"
                  placeholder="New password (leave blank to keep)"
                  value={editDraft.password}
                  onChange={(event) => setEditDraft({ ...editDraft, password: event.target.value })}
                  className={inputClass}
                />
                <select
                  value={editDraft.role}
                  onChange={(event) => setEditDraft({ ...editDraft, role: event.target.value as Role })}
                  className={`${inputClass} sm:w-40`}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      <h5 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
        Create New User
      </h5>
      <form onSubmit={handleCreate} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Username</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9._\-]+"
              value={draft.username}
              onChange={(event) => setDraft({ ...draft, username: event.target.value })}
              className={inputClass}
              placeholder="jsmith"
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <select
              value={draft.role}
              onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}
              className={inputClass}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className={secondaryButtonClass} disabled={busy}>
          Create User
        </button>
      </form>
    </section>
  );
}
