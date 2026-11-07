import type { AuthError } from '@supabase/supabase-js';

/** Turns Supabase auth errors into plain, calm messages. */
export function authMessage(error: AuthError | Error | null | undefined): string {
  if (!error) return '';
  if (!navigator.onLine) return "You're offline. Connect to the internet and try again.";
  const code = 'code' in error ? (error as AuthError).code : undefined;
  const msg = error.message.toLowerCase();
  switch (code) {
    case 'invalid_credentials':
      return 'Email or password is incorrect.';
    case 'email_not_confirmed':
      return 'Please verify your email first.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Try signing in.';
    case 'weak_password':
      return 'Choose a stronger password: at least 8 characters, with a number.';
    case 'otp_expired':
      return 'That code has expired. Ask for a new one.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many tries. Please wait a minute and try again.';
    case 'same_password':
      return 'Choose a password you haven’t used before.';
  }
  if (msg.includes('fetch') || msg.includes('network')) return "We couldn't reach Shoppa. Check your connection and try again.";
  if (msg.includes('token') && (msg.includes('expired') || msg.includes('invalid'))) return 'That code is wrong or has expired.';
  return 'Something went wrong. Please try again.';
}
