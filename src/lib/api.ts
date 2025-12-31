// IndexedDB implementation

const DB_NAME = "EventCountdownDB";
const DB_VERSION = 1;
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
        objectStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
};

// Compress image to reduce storage size
const compressImage = (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      // For non-images, just convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
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
        const compressedDataUrl = canvas.toDataURL(file.type, quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (error) => reject(error);
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
  });
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

    // Check if IndexedDB already has data
    const countRequest = store.count();
    const count = await new Promise<number>((resolve) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => resolve(0);
    });

    // Only migrate if IndexedDB is empty
    if (count === 0) {
      for (const event of events) {
        store.add(event);
      }
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      console.log(`Migrated ${events.length} events from localStorage to IndexedDB`);
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
const addEvent = async (event: any): Promise<void> => {
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
export const getEvents = async (): Promise<any[]> => {
  const db = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const request = index.openCursor(null, "prev"); // prev = descending order

    const events: any[] = [];
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        events.push(cursor.value);
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

export const createEvent = async (formData: FormData) => {
  const name = formData.get("name") as string;
  const targetDate = formData.get("targetDate") as string;
  const mediaFile = formData.get("media") as File;
  const finishMediaFile = formData.get("finishMedia") as File;

  if (!mediaFile || !finishMediaFile) {
    throw new Error("Missing files");
  }

  try {
    // Compress images before storing (videos are stored as-is)
    const mediaUrl = await compressImage(mediaFile);
    const mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
    const finishMediaUrl = await compressImage(finishMediaFile);
    const finishMediaType = finishMediaFile.type.startsWith("video")
      ? "video"
      : "image";

    const newEvent = {
      id: Date.now().toString(),
      name,
      targetDate,
      mediaUrl,
      mediaType,
      finishMediaUrl,
      finishMediaType,
      createdAt: new Date().toISOString(),
    };

    await addEvent(newEvent);
    return newEvent;
  } catch (error: any) {
    console.error("Save Error:", error);
    throw error;
  }
};
