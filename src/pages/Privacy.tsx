import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { LEGAL_METADATA, formatLegalDate } from "@/lib/legalMetadata";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import opeddLogoColor from "@/assets/opedd-logo.png";

type Section = { id: string; title: string };

const SECTIONS: Section[] = [
  { id: "who-we-are", title: "1. Who We Are" },
  { id: "data-we-collect", title: "2. Data We Collect" },
  { id: "how-we-use-your-data", title: "3. How We Use Your Data" },
  { id: "third-parties", title: "4. Third Parties" },
  { id: "on-chain-data", title: "5. On-Chain Data" },
  { id: "your-rights", title: "6. Your Rights (UK GDPR)" },
  { id: "data-retention", title: "7. Data Retention" },
  { id: "cookies", title: "8. Cookies" },
  { id: "changes", title: "9. Changes" },
  { id: "contact", title: "10. Contact" },
];

export default function Privacy() {
  useDocumentTitle("Privacy Policy — Opedd");
  const sectionIds = useMemo(() => SECTIONS.map((s) => s.id), []);
  const activeId = useScrollSpy(sectionIds);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const focusSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.focus({ preventScroll: true });
    }
  };

  const handleJump = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => focusSection(id), 400);
    }
  };

  return (
    <div className="min-h-screen bg-alice-gray" style={{ scrollBehavior: "smooth" }}>
      <SEO
        title="Privacy Policy — Opedd"
        description="Opedd privacy policy. Learn how we handle your data and protect your information."
        path="/privacy"
      />
      <header className="bg-white border-b border-blue-50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={opeddLogoColor} alt="Opedd" className="h-8" />
          </Link>
          <Link to="/signup" className="text-sm text-oxford font-medium hover:underline">
            Sign Up
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
          {/* Desktop sticky TOC */}
          <aside className="hidden lg:block">
            <nav
              aria-label="Page sections"
              className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3">
                On this page
              </p>
              <ul className="space-y-1 border-l border-[#E5E7EB]">
                {SECTIONS.map((section) => {
                  const isActive = activeId === section.id;
                  return (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        aria-current={isActive ? "location" : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          handleJump(section.id);
                          history.replaceState(null, "", `#${section.id}`);
                        }}
                        className={`block -ml-px border-l-2 pl-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? "border-oxford text-oxford font-medium"
                            : "border-transparent text-[#6B7280] hover:text-navy-deep hover:border-[#E5E7EB]"
                        }`}
                      >
                        {section.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <div className="bg-white rounded-2xl border border-blue-50 p-8 md:p-12 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-3xl font-bold text-navy-deep">Privacy Policy</h1>
              <p className="text-xs text-[#6B7280] whitespace-nowrap mt-2">
                Last updated: {formatLegalDate(LEGAL_METADATA.privacy.lastUpdated)}
              </p>
            </div>
            <p className="text-navy-deep/50 text-sm mb-6">Effective: February 2026</p>

            {/* Mobile jump-to dropdown */}
            <div className="lg:hidden mb-8">
              <label htmlFor="privacy-jump" className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
                Jump to section
              </label>
              <Select
                onValueChange={(value) => {
                  handleJump(value);
                }}
              >
                <SelectTrigger id="privacy-jump" aria-label="Jump to section">
                  <SelectValue placeholder="Select a section..." />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="prose prose-slate max-w-none space-y-6 text-navy-deep/80 leading-relaxed">
              <section
                id="who-we-are"
                ref={(el) => (sectionRefs.current["who-we-are"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">1. Who We Are</h2>
                <p>Opedd is operated by an individual data controller based in the United Kingdom. Contact: <a href="mailto:hello@opedd.com" className="text-indigo-600 hover:underline">hello@opedd.com</a></p>
              </section>

              <section
                id="data-we-collect"
                ref={(el) => (sectionRefs.current["data-we-collect"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">2. Data We Collect</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account data:</strong> email address, name, organisation name when you register</li>
                  <li><strong>Buyer signup data (from 2 May 2026):</strong> first and last name, company name, company website, intended use category (e.g. AI training, RAG retrieval, editorial reuse, research), and country of incorporation. Collected once at buyer signup to support tax compliance (EU VAT), AI Act applicability, and Phase 5.4 metered-billing tier shaping.</li>
                  <li><strong>Transaction data:</strong> buyer email, name, organisation, intended use, license type, and amount for each license purchase</li>
                  <li><strong>Payment data:</strong> processed entirely by Stripe — we never store card numbers</li>
                  <li><strong>Usage data:</strong> pages visited, features used, timestamps — collected to improve the Service</li>
                  <li><strong>Communications:</strong> emails you send us</li>
                </ul>
              </section>

              <section
                id="how-we-use-your-data"
                ref={(el) => (sectionRefs.current["how-we-use-your-data"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">3. How We Use Your Data</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To provide and operate the Service</li>
                  <li>To process payments and issue license keys</li>
                  <li>To send transactional emails (license confirmations, receipts)</li>
                  <li>To notify publishers of sales and activity on their account</li>
                  <li>To improve and develop the platform</li>
                  <li>To comply with legal obligations</li>
                </ul>
              </section>

              <section
                id="third-parties"
                ref={(el) => (sectionRefs.current["third-parties"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">4. Third Parties</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Stripe</strong> — payment processing (UK/EU data processing agreement in place)</li>
                  <li><strong>Supabase</strong> — database and authentication hosting (EU region)</li>
                  <li><strong>Resend</strong> — transactional email delivery</li>
                  <li><strong>Tempo blockchain</strong> — public on-chain license registration (immutable, permanent)</li>
                </ul>
                <p className="mt-3">We do not sell your personal data to third parties.</p>
              </section>

              <section
                id="on-chain-data"
                ref={(el) => (sectionRefs.current["on-chain-data"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">5. On-Chain Data</h2>
                <p>When a license is issued, the license key, content identifier, and license type are recorded on the Tempo blockchain. This data is public and permanent and cannot be erased. It does not include your name or email address.</p>
              </section>

              <section
                id="your-rights"
                ref={(el) => (sectionRefs.current["your-rights"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">6. Your Rights (UK GDPR)</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access the personal data we hold about you</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data (subject to legal retention requirements)</li>
                  <li>Object to or restrict processing</li>
                  <li>Data portability</li>
                  <li>Lodge a complaint with the ICO (ico.org.uk)</li>
                </ul>
                <p className="mt-3">To exercise any right: <a href="mailto:hello@opedd.com" className="text-indigo-600 hover:underline">hello@opedd.com</a></p>
              </section>

              <section
                id="data-retention"
                ref={(el) => (sectionRefs.current["data-retention"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">7. Data Retention</h2>
                <p>We retain transaction records for 7 years for tax and legal compliance. Account data is retained until you request deletion. We will action deletion requests within 30 days where legally permitted.</p>
              </section>

              <section
                id="cookies"
                ref={(el) => (sectionRefs.current["cookies"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">8. Cookies</h2>
                <p>We use only essential cookies required for authentication and session management. We do not use advertising or tracking cookies.</p>
              </section>

              <section
                id="changes"
                ref={(el) => (sectionRefs.current["changes"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">9. Changes</h2>
                <p>We may update this policy. Material changes will be communicated by email to registered users. Continued use of the Service constitutes acceptance.</p>
              </section>

              <section
                id="contact"
                ref={(el) => (sectionRefs.current["contact"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">10. Contact</h2>
                <p>Data controller contact: <a href="mailto:hello@opedd.com" className="text-indigo-600 hover:underline">hello@opedd.com</a></p>
              </section>

              <p className="mt-8">See also: <a href="/terms" className="text-indigo-600 hover:underline">Terms of Service</a></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
