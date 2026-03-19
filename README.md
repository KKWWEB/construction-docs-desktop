# 건설 통합결재 Desktop

## 개요
중소 건설사를 위한 통합 업무 플랫폼의 데스크톱 버전입니다.  
기존 웹 서비스(www.joosan777.com)를 Electron으로 감싼 네이티브 앱입니다.

## 기능
- 🏗 웹앱과 동일한 모든 기능 (전자결재, 출납관리, 공사관리 등)
- 🔔 Windows 알림 센터 통합
- 🖥 시스템 트레이 상주
- ↔ 자동 업데이트
- 📴 오프라인 시 안내 화면
- 🚀 스플래시 로딩 화면

## 요구사항
- Windows 10 이상 / macOS 10.15 이상
- 인터넷 연결 필수

## 개발 환경 설정

```bash
npm install
npm start          # 개발 모드 실행
npm run start -- --dev  # 업데이트 확인 비활성화
```

## 빌드

### 로컬 빌드 (Windows에서 실행)
```bash
npm run build:win    # Windows EXE
npm run build:mac    # macOS DMG (Mac에서만)
npm run build:all    # 모든 플랫폼
```

### GitHub Actions 자동 빌드
1. GitHub 저장소에 태그 push:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. Actions 탭에서 빌드 진행 확인
3. Releases 탭에서 완성된 설치 파일 다운로드

## 배포 체계

```
개발자 (코드 수정)
    ↓
git tag v1.0.x && git push
    ↓
GitHub Actions (자동 빌드)
    ├── Windows Runner → .exe 생성
    └── macOS Runner → .dmg 생성
    ↓
GitHub Releases (다운로드 링크)
    ↓
랜딩 사이트 다운로드 버튼 연결
    ↓
사용자 다운로드 & 설치
    ↓
앱 자동 업데이트 (electron-updater)
```

## 아이콘 제작 가이드

`assets/` 폴더에 다음 파일이 필요합니다:
- `icon.ico` - Windows 아이콘 (256x256 이상)
- `icon.icns` - macOS 아이콘
- `icon.png` - Linux/트레이 아이콘 (512x512)

무료 변환 도구: https://www.icoconverter.com/

## 환경 변수 (GitHub Secrets)

| 시크릿 이름 | 설명 |
|------------|------|
| `GH_TOKEN` | GitHub Personal Access Token (releases 쓰기 권한) |
| `WIN_CSC_LINK` | Windows 코드서명 인증서 (선택, p12 base64) |
| `WIN_CSC_KEY_PASSWORD` | 코드서명 비밀번호 (선택) |

## 주의사항
- 코드서명 없이 배포 시 Windows SmartScreen 경고 표시됨
- 사용자가 "추가 정보" → "실행" 클릭으로 진행 가능
- 상용 배포를 위해서는 코드서명 인증서 구매 권장 (~$200/년)
