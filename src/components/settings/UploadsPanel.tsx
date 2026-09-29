import { useCallback, useEffect, useState } from "react";
import { HardDriveDownload, RefreshCw, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { UploadFile } from "../../types";
import { formatBytes, formatRelativeTime } from "../../lib/format";
import { secondaryButtonClass } from "../../lib/styles";
import { useToast } from "../../context/ToastContext";

interface Props {
  onRequestDelete: (file: UploadFile) => void;
}

export function UploadsPanel({ onRequestDelete }: Props) {
  const { notify } = useToast();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFiles(await api.listUploads());
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not load uploads", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const total = files.reduce((sum, file) => sum + file.size, 0);
  const orphans = files.filter((file) => !file.inUse).length;

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h4 className="text-md font-medium flex items-center gap-2">
          <HardDriveDownload className="w-4 h-4" /> Uploads
        </h4>
        <button
          onClick={load}
          className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        {files.length} file{files.length === 1 ? "" : "s"} · {formatBytes(total)} used
        {orphans > 0 && ` · ${orphans} unused`}
      </p>

      {loading && files.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No uploads yet.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
            >
              <img
                src={`/uploads/${file.name}`}
                alt=""
                loading="lazy"
                className="w-8 h-8 rounded-md object-contain bg-white dark:bg-zinc-900 shrink-0"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).style.opacity = "0.2";
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {formatBytes(file.size)} · {formatRelativeTime(file.modified)}
                  {file.inUse && " · in use"}
                </p>
              </div>
              <button
                onClick={() => onRequestDelete(file)}
                disabled={file.inUse}
                className="shrink-0 p-1.5 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title={file.inUse ? "Still used by a link or category" : "Delete file"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {orphans > 0 && (
        <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-3">
          Unused files can be deleted to reclaim space. Files still referenced by a link or
          category are protected.
        </p>
      )}

      <button onClick={load} className={`${secondaryButtonClass} mt-4`} disabled={loading}>
        Refresh list
      </button>
    </section>
  );
}
