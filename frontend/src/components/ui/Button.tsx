import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "default" | "large";
  loading?: boolean;
};

// 44 px by default and 52 px large: the touch target minimum from the Foundations page.
const variants = {
  primary: "border-transparent bg-[#0b695b] text-white hover:enabled:bg-[#085347]",
  secondary: "border-border-strong bg-surface text-fg hover:enabled:bg-surface-subtle",
  danger: "border-transparent bg-[#ad2831] text-white hover:enabled:bg-[#8f1f27]",
};

export function Button({ variant = "primary", size = "default", loading, disabled, className = "", children, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-disabled-text ${
        size === "large" ? "min-h-[52px] px-5" : "min-h-11"
      } ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}
