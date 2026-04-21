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
  { id: "agreement", title: "1. Agreement" },
  { id: "what-opedd-does", title: "2. What Opedd Does" },
  { id: "publisher-obligations", title: "3. Publisher Obligations" },
  { id: "buyer-obligations", title: "4. Buyer Obligations" },
  { id: "payments", title: "5. Payments" },
  { id: "accounts", title: "6. Accounts" },
  { id: "on-chain-data", title: "7. On-Chain Data" },
  { id: "intellectual-property", title: "8. Intellectual Property" },
  { id: "disclaimer", title: "9. Disclaimer" },
  { id: "limitation-of-liability", title: "10. Limitation of Liability" },
  { id: "changes", title: "11. Changes" },
  { id: "contact", title: "12. Contact" },
];

export default function Terms() {
  useDocumentTitle("Terms of Service — Opedd");
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
        title="Terms of Service — Opedd"
        description="Read the Opedd terms of service governing use of the content licensing platform."
        path="/terms"
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
              <h1 className="text-3xl font-bold text-navy-deep">Terms of Service</h1>
              <p className="text-xs text-[#6B7280] whitespace-nowrap mt-2">
                Last updated: {formatLegalDate(LEGAL_METADATA.terms.lastUpdated)}
              </p>
            </div>
            <p className="text-navy-deep/50 text-sm mb-6">Effective: February 2026</p>

            {/* Mobile jump-to dropdown */}
            <div className="lg:hidden mb-8">
              <label htmlFor="terms-jump" className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
                Jump to section
              </label>
              <Select
                onValueChange={(value) => {
                  handleJump(value);
                }}
              >
                <SelectTrigger id="terms-jump" aria-label="Jump to section">
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
                id="agreement"
                ref={(el) => (sectionRefs.current["agreement"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">1. Agreement</h2>
                <p>By accessing or using Opedd ("Service", "we", "us"), you agree to these Terms. If you do not agree, do not use the Service. These Terms are governed by the laws of England and Wales.</p>
              </section>

              <section
                id="what-opedd-does"
                ref={(el) => (sectionRefs.current["what-opedd-does"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">2. What Opedd Does</h2>
                <p>Opedd is a content licensing protocol. It enables publishers to offer licenses for their content and buyers to purchase those licenses. Opedd facilitates transactions but is not a party to the license agreement between publisher and buyer.</p>
              </section>

              <section
                id="publisher-obligations"
                ref={(el) => (sectionRefs.current["publisher-obligations"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">3. Publisher Obligations</h2>
                <p>By listing content on Opedd, you confirm that you own or have the right to license that content. You are solely responsible for ensuring your content does not infringe third-party rights. Opedd reserves the right to remove content at its discretion.</p>
              </section>

              <section
                id="buyer-obligations"
                ref={(el) => (sectionRefs.current["buyer-obligations"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">4. Buyer Obligations</h2>
                <p>A purchased license grants you the specific rights described at the time of purchase (human republication, AI training, or AI inference). You may not use licensed content beyond the scope of your license type. License keys are non-transferable unless explicitly permitted.</p>
              </section>

              <section
                id="payments"
                ref={(el) => (sectionRefs.current["payments"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">5. Payments</h2>
                <p>All payments are processed by Stripe. By purchasing a license, you authorise the stated charge to your payment method. License purchases are final. Refunds are only issued where required by applicable law or at our sole discretion.</p>
              </section>

              <section
                id="accounts"
                ref={(el) => (sectionRefs.current["accounts"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">6. Accounts</h2>
                <p>You are responsible for maintaining the security of your account credentials. You must not share your account or API keys. We reserve the right to suspend accounts that violate these Terms.</p>
              </section>

              <section
                id="on-chain-data"
                ref={(el) => (sectionRefs.current["on-chain-data"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">7. On-Chain Data</h2>
                <p>License registrations may be recorded on a public blockchain (Tempo). Once recorded, this data cannot be deleted. By purchasing a license, you acknowledge that the license key, content identifier, and license type will be permanently public on-chain.</p>
              </section>

              <section
                id="intellectual-property"
                ref={(el) => (sectionRefs.current["intellectual-property"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">8. Intellectual Property</h2>
                <p>Opedd's platform, branding, and technology are owned by Opedd. Content listed by publishers remains the property of those publishers. Nothing in these Terms transfers ownership of any content or technology.</p>
              </section>

              <section
                id="disclaimer"
                ref={(el) => (sectionRefs.current["disclaimer"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">9. Disclaimer</h2>
                <p>The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted availability. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
              </section>

              <section
                id="limitation-of-liability"
                ref={(el) => (sectionRefs.current["limitation-of-liability"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">10. Limitation of Liability</h2>
                <p>To the maximum extent permitted by law, Opedd's total liability to you for any claim arising from these Terms or your use of the Service shall not exceed the amount you paid to Opedd in the 12 months preceding the claim.</p>
              </section>

              <section
                id="changes"
                ref={(el) => (sectionRefs.current["changes"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">11. Changes</h2>
                <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms. We will notify registered users of material changes by email.</p>
              </section>

              <section
                id="contact"
                ref={(el) => (sectionRefs.current["contact"] = el)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-none"
              >
                <h2 className="text-xl font-semibold text-navy-deep mt-8 mb-3">12. Contact</h2>
                <p>Questions about these Terms: <a href="mailto:hello@opedd.com" className="text-indigo-600 hover:underline">hello@opedd.com</a></p>
              </section>

              <p className="mt-8">See also: <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
