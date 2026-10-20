import {
  BadgeCheck,
  Bot,
  LayoutGrid,
  LockKeyhole,
  Mail,
  Newspaper,
  Radar,
  Settings,
  X,
} from 'lucide-react';
import type { ProofOfWorkProfile } from '@/types/optimus';
import { soundEngine } from '@/utils/soundEngine';

export type AppView = 'overview' | 'bots' | 'eligibility' | 'scout' | 'news' | 'dispatch';

interface SidebarProps {
  view: AppView | 'settings';
  profile: ProofOfWorkProfile;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onMobileClose: () => void;
  onViewChange: (view: AppView) => void;
  onSettings: () => void;
}

const NAV_ITEMS: {
  id: AppView;
  label: string;
  icon: typeof LayoutGrid;
  badge?: string;
}[] = [
  { id: 'overview', label: 'Palantir Overview', icon: LayoutGrid },
  { id: 'bots', label: 'Autonomous OptiBots', icon: Bot, badge: '3 LIVE' },
  { id: 'eligibility', label: 'Job & Role Matcher', icon: BadgeCheck },
  { id: 'scout', label: 'Live Firecrawl Scouts', icon: Radar },
  { id: 'news', label: 'Dev Pulse', icon: Newspaper },
  { id: 'dispatch', label: 'Your Weekly Dispatch', icon: Mail },
];

export default function Sidebar({
  view,
  profile,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onMobileClose,
  onViewChange,
  onSettings,
}: SidebarProps) {
  const selectView = (next: AppView) => {
    soundEngine.playKeyClick();
    onViewChange(next);
    onMobileClose();
  };

  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-canvas/80 lg:hidden"
          onClick={onMobileClose}
          aria-label="Close navigation overlay"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r-1.5 border-ink bg-surface transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          collapsed ? 'w-64 lg:w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-subtle ${
            collapsed ? 'justify-between px-1.5' : 'justify-between px-3'
          }`}
        >
          <button
            onClick={() => selectView('overview')}
            className="flex min-w-0 items-center gap-2"
            aria-label="Go to overview"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded border-1.5 border-ink bg-primary text-primary-ink shadow-hard">
              <LockKeyhole className="h-4 w-4" />
            </span>
            {!collapsed && (
              <span className="min-w-0 text-left">
                <span className="block truncate font-display text-[17px] font-bold leading-none tracking-[-0.02em] text-content">
                  LockedIn
                </span>
                <span className="mt-1 block font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-muted">
                  Command Center
                </span>
              </span>
            )}
          </button>

          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onToggleCollapsed();
            }}
            className="hidden h-7 w-7 shrink-0 place-items-center rounded border-1.5 border-ink bg-well font-mono text-[12px] font-bold text-muted shadow-hard transition-colors hover:bg-subtle hover:text-primary lg:grid"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '»' : '«'}
          </button>

          <button
            onClick={onMobileClose}
            className="grid h-8 w-8 place-items-center rounded border-1.5 border-ink bg-well text-muted lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2" aria-label="Primary navigation">
          {!collapsed && <p className="label-caps mb-2 px-2 pt-1">Command Center</p>}
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = view === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => selectView(item.id)}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex h-10 w-full items-center rounded border-1.5 transition-colors ${
                    collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                  } ${
                    active
                      ? 'border-primary/60 bg-primary/10 text-content shadow-hard'
                      : 'border-transparent text-muted hover:border-ink hover:bg-subtle hover:text-content'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-2 h-6 w-[2px] bg-primary" aria-hidden />
                  )}
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? 'text-primary' : 'text-muted group-hover:text-content'
                    }`}
                  />
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate text-left font-display text-[12px] font-medium">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-1 font-mono text-[8px] font-bold tracking-[0.06em] text-primary">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-subtle p-2">
          <div
            className={`mb-2 flex items-center rounded border border-subtle bg-well ${
              collapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2'
            }`}
          >
            <span className="relative shrink-0">
              <img
                src={profile.user.avatar_url}
                alt={`${profile.user.login} avatar`}
                className="h-8 w-8 rounded-full border-1.5 border-ink object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-primary" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate font-display text-[12px] font-semibold text-content">
                  {profile.user.name ?? profile.user.login}
                </span>
                <span className="block truncate font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
                  @{profile.user.login}
                </span>
              </span>
            )}
          </div>

          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onSettings();
            }}
            aria-current={view === 'settings' ? 'page' : undefined}
            className={`flex h-9 w-full items-center rounded border-1.5 transition-colors ${
              collapsed ? 'justify-center' : 'gap-2.5 px-2.5'
            } ${
              view === 'settings'
                ? 'border-primary/60 bg-primary/10 text-content shadow-hard'
                : 'border-transparent text-muted hover:border-ink hover:bg-subtle hover:text-content'
            }`}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings
              className={`h-4 w-4 shrink-0 ${view === 'settings' ? 'text-primary' : ''}`}
            />
            {!collapsed && (
              <span className="font-display text-[12px] font-medium">Settings</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
