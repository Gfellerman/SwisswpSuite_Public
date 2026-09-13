import React from "react";
import { cn } from "../../lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  className,
  label,
}) => {
  return (
    <label
      className={cn(
        "relative inline-flex cursor-pointer items-center",
        className
      )}
    >
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        className={`h-6 w-11 cursor-pointer rounded-full p-0.5 transition-colors duration-300 ${checked ? "bg-green-500" : "bg-red-500"}`}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && onChange(!checked)
        }
      >
        <div
          className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300"
          style={{
            transform: checked ? "translateX(1.25rem)" : "translateX(0)",
          }}
        />
      </div>
      {label && (
        <span className="dark:text-foreground ml-3 text-sm font-medium text-gray-900">
          {label}
        </span>
      )}
    </label>
  );
};
