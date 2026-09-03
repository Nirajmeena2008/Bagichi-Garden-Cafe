// Google Drive Integration Service for The Bagichi Garden Cafe & Restaurant
// Implements client-side OAuth 2.0 via Google Identity Services (GSI)
// and Google Drive REST API v3 for storing and accessing restaurant database records in text and native formats.

export const GOOGLE_OAUTH_CLIENT_ID = "1081929629998-hhavbvlhn2lc38q1snpph4aeapjg2sj6.apps.googleusercontent.com";
export const DRIVE_FOLDER_NAME = "The Bagichi - Restaurant Database & Bookings";

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  category?: 'bookings' | 'menu' | 'reviews' | 'reels' | 'system';
  format?: 'text' | 'json' | 'csv' | 'other';
}

export interface DriveUserProfile {
  email: string;
  name: string;
  picture?: string;
}

export interface DriveSyncResult {
  folderId: string;
  folderLink: string;
  syncedFiles: DriveFileInfo[];
  syncedAt: string;
}

// Token Storage Keys
const TOKEN_KEY = 'bagichi_gdrive_access_token';
const EXPIRY_KEY = 'bagichi_gdrive_token_expiry';
const USER_KEY = 'bagichi_gdrive_user_profile';
const FOLDER_ID_KEY = 'bagichi_gdrive_folder_id';
const FOLDER_LINK_KEY = 'bagichi_gdrive_folder_link';
const CACHED_FILES_KEY = 'bagichi_gdrive_cached_files';

// Check if user has active, unexpired Google Drive token
export function getStoredDriveToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    // Expired
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return null;
  }
  return token;
}

export function storeDriveToken(token: string, expiresInSeconds: number = 3600) {
  localStorage.setItem(TOKEN_KEY, token);
  // Subtract 60 seconds buffer
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + (expiresInSeconds - 60) * 1000));
}

export function clearStoredDriveToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredDriveUser(): DriveUserProfile | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function getStoredFolderInfo(): { id: string | null; link: string | null } {
  return {
    id: localStorage.getItem(FOLDER_ID_KEY),
    link: localStorage.getItem(FOLDER_LINK_KEY)
  };
}

export function getCachedDriveFiles(): DriveFileInfo[] {
  const data = localStorage.getItem(CACHED_FILES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function setCachedDriveFiles(files: DriveFileInfo[]) {
  localStorage.setItem(CACHED_FILES_KEY, JSON.stringify(files));
}

// Request Token using Google Identity Services (GSI)
export function requestGoogleDriveToken(onSuccess: (token: string) => void, onError: (err: any) => void) {
  if (typeof window === 'undefined') return;

  const w = window as any;
  if (!w.google || !w.google.accounts || !w.google.accounts.oauth2) {
    onError(new Error("Google Identity Services library not yet loaded. Please try again in a few seconds."));
    return;
  }

  try {
    const client = w.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (response: any) => {
        if (response.error) {
          console.error("GSI OAuth error:", response);
          onError(new Error(response.error_description || response.error));
          return;
        }
        if (response.access_token) {
          const token = response.access_token;
          const expiresIn = Number(response.expires_in) || 3600;
          storeDriveToken(token, expiresIn);

          // Fetch user profile info
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (userRes.ok) {
              const profile = await userRes.json();
              localStorage.setItem(USER_KEY, JSON.stringify({
                email: profile.email,
                name: profile.name,
                picture: profile.picture
              }));
            }
          } catch (profileErr) {
            console.warn("Could not fetch user profile:", profileErr);
          }

          onSuccess(token);
        }
      },
    });

    client.requestAccessToken({ prompt: 'consent' });
  } catch (err) {
    console.error("Failed to initialize GSI token client:", err);
    onError(err);
  }
}

// Convenient alias for components
export const initiateDriveAuth = requestGoogleDriveToken;

