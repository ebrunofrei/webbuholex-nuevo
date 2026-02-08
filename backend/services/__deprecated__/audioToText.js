import fs from "fs";
import path from "path";
import { getOpenAIClient } from "../openaiService.js";

export async function audioToTextOpenAI(buffer, filename = "audio") {
  const openai = getOpenAIClient();

  const tempPath = path.join("/tmp", `${Date.now()}-${filename}`);
  fs.writeFileSync(tempPath, buffer);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "whisper-1",
      response_format: "text",
    });

    return transcription?.trim() || "";
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}
