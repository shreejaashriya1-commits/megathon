import { NextRequest, NextResponse } from 'next/server';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/supabase/db';
import { StakeholderRole } from '@/../types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get('role') as StakeholderRole) || undefined;
    const orgId = searchParams.get('org_id') ? Number(searchParams.get('org_id')) : undefined;
    const unreadOnly = searchParams.get('unread_only') === 'true';

    const notifs = await getNotifications({
      role,
      org_id: orgId,
      unread_only: unreadOnly,
    });

    const unreadCount = notifs.filter((n) => !n.read_at).length;

    return NextResponse.json({
      success: true,
      data: notifs,
      unreadCount,
      total: notifs.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_id, mark_all, role, org_id } = body;

    if (mark_all) {
      await markAllNotificationsRead(role, org_id);
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (!notification_id) {
      return NextResponse.json(
        { success: false, error: 'notification_id is required' },
        { status: 400 }
      );
    }

    const success = await markNotificationRead(Number(notification_id));
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}
