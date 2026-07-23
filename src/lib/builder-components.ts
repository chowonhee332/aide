import type { BuilderDevice, ComponentDefinition } from './builder-types';
import { KTDS_COMMON_COMPONENTS } from './ktds-playground-components';

export type {
  ComponentCategory,
  BuilderDevice,
  ComponentDefinition,
  ComponentSource,
  PropSchema,
  PropType,
} from './builder-types';

/**
 * Playground has one source of truth: the KTDS Storybook-backed catalog.
 * Keep this export so the builder remains independent from catalog storage.
 */
export const COMPONENT_DEFINITIONS: ComponentDefinition[] = KTDS_COMMON_COMPONENTS;

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
  layout: '레이아웃',
  navigation: '내비게이션',
  action: '버튼/액션',
  input: '입력',
  selection: '선택',
  content: '콘텐츠',
  data: '데이터',
  feedback: '안내/상태',
  overlay: '오버레이',
};
