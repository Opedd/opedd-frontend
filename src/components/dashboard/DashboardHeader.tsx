import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { User, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export function DashboardHeader() {
  const { user, logout } = useAuth();

  const getInitial = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-[#040042]/10 bg-white sticky top-0 z-20">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs font-semibold text-[#040042]/60 uppercase tracking-wider">
              Publisher Portal
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 px-4 py-2 bg-[#F2F9FF] rounded-full border border-[#040042]/10 hover:border-[#040042]/20 transition-all cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#4A26ED] to-[#D1009A] rounded-full flex items-center justify-center text-xs font-bold text-white">
              {getInitial()}
            </div>
            <span className="text-sm font-medium text-[#040042]/80 max-w-[150px] truncate">
              {user?.email}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-white border-[#040042]/10">
          <DropdownMenuLabel className="text-[#040042]">My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-[#040042]/80 hover:text-[#040042]">
            <User className="mr-2 h-4 w-4" />
            <span>Publisher Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer text-[#040042]/80 hover:text-[#040042]">
            <Settings className="mr-2 h-4 w-4" />
            <span>Account Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
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
