"""Regenerate LANDLOGY brand raster assets from the canonical SVG geometry.

Reads public/brand/landlogy-mark.svg geometry is mirrored here (same A-mark
proportions) and renders crisp PNGs with Pillow:
  - public/brand/landlogy-icon-192.png (192x192, ink tile)
  - public/brand/landlogy-icon-512.png (512x512, ink tile)
  - public/brand/landlogy-apple-touch-icon.png (180x180, ink tile)

The served PWA/favicon paths (public/icon-*.png, apple-touch-icon.png,
favicon.svg) are branding-only copies of these canonical renders.

Only run when the canonical mark geometry changes.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "public" / "brand"

INK = (25, 23, 36, 255)
GOLD = (255, 180, 0, 255)

# A-mark geometry in a 64x64 box (mirrors landlogy-mark.svg)
LEGS = [(32, 7), (56, 57), (47.5, 57), (32, 20.4), (16.5, 57), (8, 57)]
BAR = (21.2, 41.5, 21.6, 4.4)
CELLS = [
    (27.2, 27.4, 4.1, 4.1),
    (32.7, 27.4, 4.1, 4.1),
    (27.2, 32.9, 4.1, 4.1),
    (32.7, 32.9, 4.1, 4.1),
]


def draw_mark(draw: ImageDraw.ImageDraw, scale: float, ox: float, oy: float) -> None:
    def pt(x: float, y: float) -> tuple[float, float]:
        return (ox + x * scale, oy + y * scale)

    draw.polygon([pt(x, y) for x, y in LEGS], fill=GOLD)
    x, y, w, h = BAR
    draw.rounded_rectangle(
        [ox + x * scale, oy + y * scale, ox + (x + w) * scale, oy + (y + h) * scale],
        radius=scale,
        fill=GOLD,
    )
    for cx, cy, cw, ch in CELLS:
        draw.rounded_rectangle(
            [
                ox + cx * scale,
                oy + cy * scale,
                ox + (cx + cw) * scale,
                oy + (cy + ch) * scale,
            ],
            radius=0.6 * scale,
            fill=GOLD,
        )


def render(size: int, pad_ratio: float = 0.16) -> Image.Image:
    img = Image.new("RGBA", (size, size), INK)
    draw = ImageDraw.Draw(img)
    box = size * (1 - 2 * pad_ratio)
    draw_mark(draw, box / 64.0, size * pad_ratio, size * pad_ratio)
    return img


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    targets = {
        "landlogy-icon.png": 192,
        "landlogy-icon.png": 512,
        "landlogy-icon.png": 180,
    }
    for name, size in targets.items():
        path = BRAND / name
        render(size).save(path)
        print(f"wrote {path} ({size}x{size})")


if __name__ == "__main__":
    main()
