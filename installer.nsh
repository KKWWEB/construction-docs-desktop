; NSIS 커스텀 설치 스크립트
; 한국어 설치 프로그램 최적화

!macro customHeader
  SetRegView 64
!macroend

!macro customInstall
  ; 시작 메뉴 항목 생성
  CreateDirectory "$SMPROGRAMS\건설 통합결재"
  CreateShortcut "$SMPROGRAMS\건설 통합결재\건설 통합결재.lnk" "$INSTDIR\건설 통합결재.exe"
  CreateShortcut "$SMPROGRAMS\건설 통합결재\제거.lnk" "$INSTDIR\Uninstall 건설 통합결재.exe"
!macroend

!macro customUnInstall
  ; 시작 메뉴 항목 제거
  RMDir /r "$SMPROGRAMS\건설 통합결재"
!macroend
