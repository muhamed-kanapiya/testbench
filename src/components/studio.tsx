"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, Check, ChevronDown, Download, FlaskConical, Info, Layers2, LoaderCircle, LockKeyhole, Maximize2, RotateCcw, Sparkles, Upload, X, Undo2, Shield, ImageIcon, Type, SlidersHorizontal, Smartphone, LayoutGrid } from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { Brand } from "./brand";
import { Creative, PlacementPreview } from "./creative-preview";
import { safeFileStem, validateOffer, type Offer } from "@/lib/experiment";
import { creativeBlob, prepareLogo, saveBlob } from "@/lib/canvas";
import { defaultTest, FORMATS, newProject, type FormatId, type Overlays, type Placement } from "@/lib/studio-model";
import { useProject } from "@/lib/use-project";
import { MODES, modeFilename, modeIssue, modeManifest, resolveVariant, switchMode } from "@/lib/experiment-modes";
import { ExperimentControls, VariantEditor } from "./experiment-controls";

export function Studio() {
  const { project, ready, update, undo, canUndo, saveStatus, storageError } = useProject();
  const { offer, variants, product, productSource, productLabel, approved, hypothesis, overlays, format } = project;
  const mode = project.test.mode, definition = MODES[mode];
  const presentations = variants.map((_, i) => resolveVariant(project, i));
  const [panel, setPanel] = useState<"product" | "message" | "overlays">("product");
  const [view, setView] = useState<"creative" | "placement">("creative");
  const [placement, setPlacement] = useState<Placement>("instagram");
  const [active, setActive] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState<string[]>([]);
  const [generationRun, setGenerationRun] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isolate, setIsolate] = useState(false);
  const [guides, setGuides] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null), logoRef = useRef<HTMLInputElement>(null), modalRef = useRef<HTMLDialogElement>(null);
  const busy = !ready || uploading || generationRun || exporting;
  const displayPlacement: Placement = format === "story" ? "stories" : placement === "stories" ? "instagram" : placement;
  useEffect(() => { fetch("/api/status").then(r => r.json()).then(d => setConfigured(d.configured === true)).catch(() => setConfigured(false)); }, []);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(""), 5000); return () => clearTimeout(id); }, [notice]);
  useEffect(() => { if (selected !== null) modalRef.current?.showModal(); else modalRef.current?.close(); }, [selected]);
  const openedMode = useRef(false);
  useEffect(() => {
    if (!ready || openedMode.current) return;
    openedMode.current = true;
    const requested = new URLSearchParams(window.location.search).get("test");
    if (requested && Object.hasOwn(MODES, requested)) update(p => switchMode(p, requested as keyof typeof MODES));
  }, [ready, update]);
  function updateOffer(key: keyof Offer, value: string) { update(p => ({ ...p, offer: { ...p.offer, [key]: value }, test: { ...p.test, ...(key === "headline" ? { headlines: [value, ...p.test.headlines.slice(1)] } : {}), ...(key === "cta" ? { ctas: [value, ...p.test.ctas.slice(1)] } : {}) } }), `offer-${key}`); }
  function updateOverlay<K extends keyof Overlays>(key: K, value: Overlays[K]) { update(p => ({ ...p, overlays: { ...p.overlays, [key]: value } }), `overlay-${key}`); }
  function chooseFormat(next: FormatId) { update(p => ({ ...p, format: next })); if (next === "story") setPlacement("stories"); else if (placement === "stories") setPlacement("instagram"); }
  function choosePlacement(next: Placement) { setPlacement(next); if (next === "stories") chooseFormat("story"); else if (format === "story") update(p => ({ ...p, format: "portrait" })); }
  function validate() {
    const invalid = validateOffer(offer); if (invalid) return invalid;
    if (!approved) return "Approve the product cutout before exporting.";
    const testError = modeIssue(project); if (testError) return testError;
    if (overlays.showBadge && !overlays.badge.trim()) return "Add badge text or turn the badge off.";
    if (overlays.showPrice && !overlays.salePrice.trim()) return "Add a current price or turn the price overlay off.";
    if (overlays.showBenefit && !overlays.benefit.trim()) return "Add benefit text or turn the benefit overlay off.";
    return null;
  }
  async function uploadProduct(file?: File) {
    if (!file || busy) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) { setError("Choose a PNG, JPG or WebP image smaller than 10 MB."); return; }
    setUploading(true); setError("");
    try {
      const form = new FormData(); form.append("image", file); form.append("label", productLabel);
      const response = await fetch("/api/prepare", { method: "POST", body: form }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Product preparation failed. Try a clearer photo.");
      update(p => ({ ...p, product: data.image, productSource: data.method, approved: false })); setNotice("Product prepared. Check the cutout before generating.");
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  async function uploadLogo(file?: File) {
    if (!file || busy) return; setUploading(true); setError("");
    try { const logo = await prepareLogo(file); updateOverlay("logo", logo); setNotice("Logo added to all variants and formats."); }
    catch (e) { setError(e instanceof Error ? e.message : "Logo could not be loaded."); }
    finally { setUploading(false); if (logoRef.current) logoRef.current.value = ""; }
  }
  async function generate(ids: string[]) {
    if (busy) return; const invalid = validateOffer(offer); if (invalid) { setError(invalid); return; }
    if (!approved) { setError("Check and approve the product cutout first."); return; }
    setGenerationRun(true); setGenerating(ids); setError(""); setIsolate(false);
    try {
      const results = await Promise.allSettled(variants.filter(v => ids.includes(v.id)).map(async variant => {
        try {
          const response = await fetch("/api/background", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: variant.prompt, productName: productLabel, concept: variant.name }) });
          const data = await response.json(); if (!response.ok) throw new Error(data.error || "Generation failed.");
          update(p => ({ ...p, variants: p.variants.map(v => v.id === variant.id ? { ...v, image: data.image, source: "meta" } : v) }));
        } catch (e) { throw new Error(`${variant.name}: ${e instanceof Error ? e.message : "Generation failed."}`); }
        finally { setGenerating(current => current.filter(id => id !== variant.id)); }
      }));
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      if (failures.length) setError(failures.map(r => r.reason.message).join(" ")); else setNotice("Backgrounds ready. Your product, copy and overlays stayed fixed.");
      if (ids.length > 1 && results.some(r => r.status === "fulfilled")) {
        try {
          const response = await fetch("/api/hypothesis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offer, productName: productLabel, concepts: variants.map(v => ({ name: v.name, prompt: v.prompt })) }) });
          const data = await response.json(); if (response.ok && data.hypothesis) update(p => ({ ...p, hypothesis: data.hypothesis }));
        } catch { /* Keep the editable hypothesis when this optional request fails. */ }
      }
    } finally { setGenerationRun(false); }
  }
  async function generateWording() {
    if (busy || (mode !== "headline" && mode !== "cta")) return;
    const invalid = validateOffer(offer); if (invalid) { setError(invalid); return; }
    setGenerationRun(true); setError("");
    try {
      const response = await fetch("/api/copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, offer, productName: productLabel }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Wording generation failed.");
      update(p => ({ ...p, hypothesis: data.hypothesis || p.hypothesis, test: { ...p.test, ...(mode === "headline" ? { headlines: data.values, headlineSources: ["original", "meta", "meta"] } : { ctas: data.values, ctaSources: ["original", "meta", "meta"] }) } }));
      setNotice("Alternatives ready. Review the wording before exporting.");
    } catch (e) { setError(e instanceof Error ? e.message : "Wording generation failed."); }
    finally { setGenerationRun(false); }
  }
  function resetCompositions() { update(p => ({ ...p, test: { ...p.test, compositions: defaultTest(p.offer).compositions } })); setNotice("Three composition presets restored."); }
  async function downloadOne(index: number) {
    const invalid = validate(); if (invalid) { setError(invalid); return; }
    setExporting(true); setError("");
    try {
      const r = resolveVariant(project, index);
      const blob = await creativeBlob(product, r.variant, r.offer, { format, overlays: r.overlays, composition: r.composition, headlineAlternatives: r.headlineAlternatives, ctaAlternatives: r.ctaAlternatives });
      saveBlob(blob, modeFilename(project, index, format).replace("/", "-")); setNotice(`Creative downloaded at ${FORMATS[format].width} × ${FORMATS[format].height}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Export failed."); } finally { setExporting(false); }
  }
  async function exportExperiment() {
    const invalid = validate(); if (invalid) { setError(invalid); return; }
    setExporting(true); setError("");
    try {
      const zip = new JSZip();
      for (const key of Object.keys(FORMATS) as FormatId[]) for (let i = 0; i < variants.length; i++) {
        const r = resolveVariant(project, i);
        zip.file(modeFilename(project, i, key), await creativeBlob(product, r.variant, r.offer, { format: key, overlays: r.overlays, composition: r.composition, headlineAlternatives: r.headlineAlternatives, ctaAlternatives: r.ctaAlternatives }));
      }
      const response = await fetch(product); if (!response.ok) throw new Error("The product cutout could not be exported.");
      const productBlob = await response.blob(); zip.file("product-cutout.png", productBlob);
      if (overlays.logo) zip.file("logo.png", await (await fetch(overlays.logo)).blob());
      const digest = await crypto.subtle.digest("SHA-256", await productBlob.arrayBuffer());
      const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      zip.file("experiment.json", JSON.stringify({ ...modeManifest(project), productLayer: { filename: "product-cutout.png", sha256, sourceReusedAcrossAllVariants: true, transformFixedAcrossVariants: mode !== "composition" } }, null, 2));
      zip.file("READ-ME.txt", ["TestBench experiment", "", "Variable: " + definition.variable, "9 PNG creatives: 3 variants × 3 formats.", "4x5: 1080 × 1350; 1x1: 1080 × 1080; 9x16: 1080 × 1920.", "", definition.description, "Read experiment.json for per-variant settings, wording provenance and controlled elements.", "Social interface and guides are preview-only. The native platform CTA and caption remain constant. Review the final placement in Ads Manager.", "", "Compare A/B/C within the SAME placement and format using a randomized split test. Keep targeting, destination, schedule and optimization consistent. TestBench does not predict a winner or statistical significance."].join("\n"));
      saveBlob(await zip.generateAsync({ type: "blob" }), safeFileStem(offer.brand) + "-" + mode + "-experiment.zip"); setNotice("Experiment exported: nine creatives, product layer and test settings.");
    } catch (e) { setError(e instanceof Error ? e.message : "Export failed."); } finally { setExporting(false); }
  }
  function reset() { update(() => newProject()); setIsolate(false); setError(""); setNotice("Example restored. Undo brings back your previous project."); }
  function conceptEditor(index: number) {
    if (mode !== "background") return <VariantEditor project={project} index={index} update={update} busy={busy} />;
    const variant = variants[index];
    return <div className="concept-editor"><label>Background direction<textarea rows={4} maxLength={1200} value={variant.prompt} disabled={busy} onChange={e => update(p => ({ ...p, variants: p.variants.map(v => v.id === variant.id ? { ...v, prompt: e.target.value } : v) }), `prompt-${variant.id}`)} /></label><button className="button button-small button-subtle" disabled={busy || !configured || !approved} onClick={() => generate([variant.id])}><RotateCcw size={13} /> Regenerate this background</button></div>;
  }
  return <main className="studio-app studio-v2">
    <header className="studio-nav"><Brand /><span className="studio-breadcrumb"><span>/</span> Experiment studio</span><div className="studio-nav-right"><span className={`save-indicator ${saveStatus}`} role="status">{saveStatus === "saved" ? <Check size={13} /> : saveStatus === "error" ? <Info size={13} /> : <LoaderCircle size={13} className="spin" />}{saveStatus === "saved" ? "Saved in this browser" : saveStatus === "error" ? "Not saved" : saveStatus === "loading" ? "Loading draft…" : "Saving…"}</span><button className="undo-button" disabled={!canUndo || busy} onClick={undo} aria-label="Undo last change"><Undo2 size={17} /><span>Undo</span></button><button className="button button-primary button-small" onClick={exportExperiment} disabled={busy}><Download size={15} /> {exporting ? "Exporting…" : "Export 9 creatives"}</button></div></header>
    <div className="studio-layout">
      <aside className="studio-sidebar"><div className="sidebar-intro"><h1>Set the constants.</h1><p>Shared layers for your experiment.</p></div>
        <div className="editor-tabs" role="tablist" aria-label="Creative settings">{(["product", "message", "overlays"] as const).map(tab => <button key={tab} role="tab" id={`tab-${tab}`} aria-controls={`panel-${tab}`} aria-selected={panel === tab} onClick={() => setPanel(tab)}>{tab === "product" ? <ImageIcon size={15} /> : tab === "message" ? <Type size={15} /> : <SlidersHorizontal size={15} />}{tab[0].toUpperCase() + tab.slice(1)}</button>)}</div>
        <div className="editor-panel" role="tabpanel" id={`panel-${panel}`} aria-labelledby={`tab-${panel}`}>
        {panel === "product" && <fieldset className="product-fieldset" disabled={busy}><legend className="sr-only">Your product</legend><div className="product-upload" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); uploadProduct(e.dataTransfer.files[0]); }}><img src={product} alt="Current product cutout for all variants" />{uploading && <div className="upload-overlay"><LoaderCircle className="spin" size={26} /><span>Preparing your product…</span></div>}<button className="upload-button" onClick={() => inputRef.current?.click()}><Upload size={14} /> Replace image</button><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => uploadProduct(e.target.files?.[0])} aria-label="Upload product image" hidden /></div><div className="product-caption"><span>{productSource.includes("example") ? "Example product" : "Your product"}</span><span>PNG, JPG, WebP · 10 MB</span></div><label className="field-label">Product to isolate<input value={productLabel} onChange={e => update(p => ({ ...p, productLabel: e.target.value }), "product-label")} maxLength={80} placeholder="e.g. bottle" /></label><label className="cutout-check"><input type="checkbox" checked={approved} onChange={e => update(p => ({ ...p, approved: e.target.checked }))} /><span>I’ve checked the product cutout</span></label><p className="control-note">The approved cutout is reused unchanged. Position and scale adapt together for each format.</p></fieldset>}
        {panel === "message" && <fieldset disabled={busy}><legend className="sr-only">The message</legend><label className="field-label">Brand<input value={offer.brand} onChange={e => updateOffer("brand", e.target.value)} maxLength={28} /></label><label className="field-label">Headline<textarea disabled={busy || mode === "headline"} value={offer.headline} onChange={e => updateOffer("headline", e.target.value)} rows={3} maxLength={70} /></label><label className="field-label">Supporting line<input value={offer.price} onChange={e => updateOffer("price", e.target.value)} maxLength={65} /></label><label className="field-label">Call to action<input disabled={busy || mode === "cta"} value={offer.cta} onChange={e => updateOffer("cta", e.target.value)} maxLength={24} /></label><label className="field-label">Post caption<textarea value={project.caption} onChange={e => update(p => ({ ...p, caption: e.target.value }), "caption")} rows={4} maxLength={220} /></label><p className="control-note">The caption stays fixed in every preview. In headline or CTA mode, edit the tested wording directly under A/B/C.</p></fieldset>}
        {panel === "overlays" && <fieldset disabled={busy}><legend className="sr-only">Ad overlays</legend><label className="field-label">Composition<select disabled={busy || mode === "composition"} value={mode === "composition" ? "editorial" : overlays.layout} onChange={e => updateOverlay("layout", e.target.value as Overlays["layout"])}><option value="editorial">Editorial · product centred</option><option value="split">Split · product on the right</option></select></label><div className="color-pair"><label className="field-label">Accent<input type="color" value={overlays.accent} onChange={e => updateOverlay("accent", e.target.value)} /></label><label className="field-label">Text<input type="color" value={overlays.ink} onChange={e => updateOverlay("ink", e.target.value)} /></label></div><div className="logo-control"><span>Brand logo</span><div>{overlays.logo && <img src={overlays.logo} alt="Brand logo" />}<button className="text-button" onClick={() => logoRef.current?.click()}><Upload size={13} />{overlays.logo ? "Replace logo" : "Upload logo"}</button>{overlays.logo && <button className="icon-button" aria-label="Remove logo" onClick={() => updateOverlay("logo", "")}><X size={14} /></button>}</div><input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Upload brand logo" onChange={e => uploadLogo(e.target.files?.[0])} /></div>
          <div className="overlay-group"><label className="toggle-row"><span>Offer badge</span><input type="checkbox" checked={overlays.showBadge} onChange={e => updateOverlay("showBadge", e.target.checked)} /></label>{overlays.showBadge && <><label className="field-label">Badge text<input value={overlays.badge} placeholder="e.g. −20%" maxLength={20} onChange={e => updateOverlay("badge", e.target.value)} /></label><label className="field-label">Badge position<select disabled={busy || mode === "composition"} value={mode === "composition" ? "left" : overlays.badgeSide} onChange={e => updateOverlay("badgeSide", e.target.value as "left" | "right")}><option value="right">Right</option><option value="left">Left</option></select></label></>}</div>
          <div className="overlay-group"><label className="toggle-row"><span>Price</span><input type="checkbox" checked={overlays.showPrice} onChange={e => updateOverlay("showPrice", e.target.checked)} /></label>{overlays.showPrice && <div className="price-pair"><label className="field-label">Current price<input value={overlays.salePrice} placeholder="$24" maxLength={14} onChange={e => updateOverlay("salePrice", e.target.value)} /></label><label className="field-label">Previous price<input value={overlays.oldPrice} placeholder="$30" maxLength={14} onChange={e => updateOverlay("oldPrice", e.target.value)} /></label></div>}</div>
          <div className="overlay-group"><label className="toggle-row"><span>Benefit line</span><input type="checkbox" checked={overlays.showBenefit} onChange={e => updateOverlay("showBenefit", e.target.checked)} /></label>{overlays.showBenefit && <label className="field-label">Benefit text<input value={overlays.benefit} placeholder="e.g. Free delivery" maxLength={45} onChange={e => updateOverlay("benefit", e.target.value)} /></label>}</div>
          <label className="toggle-row standalone"><span>CTA on artwork</span><input type="checkbox" disabled={busy || mode === "cta"} checked={mode === "cta" || overlays.showCta} onChange={e => updateOverlay("showCta", e.target.checked)} /></label><label className="field-label">Overlay size <span className="range-value">{overlays.scale}%</span><input type="range" min={80} max={120} step={5} value={overlays.scale} onChange={e => updateOverlay("scale", Number(e.target.value))} /></label><p className="control-note">Offer details stay shared. Composition mode reserves the left side for text and price; CTA mode keeps its artwork button visible.</p>
        </fieldset>}
        </div><div className="sidebar-foot"><span><LockKeyhole size={13} /> Applied to A, B and C</span><button className="reset-link" onClick={reset} disabled={busy}><RotateCcw size={13} /> Restore example</button><Link className="quiet-link" href="/"><ArrowLeft size={13} /> Back to overview</Link></div>
      </aside>
      <section className="studio-workspace">
        <div className="workspace-heading"><div><span className="workspace-kicker"><FlaskConical size={15} /> {definition.label} experiment</span><h2>See the whole picture.</h2><p>One variable. Three variants. Every placement.</p></div><span className={`connection-status ${configured ? "ready" : ""}`}><i />{configured === null ? "Checking generation…" : configured ? "Generation available" : "Example mode"}</span></div>
        {(error || storageError) && <div className="error-banner" role="alert"><Info size={18} /><span>{error || storageError}</span>{error && <button onClick={() => setError("")} aria-label="Dismiss error"><X size={17} /></button>}</div>}
        <ExperimentControls project={project} update={update} busy={busy} configured={!!configured} onRegenerate={() => generate([project.test.sharedBackground])} />
        <div className="view-controls"><div className="segmented" aria-label="Preview mode"><button aria-pressed={view === "creative"} onClick={() => setView("creative")}><LayoutGrid size={15} /> Creative</button><button aria-pressed={view === "placement"} onClick={() => { setView("placement"); setIsolate(false); }}><Smartphone size={15} /> In placement</button></div><div className="format-switch" aria-label="Artwork format">{(Object.keys(FORMATS) as FormatId[]).map(f => <button key={f} disabled={busy} aria-label={`Format ${FORMATS[f].label}`} aria-pressed={format === f} onClick={() => chooseFormat(f)}><i className={`format-shape ${f}`} />{FORMATS[f].label}</button>)}</div></div>
        <div className="workspace-toolbar"><div className="controlled-chips">{definition.fixed.map(label => <span key={label}><LockKeyhole size={12} /> {label}</span>)}</div><div className="inspection-controls"><button className={`layer-toggle ${guides ? "selected" : ""}`} onClick={() => setGuides(!guides)} aria-pressed={guides}><Shield size={14} /> Safe-area guide</button>{view === "creative" && <button className={`layer-toggle ${isolate ? "selected" : ""}`} onClick={() => setIsolate(!isolate)} aria-pressed={isolate}><Layers2 size={14} /> {isolate ? "Show backgrounds" : "Fixed layers"}</button>}</div></div>
        {guides && <p className="guide-note">Composition guide only. Placement interfaces vary; check the final ad in Ads Manager. Guides never appear in exports.</p>}
        {view === "creative" ? <div className={`variant-grid format-${format}`}>{variants.map((variant, i) => <article className="variant-card" key={variant.id}><header><span className="variant-letter">{String.fromCharCode(65 + i)}</span><div><h3>{presentations[i].variant.name}</h3><span>{mode === "background" ? variant.source === "meta" ? "Generated background" : "Example background" : "Shared background"}</span></div><button className="icon-button" aria-label={`Enlarge variant ${String.fromCharCode(65 + i)}`} onClick={() => setSelected(i)}><Maximize2 size={15} /></button></header><div className="canvas-frame"><Creative project={project} variant={variant} isolate={isolate} guides={guides} onError={setError} />{generating.includes(variant.id) && <div className="generation-overlay"><LoaderCircle className="spin" size={30} /><strong>Creating the setting</strong><span>Your product stays in place.</span></div>}</div><div className="variant-actions">{mode === "background" ? <button onClick={() => setExpanded(expanded === variant.id ? null : variant.id)} aria-expanded={expanded === variant.id}>Edit concept <ChevronDown size={14} /></button> : <span className="tested-variable">{definition.variable}</span>}<button onClick={() => downloadOne(i)} disabled={busy} aria-label={`Download variant ${String.fromCharCode(65 + i)}`}><ArrowDownToLine size={16} /></button></div>{(mode !== "background" || expanded === variant.id) && conceptEditor(i)}</article>)}</div> : <div className="placement-stage"><div className="placement-main"><div className="placement-switch" aria-label="Placement">{([['instagram', 'Instagram Feed'], ['facebook', 'Facebook Feed'], ['stories', 'Stories']] as const).map(([id, label]) => <button disabled={busy} key={id} aria-pressed={displayPlacement === id} onClick={() => choosePlacement(id)}>{label}</button>)}</div><PlacementPreview project={project} variant={variants[active]} placement={displayPlacement} guides={guides} onError={setError} /><p className="simulation-label">Placement simulation · {FORMATS[format].label} · Interface excluded from export</p></div><aside className="placement-variants"><span className="panel-caption">Compare the variants</span>{variants.map((variant, i) => <button key={variant.id} className="placement-choice" aria-pressed={active === i} onClick={() => setActive(i)}><span style={{ backgroundColor: variant.color }}>{String.fromCharCode(65 + i)}</span><div><b>{presentations[i].variant.name}</b><small>{mode === "background" ? variant.source === "meta" ? "Generated" : "Example" : definition.label}</small></div>{active === i && <Check size={15} />}</button>)}<div className="placement-detail"><h3>{presentations[active].variant.name}</h3><p>{definition.description}</p><button className="button button-subtle button-small" disabled={busy} onClick={() => downloadOne(active)}><Download size={14} /> Download {FORMATS[format].label}</button>{conceptEditor(active)}</div></aside></div>}
        <div className="generation-row"><div><Sparkles size={17} /><span>{generationRun ? "Preparing your experiment…" : mode === "background" ? "Backgrounds adapt by cropping. Shared layers recompose for each format." : mode === "composition" ? "Position and scale change together. Product pixels, background and text stay fixed." : "A is your baseline. Generate B/C or edit the wording below each creative."}</span></div><button className="button button-primary" disabled={busy || (mode !== "composition" && !configured) || (mode === "background" && !approved)} onClick={() => mode === "background" ? generate(variants.map(v => v.id)) : mode === "composition" ? resetCompositions() : generateWording()}>{generationRun ? <LoaderCircle className="spin" size={17} /> : mode === "composition" ? <RotateCcw size={17} /> : <Sparkles size={17} />}{generationRun ? "Preparing experiment…" : mode === "background" ? "Generate three backgrounds" : mode === "composition" ? "Reset composition presets" : mode === "headline" ? "Generate headline alternatives" : "Generate CTA alternatives"}</button></div>
        <section className={`experiment-brief ${briefOpen ? "open" : ""}`}><button className="brief-heading" onClick={() => setBriefOpen(!briefOpen)} aria-expanded={briefOpen}><span><FlaskConical size={18} /><b>Your experiment brief</b></span><span>3 variants × 3 formats <ChevronDown size={17} /></span></button>{briefOpen && <div className="brief-content"><div className="hypothesis-field"><label htmlFor="hypothesis">The hypothesis</label><textarea id="hypothesis" disabled={busy} value={hypothesis} onChange={e => update(p => ({ ...p, hypothesis: e.target.value }), "hypothesis")} rows={4} maxLength={800} /><span>Compare A/B/C within the same placement and format.</span></div><div className="brief-details"><div><span>Changing</span><b>{definition.variable}</b></div><div><span>Primary metric</span><b>Link click-through rate</b></div><div><span>Test setup</span><b>Randomized split, consistent targeting</b></div><div><span>Exports</span><b>9 PNGs + settings + brief</b></div></div><p className="brief-note"><Info size={14} /> Run the ads to learn which setting works. These previews contain no predicted results.</p></div>}</section>
        <div className="studio-bottom"><span><Check size={13} /> One selected variable across A/B/C in each format</span><span>{FORMATS[format].width} × {FORMATS[format].height} px</span></div>
      </section>
    </div>{notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}
    <dialog ref={modalRef} className="creative-dialog" onCancel={() => setSelected(null)} onClick={e => { if (e.target === modalRef.current) setSelected(null); }}><button className="dialog-close icon-button" aria-label="Close preview" onClick={() => setSelected(null)}><X size={20} /></button>{selected !== null && <><div className="dialog-title">Variant {String.fromCharCode(65 + selected)} — {FORMATS[format].label}</div><Creative project={project} variant={variants[selected]} isolate={isolate} guides={guides} onError={setError} /><button className="button button-primary" onClick={() => downloadOne(selected)} disabled={busy}><Download size={16} /> Download PNG</button></>}</dialog>
  </main>;
}
