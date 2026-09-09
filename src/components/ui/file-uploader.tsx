"use client"

import * as React from "react"
import { FileInput } from "@astryxdesign/core/FileInput"

/**
 * `file-uploader` from the aide.md `component_registry`, rendered by Astryx `FileInput`,
 * which owns the drop zone, the selected-file rows and their remove buttons.
 *
 * Callers pass already-attached files as display names (the docs specimens show a
 * populated uploader without a real upload), while Astryx is a controlled component
 * over real `File` objects. Empty placeholder `File`s carry those names across, which
 * keeps every call site unchanged; a caller doing a real upload passes none and the
 * component behaves as a normal controlled input.
 */
function FileUploader({
  label,
  hint = "파일을 끌어다 놓거나 선택하세요",
  accept = "이미지, PDF · 최대 10MB",
  files: initial = [],
  disabled,
  className,
}: {
  label: string
  hint?: string
  accept?: string
  files?: string[]
  disabled?: boolean
  className?: string
}) {
  const [files, setFiles] = React.useState<File[]>(() => initial.map((name) => new File([], name)))

  return (
    <div className={className}>
      <FileInput
        label={label}
        description={accept}
        placeholder={hint}
        isMultiple
        isDisabled={disabled}
        value={files}
        onChange={(next: File | File[] | null) =>
          setFiles(next === null ? [] : Array.isArray(next) ? next : [next])
        }
      />
    </div>
  )
}
export { FileUploader }
