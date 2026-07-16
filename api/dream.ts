import { createDreamHandler } from "../src/server/createDreamHandler.js";

const handler = createDreamHandler();

export function POST(request: Request): Promise<Response> {
  return handler(request);
}
