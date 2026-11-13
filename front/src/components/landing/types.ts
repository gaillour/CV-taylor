export interface PricingTier {
  id: 'free' | 'pass' | 'lifetime';
  name: string;
  badge?: string;
  tagline: string;
  price: string;
  periodLabel: string;
  isPopular?: boolean;
  ctaText: string;
  ctaHref: string;
  features: string[];
}

export interface MirrorCvData {
  lang: "es" | "en";
  badge: string;
  name: string;
  title: string;
  location: string;
  contact: string;
  summary: string;
  experience: {
    role: string;
    company: string;
    period: string;
    bullets: string[];
  }[];
  skills: string[];
}
