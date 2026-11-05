"use client";
import { LockKeyhole, RotateCcw } from "lucide-react";
import { MODES, modeIssue, switchMode } from "@/lib/experiment-modes";
import type { ExperimentMode, Project } from "@/lib/studio-model";
import { DEMO_MODE } from "@/lib/runtime";

type Update = (change: (p: Project) => Project, group?: string) => void;

export function ExperimentControls({ project, update, busy, configured, onRegenerate }: { project: Project; update: Update; busy: boolean; configured: boolean; onRegenerate: () => void }) {
  const mode = project.test.mode, issue = modeIssue(project);
  return <section className="experiment-selector" aria-label="Experiment variable"><div className="experiment-selector-heading"><h3>What are you testing?</h3><span>One variable per experiment</span></div>
    <div className="mode-options">{(Object.keys(MODES) as ExperimentMode[]).map(key => <button key={key} disabled={busy} aria-pressed={mode === key} onClick={() => update(p => switchMode(p, key))}>{MODES[key].label}</button>)}</div>
    <p>{MODES[mode].description}</p>
    {mode !== "background" && <div className="shared-background"><label><LockKeyhole size={13} /> Shared background<select disabled={busy} value={project.test.sharedBackground} onChange={e => update(p => ({ ...p, test: { ...p.test, sharedBackground: e.target.value as Project["test"]["sharedBackground"] } }))}>{project.variants.map(v => <option key={v.id} value={v.id}>{v.name}{v.source === "meta" ? " · generated" : " · example"}</option>)}</select></label><button className="text-button" disabled={busy || (!configured && !DEMO_MODE) || !project.approved} onClick={onRegenerate}><RotateCcw size={12} /> {DEMO_MODE ? "Restore sample background" : "Regenerate shared background"}</button></div>}
    {issue && <p className="experiment-draft-note">{issue}</p>}
    {mode === "cta" && <p className="mode-footnote">The CTA inside the image changes. The platform button and post caption stay fixed.</p>}
  </section>;
}
export function VariantEditor({ project, index, update, busy }: { project: Project; index: number; update: Update; busy: boolean }) {
  const mode = project.test.mode, letter = String.fromCharCode(65 + index);
  if (mode === "background") return null;
  const composition = project.test.compositions[index];
  if (mode === "composition") return <fieldset className="variant-test-editor" disabled={busy}><legend>Composition {letter}</legend><label>Horizontal position <span>{composition.x}%</span><input aria-label={`Product position ${letter}`} type="range" min={45} max={75} step={1} value={composition.x} onChange={e => update(p => ({ ...p, test: { ...p.test, compositions: p.test.compositions.map((c, i) => i === index ? { ...c, x: Number(e.target.value) } : c) } }), `position-${index}`)} /></label><label>Product size <span>{composition.scale}%</span><input aria-label={`Product size ${letter}`} type="range" min={65} max={100} step={1} value={composition.scale} onChange={e => update(p => ({ ...p, test: { ...p.test, compositions: p.test.compositions.map((c, i) => i === index ? { ...c, scale: Number(e.target.value) } : c) } }), `size-${index}`)} /></label><p>Only product position and size change.</p></fieldset>;
  const field = mode === "headline" ? "headlines" : "ctas", sourceField = mode === "headline" ? "headlineSources" : "ctaSources";
  const limit = mode === "headline" ? 70 : 24, value = project.test[field][index];
  function change(text: string) {
    update(p => ({ ...p, offer: index === 0 ? { ...p.offer, [mode === "headline" ? "headline" : "cta"]: text } : p.offer,
      test: { ...p.test, [field]: p.test[field].map((v, i) => i === index ? text : v), [sourceField]: p.test[sourceField].map((v, i) => i === index ? "manual" : v) } }), `${mode}-${index}`);
  }
  return <fieldset className="variant-test-editor" disabled={busy}><legend>{mode === "headline" ? "Headline" : "Artwork CTA"} {letter}</legend><label className="variant-copy-label">{mode === "headline" ? <textarea aria-label={`Headline ${letter}`} value={value} rows={3} maxLength={limit} onChange={e => change(e.target.value)} /> : <input aria-label={`CTA ${letter}`} value={value} maxLength={limit} onChange={e => change(e.target.value)} />}</label><div className="variant-copy-meta"><span>{index === 0 ? "Baseline" : project.test[sourceField][index] === "meta" ? "Meta suggestion · review wording" : project.test[sourceField][index] === "manual" ? "Edited by you" : project.test[sourceField][index] === "example" ? "Curated example · editable" : "Add an alternative"}</span><span>{value.length}/{limit}</span></div></fieldset>;
}
