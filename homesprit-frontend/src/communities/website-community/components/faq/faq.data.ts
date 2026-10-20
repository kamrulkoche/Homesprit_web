/**
 * `/faq` content — a PLAIN module, imported by deep path: the page reads it on
 * the server for the FAQPage structured data, and the client component renders
 * it. Like the homepage copy, it is fixed in code (no content engine).
 *
 * Every answer describes what the product actually does. Change an answer when
 * the behaviour it describes changes.
 */

export type FaqCategory = 'buying' | 'renting' | 'selling' | 'site';

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  buying: 'Buying',
  renting: 'Renting',
  selling: 'Selling & letting',
  site: 'Using Homesprit',
};

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'what-is-listed',
    category: 'buying',
    question: 'Are the homes in search results really still available?',
    answer:
      'Yes. Search only shows homes marked Available or Under offer. When a sale completes or a lease is signed, the agent marks the listing Sold or Rented and it leaves the results that day.',
  },
  {
    id: 'under-offer',
    category: 'buying',
    question: 'What does "Under offer" mean?',
    answer:
      'The seller has accepted an offer but the sale has not completed. You can still ask about the home — sales do fall through, and the agent can tell you whether a backup offer is worth making.',
  },
  {
    id: 'book-viewing',
    category: 'buying',
    question: 'How do I book a viewing?',
    answer:
      'Open the listing and send a message from the form beside it, mentioning the days and times that suit you. It goes straight to the agent who holds that listing, who will reply by email or phone to confirm.',
  },
  {
    id: 'price-shown',
    category: 'buying',
    question: 'Is the price shown the final price?',
    answer:
      'A sale price is the asking price set by the seller; the final price is agreed between you and them. Ask the agent about anything the listing does not mention, such as HOA fees or property taxes.',
  },
  {
    id: 'rent-price',
    category: 'renting',
    question: 'Is the rent shown per month?',
    answer:
      'Yes. Every rental price on Homesprit is the monthly rent, shown with "/mo". Deposits and any utilities included are set per property — ask the agent.',
  },
  {
    id: 'rent-apply',
    category: 'renting',
    question: 'How do I apply for a rental?',
    answer:
      'Send an inquiry from the listing. The agent will explain the application steps for that property — typically references, proof of income and a holding deposit — and arrange a viewing first.',
  },
  {
    id: 'rent-pets',
    category: 'renting',
    question: 'Are pets allowed?',
    answer:
      'It depends on the landlord. If a listing’s features mention pets, they are welcome; otherwise ask the agent before you apply.',
  },
  {
    id: 'valuation',
    category: 'selling',
    question: 'Can you value my home?',
    answer:
      'Yes, at no charge. Send us a message from the contact page with the address and a good time to call, and an agent who covers your area will get back to you within one working day.',
  },
  {
    id: 'list-with-us',
    category: 'selling',
    question: 'How do I list my home with Homesprit?',
    answer:
      'Every listing is managed by one of our agents, who photographs the home, writes the description and answers every inquiry about it. Start with a valuation request on the contact page.',
  },
  {
    id: 'let-with-us',
    category: 'selling',
    question: 'Do you manage rentals as well as sales?',
    answer:
      'Yes. We let apartments, houses and townhouses as well as selling them. The process starts the same way — a message from the contact page.',
  },
  {
    id: 'account',
    category: 'site',
    question: 'Do I need an account?',
    answer:
      'No. Searching, saving homes and sending inquiries all work without signing up. Only Homesprit staff sign in.',
  },
  {
    id: 'saved-homes',
    category: 'site',
    question: 'Where are my saved homes kept?',
    answer:
      'On this device, in a small cookie that holds the listings’ web addresses and nothing else. They are not sent to an agent and do not follow you to another browser. You can keep up to 20 at a time.',
  },
  {
    id: 'who-reads',
    category: 'site',
    question: 'Who reads the message I send?',
    answer:
      'A message about a listing goes to the agent responsible for it, and our admins can see it too. A message from the contact page goes to the admins, who pass it to the right agent. See the privacy policy for how long we keep it.',
  },
  {
    id: 'no-reply',
    category: 'site',
    question: 'I sent a message and have not heard back.',
    answer:
      'Agents aim to reply within one working day. If it has been longer, check your spam folder, then call or email the office using the details on the contact page.',
  },
];
