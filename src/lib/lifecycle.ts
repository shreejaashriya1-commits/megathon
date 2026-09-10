import { BatchStatus } from '@/../types/database';

export interface StateTransitionRule {
  from: BatchStatus[];
  to: BatchStatus;
  action: string;
}

export const ALLOWED_TRANSITIONS: StateTransitionRule[] = [
  {
    from: ['ACTIVE'],
    to: 'RETURN_INITIATED',
    action: 'INITIATE_RETURN',
  },
  {
    from: ['RETURN_INITIATED'],
    to: 'RETURN_CONFIRMED',
    action: 'CONFIRM_PICKUP',
  },
  {
    from: ['RETURN_INITIATED'],
    to: 'DISPUTED',
    action: 'DISPUTE_PICKUP',
  },
  {
    from: ['DISPUTED'],
    to: 'RETURN_CONFIRMED',
    action: 'RESOLVE_DISPUTE',
  },
  {
    from: ['RETURN_CONFIRMED'],
    to: 'DESTROYED',
    action: 'ISSUE_CERTIFICATE',
  },
];

/**
 * Validates whether a state transition from currentStatus to nextStatus is permissible.
 */
export function canTransition(currentStatus: BatchStatus, nextStatus: BatchStatus): { allowed: boolean; reason?: string } {
  if (currentStatus === 'DESTROYED') {
    return {
      allowed: false,
      reason: 'Batch is permanently DESTROYED and in the batch_registry. No transitions or reversals are allowed.',
    };
  }

  if (currentStatus === nextStatus) {
    return {
      allowed: false,
      reason: `Batch is already in status '${currentStatus}'`,
    };
  }

  const validRule = ALLOWED_TRANSITIONS.find(
    (rule) => rule.from.includes(currentStatus) && rule.to === nextStatus
  );

  if (!validRule) {
    return {
      allowed: false,
      reason: `Illegal state transition from '${currentStatus}' to '${nextStatus}'`,
    };
  }

  return { allowed: true };
}
