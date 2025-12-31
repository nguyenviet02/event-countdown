"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../../lib/utils";

export interface DateTimePickerProps {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  className?: string; // Add className prop for container styling if needed
}

export function DateTimePicker({
  date,
  setDate,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Handle Date Selection
  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setDate(undefined);
      setOpen(false);
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // If there was a previous date, preserve the time
    if (date) {
      newDate.setHours(date.getHours());
      newDate.setMinutes(date.getMinutes());
      newDate.setSeconds(date.getSeconds());
    } else {
      // Default to current time + 1 hour if no previous date, or minimum 1 hour from now
      const minTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      newDate.setHours(minTime.getHours());
      newDate.setMinutes(minTime.getMinutes());
      newDate.setSeconds(0);
    }

    // If the selected date is today, ensure the time is in the future
    const selectedDateOnly = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    if (selectedDateOnly.getTime() === today.getTime()) {
      if (newDate <= now) {
        // Set to 1 hour from now if the selected time is in the past
        const minTime = new Date(now.getTime() + 60 * 60 * 1000);
        newDate.setHours(minTime.getHours());
        newDate.setMinutes(minTime.getMinutes());
        newDate.setSeconds(0);
      }
    }

    setDate(newDate);
    setOpen(false);
  };

  // Handle Time Change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value;
    if (!timeStr) return; // invalid

    const [hours, minutes] = timeStr.split(":").map(Number);

    const newDate = date ? new Date(date) : new Date(); // default to today if no date yet
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0); // reset seconds

    // Only set the date if it's in the future
    const now = new Date();
    if (newDate > now) {
      setDate(newDate);
    }
  };

  // Format time for input value (HH:mm)
  const timeValue = date ? format(date, "HH:mm") : "";

  return (
    <div className={cn("flex gap-4 w-full", className)}>
      <div className="flex flex-col gap-3 flex-1">
        <Label className="px-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
          Date
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className={cn(
                "w-full h-fit min-h-10 justify-start text-left font-normal border-gray-200 dark:border-white/10",
                !date && "text-muted-foreground"
              )}
              style={{
                backgroundColor: "#1a1a1a",
                color: "white",
              }}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Select date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0 z-9999"
            align="start"
          >
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={handleDateSelect}
              fromYear={1900}
              toYear={2100}
              disabled={(dateToCheck) => {
                // Get today's date at midnight in local time
                const today = new Date();
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                
                // Get the date to check at midnight in local time
                const checkDate = new Date(dateToCheck);
                const checkDateStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
                
                // Disable only dates that are strictly before today
                return checkDateStart < todayStart;
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3 w-1/3 h-fit min-h-10">
        <Label
          htmlFor="time-picker"
          className="px-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold"
        >
          Time
        </Label>
        <Input
          type="time"
          id="time-picker"
          step="60" // minutes
          value={timeValue}
          onChange={handleTimeChange}
          className="bg-[#1a1a1a] border-gray-200 dark:border-white/10 text-white appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  );
}
