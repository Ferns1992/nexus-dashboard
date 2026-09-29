import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
}

export function SearchBar({ value, onChange, resultCount, totalCount }: Props) {
  return (
    <div className="relative mb-6 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search links..."
        className="w-full pl-9 pr-9 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {value && (
        <p className="absolute -bottom-5 left-1 text-[11px] text-zinc-400 dark:text-zinc-600">
          {resultCount} of {totalCount} shown
        </p>
      )}
    </div>
  );
}
