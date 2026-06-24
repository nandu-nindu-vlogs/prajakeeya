import React from 'react';

const STATUS_MAP = {
  submitted:    { label: 'Submitted / ಸಲ್ಲಿಸಲಾಗಿದೆ',    cls: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Under Review / ಪರಿಶೀಲನೆಯಲ್ಲಿ', cls: 'bg-yellow-100 text-yellow-800' },
  approved:     { label: 'Approved / ಅನುಮೋದಿತ',         cls: 'bg-green-100 text-green-800' },
  rejected:     { label: 'Rejected / ತಿರಸ್ಕೃತ',          cls: 'bg-red-100 text-red-800' },
  escalated:    { label: 'Escalated / ಮೇಲ್ಮನವಿ',         cls: 'bg-orange-100 text-orange-800' },
  closed:       { label: 'Closed / ಮುಚ್ಚಲಾಗಿದೆ',         cls: 'bg-gray-100 text-gray-600' },
  // Beneficiary
  pending:  { label: 'Pending / ಬಾಕಿ',         cls: 'bg-yellow-100 text-yellow-800' },
  verified: { label: 'Verified / ಪರಿಶೀಲಿಸಲಾಗಿದೆ', cls: 'bg-teal-100 text-teal-800' },
  duplicate:{ label: 'DUPLICATE / ನಕಲು 🚨',    cls: 'bg-red-100 text-red-900 font-bold' },
  // Tender
  open:      { label: 'Open / ತೆರೆದ',         cls: 'bg-green-100 text-green-800' },
  awarded:   { label: 'Awarded / ನೀಡಲಾಗಿದೆ',   cls: 'bg-purple-100 text-purple-800' },
  cancelled: { label: 'Cancelled / ರದ್ದಾಗಿದೆ', cls: 'bg-gray-100 text-gray-600' },
  // Finance
  matched:          { label: '3-Way Match ✓',   cls: 'bg-green-100 text-green-800' },
  blocked:          { label: 'BLOCKED 🚨',       cls: 'bg-red-100 text-red-900 font-bold' },
  goods_received:   { label: 'GR Done ✓',       cls: 'bg-teal-100 text-teal-800' },
  invoice_submitted:{ label: 'Invoice Pending',  cls: 'bg-yellow-100 text-yellow-800' },
  payment_released: { label: 'Paid ✓',          cls: 'bg-green-100 text-green-800' },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium kn ${s.cls}`}>
      {s.label}
    </span>
  );
}
