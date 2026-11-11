import { PricingTier } from "@/components/landing/types";

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Comunidad",
    tagline: "Para crear tu primer CV.",
    price: "$0",
    periodLabel: "Gratis · siempre",
    ctaText: "Seguir gratis",
    ctaHref: "/editor",
    features: [
      "Perfil maestro y todas las plantillas",
      "PDF ilimitados · snapshots en la nube",
      "2 pruebas de adaptación · open source",
    ],
  },
  {
    id: "pass",
    name: "Pase activo",
    badge: "Recomendado",
    tagline: "Para tu próxima búsqueda.",
    price: "$9",
    periodLabel: "USD · un pago · 90 días",
    isPopular: true,
    ctaText: "Elegir pase",
    ctaHref: "/editor",
    features: [
      "Todo lo de Comunidad",
      "Adaptaciones IA ilimitadas",
      "Keywords alineadas a cada oferta",
      "Sin renovación automática",
    ],
  },
  {
    id: "lifetime",
    name: "De por vida",
    tagline: "Un pago. Siempre tuyo.",
    price: "$29",
    periodLabel: "USD · acceso de por vida",
    ctaText: "Elegir acceso",
    ctaHref: "/editor",
    features: [
      "Acceso completo para siempre",
      "Adaptaciones IA ilimitadas",
      "Soporte prioritario · plantillas nuevas primero",
    ],
  },
];
