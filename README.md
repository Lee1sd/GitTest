# Commit Message Convention

팀 프로젝트에서 커밋 히스토리를 일관되게 관리하기 위한 규칙입니다.  
**날짜 + 작업 유형 + 변경 내용**이 한 줄에서 바로 보이도록 작성합니다.

---

## 1) Commit Message Format

### Title (필수, 1줄)
```

[YYYY-MM-DD] <type>(<scope>): <summary> (#<issue>)

```

- **[YYYY-MM-DD]**: 커밋 날짜 (예: `[2026-01-23]`)
- **type**: 작업 유형 (아래 Type 목록 참고)
- **scope**: 변경 범위/모듈/도메인 (예: `auth`, `member`, `ui`, `api`)
- **summary**: 변경/작업 내용을 한 문장으로 요약
- **(#issue)**: 관련 이슈/티켓 번호 (없으면 생략)

### Body (자유, 여러 줄)
```

* 변경 사항: ...
* 이유/배경: ...
* 테스트: (예: 로컬 실행 / 단위 테스트 / 없음)
* 영향 범위: ...

```

### Footer (선택)
- `Refs: #12` (추가 참조)
- `BREAKING CHANGE: ...` (호환성 깨짐 발생 시 필수)

---

## 2) Type 목록

| type | 의미 | 예시 |
|---|---|---|
| feat | 새로운 기능 추가 | 기능/API/화면 추가 |
| fix | 버그 수정 | 오류/예외/잘못된 동작 수정 |
| refactor | 리팩터링 (기능 변화 없음) | 구조 개선, 중복 제거 |
| style | 코드 스타일/포맷 (로직 변화 없음) | prettier, 들여쓰기 |
| docs | 문서 수정 | README, 주석, 문서 |
| test | 테스트 코드 추가/수정 | unit/integration test |
| chore | 빌드/설정/의존성 등 잡무 | 설정파일, 패키지 업데이트 |
| perf | 성능 개선 | 쿼리/렌더링 최적화 |
| ci | CI 설정 변경 | GitHub Actions |
| build | 빌드 시스템 변경 | build script, bundler |

> 최소 운영 권장: `feat / fix / refactor / docs / style / test / chore`

---

## 3) Scope 규칙 (권장)

- 기능/도메인/폴더 기준으로 통일합니다.
- 예시: `auth`, `member`, `order`, `trip`, `admin`, `ui`, `api`, `infra`, `db`, `core`
- scope가 애매하면 `core` 또는 `global` 사용

---

## 4) Examples

### Feature
```

[2026-01-23] feat(trip): 여행 일정 생성 폼 추가 (#12)

```

### Bug Fix
```

[2026-01-23] fix(auth): 로그인 리다이렉트 오류 수정 (#15)

```

### Refactor
```

[2026-01-23] refactor(member): useAuth 훅 분리 (#20)

```

### Docs
```

[2026-01-23] docs(readme): 실행 방법 및 환경변수 추가 (#22)

```

### Chore (Config/Deps)
```

[2026-01-23] chore(lint): eslint 규칙 업데이트 (#18)

```

### Style (Formatting)
```

[2026-01-23] style(ui): CategoryController 코드 정렬 (#25)

```

### Test
```

[2026-01-23] test(auth): 로그인 유효성 검사 테스트 추가 (#28)

```

---

## 5) Quick Template (Copy & Paste)

```

[YYYY-MM-DD] type(scope): summary (#issue)

* 변경 사항:
* 이유/배경:
* 테스트:
* 영향 범위:

```
```
