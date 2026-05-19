import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWindowWidth, isMob, DARK_TEXT, AC } from './PublicSite';
import { sanitizeText } from '../lib/sanitize';
import { AlertCircle } from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ContactPage({ brand, submitContact }) {
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get('subject') || '';
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand.color || AC;
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', subject: initialSubject, message: '' });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'Required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!EMAIL_RE.test(formData.email.trim())) errs.email = 'Enter a valid email address';
    if (!formData.message.trim()) errs.message = 'Message is required';
    if (formData.message.trim().length > 2000) errs.message = 'Message too long (max 2000 characters)';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await submitContact({
        firstName: sanitizeText(formData.firstName),
        lastName: sanitizeText(formData.lastName),
        email: formData.email.trim().toLowerCase(),
        subject: sanitizeText(formData.subject),
        message: sanitizeText(formData.message),
      });
      setFormData({ firstName: '', lastName: '', email: '', subject: '', message: '' });
      setErrors({});
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 6000);
    } catch {
      setErrors({ submit: 'Failed to send message. Please try again.' });
    }
  };

  const inpStyle = (field) => ({
    padding: 16, borderRadius: 12,
    border: `1px solid ${errors[field] ? '#EF4444' : '#eee'}`,
    outline: 'none', width: '100%', fontSize: 14,
    background: errors[field] ? '#FEF2F2' : '#fff',
    transition: 'border-color 0.2s',
  });

  const FieldError = ({ field }) => errors[field] ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#DC2626', fontSize: 12 }}>
      <AlertCircle size={12} /> {errors[field]}
    </div>
  ) : null;

  return (
    <div style={{ paddingTop: mob ? 80 : 120 }}>
      <section style={{ padding: '100px 5vw', background: '#F9F7F4', color: DARK_TEXT }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <h1 style={{ fontSize: mob ? 48 : 96, fontWeight: 800, letterSpacing: '-0.04em' }}>Let's <em style={{ fontStyle: 'italic', color: ac, fontWeight: 400 }}>Collaborate</em>.</h1>
          <p style={{ fontSize: 20, color: 'rgba(26,20,16,0.6)' }}>Speak to a technical lead about your finishing requirements.</p>
        </div>
      </section>
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: mob ? '1fr' : '1.5fr 1fr', gap: mob ? 40 : 64 }}>
          <div style={{ background: '#fff', padding: mob ? '32px 20px' : 48, borderRadius: 24, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 20px 50px rgba(0,0,0,0.03)' }}>
            {submitted && (
              <div style={{ padding: '16px 20px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, color: '#16A34A', fontSize: 13, marginBottom: 24, fontWeight: 600 }}>
                Message sent. We'll be in touch within 24 hours.
              </div>
            )}
            {errors.submit && (
              <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 12, color: '#DC2626', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} /> {errors.submit}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <input
                    placeholder="First Name *"
                    style={inpStyle('firstName')}
                    value={formData.firstName}
                    maxLength={80}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    onBlur={() => { if (!formData.firstName.trim()) setErrors(p => ({ ...p, firstName: 'Required' })); else setErrors(p => { const n = { ...p }; delete n.firstName; return n; }); }}
                  />
                  <FieldError field="firstName" />
                </div>
                <div>
                  <input
                    placeholder="Last Name"
                    style={inpStyle('lastName')}
                    value={formData.lastName}
                    maxLength={80}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <input
                  placeholder="Email Address *"
                  type="email"
                  style={inpStyle('email')}
                  value={formData.email}
                  maxLength={254}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => {
                    if (!formData.email.trim()) setErrors(p => ({ ...p, email: 'Email is required' }));
                    else if (!EMAIL_RE.test(formData.email.trim())) setErrors(p => ({ ...p, email: 'Enter a valid email address' }));
                    else setErrors(p => { const n = { ...p }; delete n.email; return n; });
                  }}
                />
                <FieldError field="email" />
              </div>
              <input
                placeholder="Subject (Optional)"
                style={inpStyle('subject')}
                value={formData.subject}
                maxLength={200}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
              />
              <div>
                <textarea
                  rows={5}
                  placeholder="Project Description *"
                  style={{ ...inpStyle('message'), resize: 'none' }}
                  value={formData.message}
                  maxLength={2000}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <FieldError field="message" />
                  <span style={{ fontSize: 11, color: '#B5AFA9', marginLeft: 'auto' }}>{formData.message.length}/2000</span>
                </div>
              </div>
              <button
                onClick={handleSubmit}
                style={{ padding: 20, background: DARK_TEXT, color: '#fff', borderRadius: 12, border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}
              >
                Send Message
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 800, color: ac, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Direct Contact</h4>
              <p style={{ fontSize: 24, fontWeight: 800, margin: 0, color: DARK_TEXT }}>{brand.phone}</p>
              <p style={{ color: 'rgba(26,20,16,0.5)', margin: '8px 0 0' }}>{brand.email}</p>
            </div>
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 800, color: ac, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Regional Hubs</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {['Accra', 'Kumasi', 'Takoradi', 'Koforidua'].map(c => (
                  <span key={c} style={{ padding: '6px 12px', background: '#F5F5F5', borderRadius: 6, fontSize: 11, fontWeight: 700, color: DARK_TEXT }}>{c.toUpperCase()}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
