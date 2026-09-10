import React from 'react';
import { TimelineEvent } from '@/../types/medtrace';
import { formatDateTime } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRightLeft,
  Truck,
  Flame,
  FileCheck2,
  AlertOctagon,
  ShieldCheck,
} from 'lucide-react';

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No lifecycle events recorded for this batch yet.
      </div>
    );
  }

  const getEventIcon = (title: string, badge: string) => {
    if (title.includes('Destroyed') || badge === 'DESTROYED') return ShieldAlert;
    if (title.includes('Certificate')) return FileCheck2;
    if (title.includes('Destruction') || badge === 'DESTRUCTION LOGGED') return Flame;
    if (title.includes('Pickup') || badge === 'RETURN_CONFIRMED') return Truck;
    if (title.includes('Return') || badge === 'RETURN_INITIATED') return ArrowRightLeft;
    if (title.includes('ALERT') || badge === 'SALE BLOCKED') return AlertOctagon;
    if (title.includes('Dispense') || badge === 'SALE ALLOWED') return ShieldCheck;
    return CheckCircle2;
  };

  const getBadgeStyle = (color: string) => {
    switch (color) {
      case 'rose':
        return 'bg-rose-100 text-rose-900 border-rose-200';
      case 'amber':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'purple':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'blue':
      default:
        return 'bg-blue-100 text-blue-900 border-blue-200';
    }
  };

  return (
    <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {events.map((event, index) => {
        const Icon = getEventIcon(event.title, event.badge);
        const isCritical = event.badge === 'DESTROYED' || event.badge === 'SALE BLOCKED';

        return (
          <div key={event.id || index} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white shadow-md ring-4 ring-white ${
                isCritical
                  ? 'bg-rose-600 shadow-rose-600/30'
                  : event.badgeColor === 'amber'
                  ? 'bg-amber-500'
                  : event.badgeColor === 'purple'
                  ? 'bg-purple-600'
                  : 'bg-teal-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>

            {/* Event Box */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm group-hover:border-teal-400/80 transition space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{event.title}</h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getBadgeStyle(
                      event.badgeColor
                    )}`}
                  >
                    {event.badge}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(event.date)}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{event.description}</p>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                <span>
                  Actor Org: <strong className="text-slate-800">{event.actor}</strong>
                </span>

                {event.metadata?.certificateNo && (
                  <span className="font-mono font-bold text-rose-700">
                    Cert: {event.metadata.certificateNo}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
