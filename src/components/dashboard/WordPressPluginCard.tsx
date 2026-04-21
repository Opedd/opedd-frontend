import React, { useState, useEffect } from "react";
import * as Sentry from "@sentry/react";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { copyToClipboard } from "@/lib/clipboard";
import { Download, Copy, Check, Key, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import wordpressLogo from "@/assets/platforms/wordpress.svg";

const PLUGIN_URL = "https://raw.githubusercontent.com/Opedd/opedd-backend/main/wordpress/opedd-widget.php";

export function WordPressPluginCard() {
  const { getAccessToken } = useAuth();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && json?.data?.api_key) setApiKey(json.data.api_key);
      } catch (err) { Sentry.captureException(err); }
    })();
    return () => { cancelled = true; };
  }, [getAccessToken]);

  const handleCopy = async () => {
    if (!apiKey) return;
    const ok = await copyToClipboard(apiKey);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-wordpress-blue/10 flex items-center justify-center flex-shrink-0">
          <img src={wordpressLogo} alt="WordPress" className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-navy-deep">WordPress Plugin</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Automatically sync new posts to Opedd the moment you publish. Requires your Publisher API key.
          </p>
        </div>
      </div>

      {/* Download button */}
      <Button
        asChild
        variant="outline"
        className="h-9 text-sm font-medium gap-2 border-gray-200 hover:bg-gray-50 text-navy-deep mb-4"
      >
        <a href={PLUGIN_URL} download="opedd-widget.php">
          <Download size={14} />
          Download Plugin
        </a>
      </Button>

      {/* Setup instructions */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium text-gray-700">Setup instructions</p>
        <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
          <li>Download the plugin file above</li>
          <li>In your WordPress admin, go to <span className="font-medium text-gray-700">Plugins → Add New → Upload Plugin</span></li>
          <li>Upload the .php file and activate it</li>
          <li>Go to <span className="font-medium text-gray-700">Settings → Opedd Widget</span></li>
          <li>
            Enter your Publisher API Key:
            {apiKey ? (
              <div className="flex items-center gap-2 mt-1.5">
                <Input
                  readOnly
                  value={apiKey}
                  className="h-8 text-xs font-mono bg-white border-gray-200 flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-oxford"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </Button>
              </div>
            ) : (
              <span className="text-gray-400 italic ml-1">Loading…</span>
            )}
          </li>
          <li>Enable <span className="font-medium text-gray-700">"Sync new posts to Opedd"</span> toggle</li>
          <li>Save settings</li>
        </ol>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Once set up, every new post you publish will automatically appear in your Opedd catalog within seconds.
      </p>
    </div>
  );
}
