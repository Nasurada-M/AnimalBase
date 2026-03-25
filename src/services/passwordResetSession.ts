const RESET_TOKEN_KEY = 'ab_reset_token';
const RESET_EMAIL_KEY = 'ab_reset_email';

export function setPasswordResetSession(resetToken: string, email: string) {
  sessionStorage.setItem(RESET_TOKEN_KEY, resetToken);
  sessionStorage.setItem(RESET_EMAIL_KEY, email);
}

export function getPasswordResetSession() {
  return {
    resetToken: sessionStorage.getItem(RESET_TOKEN_KEY),
    email: sessionStorage.getItem(RESET_EMAIL_KEY),
  };
}

export function clearPasswordResetSession() {
  sessionStorage.removeItem(RESET_TOKEN_KEY);
  sessionStorage.removeItem(RESET_EMAIL_KEY);
}
