import type { Page } from "rebrowser-playwright";
import type { InteractiveElement } from "./types";

export async function extractInteractiveElements(
  page: Page
): Promise<InteractiveElement[]> {
  const result = await page.evaluate(() => {
    const elements: Array<Record<string, unknown>> = [];
    const selectors = "input, textarea, select, button, a[href], [role='button'], [role='link'], [role='checkbox'], [role='radio']";
    const nodes = document.querySelectorAll(selectors);

    function getLabel(el: Element): string | null {
      // Check for associated label via 'for' attribute
      const id = el.getAttribute("id");
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent?.trim() || null;
      }
      // Check for parent label
      const parentLabel = el.closest("label");
      if (parentLabel) {
        const text = parentLabel.textContent?.trim() || null;
        return text;
      }
      return null;
    }

    function getUniqueSelector(el: Element): string {
      if (el.id) return `#${CSS.escape(el.id)}`;
      if (el.getAttribute("name")) {
        const name = el.getAttribute("name")!;
        const tag = el.tagName.toLowerCase();
        const sel = `${tag}[name="${CSS.escape(name)}"]`;
        if (document.querySelectorAll(sel).length === 1) return sel;
      }
      // Build a path-based selector
      const path: string[] = [];
      let current: Element | null = el;
      while (current && current !== document.body) {
        const cur: Element = current;
        const tag = cur.tagName.toLowerCase();
        const parent: Element | null = cur.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (c: Element) => c.tagName === cur.tagName
          );
          if (siblings.length > 1) {
            const index = siblings.indexOf(cur) + 1;
            path.unshift(`${tag}:nth-of-type(${index})`);
          } else {
            path.unshift(tag);
          }
        } else {
          path.unshift(tag);
        }
        current = parent;
      }
      return path.join(" > ");
    }

    function isCaptchaIframe(el: Element): boolean {
      if (el.tagName.toLowerCase() !== "iframe") return false;
      const src = el.getAttribute("src") || "";
      return /recaptcha|hcaptcha|captcha/i.test(src);
    }

    nodes.forEach((el) => {
      // Skip hidden elements
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return;
      if (
        el.tagName.toLowerCase() === "input" &&
        el.getAttribute("type") === "hidden"
      )
        return;

      const tag = el.tagName.toLowerCase();
      const entry: Record<string, unknown> = {
        tag,
        type: el.getAttribute("type"),
        name: el.getAttribute("name"),
        id: el.getAttribute("id"),
        placeholder: el.getAttribute("placeholder"),
        ariaLabel: el.getAttribute("aria-label"),
        labelText: getLabel(el),
        value: (el as HTMLInputElement).value || null,
        selector: getUniqueSelector(el),
        isCaptcha: false,
      };

      if (tag === "select") {
        const options = Array.from((el as HTMLSelectElement).options).map(
          (opt) => ({ value: opt.value, text: opt.textContent?.trim() || "" })
        );
        entry.options = options;
      }

      if (tag === "button" || tag === "a") {
        entry.value = el.textContent?.trim() || null;
      }

      elements.push(entry);
    });

    // Also check for captcha iframes
    document.querySelectorAll("iframe").forEach((iframe) => {
      if (isCaptchaIframe(iframe)) {
        elements.push({
          tag: "iframe",
          type: "captcha",
          name: null,
          id: iframe.id || null,
          placeholder: null,
          ariaLabel: null,
          labelText: null,
          value: null,
          selector: iframe.id
            ? `#${CSS.escape(iframe.id)}`
            : "iframe[src*='captcha']",
          isCaptcha: true,
        });
      }
    });

    return elements;
  });
  return result as unknown as InteractiveElement[];
}
