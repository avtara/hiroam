"use client";

import { cn } from "@/lib/utils";

interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleButtonsProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ToggleButtons({
  options,
  value,
  onChange,
  className,
}: ToggleButtonsProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0 bg-gray-100 rounded-full p-1",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-medium transition-all",
            value === option.value
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
