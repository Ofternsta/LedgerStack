import {
  LegalDocumentLayout,
  LegalList,
  LegalSection,
} from '@/components/legal-document-layout'
import Link from 'next/link'
import {
  BACKUP_LIMITS_DISPLAY,
  COMPLETED_PROJECT_RETENTION_DAYS,
  INACTIVE_PROJECT_RETENTION_MONTHS,
  MAX_PROJECT_STATUS_STAGES,
  PLAN_TIER_LEGAL_SUMMARIES,
} from '@/lib/legal-policy-constants'
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_OPERATOR_NAME,
  LEGAL_PRODUCT_NAME,
  LEGAL_WEBSITE,
} from '@/lib/legal-meta'

export function TermsContent() {
  return (
    <LegalDocumentLayout title="Terms of Service">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of{' '}
        {LEGAL_PRODUCT_NAME} at {LEGAL_WEBSITE} (the &quot;Service&quot;),
        operated by {LEGAL_OPERATOR_NAME} (&quot;we,&quot; &quot;us&quot;). By
        creating an account or using the Service, you agree to these Terms and
        our{' '}
        <Link href="/privacy" className="text-brand-bright hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <LegalSection title="Who may use the Service">
        <LegalList
          items={[
            'You must be at least 18 years old and able to form a binding contract.',
            'You must provide accurate registration information.',
            'You are responsible for activity under your account and for keeping your password secure.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Accounts and roles">
        <p>
          Organization admins manage billing, team members, client access, and
          per-project settings (including project names and customizable job
          workflow stages). Each project may define its own sequence of status
          stages, with a required final completed stage. Workers and clients
          receive only the permissions assigned by an admin (including optional
          access to AI project chat). You are responsible for invitations, role
          assignments, workflow configuration, and what data you share with
          clients.
        </p>
      </LegalSection>

      <LegalSection title="Subscriptions and payment">
        <p>
          Paid plans are billed on a recurring basis through Stripe unless
          canceled. Prices and features are described at signup, on the marketing
          site, and in your billing settings. Fees are generally non-refundable
          except where required by law. You authorize us and Stripe to charge your
          payment method for renewals until you cancel.
        </p>
        <p>
          <strong className="text-foreground">Plan tiers and limits</strong>{' '}
          (current as of the date shown at the top of this page):
        </p>
        <LegalList items={[...PLAN_TIER_LEGAL_SUMMARIES]} />
        <p>
          AI summary and timeline generation counts are measured per organization
          per calendar month. Unused AI allowance does not roll over.
        </p>
        <p>
          <strong className="text-foreground">Changing plans:</strong> use the
          Upgrade or Downgrade buttons in Billing to change subscription tier.
          Those flows use Stripe&apos;s plan-change experience (including proration
          rules configured in Stripe). The Manage card &amp; invoices link is for
          payment methods and invoice history only — not for switching plans.
          Starting a new Checkout while you already have an active paid
          subscription may create duplicate Stripe subscriptions; keep only one
          active subscription per organization.
        </p>
        <p>
          Upgrades may take effect immediately and may be prorated by Stripe.
          Downgrades may be scheduled for the end of the current billing period
          based on your Stripe Customer Portal settings. If your organization
          exceeds lower-tier limits after a downgrade takes effect, we may enforce
          read-only or restricted access (including blocking worker project
          access) until usage is within plan limits or you upgrade again. We do
          not delete projects, files, or worker accounts solely because of a
          downgrade.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You retain ownership of content you upload. You grant us a limited
          license to host, store, process, and display your content solely to
          operate the Service (including AI features you request and automated
          retention or backup described in these Terms and our Privacy Policy).
          You represent that you have the rights to upload and share your content
          and that it does not violate law or third-party rights.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to:</p>
        <LegalList
          items={[
            'Use the Service for unlawful purposes or to store unlawful content.',
            'Attempt to breach security, scrape data without permission, or disrupt the Service.',
            'Misrepresent your identity or access projects without authorization.',
            'Upload malware or content you do not have rights to use.',
          ]}
        />
      </LegalSection>

      <LegalSection title="AI and professional disclaimers">
        <LegalList
          items={[
            'AI-generated summaries, timelines, categorizations, and project chat replies are aids only and may be wrong.',
            'Project AI chat is limited to the current project, may refuse off-topic questions, and is not stored as a permanent chat history in the Service.',
            'Each AI chat reply counts against your organization\'s monthly AI summary allowance, the same as other AI generation features.',
            'The Service does not provide legal, engineering, or licensed professional advice for your trade.',
            'You are solely responsible for decisions made using the Service and for documents shared with clients, partners, or regulators.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Client access">
        <p>
          When you grant a client access, you control which files they may view.
          You are responsible for verifying the correct email address and shared
          content. We are not responsible for disclosure caused by your sharing
          settings or mistakes.
        </p>
      </LegalSection>

      <LegalSection title="Job workflow and data retention">
        <p>
          Admins may configure job status stages per project (up to{' '}
          {MAX_PROJECT_STATUS_STAGES} stages, including a required final completed
          stage). Marking a job completed may trigger a confirmation that project
          data will be deleted after {COMPLETED_PROJECT_RETENTION_DAYS} days.
        </p>
        <p>
          Unless you change status or export data before retention applies:
        </p>
        <LegalList
          items={[
            `Projects where all jobs are completed are deleted after ${COMPLETED_PROJECT_RETENTION_DAYS} days.`,
            `Projects that remain incomplete and inactive for ${INACTIVE_PROJECT_RETENTION_MONTHS} months are deleted.`,
          ]}
        />
        <p>
          You are solely responsible for saving archives, exports, or backups of
          records you must keep. We are not liable for loss of data removed by
          automated retention.
        </p>
      </LegalSection>

      <LegalSection title="Exports and backups">
        <p>
          Export and automatic backup features (where included in your plan) are
          provided as a convenience. Backups are stored as ZIP files; we keep up to
          your plan limit of completed backups per organization ({' '}
          {BACKUP_LIMITS_DISPLAY.starter} Starter, {BACKUP_LIMITS_DISPLAY.professional}{' '}
          Professional, {BACKUP_LIMITS_DISPLAY.enterprise} Enterprise) and remove
          older ones automatically. Admins may delete individual backups in billing
          settings. Backups may still contain data from projects later deleted by
          retention.
        </p>
        <p>
          You are responsible for maintaining your own copies of critical records,
          reviewing backup contents, and downloading backups before projects are
          removed. We are not liable for data loss due to deletion, retention,
          misconfiguration, failure to export or back up, or removal of backups.
        </p>
      </LegalSection>

      <LegalSection title="Availability and support">
        <p>
          We strive to keep the Service available but do not guarantee
          uninterrupted access. Maintenance, outages, and third-party failures
          may occur. Support is provided on a reasonable-effort basis via{' '}
          {LEGAL_CONTACT_EMAIL}.
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p>
          We own the Service, software, branding, and documentation. You may not
          copy, reverse engineer, or resell the Service except as allowed in
          writing by us.
        </p>
      </LegalSection>

      <LegalSection title="Feedback">
        <p>
          If you submit feedback or suggestions, we may use them without
          obligation or compensation to you.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p>
          You may stop using the Service and cancel your subscription at any time.
          Paid subscribers can use <strong className="text-foreground">End
          subscription</strong> in billing settings to cancel renewal at the end
          of the current billing period through Stripe. To request deletion of your
          account and organization data, contact {LEGAL_CONTACT_EMAIL}; we will
          verify your request before processing.
        </p>
        <p>
          We may suspend or terminate access for violation of these Terms or for
          risk to the Service or other users. Upon termination, your right to use
          the Service ends; automated retention and backup policies may continue to
          apply until data is removed. Some provisions survive (disclaimers,
          liability limits, dispute terms).
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer of warranties">
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
          WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOST PROFITS
          OR DATA. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THE SERVICE IS
          LIMITED TO THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE
          CLAIM, OR ONE HUNDRED U.S. DOLLARS ($100), WHICHEVER IS GREATER.
        </p>
      </LegalSection>

      <LegalSection title="Indemnity">
        <p>
          You agree to indemnify and hold us harmless from claims arising from
          your content, your use of the Service, or your violation of these Terms
          or applicable law.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These Terms are governed by the laws of the United States and the State
          of Delaware, without regard to conflict-of-law rules, except where
          mandatory local law applies.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may modify these Terms. Continued use after changes are posted
          constitutes acceptance. Material changes may be communicated by email
          or in-app notice.
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
