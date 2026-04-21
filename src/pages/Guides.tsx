import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import wordpressIcon from "@/assets/platforms/wordpress.svg";
import ghostIcon from "@/assets/platforms/ghost.svg";
import substackIcon from "@/assets/platforms/substack.svg";
import beehiivIcon from "@/assets/platforms/beehiiv.svg";

const platforms = [
  {
    name: "WordPress",
    slug: "wordpress",
    icon: wordpressIcon,
    description: "Install the Opedd plugin and auto-embed the licensing widget on every post.",
  },
  {
    name: "Ghost",
    slug: "ghost",
    icon: ghostIcon,
    description: "Connect your Ghost publication via API and add the widget with code injection.",
  },
  {
    name: "Substack",
    slug: "substack",
    icon: substackIcon,
    description: "Import your Substack archive via CSV and license your back-catalog.",
  },
  {
    name: "Beehiiv",
    slug: "beehiiv",
    icon: beehiivIcon,
    description: "Sync your Beehiiv newsletter via API and start licensing content.",
  },
];

const Guides = () => {
  useDocumentTitle("Integration Guides — Opedd");

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Integration Guides — Opedd"
        description="Step-by-step guides to connect Opedd with WordPress, Ghost, Substack, and Beehiiv."
        path="/guides"
      />
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Get set up in 5 minutes
            </h1>
            <p className="text-lg text-muted-foreground">
              Choose your platform below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {platforms.map((p) => (
              <Link
                key={p.slug}
                to={`/guides/${p.slug}`}
                className="group rounded-xl border border-border bg-card p-6 hover:border-oxford/40 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4 mb-3">
                  <img src={p.icon} alt={p.name} className="w-10 h-10" />
                  <h2 className="text-xl font-semibold text-foreground group-hover:text-oxford transition-colors">
                    {p.name}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </Link>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-4">Ready to get started?</p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-oxford hover:bg-oxford-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Sign up free →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Guides;
