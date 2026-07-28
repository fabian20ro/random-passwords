import { generateAll } from "./password";
import { copyTextToClipboard } from "./clipboard";
import { scheduleButtonReset } from "./button-reset";
import { generateUsernames } from "./username";
import { generateComplexPassword, CHARS as CHARSET_UPPER_LOWER_DIGIT } from "./password";

const COPY_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M3.5 10.5h-1a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5h6a1.5 1.5 0 0 1 1.5 1.5v1"/></svg>`;

/** Duration before the copy button auto-resets after a successful copy. */
export const COPY_BUTTON_RESET_MS = 1500;

const CHECK_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5 6.5-8"/></svg>`;

const DEFAULT_COPY_LABEL = "Copy password";
const COPIED_COPY_LABEL = "Password copied";
const ERROR_COPY_LABEL = "Copy failed";


const USERNAME_COUNT = 10;

// Category definitions for complex password generation
const CATEGORY_DEFS: { id: string; label: string; chars: string }[] = [
  { id: "upper", label: "Uppercase (A-Z)", chars: CHARSET_UPPER_LOWER_DIGIT.substring(0, 26) },
  { id: "lower", label: "Lowercase (a-z)", chars: CHARSET_UPPER_LOWER_DIGIT.substring(26, 52) },
  { id: "digits", label: "Digits (0-9)", chars: CHARSET_UPPER_LOWER_DIGIT.substring(52) },
];

const statusEl = document.getElementById("status") as HTMLParagraphElement;
if (statusEl) statusEl.setAttribute("role", "status");

const srStatusEl = document.getElementById("sr-status") as HTMLDivElement;
if (srStatusEl) srStatusEl.setAttribute("role", "status");

function announceStatus(message: string, isError?: boolean): void {
  if (statusEl) {
    statusEl.textContent = message;
    if (isError) {
      statusEl.style.color = "var(--error-color, #e74c3c)";
    } else {
      statusEl.style.color = "";
    }
  }
  if (srStatusEl) srStatusEl.textContent = message;
}

function resetButtonState(btn: HTMLButtonElement): void {
  btn.innerHTML = COPY_ICON;
  btn.classList.remove("copied", "error");
  btn.title = "";
  btn.setAttribute("aria-label", DEFAULT_COPY_LABEL);
}

async function copyToClipboard(text: string, btn: HTMLButtonElement): Promise<void> {
  const copied = await copyTextToClipboard(navigator.clipboard, text);

  if (copied) {
    btn.innerHTML = CHECK_ICON;
    btn.classList.remove("error");
    btn.classList.add("copied");
    btn.setAttribute("aria-label", COPIED_COPY_LABEL);
    announceStatus("Value copied to clipboard.");

    scheduleButtonReset(btn, COPY_BUTTON_RESET_MS, () => {
      resetButtonState(btn);
    });
    return;
  }

  btn.classList.remove("copied");
  btn.classList.add("error");
  btn.title = "Clipboard access unavailable or denied";
  btn.setAttribute("aria-label", ERROR_COPY_LABEL);
  announceStatus("Copy failed. Clipboard access unavailable or denied.", true);

  scheduleButtonReset(btn, 2000, () => {
    resetButtonState(btn);
  });
}



function renderRows(container: HTMLDivElement, values: string[]): void {
  container.innerHTML = "";

  values.forEach((value) => {
    const len = value.length;

    const row = document.createElement("div");
    row.className = "row";

    const lenSpan = document.createElement("span");
    lenSpan.className = "len";
    lenSpan.textContent = String(len);

    const code = document.createElement("code");
    code.textContent = value;

    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.innerHTML = COPY_ICON;
    btn.setAttribute("aria-label", `${DEFAULT_COPY_LABEL} (${len} characters)`);
    btn.onclick = () => copyToClipboard(value, btn);

    row.appendChild(lenSpan);
    row.appendChild(code);
    row.appendChild(btn);
    container.appendChild(row);
  });
}

function getSelectedCategories(): string[][] {
  const categories: string[][] = [];
  for (const def of CATEGORY_DEFS) {
    const cb = document.getElementById(`cat-${def.id}`) as HTMLInputElement;
    if (cb?.checked && def.chars.length > 0) {
      categories.push([def.chars]);
    }
  }
  return categories;
}

function generate(): void {
  try {
    const passwordContainer = document.getElementById("passwords") as HTMLDivElement;
    const usernameContainer = document.getElementById("usernames") as HTMLDivElement;

    const categories = getSelectedCategories();
    let passwords: string[];

    if (categories.length > 0) {
      // Complex mode: generate one password per category for direct copy-paste,
      // plus the combined complex password.
      const complexLen = 24;
      const categoryPasswords = categories.map(cat => generateComplexPassword(complexLen, [cat]));
      const combined = generateComplexPassword(complexLen, categories);
      passwords = [...categoryPasswords, combined];
    } else {
      passwords = generateAll();
    }

    const usernames = generateUsernames(USERNAME_COUNT);

    renderRows(passwordContainer, passwords);
    renderRows(usernameContainer, usernames);

    if (categories.length > 0) {
      const catNames = categories.map(cat => CATEGORY_DEFS.find(d => d.chars === cat[0])?.label ?? "Custom");
      announceStatus(`Generated ${passwords.length} complex passwords using ${catNames.join(", ")}.`);
    } else {
      announceStatus(`Generated ${passwords.length} new passwords and ${usernames.length} usernames.`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    announceStatus(message, true);
  }
}

document.getElementById("regenerate")?.addEventListener("click", generate);
generate();
