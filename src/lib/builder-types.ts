export type BuilderDevice = 'mobile' | 'desktop';

export type PropType = 'text' | 'number' | 'color' | 'select' | 'textarea';

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
  designSystem?: string;
  category: ComponentCategory;
  description?: string;
  source?: ComponentSource;
  canvasBehavior?: 'stack' | 'full-width' | 'fixed-bottom' | 'modal';
  supportedDevices?: BuilderDevice[];
  deviceDefaults?: Partial<Record<BuilderDevice, Record<string, string>>>;
  responsiveMapping?: Partial<Record<BuilderDevice, string>>;
  defaultProps: Record<string, string>;
  propSchema: PropSchema[];
  /** Export-only serializer. Interactive previews use the canonical React registry. */
  renderHTML: (props: Record<string, string>) => string;
}
