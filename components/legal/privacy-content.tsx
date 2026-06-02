import {
  LegalDocumentLayout,
  LegalList,
  LegalSection,
} from '@/components/legal-document-layout'
import {
  BACKUP_LIMITS_DISPLAY,
  COMPLETED_PROJECT_RETENTION_DAYS,
  INACTIVE_PROJECT_RETENTION_MONTHS,
  PLAN_AI_LIMITS_DISPLAY,
  PLAN_TIER_LEGAL_SUMMARIES,
} from '@/lib/legal-policy-constants'
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
          client names, property addresses, per-project job workflow stages
          (custom labels you configure), job status, schedules, messages,
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
            'Run automatic backups and data retention according to your organization settings and this Policy.',
            'Improve reliability, security, and support.',
            'Comply with law and enforce our Terms.',
            'Enforce plan limits after subscription changes while preserving data (for example, read-only admin access when over project limits, or blocking worker access when over staff limits).',
            'Track monthly AI summary usage per organization against your plan cap.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Subscription plans and usage limits">
        <p>
          Your organization&apos;s plan determines feature access and numeric
          limits. Current tiers:
        </p>
        <LegalList items={[...PLAN_TIER_LEGAL_SUMMARIES]} />
        <p>
          AI-assisted summaries and timelines count against your monthly
          organization limit ({PLAN_AI_LIMITS_DISPLAY.trial} on Trial,{' '}
          {PLAN_AI_LIMITS_DISPLAY.starter} on Starter,{' '}
          {PLAN_AI_LIMITS_DISPLAY.professional} on Professional,{' '}
          {PLAN_AI_LIMITS_DISPLAY.enterprise} on Enterprise). Usage resets each
          calendar month and does not roll over.
        </p>
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
          providers to generate summaries, timelines, or classifications. Output
          may be inaccurate. You are responsible for reviewing AI results before
          relying on them or sharing them with clients.
        </p>
        <p>
          Each organization has a monthly cap on AI summary generation based on
          its subscription tier (see Subscription plans and usage limits above).
          When the cap is reached, further AI generation is blocked until the next
          calendar month or until you upgrade.
        </p>
      </LegalSection>

      <LegalSection title="Data retention and deletion">
        <p>
          We apply automated retention to project data in the Service. You are
          responsible for exporting or downloading records you need before retention
          runs. Retention does not replace your own record-keeping obligations.
        </p>
        <p>
          <strong className="text-foreground">Completed projects:</strong> when
          all jobs on a project reach the final completed stage in that
          project&apos;s workflow, the project — including uploaded files, project
          messages, and related project data — is automatically deleted after{' '}
          {COMPLETED_PROJECT_RETENTION_DAYS} days unless the status is changed
          before then.
        </p>
        <p>
          <strong className="text-foreground">Inactive projects:</strong>{' '}
          projects that are not in the completed stage and have no qualifying
          activity for {INACTIVE_PROJECT_RETENTION_MONTHS} months are automatically
          deleted.
        </p>
        <p>
          <strong className="text-foreground">Organization backups:</strong> if
          your plan includes backups, we may store ZIP copies of projects in secure
          cloud storage (on a schedule, when a job is completed, or when you run
          a manual backup). We retain up to a plan-based number of completed
          backups per organization ({BACKUP_LIMITS_DISPLAY.starter} on Starter,{' '}
          {BACKUP_LIMITS_DISPLAY.professional} on Professional,{' '}
          {BACKUP_LIMITS_DISPLAY.enterprise} on Enterprise); older backups are
          removed automatically.
          Organization admins may delete individual backups in billing settings to
          free space. Backup ZIPs may still exist for a deleted project until pruned
          or removed. Backups are not a guarantee of recovery.
        </p>
        <p>
          <strong className="text-foreground">Plan downgrade safeguards:</strong>{' '}
          if your organization downgrades and exceeds lower-tier limits, we may
          restrict actions (such as creating projects or worker project access)
          until limits are satisfied. These restrictions are access controls only;
          we do not automatically delete project files, projects, or worker
          accounts solely due to downgrade overages.
        </p>
        <p>
          <strong className="text-foreground">Account and organization deletion:</strong>{' '}
          we do not offer self-service deletion of an entire account or organization
          in the app. To request deletion of your account and associated organization
          data, email {LEGAL_CONTACT_EMAIL} from the address on the account. We will
          verify ownership before processing. Some information may remain in backups,
          logs, or payment records for a limited period as described above or as
          required by law.
        </p>
        <p>
          If you revoke client access or delete content, copies already downloaded
          by a client or stored outside the Service may remain outside our control.
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
            'Access and update profile information in account settings.',
            'Organization admins: configure per-project workflow stages, client access, worker access, and default worker permissions in organization settings.',
            'Organization admins: enable, schedule, download, or remove organization backups in billing settings.',
            'Control client access and shared files per project.',
            'Change subscription tier using Upgrade or Downgrade in Billing (Stripe plan-change flow).',
            'Update payment methods and view invoices using Manage card & invoices (Stripe billing portal).',
            'Cancel your subscription through the Stripe customer portal or by contacting us.',
            'Contact us to request access, correction, or account deletion where applicable.',
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
