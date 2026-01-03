import ChatMessage from "../../models/ChatMessage.js";
import { embedText } from "./embeddingService.js";

export async function indexMessageSemantic(messageId) {
  const msg = await ChatMessage.findById(messageId);
  if (!msg) return;

  if (msg.role !== "user") return;
  if (msg.embedding?.length) return;

  const emb = await embedText(msg.content);
  if (!emb) return;

  msg.embedding = emb;
  await msg.save();
}
