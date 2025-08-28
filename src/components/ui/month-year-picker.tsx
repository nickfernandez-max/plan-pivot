import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MonthYearPickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  fromYear?: number;
  toYear?: number;
  placeholder?: string;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function MonthYearPicker({
  value,
  onChange,
  fromYear = 2020,
  toYear = 2030,
  placeholder = "Select month/year"
}: MonthYearPickerProps) {
  const [selectedMonth, setSelectedMonth] = React.useState<number | undefined>(
    value ? value.getMonth() : undefined
  );
  const [selectedYear, setSelectedYear] = React.useState<number | undefined>(
    value ? value.getFullYear() : undefined
  );

  const years = React.useMemo(() => {
    const yearsList = [];
    for (let year = fromYear; year <= toYear; year++) {
      yearsList.push(year);
    }
    return yearsList;
  }, [fromYear, toYear]);

  React.useEffect(() => {
    if (value) {
      setSelectedMonth(value.getMonth());
      setSelectedYear(value.getFullYear());
    }
  }, [value]);

  React.useEffect(() => {
    if (selectedMonth !== undefined && selectedYear !== undefined) {
      const newDate = new Date(selectedYear, selectedMonth, 1);
      onChange?.(newDate);
    } else if (selectedMonth === undefined || selectedYear === undefined) {
      onChange?.(undefined);
    }
  }, [selectedMonth, selectedYear, onChange]);

  return (
    <div className="flex gap-2">
      <Select
        value={selectedMonth !== undefined ? selectedMonth.toString() : ""}
        onValueChange={(value) => setSelectedMonth(value ? parseInt(value) : undefined)}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month, index) => (
            <SelectItem key={index} value={index.toString()}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedYear?.toString() || ""}
        onValueChange={(value) => setSelectedYear(value ? parseInt(value) : undefined)}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}