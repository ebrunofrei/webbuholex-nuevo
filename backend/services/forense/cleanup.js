// services/forense/cleanup.js
import fs from "fs";

export async function cleanupFiles(paths = []) {
  for (const p of paths) {
    if (p && fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {}
    }
  }
}
