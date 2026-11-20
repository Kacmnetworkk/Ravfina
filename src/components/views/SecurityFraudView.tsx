import { Key, ShieldAlert, ShieldCheck } from 'lucide-react';
import { formatCurrency, type FraudAlert, type MfaSettings } from '../../domain/treasury';

interface SecurityFraudViewProps {
  alerts: FraudAlert[];
  mfa: MfaSettings;
  onResolveAlert: (alertId: string, resolution: 'Approved' | 'Blocked') => void;
  onToggleHardwareKeyPolicy: () => void;
  onUpdateWireThreshold: (amountUsd: number) => void;
}

export function SecurityFraudView({
  alerts,
  mfa,
  onResolveAlert,
  onToggleHardwareKeyPolicy,
  onUpdateWireThreshold,
}: SecurityFraudViewProps) {
  const openAlerts = alerts.filter((a) => a.status === 'Open').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Real-Time Fraud Alert Queue */}
        <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-7 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
                Real-Time Fraud Telemetry Queue
              </h2>
            </div>
            <span className="font-mono text-xs tabular-nums text-zinc-600 dark:text-[#88888b]">
              {openAlerts} open alert(s)
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {alerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`font-semibold ${
                          alert.severity === 'High'
                            ? 'text-red-700 dark:text-[#ff4d4d]'
                            : alert.severity === 'Medium'
                              ? 'text-amber-800 dark:text-[#facc15]'
                              : 'text-zinc-600 dark:text-[#88888b]'
                        }`}
                      >
                        {alert.severity} Severity
                      </span>
                      <span className="text-zinc-400 dark:text-[#52525b]">·</span>
                      <span className="text-zinc-600 dark:text-[#88888b]">{alert.location}</span>
                      <span className="text-zinc-400 dark:text-[#52525b]">·</span>
                      <span className="text-zinc-600 dark:text-[#88888b]">{alert.timestamp}</span>
                    </div>
                    <h3 className="mt-1 font-display text-sm font-semibold text-zinc-950 dark:text-white">
                      {alert.title}
                    </h3>
                  </div>

                  <div className="text-right font-mono tabular-nums">
                    <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                      {formatCurrency(alert.amountUsd)}
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        alert.status === 'Open'
                          ? 'text-amber-800 dark:text-[#facc15]'
                          : alert.status === 'Approved'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-[#ff4d4d]'
                      }`}
                    >
                      {alert.status}
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-zinc-700 dark:text-[#a1a1aa]">{alert.description}</p>

                {alert.status === 'Open' && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onResolveAlert(alert.id, 'Approved')}
                      className="rounded-lg border border-zinc-400 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-emerald-500 hover:text-emerald-800 dark:border-[#2e2e32] dark:bg-[#111112] dark:text-[#d4d4d8] dark:hover:border-emerald-400/40 dark:hover:text-emerald-300"
                    >
                      Approve &amp; Whitelist
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolveAlert(alert.id, 'Blocked')}
                      className="rounded-lg bg-[#dc2626] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#b91c1c] dark:bg-[#ff4d4d] dark:hover:bg-[#ef4444]"
                    >
                      Block &amp; Freeze Card
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>

        {/* MFA & Wire Security Posture */}
        <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
              Multifactor Authentication &amp; Controls
            </h2>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
              <div>
                <div className="text-sm font-medium text-zinc-950 dark:text-white">
                  Hardware FIDO2 / WebAuthn Enforcement
                </div>
                <div className="text-xs text-zinc-600 dark:text-[#88888b]">
                  Require physical security key for card issuance and wire sign-off
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={mfa.enforceHardwareKey}
                onClick={onToggleHardwareKeyPolicy}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  mfa.enforceHardwareKey
                    ? 'border border-amber-500/70 bg-[#facc15] text-black dark:border-transparent'
                    : 'border border-zinc-300 bg-white text-zinc-700 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#a1a1aa]'
                }`}
              >
                {mfa.enforceHardwareKey ? 'Enforced' : 'Optional'}
              </button>
            </div>

            <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
              <label
                htmlFor="wire-threshold"
                className="block text-sm font-medium text-zinc-950 dark:text-white"
              >
                Dual-Admin Wire Approval Threshold (USD)
              </label>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-[#88888b]">
                Outgoing wires above this amount require two separate hardware-key signatures.
              </p>
              <select
                id="wire-threshold"
                value={mfa.wireDualApprovalAboveUsd}
                onChange={(e) => onUpdateWireThreshold(Number(e.target.value))}
                className="mt-2.5 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 font-mono text-xs text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-white dark:focus:border-[#facc15]"
              >
                <option value={10000}>$10,000+</option>
                <option value={25000}>$25,000+</option>
                <option value={50000}>$50,000+</option>
                <option value={100000}>$100,000+</option>
              </select>
            </div>

            <div className="border-t border-zinc-200 pt-4 dark:border-[#1d1d1f]">
              <div className="text-xs font-semibold text-zinc-800 dark:text-[#d4d4d8]">
                Registered Hardware Security Keys
              </div>
              <ul className="mt-2.5 space-y-2">
                {mfa.hardwareKeys.map((hk) => (
                  <li
                    key={hk.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-xs dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Key className="h-3.5 w-3.5 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
                      <div>
                        <div className="font-medium text-zinc-950 dark:text-white">{hk.label}</div>
                        <div className="text-zinc-600 dark:text-[#88888b]">Verified: {hk.lastVerified}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
