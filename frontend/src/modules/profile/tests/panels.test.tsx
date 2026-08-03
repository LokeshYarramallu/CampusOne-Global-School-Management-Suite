import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RolePanel } from '../components/panels/RolePanel';
import type { ProfilePanel } from '../types/profile';

const STAFF = {
  employeeNumber: 'EMP-0002',
  designation: 'Principal',
  department: 'Leadership',
  joinedOn: '2024-06-01',
};

describe('RolePanel', () => {
  it('renders the platform panel with no school-shaped content', () => {
    const panel: ProfilePanel = {
      kind: 'PLATFORM',
      scopeNote: 'Platform-wide. Not affiliated with any school.',
      auditNote: 'Access to school data is fully audited.',
    };
    render(<RolePanel panel={panel} />);

    expect(screen.getByText(/platform-wide/i)).toBeInTheDocument();
    expect(screen.getByText(/fully audited/i)).toBeInTheDocument();
    expect(screen.queryByText(/employee number/i)).toBeNull();
  });

  it('renders a staff record with its stated boundaries', () => {
    const panel: ProfilePanel = {
      kind: 'STAFF',
      staff: STAFF,
      scopeSummary: [],
      boundaries: ['Cannot modify academic records such as marks or grades.'],
    };
    render(<RolePanel panel={panel} />);

    expect(screen.getByText('EMP-0002')).toBeInTheDocument();
    expect(screen.getByText(/what this role cannot do/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot modify academic records/i)).toBeInTheDocument();
  });

  it('renders teaching assignments and flags the class teacher section', () => {
    const panel: ProfilePanel = {
      kind: 'TEACHER',
      staff: STAFF,
      scopeSummary: [],
      boundaries: [],
      assignments: [
        { subject: 'Mathematics', classLabel: '8', sectionLabel: 'B', isClassTeacher: true },
        { subject: 'Mathematics', classLabel: '9', sectionLabel: 'A', isClassTeacher: false },
      ],
    };
    render(<RolePanel panel={panel} />);

    expect(screen.getByText('Class 8-B')).toBeInTheDocument();
    expect(screen.getByText(/class teacher/i)).toBeInTheDocument();
    expect(screen.getAllByText('Mathematics')).toHaveLength(2);
  });

  it('explains an empty teaching assignment rather than rendering blank', () => {
    const panel: ProfilePanel = {
      kind: 'TEACHER',
      staff: STAFF,
      scopeSummary: [],
      boundaries: [],
      assignments: [],
      emptyReason: 'No classes are assigned to you yet.',
    };
    render(<RolePanel panel={panel} />);

    expect(screen.getByText(/no classes are assigned/i)).toBeInTheDocument();
  });

  it('renders a student enrolment', () => {
    const panel: ProfilePanel = {
      kind: 'STUDENT',
      enrollment: {
        admissionNumber: '2024-0417',
        classLabel: '8',
        sectionLabel: 'B',
        rollNumber: '17',
        admittedOn: '2024-06-10',
      },
      guardians: [{ name: 'Lakshmi Kumar', relationship: 'biological' }],
    };
    render(<RolePanel panel={panel} />);

    expect(screen.getByText('2024-0417')).toBeInTheDocument();
    expect(screen.getByText('8-B')).toBeInTheDocument();
    expect(screen.getByText('Lakshmi Kumar')).toBeInTheDocument();
  });

  it('explains an empty guardian list', () => {
    const panel: ProfilePanel = {
      kind: 'STUDENT',
      enrollment: {
        admissionNumber: '2024-0417',
        classLabel: '8',
        sectionLabel: 'B',
        rollNumber: null,
        admittedOn: '2024-06-10',
      },
      guardians: [],
    };
    render(<RolePanel panel={panel} />);

    expect(screen.getByText(/no guardians are linked/i)).toBeInTheDocument();
  });

  describe('parent panel', () => {
    const twoSchools: ProfilePanel = {
      kind: 'PARENT',
      schools: [
        {
          schoolId: 'a',
          schoolName: 'Greenwood High',
          children: [
            {
              name: 'Aarav Kumar',
              relationship: 'biological',
              classLabel: '8',
              sectionLabel: 'B',
              isPrimaryContact: true,
              hasBillingResponsibility: true,
            },
          ],
        },
        {
          schoolId: 'b',
          schoolName: 'Riverside Academy',
          children: [
            {
              name: 'Diya Kumar',
              relationship: 'biological',
              classLabel: '5',
              sectionLabel: 'A',
              isPrimaryContact: false,
              hasBillingResponsibility: false,
            },
          ],
        },
      ],
    };

    it('groups children under each school', () => {
      render(<RolePanel panel={twoSchools} />);

      expect(screen.getByText('Greenwood High')).toBeInTheDocument();
      expect(screen.getByText('Riverside Academy')).toBeInTheDocument();
      expect(screen.getByText('Aarav Kumar')).toBeInTheDocument();
      expect(screen.getByText('Diya Kumar')).toBeInTheDocument();
    });

    it('shows primary contact and billing responsibility only where held', () => {
      render(<RolePanel panel={twoSchools} />);

      expect(screen.getByText(/primary contact/i)).toBeInTheDocument();
      expect(screen.getByText(/billing responsibility/i)).toBeInTheDocument();
    });

    it('explains an empty children list', () => {
      const panel: ProfilePanel = {
        kind: 'PARENT',
        schools: [],
        emptyReason: 'No children are linked to your account yet.',
      };
      render(<RolePanel panel={panel} />);

      expect(screen.getByText(/no children are linked/i)).toBeInTheDocument();
    });
  });

  it('explains a gated-off panel', () => {
    const panel: ProfilePanel = {
      kind: 'UNAVAILABLE',
      reason: 'Staff records is not enabled for your school.',
    };
    render(<RolePanel panel={panel} />);

    expect(screen.getByText(/not enabled for your school/i)).toBeInTheDocument();
  });
});
