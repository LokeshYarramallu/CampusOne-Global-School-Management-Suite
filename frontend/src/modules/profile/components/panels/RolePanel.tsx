import type { ReactNode } from 'react';
import type { ProfilePanel } from '../../types/profile';
import { Card, DataGrid, Field } from '../Primitives';

/**
 * The one panel the server chose, laid out as cards in a grid.
 *
 * A lookup on `panel.kind`, so a new role is a new case and a new card — not a
 * longer conditional. The client never chooses the panel; it renders what
 * arrived.
 */

export interface PanelStat {
  label: string;
  value: string;
}

/** Headline facts for the tile row, derived from the panel the server sent. */
export function statsFor(panel: ProfilePanel): PanelStat[] {
  switch (panel.kind) {
    case 'TEACHER':
      return [
        { label: 'Classes', value: String(panel.assignments.length) },
        {
          label: 'Class teacher of',
          value:
            panel.assignments
              .filter((a) => a.isClassTeacher)
              .map((a) => `${a.classLabel}-${a.sectionLabel}`)
              .join(', ') || '—',
        },
        { label: 'Department', value: panel.staff?.department ?? '—' },
      ];
    case 'STAFF':
      return [
        { label: 'Employee no.', value: panel.staff?.employeeNumber ?? '—' },
        { label: 'Department', value: panel.staff?.department ?? '—' },
        { label: 'Joined', value: formatDate(panel.staff?.joinedOn) ?? '—' },
      ];
    case 'STUDENT':
      return [
        {
          label: 'Class',
          value: panel.enrollment
            ? `${panel.enrollment.classLabel}-${panel.enrollment.sectionLabel}`
            : '—',
        },
        { label: 'Roll no.', value: panel.enrollment?.rollNumber ?? '—' },
        { label: 'Guardians', value: String(panel.guardians.length) },
      ];
    case 'PARENT':
      return [
        { label: 'Schools', value: String(panel.schools.length) },
        {
          label: 'Children',
          value: String(
            panel.schools.reduce((n, s) => n + s.children.length, 0),
          ),
        },
      ];
    case 'PLATFORM':
      return [
        { label: 'Scope', value: 'Platform-wide' },
        { label: 'School', value: 'None' },
      ];
    default:
      return [];
  }
}

