import { LayoutGrid, Star } from "lucide-react";
import type { Category } from "../types";

interface Props {
  categories: Category[];
  active: number | "favorites" | null;
  onSelect: (value: number | "favorites" | null) => void;
}

const base =
  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0";

const activeClass = "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900";
const idleClass =
  "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800";

export function CategoryFilter({ categories, active, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
      <button
        onClick={() => onSelect(null)}
        className={`${base} ${active === null ? activeClass : idleClass}`}
      >
        <LayoutGrid className="w-4 h-4" /> All Services
      </button>

      <button
        onClick={() => onSelect("favorites")}
        className={`${base} ${active === "favorites" ? activeClass : idleClass}`}
      >
        <Star className="w-4 h-4" fill={active === "favorites" ? "currentColor" : "none"} />
        Favourites
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`${base} ${active === category.id ? activeClass : idleClass}`}
        >
          {category.icon ? (
            <img
              src={category.icon}
              alt=""
              className="w-4 h-4 rounded-sm object-cover"
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
          )}
          {category.name}
        </button>
      ))}
    </div>
  );
}
