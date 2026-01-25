import React from "react";

interface SparklineProps {
  value: number;
  className?: string;
}

export function Sparkline({ value, className = "" }: SparklineProps) {
  // Generate a simple trend based on the value
  const points = React.useMemo(() => {
    const basePoints = [0.3, 0.5, 0.4, 0.6, 0.5, 0.7, 0.6, 0.8];
    const scale = value > 0 ? 1 : 0.3;
    return basePoints.map((p, i) => ({
      x: (i / (basePoints.length - 1)) * 48,
      y: 16 - p * 14 * scale,
    }));
  }, [value]);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const isPositive = value > 0;

  return (
    <svg
      width="48"
      height="16"
      viewBox="0 0 48 16"
      fill="none"
      className={className}
    >
      <path
        d={pathD}
        stroke={isPositive ? "#10B981" : "#94A3B8"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
