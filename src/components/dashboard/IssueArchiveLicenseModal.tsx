import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Handshake, Loader2, CheckCircle2, Copy, Download, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { format } from "date-fns";

interface IssueArchiveLicenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IssueArchiveLicenseModal({ open, onOpenChange, onSuccess }: IssueArchiveLicenseModalProps) {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  const [publisherPlan, setPublisherPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setPlanLoading(true);
    getAccessToken().then(token => {
      if (!token) { setPlanLoading(false); return; }
      fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
        .then(r => r.json())
        .then(result => {
          const pub = result.data?.publisher || result.data;
          setPublisherPlan(pub?.plan || "free");
        })
        .catch(() => setPublisherPlan("free"))
        .finally(() => setPlanLoading(false));
    });
  }, [open]);

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
        throw new Error(result.error || "Failed to issue enterprise deal");
      }

      setIssuedKey(result.data.license_key);
      onSuccess();
      toast({ title: "Enterprise deal issued!", description: `License key: ${result.data.license_key}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dateRangeDisplay = validFrom && validUntil
    ? `${format(new Date(validFrom + "T00:00:00"), "MMM d, yyyy")} → ${format(new Date(validUntil + "T00:00:00"), "MMM d, yyyy")}`
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideCloseButton className="max-w-md p-0 overflow-hidden">
        {planLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#4A26ED]" />
          </div>
        ) : publisherPlan === "free" ? (
          /* Upgrade wall */
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto">
              <Handshake size={28} className="text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-[#040042] text-lg">Pro Feature</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Enterprise deals are available on Pro and Enterprise plans. Upgrade to issue site-wide licenses.
              </p>
            </div>
            <a
              href="/pricing"
              className="block w-full py-2.5 rounded-lg text-sm font-semibold text-white text-center bg-[#4A26ED] hover:bg-[#3B1ED1] transition-colors"
            >
              View Pricing Plans
            </a>
            <button onClick={handleClose} className="text-sm text-slate-400 hover:text-slate-600 w-full">
              Maybe later
            </button>
          </div>
        ) : issuedKey ? (
          /* Success state */
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <h3 className="font-bold text-[#040042] text-lg">Deal Issued</h3>
              <p className="text-sm text-slate-500 mt-1">A confirmation email has been sent to {buyerEmail}.</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">License Key</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                <code className="text-sm font-mono text-[#040042] flex-1 break-all">{issuedKey}</code>
                <button onClick={handleCopyKey} className="text-slate-400 hover:text-[#4A26ED] transition-colors flex-shrink-0">
                  {copiedKey ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDownloadCertificate}
                variant="outline"
                className="flex-1 gap-2 border-slate-200 text-[#374151] hover:bg-slate-50 rounded-lg"
              >
                <Download size={15} />
                Certificate PDF
              </Button>
              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                className="flex-1 gap-2 border-slate-200 text-[#374151] hover:bg-slate-50 rounded-lg"
              >
                <ExternalLink size={15} />
                Invoice PDF
              </Button>
            </div>

            <Button onClick={handleClose} className="w-full bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg">
              Done
            </Button>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <Handshake size={20} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-[#040042] text-base">Issue Enterprise Deal</h2>
                  <p className="text-sm text-slate-500">Site-wide license covering all content in a date range.</p>
                </div>
              </div>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-6 space-y-4">
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
                  className="border-slate-200 bg-white rounded-lg"
                />
              </div>

              {/* Buyer Name + Organization */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="buyer-name" className="text-sm font-medium text-[#040042]">Buyer Name</Label>
                  <Input
                    id="buyer-name"
                    placeholder="Jane Smith"
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    className="border-slate-200 bg-white rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="buyer-org" className="text-sm font-medium text-[#040042]">Organization</Label>
                  <Input
                    id="buyer-org"
                    placeholder="Bloomberg LP"
                    value={buyerOrganization}
                    onChange={e => setBuyerOrganization(e.target.value)}
                    className="border-slate-200 bg-white rounded-lg"
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
                    className="border-slate-200 bg-white rounded-lg"
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
                    className="border-slate-200 bg-white rounded-lg"
                  />
                </div>
              </div>

              {/* Date range pill */}
              {dateRangeDisplay && (
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-center">
                  <span className="text-xs font-medium text-slate-500">{dateRangeDisplay}</span>
                </div>
              )}

              {/* License type toggle */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[#040042]">License Type</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLicenseType("human")}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                      licenseType === "human"
                        ? "bg-[#D1009A]/10 border border-[#D1009A]/30 text-[#D1009A]"
                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Human Republication
                  </button>
                  <button
                    type="button"
                    onClick={() => setLicenseType("ai")}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                      licenseType === "ai"
                        ? "bg-[#4A26ED]/10 border border-[#4A26ED]/30 text-[#4A26ED]"
                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
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
                    className="border-slate-200 bg-white pl-7 rounded-lg"
                  />
                </div>
                <p className="text-xs text-slate-400">Net-30 · Invoice PDF available after issuance</p>
              </div>

              {/* Intended use */}
              <div className="space-y-1.5 pb-4">
                <Label className="text-sm font-medium text-[#040042]">Intended Use</Label>
                <Select value={intendedUse} onValueChange={setIntendedUse}>
                  <SelectTrigger className="border-slate-200 bg-white rounded-lg">
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
            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 p-6 pt-4 border-t border-slate-100 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 border-slate-200 text-[#374151] hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg"
              >
                {isSubmitting ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Issuing...</>
                ) : (
                  <><Handshake size={16} className="mr-2" />Issue Deal</>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
