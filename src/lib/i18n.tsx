"use client";
// Lightweight i18n for Family Tapestry — en / bn / hi / ar.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "bn" | "hi" | "ar";

export const LANGS: { code: Lang; label: string; rtl?: boolean }[] = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা" },
  { code: "hi", label: "हिन्दी" },
  { code: "ar", label: "العربية", rtl: true },
];

const AR = "ar";
const CLOSED_SET = new Set(["ar", "he", "ur"]);
const isRtl = (l: Lang) => CLOSED_SET.has(l);

type Dict = Record<string, string>;

const en: Dict = {
  "app.subtitle": "A Living Chronicle",
  "tree.overview": "Tree Overview",
  "toolbar.tree": "Tree",
  "toolbar.timeline": "Timeline",
  "toolbar.map": "Map",
  "toolbar.admin": "Admin",
  "toolbar.export": "Export",
  "toolbar.import": "Import",
  "toolbar.legend": "Legend",
  "toolbar.help": "Help & About",
  "toolbar.search": "Search people",
  "search.placeholder": "Search people…",
  "search.noResults": "No matches",
  "search.all": "people",
  "search.typeToFilter": "type to filter",
  "export.title": "Export Format",
  "export.png": "PNG Image",
  "export.pngDesc": "Full tree image",
  "export.pdf": "PDF Document",
  "export.pdfDesc": "Full tree (best fit)",
  "export.gedcom": "GEDCOM",
  "export.gedcomDesc": "Genealogy standard",
  "export.json": "JSON",
  "export.jsonDesc": "Full tree data",
  "export.csvPersons": "CSV — Persons",
  "export.csvPersonsDesc": "Tabular person data",
  "export.csvRel": "CSV — Relationships",
  "export.csvRelDesc": "Family connections",
  "addPerson.title": "Add a Person",
  "addPerson.subtitle": "Record a life in the tapestry",
  "addPerson.fab": "Add person",
  "addPerson.first": "Add First Person",
  "addPerson.empty": "Your Family Tapestry Awaits",
  "addPerson.emptySub": "Add the first person to begin building your tree.",
  "common.fullName": "Full Name",
  "common.birthYear": "Birth Year",
  "common.deathYear": "Death Year",
  "common.birthPlace": "Birth Place",
  "common.profession": "Profession",
  "common.bio": "Biography",
  "common.email": "Email",
  "common.phone": "Phone",
  "common.address": "Address",
  "common.website": "Website",
  "common.photo": "Photo",
  "common.uploadPhoto": "Upload Photo",
  "common.changePhoto": "Change Photo",
  "common.remove": "Remove",
  "common.edit": "Edit",
  "common.editProfile": "Edit Profile",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.close": "Close",
  "common.locked": "View-only — outside your circle.",
  "common.nameNative": "Name in Bengali / other script",
  "add.title": "Add a Person",
  "add.subtitle": "Record a life in the tapestry",
  "add.identity": "Identity",
  "add.fullName": "Full Name",
  "add.nameNative": "Name (your script)",
  "add.dates": "Dates",
  "add.birthYear": "Birth Year",
  "add.deathYear": "Death Year",
  "add.life": "Life",
  "add.birthPlace": "Birth Place",
  "add.profession": "Profession",
  "add.contact": "Contact",
  "add.email": "Email",
  "add.phone": "Phone",
  "add.address": "Address",
  "add.website": "Website",
  "add.biography": "Biography",
  "add.submit": "Add to Tree",
  "info.profile": "Profile",
  "info.parents": "Parents",
  "info.partners": "Partners",
  "info.children": "Children",
  "info.sources": "Sources",
  "info.contact": "Contact",
  "info.noBio": "No biography yet.",
  "info.deleteTitle": "Delete this person?",
  "info.deleteConfirm": "Delete",
  "parent.title": "Parent",
  "partner.title": "Partner",
  "child.title": "Child",
  "add.parent": "Add Parent",
  "add.partner": "Add Partner",
  "add.child": "Add Child",
  "legend.ringStatus": "Ring colour = status",
  "legend.living": "Living",
  "legend.deceased": "Deceased",
  "legend.divorced": "Divorced",
  "legend.connector": "Connector",
  "legend.marriage": "Marriage / Dating",
  "legend.parentChild": "Parent → Child",
  "legend.living2": "Living",
  "legend.deceased2": "Deceased",
  "viewer.editing": "Editing",
  "viewer.viewing": "Viewing",
  "viewer.away": "Away",
  "viewer.follow": "Follow",
  "viewer.following": "Following — tap to stop",
  "viewer.contact": "Contact",
  "viewer.isEditing": "is editing",
  "viewer.watching": "watching — move to stop",
  "tree.name": "The Haque Tapestry",
  "tree.new": "Create new tree",
  "tree.switch": "Switch tree",
  "keyboard.shortcuts": "Keyboard Shortcuts",
  "keyboard.close": "Close",
  "gedcom.title": "Import GEDCOM",
  "gedcom.desc": "Upload a .ged file to import your family tree data.",
  "gedcom.click": "Click to select a GEDCOM file",
  "gedcom.ready": "Ready to import:",
  "gedcom.people": "People",
  "gedcom.unions": "Unions",
  "gedcom.parentLinks": "Parent links",
  "gedcom.newTree": "This will create a brand-new tree in the tree switcher — it does not modify your current tree.",
  "gedcom.import": "Import Tree",
  "gedcom.invalid": "This doesn't look like a valid GEDCOM file.",
  "gedcom.noIndividuals": "No individuals found in the file.",
  "auth.signIn": "Sign In",
  "auth.signUp": "Sign Up",
  "auth.signOut": "Sign Out",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.show": "Show password",
  "auth.hide": "Hide password",
  "auth.forgot": "Forgot password?",
  "auth.remember": "Remember me",
  "auth.needAccount": "Need an account?",
  "auth.haveAccount": "Already have an account?",
  "admin.title": "Admin Dashboard",
  "admin.totalUsers": "Total Users",
  "admin.pending": "Pending",
  "admin.approve": "Approve",
  "admin.revoke": "Revoke",
  "recenter": "Recenter tree",
  "fitToScreen": "Fit to screen",
  "theme.toggle": "Toggle theme",
  "lang.switch": "Language",
};

