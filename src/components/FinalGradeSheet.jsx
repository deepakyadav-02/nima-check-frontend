import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import FinalGradeSheetQR from "./FinalGradeSheetQR";
import { getStudentId } from "../utils/studentId";
import { fetchPGAllSemestersByRollNo } from "../services/marksheetService";
import { mapPGAllSemestersToGradeSheet } from "../utils/finalGradeSheetMapper";
import "./FinalGradeSheet.css";

const PDF_MARGIN_MM = 8;
const A4_WIDTH_PX = 794; // 210mm at 96dpi

async function waitForImages(element) {
  const imgs = [...element.querySelectorAll('img')];
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = resolve;
            img.onerror = resolve;
          }
        })
    )
  );
}

function SemesterSection({ semester }) {
  return (
    <tbody className="fgs-sem-body">
      <tr className="fgs-sem-title-row">
        <td colSpan={10}>{semester.title}</td>
      </tr>
      <tr className="fgs-sem-headers">
        <th className="fgs-th">PAPERS</th>
        <th className="fgs-th">PAPERS TITLE</th>
        <th className="fgs-th">FULL MARK</th>
        <th className="fgs-th">MID SEM</th>
        <th className="fgs-th">END SEM</th>
        <th className="fgs-th">TOT</th>
        <th className="fgs-th">CR</th>
        <th className="fgs-th">GR</th>
        <th className="fgs-th">GP</th>
        <th className="fgs-th">CP</th>
      </tr>
      {semester.papers.map((paper, idx) => (
        <tr key={idx}>
          <td className="fgs-td fgs-td-code">{paper.code}</td>
          <td className="fgs-td fgs-td-title">{paper.title}</td>
          <td className="fgs-td-center">{paper.fullMark}</td>
          <td className="fgs-td-center">{paper.midSem}</td>
          <td className="fgs-td-center">{paper.endSem}</td>
          <td className="fgs-td-bold">{paper.tot}</td>
          <td className="fgs-td-center">{paper.cr}</td>
          <td className="fgs-td-bold">{paper.gr}</td>
          <td className="fgs-td-center">{paper.gp}</td>
          <td className="fgs-td-bold">{paper.cp}</td>
        </tr>
      ))}
      <tr className="fgs-sem-total-row">
        <td className="fgs-td-total-left">TOTAL</td>
        <td className="fgs-td-total-empty"></td>
        <td className="fgs-td-total">{semester.total.fullMark}</td>
        <td className="fgs-td-total">{semester.total.midSem}</td>
        <td className="fgs-td-total">{semester.total.endSem}</td>
        <td className="fgs-td-total">{semester.total.tot}</td>
        <td className="fgs-td-total">{semester.total.cr}</td>
        <td className="fgs-td-total-empty"></td>
        <td className="fgs-td-total-empty"></td>
        <td className="fgs-td-total">{semester.total.cp}</td>
      </tr>
      <tr className="fgs-sem-sgpa-row">
        <td colSpan={10}>SGPA : {semester.sgpa}</td>
      </tr>
    </tbody>
  );
}

