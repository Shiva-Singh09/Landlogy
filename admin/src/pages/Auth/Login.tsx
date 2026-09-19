import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import heroImage from "../../assets/hero.png";
import { BrandLockup } from "../../components/brand/BrandLockup";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError, setAdminProfile, setAuthToken } from "../../services/api/client";
import { loginAdmin } from "../../services/api/authApi";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * LOGIN VISUAL CONFIGURATION — the single place to customize the login.
 * Change the hero image, headline, copy, accent, or transition duration
 * here only; the page below consumes these values.
 * ─────────────────────────────────────────────────────────────────────────
 */
const LOGIN_CONFIG = {
  /** Bundled architectural asset — swap this import (or use a URL string) to rebrand. */
  heroImage,
  /** Fallback gradient shown behind/instead of the image (also if it fails to load). */
  heroFallback: "from-land-ink via-[#241f38] to-land-plum",
  eyebrow: "LANDLOGY ADMIN",
  headline: "Manage your property portfolio with clarity.",
  supportingText:
    "Review listings, respond to enquiries and keep every transaction on course — all in one calm workspace.",
  /** Below the lg breakpoint the visual becomes this compact band height. */
  mobileHeroHeightClass: "h-40",
  /**
   * Exit transition — center-seam "architectural doors" reveal.
   * coverMs: panels fade in over the login screen (login stays visible until covered)
   * openMs:  panels slide from the center seam toward the viewport edges
   * settleMs: seam glow / veil fade out revealing the dashboard
   * Total = coverMs + openMs + settleMs (target 900–1100ms).
   */
  transition: {
    doorOpening: true, // set false (or reduced motion) → simple 120ms handover
    seamGlow: true, // emerald/deep-blue light at the center seam
    coverMs: 200,
    openMs: 660,
    settleMs: 180,
    easing: "cubic-bezier(0.65, 0, 0.35, 1)", // smooth premium, no overshoot
    panelStyle: {
      left: "linear-gradient(100deg, #191724 0%, #221d33 45%, #2a2342 100%)",
      right: "linear-gradient(-100deg, #191724 0%, #221d33 45%, #2a2342 100%)",
    },
  } as {
    doorOpening: boolean;
    seamGlow: boolean;
    coverMs: number;
    openMs: number;
    settleMs: number;
    easing: string;
    panelStyle: { left: string; right: string };
  },
} as const;

type Phase = "idle" | "submitting" | "leaving";
type FieldErrors = { email?: string; password?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Brand lockup shared by the visual panel and the form column. */
function BrandMark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <BrandLockup
      variant="lockup"
      tone={tone}
      className="h-9 w-auto"
      aria-label="LANDLOGY — Real Estate Ecosystem"
    />
  );
}

/**
 * Center-seam "architectural doors" transition.
 *
 * Runs imperatively on overlay nodes appended to document.body so the opening
 * persists across the navigate() to /dashboard — the Dashboard mounts beneath
 * the overlay and is revealed as the panels slide apart. Uses only
 * transform/opacity (WAAPI), no layout-triggering properties, no loop.
 *
 * Sequence (durations from LOGIN_CONFIG.transition):
 *   coverMs   — two panels fade in over the login screen, meeting at the 50% seam
 *   openMs    — left panel translates to the left edge, right to the right edge;
 *               a subtle emerald/deep-blue glow lines the center seam
 *   settleMs  — panels + glow fade out fully over the dashboard
 *
 * Returns a cleanup function that removes the overlay (also used on unmount).
 */
