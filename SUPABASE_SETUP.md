# Supabase тохиргоо

1. `supabase/migrations/202609280001_usage_limits.sql` файлын SQL-ийг Supabase Dashboard → **SQL Editor** дээр ажиллуул.
2. `.env.local` дотор дараах утгуудыг тохируул:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tmhhaqltuhksmjcmpkvg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=таны_publishable_key
SUPABASE_SECRET_KEY=sb_secret_... утгыг энд
ADMIN_EMAILS=таны_supabase_login_имэйл
DAILY_AI_REQUEST_LIMIT=20
```

`SUPABASE_SECRET_KEY` нь зөвхөн серверт хэрэглэгдэнэ. `NEXT_PUBLIC_` угтвар нэмж болохгүй, мөн код/чат руу бүү хуул.
`ADMIN_EMAILS`-д олон admin нэмэхдээ имэйлүүдийг таслалаар тусгаарлана. Admin эрх нь тусгай нууц үг биш, энэ жагсаалтад байгаа имэйлээр Supabase-д нэвтэрсэн эсэхээр шийдэгдэнэ.

3. Next.js dev серверийг зогсоогоод дахин асаа. Өдрийн лимит нь анализ болон орчуулгын нийт AI хүсэлтэд үйлчилж, Улаанбаатарын цагаар өдөр солигдоход шинэчлэгдэнэ. Хэрэглэгч бүрийн лимитийг `/account` → Admin panel хэсгээс тусад нь өөрчилж болно.

## Google нэвтрэлт

1. Google Cloud Console / Google Auth Platform дээр **Web application OAuth client** үүсгэ. `Authorized JavaScript origins` хэсэгт `http://localhost:3000` болон production сайтын origin-оо нэм.
2. Supabase Dashboard → **Authentication → Sign In / Providers → Google** дээр provider-ийг асаагаад Google OAuth Client ID болон Client Secret-ээ тохируул. Google Cloud-ийн `Authorized redirect URI` талбарт энэ дэлгэц дээр Supabase-аас өгсөн callback URL-ийг хуул.
3. Supabase Dashboard → **Authentication → URL Configuration** дээр Site URL-ийг `http://localhost:3000` болгоод Redirect URLs-д `http://localhost:3000/auth/callback` нэм. Production-д deploy хийсний дараа production домэйны `/auth/callback` URL-ийг бас allowlist-д оруул.
4. Login эсвэл signup хуудасны **Google-ээр нэвтрэх** товчоор шалга.

Google OAuth Client Secret-ийг зөвхөн Supabase Dashboard-д оруул. Энэ аппын `.env.local` эсвэл кодонд хийх шаардлагагүй. Supabase SSR нь authorization code-ийг callback route дээр session cookie болгон солилцдог.
