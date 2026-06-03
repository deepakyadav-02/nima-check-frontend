import QRCode from 'react-qr-code';

export default function FinalGradeSheetQR({ qrText }) {
  const payload = qrText != null ? String(qrText).trim() : '';

  if (!payload) {
    return (
      <div className="fgs-qr-placeholder fgs-qr-placeholder--empty" title="QR data not available">
        N/A
      </div>
    );
  }

  return (
    <div className="fgs-qr-code" title="Scan to view result details">
      <QRCode value={payload} size={72} level="L" />
    </div>
  );
}
