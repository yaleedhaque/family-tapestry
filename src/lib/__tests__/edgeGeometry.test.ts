import { describe, it, expect } from "vitest";
import {
  buildChildPath,
  segmentsCross,
  crossingPoint,
  edgeShouldYield,
  computeHops,
  pathWithHops,
  edgeWouldCross,
  HOP_R,
} from "../edgeGeometry";

const e = (id: string, gen: number, opts: Partial<{ adopted: boolean; step: boolean; rem: boolean }> = {}) => {
  const meta: any = { id, generation: gen, path: { segments: [] } };
  if (opts.adopted) meta.isAdopted = true;
  if (opts.step) meta.isStep = true;
  if (opts.rem) meta.remarriageBoundary = true;
  return meta;
};

describe("buildChildPath", () => {
  it("produces the canonical 3-segment orthogonal path", () => {
    const p = buildChildPath(100, 0, 260, 300);
    expect(p.segments).toContainEqual({ x: 100, y0: 0, y1: 14 }); // vertical trunk
    expect(p.segments).toContainEqual({ y: 14, x0: 100, x1: 260 }); // horizontal jog
    expect(p.segments).toContainEqual({ x: 260, y0: 14, y1: 300 }); // vertical drop
    expect(p.segments.length).toBe(3);
  });
  it("collapses a straight vertical (child directly under source)", () => {
    const p = buildChildPath(100, 0, 100, 300);
    // trunk + drop collapse into one segment; no horizontal segment
    const verticals = p.segments.filter((s) => s.x != null);
    const horizontals = p.segments.filter((s) => s.y != null);
    expect(verticals.length).toBeGreaterThanOrEqual(1);
    expect(horizontals.length).toBe(0);
  });
});

describe("segmentsCross / crossingPoint", () => {
  it("detects an internal horizontal-vs-vertical crossing", () => {
    const h = { y: 10, x0: 0, x1: 100 };
    const v = { x: 50, y0: 0, y1: 100 };
    expect(segmentsCross(h, v)).toBe(true);
    expect(crossingPoint(h, v)).toEqual({ px: 50, py: 10 });
  });
  it("ignores endpoint touches (not internal crossings)", () => {
    // vertical spans y0..y1 with the horizontal exactly AT the endpoint
    expect(segmentsCross({ y: 0, x0: 0, x1: 100 }, { x: 50, y0: 0, y1: 100 })).toBe(false);
    expect(segmentsCross({ y: 10, x0: 50, x1: 100 }, { x: 50, y0: 0, y1: 100 })).toBe(false);
  });
  it("returns false for colinear / same-orientation segments", () => {
    expect(segmentsCross({ y: 5, x0: 0, x1: 100 }, { y: 5, x0: 20, x1: 80 })).toBe(false);
    expect(segmentsCross({ x: 5, y0: 0, y1: 100 }, { x: 5, y0: 20, y1: 80 })).toBe(false);
    expect(segmentsCross({ y: 5, x0: 0, x1: 100 }, { x: 5, y0: 0, y1: 100 })).toBe(true);
  });
});

describe("edgeShouldYield (priority)", () => {
  it("biological outranks adopted/step; adopted/step yields", () => {
    expect(edgeShouldYield(e("b", 1, { adopted: true }), e("a", 1))).toBe(true); // adopted yields to bio
    expect(edgeShouldYield(e("b", 1, { step: true }), e("a", 1))).toBe(true); // step yields to bio
    expect(edgeShouldYield(e("a", 1), e("b", 1, { adopted: true }))).toBe(false); // bio never yields
    expect(edgeShouldYield(e("a", 1), e("b", 1))).toBe(false); // equal -> lower id wins
  });
  it("remarriage/collapse boundary always yields", () => {
    expect(edgeShouldYield(e("a", 0, { rem: true }), e("b", 1))).toBe(true);
    expect(edgeShouldYield(e("a", 0), e("b", 1, { rem: true }))).toBe(false);
  });
  it("earlier generation outranks later generation", () => {
    expect(edgeShouldYield(e("root", 0), e("leaf", 4))).toBe(false); // lower id but later gen
    expect(edgeShouldYield(e("leaf", 4), e("root", 0))).toBe(true);
  });
  it("deterministic tiebreak by id", () => {
    expect(edgeShouldYield(e("a", 1), e("b", 1))).toBe(false); // a stays straight
    expect(edgeShouldYield(e("b", 1), e("a", 1))).toBe(true);
  });
});

