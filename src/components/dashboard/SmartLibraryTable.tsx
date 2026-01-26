import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Trash2, Image, Settings, DollarSign, RefreshCw, Loader2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkline } from "./Sparkline";
import { AssetSettingsModal } from "./AssetSettingsModal";
import { useToast } from "@/hooks/use-toast";

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
  onBulkDelete?: (ids: string[]) => void;
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

export function SmartLibraryTable({ assets, onDelete, onBulkDelete }: SmartLibraryTableProps) {
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Bulk action dialogs
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Price form state
  const [bulkHumanPrice, setBulkHumanPrice] = useState("4.99");
  const [bulkAiPrice, setBulkAiPrice] = useState("49.99");

  const handleManageClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsSettingsOpen(true);
  };

  // Selection handlers
  const isAllSelected = assets.length > 0 && selectedIds.size === assets.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < assets.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(assets.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  // Bulk actions
  const handleBulkPriceUpdate = () => {
    toast({
      title: "Prices Updated",
      description: `Updated pricing for ${selectedIds.size} asset(s)`,
    });
    setIsPriceDialogOpen(false);
    setSelectedIds(new Set());
  };

  const handleBulkSync = async () => {
    setIsSyncing(true);
    // Simulate sync operation
    await new Promise((r) => setTimeout(r, 2500));
    setIsSyncing(false);
    toast({
      title: "Sync Complete",
      description: `${selectedIds.size} asset(s) synced to Story Protocol`,
    });
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (onBulkDelete) {
      onBulkDelete(Array.from(selectedIds));
    } else {
      // Fallback to individual deletes
      selectedIds.forEach((id) => onDelete(id));
    }
    toast({
      title: "Assets Deleted",
      description: `${selectedIds.size} asset(s) removed from your library`,
    });
    setIsDeleteDialogOpen(false);
    setSelectedIds(new Set());
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-[#E8F2FB] shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#E8F2FB] bg-[#F2F9FF]/50 hover:bg-[#F2F9FF]/50">
              {/* Select All Checkbox */}
              <TableHead className="w-12 pl-4">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = isSomeSelected;
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                  className="border-slate-300 data-[state=checked]:bg-[#4A26ED] data-[state=checked]:border-[#4A26ED]"
                />
              </TableHead>
              <TableHead className="text-[#040042]/60 text-xs font-medium">
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
              const isSelected = selectedIds.has(asset.id);
              return (
                <TableRow
                  key={asset.id}
                  data-selected={isSelected}
                  className={`group border-[#E8F2FB] rounded-lg transition-all duration-200 hover:bg-[#F8FAFF] hover:shadow-[0_0_0_1px_rgba(74,38,237,0.1),0_4px_12px_-4px_rgba(74,38,237,0.15)] ${
                    isSelected ? "bg-[#4A26ED]/5" : ""
                  }`}
                >
                  {/* Row Checkbox */}
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(asset.id, !!checked)}
                      className="border-slate-300 data-[state=checked]:bg-[#4A26ED] data-[state=checked]:border-[#4A26ED]"
                    />
                  </TableCell>

                  {/* Asset Identity with Icon Slot */}
                  <TableCell>
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
                          className="cursor-pointer focus:bg-slate-50"
                          onClick={() => handleManageClick(asset)}
                        >
                          <Settings className="mr-2 h-4 w-4 text-[#4A26ED]" />
                          Asset Settings
                        </DropdownMenuItem>
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

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#040042]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-[#040042]/40">
              {/* Selection count */}
              <div className="flex items-center gap-2 pr-3 border-r border-white/20">
                <div className="w-7 h-7 rounded-lg bg-[#4A26ED] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{selectedIds.size}</span>
                </div>
                <span className="text-white/80 text-sm font-medium">selected</span>
              </div>

              {/* Action buttons */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsPriceDialogOpen(true)}
                className="text-white hover:bg-white/10 hover:text-white gap-2 rounded-xl"
              >
                <DollarSign size={14} />
                Set Price
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleBulkSync}
                disabled={isSyncing}
                className="text-white hover:bg-white/10 hover:text-white gap-2 rounded-xl disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                {isSyncing ? "Syncing..." : "Sync to Story Protocol"}
              </Button>

              <div className="w-px h-6 bg-white/20" />

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-2 rounded-xl"
              >
                <Trash2 size={14} />
                Delete
              </Button>

              {/* Clear selection */}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-1 w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <span className="text-white/70 text-lg leading-none">&times;</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Price Dialog */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent className="bg-white border-[#E8F2FB] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#040042] font-bold">Set License Prices</DialogTitle>
            <DialogDescription className="text-[#040042]/60">
              Update pricing for {selectedIds.size} selected asset(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#040042] font-bold text-sm">Human Republication Fee</Label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  value={bulkHumanPrice}
                  onChange={(e) => setBulkHumanPrice(e.target.value)}
                  className="bg-slate-50 border-slate-200 h-12 rounded-xl pl-8 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#040042] font-bold text-sm">AI Ingestion Fee</Label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  value={bulkAiPrice}
                  onChange={(e) => setBulkAiPrice(e.target.value)}
                  className="bg-slate-50 border-slate-200 h-12 rounded-xl pl-8 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPriceDialogOpen(false)}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkPriceUpdate}
              className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white rounded-xl shadow-lg shadow-[#4A26ED]/20"
            >
              Update Prices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border-[#E8F2FB] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#040042] font-bold">Delete {selectedIds.size} Asset(s)?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#040042]/60">
              This action cannot be undone. The selected assets will be permanently removed from your library and unregistered from Story Protocol.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Delete Assets
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Asset Settings Modal */}
      <AssetSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        asset={selectedAsset}
      />
    </>
  );
}
