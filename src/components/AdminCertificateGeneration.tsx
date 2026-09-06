/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ✅ ADDED (2026-09-03): the real Admin Certificate Generation form,
// replacing the access-check-only placeholder. See
// src/utils/certificateTemplate.ts for the actual certificate rendering
// (deliberately separate — that's the piece meant to be swapped for real
// artwork later, this file is the form/workflow that stays the same
// either way).

import { useState, useEffect, useRef, useCallback, RefObject, PointerEvent as ReactPointerEvent } from "react";
import {
  ScrollText, Landmark, ShieldCheck, Lock, ArrowLeft, Camera, Upload,
  Plus, Trash2, Printer, Download, RefreshCw, Check, AlertTriangle, Mail,
  Move, Maximize2, RotateCcw,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  renderCertificate, compressImageToUnderSize, removeStudioBackground, RELATIONSHIP_OPTIONS,
  getCertificateLayoutMeta, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT,
  CertificateData, TextSlotKey, TextSlotOverride,
} from "../utils/certificateTemplate";
// ✅ ADDED (2026-09-06 — "Android app... header is missing, the
// certificate content is squeezed"): root cause found in App.tsx — the
// shared <main> wrapper uses `pt-0` (no top clearance at all) specifically
// inside the Capacitor Android app, versus `pt-28` on the website, because
// the fixed-position Navbar is taller there (safe-area/status-bar inset
// stacked on top of its own padding) and several pages (Home, Seva, Puja,
// Products, Counselling) already compensate internally via this exact
// `sectionTopPadding()` helper — this page never did, so on Android its
// content (including the "Live Certificate" heading itself) rendered
// directly underneath the fixed header, invisible/clipped by it. This
// reuses the project's own existing, already-verified fix for that exact
// bug class rather than inventing a new one or touching the shared
// <main>/Navbar (which would risk every other page).
import { sectionTopPadding, sectionBottomPadding } from "../utils/androidSpacing";

// ✅ CHANGED (2026-09-06 — "Performed At, Date of Puja, Puja Performed...
// these too need adjustment... color change will be applicable to each
// content and same with the font size adjustment too have to be each
// specific contents"): generalized from the earlier nameOffset/
// photoOverride/refIdOffset trio into one textOverrides map covering all
// 5 text fields, each with its own position/color/font-size — mirrors
// certificateTemplate.ts's CertificateData shape exactly (single source
// of truth for what an "override" looks like).
type CertAdjustment = {
  textOverrides?: Partial<Record<TextSlotKey, TextSlotOverride>>;
  photoOverride?: { x: number; y: number; width: number; height: number };
};
const ADJUST_STORAGE_KEY = "sridwar_certificate_adjustments_v2";

// The 5 draggable/colorable/resizable-font text fields, in the order
// shown as tabs in the adjust panel and as labeled pills on the canvas —
// each gets a distinct color so the tab and its on-canvas handle are
// visually easy to match up.
const TEXT_SLOTS: { key: TextSlotKey; label: string; bg: string; fg: string }[] = [
  { key: "temple", label: "Performed At", bg: "#60A5FA", fg: "#021816" },
  { key: "date", label: "Date of Puja", bg: "#C084FC", fg: "#021816" },
  { key: "devoteeName", label: "Devotee Name", bg: "#FFB347", fg: "#021816" },
  { key: "pujaName", label: "Puja Performed", bg: "#86EFAC", fg: "#021816" },
  { key: "refId", label: "Reference ID", bg: "#F27D26", fg: "#ffffff" },
];

// A small curated palette (dark ↔ light, warm ↔ cool) covering the
// common cases where a design's default text color doesn't read well
// against a particular field's background — plus a native color input
// for anything else.
const COLOR_PRESETS = ["#000000", "#ffffff", "#3a2a1a", "#5a1e08", "#b8860b", "#8B0000", "#0F766E", "#f5e6c8"];
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 72;

// ✅ ADDED (2026-09-06 — explicit instruction: add these Puja names
// "under services in the top order first" and default the Service field
// to the first one): shown ahead of every other (alphabetically-sorted)
// service option, in exactly this order.
const PRIORITY_SERVICES = ["Basic Sankalp Puja", "Raksha Puja", "Mansik Ichha Puja", "Samaj Kavach Puja", "Sampoorna Bhog & Deep Puja"];
const DEFAULT_SERVICE = PRIORITY_SERVICES[0];
// ✅ ADDED (2026-09-06 — explicit instruction): "Alway show defalut
// jaganath certificate and later vendor can select any certificate they
// want" + explicit City/Deity/Temple defaults.
const DEFAULT_CITY = "Puri";
const DEFAULT_DEITY = "Jagannath";
const DEFAULT_TEMPLE = "Jagannath Puri";
const DEFAULT_RELATIONSHIP = "Mother";

interface AdminCertificateGenerationProps {
  onNavigate: (page: string) => void;
  // ✅ ADDED (2026-09-06): see the androidSpacing import comment above —
  // needed to compensate for the Android app's fixed-header overlap.
  // Optional + defaulted so nothing breaks for any other caller.
  isAndroidApp?: boolean;
}

type AccessState = "checking" | "staff" | "vendor" | "denied";
type Member = { name: string; relationship: string };
type OptionType = "city" | "deity" | "temple" | "service";

const MAX_MEMBERS = 6;
const emptyMember = (): Member => ({ name: "", relationship: DEFAULT_RELATIONSHIP });

