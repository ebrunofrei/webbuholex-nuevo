import cron from "node-cron";
import DeadlineEvent from "../models/DeadlineEvent.js";

export function startDeadlineScheduler({ notify }) {
  cron.schedule("*/1 * * * *", async () => {
    const nowUnix = Math.floor(Date.now() / 1000);

    // Ventana: próximos 72h
    const maxUnix = nowUnix + 72 * 3600;

    const events = await DeadlineEvent.find({
      status: "active",
      endUnix: { $gte: nowUnix, $lte: maxUnix },
    }).lean();

    for (const ev of events) {
      const hoursLeft = Math.floor((ev.endUnix - nowUnix) / 3600);

      for (const h of ev.alerts || []) {
        // disparar cuando estamos <=h y no se alertó aún
        if (hoursLeft <= h && !(ev.alerted || []).includes(h)) {
          await notify(ev, { hoursLeft, trigger: h });

          await DeadlineEvent.updateOne(
            { _id: ev._id },
            { $addToSet: { alerted: h } }
          );
        }
      }
    }
  });
}
