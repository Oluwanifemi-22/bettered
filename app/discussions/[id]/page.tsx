"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "firebase/auth";
import { onAuthChange } from "@/src/lib/auth";
import {
  listenToDiscussion,
  replyToDiscussion,
  voteOnDiscussion,
  voteOnReply,
  deleteDiscussion,
  deleteReply,
  Discussion,
  Reply,
} from "@/src/lib/discussions";
import { getUserProfile } from "@/src/lib/users";
import { writeActivity, deleteActivityForSource } from "@/src/lib/activity";
import { trackEvent } from "@/src/lib/analytics";
import { Timestamp } from "firebase/firestore";
import RichTextRenderer from "@/app/components/RichTextRenderer";
import ShareButton from "@/app/components/ShareButton";

function timeAgo(ts: Timestamp): string {
  const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function VoteBar({
  upvotes,
  downvotes,
  uid,
  onVote,
}: {
  upvotes: string[];
  downvotes: string[];
  uid: string;
  onVote: (v: "up" | "down") => void;
}) {
  const hasUp = (upvotes ?? []).includes(uid);
  const hasDown = (downvotes ?? []).includes(uid);
  const score = (upvotes ?? []).length - (downvotes ?? []).length;
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onVote("up")}
        className={`px-1.5 py-0.5 text-sm font-bold transition ${hasUp ? "text-[#8C1515]" : "text-neutral-400 hover:text-[#8C1515]"}`}
      >
        ▲
      </button>
      <span className={`min-w-[1.5ch] text-center text-sm font-semibold tabular-nums ${score > 0 ? "text-[#8C1515]" : score < 0 ? "text-neutral-500" : "text-neutral-400"}`}>
        {score}
      </span>
      <button
        onClick={() => onVote("down")}
        className={`px-1.5 py-0.5 text-sm font-bold transition ${hasDown ? "text-[#8C1515]" : "text-neutral-400 hover:text-neutral-600"}`}
      >
        ▼
      </button>
    </div>
  );
}

function InlineReplyForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (text: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    await onSubmit(text.trim());
    setText("");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Write a reply..."
        className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="rounded-lg bg-[#8C1515] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#6f1010] disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Reply"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function NestedReplyRow({
  child,
  uid,
  discussionId,
  onTrack,
}: {
  child: Reply;
  uid: string;
  discussionId: string;
  onTrack: (v: "up" | "down") => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwner = child.uid === uid;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-neutral-800">
          {child.displayName ?? "Anonymous"}
        </span>
        <span className="text-xs text-neutral-400">{timeAgo(child.timestamp)}</span>
      </div>
      <RichTextRenderer content={child.text} />
      <div className="mt-2 flex items-center gap-4">
        {child.id && (
          <VoteBar
            upvotes={child.upvotes ?? []}
            downvotes={child.downvotes ?? []}
            uid={uid}
            onVote={(v) => { voteOnReply(discussionId, child.id, uid, v); onTrack(v); }}
          />
        )}
        {isOwner && child.id && (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">Delete?</span>
              <button onClick={() => deleteReply(discussionId, child.id)} className="text-xs font-semibold text-red-600 hover:text-red-700">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-neutral-400 hover:text-neutral-600">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-neutral-400 transition hover:text-red-600">
              Delete
            </button>
          )
        )}
      </div>
    </div>
  );
}

