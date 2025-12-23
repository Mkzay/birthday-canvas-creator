import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import CreatePage from './CreatePage';

const EditPage = () => {
  const { pageId } = useParams();
  const { getPageById } = useApp();
  
  const page = pageId ? getPageById(pageId) : undefined;
  
  if (!page) {
    return <Navigate to="/dashboard" replace />;
  }

  // For now, redirect to create page - in production, would pre-fill the form
  return <CreatePage />;
};

export default EditPage;
