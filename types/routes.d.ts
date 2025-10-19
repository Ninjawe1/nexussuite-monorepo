declare module "../dist/routes.js" {
  import type { Express } from "express";
  export function registerRoutes(app: Express): Promise<any>;
}