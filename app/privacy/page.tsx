import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/app/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Julia",
  description: "How Julia collects, uses, and protects information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updatedAt="May 19, 2026"
      intro="Julia helps users organize documents, deadlines, reminders, bookkeeping notes, and messages. This policy explains the information Julia handles and how it is used."
    >
      <LegalSection title="Information We Collect">
        <p>
          We collect account information, workspace information, uploaded
          documents, document metadata, reminders, events, bookkeeping records,
          messages, integration settings, and usage logs needed to provide the
          service. If WhatsApp or another messaging channel is connected, we may
          process phone numbers, message content, attachments, delivery status,
          and related provider metadata.
        </p>
      </LegalSection>

      <LegalSection title="How We Use Information">
        <p>
          We use information to authenticate users, operate workspaces, process
          documents, extract useful facts, answer user questions, create
          reminders, send notifications, maintain security, debug errors, and
          improve reliability. We do not sell personal information.
        </p>
      </LegalSection>

      <LegalSection title="AI Processing">
        <p>
          Julia may send relevant prompts, document text, attachments, metadata,
          and conversation context to AI service providers to classify
          documents, summarize information, draft responses, search records, or
          generate reminder messages. AI output can be inaccurate and should be
          reviewed before important actions are taken.
        </p>
      </LegalSection>

      <LegalSection title="Service Providers">
        <p>
          Julia uses trusted infrastructure and service providers for
          authentication, database, file storage, AI processing, messaging, and
          hosting. These providers process information only as needed to provide
          their services to Julia.
        </p>
      </LegalSection>

      <LegalSection title="Data Sharing">
        <p>
          We share information only when needed to operate the product, comply
          with law, protect users or the service, or complete an action the user
          requested. Connected integrations may receive data when a user chooses
          to use them.
        </p>
      </LegalSection>

      <LegalSection title="Retention">
        <p>
          Workspace data is retained while the account or workspace is active,
          unless deleted earlier by an authorized user or required by law.
          Operational logs and delivery records may be retained for security,
          audit, troubleshooting, and abuse prevention.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use access controls, authentication, provider-side security
          features, and operational safeguards to protect information. No online
          service can guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="User Choices">
        <p>
          Users can update workspace data, disconnect integrations, change
          reminder preferences, and request deletion where supported by the
          product and applicable law. Messaging reminders should remain opt-in
          and can be disabled from settings once available.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For privacy requests or questions, contact the Julia workspace owner
          or the support contact provided with your Julia deployment.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
