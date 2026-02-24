'use client';

import { Header } from '@/components/layout';
import { Card, Button, Input } from '@/components/ui';
import {
    Settings,
    Database,
    Shield,
    Bell,
    Palette,
    Save
} from 'lucide-react';

export default function SettingsPage() {
    return (
        <>
            <Header
                title="Settings"
                subtitle="Manage CRM configuration"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <Settings className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="font-semibold">General Settings</h3>
                    </div>
                    <div className="space-y-4">
                        <Input
                            label="Company Name"
                            defaultValue="Prime Loan Advisors"
                        />
                        <Input
                            label="Support Email"
                            type="email"
                            defaultValue="support@primeloanadvisors.com"
                        />
                        <Button className="mt-2">
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </div>
                </Card>

                {/* Daily Call List Settings */}
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                            <Bell className="w-5 h-5 text-orange-400" />
                        </div>
                        <h3 className="font-semibold">Daily Call List</h3>
                    </div>
                    <div className="space-y-4">
                        <Input
                            label="Days Since Last Contact Threshold"
                            type="number"
                            defaultValue="5"
                            disabled
                        />
                        <p className="text-sm text-gray-500">
                            Leads not contacted within this many days will appear on the daily call list.
                            <br />
                            <span className="text-yellow-400">Note: This value is configured in the codebase per blueprint spec.</span>
                        </p>
                    </div>
                </Card>

                {/* Import Settings */}
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-green-500/20">
                            <Database className="w-5 h-5 text-green-400" />
                        </div>
                        <h3 className="font-semibold">Import Settings</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-400 mb-2">Default Import Source</p>
                            <p className="font-medium">master_leads_list</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-2">Advisor Assignment Column</p>
                            <p className="font-medium">Column L</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-2">Deduplication Strategy</p>
                            <p className="font-medium">Email → Phone → External Row ID</p>
                        </div>
                    </div>
                </Card>

                {/* Security Settings */}
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="font-semibold">Security & Compliance</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Role-Based Access Control</p>
                                <p className="text-sm text-gray-500">Advisors can only view assigned leads</p>
                            </div>
                            <span className="text-green-400 text-sm">Enabled</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Audit Logging</p>
                                <p className="text-sm text-gray-500">Track all lead changes</p>
                            </div>
                            <span className="text-green-400 text-sm">Enabled</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Do Not Contact Enforcement</p>
                                <p className="text-sm text-gray-500">Prevent contacting DNC flagged leads</p>
                            </div>
                            <span className="text-green-400 text-sm">Enabled</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Status Configuration Reference */}
            <Card className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                        <Palette className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h3 className="font-semibold">Status Configuration</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    Lead status flow is configured per the blueprint specification. Terminal statuses are:
                </p>
                <div className="flex flex-wrap gap-2">
                    {['CLOSED_FUNDED', 'NOT_INTERESTED', 'UNQUALIFIED', 'LOST', 'DO_NOT_CONTACT'].map(status => (
                        <span key={status} className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm">
                            {status}
                        </span>
                    ))}
                </div>
            </Card>
        </>
    );
}
