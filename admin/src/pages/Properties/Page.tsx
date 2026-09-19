import { useEffect, useCallback, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Building2,
  Search,
  Plus,
  ArrowLeft,
  ArrowRight,
  Eye,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge, type BadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Card, CardContent } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { ApiError } from "../../services/api/client";
import { deleteProperty, listProperties } from "../../services/api/propertiesApi";
import { listPropertyTypes, listPropertyCategories } from "../../services/api/referenceApi";
import { formatDate, formatPrice } from "../../utils/format";
import type {
  PropertyListItem,
  PropertyStatus,
  PropertyListResponse,
  PropertySortBy,
} from "../../types/property";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "under_review", label: "Under review" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "inactive", label: "Inactive" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
];

const SORT_OPTIONS: { value: string; label: string; sort_by: PropertySortBy; sort_dir: "ASC" | "DESC" }[] = [
  { value: "newest", label: "Newest first", sort_by: "created_at", sort_dir: "DESC" },
  { value: "oldest", label: "Oldest first", sort_by: "created_at", sort_dir: "ASC" },
  { value: "price_asc", label: "Price: low to high", sort_by: "asking_price", sort_dir: "ASC" },
  { value: "price_desc", label: "Price: high to low", sort_by: "asking_price", sort_dir: "DESC" },
  { value: "title_asc", label: "Title: A to Z", sort_by: "title", sort_dir: "ASC" },
  { value: "title_desc", label: "Title: Z to A", sort_by: "title", sort_dir: "DESC" },
];

const STATUS_BADGES: Record<PropertyStatus, BadgeVariant> = {
  draft: "neutral",
  under_review: "info",
  active: "success",
  rejected: "danger",
  inactive: "warning",
  sold: "premium",
  archived: "neutral",
};

const PAGE_SIZES = [10, 20, 50];

