import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown, stripMarkdown } from "@/lib/utils/markdown";

const html = (src: string) => renderToStaticMarkup(<Markdown source={src} />);

describe("Markdown seguro", () => {
  it("renderiza títulos, listas e ênfase", () => {
    const out = html("# Praias\n\n- **Ponta Torres**\n- *Farol*");
    expect(out).toContain("<h2");
    expect(out).toContain("<strong>Ponta Torres</strong>");
    expect(out).toContain("<em>Farol</em>");
  });
  it("não injeta HTML (proteção XSS)", () => {
    const out = html('<script>alert("x")</script> <img src=x onerror=alert(1)>');
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });
  it("ignora ligações javascript:", () => {
    const out = html("[clique](javascript:alert(1))");
    expect(out).not.toContain('href="javascript');
  });
  it("aceita ligações internas e externas seguras", () => {
    const out = html("[mapa](/mapa) e [osm](https://www.openstreetmap.org)");
    expect(out).toContain('href="/mapa"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });
  it("remove a sintaxe para resumos", () => {
    expect(stripMarkdown("## Olá **mundo** [link](/x)")).toBe("Olá mundo link");
  });
});
