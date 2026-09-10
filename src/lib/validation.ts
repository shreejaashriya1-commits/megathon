export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateReturnRequest(
  batchNumber: string | undefined | null,
  qtyClaimed: number | undefined | null,
  batchAvailableQty?: number
): ValidationResult {
  if (!batchNumber || typeof batchNumber !== 'string' || !batchNumber.trim()) {
    return { valid: false, error: 'Batch number is required' };
  }

  if (qtyClaimed === undefined || qtyClaimed === null || isNaN(qtyClaimed) || qtyClaimed <= 0) {
    return { valid: false, error: 'Claimed quantity must be a positive integer' };
  }

  if (batchAvailableQty !== undefined && qtyClaimed > batchAvailableQty) {
    return {
      valid: false,
      error: `Claimed quantity (${qtyClaimed}) cannot exceed batch quantity (${batchAvailableQty})`,
    };
  }

  return { valid: true };
}

export function validatePickupConfirmation(
  qtyReceived: number | undefined | null
): ValidationResult {
  if (qtyReceived === undefined || qtyReceived === null || isNaN(qtyReceived) || qtyReceived < 0) {
    return { valid: false, error: 'Quantity received must be 0 or greater' };
  }

  return { valid: true };
}

export function validateDisputeResolution(
  correctedQty: number | undefined | null
): ValidationResult {
  if (correctedQty === undefined || correctedQty === null || isNaN(correctedQty) || correctedQty <= 0) {
    return { valid: false, error: 'Corrected quantity must be a positive integer' };
  }

  return { valid: true };
}

export function validateDestructionLogging(
  facilityName: string | undefined | null,
  qtyDestroyed: number | undefined | null
): ValidationResult {
  if (!facilityName || typeof facilityName !== 'string' || !facilityName.trim()) {
    return { valid: false, error: 'Destruction facility name is required' };
  }

  if (qtyDestroyed === undefined || qtyDestroyed === null || isNaN(qtyDestroyed) || qtyDestroyed <= 0) {
    return { valid: false, error: 'Destroyed quantity must be a positive integer' };
  }

  return { valid: true };
}
