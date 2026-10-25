import { describe, expect, it } from "vitest";
import { continueList, insertBlock, link, prefixLines, wrap } from "./markdown-edit";

describe("wrap", () => {
  it("wraps the selection and toggles it back", () => {
    const on = wrap("say hello", 4, 9, "**");
    expect(on).toEqual({ text: "say **hello**", start: 6, end: 11 });
    expect(wrap(on.text, on.start, on.end, "**")).toEqual({ text: "say hello", start: 4, end: 9 });
  });

  it("inserts a placeholder when nothing is selected", () => {
    expect(wrap("a ", 2, 2, "_")).toEqual({ text: "a _text_", start: 3, end: 7 });
  });
});

describe("prefixLines", () => {
  it("bullets, numbers and un-bullets lines", () => {
    expect(prefixLines("one\ntwo", 0, 7, "- ").text).toBe("- one\n- two");
    expect(prefixLines("- one\n- two", 0, 11, "- ").text).toBe("one\ntwo");
    expect(prefixLines("- one\n- two", 0, 11, "1. ").text).toBe("1. one\n2. two");
  });

  it("turns a line into a heading", () => {
    expect(prefixLines("intro\nTitle\nend", 8, 8, "## ").text).toBe("intro\n## Title\nend");
  });
});

describe("continueList", () => {
  it("continues bullets, numbers and tasks", () => {
    expect(continueList("- a", 3)?.text).toBe("- a\n- ");
    expect(continueList("2. b", 4)?.text).toBe("2. b\n3. ");
    expect(continueList("- [x] done", 10)?.text).toBe("- [x] done\n- [ ] ");
  });

  it("ends the list on an empty item and ignores plain lines", () => {
    expect(continueList("- a\n- ", 6)).toEqual({ text: "- a\n", start: 4, end: 4 });
    expect(continueList("plain", 5)).toBeNull();
  });
});

describe("link and insertBlock", () => {
  it("selects the url of a new link", () => {
    const e = link("see docs", 4, 8);
    expect(e.text).toBe("see [docs](https://)");
    expect(e.text.slice(e.start, e.end)).toBe("https://");
  });

  it("puts blocks on their own lines", () => {
    expect(insertBlock("text", 4, 4, "---").text).toBe("text\n\n---");
  });
});
