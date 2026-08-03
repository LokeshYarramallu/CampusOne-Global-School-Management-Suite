import { ManagedField } from '../ManagedField';
import { PanelSection } from '../PanelSection';
import type { ProfilePanel, StaffRecord } from '../../types/profile';

/**
 * Renders the one panel the server chose.
 *
 * A lookup on `panel.kind`, so adding a role means adding a case here and a
 * component below — not lengthening a conditional. The client never decides
 * which panel to show; it only renders what arrived.
 */
export function RolePanel({ panel }: { panel: ProfilePanel }) {
  switch (panel.kind) {
    case 'PLATFORM':
      return <PlatformPanel scopeNote={panel.scopeNote} auditNote={panel.auditNote} />;
    case 'STAFF':
      return (
        <StaffPanel
          staff={panel.staff}
          boundaries={panel.boundaries}
          emptyReason={panel.emptyReason}
        />
      );
    case 'TEACHER':
      return (
        <>
          <StaffPanel
            staff={panel.staff}
            boundaries={panel.boundaries}
            emptyReason={panel.emptyReason && !panel.staff ? panel.emptyReason : undefined}
          />
          <TeachingPanel
            assignments={panel.assignments}
            emptyReason={
              panel.assignments.length === 0 ? panel.emptyReason : undefined
            }
          />
        </>
      );
    case 'STUDENT':
      return (
        <StudentPanel
          enrollment={panel.enrollment}
          guardians={panel.guardians}
          emptyReason={panel.emptyReason}
        />
      );
    case 'PARENT':
      return <ParentPanel schools={panel.schools} emptyReason={panel.emptyReason} />;
    case 'UNAVAILABLE':
      return (
        <PanelSection
          title="Role details"
          emptyReason={panel.reason}
        />
      );
  }
}

function PlatformPanel({
  scopeNote,
  auditNote,
}: {
  scopeNote: string;
  auditNote: string;
}) {
  return (
    <PanelSection
      title="Platform operations"
      description="This account operates the service itself."
    >
      <p className="text-sm leading-6 text-[#4a4f54]">{scopeNote}</p>
      <p className="mt-4 rounded-[12px_4px_12px_4px] border-l-[3px] border-[#f85001] bg-[#fffaf6] px-4 py-3 text-xs leading-5 text-[#8b5a37]">
        {auditNote}
      </p>
    </PanelSection>
  );
}

