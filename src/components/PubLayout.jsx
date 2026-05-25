import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import {
  Menu, X, Layers, AppWindow, ShowerHead, ChefHat, Shirt, LayoutGrid, DoorOpen, Zap, Droplets
} from 'lucide-react';
import { useWindowWidth, isMob, DARK_TEXT } from '../pages/sharedHelpers';
import LanguageFlagSwitch from './LanguageFlagSwitch';

const PUBLIC_ZH = {
  'Home': '首页',
  'Westline Future Ltd.': '西线未来有限公司',
  'WESTLINE FUTURE': '西线未来',
  'Westline Future': '西线未来',
  'Services': '服务',
  'Products': '产品',
  'Showroom': '展厅',
  'Portfolio': '案例',
  'About': '关于',
  'Contact': '联系',
  'Client Portal': '客户门户',
  'Client Portal Login': '客户门户登录',
  'DESIGN • SOURCING • INSTALLATION': '设计 • 采购 • 安装',
  'Design. Source. Install.': '设计。采购。安装。',
  'From concept to handover.': '从概念到交付。',
  'A managed project system for premium interiors, CAD/3D rendering, global sourcing, logistics, installation, and handover.': '为高端室内项目提供完整管理系统，涵盖施工图/三维效果图、全球采购、物流、安装与交付。',
  'Clients approve drawings, quotes, payments, timelines, and completion records through a controlled Westline workflow.': '客户可通过西线未来受控流程审批图纸、报价、付款、时间计划和完工记录。',
  'Start Project Brief': '提交项目需求',
  'How We Work': '工作流程',
  'Projects': '项目',
  'Years': '年经验',
  'Satisfaction': '满意度',
  'Countries': '服务国家',
  'THE WESTLINE METHOD': '西线未来方法',
  'A project system, not just a contractor.': '不只是承包商，而是项目系统。',
  'Every serious project moves through a controlled journey: intake, paid design access, design approval, quote approval, deposit, production, logistics, installation, inspection, and handover.': '每个正式项目都经过受控流程：需求收集、付费设计访问、设计审批、报价审批、定金、生产、物流、安装、验收和交付。',
  'View Full Workflow': '查看完整流程',
  'Project Brief': '项目需求',
  'Share the site, scope, budget range, preferred finish, and timeline so the team can qualify the request properly.': '提交现场、范围、预算区间、偏好材质和时间计划，便于团队准确评估需求。',
  'Paid CAD / 3D Design': '付费施工图/三维设计',
  'A separate rendering invoice unlocks the private design package. The project quote comes after design approval.': '单独的效果图发票付款后，客户才能查看私人设计包。项目报价在设计审批后生成。',
  'Final Quote Approval': '最终报价审批',
  'Westline issues a versioned quote based on the approved drawing, with revisions and scope changes tracked.': '西线未来根据已批准图纸出具版本化报价，并记录修订和范围变化。',
  'Procure, Deliver, Install': '采购、配送、安装',
  'Materials, logistics, installation updates, documents, payments, and approvals move through the client portal.': '材料、物流、安装进度、文件、付款和审批都通过客户门户管理。',
  'EVERYTHING INTERIOR': '全案室内服务',
  'One company,': '一家公司，',
  'every service.': '全套服务。',
  'All Services': '全部服务',
  'Glass & Glazing': '玻璃与幕墙',
  'Aluminium Windows': '铝合金窗',
  'Bathroom Installation': '浴室安装',
  'Kitchen Renovation': '厨房翻新',
  'Wardrobes & Storage': '衣柜与收纳',
  'Tiles Supply & Fixing': '瓷砖供应与铺贴',
  'Doors Installation': '门类安装',
  'Electrical Works': '电气工程',
  'Plumbing Works': '给排水工程',
  'Tiles & Flooring': '瓷砖与地面',
  'Doors': '门类',
  'Frameless glass, balustrades, curtain walls, glass partitions & shopfronts.': '无框玻璃、栏杆、幕墙、玻璃隔断与店面系统。',
  'Casement, sliding & louvre aluminium windows and doors — fabricated to spec.': '平开、推拉与百叶铝窗铝门，按规格加工。',
  'Full bathroom fit-out — shower cubicles, vanities, WC, tiles & plumbing.': '完整浴室装修，包括淋浴房、洗手台、马桶、瓷砖和管道。',
  'Custom kitchen cabinets, worktops, sinks — modular kitchen supply & install.': '定制橱柜、台面、水槽，模块化厨房供应与安装。',
  'Sliding wardrobes, walk-in closets & fitted storage systems for every room.': '滑门衣柜、步入式衣帽间和全屋定制收纳系统。',
  'Porcelain, ceramic & outdoor tiles — supply only or full supply-and-fix.': '瓷砖、陶瓷砖和户外砖，可单供货或包工包料。',
  'Timber, WPC & security doors — frames, handles & complete door systems.': '木门、WPC门、防盗门，含门框、五金和整套门系统。',
  'Full wiring, LED lighting, smart switches, DB boards & socket installations.': '完整布线、LED照明、智能开关、配电箱和插座安装。',
  'Plumbing installations, sanitary fittings, water heaters & pipe systems.': '管道安装、卫浴五金、热水器和管路系统。',
  'Learn more': '了解更多',
  'DESIGN BEFORE QUOTATION': '报价前先设计',
  'Rendering access is controlled and paid separately.': '效果图访问受控，并单独收费。',
  'The CAD/3D design fee is not part of the final project sum. It unlocks the rendering package for review, comments, revisions, and approval before the final project quote is prepared.': '施工图/三维设计费不属于最终项目总价。付款后客户可查看效果图包，进行审核、评论、修改和批准，之后才准备最终项目报价。',
  'Start With A Design Brief': '从设计需求开始',
  'Private upload': '私密上传',
  'Admin uploads rendering files into a locked package.': '管理员将效果图文件上传到锁定包中。',
  'Separate invoice': '单独发票',
  'Client pays the CAD/3D rendering fee before access.': '客户付款施工图/三维效果图费用后才能访问。',
  'Review & revise': '审核与修改',
  'Client comments, requests changes, or approves the final version.': '客户可评论、申请修改或批准最终版本。',
  'Quote after approval': '审批后报价',
  'The actual project quote is based on the approved design version.': '正式项目报价基于已批准的设计版本。',
  'WHY WESTLINE FUTURE': '为什么选择西线未来',
  'Built to a': '以更高',
  'higher standard.': '标准建造。',
  'Guaranteed Quality': '质量保证',
  'Every installation backed by a 2-year workmanship warranty and certified materials from vetted manufacturers.': '每项安装均享有2年工艺质保，并使用经审核厂家认证材料。',
  'On-Time Delivery': '准时交付',
  'Our dedicated logistics team tracks every shipment. 94% of projects completed on or ahead of schedule.': '专属物流团队跟踪每批货物。94%的项目按时或提前完成。',
  'Direct China Sourcing': '中国源头直采',
  'We cut out middlemen. Factory-direct procurement means premium glass at 20–35% below market rates.': '减少中间环节。工厂直采让高端玻璃成本比市场价低20–35%。',
  'Technical Expertise': '技术实力',
  'CNC precision, sub-millimeter tolerances. Our engineers have handled façades, curtain walls, and interior systems for 12+ years.': '数控精度，毫米级误差控制。工程团队拥有12年以上幕墙、立面和室内系统经验。',
  'Start Your Project': '开始项目',
  'CLIENT PORTAL INCLUDED': '包含客户门户',
  'Clients see progress, payments, documents, and approvals in one place.': '客户可在一个地方查看进度、付款、文件和审批。',
  'The public promise matches the operating system behind the scenes: fewer loose chats, fewer missing approvals, and a clearer record of every decision.': '对外承诺与后台运营系统一致：减少零散沟通、避免遗漏审批，并清晰记录每项决策。',
  'Locked design packages': '锁定设计包',
  'Quote approvals': '报价审批',
  'Invoices and receipts': '发票与收据',
  'Procurement updates': '采购进度',
  'Shipping and delivery': '运输与配送',
  'Installation photos': '安装照片',
  'Inspection sign-off': '验收签字',
  'Handover documents': '交付文件',
  'Begin Intake': '开始需求收集',
  'CLIENT STORIES': '客户故事',
  'Trusted by': '深受',
  'decision-makers.': '决策者信赖。',
  'GET STARTED': '开始',
  'Ready to build something remarkable?': '准备打造卓越项目？',
  'Ready to build': '准备打造',
  'something remarkable?': '卓越项目？',
  'Westline Future transformed our office with exceptional precision. The structural glazing exceeded every expectation — on time and on budget.': '西线未来以出色精度完成了我们的办公室项目。结构玻璃效果超出预期，并且按时按预算交付。',
  'Airport Hills Commercial Tower': '机场山商业大楼',
  'Kwame Asante': '夸梅·阿桑特',
  'From concept to installation — our team handles every detail.': '从概念到安装，我们的团队处理每一个细节。',
  'Request a Quote': '申请报价',
  'View Portfolio': '查看案例',
  'Loading...': '加载中...',
  'Loading About Page...': '正在加载关于页面...',
  'Loading Contact Page...': '正在加载联系页面...',
  'Loading Workflow...': '正在加载流程...',
  'Loading Products...': '正在加载产品...',
  'Loading Gallery...': '正在加载案例...',
  'Loading Showcase...': '正在加载展厅...',
  'Page Under Construction': '页面建设中',
  "Global precision meets local delivery. Premium structural glass, aluminum works, and interior finishing solutions for the world's most ambitious architectural projects.": '全球精度结合本地交付。为高标准建筑项目提供高端结构玻璃、铝合金工程和室内精装解决方案。',
  'Navigation': '导航',
  'Capabilities': '服务能力',
  'Follow Us': '关注我们',
  'All rights reserved.': '版权所有。',
  'Management Portal': '管理门户',
  'Submit Project Intake': '提交项目需求',
  'Project Intake': '项目需求',
  'Send To Project Intake': '发送到项目需求',
  'PLAN SIMILAR PROJECT': '规划类似项目',
  'SOURCE • APPROVE • INSTALL': '采购 • 审批 • 安装',
  'Selected Case Studies.': '精选案例。',
  'Products &': '产品与',
  'Materials.': '材料。',
  'Search products...': '搜索产品...',
  'Inquire for Procurement': '咨询采购',
  'Share WhatsApp': 'WhatsApp分享',
  'Submit': '提交',
  'Full name': '姓名',
  'Phone / WhatsApp': '电话 / WhatsApp',
  'Email': '邮箱',
  'Project Location': '项目地点',
  'Budget Range': '预算范围',
  'Timeline': '时间计划',
  'Rendering Need': '效果图需求',
  'Measurements': '测量信息',
  'Message': '留言',
};

