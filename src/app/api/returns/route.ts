import { NextRequest, NextResponse } from 'next/server';
import { getReturnRequests, createReturnRequest, getBatchByNumber } from '@/lib/supabase/db';
import { validateReturnRequest } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('org_id');
    const orgId = orgIdParam ? parseInt(orgIdParam, 10) : undefined;

    const returns = await getReturnRequests(orgId);
    return NextResponse.json({
      success: true,
      data: returns,
      message: 'Return requests retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch returns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch_number, qty_claimed, photo, condition, retailer_org_id } = body;

    // Fetch batch to validate available qty
    const batch = await getBatchByNumber(batch_number);
    if (!batch) {
      return NextResponse.json(
        { success: false, error: `Batch '${batch_number}' not found` },
        { status: 404 }
      );
    }

    const validation = validateReturnRequest(batch_number, Number(qty_claimed), batch.quantity);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const result = await createReturnRequest({
      batch_number,
      retailer_org_id: Number(retailer_org_id) || 1,
      qty_claimed: Number(qty_claimed),
      condition: condition || 'Expired retail inventory',
      photo_url: photo || null,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Return initiated successfully for batch ${batch_number}`,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to initiate return' },
      { status: 500 }
    );
  }
}
