import { useCallback, useEffect, useState } from "react";
import { HardDriveDownload, LayoutGrid, Users } from "lucide-react";
import { api } from "../lib/api";
import type { Category, ManagedUser, Role, UploadFile } from "../../types";
import { Modal } from "../ui/Modal";
import { CategoriesPanel } from "./CategoriesPanel";
import { UploadsPanel } from "./UploadsPanel";
import { UsersPanel } from "./UsersPanel";
import { useToast } from "../../context/ToastContext";

type Tab = "categories" | "uploads" | "users";

interface Props {
  role: Role;
  categories: Category[];
  onClose: () => void;
  onDataChanged: () => void;
  onRequestDeleteCategory: (category: Category) => void;
  onRequestDeleteUser: (user: ManagedUser) => void;
  onRequestDeleteUpload: (file: UploadFile) => void;
  onUsersChanged: () => void;
}

export function SettingsModal({
  role,
  categories,
  onClose,
  onDataChanged,
  onRequestDeleteCategory,
  onRequestDeleteUser,
  onRequestDeleteUpload,
  onUsersChanged,
}: Props) {
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>("categories");
  const [users, setUsers] = useState<ManagedUser[]>([]);

  const isAdmin = role === "admin";

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await api.listUsers());
    } catch {
      notify("Could not load users", "error");
    }
  }, [notify]);

  useEffect(() => {
    if (isAdmin && tab === "users") {
      loadUsers();
    }
  }, [tab, isAdmin, loadUsers]);

  const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
    { id: "categories", label: "Categories", icon: LayoutGrid },
    { id: "uploads", label: "Uploads", icon: HardDriveDownload },
    ...(isAdmin ? [{ id: "users" as Tab, label: "Users", icon: Users }] : []),
  ];

  return (
    <Modal title="Settings" onClose={onClose} size="lg">
      <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4">
        <div className="flex gap-1 -mb-px">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? "border-emerald-500 text-zinc-900 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {tab === "categories" && (
          <CategoriesPanel
            categories={categories}
            onChanged={onDataChanged}
            onRequestDelete={onRequestDeleteCategory}
          />
        )}

        {tab === "uploads" && <UploadsPanel onRequestDelete={onRequestDeleteUpload} />}

        {tab === "users" && isAdmin && (
          <UsersPanel
            users={users}
            onChanged={() => {
              loadUsers();
              onUsersChanged();
            }}
            onRequestDelete={onRequestDeleteUser}
          />
        )}
      </div>
    </Modal>
  );
}
