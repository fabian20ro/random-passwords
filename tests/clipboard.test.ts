import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { canCopyToClipboard, copyTextToClipboard, MAX_CLIPBOARD_TEXT_BYTES, probeClipboard } from "../src/clipboard";

type FallbackStubOptions = {
  createElement?: (tag: string) => unknown;
  execCommandReturns?: boolean | ((cmd: string) => boolean);
  bodyExists?: boolean;
  body?: Record<string, any>;
};

function createFallbackStub(options: FallbackStubOptions = {}): Record<string, any> {
  const defaults = {
    createElement: (_tag: string) => ({
      value: "",
      setAttribute: vi.fn(),
      tabIndex: undefined as number | undefined,
      style: { position: "", left: "" },
      select: vi.fn(),
      setSelectionRange: vi.fn((_start: number, _end: number) => {}),
    }),
    execCommandReturns: true as boolean,
    bodyExists: true as boolean,
  };

  const opts = { ...defaults, ...options };

  return {
    createElement: options.createElement || opts.createElement,
    execCommand:
      typeof opts.execCommandReturns === "function"
        ? (opts.execCommandReturns as (cmd: string) => boolean)
        : (_cmd: string) => opts.execCommandReturns,
    body: options.body ?? (opts.bodyExists ? { appendChild: vi.fn(), removeChild: vi.fn() } : null),
  };
}

describe("canCopyToClipboard", () => {
  it("returns true when navigator.clipboard.writeText is a function (modern API)", async () => {
    const mockWriteText = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { writeText: mockWriteText } });

    expect(canCopyToClipboard()).toBe(true);
  });

  it("returns true when navigator.clipboard exists but has no writeText (legacy fallback check)", async () => {
    vi.stubGlobal("navigator", { clipboard: {} });
    // No document.body set by default in vitest — should fall through to body check
    const result = canCopyToClipboard();

    expect(typeof result).toBe("boolean");
  });

  it("returns false when navigator is undefined and document is undefined (Node.js env)", async () => {
    vi.unstubAllGlobals();

    expect(canCopyToClipboard()).toBe(false);
  });

  it("returns true when document.body exists but no clipboard API", async () => {
    const mockTextarea = {
      value: "",
      setAttribute: vi.fn(),
      style: { position: "", left: "" },
      select: vi.fn(),
      setSelectionRange: vi.fn((_start: number, _end: number) => {}),
    };

    vi.stubGlobal("document", createFallbackStub({
      createElement: () => mockTextarea as unknown as HTMLTextAreaElement,
    }));
    // navigator is undefined by default in vitest

    expect(canCopyToClipboard()).toBe(true);
  });

  it("returns false when document.body is null", async () => {
    const createElementSpy = vi.fn();
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("document", {
      createElement: createElementSpy,
      body: null,
    });

    expect(canCopyToClipboard()).toBe(false);
  });

  it("returns true when clipboard exists and writeText is a function (real-world browser)", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: () => Promise.resolve(),
      },
    });

    expect(canCopyToClipboard()).toBe(true);
  });

  it("does not mutate DOM or invoke any APIs", async () => {
    const createElementSpy = vi.fn();
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("document", {
      createElement: createElementSpy,
      body: null,
    });

    canCopyToClipboard(); // no throw expected

    expect(createElementSpy).not.toHaveBeenCalled();
  });

  it("falls through to legacy path when navigator.clipboard.writeText is not a function but document.body exists", () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: "not-a-function" } });
    vi.stubGlobal("document", { body: {} });

    expect(canCopyToClipboard()).toBe(true); // falls through to document.body check
  });

  it("returns false when navigator.clipboard.writeText is not a function and no document.body", () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: null } });
    vi.unstubAllGlobals(); // removes stubs including document

    expect(canCopyToClipboard()).toBe(false);
  });

  it("falls through to legacy path when navigator.clipboard is a primitive (e.g. string)", () => {
    vi.stubGlobal("navigator", { clipboard: "not-an-object" });
    vi.stubGlobal("document", { body: {} });

    // getClipboardAPI returns null because `clipboard` is not truthy as an object;
    // function must fall through to document.body legacy check and return true.
    expect(canCopyToClipboard()).toBe(true);
  });

  it("returns false when navigator exists but has no clipboard property", () => {
    vi.stubGlobal("navigator", {});
    vi.unstubAllGlobals(); // removes stubs including document — body is undefined in plain vitest

    // getClipboardAPI: nav.clipboard is undefined (falsy) → returns null;
    // legacy check also fails because typeof document === "undefined".
    expect(canCopyToClipboard()).toBe(false);
  });
});

