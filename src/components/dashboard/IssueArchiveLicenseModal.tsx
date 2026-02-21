import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Archive, Loader2, CheckCircle2, Copy, ExternalLink, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface IssueArchiveLicenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IssueArchiveLicenseModal({ open, onOpenChange, onSuccess }: IssueArchiveLicenseModalProps) {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerOrganization, setBuyerOrganization] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [licenseType, setLicenseType] = useState<"human" | "ai">("human");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      // Reset after close animation
      setTimeout(() => {
        setBuyerEmail("");
        setBuyerName("");
        setBuyerOrganization("");
        setValidFrom("");
        setValidUntil("");
        setLicenseType("human");
        setAgreedPrice("");
        setIntendedUse("");
        setIssuedKey(null);
        setCopiedKey(false);
      }, 300);
    }
  };

  const handleCopyKey = () => {
    if (issuedKey) {
      navigator.clipboard.writeText(issuedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleDownloadCertificate = () => {
    if (issuedKey) {
      window.open(
        `${EXT_SUPABASE_URL}/functions/v1/certificate?key=${encodeURIComponent(issuedKey)}`,
        "_blank"
      );
    }
  };

  const handleDownloadInvoice = () => {
    if (issuedKey) {
      window.open(
        `${EXT_SUPABASE_URL}/functions/v1/invoice?key=${encodeURIComponent(issuedKey)}`,
        "_blank"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerEmail || !validFrom || !validUntil || !agreedPrice) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const price = parseFloat(agreedPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Invalid price", description: "Agreed price must be a positive number.", variant: "destructive" });
      return;
    }

    if (new Date(validUntil) <= new Date(validFrom)) {
      toast({ title: "Invalid dates", description: "Coverage end date must be after start date.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast({ title: "Authentication error", description: "Please log in again.", variant: "destructive" });
        return;
      }

      const body: Record<string, unknown> = {
        license_type: "archive",
        buyer_email: buyerEmail,
        valid_from: validFrom,
        valid_until: validUntil,
        agreed_price: price,
        ...(buyerName ? { buyer_name: buyerName } : {}),
        ...(buyerOrganization ? { buyer_organization: buyerOrganization } : {}),
        ...(intendedUse ? { intended_use: intendedUse } : {}),
      };

      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/issue-license`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to issue archive license");
      }

      setIssuedKey(result.data.license_key);
      onSuccess();
      toast({ title: "Archive license issued!", description: `License key: ${result.data.license_key}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Archive size={20} className="text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-[#040042]">Issue Archive License</DialogTitle>
              <DialogDescription className="text-slate-500">
                Site-wide license covering all publisher content in a date range.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {issuedKey ? (
          /* Success state */
          <div className="space-y-5 py-2">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 text-center">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold text-emerald-800 text-lg">Archive License Issued!</p>
              <p className="text-emerald-600 text-sm mt-1">A confirmation email has been sent to {buyerEmail}.</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">License Key</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <code className="text-sm font-mono text-[#040042] flex-1">{issuedKey}</code>
                <button onClick={handleCopyKey} className="text-slate-400 hover:text-[#4A26ED] transition-colors flex-shrink-0">
                  {copiedKey ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDownloadCertificate}
                variant="outline"
                className="flex-1 gap-2 border-[#4A26ED]/20 text-[#4A26ED] hover:bg-[#4A26ED]/5"
              >
                <Download size={15} />
                Certificate
              </Button>
              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                className="flex-1 gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink size={15} />
                Invoice PDF
              </Button>
            </div>

            <Button onClick={handleClose} className="w-full bg-[#4A26ED] hover:bg-[#3B1ED1] text-white">
              Done
            </Button>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Buyer Email */}
            <div className="space-y-1.5">
              <Label htmlFor="buyer-email" className="text-sm font-medium text-[#040042]">
                Buyer Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="buyer-email"
                type="email"
                placeholder="finance@bloomberg.com"
                value={buyerEmail}
                onChange={e => setBuyerEmail(e.target.value)}
                required
                className="border-slate-200"
              />
            </div>

            {/* Buyer Name + Organization */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="buyer-name" className="text-sm font-medium text-[#040042]">
                  Buyer Name
                </Label>
                <Input
                  id="buyer-name"
                  placeholder="Jane Smith"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="buyer-org" className="text-sm font-medium text-[#040042]">
                  Organization
                </Label>
                <Input
                  id="buyer-org"
                  placeholder="Bloomberg LP"
                  value={buyerOrganization}
                  onChange={e => setBuyerOrganization(e.target.value)}
                  className="border-slate-200"
                />
              </div>
            </div>

            {/* Coverage dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="valid-from" className="text-sm font-medium text-[#040042]">
                  Coverage From <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="valid-from"
                  type="date"
                  value={validFrom}
                  onChange={e => setValidFrom(e.target.value)}
                  required
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid-until" className="text-sm font-medium text-[#040042]">
                  Coverage To <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="valid-until"
                  type="date"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  required
                  className="border-slate-200"
                />
              </div>
            </div>

            {/* License type */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#040042]">License Type</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLicenseType("human")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                    licenseType === "human"
                      ? "bg-[#D1009A]/10 border-[#D1009A]/30 text-[#D1009A]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Human Republication
                </button>
                <button
                  type="button"
                  onClick={() => setLicenseType("ai")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                    licenseType === "ai"
                      ? "bg-[#4A26ED]/10 border-[#4A26ED]/30 text-[#4A26ED]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  AI Training
                </button>
              </div>
            </div>

            {/* Agreed price */}
            <div className="space-y-1.5">
              <Label htmlFor="agreed-price" className="text-sm font-medium text-[#040042]">
                Agreed Price (USD) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                <Input
                  id="agreed-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="25000.00"
                  value={agreedPrice}
                  onChange={e => setAgreedPrice(e.target.value)}
                  required
                  className="border-slate-200 pl-7"
                />
              </div>
              <p className="text-xs text-slate-400">Net-30 payment terms apply. Invoice PDF available after issuance.</p>
            </div>

            {/* Intended use */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#040042]">Intended Use</Label>
              <Select value={intendedUse} onValueChange={setIntendedUse}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Select intended use (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Use</SelectItem>
                  <SelectItem value="editorial">Editorial Use</SelectItem>
                  <SelectItem value="commercial">Commercial Use</SelectItem>
                  <SelectItem value="ai_training">AI Training</SelectItem>
                  <SelectItem value="corporate">Corporate Use</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white"
              >
                {isSubmitting ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Issuing...</>
                ) : (
                  <><Archive size={16} className="mr-2" />Issue License</>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
