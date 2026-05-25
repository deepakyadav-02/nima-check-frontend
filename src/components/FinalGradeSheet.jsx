import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import FinalGradeSheetQR from "./FinalGradeSheetQR";
import { getStudentId } from "../utils/studentId";
import "./FinalGradeSheet.css";

const PDF_CAPTURE_WIDTH_PX = 794;
const PDF_MARGIN_MM = 2;
const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;

const gradeSheetData = {
  college: {
    name: "NIMAPARA AUTONOMOUS COLLEGE, NIMAPARA",
    affiliation: "(Affiliated to Utkal University, Odisha)",
    examTitle: "MARK SHEET CUM GRADE SHEET",
    examType: "POST GRADUATE DEGREE EXAMINATION - 2025",
    slNo: "SI No. - 202511070",
  },
  student: {
    name: "ARGHYA ARCHANA SAHOO",
    regdNo: "7264/23",
    rollNo: "153NAC23005",
    course: "MASTER OF SCIENCE IN CHEMISTRY",
  },
  semesters: [
    {
      title: "FIRST SEMESTER EXAMINATION",
      papers: [
        { code: "PAPER 1.1", title: "INORGANIC CHEMISTRY-I",               fullMark: "20+50", midSem: 19,  endSem: 36,  tot: 55, cr: 3, gr: "A",  gp: 8,  cp: 24 },
        { code: "PAPER 1.2", title: "ORGANIC CHEMISTRY-I",                 fullMark: "20+50", midSem: 18,  endSem: 23,  tot: 41, cr: 3, gr: "B",  gp: 6,  cp: 18 },
        { code: "PAPER 1.3", title: "PHYSICAL CHEMISTRY-I",                fullMark: "20+50", midSem: 19,  endSem: 16,  tot: 35, cr: 3, gr: "B",  gp: 6,  cp: 18 },
        { code: "PAPER 1.4", title: "INORGANIC CHEMISTRY PRACTICAL -I",    fullMark: "50",    midSem: "",  endSem: 46,  tot: 46, cr: 4, gr: "O",  gp: 10, cp: 40 },
        { code: "PAPER 1.5", title: "ORGANIC CHEMISTRY PRACTICAL -I",      fullMark: "50",    midSem: "",  endSem: 46,  tot: 46, cr: 4, gr: "O",  gp: 10, cp: 40 },
        { code: "PAPER 1.6", title: "SPECTROSCOPY-I",                      fullMark: "20+50", midSem: 19,  endSem: 21,  tot: 40, cr: 3, gr: "B",  gp: 6,  cp: 18 },
        { code: "PAPER 1.7", title: "COMPUTER FOR CHEMIST",                fullMark: "20+50", midSem: 18,  endSem: 48,  tot: 66, cr: 3, gr: "O",  gp: 10, cp: 30 },
      ],
      total: { fullMark: 450, midSem: 93, endSem: 236, tot: 329, cr: 23, cp: 188 },
      sgpa: "8.17",
    },
    {
      title: "SECOND SEMESTER EXAMINATION",
      papers: [
        { code: "CH-408", title: "INORGANIC CHEMISTRY-II",                fullMark: "20+50", midSem: 17, endSem: 31, tot: 48, cr: 3, gr: "B+", gp: 7,  cp: 21 },
        { code: "CH-409", title: "ORGANIC CHEMISTRY-II",                  fullMark: "20+50", midSem: 17, endSem: 26, tot: 43, cr: 3, gr: "B+", gp: 7,  cp: 21 },
        { code: "CH-410", title: "PHYSICAL CHEMISTRY-II",                 fullMark: "20+50", midSem: 18, endSem: 29, tot: 47, cr: 3, gr: "B+", gp: 7,  cp: 21 },
        { code: "CH-411", title: "INORGANIC CHEMISTRY PRACTICAL -II",     fullMark: "50",    midSem: "", endSem: 46, tot: 46, cr: 4, gr: "O",  gp: 10, cp: 40 },
        { code: "CH-412", title: "ORGANIC CHEMISTRY PRACTICAL -II",       fullMark: "50",    midSem: "", endSem: 46, tot: 46, cr: 4, gr: "O",  gp: 10, cp: 40 },
        { code: "CH-413", title: "SPECTROSCOPY-II",                       fullMark: "20+50", midSem: 17, endSem: 23, tot: 40, cr: 3, gr: "B",  gp: 6,  cp: 18 },
        { code: "CH-414", title: "ANALYTICAL CHEMISTRY",                  fullMark: "20+50", midSem: 18, endSem: 43, tot: 61, cr: 3, gr: "A+", gp: 9,  cp: 27 },
      ],
      total: { fullMark: 450, midSem: 87, endSem: 244, tot: 331, cr: 23, cp: 188 },
      sgpa: "8.17",
    },
    {
      title: "THIRD SEMESTER EXAMINATION",
      papers: [
        { code: "CH-501", title: "PERICYCLIC REACTIONS AND PHOTOCHEMISTRY",      fullMark: "20+50", midSem: 19, endSem: 39, tot: 58, cr: 3, gr: "A+", gp: 9,  cp: 27 },
        { code: "CH-502", title: "BIOINORGANIC & SUPRAMOLECULAR CHEMISTRY",      fullMark: "20+50", midSem: 19, endSem: 36, tot: 55, cr: 3, gr: "A",  gp: 8,  cp: 24 },
        { code: "CH-503", title: "APPLIED CHEMISTRY PRACTICAL",                  fullMark: "50",    midSem: "", endSem: 47, tot: 47, cr: 4, gr: "O",  gp: 10, cp: 40 },
        { code: "CH-504", title: "PHYSICAL CHEMISTRY PRACTICAL-I",               fullMark: "50",    midSem: "", endSem: 47, tot: 47, cr: 4, gr: "O",  gp: 10, cp: 40 },
        { code: "CH-505", title: "APPLICATION OF SPECTROSCOPY-I",                fullMark: "20+50", midSem: 18, endSem: 32, tot: 50, cr: 3, gr: "A",  gp: 8,  cp: 24 },
        { code: "CH-506", title: "ORGANIC SYNTHESIS",                            fullMark: "20+50", midSem: 19, endSem: 37, tot: 56, cr: 3, gr: "A+", gp: 9,  cp: 27 },
        { code: "CH-507", title: "ENVIRONMENTAL CHEMISTRY",                      fullMark: "20+50", midSem: 18, endSem: 28, tot: 46, cr: 3, gr: "B+", gp: 7,  cp: 21 },
      ],
      total: { fullMark: 450, midSem: 93, endSem: 266, tot: 359, cr: 23, cp: 203 },
      sgpa: "8.83",
    },
    {
      title: "FOURTH SEMESTER EXAMINATION",
      papers: [
        { code: "CH-508", title: "BIOORAGANIC CHEMISTRY",                 fullMark: "20+50", midSem: 19, endSem: 43, tot: 62, cr: 3, gr: "A+", gp: 9,  cp: 27 },
        { code: "CH-509", title: "ORGANAOTRANSITION METAL CHEMISTRY",     fullMark: "20+50", midSem: 19, endSem: 38, tot: 57, cr: 3, gr: "A+", gp: 9,  cp: 27 },
        { code: "CH-510", title: "POLYMER CHEMISTRY",                     fullMark: "20+50", midSem: 18, endSem: 42, tot: 60, cr: 3, gr: "A+", gp: 9,  cp: 27 },
        { code: "CH-511", title: "SOLID STATE CHEMISTRY",                 fullMark: "20+50", midSem: 19, endSem: 43, tot: 62, cr: 3, gr: "A+", gp: 9,  cp: 27 },
        { code: "CH-512", title: "PHYSICAL PRACTICAL -II",                fullMark: "50",    midSem: "", endSem: 47, tot: 47, cr: 4, gr: "O",  gp: 10, cp: 40 },
        { code: "CH-513", title: "PROJECT WORK AND SEMINAR",              fullMark: "50",    midSem: 6,  endSem: 47, tot: 47, cr: 6, gr: "O",  gp: 10, cp: 60 },
        { code: "CH-514", title: "APPLICATION OF SPECTROSCOPY-II",        fullMark: "20+50", midSem: 19, endSem: 41, tot: 60, cr: 3, gr: "A+", gp: 9,  cp: 27 },
      ],
      total: { fullMark: 450, midSem: 94, endSem: 301, tot: 395, cr: 25, cp: 235 },
      sgpa: "9.40",
    },
  ],
  summary: {
    grandTotal: 1414,
    maximumMark: 1800,
    cgpa: "8.66",
    result: "1ST CLASS",
    dateOfPublication: "02/07/2025",
  },
};

