/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Sparkles, 
  User, 
  MapPin, 
  ChevronRight, 
  ShoppingBag,
  RefreshCw,
  X,
  MessageSquare,
  Shirt
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { UserProfile, ChatMessage, Product } from './types';
import { getRecommendations, generateProductImage } from './services/geminiService';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleStart = (newProfile: UserProfile) => {
    setProfile(newProfile);
    const initialGreeting = `Hi! I'm StyleGenie. I see you're in ${newProfile.city} and love ${newProfile.style} style. How can I help you dress today?`;
    setMessages([{ id: 'init', role: 'model', content: initialGreeting }]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !profile) return;

    const userMsg = input.trim();
    setInput('');
    const userMsgId = Date.now().toString();
    const newMessages: ChatMessage[] = [...messages, { id: userMsgId, role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await getRecommendations(profile, messages, userMsg);
      
      const recommendations = response.recommendations || [];
      const botMsgId = (Date.now() + 1).toString();
      
      // Initial message without images
      const botMessage: ChatMessage = { 
        id: botMsgId,
        role: 'model', 
        content: response.text,
        products: recommendations.map((p: any) => ({
          ...p,
          image: '' // Flag for loading
        }))
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false); 

      // Process each image individually for better staggered loading UX
      recommendations.forEach(async (p: any, index: number) => {
        try {
          const generatedImage = await generateProductImage(
            p.imageKeyword || p.name, 
            profile.gender, 
            profile.style
          );
          
          const finalImage = generatedImage || `https://images.unsplash.com/photo-1490481651871-ab68ff25d43d?auto=format&fit=crop&w=400&h=500&q=80`;

          setMessages(prev => prev.map(msg => {
            if (msg.id === botMsgId && msg.products) {
              const newProducts = [...msg.products];
              newProducts[index] = { ...newProducts[index], image: finalImage };
              return { ...msg, products: newProducts };
            }
            return msg;
          }));
        } catch (err) {
          console.error("Failed to generate individual image:", err);
        }
      });

    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        role: 'model', 
        content: "I'm sorry, I hit a snag. Fashion is hard! Could you try that again?" 
      }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden h-screen w-screen z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <nav className="relative z-10 border-b border-white/10 px-6 py-4 flex justify-between items-center backdrop-blur-md bg-black/50 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">StyleGenie AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Personal Stylist</p>
          </div>
        </div>
        
        {profile && (
          <button 
            onClick={() => { setProfile(null); setMessages([]); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4 text-white/60" />
            <span className="text-white/60">Reset</span>
          </button>
        )}
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-20 min-h-[calc(100vh-80px)]">
        <AnimatePresence mode="wait">
          {!profile ? (
            <motion.div 
              key="onboarding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto"
            >
              <WelcomeSection onStart={handleStart} />
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Chat Area */}
              <div className="lg:col-span-12 flex flex-col h-[75vh]">
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar scroll-smooth"
                >
                  {messages.map((msg, idx) => (
                    <div key={idx} className={cn(
                      "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                        msg.role === 'user' ? "bg-white/10" : "bg-orange-500"
                      )}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                      </div>
                      <div className={cn(
                        "flex flex-col gap-4 max-w-[85%]",
                        msg.role === 'user' ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-white text-black" 
                            : "bg-white/10 border border-white/10 text-white/90"
                        )}>
                          <div className={cn(
                            "prose prose-sm max-w-none",
                            msg.role === 'model' && "prose-invert"
                          )}>
                            <ReactMarkdown>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>

                        {msg.products && msg.products.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full mt-2">
                            {msg.products.map((product) => (
                              <ProductCard key={product.id} product={product} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-4 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white/40" />
                      </div>
                      <div className="h-12 w-32 bg-white/10 rounded-2xl" />
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <form 
                  onSubmit={handleSendMessage}
                  className="mt-6 flex gap-2 p-1.5 rounded-full border border-white/10 bg-white/5 focus-within:border-orange-500/50 transition-all shadow-lg"
                >
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your style or for more recommendations..."
                    className="flex-1 bg-transparent px-4 py-3 outline-none text-sm placeholder:text-white/30"
                  />
                  <button 
                    disabled={isLoading}
                    className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

function WelcomeSection({ onStart }: { onStart: (p: UserProfile) => void }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({
    gender: '',
    age: '',
    city: '',
    style: ''
  });

  const next = () => setStep(s => s + 1);

  const steps = [
    {
      title: "Choose your gender",
      options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
      field: 'gender'
    },
    {
      title: "How old are you?",
      type: 'input',
      placeholder: 'Enter your age',
      field: 'age'
    },
    {
      title: "Where do you live?",
      type: 'input',
      placeholder: 'City, Country',
      field: 'city',
      icon: <MapPin className="w-5 h-5 text-orange-500" />
    },
    {
      title: "Describe your style",
      options: ['Casual & Comfy', 'Minimalist', 'Streetwear', 'Formal & Sharp', 'Bohemian', 'Vintage'],
      field: 'style'
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 md:p-12 text-center overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="relative z-10"
        >
          <p className="text-[10px] uppercase tracking-widest text-orange-500 font-bold mb-4">Step {step + 1} of {steps.length}</p>
          <h2 className="text-3xl font-bold mb-8 tracking-tight">{currentStep.title}</h2>

          {currentStep.options ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentStep.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => {
                    setProfile({ ...profile, [currentStep.field]: opt });
                    if (step === steps.length - 1) {
                      onStart({ ...profile, [currentStep.field]: opt });
                    } else {
                      next();
                    }
                  }}
                  className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all flex items-center justify-between group"
                >
                  <span className="font-medium">{opt}</span>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6 items-center">
              <div className="relative w-full max-w-sm">
                {currentStep.icon && <div className="absolute left-4 top-1/2 -translate-y-1/2">{currentStep.icon}</div>}
                <input 
                  type={currentStep.field === 'age' ? 'number' : 'text'}
                  placeholder={currentStep.placeholder}
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-2xl py-4 outline-none focus:border-orange-500 transition-all",
                    currentStep.icon ? "pl-12 pr-4" : "px-4 text-center"
                  )}
                  onKeyDown={e => {
                    const val = (e.target as HTMLInputElement).value;
                    if (e.key === 'Enter' && val) {
                      setProfile({ ...profile, [currentStep.field]: val });
                      next();
                    }
                  }}
                />
              </div>
              <p className="text-white/40 text-sm">Press Enter to continue</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-12 flex justify-center gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={cn(
            "h-1 px-3 rounded-full transition-all",
            i === step ? "bg-orange-500 w-8" : "bg-white/10 w-2"
          )} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col h-full group"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-white/5 flex items-center justify-center">
        {(!isLoaded || !product.image) && (
          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
            <Shirt className="w-8 h-8 text-white/10" />
          </div>
        )}
        {product.image && (
          <img 
            src={product.image} 
            alt={product.name}
            referrerPolicy="no-referrer"
            onLoad={() => setIsLoaded(true)}
            className={cn(
              "w-full h-full object-cover transition-all duration-700 group-hover:scale-110",
              isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
            )}
          />
        )}
        <div className="absolute top-4 right-4 h-8 px-3 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10">
          <span className="text-xs font-bold text-orange-400">{product.price}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
           <button className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2">
             <ShoppingBag className="w-3.5 h-3.5" />
             Add to Bag
           </button>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1 justify-between gap-1">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{product.category}</span>
          </div>
          <h3 className="text-sm font-semibold mb-1 line-clamp-1">{product.name}</h3>
          <p className="text-xs text-white/60 line-clamp-2 leading-snug">{product.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

function WelcomeHero() {
  return (
     <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] uppercase tracking-[0.2em] font-bold mb-6">
           <Shirt className="w-3 h-3" />
           AI Styling Assistant
        </div>
        <h2 className="text-5xl md:text-6xl font-bold tracking-tighter mb-4">
           Define your <span className="text-orange-500 italic">Signature</span> Look.
        </h2>
        <p className="text-white/60 max-w-md mx-auto text-lg">
           Let our AI analysis your vibe and curate the perfect wardrobe for your lifestyle.
        </p>
     </div>
  )
}
