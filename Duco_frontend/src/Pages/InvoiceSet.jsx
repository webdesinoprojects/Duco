import React from 'react'
import InvoiceDucoTailwind from "../Components/InvoiceDuco"
import {useParams} from "react-router-dom"
import {getInvoiceByOrder} from "../Service/APIservice"
import { useState  ,useEffect} from 'react'


const InvoiceSet = () => {

  const[DEMOINVOICE,setDEMOINVOICE] = useState({});

  const {id} = useParams();

  useEffect(() => {


       const getdata = async()=>{
    try {

       const data = await getInvoiceByOrder(id);
setDEMOINVOICE(data?.invoice)
      

         } catch (err) {
    console.error("Error fetching invoice:", err);
    throw err.response?.data || err;
  }

       
   }

   
      getdata();
      
  
    
  
  }, [id])
  

  return (
  <>
  <InvoiceDucoTailwind data={DEMOINVOICE} />

  </>
  )
}

export default InvoiceSet