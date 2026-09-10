import { ExpiryCategory, ExpiryStatus } from '@/../types/medtrace';

/**
 * Calculates days remaining and the expiry classification category.
 * Rules:
 * > 60 days: NORMAL
 * 31-60 days: EXPIRING SOON
 * 0-30 days: URGENT
 * < 0 days: EXPIRED
 */
export function getExpiryStatus(expiryDateStr: string, referenceDate: Date = new Date()): ExpiryStatus {
  const expiryDate = new Date(expiryDateStr);
  // Reset time portions to compare calendar days accurately
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(expiryDate);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      category: 'EXPIRED',
      daysRemaining,
      label: `EXPIRED (${Math.abs(daysRemaining)}d ago)`,
      badgeClass: 'bg-red-50 text-red-700 border-red-200 ring-red-600/10',
    };
  }

  if (daysRemaining <= 30) {
    return {
      category: 'URGENT',
      daysRemaining,
      label: `URGENT (${daysRemaining}d left)`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 ring-amber-600/20',
    };
  }

  if (daysRemaining <= 60) {
    return {
      category: 'EXPIRING_SOON',
      daysRemaining,
      label: `EXPIRING SOON (${daysRemaining}d)`,
      badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200 ring-yellow-600/20',
    };
  }

  return {
    category: 'NORMAL',
    daysRemaining,
    label: `NORMAL (${daysRemaining}d)`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/10',
  };
}

export function isBatchExpired(expiryDateStr: string, referenceDate: Date = new Date()): boolean {
  return getExpiryStatus(expiryDateStr, referenceDate).category === 'EXPIRED';
}
