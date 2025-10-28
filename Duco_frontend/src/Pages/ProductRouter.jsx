import React, { useEffect, useState } from "react";
import { getproductssingle } from "../Service/APIservice";
import { useParams } from "react-router-dom";
import ProductPage from "./ProductPage";
import ProductPageBulk from "./ProductPageBulk";
import LoadingMain from "../Components/LoadingMain";

const BULK_SUBCATEGORY_ID = "68a722b176f642643c95e1ba";

export default function ProductRouter() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [isBulk, setIsBulk] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true; // prevent state updates if unmounted

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getproductssingle(id);

        // Handle possible shapes: subcategory as string, object with _id, or subcategoryId
        const subcatId =
          data?.subcategory?._id || data?.subcategory || data?.subcategoryId;

        if (!isMounted) return;

        setIsBulk(String(subcatId) === BULK_SUBCATEGORY_ID);
      } catch (e) {
        if (!isMounted) return;
        setError(e?.message || "Failed to load product");
        // Fallback: show normal product page on error (optional)
        setIsBulk(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) return <LoadingMain />;

  // Optional: show a lightweight error banner while still rendering the page
  if (error) {
    console.warn("ProductRouter error:", error);
    // You could also render a proper error component here if you prefer.
  }

  return isBulk ? <ProductPageBulk /> : <ProductPage />;
}
