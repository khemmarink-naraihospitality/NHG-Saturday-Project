import { format, setMonth, setYear } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { useRef, useEffect, useState } from 'react';
import 'react-day-picker/style.css';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
    date: Date | undefined;
    onSelect: (date: Date | undefined) => void;
    onClose: () => void;
    position: { top: number, left: number };
}

export const DatePicker = ({ date, onSelect, onClose, position }: DatePickerProps) => {
    const pickerRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState({ top: position.top, left: position.left });

    // View State: 'calendar', 'years', 'months'
    const [view, setView] = useState<'calendar' | 'years' | 'months'>('calendar');
    const [month, setMonthInPicker] = useState<Date>(date || new Date());

    useEffect(() => {
        if (pickerRef.current) {
            const rect = pickerRef.current.getBoundingClientRect();
            let top = position.top;
            let left = position.left;

            if (top + rect.height > window.innerHeight) {
                top = position.top - rect.height - 40;
            }
            if (left + rect.width > window.innerWidth) {
                left = window.innerWidth - rect.width - 20;
            }

            setStyle({ top, left });
        }
    }, [position, view]); // Re-calc on view change as height might change

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Calendar Navigation
    const handlePrevMonth = () => setMonthInPicker(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
    const handleNextMonth = () => setMonthInPicker(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));

    // Generate Years (1900 - 2100)
    const years = Array.from({ length: 201 }, (_, i) => 1900 + i);
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return createPortal(
        <div
            ref={pickerRef}
            style={{
                position: 'fixed',
                top: style.top,
                left: style.left,
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                border: '1px solid #e6e9ef',
                zIndex: 9999,
                width: '320px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Inter, sans-serif' // Enforce consistent font
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Custom Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <button
                    onClick={handlePrevMonth}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#676879' }}
                    className="hover-bg"
                >
                    <ChevronLeft size={20} />
                </button>

                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={() => setView(view === 'months' ? 'calendar' : 'months')}
                        style={{
                            background: view === 'months' ? '#e5f4ff' : 'transparent',
                            color: view === 'months' ? '#0073ea' : '#323338',
                            border: 'none',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {format(month, 'MMMM')}
                    </button>
                    <button
                        onClick={() => setView(view === 'years' ? 'calendar' : 'years')}
                        style={{
                            background: view === 'years' ? '#e5f4ff' : 'transparent',
                            color: view === 'years' ? '#0073ea' : '#323338',
                            border: 'none',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {format(month, 'yyyy')}
                    </button>
                </div>

                <button
                    onClick={handleNextMonth}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#676879' }}
                    className="hover-bg"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            <style>{`
                .hover-bg:hover { background-color: #f5f6f8 !important; }
                /* Hide Default DayPicker Navigation to avoid duplication if we wanted to use default */
                .rdp-nav { display: none; }
                .rdp-caption { display: none; } 
                .rdp-day_selected:not([disabled]) { background-color: #0073ea; }
                .rdp-day:hover:not(.rdp-day_selected) { background-color: #f5f6f8; }
                .rdp { margin: 0; --rdp-cell-size: 36px; } 
            `}</style>

            {/* View Switching */}
            <div style={{ position: 'relative', minHeight: '300px' }}>
                {view === 'calendar' && (
                    <DayPicker
                        mode="single"
                        selected={date}
                        month={month}
                        onMonthChange={setMonthInPicker}
                        onSelect={(d) => {
                            if (d) {
                                onSelect(d);
                                onClose();
                            }
                        }}
                        showOutsideDays
                    />
                )}

                {/* Years View */}
                {view === 'years' && (
                    <div style={{ height: '300px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', paddingRight: '4px' }}>
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => {
                                    setMonthInPicker(current => setYear(current, year));
                                    setView('calendar');
                                }}
                                style={{
                                    padding: '8px 4px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: month.getFullYear() === year ? '#0073ea' : 'transparent',
                                    color: month.getFullYear() === year ? 'white' : '#323338',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: month.getFullYear() === year ? 600 : 400
                                }}
                                ref={month.getFullYear() === year ? (el) => el?.scrollIntoView({ block: 'center' }) : null}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                )}

                {/* Months View */}
                {view === 'months' && (
                    <div style={{ height: '300px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', alignContent: 'start', paddingTop: '16px' }}>
                        {months.map((m, index) => (
                            <button
                                key={m}
                                onClick={() => {
                                    setMonthInPicker(current => setMonth(current, index));
                                    setView('calendar');
                                }}
                                style={{
                                    padding: '12px 8px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    backgroundColor: month.getMonth() === index ? '#0073ea' : 'transparent',
                                    color: month.getMonth() === index ? 'white' : '#323338',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: month.getMonth() === index ? 600 : 400,
                                    textAlign: 'center'
                                }}
                                className="hover-bg"
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer / Today */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e6e9ef', display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={() => {
                        const today = new Date();
                        onSelect(today);
                        setMonthInPicker(today);
                        onClose();
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0073ea',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Today
                </button>
            </div>
        </div>,
        document.body
    );
};
