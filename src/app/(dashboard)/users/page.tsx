'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout';
import { Button, Card, Input, Select, Modal } from '@/components/ui';
import {
    Plus,
    Edit,
    Trash2,
    User,
    Shield,
    Users,
    Loader2,
    CheckCircle,
    XCircle
} from 'lucide-react';

interface UserData {
    id: string;
    displayName: string;
    email: string;
    role: 'admin' | 'advisor';
    active: boolean;
    createdAt: string;
    _count: { assignedLeads: number };
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(data.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = () => {
        setEditingUser(null);
        setShowModal(true);
    };

    const handleEditUser = (user: UserData) => {
        setEditingUser(user);
        setShowModal(true);
    };

    const handleToggleActive = async (user: UserData) => {
        try {
            await fetch(`/api/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !user.active }),
            });
            fetchUsers();
        } catch (error) {
            console.error('Error toggling user:', error);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (userData: { displayName: string; email: string; password?: string; role: string }) => {
        try {
            if (editingUser) {
                await fetch(`/api/users/${editingUser.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData),
                });
            } else {
                await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData),
                });
            }
            fetchUsers();
            handleModalClose();
        } catch (error) {
            console.error('Error saving user:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const admins = users.filter(u => u.role === 'admin');
    const advisors = users.filter(u => u.role === 'advisor');

    return (
        <>
            <Header
                title="User Management"
                subtitle={`${users.length} users total`}
            />

            <div className="flex justify-end mb-6">
                <Button onClick={handleCreateUser}>
                    <Plus className="w-4 h-4" />
                    Add User
                </Button>
            </div>

            {/* Admins */}
            <Card className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold">Administrators</h3>
                    <span className="text-sm text-gray-400">({admins.length})</span>
                </div>

                {admins.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No administrators</p>
                ) : (
                    <div className="space-y-3">
                        {admins.map((user) => (
                            <UserRow
                                key={user.id}
                                user={user}
                                onEdit={() => handleEditUser(user)}
                                onToggle={() => handleToggleActive(user)}
                            />
                        ))}
                    </div>
                )}
            </Card>

            {/* Advisors */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold">Advisors</h3>
                    <span className="text-sm text-gray-400">({advisors.length})</span>
                </div>

                {advisors.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No advisors</p>
                ) : (
                    <div className="space-y-3">
                        {advisors.map((user) => (
                            <UserRow
                                key={user.id}
                                user={user}
                                onEdit={() => handleEditUser(user)}
                                onToggle={() => handleToggleActive(user)}
                            />
                        ))}
                    </div>
                )}
            </Card>

            {/* User Modal */}
            <UserModal
                isOpen={showModal}
                onClose={handleModalClose}
                onSave={handleSaveUser}
                user={editingUser}
            />
        </>
    );
}

function UserRow({
    user,
    onEdit,
    onToggle
}: {
    user: UserData;
    onEdit: () => void;
    onToggle: () => void;
}) {
    return (
        <div className={`flex items-center gap-4 p-4 rounded-xl bg-[hsl(222,47%,12%)] ${!user.active && 'opacity-50'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium">{user.displayName}</p>
                    {!user.active && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-300">Inactive</span>
                    )}
                </div>
                <p className="text-sm text-gray-400">{user.email}</p>
            </div>
            <div className="text-center">
                <p className="text-lg font-semibold">{user._count.assignedLeads}</p>
                <p className="text-xs text-gray-400">Leads</p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onEdit}>
                    <Edit className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    title={user.active ? 'Deactivate' : 'Activate'}
                >
                    {user.active ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                </Button>
            </div>
        </div>
    );
}

function UserModal({
    isOpen,
    onClose,
    onSave,
    user
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    user: UserData | null;
}) {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'advisor'>('advisor');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName);
            setEmail(user.email);
            setRole(user.role);
            setPassword('');
        } else {
            setDisplayName('');
            setEmail('');
            setRole('advisor');
            setPassword('');
        }
    }, [user, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const data: any = { displayName, email, role };
        if (password) data.password = password;

        await onSave(data);
        setIsLoading(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={user ? 'Edit User' : 'Create User'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Display Name"
                    placeholder="John Smith"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                />

                <Input
                    label="Email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <Input
                    label={user ? 'New Password (leave blank to keep current)' : 'Password'}
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!user}
                />

                <Select
                    label="Role"
                    options={[
                        { value: 'advisor', label: 'Advisor' },
                        { value: 'admin', label: 'Administrator' },
                    ]}
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'advisor')}
                />

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        {user ? 'Save Changes' : 'Create User'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
