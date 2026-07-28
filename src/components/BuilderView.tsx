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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Focus,
  Hand,
  LayoutTemplate,
  Maximize2,
  Monitor,
  PanelLeft,
  PanelsTopLeft,
  Plus,
  Rows3,
  Smartphone,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from '@/components/ui/material-icon';
import {
  COMPONENT_DEFINITIONS,
  CATEGORY_LABELS,
  getComponentById,
  getComponentPropsForDevice,
  supportsDevice,
  BuilderDevice,
  ComponentDefinition,
  PropType,
} from '@/lib/builder-components';
import { AIDE_UI, AIDE_UI_RAW } from '@/lib/aide-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ComponentPreview } from '@/components/aide-docs/ComponentPreview';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CanvasItem {
  instanceId: string;
  componentId: string;
  props: Record<string, string>;
}

type FrameDevice = BuilderDevice;

interface CanvasFrame {
  id: string;
  name: string;
  device: FrameDevice;
  items: CanvasItem[];
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
  desktop: { width: 1920, height: 1080, label: 'PC', scale: 0.36 },
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

// ─── Inspector Grid Thumbnail ─────────────────────────────────────────────────

// 2-column grid in the component library panel.
const GRID_CELL_W = 124;
const GRID_CELL_H = 60;

function GridPaletteItem({ def, device }: { def: ComponentDefinition; device: FrameDevice }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${def.id}`,
    data: { source: 'palette', componentId: def.id },
  });
  const isDesktopPreview = def.id === 'pc-global-nav' || def.id === 'pc-workspace';
  const previewWidth = isDesktopPreview ? 1920 : 375;
  const previewScale = GRID_CELL_W / previewWidth;

  return (
    <div
      ref={setNodeRef}
      title={`${def.name} 드래그하여 추가`}
      className="hover:!border-[var(--aui-primary)] hover:!shadow-[0_0_0_1px_var(--aui-primary-muted)]"
      style={{
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
          width: GRID_CELL_W,
          height: GRID_CELL_H,
          overflow: 'hidden',
          background: 'var(--aui-page)',
          cursor: 'grab',
          touchAction: 'none',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: previewWidth,
            minHeight: GRID_CELL_H / previewScale,
            transform: `scale(${previewScale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
            background: 'var(--aui-on-dark)',
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

function CanvasEmptyZone({ frameId }: { frameId: string }) {
  const { isOver, setNodeRef } = useDroppable({ id: `insert:${frameId}:0` });

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: `var(--aui-space-10) var(--aui-space-6)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: "var(--aui-space-3)",
        textAlign: 'center',
        border: isOver
          ? `2px dashed ${AIDE.primary}`
          : '2px dashed var(--aui-shadow-medium)',
        borderRadius: "var(--aui-radius-control)",
        margin: `var(--aui-space-5) var(--aui-space-4)`,
        background: isOver ? AIDE.primarySoft : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: "var(--aui-radius-sm)", background: isOver ? 'var(--aui-primary-muted)' : 'var(--aui-surface-muted)', border: `1px solid ${isOver ? 'var(--aui-primary-muted)' : AIDE.border}`, color: isOver ? AIDE.primary : AIDE.textSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        {isOver ? '여기에 놓으세요' : '왼쪽 패널에서 컴포넌트를 드래그하세요'}
      </p>
    </div>
  );
}

// ─── Sortable Canvas Item ─────────────────────────────────────────────────────

function PaletteDropSlot({ frameId, index, device }: { frameId: string; index: number; device: FrameDevice }) {
  const { isOver, setNodeRef } = useDroppable({ id: `insert:${frameId}:${index}` });

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
  onRemove,
}: {
  item: CanvasItem;
  device: FrameDevice;
  isSelected: boolean;
  showInsertBefore: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const def = getComponentById(item.componentId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.instanceId,
  });

  const isFixedBottom = def?.canvasBehavior === 'fixed-bottom';
  const isModal = def?.canvasBehavior === 'modal';
  const isOverlay = isFixedBottom || isModal;
  const isStack = def?.canvasBehavior === 'stack' || !def?.canvasBehavior;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    position: isOverlay ? 'absolute' : 'relative',
    ...(isFixedBottom ? { left: 0, right: 0, bottom: 0, zIndex: 40 } : {}),
    ...(isModal ? { inset: 0, zIndex: 50 } : {}),
    ...(isStack ? { margin: 'var(--aui-space-4)' } : {}),
  };

  if (!def) return null;

  return (
    <div ref={setNodeRef} style={style}>
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

      {/* Action bar (only when selected) */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 20,
            display: 'flex',
          }}
        >
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 28,
              height: 28,
              background: AIDE.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              fontSize: "var(--aui-type-compact-size)",
              color: 'var(--aui-on-dark)',
            }}
            title="드래그해서 순서 변경"
          >
            ⠿
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              width: 28,
              height: 28,
              background: 'var(--aui-negative)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: "var(--aui-type-caption-size)",
              color: 'var(--aui-on-dark)',
            }}
            title="삭제"
          >
            ✕
          </button>
        </div>
      )}

      {/* Canonical React component shared with /aide-ui. */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        style={{ userSelect: 'none', height: isModal ? '100%' : undefined }}
      >
        <ComponentPreview id={def.id} props={item.props} device={device} context="playground" />
      </div>
    </div>
  );
}

function StaticCanvasItem({ item, device }: { item: CanvasItem; device: FrameDevice }) {
  const def = getComponentById(item.componentId);
  if (!def) return null;
  const isFixedBottom = def.canvasBehavior === 'fixed-bottom';
  const isModal = def.canvasBehavior === 'modal';
  const isStack = def.canvasBehavior === 'stack' || !def.canvasBehavior;

  return (
    <div
      style={{
        ...(isFixedBottom ? { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40 } as React.CSSProperties : {}),
        ...(isModal ? { position: 'absolute', inset: 0, zIndex: 50 } as React.CSSProperties : {}),
        ...(isStack ? { margin: 'var(--aui-space-4)' } : {}),
      }}
    >
      <ComponentPreview id={def.id} props={item.props} device={device} context="playground" />
    </div>
  );
}

// ─── Left component library ──────────────────────────────────────────────────

type LibraryTab = 'components' | 'ai';

function ComponentLibraryPanel({
  tab,
  onTabChange,
  device,
}: {
  tab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  device: FrameDevice;
}) {
  const [prompt, setPrompt] = useState('');
  const activeDefinitions = COMPONENT_DEFINITIONS.filter((component) => {
    return supportsDevice(component, device);
  });
  const categories = Array.from(new Set(activeDefinitions.map((c) => c.category)));

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
        {(['components', 'ai'] as LibraryTab[]).map((t) => {
          const label = t === 'components' ? '컴포넌트' : 'AI Prompt';
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
          {categories.map((cat) => {
            const defs = activeDefinitions.filter((c) => c.category === cat);
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
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
                  {CATEGORY_LABELS[cat] ?? cat}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: "var(--aui-space-2)",
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
      ) : tab === 'ai' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: "var(--aui-space-4)", display: 'flex', flexDirection: 'column', gap: "var(--aui-space-3)" }}>
          <div>
            <div
              style={{
                fontSize: "var(--aui-type-caption-size)",
                fontWeight: "var(--aui-weight-bold)",
                color: AIDE.text,
                marginBottom: 6,
              }}
            >
              자연어로 UI 만들기
            </div>
            <p
              style={{
                margin: 0,
                color: AIDE.textMuted,
                fontSize: "var(--aui-type-caption-size)",
                lineHeight: "var(--aui-leading-relaxed)",
              }}
            >
              wonhee-design.md와 wonhee-product-ui.md의 컴포넌트 카탈로그를 기준으로 시안을 생성합니다.
            </p>
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={'예: 모바일 예약 신청 화면을 만들어줘. 상단에는 진행 단계, 본문에는 날짜/시간 선택, 하단에는 신청하기 버튼을 넣어줘.'}
            style={{
              minHeight: 144,
              resize: 'vertical',
              background: AIDE.surfaceHover,
              border: `1px solid ${AIDE.border}`,
              borderRadius: "var(--aui-radius-sm)",
              color: AIDE.text,
              padding: "var(--aui-space-3)",
              fontSize: "var(--aui-type-compact-size)",
              lineHeight: "var(--aui-leading-relaxed)",
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            type="button"
            disabled
            style={{
              height: 36,
              border: 'none',
              borderRadius: "var(--aui-radius-sm)",
              background: 'var(--aui-primary-muted)',
              color: 'var(--aui-primary-disabled)',
              fontSize: "var(--aui-type-compact-size)",
              fontWeight: "var(--aui-weight-bold)",
              fontFamily: 'inherit',
              cursor: 'not-allowed',
            }}
          >
            AI 시안 생성 준비 중
          </button>
          <div
            style={{
              borderTop: `1px solid ${AIDE.border}`,
              paddingTop: 12,
              color: AIDE.textMuted,
              fontSize: "var(--aui-type-caption-size)",
              lineHeight: "var(--aui-leading-relaxed)",
            }}
          >
            다음 단계에서 프롬프트를 컴포넌트 트리로 변환하고, 생성된 결과를 다시 드래그 편집할 수 있게 연결합니다.
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Right component details ─────────────────────────────────────────────────

function ComponentDetailsPanel({
  selectedItem,
  device,
  onPropChange,
}: {
  selectedItem: CanvasItem | null;
  device: BuilderDevice;
  onPropChange: (instanceId: string, key: string, value: string) => void;
}) {
  return (
    <aside
      style={{
        width: 300,
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
        상세
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedItem ? (
          <PropertiesContent item={selectedItem} device={device} onChange={onPropChange} />
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
}: {
  item: CanvasItem;
  device: BuilderDevice;
  onChange: (instanceId: string, key: string, value: string) => void;
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
          <span style={{ fontSize: "var(--aui-type-section-title-size)" }}>{def.icon}</span>
          <span style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-semibold)", color: AIDE.text }}>{def.name}</span>
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
            {device === 'mobile' ? '모바일 기본값' : 'PC 기본값'}
          </span>
        </div>
        {def.description && (
          <p style={{ margin: `var(--aui-space-2) 0 0`, color: AIDE.textMuted, fontSize: "var(--aui-type-micro-size)", lineHeight: "var(--aui-leading-normal)" }}>
            {def.description}
          </p>
        )}
        {def.source && (
          <div
            style={{
              marginTop: 9,
              padding: `var(--aui-space-2) var(--aui-space-2)`,
              border: `1px solid ${AIDE.border}`,
              borderRadius: "var(--aui-radius-sm)",
              background: AIDE.bg,
            }}
          >
            <div style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: AIDE.textMuted }}>
              {def.source.storybookTitle}
            </div>
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
          const optionLabels: Record<string, string> = {
            true: '사용',
            false: '미사용',
            horizontal: '가로',
            vertical: '세로',
          };
          const label = optionLabels[option] ?? option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              style={{
                height: 28,
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
        style={{ ...base, height: 'var(--aui-control-compact)', padding: `0 var(--aui-space-2)`, cursor: 'pointer' }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
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
        rows={3}
        style={{ ...base, padding: `var(--aui-space-2) var(--aui-space-3)`, resize: 'vertical', lineHeight: "var(--aui-leading-normal)" }}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...base, height: 32, padding: `0 var(--aui-space-3)` }}
    />
  );
}

// ─── HTML Export ──────────────────────────────────────────────────────────────

function buildExportHTML(frame: CanvasFrame): string {
  const { width, height } = FRAME_DIMENSIONS[frame.device];
  const items = frame.items;
  const body = items
    .map((item) => {
      const def = getComponentById(item.componentId);
      if (!def) return '';
      const html = def.renderHTML(item.props);
      return def.canvasBehavior === 'fixed-bottom' || def.canvasBehavior === 'modal'
        ? `<div style="position:absolute;inset:0;z-index:40;">${html}</div>`
        : html;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aide Playground Export</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" crossorigin />
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Pretendard', -apple-system, sans-serif; background: ${AIDE_UI_RAW.page}; display: flex; justify-content: center; }
    .frame { position: relative; width: ${width}px; min-height: ${height}px; background: ${AIDE_UI_RAW.surface}; overflow: hidden; }
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
const PLAYGROUND_STORAGE_KEY = 'aide:wonhee-playground:v3';
const LEGACY_PLAYGROUND_STORAGE_KEY = 'aide:wonhee-playground:v2';

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
  };
}

function createTemplateItems(template: StructureTemplate): CanvasItem[] {
  return template.items.flatMap((item) => {
    const componentId = TEMPLATE_COMPONENT_MIGRATION[item.componentId] ?? item.componentId;
    const definition = getComponentById(componentId);
    if (!definition) return [];
    const compatibleTemplateProps = componentId === item.componentId ? item.props : undefined;
    return [{
      instanceId: newInstanceId(),
      componentId: definition.id,
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
          const componentId = TEMPLATE_COMPONENT_MIGRATION[item.componentId] ?? item.componentId
          return getComponentById(componentId) ? [{ ...item, componentId }] : []
        })
        : [];
      return [{ ...frame, id: frame.id, name: frame.name, device: frame.device, items }];
    });
    return frames.length > 0 ? frames : null;
  } catch {
    return null;
  }
}

export default function BuilderView({ onBack }: BuilderViewProps) {
  const [frames, setFrames] = useState<CanvasFrame[]>(() => [{
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
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [canvasView, setCanvasView] = useState({ x: 36, y: 36, zoom: 1 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const panSessionRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const activeFrame = frames.find((frame) => frame.id === activeFrameId) ?? null;
  const activeDevice: FrameDevice = activeFrame?.device ?? 'mobile';
  const items = activeFrame?.items ?? [];

  useEffect(() => {
    const currentValue = window.localStorage.getItem(PLAYGROUND_STORAGE_KEY);
    const restored = restoreFrames(currentValue ?? window.localStorage.getItem(LEGACY_PLAYGROUND_STORAGE_KEY), !currentValue);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (restored) {
        setFrames(restored);
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

  const zoomCanvas = useCallback((direction: 1 | -1) => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setCanvasView((current) => {
      const zoom = Math.min(2, Math.max(0.25, current.zoom * (direction > 0 ? 1.15 : 0.87)));
      const ratio = zoom / current.zoom;
      return {
        zoom,
        x: centerX - (centerX - current.x) * ratio,
        y: centerY - (centerY - current.y) * ratio,
      };
    });
  }, []);

  const handleCanvasWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.ctrlKey) {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      setCanvasView((current) => {
        const zoom = Math.min(2, Math.max(0.25, current.zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
        const ratio = zoom / current.zoom;
        return {
          zoom,
          x: pointerX - (pointerX - current.x) * ratio,
          y: pointerY - (pointerY - current.y) * ratio,
        };
      });
      return;
    }

    const horizontalDelta = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
    const verticalDelta = event.shiftKey && event.deltaX === 0 ? 0 : event.deltaY;
    setCanvasView((current) => ({
      ...current,
      x: current.x - horizontalDelta,
      y: current.y - verticalDelta,
    }));
  }, []);

  const handleCanvasPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if ((!spacePressed && !panMode) || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    panSessionRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }, [panMode, spacePressed]);

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
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const setItems = useCallback((next: React.SetStateAction<CanvasItem[]>) => {
    setFrames((previousFrames) => previousFrames.map((frame) => {
      if (frame.id !== activeFrameId) return frame;
      const nextItems = typeof next === 'function' ? next(frame.items) : next;
      return { ...frame, items: nextItems };
    }));
  }, [activeFrameId]);

  const focusCanvasFrame = (targetFrame: CanvasFrame, frameList: CanvasFrame[] = frames) => {
    const targetIndex = frameList.findIndex((frame) => frame.id === targetFrame.id);
    const offset = frameList.slice(0, Math.max(0, targetIndex)).reduce((sum, frame) => (
      sum + FRAME_DIMENSIONS[frame.device].width * FRAME_DIMENSIONS[frame.device].scale + 32
    ), 0);
    const zoom = targetFrame.device === 'desktop' ? 0.92 : 1;
    const desiredX = targetFrame.device === 'desktop' ? 12 : 36;
    setCanvasView({
      zoom,
      x: desiredX - zoom * (24 + offset),
      y: 32 - zoom * 24,
    });
    setActiveFrameId(targetFrame.id);
    setSelectedId(null);
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
      setItems((prev) => prev.filter((i) => i.instanceId !== instanceId));
      if (selectedId === instanceId) setSelectedId(null);
    },
    [selectedId, setItems],
  );

  const updateProp = useCallback((instanceId: string, key: string, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId
          ? { ...item, props: { ...item.props, [key]: value } }
          : item,
      ),
    );
  }, [setItems]);

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
        const slotMatch = /^insert:(.+):(\d+)$/.exec(overId);
        const targetFrameId = slotMatch?.[1] ?? activeFrameId;
        const targetFrame = frames.find((frame) => frame.id === targetFrameId);
        if (!targetFrame || !supportsDevice(def, targetFrame.device)) return;

        const fallbackIndex = targetFrame.items.findIndex((item) => item.instanceId === overId);
        const insertIndex = slotMatch ? Number(slotMatch[2]) : fallbackIndex;
        if (insertIndex < 0) return;

        const newItem: CanvasItem = {
          instanceId: newInstanceId(),
          componentId: def.id,
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
          return arrayMove(prev, oldIndex, newIndex);
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

  const selectedItem = items.find((i) => i.instanceId === selectedId) ?? null;

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

        <Button type="button" onClick={() => setTemplatePickerOpen((open) => !open)} aria-expanded={templatePickerOpen} variant={templatePickerOpen ? 'secondary' : 'outline'} size="touch">
          <LayoutTemplate size={14} />
          구조 템플릿
          <ChevronDown size={13} />
        </Button>

        <div style={{ width: 1, height: 24, background: AIDE.border }} />
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
          />

          {/* Center: multi-frame canvas */}
          <div
            ref={canvasViewportRef}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: AIDE.bg,
              backgroundImage: 'radial-gradient(circle, var(--aui-border) 1px, transparent 1px)',
              backgroundSize: `${20 * canvasView.zoom}px ${20 * canvasView.zoom}px`,
              backgroundPosition: `${canvasView.x}px ${canvasView.y}px`,
              cursor: spacePressed || panMode ? 'grab' : 'default',
              touchAction: 'none',
            }}
            onClick={() => setSelectedId(null)}
            onWheel={handleCanvasWheel}
            onPointerDownCapture={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                padding: "var(--aui-space-6)",
                transform: `translate(${canvasView.x}px, ${canvasView.y}px) scale(${canvasView.zoom})`,
                transformOrigin: 'top left',
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
                      <div style={{ width: displayWidth, height: displayHeight, position: 'relative' }}>
                        <div
                          style={{
                            width: config.width,
                            height: config.height,
                            position: 'relative',
                            transform: `scale(${config.scale})`,
                            transformOrigin: 'top left',
                            background: 'var(--aui-on-dark)',
                            border: `${active ? 2 : 1}px solid ${active ? AIDE.primary : AIDE.border}`,
                            borderRadius: frame.device === 'mobile' ? 24 : 4,
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                          }}
                        >
                          {active ? (
                            <SortableContext
                              items={frame.items.map((item) => item.instanceId)}
                              strategy={verticalListSortingStrategy}
                            >
                              {frame.items.length === 0 ? (
                                <CanvasEmptyZone frameId={frame.id} />
                              ) : (
                                <>
                                  {frame.items.map((item, index) => (
                                    <React.Fragment key={item.instanceId}>
                                      {canAcceptPalette ? (
                                        <PaletteDropSlot frameId={frame.id} index={index} device={frame.device} />
                                      ) : null}
                                      <SortableItem
                                        item={item}
                                        device={frame.device}
                                        isSelected={selectedId === item.instanceId}
                                        showInsertBefore={isPaletteDrag && dragOverCanvasId === item.instanceId}
                                        onSelect={() => setSelectedId(item.instanceId)}
                                        onRemove={() => removeItem(item.instanceId)}
                                      />
                                    </React.Fragment>
                                  ))}
                                  {canAcceptPalette ? (
                                    <PaletteDropSlot frameId={frame.id} index={frame.items.length} device={frame.device} />
                                  ) : null}
                                </>
                              )}
                            </SortableContext>
                          ) : (
                            <div style={{ pointerEvents: canAcceptPalette ? 'auto' : 'none' }}>
                              {frame.items.length === 0 && canAcceptPalette ? (
                                <CanvasEmptyZone frameId={frame.id} />
                              ) : (
                                <>
                                  {frame.items.map((item, index) => (
                                    <React.Fragment key={item.instanceId}>
                                      {canAcceptPalette ? (
                                        <PaletteDropSlot frameId={frame.id} index={index} device={frame.device} />
                                      ) : null}
                                      <StaticCanvasItem item={item} device={frame.device} />
                                    </React.Fragment>
                                  ))}
                                  {canAcceptPalette ? (
                                    <PaletteDropSlot frameId={frame.id} index={frame.items.length} device={frame.device} />
                                  ) : null}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', height: 36, padding: "var(--aui-space-1)", display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)", border: `1px solid ${AIDE.border}`, borderRadius: "var(--aui-radius-sm)", background: 'var(--aui-on-dark-strong)', boxShadow: "var(--aui-shadow-raised)" }} onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => zoomCanvas(-1)} title="축소" aria-label="축소" style={{ width: 30, height: 30, border: 'none', borderRadius: "var(--aui-radius-sm)", background: 'transparent', color: AIDE.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ZoomOut size={14} />
              </button>
              <button type="button" onClick={() => setCanvasView((current) => ({ ...current, zoom: 1 }))} title="배율 초기화" style={{ minWidth: 54, height: 30, padding: `0 var(--aui-space-2)`, border: 'none', borderRadius: "var(--aui-radius-sm)", background: AIDE.surfaceHover, color: AIDE.text, fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-bold)", cursor: 'pointer', fontFamily: 'inherit' }}>
                {Math.round(canvasView.zoom * 100)}%
              </button>
              <button type="button" onClick={() => zoomCanvas(1)} title="확대" aria-label="확대" style={{ width: 30, height: 30, border: 'none', borderRadius: "var(--aui-radius-sm)", background: 'transparent', color: AIDE.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ZoomIn size={14} />
              </button>
              <div style={{ width: 1, height: 18, margin: `0 var(--aui-space-1)`, background: AIDE.border }} />
              <button type="button" onClick={() => activeFrame ? focusCanvasFrame(activeFrame) : setCanvasView({ x: 36, y: 36, zoom: 1 })} title="선택 대지에 맞추기" aria-label="선택 대지에 맞추기" style={{ width: 30, height: 30, border: 'none', borderRadius: "var(--aui-radius-sm)", background: 'transparent', color: AIDE.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Maximize2 size={14} />
              </button>
              <button type="button" onClick={() => setPanMode((active) => !active)} title="대지 이동 도구 (Space)" aria-label="대지 이동 도구" style={{ width: 30, height: 30, border: 'none', borderRadius: "var(--aui-radius-sm)", color: spacePressed || panMode ? AIDE.primary : AIDE.textSubtle, background: spacePressed || panMode ? AIDE.primarySoft : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Hand size={14} />
              </button>
            </div>
          </div>

          {/* Right: selected component details */}
          <ComponentDetailsPanel
            selectedItem={selectedItem}
            device={activeDevice}
            onPropChange={updateProp}
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
