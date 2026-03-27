import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import opeddLogoColor from "@/assets/opedd-logo.png";

export default function Privacy() {
  useDocumentTitle("Privacy Policy — Opedd");
  return (
    <div className="min-h-screen bg-[#F2F9FF]">
      <header className="bg-white border-b border-[#E8F2FB] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={opeddLogoColor} alt="Opedd" className="h-8" />
          </Link>
          <Link to="/signup" className="text-sm text-[#4A26ED] font-medium hover:underline">
            Sign Up
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-[#E8F2FB] p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl font-bold text-[#040042] mb-2">Privacy Policy</h1>
          <p className="text-[#040042]/50 text-sm mb-8">Last updated: February 2026</p>

          <div className="prose prose-slate max-w-none space-y-6 text-[#040042]/80 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">1. Who We Are</h2>
              <p>Opedd is operated by an individual data controller based in the United Kingdom. Contact: <a href="mailto:hello@opedd.com" className="text-indigo-600 hover:underline">hello@opedd.com</a></p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">2. Data We Collect</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account data:</strong> email address, name, organisation name when you register</li>
                <li><strong>Transaction data:</strong> buyer email, name, organisation, intended use, license type, and amount for each license purchase</li>
                <li><strong>Payment data:</strong> processed entirely by Stripe — we never store card numbers</li>
                <li><strong>Usage data:</strong> pages visited, features used, timestamps — collected to improve the Service</li>
                <li><strong>Communications:</strong> emails you send us</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">3. How We Use Your Data</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide and operate the Service</li>
                <li>To process payments and issue license keys</li>
                <li>To send transactional emails (license confirmations, receipts)</li>
                <li>To notify publishers of sales and activity on their account</li>
                <li>To improve and develop the platform</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">4. Third Parties</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Stripe</strong> — payment processing (UK/EU data processing agreement in place)</li>
                <li><strong>Supabase</strong> — database and authentication hosting (EU region)</li>
                <li><strong>Resend</strong> — transactional email delivery</li>
                <li><strong>Tempo blockchain</strong> — public on-chain license registration (immutable, permanent)</li>
              </ul>
              <p className="mt-3">We do not sell your personal data to third parties.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">5. On-Chain Data</h2>
              <p>When a license is issued, the license key, content identifier, and license type are recorded on the Tempo blockchain. This data is public and permanent and cannot be erased. It does not include your name or email address.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">6. Your Rights (UK GDPR)</h2>
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

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">7. Data Retention</h2>
              <p>We retain transaction records for 7 years for tax and legal compliance. Account data is retained until you request deletion. We will action deletion requests within 30 days where legally permitted.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">8. Cookies</h2>
              <p>We use only essential cookies required for authentication and session management. We do not use advertising or tracking cookies.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">9. Changes</h2>
              <p>We may update this policy. Material changes will be communicated by email to registered users. Continued use of the Service constitutes acceptance.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">10. Contact</h2>
              <p>Data controller contact: <a href="mailto:hello@opedd.com" className="text-indigo-600 hover:underline">hello@opedd.com</a></p>
            </section>

            <p className="mt-8">See also: <a href="/terms" className="text-indigo-600 hover:underline">Terms of Service</a></p>
          </div>
        </div>
      </main>
    </div>
  );
}
