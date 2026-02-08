import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { FFMPEG_PATH } from "./ffmpegConfig.js";

export async function segmentAudio(audioPath, seconds = 600) {
  const dir = path.dirname(audioPath);
  const base = path.basename(audioPath, path.extname(audioPath));

  const pattern = path.join(dir, `${base}_chunk_%03d.wav`);

  await execFilePromise([
    "-y",
    "-i", audioPath,
    "-f", "segment",
    "-segment_time", String(seconds),
    "-c", "copy",
    pattern
  ]);

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(`${base}_chunk_`))
    .map(f => path.join(dir, f));

  if (!files.length) {
    throw new Error("No se generaron chunks de audio");
  }

  return files;
}

function execFilePromise(args) {
  return new Promise((resolve, reject) => {
    execFile(
      FFMPEG_PATH,
      args,
      { windowsHide: true },
      (err, _o, e) => err ? reject(new Error(e)) : resolve()
    );
  });
}
