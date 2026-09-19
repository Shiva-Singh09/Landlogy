import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { ApiError } from "../../services/api/client";
import {
  createProperty,
  getProperty,
  updateProperty,
  uploadPropertyImage,
} from "../../services/api/propertiesApi";
import { listPropertyCategories, listPropertyTypes } from "../../services/api/referenceApi";
import type { Client } from "../../types/client";
import {
  EMPTY_VALUES,
  validatePropertyForm,
  type PropertyFormErrors,
  type PropertyFormValues,
} from "./formUtils";
import { FormSections } from "./FormSections";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** Images staged for upload AFTER the property row exists (backend owns storage). */
interface StagedImage {
  id: string;
  file: File;
  previewUrl: string;
  error?: string;
}

export default function PropertyFormPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const isEdit = Boolean(propertyId);
  const navigate = useNavigate();

  const [values, setValues] = useState<PropertyFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<PropertyFormErrors>({});
  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [referenceError, setReferenceError] = useState("");
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceRetry, setReferenceRetry] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadSummary, setUploadSummary] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(null);
  const submitLock = useRef(false);

  const handleChange = useCallback((patch: Partial<PropertyFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as (keyof PropertyFormValues)[]) delete next[key];
      return next;
    });
  }, []);

  const handleSellerSelect = useCallback((client: Client | null) => {
    setValues((prev) => ({
      ...prev,
      owner_id: client ? client.id : "",
      owner_name: client ? client.name : "",
    }));
    setErrors((prev) => ({ ...prev, owner_id: undefined }));
  }, []);

  // Reference retries must not reload and overwrite edited property fields.
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listPropertyTypes(controller.signal),
      listPropertyCategories(controller.signal),
    ])
      .then(([types, categories]) => {
        if (controller.signal.aborted) return;
        setTypeOptions(types.propertyTypes.map((type) => ({ value: type.id, label: type.name })));
        setCategoryOptions(categories.propertyCategories.map((category) => ({ value: category.id, label: category.name })));
        setReferenceError("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setReferenceError(error instanceof ApiError ? error.message : "Unable to load property types and categories.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setReferenceLoading(false);
      });
    return () => controller.abort();
  }, [referenceRetry]);

  useEffect(() => {
    const controller = new AbortController();
    if (!propertyId) return () => controller.abort();

    // Flag the (re)load as in-flight from a microtask so the effect body
    // never triggers synchronous cascading re-renders.
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setLoadError("");
        setNotFound(false);
      }
    });
    getProperty(propertyId, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        const p = res.property;
        const owner = res.related?.owner ?? null;
        setValues({
          title: p.title ?? "",
          description: p.description ?? "",
          property_type_id: p.property_type_id ?? "",
          property_category_id: p.property_category_id ?? "",
          owner_id: p.owner_id ?? "",
          owner_name: owner ? owner.name : "",
          address: p.address ?? "",
          city: p.city ?? "",
          state: p.state ?? "",
          pincode: p.pincode ?? "",
          latitude: p.latitude === null || p.latitude === undefined ? "" : String(p.latitude),
          longitude: p.longitude === null || p.longitude === undefined ? "" : String(p.longitude),
          asking_price: p.asking_price === null || p.asking_price === undefined ? "" : String(p.asking_price),
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setLoadError(err instanceof ApiError ? err.message : "Unable to load this property. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [propertyId, reloadKey]);

  // Retain previews across list changes; release all remaining URLs on unmount.
  const previewUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = previewUrls.current;
    return () => { for (const url of urls) URL.revokeObjectURL(url); };
  }, []);

  const handleStageFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return {
        id: crypto.randomUUID(), file, previewUrl,
        error: !ALLOWED_IMAGE_TYPES.includes(file.type) ? "JPEG, PNG or WebP only."
          : file.size > MAX_IMAGE_BYTES ? "Larger than 5 MB." : undefined,
      };
    });
    setStagedImages((prev) => [...prev, ...selected]);
  }, []);

  const removeStagedImage = useCallback((stagedId: string) => {
    const target = stagedImages.find((image) => image.id === stagedId);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
      previewUrls.current.delete(target.previewUrl);
    }
    setStagedImages((previous) => previous.filter((image) => image.id !== stagedId));
  }, [stagedImages]);
  function parseDecimalOrNull(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const buildPayload = useCallback(
    (v: PropertyFormValues) => ({
      title: v.title.trim(),
      description: v.description.trim() || null,
      property_type_id: v.property_type_id || null,
      property_category_id: v.property_category_id || null,
      owner_id: v.owner_id,
      address: v.address.trim() || null,
      city: v.city.trim() || null,
      state: v.state.trim() || null,
      pincode: v.pincode.trim() || null,
      latitude: parseDecimalOrNull(v.latitude.trim()),
      longitude: parseDecimalOrNull(v.longitude.trim()),
      asking_price: parseDecimalOrNull(v.asking_price.trim()),
    }),
    [],
  );

  const uploadStagedImages = useCallback(
    async (pid: string) => {
      setUploadingImages(true);
      let ok = 0;
      const failed: StagedImage[] = [];
      for (const staged of stagedImages) {
        try {
          await uploadPropertyImage(pid, staged.file);
          URL.revokeObjectURL(staged.previewUrl);
          previewUrls.current.delete(staged.previewUrl);
          ok += 1;
        } catch (err) {
          failed.push({ ...staged, error: err instanceof ApiError ? err.message : "Upload failed. Try saving again to retry." });
        }
      }
      setStagedImages(failed);
      setUploadingImages(false);
      setUploadSummary(`${ok} uploaded; ${failed.length} failed. The property is saved. Retry failed uploads or continue to details.`);
      return failed.length === 0;
    },
    [stagedImages],
  );
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submitLock.current || loading) return;
      setSubmitError("");
      const validation = validatePropertyForm(values);
      setErrors(validation);
      if (Object.keys(validation).length > 0) return;
      if (stagedImages.some(({ file }) => !ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES)) {
        setSubmitError("Remove unsupported or oversized images before saving.");
        return;
      }
      submitLock.current = true;
      setSubmitting(true);
      try {
        const payload = buildPayload(values);
        let pid = savedId || propertyId;
        if (pid) await updateProperty(pid, payload);
        else pid = (await createProperty(payload)).property.id;
        setSavedId(pid);
        if (await uploadStagedImages(pid)) {
          navigate(`/properties/${pid}`, { state: { notice: "Property saved successfully." } });
        }
      } catch (err) {
        if (err instanceof ApiError) setSubmitError(err.message);
        else setSubmitError("Unable to save this property. Please try again.");
      } finally {
        submitLock.current = false;
        setSubmitting(false);
      }
    },
    [buildPayload, loading, navigate, propertyId, savedId, stagedImages, uploadStagedImages, values],
  );

  if (loading && isEdit && !values.title) {
    return (
      <div className="py-10">
        <LoadingState label="Loading property…" size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-3xl border border-land-ink/5 bg-white shadow-[0_12px_40px_rgba(25,23,36,0.05)]">
        <EmptyState
          icon={<ImagePlus size={22} />}
          title="Property not found"
          description="This property may have been deleted or the link is incorrect."
          action={
            <Link
              to="/properties"
              className="inline-flex min-h-11 items-center rounded-xl bg-land-emerald px-4 text-sm font-semibold text-white transition-colors hover:bg-land-jade"
            >
              Back to Properties
            </Link>
          }
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-land-ink/5 bg-white shadow-[0_12px_40px_rgba(25,23,36,0.05)]">
        <EmptyState
          icon={<ImagePlus size={22} />}
          title="Unable to load this property"
          description={loadError}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setReloadKey((k) => k + 1)}>Try again</Button>
              <Link to="/properties">
                <Button variant="secondary">Back to Properties</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const pendingCount = stagedImages.filter((s) => !s.error).length;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <PageHeader
        backTo="/properties"
        backLabel="Back to Properties"
        title={isEdit ? "Edit property" : "Add property"}
        description={
          isEdit
            ? "Update the property details below. Changes apply after you save."
            : "Create a new property record. Images upload after the property is saved."
        }
      />


      {submitError ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-land-coral/25 bg-land-coral/[0.06] px-4 py-3 text-sm font-medium text-land-coral"
        >
          {submitError}
        </div>
      ) : null}

      {referenceLoading ? <LoadingState label="Loading property types and categories…" /> : null}
      {referenceError ? (
        <div role="alert" className="mb-6 rounded-xl border border-land-coral/25 bg-land-coral/[0.06] px-4 py-3 text-sm text-land-coral">
          <p>{referenceError}</p>
          <Button type="button" variant="secondary" disabled={referenceLoading} onClick={() => {
            setReferenceLoading(true);
            setReferenceRetry((previous) => previous + 1);
          }}>Retry reference data</Button>
        </div>
      ) : null}
      <FormSections
        values={values}
        errors={errors}
        disabled={submitting}
        typeOptions={typeOptions}
        categoryOptions={categoryOptions}
        onChange={handleChange}
        onSellerSelect={handleSellerSelect}
      />

      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-display text-xl text-land-ink">Images</h2>
          <p className="text-sm text-land-ink/55">
            JPEG, PNG or WebP up to 5 MB each. Uploads start after you save.
          </p>
        </CardHeader>
        <CardContent>
          {stagedImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {stagedImages.map((staged) => (
                <div
                  key={staged.id}
                  className="relative overflow-hidden rounded-xl border border-land-ink/10 bg-land-stone/40"
                >
                  <img
                    src={staged.previewUrl}
                    alt={`Preview of ${staged.file.name}`}
                    className="h-28 w-full object-cover"
                  />
                  {staged.error ? (
                    <span className="absolute inset-x-1 bottom-1 rounded-lg bg-land-coral/90 px-2 py-1 text-[11px] font-semibold text-white">
                      {staged.error}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Remove ${staged.file.name}`}
                    onClick={() => removeStagedImage(staged.id)}
                    disabled={submitting}
                    className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-land-coral shadow-sm transition-colors hover:bg-white disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}


          <label
            className={`mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-land-ink/15 bg-land-stone/40 px-4 py-5 text-center transition-colors hover:border-land-emerald/40 hover:bg-land-emerald/[0.04] ${stagedImages.length > 0 ? "" : "mt-0"}`}
          >
            <input
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              multiple
              disabled={submitting}
              className="sr-only"
              onChange={(event) => {
                handleStageFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <ImagePlus size={20} aria-hidden="true" className="text-land-emerald" />
            <span className="text-sm font-semibold text-land-ink">
              {uploadingImages ? "Uploading images…" : "Select images"}
            </span>
            <span className="text-xs text-land-ink/50">Uploads start after you save this property.</span>
          </label>

          {uploadSummary ? (
            <p aria-live="polite" className="mt-2 text-[13px] text-land-ink/60">
              {uploadSummary}
            </p>
          ) : null}
          {pendingCount > 0 ? (
            <p className="mt-1 text-[13px] text-land-ink/50">
              {pendingCount} image{pendingCount === 1 ? "" : "s"} will be uploaded on save.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 mt-6 flex flex-col gap-3 border-t border-land-ink/5 bg-white/95 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="order-2 text-sm text-land-ink/55 sm:order-1">
          {uploadingImages ? "Uploading images…" : submitting ? "Saving property…" : ""}
        </p>
        <div className="order-1 flex gap-3 sm:order-2">
          <Button type="button" variant="secondary" disabled={submitting}
            onClick={() => navigate(savedId ? `/properties/${savedId}` : isEdit ? `/properties/${propertyId}` : "/properties")}>
            {savedId ? "Continue to details" : "Cancel"}
          </Button>
          <Button type="submit" loading={submitting} disabled={submitting}>
            {isEdit ? "Save changes" : "Create property"}
          </Button>
        </div>
      </div>
    </form>
  );
}
