import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/* ─── Config ─── */
const WA_NUMBER = '6282280317000'; // 082280317000

/* ─── Product Data ─── */
const pempekItems = [
  { name: 'Pempek Kapal Selam', desc: 'Pempek ikonik dengan isian telur utuh di dalamnya.', img: '/images/pempek_kapal_selam.png', hasOrder: true, tag: 'Favorit' },
  { name: 'Pempek Lenjer Besar', desc: 'Tekstur lembut kenyal dengan rasa ikan yang kuat.', img: '/images/pempek_lenjer.png', hasOrder: true },
  { name: 'Pempek Adaan & Kulit', desc: 'Campuran adaan gurih dan kulit ikan yang renyah.', img: '/images/pempek_adaan_kulit.png', hasOrder: true },
  { name: 'Pempek Lenggang', desc: 'Pempek yang dipanggang bersama telur kocok harum.', img: '/images/pempek_lenggang.png', hasOrder: true },
  { name: 'Pempek Tunu', desc: 'Pempek panggang dengan aroma khas arang.', img: '/images/pempek_tunu.png', hasOrder: true },
  { name: 'Pempek Tekwan', desc: 'Sup bola ikan segar dengan kuah kaldu udang.', img: '/images/pempek_tekwan.png', hasOrder: true, tag: 'Segar' },
];

const kerupukItems = [
  { name: 'Kemplang Bakar Premium', desc: 'Kemplang panggang arang dengan sambal terasi.', img: '/images/kerupuk_kemplang.png', hasOrder: true, tag: 'Best Seller' },
  { name: 'Kerupuk Getas Ikan', desc: 'Cemilan bulat renyah penuh rasa ikan tenggiri.', img: '/images/kerupuk_getas_ikan.png', hasOrder: true },
  { name: 'Kripik Pisang Manis', desc: 'Pisang pilihan dengan lapisan gula karamel madu.', img: '/images/kripik_pisang.png', hasOrder: true },
  { name: 'Kerupuk Udang Spesial', desc: 'Kerupuk udang lebar yang sangat renyah dan gurih.', img: '/images/kerupuk_udang_spesial.png', hasOrder: true },
];

const testimonials = [
  { 
    name: 'Pempek Lenjer Besar', 
    title: 'Menu Favorit',
    stars: 5, 
    img: '/images/pempek_lenjer.png',
    text: 'Tekstur pempek lenjer yang kenyal dan rasa ikan tenggiri yang sangat terasa. Benar-benar juara saat dinikmati dengan cuko kental pedas manis.' 
  },
  { 
    name: 'Pempek Adaan & Kulit', 
    title: 'Menu Gurih',
    stars: 5, 
    img: '/images/pempek_adaan_kulit.png',
    text: 'Perpaduan sempurna antara adaan yang lembut dan kulit yang renyah gurih. Citarasa otentik Palembang yang bikin ketagihan setiap saat.' 
  },
  { 
    name: 'Kerupuk Kancing Super', 
    title: 'Cemilan Renyah',
    stars: 5, 
    img: '/images/kerupuk_kemplang.png',
    text: 'Kerupuk kancing dengan kualitas super, sangat renyah dan gurih. Pas sekali untuk teman makan nasi atau sekadar cemilan santai di sore hari.' 
  },
];

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

