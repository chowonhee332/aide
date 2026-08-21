'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Focus,
  LayoutTemplate,
  Monitor,
  PanelLeft,
  PanelsTopLeft,
  Plus,
  RefreshCw,
  Rows3,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from '@/components/ui/material-icon';
import {
  COMPONENT_DEFINITIONS,
  getComponentById,
  getComponentPropsForDevice,
  supportsDevice,
  BuilderDevice,
  ComponentDefinition,
  PropType,
} from '@/lib/builder-components';
import { AIDE_UI, AIDE_UI_RAW } from '@/lib/aide-ui';
import { AUI_ROOT_CSS } from '@/lib/aide-product-tokens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ComponentPreview } from '@/components/aide-docs/ComponentPreview';
import { componentPreviewSize } from '@/lib/aide-docs';
import DotField from '@/components/DotField';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CanvasItem {
  instanceId: string;
  componentId: string;
  region: CanvasRegion;
  props: Record<string, string>;
  hidden?: boolean;
}

type FrameDevice = BuilderDevice;
type CanvasRegion = 'header' | 'navigation' | 'content' | 'main' | 'aside' | 'bottom' | 'overlay';

const REGION_LABELS: Record<CanvasRegion, string> = {
  header: 'Header', navigation: 'Navigation', content: 'Content', main: 'Main Content', aside: 'Aside', bottom: 'Bottom', overlay: 'Overlay',
};

const FRAME_REGIONS: Record<FrameDevice, CanvasRegion[]> = {
  mobile: ['header', 'content', 'bottom', 'overlay'],
  desktop: ['header', 'navigation', 'main', 'aside', 'overlay'],
};

function defaultRegionForComponent(componentId: string, device: FrameDevice): CanvasRegion {
  if (['dialog', 'sheet', 'popover', 'tooltip', 'dropdown-menu', 'toast'].includes(componentId)) return 'overlay';
  if (['bottom-app-bar', 'fixed-bottom-cta'].includes(componentId)) return 'bottom';
  if (['app-header', 'top-navigation', 'global-navigation'].includes(componentId)) return 'header';
  if (device === 'desktop' && ['local-navigation', 'side-navigation', 'navigation'].includes(componentId)) return 'navigation';
  if (device === 'desktop' && ['side-panel'].includes(componentId)) return 'aside';
  return device === 'mobile' ? 'content' : 'main';
}

function allowedRegionsForComponent(componentId: string, device: FrameDevice): CanvasRegion[] {
  const preferred = defaultRegionForComponent(componentId, device);
  return device === 'desktop' && preferred === 'main' ? ['main', 'aside'] : [preferred];
}

interface CanvasFrame {
  id: string;
  name: string;
  device: FrameDevice;
  items: CanvasItem[];
  layout?: 'stack' | 'grid-2' | 'grid-3';
  templateId?: string;
}

interface BuilderViewProps {
  onBack: () => void;
}

// ─── Design Tokens ───────────────────────────────────────────────────────────

const AIDE = {
  bg: AIDE_UI.page,
  surface: AIDE_UI.surface,
  surfaceHover: AIDE_UI.surfaceMuted,
  fill: AIDE_UI.fill,
  fillStrong: AIDE_UI.fillStrong,
  border: AIDE_UI.border,
  text: AIDE_UI.text,
  textMuted: AIDE_UI.textMuted,
  textSubtle: AIDE_UI.textAssistive,
  primary: AIDE_UI.primary,
  primarySoft: AIDE_UI.primarySoft,
};

const FRAME_DIMENSIONS: Record<FrameDevice, { width: number; height: number; label: string; scale: number }> = {
  mobile: { width: 375, height: 812, label: 'Mobile', scale: 1 },
  desktop: { width: 1920, height: 1080, label: 'PC', scale: 1 },
};

interface StructureTemplate {
  id: string;
  device: FrameDevice;
  name: string;
  description: string;
  kind: 'mobile-basic' | 'mobile-nav' | 'mobile-list' | 'gnb' | 'lnb' | 'hybrid' | 'focus';
  items: Array<{ componentId: string; props?: Record<string, string> }>;
}

const STRUCTURE_TEMPLATES: StructureTemplate[] = [
  {
    id: 'mobile-basic',
    device: 'mobile',
    name: '기본 앱 화면',
    description: '내비게이션, 상세 헤더와 카드가 있는 기본 구조',
    kind: 'mobile-basic',
    items: [
      { componentId: 'top-navigation', props: { type: 'root', title: '서비스 홈' } },
      { componentId: 'page-header', props: { title: '페이지 제목', description: '화면에 필요한 정보를 구성하세요.', label: '주요 작업' } },
      { componentId: 'card', props: { title: '콘텐츠 영역', description: '왼쪽 패널에서 컴포넌트를 추가해 화면을 완성하세요.' } },
    ],
  },
  {
    id: 'mobile-bottom-nav',
    device: 'mobile',
    name: '하단 내비게이션',
    description: '주요 메뉴 3개를 빠르게 전환하는 앱 구조',
    kind: 'mobile-nav',
    items: [
      { componentId: 'top-navigation', props: { type: 'root', title: '서비스 홈' } },
      { componentId: 'page-header', props: { title: '서비스 시작하기', description: '오늘 필요한 업무를 확인하세요.', label: '시작하기' } },
      { componentId: 'responsive-grid', props: { options: '빠른 메뉴\n최근 활동\n알림' } },
      { componentId: 'bottom-app-bar', props: { options: '홈\n업무\n내 정보', 'item-count': '3', position: 'fixed' } },
    ],
  },
  {
    id: 'mobile-list',
    device: 'mobile',
    name: '검색·목록',
    description: '검색, 필터와 결과 목록이 있는 업무 화면',
    kind: 'mobile-list',
    items: [
      { componentId: 'top-navigation', props: { type: 'standard', title: '요청 관리' } },
      { componentId: 'search', props: { label: '검색', placeholder: '요청을 검색하세요' } },
      { componentId: 'chip', props: { options: '전체\n진행 중\n완료' } },
      { componentId: 'list-section', props: { title: '요청 목록', options: '디자인 검토 요청\n컴포넌트 등록\n화면 기획서 확인' } },
      { componentId: 'bottom-app-bar', props: { options: '홈\n업무\n내정보', 'item-count': '3', position: 'fixed' } },
    ],
  },
  {
    id: 'pc-gnb',
    device: 'desktop',
    name: 'GNB',
    description: '메뉴가 적고 정보 구조가 얕은 포털형',
    kind: 'gnb',
    items: [
      { componentId: 'app-header', props: { title: 'Wonhee', options: '대시보드\n프로젝트\n설정', position: 'sticky' } },
      { componentId: 'page-header', props: { title: '대시보드', description: '핵심 지표와 최근 활동을 확인합니다.', label: '새 프로젝트' } },
      { componentId: 'responsive-grid', props: { options: '오늘의 지표\n최근 활동\n진행 상태' } },
    ],
  },
  {
    id: 'pc-lnb',
    device: 'desktop',
    name: 'LNB',
    description: '업무 메뉴가 많고 전환이 잦은 관리형',
    kind: 'lnb',
    items: [
      { componentId: 'workspace-shell', props: { title: '업무 대시보드', description: '업무 상태를 확인하고 속성을 편집합니다.', options: '업무 홈\n요청 관리\n통계', navigation: 'side', inspector: 'none' } },
    ],
  },
  {
    id: 'pc-gnb-lnb',
    device: 'desktop',
    name: 'GNB + LNB',
    description: '전역 영역과 로컬 업무를 함께 탐색',
    kind: 'hybrid',
    items: [
      { componentId: 'workspace-shell', props: { title: '요청 관리', description: '접수된 요청을 검색하고 처리 상태를 관리합니다.', options: '홈\n요청\n보고서', navigation: 'side', inspector: 'right' } },
    ],
  },
  {
    id: 'pc-focus',
    device: 'desktop',
    name: '집중형',
    description: '등록·수정처럼 한 가지 작업에 집중',
    kind: 'focus',
    items: [
      { componentId: 'top-navigation', props: { type: 'standard', title: '새 요청 등록' } },
      { componentId: 'page-header', props: { title: '요청 정보', description: '필수 정보를 입력한 후 요청을 등록하세요.', label: '도움말' } },
      { componentId: 'field-group', props: { title: '요청 정보', label: '요청 제목', placeholder: '제목을 입력하세요' } },
      { componentId: 'action-bar', props: { label: '요청 등록' } },
    ],
  },
];

// ─── Palette Thumbnail ───────────────────────────────────────────────────────

/**
 * Palette cards follow `component_registry.preview_sizes` from the contract.
 * A badge and a data table cannot read at the same scale, so each size gets its
 * own column span, card height, and render width.
 */
const PALETTE_INNER_W = 264;
const PALETTE_GAP = 8;
const PALETTE_COMPACT_W = Math.floor((PALETTE_INNER_W - PALETTE_GAP * 2) / 3);

const PALETTE_SIZE = {
  // span: how many of the 3 grid columns the card occupies.
  // minHeight keeps short cards from collapsing; maxHeight caps the tall ones.
  compact: { span: 1, minHeight: 48, maxHeight: 72, renderWidth: PALETTE_COMPACT_W, cardWidth: PALETTE_COMPACT_W },
  control: { span: 3, minHeight: 56, maxHeight: 120, renderWidth: 375, cardWidth: PALETTE_INNER_W },
  wide: { span: 3, minHeight: 56, maxHeight: 150, renderWidth: 768, cardWidth: PALETTE_INNER_W },
} as const;

