import axios from 'axios';

export const userResolvers = {
  Query: {
    adminDashboard: async (_parent, _args, context) => {
      const USER_SERVICE_URL = process.env.USER_SERVICE_URL;

      console.log('GraphQL context.user:', context.user);
      const headers = {};
      if (context.token) {
        headers['Cookie'] = `token=${context.token}`;
      } else {
        console.warn('No token found in context.user!');
      }
      try {
        const res = await axios.get(`${USER_SERVICE_URL}/api/admin/dashboard-info`, { headers });
        if (res.status !== 200) {
          console.log('Error fetching dashboard info:', res.status, res.statusText);
        } else {
          console.log('Dashboard info fetched successfully:', res.data);
        }
        return res.data;
      } catch (error) {
        console.error('Axios error:', error.message, error.response?.data);
        throw new Error('Failed to fetch dashboard info');
      }
    }
  }
};
