import { NextResponse } from 'next/server';
import { getOrgs } from '@/lib/supabase/db';

export async function GET() {
  try {
    const orgs = await getOrgs();
    return NextResponse.json({
      success: true,
      data: orgs,
      message: 'Organizations retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}
