import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type LocalLogLevel = "info" | "warn" | "error";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Fortaleza",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Appends one JSON line to logs/log-YYYY-MM-DD.log in development only.
 * Requires the Node.js runtime. Await the call before ending the request.
 * Pass only selected diagnostic data, never credentials or full requests.
 * Returns false when disabled or when serialization or writing fails.
 */
export async function writeLocalLog(
  subject: string,
  notes: unknown,
  level: LocalLogLevel = "info",
): Promise<boolean> {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  try {
    const now = new Date();
    const parts = dateFormatter.formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    const directory = path.join(process.cwd(), "logs");
    const file = path.join(directory, `log-${year}-${month}-${day}.log`);
    const seen = new WeakSet<object>();
    const entry = JSON.stringify(
      { timestamp: now.toISOString(), level, subject, notes },
      (_key: string, value: unknown): unknown => {
        if (typeof value === "bigint") {
          return value.toString();
        }

        if (value !== null && typeof value === "object") {
          if (seen.has(value)) {
            return "[Circular or repeated reference]";
          }
          seen.add(value);

          if (value instanceof Error) {
            return { name: value.name, message: value.message };
          }
        }

        return value === undefined ? null : value;
      },
    );

    await mkdir(directory, { recursive: true, mode: 0o700 });
    await appendFile(file, `${entry}\n`, { encoding: "utf8", mode: 0o600 });
    return true;
  } catch {
    console.warn("[writeLocalLog] Unable to write local diagnostic log.");
    return false;
  }
}
