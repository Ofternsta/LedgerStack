import {
  LegalDocumentLayout,
  LegalList,
  LegalSection,
} from '@/components/legal-document-layout'
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_OPERATOR_NAME,
  LEGAL_PRODUCT_NAME,
  LEGAL_WEBSITE,
} from '@/lib/legal-meta'

export function PrivacyContent() {
  return (
    <LegalDocumentLayout title="Privacy Policy">
      <p>
        This Privacy Policy describes how {LEGAL_OPERATOR_NAME} (&quot;we,&quot;
        &quot;us&quot;) collects, uses, and shares information when you use{' '}
        {LEGAL_PRODUCT_NAME} at {LEGAL_WEBSITE} (the &quot;Service&quot;).
      </p>

      <LegalSection title="Information we collect">
        <p>
          <strong className="text-foreground">Account information:</strong>{' '}
          email address, name, role (admin, worker, or client), organization name,
          and authentication credentials managed through our auth provider.
        </p>
        <p>
          <strong className="text-foreground">Project and job data:</strong>{' '}
          client names, property addresses, report status, schedules, messages,
          internal notes, and files you upload (photos, PDFs, videos, and related
          metadata).
        </p>
        <p>
          <strong className="text-foreground">Payment information:</strong>{' '}
          subscription and billing details are processed by Stripe. We do not
          store full payment card numbers on our servers.
        </p>
        <p>
          <strong className="text-foreground">Technical data:</strong> IP
          address, browser type, device information, and logs from our hosting and
          security systems.
        </p>
      </LegalSection>

      <LegalSection title="How we use information">
        <LegalList
          items={[
            'Provide and operate the Service (accounts, projects, messaging, client sharing).',
            'Process subscriptions and send transactional emails (verification, invites, account notices).',
            'Run AI-assisted features you request (summaries, categorization, timelines) on your uploaded content.',
            'Improve reliability, security, and support.',
            'Comply with law and enforce our Terms.',
          ]}
        />
      </LegalSection>

      <LegalSection title="How we share information">
        <p>We share information only as needed to run the Service:</p>
        <LegalList
          items={[
            'Service providers: Supabase (database, auth, storage), Stripe (payments), Resend or similar (email), and cloud hosting.',
            'Your organization: admins, assigned workers, and clients you grant access to — clients only see files you explicitly share.',
            'Legal requirements: when required by law or to protect rights, safety, and security.',
          ]}
        />
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="AI processing">
        <p>
          When you use AI features, document content may be sent to third-party AI
          providers to generate summaries or classifications. Output may be
          inaccurate. You are responsible for reviewing AI results before relying
          on them.
        </p>
      </LegalSection>

      <LegalSection title="Data retention and deletion">
        <p>
          <strong className="text-foreground">Completed projects:</strong> when
          all reports on a project are marked Completed, the project (including
          files and messages) is automatically deleted after 7 days unless the
          status is changed before then.
        </p>
        <p>
          <strong className="text-foreground">Inactive projects:</strong>{' '}
          projects that are not completed and have no activity for 12 months are
          automatically deleted.
        </p>
        <p>
          <strong className="text-foreground">Account deletion:</strong> to
          delete your entire account and organization, email{' '}
          {LEGAL_CONTACT_EMAIL}. We verify ownership before processing. Scheduled
          org backups may be kept up to the backup limit configured in Billing.
        </p>
        <p>
          If you revoke client access or delete content, copies already
          downloaded by a client may remain outside our control.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use reasonable technical and organizational measures to protect data.
          No method of transmission or storage is completely secure. You are
          responsible for safeguarding your login credentials and controlling who
          you invite to your organization.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <LegalList
          items={[
            'Access and update profile information in the Service.',
            'Control client access and shared files per project.',
            'Cancel your subscription through billing settings or Stripe customer portal.',
            'Contact us to request access, correction, or deletion where applicable.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Children">
        <p>
          The Service is not directed to children under 13, and we do not
          knowingly collect personal information from children under 13.
        </p>
      </LegalSection>

      <LegalSection title="International users">
        <p>
          If you access the Service from outside the United States, your
          information may be processed in the United States or other countries
          where our providers operate.
        </p>
        <p>
          If you are in the European Economic Area, United Kingdom, or California,
          you may have additional rights (access, deletion, opt-out of certain
          sharing). Contact {LEGAL_CONTACT_EMAIL} to exercise those rights.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this Privacy Policy from time to time. We will post the
          updated version on this page and update the &quot;Last updated&quot;
          date.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Email:{' '}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-brand-bright hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  )
}
