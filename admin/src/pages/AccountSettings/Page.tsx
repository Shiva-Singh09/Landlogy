import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Clock3,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { useNotifications, usePushSubscription } from "../../components/notifications/NotificationContext";
import { clearAuthToken, getAdminProfile } from "../../services/api/client";
import { getAdminMe, changeAdminPassword } from "../../services/api/accountApi";
import type { AdminProfile } from "../../types/account";

/** Section shell: icon chip + title + description, then the section body. */
function SettingsSection({
  icon,
  title,
  description,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={["flex min-w-0 flex-col", className].join(" ")}>
      <div className="mb-4 flex items-start gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-land-border bg-land-stone text-land-ink/60">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight text-land-ink">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-land-body">{description}</p>
        </div>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </Card>
  );
}

/** Setting row used inside the notifications card. */
function SettingRow({ title, description, status, children }: { title: string; description: string; status?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-land-border py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-land-ink">{title}</h3>
          {status}
        </div>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-land-body">{description}</p>
      </div>
      <div className="shrink-0 sm:self-center">{children}</div>
    </div>
  );
}

/** Accessible on/off switch knob. Blue = enabled sound, coral = muted. */
function ToggleSwitch({ checked, tone = "blue" }: { checked: boolean; tone?: "blue" | "emerald" }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 motion-reduce:transition-none",
        checked ? (tone === "emerald" ? "bg-land-emerald" : "bg-land-blue") : "bg-land-coral",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        ].join(" ")}
      />
    </span>
  );
}

/** Neutral profile detail row (label + value) used in the profile card. */
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-land-border py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-land-muted">{label}</dt>
      <dd className="min-w-0 text-sm font-semibold text-land-ink sm:text-right">{children}</dd>
    </div>
  );
}

interface PasswordForm { current: string; next: string; confirm: string }
const EMPTY_FORM: PasswordForm = { current: "", next: "", confirm: "" };

function validate(form: PasswordForm): Partial<Record<keyof PasswordForm, string>> {
  const errors: Partial<Record<keyof PasswordForm, string>> = {};
  if (!form.current) errors.current = "Enter your current password.";
  if (form.next.length < 8) errors.next = "New password must be at least 8 characters.";
  else if (form.next.length > 128) errors.next = "New password must be at most 128 characters.";
  else if (form.next === form.current) errors.next = "New password must differ from the current one.";
  if (form.confirm !== form.next) errors.confirm = "Passwords do not match.";
  return errors;
}

