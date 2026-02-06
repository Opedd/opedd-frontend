import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Trash2, Image, Settings, DollarSign, RefreshCw, Loader2, AlertCircle, LayoutGrid, List, HelpCircle, FileText, Rss, CheckCircle, Clock, Wallet, ShieldCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RegistryView } from "./RegistryView";
import { OnboardingCards } from "./OnboardingCards";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkline } from "./Sparkline";
import { AssetSettingsModal } from "./AssetSettingsModal";
import { useToast } from "@/hooks/use-toast";
import { Asset } from "@/types/asset";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";

interface SmartLibraryTableProps {
  assets: Asset[];
  onDelete: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onVerify?: (id: string) => void;
  isLoading?: boolean;
  onAddClick?: () => void;
  onSyncClick?: () => void;
  onRegisterClick?: () => void;
  showPulse?: boolean;
  sourceLookup?: Record<string, string>;
}

// Demo mode removed - showing real data only

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
        tooltip: "Licensing is enabled. You can earn from human citations and AI model access.",
      };
    case "pending":
      return {
        label: "Pending",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        tooltip: "Awaiting review. Your asset will be active once verified.",
      };
    case "minted":
      return {
        label: "Minted",
        className: "bg-[#4A26ED]/10 text-[#4A26ED] border-[#4A26ED]/20",
        tooltip: "Registering your IP on the Story Protocol blockchain.",
      };
  }
};

