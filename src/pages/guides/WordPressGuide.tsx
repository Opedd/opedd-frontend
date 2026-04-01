import GuideLayout from "./GuideLayout";

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex gap-4 mb-6">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A26ED] text-white flex items-center justify-center text-sm font-bold">
      {n}
    </div>
    <div className="pt-1 text-foreground text-[15px] leading-relaxed">{children}</div>
  </div>
);

const WordPressGuide = () => (
  <GuideLayout
    title="WordPress Integration Guide"
    documentTitle="WordPress Integration Guide — Opedd"
    intro="AI companies are training models on your articles — often without permission or payment. By connecting your WordPress site to Opedd, every article in your archive becomes licensable. AI labs and enterprises pay you directly for the right to use your content, while you retain full ownership and control."
    prerequisites="Your WordPress site URL (e.g. yoursite.com). Optionally, an Application Password for instant verification — go to Users → Your Profile → Application Passwords in WordPress Admin."
    afterSetup="Your articles import automatically in the background via the WordPress REST API — this may take a few minutes for large sites. Prices are auto-set based on your content category. New posts sync on a daily schedule. You can adjust pricing anytime in your Opedd Dashboard."
  >
    <Step n={1}>
      Download the <strong>Opedd Widget plugin</strong> —{" "}
      <a href="/wordpress/opedd-widget.zip" className="text-[#4A26ED] hover:underline">
        opedd-widget.zip
      </a>
    </Step>
    <Step n={2}>
      In WordPress Admin → <strong>Plugins → Add New → Upload Plugin</strong> → select the zip file → <strong>Install & Activate</strong>.
    </Step>
    <Step n={3}>
      Go to <strong>Settings → Opedd Widget</strong>.
    </Step>
    <Step n={4}>
      Enter your <strong>Publisher ID</strong> (found in Opedd Dashboard → Settings → API Keys).
    </Step>
    <Step n={5}>
      Choose a display mode: <strong>Card</strong>, <strong>Badge</strong>, or <strong>Compact</strong>.
    </Step>
    <Step n={6}>
      Enable <strong>"Auto-embed on all posts"</strong> — or use the shortcode for specific posts.
    </Step>
    <Step n={7}>
      Your article archive imports automatically in the background via the WordPress REST API. This may take a few minutes for large sites.
    </Step>
    <Step n={8}>
      <strong>Optional:</strong> For full verification, go to Opedd Dashboard → Settings → Content, and connect with your WordPress <strong>Application Password</strong> (Users → Edit → Application Passwords). This proves ownership and enables instant content sync.
    </Step>
    <Step n={9}>
      <strong>Done</strong> — your articles are now licensable.
    </Step>

    <div className="mt-8 rounded-lg bg-muted/50 border border-border p-4">
      <p className="text-sm font-medium text-foreground mb-2">Shortcode usage</p>
      <pre className="bg-background rounded-md p-3 text-sm overflow-x-auto font-mono text-foreground">
{`[opedd_widget asset_id="..." mode="card" theme="light"]`}
      </pre>
    </div>
  </GuideLayout>
);

export default WordPressGuide;
