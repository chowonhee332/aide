import type { BuilderDevice, ComponentDefinition } from './builder-types';
import { ASTRYX_PLAYGROUND_COMPONENTS } from './astryx-playground-components';

export type {
  ComponentCategory,
  BuilderDevice,
  ComponentDefinition,
  ComponentSource,
  PropSchema,
  PropType,
} from './builder-types';

/**
 * Playground builds on the Astryx (@astryxdesign/core) component catalog.
 * The registry is a list so a future DESIGN.md adapter can add another catalog
 * without changing BuilderView.
 */
export interface BuilderDesignSystemCatalog {
  id: string;
  name: string;
  contractFiles: string[];
  components: ComponentDefinition[];
}

export const BUILDER_DESIGN_SYSTEM_CATALOGS: Record<string, BuilderDesignSystemCatalog> = {
  astryx: {
    id: 'astryx',
    name: 'Astryx',
    contractFiles: ['@astryxdesign/core'],
    components: ASTRYX_PLAYGROUND_COMPONENTS,
  },
};

export type DesignSystemId = keyof typeof BUILDER_DESIGN_SYSTEM_CATALOGS;

export const DESIGN_SYSTEM_OPTIONS = Object.values(BUILDER_DESIGN_SYSTEM_CATALOGS).map((catalog) => ({
  value: catalog.id,
  label: catalog.name,
}));

export const ACTIVE_DESIGN_SYSTEM = BUILDER_DESIGN_SYSTEM_CATALOGS.astryx;

/** Active Playground catalog — also consumed by the /api/playground-compose planner. */
export const COMPONENT_DEFINITIONS: ComponentDefinition[] = ACTIVE_DESIGN_SYSTEM.components;

/** Every catalog's components — canvas items may belong to any active design system. */
export const ALL_BUILDER_COMPONENTS: ComponentDefinition[] = Object.values(BUILDER_DESIGN_SYSTEM_CATALOGS)
  .flatMap((catalog) => catalog.components);

export function componentsForDesignSystem(id: string): ComponentDefinition[] {
  return (BUILDER_DESIGN_SYSTEM_CATALOGS[id] ?? ACTIVE_DESIGN_SYSTEM).components;
}

export function getComponentById(id: string): ComponentDefinition | undefined {
  return ALL_BUILDER_COMPONENTS.find((component) => component.id === id);
}

export function supportsDevice(component: ComponentDefinition, device: BuilderDevice): boolean {
  return component.supportedDevices?.includes(device) ?? true;
}

export function getComponentPropsForDevice(
  component: ComponentDefinition,
  device: BuilderDevice,
): Record<string, string> {
  return {
    ...component.defaultProps,
    ...component.deviceDefaults?.[device],
  };
}

export const CATEGORY_LABELS: Record<string, string> = {
  layout: '레이아웃',
  navigation: '내비게이션',
  action: '버튼/액션',
  input: '입력',
  selection: '선택',
  content: '콘텐츠',
  data: '데이터',
  feedback: '안내/상태',
  overlay: '오버레이',
};
