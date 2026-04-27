"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Database, Loader2 } from "lucide-react";
import {
  loadActivePracticeListId,
  loadPracticeLists,
} from "@/lib/storage";

export default function PracticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasLists, setHasLists] = useState(false);

  useEffect(() => {
    async function redirectToActiveList() {
      const [activeListId, lists] = await Promise.all([
        loadActivePracticeListId(),
        loadPracticeLists(),
      ]);
      const targetList =
        lists.find((list) => list.id === activeListId) ?? lists[0];

      if (targetList) {
        router.replace(`/practice/${targetList.id}`);
        return;
      }

      setHasLists(false);
      setLoading(false);
    }

    redirectToActiveList().catch(() => {
      setHasLists(false);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <section className="panel flex min-h-[520px] items-center justify-center rounded-lg text-[var(--muted)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在打开练习
      </section>
    );
  }

  return (
    <section className="panel flex min-h-[520px] flex-col items-center justify-center rounded-lg p-6 text-center">
      <Database className="h-12 w-12 text-[var(--teal)]" />
      <h2 className="mt-4 text-2xl font-black">
        {hasLists ? "无法打开练习" : "暂无练习列表"}
      </h2>
      <p className="mt-2 max-w-md text-[var(--muted)]">
        先在首页选择一个练习列表，或生成新的练习列表。
      </p>
      <Link
        className="mt-5 rounded-md bg-[var(--teal)] px-5 py-2.5 font-black text-white hover:bg-[var(--teal-dark)]"
        href="/"
      >
        返回练习列表
      </Link>
    </section>
  );
}
