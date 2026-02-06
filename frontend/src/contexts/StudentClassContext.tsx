import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

const STORAGE_KEY_CLASS = 'tbc_selected_class_id';

interface ClassItem {
  _id: string;
  name: string;
}

interface StudentClassContextValue {
  classes: ClassItem[];
  selectedClassId: string | null;
  selectedClassName: string | null;
  setSelectedClassId: (id: string | null) => void;
  isLoading: boolean;
  needsClassSelection: boolean; // 2개 이상 반이고 선택 안 됐을 때
  showClassSelect: boolean; // 반 변경 모드
  setShowClassSelect: (v: boolean) => void;
  refreshClasses: () => Promise<void>;
}

const StudentClassContext = createContext<StudentClassContextValue | null>(null);

function loadSelectedClassId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_CLASS) ?? sessionStorage.getItem(STORAGE_KEY_CLASS);
  } catch {
    return null;
  }
}

function saveSelectedClassId(id: string | null): void {
  if (id) {
    localStorage.setItem(STORAGE_KEY_CLASS, id);
    sessionStorage.setItem(STORAGE_KEY_CLASS, id);
  } else {
    localStorage.removeItem(STORAGE_KEY_CLASS);
    sessionStorage.removeItem(STORAGE_KEY_CLASS);
  }
}

export function StudentClassProvider({ children }: { children: ReactNode }) {
  const { role, isAuthenticated } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassIdState] = useState<string | null>(loadSelectedClassId);
  const [showClassSelect, setShowClassSelect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const apiPrefix = role === 'parent' ? 'parent' : 'student';

  const refreshClasses = useCallback(async () => {
    if (role !== 'student' && role !== 'parent') {
      setClasses([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: { classes: ClassItem[] } }>(
        `/${apiPrefix}/classes`
      );
      if (res.data.success && Array.isArray(res.data.data?.classes)) {
        const list = res.data.data.classes;
        setClasses(list);
        const saved = loadSelectedClassId();
        if (list.length === 1) {
          setSelectedClassIdState(list[0]._id);
          saveSelectedClassId(list[0]._id);
        } else if (list.length >= 2 && saved && list.some((c) => c._id === saved)) {
          setSelectedClassIdState(saved);
        } else if (list.length >= 2) {
          setSelectedClassIdState(null);
          saveSelectedClassId(null);
        } else {
          setSelectedClassIdState(null);
          saveSelectedClassId(null);
        }
      } else {
        setClasses([]);
        setSelectedClassIdState(null);
        saveSelectedClassId(null);
      }
    } catch {
      setClasses([]);
      setSelectedClassIdState(null);
      saveSelectedClassId(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiPrefix, role]);

  useEffect(() => {
    if (isAuthenticated && (role === 'student' || role === 'parent')) {
      refreshClasses();
    } else {
      setClasses([]);
      setSelectedClassIdState(null);
      saveSelectedClassId(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, role, refreshClasses]);

  const setSelectedClassId = useCallback((id: string | null) => {
    setSelectedClassIdState(id);
    saveSelectedClassId(id);
  }, []);

  const selectedClassName = useMemo(() => {
    if (!selectedClassId) return null;
    const c = classes.find((x) => x._id === selectedClassId);
    return c?.name ?? null;
  }, [classes, selectedClassId]);

  const needsClassSelection = (classes.length >= 2 && !selectedClassId) || showClassSelect;

  const value = useMemo<StudentClassContextValue>(
    () => ({
      classes,
      selectedClassId,
      selectedClassName,
      setSelectedClassId,
      isLoading,
      needsClassSelection,
      showClassSelect,
      setShowClassSelect,
      refreshClasses,
    }),
    [classes, selectedClassId, selectedClassName, setSelectedClassId, isLoading, needsClassSelection, showClassSelect, refreshClasses]
  );

  return (
    <StudentClassContext.Provider value={value}>
      {children}
    </StudentClassContext.Provider>
  );
}

export function useStudentClass(): StudentClassContextValue {
  const ctx = useContext(StudentClassContext);
  if (!ctx) throw new Error('useStudentClass must be used within StudentClassProvider');
  return ctx;
}
