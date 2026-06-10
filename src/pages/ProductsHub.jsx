import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, Info, Search,
  Download, Filter, ArrowRight, ShoppingCart, Zap, MessageCircle,
  Layers, AppWindow, ShowerHead, ChefHat, Shirt, LayoutGrid,
  DoorOpen, Droplets, Armchair, Heart, Minus, Plus, CreditCard, CheckCircle2
} from 'lucide-react';
import { PubNav, Footer, translatePublicDom } from '../components/PubLayout';
import { db } from '../lib/firebase';
import { doc, setDoc, addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { AppContext } from '../context/AppContext';
import UnifiedPaymentGateway from '../components/UnifiedPaymentGateway';

const WA_ICON = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
// Removed static import of huge data file

const LIGHT_BG = `var(--bg-primary)`;
const DARK_TEXT = `var(--accent-secondary)`;
const AC = `var(--accent-secondary)`;

// --- HELPERS ---
function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}
const isMob = (w) => w <= 900;

// --- COMPONENTS ---

const DynamicImage = ({ src, alt, style, iconSize = 40, asMotion = false, initial, animate, layout }) => {
  const [error, setError] = useState(false);
  
  // Reset error if src changes
  useEffect(() => setError(false), [src]);

  if (!src || error || src.trim() === '') {
    const FallbackDiv = asMotion ? motion.div : 'div';
    return (
      <FallbackDiv
        layout={layout} initial={initial} animate={animate}
        style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px dashed rgba(0,0,0,0.1)' }}
      >
        <LayoutGrid size={iconSize} style={{ opacity: 0.3, marginBottom: 8 }} />
        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.4, textTransform: 'uppercase' }}>Image Unavailable</span>
      </FallbackDiv>
    );
  }
  
  const ImgTag = asMotion ? motion.img : 'img';
  return (
    <ImgTag
      layout={layout} initial={initial} animate={animate}
      src={src} alt={alt} style={style}
      onError={() => setError(true)}
    />
  );
};

