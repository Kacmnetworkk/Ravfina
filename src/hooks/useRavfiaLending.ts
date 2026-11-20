import { useCallback, useEffect, useState } from 'react';
import {
  getLendingConfig,
  getLendingStatus,
  type LendingStatus,
} from '../lib/ravfia-lending';

export interface UseRavfiaLendingResult {
  status: LendingStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Reads live Ravfia Lending devnet state (RUSD supply, lender balances)
 * through the read-only JSON-RPC client. Fails soft: an unreachable RPC
 * sets `error` and leaves `status` null instead of crashing the view.
 * Pass `pollMs` to keep re-reading on an interval while the caller is
 * mounted (used by the Solana panel to watch the supply move when the
 * devnet activity script runs).
 */
export function useRavfiaLending(pollMs?: number): UseRavfiaLendingResult {
  const [status, setStatus] = useState<LendingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getLendingStatus(getLendingConfig())
      .then((next) => {
        if (cancelled) return;
        setStatus(next);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus(null);
        setError(
          err instanceof Error
            ? err.message
            : 'Devnet RPC unreachable. Lending status unavailable.',
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  // Optional polling: while mounted, re-read devnet state every pollMs.
  useEffect(() => {
    if (!pollMs || pollMs <= 0) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, refresh]);

  return { status, loading, error, refresh };
}