const PUBLIC_ZH_ENTRIES = Object.entries(PUBLIC_ZH).sort((a, b) => b[0].length - a[0].length);
const ORIGINAL_TEXT_NODES = new WeakMap();

function translatePublicText(value, lang) {
  if (lang !== 'zh') return value;
  const trimmed = String(value || '').trim();
  if (!trimmed) return value;
  const normalized = trimmed.replace(/\s+/g, ' ');
  if (PUBLIC_ZH[trimmed] || PUBLIC_ZH[normalized]) {
    const start = value.match(/^\s*/)?.[0] || '';
    const end = value.match(/\s*$/)?.[0] || '';
    return `${start}${PUBLIC_ZH[trimmed] || PUBLIC_ZH[normalized]}${end}`;
  }
  let translated = value;
  for (const [en, zh] of PUBLIC_ZH_ENTRIES) {
    if (translated.includes(en)) translated = translated.split(en).join(zh);
  }
  return translated;
}

function translatePublicDom(lang) {
  if (typeof document === 'undefined') return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH'].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-no-public-translate]')) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (!ORIGINAL_TEXT_NODES.has(node)) ORIGINAL_TEXT_NODES.set(node, node.nodeValue);
    const original = ORIGINAL_TEXT_NODES.get(node);
    node.nodeValue = translatePublicText(original, lang);
  });

  document.querySelectorAll('[placeholder], [aria-label], [title]').forEach(el => {
    ['placeholder', 'aria-label', 'title'].forEach(attr => {
      if (!el.hasAttribute(attr)) return;
      const key = `publicOriginal${attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
      if (!el.dataset[key]) el.dataset[key] = el.getAttribute(attr);
      el.setAttribute(attr, translatePublicText(el.dataset[key], lang));
    });
  });
}

export function PubNav({ brand, setPage, activePage, onPortal, menuOpen, setMenuOpen, navigate }) {
  const [scrolled, setScrolled] = useState(false);
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const { lang } = useContext(AppContext);
  const currentLang = lang === 'zh' ? 'zh' : 'en';
  const copy = {
    en: {
      home: 'Home',
      services: 'Services',
      products: 'Products',
      showcase: 'Showroom',
      portfolio: 'Portfolio',
      about: 'About',
      contact: 'Contact',
      portal: 'Client Portal',
      portalLogin: 'Client Portal Login',
      langLabel: '中文'
    },
    zh: {
      home: '首页',
      services: '服务',
      products: '产品',
      showcase: '展厅',
      portfolio: '案例',
      about: '关于',
      contact: '联系',
      portal: '客户门户',
      portalLogin: '客户门户登录',
      langLabel: 'EN'
    }
  }[currentLang];
  useEffect(() => {
    const apply = () => translatePublicDom(currentLang);
    apply();
    const observer = new MutationObserver(() => requestAnimationFrame(apply));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [currentLang]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const links = [
    { n: copy.home, id: 'home' },
    { n: copy.services, id: 'services' },
    { n: copy.products, id: 'products' },
    { n: copy.showcase, id: 'showcase', badge: 'LUXE' },
    { n: copy.portfolio, id: 'portfolio' },
    { n: copy.about, id: 'about' },
    { n: copy.contact, id: 'contact' }
  ];

  const forceSolid = activePage !== 'home';
  const isScrolled = scrolled || forceSolid;

  return (
    <>
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: isScrolled ? 'rgba(24, 14, 6, 0.97)' : 'rgba(24, 14, 6, 0.15)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: isScrolled ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      height: mob ? (isScrolled ? 64 : 80) : (isScrolled ? 80 : 120), 
      display: 'flex', alignItems: 'center', padding: '0 5vw'
    }}>
      <div style={{ maxWidth: 1800, width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* LOGO */}
        <div 
          onClick={() => { navigate('/'); if (setPage) setPage('home'); setMenuOpen(false); }} 
          style={{ 
            cursor: 'pointer', 
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            background: 'transparent',
            border: 'none',
            padding: mob ? '4px 0' : '6px 0',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.filter = 'drop-shadow(0 0 15px rgba(197, 168, 128, 0.35))';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.filter = 'none';
          }}
        >
            {brand.logo ? (
              <img
                src={brand.logo}
                alt={brand.name}
                style={{
                  height: mob ? (isScrolled ? 48 : 58) : (isScrolled ? 76 : 96),
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  filter: 'brightness(0) invert(1)',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
                <div style={{ fontSize: mob ? 20 : 28, fontWeight: 900, color: '#ffffff', letterSpacing: '0.05em' }}>WESTLINE</div>
                <div style={{ fontSize: mob ? 9 : 12, fontWeight: 400, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.45em' }}>FUTURE</div>
              </div>
            )}
        </div>


        {/* DESKTOP NAV */}
        {!mob && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
            <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
              {links.map(l => (
                <button key={l.id} onClick={() => {
                  if (l.id === 'home') { navigate('/'); if (setPage) setPage('home'); }
                  else if (l.id === 'products') navigate('/products');
                  else if (l.id === 'showcase') navigate('/showcase');
                  else if (l.id === 'portfolio') navigate('/portfolio');
                  else if (setPage) {
                    if (window.location.pathname !== '/') navigate('/?page=' + l.id);
                    else setPage(l.id);
                  }
                }} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  color: activePage === l.id ? '#ffffff' : 'rgba(255,255,255,0.65)',
                  textTransform: 'uppercase', letterSpacing: '0.22em', transition: 'all 0.3s',
                  opacity: activePage === l.id ? 1 : 0.8, whiteSpace: 'nowrap', padding: '4px 0',
                  borderBottom: activePage === l.id ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
                  position: 'relative'
                }}>
                  {l.n}
                  {l.badge && <span style={{ position: 'absolute', top: -6, right: -12, fontSize: 7, background: `var(--accent-primary)`, color: `var(--accent-secondary)`, borderRadius: 100, padding: '1px 5px', fontWeight: 800 }}>{l.badge}</span>}
                </button>
              ))}
            </div>
            {onPortal && (
              <button onClick={() => onPortal && onPortal('client')} style={{
                padding: '12px 28px', fontSize: 10, fontWeight: 800,
                background: 'rgba(255,255,255,0.15)', color: '#ffffff',
                borderRadius: 12, border: '1px solid rgba(255,255,255,0.25)',
                textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer',
                backdropFilter: 'blur(8px)', transition: 'all 0.3s'
              }}>{copy.portal}</button>
            )}
          </div>
        )}
        {!mob && <LanguageFlagSwitch variant="floating" />}

        {/* MOBILE: language + hamburger — only rendered on mobile via JS, no CSS class conflicts */}
        {mob && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LanguageFlagSwitch variant="mobile" />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                padding: '10px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Menu size={22} strokeWidth={2} />
            </button>
          </div>
        )}

      </div>
    </nav>

    {/* ─────────────────────────────────────────────────────
        MOBILE DRAWER — rendered as a sibling to <nav>, NOT
        inside it. Placing it inside nav causes the nav's
        backdrop-filter to create a containing block that
        clips position:fixed children to the navbar height.
    ───────────────────────────────────────────────────── */}
    {mob && (
      <>
        {/* Backdrop scrim */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
        )}

        {/* Drawer panel */}
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '100%',
          background: '#100D0A',
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Subtle warm glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 80% 10%, rgba(200,169,110,0.07) 0%, transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(200,169,110,0.04) 0%, transparent 50%)'
          }} />

          {/* TOP BAR — logo + close */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            position: 'relative', zIndex: 2, flexShrink: 0
          }}>
            <div onClick={() => { setMenuOpen(false); navigate('/'); if (setPage) setPage('home'); }} style={{ cursor: 'pointer' }}>
              {brand.logo ? (
                <img src={brand.logo} alt={brand.name}
                  style={{ height: 38, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)', display: 'block' }} />
              ) : (
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '0.08em' }}>WESTLINE</div>
                  <div style={{ fontSize: 8, fontWeight: 400, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.4em' }}>FUTURE</div>
                </div>
              )}
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)',
                borderRadius: 10, padding: '9px', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          {/* NAV LINKS */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', position: 'relative', zIndex: 2 }}>
            {links.map((l, idx) => {
              const isActive = activePage === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => {
                    setMenuOpen(false);
                    if (l.id === 'home') { navigate('/'); if (setPage) setPage('home'); }
                    else if (l.id === 'products') navigate('/products');
                    else if (l.id === 'showcase') navigate('/showcase');
                    else if (l.id === 'portfolio') navigate('/portfolio');
                    else if (setPage) {
                      if (window.location.pathname !== '/') navigate('/?page=' + l.id);
                      else setPage(l.id);
                    }
                  }}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    borderLeft: isActive ? '3px solid #C8A96E' : '3px solid transparent',
                    padding: '17px 28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: 'rgba(200,169,110,0.45)',
                      width: 22, textAlign: 'right', letterSpacing: '0.05em',
                      fontVariantNumeric: 'tabular-nums', flexShrink: 0
                    }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span style={{
                      fontSize: 22, fontWeight: isActive ? 800 : 500,
                      color: isActive ? '#C8A96E' : 'rgba(255,255,255,0.85)',
                      transition: 'color 0.2s',
                      fontFamily: '"Outfit", sans-serif',
                    }}>
                      {l.n}
                      {l.badge && (
                        <span style={{
                          marginLeft: 8, fontSize: 8, fontWeight: 800,
                          background: '#C8A96E', color: '#1A1410',
                          borderRadius: 100, padding: '2px 6px', verticalAlign: 'middle'
                        }}>{l.badge}</span>
                      )}
                    </span>
                  </div>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: isActive ? '#C8A96E' : 'rgba(255,255,255,0.18)',
                    flexShrink: 0
                  }} />
                </button>
              );
            })}
          </div>

          {/* BOTTOM ACTIONS */}
          <div style={{
            padding: '16px 24px max(36px, env(safe-area-inset-bottom, 36px))',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column', gap: 12,
            position: 'relative', zIndex: 2, flexShrink: 0
          }}>
            <button
              onClick={() => { setMenuOpen(false); onPortal('client'); }}
              style={{
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #C8A96E 0%, #B07C38 100%)',
                color: '#1A1410', borderRadius: 14, border: 'none',
                fontSize: 13, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.12em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 8px 24px rgba(200,169,110,0.25)'
              }}
            >
              {copy.portalLogin} →
            </button>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <LanguageFlagSwitch variant="mobile" />
            </div>
          </div>
        </div>
      </>
    )}
  </>
  );
}

export function Footer({ brand, setPage, onPortal, navigate }) {
  const ac = `var(--accent-primary)`;
  const winW = useWindowWidth();
  const mob = isMob(winW);

  return (
    <footer style={{ background: `var(--footer-bg)`, color: '#ffffff', padding: mob ? '60px 24px' : '100px 5vw 60px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(4, 1fr)', gap: 48, marginBottom: 80 }}>
          <div>
            {true ? (
              <img 
                src="/footer-logo.png" 
                alt={brand.name} 
                style={{ 
                  height: mob ? 60 : 84, 
                  width: 'auto', 
                  objectFit: 'contain', 
                  display: 'block', 
                  marginBottom: 24,
                  filter: 'invert(1)',
                  mixBlendMode: 'screen',
                  opacity: 0.95
                }} 
              />
            ) : (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>WESTLINE FUTURE</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', marginTop: 2 }}>GLOBAL TRADING CO., LTD</div>
              </div>
            )}
            <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, fontSize: 14 }}>Global precision meets local delivery. Premium structural glass, aluminum works, and interior finishing solutions for the world's most ambitious architectural projects.</p>
          </div>
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>Navigation</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Home', 'Services', 'Products', 'Showroom', 'Portfolio', 'About', 'Contact'].map(n => (
                <button key={n} onClick={() => {
                  const id = n === 'Showroom' ? 'showcase' : n.toLowerCase();
                  if (id === 'products') navigate('/products');
                  else if (id === 'showcase') navigate('/showcase');
                  else if (id === 'portfolio') navigate('/portfolio');
                  else if (setPage) {
                    if (window.location.pathname !== '/') navigate('/?page=' + id);
                    else setPage(id);
                  }
                }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', textAlign: 'left', fontSize: 14 }}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>Capabilities</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[
                { Icon: Layers,     label: 'Glass & Glazing'       },
                { Icon: AppWindow,  label: 'Aluminium Windows'      },
                { Icon: ShowerHead, label: 'Bathroom Installation'  },
                { Icon: ChefHat,    label: 'Kitchen Renovation'     },
                { Icon: Shirt,      label: 'Wardrobes & Storage'    },
                { Icon: LayoutGrid, label: 'Tiles & Flooring'       },
                { Icon: DoorOpen,   label: 'Doors'                  },
                { Icon: Zap,        label: 'Electrical Works'       },
                { Icon: Droplets,   label: 'Plumbing Works'         },
              ].map(({ Icon, label }) => (
                <button
                  key={label}
                  onClick={() => navigate('/?page=services')}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', textAlign: 'left', fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 10, transition: 'color 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.color = ac}
                  onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                >
                  <Icon size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>Contact</h4>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
              {brand.location}<br />
              {brand.phone}<br />
              {brand.email}
            </div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Follow Us</h4>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Instagram', href: brand.instagram, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.163 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
                { label: 'Facebook', href: brand.facebook, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                { label: 'LinkedIn', href: brand.linkedin, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                { label: 'TikTok', href: brand.tiktok, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
                { label: 'YouTube', href: brand.youtube, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
              ].filter(s => s.href).map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
                  style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s', textDecoration: 'none' }}
                  onMouseOver={e => { e.currentTarget.style.background = ac; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = ac; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >{s.svg}</a>
              ))}
            </div>
          </div>
        </div>
        <div style={{ paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <span>© 2026 Westline Future Ltd. All rights reserved.</span>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Management Portal</button>
        </div>

      </div>
    </footer>
  );
}
