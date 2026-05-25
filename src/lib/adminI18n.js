const ADMIN_ZH = {
  'Dashboard': '仪表盘',
  'Analytics': '数据分析',
  'Project Board': '项目看板',
  'Installations': '安装管理',
  'Logistics': '物流管理',
  'Client Directory': '客户目录',
  'Inquiry Queue': '询盘队列',
  'Payments': '付款',
  'Showcase Hub': '展示中心',
  'Staff Accounts': '员工账号',
  'Settings': '设置',
  'Product Sync Settings': '产品同步设置',
  'Main': '主要',
  'Projects': '项目',
  'Clients': '客户',
  'Finance': '财务',
  'Marketing': '营销',
  'Team': '团队',
  'System': '系统',
  'Command': '控制台',
  'Operations Control': '运营控制',
  'Management Console': '管理控制台',
  'Admin Console': '管理后台',
  'Search clients, projects, invoices...': '搜索客户、项目、发票...',
  'Site Preview': '网站预览',
  'Field Worker View': '现场工人视图',
  'Change Password': '修改密码',
  'Logout': '退出登录',
  'Operational Guide': '运营指南',
  'Follow these steps to run your business': '按照这些步骤管理业务',
  '1. Register Client': '1. 登记客户',
  'Go to Client Directory and add their phone number.': '进入客户目录并添加客户电话。',
  '2. Start Project': '2. 启动项目',
  'Open their hub and click "Deploy New Phase".': '打开客户中心并点击“部署新阶段”。',
  '3. Add Sourcing': '3. 添加采购',
  'Add items in Sourcing Hub for client approval.': '在采购中心添加项目供客户审批。',
  '4. Get Paid': '4. 收款',
  'Trigger an Invoice and share the portal link.': '生成发票并分享客户门户链接。',
  'Password must be at least 6 characters.': '密码至少需要 6 个字符。',
  'Password updated successfully!': '密码更新成功！',
  'Not authenticated. Please log out and back in.': '未认证。请退出后重新登录。',
  'For security, please log out and log back in before changing your password.': '出于安全原因，请先退出并重新登录后再修改密码。',
};

const ADMIN_ZH_ENTRIES = Object.entries(ADMIN_ZH).sort((a, b) => b[0].length - a[0].length);
const ADMIN_ORIGINAL_TEXT = new WeakMap();

function translateAdminText(value, lang) {
  if (lang !== 'zh') return value;
  const trimmed = String(value || '').trim();
  if (!trimmed) return value;
  const normalized = trimmed.replace(/\s+/g, ' ');
  const exact = ADMIN_ZH[trimmed] || ADMIN_ZH[normalized];
  if (exact) {
    const start = value.match(/^\s*/)?.[0] || '';
    const end = value.match(/\s*$/)?.[0] || '';
    return `${start}${exact}${end}`;
  }
  let translated = value;
  for (const [en, zh] of ADMIN_ZH_ENTRIES) {
    if (translated.includes(en)) translated = translated.split(en).join(zh);
  }
  return translated;
}

export function translateAdminDom(lang) {
  if (typeof document === 'undefined') return;
  const root = document.querySelector('.lx-admin');
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'INPUT', 'TEXTAREA', 'OPTION'].includes(tag)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest('[data-no-public-translate], [data-no-admin-translate]')) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (!ADMIN_ORIGINAL_TEXT.has(node)) ADMIN_ORIGINAL_TEXT.set(node, node.nodeValue);
    node.nodeValue = translateAdminText(ADMIN_ORIGINAL_TEXT.get(node), lang);
  });

  root.querySelectorAll('[placeholder], [aria-label], [title]').forEach(el => {
    ['placeholder', 'aria-label', 'title'].forEach(attr => {
      if (!el.hasAttribute(attr)) return;
      const key = `adminOriginal${attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
      if (!el.dataset[key]) el.dataset[key] = el.getAttribute(attr);
      el.setAttribute(attr, translateAdminText(el.dataset[key], lang));
    });
  });
}
