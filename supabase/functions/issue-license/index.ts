import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `OP-${seg(4)}-${seg(4)}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article_id, buyer_email, license_type } = await req.json();

    if (!article_id || !buyer_email || !license_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: article_id, buyer_email, license_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["human", "ai"].includes(license_type)) {
      return new Response(
        JSON.stringify({ error: "license_type must be 'human' or 'ai'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch the asset to get pricing
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("id, title, human_price, ai_price, user_id, human_licenses_sold, ai_licenses_sold, total_revenue")
      .eq("id", article_id)
      .maybeSingle();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ error: "Article not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amount = license_type === "human" ? (asset.human_price ?? 0) : (asset.ai_price ?? 0);
    const licenseKey = generateLicenseKey();

    // Record transaction
    const { error: txError } = await supabase.from("transactions").insert({
      asset_id: article_id,
      publisher_id: asset.user_id,
      license_type,
      buyer_email,
      amount,
      status: "settled",
    });

    if (txError) {
      console.error("Transaction insert error:", txError);
      return new Response(
        JSON.stringify({ error: "Failed to record transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update asset metrics
    const soldField = license_type === "human" ? "human_licenses_sold" : "ai_licenses_sold";
    const currentSold = asset[soldField] ?? 0;
    const currentRevenue = asset.total_revenue ?? 0;

    await supabase
      .from("assets")
      .update({
        [soldField]: currentSold + 1,
        total_revenue: currentRevenue + amount,
      })
      .eq("id", article_id);

    return new Response(
      JSON.stringify({
        success: true,
        license_key: licenseKey,
        license_type,
        amount,
        asset_title: asset.title,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
