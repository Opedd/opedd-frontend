import React, { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_REST, EXT_ANON_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import substackLogo from "@/assets/platforms/substack.svg";

interface SubstackImportCardProps {
  onImportComplete?: () => void;
}

export function SubstackImportCard({ onImportComplete }: SubstackImportCardProps) {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; note?: string } | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${EXT_SUPABASE_REST}/functions/v1/substack-upload`, {
        method: "POST",
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || "Upload failed");
      setResult({ imported: json.imported ?? 0, skipped: json.skipped ?? 0, note: json.note });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onImportComplete?.();
    } catch (err: any) {
      toast({
        title: "Import failed",
        description: err?.message || "Could not upload CSV.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#FF6719]/10 flex items-center justify-center flex-shrink-0">
          <img src={substackLogo} alt="Substack" className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#040042]">Import from Substack</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Upload your Substack <code className="font-mono text-[10px] bg-[#F3F4F6] px-1 py-0.5 rounded">posts.csv</code> export to import your article catalog.
          </p>
        </div>
      </div>

      {/* Collapsible instructions */}
      <button
        onClick={() => setInstructionsOpen(!instructionsOpen)}
        className="flex items-center gap-1.5 text-xs font-medium text-[#4A26ED] hover:text-[#3B1ED1] mb-3 transition-colors"
      >
        {instructionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        How to get your CSV
      </button>
      {instructionsOpen && (
        <div className="bg-[#F9FAFB] rounded-lg p-3 mb-3 space-y-1.5">
          <ol className="text-xs text-[#374151] space-y-1 list-decimal list-inside">
            <li>Go to <span className="font-medium">substack.com → Settings → Export data</span></li>
            <li>Download the ZIP file</li>
            <li>Open the ZIP and find <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-[#E5E7EB]">posts.csv</code></li>
            <li>Upload it here</li>
          </ol>
        </div>
      )}

      {/* Success banner */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
            <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
            ✓ {result.imported} article{result.imported !== 1 ? "s" : ""} imported, {result.skipped} skipped.
          </div>
          {result.note && (
            <p className="text-xs text-emerald-600 mt-1 ml-6">{result.note}</p>
          )}
        </div>
      )}

      {/* File picker + Import button */}
      <div className="flex items-center gap-3">
        <label className="flex-1 relative">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex items-center gap-2 h-10 px-3 border border-[#E5E7EB] rounded-lg bg-white text-sm text-[#6B7280] cursor-pointer hover:border-[#4A26ED]/30 transition-colors">
            <Upload size={14} className="flex-shrink-0" />
            <span className="truncate">{file ? file.name : "Choose posts.csv"}</span>
          </div>
        </label>
        <Button
          onClick={handleImport}
          disabled={!file || uploading}
          className="h-10 px-5 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white text-sm font-medium shrink-0"
        >
          {uploading && <Loader2 size={14} className="animate-spin mr-1.5" />}
          Import
        </Button>
      </div>
    </div>
  );
}
