'use client';

/* eslint-disable @next/next/no-img-element */
import { FormEvent, useState } from 'react';
import { ApiError } from '@/core/http/apiError';
import { TextField } from '@/shared/components/TextField';
import { SECONDARY_BUTTON_CLASS } from '@/shared/components/fieldStyles';
import { updateProfile, type ProfileChanges } from '../services/profileApi';
import type { AccountProfile } from '../types/profile';
import { Card, Field } from './Primitives';

/**
 * What the person may change about themselves.
 *
 * The set is decided by the server and arrives in `editability`, keyed by role.
 * A learner sees their phone and portrait as editable and the household
 * address as school-managed; their parent sees the address as theirs. Nothing
 * here infers the rule — rendering from the same map the API enforces is what
 * stops the interface and the API disagreeing.
 */

const AVATAR_KEYS = [
  'avatar-01',
  'avatar-02',
  'avatar-03',
  'avatar-04',
  'avatar-05',
  'avatar-06',
  'avatar-07',
  'avatar-08',
];

interface ContactCardProps {
  profile: AccountProfile;
  onUpdated: (profile: AccountProfile) => void;
}

export function ContactCard({ profile, onUpdated }: ContactCardProps) {
  const { identity, editability } = profile;
  const canEditPhone = editability.phone === 'SELF';
  const canEditAddress = editability.addressLine === 'SELF';
  const canEditPhoto = editability.avatarKey === 'SELF';

  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(identity.phone ?? '');
  const [line, setLine] = useState(identity.addressLine ?? '');
  const [city, setCity] = useState(identity.addressCity ?? '');
  const [postcode, setPostcode] = useState(identity.addressPostcode ?? '');
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const editableCount =
    (canEditPhone ? 1 : 0) + (canEditAddress ? 1 : 0) + (canEditPhoto ? 1 : 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const found: Record<string, string> = {};
    const trimmedPhone = phone.trim();
    if (
      canEditPhone &&
      trimmedPhone.length > 0 &&
      !/^[+0-9 ()-]{6,32}$/.test(trimmedPhone)
    ) {
      found.phone = 'Use digits and the characters + ( ) - only.';
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Only fields this role may change are sent. The API re-checks anyway.
    const changes: ProfileChanges = {
      ...(canEditPhone ? { phone: trimmedPhone } : {}),
      ...(canEditAddress
        ? {
            addressLine: line.trim(),
            addressCity: city.trim(),
            addressPostcode: postcode.trim(),
          }
        : {}),
      ...(canEditPhoto && avatarKey ? { avatarKey } : {}),
    };

    setSaving(true);
    try {
      onUpdated(await updateProfile(changes));
      setOpen(false);
      setAvatarKey(null);
    } catch (error) {
      setErrors({
        form:
          error instanceof ApiError
            ? error.message
            : 'We could not save your details. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Contact"
      hint="Follows you across every school"
      action={
        !open && editableCount > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[#a95313] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f85001]/40"
          >
            Edit
          </button>
        ) : null
      }
    >
      {open ? (
        <form onSubmit={submit} aria-busy={saving} className="space-y-4">
          {canEditPhoto ? (
            <fieldset>
              <legend className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#5f6469]">
                Portrait
              </legend>
              <div className="flex flex-wrap gap-2">
                {AVATAR_KEYS.map((key) => {
                  const selected = avatarKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Portrait ${key.replace('avatar-', '')}`}
                      onClick={() => setAvatarKey(selected ? null : key)}
                      className={`h-12 w-12 overflow-hidden border-2 transition-colors ${
                        selected
                          ? 'border-[#f85001]'
                          : 'border-transparent hover:border-[#d9dde0]'
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f85001]/40`}
                    >
                      <img
                        src={`/avatars/${key}.svg`}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {canEditPhone ? (
            <TextField
              id="phone"
              type="tel"
              label="Phone number"
              autoComplete="tel"
              placeholder="+91 98000 00000"
              value={phone}
              error={errors.phone}
              disabled={saving}
              onChange={(e) => setPhone(e.target.value)}
            />
          ) : null}

          {canEditAddress ? (
            <>
              <TextField
                id="address-line"
                label="Address"
                autoComplete="street-address"
                value={line}
                disabled={saving}
                onChange={(e) => setLine(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="address-city"
                  label="City"
                  autoComplete="address-level2"
                  value={city}
                  disabled={saving}
                  onChange={(e) => setCity(e.target.value)}
                />
                <TextField
                  id="address-postcode"
                  label="Postcode"
                  autoComplete="postal-code"
                  value={postcode}
                  disabled={saving}
                  onChange={(e) => setPostcode(e.target.value)}
                />
              </div>
            </>
          ) : null}

          {errors.form ? (
            <p role="alert" className="text-xs leading-5 text-[#a74640]">
              {errors.form}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={SECONDARY_BUTTON_CLASS}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setOpen(false);
                setErrors({});
                setAvatarKey(null);
                setPhone(identity.phone ?? '');
                setLine(identity.addressLine ?? '');
                setCity(identity.addressCity ?? '');
                setPostcode(identity.addressPostcode ?? '');
              }}
              className="px-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#5f6469] hover:text-[#202226]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="space-y-4">
            <Field label="Email" value={identity.email} />
            <Field label="Phone" value={identity.phone} placeholder="Not set" />
            <Field
              label="Address"
              value={
                [identity.addressLine, identity.addressCity, identity.addressPostcode]
                  .filter(Boolean)
                  .join(', ') || null
              }
              placeholder="Not set"
            />
            <Field label="Full name" value={identity.displayName} />
          </dl>

          <p className="mt-4 border-t border-[#eef1f2] pt-3 text-[0.68rem] leading-5 text-[#5f6469]">
            {canEditAddress
              ? 'Your name and email are set by your school. Everything else here is yours to change.'
              : 'Your name, email, and address are held by your school. Your phone and portrait are yours to change.'}
          </p>
        </>
      )}
    </Card>
  );
}
