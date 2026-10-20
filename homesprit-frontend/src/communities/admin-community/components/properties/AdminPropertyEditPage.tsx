'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, ImagePlus, Save, Trash2 } from 'lucide-react';
import {
  AdminApiError,
  AdminPageHeader,
  ConfirmDialog,
  ErrorState,
  FormField,
  IconButton,
  adminApi,
  slugify,
  useToast,
} from '../ui';
import { cardClasses } from '../ui/admin-ui.data';
import { ListingImage } from '@/shared/components/ListingImage';
import {
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  toOptions,
} from '@/helpers/properties/labels';
import type { IUser } from '@/interface/admin.interface';
import type { IAdminProperty } from '@/interface/property.interface';
import {
  EMPTY_PROPERTY_FORM,
  formFromProperty,
  movePhoto,
  writeBodyFromForm,
  type IPropertyForm,
} from './properties.data';

interface AdminPropertyEditPageProps {
  user: IUser;
  /** The listing to edit, or null for a new one. */
  property: IAdminProperty | null;
  /** True when an edit page's server read failed — 403, 404 or the backend down. */
  loadFailed?: boolean;
  /** Staff who can own a listing — admins only; null for an agent. */
  agents: IUser[] | null;
}

/**
 * `/admin/properties/new` and `/admin/properties/[id]` — one form for both.
 *
 * Saves through `adminApi` directly rather than `useAdminResource`, which is a
 * LIST hook; this screen has no list to re-read. The backend is the validator:
 * its 422 comes back as per-field messages and lands under the right input.
 *
 * Two controls are admin-only — Featured and the owner — and are not rendered
 * for an agent. Hiding them is courtesy; the backend answers an agent who
 * sends them anyway with a 403.
 */
