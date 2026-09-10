import { AlertSeverity } from '@/../types/database';

/**
 * Calculates severity for a destroyed batch sale attempt based on past blocked attempts.
 * Rule:
 * - If previous blocked attempts >= 2: CRITICAL (repeated attempt)
 * - Otherwise: HIGH (first attempt)
 */
export function calculateDestroyedBatchSeverity(previousBlockedCount: number): AlertSeverity {
  // If at least 1 previous blocked attempt exists, this is a repeated breach -> CRITICAL
  // First blocked attempt -> HIGH
  if (previousBlockedCount >= 1) {
    return 'CRITICAL';
  }
  return 'HIGH';
}
