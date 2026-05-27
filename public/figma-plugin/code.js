// Aide UI to Figma Plugin — code.js (v2)
figma.showUI(__html__, { width: 480, height: 540, title: 'Aide — UI to Figma' });

figma.ui.onmessage = async function (msg) {
  if (msg.type === 'import') {
    try {
      var data = msg.data;
      var screens = data.screens || [];
      var page = figma.currentPage;
      var createdFrames = [];
      var gap = 60;

      for (var i = 0; i < screens.length; i++) {
        var screen = screens[i];
        var frameW = screen.width > 0 ? screen.width : 390;
        var frameH = screen.height > 0 ? screen.height : 844;

        var screenFrame = figma.createFrame();
        screenFrame.name = screen.label || 'Screen ' + (i + 1);
        screenFrame.resize(frameW, frameH);
        screenFrame.x = i * (frameW + gap);
        screenFrame.y = 0;
        screenFrame.fills = [];
        screenFrame.clipsContent = true;

        if (screen.domTree) {
          figma.notify('레이어 구성 중... (' + (i + 1) + '/' + screens.length + ')');
          await buildFigmaLayers(screen.domTree, screenFrame, frameW, frameH);
        } else if (screen.imageBase64) {
          var b64 = screen.imageBase64;
          var binary = atob(b64);
          var bytes = new Uint8Array(binary.length);
          for (var j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
          var image = figma.createImage(bytes);
          screenFrame.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL', opacity: 1 }];
        }

        page.appendChild(screenFrame);
        createdFrames.push(screenFrame);
      }

      if (createdFrames.length > 0) figma.viewport.scrollAndZoomIntoView(createdFrames);
      figma.notify('✅ ' + screens.length + '개 화면 임포트 완료!');
      figma.closePlugin();
    } catch (err) {
      figma.notify('오류: ' + (err.message || String(err)), { error: true });
    }
  }

  if (msg.type === 'cancel') figma.closePlugin();
};

// ── 색상 파싱 ────────────────────────────────────────────────────────────────

function parseColor(css) {
  if (!css || css === 'transparent') return null;
  var m = css.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!m) return null;
  var a = m[4] !== undefined ? parseFloat(m[4]) : 1;
  if (a < 0.01) return null;
  return { r: parseInt(m[1]) / 255, g: parseInt(m[2]) / 255, b: parseInt(m[3]) / 255, a: a };
}

function solidFill(color) {
  return [{ type: 'SOLID', color: { r: color.r, g: color.g, b: color.b }, opacity: color.a }];
}

// ── 폰트 매핑 ────────────────────────────────────────────────────────────────

var FONT_FALLBACK_MAP = {
  'Pretendard': 'Noto Sans KR',
  'Pretendard Variable': 'Noto Sans KR',
  '-apple-system': 'Inter',
  'BlinkMacSystemFont': 'Inter',
  'system-ui': 'Inter',
  'sans-serif': 'Inter',
  'serif': 'Georgia',
};

function normalizeFontFamily(family) {
  return FONT_FALLBACK_MAP[family] || family || 'Inter';
}

function weightToStyle(weight, isItalic) {
  var w = parseInt(weight) || 400;
  var base;
  if (w >= 900) base = 'Black';
  else if (w >= 800) base = 'ExtraBold';
  else if (w >= 700) base = 'Bold';
  else if (w >= 600) base = 'SemiBold';
  else if (w >= 500) base = 'Medium';
  else if (w >= 300) base = 'Regular';
  else if (w >= 200) base = 'ExtraLight';
  else base = 'Thin';
  return isItalic ? base + ' Italic' : base;
}

// 실패 시 차례로 대체 시도하는 폰트 로더
async function safeLoadFont(family, style) {
  var bold = style.indexOf('Bold') >= 0;
  var candidates = [
    { family: family, style: style },
    { family: family, style: bold ? 'Bold' : 'Regular' },
    { family: 'Noto Sans KR', style: bold ? 'Bold' : 'Regular' },
    { family: 'Inter', style: bold ? 'Bold' : 'Regular' },
    { family: 'Inter', style: 'Regular' },
  ];
  for (var i = 0; i < candidates.length; i++) {
    try {
      await figma.loadFontAsync(candidates[i]);
      return candidates[i];
    } catch (e) { /* 다음 후보 */ }
  }
  return { family: 'Inter', style: 'Regular' };
}

// ── 폰트 사전 수집 및 일괄 로드 ─────────────────────────────────────────────

function collectFontKeys(node, keys) {
  var s = node.styles || {};
  var family = normalizeFontFamily(s.fontFamily);
  var style = weightToStyle(s.fontWeight, s.fontStyle === 'italic');
  keys[family + '|' + style] = { family: family, style: style };
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) collectFontKeys(children[i], keys);
}

async function preloadAllFonts(domTree) {
  var keys = {};
  collectFontKeys(domTree, keys);
  var loaded = {};
  var keyList = Object.keys(keys);
  for (var i = 0; i < keyList.length; i++) {
    var k = keyList[i];
    var req = keys[k];
    var resolved = await safeLoadFont(req.family, req.style);
    loaded[k] = resolved;
  }
  return loaded;
}

// ── DOM → Figma 레이어 빌더 ──────────────────────────────────────────────────