function SemesterTable({ semester }) {
  return (
    <div className="fgs-semester-section">
      <div className="fgs-semester-header">{semester.title}</div>
      <table className="fgs-table">
        <thead>
          <tr>
            <th className="fgs-th fgs-col-papers">PAPERS</th>
            <th className="fgs-th">PAPERS TITLE</th>
            <th className="fgs-th fgs-col-fullmark">FULL MARK</th>
            <th className="fgs-th fgs-col-mid">MID SEM</th>
            <th className="fgs-th fgs-col-end">END SEM</th>
            <th className="fgs-th fgs-col-tot">TOT</th>
            <th className="fgs-th fgs-col-cr">CR</th>
            <th className="fgs-th fgs-col-gr">GR</th>
            <th className="fgs-th fgs-col-gp">GP</th>
            <th className="fgs-th fgs-col-cp">CP</th>
          </tr>
        </thead>
        <tbody>
          {semester.papers.map((paper, idx) => (
            <tr key={idx}>
              <td className="fgs-td fgs-col-papers">{paper.code}</td>
              <td className="fgs-td-title">{paper.title}</td>
              <td className="fgs-td-center fgs-col-fullmark">{paper.fullMark}</td>
              <td className="fgs-td-center fgs-col-mid">{paper.midSem}</td>
              <td className="fgs-td-center fgs-col-end">{paper.endSem}</td>
              <td className="fgs-td-bold fgs-col-tot">{paper.tot}</td>
              <td className="fgs-td-center fgs-col-cr">{paper.cr}</td>
              <td className="fgs-td-bold fgs-col-gr">{paper.gr}</td>
              <td className="fgs-td-center fgs-col-gp">{paper.gp}</td>
              <td className="fgs-td-bold fgs-col-cp">{paper.cp}</td>
            </tr>
          ))}
          <tr>
            <td className="fgs-td-total-left fgs-col-papers">TOTAL</td>
            <td className="fgs-td-total-empty"></td>
            <td className="fgs-td-total fgs-col-fullmark">{semester.total.fullMark}</td>
            <td className="fgs-td-total fgs-col-mid">{semester.total.midSem}</td>
            <td className="fgs-td-total fgs-col-end">{semester.total.endSem}</td>
            <td className="fgs-td-total fgs-col-tot">{semester.total.tot}</td>
            <td className="fgs-td-total fgs-col-cr">{semester.total.cr}</td>
            <td className="fgs-td-total-empty fgs-col-gr"></td>
            <td className="fgs-td-total-empty fgs-col-gp"></td>
            <td className="fgs-td-total fgs-col-cp">{semester.total.cp}</td>
          </tr>
        </tbody>
      </table>
      <div className="fgs-sgpa-row">SGPA : {semester.sgpa}</div>
    </div>
  );
}

