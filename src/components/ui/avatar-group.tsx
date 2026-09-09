import { Avatar } from "@astryxdesign/core/Avatar"
import { AvatarGroup as AstryxAvatarGroup, AvatarGroupOverflow } from "@astryxdesign/core/AvatarGroup"

/**
 * `avatar-group` from the aide.md `component_registry`, rendered by Astryx.
 *
 * The `names` array API is kept so callers do not change. Astryx owns the overlap,
 * the ring against the surface and the "+N" overflow slot, which this component
 * used to build from negative margins and ring utilities.
 */
function AvatarGroup({
  names,
  max = 4,
  className,
}: {
  names: string[]
  max?: number
  className?: string
}) {
  const shown = names.slice(0, max)
  const overflow = names.length - shown.length
  return (
    <div className={className}>
      <AstryxAvatarGroup>
        {shown.map((name) => (
          <Avatar key={name} name={name} />
        ))}
        {overflow > 0 ? <AvatarGroupOverflow count={overflow} /> : null}
      </AstryxAvatarGroup>
    </div>
  )
}
export { AvatarGroup }
