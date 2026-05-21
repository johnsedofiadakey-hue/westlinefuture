const ERROR_MAP = {
  // Auth
  'auth/invalid-credential':          'Incorrect username or password.',
  'auth/user-not-found':              'No account found with these details.',
  'auth/wrong-password':              'Incorrect password.',
  'auth/too-many-requests':           'Too many attempts. Please wait a few minutes and try again.',
  'auth/invalid-phone-number':        'Enter a valid phone number in international format.',
  'auth/invalid-verification-code':   'Incorrect verification code. Please try again.',
  'auth/code-expired':                'This code has expired. Request a new one.',
  'auth/quota-exceeded':              'SMS quota exceeded. Try again later or contact support.',
  'auth/email-already-in-use':        'An account with this email already exists.',
  'auth/weak-password':               'Password must be at least 6 characters.',
  'auth/requires-recent-login':       'Please log out and sign back in to perform this action.',
  'auth/network-request-failed':      'No internet connection. Check your network and try again.',
  'auth/popup-closed-by-user':        'Sign-in popup was closed before completing.',
  // Firestore
  'permission-denied':                "You don't have permission to perform this action.",
  'not-found':                        'The requested data was not found.',
  'unavailable':                      'Service temporarily unavailable. Check your connection.',
  'resource-exhausted':               'Request quota exceeded. Please try again later.',
  'deadline-exceeded':                'The request timed out. Please try again.',
  'already-exists':                   'This record already exists.',
  // Storage
  'storage/unauthorized':             "You don't have permission to access this file.",
  'storage/canceled':                 'Upload was cancelled.',
  'storage/quota-exceeded':           'Storage quota exceeded. Contact support.',
};

export function mapFirebaseError(err) {
  if (!err) return 'An unexpected error occurred.';
  const code = err.code || '';
  return ERROR_MAP[code] || err.message || 'An unexpected error occurred.';
}
