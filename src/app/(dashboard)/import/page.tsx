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
    Download,
    Info
} from 'lucide-react';

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
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
            setResult(null);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && isValidFile(file)) {
            setSelectedFile(file);
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

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
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
        } catch (error) {
            setResult({ success: false, error: 'Upload failed. Please try again.' });
        } finally {
            setIsUploading(false);
        }
    };

    const resetUpload = () => {
        setSelectedFile(null);
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <>
            <Header
                title="Import Leads"
                subtitle="Upload your master leads spreadsheet"
            />

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
                            <li>• Duplicate leads will be updated (matched by email or phone)</li>
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
                        <Button onClick={handleUpload} isLoading={isUploading}>
                            <Upload className="w-4 h-4" />
                            Import Leads
                        </Button>
                    </div>
                )}
            </Card>

            {/* Results */}
            {result && (
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
    );
}
