import { createHealthHandler } from "../src/server/createHealthHandler";

const handler = createHealthHandler();

export function GET(request: Request): Response {
  return handler(request);
}
