import { AlertTriangle } from "lucide-react";
import GuideLayout from "./GuideLayout";

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex gap-4 mb-6">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A26ED] text-white flex items-center justify-center text-sm font-bold">
      {n}
    </div>
    <div className="pt-1 text-foreground text-[15px] leading-relaxed">{children}</div>
  </div>
);

const SubstackGuide = () => (
  <GuideLayout
    title="Substack Integration Guide"
    documentTitle="Substack Integration Guide — Opedd"
    intro="Your Substack archive is a goldmine for AI companies who need high-quality, curated content for training and inference. By uploading your archive to Opedd, you turn every past and future edition into a licensable asset. AI labs pay you directly — separate from your subscriber revenue. It's a new revenue stream, not a replacement."
    prerequisites="Your Substack CSV export. In Substack → Settings → Export → click 'Create new export' → download the CSV file when ready. This contains all your published posts with titles, URLs, and dates."
    afterSetup="Your archive imports from the CSV. For ongoing delivery of new posts, set up email forwarding in your Opedd Dashboard (Distribution → Email Forwarding). Forward your Substack notification emails to your Opedd inbound address. Each new post is imported automatically when the email arrives."
  >
    <Step n={1}>
      In Substack → <strong>Settings → Export → Download CSV archive</strong>.
    </Step>
    <Step n={2}>
      In Opedd Dashboard → <strong>Setup Wizard → select "Substack"</strong>.
    </Step>
    <Step n={3}>
      <strong>Upload your CSV file</strong>.
    </Step>
    <Step n={4}>
      Opedd imports all posts with <strong>titles, URLs, dates, and descriptions</strong>. If your CSV includes full post content (<code>body_html</code> column), article text is imported too. Import happens in the background — may take a few minutes for large archives.
    </Step>
    <Step n={5}>
      Set your <strong>human and AI pricing</strong>. Opedd auto-suggests prices based on your content category.
    </Step>
    <Step n={6}>
      <strong>For new posts:</strong> Forward your Substack notification emails to your Opedd inbound address (shown in Dashboard → Distribution → Email Forwarding). New posts are imported automatically when received.
    </Step>
    <Step n={7}>
      <strong>Done</strong> — your archive is licensable and new posts sync via email.
    </Step>

    <div className="mt-8 rounded-lg bg-amber-50 border border-amber-200 p-4 flex gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800">
        Substack doesn't support custom scripts, so the widget is not available. Buyers purchase licenses through your Opedd public page at{" "}
        <strong>opedd.com/p/your-publication</strong>.
      </p>
    </div>
  </GuideLayout>
);

export default SubstackGuide;
