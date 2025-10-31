import React, { useEffect, useState } from "react";
import { getActiveBankDetails } from "../Service/APIservice"; // adjust path

const CopyRow = ({ label, value }) => {
  const copy = () => navigator.clipboard.writeText(value || "");
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="truncate font-medium text-[#0A0A0A]">{value || "-"}</div>
      </div>
      {value && (
        <button
          type="button"
          onClick={copy}
          className="ml-3 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
        >
          Copy
        </button>
      )}
    </div>
  );
};

const DetailRow = ({ label, value, canCopy }) => (
  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="truncate font-medium text-[#0A0A0A]">{value || "-"}</div>
    </div>
    {canCopy && value && (
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value)}
        className="ml-3 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
      >
        Copy
      </button>
    )}
  </div>
);

export default function NetbankingPanel({ paymentMethod, netbankingType }) {
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getActiveBankDetails();
        setActive(data);
      } catch (e) {
        setErr(e.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (paymentMethod !== "netbanking") return null;

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
      {loading ? (
        <p className="text-sm text-gray-500">Loading payment details...</p>
      ) : err ? (
        <p className="text-sm text-rose-600">Failed: {err}</p>
      ) : !active ? (
        <p className="text-sm text-gray-500">No active payment details found.</p>
      ) : netbankingType === "upi" ? (
        <div className="space-y-2 text-sm">
          <div className="font-medium text-[#0A0A0A]">Pay via UPI</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CopyRow label="UPI ID" value={active.upidetails?.upiid} />
            <CopyRow label="UPI Name" value={active.upidetails?.upiname} />
          </div>
          <p className="text-gray-500">
            Use any UPI app (GPay/PhonePe/Paytm). Add your order ID in the notes.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="font-medium text-[#0A0A0A]">Bank Transfer Details</div>
          <DetailRow label="Account Name" value={active.bankdetails?.accountname ?active.bankdetails?.accountname : "Duco"} />
          <DetailRow label="Bank Name" value={active.bankdetails?.bankname} />
          <DetailRow label="Account Number" value={active.bankdetails?.accountnumber} canCopy />
          <DetailRow label="IFSC" value={active.bankdetails?.ifsccode} canCopy />
          <DetailRow label="Branch" value={active.bankdetails?.branch} />
          <p className="text-gray-500">
            After transfer, upload the receipt on the order confirmation page. Payments are verified within 1–3 hours.
          </p>
        </div>
      )}
    </div>
  );
}