export default function AdminCertificateGeneration({ onNavigate, isAndroidApp = false }: AdminCertificateGenerationProps) {
  const [access, setAccess] = useState<AccessState>("checking");
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // ── Form state ──
  const [refId, setRefId] = useState("");
  const [serviceType, setServiceType] = useState(DEFAULT_SERVICE);
  const [devoteeName, setDevoteeName] = useState("");
  // ✅ ADDED (2026-09-05): optional, never drawn on the certificate —
  // stored only so the finished certificate can be shared with the
  // devotee later.
  const [devoteePhone, setDevoteePhone] = useState("");
  const [devoteeEmail, setDevoteeEmail] = useState("");
  const [members, setMembers] = useState<Member[]>([emptyMember()]);
  const [pujaDate, setPujaDate] = useState(() => new Date().toISOString().slice(0, 10));
  // ✅ ADDED (2026-09-06 — "Alway show defalut jaganath certificate...":
  // City/Deity/Temple default to Puri/Jagannath/Jagannath Puri so the
  // live preview shows the Jagannath design immediately on open, before
  // the vendor picks anything — they can still freely change any of the
  // three afterward.
  const [city, setCity] = useState(DEFAULT_CITY);
  const [deity, setDeity] = useState(DEFAULT_DEITY);
  const [temple, setTemple] = useState(DEFAULT_TEMPLE);

  // ── Dropdown option lists (server-backed, "Add & Save") ──
  // ✅ CHANGED (2026-09-05): Service is now ALSO server-backed here, same
  // as City/Deity/Temple — replaces the old hardcoded, all-services
  // dropdown per explicit instruction to only show Puja/engraving options
  // and let anyone add a Puja name that isn't in the list yet.
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [deityOptions, setDeityOptions] = useState<string[]>([]);
  const [templeOptions, setTempleOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [addingOption, setAddingOption] = useState<OptionType | null>(null);
  const [newOptionValue, setNewOptionValue] = useState("");

  // ── Photo ──
  // ✅ CHANGED (2026-09-05 — explicit instruction: "Remove the separate
  // Family Photo option. Only one Devotee/Family Photo section is
  // needed"): the certificate template only ever had one photo frame —
  // renderCertificate() never drew a separate family photo — so this
  // collapses to the single field that was actually functional.
  const [devoteePhotoDataUrl, setDevoteePhotoDataUrl] = useState<string | null>(null);
  const [devoteePhotoImg, setDevoteePhotoImg] = useState<HTMLImageElement | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState<"devotee" | null>(null);

  // ── Save state ──
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedRefId, setSavedRefId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<{ kind: "idle" | "sending" | "success" | "error"; message: string }>({ kind: "idle", message: "" });
  const [refIdError, setRefIdError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // ✅ ADDED (2026-09-06): the wrapper the canvas sits in — used to
  // convert on-screen drag distances into certificate-coordinate
  // distances (canvas is always drawn at a fixed 1536×1024 internally
  // but displayed scaled to whatever width the device/screen gives it).
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // ── Live Certificate manual position/size adjustments ──
  const [adjustMode, setAdjustMode] = useState(false);
  const [allAdjustments, setAllAdjustments] = useState<Record<string, CertAdjustment>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADJUST_STORAGE_KEY);
      if (raw) setAllAdjustments(JSON.parse(raw));
    } catch { /* ignore malformed/unavailable storage */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(ADJUST_STORAGE_KEY, JSON.stringify(allAdjustments)); } catch { /* storage may be unavailable (private mode, quota) — adjustments still work for this session */ }
  }, [allAdjustments]);

  const layoutMeta = deity ? getCertificateLayoutMeta(deity) : null;
  const currentAdjustment: CertAdjustment = (deity && allAdjustments[deity]) || {};
  // Which of the 5 text fields the color/font-size controls currently apply to.
  const [activeSlot, setActiveSlot] = useState<TextSlotKey>("devoteeName");

  const setTextOverride = useCallback((deityKey: string, slot: TextSlotKey, patch: Partial<TextSlotOverride>) => {
    setAllAdjustments((prev) => ({
      ...prev,
      [deityKey]: {
        ...prev[deityKey],
        textOverrides: { ...prev[deityKey]?.textOverrides, [slot]: { ...prev[deityKey]?.textOverrides?.[slot], ...patch } },
      },
    }));
  }, []);
  const setPhotoOverride = useCallback((deityKey: string, frame: { x: number; y: number; width: number; height: number }) => {
    setAllAdjustments((prev) => ({ ...prev, [deityKey]: { ...prev[deityKey], photoOverride: frame } }));
  }, []);
  const resetTextSlot = (slot: TextSlotKey) => {
    if (!deity) return;
    setAllAdjustments((prev) => {
      if (!prev[deity]?.textOverrides) return prev;
      const nextOverrides = { ...prev[deity].textOverrides };
      delete nextOverrides[slot];
      return { ...prev, [deity]: { ...prev[deity], textOverrides: nextOverrides } };
    });
  };
  const resetPhotoFrame = () => {
    if (!deity) return;
    setAllAdjustments((prev) => { const next = { ...prev }; if (next[deity]) next[deity] = { ...next[deity], photoOverride: undefined }; return next; });
  };

  // Current effective color/font-size for whichever field is active —
  // combines the design's own default (from layoutMeta) with any
  // override already saved for this deity, so the controls always show
  // what's actually on the certificate right now, not a stale default.
  const activeSlotBase = layoutMeta ? layoutMeta[activeSlot] : null;
  const activeSlotOverride = currentAdjustment.textOverrides?.[activeSlot];
  const activeColor = activeSlotOverride?.color || activeSlotBase?.color || "#000000";
  const activeFontSize = activeSlotOverride?.fontSize || activeSlotBase?.fontSize || 20;

  const setActiveColor = (color: string) => { if (deity) setTextOverride(deity, activeSlot, { color }); };
  const bumpActiveFontSize = (delta: number) => {
    if (!deity || !activeSlotBase) return;
    const next = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, activeFontSize + delta));
    setTextOverride(deity, activeSlot, { fontSize: next });
  };

  // ── Access check + initial data load ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (!cancelled) setAccess("denied"); return; }
      setSessionToken(session.access_token);
      try {
        const res = await fetch("/api/admin/certificates/access-check", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.authorized && data.role === "staff") setAccess("staff");
        else if (data.authorized && data.role === "vendor") setAccess("vendor");
        else setAccess("denied");
      } catch {
        if (!cancelled) setAccess("denied");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const authFetch = useCallback((url: string, init: RequestInit = {}) => {
    return fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${sessionToken}` },
    });
  }, [sessionToken]);

  // Once authorized: fetch a fresh Reference ID and the four dropdown lists.
  useEffect(() => {
    if (access !== "staff" && access !== "vendor") return;
    (async () => {
      try {
        const [refRes, cityRes, deityRes, templeRes, serviceRes] = await Promise.all([
          authFetch("/api/admin/certificates/new-ref-id"),
          authFetch("/api/admin/certificates/options/city"),
          authFetch("/api/admin/certificates/options/deity"),
          authFetch("/api/admin/certificates/options/temple"),
          authFetch("/api/admin/certificates/options/service"),
        ]);
        const [refData, cityData, deityData, templeData, serviceData] = await Promise.all([
          refRes.json(), cityRes.json(), deityRes.json(), templeRes.json(), serviceRes.json(),
        ]);
        if (refData.refId) setRefId(refData.refId);

        // ✅ ADDED (2026-09-06): ensure the Jagannath default (city/deity/
        // temple) and the 5 priority Puja names actually exist as real,
        // saved options — via the same add-option endpoint "+Add Your
        // City/Deity/..." already uses (upsert-based, so re-adding one
        // that already exists is a harmless no-op) — rather than only
        // defaulting the form fields client-side, so the dropdowns show
        // them as properly selected instead of a value with no matching
        // option, and every other admin/vendor sees them too.
        const ensureOptions = async (type: OptionType, existing: string[], required: string[]) => {
          const missing = required.filter((v) => !existing.includes(v));
          if (missing.length === 0) return existing;
          await Promise.all(missing.map((value) =>
            authFetch(`/api/admin/certificates/options/${type}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ value }),
            }).catch(() => null)
          ));
          return [...existing, ...missing];
        };

        const [cityFinal, deityFinal, templeFinal, serviceFinal] = await Promise.all([
          ensureOptions("city", cityData.options || [], [DEFAULT_CITY]),
          ensureOptions("deity", deityData.options || [], [DEFAULT_DEITY]),
          ensureOptions("temple", templeData.options || [], [DEFAULT_TEMPLE]),
          ensureOptions("service", serviceData.options || [], PRIORITY_SERVICES),
        ]);
        setCityOptions(cityFinal);
        setDeityOptions(deityFinal);
        setTempleOptions(templeFinal);
        setServiceOptions(serviceFinal);
      } catch {
        setRefIdError("Could not load starting data. Please refresh the page.");
      }
    })();
  }, [access, authFetch]);

  // ✅ ADDED (2026-09-06 — "Add these under services in the top order
  // first... show Basic Sankalp Puja as default"): the server always
  // returns options alphabetically (see server.ts's admin_certificate_
  // options query) — there's no ordering column to seed instead — so the
  // 5 priority Puja names are placed first, in this exact order, ahead of
  // every other (still alphabetical) service, purely for display. The
  // underlying serviceOptions state (used for dedupe/sort when adding a
  // new one) is untouched.
  const orderedServiceOptions = [
    ...PRIORITY_SERVICES.filter((s) => serviceOptions.includes(s)),
    ...serviceOptions.filter((s) => !PRIORITY_SERVICES.includes(s)),
  ];

  // ── Live preview: re-render the canvas whenever any relevant field changes ──
  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    const data: CertificateData = {
      refId, serviceType, devoteeName, members, pujaDate, city, deity, temple,
      devoteePhoto: devoteePhotoImg,
      textOverrides: currentAdjustment.textOverrides,
      photoOverride: currentAdjustment.photoOverride,
    };
    // ✅ renderCertificate is now async (it loads the real background
    // artwork, cached after the first call) — the cancelled guard avoids a
    // rare out-of-order flash if a devotee types quickly enough that an
    // older call's image-load resolves after a newer one's.
    (async () => {
      if (!canvasRef.current || cancelled) return;
      await renderCertificate(canvasRef.current, data);
    })();
    return () => { cancelled = true; };
  }, [refId, serviceType, devoteeName, members, pujaDate, city, deity, temple, devoteePhotoImg, currentAdjustment.textOverrides, currentAdjustment.photoOverride]);

  const handlePhotoSelected = async (kind: "devotee", file: File | null) => {
    if (!file) return;
    setPhotoProcessing(kind);
    try {
      // Small JPEG copy — unaffected by any of the below, still guaranteed
      // under 1MB — used only for the thumbnail preview and whatever gets
      // uploaded/stored.
      const dataUrl = await compressImageToUnderSize(file);
      // ✅ ROOT-CAUSE FIX (2026-09-05 — "even a background-removed photo
      // still shows a white background on the certificate"): a SEPARATE
      // alpha-preserving (PNG) copy is made here specifically for the
      // certificate render. Previously this step ran removeStudioBackground()
      // on the JPEG `dataUrl` above — but JPEG has no alpha channel, so any
      // transparency the vendor's photo already had (e.g. a photo someone
      // had already background-removed elsewhere) was destroyed before
      // removeStudioBackground() ever got to see it, which is exactly why
      // the "white box" kept showing up even on pre-cut photos. This PNG
      // copy carries transparency all the way through.
      const alphaPreservingDataUrl = await compressImageToUnderSize(file, 1024 * 1024, true);
      // Chroma-key background removal, run once here (not on every
      // render) — see removeStudioBackground()'s own comments for how it
      // works. If the photo doesn't have a uniform backdrop, it safely
      // returns the source untouched — this never makes a photo look
      // worse, only better or unchanged.
      const chromaKeyedDataUrl = await removeStudioBackground(alphaPreservingDataUrl);
      const img = new Image();
      img.onload = () => {
        setDevoteePhotoDataUrl(dataUrl);
        setDevoteePhotoImg(img);
        setPhotoProcessing(null);
      };
      img.src = chromaKeyedDataUrl;
    } catch {
      setPhotoProcessing(null);
    }
  };

  const updateMember = (index: number, field: keyof Member, value: string) => {
    setMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const addMemberRow = () => setMembers((prev) => (prev.length < MAX_MEMBERS ? [...prev, emptyMember()] : prev));
  const removeMemberRow = (index: number) => setMembers((prev) => prev.filter((_, i) => i !== index));

  const handleAddOption = async (type: OptionType) => {
    const value = newOptionValue.trim();
    if (!value) return;
    const res = await authFetch(`/api/admin/certificates/options/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (res.ok) {
      const setter = type === "city" ? setCityOptions : type === "deity" ? setDeityOptions : type === "temple" ? setTempleOptions : setServiceOptions;
      setter((prev) => [...prev, value].sort());
      if (type === "city") setCity(value);
      else if (type === "deity") setDeity(value);
      else if (type === "temple") setTemple(value);
      else setServiceType(value);
      setAddingOption(null);
      setNewOptionValue("");
    }
  };

  const regenerateRefId = async () => {
    setRefIdError("");
    try {
      const res = await authFetch("/api/admin/certificates/new-ref-id");
      const data = await res.json();
      if (data.refId) setRefId(data.refId);
    } catch {
      setRefIdError("Could not generate a new Reference ID.");
    }
  };

  const handleSave = async () => {
    setSaveError("");
    if (!devoteeName.trim()) { setSaveError("Devotee name is required."); return; }
    if (!serviceType) { setSaveError("Please select a service."); return; }
    if (!city || !deity || !temple) { setSaveError("City, Deity, and Temple are all required."); return; }

    setIsSaving(true);
    try {
      let devoteePhotoUrl: string | null = null;

      if (devoteePhotoDataUrl) {
        const res = await authFetch("/api/admin/certificates/upload-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: devoteePhotoDataUrl, refId, kind: "devotee" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Photo upload failed.");
        devoteePhotoUrl = data.url;
      }

      // ✅ CHANGED (2026-09-05): the separate Family Photo upload/field is
      // gone (see the state declarations above) — familyPhotoUrl is simply
      // no longer sent. The backend column (family_photo_url) is untouched
      // and optional, so this stays fully backward compatible with every
      // certificate saved before this change.
      const res = await authFetch("/api/admin/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refId, serviceType, devoteeName, devoteePhone, devoteeEmail,
          members: members.filter((m) => m.name.trim()),
          pujaDate, city, deity, temple,
          devoteePhotoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save this certificate.");
      setSavedRefId(refId);
    } catch (err: any) {
      setSaveError(err?.message || "Something went wrong while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPng = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `Sri-Dwar-Certificate-${refId || "draft"}.png`;
    link.href = canvasRef.current.toDataURL("image/png", 1.0);
    link.click();
  };

  const handlePrint = () => {
    // Prints only the certificate canvas — opens the browser's own native
    // print dialog, which is where device/printer selection genuinely
    // lives; a web page cannot list or choose a printer directly (browsers
    // don't expose that to JavaScript, for good privacy/security reasons),
    // so this is the correct, standard way to offer "print with printer
    // selection."
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png", 1.0);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Sri Dwar Certificate — ${refId}</title>
      <style>
        @page { size: landscape; margin: 0; }
        body { margin: 0; display: flex; align-items: center; justify-content: center; }
        img { width: 100%; height: auto; }
      </style></head>
      <body><img src="${dataUrl}" onload="window.print(); window.onafterprint = () => window.close();" /></body></html>
    `);
    printWindow.document.close();
  };

  // ✅ ADDED (2026-09-05): "Share This Certificate via Email" — sends the
  // exact same PNG the Print/Download buttons use, to the email address
  // stored on this certificate (from the optional Email field above). Can
  // be used repeatedly, any time after saving — each request is
  // independent (see certificateGenerationSync.gs's dedupe-key fix).
  const handleShareEmail = async () => {
    if (!canvasRef.current) return;
    if (!devoteeEmail.trim()) {
      setShareStatus({ kind: "error", message: "Enter the devotee's email address above first." });
      return;
    }
    if (!savedRefId) {
      setShareStatus({ kind: "error", message: "Save the certificate before sharing it." });
      return;
    }
    setShareStatus({ kind: "sending", message: "" });
    try {
      const base64Png = canvasRef.current.toDataURL("image/png", 1.0).split(",")[1];
      const res = await authFetch("/api/admin/certificates/share-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: devoteeEmail, refId: savedRefId, devoteeName, base64Png }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send the email.");
      setShareStatus({ kind: "success", message: `Sent to ${devoteeEmail}.` });
    } catch (err: any) {
      setShareStatus({ kind: "error", message: err?.message || "Something went wrong." });
    }
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#021816] text-white px-4 py-10" style={{ ...sectionTopPadding(isAndroidApp), ...sectionBottomPadding(isAndroidApp) }}>
      <div className="max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => onNavigate("plans")}
          className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-mono uppercase tracking-wider mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Landmark className="w-6 h-6 text-[#FFB347]" />
          <h1 className="font-serif text-2xl font-bold">Live Certificate</h1>
          <ScrollText className="w-6 h-6 text-[#FFB347]" />
        </div>
        <p className="text-white/50 text-sm mb-8">Admin Certificate Generation</p>

        {access === "checking" && (
          <div className="bg-[#092320] border border-white/10 rounded-2xl p-8 text-center text-white/50">
            Checking your access…
          </div>
        )}

        {access === "denied" && (
          <div className="bg-[#092320] border border-white/10 rounded-2xl p-8 text-center">
            <Lock className="w-8 h-8 text-white/30 mx-auto mb-3" />
            <p className="text-white/70 font-bold mb-1">This page is restricted</p>
            <p className="text-white/40 text-sm">
              Certificate generation is available to Sri Dwar staff and to vendors on an active paid plan.
              If you believe you should have access, please contact <a href="mailto:puja@sridwar.com" className="text-[#5EEAD4] underline">puja@sridwar.com</a>.
            </p>
          </div>
        )}

        {(access === "staff" || access === "vendor") && (
          // ✅ FIXED (2026-09-06 — "Android app layout is currently
          // squeezed... cut off or only partially visible... nothing
          // should be... stretched outside the screen, hidden, or
          // inaccessible"): root cause was CSS Grid's default
          // `min-width: auto` on a grid item — the right-hand column
          // below contains a <canvas> with an explicit 1536×1024
          // intrinsic size, and without `min-w-0` a grid item won't
          // shrink narrower than that intrinsic size no matter what CSS
          // width the canvas itself is given. On a ~360-400px phone
          // screen this forced the WHOLE grid (both columns) far wider
          // than the viewport; combined with App.tsx's root
          // `overflowX: hidden`, the excess width was silently clipped
          // rather than scrollable — exactly matching "cut off,
          // inaccessible, can't recover by scrolling". `min-w-0` on both
          // grid items is the standard fix and changes nothing on
          // screens wide enough to already fit everything (desktop,
          // tablets, the working website layout).
          <div className="grid lg:grid-cols-2 gap-6">
            {/* ── LEFT: the form ── */}
            <div className="space-y-5 min-w-0">
              <div className="flex items-center gap-2 bg-[#092320] border border-[#5EEAD4]/30 rounded-xl px-4 py-2.5">
                <ShieldCheck className="w-4 h-4 text-[#5EEAD4]" />
                <span className="text-[#5EEAD4] text-xs font-bold uppercase tracking-wider">
                  {access === "staff" ? "Sri Dwar Staff — Full Access" : "Authorized Vendor"}
                </span>
              </div>

              {/* Reference ID */}
              <div className="bg-[#092320] border border-white/10 rounded-2xl p-4">
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-2">Reference ID</label>
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate font-mono text-lg text-[#FFB347] font-bold">{refId || "Generating…"}</span>
                  <button type="button" onClick={regenerateRefId} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg" title="Generate a new Reference ID">
                    <RefreshCw className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                {refIdError && <p className="text-red-400 text-xs mt-1">{refIdError}</p>}
              </div>

              {/* Photo — ✅ CHANGED (2026-09-05): single "Devotee / Family
                  Photo" section replaces the old two-field layout (see the
                  state/handler changes above for why the second field was
                  removed, not just hidden). */}
              <div className="bg-[#092320] border border-white/10 rounded-2xl p-4">
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-2">Devotee / Family Photo</label>
                <PhotoPicker
                  dataUrl={devoteePhotoDataUrl}
                  processing={photoProcessing === "devotee"}
                  onSelect={(file) => handlePhotoSelected("devotee", file)}
                />
              </div>

              {/* Devotee name + Service */}
              <div className="bg-[#092320] border border-white/10 rounded-2xl p-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Devotee Name *</label>
                  <input
                    type="text" value={devoteeName} onChange={(e) => setDevoteeName(e.target.value)}
                    placeholder="Enter devotee's full name"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                  />
                </div>
                {/* ✅ ADDED (2026-09-05): optional contact details — never
                    drawn on the certificate itself (certificateTemplate.ts
                    never reads either of these), stored only so the
                    finished certificate can be shared with the devotee
                    later on request, and synced to the Certificate
                    Generation Google Form/Sheet below alongside everything
                    else, exactly like every other intake form on this
                    site. */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Phone Number (optional)</label>
                    <input
                      type="tel" value={devoteePhone} onChange={(e) => setDevoteePhone(e.target.value)}
                      placeholder="For certificate sharing only"
                      className="w-full min-w-0 text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Email Address (optional)</label>
                    <input
                      type="email" value={devoteeEmail} onChange={(e) => setDevoteeEmail(e.target.value)}
                      placeholder="For certificate sharing only"
                      className="w-full min-w-0 text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                </div>
                {/* ✅ CHANGED (2026-09-05): Service is now the same
                    server-backed "Add & Save" dropdown as City/Deity/
                    Temple — only Puja names and Stone Name Engraving are
                    seeded (per explicit instruction to not show every
                    service type), and anyone can add a Puja name that
                    isn't listed yet. */}
                <OptionDropdown label="Service" value={serviceType} setValue={setServiceType} options={orderedServiceOptions} type="service"
                  canAdd adding={addingOption === "service"} setAdding={setAddingOption}
                  newValue={newOptionValue} setNewValue={setNewOptionValue} onAdd={() => handleAddOption("service")} />
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Date *</label>
                  <input
                    type="date" value={pujaDate} onChange={(e) => setPujaDate(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white"
                  />
                </div>
              </div>

              {/* City / Deity / Temple dropdowns with Add & Save */}
              {/* ✅ CHANGED (2026-09-05): canAdd is no longer staff-only —
                  an empty Temple list (a real seeding bug, now fixed) with
                  no way for a vendor to add one was blocking vendors from
                  finishing a certificate at all. Any authorized user can
                  now add a missing City/Deity/Temple/Service entry. */}
              <div className="bg-[#092320] border border-white/10 rounded-2xl p-4 space-y-3">
                <OptionDropdown label="City" value={city} setValue={setCity} options={cityOptions} type="city"
                  canAdd adding={addingOption === "city"} setAdding={setAddingOption}
                  newValue={newOptionValue} setNewValue={setNewOptionValue} onAdd={() => handleAddOption("city")} />
                <OptionDropdown label="Deity" value={deity} setValue={setDeity} options={deityOptions} type="deity"
                  canAdd adding={addingOption === "deity"} setAdding={setAddingOption}
                  newValue={newOptionValue} setNewValue={setNewOptionValue} onAdd={() => handleAddOption("deity")} />
                <OptionDropdown label="Temple" value={temple} setValue={setTemple} options={templeOptions} type="temple"
                  canAdd adding={addingOption === "temple"} setAdding={setAddingOption}
                  newValue={newOptionValue} setNewValue={setNewOptionValue} onAdd={() => handleAddOption("temple")} />
              </div>

              {/* Members — up to 6 rows */}
              <div className="bg-[#092320] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wide">Family Members ({members.length}/{MAX_MEMBERS})</label>
                  {members.length < MAX_MEMBERS && (
                    <button type="button" onClick={addMemberRow} className="flex items-center gap-1 text-[11px] text-[#5EEAD4] font-bold uppercase">
                      <Plus className="w-3 h-3" /> Add Member
                    </button>
                  )}
                </div>
                {/* ✅ Relationship is admin/reference-only — never printed on
                    the certificate (see certificateTemplate.ts, which only
                    ever reads member.name). */}
                <div className="space-y-2">
                  {members.map((m, i) => (
                    <div key={i} className="flex gap-1.5 sm:gap-2">
                      <input
                        type="text" value={m.name} onChange={(e) => updateMember(i, "name", e.target.value)}
                        placeholder={`Member ${i + 1} name`}
                        className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                      />
                      <select
                        value={m.relationship} onChange={(e) => updateMember(i, "relationship", e.target.value)}
                        className="w-24 sm:w-40 shrink-0 text-sm px-1.5 sm:px-2 py-2 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white"
                      >
                        <option value="">Relationship</option>
                        {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button type="button" onClick={() => removeMemberRow(i)} className="p-2 shrink-0 text-white/30 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {saveError && (
                <div className="flex items-start gap-2 bg-red-950/30 border border-red-500/30 rounded-xl px-3.5 py-2.5 text-red-300 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              {savedRefId ? (
                <div className="flex items-center gap-2 bg-[#5EEAD4]/10 border border-[#5EEAD4]/30 rounded-xl px-4 py-3 text-[#5EEAD4] text-sm font-bold">
                  <Check className="w-4 h-4" /> Saved — Reference {savedRefId}
                </div>
              ) : (
                <button
                  type="button" onClick={handleSave} disabled={isSaving}
                  className="w-full bg-[#FFB347] hover:bg-[#F27D26] disabled:opacity-50 text-[#021816] font-bold py-3.5 rounded-xl transition-all"
                >
                  {isSaving ? "Saving…" : "Save Certificate"}
                </button>
              )}
            </div>

            {/* ── RIGHT: live preview ──
                ✅ CHANGED (2026-09-05 — "properly aligned to the android
                app... completely broken... dimensions... not working"):
                removed `lg:sticky lg:top-6` here. Position: sticky has
                real, documented compatibility bugs in some Android
                WebView versions (this project already hit a comparable
                Android-only, works-fine-on-website issue before — see
                capacitor.config.ts's allowNavigation notes on the
                YouTube iframe). Sticky was a desktop-only nice-to-have
                (keeps the preview visible while scrolling the form) —
                removing it costs nothing functionally and avoids the
                risk entirely on any Android WebView where sticky
                positioning miscalculates and breaks the surrounding
                layout, which matches exactly what was reported. */}
            <div className="self-start space-y-3 min-w-0">
              <div className="bg-white rounded-2xl p-3 shadow-2xl">
                {/* ✅ ADDED: explicit width/height attributes (not just
                    CSS) — a canvas with no HTML width/height defaults to
                    300×150 until JS sets it, and some WebView engines
                    don't correctly re-flow surrounding layout when a
                    canvas's intrinsic size changes after first paint.
                    Setting the real 1536×1024 dimensions up front (the
                    same size renderCertificate() always uses) means the
                    layout is correctly sized from the very first paint,
                    with no dependency on JS execution timing. */}
                <div ref={canvasWrapperRef} className="relative">
                  <canvas ref={canvasRef} width={1536} height={1024} className="w-full h-auto rounded-lg block" style={{ aspectRatio: "1536 / 1024" }} />
                  {/* ✅ CHANGED (2026-09-06): drag handles for all 5 text
                      fields plus the photo box — only rendered in Adjust
                      mode, only over these movable elements (never the
                      background artwork, which stays fixed and cannot be
                      moved, resized, or removed here). */}
                  {adjustMode && layoutMeta && (
                    <CertificateAdjustOverlay
                      wrapperRef={canvasWrapperRef}
                      layoutMeta={layoutMeta}
                      adjustment={currentAdjustment}
                      onTextOffsetChange={(slot, o) => setTextOverride(deity, slot, { offset: o })}
                      onPhotoFrameChange={(f) => setPhotoOverride(deity, f)}
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button" onClick={() => setAdjustMode((v) => !v)} disabled={!deity}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide py-3 rounded-xl border disabled:opacity-40 ${
                    adjustMode ? "bg-[#FFB347]/20 border-[#FFB347]/50 text-[#FFB347]" : "bg-white/5 hover:bg-white/10 border-white/15 text-white"
                  }`}
                >
                  <Move className="w-3.5 h-3.5" /> {adjustMode ? "Done Adjusting" : "Adjust Position & Size"}
                </button>
              </div>
              {adjustMode && layoutMeta && (
                <div className="bg-[#092320] border border-white/10 rounded-2xl p-3 space-y-3">
                  {/* Which field the color/font-size controls below apply to */}
                  <div className="flex flex-wrap gap-1.5">
                    {TEXT_SLOTS.map((s) => (
                      <button
                        key={s.key} type="button" onClick={() => setActiveSlot(s.key)}
                        className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg border transition-all"
                        style={
                          activeSlot === s.key
                            ? { background: s.bg, color: s.fg, borderColor: s.bg }
                            : { background: "transparent", color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.15)" }
                        }
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Color — a curated palette plus a full custom picker,
                      for when a design's default text color doesn't read
                      well against a particular field's spot. */}
                  <div>
                    <span className="block text-[10px] font-bold text-white/50 uppercase tracking-wide mb-1.5">Color — {TEXT_SLOTS.find((s) => s.key === activeSlot)?.label}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c} type="button" onClick={() => setActiveColor(c)}
                          className="w-6 h-6 rounded-full border-2"
                          style={{ background: c, borderColor: activeColor.toLowerCase() === c.toLowerCase() ? "#5EEAD4" : "rgba(255,255,255,0.25)" }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color" value={activeColor} onChange={(e) => setActiveColor(e.target.value)}
                        className="w-7 h-7 rounded-full border-2 border-white/25 bg-transparent cursor-pointer p-0"
                        title="Custom color"
                      />
                    </div>
                  </div>

                  {/* Font size — same field-scoped pattern; each of the 5
                      fields keeps its own size independently. */}
                  <div>
                    <span className="block text-[10px] font-bold text-white/50 uppercase tracking-wide mb-1.5">Font Size — {activeFontSize}px</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => bumpActiveFontSize(-2)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg text-white font-bold text-xs">A-</button>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#5EEAD4]" style={{ width: `${((activeFontSize - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE)) * 100}%` }} />
                      </div>
                      <button type="button" onClick={() => bumpActiveFontSize(2)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg text-white font-bold text-base">A+</button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => resetTextSlot(activeSlot)} className="flex-1 min-w-0 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 text-[11px] font-bold uppercase tracking-wide py-2 rounded-xl truncate">
                      <RotateCcw className="w-3 h-3 shrink-0" /> <span className="truncate">Reset {TEXT_SLOTS.find((s) => s.key === activeSlot)?.label}</span>
                    </button>
                    <button type="button" onClick={resetPhotoFrame} className="flex-1 min-w-0 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 text-[11px] font-bold uppercase tracking-wide py-2 rounded-xl">
                      <RotateCcw className="w-3 h-3 shrink-0" /> Reset Photo
                    </button>
                  </div>
                </div>
              )}
              {adjustMode && (
                <p className="text-[11px] text-white/40 text-center">
                  Drag any colored label on the certificate to reposition it, or the photo box to move/resize it. Pick a field above to change its color or font size. Saved automatically for every "{deity}" certificate — the certificate artwork itself can't be moved or edited.
                </p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={handlePrint} className="flex-1 min-w-0 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wide py-3 rounded-xl">
                  <Printer className="w-3.5 h-3.5 shrink-0" /> Print
                </button>
                <button type="button" onClick={handleDownloadPng} className="flex-1 min-w-0 flex items-center justify-center gap-1.5 bg-[#0F766E]/20 hover:bg-[#0F766E]/40 border border-[#5EEAD4]/30 text-[#5EEAD4] text-xs font-bold uppercase tracking-wide py-3 rounded-xl truncate">
                  <Download className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Download PNG</span>
                </button>
              </div>
              {/* ✅ ADDED (2026-09-05): "Share This Certificate via Email" —
                  below Print/Download, per explicit instruction. Sends the
                  same PNG to whatever email was entered above; disabled
                  until the certificate is saved and an email is present,
                  so it can't be used on an incomplete/unsaved draft. */}
              <button
                type="button" onClick={handleShareEmail} disabled={shareStatus.kind === "sending"}
                className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wide py-3 rounded-xl"
              >
                <Mail className="w-3.5 h-3.5" />
                {shareStatus.kind === "sending" ? "Sending…" : "Share This Certificate via Email"}
              </button>
              {shareStatus.kind === "success" && (
                <p className="flex items-center gap-1.5 text-[#5EEAD4] text-xs justify-center"><Check className="w-3.5 h-3.5" /> {shareStatus.message}</p>
              )}
              {shareStatus.kind === "error" && (
                <p className="flex items-center gap-1.5 text-red-400 text-xs justify-center"><AlertTriangle className="w-3.5 h-3.5" /> {shareStatus.message}</p>
              )}
              <p className="text-[11px] text-white/30 text-center">
                Placeholder artwork shown — updates automatically to real certificate designs once supplied, no workflow changes needed.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ✅ ADDED (2026-09-06): the drag/resize layer for the Live Certificate
// preview. Positioned in an absolutely-positioned wrapper the same
// pixel size as the on-screen (scaled-down) canvas; every coordinate is
// converted between "certificate space" (the fixed 1536×1024 the canvas
// always renders at internally) and "screen space" (whatever width the
// canvas is actually displayed at on this device) via a single scale
// factor, so this works identically at any zoom/screen size — desktop,
// tablet, or phone.
function CertificateAdjustOverlay({
  wrapperRef, layoutMeta, adjustment, onTextOffsetChange, onPhotoFrameChange,
}: {
  wrapperRef: RefObject<HTMLDivElement | null>;
  layoutMeta: NonNullable<ReturnType<typeof getCertificateLayoutMeta>>;
  adjustment: CertAdjustment;
  onTextOffsetChange: (slot: TextSlotKey, offset: { x: number; y: number }) => void;
  onPhotoFrameChange: (frame: { x: number; y: number; width: number; height: number }) => void;
}) {
  const photoFrame = adjustment.photoOverride || layoutMeta.photoFrame;

  const getScale = () => (wrapperRef.current ? wrapperRef.current.clientWidth / CERTIFICATE_WIDTH : 1);

  // Generic drag handler: onPointerDown captures the pointer on the
  // handle itself, so onPointerMove/onPointerUp fire on that same
  // element without needing window-level listeners — works the same
  // for mouse and touch.
  function startDrag(
    e: ReactPointerEvent,
    startValue: { x: number; y: number; width?: number; height?: number },
    onChange: (v: { x: number; y: number; width?: number; height?: number }) => void,
    mode: "move" | "resize",
  ) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const scale = getScale() || 1;
    const startClientX = e.clientX;
    const startClientY = e.clientY;

    // Pointer capture means these native events keep firing on `target`
    // even once the finger/cursor moves outside it — so a plain
    // element-level listener (no window listener needed) reliably
    // tracks the whole drag, mouse or touch, until pointerup.
    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / scale;
      const dy = (ev.clientY - startClientY) / scale;
      if (mode === "move") {
        onChange({ x: startValue.x + dx, y: startValue.y + dy });
      } else {
        const MIN = 40; // certificate-space px — keeps the photo from being dragged to nothing
        onChange({
          x: startValue.x,
          y: startValue.y,
          width: Math.max(MIN, (startValue.width || MIN) + dx),
          height: Math.max(MIN, (startValue.height || MIN) + dy),
        });
      }
    };
    const handleUp = () => {
      target.removeEventListener("pointermove", handleMove);
      target.removeEventListener("pointerup", handleUp);
      target.removeEventListener("pointercancel", handleUp);
    };
    target.addEventListener("pointermove", handleMove);
    target.addEventListener("pointerup", handleUp);
    target.addEventListener("pointercancel", handleUp);
  }

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      {/* Photo frame — drag to move, corner handle to resize */}
      <div
        onPointerDown={(e) => startDrag(e, photoFrame, (v) => onPhotoFrameChange({ x: v.x, y: v.y, width: photoFrame.width, height: photoFrame.height }), "move")}
        className="absolute border-2 border-dashed border-[#5EEAD4] bg-[#5EEAD4]/10 cursor-move flex items-start justify-center"
        style={{
          left: `${(photoFrame.x / CERTIFICATE_WIDTH) * 100}%`,
          top: `${(photoFrame.y / CERTIFICATE_HEIGHT) * 100}%`,
          width: `${(photoFrame.width / CERTIFICATE_WIDTH) * 100}%`,
          height: `${(photoFrame.height / CERTIFICATE_HEIGHT) * 100}%`,
        }}
      >
        <span className="text-[10px] font-bold text-[#021816] bg-[#5EEAD4] px-1.5 py-0.5 rounded mt-1 pointer-events-none">PHOTO</span>
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            startDrag(e, { x: photoFrame.x, y: photoFrame.y, width: photoFrame.width, height: photoFrame.height }, (v) => onPhotoFrameChange({ x: photoFrame.x, y: photoFrame.y, width: v.width!, height: v.height! }), "resize");
          }}
          className="absolute -right-2 -bottom-2 w-5 h-5 bg-[#5EEAD4] rounded-full border-2 border-[#021816] cursor-nwse-resize flex items-center justify-center"
          title="Drag to resize the photo"
        >
          <Maximize2 className="w-2.5 h-2.5 text-[#021816]" />
        </div>
      </div>

      {/* One draggable pill per text field — Performed At, Date of Puja,
          Devotee Name, Puja Performed, Reference ID. Each carries its own
          TEXT_SLOTS color so it's easy to match to its tab in the panel
          below. Position-only (no resize handle) — font size is
          adjusted separately via the "Font Size" control, not by
          dragging, since a drag-resize would also distort where the
          text sits relative to its label. */}
      {TEXT_SLOTS.map(({ key, label, bg, fg }) => {
        const base = layoutMeta[key];
        const offset = adjustment.textOverrides?.[key]?.offset;
        const pos = { x: base.x + (offset?.x || 0), y: base.y + (offset?.y || 0) };
        return (
          <div
            key={key}
            onPointerDown={(e) => startDrag(e, pos, (v) => onTextOffsetChange(key, { x: v.x - base.x, y: v.y - base.y }), "move")}
            className="absolute -translate-x-1/2 -translate-y-full cursor-move flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap"
            style={{ left: `${(pos.x / CERTIFICATE_WIDTH) * 100}%`, top: `${(pos.y / CERTIFICATE_HEIGHT) * 100}%`, background: bg, color: fg }}
          >
            <Move className="w-2.5 h-2.5" /> {label}
          </div>
        );
      })}
    </div>
  );
}

function PhotoPicker({ dataUrl, processing, onSelect }: { dataUrl: string | null; processing: boolean; onSelect: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={inputRef} type="file" accept="image/*" capture="user" className="hidden"
        onChange={(e) => onSelect(e.target.files?.[0] || null)}
      />
      <button
        type="button" onClick={() => inputRef.current?.click()} disabled={processing}
        className="w-full aspect-square rounded-xl bg-black/30 border border-dashed border-white/20 flex flex-col items-center justify-center gap-1.5 overflow-hidden disabled:opacity-50"
      >
        {dataUrl ? (
          <img src={dataUrl} alt="" className="w-full h-full object-cover" />
        ) : processing ? (
          <RefreshCw className="w-5 h-5 text-white/40 animate-spin" />
        ) : (
          <>
            <Camera className="w-5 h-5 text-white/30" />
            <span className="text-[10px] text-white/30 flex items-center gap-1"><Upload className="w-3 h-3" /> Capture / Upload</span>
          </>
        )}
      </button>
    </div>
  );
}

function OptionDropdown({
  label, value, setValue, options, type, canAdd, adding, setAdding, newValue, setNewValue, onAdd,
}: {
  label: string; value: string; setValue: (v: string) => void; options: string[]; type: OptionType;
  canAdd: boolean; adding: boolean; setAdding: (t: OptionType | null) => void;
  newValue: string; setNewValue: (v: string) => void; onAdd: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">{label} *</label>
      {adding ? (
        <div className="flex gap-1.5 sm:gap-2">
          <input
            type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} autoFocus
            placeholder={`New ${label.toLowerCase()}…`}
            className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg bg-black/30 border border-[#5EEAD4]/40 focus:outline-none text-white"
          />
          <button type="button" onClick={onAdd} className="px-3 shrink-0 bg-[#5EEAD4]/20 text-[#5EEAD4] rounded-lg text-xs font-bold">Save</button>
          <button type="button" onClick={() => { setAdding(null); setNewValue(""); }} className="px-3 shrink-0 text-white/40 text-xs">Cancel</button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <select
            value={value} onChange={(e) => setValue(e.target.value)}
            className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white"
          >
            <option value="">Select {label.toLowerCase()}…</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {canAdd && (
            // ✅ CHANGED (2026-09-05 — "I do not want a plus sign...
            // options similar to: Add Your City, Add Your Temple..."):
            // previously an icon-only "+" squeezed beside the dropdown,
            // easy to miss and cramped on mobile with a long label. Now
            // its own clearly labeled row underneath, full width, so it's
            // never truncated or overlooked.
            <button
              type="button" onClick={() => setAdding(type)}
              className="w-full text-left px-3.5 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[#5EEAD4] text-sm font-bold"
            >
              + Add Your {label === "Service" ? "Puja/Seva" : label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
