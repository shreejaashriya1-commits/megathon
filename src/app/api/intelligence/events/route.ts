import { NextRequest, NextResponse } from 'next/server';
import { processEvent } from '@/lib/intelligence/event-processor';
import { RawEvent } from '@/../types/database';

export async function POST(request: NextRequest) {
  try {
    const body: RawEvent = await request.json();
    if (!body.event_type) {
      return NextResponse.json(
        { success: false, error: 'event_type is required' },
        { status: 400 }
      );
    }

    const result = await processEvent(body);
    return NextResponse.json({
      success: true,
      data: result,
      message: result.isNormalTransaction
        ? 'Normal transaction processed without alerts'
        : `Event processed: ${result.isDuplicateSuppressed ? 'Grouped with existing case (duplicate alert suppressed)' : 'New alert/case created'}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process intelligence event' },
      { status: 500 }
    );
  }
}
