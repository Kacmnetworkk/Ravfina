import { Pause, Play, Plus, RotateCcw, Sliders } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { HoloCard, HoloCardLayer } from '../components/HoloCard';
import { PageReveal } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { RavfinaLogoMark, TimelineWaveformIcon } from '../components/icons/RavfinaIcons';
import { INITIAL_EDITOR_TRACKS } from '../data/platformContent';
import { evaluateTimelineAtTime, type TimelineClip } from '../domain/platform';

const TOTAL_TIMELINE_SEC = 8.0;

export function EditorPage({ currentPath }: { currentPath: string }) {
  const [clips, setClips] = useState<TimelineClip[]>(INITIAL_EDITOR_TRACKS);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_EDITOR_TRACKS[0].id);
  const [playheadSec, setPlayheadSec] = useState<number>(1.8);
  const [playing, setPlaying] = useState<boolean>(false);
  const [cardLabel, setCardLabel] = useState<string>('Vanguard Titanium Reserve');
  const [exportedJson, setExportedJson] = useState<string | null>(null);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPlayheadSec((prev) => {
        const next = prev + dt;
        return next >= TOTAL_TIMELINE_SEC ? 0 : next;
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing]);

  const evaluated = evaluateTimelineAtTime(clips, playheadSec);
  const selectedClip = clips.find((c) => c.id === selectedId) ?? clips[0];

  const updateSelectedClip = (patch: Partial<TimelineClip>) => {
    if (!selectedClip) return;
    setClips((prev) =>
      prev.map((c) => (c.id === selectedClip.id ? { ...c, ...patch } : c)),
    );
  };

  const addKeyframeClip = () => {
    const created: TimelineClip = {
      id: `clip-${Date.now()}`,
      track: 'Custom Foil',
      label: `Accent Flare #${clips.length + 1}`,
      startSec: Number(Math.min(TOTAL_TIMELINE_SEC - 1.5, playheadSec).toFixed(1)),
      durationSec: 2.2,
      hueShiftDeg: 140,
      tiltDeg: 10,
      glareBoost: 0.9,
      color: '#a855f7',
    };
    setClips((prev) => [...prev, created]);
    setSelectedId(created.id);
  };

  const previewStyle = {
    transform: `perspective(1050px) rotateX(${(evaluated.tiltDeg * 0.55).toFixed(1)}deg) rotateY(${(-evaluated.tiltDeg * 0.75).toFixed(1)}deg)`,
    '--holo-hue': `${Math.round(evaluated.hueShiftDeg)}deg`,
    '--holo-glare-x': `${Math.round(25 + (playheadSec / TOTAL_TIMELINE_SEC) * 55)}%`,
    '--holo-glare-y': `${Math.round(35 + Math.sin(playheadSec) * 20)}%`,
    '--holo-active': evaluated.activeClipIds.length > 0 ? '1' : '0',
  } as CSSProperties;

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <PageReveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                <TimelineWaveformIcon className="h-4 w-4" />
                <span>HoloCard Timeline Composer · Canvas + Inspector</span>
              </div>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Interactive 3D Card Motion Editor
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="ravfina-cta-tactile inline-flex items-center gap-1.5 rounded-xl border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {playing ? 'Pause Timeline' : 'Play Timeline'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setPlayheadSec(0);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold dark:border-[#1d1d1f] dark:bg-[#111112]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                type="button"
                onClick={() =>
                  setExportedJson(JSON.stringify({ cardLabel, durationSec: TOTAL_TIMELINE_SEC, clips }, null, 2))
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold dark:border-[#1d1d1f] dark:bg-[#111112]"
              >
                Export Keyframes JSON
              </button>
            </div>
          </div>
        </PageReveal>

        {/* Stage Canvas + Inspector */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Canvas Viewport */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-300 bg-zinc-950 p-6 sm:p-10 text-white lg:col-span-8 dark:border-[#1d1d1f]">
            <div className="flex items-center justify-between font-mono text-xs text-zinc-400">
              <span>STAGE PREVIEW · 1050px PERSPECTIVE</span>
              <span className="tabular-nums text-[#facc15]">
                t = {playheadSec.toFixed(2)}s / {TOTAL_TIMELINE_SEC.toFixed(1)}s ·{' '}
                {evaluated.activeClipIds.length} active clips
              </span>
            </div>

            <div className="my-10 flex items-center justify-center">
              <HoloCard
                variant="payment"
                intensity="full"
                disabled={playing}
                style={playing ? previewStyle : undefined}
                className="w-full max-w-md rounded-2xl border border-amber-400/50 bg-gradient-to-br from-[#1b1b1e] via-[#111113] to-[#211d0f] p-7 text-white shadow-2xl"
              >
                <HoloCardLayer depth={18} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <RavfinaLogoMark className="h-7 w-7" />
                    <span className="font-display text-base font-bold tracking-tight">Ravfina</span>
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[#facc15]">
                    Physical Titanium
                  </span>
                </HoloCardLayer>

                <HoloCardLayer depth={30} className="mt-8">
                  <div className="font-display text-lg font-semibold">{cardLabel}</div>
                  <div className="mt-1 font-mono text-sm tracking-widest text-zinc-300 tabular-nums">
                    4819 •••• •••• 9042
                  </div>
                </HoloCardLayer>

                <HoloCardLayer
                  depth={14}
                  className="mt-7 flex items-end justify-between border-t border-white/10 pt-4 font-mono text-xs"
                >
                  <div>
                    <div className="text-[10px] uppercase text-zinc-400">Monthly Cap</div>
                    <div className="font-semibold text-white tabular-nums">$250,000.00</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-zinc-400">Tilt / Hue</div>
                    <div className="font-semibold text-[#facc15] tabular-nums">
                      {evaluated.tiltDeg.toFixed(1)}° · {Math.round(evaluated.hueShiftDeg)}°
                    </div>
                  </div>
                </HoloCardLayer>
              </HoloCard>
            </div>

            <div>
              <label htmlFor="timeline-scrub" className="sr-only">
                Scrub timeline playhead
              </label>
              <input
                id="timeline-scrub"
                type="range"
                min={0}
                max={TOTAL_TIMELINE_SEC}
                step={0.05}
                value={playheadSec}
                onChange={(e) => {
                  setPlaying(false);
                  setPlayheadSec(Number(e.target.value));
                }}
                className="w-full accent-[#facc15]"
              />
            </div>
          </div>

          {/* Inspector */}
          <HoloCard
            variant="dashboard"
            intensity="subtle"
            className="rounded-2xl border border-zinc-300 bg-white p-6 lg:col-span-4 dark:border-[#1d1d1f] dark:bg-[#111112]"
          >
            <div className="flex items-center gap-2 font-display text-base font-bold">
              <Sliders className="h-4 w-4 text-amber-800 dark:text-[#facc15]" />
              <span>Clip Inspector</span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="ed-card-label" className="block text-xs font-medium text-zinc-600 dark:text-[#a1a1aa]">
                  Card Surface Label
                </label>
                <input
                  id="ed-card-label"
                  type="text"
                  value={cardLabel}
                  onChange={(e) => setCardLabel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-xs text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                />
              </div>

              {selectedClip && (
                <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-[#1d1d1f]">
                  <div className="font-mono text-xs font-bold text-amber-800 dark:text-[#facc15]">
                    {selectedClip.track} · {selectedClip.label}
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Start (sec)</span>
                      <span className="font-mono tabular-nums">{selectedClip.startSec.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={6.5}
                      step={0.1}
                      value={selectedClip.startSec}
                      onChange={(e) =>
                        updateSelectedClip({ startSec: Number(e.target.value) })
                      }
                      className="mt-1 w-full accent-[#facc15]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Duration (sec)</span>
                      <span className="font-mono tabular-nums">{selectedClip.durationSec.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={6}
                      step={0.1}
                      value={selectedClip.durationSec}
                      onChange={(e) =>
                        updateSelectedClip({ durationSec: Number(e.target.value) })
                      }
                      className="mt-1 w-full accent-[#facc15]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Hue Rotation</span>
                      <span className="font-mono tabular-nums">{selectedClip.hueShiftDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={selectedClip.hueShiftDeg}
                      onChange={(e) =>
                        updateSelectedClip({ hueShiftDeg: Number(e.target.value) })
                      }
                      className="mt-1 w-full accent-[#facc15]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Max Tilt Angle</span>
                      <span className="font-mono tabular-nums">{selectedClip.tiltDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={14}
                      step={0.5}
                      value={selectedClip.tiltDeg}
                      onChange={(e) =>
                        updateSelectedClip({ tiltDeg: Number(e.target.value) })
                      }
                      className="mt-1 w-full accent-[#facc15]"
                    />
                  </div>
                </div>
              )}
            </div>
          </HoloCard>
        </div>

        {/* Multi-Track Timeline */}
        <HoloCard
          variant="dashboard"
          intensity="subtle"
          className="mt-6 rounded-2xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-[#d4d4d8]">
              Keyframe Tracks ({clips.length})
            </h2>
            <button
              type="button"
              onClick={addKeyframeClip}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-semibold dark:border-[#2e2e32] dark:bg-[#0b0b0c]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Motion Clip
            </button>
          </div>

          <div className="relative mt-4 space-y-2.5">
            {clips.map((clip) => {
              const leftPct = (clip.startSec / TOTAL_TIMELINE_SEC) * 100;
              const widthPct = Math.min(100 - leftPct, (clip.durationSec / TOTAL_TIMELINE_SEC) * 100);
              const selected = clip.id === selectedClip?.id;
              return (
                <div
                  key={clip.id}
                  className="grid grid-cols-12 items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
                >
                  <div className="col-span-4 sm:col-span-3 truncate font-mono text-xs font-semibold">
                    {clip.track}
                  </div>
                  <div className="relative col-span-8 sm:col-span-9 h-8 rounded bg-zinc-200 dark:bg-[#161618]">
                    <button
                      type="button"
                      onClick={() => setSelectedId(clip.id)}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        borderColor: clip.color,
                      }}
                      className={`absolute top-1 bottom-1 truncate rounded border-2 px-2 text-left font-mono text-[11px] font-semibold transition-all ${
                        selected
                          ? 'bg-zinc-950 text-[#facc15] shadow-md dark:bg-[#1f1f24]'
                          : 'bg-white text-zinc-900 dark:bg-[#111112] dark:text-white'
                      }`}
                    >
                      {clip.label}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </HoloCard>

        {exportedJson && (
          <div className="mt-6 rounded-2xl border border-zinc-300 bg-zinc-950 p-5 text-xs text-emerald-300 dark:border-[#1d1d1f]">
            <div className="mb-2 flex items-center justify-between font-mono text-zinc-400">
              <span>EXPORTED TIMELINE KEYFRAMES</span>
              <button
                type="button"
                onClick={() => setExportedJson(null)}
                className="text-zinc-300 hover:text-white"
              >
                Dismiss
              </button>
            </div>
            <pre className="max-h-60 overflow-auto font-mono">{exportedJson}</pre>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
