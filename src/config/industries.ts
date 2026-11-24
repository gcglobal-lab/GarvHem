export type Industry = {
  slug: string;
  name: string;
  summary: string;
  tasks: string[];
  detail: string;
  services: string[];
};

/** `services` are slugs from services.ts */
export const industries: Industry[] = [
  {
    slug: "saas",
    name: "SaaS and software",
    summary: "Engineering capacity, cloud operations and customer support.",
    detail:
      "Product teams come to us when the backlog grows faster than the hiring budget. We add developers, QA, cloud engineers and support staff who work in your sprint, your repository and your chat channels.",
    tasks: [
      "Feature development and QA",
      "CI/CD and cloud cost reviews",
      "Tier 1 and 2 product support",
      "Documentation and release notes",
    ],
    services: ["dedicated-offshore-talent", "web-development", "cloud-services"],
  },
  {
    slug: "ecommerce",
    name: "E-commerce and retail",
    summary: "Storefronts, catalogue work, order processing and reconciliation.",
    detail:
      "Online stores have a long tail of daily work: listings, stock updates, refunds, payouts. We build and maintain the storefront and take on the operations behind it.",
    tasks: [
      "Shopify and WooCommerce builds",
      "Product listing and catalogue updates",
      "Order and returns processing",
      "Payout and sales tax reconciliation",
    ],
    services: ["web-development", "it-support", "accounting-bookkeeping"],
  },
  {
    slug: "healthcare",
    name: "Healthcare administration",
    summary: "Back-office support for clinics, practices and billing teams.",
    detail:
      "We support the administrative side only: scheduling, data entry, billing follow-up and reporting. Scope and access are agreed first, and we follow your compliance rules for any protected information.",
    tasks: [
      "Appointment and records data entry",
      "Billing and claims follow-up",
      "Vendor bills and payroll support",
      "Help desk for front-office staff",
    ],
    services: ["it-support", "accounting-bookkeeping", "dedicated-offshore-talent"],
  },
  {
    slug: "finance",
    name: "Finance and accounting firms",
    summary: "Bookkeepers and processing capacity for busy season and beyond.",
    detail:
      "CPA firms and bookkeeping practices use dedicated staff to handle the preparation work, so local teams can spend their hours on review and client advice.",
    tasks: [
      "Bookkeeping and bank reconciliation",
      "AP, AR and month-end checklists",
      "Workpaper and report preparation",
      "Data clean-up and migrations",
    ],
    services: ["accounting-bookkeeping", "dedicated-offshore-talent", "it-support"],
  },
  {
    slug: "real-estate",
    name: "Real estate and property",
    summary: "Listings, transaction support, rent rolls and owner statements.",
    detail:
      "Brokerages and property managers run on documents and deadlines. A dedicated coordinator keeps listings current, files complete and statements on time.",
    tasks: [
      "MLS and listing updates",
      "Lease and document administration",
      "Rent roll and owner statements",
      "Property websites and CRM upkeep",
    ],
    services: ["dedicated-offshore-talent", "accounting-bookkeeping", "web-development"],
  },
  {
    slug: "agencies",
    name: "Agencies and consultancies",
    summary: "White-label delivery when client work outgrows the team.",
    detail:
      "Marketing, design and IT agencies use us as a quiet delivery partner. We work to your process and brand, and you keep the client relationship.",
    tasks: [
      "White-label web development",
      "Landing pages and campaign builds",
      "Website care plans",
      "Reporting and admin support",
    ],
    services: ["web-development", "dedicated-offshore-talent", "custom-requirements"],
  },
  {
    slug: "logistics",
    name: "Logistics and field services",
    summary: "Dispatch support, data processing and invoicing.",
    detail:
      "Freight, trades and field-service companies need the paperwork to keep pace with the trucks. We cover the desk work, including evening hours in North America.",
    tasks: [
      "Load and job data entry",
      "Dispatch and scheduling support",
      "Invoicing and collections follow-up",
      "Remote IT support for field teams",
    ],
    services: ["it-support", "accounting-bookkeeping", "dedicated-offshore-talent"],
  },
  {
    slug: "professional-services",
    name: "Legal and professional services",
    summary: "Administrative, finance and IT support with confidentiality built in.",
    detail:
      "Firms that bill by the hour lose money on admin. We take on document processing, billing support and IT, under NDA and with access limited to what the task needs.",
    tasks: [
      "Document formatting and intake",
      "Time and billing support",
      "IT help desk and device upkeep",
      "Research and spreadsheet work",
    ],
    services: ["it-support", "it-consulting", "custom-requirements"],
  },
];
