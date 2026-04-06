import { useParams, Link, Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { useEffect } from "react";
import { Twitter, Linkedin, LinkIcon, ArrowLeft } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { blogPosts } from "@/data/blogPosts";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === slug);

  useDocumentTitle(post ? `${post.title} | Opedd Blog` : "Not Found | Opedd");

  if (!post) return <Navigate to="/blog" replace />;

  const otherPosts = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const shareUrl = `https://opedd.com/blog/${post.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <SEO
        title={`${post.title} | Opedd Blog`}
        description={post.preview}
        path={`/blog/${post.slug}`}
        ogImage={post.ogImage}
      />
      <Header />

      {/* Back link */}
      <div className="bg-navy-deep pt-28 pb-4 px-4">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-alice-gray/60 hover:text-alice-gray transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>

      {/* Cover image */}
      <div className="bg-navy-deep pb-0">
        <div className="max-w-5xl mx-auto px-4">
          <AspectRatio ratio={16 / 9} className="rounded-t-xl overflow-hidden">
            <img
              src={post.coverImage}
              alt={post.title}
              width={1200}
              height={675}
              className="w-full h-full object-cover"
            />
          </AspectRatio>
        </div>
      </div>

      {/* Article */}
      <article className="px-4 py-12">
        <div className="max-w-[680px] mx-auto">
          {/* Category */}
          <span
            className={`inline-block text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full mb-4 ${post.categoryColor}`}
          >
            {post.category}
          </span>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-[#111827] leading-tight mb-6">
            {post.title}
          </h1>

          {/* Author line */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#4A26ED] flex items-center justify-center text-white font-bold text-sm">
              AB
            </div>
            <div>
              <p className="text-sm font-medium text-[#111827]">
                Alexandre Bridi
              </p>
              <p className="text-xs text-[#6B7280]">
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · {post.readingTime}
              </p>
            </div>
          </div>

          {/* Share buttons */}
          <div className="flex items-center gap-2 mb-10 pb-8 border-b border-[#E5E7EB]">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            >
              <Twitter className="w-4 h-4" /> Share
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            >
              <Linkedin className="w-4 h-4" /> Share
            </a>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            >
              <LinkIcon className="w-4 h-4" /> Copy link
            </button>
          </div>

          {/* Body */}
          <div
            className="prose-blog"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* CTA */}
          <div className="mt-16 rounded-xl bg-navy-deep p-8 md:p-12 text-center">
            <h3 className="text-2xl font-bold text-soft-white mb-3">
              Start earning from your newsletter archive
            </h3>
            <p className="text-alice-gray/70 mb-6 max-w-md mx-auto">
              Register your content, set your price, and let AI companies license
              your work — in minutes.
            </p>
            <a href="https://app.opedd.com/get-started">
              <Button size="lg">Get Started →</Button>
            </a>
          </div>

          {/* More posts */}
          {otherPosts.length > 0 && (
            <div className="mt-16">
              <h3 className="text-xl font-bold text-[#111827] mb-6">
                More posts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherPosts.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="group bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <AspectRatio ratio={16 / 9}>
                      <img
                        src={p.coverImage}
                        alt={p.title}
                        loading="lazy"
                        width={600}
                        height={338}
                        className="w-full h-full object-cover"
                      />
                    </AspectRatio>
                    <div className="p-4">
                      <span
                        className={`inline-block text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full mb-2 ${p.categoryColor}`}
                      >
                        {p.category}
                      </span>
                      <h4 className="text-sm font-semibold text-[#111827] group-hover:text-[#4A26ED] transition-colors line-clamp-2">
                        {p.title}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default BlogPost;
