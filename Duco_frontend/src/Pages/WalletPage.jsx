// src/pages/WalletPage.jsx
import { useEffect, useMemo, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getWallet } from "../Service/APIservice";
import { UserContext } from "../ContextAPI/UserContext.jsx";

const ACCENT = "#E5C870";
const BG = "#0A0A0A";

const currency = (v = 0) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v || 0));

const Badge = ({ tone = "neutral", children }) => {
  const styles = {
    neutral: "border-white/20 text-white/80",
    credit: "border-emerald-400/30 text-emerald-300",
    debit: "border-rose-400/30 text-rose-300",
    pending: "border-amber-400/30 text-amber-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[tone] || styles.neutral}`}
    >
      {children}
    </span>
  );
};

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(text || ""));
          setCopied(true);
          setTimeout(() => setCopied(false), 900);
        } catch {}
      }}
      className="text-xs underline underline-offset-4 hover:opacity-80"
      style={{ color: ACCENT }}
      aria-label="Copy to clipboard"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

const SkeletonRow = () => (
  <div className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="h-4 w-1/3 rounded bg-white/10" />
    <div className="mt-3 h-3 w-2/3 rounded bg-white/10" />
  </div>
);

export default function WalletPage({ userFromContext }) {
  // Get user from context
  const { user: contextUser } = useContext(UserContext);
  const params = useParams();
  const navigate = useNavigate();
  
  // Use context user first, then fallback to route param
  const userId = contextUser?._id || params.userId;

  const [data, setData] = useState(null); // wallet
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Check if user is logged in
  useEffect(() => {
    if (!contextUser || !contextUser._id) {
      setLoading(false);
      setErr("Please log in to view your wallet");
    }
  }, [contextUser]);

  const balance = useMemo(() => {
    // Prefer explicit balance if present; otherwise compute credits - debits
    if (data?.balance != null) return Number(data.balance);
    const tx = Array.isArray(data?.transactions) ? data.transactions : [];
    const credits = tx.filter(t => t?.type?.toLowerCase() === "credit").reduce((s, t) => s + Number(t?.amount || 0), 0);
    const debits = tx.filter(t => t?.type?.toLowerCase() !== "credit").reduce((s, t) => s + Number(t?.amount || 0), 0);
    return credits - debits;
  }, [data]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!userId) return; // Don't fetch if no userId
        setLoading(true);
        setErr(""); // Clear previous errors
        const response = await getWallet(userId);
        if (mounted) {
          // Handle both old format (direct wallet) and new format (with success flag)
          const walletData = response.data || response;
          setData(walletData);
        }
      } catch (e) {
        if (mounted) {
          const errorMsg = e?.response?.data?.message || e?.message || "Failed to load wallet";
          setErr(errorMsg);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const transactions = useMemo(
    () => (Array.isArray(data?.transactions) ? data.transactions : []),
    [data]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10" style={{ color: "white", backgroundColor: BG }}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl" style={{ color: ACCENT }}>
            Wallet
          </h1>
          <p className="mt-1 text-sm text-white/70">Track your balance and recent transactions.</p>
        </div>

        <div className="rounded-2xl border px-5 py-3 shadow-sm backdrop-blur"
             style={{ borderColor: `${ACCENT}33`, background: "linear-gradient(180deg, rgba(229,200,112,0.08), rgba(229,200,112,0.02))" }}>
          <div className="text-xs uppercase tracking-wide text-white/60">Current Balance</div>
          <div className="text-2xl font-semibold">{loading ? "—" : currency(balance)}</div>
        </div>
      </div>

      {/* Errors */}
      {err && (
        <div className="mb-6 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-center justify-between">
          <span>{err}</span>
          {err.includes("log in") && (
            <button
              onClick={() => navigate("/")}
              className="ml-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg font-medium text-white whitespace-nowrap"
            >
              Go to Login
            </button>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && transactions.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mx-auto mb-2 h-10 w-10 rounded-full border border-white/15" />
          <h3 className="text-lg font-medium">No transactions yet</h3>
          <p className="mt-1 text-sm text-white/70">Your future orders, refunds, and credits will show up here.</p>
        </div>
      )}

      {/* Transactions */}
      {!loading && transactions.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {/* Mobile – cards */}
          <div className="divide-y divide-white/10 md:hidden">
            {transactions.map(tx => <TxCard key={tx?._id} tx={tx} />)}
          </div>

          {/* Desktop – table */}
          <div className="hidden md:block">
            <table className="min-w-full table-fixed">
              <thead className="border-b border-white/10 bg-black/40">
                <tr className="text-left text-sm text-white/60">
                  <th className="px-4 py-3 w-[18%]">Date</th>
                  <th className="px-4 py-3 w-[16%]">Type</th>
                  <th className="px-4 py-3 w-[16%]">Amount</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3 w-[16%]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {transactions.map(tx => <TxRow key={tx?._id} tx={tx} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TxCard({ tx }) {
  const isCredit = (tx?.type || "").toLowerCase() === "credit";
  const tone = isCredit ? "credit" : "debit";

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-white/60">{fmtDate(tx?.createdAt || tx?.date)}</div>
          <div className="mt-1 font-medium">{currency(tx?.amount)}</div>
          <div className="mt-1">
            <Badge tone={tone}>{isCredit ? "Credit" : (tx?.type || "Debit")}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/50">Order</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate max-w-[150px]">{shortId(tx?.order?._id || tx?.order)}</span>
            <CopyBtn text={tx?.order?._id || tx?.order} />
          </div>
          <div className="mt-1">
            <Badge tone={statusTone(tx?.status)}>{(tx?.status || "Completed")}</Badge>
          </div>
        </div>
      </div>
      {tx?.note && <p className="mt-2 text-sm text-white/70">{tx.note}</p>}
    </div>
  );
}

function TxRow({ tx }) {
  const isCredit = (tx?.type || "").toLowerCase() === "credit";
  const tone = isCredit ? "credit" : "debit";
  return (
    <tr className="text-sm">
      <td className="px-4 py-3 text-white/70">{fmtDate(tx?.createdAt || tx?.date)}</td>
      <td className="px-4 py-3"><Badge tone={tone}>{isCredit ? "Credit" : (tx?.type || "Debit")}</Badge></td>
      <td className="px-4 py-3 font-medium">{currency(tx?.amount)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="truncate text-white/80">{shortId(tx?.order?._id || tx?.order)}</span>
          <CopyBtn text={tx?.order?._id || tx?.order} />
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge tone={statusTone(tx?.status)}>{tx?.status || "Completed"}</Badge>
      </td>
    </tr>
  );
}

function fmtDate(d) {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function shortId(id) {
  if (!id) return "—";
  const s = String(id);
  return s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function statusTone(status) {
  const s = (status || "").toLowerCase();
  if (["success", "completed", "paid", "captured"].includes(s)) return "credit";
  if (["pending", "processing"].includes(s)) return "pending";
  if (["failed", "cancelled", "rejected"].includes(s)) return "debit";
  return "neutral";
}
