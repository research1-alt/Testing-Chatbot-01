import React from 'react';

interface IntroPageProps {
  onStart: () => void;
}

const IntroPage: React.FC<IntroPageProps> = ({ onStart }) => {
  return (
    <div className="h-screen w-screen bg-white flex items-center justify-center font-sans text-gray-900 p-4">
      <div className="max-w-2xl w-full bg-gray-50 border border-gray-200 rounded-lg p-8 shadow-2xl text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center mb-6 ring-4 ring-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h1a1 1 0 011 1v3.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1h-1a1 1 0 01-1-1V3.5zM6.5 15.5a1.5 1.5 0 013 0V16a1 1 0 001 1h1a1 1 0 011 1v3.5a1.5 1.5 0 01-3 0V20a1 1 0 00-1-1h-1a1 1 0 01-1-1v-3.5z" />
                <path d="M4 9.5a1.5 1.5 0 013 0V10a1 1 0 001 1h1a1 1 0 011 1v3.5a1.5 1.5 0 01-3 0V14a1 1 0 00-1-1h-1a1 1 0 01-1-1V9.5z" />
                <path d="M16.5 3.5a1.5 1.5 0 010 3h-3.5a1.5 1.5 0 010-3h3.5z" />
            </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">OSM Service Intern</h1>
        <p className="text-gray-600 mb-8 max-w-lg">
          Your intelligent partner in the field. Upload technical manuals, troubleshooting guides, or entire project folders. Then, ask questions in natural language to get step-by-step solutions based on your documents.
        </p>
        <button
          onClick={onStart}
          className="bg-green-600 text-white font-semibold py-3 px-8 rounded-md hover:bg-green-700 transition-all text-lg transform hover:scale-105"
        >
          Get Started
        </button>
        <p className="text-xs text-gray-500 mt-8">
          Last code update: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default IntroPage;