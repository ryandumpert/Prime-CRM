'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout';
import { Card, Button, Input } from '@/components/ui';
import {
    User,
    Camera,
    Save,
    Lock,
    Mail,
    Shield,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Trash2,
    Calendar,
} from 'lucide-react';

interface ProfileData {
    id: string;
    displayName: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    createdAt: string;
}

export default function ProfilePage() {
    const { data: session, update: updateSession } = useSession();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Profile form state
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/profile');
            const data = await res.json();
            if (data.data) {
                setProfile(data.data);
                setDisplayName(data.data.displayName);
                setAvatarUrl(data.data.avatarUrl);
                setAvatarPreview(data.data.avatarUrl);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setProfileMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }

        // Max 500KB for base64 storage
        if (file.size > 500 * 1024) {
            setProfileMessage({ type: 'error', text: 'Image must be smaller than 500KB' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setAvatarPreview(dataUrl);
            setAvatarUrl(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const removeAvatar = () => {
        setAvatarPreview(null);
        setAvatarUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        setProfileMessage(null);

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName, avatarUrl }),
            });

            const data = await res.json();

            if (res.ok) {
                setProfile(data.data);
                setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
                // Update session to reflect name change
                await updateSession({ name: displayName });
            } else {
                setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' });
            }
        } catch (error) {
            setProfileMessage({ type: 'error', text: 'Network error — please try again' });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setIsSavingPassword(true);

        try {
            const res = await fetch('/api/profile/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();

            if (res.ok) {
                setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
            }
        } catch (error) {
            setPasswordMessage({ type: 'error', text: 'Network error — please try again' });
        } finally {
            setIsSavingPassword(false);
        }
    };

    const getInitial = () => {
        return (displayName || profile?.displayName || 'U').charAt(0).toUpperCase();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <>
            <Header
                title="My Profile"
                subtitle="Manage your account settings and preferences"
            />

            <div className="max-w-3xl space-y-6">
                {/* Profile Card */}
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <User className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="font-semibold text-lg">Profile Information</h3>
                    </div>

                    <form onSubmit={handleSaveProfile}>
                        {/* Avatar Section */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-6 rounded-xl bg-[hsl(222,47%,12%)]">
                            <div className="relative group">
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt="Profile photo"
                                        className="w-24 h-24 rounded-full object-cover border-2 border-[hsl(222,47%,20%)]"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold border-2 border-[hsl(222,47%,20%)]">
                                        {getInitial()}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                >
                                    <Camera className="w-6 h-6 text-white" />
                                </button>
                            </div>

                            <div className="flex-1 text-center sm:text-left">
                                <h4 className="font-medium text-lg mb-1">{displayName || 'Your Name'}</h4>
                                <p className="text-gray-300 text-sm mb-3">{profile?.email}</p>
                                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera className="w-4 h-4" />
                                        Upload Photo
                                    </Button>
                                    {avatarPreview && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={removeAvatar}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Remove
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">JPG, PNG or GIF. Max 500KB.</p>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                            />
                        </div>

                        {/* Name & Email Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <Input
                                label="Display Name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your display name"
                                required
                            />
                            <div>
                                <label className="label">Email Address</label>
                                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[hsl(222,47%,12%)] border border-[hsl(222,47%,18%)] text-gray-300">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    {profile?.email}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Contact an admin to change your email.</p>
                            </div>
                        </div>

                        {/* Role & Member Since */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="label">Role</label>
                                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[hsl(222,47%,12%)] border border-[hsl(222,47%,18%)] text-gray-300">
                                    <Shield className="w-4 h-4 text-gray-400" />
                                    <span className="capitalize">{profile?.role}</span>
                                </div>
                            </div>
                            <div>
                                <label className="label">Member Since</label>
                                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[hsl(222,47%,12%)] border border-[hsl(222,47%,18%)] text-gray-300">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    {profile?.createdAt
                                        ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })
                                        : 'N/A'
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Profile Save */}
                        {profileMessage && (
                            <div className={`flex items-center gap-2 p-3 mb-4 rounded-lg text-sm ${profileMessage.type === 'success'
                                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                }`}>
                                {profileMessage.type === 'success'
                                    ? <CheckCircle className="w-4 h-4 shrink-0" />
                                    : <AlertTriangle className="w-4 h-4 shrink-0" />
                                }
                                {profileMessage.text}
                            </div>
                        )}

                        <Button type="submit" isLoading={isSavingProfile}>
                            <Save className="w-4 h-4" />
                            Save Profile
                        </Button>
                    </form>
                </Card>

                {/* Password Card */}
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                            <Lock className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Change Password</h3>
                            <p className="text-sm text-gray-400">Update your password to keep your account secure</p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword}>
                        <div className="space-y-4 mb-6">
                            <Input
                                label="Current Password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter your current password"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="New Password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    required
                                />
                                <Input
                                    label="Confirm New Password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Save */}
                        {passwordMessage && (
                            <div className={`flex items-center gap-2 p-3 mb-4 rounded-lg text-sm ${passwordMessage.type === 'success'
                                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                }`}>
                                {passwordMessage.type === 'success'
                                    ? <CheckCircle className="w-4 h-4 shrink-0" />
                                    : <AlertTriangle className="w-4 h-4 shrink-0" />
                                }
                                {passwordMessage.text}
                            </div>
                        )}

                        <Button type="submit" isLoading={isSavingPassword}>
                            <Lock className="w-4 h-4" />
                            Change Password
                        </Button>
                    </form>
                </Card>
            </div>
        </>
    );
}
