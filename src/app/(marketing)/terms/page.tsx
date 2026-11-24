import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/LegalPage";
import { pageMeta } from "@/components/marketing/seo";
import { getPublicCompany } from "@/server/settings";

export const metadata: Metadata = pageMeta({
  title: "Terms of use",
  description: "The terms that apply to this website and how they relate to GARVHEM service agreements.",
  path: "/terms",
});

export default async function TermsPage() {
  const { email } = await getPublicCompany();
  const sections: LegalSection[] = [
    {
      id: "about",
      title: "About these terms",
      body: (
        <p>
          These terms apply to this website. By using it you accept them. Paid services are covered by a
          separate written agreement, which takes priority over this page.
        </p>
      ),
    },
    {
      id: "information",
      title: "Information on this site",
      body: (
        <p>
          We work to keep the content accurate, but it is general information and not an offer. Scope, prices
          and dates are confirmed only in a written quote or agreement.
        </p>
      ),
    },
    {
      id: "estimates",
      title: "Calculator and cost figures",
      body: (
        <p>
          Savings, rates and comparisons are illustrative estimates. They depend on role, experience, location
          and requirements. They are not financial, tax or legal advice.
        </p>
      ),
    },
    {
      id: "enquiries",
      title: "Enquiries and attachments",
      body: (
        <p>
          Please send only information you are allowed to share, and leave out passwords, payment card data
          and sensitive personal records. Sending an enquiry does not create a contract.
        </p>
      ),
    },
    {
      id: "use",
      title: "Acceptable use",
      body: (
        <ul>
          <li>Do not try to break, overload or gain unauthorised access to the site or portal.</li>
          <li>Do not upload harmful files or use the forms for spam.</li>
          <li>Do not copy the site to mislead others.</li>
        </ul>
      ),
    },
    {
      id: "portal",
      title: "Employee portal",
      body: (
        <p>
          The portal is for GARVHEM staff only. Accounts are personal. Activity is recorded for security and
          payroll.
        </p>
      ),
    },
    {
      id: "ip",
      title: "Intellectual property",
      body: (
        <p>
          The GARVHEM name, logo, design and content belong to GARVHEM. Product and company names mentioned on
          this site belong to their owners and do not imply endorsement.
        </p>
      ),
    },
    {
      id: "links",
      title: "Links to other sites",
      body: (
        <p>
          Other websites have their own terms and privacy policies. We are not responsible for their content.
        </p>
      ),
    },
    {
      id: "liability",
      title: "Liability",
      body: (
        <p>
          The site is provided as it is. To the extent the law allows, GARVHEM is not liable for indirect loss
          arising from its use. Nothing here limits liability that cannot be limited by law.
        </p>
      ),
    },
    {
      id: "law",
      title: "Governing law",
      body: (
        <p>
          These terms are governed by the laws of India, and its courts have jurisdiction, unless a mandatory
          law in your country says otherwise.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes and contact",
      body: (
        <p>
          We may update these terms and will change the date above. Questions:{" "}
          {email ? <a href={`mailto:${email}`}>{email}</a> : <Link href="/contact">contact us</Link>}.
        </p>
      ),
    },
  ];
  return (
    <LegalPage
      title="Terms of use"
      intro="The short rules for using this website."
      path="/terms"
      sections={sections}
    />
  );
}
