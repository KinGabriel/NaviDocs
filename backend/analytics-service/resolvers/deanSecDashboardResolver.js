import axios from 'axios';

export const deanSecDashboardResolver = {
  Query: {
    deanSecDashboard: async (_parent, _args, context) => {
      const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL;
      const TEMPLATE_SERVICE_URL = process.env.TEMPLATE_SERVICE_URL;
      const headers = {};
      if (context.token) headers['Cookie'] = `token=${context.token}`;

      if (!DOCUMENT_SERVICE_URL && !TEMPLATE_SERVICE_URL) {
        console.warn('No downstream service configured for deanSecDashboard');
        return { school: null, totalForwardedCount: 0, latestForwarded: [], forwardedByDepartment: [] };
      }

      try {
        // Use allSettled so we can return partial results if one downstream service fails
        const docPromise = DOCUMENT_SERVICE_URL ? axios.get(`${DOCUMENT_SERVICE_URL}/api/documents/dashboard-dean-sec`, { headers }) : Promise.resolve(null);
        const tplPromise = TEMPLATE_SERVICE_URL ? axios.get(`${TEMPLATE_SERVICE_URL}/api/templates/dashboard-dean-sec`, { headers }) : Promise.resolve(null);

        const settled = await Promise.allSettled([docPromise, tplPromise]);

        let docRes = null;
        let tplRes = null;
        const errors = [];
        if (settled[0].status === 'fulfilled') docRes = settled[0].value;
        else if (settled[0].status === 'rejected' && DOCUMENT_SERVICE_URL) errors.push({ service: 'document-service', reason: settled[0].reason });
        if (settled[1].status === 'fulfilled') tplRes = settled[1].value;
        else if (settled[1].status === 'rejected' && TEMPLATE_SERVICE_URL) errors.push({ service: 'template-service', reason: settled[1].reason });

        // If both services failed and were expected, throw to surface the problem
        if (errors.length === 2) {
          console.error('Both downstream services failed for deanSecDashboard:', errors.map(e => e.reason?.message || e.reason));
          throw new Error('Both document and template services failed');
        }

        const docPayload = docRes && docRes.data && docRes.data.data ? docRes.data.data : (docRes && docRes.data ? docRes.data : null);
        const tplPayload = tplRes && tplRes.data && tplRes.data.data ? tplRes.data.data : (tplRes && tplRes.data ? tplRes.data : null);

        const school = (docPayload && docPayload.school) || (tplPayload && tplPayload.school) || null;

        // Sum totalForwardedCount only when available from each payload (keeps backward compat)
        const docCount = docPayload ? (Number(docPayload.totalForwardedCount || docPayload.total_forwarded_count || 0)) : 0;
        const tplCount = tplPayload ? (Number(tplPayload.totalForwardedCount || tplPayload.total_forwarded_count || 0)) : 0;
        const totalForwardedCount = docCount + tplCount;

        // Merge latestForwarded arrays (if present) and sort by forwarded_at (newest first)
        // Accept a few possible shapes from downstream services (backwards compat):
        // - document-service returns `latestForwarded`
        // - older endpoints or different aggregations might return `bins` or `latest_forwarded`
        const latestFromDoc = (docPayload && Array.isArray(docPayload.latestForwarded)) ? docPayload.latestForwarded :
          (docPayload && Array.isArray(docPayload.bins) ? docPayload.bins : (docPayload && Array.isArray(docPayload.latest_forwarded) ? docPayload.latest_forwarded : []));
        const latestFromTpl = (tplPayload && Array.isArray(tplPayload.latestForwarded)) ? tplPayload.latestForwarded :
          (tplPayload && Array.isArray(tplPayload.recentSubmitted) ? tplPayload.recentSubmitted : []);
        const mergedLatestRaw = [].concat(latestFromDoc, latestFromTpl);

        const latestForwarded = (mergedLatestRaw || []).map(bRaw => {
          // normalize single bin object and ensure counts exist even if downstream returned raw submissions array
          const b = bRaw || {};
          // compute submissionsCount / submittedCount from raw submissions array if not provided
          let submissionsCount = 0;
          let submittedCount = 0;
          if (typeof b.submissionsCount === 'number') submissionsCount = Number(b.submissionsCount);
          else if (Array.isArray(b.submissions)) submissionsCount = b.submissions.length;
          else if (typeof b.submissions_count === 'number') submissionsCount = Number(b.submissions_count);

          if (typeof b.submittedCount === 'number') submittedCount = Number(b.submittedCount);
          else if (Array.isArray(b.submissions)) {
            submittedCount = b.submissions.filter(s => s && (s.submitted_at || ['submitted','approved'].includes(s.status))).length;
          } else if (typeof b.submitted_count === 'number') submittedCount = Number(b.submitted_count);

          return {
            id: b.id || b._id || null,
            title: b.title || null,
            department: b.department || null,
            school: b.school || null,
            forwarded_at: b.forwarded_at || b.forwardedAt || b.createdAt || null,
            created_by: b.created_by || null,
            deadline: b.deadline || null,
            submissionsCount,
            submittedCount,
            createdAt: b.createdAt || b.created_at || null
          };
        }).sort((a, b) => {
          const da = a.forwarded_at ? new Date(a.forwarded_at).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const db = b.forwarded_at ? new Date(b.forwarded_at).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return db - da;
        });

        // Merge forwardedByDepartment counts (aggregate by department)
        const byDeptFromDoc = (docPayload && Array.isArray(docPayload.forwardedByDepartment)) ? docPayload.forwardedByDepartment : [];
        const byDeptFromTpl = (tplPayload && Array.isArray(tplPayload.forwardedByDepartment)) ? tplPayload.forwardedByDepartment : [];
        const deptMap = new Map();
        [].concat(byDeptFromDoc, byDeptFromTpl).forEach(d => {
          const name = d && (d.department || d._id) ? String(d.department || d._id) : 'Unspecified';
          const count = Number(d && (d.count || d.total) ? (d.count || d.total) : 0);
          deptMap.set(name, (deptMap.get(name) || 0) + count);
        });
        const forwardedByDepartment = Array.from(deptMap.entries()).map(([department, count]) => ({ department, count }));

        // Map template-service fields if present
        const templateSubmittedCount = tplPayload && (typeof tplPayload.submittedCount !== 'undefined') ? Number(tplPayload.submittedCount) : null;
        const recentSubmittedTemplatesRaw = (tplPayload && Array.isArray(tplPayload.recentSubmitted)) ? tplPayload.recentSubmitted : [];
        const publishedRecentTemplatesRaw = (tplPayload && Array.isArray(tplPayload.publishedRecent)) ? tplPayload.publishedRecent : [];

        const recentSubmittedTemplates = (recentSubmittedTemplatesRaw || []).map(t => ({
          id: t.id || t._id || null,
          title: t.title || t.name || '',
          code: t.code || t.document_code || '',
          rev: t.rev || t.revision_no || '',
          status: t.status || '',
          createdBy: t.createdBy || t.createdByName || null,
          createdAt: t.createdAt || t.created_at || null
        }));

        const publishedRecentTemplates = (publishedRecentTemplatesRaw || []).map(t => ({
          id: t.id || t._id || null,
          title: t.title || t.name || '',
          code: t.code || t.document_code || '',
          rev: t.rev || t.revision_no || '',
          status: t.status || '',
          createdBy: t.createdBy || t.createdByName || null,
          createdAt: t.createdAt || t.created_at || null
        }));

        return { school, totalForwardedCount, latestForwarded, forwardedByDepartment, templateSubmittedCount, recentSubmittedTemplates, publishedRecentTemplates };
      } catch (err) {
        console.error('Error fetching deanSecDashboard:', err && err.message ? err.message : err);
        throw new Error('Failed to fetch dean/secretary dashboard');
      }
    }
  }
};
