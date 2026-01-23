import React from "react";
import { Activity, Zap, DollarSign, FileText, Circle } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "mint" | "detection" | "royalty" | "license";
  title: string;
  description: string;
  time: string;
}

const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "mint",
    title: "Asset Registered",
    description: "Your article was added to the registry",
    time: "Just now",
  },
  {
    id: "2",
    type: "detection",
    title: "AI Detection",
    description: "GPT-4 accessed your content",
    time: "2 min ago",
  },
  {
    id: "3",
    type: "royalty",
    title: "Royalty Earned",
    description: "$12.50 from AI licensing",
    time: "1 hour ago",
  },
  {
    id: "4",
    type: "license",
    title: "License Activated",
    description: "Human consumption license sold",
    time: "3 hours ago",
  },
];

const getStatusDot = (type: ActivityItem["type"]) => {
  switch (type) {
    case "mint":
      return <Circle size={8} className="fill-[#4A26ED] text-[#4A26ED]" />;
    case "detection":
      return <Circle size={8} className="fill-[#00D5FF] text-[#00D5FF]" />;
    case "royalty":
      return <Circle size={8} className="fill-emerald-500 text-emerald-500" />;
    case "license":
      return <Circle size={8} className="fill-[#D1009A] text-[#D1009A]" />;
    default:
      return <Circle size={8} className="fill-gray-400 text-gray-400" />;
  }
};

const getIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "mint":
      return <FileText size={14} className="text-[#4A26ED]" />;
    case "detection":
      return <Zap size={14} className="text-[#00D5FF]" />;
    case "royalty":
      return <DollarSign size={14} className="text-emerald-500" />;
    case "license":
      return <Activity size={14} className="text-[#D1009A]" />;
    default:
      return <Activity size={14} />;
  }
};

export function ActivityFeed() {
  return (
    <div className="bg-white border border-[#E8F2FB] rounded-xl shadow-sm">
      <div className="p-4 border-b border-[#E8F2FB]">
        <h3 className="text-[#040042] font-semibold text-sm flex items-center gap-2">
          <Activity size={16} className="text-[#4A26ED]" />
          Latest Activity
        </h3>
      </div>
      <div className="divide-y divide-[#E8F2FB]">
        {mockActivities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-4 hover:bg-[#F2F9FF]/50 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-[#F2F9FF] flex items-center justify-center shrink-0 mt-0.5">
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {getStatusDot(activity.type)}
                <p className="text-[#040042] font-medium text-sm">{activity.title}</p>
              </div>
              <p className="text-[#040042]/50 text-xs mt-0.5 truncate">{activity.description}</p>
            </div>
            <span className="text-[#040042]/30 text-xs whitespace-nowrap">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
