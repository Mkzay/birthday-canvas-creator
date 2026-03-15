# UX & Design – Backlog plan

Aligned with **frontend-design** (distinctive typography, color, motion, spatial composition) and **ui-ux-pro-max** (accessibility, touch targets, typography/color tokens, animation 150–300ms, no emoji-as-icons).

## Pending "Do Later" – UX & Design

| # | Item | Scope | Skills focus |
|---|------|--------|---------------|
| **#5** | Improve theme builder | More font choices, deeper color customization (e.g. mid-point, accent) | Typography & color systems |
| **#8** | More personalized messages | Dynamic placeholders, layout for longer messages | Forms & feedback, layout |
| **#13** | Social previews | Custom OG images per page | Performance (image), style |
| **#17** | Audio plays from letter | Autoplay voice when slide is reached | Animation, accessibility |
| **#27** | More animations | Floating elements on letter, richer interactions | Motion, reduced-motion |
| **#30 & #38** | Design system / Dashboard | Spacing, typography, layout polish | Layout, typography, tokens |
| **#32** | Organizer can change letter color | Envelope/letter color separate from theme | Color tokens, theme schema |
| **#33** | Share card visual improvement | Polish BirthdayShareCard (typography, hierarchy, no emoji-as-icons) | Typography, color, style |

## Order for this session

1. **#33 Share card** – Done.
2. **#32 Letter color** – Done. DB column `letter_color`, EditPage Theme step color picker + "Use default", BirthdayPage applies gradient to all letter/keepsake paper cards.
3. **Next** – #5 (theme builder: more fonts, deeper color), then #30/38 (design system / dashboard).

## Verification

- For #33: Open share card dialog on a birthday page → check contrast, readability, download/copy still work.
- Re-read plan after each item; update this file when scope changes.
