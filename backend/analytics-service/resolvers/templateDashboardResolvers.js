import axios from 'axios';

export const docControllerResolvers = {
  Query: {
    docControllerDashboard: async (_parent, _args, context) => {
			const TEMPLATE_SERVICE_URL = process.env.TEMPLATE_SERVICE_URL;
			const headers = {};
			if (context.token) {
				headers['Cookie'] = `token=${context.token}`;
			} else {
				console.warn('No token found in context.token/context.user!');
			}

			try {
				const res = await axios.get(`${TEMPLATE_SERVICE_URL}/api/templates/dashboard-info`, { headers });
				if (!res.data || !res.data.data) throw new Error('No data returned from template service');
				const data = res.data.data;

				// Map counts from service into schema fields
				const counts = data.counts || {};

				return {
				  udcPending: counts.udc_pending || 0,
				  ldcEndorsed: counts.ldc_endorsed || 0,
				  dcoReady: counts.dco_ready || 0,
				  udcApprovals: counts.udc_approvals || 0,
				  ldcApprovals: counts.ldc_approvals || 0,
				  dcoApprovals: counts.dco_approvals || 0,
				  approved: counts.approved || 0,
				  published: counts.published || 0,
				  total: counts.total || 0,
				  publishedTemplates: (data.recent && data.recent.published ? data.recent.published : []).map(t => ({
				    id: t._id || t.id,
				    title: t.title,
				    document_code: t.document_code,
				    createdAt: t.createdAt || t.status_meta?.published_at || null,
				    status: t.status || 'published',
				    revision_no: typeof t.revision_no === 'number' ? t.revision_no : parseInt(t.revision_no || '0', 10),
				    effectivity: t.effectivity || null,
				    created_by: t.created_by,
				    status_meta: t.status_meta || {},
				    createdByName: t.createdByName || null
				  }))
				};
			} catch (error) {
				console.error('Template dashboard fetch error:', error.message, error.response?.data);
				throw new Error('Failed to fetch template dashboard information');
			}
	  }
  },
  DocumentItem: {
    created_by_user: (parent) => {
      // Use createdByName directly from template-service to avoid extra user-service calls
      return {
        id: parent.created_by || null,
        displayName: parent.createdByName || null
      };
    }
  }
};