// Ensure the dedicated database folder exists in Google Drive
export async function getOrCreateDatabaseFolder(token: string): Promise<{ id: string; webViewLink: string }> {
  // Check if we already cached folder info
  const cached = getStoredFolderInfo();
  if (cached.id) {
    try {
      const verifyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${cached.id}?fields=id,name,webViewLink,trashed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (verifyRes.ok) {
        const data = await verifyRes.json();
        if (!data.trashed) {
          return { id: data.id, webViewLink: data.webViewLink || cached.link || '' };
        }
      }
    } catch {
      // re-query below
    }
  }

  // Search by name
  const q = encodeURIComponent(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const folder = searchData.files[0];
      localStorage.setItem(FOLDER_ID_KEY, folder.id);
      localStorage.setItem(FOLDER_LINK_KEY, folder.webViewLink || '');
      return { id: folder.id, webViewLink: folder.webViewLink || '' };
    }
  }

  // Not found: Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Central Google Drive repository for The Bagichi restaurant database, table bookings, menu records, and customer reviews.'
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder: ${errText}`);
  }

  const newFolder = await createRes.json();
  localStorage.setItem(FOLDER_ID_KEY, newFolder.id);
  localStorage.setItem(FOLDER_LINK_KEY, newFolder.webViewLink || '');

  // Set permissions: allow anyone with the link to view (so web users can open drive receipts/files)
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${newFolder.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn("Could not set public reader permission on folder:", permErr);
  }

  return { id: newFolder.id, webViewLink: newFolder.webViewLink || '' };
}

export const KOT_FOLDER_NAME = "kot";
const KOT_FOLDER_ID_KEY = 'bagichi_gdrive_kot_folder_id';

// Ensure the dedicated 'kot' folder exists in Google Drive
export async function getOrCreateKotFolder(token: string): Promise<{ id: string; webViewLink: string }> {
  // Check cached folder ID first
  const cachedId = localStorage.getItem(KOT_FOLDER_ID_KEY);
  if (cachedId) {
    try {
      const verifyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${cachedId}?fields=id,name,webViewLink,trashed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (verifyRes.ok) {
        const data = await verifyRes.json();
        if (!data.trashed && data.name?.toLowerCase() === KOT_FOLDER_NAME.toLowerCase()) {
          return { id: data.id, webViewLink: data.webViewLink || '' };
        }
      }
    } catch {
      // Re-query below
    }
  }

  // Ensure main database folder exists so 'kot' can reside inside it or at top level
  let parentFolderId: string | null = null;
  try {
    const parentFolder = await getOrCreateDatabaseFolder(token);
    parentFolderId = parentFolder.id;
  } catch (err) {
    console.warn("Could not determine parent database folder, creating kot folder in root:", err);
  }

  // Search for an existing folder named 'kot'
  const parentFilter = parentFolderId ? `and '${parentFolderId}' in parents` : '';
  const searchQ = encodeURIComponent(`name = '${KOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false ${parentFilter}`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQ}&fields=files(id,name,webViewLink)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const folder = searchData.files[0];
      localStorage.setItem(KOT_FOLDER_ID_KEY, folder.id);
      return { id: folder.id, webViewLink: folder.webViewLink || '' };
    }
  }

  // Search globally for folder named 'kot'
  const globalQ = encodeURIComponent(`name = '${KOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const globalSearchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${globalQ}&fields=files(id,name,webViewLink)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (globalSearchRes.ok) {
    const globalData = await globalSearchRes.json();
    if (globalData.files && globalData.files.length > 0) {
      const folder = globalData.files[0];
      localStorage.setItem(KOT_FOLDER_ID_KEY, folder.id);
      return { id: folder.id, webViewLink: folder.webViewLink || '' };
    }
  }

  // Folder doesn't exist yet: Create folder named 'kot'
  const createPayload: any = {
    name: KOT_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
    description: 'Kitchen Order Ticket (KOT) PDF storage folder for The Bagichi'
  };
  if (parentFolderId) {
    createPayload.parents = [parentFolderId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createPayload)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Drive 'kot' folder: ${errText}`);
  }

  const newKotFolder = await createRes.json();
  localStorage.setItem(KOT_FOLDER_ID_KEY, newKotFolder.id);

  // Set permissions: allow anyone with the link to view
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${newKotFolder.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn("Could not set permission on kot folder:", permErr);
  }

  return { id: newKotFolder.id, webViewLink: newKotFolder.webViewLink || '' };
}

