# UX & Design – Backlog plan

Aligned with **frontend-design** (distinctive typography, color, motion, spatial composition) and **ui-ux-pro-max** (accessibility, touch targets, typography/color tokens, animation 150–300ms, no emoji-as-icons).

## Pending "Do Later" – UX & Design

All UX & Design backlog items from this plan have been implemented in code.

## Order for this session

1. **#33 Share card** – Done.
2. **#32 Letter color** – Done. DB column `letter_color`, EditPage Theme step color picker + "Use default", BirthdayPage applies gradient to all letter/keepsake paper cards.
3. **#5 Theme builder** – Done. 10 Google Fonts (jakarta, playfair, caveat, nunito, sora, cormorant, space-grotesk, dm-serif, inter, outfit), 3-stop gradient with midpoint toggle, 8-direction angle picker, accent color. DB migration, server CRUD, ThemeBuilderPage, ThemeSelector, BirthdayPage consumption all updated. Backward compat: `sans`→`jakarta`, `serif`→`playfair`.
4. **#30 & #38 Design system / Dashboard** – Done. Added `shadow-card`/`shadow-card-lg`/`shadow-card-hover` utility tokens. Unified all page headers to shared `Header` component (added `backTo` prop). Normalized border radius (3-tier: 2rem/1.5rem/1rem). Standardized eyebrow tracking to `0.2em`. Fixed Footer hardcoded `bg-violet-900` to `bg-foreground`. Fixed CreatePage missing `Eye` import. Sized nav buttons to `lg` in Edit/Create pages. Removed unused imports.
5. **#27 More animations – slide stars** – Done. Added subtle falling star streaks over mobile story cards and the desktop slide stage, respecting `prefers-reduced-motion`.
6. **#13 Social previews** – Done. Dynamic `/api/og/:id` + `/api/og-image/:id` endpoints, SVG OG image, and `vercel.json` rewrites for bot user-agents.
7. **#8 More personalized messages** – Done. Rich text editor on `ContributePage`, rotating placeholders, sanitized HTML storage, and rich-text rendering on `BirthdayPage`.
8. **#17 Audio plays from letter** – Done. Opening soundtrack controls on the birthday page wired so audio plays from the letter experience when enabled.
9. **Dashboard refresh (new mock)** – In progress.
   - Update `src/pages/Dashboard.tsx` layout to match mock (hero + stacked stat pills + simplified page cards)
   - Keep existing colors/tokens, logo + header, icons, and page-fetch logic/handlers
   - Verify responsiveness (mobile → desktop) and no regressions to delete/share/search flows

## Verification

- For #33: Open share card dialog on a birthday page → check contrast, readability, download/copy still work.
- For #5: Open /themes → create theme → verify all 10 fonts render in preview, midpoint/angle/accent persist on save/edit. Apply custom theme to a page → verify gradient + font on BirthdayPage.
- For Dashboard refresh: Open `/dashboard` with live pages + archived pages + saved pages → confirm stats match, search works, preview/edit links work, actions menu works, and layout matches mock.
- Re-read plan after each item; update this file when scope changes.
