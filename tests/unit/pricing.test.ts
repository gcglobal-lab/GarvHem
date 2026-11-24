import { describe, expect, it } from "vitest";
import {
  MAX_HEADCOUNT,
  PRICING_COUNTRY_NAMES,
  PRICING_ROLE_NAMES,
  estimateSavings,
  formatMoney,
} from "@/config/pricing";

describe("savings calculator", () => {
  it("offers the seven roles and two countries", () => {
    expect(PRICING_ROLE_NAMES).toHaveLength(7);
    expect(PRICING_COUNTRY_NAMES).toEqual(["USA", "Canada"]);
  });
  it("backs the 3 to 4 professionals claim for every combination", () => {
    for (const role of PRICING_ROLE_NAMES)
      for (const country of PRICING_COUNTRY_NAMES) {
        const r = estimateSavings({ role, country, headcount: 1 });
        expect(r.professionalsForOne, `${role} ${country}`).toBeGreaterThanOrEqual(3);
        expect(r.professionalsForOne).toBeLessThanOrEqual(4);
        expect(r.savings).toBe(r.localTotal - r.garvhemTotal);
        expect(r.savingsPercent).toBeGreaterThanOrEqual(60);
        expect(r.savingsPercent).toBeLessThanOrEqual(75);
      }
  });
  it("scales with headcount and clamps bad input", () => {
    const role = PRICING_ROLE_NAMES[0]!;
    const at = (headcount: number) => estimateSavings({ role, country: "USA", headcount });
    expect(at(4).savings).toBe(at(1).savings * 4);
    expect(at(0).headcount).toBe(1);
    expect(at(Number.NaN).headcount).toBe(1);
    expect(at(9999).headcount).toBe(MAX_HEADCOUNT);
  });
  it("formats each currency", () => {
    expect(formatMoney(97280, "USA")).toContain("97,280");
    expect(formatMoney(97280, "Canada")).toContain("97,280");
  });
});
