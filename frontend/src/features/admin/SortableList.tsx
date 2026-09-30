import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Admin.module.scss';
import { moveItem } from './content';

interface Sortable {
  id: string;
}

/** Drag handle and up / down buttons, rendered inside each row. */
export interface ReorderHandle {
  controls: ReactNode;
}

interface SortableListProps<T extends Sortable> {
  items: T[];
  /** Name of an item, for the handle's label and announcements. */
  titleOf: (item: T) => string;
  /** Saves the new order (all ids). Rejects to put the old order back. */
  onReorder: (ids: string[]) => Promise<unknown>;
  renderItem: (item: T, index: number, handle: ReorderHandle) => ReactNode;
  className?: string;
  disabled?: boolean;
  testId?: string;
}

/**
 * A list reordered by dragging (pointer, touch or keyboard: dnd-kit) or with
 * up / down buttons. The new order shows at once and goes back if saving
 * fails.
 */
export function SortableList<T extends Sortable>({
  items,
  titleOf,
  onReorder,
  renderItem,
  className,
  disabled = false,
  testId,
}: SortableListProps<T>) {
  const { t } = useTranslation();
  // A local order shown while it is saved, until fresh `items` arrive.
  const [local, setLocal] = useState<{ base: T[]; order: T[] } | null>(null);
  const order = local && local.base === items ? local.order : items;
  const setOrder = (next: T[]) => setLocal({ base: items, order: next });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const move = (from: number, to: number) => {
    const previous = order;
    const next = moveItem(order, from, to);
    if (next === order || from === to) return;
    setOrder(next);
    onReorder(next.map((item) => item.id)).catch(() => setOrder(previous));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.findIndex((item) => item.id === active.id);
    const to = order.findIndex((item) => item.id === over.id);
    move(from, to);
  };

  const titleById = (id: string | number) => {
    const item = order.find((entry) => entry.id === id);
    return item ? titleOf(item) : '';
  };
  const position = (id: string | number) =>
    order.findIndex((entry) => entry.id === id) + 1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: t('admin.reorder.instructions'),
        },
        announcements: {
          onDragStart: ({ active }) =>
            t('admin.reorder.picked', { title: titleById(active.id) }),
          onDragOver: ({ active, over }) =>
            over
              ? t('admin.reorder.moved', {
                  title: titleById(active.id),
                  position: position(over.id),
                  total: order.length,
                })
              : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? t('admin.reorder.dropped', {
                  title: titleById(active.id),
                  position: position(over.id),
                  total: order.length,
                })
              : t('admin.reorder.cancelled'),
          onDragCancel: () => t('admin.reorder.cancelled'),
        },
      }}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ol className={className} data-testid={testId}>
          {order.map((item, index) => (
            <SortableRow
              key={item.id}
              id={item.id}
              title={titleOf(item)}
              first={index === 0}
              last={index === order.length - 1}
              disabled={disabled}
              onUp={() => move(index, index - 1)}
              onDown={() => move(index, index + 1)}
            >
              {(controls) => renderItem(item, index, { controls })}
            </SortableRow>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

interface SortableRowProps {
  id: string;
  title: string;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onUp: () => void;
  onDown: () => void;
  children: (controls: ReactNode) => ReactNode;
}

function SortableRow({
  id,
  title,
  first,
  last,
  disabled,
  onUp,
  onDown,
  children,
}: SortableRowProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const controls = disabled ? null : (
    <span className={styles.reorder}>
      <Tooltip title={t('admin.reorder.handle', { title })}>
        <Button
          type="text"
          size="small"
          icon={<HolderOutlined aria-hidden />}
          className={styles.handle}
          ref={setActivatorNodeRef}
          aria-label={t('admin.reorder.handle', { title })}
          data-testid="drag-handle"
          {...attributes}
          {...listeners}
        />
      </Tooltip>
      <Button
        type="text"
        size="small"
        icon={<ArrowUpOutlined aria-hidden />}
        aria-label={t('admin.reorder.up', { title })}
        disabled={first}
        onClick={onUp}
        data-testid="move-up"
      />
      <Button
        type="text"
        size="small"
        icon={<ArrowDownOutlined aria-hidden />}
        aria-label={t('admin.reorder.down', { title })}
        disabled={last}
        onClick={onDown}
        data-testid="move-down"
      />
    </span>
  );

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 2 : undefined,
      }}
      className={isDragging ? styles.dragging : undefined}
      data-id={id}
    >
      {children(controls)}
    </li>
  );
}
