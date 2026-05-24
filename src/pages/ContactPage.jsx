import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWindowWidth, isMob, DARK_TEXT, AC } from './PublicSite';
import { sanitizeText } from '../lib/sanitize';
import { AlertCircle, CheckCircle, MapPin, Clock, Phone, Mail, ArrowRight } from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s\-()]{6,20}$/;

const SERVICES = [
  'Glass Facades & Windows',
  'Shower Enclosures',
  'Glass Partitions & Feature Walls',
  'Kitchen Glass & Cabinet Fronts',
  'Wardrobes & Interior Joinery',
  'Staircases & Balustrades',
  'Commercial Glazing',
  'Other / Not Sure Yet',
];

const BUDGETS = [
  'Below GHS 10,000',
  'GHS 10,000 – 30,000',
  'GHS 30,000 – 80,000',
  'GHS 80,000 – 200,000',
  'Above GHS 200,000',
  'Prefer not to say',
];

export default function ContactPage({ brand, submitContact }) {
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get('subject') || '';
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand?.color || AC;
  const wa = (brand?.whatsapp || '233598455012').replace(/\D/g, '');
  const phone = brand?.phone || '+233 59 845 5012';
  const email = brand?.email || 'admin@westlinefuture.com';
  const location = brand?.location || 'Spintex Road Industrial Area, Accra';

  const [form, setForm] = useState({
    firstName: '', lastName: '',
    phone: '', email: '',
    service: initialSubject || '',
    budget: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!PHONE_RE.test(form.phone.trim())) errs.phone = 'Enter a valid phone number';
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address';
    if (!form.message.trim()) errs.message = 'Tell us about your project';
    if (form.message.trim().length > 2000) errs.message = 'Message too long (max 2000 characters)';
    return errs;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await submitContact({
        firstName: sanitizeText(form.firstName),
        lastName: sanitizeText(form.lastName),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        subject: sanitizeText(form.service || 'General Enquiry'),
        message: sanitizeText(`[Service: ${form.service || 'N/A'}] [Budget: ${form.budget || 'N/A'}]\n\n${form.message}`),
      });
      setForm({ firstName: '', lastName: '', phone: '', email: '', service: '', budget: '', message: '' });
      setErrors({});
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 8000);
    } catch {
      setErrors({ submit: 'Failed to send. Please try WhatsApp or call us directly.' });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const name = form.firstName ? `Hi, I'm ${form.firstName}` : 'Hi';
    const svc = form.service ? ` I'm interested in ${form.service}.` : '';
    const msg = form.message ? ` ${form.message}` : ' I would like to discuss a project with you.';
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(name + svc + msg)}`, '_blank');
  };

  const inp = (field) => ({
    width: '100%',
    padding: '14px 16px',
    borderRadius: 10,
    border: `1.5px solid ${errors[field] ? '#EF4444' : focused === field ? ac : 'rgba(0,0,0,0.1)'}`,
    outline: 'none',
    fontSize: 14,
    fontFamily: 'inherit',
    color: DARK_TEXT,
    background: errors[field] ? '#FEF2F2' : '#FAFAF9',
    transition: 'border-color 0.18s',
    boxSizing: 'border-box',
  });

  const Err = ({ field }) => errors[field]
    ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#DC2626', fontSize: 11, fontWeight: 600 }}>
        <AlertCircle size={11} />{errors[field]}
      </div>
    : null;

  return (
    <div style={{ background: '#FAFAF8', fontFamily: 'Inter, Satoshi, sans-serif' }}>

      {/* ── DARK HERO ── */}
      <div style={{
        background: '#0A0806',
        paddingTop: mob ? 72 : 100,
        paddingBottom: mob ? 48 : 64,
        paddingLeft: '5vw',
        paddingRight: '5vw',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: ac, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 20 }}>
            Get in Touch
          </div>
          <h1 style={{
            fontSize: mob ? 'clamp(36px, 10vw, 56px)' : 'clamp(48px, 5vw, 80px)',
            fontWeight: 800, color: '#fff',
            letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 20px',
          }}>
            Let's build something<br />
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>exceptional together.</em>
          </h1>
          <p style={{ fontSize: mob ? 15 : 18, color: 'rgba(255,255,255,0.45)', maxWidth: 560, lineHeight: 1.7, margin: 0 }}>
            Describe your project and a technical specialist will respond within 24 hours — or reach us instantly on WhatsApp.
          </p>

          {/* Quick contact strip */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 36,
          }}>
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent('Hi Westline Future! I\'d like to discuss a project.')}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '13px 24px', borderRadius: 100,
                background: '#25D366', color: '#fff',
                fontWeight: 800, fontSize: 13, textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}
            >
              <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Message on WhatsApp
            </a>
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '13px 24px', borderRadius: 100,
                background: 'rgba(255,255,255,0.08)', color: '#fff',
                fontWeight: 700, fontSize: 13, textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
                letterSpacing: '-0.01em',
              }}
            >
              <Phone size={14} /> {phone}
            </a>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ padding: mob ? '48px 24px 80px' : '72px 5vw 100px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: mob ? '1fr' : '1.4fr 1fr',
          gap: mob ? 48 : 64,
          alignItems: 'start',
        }}>

          {/* ── FORM ── */}
          <div>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: mob ? 22 : 26, fontWeight: 800, color: DARK_TEXT, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
                Project Enquiry
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(17,24,39,0.5)', margin: 0 }}>
                Fill in the details and we'll get back to you with a personalised quote.
              </p>
            </div>

            {/* Success banner */}
            {submitted && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '16px 20px', marginBottom: 28,
                background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12,
                color: '#15803D',
              }}>
                <CheckCircle size={18} style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Message received!</div>
                  <div style={{ fontSize: 13, marginTop: 2, opacity: 0.8 }}>
                    We'll follow up within 24 hours. For urgent projects, WhatsApp us directly.
                  </div>
                </div>
              </div>
            )}

            {errors.submit && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 18px', marginBottom: 24,
                background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 12,
                color: '#DC2626', fontSize: 13,
              }}>
                <AlertCircle size={14} /> {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Name row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>First Name *</label>
                    <input
                      value={form.firstName} onChange={set('firstName')} maxLength={80}
                      style={inp('firstName')} placeholder="John"
                      onFocus={() => setFocused('firstName')} onBlur={() => setFocused(null)}
                    />
                    <Err field="firstName" />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name</label>
                    <input
                      value={form.lastName} onChange={set('lastName')} maxLength={80}
                      style={inp('lastName')} placeholder="Mensah"
                      onFocus={() => setFocused('lastName')} onBlur={() => setFocused(null)}
                    />
                  </div>
                </div>

                {/* Phone + Email row */}
                <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Phone / WhatsApp *</label>
                    <input
                      value={form.phone} onChange={set('phone')} maxLength={25}
                      style={inp('phone')} placeholder="+233 59 845 5012"
                      type="tel"
                      onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                    />
                    <Err field="phone" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span></label>
                    <input
                      value={form.email} onChange={set('email')} maxLength={254}
                      style={inp('email')} placeholder="john@example.com"
                      type="email"
                      onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                    />
                    <Err field="email" />
                  </div>
                </div>

                {/* Service + Budget row */}
                <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Service Interested In</label>
                    <select
                      value={form.service} onChange={set('service')}
                      style={{ ...inp('service'), color: form.service ? DARK_TEXT : 'rgba(17,24,39,0.4)', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231A1410' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}
                      onFocus={() => setFocused('service')} onBlur={() => setFocused(null)}
                    >
                      <option value="">Select a service…</option>
                      {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Approximate Budget</label>
                    <select
                      value={form.budget} onChange={set('budget')}
                      style={{ ...inp('budget'), color: form.budget ? DARK_TEXT : 'rgba(17,24,39,0.4)', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231A1410' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}
                      onFocus={() => setFocused('budget')} onBlur={() => setFocused(null)}
                    >
                      <option value="">Select budget range…</option>
                      {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label style={labelStyle}>Project Description *</label>
                  <textarea
                    rows={5} value={form.message} onChange={set('message')} maxLength={2000}
                    style={{ ...inp('message'), resize: 'none' }}
                    placeholder="Describe what you're looking to install — room type, dimensions if known, preferred finish, timeline…"
                    onFocus={() => setFocused('message')} onBlur={() => setFocused(null)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
                    <Err field="message" />
                    <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 'auto' }}>{form.message.length}/2000</span>
                  </div>
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1, minWidth: 180,
                      padding: '16px 28px',
                      background: loading ? 'rgba(17,24,39,0.5)' : DARK_TEXT,
                      color: '#fff', border: 'none', borderRadius: 12,
                      fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontFamily: 'inherit', transition: 'opacity 0.2s',
                    }}
                  >
                    {loading ? 'Sending…' : <><span>Send Enquiry</span><ArrowRight size={15} /></>}
                  </button>
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    style={{
                      flex: 1, minWidth: 180,
                      padding: '16px 28px',
                      background: '#25D366', color: '#fff',
                      border: 'none', borderRadius: 12,
                      fontWeight: 800, fontSize: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontFamily: 'inherit',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Send via WhatsApp
                  </button>
                </div>

                <p style={{ fontSize: 11, color: 'rgba(17,24,39,0.35)', margin: 0, textAlign: 'center' }}>
                  Your details are used only to respond to this enquiry.
                </p>
              </div>
            </form>
          </div>

          {/* ── INFO PANEL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Contact card */}
            <div style={cardStyle}>
              <div style={cardHeadStyle(ac)}>Direct Contact</div>
              <InfoRow icon={<Phone size={15} />} href={`tel:${phone.replace(/\s/g,'')}`}>
                <span style={{ fontWeight: 700, fontSize: 16, color: DARK_TEXT }}>{phone}</span>
                <span style={{ fontSize: 12, color: 'rgba(17,24,39,0.45)', marginTop: 2 }}>Calls & SMS</span>
              </InfoRow>
              <InfoRow icon={<svg viewBox="0 0 24 24" width={15} height={15} fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>} href={`https://wa.me/${wa}`} target>
                <span style={{ fontWeight: 700, fontSize: 15, color: DARK_TEXT }}>WhatsApp</span>
                <span style={{ fontSize: 12, color: 'rgba(17,24,39,0.45)', marginTop: 2 }}>Usually replies within 1 hour</span>
              </InfoRow>
              <InfoRow icon={<Mail size={15} />} href={`mailto:${email}`}>
                <span style={{ fontWeight: 600, fontSize: 14, color: DARK_TEXT }}>{email}</span>
              </InfoRow>
            </div>

            {/* Hours card */}
            <div style={cardStyle}>
              <div style={cardHeadStyle(ac)}>Opening Hours</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { day: 'Monday – Friday', hours: '8:00 AM – 6:00 PM' },
                  { day: 'Saturday', hours: '9:00 AM – 4:00 PM' },
                  { day: 'Sunday', hours: 'Closed' },
                ].map(({ day, hours }) => (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'rgba(17,24,39,0.6)', fontWeight: 500 }}>{day}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: hours === 'Closed' ? '#EF4444' : DARK_TEXT }}>{hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location card */}
            <div style={cardStyle}>
              <div style={cardHeadStyle(ac)}>Location</div>
              <InfoRow icon={<MapPin size={15} />}>
                <span style={{ fontWeight: 600, fontSize: 14, color: DARK_TEXT }}>{location}</span>
                <span style={{ fontSize: 12, color: 'rgba(17,24,39,0.45)', marginTop: 2 }}>Site visits by appointment</span>
              </InfoRow>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {['Accra', 'Kumasi', 'Takoradi', 'Koforidua'].map(c => (
                  <span key={c} style={{
                    padding: '5px 12px', borderRadius: 100,
                    background: 'rgba(35,31,120,0.1)', border: `1px solid ${ac}30`,
                    fontSize: 11, fontWeight: 700, color: ac, letterSpacing: '0.05em',
                  }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Response promise */}
            <div style={{
              padding: '20px 24px',
              background: `linear-gradient(135deg, ${ac}18 0%, ${ac}08 100%)`,
              border: `1px solid ${ac}25`,
              borderRadius: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: DARK_TEXT, marginBottom: 4 }}>Our Response Promise</div>
              <p style={{ fontSize: 12, color: 'rgba(17,24,39,0.55)', margin: 0, lineHeight: 1.7 }}>
                All enquiries receive a personal response within 24 hours — not an automated reply. For urgent projects, WhatsApp us directly for the fastest service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'rgba(17,24,39,0.5)', letterSpacing: '0.06em',
  textTransform: 'uppercase', marginBottom: 6,
};

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 16,
  padding: '22px 24px',
  display: 'flex', flexDirection: 'column', gap: 16,
};

const cardHeadStyle = (ac) => ({
  fontSize: 10, fontWeight: 800, color: ac,
  letterSpacing: '0.2em', textTransform: 'uppercase',
});

function InfoRow({ icon, href, target, children }) {
  const inner = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
  if (href) {
    return <a href={href} target={target ? '_blank' : undefined} rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>;
  }
  return inner;
}
