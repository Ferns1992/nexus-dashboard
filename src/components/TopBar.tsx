import { KeyRound, LogOut, Moon, Plus, Settings, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { Role } from "../types";
import { iconButtonClass, secondaryButtonClass } from "../lib/styles";
import { AppLogo } from "./AppLogo";

interface Props {
  role: Role;
  onAddLink: () => void;
  onOpenSettings: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export function TopBar({
  role,
  onAddLink,
  onOpenSettings,
  onChangePassword,
  onLogout,
}: Props) {
  const { theme, toggleTheme } = useTheme();
  const canEdit = role === "admin" || role === "editor";

  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AppLogo />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-semibold tracking-tight truncate">
                  Nexus Dashboard
                </h1>
              </div>
            <span className="hidden sm:inline text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {ROLE_LABEL[role]}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {canEdit && (
              <button onClick={onAddLink} className={`${secondaryButtonClass} flex items-center gap-2`}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Link</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className={iconButtonClass}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={onChangePassword}
              className={iconButtonClass}
              title="Change password"
              aria-label="Change password"
            >
              <KeyRound className="w-5 h-5" />
            </button>

            {canEdit && (
              <button
                onClick={onOpenSettings}
                className={iconButtonClass}
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={onLogout}
              className={`${iconButtonClass} hover:text-red-400`}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
