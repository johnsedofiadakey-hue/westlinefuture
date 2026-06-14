// ─── Client Portal — Chinese Translation Dictionary ───────────────────────────
// DOM-walker approach: translates text nodes inside .lx-portal on language change.
// This mirrors the admin portal pattern — add any new UI string here and it
// auto-translates everywhere it appears on the client portal without touching JSX.

const CLIENT_ZH = {
  // ── Navigation / Tabs ──────────────────────────────────────────────────────
  'Dashboard': '我的主页',
  'Timeline': '项目进度',
  'Design Vault': '设计库',
  'Approvals': '审批',
  'Payments': '付款',
  'Documents': '文件',
  'Photos': '照片',
  'Messages': '消息',
  'Menu': '菜单',
  'Back': '返回',
  'Close': '关闭',

  // ── Project Status / Stage Names ───────────────────────────────────────────
  'Site Survey': '现场勘察',
  'Design & Rendering': '设计与渲染',
  'Quotation & Deposit': '报价与定金',
  'Production': '生产中',
  'Shipping & Logistics': '运输与物流',
  'Installation': '安装中',
  'Inspection': '验收',
  'Handover': '项目交接',
  'On track': '进展顺利',
  'At risk': '存在风险',
  'Delayed': '已延迟',
  'Waiting on client': '等待客户操作',
  'Waiting on payment': '等待付款',
  'Waiting on supplier': '等待供应商',
  'Completed': '已完成',
  'Active': '进行中',
  'Pending': '待处理',
  'Approved': '已批准',
  'Paid': '已付款',
  'Unpaid': '未付款',
  'Overdue': '已逾期',

  // ── Dashboard Strings ──────────────────────────────────────────────────────
  'Your Projects': '我的项目',
  'No projects yet': '暂无项目',
  "You'll be notified when your project updates.": '项目有更新时将通知您。',
  'Couldn\'t load your projects': '无法加载您的项目',
  'Your attention is needed': '需要您的关注',
  'Overall Progress': '整体进度',
  'Next Action': '下一步操作',
  'Est. Completion': '预计完成日期',
  'Days In': '已进行天数',
  'Started': '已开始',
  'Project Details': '项目详情',
  'Project Timeline': '项目时间线',
  'Project Complete!': '项目已完成！',
  'Your Project is Complete!': '您的项目已完成！',
  'Thank you for choosing Westline Future. Your handover documents have been issued.': '感谢您选择Westline Future。您的交接文件已签发。',

  // ── Timeline Tab ───────────────────────────────────────────────────────────
  'Project Timeline': '项目时间表',
  'Total Duration': '总工期',
  'Total Project Value': '项目总价值',
  'Project Value': '项目价值',
  'Project Cost Breakdown': '项目费用明细',
  'Itemised summary of your project cost': '项目费用逐项汇总',
  'Target Completion Date: ': '目标完成日期：',
  'Stage': '阶段',
  'Status': '状态',
  'Notes': '备注',

  // ── Approvals Tab ──────────────────────────────────────────────────────────
  'Approvals': '审批',
  'Track all project approval gates — design, quotation, and final inspection.': '跟踪所有项目审批节点——设计、报价和最终验收。',
  'Approval Required': '需要审批',
  'Action Required': '需要操作',
  'Awaiting Your Review': '等待您审阅',
  'Awaiting Upload': '等待上传',
  'Changes Requested — Revision Pending': '已请求修改 — 等待修订',

  // Rendering approval
  'Design Rendering Approval': '设计渲染审批',
  'View Design Vault': '查看设计库',

  // Contract
  'Sign the Project Contract': '签署项目合同',
  'Review Your Contract': '审阅您的合同',
  'Sign the Agreement': '签署协议',
  'Contract & Quotation Approval': '合同与报价审批',
  'Contract Signed': '合同已签署',
  'Contract Signed ✓': '合同已签署 ✓',
  'Sign contract first': '请先签署合同',
  'Download Signed Contract': '下载已签合同',
  'Review & Sign Contract →': '审阅并签署合同 →',

  // Contract modal
  'Service Agreement': '服务协议',
  'Step 1 of 2 — Read Contract': '第 1 步，共 2 步 — 阅读合同',
  'Step 2 of 2 — Sign Contract': '第 2 步，共 2 步 — 签署合同',
  'Scroll to the bottom to continue': '滚动到底部继续',
  'I have read and understood the full contract above': '我已阅读并理解上述完整合同',
  'I Have Read the Contract': '我已阅读合同',
  'I Accept — Proceed to Sign': '我接受 — 继续签署',
  'Type your full legal name': '请输入您的完整法定姓名',
  'Signature Preview': '签名预览',
  'Draw your signature': '手写您的签名',
  'Sign here with your finger or mouse': '用手指或鼠标在此签名',
  'Clear': '清除',
  'Draw instead': '改为手写',
  'Type instead': '改为输入',
  'Sign & Accept Contract': '签署并接受合同',
  'Signing...': '签署中...',
  'I Accept the Terms': '我接受条款',

  // Quote approval
  'We\'ve prepared your final quotation. Please review the document, then approve it below.': '我们已准备好您的最终报价。请查看文件，然后在下方批准。',
  'Approve Quote': '批准报价',
  'Quote Approved ✓': '报价已批准 ✓',
  'Confirm Approval ': '确认批准',
  'Please review the work and confirm your approval.': '请检查工作成果并确认您的审批。',

  // Inspection
  'Final Site Inspection': '最终现场验收',
  'Our crew is on-site': '我们的团队正在现场',
  'Installation · In Progress': '安装 · 进行中',
  'This action is permanent and triggers the final payment milestone.': '此操作不可逆，并将触发最终付款里程碑。',
  'Confirm Site Inspection — I Accept the Work': '确认现场验收 — 我接受该工程',

  // ── Payments Tab ───────────────────────────────────────────────────────────
  'Payment Schedule': '付款计划',
  'Payment History': '付款历史',
  'Payment Required': '需要付款',
  'Payment Due': '待付款',
  'Balance Due': '待付余额',
  'Your final balance is due': '您的最终余额已到期',
  'Due Now': '立即到期',
  'Due Date': '到期日',
  'Amount': '金额',
  'Amount Paid': '已付金额',
  'Paid ✓': '已付 ✓',
  'Pay Now': '立即付款',
  'Pay Add-on': '付增项款',
  'Invoices': '发票',
  'No invoices yet': '暂无发票',
  'Invoices will appear here as they are issued.': '发票签发后将在此显示。',
  'No payments yet': '暂无付款记录',
  'Your payment records will appear here.': '您的付款记录将在此显示。',
  'paid so far': '已付款',
  'Payment progress': '付款进度',
  'Project Cost Breakdown': '项目费用明细',
  'Qty': '数量',
  'Rate': '单价',
  'Unit': '单位',
  'Type': '类型',
  'Description': '描述',
  'Description ': '描述 ',

  // ── Documents Tab ──────────────────────────────────────────────────────────
  'Project Documents': '项目文件',
  'No documents yet': '暂无文件',
  'Download': '下载',
  'Download the file instead': '改为下载文件',
  'Preview not available': '预览不可用',

  // ── Photos Tab ─────────────────────────────────────────────────────────────
  'Site Photos': '现场照片',
  'Latest Site Photos': '最新现场照片',
  'No site photos yet': '暂无现场照片',
  'Progress photos will appear here as our crew completes each section.': '我们的团队完成每个环节后，进度照片将在此显示。',
  'Tap Photos tab to see all →': '点击照片标签查看全部 →',

  // ── Add-ons Tab ────────────────────────────────────────────────────────────
  'Add-ons & Variations': '增项与变更',
  'No add-ons or variations have been added to this project.': '此项目尚未添加任何增项或变更。',
  'Every approved scope change stays visible with cost, status, and linked payment.': '每项已批准的范围变更均可见，包含费用、状态和关联付款。',

  // ── Messages / Chat ────────────────────────────────────────────────────────
  'New Update': '新更新',
  'Mark all read': '全部标为已读',
  'Notifications': '通知',
  'No notifications yet': '暂无通知',
  'Activity Log': '活动日志',

  // ── Change Request ─────────────────────────────────────────────────────────
  'Request a Change': '申请变更',
  'Project Change': '项目变更',
  'Change Type': '变更类型',
  'Urgency': '紧急程度',
  'Subject / Project': '主题 / 项目',
  'Reason for adjustment': '调整原因',
  'Describe the change you\'d like to request...': '请描述您希望申请的变更...',
  'Request Submitted': '申请已提交',
  'Our team will review your change request and get back to you shortly.': '我们的团队将审核您的变更申请并尽快回复您。',

  // ── Shipping / Logistics ───────────────────────────────────────────────────
  'Live Shipping Tracker': '实时货运追踪',
  'Container': '集装箱',
  'BL Number': '提单号',

  // ── PDF / Documents ────────────────────────────────────────────────────────
  'Fabrication & Installation Agreement': '制作与安装协议',
  'Contractor (First Party)': '承包商（甲方）',
  'Client (Second Party)': '客户（乙方）',
  'Authorized Representative': '授权代表',
  'Contractor Sign-off': '承包商签署',
  'Client Signature': '客户签名',
  'No signature on file': '暂无签名记录',
  'Contract Executed': '合同已执行',
  'Contract Reference': '合同参考号',
  'Contract Value': '合同金额',
  'Contractor': '承包商',
  'Contractual Conditions': '合同条款',
  'Date Executed': '执行日期',
  'Date Issued': '签发日期',
  'Dual-Factor Carrier SMS OTP': '双因素运营商短信验证',
  'Electronic Execution & Verification Log': '电子执行与验证日志',
  'Electronic Fund Transfer': '电子资金转账',
  'Electronic Signature Verification': '电子签名验证',
  'Governing Law:': '适用法律：',
  'Installation and Access:': '安装与进场：',
  'IP Reference Log: ': 'IP 参考日志：',
  'Issued By': '签发方',
  'Payment Terms:': '付款条款：',
  'Phone Authenticated: ': '手机已验证：',
  'Authentication Protocol: ': '验证协议：',
  'Scope of Project': '项目范围',
  'Scope of Work:': '工作范围：',
  'Verified securely via Westline Future Premium SaaS CRM Suite.': '已通过 Westline Future 高级 SaaS CRM 系统安全验证。',
  'Warranty Policy:': '质保政策：',

  // ── Referral ────────────────────────────────────────────────────────────────
  'Refer a client, earn a discount': '推荐客户，获得折扣',
  'Share': '分享',
  'Share your code and get a discount on your next project when they sign on.': '分享您的邀请码，当他们签约时，您将获得下一个项目的折扣。',
  'Thank you!': '感谢您！',
  'Your review helps us improve. We appreciate your trust.': '您的评价帮助我们改进。感谢您的信任。',
  'Share your experience (optional)...': '分享您的使用体验（可选）...',

  // ── Install Guide ───────────────────────────────────────────────────────────
  'Install Our App': '安装我们的应用',
  'Install': '安装',
  'Add to Home Screen': '添加到主屏幕',
  'Follow the onscreen instructions to add it.': '按照屏幕上的说明进行添加。',
  'For Android:': '安卓用户：',
  'For iPhone/iPad:': 'iPhone/iPad 用户：',
  'For Desktop/Other:': '桌面 / 其他设备：',
  'Look for an install icon in your browser\'s address bar.': '在浏览器地址栏中查找安装图标。',
  'Or, find the ': '或者，找到',
  'Scroll down and tap ': '向下滚动并点击',
  'Tap the ': '点击',
  'Tap ': '点击',

  // ── Profile / Auth ──────────────────────────────────────────────────────────
  'Client Portal': '客户门户',
  'Project': '项目',
  'Add': '添加',

  // ── Misc ────────────────────────────────────────────────────────────────────
  'Upcoming': '即将到来',
  'Advance →': '推进 →',
  
  // ── Recently Added / Missing UI Strings ──────────────────────────────────
  'Overview': '概览',
  'Timeline': '时间线',
  'Financials': '财务',
  'Design Vault': '设计库',
  'Documents': '文件',
  'Team': '团队',
  'Sign Out': '退出登录',
  'Client Messages': '客户消息',
  'Log Out': '退出',
  'Settings': '设置',
  'Menu': '菜单',
};


