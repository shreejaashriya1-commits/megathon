import { NextRequest, NextResponse } from 'next/server';
import { attemptSale } from '@/lib/supabase/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch_number, retailer_org_id } = body;

    if (!batch_number || typeof batch_number !== 'string') {
      return NextResponse.json(
        { success: false, error: 'batch_number is required' },
        { status: 400 }
      );
    }

    const result = await attemptSale({
      batch_number: batch_number.trim(),
      retailer_org_id: Number(retailer_org_id) || 1,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to evaluate sale attempt' },
      { status: 500 }
    );
  }
}
