import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/auth/", "/api/", "/r/iptal/"],
      },
      // ChatGPT (OpenAI) — Bing üzerinden indeksler
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      // Gemini / Google AI
      { userAgent: "Google-Extended", allow: "/" },
      // Perplexity AI
      { userAgent: "PerplexityBot", allow: "/" },
      // Claude.ai (Anthropic)
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      // Meta AI
      { userAgent: "FacebookBot", allow: "/" },
      // Apple Intelligence
      { userAgent: "Applebot-Extended", allow: "/" },
      // Cohere
      { userAgent: "cohere-ai", allow: "/" },
    ],
    sitemap: "https://siriplan.com/sitemap.xml",
    host: "https://siriplan.com",
  };
}
