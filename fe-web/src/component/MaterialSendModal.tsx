import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { X, Send, FileText } from 'lucide-react';
import './MaterialSendModal.css';

type Student = {
  id: string;
  name: string;
  grade: string;
  avatar: string;
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

  // 개별 학생 선택/해제
  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
      setSelectAll(false);
    } else {
      setSelectedStudents(students.map((s) => s.id));
      setSelectAll(true);
    }
  };

  // 전송하기 버튼 클릭
  const handleSend = () => {
    if (selectedStudents.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: '학생을 선택하세요',
        text: '자료를 받을 학생을 선택해주세요.',
        confirmButtonColor: '#28427b',
      });
      return;
    }

    onSend(selectedStudents);
  };

  return (
    <div className="msm-overlay">
      <div className="msm-modal">
        {/* Modal Header */}
        <div className="msm-header">
          <h2>자료 전송하기</h2>
          <button className="msm-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="msm-content">
          {/* Selected Material Info */}
          <div className="msm-material-info">
            <FileText size={20} />
            <div>
              <p className="msm-label">선택된 자료</p>
              <p className="msm-material-title">{selectedMaterial.title}</p>
            </div>
          </div>

          {/* Students Selection */}
          <div className="msm-students-section">
            {/* Select All */}
            <div className="msm-select-all">
              <input
                type="checkbox"
                id="select-all"
                checked={selectAll}
                onChange={toggleSelectAll}
              />
              <label htmlFor="select-all">
                전체 선택 ({students.length}명)
              </label>
            </div>

            {/* Students List */}
            <div className="msm-students-list">
              {students.map((student) => (
                <div key={student.id} className="msm-student-item">
                  <input
                    type="checkbox"
                    id={`student-${student.id}`}
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <label htmlFor={`student-${student.id}`}>
                    <span className="msm-avatar">{student.avatar}</span>
                    <div className="msm-student-text">
                      <p className="msm-name">{student.name}</p>
                      <p className="msm-grade">{student.grade}</p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
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