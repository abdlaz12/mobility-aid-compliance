import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Icon } from "./Icon";

type Common = { label: string; hint?: string; error?: string };

const control =
  "min-h-11 w-full rounded-lg border bg-surface px-3 py-2.5 font-normal text-fg placeholder:text-muted";
const ring = (error?: string) => (error ? "border-emergency" : "border-border-strong");

function Wrap({ id, label, hint, error, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 text-sm font-semibold text-fg">
      <label htmlFor={id}>{label}</label>
      {children}
      {(hint || error) && (
        <p id={`${id}-note`} className={`flex items-start gap-1.5 text-xs font-medium ${error ? "text-emergency" : "text-muted"}`}>
          {error && <Icon name="close" size={14} />}
          {error || hint}
        </p>
      )}
    </div>
  );
}

// Errors are shown with an icon and text, never with colour alone.
export function Input({ label, hint, error, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <input id={id} aria-invalid={!!error} aria-describedby={hint || error ? `${id}-note` : undefined} className={`${control} ${ring(error)}`} {...rest} />
    </Wrap>
  );
}

export function PasswordInput({ label, hint, error, ...rest }: Common & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} aria-invalid={!!error} aria-describedby={hint || error ? `${id}-note` : undefined} className={`${control} ${ring(error)} pr-20`} {...rest} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="absolute inset-y-0 right-1 my-auto h-9 rounded-md px-3 text-xs font-bold text-primary hover:bg-surface-subtle">
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </Wrap>
  );
}

export function Select({ label, hint, error, options, placeholder = "Select an option", ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement> & { options: string[]; placeholder?: string }) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <select id={id} aria-invalid={!!error} className={`${control} ${ring(error)}`} defaultValue="" {...rest}>
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </Wrap>
  );
}

export function Textarea({ label, hint, error, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <textarea id={id} aria-invalid={!!error} className={`${control} ${ring(error)} min-h-22 resize-y`} {...rest} />
    </Wrap>
  );
}

export function Checkbox({ label, hint, ...rest }: { label: string; hint?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-start gap-3 text-sm">
      <input id={id} type="checkbox" className="mt-1 size-5 accent-[#0b695b]" aria-describedby={hint ? `${id}-note` : undefined} {...rest} />
      <label htmlFor={id} className="font-semibold text-fg">
        {label}
        {hint && <span id={`${id}-note`} className="block text-xs font-medium text-muted">{hint}</span>}
      </label>
    </div>
  );
}
