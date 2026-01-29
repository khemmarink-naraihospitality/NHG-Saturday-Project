import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface RoleSelectorProps {
    value: string;
    onChange: (role: string) => void;
    disabled?: boolean;
    allowedRoles?: string[];
}

export const RoleSelector = ({ value, onChange, disabled = false, allowedRoles }: RoleSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

    const roles = allowedRoles || ['viewer', 'member', 'admin'];

    const roleLabels: Record<string, string> = {
        viewer: 'Viewer',
        member: 'Member',
        admin: 'Admin',
        owner: 'Owner'
    };

    const roleDescriptions: Record<string, string> = {
        viewer: 'Can view only',
        member: 'Can edit items & columns',
        admin: 'Can manage members & boards',
        owner: 'Full control'
    };

    useLayoutEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();

            // Default position: Bottom Left aligned of the button
            let top = rect.bottom + 4;
            // Check usage of space below
            const spaceBelow = window.innerHeight - top;
            // Flip if tight (simplified logic)
            if (spaceBelow < 200) {
                // logic to flip if needed
            }

            let left = rect.left;

            // Ensure functionality on small screens
            if (left + 220 > window.innerWidth) {
                left = window.innerWidth - 230;
            }

            setCoords({ top, left });
        }
    }, [isOpen]);

    // Use portal to render dropdown outside of any transformed parents (modals)
    const dropdown = isOpen && !disabled && coords ? (
        <>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999
                }}
                onClick={() => setIsOpen(false)}
            />
            <div style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                zIndex: 10000,
                backgroundColor: 'white',
                border: '1px solid hsl(var(--color-border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '220px',
                overflow: 'hidden'
            }}>
                {roles.map(role => (
                    <button
                        key={role}
                        onClick={() => {
                            onChange(role);
                            setIsOpen(false);
                        }}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: 'none',
                            backgroundColor: value === role ? '#f0f7ff' : 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            borderBottom: '1px solid #f5f6f8'
                        }}
                        onMouseEnter={(e) => {
                            if (value !== role) e.currentTarget.style.backgroundColor = 'hsl(var(--color-bg-hover))';
                        }}
                        onMouseLeave={(e) => {
                            if (value !== role) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <div style={{ fontWeight: 500, fontSize: '14px' }}>
                            {roleLabels[role]}
                        </div>
                        <div style={{ fontSize: '12px', color: 'hsl(var(--color-text-tertiary))' }}>
                            {roleDescriptions[role]}
                        </div>
                    </button>
                ))}
            </div>
        </>
    ) : null;

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                style={{
                    padding: '6px 12px',
                    border: '1px solid hsl(var(--color-border))',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    color: disabled ? 'hsl(var(--color-text-tertiary))' : 'hsl(var(--color-text-primary))',
                    minWidth: '100px',
                    textAlign: 'left'
                }}
            >
                {roleLabels[value] || value}
            </button>
            {dropdown && createPortal(dropdown, document.body)}
        </>
    );
};
