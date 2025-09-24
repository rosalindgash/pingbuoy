import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()

    // Execute the migration SQL directly
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
            -- Check if column already exists
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'sites'
                AND column_name = 'public_status'
            ) THEN
                ALTER TABLE public.sites
                ADD COLUMN public_status BOOLEAN NOT NULL DEFAULT true;

                -- Add comment explaining the field
                COMMENT ON COLUMN public.sites.public_status IS 'Whether this site has a publicly accessible status page';
            END IF;
        END
        $$;
      `
    })

    if (error) {
      // If rpc doesn't exist, try direct SQL execution (though this usually won't work due to RLS)
      console.error('RPC failed, trying direct approach:', error)

      // Try a simple test query first
      const { data: testData, error: testError } = await supabase
        .from('sites')
        .select('public_status')
        .limit(1)

      if (testError && testError.message.includes('column "public_status" does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'Field does not exist and cannot be added via API. Please add manually via Supabase dashboard.',
          instruction: 'Go to your Supabase dashboard > SQL Editor and run: ALTER TABLE public.sites ADD COLUMN public_status BOOLEAN NOT NULL DEFAULT true;'
        })
      } else if (!testError) {
        return NextResponse.json({
          success: true,
          message: 'Field already exists!'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration executed successfully',
      data
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}