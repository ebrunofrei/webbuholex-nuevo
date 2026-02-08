// ============================================================================
// 🫧 Bubble Usage Repository — R7.7++
// ----------------------------------------------------------------------------
// Daily usage tracking per user & analysis type
// - Deterministic
// - TTL-based cleanup
// - Serverless-safe
// ============================================================================

import mongoose from "mongoose";
import { dbConnect } from "../../../services/db.js";

/* -------------------------------------------------
 * Constants
 * ------------------------------------------------- */
const VALID_TYPES = ["simple", "legal_analysis", "deep_analysis"];
const TTL_SECONDS = 60 * 60 * 72; // 72 hours

/* -------------------------------------------------
 * Date helpers (YYYY-MM-DD)
 * ------------------------------------------------- */
function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // UTC
}

/* -------------------------------------------------
 * Schema (registered once)
 * ------------------------------------------------- */
const BubbleUsageSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, required: true, index: true },
    day: { type: String, required: true, index: true }, // YYYY-MM-DD
    type: {
      type: String,
      enum: VALID_TYPES,
      required: true,
      index: true,
    },
    used: { type: Number, default: 0 },
  },
  {
    collection: "bubble_usage",
    timestamps: true, // needed for TTL
  }
);

// Unique key per user/day/type
BubbleUsageSchema.index(
  { usuarioId: 1, day: 1, type: 1 },
  { unique: true }
);

// TTL cleanup (based on createdAt)
BubbleUsageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: TTL_SECONDS }
);

// Avoid OverwriteModelError (hot reload / serverless)
const BubbleUsage =
  mongoose.models.BubbleUsage ||
  mongoose.model("BubbleUsage", BubbleUsageSchema);

/* -------------------------------------------------
 * Internal helpers
 * ------------------------------------------------- */
async function ensureDb() {
  await dbConnect();
}

function validateType(type) {
  return VALID_TYPES.includes(type);
}

/* -------------------------------------------------
 * Repository API
 * ------------------------------------------------- */

/**
 * Get today's usage count for a user and analysis type
 */
export async function getTodayUsage(usuarioId, type, date = new Date()) {
  if (!usuarioId || !validateType(type)) return 0;

  await ensureDb();

  const day = getDayKey(date);

  const doc = await BubbleUsage.findOne(
    { usuarioId, day, type },
    { used: 1 }
  ).lean();

  return doc?.used ?? 0;
}

/**
 * Increment today's usage for a given analysis type
 */
export async function incrementUsage(
  usuarioId,
  type,
  incrementBy = 1,
  date = new Date()
) {
  if (!usuarioId || !validateType(type)) return false;

  await ensureDb();

  const day = getDayKey(date);

  await BubbleUsage.updateOne(
    { usuarioId, day, type },
    {
      $inc: { used: incrementBy },
      $setOnInsert: {
        usuarioId,
        day,
        type,
      },
    },
    { upsert: true }
  );

  return true;
}

/**
 * Reset usage for today (support/admin use)
 */
export async function resetUsage(usuarioId, type, date = new Date()) {
  if (!usuarioId || !validateType(type)) return false;

  await ensureDb();

  const day = getDayKey(date);

  await BubbleUsage.updateOne(
    { usuarioId, day, type },
    { $set: { used: 0 } }
  );

  return true;
}

/**
 * (Optional) Reset ALL usage for a user/day
 * Useful for support tooling
 */
export async function resetAllUsage(usuarioId, date = new Date()) {
  if (!usuarioId) return false;

  await ensureDb();

  const day = getDayKey(date);

  await BubbleUsage.updateMany(
    { usuarioId, day },
    { $set: { used: 0 } }
  );

  return true;
}