export function SmartLibraryTable({ 
  assets, 
  onDelete, 
  onBulkDelete, 
  onVerify,
  isLoading = false,
  onAddClick,
  onSyncClick,
  onRegisterClick,
  showPulse = false,
  sourceLookup = {}
}: SmartLibraryTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { contentSources } = useAuthenticatedApi();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Bulk action dialogs
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Price form state
  const [bulkHumanPrice, setBulkHumanPrice] = useState("4.99");
  const [bulkAiPrice, setBulkAiPrice] = useState("49.99");
  
  // View mode state
  const [viewMode, setViewMode] = useState<"table" | "registry">("table");

  // Show empty state when no assets
  const hasNoAssets = !isLoading && assets.length === 0;
  const displayAssets = assets;

  const handleManageClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsSettingsOpen(true);
  };

  // Selection handlers
  const isAllSelected = displayAssets.length > 0 && selectedIds.size === displayAssets.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < displayAssets.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(displayAssets.map((a) => a.id)));
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

  // Handle verify ownership via Edge Function api-proxy
  // Uses source_id (mapped from publication_id in DB) to call verification endpoint
  const handleVerifyOwnership = async (asset: Asset) => {
    // source_id is mapped from publication_id in the DB
    const sourceId = asset.source_id;
    
    if (!sourceId) {
      toast({
        title: "Verification Not Available",
        description: "Only publication posts can be verified",
        variant: "destructive",
      });
      return;
    }

    setVerifyingId(asset.id);
    
    try {
      // Call the verify endpoint via authenticated API (token auto-injected)
      await contentSources.verify(sourceId);
      
      toast({
        title: "Verification Initiated",
        description: "We're checking your publication for the verification token",
      });
      
      // Call parent handler if provided to refresh the list
      onVerify?.(asset.id);
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Verification Failed",
        description: "Please ensure your verification token is visible on your publication",
        variant: "destructive",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#4A26ED]" />
      </div>
    );
  }

  return (
    <>
      {/* View Toggle Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "registry")} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-gray-100 border border-gray-200 p-1 rounded-xl">
            <TabsTrigger 
              value="table" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-[#040042]/60 transition-all gap-2"
            >
              <List size={16} />
              Library
            </TabsTrigger>
            <TabsTrigger 
              value="registry" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7C3AED] data-[state=active]:to-[#4A26ED] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#7C3AED]/20 rounded-lg px-4 py-2 text-sm font-medium text-[#040042]/60 transition-all gap-2"
            >
              <LayoutGrid size={16} />
              Registry View
            </TabsTrigger>
          </TabsList>

          {/* Asset count */}
          {!hasNoAssets && (
            <div className="flex items-center gap-2 text-[#040042]/50 text-sm">
              <span>{assets.length} asset{assets.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Onboarding Cards - Only show when no assets */}
        <TabsContent value="table" className="mt-0">
          {hasNoAssets && (
            <OnboardingCards 
              onSyncClick={() => {
                if (onSyncClick) {
                  onSyncClick();
                }
              }}
              onRegisterClick={() => {
                if (onRegisterClick) {
                  onRegisterClick();
                }
              }}
            />
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table>
          <TableHeader>
            <TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-50">
              {/* Select All Checkbox */}
              <TableHead className="w-12 pl-4">
                <Checkbox
                  checked={isAllSelected}
                  disabled={hasNoAssets}
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
                Title
              </TableHead>
              <TableHead className="text-[#040042]/60 text-xs font-medium">
                Source
              </TableHead>
              <TableHead className="text-[#040042]/60 text-xs font-medium">
                Format
              </TableHead>
              <TableHead className="text-[#040042]/60 text-xs font-medium">
                Status
              </TableHead>
              <TableHead className="text-[#040042]/60 text-xs font-medium">
                License Type
              </TableHead>
              <TableHead className="text-[#040042]/60 text-xs font-medium text-right">
                Revenue
              </TableHead>
              <TableHead className="w-36 text-[#040042]/60 text-xs font-medium text-center">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayAssets.map((asset) => {
              const statusConfig = getStatusConfig(asset.status);
              const isSelected = selectedIds.has(asset.id);
              
              return (
                <TableRow
                  key={asset.id}
                  data-selected={isSelected}
                  className={`group border-gray-100 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:shadow-sm ${
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
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <Image size={18} className="text-[#040042]/30" />
                      </div>
                      
                      {/* Asset Name with Shield + Demo Badge */}
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

                  {/* Source Column */}
                  <TableCell>
                    {asset.source_id && sourceLookup[asset.source_id] ? (
                      <span className="text-xs text-[#040042]/70 font-medium truncate max-w-[120px] block">
                        {sourceLookup[asset.source_id]}
                      </span>
                    ) : (
                      <span className="text-xs text-[#040042]/30 italic">Direct Upload</span>
                    )}
                  </TableCell>

                  {/* Format Column - Now checks source_id first */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {asset.source_id ? (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-[#4A26ED]/10 text-[#4A26ED] border-[#4A26ED]/20 gap-1">
                          <Rss size={10} />
                          Publication Post
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-teal-50 text-teal-700 border-teal-200 gap-1">
                          <FileText size={10} />
                          Single Work
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Verification Status Badge with Verify Button */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {asset.verification_status === "verified" ? (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                          <CheckCircle size={10} />
                          Verified
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200 gap-1">
                            <Clock size={10} />
                            Pending
                          </Badge>
                          {asset.source_id && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleVerifyOwnership(asset)}
                                    disabled={verifyingId === asset.id}
                                    className="px-2 py-1 rounded-md bg-[#4A26ED]/10 text-[#4A26ED] text-[10px] font-medium hover:bg-[#4A26ED] hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {verifyingId === asset.id ? (
                                      <Loader2 size={10} className="animate-spin" />
                                    ) : (
                                      <ShieldCheck size={10} />
                                    )}
                                    Verify
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[200px]">
                                  <p>Verify ownership by checking your publication for the verification token</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>

                  {/* License Type with badges */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {(asset.licenseType === "human" || asset.licenseType === "both") && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                          Human
                        </Badge>
                      )}
                      {(asset.licenseType === "ai" || asset.licenseType === "both") && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-[#4A26ED]/10 text-[#4A26ED] border-[#4A26ED]/20">
                          AI
                        </Badge>
                      )}
                    </div>
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

                  {/* Action Buttons */}
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleManageClick(asset)}
                        className="px-3 py-1.5 rounded-lg bg-[#4A26ED]/10 text-[#4A26ED] text-xs font-medium transition-all hover:bg-[#4A26ED] hover:text-white"
                      >
                        Share License
                      </button>
                      {/* View on Ledger - only show for assets with revenue */}
                      {asset.revenue > 0 && (
                        <button
                          onClick={() => navigate("/ledger")}
                          className="px-2 py-1.5 rounded-lg text-emerald-600 text-xs font-medium transition-all hover:bg-emerald-50 flex items-center gap-1"
                          title="View transactions"
                        >
                          <Wallet size={14} />
                        </button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                            <Settings size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-white border border-gray-200 shadow-xl rounded-lg min-w-[160px]"
                        >
                          <DropdownMenuItem
                            className="cursor-pointer text-[#040042] hover:bg-gray-100 focus:bg-gray-100 focus:text-[#040042]"
                            onClick={() => handleManageClick(asset)}
                          >
                            <Settings className="mr-2 h-4 w-4 text-[#4A26ED]" />
                            Asset Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 cursor-pointer hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                            onClick={() => onDelete(asset.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Registry View Tab */}
        <TabsContent value="registry" className="mt-0">
          <RegistryView 
            assets={displayAssets} 
            isLoading={isLoading} 
            isDemo={hasNoAssets} 
            onAddClick={onAddClick}
          />
        </TabsContent>
      </Tabs>
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
        <DialogContent className="bg-white border-gray-200 rounded-2xl">
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
        <AlertDialogContent className="bg-white border-gray-200 rounded-2xl">
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
