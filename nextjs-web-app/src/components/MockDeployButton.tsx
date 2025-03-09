import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { FaRocket, FaTimes } from 'react-icons/fa';

interface MockDeployButtonProps {
  code: string;
  theme: "light" | "dark";
}

const FullscreenPreview = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: white;
  overflow: auto;
  display: flex;
  flex-direction: column;
`;

const PreviewIframe = styled.iframe`
  flex: 1;
  border: none;
  width: 100%;
  height: 100%;
`;

const CloseButton = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10000;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.1);
  }
`;

export default function MockDeployButton({ code, theme }: MockDeployButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleDeploy = () => {
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  // Safely render code in an iframe when the component is shown
  useEffect(() => {
    if (isFullscreen && iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDocument) {
        iframeDocument.open();
        iframeDocument.write(code);
        iframeDocument.close();
      }
    }
  }, [isFullscreen, code]);

  return (
    <>
      <motion.button
        onClick={handleDeploy}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm ${
          theme === "dark"
            ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
        }`}
      >
        <FaRocket className="w-3 h-3 mr-1" />
        Deploy
      </motion.button>

      {isFullscreen && (
        <>
          <FullscreenPreview>
            <PreviewIframe 
              ref={iframeRef} 
              sandbox="allow-same-origin" 
              title="Code Preview" 
            />
          </FullscreenPreview>
          <CloseButton onClick={closeFullscreen}>
            <FaTimes />
          </CloseButton>
        </>
      )}
    </>
  );
}
