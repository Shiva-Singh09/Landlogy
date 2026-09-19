import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { listClients } from "../../services/api/clientsApi";
import type { Client } from "../../types/client";

export function SellerSelect({
  ownerId,
  ownerName,
  error,
  disabled,
  onSelect,
}: {
  ownerId: string;
  ownerName: string;
  error?: string;
  disabled?: boolean;
  onSelect: (client: Client | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const res = await listClients({ search: query.trim() || undefined, limit: 8 }, controller.signal);
        if (!controller.signal.aborted) setResults(res.clients ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearchError("Unable to load sellers. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open, retryKey]);

  return (
    <div ref={boxRef} className="relative w-full">
      <span id="seller-label" className="mb-1.5 block text-sm font-semibold text-land-ink">
        Seller / Client <span aria-hidden="true" className="ml-1 text-land-coral">*</span>
      </span>
      {ownerId ? (
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-land-ink/10 bg-white px-3 py-2.5">
          <span className="min-w-0 truncate text-sm font-medium text-land-ink">
            {ownerName || "Selected seller"}
          </span>
          {!disabled && (
            <button
              type="button"
              aria-label="Change seller"
              onClick={() => {
                onSelect(null);
                setQuery("");
                setOpen(true);
              }}
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg text-land-ink/45 hover:text-land-coral"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <>
          <Input
            aria-labelledby="seller-label"
            placeholder="Search seller by name, email or phone…"
            value={query}
            disabled={disabled}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            leftIcon={<Search size={16} />}
            error={error}
          />
          {open && (
            <ul
              role="listbox"
              aria-label="Matching sellers"
              className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-land-ink/10 bg-white py-1 shadow-[0_16px_50px_rgba(25,23,36,0.16)]"
            >
              {searching ? (
                <li className="px-3 py-2.5 text-sm text-land-ink/50">Searching…</li>
              ) : searchError ? (
                <li className="px-3 py-2.5 text-sm text-land-coral">
                  <p role="alert">{searchError}</p>
                  <button type="button" className="mt-2 font-semibold underline" onClick={() => {
                    setSearching(true);
                    setRetryKey((previous) => previous + 1);
                  }}>Retry seller search</button>
                </li>
              ) : results.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-land-ink/50">No sellers found.</li>
              ) : (
                results.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-land-stone"
                      onClick={() => {
                        onSelect(client);
                        setOpen(false);
                      }}
                    >
                      <span className="text-sm font-semibold text-land-ink">{client.name}</span>
                      <span className="truncate text-xs text-land-ink/55">{client.email}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
