import React from 'react';

const ACTION_ICONS = {
  submitted: '📥', reviewed: '🔍', approved: '✅', rejected: '❌',
  escalated: '⚠️', FILE_SUBMIT: '📥', FILE_APPROVE: '✅', FILE_REJECT: '❌',
  USER_LOGIN: '🔑', USER_REGISTER: '👤', TENDER_CREATE: '📋',
  BID_SUBMIT: '📩', TENDER_AWARD: '🏆', BENEFICIARY_ADD: '👥',
  BENEFICIARY_VERIFY: '✅', BENEFICIARY_DUPLICATE_BLOCKED: '🚨',
  BENEFICIARY_TRANSFER: '💸', PO_CREATE: '🗒️', GOODS_RECEIVED: '📦',
  INVOICE_MATCHED: '🧾', ALERT_RAISE: '⚠️', SYSTEM_INIT: '🏛',
};

function TimeAgo({ ts }) {
  const d = new Date(ts);
  return <span title={d.toLocaleString()}>{d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>;
}

export default function AuditTrail({ actions, compact = false }) {
  if (!actions || actions.length === 0) {
    return <p className="text-gray-400 text-sm kn">ಯಾವುದೇ ದಾಖಲೆ ಇಲ್ಲ / No records yet</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3">
      {actions.map((a, i) => {
        const icon = ACTION_ICONS[a.action] || ACTION_ICONS[a.action_type] || '⚙️';
        const label = a.action || a.action_type || '';
        const actor = a.actor_name || a.actor_email || 'System';
        const note = a.note || (a.payload_json ? JSON.parse(a.payload_json)?.note : null);

        return (
          <li key={a.id || i} className="ml-6 mb-4">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 text-sm">
              {icon}
            </span>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm uppercase tracking-wide text-gray-700">
                {label.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-gray-400">by {actor}</span>
              {a.from_status && a.to_status && (
                <span className="text-xs text-gray-500">
                  {a.from_status} → <strong>{a.to_status}</strong>
                </span>
              )}
            </div>
            {note && <p className="text-sm text-gray-600 mt-0.5">{note}</p>}
            {!compact && a.block_hash_short && (
              <div className="ledger-block mt-1">🔗 {a.block_hash_short}</div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              <TimeAgo ts={a.created_at || a.timestamp} />
            </p>
          </li>
        );
      })}
    </ol>
  );
}
