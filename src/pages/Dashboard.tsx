import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Globe, LayoutGrid, Loader2, RefreshCw, SearchX } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api, ApiError } from "../lib/api";
import { matchesQuery } from "../lib/format";
import type { Category, Link, ManagedUser, UploadFile } from "../types";

import { TopBar } from "../components/TopBar";
import { CategoryFilter } from "../components/CategoryFilter";
import { SearchBar } from "../components/SearchBar";
import { LinkCard } from "../components/LinkCard";
import { LinkFormModal } from "../components/LinkFormModal";
import { ChangePasswordModal } from "../components/ChangePasswordModal";
import { SettingsModal } from "../components/settings/SettingsModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

type ConfirmTarget =
  | { kind: "link"; link: Link }
  | { kind: "category"; category: Category }
  | { kind: "user"; user: ManagedUser }
  | { kind: "upload"; file: UploadFile };

export function Dashboard() {
  const { user, logout } = useAuth();
  const { notify } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [active, setActive] = useState<number | "favorites" | null>(null);
  const [search, setSearch] = useState("");

  const [linkForm, setLinkForm] = useState<{ link: Link | null } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const canEdit = user?.role === "admin" || user?.role === "editor";

  const refresh = useCallback(async () => {
    try {
      setLoadError("");
      const [nextCategories, nextLinks] = await Promise.all([
        api.listCategories(),
        api.listLinks(),
      ]);
      setCategories(nextCategories);
      setLinks(nextLinks);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!confirm) setConfirmBusy(false);
  }, [confirm]);

  const visibleLinks = useMemo(() => {
    let result = links;

    if (active === "favorites") {
      result = result.filter((link) => link.is_favorite === 1);
    } else if (typeof active === "number") {
      result = result.filter((link) => link.category_id === active);
    }

    return result.filter((link) => matchesQuery(link, search));
  }, [links, active, search]);

  const handleToggleFavorite = async (link: Link) => {
    const nextValue = link.is_favorite === 1 ? 0 : 1;
    setLinks((prev) =>
      prev.map((item) => (item.id === link.id ? { ...item, is_favorite: nextValue } : item))
    );
    try {
      await api.updateLink(link.id, { is_favorite: nextValue === 1 });
    } catch (err) {
      setLinks((prev) =>
        prev.map((item) => (item.id === link.id ? { ...item, is_favorite: link.is_favorite } : item))
      );
      notify(err instanceof ApiError ? err.message : "Could not update favourite", "error");
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);

    try {
      if (confirm.kind === "link") {
        await api.deleteLink(confirm.link.id);
        notify("Link deleted", "success");
      } else if (confirm.kind === "category") {
        await api.deleteCategory(confirm.category.id);
        if (active === confirm.category.id) setActive(null);
        notify("Category deleted", "success");
      } else if (confirm.kind === "user") {
        await api.deleteUser(confirm.user.id);
        notify("User deleted", "success");
      } else {
        await api.deleteUpload(confirm.file.name);
        notify("File deleted", "success");
      }
      setConfirm(null);
      refresh();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Action failed", "error");
      setConfirmBusy(false);
    }
  };

  const confirmCopy = () => {
    if (!confirm) return { title: "", message: "" };
    if (confirm.kind === "link") {
      return {
        title: "Delete Link",
        message: `Delete "${confirm.link.title}"? This cannot be undone.`,
      };
    }
    if (confirm.kind === "category") {
      return {
        title: "Delete Category",
        message: `Delete "${confirm.category.name}"? Links in it will become uncategorised, not deleted.`,
      };
    }
    if (confirm.kind === "user") {
      return {
        title: "Delete User",
        message: `Delete "${confirm.user.username}"? They will lose access immediately.`,
      };
    }
    return {
      title: "Delete Upload",
      message: `Permanently delete "${confirm.file.name}"? This cannot be undone.`,
    };
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <TopBar
        role={user.role}
        onAddLink={() => setLinkForm({ link: null })}
        onOpenSettings={() => setShowSettings(true)}
        onChangePassword={() => setShowPassword(true)}
        onLogout={logout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loadError && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/50 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">{loadError}</p>
            <button
              onClick={refresh}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        <CategoryFilter categories={categories} active={active} onSelect={setActive} />

        <SearchBar
          value={search}
          onChange={setSearch}
          resultCount={visibleLinks.length}
          totalCount={links.length}
        />

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400 dark:text-zinc-600">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : visibleLinks.length === 0 ? (
          <div className="text-center py-20">
            {search ? (
              <>
                <SearchX className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                  No matches
                </h3>
                <p className="text-zinc-400 dark:text-zinc-500 mt-1">
                  Nothing matches "{search}".
                </p>
              </>
            ) : active === "favorites" ? (
              <>
                <LayoutGrid className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                  No favourites yet
                </h3>
                <p className="text-zinc-400 dark:text-zinc-500 mt-1">
                  Hover a link and tap the star to pin it here.
                </p>
              </>
            ) : (
              <>
                <Globe className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                  No links found
                </h3>
                <p className="text-zinc-400 dark:text-zinc-500 mt-1">
                  {canEdit
                    ? 'Add a new service with "Add Link" to get started.'
                    : "Nothing has been added here yet."}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {visibleLinks.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                canEdit={Boolean(canEdit)}
                onEdit={(target) => setLinkForm({ link: target })}
                onDelete={(target) => setConfirm({ kind: "link", link: target })}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </main>

      {linkForm && (
        <LinkFormModal
          link={linkForm.link}
          categories={categories}
          onClose={() => setLinkForm(null)}
          onSaved={refresh}
        />
      )}

      {showSettings && (
        <SettingsModal
          role={user.role}
          categories={categories}
          onClose={() => setShowSettings(false)}
          onDataChanged={refresh}
          onRequestDeleteCategory={(category) => setConfirm({ kind: "category", category })}
          onRequestDeleteUser={(managedUser) => setConfirm({ kind: "user", user: managedUser })}
          onRequestDeleteUpload={(file) => setConfirm({ kind: "upload", file })}
          onUsersChanged={refresh}
        />
      )}

      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}

      {confirm && (
        <ConfirmDialog
          title={confirmCopy().title}
          message={confirmCopy().message}
          busy={confirmBusy}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
