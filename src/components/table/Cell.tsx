import { useState, useRef, useEffect } from 'react';
import { Check, Calendar, Hash, Link2, Type } from 'lucide-react';
import type { Item, Column } from '../../types';
import { useBoardStore } from '../../store/useBoardStore';
import { usePermission } from '../../hooks/usePermission';
import { StatusPicker } from './StatusPicker';
import { DropdownPicker } from './DropdownPicker';
import { PersonPicker } from './PersonPicker';


export const Cell = ({ item, column }: { item: Item, column: Column }) => {
    const value = item.values[column.id];
    const updateItemValue = useBoardStore(state => state.updateItemValue);
    const { activeBoardMembers } = useBoardStore();

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const cellRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // State for Status Picker Position
    const [pickerPos, setPickerPos] = useState<{ top: number, bottom: number, left: number, width: number } | null>(null);

    useEffect(() => {
        setEditValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (column.type === 'date' && 'showPicker' in inputRef.current) {
                // Small delay to ensure focus is stable before picker
                setTimeout(() => (inputRef.current as any).showPicker(), 10);
            }
        }
    }, [isEditing, column.type]);

    const handleBlur = () => {
        // Delay blur to allow click on picker
        setTimeout(() => {
            // Only if we aren't showing the picker
            if (column.type !== 'status') {
                setIsEditing(false);
                if (editValue !== value) {
                    updateItemValue(item.id, column.id, editValue);
                }
            }
        }, 150);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditing(false);
            if (editValue !== value) {
                updateItemValue(item.id, column.id, editValue);
            }
        }
        if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
            setPickerPos(null);
        }
    };

    // Permission Check
    const { can } = usePermission();

    const startEditing = () => {
        if (!can('edit_items')) return;

        setIsEditing(true);
        if ((column.type === 'status' || column.type === 'dropdown') && cellRef.current) {
            // ...
            const rect = cellRef.current.getBoundingClientRect();
            setPickerPos({
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    // Render Display Content
    let content = value;
    let backgroundColor = 'transparent';
    let textColor = 'inherit';

    if (column.type === 'status') {
        const options = Array.isArray(column.options) ? column.options : [];
        const statusOption = options.find(opt => opt.label === value);
        // Fallback for "Not Started" or empty
        const color = statusOption?.color || (value ? '#c4c4c4' : '#c4c4c4');

        backgroundColor = color;
        textColor = '#fff';
        content = value || ''; // If empty string, show empty cell with gray bg? 
        // Screenshot shows "Working on it" with Orange bg filling the WHOLE cell.

        // If it's a status cell, we usually fill the whole cell
    }

    // Checkbox Rendering
    if (column.type === 'checkbox') {
        const isChecked = value === true;
        return (
            <div
                className="table-cell"
                onClick={() => updateItemValue(item.id, column.id, !isChecked)}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRight: '1px solid hsl(var(--color-cell-border))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                }}
            >
                <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '3px',
                    border: '2px solid ' + (isChecked ? 'hsl(var(--color-brand-primary))' : 'hsl(var(--color-text-tertiary))'),
                    backgroundColor: isChecked ? 'hsl(var(--color-brand-primary))' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s ease'
                }}>
                    {isChecked && <Check size={14} color="white" strokeWidth={3} />}
                </div>
            </div>
        );
    }

    // Status Rendering
    if (column.type === 'status') {
        return (
            <>
                <div
                    ref={cellRef}
                    className="table-cell"
                    onClick={() => !isEditing && startEditing()}
                    style={{
                        width: '100%',
                        height: '100%', // Ensure it fills height too
                        borderRight: '1px solid hsl(var(--color-cell-border))',
                        padding: 0,
                        backgroundColor: backgroundColor, // Fill entire cell
                        color: textColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        userSelect: 'none'
                    }}
                >
                    {content}
                </div>

                {isEditing && pickerPos && (
                    <StatusPicker
                        columnId={column.id}
                        options={column.options || []}
                        currentValue={value}
                        position={pickerPos}
                        onSelect={(label) => {
                            updateItemValue(item.id, column.id, label);
                            setIsEditing(false);
                            setPickerPos(null);
                        }}
                        onClose={() => {
                            setIsEditing(false);
                            setPickerPos(null);
                        }}
                    />
                )}
            </>
        );
    }

    // Dropdown Rendering (Multi-select)
    if (column.type === 'dropdown') {
        // Ensure value is array
        const selectedLabels = Array.isArray(value) ? value : (value ? [value] : []);

        return (
            <>
                <div
                    ref={cellRef}
                    className="table-cell"
                    onClick={() => !isEditing && startEditing()}
                    style={{
                        width: '100%',
                        height: '100%',
                        borderRight: '1px solid hsl(var(--color-cell-border))',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        flexWrap: 'nowrap', // Or wrap if we want height to grow, but row is fixed height
                        justifyContent: selectedLabels.length > 0 ? 'flex-start' : 'center'
                    }}
                >
                    {selectedLabels.length > 0 ? (
                        selectedLabels.map((label: string, idx: number) => {
                            const options = Array.isArray(column.options) ? column.options : [];
                            const opt = options.find(o => o.label === label);
                            return (
                                <div key={idx} style={{
                                    backgroundColor: opt?.color || '#a0c4ff',
                                    color: '#fff',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap'
                                }}>
                                    {label}
                                </div>
                            );
                        })
                    ) : (
                        <span style={{ color: 'hsl(var(--color-text-tertiary))', fontSize: '12px' }}>+</span>
                    )}
                </div>

                {isEditing && pickerPos && (
                    <DropdownPicker
                        columnId={column.id}
                        options={column.options || []}
                        currentValue={selectedLabels}
                        position={pickerPos}
                        onSelect={(newValues) => {
                            updateItemValue(item.id, column.id, newValues);
                            // Don't close immediately allows multi selection
                        }}
                        onClose={() => {
                            setIsEditing(false);
                            setPickerPos(null);
                        }}
                    />
                )}
            </>
        );
    }

    // Person Rendering
    if (column.type === 'people') {
        const selectedIds = Array.isArray(value) ? value : (value ? [value] : []);

        return (
            <>
                <div
                    ref={cellRef}
                    className="table-cell"
                    onClick={() => !isEditing && startEditing()}
                    style={{
                        width: '100%',
                        height: '100%',
                        borderRight: '1px solid hsl(var(--color-cell-border))',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        justifyContent: selectedIds.length > 0 ? 'flex-start' : 'center'
                    }}
                >
                    {selectedIds.length > 0 ? (
                        selectedIds.map((userId: string, idx: number) => {
                            const member = activeBoardMembers.find(m => m.user_id === userId);
                            const initial = member ? (member.profiles.full_name || member.profiles.email || '?')[0].toUpperCase() : '?';

                            return (
                                <div key={idx} style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: member?.profiles?.avatar_url ? 'transparent' : '#0073ea',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    border: '1px solid white',
                                    marginLeft: idx > 0 ? '-8px' : '0', // Overlap effect
                                    zIndex: 10 - idx,
                                    overflow: 'hidden'
                                }} title={member?.profiles?.full_name || userId}>
                                    {member?.profiles?.avatar_url ? (
                                        <img src={member.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        initial
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <span style={{ color: 'hsl(var(--color-text-tertiary))', fontSize: '18px', opacity: 0.5 }}>+</span>
                    )}
                </div>

                {isEditing && pickerPos && (
                    <PersonPicker
                        currentValue={selectedIds}
                        position={pickerPos}
                        onSelect={(userId) => {
                            // Toggle selection
                            const newValues = selectedIds.includes(userId)
                                ? selectedIds.filter((id: string) => id !== userId)
                                : [...selectedIds, userId];
                            updateItemValue(item.id, column.id, newValues);
                        }}
                        onClose={() => {
                            setIsEditing(false);
                            setPickerPos(null);
                        }}
                    />
                )}
            </>
        );
    }

    // Date Rendering
    if (column.type === 'date') {
        const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const today = new Date();
            const isCurrentYear = date.getFullYear() === today.getFullYear();

            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: isCurrentYear ? undefined : 'numeric'
            });
        };

        if (isEditing) {
            return (
                <div className="table-cell" style={{
                    width: '100%',
                    height: '100%',
                    borderRight: '1px solid hsl(var(--color-cell-border))',
                    padding: 0
                }}>
                    <input
                        ref={inputRef}
                        type="date"
                        value={editValue || ''}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                            setIsEditing(false);
                            if (editValue !== value) {
                                updateItemValue(item.id, column.id, editValue);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: '2px solid hsl(var(--color-brand-primary))',
                            outline: 'none',
                            padding: '0 8px',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            backgroundColor: 'white',
                            color: 'hsl(var(--color-text-primary))',
                        }}
                    />
                </div>
            );
        }

        return (
            <div
                className="table-cell"
                onClick={() => {
                    if (!can('edit_items')) return;
                    setIsEditing(true);
                    setTimeout(() => {
                        if (inputRef.current && 'showPicker' in inputRef.current) {
                            (inputRef.current as any).showPicker();
                        }
                    }, 0);
                }}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRight: '1px solid hsl(var(--color-cell-border))',
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: value ? 'inherit' : 'hsl(var(--color-text-tertiary))'
                }}
            >
                {value ? (
                    <span>{formatDate(value)}</span>
                ) : (
                    <Calendar size={16} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                )}
            </div>
        );
    }

    // Link Rendering
    if (column.type === 'link') {
        if (isEditing) {
            return (
                <div className="table-cell" style={{
                    width: '100%',
                    height: '100%',
                    borderRight: '1px solid hsl(var(--color-cell-border))',
                    padding: 0
                }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue || ''}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                            setIsEditing(false);
                            if (editValue !== value) {
                                updateItemValue(item.id, column.id, editValue);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Paste link here..."
                        style={{
                            width: '100%',
                            height: '100%',
                            border: '2px solid hsl(var(--color-brand-primary))',
                            outline: 'none',
                            padding: '0 8px',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            backgroundColor: 'white',
                            color: 'hsl(var(--color-text-primary))',
                        }}
                    />
                </div>
            );
        }

        const url = value ? (value.startsWith('http') ? value : `https://${value}`) : '';

        return (
            <div
                className="table-cell"
                onDoubleClick={startEditing}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRight: '1px solid hsl(var(--color-cell-border))',
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'text'
                }}
            >
                {value ? (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            color: '#0073ea',
                            textDecoration: 'none',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                        {value}
                    </a>
                ) : (
                    <div
                        onClick={startEditing}
                        style={{ color: 'hsl(var(--color-text-tertiary))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', opacity: 0.5 }}
                    >
                        <Link2 size={16} />
                    </div>
                )}
            </div>
        );
    }

    // Generic Rendering (Text, Number, Person, etc.)
    if (isEditing) {
        return (
            <div className="table-cell" style={{
                width: '100%',
                height: '100%',
                borderRight: '1px solid hsl(var(--color-cell-border))',
                padding: 0
            }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (column.type === 'number') {
                            // Allow numbers, dots, and %
                            if (/^[0-9]*\.?[0-9]*%?$/.test(val)) {
                                setEditValue(val);
                            }
                        } else {
                            setEditValue(val);
                        }
                    }}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: '2px solid hsl(var(--color-brand-primary))',
                        outline: 'none',
                        padding: '0 8px',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        backgroundColor: 'transparent',
                        color: 'inherit'
                    }}
                />
            </div>
        );
    }

    return (
        <div
            className="table-cell"
            onDoubleClick={startEditing}
            style={{
                width: '100%',
                height: '100%',
                borderRight: '1px solid hsl(var(--color-cell-border))',
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: column.type === 'number' ? 'flex-end' : 'flex-start',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'text'
            }}
        >
            {content || (
                <div style={{ color: 'hsl(var(--color-text-tertiary))', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    {column.type === 'number' && <Hash size={16} />}
                    {column.type === 'text' && <Type size={16} />}
                    {/* Fallback for others if any */}
                    {!['number', 'text', 'people'].includes(column.type) && '-'}
                </div>
            )}
        </div>
    );
};
