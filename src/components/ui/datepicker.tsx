"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";

import { Button } from "./button";
import { Calendar } from "./calendar";
// import { Label } from "./label"; // Removed as label is handled externally
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface DatePickerProps {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string; // Add className prop
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Select date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className // Apply className here
          )}
          style={{
            backgroundColor: "#1a1a1a",
            borderColor: "rgba(255,255,255,0.1)",
            color: "white",
          }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
