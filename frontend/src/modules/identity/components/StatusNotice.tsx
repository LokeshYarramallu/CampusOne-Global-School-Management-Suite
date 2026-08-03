import type { ReactNode } from 'react';

type NoticeTone = 'warning' | 'error' | 'info';

interface StatusNoticeProps {
  tone: NoticeTone;
  eyebrow: string;
  children: ReactNode;
  action?: ReactNode;
  role?: 'alert' | 'status';
}

const toneStyles: Record<NoticeTone, { rail: string; icon: string; eyebrow: string; body: string }> = {
  warning: {
    rail: 'border-[#f85001] bg-[#fffaf6]',
    icon: 'bg-[#f85001] text-white',
    eyebrow: 'text-[#b45a19]',
    body: 'text-[#8b5a37]',
  },
  error: {
    rail: 'border-[#c9655e] bg-[#fff8f7]',
    icon: 'bg-[#c9655e] text-white',
    eyebrow: 'text-[#a74640]',
    body: 'text-[#8f4a46]',
  },
  info: {
    rail: 'border-[#6b7d87] bg-[#f7fafb]',
    icon: 'bg-[#52616b] text-white',
    eyebrow: 'text-[#52616b]',
    body: 'text-[#5b6972]',
  },
};

function NoticeIcon({ tone }: { tone: NoticeTone }) {
  if (tone === 'error') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8.5" /><path d="m9 9 6 6M15 9l-6 6" /></svg>;
  }
  if (tone === 'info') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8.5" /><path d="M12 10.5v5M12 7.5h.01" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 4 8 15H4L12 4Z" /><path d="M12 9v4M12 16h.01" /></svg>;
}

export function StatusNotice({ tone, eyebrow, children, action, role = 'status' }: StatusNoticeProps) {
  const styles = toneStyles[tone];
  return (
    <div role={role} className={`campusone-status-in relative flex items-center gap-3 overflow-hidden border-l-[3px] px-3.5 py-3.5 ${styles.rail}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${styles.icon}`}><NoticeIcon tone={tone} /></span>
      <div className="min-w-0 flex-1">
        <p className={`text-[0.64rem] font-bold uppercase tracking-[0.16em] ${styles.eyebrow}`}>{eyebrow}</p>
        <p className={`mt-1 text-xs leading-5 ${styles.body}`}>{children}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
