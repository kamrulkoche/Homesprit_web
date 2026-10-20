import type { Metadata } from 'next';
import { FaqPage } from '@/communities/website-community';
import { FAQ_ITEMS } from '@/communities/website-community/components/faq/faq.data';

export const metadata: Metadata = {
  title: 'Questions & answers',
  description: 'How searching, viewing, renting and listing a home work at Homesprit.',
  alternates: { canonical: '/faq' },
};

/** FAQPage structured data, built from the same items the page renders. */
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
};

export default function Faq() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static copy from faq.data.ts; `<` is escaped so no answer can close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <FaqPage />
    </>
  );
}
