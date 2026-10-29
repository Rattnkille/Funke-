import { expect, type APIRequestContext, type Browser, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const PASSWORD = "Werkstatt-Test-2026";
let counter = 0;
export function uniqueEmail(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@e2e.funke.test`;
}

/** Speichert einen Screenshot unter docs/screenshots/<breite>/ und prüft das Layout. */
export async function snap(page: Page, info: TestInfo, name: string) {
  await checkLayout(page, name);
  const width = page.viewportSize()?.width ?? 0;
  const dir = path.resolve("docs/screenshots", String(width));
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
  void info;
}

/**
 * Automatische Darstellungsprüfung:
 * - kein horizontaler Überlauf der Seite,
 * - jede sichtbare Bedienfläche liegt horizontal im Viewport, ist mindestens 24 px hoch
 *   und wird an ihrem Mittelpunkt nicht von einem anderen Element verdeckt,
 * - Text ist nicht kleiner als 12 px.
 */
export async function checkLayout(page: Page, label: string) {
  await page.waitForLoadState("networkidle");
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + 1) out.push(`Horizontaler Überlauf: scrollWidth ${doc.scrollWidth} > ${window.innerWidth}`);
    const controls = Array.from(document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, summary"));
    for (const el of controls) {
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      // Inhalte zugeklappter <details> u. Ä. sind nicht sichtbar und daher keine Bedienfläche auf dem Bildschirm.
      if (!el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) continue;
      if (el.closest(".skip-link") || el.classList.contains("skip-link")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      // Versteckte native Radios in Chips werden über ihr Label bedient.
      if (el instanceof HTMLInputElement && el.closest(".chip")) continue;
      // Links im Fließtext sind von der Mindestgröße ausgenommen (WCAG 2.5.8, Ausnahme „inline“).
      const inlineTextLink = el.tagName === "A" && style.display === "inline" && !!el.closest("p, li");
      const name = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("name") || el.tagName).trim().slice(0, 40);
      if (r.left < -1 || r.right > window.innerWidth + 1) out.push(`Bedienelement außerhalb des Viewports: ${name}`);
      if (r.height < 24 && !inlineTextLink && !(el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio"))) out.push(`Bedienelement zu klein (${Math.round(r.height)} px): ${name}`);
      // Verdeckung prüfen, sofern im sichtbaren Bereich
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (cy > 0 && cy < window.innerHeight && cx > 0 && cx < window.innerWidth) {
        const hit = document.elementFromPoint(cx, cy);
        if (hit && hit !== el && !el.contains(hit) && !hit.contains(el) && !Array.from((el as HTMLInputElement).labels ?? []).some((l) => l.contains(hit))) {
          out.push(`Bedienelement verdeckt: ${name} (von ${hit.tagName}.${(hit as HTMLElement).className})`);
        }
      }
    }
    const texts = Array.from(document.querySelectorAll<HTMLElement>("p, li, span, label, h1, h2, h3, h4, a, button, legend"));
    for (const el of texts) {
      if (!el.innerText?.trim()) continue;
      if (!el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 12) out.push(`Text zu klein (${size}px): ${el.innerText.slice(0, 30)}`);
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > window.innerWidth + 1 || el.scrollWidth > el.clientWidth + 2) && getComputedStyle(el).overflowX !== "visible") {
        out.push(`Text abgeschnitten: ${el.innerText.slice(0, 30)}`);
      }
    }
    return out;
  });
  expect(problems, `Layoutprobleme auf „${label}“`).toEqual([]);
}

export async function register(page: Page, name: string, email: string) {
  await page.goto("/registrieren");
  await page.getByLabel("Dein Name").fill(name);
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(PASSWORD);
  await page.getByLabel(/Ich bin volljährig/).check();
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/start/);
}

export async function newUserPage(browser: Browser, baseURL: string | undefined, viewport: { width: number; height: number } | null) {
  const context = await browser.newContext({ baseURL, viewport: viewport ?? undefined, locale: "de-DE", timezoneId: "Europe/Berlin" });
  return { context, page: await context.newPage() };
}

/** API-Sitzung für direkte Serveranfragen (ohne Oberfläche). */
export async function apiUser(request: APIRequestContext, name: string) {
  const email = uniqueEmail(name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, ""));
  const res = await request.post("/api/auth/sign-up/email", {
    data: { name, email, password: PASSWORD, adultConfirmed: true },
    headers: { origin: "http://localhost:3100" },
  });
  expect(res.status(), await res.text()).toBe(200);
  return email;
}

export const ORIGIN = { origin: "http://localhost:3100" };
