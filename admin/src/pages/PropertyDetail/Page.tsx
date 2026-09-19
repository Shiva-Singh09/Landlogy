import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Pencil,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge, type BadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Select } from "../../components/ui/Select";
import { Skeleton } from "../../components/ui/Skeleton";
import { API_BASE_URL, ApiError } from "../../services/api/client";
import {
  deleteProperty,
  deletePropertyImage,
  getProperty,
  listPropertyImages,
  reorderPropertyImages,
  setPrimaryPropertyImage,
  updatePropertyStatus,
  uploadPropertyImage,
} from "../../services/api/propertiesApi";
import { listPropertyTypes, listPropertyCategories } from "../../services/api/referenceApi";
import { formatDate, formatPrice } from "../../utils/format";
import type {
  PropertyDetailResponse,
  PropertyImage,
  PropertyStatus,
} from "../../types/property";

const STATUS_BADGES: Record<PropertyStatus, BadgeVariant> = {
  draft: "neutral",
  under_review: "info",
  active: "success",
  rejected: "danger",
  inactive: "warning",
  sold: "premium",
  archived: "neutral",
};

const STATUS_OPTIONS: { value: PropertyStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "under_review", label: "Under review" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "inactive", label: "Inactive" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
];

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function StatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <Badge variant={STATUS_BADGES[status]} size="md" dot>
      {status.replace("_", " ")}
    </Badge>
  );
}

