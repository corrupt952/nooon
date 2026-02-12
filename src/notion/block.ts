import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";

// Rich text item from Notion API (slimmed)
export interface RichTextItem {
  text: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
}

// Extract and slim rich text array
export function slimRichText(richText: RichTextItemResponse[]): RichTextItem[] {
  if (!richText || !Array.isArray(richText)) return [];
  return richText.map((t) => {
    const item: RichTextItem = { text: t.plain_text };
    if (t.href) item.href = t.href;
    const a = t.annotations;
    if (a && (a.bold || a.italic || a.strikethrough || a.code)) {
      item.annotations = {};
      if (a.bold) item.annotations.bold = true;
      if (a.italic) item.annotations.italic = true;
      if (a.strikethrough) item.annotations.strikethrough = true;
      if (a.code) item.annotations.code = true;
    }
    return item;
  });
}

export interface SlimBlock {
  type: string;
  id?: string;
  richText?: RichTextItem[];
  checked?: boolean;
  language?: string;
  url?: string;
  title?: string;
  hasColumnHeader?: boolean;
  hasRowHeader?: boolean;
  cells?: string[];
  rawJson?: string;
  children?: SlimBlock[];
}

// Slim down a block to essential fields
export function slimBlock(block: BlockObjectResponse): SlimBlock {
  const base: SlimBlock = { type: block.type };

  switch (block.type) {
    case "paragraph":
      return { ...base, richText: slimRichText(block.paragraph.rich_text) };
    case "heading_1":
      return { ...base, richText: slimRichText(block.heading_1.rich_text) };
    case "heading_2":
      return { ...base, richText: slimRichText(block.heading_2.rich_text) };
    case "heading_3":
      return { ...base, richText: slimRichText(block.heading_3.rich_text) };
    case "quote":
      return { ...base, richText: slimRichText(block.quote.rich_text) };
    case "callout":
      return { ...base, richText: slimRichText(block.callout.rich_text) };
    case "bulleted_list_item":
      return {
        ...base,
        richText: slimRichText(block.bulleted_list_item.rich_text),
      };
    case "numbered_list_item":
      return {
        ...base,
        richText: slimRichText(block.numbered_list_item.rich_text),
      };
    case "to_do":
      return {
        ...base,
        richText: slimRichText(block.to_do.rich_text),
        checked: block.to_do.checked,
      };
    case "toggle":
      return { ...base, richText: slimRichText(block.toggle.rich_text) };
    case "code":
      return {
        ...base,
        language: block.code.language,
        richText: slimRichText(block.code.rich_text),
      };
    case "image": {
      const img = block.image;
      return {
        ...base,
        url: img.type === "file" ? img.file.url : img.external.url,
      };
    }
    case "video": {
      const vid = block.video;
      return {
        ...base,
        url: vid.type === "file" ? vid.file.url : vid.external.url,
      };
    }
    case "file": {
      const f = block.file;
      return {
        ...base,
        url: f.type === "file" ? f.file.url : f.external.url,
      };
    }
    case "pdf": {
      const p = block.pdf;
      return {
        ...base,
        url: p.type === "file" ? p.file.url : p.external.url,
      };
    }
    case "bookmark":
      return { ...base, url: block.bookmark.url };
    case "embed":
      return { ...base, url: block.embed.url };
    case "table":
      return {
        ...base,
        hasColumnHeader: block.table.has_column_header,
        hasRowHeader: block.table.has_row_header,
      };
    case "table_row":
      return {
        ...base,
        cells: block.table_row.cells.map((cell: RichTextItemResponse[]) =>
          cell.map((rt) => rt.plain_text).join(""),
        ),
      };
    case "divider":
    case "table_of_contents":
    case "column_list":
    case "column":
    case "synced_block":
    case "template":
      return base;
    case "child_page":
      return { ...base, id: block.id, title: block.child_page.title };
    case "child_database":
      return { ...base, id: block.id, title: block.child_database.title };
    default: {
      const data = (block as Record<string, unknown>)[block.type];
      if (data && typeof data === "object") {
        return { ...base, rawJson: JSON.stringify(data) };
      }
      return base;
    }
  }
}
