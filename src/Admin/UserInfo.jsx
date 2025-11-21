import React, { useEffect, useState } from "react";
import axios from "axios";
import UserCard from "../Admin/Components/UserCard";

const UserInfo = () => {
  const [user, setUser] = useState();

  useEffect(() => {
    const getSubCategories = async () => {
      try {
        const res = await axios.get("http://localhost:3000/user/get");
        setUser(res.data || []);
      } catch (err) {
        console.error("Error fetching subcategories:", err);
      }
    };
    getSubCategories();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-7xl">
        {Array.isArray(user) ? (
          user?.map((e, i) => <UserCard key={i} user={e} />)
        ) : (
          <UserCard user={user} />
        )}
      </div>
    </div>
  );
};

export default UserInfo;
