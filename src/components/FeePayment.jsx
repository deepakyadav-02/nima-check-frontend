import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import './FeePayment.css';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function FeePayment({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feeData, setFeeData] = useState(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const loadFeeData = async () => {
    const response = await axios.get(`${config.API_BASE_URL}/fee-payment/config`, {
      headers: authHeaders(),
    });
    setFeeData(response.data);
    return response.data;
  };

  useEffect(() => {
    const fetchFeeData = async () => {
      try {
        setLoading(true);
        await loadFeeData();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load fee details');
      } finally {
        setLoading(false);
      }
    };
    fetchFeeData();
  }, []);

  const handlePay = async () => {
    if (!feeData?.breakdown) {
      setError('Your fee details are not available yet.');
      return;
    }
    if (!feeData.paymentsEnabled) {
      setError('Payment gateway is not configured. Contact the college office.');
      return;
    }

    setPaying(true);
    setError('');
    setSuccess('');

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay. Check your internet connection.');
      }

      const orderResponse = await axios.post(
        `${config.API_BASE_URL}/fee-payment/create-order`,
        {},
        { headers: authHeaders() }
      );

      const { orderId, amount, keyId, prefill, breakdown } = orderResponse.data;

      const options = {
        key: keyId,
        amount: amount * 100,
        currency: 'INR',
        name: 'Nimapara Autonomous College',
        description: `${breakdown.yearLabel} Fee ${breakdown.academicYear}`,
        order_id: orderId,
        prefill: { name: prefill?.name || user?.name },
        theme: { color: '#667eea' },
        handler: async (response) => {
          try {
            const verifyResponse = await axios.post(
              `${config.API_BASE_URL}/fee-payment/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: authHeaders() }
            );
            setSuccess(verifyResponse.data.message || 'Payment successful!');
            await loadFeeData();
          } catch (verifyErr) {
            setError(verifyErr.response?.data?.message || 'Payment verification failed');
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setPaying(false);
      });
      razorpay.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to start payment');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="fee-payment-container">
        <div className="fee-payment-card loading-card">Loading your fee details...</div>
      </div>
    );
  }

  const { breakdown, feeAssignment, alreadyPaid } = feeData || {};

  return (
    <div className="fee-payment-container">
      <div className="fee-payment-header">
        <button type="button" className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>Fee Payment</h1>
        <p className="fee-subtitle">Academic Year {feeData?.academicYear || '2026-27'}</p>
      </div>

      {!feeData?.eligible ? (
        <div className="fee-payment-card notice-card">
          <h2>Fee Not Available</h2>
          <p>{feeData?.message}</p>
        </div>
      ) : (
        <>
          <div className="fee-payment-card">
            <h2>Student Details</h2>
            <div className="student-info-grid">
              <div><span>Name</span><strong>{feeData.student?.name}</strong></div>
              <div><span>Roll No</span><strong>{feeData.student?.autonomousRollNo}</strong></div>
              <div><span>Department</span><strong>{feeData.student?.department || 'N/A'}</strong></div>
            </div>
          </div>

          <div className="fee-payment-card">
            <h2>Your Assigned Fee</h2>
            <div className="breakdown-meta">
              <span>{feeAssignment?.yearLabel}</span>
              <span>{feeAssignment?.streamLabel}</span>
              <span>{feeAssignment?.categoryLabel}</span>
            </div>

            <div className="fee-table-wrapper">
              <table className="fee-table">
                <thead>
                  <tr>
                    <th>Sl.</th>
                    <th>Particulars</th>
                    <th>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown?.lineItems.map((item) => (
                    <tr key={item.slNo} className={item.amount === 0 ? 'zero-fee' : ''}>
                      <td>{item.slNo}</td>
                      <td>{item.name}</td>
                      <td>{item.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2"><strong>Total Payable</strong></td>
                    <td><strong>₹{breakdown?.total.toLocaleString('en-IN')}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {alreadyPaid ? (
              <div className="fee-message success">
                You have already paid your fees for {feeData.academicYear}.
              </div>
            ) : (
              <button
                type="button"
                className="pay-btn"
                onClick={handlePay}
                disabled={paying || !feeData.paymentsEnabled}
              >
                {paying ? 'Processing...' : `Pay ₹${breakdown?.total.toLocaleString('en-IN')}`}
              </button>
            )}

            {!feeData.paymentsEnabled && (
              <p className="gateway-warning">Razorpay keys are not configured on the server yet.</p>
            )}
          </div>

          {feeData.paidPayments?.length > 0 && (
            <div className="fee-payment-card">
              <h2>Payment History</h2>
              <div className="payment-history">
                {feeData.paidPayments.map((payment) => (
                  <div key={payment._id} className="history-item">
                    <div>
                      <strong>{payment.yearLabel} — ₹{payment.amount.toLocaleString('en-IN')}</strong>
                      <p>Paid on {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-IN') : '—'}</p>
                    </div>
                    <span className="status-paid">Paid</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {error && <div className="fee-message error">{error}</div>}
      {success && <div className="fee-message success">{success}</div>}
    </div>
  );
}
