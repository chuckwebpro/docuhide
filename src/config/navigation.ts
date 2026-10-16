/**
 * DocuHide primary navigation — matches live site (Overview, News, Schedule Demo).
 */

export interface NavLink {
  label: string;
  href: string;
  description?: string;
  icon?: string;
}

export interface MegaColumn {
  heading?: string;
  links: NavLink[];
}

export interface MegaPanel {
  kind: 'mega';
  columns: MegaColumn[];
  featured?: {
    title: string;
    body: string;
    href: string;
    cta: string;
  };
}

export interface LinkListPanel {
  kind: 'links';
  links: NavLink[];
}

export interface NavItem {
  label: string;
  href?: string;
  panel?: MegaPanel | LinkListPanel;
}

export interface NavigationConfig {
  primary: NavItem[];
  cta: { label: string; dialogId: string; href?: string };
  footer: { heading: string; links: NavLink[] }[];
  legal: NavLink[];
}

export const navigation: NavigationConfig = {
  primary: [
    { label: 'Overview', href: '/solutions/' },
    { label: 'News', href: '/news/' },
  ],
  cta: { label: 'Schedule Demo', dialogId: 'popout-demo-form' },
  footer: [],
  legal: [],
};
