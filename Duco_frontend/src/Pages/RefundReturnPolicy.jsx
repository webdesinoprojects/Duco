import React from "react";

const RefundCancellationPolicy = () => {
  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-black via-black to-blue-950 text-gray-200">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">
          Refund and Cancellation Policy
        </h1>

        <p className="mb-4">
          This Refund & Cancellation Policy explains how you can cancel an order
          or request a refund for purchases made on the Ducoart Platform. UK
          customers have certain statutory rights (see below). For any questions
          or to begin a cancellation/refund, contact us using the details at the
          bottom of this page.
        </p>

        <ul className="list-disc pl-6 space-y-4">
          <li>
            <strong className="text-blue-300">Cooling-off (UK distance sales):</strong>{" "}
            If you bought an item online (distance sale) you may notify Ducoart
            that you wish to cancel within <strong className="text-blue-300">14 days</strong> of
            receiving the goods. After notifying us you have a further{" "}
            <strong className="text-blue-300">14 days</strong> to return the goods to us.
          </li>

          <li>
            <strong className="text-blue-300">Refund timing (UK):</strong> When you
            cancel under the distance-selling rules, we will refund all monies
            paid (including standard outbound delivery cost where applicable)
            without undue delay and in any event within{" "}
            <strong className="text-blue-300">14 days</strong> from the day we receive
            the returned goods from you, or (if earlier) from the day we receive
            proof that you have sent the goods back to us.
          </li>

          <li>
            <strong className="text-blue-300">Faulty or not as described (UK):</strong>{" "}
            If goods are faulty, not as described or unfit for purpose, you may
            have a short-term statutory right to reject the goods and claim a
            full refund (usually within <strong className="text-blue-300">30 days</strong> of
            receipt). After that period you may be entitled to a repair or
            replacement under UK law.
          </li>

          <li>
            <strong className="text-blue-300">Perishable, customised or sealed items:</strong>{" "}
            Certain products (for example made-to-order, perishable goods,
            personalised items, or sealed hygiene products once unsealed) may
            not be eligible for cancellation once supplied. Where we cannot
            offer a statutory right to cancel, we will clearly state this on the
            product page.
          </li>

          <li>
            <strong className="text-blue-300">Damaged / defective on arrival:</strong>{" "}
            If you receive a damaged or defective item, please contact Ducoart
            customer service immediately. We will ask for reasonable evidence
            (photos, order number) and we will work with you to replace, repair
            or refund as appropriate after investigation.
          </li>

          <li>
            <strong className="text-blue-300">How refunds are issued:</strong> Approved
            refunds will be issued to the original payment method used for the
            purchase. Refunds will be processed without undue delay and in any
            event within <strong className="text-blue-300">14 days</strong> of us receiving
            the returned goods or receiving proof of postage, whichever is
            earlier.
          </li>

          <li>
            <strong className="text-blue-300">Return shipping costs:</strong> If you
            cancel under the UK distance-selling rules you may be responsible
            for the cost of return postage unless we have agreed to cover them
            or the goods are faulty.
          </li>

          <li>
            <strong className="text-blue-300">Non-UK customers:</strong> If you are
            outside the UK, local consumer laws may apply. Please contact us and
            we will explain your options and any time limits that apply to
            returns or cancellations.
          </li>
        </ul>

        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-2 text-white">
            Contact for Refunds & Complaints
          </h2>
          <p className="leading-relaxed">
            For all refund, cancellation and complaints please contact:
          </p>
          <p className="leading-relaxed mt-2">
            <strong className="text-blue-300">Ducoart</strong>
            <br />
            Address: LIG-64, Avanti Vihar, Shadija Compound, Raipur (C.G), India,
            492007
            <br />
            Mobile: +91 99932 40022
            <br />
            Office: +91 98272 45678
            <br />
            Email:{" "}
            <a
              href="mailto:ducoart1@gmail.com"
              className="text-blue-400 underline"
            >
              ducoart1@gmail.com
            </a>
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">
            Other Important Information
          </h2>
          <p className="mt-2">
            We may require proof of purchase (order number, receipt, photos) to
            process returns and refunds. Certain time limits and exceptions
            apply under UK law (for example, exemptions for sealed goods and
            custom orders). If you are unsure about your rights, you can seek
            independent advice from Citizens Advice or consult official UK
            guidance.
          </p>
        </section>
      </div>
    </div>
  );
};

export default RefundCancellationPolicy;
