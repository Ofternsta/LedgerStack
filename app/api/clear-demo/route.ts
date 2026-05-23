import { NextResponse } from 'next/server'

/** Disabled for security — use supabase/clear-demo-projects.sql in the SQL Editor instead. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'This endpoint is disabled. To remove demo projects, run supabase/clear-demo-projects.sql in Supabase SQL Editor.',
    },
    { status: 404 }
  )
}
