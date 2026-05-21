import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import AdminClients from './admin/AdminClients';
import AdminInstallations from './admin/AdminInstallations';
import AdminLogistics from './admin/AdminLogistics';
import AdminCMS from './admin/AdminCMS';
import AdminPortfolio from './admin/AdminPortfolio';
import AdminEmailCenter from './admin/AdminEmailCenter';
import AdminStaff from './admin/AdminStaff';
import AdminSystem from './admin/AdminSystem';
import AIProposalGenerator from '../components/AIProposalGenerator';
import ClientHub from './admin/ClientHub';
import FabricationKanban from './admin/FabricationKanban';
import ProjectProcurement from './admin/ProjectProcurement';
import { PROJECT_STAGES } from '../data.jsx';
import AdminShowcase from './admin/AdminShowcase';
import AdminFinancials from './admin/AdminFinancials';
import AdminAnalytics from './admin/AdminAnalytics';
import ProjectKanban from './admin/ProjectKanban';

export default function AdminPortal({ user, onLogout, onPreview, content, setContent, ...props }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState('dash');

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (path && path !== 'admin' && path !== '') {
      setView(path);
    } else {
      setView('dash');
    }
  }, [location.pathname]);

  const handleSetView = (newView) => {
    setView(newView);
    navigate(`/admin/${newView}`);
  };
  const [showAI, setShowAI] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [mod, setMod] = useState(null); // 'AddClient', 'AddProject', etc.
  const [aiContext, setAiContext] = useState({});
  const { brand } = props;

  const handleSelectClient = (id) => {
    setSelectedClientId(id);
    setView('client-hub');
  };

  const renderView = () => {
    const common = { 
      user, brand, content, setContent, 
      setAI: (ctx = {}) => { setAiContext(ctx); setShowAI(true); }, 
      setMod,
      onSelectClient: handleSelectClient,
      PROJECT_STAGES,
      jobs: props.jobs,
      createJob: props.createJob,
      updateJob: props.updateJob,
      sendWhatsAppUpdate: props.sendWhatsAppUpdate,
      ...props 
    };
    switch (view) {
      case 'dash': return <AdminDashboard {...common} />;
      case 'operations': return <AdminClients {...common} deleteSelectedClients={props.deleteSelectedClients} deleteAllClients={props.deleteAllClients} currency={props.currency} setCurrency={props.setCurrency} />;
      case 'client-hub': return <ClientHub clientId={selectedClientId} onBack={() => setView('operations')} {...common} />;
      case 'logistics': return <AdminLogistics {...common} />;
      case 'installations': return <AdminInstallations {...common} />;
      case 'projects': return <ProjectKanban {...common} clients={props.clients} updateProject={props.syncProjects} />;
      case 'cms': return <AdminCMS {...common} onPreview={onPreview} />;
      case 'portfolio': return <AdminPortfolio {...common} />;
      case 'showcase': return <AdminShowcase {...common} />;
      case 'staff': return <AdminStaff {...common} />;
      case 'financials': return <AdminFinancials {...common} />;
      case 'system': return <AdminSystem onReset={props.migrateToFirebase} syncCatalog={props.syncCatalog} {...common} />;
      case 'email': return <AdminEmailCenter {...common} convertInquiry={props.convertInquiryToProject} updateEmailStatus={props.updateEmailStatus} />;
      case 'analytics': return <AdminAnalytics {...common} />;
      default: return <AdminDashboard {...common} />;
    }
  };

  return (
    <AdminLayout 
      user={user} 
      onLogout={onLogout} 
      onPreview={onPreview} 
      brand={brand} 
      view={view} 
      setView={handleSetView}
      userNotifications={props.userNotifications || props.notifications}
      markNotificationRead={props.markNotificationRead}
      {...props}
    >
      {renderView()}
      <AIProposalGenerator 
        open={showAI} 
        onClose={() => setShowAI(false)} 
        onSubmit={(data) => {
          // If we have a project context, we can automatically link it
          const submission = aiContext.projectId ? { ...data, projectId: aiContext.projectId } : data;
          props.createProposal(submission);
        }} 
        brand={brand} 
        initialData={aiContext}
      />
      
      {/* GLOBAL MODALS */}
      {mod === 'AddClient' && view !== 'operations' && (
        <AdminClients 
          {...props} 
          brand={brand} 
          dbClients={props.dbClients} 
          createClient={props.createClient}
          updateClient={props.updateClient}
          autoOpen={true} 
          onClose={() => setMod(null)} 
        />
      )}
    </AdminLayout>
  );
}
function AdminChat({ messages, sendMessage, clients, brand }) {
  const [activeClient, setActiveClient] = useState(null);
  const ac = brand.color || '#231F78';
  
  return (
    <div className="p-card" style={{ height: 'calc(100vh - 120px)', display: 'grid', gridTemplateColumns: '300px 1fr' }}>
      <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
        <div style={{ padding: 24, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>Client Discussions</div>
        {clients.map(c => (
          <button key={c.id} onClick={() => setActiveClient(c)} style={{ width: '100%', padding: 16, textAlign: 'left', background: activeClient?.id === c.id ? 'rgba(35, 31, 120, 0.05)' : 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: ac, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{c.name?.[0]}</div>
            <div>
               <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
               <div style={{ fontSize: 11, color: '#888' }}>{c.email}</div>
            </div>
          </button>
        ))}
      </div>
      {activeClient ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 24, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
             <div className="lxfh">{activeClient.name}</div>
             <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 800 }}>ACTIVE SESSION</div>
          </div>
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.filter(m => m.senderId === activeClient.id || m.receiverId === activeClient.id).map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.senderId === 'admin' ? 'flex-end' : 'flex-start',
                background: m.senderId === 'admin' ? ac : 'var(--bg-alt)',
                color: m.senderId === 'admin' ? '#fff' : 'var(--fg)',
                padding: '12px 16px', borderRadius: 16, maxWidth: '70%', fontSize: 14
              }}>
                {m.text}
              </div>
            ))}
          </div>
          <div style={{ padding: 24, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
            <input 
              id="adminMsgInp"
              className="p-inp" 
              placeholder="Type response..." 
              style={{ flex: 1 }} 
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value) {
                  sendMessage(e.target.value, 'admin', activeClient.id);
                  e.target.value = '';
                }
              }}
            />
            <button onClick={() => {
              const inp = document.getElementById('adminMsgInp');
              if (inp.value) {
                sendMessage(inp.value, 'admin', activeClient.id);
                inp.value = '';
              }
            }} className="p-btn-gold" style={{ padding: '0 24px' }}>Reply</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Select a client to start chatting</div>
      )}
    </div>
  );
}

