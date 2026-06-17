# 🏠 우리집 물건 지도 (Home Inventory)

집안 물건을 **방 → 가구 → 칸(서랍/선반…) → 물건** 구조로 정리하고, 평면도에서 한눈에 찾는 웹 앱입니다.
**Firebase Firestore 실시간 동기화**를 사용하므로, 같은 Firebase에 연결된 사람들이 **같은 URL로 접속하면 데이터를 실시간으로 공유**합니다.

> 한 명이 물건을 추가/이동/삭제하거나 방·가구 배치를 바꾸면, 접속 중인 다른 사람 화면에도 즉시 반영됩니다.

**기술 스택:** Vite · React 18 · Tailwind CSS v4 · Firebase Firestore

---

## ✨ 주요 기능

- 🗺️ **평면도**: 방 배치를 드래그로 편집, 방 안의 가구 배치도 편집
- 📦 **무한 중첩 수납**: 가구 → 칸 → 하위 칸 … 원하는 만큼 깊게
- 🔎 **검색 / 자동완성**: 물건 이름으로 위치 바로 찾기
- 📅 **달력 보기**: 구매/보관 날짜 기준으로 물건 보기
- ↕️ **드래그 정렬 / 폴더로 이동**
- 💾 **JSON 내보내기 / 가져오기** (백업·복원)
- 🔄 **실시간 동기화** (Firestore)

---

## 🚀 직접 배포하기 (각자 자신의 데이터로 사용)

이 앱은 **각자 자신의 Firebase 프로젝트**를 만들어 배포해서 씁니다. 그래야 본인 데이터가 다른 사람과 섞이지 않고 완전히 분리됩니다. (무료 요금제로 충분합니다.)

### 0. 사전 준비

- **Node.js** (LTS 권장) — https://nodejs.org
- **Google 계정** (Firebase 사용)

### 1. 코드 받기

```bash
git clone <이 저장소 주소>
cd home-inventory
npm install
```

### 2. Firebase 프로젝트 만들기

1. [Firebase 콘솔](https://console.firebase.google.com/) → **프로젝트 추가**
2. 프로젝트 안에서 **웹 앱(</>) 추가** → 앱 닉네임 입력 → 등록
3. 화면에 나오는 **firebaseConfig 값**을 복사해 둡니다. (나중에 `프로젝트 설정 ⚙️ → 일반 → 내 앱`에서 다시 볼 수 있음)
4. **빌드 → Firestore Database → 데이터베이스 만들기**
   - 위치는 가까운 지역 선택 (예: 한국이면 `asia-northeast3` 서울) — **한 번 정하면 못 바꿉니다.**
5. **Firestore → 규칙(Rules)** 탭을 아래 [firestore.rules](firestore.rules) 내용으로 교체:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /inventory/shared {
         allow read, write: if true;
       }
     }
   }
   ```

   > ⚠️ 이 규칙은 **그 문서를 아는 누구나 읽기/쓰기 가능**합니다. 가족·지인 등 신뢰하는 그룹의 비공개 사용에는 충분하지만,
   > 불특정 다수에게 공개한다면 Firebase Authentication(로그인)을 붙여 규칙을 강화하세요. (아래 [보안](#-보안) 참고)

### 3. 설정값 넣기 (.env)

`.env.example` 을 `.env` 로 복사하고, 2단계에서 복사한 값으로 채웁니다.

```bash
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

> `.env` 는 `.gitignore` 에 등록돼 있어 git에 올라가지 않습니다.

### 4. 로컬에서 실행

```bash
npm run dev      # http://localhost:5173
```

### 5. 인터넷에 배포 (공유 URL 만들기)

#### 방법 A — Firebase Hosting (이 프로젝트와 같은 Firebase에 배포, 추천)

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # 본인 프로젝트 선택 (default 별칭 지정)
npm run build
firebase deploy               # 호스팅 + Firestore 규칙 배포
```

배포가 끝나면 `https://<프로젝트ID>.web.app` 주소가 나옵니다. 이 URL을 함께 쓸 사람들에게 공유하면 됩니다.

#### 방법 B — Vercel / Netlify

- 저장소를 연결하고 **빌드 명령 `npm run build`**, **출력 디렉터리 `dist`** 로 설정
- 대시보드의 **Environment Variables** 에 위 `VITE_FIREBASE_*` 값들을 그대로 등록

---

## 🔐 보안

- Firebase의 `apiKey` 등 웹 설정값은 **비밀이 아닙니다.** (브라우저로 전송되는 공개 식별자) 진짜 보안은 **Firestore 규칙**으로 합니다.
- 이 앱의 기본 규칙은 `inventory/shared` 문서 **하나에만** 접근을 허용합니다. 신뢰하는 소규모 그룹의 비공개 사용 전제입니다.
- 불특정 다수 공개 시 권장:
  1. **Authentication** 활성화(예: Google 로그인)
  2. 규칙을 `allow read, write: if request.auth != null;` 등으로 강화
  3. 로그인 UI 추가 (원하면 이슈로 요청)

---

## 🗂️ 데이터 구조

- 전체 인벤토리(방·가구·물건 트리)는 **Firestore 문서 1개** `inventory/shared` 의 `data` 필드에 **JSON 문자열**로 저장됩니다.
- 앱은 `onSnapshot` 으로 이 문서를 실시간 구독합니다. 누가 저장하면 접속자 모두에게 즉시 전파됩니다.
- 처음 실행 시 문서가 없으면 **샘플 데이터로 자동 초기화**됩니다.
- 화면의 **내보내기/가져오기** 로 JSON 백업·복원 가능.

> 같은 그룹의 여러 명이 **정확히 동시에** 저장하면 마지막 저장이 이깁니다(last-write-wins). 소규모 사용에는 문제되지 않습니다.

---

## 📁 프로젝트 구조

```
.
├─ index.html            # 진입 HTML (Pretendard 폰트 로드)
├─ vite.config.js        # Vite + React + Tailwind v4 플러그인
├─ firebase.json         # Firebase Hosting / Firestore 배포 설정
├─ firestore.rules       # Firestore 보안 규칙
├─ .env.example          # Firebase 설정 템플릿 (복사해서 .env 로 사용)
├─ package.json
└─ src/
   ├─ main.jsx           # React 진입점
   ├─ App.jsx            # 메인 앱
   ├─ firebase.js        # Firebase 초기화 (.env 값 사용)
   └─ index.css          # Tailwind import
```

---

## 🛠️ 명령어

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (http://localhost:5173) |
| `npm run build` | 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 로컬 미리보기 |

---

## English Quick Start

This is a real-time shared **home inventory** web app (Vite + React + Tailwind + Firebase Firestore).
Each user/group deploys their **own** Firebase project so data stays private and isolated.

1. **Prerequisites:** Node.js (LTS), a Google account.
2. **Get the code:** `git clone <repo>` · `cd home-inventory` · `npm install`
3. **Create a Firebase project:** add a Web app, then create a **Firestore Database**, and set its **Rules** to the contents of [firestore.rules](firestore.rules).
4. **Configure:** `cp .env.example .env` and fill in your Firebase web config (`VITE_FIREBASE_*`).
5. **Run locally:** `npm run dev` → http://localhost:5173
6. **Deploy:**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add
   npm run build
   firebase deploy
   ```
   Or deploy `dist/` to Vercel/Netlify with the `VITE_FIREBASE_*` env vars set in the dashboard.

> **Security:** The Firebase web config is not secret; security is enforced by Firestore rules. The default rules allow open read/write to a single `inventory/shared` document — fine for a private, trusted group, but add Firebase Auth before exposing it publicly.

## License

[MIT](LICENSE)
