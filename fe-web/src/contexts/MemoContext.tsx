// src/contexts/MemoContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type MemoContextType = {
  memo: string;
  setMemo: (memo: string) => void;
};

const MemoContext = createContext<MemoContextType | undefined>(undefined);

const MEMO_STORAGE_KEY = 'dodream_global_memo';

export function MemoProvider({ children }: { children: ReactNode }) {
  // ✅ 초기값을 localStorage에서 직접 읽기
  const [memo, setMemoState] = useState<string>(() => {
    const saved = localStorage.getItem(MEMO_STORAGE_KEY);
    return saved ?? '';
  });

  // ✅ 메모 변경 시 자동 저장
  useEffect(() => {
    localStorage.setItem(MEMO_STORAGE_KEY, memo);
  }, [memo]);

  const setMemo = (newMemo: string) => {
    setMemoState(newMemo);
  };

  return (
    <MemoContext.Provider value={{ memo, setMemo }}>
      {children}
    </MemoContext.Provider>
  );
}

export function useGlobalMemo() {
  const context = useContext(MemoContext);
  if (context === undefined) {
    throw new Error('useGlobalMemo must be used within a MemoProvider');
  }
  return context;
}