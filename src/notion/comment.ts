import type { CommentObjectResponse } from "@notionhq/client";
import { type RichTextItem, slimRichText } from "./block";

export interface SlimComment {
  id: string;
  richText: RichTextItem[];
  author: string;
  createdTime: string;
}

// Slim down a comment to essential fields
export function slimComment(comment: CommentObjectResponse): SlimComment {
  return {
    id: comment.id,
    richText: slimRichText(comment.rich_text),
    author: comment.display_name.resolved_name ?? "Anonymous",
    createdTime: comment.created_time,
  };
}

export interface SlimCommentsResponse {
  results: SlimComment[];
  has_more: boolean;
  next_cursor: string | null;
}

// Slim down a list-comments response
export function slimComments(comments: {
  results: CommentObjectResponse[];
  has_more: boolean;
  next_cursor: string | null;
}): SlimCommentsResponse {
  return {
    results: comments.results.map(slimComment),
    has_more: comments.has_more,
    next_cursor: comments.next_cursor,
  };
}