const CLIENT_ZH_ENTRIES = Object.entries(CLIENT_ZH).sort((a, b) => b[0].length - a[0].length);

function translateClientText(value, lang) {
  if (lang !== 'zh') return value;
  const trimmed = String(value || '').trim();
  if (!trimmed) return value;
  const normalized = trimmed.replace(/\s+/g, ' ');
  const exact = CLIENT_ZH[trimmed] || CLIENT_ZH[normalized];
  if (exact) {
    const start = value.match(/^\s*/)?.[0] || '';
    const end = value.match(/\s*$/)?.[0] || '';
    return `${start}${exact}${end}`;
  }
  let translated = value;
  for (const [en, zh] of CLIENT_ZH_ENTRIES) {
    if (translated.includes(en)) translated = translated.split(en).join(zh);
  }
  return translated;
}

export function translateClientDom(lang) {
  if (typeof document === 'undefined') return;
  const root = document.querySelector('.lx-portal');
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'INPUT', 'TEXTAREA', 'OPTION'].includes(tag)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest('[data-no-translate], [data-no-portal-translate]')) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (node.__portalOriginalText === undefined) {
      node.__portalOriginalText = node.nodeValue;
    }
    const nextVal = translateClientText(node.__portalOriginalText, lang);
    if (node.nodeValue !== nextVal) node.nodeValue = nextVal;
  });

  root.querySelectorAll('[placeholder], [aria-label], [title]').forEach(el => {
    ['placeholder', 'aria-label', 'title'].forEach(attr => {
      if (!el.hasAttribute(attr)) return;
      const key = `portalOriginal${attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
      if (!el.dataset[key]) el.dataset[key] = el.getAttribute(attr);
      const nextVal = translateClientText(el.dataset[key], lang);
      if (el.getAttribute(attr) !== nextVal) el.setAttribute(attr, nextVal);
    });
  });
}
