import { PricingTier } from "@/components/landing/types";

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Comunidad",
    tagline: "Para quienes priorizan privacidad, control local y código abierto.",
    price: "$0",
    periodLabel: "Gratis para siempre",
    ctaText: "Comenzar Gratis",
    ctaHref: "/editor",
    features: [
      "Perfil Maestro completo",
      "Edición reactiva y todas las plantillas",
      "Descargas PDF de 1 página ilimitadas",
      "Snapshots ilimitados en la nube",
      "2 adaptaciones IA de prueba a ofertas",
      "Código auditable y open source",
    ],
  },
  {
    id: "pass",
    name: "Pase Búsqueda Activa",
    badge: "Recomendado",
    tagline: "Para postularte con seguridad durante tus meses de búsqueda laboral activa.",
    price: "$9",
    periodLabel: "USD • Pago único por 90 días",
    isPopular: true,
    ctaText: "Obtener Pase Activo",
    ctaHref: "/editor",
    features: [
      "Todo lo incluido en Comunidad",
      "Adaptaciones IA ilimitadas a ofertas",
      "Alineación de requisitos y keywords",
      "Sin renovaciones ni cobros automáticos",
    ],
  },
  {
    id: "lifetime",
    name: "Early Adopter",
    badge: "Cupo Limitado",
    tagline: "Para quienes quieren acceso vitalicio y acompañar el crecimiento del proyecto.",
    price: "$29",
    periodLabel: "USD • Acceso vitalicio de por vida",
    ctaText: "Acceso Lifetime",
    ctaHref: "/editor",
    features: [
      "Acceso vitalicio completo a la plataforma",
      "Adaptaciones IA ilimitadas para siempre",
      "Soporte prioritario y contacto directo",
      "Acceso prioritario a nuevas plantillas",
    ],
  },
];
