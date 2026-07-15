import { createDreamHandler } from "../src/server/createDreamHandler";

const handler = createDreamHandler();

export function POST(request: Request): Promise<Response> {
  return handler(request);
}
