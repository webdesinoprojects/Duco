import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

export const useDiscountTiers = () => {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadTiers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `${API_BASE_URL}/api/corporate-settings/discount-tiers`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch discount tiers");
        }

        const data = await response.json();
        if (isMounted) {
          setTiers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted && err.name !== "AbortError") {
          setError(err);
          setTiers([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTiers();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return { tiers, loading, error };
};