/* ─── Styles (inline CSS-in-JS) ─── */
const styles = {
  page: { fontFamily: "'Poppins', 'Segoe UI', sans-serif", background: '#fff', minHeight: '100vh', position: 'relative' as const, paddingBottom: 20, overflowX: 'hidden' as const },
  heroWrapper: { background: '#000', borderRadius: '0 0 40px 40px', overflow: 'hidden' as const, position: 'relative' as const },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '16px 40px', 
    background: 'transparent', 
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100 
  },
  logo: { fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 28, color: '#E5E4E2', letterSpacing: 1 },
  hero: { position: 'relative' as const, padding: '100px 40px 140px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', textAlign: 'center' as const, minHeight: '600px', overflow: 'hidden' as const },
  heroBgImg: { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' as const, zIndex: 1, opacity: 0.8 },
  heroOverlay: { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.7) 100%)', zIndex: 2 },
  heroTitle: { fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(32px, 6vw, 60px)', color: '#E5E4E2', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.3)', maxWidth: 900, position: 'relative' as const, zIndex: 5 },
  heroBtn: { display: 'inline-block', padding: '16px 32px', border: '2px solid #fff', color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 1.5, cursor: 'pointer', background: 'transparent', textTransform: 'uppercase' as const, margin: '30px 10px 0', transition: 'all 0.3s', borderRadius: 8, position: 'relative' as const, zIndex: 5 },
  tabBar: { display: 'flex', justifyContent: 'center', gap: 16, padding: '28px 40px 16px' },
  tab: (active: boolean) => ({ padding: '12px 36px', border: '2px solid #8B0000', borderRadius: 4, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, cursor: 'pointer', background: active ? '#8B0000' : '#fff', color: active ? '#fff' : '#8B0000', textTransform: 'uppercase' as const, transition: 'all 0.3s ease' }),
  grid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
    gridAutoRows: 'minmax(350px, auto)',
    gap: 24, 
    padding: '0 40px 32px', 
    maxWidth: 1400, 
    margin: '0 auto',
    gridAutoFlow: 'dense' as const
  },
  card: (featured: boolean) => ({ 
    background: '#fff', 
    borderRadius: 24, 
    overflow: 'hidden', 
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)', 
    border: '1px solid #f0f0f0', 
    cursor: 'pointer', 
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
    textAlign: 'left' as const,
    gridColumn: featured ? 'span 2' : 'span 1',
    gridRow: featured ? 'span 2' : 'span 1',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const
  }),
  cardImg: (featured: boolean) => ({ 
    width: '100%', 
    height: featured ? '100%' : '240px', 
    objectFit: 'cover' as const, 
    background: '#f8f4ee',
    position: featured ? 'absolute' : 'relative' as const,
    top: 0, left: 0, zIndex: 1
  }),
  cardBody: (featured: boolean) => ({ 
    padding: featured ? '40px' : '20px', 
    zIndex: 10, 
    marginTop: featured ? 'auto' : 0,
    background: featured ? 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' : '#fff',
    width: '100%'
  }),
  cardName: (featured: boolean) => ({ 
    fontSize: featured ? '28px' : '18px', 
    fontWeight: 800, 
    color: featured ? '#fff' : '#222', 
    lineHeight: 1.2, 
    marginBottom: 8, 
    fontFamily: "'Playfair Display', serif" 
  }),
  cardDesc: (featured: boolean) => ({ 
    fontSize: featured ? '15px' : '13px', 
    color: featured ? 'rgba(255,255,255,0.9)' : '#666', 
    lineHeight: 1.5, 
    marginBottom: 15, 
    fontStyle: 'italic',
    maxWidth: featured ? '400px' : 'none'
  }),
  orderBtn: { display: 'block', width: '100%', padding: '12px 0', background: '#C0392B', color: '#fff', fontSize: '11px', fontWeight: 800, letterSpacing: 1.5, textAlign: 'center' as const, cursor: 'pointer', textTransform: 'uppercase' as const, transition: 'all 0.2s', borderRadius: '6px', border: 'none' },
  testiSection: { 
    padding: '60px 40px 80px', 
    background: '#fcfcfc',
    backgroundImage: 'radial-gradient(#e0e0e0 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  },
  testiContainer: { maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' },
  testiTitle: { fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 32, textAlign: 'center' as const, color: '#222', marginBottom: 50, letterSpacing: 0.5 },
  testiCard: { position: 'relative' as const },
  testiHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' },
  testiAvatar: { width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' as const, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  testiName: { fontWeight: 800, fontSize: 18, color: '#000', marginBottom: 2 },
  testiJob: { fontSize: 14, color: '#777', fontStyle: 'italic', marginBottom: 8 },
  testiStars: { color: '#F5A623', fontSize: 14 },
  testiText: { fontSize: 15, color: '#444', lineHeight: 1.7, fontStyle: 'italic', position: 'relative' as const, paddingLeft: 20 },
  testiQuote: { position: 'absolute' as const, left: -5, top: -5, fontSize: 30, color: '#999', fontFamily: 'serif', lineHeight: 1 },
  topNav: { display: 'flex', gap: '30px', alignItems: 'center' },
  topNavLink: { fontSize: '14px', fontWeight: 600, color: '#E5E4E2', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s', fontFamily: "'Poppins', sans-serif" },
  waBtn: { position: 'fixed' as const, bottom: 32, right: 32, zIndex: 200, width: 56, height: 56, borderRadius: '50%', background: '#25D366', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,211,102,0.4)', cursor: 'pointer' },
};

/* ─── Component ─── */
export default function Home() {
  const [activeTab, setActiveTab] = useState<'pempek' | 'kerupuk'>('pempek');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const productRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToProducts = (tab: 'pempek' | 'kerupuk') => {
    setActiveTab(tab);
    setTimeout(() => productRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleOrder = (item: { name: string; price: number }) => {
    const msg = `Halo Kito Nian, saya ingin memesan:\n\n${item.name}\n\nMohon info ketersediaan. Terima kasih!`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const items = activeTab === 'pempek' ? pempekItems : kerupukItems;

  return (
    <div style={styles.page}>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={styles.heroWrapper}>
        {/* Header */}
        <header style={{ ...styles.header, padding: isMobile ? '12px 20px' : '16px 40px', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0 }}>
          <div style={{ ...styles.logo, fontSize: isMobile ? 22 : 28 }}>KITO NIAN</div>
          
          <nav style={{ ...styles.topNav, gap: isMobile ? '12px' : '30px', overflowX: isMobile ? 'auto' : 'visible', width: isMobile ? '100%' : 'auto', paddingBottom: isMobile ? 8 : 0, justifyContent: 'center' }}>
            {[
              { label: 'Home', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
              { label: 'Menu Pempek', action: () => scrollToProducts('pempek') },
              { label: 'Menu Kerupuk', action: () => scrollToProducts('kerupuk') },
              { label: 'Hubungi Kami', action: () => window.open(`https://wa.me/${WA_NUMBER}`, '_blank') },
            ].map((item, idx) => (
              <motion.a 
                key={idx} 
                style={{ ...styles.topNavLink, fontSize: isMobile ? 11 : 14, whiteSpace: 'nowrap' }} 
                onClick={item.action}
                whileHover={{ color: '#f5e6c8', y: -2 }}
              >
                {item.label}
              </motion.a>
            ))}
          </nav>

          {/* Right Spacer (Hidden on mobile) */}
          {!isMobile && <div style={{ width: 140 }}></div>}
        </header>

        {/* Hero */}
        <motion.section style={{ ...styles.hero, padding: isMobile ? '80px 20px' : '100px 40px 140px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <motion.img 
            src="/images/hero_pempek_spread.png" 
            alt="Background" 
            style={styles.heroBgImg as any} 
            initial={{ scale: 1.1 }} 
            animate={{ scale: 1 }} 
            transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }} 
          />
          <div style={styles.heroOverlay as any}></div>
          <div style={{ position: 'relative', zIndex: 5 }}>
            <motion.h1 style={{ ...styles.heroTitle, fontSize: isMobile ? 32 : 'clamp(32px, 6vw, 60px)' }} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}>
              CITA RASA ASLI WONG KITO, <br/> SAMPAI KE PINTU RUMAHMU.
            </motion.h1>

            {/* Integrated Tab Bar */}
            <motion.div 
              style={{ ...styles.tabBar, background: 'transparent', padding: '20px 0 0', gap: 15, justifyContent: isMobile ? 'center' : 'center' }}
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
            >
              <motion.button 
                onClick={() => scrollToProducts('pempek')} 
                whileTap={{ scale: 0.95 }}
                style={{ 
                  ...styles.tab(activeTab === 'pempek'), 
                  background: activeTab === 'pempek' ? '#fff' : 'transparent', 
                  color: activeTab === 'pempek' ? '#D4792F' : '#fff',
                  border: '2px solid #fff',
                  padding: isMobile ? '10px 20px' : '14px 32px',
                  fontSize: isMobile ? 12 : 14
                }}
              >
                [ PEMPEK ]
              </motion.button>
              <motion.button 
                onClick={() => scrollToProducts('kerupuk')} 
                whileTap={{ scale: 0.95 }}
                style={{ 
                  ...styles.tab(activeTab === 'kerupuk'), 
                  background: activeTab === 'kerupuk' ? '#fff' : 'transparent', 
                  color: activeTab === 'kerupuk' ? '#D4792F' : '#fff',
                  border: '2px solid #fff',
                  padding: isMobile ? '10px 20px' : '14px 32px',
                  fontSize: isMobile ? 12 : 14
                }}
              >
                [ KERUPUK ]
              </motion.button>
            </motion.div>
          </div>
          {/* Decorative wave */}
          <svg style={{ position: 'absolute', bottom: -2, left: 0, width: '100%', zIndex: 10 }} viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none"><path d="M0 40V12C240 0 480 24 720 12C960 0 1200 24 1440 12V40H0Z" fill="#fff"/></svg>
        </motion.section>
      </div>

      {/* Tab Bar removed from here and moved to Hero */}
      <div ref={productRef}></div>

      {/* Product Grid - Bento Concept */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab + '-grid'} 
          style={{ 
            ...styles.grid, 
            marginTop: isMobile ? 40 : 0,
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))' 
          }} 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {(activeTab === 'pempek' ? pempekItems : kerupukItems).map((item, i) => {
            const isFeatured = !isMobile && i === 0;
            return (
              <motion.div key={i} 
                style={styles.card(isFeatured) as any} 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.06, duration: 0.35 }}
                whileHover={{ y: -8, boxShadow: '0 15px 40px rgba(0,0,0,0.12)' }}>
                
                <img src={item.img} alt={item.name} style={styles.cardImg(isFeatured) as any} loading="lazy" />
                


                <div style={styles.cardBody(isFeatured) as any}>
                  <div style={styles.cardName(isFeatured)}>{item.name}</div>
                  <div style={styles.cardDesc(isFeatured)}>{(item as any).desc}</div>
                  {item.hasOrder && (
                    <motion.button 
                      style={{ ...styles.orderBtn, width: isFeatured ? 'fit-content' : '100%', padding: isFeatured ? '14px 30px' : '12px 0' }} 
                      whileHover={{ scale: 1.05, background: '#A93226' }} 
                      whileTap={{ scale: 0.96 }} 
                      onClick={() => handleOrder(item as any)}
                    >
                      [ PESAN VIA WHATSAPP ]
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Testimonials */}
      <div style={{ ...styles.testiSection, padding: isMobile ? '40px 20px' : '60px 40px 80px' }}>
        <div style={{ ...styles.testiTitle, fontSize: isMobile ? 24 : 32, marginBottom: isMobile ? 30 : 50 }}>Apa Kata Mereka?</div>
        <div style={styles.testiContainer}>
          {testimonials.map((t, i) => (
            <motion.div 
              key={i} 
              style={styles.testiCard} 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <div style={styles.testiHeader}>
                <img src={t.img} alt={t.name} style={styles.testiAvatar} />
                <div>
                  <div style={styles.testiName}>{t.name}</div>
                  <div style={styles.testiJob}>{t.title}</div>
                  <div style={styles.testiStars}>{'★'.repeat(t.stars)}</div>
                </div>
              </div>
              <div style={styles.testiText}>
                <span style={styles.testiQuote}>“</span>
                {t.text}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px 20px 24px', fontSize: 11, color: '#999', borderTop: '1px solid #f0f0f0' }}>
        © {new Date().getFullYear()} Kerupuk Palembang Kito Nian · Jl. Kakap III No.63, Tengkerang Sel., Kec. Bukit Raya, Kota Pekanbaru, Riau 28228
      </div>



      {/* WhatsApp FAB */}
      <motion.a href={`https://wa.me/${WA_NUMBER}?text=Halo%20Kito%20Nian,%20saya%20ingin%20memesan...`} target="_blank" rel="noopener noreferrer"
        style={styles.waBtn as any} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.8 }}>
        <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </motion.a>


    </div>
  );
}
