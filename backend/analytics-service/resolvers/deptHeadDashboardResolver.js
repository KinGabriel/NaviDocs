import axios from 'axios';

export const deptHeadDashboardResolver = {
  Query: {
    deptHeadDashboard: async (_parent, _args, context) => {
      const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL;
      const TEMPLATE_SERVICE_URL = process.env.TEMPLATE_SERVICE_URL;
      const headers = {};
      if (context.token) headers['Cookie'] = `token=${context.token}`;

      if (!DOCUMENT_SERVICE_URL) {
        console.warn('DOCUMENT_SERVICE_URL not configured; deptHeadDashboard will return empty data');
        return { ownerCount: 0, deptCount: 0, totalReturned: 0, bins: [] };
      }

      try {
        // Fetch both document-service and template-service in parallel (template-service is optional)
        const docPromise = DOCUMENT_SERVICE_URL ? axios.get(`${DOCUMENT_SERVICE_URL}/api/documents/dashboard-dept-head`, { headers }) : Promise.resolve(null);
        const tplPromise = TEMPLATE_SERVICE_URL ? axios.get(`${TEMPLATE_SERVICE_URL}/api/templates/dashboard-dept-head`, { headers }) : Promise.resolve(null);

        const [docRes, tplRes] = await Promise.all([docPromise, tplPromise]);

        // Services sometimes wrap their payload under a `data` property (e.g. { success:true, data: { ... } })
        // or return the payload directly. Normalize both cases.
        const payload = docRes && docRes.data && docRes.data.data ? docRes.data.data : (docRes && docRes.data ? docRes.data : null);
        const tplPayloadRaw = tplRes && tplRes.data ? tplRes.data : null;
        const tplPayload = tplPayloadRaw && tplPayloadRaw.data ? tplPayloadRaw.data : tplPayloadRaw;

        const bins = (payload && Array.isArray(payload.bins) ? payload.bins : []).map(b => ({
          id: b.id || b._id || null,
          title: b.title || null,
          department: b.department || null,
          school: b.school || null,
          created_by: b.created_by || null,
          is_forwarded: !!b.is_forwarded,
          forwarded_at: b.forwarded_at || null,
          submissionsCount: b.submissionsCount || 0,
          documentsCount: b.documentsCount || 0,
          // submission-level counts
          submittedCount: b.submittedCount || 0,
          onTimeCount: b.onTimeCount || 0,
          lateCount: b.lateCount || 0,
          // pendingCount is computed by document-service as submissions with status 'assigned' or 'returned'
          pendingCount: b.pendingCount || b.pending_count || 0,
          // document-level counts
          documentsSubmittedCount: b.documentsSubmittedCount || 0,
          onTimeDocsCount: b.onTimeDocsCount || 0,
          lateDocsCount: b.lateDocsCount || 0,
          // completion string (e.g. "83%")
          completion: b.completion || b.completionPercent || b.completionPercent || '—',
          createdAt: b.createdAt || null
        }));

        const mapBinSimple = (b) => ({
          id: b.id || b._id || null,
          title: b.title || null,
          department: b.department || null,
          school: b.school || null,
          created_by: b.created_by || null,
          is_forwarded: !!b.is_forwarded,
          forwarded_at: b.forwarded_at || null,
          submissionsCount: b.submissionsCount || 0,
          documentsCount: b.documentsCount || 0,
          submittedCount: b.submittedCount || 0,
          onTimeCount: b.onTimeCount || 0,
          lateCount: b.lateCount || 0,
          pendingCount: b.pendingCount || b.pending_count || 0,
          documentsSubmittedCount: b.documentsSubmittedCount || 0,
          onTimeDocsCount: b.onTimeDocsCount || 0,
          lateDocsCount: b.lateDocsCount || 0,
          completion: b.completion || b.completionPercent || '—',
          createdAt: b.createdAt || null,
          deadline: b.deadline || null,
          status: b.status || null,
          is_completed: b.is_completed || b.completed || false
        });

        const upcoming = (payload && Array.isArray(payload.upcoming) ? payload.upcoming.map(mapBinSimple) : []);
        const dueToday = (payload && Array.isArray(payload.dueToday) ? payload.dueToday.map(mapBinSimple) : []);
        const overdue = (payload && Array.isArray(payload.overdue) ? payload.overdue.map(mapBinSimple) : []);

        const mapTemplate = (t) => ({
          id: t._id || t.id || null,
          title: t.title || null,
          status: t.status || null,
          createdByName: t.createdByName || (t.created_by_user && t.created_by_user.displayName) || null,
          created_at: t.createdAt || t.created_at || null,
          updated_at: t.updatedAt || t.updated_at || null,
          code: t.document_code || t.code || null,
          rev: t.revision_no || t.rev || null
        });

        const ownerTemplates = tplPayload && Array.isArray(tplPayload.ownerTemplates) ? tplPayload.ownerTemplates.map(mapTemplate) : [];
        const publishedRecent = tplPayload && Array.isArray(tplPayload.publishedRecent) ? tplPayload.publishedRecent.map(mapTemplate) : [];

        return {
          ownerCount: payload && payload.ownerCount ? payload.ownerCount : 0,
          deptCount: payload && payload.deptCount ? payload.deptCount : 0,
          totalReturned: payload && payload.totalReturned ? payload.totalReturned : (payload && payload.total ? payload.total : 0),
          bins,
          upcoming,
          dueToday,
          overdue,
          ownerTemplates,
          publishedRecent
        };
      } catch (error) {
        console.error('Error fetching deptHeadDashboard from services:', error && error.message ? error.message : error);
        throw new Error('Failed to fetch department head dashboard data');
      }
    }
  }
};
