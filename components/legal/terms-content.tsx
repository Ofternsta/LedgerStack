import {
  LegalDocumentLayout,
  LegalList,
  LegalSection,
} from '@/components/legal-document-layout'
import Link from 'next/link'
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
          Organization admins manage billing, team members, and client access.
          Workers and clients receive only the permissions assigned by an admin.
          You are responsible for invitations, role assignments, and what data
          you share with clients.
        </p>
      </LegalSection>

      <LegalSection title="Subscriptions and payment">
        <p>
          Paid plans are billed on a recurring basis through Stripe unless
          canceled. Prices and features are described at signup and in your
          billing settings. Fees are generally non-refundable except where
          required by law. You authorize us and Stripe to charge your payment
          method for renewals until you cancel.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You retain ownership of content you upload. You grant us a limited
          license to host, store, process, and display your content solely to
          operate the Service (including AI features you request). You represent
          that you have the rights to upload and share your content and that it
          does not violate law or third-party rights.
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
            'AI-generated summaries, timelines, and categorizations are aids only and may be wrong.',
            'The Service does not provide legal, insurance, engineering, or claims-adjusting advice.',
            'You are solely responsible for decisions made using the Service and for documents shared with clients, carriers, or regulators.',
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

      <LegalSection title="Availability and support">
        <p>
          We strive to keep the Service available but do not guarantee
          uninterrupted access. Maintenance, outages, and third-party failures
          may occur. Support is provided on a reasonable-effort basis via{' '}
          {LEGAL_CONTACT_EMAIL}.
        </p>
      </LegalSection>

      <LegalSection title="Exports and backups">
        <p>
          Export and backup features are provided as a convenience. You are
          responsible for maintaining your own copies of critical records. We
          are not liable for data loss due to deletion, misconfiguration, or
          failure to export or back up.
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
          We may suspend or terminate access for violation of these Terms or for
          risk to the Service or other users. Upon termination, your right to
          use the Service ends; some provisions survive (disclaimers, liability
          limits, dispute terms).
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
