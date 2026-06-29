import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/auth/",
          "/api/",
          "/r/",
        ],
      },
    ],
    sitemap: "https://siriplan.com/sitemap.xml",
    host: "https://siriplan.com",
  };
}
