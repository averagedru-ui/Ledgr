let db: any = null;

export async function getFirestore(): Promise<any> {
  if (db) return db;

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore: _getFirestore } = await import("firebase-admin/firestore");

  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY env vars."
      );
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  db = _getFirestore();
  return db;
}
