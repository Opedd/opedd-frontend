import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { blogPosts } from "@/data/blogPosts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const Blog = () => {
  useDocumentTitle("Blog | Opedd");

  const sorted = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Header />

      {/* Hero */}
      <section className="bg-navy-deep pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-soft-white mb-4">
            Blog
          </h1>
          <p className="text-lg text-alice-gray/70 max-w-2xl mx-auto">
            Insights on AI licensing, content monetization, and the future of
            publisher revenue
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {sorted.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <AspectRatio ratio={16 / 9} className="relative">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  loading="lazy"
                  width={1200}
                  height={675}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </AspectRatio>

              <div className="p-6">
                <span
                  className={`inline-block text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full mb-3 ${post.categoryColor}`}
                >
                  {post.category}
                </span>
                <h2 className="text-lg font-semibold text-[#111827] mb-2 group-hover:text-[#4A26ED] transition-colors line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-sm text-[#6B7280] mb-3">
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · {post.readingTime}
                </p>
                <p className="text-sm text-[#6B7280] line-clamp-2 mb-4">
                  {post.preview}
                </p>
                <span className="text-sm font-medium text-[#4A26ED]">
                  Read more →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;