function playDoorTransition(): () => void {
  const t = LOGIN_CONFIG.transition;
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:9999;pointer-events:none;";

  const panelCss = (side: "left" | "right") =>
    `position:absolute;top:0;bottom:0;width:50.15%;${
      side === "left" ? "left:0;" : "right:0;"
    }background:${t.panelStyle[side]};` +
    `box-shadow:0 0 60px rgba(25,23,36,0.5);will-change:transform,opacity;`;

  const left = document.createElement("div");
  left.style.cssText = panelCss("left");
  const right = document.createElement("div");
  right.style.cssText = panelCss("right");

  // Center seam: hairline + soft emerald→deep-blue glow, fade in with the panels.
  const seam = document.createElement("div");
  seam.style.cssText =
    "position:absolute;top:0;bottom:0;left:50%;width:2px;transform:translateX(-50%);" +
    "background:linear-gradient(180deg, rgba(0,168,132,0), rgba(0,168,132,0.85), rgba(56,103,255,0.5), rgba(0,168,132,0));" +
    "box-shadow:0 0 24px 6px rgba(0,168,132,0.35);opacity:0;will-change:opacity;";

  if (t.seamGlow) overlay.append(left, right, seam);
  else overlay.append(left, right);
  document.body.appendChild(overlay);

  const ease = t.easing;
  const cover = left.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: t.coverMs, easing: "ease-out", fill: "forwards" },
  );
  right.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: t.coverMs,
    easing: "ease-out",
    fill: "forwards",
  });
  if (t.seamGlow) {
    seam.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: t.coverMs,
      easing: "ease-out",
      fill: "forwards",
    });
  }

  const open = (el: HTMLElement, to: string) =>
    el.animate([{ transform: "translateX(0)" }, { transform: to }], {
      duration: t.openMs,
      delay: t.coverMs,
      easing: ease,
      fill: "forwards",
    });

  open(left, "translateX(-101%)");
  open(right, "translateX(101%)");
  if (t.seamGlow) {
    // Glow brightens as the doors start to part, then dies out with the settle.
    seam.animate(
      [{ opacity: 1 }, { opacity: 0.9, offset: 0.35 }, { opacity: 0 }],
      {
        duration: t.openMs + t.settleMs,
        delay: t.coverMs,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  }

  // Dashboard underlay: the freshly mounted dashboard starts slightly scaled
  // down and transparent, settling to full as the panels part. Animated on the
  // app root (#root — persists across the route swap) so Dashboard files stay
  // untouched; final state equals the natural state, so no fill is needed.
  const underlay = document.getElementById("root");
  if (underlay) {
    underlay.animate(
      [
        { opacity: 0.4, transform: "scale(0.985)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: t.openMs + t.settleMs, delay: t.coverMs, easing: ease },
    );
  }

  const cleanup = () => {
    overlay.remove();
    cover.cancel();
  };
  window.setTimeout(cleanup, t.coverMs + t.openMs + t.settleMs + 60);
  return cleanup;
}

function Login() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [heroFailed, setHeroFailed] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const submitting = phase !== "idle";

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(email.trim()))
      errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const errors = validate();
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setPhase("submitting");
    try {
      const response = await loginAdmin({ email: email.trim(), password });
      // Admin gate: only administrators may enter the Admin workspace.
      if (response.user.role !== "admin") {
        setFormError("This account does not have administrator access.");
        setPhase("idle");
        return;
      }
      setAuthToken(response.token);
      setAdminProfile(response.user);
      // Success — run the center-seam "doors" reveal, then hand over to the
      // dashboard partway through the opening so it mounts beneath the panels
      // (no blank frame, no flicker).
      setPhase("leaving");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const t = LOGIN_CONFIG.transition;
      // The panels fully cover the screen at coverMs; navigate right after so
      // the dashboard mounts beneath the opaque doors (no flicker) and is
      // revealed as they part from the center seam. Reduced motion / doors
      // disabled → immediate short handover, no overlay.
      const useDoors = t.doorOpening && !reduced;
      const handoverMs = useDoors ? t.coverMs + 30 : 120;
      if (useDoors) playDoorTransition();
      window.setTimeout(() => navigate("/dashboard", { replace: true }), handoverMs);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setFormError("Incorrect email or password.");
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Unable to sign in right now. Please try again.");
      }
      setPhase("idle");
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-land-stone font-sans text-land-ink">
      <div
        aria-busy={submitting || undefined}
        className="relative z-10 grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[1.05fr_1fr] lg:grid-rows-none"
      >
        {/* ── Visual panel ─────────────────────────────────────────── */}
        <section
          aria-hidden="true"
          className={`relative overflow-hidden bg-gradient-to-br ${LOGIN_CONFIG.heroFallback} ${LOGIN_CONFIG.mobileHeroHeightClass} lg:h-auto lg:min-h-dvh`}
        >
          {!heroFailed ? (
            <img
              src={LOGIN_CONFIG.heroImage}
              alt=""
              onError={() => setHeroFailed(true)}
              className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
            />
          ) : null}
          {/* Readability scrim — keeps the image from dominating the text */}
          <div className="absolute inset-0 bg-gradient-to-tr from-land-ink/85 via-land-ink/45 to-land-plum/40" />
          <div className="absolute inset-0 hidden flex-col justify-between p-10 lg:flex xl:p-14">
            <BrandMark />
            <div className="max-w-md">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-land-emerald">
                {LOGIN_CONFIG.eyebrow}
              </p>
              <h2 className="mt-4 font-display text-[32px] leading-[1.2] text-white xl:text-4xl">
                {LOGIN_CONFIG.headline}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/70">
                {LOGIN_CONFIG.supportingText}
              </p>
              <span className="mt-8 block h-px w-16 bg-land-emerald/70" />
            </div>
            <p className="text-xs text-white/45">
              Premium real-estate administration
            </p>
          </div>
          {/* Compact mobile/tablet band content */}
          <div className="absolute inset-0 flex items-center justify-between px-6 py-6 lg:hidden">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-land-emerald">
                {LOGIN_CONFIG.eyebrow}
              </p>
              <p className="mt-1.5 max-w-[16rem] font-display text-lg leading-snug text-white">
                Property administration workspace
              </p>
            </div>
            <BrandMark />
          </div>
        </section>

        {/* ── Form panel ───────────────────────────────────────────── */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:py-12">
          <div className="w-full max-w-[26rem]">
            <p className="font-display text-2xl text-land-ink sm:text-[28px]">
              Welcome back
            </p>
            <p className="mt-1.5 text-sm text-land-ink/55">
              Sign in to your LANDLOGY Admin account.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
              <Input
                ref={emailRef}
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="admin@landlogy.com"
                required
                leftIcon={<Mail size={17} />}
                error={fieldErrors.email}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email)
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                disabled={submitting}
              />

              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                leftIcon={<Lock size={17} />}
                error={fieldErrors.password}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password)
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                disabled={submitting}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="-mr-1.5 flex h-10 w-10 items-center justify-center rounded-lg text-land-ink/45 transition-colors hover:bg-land-stone hover:text-land-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-plum/40"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />

              {/* Sanitized auth errors — announced politely to screen readers */}
              <div aria-live="polite">
                {formError ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-land-coral/25 bg-land-coral/10 px-3.5 py-2.5 text-sm font-medium text-[color-mix(in_srgb,var(--color-land-coral)_65%,var(--color-land-ink))]"
                  >
                    {formError}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                fullWidth
                loading={phase === "submitting"}
                disabled={phase !== "idle"}
                leftIcon={phase === "leaving" ? <Check size={16} /> : undefined}
              >
                {phase === "leaving" ? "Welcome back" : "Sign In"}
              </Button>

              <p className="pt-1 text-center text-xs text-land-ink/40">
                Protected workspace — authorized administrators only.
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Login;
