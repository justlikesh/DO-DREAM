import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import './Join.css';

import heroSigninImg from '../assets/join/signin.png';
import heroSignupImg from '../assets/join/signup.png';

type Mode = 'sign-in' | 'sign-up';
type JoinProps = { onLoginSuccess: () => void };

export default function Join({ onLoginSuccess }: JoinProps) {
  const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

  const [mode, setMode] = useState<Mode>('sign-in');

  // ▼ 신규: 회원가입 2단계 제어용 상태
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupTeacherId, setSignupTeacherId] = useState('');
  const [, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMode('sign-in'), 200);
    return () => clearTimeout(t);
  }, []);

  const toggle = useCallback(() => {
    setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
    // 폼 전환 시 가입 2단계 상태 초기화
    setIsVerifying(false);
    setIsVerified(false);
    setSignupName('');
    setSignupTeacherId('');
  }, []);

  const showErrorToast = (message: string) => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: message,
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const showSuccessToast = (message: string) => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: message,
      showConfirmButton: false,
      timer: 1800,
    });
  };

  // ▼ 로그인
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;

    const form = e.target as HTMLFormElement;
    const email = (
      form.elements.namedItem('email') as HTMLInputElement
    ).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement)
      .value;

    if (!email) return showErrorToast('이메일을 입력해주세요');
    if (!password) return showErrorToast('비밀번호를 입력해주세요');

    setIsLoggingIn(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/teacher/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 🔴 RT가 쿠키로 오므로 필수
        body: JSON.stringify({ email, password }),
      });

      // AT가 응답 바디로 온다면 필요 시 저장 (예: localStorage)
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {}

      if (!res.ok) {
        const msg = payload?.message || '이메일 또는 비밀번호를 확인해주세요';
        throw new Error(msg);
      }

      await Swal.close();
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '로그인 되었습니다',
        timer: 1200,
        showConfirmButton: false,
      });

      onLoginSuccess(); // App.tsx에서 isLoggedIn=true → /classrooms
    } catch (err: any) {
      await Swal.close();
      showErrorToast(err?.message || '로그인 중 오류가 발생했습니다');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ▼ 1단계: 이름+교원번호 인증
  const handleVerify = async () => {
    if (!signupName.trim()) return showErrorToast('사용자 이름을 입력해주세요');
    if (!signupTeacherId.trim())
      return showErrorToast('교원번호를 입력해주세요');

    setIsVerifying(true);

    // 로딩 모달 열기 (await 하지 마세요)
    const started = Date.now();
    void Swal.fire({
      title: '사용자 확인 중…',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const ac = new AbortController();
      const kill = setTimeout(() => ac.abort(), 15000);

      const res = await fetch(`${API_BASE}/api/auth/teacher/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signupName, teacherNo: signupTeacherId }),
        signal: ac.signal,
      });
      clearTimeout(kill);

      if (!res.ok) {
        const msg = `${res.status} ${res.statusText || ''}`.trim();
        throw new Error(`사용자 인증 실패`);
      }

      // ▶ 로딩 최소 노출 보장 (깜빡임 방지)
      const elapsed = Date.now() - started;
      if (elapsed < 700) await new Promise((r) => setTimeout(r, 700 - elapsed));

      // 1) 로딩 모달 먼저 닫기
      await Swal.close();

      // 2) 토스트는 그 다음에 띄우기 (이제 안 사라짐)
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '사용자 확인 완료!',
        timer: 1800,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      setIsVerified(true);
    } catch (err: any) {
      console.error('[verify:error]', err);

      // 로딩 최소 노출 보장
      const elapsed = Date.now() - started;
      if (elapsed < 700) await new Promise((r) => setTimeout(r, 700 - elapsed));

      // 실패도 동일하게: 로딩 닫고 → 토스트
      await Swal.close();
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title:
          err?.name === 'AbortError'
            ? '요청이 지연되었습니다. 다시 시도해 주세요'
            : err?.message || '인증 중 오류가 발생했습니다',
        timer: 2200,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      setIsVerified(false);
    } finally {
      // ❌ 여기서 Swal.close() 하지 마세요 (토스트까지 닫힘)
      setIsVerifying(false);
    }
  };

  // ▼ 2단계: 회원가입 제출
  // ▼ 2단계: 회원가입 제출
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVerified) {
      return showErrorToast('먼저 사용자 인증을 완료해 주세요');
    }

    const form = e.target as HTMLFormElement;
    const email = (
      form.elements.namedItem('email') as HTMLInputElement
    ).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement)
      .value;
    const confirmPassword = (
      form.elements.namedItem('confirmPassword') as HTMLInputElement
    ).value;

    if (!email) return showErrorToast('이메일을 입력해주세요');
    if (!password) return showErrorToast('비밀번호를 입력해주세요');
    if (!confirmPassword) return showErrorToast('비밀번호 확인을 입력해주세요');
    if (password !== confirmPassword)
      return showErrorToast('비밀번호가 일치하지 않습니다');
    if (password.length < 6)
      return showErrorToast('비밀번호는 최소 6자 이상이어야 합니다');

    setIsRegistering(true);
    void Swal.fire({
      title: '회원가입 처리 중…',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch(`${API_BASE}/api/auth/teacher/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName, // 1단계 값
          teacherNo: signupTeacherId, // 1단계 값 (키 이름 teacherNo!)
          email,
          password,
        }),
      });

      // 서버에서 메시지 내려줄 수도 있으니 안전하게 파싱 시도
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {}

      if (!res.ok) {
        // 중복 이메일 등 케이스 표시
        const msg =
          payload?.message ||
          (res.status === 409
            ? '이미 가입된 계정입니다'
            : '회원가입에 실패했습니다');
        throw new Error(msg);
      }

      await Swal.close();
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '회원가입이 완료되었습니다!',
        timer: 1800,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      // 가입 완료 → 로그인 화면으로
      setMode('sign-in');
      // 필요하면 입력 초기화
      setIsVerified(false);
      setSignupName('');
      setSignupTeacherId('');
      form.reset();
    } catch (err: any) {
      await Swal.close();
      showErrorToast(err?.message || '회원가입 중 오류가 발생했습니다');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div
      id="container"
      className={`container ${mode}`}
      style={
        {
          ['--hero-img-signin' as any]: `url(${heroSigninImg})`,
          ['--hero-img-signup' as any]: `url(${heroSignupImg})`,
        } as React.CSSProperties
      }
    >
      <div className="row">
        {/* SIGN UP */}
        <div className="col align-items-center flex-col sign-up">
          <div className="form-wrapper align-items-center">
            <form className="form sign-up" onSubmit={handleSignup}>
              {/* 1단계: 이름 + 교원번호 + 인증 버튼 */}
              <div className="input-group">
                <i className="bx bxs-user" />
                <input
                  type="text"
                  name="username"
                  placeholder="사용자 이름"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  disabled={isVerified}
                />
              </div>
              <div className="input-group">
                <i className="bx bxs-id-card" />
                <input
                  type="text"
                  name="teacherId"
                  placeholder="교원번호"
                  value={signupTeacherId}
                  onChange={(e) => setSignupTeacherId(e.target.value)}
                  disabled={isVerified}
                />
              </div>

              {!isVerified && (
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="btn-verify"
                >
                  {isVerifying ? '확인 중…' : '사용자 인증하기'}
                </button>
              )}

              {/* 2단계: 인증 성공 시 나머지 입력 노출 */}
              <div
                className={`signup-step2 ${isVerified ? 'open' : 'closed'}`}
                aria-hidden={!isVerified}
              >
                <div className="input-group">
                  <i className="bx bx-mail-send" />
                  <input type="email" name="email" placeholder="이메일" />
                </div>
                <div className="input-group">
                  <i className="bx bxs-lock-alt" />
                  <input
                    type="password"
                    name="password"
                    placeholder="비밀번호"
                  />
                </div>
                <div className="input-group">
                  <i className="bx bxs-lock-alt" />
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="비밀번호 확인"
                  />
                </div>
                <button type="submit" className="btn-submit-signup">
                  회원가입
                </button>
              </div>

              <p>
                <span>이미 계정이 있으신가요? </span>
                <b onClick={toggle} className="pointer">
                  로그인 하기
                </b>
              </p>
            </form>
          </div>
        </div>

        {/* SIGN IN */}
        <div className="col align-items-center flex-col sign-in">
          <div className="form-wrapper align-items-center">
            <form className="form sign-in" onSubmit={handleLogin}>
              <div className="input-group">
                <i className="bx bx-mail-send" />
                <input type="text" name="email" placeholder="이메일" />
              </div>
              <div className="input-group">
                <i className="bx bxs-lock-alt" />
                <input type="password" name="password" placeholder="비밀번호" />
              </div>
              <button type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? '로그인 중…' : '로그인'}
              </button>
              <p>
                <span>아직 계정이 없으신가요? </span>
                <b onClick={toggle} className="pointer">
                  회원가입 하기
                </b>
              </p>
            </form>
          </div>
        </div>
      </div>

      <div className="row content-row">
        <div className="col align-items-center flex-col">
          <div className="text sign-in">
            <h2>DO:DREAM</h2>
          </div>
        </div>
        <div className="col align-items-center flex-col">
          <div className="text sign-up">
            <h2>가입하기</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
