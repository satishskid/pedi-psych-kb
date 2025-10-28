# 👑 Admin User Management Guide

## 📋 **Overview**

This guide provides comprehensive instructions for administrators to manage users, content, and system operations in the Pediatric Psychiatry Knowledge Base system.

---

## 🎯 **Admin Responsibilities**

### **System Administration**
- User account creation and management
- Role assignment and permissions
- License management and monitoring
- Content oversight and quality control
- System health monitoring
- Security and compliance management

### **User Management**
- Onboard new users across all roles
- Manage user permissions and access levels
- Handle user account issues and password resets
- Monitor user activity and engagement
- Deactivate or remove user accounts when needed

### **Content Management**
- Review and approve new content additions
- Maintain content accuracy and relevance
- Manage multilingual content translations
- Organize knowledge base structure
- Monitor content usage and effectiveness

---

## 👥 **User Creation & Management**

### **Creating New Users**

#### **Method 1: Web Interface (Recommended)**

1. **Login as Admin**
   - Navigate to your deployment URL
   - Login with admin credentials
   - Access the Admin Dashboard

2. **Navigate to User Management**
   ```
   Admin Dashboard → Users → Add New User
   ```

3. **Fill User Information**
   - **Email**: User's professional email address
   - **Full Name**: Complete name for identification
   - **Role**: Select appropriate role (doctor, therapist, educator, parent)
   - **Organization/Tenant**: Assign to appropriate organization
   - **Initial Password**: System will generate or allow custom password

4. **Send Credentials**
   - System can email credentials automatically
   - Or provide credentials manually to user
   - Include login instructions and user manual link

#### **Method 2: API Creation (Bulk Operations)**

```bash
#!/bin/bash
# bulk_user_creation.sh

API_URL="https://your-domain.com"
ADMIN_JWT="your-admin-jwt-token"

# Function to create user
create_user() {
  local email=$1
  local name=$2
  local role=$3
  local tenant_id=${4:-1}
  
  curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"name\": \"$name\",
      \"role\": \"$role\",
      \"tenant_id\": $tenant_id
    }" \
    "$API_URL/api/users"
}

# Create hospital staff
create_user "dr.smith@hospital.com" "Dr. Sarah Smith" "doctor" 1
create_user "therapist.jones@hospital.com" "Mike Jones, LCSW" "therapist" 1
create_user "nurse.wilson@hospital.com" "Lisa Wilson, RN" "educator" 1

# Create school district users
create_user "counselor@school.edu" "Jane Counselor" "therapist" 2
create_user "teacher@school.edu" "Bob Teacher" "educator" 2

# Create parent users
create_user "parent1@family.com" "Parent One" "parent" 1
create_user "parent2@family.com" "Parent Two" "parent" 1
```

#### **Method 3: CSV Bulk Import**

1. **Prepare CSV File** (`users_import.csv`):
```csv
email,name,role,tenant_id,organization
dr.smith@hospital.com,Dr. Sarah Smith,doctor,1,City Hospital
therapist.jones@hospital.com,Mike Jones LCSW,therapist,1,City Hospital
counselor@school.edu,Jane Counselor,therapist,2,School District
teacher@school.edu,Bob Teacher,educator,2,School District
parent1@family.com,Parent One,parent,1,Individual
```

2. **Use Import Script**:
```bash
#!/bin/bash
# import_users.sh

API_URL="https://your-domain.com"
ADMIN_JWT="your-admin-jwt-token"
CSV_FILE="users_import.csv"

# Skip header line and process each user
tail -n +2 "$CSV_FILE" | while IFS=, read -r email name role tenant_id organization; do
  echo "Creating user: $email"
  
  curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"name\": \"$name\",
      \"role\": \"$role\",
      \"tenant_id\": $tenant_id,
      \"organization\": \"$organization\"
    }" \
    "$API_URL/api/users"
  
  echo "User created: $email"
  sleep 1  # Rate limiting
done
```

### **User Role Definitions**

#### **👨‍⚕️ Doctor**
- **Access**: All content categories (medical, therapeutic, educational, behavioral, developmental)
- **Features**: Advanced AI search, clinical tools, patient handouts, research access
- **Use Cases**: Clinical decision support, patient education, treatment planning
- **Typical Users**: Pediatricians, child psychiatrists, developmental specialists

#### **👩‍⚕️ Therapist**
- **Access**: Therapeutic, educational, behavioral, developmental content
- **Features**: Session planning tools, teleprompters, intervention plans, family resources
- **Use Cases**: Therapy session preparation, intervention planning, family support
- **Typical Users**: Licensed therapists, counselors, social workers, psychologists

#### **👨‍🏫 Educator**
- **Access**: Educational and behavioral content
- **Features**: Classroom strategies, student support tools, parent communication resources
- **Use Cases**: Classroom management, student accommodations, parent-teacher collaboration
- **Typical Users**: Teachers, school counselors, special education coordinators

#### **👨‍👩‍👧‍👦 Parent**
- **Access**: Educational content only
- **Features**: Family-focused guidance, practical home strategies, understanding resources
- **Use Cases**: Home behavior management, understanding child's needs, professional communication
- **Typical Users**: Parents, caregivers, family members

