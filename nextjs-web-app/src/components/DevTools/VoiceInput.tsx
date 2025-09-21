"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaMicrophone } from "react-icons/fa";
import styled from "styled-components";

const VoiceButton = styled(motion.button)`
  position: fixed;
  left: 20px;
  bottom: 60px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a202c;
  border: 2px solid rgba(75, 85, 99, 0.2);
  cursor: pointer;
  z-index: 50;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(75, 85, 99, 0.2);
    transform: scale(1.05);
  }

  &[data-listening="true"] {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.4);
    .icon {
      color: rgb(34, 197, 94) !important;
    }
  }
`;

interface VoiceInputProps {
  onInput: (text: string) => void;
  theme: string;
}

export default function VoiceInput({ onInput, theme }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);

  const truncateFromStart = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return '...' + text.slice(-maxLength);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
          const currentTranscript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join("");

          setTranscript(currentTranscript);

          // Clear existing timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // Set new timeout
          const newTimeoutId = setTimeout(() => {
            if (currentTranscript.trim()) {
              onInput(currentTranscript);
              clearTranscript();
            }
          }, 5000);

          setTimeoutId(newTimeoutId);
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setIsVoiceSupported(false);
          }
          stopListening();
          setTranscript("");
        };

        recognition.onend = () => {
          if (isListening) {
            // If it was supposed to be listening but ended, try to restart
            try {
              recognition.start();
            } catch (err) {
              console.error("Failed to restart recognition:", err);
              setIsVoiceSupported(false);
              stopListening();
            }
          }
        };

        setRecognition(recognition);
      } else {
        setIsVoiceSupported(false);
      }
    }

    return () => {
      // Cleanup timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Cleanup speech recognition
      if (recognition) {
        recognition.stop();
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
      }
    };
  }, [onInput, timeoutId, isListening]);

  const toggleListening = () => {
    if (!recognition || !isVoiceSupported) return;

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (recognition && isVoiceSupported) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
        setIsVoiceSupported(false);
      }
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const clearTranscript = () => {
    setTranscript("");
  };

  return (
    <>
      <VoiceButton
        onClick={toggleListening}
        data-listening={isListening}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        whileTap={{ scale: 0.95 }}
        style={{ 
          cursor: isVoiceSupported ? 'pointer' : 'not-allowed',
          opacity: isVoiceSupported ? 1 : 0.5 
        }}
      >
        <FaMicrophone
          className={`w-5 h-5 icon ${
            !isVoiceSupported
              ? "text-gray-400"
              : theme === "dark"
              ? "text-gray-300"
              : "text-gray-600"
          }`}
        />
      </VoiceButton>
      <AnimatePresence mode="wait">
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4"
          >
            <div
              className={`p-3 rounded-lg shadow-lg mx-auto ${
                theme === "dark" ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"
              }`}
            >
              <p className="text-center" style={{ direction: 'rtl', textAlign: 'left' }}>
                {transcript ? truncateFromStart(transcript, 75) : "Listening..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
