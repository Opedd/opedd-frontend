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
    <div className="bg-white border border-[#040042]/5 p-8 rounded-[2rem] shadow-lg hover:shadow-xl transition-shadow group">
      <p className="text-[#040042]/50 text-xs font-semibold mb-3 uppercase tracking-widest">
        {label}
      </p>
      <p
        className={`text-5xl font-bold ${getValueColor()} tracking-tight group-hover:scale-105 transition-transform origin-left`}
      >
        {value}
      </p>
    </div>
  );
}
