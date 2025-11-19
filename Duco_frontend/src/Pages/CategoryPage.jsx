import React, { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import Prodcuts from "./Prodcuts";

const CategoryPage = () => {
  const { slug } = useParams();
  const [gender, setGender] = useState(null);

  useEffect(() => {
    // Map category slugs to gender
    const slugLower = slug?.toLowerCase() || "";
    
    if (slugLower.includes("men") && !slugLower.includes("women")) {
      setGender("Male");
    } else if (slugLower.includes("women") || slugLower.includes("ladies")) {
      setGender("Female");
    } else if (slugLower.includes("kid") || slugLower.includes("child")) {
      setGender("Kids");
    } else if (slugLower.includes("corporate") || slugLower.includes("bulk")) {
      setGender(null); // Corporate/Bulk shows all
    } else {
      setGender(null); // Default: show all products
    }
  }, [slug]);

  // If slug is empty, redirect to home
  if (!slug) {
    return <Navigate to="/" replace />;
  }

  return <Prodcuts gender={gender} />;
};

export default CategoryPage;
