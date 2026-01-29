import { useState } from 'react';
import { RoleSelector } from './RoleSelector';

interface InviteMemberFormProps {
    onInvite: (email: string, role: string) => Promise<void>;
    defaultRole?: string;
}

export const InviteMemberForm = ({ onInvite, defaultRole = 'member' }: InviteMemberFormProps) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState(defaultRole);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsLoading(true);
        try {
            await onInvite(email, role);
            setEmail('');
            setRole(defaultRole);
        } catch (error) {
            console.error('Error inviting member:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{
            display: 'flex',
            gap: '8px',
            padding: '16px',
            borderBottom: '1px solid hsl(var(--color-border))'
        }}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                disabled={isLoading}
                style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid hsl(var(--color-border))',
                    borderRadius: '4px',
                    fontSize: '14px',
                    outline: 'none'
                }}
            />
            <RoleSelector
                value={role}
                onChange={setRole}
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={isLoading || !email.trim()}
                style={{
                    padding: '8px 16px',
                    backgroundColor: isLoading || !email.trim() ? '#ccc' : '#0073ea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: isLoading || !email.trim() ? 'not-allowed' : 'pointer'
                }}
            >
                {isLoading ? 'Inviting...' : 'Invite'}
            </button>
        </form>
    );
};
