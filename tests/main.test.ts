import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_LENGTH, generateAll, generateComplexPassword } from "../src/password";
import { scheduleButtonReset } from "../src/button-reset";
import { copyTextToClipboard } from "../src/clipboard";

vi.mock("../src/password", async (original) => ({
  ...await original<typeof import("../src/password")>(),
  generateAll: vi.fn(() => ["safe"]),
  generateComplexPassword: vi.fn(() => "safe"),
}));
vi.mock("../src/username", () => ({ generateUsernames: () => ["name"] }));
vi.mock("../src/clipboard", () => ({ copyTextToClipboard: vi.fn(async () => true) }));
vi.mock("../src/button-reset", () => ({ scheduleButtonReset: vi.fn() }));

// Only the DOM operations this entry point uses; real rendering is checked in browser.
class Element {
  checked = false;
  className = "";
  innerHTML = "";
  textContent = "";
  style = {};
  classList = { add() {}, remove() {} };
  onclick?: () => void | Promise<void>;
  listeners = new Map<string, () => void>();
  setAttribute() {}
  appendChild() {}
  addEventListener(type: string, listener: () => void) { this.listeners.set(type, listener); }
  fire(type: string) { this.listeners.get(type)?.(); }
}

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
let elements: Map<string, Element>;
let created: Element[];
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  elements = new Map(["passwords", "usernames", "status", "sr-status", "regenerate", "no-ambiguous"]
    .map(id => [id, new Element()]));
  created = [];
  const input = html.match(/<input\b[^>]*\bid="no-ambiguous"[^>]*>/)?.[0] ?? "";
  elements.get("no-ambiguous")!.checked = /\bchecked(?:\s|=|>)/.test(input);
  vi.stubGlobal("document", {
    getElementById: (id: string) => elements.get(id) ?? null,
    createElement: () => {
      const el = new Element();
      created.push(el);
      return el;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

it("starts checked and filters the first visible passwords", async () => {
  await import("../src/main");
  expect(elements.get("no-ambiguous")!.checked).toBe(true);
  expect(generateAll).toHaveBeenLastCalledWith(1, { ambiguityFree: true });
});

it("changes regenerate immediately and Regenerate preserves the user's choice", async () => {
  await import("../src/main");
  const checkbox = elements.get("no-ambiguous")!;
  checkbox.checked = false;
  checkbox.fire("change");
  expect(generateAll).toHaveBeenLastCalledWith(1, { ambiguityFree: false });
  elements.get("regenerate")!.fire("click");
  expect(generateAll).toHaveBeenLastCalledWith(1, { ambiguityFree: false });
  checkbox.checked = true;
  checkbox.fire("change");
  expect(generateAll).toHaveBeenLastCalledWith(1, { ambiguityFree: true });
  expect(generateAll).toHaveBeenCalledTimes(4);
});

it("uses the same checkbox option for category and combined passwords", async () => {
  const upper = new Element(); upper.checked = true;
  elements.set("cat-upper", upper);
  await import("../src/main");
  expect(generateComplexPassword).toHaveBeenLastCalledWith(DEFAULT_LENGTH, expect.any(Array), { ambiguityFree: true });
  const lower = new Element(); lower.checked = true;
  elements.set("cat-lower", lower);
  elements.get("no-ambiguous")!.checked = false;
  elements.get("no-ambiguous")!.fire("change");
  expect(vi.mocked(generateComplexPassword).mock.calls.slice(-3))
    .toEqual(Array.from({ length: 3 }, () => [DEFAULT_LENGTH, expect.any(Array), { ambiguityFree: false }]));
});

it("schedules the copy-button reset with COPY_BUTTON_RESET_MS after a successful copy", async () => {
  const main = await import("../src/main");
  const btn = created.find((el) => el.className === "copy-btn")!;
  await btn.onclick?.();
  expect(scheduleButtonReset).toHaveBeenLastCalledWith(btn, main.COPY_BUTTON_RESET_MS, expect.any(Function));
});

it("announces copy failure and schedules the reset after 2000 ms", async () => {
  await import("../src/main");
  vi.mocked(copyTextToClipboard).mockResolvedValue(false);
  const btn = created.find((el) => el.className === "copy-btn")!;
  await btn.onclick?.();
  const status = elements.get("status")!;
  expect(copyTextToClipboard).toHaveBeenLastCalledWith(undefined, "safe");
  expect(status.textContent).toBe("Copy failed. Clipboard access unavailable or denied.");
  expect(status.style.color).toBe("var(--error-color, #e74c3c)");
  expect(elements.get("sr-status")!.textContent).toBe(
    "Copy failed. Clipboard access unavailable or denied.",
  );
  expect(scheduleButtonReset).toHaveBeenLastCalledWith(btn, 2000, expect.any(Function));
});
