import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import type { DateRange } from "react-day-picker";

export interface FilterConfig {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "dateRange";
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface DataFilterProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onReset?: () => void;
}

export function DataFilter({
  filters,
  values,
  onChange,
  onReset,
}: DataFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = Object.values(values).filter(
    (v) => v !== undefined && v !== null && v !== "",
  ).length;

  const handleValueChange = (key: string, value: any) => {
    onChange({
      ...values,
      [key]: value,
    });
  };

  const handleReset = () => {
    const resetValues: Record<string, any> = {};
    filters.forEach((filter) => {
      resetValues[filter.key] = "";
    });
    onChange(resetValues);
    onReset?.();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          筛选
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">数据筛选</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                重置
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-1.5">
                <Label className="text-xs">{filter.label}</Label>
                {filter.type === "text" && (
                  <Input
                    placeholder={filter.placeholder || `输入${filter.label}`}
                    value={values[filter.key] || ""}
                    onChange={(e) =>
                      handleValueChange(filter.key, e.target.value)
                    }
                    className="h-8"
                  />
                )}
                {filter.type === "select" && filter.options && (
                  <Select
                    value={values[filter.key] || ""}
                    onValueChange={(value) =>
                      handleValueChange(filter.key, value)
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue
                        placeholder={filter.placeholder || "请选择"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {filter.type === "date" && (
                  <Input
                    type="date"
                    value={values[filter.key] || ""}
                    onChange={(e) =>
                      handleValueChange(filter.key, e.target.value)
                    }
                    className="h-8"
                  />
                )}
                {filter.type === "dateRange" && (
                  <DatePickerWithRange
                    date={values[filter.key]}
                    onSelect={(date) => handleValueChange(filter.key, date)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
