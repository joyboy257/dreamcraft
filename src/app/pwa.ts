export interface ServiceWorkerContainerPort {
  register(
    scriptUrl: string,
    options: { scope: string; updateViaCache: "none" },
  ): Promise<unknown>;
}

export interface PwaRegistrationOptions {
  production?: boolean;
  serviceWorker?: ServiceWorkerContainerPort;
  scriptUrl?: string;
}

export type PwaRegistrationResult =
  | { status: "registered"; registration: unknown }
  | { status: "skipped"; reason: "non-production" | "unsupported" }
  | { status: "failed"; error: unknown };

function browserServiceWorker(): ServiceWorkerContainerPort | undefined {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return undefined;
  }
  return navigator.serviceWorker;
}

export async function registerDreamcraftServiceWorker(
  options: PwaRegistrationOptions = {},
): Promise<PwaRegistrationResult> {
  const production = options.production ?? import.meta.env.PROD;
  if (!production) {
    return { status: "skipped", reason: "non-production" };
  }

  const serviceWorker = options.serviceWorker ?? browserServiceWorker();
  if (!serviceWorker) {
    return { status: "skipped", reason: "unsupported" };
  }

  try {
    const registration = await serviceWorker.register(
      options.scriptUrl ?? "/sw.js",
      { scope: "/", updateViaCache: "none" },
    );
    return { status: "registered", registration };
  } catch (error) {
    return { status: "failed", error };
  }
}
