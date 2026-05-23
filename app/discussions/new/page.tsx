"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { signOut, onAuthChange } from "@/src/lib/auth";

export default function CreateDiscussionPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubAuth = onAuthChange((currentUser) => {
            if (!currentUser) { router.push("/"); return; }
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubAuth();
    }, [router]);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        // Backend not connected yet — this is UI-only for now.
        alert("Discussion post UI is ready. Backend connection coming later.");
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ead7d7] border-t-[#8C1515]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <section className="rounded-3xl border border-[#ead7d7] bg-white px-8 py-10 shadow-sm">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl space-y-4">
                        <Link
                            href="/"
                            className="text-sm font-semibold text-[#8C1515] hover:underline"
                        >
                            ← Back to discussion board
                        </Link>

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8C1515]">
                            Start a course conversation
                        </p>

                        <h1 className="text-4xl font-bold tracking-tight text-neutral-950 md:text-5xl">
                            Create a new discussion post.
                        </h1>

                        <p className="text-base leading-7 text-neutral-600">
                            Ask a question, share a resource, or start a course-specific
                            conversation that other students can respond to.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[#ead7d7] bg-[#faf7f5] p-5">
                        <div className="space-y-3">
                            <p className="text-sm text-neutral-500">Signed in as</p>
                            <p className="font-medium text-neutral-900">{user?.email}</p>
                            <button
                                onClick={signOut}
                                className="rounded-full border border-[#8C1515] px-4 py-2 text-sm font-medium text-[#8C1515] transition hover:bg-[#8C1515] hover:text-white"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <form
                    onSubmit={handleSubmit}
                    className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm"
                >
                    <h2 className="text-2xl font-bold text-neutral-950">
                        Discussion details
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                        Keep it clear enough that classmates know how to respond.
                    </p>

                    <div className="mt-6 space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-neutral-800">
                                Course
                            </label>
                            <input
                                name="course"
                                placeholder="e.g. CS278, MATH51, DESIGN121"
                                required
                                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515]"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-neutral-800">
                                Post type
                            </label>
                            <select
                                name="type"
                                required
                                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#8C1515]"
                            >
                                <option value="">Select a type</option>
                                <option value="question">Question</option>
                                <option value="resource">Resource</option>
                                <option value="study-plan">Study plan</option>
                                <option value="clarification">Clarification</option>
                                <option value="general">General discussion</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-neutral-800">
                                Title
                            </label>
                            <input
                                name="title"
                                placeholder="What do you want to ask or share?"
                                required
                                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515]"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-neutral-800">
                                Body
                            </label>
                            <textarea
                                name="body"
                                rows={8}
                                placeholder="Add context, what you’ve tried, useful links, or what kind of help you’re looking for..."
                                required
                                className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515]"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-xl bg-[#8C1515] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6f1010]"
                        >
                            Post discussion
                        </button>
                    </div>
                </form>

                <aside className="space-y-6">
                    <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-neutral-950">
                            What makes a good post?
                        </h2>

                        <div className="mt-4 space-y-4 text-sm leading-6 text-neutral-600">
                            <p>
                                <span className="font-semibold text-neutral-900">
                                    Be specific.
                                </span>{" "}
                                Include the class, topic, and what part you’re stuck on.
                            </p>

                            <p>
                                <span className="font-semibold text-neutral-900">
                                    Add context.
                                </span>{" "}
                                Share what you already tried so people can give better help.
                            </p>

                            <p>
                                <span className="font-semibold text-neutral-900">
                                    Keep it collaborative.
                                </span>{" "}
                                Ask for explanation, strategy, or resources instead of direct
                                restricted answers.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-[#ead7d7] bg-[#8C1515] p-6 text-white shadow-sm">
                        <h2 className="text-lg font-bold">Honor Code Reminder</h2>
                        <p className="mt-2 text-sm leading-6 text-red-50">
                            BetterEd is built for allowed collaboration. Before posting,
                            make sure your question follows the collaboration policy for that
                            course.
                        </p>
                    </div>
                </aside>
            </section>
        </div>
    );
}