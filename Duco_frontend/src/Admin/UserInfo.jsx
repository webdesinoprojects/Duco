
import React,{useEffect,useState} from 'react'
import axios from 'axios';
import UserCard from "../Admin/Components/UserCard"

const UserInfo = () => {
     
    const[user,setUser] = useState([]);
    const[loading,setLoading] = useState(true);
    const[error,setError] = useState(null);


 useEffect(() => {
    const getUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get("https://duco-67o5.onrender.com/user/get?limit=100"); // Get more users for admin view
        
        // Handle both old format (array) and new paginated format (object with users array)
        if (Array.isArray(res.data)) {
          setUser(res.data);
        } else if (res.data.users && Array.isArray(res.data.users)) {
          setUser(res.data.users);
        } else {
          setUser([]);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again.");
        setUser([]);
      } finally {
        setLoading(false);
      }
    };
    getUsers();
  }, []); // Remove user dependency to prevent infinite loop

 

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Users ({user.length})</h1>
          <p className="text-gray-600">Manage all registered users</p>
        </div>
        
        {user.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {user.map((e, i) => <UserCard key={e._id || i} user={e} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default UserInfo