export default function FinalGradeSheet({ user }) {
  const navigate = useNavigate();
  const sheetRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const { college, student, semesters, summary } = gradeSheetData;
  const studentId = getStudentId(user);
  const slNo = studentId ? `SI No. - ${studentId}` : college.slNo;

  const generatePDF = () => {
    const el = sheetRef.current;
    if (!el) return;

    setDownloading(true);

    const originalWidth = el.style.width;
    const originalMaxWidth = el.style.maxWidth;
    const originalPadding = el.style.padding;
    const originalMargin = el.style.margin;
    const originalBoxShadow = el.style.boxShadow;

    el.style.width = `${PDF_CAPTURE_WIDTH_PX}px`;
    el.style.maxWidth = `${PDF_CAPTURE_WIDTH_PX}px`;
    el.style.padding = "6px 8px";
    el.style.margin = "0";
    el.style.boxShadow = "none";
    el.style.overflow = "visible";
    el.classList.add("fgs-pdf-compact");

    const restoreStyles = () => {
      el.style.width = originalWidth;
      el.style.maxWidth = originalMaxWidth;
      el.style.padding = originalPadding;
      el.style.margin = originalMargin;
      el.style.boxShadow = originalBoxShadow;
      el.style.overflow = "";
      el.classList.remove("fgs-pdf-compact");
    };

    const capturePdf = () =>
      html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

    const runCapture = () =>
      capturePdf()
        .then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");

          const maxWidth = PDF_PAGE_WIDTH_MM - PDF_MARGIN_MM * 2;
          const maxHeight = PDF_PAGE_HEIGHT_MM - PDF_MARGIN_MM * 2;

          let imgWidth = maxWidth;
          let imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = (canvas.width * imgHeight) / canvas.height;
          }

          pdf.addImage(
            imgData,
            "PNG",
            PDF_MARGIN_MM,
            PDF_MARGIN_MM,
            imgWidth,
            imgHeight
          );

          const roll = student.rollNo || studentId || "student";
          const filename = `final_grade_sheet_${roll}.pdf`.replace(/\s+/g, "_");
          pdf.save(filename);

          restoreStyles();
          setDownloading(false);
        })
        .catch((error) => {
          console.error("Error generating PDF:", error);
          alert("Failed to generate PDF. Please try again.");
          restoreStyles();
          setDownloading(false);
        });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => runCapture());
    });
  };

  return (
    <div className="fgs-wrapper">
      <div className="fgs-toolbar">
        <button
          type="button"
          className="fgs-back-btn"
          onClick={() => navigate("/dashboard")}
          disabled={downloading}
        >
          ← Back to Dashboard
        </button>
        <button
          type="button"
          className="fgs-download-pdf-btn"
          onClick={generatePDF}
          disabled={downloading}
        >
          {downloading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>
      <div className="fgs-sheet" ref={sheetRef}>

        <div className="fgs-header">
          <img src="/college.png" alt="College Logo" className="fgs-logo" />

          <div className="fgs-header-text">
            <div className="fgs-college-name">{college.name}</div>
            <div className="fgs-affiliation">{college.affiliation}</div>
            <div className="fgs-exam-title">{college.examTitle}</div>
            <div className="fgs-exam-type">{college.examType}</div>
          </div>

          <div className="fgs-header-right">
            <FinalGradeSheetQR user={user} />
            <div className="fgs-sl-no">{slNo}</div>
          </div>
        </div>

        <div className="fgs-student-info">
          <div className="fgs-student-row">
            <span className="fgs-label">NAME :</span>
            <span className="fgs-value-bold">{student.name}</span>
            <span className="fgs-label fgs-label-spacer">REGD NO :</span>
            <span className="fgs-value-bold">{student.regdNo}</span>
            <span className="fgs-label fgs-label-spacer">ROLL NO :</span>
            <span className="fgs-value-bold">{student.rollNo}</span>
          </div>
          <div className="fgs-student-row">
            <span className="fgs-label">COURSE :</span>
            <span className="fgs-value-bold">{student.course}</span>
          </div>
        </div>

        {semesters.map((sem, idx) => (
          <SemesterTable key={idx} semester={sem} />
        ))}

        <div className="fgs-summary-section">
          <div className="fgs-summary-left">
            <div className="fgs-summary-row">
              <span className="fgs-summary-label">GRAND TOTAL: {summary.grandTotal}</span>
              <span className="fgs-summary-label fgs-summary-label-gap">MAXIMUM MARK: {summary.maximumMark}</span>
            </div>
            <div className="fgs-summary-row fgs-summary-row-spaced">
              <span className="fgs-summary-label">RESULT : {summary.result}</span>
            </div>
            <div className="fgs-sign-block">
              <img src="/PRINCIPAL.jpg" alt="Principal Signature" className="fgs-sign-placeholder" />
              <div className="fgs-sign-label">PRINCIPAL</div>
            </div>
          </div>

          <div className="fgs-summary-right">
            <div className="fgs-cgpa-label">CGPA : {summary.cgpa}</div>
            <div className="fgs-pub-date">
              Date of Publication of Result : {summary.dateOfPublication}
            </div>
            <div className="fgs-sign-block-right">
              <img src="/EXAMINER.jpg" alt="Controller of Examinations Signature" className="fgs-sign-placeholder" />
              <div className="fgs-sign-label-red">CONTROLLER OF EXAMINATIONS</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