function GridPaletteItem({ def, device }: { def: ComponentDefinition; device: FrameDevice }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${def.id}`,
    data: { source: 'palette', componentId: def.id },
  });

  const size = PALETTE_SIZE[componentPreviewSize(def.id)];
  const scale = size.cardWidth / size.renderWidth;

  return (
    <div
      ref={setNodeRef}
      title={`${def.name} 드래그하여 추가`}
      className="hover:!border-[var(--aui-primary)] hover:!shadow-[0_0_0_1px_var(--aui-primary-muted)]"
      style={{
        gridColumn: `span ${size.span}`,
        borderRadius: "var(--aui-radius-sm)",
        overflow: 'hidden',
        border: `1px solid ${AIDE.border}`,
        opacity: isDragging ? 0.3 : 1,
        userSelect: 'none',
        cursor: 'grab',
        background: AIDE.surface,
        transition: 'border-color 0.12s, box-shadow 0.12s',
      }}
    >
      {/* Thumbnail — drag handle */}
      <div
        {...listeners}
        {...attributes}
        style={{
          minHeight: size.minHeight,
          maxHeight: size.maxHeight,
          overflow: 'hidden',
          background: AIDE.surface,
          cursor: 'grab',
          touchAction: 'none',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: size.renderWidth,
            // `zoom` scales layout too, so the card shrinks to the artwork
            // instead of reserving the unscaled height that `transform` leaves.
            zoom: scale,
            pointerEvents: 'none',
            padding: "var(--aui-space-2)",
          }}
        >
          <ComponentPreview id={def.id} props={getComponentPropsForDevice(def, device)} device={device} context="playground" />
        </div>
      </div>
      {/* Name label */}
      <div
        style={{
          padding: `var(--aui-space-1) var(--aui-space-2)`,
          fontSize: "var(--aui-type-meta-size)",
          fontWeight: "var(--aui-weight-medium)",
          color: AIDE.textMuted,
          borderTop: `1px solid ${AIDE.border}`,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {def.name}
      </div>
    </div>
  );
}

// ─── Canvas Empty Drop Zone ───────────────────────────────────────────────────

function CanvasEmptyZone({ frameId, region }: { frameId: string; region: CanvasRegion }) {
  const { isOver, setNodeRef } = useDroppable({ id: `insert:${frameId}:${region}:0` });
  const compact = region === 'header' || region === 'bottom' || region === 'navigation' || region === 'aside';

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: compact ? `var(--aui-space-3)` : `var(--aui-space-10) var(--aui-space-6)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: "var(--aui-space-3)",
        textAlign: 'center',
        border: isOver
          ? `2px dashed ${AIDE.primary}`
          : '2px dashed var(--aui-shadow-medium)',
        borderRadius: "var(--aui-radius-control)",
        margin: compact ? `var(--aui-space-2)` : `var(--aui-space-5) var(--aui-space-4)`,
        background: isOver ? AIDE.primarySoft : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ width: compact ? 28 : 44, height: compact ? 28 : 44, borderRadius: "var(--aui-radius-sm)", background: isOver ? 'var(--aui-primary-muted)' : 'var(--aui-surface-muted)', border: `1px solid ${isOver ? 'var(--aui-primary-muted)' : AIDE.border}`, color: isOver ? AIDE.primary : AIDE.textSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LayoutTemplate size={20} />
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "var(--aui-type-label-size)",
          fontWeight: "var(--aui-weight-semibold)",
          color: isOver ? AIDE.primary : 'var(--aui-shadow-medium)',
          fontFamily: "'Pretendard', -apple-system, sans-serif",
        }}
      >
        {isOver ? `${REGION_LABELS[region]}에 놓으세요` : `${REGION_LABELS[region]} 영역`}
      </p>
    </div>
  );
}

// ─── Sortable Canvas Item ─────────────────────────────────────────────────────

function PaletteDropSlot({ frameId, region, index, device }: { frameId: string; region: CanvasRegion; index: number; device: FrameDevice }) {
  const { isOver, setNodeRef } = useDroppable({ id: `insert:${frameId}:${region}:${index}` });

  return (
    <div
      ref={setNodeRef}
      style={{
        height: device === 'desktop' ? 32 : 18,
        margin: device === 'desktop' ? '0 24px' : '0 12px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: '100%',
          height: isOver ? 4 : 2,
          borderRadius: "var(--aui-radius-sm)",
          background: isOver ? AIDE.primary : 'var(--aui-primary-muted)',
          boxShadow: isOver ? "var(--aui-shadow-ring)" : 'none',
          transition: 'height 0.1s, background 0.1s, box-shadow 0.1s',
        }}
      />
      {isOver ? (
        <span
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            padding: `var(--aui-space-1) var(--aui-space-2)`,
            borderRadius: "var(--aui-radius-sm)",
            background: AIDE.primary,
            color: 'var(--aui-on-dark)',
            // Canvas overlay hint: scale tracks the frame's device, both ends on contract.
            fontSize: device === 'desktop' ? "var(--aui-type-body-size)" : "var(--aui-type-meta-size)",
            fontWeight: "var(--aui-weight-bold)",
            whiteSpace: 'nowrap',
          }}
        >
          여기에 배치
        </span>
      ) : null}
    </div>
  );
}

function SortableItem({
  item,
  device,
  isSelected,
  showInsertBefore,
  onSelect,
  layoutColumns,
}: {
  item: CanvasItem;
  device: FrameDevice;
  isSelected: boolean;
  showInsertBefore: boolean;
  onSelect: () => void;
  layoutColumns: number;
}) {
  const def = getComponentById(item.componentId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.instanceId,
  });

  const isFixedBottom = def?.canvasBehavior === 'fixed-bottom';
  const isModal = def?.canvasBehavior === 'modal';
  const isOverlay = isModal;
  const isStack = def?.canvasBehavior === 'stack' || !def?.canvasBehavior;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    position: isOverlay ? 'absolute' : 'relative',
    ...(isFixedBottom ? { zIndex: 40 } : {}),
    ...(isModal ? { inset: 0, zIndex: 50 } : {}),
    ...(isStack ? { margin: 'var(--aui-space-4)' } : {}),
    ...((isOverlay || def?.canvasBehavior === 'full-width') && layoutColumns > 1 ? { gridColumn: '1 / -1' } : {}),
  };

  if (!def) return null;

  return (
    <div
      ref={setNodeRef}
      data-canvas-item-id={item.instanceId}
      style={style}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onSelect();
      }}
      onClick={(event) => event.stopPropagation()}
    >
      {/* Palette insertion indicator line */}
      {showInsertBefore && (
        <div
          style={{
            position: 'absolute',
            top: -2,
            left: 0,
            right: 0,
            height: 3,
            background: AIDE.primary,
            borderRadius: "var(--aui-radius-sm)",
            zIndex: 30,
            boxShadow: "var(--aui-shadow-glow)",
          }}
        />
      )}

      {/* Selection border */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: `2px solid ${AIDE.primary}`,
            borderRadius: "var(--aui-radius-sm)",
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      )}

      {/* Compact reorder handle. Destructive actions live in the inspector. */}
      {isSelected && (
        <div
          {...attributes}
          {...listeners}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 20,
            width: 26,
            height: 26,
            border: `1px solid ${AIDE.border}`,
            borderRadius: 8,
            background: 'var(--aui-on-dark-strong)',
            boxShadow: 'var(--aui-shadow-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            color: AIDE.primary,
            fontSize: 'var(--aui-type-compact-size)',
            touchAction: 'none',
          }}
          title="드래그해서 순서 변경"
        >
          ⠿
        </div>
      )}

      {/* Canonical React component shared with /aide-ui. */}
      <div
        style={{ userSelect: 'none', height: isModal ? '100%' : undefined }}
      >
        <div style={{ pointerEvents: 'none' }}>
          <ComponentPreview id={def.id} props={item.props} device={device} context="playground" />
        </div>
      </div>
    </div>
  );
}

function StaticCanvasItem({ item, device, layoutColumns }: { item: CanvasItem; device: FrameDevice; layoutColumns: number }) {
  const def = getComponentById(item.componentId);
  if (!def) return null;
  const isFixedBottom = def.canvasBehavior === 'fixed-bottom';
  const isModal = def.canvasBehavior === 'modal';
  const isStack = def.canvasBehavior === 'stack' || !def.canvasBehavior;

  return (
    <div
      style={{
        ...(isFixedBottom ? { position: 'relative', zIndex: 40 } as React.CSSProperties : {}),
        ...(isModal ? { position: 'absolute', inset: 0, zIndex: 50 } as React.CSSProperties : {}),
        ...(isStack ? { margin: 'var(--aui-space-4)' } : {}),
        ...((isFixedBottom || isModal || def.canvasBehavior === 'full-width') && layoutColumns > 1 ? { gridColumn: '1 / -1' } : {}),
      }}
    >
      <ComponentPreview id={def.id} props={item.props} device={device} context="playground" />
    </div>
  );
}

function FrameRegion({
  frame,
  region,
  active,
  previewMode,
  canAcceptPalette,
  selectedId,
  dragOverCanvasId,
  layoutColumns,
  onSelect,
}: {
  frame: CanvasFrame;
  region: CanvasRegion;
  active: boolean;
  previewMode: boolean;
  canAcceptPalette: boolean;
  selectedId: string | null;
  dragOverCanvasId: string | null;
  layoutColumns: number;
  onSelect: (instanceId: string) => void;
}) {
  const regionItems = frame.items.filter((item) => item.region === region && !item.hidden);
  const isOverlay = region === 'overlay';
  const isContent = region === 'content' || region === 'main';
  const columns = isContent ? layoutColumns : 1;
  const editing = active && !previewMode;
  const showEmpty = editing && canAcceptPalette;
  const isEmpty = regionItems.length === 0;

  return (
    <section
      aria-label={`${REGION_LABELS[region]} 영역`}
      style={{
        position: isOverlay ? 'absolute' : 'relative',
        ...(isOverlay ? { top: 16, right: 16, width: frame.device === 'mobile' ? 320 : 420, zIndex: 60 } : { gridArea: region }),
        minWidth: 0,
        minHeight: isContent ? 0 : isEmpty ? 0 : 44,
        overflowY: 'visible',
        background: showEmpty ? 'color-mix(in srgb, var(--aui-surface) 94%, var(--aui-primary) 6%)' : 'transparent',
        border: showEmpty ? '1px dashed var(--aui-primary-muted)' : 'none',
        display: columns > 1 ? 'grid' : 'block',
        gridTemplateColumns: columns > 1 ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
        alignContent: 'start',
      }}
    >
      <SortableContext items={regionItems.map((item) => item.instanceId)} strategy={columns > 1 ? rectSortingStrategy : verticalListSortingStrategy}>
        {regionItems.length === 0 ? (showEmpty ? <CanvasEmptyZone frameId={frame.id} region={region} /> : null) : (
          <>
            {regionItems.map((item, index) => (
              <React.Fragment key={item.instanceId}>
                {canAcceptPalette ? <PaletteDropSlot frameId={frame.id} region={region} index={index} device={frame.device} /> : null}
                {editing ? (
                  <SortableItem item={item} device={frame.device} isSelected={selectedId === item.instanceId} showInsertBefore={dragOverCanvasId === item.instanceId} onSelect={() => onSelect(item.instanceId)} layoutColumns={columns} />
                ) : (
                  <StaticCanvasItem item={item} device={frame.device} layoutColumns={columns} />
                )}
              </React.Fragment>
            ))}
            {canAcceptPalette ? <PaletteDropSlot frameId={frame.id} region={region} index={regionItems.length} device={frame.device} /> : null}
          </>
        )}
      </SortableContext>
    </section>
  );
}

// ─── Left component library ──────────────────────────────────────────────────

type LibraryTab = 'components' | 'layers';

