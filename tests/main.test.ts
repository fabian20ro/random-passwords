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
  attributes = new Map<string, string>();
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
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
  vi.mocked(generateAll).mockImplementation(() => ["safe"]);
  elements = new Map(["passwords", "usernames", "status", "sr-status", "regenerate"]
    .map(id => [id, new Element()]));
  created = [];
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

it("always generates ambiguity-free passwords on initial load", async () => {
  await import("../src/main");
  expect(generateAll).toHaveBeenLastCalledWith(1, { ambiguityFree: true });
});

it("keeps ambiguity-free generation on every Regenerate click", async () => {
  await import("../src/main");
  elements.get("regenerate")!.fire("click");
  expect(generateAll).toHaveBeenLastCalledWith(1, { ambiguityFree: true });
  elements.get("regenerate")!.fire("click");
  expect(generateAll).toHaveBeenCalledTimes(3);
  expect(generateAll).toHaveBeenLastCalledWith(1, { ambiguityFree: true });
});

it("uses ambiguity-free options for category and combined passwords", async () => {
  const upper = new Element(); upper.checked = true;
  const lower = new Element(); lower.checked = true;
  elements.set("cat-upper", upper);
  elements.set("cat-lower", lower);
  await import("../src/main");
  expect(vi.mocked(generateComplexPassword).mock.calls.slice(-3))
    .toEqual(Array.from({ length: 3 }, () => [DEFAULT_LENGTH, expect.any(Array), { ambiguityFree: true }]));
});

it("renders no element with the removed no-ambiguous id", () => {
  expect(html).not.toContain('id="no-ambiguous"');
});

it("renders no ambiguous characters across 100 regenerations", async () => {
  const actual = await vi.importActual<typeof import("../src/password")>("../src/password");
  vi.mocked(generateAll).mockImplementation((count, options) => actual.generateAll(count, options));
  vi.mocked(generateComplexPassword).mockImplementation((length, categories, options) =>
    actual.generateComplexPassword(length, categories, options));
  await import("../src/main");
  for (let i = 0; i < 100; i++) elements.get("regenerate")!.fire("click");
  const codes = created.filter((el) => el.className === "" && el.attributes.size === 0);
  expect(codes.length).toBeGreaterThan(100);
  for (const code of codes) {
    expect(code.textContent).not.toMatch(/[0OlI1]/);
  }
});

it("schedules the copy-button reset with COPY_BUTTON_RESET_MS after a successful copy", async () => {
  const main = await import("../src/main");
  const btn = created.find((el) => el.className === "copy-btn")!;
  await btn.onclick?.();
  expect(btn.innerHTML).toContain('M3 8.5l3.5 3.5 6.5-8');
  expect(scheduleButtonReset).toHaveBeenLastCalledWith(btn, main.COPY_BUTTON_RESET_MS, expect.any(Function));
  const resetCalls = vi.mocked(scheduleButtonReset).mock.calls;
  const resetFn = resetCalls[resetCalls.length - 1]![2] as unknown as () => void;
  resetFn();
  expect(btn.innerHTML).toContain('<rect x="5.5"');
});

