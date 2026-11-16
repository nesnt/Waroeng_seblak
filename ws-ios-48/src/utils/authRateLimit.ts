/**
 * Utility untuk pembatasan percobaan login (Rate Limiting / Brute-force Protection)
 * Maksimal 3 kali percobaan gagal -> Cooldown 1 menit (60 detik) per device.
 */

const MAX_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 60;

export interface RateLimitState {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
  maxAttempts: number;
}

export function getRateLimitStatus(prefix: string): RateLimitState {
  try {
    const lockoutUntilRaw = localStorage.getItem(`${prefix}_lockout_until`);
    const attemptsRaw = localStorage.getItem(`${prefix}_login_attempts`);

    const lockoutUntil = lockoutUntilRaw ? parseInt(lockoutUntilRaw, 10) : 0;
    const attempts = attemptsRaw ? parseInt(attemptsRaw, 10) : 0;
    const now = Date.now();

    if (lockoutUntil && lockoutUntil > now) {
      const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return {
        isLocked: true,
        remainingSeconds,
        attempts: MAX_ATTEMPTS,
        maxAttempts: MAX_ATTEMPTS,
      };
    }

    // Jika lockout sudah lewat, bersihkan
    if (lockoutUntil && lockoutUntil <= now) {
      localStorage.removeItem(`${prefix}_lockout_until`);
      localStorage.removeItem(`${prefix}_login_attempts`);
      return {
        isLocked: false,
        remainingSeconds: 0,
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS,
      };
    }

    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts,
      maxAttempts: MAX_ATTEMPTS,
    };
  } catch {
    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }
}

export function recordFailedAttempt(prefix: string): RateLimitState {
  try {
    const current = getRateLimitStatus(prefix);
    if (current.isLocked) {
      return current;
    }

    const nextAttempts = current.attempts + 1;

    if (nextAttempts >= MAX_ATTEMPTS) {
      const lockoutUntil = Date.now() + COOLDOWN_SECONDS * 1000;
      localStorage.setItem(`${prefix}_lockout_until`, lockoutUntil.toString());
      localStorage.setItem(`${prefix}_login_attempts`, nextAttempts.toString());
      return {
        isLocked: true,
        remainingSeconds: COOLDOWN_SECONDS,
        attempts: nextAttempts,
        maxAttempts: MAX_ATTEMPTS,
      };
    }

    localStorage.setItem(`${prefix}_login_attempts`, nextAttempts.toString());
    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: nextAttempts,
      maxAttempts: MAX_ATTEMPTS,
    };
  } catch {
    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: 1,
      maxAttempts: MAX_ATTEMPTS,
    };
  }
}

export function resetRateLimit(prefix: string): void {
  try {
    localStorage.removeItem(`${prefix}_lockout_until`);
    localStorage.removeItem(`${prefix}_login_attempts`);
  } catch {
    // Ignore error
  }
}
