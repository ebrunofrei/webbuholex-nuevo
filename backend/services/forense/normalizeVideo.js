import path from "path";
import { execFile } from "child_process";
import { FFMPEG_PATH, assertFFmpeg } from "./ffmpegConfig.js";

export async function normalizeRotation(videoPath, rotation) {
  assertFFmpeg();

  if (![90, 180, 270].includes(rotation)) {
    return videoPath; // no tocar
  }

  const out = videoPath.replace(
    path.extname(videoPath),
    `.rot${rotation}.mp4`
  );

  const filter =
    rotation === 90  ? "transpose=1" :
    rotation === 180 ? "transpose=1,transpose=1" :
    "transpose=2";

  await exec(videoPath, out, filter);
  return out;
}

function exec(input, output, filter) {
  return new Promise((resolve, reject) => {
    execFile(
      FFMPEG_PATH,
      [
        "-y",
        "-i", input,
        "-vf", filter,
        "-c:a", "copy",
        output
      ],
      { windowsHide: true },
      (err, _out, errOut) => {
        if (err) {
          reject(new Error(errOut));
        } else resolve();
      }
    );
  });
}
