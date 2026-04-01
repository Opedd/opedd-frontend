import GuideLayout from "./GuideLayout";

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex gap-4 mb-6">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A26ED] text-white flex items-center justify-center text-sm font-bold">
      {n}
    </div>
    <div className="pt-1 text-foreground text-[15px] leading-relaxed">{children}</div>
  </div>
);

const GhostGuide = () => (
  <GuideLayout title="Ghost Integration Guide" documentTitle="Ghost Integration Guide — Opedd">
    <Step n={1}>
      In Ghost Admin → <strong>Settings → Integrations → Add custom integration</strong>.
    </Step>
    <Step n={2}>
      Name it <strong>"Opedd"</strong> and copy the <strong>Admin API Key</strong> (not Content API Key) and <strong>API URL</strong>. The Admin key is needed to import members-only and paid posts.
    </Step>
    <Step n={3}>
      In Opedd Dashboard → <strong>Setup Wizard → select "Ghost"</strong>.
    </Step>
    <Step n={4}>
      Paste your <strong>Ghost API URL</strong> and <strong>Admin API Key</strong>. Your publication is verified automatically.
    </Step>
    <Step n={5}>
      Opedd imports your full archive in the background — including members-only posts. This may take a few minutes depending on your catalog size.
    </Step>
    <Step n={6}>
      To add the licensing widget: Ghost Admin → <strong>Settings → Code Injection → Site Footer</strong>, paste the snippet below.
    </Step>
    <Step n={7}>
      <strong>Done</strong> — your Ghost publication is now licensable.
    </Step>

    <div className="mt-8 rounded-lg bg-muted/50 border border-border p-4">
      <p className="text-sm font-medium text-foreground mb-2">Code injection snippet</p>
      <pre className="bg-background rounded-md p-3 text-sm overflow-x-auto font-mono text-foreground">
{`<script src="https://api.opedd.com/widget?publisher_id=YOUR_ID&mode=card"></script>`}
      </pre>
    </div>
  </GuideLayout>
);

export default GhostGuide;
