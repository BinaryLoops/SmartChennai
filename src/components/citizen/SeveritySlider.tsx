"use client";

import { useTranslations } from "next-intl";
import clsx from "clsx";

const SEVERITY_COLORS = [
  "bg-green-500",   // 1 - Minor
  "bg-lime-500",    // 2 - Low
  "bg-amber-500",   // 3 - Moderate
  "bg-orange-500",  // 4 - High
  "bg-red-500",     // 5 - Critical
];

const SEVERITY_KEYS = ["minor", "low", "moderate", "high", "critical"] as const;

interface SeveritySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function SeveritySlider({ value, onChange }: SeveritySliderProps) {
  const t = useTranslations("citizen.report");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">
          {t("severityLevel")}
        </label>
        <span className={clsx(
          "rounded-full px-3 py-0.5 text-xs font-semibold text-white",
          SEVERITY_COLORS[value - 1]
        )}>
          {value} — {t(SEVERITY_KEYS[value - 1])}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="severity-slider w-full cursor-pointer"
        />

        {/* Step labels */}
        <div className="mt-1 flex justify-between px-1">
          {SEVERITY_KEYS.map((key, i) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange(i + 1)}
              className={clsx(
                "text-xs transition-colors",
                value === i + 1 ? "font-medium text-text-primary" : "text-text-muted hover:text-text-secondary"
              )}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .severity-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(to right, #22C55E, #84CC16, #F59E0B, #F97316, #EF4444);
          outline: none;
        }
        .severity-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #22D3EE;
          cursor: pointer;
          box-shadow: 0 0 12px rgba(34, 211, 238, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: transform 0.15s ease;
        }
        .severity-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .severity-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #22D3EE;
          cursor: pointer;
          box-shadow: 0 0 12px rgba(34, 211, 238, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
