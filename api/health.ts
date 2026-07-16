import { createHealthHandler } from "../src/server/createHealthHandler.js";

const handler = createHealthHandler();

export function GET(request: Request): Response {
  return handler(request);
}
