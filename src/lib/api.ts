// IndexedDB implementation with Blob storage

interface StoredEvent {
  id: string;
  name: string;
  targetDate: string;
  mediaBlob?: Blob;
  mediaType: "image" | "video";
  finishMediaBlob?: Blob;
  finishMediaType: "image" | "video";
  createdAt: string;
  // Legacy fields for migration
  mediaUrl?: string;
  finishMediaUrl?: string;
}

interface EventWithURLs extends Omit<StoredEvent, "mediaBlob" | "finishMediaBlob"> {
  mediaUrl: string;
  finishMediaUrl: string;
}

const DB_NAME = "EventCountdownDB";
const DB_VERSION = 2; // Increment version to trigger migration
const STORE_NAME = "events";

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open database"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Delete old store if it exists (for migration)
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const objectStore = db.createObjectStore(STORE_NAME, {
        keyPath: "id",
      });
      objectStore.createIndex("createdAt", "createdAt", { unique: false });
    };
  });
};

// Compress image and return as Blob
const compressImageToBlob = (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      // For non-images (videos), return the file as-is
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          file.type,
          quality
        );
      };
      img.onerror = (error) => reject(error);
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
  });
};

// Convert base64 data URL to Blob (for migration)
const dataURLToBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Migrate data from localStorage to IndexedDB (convert base64 to Blobs)
const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    const stored = localStorage.getItem("events");
    if (!stored) return;

    const events = JSON.parse(stored);
    if (!Array.isArray(events) || events.length === 0) return;

    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Check if IndexedDB already has data
    const countRequest = store.count();
    const count = await new Promise<number>((resolve) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => resolve(0);
    });

    // Only migrate if IndexedDB is empty
    if (count === 0) {
      for (const event of events) {
        // Convert base64 strings to Blobs
        const migratedEvent = {
          ...event,
          mediaBlob: event.mediaUrl ? dataURLToBlob(event.mediaUrl) : null,
          finishMediaBlob: event.finishMediaUrl
            ? dataURLToBlob(event.finishMediaUrl)
            : null,
          // Remove old base64 URLs
          mediaUrl: undefined,
          finishMediaUrl: undefined,
        };
        store.add(migratedEvent);
      }
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      console.log(
        `Migrated ${events.length} events from localStorage to IndexedDB (converted to Blobs)`
      );
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
        reject(
          new Error(
            "Storage is full. Please clear old events or use smaller image files."
          )
        );
      } else {
        reject(request.error);
      }
    };
  });
};

// Get all events from IndexedDB, sorted by createdAt (newest first)
// Creates blob URLs from stored Blobs
export const getEvents = async (): Promise<EventWithURLs[]> => {
  const db = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const request = index.openCursor(null, "prev"); // prev = descending order

    const events: EventWithURLs[] = [];
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const eventData = cursor.value as StoredEvent;
        // Create blob URLs from stored Blobs
        const processedEvent: EventWithURLs = {
          id: eventData.id,
          name: eventData.name,
          targetDate: eventData.targetDate,
          mediaType: eventData.mediaType,
          finishMediaType: eventData.finishMediaType,
          createdAt: eventData.createdAt,
          mediaUrl: eventData.mediaBlob
            ? URL.createObjectURL(eventData.mediaBlob)
            : eventData.mediaUrl || "", // Fallback for old base64 data
          finishMediaUrl: eventData.finishMediaBlob
            ? URL.createObjectURL(eventData.finishMediaBlob)
            : eventData.finishMediaUrl || "", // Fallback for old base64 data
        };
        events.push(processedEvent);
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

// Delete a specific event by ID
export const deleteEvent = async (id: string): Promise<void> => {
  const db = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Revoke blob URLs (call this when cleaning up)
export const revokeBlobURLs = (events: EventWithURLs[]): void => {
  events.forEach((event) => {
    if (event.mediaUrl && event.mediaUrl.startsWith("blob:")) {
      URL.revokeObjectURL(event.mediaUrl);
    }
    if (event.finishMediaUrl && event.finishMediaUrl.startsWith("blob:")) {
      URL.revokeObjectURL(event.finishMediaUrl);
    }
  });
};

export const createEvent = async (
  formData: FormData
): Promise<EventWithURLs> => {
  const name = formData.get("name") as string;
  const targetDate = formData.get("targetDate") as string;
  const mediaFile = formData.get("media") as File;
  const finishMediaFile = formData.get("finishMedia") as File;

  if (!mediaFile || !finishMediaFile) {
    throw new Error("Missing files");
  }

  try {
    // Compress images and convert to Blobs (videos stored as-is)
    const mediaBlob = await compressImageToBlob(mediaFile);
    const mediaType: "image" | "video" = mediaFile.type.startsWith("video")
      ? "video"
      : "image";
    const finishMediaBlob = await compressImageToBlob(finishMediaFile);
    const finishMediaType: "image" | "video" = finishMediaFile.type.startsWith(
      "video"
    )
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

    // Create blob URLs for immediate use
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
