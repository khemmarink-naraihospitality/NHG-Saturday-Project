import { motion } from 'framer-motion';
import { useRef, useMemo, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useBoardStore } from '../../store/useBoardStore';
import { usePermission } from '../../hooks/usePermission';
import { Header } from './Header';
import { Row } from './Row';
import { GroupRow } from './GroupRow';
import { groupItems } from '../../utils/grouping';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragStartEvent,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';

// Wrapper for Sortable Items
const SortableItemWrapper = ({
    id,
    children,
    disabled,
    style: propStyle
}: {
    id: string;
    children: (vals: any) => React.ReactNode;
    disabled?: boolean;
    style?: React.CSSProperties
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        ...propStyle,
        height: '100%',
        width: '100%',
        position: 'relative',
        // Prevent gaps during drag
        margin: 0,
        padding: 0,
        boxSizing: 'border-box'
    };

    return (
        <div ref={setNodeRef} style={style} {...(disabled ? {} : attributes)}>
            {children({ listeners })}
        </div>
    );
};

export const Table = ({ boardId }: { boardId: string }) => {
    const board = useBoardStore(state => state.boards.find(b => b.id === boardId));
    const toggleGroup = useBoardStore(state => state.toggleGroup);
    const moveItem = useBoardStore(state => state.moveItem);
    const parentRef = useRef<HTMLDivElement>(null);
    const { can } = usePermission();

    const searchQuery = useBoardStore(state => state.searchQuery);
    const showHiddenItems = useBoardStore(state => state.showHiddenItems);
    const itemColumnWidth = board?.itemColumnWidth || 240;

    const [activeId, setActiveId] = useState<string | null>(null);

    const virtualItems = useMemo(() => {
        if (!board) return [];
        let items = [...board.items]; // Clone to sort

        // 1. Search
        if (searchQuery) {
            items = items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // Filter Hidden Items
        if (!showHiddenItems) {
            items = items.filter(item => !item.isHidden);
        }

        // 2. Column Filter (Simple Value Match)
        if (board.filters && board.filters.length > 0) {
            board.filters.forEach(filter => {
                if (filter.values && filter.values.length > 0) {
                    items = items.filter(item => {
                        const val = item.values[filter.columnId];

                        // Handle Array values (Dropdown) -> Intersection Check
                        if (Array.isArray(val)) {
                            // If ANY of the item's labels match ANY of the filter values, keep it.
                            return val.some(v => filter.values.includes(v));
                        }

                        // Handle Boolean values (Checkbox) -> String Conversion Check
                        if (typeof val === 'boolean') {
                            return filter.values.includes(String(val));
                        }

                        // Default: Single Value Check
                        return filter.values.includes(val);
                    });
                }
            });
        }

        // 3. Sort
        if (board.sort) {
            const { columnId, direction } = board.sort;
            const col = board.columns.find(c => c.id === columnId);
            if (col && direction) {
                items.sort((a, b) => {
                    let valA = a.values[columnId];
                    let valB = b.values[columnId];

                    // Handle different types
                    if (col.type === 'number') {
                        valA = parseFloat(valA) || 0;
                        valB = parseFloat(valB) || 0;
                    } else if (col.type === 'date') {
                        // Date strings usually sortable if ISO, otherwise parse
                        valA = valA || '';
                        valB = valB || '';
                    } else if (col.type === 'status' || col.type === 'dropdown') {
                        // Try to find option label if val maps to an option ID
                        const options = Array.isArray(col.options) ? col.options : [];
                        const optA = options.find(o => o.id === valA || o.label === valA);
                        const optB = options.find(o => o.id === valB || o.label === valB);
                        valA = (optA ? optA.label : (valA || '')).toString().toLowerCase();
                        valB = (optB ? optB.label : (valB || '')).toString().toLowerCase();
                    } else {
                        // String (Text, etc)
                        valA = (valA || '').toString().toLowerCase();
                        valB = (valB || '').toString().toLowerCase();
                    }

                    if (valA < valB) return direction === 'asc' ? -1 : 1;
                    if (valA > valB) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }
        }

        return groupItems(items, board.groups || [], board.groupByColumnId || null, board.collapsedGroups || []);
    }, [board?.items, board?.groups, board?.groupByColumnId, board?.collapsedGroups, searchQuery, board?.sort, board?.filters, showHiddenItems]);

    const rowVirtualizer = useVirtualizer({
        count: virtualItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            const type = virtualItems[index]?.type;
            if (type === 'group') return 60;
            if (type === 'header') return 40;
            if (type === 'footer') return 80;
            return 40; // item
        },
        overscan: 5,
    });

    // Force remeasure after items change to prevent gaps
    useEffect(() => {
        rowVirtualizer.measure();
    }, [virtualItems, rowVirtualizer]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Prevent accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (active.id !== over?.id) {
            // Call store action
            if (over) {
                moveItem(active.id as string, over.id as string);
            }
        }
    };

    if (!board) return null;

    const activeItem = activeId ? board.items.find(i => i.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div
                ref={parentRef}
                className="table-container"
                style={{ height: '100%', overflow: 'auto', width: '100%' }}
            >
                <div
                    className="table-content"
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {/* Permission Loading Overlay */}
                    {useBoardStore(state => state.isLoadingMembers) && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(2px)',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#676879',
                            fontSize: '14px',
                            fontWeight: 500
                        }}>
                            Checking permissions...
                        </div>
                    )}

                    <SortableContext
                        items={virtualItems.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const vItem = virtualItems[virtualRow.index];
                            const isGroup = vItem.type === 'group';
                            const isHeader = vItem.type === 'header';
                            const isFooter = vItem.type === 'footer';
                            const isItem = vItem.type === 'item';

                            const isDragging = activeId === vItem.id;
                            return (
                                <div
                                    key={vItem.id}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                        zIndex: isDragging ? 99 : 1
                                    }}
                                >
                                    <SortableItemWrapper
                                        id={vItem.id}
                                        disabled={!isItem || !can('edit_items')} // Only items are draggable, and must have permission
                                    >
                                        {({ listeners }) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                style={{ height: '100%' }}
                                            >
                                                {isGroup ? (
                                                    <div style={{ position: 'relative', height: '100%' }}>
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: 0,
                                                            top: '16px',
                                                            bottom: 0,
                                                            width: '6px',
                                                            backgroundColor: vItem.groupColor,
                                                            borderRadius: '6px 6px 0 0',
                                                            zIndex: 10
                                                        }} />
                                                        <GroupRow
                                                            data={vItem.data as any}
                                                            isCollapsed={(board.collapsedGroups || []).includes(vItem.id)}
                                                            onToggle={() => toggleGroup(board.id, vItem.id)}
                                                        />
                                                    </div>
                                                ) : isHeader ? (
                                                    <Header columns={board.columns} groupColor={vItem.groupColor} />
                                                ) : isFooter ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            height: '36px',
                                                            position: 'relative',
                                                        }}>
                                                            {vItem.groupColor && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    left: 0,
                                                                    top: 0,
                                                                    bottom: 0,
                                                                    width: '6px',
                                                                    backgroundColor: vItem.groupColor,
                                                                    zIndex: 65,
                                                                    borderRadius: '0 0 0 6px'
                                                                }} />
                                                            )}
                                                            <div className="sticky-col" style={{
                                                                width: `${itemColumnWidth}px`,
                                                                position: 'sticky',
                                                                left: 0,
                                                                zIndex: 55,
                                                                backgroundColor: 'hsl(var(--color-bg-surface))',
                                                                borderRight: '1px solid hsl(var(--color-border))',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                paddingLeft: vItem.groupColor ? '18px' : '8px',
                                                                borderBottom: '1px solid hsl(var(--color-border))',
                                                                boxSizing: 'border-box',
                                                                flexShrink: 0,
                                                                gap: '8px'
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', gap: '8px' }}>
                                                                    <div style={{
                                                                        width: '16px',
                                                                        height: '16px',
                                                                        flexShrink: 0
                                                                    }} />
                                                                    {can('edit_items') && (
                                                                        <input
                                                                            type="text"
                                                                            placeholder=" + Add New"
                                                                            className="cell-input"
                                                                            style={{ fontSize: '13px', color: 'hsl(var(--color-text-secondary))', width: '100%', background: 'transparent', height: '100%' }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    const val = (e.currentTarget as HTMLInputElement).value;
                                                                                    if (val.trim()) {
                                                                                        useBoardStore.getState().addItem(val.trim(), vItem.data.groupId);
                                                                                        (e.currentTarget as HTMLInputElement).value = '';
                                                                                    }
                                                                                }
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {board.columns.map(col => (
                                                                <div key={col.id} style={{
                                                                    width: `${col.width || 150}px`,
                                                                    borderRight: '1px solid hsl(var(--color-border))',
                                                                    borderBottom: '1px solid hsl(var(--color-border))',
                                                                    boxSizing: 'border-box',
                                                                    flexShrink: 0
                                                                }} />
                                                            ))}
                                                            <div style={{ width: '50px', borderBottom: '1px solid hsl(var(--color-border))', flexShrink: 0 }} />
                                                        </div>

                                                        <div style={{
                                                            display: 'flex',
                                                            height: '40px',
                                                            position: 'relative',
                                                            marginTop: '4px'
                                                        }}>
                                                            <div className="sticky-col" style={{
                                                                width: `${itemColumnWidth}px`,
                                                                position: 'sticky',
                                                                left: 0,
                                                                zIndex: 55,
                                                                backgroundColor: 'transparent',
                                                                flexShrink: 0
                                                            }} />
                                                            <div style={{
                                                                display: 'flex',
                                                                boxShadow: '0 0 0 1px hsl(var(--color-border)), 0 2px 8px rgba(0,0,0,0.1)',
                                                                borderRadius: '8px',
                                                                backgroundColor: 'white',
                                                                overflow: 'hidden',
                                                                height: '36px',
                                                                marginTop: '0px',
                                                                boxSizing: 'border-box',
                                                                flexShrink: 0,
                                                                width: 'fit-content',
                                                                minWidth: '100px' // Ensure it has some width
                                                            }}>
                                                                {board.columns.map((col, idx) => {
                                                                    const groupItems = board.items.filter(i => i.groupId === vItem.data.groupId);
                                                                    return (
                                                                        <div key={col.id} style={{
                                                                            width: `${col.width || 150}px`,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            padding: '0 8px',
                                                                            borderRight: idx < board.columns.length - 1 ? '1px solid hsl(var(--color-border))' : 'none',
                                                                            height: '100%',
                                                                            boxSizing: 'border-box',
                                                                            flexShrink: 0
                                                                        }}>
                                                                            {col.type === 'status' && (
                                                                                <div style={{
                                                                                    width: '100%',
                                                                                    height: '24px',
                                                                                    display: 'flex',
                                                                                    borderRadius: '4px',
                                                                                    overflow: 'hidden',
                                                                                    position: 'relative'
                                                                                }}>
                                                                                    {(() => {
                                                                                        const values = groupItems.map(i => i.values[col.id]);
                                                                                        const total = values.length;
                                                                                        if (total === 0) return <div style={{ width: '100%', background: '#eee' }} />;
                                                                                        const counts: Record<string, number> = {};
                                                                                        values.forEach(v => {
                                                                                            const val = v || 'default';
                                                                                            counts[val] = (counts[val] || 0) + 1;
                                                                                        });
                                                                                        const options = Array.isArray(col.options) ? col.options : [];
                                                                                        return options.map(opt => {
                                                                                            const count = counts[opt.id] || counts[opt.label] || 0;
                                                                                            if (count === 0) return null;
                                                                                            const widthPct = (count / total) * 100;
                                                                                            return (
                                                                                                <div key={opt.id} style={{
                                                                                                    width: `${widthPct}%`,
                                                                                                    height: '100%',
                                                                                                    backgroundColor: opt.color,
                                                                                                }} title={`${opt.label}: ${Math.round(widthPct)}%`} />
                                                                                            );
                                                                                        }).concat(
                                                                                            counts['default'] ? (
                                                                                                <div key="default" style={{
                                                                                                    width: `${(counts['default'] / total) * 100}%`,
                                                                                                    height: '100%',
                                                                                                    backgroundColor: '#c4c4c4',
                                                                                                }} title="Empty" />
                                                                                            ) : null
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            )}
                                                                            {col.type === 'date' && (() => {
                                                                                const dates = groupItems.map(i => i.values[col.id]).filter(Boolean).sort();
                                                                                if (!dates.length) return null;
                                                                                const d1 = new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                                                const d2 = new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                                                return <div style={{ background: 'hsl(var(--color-brand-primary))', color: 'white', fontSize: '11px', padding: '4px 12px', borderRadius: '12px' }}>{d1 === d2 ? d1 : `${d1} - ${d2}`}</div>
                                                                            })()}
                                                                            {col.type === 'number' && (() => {
                                                                                const aggregation = col.aggregation || 'sum';

                                                                                // Calculate
                                                                                const values = groupItems.map(i => parseFloat(i.values[col.id])).filter(v => !isNaN(v));
                                                                                let result: number | string = 0;
                                                                                let label = aggregation;

                                                                                if (aggregation === 'none' || values.length === 0) {
                                                                                    if (aggregation === 'none') {
                                                                                        return (
                                                                                            <div
                                                                                                onClick={() => useBoardStore.getState().setColumnAggregation(col.id, 'sum')}
                                                                                                style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                                                                                            />
                                                                                        );
                                                                                    }
                                                                                    // If empty but has aggregation
                                                                                    result = '-';
                                                                                } else {
                                                                                    switch (aggregation) {
                                                                                        case 'sum':
                                                                                            result = values.reduce((a, b) => a + b, 0);
                                                                                            break;
                                                                                        case 'avg':
                                                                                            result = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
                                                                                            break;
                                                                                        case 'min':
                                                                                            result = Math.min(...values);
                                                                                            break;
                                                                                        case 'max':
                                                                                            result = Math.max(...values);
                                                                                            break;
                                                                                        case 'count':
                                                                                            result = values.length;
                                                                                            break;
                                                                                    }
                                                                                }

                                                                                const nextAggregation = {
                                                                                    'sum': 'avg',
                                                                                    'avg': 'min',
                                                                                    'min': 'max',
                                                                                    'max': 'count',
                                                                                    'count': 'sum',
                                                                                    'none': 'sum'
                                                                                } as const;

                                                                                return (
                                                                                    <div
                                                                                        onClick={() => useBoardStore.getState().setColumnAggregation(col.id, nextAggregation[aggregation] as any)}
                                                                                        style={{
                                                                                            display: 'flex',
                                                                                            flexDirection: 'column',
                                                                                            alignItems: 'center',
                                                                                            cursor: 'pointer',
                                                                                            padding: '4px',
                                                                                            borderRadius: '4px'
                                                                                        }}
                                                                                        title="Click to change aggregation"
                                                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f6f8'}
                                                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                                    >
                                                                                        <span style={{ fontWeight: 600 }}>{result}</span>
                                                                                        <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>{label}</span>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Row
                                                        item={vItem.data as any}
                                                        columns={board.columns}
                                                        groupColor={vItem.groupColor}
                                                        itemColumnWidth={itemColumnWidth}
                                                        dragHandleProps={listeners} // Pass listeners to Row
                                                    />
                                                )}
                                            </motion.div>
                                        )}
                                    </SortableItemWrapper>
                                </div>
                            );
                        })}
                    </SortableContext>
                </div>

                {/* Drag Overlay */}
                {createPortal(
                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: {
                                active: { opacity: '0.3' },
                            },
                        }),
                    }}>
                        {activeItem && (
                            <div style={{
                                height: '40px',
                                background: 'white',
                                border: '1px solid hsl(var(--color-brand-primary))',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: '8px',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                            }}>
                                <span style={{ fontWeight: 600 }}>{activeItem.title}</span>
                            </div>
                        )}
                    </DragOverlay>,
                    document.body
                )}

                <div style={{
                    padding: '16px 32px',
                    display: 'flex',
                    justifyContent: 'flex-start'
                }}>
                    {can('group_ungroup') && (
                        <motion.button
                            whileHover={{ scale: 1.02, backgroundColor: 'hsl(var(--color-bg-hover))' }}
                            whileTap={{ scale: 0.98 }}
                            className="btn-secondary"
                            onClick={() => {
                                useBoardStore.getState().addGroup("New Group");
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                border: '1px solid hsl(var(--color-border))',
                                backgroundColor: 'hsl(var(--color-bg-surface))',
                                color: 'hsl(var(--color-text-primary))',
                                cursor: 'pointer',
                                transition: 'none' // Disable CSS transition to let motion handle it
                            }}
                        >
                            <span>+ Add New Group</span>
                        </motion.button>
                    )}
                </div>
            </div>
        </DndContext>
    );
};