it("announces the copy success to the visible and screen-reader status", async () => {
  await import("../src/main");
  const btn = created.find((el) => el.className === "copy-btn")!;
  await btn.onclick?.();
  expect(elements.get("status")!.textContent).toBe("Copied 4 characters to clipboard.");
  expect(elements.get("sr-status")!.textContent).toBe("Copied 4 characters to clipboard.");
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

it("announces a generation error when password generation throws", async () => {
  await import("../src/main");
  vi.mocked(generateAll).mockImplementation(() => {
    throw new Error("boom");
  });
  elements.get("regenerate")!.fire("click");
  const status = elements.get("status")!;
  expect(status.textContent).toBe("boom");
  expect(status.style.color).toBe("var(--error-color, #e74c3c)");
  expect(elements.get("sr-status")!.textContent).toBe("boom");
});

it("announces the default-mode generation count for passwords and usernames", async () => {
  await import("../src/main");
  expect(elements.get("status")!.textContent).toBe(
    "Generated 1 new passwords and 1 usernames.",
  );
  expect(elements.get("sr-status")!.textContent).toBe(
    "Generated 1 new passwords and 1 usernames.",
  );
});

it("announces complex generation with the selected category labels", async () => {
  const upper = new Element(); upper.checked = true;
  const lower = new Element(); lower.checked = true;
  elements.set("cat-upper", upper);
  elements.set("cat-lower", lower);
  await import("../src/main");
  expect(generateComplexPassword).toHaveBeenCalledTimes(3);
  expect(elements.get("status")!.textContent).toBe(
    "Generated 3 complex passwords using Uppercase (A-Z), Lowercase (a-z) and 1 usernames.",
  );
});

it("generates one combined password and skips the duplicate for a single selected category", async () => {
  const upper = new Element(); upper.checked = true;
  elements.set("cat-upper", upper);
  await import("../src/main");
  expect(generateComplexPassword).toHaveBeenCalledTimes(1);
  expect(generateComplexPassword).toHaveBeenLastCalledWith(
    DEFAULT_LENGTH,
    expect.any(Array),
    { ambiguityFree: true },
  );
  expect(elements.get("status")!.textContent).toBe(
    "Generated 1 complex passwords using Uppercase (A-Z) and 1 usernames.",
  );
});

it("auto-regenerates when a category checkbox toggles and updates the status", async () => {
  const upper = new Element(); upper.checked = true;
  const lower = new Element(); lower.checked = true;
  elements.set("cat-upper", upper);
  elements.set("cat-lower", lower);
  await import("../src/main");
  expect(generateComplexPassword).toHaveBeenCalledTimes(3);
  lower.checked = false;
  lower.fire("change");
  expect(generateComplexPassword).toHaveBeenCalledTimes(4);
  expect(elements.get("status")!.textContent).toBe(
    "Generated 1 complex passwords using Uppercase (A-Z) and 1 usernames.",
  );
});

it("labels username copy buttons contextually and preserves the password label", async () => {
  await import("../src/main");
  const buttons = created.filter((el) => el.className === "copy-btn");
  const passwordButtons = buttons.filter((el) => el.attributes.get("aria-label")?.startsWith("Copy password"));
  const usernameButtons = buttons.filter((el) => el.attributes.get("aria-label")?.startsWith("Copy username"));
  expect(passwordButtons.length).toBe(1);
  expect(usernameButtons.length).toBe(1);
  expect(passwordButtons[0]!.attributes.get("aria-label")).toBe("Copy password (4 characters)");
  expect(usernameButtons[0]!.attributes.get("aria-label")).toBe("Copy username (4 characters)");
});

it("restores the contextual username label after a successful copy", async () => {
  await import("../src/main");
  vi.mocked(copyTextToClipboard).mockResolvedValue(true);
  const btn = created.find((el) =>
    el.className === "copy-btn" && el.attributes.get("aria-label")?.startsWith("Copy username"),
  )!;
  await btn.onclick?.();
  expect(btn.attributes.get("aria-label")).toBe("Password copied");
  const resetCalls = vi.mocked(scheduleButtonReset).mock.calls;
  const resetFn = resetCalls[resetCalls.length - 1]![2] as unknown as () => void;
  resetFn();
  expect(btn.attributes.get("aria-label")).toBe("Copy username (4 characters)");
});

it("announces the failure and restores the contextual username label after a failed copy", async () => {
  await import("../src/main");
  vi.mocked(copyTextToClipboard).mockResolvedValue(false);
  const btn = created.find((el) =>
    el.className === "copy-btn" && el.attributes.get("aria-label")?.startsWith("Copy username"),
  )!;
  await btn.onclick?.();
  expect(elements.get("status")!.textContent).toBe("Copy failed. Clipboard access unavailable or denied.");
  const resetCalls = vi.mocked(scheduleButtonReset).mock.calls;
  const resetFn = resetCalls[resetCalls.length - 1]![2] as unknown as () => void;
  resetFn();
  expect(btn.attributes.get("aria-label")).toBe("Copy username (4 characters)");
});
