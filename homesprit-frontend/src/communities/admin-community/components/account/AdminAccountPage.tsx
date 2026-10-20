'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleUser, KeyRound, ShieldCheck } from 'lucide-react';
import {
  AdminApiError,
  AdminPageHeader,
  FormField,
  SessionExpiredNotice,
  StatusBadge,
  adminApi,
  useToast,
} from '../ui';
import { cardClasses } from '../ui/admin-ui.data';
import { cn } from '@/helpers/utils/utils';
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from '@/helpers/properties/labels';
import { formatDate, formatDateTime } from '@/helpers/utils/format';
import {
  MIN_PASSWORD_LENGTH,
  passwordChangeSchema,
  profileSchema,
} from '@/helpers/validation/account.schema';
import { fieldErrors } from '@/helpers/validation/inquiry.schema';
import type { IAccountUpdate, IPasswordChange, IUser } from '@/interface/admin.interface';

interface AdminAccountPageProps {
  user: IUser;
}

type Errors = Record<string, string>;

const EMPTY_PASSWORDS = { current_password: '', new_password: '', confirm_password: '' };

/**
 * Turn a failed save into the form's two outputs: per-field messages and one
 * banner line. A 401 is the session ending, not a wrong answer.
 */
function describeError(err: unknown): { fields: Errors; message: string; unauthorized: boolean } {
  if (err instanceof AdminApiError) {
    if (err.status === 401) {
      return { fields: {}, message: 'Your session expired. Sign in again to continue.', unauthorized: true };
    }
    return {
      fields: err.fields ?? {},
      message: err.fields ? 'Some fields need attention — see the messages below.' : err.message,
      unauthorized: false,
    };
  }
  return { fields: {}, message: 'Could not save. Please try again.', unauthorized: false };
}

function FormBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-accent-clay/10 px-4 py-3 text-sm font-medium text-accent-clay">
      {message}
    </p>
  );
}

