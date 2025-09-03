/**
 * Google Drive API Client
 *
 * This module encapsulates all interactions with the Google Drive API.
 */

const API_BASE_URL = 'https://www.googleapis.com/drive/v3'
const API_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
const APP_FOLDER_NAME = 'SynapseApp'
const BACKUP_FILE_PREFIX = 'synapse-backup-'

interface FileMetadata {
  id: string
  name: string
  modifiedTime: string
  [key: string]: any
}

/**
 * Lists all backup files in the app folder, sorted by creation date.
 * @returns {Promise<FileMetadata[]>} A list of backup files.
 */
export async function listBackupFiles(): Promise<FileMetadata[]> {
  const token = await getAuthToken();
  const appFolderId = await findOrCreateAppFolder();
  const query = `'${appFolderId}' in parents and name contains '${BACKUP_FILE_PREFIX}' and trashed=false`;
  const response = await fetch(`${API_BASE_URL}/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&fields=files(id,name,modifiedTime,createdTime,size)`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Failed to list backup files.');
  }
  const data = await response.json();
  return data.files || [];
}

/**
 * Deletes a file by its ID.
 * @param {string} fileId The ID of the file to delete.
 */
export async function deleteFile(fileId: string): Promise<void> {
  const token = await getAuthToken();
  await fetch(`${API_BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

/**
 * Gets the access token from chrome.identity.
 * @returns {Promise<string>} The access token.
 */
async function getAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || 'Failed to get auth token.'))
      } else {
        resolve(token)
      }
    })
  })
}

/**
 * Fetches user profile information.
 * @returns User's profile info.
 */
export async function getUserProfile() {
  const token = await getAuthToken()
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error('Failed to fetch user profile.')
  }
  return response.json()
}

/**
 * Finds or creates the application's folder in Google Drive.
 * @returns {Promise<string>} The ID of the application folder.
 */
export async function findOrCreateAppFolder(): Promise<string> {
  const token = await getAuthToken()
  const query = `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`
  const response = await fetch(`${API_BASE_URL}/files?q=${encodeURIComponent(query)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  const data = await response.json()
  if (data.files && data.files.length > 0) {
    return data.files[0].id
  }

  // If not found, create it
  const folderMetadata = {
    name: APP_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
  }
  const createResponse = await fetch(API_BASE_URL + '/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(folderMetadata),
  })
  const createData = await createResponse.json()
  return createData.id
}

/**
 * Gets the metadata for the backup file.
 * @param {string} appFolderId The ID of the application folder.
 * @param {string} fileName The name of the backup file.
 * @returns {Promise<FileMetadata | null>} The file metadata or null if not found.
 */
export async function getBackupFileMetadata(appFolderId: string, fileName: string): Promise<FileMetadata | null> {
  const token = await getAuthToken()
  const query = `'${appFolderId}' in parents and name='${fileName}' and trashed=false`
  const response = await fetch(`${API_BASE_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  const data = await response.json()
  return (data.files && data.files.length > 0) ? data.files[0] : null
}

/**
 * Downloads the backup file content.
 * @param {string} fileId The ID of the backup file.
 * @returns {Promise<any>} The JSON content of the backup file.
 */
export async function downloadBackupFile(fileId: string): Promise<any> {
  const token = await getAuthToken()
  const response = await fetch(`${API_BASE_URL}/files/${fileId}?alt=media`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error('Failed to download backup file.')
  }
  return response.json()
}

/**
 * Uploads a new backup file with a timestamped name.
 * @param {object} data The data to upload.
 */
export async function uploadNewBackup(data: object): Promise<void> {
  const token = await getAuthToken();
  const content = JSON.stringify(data);
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  const fileName = `${BACKUP_FILE_PREFIX}${timestamp}.json`;

  const appFolderId = await findOrCreateAppFolder();
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [appFolderId],
  };

  const createResponse = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createResponse.ok) {
    throw new Error('Failed to create remote file metadata.');
  }

  const newFile = await createResponse.json();

  const updateUrl = `${API_UPLOAD_URL}/${newFile.id}?uploadType=media`;
  const uploadResponse = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: content,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload content to new file.');
  }
}
''