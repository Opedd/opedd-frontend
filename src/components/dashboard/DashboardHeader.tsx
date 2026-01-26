import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, LogOut, ExternalLink, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const getInitial = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[#E8F2FB] bg-white sticky top-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[#040042]/40 uppercase tracking-wider">
          Publisher Portal
        </span>
      </div>

      {/* Profile Dropdown - Avatar + Chevron */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 px-1 py-1 rounded-full hover:bg-[#F2F9FF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4A26ED]/20 focus:ring-offset-2 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#4A26ED] group-hover:bg-[#3a1ebd] transition-colors">
              <span className="text-sm font-bold text-white">
                {getInitial()}
              </span>
            </div>
            <ChevronDown 
              size={14} 
              className={`text-slate-400 group-hover:text-[#040042] transition-all duration-200 ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-white border-[#E8F2FB] shadow-lg">
          <DropdownMenuItem asChild className="cursor-pointer text-[#040042] hover:text-[#040042] text-sm py-2.5">
            <Link to="/settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer text-[#040042] hover:text-[#040042] text-sm py-2.5">
            <a href="https://docs.opedd.io" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <ExternalLink className="mr-2 h-4 w-4" />
              <span>Documentation</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#E8F2FB]" />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 text-sm py-2.5"
            onClick={() => logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
