import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/app/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Julia",
  description: "Terms for using Julia.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updatedAt="May 19, 2026"
      intro="These terms describe the basic rules for using Julia. By using the service, you agree to use it responsibly and to review important outputs before acting on them."
    >
      <LegalSection title="Use of Julia">
        <p>
          Julia is a document, reminder, bookkeeping, and assistant tool for
          organizing business administration. You are responsible for the
          information you upload, the instructions you give, and the actions you
          approve.
        </p>
      </LegalSection>

      <LegalSection title="Accounts and Access">
        <p>
          You must keep your account secure and ensure that users invited to a
          workspace are authorized to access that workspace. Actions taken by
          authenticated users or verified connected channels may be treated as
          authorized workspace activity.
        </p>
      </LegalSection>

      <LegalSection title="Documents and Data">
        <p>
          You retain responsibility for documents, records, and other content
          uploaded to Julia. You must have the right to upload and process that
          content and must not use Julia to store unlawful, harmful, or
          unauthorized material.
        </p>
      </LegalSection>

      <LegalSection title="AI and Automation">
        <p>
          Julia may use AI and automation to classify documents, summarize
          records, draft messages, suggest actions, and create reminders. AI and
          automation can make mistakes. You must review important outputs,
          deadlines, filings, financial records, and communications before
          relying on them.
        </p>
      </LegalSection>

      <LegalSection title="No Professional Advice">
        <p>
          Julia does not provide legal, tax, accounting, financial, or other
          professional advice. Any suggestions, summaries, drafts, or checklists
          are for administrative assistance only. Consult a qualified
          professional where needed.
        </p>
      </LegalSection>

      <LegalSection title="Integrations and Messaging">
        <p>
          If you connect WhatsApp, email, calendars, storage, accounting tools,
          or other integrations, Julia may send and receive information through
          those services as needed to provide requested features. You are
          responsible for complying with the terms and policies of connected
          services.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable Use">
        <p>
          You must not misuse Julia, interfere with the service, attempt to
          access data without permission, use it to send spam or unlawful
          messages, or use automation in a way that harms other people or
          systems.
        </p>
      </LegalSection>

      <LegalSection title="Availability and Changes">
        <p>
          Julia may change, pause, or discontinue features over time. The
          service may be unavailable during maintenance, provider outages, or
          unexpected incidents.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Julia is provided without
          warranties and is not liable for indirect, incidental, special,
          consequential, or punitive damages, or for losses caused by incorrect
          user data, third-party services, or unreviewed AI output.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For questions about these terms, contact the Julia workspace owner or
          the support contact provided with your Julia deployment.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
