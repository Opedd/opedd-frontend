import { Helmet } from "react-helmet-async";

const BASE_URL = "https://opedd.lovable.app";

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
  noindex?: boolean;
  ogImage?: string;
}

export default function SEO({
  title,
  description,
  path = "/",
  noindex = false,
  ogImage = `${BASE_URL}/og-image.png`,
}: SEOProps) {
  const canonical = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
    </Helmet>
  );
}
