import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Heart,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, resolveAssetUrl } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import type { CollaboratorInvitePreview } from '@/lib/collaborators';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<CollaboratorInvitePreview | null>(null);
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<'not_found' | 'expired_or_revoked' | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorStatus('not_found');
      setLoading(false);
      return;
    }

    const fetchInviteContext = async () => {
      try {
        const data = await apiFetch<CollaboratorInvitePreview & { public_code: string }>(
          `/pages/invites/${token}`
        );

        if (data.is_expired || data.is_revoked) {
          setErrorStatus('expired_or_revoked');
        } else {
          setInvite(data);
          setPublicCode(data.public_code);
        }
      } catch (err) {
        console.error(err);
        setErrorStatus('not_found');
      } finally {
        setLoading(false);
      }
    };

    void fetchInviteContext();
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await apiFetch<{
        status: string;
        public_code: string;
        message: string;
      }>(`/pages/invites/${token}/accept`, {
        method: 'POST',
      });

      toast.success(res.message || 'You have joined as a co-organizer!');
      navigate(`/dashboard`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept co-organizer invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] p-4 text-slate-900">
        <div className="text-center space-y-2">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-600" />
          <p className="text-xs text-stone-500 font-medium">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-amber-200/30 to-rose-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[400px] w-[400px] rounded-full bg-gradient-to-bl from-rose-200/25 to-amber-200/20 blur-3xl" />

      {/* Top Brand Bar */}
      <header className="relative z-10 mx-auto w-full max-w-lg flex items-center justify-between pb-4">
        <Link to="/" className="inline-flex items-center gap-2">
          <BrandLogo className="h-7 w-auto" />
        </Link>
        <span className="text-xs font-serif font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
          Co-organizer Invite
        </span>
      </header>

      {/* Main Content Box */}
      <main className="relative z-10 mx-auto w-full max-w-lg my-auto">
        {errorStatus === 'not_found' ? (
          <div className="rounded-3xl border border-stone-200/90 bg-white p-7 text-center shadow-card space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 text-2xl">
              ✉️
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-950">
                Invitation Not Found
              </h2>
              <p className="mt-1.5 text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                This co-organizer invitation link may be invalid or has already been removed by the creator.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/">
                <Button className="btn-press rounded-xl bg-slate-950 text-white text-xs font-semibold px-6 py-2">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        ) : errorStatus === 'expired_or_revoked' ? (
          <div className="rounded-3xl border border-stone-200/90 bg-white p-7 text-center shadow-card space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 text-2xl border border-amber-200">
              ⏳
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-950">
                Invitation Link Expired
              </h2>
              <p className="mt-1.5 text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                This shareable link has passed its 7-day expiration period or was revoked by the celebration organizer. Ask them to generate a new link.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/">
                <Button className="btn-press rounded-xl bg-slate-950 text-white text-xs font-semibold px-6 py-2">
                  Go to Home
                </Button>
              </Link>
            </div>
          </div>
        ) : invite ? (
          <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-card">
            {/* Recipient Cover or Gradient Banner */}
            <div className="relative aspect-[16/7] w-full overflow-hidden bg-stone-100 border-b border-stone-100">
              {invite.cover_photo_url ? (
                <img
                  src={resolveAssetUrl(invite.cover_photo_url) || invite.cover_photo_url}
                  alt={`${invite.recipient_name}'s celebration`}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 flex items-center justify-center text-4xl">
                  🎂
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                <span className="font-serif font-bold text-lg drop-shadow-sm">
                  {invite.recipient_name}&apos;s Celebration
                </span>
                <span className="text-[11px] font-medium bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                  {format(parseLocalDate(invite.birthday_date), 'MMMM d, yyyy')}
                </span>
              </div>
            </div>

            {/* Invitation Details Body */}
            <div className="p-6 sm:p-7 space-y-6 text-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                  <Users className="h-3.5 w-3.5 text-amber-700" />
                  <span>Team Collaboration Invite</span>
                </span>

                <h1 className="mt-3 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Help orchestrate {invite.recipient_name}&apos;s birthday
                </h1>

                <p className="mt-2 text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
                  <strong className="font-semibold text-slate-900">{invite.owner_name}</strong> invited you to co-organize this birthday canvas. You will be able to customize themes, pick soundtracks, review wishes, and manage the reveal timing.
                </p>
              </div>

              {/* What you can do as a co-organizer */}
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 text-left space-y-2 text-xs">
                <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                  As a co-organizer, you can:
                </span>
                <ul className="space-y-1.5 text-stone-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Customize themes, soundtrack audio, and cover photo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Review wishes, photos, and voice note recordings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Track real-time visitor footfall and participation analytics</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {user ? (
                  <Button
                    size="lg"
                    onClick={handleAcceptInvite}
                    disabled={accepting}
                    className="btn-press w-full rounded-2xl bg-slate-950 py-3.5 text-xs font-bold text-white shadow-card hover:bg-slate-900 transition-all"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Joining celebration team...</span>
                      </>
                    ) : (
                      <>
                        <span>Accept & Join as Co-Organizer</span>
                        <ChevronRight className="h-4 w-4 ml-1 text-amber-300" />
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to={`/auth?redirect=${encodeURIComponent(`/organize/${token}`)}`}
                      className="block w-full"
                    >
                      <Button
                        size="lg"
                        className="btn-press w-full rounded-2xl bg-slate-950 py-3.5 text-xs font-bold text-white shadow-card hover:bg-slate-900 transition-all"
                      >
                        <span>Sign In to Accept Invitation</span>
                        <ChevronRight className="h-4 w-4 ml-1 text-amber-300" />
                      </Button>
                    </Link>
                    <p className="text-[11px] text-stone-400">
                      Sign in or create an account to add this celebration to your atelier dashboard.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer Note */}
      <footer className="relative z-10 mx-auto w-full max-w-lg text-center pt-4 text-[11px] text-stone-400">
        WishCanvas Celebrations Atelier
      </footer>
    </div>
  );
}
