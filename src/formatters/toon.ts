import { encode as toToon } from "@toon-format/toon";
import type { RichTextItem, SlimBlock } from "../notion/block";
import type { PageData, PageFormatter } from "./index";

interface ToonLink {
  text: string;
  href: string;
}

interface ToonBlock {
  type: string;
  id?: string;
  text?: string;
  links?: ToonLink[];
  checked?: boolean;
  language?: string;
  url?: string;
  title?: string;
  hasColumnHeader?: boolean;
  hasRowHeader?: boolean;
  cells?: string[];
  rawJson?: string;
  children?: ToonBlock[];
}

// Extract links from rich text
function extractLinks(richText?: RichTextItem[]): ToonLink[] {
  if (!richText) return [];
  return richText
    .filter((item) => item.href)
    .map((item) => ({ text: item.text, href: item.href as string }));
}

// Convert rich text to plain text
function richTextToPlain(richText?: RichTextItem[]): string {
  if (!richText) return "";
  return richText.map((item) => item.text).join("");
}

// Convert SlimBlock to toon-friendly format
function blockToToon(block: SlimBlock): ToonBlock {
  const result: ToonBlock = { type: block.type };

  if (block.id) {
    result.id = block.id;
  }
  if (block.richText) {
    result.text = richTextToPlain(block.richText);
    const links = extractLinks(block.richText);
    if (links.length > 0) {
      result.links = links;
    }
  }
  if (block.checked !== undefined) {
    result.checked = block.checked;
  }
  if (block.language) {
    result.language = block.language;
  }
  if (block.url) {
    result.url = block.url;
  }
  if (block.title) {
    result.title = block.title;
  }
  if (block.hasColumnHeader !== undefined) {
    result.hasColumnHeader = block.hasColumnHeader;
  }
  if (block.hasRowHeader !== undefined) {
    result.hasRowHeader = block.hasRowHeader;
  }
  if (block.cells) {
    result.cells = block.cells;
  }
  if (block.rawJson) {
    result.rawJson = block.rawJson;
  }
  if (block.children && block.children.length > 0) {
    result.children = block.children.map(blockToToon);
  }

  return result;
}

export const toonFormatter: PageFormatter = {
  formatPage(data: PageData): string {
    return toToon({
      id: data.page.id,
      title: data.page.title,
      properties: data.page.properties,
      blocks: data.blocks.map(blockToToon),
    });
  },
};
