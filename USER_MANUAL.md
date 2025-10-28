# 📚 Pediatric Psychiatry Knowledge Base - User Manual

## 🎯 **System Overview**

The Pediatric Psychiatry Knowledge Base is an advanced, role-based platform designed to provide fluid access to comprehensive behavioral health information. Each user role has tailored access to ensure appropriate content delivery and functionality.

---

## 👥 **User Roles & Access Levels**

### **🏥 CTO/Admin Users**
**Full System Access & Management**

#### **What You Can Do:**
- **System Administration**: Manage all users, licenses, and content
- **User Management**: Create, modify, and deactivate user accounts
- **Content Management**: Add, edit, and organize knowledge base content
- **Analytics & Reporting**: Access system usage statistics and performance metrics
- **License Management**: Configure licensing tiers and BYOK settings
- **Full Knowledge Access**: Access all content categories and AI features

#### **How to Use:**

1. **Login**: Use admin credentials at `/login`
2. **Dashboard**: Access admin dashboard for system overview
3. **User Management**:
   ```
   Navigate to: Admin Panel → Users
   - View all users across tenants
   - Create new users with role assignment
   - Modify user permissions and licenses
   - Deactivate/reactivate accounts
   ```

4. **Content Management**:
   ```
   Navigate to: Admin Panel → Content
   - Add new knowledge cards
   - Edit existing content
   - Organize chapters and categories
   - Manage multilingual content
   ```

5. **System Monitoring**:
   ```
   Navigate to: Admin Panel → Analytics
   - View user activity reports
   - Monitor API usage statistics
   - Track content engagement metrics
   - Review system performance
   ```

#### **API Access for CTOs:**
```bash
# Get system health
curl -H "Authorization: Bearer YOUR_JWT" \
  "https://your-domain.com/api/health"

# Create new user
curl -X POST -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"User Name","role":"doctor"}' \
  "https://your-domain.com/api/users"

# View all users
curl -H "Authorization: Bearer YOUR_JWT" \
  "https://your-domain.com/api/admin/users"
```

---

### **👨‍⚕️ Doctor Users**
**Full Clinical Access**

#### **What You Can Do:**
- **Complete Knowledge Access**: All medical, therapeutic, educational, behavioral, and developmental content
- **Advanced AI Search**: BYOK-powered clinical decision support
- **Clinical Tools**: Diagnostic protocols, treatment guidelines, assessment tools
- **Patient Resources**: Generate handouts and educational materials for patients/families
- **Research Access**: Deep dive into evidence-based practices and clinical research

#### **How to Use:**

1. **Login & Setup**:
   ```
   1. Login with doctor credentials
   2. Configure BYOK (optional): Settings → AI Configuration
   3. Set up clinical preferences
   ```

2. **Browse Knowledge Base**:
   ```
   Navigate to: Knowledge Base → Chapters
   - Browse by category (Medical, Therapeutic, etc.)
   - Use chapter-by-chapter study mode
   - Access multilingual content (English/Arabic)
   ```

3. **Advanced Clinical Search**:
   ```bash
   # Example: Differential diagnosis query
   POST /api/content/advanced-search
   {
     "query": "8-year-old with attention issues and hyperactivity",
     "context": {
       "user_role": "doctor",
       "child_age": 8,
       "conditions": ["adhd", "anxiety"],
       "severity": "moderate"
     },
     "response_type": "guidance"
   }
   ```

4. **Generate Patient Materials**:
   ```bash
   # Create parent handout
   POST /api/content/advanced-search
   {
     "query": "ADHD management strategies for parents",
     "context": {
       "user_role": "doctor",
       "child_age": 8,
       "conditions": ["adhd"]
     },
     "response_type": "handout"
   }
   ```

#### **Clinical Workflow Example:**
1. **Assessment**: Search diagnostic criteria and assessment tools
2. **Treatment Planning**: Access evidence-based intervention protocols
3. **Family Education**: Generate parent handouts and educational materials
4. **Follow-up**: Use monitoring tools and progress tracking resources

---

