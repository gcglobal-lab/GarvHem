import type { LEAD_SERVICES } from "@/lib/validators/lead-options";

export type LeadServiceName = (typeof LEAD_SERVICES)[number];
export type ServiceIcon = "globe" | "calculator" | "cloud" | "monitor" | "compass" | "users" | "sparkles";
export type ServiceSlug =
  | "web-development"
  | "accounting-bookkeeping"
  | "cloud-services"
  | "it-support"
  | "it-consulting"
  | "dedicated-offshore-talent"
  | "custom-requirements";

export type Service = {
  slug: ServiceSlug;
  name: string;
  shortName: string;
  icon: ServiceIcon;
  /** Option that is preselected in the enquiry form */
  leadService: LeadServiceName;
  /** One line for cards and menus */
  summary: string;
  metaTitle: string;
  metaDescription: string;
  headline: string;
  intro: string;
  /** What is included */
  scope: { title: string; text: string }[];
  /** Who it suits */
  fit: string[];
  /** How an engagement runs */
  steps: { title: string; text: string }[];
  engagement: { title: string; text: string }[];
  tools: string[];
  faqs: { question: string; answer: string }[];
  related: ServiceSlug[];
};

export const services: Service[] = [
  {
    slug: "dedicated-offshore-talent",
    name: "Dedicated Offshore Talent",
    shortName: "Dedicated talent",
    icon: "users",
    leadService: "Dedicated Talent",
    summary: "Full-time professionals in India, hired to your exact requirements and managed by us.",
    metaTitle: "Dedicated offshore talent from India",
    metaDescription:
      "Hire dedicated professionals in India for the USA and Canada. GARVHEM handles recruiting, HR, payroll, equipment, attendance and daily reports.",
    headline: "Hire 3 to 4 dedicated professionals for the cost of one local hire",
    intro:
      "You tell us the role. We recruit, test and interview in India, you approve the person, and they work only for you. GARVHEM takes care of HR, payroll, equipment, attendance and a report every working day.",
    scope: [
      {
        title: "Recruiting to your brief",
        text: "We search for your exact skills, tools, hours and budget instead of offering whoever is available.",
      },
      {
        title: "Vetting and interviews",
        text: "Skills tests, English assessment and a structured interview before you see a profile.",
      },
      {
        title: "HR and payroll in India",
        text: "Contracts, salaries, statutory benefits and leave are our job, under Indian law.",
      },
      {
        title: "Equipment and workspace",
        text: "A managed laptop, reliable internet and the software access your role needs.",
      },
      {
        title: "Attendance and reporting",
        text: "Working hours are recorded and you receive a written report each day.",
      },
      {
        title: "Continuity",
        text: "Leave cover planning, documented handovers and replacement if the fit is wrong.",
      },
    ],
    fit: [
      "Local hiring is slow, or the salary is out of reach",
      "You need a person every day, not a project",
      "You want to direct the work and skip the HR",
      "You plan to grow one role into a team",
    ],
    steps: [
      { title: "Brief", text: "A 30 minute call about the role, must-have skills, hours and budget." },
      { title: "Shortlist", text: "We send tested profiles with notes from our interviews." },
      { title: "Approve", text: "You interview and choose. Nobody starts without your yes." },
      { title: "Start", text: "NDA, contract, laptop and access are ready on day one." },
      { title: "Run", text: "Daily reports, recorded hours and one GARVHEM contact for everything." },
    ],
    engagement: [
      { title: "Full time", text: "40 hours a week, dedicated to you, with the overlap you choose." },
      { title: "Part time", text: "20 hours a week for roles that do not fill a day yet." },
      { title: "Team", text: "Several roles with a lead who coordinates the work." },
    ],
    tools: ["Slack", "Microsoft Teams", "Zoom", "Jira", "Asana", "Google Workspace", "Microsoft 365"],
    faqs: [
      {
        question: "Who manages the person day to day?",
        answer:
          "You set the priorities, as you would with a local employee. We manage employment, attendance, performance follow-up and anything administrative.",
      },
      {
        question: "Are they shared with other clients?",
        answer: "No. A full-time dedicated professional works only for you during contracted hours.",
      },
      {
        question: "Who owns the work?",
        answer: "You do. Intellectual property is assigned to you in the service agreement.",
      },
    ],
    related: ["web-development", "accounting-bookkeeping", "it-support"],
  },
  {
    slug: "web-development",
    name: "Website & Web App Development",
    shortName: "Web development",
    icon: "globe",
    leadService: "Website & Web App Development",
    summary: "Business sites, online stores, custom web apps and the care they need after launch.",
    metaTitle: "Website and web app development",
    metaDescription:
      "Business websites, e-commerce, custom web apps, landing pages and maintenance for companies in the USA and Canada, built by GARVHEM in India.",
    headline: "Websites and web apps that load fast and earn their keep",
    intro:
      "We design, build and look after websites for companies that need them to work: to bring in enquiries, sell products or run part of the business. Fixed scope, fixed price and a staging link you can open any day.",
    scope: [
      {
        title: "Business websites",
        text: "Clear structure, strong copy layout and a CMS your team can edit without calling a developer.",
      },
      {
        title: "E-commerce",
        text: "Shopify, WooCommerce or headless stores with payments, shipping and tax configured.",
      },
      {
        title: "Custom web apps",
        text: "Portals, dashboards, booking and internal tools on React, Next.js and Node.",
      },
      {
        title: "Landing pages",
        text: "Focused pages for campaigns, with analytics and form tracking in place.",
      },
      {
        title: "Maintenance",
        text: "Updates, backups, uptime checks, security patches and small changes every month.",
      },
      {
        title: "Speed and accessibility",
        text: "Core Web Vitals, WCAG AA and technical SEO treated as part of the build.",
      },
    ],
    fit: [
      "Your site is slow, dated or hard to update",
      "You are launching a product or an online store",
      "A spreadsheet has become a system and needs an app",
      "Your agency needs a reliable build partner",
    ],
    steps: [
      {
        title: "Scope",
        text: "We list pages, features and integrations, then give a fixed quote and timeline.",
      },
      { title: "Design", text: "Wireframes first, then the visual design, reviewed with you on calls." },
      { title: "Build", text: "Weekly demos on a private staging link. Changes are cheap while we build." },
      { title: "Launch", text: "Testing on real devices, redirects, analytics and a training session." },
      { title: "Care", text: "A monthly plan, or a clean handover of code and accounts to your team." },
    ],
    engagement: [
      { title: "Fixed-price project", text: "Best when the scope is clear, such as a site or a store." },
      { title: "Monthly care plan", text: "Updates, fixes and improvements for a flat fee." },
      {
        title: "Dedicated developer",
        text: "A full-time developer in your team when the roadmap never ends.",
      },
    ],
    tools: [
      "React",
      "Next.js",
      "TypeScript",
      "Node.js",
      "WordPress",
      "Shopify",
      "PostgreSQL",
      "Tailwind CSS",
    ],
    faqs: [
      {
        question: "Who owns the code and the domain?",
        answer: "You do. Code, design files, domain and hosting accounts are in your name.",
      },
      {
        question: "Can you take over an existing site?",
        answer:
          "Yes. We start with a short audit of the code, hosting and plugins, then agree what to fix first.",
      },
    ],
    related: ["cloud-services", "dedicated-offshore-talent", "it-consulting"],
  },
  {
    slug: "accounting-bookkeeping",
    name: "Accounting & Bookkeeping",
    shortName: "Accounting",
    icon: "calculator",
    leadService: "Accounting & Bookkeeping",
    summary: "Clean monthly books, AP and AR, reconciliation and reports in QuickBooks or Xero.",
    metaTitle: "Accounting and bookkeeping services",
    metaDescription:
      "Bookkeeping, accounts payable and receivable, reconciliation, payroll support and reporting in QuickBooks and Xero for US and Canadian businesses.",
    headline: "Books that are closed on time, every month",
    intro:
      "A bookkeeper in our team records, reconciles and reports, so you or your CPA open a file that is already clean. We work inside your QuickBooks or Xero and document every assumption.",
    scope: [
      { title: "Daily bookkeeping", text: "Transactions coded, receipts attached and bank feeds cleared." },
      {
        title: "Accounts payable",
        text: "Bills entered, matched and queued for your approval. You release the payments.",
      },
      {
        title: "Accounts receivable",
        text: "Invoices sent, payments applied and polite follow-up on overdue accounts.",
      },
      {
        title: "Reconciliation",
        text: "Banks, cards, loans, payment processors and clearing accounts, each month.",
      },
      {
        title: "Payroll support",
        text: "Timesheet collection, data preparation and entries for your payroll provider.",
      },
      {
        title: "Reporting",
        text: "P&L, balance sheet, cash flow and the handful of numbers you want to watch.",
      },
    ],
    fit: [
      "The books are months behind",
      "Your CPA bills you for clean-up work",
      "You run several entities or locations",
      "Your accounting firm needs processing capacity",
    ],
    steps: [
      { title: "Review", text: "A read-only look at your file, with a list of what needs fixing." },
      { title: "Clean up", text: "Past periods corrected and reconciled to statements." },
      {
        title: "Set the calendar",
        text: "Weekly tasks, month-end date and approval rules, agreed in writing.",
      },
      { title: "Run", text: "Your bookkeeper works in your file and reports daily." },
      { title: "Close", text: "A month-end pack with open questions, sent to you and your CPA." },
    ],
    engagement: [
      { title: "Monthly bookkeeping", text: "A flat fee based on accounts and transaction volume." },
      { title: "Catch-up project", text: "A fixed price to bring old periods up to date." },
      { title: "Dedicated accountant", text: "A full-time person for higher volume or several entities." },
    ],
    tools: ["QuickBooks Online", "Xero", "Excel", "Google Sheets", "Bill.com", "Gusto", "Dext", "Stripe"],
    faqs: [
      {
        question: "Do you file taxes?",
        answer: "No. We prepare clean records and work with your CPA or tax preparer, who files for you.",
      },
      {
        question: "Can you move money from our accounts?",
        answer: "No. We prepare payments and you approve and release them.",
      },
    ],
    related: ["dedicated-offshore-talent", "it-support", "it-consulting"],
  },
  {
    slug: "cloud-services",
    name: "Cloud Services",
    shortName: "Cloud",
    icon: "cloud",
    leadService: "Cloud Services",
    summary: "AWS, Azure and Google Cloud: setup, migration, DevOps, monitoring and lower bills.",
    metaTitle: "Cloud services on AWS, Azure and Google Cloud",
    metaDescription:
      "Cloud setup, migration, DevOps, monitoring and cost optimization on AWS, Azure and Google Cloud for US and Canadian companies.",
    headline: "Cloud that is secure, watched and not overpriced",
    intro:
      "We set up cloud accounts properly, move workloads with a rollback plan, automate deployments and keep an eye on uptime and spend. Everything is written down and in code, so you are never locked to us.",
    scope: [
      {
        title: "Account setup",
        text: "Landing zones, identity, networking and backups configured to a documented baseline.",
      },
      { title: "Migration", text: "Servers, databases and files moved in stages, tested, with a way back." },
      {
        title: "DevOps",
        text: "Infrastructure as code, CI/CD pipelines, containers and environments that match.",
      },
      { title: "Monitoring", text: "Metrics, logs and alerts with clear rules for who responds and how." },
      {
        title: "Cost optimization",
        text: "Right-sizing, storage tiers, reservations and the removal of things nobody uses.",
      },
      { title: "Security basics", text: "MFA, least privilege, patching, secrets and encrypted backups." },
    ],
    fit: [
      "Your cloud bill keeps growing and nobody can say why",
      "Deployments are manual and stressful",
      "You are leaving an old server or a hosting company",
      "Nobody is watching production at night",
    ],
    steps: [
      { title: "Assess", text: "Read-only review of accounts, architecture, spend and risk." },
      { title: "Plan", text: "Target design, order of work, cost estimate and rollback steps." },
      { title: "Build", text: "Infrastructure in code, reviewed by you before it is applied." },
      { title: "Move", text: "Staged cutover at a quiet hour, with checks at each step." },
      { title: "Operate", text: "Monitoring, patching and a monthly report on uptime and cost." },
    ],
    engagement: [
      { title: "Migration project", text: "Fixed scope and price after the assessment." },
      { title: "Managed cloud", text: "Monitoring and operations for a monthly fee." },
      { title: "Dedicated engineer", text: "A cloud or DevOps engineer inside your team." },
    ],
    tools: [
      "AWS",
      "Microsoft Azure",
      "Google Cloud",
      "Terraform",
      "Docker",
      "Kubernetes",
      "GitHub Actions",
      "Grafana",
    ],
    faqs: [
      {
        question: "Who owns the cloud account?",
        answer: "You do. We work through roles that you grant and can revoke.",
      },
      {
        question: "Can you help with a one-time cost review?",
        answer:
          "Yes. It is a short, fixed-price piece of work that ends with a ranked list of changes and expected effect.",
      },
    ],
    related: ["web-development", "it-consulting", "dedicated-offshore-talent"],
  },
  {
    slug: "it-support",
    name: "Computer Operations & IT Support",
    shortName: "IT support",
    icon: "monitor",
    leadService: "Computer Operations & IT Support",
    summary: "Remote IT support, system administration, back-office operations and data processing.",
    metaTitle: "IT support and computer operations",
    metaDescription:
      "Remote IT support, system administration, back-office computer operations, data entry and processing for teams in the USA and Canada.",
    headline: "The daily computer work, handled",
    intro:
      "Help desk tickets, new laptops, user accounts, spreadsheets, forms and records: the work that keeps a company running and takes the most time. Our team does it remotely, in your hours, with a log of everything completed.",
    scope: [
      {
        title: "Remote help desk",
        text: "Chat, email and phone support for staff, with tickets and response targets.",
      },
      {
        title: "System administration",
        text: "Microsoft 365, Google Workspace, users, devices, patches and backups.",
      },
      {
        title: "Back-office operations",
        text: "Order processing, document handling, CRM updates and routine portals.",
      },
      { title: "Data entry", text: "High-volume, checked entry from scans, email, PDFs and web forms." },
      { title: "Data processing", text: "Cleaning, de-duplication, formatting and scheduled reports." },
      {
        title: "Onboarding and offboarding",
        text: "Accounts, permissions and equipment checklists on the right day.",
      },
    ],
    fit: [
      "Your best people reset passwords all day",
      "Records pile up faster than they are entered",
      "You need help desk cover in your evening hours",
      "There is no IT person, or only one",
    ],
    steps: [
      { title: "Map", text: "We list your tools, volumes and the tasks that repeat." },
      { title: "Document", text: "Written procedures, agreed with you, for each task." },
      { title: "Access", text: "Named accounts with the minimum permissions required." },
      { title: "Pilot", text: "Two weeks on part of the work, with quality checks." },
      { title: "Run", text: "Daily logs, response times and a monthly review." },
    ],
    engagement: [
      { title: "Shared help desk", text: "A monthly plan sized to your number of users." },
      { title: "Processing by volume", text: "Priced per record, document or hour." },
      { title: "Dedicated specialist", text: "Someone who learns your systems and stays." },
    ],
    tools: [
      "Microsoft 365",
      "Google Workspace",
      "Windows",
      "macOS",
      "Intune",
      "Zendesk",
      "Freshdesk",
      "Excel",
    ],
    faqs: [
      {
        question: "Can you cover our evenings or weekends?",
        answer:
          "Yes. Evening in North America is daytime in India, so after-hours cover is straightforward to arrange.",
      },
      {
        question: "How do you check accuracy?",
        answer:
          "Sample checks on every batch, double entry where errors are costly, and an error log you can see.",
      },
    ],
    related: ["it-consulting", "dedicated-offshore-talent", "cloud-services"],
  },
  {
    slug: "it-consulting",
    name: "IT / Computer Consulting",
    shortName: "IT consulting",
    icon: "compass",
    leadService: "IT / Computer Consulting",
    summary: "Technology strategy, audits, tool selection and a practical plan to modernize.",
    metaTitle: "IT and computer consulting",
    metaDescription:
      "Technology strategy, IT audits, software selection and digital transformation planning for small and mid-size companies in the USA and Canada.",
    headline: "Straight answers on what to fix, buy and drop",
    intro:
      "We look at your systems, your costs and how work really gets done, then give you a short plan in plain English. No vendor commissions, and no slide deck that ends in a drawer.",
    scope: [
      {
        title: "Technology strategy",
        text: "A 12 month plan that links each project to a cost, a risk or a revenue goal.",
      },
      {
        title: "IT and security audit",
        text: "Accounts, devices, backups, access and licenses, with findings ranked by impact.",
      },
      {
        title: "Tool selection",
        text: "Requirements, shortlist, demos and total cost comparison for software you plan to buy.",
      },
      {
        title: "Process mapping",
        text: "How work moves today, where it stalls and what is worth automating.",
      },
      {
        title: "Digital transformation",
        text: "Moving from paper and spreadsheets to systems people will actually use.",
      },
      { title: "Vendor review", text: "Contracts, renewals and invoices checked against what you use." },
    ],
    fit: [
      "Software costs rise and results do not",
      "You are choosing a CRM, ERP or accounting system",
      "A client or insurer has asked about security",
      "You want an outside opinion before a big decision",
    ],
    steps: [
      { title: "Listen", text: "Short interviews with the people who do the work." },
      { title: "Inspect", text: "Read-only access to systems, licenses and costs." },
      { title: "Rank", text: "Findings scored by impact, effort and risk." },
      { title: "Plan", text: "A written roadmap with owners, budget and order." },
      { title: "Support", text: "We can deliver the work, or stay on as a sounding board." },
    ],
    engagement: [
      { title: "Fixed-price audit", text: "Two to four weeks, ending in a report and a walkthrough." },
      { title: "Advisory retainer", text: "A few hours each month for decisions as they come up." },
      { title: "Delivery", text: "Our teams carry out the plan, with you in control of scope." },
    ],
    tools: ["Microsoft 365", "Google Workspace", "HubSpot", "Zoho", "QuickBooks", "Power BI", "Zapier"],
    faqs: [
      {
        question: "Do you resell software?",
        answer: "No. We do not take commissions, so the recommendation is based on your needs and cost.",
      },
      {
        question: "What do we receive at the end?",
        answer:
          "A written report, a ranked action list with cost and effort, and a call to go through it with your team.",
      },
    ],
    related: ["cloud-services", "it-support", "custom-requirements"],
  },
  {
    slug: "custom-requirements",
    name: "Custom Requirements",
    shortName: "Custom",
    icon: "sparkles",
    leadService: "Custom requirement",
    summary: "Don't see what you need? Tell us. We will say honestly if we can do it.",
    metaTitle: "Custom requirements",
    metaDescription:
      "Need a role, a process or a project that is not on our list? Tell GARVHEM what you need and get a straight answer within 24 hours.",
    headline: "Don't see what you need? Tell us.",
    intro:
      "Plenty of useful work does not fit a service menu. Describe the outcome you want, in your own words. Within 24 hours you will hear whether we can do it, how, and roughly what it would cost.",
    scope: [
      {
        title: "Unusual roles",
        text: "Designers, CAD drafters, researchers, recruiters, coordinators and more.",
      },
      {
        title: "Mixed teams",
        text: "For example a developer, a bookkeeper and an assistant under one agreement.",
      },
      { title: "One-off projects", text: "Migrations, clean-ups, research and document conversion." },
      { title: "Process takeover", text: "We learn a process from your team, document it and run it." },
      { title: "White-label delivery", text: "Work under your brand, for your clients, on your process." },
      { title: "Short-term cover", text: "Extra hands for a season, a launch or a leave of absence." },
    ],
    fit: [
      "You know the outcome but not the job title",
      "The work crosses several departments",
      "Other providers said it was too small or too odd",
      "You want to test an idea before hiring",
    ],
    steps: [
      { title: "Describe", text: "A few sentences and any files that help." },
      { title: "Answer", text: "Yes, no or partly, within 24 hours, with reasons." },
      { title: "Shape", text: "A short call to agree scope, people and price." },
      { title: "Trial", text: "A small first piece, so you can judge the quality." },
      { title: "Scale", text: "Continue, change or stop. Your choice." },
    ],
    engagement: [
      { title: "Trial project", text: "A small, fixed-price first step." },
      { title: "Monthly", text: "A flat fee for ongoing work or people." },
      { title: "Hourly", text: "For work that is hard to size in advance." },
    ],
    tools: [],
    faqs: [
      {
        question: "Is anything too small?",
        answer: "Rarely. If it is not worth doing through us, we will tell you.",
      },
      {
        question: "What will you turn down?",
        answer: "Work we cannot do well, and anything illegal, deceptive or unsafe for your data.",
      },
    ],
    related: ["dedicated-offshore-talent", "it-consulting", "web-development"],
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
export const flagship = services[0]!;
/** Just what the navigation needs: the full copy must not reach the browser bundle. */
export const serviceMenu = services.map(({ slug, name, summary, icon }) => ({ slug, name, summary, icon }));
