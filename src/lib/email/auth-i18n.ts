/**
 * Supabase "Send Email" Auth Hook üzerinden gönderilen kimlik doğrulama
 * e-postalarının (şifre sıfırlama, kayıt doğrulama, davet, e-posta değişimi)
 * metinleri. Hook, istek bağlamı olmadan Supabase'den çağrıldığı için
 * next-intl burada çalışmaz — bkz. email/i18n.ts'teki aynı gerekçe.
 *
 * Dil bulunamazsa her zaman Türkçeye düşülür.
 */

import type { LanguageCode } from "@/lib/languages";

export type AuthEmailLocale = LanguageCode;

export type AuthEmailAction = "recovery" | "signup" | "invite" | "email_change";

interface ActionStrings {
  subject: string;
  heading: string;
  greeting: (email: string) => string;
  button: string;
  linkHint: string;
  expiry: string;
}

interface AuthEmailStrings {
  htmlLang: string;
  rtl: boolean;
  brandTagline: string;
  footerSentBy: string;
  actions: Record<AuthEmailAction, ActionStrings>;
}

const tr: AuthEmailStrings = {
  htmlLang: "tr", rtl: false,
  brandTagline: "Salon &amp; randevu yönetimi",
  footerSentBy: "Bu e-posta SiriPlan tarafından gönderildi.",
  actions: {
    recovery: {
      subject: "SiriPlan — Şifre sıfırlama bağlantınız",
      heading: "Şifrenizi sıfırlayın",
      greeting: (email) => `SiriPlan hesabınız (<strong>${email}</strong>) için bir şifre sıfırlama talebi aldık. Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın.`,
      button: "Yeni şifre belirle →",
      linkHint: "Buton çalışmıyorsa bu bağlantıyı tarayıcınıza yapıştırın:",
      expiry: "Bu bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir. Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz — şifreniz değişmez.",
    },
    signup: {
      subject: "SiriPlan — Hesabınızı doğrulayın",
      heading: "E-posta adresinizi doğrulayın",
      greeting: (email) => `SiriPlan hesabınızı (<strong>${email}</strong>) etkinleştirmek için aşağıdaki butona tıklayın.`,
      button: "Hesabımı doğrula →",
      linkHint: "Buton çalışmıyorsa bu bağlantıyı tarayıcınıza yapıştırın:",
      expiry: "Bu bağlantı 24 saat geçerlidir. Bu kaydı siz yapmadıysanız bu e-postayı yok sayabilirsiniz.",
    },
    invite: {
      subject: "SiriPlan — Davetiniz hazır",
      heading: "SiriPlan'a davet edildiniz",
      greeting: (email) => `<strong>${email}</strong> adresi için bir SiriPlan daveti oluşturuldu. Katılmak için aşağıdaki butona tıklayın.`,
      button: "Daveti kabul et →",
      linkHint: "Buton çalışmıyorsa bu bağlantıyı tarayıcınıza yapıştırın:",
      expiry: "Bu bağlantı sınırlı süre geçerlidir. Bu daveti siz talep etmediyseniz e-postayı yok sayabilirsiniz.",
    },
    email_change: {
      subject: "SiriPlan — E-posta değişikliğini onaylayın",
      heading: "Yeni e-posta adresinizi onaylayın",
      greeting: (email) => `SiriPlan hesabınızın e-posta adresini <strong>${email}</strong> olarak değiştirmek için aşağıdaki butona tıklayın.`,
      button: "E-postamı onayla →",
      linkHint: "Buton çalışmıyorsa bu bağlantıyı tarayıcınıza yapıştırın:",
      expiry: "Bu bağlantı 24 saat geçerlidir. Bu değişikliği siz talep etmediyseniz hesabınızın güvenliği için bize ulaşın: info@bysirius.com",
    },
  },
};

const en: AuthEmailStrings = {
  htmlLang: "en", rtl: false,
  brandTagline: "Salon &amp; booking management",
  footerSentBy: "This email was sent by SiriPlan.",
  actions: {
    recovery: {
      subject: "SiriPlan — Your password reset link",
      heading: "Reset your password",
      greeting: (email) => `We received a password reset request for your SiriPlan account (<strong>${email}</strong>). Click the button below to set a new password.`,
      button: "Set new password →",
      linkHint: "If the button doesn't work, paste this link into your browser:",
      expiry: "This link is valid for 1 hour and can only be used once. If you didn't request this, you can safely ignore this email — your password won't change.",
    },
    signup: {
      subject: "SiriPlan — Verify your account",
      heading: "Verify your email address",
      greeting: (email) => `Click the button below to activate your SiriPlan account (<strong>${email}</strong>).`,
      button: "Verify my account →",
      linkHint: "If the button doesn't work, paste this link into your browser:",
      expiry: "This link is valid for 24 hours. If you didn't create this account, you can safely ignore this email.",
    },
    invite: {
      subject: "SiriPlan — Your invitation is ready",
      heading: "You've been invited to SiriPlan",
      greeting: (email) => `An invitation to SiriPlan was created for <strong>${email}</strong>. Click the button below to join.`,
      button: "Accept invitation →",
      linkHint: "If the button doesn't work, paste this link into your browser:",
      expiry: "This link is valid for a limited time. If you weren't expecting this invitation, you can safely ignore this email.",
    },
    email_change: {
      subject: "SiriPlan — Confirm your email change",
      heading: "Confirm your new email address",
      greeting: (email) => `Click the button below to change your SiriPlan account email to <strong>${email}</strong>.`,
      button: "Confirm my email →",
      linkHint: "If the button doesn't work, paste this link into your browser:",
      expiry: "This link is valid for 24 hours. If you didn't request this change, please contact us for your account's security: info@bysirius.com",
    },
  },
};

