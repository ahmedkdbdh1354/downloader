# MediaFlow

واجهة عربية حديثة لفحص روابط الوسائط العامة من عدة منصات وتنزيل المحتوى المسموح به. يتعرف التطبيق على المنصة من الرابط تلقائيًا، ثم يعرض العنوان والصورة المصغرة والجودات المتاحة. يُحفظ سجل كل زائر داخل متصفحه فقط ولا يُرسل إلى الخادم.

> استخدم التطبيق فقط مع الوسائط التي تملكها أو لديك إذن صريح لتنزيلها، واحترم شروط الخدمة وحقوق النشر الخاصة بكل منصة.

## التقنية والبنية

```text
frontend/  React + Vite + Tailwind CSS
backend/   FastAPI + yt-dlp
  app/providers/  سجل منصات مستقل وقابل للتوسعة
  app/services.py استخراج البيانات والتنزيل
  data/           ملفات التنزيل المؤقتة (تُتجاهل في Git)
```

تدعم طبقة التعرف المبدئية TikTok وInstagram وFacebook وX/Twitter وVimeo وSoundCloud، فيما يتعامل محرك `yt-dlp` مع المواقع المدعومة الأخرى. روابط YouTube معطلة صراحةً. إضافة منصة معروفة إلى الواجهة تتم بتسجيل `PlatformProvider` جديد في `backend/app/providers/registry.py` وإضافة نمطها في `frontend/src/lib.js`.

## التشغيل محليًا

### 1. الخادم الخلفي

يتطلب Python 3.10 أو أحدث.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

انسخ `.env.example` إلى `.env` إن احتجت تغيير أصل الواجهة المسموح به أو مكان حفظ الملفات.

### 2. الواجهة

في نافذة طرفية أخرى:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

افتح `http://localhost:5173`. لضبط عنوان مختلف للخدمة الخلفية، أنشئ `frontend/.env.local` وضع فيه:

```text
VITE_API_URL=http://localhost:8000/api/v1
```

## نقاط API

| الطريقة | المسار | المهمة |
| --- | --- | --- |
| `POST` | `/api/v1/media/inspect` | فحص الرابط وإرجاع البيانات الوصفية والصيغ المتاحة. |
| `POST` | `/api/v1/media/download` | تنزيل الصيغة المحددة وإرجاع ملف الفيديو مباشرة. |
| `GET` | `/api/v1/downloads/{id}` | مسار توافق لتنزيل ملف أنشأته الجلسة نفسها. |
| `GET` | `/api/v1/platforms` | قائمة المنصات المسجلة في الخادم. |

## ملاحظات للنشر

- أضف مصادقة وحدود طلبات وحصص تخزين قبل إتاحة الخدمة للعامة.
- سجل التنزيل خاص بكل متصفح ويستخدم `localStorage`؛ لا توجد قاعدة سجل مشتركة في الخادم.
- لا تعرض مجلد التنزيلات مباشرة على الويب؛ استخدم نقطة API التي تتحقق من معرّف العملية.

## النشر على Firebase + Cloud Run

Firebase Hosting يستضيف واجهة React، بينما يُشغّل Cloud Run خدمة FastAPI. أُعدت الملفات `firebase.json` و`backend/Dockerfile` لهذا المسار؛ إذ تعيد Hosting كتابة `/api/**` إلى خدمة Cloud Run باسم `mediaflow-api`.

يتطلب هذا المسار مشروع Firebase/Google Cloud مفعلًا، وخطة Blaze مرتبطة بحساب فوترة، وGoogle Cloud SDK. بعد تسجيل الدخول واختيار مشروعك:

```powershell
# مرة واحدة: انسخ .firebaserc.example إلى .firebaserc واستبدل YOUR_FIREBASE_PROJECT_ID
Copy-Item .firebaserc.example .firebaserc

# بناء الواجهة
cd frontend
npm.cmd run build
cd ..

# نشر FastAPI على Cloud Run (يتطلب gcloud وإتاحة Cloud Run API)
gcloud run deploy mediaflow-api --source backend --region us-central1 --allow-unauthenticated --max-instances 2

# نشر الواجهة وقاعدة إعادة التوجيه
npx.cmd firebase-tools deploy --only hosting
```

قبل فتح الموقع للجميع، أضف حد طلبات وتخزينًا دائمًا للملفات؛ ملفات Cloud Run المؤقتة لا تصلح للتخزين الدائم.

## النشر على Vercel

يستخدم `vercel.json` وضع **Vercel Services** لبناء تطبيقين مستقلين داخل النشر نفسه:

- خدمة `frontend` تبني React/Vite من `frontend/`.
- خدمة `backend` تشغّل FastAPI من `backend/app/main.py`.
- تُوجَّه `/api/**` إلى FastAPI، بينما تُوجَّه بقية المسارات إلى الواجهة.

اضبط Framework Preset للمشروع على **Services** قبل النشر. لا يحتاج النشر إلى `VITE_API_URL` لأن الواجهة والخادم يعملان على النطاق نفسه. يستخدم الخادم `/tmp` للملفات المؤقتة على Vercel، بينما يبقى سجل التنزيل خاصًا بمتصفح المستخدم عبر `localStorage`.
