import { NextRequest, NextResponse } from 'next/server';
import { logDestruction } from '@/lib/supabase/db';
import { validateDestructionLogging } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch_number, manufacturer_org_id, facility_name, qty_destroyed, evidence } = body;

    if (!batch_number) {
      return NextResponse.json(
        { success: false, error: 'batch_number is required' },
        { status: 400 }
      );
    }

    const validation = validateDestructionLogging(facility_name, Number(qty_destroyed));
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const result = await logDestruction({
      batch_number,
      manufacturer_org_id: Number(manufacturer_org_id) || 3,
      facility_name,
      qty_destroyed: Number(qty_destroyed),
      evidence_url: evidence || null,
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
      message: `Destruction logged successfully at ${facility_name}. Ready for certificate issuance.`,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to log destruction' },
      { status: 500 }
    );
  }
}
