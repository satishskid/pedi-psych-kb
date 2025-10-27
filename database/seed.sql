-- Seed data for pediatric psychology knowledge base

-- Insert tenants
INSERT INTO tenants (name, settings) VALUES 
('Default Hospital', '{"theme": "default", "features": ["export", "search", "admin"]}'),
('Children Medical Center', '{"theme": "pediatric", "features": ["export", "search"]}');

-- Insert users (password: 'password123' for all users)
INSERT INTO users (email, password_hash, name, role, tenant_id) VALUES 
('admin@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin', 1),
('editor@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Editor User', 'editor', 1),
('viewer@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Viewer User', 'viewer', 1),
('admin2@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Hospital Admin', 'admin', 2);

-- Insert sample cards
INSERT INTO cards (title_en, title_hi, title_ar, content_en, content_hi, content_ar, category, tags, metadata, created_by, tenant_id) VALUES 
('Anxiety Management for Children', 'बच्चों के लिए चिंता प्रबंधन', 'إدارة القلق للأطفال', 
 'Anxiety in children is a common mental health concern. Effective management strategies include cognitive-behavioral therapy, relaxation techniques, and family support. Early intervention is crucial for positive outcomes.',
 'बच्चों में चिंता एक सामान्य मानसिक स्वास्थ्य चिंता है। प्रभावी प्रबंधन रणनीतियों में संज्ञानात्मक-व्यवहारिक चिकित्सा, विश्राम तकनीक और पारिवारिक समर्थन शामिल हैं। सकारात्मक परिणामों के लिए शुरुआती हस्तक्षेक्ष महत्वपूर्ण है।',
 'القلق عند الأطفال هو أحد اهتمامات الصحة النفسية الشائعة. تتضمن استراتيجيات الإدارة الفعالة العلاج السلوكي المعرفي، وتقنيات الاسترخاء، ودعم الأسرة. التدخل المبكر أمر حاسم لتحقيق نتائج إيجابية.',
 'Anxiety Management',
 '["anxiety", "children", "therapy", "family"]',
 '{"age_group": "6-12", "difficulty": "moderate", "duration": "ongoing"}',
 1, 1),

('ADHD Assessment Guidelines', 'एडीएचडी मूल्यांकन दिशानिर्देश', 'إرشادات تقييم نقص الانتباه وفرط النشاط',
 'Comprehensive ADHD assessment involves multiple informants, standardized rating scales, and clinical interviews. Consider comorbid conditions and functional impairments in school, home, and social settings.',
 'व्यापक एडीएचडी मूल्यांकन में कई सूचनाकार, मानकीकृत रेटिंग पैमाने और नैदानिक साक्षात्कार शामिल हैं। स्कूल, घर और सामाजिक सेटिंग्स में सहवर्ती स्थितियों और कार्यात्मक हानियों पर विचार करें।',
 'يتضمن التقييم الشامل لاضطراب نقص الانتباه وفرط النشاط عدة مصادر للمعلومات، ومقاييس تصنيف موحدة، ومقابلات سريرية. النظر في الحالات المصاحبة والضعف الوظيفي في المدرسة والمنزل والإعدادات الاجتماعية.',
 'ADHD Assessment',
 '["adhd", "assessment", "guidelines", "evaluation"]',
 '{"age_group": "6-18", "difficulty": "moderate", "duration": "60-90min"}',
 1, 1),

('Depression Screening Tools', 'अवसाद स्क्रीनिंग उपकरण', 'أدوات فحص الاكتئاب',
 'Validated screening tools for pediatric depression include PHQ-9 modified for adolescents, CDI-2, and Beck Youth Inventories. Consider developmental factors and cultural context when interpreting results.',
 'बाल चिकित्सा अवसाद के लिए मान्यताप्राप्त स्क्रीनिंग उपकरणों में किशोरों के लिए संशोधित PHQ-9, CDI-2 और बेक यूथ इन्वेंटरी शामिल हैं। परिणामों की व्याख्या करते समय विकासात्मक कारकों और सांस्कृतिक संदर्भ पर विचार करें।',
 'تتضمن أدوات الفحص المتاحة للاكتئاب عند الأطفال PHQ-9 المعدل للمراهقين، وCDI-2، وBeck Youth Inventories. النظر في العوامل التنموية والسياق الثقافي عند تفسير النتائج.',
 'Depression Screening',
 '["depression", "screening", "tools", "assessment"]',
 '{"age_group": "12-18", "difficulty": "easy", "duration": "10-15min"}',
 2, 1),

