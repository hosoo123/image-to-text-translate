# Supabase тохиргоо

1. Эхлээд `supabase/migrations/202609280001_usage_limits.sql`, дараа нь `supabase/migrations/202609280002_plans_payments_phone.sql` файлыг тус тус Supabase Dashboard → **SQL Editor** дээр бүхэлд нь хуулж Run хий. Эхний migration-ийг өмнө нь ажиллуулсан бол одоо зөвхөн хоёр дахь SQL-ийг Run хийхэд болно.
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

3. Next.js dev серверийг зогсоогоод дахин асаа. Free хэрэглэгч өдөрт 20 AI хүсэлт, төлбөр баталгаажсан Premium хэрэглэгч өдөрт 100 ба сард 2,000 хүсэлт ашиглана. Өдрийн лимит Улаанбаатарын цагаар шинэчлэгдэнэ.

## Premium багц, WireMN QR төлбөр

Багцын одоогийн үнэ: 1 сар 3,000₮, 3 сар 8,000₮, 6 сар 15,000₮. `NEXT_PUBLIC_PREMIUM_*_MONTH_MNT` утгаар өөрчилж болно. Wire-ийн API MNT үнийг minor unit-ээр авдаг тул сервер үнийг 100-аар үржүүлж илгээнэ.

`.env.local` болон Vercel Environment Variables-д:

```env
WIRE_API_KEY=sk_test_...
WIRE_WEBHOOK_SECRET=whsec_...
WIRE_ALLOWED_OPERATORS=
NEXT_PUBLIC_PREMIUM_1_MONTH_MNT=3000
NEXT_PUBLIC_PREMIUM_3_MONTH_MNT=8000
NEXT_PUBLIC_PREMIUM_6_MONTH_MNT=15000
```

Эхлээд Wire-ийн `sk_test_` key болон sandbox оператор ашиглан test mode турш. Бодит төлбөр авахын өмнө Wire dashboard дээр live key, идэвхтэй operator, settlement account тохируулж `WIRE_ALLOWED_OPERATORS`-д операторын ID-гаа оруул. Webhook endpoint-оо `https://ТАНЫ-ДОМЭЙН/api/payments/webhook` гэж бүртгээд `payment_intent.succeeded` event болон `whsec_...` secret тохируул. Эрх зөвхөн гарын үсэг шалгасан webhook-ийн дараа идэвхжинэ; буцах URL төлбөрийн баталгаа биш.

## Сонголттой утас баталгаажуулалт

Verify.MN Developer Console-оос API key аваад `.env.local` болон Vercel server environment-д:

```env
VERIFY_MN_API_KEY=vrf_...
```

гэж тохируул. **Authentication → Sign In / Providers → Phone provider-ийг асаах шаардлагагүй.** Энэ project Verify.MN-ээр утсыг баталгаажуулаад, сервер талд Supabase-ийн email/password Auth-аар login хийнэ. Phone provider асаавал Supabase-аас SMS явуулахын тулд Twilio зэрэг SMS provider-ийн тохиргоо нэхдэг тул Twilio-ийн SID/token/service SID-ийг энд хийх шаардлагагүй.

`/account` дээр одоо нэвтэрсэн хэрэглэгч дугаараа холбож болно. `/signup` дээр утас + нууц үгээр бүртгүүлэхдээ Verify.MN SMS-ээ баталгаажуулна. `/login` дээр баталгаажсан утас + нууц үгээр нэвтэрнэ. Phone бүртгэлийн нууц үг мартсан үед `/forgot-password` дээрх утас сэргээх хэсгийг ашиглана. Хэрэглэгч өөрөө 144773 руу SMS илгээдэг бөгөөд операторын SMS тарифаар төлбөр гарч болно. Энэ нь хэрэглэгч рүү OTP SMS илгээдэг үйлчилгээ биш. Утасны дугаар дахин хуваарилагдах эрсдэлтэй тул боломжтой бол email/Google нэвтрэх аргаа мөн бүртгэлдээ холбоотой байлга.

## Google нэвтрэлт

1. Google Cloud Console / Google Auth Platform дээр **Web application OAuth client** үүсгэ. `Authorized JavaScript origins` хэсэгт `http://localhost:3000` болон production сайтын origin-оо нэм.
2. Supabase Dashboard → **Authentication → Sign In / Providers → Google** дээр provider-ийг асаагаад Google OAuth Client ID болон Client Secret-ээ тохируул. Google Cloud-ийн `Authorized redirect URI` талбарт энэ дэлгэц дээр Supabase-аас өгсөн callback URL-ийг хуул.
3. Supabase Dashboard → **Authentication → URL Configuration** дээр Site URL-ийг `http://localhost:3000` болгоод Redirect URLs-д `http://localhost:3000/auth/callback` болон `http://localhost:3000/auth/reset-callback` нэм. Production-д deploy хийсний дараа production домэйны эдгээр хоёр callback URL-ийг бас allowlist-д оруул.
4. Login эсвэл signup хуудасны **Google-ээр нэвтрэх** товчоор шалга.

Google OAuth Client Secret-ийг зөвхөн Supabase Dashboard-д оруул. Энэ аппын `.env.local` эсвэл кодонд хийх шаардлагагүй. Supabase SSR нь authorization code-ийг callback route дээр session cookie болгон солилцдог.
