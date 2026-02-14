import { cls } from "../lib/format";

export default function Button({
  children,
  variant = "primary", // primary | secondary | danger
  size = "md", // md | sm
  disabled,
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold cursor-pointer" +
    "transition active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed " +
    "ring-1 ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20";

  const sizes = {
    md: "px-4 py-3 text-sm",
    sm: "px-3 py-2 text-xs rounded-lg",
  };

const variants = {
  primary:
    "text-white " +
    "bg-indigo-500/90 " +
    "hover:bg-indigo-400 " +
    "active:bg-indigo-500 " +
    "shadow-lg shadow-indigo-500/20 " +
    "ring-indigo-400/20",

  secondary:
    "text-slate-200 " +
    "bg-white/5 hover:bg-white/10 " +
    "shadow-sm shadow-black/30",

  danger:
    "text-rose-100 " +
    "bg-rose-500/15 hover:bg-rose-500/25 " +
    "ring-rose-500/20",
};

  return (
    <button
      disabled={disabled}
      className={ cls(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
