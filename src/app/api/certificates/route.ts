import { NextRequest, NextResponse } from 'next/server';
import { issueCertificate, getCertificates } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const certs = await getCertificates();
    return NextResponse.json({
      success: true,
      data: certs,
      message: 'Destruction certificates retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch_number, destruction_id, actor_org_id } = body;

    if (!batch_number) {
      return NextResponse.json(
        { success: false, error: 'batch_number is required' },
        { status: 400 }
      );
    }

    if (!destruction_id) {
      return NextResponse.json(
        { success: false, error: 'destruction_id is required' },
        { status: 400 }
      );
    }

    const result = await issueCertificate({
      batch_number,
      destruction_id: Number(destruction_id),
      actor_org_id: actor_org_id ? Number(actor_org_id) : 5,
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
      message: `Destruction certificate ${result.data?.certificate_no} issued. Batch identity permanently registered in batch_registry as DESTROYED.`,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to issue certificate' },
      { status: 500 }
    );
  }
}