function ReplyCard({
  reply,
  children,
  uid,
  discussionId,
  replyingTo,
  onReplyClick,
  onCancelReply,
  onNestedReply,
  onTrack,
}: {
  reply: Reply;
  children?: Reply[];
  uid: string;
  discussionId: string;
  replyingTo: string | null;
  onReplyClick: (id: string) => void;
  onCancelReply: () => void;
  onNestedReply: (text: string, parentId: string) => Promise<void>;
  onTrack: (v: "up" | "down") => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canVote = !!reply.id;
  const isOwner = reply.uid === uid;

  return (
    <div className="rounded-2xl bg-[#faf7f5] p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-neutral-800">
          {reply.displayName ?? "Anonymous"}
        </span>
        <span className="text-xs text-neutral-400">{timeAgo(reply.timestamp)}</span>
      </div>

      <RichTextRenderer content={reply.text} />

      <div className="mt-3 flex items-center gap-4">
        {canVote && (
          <VoteBar
            upvotes={reply.upvotes ?? []}
            downvotes={reply.downvotes ?? []}
            uid={uid}
            onVote={(v) => { voteOnReply(discussionId, reply.id, uid, v); onTrack(v); }}
          />
        )}
        <button
          onClick={() => onReplyClick(reply.id ?? "")}
          className="text-xs font-semibold text-neutral-400 transition hover:text-[#8C1515]"
        >
          Reply
        </button>
        {isOwner && reply.id && (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">Delete?</span>
              <button onClick={() => deleteReply(discussionId, reply.id)} className="text-xs font-semibold text-red-600 hover:text-red-700">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-neutral-400 hover:text-neutral-600">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-neutral-400 transition hover:text-red-600">
              Delete
            </button>
          )
        )}
      </div>

      {replyingTo === reply.id && (
        <InlineReplyForm
          onSubmit={(text) => onNestedReply(text, reply.id)}
          onCancel={onCancelReply}
        />
      )}

      {/* Nested replies */}
      {children && children.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-[#ead7d7] pl-4">
          {children.map((child, i) => (
            <NestedReplyRow key={child.id ?? i} child={child} uid={uid} discussionId={discussionId} onTrack={onTrack} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ThreadPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [authorRep, setAuthorRep] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubAuth = onAuthChange((currentUser) => {
      if (!currentUser) { router.push("/"); return; }
      setUser(currentUser);
      setLoading(false);
      getUserProfile(currentUser.uid).then((p) => {
        setIsAdmin((p as Record<string, unknown>)?.role === "admin");
      });
    });
    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    if (!id) return;
    const unsub = listenToDiscussion(id, (d) => {
      setDiscussion(d);
      if (d) {
        getUserProfile(d.createdBy).then((p) => {
          const rep = (p as Record<string, unknown>)?.reputation as Record<string, number> | undefined;
          setAuthorRep(rep?.[d.courseTag] ?? null);
        });
      }
    });
    return () => unsub();
  }, [id]);

  async function handleTopLevelReply(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !replyText.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      await replyToDiscussion(id, user.uid, user.displayName ?? user.email ?? "Anonymous", replyText.trim());
      if (discussion) {
        writeActivity(user.uid, user.displayName ?? user.email ?? "Someone", "replied_discussion", discussion.courseTag);
        trackEvent(user.uid, user.displayName ?? user.email ?? "Someone", "reply_post", { courseTag: discussion.courseTag, sourceId: id });
      }
      setReplyText("");
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError("Failed to post reply. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    await deleteDiscussion(id);
    deleteActivityForSource(id);
    router.push("/");
  }

  async function handleNestedReply(text: string, parentId: string) {
    if (!user) return;
    await replyToDiscussion(id, user.uid, user.displayName ?? user.email ?? "Anonymous", text, parentId);
    setReplyingTo(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ead7d7] border-t-[#8C1515]"></div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="rounded-3xl border border-[#ead7d7] bg-white p-10 text-center">
        <p className="font-semibold text-neutral-900">Thread not found.</p>
        <Link href="/" className="mt-3 inline-block text-sm font-medium text-[#8C1515] hover:underline">
          ← Back to board
        </Link>
      </div>
    );
  }

  const topLevelReplies = discussion.replies.filter((r) => !r.parentId);
  const childrenOf = (parentId: string) => discussion.replies.filter((r) => r.parentId === parentId);
  const totalReplies = discussion.replies.length;

  return (
    <div className="space-y-6">
      {/* Original post */}
      <section className="rounded-3xl border border-[#ead7d7] bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-[#8C1515] hover:underline">
            ← Discussion board
          </Link>
          <ShareButton title={discussion.title} label="Share thread" />

          {(user?.uid === discussion.createdBy || isAdmin) && (
            <div className="flex items-center gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-sm text-neutral-500">Delete this post?</span>
                  <button
                    onClick={handleDelete}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm font-medium text-neutral-400 transition hover:text-red-600"
                >
                  Delete post
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-bold text-[#8C1515]">
            {discussion.courseTag}
          </span>
          {discussion.type && (
            <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium capitalize text-neutral-500">
              {discussion.type}
            </span>
          )}
          {authorRep !== null && authorRep > 0 && (
            <span className="rounded-full bg-[#8C1515] px-2.5 py-1 text-xs font-bold text-white">
              {discussion.courseTag} · {authorRep} pts
            </span>
          )}
          <span className="ml-auto text-xs text-neutral-400">{timeAgo(discussion.createdAt)}</span>
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-950">
          {discussion.title}
        </h1>

        <RichTextRenderer content={discussion.body} className="mt-4" />

        {user && (
          <div className="mt-5">
            <VoteBar
              upvotes={discussion.upvotes ?? []}
              downvotes={discussion.downvotes ?? []}
              uid={user.uid}
              onVote={(v) => {
                voteOnDiscussion(id, user.uid, v);
                trackEvent(user.uid, user.displayName ?? user.email ?? "Someone", v === "up" ? "upvote" : "downvote", { courseTag: discussion.courseTag, sourceId: id });
              }}
            />
          </div>
        )}
      </section>

      {/* Replies */}
      <section className="rounded-3xl border border-[#ead7d7] bg-white p-8 shadow-sm">
        <h2 className="mb-5 text-xl font-bold text-neutral-950">
          {totalReplies === 0 ? "No replies yet" : `${totalReplies} ${totalReplies === 1 ? "reply" : "replies"}`}
        </h2>

        <div className="space-y-4">
          {topLevelReplies.map((reply, i) => (
            <ReplyCard
              key={reply.id ?? i}
              reply={reply}
              children={childrenOf(reply.id)}
              uid={user!.uid}
              discussionId={id}
              replyingTo={replyingTo}
              onReplyClick={(rid) => setReplyingTo(rid === replyingTo ? null : rid)}
              onCancelReply={() => setReplyingTo(null)}
              onNestedReply={handleNestedReply}
              onTrack={(v) => trackEvent(user!.uid, user!.displayName ?? user!.email ?? "Someone", v === "up" ? "upvote" : "downvote", { courseTag: discussion.courseTag, sourceId: id })}
            />
          ))}
        </div>

        <div ref={bottomRef} />

        {/* Top-level reply form */}
        <form onSubmit={handleTopLevelReply} className="mt-6 space-y-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Write a reply..."
            className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515]"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !replyText.trim()}
            className="rounded-xl bg-[#8C1515] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f1010] disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post reply"}
          </button>
        </form>
      </section>
    </div>
  );
}
