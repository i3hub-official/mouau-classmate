// lib/pdf/TranscriptPDF.tsx
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
  },
  subheader: {
    fontSize: 10,
    textAlign: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    textDecoration: "underline",
  },
  text: {
    fontSize: 9,
    marginBottom: 3,
  },
  studentInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  studentInfoColumn: {
    width: "48%",
  },
    table: {
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 10,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableColHeader: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f0f0f0",
    padding: 5,
  },
  tableCol: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableCellHeader: {
    margin: "auto",
    fontSize: 8,
    fontWeight: "bold",
  },
  tableCell: {
    margin: "auto",
    fontSize: 7,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
  },
});

export const TranscriptPDF = ({ transcriptData }: { transcriptData: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <Text style={styles.header}>{transcriptData.institution.name}</Text>
      <Text style={styles.subheader}>{transcriptData.institution.address}</Text>
      <Text style={styles.subheader}>
        Website: {transcriptData.institution.website}
      </Text>

      {/* Title */}
      <Text style={styles.title}>OFFICIAL ACADEMIC TRANSCRIPT</Text>

      {/* Student Information in two columns */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>STUDENT INFORMATION</Text>
        <View style={styles.studentInfoContainer}>
          <View style={styles.studentInfoColumn}>
            <Text style={styles.text}>
              Full Name: {transcriptData.student.name}
            </Text>
            <Text style={styles.text}>
              Matric Number: {transcriptData.student.matricNumber}
            </Text>
            <Text style={styles.text}>
              Department: {transcriptData.student.department}
            </Text>
            <Text style={styles.text}>
              College: {transcriptData.student.college}
            </Text>
          </View>
          <View style={styles.studentInfoColumn}>
            <Text style={styles.text}>
              Program: {transcriptData.student.course}
            </Text>
            <Text style={styles.text}>
              Email: {transcriptData.student.email}
            </Text>
            <Text style={styles.text}>
              Phone: {transcriptData.student.phone}
            </Text>
            <Text style={styles.text}>
              Admission Year: {transcriptData.student.admissionYear}
            </Text>
          </View>
        </View>
      </View>

      {/* Academic Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACADEMIC SUMMARY</Text>
        <View style={styles.studentInfoContainer}>
          <View style={styles.studentInfoColumn}>
            <Text style={styles.text}>
              GPA: {transcriptData.academicSummary.gpa}
            </Text>
            <Text style={styles.text}>
              CGPA: {transcriptData.academicSummary.cgpa}
            </Text>
            <Text style={styles.text}>
              Current Level: {transcriptData.academicSummary.currentLevel}
            </Text>
          </View>
          <View style={styles.studentInfoColumn}>
            <Text style={styles.text}>
              Total Credits: {transcriptData.academicSummary.totalCredits}
            </Text>
            <Text style={styles.text}>
              Completed Credits:{" "}
              {transcriptData.academicSummary.completedCredits}
            </Text>
            <Text style={styles.text}>
              Completed Courses:{" "}
              {transcriptData.academicSummary.completedCourses}
            </Text>
          </View>
        </View>
      </View>

      {/* Course Details Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>COURSE DETAILS</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Code</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Title</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Credits</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Grade</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Status</Text>
            </View>
          </View>
          {/* Table Rows */}
          {transcriptData.courses.map((course: any, index: number) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{course.code}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{course.title}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{course.credits}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{course.grade || "-"}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{course.status}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Grading System */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GRADING SYSTEM</Text>
        <Text style={styles.text}>A: {transcriptData.gradingSystem.A}</Text>
        <Text style={styles.text}>B: {transcriptData.gradingSystem.B}</Text>
        <Text style={styles.text}>C: {transcriptData.gradingSystem.C}</Text>
        <Text style={styles.text}>D: {transcriptData.gradingSystem.D}</Text>
        <Text style={styles.text}>E: {transcriptData.gradingSystem.E}</Text>
        <Text style={styles.text}>F: {transcriptData.gradingSystem.F}</Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Generated on: {new Date(transcriptData.generatedAt).toLocaleString()} |
        This is an official document issued by the University
      </Text>
    </Page>
  </Document>
);
