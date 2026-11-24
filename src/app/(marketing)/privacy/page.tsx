import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/LegalPage";
import { pageMeta } from "@/components/marketing/seo";
import { getPublicCompany } from "@/server/settings";

export const metadata: Metadata = pageMeta({
  title: "Privacy policy",
  description:
    "What personal information GARVHEM collects, why, how long we keep it and the choices you have.",
  path: "/privacy",
});

export default async function PrivacyPage() {
  const { email } = await getPublicCompany();
  const contact = email ? (
    <a href={`mailto:${email}`}>{email}</a>
  ) : (
    <Link href="/contact">our contact page</Link>
  );
  const sections: LegalSection[] = [
    {
      id: "who",
      title: "Who we are",
      body: (
        <p>
          GARVHEM is a technology and business services company based in India. This policy covers this
          website, enquiries, job applications and the employee portal. Questions can be sent to {contact}.
        </p>
      ),
    },
    {
      id: "collect",
      title: "What we collect",
      body: (
        <ul>
          <li>
            Enquiries: name, work email, phone, company, country, the services you select, your message and
            any file you attach.
          </li>
          <li>
            Technical data sent with an enquiry: IP address, browser type and the page you wrote from, used to
            prevent abuse.
          </li>
          <li>Job applications: the details and CV you email to us.</li>
          <li>Employees: account, attendance, leave, task and report records in the portal.</li>
        </ul>
      ),
    },
    {
      id: "use",
      title: "How we use it",
      body: (
        <ul>
          <li>To answer your enquiry and prepare a quote.</li>
          <li>To provide services under an agreement with you or your company.</li>
          <li>To assess job applications and manage employment.</li>
          <li>To keep our systems secure and meet legal duties.</li>
        </ul>
      ),
    },
    {
      id: "basis",
      title: "Legal basis",
      body: (
        <p>
          We rely on your consent when you send the enquiry form, on steps taken before or under a contract,
          on legal obligations, and on our legitimate interest in running a secure business. You can withdraw
          consent at any time.
        </p>
      ),
    },
    {
      id: "share",
      title: "Who we share it with",
      body: (
        <p>
          We do not sell personal information. We use service providers for hosting, database, file storage
          and email delivery, who process data only on our instructions. We may disclose information when the
          law requires it.
        </p>
      ),
    },
    {
      id: "transfer",
      title: "International transfers",
      body: (
        <p>
          We operate from India and serve clients in other countries, so information may be processed in India
          and in the countries where our providers host data. We apply contractual and technical safeguards to
          these transfers.
        </p>
      ),
    },
    {
      id: "keep",
      title: "How long we keep it",
      body: (
        <p>
          Enquiries are kept for up to 24 months after our last contact, unless you become a client or ask us
          to delete them sooner. Contract, accounting and employment records are kept for the period required
          by law.
        </p>
      ),
    },
    {
      id: "security",
      title: "Security",
      body: (
        <p>
          We use encryption in transit, access control, private file storage, audit logs and staff
          confidentiality agreements. No system is perfect, and we will notify affected people and authorities
          of a breach where the law requires it.
        </p>
      ),
    },
    {
      id: "cookies",
      title: "Cookies",
      body: (
        <p>
          This website does not use advertising or analytics cookies. The employee portal uses essential
          cookies to keep staff signed in. If a security check is enabled on the enquiry form, it is provided
          by Cloudflare Turnstile.
        </p>
      ),
    },
    {
      id: "rights",
      title: "Your choices and rights",
      body: (
        <p>
          Depending on where you live, you may ask to access, correct, delete or export your information,
          object to its use, or complain to a regulator. Write to {contact} and we will answer within 30 days.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes",
      body: <p>If this policy changes, we update this page and the date at the top.</p>,
    },
  ];
  return (
    <LegalPage
      title="Privacy policy"
      intro="What we collect, why we collect it and what you can ask us to do with it."
      path="/privacy"
      sections={sections}
    />
  );
}
