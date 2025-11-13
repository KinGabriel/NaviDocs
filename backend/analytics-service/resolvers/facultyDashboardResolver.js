import axios from 'axios';

export const facultyDashboardResolver = {
  Query: {
    facultyDashboard: async (_parent, _args, context) => {
      const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL;
      const headers = {};
      if (context.token) headers['Cookie'] = `token=${context.token}`;

      if (!DOCUMENT_SERVICE_URL) {
        console.warn('DOCUMENT_SERVICE_URL not configured; facultyDashboard will return empty data');
        return { total: 0, totalAssigned: 0, submittedCount: 0, submissions: [], assignedBins: [] };
      }

      try {
        const res = await axios.get(`${DOCUMENT_SERVICE_URL}/api/documents/dashboard-faculty`, { headers });
        const payload = res && res.data && res.data.data ? res.data.data : (res && res.data ? res.data : null);

        if (!payload) return { total: 0, totalAssigned: 0, submittedCount: 0, submissions: [], assignedBins: [] };

        const mapDoc = (d) => ({ id: d.id || d._id || null, title: d.title || null, created_by: d.created_by || null, createdAt: d.createdAt || null });

        const submissions = Array.isArray(payload.submissions) ? payload.submissions.map(s => ({
          binId: s.binId || null,
          binTitle: s.binTitle || null,
          templateId: s.templateId || null,
          submissionId: s.submissionId || null,
          status: s.status || null,
          submittedAt: s.submittedAt || null,
          deadline: s.deadline || null,
          department: s.department || null,
          school: s.school || null,
          documents: Array.isArray(s.documents) ? s.documents.map(mapDoc) : []
        })) : [];

        const assignedBins = Array.isArray(payload.assignedBins) ? payload.assignedBins.map(b => ({
          id: b.id || b._id || null,
          title: b.title || null,
          department: b.department || null,
          school: b.school || null,
          deadline: b.deadline || null,
          submissionsCount: b.submissionsCount || 0,
          submittedCount: b.submittedCount || 0,
          onTimeCount: b.onTimeCount || 0,
          lateCount: b.lateCount || 0,
          pendingCount: b.pendingCount || 0,
          completion: b.completion || b.completionPercent || '—',
          userSubmission: b.userSubmission ? {
            binId: b.userSubmission.binId || null,
            binTitle: b.userSubmission.binTitle || null,
            templateId: b.userSubmission.templateId || null,
            submissionId: b.userSubmission._id || b.userSubmission.submissionId || null,
            status: b.userSubmission.status || null,
            submittedAt: b.userSubmission.submitted_at || b.userSubmission.submittedAt || null,
            deadline: b.deadline || null,
            department: b.department || null,
            school: b.school || null,
            documents: Array.isArray(b.userSubmission.documents) ? b.userSubmission.documents.map(mapDoc) : []
          } : null
        })) : [];

        const mapAssigned = (b) => ({
          id: b.id || b._id || null,
          title: b.title || null,
          department: b.department || null,
          school: b.school || null,
          deadline: b.deadline || null,
          submissionsCount: b.submissionsCount || 0,
          submittedCount: b.submittedCount || 0,
          onTimeCount: b.onTimeCount || 0,
          lateCount: b.lateCount || 0,
          pendingCount: b.pendingCount || 0,
          completion: b.completion || b.completionPercent || '—',
          userSubmission: b.userSubmission ? {
            binId: b.userSubmission.binId || null,
            binTitle: b.userSubmission.binTitle || null,
            templateId: b.userSubmission.templateId || null,
            submissionId: b.userSubmission._id || b.userSubmission.submissionId || null,
            status: b.userSubmission.status || null,
            submittedAt: b.userSubmission.submitted_at || b.userSubmission.submittedAt || null,
            deadline: b.deadline || null,
            department: b.department || null,
            school: b.school || null,
            documents: Array.isArray(b.userSubmission.documents) ? b.userSubmission.documents.map(mapDoc) : []
          } : null
        });

        const upcomingAssigned = Array.isArray(payload.upcomingAssigned) ? payload.upcomingAssigned.map(mapAssigned) : [];
        const dueTodayAssigned = Array.isArray(payload.dueTodayAssigned) ? payload.dueTodayAssigned.map(mapAssigned) : [];
        const overdueAssigned = Array.isArray(payload.overdueAssigned) ? payload.overdueAssigned.map(mapAssigned) : [];

        return {
          total: payload.total || 0,
          totalAssigned: payload.totalAssigned || payload.total_assigned || 0,
          submittedCount: payload.submittedCount || 0,
          onTimeCount: payload.onTimeCount || 0,
          lateCount: payload.lateCount || 0,
          pendingCount: payload.pendingCount || 0,
          submissions,
          assignedBins,
          upcomingAssigned,
          dueTodayAssigned,
          overdueAssigned
        };
      } catch (err) {
        console.error('Error fetching facultyDashboard:', err && err.message ? err.message : err);
        throw new Error('Failed to fetch faculty dashboard');
      }
    }
  }
};
