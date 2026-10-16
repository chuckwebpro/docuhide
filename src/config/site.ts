/**
 * DocuHide site configuration.
 */

export interface AnalyticsConfig {
  logdash: string;
  ga4: string;
  gtm: string;
  metaPixel: string;
  bingUet: string;
  clarity: string;
}

export type SchemaBusinessType = 'LocalBusiness' | 'ProfessionalService' | 'Organization';

export interface SiteConfig {
  url: string;
  name: string;
  legalName?: string;
  tagline: string;
  description: string;
  locale: string;

  business: {
    schemaType: SchemaBusinessType;
    phone: string;
    phoneHref: string;
    email: string;
    address: {
      street: string;
      locality: string;
      region: string;
      postalCode: string;
      country: string;
    };
    geo?: { latitude: number; longitude: number };
    hours: string[];
    priceRange?: string;
  };

  social: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    x?: string;
    youtube?: string;
    tiktok?: string;
  };

  defaultOgImage: string;
  formEndpoint: string;
  scheduleDemoEndpoint: string;
  recaptchaSiteKey: string;
  /** Live site uses reCAPTCHA v2 checkbox in the demo dialog. */
  recaptchaVersion: 'v2' | 'v3';

  analytics: AnalyticsConfig;

  verification: {
    google: string;
    bing: string;
    meta: string;
  };

  consent: 'none' | 'banner';

  author: string;
}

const configuredSiteUrl = import.meta.env.SITE?.replace(/\/$/, '') || 'https://www.docuhide.com';

export const site: SiteConfig = {
  url: configuredSiteUrl,
  name: 'Docuhide',
  legalName: 'Docuhide',
  tagline: 'Best Redaction Software | First Role-Based Document Redaction',
  description:
    'Patent pending innovation, Docuhide is the Best and Only Encrypted Document Redaction Software that is role-based. Docuhide assigns permission-level readership that cannot be ransomed or hijacked.',
  locale: 'en-US',

  business: {
    schemaType: 'Organization',
    phone: '+1 (833) 362-8443',
    phoneHref: '+18333628443',
    email: 'demo@docuhide.com',
    address: {
      street: '',
      locality: '',
      region: '',
      postalCode: '',
      country: 'US',
    },
    hours: [
      'Monday 08:00-17:00',
      'Tuesday 08:00-19:00',
      'Wednesday 08:00-17:00',
      'Thursday 08:00-19:00',
      'Friday Closed',
      'Saturday Closed',
      'Sunday Closed',
    ],
  },

  social: {},

  defaultOgImage: '/images/og.jpg',

  formEndpoint: '/api/submit.php',
  scheduleDemoEndpoint: '/api/schedule-demo.php',
  recaptchaSiteKey: '6Lc8h08jAAAAAFZ_NPVaPq4DxxKWgKMLM7G2oNDf',
  recaptchaVersion: 'v2',

  analytics: {
    logdash: '',
    ga4: '',
    gtm: '',
    metaPixel: '',
    bingUet: '',
    clarity: '',
  },

  verification: {
    google: '',
    bing: '',
    meta: '',
  },

  consent: 'none',
  author: 'WEBPRO',
};

export const formattedAddress = [
  site.business.address.street,
  `${site.business.address.locality}, ${site.business.address.region} ${site.business.address.postalCode}`,
]
  .filter(Boolean)
  .join(', ');

export const logdashWebsiteId = site.analytics.logdash;

export const hasAnalytics = Object.entries(site.analytics).some(
  ([key, value]) => key !== 'logdash' && Boolean(value),
);
