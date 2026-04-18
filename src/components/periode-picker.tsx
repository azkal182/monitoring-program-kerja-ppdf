import * as React from "react";
import { Controller, Control } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldLabel } from "./ui/field";

// Utility to generate periods like 2025-2026
function generatePeriods(startYear: number, endYear: number) {
  const periods: string[] = [];
  for (let y = startYear; y < endYear; y++) {
    periods.push(`${y}-${y + 1}`);
  }
  return periods;
}

type PeriodPickerProps = {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  label?: string;
  startYear?: number;
  endYear?: number;
  placeholder?: string;
  errorMessage?: string;
};

export function PeriodPicker({
  name,
  control,
  label = "Periode",
  startYear = 2025,
  endYear = new Date().getFullYear() + 1,
  placeholder = "Pilih periode",
  errorMessage,
}: PeriodPickerProps) {
  const periods = React.useMemo(
    () => generatePeriods(startYear, endYear),
    [startYear, endYear],
  );

  return (
    <div className="flex flex-col gap-2">
      {/* {label && <Label>{label}</Label>} */}

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Field className="gap-1">
            {label && <FieldLabel htmlFor="period">{label}</FieldLabel>}

            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period} value={period}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorMessage && <FieldError>{errorMessage}</FieldError>}
          </Field>
        )}
      />
    </div>
  );
}
