/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // digits only, e.g. "2348012345678" for wa.me
  displayFormatted: string; // "+234 801 234 5678"
  isNigerian: boolean;
  error?: string;
}

/**
 * Normalizes and validates phone numbers with special focus on Nigerian mobile/landline numbers.
 * Supports:
 * - Local Nigerian format: "08012345678", "07031234567", "09098765432", "08123456789" (11 digits starting with 0)
 * - International Nigerian format: "+2348012345678", "2348012345678", "002348012345678"
 * - General international format with + prefix: "+1234567890", "+447123456789"
 */
export function normalizePhoneNumber(rawPhone: string): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      normalized: '',
      displayFormatted: '',
      isNigerian: false,
      error: 'Phone number is required.',
    };
  }

  // Remove spaces, hyphens, brackets, dots
  const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  // Check if completely empty
  if (!cleaned) {
    return {
      isValid: false,
      normalized: '',
      displayFormatted: '',
      isNigerian: false,
      error: 'Phone number is empty.',
    };
  }

  // Case 1: Domestic Nigerian format (e.g. 08012345678 or 070..., 090..., 081..., 091...)
  // 11 digits starting with '0'
  if (/^0[789][01]\d{8}$/.test(cleaned)) {
    const withoutZero = cleaned.substring(1);
    const normalized = '234' + withoutZero;
    const displayFormatted = `+234 ${withoutZero.substring(0, 3)} ${withoutZero.substring(3, 6)} ${withoutZero.substring(6)}`;
    return {
      isValid: true,
      normalized,
      displayFormatted,
      isNigerian: true,
    };
  }

  // Case 2: Nigerian landline (e.g., 01..., 02..., etc.) - 8-10 digits starting with 0
  if (/^0[1-6]\d{6,8}$/.test(cleaned)) {
    const withoutZero = cleaned.substring(1);
    const normalized = '234' + withoutZero;
    const displayFormatted = `+234 ${withoutZero.substring(0, 2)} ${withoutZero.substring(2)}`;
    return {
      isValid: true,
      normalized,
      displayFormatted,
      isNigerian: true,
    };
  }

  // Case 3: International Nigerian format (+234... or 234... or 00234...)
  let intlDigits = cleaned;
  if (intlDigits.startsWith('+')) {
    intlDigits = intlDigits.substring(1);
  } else if (intlDigits.startsWith('00')) {
    intlDigits = intlDigits.substring(2);
  }

  // Check if it's Nigerian international (234 followed by valid prefix without leading 0)
  // Usually 234 followed by 10 digits, e.g., 234 80 1234 5678 (13 digits total)
  if (/^234[789][01]\d{8}$/.test(intlDigits)) {
    const localPart = intlDigits.substring(3);
    const displayFormatted = `+234 ${localPart.substring(0, 3)} ${localPart.substring(3, 6)} ${localPart.substring(6)}`;
    return {
      isValid: true,
      normalized: intlDigits,
      displayFormatted,
      isNigerian: true,
    };
  }

  // If user entered 23408012345678 (erroneous extra 0 after 234)
  if (/^2340[789][01]\d{8}$/.test(intlDigits)) {
    const localPart = intlDigits.substring(4);
    const normalized = '234' + localPart;
    const displayFormatted = `+234 ${localPart.substring(0, 3)} ${localPart.substring(3, 6)} ${localPart.substring(6)}`;
    return {
      isValid: true,
      normalized,
      displayFormatted,
      isNigerian: true,
    };
  }

  // Case 4: General valid international E.164 phone number (7 to 15 digits)
  if (/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
    const normalized = cleaned.replace(/^\+/, '');
    return {
      isValid: true,
      normalized,
      displayFormatted: `+${normalized}`,
      isNigerian: normalized.startsWith('234'),
    };
  }

  // If digits only but doesn't match standard length
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (cleaned.startsWith('0') && digitsOnly.length !== 11) {
    return {
      isValid: false,
      normalized: digitsOnly,
      displayFormatted: rawPhone,
      isNigerian: true,
      error: `Nigerian mobile numbers must be 11 digits (e.g. 08012345678). You entered ${digitsOnly.length} digits.`,
    };
  }

  return {
    isValid: false,
    normalized: digitsOnly,
    displayFormatted: rawPhone,
    isNigerian: false,
    error: 'Invalid phone format. Please use 08012345678 or international format +2348012345678.',
  };
}

/**
 * Builds a secure, correctly encoded wa.me link for WhatsApp.
 */
export function buildWhatsAppLink(normalizedPhone: string, message: string): string {
  // wa.me requires phone number without leading '+' or symbols, only numbers
  const cleanPhone = normalizedPhone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Formats currency (default NGN ₦) with comma separators and 2 decimal points.
 */
export function formatCurrency(amount: number, symbol: string = '₦'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol}0.00`;
  }
  const formatted = Math.abs(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

/**
 * Generates reminder message text based on template and variable substitutions.
 */
export function interpolateTemplate(
  template: string,
  variables: {
    customerName: string;
    businessName: string;
    ownerName?: string;
    description: string;
    amountDue: string;
    originalAmount?: string;
    amountRepaid?: string;
    dueDate?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    reference?: string;
    paymentDate?: string;
  }
): string {
  let result = template;
  result = result.replace(/\{customer_name\}/g, variables.customerName || 'Customer');
  result = result.replace(/\{business_name\}/g, variables.businessName || 'Our Business');
  result = result.replace(/\{owner_name\}/g, variables.ownerName || '');
  result = result.replace(/\{description\}/g, variables.description || 'Goods / Service');
  result = result.replace(/\{amount_due\}/g, variables.amountDue || '₦0.00');
  result = result.replace(/\{original_amount\}/g, variables.originalAmount || '₦0.00');
  result = result.replace(/\{amount_repaid\}/g, variables.amountRepaid || '₦0.00');
  result = result.replace(/\{due_date\}/g, variables.dueDate || 'due date');
  result = result.replace(/\{bank_name\}/g, variables.bankName || '');
  result = result.replace(/\{account_number\}/g, variables.accountNumber || '');
  result = result.replace(/\{account_name\}/g, variables.accountName || '');
  result = result.replace(/\{reference\}/g, variables.reference || '');
  result = result.replace(/\{payment_date\}/g, variables.paymentDate || '');
  return result;
}
