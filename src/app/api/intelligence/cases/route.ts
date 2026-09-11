import { NextRequest, NextResponse } from 'next/server';
import { getInvestigationCases, updateCaseStatus } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') || undefined;
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const stakeholder = searchParams.get('stakeholder') || undefined;
    const orgId = searchParams.get('org_id') ? Number(searchParams.get('org_id')) : undefined;
    const search = searchParams.get('search') || undefined;

    const cases = await getInvestigationCases({
      severity,
      status,
      category,
      stakeholder,
      org_id: orgId,
      search,
    });

    return NextResponse.json({
      success: true,
      data: cases,
      total: cases.length,
      message: 'Investigation cases retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch investigation cases' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { case_id, status, notes, actor_org_id } = body;

    if (!case_id || !status) {
      return NextResponse.json(
        { success: false, error: 'case_id and status are mandatory fields' },
        { status: 400 }
      );
    }

    const validStatuses = [
      'OPEN',
      'ACKNOWLEDGED',
      'UNDER_REVIEW',
      'ACTION_REQUIRED',
      'ESCALATED',
      'RESOLVED',
      'FALSE_POSITIVE',
      'CLOSED',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await updateCaseStatus({
      case_id,
      status,
      notes,
      actor_org_id: actor_org_id ? Number(actor_org_id) : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update case' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Case ${case_id} updated to ${status}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error updating case' },
      { status: 500 }
    );
  }
}