function SectionHeading({
  id,
  icon: Icon,
  title,
  description,
}: {
  id: string;
  icon: typeof CircleUser;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <Icon size={19} aria-hidden="true" />
      </span>
      <div>
        <h2 id={id} className="text-lg font-bold text-ink dark:text-white">
          {title}
        </h2>
        <p className="text-sm text-ink-muted dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

/**
 * `/admin/account` — the signed-in person's own details and password.
 *
 * Every write goes to `/admin/account`, which acts on the session's user and
 * accepts no id, so this screen cannot address anyone else. Role, status and
 * the sign-in email are shown, not edited: those are an admin's call on Team.
 */
export function AdminAccountPage({ user }: AdminAccountPageProps) {
  const router = useRouter();
  const toast = useToast();
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [profile, setProfile] = useState({ name: user.name, phone: user.phone ?? '' });
  const [profileErrors, setProfileErrors] = useState<Errors>({});
  const [profileBanner, setProfileBanner] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [passwordErrors, setPasswordErrors] = useState<Errors>({});
  const [passwordBanner, setPasswordBanner] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const isProfileDirty = profile.name.trim() !== user.name || profile.phone.trim() !== (user.phone ?? '');

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileBanner(null);
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      setProfileErrors(fieldErrors(parsed.error));
      return;
    }
    setProfileErrors({});
    setIsSavingProfile(true);
    try {
      const body: IAccountUpdate = { name: parsed.data.name, phone: parsed.data.phone || null };
      const saved = await adminApi.patch<IUser>('account', body);
      setProfile({ name: saved.name, phone: saved.phone ?? '' });
      toast.success('Your details are saved.');
      // The header's name comes from the server session; re-read it.
      router.refresh();
    } catch (err) {
      const { fields, message, unauthorized } = describeError(err);
      setProfileErrors(fields);
      setProfileBanner(message);
      setIsUnauthorized(unauthorized);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordBanner(null);
    const parsed = passwordChangeSchema.safeParse(passwords);
    if (!parsed.success) {
      setPasswordErrors(fieldErrors(parsed.error));
      return;
    }
    setPasswordErrors({});
    setIsSavingPassword(true);
    try {
      const body: IPasswordChange = {
        current_password: parsed.data.current_password,
        new_password: parsed.data.new_password,
      };
      await adminApi.post('account/password', body);
      setPasswords(EMPTY_PASSWORDS);
      toast.success('Password changed. Use the new one next time you sign in.');
    } catch (err) {
      const { fields, message, unauthorized } = describeError(err);
      setPasswordErrors(fields);
      // A 429's message already says how long to wait.
      setPasswordBanner(message);
      setIsUnauthorized(unauthorized);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const facts = [
    { label: 'Sign-in email', value: user.email },
    { label: 'Role', value: <StatusBadge status={user.role} label={USER_ROLE_LABELS[user.role]} /> },
    { label: 'Status', value: <StatusBadge status={user.status} label={USER_STATUS_LABELS[user.status]} /> },
    { label: 'Last sign-in', value: user.last_login_at ? formatDateTime(user.last_login_at) : 'Never' },
    { label: 'Member since', value: formatDate(user.created_at) },
  ];

  return (
    <div className="w-full">
      <AdminPageHeader
        title="My account"
        description="Your name and phone number appear on the listings you manage. Keep them current."
      />

      {isUnauthorized && <SessionExpiredNotice />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <section className={cn(cardClasses, 'p-5 md:p-7')} aria-labelledby="profile-heading">
            <form onSubmit={saveProfile} noValidate className="space-y-5">
              <SectionHeading
                id="profile-heading"
                icon={CircleUser}
                title="Profile"
                description="What visitors see beside your listings."
              />
              <FormBanner message={profileBanner} />
              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="Name" error={profileErrors.name} required>
                  <input
                    className="field-input"
                    autoComplete="name"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  />
                </FormField>
                <FormField label="Phone" error={profileErrors.phone} hint="Leave blank to hide it.">
                  <input
                    className="field-input"
                    type="tel"
                    autoComplete="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  />
                </FormField>
              </div>
              <FormField label="Email" hint="Your sign-in email. An admin can change it on the Team screen.">
                <input className="field-input" type="email" value={user.email} disabled readOnly />
              </FormField>
              <div className="flex flex-wrap justify-end gap-3 border-t border-ink/[0.08] pt-5 dark:border-white/[0.08]">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!isProfileDirty || isSavingProfile}
                  onClick={() => {
                    setProfile({ name: user.name, phone: user.phone ?? '' });
                    setProfileErrors({});
                    setProfileBanner(null);
                  }}
                >
                  Discard
                </button>
                <button type="submit" className="btn-primary" disabled={!isProfileDirty || isSavingProfile}>
                  {isSavingProfile ? 'Saving…' : 'Save details'}
                </button>
              </div>
            </form>
          </section>

          <section className={cn(cardClasses, 'p-5 md:p-7')} aria-labelledby="password-heading">
            <form onSubmit={changePassword} noValidate className="space-y-5">
              <SectionHeading
                id="password-heading"
                icon={KeyRound}
                title="Password"
                description="You will need your current password to set a new one."
              />
              <FormBanner message={passwordBanner} />
              {/* A hidden username field lets password managers file the new password under the right account. */}
              <input type="email" name="username" autoComplete="username" value={user.email} readOnly hidden />
              <FormField label="Current password" error={passwordErrors.current_password} required>
                <input
                  className="field-input"
                  type="password"
                  autoComplete="current-password"
                  value={passwords.current_password}
                  onChange={(e) => setPasswords((p) => ({ ...p, current_password: e.target.value }))}
                />
              </FormField>
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  label="New password"
                  error={passwordErrors.new_password}
                  hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
                  required
                >
                  <input
                    className="field-input"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.new_password}
                    onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))}
                  />
                </FormField>
                <FormField label="Confirm new password" error={passwordErrors.confirm_password} required>
                  <input
                    className="field-input"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm_password: e.target.value }))}
                  />
                </FormField>
              </div>
              <div className="flex justify-end border-t border-ink/[0.08] pt-5 dark:border-white/[0.08]">
                <button type="submit" className="btn-primary" disabled={isSavingPassword}>
                  {isSavingPassword ? 'Changing…' : 'Change password'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className={cn(cardClasses, 'h-fit p-5 md:p-6')} aria-labelledby="summary-heading">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 text-lg font-bold text-white">
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 id="summary-heading" className="truncate font-bold text-ink dark:text-white">
                {user.name}
              </h2>
              <p className="truncate text-sm text-ink-muted dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            {facts.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted dark:text-slate-400">{label}</dt>
                <dd className="min-w-0 truncate text-right font-semibold text-ink dark:text-white">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 flex gap-2 rounded-xl bg-sand p-3 text-xs text-ink-body dark:bg-white/[0.04] dark:text-slate-300">
            <ShieldCheck size={16} className="mt-px shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            Role and status are set by an admin. If either looks wrong, ask one to fix it on the Team screen.
          </p>
        </aside>
      </div>
    </div>
  );
}
