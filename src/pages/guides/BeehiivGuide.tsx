import GuideLayout from "./GuideLayout";

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex gap-4 mb-6">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A26ED] text-white flex items-center justify-center text-sm font-bold">
      {n}
    </div>
    <div className="pt-1 text-foreground text-[15px] leading-relaxed">{children}</div>
  </div>
);

const BeehiivGuide = () => (
  <GuideLayout
    title="Beehiiv Integration Guide"
    documentTitle="Beehiiv Integration Guide — Opedd"
    intro="Your newsletter reaches thousands of readers — but AI companies are also consuming it for training data. Instead of letting them scrape for free, Opedd lets you set a price and get paid every time your content is licensed. Your full archive and every future edition become revenue-generating assets."
    prerequisites="Your Beehiiv API Key and Publication ID. In Beehiiv dashboard → Settings → Integrations → API → Create new API key. Your Publication ID is in your Beehiiv dashboard URL (starts with pub_)."
    afterSetup="Your archive imports and a webhook is registered automatically with Beehiiv. Every new post you publish arrives on Opedd in real-time — no manual action needed. Premium newsletter content is included and marked accordingly."
  >
    <Step n={1}>
      In Beehiiv → <strong>Settings → Integrations → API → Create new API key</strong>.
    </Step>
    <Step n={2}>
      Copy the <strong>API Key</strong> and your <strong>Publication ID</strong>.
    </Step>
    <Step n={3}>
      In Opedd Dashboard → <strong>Setup Wizard → select "Beehiiv"</strong>.
    </Step>
    <Step n={4}>
      Paste your <strong>API Key</strong> and <strong>Publication ID</strong>.
    </Step>
    <Step n={5}>
      Opedd imports your full archive in the background and automatically registers a webhook — <strong>new posts arrive in real-time</strong>, no manual action needed.
    </Step>
    <Step n={6}>
      To add the widget to your external website, paste the snippet below.
    </Step>
    <Step n={7}>
      <strong>Done</strong> — your Beehiiv newsletter is now licensable. New posts are synced automatically as you publish.
    </Step>

    <div className="mt-8 rounded-lg bg-muted/50 border border-border p-4">
      <p className="text-sm font-medium text-foreground mb-2">Widget embed snippet</p>
      <pre className="bg-background rounded-md p-3 text-sm overflow-x-auto font-mono text-foreground">
{`<script src="https://api.opedd.com/widget?publisher_id=YOUR_ID&mode=badge"></script>`}
      </pre>
    </div>
  </GuideLayout>
);

export default BeehiivGuide;