export function RolePanel({ panel }: { panel: ProfilePanel }) {
  switch (panel.kind) {
    case 'PLATFORM':
      return (
        <Card title="Platform operations" tone="accent" span={2}>
          <p className="text-sm leading-6 text-[#4a4f54]">{panel.scopeNote}</p>
          <p className="mt-4 border-l-[3px] border-[#f85001] bg-[#fffaf6] px-4 py-3 text-xs leading-5 text-[#8b5a37]">
            {panel.auditNote}
          </p>
        </Card>
      );

    case 'STAFF':
      // The only card this role has, so it takes the full grid rather than
      // leaving a column of dead space beside it.
      return (
        <StaffCard
          staff={panel.staff}
          boundaries={panel.boundaries}
          emptyReason={panel.emptyReason}
          span={2}
        />
      );

    case 'TEACHER':
      return (
        <>
          <StaffCard
            staff={panel.staff}
            boundaries={panel.boundaries}
            emptyReason={panel.staff ? undefined : panel.emptyReason}
          />
          <Card
            title="Teaching assignment"
            hint="Defines what you can reach across CampusOne"
            empty={
              panel.assignments.length === 0 ? panel.emptyReason : undefined
            }
          >
            <Rows>
              {panel.assignments.map((a) => (
                <Row
                  key={`${a.subject}-${a.classLabel}-${a.sectionLabel}`}
                  primary={a.subject}
                  secondary={`${a.classLabel}-${a.sectionLabel}`}
                  tag={a.isClassTeacher ? 'Class teacher' : undefined}
                />
              ))}
            </Rows>
          </Card>
        </>
      );

    case 'STUDENT':
      return (
        <>
          <Card
            title="Enrolment"
            hint="Maintained by the school office"
            empty={panel.enrollment ? undefined : panel.emptyReason}
          >
            <DataGrid>
              <Field
                label="Admission no."
                value={panel.enrollment?.admissionNumber}
              />
              <Field
                label="Class"
                value={
                  panel.enrollment
                    ? `${panel.enrollment.classLabel}-${panel.enrollment.sectionLabel}`
                    : null
                }
              />
              <Field label="Roll no." value={panel.enrollment?.rollNumber} />
              <Field
                label="Admitted"
                value={formatDate(panel.enrollment?.admittedOn)}
              />
            </DataGrid>
          </Card>

          <Card
            title="Guardians"
            empty={
              panel.guardians.length === 0
                ? 'No guardians linked yet. The school office records who your parents or guardians are.'
                : undefined
            }
          >
            <Rows>
              {panel.guardians.map((g) => (
                <Row key={g.name} primary={g.name} secondary={g.relationship} />
              ))}
            </Rows>
          </Card>
        </>
      );

    case 'PARENT':
      return (
        <Card
          title="Children"
          hint="One account across every school"
          empty={panel.schools.length === 0 ? panel.emptyReason : undefined}
          span={2}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {panel.schools.flatMap((school) =>
              school.children.map((child) => (
                <article
                  key={`${school.schoolId}-${child.name}`}
                  className="border border-[#e4e7e9] bg-[#fbfcfc] p-4"
                >
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#a95313]">
                    {school.schoolName}
                  </p>
                  <p className="mt-2 text-[0.95rem] font-semibold text-[#202226]">
                    {child.name}
                  </p>
                  <p className="mt-0.5 text-xs capitalize text-[#5f6469]">
                    {child.classLabel
                      ? `Class ${child.classLabel}-${child.sectionLabel} · `
                      : ''}
                    {child.relationship}
                  </p>
                  {child.isPrimaryContact || child.hasBillingResponsibility ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {child.isPrimaryContact ? <Tag>Primary contact</Tag> : null}
                      {child.hasBillingResponsibility ? <Tag>Billing</Tag> : null}
                    </div>
                  ) : null}
                </article>
              )),
            )}
          </div>
        </Card>
      );

    case 'UNAVAILABLE':
      return <Card title="Role details" empty={panel.reason} span={2} />;
  }
}

function StaffCard({
  staff,
  boundaries,
  emptyReason,
  span = 1,
}: {
  staff: {
    employeeNumber: string;
    designation: string;
    department: string | null;
    joinedOn: string;
  } | null;
  boundaries: string[];
  emptyReason?: string;
  span?: 1 | 2;
}) {
  return (
    <Card
      title="Employment"
      hint="Maintained by your school"
      empty={staff ? undefined : emptyReason}
      span={span}
    >
      <DataGrid>
        <Field label="Employee no." value={staff?.employeeNumber} />
        <Field label="Designation" value={staff?.designation} />
        <Field label="Department" value={staff?.department} />
        <Field label="Joined" value={formatDate(staff?.joinedOn)} />
      </DataGrid>

      {boundaries.length > 0 ? (
        <div className="mt-5 border-t border-[#eef1f2] pt-4">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#5f6469]">
            Access limits
          </p>
          <ul className="mt-2 space-y-1">
            {boundaries.map((b) => (
              <li
                key={b}
                className="flex gap-2 text-xs leading-5 text-[#4a4f54]"
              >
                <span aria-hidden="true" className="text-[#c9655e]">
                  —
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className="-my-2.5">{children}</ul>;
}

function Row({
  primary,
  secondary,
  tag,
}: {
  primary: string;
  secondary: string;
  tag?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-[#eef1f2] py-2.5 last:border-b-0">
      <span className="truncate text-sm font-medium text-[#202226]">
        {primary}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-xs capitalize tabular-nums text-[#5f6469]">
          {secondary}
        </span>
        {tag ? <Tag>{tag}</Tag> : null}
      </span>
    </li>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-sm bg-[#fff0e7] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[#a95313]">
      {children}
    </span>
  );
}

/** "2024-06-01" reads as data; "1 Jun 2024" reads as a date. */
function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}
