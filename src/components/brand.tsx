import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="TestBench home"><span className="brand-symbol" aria-hidden="true"><i /><i /><i /><i /></span><span>testbench<span className="brand-period">.</span></span></Link>;
}
