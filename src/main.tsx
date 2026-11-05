import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installDomTranslator, setUiDictionary } from './i18n/domTranslator';
import { PT_BR_UI } from './i18n/ptBR.ui';
import { getLanguage, subscribeToLanguage } from './i18n/language';
import { ensureTranslationMemoryLoaded } from './i18n/translationMemory';

// Brazilian Portuguese support: static UI dictionary + live DOM translator.
// Data translations (Gemini-generated, stored in Firestore) load when pt-BR is first selected.
setUiDictionary(PT_BR_UI);
installDomTranslator();
if (getLanguage() === 'pt-BR') ensureTranslationMemoryLoaded();
subscribeToLanguage(lang => {
  if (lang === 'pt-BR') ensureTranslationMemoryLoaded();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
