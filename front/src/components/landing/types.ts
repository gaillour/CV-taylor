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

export interface ComparisonItem {
  category: string;
  generic: {
    badPractice: string;
    detail: string;
  };
  tailored: {
    goodPractice: string;
    detail: string;
  };
}

export interface WorkflowStep {
  number: string;
  title: string;
  description: string;
  badge: string;
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

export interface MirrorTriptychWingData {
  title: string;
  subtitle: string;
  badge: string;
  comparisons: {
    baseLabel: string;
    baseText: string;
    mirrorLabel: string;
    mirrorText: string;
    note: string;
  }[];
}

