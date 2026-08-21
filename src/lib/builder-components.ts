import type { BuilderDevice, ComponentDefinition } from './builder-types';
import { WONHEE_PLAYGROUND_COMPONENTS } from './wonhee-playground-components';

export type {
  ComponentCategory,
  BuilderDevice,
  ComponentDefinition,
  ComponentSource,
  PropSchema,
  PropType,
} from './builder-types';

/**
 * Playground renders the same Wonhee component registry documented by /aide-ui.
 * A future DESIGN.md adapter can replace this catalog without changing BuilderView.
 */
export interface BuilderDesignSystemCatalog {
  id: string;
  name: string;
  contractFiles: string[];
  components: ComponentDefinition[];
}

export const BUILDER_DESIGN_SYSTEM_CATALOGS: Record<string, BuilderDesignSystemCatalog> = {
  wonhee: {
    id: 'wonhee',
    name: 'Wonhee UI',
    contractFiles: ['wonhee-design.md', 'wonhee-product-ui.md'],
    components: WONHEE_PLAYGROUND_COMPONENTS,
  },
};

export const ACTIVE_DESIGN_SYSTEM = BUILDER_DESIGN_SYSTEM_CATALOGS.wonhee;
export const COMPONENT_DEFINITIONS: ComponentDefinition[] = ACTIVE_DESIGN_SYSTEM.components;

export function getComponentById(id: string): ComponentDefinition | undefined {
  return COMPONENT_DEFINITIONS.find((component) => component.id === id);
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
