import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const results: Record<string, any> = {
    env: {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    },
    nodeVersion: process.version,
  };

  try {
    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    results.firebaseAppImport = "ok";

    try {
      const { getFirestore } = await import("firebase-admin/firestore");
      results.firebaseFirestoreImport = "ok";

      if (!getApps().length) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
            privateKey: privateKey!,
          }),
        });
        results.firebaseInit = "ok";
      } else {
        results.firebaseInit = "already initialized";
      }

      const db = getFirestore();
      const doc = await db.doc("budget/settings").get();
      results.firestoreRead = "ok";
      results.docExists = doc.exists;

    } catch (e: any) {
      results.firestoreError = e.message;
    }
  } catch (e: any) {
    results.firebaseImportError = e.message;
  }

  res.status(200).json(results);
}
