"use client";

import { motion } from "framer-motion";
import styled from "styled-components";

const LoadingBarContainer = styled(motion.div)`
  width: 100%;
  max-width: 500px;
  height: 8px;
  background: rgba(75, 85, 99, 0.3);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

const LoadingProgress = styled(motion.div)`
  height: 100%;
  background: #4b5563;
  border-radius: 4px;
`;

interface LoadingBarProps {
  className?: string;
  children?: React.ReactNode;
}

const LoadingBar = ({ className, children }: LoadingBarProps) => {
  return (
    <LoadingBarContainer className={className}>
      {children || (
        <LoadingProgress
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "linear",
          }}
        />
      )}
    </LoadingBarContainer>
  );
};

export default LoadingBar;
export { LoadingProgress }; 