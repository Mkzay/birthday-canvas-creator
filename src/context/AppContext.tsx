import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BirthdayPage, User, Message, Theme } from '@/types/birthday';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  pages: BirthdayPage[];
  setPages: React.Dispatch<React.SetStateAction<BirthdayPage[]>>;
  currentPage: BirthdayPage | null;
  setCurrentPage: (page: BirthdayPage | null) => void;
  createPage: (page: Omit<BirthdayPage, 'id' | 'createdAt' | 'messages' | 'status'>) => BirthdayPage;
  updatePage: (id: string, updates: Partial<BirthdayPage>) => void;
  deletePage: (id: string) => void;
  addMessage: (pageId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  getPageById: (id: string) => BirthdayPage | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Demo data
const demoUser: User = {
  id: '1',
  name: 'Alex',
  email: 'alex@example.com',
};

const demoPages: BirthdayPage[] = [
  {
    id: 'demo-1',
    recipientName: 'Sarah',
    birthdayDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    theme: 'elegant',
    creatorMessage: 'Happy Birthday to the best friend ever!',
    settings: {
      allowPhotos: true,
      requireNames: true,
      closeDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
    messages: [
      { id: 'm1', senderName: 'John', message: 'Happy Birthday Sarah! Hope you have an amazing day!', timestamp: new Date() },
      { id: 'm2', senderName: 'Emma', message: 'Wishing you all the best on your special day! 🎉', timestamp: new Date() },
      { id: 'm3', senderName: 'Mike', message: 'Many happy returns! You deserve all the happiness!', timestamp: new Date() },
    ],
    status: 'active',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'demo-2',
    recipientName: 'James',
    birthdayDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    theme: 'playful',
    settings: {
      allowPhotos: true,
      requireNames: false,
      closeDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    messages: [
      { id: 'm4', senderName: 'Lisa', message: 'Happy Birthday James! Party time! 🎈🎂', timestamp: new Date() },
      { id: 'm5', senderName: 'Tom', message: 'Have an awesome birthday, buddy!', timestamp: new Date() },
    ],
    status: 'delivered',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(demoUser);
  const [pages, setPages] = useState<BirthdayPage[]>(demoPages);
  const [currentPage, setCurrentPage] = useState<BirthdayPage | null>(null);

  const createPage = (pageData: Omit<BirthdayPage, 'id' | 'createdAt' | 'messages' | 'status'>) => {
    const newPage: BirthdayPage = {
      ...pageData,
      id: `page-${Date.now()}`,
      messages: [],
      status: 'active',
      createdAt: new Date(),
    };
    setPages(prev => [...prev, newPage]);
    return newPage;
  };

  const updatePage = (id: string, updates: Partial<BirthdayPage>) => {
    setPages(prev => prev.map(page => 
      page.id === id ? { ...page, ...updates } : page
    ));
  };

  const deletePage = (id: string) => {
    setPages(prev => prev.filter(page => page.id !== id));
  };

  const addMessage = (pageId: string, messageData: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...messageData,
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
    };
    setPages(prev => prev.map(page => 
      page.id === pageId 
        ? { ...page, messages: [...page.messages, newMessage] }
        : page
    ));
  };

  const getPageById = (id: string) => pages.find(page => page.id === id);

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      pages,
      setPages,
      currentPage,
      setCurrentPage,
      createPage,
      updatePage,
      deletePage,
      addMessage,
      getPageById,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
