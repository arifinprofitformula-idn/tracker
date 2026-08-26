"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type StartDatePickerProps = {
  value?: string | null;
  onChange: (value: string | null) => Promise<void> | void;
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIso(value?: string | null) {
  if (!value) return null;
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function StartDatePicker({ value, onChange }: StartDatePickerProps) {
  const selectedDate = parseIso(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);
  const yearOptions = useMemo(() => {
    const base = today.getFullYear();
    return Array.from({ length: 21 }, (_, idx) => base - 10 + idx);
  }, [today]);

  useEffect(() => {
    const parsed = parseIso(value);
    if (parsed) setViewDate(parsed);
  }, [value]);

  useEffect(() => {
    function closeFromOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("mousedown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, []);

  const days = useMemo(() => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 42 }, (_, idx) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + idx);
      return date;
    });
  }, [viewDate]);

  async function selectDate(date: Date) {
    setViewDate(date);
    setOpen(false);
    await onChange(toIso(date));
  }

  function moveMonth(step: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + step, 1));
  }

  const displayValue = selectedDate ? toIso(selectedDate) : "";

  return (
    <div className="date-picker" ref={wrapperRef}>
      <button className="date-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>{displayValue || "Pilih tanggal mulai"}</span>
        <small>YYYY-MM-DD</small>
      </button>

      {open && (
        <div className="calendar-popover" role="dialog" aria-label="Pilih tanggal mulai">
          <div className="calendar-toolbar">
            <button className="secondary icon-only" type="button" onClick={() => moveMonth(-1)} aria-label="Bulan sebelumnya">
              <ChevronLeft size={16} />
            </button>
            <div className="calendar-selects">
              <select
                aria-label="Pilih bulan"
                value={viewDate.getMonth()}
                onChange={(e) => setViewDate(new Date(viewDate.getFullYear(), Number(e.target.value), 1))}
              >
                {monthNames.map((month, idx) => (
                  <option key={month} value={idx}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                aria-label="Pilih tahun"
                value={viewDate.getFullYear()}
                onChange={(e) => setViewDate(new Date(Number(e.target.value), viewDate.getMonth(), 1))}
              >
                {yearOptions.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </div>
            <button className="secondary icon-only" type="button" onClick={() => moveMonth(1)} aria-label="Bulan berikutnya">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="calendar-weekdays">
            {dayNames.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((date) => {
              const inMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = selectedDate ? sameDay(date, selectedDate) : false;
              const isToday = sameDay(date, today);
              return (
                <button
                  key={toIso(date)}
                  className={`${inMonth ? "" : "muted-day"} ${isToday ? "today-day" : ""} ${isSelected ? "selected-day" : ""}`}
                  type="button"
                  onClick={() => selectDate(date)}
                  aria-pressed={isSelected}
                  aria-label={`Pilih tanggal ${toIso(date)}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="calendar-actions">
            <button className="secondary" type="button" onClick={() => selectDate(today)}>
              Hari ini
            </button>
            <button
              className="secondary"
              type="button"
              onClick={async () => {
                await onChange(null);
                setOpen(false);
              }}
            >
              Kosongkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
