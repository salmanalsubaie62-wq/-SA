"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "ar";

const STRINGS = {
  en: {
    appName: "OMNIA AI",
    tagline: "One Platform. Infinite Intelligence.",
    nav_dashboard: "Dashboard",
    nav_chat: "Super Chat",
    nav_images: "Image Studio",
    nav_video: "Video Studio",
    nav_research: "Research",
    nav_documents: "Documents",
    nav_coding: "Coding Lab",
    nav_voice: "Voice",
    nav_agents: "AI Agents",
    nav_projects: "Projects",
    nav_memory: "Memory",
    nav_settings: "Settings",
    nav_admin: "Admin",
    new_chat: "New chat",
    search_chats: "Search conversations",
    sign_out: "Sign out",
    menu: "Menu",
    send: "Send",
    stop: "Stop",
    regenerate: "Regenerate",
    copy: "Copy",
    copied: "Copied",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    rename: "Rename",
    pin: "Pin",
    unpin: "Unpin",
    export: "Export",
    read_aloud: "Read aloud",
    attach: "Attach file",
    voice_input: "Voice input",
    listening: "Listening…",
    message_placeholder: "Message OMNIA…",
    empty_title: "How can I help you today?",
    empty_sub: "Ask anything, analyze files and images, write and debug code, or research a topic.",
    no_provider_title: "No AI provider is connected",
    no_provider_body: "OMNIA only answers through real AI providers. Add an API key on the server (ANTHROPIC_API_KEY, OPENAI_API_KEY or GOOGLE_API_KEY) and restart.",
    mode: "Mode",
    auto_routed: "Auto-routed",
    answered_by: "Answered by",
    email: "Email",
    password: "Password",
    name: "Name",
    sign_in: "Sign in",
    create_account: "Create account",
    have_account: "Already have an account?",
    no_account: "New to OMNIA?",
    language: "Language",
    memory: "Memory",
    coming_soon: "Not connected yet",
    no_conversations: "No conversations yet.",
  },
  ar: {
    appName: "أومنيا AI",
    tagline: "منصة واحدة. ذكاء بلا حدود.",
    nav_dashboard: "لوحة التحكم",
    nav_chat: "الدردشة الذكية",
    nav_images: "استوديو الصور",
    nav_video: "استوديو الفيديو",
    nav_research: "البحث",
    nav_documents: "المستندات",
    nav_coding: "مختبر البرمجة",
    nav_voice: "الصوت",
    nav_agents: "وكلاء الذكاء",
    nav_projects: "المشاريع",
    nav_memory: "الذاكرة",
    nav_settings: "الإعدادات",
    nav_admin: "الإدارة",
    new_chat: "محادثة جديدة",
    search_chats: "ابحث في المحادثات",
    sign_out: "تسجيل الخروج",
    menu: "القائمة",
    send: "إرسال",
    stop: "إيقاف",
    regenerate: "إعادة التوليد",
    copy: "نسخ",
    copied: "تم النسخ",
    edit: "تعديل",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    rename: "إعادة التسمية",
    pin: "تثبيت",
    unpin: "إلغاء التثبيت",
    export: "تصدير",
    read_aloud: "قراءة بصوت عالٍ",
    attach: "إرفاق ملف",
    voice_input: "إدخال صوتي",
    listening: "جارٍ الاستماع…",
    message_placeholder: "اكتب رسالتك إلى أومنيا…",
    empty_title: "كيف يمكنني مساعدتك اليوم؟",
    empty_sub: "اسأل عن أي شيء، حلّل الملفات والصور، اكتب الكود وصحّحه، أو ابحث في أي موضوع.",
    no_provider_title: "لا يوجد مزوّد ذكاء اصطناعي متصل",
    no_provider_body: "أومنيا تجيب فقط عبر مزوّدي ذكاء اصطناعي حقيقيين. أضف مفتاح API على الخادم ثم أعد التشغيل.",
    mode: "الوضع",
    auto_routed: "توجيه تلقائي",
    answered_by: "أجاب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    name: "الاسم",
    sign_in: "تسجيل الدخول",
    create_account: "إنشاء حساب",
    have_account: "لديك حساب بالفعل؟",
    no_account: "جديد في أومنيا؟",
    language: "اللغة",
    memory: "الذاكرة",
    coming_soon: "غير متصل بعد",
    no_conversations: "لا توجد محادثات بعد.",
  },
} as const;

export type StringKey = keyof (typeof STRINGS)["en"];

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: next }),
    }).catch(() => undefined);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key) => STRINGS[lang][key] ?? STRINGS.en[key] }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
