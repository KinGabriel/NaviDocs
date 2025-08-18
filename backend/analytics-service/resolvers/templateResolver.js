import axios from 'axios';

export const templateResolvers = {
	Query: {
		templateDashboard: async (_parent, _args, context) => {
			const TEMPLATE_SERVICE_URL = process.env.TEMPLATE_SERVICE_URL;
			const headers = {};
			if (context.token) {
				headers['Cookie'] = `token=${context.token}`;
			} else {
				console.warn('No token found in context.user!');
			}
			try {
				const res = await axios.get(`${TEMPLATE_SERVICE_URL}/api/templates/dashboard-info`, { headers });
				if (!res.data) {
					throw new Error('No data returned from template service');
				}else{
					console.log('Template dashboard data:', res.data);
				}
				const data = res.data.data;
				return {
				  countPublished: data.countPublished,
				  countPendingApproval: data.countPendingApproval,
				  countApproved: data.countApproved,
				  getPublishedTemplates: (data.getPublishedTemplates || []).map(t => ({
				    id: t._id,
				    title: t.title,
				    document_code: t.document_code,
				    createdAt: t.createdAt,
				    status: t.status,
				    revision_no: t.revision_no,
				    effectivity: t.effectivity,
				    created_by: t.created_by,
				    status_meta: t.status_meta,
				  })),
				};
			} catch (error) {
				console.error('Axios error:', error.message, error.response?.data);
				throw new Error('Failed to fetch dashboard info');
			}
		}
	},
	Template: {
		created_by_user: async (parent, _args, context) => {
			const USER_SERVICE_URL = process.env.USER_SERVICE_URL;
			const headers = {};
			if (context.token) {
				headers['Cookie'] = `token=${context.token}`;
			}
			try {	
				const res = await axios.get(`${USER_SERVICE_URL}/api/user/getUserInfo/${parent.created_by}`, { headers });
				const user = res.data;
				
				return {
					id: user.id || user._id,
					firstname: user.firstname,
					lastname: user.lastname,
				};
			} catch (error) {
				console.error('Failed to fetch user info:', error.message, error.response?.data);
				return null;
			}
		}
	}
};


