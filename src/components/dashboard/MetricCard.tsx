import React from "react";

interface MetricCardProps {
  label: string;
  value: string;
  accentColor?: "default" | "oxford" | "plum";
}

export function MetricCard({ label, value, accentColor = "default" }: MetricCardProps) {
  const getValueColor = () => {
    switch (accentColor) {
      case "oxford":
        return "text-[#4A26ED]";
      case "plum":
        return "text-[#D1009A]";
      default:
        return "text-[#040042]";
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-4 rounded-md transition-colors hover:border-gray-300">
      <p className="text-[#040042]/50 text-xs font-semibold mb-1 uppercase tracking-widest">
        {label}
      </p>
      <p
        className={`text-2xl font-semibold ${getValueColor()} tracking-tight`}
      >
        {value}
      </p>
    </div>
  );
}
