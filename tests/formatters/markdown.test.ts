import { describe, expect, test } from "bun:test";
import { markdownFormatter } from "../../src/formatters/markdown";
import type { SlimBlock } from "../../src/notion/block";

// Helper to format a single block through the formatter
function formatBlocks(
  blocks: SlimBlock[],
  properties: Record<string, unknown> = {},
): string {
  return markdownFormatter.formatPage({
    page: { id: "test", title: "Test", url: "", properties },
    blocks,
  });
}

// Extract just the content part (skip frontmatter and title)
function getContent(output: string): string {
  // Remove frontmatter if present
  let content = output;
  if (content.startsWith("---\n")) {
    const endIndex = content.indexOf("\n---\n", 4);
    if (endIndex !== -1) {
      content = content.slice(endIndex + 5);
    }
  }
  // Skip the title line
  return content.split("\n\n").slice(1).join("\n\n");
}

describe("markdownFormatter", () => {
  describe("formatPage", () => {
    test("formats page with title and no properties", () => {
      const result = markdownFormatter.formatPage({
        page: { id: "1", title: "My Page", url: "", properties: {} },
        blocks: [],
      });
      expect(result).toBe("# My Page\n\n");
    });

    test("formats page with title and content", () => {
      const result = markdownFormatter.formatPage({
        page: { id: "1", title: "My Page", url: "", properties: {} },
        blocks: [{ type: "paragraph", richText: [{ text: "Hello" }] }],
      });
      expect(result).toBe("# My Page\n\nHello");
    });

    test("formats page with undefined properties", () => {
      const result = markdownFormatter.formatPage({
        page: { id: "1", title: "My Page", url: "" } as any,
        blocks: [],
      });
      expect(result).toBe("# My Page\n\n");
    });
  });

  describe("frontmatter", () => {
    test("includes frontmatter when properties exist", () => {
      const result = markdownFormatter.formatPage({
        page: {
          id: "1",
          title: "My Page",
          url: "",
          properties: { Status: "Done", Priority: "High" },
        },
        blocks: [],
      });
      expect(result).toContain("---\n");
      expect(result).toContain("Status: Done");
      expect(result).toContain("Priority: High");
      expect(result).toContain("\n---\n");
    });

    test("formats string values", () => {
      const result = markdownFormatter.formatPage({
        page: {
          id: "1",
          title: "T",
          url: "",
          properties: { Status: "In Progress" },
        },
        blocks: [],
      });
      expect(result).toContain("Status: In Progress");
    });

    test("formats number values", () => {
      const result = markdownFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: { Price: 1500 } },
        blocks: [],
      });
      expect(result).toContain("Price: 1500");
    });

    test("formats boolean values", () => {
      const result = markdownFormatter.formatPage({
        page: {
          id: "1",
          title: "T",
          url: "",
          properties: { Done: true, Active: false },
        },
        blocks: [],
      });
      expect(result).toContain("Done: true");
      expect(result).toContain("Active: false");
    });

    test("formats null values", () => {
      const result = markdownFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: { Due: null } },
        blocks: [],
      });
      expect(result).toContain("Due: null");
    });

    test("formats array values", () => {
      const result = markdownFormatter.formatPage({
        page: {
          id: "1",
          title: "T",
          url: "",
          properties: { Tags: ["Bug", "High"] },
        },
        blocks: [],
      });
      expect(result).toContain("Tags: [Bug, High]");
    });

    test("formats empty array", () => {
      const result = markdownFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: { Tags: [] } },
        blocks: [],
      });
      expect(result).toContain("Tags: []");
    });

    test("quotes strings with special characters", () => {
      const result = markdownFormatter.formatPage({
        page: {
          id: "1",
          title: "T",
          url: "",
          properties: { Note: "Hello: World" },
        },
        blocks: [],
      });
      expect(result).toContain('Note: "Hello: World"');
    });

    test("uses literal block for multi-line strings", () => {
      const result = markdownFormatter.formatPage({
        page: {
          id: "1",
          title: "T",
          url: "",
          properties: { Description: "Line 1\nLine 2\nLine 3" },
        },
        blocks: [],
      });
      expect(result).toContain("Description: |");
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
    });

    test("frontmatter appears before title", () => {
      const result = markdownFormatter.formatPage({
        page: {
          id: "1",
          title: "My Page",
          url: "",
          properties: { Status: "Done" },
        },
        blocks: [],
      });
      const frontmatterEnd = result.indexOf("\n---\n");
      const titleStart = result.indexOf("# My Page");
      expect(frontmatterEnd).toBeLessThan(titleStart);
    });

    test("complete page structure with frontmatter", () => {
      const result = markdownFormatter.formatPage({
        page: {
          id: "1",
          title: "Task Title",
          url: "",
          properties: { Status: "Done", Tags: ["Important"] },
        },
        blocks: [{ type: "paragraph", richText: [{ text: "Content here" }] }],
      });
      expect(result).toBe(
        "---\nStatus: Done\nTags: [Important]\n---\n\n# Task Title\n\nContent here",
      );
    });
  });

  describe("heading blocks", () => {
    test("formats heading_1", () => {
      const content = getContent(
        formatBlocks([{ type: "heading_1", richText: [{ text: "Title" }] }]),
      );
      expect(content).toBe("# Title");
    });

    test("formats heading_2", () => {
      const content = getContent(
        formatBlocks([{ type: "heading_2", richText: [{ text: "Subtitle" }] }]),
      );
      expect(content).toBe("## Subtitle");
    });

    test("formats heading_3", () => {
      const content = getContent(
        formatBlocks([{ type: "heading_3", richText: [{ text: "Section" }] }]),
      );
      expect(content).toBe("### Section");
    });
  });

  describe("list blocks", () => {
    test("formats bulleted_list_item", () => {
      const content = getContent(
        formatBlocks([
          { type: "bulleted_list_item", richText: [{ text: "Item" }] },
        ]),
      );
      expect(content).toBe("- Item");
    });

    test("formats numbered_list_item", () => {
      const content = getContent(
        formatBlocks([
          { type: "numbered_list_item", richText: [{ text: "Step" }] },
        ]),
      );
      expect(content).toBe("1. Step");
    });

    test("formats to_do unchecked", () => {
      const content = getContent(
        formatBlocks([
          { type: "to_do", richText: [{ text: "Task" }], checked: false },
        ]),
      );
      expect(content).toBe("- [ ] Task");
    });

    test("formats to_do checked", () => {
      const content = getContent(
        formatBlocks([
          { type: "to_do", richText: [{ text: "Done" }], checked: true },
        ]),
      );
      expect(content).toBe("- [x] Done");
    });

    test("formats toggle", () => {
      const content = getContent(
        formatBlocks([
          { type: "toggle", richText: [{ text: "Toggle header" }] },
        ]),
      );
      expect(content).toBe("- Toggle header");
    });
  });

  describe("quote and callout blocks", () => {
    test("formats quote", () => {
      const content = getContent(
        formatBlocks([{ type: "quote", richText: [{ text: "Quote text" }] }]),
      );
      expect(content).toBe("> Quote text");
    });

    test("formats callout", () => {
      const content = getContent(
        formatBlocks([
          { type: "callout", richText: [{ text: "Important note" }] },
        ]),
      );
      expect(content).toBe("> Important note");
    });
  });

  describe("code blocks", () => {
    test("formats code block with language", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "code",
            richText: [{ text: "const x = 1" }],
            language: "typescript",
          },
        ]),
      );
      expect(content).toBe("```typescript\nconst x = 1\n```");
    });

    test("formats code block without language", () => {
      const content = getContent(
        formatBlocks([{ type: "code", richText: [{ text: "plain code" }] }]),
      );
      expect(content).toBe("```\nplain code\n```");
    });
  });

  describe("media blocks", () => {
    test("formats image", () => {
      const content = getContent(
        formatBlocks([{ type: "image", url: "https://example.com/img.png" }]),
      );
      expect(content).toBe("![](https://example.com/img.png)");
    });

    test("formats video", () => {
      const content = getContent(
        formatBlocks([{ type: "video", url: "https://example.com/video.mp4" }]),
      );
      expect(content).toBe("[video](https://example.com/video.mp4)");
    });

    test("formats file", () => {
      const content = getContent(
        formatBlocks([{ type: "file", url: "https://example.com/doc.pdf" }]),
      );
      expect(content).toBe("[file](https://example.com/doc.pdf)");
    });

    test("formats pdf", () => {
      const content = getContent(
        formatBlocks([{ type: "pdf", url: "https://example.com/doc.pdf" }]),
      );
      expect(content).toBe("[pdf](https://example.com/doc.pdf)");
    });

    test("formats bookmark", () => {
      const content = getContent(
        formatBlocks([{ type: "bookmark", url: "https://example.com" }]),
      );
      expect(content).toBe("https://example.com");
    });

    test("formats embed", () => {
      const content = getContent(
        formatBlocks([{ type: "embed", url: "https://twitter.com/post" }]),
      );
      expect(content).toBe("https://twitter.com/post");
    });
  });

  describe("special blocks", () => {
    test("formats divider", () => {
      const content = getContent(formatBlocks([{ type: "divider" }]));
      expect(content).toBe("---");
    });

    test("formats child_page", () => {
      const content = getContent(
        formatBlocks([{ type: "child_page", id: "abc123", title: "Subpage" }]),
      );
      expect(content).toBe("📄 Subpage (abc123)");
    });

    test("formats child_database", () => {
      const content = getContent(
        formatBlocks([
          { type: "child_database", id: "def456", title: "My Database" },
        ]),
      );
      expect(content).toBe("📊 My Database (def456)");
    });
  });

  describe("unsupported block types", () => {
    test("outputs raw JSON for unknown block type", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "super_duper_block_9999",
            rawJson: '{"expression":"E = mc^2"}',
          },
        ]),
      );
      expect(content).toBe('{"expression":"E = mc^2"}');
    });

    test("outputs empty string for unknown block type without rawJson", () => {
      const content = getContent(
        formatBlocks([{ type: "super_duper_block_9999" }]),
      );
      expect(content).toBe("");
    });
  });

  describe("rich text annotations", () => {
    test("formats bold text", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "paragraph",
            richText: [{ text: "bold", annotations: { bold: true } }],
          },
        ]),
      );
      expect(content).toBe("**bold**");
    });

    test("formats italic text", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "paragraph",
            richText: [{ text: "italic", annotations: { italic: true } }],
          },
        ]),
      );
      expect(content).toBe("*italic*");
    });

    test("formats strikethrough text", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "paragraph",
            richText: [
              { text: "deleted", annotations: { strikethrough: true } },
            ],
          },
        ]),
      );
      expect(content).toBe("~~deleted~~");
    });

    test("formats code text", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "paragraph",
            richText: [{ text: "code", annotations: { code: true } }],
          },
        ]),
      );
      expect(content).toBe("`code`");
    });

    test("formats link", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "paragraph",
            richText: [{ text: "click here", href: "https://example.com" }],
          },
        ]),
      );
      expect(content).toBe("[click here](https://example.com)");
    });

    test("formats multiple annotations", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "paragraph",
            richText: [
              { text: "formatted", annotations: { bold: true, italic: true } },
            ],
          },
        ]),
      );
      expect(content).toBe("***formatted***");
    });

    test("concatenates multiple rich text items", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "paragraph",
            richText: [
              { text: "Hello " },
              { text: "World", annotations: { bold: true } },
            ],
          },
        ]),
      );
      expect(content).toBe("Hello **World**");
    });
  });

  describe("table blocks", () => {
    test("formats table with column header", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "table",
            hasColumnHeader: true,
            hasRowHeader: false,
            children: [
              { type: "table_row", cells: ["Name", "Age", "City"] },
              { type: "table_row", cells: ["Alice", "30", "Tokyo"] },
              { type: "table_row", cells: ["Bob", "25", "Osaka"] },
            ],
          },
        ]),
      );
      expect(content).toBe(
        "| Name | Age | City |\n| --- | --- | --- |\n| Alice | 30 | Tokyo |\n| Bob | 25 | Osaka |",
      );
    });

    test("formats table without column header", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "table",
            hasColumnHeader: false,
            hasRowHeader: false,
            children: [
              { type: "table_row", cells: ["A", "B"] },
              { type: "table_row", cells: ["C", "D"] },
            ],
          },
        ]),
      );
      expect(content).toBe("| A | B |\n| --- | --- |\n| C | D |");
    });

    test("formats table with single row", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "table",
            hasColumnHeader: true,
            hasRowHeader: false,
            children: [{ type: "table_row", cells: ["Header1", "Header2"] }],
          },
        ]),
      );
      expect(content).toBe("| Header1 | Header2 |\n| --- | --- |");
    });

    test("formats table with empty children", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "table",
            hasColumnHeader: true,
            hasRowHeader: false,
            children: [],
          },
        ]),
      );
      expect(content).toBe("");
    });

    test("table does not duplicate children as nested blocks", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "table",
            hasColumnHeader: true,
            hasRowHeader: false,
            children: [
              { type: "table_row", cells: ["A", "B"] },
              { type: "table_row", cells: ["C", "D"] },
            ],
          },
        ]),
      );
      // Should not contain indented table_row output
      expect(content).not.toContain("  ");
    });
  });

  describe("nested blocks", () => {
    test("formats nested children with indentation", () => {
      const content = getContent(
        formatBlocks([
          {
            type: "bulleted_list_item",
            richText: [{ text: "Parent" }],
            children: [
              { type: "bulleted_list_item", richText: [{ text: "Child" }] },
            ],
          },
        ]),
      );
      expect(content).toBe("- Parent\n  - Child");
    });
  });

  describe("block separator", () => {
    describe("consecutive list items use single newline", () => {
      test("bulleted_list_item → bulleted_list_item", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "A" }] },
            { type: "bulleted_list_item", richText: [{ text: "B" }] },
            { type: "bulleted_list_item", richText: [{ text: "C" }] },
          ]),
        );
        expect(content).toBe("- A\n- B\n- C");
      });

      test("numbered_list_item → numbered_list_item", () => {
        const content = getContent(
          formatBlocks([
            { type: "numbered_list_item", richText: [{ text: "1" }] },
            { type: "numbered_list_item", richText: [{ text: "2" }] },
            { type: "numbered_list_item", richText: [{ text: "3" }] },
          ]),
        );
        expect(content).toBe("1. 1\n1. 2\n1. 3");
      });

      test("to_do → to_do", () => {
        const content = getContent(
          formatBlocks([
            { type: "to_do", richText: [{ text: "A" }], checked: false },
            { type: "to_do", richText: [{ text: "B" }], checked: true },
            { type: "to_do", richText: [{ text: "C" }], checked: false },
          ]),
        );
        expect(content).toBe("- [ ] A\n- [x] B\n- [ ] C");
      });

      test("toggle → toggle", () => {
        const content = getContent(
          formatBlocks([
            { type: "toggle", richText: [{ text: "A" }] },
            { type: "toggle", richText: [{ text: "B" }] },
          ]),
        );
        expect(content).toBe("- A\n- B");
      });
    });

    describe("mixed list types use single newline", () => {
      test("bulleted_list_item → numbered_list_item", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "Bullet" }] },
            { type: "numbered_list_item", richText: [{ text: "Number" }] },
          ]),
        );
        expect(content).toBe("- Bullet\n1. Number");
      });

      test("numbered_list_item → to_do", () => {
        const content = getContent(
          formatBlocks([
            { type: "numbered_list_item", richText: [{ text: "Step" }] },
            { type: "to_do", richText: [{ text: "Task" }], checked: false },
          ]),
        );
        expect(content).toBe("1. Step\n- [ ] Task");
      });

      test("to_do → toggle", () => {
        const content = getContent(
          formatBlocks([
            { type: "to_do", richText: [{ text: "Task" }], checked: true },
            { type: "toggle", richText: [{ text: "Toggle" }] },
          ]),
        );
        expect(content).toBe("- [x] Task\n- Toggle");
      });

      test("bulleted → numbered → to_do → toggle", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "A" }] },
            { type: "numbered_list_item", richText: [{ text: "B" }] },
            { type: "to_do", richText: [{ text: "C" }], checked: false },
            { type: "toggle", richText: [{ text: "D" }] },
          ]),
        );
        expect(content).toBe("- A\n1. B\n- [ ] C\n- D");
      });
    });

    describe("list items with nested children use single newline between siblings", () => {
      test("bulleted with children → bulleted with children", () => {
        const content = getContent(
          formatBlocks([
            {
              type: "bulleted_list_item",
              richText: [{ text: "Parent 1" }],
              children: [
                {
                  type: "bulleted_list_item",
                  richText: [{ text: "Child 1" }],
                },
              ],
            },
            {
              type: "bulleted_list_item",
              richText: [{ text: "Parent 2" }],
              children: [
                {
                  type: "bulleted_list_item",
                  richText: [{ text: "Child 2" }],
                },
              ],
            },
          ]),
        );
        expect(content).toBe(
          "- Parent 1\n  - Child 1\n- Parent 2\n  - Child 2",
        );
      });

      test("numbered with nested children", () => {
        const content = getContent(
          formatBlocks([
            {
              type: "numbered_list_item",
              richText: [{ text: "Step 1" }],
              children: [
                {
                  type: "numbered_list_item",
                  richText: [{ text: "Sub 1a" }],
                },
                {
                  type: "numbered_list_item",
                  richText: [{ text: "Sub 1b" }],
                },
              ],
            },
            {
              type: "numbered_list_item",
              richText: [{ text: "Step 2" }],
            },
          ]),
        );
        expect(content).toBe("1. Step 1\n  1. Sub 1a\n  1. Sub 1b\n1. Step 2");
      });
    });

    describe("non-list blocks use double newline", () => {
      test("paragraph → paragraph", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "First" }] },
            { type: "paragraph", richText: [{ text: "Second" }] },
          ]),
        );
        expect(content).toBe("First\n\nSecond");
      });

      test("heading_2 → heading_2", () => {
        const content = getContent(
          formatBlocks([
            { type: "heading_2", richText: [{ text: "H2 A" }] },
            { type: "heading_2", richText: [{ text: "H2 B" }] },
          ]),
        );
        expect(content).toBe("## H2 A\n\n## H2 B");
      });

      test("heading_2 → heading_3", () => {
        const content = getContent(
          formatBlocks([
            { type: "heading_2", richText: [{ text: "H2" }] },
            { type: "heading_3", richText: [{ text: "H3" }] },
          ]),
        );
        expect(content).toBe("## H2\n\n### H3");
      });

      test("quote → quote", () => {
        const content = getContent(
          formatBlocks([
            { type: "quote", richText: [{ text: "Q1" }] },
            { type: "quote", richText: [{ text: "Q2" }] },
          ]),
        );
        expect(content).toBe("> Q1\n\n> Q2");
      });

      test("callout → callout", () => {
        const content = getContent(
          formatBlocks([
            { type: "callout", richText: [{ text: "C1" }] },
            { type: "callout", richText: [{ text: "C2" }] },
          ]),
        );
        expect(content).toBe("> C1\n\n> C2");
      });

      test("code → code", () => {
        const content = getContent(
          formatBlocks([
            {
              type: "code",
              richText: [{ text: "a()" }],
              language: "js",
            },
            {
              type: "code",
              richText: [{ text: "b()" }],
              language: "py",
            },
          ]),
        );
        expect(content).toBe("```js\na()\n```\n\n```py\nb()\n```");
      });

      test("divider → divider", () => {
        const content = getContent(
          formatBlocks([{ type: "divider" }, { type: "divider" }]),
        );
        expect(content).toBe("---\n\n---");
      });
    });

    describe("transitions between list and non-list use double newline", () => {
      test("heading → bulleted_list_item", () => {
        const content = getContent(
          formatBlocks([
            { type: "heading_2", richText: [{ text: "Section" }] },
            { type: "bulleted_list_item", richText: [{ text: "Item" }] },
          ]),
        );
        expect(content).toBe("## Section\n\n- Item");
      });

      test("heading → numbered_list_item", () => {
        const content = getContent(
          formatBlocks([
            { type: "heading_2", richText: [{ text: "Steps" }] },
            { type: "numbered_list_item", richText: [{ text: "Step 1" }] },
          ]),
        );
        expect(content).toBe("## Steps\n\n1. Step 1");
      });

      test("bulleted_list_item → heading", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "Item" }] },
            { type: "heading_2", richText: [{ text: "Next" }] },
          ]),
        );
        expect(content).toBe("- Item\n\n## Next");
      });

      test("numbered_list_item → heading", () => {
        const content = getContent(
          formatBlocks([
            { type: "numbered_list_item", richText: [{ text: "Step" }] },
            { type: "heading_2", richText: [{ text: "Next" }] },
          ]),
        );
        expect(content).toBe("1. Step\n\n## Next");
      });

      test("bulleted_list_item → paragraph", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "Item" }] },
            { type: "paragraph", richText: [{ text: "Text" }] },
          ]),
        );
        expect(content).toBe("- Item\n\nText");
      });

      test("paragraph → bulleted_list_item", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "Text" }] },
            { type: "bulleted_list_item", richText: [{ text: "Item" }] },
          ]),
        );
        expect(content).toBe("Text\n\n- Item");
      });

      test("numbered_list_item → paragraph", () => {
        const content = getContent(
          formatBlocks([
            { type: "numbered_list_item", richText: [{ text: "Step" }] },
            { type: "paragraph", richText: [{ text: "Text" }] },
          ]),
        );
        expect(content).toBe("1. Step\n\nText");
      });

      test("paragraph → numbered_list_item", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "Text" }] },
            { type: "numbered_list_item", richText: [{ text: "Step" }] },
          ]),
        );
        expect(content).toBe("Text\n\n1. Step");
      });

      test("bulleted_list_item → quote", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "Item" }] },
            { type: "quote", richText: [{ text: "Quote" }] },
          ]),
        );
        expect(content).toBe("- Item\n\n> Quote");
      });

      test("quote → bulleted_list_item", () => {
        const content = getContent(
          formatBlocks([
            { type: "quote", richText: [{ text: "Quote" }] },
            { type: "bulleted_list_item", richText: [{ text: "Item" }] },
          ]),
        );
        expect(content).toBe("> Quote\n\n- Item");
      });

      test("bulleted_list_item → code", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "Item" }] },
            { type: "code", richText: [{ text: "x()" }], language: "js" },
          ]),
        );
        expect(content).toBe("- Item\n\n```js\nx()\n```");
      });

      test("bulleted_list_item → divider", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "Item" }] },
            { type: "divider" },
          ]),
        );
        expect(content).toBe("- Item\n\n---");
      });

      test("to_do → paragraph", () => {
        const content = getContent(
          formatBlocks([
            { type: "to_do", richText: [{ text: "Task" }], checked: false },
            { type: "paragraph", richText: [{ text: "Text" }] },
          ]),
        );
        expect(content).toBe("- [ ] Task\n\nText");
      });

      test("toggle → heading", () => {
        const content = getContent(
          formatBlocks([
            { type: "toggle", richText: [{ text: "Toggle" }] },
            { type: "heading_2", richText: [{ text: "Section" }] },
          ]),
        );
        expect(content).toBe("- Toggle\n\n## Section");
      });
    });

    describe("other non-list transitions use double newline", () => {
      test("heading → paragraph", () => {
        const content = getContent(
          formatBlocks([
            { type: "heading_2", richText: [{ text: "Title" }] },
            { type: "paragraph", richText: [{ text: "Body" }] },
          ]),
        );
        expect(content).toBe("## Title\n\nBody");
      });

      test("paragraph → heading", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "Body" }] },
            { type: "heading_2", richText: [{ text: "Title" }] },
          ]),
        );
        expect(content).toBe("Body\n\n## Title");
      });

      test("paragraph → divider", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "Text" }] },
            { type: "divider" },
          ]),
        );
        expect(content).toBe("Text\n\n---");
      });

      test("divider → paragraph", () => {
        const content = getContent(
          formatBlocks([
            { type: "divider" },
            { type: "paragraph", richText: [{ text: "Text" }] },
          ]),
        );
        expect(content).toBe("---\n\nText");
      });

      test("paragraph → code", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "Text" }] },
            { type: "code", richText: [{ text: "x()" }], language: "js" },
          ]),
        );
        expect(content).toBe("Text\n\n```js\nx()\n```");
      });

      test("code → paragraph", () => {
        const content = getContent(
          formatBlocks([
            { type: "code", richText: [{ text: "x()" }], language: "js" },
            { type: "paragraph", richText: [{ text: "Text" }] },
          ]),
        );
        expect(content).toBe("```js\nx()\n```\n\nText");
      });

      test("quote → paragraph", () => {
        const content = getContent(
          formatBlocks([
            { type: "quote", richText: [{ text: "Quote" }] },
            { type: "paragraph", richText: [{ text: "Text" }] },
          ]),
        );
        expect(content).toBe("> Quote\n\nText");
      });

      test("paragraph → quote", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "Text" }] },
            { type: "quote", richText: [{ text: "Quote" }] },
          ]),
        );
        expect(content).toBe("Text\n\n> Quote");
      });

      test("heading → divider", () => {
        const content = getContent(
          formatBlocks([
            { type: "heading_2", richText: [{ text: "Title" }] },
            { type: "divider" },
          ]),
        );
        expect(content).toBe("## Title\n\n---");
      });

      test("heading → code", () => {
        const content = getContent(
          formatBlocks([
            { type: "heading_2", richText: [{ text: "Code" }] },
            { type: "code", richText: [{ text: "x()" }], language: "js" },
          ]),
        );
        expect(content).toBe("## Code\n\n```js\nx()\n```");
      });

      test("heading → quote", () => {
        const content = getContent(
          formatBlocks([
            { type: "heading_2", richText: [{ text: "Section" }] },
            { type: "quote", richText: [{ text: "Quote" }] },
          ]),
        );
        expect(content).toBe("## Section\n\n> Quote");
      });
    });

    describe("realistic sequences", () => {
      test("heading → list → paragraph", () => {
        const content = getContent(
          formatBlocks([
            { type: "heading_2", richText: [{ text: "Steps" }] },
            { type: "numbered_list_item", richText: [{ text: "Do A" }] },
            { type: "numbered_list_item", richText: [{ text: "Do B" }] },
            { type: "numbered_list_item", richText: [{ text: "Do C" }] },
            { type: "paragraph", richText: [{ text: "Done." }] },
          ]),
        );
        expect(content).toBe("## Steps\n\n1. Do A\n1. Do B\n1. Do C\n\nDone.");
      });

      test("paragraph → list → heading", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "Intro" }] },
            { type: "bulleted_list_item", richText: [{ text: "X" }] },
            { type: "bulleted_list_item", richText: [{ text: "Y" }] },
            { type: "heading_2", richText: [{ text: "Next" }] },
          ]),
        );
        expect(content).toBe("Intro\n\n- X\n- Y\n\n## Next");
      });

      test("paragraph → divider → paragraph", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "Before" }] },
            { type: "divider" },
            { type: "paragraph", richText: [{ text: "After" }] },
          ]),
        );
        expect(content).toBe("Before\n\n---\n\nAfter");
      });

      test("full document structure", () => {
        const content = getContent(
          formatBlocks([
            { type: "heading_2", richText: [{ text: "Overview" }] },
            { type: "paragraph", richText: [{ text: "Intro text." }] },
            { type: "heading_2", richText: [{ text: "Steps" }] },
            { type: "numbered_list_item", richText: [{ text: "First" }] },
            { type: "numbered_list_item", richText: [{ text: "Second" }] },
            { type: "paragraph", richText: [{ text: "Conclusion." }] },
            { type: "divider" },
            {
              type: "bulleted_list_item",
              richText: [{ text: "Note A" }],
            },
            {
              type: "bulleted_list_item",
              richText: [{ text: "Note B" }],
            },
          ]),
        );
        expect(content).toBe(
          "## Overview\n\nIntro text.\n\n## Steps\n\n1. First\n1. Second\n\nConclusion.\n\n---\n\n- Note A\n- Note B",
        );
      });

      test("everything in sequence", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "Text" }] },
            { type: "heading_2", richText: [{ text: "H2" }] },
            { type: "bulleted_list_item", richText: [{ text: "B1" }] },
            { type: "bulleted_list_item", richText: [{ text: "B2" }] },
            { type: "numbered_list_item", richText: [{ text: "N1" }] },
            { type: "numbered_list_item", richText: [{ text: "N2" }] },
            { type: "quote", richText: [{ text: "Q" }] },
            {
              type: "code",
              richText: [{ text: "code" }],
              language: "js",
            },
            { type: "divider" },
            { type: "paragraph", richText: [{ text: "End" }] },
          ]),
        );
        expect(content).toBe(
          "Text\n\n## H2\n\n- B1\n- B2\n1. N1\n1. N2\n\n> Q\n\n```js\ncode\n```\n\n---\n\nEnd",
        );
      });
    });

    describe("empty blocks", () => {
      test("no blocks produces empty string", () => {
        const content = getContent(formatBlocks([]));
        expect(content).toBe("");
      });

      test("single block has no separator", () => {
        const content = getContent(
          formatBlocks([{ type: "paragraph", richText: [{ text: "Only" }] }]),
        );
        expect(content).toBe("Only");
      });
    });

    describe("trimExcessiveBlankLines", () => {
      test("empty paragraph between paragraphs is normalized", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "A" }] },
            { type: "paragraph", richText: [{ text: "" }] },
            { type: "paragraph", richText: [{ text: "B" }] },
          ]),
        );
        expect(content).toBe("A\n\nB");
      });

      test("empty paragraph between list and heading is normalized", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "Item" }] },
            { type: "paragraph", richText: [{ text: "" }] },
            { type: "heading_2", richText: [{ text: "Next" }] },
          ]),
        );
        expect(content).toBe("- Item\n\n## Next");
      });

      test("two empty paragraphs between blocks is normalized", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "A" }] },
            { type: "paragraph", richText: [{ text: "" }] },
            { type: "paragraph", richText: [{ text: "" }] },
            { type: "paragraph", richText: [{ text: "B" }] },
          ]),
        );
        expect(content).toBe("A\n\nB");
      });

      test("empty paragraph between two list items is normalized", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "A" }] },
            { type: "paragraph", richText: [{ text: "" }] },
            { type: "bulleted_list_item", richText: [{ text: "B" }] },
          ]),
        );
        expect(content).toBe("- A\n\n- B");
      });

      test("normal double newline is not affected", () => {
        const content = getContent(
          formatBlocks([
            { type: "paragraph", richText: [{ text: "A" }] },
            { type: "paragraph", richText: [{ text: "B" }] },
          ]),
        );
        expect(content).toBe("A\n\nB");
      });

      test("single newline between list items is not affected", () => {
        const content = getContent(
          formatBlocks([
            { type: "bulleted_list_item", richText: [{ text: "A" }] },
            { type: "bulleted_list_item", richText: [{ text: "B" }] },
          ]),
        );
        expect(content).toBe("- A\n- B");
      });
    });
  });
});