function AdminTestimonials({ testimonials, brand }) {
  const ac = brand.color || '#231F78';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
       <div className="p-card" style={{ padding: 32 }}>
          <h2 className="lxfh" style={{ fontSize: 24, marginBottom: 8 }}>Testimonial Moderation</h2>
          <p style={{ color: '#888', marginBottom: 32 }}>Review and approve client feedback before it goes live on the public site.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {testimonials.map(t => (
              <div key={t.id} style={{ padding: 24, border: '1px solid var(--border)', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', gap: 20 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: ac, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>{t.author?.[0]}</div>
                    <div>
                       <div style={{ fontWeight: 700 }}>{t.author}</div>
                       <div style={{ fontSize: 13, fontStyle: 'italic', color: '#444', margin: '4px 0' }}>"{t.text}"</div>
                       <div style={{ fontSize: 11, color: '#888' }}>{t.projectTitle} • Rating: {t.rating}/5</div>
                    </div>
                 </div>
                 <div style={{ display: 'flex', gap: 8 }}>
                    <button className="p-btn-dark" style={{ padding: '8px 16px', fontSize: 11, background: '#16A34A', border: 'none' }}>Approve</button>
                    <button className="p-btn-dark" style={{ padding: '8px 16px', fontSize: 11, background: '#EF4444', border: 'none' }}>Reject</button>
                 </div>
              </div>
            ))}
            {testimonials.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>No testimonials submitted yet.</div>}
          </div>
       </div>
    </div>
  );
}
