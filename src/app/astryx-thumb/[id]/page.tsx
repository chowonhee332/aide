'use client';

// Bare render surface for one Astryx page template — no Aide chrome — used by
// scripts/capture-astryx-thumbs.mjs to screenshot the panel thumbnails.
// Not linked from the app.

import { use } from 'react';
import { AstryxTemplateFrozen } from '@/components/aide-docs/AstryxTemplateFrozen';
import { ASTRYX_TEMPLATES_BY_ID } from '@/lib/astryx-templates';

export default function AstryxThumbPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const template = ASTRYX_TEMPLATES_BY_ID[id];

  if (!template) {
    return <div style={{ padding: 24, fontFamily: 'system-ui' }}>unknown template: {id}</div>;
  }

  return (
    <div
      data-astryx-thumb-ready="1"
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#ffffff' }}
    >
      <AstryxTemplateFrozen t={id} label={template.name} />
    </div>
  );
}