function StaffPanel({
  staff,
  boundaries,
  emptyReason,
}: {
  staff: StaffRecord | null;
  boundaries: string[];
  emptyReason?: string;
}) {
  return (
    <PanelSection
      title="Staff record"
      description="Maintained by your school."
      emptyReason={staff ? undefined : emptyReason}
    >
      <dl>
        <ManagedField
          label="Employee number"
          value={staff?.employeeNumber ?? null}
          editability="SCHOOL_MANAGED"
        />
        <ManagedField
          label="Designation"
          value={staff?.designation ?? null}
          editability="SCHOOL_MANAGED"
        />
        <ManagedField
          label="Department"
          value={staff?.department ?? null}
          editability="SCHOOL_MANAGED"
        />
        <ManagedField
          label="Joined"
          value={staff?.joinedOn ?? null}
          editability="SCHOOL_MANAGED"
        />
      </dl>

      {boundaries.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#5f6469]">
            What this role cannot do
          </h3>
          <ul className="mt-2 space-y-1.5">
            {boundaries.map((boundary) => (
              <li
                key={boundary}
                className="flex gap-2 text-xs leading-5 text-[#4a4f54]"
              >
                <span aria-hidden="true" className="text-[#a74640]">
                  &bull;
                </span>
                {boundary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PanelSection>
  );
}

function TeachingPanel({
  assignments,
  emptyReason,
}: {
  assignments: Array<{
    subject: string;
    classLabel: string;
    sectionLabel: string;
    isClassTeacher: boolean;
  }>;
  emptyReason?: string;
}) {
  return (
    <PanelSection
      title="Teaching assignment"
      description="This is what your access is limited to across CampusOne."
      emptyReason={assignments.length === 0 ? emptyReason : undefined}
    >
      <ul className="space-y-2">
        {assignments.map((assignment) => (
          <li
            key={`${assignment.subject}-${assignment.classLabel}-${assignment.sectionLabel}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[12px_4px_12px_4px] border border-[#e9ecee] px-4 py-3"
          >
            <span className="text-sm font-medium text-[#202226]">
              {assignment.subject}
            </span>
            <span className="flex items-center gap-2 text-xs text-[#4a4f54]">
              Class {assignment.classLabel}-{assignment.sectionLabel}
              {assignment.isClassTeacher ? (
                <span className="rounded-full bg-[#fff0e7] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#a95313]">
                  Class teacher
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

function StudentPanel({
  enrollment,
  guardians,
  emptyReason,
}: {
  enrollment: {
    admissionNumber: string;
    classLabel: string;
    sectionLabel: string;
    rollNumber: string | null;
    admittedOn: string;
  } | null;
  guardians: Array<{ name: string; relationship: string }>;
  emptyReason?: string;
}) {
  return (
    <>
      <PanelSection
        title="Enrolment"
        description="Maintained by your school office."
        emptyReason={enrollment ? undefined : emptyReason}
      >
        <dl>
          <ManagedField
            label="Admission number"
            value={enrollment?.admissionNumber ?? null}
            editability="SCHOOL_MANAGED"
          />
          <ManagedField
            label="Class"
            value={
              enrollment
                ? `${enrollment.classLabel}-${enrollment.sectionLabel}`
                : null
            }
            editability="SCHOOL_MANAGED"
          />
          <ManagedField
            label="Roll number"
            value={enrollment?.rollNumber ?? null}
            editability="SCHOOL_MANAGED"
          />
          <ManagedField
            label="Admitted"
            value={enrollment?.admittedOn ?? null}
            editability="SCHOOL_MANAGED"
          />
        </dl>
      </PanelSection>

      <PanelSection
        title="My guardians"
        emptyReason={
          guardians.length === 0
            ? 'No guardians are linked to you yet. Your school office records who your parents or guardians are.'
            : undefined
        }
      >
        <ul className="space-y-2">
          {guardians.map((guardian) => (
            <li
              key={guardian.name}
              className="flex items-center justify-between rounded-[12px_4px_12px_4px] border border-[#e9ecee] px-4 py-3"
            >
              <span className="text-sm text-[#202226]">{guardian.name}</span>
              <span className="text-xs capitalize text-[#4a4f54]">
                {guardian.relationship}
              </span>
            </li>
          ))}
        </ul>
      </PanelSection>
    </>
  );
}

function ParentPanel({
  schools,
  emptyReason,
}: {
  schools: Array<{
    schoolId: string;
    schoolName: string;
    children: Array<{
      name: string;
      relationship: string;
      classLabel: string | null;
      sectionLabel: string | null;
      isPrimaryContact: boolean;
      hasBillingResponsibility: boolean;
    }>;
  }>;
  emptyReason?: string;
}) {
  return (
    <PanelSection
      title="My children"
      description="One account across every school your children attend."
      emptyReason={schools.length === 0 ? emptyReason : undefined}
    >
      <div className="space-y-5">
        {schools.map((school) => (
          <div key={school.schoolId}>
            <h3 className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#5f6469]">
              {school.schoolName}
            </h3>
            <ul className="space-y-2">
              {school.children.map((child) => (
                <li
                  key={child.name}
                  className="rounded-[12px_4px_12px_4px] border border-[#e9ecee] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#202226]">
                      {child.name}
                    </span>
                    {child.classLabel ? (
                      <span className="text-xs text-[#4a4f54]">
                        Class {child.classLabel}-{child.sectionLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{child.relationship}</Badge>
                    {child.isPrimaryContact ? <Badge>Primary contact</Badge> : null}
                    {child.hasBillingResponsibility ? (
                      <Badge>Billing responsibility</Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PanelSection>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#f1f3f4] px-2.5 py-1 text-[0.65rem] font-semibold capitalize text-[#4a4f54]">
      {children}
    </span>
  );
}
