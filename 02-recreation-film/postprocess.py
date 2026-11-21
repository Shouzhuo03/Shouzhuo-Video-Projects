import argparse
from concurrent.futures import ProcessPoolExecutor
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


DESCRIPTION = '对复刻短片的倾斜镜头应用景深。'


def render_frame(file):
    camera = json.loads(file.read_text())
    frames = (read_image(file.with_name(f'{file.stem}_s{i}.png')) for i in range(camera['sub']))
    image = sum(frames) / (255 * camera['sub'])
    if abs(camera['A'][2]) >= 1e-9 or abs(camera['B'][2]) >= 1e-9:
        _, _, z = screen_coords(camera, *image.shape[:2])
        sigma = (4.5 * np.abs(z) / (0.1 * camera['f'])).astype(np.float32)
        image = to_srgb(blur(to_lin(image), sigma))
    return np.round(image * 255).astype(np.uint8).tobytes()

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
    parser.add_argument('--audio', type=Path, help='与动画起点对齐的配乐')
    parser.add_argument('--jobs', type=int, default=2)
    args = parser.parse_args()
    if args.jobs < 1 or args.out.suffix.lower() not in {'.mov', '.mp4'}:
        parser.error('请指定 .mp4 或 .mov 输出，--jobs 至少为 1。')
    if args.audio and not args.audio.is_file():
        parser.error(f'找不到配乐文件：{args.audio}')

    files, first = frame_files(args.frames)
    with Image.open(files[0].with_name(files[0].stem + '_s0.png')) as image:
        w, h = image.size
    args.out.parent.mkdir(parents=True, exist_ok=True)
    lossless = args.out.suffix.lower() == '.mov'
    ffmpeg = [os.environ.get('FFMPEG_BIN', 'ffmpeg'), '-hide_banner', '-loglevel', 'error', '-y',
              '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', '30', '-i', '-']
    if args.audio:
        audio_filter = f'asetpts=PTS-STARTPTS,apad,atrim=duration={len(files) / 30}'
        ffmpeg += ['-ss', str(first / 30), '-i', str(args.audio), '-map', '0:v:0', '-map', '1:a:0',
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
