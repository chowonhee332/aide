import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gemini = fs.readFileSync(path.join(root, 'src/lib/gemini.ts'), 'utf8');
const studio = fs.readFileSync(path.join(root, 'src/components/StudioView.tsx'), 'utf8');

const failures = [];

if (gemini.includes('injectMobilePhoneFrame(')) {
  failures.push('Generated HTML must not be wrapped with an injected phone/device mockup.');
}

if (!gemini.includes('width:390px') || !gemini.includes('width:100%; max-width:...; margin:auto;')) {
  failures.push('Generated HTML contract must reject fixed-width device-shell layouts.');
}

if (!gemini.includes('**브레이크포인트**') || !gemini.includes('내비게이션 3종 세트 패턴')) {
  failures.push('Generated HTML contract must include responsive breakpoint/navigation rules.');
}

if (gemini.includes('const variantStructure = hasCanvasDirection')) {
  failures.push('DesignDirection must not disable UIStructureIR and its deterministic quality gates.');
}

const appButton = studio.match(/onClick=\{\(\) => \{[^}]*\}\}\s*className=[\s\S]{0,400}>\s*앱\s*<\/button>/);
if (!appButton || !appButton[0].includes("setPlatform('mobile')")) {
  failures.push('The 앱 viewport button must set platform to mobile, not only preview width.');
}

const webButton = studio.match(/onClick=\{\(\) => \{[^}]*\}\}\s*className=[\s\S]{0,400}>\s*웹\s*<\/button>/);
if (!webButton || !webButton[0].includes("setPlatform('web')")) {
  failures.push('The 웹 viewport button must set platform to web, not only preview width.');
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('Studio generation contract checks passed.');
