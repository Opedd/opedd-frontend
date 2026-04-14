import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldAlert, CheckCircle2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import SEO from "@/components/SEO";

type ClaimType = "copyright" | "trademark" | "other";

export default function Dmca() {
  useDocumentTitle("DMCA / Copyright Claim — Opedd");

  const [claimantName, setClaimantName] = useState("");
  const [claimantEmail, setClaimantEmail] = useState("");
  const [claimantOrg, setClaimantOrg] = useState("");
  const [claimantRole, setClaimantRole] = useState("copyright owner");
  const [claimType, setClaimType] = useState<ClaimType>("copyright");
  const [articleUrl, setArticleUrl] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([""]);
  const [swornStatement, setSwornStatement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addEvidenceUrl = () => setEvidenceUrls((urls) => [...urls, ""]);
  const removeEvidenceUrl = (i: number) => setEvidenceUrls((urls) => urls.filter((_, idx) => idx !== i));
  const updateEvidenceUrl = (i: number, v: string) => setEvidenceUrls((urls) => urls.map((u, idx) => idx === i ? v : u));

  const canSubmit =
    claimantName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimantEmail.trim()) &&
    articleUrl.trim().length > 0 &&
    description.trim().length >= 30 &&
    swornStatement &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/dmca-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
        body: JSON.stringify({
          claimant_name: claimantName.trim(),
          claimant_email: claimantEmail.trim().toLowerCase(),
          claimant_org: claimantOrg.trim() || undefined,
          claimant_role: claimantRole,
          claim_type: claimType,
          article_url: articleUrl.trim(),
          description: description.trim(),
          evidence_urls: evidenceUrls.map((u) => u.trim()).filter(Boolean),
          sworn_statement: swornStatement,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to submit claim");
      }
      setSubmitted(result.data?.claim_id || "submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again or email legal@opedd.com.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <SEO title="DMCA / Copyright Claim" description="Submit a copyright or trademark takedown notice to Opedd." path="/dmca" />

      <div className="px-6 py-5 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/"><img src={opeddLogoColor} alt="Opedd" className="h-7" /></Link>
          <Link to="/" className="text-sm text-[#6B7280] hover:text-[#111827]">Home →</Link>
        </div>
      </div>

      <div className="flex-1 px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-[#059669]" />
              </div>
              <h1 className="text-xl font-bold text-[#111827]">Claim received</h1>
              <p className="text-sm text-[#6B7280]">
                Our team will review your submission within 2 business days. A confirmation email has been sent to{" "}
                <span className="font-medium text-[#111827]">{claimantEmail}</span>.
              </p>
              <p className="text-xs text-[#9CA3AF]">
                Reference ID: <code className="bg-[#F3F4F6] px-2 py-1 rounded">{submitted}</code>
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-[#FEF2F2] flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-5 w-5 text-[#DC2626]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#111827]">Copyright / DMCA Claim</h1>
                  <p className="text-sm text-[#6B7280]">Report content you believe infringes your rights.</p>
                </div>
              </div>

              <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-4 mb-6 text-sm text-[#92400E]">
                <p className="font-medium mb-1">Before you file</p>
                <p>
                  Knowingly submitting a false claim carries legal consequences under DMCA §512(f). Only submit if you hold the rights (or are authorized to act on behalf of the rightsholder).
                </p>
              </div>

              <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Your full name *</Label>
                    <Input id="name" value={claimantName} onChange={(e) => setClaimantName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={claimantEmail} onChange={(e) => setClaimantEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="org">Organization</Label>
                    <Input id="org" value={claimantOrg} onChange={(e) => setClaimantOrg(e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <Label htmlFor="role">Your role *</Label>
                    <select
                      id="role"
                      value={claimantRole}
                      onChange={(e) => setClaimantRole(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="copyright owner">Copyright owner</option>
                      <option value="authorized agent">Authorized agent</option>
                      <option value="rightsholder representative">Rightsholder representative</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="claim_type">Claim type *</Label>
                  <select
                    id="claim_type"
                    value={claimType}
                    onChange={(e) => setClaimType(e.target.value as ClaimType)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="copyright">Copyright infringement (DMCA)</option>
                    <option value="trademark">Trademark infringement</option>
                    <option value="other">Other intellectual property claim</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="url">URL of the infringing content *</Label>
                  <Input id="url" type="url" value={articleUrl} onChange={(e) => setArticleUrl(e.target.value)} required placeholder="https://opedd.com/..." />
                  <p className="text-xs text-[#9CA3AF] mt-1">Paste the exact Opedd page or article URL.</p>
                </div>

                <div>
                  <Label htmlFor="description">Description of the infringement *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={5}
                    placeholder="Describe the original work, where it was first published, and how the content on Opedd infringes your rights."
                  />
                  <p className="text-xs text-[#9CA3AF] mt-1">{description.length}/5000 characters (minimum 30)</p>
                </div>

                <div>
                  <Label>Evidence (links to proof of ownership)</Label>
                  <div className="space-y-2">
                    {evidenceUrls.map((url, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          type="url"
                          value={url}
                          onChange={(e) => updateEvidenceUrl(i, e.target.value)}
                          placeholder="https://..."
                        />
                        {evidenceUrls.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeEvidenceUrl(i)}>
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                    ))}
                    {evidenceUrls.length < 10 && (
                      <Button type="button" variant="ghost" size="sm" onClick={addEvidenceUrl} className="text-[#4A26ED]">
                        <Plus size={14} className="mr-1" /> Add another link
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB] pt-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={swornStatement}
                      onCheckedChange={(v) => setSwornStatement(!!v)}
                      className="mt-1"
                    />
                    <span className="text-sm text-[#374151] leading-relaxed">
                      <strong>Sworn statement:</strong> I have a good faith belief that the use of the material described above is not authorized by the rightsholder, its agent, or the law. The information in this notification is accurate, and under penalty of perjury I am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3 text-sm text-[#DC2626]">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={!canSubmit} className="w-full h-11 bg-[#DC2626] hover:bg-[#B91C1C] text-white">
                  {submitting ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    "Submit claim"
                  )}
                </Button>

                <p className="text-xs text-[#9CA3AF] text-center">
                  For questions, email <a href="mailto:legal@opedd.com" className="text-[#4A26ED] hover:underline">legal@opedd.com</a>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
