const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Admin-only callable: set another user's password directly (no email link).
 *
 * Security: the browser SDK can never change another user's password. This runs
 * with the Admin SDK server-side and re-verifies that the CALLER is an admin by
 * reading their role from Firestore (users/{uid}.role) — never trust the client.
 *
 * Client call:
 *   firebase.functions().httpsCallable('setUserPassword')({ uid, newPassword })
 */
exports.setUserPassword = functions.https.onCall(async (data, context) => {
  // 1. Must be signed in.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  // 2. Caller must be an admin (verified server-side against Firestore).
  let callerRole = null;
  try {
    const callerSnap = await admin.firestore().collection('users').doc(context.auth.uid).get();
    callerRole = callerSnap.exists ? callerSnap.data().role : null;
  } catch (e) {
    console.error('setUserPassword: failed reading caller role', e);
    throw new functions.https.HttpsError('internal', 'Could not verify your admin role: ' + e.message);
  }
  if (callerRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  }

  // 3. Validate input.
  const uid = data && data.uid;
  const newPassword = data && data.newPassword;
  if (!uid || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A target user and a password of at least 6 characters are required.'
    );
  }

  // 4. Set the password — map Admin SDK auth errors to clear messages.
  try {
    await admin.auth().updateUser(uid, { password: newPassword });
    return { success: true };
  } catch (e) {
    console.error('setUserPassword: updateUser failed for uid=' + uid, e);
    if (e && e.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError(
        'not-found',
        'This account has no matching login (its user record may predate the auth account). Have them sign up once, or delete and recreate the account.'
      );
    }
    if (e && e.code === 'auth/invalid-password') {
      throw new functions.https.HttpsError('invalid-argument', 'Password rejected: must be at least 6 characters.');
    }
    throw new functions.https.HttpsError('internal', 'Could not set password: ' + (e.message || String(e)));
  }
});
