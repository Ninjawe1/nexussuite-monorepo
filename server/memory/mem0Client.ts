import { MemoryClient } from "mem0ai";

let mem0: MemoryClient | null = null;
let warnedMissingKey = false;

export function getMem0(): MemoryClient | null {
  // Lazy initialization to ensure unified dotenv has been applied in server/index.ts
  if (!mem0) {
    const apiKey = process.env.MEM0_API_KEY;
    try {
      if (apiKey && apiKey.trim() !== "") {
        mem0 = new MemoryClient({ apiKey });
        console.log("[mem0] Client initialized");
      } else if (!warnedMissingKey) {
        console.warn("[mem0] MEM0_API_KEY is not set. Memory operations will be disabled.");
        warnedMissingKey = true;
      }
    } catch (err) {
      console.error("[mem0] Failed to initialize MemoryClient:", err);
    }
  }
  return mem0;
}

export default mem0;