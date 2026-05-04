import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const menuData = {
  pempek: {
    title: 'Menu <span>Pempek</span>',
    sub: 'Pilihan pempek segar hari ini',
    desc: 'Pempek dibuat dari ikan segar dan sagu pilihan, disajikan hangat dengan kuah cuko pedas manis khas Palembang.',
    items: [
      { icon: '🟡', name: 'Pempek Kapal Selam', detail: 'Isi telur, goreng garing', price: 'Rp 12.000' },
      { icon: '🟠', name: 'Pempek Lenjer', detail: 'Klasik panjang, tekstur kenyal', price: 'Rp 8.000' },
      { icon: '🟤', name: 'Pempek Adaan', detail: 'Bulat goreng, rempah ikan', price: 'Rp 7.000' },
      { icon: '🥚', name: 'Pempek Telur Kecil', detail: 'Ukuran mini, gurih padat', price: 'Rp 6.000' },
      { icon: '🍜', name: 'Pempek Kulit', detail: 'Renyah, dari kulit ikan', price: 'Rp 5.000' },
    ]
  },
  kerupuk: {
    title: 'Menu <span>Kerupuk</span>',
    sub: 'Camilan renyah pilihan',
    desc: 'Kerupuk kami dibuat dari bahan-bahan segar berkualitas, digoreng sempurna hingga renyah dan gurih di setiap gigitan.',
    items: [
      { icon: '🦐', name: 'Kerupuk Udang', detail: 'Udang segar, rasa gurih', price: 'Rp 5.000' },
      { icon: '🐟', name: 'Kerupuk Ikan', detail: 'Ikan tenggiri pilihan', price: 'Rp 5.000' },
      { icon: '🌶️', name: 'Kerupuk Pedas', detail: 'Extra sambal, kriuk mantap', price: 'Rp 6.000' },
      { icon: '🧄', name: 'Kerupuk Bawang', detail: 'Aroma bawang, ringan renyah', price: 'Rp 4.000' },
      { icon: '🌾', name: 'Kerupuk Palembang', detail: 'Resep tradisional asli', price: 'Rp 7.000' },
    ]
  }
};

