import { Link, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';

const privacySections = [
  ['What we collect', 'Account email, password hashes, profile details and preferences; celebrant names, birthdays and optional email addresses; messages, photos, voice recordings and soundtracks you submit; and technical information such as IP addresses, request logs and session identifiers. If you use cash gifts, we also process contribution records and recipient bank details. Payment providers process payment credentials; WishCanvas records payment references and status.'],
  ['Why we use it', 'We use this information to provide accounts and canvases, display contributions, deliver requested emails and reminders, process upgrades and optional cash gifts, prevent abuse and troubleshoot errors. The intended legal grounds are providing the service you request, applicable legal obligations, consent where required, and proportionate interests in operating and securing the service.'],
  ['Who can see a canvas', 'Organizers and invited co-organizers can manage contributions. People with the shared canvas link can access content when its reveal and access settings allow it. A link can be forwarded, and recipients may download or copy content. Keep private claim tokens secret. Do not upload sensitive information or someone else’s photos or recordings without permission.'],
  ['Service providers', 'The application integrates with Neon for database storage, Cloudinary or API-host storage for media, Resend for email, Bachs and Paystack for payment services, and Sentry for error monitoring when configured. Hosting providers serve the website and API. These services may process data outside your country. The website is hosted on Vercel and the API on Render. Infrastructure providers may process information internationally, including in the United States. Provider regions and backup retention depend on the configured service plans; contact us for details about a specific request.'],
  ['Cookies and browser storage', 'Cookies keep you signed in and support canvas PIN access. Local and session storage remember drafts, contributor details and editing state on your device. Clear your browser’s site data to remove these local copies; doing so does not delete content stored on our servers. If Sentry is enabled, it receives diagnostic errors and performance information. Session replay is disabled.'],
  ['Retention and deletion', 'Canvases are intended to remain available for revisiting memories. Removing a canvas from the organizer dashboard hides it from public access; that action does not by itself erase every stored record. Account settings provide account/data deletion. Unsettled cash-gift balances must first be settled or refunded with support so funds are not lost. Contributors and guest creators can request access, correction or removal through hello@wishcanvas.app. We may need to verify the request and identify the relevant canvas. The application cleanup removes expired or used authentication records after 30 days, wish-edit logs after 30 days, and detailed settled payment payloads after 30 days. Minimal payment references, amounts, dates and status may be kept while your account is active and for up to seven years after account closure for accounting, reconciliation and disputes; a legal hold may require longer retention. These retained records exclude birthday content and do not retain full card details. Hosting logs and backups follow the providers’ plan-specific retention and may not disappear immediately after an account deletion request. We do not promise a fixed provider-backup erasure deadline. Copies already downloaded or shared by others are outside our control.'],
  ['Your choices and rights', 'You can update account preferences and notification settings, manage canvas contributions, or contact hello@wishcanvas.app about access, correction, deletion, portability, objection, restriction or withdrawal of consent where applicable. We will assess requests under the law that applies. You may also complain to your relevant data protection authority, including Nigeria’s Data Protection Commission where applicable.'],
  ['Children and other people’s information', 'Organizers should obtain appropriate permission before sharing a child’s information or another person’s photos or recordings. Do not include private contact details, financial information or sensitive personal information in birthday messages. Contact support to report content involving someone who has not agreed to its use.'],
  ['Contact and changes', 'WishCanvas is operated by Ayomikun Wahab-Jimoh Muh-Sodiq, trading as WishCanvas. Contact hello@wishcanvas.app for support and privacy requests. Material changes to an effective policy should be communicated through the service.'],
];

const termsSections = [
  ['Using WishCanvas', 'WishCanvas lets organizers collect birthday messages, photos and voice notes and share a celebration page. Provide accurate account information, protect your sign-in details and private claim tokens, and only manage canvases you own or are authorized to organize.'],
  ['Your content and permissions', 'You keep ownership of your contributions. You give WishCanvas permission to store, process and display them to operate the service and the sharing features you choose. Upload only material you have the right to share, with appropriate permission from the people pictured or recorded. Organizers may moderate or remove contributions.'],
  ['Acceptable use', 'Do not use the service for unlawful content, harassment, impersonation, scams, malicious files, infringement, or disclosure of someone’s private information without permission. Do not attempt to access, claim or alter another person’s canvas or bypass access controls. Report abuse to hello@wishcanvas.app with the relevant link.'],
  ['Free and Pro accounts', 'The free tier permits up to six contributors per canvas. A ₦5,000 one-time payment upgrades your account to Pro across your canvases; it is not a payment for each canvas and does not create a recurring subscription. The features and total charge shown at checkout apply to that purchase.'],
  ['Refund policy', 'We offer a full Pro upgrade refund when requested within seven days of purchase. Email hello@wishcanvas.app with your payment reference and account email. Refunds are handled through support and the payment provider, not automatically; processing time depends on the payment method. Pro access may be removed once a refund is completed. Duplicate charges and paid upgrades that were not delivered will be investigated and corrected or refunded as appropriate. This seven-day window does not limit any non-excludable consumer rights or remedies for a faulty service. Cash gifts follow the separate rules below. Do not send full card details or passwords to support.'],
  ['Cash gifts, fees and payouts', 'Where cash gifts are enabled, the contributor pays the gift amount plus a 1.5% platform charge shown at checkout. Provider processing charges reduce the amount received into the pool; the verified provider fee is used when available. A 2% payout fee is deducted from the available pool balance when the owner releases the gift after reveal. Pending checkouts must be reconciled before payout or account/canvas deletion. New checkouts close once payout starts; unexpected late payments require support review. Only the primary owner can initiate a payout to the recorded recipient bank account. A pending or OTP-required transfer is not a completed payout. We reconcile uncertain transfers before retrying; contact support with the payment reference if a transfer fails or remains pending.'],
  ['Cash-gift cancellations and refunds', 'Contact hello@wishcanvas.app promptly with the canvas link and payment reference to request cancellation of an unpaid checkout or review of a paid gift. Before payout, we check the payment and pool status to determine whether a refund can be processed. After payout, we cannot guarantee a recall from the recipient. Duplicate charges, unauthorized payments and non-delivery are investigated with the provider; fees and refund eligibility are explained before a refund is processed, and applicable consumer rights remain unaffected. No automatic payout or refund deadline is promised.'],
  ['Sharing and availability', 'A shared link can be forwarded, and people who can view a canvas may save copies. Reveal and PIN settings provide access controls but cannot recall copies already shared. Export a keepsake where available if you need your own copy. The service is not a substitute for permanent personal backups; uninterrupted availability and indefinite storage cannot be guaranteed.'],
  ['Removal and account closure', 'You can manage contributions and use account settings to request account/data deletion. Removing a canvas from your dashboard hides it from public access but is not a promise that all records have been erased. Contact hello@wishcanvas.app for removal or privacy requests. Access may be restricted where necessary to address abuse, unlawful activity or service security.'],
  ['Support, disputes and your rights', 'Contact hello@wishcanvas.app with a description of the issue and any relevant payment reference or canvas link. These terms do not exclude rights or remedies that applicable law does not allow us to exclude. WishCanvas is operated by Ayomikun Wahab-Jimoh Muh-Sodiq, trading as WishCanvas. We first try to resolve complaints through support, while preserving your rights to contact the relevant regulator or use other remedies available under applicable law.'],
];

export default function LegalPage() {
  const isPrivacy = useLocation().pathname === '/privacy';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const sections = isPrivacy ? privacySections : termsSections;

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-stone-200 bg-white px-6 py-5">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
          <BrandLogo compact />
          <Link to="/" className="text-sm font-semibold underline underline-offset-4">Back to WishCanvas</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <p className="text-sm font-medium text-stone-600">Prepared 21 October 2026</p>
        <h1 className="mt-3 font-playfair text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <aside aria-label="Draft status" className="my-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
          <strong>Draft for review — not yet effective.</strong> The policy text has been updated for the confirmed operator, refund rules, providers and retention controls. These policies become effective when the release is published; deployment and provider settings still need verification.
        </aside>
        <p className="mb-10 leading-7 text-slate-700">Questions about {isPrivacy ? 'your data' : 'the service'}? Email <a className="break-words font-medium underline underline-offset-4" href="mailto:hello@wishcanvas.app">hello@wishcanvas.app</a>.</p>
        <div className="space-y-9">
          {sections.map(([heading, body]) => (
            <section key={heading} aria-label={heading}>
              <h2 className="text-xl font-bold">{heading}</h2>
              <p className="mt-3 leading-7 text-slate-700">{body}</p>
            </section>
          ))}
        </div>
        <footer className="mt-12 flex flex-wrap gap-6 border-t border-stone-200 pt-6 text-sm">
          <Link to="/privacy" className="underline underline-offset-4">Privacy Policy</Link>
          <Link to="/terms" className="underline underline-offset-4">Terms of Service</Link>
          <a href="mailto:hello@wishcanvas.app" className="underline underline-offset-4">Contact support</a>
        </footer>
      </main>
    </div>
  );
}
