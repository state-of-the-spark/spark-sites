// ARCHIVED from grantspark/startwithspark (Netlify site deleted 2026-02-20)
// Original site-config.ts — Single source of all brand-specific content
// Derived from: core/offer.md, audience.md, voice.md, soul.md
// Homepage copy: outputs/2026-02-12-spark-parent-brand-homepage/homepage-copy.md

export const siteConfig = {
  brand: {
    name: "Spark",
    tagline: "Your Growth Partner in Lakeland",
    email: "grant@startwithspark.com",
    domain: "startwithspark.com",
    location: "Lakeland, FL",
  },

  hero: {
    headline: "Your Growth Partner in Lakeland",
    subhead:
      "Strategy, education, and execution — built around your business. We don't just deliver marketing. We make sure you understand every decision, every dollar, and every result. That's what a partner does.",
    ctaText: "Book a Discovery Call",
    ctaUrl: "#contact",
  },

  services: {
    sectionHeader: "How We Help You Grow",
    items: [
      {
        title: "Websites",
        description:
          "Custom-built sites that work as hard as you do. No templates. No mystery. You'll understand what you're getting and why.",
        icon: "globe",
      },
      {
        title: "Social Media",
        description:
          "Strategy and content that sounds like you, not a bot. Nicole brings university-level marketing science to your Instagram and Facebook.",
        icon: "megaphone",
      },
      {
        title: "SEO & AI",
        description:
          "Get found on Google — and stay found. We use AI tools to keep your content fresh and your rankings climbing.",
        icon: "search",
      },
      {
        title: "Paid Ads",
        description:
          "Google and Meta ads managed by people who explain what's working, what's not, and where your money goes.",
        icon: "chart",
      },
      {
        title: "Brand & Creative",
        description:
          "Logo, materials, and visual identity that reflect who you actually are. Amber brings the creative vision.",
        icon: "palette",
      },
      {
        title: "Strategy Sessions",
        description:
          "Not ready for a full engagement? Start with a focused session. Walk away with a plan you understand and can act on.",
        icon: "lightbulb",
      },
    ],
  },

  midBanner: {
    tagline: "Educate. Empower. Encourage.",
    subtext:
      "We believe the more you understand your marketing, the more you value what it does.",
    ctaText: "See How We Work",
    ctaUrl: "#about",
  },

  about: {
    sectionHeader: "Why Spark?",
    body: [
      "Most agencies hand you a deliverable and disappear. We sit down, explain what we're building, and make sure you understand why. That's not a sales pitch — it's how Grant has worked since 2004, and it's why Nicole teaches marketing at Southeastern University instead of just doing it.",
      "Our team combines 20+ years of technical depth, academic marketing science, and creative production. But the real difference is simpler than that: we're Lakeland people building for Lakeland businesses. We're not going anywhere.",
    ],
  },

  ctaBanner: {
    headline: "Ready to Grow With a Team That Explains the Playbook?",
    ctaText: "Book a Discovery Call",
    ctaUrl: "#contact",
  },

  contact: {
    sectionHeader: "Start the Conversation",
    subtext:
      "No pressure, no jargon. Tell us where you are and where you want to be. We'll tell you honestly what it takes to get there.",
  },

  footer: {
    tagline:
      "Spark — Growth partner for small businesses in Lakeland, FL.",
    subtext:
      "A Professor of Marketing. 20+ years of tech. Creative that connects.",
  },
} as const;
