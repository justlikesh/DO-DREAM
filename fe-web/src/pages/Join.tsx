// src/pages/Join.tsx
import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import './Join.css';

type Mode = 'sign-in' | 'sign-up';

type JoinProps = {
  onLoginSuccess: () => void;
};

export default function Join({ onLoginSuccess }: JoinProps) {
  const [mode, setMode] = useState<Mode>('sign-up');

  useEffect(() => {
    const t = setTimeout(() => setMode('sign-in'), 200);
    return () => clearTimeout(t);
  }, []);

  const toggle = useCallback(() => {
    setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    // 유효성 검사
    if (!email) {
      showErrorToast('이메일을 입력해주세요');
      return;
    }
    if (!password) {
      showErrorToast('비밀번호를 입력해주세요');
      return;
    }

    // 로그인 로직 (임시로 바로 성공 처리)
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: '로그인 성공!',
      showConfirmButton: false,
      timer: 1500,
    });
    
    setTimeout(() => {
      onLoginSuccess();
    }, 1500);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;

    // 유효성 검사
    if (!username) {
      showErrorToast('사용자 이름을 입력해주세요');
      return;
    }
    if (!email) {
      showErrorToast('이메일을 입력해주세요');
      return;
    }
    if (!password) {
      showErrorToast('비밀번호를 입력해주세요');
      return;
    }
    if (!confirmPassword) {
      showErrorToast('비밀번호 확인을 입력해주세요');
      return;
    }
    if (password !== confirmPassword) {
      showErrorToast('비밀번호가 일치하지 않습니다');
      return;
    }
    if (password.length < 6) {
      showErrorToast('비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    // 회원가입 로직
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: '회원가입이 완료되었습니다!',
      showConfirmButton: false,
      timer: 2000,
    });
    
    setTimeout(() => {
      setMode('sign-in');
    }, 2000);
  };

  return (
    <div id="container" className={`container ${mode}`}>
      <div className="row">
        {/* SIGN UP */}
        <div className="col align-items-center flex-col sign-up">
          <div className="form-wrapper align-items-center">
            <form className="form sign-up" onSubmit={handleSignup}>
              <div className="input-group">
                <i className="bx bxs-user" />
                <input 
                  type="text" 
                  name="username"
                  placeholder="사용자 이름"
                />
              </div>
              <div className="input-group">
                <i className="bx bx-mail-send" />
                <input 
                  type="email" 
                  name="email"
                  placeholder="이메일"
                />
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
              <button type="submit">회원가입</button>
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
                <input 
                  type="text" 
                  name="email"
                  placeholder="이메일"
                />
              </div>
              <div className="input-group">
                <i className="bx bxs-lock-alt" />
                <input 
                  type="password" 
                  name="password"
                  placeholder="비밀번호"
                />
              </div>
              <button type="submit">로그인</button>
              <p>
                <b>비밀번호를 잊어버렸나요?</b>
              </p>
              <p>
                <span>아직 계정이 없으신가요? </span>
                <b onClick={toggle} className="pointer">
                  회원가입 하기
                </b>
              </p>
            </form>
          </div>
          <div className="form-wrapper"></div>
        </div>
      </div>

      <div className="row content-row">
        <div className="col align-items-center flex-col">
          <div className="text sign-in">
            <h2>Do!dream</h2>
          </div>
          <div className="img sign-in"></div>
        </div>

        {/* SIGN UP CONTENT */}
        <div className="col align-items-center flex-col">
          <div className="img sign-up"></div>
          <div className="text sign-up">
            <h2>가입하기</h2>
          </div>
        </div>
      </div>
    </div>
  );
}