function ComponentLibraryPanel({
  tab,
  onTabChange,
  device,
  frames,
  activeFrameId,
  selectedId,
  onSelectFrame,
  onSelectItem,
  onToggleItem,
  onMoveItem,
}: {
  tab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  device: FrameDevice;
  frames: CanvasFrame[];
  activeFrameId: string;
  selectedId: string | null;
  onSelectFrame: (frameId: string) => void;
  onSelectItem: (frameId: string, instanceId: string) => void;
  onToggleItem: (instanceId: string) => void;
  onMoveItem: (instanceId: string, direction: -1 | 1) => void;
}) {
  const activeFrame = frames.find((frame) => frame.id === activeFrameId) ?? null;
  const activeDefinitions = COMPONENT_DEFINITIONS.filter((component) => {
    return supportsDevice(component, device);
  });

  return (
    <div
      style={{
        width: 'var(--aui-panel-min)',
        flexShrink: 0,
        background: AIDE.surface,
        borderRight: `1px solid ${AIDE.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${AIDE.border}`,
          flexShrink: 0,
        }}
      >
        {(['components', 'layers'] as LibraryTab[]).map((t) => {
          const label = t === 'components' ? '컴포넌트' : '레이어';
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              style={{
                flex: 1,
                height: 42,
                background: 'transparent',
                border: 'none',
                borderBottom: active ? `2px solid ${AIDE.primary}` : '2px solid transparent',
                color: active ? AIDE.text : AIDE.textMuted,
                fontSize: "var(--aui-type-compact-size)",
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'color 0.12s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'components' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: `var(--aui-space-3) var(--aui-space-2) var(--aui-space-4)` }}>
          <div style={{ margin: `0 var(--aui-space-1) var(--aui-space-2)`, display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", color: AIDE.textMuted, fontSize: "var(--aui-type-meta-size)" }}>
            {device === 'mobile' ? <Smartphone size={12} /> : <Monitor size={12} />}
            <span>{device === 'mobile' ? 'Mobile에 적합한 컴포넌트' : 'PC에 적합한 컴포넌트'}</span>
          </div>
          {FRAME_REGIONS[device].map((region) => {
            const defs = activeDefinitions.filter((component) => defaultRegionForComponent(component.id, device) === region);
            if (defs.length === 0) return null;
            return (
              <div key={region} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    padding: `0 var(--aui-space-1) var(--aui-space-2)`,
                    fontSize: "var(--aui-type-meta-size)",
                    fontWeight: "var(--aui-weight-bold)",
                    color: AIDE.textSubtle,
                    letterSpacing: "var(--aui-tracking-wider)",
                    textTransform: 'uppercase',
                  }}
                >
                  {REGION_LABELS[region]}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: "var(--aui-space-2)",
                    alignItems: 'start',
                  }}
                >
                  {defs.map((def) => (
                    <GridPaletteItem key={def.id} def={def} device={device} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: "var(--aui-space-3) var(--aui-space-2) var(--aui-space-4)" }}>
          <div style={{ padding: '0 6px 8px', color: AIDE.textSubtle, fontSize: "var(--aui-type-meta-size)", fontWeight: 700, letterSpacing: '0.08em' }}>
            화면
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {frames.map((frame) => {
              const active = frame.id === activeFrameId;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => onSelectFrame(frame.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 34, padding: '6px 8px', border: `1px solid ${active ? AIDE.primary : 'transparent'}`, borderRadius: 7, background: active ? 'var(--aui-primary-subtle)' : 'transparent', color: AIDE.text, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}
                >
                  {frame.device === 'mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{frame.name}</span>
                  <span style={{ color: AIDE.textMuted, fontSize: 10 }}>{frame.items.length}</span>
                </button>
              );
            })}
          </div>

          {activeFrame ? FRAME_REGIONS[activeFrame.device].map((region) => {
            const regionItems = activeFrame.items.filter((item) => item.region === region);
            if (regionItems.length === 0) return null;
            return (
              <div key={region} style={{ marginTop: 16 }}>
                <div style={{ padding: '0 6px 6px', color: AIDE.textSubtle, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {REGION_LABELS[region]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {regionItems.map((item, index) => {
                    const definition = getComponentById(item.componentId);
                    const selected = item.instanceId === selectedId;
                    return (
                      <div key={item.instanceId} style={{ display: 'flex', alignItems: 'center', minHeight: 34, border: `1px solid ${selected ? AIDE.primary : 'transparent'}`, borderRadius: 7, background: selected ? 'var(--aui-primary-subtle)' : 'transparent', opacity: item.hidden ? 0.55 : 1 }}>
                        <button type="button" onClick={() => onSelectItem(activeFrame.id, item.instanceId)} style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 7, padding: '0 8px', border: 0, background: 'transparent', color: AIDE.text, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                          <Rows3 size={12} color={AIDE.textSubtle} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{definition?.name ?? item.componentId}</span>
                        </button>
                        {selected ? (
                          <>
                            <button type="button" aria-label="위로 이동" disabled={index === 0} onClick={() => onMoveItem(item.instanceId, -1)} style={{ width: 26, height: 30, border: 0, background: 'transparent', color: index === 0 ? AIDE.textSubtle : AIDE.textMuted, cursor: index === 0 ? 'default' : 'pointer' }}><ArrowUp size={12} /></button>
                            <button type="button" aria-label="아래로 이동" disabled={index === regionItems.length - 1} onClick={() => onMoveItem(item.instanceId, 1)} style={{ width: 26, height: 30, border: 0, background: 'transparent', color: index === regionItems.length - 1 ? AIDE.textSubtle : AIDE.textMuted, cursor: index === regionItems.length - 1 ? 'default' : 'pointer' }}><ChevronDown size={13} /></button>
                          </>
                        ) : null}
                        <button type="button" aria-label={item.hidden ? '표시' : '숨기기'} onClick={() => onToggleItem(item.instanceId)} style={{ width: 30, height: 30, border: 0, background: 'transparent', color: AIDE.textMuted, cursor: 'pointer' }}>
                          {item.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }) : (
            <div style={{ padding: 20, color: AIDE.textMuted, fontSize: 12, textAlign: 'center' }}>프레임을 추가하면 레이어가 표시됩니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Right component details ─────────────────────────────────────────────────

function ComponentDetailsPanel({
  selectedItem,
  activeFrame,
  device,
  onPropChange,
  onRegionChange,
  onRemove,
  onReset,
  onFrameNameChange,
  onFrameLayoutChange,
}: {
  selectedItem: CanvasItem | null;
  activeFrame: CanvasFrame | null;
  device: BuilderDevice;
  onPropChange: (instanceId: string, key: string, value: string) => void;
  onRegionChange: (instanceId: string, region: CanvasRegion) => void;
  onRemove: (instanceId: string) => void;
  onReset: (instanceId: string) => void;
  onFrameNameChange: (name: string) => void;
  onFrameLayoutChange: (layout: 'stack' | 'grid-2' | 'grid-3') => void;
}) {
  return (
    <aside
      style={{
        width: 328,
        flexShrink: 0,
        background: AIDE.surface,
        borderLeft: `1px solid ${AIDE.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 42,
          padding: `0 var(--aui-space-4)`,
          borderBottom: `1px solid ${AIDE.border}`,
          display: 'flex',
          alignItems: 'center',
          fontSize: "var(--aui-type-compact-size)",
        fontWeight: "var(--aui-weight-bold)",
        color: AIDE.text,
      }}
    >
        <span>속성</span>
        {selectedItem ? (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              type="button"
              onClick={() => onReset(selectedItem.instanceId)}
              title="기본값으로 초기화"
              aria-label="컴포넌트 기본값으로 초기화"
              style={{ width: 28, height: 28, border: 'none', borderRadius: 8, background: 'transparent', color: AIDE.textMuted, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(selectedItem.instanceId)}
              title="선택한 컴포넌트 삭제"
              aria-label="선택한 컴포넌트 삭제"
              style={{ width: 28, height: 28, border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--aui-negative)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ) : null}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedItem ? (
          <PropertiesContent item={selectedItem} device={device} onChange={onPropChange} onRegionChange={onRegionChange} />
        ) : activeFrame ? (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 16, borderBottom: `1px solid ${AIDE.border}` }}>
              <span style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 9, background: AIDE.primarySoft, color: AIDE.primary }}>
                {activeFrame.device === 'mobile' ? <Smartphone size={16} /> : <Monitor size={16} />}
              </span>
              <div>
                <div style={{ color: AIDE.text, fontSize: 13, fontWeight: 700 }}>프레임</div>
                <div style={{ marginTop: 2, color: AIDE.textMuted, fontSize: 11 }}>{activeFrame.items.length}개 컴포넌트</div>
              </div>
            </div>
            <label style={{ display: 'block', marginTop: 16, color: AIDE.textMuted, fontSize: 11, fontWeight: 600 }}>
              이름
              <input value={activeFrame.name} onChange={(event) => onFrameNameChange(event.target.value)} style={{ width: '100%', height: 36, marginTop: 6, padding: '0 10px', border: `1px solid ${AIDE.border}`, borderRadius: 7, background: AIDE.bg, color: AIDE.text, font: 'inherit', fontSize: 12, outline: 'none' }} />
            </label>
            <div style={{ marginTop: 16, color: AIDE.textMuted, fontSize: 11, fontWeight: 600 }}>크기</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
              {(['width', 'height'] as const).map((axis) => (
                <div key={axis} style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', border: `1px solid ${AIDE.border}`, borderRadius: 7, background: AIDE.surfaceHover }}>
                  <span style={{ color: AIDE.textSubtle, fontSize: 10 }}>{axis === 'width' ? 'W' : 'H'}</span>
                  <span style={{ color: AIDE.text, fontSize: 12 }}>{FRAME_DIMENSIONS[activeFrame.device][axis]}</span>
                </div>
              ))}
            </div>
            {activeFrame.device === 'desktop' ? (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 6, color: AIDE.textMuted, fontSize: 11, fontWeight: 600 }}>콘텐츠 레이아웃</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: 4, borderRadius: 8, background: AIDE.surfaceHover }}>
                  {([['stack', '1열'], ['grid-2', '2열'], ['grid-3', '3열']] as const).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => onFrameLayoutChange(value)} style={{ height: 30, border: `1px solid ${(activeFrame.layout ?? 'stack') === value ? AIDE.border : 'transparent'}`, borderRadius: 6, background: (activeFrame.layout ?? 'stack') === value ? AIDE.surface : 'transparent', color: AIDE.text, fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
                  ))}
                </div>
              </div>
            ) : null}
            <p style={{ margin: '18px 0 0', color: AIDE.textSubtle, fontSize: 11, lineHeight: 1.6 }}>프레임을 선택하면 화면 단위 속성을, 컴포넌트를 선택하면 해당 요소의 콘텐츠·스타일·상태를 편집합니다.</p>
          </div>
        ) : (
          <div style={{ padding: `var(--aui-space-10) var(--aui-space-6)`, textAlign: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                margin: '0 auto 12px',
                borderRadius: "var(--aui-radius-sm)",
                background: AIDE.surfaceHover,
                border: `1px solid ${AIDE.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: AIDE.textSubtle,
                fontSize: "var(--aui-type-section-title-size)",
              }}
            >
              ◫
            </div>
            <p style={{ margin: 0, color: AIDE.textMuted, fontSize: "var(--aui-type-compact-size)", lineHeight: "var(--aui-leading-relaxed)" }}>
              캔버스에서 컴포넌트를 선택하면
              <br />
              내용과 스타일을 편집할 수 있습니다
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function resolvePropertyGroup(schema: ComponentDefinition['propSchema'][number]): 'content' | 'style' | 'state' {
  if (schema.group) return schema.group;
  const key = schema.key.toLowerCase();
  if (/(state|disabled|checked|required|active|selected|invalid|show)/.test(key)) return 'state';
  if (/(variant|size|density|direction|layout|width|height|color|bg|border|radius|count|compact|full)/.test(key)) return 'style';
  return 'content';
}

function PropertiesContent({
  item,
  device,
  onChange,
  onRegionChange,
}: {
  item: CanvasItem;
  device: BuilderDevice;
  onChange: (instanceId: string, key: string, value: string) => void;
  onRegionChange: (instanceId: string, region: CanvasRegion) => void;
}) {
  const def = getComponentById(item.componentId);
  if (!def) return null;

  const propertyGroups = ([
    { id: 'content', label: '콘텐츠' },
    { id: 'style', label: '스타일' },
    { id: 'state', label: '상태' },
  ] as const)
    .map((group) => ({
      ...group,
      schemas: def.propSchema.filter((schema) => resolvePropertyGroup(schema) === group.id),
    }))
    .filter((group) => group.schemas.length > 0);

  return (
    <>
      <div
        style={{
          padding: `var(--aui-space-3) var(--aui-space-4) var(--aui-space-3)`,
          borderBottom: `1px solid ${AIDE.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, background: AIDE.primarySoft, color: AIDE.primary, display: 'grid', placeItems: 'center', fontSize: "var(--aui-type-label-size)", fontWeight: 700 }}>{def.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-bold)", color: AIDE.text }}>{def.name}</div>
            <div style={{ marginTop: 2, fontSize: 'var(--aui-type-meta-size)', color: AIDE.textSubtle }}>{REGION_LABELS[item.region]}</div>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              padding: `var(--aui-space-1) var(--aui-space-2)`,
              borderRadius: "var(--aui-radius-sm)",
              background: AIDE.primarySoft,
              color: AIDE.primary,
              fontSize: "var(--aui-type-meta-size)",
              fontWeight: "var(--aui-weight-bold)",
            }}
          >
            {device === 'mobile' ? 'Mobile' : 'Desktop'}
          </span>
        </div>
        {def.description && (
          <p style={{ margin: `var(--aui-space-2) 0 0`, color: AIDE.textMuted, fontSize: "var(--aui-type-micro-size)", lineHeight: "var(--aui-leading-normal)" }}>
            {def.description}
          </p>
        )}
        {allowedRegionsForComponent(item.componentId, device).length > 1 ? (
          <label style={{ display: 'block', marginTop: 12, color: AIDE.textMuted, fontSize: 'var(--aui-type-micro-size)', fontWeight: 'var(--aui-weight-semibold)' }}>
            배치 영역
            <select value={item.region} onChange={(event) => onRegionChange(item.instanceId, event.target.value as CanvasRegion)} style={{ width: '100%', height: 36, marginTop: 6, padding: `0 var(--aui-space-3)`, border: `1px solid ${AIDE.border}`, borderRadius: 'var(--aui-radius-sm)', background: AIDE.bg, color: AIDE.text, fontFamily: 'inherit' }}>
              {allowedRegionsForComponent(item.componentId, device).map((region) => <option key={region} value={region}>{REGION_LABELS[region]}</option>)}
            </select>
          </label>
        ) : null}
        {def.source && (
          <details style={{ marginTop: 10, borderTop: `1px solid ${AIDE.border}`, paddingTop: 9 }}>
            <summary style={{ cursor: 'pointer', color: AIDE.textMuted, fontSize: 'var(--aui-type-meta-size)', fontWeight: 600 }}>개발 정보</summary>
            <div style={{ marginTop: 8, padding: `var(--aui-space-2)`, borderRadius: "var(--aui-radius-sm)", background: AIDE.bg }}>
              <div style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: AIDE.textMuted }}>{def.source.storybookTitle}</div>
            {def.source.importCode && (
              <code
                style={{
                  display: 'block',
                  marginTop: 5,
                  color: AIDE.textMuted,
                  fontSize: "var(--aui-type-meta-size)",
                  lineHeight: "var(--aui-leading-normal)",
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                }}
              >
                {def.source.importCode}
              </code>
            )}
            {def.source.variants && def.source.variants.length > 0 && (
              <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: "var(--aui-space-1)" }}>
                {def.source.variants.map((variant) => (
                  <span
                    key={variant}
                    style={{
                      minHeight: 20,
                      padding: `var(--aui-space-1) var(--aui-space-2)`,
                      borderRadius: "var(--aui-radius-sm)",
                      background: AIDE.surface,
                      border: `1px solid ${AIDE.border}`,
                      color: AIDE.textMuted,
                      fontSize: "var(--aui-type-meta-size)",
                      lineHeight: "var(--aui-leading-tight)",
                    }}
                  >
                    {variant}
                  </span>
                ))}
              </div>
            )}
            </div>
          </details>
        )}
      </div>
      {propertyGroups.map((group) => (
        <section key={group.id} style={{ borderBottom: `1px solid ${AIDE.border}`, padding: `var(--aui-space-4) var(--aui-space-4) var(--aui-space-4)` }}>
          <div
            style={{
              marginBottom: 12,
              fontSize: "var(--aui-type-micro-size)",
              fontWeight: "var(--aui-weight-bold)",
              color: AIDE.text,
            }}
          >
            {group.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: "var(--aui-space-4)" }}>
            {group.schemas.map((schema) => (
              <div key={schema.key}>
                <label
                  style={{
                    display: 'block',
                    fontSize: "var(--aui-type-micro-size)",
                    fontWeight: "var(--aui-weight-medium)",
                    color: AIDE.textMuted,
                    marginBottom: 6,
                  }}
                >
                  {schema.label}
                </label>
                <PropInput
                  type={schema.type}
                  value={item.props[schema.key] ?? ''}
                  options={schema.options}
                  display={schema.display}
                  onChange={(v) => onChange(item.instanceId, schema.key, v)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function PropInput({
  type,
  value,
  options,
  display,
  onChange,
}: {
  type: PropType;
  value: string;
  options?: string[];
  display?: 'default' | 'segmented';
  onChange: (v: string) => void;
}) {
  const base: React.CSSProperties = {
    width: '100%',
    background: AIDE.bg,
    border: `1px solid ${AIDE.border}`,
    borderRadius: "var(--aui-radius-sm)",
    color: AIDE.text,
    fontSize: "var(--aui-type-compact-size)",
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };
  const optionLabels: Record<string, string> = {
    true: '사용', false: '미사용', horizontal: '가로', vertical: '세로', primary: '주요', secondary: '보조',
    outline: '외곽선', ghost: '텍스트', default: '기본', selected: '선택', success: '성공', warning: '주의',
    error: '오류', disabled: '비활성', compact: '좁게', touch: '터치', prominent: '강조', fill: '가득',
    hug: '내용 맞춤', plain: '기본', raised: '그림자', bordered: '테두리', start: '왼쪽', center: '가운데',
    end: '오른쪽', static: '일반', sticky: '고정', fixed: '화면 고정', stack: '세로', split: '분할',
    root: '최상위', standard: '일반', muted: '은은하게', none: '사용 안 함', left: '왼쪽', right: '오른쪽',
    wide: '넓게', selectable: '선택 가능', info: '정보', compacted: '좁게',
  };
  const optionLabel = (option: string) => optionLabels[option] ?? option;

  if (type === 'select' && options && (display === 'segmented' || (display !== 'default' && options.length <= 3))) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
          gap: "var(--aui-space-1)",
          padding: "var(--aui-space-1)",
          border: `1px solid ${AIDE.border}`,
          borderRadius: "var(--aui-radius-sm)",
          background: AIDE.surfaceHover,
        }}
      >
        {options.map((option) => {
          const active = option === value;
          const label = optionLabel(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              style={{
                minHeight: 32,
                minWidth: 0,
                border: 'none',
                borderRadius: "var(--aui-radius-sm)",
                background: active ? AIDE.surface : 'transparent',
                color: active ? AIDE.primary : AIDE.textMuted,
                boxShadow: active ? "var(--aui-shadow-subtle)" : 'none',
                fontSize: "var(--aui-type-micro-size)",
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === 'color') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 'var(--aui-control-compact)',
            height: 'var(--aui-control-compact)',
            border: 'none',
            borderRadius: "var(--aui-radius-sm)",
            cursor: 'pointer',
            padding: "var(--aui-space-1)",
            background: 'transparent',
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...base, flex: 1, height: 'var(--aui-control-compact)', padding: `0 var(--aui-space-3)` }}
        />
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...base, height: 36, padding: `0 var(--aui-space-3)`, cursor: 'pointer' }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {optionLabel(o)}
          </option>
        ))}
      </select>
    );
  }

  if (type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{ ...base, minHeight: 88, padding: `var(--aui-space-3)`, resize: 'vertical', lineHeight: "var(--aui-leading-normal)" }}
      />
    );
  }

  return (
    <input
      type={type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...base, height: 36, padding: `0 var(--aui-space-3)` }}
    />
  );
}

// ─── HTML Export ──────────────────────────────────────────────────────────────

function buildExportHTML(frame: CanvasFrame): string {
  const { width, height } = FRAME_DIMENSIONS[frame.device];
  const layoutColumns = frame.device === 'desktop' ? frame.layout === 'grid-3' ? 3 : frame.layout === 'grid-2' ? 2 : 1 : 1;
  const hasNavigation = frame.items.some((item) => item.region === 'navigation' && !item.hidden);
  const hasAside = frame.items.some((item) => item.region === 'aside' && !item.hidden);
  const renderItem = (item: CanvasItem) => {
      const def = getComponentById(item.componentId);
      if (!def) return '';
      const html = def.renderHTML(item.props);
      return layoutColumns > 1 && def.canvasBehavior === 'full-width' ? `<div style="grid-column:1/-1">${html}</div>` : html;
  };
  const body = FRAME_REGIONS[frame.device].map((region) => {
    const contents = frame.items.filter((item) => item.region === region && !item.hidden).map(renderItem).join('\n');
    return `<section class="region region-${region}" aria-label="${REGION_LABELS[region]}">${contents}</section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aide Playground Export</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" crossorigin />
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
  <style>
    ${AUI_ROOT_CSS}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Pretendard', -apple-system, sans-serif; background: ${AIDE_UI_RAW.page}; display: flex; justify-content: center; }
    .frame { position: relative; width: ${width}px; height: ${height}px; background: ${AIDE_UI_RAW.surface}; overflow: hidden; display:grid; ${frame.device === 'mobile' ? 'grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"header" "content" "bottom";' : `grid-template-rows:auto minmax(0,1fr);grid-template-columns:${hasNavigation ? '260px' : '0'} minmax(0,1fr) ${hasAside ? '320px' : '0'};grid-template-areas:"header header header" "navigation main aside";`} }
    .region { min-width:0; min-height:0; }
    .region-header { grid-area:header; }
    .region-navigation { grid-area:navigation; overflow:auto; }
    .region-content { grid-area:content; overflow:auto; display:${layoutColumns > 1 ? 'grid' : 'block'}; grid-template-columns:${layoutColumns > 1 ? `repeat(${layoutColumns},minmax(0,1fr))` : 'none'}; align-content:start; }
    .region-main { grid-area:main; overflow:auto; display:${layoutColumns > 1 ? 'grid' : 'block'}; grid-template-columns:${layoutColumns > 1 ? `repeat(${layoutColumns},minmax(0,1fr))` : 'none'}; align-content:start; }
    .region-aside { grid-area:aside; overflow:auto; }
    .region-bottom { grid-area:bottom; }
    .region-overlay { position:absolute; top:16px; right:16px; width:${frame.device === 'mobile' ? '320px' : '420px'}; z-index:60; }
  </style>
</head>
<body>
  <div class="frame">
    ${body}
  </div>
</body>
</html>`;
}

// ─── Drag Overlay Content ─────────────────────────────────────────────────────

function DragPreview({ componentId, props, device }: { componentId: string; props: Record<string, string>; device: FrameDevice }) {
  return (
    <div
      style={{
        width: 375,
        background: 'var(--aui-on-dark)',
        boxShadow: "var(--aui-shadow-floating)",
        borderRadius: "var(--aui-radius-sm)",
        overflow: 'hidden',
        opacity: 0.92,
        transform: 'scale(0.9)',
        transformOrigin: 'top left',
        pointerEvents: 'none',
      }}
    >
      <ComponentPreview id={componentId} props={props} device={device} context="playground" />
    </div>
  );
}

function TemplateMiniature({ kind }: { kind: StructureTemplate['kind'] }) {
  const isMobile = kind.startsWith('mobile');
  if (isMobile) {
    return (
      <div style={{ width: 42, height: 72, border: `1px solid ${AIDE.border}`, borderRadius: "var(--aui-radius-sm)", background: 'var(--aui-on-dark)', padding: "var(--aui-space-1)", display: 'flex', flexDirection: 'column', gap: "var(--aui-space-1)" }}>
        <div style={{ height: 5, borderRadius: "var(--aui-radius-sm)", background: AIDE.fillStrong }} />
        <div style={{ height: 8, borderRadius: "var(--aui-radius-sm)", background: AIDE.primarySoft, borderBottom: `1px solid ${AIDE.border}` }} />
        {kind === 'mobile-list' ? (
          <>
            <div style={{ height: 8, borderRadius: "var(--aui-radius-sm)", background: AIDE.fill }} />
            {[1, 2, 3].map((value) => <div key={value} style={{ height: 8, borderRadius: "var(--aui-radius-sm)", border: `1px solid ${AIDE.border}` }} />)}
          </>
        ) : (
          <div style={{ flex: 1, borderRadius: "var(--aui-radius-sm)", background: kind === 'mobile-nav' ? AIDE.primarySoft : AIDE.surfaceHover, border: `1px solid ${AIDE.border}` }} />
        )}
        {kind === 'mobile-nav' || kind === 'mobile-list' ? <div style={{ height: 8, borderRadius: "var(--aui-radius-sm)", background: 'var(--aui-primary-muted)' }} /> : null}
      </div>
    );
  }

  const hasGnb = kind === 'gnb' || kind === 'hybrid';
  const hasLnb = kind === 'lnb' || kind === 'hybrid';
  return (
    <div style={{ width: 88, height: 58, border: `1px solid ${AIDE.border}`, borderRadius: "var(--aui-radius-sm)", background: 'var(--aui-on-dark)', padding: "var(--aui-space-1)", display: 'flex', flexDirection: 'column', gap: "var(--aui-space-1)" }}>
      {hasGnb ? <div style={{ height: 8, borderRadius: "var(--aui-radius-sm)", background: 'var(--aui-primary-muted)' }} /> : null}
      <div style={{ flex: 1, display: 'flex', gap: "var(--aui-space-1)" }}>
        {hasLnb ? <div style={{ width: 18, borderRadius: "var(--aui-radius-sm)", background: AIDE.fill }} /> : null}
        <div style={{ flex: 1, padding: "var(--aui-space-1)", borderRadius: "var(--aui-radius-sm)", background: AIDE.bg, display: 'grid', gridTemplateColumns: kind === 'focus' ? '1fr' : 'repeat(2,1fr)', gap: "var(--aui-space-1)" }}>
          {[1, 2, 3, 4].slice(0, kind === 'focus' ? 3 : 4).map((value) => <span key={value} style={{ borderRadius: "var(--aui-radius-sm)", background: value === 1 ? AIDE.primarySoft : AIDE.fillStrong }} />)}
        </div>
      </div>
    </div>
  );
}

function StructureTemplatePicker({
  device,
  activeTemplateId,
  onApply,
  onClose,
}: {
  device: FrameDevice;
  activeTemplateId?: string;
  onApply: (template: StructureTemplate) => void;
  onClose: () => void;
}) {
  const templates = STRUCTURE_TEMPLATES.filter((template) => template.device === device);
  return (
    <div
      role="dialog"
      aria-label="구조 템플릿 선택"
      style={{
        position: 'absolute',
        top: 62,
        right: 16,
        width: 520,
        padding: "var(--aui-space-4)",
        border: `1px solid ${AIDE.border}`,
        borderRadius: "var(--aui-radius-sm)",
        background: AIDE.surface,
        boxShadow: "var(--aui-shadow-floating)",
        zIndex: 120,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: "var(--aui-space-3)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "var(--aui-type-label-size)", fontWeight: "var(--aui-weight-bold)", color: AIDE.text }}>{device === 'mobile' ? 'Mobile' : 'PC'} 구조 템플릿</div>
          <div style={{ marginTop: 4, fontSize: "var(--aui-type-micro-size)", color: AIDE.textMuted }}>템플릿을 적용한 뒤 컴포넌트와 내용을 자유롭게 바꿀 수 있습니다.</div>
        </div>
        <button type="button" onClick={onClose} aria-label="템플릿 닫기" style={{ width: 28, height: 28, border: 'none', borderRadius: "var(--aui-radius-sm)", background: 'transparent', color: AIDE.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={15} />
        </button>
      </div>
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: "var(--aui-space-2)" }}>
        {templates.map((template) => {
          const active = template.id === activeTemplateId;
          const Icon = template.kind === 'gnb' ? Rows3 : template.kind === 'lnb' ? PanelLeft : template.kind === 'hybrid' ? PanelsTopLeft : template.kind === 'focus' ? Focus : Smartphone;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onApply(template)}
              style={{
                minHeight: 112,
                padding: "var(--aui-space-3)",
                border: `1px solid ${active ? AIDE.primary : AIDE.border}`,
                borderRadius: "var(--aui-radius-sm)",
                background: active ? AIDE.primarySoft : AIDE.surface,
                display: 'flex',
                gap: "var(--aui-space-3)",
                alignItems: 'center',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ width: 98, height: 76, flexShrink: 0, borderRadius: "var(--aui-radius-sm)", background: AIDE.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TemplateMiniature kind={template.kind} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)", color: active ? AIDE.primary : AIDE.text }}>
                  <Icon size={13} />
                  <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-bold)" }}>{template.name}</span>
                </div>
                <div style={{ marginTop: 6, color: AIDE.textMuted, fontSize: "var(--aui-type-meta-size)", lineHeight: "var(--aui-leading-normal)" }}>{template.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main BuilderView ─────────────────────────────────────────────────────────

let instanceCounter = 0;
let frameCounter = 2;
const PLAYGROUND_STORAGE_KEY = 'aide:wonhee-playground:v5';
const LEGACY_PLAYGROUND_STORAGE_KEYS = ['aide:wonhee-playground:v4', 'aide:wonhee-playground:v3', 'aide:wonhee-playground:v2'];

const TEMPLATE_COMPONENT_MIGRATION: Record<string, string> = {
  'status-bar': 'alert', 'app-bar': 'navigation', 'hero-banner': 'detail-header',
  'section-header': 'detail-header', 'list-item': 'list-cell', 'search-bar': 'search',
  'bottom-tab-bar': 'tabs', 'pc-global-nav': 'navigation', 'pc-workspace': 'panel',
  'ktds-button': 'button', 'ktds-textarea': 'textarea', 'ktds-select': 'select',
  'ktds-checkbox-group': 'checkbox', 'ktds-radio-group': 'radio', 'ktds-switch': 'switch',
  'ktds-chip-group': 'chip', 'ktds-tab-list': 'tabs', 'ktds-table': 'table',
  'ktds-pagination': 'navigation', 'ktds-admonition': 'alert', 'ktds-toast': 'toast',
  'ktds-dialog': 'dialog', 'ktds-bottom-sheet': 'sheet',
};

function newInstanceId() {
  return `inst-${++instanceCounter}-${Date.now()}`;
}

function createFrame(device: FrameDevice, items: CanvasItem[] = []): CanvasFrame {
  const sequence = frameCounter++;
  return {
    id: `frame-${sequence}-${Date.now()}`,
    name: `${FRAME_DIMENSIONS[device].label} ${sequence}`,
    device,
    items,
    layout: 'stack',
  };
}

function createTemplateItems(template: StructureTemplate): CanvasItem[] {
  return template.items.flatMap((item) => {
    const componentId = getComponentById(item.componentId) ? item.componentId : TEMPLATE_COMPONENT_MIGRATION[item.componentId] ?? item.componentId;
    const definition = getComponentById(componentId);
    if (!definition || !supportsDevice(definition, template.device)) return [];
    const compatibleTemplateProps = componentId === item.componentId ? item.props : undefined;
    return [{
      instanceId: newInstanceId(),
      componentId: definition.id,
      region: defaultRegionForComponent(definition.id, template.device),
      props: { ...getComponentPropsForDevice(definition, template.device), ...compatibleTemplateProps },
    }];
  });
}

function restoreFrames(value: string | null, refreshTemplates = false): CanvasFrame[] | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const frames = parsed.flatMap((candidate): CanvasFrame[] => {
      if (!candidate || typeof candidate !== 'object') return [];
      const frame = candidate as Partial<CanvasFrame>;
      if (typeof frame.id !== 'string' || typeof frame.name !== 'string') return [];
      if (frame.device !== 'mobile' && frame.device !== 'desktop') return [];
      const currentTemplate = refreshTemplates && typeof frame.templateId === 'string'
        ? STRUCTURE_TEMPLATES.find((template) => template.id === frame.templateId)
        : undefined;
      if (currentTemplate) {
        return [{ ...frame, id: frame.id, name: `${FRAME_DIMENSIONS[currentTemplate.device].label} · ${currentTemplate.name}`, device: currentTemplate.device, items: createTemplateItems(currentTemplate), templateId: currentTemplate.id }];
      }
      const items = Array.isArray(frame.items)
        ? frame.items.flatMap((item): CanvasItem[] => {
          if (!item || typeof item.instanceId !== 'string' || typeof item.componentId !== 'string' || !item.props || typeof item.props !== 'object') return []
          const componentId = getComponentById(item.componentId) ? item.componentId : TEMPLATE_COMPONENT_MIGRATION[item.componentId] ?? item.componentId
          const definition = getComponentById(componentId)
          if (!definition || !supportsDevice(definition, frame.device!)) return []
          const savedProps = Object.fromEntries(Object.entries(item.props).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
          const allowedKeys = new Set([...Object.keys(definition.defaultProps), ...definition.propSchema.map((schema) => schema.key)])
          const props = Object.fromEntries(Object.entries(savedProps).filter(([key]) => allowedKeys.has(key)))
          const deviceDefaults = getComponentPropsForDevice(definition, frame.device!)
          const legacyGenericValues: Record<string, string> = {
            label: definition.name,
            title: definition.name,
            description: '컴포넌트 설명을 입력하세요.',
            options: '첫 번째\n두 번째\n세 번째',
            placeholder: '내용을 입력하세요',
          }
          const migratedProps = Object.fromEntries(Object.entries(props).map(([key, value]) => [
            key,
            legacyGenericValues[key] === value && deviceDefaults[key] ? deviceDefaults[key] : value,
          ]))
          const allowedRegions = FRAME_REGIONS[frame.device!]
          const region = typeof item.region === 'string' && allowedRegions.includes(item.region as CanvasRegion)
            ? item.region as CanvasRegion
            : defaultRegionForComponent(componentId, frame.device!)
          return [{ instanceId: item.instanceId, componentId, region, props: { ...deviceDefaults, ...migratedProps }, hidden: item.hidden === true }]
        })
        : [];
      const layout = frame.device === 'desktop' && (frame.layout === 'grid-2' || frame.layout === 'grid-3') ? frame.layout : 'stack';
      return [{ ...frame, id: frame.id, name: frame.name, device: frame.device, items, layout }];
    });
    return frames.length > 0 ? frames : null;
  } catch {
    return null;
  }
}

export default function BuilderView({ onBack }: BuilderViewProps) {
  const [frames, setFramesState] = useState<CanvasFrame[]>(() => [{
    id: 'frame-1',
    name: 'Mobile 1',
    device: 'mobile',
    items: [],
  }]);
  const [activeFrameId, setActiveFrameId] = useState<string>(() => frames[0]?.id ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverCanvasId, setDragOverCanvasId] = useState<string | null>(null);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('components');
  const [previewMode, setPreviewMode] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [canvasView, setCanvasView] = useState({ x: 36, y: 36, zoom: 1 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiComposeState, setAiComposeState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [aiComposeMessage, setAiComposeMessage] = useState('');
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const panSessionRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const undoStackRef = useRef<CanvasFrame[][]>([]);
  const redoStackRef = useRef<CanvasFrame[][]>([]);

  const setFrames = useCallback((next: React.SetStateAction<CanvasFrame[]>) => {
    setFramesState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      if (resolved === current) return current;
      undoStackRef.current = [...undoStackRef.current.slice(-99), current];
      redoStackRef.current = [];
      return resolved;
    });
  }, []);

  const undo = useCallback(() => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    setFramesState((current) => {
      redoStackRef.current.push(current);
      return previous;
    });
    setSelectedId(null);
  }, []);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    setFramesState((current) => {
      undoStackRef.current.push(current);
      return next;
    });
    setSelectedId(null);
  }, []);

  const activeFrame = frames.find((frame) => frame.id === activeFrameId) ?? null;
  const activeDevice: FrameDevice = activeFrame?.device ?? 'mobile';
  const items = activeFrame?.items ?? [];

  useEffect(() => {
    const currentValue = window.localStorage.getItem(PLAYGROUND_STORAGE_KEY);
    const legacyValue = LEGACY_PLAYGROUND_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean) ?? null;
    const restored = restoreFrames(currentValue ?? legacyValue, !currentValue);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (restored) {
        setFramesState(restored);
        setActiveFrameId(restored[0].id);
      }
      setPersistenceReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!persistenceReady) return;
    try {
      window.localStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(frames));
    } catch {
      // Private browsing or storage quotas must not interrupt editing.
    }
  }, [frames, persistenceReady]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.code !== 'Space' || target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setSpacePressed(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePressed(false);
    };
    const handleBlur = () => {
      setSpacePressed(false);
      setIsPanning(false);
      panSessionRef.current = null;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleCanvasWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      setCanvasView((current) => {
        const factor = event.deltaY > 0 ? 0.9875 : 1 / 0.9875;
        const zoom = Math.min(4, Math.max(0.15, current.zoom * factor));
        const ratio = zoom / current.zoom;
        return {
          zoom,
          x: pointerX - (pointerX - current.x) * ratio,
          y: pointerY - (pointerY - current.y) * ratio,
        };
      });
      return;
    }

    setCanvasView((current) => ({
      ...current,
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }));
  }, []);

  const handleCanvasPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!spacePressed || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
    panSessionRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }, [spacePressed]);

  const handleCanvasPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - session.x;
    const deltaY = event.clientY - session.y;
    panSessionRef.current = { ...session, x: event.clientX, y: event.clientY };
    setCanvasView((current) => ({ ...current, x: current.x + deltaX, y: current.y + deltaY }));
  }, []);

  const handleCanvasPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (panSessionRef.current?.pointerId !== event.pointerId) return;
    panSessionRef.current = null;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const setItems = useCallback((next: React.SetStateAction<CanvasItem[]>) => {
    setFrames((previousFrames) => previousFrames.map((frame) => {
      if (frame.id !== activeFrameId) return frame;
      const nextItems = typeof next === 'function' ? next(frame.items) : next;
      return { ...frame, items: nextItems };
    }));
  }, [activeFrameId, setFrames]);

  const focusCanvasFrame = (targetFrame: CanvasFrame, frameList: CanvasFrame[] = frames) => {
    const targetIndex = frameList.findIndex((frame) => frame.id === targetFrame.id);
    const offset = frameList.slice(0, Math.max(0, targetIndex)).reduce((sum, frame) => (
      sum + FRAME_DIMENSIONS[frame.device].width * FRAME_DIMENSIONS[frame.device].scale + 32
    ), 0);
    const zoom = targetFrame.device === 'desktop' ? 0.45 : 1;
    const desiredX = targetFrame.device === 'desktop' ? 12 : 36;
    setCanvasView({
      zoom,
      x: desiredX - zoom * (24 + offset),
      y: 32 - zoom * 24,
    });
    setActiveFrameId(targetFrame.id);
    setSelectedId(null);
  };

  const togglePreviewMode = () => {
    setPreviewMode((current) => !current);
    setSelectedId(null);
  };

  const setFrameLayout = (layout: 'stack' | 'grid-2' | 'grid-3') => {
    if (!activeFrame || activeFrame.device !== 'desktop') return;
    setFrames((previous) => previous.map((frame) => frame.id === activeFrame.id ? { ...frame, layout } : frame));
  };

  const addFrame = (device: FrameDevice = activeDevice) => {
    const frame = createFrame(device);
    const nextFrames = [...frames, frame];
    setFrames(nextFrames);
    focusCanvasFrame(frame, nextFrames);
  };

  const selectFrameDevice = (device: FrameDevice) => {
    if (activeFrame?.device === device) return;
    const existingFrame = frames.find((frame) => frame.device === device);
    if (existingFrame) {
      focusCanvasFrame(existingFrame);
    } else {
      const frame = createFrame(device);
      const nextFrames = [...frames, frame];
      setFrames(nextFrames);
      focusCanvasFrame(frame, nextFrames);
    }
    setTemplatePickerOpen(false);
  };

  const deleteActiveFrame = () => {
    if (!activeFrame) return;
    if (!window.confirm(`${activeFrame.name} 프레임을 삭제할까요?`)) return;
    const remaining = frames.filter((frame) => frame.id !== activeFrame.id);
    setFrames(remaining);
    if (remaining[0]) focusCanvasFrame(remaining[0], remaining);
    else {
      setActiveFrameId('');
      setSelectedId(null);
    }
  };

  const applyStructureTemplate = (template: StructureTemplate) => {
    const nextItems = createTemplateItems(template);
    if (items.length > 0 && !window.confirm('현재 프레임의 구성 대신 선택한 구조 템플릿을 적용할까요?')) return;

    if (!activeFrame) {
      const frame = createFrame(template.device, nextItems);
      frame.name = `${FRAME_DIMENSIONS[template.device].label} · ${template.name}`;
      frame.templateId = template.id;
      setFrames((previousFrames) => [...previousFrames, frame]);
      setActiveFrameId(frame.id);
    } else {
      setFrames((previousFrames) => previousFrames.map((frame) => (
        frame.id === activeFrame.id
          ? {
              ...frame,
              device: template.device,
              name: `${FRAME_DIMENSIONS[template.device].label} · ${template.name}`,
              items: nextItems,
              templateId: template.id,
            }
          : frame
      )));
    }
    setSelectedId(null);
    setTemplatePickerOpen(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const removeItem = useCallback(
    (instanceId: string) => {
      setFrames((previous) => previous.map((frame) => ({
        ...frame,
        items: frame.items.filter((item) => item.instanceId !== instanceId),
      })));
      if (selectedId === instanceId) setSelectedId(null);
    },
    [selectedId, setFrames],
  );

  const updateProp = useCallback((instanceId: string, key: string, value: string) => {
    setFrames((previous) => previous.map((frame) => ({
      ...frame,
      items: frame.items.map((item) => item.instanceId === instanceId
        ? { ...item, props: { ...item.props, [key]: value } }
        : item),
    })));
  }, [setFrames]);

  const updateRegion = useCallback((instanceId: string, region: CanvasRegion) => {
    setFrames((previous) => previous.map((frame) => ({
      ...frame,
      items: frame.items.map((item) => item.instanceId === instanceId ? { ...item, region } : item),
    })));
  }, [setFrames]);

  const resetItem = useCallback((instanceId: string) => {
    setFrames((previous) => previous.map((frame) => ({
      ...frame,
      items: frame.items.map((item) => {
        if (item.instanceId !== instanceId) return item;
        const definition = getComponentById(item.componentId);
        return definition ? { ...item, props: getComponentPropsForDevice(definition, frame.device) } : item;
      }),
    })));
  }, [setFrames]);

  const toggleItemVisibility = useCallback((instanceId: string) => {
    setFrames((previous) => previous.map((frame) => ({
      ...frame,
      items: frame.items.map((item) => item.instanceId === instanceId ? { ...item, hidden: !item.hidden } : item),
    })));
  }, [setFrames]);

  const moveItemInRegion = useCallback((instanceId: string, direction: -1 | 1) => {
    setFrames((previous) => previous.map((frame) => {
      const sourceIndex = frame.items.findIndex((item) => item.instanceId === instanceId);
      if (sourceIndex < 0) return frame;
      const source = frame.items[sourceIndex];
      const regionIndices = frame.items.flatMap((item, index) => item.region === source.region ? [index] : []);
      const regionIndex = regionIndices.indexOf(sourceIndex);
      const targetIndex = regionIndices[regionIndex + direction];
      return targetIndex === undefined ? frame : { ...frame, items: arrayMove(frame.items, sourceIndex, targetIndex) };
    }));
  }, [setFrames]);

  const duplicateItem = useCallback((instanceId: string) => {
    const owner = frames.find((frame) => frame.items.some((item) => item.instanceId === instanceId));
    const source = owner?.items.find((item) => item.instanceId === instanceId);
    if (!owner || !source) return;
    const duplicate = { ...source, instanceId: newInstanceId(), props: { ...source.props }, hidden: false };
    setFrames((previous) => previous.map((frame) => {
      if (frame.id !== owner.id) return frame;
      const sourceIndex = frame.items.findIndex((item) => item.instanceId === instanceId);
      const nextItems = [...frame.items];
      nextItems.splice(sourceIndex + 1, 0, duplicate);
      return { ...frame, items: nextItems };
    }));
    setActiveFrameId(owner.id);
    setSelectedId(duplicate.instanceId);
  }, [frames, setFrames]);

  useEffect(() => {
    const handleEditorShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editingText = target?.matches('input, textarea, select, [contenteditable="true"]');
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if (editingText) return;
      if (command && event.key.toLowerCase() === 'd' && selectedId) {
        event.preventDefault();
        duplicateItem(selectedId);
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        removeItem(selectedId);
      } else if (event.key === 'Escape') {
        setSelectedId(null);
      } else if (event.key === '/') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="AI 화면 편집 요청"]')?.focus();
      }
    };
    window.addEventListener('keydown', handleEditorShortcut);
    return () => window.removeEventListener('keydown', handleEditorShortcut);
  }, [duplicateItem, redo, removeItem, selectedId, undo]);

  const handleAiCompose = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = aiPrompt.trim();
    if (!prompt || !activeFrame || aiComposeState === 'loading') return;

    setAiComposeState('loading');
    setAiComposeMessage('요청을 컴포넌트 구조로 바꾸는 중…');
    try {
      const geminiKey = window.localStorage.getItem('aide_gemini_api_key') ?? '';
      const response = await fetch('/api/playground-compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(geminiKey ? { 'x-gemini-key': geminiKey } : {}),
        },
        body: JSON.stringify({
          prompt,
          device: activeFrame.device,
          currentItems: activeFrame.items.filter((item) => !item.hidden).map((item) => ({ componentId: item.componentId, props: item.props })),
        }),
      });
      const result = await response.json() as {
        error?: string;
        mode?: 'append' | 'replace';
        summary?: string;
        items?: Array<{ componentId: string; props?: Record<string, string> }>;
      };
      if (!response.ok || !result.items?.length) throw new Error(result.error ?? '적용할 컴포넌트가 없습니다.');

      const generatedItems = result.items.flatMap((item) => {
        const definition = getComponentById(item.componentId);
        if (!definition || !supportsDevice(definition, activeFrame.device)) return [];
        return [{
          instanceId: newInstanceId(),
          componentId: definition.id,
          region: defaultRegionForComponent(definition.id, activeFrame.device),
          props: { ...getComponentPropsForDevice(definition, activeFrame.device), ...(item.props ?? {}) },
        } satisfies CanvasItem];
      });
      if (generatedItems.length === 0) throw new Error('현재 화면에 적용할 수 있는 컴포넌트가 없습니다.');

      setFrames((previous) => previous.map((frame) => {
        if (frame.id !== activeFrame.id) return frame;
        const nextItems = result.mode === 'replace' ? generatedItems : [...frame.items, ...generatedItems];
        const seenFixedBottom = new Set<string>();
        return {
          ...frame,
          items: nextItems.filter((item) => {
            if (getComponentById(item.componentId)?.canvasBehavior !== 'fixed-bottom') return true;
            if (seenFixedBottom.has('fixed-bottom')) return false;
            seenFixedBottom.add('fixed-bottom');
            return true;
          }),
        };
      }));
      setSelectedId(generatedItems.at(-1)?.instanceId ?? null);
      setAiPrompt('');
      setAiComposeState('success');
      setAiComposeMessage(result.summary ?? `${generatedItems.length}개 컴포넌트를 적용했습니다.`);
    } catch (error) {
      setAiComposeState('error');
      setAiComposeMessage(error instanceof Error ? error.message : 'AI 편집에 실패했습니다.');
    }
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Track which canvas item a palette drag is hovering over
    if (String(event.active.id).startsWith('palette-')) {
      setDragOverCanvasId(event.over ? String(event.over.id) : null);
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = String(active.id);

      setActiveDragId(null);
      setDragOverCanvasId(null);

      // Palette item dropped onto canvas
      if (activeId.startsWith('palette-')) {
        const componentId = active.data.current?.componentId as string | undefined;
        if (!componentId) return;
        const def = getComponentById(componentId);
        if (!def || !over) return;

        const overId = String(over.id);
        const slotMatch = /^insert:(.+):([^:]+):(\d+)$/.exec(overId);
        const targetFrameId = slotMatch?.[1] ?? activeFrameId;
        const targetFrame = frames.find((frame) => frame.id === targetFrameId);
        if (!targetFrame || !supportsDevice(def, targetFrame.device)) return;

        if (def.canvasBehavior === 'fixed-bottom') {
          const existingFixedItem = targetFrame.items.find((item) => getComponentById(item.componentId)?.canvasBehavior === 'fixed-bottom');
          if (existingFixedItem) {
            setActiveFrameId(targetFrameId);
            setSelectedId(existingFixedItem.instanceId);
            return;
          }
        }

        const targetRegion = slotMatch?.[2] as CanvasRegion | undefined ?? targetFrame.items.find((item) => item.instanceId === overId)?.region ?? defaultRegionForComponent(def.id, targetFrame.device);
        const regionItems = targetFrame.items.filter((item) => item.region === targetRegion);
        const relativeIndex = slotMatch ? Number(slotMatch[3]) : regionItems.findIndex((item) => item.instanceId === overId);
        const anchor = regionItems[relativeIndex];
        const lastRegionIndex = targetFrame.items.reduce((last, item, index) => item.region === targetRegion ? index : last, -1);
        const insertIndex = anchor ? targetFrame.items.indexOf(anchor) : lastRegionIndex >= 0 ? lastRegionIndex + 1 : targetFrame.items.length;
        if (insertIndex < 0) return;

        const newItem: CanvasItem = {
          instanceId: newInstanceId(),
          componentId: def.id,
          region: targetRegion,
          props: getComponentPropsForDevice(def, targetFrame.device),
        };

        setFrames((previousFrames) => previousFrames.map((frame) => {
          if (frame.id !== targetFrameId) return frame;
          const nextItems = [...frame.items];
          nextItems.splice(Math.min(insertIndex, nextItems.length), 0, newItem);
          return { ...frame, items: nextItems };
        }));
        setActiveFrameId(targetFrameId);
        setSelectedId(newItem.instanceId);
        return;
      }

      // Canvas item reordering
      if (over && active.id !== over.id) {
        setItems((prev) => {
          const oldIndex = prev.findIndex((i) => i.instanceId === active.id);
          const newIndex = prev.findIndex((i) => i.instanceId === over.id);
          if (oldIndex < 0 || newIndex < 0) return prev;
          const targetRegion = prev[newIndex].region;
          const moved = prev.map((item, index) => index === oldIndex ? { ...item, region: targetRegion } : item);
          return arrayMove(moved, oldIndex, newIndex);
        });
      }
  };

  const isPaletteDrag = activeDragId?.startsWith('palette-') ?? false;
  const activePaletteDefinition = isPaletteDrag
    ? getComponentById(activeDragId!.replace('palette-', ''))
    : null;

  // Overlay content
  const overlayComponent: { componentId: string; props: Record<string, string> } | null = (() => {
    if (!activeDragId) return null;
    if (isPaletteDrag) {
      const cid = activeDragId.replace('palette-', '');
      const def = getComponentById(cid);
      return def ? { componentId: def.id, props: getComponentPropsForDevice(def, activeDevice) } : null;
    }
    const item = items.find((i) => i.instanceId === activeDragId);
    if (!item) return null;
    const def = getComponentById(item.componentId);
    return def ? { componentId: def.id, props: item.props } : null;
  })();

  const selectedItem = frames.flatMap((frame) => frame.items).find((item) => item.instanceId === selectedId) ?? null;

  const handleExport = () => {
    if (!activeFrame) return;
    const html = buildExportHTML(activeFrame);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aide-playground-export.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: AIDE.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
        color: AIDE.text,
        zIndex: 50,
      }}
    >
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div style={{ height: 58, padding: `0 var(--aui-space-4)`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)", background: AIDE.surface, borderBottom: `1px solid ${AIDE.border}`, position: 'relative' }}>
        <Button type="button" onClick={onBack} title="돌아가기" aria-label="돌아가기" variant="outline" size="icon">
          <ArrowLeft size={16} />
        </Button>
        <div style={{ minWidth: 180, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
            <span style={{ fontSize: "var(--aui-type-label-size)", fontWeight: "var(--aui-weight-bold)", color: AIDE.text }}>Playground</span>
            <Badge variant="info">WONHEE UI</Badge>
          </div>
          <div style={{ marginTop: 2, fontSize: "var(--aui-type-meta-size)", color: AIDE.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeFrame ? `${activeFrame.name} · ${items.length}개 컴포넌트${persistenceReady ? ' · 자동 저장' : ''}` : '새 프레임을 추가하세요'}
          </div>
        </div>

        <SegmentedControl
          label="프레임 기기"
          value={activeFrame?.device ?? activeDevice}
          onValueChange={(device) => selectFrameDevice(device as FrameDevice)}
          className="min-w-[220px]"
          options={([
            { value: 'mobile', label: <span className="inline-flex items-center gap-1.5"><Smartphone size={14}/>Mobile <small>{FRAME_DIMENSIONS.mobile.width}</small></span> },
            { value: 'desktop', label: <span className="inline-flex items-center gap-1.5"><Monitor size={14}/>Desktop <small>{FRAME_DIMENSIONS.desktop.width}</small></span> },
          ])}
        />

        {activeFrame?.device === 'desktop' ? (
          <SegmentedControl
            label="PC 레이아웃"
            value={activeFrame.layout ?? 'stack'}
            onValueChange={(layout) => setFrameLayout(layout as 'stack' | 'grid-2' | 'grid-3')}
            options={[
              { value: 'stack', label: '1열' },
              { value: 'grid-2', label: '2열' },
              { value: 'grid-3', label: '3열' },
            ]}
          />
        ) : null}

        <Button type="button" onClick={() => setTemplatePickerOpen((open) => !open)} aria-expanded={templatePickerOpen} variant={templatePickerOpen ? 'secondary' : 'outline'} size="touch">
          <LayoutTemplate size={14} />
          구조 템플릿
          <ChevronDown size={13} />
        </Button>

        <div style={{ width: 1, height: 24, background: AIDE.border }} />
        <Button type="button" onClick={undo} title="실행 취소 (⌘Z)" aria-label="실행 취소" variant="ghost" size="icon">
          <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>↶</span>
        </Button>
        <Button type="button" onClick={redo} title="다시 실행 (⇧⌘Z)" aria-label="다시 실행" variant="ghost" size="icon">
          <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>↷</span>
        </Button>
        <Button type="button" onClick={() => addFrame()} title="같은 크기의 프레임 추가" aria-label="프레임 추가" variant="outline" size="icon">
          <Plus size={15} />
        </Button>
        <Button type="button" onClick={deleteActiveFrame} disabled={!activeFrame} title="선택한 프레임 삭제" aria-label="프레임 삭제" variant="outline" size="icon">
          <Trash2 size={14} />
        </Button>
        <Button type="button" onClick={() => { if (items.length === 0 || window.confirm('선택한 프레임의 컴포넌트를 모두 지울까요?')) { setItems([]); setSelectedId(null); } }} disabled={items.length === 0} variant="ghost" size="dense">
          초기화
        </Button>
        <Button type="button" onClick={handleExport} disabled={items.length === 0} size="touch">
          <Download size={14} />
          HTML
        </Button>
        <Button type="button" onClick={togglePreviewMode} variant={previewMode ? 'default' : 'outline'} size="touch">
          {previewMode ? '편집으로 돌아가기' : '미리보기'}
        </Button>

        {templatePickerOpen ? (
          <StructureTemplatePicker
            device={activeDevice}
            activeTemplateId={activeFrame?.templateId}
            onApply={applyStructureTemplate}
            onClose={() => setTemplatePickerOpen(false)}
          />
        ) : null}
      </div>

      {/* ── Main 3-Panel Layout ──────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveDragId(null);
          setDragOverCanvasId(null);
        }}
      >
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: component library */}
          <ComponentLibraryPanel
            tab={libraryTab}
            onTabChange={setLibraryTab}
            device={activeDevice}
            frames={frames}
            activeFrameId={activeFrameId}
            selectedId={selectedId}
            onSelectFrame={(frameId) => {
              const frame = frames.find((candidate) => candidate.id === frameId);
              if (frame) focusCanvasFrame(frame);
            }}
            onSelectItem={(frameId, instanceId) => {
              setActiveFrameId(frameId);
              setSelectedId(instanceId);
            }}
            onToggleItem={toggleItemVisibility}
            onMoveItem={moveItemInRegion}
          />

          {/* Center: multi-frame canvas */}
          <div
            ref={canvasViewportRef}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              isolation: 'isolate',
              backgroundColor: AIDE.bg,
              cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : 'default',
              touchAction: 'none',
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setSelectedId(null);
            }}
            onWheel={handleCanvasWheel}
            onPointerDownCapture={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
          >
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
              <DotField />
            </div>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1,
                padding: "var(--aui-space-6)",
                transform: `translate(${canvasView.x}px, ${canvasView.y}px) scale(${canvasView.zoom})`,
                transformOrigin: 'top left',
                transition: isPanning ? 'none' : 'transform 0.18s ease-out',
                willChange: 'transform',
              }}
            >
              {frames.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center' }} onClick={(event) => event.stopPropagation()}>
                <div style={{ fontSize: "var(--aui-type-label-size)", fontWeight: "var(--aui-weight-bold)", color: AIDE.text }}>새 프레임 추가</div>
                <div style={{ marginTop: 6, fontSize: "var(--aui-type-caption-size)", color: AIDE.textMuted }}>
                  작업할 화면 크기를 선택하세요
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: "var(--aui-space-2)" }}>
                  <button
                    type="button"
                    onClick={() => addFrame('mobile')}
                    style={{ height: 36, padding: `0 var(--aui-space-4)`, border: `1px solid ${AIDE.border}`, borderRadius: "var(--aui-radius-sm)", background: AIDE.surface, color: AIDE.text, display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", cursor: 'pointer' }}
                  >
                    <Smartphone size={14} /> 375×812
                  </button>
                  <button
                    type="button"
                    onClick={() => addFrame('desktop')}
                    style={{ height: 36, padding: `0 var(--aui-space-4)`, border: `1px solid ${AIDE.border}`, borderRadius: "var(--aui-radius-sm)", background: AIDE.surface, color: AIDE.text, display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", cursor: 'pointer' }}
                  >
                    <Monitor size={14} /> 1920×1080
                  </button>
                </div>
              </div>
              ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: "var(--aui-space-8)", minWidth: 'max-content' }}>
                {frames.map((frame) => {
                  const config = FRAME_DIMENSIONS[frame.device];
                  const layoutColumns = frame.device === 'desktop' ? frame.layout === 'grid-3' ? 3 : frame.layout === 'grid-2' ? 2 : 1 : 1;
                  const hasNavigation = frame.items.some((item) => item.region === 'navigation' && !item.hidden);
                  const hasAside = frame.items.some((item) => item.region === 'aside' && !item.hidden);
                  const active = frame.id === activeFrameId;
                  const canAcceptPalette = Boolean(
                    isPaletteDrag
                    && activePaletteDefinition
                    && supportsDevice(activePaletteDefinition, frame.device),
                  );
                  const displayWidth = config.width * config.scale;
                  const displayHeight = config.height * config.scale;
                  return (
                    <div
                      key={frame.id}
                      style={{ width: displayWidth, flexShrink: 0 }}
                      onClick={(event) => {
                        const itemElement = (event.target as HTMLElement).closest<HTMLElement>('[data-canvas-item-id]');
                        if (itemElement?.dataset.canvasItemId) {
                          event.stopPropagation();
                          setActiveFrameId(frame.id);
                          setSelectedId(itemElement.dataset.canvasItemId);
                          return;
                        }
                        event.stopPropagation();
                        if (!active) {
                          focusCanvasFrame(frame);
                        }
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          focusCanvasFrame(frame);
                        }}
                        style={{
                          height: 28,
                          maxWidth: '100%',
                          marginBottom: 8,
                          padding: `0 var(--aui-space-1)`,
                          border: 'none',
                          background: 'transparent',
                          color: active ? AIDE.primary : AIDE.textMuted,
                          display: 'flex',
                          alignItems: 'center',
                          gap: "var(--aui-space-2)",
                          fontSize: "var(--aui-type-caption-size)",
                          fontWeight: active ? 700 : 500,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {frame.device === 'mobile' ? <Smartphone size={13} /> : <Monitor size={13} />}
                        <span>{frame.name}</span>
                        <span style={{ color: AIDE.textSubtle, fontWeight: "var(--aui-weight-regular)" }}>
                          {config.width} × {config.height}
                        </span>
                      </button>
                      <div style={{ width: displayWidth, minHeight: displayHeight, position: 'relative' }}>
                        <div
                          style={{
                            width: config.width,
                            minHeight: config.height,
                            height: 'auto',
                            position: 'relative',
                            transform: `scale(${config.scale})`,
                            transformOrigin: 'top left',
                            background: 'var(--aui-on-dark)',
                            border: `${active ? 2 : 1}px solid ${active ? AIDE.primary : AIDE.border}`,
                            borderRadius: frame.device === 'mobile' ? 24 : 4,
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                            display: 'grid',
                            gridTemplateRows: frame.device === 'mobile' ? 'auto minmax(0, 1fr) auto' : 'auto minmax(0, 1fr)',
                            gridTemplateColumns: frame.device === 'mobile' ? '1fr' : `${hasNavigation ? '260px' : '0'} minmax(0, 1fr) ${hasAside ? '320px' : '0'}`,
                            gridTemplateAreas: frame.device === 'mobile' ? '"header" "content" "bottom"' : '"header header header" "navigation main aside"',
                          }}
                        >
                          {FRAME_REGIONS[frame.device].map((region) => (
                            <FrameRegion key={region} frame={frame} region={region} active={active} previewMode={previewMode} canAcceptPalette={Boolean(canAcceptPalette && activePaletteDefinition && defaultRegionForComponent(activePaletteDefinition.id, frame.device) === region)} selectedId={selectedId} dragOverCanvasId={isPaletteDrag ? dragOverCanvasId : null} layoutColumns={layoutColumns} onSelect={(instanceId) => { setActiveFrameId(frame.id); setSelectedId(instanceId); }} />
                          ))}
                          {frame.items.every((item) => item.hidden) && active && !previewMode && !isPaletteDrag ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: AIDE.textSubtle }}>
                              <div style={{ textAlign: 'center' }}><LayoutTemplate size={22} /><div style={{ marginTop: 8, fontSize: 'var(--aui-type-caption-size)' }}>왼쪽 패널에서 컴포넌트를 드래그하세요</div></div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            <div
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 32,
                zIndex: 2,
                display: 'grid',
                gridTemplateColumns: '1fr minmax(320px, 620px) 1fr',
                alignItems: 'end',
                gap: 12,
                pointerEvents: 'none',
              }}
            >
              <form
                onSubmit={handleAiCompose}
                style={{
                  gridColumn: 2,
                  minWidth: 0,
                  height: 56,
                  padding: '6px 6px 6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: `1px solid ${AIDE.border}`,
                  borderRadius: 18,
                  background: 'var(--aui-on-dark-strong)',
                  boxShadow: 'var(--aui-shadow-raised)',
                  pointerEvents: 'auto',
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <Sparkles size={18} style={{ flexShrink: 0, color: AIDE.primary }} />
                <input
                  value={aiPrompt}
                  onChange={(event) => {
                    setAiPrompt(event.target.value);
                    if (aiComposeState !== 'loading') {
                      setAiComposeState('idle');
                      setAiComposeMessage('');
                    }
                  }}
                  disabled={aiComposeState === 'loading'}
                  placeholder={`${activeFrame?.name ?? '현재 화면'}을 어떻게 구성할까요?`}
                  aria-label="AI 화면 편집 요청"
                  style={{
                    minWidth: 0,
                    flex: 1,
                    height: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: AIDE.text,
                    fontFamily: 'inherit',
                    fontSize: 'var(--aui-type-compact-size)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!aiPrompt.trim() || aiComposeState === 'loading'}
                  title="AI로 화면 편집"
                  aria-label="AI로 화면 편집"
                  style={{
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    border: 'none',
                    borderRadius: 13,
                    background: aiPrompt.trim() && aiComposeState !== 'loading' ? AIDE.primary : AIDE.surfaceHover,
                    color: aiPrompt.trim() && aiComposeState !== 'loading' ? 'var(--aui-on-primary)' : AIDE.textSubtle,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: aiPrompt.trim() && aiComposeState !== 'loading' ? 'pointer' : 'default',
                  }}
                >
                  <ArrowUp size={18} />
                </button>
              </form>
              {aiComposeMessage ? (
                <div
                  role={aiComposeState === 'error' ? 'alert' : 'status'}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 68,
                    transform: 'translateX(-50%)',
                    maxWidth: 620,
                    padding: '7px 12px',
                    border: `1px solid ${aiComposeState === 'error' ? 'var(--aui-negative)' : AIDE.border}`,
                    borderRadius: 999,
                    background: 'var(--aui-on-dark-strong)',
                    color: aiComposeState === 'error' ? 'var(--aui-negative)' : AIDE.textMuted,
                    boxShadow: 'var(--aui-shadow-raised)',
                    fontSize: 'var(--aui-type-meta-size)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    pointerEvents: 'auto',
                  }}
                >
                  {aiComposeMessage}
                </div>
              ) : null}
            </div>
          </div>

          {/* Right: selected component details */}
          <ComponentDetailsPanel
            selectedItem={previewMode ? null : selectedItem}
            activeFrame={previewMode ? null : activeFrame}
            device={activeDevice}
            onPropChange={updateProp}
            onRegionChange={updateRegion}
            onRemove={removeItem}
            onReset={resetItem}
            onFrameNameChange={(name) => setFrames((previous) => previous.map((frame) => frame.id === activeFrameId ? { ...frame, name } : frame))}
            onFrameLayoutChange={(layout) => setFrames((previous) => previous.map((frame) => frame.id === activeFrameId ? { ...frame, layout } : frame))}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {overlayComponent ? <DragPreview componentId={overlayComponent.componentId} props={overlayComponent.props} device={activeDevice} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