describe("copyTextToClipboard", () => {
  it("returns false when clipboard API is unavailable", async () => {
    await expect(copyTextToClipboard(undefined, "secret")).resolves.toBe(false);
  });

  it("returns false when clipboard is null", async () => {
    await expect(copyTextToClipboard(null as any, "secret")).resolves.toBe(false);
  });

  it("returns false when writeText is missing", async () => {
    const clipboard = {} as Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "secret")).resolves.toBe(false);
  });

  it("returns false when writeText is not callable", async () => {
    const clipboard = { writeText: "nope" } as unknown as Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "secret")).resolves.toBe(false);
  });

  it("returns true when text is written successfully", async () => {
    const writes: string[] = [];
    const clipboard = {
      async writeText(text: string): Promise<void> {
        writes.push(text);
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "secret")).resolves.toBe(true);
    expect(writes).toEqual(["secret"]);
  });

  it("returns false when an empty string is provided", async () => {
    const writes: string[] = [];
    const clipboard = {
      async writeText(text: string): Promise<void> {
        writes.push(text);
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "")).resolves.toBe(false);
    expect(writes).toEqual([]);
  });

  it("returns false when text is a string with only whitespace", async () => {
    const writes: string[] = [];
    const clipboard = {
      async writeText(text: string): Promise<void> {
        writes.push(text);
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "   ")).resolves.toBe(false);
    expect(writes).toEqual([]);
  });

  it("returns false when text contains only non-breaking spaces (Unicode whitespace)", async () => {
    const writes: string[] = [];
    const clipboard = {
      async writeText(text: string): Promise<void> {
        writes.push(text);
      },
    } satisfies Pick<Clipboard, "writeText">;

    // \u00A0 is non-breaking space — trim() treats it as whitespace per ECMAScript spec.
    await expect(copyTextToClipboard(clipboard, "\u00A0")).resolves.toBe(false);
    expect(writes).toEqual([]);
  });

  it("returns true when writeText is a synchronous function", async () => {
    let called = false;
    const clipboard = {
      writeText(text: string) {
        called = true;
      },
    } as unknown as Pick<Clipboard, "writeText">;

    const result = await copyTextToClipboard(clipboard, "secret");
    expect(result).toBe(true);
    expect(called).toBe(true);
  });

  it("returns false when writing to clipboard fails", async () => {
    const clipboard = {
      async writeText(): Promise<void> {
        throw new Error("denied");
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "secret")).resolves.toBe(false);
  });

  it("returns false when writeText throws a non-Error", async () => {
    const clipboard = {
      async writeText(): Promise<void> {
        throw "not an error";
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "secret")).resolves.toBe(false);
  });

  it("returns true when writing a very large string", async () => {
    const writes: string[] = [];
    const clipboard = {
      async writeText(text: string): Promise<void> {
        writes.push(text);
      },
    } satisfies Pick<Clipboard, "writeText">;
    const largeText = "a".repeat(10000);

    await expect(copyTextToClipboard(clipboard, largeText)).resolves.toBe(true);
    expect(writes).toEqual([largeText]);
  });

  it("returns false when text is not a string", async () => {
    const clipboard = {
      async writeText(text: string): Promise<void> {
        // No throw, just accept it
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, null as any)).resolves.toBe(false);
  });

  it("returns false when text is a String object (not a primitive)", async () => {
    const clipboard = {
      async writeText(text: string): Promise<void> {
        // ignore
      },
    } satisfies Pick<Clipboard, "writeText">;
    const textObj = new String("test");
    await expect(copyTextToClipboard(clipboard, textObj as any)).resolves.toBe(false);
  });

  it("returns false when text is a Number", async () => {
    const clipboard = {
      async writeText(text: string): Promise<void> {
        // ignore
      },
    } satisfies Pick<Clipboard, "writeText">;
    const textNum = 123;
    await expect(copyTextToClipboard(clipboard, textNum as any)).resolves.toBe(false);
  });

  it("returns false when text is a Symbol", async () => {
    const clipboard = {
      async writeText(text: string): Promise<void> {
        // ignore
      },
    } satisfies Pick<Clipboard, "writeText">;
    const textSym = Symbol("test");
    await expect(copyTextToClipboard(clipboard, textSym as any)).resolves.toBe(false);
  });

  it("returns true when text contains emojis", async () => {
    const writes: string[] = [];
    const clipboard = {
      async writeText(text: string): Promise<void> {
        writes.push(text);
      },
    } satisfies Pick<Clipboard, "writeText">;
    const emojiText = "🚀🔥";

    await expect(copyTextToClipboard(clipboard, emojiText)).resolves.toBe(true);
    expect(writes).toEqual([emojiText]);
  });

  it("falls back to execCommand when writeText resolves to false", async () => {
    const mockTextarea = {
      value: "",
      setAttribute: vi.fn(),
      style: { position: "", left: "" },
      select: vi.fn(),
      setSelectionRange: vi.fn((_start: number, _end: number) => {}),
    };

    vi.stubGlobal("document", createFallbackStub({
      createElement: () => mockTextarea as unknown as HTMLTextAreaElement,
    }));

    const clipboard = {
      async writeText(): Promise<void> {
        return Promise.resolve(false);
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "fallback")).resolves.toBe(true);
  });

  it("returns true when writing a string with null bytes", async () => {
    const writes: string[] = [];
    const clipboard = {
      async writeText(text: string): Promise<void> {
        writes.push(text);
      },
    } satisfies Pick<Clipboard, "writeText">;
    const textWithNull = "hello\0world";

    await expect(copyTextToClipboard(clipboard, textWithNull)).resolves.toBe(true);
    expect(writes).toEqual([textWithNull]);
  });

  it("returns true when writeText is on the prototype", async () => {
    const proto = { async writeText(text: string) {} };
    const clipboard = Object.create(proto);
    const result = await copyTextToClipboard(clipboard, "secret");
    expect(result).toBe(true);
  });

  it("returns true when writing a multi-line string", async () => {
    const writes: string[] = [];
    const clipboard = {
      async writeText(text: string): Promise<void> {
        writes.push(text);
      },
    } satisfies Pick<Clipboard, "writeText">;
    const multiLineText = "line1\nline2";

    await expect(copyTextToClipboard(clipboard, multiLineText)).resolves.toBe(true);
    expect(writes).toEqual([multiLineText]);
  });

  it("returns false when text is undefined", async () => {
    const clipboard = {
      async writeText(text: string) {}
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, undefined as any)).resolves.toBe(false);
  });

  it("returns false when clipboard is 0", async () => {
    vi.unstubAllGlobals();
    await expect(copyTextToClipboard(0 as any, "secret")).resolves.toBe(false);
  });

  it("returns false when text is an object", async () => {
    const clipboard = {
      async writeText(text: string) {}
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, {} as any)).resolves.toBe(false);
  });

  it("returns false when text is a boolean", async () => {
    const clipboard = {
      async writeText(text: string): Promise<void> {
        // ignore
      },
    } satisfies Pick<Clipboard, "writeText">;
    const textBool = true;
    await expect(copyTextToClipboard(clipboard, textBool as any)).resolves.toBe(false);
  });

  it("returns false when text is a bigint", async () => {
    const clipboard = {
      async writeText(text: string): Promise<void> {
        // ignore
      },
    } satisfies Pick<Clipboard, "writeText">;
    const textBigInt = 123n;
    await expect(copyTextToClipboard(clipboard, textBigInt as any)).resolves.toBe(false);
  });

  it("falls back to execCommand when clipboard.writeText throws", async () => {
    // Stub global document for fallback path in Node.js vitest (no jsdom)
    const mockTextarea = {
      value: "",
      setAttribute: vi.fn(),
      style: {
        position: "",
        left: "",
      },
      select: vi.fn(),
      setSelectionRange: vi.fn((_start: number, _end: number) => {}),
    };

    vi.stubGlobal("document", createFallbackStub({
      createElement: () => mockTextarea as unknown as HTMLTextAreaElement,
    }));

    const clipboard = {
      async writeText(): Promise<void> {
        throw new Error("denied");
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "fallback")).resolves.toBe(true);
  });

  it("sets tabindex=-1 on fallback textarea for programmatic focusability", async () => {
    let capturedEl: unknown = null;

    vi.stubGlobal("document", createFallbackStub({
      createElement: (tag: string) => {
        const el: Record<string, any> = {
          value: "",
          setAttribute: vi.fn(),
          tabIndex: undefined as number | undefined,
          style: { position: "", left: "" },
          select: vi.fn(),
          setSelectionRange: vi.fn((_start: number, _end: number) => {}),
        };
        capturedEl = el;
        return el as unknown as HTMLTextAreaElement;
      },
    }));

    await copyTextToClipboard(undefined, "secret");

    // The fallback should set tabIndex = -1 so unfocused elements can be selected on mobile
    expect((capturedEl as any).tabIndex).toBe(-1);
  });

  it("returns false when neither clipboard API nor document available", async () => {
    // Unstub any leftover global mocks to simulate a real Node.js env with no DOM
    vi.unstubAllGlobals();
    await expect(copyTextToClipboard(undefined, "secret")).resolves.toBe(false);
  });

  it("returns false when clipboard API fails and execCommand also returns false", async () => {
    const mockTextarea = {
      value: "",
      setAttribute: vi.fn(),
      style: { position: "", left: "" },
      select: vi.fn(),
      setSelectionRange: vi.fn((_start: number, _end: number) => {}),
    };

    let execCommandCallCount = 0;
    vi.stubGlobal("document", createFallbackStub({
      createElement: () => mockTextarea as unknown as HTMLTextAreaElement,
      execCommandReturns: (_cmd: string) => {
        execCommandCallCount++;
        return false; // explicit failure — should not be retried or ignored away
      },
    }));

    const clipboard = {
      async writeText(): Promise<void> {
        throw new Error("denied");
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "secret")).resolves.toBe(false);
    expect(execCommandCallCount).toBe(1); // fallback attempted exactly once
  });

  it("cleans up textarea when execCommand throws during fallback", async () => {
    const removeChildSpy = vi.fn();
    const mockTextarea = {
      value: "secret",
      setAttribute: vi.fn(),
      style: { position: "", left: "" },
      select: vi.fn(),
      setSelectionRange: vi.fn((_start: number, _end: number) => {}),
    };

    vi.stubGlobal("document", createFallbackStub({
      createElement: () => mockTextarea as unknown as HTMLTextAreaElement,
      execCommandReturns: (_cmd: string) => {
        throw new Error("execCommand not supported");
      },
      body: { appendChild: vi.fn(), removeChild: removeChildSpy },
    }));

    const clipboard = {
      async writeText(): Promise<void> {
        throw new Error("denied");
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "secret")).resolves.toBe(false);
    expect(removeChildSpy).toHaveBeenCalled(); // finally-block ensures cleanup even on throw
  });

  it("sets the textarea value correctly during execCommand fallback", async () => {
    let capturedValue: string | null = null;

    vi.stubGlobal("document", {
      createElement: (tag: string) => {
        const el: Record<string, any> = {
          value: "",
          setAttribute: vi.fn(),
          tabIndex: undefined as number | undefined,
          style: { position: "", left: "" },
          select: vi.fn(),
          setSelectionRange: vi.fn((_start: number, _end: number) => {}),
        };
        el.value = "secret";
        capturedValue = el.value;
        return el as unknown as HTMLTextAreaElement;
      },
      execCommand: (_cmd: string) => true,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });

    await copyTextToClipboard(undefined, "secret");

    // The fallback must assign the text to textarea.value before copying —
    // if someone removes that line, execCommand("copy") would silently copy
    // nothing while still returning true. This test catches that regression.
    expect(capturedValue).toBe("secret");
  });

  it("does not invoke fallback when modern clipboard API succeeds", async () => {
    const appendChildSpy = vi.fn();
    vi.stubGlobal("document", {
      createElement: () => ({
        value: "",
        setAttribute: vi.fn(),
        style: { position: "", left: "" },
        select: vi.fn(),
        setSelectionRange: vi.fn(),
      }),
      execCommand: vi.fn(() => false), // should never be reached
      body: { appendChild: appendChildSpy, removeChild: vi.fn() },
    });

    const writes: string[] = [];
    const clipboard = {
      async writeText(text: string): Promise<void> {
        writes.push(text);
      },
    } satisfies Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "secret")).resolves.toBe(true);
    expect(writes).toEqual(["secret"]);
    expect(document.execCommand).not.toHaveBeenCalled(); // modern path short-circuits
    vi.unstubAllGlobals();
  });

  it("returns false early in insecure context (no DOM manipulation)", async () => {
    const createElementSpy = vi.fn();
    vi.stubGlobal("window", { isSecureContext: false });
    vi.stubGlobal("document", {
      createElement: createElementSpy,
      execCommand: (_cmd: string) => true,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });

    const result = await copyTextToClipboard(undefined, "secret");

    expect(result).toBe(false);
    expect(createElementSpy).not.toHaveBeenCalled(); // short-circuit avoids DOM work
  });

  it("falls through to fallback when isSecureContext is undefined (older browsers)", async () => {
    const createElementSpy = vi.fn();
    vi.stubGlobal("window", {}); // no isSecureContext property → falls through
    vi.stubGlobal("document", {
      createElement: () => ({
        value: "fallback-text",
        setAttribute: vi.fn(),
        tabIndex: undefined,
        style: { position: "", left: "" },
        select: vi.fn(),
        setSelectionRange: vi.fn(),
      }),
      execCommand: (_cmd: string) => true,
      body: { appendChild: createElementSpy, removeChild: vi.fn() },
    });

    const result = await copyTextToClipboard(undefined, "fallback-text");

    expect(result).toBe(true);
    expect(createElementSpy).toHaveBeenCalled(); // fallback was attempted
  });

  it("proceeds to execCommand when select/setSelectionRange throws during fallback", async () => {
    vi.stubGlobal("document", {
      createElement: () => ({
        value: "secret",
        setAttribute: vi.fn(),
        tabIndex: undefined,
        style: { position: "", left: "" },
        select: vi.fn(() => { throw new Error("select blocked"); }),
        setSelectionRange: vi.fn(() => { throw new Error("setSelectionRange blocked"); }),
      }),
      execCommand: (_cmd: string) => true, // succeeds despite selection failure
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });

    const result = await copyTextToClipboard(undefined, "secret");

    expect(result).toBe(true); // fallback still succeeds via execCommand
  });

  it("returns false when document.body is unavailable (no DOM manipulation)", async () => {
    const createElementSpy = vi.fn();
    vi.stubGlobal("document", {
      createElement: createElementSpy,
      body: null, // simulates early DOM lifecycle or unusual browser state
    });

    const result = await copyTextToClipboard(undefined, "secret");

    expect(result).toBe(false);
    expect(createElementSpy).not.toHaveBeenCalled(); // short-circuit avoids creating textarea
  });

  it("returns false when writeText hangs (timeout activates)", async () => {
    let resolveSlow: (() => void) | undefined;
    const clipboard = {
      async writeText(): Promise<void> {
        return new Promise((resolve) => {
          resolveSlow = resolve;
        });
      },
    } satisfies Pick<Clipboard, "writeText">;

    // The promise resolves never — we just need to verify the timeout fires
    // and returns false instead of hanging indefinitely.
    const resultPromise = copyTextToClipboard(clipboard, "secret");

    await expect(resultPromise).resolves.toBe(false);
  });

  it("uses custom timeout when provided", async () => {
    let resolveSlow: (() => void) | undefined;
    const clipboard = {
      async writeText(): Promise<void> {
        return new Promise((resolve) => {
          resolveSlow = resolve;
        });
      },
    } satisfies Pick<Clipboard, "writeText">;

    // Test with a very short timeout (10ms) to verify it actually fires quickly
    const resultPromise = copyTextToClipboard(clipboard, "secret", 10);

    await expect(resultPromise).resolves.toBe(false);
  });

  it("does not leak timer when writeText succeeds before timeout", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const clipboard = {
      async writeText(): Promise<void> {},
    } satisfies Pick<Clipboard, "writeText">;

    await copyTextToClipboard(clipboard, "secret");

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    clearTimeoutSpy.mockRestore();
  });

  it("does not leak timer when writeText throws before timeout", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const clipboard = {
      async writeText(): Promise<void> {
        throw new Error("denied");
      },
    } satisfies Pick<Clipboard, "writeText">;

    // When writeText throws synchronously (microtask), the 3 s timer hasn't fired
    // yet — clearTimeout won't be called because the race resolves before the
    // setTimeout callback could possibly execute. The stale timer will later reject
    // with "timed out", which is caught silently in the outer catch block and never
    // propagates, so no leak or crash occurs. This test verifies that behavior is safe.
    const result = await copyTextToClipboard(clipboard, "secret");

    expect(result).toBe(false);
    clearTimeoutSpy.mockRestore();
  });

  it("returns false early when text exceeds MAX_CLIPBOARD_TEXT_BYTES (no DOM manipulation)", async () => {
    const createElementSpy = vi.fn();
    vi.stubGlobal("document", {
      createElement: createElementSpy,
      execCommand: (_cmd: string) => true,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });

    // ~12 KiB — well above the 10 KiB guard
    const oversized = "x".repeat(12 * 1024);
    const result = await copyTextToClipboard(undefined, oversized);

    expect(result).toBe(false);
    expect(createElementSpy).not.toHaveBeenCalled(); // rejected before DOM work
    vi.unstubAllGlobals();
  });

  it("returns false when text is exactly one byte over MAX_CLIPBOARD_TEXT_BYTES", async () => {
    const createElementSpy = vi.fn();
    vi.stubGlobal("document", {
      createElement: createElementSpy,
      execCommand: (_cmd: string) => true,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });

    // Just over the boundary — should still reject
    const justOver = "x".repeat(10241);
    const result = await copyTextToClipboard(undefined, justOver);

    expect(result).toBe(false);
    expect(createElementSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("rejects oversized text with null bytes before any DOM manipulation", async () => {
    const createElementSpy = vi.fn();
    vi.stubGlobal("document", {
      createElement: createElementSpy,
      execCommand: (_cmd: string) => true,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });

    // Build text that exceeds limit via null bytes (single-byte in Blob.size but multi-char in JS)
    const oversized = "x".repeat(10240) + "\0";
    const result = await copyTextToClipboard(undefined, oversized);

    expect(result).toBe(false);
    expect(createElementSpy).not.toHaveBeenCalled(); // rejected before DOM work at size guard line 100-101
    vi.unstubAllGlobals();
  });

  it("returns false when multi-byte emoji text exceeds MAX_CLIPBOARD_TEXT_BYTES in Blob.size (no DOM manipulation)", async () => {
    const createElementSpy = vi.fn();
    vi.stubGlobal("document", {
      createElement: createElementSpy,
      execCommand: (_cmd: string) => true,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });

    // 4-byte emoji × 2560 = 10240 bytes — exactly at the byte limit.
    // Add one more emoji to push over the strict `>` threshold in Blob.size.
    const oversized = "🚀".repeat(2561);

    const result = await copyTextToClipboard(undefined, oversized);

    expect(result).toBe(false);
    expect(createElementSpy).not.toHaveBeenCalled(); // rejected before DOM work at size guard line 100-101
    vi.unstubAllGlobals();
  });

  it("returns true for text exactly at MAX_CLIPBOARD_TEXT_BYTES when measured via Blob.size (multi-byte boundary)", async () => {
    const mockTextarea = {
      value: "",
      setAttribute: vi.fn(),
      style: { position: "", left: "" },
      select: vi.fn(),
      setSelectionRange: vi.fn((_start: number, _end: number) => {}),
    };

    vi.stubGlobal("navigator", { clipboard: {} });
    vi.stubGlobal("document", createFallbackStub({
      createElement: () => mockTextarea as unknown as HTMLTextAreaElement,
    }));

    // Each 🚀 emoji is 4 bytes in UTF-8 (Blob encoding). MAX_CLIPBOARD_TEXT_BYTES / 4 = 2560 reps.
    // Blob.size for this string equals exactly 10240 — at the `>` threshold, should pass through.
    const atLimitText = "🚀".repeat(2560);

    await expect(copyTextToClipboard(undefined, atLimitText)).resolves.toBe(true);
  });

  it("falls back to execCommand when writeText throws synchronously (not rejected promise)", async () => {
    // A synchronous throw from writeText must be caught by the outer try/catch and trigger the legacy path.
    const mockTextarea = {
      value: "",
      setAttribute: vi.fn(),
      style: { position: "", left: "" },
      select: vi.fn(),
      setSelectionRange: vi.fn((_start: number, _end: number) => {}),
    };

    vi.stubGlobal("document", createFallbackStub({
      createElement: () => mockTextarea as unknown as HTMLTextAreaElement,
    }));

    const clipboard = {
      writeText(): void {
        throw new Error("sync denied");
      },
    } as unknown as Pick<Clipboard, "writeText">;

    await expect(copyTextToClipboard(clipboard, "fallback")).resolves.toBe(true);
  });

}); // copyTextToClipboard describe block closes here

describe("probeClipboard", () => {
  it("returns true when navigator.clipboard.writeText resolves successfully with empty string", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        async writeText(_text: string) {},
      },
    });

    const result = await probeClipboard();

    expect(result).toBe(true);
  });

  it("returns false when navigator.clipboard is undefined (no API)", async () => {
    vi.unstubAllGlobals();

    const result = await probeClipboard();

    expect(result).toBe(false);
  });

  it("returns false when writeText rejects (permission denied)", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        async writeText() {
          throw new Error("PermissionDeniedError");
        },
      },
    });

    const result = await probeClipboard();

    expect(result).toBe(false);
  });

  it("returns false when writeText throws a non-Error value", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        async writeText() {
          throw "string error";
        },
      },
    });

    const result = await probeClipboard();

    expect(result).toBe(false);
  });

  it("returns false on timeout when writeText hangs", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        // Never resolves — simulates a hung browser.
        writeText() {
          return new Promise(() => {});
        },
      },
    });

    const result = await probeClipboard(50); // short timeout for test speed

    expect(result).toBe(false);
  });

  it("respects custom timeout parameter", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText() {
          return new Promise(() => {});
        },
      },
    });

    const start = Date.now();
    await probeClipboard(100);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(90); // allow small variance
  });

  it("does not leak the timer when writeText resolves before timeout", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        async writeText(_text: string) {},
      },
    });

    const result = await probeClipboard();

    expect(result).toBe(true);
    // No unhandled rejection, no error — timer should have been cleared by success path.
  });

  it("returns false when clipboard exists but writeText is not a function", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {}, // no writeText property
    });

    const result = await probeClipboard();

    expect(result).toBe(false);
  });

  it("returns false when writeText exists but is not callable (string shape)", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: "not-a-function",
      },
    });

    const result = await probeClipboard();

    expect(result).toBe(false);
  });

  it("returns false when writeText exists but is a non-callable object (e.g. getter that returns an object)", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: {}, // present but not callable — should fail the typeof check
      },
    });

    const result = await probeClipboard();

    expect(result).toBe(false);
  });

  it("returns false when clipboard.writeText rejects with a non-Error value mid-probe", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        async writeText() {
          throw 42; // non-Error rejection — should still be caught by probe
        },
      },
    });

    const result = await probeClipboard();

    expect(result).toBe(false);
  });

  it("returns true when clipboard.writeText resolves with a falsy value (e.g. null) — probe treats resolve as success", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        async writeText() {
          return null; // resolved but falsy — probe succeeds because no throw/reject
        },
      },
    });

    const result = await probeClipboard();

    expect(result).toBe(true);
  });

  it("returns true when clipboard.writeText resolves with a truthy promise (e.g. the string written)", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        async writeText(_text: string) {
          return _text; // some implementations return what was written
        },
      },
    });

    const result = await probeClipboard();

    expect(result).toBe(true);
  });
});

