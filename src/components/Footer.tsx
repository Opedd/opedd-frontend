import { motion } from "framer-motion";
import { Github, Mail, Twitter, Linkedin } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

const footerLinks = {
  Product: [
    { label: "Features", href: "/pricing" },
    { label: "For AI Agents", href: "/for-ai-agents" },
    { label: "Pricing", href: "/pricing" },
    { label: "API Docs", href: "https://docs.opedd.com", external: true },
  ],
  Publishers: [
    { label: "Browse Publishers", href: "/publishers" },
    { label: "Enterprise", href: "/enterprise" },
    { label: "Integration Guides", href: "/guides" },
    { label: "Documentation", href: "https://docs.opedd.com", external: true },
    { label: "Status", href: "/status" },
  ],
  Resources: [
    { label: "Blog", href: "/blog" },
    { label: "Get help", href: "mailto:support@opedd.com" },
    { label: "GitHub", href: "https://github.com/Opedd", external: true },
    { label: "npm", href: "https://www.npmjs.com/package/opedd-mcp", external: true },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Licenses", href: "/licenses" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "https://x.com/OpeddHQ", label: "X (Twitter)" },
  { icon: Linkedin, href: "https://www.linkedin.com/company/opedd", label: "LinkedIn" },
  { icon: Github, href: "https://github.com/Opedd", label: "GitHub" },
  { icon: Mail, href: "mailto:hello@opedd.com", label: "Email" },
];

const Footer = () => {
  return (
    <footer className="py-16 lg:py-24 border-t border-white/10 relative bg-navy-deep">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <a href="/" className="flex items-center mb-4">
                <img src={opeddLogo} alt="Opedd" className="h-10 w-auto" />
              </a>
              <p className="text-sm text-alice-gray/60 mb-6 max-w-xs">
                The next-gen content sovereignty infrastructure for creators and publishers.
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-alice-gray/70 hover:bg-oxford/20 hover:text-oxford hover:border-oxford/40 transition-colors"
                      aria-label={social.label}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links], index) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <h4 className="text-sm font-semibold text-soft-white mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...((link as any).external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="text-sm text-alice-gray/70 hover:text-oxford transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <p className="text-sm text-alice-gray/50">
            © 2026 Opedd. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-alice-gray/50">
             <a href="/terms" className="hover:text-alice-gray/80 transition-colors">Terms of Service</a>
             <span className="text-alice-gray/20">·</span>
             <a href="/privacy" className="hover:text-alice-gray/80 transition-colors">Privacy Policy</a>
            <span className="text-alice-gray/20">·</span>
            <a href="mailto:support@opedd.com" className="hover:text-alice-gray/80 transition-colors">Support</a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
