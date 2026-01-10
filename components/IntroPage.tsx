
import React from 'react';

interface IntroPageProps {
  onStart: () => void;
}

const IntroPage: React.FC<IntroPageProps> = ({ onStart }) => {
  return (
    <div className="h-screen w-screen bg-white flex items-center justify-center font-sans text-gray-900 p-4">
      <div className="max-w-2xl w-full bg-gray-50 border border-gray-200 rounded-2xl p-12 shadow-2xl text-center flex flex-col items-center">
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">OSM Service Intern</h1>
        <div className="w-16 h-1 bg-green-600 rounded-full mb-8"></div>
        <p className="text-gray-600 mb-10 max-w-lg text-lg leading-relaxed">
          Your intelligent partner in the field. Query technical manuals and troubleshooting guides using natural language to get instant, step-by-step solutions for OSM vehicles.
        </p>
        <button
          onClick={onStart}
          className="bg-green-600 text-white font-bold py-4 px-12 rounded-xl hover:bg-green-700 transition-all text-xl shadow-lg hover:shadow-green-500/20 transform hover:-translate-y-1 active:scale-95"
        >
          Initialize Session
        </button>
        <div className="mt-12 pt-8 border-t border-gray-200 w-full">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Omega Seiki Mobility • Service Intelligence
            </p>
        </div>
      </div>
    </div>
  );
};

export default IntroPage;
