const DEFAULT_SITE_URL = "https://www.jigeumini.live";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(
    /\/+$/,
    "",
);

export const siteOrigin = new URL(siteUrl);
