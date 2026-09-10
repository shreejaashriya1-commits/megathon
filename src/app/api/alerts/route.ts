import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, updateAlertStatus } from '@/lib/supabase/db';

export async function GET() {
  try {
    const alerts = await getAlerts();
    return NextResponse.json({
      success: true,
      data: alerts,
      message: 'Alerts retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert_id, status, notes, actor_org_id } = body;

    if (!alert_id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: alert_id and status are mandatory' },
        { status: 400 }
      );
    }

    if (!['open', 'investigating', 'resolved'].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status. Must be 'open', 'investigating', or 'resolved'" },
        { status: 400 }
      );
    }

    const result = await updateAlertStatus({
      alert_id: Number(alert_id),
      status,
      notes,
      actor_org_id: actor_org_id ? Number(actor_org_id) : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update alert' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Alert successfully updated to ${status}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error updating alert' },
      { status: 500 }
    );
  }
}