('Autism Spectrum Disorder Support', 'ऑटिज्म स्पेक्ट्रम विकार समर्थन', 'دعم اضطراب طيف التوحد',
 'Comprehensive support for children with ASD requires individualized approaches. Focus on communication, social skills, sensory integration, and family education. Early intervention programs show significant benefits.',
 'एएसडी वाले बच्चों के लिए व्यापक समर्थन के लिए व्यक्तिगत दृष्टिकोण की आवश्यकता होती है। संचार, सामाजिक कौशल, संवेदी एकीकरण और पारिवारिक शिक्षा पर ध्यान दें। प्रारंभिक हस्तक्षेप कार्यक्रम महत्वपूर्ण लाभ दिखाते हैं।',
 'يتطلب الدعم الشامل للأطفال المصابين بطيف التوحد استخدامات فردية. التركيز على التواصل، والمهارات الاجتماعية، والتكامل الحسي، وتثقيف الأسرة. تُظهر برامج التدخل المبكر فوائد كبيرة.',
 'Autism Support',
 '["autism", "asd", "support", "intervention"]',
 '{"age_group": "3-18", "difficulty": "complex", "duration": "long-term"}',
 1, 1),

('Behavioral Interventions for ODD', 'विरोधात्मक अवज्ञा विकार के लिए व्यवहारिक हस्तक्षेप', 'التدخلات السلوكية لاضطراب العصيان المعارض',
 'Evidence-based behavioral interventions for Oppositional Defiant Disorder include parent management training, cognitive problem-solving skills training, and school-based interventions. Consistency across settings is essential.',
 'विरोधात्मक अवज्ञा विकार के लिए साक्ष्य-आधारित व्यवहारिक हस्तक्षेपों में माता-पिता प्रबंधन प्रशिक्षण, संज्ञानात्मक समस्या-समाधान कौशल प्रशिक्षण और स्कूल-आधारित हस्तक्षेप शामिल हैं। सेटिंग्स में संगति आवश्यक है।',
 'تتضمن التدخلات السلوكية القائمة على الأدلة لاضطراب العصيان المعارض تدريب إدارة الوالدين، وتدريب مهارات حل المشكلات المعرفية، والتدخلات المدرسية. الاتساق عبر الإعدادات أمر ضروري.',
 'Behavioral Interventions',
 '["odd", "behavioral", "interventions", "parent-training"]',
 '{"age_group": "6-12", "difficulty": "moderate", "duration": "12-16weeks"}',
 2, 1),

('Sleep Hygiene for Children', 'बच्चों के लिए स्वच्छता', 'نظافة النوم للأطفال',
 'Good sleep hygiene is crucial for children mental health and development. Establish consistent bedtime routines, limit screen time before bed, create comfortable sleep environment, and address any underlying sleep disorders.',
 'बच्चों के मानसिक स्वास्थ्य और विकास के लिए अच्छी नींद की स्वच्छता महत्वपूर्ण है। संगत सोने के समय की दिनचर्या स्थापित करें, सोने से पहले स्क्रीन समय सीमित करें, आरामदायक नींद का वातावरण बनाएं और किसी भी अंतर्निहित नींद विकार को संबोधित करें।',
 'نظافة النوم الجيدة أمر حاسم لصحة الأطفال النفسية وتطورهم. أنشئ روتينات منتظمة لوقت النوم، وحدد وقت الشاشة قبل النوم، وقم بإنشاء بيئة نوم مريحة، وعالج أي اضطرابات نوم كامنة.',
 'Sleep Hygiene',
 '["sleep", "hygiene", "children", "bedtime"]',
 '{"age_group": "3-12", "difficulty": "easy", "duration": "ongoing"}',
 1, 1),

