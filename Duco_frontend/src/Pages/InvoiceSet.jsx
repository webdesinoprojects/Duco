import React from 'react'
import { InvoiceTemplate } from "../Components/InvoiceTemplate"
import {useParams} from "react-router-dom"
import {getInvoiceByOrder} from "../Service/APIservice"
import { useState, useEffect } from 'react'
import { normalizeInvoiceData } from "../Admin/utils/invoiceNormalizer"


const InvoiceSet = () => {

  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);

  const {id} = useParams();

  useEffect(() => {
    const getdata = async() => {
      try {
        setLoading(true);
        const response = await getInvoiceByOrder(id);
        
        // Normalize the invoice data to work with InvoiceTemplate
        const normalized = normalizeInvoiceData(response?.invoice, response?.totals);
        setInvoiceData(normalized);
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setInvoiceData(null);
      } finally {
        setLoading(false);
      }
    }

    getdata();
  }, [id])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-gray-100 py-4 overflow-y-auto">
        <div className="text-center my-auto">
          <h2 className="text-xl font-semibold">Loading your invoice…</h2>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-gray-100 py-4 overflow-y-auto">
        <div className="text-center my-auto">
          <h2 className="text-xl font-semibold">Invoice not found</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <InvoiceTemplate data={invoiceData} />
    </>
  )
}

export default InvoiceSet