"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ArrowRight, Check, Layers2, LockKeyhole, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { Brand } from "./brand";
import { CONCEPTS } from "@/lib/experiment";

import { assetPath, DEMO_MODE, API_SETUP_URL, REPOSITORY_URL } from "@/lib/runtime";

export function MiniAd({ index, isolate = false }: { index: number; isolate?: boolean }) {
  const variant = CONCEPTS[index];
  return <div className={`mini-ad ${isolate ? "mini-isolate" : ""}`} style={{ backgroundColor: variant.color }}>
    {!isolate && <img className="ad-background" src={variant.image} alt="" />}
    <div className="ad-copy"><span className="ad-brand">morrow</span><strong>A little more<br />feel-good.</strong><span className="ad-subcopy">Your daily ritual, reimagined.</span></div>
    <img className="ad-product" src={assetPath("/assets/product.png")} alt="Illustrative Morrow skincare bottle, preserved across all three versions" />
    <span className="ad-cta">Find your ritual</span>
    {isolate && <span className="layer-lock"><LockKeyhole size={12} /> Same product layer</span>}
  </div>;
}

export function Landing() {
  const [isolate, setIsolate] = useState(false);
  const [active, setActive] = useState(0);
  const [faq, setFaq] = useState<number | null>(0);
  const questions = [
    { q: "Can I try it without an API key?", a: "Yes. The public demo includes example backgrounds, headlines and calls to action. Edit the creatives, preview placements and export PNGs or a ZIP. Live AI generation is available when you run TestBench locally with your own Meta Model API key; see the GitHub setup guide." },
    { q: "What can I test in this version?", a: "Choose one variable: background, product position and size, headline, or artwork CTA. Build A/B/C in three formats while keeping the other elements fixed. Preview the same experiment in Feed or Stories and compare results within one placement and format." },
    { q: "Does it tell me which ad will win?", a: "The experiment happens when you run your ads. TestBench prepares the assets and a test plan; it does not invent CTR predictions or declare a winner before you have real performance data." },
    { q: "Will the AI change my product?", a: "Your approved product cutout is reused as a fixed image layer. Background generation happens separately. Check the cutout before generation, especially around fine details, reflective surfaces and transparent packaging." },
    { q: "What can I export?", a: "Download a single PNG in the selected format, or a ZIP with nine creatives: three concepts in 1080 × 1350, 1080 × 1080 and 1080 × 1920. The kit includes your product layer, logo and experiment settings. Placement frames and guides are preview-only." },
    { q: "Will my work be saved?", a: "Your current draft, including generated images, is saved in this browser. Wait for the saved indicator before closing. Undo is available during the current editing session. Export a kit for a separate copy; clearing browser data removes the local draft." },
  ];
  return <main className="landing">
    <nav className="site-nav"><Brand /><div className="nav-links"><a href="#how-it-works">How it works</a><a href="#the-experiment">The experiment</a></div><Link href="/studio" className="button button-ink nav-cta">Open studio <ArrowUpRight size={16} /></Link></nav>
    <section className="hero">
      <div className="hero-intro"><h1>Give your next<br />creative a hypothesis.</h1><div className="hero-side"><p>One product. Three perspectives.<br />Build a focused creative experiment,<br className="desktop-break" /> with everything else held in place.</p><Link href="/studio" className="button button-primary">Build an experiment <ArrowUpRight size={18} /></Link><span className="hero-note">{DEMO_MODE ? "Interactive demo · No API key needed" : "Try it with our example product"}</span></div></div>
      <div className="hero-gallery">
        <div className="gallery-caption"><span className="tiny-square" /> A background experiment</div>
        <div className="triptych">
          {CONCEPTS.map((v, i) => <div className={`hero-artboard artboard-${i}`} key={v.id}><div className="artboard-top"><span><b>{String.fromCharCode(65 + i)}</b> {v.name}</span><span>4:5</span></div><MiniAd index={i} isolate={isolate} /></div>)}
        </div>
        <div className="gallery-controls"><span><LockKeyhole size={14} /> Product, copy & layout stay fixed</span><button className={`layer-toggle ${isolate ? "selected" : ""}`} onClick={() => setIsolate(!isolate)} aria-pressed={isolate}><Layers2 size={15} /> {isolate ? "Show backgrounds" : "Reveal fixed layers"}</button></div>
      </div>
      <div className="hero-foot"><span>For people who think in creative tests.</span><span>Built with Meta AI <span className="meta-mark" aria-hidden="true">∞</span></span></div>
    </section>

    <section className="principle-section" id="the-experiment">
      <div className="principle-copy"><span className="section-marker"><SlidersHorizontal size={18} /> A more deliberate way to create</span><h2>Change one thing.<br />Keep the question clear.</h2><p>When the product, message and setting all change, it’s hard to know what made the difference. Choose the element you want to test. Keep the others fixed and give your question three considered answers.</p><div className="variable-list"><Link href="/studio?test=background"><span className="variable-dot" /> Background concept <b>Test background</b></Link><Link href="/studio?test=composition"><SlidersHorizontal size={15} /> Product & composition <b>Test composition</b></Link><Link href="/studio?test=headline"><Layers2 size={15} /> Headline <b>Test headline</b></Link><Link href="/studio?test=cta"><ArrowUpRight size={15} /> Call to action <b>Test CTA</b></Link></div></div>
      <div className="compare-example"><div className="compare-frame"><MiniAd index={active} /><span className="compare-chip">Same product. New context.</span></div><div className="concept-tabs">{CONCEPTS.map((v, i) => <button key={v.id} className={active === i ? "active" : ""} onClick={() => setActive(i)} aria-pressed={active === i}><span style={{ backgroundColor: v.color }} />{v.name}</button>)}</div></div>
    </section>

    <section className="workflow-section" id="how-it-works"><div className="workflow-heading"><h2>From product photo<br />to a test worth running.</h2><p>A small, purposeful workflow.<br />Room for your creative judgement.</p></div><div className="workflow-steps">
      <article><span className="step-number">1</span><h3>Bring your product.</h3><p>Upload a photo, check the cutout and set your message. This becomes the constant in your experiment.</p><div className="step-visual cutout-visual"><img src={assetPath("/assets/product.png")} alt="Product cutout" /><span><Check size={13} /> Product layer ready</span></div></article>
      <article><span className="step-number">2</span><h3>Choose your variable.</h3><p>Test the background, product composition, headline or CTA. Explore three variants with the other elements fixed.</p><div className="step-visual swatch-visual"><i /><i /><i /><span>One question. Three considered answers.</span></div></article>
      <article><span className="step-number">3</span><h3>Take it to the test.</h3><p>Add your offer, preview the placement and export three formats. Run a controlled split test to answer your question.</p><div className="step-visual export-visual"><div><span>4:5</span><span>1:1</span><span>9:16</span></div><span>9 creatives + your experiment brief <ArrowUpRight size={16} /></span></div></article>
    </div></section>

    <section className="faq-section"><div><h2>A few things<br /> worth knowing.</h2><p>Clear expectations make better experiments.</p></div><div className="faq-list">{questions.map((item, i) => <div className="faq-item" key={item.q}><button onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i}>{item.q}{faq === i ? <Minus size={20} /> : <Plus size={20} />}</button>{faq === i && <p>{item.a}</p>}</div>)}</div></section>
    <section className="closing-cta"><div><h2>Your next creative<br />starts with a question.</h2><p>Give it a place to take shape.</p></div><Link href="/studio" className="button button-white">Open the studio <ArrowRight size={20} /></Link><span className="closing-shape" aria-hidden="true"><i /><i /><i /></span></section>
    <footer className="site-footer"><Brand /><span>A creative experiment studio.</span><a href={DEMO_MODE ? API_SETUP_URL : REPOSITORY_URL} target="_blank" rel="noreferrer">{DEMO_MODE ? "Run with your own API" : "View source on GitHub"} <ArrowUpRight size={13} /></a><a href="https://dev.meta.ai/" target="_blank" rel="noreferrer">Made with Meta AI <ArrowUpRight size={13} /></a></footer>
  </main>;
}


