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

// The viewport toggle (SegmentedControl) must switch platform, not only resize.
const viewportToggle = studio.match(/label="플랫폼"\s+size="sm"\s+value=\{platform\}\s+onChange=\{[\s\S]{0,400}?SegmentedControlItem value="web"/);
if (!viewportToggle || !viewportToggle[0].includes("setPlatform('mobile')") || !viewportToggle[0].includes("setPlatform('web')")) {
  failures.push('The viewport toggle must set platform to mobile/web, not only preview width.');
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('Studio generation contract checks passed.');
