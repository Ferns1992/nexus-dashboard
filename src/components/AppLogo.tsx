interface Props {
  size?: "sm" | "lg";
  className?: string;
}

const SIZES = {
  sm: "w-8 h-8 rounded-lg",
  lg: "w-12 h-12 rounded-2xl",
};

export function AppLogo({ size = "sm", className = "" }: Props) {
  return (
    <div
      className={`${SIZES[size]} ${className} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm`}
    >
      <img src="/icon.png" alt="" className="w-full h-full object-contain p-0.5" />
    </div>
  );
}
