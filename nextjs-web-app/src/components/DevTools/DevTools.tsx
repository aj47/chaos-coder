"use client";

import React from "react";
import styled from "styled-components";
import PromptInput from "./PromptInput";
import PerformanceMetrics from "./PerformanceMetrics";

interface DevToolsProps {
  isPromptOpen: boolean;
  isMetricsOpen: boolean;
  onSubmit: (prompt: string, isUpdate?: boolean, chaosMode?: boolean) => void;
  isUpdateMode?: boolean;
  currentCode?: string;
  generationTimes?: { [key: number]: number };
}

const DevToolsContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
`;

const DevTools: React.FC<DevToolsProps> = ({
  isPromptOpen,
  isMetricsOpen,
  onSubmit,
  isUpdateMode = false,
  currentCode = "",
  generationTimes = {},
}) => {
  return (
    <DevToolsContainer>
      {isPromptOpen && (
        <PromptInput
          isOpen={isPromptOpen}
          onSubmit={onSubmit}
          isUpdateMode={isUpdateMode}
          currentCode={currentCode}
        />
      )}
      
      {isMetricsOpen && (
        <PerformanceMetrics
          isOpen={isMetricsOpen}
          generationTimes={generationTimes}
          onClose={() => {}}
        />
      )}
    </DevToolsContainer>
  );
};

export default DevTools; 