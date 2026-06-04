-- E-signature requests (SignWell). Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  project_client_access_id uuid NOT NULL
    REFERENCES public.project_client_access (id) ON DELETE CASCADE,
  client_email text NOT NULL,
  source_file_path text NOT NULL,
  source_file_name text NOT NULL,
  claim_id uuid REFERENCES public.claims (id) ON DELETE SET NULL,
  signwell_document_id text,
  embedded_signing_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'viewed', 'signed', 'declined', 'expired', 'voided')),
  signed_file_path text,
  typed_signer_name text,
  requested_by_user_id uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signature_requests_project_idx
  ON public.signature_requests (project_id);

CREATE INDEX IF NOT EXISTS signature_requests_client_email_idx
  ON public.signature_requests (lower(client_email));

CREATE INDEX IF NOT EXISTS signature_requests_signwell_doc_idx
  ON public.signature_requests (signwell_document_id)
  WHERE signwell_document_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS signature_requests_one_pending_per_file
  ON public.signature_requests (project_client_access_id, source_file_path)
  WHERE status IN ('pending', 'viewed');

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  href text NOT NULL,
  reference_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_unread_idx
  ON public.user_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signature_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signature_requests TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.user_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO service_role;

DROP POLICY IF EXISTS "admin manage signature requests" ON public.signature_requests;
CREATE POLICY "admin manage signature requests"
  ON public.signature_requests FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = signature_requests.organization_id
        AND o.admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = signature_requests.organization_id
        AND o.admin_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "client read own signature requests" ON public.signature_requests;
CREATE POLICY "client read own signature requests"
  ON public.signature_requests FOR SELECT TO authenticated
  USING (
    lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "users read own notifications" ON public.user_notifications;
CREATE POLICY "users read own notifications"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users update own notifications" ON public.user_notifications;
CREATE POLICY "users update own notifications"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
