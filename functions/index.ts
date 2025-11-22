import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const ready = registerRoutes(app);

export const api = onRequest(
  {
    region: "me-central2",
    cors: true,
    maxInstances: 1
  },
  async (req, res) => {
    await ready;
    return app(req, res);
  }
);