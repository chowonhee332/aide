import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gemini = fs.readFileSync(path.join(root, 'src/lib/gemini.ts'), 'utf8');
const studio = fs.readFileSync(path.join(root, 'src/app/studio/page.tsx'), 'utf8');

const failures = [];

if (gemini.includes('injectMobilePhoneFrame(')) {
  failures.push('Generated HTML must not be wrapped with an injected phone/device mockup.');
}

if (!gemini.includes('Device mockup shell detected')) {
  failures.push('Generated HTML contract must detect model-authored phone/device mockup shells.');
}

if (!gemini.includes('Responsive layout contract failed')) {
  failures.push('Generated HTML contract must detect missing mobile/tablet/desktop responsive rules.');
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
