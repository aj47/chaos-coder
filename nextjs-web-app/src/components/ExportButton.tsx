import { motion } from 'framer-motion';
import { FaDownload } from 'react-icons/fa';

interface ExportButtonProps {
  code: string;
  theme: 'light' | 'dark';
  filename?: string;
}

export default function ExportButton({ code, theme, filename = 'app.html' }: ExportButtonProps) {
  const handleExport = () => {
    try {
      const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export code', e);
    }
  };

  return (
    <motion.button
      onClick={handleExport}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm ${
        theme === 'dark'
          ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
      }`}
      title="Download HTML"
    >
      <FaDownload className="w-3 h-3 mr-1" />
      Export
    </motion.button>
  );
}

