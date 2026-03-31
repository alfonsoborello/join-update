import React from 'react';

interface GooglePlayBookEmbedProps {
  url: string;
}

export const GooglePlayBookEmbed: React.FC<GooglePlayBookEmbedProps> = ({ url }) => {
  const getBookId = (url: string) => {
    // Matches play.google.com/store/books/details?id=BOOK_ID
    // or books.google.com/books?id=BOOK_ID
    const regExp = /[?&]id=([^&#]*)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const bookId = getBookId(url);

  if (!bookId) return null;

  return (
    <div className="relative w-full h-[500px] mt-4 overflow-hidden border border-[#CCCCCC]/10 bg-[#111111]">
      <iframe
        className="w-full h-full"
        src={`https://books.google.com/books?id=${bookId}&printsec=frontcover&output=embed`}
        title="Google Play Book Preview"
        frameBorder="0"
        allowFullScreen
        loading="lazy"
      ></iframe>
    </div>
  );
};
