import React, { useState, useEffect, useContext, useCallback } from 'react';
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

  // ── New service categories ─────────────────────────────────────────────────
  'Surface Finishes & Fixtures': '表面装修与洁具',
  'Fixed Custom Carpentry': '定制固装木作',
  'Home Furniture': '家居家具',
  'Home Appliances': '家用电器',
  'Décor & Accessories': '软装与配件',
  'Tiles · Flooring · Doors · Sanitary ware · Countertops': '瓷砖·地板·门·洁具·台面',
  'Kitchen cabinets · Wardrobes · Vanities · TV units': '橱柜·衣柜·浴室柜·电视柜',
  'Sofas · Dining sets · Beds · Coffee tables · Sideboards': '沙发·餐桌椅·床·茶几·餐边柜',
  'Fridges · Washing machines · Hoods · Hobs · Water heaters · TVs': '冰箱·洗衣机·抽油烟机·灶具·热水器·电视',
  'Curtains · Lighting · Mirrors · Decorative trims': '窗帘·灯具·镜子·装饰线条',
  'Surface Finishes & Fixtures (tiles, flooring, doors, sanitary ware)': '表面装修与洁具（瓷砖、地板、门、卫浴）',
  'Fixed Custom Carpentry (kitchen cabinets, wardrobes, vanities)': '定制固装木作（橱柜、衣柜、浴室柜）',
  'Home Furniture (sofas, dining sets, beds)': '家居家具（沙发、餐桌椅、床）',
  'Home Appliances (fridges, washing machines, TVs)': '家用电器（冰箱、洗衣机、电视）',
  'Décor & Accessories (curtains, lighting, mirrors)': '软装与配件（窗帘、灯具、镜子）',
  'EVERYTHING YOUR HOME NEEDS': '家居所需，一应俱全',
  'Surface finishes, custom carpentry, furniture, appliances and décor — every product your home interior needs, sourced from China and installed by our team.': '表面装修、定制木作、家具、电器与软装——您家居所需的一切产品，由我们从中国采购并完成安装。',
  'Ready to furnish your home?': '准备好装饰您的家了吗？',
  'Start with a paid 3D design — we handle everything from there.': '从付费三维设计开始——之后的一切都由我们来处理。',
  // ── Updated service names ───────────────────────────────────────────────────
  'Full Interior Decoration': '全案室内装修',
  'Custom 3D Interior Design': '定制三维室内设计',
  'Plasterboard & Ceiling': '石膏板与天花',
  'Furniture & Fittings': '家具与配件',
  'Full Interior Design': '全案室内设计',
  'OUR SERVICE': '我们的服务',
  'One company,': '一家公司，',
  'your complete home.': '您的全案家居。',
  'Design → Source → Install': '设计 → 采购 → 安装',
  'Our flagship service — Design → Source → Install': '我们的旗舰服务 — 设计 → 采购 → 安装',
  'End-to-end full-house interior finishing for newly completed residential buildings across Ghana.': '为加纳各地新竣工住宅提供端对端全屋室内精装服务。',
  'STEP 01': '第一步',
  'STEP 02': '第二步',
  'STEP 03': '第三步',
  'Pre-Interior Site Prep Support': '室内前期场地准备支持',
  'Paid Custom 3D Interior Design': '付费定制三维室内设计',
  'Full Material Sourcing + Turnkey Installation': '全材料采购 + 交钥匙安装',
  'Full Interior Decoration · Design → Source → Install': '全案室内装修 · 设计 → 采购 → 安装',
  'Start Your Project': '开始您的项目',
  'Continue': '继续',

  // ── Why us / reasons section ───────────────────────────────────────────────
  'Custom 3D Design': '定制三维设计',
  'End-to-End Sourcing': '端对端采购',
  'Turnkey Installation': '交钥匙安装',
  'Global Materials': '全球材料',

  // ── About page ─────────────────────────────────────────────────────────────
  'About Westline Future': '关于西线未来',
  'One company.': '一家公司。',
  'Your complete home.': '您的全案家居。',
  'Leadership': '领导团队',
  'The people behind the vision': '愿景背后的人',
  'CEO & Founding Partner': '首席执行官兼创始合伙人',
  'Founding Partner': '创始合伙人',
  'Accra Office': '阿克拉办公室',
  'China Headquarters': '中国总部',
  'Our People': '我们的团队',
  'The team behind the work': '工作背后的团队',
  'Ready to transform your home?': '准备好改造您的家居了吗？',
  'From 3D design to full installation — we handle every detail so you don\'t have to.': '从三维设计到全套安装，我们处理每一个细节，让您无后顾之忧。',
  'Contact Us': '联系我们',
  'Our Services': '我们的服务',
  '20+': '20+',
  'Years Combined Experience': '年综合经验',
  '100%': '100%',
  'Full-Home Projects': '全屋项目',
  '2': '2',
  'Office Locations': '办公地点',
  '5★': '5★',
  'Client Satisfaction': '客户满意度',

  // ── Contact page fields ────────────────────────────────────────────────────
  'First Name *': '名字 *',
  'Last Name': '姓氏',
  'Phone / WhatsApp *': '电话 / WhatsApp *',
  'Email Address': '电子邮件',
  'Main Service / Project Type *': '主要服务 / 项目类型 *',
  'Property Type': '物业类型',
  'Project Location *': '项目地点 *',
  'Approximate Budget': '预算范围',
  'Target Timeline': '目标时间',
  'Measurements Available?': '是否已有尺寸？',
  'Need CAD / 3D Rendering?': '是否需要三维效果图？',
  'Preferred Next Step': '首选下一步',
  'Inspiration Links / References': '参考链接 / 灵感图',
  'Project Description *': '项目描述 *',
  'Submit Project Intake': '提交项目需求',
  'Message received!': '消息已收到！',
  'Select a service…': '选择服务…',
  'Select budget range…': '选择预算范围…',
  'Select option…': '选择选项…',
  'Select preference…': '选择偏好…',
  'Select property type…': '选择物业类型…',
  'Select timeline…': '选择时间…',
  'Direct Contact': '直接联系',
  'Opening Hours': '营业时间',
  'Our Response Promise': '我们的响应承诺',
  'Usually replies within 1 hour': '通常在1小时内回复',
  'WhatsApp': 'WhatsApp',
  'Calls & SMS': '电话与短信',
  'Site visits by appointment': '预约现场参观',
  'Just ask.': '随时咨询。',

  // ── Services page ──────────────────────────────────────────────────────────
  'WHAT WE DO': '我们的服务',
  'What we cover': '服务范围',
  'OUR REACH': '我们的覆盖',
  'Serving all of Ghana': '服务于加纳全境',
  'Primary Location': '主要地点',
  'Engineering Scope': '工程范围',
  'Get Started': '立即开始',

  // ── Portfolio page ─────────────────────────────────────────────────────────
  'Selected Case Studies.': '精选案例。',
  'Case Studies.': '案例研究。',
  'AFTER': '完工后',
  'BEFORE': '施工前',
  'PLAN SIMILAR PROJECT': '规划类似项目',

  // ── Products / Order modal ─────────────────────────────────────────────────
  'Place Order': '下订单',
  'Confirm & Pay': '确认并付款',
  'Order Received!': '订单已收到！',
  'Your Name *': '您的姓名 *',
  'Your Name': '您的姓名',
  'Phone Number *': '电话号码 *',
  'Phone Number': '电话号码',
  'Delivery Address': '配送地址',
  'Notes (optional)': '备注（可选）',
  'Quantity': '数量',
  'Order via WhatsApp': '通过WhatsApp下单',
  'Submit Order Request': '提交订单请求',
  'Preparing checkout…': '正在准备结账…',
  'We\'ll call you within 24 hours to confirm.': '我们将在24小时内致电确认。',
  'Order Summary': '订单摘要',
  'Order Now': '立即订购',
  'Continue': '继续',
  'Building a full package?': '在筹备整套方案？',
  'Favorites Hub': '收藏中心',
  'Review and source your curated materials': '审核并采购您精选的材料',
  'Your Selected Items': '您选中的项目',
  'Items Selected': '项目已选中',
  'No products in this category yet': '此类别暂无产品',
  'Syncing Global Catalog...': '正在同步全球目录...',
  'Image Unavailable': '图片不可用',
  'Additional Sourcing Notes (Optional)': '附加采购备注（可选）',
  'Sourcing Information': '采购信息',
  'Technical Comparison': '技术对比',
  'Structural Glass Configuration': '结构玻璃配置',
  'Standard Westline specifications apply.': '适用西线未来标准规格。',
  'We can source any material from China — contact us for a custom order.': '我们可以从中国采购任何材料——请联系我们定制订单。',
  'Finish Selection': '表面处理选择',
  'Specifications': '规格参数',
  'Specs': '规格',
  'Product Overview': '产品概述',
  'From': '起',
  'Performance': '性能',
  'Email Address': '电子邮件',
  'Done': '完成',

  // ── Footer ─────────────────────────────────────────────────────────────────
  'Contact': '联系',
  'Select a tour': '选择参观',

  // ── General public UI ──────────────────────────────────────────────────────
  'Book Site Measurement': '预约现场测量',

  // ── Contact page — hero & intro ───────────────────────────────────────────
  'Get in Touch': '联系我们',
  "Let's build something": '让我们共同创造',
  'exceptional together.': '非凡之作。',
  'Submit a structured brief for design, sourcing, installation, or full project delivery. A technical specialist will qualify the next step within 24 hours.': '请提交设计、采购、安装或全项目交付的结构化需求表。技术专家将在24小时内评估下一步。',
  'Message on WhatsApp': '通过WhatsApp留言',
  'Project Enquiry': '项目咨询',
  'Complete the intake so we can assess scope, rendering needs, timeline, and budget before issuing any formal quote.': '请完整填写需求表，以便我们在出具正式报价前评估范围、渲染需求、时间计划和预算。',
  "We'll follow up within 24 hours. For urgent projects, WhatsApp us directly.": '我们将在24小时内跟进。紧急项目请直接通过WhatsApp联系我们。',
  'Failed to send. Please try WhatsApp or call us directly.': '发送失败。请通过WhatsApp或直接致电我们。',
  'Sending…': '发送中…',
  'Send via WhatsApp': '通过WhatsApp发送',
  'Your details are used only to respond to this enquiry.': '您的信息仅用于回复本次咨询。',

  // ── Contact page — form validation ────────────────────────────────────────
  'First name is required': '请输入名字',
  'Phone number is required': '请输入电话号码',
  'Enter a valid phone number': '请输入有效的电话号码',
  'Enter a valid email address': '请输入有效的电子邮件地址',
  'Select the main service or project type': '请选择主要服务或项目类型',
  'Project location is required': '请输入项目地点',
  'Tell us about your project': '请描述您的项目',
  'Message too long (max 2000 characters)': '消息过长（最多2000字符）',
  '(optional)': '（可选）',

  // ── Contact page — info panel ─────────────────────────────────────────────
  'Location': '地点',
  'Monday – Friday': '周一 – 周五',
  'Saturday': '周六',
  'Sunday': '周日',
  'Closed': '休息',
  'All enquiries receive a personal response within 24 hours — not an automated reply. For urgent projects, WhatsApp us directly for the fastest service.': '所有咨询均在24小时内获得个人回复，而非自动回复。紧急项目请直接通过WhatsApp联系我们，获得最快服务。',

  // ── Contact page — service & property options ──────────────────────────────
  'Full Interior Decoration (complete home)': '全案室内装修（完整家居）',
  'Other / Not Sure Yet': '其他 / 暂不确定',
  'Private Residence': '私人住宅',
  'Apartment / Rental Unit': '公寓 / 租赁单元',
  'Commercial Space': '商业空间',
  'Hotel / Hospitality': '酒店 / 餐饮',
  'Office / Corporate': '办公室 / 企业',
  'Developer / Multi-unit Project': '开发商 / 多单元项目',
  'Other': '其他',
  'Urgent — within 2 weeks': '紧急 — 2周内',
  '1 month': '1个月',
  '2–3 months': '2–3个月',
  '3–6 months': '3–6个月',
  'Flexible / planning stage': '灵活 / 规划阶段',
  'Yes': '是',
  'No': '否',
  'Not sure yet': '暂不确定',
  'Phone consultation': '电话咨询',
  'WhatsApp follow-up': 'WhatsApp跟进',
  'Site visit': '现场参观',
  'Showroom appointment': '展厅预约',
  'Below GH₵ 50,000': 'GH₵ 50,000以下',
  'Above GH₵ 1,000,000': 'GH₵ 1,000,000以上',
  'Prefer not to say': '不便透露',
  'Paste Pinterest, Instagram, product links, or notes about the style you want.': '粘贴Pinterest、Instagram、产品链接，或描述您想要的风格。',
  "Describe what you're looking to install — room type, dimensions if known, preferred finish, timeline…": '请描述您希望安装的内容——房间类型、已知尺寸、偏好材质、时间计划……',

  // ── Services page extra ───────────────────────────────────────────────────
  'Structural Glazing': '结构玻璃',
  'Aluminium Systems': '铝合金系统',
  'Full Bathroom Fit-out': '完整浴室装修',
  'Custom Kitchen': '定制厨房',
  'Wardrobe & Storage': '衣柜与收纳',
  'Tiles & Flooring Supply': '瓷砖与地面供应',
  'Door Systems': '门类系统',
  'Electrical & Smart': '电气与智能',
  'Plumbing & Sanitary': '管道与卫浴',
  'Accra': '阿克拉',
  'Kumasi': '库马西',
  'Takoradi': '塔科拉迪',
  'Koforidua': '科福里杜阿',
  'All of Ghana': '加纳全境',
  'Project Brief': '项目需求',

  // ── About page extra ──────────────────────────────────────────────────────
  'Our People': '我们的团队',
  'The team behind the work': '工作背后的团队',
  'Ready to transform your home?': '准备好改造您的家居了吗？',
  'From 3D design to full installation — we handle every detail so you don\'t have to.': '从三维设计到全套安装，我们处理每一个细节，让您无后顾之忧。',
  'Contact Us': '联系我们',
  'Our Services': '我们的服务',
};

