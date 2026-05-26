const DB_NAME = 'ledgerstack-archive'
const DB_VERSION = 1
const STORE = 'folder_handles'
const HANDLE_KEY = 'default'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

export async function saveArchiveFolderHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put(handle, HANDLE_KEY)
  })
  db.close()
}

export async function getArchiveFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb()
  const handle = await new Promise<FileSystemDirectoryHandle | null>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      tx.onerror = () => reject(tx.error)
      const req = tx.objectStore(STORE).get(HANDLE_KEY)
      req.onsuccess = () =>
        resolve((req.result as FileSystemDirectoryHandle) || null)
      req.onerror = () => reject(req.error)
    }
  )
  db.close()
  return handle
}

export async function clearArchiveFolderHandle(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).delete(HANDLE_KEY)
  })
  db.close()
}

type PermHandle = FileSystemDirectoryHandle & {
  queryPermission?: (opts: { mode: 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (opts: { mode: 'readwrite' }) => Promise<PermissionState>
}

export async function ensureFolderPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  const h = handle as PermHandle
  if (!h.queryPermission || !h.requestPermission) return true
  const opts = { mode: 'readwrite' as const }
  const current = await h.queryPermission(opts)
  if (current === 'granted') return true
  const requested = await h.requestPermission(opts)
  return requested === 'granted'
}