#### **👑 Admin**
- **Access**: Full system access and management capabilities
- **Features**: User management, content administration, system monitoring, analytics
- **Use Cases**: System administration, user onboarding, content oversight
- **Typical Users**: IT administrators, clinical directors, system managers

---

## 🏥 **Organization & Tenant Management**

### **Multi-Tenant Setup**

#### **Organization Types**

1. **Hospital/Healthcare System**
   ```bash
   # Create hospital tenant
   curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "City Children Hospital",
       "type": "healthcare",
       "settings": {
         "max_users": 100,
         "features": ["advanced_search", "byok", "analytics"]
       }
     }' \
     "$API_URL/api/tenants"
   ```

2. **School District**
   ```bash
   # Create school district tenant
   curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Metro School District",
       "type": "education",
       "settings": {
         "max_users": 50,
         "features": ["basic_search", "educational_content"]
       }
     }' \
     "$API_URL/api/tenants"
   ```

3. **Private Practice**
   ```bash
   # Create private practice tenant
   curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "ABC Therapy Center",
       "type": "private_practice",
       "settings": {
         "max_users": 10,
         "features": ["advanced_search", "teleprompter"]
       }
     }' \
     "$API_URL/api/tenants"
   ```

### **User Assignment to Organizations**

```bash
# Assign user to specific tenant
curl -X PUT -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": 2,
    "role": "doctor"
  }' \
  "$API_URL/api/users/user-id/tenant"
```

---

## 📊 **User Monitoring & Analytics**

### **User Activity Dashboard**

#### **Key Metrics to Monitor**
- **Login Frequency**: Track user engagement
- **Content Usage**: Most accessed chapters and topics
- **Search Patterns**: Popular queries and search success rates
- **Feature Utilization**: BYOK usage, advanced search adoption
- **Role-Based Usage**: Usage patterns by user role

#### **Monitoring Queries**

```bash
# Get user activity summary
curl -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/analytics/users"

# Get content usage statistics
curl -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/analytics/content"

# Get search analytics
curl -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/analytics/search"
```

### **User Support & Troubleshooting**

#### **Common User Issues**

1. **Login Problems**
   ```bash
   # Reset user password
   curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "user-id",
       "new_password": "temporary_password_123"
     }' \
     "$API_URL/api/admin/users/reset-password"
   ```

2. **Access Issues**
   ```bash
   # Check user permissions
   curl -H "Authorization: Bearer $ADMIN_JWT" \
     "$API_URL/api/admin/users/user-id/permissions"
   
   # Update user role
   curl -X PUT -H "Authorization: Bearer $ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{"role": "therapist"}' \
     "$API_URL/api/users/user-id"
   ```

3. **BYOK Configuration Issues**
   ```bash
   # Check user's BYOK settings
   curl -H "Authorization: Bearer $ADMIN_JWT" \
     "$API_URL/api/admin/users/user-id/byok-config"
   ```

---

## 📚 **Content Management**

### **Content Oversight**

#### **Content Review Process**
1. **Monitor New Content**: Review user-generated content requests
2. **Quality Assurance**: Ensure medical accuracy and appropriateness
3. **Multilingual Support**: Coordinate translations and cultural adaptations
4. **Content Updates**: Keep information current with latest research

#### **Content Management Tasks**

```bash
# Get content statistics
curl -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/content/stats"

# Review pending content
curl -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/content/pending"

# Approve content
curl -X PUT -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}' \
  "$API_URL/api/admin/content/content-id/approve"
```

### **Knowledge Base Maintenance**

#### **Regular Maintenance Tasks**
- **Content Audits**: Quarterly review of all content
- **Usage Analysis**: Identify most/least used content
- **Gap Analysis**: Identify missing content areas
- **User Feedback**: Review and incorporate user suggestions

---

## 🔐 **Security & Compliance**

### **User Security Management**

#### **Security Best Practices**
1. **Password Policies**: Enforce strong password requirements
2. **Account Monitoring**: Monitor for suspicious activity
3. **Access Reviews**: Regular review of user permissions
4. **Audit Logging**: Maintain comprehensive audit trails

#### **Security Monitoring**

```bash
# Get security audit log
curl -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/security/audit-log"

# Check failed login attempts
curl -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/security/failed-logins"

# Review user permissions
curl -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/security/permissions-review"
```

### **Compliance Management**

#### **HIPAA Compliance (Healthcare Organizations)**
- **User Training**: Ensure all users understand HIPAA requirements
- **Access Controls**: Implement appropriate access restrictions
- **Audit Trails**: Maintain detailed logs of all system access
- **Data Protection**: Ensure proper handling of patient information

#### **FERPA Compliance (Educational Organizations)**
- **Student Privacy**: Protect student information in educational settings
- **Access Limitations**: Restrict access to appropriate educational personnel
- **Consent Management**: Handle parental consent requirements
- **Record Keeping**: Maintain appropriate educational records

---

## 📈 **System Optimization**

### **Performance Monitoring**

