export type Position = {
  title: string;
  area: string;
  location: string;
  type: string;
  shift: string;
  summary: string;
  requirements: string[];
};

/** Add, edit or remove entries. With an empty list the page invites general applications. */
export const positions: Position[] = [
  {
    title: "Full-stack developer",
    area: "Web development",
    location: "India, remote or office",
    type: "Full time",
    shift: "Afternoon or evening IST",
    summary: "Build and maintain web applications for clients in the USA and Canada.",
    requirements: [
      "React or Next.js with TypeScript",
      "Node.js and a SQL database",
      "Clear written and spoken English",
      "2+ years of professional work",
    ],
  },
  {
    title: "Accountant, US and Canadian bookkeeping",
    area: "Accounting",
    location: "India, remote or office",
    type: "Full time",
    shift: "Afternoon or evening IST",
    summary: "Own the monthly books for small and mid-size businesses, from bank feeds to month-end reports.",
    requirements: [
      "QuickBooks Online or Xero",
      "AP, AR and bank reconciliation",
      "B.Com, M.Com, CA Inter or similar",
      "Careful, documented work",
    ],
  },
  {
    title: "Cloud and DevOps engineer",
    area: "Cloud services",
    location: "India, remote or office",
    type: "Full time",
    shift: "Flexible, some on-call",
    summary: "Set up, migrate and monitor client workloads on AWS, Azure and Google Cloud.",
    requirements: [
      "One major cloud in production",
      "Terraform or similar, CI/CD, Docker",
      "Monitoring and incident response",
      "Linux administration",
    ],
  },
  {
    title: "IT support specialist",
    area: "Computer operations",
    location: "India, remote or office",
    type: "Full time",
    shift: "Evening or night IST",
    summary:
      "Be the friendly first answer for client staff: devices, accounts, Microsoft 365 and Google Workspace.",
    requirements: [
      "Windows and macOS troubleshooting",
      "Microsoft 365 or Google Workspace admin",
      "Ticketing tools",
      "Fluent spoken English",
    ],
  },
  {
    title: "Back-office and data specialist",
    area: "Computer operations",
    location: "India, remote or office",
    type: "Full time",
    shift: "Day, afternoon or evening IST",
    summary: "Accurate data entry, document processing and admin support for dedicated clients.",
    requirements: [
      "Fast, accurate typing",
      "Excel or Google Sheets",
      "Good written English",
      "Attention to detail",
    ],
  },
];