// Upload binary file (e.g. PDF Blob) to Google Drive
export async function uploadOrUpdateBinaryFile(
  token: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  blob: Blob
): Promise<DriveFileInfo> {
  // Check if file already exists in folder
  const q = encodeURIComponent(`'${folderId}' in parents and name = '${fileName}' and trashed = false`);
  const findRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  let existingFileId: string | null = null;
  if (findRes.ok) {
    const data = await findRes.json();
    if (data.files && data.files.length > 0) {
      existingFileId = data.files[0].id;
    }
  }

  if (existingFileId) {
    const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType
      },
      body: blob
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      throw new Error(`Failed to update Drive binary file ${fileName}: ${errText}`);
    }

    const updated = await patchRes.json();
    return enrichFileInfo(updated);
  } else {
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: mimeType
    };

    const boundary = '-------bagichi_drive_bin_boundary_' + Date.now();
    const metadataHeader = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const footer = `\r\n--${boundary}--`;

    const multipartBody = new Blob([
      metadataHeader,
      blob,
      footer
    ], { type: `multipart/related; boundary=${boundary}` });

    const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: multipartBody
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to upload Drive binary file ${fileName}: ${errText}`);
    }

    const created = await createRes.json();

    // Set permission to anyone with link reader
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${created.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });
    } catch {
      // Ignored
    }

    return enrichFileInfo(created);
  }
}

// Upload or update a file in Google Drive
export async function uploadOrUpdateFile(
  token: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  content: string
): Promise<DriveFileInfo> {
  // Check if file already exists in folder
  const q = encodeURIComponent(`'${folderId}' in parents and name = '${fileName}' and trashed = false`);
  const findRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  let existingFileId: string | null = null;
  if (findRes.ok) {
    const data = await findRes.json();
    if (data.files && data.files.length > 0) {
      existingFileId = data.files[0].id;
    }
  }

  if (existingFileId) {
    // Update existing file content
    const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType
      },
      body: content
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      throw new Error(`Failed to update Drive file ${fileName}: ${errText}`);
    }

    const updated = await patchRes.json();
    return enrichFileInfo(updated);
  } else {
    // Create new file via multipart upload
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: mimeType
    };

    const boundary = '-------bagichi_drive_upload_boundary';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
      content +
      closeDelim;

    const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to upload Drive file ${fileName}: ${errText}`);
    }

    const created = await createRes.json();

    // Set permission to anyone with link reader
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${created.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });
    } catch {
      // Ignored
    }

    return enrichFileInfo(created);
  }
}

// List all database files stored in Google Drive folder
export async function listDriveDatabaseFiles(token?: string): Promise<DriveFileInfo[]> {
  const activeToken = token || getStoredDriveToken();
  const folderInfo = getStoredFolderInfo();

  if (!activeToken || !folderInfo.id) {
    // Fall back to cached files
    return getCachedDriveFiles();
  }

  try {
    const q = encodeURIComponent(`'${folderInfo.id}' in parents and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)&orderBy=modifiedTime desc&pageSize=100`, {
      headers: { Authorization: `Bearer ${activeToken}` }
    });

    if (!res.ok) {
      return getCachedDriveFiles();
    }

    const data = await res.json();
    const files = (data.files || []).map(enrichFileInfo);
    setCachedDriveFiles(files);
    return files;
  } catch (err) {
    console.warn("Could not list drive files from API, using cache:", err);
    return getCachedDriveFiles();
  }
}

// Read raw file content from Google Drive
export async function fetchDriveFileContent(fileId: string, token?: string): Promise<string> {
  const activeToken = token || getStoredDriveToken();
  
  const headers: Record<string, string> = {};
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers
  });

  if (!res.ok) {
    throw new Error(`Could not read Google Drive file content (HTTP ${res.status}). The file may require authorization.`);
  }

  return await res.text();
}

