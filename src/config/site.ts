import type {
  AppRole,
  ContentStatus,
  EventCategory,
  HelpRequestType,
  PostCategory,
  ProductStatus,
  ReportStatus,
  ReportTarget,
  WeekDay,
} from "@/types";

export const siteConfig = {
  name: "INHACA CONNECT",
  shortName: "Inhaca",
  slogan: "A ilha conectada. Uma comunidade, um destino.",
  description:
    "Plataforma digital da Ilha de Inhaca, Moçambique: turismo, negócios locais, mapa interativo, feed comunitário, agenda, mercado e chat.",
  locale: "pt-MZ",
  themeColor: "#153E42",
  /** Centro aproximado da Ilha de Inhaca (Baía de Maputo). */
  island: {
    center: { lat: -26.0, lng: 32.925 },
    bounds: {
      // [oeste, sul, leste, norte]
      bbox: [32.84, -26.1, 33.02, -25.92] as [number, number, number, number],
    },
    defaultZoom: 11.6,
  },
};

export const brandColors = {
  ocean: "#153E42",
  turquoise: "#20A6A0",
  sand: "#E6B96A",
  naturalWhite: "#F5F7F4",
};

export const mainNav = [
  { href: "/", label: "Início" },
  { href: "/descobrir", label: "Descobrir" },
  { href: "/mapa", label: "Mapa" },
  { href: "/feed", label: "Feed" },
  { href: "/servicos", label: "Serviços" },
  { href: "/agenda", label: "Agenda" },
  { href: "/mercado", label: "Mercado" },
  { href: "/comunidade", label: "Comunidade" },
];

export const roleLabels: Record<AppRole, string> = {
  visitor: "Visitante",
  resident: "Habitante",
  business_owner: "Prestador de serviços",
  seller: "Vendedor",
  event_organizer: "Organizador",
  moderator: "Moderador",
  admin: "Administrador",
};

export const postCategoryLabels: Record<PostCategory, string> = {
  noticia: "Notícia",
  aviso: "Aviso",
  evento: "Evento",
  emprego: "Emprego",
  turismo: "Turismo",
  comercio: "Comércio",
  transporte: "Transportes",
  comunidade: "Comunidade",
  outro: "Outro",
};

export const eventCategoryLabels: Record<EventCategory, string> = {
  festa: "Festa",
  cultura: "Cultura",
  desporto: "Desporto",
  turismo: "Turismo",
  comunidade: "Comunidade",
  religioso: "Religioso",
  mercado: "Feira / Mercado",
  outro: "Outro",
};

export const helpRequestTypeLabels: Record<HelpRequestType, string> = {
  transporte: "Transporte",
  produto: "Produto",
  servico: "Serviço",
  assistencia: "Assistência",
  emprego: "Emprego",
  outro: "Outro",
};

export const contentStatusLabels: Record<ContentStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  suspended: "Suspenso",
};

export const productStatusLabels: Record<ProductStatus, string> = {
  active: "Disponível",
  sold_out: "Esgotado",
  suspended: "Suspenso",
  archived: "Arquivado",
};

export const reportStatusLabels: Record<ReportStatus, string> = {
  open: "Aberta",
  reviewing: "Em análise",
  resolved: "Resolvida",
  dismissed: "Arquivada",
};

export const reportTargetLabels: Record<ReportTarget, string> = {
  post: "Publicação",
  comment: "Comentário",
  message: "Mensagem",
  business: "Estabelecimento",
  product: "Produto",
  event: "Evento",
  profile: "Perfil",
  help_request: "Pedido de ajuda",
};

export const reportReasons = [
  { value: "spam", label: "Spam ou publicidade enganosa" },
  { value: "offensive", label: "Conteúdo ofensivo ou discurso de ódio" },
  { value: "false_info", label: "Informação falsa" },
  { value: "scam", label: "Burla ou fraude" },
  { value: "inappropriate", label: "Conteúdo inapropriado" },
  { value: "other", label: "Outro motivo" },
];

export const weekDays: { key: WeekDay; label: string; short: string }[] = [
  { key: "mon", label: "Segunda-feira", short: "Seg" },
  { key: "tue", label: "Terça-feira", short: "Ter" },
  { key: "wed", label: "Quarta-feira", short: "Qua" },
  { key: "thu", label: "Quinta-feira", short: "Qui" },
  { key: "fri", label: "Sexta-feira", short: "Sex" },
  { key: "sat", label: "Sábado", short: "Sáb" },
  { key: "sun", label: "Domingo", short: "Dom" },
];

export const amenityOptions = [
  "Wi-Fi",
  "Estacionamento",
  "Acesso à praia",
  "Restaurante",
  "Bar",
  "Piscina",
  "Ar condicionado",
  "Pequeno-almoço",
  "Aceita cartão",
  "Aceita M-Pesa",
  "Transfer do cais",
  "Acessível",
  "Família",
  "Pet friendly",
];

export const PAGE_SIZE = 12;
