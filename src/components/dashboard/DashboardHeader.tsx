import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, LogOut, ExternalLink } from "lucide-react";
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

      {/* Profile Dropdown - Avatar Only */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center w-9 h-9 rounded-full bg-[#4A26ED] hover:bg-[#3a1ebd] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4A26ED]/30 focus:ring-offset-2">
            <span className="text-sm font-bold text-white">
              {getInitial()}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-white border-[#E8F2FB]">
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