export default function Home() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<null | 'pempek' | 'kerupuk'>(null);
  const [activeTab, setActiveTab] = useState<'pempek' | 'kerupuk'>('pempek');

  const openPopup = (cat: 'pempek' | 'kerupuk') => {
    setSelectedCategory(cat);
    setActiveTab(cat);
  };

  return (
    <div className="min-h-screen bg-[#1a0a00] text-[#f0ddb0] font-serif relative overflow-x-hidden selection:bg-[#d4a843] selection:text-[#0d0500]">
      {/* Dynamic Background Texture */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[20%] w-[60%] h-[60%] bg-[#d4a843]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[50%] bg-[#e07b2a]/5 blur-[100px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)' /%3E%3C/svg%3E")` }} />
      </div>

      {/* Navigation / Contact Link */}
      <nav className="relative z-20 flex justify-end p-6">
        <a 
          href="https://wa.me/6282280317000?text=Halo%20Kito%20Nian,%20saya%20ingin%20memesan..."
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] uppercase tracking-[0.3em] font-bold border border-[#d4a843]/30 px-6 py-2 rounded-full hover:bg-[#d4a843] hover:text-[#0d0500] transition-all duration-300 flex items-center gap-2"
        >
          Hubungi Kami 📱
        </a>
      </nav>

      {/* Header */}
      <header className="relative z-10 text-center pt-12 pb-8 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-block border border-[#d4a843] text-[#d4a843] text-[10px] tracking-[0.4em] uppercase py-1 px-5 mb-8">
            ✦ Asli Palembang ✦
          </div>
          <h1 className="font-playfair text-[clamp(2rem,7vw,5rem)] font-black leading-[0.9] text-[#f5e6c8] tracking-tighter uppercase">
            Kerupuk Palembang
            <span className="block text-[#d4a843]">Kito Nian</span>
          </h1>
          <p className="mt-6 italic text-[#9a7a4a] text-lg tracking-wide">
            Cita rasa otentik, dimasak dengan cinta sejak dulu
          </p>
        </motion.div>
      </header>

      {/* Divider */}
      <div className="flex items-center justify-center gap-6 max-w-lg mx-auto py-12 px-6">
        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-[#d4a843]" />
        <span className="text-[#d4a843] text-lg">✦</span>
        <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-[#d4a843]" />
      </div>

      {/* Menu Section */}
      <section className="relative z-10 pb-24 px-6">
        <p className="text-center text-[10px] tracking-[0.4em] uppercase text-[#9a7a4a] mb-12">Pilih menu favorit Anda</p>
        
        <div className="flex flex-wrap justify-center gap-8">
          {/* Pempek Card */}
          <motion.div 
            whileHover={{ y: -8 }}
            onClick={() => openPopup('pempek')}
            className="group relative w-[260px] aspect-[3/4] border border-[#d4a843]/20 overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-cover bg-center grayscale-[30%] brightness-[0.5] group-hover:scale-110 group-hover:brightness-[0.7] transition-all duration-700" 
                 style={{ backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Pempek_lenggang.jpg/800px-Pempek_lenggang.jpg')` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0400] via-transparent to-transparent opacity-90" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="text-[#d4a843] text-[9px] tracking-[0.2em] uppercase mb-1">Menu Utama</div>
              <h3 className="font-playfair text-3xl font-bold text-[#f5e6c8]">Pempek</h3>
              <p className="text-[11px] italic text-[#f0ddb0]/60 mt-1">Dengan kuah cuko pedas manis</p>
              <button className="mt-4 bg-[#d4a843] text-[#0d0500] text-[10px] font-bold uppercase tracking-wider px-5 py-2 group-hover:bg-[#e07b2a] group-hover:text-white transition-colors">
                Lihat Menu →
              </button>
            </div>
          </motion.div>

          {/* Kerupuk Card */}
          <motion.div 
            whileHover={{ y: -8 }}
            onClick={() => openPopup('kerupuk')}
            className="group relative w-[260px] aspect-[3/4] border border-[#d4a843]/20 overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-cover bg-center grayscale-[30%] brightness-[0.5] group-hover:scale-110 group-hover:brightness-[0.7] transition-all duration-700" 
                 style={{ backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Kerupuk_udang.jpg/800px-Kerupuk_udang.jpg')` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0400] via-transparent to-transparent opacity-90" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="text-[#d4a843] text-[9px] tracking-[0.2em] uppercase mb-1">Camilan</div>
              <h3 className="font-playfair text-3xl font-bold text-[#f5e6c8]">Kerupuk</h3>
              <p className="text-[11px] italic text-[#f0ddb0]/60 mt-1">Renyah & gurih pilihan</p>
              <button className="mt-4 bg-[#d4a843] text-[#0d0500] text-[10px] font-bold uppercase tracking-wider px-5 py-2 group-hover:bg-[#e07b2a] group-hover:text-white transition-colors">
                Lihat Menu →
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-[#d4a843]/10 text-center text-[#9a7a4a] text-xs tracking-widest leading-relaxed">
        © {new Date().getFullYear()} KERUPUK PALEMBANG KITO NIAN &nbsp;·&nbsp; JL. SUDIRMAN NO. 12, PALEMBANG
      </footer>

      {/* Popup Overlay */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#050200]/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedCategory(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative bg-[#0d0500] border border-[#d4a843] w-full max-w-xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Popup Header */}
              <div className="p-8 pb-4 border-b border-[#d4a843]/20 relative">
                <h2 className="font-playfair text-4xl text-[#f5e6c8]" dangerouslySetInnerHTML={{ __html: menuData[activeTab].title }} />
                <p className="italic text-[#9a7a4a] text-sm mt-1">{menuData[activeTab].sub}</p>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="absolute top-6 right-6 w-10 h-10 border border-[#d4a843]/30 flex items-center justify-center text-[#d4a843] hover:bg-[#d4a843] hover:text-[#0d0500] transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-8">
                {/* Tab Nav */}
                <div className="flex border border-[#d4a843]/30 mb-8">
                  <button 
                    onClick={() => setActiveTab('pempek')}
                    className={`flex-1 py-3 text-[10px] tracking-widest uppercase font-bold transition-all ${activeTab === 'pempek' ? 'bg-[#d4a843] text-[#0d0500]' : 'text-[#9a7a4a] hover:text-[#d4a843]'}`}
                  >
                    🍢 Pempek
                  </button>
                  <button 
                    onClick={() => setActiveTab('kerupuk')}
                    className={`flex-1 py-3 text-[10px] tracking-widest uppercase font-bold transition-all ${activeTab === 'kerupuk' ? 'bg-[#d4a843] text-[#0d0500]' : 'text-[#9a7a4a] hover:text-[#d4a843]'}`}
                  >
                    🍿 Kerupuk
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-[#f0ddb0]/70 mb-8 italic">
                  {menuData[activeTab].desc}
                </p>

                {/* Items List */}
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {menuData[activeTab].items.map((item, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 p-4 border border-[#d4a843]/10 hover:border-[#d4a843]/40 bg-[#d4a843]/[0.02] transition-all"
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-playfair text-lg text-[#f5e6c8]">{item.name}</h4>
                        <p className="text-[10px] italic text-[#9a7a4a]">{item.detail}</p>
                      </div>
                      <div className="text-[#d4a843] font-bold text-sm">{item.price}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating WhatsApp Button */}
      <motion.a 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        href="https://wa.me/6282280317000?text=Halo%20Kito%20Nian,%20saya%20ingin%20memesan..."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-[200] w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform duration-300 group"
      >
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="absolute right-full mr-4 bg-[#0d0500] text-[#d4a843] text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-2 border border-[#d4a843]/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-2xl pointer-events-none">
          Pesan via WhatsApp
        </span>
      </motion.a>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(212,168,67,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d4a843; }
      `}} />
    </div>
  );
}
