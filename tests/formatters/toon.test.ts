import { describe, expect, test } from "bun:test";
import { toonFormatter } from "../../src/formatters/toon";

describe("toonFormatter", () => {
  describe("formatPage", () => {
    test("formats empty page", () => {
      const result = toonFormatter.formatPage({
        page: { id: "page-1", title: "Empty Page", url: "", properties: {} },
        blocks: [],
      });
      // Toon format is a compact text format
      expect(result).toContain("page-1");
      expect(result).toContain("Empty Page");
    });

    test("formats page with paragraph", () => {
      const result = toonFormatter.formatPage({
        page: { id: "page-1", title: "Test", url: "", properties: {} },
        blocks: [{ type: "paragraph", richText: [{ text: "Hello World" }] }],
      });
      expect(result).toContain("paragraph");
      expect(result).toContain("Hello World");
    });

    test("formats page with multiple blocks", () => {
      const result = toonFormatter.formatPage({
        page: { id: "page-1", title: "Test", url: "", properties: {} },
        blocks: [
          { type: "heading_1", richText: [{ text: "Title" }] },
          { type: "paragraph", richText: [{ text: "Content" }] },
        ],
      });
      expect(result).toContain("heading_1");
      expect(result).toContain("Title");
      expect(result).toContain("paragraph");
      expect(result).toContain("Content");
    });
  });

  describe("properties", () => {
    test("includes properties in output", () => {
      const result = toonFormatter.formatPage({
        page: {
          id: "page-1",
          title: "Test",
          url: "",
          properties: { Status: "Done", Priority: "High" },
        },
        blocks: [],
      });
      expect(result).toContain("properties");
      expect(result).toContain("Status");
      expect(result).toContain("Done");
      expect(result).toContain("Priority");
      expect(result).toContain("High");
    });

    test("includes array properties", () => {
      const result = toonFormatter.formatPage({
        page: {
          id: "page-1",
          title: "Test",
          url: "",
          properties: { Tags: ["Bug", "Urgent"] },
        },
        blocks: [],
      });
      expect(result).toContain("Tags");
      expect(result).toContain("Bug");
      expect(result).toContain("Urgent");
    });

    test("includes null properties", () => {
      const result = toonFormatter.formatPage({
        page: {
          id: "page-1",
          title: "Test",
          url: "",
          properties: { Due: null },
        },
        blocks: [],
      });
      expect(result).toContain("Due");
      expect(result).toContain("null");
    });

    test("includes boolean properties", () => {
      const result = toonFormatter.formatPage({
        page: {
          id: "page-1",
          title: "Test",
          url: "",
          properties: { Done: true },
        },
        blocks: [],
      });
      expect(result).toContain("Done");
      expect(result).toContain("true");
    });

    test("includes number properties", () => {
      const result = toonFormatter.formatPage({
        page: {
          id: "page-1",
          title: "Test",
          url: "",
          properties: { Price: 1500 },
        },
        blocks: [],
      });
      expect(result).toContain("Price");
      expect(result).toContain("1500");
    });
  });

  describe("block conversion", () => {
    test("includes text from richText", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "paragraph",
            richText: [{ text: "Hello " }, { text: "World" }],
          },
        ],
      });
      expect(result).toContain("Hello World");
    });

    test("includes checked status for to_do", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          { type: "to_do", richText: [{ text: "Task" }], checked: true },
        ],
      });
      expect(result).toContain("to_do");
      expect(result).toContain("checked");
    });

    test("includes language for code blocks", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "code",
            richText: [{ text: "const x = 1" }],
            language: "typescript",
          },
        ],
      });
      expect(result).toContain("typescript");
    });

    test("includes url for media blocks", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [{ type: "image", url: "https://example.com/img.png" }],
      });
      expect(result).toContain("https://example.com/img.png");
    });

    test("includes title for child_page", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [{ type: "child_page", title: "Subpage" }],
      });
      expect(result).toContain("Subpage");
    });

    test("includes nested children", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "bulleted_list_item",
            richText: [{ text: "Parent" }],
            children: [
              { type: "bulleted_list_item", richText: [{ text: "Child" }] },
            ],
          },
        ],
      });
      expect(result).toContain("Parent");
      expect(result).toContain("Child");
      expect(result).toContain("children");
    });
  });

  describe("rich text to plain text", () => {
    test("strips annotations and keeps only text", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "paragraph",
            richText: [
              { text: "bold", annotations: { bold: true } },
              { text: " and " },
              { text: "italic", annotations: { italic: true } },
            ],
          },
        ],
      });
      // Should contain plain text, not markdown formatting
      expect(result).toContain("bold and italic");
      expect(result).not.toContain("**");
      expect(result).not.toContain("*italic*");
    });

    test("handles empty richText", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [{ type: "divider" }],
      });
      expect(result).toContain("divider");
    });

    test("preserves links in rich text", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "bulleted_list_item",
            richText: [
              { text: "Check out ", href: null },
              { text: "this link", href: "https://example.com" },
            ],
          },
        ],
      });
      expect(result).toContain("Check out this link");
      expect(result).toContain("https://example.com");
    });

    test("handles multiple links in same block", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "paragraph",
            richText: [
              { text: "Visit ", href: null },
              { text: "Google", href: "https://google.com" },
              { text: " or ", href: null },
              { text: "GitHub", href: "https://github.com" },
            ],
          },
        ],
      });
      expect(result).toContain("Visit Google or GitHub");
      expect(result).toContain("https://google.com");
      expect(result).toContain("https://github.com");
    });

    test("handles link-only text (no plain text)", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "bulleted_list_item",
            richText: [
              { text: "Moneyforward ME", href: "https://moneyforward.com/" },
            ],
          },
        ],
      });
      expect(result).toContain("Moneyforward ME");
      expect(result).toContain("https://moneyforward.com/");
    });
  });

  describe("table blocks", () => {
    test("includes hasColumnHeader and hasRowHeader for table", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "table",
            hasColumnHeader: true,
            hasRowHeader: false,
            children: [
              { type: "table_row", cells: ["A", "B"] },
              { type: "table_row", cells: ["C", "D"] },
            ],
          },
        ],
      });
      expect(result).toContain("table");
      expect(result).toContain("hasColumnHeader");
      expect(result).toContain("true");
      expect(result).toContain("hasRowHeader");
      expect(result).toContain("false");
    });

    test("includes cells for table_row", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "table",
            hasColumnHeader: true,
            hasRowHeader: false,
            children: [
              { type: "table_row", cells: ["Name", "Age"] },
              { type: "table_row", cells: ["Alice", "30"] },
            ],
          },
        ],
      });
      expect(result).toContain("table_row");
      expect(result).toContain("cells");
      expect(result).toContain("Name");
      expect(result).toContain("Age");
      expect(result).toContain("Alice");
      expect(result).toContain("30");
    });

    test("table without headers omits hasColumnHeader/hasRowHeader when false is preserved", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "table",
            hasColumnHeader: false,
            hasRowHeader: false,
            children: [{ type: "table_row", cells: ["X", "Y"] }],
          },
        ],
      });
      expect(result).toContain("table");
      expect(result).toContain("hasColumnHeader");
      expect(result).toContain("hasRowHeader");
    });
  });

  describe("unsupported block types", () => {
    test("includes rawJson for unknown block type", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "super_duper_block_9999",
            rawJson: '{"expression":"E = mc^2"}',
          },
        ],
      });
      expect(result).toContain("super_duper_block_9999");
      expect(result).toContain("rawJson");
      expect(result).toContain("E = mc^2");
    });
  });

  describe("child_page and child_database with id", () => {
    test("includes id for child_page", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [{ type: "child_page", id: "abc-123", title: "Subpage" }],
      });
      expect(result).toContain("child_page");
      expect(result).toContain("abc-123");
      expect(result).toContain("Subpage");
    });

    test("includes id for child_database", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          { type: "child_database", id: "def-456", title: "My Database" },
        ],
      });
      expect(result).toContain("child_database");
      expect(result).toContain("def-456");
      expect(result).toContain("My Database");
    });

    test("includes id in nested child_database", () => {
      const result = toonFormatter.formatPage({
        page: { id: "1", title: "T", url: "", properties: {} },
        blocks: [
          {
            type: "column_list",
            children: [
              {
                type: "column",
                children: [
                  {
                    type: "child_database",
                    id: "nested-db-id",
                    title: "Nested DB",
                  },
                ],
              },
            ],
          },
        ],
      });
      expect(result).toContain("nested-db-id");
      expect(result).toContain("Nested DB");
    });
  });
});
