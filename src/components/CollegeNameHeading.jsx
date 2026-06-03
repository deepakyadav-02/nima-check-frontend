import { COLLEGE_NAME_LINE1, COLLEGE_NAME_LINE2 } from '../constants/collegeHeader';
import './CollegeNameHeading.css';

/**
 * Two-line college title: "NIMAPARA AUTONOMOUS COLLEGE," / "NIMAPARA"
 * @param {object} props
 * @param {'div'|'h1'|'h2'|'h3'|'p'} [props.as='div']
 * @param {string} [props.className]
 */
export default function CollegeNameHeading({ as: Tag = 'div', className = '' }) {
  const rootClass = ['college-name-heading', className].filter(Boolean).join(' ');

  return (
    <Tag className={rootClass}>
      <span className="college-name-heading__line">{COLLEGE_NAME_LINE1}</span>
      <span className="college-name-heading__line">{COLLEGE_NAME_LINE2}</span>
    </Tag>
  );
}