export default function AccountSettingsPage() {
  const { soundEnabled, toggleSound: setSoundEnabled } = useNotifications();
  const push = usePushSubscription();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const togglePush = async () => {
    setBusy(true);
    try { if (push.subscribed) await push.unsubscribe(); else await push.subscribe(); } finally { setBusy(false); }
  };
  const handleSoundToggle = async () => {
    const nextMuted = soundEnabled;
    setSoundEnabled();
    if (!push.subscribed || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    setBusy(true);
    try { await push.subscribe(nextMuted); } finally { setBusy(false); }
  };
  const pushLabel = push.subscribed ? "Browser notifications are active" : push.status === "unsupported" ? "Browser notifications are not supported" : push.status === "denied" ? "Notifications are blocked in browser settings" : "Browser notifications are off";
  const pushDisabled = busy || push.status === "idle" || push.status === "unsupported" || push.status === "denied";

  const cached = getAdminProfile();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [profileError, setProfileError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getAdminMe(controller.signal)
      .then((response) => { if (!controller.signal.aborted && response.ok) setProfile(response.user); else if (!controller.signal.aborted) setProfileError(true); })
      .catch(() => !controller.signal.aborted && setProfileError(true));
    return () => controller.abort();
  }, []);
  const shown = profile
    ? { name: profile.name, email: profile.email, role: profile.role, status: profile.status, verified: profile.is_email_verified, lastLogin: profile.last_login_at }
    : cached
      ? { name: cached.name, email: cached.email, role: cached.role, status: null as string | null, verified: null as boolean | null, lastLogin: null as string | null }
      : null;

  // ── Change password (POST /api/auth/set-password) ──
  const [form, setForm] = useState<PasswordForm>(EMPTY_FORM);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [saveError, setSaveError] = useState("");
  const setField = (field: keyof PasswordForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((old) => ({ ...old, [field]: event.target.value }));
    setErrors((old) => ({ ...old, [field]: undefined }));
    setSaved(""); setSaveError("");
  };
  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true); setSaved(""); setSaveError("");
    try {
      const response = await changeAdminPassword({ current_password: form.current, new_password: form.next });
      if (response.ok) { setSaved("Password updated successfully."); setForm(EMPTY_FORM); }
      else setSaveError("Unable to update the password right now. Please try again.");
    } catch (err) {
      setSaveError(err instanceof Error && err.message ? err.message : "Unable to update the password. Check your current password and try again.");
    } finally { setSaving(false); }
  };
  const visibilityButton = (field: keyof typeof show) => (
    <button type="button" onClick={() => setShow((old) => ({ ...old, [field]: !old[field] }))}
      aria-label={show[field] ? "Hide password" : "Show password"}
      className="min-h-8 rounded px-2 text-xs font-bold text-land-blue hover:bg-land-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-blue/30">
      {show[field] ? "Hide" : "Show"}
    </button>
  );
  const handleLogout = () => {
    // Reuses the existing token utility: clear the stored admin JWT, then
    // route to /login (replace so /account-settings is not kept in history).
    clearAuthToken();
    navigate("/login", { replace: true });
  };
  const permissionGranted = typeof Notification !== "undefined" && Notification.permission === "granted";
  const permissionBlocked = push.status === "denied" || (typeof Notification !== "undefined" && Notification.permission === "denied");

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
      <PageHeader
        eyebrow="SYSTEM"
        title="Account Settings"
        description="Manage your administrator profile, security, notifications and account preferences."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SettingsSection
          icon={<UserRound size={17} aria-hidden="true" />}
          title="Profile & account"
          description="Live details from your administrator profile."
        >
          {shown ? (
            <dl className="min-w-0">
              <DetailRow label="Name">{shown.name}</DetailRow>
              <DetailRow label="Email">
                <span className="break-all">{shown.email}</span>
              </DetailRow>
              <DetailRow label="Role">
                <span className="capitalize">{shown.role}</span>
              </DetailRow>
              {shown.status ? (
                <DetailRow label="Status">
                  <Badge variant={shown.status === "active" ? "success" : "warning"} size="sm" dot>
                    {shown.status}
                  </Badge>
                </DetailRow>
              ) : null}
              {shown.verified !== null ? (
                <DetailRow label="Email verified">
                  <Badge variant={shown.verified ? "success" : "warning"} size="sm">
                    {shown.verified ? "Verified" : "Not verified"}
                  </Badge>
                </DetailRow>
              ) : null}
              {shown.lastLogin ? (
                <DetailRow label="Last sign-in">
                  <span className="inline-flex items-center gap-1.5 font-medium text-land-body">
                    <Clock3 size={14} aria-hidden="true" className="shrink-0 text-land-ink/40" />
                    {new Date(shown.lastLogin).toLocaleString("en-IN")}
                  </span>
                </DetailRow>
              ) : null}
            </dl>
          ) : profileError ? (
            <p role="alert" className="text-sm text-land-coral">Unable to load your live profile right now. Please refresh to retry.</p>
          ) : (
            <p className="text-sm text-land-muted">Profile details will be available after your next sign-in.</p>
          )}
        </SettingsSection>

        <SettingsSection
          icon={<Bell size={17} aria-hidden="true" />}
          title="Notifications"
          description="Control how this browser receives LANDLOGY updates."
        >
          <SettingRow
            title="Browser notifications"
            description={pushLabel}
            status={
              permissionBlocked ? (
                <Badge variant="danger" size="sm" dot>Blocked</Badge>
              ) : push.status === "unsupported" ? (
                <Badge variant="neutral" size="sm" dot>Unsupported</Badge>
              ) : permissionGranted ? (
                <Badge variant="success" size="sm" dot>Allowed</Badge>
              ) : (
                <Badge variant="warning" size="sm" dot>Not allowed</Badge>
              )
            }
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={pushDisabled || permissionGranted}
              loading={busy}
              onClick={() => void push.subscribe()}
              leftIcon={<Bell size={15} />}
            >
              {permissionGranted ? "Allowed" : "Allow"}
            </Button>
          </SettingRow>

          <SettingRow
            title="Push notifications"
            description="Delivers LANDLOGY alerts to this device in the background, even when the admin tab is closed."
            status={<Badge variant={push.subscribed ? "info" : "neutral"} size="sm" dot>{push.subscribed ? "On" : "Off"}</Badge>}
          >
            <button
              type="button"
              role="switch"
              aria-checked={push.subscribed}
              aria-label="Push notifications"
              disabled={pushDisabled}
              onClick={() => void togglePush()}
              className="inline-flex min-h-10 items-center gap-2.5 rounded-lg border border-land-border-strong bg-white px-3 text-sm font-semibold text-land-ink transition-colors duration-150 hover:bg-land-stone disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-emerald/25 focus-visible:ring-offset-2"
            >
              <span className="min-w-[3.75rem] text-left">{busy ? "Please wait" : push.subscribed ? "Enabled" : "Disabled"}</span>
              <ToggleSwitch checked={push.subscribed} tone="emerald" />
            </button>
          </SettingRow>

          <SettingRow
            title="Notification sound"
            description="Plays a short chime when a new notification arrives. Enabling it plays the sound once."
            status={<Badge variant={soundEnabled ? "info" : "danger"} size="sm" dot>{soundEnabled ? "On" : "Off"}</Badge>}
          >
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              aria-label="Notification sound"
              onClick={() => void handleSoundToggle()}
              className={`inline-flex min-h-10 items-center gap-2.5 rounded-lg border px-3 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${soundEnabled ? "border-land-blue/30 bg-[#ebf0ff] text-land-blue focus-visible:ring-land-blue/25" : "border-land-coral/30 bg-[#fff1f2] text-land-coral focus-visible:ring-land-coral/25"}`}
            >
              {soundEnabled ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
              <span>Sound {soundEnabled ? "on" : "off"}</span>
              <ToggleSwitch checked={soundEnabled} />
            </button>
          </SettingRow>

          {push.error ? <p role="alert" className="mt-2 text-sm text-land-coral">{push.error}</p> : null}
        </SettingsSection>
      </div>

      <SettingsSection
        icon={<KeyRound size={17} aria-hidden="true" />}
        title="Security"
        description="Rotate your administrator password. Passwords are verified server-side and never logged."
      >
        <form className="grid max-w-xl gap-4" onSubmit={(event) => void submitPassword(event)} noValidate>
          <Input label="Current password" type={show.current ? "text" : "password"} autoComplete="current-password" required value={form.current} onChange={setField("current")} error={errors.current} rightElement={visibilityButton("current")} disabled={saving} />
          <Input label="New password" type={show.next ? "text" : "password"} autoComplete="new-password" required value={form.next} onChange={setField("next")} error={errors.next} hint="At least 8 characters." rightElement={visibilityButton("next")} disabled={saving} />
          <Input label="Confirm new password" type={show.confirm ? "text" : "password"} autoComplete="new-password" required value={form.confirm} onChange={setField("confirm")} error={errors.confirm} rightElement={visibilityButton("confirm")} disabled={saving} />
          {saved ? (
            <p role="status" className="flex items-start gap-2 rounded-lg border border-land-emerald/25 bg-land-amber-lt/60 px-3 py-2 text-sm font-semibold text-land-emerald">
              <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
              {saved}
            </p>
          ) : null}
          {saveError ? <p role="alert" className="rounded-lg border border-land-coral/25 bg-[#fff1f2] px-3 py-2 text-sm font-semibold text-land-coral">{saveError}</p> : null}
          <div>
            <Button type="submit" loading={saving}>Update password</Button>
          </div>
        </form>
      </SettingsSection>

      <Card className="flex min-w-0 flex-col border-land-coral/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-land-ink">Sign out of this device</h2>
            <p className="mt-1 text-sm leading-relaxed text-land-body">
              Ends your administrator session on this browser. Your profile and settings are preserved.
            </p>
          </div>
          <Button variant="danger" onClick={handleLogout} leftIcon={<LogOut size={16} />} className="shrink-0 self-start sm:self-center">
            Log out
          </Button>
        </div>
      </Card>
    </div>
  );
}
