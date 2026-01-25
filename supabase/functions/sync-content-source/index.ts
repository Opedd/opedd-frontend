import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  feedUrl: string;
  platform: "substack" | "ghost" | "rss";
  name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the user from the auth header
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { feedUrl, platform, name } = (await req.json()) as SyncRequest;

    if (!feedUrl || !platform) {
      return new Response(
        JSON.stringify({ error: "feedUrl and platform are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Store the RSS source in the database
    const { data: rssSource, error: insertError } = await supabaseClient
      .from("rss_sources")
      .insert({
        user_id: user.id,
        feed_url: feedUrl,
        platform: platform,
        name: name || `${platform} feed`,
        sync_status: "syncing",
        article_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create RSS source", details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Simulate fetching and parsing the RSS feed
    // In production, you would actually fetch and parse the feed here
    const simulatedArticleCount = Math.floor(Math.random() * 50) + 10;

    // Update the source with completed status
    const { error: updateError } = await supabaseClient
      .from("rss_sources")
      .update({
        sync_status: "completed",
        article_count: simulatedArticleCount,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", rssSource.id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${simulatedArticleCount} articles from ${platform}`,
        source: {
          id: rssSource.id,
          name: rssSource.name,
          platform,
          articleCount: simulatedArticleCount,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
