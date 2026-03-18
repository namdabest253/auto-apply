import type { Page, Frame } from "rebrowser-playwright";
import type { InteractiveElement } from "./types";

const EXTRACT_SCRIPT = `(() => {
  const elements = [];
  const selectors = "input, textarea, select, button, a[href], [role='button'], [role='link'], [role='checkbox'], [role='radio']";
  const nodes = document.querySelectorAll(selectors);

  const getLabel = (el) => {
    const id = el.getAttribute("id");
    if (id) {
      const label = document.querySelector('label[for="' + id + '"]');
      if (label) return label.textContent?.trim() || null;
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return parentLabel.textContent?.trim() || null;
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const refEl = document.getElementById(labelledBy);
      if (refEl) return refEl.textContent?.trim() || null;
    }
    return null;
  };

  const getUniqueSelector = (el) => {
    const autoId = el.getAttribute("data-automation-id");
    if (autoId) {
      const sel = '[data-automation-id="' + CSS.escape(autoId) + '"]';
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    if (el.id) return "#" + CSS.escape(el.id);
    if (el.getAttribute("name")) {
      const name = el.getAttribute("name");
      const tag = el.tagName.toLowerCase();
      const sel = tag + '[name="' + CSS.escape(name) + '"]';
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    const path = [];
    let current = el;
    while (current && current !== document.body) {
      const tag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          path.unshift(tag + ":nth-of-type(" + index + ")");
        } else {
          path.unshift(tag);
        }
      } else {
        path.unshift(tag);
      }
      current = parent;
    }
    return path.join(" > ");
  };

  nodes.forEach((el) => {
    const style = window.getComputedStyle(el);
    const isFileInput = el.tagName.toLowerCase() === "input" && el.getAttribute("type") === "file";
    if (!isFileInput) {
      if (style.display === "none" || style.visibility === "hidden") return;
      if (el.tagName.toLowerCase() === "input" && el.getAttribute("type") === "hidden") return;
    }

    const tag = el.tagName.toLowerCase();
    const entry = {
      tag: tag,
      type: el.getAttribute("type"),
      name: el.getAttribute("name"),
      id: el.getAttribute("id"),
      placeholder: el.getAttribute("placeholder"),
      ariaLabel: el.getAttribute("aria-label"),
      dataAutomationId: el.getAttribute("data-automation-id"),
      labelText: getLabel(el),
      value: el.value || null,
      selector: getUniqueSelector(el),
      isCaptcha: false,
    };

    if (tag === "select") {
      entry.options = Array.from(el.options).map(
        (opt) => ({ value: opt.value, text: opt.textContent?.trim() || "" })
      );
    }

    if (tag === "button" || tag === "a") {
      entry.value = el.textContent?.trim() || null;
    }

    elements.push(entry);
  });

  document.querySelectorAll("iframe").forEach((iframe) => {
    const src = iframe.getAttribute("src") || "";
    if (/recaptcha|hcaptcha|captcha/i.test(src)) {
      elements.push({
        tag: "iframe",
        type: "captcha",
        name: null,
        id: iframe.id || null,
        placeholder: null,
        ariaLabel: null,
        dataAutomationId: null,
        labelText: null,
        value: null,
        selector: iframe.id ? "#" + CSS.escape(iframe.id) : "iframe[src*='captcha']",
        isCaptcha: true,
      });
    }
  });

  return elements;
})()`;

async function extractFromFrame(frame: Frame): Promise<InteractiveElement[]> {
  try {
    const result = await frame.evaluate(EXTRACT_SCRIPT);
    return result as unknown as InteractiveElement[];
  } catch {
    return [];
  }
}

export interface ExtractionResult {
  elements: InteractiveElement[];
  /** Map from selector → the Frame it lives in (if not main frame) */
  selectorFrameMap: Map<string, Frame>;
}

export async function extractInteractiveElements(
  page: Page
): Promise<ExtractionResult> {
  const selectorFrameMap = new Map<string, Frame>();

  // Extract from main frame
  const mainElements = await extractFromFrame(page.mainFrame());

  // Extract from child frames
  const iframeElements: InteractiveElement[] = [];

  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    const url = frame.url();
    if (!url || url === "about:blank" || url.includes("google") || url.includes("doubleclick")) continue;

    const elements = await extractFromFrame(frame);
    if (elements.length > 0) {
      for (const el of elements) {
        // Track which frame owns this selector
        selectorFrameMap.set(el.selector, frame);
      }
      iframeElements.push(...elements);
    }
  }

  return {
    elements: [...mainElements, ...iframeElements],
    selectorFrameMap,
  };
}
