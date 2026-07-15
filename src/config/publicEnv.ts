export interface PublicEnv {
  apiBase: string;
  debug: boolean;
  generationStrategy: "single-sol" | "director-parallel";
}

const PUBLIC_SECRET_PATTERN = /VITE_.*(?:OPENAI|API_KEY|SECRET|TOKEN)/i;

function parseBoolean(value: unknown, key: string): boolean {
  if (value === undefined || value === "") return false;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${key} must be either "true" or "false".`);
}

export function parsePublicEnv(values: Record<string, unknown>): PublicEnv {
  const exposedSecret = Object.keys(values).find(
    (key) => PUBLIC_SECRET_PATTERN.test(key) && values[key],
  );

  if (exposedSecret) {
    throw new Error(
      `Unsafe client environment variable detected: ${exposedSecret}. Keep secrets server-side.`,
    );
  }

  const rawApiBase = values.VITE_DREAMCRAFT_API_BASE;
  const apiBase =
    typeof rawApiBase === "string" && rawApiBase.trim()
      ? rawApiBase.trim().replace(/\/$/, "")
      : "/api";

  return {
    apiBase,
    debug: parseBoolean(values.VITE_DREAMCRAFT_DEBUG, "VITE_DREAMCRAFT_DEBUG"),
    generationStrategy:
      values.VITE_DREAMCRAFT_GENERATION_STRATEGY === "director-parallel"
        ? "director-parallel"
        : "single-sol",
  };
}

export const publicEnv = parsePublicEnv(import.meta.env);
