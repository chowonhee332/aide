import { notFound } from 'next/navigation'
import {
  ComponentDetailPage,
  ComponentsOverviewPage,
  GenericSectionPage,
  ProgressBoardPage,
} from '@/components/aide-docs/DocsPage'
import { allComponents, DOCS_SECTION_IDS, sectionNavigation } from '@/lib/aide-docs'

export function generateStaticParams() {
  const genericSections = DOCS_SECTION_IDS.filter((id) => id !== 'components')
  return [
    { slug: ['components'] },
    { slug: ['components', 'progress-board'] },
    ...allComponents().map((component) => ({ slug: ['components', component.id] })),
    ...genericSections.flatMap((sectionId) => [
      { slug: [sectionId] },
      ...sectionNavigation(sectionId).map((item) => ({ slug: [sectionId, item.id] })),
    ]),
  ]
}

export default async function AideDocsRoute({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const [sectionId, pageId] = slug

  if (!DOCS_SECTION_IDS.includes(sectionId)) notFound()

  if (sectionId === 'components') {
    if (!pageId) return <ComponentsOverviewPage/>
    if (pageId === 'progress-board') return <ProgressBoardPage/>
    if (allComponents().some((component) => component.id === pageId)) return <ComponentDetailPage componentId={pageId}/>
    notFound()
  }

  if (!pageId) return <GenericSectionPage sectionId={sectionId} pageId={sectionNavigation(sectionId)[0]?.id ?? 'overview'}/>
  if (!sectionNavigation(sectionId).some((item) => item.id === pageId)) notFound()
  return <GenericSectionPage sectionId={sectionId} pageId={pageId}/>
}
