import { motion } from "framer-motion";
import { Twitter, Linkedin, Github, Mail } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

const footerLinks = {
  Product: [
    { label: "Features", href: "#products" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Pricing", href: "#" },
    { label: "API", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "Community", href: "#" },
    { label: "Status", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookie Policy", href: "#" },
    { label: "Licenses", href: "#" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Mail, href: "#", label: "Email" },
];

const Footer = () => {
  return (
    <footer className="py-16 lg:py-24 border-t border-soft-white/10 relative">
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
              <a href="#" className="flex items-center mb-4">
                <img 
                  src={opeddLogo} 
                  alt="Opedd" 
                  className="h-10 w-auto"
                />
              </a>
              <p className="text-sm text-alice-gray mb-6 max-w-xs">
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
                      className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-alice-gray hover:text-accent hover:bg-muted transition-colors"
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
                      className="text-sm text-alice-gray hover:text-accent transition-colors"
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
          className="mt-12 pt-8 border-t border-soft-white/10 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <p className="text-sm text-alice-gray">
            © 2026 Opedd.io. All rights reserved.
          </p>
          <p className="text-sm text-alice-gray">
            Built with ❤️ for content creators worldwide.
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;