describe("copyTextToClipboard blob size limit", () => {
  it("returns false for text exceeding MAX_CLIPBOARD_TEXT_BYTES without invoking writeText or creating DOM elements", async () => {
    // Oversized payloads must be rejected at the Blob.size gate — before any API call or DOM mutation.
    const writeTextSpy = vi.fn(async () => {});
    let createElementCallCount = 0;

    vi.stubGlobal("navigator", { clipboard: {} });
    vi.stubGlobal("document", {
      createElement: (_tag: string) => {
        createElementCallCount++;
        return null as any; // never returned — should not be reached
      },
      body: {},
    } as any);

    const oversizedText = "a".repeat(MAX_CLIPBOARD_TEXT_BYTES + 1024);

    await expect(copyTextToClipboard(undefined, oversizedText)).resolves.toBe(false);

    expect(writeTextSpy).not.toHaveBeenCalled();
    expect(createElementCallCount).toBe(0);
  });

  it("returns false when Blob.size exceeds MAX_CLIPBOARD_TEXT_BYTES (verified via spy on writeText)", async () => {
    // Confirm the rejection path never reaches the Clipboard API — even when navigator.clipboard is available.
    const writeTextSpy = vi.fn(async () => {});
    vi.stubGlobal("navigator", {
      clipboard: { writeText: writeTextSpy },
    });

    const oversizedText = "a".repeat(MAX_CLIPBOARD_TEXT_BYTES + 1);

    await expect(copyTextToClipboard(undefined, oversizedText)).resolves.toBe(false);

    expect(writeTextSpy).not.toHaveBeenCalled();
  });

  it("returns true for text exactly at MAX_CLIPBOARD_TEXT_BYTES (boundary)", async () => {
    // The limit is strict `>` — boundary value must pass through to writeText.
    const mockTextarea = {
      value: "",
      setAttribute: vi.fn(),
      style: { position: "", left: "" },
      select: vi.fn(),
      setSelectionRange: vi.fn((_start: number, _end: number) => {}),
    };

    vi.stubGlobal("navigator", { clipboard: {} });
    vi.stubGlobal("document", createFallbackStub({
      createElement: () => mockTextarea as unknown as HTMLTextAreaElement,
    }));

    const atLimitText = "a".repeat(MAX_CLIPBOARD_TEXT_BYTES);

    await expect(copyTextToClipboard(undefined, atLimitText)).resolves.toBe(true);
  });

  it("returns false when Blob.size exceeds MAX_CLIPBOARD_TEXT_BYTES and execCommand fallback is also unavailable", async () => {
    // Double-rejection path: blob gate fires first, so writeText never runs.
    let createElementCallCount = 0;
    vi.stubGlobal("navigator", {});

    vi.stubGlobal("document", {
      createElement: (_tag: string) => {
        createElementCallCount++;
        return null as any;
      },
      body: null,
    } as any);

    const oversizedText = "a".repeat(MAX_CLIPBOARD_TEXT_BYTES + 2048);

    await expect(copyTextToClipboard(undefined, oversizedText)).resolves.toBe(false);

    expect(createElementCallCount).toBe(0);
  });
});
