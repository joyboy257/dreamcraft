import { describe, expect, it, vi } from "vitest";

import { TypedEventBus } from "./eventBus";

type TestEvent =
  | { readonly type: "ping"; readonly value: number }
  | { readonly type: "pong"; readonly label: string };

describe("TypedEventBus", () => {
  it("delivers only matching events and supports idempotent unsubscribe", () => {
    const bus = new TypedEventBus<TestEvent>();
    const listener = vi.fn();
    const unsubscribe = bus.on("ping", listener);

    bus.emit({ type: "pong", label: "ignored" });
    bus.emit({ type: "ping", value: 3 });
    unsubscribe();
    unsubscribe();
    bus.emit({ type: "ping", value: 4 });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ type: "ping", value: 3 });
    expect(bus.listenerCount()).toBe(0);
  });

  it("bounds listeners and recursive dispatch", () => {
    const bus = new TypedEventBus<TestEvent>({
      maximumListenersPerType: 1,
      maximumDispatchDepth: 2,
    });
    bus.on("ping", (event) => bus.emit(event));

    expect(() => bus.on("ping", () => undefined)).toThrow(/Listener limit/);
    expect(() => bus.emit({ type: "ping", value: 1 })).toThrow(
      /dispatch depth/,
    );
  });
});
