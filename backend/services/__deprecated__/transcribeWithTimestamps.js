import fs from "fs";
import path from "path";
import { getOpenAIClient } from "../openaiService.js";

export async function transcribeWithTimestamps(buffer, filename = "audio") {
  const openai = getOpenAIClient();

  const tempPath = path.join("/tmp", `${Date.now()}-${filename}`);
  fs.writeFileSync(tempPath, buffer);

  try {
    const result = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    return {
      text: result.text || "",
      segments: result.segments || [],
      language: result.language || "unknown",
      duration: result.duration || null,
    };
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}
