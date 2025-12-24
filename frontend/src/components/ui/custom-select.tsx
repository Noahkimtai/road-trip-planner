import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Select option...",
  disabled = false,
  className,
}: CustomSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // Find the selected option
  const selectedOption = options.find(option => option.value === value);
  
  // Filter options based on search query
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Group filtered options
  const groupedOptions: Record<string, SelectOption[]> = {};
  filteredOptions.forEach(option => {
    const group = option.group || "Other";
    if (!groupedOptions[group]) {
      groupedOptions[group] = [];
    }
    groupedOptions[group].push(option);
  });

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setOpen(false);
    setSearchQuery(""); // Reset search when selecting
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <div className="p-2">
          {/* Search input */}
          <input
            className="w-full p-2 mb-2 border rounded text-sm"
            placeholder="Search cars..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          
          {/* Options list */}
          <div className="max-h-[300px] overflow-y-auto">
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="p-2 text-center text-sm text-gray-500">
                No cars found
              </div>
            ) : (
              Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                <div key={groupName} className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {groupName}
                  </div>
                  {groupOptions.map((option) => (
                    <div
                      key={option.value}
                      className={cn(
                        "flex items-center px-2 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded",
                        value === option.value ? "bg-blue-50 text-blue-700" : ""
                      )}
                      onClick={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}