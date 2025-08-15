import React from 'react';
import { View } from '../types';
import { SunIcon, MoonIcon } from './icons';

interface HeaderProps {
    setView: (view: View) => void;
    toggleTheme: () => void;
    isDarkMode: boolean;
}

const Header = ({ setView, toggleTheme, isDarkMode }: HeaderProps) => (
    <header className="p-4 bg-gradient-to-r from-indigo-500 to-blue-500 dark:from-indigo-600 dark:to-purple-700 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
            <h1 onClick={() => setView('home')} className="text-2xl font-bold text-white cursor-pointer select-none">ReStudy</h1>
             <button onClick={toggleTheme} className="text-white p-2 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
                {isDarkMode ? <SunIcon className="w-5 h-5"/> : <MoonIcon className="w-5 h-5"/>}
            </button>
        </div>
    </header>
);

export default Header;
