'use client';

// Website Community — the public site.
//
// As in every hgs-frontend community barrel, `'use client'` makes everything
// exported here a client component, so:
//   1. server-side data fetching happens in the `app/` page and arrives as props;
//   2. plain data never passes through here — import helpers and labels by
//      their own path (`@/helpers/properties/labels`).
export { HomeHero } from './components/home/HomeHero';
export {
  CityGrid,
  CtaBand,
  FeaturedProperties,
  HowItWorks,
} from './components/home/HomeSections';
export { PropertiesPageContainer } from './components/propertylist/PropertiesPageContainer';
export { PropertyCard } from './components/propertylist/PropertyCard';
export { PropertyDetail } from './components/propertydetail/PropertyDetail';
export { InquiryForm } from './components/propertydetail/InquiryForm';
export { ContactPage } from './components/contact/ContactPage';
export { AboutPage } from './components/about/AboutPage';
export { FaqPage } from './components/faq/FaqPage';
export { LegalPage } from './components/legal/LegalPage';
export { SavedHomesPage } from './components/saved/SavedHomesPage';