('Social Skills Training', 'सामाजिक कौशल प्रशिक्षण', 'تدريب المهارات الاجتماعية',
 'Structured social skills training helps children develop appropriate social behaviors. Focus on communication, empathy, conflict resolution, and friendship skills. Use role-playing and group activities for practice.',
 'संरचित सामाजिक कौशल प्रशिक्षण बच्चों को उपयुक्त सामाजिक व्यवहार विकसित करने में मदद करता है। संचार, सहानुभूति, संघर्ष समाधान और मित्रता कौशल पर ध्यान दें। अभ्यास के लिए भूमिका-निभाना और समूह गतिविधियों का उपयोग करें।',
 'يساعد تدريب المهارات الاجتماعية المنظمة الأطفال على تطوير سلوكيات اجتماعية مناسبة. التركيز على التواصل، والتعاطف، وحل النزاعات، ومهارات الصداقة. استخدم تمثيل الأدوار والأنشطة الجماعية للممارسة.',
 'Social Skills',
 '["social-skills", "communication", "empathy", "training"]',
 '{"age_group": "6-16", "difficulty": "moderate", "duration": "8-12weeks"}',
 2, 1),

('Family Therapy Approaches', 'पारिवारिक चिकित्सा दृष्टिकोण', 'أساليب العلاج الأسري',
 'Family therapy approaches for pediatric mental health include structural family therapy, strategic family therapy, and solution-focused brief therapy. Address family dynamics, communication patterns, and systemic issues.',
 'बाल मानसिक स्वास्थ्य के लिए पारिवारिक चिकित्सा दृष्टिकोणों में संरचनात्मक पारिवारिक चिकित्सा, रणनीतिक पारिवारिक चिकित्सा और समाधान-केंद्रित संक्षिप्त चिकित्सा शामिल हैं। पारिवारिक गतिशीलता, संचार पैटर्न और प्रणालीगत मुद्दों को संबोधित करें।',
 'تتضمن أساليب العلاج الأسري لصحة الأطفال النفسية العلاج الأسري البنيوي، والعلاج الأسري الإستراتيجي، والعلاج الموجز الموجه نحو الحل. معالجة ديناميكيات الأسرة، وأنماط التواصل، والقضايا النظامية.',
 'Family Therapy',
 '["family-therapy", "structural", "strategic", "systemic"]',
 '{"age_group": "all-ages", "difficulty": "complex", "duration": "ongoing"}',
 1, 1),

('Crisis Intervention Protocols', 'संकट हस्तक्षेम प्रोटोकॉल', 'بروتوكولات التدخل في الأزمات',
 'Crisis intervention protocols for pediatric mental health emergencies. Include risk assessment, safety planning, de-escalation techniques, and coordination with emergency services. Document thoroughly and follow up appropriately.',
 'बाल मानसिक स्वास्थ्य आपातकालीन स्थितियों के लिए संकट हस्तक्षेम प्रोटोकॉल। जोखिम आकलन, सुरक्षा योजना, डी-एस्केलेशन तकनीक और आपातकालीन सेवाओं के साथ समन्वय शामिल करें। पूरी तरह से दस्तावेज़ करें और उचित रूप से अनुवर्ती करें।',
 'بروتوكولات التدخل في الأزمات لحالات الطوارئ النفسية للأطفال. تضمين تقييم المخاطر، وتخطيط السلامة، وتقنيات تهدئة التوتر، والتنسيق مع خدمات الطوارئ. توثيق شامل ومتابعة مناسبة.',
 'Crisis Intervention',
 '["crisis", "intervention", "emergency", "safety"]',
 '{"age_group": "all-ages", "difficulty": "critical", "duration": "immediate"}',
 1, 1);

-- Insert sample policies
INSERT INTO policies (name, description, resource, action, conditions, tenant_id, created_by) VALUES 
('Admin Full Access', 'Administrators have full access to all resources', '*', '*', '{"role": "admin"}', 1, 1),
('Editor Content Access', 'Editors can read and modify content', 'cards', 'read,write', '{"role": "editor"}', 1, 1),
('Viewer Read Only', 'Viewers can only read content', 'cards', 'read', '{"role": "viewer"}', 1, 1),
('Export Permission', 'Users can export content based on role', 'export', 'create', '{"role": ["admin", "editor"]}', 1, 1),
('Search Access', 'All authenticated users can search', 'search', 'read', '{"authenticated": true}', 1, 1),
('Tenant Isolation', 'Users can only access their tenant data', '*', '*', '{"tenant_id": "user.tenant_id"}', 1, 1);