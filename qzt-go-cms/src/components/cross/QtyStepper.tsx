"use client";

/** 数量步进器: min 下限保护, 无障碍标签可传字典文案。 */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 9999,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-lg border border-line"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="px-3 py-1.5 text-base leading-none text-muted transition hover:bg-raised hover:text-strong disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="decrease"
      >
        −
      </button>
      <span
        className="w-10 select-none text-center text-sm font-semibold text-strong"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="px-3 py-1.5 text-base leading-none text-muted transition hover:bg-raised hover:text-strong disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="increase"
      >
        +
      </button>
    </div>
  );
}
