import { Check } from 'lucide-react';
import { useState } from 'react';
import { buildSocialShareUrls } from '../domain/treasury';
import { GitHubIcon, LinkedInIcon, ShareLinkIcon, XSocialIcon } from './icons/RavfinaIcons';

interface SocialShareButtonsProps {
  shareTitle?: string;
  shareSummary?: string;
  shareUrl?: string;
  compact?: boolean;
  showCommunityLinks?: boolean;
}

export function SocialShareButtons({
  shareTitle = 'Ravfina — Institutional Treasury & Corporate Spend Control',
  shareSummary = 'Real-time multi-currency liquidity, automated credit underwriting, and ERP reconciliation.',
  shareUrl,
  compact = false,
  showCommunityLinks = false,
}: SocialShareButtonsProps) {
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'copied' | 'shared'>('idle');

  const resolvedUrl =
    shareUrl ??
    (typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : 'https://ais-pre-3v4cgbbtl23g46mjzh7us4-41766811555.us-west2.run.app/');

  const urls = buildSocialShareUrls({
    url: resolvedUrl,
    title: shareTitle,
    summary: shareSummary,
  });

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareSummary,
          url: resolvedUrl,
        });
        setShareFeedback('shared');
        window.setTimeout(() => setShareFeedback('idle'), 2400);
        return;
      } catch {
        // Fall through to clipboard copy if user dismisses or share is blocked in iframe
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resolvedUrl);
      }
    } catch {
      // Clipboard may be restricted in non-HTTPS contexts; still reflect action cleanly
    }
    setShareFeedback('copied');
    window.setTimeout(() => setShareFeedback('idle'), 2400);
  };

  const buttonClass = compact
    ? 'ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:border-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#d4d4d8] dark:hover:border-[#2e2e32] dark:hover:bg-[#1d1d1f] dark:hover:text-white whitespace-nowrap shrink-0'
    : 'ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900 hover:border-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#e4e4e7] dark:hover:border-[#2e2e32] dark:hover:bg-[#1d1d1f] dark:hover:text-white whitespace-nowrap shrink-0';

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Social sharing and community links">
      <a
        href={urls.linkedIn}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share Ravfina on LinkedIn"
        className={buttonClass}
      >
        <LinkedInIcon className="h-3.5 w-3.5 text-sky-700 dark:text-[#38bdf8]" />
        <span>LinkedIn</span>
      </a>

      <a
        href={urls.xTwitter}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share Ravfina on X"
        className={buttonClass}
      >
        <XSocialIcon className="h-3.5 w-3.5 text-zinc-950 dark:text-white" />
        <span>Share on X</span>
      </a>

      {showCommunityLinks && (
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ravfina API SDK on GitHub"
          className={buttonClass}
        >
          <GitHubIcon className="h-3.5 w-3.5 text-zinc-800 dark:text-[#d4d4d8]" />
          <span>SDK &amp; Docs</span>
        </a>
      )}

      <button
        type="button"
        onClick={handleNativeShare}
        aria-label="Native share or copy link"
        className={
          shareFeedback !== 'idle'
            ? 'ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-500 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:border-[#facc15]/50 dark:bg-[#1a1a12] dark:text-[#facc15] whitespace-nowrap shrink-0'
            : buttonClass
        }
      >
        {shareFeedback !== 'idle' ? (
          <>
            <Check className="h-3.5 w-3.5 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
            <span>{shareFeedback === 'shared' ? 'Shared' : 'Link Copied'}</span>
          </>
        ) : (
          <>
            <ShareLinkIcon className="h-3.5 w-3.5 text-amber-800 dark:text-[#facc15]" />
            <span>Share Brief</span>
          </>
        )}
      </button>

      {shareFeedback !== 'idle' && (
        <span role="status" className="sr-only">
          {shareFeedback === 'shared'
            ? 'Shared Ravfina brief successfully.'
            : 'Ravfina URL copied to clipboard.'}
        </span>
      )}
    </div>
  );
}
