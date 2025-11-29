import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1'; // Adjust port/prefix if needed

async function testActiveCenterFlow() {
  const PHONE_NUMBER = '998991112266';
  const PASSWORD = 'password123';

  try {
    // 1. Login as admin (assuming there is one)
    console.log('Logging in as admin...');
    // You might need to adjust credentials
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      phoneNumber: PHONE_NUMBER, // Replace with valid user
      password: PASSWORD,
    });

    const token = loginRes.data.data.accessToken;
    console.log('Login successful. Token obtained.');
    console.log('Active Center ID:', loginRes.data.data.user.activeCenterId);

    // 2. Get User Centers
    console.log('Fetching user centers...');
    const centersRes = await axios.get(`${API_URL}/auth/my-centers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('User Centers:', centersRes.data.data);

    // 3. Set Active Center (if centers exist)
    if (centersRes.data.data.length > 0) {
      const centerId = centersRes.data.data[0].id;
      console.log(`Setting active center to ${centerId}...`);
      const setActiveRes = await axios.post(
        `${API_URL}/auth/set-active-center`,
        {
          centerId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      console.log(
        'Active center set:',
        setActiveRes.data.data.user.activeCenterId,
      );
    }

    // 4. Get Users (should use active center)
    console.log('Fetching users...');
    const usersRes = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Fetched ${usersRes.data.data.length} users.`);
  } catch (error) {
    console.error(
      'Test failed:',
      error.response ? error.response.data : error.message,
    );
  }
}

testActiveCenterFlow();
