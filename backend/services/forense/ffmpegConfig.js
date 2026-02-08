import fs from "fs";
import path from "path";

export const PROJECT_ROOT = process.cwd();

export const FFMPEG_PATH =
  process.env.FFMPEG_PATH ||
  path.join(PROJECT_ROOT, "ffmpeg.exe");

export const FFPROBE_PATH =
  process.env.FFPROBE_PATH ||
  path.join(PROJECT_ROOT, "ffprobe.exe");

export function assertFFmpeg() {
  if (!fs.existsSync(FFMPEG_PATH)) {
    throw new Error(`FFmpeg no encontrado en: ${FFMPEG_PATH}`);
  }
  if (!fs.existsSync(FFPROBE_PATH)) {
    throw new Error(`FFprobe no encontrado en: ${FFPROBE_PATH}`);
  }
}