export function AdminPropertyEditPage({ user, property, loadFailed, agents }: AdminPropertyEditPageProps) {
  const router = useRouter();
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const isNew = property === null;

  const [form, setForm] = useState<IPropertyForm>(() =>
    property ? formFromProperty(property) : { ...EMPTY_PROPERTY_FORM, agent_id: isAdmin ? '' : user.id }
  );
  // Until someone types a slug by hand, it follows the title.
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (loadFailed) {
    return (
      <div className={cardClasses}>
        <ErrorState message="This listing could not be opened. It may have been removed, belong to another agent, or the server may be down." />
        <div className="pb-8 text-center">
          <Link href="/admin/properties" className="btn-secondary">
            Back to listings
          </Link>
        </div>
      </div>
    );
  }

  const set = <K extends keyof IPropertyForm>(key: K, value: IPropertyForm[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'title' && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
    if (errors[key]) setErrors(({ [key]: _removed, ...rest }) => rest);
  };

  const input = (key: keyof IPropertyForm, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      className="field-input"
      value={String(form[key])}
      onChange={(event) => set(key, event.target.value as never)}
      {...extra}
    />
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setErrors({});
    const body = writeBodyFromForm(form);
    try {
      if (isNew) {
        const created = await adminApi.post<IAdminProperty>('properties', body);
        toast.success(`“${created.title}” created.`);
        router.replace(`/admin/properties/${created.id}`);
        router.refresh();
        return;
      }
      const updated = await adminApi.patch<IAdminProperty>(`properties/${property.id}`, body);
      setForm(formFromProperty(updated));
      toast.success('Changes saved.');
      router.refresh();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setErrors(err.fields ?? {});
        setFormError(
          err.status === 401
            ? 'Your session expired. Sign in again to continue.'
            : err.fields
              ? 'Some fields need attention — see the messages below.'
              : err.message
        );
      } else {
        setFormError('Could not save. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!property) return;
    setIsSaving(true);
    try {
      await adminApi.del(`properties/${property.id}`);
      toast.success(`“${property.title}” removed from the site.`);
      router.replace('/admin/properties');
      router.refresh();
    } catch (err) {
      setConfirmDelete(false);
      setFormError(err instanceof Error ? err.message : 'Could not remove the listing.');
      setIsSaving(false);
    }
  };

  const updatePhoto = (index: number, patch: Partial<IPropertyForm['images'][number]>) =>
    set(
      'images',
      form.images.map((image, i) => (i === index ? { ...image, ...patch } : image))
    );

  const section = (title: string, description: string, children: React.ReactNode) => (
    <section className={`${cardClasses} p-6`}>
      <h2 className="text-lg font-bold text-ink dark:text-white">{title}</h2>
      <p className="mb-5 text-sm text-ink-muted dark:text-slate-400">{description}</p>
      {children}
    </section>
  );

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-5xl">
      <Link href="/admin/properties" className="btn-ghost -ml-3 mb-4 px-3">
        <ArrowLeft size={16} aria-hidden="true" />
        Listings
      </Link>

      <AdminPageHeader
        title={isNew ? 'New listing' : form.title || 'Edit listing'}
        description={
          isNew
            ? 'Starts as a draft unless you choose a status — drafts are invisible on the site.'
            : 'Changes go live on the site as soon as you save.'
        }
        actions={
          <>
            {!isNew && ['available', 'under_offer', 'sold', 'rented'].includes(form.status) && (
              <Link href={`/properties/${property.slug}`} target="_blank" className="btn-secondary">
                <ExternalLink size={16} aria-hidden="true" />
                View on site
              </Link>
            )}
            <button type="submit" className="btn-primary" disabled={isSaving}>
              <Save size={16} aria-hidden="true" />
              {isSaving ? 'Saving…' : isNew ? 'Create listing' : 'Save changes'}
            </button>
          </>
        }
      />

      {formError && (
        <p role="alert" className="mb-6 rounded-xl bg-accent-clay/10 px-4 py-3 font-medium text-accent-clay">
          {formError}
        </p>
      )}

      <div className="space-y-6">
        {section(
          'Basics',
          'What the listing is and what it costs.',
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Title" error={errors.title} required className="md:col-span-2">
              {input('title', { maxLength: 160 })}
            </FormField>
            <FormField
              label="Web address"
              error={errors.slug}
              hint={`homesprit.dev/properties/${form.slug || '…'}`}
              required
              className="md:col-span-2"
            >
              <input
                className="field-input font-mono"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  set('slug', slugify(event.target.value));
                }}
              />
            </FormField>
            <FormField label="Listing" error={errors.listing_type} required>
              <select
                className="field-input"
                value={form.listing_type}
                onChange={(event) => set('listing_type', event.target.value as IPropertyForm['listing_type'])}
              >
                {toOptions(LISTING_TYPE_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label={form.listing_type === 'rent' ? 'Rent per month' : 'Price'}
              error={errors.price}
              required
            >
              {input('price', { inputMode: 'numeric', placeholder: 'e.g. 450000' })}
            </FormField>
            <FormField label="Type" error={errors.property_type} required>
              <select
                className="field-input"
                value={form.property_type}
                onChange={(event) => set('property_type', event.target.value as IPropertyForm['property_type'])}
              >
                {toOptions(PROPERTY_TYPE_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="Status"
              error={errors.status}
              hint="Available and Under offer appear in search; Sold and Rented keep their page."
              required
            >
              <select
                className="field-input"
                value={form.status}
                onChange={(event) => set('status', event.target.value as IPropertyForm['status'])}
              >
                {toOptions(PROPERTY_STATUS_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Description" error={errors.description} required className="md:col-span-2">
              <textarea
                rows={7}
                className="field-input"
                value={form.description}
                onChange={(event) => set('description', event.target.value)}
                maxLength={5000}
              />
            </FormField>
          </div>
        )}

        {section(
          'Location',
          'Where it is. The city is what the public search filters on.',
          <div className="grid gap-5 md:grid-cols-3">
            <FormField label="Street address" error={errors.address} required className="md:col-span-3">
              {input('address', { autoComplete: 'off' })}
            </FormField>
            <FormField label="Neighbourhood" error={errors.neighborhood}>
              {input('neighborhood')}
            </FormField>
            <FormField label="City" error={errors.city} required>
              {input('city')}
            </FormField>
          </div>
        )}

        {section(
          'Details',
          'The facts a buyer filters and compares on.',
          <div className="grid grid-cols-2 gap-5 md:grid-cols-5">
            <FormField label="Bedrooms" error={errors.bedrooms}>
              {input('bedrooms', { inputMode: 'numeric' })}
            </FormField>
            <FormField label="Bathrooms" error={errors.bathrooms}>
              {input('bathrooms', { inputMode: 'numeric' })}
            </FormField>
            <FormField label="Area (sq ft)" error={errors.area_sqft}>
              {input('area_sqft', { inputMode: 'numeric' })}
            </FormField>
            <FormField label="Year built" error={errors.year_built}>
              {input('year_built', { inputMode: 'numeric' })}
            </FormField>
            <FormField label="Parking" error={errors.parking_spaces}>
              {input('parking_spaces', { inputMode: 'numeric' })}
            </FormField>
            <FormField
              label="Features"
              error={errors.features}
              hint="One per line — e.g. Balcony, Pet friendly, Solar panels."
              className="col-span-2 md:col-span-5"
            >
              <textarea
                rows={4}
                className="field-input"
                value={form.features}
                onChange={(event) => set('features', event.target.value)}
              />
            </FormField>
          </div>
        )}

        {section(
          'Photos',
          'Image URLs, in order. The first photo is the cover on every card.',
          <div className="space-y-4">
            {errors.images && <p className="field-error">{errors.images}</p>}
            {form.images.length === 0 && (
              <p className="rounded-xl bg-sand px-4 py-3 text-sm text-ink-muted dark:bg-white/5 dark:text-slate-400">
                No photos yet. A listing without photos shows a placeholder.
              </p>
            )}
            <ol className="space-y-3">
              {form.images.map((image, index) => (
                <li
                  key={index}
                  className="flex flex-col gap-3 rounded-xl border border-ink/[0.08] p-3 dark:border-white/[0.08] sm:flex-row sm:items-center"
                >
                  <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-sand">
                    <ListingImage src={image.url.startsWith('http') ? image.url : null} alt="" sizes="112px" />
                  </span>
                  <div className="grid flex-1 gap-2">
                    <input
                      className="field-input"
                      placeholder="https://…"
                      aria-label={`Photo ${index + 1} URL`}
                      value={image.url}
                      onChange={(event) => updatePhoto(index, { url: event.target.value })}
                    />
                    <input
                      className="field-input"
                      placeholder="What the photo shows (for screen readers)"
                      aria-label={`Photo ${index + 1} description`}
                      value={image.alt_text}
                      onChange={(event) => updatePhoto(index, { alt_text: event.target.value })}
                    />
                  </div>
                  <div className="flex gap-1 sm:flex-col">
                    <IconButton
                      label={`Move photo ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => set('images', movePhoto(form.images, index, -1))}
                    >
                      <ArrowUp size={16} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Move photo ${index + 1} down`}
                      disabled={index === form.images.length - 1}
                      onClick={() => set('images', movePhoto(form.images, index, 1))}
                    >
                      <ArrowDown size={16} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Remove photo ${index + 1}`}
                      tone="danger"
                      onClick={() => set('images', form.images.filter((_, i) => i !== index))}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn-secondary"
              disabled={form.images.length >= 20}
              onClick={() => set('images', [...form.images, { url: '', alt_text: '' }])}
            >
              <ImagePlus size={16} aria-hidden="true" />
              Add photo
            </button>
          </div>
        )}

        {isAdmin &&
          section(
            'Visibility & ownership',
            'Admin-only settings.',
            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="Listing agent"
                error={errors.agent_id}
                hint="Inquiries about this listing go to this person."
              >
                <select
                  className="field-input"
                  value={form.agent_id}
                  onChange={(event) => set('agent_id', event.target.value)}
                >
                  <option value="">{isNew ? 'Me' : 'Unchanged'}</option>
                  {agents?.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.role})
                    </option>
                  ))}
                </select>
              </FormField>
              <label className="flex items-start gap-3 self-end rounded-xl border border-ink/[0.08] p-4 dark:border-white/[0.08]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-brand-600"
                  checked={form.is_featured}
                  onChange={(event) => set('is_featured', event.target.checked)}
                />
                <span>
                  <span className="block font-semibold text-ink dark:text-white">Feature on the homepage</span>
                  <span className="text-sm text-ink-muted dark:text-slate-400">
                    Shown only while it is Available or Under offer.
                  </span>
                </span>
              </label>
            </div>
          )}

        {!isNew && (
          <section className={`${cardClasses} flex flex-wrap items-center justify-between gap-4 p-6`}>
            <div>
              <h2 className="font-bold text-ink dark:text-white">Remove listing</h2>
              <p className="text-sm text-ink-muted dark:text-slate-400">
                Takes it off the dashboard and the site. Its inquiries are kept.
              </p>
            </div>
            <button
              type="button"
              className="btn border border-accent-clay/40 text-accent-clay hover:bg-accent-clay/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={16} aria-hidden="true" />
              Remove
            </button>
          </section>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Remove this listing?"
        message="It will leave the dashboard and the site. Its inquiries are kept, and its web address stays reserved."
        confirmLabel="Remove listing"
        isBusy={isSaving}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
