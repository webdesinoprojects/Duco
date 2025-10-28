import React, { useEffect, useState } from 'react';

const CurrentLocation = () => {

    const continentMapping = {
  "IN": "Asia",
  "US": "North America",
  "GB": "Europe",
  "AU": "Australia",
  // Add more country codes and their continents as needed
};  


  const [location, setLocation] = useState({
    country: '',
    city: '',
    regionName: '',
    continent: '',
    error: null,
  });

  useEffect(() => {
    // Fetch location details from ip-api API
    fetch('http://ip-api.com/json')
      .then((response) => response.json())
      .then((data) => {
    const continent = continentMapping[data.countryCode] || 'Not available'; 
        setLocation({
          country: data.country,
          city: data.city,
          regionName: data.regionName,
          continent: continent,
          error: null,
        });
      })
      .catch((error) => {
        setLocation({
          ...location,
          error: error.message,
        });
      });
  }, []);

  return (
    <div>
      {location.error ? (
        <p>Error: {location.error}</p>
      ) : (
        <div className='text-white'>
          <p>Country: {location.country}</p>
          <p>City: {location.city}</p>
          <p>Region: {location.regionName}</p>
          <p>Continent: {location.continent}</p>
        </div>
      )}
    </div>
  );
};

export default CurrentLocation;