const PUBLIC_ZH_ENTRIES = Object.entries(PUBLIC_ZH).sort((a, b) => b[0].length - a[0].length);

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

export function translatePublicDom(lang) {
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
    if (node.__publicOriginalText === undefined) {
      node.__publicOriginalText = node.nodeValue;
    }
    const nextVal = translatePublicText(node.__publicOriginalText, lang);
    if (node.nodeValue !== nextVal) node.nodeValue = nextVal;
  });

  document.querySelectorAll('[placeholder], [aria-label], [title]').forEach(el => {
    ['placeholder', 'aria-label', 'title'].forEach(attr => {
      if (!el.hasAttribute(attr)) return;
      const key = `publicOriginal${attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
      if (!el.dataset[key]) el.dataset[key] = el.getAttribute(attr);
      const nextVal = translatePublicText(el.dataset[key], lang);
      if (el.getAttribute(attr) !== nextVal) el.setAttribute(attr, nextVal);
    });
  });
}

/**
 * Drop this hook into any public page component that is lazy-loaded inside
 * a Suspense boundary. It guarantees the DOM-walker translation fires after
 * React finishes painting — even when the page first renders while lang is
 * already 'zh'.
 */
export function usePublicTranslation() {
  const { lang } = useContext(AppContext);
  useEffect(() => {
    const apply = () => translatePublicDom(lang === 'zh' ? 'zh' : 'en');
    // Two-pass: first after React commits, then a short delay to catch
    // any async content that renders in a second wave (images, Firestore data).
    const raf = requestAnimationFrame(apply);
    const t = setTimeout(apply, 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [lang]);
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

  const navigateToPublicPage = (pageId) => {
    setMenuOpen(false);

    const routeByPage = {
      home: '/',
      products: '/products',
      showcase: '/showcase',
      portfolio: '/portfolio',
      workflow: '/workflow',
    };

    const destination = routeByPage[pageId] || `/?page=${encodeURIComponent(pageId)}`;
    navigate(destination);
    if (setPage) setPage(pageId);
  };

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
          onClick={() => navigateToPublicPage('home')}
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
                <button key={l.id}
                  onMouseEnter={() => {
                    // Prefetch lazy page chunks on hover — makes click feel instant
                    if (l.id === 'contact') import('../pages/ContactPage');
                    else if (l.id === 'about') import('../pages/AboutPage');
                    else if (l.id === 'services') import('../pages/ServicesPage');
                    else if (l.id === 'portfolio') import('../pages/Portfolio');
                    else if (l.id === 'showcase') import('../pages/Showcase');
                  }}
                  onClick={() => navigateToPublicPage(l.id)}
                  style={{
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
            <div onClick={() => navigateToPublicPage('home')} style={{ cursor: 'pointer' }}>
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
                  onClick={() => navigateToPublicPage(l.id)}
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
  const { content } = useContext(AppContext);

  // CMS-driven capabilities list — falls back to hardcoded defaults
  const cmsServices = (content?.services || []).filter(s => s?.title);
  const capabilityIcons = [Layers, AppWindow, ShowerHead, ChefHat, Shirt, LayoutGrid, DoorOpen, Zap, Droplets];
  const capabilities = cmsServices.length > 0
    ? cmsServices.slice(0, 9).map((s, i) => ({ Icon: capabilityIcons[i % capabilityIcons.length], label: s.title }))
    : [
        { Icon: LayoutGrid, label: 'Surface Finishes & Fixtures' },
        { Icon: ChefHat,    label: 'Fixed Custom Carpentry'      },
        { Icon: Shirt,      label: 'Home Furniture'              },
        { Icon: Zap,        label: 'Home Appliances'             },
        { Icon: Layers,     label: 'Décor & Accessories'         },
      ];

  // CMS footer description — falls back to brand tagline then a generic line
  const footerDesc = content?.footer?.description
    || brand?.tagline
    || brand?.description
    || 'Global precision meets local delivery. Premium interior solutions for the world\'s most ambitious projects.';

  const navigateToPublicPage = (pageId) => {
    const routeByPage = {
      home: '/',
      products: '/products',
      showcase: '/showcase',
      portfolio: '/portfolio',
      workflow: '/workflow',
    };

    const destination = routeByPage[pageId] || `/?page=${encodeURIComponent(pageId)}`;
    navigate(destination);
    if (setPage) setPage(pageId);
  };

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
            <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, fontSize: 14 }}>{footerDesc}</p>
          </div>
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>Navigation</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Home', 'Services', 'Products', 'Showroom', 'Portfolio', 'About', 'Contact'].map(n => (
                <button key={n} onClick={() => {
                  const id = n === 'Showroom' ? 'showcase' : n.toLowerCase();
                  navigateToPublicPage(id);
                }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', textAlign: 'left', fontSize: 14 }}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>Capabilities</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {capabilities.map(({ Icon, label }) => (
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
        <div style={{ paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', flexDirection: mob ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>© {new Date().getFullYear()} {brand?.name || 'Westline Future'} Ltd. All rights reserved.</span>
          {(content?.footer?.links || []).filter(l => l.label && l.url).length > 0 && (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              {(content.footer.links).filter(l => l.label && l.url).map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 11 }}
                  onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                >{l.label}</a>
              ))}
            </div>
          )}
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Management Portal</button>
        </div>

      </div>
    </footer>
  );
}
