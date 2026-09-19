"""Extract the EXACT A-symbol from the original LANDLOGY logo asset.

Source of truth: seller-website/src/assets/Logo.png (the original uploaded
LANDLOGY logo — green triangular "A" with integrated navy 4-square window).

Nothing is redrawn or reinterpreted: pixels belonging to the A (green legs +
navy window squares) are segmented by color masks, cropped, and composited
onto square tiles at the three required sizes:
  - public/icon-192.png (192x192)
  - public/icon-512.png (512x512)
  - public/apple-touch-icon.png (180x180)

Only run when the source logo changes.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "seller-website" / "src" / "assets" / "Logo.png"
PUBLIC = ROOT / "public"
INK = (25, 23, 36, 255)


def is_a_pixel(r: int, g: int, b: int) -> bool:
    green_leg = g - r > 40 and g - b > 15 and g > 80
    navy_window = b > 70 and r < 110 and b > r + 20
    return green_leg or navy_window


def isolate_a() -> Image.Image:
    src = Image.open(SRC).convert("RGBA")
    bg = Image.new("RGBA", src.size, (255, 255, 255, 255))
    bg.alpha_composite(src)
    w, h = bg.size
    px = bg.load()
    assert px is not None
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    assert mp is not None

    # Pass 1 — green A legs only (navy letters excluded: navy is not green).
    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            if g - r > 40 and g - b > 15 and g > 80:
                mp[x, y] = 255

    # Drop the underline bar: it is the only green run spanning the full logo
    # width in its row. Leg slices only ever span the A width (~150px).
    for y in range(h):
        run_min, run_max, count = w, -1, 0
        for x in range(w):
            if mp[x, y]:
                count += 1
                if x < run_min:
                    run_min = x
                if x > run_max:
                    run_max = x
        if count > 0 and run_max - run_min > 260:
            for x in range(run_min, run_max + 1):
                mp[x, y] = 0

    # Keep only the largest connected green component = the A legs. This drops
    # any stray green speckles anywhere else on the canvas.
    seen = [[False] * w for _ in range(h)]
    best: list[tuple[int, int]] = []
    for sy in range(h):
        for sx in range(w):
            if not mp[sx, sy] or seen[sy][sx]:
                continue
            stack = [(sx, sy)]
            seen[sy][sx] = True
            comp = [(sx, sy)]
            while stack:
                cx, cy = stack.pop()
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if 0 <= nx < w and 0 <= ny < h and mp[nx, ny] and not seen[ny][nx]:
                            seen[ny][nx] = True
                            stack.append((nx, ny))
                            comp.append((nx, ny))
            if len(comp) > len(best):
                best = comp
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    assert mp is not None
    for x, y in best:
        mp[x, y] = 255

    bbox = mask.getbbox()
    if bbox is None:
        raise RuntimeError("A-symbol not found in source logo")
    leg_left, leg_top, leg_right, leg_bottom = bbox
    print(f"legs bbox: {(leg_left, leg_top, leg_right, leg_bottom)}")

    # Pass 2 — navy 4-square window: strictly inside the leg span, below the
    # apex and above the leg feet (tagline/letters sit outside this band).
    apex_y = leg_top + int((leg_bottom - leg_top) * 0.30)
    for y in range(apex_y, leg_bottom + 1):
        for x in range(leg_left, leg_right):
            r, g, b, _a = px[x, y]
            if b > 70 and r < 110 and b > r + 20:
                mp[x, y] = 255

    # Final frame: leg span plus a small breathing margin, bottom extended to
    # the window squares; everything outside the mask becomes transparent so
    # only the exact extracted A pixels survive.
    margin = max(6, (leg_right - leg_left) // 14)
    frame = (
        max(0, leg_left - margin),
        max(0, leg_top - margin),
        min(w, leg_right + margin),
        min(h, leg_bottom + margin),
    )
    print(f"frame: {frame}")
    out = Image.new("RGBA", (frame[2] - frame[0], frame[3] - frame[1]), (0, 0, 0, 0))
    out.paste(bg.crop(frame), mask.crop(frame))
    return out


def tile(size: int, crop: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), INK)
    pad = int(size * 0.14)
    box = size - 2 * pad
    ratio = min(box / crop.width, box / crop.height)
    mark = crop.resize((int(crop.width * ratio), int(crop.height * ratio)), Image.LANCZOS)
    canvas.alpha_composite(
        mark, ((size - mark.width) // 2, (size - mark.height) // 2)
    )
    return canvas.convert("RGB")


def main() -> None:
    crop = isolate_a()
    print(f"A-symbol crop: {crop.size}")
    for name, size in (
        ("icon-192.png", 192),
        ("icon-512.png", 512),
        ("apple-touch-icon.png", 180),
    ):
        path = PUBLIC / name
        tile(size, crop).save(path)
        print(f"wrote {path} ({size}x{size})")


if __name__ == "__main__":
    main()
