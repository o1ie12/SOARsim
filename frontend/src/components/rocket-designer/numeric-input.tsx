/**
 * SOARSim Rocket Designer — Numeric Input
 *
 * Controlled numeric input with inline validation.
 * Displays error messages for impossible values.
 * All state updates happen inside useEffect to prevent
 * infinite re-renders during SSR / static generation.
 */

"use client";

import { useCallback, useState, useEffect, type ChangeEvent, type FocusEvent } from "react";
import { AlertTriangle } from "lucide-react";

interface NumericInputProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Optional custom validation message. */
  error?: string | null;
  onChange: (value: number) => void;
  /** Display precision (decimal places). 0 = integer. */
  precision?: number;
}

function fmt(v: number, p: number): string {
  return p <= 0 ? Math.round(v).toFixed(0) : v.toFixed(p);
}

export default function NumericInput({
  label,
  unit,
  value,
  min,
  max,
  step,
  error,
  onChange,
  precision = 1,
}: NumericInputProps) {
  const [localValue, setLocalValue] = useState<string>(fmt(value, precision));

  // Sync local display when the external value changes,
  // but only if the user isn't actively editing the field.
  useEffect(() => {
    const parsed = parseFloat(localValue);
    if (parsed !== value) {
      const isEditing =
        typeof document !== "undefined" &&
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement ===
          document.querySelector(`[aria-label="${label}"]`);
      if (!isEditing) {
        setLocalValue(fmt(value, precision));
      }
    }
  }, [value, precision]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setLocalValue(raw);

      const num = parseFloat(raw);
      if (!isNaN(num)) {
        const clamped = Math.min(max, Math.max(min, num));
        onChange(clamped);
      }
    },
    [min, max, onChange],
  );

  const handleBlur = useCallback(
    (_e: FocusEvent<HTMLInputElement>) => {
      const num = parseFloat(localValue);
      if (isNaN(num)) {
        setLocalValue(fmt(value, precision));
        return;
      }
      const clamped = Math.min(max, Math.max(min, num));
      onChange(clamped);
      setLocalValue(fmt(clamped, precision));
    },
    [localValue, min, max, onChange, precision, value],
  );

  const hasError = error !== null && error !== undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {fmt(value, precision)} {unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="number"
          value={localValue}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-label={label}
          aria-invalid={hasError}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums outline-none transition-colors
            ${hasError
              ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
              : "border-border focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            }
          `}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      {hasError && (
        <div className="flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
