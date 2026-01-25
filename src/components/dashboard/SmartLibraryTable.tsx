import React from "react";
import { Shield, MoreHorizontal, Trash2, Image } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "./Sparkline";

interface Asset {
  id: string;
  title: string;
  licenseType: "human" | "ai" | "both";
  status: "active" | "pending" | "minted";
  revenue: number;
  createdAt: string;
}

interface SmartLibraryTableProps {
  assets: Asset[];
  onDelete: (id: string) => void;
}

const getLicenseLabel = (type: Asset["licenseType"]) => {
  switch (type) {
    case "human":
      return "Human";
    case "ai":
      return "AI";
    case "both":
      return "Human + AI";
  }
};

const getStatusConfig = (status: Asset["status"]) => {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "pending":
      return {
        label: "Pending",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "minted":
      return {
        label: "Minted",
        className: "bg-[#4A26ED]/10 text-[#4A26ED] border-[#4A26ED]/20",
      };
  }
};

export function SmartLibraryTable({ assets, onDelete }: SmartLibraryTableProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E8F2FB] shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-[#E8F2FB] bg-[#F2F9FF]/50 hover:bg-[#F2F9FF]/50">
            <TableHead className="text-[#040042]/60 text-xs font-medium pl-5">
              Asset
            </TableHead>
            <TableHead className="text-[#040042]/60 text-xs font-medium">
              License
            </TableHead>
            <TableHead className="text-[#040042]/60 text-xs font-medium">
              Status
            </TableHead>
            <TableHead className="text-[#040042]/60 text-xs font-medium text-right">
              Revenue
            </TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => {
            const statusConfig = getStatusConfig(asset.status);
            return (
              <TableRow
                key={asset.id}
                className="group border-[#E8F2FB] rounded-lg transition-all duration-200 hover:bg-[#F8FAFF] hover:shadow-[0_0_0_1px_rgba(74,38,237,0.1),0_4px_12px_-4px_rgba(74,38,237,0.15)]"
              >
                {/* Asset Identity with Icon Slot */}
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    {/* Placeholder Icon Slot */}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F2F9FF] to-[#E8F2FB] border border-[#E8F2FB] flex items-center justify-center flex-shrink-0">
                      <Image size={18} className="text-[#040042]/30" />
                    </div>
                    
                    {/* Asset Name with Shield */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#040042] text-sm">
                        {asset.title}
                      </span>
                      {asset.status === "active" && (
                        <Shield
                          size={14}
                          className="text-[#4A26ED] fill-[#4A26ED]/10"
                        />
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* License Type */}
                <TableCell>
                  <span className="text-xs font-medium text-[#040042]/70">
                    {getLicenseLabel(asset.licenseType)}
                  </span>
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusConfig.className}`}
                  >
                    {statusConfig.label}
                  </Badge>
                </TableCell>

                {/* Revenue with Sparkline */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Sparkline value={asset.revenue} />
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        asset.revenue > 0
                          ? "text-[#D1009A]"
                          : "text-[#040042]/40"
                      }`}
                    >
                      ${asset.revenue.toFixed(2)}
                    </span>
                  </div>
                </TableCell>

                {/* Action Menu - Manage Button on Hover */}
                <TableCell className="pr-5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-[#040042] text-white text-xs font-medium transition-all duration-200 hover:bg-[#0A0066] active:scale-[0.98]">
                        Manage
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-white border-[#E8F2FB] shadow-lg"
                    >
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                        onClick={() => onDelete(asset.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
