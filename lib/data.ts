// File: lib/data.ts
export const mouauColleges = [
  "College Of Agribusiness and Management (COABM)",
  "College Of Animal Science & Animal Production (CASAP)",
  "College Of Applied Food Science & Tourism (CAFST)",
  "College Of Crop & Soil Sciences (CCSS)",
  "College Of Education (COED)",
  "College Of Engineering & Engineering Technology (CEET)",
  "College Of Management Science (COLMAS)",
  "College Of Natural Resources & Environmental Management (CNREM)",
  "College Of Natural Science (COLNAS)",
  "College Of Physical & Applied Science (COLPAS)",
  "College Of Veterinary Medicine (CVM)",
  "School Of General Studies (SGS)",
];

export const departments: Record<string, string[]> = {
  "College Of Agribusiness and Management (COABM)": [
    "Agribusiness and Management",
    "Agricultural Economics",
    "Agricultural Extension and Rural Sociology",
  ],
  "College Of Animal Science & Animal Production (CASAP)": [
    "Animal Breeding And Physiology",
    "Animal Nutrition And Forage Science",
    "Animal Production and Livestock Management",
  ],
  "College Of Applied Food Science & Tourism (CAFST)": [
    "Human Nutrition and Dietetics",
    "Home Science/Hospitality Management & Tourism",
    "Food Science and Technology",
  ],
  "College Of Crop & Soil Sciences (CCSS)": [
    "Agronomy",
    "Plant Health Management",
    "Soil Science and Meteorology",
    "Water Resources Management and Agrometeorology",
  ],
  "College Of Education (COED)": [
    "Adult and Continuing Education",
    "Agricultural/Home Science Education",
    "Business Education",
    "Economics Education",
    "Education Management",
    "Industrial Technology Education",
    "Library and Information Science",
    "Guidance and Counselling",
    "Integrated Science Education",
  ],
  "College Of Engineering & Engineering Technology (CEET)": [
    "Agricultural and Bioresources Engineering",
    "Civil Engineering",
    "Chemical Engineering",
    "Computer Engineering",
    "Electrical and Electronics Engineering",
    "Mechanical Engineering",
  ],
  "College Of Management Science (COLMAS)": [
    "Industrial Relations and Personnel Management",
    "Human Resource Management",
  ],
  "College Of Natural Resources & Environmental Management (CNREM)": [
    "Environment Management and Toxicology",
    "Fisheries and Aquatic Resources Management",
    "Forestry and Environmental Management",
  ],
  "College Of Natural Science (COLNAS)": [
    "Biochemistry",
    "Microbiology",
    "Plant Science and Biotechnology",
    "Zoology and Environmental Biology",
  ],
  "College Of Physical & Applied Science (COLPAS)": [
    "Chemistry",
    "Computer Science",
    "Geology",
    "Mathematics",
    "Physics",
    "Statistics",
  ],
  "College Of Veterinary Medicine (CVM)": [
    "Theriogenology",
    "Veterinary Anatomy",
    "Veterinary Medicine",
    "Veterinary Microbiology",
    "Veterinary Public Health and Preventive Medicine",
    "Veterinary Surgery and Radiology",
  ],
  "School Of General Studies (SGS)": [
    "English",
    "French",
    "German",
    "History",
    "Social Science",
    "Physical and Health",
    "Philosophy",
    "Peace and Conflict",
  ],
};

// Enhanced Agreement content
export type AgreementSection = {
  title: string;
  content: string;
};

