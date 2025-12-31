// IndexedDB implementation with Blob storage

interface StoredEvent {
  id: string;
  name: string;
  targetDate: string;
  mediaBlob: Blob;
  mediaType: "image" | "video";
  finishMediaBlob: Blob;
  finishMediaType: "image" | "video";
  createdAt: string;
}

interface EventWithURLs extends Omit<StoredEvent, "mediaBlob" | "finishMediaBlob"> {
  mediaUrl: string;
  finishMediaUrl: string;
}

const DB_NAME = "EventCountdownDB";
const DB_VERSION = 2;
const STORE_NAME = "events";

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error("Failed to open database"));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      objectStore.createIndex("createdAt", "createdAt", { unique: false });
    };
  });
};

// Convert File to Blob (no compression)
const fileToBlob = (file: File): Promise<Blob> => {
  return Promise.resolve(file);
};

// Convert base64 data URL to Blob (for migration)
const dataURLToBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
};

// Migrate data from localStorage to IndexedDB
const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    const stored = localStorage.getItem("events");
    if (!stored) return;

    const events = JSON.parse(stored);
    if (!Array.isArray(events) || events.length === 0) return;

    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const countRequest = store.count();
    const count = await new Promise<number>((resolve) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => resolve(0);
    });

    if (count === 0) {
      for (const event of events) {
        if (event.mediaUrl && event.finishMediaUrl) {
          store.add({
            id: event.id || Date.now().toString(),
            name: event.name,
            targetDate: event.targetDate,
            mediaBlob: dataURLToBlob(event.mediaUrl),
            mediaType: event.mediaType || "image",
            finishMediaBlob: dataURLToBlob(event.finishMediaUrl),
            finishMediaType: event.finishMediaType || "image",
            createdAt: event.createdAt || new Date().toISOString(),
          });
        }
      }
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
  } catch (error) {
    console.error("Migration error:", error);
  }
};

// Initialize and migrate on first load
let dbInitialized = false;
const ensureDB = async (): Promise<IDBDatabase> => {
  if (!dbInitialized) {
    dbInitialized = true;
    await migrateFromLocalStorage();
  }
  return initDB();
};

// Add event to IndexedDB
const addEvent = async (event: StoredEvent): Promise<void> => {
  const db = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(event);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      if (request.error?.name === "QuotaExceededError") {
        reject(new Error("Storage is full. Please clear old events or use smaller image files."));
      } else {
        reject(request.error);
      }
    };
  });
};

// Get all events from IndexedDB, sorted by createdAt (newest first)
export const getEvents = async (): Promise<EventWithURLs[]> => {
  const db = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const request = index.openCursor(null, "prev");

    const events: EventWithURLs[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const eventData = cursor.value as StoredEvent;
        events.push({
          id: eventData.id,
          name: eventData.name,
          targetDate: eventData.targetDate,
          mediaType: eventData.mediaType,
          finishMediaType: eventData.finishMediaType,
          createdAt: eventData.createdAt,
          mediaUrl: URL.createObjectURL(eventData.mediaBlob),
          finishMediaUrl: URL.createObjectURL(eventData.finishMediaBlob),
        });
        cursor.continue();
      } else {
        resolve(events);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// Delete all events from IndexedDB
export const deleteAllEvents = async (): Promise<void> => {
  const db = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const createEvent = async (formData: FormData): Promise<EventWithURLs> => {
  const name = formData.get("name") as string;
  const targetDate = formData.get("targetDate") as string;
  const mediaFile = formData.get("media") as File;
  const finishMediaFile = formData.get("finishMedia") as File;

  if (!mediaFile || !finishMediaFile) {
    throw new Error("Missing files");
  }

  try {
    const [mediaBlob, finishMediaBlob] = await Promise.all([
      fileToBlob(mediaFile),
      fileToBlob(finishMediaFile),
    ]);

    const mediaType: "image" | "video" = mediaFile.type.startsWith("video") ? "video" : "image";
    const finishMediaType: "image" | "video" = finishMediaFile.type.startsWith("video")
      ? "video"
      : "image";

    const newEvent: StoredEvent = {
      id: Date.now().toString(),
      name,
      targetDate,
      mediaBlob,
      mediaType,
      finishMediaBlob,
      finishMediaType,
      createdAt: new Date().toISOString(),
    };

    await addEvent(newEvent);

    return {
      ...newEvent,
      mediaUrl: URL.createObjectURL(mediaBlob),
      finishMediaUrl: URL.createObjectURL(finishMediaBlob),
    };
  } catch (error) {
    console.error("Save Error:", error);
    throw error;
  }
};
