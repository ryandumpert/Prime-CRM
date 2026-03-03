'use client';

import { useState, useRef } from 'react';
import { Header } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import {
    Upload,
    FileSpreadsheet,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Loader2,
    Info,
    ArrowRight,
    ArrowLeft,
    UserPlus,
    RefreshCw,
    Eye,
    Search,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

interface PreviewRow {
    rowIndex: number;
    action: 'new' | 'update' | 'skip';
    name: string;
    phone: string | null;
    email: string | null;
    loanProduct: string | null;
    leadSource: string | null;
    advisor: string | null;
    matchedOn: string | null;
    existingLeadId: string | null;
}

interface PreviewResult {
    success: boolean;
    totalRows: number;
    stats: {
        newLeads: number;
        updates: number;
        skipped: number;
    };
    detectedColumns: Record<string, string>;
    previewRows: PreviewRow[];
    hasMore: boolean;
    error?: string;
}

interface ImportResult {
    success: boolean;
    importId?: string;
    stats?: {
        rowsProcessed: number;
        rowsInserted: number;
        rowsUpdated: number;
        rowsFailed: number;
    };
    errors?: Array<{
        rowIndex: number;
        message: string;
    }>;
    error?: string;
}

export default function ImportPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Preview state
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'update'>('all');
    const [showColumnMap, setShowColumnMap] = useState(false);

    // Import state
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && isValidFile(file)) {
            setSelectedFile(file);
            setPreview(null);
            setResult(null);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && isValidFile(file)) {
            setSelectedFile(file);
            setPreview(null);
            setResult(null);
        }
    };

    const isValidFile = (file: File) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
        ];
        return validTypes.includes(file.type) ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.xls') ||
            file.name.endsWith('.csv');
    };

    // Step 1: Preview
    const handlePreview = async () => {
        if (!selectedFile) return;

        setIsPreviewing(true);
        setPreview(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch('/api/import/preview', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                setPreview(data);
            } else {
                setPreview({ ...data, success: false });
            }
        } catch {
            setPreview({ success: false, totalRows: 0, stats: { newLeads: 0, updates: 0, skipped: 0 }, detectedColumns: {}, previewRows: [], hasMore: false, error: 'Preview failed. Please try again.' });
        } finally {
            setIsPreviewing(false);
        }
    };

    // Step 2: Confirm import
    const handleImport = async () => {
        if (!selectedFile) return;

        setIsImporting(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch('/api/import', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            setResult(data);
        } catch {
            setResult({ success: false, error: 'Upload failed. Please try again.' });
        } finally {
            setIsImporting(false);
        }
    };

    const resetUpload = () => {
        setSelectedFile(null);
        setPreview(null);
        setResult(null);
        setPreviewFilter('all');
        setShowColumnMap(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const filteredPreviewRows = preview?.previewRows.filter(row => {
        if (previewFilter === 'all') return true;
        return row.action === previewFilter;
    }) || [];

    // Current step determination
    const step = result ? 3 : preview?.success ? 2 : 1;

    return (
        <>
            <Header
                title="Import Leads"
                subtitle="Upload your master leads spreadsheet"
            />

            {/* Step Indicator */}
            <div className="flex items-center gap-3 mb-6">
                {[
                    { num: 1, label: 'Upload File' },
                    { num: 2, label: 'Preview & Review' },
                    { num: 3, label: 'Import Complete' },
                ].map((s, i) => (
                    <div key={s.num} className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${step === s.num
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : step > s.num
                                    ? 'bg-green-500/15 text-green-300 border border-green-500/20'
                                    : 'bg-[hsl(222,47%,11%)] text-gray-500 border border-[hsl(222,47%,18%)]'
                            }`}>
                            {step > s.num ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                                <span className="w-4 text-center">{s.num}</span>
                            )}
                            <span className="hidden sm:inline">{s.label}</span>
                        </div>
                        {i < 2 && (
                            <ArrowRight className="w-4 h-4 text-gray-600" />
                        )}
                    </div>
                ))}
            </div>

            {/* === STEP 1: Upload File === */}
            {step === 1 && (
                <>
                    {/* Instructions */}
                    <Card className="mb-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/20">
                                <Info className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Import Instructions</h3>
                                <ul className="text-sm text-gray-300 space-y-1">
                                    <li>• Upload your <strong>master leads list</strong> spreadsheet (Excel or CSV)</li>
                                    <li>• The first row should contain column headers</li>
                                    <li>• Include an <strong>advisor column</strong> (e.g., &quot;Advisor&quot;, &quot;Assigned Advisor&quot;, &quot;Loan Officer&quot;) to auto-assign leads</li>
                                    <li>• Supported formats: .xlsx, .xls, .csv</li>
                                    <li>• You&apos;ll see a <strong>preview</strong> of new vs. existing leads before importing</li>
                                </ul>
                            </div>
                        </div>
                    </Card>

                    {/* Upload Area */}
                    <Card className="mb-6">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {!selectedFile ? (
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                                    border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                                    ${isDragging
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-[hsl(222,47%,20%)] hover:border-[hsl(222,47%,30%)] hover:bg-[hsl(222,47%,12%)]'
                                    }
                                `}
                            >
                                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <p className="text-lg font-medium mb-2">
                                    Drop your spreadsheet here or click to browse
                                </p>
                                <p className="text-sm text-gray-400">
                                    Supports Excel (.xlsx, .xls) and CSV files
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-xl bg-[hsl(222,47%,14%)]">
                                    <FileSpreadsheet className="w-8 h-8 text-green-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{selectedFile.name}</p>
                                    <p className="text-sm text-gray-400">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <Button variant="ghost" onClick={resetUpload}>
                                    Remove
                                </Button>
                                <Button onClick={handlePreview} isLoading={isPreviewing}>
                                    <Eye className="w-4 h-4" />
                                    Preview Import
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Column Mapping Reference */}
                    <Card className="mt-6">
                        <h3 className="font-semibold mb-4">Column Mapping Reference</h3>
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>CRM Field</th>
                                        <th>Recognized Headers</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="font-medium">First Name</td>
                                        <td className="text-gray-300">first name, firstname, first_name</td>
                                    </tr>
                                    <tr>
                                        <td className="font-medium">Last Name</td>
                                        <td className="text-gray-300">last name, lastname, last_name</td>
                                    </tr>
                                    <tr>
                                        <td className="font-medium">Full Name</td>
                                        <td className="text-gray-300">name, full name, fullname</td>
                                    </tr>
                                    <tr>
                                        <td className="font-medium">Phone</td>
                                        <td className="text-gray-300">phone, mobile, cell, primary phone</td>
                                    </tr>
                                    <tr>
                                        <td className="font-medium">Email</td>
                                        <td className="text-gray-300">email, email address, e-mail</td>
                                    </tr>
                                    <tr>
                                        <td className="font-medium">Advisor Assignment</td>
                                        <td className="text-gray-300">advisor, assigned advisor, loan officer, lo, advisor name, assigned to, rep</td>
                                    </tr>
                                    <tr>
                                        <td className="font-medium">Date of Entry</td>
                                        <td className="text-gray-300">date, date of entry, entry date, created, lead date</td>
                                    </tr>
                                    <tr>
                                        <td className="font-medium">Loan Product</td>
                                        <td className="text-gray-300">loan product, loan type, product, product type</td>
                                    </tr>
                                    <tr>
                                        <td className="font-medium">Source</td>
                                        <td className="text-gray-300">source, lead source, referral source, origin</td>
                                    </tr>
                                    <tr>
                                        <td className="font-medium">Notes</td>
                                        <td className="text-gray-300">notes, note, comments, comment, remarks</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}

            {/* === STEP 2: Preview & Review === */}
            {step === 2 && preview && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="border-green-500/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-green-500/15">
                                    <UserPlus className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-green-400">{preview.stats.newLeads}</p>
                                    <p className="text-sm text-gray-400">New Leads</p>
                                    <p className="text-xs text-gray-500">Will be created</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="border-blue-500/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/15">
                                    <RefreshCw className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-blue-400">{preview.stats.updates}</p>
                                    <p className="text-sm text-gray-400">Existing Leads</p>
                                    <p className="text-xs text-gray-500">Will be updated</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="border-gray-500/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-gray-500/15">
                                    <FileSpreadsheet className="w-6 h-6 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-gray-300">{preview.totalRows}</p>
                                    <p className="text-sm text-gray-400">Total Rows</p>
                                    <p className="text-xs text-gray-500">{preview.stats.skipped > 0 ? `${preview.stats.skipped} empty/skipped` : 'in spreadsheet'}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Detected Columns */}
                    <Card className="mb-6">
                        <button
                            onClick={() => setShowColumnMap(!showColumnMap)}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <div className="flex items-center gap-2">
                                <Search className="w-4 h-4 text-blue-400" />
                                <span className="font-semibold">Detected Columns</span>
                                <span className="text-xs text-gray-400 bg-[hsl(222,47%,14%)] px-2 py-0.5 rounded-full">
                                    {Object.keys(preview.detectedColumns).length} mapped
                                </span>
                            </div>
                            {showColumnMap ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                        {showColumnMap && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(preview.detectedColumns).map(([field, header]) => (
                                    <div key={field} className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(222,47%,10%)] text-sm">
                                        <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                        <span className="text-gray-300">{field}</span>
                                        <span className="text-gray-600">←</span>
                                        <span className="text-gray-400 truncate">&quot;{header}&quot;</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Preview Table */}
                    <Card className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Lead Preview</h3>
                            <div className="flex items-center gap-2">
                                {(['all', 'new', 'update'] as const).map(filter => {
                                    const count = filter === 'all'
                                        ? preview.previewRows.length
                                        : preview.previewRows.filter(r => r.action === filter).length;
                                    return (
                                        <button
                                            key={filter}
                                            onClick={() => setPreviewFilter(filter)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${previewFilter === filter
                                                    ? filter === 'new'
                                                        ? 'bg-green-500/15 border-green-500/30 text-green-300'
                                                        : filter === 'update'
                                                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                                                            : 'bg-white/10 border-white/20 text-white'
                                                    : 'bg-transparent border-[hsl(222,47%,18%)] text-gray-400 hover:text-gray-200'
                                                }`}
                                        >
                                            {filter === 'all' ? 'All' : filter === 'new' ? '+ New' : '↻ Update'} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[hsl(222,47%,18%)]">
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs uppercase">Row</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs uppercase">Action</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs uppercase">Name</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs uppercase">Phone</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs uppercase">Email</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs uppercase">Product</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs uppercase">Advisor</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs uppercase">Matched On</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPreviewRows.slice(0, 100).map(row => (
                                        <tr
                                            key={row.rowIndex}
                                            className={`border-b border-[hsl(222,47%,14%)] transition-colors ${row.action === 'new'
                                                    ? 'hover:bg-green-500/5'
                                                    : 'hover:bg-blue-500/5'
                                                }`}
                                        >
                                            <td className="py-2 px-3 text-gray-500 text-xs">{row.rowIndex}</td>
                                            <td className="py-2 px-3">
                                                {row.action === 'new' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/20">
                                                        <UserPlus className="w-3 h-3" /> New
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                                                        <RefreshCw className="w-3 h-3" /> Update
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 font-medium text-white">{row.name}</td>
                                            <td className="py-2 px-3 text-gray-300">{row.phone || '—'}</td>
                                            <td className="py-2 px-3 text-gray-300 max-w-[180px] truncate">{row.email || '—'}</td>
                                            <td className="py-2 px-3 text-gray-400">{row.loanProduct || '—'}</td>
                                            <td className="py-2 px-3 text-gray-400">
                                                {row.advisor?.includes('(unmatched)') ? (
                                                    <span className="text-amber-400">{row.advisor}</span>
                                                ) : (
                                                    row.advisor || '—'
                                                )}
                                            </td>
                                            <td className="py-2 px-3">
                                                {row.matchedOn ? (
                                                    <span className="text-xs text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                        {row.matchedOn}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {preview.hasMore && (
                            <div className="mt-3 text-center text-xs text-gray-500">
                                Showing first {preview.previewRows.length} of {preview.stats.newLeads + preview.stats.updates} leads. Full import will process all rows.
                            </div>
                        )}
                        {filteredPreviewRows.length > 100 && (
                            <div className="mt-3 text-center text-xs text-gray-500">
                                Showing 100 of {filteredPreviewRows.length} {previewFilter === 'all' ? '' : previewFilter} leads in preview.
                            </div>
                        )}
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={resetUpload}>
                            <ArrowLeft className="w-4 h-4" />
                            Back to Upload
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-400">
                                <span className="text-green-300 font-medium">{preview.stats.newLeads}</span> new
                                {' + '}
                                <span className="text-blue-300 font-medium">{preview.stats.updates}</span> updates
                            </div>
                            <Button onClick={handleImport} isLoading={isImporting}>
                                <Upload className="w-4 h-4" />
                                Confirm Import
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {/* === STEP 3: Import Results === */}
            {step === 3 && result && (
                <Card>
                    {result.success ? (
                        <>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-xl bg-green-500/20">
                                    <CheckCircle className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-green-400">Import Successful</h3>
                                    <p className="text-sm text-gray-300">
                                        Your leads have been imported successfully
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div className="p-4 rounded-xl bg-[hsl(222,47%,12%)] text-center">
                                    <p className="text-2xl font-bold">{result.stats?.rowsProcessed || 0}</p>
                                    <p className="text-sm text-gray-400">Processed</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[hsl(222,47%,12%)] text-center">
                                    <p className="text-2xl font-bold text-green-400">{result.stats?.rowsInserted || 0}</p>
                                    <p className="text-sm text-gray-400">New Leads</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[hsl(222,47%,12%)] text-center">
                                    <p className="text-2xl font-bold text-blue-400">{result.stats?.rowsUpdated || 0}</p>
                                    <p className="text-sm text-gray-400">Updated</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[hsl(222,47%,12%)] text-center">
                                    <p className="text-2xl font-bold text-red-400">{result.stats?.rowsFailed || 0}</p>
                                    <p className="text-sm text-gray-400">Failed</p>
                                </div>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="border-t border-[hsl(222,47%,18%)] pt-4 mt-4">
                                    <div className="flex items-center gap-2 text-yellow-400 mb-3">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="font-medium">Some rows had errors</span>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {result.errors.map((error, i) => (
                                            <div key={i} className="text-sm p-2 rounded bg-[hsl(222,47%,10%)]">
                                                <span className="text-gray-400">Row {error.rowIndex}:</span>{' '}
                                                <span className="text-gray-200">{error.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end mt-4">
                                <Button onClick={resetUpload}>
                                    Import Another File
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-red-500/20">
                                <XCircle className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-red-400">Import Failed</h3>
                                <p className="text-sm text-gray-300">{result.error || 'An unknown error occurred'}</p>
                            </div>
                            <Button variant="secondary" onClick={resetUpload}>
                                Try Again
                            </Button>
                        </div>
                    )}
                </Card>
            )}
        </>
    );
}
