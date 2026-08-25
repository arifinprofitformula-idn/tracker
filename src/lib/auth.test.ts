import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./validation";
import { canManageUser, canUseApp } from "./authorization";

describe("auth validation", () => {
  it("normalizes valid registration email by trimming and lowercasing", () => {
    const result = registerSchema.parse({ name: "Arifin", email: "ARIFIN@EXAMPLE.COM", password: "StrongPass123!" });
    expect(result.email).toBe("arifin@example.com");
  });
  it("strips whitespace from email", () => {
    const result = registerSchema.parse({ name: "Test", email: "  test@example.com  ", password: "StrongPass123!" });
    expect(result.email).toBe("test@example.com");
  });
  it("rejects weak passwords and malformed emails", () => {
    expect(registerSchema.safeParse({ name: "A", email: "bad", password: "password" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(false);
  });
});

describe("authorization", () => {
  it("permits active users and blocks suspended users", () => {
    expect(canUseApp({ status: "ACTIVE" })).toBe(true);
    expect(canUseApp({ status: "SUSPENDED" })).toBe(false);
  });
  it("only permits admins to manage users", () => {
    expect(canManageUser({ role: "ADMIN", status: "ACTIVE" })).toBe(true);
    expect(canManageUser({ role: "USER", status: "ACTIVE" })).toBe(false);
  });
});