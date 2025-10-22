import React, { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { X, Send, FileText, Check, Search } from 'lucide-react';
import './MaterialSendModal.css';

type Student = {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  avatarUrl?: string;
  progressRate: number;
};

type Material = {
  id: string;
  title: string;
  uploadDate: string;
  content: string;
};

type MaterialSendModalProps = {
  students: Student[];
  selectedMaterial: Material;
  onClose: () => void;
  onSend: (studentIds: string[]) => void;
};

export default function MaterialSendModal({
  students,
  selectedMaterial,
  onClose,
  onSend,
}: MaterialSendModalProps) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q)
    );
  }, [students, query]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleStudentByKey = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleStudent(id);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      const filteredIds = new Set(filtered.map((s) => s.id));
      setSelectedStudents((prev) => prev.filter((id) => !filteredIds.has(id)));
      setSelectAll(false);
    } else {
      const idsToAdd = filtered
        .map((s) => s.id)
        .filter((id) => !selectedStudents.includes(id));
      setSelectedStudents((prev) => [...prev, ...idsToAdd]);
      setSelectAll(true);
    }
  };

  const handleSend = () => {
    if (selectedStudents.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: '학생을 선택하세요',
        text: '자료를 받을 학생을 선택해주세요.',
        confirmButtonColor: '#192b55',
      });
      return;
    }
    onSend(selectedStudents);
  };

  return (
    <div className="msm-overlay">
      <div className="msm-modal">
        {/* Header */}
        <div className="msm-header">
          <h2>자료 전송하기</h2>
          <button className="msm-close-btn" onClick={onClose} aria-label="닫기">
            <X size={24} />
          </button>
        </div>

        {/* Content (scrollable) */}
        <div className="msm-content">
          {/* Selected material */}
          <div className="msm-material-info">
            <div className="msm-material-icon">
              <FileText size={22} />
            </div>
            <div>
              <p className="msm-label">선택된 자료</p>
              <p className="msm-material-title">{selectedMaterial.title}</p>
            </div>
          </div>

          {/* Search (icon inside input) */}
          <div className="msm-search">
            <Search size={16} className="msm-search-icon" />
            <input
              className="msm-search-input"
              type="text"
              placeholder="이름 또는 학년/반으로 검색"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectAll(false);
              }}
            />
          </div>

          {/* Select All (toggle button) */}
          <button
            type="button"
            className={`msm-select-toggle ${selectAll ? 'is-on' : ''}`}
            onClick={toggleSelectAll}
            aria-pressed={selectAll}
          >
            전체 선택 <span className="msm-count">({filtered.length}명)</span>
            {selectAll && <Check className="msm-select-check" size={16} />}
          </button>

          {/* Students */}
          <div className="msm-students-list">
            {filtered.map((student) => {
              const checked = selectedStudents.includes(student.id);
              return (
                <div
                  key={student.id}
                  className={`msm-student-item ${checked ? 'is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleStudent(student.id)}
                  onKeyDown={(e) => toggleStudentByKey(e, student.id)}
                  aria-pressed={checked}
                >
                  {/* ✅ 선택된 경우에만 체크 배지 렌더링 */}
                  {checked && (
                    <span className="msm-selected-badge">
                      <Check size={16} />
                    </span>
                  )}

                  {student.avatarUrl ? (
                    <img
                      className="msm-avatar-img"
                      src={student.avatarUrl}
                      alt={`${student.name} 아바타`}
                    />
                  ) : (
                    <span className="msm-avatar-emoji">{student.avatar}</span>
                  )}

                  <div className="msm-student-text">
                    <p className="msm-name">{student.name}</p>
                    <p className="msm-grade">{student.grade}</p>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="msm-empty">검색 결과가 없습니다</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="msm-footer">
          <button className="msm-cancel-btn" onClick={onClose}>
            취소
          </button>
          <button className="msm-send-btn" onClick={handleSend}>
            <Send size={18} />
            <span>{selectedStudents.length}명에게 전송</span>
          </button>
        </div>
      </div>
    </div>
  );
}
