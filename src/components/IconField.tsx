import { useRef, useState } from "react";
import { Link2, Upload, X } from "lucide-react";
import { api } from "../lib/api";
import { inputClass, labelClass } from "../lib/styles";

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}

export function IconField({ label = "Icon", value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const result = await api.uploadFile(file);
      onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-2">
        {value && (
          <div className="shrink-0 w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-center overflow-hidden">
            <img
              src={value}
              alt=""
              className="w-5 h-5 object-contain"
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
          placeholder="https://... or upload"
        />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={inputRef}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 px-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          title="Upload icon"
        >
          <Upload className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 px-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-red-500/20 hover:text-red-500 rounded-xl transition-colors"
            title="Clear icon"
          >
            <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </button>
        )}
      </div>
      {uploading && <p className="text-xs text-zinc-500 mt-1">Uploading...</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {!value && !error && !uploading && (
        <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1 flex items-center gap-1">
          <Link2 className="w-3 h-3" /> Paste a URL or upload an image
        </p>
      )}
    </div>
  );
}
