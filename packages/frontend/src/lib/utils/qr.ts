import { customAlphabet } from 'nanoid';

// Create a custom nanoid generator with only alphanumeric characters
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

export function generateQRCode(): string {
  return nanoid();
}

// Function to validate QR code format
export function isValidQRCode(code: string): boolean {
  return /^[0-9A-Z]{8}$/.test(code);
} 