import { NextRequest, NextResponse } from 'next/server';
import { getInvestigationCaseById, getAlerts, getBatchTimeline, updateCaseStatus } from '@/lib/supabase/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Case ID is required' }, { status: 400 });
    }

    const caseData = await getInvestigationCaseById(id);
    if (!caseData) {
      return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
    }

    // Retrieve full linked alert details
    const allAlerts = await getAlerts();
    const relatedAlerts = allAlerts.filter(
      (a) => a.case_id === caseData.id || caseData.related_alert_ids?.includes(a.id)
    );

    // Retrieve batch 360 data for affected batches if available
    const batchesData: Record<string, any> = {};
    for (const batchNumber of caseData.affected_batches || []) {
      const bData = await getBatchTimeline(batchNumber);
      if (bData) batchesData[batchNumber] = bData;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...caseData,
        relatedAlerts,
        batchesData,
      },
      message: 'Case dossier retrieved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch case dossier' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Case ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes, resolution_notes, actor_org_id } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 });
    }

    const result = await updateCaseStatus({
      case_id: id,
      status,
      notes: notes || resolution_notes,
      actor_org_id: actor_org_id ? Number(actor_org_id) : 6,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Case status successfully updated to ${status}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update case status' },
      { status: 500 }
    );
  }
}