function px(val) { return parseFloat(val) || 0; }

// 텍스트 리프 노드로 취급할 태그
var TEXT_TAGS = {
  p: 1, span: 1, a: 1, em: 1, strong: 1, b: 1, i: 1, small: 1,
  h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1,
  label: 1, td: 1, th: 1, li: 1, dt: 1, dd: 1, time: 1
};

async function buildFigmaLayers(domTree, screenFrame, frameW, frameH) {
  var loadedFonts = await preloadAllFonts(domTree);
  await buildNode(domTree, screenFrame, domTree.x, domTree.y, loadedFonts, frameW, frameH);
}

async function buildNode(node, parentFigmaNode, parentX, parentY, loadedFonts, maxW, maxH) {
  var relX = node.x - parentX;
  var relY = node.y - parentY;
  var w = Math.max(node.width, 1);
  var h = Math.max(node.height, 1);

  // 프레임 경계를 크게 벗어난 노드 스킵
  if (relX > maxW + 40 || relY > maxH + 40 || relX + w < -40 || relY + h < -40) return;

  var s = node.styles || {};
  var hasText = node.text && node.text.length > 0;
  var hasChildren = node.children && node.children.length > 0;
  var isLeafText = hasText && !hasChildren && TEXT_TAGS[node.tag];

  if (isLeafText) {
    // ── 텍스트 리프 노드 ──
    var textNode = figma.createText();
    textNode.name = node.text.substring(0, 40);
    textNode.x = relX;
    textNode.y = relY;

    var family = normalizeFontFamily(s.fontFamily);
    var style = weightToStyle(s.fontWeight, s.fontStyle === 'italic');
    var fontInfo = loadedFonts[family + '|' + style] || { family: 'Inter', style: 'Regular' };
    textNode.fontName = fontInfo;
    textNode.fontSize = Math.max(px(s.fontSize), 8);

    // 너비 고정, 높이 자동
    textNode.textAutoResize = 'HEIGHT';
    textNode.resize(Math.max(w, 8), Math.max(h, 16));

    try { textNode.characters = node.text; } catch (e) { textNode.characters = ''; }

    var textColor = parseColor(s.color);
    if (textColor) textNode.fills = solidFill(textColor);

    var opacity = parseFloat(s.opacity);
    if (!isNaN(opacity) && opacity < 1) textNode.opacity = opacity;

    parentFigmaNode.appendChild(textNode);
    return;
  }

  // ── 프레임 노드 ──
  var frame = figma.createFrame();
  frame.name = node.tag + (hasText ? ': ' + node.text.substring(0, 24) : '');
  frame.x = relX;
  frame.y = relY;
  frame.resize(w, h);

  var bgColor = parseColor(s.backgroundColor);
  frame.fills = bgColor ? solidFill(bgColor) : [];

  // 테두리 반경
  var maxRadius = Math.min(w, h) / 2;
  var tl = Math.min(px(s.borderTopLeftRadius), maxRadius);
  var tr = Math.min(px(s.borderTopRightRadius), maxRadius);
  var bl = Math.min(px(s.borderBottomLeftRadius), maxRadius);
  var br = Math.min(px(s.borderBottomRightRadius), maxRadius);
  if (tl === tr && tr === bl && bl === br) {
    frame.cornerRadius = tl;
  } else {
    frame.topLeftRadius = tl;
    frame.topRightRadius = tr;
    frame.bottomLeftRadius = bl;
    frame.bottomRightRadius = br;
  }

  frame.clipsContent = s.overflow === 'hidden';

  var nodeOpacity = parseFloat(s.opacity);
  if (!isNaN(nodeOpacity) && nodeOpacity < 1) frame.opacity = nodeOpacity;

  // 테두리
  var borderColor = parseColor(s.borderColor);
  var borderWidth = px(s.borderWidth);
  if (borderColor && borderWidth > 0 && s.borderStyle !== 'none') {
    frame.strokes = solidFill(borderColor);
    frame.strokeWeight = borderWidth;
    frame.strokeAlign = 'INSIDE';
  }

  parentFigmaNode.appendChild(frame);

  // 직접 텍스트가 있으면 자식 텍스트 노드로 추가
  if (hasText) {
    var tc = figma.createText();
    tc.name = node.text.substring(0, 40);
    tc.x = 0;
    tc.y = 0;

    var tcFamily = normalizeFontFamily(s.fontFamily);
    var tcStyle = weightToStyle(s.fontWeight, s.fontStyle === 'italic');
    var tcFont = loadedFonts[tcFamily + '|' + tcStyle] || { family: 'Inter', style: 'Regular' };
    tc.fontName = tcFont;
    tc.fontSize = Math.max(px(s.fontSize), 8);
    tc.textAutoResize = 'WIDTH_AND_HEIGHT';

    try { tc.characters = node.text; } catch (e) { tc.characters = ''; }

    var tcColor = parseColor(s.color);
    if (tcColor) tc.fills = solidFill(tcColor);

    frame.appendChild(tc);
  }

  // 자식 노드 재귀 처리
  var children = node.children || [];
  for (var ci = 0; ci < children.length; ci++) {
    await buildNode(children[ci], frame, node.x, node.y, loadedFonts, w, h);
  }
}
