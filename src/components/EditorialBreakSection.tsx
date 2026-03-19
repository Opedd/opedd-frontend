import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileText, Bot, ArrowRight } from "lucide-react";

const EditorialBreakSection = () => {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-alice-gray scroll-mt-24">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-oxford text-sm font-semibold uppercase tracking-wider font-mono">
            // How It Works
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-deep mt-4">
            Your Content, Machine-Readable
          </h2>
          <p className="text-lg text-navy-deep/70 mt-4 max-w-2xl mx-auto">
            Connect your content. Set your prices. Licensing happens automatically — for human republication, AI training, and AI inference.
          </p>
        </motion.div>

        {/* Newsletter Widget Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Email Client Mockup */}
          <div className="bg-white rounded-2xl shadow-2xl border border-alice-gray overflow-hidden">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-alice-gray bg-alice-gray/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-lg px-4 py-1.5 text-xs text-violet-gray font-mono">
                  newsletter.publisher.com/article/2026-01-21
                </div>
              </div>
            </div>

            {/* Newsletter Content */}
            <div className="p-8 lg:p-12">
              {/* Header */}
              <div className="border-b border-alice-gray pb-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-navy-deep flex items-center justify-center">
                    <FileText className="w-5 h-5 text-soft-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-navy-deep">The Morning Brief</h4>
                    <p className="text-xs text-violet-gray">Published Jan 21, 2026</p>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-navy-deep">
                  Understanding the Future of Content Licensing
                </h3>
              </div>

              {/* Article Preview */}
              <div className="mb-8">
                <p className="text-violet-gray leading-relaxed mb-4">
                  In an era where AI systems consume content at unprecedented scale, publishers 
                  face a critical question: how do we ensure fair compensation for our work? 
                  The answer lies in machine-readable licensing infrastructure...
                </p>
                <div className="h-px bg-alice-gray my-6" />
                <p className="text-sm text-violet-gray/70 italic">
                  [Article continues below the licensing widget]
                </p>
              </div>

              {/* Opedd Widget - The Key Visual */}
              <div className="bg-navy-deep rounded-xl p-6 border border-oxford/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-oxford/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-oxford" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <span className="text-soft-white text-sm font-semibold font-mono">OPEDD</span>
                  </div>
                  <span className="text-alice-gray text-xs font-mono">Asset #0x7f3a...2c1b</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="default" size="sm" className="flex-1 group">
                    <FileText className="w-4 h-4 mr-2" />
                    Republish this Article
                    <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 border-oxford/30 text-soft-white group">
                    <Bot className="w-4 h-4 mr-2" />
                    AI Citation Access
                  </Button>
                </div>

                <p className="text-alice-gray/60 text-xs mt-4 text-center font-mono">
                  Protected by Secure Rights Ledger • Ownership Tracking
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Process Steps Below */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid md:grid-cols-3 gap-8 mt-16"
        >
          {[
            {
              step: "01",
              title: "Connect Your Feed",
              description: "Import your RSS or API endpoint. We catalog every article automatically.",
            },
            {
              step: "02",
              title: "Widget Embeds Seamlessly",
              description: "A non-intrusive licensing widget appears on your content, ready for transactions.",
            },
            {
              step: "03",
              title: "Revenue Flows Instantly",
              description: "Human readers and AI agents pay per use. Secure Rights Ledger tracks every transaction.",
            },
          ].map((item, index) => (
            <div key={index} className="text-center bg-white/50 rounded-xl p-6">
              <span className="text-oxford font-mono text-sm font-bold">{item.step}</span>
              <h4 className="text-xl font-bold text-navy-deep mt-2 mb-3">{item.title}</h4>
              <p className="text-violet-gray text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default EditorialBreakSection;
