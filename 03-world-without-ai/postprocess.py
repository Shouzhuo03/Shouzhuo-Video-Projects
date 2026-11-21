import argparse
from concurrent.futures import ProcessPoolExecutor
import functools
import json
import os
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image
from scipy import ndimage


def to_lin(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4).astype(np.float32)


def to_srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, 12.92 * x, 1.055 * x ** (1 / 2.4) - 0.055)


def screen_coords(cam, h, w):
    d, W, H, f, sc = cam['dpr'], cam['W'], cam['H'], cam['f'], cam['sc']
    A, B = cam['A'], cam['B']
    X, Y = np.meshgrid((np.arange(w) + 0.5) / d - W / 2, (np.arange(h) + 0.5) / d - H / 2)
    a11, a12 = f * A[0] + X * A[2], f * B[0] + X * B[2]
    a21, a22 = f * A[1] + Y * A[2], f * B[1] + Y * B[2]
    det = a11 * a22 - a12 * a21
    pu = (X * f * a22 - a12 * Y * f) / det
    pv = (a11 * Y * f - a21 * X * f) / det
    return cam['tx'] + pu / sc, cam['ty'] + pv / sc, pu * A[2] + pv * B[2]


def pixelate(img, iu, iv):
    iu, iv = iu - iu.min(), iv - iv.min()
    lab = (iv * (iu.max() + 1) + iu).ravel()
    n = np.maximum(np.bincount(lab), 1)
    out = np.empty_like(img)
    for c in range(3):
        out[..., c] = (np.bincount(lab, weights=img[..., c].ravel(), minlength=len(n)) / n)[lab].reshape(iu.shape)
    return out


def blur(img, sigma):
    if np.isscalar(sigma):
        return np.stack([ndimage.gaussian_filter(img[..., c], sigma) for c in range(3)], -1)
    lv = [0.0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16]
    lv = [s for s in lv if s <= sigma.max()] + [next((s for s in lv if s > sigma.max()), sigma.max())]
    pos = np.interp(sigma, lv, np.arange(len(lv)))
    out = np.zeros_like(img)
    for i, s in enumerate(lv):
        wgt = np.clip(1 - np.abs(pos - i), 0, 1)
        if not wgt.any():
            continue
        b = img if s == 0 else np.stack([ndimage.gaussian_filter(img[..., c], s) for c in range(3)], -1)
        out += b * wgt[..., None]
    return out


def bars(t, duty, sig, phases):
    out = [np.full(t.shape, duty, np.float32) for _ in phases]
    th = (2 * np.pi * t).astype(np.float32)
    c1, s1 = np.cos(th), np.sin(th)
    ck, sk = c1.copy(), s1.copy()
    kmax = int(min(32, np.ceil(0.75 / max(float(sig.min()), 1e-3))))
    for k in range(1, kmax + 1):
        amp = (2 * np.sin(np.pi * k * duty) / (np.pi * k)) * np.exp(-2 * np.pi ** 2 * k ** 2 * sig ** 2)
        for o, p in zip(out, phases):
            o += amp * (ck * np.float32(np.cos(2 * np.pi * k * p)) + sk * np.float32(np.sin(2 * np.pi * k * p)))
        ck, sk = ck * c1 - sk * s1, sk * c1 + ck * s1
    return out


