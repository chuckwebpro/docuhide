/** News index card order and display metadata (matches live /news/). */
export interface NewsCard {
  slug: string;
  title: string;
  dateLabel: string;
  banner: string;
}

export const newsCards: NewsCard[] = [
  {
    slug: 'microsoft-baffled-how-hackers-stole-azure-ad-signing-key',
    title: 'Microsoft baffled how hackers stole Azure AD signing key',
    dateLabel: 'Monday, July 17, 2023',
    banner: '/images/news-images/banner/CHINA-HACK.webp',
  },
  {
    slug: 'critical-windows-snipping-tool-vulnerability',
    title: 'Critical Windows Snipping Tool Vulnerability',
    dateLabel: 'Thursday, March 23, 2023',
    banner: '/images/news-images/banner/Redaction-Windows11-Exploit.webp',
  },
  {
    slug: 'google-pixel-flaw-allowed-recovery-of-redacted-images',
    title: 'Google Pixel FLAW Allowed Recovery of Redacted Images',
    dateLabel: 'Tuesday, March 21, 2023',
    banner: '/images/news-images/banner/redaction-flaw-pixel.webp',
  },
  {
    slug: 'atlassian-data-leak-part-2',
    title: 'Atlassian Data Leak PART 2',
    dateLabel: 'Thursday, March 2, 2023',
    banner: '/images/news-images/banner/leak2.webp',
  },
  {
    slug: 'atlassian-data-leak-part-1',
    title: 'Atlassian Data Leak Part 1',
    dateLabel: 'Tuesday, February 28, 2023',
    banner: '/images/news-images/banner/leak1.webp',
  },
  {
    slug: 'data-breaches-in-2022-and-2023',
    title: 'Data Breaches in 2022 and 2023',
    dateLabel: 'Friday, February 10, 2023',
    banner: '/images/news-images/banner/DATA-BREECH-2023.webp',
  },
  {
    slug: 'north-korean-ransomware-attacks-on-healthcare-',
    title: 'North Korean ransomware attacks on healthcare ',
    dateLabel: 'Friday, February 10, 2023',
    banner: '/images/news-images/banner/NORTH-KOREA-BANNER.webp',
  },
  {
    slug: 'avemaria-info-stealer-infect-more-users',
    title: 'AveMaria Info-stealer Infect More Users',
    dateLabel: 'Tuesday, February 7, 2023',
    banner: '/images/news-images/banner/INFO_STEELER.webp',
  },
  {
    slug: 'dropbox-breech--who-s-next',
    title: "Dropbox Breech. Who's Next",
    dateLabel: 'Wednesday, January 25, 2023',
    banner: '/images/news-images/banner/DROPbox-HACK.webp',
  },
  /** On live: linked from article “Other Posts” only (not on /news/ grid). */
  {
    slug: 'document-security-and-redaction',
    title: 'Document Security and Redaction',
    dateLabel: 'Thursday, December 22, 2022',
    banner: '/images/news-images/banner/generic-banner.webp',
  },
];

/** Cards shown on /news/ (excludes sidebar-only entries). */
export const newsIndexCards = newsCards.filter(
  (card) => card.slug !== 'document-security-and-redaction',
);
