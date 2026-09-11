'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRole } from '@/context/RoleContext';
import { Notification } from '@/../types/database';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Info,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export function NotificationDropdown() {
  const { currentRole, currentOrg } = useRole();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(
        `/api/intelligence/notifications?recipient_role=${encodeURIComponent(currentRole)}&recipient_org_id=${currentOrg.id}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 4000);
    return () => clearInterval(interval);
  }, [currentRole, currentOrg.id]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      await Promise.all(
        unreadIds.map((id) =>
          fetch('/api/intelligence/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, is_read: true }),
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('Failed to mark all read:', e);
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      await fetch('/api/intelligence/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_read: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.error('Failed to mark notification read:', e);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-xs flex items-center justify-center"
        aria-label="View Stakeholder Notifications"
        title="View Notifications"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in-50 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Actionable Alerts
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono capitalize">
                {currentRole} Feed
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-teal-300 hover:text-white font-semibold transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800">All Clear</p>
                <p className="text-[11px] text-slate-500">
                  No pending compliance or custody notifications for {currentRole}.
                </p>
              </div>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 transition flex flex-col gap-2 ${
                    n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-amber-50/40 hover:bg-amber-50/70'
                  }`}
                  onClick={() => !n.is_read && markSingleRead(n.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {getPriorityIcon(n.priority)}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{n.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(n.created_at)}
                        </span>
                      </div>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1" />
                    )}
                  </div>

                  {/* Section 12 Actionable Breakdown Preview */}
                  <p className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                    {n.actionable_message?.what || n.message}
                  </p>

                  {n.actionable_message?.recommended_action && (
                    <div className="text-[11px] text-amber-900 bg-amber-100/60 px-2.5 py-1.5 rounded-md border border-amber-200 font-medium">
                      <span className="font-bold text-amber-950">Action: </span>
                      {n.actionable_message.recommended_action}
                    </div>
                  )}

                  {/* Link to case */}
                  {n.case_id && (
                    <Link
                      href={`/regulator?tab=cases&caseId=${encodeURIComponent(n.case_id)}`}
                      onClick={() => setIsOpen(false)}
                      className="self-end inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 transition mt-1"
                    >
                      <span>Investigate Case {n.case_id}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              href="/regulator?tab=cases"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-teal-800 hover:text-teal-950"
            >
              Open Full Regulatory Command Center &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
