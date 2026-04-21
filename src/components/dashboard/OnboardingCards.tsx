import React from "react";
import { Link2, FileUp, Globe, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface OnboardingCardsProps {
  onSyncClick: () => void;
  onRegisterClick: () => void;
  onEnterpriseClick: () => void;
}

export function OnboardingCards({ onSyncClick, onRegisterClick, onEnterpriseClick }: OnboardingCardsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card A: Sync Newsletter/Site */}
        <button
          onClick={onSyncClick}
          className="group relative bg-white border border-blue-50 rounded-2xl p-6 text-left hover:border-oxford/40 hover:shadow-lg hover:shadow-oxford/5 transition-all duration-300"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-oxford/10 to-violet-600/10 flex items-center justify-center shrink-0 group-hover:from-oxford group-hover:to-violet-600 transition-all">
              <Link2 size={26} className="text-oxford group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-navy-deep font-semibold text-base">
                  Sync Newsletter/Site
                </h3>
                <ArrowRight
                  size={18}
                  className="text-oxford opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                />
              </div>
              <p className="text-navy-deep/60 text-sm leading-relaxed">
                Automatically import and protect every new post via API or sitemap.
              </p>
            </div>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-oxford/0 to-violet-600/0 group-hover:from-oxford/[0.02] group-hover:to-violet-600/[0.02] transition-all duration-300 pointer-events-none" />
        </button>

        {/* Card B: Register Single Work */}
        <button
          onClick={onRegisterClick}
          className="group relative bg-white border border-blue-50 rounded-2xl p-6 text-left hover:border-teal-400 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center shrink-0 group-hover:from-teal-500 group-hover:to-emerald-500 transition-all">
              <FileUp size={26} className="text-teal-600 group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-navy-deep font-semibold text-base">
                  Register Single Work
                </h3>
                <ArrowRight
                  size={18}
                  className="text-oxford opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                />
              </div>
              <p className="text-navy-deep/60 text-sm leading-relaxed">
                Protect a one-off article, op-ed, or research paper.
              </p>
            </div>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-oxford/0 to-violet-600/0 group-hover:from-oxford/[0.02] group-hover:to-violet-600/[0.02] transition-all duration-300 pointer-events-none" />
        </button>

        {/* Card C: Bulk / Enterprise */}
        <button
          onClick={onEnterpriseClick}
          className="group relative bg-white border border-blue-50 rounded-2xl p-6 text-left hover:border-plum-magenta/40 hover:shadow-lg hover:shadow-plum-magenta/5 transition-all duration-300"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-plum-magenta/10 to-plum-magenta/10 flex items-center justify-center shrink-0 group-hover:from-plum-magenta group-hover:to-plum-magenta transition-all">
              <Globe size={26} className="text-plum-magenta group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-navy-deep font-semibold text-base">
                  Bulk / Enterprise
                </h3>
                <ArrowRight
                  size={18}
                  className="text-plum-magenta opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                />
              </div>
              <p className="text-navy-deep/60 text-sm leading-relaxed">
                Add multiple feeds, sitemaps, and tag them by vertical.
              </p>
            </div>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-plum-magenta/0 to-plum-magenta/0 group-hover:from-plum-magenta/[0.02] group-hover:to-plum-magenta/[0.02] transition-all duration-300 pointer-events-none" />
        </button>
      </div>
    </motion.div>
  );
}
