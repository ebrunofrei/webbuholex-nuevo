import { execFile } from "child_process";
import { FFPROBE_PATH, assertFFmpeg } from "./ffmpegConfig.js";

export async function probeVideo(videoPath) {
  assertFFmpeg();

  return new Promise((resolve, reject) => {
    execFile(
      FFPROBE_PATH,
      [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream_tags=rotate",
        "-show_entries", "format=duration",
        "-of", "json",
        videoPath
      ],
      { windowsHide: true },
      (err, stdout) => {
        if (err) return reject(err);
        resolve(JSON.parse(stdout));
      }
    );
  });
}

export function extractRotation(probe) {
  const rotate =
    probe?.streams?.[0]?.tags?.rotate;

  return rotate ? Number(rotate) : 0;
}
