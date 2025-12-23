import React from 'react';
import { toast } from 'sonner';

interface SocialShareButtonsProps {
  url: string;
  message: string;
  recipientName: string;
}

const SocialShareButtons = ({ url, message, recipientName }: SocialShareButtonsProps) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedMessage = encodeURIComponent(message);
  
  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
  };

  const handleInstagramShare = () => {
    navigator.clipboard.writeText(`${message} ${url}`);
    toast.success('Link copied! Paste it in your Instagram story or DM');
  };

  const handleSnapchatShare = () => {
    navigator.clipboard.writeText(`${message} ${url}`);
    toast.success('Link copied! Paste it in Snapchat to share');
  };

  return (
    <div className="flex items-center gap-2">
      {/* WhatsApp */}
      <button
        onClick={() => handleShare('whatsapp')}
        className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center hover:scale-110 transition-transform"
        title="Share on WhatsApp"
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </button>

      {/* Twitter/X */}
      <button
        onClick={() => handleShare('twitter')}
        className="w-10 h-10 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform"
        title="Share on X (Twitter)"
      >
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </button>

      {/* Facebook */}
      <button
        onClick={() => handleShare('facebook')}
        className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center hover:scale-110 transition-transform"
        title="Share on Facebook"
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </button>

      {/* Instagram */}
      <button
        onClick={handleInstagramShare}
        className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FCAF45] via-[#E1306C] to-[#833AB4] flex items-center justify-center hover:scale-110 transition-transform"
        title="Share on Instagram"
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      </button>

      {/* Snapchat */}
      <button
        onClick={handleSnapchatShare}
        className="w-10 h-10 rounded-full bg-[#FFFC00] flex items-center justify-center hover:scale-110 transition-transform"
        title="Share on Snapchat"
      >
        <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-.732-.271-1.258-.615-1.258-1.035-.016-.345.224-.645.598-.825.106-.060.27-.104.463-.104.165 0 .344.029.494.104.39.18.749.27 1.049.27.181 0 .326-.029.405-.074-.012-.18-.024-.344-.032-.509l-.003-.07c-.089-1.628-.219-3.654.311-4.833C7.847 1.069 11.216.793 12.206.793z"/>
        </svg>
      </button>
    </div>
  );
};

export default SocialShareButtons;