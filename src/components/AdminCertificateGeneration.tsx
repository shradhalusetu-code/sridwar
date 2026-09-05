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

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ScrollText, Landmark, ShieldCheck, Lock, ArrowLeft, Camera, Upload,
  Plus, Trash2, Printer, Download, RefreshCw, Check, AlertTriangle, Mail,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  renderCertificate, compressImageToUnderSize, removeStudioBackground, RELATIONSHIP_OPTIONS,
  CertificateData,
} from "../utils/certificateTemplate";

interface AdminCertificateGenerationProps {
  onNavigate: (page: string) => void;
}

type AccessState = "checking" | "staff" | "vendor" | "denied";
type Member = { name: string; relationship: string };
type OptionType = "city" | "deity" | "temple" | "service";

const MAX_MEMBERS = 6;
const emptyMember = (): Member => ({ name: "", relationship: "" });

export default function AdminCertificateGeneration({ onNavigate }: AdminCertificateGenerationProps) {
  const [access, setAccess] = useState<AccessState>("checking");
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // ── Form state ──
  const [refId, setRefId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [devoteeName, setDevoteeName] = useState("");
  // ✅ ADDED (2026-09-05): optional, never drawn on the certificate —
  // stored only so the finished certificate can be shared with the
  // devotee later.
  const [devoteePhone, setDevoteePhone] = useState("");
  const [devoteeEmail, setDevoteeEmail] = useState("");
  const [members, setMembers] = useState<Member[]>([emptyMember()]);
  const [pujaDate, setPujaDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [city, setCity] = useState("");
  const [deity, setDeity] = useState("");
  const [temple, setTemple] = useState("");

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
        if (cityData.options) setCityOptions(cityData.options);
        if (deityData.options) setDeityOptions(deityData.options);
        if (templeData.options) setTempleOptions(templeData.options);
        if (serviceData.options) setServiceOptions(serviceData.options);
      } catch {
        setRefIdError("Could not load starting data. Please refresh the page.");
      }
    })();
  }, [access, authFetch]);

  // ── Live preview: re-render the canvas whenever any relevant field changes ──
  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    const data: CertificateData = {
      refId, serviceType, devoteeName, members, pujaDate, city, deity, temple,
      devoteePhoto: devoteePhotoImg,
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
  }, [refId, serviceType, devoteeName, members, pujaDate, city, deity, temple, devoteePhotoImg]);

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
    <div className="min-h-screen bg-[#021816] text-white px-4 py-10">
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
          <div className="grid lg:grid-cols-2 gap-6">
            {/* ── LEFT: the form ── */}
            <div className="space-y-5">
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
                  <span className="flex-1 font-mono text-lg text-[#FFB347] font-bold">{refId || "Generating…"}</span>
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
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Phone Number (optional)</label>
                    <input
                      type="tel" value={devoteePhone} onChange={(e) => setDevoteePhone(e.target.value)}
                      placeholder="For sharing only"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Email Address (optional)</label>
                    <input
                      type="email" value={devoteeEmail} onChange={(e) => setDevoteeEmail(e.target.value)}
                      placeholder="For sharing only"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                </div>
                {/* ✅ CHANGED (2026-09-05): Service is now the same
                    server-backed "Add & Save" dropdown as City/Deity/
                    Temple — only Puja names and Stone Name Engraving are
                    seeded (per explicit instruction to not show every
                    service type), and anyone can add a Puja name that
                    isn't listed yet. */}
                <OptionDropdown label="Service" value={serviceType} setValue={setServiceType} options={serviceOptions} type="service"
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
                    <div key={i} className="flex gap-2">
                      <input
                        type="text" value={m.name} onChange={(e) => updateMember(i, "name", e.target.value)}
                        placeholder={`Member ${i + 1} name`}
                        className="flex-1 text-sm px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                      />
                      <select
                        value={m.relationship} onChange={(e) => updateMember(i, "relationship", e.target.value)}
                        className="w-40 text-sm px-2 py-2 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white"
                      >
                        <option value="">Relationship</option>
                        {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button type="button" onClick={() => removeMemberRow(i)} className="p-2 text-white/30 hover:text-red-400">
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

            {/* ── RIGHT: live preview ── */}
            <div className="lg:sticky lg:top-6 self-start space-y-3">
              <div className="bg-white rounded-2xl p-3 shadow-2xl">
                <canvas ref={canvasRef} className="w-full h-auto rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handlePrint} className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wide py-3 rounded-xl">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button type="button" onClick={handleDownloadPng} className="flex-1 flex items-center justify-center gap-1.5 bg-[#0F766E]/20 hover:bg-[#0F766E]/40 border border-[#5EEAD4]/30 text-[#5EEAD4] text-xs font-bold uppercase tracking-wide py-3 rounded-xl">
                  <Download className="w-3.5 h-3.5" /> Download PNG
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
        <div className="flex gap-2">
          <input
            type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} autoFocus
            placeholder={`New ${label.toLowerCase()}…`}
            className="flex-1 text-sm px-3 py-2 rounded-lg bg-black/30 border border-[#5EEAD4]/40 focus:outline-none text-white"
          />
          <button type="button" onClick={onAdd} className="px-3 bg-[#5EEAD4]/20 text-[#5EEAD4] rounded-lg text-xs font-bold">Save</button>
          <button type="button" onClick={() => { setAdding(null); setNewValue(""); }} className="px-3 text-white/40 text-xs">Cancel</button>
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
