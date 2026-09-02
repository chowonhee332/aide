import { ASTRYX_TEMPLATE_INDEX } from './design-systems/generated/astryx-templates/astryx-templates.index';

/**
 * Vendored @astryxdesign/core page templates (scripts/generate-astryx-templates.mjs
 * + scripts/compile-astryx-templates.mjs). The Playground template picker lists
 * these; every one drops as a single frozen block that renders the real Astryx
 * page component verbatim, sized to the target frame.
 */

export interface AstryxTemplateEntry {
  id: string;
  name: string;
  description: string;
  /** "Group - Subtype" from the Astryx CLI. */
  category: string;
}

export const ASTRYX_TEMPLATES = ASTRYX_TEMPLATE_INDEX as unknown as AstryxTemplateEntry[];

export const ASTRYX_TEMPLATES_BY_ID: Record<string, AstryxTemplateEntry> = Object.fromEntries(
  ASTRYX_TEMPLATES.map((template) => [template.id, template]),
);

/** Left segment of "Group - Subtype", for picker grouping. */
export function astryxTemplateGroup(category: string): string {
  return category.split(' - ')[0]?.trim() || 'Other';
}
