import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled,
}: DatePickerProps) {
  console.log("DatePicker rendered with:", {
    date,
    placeholder,
    disabled,
  });

  return (
    <div className="relative">
      {/* Native date input styled to match the app */}
      <input
        type="date"
        value={date ? date.toISOString().split('T')[0] : ''}
        onChange={(e) => {
          console.log("🎯 Native date input changed:", e.target.value);
          if (e.target.value) {
            const selectedDate = new Date(e.target.value);
            console.log("Selected date object:", selectedDate);
            onDateChange?.(selectedDate);
          } else {
            onDateChange?.(undefined);
          }
        }}
        min={new Date().toISOString().split('T')[0]} // Disable past dates
        disabled={disabled}
        className="w-full h-10 pl-10 pr-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          colorScheme: 'light', // Ensures consistent styling across browsers
        }}
      />
      
      {/* Calendar icon overlay */}
      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}