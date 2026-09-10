import { NextRequest, NextResponse } from 'next/server';
import { runScalableSimulation } from '@/lib/intelligence/simulator';

export async function POST(request: NextRequest) {
  try {
    let target = 1000;
    try {
      const body = await request.json();
      if (body.count && Number(body.count) > 0) {
        target = Number(body.count);
      }
    } catch {
      // default to 1000
    }

    const result = await runScalableSimulation(target);
    return NextResponse.json({
      success: true,
      data: result,
      message: result.summaryMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Simulation run failed' },
      { status: 500 }
    );
  }
}
