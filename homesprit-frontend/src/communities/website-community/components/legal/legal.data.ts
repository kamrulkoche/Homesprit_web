/**
 * Privacy policy and terms of use — a PLAIN module, imported by deep path by
 * the two `app/` pages (for metadata) and rendered by `LegalPage`.
 *
 * The text describes what this codebase actually does with data: the inquiry
 * form, the staff session cookie, the saved-homes cookie, the theme setting,
 * soft deletes. Keep it in step with the code, and have it reviewed by counsel
 * before launch — it is a plain-language starting point, not legal advice.
 */

import { siteConfig } from '@/config/siteConfig';

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface LegalDocument {
  title: string;
  description: string;
  /** ISO date the text last changed. */
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy policy',
  description: `What ${siteConfig.name} collects when you use the site, why, who sees it and how long it is kept.`,
  updated: '2026-10-14',
  intro: `${siteConfig.name} does not ask visitors to create an account. The only personal information we hold about you is what you choose to send us in a message.`,
  sections: [
    {
      id: 'what-we-collect',
      heading: 'What we collect',
      paragraphs: ['When you send a message from a listing or the contact page, we store:'],
      list: [
        'your name and email address;',
        'your phone number, if you give one;',
        'your message, and which listing it was about;',
        'when it was sent.',
      ],
    },
    {
      id: 'why',
      heading: 'Why we use it',
      paragraphs: [
        'Only to answer you: to arrange a viewing, reply to a question, or follow up on a valuation request. We do not add you to a mailing list, and we do not sell or rent your details to anyone.',
      ],
    },
    {
      id: 'who-sees-it',
      heading: 'Who sees it',
      paragraphs: [
        'A message about a listing is visible to the agent responsible for that listing and to our admins. A message from the contact page is visible to our admins, who may pass it to the agent best placed to help. Nobody outside Homesprit sees it.',
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies and local storage',
      paragraphs: ['We use no advertising or analytics cookies. The site stores only:'],
      list: [
        'a saved-homes cookie, holding the web addresses of the listings you heart, so the Saved homes page can show them. It stays on your device and expires after a year;',
        'your light or dark theme choice, in your browser’s local storage;',
        'for staff only, a sign-in cookie that the browser’s scripts cannot read.',
      ],
    },
    {
      id: 'retention',
      heading: 'How long we keep it',
      paragraphs: [
        'Messages are kept so an agent has the history of a conversation if you get in touch again. Closing an inquiry does not delete it. If you would like your messages erased, email us and we will handle the request and confirm when it is done.',
      ],
    },
    {
      id: 'your-rights',
      heading: 'Your choices',
      paragraphs: [
        `You can ask what we hold about you, ask us to correct it, or ask us to remove it, by emailing ${siteConfig.email}. You can clear your saved homes at any time from the Saved homes page, or by clearing this site’s cookies.`,
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [
        `Questions about this policy go to ${siteConfig.email}, or by post to ${siteConfig.name}, ${siteConfig.address}.`,
      ],
    },
  ],
};

export const TERMS_OF_USE: LegalDocument = {
  title: 'Terms of use',
  description: `The terms that apply when you use the ${siteConfig.name} website.`,
  updated: '2026-10-14',
  intro: `By using the ${siteConfig.name} website you agree to these terms. If you do not agree, please do not use the site.`,
  sections: [
    {
      id: 'listings',
      heading: 'Listings',
      paragraphs: [
        'Listings are written by our agents from information provided by sellers and landlords. We take care to keep them accurate and current, but details such as floor area, year built and features are a guide, not a guarantee. Check anything that matters to you during a viewing or with the agent.',
        'Prices are asking prices for sales and monthly rents for lettings. A listing is not an offer to sell or let; any agreement is made separately with the seller or landlord.',
      ],
    },
    {
      id: 'availability',
      heading: 'Availability',
      paragraphs: [
        'Homes marked Under offer, Sold or Rented may no longer be available. A listing can be withdrawn at any time without notice.',
      ],
    },
    {
      id: 'messages',
      heading: 'Messages you send',
      paragraphs: [
        'When you send a message you confirm that the details are yours and accurate. Please do not send anything unlawful, abusive or unrelated to finding, selling or letting a home. To keep inboxes usable, the number of messages that can be sent in a short period is limited.',
      ],
    },
    {
      id: 'acceptable-use',
      heading: 'Acceptable use',
      paragraphs: ['You agree not to:'],
      list: [
        'copy listings or photos in bulk, or republish them elsewhere, without our written permission;',
        'use automated tools to scrape the site or place unreasonable load on it;',
        'try to access the staff dashboard without an account issued by us.',
      ],
    },
    {
      id: 'content',
      heading: 'Our content',
      paragraphs: [
        'The site’s design, text and listing descriptions belong to Homesprit. Listing photos belong to their owners and are used with permission.',
      ],
    },
    {
      id: 'liability',
      heading: 'Liability',
      paragraphs: [
        'We provide the site as it is. We are not liable for decisions made solely on the basis of a listing’s details, or for the site being unavailable from time to time. Nothing in these terms limits liability that cannot be limited by law.',
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to these terms',
      paragraphs: [
        'We may update these terms. The date at the top of this page shows when they last changed; continuing to use the site after a change means you accept the new terms.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [`Questions about these terms go to ${siteConfig.email}.`],
    },
  ],
};
