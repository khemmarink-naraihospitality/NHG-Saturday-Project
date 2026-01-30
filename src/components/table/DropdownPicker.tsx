import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Check, Edit2 } from 'lucide-react';
import { useBoardStore } from '../../store/useBoardStore';

interface DropdownPickerProps {
    columnId: string;
    options: { label: string; color: string; id?: string }[];
    currentValue: string[]; // Dropdown is multi-select, so array of IDs or Labels
    position: { top: number; bottom: number; left: number; width: number };
    onSelect: (newValues: string[]) => void;
    onClose: () => void;
}

export const DropdownPicker = ({ columnId, options, currentValue = [], position, onSelect, onClose }: DropdownPickerProps) => {
    // Determine placement (top or bottom)
    const canFitBelow = window.innerHeight - position.bottom > 300;
    const listTop = canFitBelow ? position.bottom + 4 : position.top - 304; // aprox height

    const [searchTerm, setSearchTerm] = useState('');
    const [isEditingLabels, setIsEditingLabels] = useState(false);

    // Actions from store
    const addColumnOption = useBoardStore(state => state.addColumnOption);
    const updateColumnOption = useBoardStore(state => state.updateColumnOption);
    const deleteColumnOption = useBoardStore(state => state.deleteColumnOption);

    const menuRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Colors for new labels
    const colors = [
        '#ff5ac4', '#579bfc', '#00c875', '#fdb122', '#e2445c', '#66ccff', '#ffadad', '#a0c4ff'
    ];

    const handleCreateOption = () => {
        if (!searchTerm.trim()) return;
        const color = colors[options.length % colors.length];
        addColumnOption(columnId, searchTerm.trim(), color);
        setSearchTerm('');
    };

    const toggleSelection = (label: string) => {
        const newValues = currentValue.includes(label)
            ? currentValue.filter(v => v !== label)
            : [...currentValue, label];
        onSelect(newValues);
    };

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return createPortal(
        <div
            ref={menuRef}
            className="dropdown-picker-menu"
            style={{
                position: 'absolute',
                top: listTop,
                left: position.left,
                width: Math.max(position.width, 240),
                zIndex: 9999,
                backgroundColor: 'hsl(var(--color-bg-surface))',
                border: '1px solid hsl(var(--color-border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '300px',
                overflow: 'hidden'
            }}
        >
            {!isEditingLabels ? (
                <>
                    {/* Search / Create Input */}
                    <div style={{ padding: '8px', borderBottom: '1px solid hsl(var(--color-border))' }}>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search or create..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleCreateOption();
                            }}
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid hsl(var(--color-border))',
                                backgroundColor: 'hsl(var(--color-bg-base))',
                                color: 'hsl(var(--color-text-primary))',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Options List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = currentValue.includes(opt.label);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => toggleSelection(opt.label)}
                                        style={{
                                            padding: '6px 8px',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '2px',
                                            backgroundColor: isSelected ? 'hsl(var(--color-bg-subtle))' : 'transparent',
                                            transition: 'background-color 0.1s'
                                        }}
                                        className="hover:bg-gray-700/50"
                                    >
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: opt.color
                                        }} />
                                        <span style={{ flex: 1, fontSize: '13px' }}>{opt.label}</span>
                                        {isSelected && <Check size={14} className="text-brand-primary" />}
                                    </div>
                                );
                            })
                        ) : (
                            searchTerm && (
                                <div
                                    onClick={handleCreateOption}
                                    style={{
                                        padding: '8px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        color: 'hsl(var(--color-brand-primary))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Plus size={14} /> Create "{searchTerm}"
                                </div>
                            )
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                        padding: '8px',
                        borderTop: '1px solid hsl(var(--color-border))',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <button
                            onClick={() => setIsEditingLabels(true)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'hsl(var(--color-text-secondary))',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Edit2 size={12} /> Edit labels
                        </button>
                    </div>
                </>
            ) : (
                // Edit Labels View (Simplified Reuse)
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid hsl(var(--color-border))', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setIsEditingLabels(false)} className="icon-btn"><X size={14} /></button>
                        <span style={{ fontWeight: 500, fontSize: '13px' }}>Edit Labels</span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                        {options.map((opt, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <input
                                    type="color"
                                    value={opt.color}
                                    onChange={(e) => {
                                        if (opt.id) updateColumnOption(columnId, opt.id, { color: e.target.value });
                                    }}
                                    style={{ width: '20px', height: '20px', border: 'none', padding: 0, background: 'none' }}
                                />
                                <input
                                    type="text"
                                    value={opt.label}
                                    onChange={(e) => {
                                        if (opt.id) updateColumnOption(columnId, opt.id, { label: e.target.value });
                                    }}
                                    className="cell-input"
                                    style={{ flex: 1, padding: '4px 8px' }}
                                />
                                <button
                                    onClick={() => {
                                        if (opt.id) deleteColumnOption(columnId, opt.id);
                                    }}
                                    className="icon-btn danger"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
