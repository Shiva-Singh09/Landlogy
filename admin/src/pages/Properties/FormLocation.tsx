import { Input } from "../../components/ui/Input";
import type { PropertyFormErrors, PropertyFormValues } from "./formUtils";

type Props = {
  values: PropertyFormValues;
  errors: PropertyFormErrors;
  disabled?: boolean;
  onChange: (patch: Partial<PropertyFormValues>) => void;
};

export function LocationFields({ values, errors, disabled, onChange }: Props) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><Input label="Address" maxLength={300} value={values.address} error={errors.address} disabled={disabled} onChange={e => onChange({ address: e.target.value })} /></div>
    <Input label="City" maxLength={120} value={values.city} error={errors.city} disabled={disabled} onChange={e => onChange({ city: e.target.value })} />
    <Input label="State" maxLength={120} value={values.state} error={errors.state} disabled={disabled} onChange={e => onChange({ state: e.target.value })} />
    <Input label="Pincode" inputMode="numeric" maxLength={10} value={values.pincode} error={errors.pincode} disabled={disabled} onChange={e => onChange({ pincode: e.target.value })} />
    <Input label="Latitude" type="number" step="any" min={-90} max={90} value={values.latitude} error={errors.latitude} disabled={disabled} onChange={e => onChange({ latitude: e.target.value })} />
    <Input label="Longitude" type="number" step="any" min={-180} max={180} value={values.longitude} error={errors.longitude} disabled={disabled} onChange={e => onChange({ longitude: e.target.value })} />
  </div>;
}

export function PricingFields({ values, errors, disabled, onChange }: Props) {
  return <Input label="Asking price (INR)" type="number" min={0} step="0.01" value={values.asking_price} error={errors.asking_price} disabled={disabled} onChange={e => onChange({ asking_price: e.target.value })} />;
}
