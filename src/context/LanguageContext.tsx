import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';

export const LANGUAGE_STORAGE_KEY = 'vi_sales_mnp_language';

export interface Translations {
  common: {
    appName: string;
    tagline: string;
    loading: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    update: string;
    close: string;
    call: string;
    whatsapp: string;
    copy: string;
    copied: string;
    search: string;
    all: string;
    status: string;
    operator: string;
    role: string;
    action: string;
  };
  header: {
    brandSubtitle: string;
    adminMode: string;
    salespersonMode: string;
    adminBadge: string;
    salesBadge: string;
    totalTeamLeads: string;
    myLeads: string;
    switchToSalesperson: string;
    switchToAdmin: string;
    connected: string;
    setup: string;
    refresh: string;
    logout: string;
    settings: string;
    allLeadsTab: string;
    teamTab: string;
    analyticsTab: string;
    switchLangTooltip: string;
  };
  securityBanner: {
    adminTitle: string;
    adminDesc: string;
    salespersonTitle: string;
    salespersonDesc: string;
    customerTitle: string;
    customerDesc: string;
    creatorUid: string;
  };
  firestoreWarning: {
    error: string;
    notConfigured: string;
    setupBtn: string;
  };
  stats: {
    totalLeads: string;
    totalSalespersonOnly: string;
    newLeads: string;
    simPortingLeads: string;
    bookingsMade: string;
    completedPorted: string;
    inProcess: string;
    ported: string;
    upcGenerated: string;
    successRate: string;
    leadsByYouSubtitle: string;
  };
  filters: {
    searchPlaceholder: string;
    allOperators: string;
    otherOperator: string;
    statusAll: string;
    statusNew: string;
    statusUpc: string;
    statusSim: string;
    statusEkyc: string;
    statusPorted: string;
    statusCancelled: string;
    leadsCountSingle: string;
    leadsCountPlural: string;
    clearFilters: string;
    exportCsv: string;
    filteredSalespersonPrefix: string;
    seeAll: string;
  };
  leadCard: {
    from: string;
    upc: string;
    exp: string;
    copyUpcTooltip: string;
    salesExecutive: string;
    uid: string;
    editTooltip: string;
    deleteTooltip: string;
    callTooltip: string;
    whatsappTooltip: string;
    waGreeting: string;
  };
  leadForm: {
    addTitle: string;
    editTitle: string;
    subtitle: string;
    section1Customer: string;
    customerName: string;
    customerNamePlaceholder: string;
    mobileNo: string;
    mobileNoPlaceholder: string;
    alternateNo: string;
    alternateNoPlaceholder: string;
    section2Porting: string;
    currentOperator: string;
    connectionType: string;
    prepaid: string;
    postpaid: string;
    corporate: string;
    selectedPlan: string;
    leadType: string;
    bookingStatus: string;
    bookingCount: string;
    otherPlanOption: string;
    customPlanLabel: string;
    customPlanPlaceholder: string;
    mnpStatus: string;
    section3Verification: string;
    upcCode: string;
    upcCodePlaceholder: string;
    upcExpiry: string;
    simNo: string;
    simNoPlaceholder: string;
    simType: string;
    section4Location: string;
    telecomCircle: string;
    address: string;
    addressPlaceholder: string;
    pincode: string;
    pincodePlaceholder: string;
    remarks: string;
    remarksPlaceholder: string;
    errNameReq: string;
    errPhoneReq: string;
    errFailed: string;
    saving: string;
    saveLeadBtn: string;
    updateLeadBtn: string;
  };
  leadDetails: {
    badge: string;
    callBtn: string;
    whatsappBtn: string;
    editTooltip: string;
    deleteTooltip: string;
    portingProgressTitle: string;
    nextStepBtn: string;
    completedBadge: string;
    customerDetailsTitle: string;
    customerNameLabel: string;
    phoneLabel: string;
    alternateLabel: string;
    mnpDetailsTitle: string;
    currentOpLabel: string;
    connectionLabel: string;
    planLabel: string;
    leadTypeLabel: string;
    bookingStatusLabel: string;
    bookingCountLabel: string;
    upcCodeLabel: string;
    upcExpiryLabel: string;
    simNumberLabel: string;
    simTypeLabel: string;
    circleAddressTitle: string;
    circleLabel: string;
    addressLabel: string;
    pincodeLabel: string;
    remarksTitle: string;
    executiveLabel: string;
    creatorUidLabel: string;
    leadIdLabel: string;
    stage1: string;
    stage1Desc: string;
    stage2: string;
    stage2Desc: string;
    stage3: string;
    stage3Desc: string;
    stage4: string;
    stage4Desc: string;
    stage5: string;
    stage5Desc: string;
    stNew: string;
    stNewDesc: string;
    stUpc: string;
    stUpcDesc: string;
    stSim: string;
    stSimDesc: string;
    stEkyc: string;
    stEkycDesc: string;
    stPorted: string;
    stPortedDesc: string;
    currentStatusTag: string;
    tapToChangePrompt: string;
    fromOperatorLabel: string;
    toOperatorLabel: string;
    upcCodeHeading: string;
    upcNotYetGenerated: string;
    validityPrefix: string;
    altNumberLabel: string;
    remarksLabel: string;
    salesExecLabel: string;
    copied: string;
    copy: string;
    waMessage: string;
  };
  deleteModal: {
    title: string;
    message: string;
    cancelBtn: string;
    deleteBtn: string;
    deletingBtn: string;
  };
  auth: {
    portalTitle: string;
    portalSubtitle: string;
    signInTab: string;
    signUpTab: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    roleLabel: string;
    customerRoleTitle: string;
    customerRoleDesc: string;
    customerMobileOtpTab: string;
    customerEmailTab: string;
    salesRoleTitle: string;
    salesRoleDesc: string;
    adminRoleTitle: string;
    adminRoleDesc: string;
    forgotPassword: string;
    sendingReset: string;
    resetSentSuccess: string;
    signInBtn: string;
    createAccountBtn: string;
    quickLoginHeading: string;
    quickSalesBtn: string;
    quickSalesSub: string;
    quickAdminBtn: string;
    quickAdminSub: string;
    demoBypassBtn: string;
    dbConfigBtn: string;
    footerText: string;
    errEmailPassRequired: string;
    errPassLength: string;
    errForgotEnterEmail: string;
  };
  adminUsers: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    filterAllRoles: string;
    filterAdmins: string;
    filterSales: string;
    totalUsersCount: string;
    colUser: string;
    colRole: string;
    colStats: string;
    colActions: string;
    adminBadge: string;
    salesBadge: string;
    statTotal: string;
    statPorted: string;
    statRate: string;
    btnMakeAdmin: string;
    btnMakeSales: string;
    btnViewLeads: string;
    noUsersFoundTitle: string;
    noUsersFoundDesc: string;
    roleChangedToast: string;
  };
  adminAnalytics: {
    title: string;
    subtitle: string;
    overallSuccessRate: string;
    totalLeadsCard: string;
    totalLeadsCardSub: string;
    upcCard: string;
    upcCardSub: string;
    inProgressCard: string;
    inProgressCardSub: string;
    portedCard: string;
    portedCardSub: string;
    operatorBreakdownTitle: string;
    operatorBreakdownSub: string;
    connectionTypesTitle: string;
    prepaidLabel: string;
    postpaidLabel: string;
    corporateLabel: string;
    leaderboardTitle: string;
    leaderboardSub: string;
    rankCol: string;
    executiveCol: string;
    totalLeadsCol: string;
    portedCol: string;
    conversionCol: string;
    actionCol: string;
    viewLeadsBtn: string;
  };
  settings: {
    modalTitle: string;
    modalSubtitle: string;
    languageHeading: string;
    languageSubheading: string;
    hindiName: string;
    hindiSubtitle: string;
    englishName: string;
    englishSubtitle: string;
    firebaseHeading: string;
    firebaseSubheading: string;
    activeStatusConnected: string;
    activeStatusDisconnected: string;
    apiKeyLabel: string;
    projectIdLabel: string;
    authDomainLabel: string;
    storageBucketLabel: string;
    messagingSenderIdLabel: string;
    appIdLabel: string;
    pasteJsonModeBtn: string;
    manualModeBtn: string;
    jsonPlaceholder: string;
    parseJsonBtn: string;
    saveConfigBtn: string;
    resetDefaultBtn: string;
    closeBtn: string;
    savedToast: string;
    resetConfirm: string;
    apiKeyRequiredError: string;
    jsonParseError: string;
  };
  notifications: {
    leadUpdated: string;
    leadAdded: string;
    leadDeleted: string;
    statusUpdatedPrefix: string;
    csvExportSuccess: string;
    noLeadsForExport: string;
    emptyStateTitle: string;
    emptyFilteredMsg: string;
    emptySalespersonMsg: string;
    emptyAdminMsg: string;
    addNewLeadFab: string;
    loadingLeads: string;
  };
}

