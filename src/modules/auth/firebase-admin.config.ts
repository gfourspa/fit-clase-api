import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK configuration
 */
export const initializeFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin configuration missing. Required env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return admin;
};

/**
 * Get Firebase Admin instance
 */
export const getFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
    initializeFirebaseAdmin();
  }
  return admin;
};