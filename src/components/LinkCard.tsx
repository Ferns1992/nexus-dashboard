import { useState } from "react";
import { Globe, Pencil, Star, Trash2 } from "lucide-react";
import type { Link } from "../types";
import { hostnameOf } from "../lib/format";

interface Props {
  link: Link;
  canEdit: boolean;
  onEdit: (link: Link) => void;
  onDelete: (link: Link) => void;
  onToggleFavorite: (link: Link) => void;
}

export function LinkCard({ link, canEdit, onEdit, onDelete, onToggleFavorite }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(link.icon) && !imageFailed;

  return (
    <div className="group relative">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        title={link.url}
        className="flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-2xl transition-all aspect-square"
      >
        <div className="w-12 h-12 mb-4 flex items-center justify-center">
          {showImage ? (
            <img
              src={link.icon}
              alt=""
              loading="lazy"
              className="w-12 h-12 rounded-xl object-contain"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
              <Globe className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
            </div>
          )}
        </div>

        <span className="text-sm font-medium text-center truncate w-full">{link.title}</span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-600 truncate w-full mt-0.5">
          {hostnameOf(link.url)}
        </span>
      </a>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {canEdit && (
          <>
            <button
              onClick={() => onToggleFavorite(link)}
              className={`p-1.5 bg-white/90 dark:bg-zinc-950/90 rounded-lg transition-colors ${
                link.is_favorite
                  ? "text-amber-500"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-amber-500"
              }`}
              title={link.is_favorite ? "Remove from favourites" : "Add to favourites"}
              aria-label={link.is_favorite ? "Remove from favourites" : "Add to favourites"}
            >
              <Star className="w-4 h-4" fill={link.is_favorite ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => onEdit(link)}
              className="p-1.5 bg-white/90 dark:bg-zinc-950/90 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-colors"
              title="Edit link"
              aria-label="Edit link"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(link)}
              className="p-1.5 bg-white/90 dark:bg-zinc-950/90 text-zinc-500 dark:text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
              title="Delete link"
              aria-label="Delete link"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {link.is_favorite === 1 && (
        <div className="absolute top-2 left-2 text-amber-500 pointer-events-none">
          <Star className="w-4 h-4" fill="currentColor" />
        </div>
      )}

      {link.category_name && (
        <div
          className="absolute bottom-2 right-2 w-2 h-2 rounded-full pointer-events-none"
          style={{ backgroundColor: link.category_color ?? "#4f46e5" }}
          title={link.category_name}
        />
      )}
    </div>
  );
}