const translations: Record<Language, Translations> = {
  hi: {
    common: {
      appName: 'Vi Sales MNP',
      tagline: 'वोडाफोन आइडिया एम.एन.पी. लीड्स पोर्टल',
      loading: 'लोड हो रहा है...',
      cancel: 'रद्द करें',
      save: 'सहेजें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      update: 'अपडेट करें',
      close: 'बंद करें',
      call: 'कॉल',
      whatsapp: 'WhatsApp',
      copy: 'कॉपी करें',
      copied: 'कॉपी हो गया!',
      search: 'खोजें',
      all: 'सभी',
      status: 'स्थिति',
      operator: 'ऑपरेटर',
      role: 'भूमिका',
      action: 'कार्रवाई',
    },
    header: {
      brandSubtitle: '4G / 5G Plus',
      adminMode: 'Admin Mode',
      salespersonMode: 'Salesperson (मेरी लीड्स)',
      adminBadge: 'Admin',
      salesBadge: 'Field Sales',
      totalTeamLeads: 'कुल {count} टीम लीड्स',
      myLeads: 'मेरी {count} लीड्स',
      switchToSalesperson: 'सेल्सपर्सन में बदलें',
      switchToAdmin: 'एडमिन में बदलें',
      connected: 'कनेक्टेड',
      setup: 'सेटअप',
      refresh: 'रीफ्रेश करें',
      logout: 'लॉगआउट',
      settings: 'सेटिंग्स',
      allLeadsTab: '📋 सभी लीड्स (All Leads)',
      teamTab: '👥 सेल्स टीम व यूज़र्स (Users & Roles)',
      analyticsTab: '📊 रिपोर्ट्स व एनालिटिक्स (Reports)',
      switchLangTooltip: 'भाषा बदलें (Switch to English)',
    },
    securityBanner: {
      adminTitle: 'Admin Console:',
      adminDesc: 'सभी {count} लीड्स एवं सम्पूर्ण सेल्स टीम का पूर्ण एक्सेस',
      salespersonTitle: 'Salesperson Dashboard:',
      salespersonDesc: 'केवल आपकी अपनी ({count}) लीड्स प्रदर्शित हैं (सुरक्षित डेटा पृथक्करण)',
      customerTitle: 'ग्राहक पोर्टल (Customer Portal):',
      customerDesc: 'आपके व्यक्तिगत Vi MNP पोर्टिंग अनुरोध व स्थिति ट्रैकिंग (Personal MNP Requests)',
      creatorUid: 'UID:',
    },
    firestoreWarning: {
      error: 'Firestore "leads" कनेक्शन त्रुटि। कृपया सेटिंग्स जांचें।',
      notConfigured: 'मौजूदा Firebase प्रोजेक्ट कनेक्ट करें और "leads" कलेक्शन सिंक करें।',
      setupBtn: 'सेटअप ⚙️',
    },
    stats: {
      totalLeads: 'कुल लीड्स',
      totalSalespersonOnly: 'केवल आपकी कुल लीड्स',
      newLeads: 'नई लीड्स',
      simPortingLeads: 'SIM / पोर्टिंग लीड्स',
      bookingsMade: 'बुकिंग्स (Bookings)',
      completedPorted: 'पूर्ण / पोर्टेड',
      inProcess: 'प्रक्रियाधीन (Pending)',
      ported: 'पोर्टेड',
      upcGenerated: 'UPC मिला',
      successRate: 'पोर्टिंग सफलता दर (Success Rate):',
      leadsByYouSubtitle: 'केवल आपके द्वारा बनाई गई लीड्स',
    },
    filters: {
      searchPlaceholder: 'नाम, 10-अंकीय मोबाइल नंबर, या UPC कोड से खोजें...',
      allOperators: 'सभी ऑपरेटर',
      otherOperator: 'अन्य',
      statusAll: 'सभी (All)',
      statusNew: 'नई लीड',
      statusUpc: 'UPC प्राप्त',
      statusSim: 'सिम आवंटित',
      statusEkyc: 'ई-केवाईसी',
      statusPorted: 'सफलतापूर्वक पोर्टेड',
      statusCancelled: 'रद्द',
      leadsCountSingle: 'लीड प्रदर्शित',
      leadsCountPlural: 'लीड्स प्रदर्शित',
      clearFilters: '(फ़िल्टर साफ़ करें)',
      exportCsv: 'CSV निर्यात (Export)',
      filteredSalespersonPrefix: 'फ़िल्टर: {name} की लीड्स',
      seeAll: 'सभी देखें',
    },
    leadCard: {
      from: 'From:',
      upc: 'UPC:',
      exp: 'Exp:',
      copyUpcTooltip: 'UPC कॉपी करें',
      salesExecutive: 'सेल्स एग्जीक्यूटिव:',
      uid: 'UID:',
      editTooltip: 'लीड संपादित करें (Edit Lead)',
      deleteTooltip: 'लीड हटाएं (Delete Lead)',
      callTooltip: 'कॉल करें',
      whatsappTooltip: 'व्हाट्सएप संदेश भेजें',
      waGreeting: 'नमस्ते {name} जी, Vi (Vodafone Idea) MNP टीम से संपर्क कर रहे हैं। आपके नंबर {phone} के Vi में पोर्टिंग के संबंध में सहायता हेतु।',
    },
    leadForm: {
      addTitle: 'नई MNP लीड जोड़ें (Add New Lead)',
      editTitle: 'लीड संपादित करें (Edit Lead)',
      subtitle: 'Vodafone Idea MNP Management',
      section1Customer: '1. ग्राहक का विवरण (Customer Information)',
      customerName: 'ग्राहक का नाम (Customer Name)',
      customerNamePlaceholder: 'उदा. राहुल शर्मा (Rahul Sharma)',
      mobileNo: 'मोबाइल नंबर (Porting Mobile No.)',
      mobileNoPlaceholder: '9876543210',
      alternateNo: 'वैकल्पिक नंबर (Alternate Mobile)',
      alternateNoPlaceholder: 'परिवार या ऑफिस नंबर (वैकल्पिक)',
      section2Porting: '2. पोर्टिंग एवं ऑपरेटर विवरण (Porting Details)',
      currentOperator: 'वर्तमान ऑपरेटर (Current Operator)',
      connectionType: 'Vi कनेक्शन का प्रकार (Type)',
      prepaid: 'Prepaid (प्रीपेड)',
      postpaid: 'Postpaid (पोस्टपेड)',
      corporate: 'Corporate / CUG',
      selectedPlan: 'Vi प्लान चुनें (Select Vi Plan)',
      leadType: 'लीड का प्रकार (Lead Type)',
      bookingStatus: 'बुकिंग स्थिति (Booking Status)',
      bookingCount: 'बुकिंग संख्या (Booking Count / SIMs)',
      otherPlanOption: 'अन्य कस्टम प्लान दर्ज करें (Other Plan)',
      customPlanLabel: 'कस्टम प्लान का नाम एवं मूल्य (Custom Plan Details)',
      customPlanPlaceholder: 'उदा. Vi Combo ₹359 (3GB/day + OTT)',
      mnpStatus: 'MNP वर्तमान स्थिति (Lead Status)',
      section3Verification: '3. MNP ट्रैकिंग और सत्यापन (Verification)',
      upcCode: 'UPC कोड (Porting Code - 8 Chars)',
      upcCodePlaceholder: 'उदा. AA123456 (PORT कोड)',
      upcExpiry: 'UPC समाप्ति तिथि (UPC Expiry Date)',
      simNo: 'Vi सिम नंबर / ICCID (Sim No)',
      simNoPlaceholder: 'सिम के अंतिम अंक',
      simType: 'सिम का प्रकार (Physical / eSIM)',
      section4Location: '4. क्षेत्र और टिप्पणी (Circle & Remarks)',
      telecomCircle: 'टेलीकॉम सर्किल (Telecom Circle)',
      address: 'पता / दुकान का नाम (Address / Area)',
      addressPlaceholder: 'दुकान या ग्राहक का पता',
      pincode: 'पिनकोड (Pincode)',
      pincodePlaceholder: '6-अंकीय पिनकोड',
      remarks: 'विशेष टिप्पणी / नोट्स (Remarks / Notes)',
      remarksPlaceholder: 'ग्राहक से बातचीत, डिलीवरी समय या अन्य आवश्यक जानकारी...',
      errNameReq: 'कृपया ग्राहक का नाम दर्ज करें (Customer name required)',
      errPhoneReq: 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें (10-digit mobile number required)',
      errFailed: 'लीड सहेजने में विफल। कृपया पुनः प्रयास करें।',
      saving: 'सहेज रहे हैं...',
      saveLeadBtn: 'लीड जोड़ें (Save Lead)',
      updateLeadBtn: 'अपडेट करें (Update Lead)',
    },
    leadDetails: {
      badge: 'Vi MNP Lead',
      callBtn: 'कॉल करें',
      whatsappBtn: 'WhatsApp',
      editTooltip: 'संपादित करें',
      deleteTooltip: 'हटाएं',
      portingProgressTitle: 'पोर्टिंग प्रगति चरण (Porting Status Progress)',
      nextStepBtn: 'अगला चरण:',
      completedBadge: 'सफलतापूर्वक पोर्टेड (Porting Completed)',
      customerDetailsTitle: 'ग्राहक का विवरण (Customer Information)',
      customerNameLabel: 'ग्राहक का नाम:',
      phoneLabel: 'मोबाइल नंबर:',
      alternateLabel: 'वैकल्पिक नंबर:',
      mnpDetailsTitle: 'पोर्टिंग व प्लान विवरण (Porting & Plan Details)',
      currentOpLabel: 'वर्तमान ऑपरेटर:',
      connectionLabel: 'कनेक्शन प्रकार:',
      planLabel: 'चुना गया प्लान:',
      leadTypeLabel: 'लीड प्रकार:',
      bookingStatusLabel: 'बुकिंग स्थिति:',
      bookingCountLabel: 'बुकिंग संख्या:',
      upcCodeLabel: 'UPC कोड:',
      upcExpiryLabel: 'समाप्ति तिथि:',
      simNumberLabel: 'Vi सिम नंबर:',
      simTypeLabel: 'सिम का प्रकार:',
      circleAddressTitle: 'सर्किल एवं पता (Location Details)',
      circleLabel: 'टेलीकॉम सर्किल:',
      addressLabel: 'पता / क्षेत्र:',
      pincodeLabel: 'पिनकोड:',
      remarksTitle: 'विशेष टिप्पणी (Remarks & Notes)',
      executiveLabel: 'सेल्स एग्जीक्यूटिव:',
      creatorUidLabel: 'Creator UID:',
      leadIdLabel: 'Lead ID:',
      stage1: '1. नई लीड',
      stage1Desc: 'लीड दर्ज की गई',
      stage2: '2. UPC प्राप्त',
      stage2Desc: 'PORT कोड जनरेट हुआ',
      stage3: '3. सिम आवंटित',
      stage3Desc: 'Vi सिम दिया गया',
      stage4: '4. ई-केवाईसी',
      stage4Desc: 'बायोमेट्रिक सत्यापन पूरा',
      stage5: '5. पोर्टेड',
      stage5Desc: 'सफलतापूर्वक एक्टिवेट',
      stNew: '1. नई लीड',
      stNewDesc: 'लीड दर्ज की गई',
      stUpc: '2. UPC प्राप्त',
      stUpcDesc: 'PORT कोड जनरेट हुआ',
      stSim: '3. सिम आवंटित',
      stSimDesc: 'Vi सिम दिया गया',
      stEkyc: '4. ई-केवाईसी',
      stEkycDesc: 'बायोमेट्रिक सत्यापन पूरा',
      stPorted: '5. पोर्टेड',
      stPortedDesc: 'सफलतापूर्वक एक्टिवेट',
      currentStatusTag: 'वर्तमान स्थिति',
      tapToChangePrompt: 'स्थिति अपडेट करने के लिए किसी भी चरण पर क्लिक करें',
      fromOperatorLabel: 'वर्तमान ऑपरेटर (From)',
      toOperatorLabel: 'नया नेटवर्क (To)',
      upcCodeHeading: 'UPC कोड विवरण',
      upcNotYetGenerated: 'UPC कोड उपलब्ध नहीं',
      validityPrefix: 'वैधता',
      altNumberLabel: 'वैकल्पिक नंबर:',
      remarksLabel: 'विशेष टिप्पणी (Remarks):',
      salesExecLabel: 'सेल्स एग्जीक्यूटिव:',
      copied: 'कॉपी हो गया!',
      copy: 'कॉपी करें',
      waMessage: 'नमस्ते {name} जी, मैं Vodafone Idea (Vi) से संपर्क कर रहा हूँ। आपका मोबाइल नंबर {phone} Vi में पोर्ट करने की प्रक्रिया के संदर्भ में।',
    },
    deleteModal: {
      title: 'लीड हटाएं? (Delete Lead)',
      message: 'क्या आप ग्राहक {name} (+91 {phone}) की MNP लीड को डेटाबेस से हमेशा के लिए हटाना चाहते हैं?',
      cancelBtn: 'रद्द करें (Cancel)',
      deleteBtn: 'हाँ, हटाएं (Delete)',
      deletingBtn: 'हटा रहे हैं...',
    },
    auth: {
      portalTitle: 'Vi Sales MNP',
      portalSubtitle: 'रोल-आधारित सुरक्षित MNP सेल्स लीड्स प्रबंधन प्रणाली (Role-Based Secure Portal)',
      signInTab: 'लॉगिन करें (Sign In)',
      signUpTab: 'नया खाता बनाएं (Sign Up)',
      nameLabel: 'पूरा नाम (Full Name)',
      namePlaceholder: 'उदा. राजेश शर्मा',
      emailLabel: 'ईमेल पता (Vi Email ID)',
      emailPlaceholder: 'rajesh.sales@vi.com या admin@vi.com',
      passwordLabel: 'पासवर्ड (Password)',
      passwordPlaceholder: 'कम से कम 6 अक्षर',
      roleLabel: 'सिस्टम भूमिका का चयन करें (Assign Role)',
      customerRoleTitle: 'ग्राहक (Customer Portal)',
      customerRoleDesc: 'नया SIM, MNP पोर्टिंग अनुरोध व स्थिति ट्रैकिंग',
      customerMobileOtpTab: 'मोबाइल OTP (Mobile OTP)',
      customerEmailTab: 'ईमेल / पासवर्ड (Email & Password)',
      salesRoleTitle: 'Sales Executive (फ़ील्ड सेल्स)',
      salesRoleDesc: 'केवल अपनी लीड्स देख और जोड़ सकेंगे',
      adminRoleTitle: 'Admin / Manager (प्रबंधक)',
      adminRoleDesc: 'पूरी टीम की सभी लीड्स और यूज़र्स का पूर्ण नियंत्रण',
      forgotPassword: 'पासवर्ड भूल गए? (Forgot Password)',
      sendingReset: 'रीसेट लिंक भेज रहे हैं...',
      resetSentSuccess: 'पासवर्ड रीसेट लिंक आपके ईमेल पर भेजा गया है।',
      signInBtn: 'लॉगिन करें (Sign In)',
      createAccountBtn: 'नया {role} खाता बनाएं',
      quickLoginHeading: 'त्वरित 1-क्लिक रोल लॉगिन (Quick 1-Click Role Login):',
      quickSalesBtn: 'Salesperson',
      quickSalesSub: '(केवल अपनी लीड्स)',
      quickAdminBtn: 'Admin Portal',
      quickAdminSub: '(सभी लीड्स + यूजर्स)',
      demoBypassBtn: 'बिना लॉगिन प्रीव्यू देखें (Demo Mode)',
      dbConfigBtn: 'Firebase सेटअप ⚙️',
      footerText: 'Vi Sales MNP • Vodafone Idea Limited • Zero-Trust Firestore Security',
      errEmailPassRequired: 'कृपया ईमेल और पासवर्ड दर्ज करें।',
      errPassLength: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
      errForgotEnterEmail: 'कृपया पासवर्ड रीसेट के लिए अपना ईमेल दर्ज करें।',
    },
    adminUsers: {
      title: 'सेल्स टीम व यूज़र्स प्रबंधन (Admin RBAC Portal)',
      subtitle: 'केवल एडमिन को सभी सेल्स एग्जीक्यूटिव्स, उनकी भूमिका और पोर्टिंग परफॉरमेंस का पूरा एक्सेस है।',
      searchPlaceholder: 'नाम, ईमेल या सर्किल से यूज़र खोजें...',
      filterAllRoles: 'सभी भूमिकाएं (All Roles)',
      filterAdmins: 'केवल एडमिन (Admins)',
      filterSales: 'केवल सेल्सपर्सन (Salespersons)',
      totalUsersCount: 'कुल पंजीकृत सदस्य:',
      colUser: 'यूज़र / एग्जीक्यूटिव',
      colRole: 'सिस्टम भूमिका (Role)',
      colStats: 'पोर्टिंग परफॉरमेंस',
      colActions: 'कार्रवाई (Actions)',
      adminBadge: 'ADMIN',
      salesBadge: 'SALES',
      statTotal: 'कुल लीड्स',
      statPorted: 'पोर्टेड',
      statRate: 'सफलता दर',
      btnMakeAdmin: 'Admin बनाएं',
      btnMakeSales: 'Salesperson बनाएं',
      btnViewLeads: 'लीड्स देखें',
      noUsersFoundTitle: 'कोई यूज़र नहीं मिला',
      noUsersFoundDesc: 'सर्च क्वेरी या फ़िल्टर के अनुसार कोई उपयोगकर्ता उपलब्ध नहीं है।',
      roleChangedToast: '{name} की भूमिका को {role} में बदल दिया गया है।',
    },
    adminAnalytics: {
      title: 'MNP सेल्स परफॉरमेंस एनालिटिक्स (Admin Reports)',
      subtitle: 'समस्त सेल्स एग्जीक्यूटिव्स, ऑपरेटर वाइज पोर्टिंग ट्रेंड्स एवं कनवर्शन फनल का समग्र विश्लेषण।',
      overallSuccessRate: 'समग्र सफलता दर',
      totalLeadsCard: 'कुल दर्ज लीड्स',
      totalLeadsCardSub: 'पूरी टीम द्वारा लॉग की गई',
      upcCard: 'UPC प्राप्त',
      upcCardSub: 'पोर्टिंग कोड जनरेटेड',
      inProgressCard: 'प्रक्रियाधीन लीड्स',
      inProgressCardSub: 'सिम / ईकेवाईसी स्टेज',
      portedCard: 'सफल पोर्टिंग (Active)',
      portedCardSub: 'पूर्णतः एक्टिवेटेड',
      operatorBreakdownTitle: 'स्रोत ऑपरेटर से Vi में माइग्रेशन (Source Operator Migration)',
      operatorBreakdownSub: 'ग्राहक किस नेटवर्क से वोडाफोन आइडिया (Vi) में आ रहे हैं:',
      connectionTypesTitle: 'कनेक्शन प्रकार विभाजन (Connection Distribution)',
      prepaidLabel: 'Prepaid',
      postpaidLabel: 'Postpaid',
      corporateLabel: 'Corporate / CUG',
      leaderboardTitle: 'सेल्स एग्जीक्यूटिव लीडरबोर्ड (Team Leaderboard)',
      leaderboardSub: 'सफल पोर्टिंग के आधार पर सेल्सपर्सन रैंकिंग:',
      rankCol: 'रैंक',
      executiveCol: 'एग्जीक्यूटिव',
      totalLeadsCol: 'कुल लीड्स',
      portedCol: 'सफल पोर्टेड',
      conversionCol: 'सफलता दर',
      actionCol: 'फ़िल्टर',
      viewLeadsBtn: 'लीड्स देखें ➔',
    },
    settings: {
      modalTitle: 'सेटिंग्स एवं फायरबेस कॉन्फ़िगरेशन',
      modalSubtitle: 'ऐप भाषा चयन एवं Firestore डेटाबेस सेटिंग्स',
      languageHeading: '🌐 भाषा विकल्प (Language Selection)',
      languageSubheading: 'अपनी पसंदीदा भाषा चुनें। यह ऐप रीस्टार्ट और लॉगआउट के बाद भी सुरक्षित रहेगी।',
      hindiName: 'हिन्दी (Hindi)',
      hindiSubtitle: 'संपूर्ण ऐप हिन्दी में देखें (Default)',
      englishName: 'English (अंग्रेज़ी)',
      englishSubtitle: 'View entire app in English',
      firebaseHeading: '🔥 Firestore डेटाबेस कॉन्फ़िगरेशन',
      firebaseSubheading: 'अपना मौजूदा Firebase प्रोजेक्ट कनेक्ट करें',
      activeStatusConnected: 'डेटाबेस सफलतापूर्वक कनेक्टेड है (Firestore Sync Active)',
      activeStatusDisconnected: 'डिफ़ॉल्ट स्थानीय मोड (कस्टम प्रोजेक्ट कनेक्ट करने हेतु नीचे विवरण भरें)',
      apiKeyLabel: 'API Key (apiKey)',
      projectIdLabel: 'Project ID (projectId)',
      authDomainLabel: 'Auth Domain (authDomain)',
      storageBucketLabel: 'Storage Bucket (storageBucket)',
      messagingSenderIdLabel: 'Messaging Sender ID (messagingSenderId)',
      appIdLabel: 'App ID (appId)',
      pasteJsonModeBtn: 'JSON कोड पेस्ट करें',
      manualModeBtn: 'मैनुअल फ़ील्ड्स भरें',
      jsonPlaceholder: 'यहाँ Firebase कंसोल से firebaseConfig ऑब्जेक्ट पेस्ट करें...',
      parseJsonBtn: 'JSON से मान लोड करें',
      saveConfigBtn: 'सेव करें एवं कनेक्ट करें (Save Settings)',
      resetDefaultBtn: 'डिफ़ॉल्ट पर रीसेट करें (Reset)',
      closeBtn: 'बंद करें (Close)',
      savedToast: 'कॉन्फ़िगरेशन सहेज लिया गया है।',
      resetConfirm: 'क्या आप कस्टम कॉन्फ़िगरेशन हटाकर डिफ़ॉल्ट पर रीसेट करना चाहते हैं?',
      apiKeyRequiredError: 'API Key और Project ID अनिवार्य हैं।',
      jsonParseError: 'JSON पार्स करने में त्रुटि:',
    },
    notifications: {
      leadUpdated: 'ग्राहक {name} की लीड अपडेट हो गई।',
      leadAdded: 'नई MNP लीड सफलतापूर्वक दर्ज की गई!',
      leadDeleted: 'लीड हटा दी गई (Lead deleted)',
      statusUpdatedPrefix: 'स्थिति अपडेट:',
      csvExportSuccess: 'लीड्स CSV डाउनलोड हो गई!',
      noLeadsForExport: 'निर्यात के लिए कोई लीड उपलब्ध नहीं है',
      emptyStateTitle: 'कोई लीड नहीं मिली',
      emptyFilteredMsg: 'आपके खोज या फ़िल्टर के अनुसार कोई MNP लीड नहीं मिली।',
      emptySalespersonMsg: 'आपने अभी तक कोई MNP लीड दर्ज नहीं की है। नीचे दिए गए बटन से अपनी पहली लीड जोड़ें।',
      emptyAdminMsg: 'अभी कोई MNP लीड दर्ज नहीं है। नीचे दिए गए बटन से नई लीड जोड़ें।',
      addNewLeadFab: '+ नई लीड जोड़ें',
      loadingLeads: 'लीड्स लोड हो रही हैं...',
    },
  },
  en: {
    common: {
      appName: 'Vi Sales MNP',
      tagline: 'Vodafone Idea MNP Leads Portal',
      loading: 'Loading...',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      update: 'Update',
      close: 'Close',
      call: 'Call',
      whatsapp: 'WhatsApp',
      copy: 'Copy',
      copied: 'Copied!',
      search: 'Search',
      all: 'All',
      status: 'Status',
      operator: 'Operator',
      role: 'Role',
      action: 'Action',
    },
    header: {
      brandSubtitle: '4G / 5G Plus',
      adminMode: 'Admin Mode',
      salespersonMode: 'Salesperson (My Leads)',
      adminBadge: 'Admin',
      salesBadge: 'Field Sales',
      totalTeamLeads: 'Total {count} Team Leads',
      myLeads: 'My {count} Leads',
      switchToSalesperson: 'Switch to Salesperson',
      switchToAdmin: 'Switch to Admin',
      connected: 'Connected',
      setup: 'Setup',
      refresh: 'Refresh',
      logout: 'Sign Out',
      settings: 'Settings',
      allLeadsTab: '📋 All Leads',
      teamTab: '👥 Sales Team & Users',
      analyticsTab: '📊 Reports & Analytics',
      switchLangTooltip: 'Switch to Hindi (हिन्दी में बदलें)',
    },
    securityBanner: {
      adminTitle: 'Admin Console:',
      adminDesc: 'Full access to all {count} leads and entire sales team',
      salespersonTitle: 'Salesperson Dashboard:',
      salespersonDesc: 'Only your own ({count}) leads shown (Secure data isolation)',
      customerTitle: 'Customer Portal:',
      customerDesc: 'Your personal Vi MNP porting requests and SIM orders',
      creatorUid: 'UID:',
    },
    firestoreWarning: {
      error: 'Firestore "leads" connection error. Please verify settings.',
      notConfigured: 'Connect your Firebase project to sync the "leads" collection.',
      setupBtn: 'Setup ⚙️',
    },
    stats: {
      totalLeads: 'Total Leads',
      totalSalespersonOnly: 'Total Leads by You',
      newLeads: 'New Leads',
      simPortingLeads: 'SIM / Porting Leads',
      bookingsMade: 'Bookings Made',
      completedPorted: 'Completed / Ported',
      inProcess: 'Pending / In-Process',
      ported: 'Ported',
      upcGenerated: 'UPC Generated',
      successRate: 'Porting Success Rate:',
      leadsByYouSubtitle: 'Created by this salesperson only',
    },
    filters: {
      searchPlaceholder: 'Search by customer name, 10-digit mobile, or UPC...',
      allOperators: 'All Operators',
      otherOperator: 'Other',
      statusAll: 'All',
      statusNew: 'New Lead',
      statusUpc: 'UPC Generated',
      statusSim: 'SIM Allocated',
      statusEkyc: 'E-KYC Done',
      statusPorted: 'Ported Successfully',
      statusCancelled: 'Cancelled',
      leadsCountSingle: 'lead displayed',
      leadsCountPlural: 'leads displayed',
      clearFilters: '(Clear filters)',
      exportCsv: 'Export CSV',
      filteredSalespersonPrefix: 'Filter: {name}\'s leads',
      seeAll: 'View All',
    },
    leadCard: {
      from: 'From:',
      upc: 'UPC:',
      exp: 'Exp:',
      copyUpcTooltip: 'Copy UPC code',
      salesExecutive: 'Sales Executive:',
      uid: 'UID:',
      editTooltip: 'Edit Lead',
      deleteTooltip: 'Delete Lead',
      callTooltip: 'Call customer',
      whatsappTooltip: 'Send WhatsApp message',
      waGreeting: 'Hello {name}, greetings from Vodafone Idea (Vi) MNP Team regarding porting your number {phone} to Vi.',
    },
    leadForm: {
      addTitle: 'Add New MNP Lead',
      editTitle: 'Edit Lead',
      subtitle: 'Vodafone Idea MNP Management',
      section1Customer: '1. Customer Information',
      customerName: 'Customer Name',
      customerNamePlaceholder: 'e.g. Rahul Sharma',
      mobileNo: 'Porting Mobile No.',
      mobileNoPlaceholder: '9876543210',
      alternateNo: 'Alternate Mobile No.',
      alternateNoPlaceholder: 'Family or office number (optional)',
      section2Porting: '2. Porting & Operator Details',
      currentOperator: 'Current Operator',
      connectionType: 'Vi Connection Type',
      prepaid: 'Prepaid',
      postpaid: 'Postpaid',
      corporate: 'Corporate / CUG',
      selectedPlan: 'Select Vi Plan',
      leadType: 'Lead Type',
      bookingStatus: 'Booking Status',
      bookingCount: 'Booking Count (SIMs)',
      otherPlanOption: 'Enter Custom Plan Details',
      customPlanLabel: 'Custom Plan Name & Price',
      customPlanPlaceholder: 'e.g. Vi Combo ₹359 (3GB/day + OTT)',
      mnpStatus: 'Current MNP Status',
      section3Verification: '3. MNP Tracking & Verification',
      upcCode: 'UPC Code (Porting Code - 8 Chars)',
      upcCodePlaceholder: 'e.g. AA123456 (PORT Code)',
      upcExpiry: 'UPC Expiry Date',
      simNo: 'Vi SIM No. / ICCID',
      simNoPlaceholder: 'Last digits of SIM card',
      simType: 'SIM Type (Physical / eSIM)',
      section4Location: '4. Circle & Remarks',
      telecomCircle: 'Telecom Circle',
      address: 'Address / Shop Name',
      addressPlaceholder: 'Shop or customer address',
      pincode: 'Pincode',
      pincodePlaceholder: '6-digit postal code',
      remarks: 'Remarks / Notes',
      remarksPlaceholder: 'Customer conversation notes, delivery slot, or remarks...',
      errNameReq: 'Customer name is required',
      errPhoneReq: 'Please enter a valid 10-digit mobile number',
      errFailed: 'Failed to save lead. Please try again.',
      saving: 'Saving...',
      saveLeadBtn: 'Save Lead',
      updateLeadBtn: 'Update Lead',
    },
    leadDetails: {
      badge: 'Vi MNP Lead',
      callBtn: 'Call',
      whatsappBtn: 'WhatsApp',
      editTooltip: 'Edit',
      deleteTooltip: 'Delete',
      portingProgressTitle: 'Porting Status Progress',
      nextStepBtn: 'Next Step:',
      completedBadge: 'Porting Completed (Active)',
      customerDetailsTitle: 'Customer Information',
      customerNameLabel: 'Customer Name:',
      phoneLabel: 'Mobile Number:',
      alternateLabel: 'Alternate No.:',
      mnpDetailsTitle: 'Porting & Plan Details',
      currentOpLabel: 'Current Operator:',
      connectionLabel: 'Connection Type:',
      planLabel: 'Selected Plan:',
      leadTypeLabel: 'Lead Type:',
      bookingStatusLabel: 'Booking Status:',
      bookingCountLabel: 'Booking Count:',
      upcCodeLabel: 'UPC Code:',
      upcExpiryLabel: 'Expiry Date:',
      simNumberLabel: 'Vi SIM Number:',
      simTypeLabel: 'SIM Type:',
      circleAddressTitle: 'Circle & Address',
      circleLabel: 'Telecom Circle:',
      addressLabel: 'Address / Area:',
      pincodeLabel: 'Pincode:',
      remarksTitle: 'Remarks & Notes',
      executiveLabel: 'Sales Executive:',
      creatorUidLabel: 'Creator UID:',
      leadIdLabel: 'Lead ID:',
      stage1: '1. New Lead',
      stage1Desc: 'Lead registered',
      stage2: '2. UPC Generated',
      stage2Desc: 'PORT code received',
      stage3: '3. SIM Allocated',
      stage3Desc: 'Vi SIM assigned',
      stage4: '4. E-KYC Done',
      stage4Desc: 'Biometrics verified',
      stage5: '5. Ported',
      stage5Desc: 'Activated successfully',
      stNew: '1. New Lead',
      stNewDesc: 'Lead registered',
      stUpc: '2. UPC Generated',
      stUpcDesc: 'PORT code received',
      stSim: '3. SIM Allocated',
      stSimDesc: 'Vi SIM assigned',
      stEkyc: '4. E-KYC Done',
      stEkycDesc: 'Biometrics verified',
      stPorted: '5. Ported',
      stPortedDesc: 'Activated successfully',
      currentStatusTag: 'Current Status',
      tapToChangePrompt: 'Click any step to update lead status',
      fromOperatorLabel: 'From Operator',
      toOperatorLabel: 'To Operator',
      upcCodeHeading: 'UPC Code Details',
      upcNotYetGenerated: 'UPC Not Yet Generated',
      validityPrefix: 'Valid Till',
      altNumberLabel: 'Alternate No.:',
      remarksLabel: 'Remarks & Notes:',
      salesExecLabel: 'Sales Executive:',
      copied: 'Copied!',
      copy: 'Copy',
      waMessage: 'Hello {name}, I am contacting you from Vodafone Idea (Vi) regarding porting your number {phone} to Vi.',
    },
    deleteModal: {
      title: 'Delete Lead?',
      message: 'Are you sure you want to permanently delete the MNP lead for {name} (+91 {phone}) from the database?',
      cancelBtn: 'Cancel',
      deleteBtn: 'Yes, Delete',
      deletingBtn: 'Deleting...',
    },
    auth: {
      portalTitle: 'Vi Sales MNP',
      portalSubtitle: 'Role-Based Secure MNP Leads Management System',
      signInTab: 'Sign In',
      signUpTab: 'Sign Up',
      nameLabel: 'Full Name',
      namePlaceholder: 'e.g. Rajesh Sharma',
      emailLabel: 'Vi Email ID',
      emailPlaceholder: 'rajesh.sales@vi.com or admin@vi.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Minimum 6 characters',
      roleLabel: 'Assign System Role',
      customerRoleTitle: 'Customer (Self-Service)',
      customerRoleDesc: 'New SIM, Porting Requests & Status Tracking',
      customerMobileOtpTab: 'Mobile OTP',
      customerEmailTab: 'Email & Password',
      salesRoleTitle: 'Sales Executive (Field Sales)',
      salesRoleDesc: 'Can view and manage only their own leads',
      adminRoleTitle: 'Admin / Manager',
      adminRoleDesc: 'Full control over all team leads and users',
      forgotPassword: 'Forgot Password?',
      sendingReset: 'Sending reset link...',
      resetSentSuccess: 'Password reset link sent to your email.',
      signInBtn: 'Sign In',
      createAccountBtn: 'Create New {role} Account',
      quickLoginHeading: 'Quick 1-Click Role Login:',
      quickSalesBtn: 'Salesperson',
      quickSalesSub: '(My Leads Only)',
      quickAdminBtn: 'Admin Portal',
      quickAdminSub: '(All Leads + Users)',
      demoBypassBtn: 'Preview Demo Mode',
      dbConfigBtn: 'Firebase Setup ⚙️',
      footerText: 'Vi Sales MNP • Vodafone Idea Limited • Zero-Trust Firestore Security',
      errEmailPassRequired: 'Please enter email and password.',
      errPassLength: 'Password must be at least 6 characters.',
      errForgotEnterEmail: 'Please enter your email to reset password.',
    },
    adminUsers: {
      title: 'Sales Team & Users Management (Admin RBAC Portal)',
      subtitle: 'Only administrators have full visibility into sales executives, roles, and porting performance.',
      searchPlaceholder: 'Search user by name, email, or circle...',
      filterAllRoles: 'All Roles',
      filterAdmins: 'Admins Only',
      filterSales: 'Salespersons Only',
      totalUsersCount: 'Total Registered Members:',
      colUser: 'User / Executive',
      colRole: 'System Role',
      colStats: 'Porting Performance',
      colActions: 'Actions',
      adminBadge: 'ADMIN',
      salesBadge: 'SALES',
      statTotal: 'Total Leads',
      statPorted: 'Ported',
      statRate: 'Success Rate',
      btnMakeAdmin: 'Make Admin',
      btnMakeSales: 'Make Salesperson',
      btnViewLeads: 'View Leads',
      noUsersFoundTitle: 'No Users Found',
      noUsersFoundDesc: 'No users match your search query or role filter.',
      roleChangedToast: 'Role for {name} changed to {role}.',
    },
    adminAnalytics: {
      title: 'MNP Sales Performance Analytics (Admin Reports)',
      subtitle: 'Comprehensive analysis of sales executives, operator porting trends, and conversion funnels.',
      overallSuccessRate: 'Overall Success Rate',
      totalLeadsCard: 'Total Leads Logged',
      totalLeadsCardSub: 'Logged by whole team',
      upcCard: 'UPC Generated',
      upcCardSub: 'Porting codes generated',
      inProgressCard: 'In Progress Leads',
      inProgressCardSub: 'SIM / E-KYC stage',
      portedCard: 'Successfully Ported',
      portedCardSub: 'Fully activated on Vi',
      operatorBreakdownTitle: 'Migration to Vi by Source Operator',
      operatorBreakdownSub: 'Which networks customers are switching from to Vi:',
      connectionTypesTitle: 'Connection Type Distribution',
      prepaidLabel: 'Prepaid',
      postpaidLabel: 'Postpaid',
      corporateLabel: 'Corporate / CUG',
      leaderboardTitle: 'Sales Executive Leaderboard',
      leaderboardSub: 'Ranked by successful port activations:',
      rankCol: 'Rank',
      executiveCol: 'Executive',
      totalLeadsCol: 'Total Leads',
      portedCol: 'Ported',
      conversionCol: 'Success Rate',
      actionCol: 'Filter',
      viewLeadsBtn: 'View Leads ➔',
    },
    settings: {
      modalTitle: 'Settings & Firebase Configuration',
      modalSubtitle: 'App Language Selection & Firestore Database Settings',
      languageHeading: '🌐 Language Selection (भाषा चयन)',
      languageSubheading: 'Select your preferred language. Stays saved across app restarts and logouts.',
      hindiName: 'हिन्दी (Hindi)',
      hindiSubtitle: 'View entire app in Hindi (Default)',
      englishName: 'English (English)',
      englishSubtitle: 'View entire app in English',
      firebaseHeading: '🔥 Firestore Database Configuration',
      firebaseSubheading: 'Connect your existing Firebase project',
      activeStatusConnected: 'Database connected successfully (Firestore Sync Active)',
      activeStatusDisconnected: 'Default local mode (Fill details below to connect custom project)',
      apiKeyLabel: 'API Key (apiKey)',
      projectIdLabel: 'Project ID (projectId)',
      authDomainLabel: 'Auth Domain (authDomain)',
      storageBucketLabel: 'Storage Bucket (storageBucket)',
      messagingSenderIdLabel: 'Messaging Sender ID (messagingSenderId)',
      appIdLabel: 'App ID (appId)',
      pasteJsonModeBtn: 'Paste JSON Code',
      manualModeBtn: 'Manual Fields',
      jsonPlaceholder: 'Paste firebaseConfig object from Firebase console here...',
      parseJsonBtn: 'Load from JSON',
      saveConfigBtn: 'Save Settings & Connect',
      resetDefaultBtn: 'Reset to Defaults',
      closeBtn: 'Close',
      savedToast: 'Settings and configuration saved successfully.',
      resetConfirm: 'Do you want to clear custom configuration and reset to defaults?',
      apiKeyRequiredError: 'API Key and Project ID are required.',
      jsonParseError: 'Error parsing JSON:',
    },
    notifications: {
      leadUpdated: 'Lead for customer {name} updated successfully.',
      leadAdded: 'New MNP lead saved successfully!',
      leadDeleted: 'Lead deleted successfully.',
      statusUpdatedPrefix: 'Status updated to:',
      csvExportSuccess: 'Leads CSV downloaded successfully!',
      noLeadsForExport: 'No leads available to export.',
      emptyStateTitle: 'No Leads Found',
      emptyFilteredMsg: 'No MNP leads match your search or filter criteria.',
      emptySalespersonMsg: 'You have not added any MNP leads yet. Click below to add your first lead.',
      emptyAdminMsg: 'No MNP leads currently logged in the system. Click below to add a lead.',
      addNewLeadFab: '+ Add New Lead',
      loadingLeads: 'Loading leads...',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'hi' || saved === 'en') {
        return saved;
      }
    } catch (e) {
      console.warn('Could not read saved language from localStorage', e);
    }
    return 'hi'; // Hindi default as per India context
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('Could not save language to localStorage', e);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
