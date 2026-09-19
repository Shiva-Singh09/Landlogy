
export interface PropertyFormValues {
  title: string;
  description: string;
  property_type_id: string;
  property_category_id: string;
  owner_id: string;
  owner_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  asking_price: string;
}

export type PropertyFormErrors = Partial<Record<keyof PropertyFormValues, string>>;

export const EMPTY_VALUES: PropertyFormValues = {
  title: "",
  description: "",
  property_type_id: "",
  property_category_id: "",
  owner_id: "",
  owner_name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "",
  longitude: "",
  asking_price: "",
};

export function validatePropertyForm(values: PropertyFormValues): PropertyFormErrors {
  const errors: PropertyFormErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = "Property title is required.";
  else if (title.length < 3) errors.title = "Title must be at least 3 characters.";
  else if (title.length > 200) errors.title = "Title must be 200 characters or fewer.";
  if (values.description.trim().length > 5000) errors.description = "Description must be 5000 characters or fewer.";
  if (!values.owner_id) errors.owner_id = "Seller/Client is required.";
  if (values.address.trim().length > 300) errors.address = "Address must be 300 characters or fewer.";
  if (values.city.trim().length > 120) errors.city = "City must be 120 characters or fewer.";
  if (values.state.trim().length > 120) errors.state = "State must be 120 characters or fewer.";
  if (values.pincode.trim() && !/^[0-9]{4,10}$/.test(values.pincode.trim())) {
    errors.pincode = "Pincode must be 4–10 digits.";
  }
  if (values.latitude.trim()) {
    const lat = Number(values.latitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = "Latitude must be between -90 and 90.";
  }
  if (values.longitude.trim()) {
    const lng = Number(values.longitude);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.longitude = "Longitude must be between -180 and 180.";
  }
  if (values.asking_price.trim()) {
    const price = Number(values.asking_price);
    if (!Number.isFinite(price) || price < 0) errors.asking_price = "Asking price must be a non-negative number.";
  }
  return errors;
}