#### **Key Performance Indicators**
- **Response Times**: API and page load times
- **User Satisfaction**: User feedback and engagement metrics
- **System Uptime**: Availability and reliability metrics
- **Resource Usage**: Database and server resource utilization

#### **Optimization Tasks**

```bash
# Get system performance metrics
curl -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/system/performance"

# Database optimization
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/system/optimize-database"

# Clear system caches
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_URL/api/admin/system/clear-cache"
```

---

## 🎓 **User Training & Onboarding**

### **New User Onboarding Process**

#### **Step 1: Account Creation**
1. Create user account with appropriate role
2. Send welcome email with login credentials
3. Provide user manual and training materials

#### **Step 2: Initial Training**
1. Schedule orientation session
2. Demonstrate key features for their role
3. Provide hands-on practice time
4. Answer questions and address concerns

#### **Step 3: Ongoing Support**
1. Regular check-ins during first month
2. Advanced training sessions for power users
3. Feedback collection and system improvements
4. Peer mentoring programs

### **Training Resources**

#### **Role-Specific Training Materials**
- **Doctors**: Clinical decision support features, patient handout generation
- **Therapists**: Session planning tools, teleprompter usage, intervention planning
- **Educators**: Classroom strategies, student support tools, parent communication
- **Parents**: Basic navigation, finding relevant information, understanding professional recommendations

#### **Training Delivery Methods**
- **Live Sessions**: Interactive training with Q&A
- **Video Tutorials**: Self-paced learning modules
- **Documentation**: Comprehensive user manuals and guides
- **Peer Support**: User community and mentoring programs

---

## 📞 **Support & Maintenance**

### **Regular Maintenance Schedule**

#### **Daily Tasks**
- [ ] Monitor system health and performance
- [ ] Review user activity and issues
- [ ] Check for security alerts
- [ ] Respond to user support requests

#### **Weekly Tasks**
- [ ] Review user analytics and usage patterns
- [ ] Update content as needed
- [ ] Conduct security reviews
- [ ] Plan user training sessions

#### **Monthly Tasks**
- [ ] Comprehensive system performance review
- [ ] User access and permission audit
- [ ] Content quality and accuracy review
- [ ] System backup and disaster recovery testing

#### **Quarterly Tasks**
- [ ] Complete security audit
- [ ] User satisfaction survey
- [ ] System capacity planning
- [ ] Strategic planning and roadmap updates

### **Emergency Procedures**

#### **System Outage Response**
1. **Immediate Response**: Acknowledge issue and communicate with users
2. **Diagnosis**: Identify root cause and impact assessment
3. **Resolution**: Implement fix and verify system restoration
4. **Communication**: Update users on resolution and any follow-up actions
5. **Post-Incident**: Conduct review and implement preventive measures

#### **Security Incident Response**
1. **Detection**: Identify and confirm security incident
2. **Containment**: Isolate affected systems and prevent further damage
3. **Investigation**: Determine scope and impact of incident
4. **Recovery**: Restore systems and implement additional security measures
5. **Reporting**: Document incident and notify appropriate authorities if required

---

## 📋 **Admin Checklist Templates**

### **New User Onboarding Checklist**
- [ ] User account created with correct role
- [ ] Welcome email sent with credentials
- [ ] User manual and training materials provided
- [ ] Initial training session scheduled
- [ ] User added to appropriate communication channels
- [ ] Follow-up scheduled for first week
- [ ] Feedback collection planned for first month

### **Monthly System Review Checklist**
- [ ] User activity and engagement metrics reviewed
- [ ] Content usage and effectiveness analyzed
- [ ] System performance and uptime verified
- [ ] Security logs and alerts reviewed
- [ ] User feedback and support requests analyzed
- [ ] System updates and maintenance completed
- [ ] Backup and disaster recovery tested

### **Quarterly Business Review Checklist**
- [ ] User growth and retention metrics
- [ ] Content effectiveness and gaps identified
- [ ] System performance and scalability assessment
- [ ] Security posture and compliance review
- [ ] User satisfaction and feedback analysis
- [ ] Strategic roadmap and feature planning
- [ ] Budget and resource planning

---

## 🎯 **Success Metrics**

### **User Adoption Metrics**
- **Active Users**: Daily/weekly/monthly active users by role
- **Feature Adoption**: Usage of advanced features (BYOK, AI search)
- **Content Engagement**: Time spent, pages viewed, search success rates
- **User Satisfaction**: Survey scores and feedback ratings

### **System Performance Metrics**
- **Uptime**: System availability and reliability
- **Response Times**: API and page load performance
- **Error Rates**: System errors and user-reported issues
- **Scalability**: System performance under load

### **Business Impact Metrics**
- **Clinical Outcomes**: Improved patient care and treatment effectiveness
- **Educational Impact**: Better student support and classroom management
- **Family Outcomes**: Improved parent confidence and child behavior
- **Professional Development**: Enhanced knowledge and skills for healthcare providers

---

**Admin Guide Complete! 👑**

*Effective administration ensures that the Pediatric Psychiatry Knowledge Base serves its users optimally and continues to improve healthcare outcomes for children and families.*