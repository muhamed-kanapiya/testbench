"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send, ThumbsUp, X, ChevronRight } from "lucide-react";
import { renderCreative } from "@/lib/canvas";
import { FORMATS, guideInsets, type FormatId, type Placement, type Project } from "@/lib/studio-model";
import type { Variant } from "@/lib/experiment";
import { resolveVariant } from "@/lib/experiment-modes";

export function Creative({ project, variant, format = project.format, isolate = false, guides = false, onError }: { project: Project; variant: Variant; format?: FormatId; isolate?: boolean; guides?: boolean; onError: (message: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const { product } = project;
  const resolved = useMemo(() => resolveVariant(project, Math.max(0, project.variants.findIndex(v => v.id === variant.id))), [project, variant.id]);
  const { offer, overlays, composition, headlineAlternatives, ctaAlternatives } = resolved;
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const canvas = document.createElement("canvas");
        const report = await renderCreative(canvas, product, resolved.variant, offer, { format, overlays, isolate, composition, headlineAlternatives, ctaAlternatives });
        if (!cancelled && ref.current) { ref.current.width = canvas.width; ref.current.height = canvas.height; ref.current.getContext("2d")?.drawImage(canvas, 0, 0); setIssues(report.issues); }
      } catch (e) { if (!cancelled) onError(e instanceof Error ? e.message : "Preview could not be rendered."); }
    }, 80);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [product, resolved, offer, overlays, composition, headlineAlternatives, ctaAlternatives, format, isolate, onError]);
  const inset = guideInsets(format);
  return <div className="creative-render"><div className="artwork-surface" style={{ aspectRatio: `${FORMATS[format].width}/${FORMATS[format].height}` }}>
    <canvas ref={ref} className="creative-canvas" width={FORMATS[format].width} height={FORMATS[format].height} aria-label={`${resolved.variant.name}, ${FORMATS[format].label} advertisement. ${offer.headline}. CTA: ${offer.cta}`} role="img" />
    {guides && <div className="safe-guide" aria-label="Composition guide, preview only" style={{ top: `${inset.top}%`, bottom: `${inset.bottom}%`, left: `${inset.side}%`, right: `${inset.side}%` }}><span>Keep key content inside</span></div>}
  </div>{issues.length > 0 && <p className="render-issue" role="alert">{issues[0]}</p>}</div>;
}
function Avatar({ project }: { project: Project }) {
  return <span className="social-avatar" style={{ backgroundColor: project.overlays.accent }}>{project.overlays.logo ? <img src={project.overlays.logo} alt="" /> : <b>{project.offer.brand.trim().slice(0, 1).toLowerCase() || "b"}</b>}</span>;
}
export function PlacementPreview({ project, variant, placement, guides, onError }: { project: Project; variant: Variant; placement: Placement; guides: boolean; onError: (message: string) => void }) {
  const story = placement === "stories", facebook = placement === "facebook";
  return <div className={`social-preview ${story ? "social-story" : "social-feed"} ${facebook ? "social-facebook" : ""}`}>
    {story ? <>
      <Creative project={project} variant={variant} format="story" guides={guides} onError={onError} />
      <div className="story-top"><div className="story-progress"><i /><i /><i /></div><div className="social-profile"><Avatar project={project} /><div><b>{project.offer.brand}</b><span>Sponsored</span></div><MoreHorizontal size={18} /><X size={20} /></div></div>
      <div className="story-bottom"><p>{project.caption.slice(0, 120)}{project.caption.length > 120 ? "…" : ""}</p><span className="story-action">{project.offer.cta} <ChevronRight size={16} /></span><span className="story-reply">Send message <Heart size={20} /><Send size={19} /></span></div>
    </> : <>
      <div className="social-profile"><Avatar project={project} /><div><b>{project.offer.brand}</b><span>Sponsored{facebook ? " · Public" : ""}</span></div><MoreHorizontal size={20} /></div>
      {facebook && <p className="social-caption top-caption">{project.caption}</p>}
      <Creative project={project} variant={variant} guides={guides} onError={onError} />
      <div className="feed-cta"><span>{facebook ? project.offer.headline.replaceAll("\n", " ") : project.offer.cta}</span>{facebook ? <b>{project.offer.cta}</b> : <ChevronRight size={18} />}</div>
      <div className="social-actions" aria-hidden="true">{facebook ? <><span><ThumbsUp size={19} /> Like</span><span><MessageCircle size={19} /> Comment</span><span><Send size={18} /> Share</span></> : <><Heart size={22} /><MessageCircle size={22} /><Send size={21} /><Bookmark className="bookmark" size={22} /></>}</div>
      {!facebook && <p className="social-caption"><b>{project.offer.brand}</b> {project.caption}</p>}
    </>}
  </div>;
}
