import React from "react";

interface SparklineProps {
  value: number;
  className?: string;
}

export function Sparkline({ value, className = "" }: SparklineProps) {
  const isPositive = value > 0;

  // Generate different trend patterns based on value
  const points = React.useMemo(() => {
    if (value <= 0) {
      // Flat gray line for $0 revenue
      return [
        { x: 0, y: 8 },
        { x: 8, y: 8 },
        { x: 16, y: 8 },
        { x: 24, y: 8 },
        { x: 32, y: 8 },
        { x: 40, y: 8 },
        { x: 48, y: 8 },
      ];
    } else {
      // Rising green line for positive revenue
      // Create a more dynamic upward trend
      const baseScale = Math.min(value / 100, 1); // Normalize to max 1
      return [
        { x: 0, y: 14 },
        { x: 8, y: 12 - baseScale * 2 },
        { x: 16, y: 10 - baseScale * 1 },
        { x: 24, y: 9 - baseScale * 2 },
        { x: 32, y: 7 - baseScale * 1 },
        { x: 40, y: 5 - baseScale * 2 },
        { x: 48, y: 3 },
      ];
    }
  }, [value]);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Create gradient fill path for positive values
  const fillPathD = isPositive
    ? `${pathD} L 48 16 L 0 16 Z`
    : "";

  return (
    <svg
      width="48"
      height="16"
      viewBox="0 0 48 16"
      fill="none"
      className={className}
    >
      {/* Gradient definition for positive sparklines */}
      {isPositive && (
        <defs>
          <linearGradient id={`sparkline-gradient-${value}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      
      {/* Fill area for positive values */}
      {isPositive && (
        <path
          d={fillPathD}
          fill={`url(#sparkline-gradient-${value})`}
        />
      )}
      
      {/* Main line */}
      <path
        d={pathD}
        stroke={isPositive ? "#10B981" : "#94A3B8"}
        strokeWidth={isPositive ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* End dot for positive values */}
      {isPositive && (
        <circle
          cx="48"
          cy="3"
          r="2"
          fill="#10B981"
        />
      )}
    </svg>
  );
}
