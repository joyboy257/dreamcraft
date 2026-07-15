import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

import { createDreamHandler } from "./createDreamHandler";

async function readBody(
  request: IncomingMessage,
  maximumBytes: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of request as AsyncIterable<unknown>) {
    const bytes =
      typeof chunk === "string"
        ? new TextEncoder().encode(chunk)
        : chunk instanceof Uint8Array
          ? chunk
          : null;
    if (!bytes) throw new TypeError("Unsupported local request body chunk");
    total += bytes.byteLength;
    if (total > maximumBytes) break;
    chunks.push(bytes);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function requestHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(name, entry);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
}

async function writeResponse(
  webResponse: Response,
  response: ServerResponse,
): Promise<void> {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, name) => response.setHeader(name, value));
  if (!webResponse.body) {
    response.end();
    return;
  }
  const reader = webResponse.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!response.write(value)) {
        await new Promise<void>((resolve) => response.once("drain", resolve));
      }
    }
    response.end();
  } finally {
    reader.releaseLock();
  }
}

export function createDreamVitePlugin(
  environment: Readonly<Record<string, string | undefined>>,
): Plugin {
  const handler = createDreamHandler(environment);
  const maximumBodyBytes = Number.parseInt(
    environment.DREAMCRAFT_MAX_BODY_BYTES ?? "8192",
    10,
  );
  return {
    name: "dreamcraft-local-api",
    configureServer(server) {
      const handleRequest = async (
        request: IncomingMessage,
        response: ServerResponse,
      ): Promise<void> => {
        const abortController = new AbortController();
        request.once("aborted", () =>
          abortController.abort(
            new DOMException("Dream generation was aborted", "AbortError"),
          ),
        );
        response.once("close", () => {
          if (!response.writableEnded) {
            abortController.abort(
              new DOMException("Dream generation was aborted", "AbortError"),
            );
          }
        });
        try {
          const body = await readBody(request, maximumBodyBytes + 1);
          const host = request.headers.host ?? "127.0.0.1";
          const webRequest = new Request(`http://${host}/api/dream`, {
            method: request.method ?? "GET",
            headers: requestHeaders(request),
            ...(request.method !== "GET" && request.method !== "HEAD"
              ? { body: new TextDecoder().decode(body) }
              : {}),
            signal: abortController.signal,
          });
          await writeResponse(await handler(webRequest), response);
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({
            error: { code: "local_route_failed", message: "The local dream route failed safely." },
          }));
        }
      };
      server.middlewares.use("/api/dream", (request, response) => {
        void handleRequest(request, response);
      });
    },
  };
}