function imageSrc(url: string): string {
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
}

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

  const [response, setResponse] =
    useState<PropertyDetailResponse | null>(null);

  const [images, setImages] = useState<PropertyImage[]>([]);

  const [imagesState, setImagesState] = useState<
    "idle" | "loading" | "error" | "ready"
  >("idle");

  const [typeName, setTypeName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [statusValue, setStatusValue] = useState<PropertyStatus | "">("");
  const [activeImage, setActiveImage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const location = useLocation();
  const [actionNotice, setActionNotice] = useState(() => {
    const state: unknown = location.state;
    return state && typeof state === "object" && "notice" in state && typeof state.notice === "string" ? state.notice : "";
  });
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadResults, setUploadResults] = useState("");
  const [imageActionId, setImageActionId] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<{
    message: string;
    retryable: boolean;
  } | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!propertyId) {
        if (signal?.aborted) {
          return;
        }

        setError({
          message: "Invalid property.",
          retryable: false,
        });

        setLoading(false);
        return;
      }

      if (signal?.aborted) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const propertyResponse = await getProperty(propertyId, signal);

        if (signal?.aborted) {
          return;
        }

        setResponse(propertyResponse);
        setStatusValue(propertyResponse.property.status);
        const related = propertyResponse.related;
        if (related?.property_type) setTypeName(related.property_type.name);
        else if (propertyResponse.property.property_type_id) {
          listPropertyTypes(signal)
            .then((typesResp) => {
              const found = (typesResp.propertyTypes ?? []).find(
                (t) => t.id === propertyResponse.property.property_type_id,
              );
              if (found) setTypeName(found.name);
            })
            .catch(() => undefined);
        } else setTypeName("");
        if (related?.property_category) setCategoryName(related.property_category.name);
        else if (propertyResponse.property.property_category_id) {
          listPropertyCategories(signal)
            .then((catsResp) => {
              const found = (catsResp.propertyCategories ?? []).find(
                (c) => c.id === propertyResponse.property.property_category_id,
              );
              if (found) setCategoryName(found.name);
            })
            .catch(() => undefined);
        } else setCategoryName("");

        setImagesState("loading");

        try {
          const imagesResponse = await listPropertyImages(propertyId, signal);

          if (signal?.aborted) {
            return;
          }

          setImages(imagesResponse.images ?? []);
          setActiveImage(0);
          setImagesState("ready");
        } catch {
          if (!signal?.aborted) {
            setImagesState("error");
          }
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }

        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError({
              message: "Property not found.",
              retryable: false,
            });
          } else {
            setError({
              message: err.message,
              retryable: true,
            });
          }
        } else {
          setError({
            message: "Unable to load property details.",
            retryable: true,
          });
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [propertyId],
  );

  const refreshImages = useCallback(async () => {
    if (!propertyId) return;
    setImagesState("loading");
    try {
      const imagesResponse = await listPropertyImages(propertyId);
      setImages(imagesResponse.images ?? []);
      setActiveImage(0);
      setImagesState("ready");
    } catch {
      setImagesState("error");
    }
  }, [propertyId]);

  const saveStatus = useCallback(async () => {
    if (!propertyId || !response || !statusValue || statusValue === response.property.status) return;
    const target = statusValue;
    if (["sold", "archived", "rejected", "inactive"].includes(target)) {
      const ok = window.confirm(`Change status to "${target.replace("_", " ")}"?`);
      if (!ok) return;
    }
    setStatusSaving(true);
    setActionError("");
    setActionNotice("");
    try {
      await updatePropertyStatus(propertyId, target);
      await load();
      setActionNotice(`Status changed to "${target.replace("_", " ")}".`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to update status. Please try again.");
    } finally {
      setStatusSaving(false);
    }
  }, [propertyId, response, statusValue, load]);

  const confirmDeleteProperty = useCallback(async () => {
    if (!propertyId) return;
    setDeleting(true);
    try {
      await deleteProperty(propertyId);
      navigate("/properties");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to delete this property. Please try again.");
      setConfirmDelete(false);
      setDeleting(false);
    }
  }, [propertyId, navigate]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!propertyId) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadState("uploading");
    setUploadError("");
    setUploadResults("");
    let ok = 0;
    let failed = 0;
    for (const file of list) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        failed += 1;
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        failed += 1;
        continue;
      }
      try {
        await uploadPropertyImage(propertyId, file);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    await refreshImages();
    setUploadState(failed > 0 ? "error" : "idle");
    if (ok > 0 && failed === 0) setUploadResults(`${ok} image${ok === 1 ? "" : "s"} uploaded.`);
    else if (ok > 0) {
      setUploadResults(`${ok} uploaded, ${failed} failed.`);
      setUploadError(`${failed} image${failed === 1 ? "" : "s"} could not be uploaded. Only JPEG, PNG or WebP up to 5 MB.`);
    } else {
      setUploadError("No images were uploaded. Only JPEG, PNG or WebP up to 5 MB.");
    }
  }, [propertyId, refreshImages]);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (!propertyId) return;
    setImageActionId(imageId);
    try {
      await deletePropertyImage(propertyId, imageId);
      await refreshImages();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Unable to delete this image. Please try again.");
    } finally {
      setImageActionId("");
    }
  }, [propertyId, refreshImages]);

  const handlePrimaryImage = useCallback(async (imageId: string) => {
    if (!propertyId) return;
    setImageActionId(imageId);
    try {
      await setPrimaryPropertyImage(propertyId, imageId);
      await refreshImages();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Unable to set the primary image. Please try again.");
    } finally {
      setImageActionId("");
    }
  }, [propertyId, refreshImages]);

  const moveImage = useCallback(async (imageId: string, direction: -1 | 1) => {
    const ordered = [...images].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex((img) => img.id === imageId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
    const next = [...ordered];
    const [moved] = next.splice(index, 1);
    next.splice(swapIndex, 0, moved);
    setImageActionId(imageId);
    try {
      const res = await reorderPropertyImages(propertyId ?? "", next.map((img) => img.id));
      setImages(res.images ?? []);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Unable to reorder images. Please try again.");
    } finally {
      setImageActionId("");
    }
  }, [images, propertyId]);

  useEffect(() => {
    const controller = new AbortController();
    const scheduleLoad = () => {
      void load(controller.signal);
    };
    queueMicrotask(scheduleLoad);
    return () => {
      controller.abort();
    };
  }, [load]);

  if (!propertyId) {
    return (
      <div className="mx-auto min-w-0 max-w-[1200px] space-y-6">
        <PageHeader
          eyebrow="LANDLOGY ADMIN"
          title="Property"
          description="Details are missing."
        />

        <EmptyState
          icon={<Building2 size={22} />}
          title="Invalid property"
          description="This property link is missing an ID."
          action={
            <Button onClick={() => navigate("/properties")}>
              Back to properties
            </Button>
          }
        />
      </div>
    );
  }

  const property = response?.property ?? null;

  return (
    <div className="mx-auto min-w-0 max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="LANDLOGY ADMIN"
        title="Property"
        backTo="/properties"
        backLabel="Back to properties"
        description="Full details for a single property."
      />

      <div className="space-y-4">
        {loading ? (
          <Card className="space-y-4">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />

                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-7 w-56" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-2/3" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-full" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full" />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-full" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-full" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-full" />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Skeleton className="h-6 w-28 rounded-lg" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <EmptyState
            icon={<Building2 size={22} />}
            title={error.message}
            description={
              error.retryable
                ? "We couldn't load this property. Please try again."
                : "This property may no longer exist."
            }
            action={
              error.retryable ? (
                <Button
                  onClick={() => load()}
                  loading={loading}
                >
                  Try again
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => navigate("/properties")}
                >
                  Back to properties
                </Button>
              )
            }
          />
        ) : property ? (
          <>
            <Card className="space-y-5">
              <CardHeader className="mb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl leading-tight text-land-ink">
                      {property.title}
                    </h2>

                    <p className="mt-1 text-sm text-land-ink/55">
                      {[property.city, property.state]
                        .filter(Boolean)
                        .join(", ") || "Location not specified"}
                    </p>
                  </div>

                  <StatusBadge status={property.status} />
                </div>

                <p className="mt-3 text-lg font-semibold text-land-ink">
                  {formatPrice(property.asking_price)}
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-land-ink/45">
                      Address
                    </dt>
                    <dd className="mt-1 break-words text-sm text-land-ink">
                      {property.address || "Not specified"}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-land-ink/45">
                      City
                    </dt>
                    <dd className="mt-1 text-sm text-land-ink">
                      {property.city || "Not specified"}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-land-ink/45">
                      State
                    </dt>
                    <dd className="mt-1 text-sm text-land-ink">
                      {property.state || "Not specified"}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-land-ink/45">
                      Pincode
                    </dt>
                    <dd className="mt-1 text-sm text-land-ink">
                      {property.pincode || "Not specified"}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-land-ink/45">
                      Type
                    </dt>
                    <dd className="mt-1 text-sm text-land-ink">
                      {typeName || "Not specified"}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-land-ink/45">
                      Category
                    </dt>
                    <dd className="mt-1 text-sm text-land-ink">
                      {categoryName || "Not specified"}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-land-ink/45">
                      Created
                    </dt>
                    <dd className="mt-1 text-sm text-land-ink">
                      {formatDate(property.created_at)}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-land-ink/45">
                      Updated
                    </dt>
                    <dd className="mt-1 text-sm text-land-ink">
                      {formatDate(property.updated_at)}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-land-ink/45">
                      Seller / Client
                    </dt>
                    <dd className="mt-1 break-words text-sm text-land-ink">
                      {response?.related?.owner
                        ? `${response.related.owner.name} (${response.related.owner.email})`
                        : property.owner_id}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-land-ink/60">
                    Description
                  </p>

                  {property.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-land-ink">
                      {property.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-land-ink/50">
                      No description provided.
                    </p>
                  )}
                </div>

                {property.status_history &&
                  property.status_history.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-land-ink/60">
                        Status history
                      </p>

                      <ul className="max-w-xl space-y-1.5 text-xs text-land-ink/60">
                        {property.status_history.map(
                          (entry, index) => (
                            <li
                              key={index}
                              className="break-words rounded-lg bg-land-stone/60 px-3 py-2"
                            >
                              {entry.from
                                ? `${entry.from} to ${entry.to}`
                                : entry.status}{" "}
                              - {formatDate(entry.at)}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                <div className="flex flex-wrap items-center gap-3 border-t border-land-ink/5 pt-4">
                  <Link to={`/properties/${property.id}/edit`}>
                    <Button leftIcon={<Pencil size={15} />}>Edit property</Button>
                  </Link>
                  <Button variant="danger" leftIcon={<Trash2 size={15} />} onClick={() => setConfirmDelete(true)}>
                    Delete
                  </Button>
                  <Link to="/properties">
                    <Button
                      variant="ghost"
                      leftIcon={<ArrowLeft size={15} />}
                    >
                      Back to properties
                    </Button>
                  </Link>
                </div>
                {actionError && (
                  <p role="alert" className="text-sm font-medium text-land-coral">
                    {actionError}
                  </p>
                )}
                {actionNotice && (
                  <p role="status" className="text-sm font-medium text-land-emerald">
                    {actionNotice}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="space-y-4">
              <CardHeader className="mb-0">
                <h2 className="font-display text-xl text-land-ink">Status</h2>
                <p className="text-sm text-land-ink/55">
                  Current status with controlled transitions.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  label="Property status"
                  options={STATUS_OPTIONS}
                  value={statusValue}
                  onChange={(event) => setStatusValue(event.target.value as PropertyStatus)}
                />
                <Button
                  disabled={!statusValue || statusValue === property.status || statusSaving}
                  loading={statusSaving}
                  onClick={saveStatus}
                >
                  Save status
                </Button>
              </CardContent>
            </Card>

            <Card className="space-y-4">
              <CardHeader className="mb-0">
                <h2 className="font-display text-xl text-land-ink">
                  Property images
                </h2>

                <p className="text-sm text-land-ink/55">
                  Upload JPEG, PNG or WebP images up to 5 MB each.
                </p>
              </CardHeader>

              <CardContent>
                <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed border-land-ink/15 bg-land-stone/50 px-4 py-6 text-center transition-colors hover:border-land-emerald/40">
                  <Upload size={20} className="text-land-emerald" />
                  <span className="text-sm font-semibold text-land-ink">
                    {uploadState === "uploading" ? "Uploading…" : "Choose images"}
                  </span>
                  <span className="text-xs text-land-ink/55">JPEG, PNG, WebP · max 5 MB each</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploadState === "uploading"}
                    className="sr-only"
                    onChange={(event) => {
                      if (event.target.files) void handleFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                {uploadResults && (
                  <p role="status" className="mt-2 text-sm font-medium text-land-emerald">
                    {uploadResults}
                  </p>
                )}
                {uploadError && (
                  <p role="alert" className="mt-2 text-sm font-medium text-land-coral">
                    {uploadError}
                  </p>
                )}
                {imagesState === "loading" ||
                imagesState === "idle" ? (
                  <div
                    className="grid gap-3 sm:grid-cols-2"
                    role="status"
                    aria-live="polite"
                    aria-label="Loading property images"
                  >
                    {[0, 1].map((index) => (
                      <Skeleton
                        key={index}
                        className="aspect-[4/3] w-full"
                        rounded="xl"
                        label={
                          index === 0
                            ? "Loading property images"
                            : undefined
                        }
                      />
                    ))}

                    <span className="sr-only">
                      Loading property images…
                    </span>
                  </div>
                ) : imagesState === "error" && images.length === 0 ? (
                  <EmptyState
                    icon={<ImageIcon size={22} />}
                    title="Could not load images"
                    description="Property details loaded, but the image gallery is unavailable right now."
                    action={<Button variant="secondary" size="sm" onClick={refreshImages}>Retry</Button>}
                  />
                ) : images.length === 0 ? (
                  <EmptyState
                    icon={<ImageIcon size={22} />}
                    title="No images"
                    description="No images have been added for this property yet."
                  />
                ) : (
                  <>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-land-ink/[0.06] bg-land-stone">
                      <img
                        src={imageSrc(images[Math.min(activeImage, images.length - 1)].url)}
                        alt={images[Math.min(activeImage, images.length - 1)].caption || "Property image"}
                        className="aspect-[16/9] w-full object-cover"
                        onError={(event) => {
                          (event.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    {images.length > 1 && (
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<ChevronLeft size={15} />}
                          onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                          aria-label="Previous image"
                        >
                          Prev
                        </Button>
                        <span className="text-xs font-medium text-land-ink/55">
                          {Math.min(activeImage, images.length - 1) + 1} of {images.length}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          rightIcon={<ChevronRight size={15} />}
                          onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                          aria-label="Next image"
                        >
                          Next
                        </Button>
                      </div>
                    )}
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                      {images.map((image, index) => (
                        <li
                          key={image.id}
                          className="overflow-hidden rounded-xl border border-land-ink/[0.06] bg-land-stone"
                        >
                          <button
                            type="button"
                            onClick={() => setActiveImage(index)}
                            aria-label={`Show image ${index + 1}`}
                            className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-plum/50"
                          >
                            <img
                              src={imageSrc(image.url)}
                              alt={image.caption || `Property image ${index + 1}`}
                              loading="lazy"
                              className="aspect-[4/3] w-full object-cover"
                              onError={(event) => {
                                (event.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </button>
                          <div className="flex flex-wrap items-center gap-1.5 border-t border-land-ink/[0.06] px-2 py-2">
                            {image.is_primary ? (
                              <Badge variant="premium" size="sm">Primary</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Star size={13} />}
                                disabled={imageActionId === image.id}
                                onClick={() => void handlePrimaryImage(image.id)}
                                aria-label={`Set image ${index + 1} as primary`}
                              >
                                Primary
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={imageActionId === image.id || index === 0}
                              onClick={() => void moveImage(image.id, -1)}
                              aria-label={`Move image ${index + 1} earlier`}
                            >
                              <ArrowLeft size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={imageActionId === image.id || index === images.length - 1}
                              onClick={() => void moveImage(image.id, 1)}
                              aria-label={`Move image ${index + 1} later`}
                            >
                              <ArrowRight size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-land-coral hover:bg-land-coral/10 hover:text-land-coral"
                              disabled={imageActionId === image.id}
                              onClick={() => void handleDeleteImage(image.id)}
                              aria-label={`Delete image ${index + 1}`}
                            >
                              <X size={13} />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    </>
                )}
              </CardContent>
            </Card>
            <ConfirmDialog
              open={confirmDelete}
              title="Delete property"
              description={`Delete "${property.title}"? This removes the property, its images and its commissions. This cannot be undone.`}
              confirmLabel="Delete property"
              busy={deleting}
              onCancel={() => {
                if (!deleting) setConfirmDelete(false);
              }}
              onConfirm={() => void confirmDeleteProperty()}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
