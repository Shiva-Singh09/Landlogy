import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// 6-digit numeric OTP delivered to the seller's registered email.
export const OTP_LENGTH = 6;
// bcrypt cost factor — matches the project's password hashing rounds
// (see authController.setPassword / register).
export const BCRYPT_ROUNDS = 10;

// Generate a cryptographically-secure 6-digit OTP as a zero-padded string.
// Uses the OS CSPRNG (crypto.randomInt). Never logs the OTP.
export const generateOtp = () => {
  const max = 10 ** OTP_LENGTH; // 1,000,000 -> range [0, 999999]
  const n = crypto.randomInt(0, max);
  return String(n).padStart(OTP_LENGTH, '0');
};

// Hash an OTP for at-rest storage. Only the hash is persisted; the plaintext
// code is never written to the database or logs.
export const hashOtp = async (otp) => bcrypt.hash(String(otp), BCRYPT_ROUNDS);

// Constant-time verification of an OTP against a stored bcrypt hash.
export const verifyOtpHash = async (otp, hash) =>
  typeof hash === 'string' ? bcrypt.compare(String(otp), hash) : false;