// Helper: Enrich file info with format and category tags
function enrichFileInfo(file: any): DriveFileInfo {
  const name = file.name || '';
  let format: 'text' | 'json' | 'csv' | 'other' = 'other';
  if (name.endsWith('.txt')) format = 'text';
  else if (name.endsWith('.json')) format = 'json';
  else if (name.endsWith('.csv')) format = 'csv';

  let category: 'bookings' | 'menu' | 'reviews' | 'reels' | 'system' = 'system';
  const lower = name.toLowerCase();
  if (lower.includes('booking')) category = 'bookings';
  else if (lower.includes('menu')) category = 'menu';
  else if (lower.includes('review')) category = 'reviews';
  else if (lower.includes('reel') || lower.includes('comment')) category = 'reels';

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size ? `${(Number(file.size) / 1024).toFixed(1)} KB` : undefined,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
    webContentLink: file.webContentLink,
    format,
    category
  };
}

// ==========================================
// FORMATTERS: TEXT, JSON, CSV FOR DATABASE RECORDS
// ==========================================

export function formatBookingReceiptText(booking: any): string {
  const dateStr = booking.date || new Date().toISOString().split('T')[0];
  const timeStr = booking.time || '19:30';
  const guestsCount = booking.guests || 2;
  const reservationId = booking.reservationNumber || `BGC-${Math.floor(1000 + Math.random() * 9000)}`;
  const otp = booking.otp || '123456';
  const createdAt = booking.createdAt 
    ? (booking.createdAt.toDate ? booking.createdAt.toDate().toISOString() : new Date(booking.createdAt).toISOString()) 
    : new Date().toISOString();

  return `======================================================================
         THE BAGICHI — OUTDOOR GARDEN DINING & CAFE
         OFFICIAL TABLE RESERVATION & DATABASE RECORD
======================================================================

RESERVATION IDENTIFIER:  ${reservationId}
SECURITY VERIFICATION OTP: ${otp}
RESERVATION STATUS:       ${(booking.status || 'CONFIRMED').toUpperCase()}
RECORD CREATION DATE:     ${createdAt}

----------------------------------------------------------------------
GUEST & CONTACT DETAILS
----------------------------------------------------------------------
Guest Full Name:          ${booking.name || 'Valued Guest'}
Contact Phone:            ${booking.phone || 'Not Provided'}
Email Address:            ${booking.email || 'Not Provided'}
Number of Guests:         ${guestsCount} Person(s)
Allocated Seating Area:   Royal Garden Gazebo & Lawn Seating

----------------------------------------------------------------------
TIMING & SCHEDULE
----------------------------------------------------------------------
Date of Reservation:      ${dateStr}
Scheduled Dining Time:    ${timeStr}
Operating Hours:          11:00 AM – 11:30 PM (Daily)

----------------------------------------------------------------------
RESTAURANT LOCATION & CONTACT
----------------------------------------------------------------------
Address:                  The Bagichi, Delhi-Jaipur Expressway,
                          Near Sirsi Road Crossing, Jaipur, Rajasthan
Helpline & Assistance:    +91 98765 43210 / manager@thebagichi.com
Website Access:           https://thebagichi.restaurant

----------------------------------------------------------------------
SPECIAL NOTES & VERIFICATION INSTRUCTIONS
----------------------------------------------------------------------
1. Please present this official reservation text receipt or quote 
   your Security OTP (${otp}) upon arrival at the Bagichi welcome desk.
2. Reserved tables are held with priority for up to 20 minutes past 
   the reserved slot.
3. This record is synchronized with The Bagichi Google Drive Database.

======================================================================
END OF DATABASE TEXT RECORD [HASH: ${reservationId}-${otp}]
======================================================================`;
}

