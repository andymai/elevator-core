import { describe, expect, it } from "vitest";
import { STAGES, type StageSection } from "../features/quest";

// The stage-grid navigator groups stages into curriculum sections
// (basics → strategies → events-manual → topology) and uses the
// `Stage.section` field as the grouping key. The dom-rendering side
// is verified manually (the playground's vitest env runs without a
// DOM and the surrounding feature tests follow the same surface-only
// pattern). These tests pin the schema-level contracts the grid
// depends on:
//
//   1. Every stage carries a section.
//   2. Section values land in the union type — typo'd values would
//      compile-error elsewhere, but the runtime check here also
//      guards against future extensions of the union that someone
//      forgot to map.
//   3. Section ordering matches the curriculum's intended pedagogy:
//      stages within each section are contiguous in the registry,
//      and sections appear in the documented order.

const VALID_SECTIONS: ReadonlyArray<StageSection> = [
  "basics",
  "strategies",
  "events-manual",
  "topology",
];

describe("quest: stage sections", () => {
  it("every stage declares a section", () => {
    for (const stage of STAGES) {
      expect(stage.section, `stage ${stage.id} missing section`).toBeDefined();
    }
  });

  it("every section is one of the curriculum's known categories", () => {
    for (const stage of STAGES) {
      expect(VALID_SECTIONS, `stage ${stage.id} has unknown section ${stage.section}`).toContain(
        stage.section,
      );
    }
  });

  it("stages within a section are contiguous in display order", () => {
    // The grid renders sections in the order they first appear in
    // STAGES. Non-contiguous sections would either re-render the
    // same section header twice or split a section across the grid.
    // Pin contiguity so a future re-shuffle can't silently break
    // either invariant.
    const seen = new Set<StageSection>();
    let lastSection: StageSection | null = null;
    for (const stage of STAGES) {
      if (stage.section !== lastSection) {
        expect(
          seen.has(stage.section),
          `stage ${stage.id} restarts section ${stage.section} after another section`,
        ).toBe(false);
        seen.add(stage.section);
        lastSection = stage.section;
      }
    }
  });

  it("sections render in pedagogical order", () => {
    const firstByOrder: StageSection[] = [];
    const seen = new Set<StageSection>();
    for (const stage of STAGES) {
      if (!seen.has(stage.section)) {
        firstByOrder.push(stage.section);
        seen.add(stage.section);
      }
    }
    // basics → strategies → events-manual → topology. A future
    // section gets appended; this assert flags a re-order so the
    // grid module's `SECTION_ORDER` can be re-pinned to match.
    expect(firstByOrder).toEqual(["basics", "strategies", "events-manual", "topology"]);
  });
});