// Enhanced Agreement content
export const AGREEMENT_CONTENT = {
  title: "MOUAU ClassMate Terms & Conditions",
  lastUpdated: "December 2024",
  sections: [
    {
      title: "1. Acceptance of Terms",
      content:
        "By registering for MOUAU ClassMate, you agree to abide by the university's code of conduct and all applicable policies governing student behavior and academic integrity. These terms constitute a legally binding agreement between you and Michael Okpara University of Agriculture, Umudike (MOUAU).",
    },
    {
      title: "2. Eligibility",
      content:
        "This platform is exclusively for currently enrolled students of MOUAU. You must provide accurate and complete registration information, including a valid matriculation number. Any falsification of information may result in immediate account termination and disciplinary action.",
    },
    {
      title: "3. Data Privacy & Protection",
      content:
        "Your personal information will be protected in accordance with the Nigerian Data Protection Regulation (NDPR) 2019 and used solely for academic and administrative purposes within MOUAU. We collect and process data including your name, matriculation number, contact information, academic records, and usage data. By using this service, you consent to Michael Okpara University of Agriculture, Umudike (MOUAU) looking up and verifying your provided personal and identification data from the National Identity Management Commission (NIMC) database to ensure the authenticity and security of your account. You have the right to access, correct, or request deletion of your personal data subject to legal and institutional requirements.",
    },
    {
      title: "4. Academic Integrity",
      content:
        "You agree to maintain academic honesty and not misuse the platform for any form of academic misconduct, including plagiarism, unauthorized collaboration, cheating, or sharing of examination materials. Violation of academic integrity policies may result in disciplinary action ranging from grade penalties to expulsion, as outlined in the university's student handbook.",
    },
    {
      title: "5. Platform Usage & Conduct",
      content:
        "The ClassMate platform is for legitimate academic purposes only. Prohibited activities include: spamming, harassment, bullying, posting offensive content, distributing malware, unauthorized commercial activities, impersonation, and any illegal activities. The university reserves the right to monitor platform usage and take appropriate action against violations.",
    },
    {
      title: "6. Account Security & Responsibility",
      content:
        "You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must immediately notify the university of any unauthorized access or security breach. You agree not to share your account credentials with others or allow others to access your account.",
    },
    {
      title: "7. Communication & Notifications",
      content:
        "You consent to receive official university communications through the platform, including course announcements, grades, examination schedules, fee reminders, and important updates. It is your responsibility to regularly check the platform for new communications. The university is not liable for any consequences resulting from failure to check notifications.",
    },
    {
      title: "8. Intellectual Property Rights",
      content:
        "All content provided through the platform, including course materials, lectures, assignments, and multimedia resources, remains the intellectual property of MOUAU and respective content creators. You are granted a limited, non-exclusive license to access and use materials solely for personal educational purposes. Unauthorized reproduction, distribution, or commercial use is strictly prohibited.",
    },
    {
      title: "9. Service Availability",
      content:
        "While we strive to maintain continuous service availability, MOUAU does not guarantee uninterrupted access to the platform. The university reserves the right to modify, suspend, or discontinue any aspect of the service without prior notice for maintenance, upgrades, or other operational needs. We are not liable for any disruption of service.",
    },
    {
      title: "10. Limitation of Liability",
      content:
        "MOUAU and its affiliates shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the platform. This includes but is not limited to loss of data, grades, academic opportunities, or any other damages. Your use of the platform is at your own risk.",
    },
    {
      title: "11. User-Generated Content",
      content:
        "You retain ownership of content you submit but grant MOUAU a worldwide, non-exclusive, royalty-free license to use, display, and distribute such content for educational and administrative purposes. You are responsible for ensuring your content does not violate any third-party rights or applicable laws.",
    },
    {
      title: "12. Disciplinary Action",
      content:
        "Violations of these terms may result in account suspension, permanent termination, and/or referral to university disciplinary authorities. The university reserves the right to investigate violations and cooperate with law enforcement when necessary.",
    },
    {
      title: "13. Amendments",
      content:
        "MOUAU reserves the right to modify these terms at any time. You will be notified of significant changes through the platform or via email. Continued use of the platform after modifications constitutes acceptance of the updated terms. You are encouraged to review these terms periodically.",
    },
    {
      title: "14. Governing Law",
      content:
        "These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these terms or platform usage shall be subject to the exclusive jurisdiction of Nigerian courts.",
    },
    {
      title: "15. Contact & Support",
      content:
        "For questions about these terms, data privacy concerns, or technical support, contact the MOUAU IT Help Desk at support@mouaucm.vercel.app or visit the ICT Centre on campus during working hours.",
    },
  ],
};

