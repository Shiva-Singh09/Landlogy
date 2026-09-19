import { Select } from "../../components/ui/Select";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import type { Client } from "../../types/client";
import type { PropertyFormErrors, PropertyFormValues } from "./formUtils";
import { SellerSelect } from "./SellerSelect";
import { LocationFields, PricingFields } from "./FormLocation";
import { BasicFields } from "./FormBasic";

export function FormSections({
  values,
  errors,
  disabled,
  typeOptions,
  categoryOptions,
  onChange,
  onSellerSelect,
}: {
  values: PropertyFormValues;
  errors: PropertyFormErrors;
  disabled?: boolean;
  typeOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
  onChange: (patch: Partial<PropertyFormValues>) => void;
  onSellerSelect: (client: Client | null) => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-land-ink">Basic information</h2>
          <p className="text-sm text-land-ink/55">Title, description, type and category.</p>
        </CardHeader>
        <CardContent>
          <BasicFields values={values} errors={errors} disabled={disabled} typeOptions={typeOptions} categoryOptions={categoryOptions} onChange={onChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-land-ink">Seller / Client</h2>
          <p className="text-sm text-land-ink/55">The person who owns this property and wants to sell it.</p>
        </CardHeader>
        <CardContent>
          <SellerSelect
            ownerId={values.owner_id}
            ownerName={values.owner_name}
            error={errors.owner_id}
            disabled={disabled}
            onSelect={onSellerSelect}
          />
          {errors.owner_id && !values.owner_id && (
            <p role="alert" className="mt-1.5 text-[13px] font-medium text-land-coral">{errors.owner_id}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-land-ink">Location</h2>
          <p className="text-sm text-land-ink/55">Address, city, pincode and map coordinates.</p>
        </CardHeader>
        <CardContent>
          <LocationFields values={values} errors={errors} disabled={disabled} onChange={onChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-land-ink">Pricing</h2>
          <p className="text-sm text-land-ink/55">Asking price in INR. Leave blank for “Price on request”.</p>
        </CardHeader>
        <CardContent>
          <PricingFields values={values} errors={errors} disabled={disabled} onChange={onChange} />
        </CardContent>
      </Card>
    </div>
  );
}

// Re-export Select for form pages that import it from here.
export { Select };