export function formatBookingsLedgerText(bookings: any[]): string {
  const header = `===========================================================================================================
                               THE BAGICHI GARDEN RESTAURANT — MASTER BOOKINGS LEDGER
                                  Synchronized Directly to Google Drive Database
===========================================================================================================
Generated: ${new Date().toISOString()} | Total Reservations: ${bookings.length}
-----------------------------------------------------------------------------------------------------------
ID         | DATE       | TIME     | GUESTS | STATUS    | OTP    | GUEST NAME           | PHONE
-----------------------------------------------------------------------------------------------------------`;

  const rows = bookings.map(b => {
    const id = (b.reservationNumber || '').padEnd(10).slice(0, 10);
    const date = (b.date || '').padEnd(10).slice(0, 10);
    const time = (b.time || '').padEnd(8).slice(0, 8);
    const guests = String(b.guests || 2).padEnd(6).slice(0, 6);
    const status = (b.status || 'confirmed').toUpperCase().padEnd(9).slice(0, 9);
    const otp = (b.otp || '').padEnd(6).slice(0, 6);
    const name = (b.name || '').padEnd(20).slice(0, 20);
    const phone = (b.phone || '').padEnd(14).slice(0, 14);
    return `${id} | ${date} | ${time} | ${guests} | ${status} | ${otp} | ${name} | ${phone}`;
  }).join('\n');

  const footer = `\n-----------------------------------------------------------------------------------------------------------
TOTAL ACTIVE BOOKINGS: ${bookings.length}
===========================================================================================================`;

  return `${header}\n${rows}${footer}`;
}

