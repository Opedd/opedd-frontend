import React from "react";
import { Activity, Zap, DollarSign, FileText } from "lucide-react";

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
];

const getIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "mint":
      return <FileText size={16} className="text-[#4A26ED]" />;
    case "detection":
      return <Zap size={16} className="text-amber-500" />;
    case "royalty":
      return <DollarSign size={16} className="text-emerald-500" />;
    case "license":
      return <Activity size={16} className="text-[#D1009A]" />;
    default:
      return <Activity size={16} />;
  }
};

export function ActivityFeed() {
  return (
    <div className="bg-white border border-[#040042]/5 rounded-[2rem] p-6 shadow-lg">
      <h3 className="text-[#040042] font-semibold text-lg mb-4 flex items-center gap-2">
        <Activity size={20} className="text-[#4A26ED]" />
        Latest Activity
      </h3>
      <div className="space-y-4">
        {mockActivities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#F2F9FF] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#F2F9FF] flex items-center justify-center shrink-0">
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#040042] font-medium text-sm">{activity.title}</p>
              <p className="text-[#040042]/60 text-xs truncate">{activity.description}</p>
            </div>
            <span className="text-[#040042]/40 text-xs whitespace-nowrap">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
