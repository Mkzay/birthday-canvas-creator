import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Copy,
  Crown,
  Link2,
  Loader2,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BirthdayPage } from '@/pages/dashboardPage/types';
import type { PageCollaborator } from '@/lib/collaborators';

interface CollaboratorsModalProps {
  page: BirthdayPage | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isProUser: boolean;
  onCollaboratorChange?: () => void;
}

export function CollaboratorsModal({
  page,
  isOpen,
  onOpenChange,
  isProUser,
  onCollaboratorChange,
}: CollaboratorsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<PageCollaborator[]>([]);
  const [isOwner, setIsOwner] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [revokingInvite, setRevokingInvite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadCollaborators = useCallback(async () => {
    if (!page) return;
    setLoading(true);
    try {
      const data = await apiFetch<{
        is_owner: boolean;
        collaborators: PageCollaborator[];
        active_invite: { expires_at: string; created_at: string } | null;
      }>(`/pages/${page.public_code}/collaborators`);

      setIsOwner(data.is_owner);
      setCollaborators(data.collaborators || []);
      if (!data.active_invite) {
        setInviteUrl(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load co-organizers');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (isOpen && page) {
      void loadCollaborators();
    } else {
      setInviteUrl(null);
      setCopiedLink(false);
    }
  }, [isOpen, page, loadCollaborators]);

  const handleGenerateInvite = async () => {
    if (!page) return;
    if (!isProUser) {
      toast.info('Multi-organizer co-editing is a Pro feature.');
      return;
    }

    setGeneratingInvite(true);
    try {
      const data = await apiFetch<{
        invite_url: string;
        expires_at: string;
        created_at: string;
      }>(`/pages/${page.public_code}/collaborators/invite`, {
        method: 'POST',
      });

      setInviteUrl(data.invite_url);
      toast.success('Shareable invite link generated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate invite link');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleRevokeInvite = async () => {
    if (!page) return;
    setRevokingInvite(true);
    try {
      await apiFetch<void>(`/pages/${page.public_code}/collaborators/invite`, {
        method: 'DELETE',
      });
      setInviteUrl(null);
      toast.success('Invite link revoked');
    } catch (error) {
      console.error(error);
      toast.error('Failed to revoke invite link');
    } finally {
      setRevokingInvite(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorUserId: string, collaboratorName: string) => {
    if (!page) return;
    setRemovingId(collaboratorUserId);
    try {
      await apiFetch<void>(`/pages/${page.public_code}/collaborators/${collaboratorUserId}`, {
        method: 'DELETE',
      });

      setCollaborators((prev) => prev.filter((c) => c.user_id !== collaboratorUserId));
      toast.success(
        collaboratorUserId === user?.id
          ? 'You have left this celebration'
          : `Removed ${collaboratorName} from co-organizers`
      );

      if (collaboratorUserId === user?.id) {
        onOpenChange(false);
        onCollaboratorChange?.();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove co-organizer');
    } finally {
      setRemovingId(null);
    }
  };

  const handleCopyInviteUrl = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      window.prompt('Copy this invite link:', inviteUrl);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xl sm:p-7">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 border border-amber-200">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="font-serif text-xl font-bold text-slate-950">
                Co-Organizer Team
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Collaborate with friends or family on {page?.recipient_name}&apos;s celebration canvas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-xs text-stone-500">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-600 mb-2" />
            <span>Loading team members...</span>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* 1. Shareable Invite Section */}
            {isOwner ? (
              isProUser ? (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-amber-700" />
                      <span>Shareable Invite Link</span>
                    </span>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                      Valid 7 Days
                    </span>
                  </div>

                  {inviteUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white p-1.5">
                        <span className="flex-1 truncate pl-2 font-mono text-[11px] text-stone-500 select-all">
                          {inviteUrl}
                        </span>
                        <Button
                          size="sm"
                          onClick={handleCopyInviteUrl}
                          className="btn-press shrink-0 gap-1 rounded-lg bg-amber-500 text-slate-950 px-3 py-1.5 text-xs font-bold hover:bg-amber-400"
                        >
                          {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                        </Button>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleRevokeInvite}
                          disabled={revokingInvite}
                          className="text-[11px] font-medium text-rose-600 hover:text-rose-800 underline"
                        >
                          {revokingInvite ? 'Revoking...' : 'Revoke link'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Button
                        size="sm"
                        onClick={handleGenerateInvite}
                        disabled={generatingInvite}
                        className="btn-press w-full rounded-xl bg-slate-950 text-white text-xs font-semibold py-2 hover:bg-slate-900"
                      >
                        {generatingInvite ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            <span>Creating invite link...</span>
                          </>
                        ) : (
                          <span>Create Co-organizer Invite Link</span>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-stone-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-amber-600" />
                      <span>Co-organizer Invitations</span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                      Pro
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Invite family and friends to help you orchestrate themes, soundtracks, and reveal timing together.
                  </p>
                  <Link
                    to="/upgrade?feature=team-collaboration"
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 underline underline-offset-2 pt-1"
                  >
                    <span>Upgrade to Pro to invite co-organizers &rarr;</span>
                  </Link>
                </div>
              )
            ) : null}

            {/* 2. Active Co-organizers List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Active Co-Organizers ({collaborators.length})
              </span>

              {collaborators.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-400">
                  No co-organizers joined yet. Generate an invite link above to share with trusted co-hosts.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {collaborators.map((collab) => {
                    const isSelf = collab.user_id === user?.id;
                    const displayName = collab.display_name || collab.email?.split('@')[0] || 'Co-organizer';

                    return (
                      <div
                        key={collab.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50/80 p-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {collab.avatar_url ? (
                            <img
                              src={collab.avatar_url}
                              alt={displayName}
                              className="h-8 w-8 rounded-full object-cover border border-stone-200"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 font-bold text-xs text-amber-950">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {displayName} {isSelf && <span className="text-stone-400 font-normal">(You)</span>}
                            </p>
                            <p className="truncate text-[10px] text-stone-400">
                              {collab.email || 'Co-organizer'}
                            </p>
                          </div>
                        </div>

                        {(isOwner || isSelf) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={removingId === collab.user_id}
                            onClick={() => handleRemoveCollaborator(collab.user_id, displayName)}
                            className="h-7 px-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                            title={isSelf ? 'Leave celebration' : 'Remove co-organizer'}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