const bn: Dict = {
  "lang.switch": "ভাষা",
  "common.nameNative": "বাংলা / অন্য স্ক্রিপ্টে নাম",
  "info.profile": "প্রোফাইল",
  "info.parents": "পিতামাতা",
  "info.partners": "সঙ্গী",
  "info.children": "সন্তান",
  "info.sources": "উৎস",
  "common.edit": "সম্পাদনা",
  "common.save": "সংরক্ষণ",
  "common.cancel": "বাতিল",
  "common.delete": "মুছুন",
  "auth.signIn": "সাইন ইন",
  "auth.password": "পাসওয়ার্ড",
  "auth.email": "ইমেইল",
  "auth.signUp": "নিবন্ধন",
  "auth.signOut": "সাইন আউট",
  "toolbar.export": "রপ্তানি",
  "toolbar.import": "আমদানি",
  "toolbar.map": "মানচিত্র",
  "toolbar.timeline": "টাইমলাইন",
  "app.subtitle": "একটি জীবন্ত ইতিহাস",
  "addPerson.title": "একজন ব্যক্তি যোগ করুন",
  "add.title": "একজন ব্যক্তি যোগ করুন",
  "add.subtitle": "টেপেস্ট্রিতে একটি জীবন লিপিবদ্ধ করুন",
  "add.identity": "পরিচয়",
  "add.fullName": "পুরো নাম",
  "add.nameNative": "নাম (আপনার লিপিতে)",
  "add.dates": "তারিখ",
  "add.birthYear": "জন্ম সাল",
  "add.deathYear": "মৃত্যু সাল",
  "add.life": "জীবন",
  "add.birthPlace": "জন্মস্থান",
  "add.profession": "পেশা",
  "add.contact": "যোগাযোগ",
  "add.email": "ইমেইল",
  "add.phone": "ফোন",
  "add.address": "ঠিকানা",
  "add.website": "ওয়েবসাইট",
  "add.biography": "জীবনী",
  "add.submit": "গাছে যোগ করুন",
};

