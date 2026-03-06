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
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">1. Agreement</h2>
              <p>By accessing or using Opedd ("Service", "we", "us"), you agree to these Terms. If you do not agree, do not use the Service. These Terms are governed by the laws of England and Wales.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">2. What Opedd Does</h2>
              <p>Opedd is a content licensing protocol. It enables publishers to offer licenses for their content and buyers to purchase those licenses. Opedd facilitates transactions but is not a party to the license agreement between publisher and buyer.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">3. Publisher Obligations</h2>
              <p>By listing content on Opedd, you confirm that you own or have the right to license that content. You are solely responsible for ensuring your content does not infringe third-party rights. Opedd reserves the right to remove content at its discretion.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">4. Buyer Obligations</h2>
              <p>A purchased license grants you the specific rights described at the time of purchase (human republication, AI training, or AI inference). You may not use licensed content beyond the scope of your license type. License keys are non-transferable unless explicitly permitted.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">5. Payments</h2>
              <p>All payments are processed by Stripe. By purchasing a license, you authorise the stated charge to your payment method. License purchases are final. Refunds are only issued where required by applicable law or at our sole discretion.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">6. Accounts</h2>
              <p>You are responsible for maintaining the security of your account credentials. You must not share your account or API keys. We reserve the right to suspend accounts that violate these Terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">7. On-Chain Data</h2>
              <p>License registrations may be recorded on a public blockchain (Base). Once recorded, this data cannot be deleted. By purchasing a license, you acknowledge that the license key, content identifier, and license type will be permanently public on-chain.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">8. Intellectual Property</h2>
              <p>Opedd's platform, branding, and technology are owned by Opedd. Content listed by publishers remains the property of those publishers. Nothing in these Terms transfers ownership of any content or technology.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">9. Disclaimer</h2>
              <p>The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted availability. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">10. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, Opedd's total liability to you for any claim arising from these Terms or your use of the Service shall not exceed the amount you paid to Opedd in the 12 months preceding the claim.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">11. Changes</h2>
              <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms. We will notify registered users of material changes by email.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#040042] mt-8 mb-3">12. Contact</h2>
              <p>Questions about these Terms: <a href="mailto:hello@opedd.com" className="text-indigo-600 hover:underline">hello@opedd.com</a></p>
            </section>

            <p className="mt-8">See also: <a href="https://legal.opedd.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Privacy Policy</a></p>
          </div>
        </div>
      </main>
    </div>
  );
}
