import * as React from 'react'
import { cn } from '@/lib/utils'

export interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number | string
  strokeWidth?: number | string
  fill?: string
}

const MaterialIcon = React.forwardRef<HTMLSpanElement, MaterialIconProps & { name: string }>(function MaterialIcon(
  {
    name,
    size = 24,
    className,
    style,
    fill,
    strokeWidth: _strokeWidth,
    children: _children,
    'aria-label': ariaLabel,
    'aria-hidden': ariaHidden,
    ...props
  },
  ref,
) {
  void _strokeWidth
  void _children

  return <span
    ref={ref}
    data-slot="material-icon"
    className={cn('material-symbols-rounded inline-block shrink-0 select-none align-middle leading-none', className)}
    aria-label={ariaLabel}
    aria-hidden={ariaLabel ? ariaHidden : (ariaHidden ?? true)}
    style={{
      fontFamily: '"Material Symbols Rounded"',
      fontStyle: 'normal',
      fontWeight: 'normal',
      fontSize: typeof size === 'number' ? `${size}px` : size,
      letterSpacing: 'normal',
      textTransform: 'none',
      whiteSpace: 'nowrap',
      wordWrap: 'normal',
      direction: 'ltr',
      fontVariationSettings: `'FILL' ${fill && fill !== 'none' ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      WebkitFontFeatureSettings: '"liga"',
      WebkitFontSmoothing: 'antialiased',
      ...style,
    }}
    {...props}
  >{name}</span>
})
MaterialIcon.displayName = 'MaterialIcon'

function icon(name: string) {
  const Icon = React.forwardRef<HTMLSpanElement, MaterialIconProps>((props, ref) => <MaterialIcon ref={ref} name={name} {...props}/>)
  Icon.displayName = `MaterialIcon(${name})`
  return Icon
}

export { MaterialIcon }
export const AlertCircle = icon('error')
export const ArrowLeft = icon('arrow_back')
export const ArrowRight = icon('arrow_forward')
export const ArrowUp = icon('arrow_upward')
export const Bell = icon('notifications')
export const Check = icon('check')
export const CheckCircle2 = icon('check_circle')
export const ChevronDown = icon('expand_more')
export const ChevronRight = icon('chevron_right')
export const Clock = icon('schedule')
export const Clock3 = icon('schedule')
export const Coins = icon('paid')
export const CornerUpLeft = icon('undo')
export const CornerUpRight = icon('redo')
export const Delete = icon('backspace')
export const Download = icon('download')
export const ExternalLink = icon('open_in_new')
export const Eye = icon('visibility')
export const EyeOff = icon('visibility_off')
export const FileText = icon('description')
export const Focus = icon('center_focus_strong')
export const Hand = icon('pan_tool')
export const Image = icon('image')
export const Info = icon('info')
export const KeyRound = icon('key')
export const LayoutTemplate = icon('dashboard')
export const Link2 = icon('link')
export const LoaderCircle = icon('progress_activity')
export const Maximize2 = icon('fullscreen')
export const Menu = icon('menu')
export const Minus = icon('remove')
export const Monitor = icon('desktop_windows')
export const Moon = icon('dark_mode')
export const MoreHorizontal = icon('more_horiz')
export const Palette = icon('palette')
export const PanelLeft = icon('left_panel_open')
export const PanelsTopLeft = icon('dashboard_customize')
export const Pencil = icon('edit')
export const Plus = icon('add')
export const RefreshCw = icon('refresh')
export const Rows3 = icon('view_agenda')
export const Search = icon('search')
export const Send = icon('send')
export const Settings = icon('settings')
export const Shapes = icon('category')
export const Share2 = icon('share')
export const SlidersHorizontal = icon('tune')
export const Smartphone = icon('smartphone')
export const Sparkles = icon('auto_awesome')
export const Star = icon('star')
export const Sun = icon('light_mode')
export const Trash2 = icon('delete')
export const TriangleAlert = icon('warning')
export const Upload = icon('upload')
export const User = icon('person')
export const X = icon('close')
export const Zap = icon('bolt')
export const ZoomIn = icon('zoom_in')
export const ZoomOut = icon('zoom_out')
