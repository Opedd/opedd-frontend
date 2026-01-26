import React from "react";
import { Bot, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { useAuth } from "@/contexts/AuthContext";

export default function Insights() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <div className="p-6 max-w-4xl w-full mx-auto space-y-6">
          {/* Page Title */}
          <div className="flex items-center gap-3">
            <Bot size={22} className="text-[#4A26ED]" />
            <h1 className="text-xl font-bold text-[#040042]">Insights</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="w-5 h-5 rounded-full bg-[#F2F9FF] flex items-center justify-center hover:bg-[#E8F2FB] transition-colors">
                    <HelpCircle size={12} className="text-[#040042]/50" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  <p>Monitor AI bot activity and licensing events across your content library in real-time.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Activity Feed - Full Width */}
          <div className="max-w-2xl">
            <ActivityFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
