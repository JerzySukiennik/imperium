#!/usr/bin/env python3
"""Imperium Gzowianskie: cut, level and convert the chosen Freesound CC0 recordings into assets/audio/ and write the credits."""
import json, os, re, shutil, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RAW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'Niepotrzebne', 'audio-src')
KEEP = os.path.join(ROOT, 'Niepotrzebne', 'audio-src')
OUT = os.path.join(ROOT, 'assets', 'audio')
PICKS = {
    'dice': ('629982', 0, 1.2), 'hop': ('546121', 0, .35), 'coins': ('469182', 0, 1.4), 'register': ('83915', 0, 2.4), 'flip': ('793598', 0, .8), 'tear': ('848460', 0, 1.3),
    'chime': ('539915', 0, 1.4), 'heli': ('534855', 12, 3.4), 'rocket': ('730041', 0, 4.2), 'fail': ('369873', 0, 3.2), 'hail': ('452499', 20, 3.2), 'boom': ('372086', 0, 3),
    'hammer': ('342542', 0, 1.4), 'saw': ('595765', 2, 2.6), 'bell': ('96521', 0, 2.2), 'fanfare': ('242207', 0, 6), 'click': ('629020', 0, .29), 'digger': ('606943', 5, 3),
    'dog': ('630648', 0, 1.4), 'cat': ('763906', 0, 1.6), 'goat': ('581240', 0, 2.2), 'narew': ('632620', 30, 45),
}
meta = {m['id']: m for m in json.load(open(os.path.join(RAW, 'index.json')))} if os.path.exists(os.path.join(RAW, 'index.json')) else {}
os.makedirs(OUT, exist_ok=True)
os.makedirs(KEEP, exist_ok=True)
credits, manifest = [], {}
for name, (sid, start, dur) in PICKS.items():
    src = os.path.join(RAW, sid + '.mp3')
    kept = os.path.join(KEEP, sid + '.mp3')
    if os.path.abspath(src) != os.path.abspath(kept) and os.path.exists(src):
        shutil.copy2(src, kept)
    loop = name == 'narew'
    chain = ([] if start or loop else ['silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.01']) + [f'atrim=0:{dur}', 'asetpts=PTS-STARTPTS']
    chain += [f'afade=t=in:d=1.5,afade=t=out:st={dur - 1.5}:d=1.5'] if loop else [f'afade=t=out:st={max(0, dur - min(.25, dur / 3))}:d={min(.25, dur / 3)}']
    tmp = os.path.join(OUT, name + '.tmp.wav')
    r = subprocess.run(['nice', '-n', '10', 'ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-i', kept, '-af', ','.join(chain), '-ac', '1', '-ar', '44100', tmp], capture_output=True, text=True)
    if not r.returncode:
        probe = subprocess.run(['ffmpeg', '-v', 'info', '-i', tmp, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
        peak = float(re.search(r'max_volume: (-?[\d.]+) dB', probe).group(1))
        mean = float(re.search(r'mean_volume: (-?[\d.]+) dB', probe).group(1))
        gain = min(-2 - peak, (-24 if loop else -19) - mean)
        r = subprocess.run(['nice', '-n', '10', 'ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'volume={gain:.1f}dB', '-c:a', 'libmp3lame', '-b:a', '64k' if loop else '96k', os.path.join(OUT, name + '.mp3')], capture_output=True, text=True)
        os.remove(tmp)
    if r.returncode:
        print('FAIL', name, r.stderr[-200:])
        continue
    m = meta.get(sid, {})
    manifest[name] = {'freesound': sid, 'author': m.get('user', ''), 'title': m.get('title', ''), 'url': f'https://freesound.org/s/{sid}/', 'license': 'CC0'}
    credits.append(f"| `{name}.mp3` | {m.get('title', '')} | {m.get('user', '')} | https://freesound.org/s/{sid}/ |")
    print(name, sid, round(os.path.getsize(os.path.join(OUT, name + '.mp3')) / 1000), 'kB')
MUSIC = '654167'
msrc = os.path.join(ROOT, 'Niepotrzebne', 'muzyka-src', MUSIC + '.mp3')
if os.path.exists(msrc):
    probe = subprocess.run(['ffmpeg', '-v', 'info', '-i', msrc, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    gain = min(-2 - float(re.search(r'max_volume: (-?[\d.]+) dB', probe).group(1)), -22 - float(re.search(r'mean_volume: (-?[\d.]+) dB', probe).group(1)))
    r = subprocess.run(['nice', '-n', '10', 'ffmpeg', '-v', 'error', '-y', '-i', msrc, '-af', f'volume={gain:.1f}dB', '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', os.path.join(OUT, 'muzyka.mp3')], capture_output=True, text=True)
    cand = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'Niepotrzebne', 'muzyka-src', 'kandydaci.json')))}.get(MUSIC, {})
    if not r.returncode:
        manifest['muzyka'] = {'freesound': MUSIC, 'author': cand.get('author', ''), 'title': cand.get('name', ''), 'url': f'https://freesound.org/s/{MUSIC}/', 'license': 'CC0'}
        credits.append(f"| `muzyka.mp3` | {cand.get('name', '')} | {cand.get('author', '')} | https://freesound.org/s/{MUSIC}/ |")
        print('muzyka', MUSIC, round(os.path.getsize(os.path.join(OUT, 'muzyka.mp3')) / 1000), 'kB')
if meta:
    json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(OUT, 'CREDITS.md'), 'w').write('# Sound credits\n\nAll sounds are real recordings from freesound.org released under Creative Commons 0. Cut, levelled and converted to MP3 for the game.\n\n| File | Original title | Author | Source |\n|---|---|---|---|\n' + '\n'.join(credits) + '\n')
    if os.path.abspath(RAW) != os.path.abspath(KEEP):
        shutil.copy2(os.path.join(RAW, 'index.json'), os.path.join(KEEP, 'index.json'))
