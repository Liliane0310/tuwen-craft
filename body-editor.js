// body-editor.js — 图文工坊正文编辑（卡片模式）
// 从 write-then-publish-main 的卡片模式移植并简化：移除头像、昵称、长文和代码块。

(function () {
  'use strict';

  // ===== 常量 =====
  const CANVAS_WIDTH = 864;
  const CANVAS_HEIGHT = 1152;
  const CARD_SIDE_PADDING = 42;
  const DEFAULT_CARD_FONT_SIZE = 34;
  const DEFAULT_CARD_LINE_HEIGHT = 1.85;
  const CARD_BODY_FONT_WEIGHT = 400;
  const BODY_EDITOR_STORAGE_KEY = 'tuwenBodyEditorState.v1';

  const FONT_STACKS = {
    'zh-system': '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
    'zh-song': '"Songti SC", SimSun, "Noto Serif CJK SC", serif',
    'zh-kai': '"Kaiti SC", KaiTi, STKaiti, serif',
    'zh-hei': 'STHeiti, "Heiti SC", "Microsoft YaHei", sans-serif',
    'zh-lxgw': '"LXGW WenKai", "Kaiti SC", KaiTi, serif',
    'en-system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    'en-serif': 'Georgia, "Times New Roman", Times, serif',
    'en-rounded': '"Arial Rounded MT Bold", "Avenir Next", Arial, sans-serif',
    'en-mono': '"SFMono-Regular", Menlo, Consolas, monospace',
    'en-lora': '"Lora", "EB Garamond", Georgia, "Times New Roman", serif',
  };

  const defaultMarkdown = `# 欢迎来到正文编辑

这是图文工坊的正文编辑模式。左侧输入 Markdown，右侧自动生成多张卡片。

## 支持格式

- **加粗文字**
- *斜体文字*
- {{color:#2563eb|局部文字变色}}
- {{bg:#fff3a3|局部文字高亮}}
- > 引用块
- 标题分级
- Markdown 表格

输入内容会自动分页，每张卡片尺寸固定为 864×1152 像素。`;

  function defaultBodyState() {
    return {
      content: defaultMarkdown,
      textColor: '#202938',
      bgColor: '#ffffff',
      fontSize: DEFAULT_CARD_FONT_SIZE,
      lineHeight: DEFAULT_CARD_LINE_HEIGHT,
      zhFont: 'zh-system',
      enFont: 'en-system',
      images: {},
      inlineColor: '#2563eb',
      inlineBgColor: '#fff3a3',
      colorBrush: false,
      bgColorBrush: false,
      pageBackgrounds: {},
    };
  }

  // ===== 工具函数 =====
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) return reject(new Error('no src'));
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function normalizeHexColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
  }

  function normalizeStoredImages(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const images = {};
    Object.entries(value).forEach(([id, entry]) => {
      if (!/^[\w-]+$/.test(id) || !entry || typeof entry !== 'object' || typeof entry.src !== 'string') return;
      const crop = entry.crop && ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(Number(entry.crop[key])))
        ? {
            x: Math.max(0, Math.round(Number(entry.crop.x))),
            y: Math.max(0, Math.round(Number(entry.crop.y))),
            width: Math.max(1, Math.round(Number(entry.crop.width))),
            height: Math.max(1, Math.round(Number(entry.crop.height))),
          }
        : null;
      images[id] = {
        src: entry.src,
        name: typeof entry.name === 'string' ? entry.name : id,
        crop,
      };
    });
    return images;
  }

  function normalizeStoredPageBackgrounds(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result = {};
    Object.entries(value).forEach(([pageNo, cfg]) => {
      if (!/^\d+$/.test(pageNo) || !cfg || typeof cfg !== 'object') return;
      if (typeof cfg.imageId !== 'string' || !/^[\w-]+$/.test(cfg.imageId)) return;
      const opacity = clamp(Number(cfg.opacity), 0, 1);
      result[pageNo] = { imageId: cfg.imageId, opacity: Number.isFinite(opacity) ? opacity : 0.35 };
    });
    return result;
  }

  function collectInlineImageIds(content) {
    const ids = new Set();
    const imageRefRegex = /\[\[image:([\w-]+)(?:\|\d+%?)?\]\]/g;
    let match;
    while ((match = imageRefRegex.exec(String(content || ''))) !== null) ids.add(match[1]);
    return ids;
  }

  function normalizeStoredBodyState(value) {
    const defaults = defaultBodyState();
    if (!value || typeof value !== 'object') return defaults;
    return {
      ...defaults,
      content: typeof value.content === 'string' ? value.content : defaults.content,
      textColor: normalizeHexColor(value.textColor, defaults.textColor),
      bgColor: normalizeHexColor(value.bgColor, defaults.bgColor),
      fontSize: clamp(Number(value.fontSize) || defaults.fontSize, 24, 40),
      lineHeight: clamp(Number(value.lineHeight) || defaults.lineHeight, 1, 2.4),
      zhFont: typeof value.zhFont === 'string' && value.zhFont.startsWith('zh-') && FONT_STACKS[value.zhFont]
        ? value.zhFont
        : defaults.zhFont,
      enFont: typeof value.enFont === 'string' && value.enFont.startsWith('en-') && FONT_STACKS[value.enFont]
        ? value.enFont
        : defaults.enFont,
      images: normalizeStoredImages(value.images),
      inlineColor: normalizeHexColor(value.inlineColor, defaults.inlineColor),
      inlineBgColor: normalizeHexColor(value.inlineBgColor, defaults.inlineBgColor),
      colorBrush: false,
      bgColorBrush: false,
      pageBackgrounds: normalizeStoredPageBackgrounds(value.pageBackgrounds),
    };
  }

  // ===== Markdown 解析 =====
  function parseInline(text, baseStart = 0) {
    const tokens = [];
    let i = 0;

    // 辅助函数:从 startIdx 开始找平衡的 }} 闭合位置,支持嵌套 {{...}}
    function findBalancedClose(str, startIdx) {
      let depth = 1;
      let pos = startIdx;
      while (pos < str.length - 1) {
        if (str.startsWith('{{', pos)) { depth++; pos += 2; }
        else if (str.startsWith('}}', pos)) {
          depth--;
          if (depth === 0) return pos;
          pos += 2;
        } else { pos++; }
      }
      return -1;
    }

    while (i < text.length) {
      const colorMatch = text.slice(i).match(/^\{\{color:(#[0-9a-fA-F]{3,8})\|/);
      if (colorMatch) {
        const contentStart = i + colorMatch[0].length;
        const closePos = findBalancedClose(text, contentStart);
        if (closePos !== -1) {
          const innerText = text.slice(contentStart, closePos);
          const textStart = baseStart + contentStart;
          tokens.push(...applyInlineStyle(parseInline(innerText, textStart), { color: colorMatch[1] }));
          i = closePos + 2;
          continue;
        }
      }
      const bgMatch = text.slice(i).match(/^\{\{bg:(#[0-9a-fA-F]{3,8})\|/);
      if (bgMatch) {
        const contentStart = i + bgMatch[0].length;
        const closePos = findBalancedClose(text, contentStart);
        if (closePos !== -1) {
          const innerText = text.slice(contentStart, closePos);
          const textStart = baseStart + contentStart;
          tokens.push(...applyInlineStyle(parseInline(innerText, textStart), { bgColor: bgMatch[1] }));
          i = closePos + 2;
          continue;
        }
      }
      if (text.startsWith('**', i)) {
        const close = text.indexOf('**', i + 2);
        if (close !== -1) {
          tokens.push(...applyInlineStyle(parseInline(text.slice(i + 2, close), baseStart + i + 2), { bold: true }));
          i = close + 2;
          continue;
        }
      }
      if (text.startsWith('*', i)) {
        const close = text.indexOf('*', i + 1);
        if (close !== -1) {
          tokens.push(...applyInlineStyle(parseInline(text.slice(i + 1, close), baseStart + i + 1), { italic: true }));
          i = close + 1;
          continue;
        }
      }
      const nextMarkers = ['{{color:', '{{bg:', '**', '*'].map((m) => text.indexOf(m, i + 1)).filter((idx) => idx !== -1);
      const next = nextMarkers.length ? Math.min(...nextMarkers) : text.length;
      tokens.push({ text: text.slice(i, next), sourceStart: baseStart + i, sourceEnd: baseStart + next });
      i = next;
    }
    return tokens.filter((t) => t.text?.length > 0);
  }

  function applyInlineStyle(tokens, style) {
    return tokens.map((t) => ({ ...t, ...style }));
  }

  function splitTableCells(line, lineOffset = 0) {
    const leading = line.match(/^\s*/)[0].length;
    let value = line.trim();
    let contentOffset = lineOffset + leading;
    if (value.startsWith('|')) {
      value = value.slice(1);
      contentOffset += 1;
    }
    if (value.endsWith('|') && !value.endsWith('\\|')) value = value.slice(0, -1);

    const rawCells = [];
    let cell = '';
    let cellStart = 0;
    for (let index = 0; index < value.length; index += 1) {
      const char = value[index];
      if (value.startsWith('{{color:', index) || value.startsWith('{{bg:', index)) {
        const close = value.indexOf('}}', index + 2);
        if (close !== -1) {
          cell += value.slice(index, close + 2);
          index = close + 1;
          continue;
        }
      }
      if (char === '\\' && value[index + 1] === '|') {
        cell += '|';
        index += 1;
        continue;
      }
      if (char === '|') {
        rawCells.push({ value: cell, start: cellStart });
        cell = '';
        cellStart = index + 1;
        continue;
      }
      cell += char;
    }
    rawCells.push({ value: cell, start: cellStart });

    return rawCells.map((entry) => {
      const cellLeading = entry.value.match(/^\s*/)[0].length;
      const text = entry.value.trim();
      return {
        text,
        tokens: parseInline(text, contentOffset + entry.start + cellLeading),
      };
    });
  }

  function tableAlignmentFromDelimiter(value) {
    const marker = String(value || '').replace(/\s+/g, '');
    if (!/^:?-{3,}:?$/.test(marker)) return null;
    if (marker.startsWith(':') && marker.endsWith(':')) return 'center';
    if (marker.endsWith(':')) return 'right';
    return 'left';
  }

  function readTableBlock(lines, lineOffsets, startIndex) {
    if (startIndex + 1 >= lines.length || !lines[startIndex].includes('|')) return null;
    const header = splitTableCells(lines[startIndex], lineOffsets[startIndex]);
    const delimiter = splitTableCells(lines[startIndex + 1], lineOffsets[startIndex + 1]);
    if (!header.length || header.length !== delimiter.length) return null;
    const alignments = delimiter.map((cell) => tableAlignmentFromDelimiter(cell.text));
    if (alignments.some((alignment) => alignment === null)) return null;

    const rows = [];
    let endIndex = startIndex + 1;
    for (let index = startIndex + 2; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.trim() || !line.includes('|')) break;
      const cells = splitTableCells(line, lineOffsets[index]);
      while (cells.length < header.length) cells.push({ text: '', tokens: [] });
      rows.push(cells.slice(0, header.length));
      endIndex = index;
    }

    return {
      block: {
        type: 'table',
        header,
        rows,
        alignments,
        sourceStart: lineOffsets[startIndex],
        sourceEnd: lineOffsets[endIndex] + lines[endIndex].length,
      },
      endIndex,
    };
  }

  function parseBlocks(content) {
    const normalized = content.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const lineOffsets = [];
    let runningOffset = 0;
    lines.forEach((line) => {
      lineOffsets.push(runningOffset);
      runningOffset += line.length + 1;
    });
    const blocks = [];
    let paragraphLines = [];
    let paragraphStart = null;
    let paragraphEnd = null;

    const flushParagraph = () => {
      if (!paragraphLines.length) return;
      blocks.push({ type: 'p', lines: paragraphLines, sourceStart: paragraphStart, sourceEnd: paragraphEnd });
      paragraphLines = [];
      paragraphStart = null;
      paragraphEnd = null;
    };

    const appendParagraphLine = (tokens, index, line) => {
      if (!tokens.length) return;
      paragraphLines.push(tokens);
      if (paragraphStart === null) paragraphStart = lineOffsets[index];
      paragraphEnd = lineOffsets[index] + line.length;
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const leading = line.match(/^\s*/)[0].length;
      const trailing = line.match(/\s*$/)[0].length;
      const trimmed = line.slice(leading, line.length - trailing);
      const trimmedStart = lineOffsets[index] + leading;

      if (trimmed) {
        const table = readTableBlock(lines, lineOffsets, index);
        if (table) {
          flushParagraph();
          blocks.push(table.block);
          index = table.endIndex;
          continue;
        }
        const imageMatch = trimmed.match(/^\[\[image:([\w-]+)(?:\|(\d+)%?)?\]\]$/);
        if (imageMatch) {
          flushParagraph();
          blocks.push({ type: 'image', id: imageMatch[1], scale: imageMatch[2] ? clamp(Number(imageMatch[2]), 10, 100) / 100 : 1, sourceStart: lineOffsets[index], sourceEnd: lineOffsets[index] + line.length });
          continue;
        }
        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
          flushParagraph();
          const level = heading[1].length;
          const contentStart = trimmedStart + heading[1].length + 1;
          blocks.push({
            type: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3',
            tokens: parseInline(heading[2].trim(), contentStart),
            sourceStart: lineOffsets[index],
            sourceEnd: lineOffsets[index] + line.length,
          });
        } else if (trimmed.startsWith('> ')) {
          flushParagraph();
          blocks.push({
            type: 'quote',
            tokens: parseInline(trimmed.slice(2).trim(), trimmedStart + 2),
            sourceStart: lineOffsets[index],
            sourceEnd: lineOffsets[index] + line.length,
          });
        } else if (/^([-*+]\s+|\d+[.)]\s+)/.test(trimmed)) {
          const text = trimmed.replace(/^([-*+]\s+|\d+[.)]\s+)/, '• ');
          appendParagraphLine(parseInline(text, trimmedStart), index, line);
        } else if (/^([-*_])(?:\s*\1){2,}\s*$/.test(trimmed)) {
          flushParagraph();
          blocks.push({ type: 'spacer', sourceStart: lineOffsets[index], sourceEnd: lineOffsets[index] + line.length });
        } else {
          appendParagraphLine(parseInline(trimmed, trimmedStart), index, line);
        }
      } else {
        flushParagraph();
      }
    }
    flushParagraph();
    return blocks;
  }

  // ===== 字体与测量 =====
  function fontFamilyForText(text, settings) {
    const zhFont = FONT_STACKS[settings.zhFont] || FONT_STACKS['zh-system'];
    const enFont = FONT_STACKS[settings.enFont] || FONT_STACKS['en-system'];
    const emojiFont = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
    return /[A-Za-z0-9_@#%+./:-]/.test(text || '') ? `${enFont}, ${zhFont}, ${emojiFont}` : `${zhFont}, ${enFont}, ${emojiFont}`;
  }

  function fontString(style, token = {}) {
    const italic = token.italic || style.italic ? 'italic ' : '';
    const weight = token.bold ? 650 : style.weight;
    return `${italic}${weight} ${style.size}px ${fontFamilyForText(token.text, style)}`;
  }

  function tokenLetterSpacing(token, style) {
    if (!token?.text || /^\s+$/.test(token.text)) return 0;
    return Math.max(0.8, style.size * 0.025);
  }

  function glyphWidth(ctx, token, style) {
    ctx.font = fontString(style, token);
    return ctx.measureText(token.text).width;
  }

  function measureToken(ctx, token, style) {
    return glyphWidth(ctx, token, style) + tokenLetterSpacing(token, style);
  }

  function graphemeSegments(text) {
    if (window.Intl?.Segmenter) {
      const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text), (part) => ({ text: part.segment, start: part.index, end: part.index + part.segment.length }));
    }
    const result = [];
    let index = 0;
    for (const char of Array.from(text)) {
      result.push({ text: char, start: index, end: index + char.length });
      index += char.length;
    }
    return result;
  }

  function splitTokenText(token) {
    const text = token.text || '';
    const segments = graphemeSegments(text);
    const units = [];
    let word = null;
    function flushWord() {
      if (!word) return;
      units.push(word);
      word = null;
    }
    for (const segment of segments) {
      if (/^[A-Za-z0-9_@#%+./:-]$/.test(segment.text)) {
        if (!word) word = { text: '', start: segment.start, end: segment.end };
        word.text += segment.text;
        word.end = segment.end;
        continue;
      }
      flushWord();
      units.push(segment);
    }
    flushWord();
    return units;
  }

  function isNoLineStartPunctuation(text) {
    return /^[,,.;:!?，。！？；：、…）\])}】》〉」』”’”’、]+$/.test(text);
  }

  function isNoLineEndPunctuation(text) {
    return /^[（\[(【《〈「『”’”’]+$/.test(text);
  }

  /** 对于单个 unit 宽度超过 maxWidth 的情况,按字符强制拆分 */
  function splitOverflowUnit(ctx, unit, token, style, maxWidth) {
    const chars = Array.from(unit.text);
    const result = [];
    let chunk = '';
    let chunkStart = unit.start;
    let chunkWidth = 0;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const part = { ...token, text: ch, sourceStart: token.sourceStart + chunkStart + chunk.length, sourceEnd: token.sourceStart + chunkStart + chunk.length + ch.length };
      const w = measureToken(ctx, part, style);
      if (chunkWidth + w > maxWidth && chunk) {
        result.push({ text: chunk, start: chunkStart, end: chunkStart + chunk.length });
        chunk = ch;
        chunkStart += chunk.length;
        chunkWidth = w;
      } else {
        chunk += ch;
        chunkWidth += w;
      }
    }
    if (chunk) result.push({ text: chunk, start: chunkStart, end: chunkStart + chunk.length });
    return result;
  }

  function wrapTokens(ctx, tokens, style, maxWidth) {
    const lines = [];
    let line = [];
    let width = 0;

    function pushLine() {
      while (line.length && /^\s+$/.test(line[0].text)) {
        width -= measureToken(ctx, line[0], style);
        line.shift();
      }
      while (line.length && /^\s+$/.test(line[line.length - 1].text)) {
        width -= measureToken(ctx, line[line.length - 1], style);
        line.pop();
      }
      if (line.length) lines.push(line);
      line = [];
      width = 0;
    }

    for (const token of tokens) {
      for (const unit of splitTokenText(token)) {
        const part = { ...token, text: unit.text, sourceStart: token.sourceStart + unit.start, sourceEnd: token.sourceStart + unit.end };
        const measured = measureToken(ctx, part, style);
        const shouldStayWithPrevious = isNoLineStartPunctuation(unit.text);
        const previousText = line.length ? line[line.length - 1].text : '';
        const previousNeedsNext = isNoLineEndPunctuation(previousText);

        if (width + measured > maxWidth && line.length && !shouldStayWithPrevious && !previousNeedsNext) {
          pushLine();
        }

        // 兜底:单个 unit 本身就超过 maxWidth(超长 URL/英文串),按字符强制拆分
        if (measured > maxWidth && !line.length) {
          const chunks = splitOverflowUnit(ctx, unit, token, style, maxWidth);
          for (const chunk of chunks) {
            const chunkPart = { ...token, text: chunk.text, sourceStart: token.sourceStart + chunk.start, sourceEnd: token.sourceStart + chunk.end };
            line.push(chunkPart);
            width += measureToken(ctx, chunkPart, style);
            if (width > maxWidth) { pushLine(); }
          }
          continue;
        }

        if (!line.length && /^\s+$/.test(unit.text)) continue;
        if (!line.length && shouldStayWithPrevious && lines.length) {
          lines[lines.length - 1].push(part);
          continue;
        }
        line.push(part);
        width += measured;
      }
    }
    pushLine();
    return lines;
  }

  function wrapBlockLines(ctx, block, style, maxWidth) {
    if (!block.lines) return wrapTokens(ctx, block.tokens, style, maxWidth);
    const lines = [];
    for (const sourceLine of block.lines) {
      lines.push(...wrapTokens(ctx, sourceLine, style, maxWidth));
    }
    return lines;
  }

  // ===== 样式 =====
  function styleForBlock(type, settings) {
    const baseSize = settings.fontSize;
    const fontSettings = { zhFont: settings.zhFont, enFont: settings.enFont };
    if (type === 'h1') {
      return { ...fontSettings, size: Math.round(baseSize * 1.36), lineHeight: 1.45, weight: 650, italic: false, marginTop: 22, marginBottom: 10, color: settings.textColor };
    }
    if (type === 'h2') {
      return { ...fontSettings, size: Math.round(baseSize * 1.12), lineHeight: 1.55, weight: 560, italic: false, marginTop: 20, marginBottom: 6, color: settings.textColor };
    }
    if (type === 'h3') {
      return { ...fontSettings, size: Math.round(baseSize * 1.02), lineHeight: 1.55, weight: 620, italic: false, marginTop: 16, marginBottom: 4, color: settings.textColor };
    }
    if (type === 'quote') {
      return { ...fontSettings, size: baseSize, lineHeight: settings.lineHeight, weight: CARD_BODY_FONT_WEIGHT, italic: false, marginTop: 18, marginBottom: 10, color: settings.textColor, quote: true };
    }
    if (type === 'table') {
      return { ...fontSettings, size: clamp(Math.round(baseSize * 0.78), 21, 30), lineHeight: 1.45, weight: CARD_BODY_FONT_WEIGHT, italic: false, marginTop: 18, marginBottom: 14, color: settings.textColor };
    }
    return { ...fontSettings, size: baseSize, lineHeight: settings.lineHeight, weight: CARD_BODY_FONT_WEIGHT, italic: false, marginTop: 16, marginBottom: 10, color: settings.textColor };
  }

  function buildTableRows(ctx, block, settings, tableWidth) {
    const columnCount = block.header.length;
    if (!columnCount) return [];
    const columnWidths = Array.from({ length: columnCount }, () => tableWidth / columnCount);
    const paddingX = 13;
    const paddingY = 10;
    const bodyStyle = styleForBlock('table', settings);
    const sourceRows = [block.header, ...block.rows];

    return sourceRows.map((cells, rowIndex) => {
      const header = rowIndex === 0;
      const style = header ? { ...bodyStyle, weight: 650 } : bodyStyle;
      const lineHeight = Math.ceil(style.size * style.lineHeight);
      const columns = columnWidths.map((width, columnIndex) => {
        const cell = cells[columnIndex] || { tokens: [] };
        const lines = wrapTokens(ctx, cell.tokens || [], style, Math.max(20, width - paddingX * 2));
        return { lines, alignment: block.alignments[columnIndex] || 'left' };
      });
      const lineCount = Math.max(1, ...columns.map((column) => column.lines.length));
      return {
        type: 'table-row',
        header,
        rowIndex,
        columns,
        columnWidths,
        style,
        lineHeight,
        paddingX,
        paddingY,
        height: lineCount * lineHeight + paddingY * 2,
        width: tableWidth,
        backgroundColor: settings.bgColor,
      };
    });
  }

  // ===== 分页排版 =====
  function contentBounds() {
    return { left: CARD_SIDE_PADDING, right: CANVAS_WIDTH - CARD_SIDE_PADDING, top: CARD_SIDE_PADDING, bottom: CANVAS_HEIGHT - CARD_SIDE_PADDING };
  }

  function buildPages(settings, imageCache) {
    const measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    const blocks = parseBlocks(settings.content);
    const images = settings.images || {};
    const pages = [];
    let page = createPage();
    let y = page.bounds.top;
    let hasContent = false;
    let previousBlockType = null;
    const contentWidth = page.bounds.right - page.bounds.left;

    function createPage() {
      return { items: [], bounds: contentBounds() };
    }

    function finishPage() {
      if (page.items.length) pages.push(page);
      page = createPage();
      y = page.bounds.top;
      hasContent = false;
      previousBlockType = null;
    }

    function ensureSpace(height, topMargin = 0) {
      if (hasContent && y + topMargin + height > page.bounds.bottom) {
        finishPage();
      }
      if (!hasContent) topMargin = 0;
      y += topMargin;
    }

    for (const block of blocks) {
      if (block.type === 'spacer') {
        const spacerHeight = Math.max(18, Math.ceil(settings.fontSize * 0.8));
        ensureSpace(spacerHeight, 0);
        y += spacerHeight;
        previousBlockType = 'spacer';
        continue;
      }

      if (block.type === 'image') {
        const imageEntry = images[block.id];
        const img = imageEntry ? imageCache.get(imageEntry.src) : null;
        if (!img) { previousBlockType = 'image'; continue; }
        const sourceRect = clampCropRect(imageEntry.crop, img);
        const aspect = sourceRect.width / sourceRect.height;
        const maxW = contentWidth;
        const maxH = page.bounds.bottom - page.bounds.top;
        let drawW = maxW;
        let drawH = drawW / aspect;
        if (drawH > maxH) { drawH = maxH; drawW = drawH * aspect; }
        // 应用缩放比例
        const scale = block.scale || 1;
        const fullW = drawW;
        const fullH = drawH;
        if (scale < 1) {
          drawW = drawW * scale;
          drawH = drawH * scale;
        }
        const topMargin = hasContent && previousBlockType !== 'spacer' ? 16 : 0;
        ensureSpace(drawH, topMargin);
        page.items.push({
          type: 'image',
          imageId: block.id,
          image: img,
          sourceRect,
          x: page.bounds.left + (contentWidth - drawW) / 2,
          y,
          width: drawW,
          height: drawH,
          fullWidth: fullW,
          fullHeight: fullH,
          scale: scale,
          radius: 13,
        });
        y += drawH + 12;
        hasContent = true;
        previousBlockType = 'image';
        continue;
      }

      if (block.type === 'table') {
        const tableRows = buildTableRows(ctx, block, settings, contentWidth);
        if (!tableRows.length) continue;
        const headerRow = tableRows[0];
        const firstBodyRow = tableRows[1];
        const topMargin = hasContent && previousBlockType !== 'spacer' ? headerRow.style.marginTop : 0;
        ensureSpace(headerRow.height + (firstBodyRow?.height || 0), topMargin);

        const addTableRow = (row, repeated = false) => {
          page.items.push({ ...row, x: page.bounds.left, y, repeated });
          y += row.height;
          hasContent = true;
        };

        addTableRow(headerRow);
        for (let rowIndex = 1; rowIndex < tableRows.length; rowIndex += 1) {
          const row = tableRows[rowIndex];
          const headerOnlyOnPage = page.items.length === 1 && page.items[0].type === 'table-row' && page.items[0].header;
          if (y + row.height > page.bounds.bottom && hasContent && !headerOnlyOnPage) {
            finishPage();
            addTableRow(headerRow, true);
          }
          addTableRow(row);
        }
        y += headerRow.style.marginBottom;
        previousBlockType = 'table';
        continue;
      }

      const style = styleForBlock(block.type, settings);
      const lineHeight = Math.ceil(style.size * style.lineHeight);
      const textWidth = style.quote ? contentWidth - 28 : contentWidth;
      const lines = wrapBlockLines(ctx, block, style, textWidth);
      let firstLine = true;

      for (const line of lines) {
        const topMargin = firstLine ? (hasContent && previousBlockType !== 'spacer' ? style.marginTop : 0) : 0;
        ensureSpace(lineHeight, topMargin);
        page.items.push({
          type: 'text',
          blockType: block.type,
          line,
          style,
          x: page.bounds.left + (style.quote ? 28 : 0),
          y,
          lineHeight,
        });
        y += lineHeight;
        firstLine = false;
        hasContent = true;
      }

      if (lines.length) {
        y += style.marginBottom;
        previousBlockType = block.type;
      }
    }

    finishPage();
    return pages.length ? pages : [createPage()];
  }

  // ===== 渲染 =====
  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawBackground(ctx, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawTextLine(ctx, item) {
    const { style, line, x, y, lineHeight } = item;
    if (style.quote) {
      ctx.fillStyle = style.color;
      roundedRect(ctx, x - 28, y + 7, 7, lineHeight - 13, 4);
      ctx.fill();
    }
    let cursor = x;
    const baseline = y + Math.round(lineHeight * 0.75);
    for (const token of line) {
      ctx.font = fontString(style, token);
      const width = glyphWidth(ctx, token, style);
      if (token.bgColor) {
        ctx.fillStyle = token.bgColor;
        roundedRect(ctx, cursor - 3, y + Math.round(lineHeight * 0.14), width + 6, Math.round(lineHeight * 0.72), 7);
        ctx.fill();
      }
      const textColor = token.color || style.color;
      ctx.fillStyle = textColor;
      ctx.fillText(token.text, cursor, baseline);
      cursor += width + tokenLetterSpacing(token, style);
    }
  }

  function measureTextLine(ctx, line, style) {
    return line.reduce((width, token) => width + glyphWidth(ctx, token, style) + tokenLetterSpacing(token, style), 0);
  }

  function drawTableRow(ctx, item) {
    const { x, y, width, height, columns, columnWidths, style, lineHeight, paddingX } = item;
    ctx.save();
    ctx.fillStyle = item.header ? style.color : item.backgroundColor;
    ctx.globalAlpha = item.header ? 0.085 : (item.rowIndex % 2 === 0 ? 0.035 : 0);
    if (ctx.globalAlpha > 0) ctx.fillRect(x, y, width, height);
    ctx.restore();

    let cellX = x;
    columns.forEach((column, columnIndex) => {
      const cellWidth = columnWidths[columnIndex];
      ctx.save();
      ctx.beginPath();
      ctx.rect(cellX + 1, y + 1, Math.max(0, cellWidth - 2), Math.max(0, height - 2));
      ctx.clip();
      const textBlockHeight = column.lines.length * lineHeight;
      const textBlockTop = y + (height - textBlockHeight) / 2;
      column.lines.forEach((line, lineIndex) => {
        const lineWidth = measureTextLine(ctx, line, style);
        let textX = cellX + paddingX;
        if (column.alignment === 'center') textX = cellX + (cellWidth - lineWidth) / 2;
        else if (column.alignment === 'right') textX = cellX + cellWidth - paddingX - lineWidth;
        drawTextLine(ctx, { style, line, x: textX, y: textBlockTop + lineIndex * lineHeight, lineHeight });
      });
      ctx.restore();
      cellX += cellWidth;
    });

    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);
    let dividerX = x;
    for (let columnIndex = 0; columnIndex < columnWidths.length - 1; columnIndex += 1) {
      dividerX += columnWidths[columnIndex];
      ctx.beginPath();
      ctx.moveTo(dividerX, y);
      ctx.lineTo(dividerX, y + height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCoverImage(ctx, image, sourceRect, x, y, width, height) {
    const sAspect = sourceRect.width / sourceRect.height;
    const dAspect = width / height;
    let sx = sourceRect.x;
    let sy = sourceRect.y;
    let sw = sourceRect.width;
    let sh = sourceRect.height;
    if (sAspect > dAspect) {
      sw = sourceRect.height * dAspect;
      sx = sourceRect.x + (sourceRect.width - sw) / 2;
    } else if (sAspect < dAspect) {
      sh = sourceRect.width / dAspect;
      sy = sourceRect.y + (sourceRect.height - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }

  function drawImageBlock(ctx, item) {
    const { image, sourceRect, x, y, width, height, radius } = item;
    ctx.save();
    roundedRect(ctx, x, y, width, height, radius);
    ctx.clip();
    drawCoverImage(ctx, image, sourceRect, x, y, width, height);
    ctx.restore();
  }

  function fullCropRect(image) {
    return { x: 0, y: 0, width: image.width, height: image.height };
  }

  function clampCropRect(crop, image) {
    if (!crop) return fullCropRect(image);
    const width = clamp(Number(crop.width) || image.width, 20, image.width);
    const height = clamp(Number(crop.height) || image.height, 20, image.height);
    return {
      x: clamp(Number(crop.x) || 0, 0, image.width - width),
      y: clamp(Number(crop.y) || 0, 0, image.height - height),
      width,
      height,
    };
  }

  function renderPage(page, index, total) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.dataset.page = String(index + 1);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    drawPageToContext(ctx, page);
    return canvas;
  }

  function drawPageToContext(ctx, page) {
    ctx.fillStyle = page.settings.bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const bg = page.background;
    if (bg?.image) {
      ctx.save();
      ctx.globalAlpha = clamp(bg.opacity ?? 0.35, 0, 1);
      drawCoverImage(ctx, bg.image, bg.sourceRect, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();
    }
    for (const item of page.items) {
      if (item.type === 'text') drawTextLine(ctx, item);
      else if (item.type === 'image') drawImageBlock(ctx, item);
      else if (item.type === 'table-row') drawTableRow(ctx, item);
    }
  }

  // ===== 图片裁剪（模块级单例） =====
  const cropper = { editor: null, targetId: null, image: null, rect: null, aspect: null, display: null, drag: null };

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function isFullCrop(rect, image) {
    return rect.x <= 1 && rect.y <= 1 && Math.abs(rect.width - image.width) <= 1 && Math.abs(rect.height - image.height) <= 1;
  }

  function fitRectToAspect(rect, image, aspect) {
    if (!aspect) return clampCropRect(rect, image);
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    let width = rect.width;
    let height = width / aspect;
    if (height > rect.height) { height = rect.height; width = height * aspect; }
    if (width > image.width) { width = image.width; height = width / aspect; }
    if (height > image.height) { height = image.height; width = height * aspect; }
    width = Math.max(20, width);
    height = Math.max(20, height);
    return {
      x: clamp(centerX - width / 2, 0, image.width - width),
      y: clamp(centerY - height / 2, 0, image.height - height),
      width,
      height,
    };
  }

  function getCropCanvas() { return document.getElementById('bodyCropCanvas'); }

  function getCropDisplay() {
    const canvas = getCropCanvas();
    const image = cropper.image;
    const padding = 26;
    const scale = Math.min((canvas.width - padding * 2) / image.width, (canvas.height - padding * 2) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    return { x: (canvas.width - width) / 2, y: (canvas.height - height) / 2, width, height, scale };
  }

  function sourceToCanvasRect(rect) {
    const display = cropper.display;
    return { x: display.x + rect.x * display.scale, y: display.y + rect.y * display.scale, width: rect.width * display.scale, height: rect.height * display.scale };
  }

  function canvasPointFromEvent(event) {
    const canvas = getCropCanvas();
    const bounds = canvas.getBoundingClientRect();
    return { x: ((event.clientX - bounds.left) / bounds.width) * canvas.width, y: ((event.clientY - bounds.top) / bounds.height) * canvas.height };
  }

  function sourcePointFromCanvas(point) {
    const display = cropper.display;
    return { x: clamp((point.x - display.x) / display.scale, 0, cropper.image.width), y: clamp((point.y - display.y) / display.scale, 0, cropper.image.height) };
  }

  function drawCropper() {
    if (!cropper.image || !cropper.rect) return;
    const canvas = getCropCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    cropper.display = getCropDisplay();
    const display = cropper.display;
    const crop = sourceToCanvasRect(cropper.rect);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cropper.image, display.x, display.y, display.width, display.height);

    ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
    ctx.fillRect(display.x, display.y, display.width, crop.y - display.y);
    ctx.fillRect(display.x, crop.y + crop.height, display.width, display.y + display.height - crop.y - crop.height);
    ctx.fillRect(display.x, crop.y, crop.x - display.x, crop.height);
    ctx.fillRect(crop.x + crop.width, crop.y, display.x + display.width - crop.x - crop.width, crop.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.76)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i += 1) {
      const gx = crop.x + (crop.width * i) / 3;
      const gy = crop.y + (crop.height * i) / 3;
      ctx.beginPath();
      ctx.moveTo(gx, crop.y);
      ctx.lineTo(gx, crop.y + crop.height);
      ctx.moveTo(crop.x, gy);
      ctx.lineTo(crop.x + crop.width, gy);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    const handles = [[crop.x, crop.y], [crop.x + crop.width, crop.y], [crop.x, crop.y + crop.height], [crop.x + crop.width, crop.y + crop.height]];
    for (const [hx, hy] of handles) ctx.fillRect(hx - 5, hy - 5, 10, 10);
  }

  function detectCropHit(point) {
    const crop = sourceToCanvasRect(cropper.rect);
    const corners = { nw: [crop.x, crop.y], ne: [crop.x + crop.width, crop.y], sw: [crop.x, crop.y + crop.height], se: [crop.x + crop.width, crop.y + crop.height] };
    for (const [handle, [hx, hy]] of Object.entries(corners)) {
      if (Math.hypot(point.x - hx, point.y - hy) <= 16) return handle;
    }
    if (point.x >= crop.x && point.x <= crop.x + crop.width && point.y >= crop.y && point.y <= crop.y + crop.height) return 'move';
    return 'move-new';
  }

  function clampMovedRect(rect, image) {
    return { ...rect, x: clamp(rect.x, 0, image.width - rect.width), y: clamp(rect.y, 0, image.height - rect.height) };
  }

  function resizeCropRect(handle, startRect, point, image, aspect) {
    const anchorX = handle.includes('w') ? startRect.x + startRect.width : startRect.x;
    const anchorY = handle.includes('n') ? startRect.y + startRect.height : startRect.y;
    let width = Math.max(20, Math.abs(point.x - anchorX));
    let height = Math.max(20, Math.abs(point.y - anchorY));
    if (aspect) {
      const horizontalChange = Math.abs(width - startRect.width);
      const verticalChange = Math.abs(height - startRect.height) * aspect;
      if (horizontalChange >= verticalChange) height = width / aspect;
      else width = height * aspect;
    }
    if (aspect) {
      const maxWidth = Math.min(image.width, image.height * aspect);
      width = clamp(width, 20, maxWidth);
      height = width / aspect;
    } else {
      width = Math.min(width, image.width);
      height = Math.min(height, image.height);
    }
    let x = handle.includes('w') ? anchorX - width : anchorX;
    let y = handle.includes('n') ? anchorY - height : anchorY;
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + width > image.width) x = image.width - width;
    if (y + height > image.height) y = image.height - height;
    return fitRectToAspect({ x, y, width, height }, image, aspect);
  }

  function startCropDrag(event) {
    if (!cropper.image || !cropper.rect) return;
    cropper.display = getCropDisplay();
    const canvasPoint = canvasPointFromEvent(event);
    const display = cropper.display;
    if (canvasPoint.x < display.x || canvasPoint.x > display.x + display.width || canvasPoint.y < display.y || canvasPoint.y > display.y + display.height) return;
    const sourcePoint = sourcePointFromCanvas(canvasPoint);
    const action = detectCropHit(canvasPoint);
    if (action === 'move-new') {
      cropper.rect = clampMovedRect({ ...cropper.rect, x: sourcePoint.x - cropper.rect.width / 2, y: sourcePoint.y - cropper.rect.height / 2 }, cropper.image);
    }
    cropper.drag = { action: action === 'move-new' ? 'move' : action, startX: sourcePoint.x, startY: sourcePoint.y, startRect: { ...cropper.rect } };
    drawCropper();
  }

  function moveCropDrag(event) {
    if (!cropper.drag || !cropper.image) return;
    const point = sourcePointFromCanvas(canvasPointFromEvent(event));
    const drag = cropper.drag;
    if (drag.action === 'move') {
      cropper.rect = clampMovedRect({ ...drag.startRect, x: drag.startRect.x + point.x - drag.startX, y: drag.startRect.y + point.y - drag.startY }, cropper.image);
    } else {
      cropper.rect = resizeCropRect(drag.action, drag.startRect, point, cropper.image, cropper.aspect);
    }
    drawCropper();
  }

  function stopCropDrag() { cropper.drag = null; }

  function setCropAspect(value) {
    if (!cropper.image || !cropper.rect) return;
    let aspect = null;
    if (value === 'original') aspect = cropper.image.width / cropper.image.height;
    if (value !== 'free' && value !== 'original') aspect = Number(value);
    cropper.aspect = Number.isFinite(aspect) && aspect > 0 ? aspect : null;
    cropper.rect = fitRectToAspect(cropper.rect, cropper.image, cropper.aspect);
    setActiveRatioButton(value);
    drawCropper();
  }

  function setActiveRatioButton(value) {
    document.querySelectorAll('#bodyCropModal [data-ratio]').forEach((button) => {
      button.classList.toggle('active', button.dataset.ratio === value);
    });
  }

  function bindCropperEvents() {
    const modal = document.getElementById('bodyCropModal');
    if (!modal || modal.dataset.bound === '1') return;
    modal.dataset.bound = '1';
    const getEditor = () => cropper.editor || bodyEditor;

    document.getElementById('bodyCropCloseBtn')?.addEventListener('click', () => getEditor()?.closeCropper());
    document.getElementById('bodyCropApplyBtn')?.addEventListener('click', () => getEditor()?.applyCropper());
    document.getElementById('bodyCropResetBtn')?.addEventListener('click', () => getEditor()?.resetCropperTarget());
    modal.addEventListener('click', (e) => { if (e.target === modal) getEditor()?.closeCropper(); });
    document.querySelectorAll('#bodyCropModal [data-ratio]').forEach((btn) => {
      btn.addEventListener('click', () => setCropAspect(btn.dataset.ratio));
    });
    const canvas = getCropCanvas();
    canvas?.addEventListener('mousedown', (e) => { e.preventDefault(); startCropDrag(e); });
    window.addEventListener('mousemove', moveCropDrag);
    window.addEventListener('mouseup', stopCropDrag);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) getEditor()?.closeCropper();
    });
    // 图片大小滑块
    const sizeSlider = document.getElementById('bodyCropSizeSlider');
    const sizeValue = document.getElementById('bodyCropSizeValue');
    if (sizeSlider && sizeValue) {
      sizeSlider.addEventListener('input', () => {
        sizeValue.textContent = `${sizeSlider.value}%`;
      });
    }
  }

  // ===== 正文编辑器类 =====
  class BodyEditor {
    constructor() {
      const storedState = this.loadState();
      this.state = storedState.state;
      this.restoredFromStorage = storedState.restored;
      this.canvases = [];
      this.selectedExportIndex = null;
      this.exporting = false;
      this.imageCache = new Map();
      this.textHistory = { stack: [], index: -1, max: 100, timer: null, restoring: false };
      this.lastSelection = { start: 0, end: 0 };
      this.lastFindIndex = -1;
      this.renderToken = 0;
      this.saveStateDebounced = debounce(() => this.saveState(), 220);
      this.render = debounce(() => {
        this._render();
        this.saveStateDebounced();
      }, 120);
      this.handleBeforeUnload = () => this.saveState({ silent: true });
      this.init();
    }

    init() {
      this.container = document.getElementById('bodyInspFields');
      this.preview = document.getElementById('bodyPreview');
      this.previewSummary = document.getElementById('bodyPreviewSummary');
      this.singleExportBtn = document.getElementById('bodyExportSelectedBtn');
      this.stage = document.getElementById('bodyStage');
      this.singleExportBtn?.addEventListener('click', () => this.exportSelected());
      this.buildInspector();
      if (this.restoredFromStorage) this.setToolStatus('已恢复上次自动保存的正文');
      this.resetTextHistory();
      bindCropperEvents();
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      this._render();
      // 字体是网络/自定义字体，首帧可能用 fallback 字体测量换行，
      // 字体就绪后再重渲一次，保证换行位置与最终字体一致。
      if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => this._render());
      }
    }

    loadState() {
      try {
        const raw = localStorage.getItem(BODY_EDITOR_STORAGE_KEY);
        if (!raw) return { state: defaultBodyState(), restored: false };
        return { state: normalizeStoredBodyState(JSON.parse(raw)), restored: true };
      } catch (_) {
        return { state: defaultBodyState(), restored: false };
      }
    }

    stateForStorage({ includeImages = true } = {}) {
      const content = this.textarea ? this.textarea.value : this.state.content;
      const referencedImages = {};
      if (includeImages) {
        const referencedIds = collectInlineImageIds(content);
        Object.values(this.state.pageBackgrounds || {}).forEach((cfg) => {
          if (cfg?.imageId) referencedIds.add(cfg.imageId);
        });
        referencedIds.forEach((id) => {
          const entry = this.state.images?.[id];
          if (entry) referencedImages[id] = entry;
        });
      }
      return {
        content,
        textColor: this.state.textColor,
        bgColor: this.state.bgColor,
        fontSize: this.state.fontSize,
        lineHeight: this.state.lineHeight,
        zhFont: this.state.zhFont,
        enFont: this.state.enFont,
        images: referencedImages,
        inlineColor: this.state.inlineColor,
        inlineBgColor: this.state.inlineBgColor,
        pageBackgrounds: this.state.pageBackgrounds || {},
        updatedAt: Date.now(),
      };
    }

    saveState({ silent = false } = {}) {
      try {
        this.state.content = this.textarea ? this.textarea.value : this.state.content;
        localStorage.setItem(BODY_EDITOR_STORAGE_KEY, JSON.stringify(this.stateForStorage()));
        if (!silent) {
          const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          this.setToolStatus(`已自动保存 · ${time}`);
        }
        return true;
      } catch (_) {
        try {
          localStorage.setItem(BODY_EDITOR_STORAGE_KEY, JSON.stringify(this.stateForStorage({ includeImages: false })));
          if (!silent) this.setToolStatus('正文和设置已保存；图片较大，浏览器未能缓存图片');
          return true;
        } catch (_) {
          if (!silent) this.setToolStatus('自动保存失败：浏览器本地空间不足');
          return false;
        }
      }
    }

    readSettings() {
      return {
        content: this.textarea ? this.textarea.value : this.state.content,
        textColor: this.state.textColor,
        bgColor: this.state.bgColor,
        fontSize: clamp(this.state.fontSize, 24, 40),
        lineHeight: clamp(this.state.lineHeight, 1, 2.4),
        zhFont: this.state.zhFont,
        enFont: this.state.enFont,
        images: this.state.images,
      };
    }

    async _render() {
      const myToken = ++this.renderToken;
      const settings = this.readSettings();
      const imageEntries = Object.values(settings.images || {});
      await Promise.all(imageEntries.map(async (entry) => {
        if (!entry?.src || this.imageCache.has(entry.src)) return;
        try {
          this.imageCache.set(entry.src, await loadImage(entry.src));
        } catch (e) { /* ignore broken image */ }
      }));
      if (myToken !== this.renderToken) return; // 过期,放弃渲染
      const pages = buildPages(settings, this.imageCache);
      const pageBackgrounds = this.state.pageBackgrounds || {};
      pages.forEach((page, index) => {
        const bgConfig = pageBackgrounds[String(index + 1)];
        if (bgConfig) {
          const entry = this.state.images[bgConfig.imageId];
          const img = entry ? this.imageCache.get(entry.src) : null;
          if (img) {
            page.background = {
              image: img,
              sourceRect: clampCropRect(entry.crop, img),
              opacity: bgConfig.opacity,
            };
          }
        }
        page.settings = settings;
      });
      this.canvases = pages.map((page, index) => renderPage(page, index, pages.length));
      if (!Number.isInteger(this.selectedExportIndex) || this.selectedExportIndex < 0 || this.selectedExportIndex >= this.canvases.length) {
        this.selectedExportIndex = null;
      }
      this.preview.innerHTML = '';
      if (!this.canvases.length) {
        if (this.previewSummary) this.previewSummary.textContent = '暂无可预览的正文图片';
        this.preview.innerHTML = '<div style="padding:48px;color:var(--color-slate-gray);text-align:center">暂无内容</div>';
        this.updateExportSelectionUI();
        return;
      }
      this.canvases.forEach((cvs, index) => {
        const pageNo = index + 1;
        const frame = document.createElement('div');
        frame.className = 'body-page-frame';
        frame.dataset.pageNo = String(pageNo);
        frame.dataset.exportIndex = String(index);
        const inlineImages = pages[index].items.filter((item) => item.type === 'image' && item.imageId);
        if (inlineImages.length) {
          cvs.title = '点击图片可裁剪；拖动右下角圆点可直接缩放';
          cvs.addEventListener('click', (event) => {
            if (cvs.dataset.resizing === '1') { delete cvs.dataset.resizing; return; }
            const bounds = cvs.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;
            const x = ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH;
            const y = ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT;
            const target = inlineImages.find((item) => (
              x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height
            ));
            if (!target) return;
            event.stopPropagation();
            this.openCropper(target.imageId);
          });
        }
        frame.appendChild(cvs);
        // 为每张内嵌图片添加拖拽缩放手柄
        inlineImages.forEach((imgItem) => {
          const handle = document.createElement('div');
          handle.className = 'body-img-resize-handle';
          // 计算手柄在 frame 中的位置（canvas 撑满 frame 宽度，按比例换算）
          const scaleX = cvs.clientWidth / CANVAS_WIDTH || 1;
          const scaleY = cvs.clientHeight / CANVAS_HEIGHT || 1;
          const rightPx = (imgItem.x + imgItem.width) * scaleX;
          const bottomPx = (imgItem.y + imgItem.height) * scaleY;
          handle.style.left = rightPx + 'px';
          handle.style.top = bottomPx + 'px';
          handle.title = '拖动调整图片大小';
          // 缩放百分比标签
          const tag = document.createElement('div');
          tag.className = 'body-img-resize-tag';
          tag.textContent = `${Math.round((imgItem.width / (imgItem.fullWidth || imgItem.width)) * 100)}%`;
          tag.style.left = (rightPx - 30) + 'px';
          tag.style.top = (bottomPx + 8) + 'px';
          tag.style.display = 'none';
          handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._startInlineResize(e, { imageId: imgItem.imageId, frame, cvs, tag, imgItem });
          });
          frame.appendChild(handle);
          frame.appendChild(tag);
        });
        const selectBtn = document.createElement('button');
        selectBtn.type = 'button';
        selectBtn.className = 'body-page-select-btn';
        selectBtn.dataset.exportIndex = String(index);
        selectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectExportPage(index);
        });
        frame.appendChild(selectBtn);
        const bgBtn = document.createElement('button');
        bgBtn.type = 'button';
        bgBtn.className = 'body-page-bg-btn';
        const hasBg = !!this.state.pageBackgrounds[String(pageNo)];
        bgBtn.textContent = hasBg ? '背景' : '设背景';
        if (hasBg) bgBtn.classList.add('has-bg');
        bgBtn.addEventListener('click', (e) => { e.stopPropagation(); this.openPageBackgroundPanel(pageNo); });
        frame.appendChild(bgBtn);
        frame.addEventListener('click', () => this.selectExportPage(index));
        this.preview.appendChild(frame);
      });
      this.updateExportSelectionUI();
      if (this.activeBgPanelPageNo && this.activeBgPanelPageNo <= this.canvases.length) {
        const pageNo = this.activeBgPanelPageNo;
        this.activeBgPanelPageNo = null;
        this.openPageBackgroundPanel(pageNo);
      }
      // 清理未使用的图片:检查 state.images 里哪些 ID 既不在正文里也不在页背景里
      const content = this.textarea ? this.textarea.value : this.state.content;
      const usedIds = collectInlineImageIds(content);
      Object.values(this.state.pageBackgrounds || {}).forEach(bg => {
        if (bg?.imageId) usedIds.add(bg.imageId);
      });
      Object.keys(this.state.images || {}).forEach(id => {
        if (!usedIds.has(id)) {
          const src = this.state.images[id]?.src;
          delete this.state.images[id];
          if (src) this.imageCache.delete(src);
        }
      });
    }

    buildInspector() {
      this.container.innerHTML = '';

      // Markdown 文本域
      const textField = document.createElement('div');
      textField.className = 'field';
      textField.innerHTML = '<label>正文内容</label>';
      this.textarea = document.createElement('textarea');
      this.textarea.className = 'body-editor-textarea';
      this.textarea.value = this.state.content;
      this.textarea.addEventListener('input', () => {
        this.state.content = this.textarea.value;
        this.scheduleTextHistoryCommit();
        this.render();
      });
      this.textarea.addEventListener('keydown', (event) => this.handleTextShortcut(event));
      this.textarea.addEventListener('select', () => this.rememberSelection());
      this.textarea.addEventListener('mouseup', () => {
        this.rememberSelection();
        this.applyActiveBrushToSelection();
      });
      this.textarea.addEventListener('keyup', (event) => {
        this.rememberSelection();
        if (event.key.startsWith('Arrow') || event.key === 'Shift') this.applyActiveBrushToSelection();
      });
      // 粘贴图片支持
      this.textarea.addEventListener('paste', (event) => this.handlePaste(event));
      textField.appendChild(this.textarea);
      this.container.appendChild(textField);

      // 工具栏
      const toolbarField = document.createElement('div');
      toolbarField.className = 'field';
      toolbarField.innerHTML = '<label>格式工具</label>';
      const toolbar = document.createElement('div');
      toolbar.className = 'body-toolbar';
      const tools = [
        { label: 'H1', format: 'h1' },
        { label: 'H2', format: 'h2' },
        { label: '加粗', format: 'bold' },
        { label: '斜体', format: 'italic' },
        { label: '引用', format: 'quote' },
        { label: '表格', format: 'table' },
        { label: '图片', format: 'image' },
      ];
      tools.forEach((t) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'body-tool-button';
        btn.textContent = t.label;
        btn.addEventListener('click', () => this.wrapSelection(t.format));
        toolbar.appendChild(btn);
      });

      this.colorMenu = this.createColorTool({
        kind: 'color',
        label: '文字色',
        title: '局部文字颜色',
        stateKey: 'inlineColor',
        guide: '选择颜色并点确定，然后在正文中选中文字。也可以先选中文字再设置。',
      });
      toolbar.appendChild(this.colorMenu);

      this.bgColorMenu = this.createColorTool({
        kind: 'background',
        label: '高亮',
        title: '局部文字背景高亮',
        stateKey: 'inlineBgColor',
        guide: '选择高亮色并点确定，可连续选中文字刷底色，点取消结束。',
      });
      toolbar.appendChild(this.bgColorMenu);

      const searchMenu = document.createElement('details');
      searchMenu.className = 'body-tool-menu';
      const searchSummary = document.createElement('summary');
      searchSummary.className = 'body-tool-button';
      searchSummary.textContent = '查找';
      searchSummary.title = '查找和替换';
      searchMenu.appendChild(searchSummary);
      const searchPopover = document.createElement('div');
      searchPopover.className = 'body-tool-popover body-search-popover';
      const findLabel = document.createElement('label');
      findLabel.textContent = '查找';
      this.findInput = document.createElement('input');
      this.findInput.type = 'text';
      this.findInput.autocomplete = 'off';
      findLabel.appendChild(this.findInput);
      searchPopover.appendChild(findLabel);
      const replaceLabel = document.createElement('label');
      replaceLabel.textContent = '替换为';
      this.replaceInput = document.createElement('input');
      this.replaceInput.type = 'text';
      this.replaceInput.autocomplete = 'off';
      replaceLabel.appendChild(this.replaceInput);
      searchPopover.appendChild(replaceLabel);
      const searchActions = document.createElement('div');
      searchActions.className = 'body-tool-actions body-search-actions';
      [
        ['查找下一个', () => this.findNext()],
        ['替换当前', () => this.replaceCurrent()],
        ['全部替换', () => this.replaceAll()],
      ].forEach(([label, handler]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.addEventListener('click', handler);
        searchActions.appendChild(btn);
      });
      searchPopover.appendChild(searchActions);
      searchMenu.appendChild(searchPopover);
      toolbar.appendChild(searchMenu);

      const undoButton = document.createElement('button');
      undoButton.type = 'button';
      undoButton.className = 'body-tool-button';
      undoButton.textContent = '撤销';
      undoButton.title = '撤销（Ctrl/Cmd + Z）';
      undoButton.addEventListener('click', () => this.undoTextChange());
      toolbar.appendChild(undoButton);
      const redoButton = document.createElement('button');
      redoButton.type = 'button';
      redoButton.className = 'body-tool-button';
      redoButton.textContent = '重做';
      redoButton.title = '重做（Ctrl/Cmd + Shift + Z）';
      redoButton.addEventListener('click', () => this.redoTextChange());
      toolbar.appendChild(redoButton);

      this.toolStatus = document.createElement('div');
      this.toolStatus.className = 'body-tool-status';
      this.toolStatus.textContent = '支持 Markdown 表格、局部文字变色与背景高亮';
      toolbar.appendChild(this.toolStatus);
      toolbarField.appendChild(toolbar);
      this.container.insertBefore(toolbarField, textField);

      // 设计设置
      const settingsField = document.createElement('div');
      settingsField.className = 'field';
      settingsField.innerHTML = '<label>设计设置</label>';
      const settingsGrid = document.createElement('div');
      settingsGrid.className = 'body-settings';

      const createNumberInput = (label, key, min, max, step) => {
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        const input = document.createElement('input');
        input.type = 'number';
        input.value = this.state[key];
        input.min = min;
        input.max = max;
        input.step = step;
        input.addEventListener('input', () => {
          this.state[key] = Number(input.value);
          this.render();
        });
        labelEl.appendChild(input);
        return labelEl;
      };

      const createColorInput = (label, key) => {
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        const input = document.createElement('input');
        input.type = 'color';
        const initial = /^#[0-9a-f]{6}$/i.test(this.state[key]) ? this.state[key] : '#ffffff';
        input.value = initial;
        const update = () => {
          if (!input.value) return;
          this.state[key] = input.value;
          this.render();
        };
        input.addEventListener('input', update);
        input.addEventListener('change', update);
        labelEl.appendChild(input);
        return labelEl;
      };

      settingsGrid.appendChild(createNumberInput('字号', 'fontSize', 24, 40, 1));
      settingsGrid.appendChild(createNumberInput('行距', 'lineHeight', 1, 2.4, 0.05));
      settingsGrid.appendChild(createColorInput('默认文字色', 'textColor'));
      settingsGrid.appendChild(createColorInput('卡片背景色', 'bgColor'));

      const zhFontLabel = document.createElement('label');
      zhFontLabel.textContent = '中文字体';
      const zhSelect = document.createElement('select');
      zhSelect.innerHTML = '<option value="zh-system">苹方/系统黑体</option><option value="zh-song">宋体</option><option value="zh-kai">楷体</option><option value="zh-hei">黑体</option><option value="zh-lxgw">霞鹜文楷</option>';
      zhSelect.value = this.state.zhFont;
      zhSelect.addEventListener('change', () => { this.state.zhFont = zhSelect.value; this.render(); });
      zhFontLabel.appendChild(zhSelect);
      settingsGrid.appendChild(zhFontLabel);

      const enFontLabel = document.createElement('label');
      enFontLabel.textContent = '英文字体';
      const enSelect = document.createElement('select');
      enSelect.innerHTML = '<option value="en-system">系统无衬线</option><option value="en-serif">Serif</option><option value="en-rounded">Rounded</option><option value="en-mono">Mono</option><option value="en-lora">Lora</option>';
      enSelect.value = this.state.enFont;
      enSelect.addEventListener('change', () => { this.state.enFont = enSelect.value; this.render(); });
      enFontLabel.appendChild(enSelect);
      settingsGrid.appendChild(enFontLabel);

      settingsField.appendChild(settingsGrid);
      this.container.appendChild(settingsField);
    }

    createColorTool({ kind, label, title, stateKey, guide }) {
      const menu = document.createElement('details');
      menu.className = 'body-tool-menu';
      const summary = document.createElement('summary');
      summary.className = `body-tool-button body-color-summary body-color-summary-${kind}`;
      summary.title = title;
      summary.setAttribute('aria-label', title);
      if (kind === 'color') {
        const letter = document.createElement('span');
        letter.className = 'body-color-letter';
        letter.textContent = 'A';
        summary.appendChild(letter);
      } else {
        summary.innerHTML = '<svg class="body-highlighter-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15.5 4.5 4 4-9.25 9.25H6.25v-4L15.5 4.5Z"/><path d="m13.5 6.5 4 4"/><path d="M4 20h16"/></svg>';
      }
      summary.style.setProperty('--body-tool-color', this.state[stateKey]);
      menu.appendChild(summary);

      const popover = document.createElement('div');
      popover.className = 'body-tool-popover body-color-popover';
      const guideEl = document.createElement('p');
      guideEl.className = 'body-color-guide';
      guideEl.textContent = guide;
      popover.appendChild(guideEl);
      const colorLabel = document.createElement('label');
      colorLabel.textContent = kind === 'color' ? '字体颜色' : '背景颜色';
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = this.state[stateKey];
      colorInput.addEventListener('input', () => {
        this.state[stateKey] = colorInput.value;
        summary.style.setProperty('--body-tool-color', colorInput.value);
        this.saveStateDebounced();
      });
      colorLabel.appendChild(colorInput);
      popover.appendChild(colorLabel);

      const actions = document.createElement('div');
      actions.className = 'body-tool-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = '取消';
      cancel.addEventListener('click', () => {
        if (kind === 'color') this.disableColorBrush();
        else this.disableBackgroundBrush();
      });
      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'primary';
      confirm.textContent = '确定';
      confirm.addEventListener('click', () => {
        if (kind === 'color') this.enableColorBrush();
        else this.enableBackgroundBrush();
      });
      actions.append(cancel, confirm);
      popover.appendChild(actions);
      menu.appendChild(popover);
      return menu;
    }

    setToolStatus(message) {
      if (this.toolStatus) this.toolStatus.textContent = message;
    }

    rememberSelection() {
      if (!this.textarea) return;
      this.lastSelection = {
        start: this.textarea.selectionStart,
        end: this.textarea.selectionEnd,
      };
    }

    getTextSnapshot() {
      // 注意:快照只含文本和光标,不含 images/pageBackgrounds/字号等。
      // 撤销删除图片后,state.images 里的数据会在下次渲染时被清理(见 _render 末尾),
      // 若之后重做恢复 [[image:id]],该 id 可能已不存在,导致图片引用断裂。
      // 完整修复需要在快照里包含整个 state,但会大幅增加内存占用,暂不实现。
      return {
        value: this.textarea.value,
        selectionStart: this.textarea.selectionStart,
        selectionEnd: this.textarea.selectionEnd,
      };
    }

    resetTextHistory() {
      clearTimeout(this.textHistory.timer);
      this.textHistory.timer = null;
      this.textHistory.stack = [this.getTextSnapshot()];
      this.textHistory.index = 0;
    }

    commitTextHistory() {
      if (this.textHistory.restoring) return;
      clearTimeout(this.textHistory.timer);
      this.textHistory.timer = null;
      const snapshot = this.getTextSnapshot();
      const current = this.textHistory.stack[this.textHistory.index];
      if (current?.value === snapshot.value) {
        this.textHistory.stack[this.textHistory.index] = snapshot;
        return;
      }
      if (this.textHistory.index < this.textHistory.stack.length - 1) {
        this.textHistory.stack = this.textHistory.stack.slice(0, this.textHistory.index + 1);
      }
      this.textHistory.stack.push(snapshot);
      if (this.textHistory.stack.length > this.textHistory.max) this.textHistory.stack.shift();
      else this.textHistory.index += 1;
    }

    scheduleTextHistoryCommit() {
      if (this.textHistory.restoring) return;
      clearTimeout(this.textHistory.timer);
      this.textHistory.timer = setTimeout(() => this.commitTextHistory(), 260);
    }

    restoreTextSnapshot(snapshot) {
      if (!snapshot) return;
      this.textHistory.restoring = true;
      this.textarea.value = snapshot.value;
      this.state.content = snapshot.value;
      this.textarea.focus();
      this.textarea.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
      this.rememberSelection();
      this.textHistory.restoring = false;
      this.render();
    }

    undoTextChange() {
      this.commitTextHistory();
      if (this.textHistory.index <= 0) {
        this.setToolStatus('已经是最早的编辑记录');
        return;
      }
      this.textHistory.index -= 1;
      this.restoreTextSnapshot(this.textHistory.stack[this.textHistory.index]);
      this.setToolStatus('已撤销');
    }

    redoTextChange() {
      this.commitTextHistory();
      if (this.textHistory.index >= this.textHistory.stack.length - 1) {
        this.setToolStatus('没有可重做的编辑');
        return;
      }
      this.textHistory.index += 1;
      this.restoreTextSnapshot(this.textHistory.stack[this.textHistory.index]);
      this.setToolStatus('已重做');
    }

    handleTextShortcut(event) {
      const key = event.key.toLowerCase();
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (key === 'b' && !event.shiftKey) {
        event.preventDefault();
        this.wrapSelection('bold');
      } else if (key === 'i' && !event.shiftKey) {
        event.preventDefault();
        this.wrapSelection('italic');
      } else if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) this.redoTextChange();
        else this.undoTextChange();
      } else if (key === 'y' && !event.shiftKey) {
        event.preventDefault();
        this.redoTextChange();
      }
    }

    wrapSelection(format) {
      if (format === 'image') { this.openImagePicker(); return; }
      this.commitTextHistory();
      const ta = this.textarea;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const value = ta.value;
      if (format === 'table') {
        const table = '| 列 1 | 列 2 |\n| --- | --- |\n| 内容 1 | 内容 2 |';
        const before = start > 0 && value[start - 1] !== '\n' ? '\n\n' : '';
        const after = end < value.length && value[end] !== '\n' ? '\n\n' : '';
        const replacement = `${before}${table}${after}`;
        ta.setRangeText(replacement, start, end, 'end');
        const firstCellStart = start + before.length + 2;
        ta.focus();
        ta.setSelectionRange(firstCellStart, firstCellStart + 3);
        this.state.content = ta.value;
        this.rememberSelection();
        this.commitTextHistory();
        this.render();
        return;
      }
      const selected = value.slice(start, end) || '文字';
      let replacement = selected;
      if (format === 'h1' || format === 'h2' || format === 'quote') {
        const prefix = format === 'h1' ? '# ' : format === 'h2' ? '## ' : '> ';
        const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
        ta.value = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
        ta.focus();
        ta.setSelectionRange(start + prefix.length, end + prefix.length);
        this.state.content = ta.value;
        this.rememberSelection();
        this.commitTextHistory();
        this.render();
        return;
      }
      if (format === 'bold') replacement = `**${selected}**`;
      else if (format === 'italic') replacement = `*${selected}*`;
      ta.setRangeText(replacement, start, end, 'end');
      if (value.slice(start, end) === '') {
        const inset = format === 'bold' ? 2 : 1;
        ta.setSelectionRange(start + inset, start + inset + selected.length);
      }
      ta.focus();
      this.state.content = ta.value;
      this.rememberSelection();
      this.commitTextHistory();
      this.render();
    }

    wrapSelectionWithStyle(kind, selection = null) {
      const ta = this.textarea;
      const range = selection || { start: ta.selectionStart, end: ta.selectionEnd };
      const start = clamp(range.start, 0, ta.value.length);
      const end = clamp(range.end, start, ta.value.length);
      if (start === end) return false;
      this.commitTextHistory();
      const selected = ta.value.slice(start, end);
      const color = kind === 'color' ? this.state.inlineColor : this.state.inlineBgColor;
      const tag = kind === 'color' ? 'color' : 'bg';
      const replacement = `{{${tag}:${color}|${selected}}}`;
      ta.setRangeText(replacement, start, end, 'end');
      ta.focus();
      this.state.content = ta.value;
      this.rememberSelection();
      this.commitTextHistory();
      this.render();
      return true;
    }

    enableColorBrush() {
      this.state.colorBrush = true;
      this.state.bgColorBrush = false;
      this.colorMenu?.querySelector('summary')?.classList.add('active');
      this.bgColorMenu?.querySelector('summary')?.classList.remove('active');
      if (this.colorMenu) this.colorMenu.open = false;
      if (this.bgColorMenu) this.bgColorMenu.open = false;
      if (this.lastSelection.end > this.lastSelection.start && this.wrapSelectionWithStyle('color', this.lastSelection)) {
        this.disableColorBrush();
        this.setToolStatus('已应用选中文字颜色');
        return;
      }
      this.setToolStatus('文字刷色已开启，请在正文中选中文字');
    }

    disableColorBrush() {
      this.state.colorBrush = false;
      this.colorMenu?.querySelector('summary')?.classList.remove('active');
      if (this.colorMenu) this.colorMenu.open = false;
    }

    enableBackgroundBrush() {
      this.state.bgColorBrush = true;
      this.state.colorBrush = false;
      this.bgColorMenu?.querySelector('summary')?.classList.add('active');
      this.colorMenu?.querySelector('summary')?.classList.remove('active');
      if (this.bgColorMenu) this.bgColorMenu.open = false;
      if (this.colorMenu) this.colorMenu.open = false;
      if (this.lastSelection.end > this.lastSelection.start) {
        this.wrapSelectionWithStyle('background', this.lastSelection);
        this.setToolStatus('已应用背景高亮，可继续选择文字，点取消结束');
        return;
      }
      this.setToolStatus('背景高亮已开启，请在正文中选中文字');
    }

    disableBackgroundBrush() {
      this.state.bgColorBrush = false;
      this.bgColorMenu?.querySelector('summary')?.classList.remove('active');
      if (this.bgColorMenu) this.bgColorMenu.open = false;
      this.setToolStatus('背景高亮已结束');
    }

    applyActiveBrushToSelection() {
      setTimeout(() => {
        if (document.activeElement !== this.textarea) return;
        this.rememberSelection();
        if (this.lastSelection.start === this.lastSelection.end) return;
        if (this.state.colorBrush && this.wrapSelectionWithStyle('color', this.lastSelection)) {
          this.disableColorBrush();
          this.setToolStatus('已应用选中文字颜色');
        } else if (this.state.bgColorBrush && this.wrapSelectionWithStyle('background', this.lastSelection)) {
          this.setToolStatus('已应用背景高亮，可继续选择文字，点取消结束');
        }
      }, 0);
    }

    getImageScaleInContent(imageId) {
      const regex = new RegExp(`\\[\\[image:${imageId}(?:\\|(\d+)%?)?\\]\\]`);
      const content = this.textarea ? this.textarea.value : this.state.content;
      const match = content.match(regex);
      if (match && match[1]) {
        return clamp(Number(match[1]), 10, 100) / 100;
      }
      return 1;
    }

    updateImageScaleInContent(imageId, scale) {
      const ta = this.textarea;
      const content = ta ? ta.value : this.state.content;
      const regex = new RegExp(`\\[\\[image:${imageId}(?:\\|\\d+%?)?\\]\\]`);
      let newContent;
      if (scale >= 1) {
        newContent = content.replace(regex, `[[image:${imageId}]]`);
      } else {
        const percentage = Math.round(scale * 100);
        newContent = content.replace(regex, `[[image:${imageId}|${percentage}%]]`);
      }
      if (ta) ta.value = newContent;
      this.state.content = newContent;
    }

    findNext() {
      const needle = this.findInput?.value || '';
      if (!needle) {
        this.setToolStatus('请输入要查找的文字');
        return false;
      }
      const content = this.textarea.value;
      const from = Math.max(this.textarea.selectionEnd, this.lastFindIndex + needle.length, 0);
      let index = content.indexOf(needle, from);
      if (index === -1 && from > 0) index = content.indexOf(needle, 0);
      if (index === -1) {
        this.lastFindIndex = -1;
        this.setToolStatus(`没有找到“${needle}”`);
        return false;
      }
      this.lastFindIndex = index;
      this.textarea.focus();
      this.textarea.setSelectionRange(index, index + needle.length);
      this.rememberSelection();
      this.setToolStatus(`已找到“${needle}”`);
      return true;
    }

    replaceCurrent() {
      const needle = this.findInput?.value || '';
      if (!needle) {
        this.setToolStatus('请输入要查找的文字');
        return;
      }
      let start = this.textarea.selectionStart;
      let end = this.textarea.selectionEnd;
      if (this.textarea.value.slice(start, end) !== needle) {
        if (!this.findNext()) return;
        start = this.textarea.selectionStart;
        end = this.textarea.selectionEnd;
      }
      this.commitTextHistory();
      const replacement = this.replaceInput?.value || '';
      this.textarea.setRangeText(replacement, start, end, 'end');
      this.state.content = this.textarea.value;
      this.lastFindIndex = start;
      this.rememberSelection();
      this.commitTextHistory();
      this.render();
      this.setToolStatus('已替换当前匹配');
    }

    replaceAll() {
      const needle = this.findInput?.value || '';
      if (!needle) {
        this.setToolStatus('请输入要查找的文字');
        return;
      }
      const matches = this.textarea.value.split(needle).length - 1;
      if (!matches) {
        this.setToolStatus(`没有找到“${needle}”`);
        return;
      }
      this.commitTextHistory();
      this.textarea.value = this.textarea.value.split(needle).join(this.replaceInput?.value || '');
      this.state.content = this.textarea.value;
      this.textarea.focus();
      this.textarea.setSelectionRange(0, 0);
      this.rememberSelection();
      this.lastFindIndex = -1;
      this.commitTextHistory();
      this.render();
      this.setToolStatus(`已替换 ${matches} 处`);
    }

    openImagePicker() {
      const insertionRange = this.getImageInsertionRange();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.hidden = true;
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (file) await this.processImageFile(file, insertionRange);
        input.remove();
      }, { once: true });
      input.addEventListener('cancel', () => input.remove(), { once: true });
      document.body.appendChild(input);
      input.click();
    }

    getImageInsertionRange() {
      const ta = this.textarea;
      const current = document.activeElement === ta
        ? { start: ta.selectionStart, end: ta.selectionEnd }
        : this.lastSelection;
      return {
        start: clamp(Number(current?.start) || 0, 0, ta.value.length),
        end: clamp(Number(current?.end) || 0, 0, ta.value.length),
      };
    }

    async processImageFile(file, insertionRange = this.getImageInsertionRange()) {
      if (!file || (file.type && !file.type.startsWith('image/'))) {
        this.setToolStatus('请选择有效的图片文件');
        return false;
      }
      let src;
      try {
        src = await readFileAsDataURL(file);
      } catch (err) {
        this.setToolStatus(`图片读取失败: ${err.message || '文件过大或格式不支持'}`);
        return false;
      }

      const id = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      this.state.images[id] = { src, name: file.name || '剪贴板图片', crop: null };
      if (!this.insertImageTagAtCursor(`[[image:${id}]]`, insertionRange)) {
        delete this.state.images[id];
        return false;
      }
      this.setToolStatus('图片已插入，可在弹窗中调整裁剪和显示大小');
      await this.openCropper(id);
      return true;
    }

    insertImageTagAtCursor(tag, insertionRange = this.getImageInsertionRange()) {
      const ta = this.textarea;
      if (!ta || !/^\[\[image:[\w-]+\]\]$/.test(tag)) return false;
      const start = clamp(Number(insertionRange?.start) || 0, 0, ta.value.length);
      const end = clamp(Number(insertionRange?.end) || 0, start, ta.value.length);
      const before = ta.value.slice(0, start);
      const after = ta.value.slice(end);
      const prefix = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const suffix = !after ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';

      this.commitTextHistory();
      ta.setRangeText(`${prefix}${tag}${suffix}`, start, end, 'end');
      ta.focus();
      this.state.content = ta.value;
      this.rememberSelection();
      this.commitTextHistory();
      this.render();
      return true;
    }

    handlePaste(event) {
      const clipboardData = event.clipboardData || (event.originalEvent && event.originalEvent.clipboardData);
      if (!clipboardData) return;
      const insertionRange = this.getImageInsertionRange();
      let file = Array.from(clipboardData.files || []).find((item) => item.type.startsWith('image/')) || null;
      if (!file) {
        const imageItem = Array.from(clipboardData.items || []).find((item) => item.type.startsWith('image/'));
        file = imageItem?.getAsFile() || null;
      }
      if (!file) return;
      event.preventDefault();
      this.processImageFile(file, insertionRange);
    }

    async openCropper(id) {
      const entry = this.state.images[id];
      if (!entry?.src) return;
      const image = await loadImage(entry.src).catch(() => null);
      if (!image) {
        this.setToolStatus('图片加载失败，可能是图片数据已损坏');
        return;
      }
      cropper.editor = this;
      cropper.targetId = id;
      cropper.image = image;
      cropper.aspect = null;
      cropper.drag = null;
      cropper.rect = clampCropRect(entry.crop, image);
      setActiveRatioButton('free');
      // 初始化缩放滑块
      const sizeSlider = document.getElementById('bodyCropSizeSlider');
      const sizeValue = document.getElementById('bodyCropSizeValue');
      const sizeSection = document.getElementById('bodyCropSizeSection');
      const isInlineImage = collectInlineImageIds(this.textarea?.value || this.state.content).has(id);
      if (sizeSection) sizeSection.hidden = !isInlineImage;
      if (sizeSlider && sizeValue) {
        const currentScale = this.getImageScaleInContent(id);
        sizeSlider.value = Math.round(currentScale * 100);
        sizeValue.textContent = `${Math.round(currentScale * 100)}%`;
      }
      const modal = document.getElementById('bodyCropModal');
      const title = document.getElementById('bodyCropTitle');
      const subtitle = document.getElementById('bodyCropSubtitle');
      if (title) title.textContent = `${isInlineImage ? '调整' : '裁剪'} ${entry.name || id}`;
      if (subtitle) subtitle.textContent = isInlineImage
        ? '拖动裁剪框选择保留区域，并设置图片在正文中的显示大小'
        : '拖动裁剪框选择要保留的区域，不裁剪则按原图放入';
      if (modal) modal.classList.remove('hidden');
      drawCropper();
    }

    closeCropper() {
      const modal = document.getElementById('bodyCropModal');
      if (modal) modal.classList.add('hidden');
      cropper.targetId = null;
      cropper.image = null;
      cropper.rect = null;
      cropper.drag = null;
    }

    applyCropper() {
      if (!cropper.targetId || !cropper.image || !cropper.rect) return;
      const entry = this.state.images[cropper.targetId];
      if (!entry) { this.closeCropper(); return; }
      entry.crop = isFullCrop(cropper.rect, cropper.image)
        ? null
        : {
            x: Math.round(cropper.rect.x),
            y: Math.round(cropper.rect.y),
            width: Math.round(cropper.rect.width),
            height: Math.round(cropper.rect.height),
          };
      this.commitTextHistory();
      // 应用缩放比例到正文中
      const sizeSlider = document.getElementById('bodyCropSizeSlider');
      if (sizeSlider) {
        const scale = clamp(Number(sizeSlider.value), 10, 100) / 100;
        this.updateImageScaleInContent(cropper.targetId, scale);
      }
      this.commitTextHistory();
      this.closeCropper();
      this.render();
      this.setToolStatus('图片裁剪和显示大小已更新');
    }

    resetCropperTarget() {
      if (!cropper.targetId) return;
      const entry = this.state.images[cropper.targetId];
      if (entry) entry.crop = null;
      if (cropper.image) cropper.rect = fullCropRect(cropper.image);
      // 重置缩放为100%
      const sizeSlider = document.getElementById('bodyCropSizeSlider');
      const sizeValue = document.getElementById('bodyCropSizeValue');
      if (sizeSlider) sizeSlider.value = 100;
      if (sizeValue) sizeValue.textContent = '100%';
      // 清除正文中的缩放标记
      this.commitTextHistory();
      this.updateImageScaleInContent(cropper.targetId, 1);
      this.commitTextHistory();
      drawCropper();
      this.render();
    }

    _startInlineResize(e, ctx) {
      const { imageId, cvs, tag, imgItem } = ctx;
      const bounds = cvs.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const scaleX = bounds.width / CANVAS_WIDTH;
      const fullWidth = imgItem.fullWidth || imgItem.width;
      const startScale = imgItem.scale || (imgItem.width / fullWidth);
      const startX = e.clientX;
      const startScaleVal = startScale;
      cvs.dataset.resizing = '1';
      tag.style.display = 'block';
      tag.textContent = `${Math.round(startScale * 100)}%`;

      const move = (ev) => {
        const dx = ev.clientX - startX;
        // 以图片宽度变化映射到缩放比例：拖动一个 fullWidth 的距离 = 100% 变化
        const deltaScale = dx / (fullWidth * scaleX);
        let newScale = clamp(startScaleVal + deltaScale, 0.1, 1.0);
        tag.textContent = `${Math.round(newScale * 100)}%`;
        // 实时更新正文 Markdown 中的缩放标记（防抖渲染）
        this.updateImageScaleInContent(imageId, newScale);
        this._scheduleResizeRender();
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        tag.style.display = 'none';
        this.commitTextHistory();
        this._resizeRenderTimer = null;
        this.render();
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    }

    _scheduleResizeRender() {
      if (this._resizeRenderTimer) clearTimeout(this._resizeRenderTimer);
      this._resizeRenderTimer = setTimeout(() => {
        this._render();
        this.saveStateDebounced();
      }, 100);
    }

    openPageBackgroundPanel(pageNo) {
      this.closePageBackgroundPanel();
      const frame = this.preview.querySelector(`.body-page-frame[data-page-no="${pageNo}"]`);
      if (!frame) return;
      const panel = document.createElement('div');
      panel.className = 'body-bg-panel';
      panel.dataset.pageNo = String(pageNo);
      const cfg = this.state.pageBackgrounds[String(pageNo)];
      const opacity = cfg ? clamp(cfg.opacity ?? 0.35, 0, 1) : 0.35;
      const thumbSrc = cfg ? this.state.images[cfg.imageId]?.src : null;

      panel.innerHTML = `
        <div class="body-bg-panel-title">第 ${pageNo} 页背景</div>
        <div class="body-bg-panel-thumb">${thumbSrc ? `<img src="${thumbSrc}" alt="">` : '<span>未设置背景</span>'}</div>
        <label class="body-bg-opacity-row">
          <span>透明度</span>
          <input type="range" min="0" max="100" value="${Math.round(opacity * 100)}" data-op="opacity">
          <span class="body-bg-opacity-val">${Math.round(opacity * 100)}%</span>
        </label>
        <div class="body-bg-panel-actions">
          <button type="button" data-op="upload">${cfg ? '换图' : '上传背景'}</button>
          ${cfg ? '<button type="button" data-op="crop">调整裁剪</button>' : ''}
          ${cfg ? '<button type="button" data-op="apply-all">应用到所有页</button>' : ''}
          ${cfg ? '<button type="button" data-op="remove" class="danger">删除背景</button>' : ''}
          <button type="button" data-op="close" class="ghost">关闭</button>
        </div>
      `;

      panel.addEventListener('click', (e) => {
        const op = e.target?.dataset?.op;
        if (!op) return;
        if (op === 'upload') this.pickPageBackgroundImage(pageNo);
        else if (op === 'crop' && cfg) this.openCropper(cfg.imageId);
        else if (op === 'apply-all' && cfg) this.applyBackgroundToAllPages(pageNo);
        else if (op === 'remove') this.removePageBackground(pageNo);
        else if (op === 'close') this.closePageBackgroundPanel();
      });
      panel.querySelector('[data-op="opacity"]')?.addEventListener('input', (e) => {
        const val = Number(e.target.value) / 100;
        if (this.state.pageBackgrounds[String(pageNo)]) {
          this.state.pageBackgrounds[String(pageNo)].opacity = val;
          panel.querySelector('.body-bg-opacity-val').textContent = `${e.target.value}%`;
          this.render();
        }
      });

      frame.appendChild(panel);
      this.activeBgPanel = panel;
      this.activeBgPanelPageNo = pageNo;
      panel.querySelector('[data-op="opacity"]')?.focus();
    }

    closePageBackgroundPanel() {
      if (this.activeBgPanel) {
        this.activeBgPanel.remove();
        this.activeBgPanel = null;
      }
      this.activeBgPanelPageNo = null;
    }

    pickPageBackgroundImage(pageNo) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        readFileAsDataURL(file).then((src) => {
          const id = `bg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
          this.state.images[id] = { src, name: file.name, crop: null };
          this.state.pageBackgrounds[String(pageNo)] = { imageId: id, opacity: 0.35 };
          this.closePageBackgroundPanel();
          this.render();
        }).catch((err) => {
          this.setToolStatus(`背景图读取失败: ${err.message || '文件过大或格式不支持'}`, 'error');
        });
      });
      input.click();
    }

    removePageBackground(pageNo) {
      delete this.state.pageBackgrounds[String(pageNo)];
      this.closePageBackgroundPanel();
      this.render();
    }

    applyBackgroundToAllPages(sourcePageNo) {
      const cfg = this.state.pageBackgrounds[String(sourcePageNo)];
      if (!cfg) return;
      const total = this.canvases.length || 1;
      for (let i = 1; i <= total; i += 1) {
        this.state.pageBackgrounds[String(i)] = { imageId: cfg.imageId, opacity: cfg.opacity };
      }
      this.setToolStatus(`已将第 ${sourcePageNo} 页背景应用到全部 ${total} 页`);
      this.closePageBackgroundPanel();
      this.render();
    }

    selectExportPage(index) {
      if (!Number.isInteger(index) || index < 0 || index >= this.canvases.length) return;
      this.selectedExportIndex = index;
      this.updateExportSelectionUI();
    }

    updateExportSelectionUI() {
      const selected = this.selectedExportIndex;
      this.preview?.querySelectorAll('.body-page-frame').forEach((frame) => {
        const index = Number(frame.dataset.exportIndex);
        const isSelected = index === selected;
        frame.classList.toggle('is-export-selected', isSelected);
        const button = frame.querySelector('.body-page-select-btn');
        if (button) {
          button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          button.textContent = isSelected ? `已选第 ${index + 1} 张` : `选择第 ${index + 1} 张`;
        }
      });
      if (this.singleExportBtn) {
        this.singleExportBtn.disabled = this.exporting || !Number.isInteger(selected);
        this.singleExportBtn.setAttribute('aria-label', Number.isInteger(selected) ? `单张导出第 ${selected + 1} 张` : '请先选择一张图片');
      }
      if (this.previewSummary) {
        this.previewSummary.textContent = !this.canvases.length
          ? '暂无可预览的正文图片'
          : Number.isInteger(selected)
          ? `共 ${this.canvases.length} 张 · 已选择第 ${selected + 1} 张`
          : `共 ${this.canvases.length} 张 · 点击图片选择单张导出`;
      }
    }

    setExporting(exporting) {
      this.exporting = exporting;
      const batchBtn = document.getElementById('exportBtn');
      if (batchBtn && document.body.classList.contains('mode-body')) batchBtn.disabled = exporting;
      this.updateExportSelectionUI();
    }

    async prepareExport() {
      // 导出前确保字体已加载并据此重渲染，避免导出 fallback 字体版本
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (_) { /* ignore */ }
        await this._render();
      }
      return this.canvases.length > 0;
    }

    downloadCanvas(index, stamp = Date.now()) {
      const cvs = this.canvases[index];
      if (!cvs) return false;
      const a = document.createElement('a');
      a.download = `正文_${index + 1}_${stamp}.png`;
      a.href = cvs.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    }

    async exportSelected() {
      if (this.exporting || !Number.isInteger(this.selectedExportIndex)) {
        if (!this.exporting) this.setToolStatus('请先在预览区选择一张图片');
        return;
      }
      this.setExporting(true);
      try {
        if (!await this.prepareExport()) return;
        const index = this.selectedExportIndex;
        if (!Number.isInteger(index) || !this.downloadCanvas(index)) {
          this.setToolStatus('所选图片已不存在，请重新选择', 'error');
          return;
        }
        this.setToolStatus(`已导出第 ${index + 1} 张图片`);
      } catch (err) {
        this.setToolStatus(`单张导出失败: ${err.message || err}`, 'error');
      } finally {
        this.setExporting(false);
      }
    }

    async exportAll() {
      if (this.exporting) return;
      this.setExporting(true);
      try {
        if (!await this.prepareExport()) return;
        // 逐个间隔触发下载：浏览器对短时间内多个自动下载有拦截/限流，
        // 同步连续 click 会导致页数多时只有前几张成功。
        const stamp = Date.now();
        let savedCount = 0;
        const failedPages = [];
        for (let index = 0; index < this.canvases.length; index += 1) {
          try {
            if (this.downloadCanvas(index, stamp)) savedCount += 1;
          } catch (_) {
            failedPages.push(index + 1);
          }
          if (index < this.canvases.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
        if (failedPages.length) {
          this.setToolStatus(`已导出 ${savedCount} 张；第 ${failedPages.join('、')} 张失败`, 'error');
        } else {
          this.setToolStatus(`已批量导出 ${savedCount} 张图片`);
        }
      } catch (err) {
        this.setToolStatus(`批量导出失败: ${err.message || err}`, 'error');
      } finally {
        this.setExporting(false);
      }
    }

    /** 从历史数据恢复正文编辑器状态 */
    loadStateData(data) {
      this.state = normalizeStoredBodyState(data);
      if (this.textarea) {
        this.textarea.value = this.state.content;
      }
      this.imageCache = new Map();
      this.lastFindIndex = -1;
      this.resetTextHistory();
      this.render();
      this.saveState({ silent: true });
    }

    /** 重置为默认状态（新建正文） */
    reset() {
      this.loadStateData(defaultBodyState());
      this.setToolStatus('已创建新正文');
    }

    /** 获取正文内容的首行作为标题 */
    getTitle() {
      const content = this.textarea ? this.textarea.value : this.state.content;
      const firstLine = String(content || '').split('\n').find((l) => l.trim()) || '正文';
      return firstLine.replace(/^#+\s*/, '').trim().slice(0, 30) || '正文';
    }

    /** 获取第一页的缩略图 dataURL */
    getThumbnail() {
      if (!this.canvases.length) return null;
      try {
        const src = this.canvases[0];
        const thumb = document.createElement('canvas');
        thumb.width = 108;
        thumb.height = 144;
        const ctx = thumb.getContext('2d');
        ctx.drawImage(src, 0, 0, 108, 144);
        return thumb.toDataURL('image/jpeg', 0.5);
      } catch (_) {
        return null;
      }
    }

    /** 检查正文是否有实际内容（非默认模板） */
    hasContent() {
      const content = this.textarea ? this.textarea.value : this.state.content;
      const text = String(content || '').trim();
      return text.length > 0 && text !== defaultMarkdown.trim();
    }
  }

  // ===== Tab 切换 =====
  let bodyEditor = null;

  function setMode(mode) {
    const isBody = mode === 'body';
    if (!isBody && bodyEditor) bodyEditor.closePageBackgroundPanel();
    document.body.classList.toggle('mode-body', isBody);
    document.querySelector('.workspace').dataset.mode = mode;

    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === mode);
      tab.setAttribute('aria-current', tab.dataset.tab === mode ? 'page' : 'false');
    });

    const exportBtn = document.getElementById('exportBtn');
    exportBtn.innerHTML = isBody
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15V3m0 0L8 7m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>批量导出'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15V3m0 0L8 7m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>导出 PNG';

    if (isBody && !bodyEditor) {
      bodyEditor = new BodyEditor();
    }
  }

  document.getElementById('exportBtn').addEventListener('click', (e) => {
    if (document.body.classList.contains('mode-body')) {
      e.preventDefault();
      if (bodyEditor) bodyEditor.exportAll();
    }
  });

  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      setMode(tab.dataset.tab);
    });
  });

  window.setMode = setMode;
  window.getBodyEditor = () => bodyEditor;
})();