const ru: AuthEmailStrings = {
  htmlLang: "ru", rtl: false,
  brandTagline: "Управление салоном и записями",
  footerSentBy: "Это письмо отправлено SiriPlan.",
  actions: {
    recovery: {
      subject: "SiriPlan — Ссылка для сброса пароля",
      heading: "Сбросьте пароль",
      greeting: (email) => `Мы получили запрос на сброс пароля для вашего аккаунта SiriPlan (<strong>${email}</strong>). Нажмите кнопку ниже, чтобы задать новый пароль.`,
      button: "Задать новый пароль →",
      linkHint: "Если кнопка не работает, вставьте эту ссылку в браузер:",
      expiry: "Эта ссылка действительна 1 час и может быть использована только один раз. Если вы не отправляли этот запрос, просто проигнорируйте это письмо — пароль не изменится.",
    },
    signup: {
      subject: "SiriPlan — Подтвердите аккаунт",
      heading: "Подтвердите адрес электронной почты",
      greeting: (email) => `Нажмите кнопку ниже, чтобы активировать ваш аккаунт SiriPlan (<strong>${email}</strong>).`,
      button: "Подтвердить аккаунт →",
      linkHint: "Если кнопка не работает, вставьте эту ссылку в браузер:",
      expiry: "Эта ссылка действительна 24 часа. Если вы не создавали этот аккаунт, просто проигнорируйте это письмо.",
    },
    invite: {
      subject: "SiriPlan — Ваше приглашение готово",
      heading: "Вас пригласили в SiriPlan",
      greeting: (email) => `Для <strong>${email}</strong> создано приглашение в SiriPlan. Нажмите кнопку ниже, чтобы присоединиться.`,
      button: "Принять приглашение →",
      linkHint: "Если кнопка не работает, вставьте эту ссылку в браузер:",
      expiry: "Эта ссылка действительна ограниченное время. Если вы не ожидали это приглашение, проигнорируйте это письмо.",
    },
    email_change: {
      subject: "SiriPlan — Подтвердите смену e-mail",
      heading: "Подтвердите новый адрес электронной почты",
      greeting: (email) => `Нажмите кнопку ниже, чтобы изменить e-mail вашего аккаунта SiriPlan на <strong>${email}</strong>.`,
      button: "Подтвердить e-mail →",
      linkHint: "Если кнопка не работает, вставьте эту ссылку в браузер:",
      expiry: "Эта ссылка действительна 24 часа. Если вы не запрашивали это изменение, свяжитесь с нами для безопасности аккаунта: info@bysirius.com",
    },
  },
};

const ar: AuthEmailStrings = {
  htmlLang: "ar", rtl: true,
  brandTagline: "إدارة الصالون والمواعيد",
  footerSentBy: "أُرسل هذا البريد الإلكتروني من SiriPlan.",
  actions: {
    recovery: {
      subject: "SiriPlan — رابط إعادة تعيين كلمة المرور",
      heading: "إعادة تعيين كلمة المرور",
      greeting: (email) => `تلقينا طلبًا لإعادة تعيين كلمة المرور لحسابك في SiriPlan (<strong>${email}</strong>). انقر على الزر أدناه لتعيين كلمة مرور جديدة.`,
      button: "تعيين كلمة مرور جديدة ←",
      linkHint: "إذا لم يعمل الزر، الصق هذا الرابط في متصفحك:",
      expiry: "هذا الرابط صالح لمدة ساعة واحدة ويمكن استخدامه مرة واحدة فقط. إذا لم تطلب هذا، يمكنك تجاهل هذا البريد الإلكتروني بأمان — لن تتغير كلمة مرورك.",
    },
    signup: {
      subject: "SiriPlan — تحقق من حسابك",
      heading: "تحقق من عنوان بريدك الإلكتروني",
      greeting: (email) => `انقر على الزر أدناه لتفعيل حسابك في SiriPlan (<strong>${email}</strong>).`,
      button: "تحقق من حسابي ←",
      linkHint: "إذا لم يعمل الزر، الصق هذا الرابط في متصفحك:",
      expiry: "هذا الرابط صالح لمدة 24 ساعة. إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذا البريد الإلكتروني بأمان.",
    },
    invite: {
      subject: "SiriPlan — دعوتك جاهزة",
      heading: "تمت دعوتك إلى SiriPlan",
      greeting: (email) => `تم إنشاء دعوة إلى SiriPlan لـ <strong>${email}</strong>. انقر على الزر أدناه للانضمام.`,
      button: "قبول الدعوة ←",
      linkHint: "إذا لم يعمل الزر، الصق هذا الرابط في متصفحك:",
      expiry: "هذا الرابط صالح لفترة محدودة. إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد الإلكتروني بأمان.",
    },
    email_change: {
      subject: "SiriPlan — أكّد تغيير بريدك الإلكتروني",
      heading: "أكّد عنوان بريدك الإلكتروني الجديد",
      greeting: (email) => `انقر على الزر أدناه لتغيير البريد الإلكتروني لحسابك في SiriPlan إلى <strong>${email}</strong>.`,
      button: "تأكيد بريدي الإلكتروني ←",
      linkHint: "إذا لم يعمل الزر، الصق هذا الرابط في متصفحك:",
      expiry: "هذا الرابط صالح لمدة 24 ساعة. إذا لم تطلب هذا التغيير، يرجى التواصل معنا لحماية حسابك: info@bysirius.com",
    },
  },
};

const TABLE: Record<AuthEmailLocale, AuthEmailStrings> = { tr, en, ru, ar };

/** Verilen dilin metinleri; tanınmayan/boş dilde Türkçe döner. */
export function authEmailStrings(locale?: string | null): AuthEmailStrings {
  return (locale && TABLE[locale as AuthEmailLocale]) || tr;
}
