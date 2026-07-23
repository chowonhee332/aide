import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORYBOOK_BASE_URL = 'https://dscore-ui.ktds.co.kr';
const OUT_DIR = path.join(process.cwd(), 'src/lib/design-systems/ktds-refs');
const OUT_FILE = path.join(OUT_DIR, 'storybook-code-sources.json');

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function parseDepsFromIframe(iframeBundle) {
  const match = iframeBundle.match(/m\.f\|\|\(m\.f=\[(.*?)\]\)/s);

  if (!match) {
    throw new Error('Could not find Storybook dependency map in iframe bundle.');
  }

  return Array.from(match[1].matchAll(/"([^"]+)"/g)).map(([, dep]) => dep);
}

function slugFromImportPath(importPath) {
  const match = importPath.match(/\/([^/.]+)(?:\.stories\.[jt]sx?|\.mdx)$/);
  return match?.[1] ?? null;
}

function findBundle(deps, importPath, kind) {
  const slug = slugFromImportPath(importPath);

  if (!slug) {
    return null;
  }

  const suffix = kind === 'stories' ? '.stories-' : '-';
  return deps.find((dep) => dep.startsWith(`./${slug}${suffix}`) && dep.endsWith('.js')) ?? null;
}

function extractOriginalSources(bundleText) {
  return Array.from(bundleText.matchAll(/originalSource:`([\s\S]*?)`,\.\.\./g)).map(([, source]) =>
    source.replaceAll('\\r\\n', '\n').replaceAll('\\n', '\n').replaceAll('\\`', '`'),
  );
}

function extractImportsFromMdx(bundleText) {
  return unique(
    Array.from(bundleText.matchAll(/code:"(import \{[^"]+?@ktds-ui\/components';)"/g)).map(([, code]) =>
      code.replaceAll('\\"', '"'),
    ),
  );
}

function extractNamedExports(bundleText) {
  const match = bundleText.match(/__namedExportsOrder:\s*([A-Za-z0-9_$]+)/);

  if (!match) {
    const arrayMatch = bundleText.match(/const\s+[A-Za-z0-9_$]+\s*=\s*\[([^\]]+)\]/);
    return arrayMatch ? Array.from(arrayMatch[1].matchAll(/"([^"]+)"/g)).map(([, name]) => name) : [];
  }

  const variableName = match[1];
  const variablePattern = new RegExp(`const\\s+${variableName}\\s*=\\s*\\[([^\\]]+)\\]`);
  const variableMatch = bundleText.match(variablePattern);
  return variableMatch ? Array.from(variableMatch[1].matchAll(/"([^"]+)"/g)).map(([, name]) => name) : [];
}

function groupStories(entries) {
  const groups = new Map();

  for (const entry of Object.values(entries)) {
    if (entry.type !== 'story' || entry.componentPath !== '@ktds-ui/components') {
      continue;
    }

    if (!entry.tags?.includes('stable')) {
      continue;
    }

    const group = groups.get(entry.title) ?? {
      title: entry.title,
      componentPath: entry.componentPath,
      importPath: entry.importPath,
      storyIds: [],
      stories: [],
    };

    group.storyIds.push(entry.id);
    group.stories.push({ id: entry.id, name: entry.name });
    groups.set(entry.title, group);
  }

  return Array.from(groups.values()).sort((a, b) => a.title.localeCompare(b.title));
}

async function main() {
  const index = JSON.parse(await fetchText(`${STORYBOOK_BASE_URL}/index.json`));
  const iframeHtml = await fetchText(`${STORYBOOK_BASE_URL}/iframe.html?id=components-button--docs`);
  const iframeAsset = iframeHtml.match(/src="\.\/(assets\/[^"]+\.js)"/)?.[1];

  if (!iframeAsset) {
    throw new Error('Could not find iframe asset script.');
  }

  const iframeBundle = await fetchText(`${STORYBOOK_BASE_URL}/${iframeAsset}`);
  const deps = parseDepsFromIframe(iframeBundle);
  const groups = groupStories(index.entries);

  const components = [];

  for (const group of groups) {
    const storyBundle = findBundle(deps, group.importPath, 'stories');
    const docsEntry = Object.values(index.entries).find(
      (entry) => entry.type === 'docs' && entry.title === group.title && entry.tags?.includes('stable'),
    );
    const docsBundle = docsEntry ? findBundle(deps, docsEntry.importPath, 'docs') : null;
    const storyText = storyBundle ? await fetchText(`${STORYBOOK_BASE_URL}/assets/${storyBundle.replace('./', '')}`) : '';
    const docsText = docsBundle ? await fetchText(`${STORYBOOK_BASE_URL}/assets/${docsBundle.replace('./', '')}`) : '';

    components.push({
      title: group.title,
      componentPath: group.componentPath,
      importPath: group.importPath,
      docsImportPath: docsEntry?.importPath ?? null,
      storyBundle,
      docsBundle,
      storyIds: group.storyIds,
      stories: group.stories,
      namedExports: extractNamedExports(storyText),
      importCode: extractImportsFromMdx(docsText),
      originalSources: extractOriginalSources(storyText),
    });
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    OUT_FILE,
    `${JSON.stringify(
      {
        source: STORYBOOK_BASE_URL,
        generatedAt: new Date().toISOString(),
        componentCount: components.length,
        components,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Extracted ${components.length} KTDS Storybook component sources.`);
  console.log(OUT_FILE);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
