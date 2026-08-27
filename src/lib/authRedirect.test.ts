import { describe, expect, it } from "vitest";
import { safeAuthRedirect } from "./authRedirect";

describe("safeAuthRedirect",()=>{
 it("preserves an internal Coach invite continuation",()=>expect(safeAuthRedirect("/coach/invite/abc_123")).toBe("/coach/invite/abc_123"));
 it("rejects external and protocol-relative redirects",()=>{
  expect(safeAuthRedirect("https://evil.example")).toBe("/dashboard");
  expect(safeAuthRedirect("//evil.example/path")).toBe("/dashboard");
  expect(safeAuthRedirect("javascript:alert(1)")).toBe("/dashboard");
 });
});
