// /utils/storage.js

import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: JSON.parse(process.env.GCP_CREDENTIALS),
});

const bucketName = process.env.BUCKET_NAME;

export async function saveToStorageAndGetUrl(filename, buffer, mimetype = "text/plain") {
  const file = storage.bucket(bucketName).file("resultados_ia/" + filename);
  await file.save(buffer, { contentType: mimetype });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucketName}/resultados_ia/${filename}`;
}
