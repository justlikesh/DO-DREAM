import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import './ChatHistory.css';

type ChatMessage = {
  role: 'user' | 'ai';
  content: string;
  created_at: string;
};

type ChatSession = {
  session_id: string;
  material_title: string;
  messages: ChatMessage[];
};

const RAG_BASE = 'https://www.dodream.io.kr/ai';

const formatYmdFromIso = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [datePart] = iso.split('T');
  return datePart || iso;
};

export default function ChatHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const materialTitle = location.state?.materialTitle || '';
  const studentId = location.state?.studentId || '';
  const studentName = location.state?.studentName || '';

  useEffect(() => {
    if (!sessionId || !studentId) {
      navigate(-1);
      return;
    }

    const fetchChatHistory = async () => {
      try {
        setIsLoading(true);

        const accessToken = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          accept: '*/*',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        };

        const chatRes = await fetch(
          `${RAG_BASE}/rag/chat/sessions/${sessionId}/messages?student_id=${studentId}`,
          { method: 'GET', headers, credentials: 'include' },
        );

        if (!chatRes.ok) {
          throw new Error(`대화 기록을 불러올 수 없습니다. (status: ${chatRes.status})`);
        }

        const raw = await chatRes.json();
        console.log('💬 대화 기록 raw:', raw);

        const chatSession: ChatSession = {
          session_id: raw.session_id || sessionId,
          material_title: raw.material_title || materialTitle,
          messages: Array.isArray(raw.messages) ? raw.messages : [],
        };

        setSession(chatSession);
      } catch (err: any) {
        console.error('대화 기록 조회 실패', err);
        await Swal.fire({
          icon: 'error',
          title: '대화 기록을 불러올 수 없습니다',
          text: err?.message ?? '잠시 후 다시 시도해 주세요.',
          confirmButtonColor: '#192b55',
        });
        navigate(-1);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchChatHistory();
  }, [sessionId, studentId]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="chat-history-page">
      {/* Header */}
      <header className="ch-header">
        <div className="ch-header-wrapper">
          <button className="ch-back-button" onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="ch-header-info">
            <h1>{session?.material_title || materialTitle}</h1>
            <p>{studentName} 학생의 대화 기록</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ch-main">
        {isLoading ? (
          <div className="ch-loading">
            <p>대화 기록을 불러오는 중입니다...</p>
          </div>
        ) : !session || session.messages.length === 0 ? (
          <div className="ch-empty">
            <MessageCircle size={48} />
            <p>대화 기록이 없습니다</p>
          </div>
        ) : (
          <div className="ch-messages">
            {session.messages.map((msg, idx) => (
              <div
                key={idx}
                className={`ch-message ${msg.role === 'user' ? 'ch-user' : 'ch-ai'}`}
              >
                <div className="ch-bubble">
                  <p>{msg.content}</p>
                  <span className="ch-time">
                    {formatYmdFromIso(msg.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}