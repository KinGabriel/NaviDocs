import gql from 'graphql-tag';

export const deptHeadDashboardType = gql`
    type DeptHeadBin {
        id: ID
        title: String
        deadline: String
        is_completed: Boolean
        status: String
        department: String
        school: String
        created_by: ID
        is_forwarded: Boolean
        forwarded_at: String
        submissionsCount: Int
        submittedCount: Int
        onTimeCount: Int
        lateCount: Int
        pendingCount: Int
        documentsSubmittedCount: Int
        onTimeDocsCount: Int
        lateDocsCount: Int
        completion: String
        documentsCount: Int
        createdAt: String
    }
    type TemplateSummary {
        id: ID
        title: String
        status: String
        createdByName: String
        submittedAt: String
        created_at: String
        updated_at: String
        code: String
        rev: String
    }

    type DeptHeadDashboard {
        ownerCount: Int
        deptCount: Int
        totalReturned: Int
        bins: [DeptHeadBin]
        upcoming: [DeptHeadBin]
        dueToday: [DeptHeadBin]
        overdue: [DeptHeadBin]
        ownerTemplates: [TemplateSummary]
        publishedRecent: [TemplateSummary]
    }

    extend type Query {
        deptHeadDashboard: DeptHeadDashboard
    }
`;
