import { Link } from "react-router-dom";
import opeddLogoColor from "@/assets/opedd-logo.png";

export default function Terms() {
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
          <h1 className="text-3xl font-bold text-[#040042] mb-2">Terms of Service</h1>
          <p className="text-[#040042]/50 text-sm mb-8">Last updated: February 2026</p>

          <div className="prose prose-slate max-w-none space-y-6 text-[#040042]/80 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using the Opedd platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">2. Description of Service</h2>
              <p>Opedd is a content licensing protocol and infrastructure that enables publishers to monetize their intellectual property through human reuse and AI training licenses. The platform provides tools for license issuance, verification, and payment processing.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">3. Publisher Accounts</h2>
              <p>To use the Service as a publisher, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">4. Content Ownership</h2>
              <p>You retain all ownership rights to your content. By using the Service, you grant Opedd a limited license to display metadata about your content (titles, URLs, descriptions) for the purpose of facilitating licensing transactions. Opedd does not claim ownership of any content registered on the platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">5. Licensing Transactions</h2>
              <p>Opedd facilitates licensing transactions between publishers and licensees. Publishers set their own pricing. Each license is identified by a unique license key and may be verified through the Opedd Protocol Proof Layer. Opedd charges a platform fee on paid transactions processed through the platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">6. Payments</h2>
              <p>Payment processing is handled by Stripe. By using payment features, you also agree to Stripe's terms of service. Opedd retains a platform fee (currently 10%) on transactions processed through Stripe Connect. Payouts to publishers are managed through Stripe Connect Express accounts.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">7. API Usage</h2>
              <p>Access to the Opedd Programmatic API is subject to rate limits and fair use policies. API keys are confidential and must not be shared. Abuse of the API, including exceeding rate limits or attempting to circumvent security measures, may result in suspension of access.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">8. Prohibited Conduct</h2>
              <p>You agree not to: (a) use the Service for any unlawful purpose; (b) register content you do not have rights to license; (c) attempt to circumvent security measures or rate limits; (d) interfere with the operation of the Service; (e) impersonate another person or entity.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">9. Limitation of Liability</h2>
              <p>The Service is provided "as is" without warranties of any kind. Opedd shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability shall not exceed the fees paid by you in the twelve months preceding the claim.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">10. Termination</h2>
              <p>Either party may terminate this agreement at any time. Upon termination, your right to use the Service ceases. Existing license transactions and their associated license keys remain valid after termination.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">11. Changes to Terms</h2>
              <p>We may update these terms from time to time. We will notify registered users of material changes via email. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">12. Contact</h2>
              <p>For questions about these Terms of Service, please contact us at <a href="mailto:legal@opedd.com" className="text-[#4A26ED] hover:underline">legal@opedd.com</a>.</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