### **👩‍⚕️ Therapist Users**
**Therapeutic Focus Access**

#### **What You Can Do:**
- **Therapeutic Content**: Access therapeutic, educational, behavioral, and developmental content
- **Session Planning**: AI-powered therapy session scripts and teleprompters
- **Intervention Tools**: Evidence-based therapeutic techniques and protocols
- **Family Resources**: Generate materials for parents and caregivers
- **Progress Tracking**: Access assessment and monitoring tools

#### **How to Use:**

1. **Session Preparation**:
   ```bash
   # Generate therapy session script
   POST /api/content/advanced-search
   {
     "query": "CBT techniques for childhood anxiety",
     "context": {
       "user_role": "therapist",
       "child_age": 10,
       "conditions": ["anxiety"],
       "severity": "moderate"
     },
     "response_type": "teleprompter"
   }
   ```

2. **Intervention Planning**:
   ```bash
   # Create structured intervention plan
   POST /api/content/advanced-search
   {
     "query": "Social skills training for autism",
     "context": {
       "user_role": "therapist",
       "child_age": 7,
       "conditions": ["autism"],
       "intervention_type": "therapy"
     },
     "response_type": "intervention"
   }
   ```

3. **Family Support Materials**:
   ```
   Navigate to: Search → Advanced Search
   - Select "handout" response type
   - Generate parent-friendly materials
   - Customize for specific family needs
   ```

#### **Therapy Session Workflow:**
1. **Pre-Session**: Use teleprompter for session structure
2. **During Session**: Reference intervention techniques
3. **Post-Session**: Generate homework materials for families
4. **Progress Review**: Access assessment tools and tracking resources

---

### **👨‍🏫 Educator Users**
**Educational Focus Access**

#### **What You Can Do:**
- **Educational Content**: Access educational and behavioral content
- **Classroom Strategies**: Environmental modifications and behavioral supports
- **Student Support**: Individual accommodation planning
- **Family Communication**: Resources for parent-teacher collaboration
- **Professional Development**: Access training materials and best practices

#### **How to Use:**

1. **Classroom Planning**:
   ```bash
   # Get classroom strategies
   POST /api/content/advanced-search
   {
     "query": "Classroom accommodations for ADHD student",
     "context": {
       "user_role": "educator",
       "child_age": 9,
       "conditions": ["adhd"]
     },
     "response_type": "guidance"
   }
   ```

2. **Individual Student Support**:
   ```
   Navigate to: Knowledge Base → Behavioral Interventions
   - Search specific behavioral challenges
   - Access evidence-based classroom strategies
   - Generate individualized support plans
   ```

3. **Parent Communication**:
   ```
   Use Advanced Search with "handout" type to create:
   - Home-school collaboration materials
   - Behavior tracking sheets
   - Progress communication tools
   ```

#### **Educational Workflow:**
1. **Assessment**: Identify student needs and challenges
2. **Planning**: Develop classroom accommodations and supports
3. **Implementation**: Apply evidence-based strategies
4. **Communication**: Share progress and strategies with families

---

### **👨‍👩‍👧‍👦 Parent Users**
**Family-Focused Access**

#### **What You Can Do:**
- **Educational Content**: Access parent-friendly educational materials
- **Home Strategies**: Practical guidance for managing behavioral challenges
- **Understanding Conditions**: Learn about your child's specific needs
- **Professional Communication**: Better understand professional recommendations
- **Resource Access**: Find local resources and support services

#### **How to Use:**

1. **Getting Started**:
   ```
   1. Login with parent credentials
   2. Browse: Knowledge Base → Educational Content
   3. Use simple search for specific topics
   ```

2. **Finding Help for Specific Issues**:
   ```bash
   # Ask practical questions
   POST /api/content/advanced-search
   {
     "query": "My child has meltdowns at bedtime, what can I do?",
     "context": {
       "user_role": "parent",
       "child_age": 6,
       "conditions": ["behavioral"],
       "severity": "moderate"
     },
     "response_type": "handout"
   }
   ```

