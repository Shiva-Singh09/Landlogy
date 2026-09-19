import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import type { PropertyFormErrors, PropertyFormValues } from "./formUtils";

export function BasicFields({
  values,
  errors,
  disabled,
  typeOptions,
  categoryOptions,
  onChange,
}: {
  values: PropertyFormValues;
  errors: PropertyFormErrors;
  disabled?: boolean;
  typeOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
  onChange: (patch: Partial<PropertyFormValues>) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Property title"
        required
        placeholder="e.g. 3BHK Apartment in Gomti Nagar"
        value={values.title}
        disabled={disabled}
        error={errors.title}
        onChange={(event) => onChange({ title: event.target.value })}
      />
      <div>
        <label htmlFor="property-description" className="mb-1.5 block text-sm font-semibold text-land-ink">
          Description
        </label>
        <textarea
          id="property-description"
          rows={5}
          disabled={disabled}
          placeholder="Describe the property — size, facing, floor, amenities…"
          value={values.description}
          onChange={(event) => onChange({ description: event.target.value })}
          className="min-h-28 w-full rounded-xl border border-land-ink/10 bg-white/90 px-3 py-2.5 text-sm text-land-ink outline-none transition-colors placeholder:text-land-ink/35 focus:border-land-blue/45 focus:ring-2 focus:ring-land-blue/15 disabled:cursor-not-allowed disabled:bg-land-stone disabled:opacity-70"
        />
        {errors.description && (
          <p role="alert" className="mt-1.5 text-[13px] font-medium text-land-coral">{errors.description}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Property type"
          options={typeOptions}
          value={values.property_type_id}
          disabled={disabled}
          onChange={(event) => onChange({ property_type_id: event.target.value })}
          placeholder="Select type (optional)"
        />
        <Select
          label="Category"
          options={categoryOptions}
          value={values.property_category_id}
          disabled={disabled}
          onChange={(event) => onChange({ property_category_id: event.target.value })}
          placeholder="Select category (optional)"
        />
      </div>
    </div>
  );
}
