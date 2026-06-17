# 🏠 우리집 물건 지도 (Home Inventory)

집안 물건이 **어디에 있는지** 기억하기 어려우신가요?
이 앱은 집을 **방 → 가구 → 칸(서랍·선반) → 물건** 순서로 정리하고, **평면도에서 한눈에** 찾게 해줍니다.
가족(또는 함께 쓰는 사람들)이 **같은 주소로 접속하면 실시간으로 데이터가 공유**됩니다. 한 명이 물건을 옮기면 다른 사람 화면에도 바로 반영돼요.

> 💡 **이런 분께 추천:** 물건을 자주 잃어버리는 가족, 이사·정리 후 위치 기록, 창고·공방 재고 관리 등

---

## 📸 스크린샷

> 아래 이미지는 `screenshots/` 폴더에 사진을 넣으면 표시됩니다. (넣는 방법은 맨 아래 [스크린샷 추가하기](#-스크린샷-추가하기-저장소-주인용) 참고)

| 물건 지도(평면도) | 방 내부 | 달력 |
|:--:|:--:|:--:|
| ![물건 지도](screenshots/1-map.png) | ![방 내부](screenshots/2-room.png) | ![달력](screenshots/3-calendar.png) |

---

## ✨ 주요 기능

- 🗺️ **평면도**: 우리 집 구조를 드래그로 그리고, 방 안 가구도 배치
- 📦 **무한 정리**: 가구 → 칸 → 더 작은 칸 … 원하는 만큼 깊게 나눠 정리
- 🔎 **검색**: 물건 이름만 치면 어디 있는지 바로 알려줌
- 📅 **달력**: 산 날짜·보관한 날짜로 물건 보기
- 🔄 **실시간 공유**: 같이 쓰는 사람 모두에게 즉시 반영
- 💾 **백업**: JSON 파일로 내보내기 / 가져오기

---

## 🚀 따라하기 (내 것으로 만들어 쓰기)

이 앱은 **각자 자신의 무료 Firebase**에 연결해서 씁니다. 그래야 내 데이터가 남과 섞이지 않아요.

> ⏱️ **소요 시간:** 약 15~30분 · 💰 **비용:** 무료 · 🧑‍💻 **난이도:** 처음이면 천천히 따라오면 됩니다

전체 순서는 이렇습니다 👇

```
0. 프로그램 설치  →  1. 코드 받기  →  2. Firebase 만들기  →  3. 설정 입력  →  4. 실행  →  5. 배포(공유)
```

### 0단계 — 필요한 프로그램 설치

| 프로그램 | 용도 | 설치 |
|---|---|---|
| **Node.js** (LTS) | 앱을 실행·빌드하는 도구 | https://nodejs.org 에서 **LTS** 버튼 다운로드 후 설치 |
| **Git** (선택) | 코드 내려받기 | https://git-scm.com (없으면 GitHub에서 ZIP 다운로드도 가능) |
| **Google 계정** | Firebase 사용 | 이미 있으시면 그대로 사용 |

설치 후, 터미널(Windows는 **PowerShell**)을 **새로 열고** 아래로 확인하세요. 버전 숫자가 나오면 성공입니다.

```bash
node -v      # 예: v20.x 또는 v22.x
npm -v       # 예: 10.x
```

### 1단계 — 코드 내려받기

**방법 A (Git 사용):**
```bash
git clone <이 저장소 주소>
cd home-inventory
npm install
```

**방법 B (Git 없이):** GitHub 저장소 페이지에서 초록색 **Code ▾ → Download ZIP** → 압축 풀기 → 그 폴더에서 터미널 열고 `npm install`

> `npm install` 은 앱이 쓰는 부품을 내려받는 과정이에요. 처음 한 번만 하면 됩니다. (1~2분)

### 2단계 — Firebase 프로젝트 만들기 (제일 중요!)

Firebase는 데이터를 저장·공유해 주는 구글의 무료 서비스입니다.

1. [Firebase 콘솔](https://console.firebase.google.com/) 접속 → **프로젝트 만들기**
2. 프로젝트 이름 입력(예: `our-home`) → 계속 → (Google 애널리틱스는 꺼도 됩니다) → **프로젝트 만들기**
3. 프로젝트가 열리면, 가운데 **웹 아이콘 `</>`** 클릭 → 앱 닉네임 입력 → **앱 등록**
4. 화면에 나오는 **`firebaseConfig` 코드 블록**을 잘 둡니다. (3단계에서 사용)
   - 나중에 다시 보려면: **⚙️(설정) → 프로젝트 설정 → 일반 → 내 앱 → SDK 설정 및 구성**
5. 왼쪽 메뉴 **빌드(Build) → Firestore Database → 데이터베이스 만들기**
   - **위치**: 가까운 곳 선택 (한국이면 `asia-northeast3` 서울) — ⚠️ **한 번 정하면 못 바꿔요**
   - **모드**: "프로덕션 모드" 선택 후, 바로 다음 6단계에서 규칙을 넣습니다
6. Firestore 화면 위쪽 **규칙(Rules)** 탭 → 내용을 아래로 **전부 교체** → **게시(Publish)**

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

   > 이 규칙은 "이 앱의 데이터 1칸만 자유롭게 읽고 쓰게" 해줍니다. 가족·지인 등 **믿는 사람끼리 쓰는 용도**라면 충분해요.
   > (불특정 다수에게 공개하려면 로그인 기능이 필요합니다 → [보안](#-보안-꼭-읽어주세요) 참고)

### 3단계 — 내 설정값 넣기 (.env 파일)

1. 폴더 안의 **`.env.example`** 파일을 복사해서 이름을 **`.env`** 로 바꿉니다.
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env
   # Mac / Linux
   cp .env.example .env
   ```
2. `.env` 파일을 열고, 2단계에서 본 `firebaseConfig` 값을 아래처럼 옮겨 적습니다.

   **firebaseConfig → .env 대응표:**

   | firebaseConfig 안의 값 | .env 에 넣을 칸 |
   |---|---|
   | `apiKey` | `VITE_FIREBASE_API_KEY` |
   | `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
   | `projectId` | `VITE_FIREBASE_PROJECT_ID` |
   | `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
   | `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
   | `appId` | `VITE_FIREBASE_APP_ID` |
   | `measurementId` | `VITE_FIREBASE_MEASUREMENT_ID` |

   > `.env` 는 내 비밀 설정이라 GitHub에 올라가지 않습니다(`.gitignore`에 등록됨). 그래서 받는 사람마다 직접 채워야 해요.

### 4단계 — 내 컴퓨터에서 실행해보기

```bash
npm run dev
```

터미널에 **`http://localhost:5173`** 이 보이면, 그 주소를 브라우저에서 열어보세요. 앱이 뜨고 샘플 데이터가 보이면 성공입니다! 🎉
(멈추려면 터미널에서 `Ctrl + C`)

### 5단계 — 인터넷에 올려서 공유하기

내 컴퓨터를 꺼도 가족이 쓸 수 있게, 인터넷에 배포합니다. 둘 중 편한 방법을 고르세요.

#### 방법 A — Firebase Hosting (이 프로젝트와 잘 맞음)

```bash
npm install -g firebase-tools     # Firebase 도구 설치 (한 번만)
firebase login                    # 브라우저로 구글 로그인
firebase use --add                # 내 Firebase 프로젝트 선택
npm run build                     # 배포용 파일 만들기
firebase deploy                   # 올리기!
```

끝나면 **`https://<프로젝트이름>.web.app`** 주소가 나옵니다. 이 주소를 가족에게 공유하세요.

#### 방법 B — Vercel (드래그로 더 쉽게)

1. https://vercel.com 가입(GitHub 계정으로) → **Add New → Project** → 이 저장소 선택
2. 빌드 설정은 자동 인식됩니다(빌드 명령 `npm run build`, 출력 `dist`)
3. **Environment Variables** 에 `.env` 의 `VITE_FIREBASE_*` 값들을 그대로 등록 → **Deploy**

---

## 🆘 자주 나오는 문제 (안 될 때 여기 먼저!)

<details>
<summary><b>화면이 하얗게/에러만 떠요</b></summary>

대부분 Firebase 설정 문제입니다. 브라우저에서 `F12 → Console` 탭의 빨간 글씨를 확인하세요.
- **"Missing Firebase config"** → `.env` 파일이 없거나 값이 비어 있어요. 3단계를 다시 확인.
- **권한/permission 오류** → 2단계 6번 **규칙(Rules)** 을 게시했는지 확인.
- **데이터가 저장 안 됨** → Firestore **데이터베이스를 만들었는지**(2단계 5번) 확인.
</details>

<details>
<summary><b>(Windows) firebase 명령에서 "스크립트를 실행할 수 없습니다" 오류</b></summary>

PowerShell 보안 정책 때문입니다. PowerShell에서 아래 한 줄 실행 후 다시 시도하세요(관리자 권한 불필요):
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
</details>

<details>
<summary><b>node / npm 명령을 못 찾는대요</b></summary>

Node.js 설치 후 **터미널을 새로 열어야** 인식됩니다. 그래도 안 되면 컴퓨터를 재시작하거나 Node.js를 재설치하세요.
</details>

<details>
<summary><b>여러 명이 동시에 고치면요?</b></summary>

거의 동시에 저장하면 **마지막 저장이 적용**됩니다(last-write-wins). 소규모 가족 사용에는 문제되지 않습니다.
</details>

---

## 🔐 보안 (꼭 읽어주세요)

- Firebase의 `apiKey` 같은 값은 **비밀번호가 아닙니다.** (브라우저에 공개되는 식별자) 진짜 보안은 **Firestore 규칙**이 담당해요.
- 기본 규칙은 데이터 1칸(`inventory/shared`)만 열어둡니다. **믿는 사람끼리 비공개로** 쓰는 전제입니다.
- 주소가 아무에게나 퍼질 수 있는 **공개 서비스**로 만들 거라면:
  1. Firebase **Authentication**(예: 구글 로그인) 켜기
  2. 규칙을 `allow read, write: if request.auth != null;` 으로 강화
  3. 로그인 화면 추가 (도움이 필요하면 이슈로 남겨주세요)

---

## 📸 스크린샷 추가하기 (저장소 주인용)

이 저장소에 앱 사용 화면을 보여주려면:

1. 앱을 브라우저에서 열기 (배포 주소 또는 `http://localhost:5173`)
2. `Win + Shift + S` (Windows) / `Cmd + Shift + 4` (Mac) 로 화면 캡처
3. 아래 이름으로 PNG 저장 후 **`screenshots/` 폴더**에 넣기:
   - `1-map.png` (전체 평면도) · `2-room.png` (방 내부) · `3-calendar.png` (달력)
4. 저장소에 함께 업로드하면 위 [스크린샷](#-스크린샷) 표에 자동으로 보입니다.

> 🙈 **공개 저장소에는 실제 물건 이름이 보일 수 있습니다.** 안전하게 샘플 화면으로 찍으려면:
> 1) 앱 하단 **"내보내기"** 로 현재 데이터를 JSON으로 백업 → 2) **"초기화"** 로 샘플 데이터 표시 → 3) 캡처 →
> 4) **"가져오기"** 로 백업 파일을 다시 불러와 원상복구.
> ⚠️ "초기화"는 현재 데이터를 **샘플로 덮어쓰니**, 반드시 먼저 백업하세요. (또는 평면도 위주로만 캡처)

---

## 🛠️ 명령어 모음

| 명령 | 설명 |
|------|------|
| `npm install` | 부품 설치 (최초 1회) |
| `npm run dev` | 개발 서버 실행 (http://localhost:5173) |
| `npm run build` | 배포용 파일 생성 → `dist/` |
| `npm run preview` | 빌드 결과 미리보기 |

**기술 스택:** Vite · React 18 · Tailwind CSS v4 · Firebase Firestore

---

## English Quick Start

A real-time shared **home inventory** web app (Vite + React + Tailwind + Firebase Firestore).
Organize your home as **room → furniture → drawer → item** and find anything on a floor plan. Each person deploys their **own** Firebase project, so data stays private and isolated.

1. **Install** Node.js (LTS) and clone the repo → `npm install`
2. **Create a Firebase project**, add a Web app, create a **Firestore Database**, and set its **Rules** to the contents of [firestore.rules](firestore.rules).
3. **Configure:** `cp .env.example .env` and fill in your Firebase web config (`VITE_FIREBASE_*`).
4. **Run:** `npm run dev` → http://localhost:5173
5. **Deploy:** `npm i -g firebase-tools` → `firebase login` → `firebase use --add` → `npm run build` → `firebase deploy` (or deploy `dist/` on Vercel with the env vars set).

> **Security:** The Firebase web config is not a secret; security is enforced by Firestore rules. The default rules allow open read/write to a single `inventory/shared` document — fine for a private, trusted group. Add Firebase Auth before exposing it publicly.

## License

[MIT](LICENSE)
