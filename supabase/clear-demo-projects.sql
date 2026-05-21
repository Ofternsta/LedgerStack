-- Run in Supabase Dashboard → SQL Editor
-- Removes John Smith, Jake Gipson, and Jake Smith (database rows only).
--
-- Storage files cannot be deleted via SQL. Remove uploads first with:
--   npm run clear-demo-storage
-- (or delete folders in Dashboard → Storage → project-files)

-- Claims tied to those projects
DELETE FROM claims
WHERE project_id IN (
  '0432fc8d-cfed-48c8-b235-8ac730f80e09',
  '74fc640f-a25e-4169-ab9c-6b712feea353',
  '0c27f8c2-f73f-4dd5-b489-2dde338423e6'
);

-- Projects
DELETE FROM projects
WHERE customer_name IN ('John Smith', 'Jake Gipson', 'Jake Smith')
   OR id IN (
     '0432fc8d-cfed-48c8-b235-8ac730f80e09',
     '74fc640f-a25e-4169-ab9c-6b712feea353',
     '0c27f8c2-f73f-4dd5-b489-2dde338423e6'
   );

-- App permissions (create project, delete, open claims):
-- Run supabase/anon-app-permissions.sql