const ProductCard = ({ product, onClick, ac, mob, onCompare, isComparing, waNumber, onToggleFavorite, isFavorited, onBuy }) => {
  const pCats = Array.isArray(product.cat) ? product.cat : [product.cat];
  const catLabel = pCats[0];
  const descText = product.description || product.desc || "";
  const waMsg = encodeURIComponent(`Hi Westline Future, I'm interested in: ${product.name}. Please send me a quote.`);
  const retailPrice = parseFloat(String(product.retailPrice || '0').replace(/[^0-9.]/g, '')) || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={mob ? {} : { y: -6 }}
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        border: isComparing ? `2px solid ${ac}` : '1px solid rgba(0,0,0,0.05)',
        cursor: 'pointer',
        boxShadow: isComparing ? `0 20px 40px ${ac}15` : '0 8px 24px rgba(0,0,0,0.04)',
        display: 'flex', flexDirection: 'column',
        position: 'relative', transition: 'box-shadow 0.25s',
      }}
    >
      <div style={{ height: mob ? 220 : 260, background: `var(--bg-secondary)`, position: 'relative', overflow: 'hidden' }}>
        <DynamicImage
          src={product.img}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: mob ? 10 : 20 }}
          iconSize={32}
        />
        
        {/* Heart Favorite Toggle Button */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }}
          style={{
            position: 'absolute', top: 12, left: 12,
            padding: 8, background: 'rgba(255, 255, 255, 0.92)',
            border: 'none', borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)',
            transition: 'all 0.2s', zIndex: 10
          }}
        >
          <Heart size={16} fill={isFavorited ? '#ef4444' : 'none'} color={isFavorited ? '#ef4444' : `var(--accent-secondary)`} />
        </motion.button>

        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onCompare(product.id); }}
            style={{
              padding: '5px 10px', background: isComparing ? ac : 'rgba(255,255,255,0.92)',
              color: isComparing ? '#fff' : DARK_TEXT, border: 'none', borderRadius: 100,
              fontSize: 9, fontWeight: 900, cursor: 'pointer', backdropFilter: 'blur(10px)'
            }}
          >
            {isComparing ? 'SELECTED' : '+ COMPARE'}
          </button>
          <div style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.92)', borderRadius: 100, fontSize: 10, fontWeight: 800, color: ac, backdropFilter: 'blur(10px)' }}>
            {catLabel.toUpperCase()}
          </div>
        </div>
      </div>
      <div style={{ padding: mob ? 16 : 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: mob ? 15 : 17, fontWeight: 800, margin: '0 0 6px', color: DARK_TEXT }}>{product.name}</h3>
        <p style={{ fontSize: mob ? 11 : 12, color: 'rgba(24, 14, 6, 0.5)', lineHeight: 1.5, margin: '0 0 16px', flex: 1 }}>
          {product.tagline || (descText.length > 80 ? descText.substring(0, 80) + '...' : descText)}
        </p>
        {/* Price row */}
        {retailPrice > 0 && (
          <div style={{ paddingBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 2 }}>From</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: ac }}>
              GH₵ {retailPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f5f5f5', paddingTop: 14 }}>
          {retailPrice > 0 ? (
            <button
              onClick={e => { e.stopPropagation(); onBuy && onBuy(); }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', background: '#111', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              <CreditCard size={13} /> Buy Now
            </button>
          ) : (
            <a
              href={`https://wa.me/${waNumber || '233247319778'}?text=${waMsg}`}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', background: '#25D366', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 800, textDecoration: 'none' }}
            >
              <WA_ICON /> WhatsApp Quote
            </a>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: DARK_TEXT, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', padding: '10px 12px', background: `var(--bg-secondary)`, borderRadius: 10 }}>
            Details <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const DetailModal = ({ product, onClose, ac, navigate, mob }) => {
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || 'Default');
  const [selectedGlass, setSelectedGlass] = useState(product.options?.[0] || 'Standard');

  const pCats = Array.isArray(product.cat) ? product.cat : [product.cat];
  const catLabel = pCats[0] || 'aluminum';

  // Support specs saved as an object OR formatted string (scraped entries)
  const specEntries = useMemo(() => {
    if (!product.specs) return [];
    if (typeof product.specs === 'object') return Object.entries(product.specs);
    if (typeof product.specs === 'string') {
      return product.specs
        .split('\n')
        .map(line => {
          const idx = line.indexOf(':');
          if (idx === -1) return null;
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
        })
        .filter(Boolean);
    }
    return [];
  }, [product.specs]);

  if (!product) return null;
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(24, 14, 6, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mob ? 0 : 20 }}
      onClick={onClose}
    >
      <motion.div 
        initial={mob ? { y: '100%' } : { scale: 0.9, y: 20 }}
        animate={mob ? { y: 0 } : { scale: 1, y: 0 }}
        exit={mob ? { y: '100%' } : { scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{ 
          background: '#fff', width: '100%', maxWidth: 1000, 
          borderRadius: mob ? '24px 24px 0 0' : 32, 
          overflow: 'hidden', display: 'flex', flexDirection: 'column', 
          maxHeight: mob ? '95vh' : '90vh',
          marginTop: mob ? 'auto' : 0
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', height: '100%', overflowY: 'auto' }}>
          {/* Left: Image & Dynamic Finish Switcher */}
          <div style={{ flex: '1 1 500px', background: `var(--bg-secondary)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mob ? 20 : 40, minHeight: mob ? 300 : 400 }}>
            <DynamicImage 
              asMotion
              initial={{ opacity: 0.8, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              src={product.finishImages?.[selectedColor] || product.img} 
              alt={product.name} 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', width: '100%', height: '100%' }} 
              iconSize={48}
            />
            <button onClick={onClose} style={{ position: 'absolute', top: 24, left: 24, background: '#fff', border: 'none', padding: 12, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <X size={20} />
            </button>

            {/* Selection HUD */}
            <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, display: 'flex', gap: 8, justifyContent: 'center' }}>
               <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.9)', borderRadius: 100, fontSize: 10, fontWeight: 800, backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: DARK_TEXT }}>
                 {selectedColor.toUpperCase()}
               </div>
               <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.9)', borderRadius: 100, fontSize: 10, fontWeight: 800, backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: ac }}>
                 {selectedGlass.toUpperCase()}
               </div>
            </div>
          </div>
          
          {/* Right: Info & Material Switcher */}
          <div style={{ flex: '1 1 400px', padding: mob ? '32px 24px 100px' : '40px 48px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'inline-block', alignSelf: 'flex-start', padding: '4px 12px', background: `${ac}15`, color: ac, fontSize: 10, fontWeight: 900, borderRadius: 100, marginBottom: 20 }}>
              {(Array.isArray(product.cat) ? product.cat[0] : product.cat).toUpperCase()}
            </div>
            <h2 style={{ fontSize: mob ? 24 : 32, fontWeight: 800, margin: '0 0 16px', color: DARK_TEXT }}>{product.name}</h2>
            
            {/* Dynamic Selectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
               {product.colors && (
                 <div>
                    <h4 style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', marginBottom: 12 }}>Finish Selection</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                       {product.colors.slice(0, 8).map(c => (
                         <button 
                           key={c} 
                           onClick={() => setSelectedColor(c)}
                           style={{ 
                             padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer',
                             background: selectedColor === c ? DARK_TEXT : '#F5F5F5',
                             color: selectedColor === c ? '#fff' : DARK_TEXT,
                             transition: 'all 0.2s'
                           }}
                         >
                           {c}
                         </button>
                       ))}
                    </div>
                 </div>
               )}

               {product.options && (
                 <div>
                    <h4 style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', marginBottom: 12 }}>Structural Glass Configuration</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                       {product.options.slice(0, 4).map(o => (
                         <button 
                           key={o} 
                           onClick={() => setSelectedGlass(o)}
                           style={{ 
                             padding: '10px 16px', borderRadius: 12, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                             background: selectedGlass === o ? `${ac}15` : '#F9F9F9',
                             color: selectedGlass === o ? ac : 'rgba(0,0,0,0.5)',
                             border: selectedGlass === o ? `1px solid ${ac}` : '1px solid transparent'
                           }}
                         >
                           {o}
                         </button>
                       ))}
                    </div>
                 </div>
               )}
            </div>

            {product.desc && (
              <div style={{ marginBottom: 32 }}>
                <h4 style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', margin: '0 0 12px' }}>Product Overview</h4>
                <div style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '20px', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(0,0,0,0.03)', 
                  fontSize: 13.5, 
                  color: 'rgba(24, 14, 6, 0.75)', 
                  lineHeight: 1.7, 
                  whiteSpace: 'pre-wrap' 
                }}>
                  {product.desc}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
              <h4 style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', margin: 0 }}>Specifications</h4>
              {specEntries.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {specEntries.map(([k, v]) => (
                    <div key={k}>
                      <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', margin: '0 0 4px', textTransform: 'capitalize' }}>{k}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{v}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Standard Westline specifications apply.</p>
              )}
            </div>

            <div style={{ position: mob ? 'fixed' : 'static', bottom: 0, left: 0, right: 0, padding: mob ? 20 : 0, background: mob ? '#fff' : 'transparent', borderTop: mob ? '1px solid #eee' : 'none' }}>
              <button 
                onClick={() => { 
                  if (onClose) onClose(); 
                  navigate(`/?page=contact&subject=Quote Request: ${product.name} (${selectedColor}, ${selectedGlass})`);
                }}
                style={{ width: '100%', padding: '18px', background: DARK_TEXT, color: '#fff', borderRadius: 16, border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
              >
                Send To Project Intake
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};




// ── Buy Now Modal ────────────────────────────────────────────────────────────
/**
 * OrderModal — Two-step product order flow:
 * Step 1: Quantity + contact info (works for guests AND logged-in clients)
 * Step 2: Payment via Paystack (if live keys configured) OR order enquiry submitted to admin
 *
 * No invoice is created until the user actually submits. Guest-friendly.
 */
function BuyNowModal({ product, user, brand, onClose }) {
  const ac = brand?.color || 'var(--accent-secondary)';
  const retailPrice = parseFloat(String(product.retailPrice || '0').replace(/[^0-9.]/g, '')) || 0;

  const [step, setStep]         = useState(1); // 1=details, 2=payment
  const [qty, setQty]           = useState(1);
  const [name, setName]         = useState(user?.name || '');
  const [phone, setPhone]       = useState(user?.phone ? `+${user.phone}` : '');
  const [address, setAddress]   = useState('');
  const [notes, setNotes]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);
  const [invoiceId, setInvoiceId]   = useState(null);
  const [err, setErr]           = useState('');

  const total   = retailPrice * qty;
  const email   = user?.proxyEmail || (user?.phone ? `${user.phone}@clients.westlinefuture.com` : 'order@westlinefuture.com');
  const { brand: ctxBrand } = useContext(AppContext);
  const gw = ctxBrand?.gatewaySettings || {};
  const paystackKey = gw.paystackPublicKey || '';
  const paystackActive = !!(gw.enablePaystack !== false && paystackKey);
  const hubtelActive = !!(gw.enableHubtel && gw.hubtelClientId && gw.hubtelClientSecret && gw.hubtelMerchantId);
  const paymentAvailable = paystackActive || hubtelActive;

  const handleNext = () => {
    if (!name.trim()) { setErr('Please enter your name.'); return; }
    if (!phone.trim()) { setErr('Please enter your phone number.'); return; }
    setErr('');
    setStep(2);
  };

  // Create order enquiry (no payment) — flows to admin Inquiry Queue
  const submitEnquiry = async () => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'emails'), {
        id: `ORD-${Date.now()}`,
        fromName: name.trim(),
        fromPhone: phone.trim(),
        fromEmail: email,
        subject: `Product Order — ${product.name} x${qty}`,
        status: 'pending',
        type: 'Product Order',
        productId: product.id || '',
        productName: product.name,
        quantity: qty,
        unitPrice: retailPrice,
        totalAmount: total,
        deliveryAddress: address.trim(),
        notes: notes.trim(),
        clientId: user?.id || user?.phone || '',
        sentAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (e) {
      setErr('Failed to submit order. Please try WhatsApp instead.');
    }
    setSubmitting(false);
  };

  // Create invoice then open payment gateway
  const preparePayment = async () => {
    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, 'invoices'), {
        title:       `Product Order — ${product.name} x${qty}`,
        amount:      total,
        type:        'Product',
        status:      'Pending',
        clientId:    user?.id || user?.phone || '',
        clientName:  name.trim(),
        clientPhone: phone.trim(),
        clientEmail: email,
        productId:   product.id || '',
        productName: product.name,
        quantity:    qty,
        unitPrice:   retailPrice,
        deliveryAddress: address.trim(),
        notes:       notes.trim(),
        autoGenerated: true,
        createdAt:   serverTimestamp(),
      });
      setInvoiceId(ref.id);
    } catch (e) {
      setErr('Could not prepare checkout. Please try the WhatsApp option.');
    }
    setSubmitting(false);
  };

  // As soon as we enter step 2 and payment is available, create the invoice
  useEffect(() => {
    if (step === 2 && paymentAvailable && !invoiceId && !submitting) {
      preparePayment();
    }
  }, [step]);

  const wa = (brand?.whatsapp || '233247319778').replace(/\D/g, '');
  const waMsg = encodeURIComponent(`Hi Westline Future,\n\nI'd like to order:\n*${product.name}* × ${qty}\nTotal: GH₵ ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\nName: ${name}\nPhone: ${phone}\nAddress: ${address || 'TBD'}\n${notes ? `Notes: ${notes}` : ''}`);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()}
          style={{ background: '#fff', borderRadius: 28, width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: 3 }}>
                {done ? 'Order Received' : step === 1 ? 'Place Order' : 'Confirm & Pay'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--accent-secondary)', lineHeight: 1.2 }}>{product.name}</div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg-secondary)', border: 'none', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>

          <div style={{ padding: 24 }}>
            {/* Product summary */}
            <div style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--bg-secondary)', borderRadius: 14, marginBottom: 20 }}>
              {product.img && <img src={product.img} alt={product.name} loading="lazy" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'contain', background: '#fff', border: '1px solid #eee', flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-secondary)' }}>{product.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{product.cat || product.tagline}</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: ac, marginTop: 5 }}>GH₵ {retailPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} each</div>
              </div>
            </div>

            {done ? (
              /* ── SUCCESS ── */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle2 size={28} color="#16A34A" />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: 8 }}>Order Received!</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
                  Thanks {name.split(' ')[0]}! We'll call you on <strong>{phone}</strong> within 24 hours to confirm your order and arrange delivery.
                </div>
                <button onClick={onClose} style={{ padding: '12px 32px', background: ac, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Done</button>
              </div>

            ) : step === 1 ? (
              /* ── STEP 1: DETAILS ── */
              <>
                {/* Qty */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)' }}>Quantity</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '2px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 40, height: 40, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={15} /></button>
                    <div style={{ width: 40, textAlign: 'center', fontSize: 16, fontWeight: 900 }}>{qty}</div>
                    <button onClick={() => setQty(q => q + 1)} style={{ width: 40, height: 40, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={15} /></button>
                  </div>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: `${ac}10`, marginBottom: 20, border: `1px solid ${ac}30` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Total ({qty} unit{qty !== 1 ? 's' : ''})</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: ac }}>GH₵ {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                {/* Contact fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Name *</div>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone Number *</div>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+233 24 731 9778" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Delivery Address</div>
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Area, city (e.g. East Legon, Accra)" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes (optional)</div>
                    <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Colour, size, or delivery instructions…" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FEE2E2', color: '#DC2626', fontSize: 12, marginBottom: 14 }}>{err}</div>}

                <button onClick={handleNext} style={{ width: '100%', padding: '14px', background: ac, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  Continue <ArrowRight size={16} />
                </button>
              </>

            ) : (
              /* ── STEP 2: PAYMENT OR ENQUIRY ── */
              <>
                <div style={{ padding: '12px 16px', borderRadius: 12, background: `${ac}10`, marginBottom: 20, border: `1px solid ${ac}30`, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{product.name} × {qty}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: ac }}>GH₵ {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                {submitting && !invoiceId ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Preparing checkout…</div>
                ) : paymentAvailable && invoiceId ? (
                  <UnifiedPaymentGateway
                    label={`Pay for ${product.name} × ${qty}`}
                    amountGHS={total}
                    description={`${product.name} x${qty}`}
                    email={email}
                    invoiceId={invoiceId}
                    paymentType="product"
                    onSuccess={() => setDone(true)}
                  />
                ) : null}

                {/* Always show WhatsApp + manual order as alternatives */}
                <div style={{ marginTop: paymentAvailable ? 16 : 0 }}>
                  {!paymentAvailable && (
                    <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#FFF8F0', border: '1px solid #FED7AA', fontSize: 12, color: '#92400E' }}>
                      Online payment is being configured. Please order via WhatsApp or submit your order below — we'll call you to confirm.
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* WhatsApp order */}
                    <a
                      href={`https://wa.me/${wa}?text=${waMsg}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px', borderRadius: 14, background: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}
                    >
                      <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Order via WhatsApp
                    </a>

                    {/* Submit enquiry to admin */}
                    <button
                      onClick={submitEnquiry}
                      disabled={submitting}
                      style={{ padding: '13px', borderRadius: 14, background: submitting ? 'var(--bg-secondary)' : 'var(--accent-secondary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: submitting ? 'default' : 'pointer' }}
                    >
                      {submitting ? 'Submitting…' : 'Submit Order Request'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 10 }}>We'll call {phone} within 24 hours to confirm.</div>
                </div>

                {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FEE2E2', color: '#DC2626', fontSize: 12, marginTop: 12 }}>{err}</div>}

                <button onClick={() => { setStep(1); setInvoiceId(null); }} style={{ width: '100%', marginTop: 14, padding: '10px', background: 'none', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  ← Back
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ProductsHub({ brand, user, onPortal, setPage, content }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Language: re-apply translation whenever lang changes ──────────────────
  const { lang } = useContext(AppContext);

  // Basic States & Layout Variables
  const [activeGroup, setActiveGroup] = useState('aluminum');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [buyProduct, setBuyProduct] = useState(null);
  const [catalogData, setCatalogData] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(true);

  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand?.color || AC;
  const waNumber = brand?.whatsapp || '233247319778';

  // Persistent Favorites State (must be initialized before favoriteProducts useMemo)
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('westline_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [showFavoritesDrawer, setShowFavoritesDrawer] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientMessage, setClientMessage] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);

  const [comparing, setComparing] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  // Catalog Fetching Effect (Scalable Real-time Database)
  const [dbProducts, setDbProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  
  useEffect(() => {
    if (!db) { setLoading(false); return; }
    
    let isMounted = true;
    
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      if (isMounted) setDbProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      if (isMounted) setDbCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fallback: load demo data initially to populate UI until Firebase responds
    import('../catalog.jsx').then(m => {
      if (isMounted && dbProducts.length === 0) {
        setCatalogData({ products: m.GLASS_CATALOG_DATA, categories: m.GLASS_CATALOG_CATEGORIES });
      }
    }).catch(() => setLoading(false));

    return () => {
      isMounted = false;
      unsubProducts();
      unsubCategories();
    };
  }, []);

  const products = useMemo(() => {
    return dbProducts.length > 0 ? dbProducts : (catalogData.products || []);
  }, [dbProducts, catalogData.products]);

  const categories = useMemo(() => {
    return dbCategories.length > 0 ? dbCategories : (catalogData.categories || []);
  }, [dbCategories, catalogData.categories]);

  // ── Re-translate whenever language changes OR products finish loading ──────
  useEffect(() => {
    if (!lang) return;
    const apply = () => translatePublicDom(lang === 'zh' ? 'zh' : 'en');
    const raf = requestAnimationFrame(apply);
    const t = setTimeout(apply, 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [lang, products, loading]);

  // Favorites logic (now safe since favorites, products are fully initialized)
  const favoriteProducts = useMemo(() => {
    return products.filter(p => favorites.includes(p.id));
  }, [favorites, products]);

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('westline_favorites', JSON.stringify(next));
      return next;
    });
  };

  const compareProducts = useMemo(() => {
    return products.filter(p => comparing.includes(p.id));
  }, [comparing, products]);

  const groupCategories = useMemo(() => {
    return categories.filter(c => c.groupId === activeGroup);
  }, [categories, activeGroup]);

  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(p => {
      if (!p) return false;
      const pCats = Array.isArray(p.cat) ? p.cat : [p.cat];
      const catObj = categories.find(c => pCats.includes(c.id));
      const groupId = catObj?.groupId || 'aluminum'; // Fallback to aluminum if category is missing/invalid
      const matchGroup = groupId === activeGroup;
      const matchCat = filter === 'All' || pCats.includes(filter) || !catObj; // Show uncategorized in 'All'
      const nameMatch = (p.name || '').toLowerCase().includes((search || '').toLowerCase());
      const descMatch = (p.description || p.desc || '').toLowerCase().includes((search || '').toLowerCase());
      return matchGroup && matchCat && (nameMatch || descMatch);
    });
  }, [activeGroup, filter, search, products, categories]);

  const toggleCompare = (id) => {
    setComparing(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(-3));
  };

  const handlePushLeadToAdmin = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      alert('Please enter your name and email to proceed.');
      return;
    }
    setSubmittingLead(true);
    try {
      const inquiryId = `CON-${Math.floor(1000 + Math.random() * 9000)}`;
      const emailPayload = {
        id: inquiryId,
        fromName: clientName.trim(),
        fromEmail: clientEmail.trim(),
        subject: `Material Procurement Inquiry: ${favoriteProducts.length} curated item(s)`,
        status: 'pending',
        type: 'Material Inquiry',
        createdAt: new Date().toISOString(),
        sentAt: new Date().toLocaleDateString(),
        details: {
          name: clientName.trim(),
          email: clientEmail.trim(),
          phone: clientPhone.trim(),
          notes: clientMessage.trim(),
          materials: favoriteProducts.map(p => ({
            id: p.id,
            name: p.name,
            category: Array.isArray(p.cat) ? p.cat[0] : p.cat,
            description: p.description || p.desc || '',
            img: p.img
          }))
        }
      };

      await setDoc(doc(db, 'emails', inquiryId), emailPayload);
      alert('Success! Your curated favorites have been pushed directly to the Westline Future Admin Portal.');
      setFavorites([]);
      localStorage.removeItem('westline_favorites');
      setShowFavoritesDrawer(false);
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientMessage('');
    } catch (err) {
      console.error('Error submitting favorites:', err);
      alert('Could not sync with the admin database. Try sharing via WhatsApp instead!');
    } finally {
      setSubmittingLead(false);
    }
  };

  const handleShareToWhatsApp = () => {
    const origin = window.location.origin;
    let messageText = `*Westline Future - Curated Material Favorites*\n\n`;
    
    if (clientName.trim()) {
      messageText += `*Client Details:*\n`;
      messageText += `- Name: ${clientName.trim()}\n`;
      if (clientPhone.trim()) messageText += `- Phone: ${clientPhone.trim()}\n`;
      if (clientEmail.trim()) messageText += `- Email: ${clientEmail.trim()}\n`;
      messageText += `\n`;
    }
    
    messageText += `*Selected Materials for Sourcing & Procurement:*\n\n`;
    
    favoriteProducts.forEach((p, idx) => {
      const cat = Array.isArray(p.cat) ? p.cat[0] : p.cat;
      const absoluteImg = p.img.startsWith('http') ? p.img : `${origin}${p.img}`;
      const desc = p.description || p.desc || '';
      const cleanDesc = desc.length > 120 ? desc.substring(0, 120) + '...' : desc;
      
      messageText += `${idx + 1}. *${p.name}*\n`;
      messageText += `   _Category:_ ${cat.toUpperCase()}\n`;
      if (cleanDesc) messageText += `   _Description:_ ${cleanDesc}\n`;
      messageText += `   _Image Link:_ ${absoluteImg}\n\n`;
    });
    
    if (clientMessage.trim()) {
      messageText += `*Client Notes:*\n${clientMessage.trim()}\n\n`;
    }
    
    messageText += `Please provide a professional consultation and quotation for these selected items.`;
    
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
  };

  const GROUPS = [
    { id: 'aluminum',   Icon: AppWindow,  label: 'Aluminium & Glass' },
    { id: 'washroom',   Icon: ShowerHead, label: 'Bathrooms' },
    { id: 'kitchen',    Icon: ChefHat,    label: 'Kitchens' },
    { id: 'wardrobe',   Icon: Shirt,      label: 'Wardrobes' },
    { id: 'tiles',      Icon: LayoutGrid, label: 'Tiles & Flooring' },
    { id: 'doors',      Icon: DoorOpen,   label: 'Doors' },
    { id: 'interior',   Icon: Armchair,   label: 'Interior' },
    { id: 'electrical', Icon: Zap,        label: 'Electrical' },
    { id: 'plumbing',   Icon: Droplets,   label: 'Plumbing' },
  ];

  useEffect(() => {
    if (setSearchParams) {
      try {
        setSearchParams({ group: activeGroup, cat: filter });
      } catch (e) { console.error(e); }
    }
  }, [activeGroup, filter, setSearchParams]);

  return (
    <div style={{ minHeight: '100vh', background: LIGHT_BG, color: DARK_TEXT, fontFamily: 'var(--font-p)', position: 'relative' }}>
      <PubNav brand={brand} setPage={setPage} activePage="products" onPortal={onPortal} user={user} menuOpen={menuOpen} setMenuOpen={setMenuOpen} navigate={navigate} />

      <main style={{ padding: mob ? '100px 20px 100px' : '160px 5vw 100px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: mob ? 32 : 48 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: ac }}>SOURCE • APPROVE • INSTALL</span>
          <h1 style={{ fontSize: mob ? 32 : 56, fontWeight: 800, letterSpacing: '-0.04em', margin: '12px 0 16px', lineHeight: 1.05 }}>
            Products & <span style={{ color: ac }}>Materials.</span>
          </h1>
          <p style={{ color: 'rgba(24, 14, 6, 0.5)', fontSize: mob ? 14 : 17, maxWidth: 700, lineHeight: 1.7 }}>
            Save materials, compare specifications, and send a curated sourcing brief into Westline's admin workflow for pricing, procurement, logistics, and installation planning.
          </p>
        </div>

        {/* Top CTA strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '16px 24px', background: `var(--accent-secondary)`, borderRadius: 16, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Building a full package?</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Save items as favorites, then push the curated list to admin for a structured sourcing response.</div>
          </div>
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Hi Westline Future, I need a custom material sourced. Can you help?')}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#25D366', color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            <WA_ICON /> Custom Order via WhatsApp
          </a>
        </div>

        {loading && (
          <div style={{ padding: '100px 0', textAlign: 'center' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>
              <Zap size={40} color={ac} />
            </motion.div>
            <p className="lxf" style={{ marginTop: 20, color: `var(--text-secondary)` }}>Syncing Global Catalog...</p>
          </div>
        )}

        {!loading && (
          <>

        {/* Group Selector */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 12, overflowX: 'auto' }} className="no-scrollbar">
          {GROUPS.map(g => (
            <button
              key={g.id}
              onClick={() => { setActiveGroup(g.id); setFilter('All'); }}
              style={{
                background: 'none', border: 'none', padding: '8px 14px', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, color: activeGroup === g.id ? ac : 'rgba(0,0,0,0.38)',
                position: 'relative', transition: 'all 0.3s', whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <g.Icon size={14} strokeWidth={activeGroup === g.id ? 2.25 : 1.75} />
              {g.label}
              {activeGroup === g.id && (
                <motion.div layoutId="g-line" style={{ position: 'absolute', bottom: -12, left: 0, right: 0, height: 2, background: ac, borderRadius: 2 }} />
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ marginBottom: mob ? 32 : 40, display: 'flex', flexDirection: mob ? 'column' : 'row', gap: 20 }}>

          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.3)' }} size={18} />
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search specifications..." 
              style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', background: '#fff', fontSize: 14 }} 
            />
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: mob ? 12 : 0, whiteSpace: 'nowrap' }} className="no-scrollbar">
            {['All', ...groupCategories.map(c => c.id)].map(c => (
              <button 
                key={String(c)} onClick={() => setFilter(String(c))}
                style={{ 
                  padding: '12px 20px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800,
                  background: filter === c ? DARK_TEXT : '#fff',
                  color: filter === c ? '#fff' : 'rgba(0,0,0,0.4)',
                  boxShadow: filter === c ? 'none' : '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'all 0.3s'
                }}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: mob ? 24 : 32 
        }}>
          {(filtered || []).length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '80px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: DARK_TEXT, marginBottom: 8 }}>No products in this category yet</div>
              <div style={{ fontSize: 14, color: `var(--text-secondary)`, marginBottom: 24 }}>We can source any material from China — contact us for a custom order.</div>
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Hi Westline Future, I\'m looking for a product you may not have listed. Can you help source it?')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: '#25D366', color: '#fff', borderRadius: 14, fontWeight: 800, fontSize: 14, textDecoration: 'none' }}
              >
                <WA_ICON /> Request Custom Order
              </a>
            </div>
          )}
          {(filtered || []).map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onClick={() => setSelectedProduct(p)}
              ac={ac}
              mob={mob}
              onCompare={toggleCompare}
              isComparing={comparing.includes(p.id)}
              waNumber={waNumber}
              onToggleFavorite={toggleFavorite}
              isFavorited={favorites.includes(p.id)}
              onBuy={() => setBuyProduct(p)}
            />
          ))}
        </div>
        </>
        )}
      </main>

      <Footer brand={brand} setPage={setPage} navigate={navigate} />

      {/* Comparison Tray */}
      <AnimatePresence>
        {comparing.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            style={{ 
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', 
              background: DARK_TEXT, padding: '12px 24px', borderRadius: 100, 
              display: 'flex', alignItems: 'center', gap: 24, zIndex: 5000,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
             <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ background: ac, color: '#fff', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>{comparing.length}</div>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items Selected</span>
             </div>
             <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }} />
             <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={() => setShowComparison(true)}
                  style={{ background: '#fff', color: DARK_TEXT, border: 'none', padding: '10px 20px', borderRadius: 100, fontSize: 11, fontWeight: 900, cursor: 'pointer' }}
                >
                   COMPARE NOW
                </button>
                <button 
                  onClick={() => setComparing([])}
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 100, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                >
                   CLEAR
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Modal */}
      <AnimatePresence>
        {showComparison && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 11000, background: '#fff', overflowY: 'auto', padding: mob ? '20px' : '60px 5vw' }}
          >
             <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
                   <h2 style={{ fontSize: 32, fontWeight: 800 }}>Technical Comparison</h2>
                   <button onClick={() => setShowComparison(false)} style={{ padding: 12, background: '#f5f5f5', border: 'none', borderRadius: '50%', cursor: 'pointer' }}><X /></button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${comparing.length}, 1fr)`, gap: 32 }}>
                   {compareProducts.map(p => (
                     <div key={p.id}>
                        <img src={p.img} style={{ width: '100%', height: 200, objectFit: 'contain', background: `var(--bg-secondary)`, borderRadius: 16, marginBottom: 24 }} />
                        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{p.name}</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                           <div>
                              <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: ac, marginBottom: 8 }}>Performance</div>
                              {Object.entries(p.performance || {}).map(([k,v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>
                                   <span style={{ color: 'rgba(0,0,0,0.4)', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                                   <span style={{ fontWeight: 700 }}>{v}</span>
                                </div>
                              ))}
                           </div>
                           <div>
                              <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: ac, marginBottom: 8 }}>Specs</div>
                              {Object.entries(p.specs || {}).map(([k,v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>
                                   <span style={{ color: 'rgba(0,0,0,0.4)', textTransform: 'capitalize' }}>{k}</span>
                                   <span style={{ fontWeight: 700 }}>{v}</span>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProduct && (
          <DetailModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            ac={ac} 
            navigate={navigate} 
            mob={mob}
          />
        )}
      </AnimatePresence>

      {/* Favorites Floating Pill */}
      <AnimatePresence>
        {favorites.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setShowFavoritesDrawer(true)}
            style={{ 
              position: 'fixed', bottom: comparing.length > 0 ? 96 : 32, right: 32, 
              background: `var(--accent-primary)`, padding: '16px 28px', borderRadius: 100, 
              display: 'flex', alignItems: 'center', gap: 12, zIndex: 4000, cursor: 'pointer',
              boxShadow: '0 20px 45px rgba(200, 143, 67, 0.4)', border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
             <Heart size={20} fill="var(--accent-secondary)" color="var(--accent-secondary)" />
             <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: `var(--accent-secondary)`, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {favorites.length} Saved Favorites
                </span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Favorites Drawer Panel */}
      <AnimatePresence>
        {showFavoritesDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFavoritesDrawer(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 12000,
                background: 'rgba(24, 14, 6, 0.6)', backdropFilter: 'blur(8px)'
              }}
            />
            
            {/* Side sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: '100%', maxWidth: 500, background: '#ffffff',
                boxShadow: '-20px 0 60px rgba(0,0,0,0.15)', zIndex: 12001,
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}
            >
              {/* Drawer Header */}
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: `var(--accent-secondary)`, margin: 0 }}>Favorites Hub</h3>
                  <p style={{ fontSize: 12, color: 'rgba(24, 14, 6, 0.5)', margin: '4px 0 0' }}>Review and source your curated materials</p>
                </div>
                <button
                  onClick={() => setShowFavoritesDrawer(false)}
                  style={{
                    padding: 8, background: '#f5f5f5', border: 'none',
                    borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}
                >
                  <X size={20} color="var(--accent-secondary)" />
                </button>
              </div>

              {/* Drawer Body - Items & Sourcing Form */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: `var(--accent-primary)`, margin: '0 0 8px' }}>Your Selected Items</h4>
                  {favoriteProducts.map(p => (
                    <div key={p.id} style={{ display: 'flex', gap: 16, background: `var(--bg-secondary)`, padding: 12, borderRadius: 16, position: 'relative' }}>
                      <img src={p.img} alt={p.name} style={{ width: 64, height: 64, objectFit: 'contain', background: '#fff', borderRadius: 10 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: `var(--accent-secondary)`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: `var(--accent-primary)`, fontWeight: 700, marginTop: 2 }}>
                          {String(Array.isArray(p.cat) ? p.cat[0] : p.cat).toUpperCase()}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(24, 14, 6, 0.5)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.description || p.desc || ''}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFavorite(p.id)}
                        style={{
                          position: 'absolute', top: 12, right: 12,
                          background: 'none', border: 'none', cursor: 'pointer', padding: 4
                        }}
                        title="Remove"
                      >
                        <X size={16} color="rgba(0,0,0,0.3)" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Lead Generation Form */}
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: `var(--accent-primary)`, marginBottom: 20 }}>Sourcing Information</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'rgba(24, 14, 6, 0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Your Name</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        placeholder="John Doe"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: `var(--bg-secondary)`, fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'rgba(24, 14, 6, 0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Email Address</label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={e => setClientEmail(e.target.value)}
                        placeholder="john@example.com"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: `var(--bg-secondary)`, fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'rgba(24, 14, 6, 0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Phone Number</label>
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={e => setClientPhone(e.target.value)}
                        placeholder="+233 59 845 5012"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: `var(--bg-secondary)`, fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'rgba(24, 14, 6, 0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Additional Sourcing Notes (Optional)</label>
                      <textarea
                        value={clientMessage}
                        onChange={e => setClientMessage(e.target.value)}
                        placeholder="Describe specific dimensions, quantities, finishes, or customization requirements..."
                        rows={3}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: `var(--bg-secondary)`, fontSize: 14, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div style={{ padding: '24px 32px', borderTop: '1px solid #f0f0f0', background: `var(--bg-secondary)`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={handlePushLeadToAdmin}
                  disabled={submittingLead}
                  style={{
                    width: '100%', padding: '18px', background: `var(--accent-secondary)`, color: '#fff',
                    borderRadius: 16, border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 10px 25px rgba(24, 14, 6, 0.15)', transition: 'all 0.2s'
                  }}
                >
                  {submittingLead ? 'Pushed Lead to Admin...' : 'Push Curated List to Admin'}
                </button>
                
                <button
                  onClick={handleShareToWhatsApp}
                  style={{
                    width: '100%', padding: '18px', background: '#25D366', color: '#fff',
                    borderRadius: 16, border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 10px 25px rgba(37, 211, 102, 0.15)', transition: 'all 0.2s'
                  }}
                >
                  <WA_ICON /> Share Favorites via WhatsApp
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Buy Now Modal */}
      <AnimatePresence>
        {buyProduct && (
          <BuyNowModal
            product={buyProduct}
            user={user}
            brand={brand}
            onClose={() => setBuyProduct(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
