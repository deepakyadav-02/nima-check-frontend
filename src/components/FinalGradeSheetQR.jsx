import QRCode from 'react-qr-code';
import { getGradeSheetQrUrlForUser } from '../utils/gradeSheetQr';

export default function FinalGradeSheetQR({ user }) {
  const qrUrl = getGradeSheetQrUrlForUser(user);

  if (!qrUrl) {
    return (
      <div className="fgs-qr-placeholder fgs-qr-placeholder--empty" title="Student ID not available">
        N/A
      </div>
    );
  }

  return (
    <div className="fgs-qr-code" title="Scan to verify grade sheet">
      <QRCode value={qrUrl} size={64} level="M" />
    </div>
  );
}