def demosaic(raw):
    h, w = raw.shape
    r_ = np.zeros((h, w), bool); r_[0::2, 0::2] = True
    b_ = np.zeros((h, w), bool); b_[1::2, 1::2] = True
    g_r = np.zeros((h, w), bool); g_r[0::2, 1::2] = True
    g_b = np.zeros((h, w), bool); g_b[1::2, 0::2] = True
    K_G = np.array([[0, 0, -1, 0, 0], [0, 0, 2, 0, 0], [-1, 2, 4, 2, -1], [0, 0, 2, 0, 0], [0, 0, -1, 0, 0]]) / 8
    K_row = np.array([[0, 0, .5, 0, 0], [0, -1, 0, -1, 0], [-1, 4, 5, 4, -1], [0, -1, 0, -1, 0], [0, 0, .5, 0, 0]]) / 8
    K_diag = np.array([[0, 0, -1.5, 0, 0], [0, 2, 0, 2, 0], [-1.5, 0, 6, 0, -1.5], [0, 2, 0, 2, 0], [0, 0, -1.5, 0, 0]]) / 8
    cv = lambda k: ndimage.convolve(raw, k.astype(np.float32), mode='mirror')
    G, Hn, Vn, D = cv(K_G), cv(K_row), cv(K_row.T), cv(K_diag)
    R = np.where(r_, raw, np.where(g_r, Hn, np.where(g_b, Vn, D)))
    Gc = np.where(g_r | g_b, raw, G)
    Bc = np.where(b_, raw, np.where(g_b, Hn, np.where(g_r, Vn, D)))
    return np.stack([R, Gc, Bc], -1)


def shoulder(x, knee=0.8):
    over = np.maximum(x - knee, 0)
    return np.where(x > knee, knee + (1 - knee) * (1 - np.exp(-over / (1 - knee))), x)


def subpixels(U, V, su, sv, stripe, row, purity, strength):
    sub = bars(U - 0.5 / 3, stripe / 3, su, [0, 1 / 3, 2 / 3])
    (rows,) = bars(V - 0.5, row, sv, [0])
    sub = [s / (stripe / 3) for s in sub]
    mean = (sub[0] + sub[1] + sub[2]) / 3
    rows = rows / row
    mask = np.stack([(purity * s + (1 - purity) * mean) * rows for s in sub], -1)
    return 1 - strength + strength * mask


@functools.lru_cache(maxsize=8)
def refill_table(stripe, row, purity, strength, exposure):
    ph = (np.arange(96) + 0.5) / 96
    U, V = np.meshgrid(ph, ph)
    es, cs = np.linspace(0, 1, 17), np.linspace(0, 1, 33)
    k = np.zeros((len(es), len(cs)), np.float32)
    for i, e in enumerate(es):
        sg = np.full(U.shape, np.sqrt(-np.log(min(max(e, 1e-4), 0.9999)) / (2 * np.pi ** 2)), np.float32)
        m = subpixels(U, V, sg, sg, stripe, row, purity, strength)[..., 0]
        for j, c in enumerate(cs):
            y, t = shoulder(c * exposure * m).mean(), shoulder(np.float32(c * exposure), 0.9)
            k[i, j] = max(0.0, (t - y) / max(1 - y, 1e-4))
    return es, cs, k


def process(img, cam, density=2.0, strength=0.35, lens=0.3, dof=0.0, bayer=True,
            stripe=0.85, row=0.9, purity=0.95, exposure=1.0, steps=False, bright=True, refill=1.0):
    h, w = img.shape[:2]
    cx, cy, z = screen_coords(cam, h, w)
    U, V = cx * density, cy * density
    iu, iv = np.floor(U).astype(np.int64), np.floor(V).astype(np.int64)
    content = to_lin(pixelate(img, iu, iv) if steps else img)

    sig = np.float32(lens) if dof <= 0 else np.sqrt(lens ** 2 + (dof * np.abs(z) / (0.1 * cam['f'])) ** 2).astype(np.float32)
    content = blur(content, sig if dof > 0 else float(lens))


    gu = np.hypot(*np.gradient(U)).astype(np.float32)
    gv = np.hypot(*np.gradient(V)).astype(np.float32)
    eff = np.float32(sig) if np.isscalar(sig) else sig
    mask = subpixels(U, V, eff * gu, eff * gv, stripe, row, purity, strength)
    light = shoulder(content * mask * exposure)
    if bright:
        es, cs, k = refill_table(stripe, row, purity, strength, exposure)
        ei = np.interp(np.exp(-2 * np.pi ** 2 * (eff * gu) ** 2), es, np.arange(len(es)))
        for c in range(3):
            kk = ndimage.map_coordinates(k, [ei, np.interp(content[..., c], cs, np.arange(len(cs)))], order=1)
            light[..., c] += refill * kk.reshape(h, w) * (1 - light[..., c])
    if bayer:
        raw = np.empty((h, w), np.float32)
        raw[0::2, 0::2] = light[0::2, 0::2, 0]
        raw[0::2, 1::2] = light[0::2, 1::2, 1]
        raw[1::2, 0::2] = light[1::2, 0::2, 1]
        raw[1::2, 1::2] = light[1::2, 1::2, 2]
        light = demosaic(raw)
    return to_srgb(light)


