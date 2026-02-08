import path from "path";
import { execFile } from "child_process";
import { FFMPEG_PATH, assertFFmpeg } from "./ffmpegConfig.js";

export async function extractAudio(videoPath) {
  assertFFmpeg();

  const out = videoPath.replace(
    path.extname(videoPath),
    ".wav"
  );

  return new Promise((resolve, reject) => {
    execFile(
      FFMPEG_PATH,
      [
        "-y",
        "-i", videoPath,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-f", "wav",
        out
      ],
      { windowsHide: true },
      (err, _o, e) => {
        if (err) reject(new Error(e));
        else resolve(out);
      }
    );
  });
}
