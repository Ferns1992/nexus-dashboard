import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Lock, LogIn, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { inputClass, primaryButtonClass } from "../lib/styles";
import { AppLogo } from "../components/AppLogo";

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <AppLogo size="lg" className="mx-auto" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nexus Dashboard</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Sign in to your dashboard
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl"
        >
          {error && (
            <div
              role="alert"
              className="p-3 text-sm rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600" />
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className={`${inputClass} pl-10`}
                placeholder="Username"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClass} pl-10`}
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button type="submit" className={`${primaryButtonClass} flex items-center justify-center gap-2`} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign in
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
          Protected by rate limiting. Too many failed attempts will lock you out temporarily.
        </p>
      </div>
    </div>
  );
}
