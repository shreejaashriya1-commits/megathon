import { NextRequest, NextResponse } from 'next/server';
import { getBatchByQrToken } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qrToken = searchParams.get('qr_token');

    if (!qrToken) {
      return NextResponse.json(
        { success: false, error: 'qr_token query parameter is required' },
        { status: 400 }
      );
    }

    const batch = await getBatchByQrToken(qrToken.trim());
    if (!batch) {
      return NextResponse.json(
        { success: false, error: `No batch found for QR token: ${qrToken}` },
        { status: 404 }
      );
    }

    const expectedBatch = searchParams.get('expected_batch');
    if (expectedBatch && batch.batch_number.toUpperCase() !== expectedBatch.trim().toUpperCase()) {
      return NextResponse.json(
        {
          success: false,
          error: `QR identity mismatch: Token resolves to batch ${batch.batch_number}, not expected batch ${expectedBatch.trim()}`,
          mismatch: true,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: batch,
      message: 'Batch resolved successfully from QR token',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to resolve QR token' },
      { status: 500 }
    );
  }
}
