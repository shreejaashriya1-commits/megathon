import { NextRequest, NextResponse } from 'next/server';
import { resolveDispute } from '@/lib/supabase/db';
import { validateDisputeResolution } from '@/lib/validation';

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
    const { corrected_qty, distributor_org_id } = body;

    const validation = validateDisputeResolution(Number(corrected_qty));
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const result = await resolveDispute({
      return_request_id: returnRequestId,
      distributor_org_id: Number(distributor_org_id) || 2,
      corrected_qty: Number(corrected_qty),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Dispute resolved successfully. Batch transitioned to RETURN_CONFIRMED with verified quantity ${corrected_qty}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to resolve dispute' },
      { status: 500 }
    );
  }
}
