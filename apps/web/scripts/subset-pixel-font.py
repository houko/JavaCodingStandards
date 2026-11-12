"""Subset Fusion Pixel 12px for the retro theme.

The retro theme sets every glyph in Fusion Pixel (https://github.com/TakWolf/fusion-pixel-font, SIL OFL 1.1). The full fonts are several MB each, so this keeps only the characters the site can show: every character in the UI copy (locales/*.json), the catalog data and the retro components, plus printable ASCII and common CJK punctuation. A character outside the subset (say, in a newly submitted app name) falls back to the system CJK font.

Run it again whenever new copy or catalog entries add characters:

    gh release download <tag> -R TakWolf/fusion-pixel-font -p 'fusion-pixel-font-12px-proportional-otf.woff2-*.zip' -p 'fusion-pixel-font-12px-monospaced-otf.woff2-*.zip'
    unzip the two archives into <src>/prop and <src>/mono
    uv run --with 'fonttools[woff]' python -I apps/web/scripts/subset-pixel-font.py <src>

The output goes to apps/web/public/fonts/.
"""

import shutil
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'apps/web/public/fonts'

# Files whose characters can appear on a retro page.
SOURCES = [
    *sorted((ROOT / 'packages/catalog/locales').glob('*.json')),
    *sorted((ROOT / 'packages/catalog/data').glob('*.json')),
    *sorted((ROOT / 'apps/web/src/retro').rglob('*.tsx')),
    *sorted((ROOT / 'apps/web/src/retro').rglob('*.ts')),
]

# Proportional faces, one per script variant the site serves; the page loads only the one for its language.
PROP = {'zh_hans': 'zh-CN', 'zh_tw': 'zh-TW', 'ja': 'ja', 'ko': 'ko'}

EXTRA = ''.join(chr(c) for c in range(0x20, 0x7F)) + '　、。，．・：；？！「」『』（）〔〕［］｛｝〈〉《》【】…—–‐～〜·•→←↑↓↗↘✓×÷±°％＃＆＊＠￥＄€£©®™'


def chars() -> str:
    seen = set(EXTRA)
    for path in SOURCES:
        seen.update(path.read_text(encoding='utf-8'))
    return ''.join(sorted(c for c in seen if c.isprintable() or c == '　'))


def cut(src: Path, dst: Path, text: str) -> None:
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    font = subset.load_font(str(src), opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    subset.save_font(font, str(dst), opts)
    print(f'{dst.name}: {dst.stat().st_size // 1024} KB')


def main() -> None:
    src = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    text = chars()
    print(f'{len(text)} characters')
    for variant in PROP:
        cut(src / f'prop/fusion-pixel-12px-proportional-{variant}.otf.woff2', OUT / f'fusion-pixel-12px-{variant}.woff2', text)
    # Code and numbers use the monospaced Latin face; it only needs ASCII.
    cut(src / 'mono/fusion-pixel-12px-monospaced-latin.otf.woff2', OUT / 'fusion-pixel-12px-mono-latin.woff2', EXTRA)
    shutil.copyfile(src / 'prop/OFL.txt', OUT / 'fusion-pixel-OFL.txt')


if __name__ == '__main__':
    main()
