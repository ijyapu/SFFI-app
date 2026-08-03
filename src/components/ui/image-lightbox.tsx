"use client";

import { useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

function clampScale(n: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, n));
}

type Props = {
  src: string;
  alt?: string;
  /** Wrapper className for the clickable trigger (not the dialog). */
  className?: string;
  /** Custom trigger content — defaults to a plain <img> thumbnail using `thumbnailClassName`. */
  children?: React.ReactNode;
  thumbnailClassName?: string;
  /** Native hover tooltip on the trigger button. */
  title?: string;
};

/**
 * Wraps an already-uploaded photo so clicking it opens a full-screen,
 * zoomable/pannable preview. Wrap any thumbnail (next/image or plain img)
 * with `children`, or omit it to render a default <img> thumbnail.
 */
export function ImageLightbox({ src, alt = "Photo", className, children, thumbnailClassName, title }: Props) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(MIN_SCALE);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  function resetView() {
    setScale(MIN_SCALE);
    setPos({ x: 0, y: 0 });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetView();
  }

  function zoomBy(delta: number) {
    setScale((prev) => {
      const next = clampScale(prev + delta);
      if (next === MIN_SCALE) setPos({ x: 0, y: 0 });
      return next;
    });
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
  }

  function handleDoubleClick() {
    if (scale > MIN_SCALE) {
      resetView();
    } else {
      setScale(2.5);
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (scale <= MIN_SCALE) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    drag.current = { x: pos.x, y: pos.y, startX: e.clientX, startY: e.clientY };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setPos({
      x: drag.current.x + (e.clientX - drag.current.startX),
      y: drag.current.y + (e.clientY - drag.current.startY),
    });
  }

  function handlePointerUp() {
    drag.current = null;
    setDragging(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("block cursor-zoom-in", className)}
        aria-label={`View ${alt} full size`}
        title={title}
      >
        {children ?? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className={cn("rounded-lg border border-border object-cover", thumbnailClassName)} />
        )}
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/90 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Popup
            className="fixed inset-0 z-50 flex flex-col outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
            onWheel={handleWheel}
          >
            <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>

            {/* Toolbar */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1.5 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => zoomBy(-ZOOM_STEP)}
                disabled={scale <= MIN_SCALE}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Zoom out"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-11 text-center text-xs tabular-nums text-white/90">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => zoomBy(ZOOM_STEP)}
                disabled={scale >= MAX_SCALE}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Zoom in"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={resetView}
                disabled={scale === MIN_SCALE && pos.x === 0 && pos.y === 0}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Reset zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <DialogPrimitive.Close
                className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/15"
                title="Close"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div
              className={cn(
                "flex flex-1 touch-none items-center justify-center overflow-hidden select-none",
                scale > MIN_SCALE ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onDoubleClick={handleDoubleClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded image, unknown aspect ratio, zoomed via CSS transform */}
              <img
                src={src}
                alt={alt}
                draggable={false}
                className={cn("max-h-[92vh] max-w-[96vw] object-contain", !dragging && "transition-transform duration-150 ease-out")}
                style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
              />
            </div>

            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-[11px] text-white/60">
              Scroll or +/− to zoom · drag to pan · double-click to reset
            </p>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
