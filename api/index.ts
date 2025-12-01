import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import serverlessHttp from "serverless-http";
import apiRouter from "../server/routes/index";

const app = express();

app.use(helmet());
app.set("trust proxy", 1);
app.use(cookieParser());

const allowedOrigins = [
  String(process.env.VITE_APP_URL || "http://localhost:5173").replace(/\/$/, ""),
  "http://127.0.0.1:5173"
];

app.use(
  cors({
    origin: (origin, cb) => {
      const o = origin ? origin.replace(/\/$/, "") : undefined;
      const ok = !o || allowedOrigins.includes(o);
      cb(null, ok);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.options(
  "/api/*",
  cors({
    origin: allowedOrigins[0],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/subscription/webhook")) return next();
  return (express.json({ limit: "10mb" }) as any)(req, res, () => {
    return (express.urlencoded({ extended: true, limit: "10mb" }) as any)(req, res, next);
  });
});

app.use("/api", apiRouter);

app.get("/", (_req, res) => {
  res.json({ success: true, service: "nexussuite-api" });
});

export default serverlessHttp(app) as any;
