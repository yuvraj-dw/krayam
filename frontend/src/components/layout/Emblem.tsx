import React from 'react';

interface EmblemProps {
  className?: string;
  alt?: string;
}

export const Emblem: React.FC<EmblemProps> = ({ 
  className = "w-8 h-10",
  alt = "State Emblem of India" 
}) => {
  return (
    <img 
      src="/emblem.png" 
      alt={alt} 
      className={`object-contain select-none ${className}`} 
      loading="eager"
    />
  );
};