DESCRIPTION = '对没有 AI 的世界线应用屏幕像素、摩尔纹和景深。'


def render_frame(file):
    camera = json.loads(file.read_text())
    image = read_image(file.with_name(f'{file.stem}_s0.png')) / 255
    before_code = round(camera['t'] * 30) < 1165
    processed = process(image, camera, density=1.4 if before_code else 2, dof=4.5,
                        refill=0.4 if before_code else 1)
    return np.round(processed * 255).astype(np.uint8).tobytes()

def frame_files(folder):
    frames = sorted(folder.glob('f_*.json'))
    if not frames:
        raise SystemExit('找不到帧文件。请先用 --frames 导出。')
    ids = [int(frame.stem[2:]) for frame in frames]
    if ids != list(range(ids[0], ids[0] + len(ids))):
        raise SystemExit('帧文件需要连续编号。')
    return frames, ids[0]


def read_image(file):
    with Image.open(file) as image:
        return np.asarray(image.convert('RGB'), dtype=np.float32)


def main():
    parser = argparse.ArgumentParser(description=DESCRIPTION)
    parser.add_argument('frames', type=Path)
    parser.add_argument('out', type=Path, help='输出 .mp4 或无损 .mov')
    audio_options = parser.add_mutually_exclusive_group()
    audio_options.add_argument('--audio', type=Path, help='与动画起点对齐的配乐，默认使用项目自带的配乐')
    audio_options.add_argument('--no-audio', action='store_true', help='导出无声视频')
    parser.add_argument('--jobs', type=int, default=2)
    args = parser.parse_args()
    if args.jobs < 1 or args.out.suffix.lower() not in {'.mov', '.mp4'}:
        parser.error('请指定 .mp4 或 .mov 输出，--jobs 至少为 1。')

    default_audio = Path(__file__).resolve().parent / 'assets' / 'soundtrack.m4a'
    if args.audio and not args.audio.is_file():
        parser.error(f'找不到配乐文件：{args.audio}')
    audio = None if args.no_audio else args.audio or (default_audio if default_audio.is_file() else None)

    files, first = frame_files(args.frames)
    with Image.open(files[0].with_name(files[0].stem + '_s0.png')) as image:
        w, h = image.size
    args.out.parent.mkdir(parents=True, exist_ok=True)
    lossless = args.out.suffix.lower() == '.mov'
    ffmpeg = [os.environ.get('FFMPEG_BIN', 'ffmpeg'), '-hide_banner', '-loglevel', 'error', '-y',
              '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', '30', '-i', '-']
    if audio:
        audio_filter = f'asetpts=PTS-STARTPTS,apad,atrim=duration={len(files) / 30}'
        ffmpeg += ['-ss', str(first / 30), '-i', str(audio), '-map', '0:v:0', '-map', '1:a:0',
                   '-c:a', 'pcm_s24le' if lossless else 'aac', '-af', audio_filter]
    ffmpeg += ['-c:v', 'png', '-pix_fmt', 'rgb24'] if lossless else [
        '-c:v', 'libx264', '-crf', '18', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709']
    with ProcessPoolExecutor(max_workers=args.jobs) as pool, subprocess.Popen(
        [*ffmpeg, '-movflags', '+faststart', str(args.out)], stdin=subprocess.PIPE
    ) as encoder:
        try:
            for frame in pool.map(render_frame, files):
                encoder.stdin.write(frame)
            encoder.stdin.close()
            if encoder.wait():
                raise SystemExit('FFmpeg 编码失败。')
        except BaseException:
            encoder.kill()
            raise


if __name__ == '__main__':
    main()
