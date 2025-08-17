
import axios from 'axios';

export const templateResolvers = {
	Query: {
		templateDashboard: async (_parent, _args, context) => {
			try {
				const response = await axios.post(
					process.env.TEMPLATE_SERVICE_URL + '/api/templates/dashboard-info',
					{},
					{
						headers: {
							Cookie: `token=${context.token}`
						},
					}
				);
				if (response.data && response.data.success) {
					return response.data.data;
				} else {
					throw new Error('Failed to fetch dashboard info');
				}
			} catch (error) {
				console.error('templateDashboard error:', error.message);
				throw new Error('Failed to retrieve dashboard information');
			}
		}
	}
};
