import { NextRequest, NextResponse } from 'next/server';
import { confirmPickup } from '@/lib/supabase/db';
import { validatePickupConfirmation } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const returnRequestId = parseInt(id, 10);
    if (isNaN(returnRequestId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid return request ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { qty_received, distributor_org_id } = body;

    const validation = validatePickupConfirmation(Number(qty_received));
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const result = await confirmPickup({
      return_request_id: returnRequestId,
      distributor_org_id: Number(distributor_org_id) || 2,
      qty_received: Number(qty_received),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, batchStatus: result.batchStatus },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      batchStatus: result.batchStatus,
      disputed: result.disputed,
      message: result.disputed
        ? 'Pickup logged with QUANTITY DISPUTE. Batch flagged as DISPUTED.'
        : 'Pickup confirmed successfully. Batch transitioned to RETURN_CONFIRMED.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to confirm pickup' },
      { status: 500 }
    );
  }
}
