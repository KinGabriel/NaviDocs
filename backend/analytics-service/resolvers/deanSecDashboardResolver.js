import axios from 'axios';

export const deanSecDashboardResolver = {
  Query: {
    deanSecDashboard: async (_parent, _args, context) => {
      const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL;
      const TEMPLATE_SERVICE_URL = process.env.TEMPLATE_SERVICE_URL;
      const headers = {};
      if (context.token) headers['Cookie'] = `token=${context.token}`;

      // Prefer the requesting user's school (if available) so downstream services
      // can scope results. We also use this value defensively when producing
      // the "recently forwarded" list below.
      const userSchool = context.user?.school || context.user?.role?.school || null;

      if (!DOCUMENT_SERVICE_URL && !TEMPLATE_SERVICE_URL) {
        console.warn('No downstream service configured for deanSecDashboard');
        return { school: null, totalForwardedCount: 0, latestForwarded: [], forwardedByDepartment: [] };
      }

      try {
        // Use allSettled so we can return partial results if one downstream service fails
        const schoolQuery = userSchool ? `?school=${encodeURIComponent(userSchool)}` : '';
        const docPromise = DOCUMENT_SERVICE_URL ? axios.get(`${DOCUMENT_SERVICE_URL}/api/documents/dashboard-dean-sec${schoolQuery}`, { headers }) : Promise.resolve(null);
        const tplPromise = TEMPLATE_SERVICE_URL ? axios.get(`${TEMPLATE_SERVICE_URL}/api/templates/dashboard-dean-sec${schoolQuery}`, { headers }) : Promise.resolve(null);

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
          (tplPayload && Array.isArray(tplPayload.latest_forwarded) ? tplPayload.latest_forwarded : []);
        const mergedLatestRaw = [].concat(latestFromDoc, latestFromTpl);

        // Normalize merged items into a consistent shape for further processing
        const mergedNormalized = (mergedLatestRaw || []).map(bRaw => {
          const b = bRaw || {};
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
        });

        // Compute current-month submission overview by summing submissionsCount for items whose forwarded/created date is in the current month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const submissionOverviewCurrent = mergedNormalized.reduce((sum, item) => {
          const dateStr = item.forwarded_at || item.createdAt || null;
          if (!dateStr) return sum;
          const dt = new Date(dateStr);
          if (dt.getFullYear() === currentYear && dt.getMonth() === currentMonth) {
            return sum + (Number(item.submissionsCount || item.submittedCount || 0));
          }
          return sum;
        }, 0);

        // For the UI we want the most-recently forwarded bins. Defensively filter
        // the merged set by the requesting user's school (if provided) so we
        // don't surface other schools' bins here.
        const mergedForLatest = userSchool ? mergedNormalized.filter(item => {
          if (!item.school) return false;
          try {
            return String(item.school).toLowerCase() === String(userSchool).toLowerCase();
          } catch (e) {
            return false;
          }
        }) : mergedNormalized;

        // Sort normalized items and limit to 5 recent for UI
        const latestForwarded = mergedForLatest.sort((a, b) => {
          const da = a.forwarded_at ? new Date(a.forwarded_at).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const db = b.forwarded_at ? new Date(b.forwarded_at).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return db - da;
        }).slice(0, 5);

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
          // expose explicit submittedAt for frontend (fall back to various possible fields)
          submittedAt: t.submittedAt || t.submitted_at || t.createdAt || t.created_at || null,
          createdAt: t.createdAt || t.created_at || null,
          // passthrough additional fields to match canonical template shape
          document_code: t.document_code || t.code || '',
          revision_no: t.revision_no || t.rev || '',
          effectivity: t.effectivity || t.effectivity_date || null,
          thumbnailUrl: t.thumbnailUrl || t.thumbnail_url || null,
          pageSetup: t.pageSetup || t.page_setup || null,
          fields: t.fields || [],
          pages_json: t.pages_json || t.pagesJson || null,
          status_meta: t.status_meta || t.statusMeta || null,
          deadline: t.deadline || null,
          assigned: t.assigned || [],
          isArchived: typeof t.isArchived !== 'undefined' ? t.isArchived : (t.is_archived || false),
          notes: t.notes || [],
          headerConfig: t.headerConfig || t.header_config || null,
          school: t.school || null,
          created_by: t.created_by || t.createdBy || null
        }));

        const publishedRecentTemplates = (publishedRecentTemplatesRaw || []).map(t => ({
          id: t.id || t._id || null,
          title: t.title || t.name || '',
          code: t.code || t.document_code || '',
          rev: t.rev || t.revision_no || '',
          status: t.status || '',
          createdBy: t.createdBy || t.createdByName || null,
          submittedAt: t.submittedAt || t.submitted_at || t.createdAt || t.created_at || null,
          createdAt: t.createdAt || t.created_at || null,
          // passthrough additional fields
          document_code: t.document_code || t.code || '',
          revision_no: t.revision_no || t.rev || '',
          effectivity: t.effectivity || t.effectivity_date || null,
          thumbnailUrl: t.thumbnailUrl || t.thumbnail_url || null,
          pageSetup: t.pageSetup || t.page_setup || null,
          fields: t.fields || [],
          pages_json: t.pages_json || t.pagesJson || null,
          status_meta: t.status_meta || t.statusMeta || null,
          deadline: t.deadline || null,
          assigned: t.assigned || [],
          isArchived: typeof t.isArchived !== 'undefined' ? t.isArchived : (t.is_archived || false),
          notes: t.notes || [],
          headerConfig: t.headerConfig || t.header_config || null,
          school: t.school || null,
          created_by: t.created_by || t.createdBy || null
        }));

        return { school, totalForwardedCount, latestForwarded, forwardedByDepartment, templateSubmittedCount, recentSubmittedTemplates, publishedRecentTemplates, submissionOverviewCurrent };
      } catch (err) {
        console.error('Error fetching deanSecDashboard:', err && err.message ? err.message : err);
        throw new Error('Failed to fetch dean/secretary dashboard');
      }
    }
  }
};
