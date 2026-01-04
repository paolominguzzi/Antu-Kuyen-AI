
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Video} from '@google/genai';
import React, {useCallback, useEffect, useState, useRef} from 'react';
import ApiKeyDialog from './components/ApiKeyDialog';
import {
  SparklesIcon, 
  TvIcon, 
  RectangleStackIcon, 
  FilmIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from './components/icons';
import LoadingIndicator from './components/LoadingIndicator';
import PromptForm from './components/PromptForm';
import VideoResult from './components/VideoResult';
import {generateVideo, askCatalogAssistant} from './services/geminiService';
import {
  AppState,
  GenerateVideoParams,
  ViewMode,
  ChatMessage,
  Category
} from './types';

const CATEGORIES: Category[] = [
  {
    title: "Tomates Beef (Suministro Asegurado)",
    products: [
      { name: "ANTUMAY", description: "Variedad rústica de manejo sencillo. Formato hermoso, firme.", layer: 'A', availability: "700 - 1000 toneladas/mes" },
      { name: "ALAMINA", description: "Incomparable postcosecha. Fruto rojo ideal para ciclos de invierno y primor.", layer: 'A', availability: "100 - 300 toneladas/mes" },
      { name: "ATTIYA", description: "Calibre grande, excelente cuaja en frío y baja luminosidad.", layer: 'A', availability: "100 - 300 toneladas/mes" }
    ]
  },
  {
    title: "Tomates Cherry (Alta Calidad)",
    products: [
      { name: "ROMANITA", description: "Tipo Midi Plum. Sabor y textura únicos.", specs: "7.5° Brix", layer: 'A', availability: "30 - 100 toneladas/mes" },
      { name: "NANCY", description: "Planta vigorosa, color rojo intenso.", specs: "8.5° Brix", layer: 'A', availability: "30 - 100 toneladas/mes" },
      { name: "ORNELA", description: "Grape indeterminado, maduración temprana. Alta resistencia.", specs: "7 - 8.5° Brix", layer: 'A', availability: "30 - 100 toneladas/mes" }
    ]
  },
  {
    title: "Pimientos y Ajíes",
    products: [
      { name: "ACHILLE", description: "Morrón verde, fuente de vitaminas C, K y ácido fólico.", layer: 'A', availability: "20 - 30 toneladas/mes (total pimientos)" },
      { name: "SVEN & PROSPERITY", description: "Morrón amarillo y naranja de sabor dulce.", layer: 'A' },
      { name: "AJÍ HÍBRIDO HÚNGARO", description: "Alta pungencia, cuaja en frío. Frutos de 22-25 cm.", layer: 'B', availability: "20 - 30 toneladas/mes (total ajíes)" },
      { name: "HOT BANANA", description: "Paredes gruesas, estética superior y larga vida de anaquel.", layer: 'B' }
    ]
  },
  {
    title: "Especialidades y Altiplano",
    products: [
      { name: "PONCHO NEGRO", description: "Tomate patrimonial (Lluta). Alto en antocianinas. Calidad medicinal.", layer: 'B', specs: "Patrimonial" },
      { name: "CEBOLLA MORADA RASTA", description: "Textura crujiente y aroma intenso. Cocina profesional.", layer: 'A', availability: "40 - 80 toneladas/mes (con albahaca)" },
      { name: "ALBAHACA ITALIANA", description: "Fragante y fresca. Ideal para preparaciones gourmet.", layer: 'A' },
      { name: "PEPINO ENSALADA", description: "Fuseta, Javan y Cumlaude. Rico en Vitaminas K y C.", layer: 'A', availability: "20 - 30 toneladas/mes" }
    ]
  }
];

const REVENUE_SOURCES = [
  { source: "Margen Comercial Premium", fundamento: "Producto patrimonial no-GMO", valor: "6–10%" },
  { source: "Fee Financiero", fundamento: "Capital + Estabilidad para el productor", valor: "3–6%" },
  { source: "Fee Técnico", fundamento: "Producción asistida obligatoria", valor: "2–4%" },
  { source: "Fee Gestión de Riesgo", fundamento: "Seguros + Trazabilidad total", valor: "2–4%" }
];

const INSURANCE_MATRIX = [
  { riesgo: "Clima / Plagas", instrumento: "Seguro Paramétrico + Tradicional", impacto: "Protege capital adelantado" },
  { riesgo: "Incumplimiento Productor", instrumento: "Seguro de Performance", impacto: "Asegura entregas" },
  { riesgo: "Incumplimiento Financiero", instrumento: "Seguro de Crédito Agrícola", impacto: "Reduce pérdidas de cartera" },
  { riesgo: "Brechas no asegurables", instrumento: "Fondo Cautivo Antü Küyen", impacto: "Captura margen residual" }
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.CATALOG);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Bienvenido al Catálogo 2025-2026 de Antü Küyen. Soy el "Arquitecto del cumplimiento productivo". ¿Deseas consultar sobre disponibilidad de tomates beef, brix de cherrys o nuestro plan financiero?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          if (!(await window.aistudio.hasSelectedApiKey())) {
            setShowApiKeyDialog(true);
          }
        } catch (error) {
          setShowApiKeyDialog(true);
        }
      }
    };
    checkApiKey();
  }, []);

  const handleGenerate = useCallback(async (params: GenerateVideoParams) => {
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      setShowApiKeyDialog(true);
      return;
    }
    setAppState(AppState.LOADING);
    setErrorMessage(null);
    try {
      const {objectUrl} = await generateVideo(params);
      setVideoUrl(objectUrl);
      setAppState(AppState.SUCCESS);
    } catch (error: any) {
      setErrorMessage(error.message || 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    }
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);
    try {
      const response = await askCatalogAssistant(userMsg);
      setChatMessages(prev => [...prev, { role: 'model', text: response || 'No pude procesar eso.' }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: 'Error de conexión con el asistente.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const NavItem = ({ mode, label, icon: Icon }: { mode: ViewMode, label: string, icon: any }) => (
    <button
      onClick={() => setView(mode)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${view === mode ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 flex flex-col font-sans">
      {showApiKeyDialog && <ApiKeyDialog onContinue={() => { setShowApiKeyDialog(false); window.aistudio?.openSelectKey(); }} />}
      
      <header className="py-4 border-b border-gray-800 sticky top-0 bg-[#050505]/80 backdrop-blur-md z-30 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-700 rounded-full flex items-center justify-center text-black font-black text-xl shadow-lg ring-2 ring-orange-500/20">
              AK
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white uppercase">Antü Küyen <span className="text-orange-500">Agro</span></h1>
              <p className="text-[10px] text-orange-500/70 font-bold uppercase tracking-[0.2em]">Suministro DIC 25 - ENE 26</p>
            </div>
          </div>
          <nav className="flex gap-2">
            <NavItem mode={ViewMode.CATALOG} label="Catálogo" icon={RectangleStackIcon} />
            <NavItem mode={ViewMode.CORPORATE} label="Plan 2026" icon={ChevronDownIcon} />
            <NavItem mode={ViewMode.AI_ASSISTANT} label="Arquitecto IA" icon={SparklesIcon} />
            <NavItem mode={ViewMode.VIDEO_STUDIO} label="Promotion Studio" icon={FilmIcon} />
          </nav>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6">
        {view === ViewMode.CATALOG && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <section className="relative h-[350px] rounded-[2rem] overflow-hidden mb-8 group">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent flex flex-col justify-center px-12">
                <div className="inline-block bg-orange-600 text-white text-[10px] font-black px-3 py-1 rounded-full mb-4 uppercase tracking-widest">Arica, Chile</div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">Continuidad en su<br/><span className="text-orange-500">Primera Milla</span></h2>
                <p className="text-lg text-gray-300 max-w-xl border-l-4 border-orange-600 pl-6 italic">
                  "Variedades seleccionadas para compra directa en origen. Suministro asegurado para retail e instituciones."
                </p>
              </div>
            </section>

            {CATEGORIES.map((cat, idx) => (
              <section key={idx}>
                <h3 className={`text-2xl font-black mb-6 border-b border-gray-800 pb-2 inline-block pr-8 uppercase tracking-tight ${idx % 2 === 0 ? 'text-orange-500' : 'text-white'}`}>
                  {cat.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cat.products.map((p, pIdx) => (
                    <div key={pIdx} className={`bg-gray-900/40 border p-6 rounded-3xl hover:border-orange-500 transition-all group relative overflow-hidden ${p.layer === 'B' ? 'border-orange-900/50 shadow-lg shadow-orange-950/10' : 'border-gray-800'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <h4 className={`text-lg font-black tracking-tight ${p.layer === 'B' ? 'text-orange-500' : 'text-white'}`}>{p.name}</h4>
                        {p.specs && <span className="bg-orange-600/20 text-orange-400 text-[10px] px-2 py-1 rounded-md font-black uppercase">{p.specs}</span>}
                      </div>
                      <p className="text-sm text-gray-400 mb-6 leading-relaxed font-medium">{p.description}</p>
                      {p.availability && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-black/40 p-2 rounded-xl border border-gray-800/50">
                          <TvIcon className="w-3 h-3 text-orange-600" />
                          <span>{p.availability}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {view === ViewMode.CORPORATE && (
          <div className="animate-in slide-in-from-top duration-500 space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Operador Agrofinanciero</h2>
              <p className="text-gray-400 font-medium">Arquitectura de cumplimiento y eficiencia 2026.</p>
              <div className="inline-block bg-orange-600 text-black font-black px-6 py-2 rounded-full uppercase text-xl shadow-[0_0_20px_rgba(234,88,12,0.4)]">
                Target: 20% Margen Neto
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] border border-gray-800">
                  <h3 className="text-xl font-black text-orange-500 uppercase mb-6 flex items-center gap-3">Fuentes de Margen</h3>
                  <div className="space-y-4">
                    {REVENUE_SOURCES.map((s, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-gray-800 group hover:border-orange-600 transition-colors">
                        <div>
                          <p className="text-white font-black text-xs uppercase tracking-tight">{s.source}</p>
                          <p className="text-[10px] text-gray-500 italic">{s.fundamento}</p>
                        </div>
                        <span className="text-orange-500 font-black text-lg">{s.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-600/5 p-8 rounded-[2.5rem] border border-orange-500/20">
                  <h3 className="text-white font-black uppercase mb-4 tracking-tight">Gestión Argentina & Chile</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black/40 rounded-2xl">
                      <p className="text-orange-500 font-black text-sm mb-1 uppercase">Paolo Minguzzi</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Gestión Chile</p>
                    </div>
                    <div className="p-4 bg-black/40 rounded-2xl">
                      <p className="text-orange-500 font-black text-sm mb-1 uppercase">Anuar Peche</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Gestión Argentina</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-[2.5rem]">
                <h3 className="text-xl font-black text-white uppercase mb-6 pl-4 border-l-4 border-orange-600">Matriz de Seguros Integrada</h3>
                <div className="space-y-4">
                  {INSURANCE_MATRIX.map((ins, i) => (
                    <div key={i} className="p-5 bg-black/60 rounded-3xl border border-gray-800 group hover:bg-orange-600/5 transition-all">
                      <div className="flex justify-between mb-2">
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{ins.riesgo}</span>
                        <span className="text-[8px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded uppercase font-black">Beneficiario AK</span>
                      </div>
                      <h4 className="text-white font-black text-sm uppercase mb-1">{ins.instrumento}</h4>
                      <p className="text-[10px] text-gray-500 font-medium">{ins.impacto}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === ViewMode.AI_ASSISTANT && (
          <div className="h-[calc(100vh-180px)] flex flex-col max-w-4xl mx-auto bg-[#0a0a0a] border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="p-6 bg-gray-900/40 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="font-black text-white uppercase tracking-tight">Arquitecto IA</h3>
                  <p className="text-[10px] text-orange-500 font-bold uppercase">Knowledge base: Catálogo DIC 25 - ENE 26</p>
                </div>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto p-8 space-y-6">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-6 py-4 rounded-[1.5rem] text-sm leading-relaxed font-medium shadow-lg ${m.role === 'user' ? 'bg-orange-600 text-white' : 'bg-gray-900 text-gray-200 border border-gray-800'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-900 px-6 py-4 rounded-2xl flex gap-1 border border-gray-800">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-800 bg-[#080808]">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ej: ¿Qué tomates tienen más brix este mes?"
                  className="flex-grow bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-orange-600 text-white placeholder-gray-600 font-medium"
                />
                <button type="submit" className="px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl transition-all shadow-lg hover:shadow-orange-900/20 active:scale-95">
                  <ArrowRightIcon className="w-6 h-6" />
                </button>
              </div>
            </form>
          </div>
        )}

        {view === ViewMode.VIDEO_STUDIO && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-500">
            <div className="text-center space-y-2 mb-10">
              <h2 className="text-3xl font-black text-white uppercase">Promotion Studio</h2>
              <p className="text-gray-400 font-medium italic">"Cinematografía para la Red Antü Küyen"</p>
            </div>
            
            {appState === AppState.IDLE ? (
              <div className="pb-4">
                <PromptForm onGenerate={handleGenerate} />
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                {appState === AppState.LOADING && <LoadingIndicator />}
                {appState === AppState.SUCCESS && videoUrl && (
                  <VideoResult
                    videoUrl={videoUrl}
                    onRetry={() => setAppState(AppState.IDLE)}
                    onNewVideo={() => setAppState(AppState.IDLE)}
                    onExtend={() => {}}
                    canExtend={false}
                  />
                )}
                {appState === AppState.ERROR && (
                  <div className="bg-red-900/20 border border-red-500 p-8 rounded-[2rem] text-center max-w-md">
                    <h2 className="text-2xl font-black text-red-400 mb-4 uppercase">Error de Sistema</h2>
                    <p className="text-red-300 font-medium">{errorMessage}</p>
                    <button onClick={() => setAppState(AppState.IDLE)} className="mt-8 px-8 py-3 bg-red-600 text-white font-black uppercase rounded-xl hover:bg-red-700 transition-colors">Reintentar</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-8 px-6 border-t border-gray-900 text-center">
        <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">
          Antü Küyen SpA &copy; 2026 - Arica, Chile - Origen Limpio
        </p>
      </footer>
    </div>
  );
};

export default App;
