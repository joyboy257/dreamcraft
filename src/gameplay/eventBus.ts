type EventType<Event extends { readonly type: string }> = Event["type"];
type EventOfType<
  Event extends { readonly type: string },
  Type extends EventType<Event>,
> = Extract<Event, { readonly type: Type }>;

export interface EventBusOptions {
  readonly maximumListenersPerType?: number;
  readonly maximumDispatchDepth?: number;
}

const DEFAULT_MAXIMUM_LISTENERS = 32;
const DEFAULT_MAXIMUM_DISPATCH_DEPTH = 8;

function positiveIntegerOr(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.floor(value);
}

/**
 * A small synchronous event bus for trusted runtime events.
 *
 * Listener count and recursive dispatch are bounded so a malformed integration
 * cannot grow work without limit during a frame.
 */
export class TypedEventBus<Event extends { readonly type: string }> {
  readonly #listeners = new Map<string, Set<(event: Event) => void>>();
  readonly #maximumListenersPerType: number;
  readonly #maximumDispatchDepth: number;
  #dispatchDepth = 0;

  constructor(options: EventBusOptions = {}) {
    this.#maximumListenersPerType = positiveIntegerOr(
      options.maximumListenersPerType,
      DEFAULT_MAXIMUM_LISTENERS,
    );
    this.#maximumDispatchDepth = positiveIntegerOr(
      options.maximumDispatchDepth,
      DEFAULT_MAXIMUM_DISPATCH_DEPTH,
    );
  }

  on<Type extends EventType<Event>>(
    type: Type,
    listener: (event: EventOfType<Event, Type>) => void,
  ): () => void {
    const listeners = this.#listeners.get(type) ?? new Set();
    if (listeners.size >= this.#maximumListenersPerType) {
      throw new Error(`Listener limit reached for event type: ${type}`);
    }

    const guardedListener = (event: Event): void => {
      if (event.type === type) {
        listener(event as EventOfType<Event, Type>);
      }
    };
    listeners.add(guardedListener);
    this.#listeners.set(type, listeners);

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      listeners.delete(guardedListener);
      if (listeners.size === 0) this.#listeners.delete(type);
    };
  }

  emit(event: Event): void {
    if (this.#dispatchDepth >= this.#maximumDispatchDepth) {
      throw new Error("Gameplay event dispatch depth exceeded its safety limit.");
    }

    const listeners = this.#listeners.get(event.type);
    if (!listeners || listeners.size === 0) return;

    this.#dispatchDepth += 1;
    try {
      for (const listener of [...listeners]) listener(event);
    } finally {
      this.#dispatchDepth -= 1;
    }
  }

  listenerCount(type?: EventType<Event>): number {
    if (type !== undefined) return this.#listeners.get(type)?.size ?? 0;

    let count = 0;
    for (const listeners of this.#listeners.values()) count += listeners.size;
    return count;
  }

  clear(): void {
    this.#listeners.clear();
  }
}
