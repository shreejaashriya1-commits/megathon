import { NextResponse } from 'next/server';
import { getOrganizationRiskProfiles } from '@/lib/supabase/db';

export async function GET() {
  try {
    const profiles = await getOrganizationRiskProfiles();
    return NextResponse.json({
      success: true,
      data: profiles,
      message: 'Organization risk profiles retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to calculate organization risk profiles' },
      { status: 500 }
    );
  }
}
