import { describe, expect, it } from "vitest";
import { headLang, langFromAcceptLanguage, localize, localizeAll, parseLang } from "./i18n-core";

describe("langFromAcceptLanguage", () => {
  it("picks Indonesian when the browser ranks it first", () => {
    expect(langFromAcceptLanguage("id-ID,id;q=0.9,en-US;q=0.8")).toBe("id");
    expect(langFromAcceptLanguage("in")).toBe("id");
  });
  it("follows q-values, not order", () => {
    expect(langFromAcceptLanguage("en;q=0.5,id;q=0.9")).toBe("id");
    expect(langFromAcceptLanguage("id;q=0.3,en-GB")).toBe("en");
  });
  it("falls back to English", () => {
    expect(langFromAcceptLanguage(undefined)).toBe("en");
    expect(langFromAcceptLanguage("ja,fr;q=0.8")).toBe("en");
  });
});

describe("parseLang and headLang", () => {
  it("accepts only known codes", () => {
    expect(parseLang("id")).toBe("id");
    expect(parseLang("ID")).toBeNull();
    expect(parseLang(undefined)).toBeNull();
  });
  it("reads the root loader's language", () => {
    expect(headLang([{ routeId: "__root__", loaderData: { lang: "id" } }, { routeId: "/research" }])).toBe("id");
    expect(headLang([])).toBe("en");
  });
});

describe("localize", () => {
  const base = { slug: "a", label: "Research", items: ["one"] };
  it("merges the overlay only for Indonesian", () => {
    expect(localize(base, { label: "Riset" }, "id")).toEqual({ ...base, label: "Riset" });
    expect(localize(base, { label: "Riset" }, "en")).toBe(base);
    expect(localize(base, undefined, "id")).toBe(base);
  });
  it("keys overlays over a list", () => {
    const list = [base, { slug: "b", label: "Gallery", items: [] }];
    const out = localizeAll(list, { b: { label: "Galeri" } }, (x) => x.slug, "id");
    expect(out.map((x) => x.label)).toEqual(["Research", "Galeri"]);
  });
});
