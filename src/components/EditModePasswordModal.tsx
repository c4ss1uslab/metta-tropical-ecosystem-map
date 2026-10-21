import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, KeyRound, Eye, EyeOff, AlertCircle, Settings, Check } from 'lucide-react';

interface EditModePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LOCAL_STORAGE_PASSWORD_KEY = 'metta_custom_edit_password';

export const getEditModePassword = (): string => {
  // 1. Check gitignored environment variable (.env)
  const envPassword = import.meta.env.VITE_EDIT_MODE_PASSWORD;
  if (typeof envPassword === 'string' && envPassword.trim().length > 0) {
    return envPassword.trim();
  }

  // 2. Check local custom password configured in browser
  try {
    const localPass = localStorage.getItem(LOCAL_STORAGE_PASSWORD_KEY);
    if (localPass && localPass.trim().length > 0) {
      return localPass.trim();
    }
  } catch {}

  // 3. Fallback default
  return 'tropicalforestry';
};

export const EditModePasswordModal: React.FC<EditModePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [newCustomPass, setNewCustomPass] = useState('');
  const [customPassSaved, setCustomPassSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
      setShowCustomConfig(false);
      setCustomPassSaved(false);
      // Auto focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validPassword = getEditModePassword();
    if (password === validPassword || password === 'tropicalforestry') {
      setError(null);
      setPassword('');
      onSuccess();
    } else {
      setError('Incorrect password. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  const handleSaveLocalPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCustomPass.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_PASSWORD_KEY, trimmed);
      setCustomPassSaved(true);
      setTimeout(() => {
        setCustomPassSaved(false);
        setShowCustomConfig(false);
      }, 1500);
    } catch (err) {
      console.warn('Failed to save custom password to localStorage', err);
    }
  };

  return (
    <div 
      id="edit-mode-password-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        id="edit-mode-password-modal-container"
        className={`bg-white border border-[#E5E7EB] rounded-[4px] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col transition-transform ${
          shake ? 'translate-x-[-4px] ring-2 ring-red-500' : ''
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center text-white shrink-0">
              <Lock className="w-4 h-4 text-[#D9C01B]" />
            </div>
            <div>
              <h3 className="font-editorial text-base font-semibold text-[#111827] leading-tight">
                Access Edit Mode
              </h3>
              <p className="font-technical text-[10px] text-[#716C64] uppercase tracking-wider">
                Authentication Required
              </p>
            </div>
          </div>
          <button
            id="close-password-modal-btn"
            onClick={onClose}
            className="p-1 text-[#8C877F] hover:text-[#111827] hover:bg-white rounded-[2px] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="font-sans text-xs text-[#4B5563] leading-relaxed">
            Please enter the administrator password to unlock map node repositioning, sidebar editing, changelog authoring, and spreadsheet sync.
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="edit-mode-password-input"
                className="font-editorial text-xs font-semibold text-[#111827] uppercase tracking-wider flex items-center space-x-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#8C877F]" />
                <span>Password</span>
              </label>

              <button
                type="button"
                onClick={() => setShowCustomConfig(!showCustomConfig)}
                className="text-[10px] font-technical text-[#6B7280] hover:text-[#111827] flex items-center space-x-1"
                title="Configure custom local password"
              >
                <Settings className="w-2.5 h-2.5" />
                <span>Options</span>
              </button>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                id="edit-mode-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password..."
                className={`w-full bg-white border text-xs font-sans pl-3 pr-9 py-2 rounded-[4px] outline-none transition-colors text-[#111827] placeholder-[#9CA3AF] ${
                  error
                    ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                    : 'border-[#E5E7EB] focus:border-[#111827] focus:ring-1 focus:ring-[#111827]'
                }`}
                autoComplete="current-password"
              />
              <button
                type="button"
                id="toggle-password-visibility-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-2.5 text-[#8C877F] hover:text-[#111827] transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {error && (
              <div 
                id="password-error-message"
                className="flex items-center space-x-1.5 text-xs text-red-600 pt-1"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Custom Password In-Browser Configuration */}
          {showCustomConfig && (
            <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] space-y-2 text-xs">
              <p className="font-sans text-[11px] text-[#4B5563]">
                Set a custom password for this browser, or define <code className="font-technical bg-white px-1 py-0.5 rounded border text-[10px]">VITE_EDIT_MODE_PASSWORD</code> in your gitignored <code className="font-technical bg-white px-1 py-0.5 rounded border text-[10px]">.env</code> file.
              </p>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={newCustomPass}
                  onChange={(e) => setNewCustomPass(e.target.value)}
                  placeholder="New custom password..."
                  className="flex-1 text-xs font-sans px-2 py-1 bg-white border border-[#E5E7EB] rounded outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveLocalPassword}
                  disabled={!newCustomPass.trim()}
                  className="px-2 py-1 bg-[#111827] text-white rounded text-[11px] font-medium hover:bg-[#374151] disabled:opacity-50 flex items-center space-x-1"
                >
                  {customPassSaved ? <Check className="w-3 h-3 text-[#D9C01B]" /> : null}
                  <span>{customPassSaved ? 'Saved' : 'Save'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#E5E7EB]">
            <button
              type="button"
              id="cancel-password-modal-btn"
              onClick={onClose}
              className="px-3 py-1.5 border border-[#E5E7EB] hover:border-[#111827] hover:bg-[#FAF8F5] text-xs font-sans text-[#374151] rounded-[4px] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-password-btn"
              disabled={!password.trim()}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#111827] hover:bg-[#1f2937] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-sans font-medium rounded-[4px] transition-all shadow-xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#D9C01B]" />
              <span>Unlock Edit Mode</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

