import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { DateTimePicker } from "./ui/datetimepicker";

const eventSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters"),
  targetDate: z.string().refine((date) => new Date(date) > new Date(), {
    message: "Target date must be in the future",
  }),
  media: z
    .any()
    .refine(
      (files) => files?.length === 1,
      "Background Image or Video is required"
    )
    .refine((files) => {
      const file = files?.[0];
      if (!file) return false;
      if (file.type.startsWith("image/")) return file.size <= 5 * 1024 * 1024; // 5MB
      if (file.type.startsWith("video/")) return file.size <= 10 * 1024 * 1024; // 10MB
      return false;
    }, `Background: Images max 5MB, Videos max 10MB.`),
  finishMedia: z
    .any()
    .refine((files) => files?.length === 1, "Finish Image or Video is required")
    .refine((files) => {
      const file = files?.[0];
      if (!file) return false;
      if (file.type.startsWith("image/")) return file.size <= 5 * 1024 * 1024; // 5MB
      if (file.type.startsWith("video/")) return file.size <= 10 * 1024 * 1024; // 10MB
      return false;
    }, `Finish: Images max 5MB, Videos max 10MB.`),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormProps {
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export const EventForm = ({ onSubmit, isLoading }: EventFormProps) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [finishPreview, setFinishPreview] = useState<string | null>(null);

  const handleFormSubmit = (data: EventFormData) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("targetDate", data.targetDate);
    formData.append("media", data.media[0]);
    formData.append("finishMedia", data.finishMedia[0]);
    onSubmit(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleFinishFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFinishPreview(URL.createObjectURL(file));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-white dark:bg-[#2C2C2C] p-8 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/5"
    >
      <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-6 text-center">
        Create Event
      </h2>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Event Name
          </label>
          <input
            {...register("name")}
            className={cn(
              "w-full px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all",
              errors.name && "border-red-500 focus:ring-red-500"
            )}
            placeholder="e.g. New Year 2026"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">
              {errors.name.message as string}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Date & Time
          </label>
          <div className="relative">
            <Controller
              control={control}
              name="targetDate"
              render={({ field }) => (
                <DateTimePicker
                  date={field.value ? new Date(field.value) : undefined}
                  setDate={(date) => field.onChange(date?.toISOString() || "")}
                  className="w-full"
                />
              )}
            />
          </div>

          {errors.targetDate && (
            <p className="mt-1 text-sm text-red-500">
              {errors.targetDate.message as string}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Background Media
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-white/10 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#252525] transition-colors overflow-hidden relative group">
              {preview ? (
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    className="w-8 h-8 mb-4 text-gray-400"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-gray-400 px-4 text-center">
                    <span className="font-semibold">Click to upload</span> image
                    or video
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                {...register("media", { onChange: handleFileChange })}
              />
            </label>
          </div>
          {errors.media && (
            <p className="mt-1 text-sm text-red-500">
              {errors.media.message as string}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Finish Media (After Countdown)
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-white/10 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#252525] transition-colors overflow-hidden relative group">
              {finishPreview ? (
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={finishPreview}
                    alt="Finish Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    className="w-8 h-8 mb-4 text-gray-400"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-gray-400 px-4 text-center">
                    <span className="font-semibold">Click to upload</span> image
                    or video
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                {...register("finishMedia", {
                  onChange: handleFinishFileChange,
                })}
              />
            </label>
          </div>
          {errors.finishMedia && (
            <p className="mt-1 text-sm text-red-500">
              {errors.finishMedia.message as string}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-500/50 font-medium rounded-lg text-sm px-5 py-3 text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating...
            </span>
          ) : (
            "Start Countdown"
          )}
        </button>
      </form>
    </motion.div>
  );
};
