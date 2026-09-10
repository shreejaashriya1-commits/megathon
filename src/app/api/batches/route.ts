import { NextRequest, NextResponse } from 'next/server';
import { getBatches, createBatch } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('org_id') || searchParams.get('holder_org_id');
    const orgId = orgIdParam ? parseInt(orgIdParam, 10) : undefined;

    const batches = await getBatches(orgId);
    return NextResponse.json({
      success: true,
      data: batches,
      message: 'Batches retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      batch_number,
      medicine_id,
      product_name,
      quantity,
      expiry_date,
      mfg_date,
      manufacturer_org_id,
      holder_org_id,
    } = body;

    if (!manufacturer_org_id) {
      return NextResponse.json(
        { success: false, error: 'manufacturer_org_id is required' },
        { status: 400 }
      );
    }

    const result = await createBatch({
      batch_number,
      medicine_id: medicine_id ? parseInt(medicine_id, 10) : undefined,
      product_name,
      quantity: parseInt(quantity, 10),
      expiry_date,
      mfg_date,
      manufacturer_org_id: parseInt(manufacturer_org_id, 10),
      holder_org_id: holder_org_id ? parseInt(holder_org_id, 10) : undefined,
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
      message: 'Medicine batch generated successfully with unique QR-linked batch identity',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to generate batch' },
      { status: 500 }
    );
  }
}
