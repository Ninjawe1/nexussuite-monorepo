import express from "express";
import serverless from "serverless-http";
import { registerRoutes } from "../../server/routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await registerRoutes(app);
    initialized = true;
  }
}

export const handler = async (event: any, context: any) => {
  await ensureInitialized();
  const h = serverless(app, { basePath: "/.netlify/functions/api" });
  return h(event, context);
};