3. **Understanding Professional Recommendations**:
   ```
   Navigate to: Search → Basic Search
   - Search for terms your doctor/therapist mentioned
   - Get parent-friendly explanations
   - Find practical implementation strategies
   ```

#### **Parent Journey:**
1. **Learn**: Understand your child's condition and needs
2. **Implement**: Apply evidence-based strategies at home
3. **Communicate**: Better collaborate with professionals
4. **Support**: Connect with resources and support networks

---

## 🔧 **Technical Features**

### **BYOK (Bring Your Own Key) Configuration**

All users can configure their own AI providers for enhanced personalization:

```bash
# Configure AI provider
POST /api/content/byok-config
{
  "provider": "gemini",
  "api_key": "your-gemini-api-key",
  "model_preferences": {
    "model": "gemini-pro",
    "temperature": 0.7,
    "max_tokens": 1000
  }
}
```

**Supported Providers:**
- **Gemini**: Google's advanced AI model
- **Grok**: X.AI's conversational AI
- **OpenAI**: GPT models for text generation
- **Claude**: Anthropic's AI assistant

### **Search Capabilities**

#### **Basic Search**
- Simple keyword search across all accessible content
- Category filtering
- Language selection (English/Arabic)

#### **Advanced Search**
- AI-powered contextual responses
- Role-specific personalization
- Multiple response types (guidance, intervention, handout, teleprompter)
- Medical accuracy boundaries with disclaimers

### **Content Organization**

**9 Core Chapters:**
1. **ADHD Assessment** - Diagnostic tools and protocols
2. **Anxiety Management** - Treatment strategies and interventions
3. **Autism Support** - Comprehensive support approaches
4. **Behavioral Interventions** - Evidence-based behavior modification
5. **Crisis Intervention** - Emergency protocols and safety planning
6. **Depression Screening** - Assessment tools and identification
7. **Family Therapy** - Systemic intervention approaches
8. **Sleep Hygiene** - Sleep-related behavioral strategies
9. **Social Skills** - Social development and training programs

---

## 🚀 **Getting Started Guide**

### **For New Users:**

1. **Receive Credentials**: Admin will provide login credentials
2. **First Login**: Access the platform at your organization's URL
3. **Profile Setup**: Complete your professional profile
4. **Explore Content**: Start with the Knowledge Base overview
5. **Configure AI** (Optional): Set up BYOK for personalized responses
6. **Start Searching**: Use basic search to explore relevant content

### **For Administrators:**

1. **System Setup**: Ensure proper deployment and configuration
2. **User Creation**: Add users with appropriate roles
3. **License Management**: Configure licensing tiers
4. **Content Review**: Verify knowledge base content is current
5. **Training**: Provide user training and support materials

---

## 📞 **Support & Resources**

### **Technical Support:**
- **System Issues**: Contact your IT administrator
- **Account Problems**: Contact your organization's admin
- **Feature Requests**: Submit through admin panel

### **Clinical Support:**
- **Content Questions**: Refer to evidence-based sources cited
- **Professional Guidance**: Consult with qualified healthcare professionals
- **Emergency Situations**: Follow your organization's crisis protocols

### **Training Resources:**
- **Video Tutorials**: Available in admin panel
- **User Guides**: Role-specific documentation
- **Best Practices**: Evidence-based usage recommendations

---

## ⚠️ **Important Disclaimers**

### **Medical Accuracy:**
- All AI-generated content is for educational purposes only
- Always consult qualified healthcare professionals for medical decisions
- Content is based on evidence-based practices but may not reflect latest research
- Individual cases may require specialized professional assessment

### **Professional Responsibility:**
- Users are responsible for applying content appropriately within their scope of practice
- Always follow professional ethical guidelines and organizational policies
- Maintain appropriate boundaries and confidentiality standards
- Document professional decisions and interventions appropriately

### **Data Security:**
- Protect login credentials and maintain account security
- Follow organizational data protection policies
- Report security concerns immediately to administrators
- Use BYOK features responsibly with secure API keys

---

**Built with ❤️ for pediatric mental health professionals and families**

*Version 1.0 - Last Updated: October 2025*