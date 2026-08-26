// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StartDatePicker from "./StartDatePicker";

afterEach(cleanup);

describe("StartDatePicker", () => {
  it("makes the full date field an explicit calendar action", () => {
    render(<StartDatePicker value={null} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /buka kalender tanggal mulai/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: /pilih tanggal mulai/i })).toBeInTheDocument();
  });

  it("shows a selected date in Indonesian and persists ISO value", async () => {
    const onChange = vi.fn();
    render(<StartDatePicker value="2026-08-26" onChange={onChange} />);
    expect(screen.getByText("26 Agustus 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /buka kalender tanggal mulai/i }));
    fireEvent.click(screen.getByRole("button", { name: "Pilih tanggal 2026-08-27" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("2026-08-27"));
  });
});
