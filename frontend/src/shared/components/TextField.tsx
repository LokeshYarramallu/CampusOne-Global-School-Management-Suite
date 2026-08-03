'use client';

import type { ComponentPropsWithRef, ReactNode } from 'react';
import { FIELD_LABEL_CLASS, fieldInputClass } from './fieldStyles';

interface TextFieldProps
  extends Omit<ComponentPropsWithRef<'input'>, 'className' | 'id'> {
  id: string;
  label: string;
  /** When set, the field renders as invalid and announces this message. */
  error?: string;
  /** Control rendered inside the field's trailing edge, e.g. a visibility toggle. */
  trailing?: ReactNode;
}

/**
 * A labelled text input wired for assistive technology.
 *
 * The trailing control sits outside the `<label>` on purpose: a button nested
 * inside a label also triggers label activation, so clicking the password
 * toggle would move focus into the input in some browsers.
 */
export function TextField({
  id,
  label,
  error,
  trailing,
  ...inputProps
}: TextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL_CLASS}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${fieldInputClass(Boolean(error))}${trailing ? ' pr-14' : ''}`}
          {...inputProps}
        />
        {trailing ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-2 text-xs leading-5 text-[#a74640]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
