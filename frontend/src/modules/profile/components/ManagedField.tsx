import type { Editability } from '../types/profile';

/**
 * A field the person cannot edit here.
 *
 * The point is the explanation. A greyed-out box with no reason is how people
 * end up filing a support ticket to change their own phone number — so every
 * non-editable field states who maintains it and how a correction is requested
 * (FR-023). There are no unexplained disabled controls on this page.
 */

const EXPLANATION: Record<Exclude<Editability, 'SELF'>, string> = {
  SCHOOL_MANAGED:
    'Maintained by your school. Contact your school administrator to request a correction.',
  APPROVAL:
    'Changing this needs your school’s approval. Contact your school administrator to request a correction.',
  VERIFICATION:
    'Changing this requires confirming the new value first.',
};

interface ManagedFieldProps {
  label: string;
  value: string | null;
  editability: Editability;
  /** Shown instead of the value when there is nothing to show. */
  placeholder?: string;
}

export function ManagedField({
  label,
  value,
  editability,
  placeholder = 'Not set',
}: ManagedFieldProps) {
  const explanation =
    editability === 'SELF' ? null : EXPLANATION[editability];

  return (
    <div className="border-b border-[#e9ecee] py-3.5 last:border-b-0">
      <dt className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#5f6469]">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-[#202226]">
        {value ?? <span className="text-[#6b7075]">{placeholder}</span>}
      </dd>
      {explanation ? (
        <p className="mt-1.5 text-xs leading-5 text-[#5f6469]">{explanation}</p>
      ) : null}
    </div>
  );
}
