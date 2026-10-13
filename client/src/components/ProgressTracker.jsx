import { Check } from 'lucide-react';

const STEPS = ['Booked', 'Details verified', 'Inspector assigned', 'Visit scheduled', 'Site visited', 'Estimate ready', 'Approved', 'Work completed'];
const STEP_OF = {
  new: 0, crm_assigned: 0, awaiting_inspection: 1, assigned: 2, scheduled: 3, visited: 4,
  estimate_sent: 5, revision_requested: 5, approved: 6, completed: 7,
};

export default function ProgressTracker({ status }) {
  if (status === 'cancelled' || status === 'invalid') return <p className="alert alert--error">This booking was cancelled. Call us or book a new visit if you still need help.</p>;
  const current = STEP_OF[status] ?? 0;

  return (
    <ol className="tracker" aria-label="Booking progress">
      {STEPS.map((label, i) => {
        const state = i < current || status === 'completed' ? 'done' : i === current ? 'now' : 'next';
        return (
          <li key={label} className={`tracker__step tracker__step--${state}`} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="tracker__dot">{state === 'done' ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
            <span className="tracker__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}