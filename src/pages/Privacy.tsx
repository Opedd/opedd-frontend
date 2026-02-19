import { Link } from "react-router-dom";
import opeddLogoColor from "@/assets/opedd-logo.png";

export default function Privacy() {
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
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">1. Information We Collect</h2>
              <p><strong>Account Information:</strong> When you create an account, we collect your name, email address, organization type, and password (stored securely hashed).</p>
              <p><strong>Content Metadata:</strong> When you register content, we store article titles, URLs, descriptions, and pricing information.</p>
              <p><strong>Transaction Data:</strong> We record license transactions including buyer email, name, organization, intended use, amounts, and license keys.</p>
              <p><strong>Usage Data:</strong> We collect analytics about how you use the platform, including page views and feature usage, to improve the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">2. How We Use Your Information</h2>
              <p>We use your information to: (a) provide and maintain the Service; (b) process licensing transactions and payments; (c) send transactional emails (license confirmations, verification emails); (d) generate analytics and insights for your publisher dashboard; (e) prevent fraud and enforce our terms; (f) improve the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">3. Information Sharing</h2>
              <p>We do not sell your personal information. We share information only in these cases:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>License Transactions:</strong> Buyer information (name, organization) is shared with publishers as part of the licensing process.</li>
                <li><strong>Payment Processing:</strong> Payment information is shared with Stripe for transaction processing.</li>
                <li><strong>On-Chain Registration:</strong> License hashes (not personal data) may be registered on the Base blockchain for verification purposes.</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect rights and safety.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">4. Data Storage and Security</h2>
              <p>Your data is stored securely using Supabase infrastructure with row-level security policies. We use industry-standard encryption for data in transit (TLS) and at rest. API keys and webhook secrets are generated using cryptographically secure random number generators.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">5. Cookies</h2>
              <p>We use essential cookies and local storage for authentication session management. We do not use third-party tracking cookies.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">6. Data Retention</h2>
              <p>Account data is retained for as long as your account is active. License transaction records and license keys are retained indefinitely as they serve as proof of licensing. You may request deletion of your account and associated personal data by contacting us.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">7. Your Rights</h2>
              <p>You have the right to: (a) access your personal data; (b) correct inaccurate data; (c) request deletion of your data (subject to legal retention requirements); (d) export your data; (e) object to processing of your data. To exercise these rights, contact us at the address below.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">8. International Data Transfers</h2>
              <p>Your data may be processed in jurisdictions outside your country of residence. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">9. Children's Privacy</h2>
              <p>The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">10. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email. The "Last updated" date at the top indicates when changes were last made.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">11. Contact</h2>
              <p>For questions about this Privacy Policy or to exercise your data rights, please contact us at <a href="mailto:privacy@opedd.com" className="text-[#4A26ED] hover:underline">privacy@opedd.com</a>.</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
