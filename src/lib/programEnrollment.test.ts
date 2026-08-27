import { describe, expect, it } from "vitest";
import { ownerEnrollmentId } from "./programEnrollment";

describe("program enrollment helpers", () => {
  it("builds deterministic owner enrollment ids for migration/backfill safety", () => {
    expect(ownerEnrollmentId("module_123")).toBe("pe_owner_module_123");
  });
});
