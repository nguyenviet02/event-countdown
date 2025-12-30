// LocalStorage implementation
export const createEvent = async (formData: FormData) => {
  const name = formData.get("name") as string;
  const targetDate = formData.get("targetDate") as string;
  const mediaFile = formData.get("media") as File;
  const finishMediaFile = formData.get("finishMedia") as File;

  if (!mediaFile || !finishMediaFile) {
    throw new Error("Missing files");
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  try {
    const mediaUrl = await fileToBase64(mediaFile);
    const mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
    const finishMediaUrl = await fileToBase64(finishMediaFile);
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

    const existingEvents = JSON.parse(localStorage.getItem("events") || "[]");
    existingEvents.unshift(newEvent);
    localStorage.setItem("events", JSON.stringify(existingEvents));
    return newEvent;
  } catch (error: any) {
    console.error("Local Save Error:", error);
    if (error.name === "QuotaExceededError") {
      throw new Error("Storage full. Files are too large for browser storage.");
    }
    throw error;
  }
};

export const getEvents = async () => {
  return new Promise<any[]>((resolve) => {
    const events = JSON.parse(localStorage.getItem("events") || "[]");
    resolve(events);
  });
};
