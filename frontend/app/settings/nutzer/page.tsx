"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function R() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/nutzer"); }, [router]);
  return null;
}
