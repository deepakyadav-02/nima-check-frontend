import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gradeSheetData from '../data/gradeSheetData.json';
import './GradeSheet.css';

export default function GradeSheet({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(gradeSheetData);

  return (
    <div className="grade-sheet-container">
      <div className="grade-sheet-header">
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        <h1>Grade Sheet</h1>
      </div>

      <div className="grade-sheet-document">
        {/* Document Title */}
        <div className="document-header">
          <h1 className="exam-title">{data.examTitle}</h1>
          <h2 className="document-type">{data.documentType}</h2>
          <div className="serial-number">Sl No.-{data.serialNumber}</div>
        </div>

        {/* Student Information Block */}
        <div className="student-info-block">
          <div className="info-left-column">
            <div className="info-row">
              <span className="label">Name</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.name}</span>
            </div>
            <div className="info-row">
              <span className="label">Course</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.course}</span>
            </div>
            <div className="info-row">
              <span className="label"></span>
              <span className="colon"></span>
              <span className="value">{data.studentInfo.coreTwo}</span>
            </div>
            <div className="info-row">
              <span className="label">ABC ID</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.abcId}</span>
            </div>
            <div className="info-row">
              <span className="label">College</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.college}</span>
            </div>
          </div>
          
          <div className="info-right-column">
            <div className="info-row">
              <span className="label">Exam Roll No.</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.examRollNo}</span>
            </div>
            <div className="info-row">
              <span className="label">Registration No.</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.registrationNo}</span>
            </div>
            <div className="info-row">
              <span className="label">Medium of Exam</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.mediumOfExam}</span>
            </div>
          </div>
        </div>

        {/* Grade Details Table */}
        <div className="grade-table-container">
          <table className="grade-table">
            <thead>
              <tr>
                <th>SUBJECT CODE</th>
                <th>COURSE</th>
                <th>COURSE TITLE</th>
                <th>CREDIT</th>
                <th>GRADE</th>
                <th>GRADE POINT</th>
                <th>CREDIT POINT</th>
              </tr>
            </thead>
            <tbody>
              {data.gradeDetails.map((subject, index) => (
                <tr key={index}>
                  <td>{subject.subjectCode}</td>
                  <td>{subject.course}</td>
                  <td>{subject.courseTitle}</td>
                  <td>{subject.credit}</td>
                  <td>{subject.grade}</td>
                  <td>{subject.gradePoint}</td>
                  <td>{subject.creditPoint}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan="3" className="total-label">TOTAL</td>
                <td>{data.totals.totalCredits}</td>
                <td></td>
                <td></td>
                <td>{data.totals.totalCreditPoints}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Result and SGPA Section */}
        <div className="result-sgpa-section">
          <div className="result-left">
            <span className="label">Result</span>
            <span className="colon">:</span>
            <span className="value result-value">{data.result}</span>
          </div>
          <div className="sgpa-right">
            <span className="label">SGPA</span>
            <span className="colon">:</span>
            <span className="value sgpa-value">{data.sgpa}</span>
          </div>
        </div>

        <div className="sgpa-explanation">
          {data.sgpaExplanation}
        </div>

        {/* Grading System Table */}
        <div className="grading-system-container">
          <table className="grading-system-table">
            <thead>
              <tr>
                <th colSpan="3" className="grading-system-title">GRADING SYSTEM</th>
              </tr>
              <tr>
                <th>Grade</th>
                <th>Marks Secured from 100</th>
                <th>Grade Points</th>
              </tr>
            </thead>
            <tbody>
              {data.gradingSystem.map((grade, index) => (
                <tr key={index}>
                  <td>{grade.grade}</td>
                  <td>{grade.marksRange}</td>
                  <td>{grade.gradePoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="grade-sheet-footer">
          <div className="publication-date">
            Date of Publication {data.publicationDate}
          </div>
          <div className="controller-of-examinations">
            {data.controllerOfExaminations}
          </div>
        </div>

        <div className="disclaimer">
          {data.disclaimer}
        </div>
      </div>
    </div>
  );
}

