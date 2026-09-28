import { rm } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DELETE, GET, POST } from "@/app/api/[...route]/route";
import { createSession, prisma } from "./prisma";
import { ensurePersonalWorkspace } from "./workspace";

const stamp = Date.now();
const uploadRoot = path.join(process.cwd(), ".local", `vision-image-test-${stamp}`);
const appOrigin = process.env.APP_URL || "http://localhost:3500";
let ownerId = "";
let outsiderId = "";
let moduleId = "";
let ownerToken = "";
let outsiderToken = "";
let imageId = "";

function request(pathname: string, token: string, init: { method?: string; body?: BodyInit } = {}) {
  const headers = new Headers();
  headers.set("origin", appOrigin);
  headers.set("cookie", `tracker_session=${token}`);
  return new NextRequest(`${appOrigin}${pathname}`, { method: init.method, body: init.body, headers });
}

describe("private tracker vision image API", () => {
  beforeAll(async () => {
    process.env.TRACKER_VISION_UPLOAD_DIR = uploadRoot;
    const owner = await prisma.user.create({ data: { email: `vision-owner-${stamp}@example.com`, name: "Vision Owner", passwordHash: "test" } });
    const outsider = await prisma.user.create({ data: { email: `vision-outsider-${stamp}@example.com`, name: "Vision Outsider", passwordHash: "test" } });
    ownerId = owner.id;
    outsiderId = outsider.id;
    const ownerWorkspace = await ensurePersonalWorkspace(owner);
    await ensurePersonalWorkspace(outsider);
    const tracker = await prisma.module.create({ data: { ownerId, workspaceId: ownerWorkspace.id, title: "Dream tracker", days: 40, activities: ["Move forward"] } });
    moduleId = tracker.id;
    ownerToken = (await createSession(ownerId)).token;
    outsiderToken = (await createSession(outsiderId)).token;
  });

  afterAll(async () => {
    if (ownerId) await prisma.user.delete({ where: { id: ownerId } });
    if (outsiderId) await prisma.user.delete({ where: { id: outsiderId } });
    await rm(uploadRoot, { recursive: true, force: true });
  });

  it("uploads, serves, and deletes only for the owning user", async () => {
    const bytes = await sharp({ create: { width: 800, height: 500, channels: 3, background: "#7f75ff" } }).jpeg().toBuffer();
    const body = new FormData();
    body.append("images", new File([Uint8Array.from(bytes)], "future-home.jpg", { type: "image/jpeg" }));
    const uploaded = await POST(request(`/api/trackers/${moduleId}/vision-images`, ownerToken, { method: "POST", body }));
    expect(uploaded.status).toBe(201);
    const payload = await uploaded.json() as { images: Array<{ id: string; width: number; height: number }> };
    expect(payload.images[0]).toMatchObject({ width: 800, height: 500 });
    imageId = payload.images[0].id;

    const ownerRead = await GET(request(`/api/trackers/${moduleId}/vision-images/${imageId}`, ownerToken));
    expect(ownerRead.status).toBe(200);
    expect(ownerRead.headers.get("content-type")).toBe("image/webp");

    const outsiderRead = await GET(request(`/api/trackers/${moduleId}/vision-images/${imageId}`, outsiderToken));
    expect(outsiderRead.status).toBe(404);
    const outsiderDelete = await DELETE(request(`/api/trackers/${moduleId}/vision-images/${imageId}`, outsiderToken, { method: "DELETE" }));
    expect(outsiderDelete.status).toBe(404);

    const ownerDelete = await DELETE(request(`/api/trackers/${moduleId}/vision-images/${imageId}`, ownerToken, { method: "DELETE" }));
    expect(ownerDelete.status).toBe(200);
    expect(await prisma.trackerVisionImage.count({ where: { id: imageId } })).toBe(0);
  });
});
