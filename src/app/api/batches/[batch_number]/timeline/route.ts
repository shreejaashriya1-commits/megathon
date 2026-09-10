import { NextRequest, NextResponse } from 'next/server';
import { getBatchTimeline } from '@/lib/supabase/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batch_number: string }> }
) {
  try {
    const { batch_number } = await params;
    if (!batch_number) {
      return NextResponse.json(
        { success: false, error: 'batch_number is required' },
        { status: 400 }
      );
    }

    const data = await getBatchTimeline(batch_number);
    if (!data) {
      return NextResponse.json(
        { success: false, error: `Batch '${batch_number}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Batch timeline retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch batch timeline' },
      { status: 500 }
    );
  }
}