describe("computeHops", () => {
  it("places a hop on the lower-priority edge when two child lines cross", () => {
    // a: a straight vertical child at x=0, b: a vertical child at x=40 -> clash on the
    // horizontal jog. Give a the higher row so its horizontal jog is at y, b lower row.
    const make = (id: string, sx: number, sy: number, tx: number, ty: number, gen = 1) => {
      const m = e(id, gen);
      m.path = buildChildPath(sx, sy, tx, ty);
      return m;
    };
    // a: source (0,0) -> target (0,100): pure vertical, no jog (dx=0) -> nothing to hop
    // b: source (40,0) -> target (100,100): jog at y=14 from 40..100
    // For a REAL crossing need a's horizontal (if any) to pierce b's vertical, or vice versa.
    const a = make("a", 40, 0, 40, 140); // vertical at x=40, y 0..140 (no horizontal)
    const b = make("b", 0, 0, 40, 140); // horizontal Y=14 that ENDS at x=40 -> endpoint touch (no cross)
    // Use a horizontal that PASSES THROUGH x=40:
    const b2 = make("b2", 0, 0, 100, 140); // horizontal y=14 from x=0..100 crosses a's vertical x=40
    const hops = computeHops([a, b2]);
    // a (yields? a gen=1, b2 gen=1, ids a<b2 -> a wins, b2 yields) -> hop on b2
    expect(hops.has("b2")).toBe(true);
    expect(hops.get("b2")![0]).toMatchObject({ px: 40, py: 14, vertical: false });
    expect(hops.has("a")).toBe(false);
  });

  it("is deterministic and idempotent regardless of input order", () => {
    const mk = (id: string, sx: number, sy: number, tx: number, ty: number) => {
      const m = e(id, 1);
      m.path = buildChildPath(sx, sy, tx, ty);
      return m;
    };
    const a = mk("a", 0, 0, 0, 150); // vertical x=0
    const b = mk("b", -50, 0, 60, 150); // horizontal y=14 crosses x=0
    const fwd = computeHops([a, b]);
    const rev = computeHops([b, a]);
    const key = (m: Map<string, any>) =>
      JSON.stringify(Array.from(m.entries()).sort(([x], [y]) => x.localeCompare(y)));
    expect(key(fwd)).toBe(key(rev));
  });

  it("respects HOP_PAIR_CAP guardrail (no hang on dense inputs)", () => {
    // Many crossing edges still complete quickly; just assert it returns a map
    const edges = Array.from({ length: 60 }, (_, i) => {
      const m = e(`e${i}`, i % 4);
      m.path = buildChildPath(i % 100, 0, (i * 7) % 300, 200);
      return m;
    });
    const hops = computeHops(edges);
    expect(hops).toBeInstanceOf(Map);
  });
});

describe("pathWithHops", () => {
  it("splices a horizontal hop as a downward semicircular arc", () => {
    const path = pathWithHops(0, 0, 100, 100, [{ px: 40, py: 14, vertical: false }]);
    const r = HOP_R;
    expect(path).toContain(`L ${40 - r},14`);
    expect(path).toContain(`A ${r},${r} 0 0 1 ${40 + r},14`);
  });
  it("leaves the path unchanged when there are no hops", () => {
    const p = pathWithHops(0, 0, 100, 100, []);
    expect(p).toBe("M 0,0 L 0,14 L 100,14 L 100,100");
  });
});

describe("edgeWouldCross (Group B foundation)", () => {
  it("detects whether a candidate path crosses any other path", () => {
    const candidate = buildChildPath(50, 0, 50, 200); // vertical at x=50
    const other = buildChildPath(0, 0, 120, 200); // horizontal y=14 crosses x=50
    expect(edgeWouldCross(candidate, [other])).toEqual({ px: 50, py: 14 });
    const clear = buildChildPath(300, 0, 300, 40);
    expect(edgeWouldCross(clear, [other])).toBeNull();
  });
});