export default function FinalGradeSheet({ user }) {
  const navigate = useNavigate();
  const sheetRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [gradeSheetData, setGradeSheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const studentId = getStudentId(user);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const autonomousRollNo =
        user?.autonomousRollNo ||
        user?.['Autonomous Roll No'] ||
        studentId;

      if (!autonomousRollNo) {
        setError('Roll number not found. Please log in again.');
        setLoading(false);
        return;
      }

      try {
        const alternateRoll =
          user?.['Roll No'] || user?.rollNo || user?.['College Roll No'];
        const apiData = await fetchPGAllSemestersByRollNo(
          autonomousRollNo,
          alternateRoll
        );

        if (cancelled) return;

        if (!apiData) {
          setError(
            'Final grade sheet is not available for this student. PG consolidated results may not be published yet.'
          );
          setGradeSheetData(null);
          return;
        }

        setGradeSheetData(mapPGAllSemestersToGradeSheet(apiData, user));
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load final grade sheet.');
          setGradeSheetData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, studentId]);

  if (loading) {
    return (
      <div className="fgs-wrapper">
        <div className="fgs-status-message">Loading final grade sheet…</div>
      </div>
    );
  }

  if (error || !gradeSheetData) {
    return (
      <div className="fgs-wrapper">
        <div className="fgs-status-message fgs-status-error">{error || 'No data available.'}</div>
        <button type="button" className="fgs-back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const { college, student, semesters, summary } = gradeSheetData;
  const slNo = studentId ? `SI No. - ${studentId}` : college.slNo;

  const generatePDF = async () => {
    const el = sheetRef.current;
    if (!el) return;

    setDownloading(true);

    const wrapper = el.parentElement;
    const originalScrollY = window.scrollY;
    const originalScrollX = window.scrollX;
    const originalBodyOverflow = document.body.style.overflow;

    el.classList.add('fgs-sheet--pdf');
    if (wrapper) wrapper.classList.add('fgs-wrapper--pdf-capturing');
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await waitForImages(el);

      // offsetHeight/offsetWidth INCLUDE borders, scrollHeight does NOT —
      // using scrollHeight here would clip the 2px top/bottom border in the
      // exported PDF, so we use offsetHeight + a small safety buffer.
      const captureWidth = Math.max(A4_WIDTH_PX, el.offsetWidth);
      const captureHeight = Math.ceil(el.getBoundingClientRect().height) + 4;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        width: captureWidth,
        height: captureHeight,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const contentW = pageW - PDF_MARGIN_MM * 2;
      const contentH = pageH - PDF_MARGIN_MM * 2;

      const imgRatio = canvas.height / canvas.width;
      let imgW = contentW;
      let imgH = imgW * imgRatio;

      if (imgH > contentH) {
        imgH = contentH;
        imgW = imgH / imgRatio;
      }

      const x = PDF_MARGIN_MM + (contentW - imgW) / 2;
      const y = PDF_MARGIN_MM;

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, imgW, imgH);

      const roll = student.rollNo || studentId || 'student';
      const filename = `final_grade_sheet_${roll}.pdf`.replace(/\s+/g, '_');
      pdf.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert(`Failed to generate PDF. Please try again.${err?.message ? `\n\n${err.message}` : ''}`);
    } finally {
      el.classList.remove('fgs-sheet--pdf');
      if (wrapper) wrapper.classList.remove('fgs-wrapper--pdf-capturing');
      document.body.style.overflow = originalBodyOverflow;
      window.scrollTo(originalScrollX, originalScrollY);
      setDownloading(false);
    }
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
      <div className="fgs-sheet fgs-sheet--a4" ref={sheetRef}>

        <div className="fgs-header">
          <img src="/college.png" alt="College Logo" className="fgs-logo" crossOrigin="anonymous" />

          <div className="fgs-header-text">
            <div className="fgs-college-name">{college.name}</div>
            <div className="fgs-header-meta">
              <div className="fgs-header-info">
                <div className="fgs-affiliation">{college.affiliation}</div>
                <div className="fgs-exam-title">{college.examTitle}</div>
                <div className="fgs-exam-type">{college.examType}</div>
              </div>
              <div className="fgs-header-right">
                <FinalGradeSheetQR user={user} />
                <div className="fgs-sl-no">{slNo}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="fgs-content-box">
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

          {semesters.length === 0 ? (
            <div className="fgs-status-message">No semester marks found for this student.</div>
          ) : (
            <div className="fgs-semesters-wrap">
              <img
                src="/college_wbg.png"
                alt=""
                aria-hidden="true"
                className="fgs-watermark"
                crossOrigin="anonymous"
              />
              <table className="fgs-table fgs-table-continuous">
                <colgroup>
                  <col className="fgs-col-papers" />
                  <col className="fgs-col-title" />
                  <col className="fgs-col-num" />
                  <col className="fgs-col-num" />
                  <col className="fgs-col-num" />
                  <col className="fgs-col-num" />
                  <col className="fgs-col-num" />
                  <col className="fgs-col-num" />
                  <col className="fgs-col-num" />
                  <col className="fgs-col-num" />
                </colgroup>
                {semesters.map((sem, idx) => (
                  <SemesterSection key={idx} semester={sem} />
                ))}
              </table>
            </div>
          )}

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
                <img src="/PRINCIPAL_WBG.png" alt="Principal Signature" className="fgs-sign-placeholder" crossOrigin="anonymous" />
                <div className="fgs-sign-label">PRINCIPAL</div>
              </div>
            </div>

            <div className="fgs-summary-right">
              <div className="fgs-cgpa-label">CGPA : {summary.cgpa}</div>
              <div className="fgs-pub-date">
                Date of Publication of Result : {summary.dateOfPublication}
              </div>
              <div className="fgs-sign-block-right">
                <img src="/EXAMINER_WBG.png" alt="Controller of Examinations Signature" className="fgs-sign-placeholder" crossOrigin="anonymous" />
                <div className="fgs-sign-label-red">CONTROLLER OF EXAMINATIONS</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
