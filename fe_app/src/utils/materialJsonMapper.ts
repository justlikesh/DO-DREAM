//------------------------------------------------------------
// HTML → Section 파서 (RN + TS + htmlparser2 완전 호환)
//------------------------------------------------------------

import { parseDocument } from "htmlparser2";
import { Element, Node, DataNode } from "domhandler";
import { textContent, findOne, isTag } from "domutils";

import { Chapter, Section } from "../types/chapter";
import type {
  MaterialJson,
  MaterialJsonChapter,
} from "../types/api/materialApiTypes";

// ==========================================================
// 1) HTML 엔티티 디코딩
// ==========================================================
function decodeHTMLEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// ==========================================================
// 2) 텍스트 정리
// ==========================================================
function cleanText(text: string): string {
  if (!text) return "";
  return decodeHTMLEntities(text)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ==========================================================
// 3) <li> → A안 방식 변환
// ==========================================================
//
// ① 개념명
// 설명...
//
function convertLiNodeToText(liNode: Element): string {
  const strongNode = findOne(
    (el: Node) => isTag(el) && el.name === "strong",
    liNode.children
  );

  let title = "";
  let body = "";

  if (strongNode && isTag(strongNode)) {
    title = textContent(strongNode).trim();
  }

  // strong 제외 나머지 body 만들기
  const bodyNodes = liNode.children.filter((n) => n !== strongNode);

  // textContent(bodyNodes) 에서 TS 타입 오류 발생하므로 as any 적용
  body = cleanText(textContent(bodyNodes as any));

  const result = `${title}\n${body}`.trim();
  return result;
}

// ==========================================================
// 4) Node 순회하여 Section[] 생성
// ==========================================================
function parseNode(
  node: Node,
  sections: Section[],
  genId: () => number
) {
  // TEXT
  if (node.type === "text") {
    const dn = node as DataNode;
    const txt = cleanText(dn.data);
    if (txt.length > 0) {
      sections.push({
        id: genId(),
        text: txt,
        type: "paragraph",
      });
    }
    return;
  }

  // TAG
  if (isTag(node)) {
    const tag = node.name.toLowerCase();
    const children = node.children || [];

    // heading
    if (/^h[1-6]$/.test(tag)) {
      const txt = cleanText(textContent(node));
      if (txt.length > 0) {
        sections.push({
          id: genId(),
          text: txt,
          type: "heading",
        });
      }
      return;
    }

    // paragraph
    if (tag === "p") {
      const txt = cleanText(textContent(node));
      if (txt.length > 0) {
        sections.push({
          id: genId(),
          text: txt,
          type: "paragraph",
        });
      }
      return;
    }

    // list item
    if (tag === "li") {
      const txt = convertLiNodeToText(node);
      if (txt.length > 0) {
        sections.push({
          id: genId(),
          text: txt,
          type: "list",
        });
      }
      return;
    }

    // line break
    if (tag === "br") {
      sections.push({
        id: genId(),
        text: "\n",
        type: "paragraph",
      });
      return;
    }

    // container tags (ul, ol, div, span…)
    children.forEach((child: Node) =>
      parseNode(child, sections, genId)
    );
    return;
  }

  // children 순회
  if ((node as any).children) {
    (node as any).children.forEach((child: Node) =>
      parseNode(child, sections, genId)
    );
  }
}

// ==========================================================
// 5) HTML → Sections
// ==========================================================
function parseHTMLToSections(
  html: string,
  sectionIdBase: number
): Section[] {
  if (!html) return [];
  const root = parseDocument(html);

  const sections: Section[] = [];
  let curId = sectionIdBase;

  const genId = () => curId++;

  root.children.forEach((n: Node) =>
    parseNode(n, sections, genId)
  );

  return sections.filter((s) => s.text.trim().length > 0);
}

// ==========================================================
// 6) 단일 챕터 변환
// ==========================================================
function buildChapterFromJson(
  materialId: number | string,
  chapterJson: MaterialJsonChapter,
  index: number
): Chapter {
  const materialIdStr = String(materialId);
  const parsedId = Number(chapterJson.id);
  const chapterNumber = !isNaN(parsedId)
    ? parsedId
    : index + 1;

  const sectionBase = chapterNumber * 1000;

  const plainContent = cleanText(
    textContent(parseDocument(chapterJson.content || ""))
  );

  const sections: Section[] = [
    {
      id: sectionBase,
      text: chapterJson.title,
      type: "heading",
    },
  ];

  const bodySections = parseHTMLToSections(
    chapterJson.content || "",
    sectionBase + 1
  );

  sections.push(...bodySections);

  return {
    chapterId: chapterNumber,
    materialId: materialIdStr,
    chapterNumber,
    title: chapterJson.title,
    content: plainContent,
    sections,
  };
}

// ==========================================================
// 7) 전체 MaterialJson → Chapter[]
// ==========================================================
export function buildChaptersFromMaterialJson(
  materialId: number | string,
  json: MaterialJson
): Chapter[] {
  if (!json || !Array.isArray(json.chapters)) {
    return [];
  }

  const contentChapters = json.chapters.filter(
    (c) => c.type === "content"
  );

  return contentChapters.map((c, i) =>
    buildChapterFromJson(materialId, c, i)
  );
}