export function formatBookingsCsv(bookings: any[]): string {
  const headers = ["ReservationNumber", "OTP", "GuestName", "Email", "Phone", "Guests", "Date", "Time", "Status", "CreatedAt"];
  const rows = bookings.map(b => [
    b.reservationNumber || '',
    b.otp || '',
    `"${(b.name || '').replace(/"/g, '""')}"`,
    `"${(b.email || '').replace(/"/g, '""')}"`,
    `"${(b.phone || '').replace(/"/g, '""')}"`,
    b.guests || 2,
    b.date || '',
    b.time || '',
    b.status || 'confirmed',
    b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().toISOString() : new Date(b.createdAt).toISOString()) : ''
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function formatMenuCardText(menuItems: any[]): string {
  const categories = Array.from(new Set(menuItems.map(i => i.category || 'Specialties')));
  let content = `======================================================================
               THE BAGICHI — A LA CARTE RESTAURANT MENU
            Official Menu Record Stored in Google Drive
======================================================================
Location: Delhi-Jaipur Expressway, Jaipur, Rajasthan
Operating Timings: 11:00 AM - 11:30 PM Everyday
======================================================================\n\n`;

  categories.forEach(cat => {
    content += `----------------------------------------------------------------------\n`;
    content += `▶  SECTION: ${cat.toUpperCase()}\n`;
    content += `----------------------------------------------------------------------\n`;
    const itemsInCat = menuItems.filter(i => (i.category || 'Specialties') === cat);
    itemsInCat.forEach(item => {
      const priceStr = `₹${item.price || 0}`.padStart(8);
      const nameStr = (item.name || 'Delicious Dish').padEnd(45);
      content += `${nameStr} ${priceStr}\n`;
      if (item.description) {
        content += `   ↳ ${item.description}\n`;
      }
      if (item.dietary) {
        content += `   [${item.dietary}]\n`;
      }
      content += `\n`;
    });
  });

  content += `======================================================================\n`;
  content += `End of Menu Database Document | Total Dishes Listed: ${menuItems.length}\n`;
  content += `======================================================================\n`;
  return content;
}

export function formatReviewsText(reviews: any[]): string {
  let content = `======================================================================
               THE BAGICHI — GUEST REVIEWS & FEEDBACK BOOK
            Official Customer Sentiments in Google Drive
======================================================================
Total Reviews Registered: ${reviews.length}
======================================================================\n\n`;

  reviews.forEach((r, idx) => {
    const stars = '★'.repeat(r.rating || 5) + '☆'.repeat(Math.max(0, 5 - (r.rating || 5)));
    content += `ENTRY #${idx + 1} | RATING: ${stars} (${r.rating || 5}/5 Stars)\n`;
    content += `Guest:       ${r.authorName || r.name || 'Anonymous Visitor'}\n`;
    if (r.role) content += `Tag:         ${r.role}\n`;
    content += `Review Note: "${r.comment || ''}"\n`;
    content += `----------------------------------------------------------------------\n\n`;
  });

  return content;
}

export function formatReelsText(reels: any[], comments: any[]): string {
  let content = `======================================================================
          THE BAGICHI — SOCIAL REELS & COMMUNITY FEEDBACK
            Official Media Archive in Google Drive
======================================================================
Total Video Reels: ${reels.length} | Total Comments: ${comments.length}
======================================================================\n\n`;

  reels.forEach((reel, idx) => {
    content += `REEL #${idx + 1}: ${reel.title || 'Spotlight Video'}\n`;
    content += `Platform URL: ${reel.videoUrl || reel.url || 'Direct Video'}\n`;
    content += `Author:       ${reel.authorHandle || '@thebagichi'}\n`;
    content += `Caption:      ${reel.caption || ''}\n`;
    content += `Engagement:   ${reel.likes || 0} Likes | ${reel.shares || 0} Shares\n`;

    const reelComments = comments.filter(c => c.reelId === reel.id);
    if (reelComments.length > 0) {
      content += `Customer Comments (${reelComments.length}):\n`;
      reelComments.forEach(c => {
        content += `   • ${c.authorName || 'Guest'}: "${c.text}" ${c.isPinned ? '[PINNED]' : ''}\n`;
      });
    }
    content += `----------------------------------------------------------------------\n\n`;
  });

  return content;
}

// Master Sync Function: Backs up all restaurant database entities to Google Drive
export async function syncAllDatabaseToDrive(
  token: string,
  data: {
    bookings: any[];
    menuItems: any[];
    reviews: any[];
    reels: any[];
    comments?: any[];
  }
): Promise<DriveSyncResult> {
  // 1. Get or create root folder
  const { id: folderId, webViewLink: folderLink } = await getOrCreateDatabaseFolder(token);

  const syncedFiles: DriveFileInfo[] = [];

  // 2. Sync Master Bookings Ledger (.txt)
  const bookingsLedgerText = formatBookingsLedgerText(data.bookings);
  const ledgerFile = await uploadOrUpdateFile(
    token,
    folderId,
    'Bookings_Ledger.txt',
    'text/plain',
    bookingsLedgerText
  );
  syncedFiles.push(ledgerFile);

  // 3. Sync All Bookings (.json)
  const bookingsJson = JSON.stringify(data.bookings, null, 2);
  const jsonBookingsFile = await uploadOrUpdateFile(
    token,
    folderId,
    'All_Bookings.json',
    'application/json',
    bookingsJson
  );
  syncedFiles.push(jsonBookingsFile);

  // 4. Sync Bookings (.csv)
  const bookingsCsv = formatBookingsCsv(data.bookings);
  const csvBookingsFile = await uploadOrUpdateFile(
    token,
    folderId,
    'Bookings_Summary.csv',
    'text/csv',
    bookingsCsv
  );
  syncedFiles.push(csvBookingsFile);

  // 5. Sync Individual Booking Receipts (.txt) for top 10 recent bookings
  const recentBookings = data.bookings.slice(0, 10);
  for (const b of recentBookings) {
    const singleReceipt = formatBookingReceiptText(b);
    const receiptName = `Booking_${b.reservationNumber || 'Receipt'}_${(b.name || 'Guest').replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    try {
      const receiptFile = await uploadOrUpdateFile(
        token,
        folderId,
        receiptName,
        'text/plain',
        singleReceipt
      );
      syncedFiles.push(receiptFile);
    } catch (e) {
      console.warn(`Failed to upload single booking ${receiptName} to drive:`, e);
    }
  }

  // 6. Sync Restaurant Menu Card (.txt)
  const menuCardText = formatMenuCardText(data.menuItems);
  const menuCardFile = await uploadOrUpdateFile(
    token,
    folderId,
    'Menu_Card.txt',
    'text/plain',
    menuCardText
  );
  syncedFiles.push(menuCardFile);

  // 7. Sync Restaurant Menu (.json)
  const menuJson = JSON.stringify(data.menuItems, null, 2);
  const menuJsonFile = await uploadOrUpdateFile(
    token,
    folderId,
    'Restaurant_Menu.json',
    'application/json',
    menuJson
  );
  syncedFiles.push(menuJsonFile);

  // 8. Sync Guest Reviews (.txt)
  const reviewsText = formatReviewsText(data.reviews);
  const reviewsTextFile = await uploadOrUpdateFile(
    token,
    folderId,
    'Guest_Reviews_Guestbook.txt',
    'text/plain',
    reviewsText
  );
  syncedFiles.push(reviewsTextFile);

  // 9. Sync Guest Reviews (.json)
  const reviewsJson = JSON.stringify(data.reviews, null, 2);
  const reviewsJsonFile = await uploadOrUpdateFile(
    token,
    folderId,
    'Guest_Reviews.json',
    'application/json',
    reviewsJson
  );
  syncedFiles.push(reviewsJsonFile);

  // 10. Sync Social Reels & Feedback (.txt and .json)
  const reelsText = formatReelsText(data.reels, data.comments || []);
  const reelsTextFile = await uploadOrUpdateFile(
    token,
    folderId,
    'Reels_and_Feedback.txt',
    'text/plain',
    reelsText
  );
  syncedFiles.push(reelsTextFile);

  const reelsJson = JSON.stringify({ reels: data.reels, comments: data.comments || [] }, null, 2);
  const reelsJsonFile = await uploadOrUpdateFile(
    token,
    folderId,
    'Social_Reels_Feed.json',
    'application/json',
    reelsJson
  );
  syncedFiles.push(reelsJsonFile);

  // 11. Manifest / Status log (.txt)
  const manifest = `======================================================================
THE BAGICHI RESTAURANT — GOOGLE DRIVE DATABASE BACKUP MANIFEST
======================================================================
Last Full Database Sync: ${new Date().toISOString()}
Google Drive Folder:     ${DRIVE_FOLDER_NAME}
Folder Direct Link:      ${folderLink}

RECORDS BACKED UP IN THIS BATCH:
- Table Reservations:   ${data.bookings.length} Records
- Restaurant Menu Items: ${data.menuItems.length} Dishes
- Guest Reviews:         ${data.reviews.length} Reviews
- Featured Social Reels: ${data.reels.length} Reels
- Reel Comments:         ${(data.comments || []).length} Comments

Total Synchronized Files in Drive: ${syncedFiles.length}
======================================================================`;

  const manifestFile = await uploadOrUpdateFile(
    token,
    folderId,
    'Database_Sync_Manifest.txt',
    'text/plain',
    manifest
  );
  syncedFiles.unshift(manifestFile);

  // Cache synced files
  setCachedDriveFiles(syncedFiles);

  return {
    folderId,
    folderLink,
    syncedFiles,
    syncedAt: new Date().toISOString()
  };
}

// Single Booking Sync Helper (used when customer reserves a table)
export async function syncSingleBookingToDrive(
  token: string,
  booking: any
): Promise<{ fileId: string; fileName: string; webViewLink: string; receiptText: string }> {
  const { id: folderId } = await getOrCreateDatabaseFolder(token);
  const receiptText = formatBookingReceiptText(booking);
  const fileName = `Booking_${booking.reservationNumber || 'Receipt'}_${(booking.name || 'Guest').replace(/[^a-zA-Z0-9]/g, '_')}.txt`;

  const file = await uploadOrUpdateFile(
    token,
    folderId,
    fileName,
    'text/plain',
    receiptText
  );

  return {
    fileId: file.id,
    fileName: file.name,
    webViewLink: file.webViewLink || '',
    receiptText
  };
}
