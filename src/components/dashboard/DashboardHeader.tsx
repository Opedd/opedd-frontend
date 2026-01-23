import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { User, Settings, LogOut, Key, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#F2F9FF] transition-colors">
            <div className="w-7 h-7 bg-gradient-to-tr from-[#4A26ED] to-[#D1009A] rounded-lg flex items-center justify-center text-xs font-bold text-white">
              {getInitial()}
            </div>
            <span className="text-sm font-medium text-[#040042] max-w-[140px] truncate hidden sm:block">
              {user?.email}
            </span>
            <ChevronDown size={14} className="text-[#040042]/40" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-white border-[#E8F2FB]">
          <DropdownMenuLabel className="text-[#040042] text-xs font-medium uppercase tracking-wide">
            My Account
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#E8F2FB]" />
          <DropdownMenuItem asChild className="cursor-pointer text-[#040042]/70 hover:text-[#040042] text-sm">
            <Link to="/settings">
              <User className="mr-2 h-4 w-4" />
              <span>Publisher Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer text-[#040042]/70 hover:text-[#040042] text-sm">
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer text-[#040042]/70 hover:text-[#040042] text-sm">
            <Link to="/settings">
              <Key className="mr-2 h-4 w-4" />
              <span>Manage API Keys</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#E8F2FB]" />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
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
