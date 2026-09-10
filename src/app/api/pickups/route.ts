import { NextRequest, NextResponse } from 'next/server';
import { getConfirmedPickups } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const pickups = await getConfirmedPickups();
    return NextResponse.json({
      success: true,
      data: pickups,
      message: 'Confirmed pickups retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch confirmed pickups' },
      { status: 500 }
    );
  }
}
