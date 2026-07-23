export type BuilderDevice = 'mobile' | 'desktop';

export type PropType = 'text' | 'color' | 'select' | 'textarea';

export type ComponentCategory =
  | 'layout'
  | 'navigation'
  | 'action'
  | 'input'
  | 'selection'
  | 'content'
  | 'data'
  | 'feedback'
  | 'overlay';

export interface PropSchema {
  key: string;
  label: string;
  type: PropType;
  options?: string[];
  group?: 'content' | 'style' | 'state';
  display?: 'default' | 'segmented';
}

export interface ComponentSource {
  storybookTitle: string;
  packageName: string;
  importCode?: string;
  variants?: string[];
}

export interface ComponentDefinition {
  id: string;
  name: string;
  icon: string;
  designSystem?: 'ktds';
  category: ComponentCategory;
  description?: string;
  source?: ComponentSource;
  canvasBehavior?: 'stack' | 'fixed-bottom' | 'modal';
  supportedDevices?: BuilderDevice[];
  deviceDefaults?: Partial<Record<BuilderDevice, Record<string, string>>>;
  responsiveMapping?: Partial<Record<BuilderDevice, string>>;
  defaultProps: Record<string, string>;
  propSchema: PropSchema[];
  renderHTML: (props: Record<string, string>) => string;
}