const hi: Dict = {
  "lang.switch": "भाषा",
  "common.nameNative": "नाम बांग्ला / अन्य लिपि में",
  "info.profile": "प्रोफ़ाइल",
  "info.parents": "माता-पिता",
  "info.partners": "साथी",
  "info.children": "बच्चे",
  "info.sources": "स्रोत",
  "common.edit": "संपादित करें",
  "common.save": "सहेजें",
  "common.cancel": "रद्द करें",
  "common.delete": "हटाएं",
  "auth.signIn": "साइन इन",
  "auth.password": "पासवर्ड",
  "auth.email": "ईमेल",
  "auth.signUp": "साइन अप",
  "auth.signOut": "साइन आउट",
  "toolbar.export": "निर्यात",
  "toolbar.import": "आयात",
  "toolbar.map": "नक्शा",
  "toolbar.timeline": "टाइमलाइन",
  "app.subtitle": "एक जीवित वृत्तांत",
  "addPerson.title": "एक व्यक्ति जोड़ें",
  "add.title": "एक व्यक्ति जोड़ें",
  "add.subtitle": "टेपेस्ट्री में एक जीवन दर्ज करें",
  "add.identity": "पहचान",
  "add.fullName": "पूरा नाम",
  "add.nameNative": "नाम (आपकी लिपि में)",
  "add.dates": "तिथियाँ",
  "add.birthYear": "जन्म वर्ष",
  "add.deathYear": "मृत्यु वर्ष",
  "add.life": "जीवन",
  "add.birthPlace": "जन्म स्थान",
  "add.profession": "पेशा",
  "add.contact": "संपर्क",
  "add.email": "ईमेल",
  "add.phone": "फ़ोन",
  "add.address": "पता",
  "add.website": "वेबसाइट",
  "add.biography": "जीवनी",
  "add.submit": "पेड़ में जोड़ें",
};

const ar: Dict = {
  "lang.switch": "اللغة",
  "common.nameNative": "الاسم بالبنغالية / نص آخر",
  "info.profile": "الملف",
  "info.parents": "الوالدان",
  "info.partners": "الشريك",
  "info.children": "الأبناء",
  "info.sources": "المصادر",
  "common.edit": "تعديل",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.delete": "حذف",
  "auth.signIn": "تسجيل الدخول",
  "auth.password": "كلمة المرور",
  "auth.email": "البريد الإلكتروني",
  "auth.signUp": "اشتراك",
  "auth.signOut": "تسجيل الخروج",
  "toolbar.export": "تصدير",
  "toolbar.import": "استيراد",
  "toolbar.map": "الخريطة",
  "toolbar.timeline": "الخط الزمني",
  "app.subtitle": "سجلّ حيّ",
  "addPerson.title": "إضافة شخص",
  "add.title": "إضافة شخص",
  "add.subtitle": "سجّل حياة في التطريز",
  "add.identity": "الهوية",
  "add.fullName": "الاسم الكامل",
  "add.nameNative": "الاسم (بخطّك)",
  "add.dates": "التواريخ",
  "add.birthYear": "سنة الميلاد",
  "add.deathYear": "سنة الوفاة",
  "add.life": "الحياة",
  "add.birthPlace": "مكان الميلاد",
  "add.profession": "المهنة",
  "add.contact": "التواصل",
  "add.email": "البريد الإلكتروني",
  "add.phone": "الهاتف",
  "add.address": "العنوان",
  "add.website": "الموقع",
  "add.biography": "السيرة",
  "add.submit": "إضافة إلى الشجرة",
};

const DICTS: Record<Lang, Dict> = { en, bn, hi, ar };

interface LangContextValue {
  lang: Lang;
  t: (key: string) => string;
  setLang: (l: Lang) => void;
  rtl: boolean;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  t: (k) => en[k] ?? k,
  setLang: () => {},
  rtl: false,
});

export function useLang() {
  return useContext(LangContext);
}

const STORAGE_KEY = "family-tapestry-lang";

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && ["en", "bn", "hi", "ar"].includes(saved)) setLangState(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const rtl = lang === AR;
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, mounted]);

  const t = (key: string) => DICTS[lang][key] ?? DICTS.en[key] ?? key;

  const setLang = (l: Lang) => setLangState(l);

  return (
    <LangContext.Provider value={{ lang, t, setLang, rtl: isRtl(lang) }}>
      {children}
    </LangContext.Provider>
  );
}