const VALID_STATUSES: PropertyStatus[] = [
  "draft",
  "under_review",
  "active",
  "rejected",
  "inactive",
  "sold",
  "archived",
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ListError =
  | null
  | { type: "api"; message: string }
  | { type: "network"; message: string };

function propertyUrl(property: PropertyListItem) {
  return `/properties/${property.id}`;
}

function PropertyRow({ property, onDelete }: { property: PropertyListItem; onDelete: (property: PropertyListItem) => void }) {

  return (
    <div className="group flex min-h-0 flex-col gap-3 rounded-2xl border border-land-ink/[0.06] bg-white p-4 transition-colors hover:border-land-ink/[0.12] hover:bg-land-stone/40">
      <div className="min-w-0 flex flex-1 items-start gap-3">
        <Link
          to={propertyUrl(property)}
          aria-label={`View ${property.title}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-land-plum/10 text-land-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-plum/50"
        >
          <Building2 size={18} strokeWidth={2} aria-hidden="true" />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            to={propertyUrl(property)}
            className="block truncate text-sm font-semibold text-land-ink hover:text-land-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-plum/50"
          >
            {property.title}
          </Link>

          <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-land-ink/55">
            <span className="truncate">
              {property.city || "—"}
              {property.city && property.state ? ", " : ""}
              {property.state || ""}
            </span>

            <span className="truncate">{formatPrice(property.asking_price)}</span>

            <span className="truncate">{formatDate(property.created_at)}</span>
          </p>
        </div>

        <Badge variant={STATUS_BADGES[property.status]} size="sm" dot>
          {property.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link to={propertyUrl(property)}>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Eye size={15} />}
            className="text-land-plum hover:bg-land-plum/10 hover:text-land-plum"
            aria-label={`View ${property.title}`}
          >
            View
          </Button>
        </Link>

        <Link to={`${propertyUrl(property)}/edit`}>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Pencil size={14} />}
            aria-label={`Edit ${property.title}`}
          >
            Edit
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Trash2 size={14} />}
          className="text-land-coral hover:bg-land-coral/10 hover:text-land-coral"
          onClick={() => onDelete(property)}
          aria-label={`Delete ${property.title}`}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus = searchParams.get("status") || "";
  const status: PropertyStatus | "" = (
    VALID_STATUSES as string[]
  ).includes(rawStatus)
    ? (rawStatus as PropertyStatus)
    : "";
  const rawSort = searchParams.get("sort") || "newest";
  const sort = SORT_OPTIONS.some((o) => o.value === rawSort)
    ? rawSort
    : "newest";
  const sortOption =
    SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0];
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10) || 1,
  );
  const limitValue = parseInt(searchParams.get("limit") || "20", 10);
  const limit = PAGE_SIZES.includes(limitValue) ? limitValue : 20;
  const search = searchParams.get("q") || "";
  const typeFilter = searchParams.get("type") || "";
  const categoryFilter = searchParams.get("category") || "";
  const cityFilter = searchParams.get("city") || "";
  const minFilter = searchParams.get("min_price") || "";
  const maxFilter = searchParams.get("max_price") || "";

  const [response, setResponse] =
    useState<PropertyListResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<ListError>(null);

  const [searchInput, setSearchInput] = useState(search);
  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [priceInput, setPriceInput] = useState({ min: minFilter, max: maxFilter });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PropertyListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const query = useMemo(
    () => ({
      page,
      limit,
      status: status || undefined,
      property_type_id: typeFilter && UUID_RE.test(typeFilter) ? typeFilter : undefined,
      property_category_id: categoryFilter && UUID_RE.test(categoryFilter) ? categoryFilter : undefined,
      city: cityFilter || undefined,
      min_price: minFilter !== "" && !Number.isNaN(Number(minFilter)) ? Number(minFilter) : undefined,
      max_price: maxFilter !== "" && !Number.isNaN(Number(maxFilter)) ? Number(maxFilter) : undefined,
      search: search || undefined,
      sort_by: sortOption.sort_by,
      sort_dir: sortOption.sort_dir,
    }),
    [page, limit, status, search, typeFilter, categoryFilter, cityFilter, minFilter, maxFilter, sortOption],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (signal?.aborted) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [result, typesResp, catsResp] = await Promise.all([
          listProperties(query, signal),
          listPropertyTypes(signal).catch(() => null),
          listPropertyCategories(signal).catch(() => null),
        ]);

        if (signal?.aborted) {
          return;
        }

        setResponse(result);
        if (typesResp) {
          setTypeOptions((typesResp.propertyTypes ?? []).map((t) => ({ value: t.id, label: t.name })));
        }
        if (catsResp) {
          setCategoryOptions((catsResp.propertyCategories ?? []).map((c) => ({ value: c.id, label: c.name })));
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }

        if (err instanceof ApiError) {
          setError({
            type: "api",
            message: err.message,
          });
        } else {
          setError({
            type: "network",
            message:
              "Unable to reach the server. Please check your connection and try again.",
          });
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [query],
  );

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

  const updateParams = useCallback(
    (mutate: (updated: URLSearchParams) => void) => {
      setSearchParams((prev) => {
        const updated = new URLSearchParams(prev);
        mutate(updated);
        return updated;
      });
    },
    [setSearchParams],
  );

  const [syncedSearch, setSyncedSearch] = useState(search);
  const [syncedPrices, setSyncedPrices] = useState({ min: minFilter, max: maxFilter });
  // Adjust drafts only when URL state changes, before children render. This
  // also cancels a pending search when navigating back to a different query.
  if (syncedSearch !== search) {
    setSyncedSearch(search);
    setSearchInput(search);
  }
  if (syncedPrices.min !== minFilter || syncedPrices.max !== maxFilter) {
    setSyncedPrices({ min: minFilter, max: maxFilter });
    setPriceInput({ min: minFilter, max: maxFilter });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== search) {
        updateParams((updated) => {
          if (trimmed) updated.set("q", trimmed);
          else updated.delete("q");
          updated.set("page", "1");
        });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, search, updateParams]);

  const setPage = useCallback(
    (nextPage: number) => {
      updateParams((updated) => {
        updated.set("page", String(nextPage));
      });
    },
    [updateParams],
  );

  const setPageSize = useCallback(
    (nextLimit: number) => {
      updateParams((updated) => {
        updated.set("limit", String(nextLimit));
        updated.set("page", "1");
      });
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setPriceInput({ min: "", max: "" });
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.delete("q");
      updated.delete("status");
      updated.delete("type");
      updated.delete("category");
      updated.delete("city");
      updated.delete("min_price");
      updated.delete("max_price");
      updated.set("page", "1");
      return updated;
    });
  }, [setSearchParams]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteProperty(deleteTarget.id);
      setDeleteTarget(null);
      setNotice(`"${deleteTarget.title}" was deleted.`);
      await load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Unable to delete this property. Please try again.");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, load]);

  const properties = response?.properties ?? [];
  const pagination = response?.pagination;
  const isEmpty = !loading && properties.length === 0;
  const hasActiveFilters = Boolean(status || search || typeFilter || categoryFilter || cityFilter || minFilter || maxFilter);
  const activeFilterCount = [status, typeFilter, categoryFilter, cityFilter, minFilter, maxFilter].filter(Boolean).length;

  return (
    <div className="mx-auto min-w-0 max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="LANDLOGY ADMIN"
        title="Properties"
        description="Review and manage every property in the portfolio."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={
                viewMode === "list" ? (
                  <List size={15} />
                ) : (
                  <LayoutGrid size={15} />
                )
              }
              onClick={() =>
                setViewMode(viewMode === "list" ? "grid" : "list")
              }
              aria-pressed={viewMode === "list"}
            >
              {viewMode === "list" ? "Grid" : "List"}
            </Button>
            <Link to="/properties/add">
              <Button leftIcon={<Plus size={16} />}>
                Add property
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="space-y-4">
        <CardContent className="mt-0 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 basis-full xl:basis-48 xl:flex-1">
                <Input
                  placeholder="Search title, address, city or pincode…"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  leftIcon={<Search size={16} />}
                  aria-label="Search properties"
                  rightElement={
                    searchInput ? (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setSearchInput("")}
                        className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg text-land-ink/45 transition-colors hover:text-land-ink"
                      >
                        <X size={16} />
                      </button>
                    ) : undefined
                  }
                />
              </div>

            <div className="flex min-w-0 flex-1 items-end gap-2 sm:gap-3 xl:flex-none">
              <div className="min-w-0 flex-1 xl:w-40 xl:flex-none">
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={status}
                onChange={(event) =>
                  updateParams((updated) => {
                    if (event.target.value) updated.set("status", event.target.value);
                    else updated.delete("status");
                    updated.set("page", "1");
                  })
                }
                placeholder="Any status"
                className="min-w-0"
              />
              </div>

              <div className="min-w-0 flex-1 xl:w-48 xl:flex-none">
              <Select
                label="Sort"
                options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={sort}
                onChange={(event) =>
                  updateParams((updated) => {
                    updated.set("sort", event.target.value || "newest");
                    updated.set("page", "1");
                  })
                }
                placeholder="Newest first"
                className="min-w-0"
              />
              </div>

              <Button
                variant="secondary"
                size="md"
                className="shrink-0 px-3 sm:px-5"
                leftIcon={<SlidersHorizontal size={15} />}
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
            </div>
          </div>

          {filtersOpen && (
            <div className="grid gap-3 rounded-2xl border border-land-ink/[0.06] bg-land-stone/50 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <Select
                label="Property type"
                options={typeOptions}
                value={typeFilter}
                onChange={(event) =>
                  updateParams((updated) => {
                    if (event.target.value) updated.set("type", event.target.value);
                    else updated.delete("type");
                    updated.set("page", "1");
                  })
                }
                placeholder="All types"
              />
              <Select
                label="Category"
                options={categoryOptions}
                value={categoryFilter}
                onChange={(event) =>
                  updateParams((updated) => {
                    if (event.target.value) updated.set("category", event.target.value);
                    else updated.delete("category");
                    updated.set("page", "1");
                  })
                }
                placeholder="All categories"
              />
              <Input
                label="City"
                placeholder="e.g. Lucknow"
                value={cityFilter}
                onChange={(event) =>
                  updateParams((updated) => {
                    const v = event.target.value.trim();
                    if (v) updated.set("city", v);
                    else updated.delete("city");
                    updated.set("page", "1");
                  })
                }
                aria-label="Filter by city"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Min price"
                  inputMode="numeric"
                  placeholder="0"
                  value={priceInput.min}
                  onChange={(event) => setPriceInput((p) => ({ ...p, min: event.target.value }))}
                  onBlur={() =>
                    updateParams((updated) => {
                      const v = priceInput.min.trim();
                      if (v !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0) updated.set("min_price", v);
                      else updated.delete("min_price");
                      updated.set("page", "1");
                    })
                  }
                  aria-label="Minimum price"
                />
                <Input
                  label="Max price"
                  inputMode="numeric"
                  placeholder="No max"
                  value={priceInput.max}
                  onChange={(event) => setPriceInput((p) => ({ ...p, max: event.target.value }))}
                  onBlur={() =>
                    updateParams((updated) => {
                      const v = priceInput.max.trim();
                      if (v !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0) updated.set("max_price", v);
                      else updated.delete("max_price");
                      updated.set("page", "1");
                    })
                  }
                  aria-label="Maximum price"
                />
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}

          {notice && (
            <p role="status" className="rounded-xl border border-land-emerald/20 bg-land-emerald/[0.07] px-4 py-2.5 text-sm font-medium text-land-ink/80">
              {notice}
            </p>
          )}

          <div className="space-y-3">
            {loading ? (
              <div
                className="space-y-3"
                role="status"
                aria-live="polite"
                aria-label="Loading properties"
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-[76px] w-full"
                    rounded="xl"
                    label={
                      index === 0
                        ? "Loading properties"
                        : undefined
                    }
                  />
                ))}

                <span className="sr-only">
                  Loading properties…
                </span>
              </div>
            ) : error ? (
              <EmptyState
                icon={<Building2 size={22} />}
                title={error.message}
                description="We could not load properties. Check your connection and try again."
                action={
                  <Button
                    onClick={() => load()}
                    loading={loading}
                  >
                    Try again
                  </Button>
                }
              />
            ) : isEmpty && !hasActiveFilters ? (
              <EmptyState
                icon={<Building2 size={22} />}
                title="No properties yet"
                description="New properties will appear here once they are added to the portfolio."
                action={
                  <Link
                    to="/properties/add"
                    className="inline-flex min-h-11 items-center rounded-xl bg-land-emerald px-4 text-sm font-semibold text-white transition-colors hover:bg-land-jade"
                  >
                    Add property
                  </Link>
                }
              />
            ) : isEmpty ? (
              <EmptyState
                icon={<Search size={22} />}
                title={searchInput || search ? "No properties match your search" : "No properties match these filters"}
                description="Try clearing or adjusting the filters."
                action={
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : viewMode === "list" ? (
              <ul className="divide-y divide-land-ink/[0.06]">
                {properties.map((property) => (
                  <li key={property.id}>
                    <PropertyRow property={property} onDelete={setDeleteTarget} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {properties.map((property) => (
                  <PropertyRow
                    key={property.id}
                    property={property}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="border-t border-land-ink/5 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-sm text-land-ink/60">
                    <span>
                      Showing{" "}
                      {(pagination.page - 1) * pagination.limit + 1}
                      –
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total || 0,
                      )}{" "}
                      of {pagination.total ?? 0} properties
                    </span>

                    <select
                      value={String(pagination.limit)}
                      onChange={(event) => {
                        const next = parseInt(
                          event.target.value,
                          10,
                        );

                        if (
                          !Number.isNaN(next) &&
                          PAGE_SIZES.includes(next)
                        ) {
                          setPageSize(next);
                        }
                      }}
                      aria-label="Properties per page"
                      className="min-h-9 rounded-lg border border-land-ink/10 bg-white px-2.5 py-1.5 text-sm text-land-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-plum/40"
                    >
                      {PAGE_SIZES.map((size) => (
                        <option
                          key={size}
                          value={String(size)}
                        >
                          {size} / page
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<ArrowLeft size={15} />}
                      disabled={pagination.page <= 1}
                      onClick={() =>
                        setPage(pagination.page - 1)
                      }
                      aria-label="Previous page"
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1 text-sm text-land-ink/60">
                      Page {pagination.page} of{" "}
                      {pagination.totalPages || 1}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      rightIcon={<ArrowRight size={15} />}
                      disabled={
                        pagination.page >=
                        pagination.totalPages
                      }
                      onClick={() =>
                        setPage(pagination.page + 1)
                      }
                      aria-label="Next page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete property"
        description={
          <>
            <p>
              Delete <strong>“{deleteTarget?.title}”</strong>? This removes the property, its images and its
              commissions. This cannot be undone.
            </p>
            {deleteError && (
              <p role="alert" className="mt-2 font-medium text-land-coral">
                {deleteError}
              </p>
            )}
          </>
        }
        confirmLabel="Delete property"
        busy={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
