import { NextRequest, NextResponse } from 'next/server';
import { getReturnRequests } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const allReturns = await getReturnRequests();
    const disputes = allReturns.filter((r) => r.status === 'disputed' || r.pickup?.disputed === true);

    return NextResponse.json({
      success: true,
      data: disputes,
      message: 'Disputes retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch disputes' },
      { status: 500 }
    );
  }
}
