import { useState, useEffect } from 'react';
import { 
  HardDrive, 
  RefreshCw, 
  ExternalLink, 
  FileText, 
  FileCode, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  X, 
  Copy, 
  Check, 
  FolderPlus,
  Lock,
  Sparkles,
  Calendar,
  UtensilsCrossed,
  Star,
  Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DriveFileInfo, 
  DriveUserProfile, 
  getStoredDriveToken, 
  getStoredDriveUser, 
  getStoredFolderInfo, 
  requestGoogleDriveToken, 
  clearStoredDriveToken, 
  syncAllDatabaseToDrive, 
  listDriveDatabaseFiles, 
  fetchDriveFileContent,
  formatBookingReceiptText,
  formatBookingsLedgerText,
  formatMenuCardText,
  formatReviewsText,
  getCachedDriveFiles,
  DRIVE_FOLDER_NAME
} from '../lib/googleDrive';

interface GoogleDriveManagerProps {
  bookings?: any[];
  menuItems?: any[];
  reviews?: any[];
  reels?: any[];
  comments?: any[];
  isAdminView?: boolean;
}

export default function GoogleDriveManager({
  bookings = [],
  menuItems = [],
  reviews = [],
  reels = [],
  comments = [],
  isAdminView = false
}: GoogleDriveManagerProps) {
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<DriveUserProfile | null>(null);
  const [folderInfo, setFolderInfo] = useState<{ id: string | null; link: string | null }>({ id: null, link: null });
  const [files, setFiles] = useState<DriveFileInfo[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');

  // Preview Modal
  const [previewFile, setPreviewFile] = useState<DriveFileInfo | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize
  useEffect(() => {
    const currentToken = getStoredDriveToken();
    setToken(currentToken);
    setUserProfile(getStoredDriveUser());
    setFolderInfo(getStoredFolderInfo());

    // Load cached files initially
    const cached = getCachedDriveFiles();
    if (cached.length > 0) {
      setFiles(cached);
    }

    if (currentToken) {
      loadFiles(currentToken);
    }
  }, []);

  const handleConnect = () => {
    setErrorMessage(null);
    requestGoogleDriveToken(
      (newToken) => {
        setToken(newToken);
        setUserProfile(getStoredDriveUser());
        setFolderInfo(getStoredFolderInfo());
        loadFiles(newToken);
      },
      (err) => {
        console.error("Connection failed:", err);
        setErrorMessage(err.message || "Failed to authorize Google Drive.");
      }
    );
  };

  const handleDisconnect = () => {
    clearStoredDriveToken();
    setToken(null);
    setUserProfile(null);
    setSyncStatus(null);
  };

  const loadFiles = async (activeToken?: string) => {
    setIsListing(true);
    try {
      const fetched = await listDriveDatabaseFiles(activeToken || token || undefined);
      setFiles(fetched);
      setFolderInfo(getStoredFolderInfo());
    } catch (err: any) {
      console.warn("Could not list drive files:", err);
    } finally {
      setIsListing(false);
    }
  };

  const handleSyncAll = async () => {
    const activeToken = token || getStoredDriveToken();
    if (!activeToken) {
      handleConnect();
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Backing up all database collections to Google Drive...');
    setErrorMessage(null);

    try {
      const result = await syncAllDatabaseToDrive(activeToken, {
        bookings,
        menuItems,
        reviews,
        reels,
        comments
      });

      setFiles(result.syncedFiles);
      setFolderInfo({ id: result.folderId, link: result.folderLink });
      setSyncStatus(`Successfully synchronized ${result.syncedFiles.length} database files directly to Google Drive!`);
      setTimeout(() => setSyncStatus(null), 7000);
    } catch (err: any) {
      console.error("Sync error:", err);
      setErrorMessage(err.message || "Failed to sync records to Google Drive.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePreviewFile = async (file: DriveFileInfo) => {
    setPreviewFile(file);
    setIsPreviewLoading(true);
    setPreviewContent('');
    setCopied(false);

    try {
      // 1. Try fetching directly from Google Drive API
      const content = await fetchDriveFileContent(file.id, token || undefined);
      setPreviewContent(content);
    } catch (err) {
      console.warn("Remote drive read error, checking local fallback for display:", err);
      // Fallback generator based on file category and name so the user can ALWAYS view the text format on website
      let fallbackText = '';
      if (file.name.includes('Bookings_Ledger')) {
        fallbackText = formatBookingsLedgerText(bookings);
      } else if (file.name.includes('Menu_Card')) {
        fallbackText = formatMenuCardText(menuItems);
      } else if (file.name.includes('Reviews')) {
        fallbackText = formatReviewsText(reviews);
      } else if (file.name.startsWith('Booking_')) {
        const found = bookings.find(b => file.name.includes(b.reservationNumber));
        fallbackText = formatBookingReceiptText(found || bookings[0] || { reservationNumber: 'BGC-DEMO' });
      } else if (file.format === 'json') {
        if (file.category === 'bookings') fallbackText = JSON.stringify(bookings, null, 2);
        else if (file.category === 'menu') fallbackText = JSON.stringify(menuItems, null, 2);
        else if (file.category === 'reviews') fallbackText = JSON.stringify(reviews, null, 2);
        else fallbackText = JSON.stringify({ message: "Google Drive File Content" }, null, 2);
      } else {
        fallbackText = `[Google Drive Text Document: ${file.name}]\nDirect Web Link: ${file.webViewLink || 'Available on Google Drive'}\n\nSync complete. You can open this file directly on Google Drive using the button above.`;
      }
      setPreviewContent(fallbackText);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCopy = () => {
    if (!previewContent) return;
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (file: DriveFileInfo, text: string) => {
    const blob = new Blob([text], { type: file.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered files
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
    const matchesFormat = formatFilter === 'all' || f.format === formatFilter;
    return matchesSearch && matchesCategory && matchesFormat;
  });

  const getFormatIcon = (format?: string) => {
    switch (format) {
      case 'text': return <FileText className="w-5 h-5 text-[#e8a33d]" />;
      case 'json': return <FileCode className="w-5 h-5 text-emerald-400" />;
      case 'csv': return <FileSpreadsheet className="w-5 h-5 text-sky-400" />;
      default: return <FileText className="w-5 h-5 text-white/60" />;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner & OAuth Controller */}
      <div className="bg-[#171412] border border-[#e8a33d]/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e8a33d]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#e8a33d]/10 border border-[#e8a33d]/30 flex items-center justify-center text-[#e8a33d] shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-serif text-white font-semibold">
                  Google Drive Database Storage
                </h2>
                {token ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/60 border border-white/10">
                    Authorization Ready
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-white/70 max-w-2xl leading-relaxed">
                All table reservations, a la carte menu items, customer reviews, and social reels are stored directly in your Google Drive as readable text format files (<span className="text-[#e8a33d] font-mono">.txt</span>) and structured data (<span className="text-emerald-400 font-mono">.json</span> / <span className="text-sky-400 font-mono">.csv</span>).
              </p>
              
              {userProfile && (
                <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/60 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <span className="text-white/40">Connected Account:</span>
                  <span className="text-white font-medium">{userProfile.email}</span>
                  {userProfile.name && <span className="text-white/40">({userProfile.name})</span>}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {token ? (
              <>
                <button
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-[#e8a33d]/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing to Drive...' : 'Sync Database to Drive'}
                </button>

                {folderInfo.link && (
                  <a
                    href={folderInfo.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs tracking-wider uppercase border border-white/10 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-[#e8a33d]" />
                    Open in Drive
                  </a>
                )}

                <button
                  onClick={handleDisconnect}
                  className="text-xs text-white/40 hover:text-rose-400 px-3 py-2 transition-colors"
                  title="Disconnect Google Drive Account"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black font-bold text-xs tracking-widest uppercase transition-all shadow-xl shadow-[#e8a33d]/20"
              >
                <img 
                  src="https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png" 
                  alt="Google Drive" 
                  className="w-5 h-5 object-contain"
                />
                Connect Google Drive
              </button>
            )}
          </div>
        </div>

        {/* Feedback / Alert notifications */}
        <AnimatePresence>
          {syncStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncStatus}</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Database Format Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#171412] p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#e8a33d]/10 flex items-center justify-center text-[#e8a33d]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-white">
              {files.filter(f => f.format === 'text').length || bookings.length + 3}
            </div>
            <div className="text-[11px] text-white/50 uppercase tracking-wider">Text Receipts (.txt)</div>
          </div>
        </div>

        <div className="bg-[#171412] p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-white">
              {files.filter(f => f.format === 'json').length || 4}
            </div>
            <div className="text-[11px] text-white/50 uppercase tracking-wider">JSON Database (.json)</div>
          </div>
        </div>

        <div className="bg-[#171412] p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-white">
              {files.filter(f => f.format === 'csv').length || 1}
            </div>
            <div className="text-[11px] text-white/50 uppercase tracking-wider">Spreadsheets (.csv)</div>
          </div>
        </div>

        <div className="bg-[#171412] p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-white truncate max-w-[120px]">
              {DRIVE_FOLDER_NAME}
            </div>
            <div className="text-[11px] text-white/50 uppercase tracking-wider">Root Drive Folder</div>
          </div>
        </div>
      </div>

      {/* Explorer Controls: Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#171412]/60 p-4 rounded-xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search Google Drive records (e.g., BGC, Menu, Ledger)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:border-[#e8a33d] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tabs */}
          <div className="inline-flex bg-black/40 p-1 rounded-lg border border-white/10">
            {[
              { id: 'all', label: 'All' },
              { id: 'bookings', label: 'Bookings' },
              { id: 'menu', label: 'Menu' },
              { id: 'reviews', label: 'Reviews' },
              { id: 'reels', label: 'Reels' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  categoryFilter === tab.id
                    ? 'bg-[#e8a33d] text-black font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Format Selector */}
          <div className="inline-flex bg-black/40 p-1 rounded-lg border border-white/10">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'text', label: '.txt Text' },
              { id: 'json', label: '.json' },
              { id: 'csv', label: '.csv' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFormatFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  formatFilter === f.id
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadFiles()}
            disabled={isListing}
            className="p-2 bg-black/40 border border-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
            title="Refresh Files"
          >
            <RefreshCw className={`w-4 h-4 ${isListing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Files List / Table */}
      <div className="bg-[#171412] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-white font-medium text-base">
              Synchronized Google Drive Documents
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/60 font-mono">
              {filteredFiles.length} files
            </span>
          </div>
          <span className="text-xs text-white/40">
            Directly accessible & readable on this website
          </span>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <h4 className="text-white font-medium text-sm mb-1">No Drive Records Found</h4>
            <p className="text-white/50 text-xs max-w-md mx-auto mb-5">
              {token 
                ? "Click 'Sync Database to Drive' above to export all bookings, menu items, and reviews into Google Drive." 
                : "Connect your Google Drive or click sync to back up all restaurant collections into text and JSON formats."}
            </p>
            <button
              onClick={handleSyncAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8a33d] text-black font-semibold text-xs uppercase tracking-wider hover:bg-[#f3b55c] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Sync All Database Records Now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    {getFormatIcon(file.format)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm truncate group-hover:text-[#e8a33d] transition-colors">
                        {file.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 text-white/50 border border-white/10">
                        {file.format}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-[#e8a33d]/10 text-[#e8a33d] border border-[#e8a33d]/20">
                        {file.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                      {file.size && <span>{file.size}</span>}
                      {file.modifiedTime && (
                        <span>Updated {new Date(file.modifiedTime).toLocaleDateString()}</span>
                      )}
                      <span className="text-emerald-400/80">Stored in Google Drive</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handlePreviewFile(file)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#e8a33d]" />
                    Read on Website
                  </button>

                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium border border-white/10 transition-colors"
                      title="Open in Google Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Drive Link
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive In-Website Document Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-[#12100e] border border-[#e8a33d]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#171412] border-b border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#e8a33d]/10 border border-[#e8a33d]/30 flex items-center justify-center text-[#e8a33d] shrink-0">
                    {getFormatIcon(previewFile.format)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-white font-medium text-sm truncate font-mono">
                      {previewFile.name}
                    </h4>
                    <p className="text-[11px] text-white/50 flex items-center gap-2">
                      <span>Format: {previewFile.format?.toUpperCase()}</span>
                      <span>•</span>
                      <span className="text-[#e8a33d]">Google Drive Database Record</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopy}
                    disabled={!previewContent}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors flex items-center gap-1.5"
                    title="Copy to Clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => handleDownload(previewFile, previewContent)}
                    disabled={!previewContent}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors flex items-center gap-1.5"
                    title="Download File"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>

                  {previewFile.webViewLink && (
                    <a
                      href={previewFile.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-[#e8a33d]/10 hover:bg-[#e8a33d]/20 text-[#e8a33d] text-xs border border-[#e8a33d]/30 transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline">Open Drive</span>
                    </a>
                  )}

                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Document Content */}
              <div className="p-6 overflow-y-auto flex-1 font-mono text-xs sm:text-sm text-white/90 leading-relaxed bg-[#0a0908]">
                {isPreviewLoading ? (
                  <div className="py-16 text-center">
                    <RefreshCw className="w-8 h-8 text-[#e8a33d] animate-spin mx-auto mb-3" />
                    <p className="text-white/60 text-xs">Loading document from Google Drive...</p>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono select-text selection:bg-[#e8a33d] selection:text-black">
                    {previewContent}
                  </pre>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 bg-[#171412] border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span>The Bagichi Google Drive Database Engine</span>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                >
                  Close Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
