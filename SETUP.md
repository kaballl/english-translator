# Hướng dẫn setup LingoLeaf (Mức 2)

App dùng **Vercel** (frontend + API) và **Supabase** (đăng nhập + database).

---

## Bước 1: Tạo project Supabase

1. Vào [supabase.com](https://supabase.com) → **New Project**
2. Chọn organization, đặt tên, mật khẩu database → **Create**

---

## Bước 2: Chạy SQL tạo bảng

1. Supabase Dashboard → **SQL Editor** → **New query**
2. Copy toàn bộ nội dung file `supabase/schema.sql`
3. Bấm **Run**

---

## Bước 3: Bật đăng nhập Email

1. **Authentication** → **Providers** → **Email** → bật **Enable Email provider**
2. (Khuyên dùng khi test) **Authentication** → tắt **Confirm email** để đăng ký xong dùng luôn

Nếu muốn đăng nhập Google: bật **Google** provider và cấu hình OAuth Client ID.

---

## Bước 4: Lấy API keys

**Project Settings** → **API**:

| Key | Dùng ở đâu |
|-----|------------|
| **Project URL** | Vercel Environment Variables |
| **anon public** | Vercel Environment Variables |
| **service_role** | **Chỉ Vercel** — không đưa vào frontend! |

---

## Bước 5: Cấu hình Vercel

Vercel Dashboard → project → **Settings** → **Environment Variables**

Thêm 3 biến (Production + Preview + Development):

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Vercel sẽ tự chạy `npm run build` để tạo `js/config.js` từ các biến trên.

---

## Bước 6: Cấu hình Supabase Auth URLs

**Authentication** → **URL Configuration**:

| Field | Giá trị |
|-------|---------|
| **Site URL** | `https://your-app.vercel.app` |
| **Redirect URLs** | `https://your-app.vercel.app/**` |
| | `http://localhost:3000/**` |

---

## Bước 7: Push code

```powershell
git add .
git commit -m "Add auth, roles, and Supabase integration"
git push origin main
```

Vercel tự deploy khi push.

---

## Bước 8: Test local (tùy chọn)

```powershell
npm install
copy .env.example .env
# Điền SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY vào .env

npx vercel dev
```

Mở `http://localhost:3000`

Hoặc chỉ test frontend (không có API chấm điểm):

```powershell
copy js\config.example.js js\config.js
# Điền URL + anon key vào config.js
npx serve .
```

---

## Cách dùng app

### Giáo viên
1. Đăng ký → chọn **Giáo viên**
2. Tạo bài tập → copy link gửi học viên
3. Xem **Bài nộp** để theo dõi điểm

### Học viên
1. Đăng ký → chọn **Học viên**
2. Mở link từ giáo viên → dịch → **Nộp bài**
3. Xem lại trong **Bài đã nộp**

---

## Xử lý lỗi thường gặp

| Lỗi | Cách sửa |
|-----|----------|
| Banner "Setup required" | Tạo `js/config.js` hoặc set env vars trên Vercel |
| Đăng ký không vào được | Tắt "Confirm email" hoặc xác nhận email |
| Nộp bài lỗi 500 | Kiểm tra `SUPABASE_SERVICE_ROLE_KEY` trên Vercel |
| Redirect lỗi | Thêm domain Vercel vào Supabase Redirect URLs |
| API không chạy | Dùng `npx vercel dev`, không mở file HTML trực tiếp |
