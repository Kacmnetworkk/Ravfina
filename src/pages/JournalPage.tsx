import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { HoloCard, HoloCardLayer } from '../components/HoloCard';
import { PageReveal, PanelStateTransition } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { BookMonographIcon } from '../components/icons/RavfinaIcons';
import { JOURNAL_BOOKS, type JournalBook } from '../data/platformContent';

export function JournalPage({ currentPath }: { currentPath: string }) {
  const [selectedBook, setSelectedBook] = useState<JournalBook | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);

  const activeChapter = selectedBook?.chapters[chapterIndex] ?? null;
  const progressPct =
    selectedBook && selectedBook.chapters.length > 0
      ? Math.round(((chapterIndex + 1) / selectedBook.chapters.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        {!selectedBook || !activeChapter ? (
          <div className="space-y-10">
            <PageReveal>
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                  <BookMonographIcon className="h-4 w-4" />
                  <span>Ravfina Treasury Journal · Long-Form Monographs</span>
                </div>
                <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight">
                  Books &amp; chapters on ledger craft and working capital.
                </h1>
                <p className="mt-2.5 text-base text-zinc-700 dark:text-[#a1a1aa]">
                  Select an edition below to enter the distraction-free chapter reading view with
                  margin notes and keyboard/button pagination.
                </p>
              </div>
            </PageReveal>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {JOURNAL_BOOKS.map((book) => (
                <HoloCard
                  key={book.id}
                  variant="product"
                  intensity="full"
                  className="grid grid-cols-1 overflow-hidden rounded-2xl border border-zinc-300 bg-white sm:grid-cols-12 dark:border-[#1d1d1f] dark:bg-[#111112]"
                >
                  <div className="aspect-[3/4] sm:col-span-5 bg-zinc-900">
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col justify-between p-6 sm:col-span-7">
                    <HoloCardLayer depth={14}>
                      <div className="font-mono text-[11px] uppercase tracking-wider text-amber-800 dark:text-[#facc15]">
                        {book.edition}
                      </div>
                      <h2 className="mt-2 font-display text-xl font-bold">{book.title}</h2>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-[#a1a1aa]">
                        {book.subtitle}
                      </p>
                      <div className="mt-3 text-xs text-zinc-500">By {book.author}</div>
                    </HoloCardLayer>

                    <div className="mt-6 space-y-2 border-t border-zinc-200 pt-4 dark:border-[#1d1d1f]">
                      {book.chapters.map((ch, idx) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setSelectedBook(book);
                            setChapterIndex(idx);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-[#161618]"
                        >
                          <span className="truncate font-medium">
                            {ch.number}: {ch.title}
                          </span>
                          <span className="font-mono text-[11px] text-amber-800 dark:text-[#facc15]">
                            {ch.readingMinutes}m
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </HoloCard>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 hover:underline dark:text-[#facc15]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Bookshelf
              </button>

              <div className="flex items-center gap-3 font-mono text-xs text-zinc-600 dark:text-[#88888b]">
                <BookOpen className="h-3.5 w-3.5 text-amber-800 dark:text-[#facc15]" />
                <span>
                  {selectedBook.title} · {activeChapter.number} ({progressPct}%)
                </span>
              </div>
            </div>

            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-[#1d1d1f]">
              <div
                className="h-full bg-[#facc15] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <PanelStateTransition transitionKey={activeChapter.id}>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <HoloCard
                  variant="editorial"
                  intensity="subtle"
                  className="rounded-2xl border border-zinc-300 bg-white p-8 sm:p-12 lg:col-span-8 dark:border-[#1d1d1f] dark:bg-[#111112]"
                >
                  <div className="font-mono text-xs uppercase tracking-widest text-amber-800 dark:text-[#facc15]">
                    {activeChapter.number} · {activeChapter.readingMinutes} min read
                  </div>
                  <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
                    {activeChapter.title}
                  </h1>
                  <blockquote className="mt-5 border-l-2 border-amber-500 pl-4 font-serif text-base italic text-zinc-700 dark:border-[#facc15] dark:text-[#d4d4d8]">
                    “{activeChapter.epigraph}”
                  </blockquote>

                  <div className="mt-8 space-y-5 font-serif text-base sm:text-lg leading-relaxed text-zinc-800 dark:text-[#e4e4e7]">
                    {activeChapter.paragraphs.map((p, idx) => (
                      <p
                        key={idx}
                        className={
                          idx === 0
                            ? 'first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-5xl first-letter:font-bold first-letter:leading-none first-letter:text-amber-700 dark:first-letter:text-[#facc15]'
                            : ''
                        }
                      >
                        {p}
                      </p>
                    ))}
                  </div>

                  <div className="mt-10 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-[#1d1d1f]">
                    <button
                      type="button"
                      disabled={chapterIndex === 0}
                      onClick={() => setChapterIndex((i) => Math.max(0, i - 1))}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold disabled:opacity-40 dark:border-[#2e2e32]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Previous Chapter
                    </button>
                    <button
                      type="button"
                      disabled={chapterIndex >= selectedBook.chapters.length - 1}
                      onClick={() =>
                        setChapterIndex((i) =>
                          Math.min(selectedBook.chapters.length - 1, i + 1),
                        )
                      }
                      className="ravfina-cta-tactile inline-flex items-center gap-1.5 rounded-xl border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black disabled:opacity-40 dark:border-transparent"
                    >
                      Next Chapter
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </HoloCard>

                <aside className="space-y-4 lg:col-span-4">
                  <HoloCard
                    variant="editorial"
                    intensity="subtle"
                    className="rounded-2xl border border-amber-400 bg-amber-50/70 p-6 dark:border-[#facc15]/30 dark:bg-[#1a1a12]"
                  >
                    <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-[#facc15]">
                      Controller Margin Note
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-800 dark:text-[#e4e4e7]">
                      {activeChapter.marginNote}
                    </p>
                  </HoloCard>

                  <div className="rounded-2xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
                    <div className="font-mono text-xs font-bold uppercase text-zinc-500">
                      Table of Chapters
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {selectedBook.chapters.map((ch, idx) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setChapterIndex(idx)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                            idx === chapterIndex
                              ? 'bg-zinc-950 font-semibold text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                              : 'text-zinc-700 hover:bg-zinc-100 dark:text-[#a1a1aa] dark:hover:bg-[#161618]'
                          }`}
                        >
                          {ch.number} · {ch.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </PanelStateTransition>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
